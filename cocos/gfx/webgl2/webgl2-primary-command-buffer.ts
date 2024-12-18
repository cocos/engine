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

import { Buffer } from '../base/buffer';
import { CommandBuffer } from '../base/command-buffer';
import { BufferUsageBit, BufferTextureCopy, Color, Rect, BufferSource, DrawInfo, Viewport, TextureBlit, Filter } from '../base/define';
import { Framebuffer } from '../base/framebuffer';
import { InputAssembler } from '../base/input-assembler';
import { Texture } from '../base/texture';
import { WebGL2Buffer } from './webgl2-buffer';
import { WebGL2CommandBuffer } from './webgl2-command-buffer';
import {
    WebGL2CmdFuncBeginRenderPass, WebGL2CmdFuncBindStates, WebGL2CmdFuncBlitTexture, WebGL2CmdFuncCopyBuffersToTexture,
    WebGL2CmdFuncDraw, WebGL2CmdFuncUpdateBuffer } from './webgl2-commands';
import { WebGL2Framebuffer } from './webgl2-framebuffer';
import { WebGL2Texture } from './webgl2-texture';
import { RenderPass } from '../base/render-pass';
import { WebGL2RenderPass } from './webgl2-render-pass';
import { WebGL2DeviceManager } from './webgl2-define';
import { errorID } from '../../core/platform/debug';

export class WebGL2PrimaryCommandBuffer extends WebGL2CommandBuffer {
    constructor () {
        super();
    }

    public beginRenderPass (
        renderPass: RenderPass,
        framebuffer: Framebuffer,
        renderArea: Readonly<Rect>,
        clearColors: Readonly<Color[]>,
        clearDepth: number,
        clearStencil: number,
    ): void {
        WebGL2CmdFuncBeginRenderPass(
            WebGL2DeviceManager.instance,
            (renderPass as WebGL2RenderPass).getGpuRenderPass(),
            (framebuffer as WebGL2Framebuffer).getGpuFramebuffer(),
            renderArea,
            clearColors,
            clearDepth,
            clearStencil,
        );
        this._isInRenderPass = true;
    }

    public draw (infoOrAssembler: Readonly<DrawInfo> | Readonly<InputAssembler>): void {
        if (this._isInRenderPass) {
            if (this._isStateInvalid) {
                this.bindStates();
            }

            const info = 'drawInfo' in infoOrAssembler ? infoOrAssembler.drawInfo : infoOrAssembler;

            WebGL2CmdFuncDraw(WebGL2DeviceManager.instance, info as DrawInfo);

            ++this._numDrawCalls;
            this._numInstances += info.instanceCount;
            const indexCount = info.indexCount || info.vertexCount;
            if (this._curGPUPipelineState) {
                const glPrimitive = this._curGPUPipelineState.glPrimitive;
                switch (glPrimitive) {
                case 0x0004: { // WebGLRenderingContext.TRIANGLES
                    this._numTris += indexCount / 3 * Math.max(info.instanceCount, 1);
                    break;
                }
                case 0x0005: // WebGLRenderingContext.TRIANGLE_STRIP
                case 0x0006: { // WebGLRenderingContext.TRIANGLE_FAN
                    this._numTris += (indexCount - 2) * Math.max(info.instanceCount, 1);
                    break;
                }
                default:
                }
            }
        } else {
            errorID(16328);
        }
    }

    public setViewport (viewport: Readonly<Viewport>): void {
        const { gl } = WebGL2DeviceManager.instance;
        const cache = WebGL2DeviceManager.instance.getStateCache();

        if (cache.viewport.left !== viewport.left
            || cache.viewport.top !== viewport.top
            || cache.viewport.width !== viewport.width
            || cache.viewport.height !== viewport.height) {
            gl.viewport(viewport.left, viewport.top, viewport.width, viewport.height);

            cache.viewport.left = viewport.left;
            cache.viewport.top = viewport.top;
            cache.viewport.width = viewport.width;
            cache.viewport.height = viewport.height;
        }
    }

    public setScissor (scissor: Readonly<Rect>): void {
        const { gl } = WebGL2DeviceManager.instance;
        const cache = WebGL2DeviceManager.instance.getStateCache();

        if (cache.scissorRect.x !== scissor.x
            || cache.scissorRect.y !== scissor.y
            || cache.scissorRect.width !== scissor.width
            || cache.scissorRect.height !== scissor.height) {
            gl.scissor(scissor.x, scissor.y, scissor.width, scissor.height);

            cache.scissorRect.x = scissor.x;
            cache.scissorRect.y = scissor.y;
            cache.scissorRect.width = scissor.width;
            cache.scissorRect.height = scissor.height;
        }
    }

    public updateBuffer (buffer: Buffer, data: Readonly<BufferSource>, size?: number): void {
        if (!this._isInRenderPass) {
            const gpuBuffer = (buffer as WebGL2Buffer).getGpuBuffer();
            if (gpuBuffer) {
                let buffSize: number;
                if (size !== undefined) {
                    buffSize = size;
                } else if (buffer.usage & BufferUsageBit.INDIRECT) {
                    buffSize = 0;
                } else {
                    buffSize = (data as ArrayBuffer).byteLength;
                }

                WebGL2CmdFuncUpdateBuffer(WebGL2DeviceManager.instance, gpuBuffer, data as ArrayBuffer, 0, buffSize);
            }
        } else {
            errorID(16329);
        }
    }

    public copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void {
        if (!this._isInRenderPass) {
            const gpuTexture = (texture as WebGL2Texture).gpuTexture;
            if (gpuTexture) {
                WebGL2CmdFuncCopyBuffersToTexture(WebGL2DeviceManager.instance, buffers, gpuTexture, regions);
            }
        } else {
            errorID(16330);
        }
    }

    public execute (cmdBuffs: Readonly<CommandBuffer[]>, count: number): void {
        errorID(16402);
    }

    protected bindStates (): void {
        WebGL2CmdFuncBindStates(
            WebGL2DeviceManager.instance,
            this._curGPUPipelineState,
            this._curGPUInputAssembler,
            this._curGPUDescriptorSets,
            this._curDynamicOffsets,
            this._curDynamicStates,
        );
        this._isStateInvalid = false;
    }

    public blitTexture (srcTexture: Readonly<Texture>, dstTexture: Texture, regions: Readonly<TextureBlit []>, filter: Filter): void {
        const gpuTextureSrc = (srcTexture as WebGL2Texture).gpuTexture;
        const gpuTextureDst = (dstTexture as WebGL2Texture).gpuTexture;
        WebGL2CmdFuncBlitTexture(WebGL2DeviceManager.instance, gpuTextureSrc, gpuTextureDst, regions, filter);
    }
}
