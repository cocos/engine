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

import {
    API, Feature, MemoryStatus,
    CommandBufferInfo, BufferInfo, BufferViewInfo, TextureInfo, TextureViewInfo, SamplerInfo, DescriptorSetInfo,
    ShaderInfo, InputAssemblerInfo, RenderPassInfo, FramebufferInfo, DescriptorSetLayoutInfo, PipelineLayoutInfo,
    QueueInfo, BufferTextureCopy, DeviceInfo, DeviceCaps, GeneralBarrierInfo, TextureBarrierInfo, BufferBarrierInfo,
    SwapchainInfo, BindingMappingInfo, Format, FormatFeature, TextureType, TextureUsageBit,
    TextureFlagBit, Offset, Extent, SampleCount, TextureSubresLayers, TextureUsage, TextureFlags,
} from './define';
import { Buffer } from './buffer';
import { CommandBuffer } from './command-buffer';
import { DescriptorSet } from './descriptor-set';
import { DescriptorSetLayout } from './descriptor-set-layout';
import { PipelineLayout } from './pipeline-layout';
import { Framebuffer } from './framebuffer';
import { InputAssembler } from './input-assembler';
import { PipelineState, PipelineStateInfo } from './pipeline-state';
import { Queue } from './queue';
import { RenderPass } from './render-pass';
import { Sampler } from './states/sampler';
import { Shader } from './shader';
import { Texture } from './texture';
import { GeneralBarrier } from './states/general-barrier';
import { TextureBarrier } from './states/texture-barrier';
import { BufferBarrier } from './states/buffer-barrier';
import { Swapchain } from './swapchain';

/**
 * @en GFX Device.
 * @zh GFX 设备。
 */
export abstract class Device {
    /**
     * @en Current rendering API.
     * @zh 当前 GFX 使用的渲染 API。
     */
    get gfxAPI (): API {
        return this._gfxAPI;
    }

    /**
     * @en GFX default queue.
     * @zh GFX 默认队列。
     */
    get queue (): Queue {
        return this._queue as Queue;
    }

    /**
     * @en GFX default command buffer.
     * @zh GFX 默认命令缓冲。
     */
    get commandBuffer (): CommandBuffer {
        return this._cmdBuff as CommandBuffer;
    }

    /**
     * @en The current format of the swapchain being used.
     * @zh 当前使用的swapchain的格式。
     */
    get swapchainFormat (): Format {
        return this._swapchainFormat;
    }

    /**
     * @en Renderer description.
     * @zh 渲染器描述。
     */
    get renderer (): string {
        return this._renderer;
    }

    /**
     * @en Vendor description.
     * @zh 厂商描述。
     */
    get vendor (): string {
        return this._vendor;
    }

    /**
     * @en Number of draw calls currently recorded.
     * @zh 绘制调用次数。
     */
    get numDrawCalls (): number {
        return this._numDrawCalls;
    }

    /**
     * @en Number of instances currently recorded.
     * @zh 绘制 Instance 数量。
     */
    get numInstances (): number {
        return this._numInstances;
    }

    /**
     * @en Number of triangles currently recorded.
     * @zh 渲染三角形数量。
     */
    get numTris (): number {
        return this._numTris;
    }

    /**
     * @en Total memory size currently allocated.
     * @zh 内存状态。
     */
    get memoryStatus (): MemoryStatus {
        return this._memoryStatus;
    }

    /**
     * @en Current device capabilities.
     * @zh 当前设备能力数据。
     */
    get capabilities (): DeviceCaps {
        return this._caps;
    }

    /**
     * @en Current device binding mappings.
     * @zh 当前设备的绑定槽位映射关系。
     */
    get bindingMappingInfo (): BindingMappingInfo {
        return this._bindingMappingInfo;
    }

    protected _gfxAPI = API.UNKNOWN;
    protected _renderer = '';
    protected _vendor = '';
    protected _features = new Array<boolean>(Feature.COUNT);
    protected _formatFeatures = new Array<FormatFeature>(Format.COUNT);
    protected _queue: Queue | null = null;
    protected _cmdBuff: CommandBuffer | null = null;
    protected _numDrawCalls = 0;
    protected _numInstances = 0;
    protected _numTris = 0;
    protected _memoryStatus = new MemoryStatus();
    protected _caps = new DeviceCaps();
    protected _bindingMappingInfo: BindingMappingInfo = new BindingMappingInfo();
    protected _samplers = new Map<number, Sampler>();
    protected _generalBarrierss = new Map<number, GeneralBarrier>();
    protected _textureBarriers = new Map<number, TextureBarrier>();
    protected _bufferBarriers = new Map<number, BufferBarrier>();
    protected _swapchainFormat = Format.RGBA8;

    public static canvas: HTMLCanvasElement; // Hack for WebGL device initialization process

    public abstract initialize (info: Readonly<DeviceInfo>): boolean | Promise<boolean>;

    public abstract destroy (): void;

    /**
     * @en Acquire next swapchain image.
     * @zh 获取下一个交换链缓冲。
     */
    public abstract acquire (swapchains: Readonly<Swapchain[]>): void;

    /**
     * @en Present current swapchain image.
     * @zh 上屏当前交换链缓冲。
     */
    public abstract present (): void;

    /**
     * @en Flush the specified command buffers.
     * @zh 实际录制指定的命令缓冲。
     */
    public abstract flushCommands (cmdBuffs: Readonly<CommandBuffer[]>): void;

    /**
     * @en Create command buffer.
     * @zh 创建命令缓冲。
     * @param info GFX command buffer description info.
     */
    public abstract createCommandBuffer (info: Readonly<CommandBufferInfo>): CommandBuffer;

    /**
     * @en Create swapchain.
     * @zh 创建交换链。
     * @param info GFX swapchain description info.
     */
    public abstract createSwapchain (info: Readonly<SwapchainInfo>): Swapchain;

    /**
     * @en Create buffer.
     * @zh 创建缓冲。
     * @param info GFX buffer description info.
     */
    public abstract createBuffer (info: Readonly<BufferInfo> | BufferViewInfo): Buffer;

    /**
     * @en Create texture.
     * @zh 创建纹理。
     * @param info GFX texture description info.
     */
    public abstract createTexture (info: Readonly<TextureInfo> | TextureViewInfo): Texture;

    /**
     * @en Create descriptor sets.
     * @zh 创建描述符集组。
     * @param info GFX descriptor sets description info.
     */
    public abstract createDescriptorSet (info: Readonly<DescriptorSetInfo>): DescriptorSet;

    /**
     * @en Create shader.
     * @zh 创建着色器。
     * @param info GFX shader description info.
     */
    public abstract createShader (info: Readonly<ShaderInfo>): Shader;

    /**
     * @en Create input assembler.
     * @zh 创建纹理。
     * @param info GFX input assembler description info.
     */
    public abstract createInputAssembler (info: Readonly<InputAssemblerInfo>): InputAssembler;

    /**
     * @en Create render pass.
     * @zh 创建渲染过程。
     * @param info GFX render pass description info.
     */
    public abstract createRenderPass (info: Readonly<RenderPassInfo>): RenderPass;

    /**
     * @en Create frame buffer.
     * @zh 创建帧缓冲。
     * @param info GFX frame buffer description info.
     */
    public abstract createFramebuffer (info: Readonly<FramebufferInfo>): Framebuffer;

    /**
     * @en Create descriptor set layout.
     * @zh 创建描述符集布局。
     * @param info GFX descriptor set layout description info.
     */
    public abstract createDescriptorSetLayout (info: Readonly<DescriptorSetLayoutInfo>): DescriptorSetLayout;

    /**
     * @en Create pipeline layout.
     * @zh 创建管线布局。
     * @param info GFX pipeline layout description info.
     */
    public abstract createPipelineLayout (info: Readonly<PipelineLayoutInfo>): PipelineLayout;

    /**
     * @en Create pipeline state.
     * @zh 创建管线状态。
     * @param info GFX pipeline state description info.
     */
    public abstract createPipelineState (info: Readonly<PipelineStateInfo>): PipelineState;

    /**
     * @en Create queue.
     * @zh 创建队列。
     * @param info GFX queue description info.
     */
    public abstract createQueue (info: Readonly<QueueInfo>): Queue;

    /**
     * @en Create sampler.
     * @zh 创建采样器。
     * @param info GFX sampler description info.
     */
    public abstract getSampler (info: Readonly<SamplerInfo>): Sampler;

    /**
     * @en Get swapchains.
     * @zh 获取交换链列表。
     */
    public abstract getSwapchains (): Readonly<Swapchain[]>;

    /**
     * @en Create global barrier.
     * @zh 创建全局内存屏障。
     * @param info GFX global barrier description info.
     */
    public abstract getGeneralBarrier (info: Readonly<GeneralBarrierInfo>): GeneralBarrier;

    /**
     * @en Create texture barrier.
     * @zh 创建贴图内存屏障。
     * @param info GFX texture barrier description info.
     */
    public abstract getTextureBarrier (info: Readonly<TextureBarrierInfo>): TextureBarrier;

    /**
     * @en Create buffer barrier.
     * @zh 创建buffer内存屏障。
     * @param info GFX buffer barrier description info.
     */
    public abstract getBufferBarrier (info: Readonly<BufferBarrierInfo>): BufferBarrier;

    /**
     * @en Copy buffers to texture.
     * @zh 拷贝缓冲到纹理。
     * @param buffers The buffers to be copied.
     * @param texture The texture to copy to.
     * @param regions The region descriptions.
     */
    public abstract copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void;

    /**
     * @en Copy texture to buffers
     * @zh 拷贝纹理到缓冲
     * @param texture The texture to be copied.
     * @param buffers The buffer to copy to.
     * @param regions The region descriptions
     */
    public abstract copyTextureToBuffers (texture: Readonly<Texture>, buffers: ArrayBufferView[], regions: Readonly<BufferTextureCopy[]>): void;

    /**
     * @en Copy texture images to texture.
     * @zh 拷贝图像到纹理。
     * @param texImages The texture to be copied.
     * @param texture The texture to copy to.
     * @param regions The region descriptions.
     */
    public abstract copyTexImagesToTexture (texImages: Readonly<TexImageSource[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void;

    /**
     * @en Whether the device has specific feature.
     * @zh 是否具备特性。
     * @param feature The GFX feature to be queried.
     */
    public hasFeature (feature: Feature): boolean {
        return this._features[feature];
    }

    /**
     * @en The extent a specific format is supported by the backend.
     * @zh 后端对特定格式的支持程度。
     * @param format The GFX format to be queried.
     */
    public getFormatFeatures (format: Format): FormatFeature {
        return this._formatFeatures[format];
    }

    /**
     * @en Enable automatically barrier deduction GFX inside, no effect on web.
     * @zh 是否开启自动GFX内部barrier推导，web无影响。
     * @param format The GFX format to be queried.
     */
    public enableAutoBarrier (en: boolean): void {
        // noop
    }

    /**
     * @en Get maximum supported sample count.
     * @zh 获取最大可支持的 Samples 参数
     * @param format The GFX texture format.
     * @param usage The GFX texture usage.
     * @param flags The GFX texture create flags.
     */
    public getMaxSampleCount (format: Format, usage: TextureUsage, flags: TextureFlags): SampleCount {
        return SampleCount.X1;
    }
}

export class DefaultResource {
    private _texture2D: Texture | null = null;
    private _texture3D: Texture | null = null;
    private _textureCube: Texture | null = null;
    private _texture2DArray: Texture | null = null;

    constructor (device: Device) {
        const capabilities = device.capabilities;
        const bufferSize = 64;
        // create a new buffer and fill it with a white pixel
        const buffer = new Uint8Array(bufferSize);
        buffer.fill(255);
        if (capabilities.maxTextureSize >= 2) {
            this._texture2D = device.createTexture(new TextureInfo(
                TextureType.TEX2D,
                TextureUsageBit.STORAGE | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                2,
                2,
                TextureFlagBit.NONE,
            ));
            const copyRegion = new BufferTextureCopy(0, 0, 0, new Offset(0, 0, 0), new Extent(2, 2, 1));
            device.copyBuffersToTexture([buffer], this._texture2D, [copyRegion]);
        }
        if (capabilities.maxTextureSize >= 2) {
            this._textureCube = device.createTexture(new TextureInfo(
                TextureType.CUBE,
                TextureUsageBit.STORAGE | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                2,
                2,
                TextureFlagBit.NONE,
                6,
            ));
            const copyRegion = new BufferTextureCopy(0, 0, 0, new Offset(0, 0, 0), new Extent(2, 2, 1));
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 1;
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 2;
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 3;
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 4;
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 5;
            device.copyBuffersToTexture([buffer], this._textureCube, [copyRegion]);
        }
        if (capabilities.max3DTextureSize >= 2) {
            this._texture3D = device.createTexture(new TextureInfo(
                TextureType.TEX3D,
                TextureUsageBit.STORAGE | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                2,
                2,
                TextureFlagBit.NONE,
                1,
                1,
                SampleCount.X1,
                2,
            ));
            const copyRegion = new BufferTextureCopy(0, 0, 0, new Offset(0, 0, 0), new Extent(2, 2, 2), new TextureSubresLayers(0, 0, 1));
            device.copyBuffersToTexture([buffer], this._texture3D, [copyRegion]);
        }
        if (capabilities.maxArrayTextureLayers >= 2) {
            this._texture2DArray = device.createTexture(new TextureInfo(
                TextureType.TEX2D_ARRAY,
                TextureUsageBit.STORAGE | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                2,
                2,
                TextureFlagBit.NONE,
                2,
            ));
            const copyRegion = new BufferTextureCopy(0, 0, 0, new Offset(0, 0, 0), new Extent(2, 2, 1), new TextureSubresLayers(0, 0, 1));
            device.copyBuffersToTexture([buffer], this._texture2DArray, [copyRegion]);
            copyRegion.texSubres.baseArrayLayer = 1;
            device.copyBuffersToTexture([buffer], this._texture2DArray, [copyRegion]);
        }
    }

    public getTexture (type: TextureType): Texture | null {
        switch (type) {
        case TextureType.TEX2D: return this._texture2D;
        case TextureType.TEX3D: return this._texture3D;
        case TextureType.CUBE: return this._textureCube;
        case TextureType.TEX2D_ARRAY: return this._texture2DArray;
        default: return null;
        }
    }
}
