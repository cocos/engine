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

import { fetchUrl } from 'pal/wasm';
import glslangUrl from 'external:emscripten/webgpu/glslang.wasm';
import twgslUrl from 'external:emscripten/webgpu/twgsl.wasm';
import glslangLoader from 'external:emscripten/webgpu/glslang.js';
import twgslLoader from 'external:emscripten/webgpu/twgsl.js';
import { DescriptorSet } from '../base/descriptor-set';
import { Buffer } from '../base/buffer';
import { CommandBuffer } from '../base/command-buffer';
import { Device } from '../base/device';
import { Framebuffer } from '../base/framebuffer';
import { InputAssembler } from '../base/input-assembler';
import { PipelineState, PipelineStateInfo } from '../base/pipeline-state';
import { Queue } from '../base/queue';
import { RenderPass } from '../base/render-pass';
import { Sampler } from '../base/states/sampler';
import { Shader } from '../base/shader';
import { PipelineLayout } from '../base/pipeline-layout';
import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { Texture } from '../base/texture';
import { WebGPUDescriptorSet } from './webgpu-descriptor-set';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUCommandBuffer } from './webgpu-command-buffer';
import { WebGPUFramebuffer } from './webgpu-framebuffer';
import { WebGPUInputAssembler } from './webgpu-input-assembler';
import { WebGPUDescriptorSetLayout } from './webgpu-descriptor-set-layout';
import { WebGPUPipelineLayout } from './webgpu-pipeline-layout';
import { WebGPUPipelineState } from './webgpu-pipeline-state';
import { WebGPUQueue } from './webgpu-queue';
import { WebGPURenderPass } from './webgpu-render-pass';
import { WebGPUSampler } from './webgpu-sampler';
import { WebGPUShader } from './webgpu-shader';
import { WebGPUStateCache } from './webgpu-state-cache';
import { WebGPUTexture } from './webgpu-texture';
import { DefaultResources, DescUpdateFrequency, hashCombineNum, hashCombineStr, WebGPUDeviceManager } from './define';
import {
    Filter, Format,
    QueueType, Feature, BufferTextureCopy, Rect, DescriptorSetInfo,
    BufferInfo, BufferViewInfo, CommandBufferInfo, DeviceInfo, BindingMappingInfo,
    FramebufferInfo, InputAssemblerInfo, QueueInfo, RenderPassInfo, SamplerInfo,
    ShaderInfo, PipelineLayoutInfo, DescriptorSetLayoutInfo, TextureInfo, TextureViewInfo, GeneralBarrierInfo, TextureBarrierInfo,
    SwapchainInfo,
    BufferBarrierInfo,
    API,
    FormatFeatureBit,
    FormatFeature,
    TextureType,
    TextureUsageBit,
    TextureFlagBit,
    SampleCount,
    BufferUsageBit,
    MemoryUsageBit,
    BufferFlagBit,
    DescriptorSetLayoutBinding,
    DescriptorType,
    ShaderStageFlagBit,
} from '../base/define';
import { WebGPUCommandAllocator } from './webgpu-command-allocator';
import { GeneralBarrier } from '../base/states/general-barrier';
import { TextureBarrier } from '../base/states/texture-barrier';
import { BufferBarrier } from '../base/states/buffer-barrier';
import { Swapchain } from '../base/swapchain';
import { WebGPUSwapchain } from './webgpu-swapchain';

import { IWebGPUBindingMapping, IWebGPUGPUBuffer as IWebGPUBuffer, IWebGPUGPUSampler as IWebGPUSampler, IWebGPUTexture } from './webgpu-gpu-objects';
import { debug, warn } from '../../core';
import { WebGPUCmdFuncCopyBuffersToTexture, WebGPUCmdFuncCopyTexImagesToTexture,
    WebGPUCmdFuncCopyTextureToBuffer, WGPUFormatToGFXFormat } from './webgpu-commands';

export class WebGPUDevice extends Device {
    public createSwapchain (info: Readonly<SwapchainInfo>): Swapchain {
        const swapchain = new WebGPUSwapchain();
        this._swapchain = swapchain;
        swapchain.initialize(info);
        return swapchain;
    }
    public getSampler (info: Readonly<SamplerInfo>): Sampler {
        const hash = Sampler.computeHash(info);
        if (!this._samplers.has(hash)) {
            this._samplers.set(hash, new WebGPUSampler(info, hash));
        }
        return this._samplers.get(hash)!;
    }
    public getSwapchains (): readonly Swapchain[] {
        return [this._swapchain as Swapchain];
    }
    public getGeneralBarrier (info: Readonly<GeneralBarrierInfo>): GeneralBarrier {
        const hash = GeneralBarrier.computeHash(info);
        if (!this._generalBarrierss.has(hash)) {
            this._generalBarrierss.set(hash, new GeneralBarrier(info, hash));
        }
        return this._generalBarrierss.get(hash)!;
    }
    public getTextureBarrier (info: Readonly<TextureBarrierInfo>): TextureBarrier {
        const hash = TextureBarrier.computeHash(info);
        if (!this._textureBarriers.has(hash)) {
            this._textureBarriers.set(hash, new TextureBarrier(info, hash));
        }
        return this._textureBarriers.get(hash)!;
    }
    public getBufferBarrier (info: Readonly<BufferBarrierInfo>): BufferBarrier {
        const hash = BufferBarrier.computeHash(info);
        if (!this._bufferBarriers.has(hash)) {
            this._bufferBarriers.set(hash, new BufferBarrier(info, hash));
        }
        return this._bufferBarriers.get(hash)!;
    }
    public async copyTextureToBuffers (texture: Readonly<Texture>, buffers: ArrayBufferView[], regions: readonly BufferTextureCopy[]): Promise<void> {
        await WebGPUCmdFuncCopyTextureToBuffer(this, (texture as WebGPUTexture).gpuTexture, buffers, regions);
    }
    public flushCommands (cmdBuffs: CommandBuffer[]): void {
        // noop
    }

    get isPremultipliedAlpha (): boolean {
        if (!this._gpuConfig) {
            return false;
        }
        return this._gpuConfig.alphaMode === 'premultiplied';
    }

    get multiDrawIndirectSupport (): boolean {
        return this._multiDrawIndirect;
    }

    get bindingMappings (): IWebGPUBindingMapping {
        return this._bindingMappings!;
    }

    get context (): GPUCanvasContext {
        return this._context!;
    }

    public stateCache: WebGPUStateCache = new WebGPUStateCache();
    public cmdAllocator: WebGPUCommandAllocator = new WebGPUCommandAllocator();
    public nullTex2D: WebGPUTexture | null = null;
    public nullTexCube: WebGPUTexture | null = null;
    public defaultResource: DefaultResources = new DefaultResources();

    private _adapter: GPUAdapter | null | undefined = null;
    private _device: GPUDevice | null | undefined = null;
    private _context: GPUCanvasContext | null = null;
    private _swapchain: WebGPUSwapchain | null = null;
    private _glslang;
    private _twgsl;
    private _bindingMappings: IWebGPUBindingMapping | null = null;
    private _multiDrawIndirect = false;
    private _gpuConfig: GPUCanvasConfiguration | null = null;
    protected _textureExclusive = new Array<boolean>(Format.COUNT);

    public async initialize (info: Readonly<DeviceInfo>): Promise<boolean> {
        WebGPUDeviceManager.setInstance(this);
        return this.initDevice(info);
    }

    set gpuConfig (config: GPUCanvasConfiguration) {
        this._gpuConfig = config;
    }

    get gpuConfig (): GPUCanvasConfiguration {
        return this._gpuConfig!;
    }

    protected initFormatFeatures (exts: GPUSupportedFeatures): void {
        this._formatFeatures.fill(FormatFeatureBit.NONE);

        this._textureExclusive.fill(true);

        let tempFeature: FormatFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.LINEAR_FILTER | FormatFeatureBit.VERTEX_ATTRIBUTE;

        this._formatFeatures[Format.R8] = tempFeature;
        this._formatFeatures[Format.RG8] = tempFeature;
        this._formatFeatures[Format.RGB8] = tempFeature;
        this._formatFeatures[Format.RGBA8] = tempFeature;

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        this._formatFeatures[Format.R8SN] = tempFeature;
        this._formatFeatures[Format.RG8SN] = tempFeature;
        this._formatFeatures[Format.RGB8SN] = tempFeature;
        this._formatFeatures[Format.RGBA8SN] = tempFeature;
        this._formatFeatures[Format.R5G6B5] = tempFeature;
        this._formatFeatures[Format.RGBA4] = tempFeature;
        this._formatFeatures[Format.RGB5A1] = tempFeature;
        this._formatFeatures[Format.RGB10A2] = tempFeature;

        this._formatFeatures[Format.SRGB8] = tempFeature;
        this._formatFeatures[Format.SRGB8_A8] = tempFeature;

        this._formatFeatures[Format.R11G11B10F] = tempFeature;
        this._formatFeatures[Format.RGB9E5] = tempFeature;

        this._formatFeatures[Format.DEPTH] = tempFeature;
        this._formatFeatures[Format.DEPTH_STENCIL] = tempFeature;

        this._formatFeatures[Format.RGB10A2UI] = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.VERTEX_ATTRIBUTE;

        this._formatFeatures[Format.R16F] = tempFeature;
        this._formatFeatures[Format.RG16F] = tempFeature;
        this._formatFeatures[Format.RGB16F] = tempFeature;
        this._formatFeatures[Format.RGBA16F] = tempFeature;

        tempFeature = FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.RENDER_TARGET
        | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.VERTEX_ATTRIBUTE;

        this._formatFeatures[Format.R32F] = tempFeature;
        this._formatFeatures[Format.RG32F] = tempFeature;
        this._formatFeatures[Format.RGB32F] = tempFeature;
        this._formatFeatures[Format.RGBA32F] = tempFeature;

        this._formatFeatures[Format.RGB10A2UI] = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER | FormatFeatureBit.VERTEX_ATTRIBUTE;

        this._formatFeatures[Format.R8I] = tempFeature;
        this._formatFeatures[Format.R8UI] = tempFeature;
        this._formatFeatures[Format.R16I] = tempFeature;
        this._formatFeatures[Format.R16UI] = tempFeature;
        this._formatFeatures[Format.R32I] = tempFeature;
        this._formatFeatures[Format.R32UI] = tempFeature;

        this._formatFeatures[Format.RG8I] = tempFeature;
        this._formatFeatures[Format.RG8UI] = tempFeature;
        this._formatFeatures[Format.RG16I] = tempFeature;
        this._formatFeatures[Format.RG16UI] = tempFeature;
        this._formatFeatures[Format.RG32I] = tempFeature;
        this._formatFeatures[Format.RG32UI] = tempFeature;

        this._formatFeatures[Format.RGB8I] = tempFeature;
        this._formatFeatures[Format.RGB8UI] = tempFeature;
        this._formatFeatures[Format.RGB16I] = tempFeature;
        this._formatFeatures[Format.RGB16UI] = tempFeature;
        this._formatFeatures[Format.RGB32I] = tempFeature;
        this._formatFeatures[Format.RGB32UI] = tempFeature;

        this._formatFeatures[Format.RGBA8I] = tempFeature;
        this._formatFeatures[Format.RGBA8UI] = tempFeature;
        this._formatFeatures[Format.RGBA16I] = tempFeature;
        this._formatFeatures[Format.RGBA16UI] = tempFeature;
        this._formatFeatures[Format.RGBA32I] = tempFeature;
        this._formatFeatures[Format.RGBA32UI] = tempFeature;

        this._textureExclusive[Format.R8] = false;
        this._textureExclusive[Format.RG8] = false;
        this._textureExclusive[Format.RGB8] = false;
        this._textureExclusive[Format.R5G6B5] = false;
        this._textureExclusive[Format.RGBA4] = false;

        this._textureExclusive[Format.RGB5A1] = false;
        this._textureExclusive[Format.RGBA8] = false;
        this._textureExclusive[Format.RGB10A2] = false;
        this._textureExclusive[Format.RGB10A2UI] = false;
        this._textureExclusive[Format.SRGB8_A8] = false;

        this._textureExclusive[Format.R8I] = false;
        this._textureExclusive[Format.R8UI] = false;
        this._textureExclusive[Format.R16I] = false;
        this._textureExclusive[Format.R16UI] = false;
        this._textureExclusive[Format.R32I] = false;
        this._textureExclusive[Format.R32UI] = false;

        this._textureExclusive[Format.RG8I] = false;
        this._textureExclusive[Format.RG8UI] = false;
        this._textureExclusive[Format.RG16I] = false;
        this._textureExclusive[Format.RG16UI] = false;
        this._textureExclusive[Format.RG32I] = false;
        this._textureExclusive[Format.RG32UI] = false;

        this._textureExclusive[Format.RGBA8I] = false;
        this._textureExclusive[Format.RGBA8UI] = false;
        this._textureExclusive[Format.RGBA16I] = false;
        this._textureExclusive[Format.RGBA16UI] = false;
        this._textureExclusive[Format.RGBA32I] = false;
        this._textureExclusive[Format.RGBA32UI] = false;

        this._textureExclusive[Format.DEPTH] = false;
        this._textureExclusive[Format.DEPTH_STENCIL] = false;

        if (exts.has('float32-filterable')) {
            this._formatFeatures[Format.R32F] |= FormatFeatureBit.RENDER_TARGET;
            this._formatFeatures[Format.RG32F] |= FormatFeatureBit.RENDER_TARGET;
            this._formatFeatures[Format.RGBA32F] |= FormatFeatureBit.RENDER_TARGET;

            this._textureExclusive[Format.R32F] = false;
            this._textureExclusive[Format.RG32F] = false;
            this._textureExclusive[Format.RGBA32F] = false;

            this._formatFeatures[Format.RGB32F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.RGBA32F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.R32F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.RG32F] |= FormatFeatureBit.LINEAR_FILTER;
        }

        if (exts.has('shader-f16')) {
            this._textureExclusive[Format.R16F] = false;
            this._textureExclusive[Format.RG16F] = false;
            this._textureExclusive[Format.RGBA16F] = false;

            this._formatFeatures[Format.RGB16F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.RGBA16F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.R16F] |= FormatFeatureBit.LINEAR_FILTER;
            this._formatFeatures[Format.RG16F] |= FormatFeatureBit.LINEAR_FILTER;
        }

        const compressedFeature: FormatFeature = FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        if (exts.has('texture-compression-etc2')) {
            this._formatFeatures[Format.ETC2_RGB8] = compressedFeature;
            this._formatFeatures[Format.ETC2_RGBA8] = compressedFeature;
            this._formatFeatures[Format.ETC2_SRGB8] = compressedFeature;
            this._formatFeatures[Format.ETC2_SRGB8_A8] = compressedFeature;
            this._formatFeatures[Format.ETC2_RGB8_A1] = compressedFeature;
            this._formatFeatures[Format.ETC2_SRGB8_A1] = compressedFeature;
        }

        if (exts.has('texture-compression-bc')) {
            this._formatFeatures[Format.BC1] = compressedFeature;
            this._formatFeatures[Format.BC1_ALPHA] = compressedFeature;
            this._formatFeatures[Format.BC1_SRGB] = compressedFeature;
            this._formatFeatures[Format.BC1_SRGB_ALPHA] = compressedFeature;
            this._formatFeatures[Format.BC2] = compressedFeature;
            this._formatFeatures[Format.BC2_SRGB] = compressedFeature;
            this._formatFeatures[Format.BC3] = compressedFeature;
            this._formatFeatures[Format.BC3_SRGB] = compressedFeature;
        }

        if (exts.has('texture-compression-astc')) {
            this._formatFeatures[Format.ASTC_RGBA_4X4] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_5X4] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_5X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_6X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_6X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_8X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_8X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_8X8] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_10X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_10X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_10X8] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_10X10] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_12X10] = compressedFeature;
            this._formatFeatures[Format.ASTC_RGBA_12X12] = compressedFeature;

            this._formatFeatures[Format.ASTC_SRGBA_4X4] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_5X4] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_5X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_6X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_6X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_8X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_8X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_8X8] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_10X5] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_10X6] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_10X8] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_10X10] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_12X10] = compressedFeature;
            this._formatFeatures[Format.ASTC_SRGBA_12X12] = compressedFeature;
        }
    }

    public getDefaultDescResources (
        entry: GPUBindGroupLayoutEntry,
        resourceInfo: IWebGPUBuffer | IWebGPUTexture | IWebGPUSampler,
    ): WebGPUBuffer | WebGPUTexture | WebGPUSampler | undefined {
        let currHash = hashCombineNum(entry.visibility, 0);
        const defaultRes = this.defaultResource;
        if (entry.buffer) {
            currHash = hashCombineStr(entry.buffer.type!, currHash);
            if (entry.buffer.hasDynamicOffset) currHash = hashCombineNum(entry.buffer.hasDynamicOffset ? 1 : 0, currHash);
            if (entry.buffer.minBindingSize !== undefined) currHash = hashCombineNum(entry.buffer.minBindingSize, currHash);
            if (defaultRes.buffersDescLayout.has(currHash)) {
                return defaultRes.buffersDescLayout.get(currHash);
            }
            resourceInfo = resourceInfo as IWebGPUBuffer;
            const bufferInfo = new BufferInfo();
            bufferInfo.usage = resourceInfo.usage;
            bufferInfo.size = bufferInfo.stride = 16;
            bufferInfo.memUsage = resourceInfo.memUsage;
            bufferInfo.flags = resourceInfo.flags!;
            defaultRes.buffersDescLayout.set(currHash, this.createBuffer(bufferInfo) as WebGPUBuffer);
            return defaultRes.buffersDescLayout.get(currHash);
        } else if (entry.texture) {
            resourceInfo = resourceInfo as IWebGPUTexture;
            currHash = hashCombineStr(entry.texture.sampleType!, currHash);
            currHash = hashCombineStr(entry.texture.viewDimension!, currHash);
            currHash = hashCombineNum(entry.texture.multisampled ? 1 : 0, currHash);
            currHash = hashCombineNum(resourceInfo.mipLevel, currHash);
            currHash = hashCombineNum(resourceInfo.arrayLayer, currHash);
            if (defaultRes.texturesDescLayout.has(currHash)) {
                return defaultRes.texturesDescLayout.get(currHash);
            }
            const texInfo = new TextureInfo(
                resourceInfo.type,
                resourceInfo.usage,
                resourceInfo.format,
                2 ** (resourceInfo.mipLevel - 1),
                2 ** (resourceInfo.mipLevel - 1),
                resourceInfo.flags,
                resourceInfo.arrayLayer,
                resourceInfo.mipLevel,
                resourceInfo.samples,
                1,
            );
            defaultRes.texturesDescLayout.set(currHash, this.createTexture(texInfo) as WebGPUTexture);
            return defaultRes.texturesDescLayout.get(currHash);
        } else if (entry.sampler) {
            resourceInfo = resourceInfo as IWebGPUSampler;
            currHash = hashCombineStr(entry.sampler.type!, currHash);
            if (defaultRes.samplersDescLayout.has(currHash)) {
                return defaultRes.samplersDescLayout.get(currHash);
            }
            const samplerInfo = new SamplerInfo();
            samplerInfo.minFilter = resourceInfo.minFilter;
            samplerInfo.magFilter = resourceInfo.magFilter;
            samplerInfo.mipFilter = resourceInfo.mipFilter;
            samplerInfo.addressU = resourceInfo.addressU;
            samplerInfo.addressV = resourceInfo.addressV;
            samplerInfo.addressW = resourceInfo.addressW;

            defaultRes.samplersDescLayout.set(currHash, this.getSampler(samplerInfo) as WebGPUSampler);
            return defaultRes.samplersDescLayout.get(currHash);
        }
        return undefined;
    }

    private _createDefaultDescSet (): void {
        const defaultResource = this.defaultResource;
        // default set layout
        const layoutInfo = new DescriptorSetLayoutInfo();
        const layoutBinding = new DescriptorSetLayoutBinding();
        layoutBinding.binding = 0;
        layoutBinding.count = 1;
        layoutBinding.descriptorType = DescriptorType.UNIFORM_BUFFER;
        layoutBinding.stageFlags = ShaderStageFlagBit.VERTEX;
        layoutInfo.bindings.push(layoutBinding);
        defaultResource.setLayout = this.createDescriptorSetLayout(layoutInfo);
        // default set
        const descInfo = new DescriptorSetInfo();
        descInfo.layout = defaultResource.setLayout;
        defaultResource.descSet = this.createDescriptorSet(descInfo);
        defaultResource.descSet.bindBuffer(0, defaultResource.buffer);
        defaultResource.descSet.update();
        (defaultResource.descSet as WebGPUDescriptorSet).prepare(DescUpdateFrequency.NORMAL, [0]);
    }

    private async initDevice (info: Readonly<DeviceInfo>): Promise<boolean> {
        const gpu = navigator.gpu;
        this._adapter = await gpu?.requestAdapter();
        const maxVertAttrs = this._adapter!.limits.maxVertexAttributes;
        const maxSampledTexPerShaderStage = this._adapter!.limits.maxSampledTexturesPerShaderStage;
        const submitFeatures: GPUFeatureName[] = [];
        if (this._adapter!.features.has('float32-filterable')) {
            submitFeatures.push('float32-filterable');
        } else {
            warn('Filterable 32-bit float textures support is not available');
        }
        this._device = await this._adapter?.requestDevice({
            requiredLimits: {
                // Must be changed, default support for 16 is not enough
                maxVertexAttributes: maxVertAttrs,
                maxSampledTexturesPerShaderStage: maxSampledTexPerShaderStage,
            },
            requiredFeatures: submitFeatures,
        });

        this._glslang = await glslangLoader(await fetchUrl(glslangUrl));
        this._twgsl = await twgslLoader(await fetchUrl(twgslUrl));

        this._gfxAPI = API.WEBGPU;
        this._swapchainFormat = WGPUFormatToGFXFormat(navigator.gpu.getPreferredCanvasFormat());
        const mapping = this._bindingMappingInfo = info.bindingMappingInfo;
        const blockOffsets: number[] = [];
        const samplerTextureOffsets: number[] = [];
        const firstSet = mapping.setIndices[0];
        blockOffsets[firstSet] = 0;
        samplerTextureOffsets[firstSet] = 0;
        const mappingIdxSize =  mapping.setIndices.length;
        for (let i = 1; i < mappingIdxSize; ++i) {
            const curSet = mapping.setIndices[i];
            const prevSet = mapping.setIndices[i - 1];
            // accumulate the per set offset according to the specified capacity
            blockOffsets[curSet] = mapping.maxBlockCounts[prevSet] + blockOffsets[prevSet];
            samplerTextureOffsets[curSet] = mapping.maxSamplerTextureCounts[prevSet] + samplerTextureOffsets[prevSet];
        }
        for (let i = 0; i < mappingIdxSize; ++i) {
            const curSet = mapping.setIndices[i];
            // textures always come after UBOs
            samplerTextureOffsets[curSet] -= mapping.maxBlockCounts[curSet];
        }
        this._bindingMappings = {
            blockOffsets,
            samplerTextureOffsets,
            flexibleSet: mapping.setIndices[mappingIdxSize - 1],
        };

        const canvas = Device.canvas;
        this._context = canvas.getContext('webgpu')!;
        const device: GPUDevice = this._device as GPUDevice;

        const adapterInfo = await this._adapter!.requestAdapterInfo();
        this._vendor = adapterInfo.vendor;
        this._renderer = adapterInfo.device;
        const description = adapterInfo.description;

        const limits =  this._adapter!.limits;
        this._caps.clipSpaceMinZ = 0.0;
        this._caps.screenSpaceSignY = -1.0;
        this._caps.uboOffsetAlignment = 256;
        this._caps.maxUniformBufferBindings = 12;
        this._caps.maxVertexAttributes = limits.maxVertexAttributes;
        this._caps.maxUniformBufferBindings = limits.maxUniformBufferBindingSize;
        this._caps.maxTextureSize = limits.maxTextureDimension2D;
        this._caps.maxArrayTextureLayers = limits.maxTextureArrayLayers;
        this._caps.max3DTextureSize = limits.maxTextureDimension3D;
        this._caps.uboOffsetAlignment  = limits.minUniformBufferOffsetAlignment;

        const features = this._adapter!.features;
        // FIXME: require by query
        this._multiDrawIndirect = false;

        this._features.fill(false);
        this._features[Feature.ELEMENT_INDEX_UINT] = true;
        this._features[Feature.INSTANCED_ARRAYS] = true;
        this._features[Feature.MULTIPLE_RENDER_TARGETS] = true;
        this._features[Feature.BLEND_MINMAX] = true;
        this.initFormatFeatures(features);

        this._queue = this.createQueue(new QueueInfo(QueueType.GRAPHICS));
        this._cmdBuff = this.createCommandBuffer(new CommandBufferInfo(this._queue));

        const texInfo = new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.NONE,
            Format.RGBA8,
            16,
            16,
            TextureFlagBit.NONE,
            1,
            1,
            SampleCount.X1,
            1,
        );
        const defaultDescTexResc = this.createTexture(texInfo);

        const bufferInfo = new BufferInfo(
            BufferUsageBit.NONE,
            MemoryUsageBit.NONE,
            16,
            16, // in bytes
            BufferFlagBit.NONE,
        );
        const defaultDescBuffResc = this.createBuffer(bufferInfo);

        const samplerInfo = new SamplerInfo();
        const defaultDescSmplResc = this.getSampler(samplerInfo);
        const defaultResource = this.defaultResource;
        defaultResource.buffer = defaultDescBuffResc as WebGPUBuffer;
        defaultResource.texture = defaultDescTexResc as WebGPUTexture;
        defaultResource.sampler = defaultDescSmplResc as WebGPUSampler;
        this._createDefaultDescSet();

        let compressedFormat = '';

        if (this.getFormatFeatures(Format.ETC_RGB8)) {
            compressedFormat += 'etc1 ';
        }

        if (this.getFormatFeatures(Format.ETC2_RGB8)) {
            compressedFormat += 'etc2 ';
        }

        if (this.getFormatFeatures(Format.BC1)) {
            compressedFormat += 'dxt ';
        }

        if (this.getFormatFeatures(Format.PVRTC_RGB2)) {
            compressedFormat += 'pvrtc ';
        }

        if (this.getFormatFeatures(Format.ASTC_RGBA_4X4)) {
            compressedFormat += 'astc ';
        }
        debug('WebGPU device initialized.');
        debug(`RENDERER: ${this._renderer}`);
        debug(`VENDOR: ${this._vendor}`);
        debug(`DESCRIPTION: ${description}`);
        debug(`COMPRESSED_FORMAT: ${compressedFormat}`);
        return Promise.resolve(true);
    }

    public destroy (): void {
        if (this._queue) {
            this._queue.destroy();
            this._queue = null;
        }

        if (this._cmdBuff) {
            this._cmdBuff.destroy();
            this._cmdBuff = null;
        }

        const it = this._samplers.values();
        let res = it.next();
        while (!res.done) {
            (res.value as WebGPUSampler).destroy();
            res = it.next();
        }

        this._swapchain = null;
    }

    public resize (width: number, height: number): void {
        // noop
    }

    public acquire (): void {
        // noop
    }

    get nativeDevice (): GPUDevice | null | undefined {
        return this._device;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public get glslang () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._glslang;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public get twgsl () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._twgsl;
    }

    public present (): void {
        const queue = (this._queue as unknown as WebGPUQueue);
        this._numDrawCalls = queue.numDrawCalls;
        this._numInstances = queue.numInstances;
        this._numTris = queue.numTris;
        queue.clear();
    }

    public createCommandBuffer (info: CommandBufferInfo): CommandBuffer {
        const cmdBuff = new WebGPUCommandBuffer();
        if (cmdBuff.initialize(info)) {
            return cmdBuff;
        }
        return null!;
    }

    public createBuffer (info: Readonly<BufferInfo> | Readonly<BufferViewInfo>): Buffer {
        const buffer = new WebGPUBuffer();
        buffer.initialize(info);
        return buffer;
    }

    public createTexture (info: Readonly<TextureInfo> | Readonly<TextureViewInfo>): Texture {
        const texture = new WebGPUTexture();
        texture.initialize(info);
        return texture;
    }

    public createDescriptorSet (info: Readonly<DescriptorSetInfo>): DescriptorSet {
        const descriptorSet = new WebGPUDescriptorSet();
        descriptorSet.initialize(info);
        return descriptorSet;
    }

    public createShader (info: Readonly<ShaderInfo>): Shader {
        const shader = new WebGPUShader();
        shader.initialize(info);
        return shader;
    }

    public createInputAssembler (info: Readonly<InputAssemblerInfo>): InputAssembler {
        const inputAssembler = new WebGPUInputAssembler();
        inputAssembler.initialize(info);
        return inputAssembler;
    }

    public createRenderPass (info: Readonly<RenderPassInfo>): RenderPass {
        const renderPass = new WebGPURenderPass();
        renderPass.initialize(info);
        return renderPass;
    }

    public createFramebuffer (info: Readonly<FramebufferInfo>): Framebuffer {
        const framebuffer = new WebGPUFramebuffer();
        framebuffer.initialize(info);
        return framebuffer;
    }

    public createDescriptorSetLayout (info: Readonly<DescriptorSetLayoutInfo>): DescriptorSetLayout {
        const descriptorSetLayout = new WebGPUDescriptorSetLayout();
        descriptorSetLayout.initialize(info);
        return descriptorSetLayout;
    }

    public createPipelineLayout (info: PipelineLayoutInfo): PipelineLayout {
        const pipelineLayout = new WebGPUPipelineLayout();
        if (pipelineLayout.initialize(info)) {
            return pipelineLayout;
        }
        return null!;
    }

    public createPipelineState (info: Readonly<PipelineStateInfo>): PipelineState {
        const pipelineState = new WebGPUPipelineState();
        pipelineState.initialize(info);
        return pipelineState;
    }

    public createQueue (info: QueueInfo): Queue {
        const queue = new WebGPUQueue();
        if (queue.initialize(info)) {
            return queue;
        }
        return null!;
    }

    public copyBuffersToTexture (buffers: ArrayBufferView[], texture: Texture, regions: BufferTextureCopy[]): void {
        WebGPUCmdFuncCopyBuffersToTexture(
            this,
            buffers,
            (texture as unknown as WebGPUTexture).gpuTexture,
            regions,
        );
    }

    public copyTexImagesToTexture (
        texImages: TexImageSource[],
        texture: Texture,
        regions: BufferTextureCopy[],
    ): void {
        WebGPUCmdFuncCopyTexImagesToTexture(
            this,
            texImages,
            (texture as unknown as WebGPUTexture).gpuTexture,
            regions,
        );
    }

    public copyFramebufferToBuffer (
        srcFramebuffer: Framebuffer,
        dstBuffer: ArrayBuffer,
        regions: BufferTextureCopy[],
    ): void {
        // noop
    }

    public blitFramebuffer (src: Framebuffer, dst: Framebuffer, srcRect: Rect, dstRect: Rect, filter: Filter): void {
        // noop
    }
}
