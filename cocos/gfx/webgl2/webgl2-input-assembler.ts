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

import { errorID } from '../../core/platform/debug';
import { InputAssemblerInfo } from '../base/define';
import { InputAssembler } from '../base/input-assembler';
import { WebGLConstants } from '../gl-constants';
import { WebGL2Buffer } from './webgl2-buffer';
import { WebGL2CmdFuncCreateInputAssember, WebGL2CmdFuncDestroyInputAssembler } from './webgl2-commands';
import { WebGL2DeviceManager } from './webgl2-define';
import { IWebGL2GPUInputAssembler, IWebGL2GPUBuffer } from './webgl2-gpu-objects';

export class WebGL2InputAssembler extends InputAssembler {
    constructor () {
        super();
    }

    public get gpuInputAssembler (): IWebGL2GPUInputAssembler {
        return  this._gpuInputAssembler!;
    }

    private _gpuInputAssembler: IWebGL2GPUInputAssembler | null = null;

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
            this._drawInfo.indexCount = this._indexBuffer.size / this._indexBuffer.stride;
            this._drawInfo.firstIndex = 0;
        } else {
            const vertBuff = this._vertexBuffers[0];
            this._drawInfo.vertexCount = vertBuff.size / vertBuff.stride;
            this._drawInfo.firstVertex = 0;
            this._drawInfo.vertexOffset = 0;
        }
        this._drawInfo.instanceCount = 0;
        this._drawInfo.firstInstance = 0;

        this._indirectBuffer = info.indirectBuffer || null;

        const gpuVertexBuffers: IWebGL2GPUBuffer[] = new Array<IWebGL2GPUBuffer>(info.vertexBuffers.length);
        for (let i = 0; i < info.vertexBuffers.length; ++i) {
            const vb = info.vertexBuffers[i] as WebGL2Buffer;
            if (vb.getGpuBuffer()) {
                gpuVertexBuffers[i] = vb.getGpuBuffer();
            }
        }

        let gpuIndexBuffer: IWebGL2GPUBuffer | null = null;
        let glIndexType = 0;
        if (info.indexBuffer) {
            gpuIndexBuffer = (info.indexBuffer as WebGL2Buffer).getGpuBuffer();
            if (gpuIndexBuffer) {
                switch (gpuIndexBuffer.stride) {
                case 1: glIndexType = WebGLConstants.UNSIGNED_BYTE; break;
                case 2: glIndexType = WebGLConstants.UNSIGNED_SHORT; break;
                case 4: glIndexType = WebGLConstants.UNSIGNED_INT; break;
                default: {
                    errorID(16332);
                }
                }
            }
        }

        let gpuIndirectBuffer: IWebGL2GPUBuffer | null = null;
        if (info.indirectBuffer) {
            gpuIndirectBuffer = (info.indirectBuffer as WebGL2Buffer).getGpuBuffer();
        }

        this._gpuInputAssembler = {
            attributes: info.attributes,
            gpuVertexBuffers,
            gpuIndexBuffer,
            gpuIndirectBuffer,

            glAttribs: [],
            glIndexType,
            glVAOs: new Map<WebGLProgram, WebGLVertexArrayObject>(),
        };

        WebGL2CmdFuncCreateInputAssember(WebGL2DeviceManager.instance, this._gpuInputAssembler);
    }

    public destroy (): void {
        const device = WebGL2DeviceManager.instance;
        if (this._gpuInputAssembler && device.extensions.useVAO) {
            WebGL2CmdFuncDestroyInputAssembler(device, this._gpuInputAssembler);
        }
        this._gpuInputAssembler = null;
    }
}
