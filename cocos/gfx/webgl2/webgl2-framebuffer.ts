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

import { FramebufferInfo } from '../base/define';
import { Framebuffer } from '../base/framebuffer';
import { WebGL2CmdFuncCreateFramebuffer, WebGL2CmdFuncDestroyFramebuffer } from './webgl2-commands';
import { WebGL2DeviceManager } from './webgl2-define';
import { IWebGL2GPUFramebuffer, IWebGL2GPUTextureView } from './webgl2-gpu-objects';
import { WebGL2RenderPass } from './webgl2-render-pass';
import { WebGL2Texture } from './webgl2-texture';

export class WebGL2Framebuffer extends Framebuffer {
    constructor () {
        super();
    }

    getGpuFramebuffer (): IWebGL2GPUFramebuffer {
        return  this._gpuFramebuffer!;
    }

    private _gpuFramebuffer: IWebGL2GPUFramebuffer | null = null;
    private _gpuColorViews: (WebGLTexture | null)[] = [];
    private _gpuDepthStencilView: WebGLTexture | null | undefined;

    get needRebuild (): boolean {
        const gpuFramebuffer = this.getGpuFramebuffer();
        if (gpuFramebuffer) {
            for (let i = 0; i < gpuFramebuffer.gpuColorViews.length; i++) {
                if (gpuFramebuffer.gpuColorViews[i].gpuTexture.glTexture !== this._gpuColorViews[i]) {
                    return true;
                }
            }
            if (gpuFramebuffer.gpuDepthStencilView?.gpuTexture.glTexture !== this._gpuDepthStencilView) {
                return true;
            }
        }

        return false;
    }

    public initialize (info: Readonly<FramebufferInfo>): void {
        this._renderPass = info.renderPass;
        this._colorTextures = info.colorTextures || [];
        this._depthStencilTexture = info.depthStencilTexture || null;

        const gpuColorViews: IWebGL2GPUTextureView[] = [];
        for (let i = 0; i < info.colorTextures.length; i++) {
            const colorTexture = info.colorTextures[i] as WebGL2Texture;
            if (colorTexture) {
                gpuColorViews.push(colorTexture.gpuTextureView);
            }
        }

        let gpuDepthStencilView: IWebGL2GPUTextureView | null = null;
        if (info.depthStencilTexture) {
            gpuDepthStencilView = (info.depthStencilTexture as WebGL2Texture).gpuTextureView;
        }

        let width = Number.MAX_SAFE_INTEGER;
        let height = Number.MAX_SAFE_INTEGER;
        this._gpuFramebuffer = {
            gpuRenderPass: (info.renderPass as WebGL2RenderPass).getGpuRenderPass(),
            gpuColorViews: gpuColorViews,
            gpuDepthStencilView: gpuDepthStencilView,
            glFramebuffer: null,
            isOffscreen: true,
            get width (): number {
                if (this.gpuColorViews.length > 0) {
                    return this.gpuColorViews[0].gpuTexture.width;
                } else if (this.gpuDepthStencilView) {
                    return this.gpuDepthStencilView.gpuTexture.width;
                }
                return width;
            },
            set width (val) {
                width = val;
            },
            get height (): number {
                if (this.gpuColorViews.length > 0) {
                    return this.gpuColorViews[0].gpuTexture.height;
                } else if (this.gpuDepthStencilView) {
                    return this.gpuDepthStencilView.gpuTexture.height;
                }
                return height;
            },
            set height (val) {
                height = val;
            },
        };

        WebGL2CmdFuncCreateFramebuffer(WebGL2DeviceManager.instance, this._gpuFramebuffer);
        this._gpuFramebuffer.gpuColorViews.forEach((tex) => this._gpuColorViews.push(tex.gpuTexture.glTexture));
        this._gpuDepthStencilView = this._gpuFramebuffer.gpuDepthStencilView?.gpuTexture.glTexture;
        this._width = this._gpuFramebuffer.width;
        this._height = this._gpuFramebuffer.height;
    }

    public destroy (): void {
        if (this._gpuFramebuffer) {
            WebGL2CmdFuncDestroyFramebuffer(WebGL2DeviceManager.instance, this._gpuFramebuffer);
            this._gpuFramebuffer = null;
            this._gpuColorViews.length = 0;
            this._gpuDepthStencilView = null;
        }
    }
}
