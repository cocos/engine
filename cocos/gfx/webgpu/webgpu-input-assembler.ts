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

import { InputAssembler } from '../base/input-assembler';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUCmdFuncCreateInputAssember, WebGPUCmdFuncDestroyInputAssembler } from './webgpu-commands';
import { IWebGPUGPUInputAssembler, IWebGPUGPUBuffer } from './webgpu-gpu-objects';
import { InputAssemblerInfo } from '../base/define';
import { WebGPUDeviceManager } from './define';
import { errorID } from '../../core';

export class WebGPUInputAssembler extends InputAssembler {
    public get gpuInputAssembler (): IWebGPUGPUInputAssembler {
        return this._gpuInputAssembler!;
    }

    private _gpuInputAssembler: IWebGPUGPUInputAssembler | null = null;

    public initialize (info: Readonly<InputAssemblerInfo>): void {
        if (info.vertexBuffers.length === 0) {
            errorID(16331);
            return;
        }

        this._attributes = info.attributes;
        this._attributesHash = this.computeAttributesHash();
        this._vertexBuffers = info.vertexBuffers;

        if (info.indexBuffer) {
            this._indexBuffer = info.indexBuffer;
            this.drawInfo.indexCount = this._indexBuffer.size / this._indexBuffer.stride;
            this.drawInfo.firstIndex = 0;
        } else {
            const vertBuff = this._vertexBuffers[0];
            this.drawInfo.vertexCount = vertBuff.size / vertBuff.stride;
            this.drawInfo.firstVertex = 0;
            this.drawInfo.vertexOffset = 0;
        }

        this._drawInfo.instanceCount = 0;
        this._drawInfo.firstInstance = 0;

        this._indirectBuffer = info.indirectBuffer || null;
        const vertBuffSize = info.vertexBuffers.length;
        const gpuVertexBuffers: IWebGPUGPUBuffer[] = new Array<IWebGPUGPUBuffer>(vertBuffSize);
        for (let i = 0; i < vertBuffSize; ++i) {
            const vb = info.vertexBuffers[i] as WebGPUBuffer;
            if (vb.gpuBuffer) {
                gpuVertexBuffers[i] = vb.gpuBuffer;
            }
        }

        let gpuIndexBuffer: IWebGPUGPUBuffer | null = null;
        let gpuIndexType: GPUIndexFormat = 'uint16';
        if (info.indexBuffer) {
            gpuIndexBuffer = (info.indexBuffer as WebGPUBuffer).gpuBuffer;
            if (gpuIndexBuffer) {
                switch (gpuIndexBuffer.stride) {
                // case 1: gpuIndexType = 0x1401; break; // => WebGLRenderingContext.UNSIGNED_BYTE
                case 2: gpuIndexType = 'uint16'; break; // => WebGLRenderingContext.UNSIGNED_SHORT
                case 4: gpuIndexType = 'uint32'; break; // => WebGLRenderingContext.UNSIGNED_INT
                default: {
                    errorID(16332);
                }
                }
            }
        }

        let gpuIndirectBuffer: IWebGPUGPUBuffer | null = null;
        if (info.indirectBuffer) {
            gpuIndirectBuffer = (info.indirectBuffer as WebGPUBuffer).gpuBuffer;
        }

        this._gpuInputAssembler = {
            attributes: info.attributes,
            gpuVertexBuffers,
            gpuIndexBuffer,
            gpuIndirectBuffer,

            gpuAttribs: [],
            gpuIndexType,
        };

        WebGPUCmdFuncCreateInputAssember(WebGPUDeviceManager.instance, this._gpuInputAssembler);
    }

    public destroy (): void {
        const WebGPUDev = WebGPUDeviceManager.instance;
        if (this._gpuInputAssembler) {
            WebGPUCmdFuncDestroyInputAssembler(WebGPUDev, this._gpuInputAssembler);
        }
        this._gpuInputAssembler = null;
    }
}
