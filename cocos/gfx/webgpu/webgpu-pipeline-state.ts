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

import { PipelineState, PipelineStateInfo } from '../base/pipeline-state';
import { IWebGPUGPUInputAssembler, IWebGPUGPUPipelineState } from './webgpu-gpu-objects';
import { WebGPURenderPass } from './webgpu-render-pass';
import { WebGPUShader } from './webgpu-shader';
import { BlendOp, CullMode, DynamicStateFlagBit, FormatInfos, PrimitiveMode, ShaderStageFlagBit } from '../base/define';
import { WebGPUPipelineLayout } from './webgpu-pipeline-layout';
import {
    GFXFormatToWGPUFormat,
    WebGPUBlendFactors,
    WebGPUBlendOps,
    WebGPUCompereFunc,
    WebGPUStencilOp,
    GFXFormatToWGPUVertexFormat,
    WebGPUBlendMask,
} from './webgpu-commands';
import { WebGPUDeviceManager } from './define';

const WebPUPrimitives: GPUPrimitiveTopology[] = [
    'point-list',
    'line-list',
    'line-strip',
    'line-strip',   // no line_loop in webgpu
    'line-list',
    'line-strip',
    'line-list',
    'triangle-list',
    'triangle-strip',
    'triangle-strip',
    'triangle-list',
    'triangle-strip',
    'triangle-strip',
    'triangle-strip',    // no quad
];

export class WebGPUPipelineState extends PipelineState {
    get gpuPipelineState (): IWebGPUGPUPipelineState {
        return this._gpuPipelineState!;
    }

    private _gpuPipelineState: IWebGPUGPUPipelineState | null = null;
    private _locations: Map<string, number> = new Map<string, number>();
    public initialize (info: Readonly<PipelineStateInfo>): void {
        this._primitive = info.primitive;
        this._shader = info.shader;
        this._pipelineLayout = info.pipelineLayout;
        this._rs = info.rasterizerState;
        this._dss = info.depthStencilState;
        this._bs = info.blendState;
        this._is = info.inputState;
        this._renderPass = info.renderPass;
        this._dynamicStates = info.dynamicStates;

        const dynamicStates: DynamicStateFlagBit[] = [];
        for (let i = 0; i < 31; i++) {
            if (this._dynamicStates & (1 << i)) {
                dynamicStates.push(1 << i);
            }
        }

        // colorstates
        const colorAttachments = this._renderPass.colorAttachments;
        const colorDescs: GPUColorTargetState[] = [];
        const colAttachmentSize = colorAttachments.length;
        for (let i = 0; i < colAttachmentSize; i++) {
            const colDesc: GPUColorTargetState = {
                format: GFXFormatToWGPUFormat(colorAttachments[i].format),
                writeMask: WebGPUBlendMask(this._bs.targets[i].blendColorMask),
            };
            if (this._bs.targets[i].blend) {
                colDesc.blend = {
                    color: {
                        dstFactor: WebGPUBlendFactors[this._bs.targets[i].blendDst],
                        operation: WebGPUBlendOps[this._bs.targets[i].blendEq === BlendOp.MAX ? BlendOp.ADD : this._bs.targets[i].blendEq],
                        srcFactor: WebGPUBlendFactors[this._bs.targets[i].blendSrc],
                    },
                    alpha: {
                        dstFactor: WebGPUBlendFactors[this._bs.targets[i].blendDstAlpha],
                        operation: WebGPUBlendOps[this._bs.targets[i].blendAlphaEq === BlendOp.MAX ? BlendOp.ADD : this._bs.targets[i].blendAlphaEq],
                        srcFactor: WebGPUBlendFactors[this._bs.targets[i].blendSrcAlpha],
                    },
                };
            }
            colorDescs.push(colDesc);
        }

        let vertexStage: GPUProgrammableStage;
        let fragmentStage: GPUProgrammableStage;
        const shaderStages = (this._shader as WebGPUShader).gpuShader.gpuStages;
        const stageSize = shaderStages.length;
        for (let i = 0; i < stageSize; i++) {
            if (shaderStages[i].type === ShaderStageFlagBit.VERTEX) { vertexStage = shaderStages[i].gpuShader!; }
            if (shaderStages[i].type === ShaderStageFlagBit.FRAGMENT) { fragmentStage = shaderStages[i].gpuShader!; }
        }

        const gpuShader = info.shader as WebGPUShader;

        const shaderAttrs = gpuShader.attributes;
        const attrsSize = shaderAttrs.length;
        for (let i = 0; i < attrsSize; i++) {
            this._locations.set(shaderAttrs[i].name, shaderAttrs[i].location);
        }
        const stripTopology = (info.primitive === PrimitiveMode.LINE_STRIP || info.primitive === PrimitiveMode.TRIANGLE_STRIP);
        const renderPplDesc: GPURenderPipelineDescriptor = {
            layout: 'auto', // later
            vertex: {
                module: vertexStage!.module,
                entryPoint: 'main',
                buffers: [],
            },
            primitive: {
                topology: WebPUPrimitives[info.primitive],
                frontFace: this._rs.isFrontFaceCCW ? 'ccw' : 'cw',
                cullMode: this._rs.cullMode === CullMode.NONE ? 'none' : (this._rs.cullMode === CullMode.FRONT) ? 'front' : 'back',
            },

            fragment: {
                module: fragmentStage!.module,
                entryPoint: 'main',
                targets: colorDescs,
            },
        };
        if (stripTopology) renderPplDesc.primitive!.stripIndexFormat = 'uint16';

        // depthstencil states
        let stencilRef = 0;
        if (this._renderPass.depthStencilAttachment) {
            const dssDesc = {} as GPUDepthStencilState;
            dssDesc.format = GFXFormatToWGPUFormat(this._renderPass.depthStencilAttachment.format);
            dssDesc.depthWriteEnabled = this._dss.depthWrite;
            dssDesc.depthCompare = this._dss.depthTest ? WebGPUCompereFunc[this._dss.depthFunc] : 'always';
            let stencilReadMask = 0;
            let stencilWriteMask = 0;

            if (this._dss.stencilTestFront) {
                dssDesc.stencilFront = {
                    compare: WebGPUCompereFunc[this._dss.stencilFuncFront],
                    depthFailOp: WebGPUStencilOp[this._dss.stencilZFailOpFront],
                    passOp: WebGPUStencilOp[this._dss.stencilPassOpFront],
                    failOp: WebGPUStencilOp[this._dss.stencilFailOpFront],
                };
                stencilReadMask |= this._dss.stencilReadMaskFront;
                stencilWriteMask |= this._dss.stencilWriteMaskFront;
                stencilRef |= this._dss.stencilRefFront;
            }
            if (this._dss.stencilTestBack) {
                dssDesc.stencilBack = {
                    compare: WebGPUCompereFunc[this._dss.stencilFuncBack],
                    depthFailOp: WebGPUStencilOp[this._dss.stencilZFailOpBack],
                    passOp: WebGPUStencilOp[this._dss.stencilPassOpBack],
                    failOp: WebGPUStencilOp[this._dss.stencilFailOpBack],
                };
                stencilReadMask |= this._dss.stencilReadMaskBack;
                stencilWriteMask |= this._dss.stencilWriteMaskBack;
                stencilRef |= this._dss.stencilRefBack;
            }
            dssDesc.stencilReadMask = stencilReadMask;
            dssDesc.stencilWriteMask = stencilWriteMask;
            dssDesc.depthBias = this._rs.depthBias;
            dssDesc.depthBiasSlopeScale = this._rs.depthBiasSlop;
            dssDesc.depthBiasClamp = this._rs.depthBiasClamp;
            renderPplDesc.depthStencil = dssDesc;
        }

        this._gpuPipelineState = {
            gpuPrimitive: WebPUPrimitives[info.primitive],
            gpuShader: gpuShader.gpuShader,
            gpuPipelineLayout: (info.pipelineLayout as WebGPUPipelineLayout).gpuPipelineLayout,
            rs: info.rasterizerState,
            dss: info.depthStencilState,
            stencilRef,
            bs: info.blendState,
            gpuRenderPass: (info.renderPass as WebGPURenderPass).gpuRenderPass,
            dynamicStates,
            pipelineState: renderPplDesc,
            nativePipeline: undefined,
        };
    }

    protected _getShaderLocation (name: string): number | undefined {
        return this._locations.get(name);
    }

    public updatePipelineLayout (): void {
        if (this._gpuPipelineState && this._gpuPipelineState.pipelineState) {
            this._gpuPipelineState.pipelineState.layout = (this._pipelineLayout as WebGPUPipelineLayout).gpuPipelineLayout!.nativePipelineLayout;
        }
    }

    public prepare (ia: IWebGPUGPUInputAssembler, forceUpdate: boolean = false): void {
        if (this._gpuPipelineState!.nativePipeline && !forceUpdate) {
            return;
        }
        const gpuShader = this.shader;
        const shaderAttrs = gpuShader.attributes;
        const pipelineState = this._gpuPipelineState!.pipelineState!;
        const vertexAttrs: GPUVertexBufferLayout[] = [];
        const emptyPushAttr: string[] = [];
        const streamCount = ia.gpuVertexBuffers.length;
        for (let i = 0; i < streamCount; i++) {
            const currBufferLayout: GPUVertexBufferLayout = {
                arrayStride: 0,
                attributes: [],
            };
            const currAttrs: GPUVertexAttribute[] = [];
            const shaderAttrSize = shaderAttrs.length;
            for (let j = 0; j < shaderAttrSize; j++) {
                const shaderAttr = shaderAttrs[j];
                let hasAttr = false;
                const gpuAttrSize = ia.gpuAttribs.length;
                for (let k = 0; k < gpuAttrSize; k++) {
                    const gpuAttr = ia.gpuAttribs[k];
                    const attr = ia.attributes[k];
                    if (attr.name === shaderAttr.name) {
                        hasAttr = true;
                        const loc = shaderAttr.location;
                        if (attr.stream === i) {
                            currBufferLayout.arrayStride = gpuAttr.stride;
                            currBufferLayout.stepMode = attr.isInstanced ? 'instance' : 'vertex';
                            const attrLayout: GPUVertexAttribute = {
                                format: GFXFormatToWGPUVertexFormat(attr.format),
                                offset: gpuAttr.offset,
                                shaderLocation: loc,
                            };
                            currAttrs.push(attrLayout);
                        }
                        break;
                    }
                }
                const format = shaderAttr.format;
                if (!hasAttr && !emptyPushAttr.includes(shaderAttr.name)
                    && (FormatInfos[format].size <= ia.gpuVertexBuffers[i].stride)) {
                    emptyPushAttr.push(shaderAttr.name);
                    const attrLayout: GPUVertexAttribute = {
                        format: GFXFormatToWGPUVertexFormat(format),
                        offset: 0,
                        shaderLocation: shaderAttr.location,
                    };
                    currAttrs.push(attrLayout);
                }
            }

            if (currAttrs.length) {
                currBufferLayout.attributes = currAttrs;
                vertexAttrs.push(currBufferLayout);
            }
        }

        pipelineState.vertex.buffers = vertexAttrs;
        const webgpuDevice = (WebGPUDeviceManager.instance);
        const nativeDevice = webgpuDevice.nativeDevice;
        const nativePipeline = nativeDevice?.createRenderPipeline(pipelineState);
        this._gpuPipelineState!.nativePipeline = nativePipeline;
    }

    public destroy (): void {
        this._gpuPipelineState = null;
    }
}
