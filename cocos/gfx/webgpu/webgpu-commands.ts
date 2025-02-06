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

import { CachedArray } from '../../core/memop/cached-array';
import { BufferSource, DrawInfo, IndirectBuffer, Texture } from '..';
import {
    BufferUsageBit,
    ColorMask,
    Filter,
    Format,
    FormatInfos,
    ShaderStageFlagBit,
    TextureType,
    TextureUsageBit,
    ShaderStageFlags,
    DescriptorType,
    Color, Rect, Viewport, BufferTextureCopy,
    SamplerInfo,
    BufferInfo,
    FormatSize,
    formatAlignment,
    alignTo,
    TextureFlagBit,
    DescriptorSetLayoutBinding,
} from '../base/define';

import { WebGPUCommandAllocator } from './webgpu-command-allocator';
import {
    IWebGPUDepthBias,
    IWebGPUDepthBounds,
    IWebGPUStencilCompareMask,
    IWebGPUStencilWriteMask,
} from './webgpu-command-buffer';
import { WebGPUDevice } from './webgpu-device';
import {
    IWebGPUGPUInputAssembler,
    IWebGPUAttrib,
    IWebGPUGPUDescriptorSet,
    IWebGPUGPUBuffer,
    IWebGPUGPUFramebuffer,
    IWebGPUGPUPipelineState,
    IWebGPUGPUSampler,
    IWebGPUGPUShader,
    IWebGPUTexture,
    IWebGPUGPURenderPass,
    IWebGPUGPUShaderStage,
} from './webgpu-gpu-objects';
import { copy } from '../../core/utils/array';
import { clear } from '../../asset/asset-manager/utilities';
import { error, log, warn } from '../../core';

const WebGPUAdressMode: GPUAddressMode[] = [
    'repeat', // WRAP,
    'mirror-repeat', // MIRROR,
    'clamp-to-edge', // CLAMP,
    'clamp-to-edge', // BORDER,
];

const WebGPUCompareFunc: GPUCompareFunction[] = [
    'never',
    'less',
    'equal',
    'less-equal',
    'greater',
    'not-equal',
    'greater-equal',
    'always',
];

const SAMPLES: number[] = [
    1,
    2,
    4,
    8,
    16,
    32,
    64,
];

const _f32v4 = new Float32Array(4);

// tslint:disable: max-line-length

function CmpF32NotEuqal (a: number, b: number): boolean {
    const c = a - b;
    return (c > 0.000001 || c < -0.000001);
}

export function GFXStageToWebGPUStage (stage: ShaderStageFlags): number {
    let flag = 0x0;
    if (stage & ShaderStageFlagBit.VERTEX) { flag |= GPUShaderStage.VERTEX; }
    if (stage & ShaderStageFlagBit.FRAGMENT) { flag |= GPUShaderStage.FRAGMENT; }
    if (stage & ShaderStageFlagBit.COMPUTE) { flag |= GPUShaderStage.COMPUTE; }
    if (stage === ShaderStageFlagBit.ALL) { flag |= (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE); }
    if (flag === 0x0) { throw new Error('shader stage not supported by webGPU!'); }
    return flag;
}

type WebGPUResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

export function GFXSamplerToGPUSamplerDescType (info: Readonly<SamplerInfo>): GPUSamplerBindingType {
    if (info.magFilter !== Filter.LINEAR && info.minFilter !== Filter.LINEAR) {
        return 'non-filtering';
    } else {
        return 'filtering';
    }
}

export function GFXDescTypeToGPUBufferDescType (descType: DescriptorType): GPUBufferBindingType {
    switch (descType) {
    case DescriptorType.UNIFORM_BUFFER:
    case DescriptorType.DYNAMIC_UNIFORM_BUFFER:
        return 'uniform';
    case DescriptorType.STORAGE_BUFFER:
    case DescriptorType.DYNAMIC_STORAGE_BUFFER:
    default:
        return 'storage';
    }
}

export function GFXDescTypeToWebGPUDescType (descType: DescriptorType): WebGPUResourceTypeName {
    switch (descType) {
    case DescriptorType.UNIFORM_BUFFER:
    case DescriptorType.DYNAMIC_UNIFORM_BUFFER:
    case DescriptorType.STORAGE_BUFFER:
        return 'buffer';
    case DescriptorType.SAMPLER:
        return 'sampler';
    case DescriptorType.SAMPLER_TEXTURE:
        return 'texture';
    case DescriptorType.STORAGE_IMAGE:
        return 'storageTexture';
    default:
        return 'externalTexture';
    }
}

export function GFXFormatToWGPUVertexFormat (format: Format): GPUVertexFormat {
    switch (format) {
    case Format.R32F: return 'float32';
    case Format.R32UI: return 'uint32';
    case Format.R32I: return 'sint32';
    case Format.RG8: return 'unorm8x2';
    case Format.RG8SN: return 'snorm8x2';
    case Format.RG8UI: return 'uint8x2';
    case Format.RG8I: return 'sint8x2';
    case Format.RG16F: return 'float16x2';
    case Format.RG16UI: return 'uint16x2';
    case Format.RG16I: return 'sint16x2';
    case Format.RG32F: return 'float32x2';
    case Format.RG32UI: return 'uint32x2';
    case Format.RG32I: return 'sint32x2';
    case Format.RGB32F: return 'float32x3';
    case Format.RGB32UI: return 'uint32x3';
    case Format.RGB32I: return 'sint32x3';
    case Format.BGRA8: return 'unorm8x4';
    case Format.RGBA8: return 'unorm8x4';
    case Format.SRGB8_A8: return 'uint8x4';
    case Format.RGBA8SN: return 'snorm8x4';
    case Format.RGBA8UI: return 'uint8x4';
    case Format.RGBA8I: return 'sint8x4';
    case Format.RGBA16F: return 'float16x4';
    case Format.RGBA16UI: return 'uint16x4';
    case Format.RGBA16I: return 'sint16x4';
    case Format.RGBA32F: return 'float32x4';
    case Format.RGBA32UI: return 'uint32x4';
    case Format.RGBA32I: return 'sint32x4';

    default: {
        warn('Unsupported Format, return sint8x4 in default.');
        return 'sint8x4';
    }
    }
}

function GFXFormatToWGPUTextureFormat (format: Format): GPUTextureFormat {
    switch (format) {
    case Format.R8: return 'r8unorm';
    case Format.R8SN: return 'r8snorm';
    case Format.R8UI: return 'r8uint';
    case Format.R8I: return 'r8sint';
    case Format.RG8: return 'rg8unorm';
    case Format.RG8SN: return 'rg8snorm';
    case Format.RG8UI: return 'rg8uint';
    case Format.RG8I: return 'rg8sint';
    case Format.BGRA8: return 'bgra8unorm';
    case Format.RGBA8: return 'rgba8unorm';
    case Format.SRGB8_A8: return 'rgba8unorm-srgb';
    case Format.RGBA8SN: return 'rgba8snorm';
    case Format.RGBA8UI: return 'rgba8uint';
    case Format.RGBA8I: return 'rgba8sint';
    case Format.R16I: return 'r16sint';
    case Format.R16UI: return 'r16uint';
    case Format.R16F: return 'r16sint';
    case Format.RG16I: return 'rg16sint';
    case Format.RG16UI: return 'rg16uint';
    case Format.RG16F: return 'rg16float';
    case Format.RGBA16I: return 'rgba16sint';
    case Format.RGBA16UI: return 'rgba16uint';
    case Format.RGBA16F: return 'rgba16float';
    case Format.R32I: return 'r32sint';
    case Format.R32UI: return 'r32uint';
    case Format.R32F: return 'r32float';
    case Format.RG32I: return 'rg32sint';
    case Format.RG32UI: return 'rg32uint';
    case Format.RG32F: return 'rg32float';
    case Format.RGBA32I: return 'rgba32sint';
    case Format.RGBA32UI: return 'rgba32uint';
    case Format.RGBA32F: return 'rgba32float';
    case Format.RGB10A2: return 'rgb10a2unorm';

    case Format.DEPTH: return 'depth24plus';
    case Format.DEPTH_STENCIL: return 'depth24plus-stencil8';

    case Format.BC1_ALPHA: return 'bc1-rgba-unorm';
    case Format.BC1_SRGB_ALPHA: return 'bc1-rgba-unorm-srgb';
    case Format.BC2: return 'bc2-rgba-unorm';
    case Format.BC2_SRGB: return 'bc2-rgba-unorm-srgb';
    case Format.BC3: return 'bc3-rgba-unorm';
    case Format.BC3_SRGB: return 'bc3-rgba-unorm-srgb';
    case Format.BC4_SNORM: return 'bc4-r-snorm';
    case Format.BC6H_SF16: return 'bc6h-rgb-float';
    case Format.BC6H_UF16: return 'bc6h-rgb-ufloat';
    case Format.BC7: return 'bc7-rgba-unorm';
    case Format.BC7_SRGB: return 'bc7-rgba-unorm-srgb';

    default: {
        warn('Unsupported Format, return rgba8unorm indefault.');
        return 'rgba8unorm';
    }
    }
}

export function GFXFormatToWGPUFormat (format: Format): GPUTextureFormat {
    return GFXFormatToWGPUTextureFormat(format);
}

function wGPUTextureFormatToGFXFormat (format: GPUTextureFormat): Format {
    switch (format) {
    case 'r8unorm': return Format.R8;
    case 'r8snorm': return Format.R8SN;
    case 'r8uint': return Format.R8UI;
    case 'r8sint': return Format.R8I;
    case 'rg8unorm': return Format.RG8;
    case 'rg8snorm': return Format.RG8SN;
    case 'rg8uint': return Format.RG8UI;
    case 'rg8sint': return Format.RG8I;
    case 'bgra8unorm': return Format.BGRA8;
    case 'rgba8unorm': return Format.RGBA8;
    case 'rgba8unorm-srgb': return Format.SRGB8_A8;
    case 'rgba8snorm': return Format.RGBA8SN;
    case 'rgba8uint': return Format.RGBA8UI;
    case 'rgba8sint': return Format.RGBA8I;
    case 'r16sint': return Format.R16I;
    case 'r16uint': return Format.R16UI;
    case 'r16float': return Format.R16F;
    case 'rg16sint': return Format.RG16I;
    case 'rg16uint': return Format.RG16UI;
    case 'rg16float': return Format.RG16F;
    case 'rgba16sint': return Format.RGBA16I;
    case 'rgba16uint': return Format.RGBA16UI;
    case 'rgba16float': return Format.RGBA16F;
    case 'r32sint': return Format.R32I;
    case 'r32uint': return Format.R32UI;
    case 'r32float': return Format.R32F;
    case 'rg32sint': return Format.RG32I;
    case 'rg32uint': return Format.RG32UI;
    case 'rg32float': return Format.RG32F;
    case 'rgba32sint': return Format.RGBA32I;
    case 'rgba32uint': return Format.RGBA32UI;
    case 'rgba32float': return Format.RGBA32F;
    case 'rgb10a2unorm': return Format.RGB10A2;
    case 'depth24plus': return Format.DEPTH;
    case 'depth24plus-stencil8': return Format.DEPTH_STENCIL;
    case 'bc1-rgba-unorm': return Format.BC1_ALPHA;
    case 'bc1-rgba-unorm-srgb': return Format.BC1_SRGB_ALPHA;
    case 'bc2-rgba-unorm': return Format.BC2;
    case 'bc2-rgba-unorm-srgb': return Format.BC2_SRGB;
    case 'bc3-rgba-unorm': return Format.BC3;
    case 'bc3-rgba-unorm-srgb': return Format.BC3_SRGB;
    case 'bc4-r-snorm': return Format.BC4_SNORM;
    case 'bc6h-rgb-float': return Format.BC6H_SF16;
    case 'bc6h-rgb-ufloat': return Format.BC6H_UF16;
    case 'bc7-rgba-unorm': return Format.BC7;
    case 'bc7-rgba-unorm-srgb': return Format.BC7_SRGB;
    default:
        return Format.RGBA8;
    }
}

export function WGPUFormatToGFXFormat (format: GPUTextureFormat): Format {
    return wGPUTextureFormatToGFXFormat(format);
}

export function GFXTextureToWebGPUTexture (textureType: TextureType): GPUTextureViewDimension {
    switch (textureType) {
    case TextureType.TEX1D: return '1d';
    case TextureType.TEX2D: return '2d';
    case TextureType.TEX2D_ARRAY: return '2d-array';
    case TextureType.TEX3D: return '3d';
    case TextureType.CUBE: return 'cube';
    default: {
        error('Unsupported textureType, convert to WebGPUTexture failed.');
        return '2d';
    }
    }
}

export function GFXTextureUsageToNative (usage: TextureUsageBit): GPUTextureUsageFlags {
    let nativeUsage: GPUTextureUsageFlags = 0;
    if (usage & TextureUsageBit.TRANSFER_SRC) {
        nativeUsage |= GPUTextureUsage.COPY_SRC;
    }

    if (usage & TextureUsageBit.TRANSFER_DST) {
        nativeUsage |= GPUTextureUsage.COPY_DST;
    }

    if (usage & TextureUsageBit.SAMPLED) {
        nativeUsage |= GPUTextureUsage.TEXTURE_BINDING;
    }

    if (usage & TextureUsageBit.STORAGE) {
        nativeUsage |= GPUTextureUsage.STORAGE_BINDING;
    }

    if (usage & TextureUsageBit.COLOR_ATTACHMENT || usage & TextureUsageBit.DEPTH_STENCIL_ATTACHMENT) {
        nativeUsage |= GPUTextureUsage.RENDER_ATTACHMENT;
    }

    if (!nativeUsage) {
        // The default value is TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        // An error will be thrown saying "Destination texture needs to have CopyDst and RenderAttachment usage."
        // if you use GPUTextureUsage.COPY_DST without GPUTextureUsage.RENDER_ATTACHMENT.
        nativeUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;
    }

    if (!(nativeUsage & GPUTextureUsage.COPY_DST)) {
        nativeUsage |= GPUTextureUsage.COPY_DST;
    }

    if ((nativeUsage & (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST))
    && !(nativeUsage & (GPUTextureUsage.RENDER_ATTACHMENT))) {
        nativeUsage |= GPUTextureUsage.RENDER_ATTACHMENT;
    }

    return nativeUsage;
}

export const WebGPUStencilOp: GPUStencilOperation[] = [
    'zero',
    'keep',
    'replace',
    'increment-clamp',
    'decrement-clamp',
    'invert',
    'increment-wrap',
    'decrement-wrap',
];

export const WebGPUCompereFunc: GPUCompareFunction[] = [
    'never',
    'less',
    'equal',
    'less-equal',
    'greater',
    'not-equal',
    'greater-equal',
    'always',
];

export const WebGPUBlendOps: GPUBlendOperation[] = [
    'add',
    'subtract',
    'reverse-subtract',
    'min',
    'max',
];

export function WebGPUBlendMask (mask: ColorMask): GPUColorWriteFlags {
    switch (mask) {
    case ColorMask.R:
        return GPUColorWrite.RED;
    case ColorMask.G:
        return GPUColorWrite.GREEN;
    case ColorMask.B:
        return GPUColorWrite.BLUE;
    case ColorMask.A:
        return GPUColorWrite.ALPHA;
    default:
        return GPUColorWrite.ALL;
    }
}

export const WebGPUBlendFactors: GPUBlendFactor[] = [
    'zero',
    'one',
    'src-alpha',
    'dst-alpha',
    'one-minus-src-alpha',
    'one-minus-dst-alpha',
    'src',
    'dst',
    'one-minus-src',
    'one-minus-dst',
    'src-alpha-saturated',
    'constant', // CONSTANT_COLOR
    'one-minus-constant', // ONE_MINUS_CONSTANT_COLOR
    'src-alpha', // CONSTANT_ALPHA: not supported
    'one-minus-src-alpha', // ONE_MINUS_CONSTANT_ALPHA: not supported
];

export enum WebGPUCmd {
    BEGIN_RENDER_PASS,
    END_RENDER_PASS,
    BIND_STATES,
    DRAW,
    UPDATE_BUFFER,
    COPY_BUFFER_TO_TEXTURE,
    COUNT,
}

export abstract class WebGPUCmdObject {
    public cmdType: WebGPUCmd;
    public refCount = 0;

    constructor (type: WebGPUCmd) {
        this.cmdType = type;
    }

    public abstract clear ();
}

export class WebGPUCmdBeginRenderPass extends WebGPUCmdObject {
    public gpuRenderPass: IWebGPUGPURenderPass | null = null;
    public gpuFramebuffer: IWebGPUGPUFramebuffer | null = null;
    public renderArea = new Rect();
    public clearColors: Color[] = [];
    public clearDepth = 1.0;
    public clearStencil = 0;

    constructor () {
        super(WebGPUCmd.BEGIN_RENDER_PASS);
    }

    public clear (): void {
        this.gpuFramebuffer = null;
        this.clearColors.length = 0;
    }
}

export class WebGPUCmdBindStates extends WebGPUCmdObject {
    public gpuPipelineState: IWebGPUGPUPipelineState | null = null;
    public gpuInputAssembler: IWebGPUGPUInputAssembler | null = null;
    public gpuDescriptorSets: IWebGPUGPUDescriptorSet[] = [];
    public dynamicOffsets: number[] = [];
    public viewport: Viewport | null = null;
    public scissor: Rect | null = null;
    public lineWidth: number | null = null;
    public depthBias: IWebGPUDepthBias | null = null;
    public blendConstants: number[] = [];
    public depthBounds: IWebGPUDepthBounds | null = null;
    public stencilWriteMask: IWebGPUStencilWriteMask | null = null;
    public stencilCompareMask: IWebGPUStencilCompareMask | null = null;

    constructor () {
        super(WebGPUCmd.BIND_STATES);
    }

    public clear (): void {
        this.gpuPipelineState = null;
        this.gpuInputAssembler = null;
        this.gpuDescriptorSets.length = 0;
        this.dynamicOffsets.length = 0;
        this.viewport = null;
        this.scissor = null;
        this.lineWidth = null;
        this.depthBias = null;
        this.blendConstants.length = 0;
        this.depthBounds = null;
        this.stencilWriteMask = null;
        this.stencilCompareMask = null;
    }
}

export class WebGPUCmdDraw extends WebGPUCmdObject {
    public drawInfo = new DrawInfo();

    constructor () {
        super(WebGPUCmd.DRAW);
    }

    public clear (): void {
        // nothing
    }
}

export class WebGPUCmdUpdateBuffer extends WebGPUCmdObject {
    public gpuBuffer: IWebGPUGPUBuffer | null = null;
    public buffer: BufferSource | null = null;
    public offset = 0;
    public size = 0;

    constructor () {
        super(WebGPUCmd.UPDATE_BUFFER);
    }

    public clear (): void {
        this.gpuBuffer = null;
        this.buffer = null;
    }
}

export class WebGPUCmdCopyBufferToTexture extends WebGPUCmdObject {
    public gpuTexture: IWebGPUTexture | null = null;
    public buffers: ArrayBufferView[] = [];
    public regions: BufferTextureCopy[] = [];

    constructor () {
        super(WebGPUCmd.COPY_BUFFER_TO_TEXTURE);
    }

    public clear (): void {
        this.gpuTexture = null;
        this.buffers.length = 0;
        this.regions.length = 0;
    }
}

export class WebGPUCmdPackage {
    public cmds: CachedArray<WebGPUCmd> = new CachedArray(1);
    public beginRenderPassCmds: CachedArray<WebGPUCmdBeginRenderPass> = new CachedArray(1);
    public bindStatesCmds: CachedArray<WebGPUCmdBindStates> = new CachedArray(1);
    public drawCmds: CachedArray<WebGPUCmdDraw> = new CachedArray(1);
    public updateBufferCmds: CachedArray<WebGPUCmdUpdateBuffer> = new CachedArray(1);
    public copyBufferToTextureCmds: CachedArray<WebGPUCmdCopyBufferToTexture> = new CachedArray(1);

    public clearCmds (allocator: WebGPUCommandAllocator): void {
        if (this.beginRenderPassCmds.length) {
            allocator.beginRenderPassCmdPool.freeCmds(this.beginRenderPassCmds);
            this.beginRenderPassCmds.clear();
        }

        if (this.bindStatesCmds.length) {
            allocator.bindStatesCmdPool.freeCmds(this.bindStatesCmds);
            this.bindStatesCmds.clear();
        }

        if (this.drawCmds.length) {
            allocator.drawCmdPool.freeCmds(this.drawCmds);
            this.drawCmds.clear();
        }

        if (this.updateBufferCmds.length) {
            allocator.updateBufferCmdPool.freeCmds(this.updateBufferCmds);
            this.updateBufferCmds.clear();
        }

        if (this.copyBufferToTextureCmds.length) {
            allocator.copyBufferToTextureCmdPool.freeCmds(this.copyBufferToTextureCmds);
            this.copyBufferToTextureCmds.clear();
        }

        this.cmds.clear();
    }
}

export function WebGPUCmdFuncCreateBuffer (device: WebGPUDevice, gpuBuffer: IWebGPUGPUBuffer): void {
    const nativeDevice: GPUDevice = device.nativeDevice!;

    const bufferDesc = {} as GPUBufferDescriptor;
    bufferDesc.size = gpuBuffer.size;

    let bufferUsage = 0x0;
    if ((gpuBuffer.usage & BufferUsageBit.INDEX || gpuBuffer.usage & BufferUsageBit.VERTEX) && !(gpuBuffer.usage & BufferUsageBit.TRANSFER_DST)) {
        gpuBuffer.usage |= BufferUsageBit.TRANSFER_DST;
    }
    if (gpuBuffer.usage & BufferUsageBit.VERTEX) bufferUsage |= GPUBufferUsage.VERTEX;
    if (gpuBuffer.usage & BufferUsageBit.INDEX) bufferUsage |= GPUBufferUsage.INDEX;
    if (gpuBuffer.usage & BufferUsageBit.UNIFORM) bufferUsage |= GPUBufferUsage.UNIFORM;
    if (gpuBuffer.usage & BufferUsageBit.INDIRECT) bufferUsage |= GPUBufferUsage.INDIRECT;
    if (gpuBuffer.usage & BufferUsageBit.TRANSFER_SRC) bufferUsage |= GPUBufferUsage.COPY_SRC;
    if (gpuBuffer.usage & BufferUsageBit.TRANSFER_DST) bufferUsage |= GPUBufferUsage.COPY_DST;
    if (gpuBuffer.usage & BufferUsageBit.STORAGE) bufferUsage |= GPUBufferUsage.STORAGE;

    if (bufferUsage === 0x0) {
        warn('Unsupported GFXBufferType yet, create UNIFORM buffer in default.');
        bufferUsage |= GPUBufferUsage.UNIFORM;
    }

    if (!(bufferUsage & GPUBufferUsage.COPY_DST)) {
        bufferUsage |= GPUBufferUsage.COPY_DST;
    }
    bufferDesc.usage = bufferUsage;
    gpuBuffer.gpuTarget = bufferUsage;
    gpuBuffer.gpuBuffer = nativeDevice.createBuffer(bufferDesc);
}

export function WebGPUCmdFuncDestroyBuffer (device: WebGPUDevice, gpuBuffer: IWebGPUGPUBuffer): void {
    if (gpuBuffer.gpuBuffer) {
        gpuBuffer.gpuBuffer.destroy();
    }
}

export function WebGPUCmdFuncResizeBuffer (device: WebGPUDevice, gpuBuffer: IWebGPUGPUBuffer): void {
    WebGPUCmdFuncDestroyBuffer(device, gpuBuffer);
    WebGPUCmdFuncCreateBuffer(device, gpuBuffer);
}

export function WebGPUCmdFuncUpdateBuffer (
    device: WebGPUDevice,
    gpuBuffer: IWebGPUGPUBuffer,
    buffer: BufferSource,
    offset: number,
    size: number,
): void {
    if (gpuBuffer.usage & BufferUsageBit.INDIRECT) {
        gpuBuffer.indirects.length = offset;
        Array.prototype.push.apply(gpuBuffer.indirects, (buffer as IndirectBuffer).drawInfos);
    } else {
        const nativeDevice: GPUDevice = device.nativeDevice!;
        let buff = buffer as ArrayBuffer;
        let rawBuffer: ArrayBuffer;

        // arraybuffer size not equal to buff.bytelength, so new another array
        buff = buff.slice(0, size);

        if ('buffer' in buff) {
            // es-lint as any
            rawBuffer = (buff as any).buffer;
        } else {
            rawBuffer = buff;
        }

        if (rawBuffer.byteLength !== size) {
            rawBuffer = rawBuffer.slice(0, size);
        }
        // Buffer.gpubuffer may not able to be mapped directly, so staging buffer here.
        const stagingBuffer = nativeDevice.createBuffer({
            label: `staging buffer ${size}`,
            size,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        const mappedRange = stagingBuffer.getMappedRange();
        new Uint8Array(mappedRange).set(new Uint8Array(rawBuffer));
        stagingBuffer.unmap();
        const commandEncoder = nativeDevice.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(stagingBuffer, 0, gpuBuffer.gpuBuffer as GPUBuffer, offset, size);
        const commandBuffer = commandEncoder.finish();
        nativeDevice.queue.submit([commandBuffer]);
        stagingBuffer.destroy();
    }
}

export function WebGPUCmdFuncCreateTexture (device: WebGPUDevice, gpuTexture: IWebGPUTexture): void {
    // dimension optional
    gpuTexture.gpuTarget = GFXTextureToWebGPUTexture(gpuTexture.type);
    gpuTexture.gpuInternalFmt = GFXFormatToWGPUTextureFormat(gpuTexture.format);
    gpuTexture.gpuFormat = GFXFormatToWGPUFormat(gpuTexture.format);
    gpuTexture.gpuUsage = GFXTextureUsageToNative(gpuTexture.usage);
    gpuTexture.gpuWrapS = gpuTexture.isPowerOf2 ? 'repeat' : 'clamp-to-edge';
    gpuTexture.gpuWrapT = gpuTexture.isPowerOf2 ? 'repeat' : 'clamp-to-edge';
    gpuTexture.gpuMinFilter = 'linear';
    gpuTexture.gpuMagFilter = 'linear';
    // only 1 and 4 supported.
    gpuTexture.samples = Number(gpuTexture.samples) > 1 ? 4 : 1;
    const texDescriptor: GPUTextureDescriptor = {
        size: [gpuTexture.width, gpuTexture.height, gpuTexture.arrayLayer],
        mipLevelCount: gpuTexture.mipLevel,
        sampleCount: gpuTexture.samples,
        format: gpuTexture.gpuFormat,
        usage: gpuTexture.gpuUsage,
    };

    gpuTexture.gpuTexture = device.nativeDevice!.createTexture(texDescriptor);
}

export function WebGPUCmdFuncDestroyTexture (gpuTexture: IWebGPUTexture): void {
    if (gpuTexture.gpuTexture) {
        gpuTexture.gpuTexture.destroy();
    }
}

export function WebGPUCmdFuncResizeTexture (device: WebGPUDevice, gpuTexture: IWebGPUTexture): void {
    if (gpuTexture.gpuTexture) {
        WebGPUCmdFuncDestroyTexture(gpuTexture);
    }
    WebGPUCmdFuncCreateTexture(device, gpuTexture);
}

export function WebGPUCmdFuncCreateSampler (device: WebGPUDevice, gpuSampler: IWebGPUGPUSampler): void {
    const nativeDevice: GPUDevice = device.nativeDevice!;

    gpuSampler.gpuMinFilter = (gpuSampler.minFilter === Filter.LINEAR || gpuSampler.minFilter === Filter.ANISOTROPIC) ? 'linear' : 'nearest';
    gpuSampler.gpuMagFilter = (gpuSampler.magFilter === Filter.LINEAR || gpuSampler.magFilter === Filter.ANISOTROPIC) ? 'linear' : 'nearest';
    gpuSampler.gpuMipFilter = (gpuSampler.mipFilter === Filter.LINEAR || gpuSampler.mipFilter === Filter.ANISOTROPIC) ? 'linear' : 'nearest';
    gpuSampler.gpuWrapS = WebGPUAdressMode[gpuSampler.addressU];
    gpuSampler.gpuWrapT = WebGPUAdressMode[gpuSampler.addressV];
    gpuSampler.gpuWrapR = WebGPUAdressMode[gpuSampler.addressW];

    const samplerDesc = {} as GPUSamplerDescriptor;
    samplerDesc.addressModeU = gpuSampler.gpuWrapS;
    samplerDesc.addressModeV = gpuSampler.gpuWrapT;
    samplerDesc.addressModeW = gpuSampler.gpuWrapR;
    samplerDesc.minFilter = gpuSampler.gpuMinFilter;
    samplerDesc.magFilter = gpuSampler.gpuMagFilter;
    samplerDesc.mipmapFilter = gpuSampler.gpuMipFilter;
    samplerDesc.lodMinClamp = 0;// gpuSampler.minLOD;
    samplerDesc.lodMaxClamp = gpuSampler.mipLevel;// gpuSampler.maxLOD;
    if (WebGPUCompareFunc[gpuSampler.compare] !== 'always') {
        samplerDesc.compare = WebGPUCompareFunc[gpuSampler.compare];
    }
    samplerDesc.maxAnisotropy = gpuSampler.maxAnisotropy || 1;
    const sampler: GPUSampler = nativeDevice.createSampler(samplerDesc);
    gpuSampler.gpuSampler = sampler;
}

export function WebGPUCmdFuncDestroySampler (device: WebGPUDevice, gpuSampler: IWebGPUGPUSampler): void {
    if (gpuSampler.gpuSampler) {
        gpuSampler.gpuSampler = null;
    }
}

export function WebGPUCmdFuncDestroyFramebuffer (device: WebGPUDevice, gpuFramebuffer: IWebGPUGPUFramebuffer): void {
    if (gpuFramebuffer.gpuFramebuffer) {
        gpuFramebuffer.gpuFramebuffer.destroy();
        gpuFramebuffer.gpuFramebuffer = null;
    }
}

const copyTexToBufferDesc: GPUBufferDescriptor = {} as GPUBufferDescriptor;
const destArrayBuffer: ArrayBuffer[] = [];
export async function WebGPUCmdFuncCopyTextureToBuffer (
    device: WebGPUDevice,
    texture: IWebGPUTexture,
    buffers: ArrayBufferView[],
    regions: readonly BufferTextureCopy[],
): Promise<void> {
    let x = 0;
    let y = 0;
    let w = 1;
    let h = 1;
    const nativeDevice: GPUDevice = device.nativeDevice!;
    const commandEncoder = nativeDevice.createCommandEncoder({});
    const regionSize = regions.length;
    for (let k = 0; k < regionSize; k++) {
        if (destArrayBuffer[k]) {
            (buffers[k] as Uint8Array).set(new Uint8Array(destArrayBuffer[k]), 0);
        }
        copyTexToBufferDesc.size = buffers[k].byteLength;
        copyTexToBufferDesc.usage = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;

        const copyDestBuffer = nativeDevice.createBuffer(copyTexToBufferDesc);
        const region = regions[k];
        x = region.texOffset.x;
        y = region.texOffset.y;
        w = region.texExtent.width;
        h = region.texExtent.height;

        commandEncoder.copyTextureToBuffer({
            texture: texture.gpuTexture!,
            mipLevel: 0,
            origin: {
                x,
                y,
            },
        }, {
            buffer: copyDestBuffer,
            offset: 0,
            bytesPerRow: w * 4,
            rowsPerImage: h,
        }, {
            width: w,
            height: h,
        });

        nativeDevice.queue.submit([commandEncoder.finish()]);
        // eslint-disable-next-line no-await-in-loop
        await copyDestBuffer.mapAsync(GPUMapMode.READ);
        destArrayBuffer[k] = copyDestBuffer.getMappedRange();
        (buffers[k] as Uint8Array).set(new Uint8Array(destArrayBuffer[k]), 0);
    }
}

export const SEPARATE_SAMPLER_BINDING_OFFSET = 16;
function seperateCombinedSamplerTexture (shaderSource: string): string {
    // gather
    const samplerReg = /.*?(\(set = \d+, binding = )(\d+)\) uniform[^;]+sampler(\w*) (\w+);/g;
    let iter = samplerReg.exec(shaderSource);
    // samplerName, samplerType
    const referredMap = new Map<string, string>();
    while (iter) {
        const samplerName = iter[4];
        const samplerType = iter[3];
        referredMap.set(samplerName, samplerType);
        iter = samplerReg.exec(shaderSource);
    }

    let code = shaderSource;
    const sampReg = /.*?(\(set = \d+, binding = )(\d+)\) uniform[^;]+sampler(\w*) (\w+);/g;
    let it = sampReg.exec(code);
    while (it) {
        code = code.replace(sampReg, `layout$1 $2) uniform texture$3 $4;\n
        layout$1 $2 + ${SEPARATE_SAMPLER_BINDING_OFFSET}) uniform sampler $4_sampler;\n`);
        it = sampReg.exec(code);
    }

    const builtinSample = ['texture', 'textureSize', 'texelFetch', 'textureLod'];
    const replaceBultin = (samplerName: string, samplerType: string, target: string): string => {
        builtinSample.forEach((sampleFunc) => {
            const builtinSampleReg = new RegExp(`${sampleFunc}\\s*\\(\\s*${samplerName}\\s*,`);
            let builtinFuncIter = builtinSampleReg.exec(target);
            while (builtinFuncIter) {
                target = target.replace(builtinFuncIter[0], `${sampleFunc}(sampler${samplerType}(${samplerName}, ${samplerName}_sampler),`);
                builtinFuncIter = builtinSampleReg.exec(target);
            }
        });
        return target;
    };

    const funcReg = /\s([\S]+)\s*\(([\w\s,]+)\)[\s|\\|n]*{/g;
    let funcIter = funcReg.exec(code);
    const funcSet = new Set<string>();
    const paramTypeMap = new Map<string, string>();
    while (funcIter) {
        paramTypeMap.clear();

        const params = funcIter[2];
        let paramsRes = params.slice();
        if (params.includes('sampler')) {
            const paramIndexSet = new Set<number>();
            const paramArr = params.split(',');
            const paramSize = paramArr.length;
            for (let i = 0; i < paramSize; ++i) {
                const paramDecl = paramArr[i].split(' ');
                const typeDecl = paramDecl[paramDecl.length - 2];
                if (typeDecl.includes('sampler') && typeDecl !== 'sampler') {
                    const samplerType = typeDecl.replace('sampler', '');
                    const paramName = paramDecl[paramDecl.length - 1];
                    paramsRes = paramsRes.replace(paramArr[i], ` texture${samplerType} ${paramName}, sampler ${paramName}_sampler`);
                    paramIndexSet.add(i);
                    paramTypeMap.set(paramName, samplerType);
                }
            }

            code = code.replace(params, paramsRes);

            const funcName = funcIter[1];
            // function may overload
            if (!funcSet.has(funcName)) {
                const funcSamplerReg = new RegExp(`${funcName}\\s*?\\((\\s*[^;\\{]+)`, 'g');
                let matched;
                // eslint-disable-next-line no-cond-assign
                while ((matched = funcSamplerReg.exec(code)) !== null) {
                    if (!matched[1].match(/\b\w+\b\s*\b\w+\b/g)) {
                        const stripStr = matched[1][matched[1].length - 1] === ')' ? matched[1].slice(0, -1) : matched[1];
                        const params = stripStr.split(',');
                        let queued = 0; // '('
                        let paramIndex = 0;
                        const paramSize = params.length;
                        for (let i = 0; i < paramSize; ++i) {
                            if (params[i].includes('(')) {
                                ++queued;
                            }
                            if (params[i].includes(')')) {
                                --queued;
                            }

                            if (!queued || i === paramSize - 1) {
                                if (paramIndexSet.has(paramIndex)) {
                                    params[i] += `, ${params[i]}_sampler`;
                                }
                                ++paramIndex;
                            }
                        }
                        const newParams = params.join(',');
                        const newInvokeStr = matched[0].replace(stripStr, newParams);
                        code = code.replace(matched[0] as string, newInvokeStr as string);
                    }
                }
            }

            let count = 1;
            let startIndex = code.indexOf(funcIter[1], funcIter.index);
            startIndex = code.indexOf('{', startIndex) + 1;
            let endIndex = 0;
            while (count) {
                if (code.charAt(startIndex) === '{') {
                    ++count;
                } else if (code.charAt(startIndex) === '}') {
                    --count;
                }

                if (count === 0) {
                    endIndex = startIndex;
                    break;
                }

                const nextLeft = code.indexOf('{', startIndex + 1);
                const nextRight = code.indexOf('}', startIndex + 1);
                startIndex = nextLeft === -1 ? nextRight : Math.min(nextLeft, nextRight);
            }
            const funcBody = code.slice(funcIter.index, endIndex);
            let newFunc = funcBody;
            paramTypeMap.forEach((type, name) => {
                newFunc = replaceBultin(name, type, newFunc);
            });

            code = code.replace(funcBody, newFunc);
            funcSet.add(funcIter[1]);
        }
        funcIter = funcReg.exec(code);
    }

    referredMap.forEach((type, name) => {
        code = replaceBultin(name, type, code);
    });

    ///////////////////////////////////////////////////////////
    // isNan, isInf has been removed in dawn:tint

    let functionDefs = '';
    const precisionKeyWord = 'highp';
    const isNanIndex = code.indexOf('isnan');
    if (isNanIndex !== -1) {
        // getPrecision(isNanIndex);
        functionDefs += `\n
         bool isNan(${precisionKeyWord} float val) {
             return (val < 0.0 || 0.0 < val || val == 0.0) ? false : true;
         }
         \n`;
        code = code.replace(/isnan\(/gi, 'isNan(');
    }

    const isInfIndex = code.indexOf('isinf');
    if (isInfIndex !== -1) {
        // getPrecision(isInfIndex);
        functionDefs += `\n
         bool isInf(${precisionKeyWord} float x) {
             return x == x * 2.0 && x != 0.0;
         }
         \n`;
        code = code.replace(/isinf\(/gi, 'isInf(');
    }

    ///////////////////////////////////////////////////////////

    let firstPrecisionIdx = code.indexOf('precision');
    firstPrecisionIdx = code.indexOf(';', firstPrecisionIdx);
    firstPrecisionIdx += 1;
    code = `${code.slice(0, firstPrecisionIdx)}\n${functionDefs}\n${code.slice(firstPrecisionIdx)}`;

    return code;
}

function reflect (wgsl: string[]): number[][] {
    const bindingList: number[][] = [];
    for (const wgslStr of wgsl) {
        // @group(1) @binding(0) var<uniform> x_78 : Constants;
        // @group(1) @binding(1) var albedoMap : texture_2d<f32>;
        const reg = /@group\((\d)\)\s+@binding\((\d+)\)/g;
        let iter = reg.exec(wgslStr);
        while (iter) {
            const set = +iter[1];
            const binding = +iter[2];
            while (bindingList.length <= set) {
                bindingList.push([]);
            }
            bindingList[set][bindingList[set].length] = binding;
            iter = reg.exec(wgslStr);
        }
    }
    return bindingList;
}

interface ClearPassData {
    vertShader: GPUShaderModule | null;
    fragShader: GPUShaderModule | null;
    bindGroupLayout: GPUBindGroupLayout | null;
    pipelineLayout: GPUPipelineLayout | null;
    pipeline: GPURenderPipeline | null;
}
const clearPassData: ClearPassData = {
    vertShader: null,
    fragShader: null,
    bindGroupLayout: null,
    pipelineLayout: null,
    pipeline: null,
};
export function clearRect (device: WebGPUDevice, texture: IWebGPUTexture, renderArea: Rect, color: Color): void {
    const format = texture.gpuTexture!.format;
    const dimension = texture.gpuTarget;
    const nativeDevice = device.nativeDevice!;
    if (!clearPassData.vertShader) {
        const clearQuadVert = `
        struct VertexOutput {
            @builtin(position) Position: vec4<f32>,
        }

        @vertex
        fn main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
            var pos = array<vec2<f32>, 6>(
            vec2<f32>(1.0, 1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(1.0, 1.0),
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(-1.0, 1.0)
            );

            var output: VertexOutput;
            output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
            return output;
        }
        `;

        const clearQuadFrag = `
        struct ClearColor {
            color: vec4<f32>,
        }

        @group(0) @binding(0) var<uniform> uClearColor: ClearColor;

        @fragment
        fn main() -> @location(0) vec4<f32> {
            return uClearColor.color;
        }
        `;
        const vertShaderModule = nativeDevice.createShaderModule({ code: clearQuadVert });
        const fragShaderModule = nativeDevice.createShaderModule({ code: clearQuadFrag });
        clearPassData.vertShader = vertShaderModule;
        clearPassData.fragShader = fragShaderModule;

        const bufferEntry: GPUBindGroupLayoutEntry = {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
                hasDynamicOffset: false,
                minBindingSize: 16,
            },
        };
        const bgLayoutDesc: GPUBindGroupLayoutDescriptor = {
            label: 'clearPassBGLayout',
            entries: [bufferEntry],
        };

        const bindGroupLayout = nativeDevice.createBindGroupLayout(bgLayoutDesc);
        clearPassData.bindGroupLayout = bindGroupLayout;

        const pipelineLayoutDesc: GPUPipelineLayoutDescriptor = {
            label: 'clearPassPipelineLayout',
            bindGroupLayouts: [clearPassData.bindGroupLayout],
        };

        const pipelineLayout = nativeDevice.createPipelineLayout(pipelineLayoutDesc);
        clearPassData.pipelineLayout = pipelineLayout;

        const vertexState: GPUVertexState = {
            module: clearPassData.vertShader,
            entryPoint: 'main',
        };

        const primitiveState: GPUPrimitiveState = {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none',
        };
        const colorState: GPUColorTargetState = {
            format,
            writeMask: 0xF,
        };

        const fragState: GPUFragmentState = {
            module: clearPassData.fragShader,
            entryPoint: 'main',
            targets: [colorState],
        };
        const multisample: GPUMultisampleState = {
            count: 1,
            alphaToCoverageEnabled: false,
            mask: 0xFFFFFFFF,
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            label: 'clearPassPipeline',
            layout: clearPassData.pipelineLayout,
            vertex: vertexState,
            primitive: primitiveState,
            fragment: fragState,
            multisample,
        };
        const pipeline = nativeDevice.createRenderPipeline(pipelineDesc);
        clearPassData.pipeline = pipeline;
    }
    const commandEncoder: GPUCommandEncoder = nativeDevice.createCommandEncoder();
    const desc: GPUTextureViewDescriptor = {
        format,
        dimension: '2d',
        baseMipLevel: 0,
        mipLevelCount: 1,
        baseArrayLayer: 0,
        arrayLayerCount: 1,
        aspect: 'all',
    };
    const dstView = texture.gpuTexture?.createView(desc);
    const bufferDesc: GPUBufferDescriptor = {
        usage: GPUBufferUsage.UNIFORM,
        size: 16,
        mappedAtCreation: true,
    };

    const uniformBuffer = nativeDevice.createBuffer(bufferDesc);
    const colorArr: number[] = [color.x, color.y, color.z, color.w];

    const mappedBuffer = uniformBuffer.getMappedRange(0, 16);
    const f32 = new Float32Array(mappedBuffer);
    f32.set(colorArr);
    uniformBuffer.unmap();

    const entry: GPUBindGroupEntry = {
        binding: 0,
        resource: {
            buffer: uniformBuffer,
            offset: 0,
            size: 16,
        },
    };

    const bindgroupDesc: GPUBindGroupDescriptor = {
        layout: clearPassData.bindGroupLayout!,
        entries: [entry],
    };
    const bindGroup = nativeDevice.createBindGroup(bindgroupDesc);
    const colorAttachment: GPURenderPassColorAttachment = {
        view: dstView!,
        loadOp: 'load',
        storeOp: 'store',
        clearValue: [0.88, 0.88, 0.88, 1.0],
    };

    const rpDesc: GPURenderPassDescriptor = {
        colorAttachments: [colorAttachment],
    };

    const renderPassEncoder = commandEncoder.beginRenderPass(rpDesc);
    renderPassEncoder.setPipeline(clearPassData.pipeline!);

    renderPassEncoder.setBindGroup(0, bindGroup);
    renderPassEncoder.setViewport(renderArea.x, renderArea.y, renderArea.width, renderArea.height, 0.0, 1.0);
    renderPassEncoder.setScissorRect(renderArea.x, renderArea.y, renderArea.width, renderArea.height);
    renderPassEncoder.draw(6, 1, 0, 0);

    renderPassEncoder.end();
    const commandBuffer = commandEncoder.finish();
    nativeDevice.queue.submit([commandBuffer]);
    uniformBuffer.destroy();
}

function findEmployAttr (stage: IWebGPUGPUShaderStage): void {
    if (stage.type !== ShaderStageFlagBit.VERTEX) {
        return;
    }
    const locationRegex = /@location\(\d+\)[ ]+\w+/g;
    const matches = stage.source.match(locationRegex);
    if (!matches) {
        return;
    }
    let idx = 0;
    matches.forEach((match) => {
        const locRegex = /@location\((\d+)\)/g;
        const matchLoc = match.match(locRegex)!;
        const location = matchLoc[0].slice(matchLoc[0].indexOf('(') + 1, matchLoc[0].indexOf(')')).trim();
        const locNameRegex = /@location\(\d+\)/;
        const locName = match.replace(locNameRegex, '').trim();
        const rmvLocRegex = new RegExp(`,*[ ]*@location\\(\\d+\\)[ ]+${locName}+\\b\\s*:\\s*\\w+\\<\\w+\\>\\s*`);
        const equalAttr = new RegExp(`\\b(\\w+)\\s*=[ ]*${locName}\\b\\s*;`, 'g');
        const targetVar = stage.source.match(equalAttr)!;
        const targetVarName = targetVar[0];
        const searchTarVarName = targetVarName.slice(0, targetVarName.indexOf('=')).trim();
        const matchCountRegex = new RegExp(`\\.*\\b${searchTarVarName}\\b\\.*`, 'g');
        const matchesCount = stage.source.match(matchCountRegex);
        const usageCount = matchesCount ? matchesCount.length : 0;
        if (usageCount <= 2) {
            stage.source = stage.source.replace(rmvLocRegex, '');
            stage.source = stage.source.replace(equalAttr, '');
            const varNameReg = new RegExp(`var\\<\\w+\\>\\s+${searchTarVarName}+\\s*:\\s*\\w+\\<\\w+\\>\\s*;`);
            stage.source = stage.source.replace(varNameReg, '');
        } else {
            stage.attrs.set(parseInt(location), locName);
        }
        idx++;
    });
}

export function WebGPUCmdFuncCreateGPUShader (device: WebGPUDevice, gpuShader: IWebGPUGPUShader): void {
    const nativeDevice = device.nativeDevice!;
    const glslang = device.glslang;
    const twgsl = device.twgsl;
    const wgslCodes: string[] = [];
    const stageSize = gpuShader.gpuStages.length;
    for (let i = 0; i < stageSize; ++i) {
        wgslCodes.length = 0;
        const gpuStage = gpuShader.gpuStages[i];
        const glslSource = seperateCombinedSamplerTexture(gpuStage.source);
        const stageStr = gpuStage.type === ShaderStageFlagBit.VERTEX ? 'vertex'
            : gpuStage.type === ShaderStageFlagBit.FRAGMENT ? 'fragment' : 'compute';
        const sourceCode = `#version 450\n#define CC_USE_WGPU 1\n${glslSource}`;
        const spv = glslang.compileGLSL(sourceCode, stageStr, false, '1.3');

        let wgsl: string = twgsl.convertSpirV2WGSL(spv);
        if (wgsl === '') {
            error('empty wgsl');
        }
        gpuStage.source = wgsl;
        findEmployAttr(gpuStage);
        wgsl = gpuStage.source;
        const shader: GPUShaderModule = nativeDevice?.createShaderModule({ code: wgsl });
        // eslint-disable-next-line no-loop-func
        shader.getCompilationInfo().then((compileInfo: GPUCompilationInfo) => {
            compileInfo.messages.forEach((info) => {
                log(sourceCode, wgsl, info.lineNum, info.linePos, info.type, info.message);
            });
        // eslint-disable-next-line no-loop-func
        }).catch((compileInfo: GPUCompilationInfo) => {
            compileInfo.messages.forEach((info) => {
                log(sourceCode, wgsl, info.lineNum, info.linePos, info.type, info.message);
            });
        });
        const shaderStage: GPUProgrammableStage = {
            module: shader,
            entryPoint: 'main',
        };
        gpuStage.gpuShader = shaderStage;
        wgslCodes.push(wgsl);
        const bindingList = reflect(wgslCodes);
        gpuStage.bindings = bindingList;
        const bindingListSize = bindingList.length;
        for (let s = 0; s < bindingListSize; s++) {
            const currBindingSize = bindingList[s].length;
            if (currBindingSize) {
                if (!gpuShader.bindings.has(s)) {
                    gpuShader.bindings.set(s, []);
                }
                const bindings = gpuShader.bindings.get(s)!;
                for (let b = 0; b < currBindingSize; b++) {
                    if (!bindings.includes(bindingList[s][b])) {
                        bindings.push(bindingList[s][b]);
                    }
                }
            }
        }
    }
}

export function WebGPUCmdFuncDestroyShader (device: WebGPUDevice, gpuShader: IWebGPUGPUShader): void {
    if (gpuShader.gpuProgram) {
        gpuShader.gpuProgram = null;
    }
}

export function WebGPUCmdFuncCreateInputAssember (device: WebGPUDevice, gpuInputAssembler: IWebGPUGPUInputAssembler): void {
    const attrSize = gpuInputAssembler.attributes.length;
    gpuInputAssembler.gpuAttribs = new Array<IWebGPUAttrib>(attrSize);

    const offsets = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < attrSize; ++i) {
        const attrib = gpuInputAssembler.attributes[i];

        const stream = attrib.stream !== undefined ? attrib.stream : 0;

        const gpuBuffer = gpuInputAssembler.gpuVertexBuffers[stream];

        const gpuType = 0;
        const size = FormatInfos[attrib.format].size;

        gpuInputAssembler.gpuAttribs[i] = {
            name: attrib.name,
            gpuBuffer: gpuBuffer.gpuBuffer,
            gpuType,
            size,
            count: FormatInfos[attrib.format].count,
            stride: gpuBuffer.stride,
            componentCount: 4,
            isNormalized: (attrib.isNormalized !== undefined ? attrib.isNormalized : false),
            isInstanced: (attrib.isInstanced !== undefined ? attrib.isInstanced : false),
            offset: offsets[stream],
        };

        offsets[stream] += size;
    }
}

export function WebGPUCmdFuncDestroyInputAssembler (device: WebGPUDevice, gpuInputAssembler: IWebGPUGPUInputAssembler): void {
    // noop
}

interface IWebGPUStateCache {
    gpuPipelineState: IWebGPUGPUPipelineState | null;
    gpuInputAssembler: IWebGPUGPUInputAssembler | null;
    reverseCW: boolean;
    gpuPrimitive: GPUPrimitiveTopology;
    invalidateAttachments: number[];
}

function maxElementOfImageArray (bufInfoArr: BufferTextureCopy[]): number {
    let maxSize = 0;
    const bufInfoSize = bufInfoArr.length;
    for (let i = 0; i < bufInfoSize; i++) {
        const curSize = bufInfoArr[i].texExtent.width * bufInfoArr[i].texExtent.height * bufInfoArr[i].texExtent.depth;
        maxSize = maxSize < curSize ? curSize : maxSize;
    }
    return maxSize;
}

export function WebGPUCmdFuncCopyTexImagesToTexture (
    device: WebGPUDevice,
    texImages: TexImageSource[],
    gpuTexture: IWebGPUTexture,
    regions: BufferTextureCopy[],
): void {
    // name all native webgpu resource nativeXXX distinguished from gpuTexture passed in.
    const nativeDevice = device.nativeDevice!;
    const regionSize = regions.length;
    for (let i = 0; i < regionSize; i++) {
        const region = regions[i];
        const texImg = texImages[i];
        nativeDevice.queue.copyExternalImageToTexture(
            { source: texImg },
            {
                texture: gpuTexture.gpuTexture!,
                mipLevel: region.texSubres.mipLevel,
                origin: {
                    x: region.texOffset.x,
                    y: region.texOffset.y,
                    z: region.texSubres.baseArrayLayer,
                },
            },
            [regions[i].texExtent.width, regions[i].texExtent.height, regions[i].texExtent.depth],
        );
    }
    if (gpuTexture.flags & TextureFlagBit.GEN_MIPMAP) {
        genMipMap(device, gpuTexture, 1, gpuTexture.mipLevel - 1, 0);
    }
}

const GFXSampleTypeToGPUTextureSampleType: GPUTextureSampleType[] = [
    'float',
    'unfilterable-float',
    'sint',
    'uint',
];

const GFXViewDimensionToGPUViewDimension: GPUTextureViewDimension[] = [
    '2d',
    '2d',
    '1d',
    '1d',
    '2d',
    '2d-array',
    '2d',
    '2d-array',
    '3d',
    'cube',
    'cube-array',
    '2d',
];

const GFXMemoryAccessToGPUStorageTextureAccess: (GPUStorageTextureAccess | undefined)[] = [
    'read-only',
    'read-only',
    'write-only',
    'read-write',
];

export function createBindGroupLayoutEntry (currBind: DescriptorSetLayoutBinding): GPUBindGroupLayoutEntry[] {
    const binding = currBind.binding;
    // Define the mapping from ShaderStageFlagBit to GPUShaderStage
    const gpuVisibility = GFXStageToWebGPUStage(currBind.stageFlags);
    const entrys: GPUBindGroupLayoutEntry[] = [];
    const entry: GPUBindGroupLayoutEntry = {
        binding,
        visibility: gpuVisibility,
    };
    entrys.push(entry);
    let entrySampler: GPUBindGroupLayoutEntry | null = null;
    const samplerType = GFXSampleTypeToGPUTextureSampleType[currBind.sampleType];
    const isTexUnFilter = samplerType === 'unfilterable-float';
    const viewDimension = GFXViewDimensionToGPUViewDimension[currBind.viewDimension];
    const type = currBind.descriptorType;
    const multisampled = currBind.viewDimension > 5 && currBind.viewDimension < 8;
    switch (type) {
    case DescriptorType.UNIFORM_BUFFER:
    case DescriptorType.DYNAMIC_UNIFORM_BUFFER:
        entry.buffer = {
            type: 'uniform',
            hasDynamicOffset: type === DescriptorType.DYNAMIC_UNIFORM_BUFFER,
            minBindingSize: undefined,
        };
        break;

    case DescriptorType.STORAGE_BUFFER:
    case DescriptorType.DYNAMIC_STORAGE_BUFFER:
        entry.buffer = {
            type: 'storage',
            hasDynamicOffset: type === DescriptorType.DYNAMIC_STORAGE_BUFFER,
            minBindingSize: undefined,
        };
        break;

    case DescriptorType.SAMPLER_TEXTURE:
        // Assuming this is a combined image sampler
        entry.texture = {
            sampleType: samplerType, // or 'unfilterable-float', 'depth', 'sint', 'uint'
            viewDimension, // 2d or 'cube', '3d', '1d'
            multisampled,
        };
        entrySampler = {
            binding: binding + SEPARATE_SAMPLER_BINDING_OFFSET,
            visibility: gpuVisibility,
        };
        entrySampler.sampler = {
            type: isTexUnFilter ? 'non-filtering' : 'filtering', // or 'non-filtering', 'comparison'
        };
        entrys.push(entrySampler);
        break;

    case DescriptorType.SAMPLER:
        entry.sampler = {
            type: isTexUnFilter ? 'non-filtering' : 'filtering', // or 'non-filtering', 'comparison'
        };
        break;

    case DescriptorType.TEXTURE:
        entry.texture = {
            sampleType: samplerType, // or 'unfilterable-float', 'depth', 'sint', 'uint'
            viewDimension, // or 'cube', '3d', '1d'
            multisampled,
        };
        break;

    case DescriptorType.STORAGE_IMAGE:
        entry.storageTexture = {
            access: GFXMemoryAccessToGPUStorageTextureAccess[currBind.access], // or 'read-only', 'read-write'
            format: GFXFormatToWGPUFormat(currBind.format), // Choose the appropriate texture format
            viewDimension, // or 'cube', '3d', '1d'
        };
        break;

    case DescriptorType.INPUT_ATTACHMENT:
        entry.texture = {
            sampleType: samplerType, // or 'unfilterable-float', 'depth', 'sint', 'uint'
            viewDimension, // or 'cube', '3d', '1d'
            multisampled,
        };
        break;

    default:
        throw new Error(`Unsupported descriptor type: ${type}`);
    }
    return entrys;
}

export function TextureSampleTypeTrait (format: Format): GPUTextureSampleType {
    // See https://gpuweb.github.io/gpuweb/#texture-format-caps
    switch (format) {
    case Format.R8:
    case Format.R8SN:
    case Format.RG8:
    case Format.RGBA8:
    case Format.BGRA8:
    case Format.RG8SN:
    case Format.SRGB8_A8:
    case Format.RGB10A2:
    case Format.RGBA16F:
        return 'float';
    case Format.R8UI:
    case Format.R16UI:
    case Format.RG8UI:
    case Format.R32UI:
    case Format.RG16UI:
    case Format.RGBA8UI:
    case Format.RG32UI:
    case Format.RGBA32UI:
    case Format.RGBA16UI:
    case Format.DEPTH_STENCIL:
        return 'uint';
    case Format.R8I:
    case Format.R16I:
    case Format.RG8I:
    case Format.RG16I:
    case Format.RGBA8I:
    case Format.RG32I:
    case Format.RGBA16I:
    case Format.RGBA32I:
    case Format.R32I:
        return 'sint';
    case Format.R16F:
    case Format.R32F:
    case Format.RG16F:
    case Format.R11G11B10F:
    case Format.RG32F:
    case Format.RGBA32F:
        return 'unfilterable-float';
    case Format.DEPTH:
        return 'depth';
    default:
        warn('Unsupported texture sample type yet. Please refer to the documentation for supported formats.');
        return 'float';
    }
}

export function FormatToWGPUFormatType (format: Format): GPUTextureSampleType {
    if (format === Format.DEPTH_STENCIL) {
        return 'unfilterable-float';
    }
    return TextureSampleTypeTrait(format);
}

interface MipmapPassData {
    vertShader: GPUShaderModule;
    fragShader: GPUShaderModule;
    sampler: GPUSampler;
    bindGroupLayout: GPUBindGroupLayout;
    pipelineLayout: GPUPipelineLayout;
    pipeline: GPURenderPipeline;
}

let mipmapData: MipmapPassData;

function genMipMap (device: WebGPUDevice, texture: IWebGPUTexture, fromLevel: number, levelCount: number, baseLayer: number): void {
    const format = texture.gpuFormat;
    const dimension = texture.gpuTarget;
    const nativeDevice = device.nativeDevice!;
    if (!mipmapData) {
        mipmapData = {} as any;
        const texQuadVert = `
        struct VertexOutput {
            @builtin(position) Position : vec4<f32>,
            @location(0) fragUV : vec2<f32>,
          }

          @vertex
          fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
            var pos = array<vec2<f32>, 6>(
              vec2<f32>( 1.0,  1.0),
              vec2<f32>( 1.0, -1.0),
              vec2<f32>(-1.0, -1.0),
              vec2<f32>( 1.0,  1.0),
              vec2<f32>(-1.0, -1.0),
              vec2<f32>(-1.0,  1.0)
            );

            var uv = array<vec2<f32>, 6>(
              vec2<f32>(1.0, 0.0),
              vec2<f32>(1.0, 1.0),
              vec2<f32>(0.0, 1.0),
              vec2<f32>(1.0, 0.0),
              vec2<f32>(0.0, 1.0),
              vec2<f32>(0.0, 0.0)
            );

            var output : VertexOutput;
            output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
            output.fragUV = uv[VertexIndex];
            return output;
          }
        `;
        const texQuadFrag = `
        @group(0) @binding(0) var mySampler : sampler;
        @group(0) @binding(1) var myTexture : texture_2d<f32>;

        @fragment
        fn frag_main(@location(0) fragUV : vec2<f32>) -> @location(0) vec4<f32> {
        return textureSample(myTexture, mySampler, fragUV);
        }
        `;

        const samplerDesc: GPUSamplerDescriptor = {};
        samplerDesc.label = 'filterSampler';
        samplerDesc.addressModeU = 'mirror-repeat';
        samplerDesc.addressModeV = 'mirror-repeat';
        samplerDesc.addressModeW = 'mirror-repeat';
        samplerDesc.magFilter = 'linear';
        samplerDesc.minFilter = 'linear';
        samplerDesc.mipmapFilter = 'linear';
        samplerDesc.lodMinClamp = 0.0;
        samplerDesc.lodMaxClamp = 32.0;
        samplerDesc.maxAnisotropy = 1;
        mipmapData.sampler = nativeDevice.createSampler(samplerDesc);

        const shaderDescVert: GPUShaderModule = nativeDevice.createShaderModule({
            code: texQuadVert,
        });
        mipmapData.vertShader = shaderDescVert;
        const shaderDescFrag: GPUShaderModule = nativeDevice.createShaderModule({
            code: texQuadFrag,
        });
        mipmapData.fragShader = shaderDescFrag;

        const samplerEntry: GPUBindGroupLayoutEntry = {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
                type: 'filtering',
            },
        };

        const textureEntry: GPUBindGroupLayoutEntry = {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: TextureSampleTypeTrait(texture.format),
                viewDimension: '2d',
                multisampled: false,
            },
        };

        const bgLayoutDesc: GPUBindGroupLayoutDescriptor = {
            label: 'fullscreenTexturedQuadBGLayout',
            entries: [samplerEntry, textureEntry],
        };

        const bindGroupLayout = nativeDevice.createBindGroupLayout(bgLayoutDesc);
        mipmapData.bindGroupLayout = bindGroupLayout;

        const pipelineLayoutDesc: GPUPipelineLayoutDescriptor = {
            label: 'fullscreenTexturedQuadPipelineLayout',
            bindGroupLayouts: [bindGroupLayout],
        };

        const pipelineLayout = nativeDevice.createPipelineLayout(pipelineLayoutDesc);
        mipmapData.pipelineLayout = pipelineLayout;

        const vertexState: GPUVertexState = {
            module: mipmapData.vertShader,
            entryPoint: 'vert_main',
            buffers: [],
        };

        const primitiveState: GPUPrimitiveState = {
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'none',
        };

        const colorState: GPUColorTargetState = {
            format,
            writeMask: 0xF,
        };

        const fragState: GPUFragmentState = {
            module: mipmapData.fragShader,
            entryPoint: 'frag_main',
            targets: [colorState],
        };

        const multisample: GPUMultisampleState = {
            count: 1,
            alphaToCoverageEnabled: false,
            mask: 0xFFFFFFFF,
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            label: 'fullscreenTexturedQuadPipeline',
            layout: pipelineLayout,
            vertex: vertexState,
            primitive: primitiveState,
            fragment: fragState,
            multisample,
        };
        const pipeline = nativeDevice.createRenderPipeline(pipelineDesc);
        mipmapData.pipeline = pipeline;
    }

    const desc: GPUTextureViewDescriptor = {
        format,
        dimension: '2d',
        baseMipLevel: fromLevel,
        mipLevelCount: 1,
        baseArrayLayer: baseLayer,
        arrayLayerCount: 1,
        aspect: 'all',
    };

    const commandEncoder: GPUCommandEncoder = nativeDevice.createCommandEncoder();

    for (let i = fromLevel; i < fromLevel + levelCount; ++i) {
        desc.baseMipLevel = i - 1;
        const srcView: GPUTextureView = texture.gpuTexture!.createView(desc);
        desc.baseMipLevel = i;
        desc.baseArrayLayer = baseLayer;
        desc.arrayLayerCount = 1;
        const dstView: GPUTextureView = texture.gpuTexture!.createView(desc);

        const entries: GPUBindGroupEntry[] = [
            {
                binding: 0,
                resource: mipmapData.sampler,
            },
            {
                binding: 1,
                resource: srcView,
            },
        ];

        const bindgroupDesc: GPUBindGroupDescriptor = {
            layout: mipmapData.bindGroupLayout,
            entries,
        };

        const bindGroup: GPUBindGroup = nativeDevice.createBindGroup(bindgroupDesc);

        const colorAttachment: GPURenderPassColorAttachment = {
            view: dstView,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: [0.88, 0.88, 0.88, 1.0],
        };

        const rpDesc: GPURenderPassDescriptor = {
            colorAttachments: [colorAttachment],
        };

        const renderPassEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass(rpDesc);
        renderPassEncoder.setPipeline(mipmapData.pipeline);
        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.draw(6, 1, 0, 0);
        renderPassEncoder.end();
    }

    const commandBuffer = commandEncoder.finish();
    nativeDevice.queue.submit([commandBuffer]);
}

export function WebGPUCmdFuncCopyBuffersToTexture (
    device: WebGPUDevice,
    buffers: ArrayBufferView[],
    gpuTexture: IWebGPUTexture,
    regions: BufferTextureCopy[],
): void {
    const nativeDevice = device.nativeDevice!;
    const dstFormat = gpuTexture.format;
    const blockSize = formatAlignment(dstFormat);
    const regionSize = regions.length;
    for (let i = 0; i < regionSize; ++i) {
        const region = regions[i];
        const bufferPixelWidth = region.buffStride > 0 ? region.buffStride : region.texExtent.width;
        const bufferPixelHeight = region.buffTexHeight > 0 ? region.buffTexHeight : region.texExtent.height;
        const bytesPerRow = FormatSize(dstFormat, region.texExtent.width, 1, 1);
        const bufferBytesPerRow = FormatSize(dstFormat, bufferPixelWidth, 1, 1);
        const bufferBytesPerImageSlice = FormatSize(dstFormat, bufferPixelWidth, bufferPixelHeight, 1);
        const bufferBytesPerImageLayer = FormatSize(dstFormat, bufferPixelWidth, bufferPixelHeight, region.texExtent.depth);
        const targetWidth = region.texExtent.width === 0 ? 0 : alignTo(region.texExtent.width, blockSize.width);
        const targetHeight = region.texExtent.height === 0 ? 0 : alignTo(region.texExtent.height, blockSize.height);
        const imgDataLayout: GPUImageDataLayout = {
            offset: 0,
            bytesPerRow: bufferBytesPerRow,
            rowsPerImage: bufferPixelHeight,
        };
        const compactInWidth = bufferPixelWidth === region.texExtent.width;
        for (let l = region.texSubres.baseArrayLayer; l < region.texSubres.layerCount + region.texSubres.baseArrayLayer; l++) {
            for (let d = region.texOffset.z; d < region.texExtent.depth + region.texOffset.z; d++) {
                if (compactInWidth) {
                    const arrayBuffer: ArrayBufferView | ArrayBufferLike = buffers[i];
                    let buffer: Uint8Array; // buffers and regions are a one-to-one mapping
                    if ('buffer' in arrayBuffer) {
                        buffer = new Uint8Array(arrayBuffer.buffer, arrayBuffer.byteOffset, arrayBuffer.byteLength);
                    } else {
                        buffer = new Uint8Array(arrayBuffer);
                    }
                    const srcData = new Uint8Array(buffer, buffer.byteOffset
                        + region.buffOffset
                        + (l - region.texSubres.baseArrayLayer) * bufferBytesPerImageLayer
                        + (d - region.texOffset.z) * bufferBytesPerImageSlice);
                    const copyTarget = {
                        texture: gpuTexture.gpuTexture!,
                        mipLevel: region.texSubres.mipLevel,
                        origin: {
                            x: region.texOffset.x,
                            y: region.texOffset.y,
                            z: l,
                        },
                    };
                    nativeDevice.queue.writeTexture(copyTarget, srcData, imgDataLayout, [targetWidth, targetHeight, region.texExtent.depth]);
                } else {
                    for (let h = region.texOffset.y; h < region.texExtent.height + region.texOffset.y; h += blockSize.height) {
                        const srcData = new Uint8Array(buffers[i].buffer, buffers[i].byteOffset
                            + region.buffOffset + (l - region.texSubres.baseArrayLayer) * bufferBytesPerImageLayer
                            + ((d - region.texOffset.z) * bufferBytesPerImageSlice
                            + (h - region.texOffset.y) / blockSize.height * bufferBytesPerRow));
                        const copyTarget = {
                            texture: gpuTexture.gpuTexture!,
                            mipLevel: region.texSubres.mipLevel,
                            origin: {
                                x: region.texOffset.x,
                                y: h,
                                z: l,
                            },
                        };
                        nativeDevice.queue.writeTexture(copyTarget, srcData, imgDataLayout, [targetWidth, blockSize.height, region.texExtent.depth]);
                    }
                }
            }
            if (gpuTexture.flags & TextureFlagBit.GEN_MIPMAP) {
                genMipMap(device, gpuTexture, 1, gpuTexture.mipLevel - 1, 0);
            }
        }
    }
}
