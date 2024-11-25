/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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
    StencilFace,
    BufferSource, CommandBufferInfo,
    BufferTextureCopy, Color, Rect, Viewport, DrawInfo, DynamicStates, TextureBlit, Filter,
} from '../base/define';
import { Framebuffer } from '../base/framebuffer';
import { InputAssembler } from '../base/input-assembler';
import { PipelineState } from '../base/pipeline-state';
import { Texture } from '../base/texture';
import { WebGL2DescriptorSet } from './webgl2-descriptor-set';

import { IWebGL2GPUInputAssembler, IWebGL2GPUDescriptorSet, IWebGL2GPUPipelineState } from './webgl2-gpu-objects';
import { WebGL2InputAssembler } from './webgl2-input-assembler';
import { WebGL2PipelineState } from './webgl2-pipeline-state';
import { RenderPass } from '../base/render-pass';
import { GeneralBarrier } from '../base/states/general-barrier';
import { TextureBarrier } from '../base/states/texture-barrier';
import { BufferBarrier } from '../base/states/buffer-barrier';
import { WebGL2DeviceManager } from './webgl2-define';
import { errorID } from '../../core/platform/debug';

export class WebGL2CommandBuffer extends CommandBuffer {
    protected _isInRenderPass = false;
    protected _curGPUPipelineState: IWebGL2GPUPipelineState | null = null;
    protected _curGPUDescriptorSets: IWebGL2GPUDescriptorSet[] = [];
    protected _curGPUInputAssembler: IWebGL2GPUInputAssembler | null = null;
    protected _curDynamicOffsets: number[] = Array(8).fill(0);
    protected _curDynamicStates: DynamicStates = new DynamicStates();
    protected _isStateInvalid = false;

    constructor () {
        super();
    }

    public initialize (info: Readonly<CommandBufferInfo>): void {
        this._type = info.type;
        this._queue = info.queue;

        const setCount = WebGL2DeviceManager.instance.bindingMappings.blockOffsets.length;
        for (let i = 0; i < setCount; i++) {
            this._curGPUDescriptorSets.push(null!);
        }
    }

    public destroy (): void {

    }

    public begin (renderPass?: RenderPass, subpass?: number, frameBuffer?: Framebuffer): void {
        this._curGPUPipelineState = null;
        this._curGPUInputAssembler = null;
        this._curGPUDescriptorSets.length = 0;
        this._numDrawCalls = 0;
        this._numInstances = 0;
        this._numTris = 0;
    }

    public end (): void {
        if (this._isStateInvalid) {
            this.bindStates();
        }

        this._isInRenderPass = false;
    }

    public beginRenderPass (
        renderPass: RenderPass,
        framebuffer: Framebuffer,
        renderArea: Readonly<Rect>,
        clearColors: Readonly<Color[]>,
        clearDepth: number,
        clearStencil: number,
    ): void {
        errorID(16401);
        this._isInRenderPass = true;
    }

    public endRenderPass (): void {
        this._isInRenderPass = false;
    }

    public bindPipelineState (pipelineState: PipelineState): void {
        const gpuPipelineState = (pipelineState as WebGL2PipelineState).gpuPipelineState;
        if (gpuPipelineState !== this._curGPUPipelineState) {
            this._curGPUPipelineState = gpuPipelineState;
            this._isStateInvalid = true;
        }
    }

    public bindDescriptorSet (set: number, descriptorSet: DescriptorSet, dynamicOffsets?: Readonly<number[]>): void {
        const gpuDescriptorSets = (descriptorSet as WebGL2DescriptorSet).gpuDescriptorSet;
        if (gpuDescriptorSets !== this._curGPUDescriptorSets[set]) {
            this._curGPUDescriptorSets[set] = gpuDescriptorSets;
            this._isStateInvalid = true;
        }
        if (dynamicOffsets) {
            const gpuPipelineLayout = this._curGPUPipelineState?.gpuPipelineLayout;
            if (gpuPipelineLayout) {
                const offsets = this._curDynamicOffsets;
                const idx = gpuPipelineLayout.dynamicOffsetOffsets[set];
                for (let i = 0; i < dynamicOffsets.length; i++) offsets[idx + i] = dynamicOffsets[i];
                this._isStateInvalid = true;
            }
        }
    }

    public bindInputAssembler (inputAssembler: InputAssembler): void {
        const gpuInputAssembler = (inputAssembler as WebGL2InputAssembler).gpuInputAssembler;
        this._curGPUInputAssembler = gpuInputAssembler;
        this._isStateInvalid = true;
    }

    public setViewport (viewport: Readonly<Viewport>): void {
        const cache = this._curDynamicStates.viewport;
        if (cache.left !== viewport.left
            || cache.top !== viewport.top
            || cache.width !== viewport.width
            || cache.height !== viewport.height
            || cache.minDepth !== viewport.minDepth
            || cache.maxDepth !== viewport.maxDepth) {
            cache.left = viewport.left;
            cache.top = viewport.top;
            cache.width = viewport.width;
            cache.height = viewport.height;
            cache.minDepth = viewport.minDepth;
            cache.maxDepth = viewport.maxDepth;
            this._isStateInvalid = true;
        }
    }

    public setScissor (scissor: Readonly<Rect>): void {
        const cache = this._curDynamicStates.scissor;
        if (cache.x !== scissor.x
            || cache.y !== scissor.y
            || cache.width !== scissor.width
            || cache.height !== scissor.height) {
            cache.x = scissor.x;
            cache.y = scissor.y;
            cache.width = scissor.width;
            cache.height = scissor.height;
            this._isStateInvalid = true;
        }
    }

    public setLineWidth (lineWidth: number): void {
        if (this._curDynamicStates.lineWidth !== lineWidth) {
            this._curDynamicStates.lineWidth = lineWidth;
            this._isStateInvalid = true;
        }
    }

    public setDepthBias (depthBiasConstantFactor: number, depthBiasClamp: number, depthBiasSlopeFactor: number): void {
        const cache = this._curDynamicStates;
        if (cache.depthBiasConstant !== depthBiasConstantFactor
            || cache.depthBiasClamp !== depthBiasClamp
            || cache.depthBiasSlope !== depthBiasSlopeFactor) {
            cache.depthBiasConstant = depthBiasConstantFactor;
            cache.depthBiasClamp = depthBiasClamp;
            cache.depthBiasSlope = depthBiasSlopeFactor;
            this._isStateInvalid = true;
        }
    }

    public setBlendConstants (blendConstants: Color): void {
        const cache = this._curDynamicStates.blendConstant;
        if (cache.x !== blendConstants.x
            || cache.y !== blendConstants.y
            || cache.z !== blendConstants.z
            || cache.w !== blendConstants.w) {
            cache.copy(blendConstants);
            this._isStateInvalid = true;
        }
    }

    public setDepthBound (minDepthBounds: number, maxDepthBounds: number): void {
        const cache = this._curDynamicStates;
        if (cache.depthMinBounds !== minDepthBounds
            || cache.depthMaxBounds !== maxDepthBounds) {
            cache.depthMinBounds = minDepthBounds;
            cache.depthMaxBounds = maxDepthBounds;
            this._isStateInvalid = true;
        }
    }

    public setStencilWriteMask (face: StencilFace, writeMask: number): void {
        const front = this._curDynamicStates.stencilStatesFront;
        const back = this._curDynamicStates.stencilStatesBack;
        if (face & StencilFace.FRONT) {
            if (front.writeMask !== writeMask) {
                front.writeMask = writeMask;
                this._isStateInvalid = true;
            }
        }
        if (face & StencilFace.BACK) {
            if (back.writeMask !== writeMask) {
                back.writeMask = writeMask;
                this._isStateInvalid = true;
            }
        }
    }

    public setStencilCompareMask (face: StencilFace, reference: number, compareMask: number): void {
        const front = this._curDynamicStates.stencilStatesFront;
        const back = this._curDynamicStates.stencilStatesBack;
        if (face & StencilFace.FRONT) {
            if (front.compareMask !== compareMask
                || front.reference !== reference) {
                front.reference = reference;
                front.compareMask = compareMask;
                this._isStateInvalid = true;
            }
        }
        if (face & StencilFace.BACK) {
            if (back.compareMask !== compareMask
                || back.reference !== reference) {
                back.reference = reference;
                back.compareMask = compareMask;
                this._isStateInvalid = true;
            }
        }
    }

    public draw (infoOrAssembler: Readonly<DrawInfo> | Readonly<InputAssembler>): void {
        errorID(16328);
    }

    public updateBuffer (buffer: Buffer, data: Readonly<BufferSource>, size?: number): void {
        errorID(16329);
    }

    public copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void {
        errorID(16330);
    }

    public execute (cmdBuffs: Readonly<CommandBuffer[]>, count: number): void {
        errorID(16402);
    }

    public pipelineBarrier (
        GeneralBarrier: Readonly<GeneralBarrier>,
        bufferBarriers?: Readonly<BufferBarrier[]>,
        buffers?: Readonly<Buffer[]>,
        textureBarriers?: Readonly<TextureBarrier[]>,
        textures?: Readonly<Texture[]>,
    ): void {

    }

    protected bindStates (): void {
        errorID(16401);
        this._isStateInvalid = false;
    }

    public blitTexture (srcTexture: Readonly<Texture>, dstTexture: Texture, regions: Readonly<TextureBlit []>, filter: Filter): void {
        errorID(16401);
    }
}
