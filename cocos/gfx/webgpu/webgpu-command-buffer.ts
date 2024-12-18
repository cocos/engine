/*
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { DescriptorSet } from '../base/descriptor-set';
import { Buffer } from '../base/buffer';
import { CommandBuffer } from '../base/command-buffer';
import {
    BufferUsageBit,
    CommandBufferType,
    StencilFace,
    BufferSource,
    DrawInfo,
    CommandBufferInfo,
    BufferTextureCopy,
    Color,
    Rect,
    Viewport,
    Filter,
    TextureBlit,
    ShaderStageFlagBit,
} from '../base/define';
import { Framebuffer } from '../base/framebuffer';
import { InputAssembler } from '../base/input-assembler';
import { PipelineState } from '../base/pipeline-state';
import { Texture } from '../base/texture';
import { WebGPUDescriptorSet } from './webgpu-descriptor-set';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUCommandAllocator } from './webgpu-command-allocator';
import {
    clearRect,
    WebGPUCmd,
    WebGPUCmdCopyBufferToTexture,
    WebGPUCmdPackage,
    WebGPUCmdUpdateBuffer,
} from './webgpu-commands';
import { WebGPUFramebuffer } from './webgpu-framebuffer';
import {
    IWebGPUGPUInputAssembler,
    IWebGPUGPUDescriptorSet,
    IWebGPUGPUPipelineState,
    IWebGPUGPUPipelineLayout,
} from './webgpu-gpu-objects';
import { WebGPUInputAssembler } from './webgpu-input-assembler';
import { WebGPUPipelineState } from './webgpu-pipeline-state';
import { WebGPUTexture } from './webgpu-texture';
import { RenderPass } from '../base/render-pass';
import { WebGPURenderPass } from './webgpu-render-pass';
import { INT_MAX } from '../../core/math/bits';
import { GeneralBarrier } from '../base/states/general-barrier';
import { TextureBarrier } from '../base/states/texture-barrier';
import { BufferBarrier } from '../base/states/buffer-barrier';
import { DescUpdateFrequency, WebGPUDeviceManager } from './define';
import { WebGPUSwapchain } from './webgpu-swapchain';
import { WebGPUPipelineLayout } from './webgpu-pipeline-layout';
import { WebGPUDescriptorSetLayout } from './webgpu-descriptor-set-layout';
import { error, errorID } from '../../core';

export interface IWebGPUDepthBias {
    constantFactor: number;
    clamp: number;
    slopeFactor: number;
}

export interface IWebGPUDepthBounds {
    minBounds: number;
    maxBounds: number;
}

export interface IWebGPUStencilWriteMask {
    face: StencilFace;
    writeMask: number;
}

export interface IWebGPUStencilCompareMask {
    face: StencilFace;
    reference: number;
    compareMask: number;
}

interface CommandEncoder { commandEncoder: GPUCommandEncoder, renderPassEncoder: GPURenderPassEncoder }
let currPipelineState: WebGPUPipelineState | null = null;
const descriptorSets: WebGPUDescriptorSet[] = [];
const renderAreas: Rect[] = [];
export class WebGPUCommandBuffer extends CommandBuffer {
    public pipelineBarrier (
        barrier: Readonly<GeneralBarrier> | null,
        bufferBarriers?: readonly BufferBarrier[] | undefined,
        buffers?: readonly Buffer[] | undefined,
        textureBarriers?: readonly TextureBarrier[] | undefined,
        textures?: readonly Texture[] | undefined,
    ): void {
        throw new Error('Method not implemented.');
    }
    public blitTexture (srcTexture: Readonly<Texture>, dstTexture: Texture, regions: readonly TextureBlit[], filter: Filter): void {
        throw new Error('Method not implemented.');
    }

    public cmdPackage: WebGPUCmdPackage = new WebGPUCmdPackage();
    protected _webGPUAllocator: WebGPUCommandAllocator | null = null;
    protected _isInRenderPass = false;
    protected _curGPUPipelineState: IWebGPUGPUPipelineState | null = null;
    protected _curWebGPUPipelineState: WebGPUPipelineState | null = null;
    protected _curGPUDescriptorSets: IWebGPUGPUDescriptorSet[] = [];
    protected _curGPUInputAssembler: IWebGPUGPUInputAssembler | null = null;
    protected _curDynamicOffsets: number[][] = [];
    protected _curViewport: Viewport | null = null;
    protected _curScissor: Rect | null = null;
    protected _curLineWidth: number | null = null;
    protected _curDepthBias: IWebGPUDepthBias | null = null;
    protected _curBlendConstants: number[] = [];
    protected _curDepthBounds: IWebGPUDepthBounds | null = null;
    protected _curStencilWriteMask: IWebGPUStencilWriteMask | null = null;
    protected _curStencilCompareMask: IWebGPUStencilCompareMask | null = null;
    protected _isStateValid = false;
    protected _globalDescriptors: WebGPUDescriptorSet[] = [];

    private _nativeCommandBuffer: GPUCommandBuffer | null = null;
    private _encoder: CommandEncoder | undefined = undefined;
    private _descSetDirtyIndex: number = INT_MAX;
    private _nativePassDesc: GPURenderPassDescriptor | null = null;
    private _wgpuRenderPass!: WebGPURenderPass;

    private _renderPassFuncQueue: ((renPassEncoder: GPURenderPassEncoder) => void)[] = [];

    public initialize (info: CommandBufferInfo): boolean {
        this._type = info.type;
        this._queue = info.queue;
        const device = WebGPUDeviceManager.instance;
        this._webGPUAllocator = device.cmdAllocator;
        this._encoder = {} as CommandEncoder;

        const setCount = device.bindingMappings.blockOffsets.length;
        for (let i = 0; i < setCount; i++) {
            this._curGPUDescriptorSets.push(null!);
            this._curDynamicOffsets.push([]);
        }

        return true;
    }

    public destroy (): void {
        if (this._webGPUAllocator) {
            this._webGPUAllocator.clearCmds(this.cmdPackage);
            this._webGPUAllocator = null;
        }
    }

    public begin (renderPass?: RenderPass, subpass?: number, frameBuffer?: Framebuffer): void {
        this._webGPUAllocator!.clearCmds(this.cmdPackage);
        renderAreas.length = 0;
        this._curGPUPipelineState = null;
        this._curGPUInputAssembler = null;
        this._curGPUDescriptorSets.length = 0;
        const dynamicOffsetSize = this._curDynamicOffsets.length;
        for (let i = 0; i < dynamicOffsetSize; i++) {
            this._curDynamicOffsets[i].length = 0;
        }
        this._curViewport = null;
        this._curScissor = null;
        this._curLineWidth = null;
        this._curDepthBias = null;
        this._curBlendConstants.length = 0;
        this._curDepthBounds = null;
        this._curStencilWriteMask = null;
        this._curStencilCompareMask = null;
        this._numDrawCalls = 0;
        this._numInstances = 0;
        this._numTris = 0;
    }

    public end (): void {
        this._isStateValid = false;
        this._isInRenderPass = false;
    }

    public beginRenderPass (
        renderPass: RenderPass,
        framebuffer: Framebuffer,
        renderArea: Rect,
        clearColors: Color[],
        clearDepth: number,
        clearStencil: number,
    ): void {
        const device = WebGPUDeviceManager.instance;
        const gpuDevice = device;
        this._wgpuRenderPass = renderPass as WebGPURenderPass;
        this._nativePassDesc = this._wgpuRenderPass.gpuRenderPass.nativeRenderPass!;
        const originalRP = this._wgpuRenderPass.gpuRenderPass.originalRP!;
        const gpuFramebuffer = (framebuffer as WebGPUFramebuffer).gpuFramebuffer;
        renderAreas.push(renderArea);
        let needPartialClear = false;
        const renderingFullScreen = gpuFramebuffer.gpuColorTextures.every((val) => {
            if (renderArea.x !== 0 || renderArea.y !== 0 || renderArea.width !== val.width || renderArea.height !== val.height) {
                return false;
            }
            return true;
        });
        const swapchain = gpuDevice.getSwapchains()[0] as WebGPUSwapchain;
        const clearColorSize = clearColors.length;
        for (let i = 0; i < clearColorSize; i++) {
            const colorTex = gpuFramebuffer.isOffscreen ? gpuFramebuffer.gpuColorTextures[i].getTextureView()
                : swapchain.colorGPUTextureView;
            colorTex!.label = gpuFramebuffer.isOffscreen ? 'offscreen' : 'swapchain';
            if (!renderingFullScreen) {
                needPartialClear = originalRP.colorAttachments[i].loadOp === 'clear';
                if (renderAreas.length > 1) {
                    this._nativePassDesc.colorAttachments[i].loadOp = 'load';
                }
            }
            this._nativePassDesc.colorAttachments[i].view = colorTex;
            this._nativePassDesc.colorAttachments[i].clearValue = [clearColors[i].x, clearColors[i].y, clearColors[i].z, clearColors[i].w];
        }

        if (this._wgpuRenderPass.depthStencilAttachment) {
            const tex = gpuFramebuffer.gpuDepthStencilTexture?.gpuTexture;
            const depthTex = tex ? tex.createView() : swapchain.gpuDepthStencilTextureView;
            const depthStencilAttachment = this._nativePassDesc.depthStencilAttachment!;
            depthStencilAttachment.view = depthTex;
            depthStencilAttachment.depthClearValue = clearDepth;
            depthStencilAttachment.stencilClearValue = clearStencil;
        }

        renderArea.x = Math.floor(renderArea.x);
        renderArea.y = Math.floor(renderArea.y);
        renderArea.width = Math.floor(renderArea.width);
        renderArea.height = Math.floor(renderArea.height);
        const vpfunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setViewport(renderArea.x, renderArea.y, renderArea.width, renderArea.height, 0.0, 1.0);
        };
        const srfunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setScissorRect(renderArea.x, renderArea.y, renderArea.width, renderArea.height);
        };

        this._renderPassFuncQueue.push(vpfunc);
        this._renderPassFuncQueue.push(srfunc);

        if (!renderingFullScreen && needPartialClear) {
            let idx = 0;
            gpuFramebuffer.gpuColorTextures.forEach((tex) => {
                clearRect(device, tex, renderArea, clearColors[idx]);
                idx++;
            });
        }

        this._isInRenderPass = true;
    }

    public endRenderPass (): void {
        const device = WebGPUDeviceManager.instance;
        const nativeDevice = (device).nativeDevice!;
        const cmdEncoder = nativeDevice.createCommandEncoder();
        const passEncoder = cmdEncoder.beginRenderPass(this._nativePassDesc!);
        this._renderPassFuncQueue.forEach((cb) => {
            cb(passEncoder);
        });

        passEncoder.end();
        nativeDevice?.queue.submit([cmdEncoder.finish()]);
        let idx = 0;
        for (const attachment of this._nativePassDesc!.colorAttachments) {
            attachment!.loadOp = this._wgpuRenderPass.gpuRenderPass.originalRP!.colorAttachments[idx].loadOp;
            idx++;
        }
        this._isInRenderPass = false;
        this._isStateValid = false;
        this._renderPassFuncQueue.length = 0;
    }

    public bindPipelineState (pipelineState: PipelineState): void {
        const webgpuPipelineState = (pipelineState as WebGPUPipelineState);
        const gpuPipelineState = webgpuPipelineState.gpuPipelineState;
        if (gpuPipelineState !== this._curGPUPipelineState) {
            this._curWebGPUPipelineState = webgpuPipelineState;
            this._curGPUPipelineState = gpuPipelineState;
            currPipelineState = webgpuPipelineState;
            this._isStateValid = true;
        }
    }

    public bindDescriptorSet (set: number, descriptorSet: DescriptorSet, dynamicOffsets?: number[]): void {
        const gpuDescriptorSets = (descriptorSet as unknown as WebGPUDescriptorSet).gpuDescriptorSet;
        if (gpuDescriptorSets !== this._curGPUDescriptorSets[set]) {
            this._curGPUDescriptorSets[set] = gpuDescriptorSets;
            descriptorSets[set] = descriptorSet as WebGPUDescriptorSet;
            this._isStateValid = true;
        }
        if (dynamicOffsets) {
            const offsets = this._curDynamicOffsets[set];
            const dynamicOffsetSize = dynamicOffsets.length;
            for (let i = 0; i < dynamicOffsetSize; i++) offsets[i] = dynamicOffsets[i];
            offsets.length = dynamicOffsetSize;
            this._isStateValid = true;
        }
    }

    public bindInputAssembler (inputAssembler: InputAssembler): void {
        const gpuInputAssembler = (inputAssembler as unknown as WebGPUInputAssembler).gpuInputAssembler;
        this._curGPUInputAssembler = gpuInputAssembler;
        this._isStateValid = true;
    }

    public setViewport (viewport: Viewport): void {
        viewport.left = Math.floor(viewport.left);
        viewport.top = Math.floor(viewport.top);
        viewport.width = Math.floor(viewport.width);
        viewport.height = Math.floor(viewport.height);
        viewport.minDepth = Math.floor(viewport.minDepth);
        viewport.maxDepth = Math.floor(viewport.maxDepth);
        this._curViewport = new Viewport(viewport.left, viewport.top, viewport.width, viewport.height, viewport.minDepth, viewport.maxDepth);
        const vpfunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setViewport(
                viewport.left,
                viewport.top,
                viewport.width,
                viewport.height,
                viewport.minDepth,
                viewport.maxDepth,
            );
        };
        this._renderPassFuncQueue.push(vpfunc);
        this._isStateValid = true;
    }

    public setScissor (scissor: Rect): void {
        scissor.x = Math.floor(scissor.x);
        scissor.y = Math.floor(scissor.y);
        scissor.width = Math.floor(scissor.width);
        scissor.height = Math.floor(scissor.height);
        const srfunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height);
        };
        this._renderPassFuncQueue.push(srfunc);
        this._isStateValid = true;
    }

    public setLineWidth (lineWidth: number): void {
        error('line width not supproted by webGPU');
    }

    public setDepthBias (depthBiasConstantFactor: number, depthBiasClamp: number, depthBiasSlopeFactor: number): void {
        if (!this._curDepthBias) {
            this._curDepthBias = {
                constantFactor: depthBiasConstantFactor,
                clamp: depthBiasClamp,
                slopeFactor: depthBiasSlopeFactor,
            };
            this._isStateValid = true;
        } else if (this._curDepthBias.constantFactor !== depthBiasConstantFactor
            || this._curDepthBias.clamp !== depthBiasClamp
            || this._curDepthBias.slopeFactor !== depthBiasSlopeFactor) {
            this._curDepthBias.constantFactor = depthBiasConstantFactor;
            this._curDepthBias.clamp = depthBiasClamp;
            this._curDepthBias.slopeFactor = depthBiasSlopeFactor;
            this._isStateValid = true;
        }
    }

    public setBlendConstants (blendConstants: Color): void {
        if (
            this._curBlendConstants[0] !== blendConstants.x
            || this._curBlendConstants[1] !== blendConstants.y
            || this._curBlendConstants[2] !== blendConstants.z
            || this._curBlendConstants[3] !== blendConstants.w) {
            this._curBlendConstants.length = 0;
            Array.prototype.push.apply(this._curBlendConstants, [blendConstants.x, blendConstants.y, blendConstants.z, blendConstants.w]);
            this._isStateValid = true;
        }
    }

    public setDepthBound (minDepthBounds: number, maxDepthBounds: number): void {
        if (!this._curDepthBounds) {
            this._curDepthBounds = {
                minBounds: minDepthBounds,
                maxBounds: maxDepthBounds,
            };
            this._isStateValid = true;
        } else if (this._curDepthBounds.minBounds !== minDepthBounds
            || this._curDepthBounds.maxBounds !== maxDepthBounds) {
            this._curDepthBounds = {
                minBounds: minDepthBounds,
                maxBounds: maxDepthBounds,
            };
            this._isStateValid = true;
        }
    }

    public setStencilWriteMask (face: StencilFace, writeMask: number): void {
        if (!this._curStencilWriteMask) {
            this._curStencilWriteMask = {
                face,
                writeMask,
            };
            this._isStateValid = true;
        } else if (this._curStencilWriteMask.face !== face
            || this._curStencilWriteMask.writeMask !== writeMask) {
            this._curStencilWriteMask.face = face;
            this._curStencilWriteMask.writeMask = writeMask;
            this._isStateValid = true;
        }
    }

    public setStencilCompareMask (face: StencilFace, reference: number, compareMask: number): void {
        if (!this._curStencilCompareMask) {
            this._curStencilCompareMask = {
                face,
                reference,
                compareMask,
            };
            this._isStateValid = true;
        } else if (this._curStencilCompareMask.face !== face
            || this._curStencilCompareMask.reference !== reference
            || this._curStencilCompareMask.compareMask !== compareMask) {
            this._curStencilCompareMask.face = face;
            this._curStencilCompareMask.reference = reference;
            this._curStencilCompareMask.compareMask = compareMask;
            this._isStateValid = true;
        }
    }

    public draw (inputAssembler: InputAssembler): void {
        const device = WebGPUDeviceManager.instance;
        if (this._type === CommandBufferType.PRIMARY && !this._isInRenderPass) {
            errorID(16328);
            return;
        }
        if (this._isStateValid) {
            this.bindStates();
        }

        const ia = inputAssembler as unknown as WebGPUInputAssembler;
        const iaData = ia.gpuInputAssembler;

        const nativeDevice = device;

        if (ia.indirectBuffer) {
            const indirectBuffer = iaData.gpuIndirectBuffer!;
            if (nativeDevice.multiDrawIndirectSupport) {
                // not support yet
            } else {
                const drawInfoCount = iaData.gpuIndirectBuffer?.indirects.length as number;
                if (indirectBuffer.drawIndirectByIndex) {
                    const drawFunc = (passEncoder: GPURenderPassEncoder): void => {
                        const drawInfoSize = Object.keys(DrawInfo).length;
                        for (let i = 0; i < drawInfoCount; i++) {
                            passEncoder?.drawIndexedIndirect(indirectBuffer.gpuBuffer!, indirectBuffer.gpuOffset + i * drawInfoSize);
                        }
                    };
                    this._renderPassFuncQueue.push(drawFunc);
                } else {
                    // FIXME: draw IndexedIndirect and Indirect by different buffer
                    const drawFunc = (passEncoder: GPURenderPassEncoder): void => {
                        const drawInfoSize = Object.keys(DrawInfo).length;
                        for (let i = 0; i < drawInfoCount; i++) {
                            passEncoder?.drawIndirect(indirectBuffer.gpuBuffer!, indirectBuffer.gpuOffset + i * drawInfoSize);
                        }
                    };
                    this._renderPassFuncQueue.push(drawFunc);
                }
            }
        } else {
            const instanceCount = inputAssembler.instanceCount > 0 ? inputAssembler.instanceCount : 1;
            const drawByIndex = inputAssembler.indexBuffer && (ia.indexCount > 0);

            if (drawByIndex) {
                const drawFunc = (passEncoder: GPURenderPassEncoder): void => {
                    const instanceCount = Math.max(ia.instanceCount, 1);
                    passEncoder?.drawIndexed(ia.indexCount, instanceCount, ia.firstIndex, ia.firstVertex, ia.firstInstance);
                };
                this._renderPassFuncQueue.push(drawFunc);
            } else {
                const drawFunc = (passEncoder: GPURenderPassEncoder): void => {
                    const instanceCount = Math.max(ia.instanceCount, 1);
                    passEncoder?.draw(ia.vertexCount, instanceCount, ia.firstVertex, ia.firstInstance);
                };
                this._renderPassFuncQueue.push(drawFunc);
            }
        }

        ++this._numDrawCalls;
        this._numInstances += inputAssembler.instanceCount;
        const indexCount = inputAssembler.indexCount || inputAssembler.vertexCount;
        if (this._curGPUPipelineState) {
            const gpuPrimitive = this._curGPUPipelineState.gpuPrimitive;
            switch (gpuPrimitive) {
            case 'triangle-strip':
                this._numTris += (indexCount - 2) * Math.max(inputAssembler.instanceCount, 1);
                break;
            case 'triangle-list': {
                this._numTris += indexCount / 3 * Math.max(inputAssembler.instanceCount, 1);
                break;
            }
            default:
                break;
            }
        }
    }

    public updateBuffer (buffer: Buffer, data: BufferSource, offset?: number, size?: number): void {
        if (this._type === CommandBufferType.PRIMARY && this._isInRenderPass) {
            errorID(16329);
            return;
        }
        const gpuBuffer = (buffer as unknown as WebGPUBuffer).gpuBuffer;
        if (!gpuBuffer) {
            return;
        }
        const cmd = this._webGPUAllocator!.updateBufferCmdPool.alloc(WebGPUCmdUpdateBuffer);
        let buffSize = 0;
        let buff: BufferSource | null = null;

        // TODO: Have to copy to staging buffer first to make this work for the execution is deferred.
        // But since we are using specialized primary command buffers in WebGL backends, we leave it as is for now
        if (buffer.usage & BufferUsageBit.INDIRECT) {
            buff = data;
        } else {
            if (size !== undefined) {
                buffSize = size;
            } else {
                buffSize = (data as ArrayBuffer).byteLength;
            }
            buff = data;
        }
        const device = WebGPUDeviceManager.instance;
        const nativeDevice = (device).nativeDevice;
        nativeDevice?.queue.writeBuffer(gpuBuffer.gpuBuffer!, gpuBuffer.gpuOffset, buff as ArrayBuffer);
    }

    public copyBuffersToTexture (buffers: ArrayBufferView[], texture: Texture, regions: BufferTextureCopy[]): void {
        if (this._type === CommandBufferType.PRIMARY && this._isInRenderPass) {
            errorID(16330);
            return;
        }
        const gpuTexture = (texture as WebGPUTexture).gpuTexture;
        if (!gpuTexture) {
            return;
        }
        const cmd = this._webGPUAllocator!.copyBufferToTextureCmdPool.alloc(WebGPUCmdCopyBufferToTexture);
        cmd.gpuTexture = gpuTexture;
        cmd.regions = regions;
        cmd.buffers = buffers;

        this.cmdPackage.copyBufferToTextureCmds.push(cmd);
        this.cmdPackage.cmds.push(WebGPUCmd.COPY_BUFFER_TO_TEXTURE);
    }

    public execute (cmdBuffs: CommandBuffer[], count: number): void {
        for (let i = 0; i < count; ++i) {
            const WebGPUCmdBuff = cmdBuffs[i] as WebGPUCommandBuffer;
            const cmdPackage = WebGPUCmdBuff.cmdPackage;
            const rpLength = cmdPackage.beginRenderPassCmds.length;
            for (let c = 0; c < rpLength; ++c) {
                const cmd = cmdPackage.beginRenderPassCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.beginRenderPassCmds.push(cmd);
            }
            const bindStatesCmds = cmdPackage.bindStatesCmds;
            const stateCmdCount = bindStatesCmds.length;
            for (let c = 0; c < stateCmdCount; ++c) {
                const cmd = bindStatesCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.bindStatesCmds.push(cmd);
            }
            const drawCmds = cmdPackage.drawCmds;
            const drawCmdCount = drawCmds.length;
            for (let c = 0; c < drawCmdCount; ++c) {
                const cmd = drawCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.drawCmds.push(cmd);
            }
            const updateBufferCmdCount = cmdPackage.updateBufferCmds.length;
            for (let c = 0; c < updateBufferCmdCount; ++c) {
                const cmd = cmdPackage.updateBufferCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.updateBufferCmds.push(cmd);
            }
            const copyBufferTexCmdCount = cmdPackage.copyBufferToTextureCmds.length;
            for (let c = 0; c < copyBufferTexCmdCount; ++c) {
                const cmd = cmdPackage.copyBufferToTextureCmds.array[c];
                ++cmd.refCount;
                this.cmdPackage.copyBufferToTextureCmds.push(cmd);
            }

            this.cmdPackage.cmds.concat(cmdPackage.cmds.array);

            this._numDrawCalls += WebGPUCmdBuff._numDrawCalls;
            this._numInstances += WebGPUCmdBuff._numInstances;
            this._numTris += WebGPUCmdBuff._numTris;
        }
    }

    protected bindStates (): void {
        if (!this._curGPUPipelineState) {
            return;
        }
        const gpuShader = this._curGPUPipelineState.gpuShader!;
        const bindingMaps = gpuShader.bindings;
        let vertBinds: number[][] = []; let fragBinds: number[][] = []; let vertAttrs;
        for (const stage of gpuShader.gpuStages) {
            if (stage.type === ShaderStageFlagBit.VERTEX) {
                vertBinds = stage.bindings;
                vertAttrs = stage.attrs;
            } else if (stage.type === ShaderStageFlagBit.FRAGMENT) {
                fragBinds = stage.bindings;
            }
        }
        const gpuPipelineLayout = this._curGPUPipelineState.gpuPipelineLayout as IWebGPUGPUPipelineLayout;
        const wgpuPipLayout = (currPipelineState?.pipelineLayout as WebGPUPipelineLayout);
        let needFetchPipLayout = false;
        const descSize = descriptorSets.length;
        for (let i = 0; i < descSize; i++) {
            descriptorSets[i].prepare(
                i ? DescUpdateFrequency.NORMAL : DescUpdateFrequency.LOW,
                bindingMaps.get(i)!,
                vertBinds[i] || [],
                fragBinds[i] || [],
            );
            const layout = descriptorSets[i].layout as WebGPUDescriptorSetLayout;
            const currGrpLayout = layout.gpuDescriptorSetLayout!.bindGroupLayout;
            const notEqualLayout = gpuPipelineLayout.gpuBindGroupLayouts[i] !== currGrpLayout;
            if (layout.hasChanged || notEqualLayout) {
                if (notEqualLayout) {
                    wgpuPipLayout.changeSetLayout(i, layout);
                }
                layout.resetChanged();
                needFetchPipLayout = true;
            }
        }

        if (needFetchPipLayout || !wgpuPipLayout.gpuPipelineLayout!.nativePipelineLayout
            || this._curGPUPipelineState.pipelineState!.layout !== gpuPipelineLayout.nativePipelineLayout) {
            wgpuPipLayout.fetchPipelineLayout(false);
            this._curWebGPUPipelineState?.updatePipelineLayout();
            needFetchPipLayout = true;
        }
        this._curWebGPUPipelineState!.prepare(this._curGPUInputAssembler!, needFetchPipLayout);
        const { dynamicOffsetIndices } = gpuPipelineLayout;
        // ----------------------------wgpu pipline state-----------------------------
        const wgpuPipeline = this._curGPUPipelineState.nativePipeline as GPURenderPipeline;
        const pplFunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setPipeline(wgpuPipeline);
        };
        this._renderPassFuncQueue.push(pplFunc);
        if (this._curGPUPipelineState.pipelineState?.depthStencil) {
            const stencilRef = this._curGPUPipelineState.stencilRef;
            const stencilRefFunc = (passEncoder: GPURenderPassEncoder): void => {
                passEncoder.setStencilReference(stencilRef);
            };
            this._renderPassFuncQueue.push(stencilRefFunc);
        }
        const currGPUDescSize = this._curGPUDescriptorSets.length;
        const wgpuBindGroups = new Array<GPUBindGroup>(currGPUDescSize);
        const wgpuDynOffsets = new Array<number[]>(currGPUDescSize);
        for (let i = 0; i < currGPUDescSize; i++) {
            const curGpuDesc = this._curGPUDescriptorSets[i];
            wgpuBindGroups[i] = curGpuDesc.bindGroup;
            wgpuDynOffsets[i] = [...this._curDynamicOffsets[i]];
            if (!descriptorSets[i].dynamicOffsetCount) {
                wgpuDynOffsets[i] = [];
            } else if (descriptorSets[i]  && descriptorSets[i].dynamicOffsetCount !== wgpuDynOffsets[i].length) {
                wgpuDynOffsets[i].length = descriptorSets[i].dynamicOffsetCount;
                for (let j = 0; j < descriptorSets[i].dynamicOffsetCount; j++) {
                    if (!wgpuDynOffsets[i][j]) {
                        wgpuDynOffsets[i][j] = 0;
                    }
                }
            }
        }

        const bgfunc = (passEncoder: GPURenderPassEncoder): void => {
            const gpuBindGroupSize = wgpuBindGroups.length;
            for (let i = 0; i < gpuBindGroupSize; i++) {
                // FIXME: this is a special sentence that 2 in 3 parameters I'm not certain.
                passEncoder.setBindGroup(i, wgpuBindGroups[i], wgpuDynOffsets[i]);
            }
        };
        this._renderPassFuncQueue.push(bgfunc);

        // ---------------------------- wgpu input assembly  -----------------------------
        const ia = this._curGPUInputAssembler!;
        const wgpuVertexBuffers = new Array<{ slot: number, buffer: GPUBuffer, offset: number }>(ia.gpuVertexBuffers.length);
        const gpuVertBuffSize = ia.gpuVertexBuffers.length;
        for (let i = 0; i < gpuVertBuffSize; i++) {
            wgpuVertexBuffers[i] = { slot: i, buffer: ia.gpuVertexBuffers[i].gpuBuffer!, offset: ia.gpuVertexBuffers[i].gpuOffset };
        }
        const vbFunc = (passEncoder: GPURenderPassEncoder): void => {
            const vertBuffSize = wgpuVertexBuffers.length;
            for (let i = 0; i < vertBuffSize; i++) {
                passEncoder.setVertexBuffer(wgpuVertexBuffers[i].slot, wgpuVertexBuffers[i].buffer, wgpuVertexBuffers[i].offset);
            }
        };
        this._renderPassFuncQueue.push(vbFunc);
        if (ia.gpuIndexBuffer) {
            const wgpuIndexBuffer: { indexType: GPUIndexFormat, buffer: GPUBuffer, offset: number, size: number } = {
                indexType: ia.gpuIndexType,
                buffer: ia.gpuIndexBuffer.gpuBuffer as GPUBuffer,
                offset: ia.gpuIndexBuffer.gpuOffset,
                size: ia.gpuIndexBuffer.size,
            };
            const ibFunc = (passEncoder: GPURenderPassEncoder): void => {
                passEncoder.setIndexBuffer(
                    wgpuIndexBuffer.buffer,
                    wgpuIndexBuffer.indexType,
                    wgpuIndexBuffer.offset,
                    wgpuIndexBuffer.size,
                );
            };
            this._renderPassFuncQueue.push(ibFunc);
        }
        const bcFunc = (passEncoder: GPURenderPassEncoder): void => {
            passEncoder.setBlendConstant([this._curBlendConstants[0],
                this._curBlendConstants[1],
                this._curBlendConstants[2],
                this._curBlendConstants[3]]);
        };

        if (this._curBlendConstants.length) this._renderPassFuncQueue.push(bcFunc);

        this._isStateValid = false;
    }
}
