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

import {
    Address,
    DescriptorType,
    BufferUsage,
    Filter,
    Format,
    MemoryUsage,
    SampleCount,
    ShaderStageFlagBit,
    TextureFlags,
    TextureType,
    TextureUsage,
    Type,
    DynamicStateFlagBit,
    DrawInfo,
    Attribute,
    ColorAttachment,
    DepthStencilAttachment,
    UniformBlock,
    UniformSampler,
    DescriptorSetLayoutBinding,
    BufferFlags,
    ComparisonFunc,
} from '../base/define';
import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { BlendState, DepthStencilState, RasterizerState } from '../base/pipeline-state';
import { WebGPUDeviceManager } from './define';
import { WebGPUFramebuffer } from './webgpu-framebuffer';

export interface IWebGPUGPUUniformInfo {
    name: string;
    type: Type;
    count: number;
    offset: number;
    view: Float32Array | Int32Array;
    isDirty: boolean;
}

export interface IWebGPUGPUBuffer {
    usage: BufferUsage;
    memUsage: MemoryUsage;
    size: number;
    stride: number;

    gpuTarget: number;
    gpuBuffer: GPUBuffer | null;
    gpuOffset: number;
    flags: BufferFlags | null;
    buffer: ArrayBufferView | null;
    indirects: DrawInfo[];
    drawIndirectByIndex: boolean;
}

export interface IWebGPUTexture {
    type: TextureType;
    format: Format;
    usage: TextureUsage;
    width: number;
    height: number;
    depth: number;
    size: number;
    arrayLayer: number;
    mipLevel: number;
    samples: SampleCount;
    flags: TextureFlags;
    isPowerOf2: boolean;

    gpuTarget: GPUTextureViewDimension;  // 1d, 2d, 3d
    gpuInternalFmt: GPUTextureFormat;// rgba8unorm
    gpuFormat: GPUTextureFormat;
    gpuType: number;                 // data type, => gl.UNSIGNED_BYTE
    gpuUsage: GPUTextureUsageFlags;  // webgl:DYNIMIC_DRAW... -> webGPU:COPY_DST/STORAGE...
    gpuTexture: GPUTexture | undefined;   // native tex handler
    gpuRenderbuffer: null;           // not suitable for webgpu
    gpuWrapS: GPUAddressMode;        // clamp-to-edge, repeat...
    gpuWrapT: GPUAddressMode;
    gpuMinFilter: GPUFilterMode;     // linear, nearest
    gpuMagFilter: GPUFilterMode;

    isSwapchainTexture: boolean;
    getTextureView: () => GPUTextureView | null;
}

export interface IWebGPUGPURenderPass {
    colorAttachments: ColorAttachment[];
    depthStencilAttachment: DepthStencilAttachment | null;
    nativeRenderPass: GPURenderPassDescriptor | null;
    originalRP: GPURenderPassDescriptor | null;
}

export interface IWebGPUGPUFramebuffer {
    gpuRenderPass: IWebGPUGPURenderPass;
    gpuColorTextures: IWebGPUTexture[];
    gpuDepthStencilTexture: IWebGPUTexture | null;
    isOffscreen?: boolean;
    gpuFramebuffer: WebGPUFramebuffer | null;
    width: number;
    height: number;
}

export interface IWebGPUGPUSampler {
    gpuSampler: GPUSampler | null;
    compare: ComparisonFunc;
    minFilter: Filter;
    magFilter: Filter;
    mipFilter: Filter;
    addressU: Address;
    addressV: Address;
    addressW: Address;
    mipLevel: number;
    maxAnisotropy: number;

    gpuMinFilter: GPUFilterMode;
    gpuMagFilter: GPUFilterMode;
    gpuMipFilter: GPUFilterMode;
    gpuWrapS: GPUAddressMode;
    gpuWrapT: GPUAddressMode;
    gpuWrapR: GPUAddressMode;
}

export interface IWebGPUGPUInput {
    name: string;
    type: Type;
    stride: number;
    count: number;
    size: number;

    gpuType: number;
    gpuLoc: number;
}

export interface IWebGPUGPUUniform {
    binding: number;
    name: string;
    type: Type;
    stride: number;
    count: number;
    size: number;
    offset: number;

    gpuType: number;
    gpuLoc: number;
    array: number[];
    begin: number;
}

export interface IWebGPUGPUUniformBlock {
    set: number;
    binding: number;
    idx: number;
    name: string;
    size: number;
    gpuBinding: number;
}

export interface IWebGPUGPUUniformSampler {
    set: number;
    binding: number;
    name: string;
    type: Type;
    count: number;
    units: number[];
    gpuUnits: Int32Array;

    gpuType: number;
    gpuLoc: number;
}

export interface IWebGPUGPUShaderStage {
    type: ShaderStageFlagBit;
    source: string;
    gpuShader: GPUProgrammableStage | null;
    bindings: number[][];
    attrs: Map<number, string>;
}

export interface IWebGPUGPUShader {
    name: string;
    blocks: UniformBlock[];
    samplers: UniformSampler[];

    gpuStages: IWebGPUGPUShaderStage[];
    gpuProgram: number | null;
    gpuInputs: IWebGPUGPUInput[];
    gpuUniforms: IWebGPUGPUUniform[];
    gpuBlocks: IWebGPUGPUUniformBlock[];
    gpuSamplers: IWebGPUGPUUniformSampler[];
    bindings: Map<number, number[]>;
}

export interface IWebGPUGPUDescriptorSetLayout {
    bindings: DescriptorSetLayoutBinding[];
    dynamicBindings: number[];
    descriptorIndices: number[];
    descriptorCount: number;
    entries: GPUBindGroupLayoutEntry[];
    bindGroupLayout: GPUBindGroupLayout | null;
}

export interface IWebGPUGPUPipelineLayout {
    setLayouts: DescriptorSetLayout[];
    gpuSetLayouts: IWebGPUGPUDescriptorSetLayout[];
    gpuBindGroupLayouts: GPUBindGroupLayout[];
    dynamicOffsetCount: number;
    dynamicOffsetIndices: number[][];
    nativePipelineLayout: GPUPipelineLayout;
}

export interface IWebGPUGPUPipelineState {
    gpuPrimitive: GPUPrimitiveTopology;
    gpuShader: IWebGPUGPUShader | null;
    gpuPipelineLayout: IWebGPUGPUPipelineLayout | null;
    rs: RasterizerState;
    dss: DepthStencilState;
    stencilRef: number;
    bs: BlendState;
    dynamicStates: DynamicStateFlagBit[];
    gpuRenderPass: IWebGPUGPURenderPass | null;
    pipelineState: GPURenderPipelineDescriptor | undefined;
    nativePipeline: GPUPipelineBase | undefined;
}

export interface IWebGPUGPUDescriptor {
    type: DescriptorType;
    gpuBuffer: IWebGPUGPUBuffer | null;
    gpuTexture: IWebGPUTexture | null;
    gpuSampler: IWebGPUGPUSampler | null;
}

export interface IWebGPUGPUDescriptorSet {
    gpuDescriptors: IWebGPUGPUDescriptor[];
    descriptorIndices: number[];
    bindGroup: GPUBindGroup;
    bindGroupLayout: GPUBindGroupLayout;
}

export interface IWebGPUAttrib {
    name: string;
    gpuBuffer: GPUBuffer | null;
    gpuType: number;
    size: number;
    count: number;
    stride: number;
    componentCount: number;
    isNormalized: boolean;
    isInstanced: boolean;
    offset: number;
}

export interface IWebGPUGPUInputAssembler {
    attributes: Attribute[];
    gpuVertexBuffers: IWebGPUGPUBuffer[];
    gpuIndexBuffer: IWebGPUGPUBuffer | null;
    gpuIndirectBuffer: IWebGPUGPUBuffer | null;

    gpuAttribs: IWebGPUAttrib[];
    gpuIndexType: GPUIndexFormat;
}

export interface IWebGPUBindingMapping {
    blockOffsets: number[];
    samplerTextureOffsets: number[];
    flexibleSet: number;
}

export class IWebGPUBlitManager {
    private _srcFramebuffer: WebGPUFramebuffer | null = null;
    private _dstFramebuffer: WebGPUFramebuffer | null = null;

    get srcFramebuffer (): WebGPUFramebuffer | null {
        return this._srcFramebuffer;
    }

    get dstFramebuffer (): WebGPUFramebuffer | null {
        return this._dstFramebuffer;
    }

    constructor () {
        const device = WebGPUDeviceManager.instance;
    }

    destroy (): void {
        // noop
    }
}
