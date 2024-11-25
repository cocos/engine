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

import { RenderPassInfo } from '../base/define';
import { RenderPass } from '../base/render-pass';
import { IWebGL2GPURenderPass } from './webgl2-gpu-objects';

export class WebGL2RenderPass extends RenderPass {
    constructor () {
        super();
    }

    public getGpuRenderPass$ (): IWebGL2GPURenderPass {
        return  this._gpuRenderPass!;
    }

    private _gpuRenderPass: IWebGL2GPURenderPass | null = null;

    public initialize (info: Readonly<RenderPassInfo>): void {
        this._colorInfos = info.colorAttachments;
        this._depthStencilInfo = info.depthStencilAttachment;
        this._subpasses = info.subpasses;

        this._gpuRenderPass = {
            colorAttachments$: this._colorInfos,
            depthStencilAttachment$: this._depthStencilInfo,
        };

        this._hash = this.computeHash();
    }

    public destroy (): void {
        this._gpuRenderPass = null;
    }
}
