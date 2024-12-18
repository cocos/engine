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
import { BufferSource, DrawInfo, BufferTextureCopy, Color, Rect, BufferUsageBit, Viewport, TextureBlit, Filter } from '../base/define';
import { Framebuffer } from '../base/framebuffer';
import { InputAssembler } from '../base/input-assembler';
import { Texture } from '../base/texture';
import { WebGLBuffer } from './webgl-buffer';
import { WebGLCommandBuffer } from './webgl-command-buffer';
import {
    WebGLCmdFuncBeginRenderPass, WebGLCmdFuncBindStates, WebGLCmdFuncBlitTexture, WebGLCmdFuncCopyBuffersToTexture,
    WebGLCmdFuncDraw, WebGLCmdFuncUpdateBuffer } from './webgl-commands';
import { WebGLFramebuffer } from './webgl-framebuffer';
import { WebGLTexture } from './webgl-texture';
import { RenderPass } from '../base/render-pass';
import { WebGLRenderPass } from './webgl-render-pass';
import { WebGLDeviceManager } from './webgl-define';
import { error, errorID } from '../../core/platform/debug';
import { WebGLConstants } from '../gl-constants';

export class WebGLPrimaryCommandBuffer extends WebGLCommandBuffer {
    public beginRenderPass (
        renderPass: RenderPass,
        framebuffer: Framebuffer,
        renderArea: Readonly<Rect>,
        clearColors: Readonly<Color[]>,
        clearDepth: number,
        clearStencil: number,
    ): void {
        WebGLCmdFuncBeginRenderPass(
            WebGLDeviceManager.instance,
            (renderPass as WebGLRenderPass).gpuRenderPass,
            (framebuffer as WebGLFramebuffer).gpuFramebuffer,
            renderArea,
            clearColors,
            clearDepth,
            clearStencil,
        );
        this._isInRenderPass = true;
    }

    public draw (infoOrAssembler: DrawInfo | InputAssembler): void {
        if (this._isInRenderPass) {
            if (this._isStateInvalied) {
                this.bindStates();
            }

            const info = 'drawInfo' in infoOrAssembler ? infoOrAssembler.drawInfo : infoOrAssembler;

            WebGLCmdFuncDraw(WebGLDeviceManager.instance, info);

            ++this._numDrawCalls;
            this._numInstances += info.instanceCount;
            const indexCount = info.indexCount || info.vertexCount;
            if (this._curGPUPipelineState) {
                const glPrimitive = this._curGPUPipelineState.glPrimitive;
                switch (glPrimitive) {
                case WebGLConstants.TRIANGLES: {
                    this._numTris += indexCount / 3 * Math.max(info.instanceCount, 1);
                    break;
                }
                case WebGLConstants.TRIANGLE_STRIP:
                case WebGLConstants.TRIANGLE_FAN: {
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
        const { stateCache: cache, gl } = WebGLDeviceManager.instance;

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
        const { stateCache: cache, gl } = WebGLDeviceManager.instance;

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
            const gpuBuffer = (buffer as WebGLBuffer).gpuBuffer;
            if (gpuBuffer) {
                let buffSize: number;
                if (size !== undefined) {
                    buffSize = size;
                } else if (buffer.usage & BufferUsageBit.INDIRECT) {
                    buffSize = 0;
                } else {
                    buffSize = (data as ArrayBuffer).byteLength;
                }

                WebGLCmdFuncUpdateBuffer(WebGLDeviceManager.instance, gpuBuffer, data as ArrayBuffer, 0, buffSize);
            }
        } else {
            errorID(16329);
        }
    }

    public copyBuffersToTexture (buffers: Readonly<ArrayBufferView[]>, texture: Texture, regions: Readonly<BufferTextureCopy[]>): void {
        if (!this._isInRenderPass) {
            const gpuTexture = (texture as WebGLTexture).gpuTexture;
            if (gpuTexture) {
                WebGLCmdFuncCopyBuffersToTexture(WebGLDeviceManager.instance, buffers, gpuTexture, regions);
            }
        } else {
            errorID(16330);
        }
    }

    public execute (cmdBuffs: Readonly<CommandBuffer[]>, count: number): void {
        errorID(16402);
    }

    protected bindStates (): void {
        WebGLCmdFuncBindStates(
            WebGLDeviceManager.instance,
            this._curGPUPipelineState,
            this._curGPUInputAssembler,
            this._curGPUDescriptorSets,
            this._curDynamicOffsets,
            this._curDynamicStates,
        );
        this._isStateInvalied = false;
    }

    public blitTexture (srcTexture: Readonly<Texture>, dstTexture: Texture, regions: Readonly<TextureBlit []>, filter: Filter): void {
        const gpuTextureSrc = (srcTexture as WebGLTexture).gpuTexture;
        const gpuTextureDst = (dstTexture as WebGLTexture).gpuTexture;
        WebGLCmdFuncBlitTexture(WebGLDeviceManager.instance, gpuTextureSrc, gpuTextureDst, regions, filter);
    }
}
