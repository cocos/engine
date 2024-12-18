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

import { warnID } from '../../core/platform/debug';
import { Buffer } from '../base/buffer';
import { BufferUsageBit, BufferSource, BufferInfo, BufferViewInfo } from '../base/define';
import {
    WebGL2CmdFuncCreateBuffer,
    WebGL2CmdFuncDestroyBuffer,
    WebGL2CmdFuncResizeBuffer,
    WebGL2CmdFuncUpdateBuffer,
} from './webgl2-commands';
import { WebGL2DeviceManager } from './webgl2-define';
import { IWebGL2GPUBuffer, WebGL2IndirectDrawInfos } from './webgl2-gpu-objects';

export class WebGL2Buffer extends Buffer {
    constructor () {
        super();
    }

    getGpuBuffer (): IWebGL2GPUBuffer {
        return  this._gpuBuffer!;
    }

    private _gpuBuffer: IWebGL2GPUBuffer | null = null;

    public initialize (info: Readonly<BufferInfo> | Readonly<BufferViewInfo>): void {
        if ('buffer' in info) { // buffer view
            this._isBufferView = true;

            const buffer = info.buffer as WebGL2Buffer;

            this._usage = buffer.usage;
            this._memUsage = buffer.memUsage;
            this._size = this._stride = info.range;
            this._count = 1;
            this._flags = buffer.flags;

            this._gpuBuffer = {
                usage: this._usage,
                memUsage: this._memUsage,
                size: this._size,
                stride: this._stride,
                buffer: null,
                indirects: buffer.getGpuBuffer().indirects,
                glTarget: buffer.getGpuBuffer().glTarget,
                glBuffer: buffer.getGpuBuffer().glBuffer,
                glOffset: info.offset,
            };
        } else { // native buffer
            this._usage = info.usage;
            this._memUsage = info.memUsage;
            this._size = info.size;
            this._stride = Math.max(info.stride || this._size, 1);
            this._count = this._size / this._stride;
            this._flags = info.flags;

            this._gpuBuffer = {
                usage: this._usage,
                memUsage: this._memUsage,
                size: this._size,
                stride: this._stride,
                buffer: null,
                indirects: new WebGL2IndirectDrawInfos(),
                glTarget: 0,
                glBuffer: null,
                glOffset: 0,
            };

            WebGL2CmdFuncCreateBuffer(WebGL2DeviceManager.instance, this._gpuBuffer);

            WebGL2DeviceManager.instance.memoryStatus.bufferSize += this._size;
        }
    }

    public destroy (): void {
        if (this._gpuBuffer) {
            if (!this._isBufferView) {
                WebGL2CmdFuncDestroyBuffer(WebGL2DeviceManager.instance, this._gpuBuffer);
                WebGL2DeviceManager.instance.memoryStatus.bufferSize -= this._size;
            }
            this._gpuBuffer = null;
        }
    }

    public resize (size: number): void {
        if (this._isBufferView) {
            warnID(16379);
            return;
        }

        const oldSize = this._size;
        if (oldSize === size) { return; }

        this._size = size;
        this._count = this._size / this._stride;

        if (this._gpuBuffer) {
            this._gpuBuffer.size = size;
            if (size > 0) {
                WebGL2CmdFuncResizeBuffer(WebGL2DeviceManager.instance, this._gpuBuffer);
                WebGL2DeviceManager.instance.memoryStatus.bufferSize -= oldSize;
                WebGL2DeviceManager.instance.memoryStatus.bufferSize += size;
            }
        }
    }

    public update (buffer: Readonly<BufferSource>, size?: number): void {
        if (this._isBufferView) {
            warnID(16380);
            return;
        }

        let buffSize: number;
        if (size !== undefined) {
            buffSize = size;
        } else if (this._usage & BufferUsageBit.INDIRECT) {
            buffSize = 0;
        } else {
            buffSize = (buffer as ArrayBuffer).byteLength;
        }

        WebGL2CmdFuncUpdateBuffer(
            WebGL2DeviceManager.instance,
            this._gpuBuffer!,
            buffer as BufferSource,
            0,
            buffSize,
        );
    }
}
