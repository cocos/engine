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

import { CommandBuffer } from '../base/command-buffer';
import { Queue } from '../base/queue';
import { WebGPUCommandBuffer } from './webgpu-command-buffer';
import { QueueInfo } from '../base/define';

export class WebGPUQueue extends Queue {
    public numDrawCalls = 0;
    public numInstances = 0;
    public numTris = 0;

    private _nativeQueue: GPUQueue | null = null;
    private _isAsync = false;
    public initialize (info: QueueInfo): boolean {
        this._type = info.type;

        return true;
    }

    public destroy (): void {
        // noop
    }

    public submit (cmdBuffs: CommandBuffer[]): void {
        // TODO: Async
        if (!this._isAsync) {
            const cmdBuffSize = cmdBuffs.length;
            for (let i = 0; i < cmdBuffSize; i++) {
                const cmdBuff = cmdBuffs[i] as WebGPUCommandBuffer;
                this.numDrawCalls += cmdBuff.numDrawCalls;
                this.numInstances += cmdBuff.numInstances;
                this.numTris += cmdBuff.numTris;
            }
        }
    }

    public clear (): void {
        this.numDrawCalls = 0;
        this.numInstances = 0;
        this.numTris = 0;
    }
}
