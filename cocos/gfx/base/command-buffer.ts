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

import { Buffer } from './buffer';
import { DescriptorSet } from './descriptor-set';
import { Framebuffer } from './framebuffer';
import { InputAssembler } from './input-assembler';
import { PipelineState } from './pipeline-state';
import { Queue } from './queue';
import { RenderPass } from './render-pass';
import { Texture } from './texture';
import {
    GFXObject,
    ObjectType,
    StencilFace,
    CommandBufferType,
    CommandBufferInfo,
    BufferTextureCopy, Color, Rect, Viewport, DrawInfo, Filter, TextureBlit,
} from './define';
import { GeneralBarrier } from './states/general-barrier';
import { TextureBarrier } from './states/texture-barrier';
import { BufferBarrier } from './states/buffer-barrier';

/**
 * @en GFX command buffer.
 * @zh GFX 命令缓冲。
 */

export abstract class CommandBuffer extends GFXObject {
    /**
     * @en Type of the command buffer.
     * @zh 命令缓冲类型。
     */
    get type (): CommandBufferType {
        return this._type;
    }

    /**
     * @en Type of the command buffer.
     * @zh 命令缓冲类型。
     */
    get queue (): Queue {
        return this._queue!;
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
     * @zh 绘制三角形数量。
     */
    get numTris (): number {
        return this._numTris;
    }

    protected _queue: Queue | null = null;
    protected _type: CommandBufferType = CommandBufferType.PRIMARY;
    protected _numDrawCalls = 0;
    protected _numInstances = 0;
    protected _numTris = 0;

    constructor () {
        super(ObjectType.COMMAND_BUFFER);
    }

    public abstract initialize (info: Readonly<CommandBufferInfo>): void;

    public abstract destroy (): void;

    /**
     * @en Begin recording commands.
     * @zh 开始记录命令。
     * @param renderPass [Secondary Command Buffer Only] The render pass the subsequent commands will be executed in
     * @param subpass [Secondary Command Buffer Only] The subpass the subsequent commands will be executed in
     * @param frameBuffer [Secondary Command Buffer Only, Optional] The framebuffer to be used in the subpass
     */
    public abstract begin (renderPass?: RenderPass, subpass?: number, frameBuffer?: Framebuffer): void;

    /**
     * @en End recording commands.
     * @zh 结束记录命令。
     */
    public abstract end (): void;

    /**
     * @en Begin render pass.
     * @zh 开始 RenderPass。
     * @param framebuffer The frame buffer used.
     * @param renderArea The target render area.
     * @param clearFlag The clear flags.
     * @param clearColors The clearing colors.
     * @param clearDepth The clearing depth.
     * @param clearStencil The clearing stencil.
     */
    public abstract beginRenderPass (renderPass: RenderPass, framebuffer: Framebuffer,
        renderArea: Readonly<Rect>, clearColors: Readonly<Color[]>, clearDepth: number, clearStencil: number): void;

    /**
     * @en End render pass.
     * @zh 结束 RenderPass。
     */
    public abstract endRenderPass (): void;

    /**
     * @en Bind pipeline state.
     * @zh 绑定 GFX 管线状态。
     * @param pipelineState The pipeline state to be bound.
     */
    public abstract bindPipelineState (pipelineState: PipelineState): void;

    /**
     * @en Bind a descriptor set. Note that the corresponding PiplieneState has to be bound first
     * before calling this function, or the dynamic offset specified may be invalidated.
     * @zh 绑定 GFX 描述符集。注意在调用此函数前，必须先绑定对应的 PipelineState，否则 dynamic offset 可能无效。
     * @param set The target descriptor set index.
     * @param descriptorSet The descriptor set to be bound.
     * @param dynamicOffsets The offset numbers for dynamic bindings.
     */
    public abstract bindDescriptorSet (set: number, descriptorSet: DescriptorSet, dynamicOffsets?: Readonly<number[]>): void;

    /**
     * @en Bind input assembler.
     * @zh 绑定 GFX 输入汇集器。
     * @param inputAssembler The input assembler to be bound.
     */
    public abstract bindInputAssembler (inputAssembler: InputAssembler): void;

    /**
     * @en Set viewport.
     * @zh 设置视口。
     * @param viewport The new viewport.
     */
    public abstract setViewport (viewport: Readonly<Viewport>): void;

    /**
     * @en Set scissor range.
     * @zh 设置剪裁区域。
     * @param scissor The new scissor range.
     */
    public abstract setScissor (scissor: Readonly<Rect>): void;

    /**
     * @en Set line width.
     * @zh 设置线宽。
     * @param lineWidth The new line width.
     */
    public abstract setLineWidth (lineWidth: number): void;

    /**
     * @en Set depth bias.
     * @zh 设置深度偏移。
     * @param depthBiasConstantFactor The new depth bias factor.
     * @param depthBiasClamp The new depth bias clamp threshold.
     * @param depthBiasSlopeFactor  The new depth bias slope factor.
     */
    public abstract setDepthBias (depthBiasConstantFactor: number, depthBiasClamp: number, depthBiasSlopeFactor: number): void;

    /**
     * @en Set blend constants.
     * @zh 设置混合因子。
     * @param blendConstants The new blend constants.
     */
    public abstract setBlendConstants (blendConstants: Readonly<Color>): void;

    /**
     * @en Set depth bound.
     * @zh 设置深度边界。
     * @param minDepthBounds The new minimum depth bound.
     * @param maxDepthBounds The new maximum depth bound.
     */
    public abstract setDepthBound (minDepthBounds: number, maxDepthBounds: number): void;

    /**
     * @en Set stencil write mask.
     * @zh 设置模板写掩码。
     * @param face The effective triangle face.
     * @param writeMask The new stencil write mask.
     */
    public abstract setStencilWriteMask (face: StencilFace, writeMask: number): void;

    /**
     * @en Set stencil compare mask.
     * @zh 设置模板比较掩码。
     * @param face The effective triangle face.
     * @param reference The new stencil reference constant.
     * @param compareMask The new stencil read mask.
     */
    public abstract setStencilCompareMask (face: StencilFace, reference: number, compareMask: number): void;

    /**
     * @en Draw the specified primitives.
     * @zh 绘制。
     * @param infoOrAssembler The draw call information.
     */
    public abstract draw (infoOrAssembler: Readonly<DrawInfo> | Readonly<InputAssembler>): void;

    /**
     * @en Update buffer.
     * @zh 更新缓冲。
     * @param buffer The buffer to be updated.
     * @param data The source data.
     * @param size Size in bytes to be updated.
     */
    public abstract updateBuffer (buffer: Buffer, data: Readonly<ArrayBuffer>, size?: number): void;

    /**
     * @en Copy buffer to texture.
     * @zh 拷贝缓冲到纹理。
     * @param srcBuff The buffer to be copied.
     * @param dstTex The texture to copy to.
     * @param dstLayout The target texture layout.
     * @param regions The region descriptions.
     */
    public abstract copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void;

    /**
     * @en Execute specified command buffers.
     * @zh 执行一组命令缓冲。
     * @param cmdBuffs The command buffers to be executed.
     * @param count The number of command buffers to be executed.
     */
    public abstract execute (cmdBuffs: Readonly<CommandBuffer[]>, count: number): void;

    /**
     * @en Insert pipeline memory barriers.
     * @zh 插入管线内存屏障。
     * @param barrier The global memory barrier to apply.
     * @param textureBarriers The texture memory barriers to apply.
     */
    public abstract pipelineBarrier (barrier: Readonly<GeneralBarrier> | null,
        bufferBarriers?: Readonly<BufferBarrier[]>,
        buffers?: Readonly<Buffer[]>,
        textureBarriers?: Readonly<TextureBarrier[]>,
        textures?: Readonly<Texture[]>): void;

    /**
     * @en blit data from regions of source texture to regions of destination texture.
     * @zh 将数据从源纹理的区域拷贝到目标纹理的区域。
     *
     * @param srcTexture The source texture.
     * @param dstTexture The destination texture.
     * @param regions The region descriptions.
     * @param filter The filter to use.
     */
    public abstract blitTexture(srcTexture: Readonly<Texture>, dstTexture: Texture, regions: Readonly<TextureBlit []>, filter: Filter): void;
}
