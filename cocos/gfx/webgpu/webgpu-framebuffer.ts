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

import { Framebuffer } from '../base/framebuffer';
import { IWebGPUGPUFramebuffer, IWebGPUTexture } from './webgpu-gpu-objects';
import { WebGPURenderPass } from './webgpu-render-pass';
import { WebGPUTexture } from './webgpu-texture';
import { FramebufferInfo } from '../base/define';

export class WebGPUFramebuffer extends Framebuffer {
    get gpuFramebuffer (): IWebGPUGPUFramebuffer {
        return this._gpuFramebuffer!;
    }

    private _gpuFramebuffer: IWebGPUGPUFramebuffer | null = null;
    public initialize (info: Readonly<FramebufferInfo>): void {
        this._renderPass = info.renderPass;
        this._colorTextures = info.colorTextures || [];
        this._depthStencilTexture = info.depthStencilTexture || null;

        const gpuColorTextures: IWebGPUTexture[] = [];
        let isOffscreen = true;
        const colorTexSize = info.colorTextures.length;
        for (let i = 0; i < colorTexSize; i++) {
            const colorTexture = info.colorTextures[i] as WebGPUTexture;
            if (colorTexture) {
                const gpuTex = colorTexture.gpuTexture;
                gpuColorTextures.push(gpuTex);
                if (gpuTex.isSwapchainTexture) {
                    isOffscreen = false;
                }
            }
        }

        let gpuDepthStencilTexture: IWebGPUTexture | null = null;
        if (info.depthStencilTexture) {
            gpuDepthStencilTexture = (info.depthStencilTexture as WebGPUTexture).gpuTexture;
        }
        let width = Number.MAX_SAFE_INTEGER;
        let height = Number.MAX_SAFE_INTEGER;
        this._gpuFramebuffer = {
            gpuRenderPass: (info.renderPass as WebGPURenderPass).gpuRenderPass,
            gpuColorTextures,
            gpuDepthStencilTexture,
            gpuFramebuffer: null,
            isOffscreen,
            get width (): number {
                if (this.gpuColorTextures.length > 0) {
                    return this.gpuColorTextures[0].width;
                } else if (this.gpuDepthStencilTexture) {
                    return this.gpuDepthStencilTexture.width;
                }
                return width;
            },
            set width (val) {
                width = val;
            },
            get height (): number {
                if (this.gpuColorTextures.length > 0) {
                    return this.gpuColorTextures[0].height;
                } else if (this.gpuDepthStencilTexture) {
                    return this.gpuDepthStencilTexture.height;
                }
                return height;
            },
            set height (val) {
                height = val;
            },
        };
        this._width = this._gpuFramebuffer.width;
        this._height = this._gpuFramebuffer.height;
    }

    public destroy (): void {
        if (this._gpuFramebuffer) {
            this._gpuFramebuffer = null;
        }
    }
}
