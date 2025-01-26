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

import { systemInfo } from 'pal/system-info';
import { DescriptorSet } from '../base/descriptor-set';
import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { PipelineLayout } from '../base/pipeline-layout';
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
import { Texture } from '../base/texture';
import { WebGL2DescriptorSet } from './webgl2-descriptor-set';
import { WebGL2Buffer } from './webgl2-buffer';
import { WebGL2CommandBuffer } from './webgl2-command-buffer';
import { WebGL2Framebuffer } from './webgl2-framebuffer';
import { WebGL2InputAssembler } from './webgl2-input-assembler';
import { WebGL2DescriptorSetLayout } from './webgl2-descriptor-set-layout';
import { WebGL2PipelineLayout } from './webgl2-pipeline-layout';
import { WebGL2PipelineState } from './webgl2-pipeline-state';
import { WebGL2PrimaryCommandBuffer } from './webgl2-primary-command-buffer';
import { WebGL2Queue } from './webgl2-queue';
import { WebGL2RenderPass } from './webgl2-render-pass';
import { WebGL2Sampler } from './states/webgl2-sampler';
import { WebGL2Shader } from './webgl2-shader';
import { WebGL2Swapchain, getExtensions, getContext } from './webgl2-swapchain';
import { WebGL2Texture } from './webgl2-texture';
import {
    CommandBufferType, DescriptorSetLayoutInfo, DescriptorSetInfo,
    PipelineLayoutInfo, BufferViewInfo, CommandBufferInfo, BufferInfo, FramebufferInfo, InputAssemblerInfo,
    QueueInfo, RenderPassInfo, SamplerInfo, ShaderInfo, TextureInfo, TextureViewInfo, DeviceInfo, GeneralBarrierInfo, TextureBarrierInfo,
    BufferBarrierInfo, QueueType, API, Feature, BufferTextureCopy, SwapchainInfo, FormatFeature, Format, FormatFeatureBit,
} from '../base/define';
import { WebGL2CmdFuncCopyTextureToBuffers, WebGL2CmdFuncCopyBuffersToTexture, WebGL2CmdFuncCopyTexImagesToTexture } from './webgl2-commands';
import { GeneralBarrier } from '../base/states/general-barrier';
import { TextureBarrier } from '../base/states/texture-barrier';
import { BufferBarrier } from '../base/states/buffer-barrier';
import { debug, errorID } from '../../core/platform/debug';
import { sys } from '../../core/platform/sys';
import { Swapchain } from '../base/swapchain';
import { IWebGL2Extensions, WebGL2DeviceManager } from './webgl2-define';
import { IWebGL2BindingMapping, IWebGL2BlitManager } from './webgl2-gpu-objects';
import { BrowserType, OS } from '../../../pal/system-info/enum-type';
import type { WebGL2StateCache } from './webgl2-state-cache';
import { WebGLConstants } from '../gl-constants';

function setFormatFeature (formatFeatures: FormatFeature[], indexArray: Format[], feature: FormatFeature): void {
    for (let i = 0; i < indexArray.length; ++i) {
        formatFeatures[indexArray[i]] = feature;
    }
}

function setTextureExclusive (textureExclusive: boolean[], indexArray: Format[], isExclusive: boolean): void {
    for (let i = 0; i < indexArray.length; ++i) {
        textureExclusive[indexArray[i]] = isExclusive;
    }
}

/** @mangle */
export class WebGL2Device extends Device {
    constructor () {
        super();
    }

    get gl (): WebGL2RenderingContext {
        return this._context!;
    }

    get extensions (): IWebGL2Extensions {
        return this._swapchain!.extensions;
    }

    getStateCache (): WebGL2StateCache {
        return this._swapchain!.stateCache;
    }

    get nullTex2D (): WebGL2Texture {
        return this._swapchain!.nullTex2D;
    }

    get nullTexCube (): WebGL2Texture {
        return this._swapchain!.nullTexCube;
    }

    get textureExclusive (): boolean[] {
        return this._textureExclusive;
    }

    get bindingMappings (): IWebGL2BindingMapping {
        return this._bindingMappings!;
    }

    get blitManager (): IWebGL2BlitManager | null {
        return this._swapchain!.blitManager;
    }

    private _swapchain: WebGL2Swapchain | null = null;
    private _context: WebGL2RenderingContext | null = null;
    private _bindingMappings: IWebGL2BindingMapping | null = null;

    protected _textureExclusive = new Array<boolean>(Format.COUNT);

    public initialize (info: Readonly<DeviceInfo>): boolean {
        WebGL2DeviceManager.setInstance(this);
        this._gfxAPI = API.WEBGL2;

        const mapping = this._bindingMappingInfo = info.bindingMappingInfo;
        const blockOffsets: number[] = [];
        const samplerTextureOffsets: number[] = [];
        const firstSet = mapping.setIndices[0];
        blockOffsets[firstSet] = 0;
        samplerTextureOffsets[firstSet] = 0;
        for (let i = 1; i < mapping.setIndices.length; ++i) {
            const curSet = mapping.setIndices[i];
            const prevSet = mapping.setIndices[i - 1];
            // accumulate the per set offset according to the specified capacity
            blockOffsets[curSet] = mapping.maxBlockCounts[prevSet] + blockOffsets[prevSet];
            samplerTextureOffsets[curSet] = mapping.maxSamplerTextureCounts[prevSet] + samplerTextureOffsets[prevSet];
        }
        for (let i = 0; i < mapping.setIndices.length; ++i) {
            const curSet = mapping.setIndices[i];
            // textures always come after UBOs
            samplerTextureOffsets[curSet] -= mapping.maxBlockCounts[curSet];
        }
        this._bindingMappings = {
            blockOffsets,
            samplerTextureOffsets,
            flexibleSet: mapping.setIndices[mapping.setIndices.length - 1],
        };

        const gl = this._context = getContext(Device.canvas);

        if (!gl) {
            errorID(16405);
            return false;
        }

        // create queue
        this._queue = this.createQueue(new QueueInfo(QueueType.GRAPHICS));
        this._cmdBuff = this.createCommandBuffer(new CommandBufferInfo(this._queue));

        const glGetParameter = gl.getParameter.bind(gl);

        const caps = this._caps;
        caps.maxVertexAttributes = glGetParameter(WebGLConstants.MAX_VERTEX_ATTRIBS);
        caps.maxVertexUniformVectors = glGetParameter(WebGLConstants.MAX_VERTEX_UNIFORM_VECTORS);
        // Implementation of WebGL2 in WECHAT browser and Safari in IOS exist bugs.
        // It seems to be related to Safari's experimental features 'WebGL via Metal'.
        // So limit using vertex uniform vectors no more than 256 in wechat browser,
        // and using vertex uniform vectors no more than 512 in safari.
        if (systemInfo.os === OS.IOS) {
            const maxVertexUniformVectors = caps.maxVertexUniformVectors;
            if (sys.browserType === BrowserType.WECHAT) {
                caps.maxVertexUniformVectors = maxVertexUniformVectors < 256 ? maxVertexUniformVectors : 256;
            } else if (sys.browserType === BrowserType.SAFARI) {
                caps.maxVertexUniformVectors = maxVertexUniformVectors < 512 ? maxVertexUniformVectors : 512;
            }
        }
        caps.maxFragmentUniformVectors = glGetParameter(WebGLConstants.MAX_FRAGMENT_UNIFORM_VECTORS);
        caps.maxTextureUnits = glGetParameter(WebGLConstants.MAX_TEXTURE_IMAGE_UNITS);
        caps.maxVertexTextureUnits = glGetParameter(WebGLConstants.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
        caps.maxUniformBufferBindings = glGetParameter(WebGLConstants.MAX_UNIFORM_BUFFER_BINDINGS);
        caps.maxUniformBlockSize = glGetParameter(WebGLConstants.MAX_UNIFORM_BLOCK_SIZE);
        caps.maxTextureSize = glGetParameter(WebGLConstants.MAX_TEXTURE_SIZE);
        caps.maxCubeMapTextureSize = glGetParameter(WebGLConstants.MAX_CUBE_MAP_TEXTURE_SIZE);
        caps.maxArrayTextureLayers = glGetParameter(WebGLConstants.MAX_ARRAY_TEXTURE_LAYERS);
        caps.max3DTextureSize = glGetParameter(WebGLConstants.MAX_3D_TEXTURE_SIZE);
        caps.uboOffsetAlignment = glGetParameter(WebGLConstants.UNIFORM_BUFFER_OFFSET_ALIGNMENT);

        const extensions = gl.getSupportedExtensions();
        let extStr = '';
        if (extensions) {
            extensions.forEach((ext) => {
                extStr += `${ext} `;
            });
        }

        const exts = getExtensions(gl);

        if (exts.WEBGL_debug_renderer_info) {
            this._renderer = glGetParameter(exts.WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL);
            this._vendor = glGetParameter(exts.WEBGL_debug_renderer_info.UNMASKED_VENDOR_WEBGL);
        } else {
            this._renderer = glGetParameter(WebGLConstants.RENDERER);
            this._vendor = glGetParameter(WebGLConstants.VENDOR);
        }

        const version: string = glGetParameter(WebGLConstants.VERSION);

        const features = this._features;
        features.fill(false);

        this.initFormatFeatures(exts);

        features[Feature.ELEMENT_INDEX_UINT] = true;
        features[Feature.INSTANCED_ARRAYS] = true;
        features[Feature.MULTIPLE_RENDER_TARGETS] = true;
        features[Feature.BLEND_MINMAX] = true;

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

        debug('WebGL2 device initialized.');
        debug(`RENDERER: ${this._renderer}`);
        debug(`VENDOR: ${this._vendor}`);
        debug(`VERSION: ${version}`);
        debug(`COMPRESSED_FORMAT: ${compressedFormat}`);
        debug(`EXTENSIONS: ${extStr}`);

        return true;
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
            (res.value as WebGL2Sampler).destroy();
            res = it.next();
        }

        this._swapchain = null;
    }

    public flushCommands (cmdBuffs: Readonly<CommandBuffer[]>): void {
        // noop
    }

    public acquire (swapchains: Readonly<Swapchain[]>): void {
        // noop
    }

    public present (): void {
        const queue = (this._queue as WebGL2Queue);
        this._numDrawCalls = queue.numDrawCalls;
        this._numInstances = queue.numInstances;
        this._numTris = queue.numTris;
        queue.clear();
    }

    protected initFormatFeatures (exts: IWebGL2Extensions): void {
        const formatFeatures = this._formatFeatures;
        const textureExclusive = this._textureExclusive;

        formatFeatures.fill(FormatFeatureBit.NONE);
        textureExclusive.fill(true);

        let tempFeature: FormatFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.LINEAR_FILTER | FormatFeatureBit.VERTEX_ATTRIBUTE;

        setFormatFeature(formatFeatures, [
            Format.R8,
            Format.RG8,
            Format.RGB8,
            Format.RGBA8,
        ], tempFeature);

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        setFormatFeature(formatFeatures, [
            Format.R8SN,
            Format.RG8SN,
            Format.RGB8SN,
            Format.RGBA8SN,
            Format.R5G6B5,
            Format.RGBA4,
            Format.RGB5A1,
            Format.RGB10A2,
            Format.SRGB8,
            Format.SRGB8_A8,
            Format.R11G11B10F,
            Format.RGB9E5,
            Format.DEPTH,
            Format.DEPTH_STENCIL,
        ], tempFeature);

        formatFeatures[Format.RGB10A2UI] = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.VERTEX_ATTRIBUTE;

        setFormatFeature(formatFeatures, [
            Format.R16F,
            Format.RG16F,
            Format.RGB16F,
            Format.RGBA16F,
        ], tempFeature);

        tempFeature = FormatFeatureBit.STORAGE_TEXTURE | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.VERTEX_ATTRIBUTE;

        setFormatFeature(formatFeatures, [
            Format.R32F,
            Format.RG32F,
            Format.RGB32F,
            Format.RGBA32F,
        ], tempFeature);

        formatFeatures[Format.RGB10A2UI] = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        tempFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.STORAGE_TEXTURE
            | FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER | FormatFeatureBit.VERTEX_ATTRIBUTE;

        setFormatFeature(formatFeatures, [
            Format.R8I,
            Format.R8UI,
            Format.R16I,
            Format.R16UI,
            Format.R32I,
            Format.R32UI,

            Format.RG8I,
            Format.RG8UI,
            Format.RG16I,
            Format.RG16UI,
            Format.RG32I,
            Format.RG32UI,

            Format.RGB8I,
            Format.RGB8UI,
            Format.RGB16I,
            Format.RGB16UI,
            Format.RGB32I,
            Format.RGB32UI,

            Format.RGBA8I,
            Format.RGBA8UI,
            Format.RGBA16I,
            Format.RGBA16UI,
            Format.RGBA32I,
            Format.RGBA32UI,
        ], tempFeature);

        setTextureExclusive(textureExclusive, [
            Format.R8,
            Format.RG8,
            Format.RGB8,
            Format.R5G6B5,
            Format.RGBA4,

            Format.RGB5A1,
            Format.RGBA8,
            Format.RGB10A2,
            Format.RGB10A2UI,
            Format.SRGB8_A8,

            Format.R8I,
            Format.R8UI,
            Format.R16I,
            Format.R16UI,
            Format.R32I,
            Format.R32UI,

            Format.RG8I,
            Format.RG8UI,
            Format.RG16I,
            Format.RG16UI,
            Format.RG32I,
            Format.RG32UI,

            Format.RGBA8I,
            Format.RGBA8UI,
            Format.RGBA16I,
            Format.RGBA16UI,
            Format.RGBA32I,
            Format.RGBA32UI,

            Format.DEPTH,
            Format.DEPTH_STENCIL,
        ], false);

        if (exts.EXT_color_buffer_float) {
            formatFeatures[Format.R32F] |= FormatFeatureBit.RENDER_TARGET;
            formatFeatures[Format.RG32F] |= FormatFeatureBit.RENDER_TARGET;
            formatFeatures[Format.RGBA32F] |= FormatFeatureBit.RENDER_TARGET;

            setTextureExclusive(textureExclusive, [
                Format.R32F,
                Format.RG32F,
                Format.RGBA32F,
            ], false);
        }

        if (exts.EXT_color_buffer_half_float) {
            setTextureExclusive(textureExclusive, [
                Format.R16F,
                Format.RG16F,
                Format.RGBA16F,
            ], false);
        }

        if (exts.OES_texture_float_linear) {
            formatFeatures[Format.RGB32F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RGBA32F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.R32F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RG32F] |= FormatFeatureBit.LINEAR_FILTER;
        }

        if (exts.OES_texture_half_float_linear) {
            formatFeatures[Format.RGB16F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RGBA16F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.R16F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RG16F] |= FormatFeatureBit.LINEAR_FILTER;
        }

        const compressedFeature: FormatFeature = FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;

        if (exts.WEBGL_compressed_texture_etc1) {
            formatFeatures[Format.ETC_RGB8] = compressedFeature;
        }

        if (exts.WEBGL_compressed_texture_etc) {
            setFormatFeature(formatFeatures, [
                Format.ETC2_RGB8,
                Format.ETC2_RGBA8,
                Format.ETC2_SRGB8,
                Format.ETC2_SRGB8_A8,
                Format.ETC2_RGB8_A1,
                Format.ETC2_SRGB8_A1,
            ], compressedFeature);
        }

        if (exts.WEBGL_compressed_texture_s3tc) {
            setFormatFeature(formatFeatures, [
                Format.BC1,
                Format.BC1_ALPHA,
                Format.BC1_SRGB,
                Format.BC1_SRGB_ALPHA,
                Format.BC2,
                Format.BC2_SRGB,
                Format.BC3,
                Format.BC3_SRGB,
            ], compressedFeature);
        }

        if (exts.WEBGL_compressed_texture_pvrtc) {
            setFormatFeature(formatFeatures, [
                Format.PVRTC_RGB2,
                Format.PVRTC_RGBA2,
                Format.PVRTC_RGB4,
                Format.PVRTC_RGBA4,
            ], compressedFeature);
        }

        if (exts.WEBGL_compressed_texture_astc) {
            setFormatFeature(formatFeatures, [
                Format.ASTC_RGBA_4X4,
                Format.ASTC_RGBA_5X4,
                Format.ASTC_RGBA_5X5,
                Format.ASTC_RGBA_6X5,
                Format.ASTC_RGBA_6X6,
                Format.ASTC_RGBA_8X5,
                Format.ASTC_RGBA_8X6,
                Format.ASTC_RGBA_8X8,
                Format.ASTC_RGBA_10X5,
                Format.ASTC_RGBA_10X6,
                Format.ASTC_RGBA_10X8,
                Format.ASTC_RGBA_10X10,
                Format.ASTC_RGBA_12X10,
                Format.ASTC_RGBA_12X12,

                Format.ASTC_SRGBA_4X4,
                Format.ASTC_SRGBA_5X4,
                Format.ASTC_SRGBA_5X5,
                Format.ASTC_SRGBA_6X5,
                Format.ASTC_SRGBA_6X6,
                Format.ASTC_SRGBA_8X5,
                Format.ASTC_SRGBA_8X6,
                Format.ASTC_SRGBA_8X8,
                Format.ASTC_SRGBA_10X5,
                Format.ASTC_SRGBA_10X6,
                Format.ASTC_SRGBA_10X8,
                Format.ASTC_SRGBA_10X10,
                Format.ASTC_SRGBA_12X10,
                Format.ASTC_SRGBA_12X12,
            ], compressedFeature);
        }
    }

    public createCommandBuffer (info: Readonly<CommandBufferInfo>): CommandBuffer {
        // const Ctor = WebGLCommandBuffer; // opt to instant invocation
        const Ctor = info.type === CommandBufferType.PRIMARY ? WebGL2PrimaryCommandBuffer : WebGL2CommandBuffer;
        const cmdBuff = new Ctor();
        cmdBuff.initialize(info);
        return cmdBuff;
    }

    public createSwapchain (info: Readonly<SwapchainInfo>): Swapchain {
        const swapchain = new WebGL2Swapchain();
        this._swapchain = swapchain;
        swapchain.initialize(info);
        return swapchain;
    }

    public createBuffer (info: Readonly<BufferInfo> | Readonly<BufferViewInfo>): Buffer {
        const buffer = new WebGL2Buffer();
        buffer.initialize(info);
        return buffer;
    }

    public createTexture (info: Readonly<TextureInfo> | Readonly<TextureViewInfo>): Texture {
        const texture = new WebGL2Texture();
        texture.initialize(info);
        return texture;
    }

    public createDescriptorSet (info: Readonly<DescriptorSetInfo>): DescriptorSet {
        const descriptorSet = new WebGL2DescriptorSet();
        descriptorSet.initialize(info);
        return descriptorSet;
    }

    public createShader (info: Readonly<ShaderInfo>): Shader {
        const shader = new WebGL2Shader();
        shader.initialize(info);
        return shader;
    }

    public createInputAssembler (info: Readonly<InputAssemblerInfo>): InputAssembler {
        const inputAssembler = new WebGL2InputAssembler();
        inputAssembler.initialize(info);
        return inputAssembler;
    }

    public createRenderPass (info: Readonly<RenderPassInfo>): RenderPass {
        const renderPass = new WebGL2RenderPass();
        renderPass.initialize(info);
        return renderPass;
    }

    public createFramebuffer (info: Readonly<FramebufferInfo>): Framebuffer {
        const framebuffer = new WebGL2Framebuffer();
        framebuffer.initialize(info);
        return framebuffer;
    }

    public createDescriptorSetLayout (info: Readonly<DescriptorSetLayoutInfo>): DescriptorSetLayout {
        const descriptorSetLayout = new WebGL2DescriptorSetLayout();
        descriptorSetLayout.initialize(info);
        return descriptorSetLayout;
    }

    public createPipelineLayout (info: Readonly<PipelineLayoutInfo>): PipelineLayout {
        const pipelineLayout = new WebGL2PipelineLayout();
        pipelineLayout.initialize(info);
        return pipelineLayout;
    }

    public createPipelineState (info: Readonly<PipelineStateInfo>): PipelineState {
        const pipelineState = new WebGL2PipelineState();
        pipelineState.initialize(info);
        return pipelineState;
    }

    public createQueue (info: Readonly<QueueInfo>): Queue {
        const queue = new WebGL2Queue();
        queue.initialize(info);
        return queue;
    }

    public getSampler (info: Readonly<SamplerInfo>): Sampler {
        const hash = Sampler.computeHash(info);
        if (!this._samplers.has(hash)) {
            this._samplers.set(hash, new WebGL2Sampler(info, hash));
        }
        return this._samplers.get(hash)!;
    }

    public getSwapchains (): Readonly<Swapchain[]> {
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

    public copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void {
        WebGL2CmdFuncCopyBuffersToTexture(
            this,
            buffers,
            (texture as WebGL2Texture).gpuTexture,
            regions,
        );
    }

    public copyTextureToBuffers (texture: Readonly<Texture>, buffers: ArrayBufferView[], regions: Readonly<BufferTextureCopy[]>): void {
        WebGL2CmdFuncCopyTextureToBuffers(
            this,
            (texture as WebGL2Texture).gpuTexture,
            buffers,
            regions,
        );
    }

    public copyTexImagesToTexture (
        texImages: Readonly<TexImageSource[]>,
        texture: Texture,
        regions: Readonly<BufferTextureCopy[]>,
    ): void {
        WebGL2CmdFuncCopyTexImagesToTexture(
            this,
            texImages,
            (texture as WebGL2Texture).gpuTexture,
            regions,
        );
    }
}
