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
import { WebGLDescriptorSet } from './webgl-descriptor-set';
import { WebGLBuffer } from './webgl-buffer';
import { WebGLCommandBuffer } from './webgl-command-buffer';
import { WebGLFramebuffer } from './webgl-framebuffer';
import { WebGLInputAssembler } from './webgl-input-assembler';
import { WebGLDescriptorSetLayout } from './webgl-descriptor-set-layout';
import { WebGLPipelineLayout } from './webgl-pipeline-layout';
import { WebGLPipelineState } from './webgl-pipeline-state';
import { WebGLPrimaryCommandBuffer } from './webgl-primary-command-buffer';
import { WebGLQueue } from './webgl-queue';
import { WebGLRenderPass } from './webgl-render-pass';
import { WebGLSampler } from './states/webgl-sampler';
import { WebGLShader } from './webgl-shader';
import { getContext, getExtensions, WebGLSwapchain } from './webgl-swapchain';
import { WebGLTexture } from './webgl-texture';
import {
    CommandBufferType, ShaderInfo,
    QueueInfo, CommandBufferInfo, DescriptorSetInfo, DescriptorSetLayoutInfo, FramebufferInfo, InputAssemblerInfo, PipelineLayoutInfo,
    RenderPassInfo, SamplerInfo, TextureInfo, TextureViewInfo, BufferInfo, BufferViewInfo, DeviceInfo, TextureBarrierInfo, GeneralBarrierInfo,
    BufferBarrierInfo, QueueType, API, Feature, BufferTextureCopy, SwapchainInfo, FormatFeature, FormatFeatureBit, Format,
} from '../base/define';
import { WebGLCmdFuncCopyBuffersToTexture, WebGLCmdFuncCopyTextureToBuffers, WebGLCmdFuncCopyTexImagesToTexture } from './webgl-commands';
import { GeneralBarrier } from '../base/states/general-barrier';
import { TextureBarrier } from '../base/states/texture-barrier';
import { BufferBarrier } from '../base/states/buffer-barrier';
import { Swapchain } from '../base/swapchain';
import { IWebGLExtensions, WebGLDeviceManager } from './webgl-define';
import { IWebGLBindingMapping, IWebGLBlitManager } from './webgl-gpu-objects';
import type { WebGLStateCache } from './webgl-state-cache';
import { WebGLConstants } from '../gl-constants';
import { debug, errorID } from '../../core/platform/debug';

function setFormatFeature (formatFeatures: FormatFeature[], indexArray: Format[], feature: FormatFeature): void {
    for (let i = 0; i < indexArray.length; ++i) {
        formatFeatures[indexArray[i]] = feature;
    }
}

function setFormatFeatureBitwiseOr (formatFeatures: FormatFeature[], indexArray: Format[], feature: FormatFeature): void {
    for (let i = 0; i < indexArray.length; ++i) {
        formatFeatures[indexArray[i]] |= feature;
    }
}

function setTextureExclusive (textureExclusive: boolean[], indexArray: Format[], isExclusive: boolean): void {
    for (let i = 0; i < indexArray.length; ++i) {
        textureExclusive[indexArray[i]] = isExclusive;
    }
}

/** @mangle */
export class WebGLDevice extends Device {
    constructor () {
        super();
    }

    get gl (): WebGLRenderingContext {
        return this._context!;
    }

    get extensions (): IWebGLExtensions {
        return this._swapchain!.extensions;
    }

    get stateCache (): WebGLStateCache {
        return this._swapchain!.stateCache;
    }

    get nullTex2D (): WebGLTexture {
        return this._swapchain!.nullTex2D;
    }

    get nullTexCube (): WebGLTexture {
        return this._swapchain!.nullTexCube;
    }

    get textureExclusive (): boolean[] {
        return this._textureExclusive;
    }

    get bindingMappings (): IWebGLBindingMapping {
        return this._bindingMappings!;
    }

    get blitManager (): IWebGLBlitManager {
        return this._swapchain!.blitManager;
    }

    private _swapchain: WebGLSwapchain | null = null;
    private _context: WebGLRenderingContext | null = null;
    private _bindingMappings: IWebGLBindingMapping | null = null;

    protected _textureExclusive = new Array<boolean>(Format.COUNT);

    public initialize (info: Readonly<DeviceInfo>): boolean {
        WebGLDeviceManager.setInstance(this);
        this._gfxAPI = API.WEBGL;

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
            errorID(16333);
            return false;
        }

        // create queue
        this._queue = this.createQueue(new QueueInfo(QueueType.GRAPHICS));
        this._cmdBuff = this.createCommandBuffer(new CommandBufferInfo(this._queue));

        const glGetParameter = gl.getParameter.bind(gl);

        const caps = this._caps;
        caps.maxVertexAttributes = glGetParameter(WebGLConstants.MAX_VERTEX_ATTRIBS);
        caps.maxVertexUniformVectors = glGetParameter(WebGLConstants.MAX_VERTEX_UNIFORM_VECTORS);
        caps.maxFragmentUniformVectors = glGetParameter(WebGLConstants.MAX_FRAGMENT_UNIFORM_VECTORS);
        caps.maxTextureUnits = glGetParameter(WebGLConstants.MAX_TEXTURE_IMAGE_UNITS);
        caps.maxVertexTextureUnits = glGetParameter(WebGLConstants.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
        caps.maxTextureSize = glGetParameter(WebGLConstants.MAX_TEXTURE_SIZE);
        caps.maxCubeMapTextureSize = glGetParameter(WebGLConstants.MAX_CUBE_MAP_TEXTURE_SIZE);
        caps.maxArrayTextureLayers = 0;
        caps.max3DTextureSize = 0;
        // WebGL doesn't support UBOs at all, so here we return
        // the guaranteed minimum number of available bindings in WebGL2
        caps.maxUniformBufferBindings = 16;

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

        if (exts.EXT_blend_minmax) {
            features[Feature.BLEND_MINMAX] = true;
        }

        if (exts.OES_element_index_uint) {
            features[Feature.ELEMENT_INDEX_UINT] = true;
        }

        if (exts.ANGLE_instanced_arrays) {
            features[Feature.INSTANCED_ARRAYS] = true;
        }

        if (exts.WEBGL_draw_buffers) {
            features[Feature.MULTIPLE_RENDER_TARGETS] = true;
        }

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

        debug('WebGL device initialized.');
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

        this._swapchain = null;
    }

    public flushCommands (cmdBuffs: CommandBuffer[]): void {
        // noop
    }

    public acquire (swapchains: Swapchain[]): void {
        // noop
    }

    public present (): void {
        const queue = (this._queue as WebGLQueue);
        this._numDrawCalls = queue.numDrawCalls;
        this._numInstances = queue.numInstances;
        this._numTris = queue.numTris;
        queue.clear();
    }

    protected initFormatFeatures (exts: IWebGLExtensions): void {
        const formatFeatures = this._formatFeatures;
        formatFeatures.fill(FormatFeatureBit.NONE);

        const textureExclusive = this._textureExclusive;
        textureExclusive.fill(true);

        const tempFeature: FormatFeature = FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE
            | FormatFeatureBit.LINEAR_FILTER;

        setFormatFeature(formatFeatures, [
            Format.RGB8,
            Format.R5G6B5,
            Format.RGBA8,
            Format.RGBA4,
            Format.RGB5A1,
        ], tempFeature);

        setFormatFeature(formatFeatures, [
            Format.DEPTH,
            Format.DEPTH_STENCIL,
        ], FormatFeatureBit.RENDER_TARGET);

        setTextureExclusive(textureExclusive, [
            Format.R5G6B5,
            Format.RGBA4,
            Format.RGB5A1,
            Format.DEPTH,
            Format.DEPTH_STENCIL,
        ], false);

        setFormatFeatureBitwiseOr(formatFeatures, [
            Format.R8I,
            Format.RG8I,
            Format.RGB8I,
            Format.RGBA8I,

            Format.R8UI,
            Format.RG8UI,
            Format.RGB8UI,
            Format.RGBA8UI,

            Format.R8I,
            Format.RG8I,
            Format.RGB8I,
            Format.RGBA8I,

            Format.R8UI,
            Format.RG8UI,
            Format.RGB8UI,
            Format.RGBA8UI,

            Format.R32F,
            Format.RG32F,
            Format.RGB32F,
            Format.RGBA32F,
        ], FormatFeatureBit.VERTEX_ATTRIBUTE);

        if (exts.EXT_sRGB) {
            formatFeatures[Format.SRGB8] = tempFeature;
            formatFeatures[Format.SRGB8_A8] = tempFeature;

            textureExclusive[Format.SRGB8_A8] = false;
        }

        if (exts.WEBGL_depth_texture) {
            formatFeatures[Format.DEPTH] |= tempFeature;
            formatFeatures[Format.DEPTH_STENCIL] |= tempFeature;
        }

        if (exts.WEBGL_color_buffer_float) {
            formatFeatures[Format.RGB32F] |= FormatFeatureBit.RENDER_TARGET;
            formatFeatures[Format.RGBA32F] |= FormatFeatureBit.RENDER_TARGET;
            textureExclusive[Format.RGB32F] = false;
            textureExclusive[Format.RGBA32F] = false;
        }

        if (exts.EXT_color_buffer_half_float) {
            formatFeatures[Format.RGB16F] |= FormatFeatureBit.RENDER_TARGET;
            formatFeatures[Format.RGBA16F] |= FormatFeatureBit.RENDER_TARGET;
            textureExclusive[Format.RGB16F] = false;
            textureExclusive[Format.RGBA16F] = false;
        }

        if (exts.OES_texture_float) {
            formatFeatures[Format.RGB32F] |= FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE;
            formatFeatures[Format.RGBA32F] |= FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE;
        }

        if (exts.OES_texture_half_float) {
            formatFeatures[Format.RGB16F] |= FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE;
            formatFeatures[Format.RGBA16F] |= FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE;
        }

        if (exts.OES_texture_float_linear) {
            formatFeatures[Format.RGB32F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RGBA32F] |= FormatFeatureBit.LINEAR_FILTER;
        }

        if (exts.OES_texture_half_float_linear) {
            formatFeatures[Format.RGB16F] |= FormatFeatureBit.LINEAR_FILTER;
            formatFeatures[Format.RGBA16F] |= FormatFeatureBit.LINEAR_FILTER;
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
            setFormatFeatureBitwiseOr(formatFeatures, [
                Format.PVRTC_RGB2,
                Format.PVRTC_RGBA2,
                Format.PVRTC_RGB4,
                Format.PVRTC_RGBA4,
            ], compressedFeature);
        }

        if (exts.WEBGL_compressed_texture_astc) {
            setFormatFeatureBitwiseOr(formatFeatures, [
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
        const Ctor = info.type === CommandBufferType.PRIMARY ? WebGLPrimaryCommandBuffer : WebGLCommandBuffer;
        const cmdBuff = new Ctor();
        cmdBuff.initialize(info);
        return cmdBuff;
    }

    public createSwapchain (info: Readonly<SwapchainInfo>): Swapchain {
        const swapchain = new WebGLSwapchain();
        this._swapchain = swapchain;
        swapchain.initialize(info);
        return swapchain;
    }

    public createBuffer (info: Readonly<BufferInfo> | Readonly<BufferViewInfo>): Buffer {
        const buffer = new WebGLBuffer();
        buffer.initialize(info);
        return buffer;
    }

    public createTexture (info: Readonly<TextureInfo> | Readonly<TextureViewInfo>): Texture {
        const texture = new WebGLTexture();
        texture.initialize(info);
        return texture;
    }

    public createDescriptorSet (info: Readonly<DescriptorSetInfo>): DescriptorSet {
        const descriptorSet = new WebGLDescriptorSet();
        descriptorSet.initialize(info);
        return descriptorSet;
    }

    public createShader (info: Readonly<ShaderInfo>): Shader {
        const shader = new WebGLShader();
        shader.initialize(info);
        return shader;
    }

    public createInputAssembler (info: Readonly<InputAssemblerInfo>): InputAssembler {
        const inputAssembler = new WebGLInputAssembler();
        inputAssembler.initialize(info);
        return inputAssembler;
    }

    public createRenderPass (info: Readonly<RenderPassInfo>): RenderPass {
        const renderPass = new WebGLRenderPass();
        renderPass.initialize(info);
        return renderPass;
    }

    public createFramebuffer (info: Readonly<FramebufferInfo>): Framebuffer {
        const framebuffer = new WebGLFramebuffer();
        framebuffer.initialize(info);
        return framebuffer;
    }

    public createDescriptorSetLayout (info: Readonly<DescriptorSetLayoutInfo>): DescriptorSetLayout {
        const descriptorSetLayout = new WebGLDescriptorSetLayout();
        descriptorSetLayout.initialize(info);
        return descriptorSetLayout;
    }

    public createPipelineLayout (info: Readonly<PipelineLayoutInfo>): PipelineLayout {
        const pipelineLayout = new WebGLPipelineLayout();
        pipelineLayout.initialize(info);
        return pipelineLayout;
    }

    public createPipelineState (info: Readonly<PipelineStateInfo>): PipelineState {
        const pipelineState = new WebGLPipelineState();
        pipelineState.initialize(info);
        return pipelineState;
    }

    public createQueue (info: Readonly<QueueInfo>): Queue {
        const queue = new WebGLQueue();
        queue.initialize(info);
        return queue;
    }

    public getSampler (info: Readonly<SamplerInfo>): Sampler {
        const hash = Sampler.computeHash(info);
        if (!this._samplers.has(hash)) {
            this._samplers.set(hash, new WebGLSampler(info, hash));
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
        WebGLCmdFuncCopyBuffersToTexture(
            this,
            buffers as ArrayBufferView[],
            (texture as WebGLTexture).gpuTexture,
            regions,
        );
    }

    public copyTextureToBuffers (texture: Readonly<Texture>, buffers: ArrayBufferView[], regions: Readonly<BufferTextureCopy[]>): void {
        WebGLCmdFuncCopyTextureToBuffers(
            this,
            (texture as WebGLTexture).gpuTexture,
            buffers,
            regions,
        );
    }

    public copyTexImagesToTexture (
        texImages: Readonly<TexImageSource[]>,
        texture: Texture,
        regions: Readonly<BufferTextureCopy[]>,
    ): void {
        WebGLCmdFuncCopyTexImagesToTexture(
            this,
            texImages,
            (texture as WebGLTexture).gpuTexture,
            regions,
        );
    }
}
