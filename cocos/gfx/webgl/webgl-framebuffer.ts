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
import { WebGLCmdFuncCreateFramebuffer, WebGLCmdFuncDestroyFramebuffer } from './webgl-commands';
import { WebGLDeviceManager } from './webgl-define';
import { IWebGLGPUFramebuffer, IWebGLGPUTexture } from './webgl-gpu-objects';
import { WebGLRenderPass } from './webgl-render-pass';

import { WebGLTexture as CCWebGLTexture } from './webgl-texture';

export class WebGLFramebuffer extends Framebuffer {
    get gpuFramebuffer (): IWebGLGPUFramebuffer {
        return  this._gpuFramebuffer!;
    }

    private _gpuFramebuffer: IWebGLGPUFramebuffer | null = null;
    private _gpuColorTextures: (WebGLTexture | null)[] = [];
    private _gpuDepthStencilTexture: WebGLTexture | null | undefined;

    constructor () {
        super();
    }

    get needRebuild (): boolean {
        if (this.gpuFramebuffer) {
            for (let i = 0; i < this.gpuFramebuffer.gpuColorTextures.length; i++) {
                if (this.gpuFramebuffer.gpuColorTextures[i].glTexture !== this._gpuColorTextures[i]) {
                    return true;
                }
            }
            if (this.gpuFramebuffer.gpuDepthStencilTexture?.glTexture !== this._gpuDepthStencilTexture) {
                return true;
            }
        }

        return false;
    }

    public initialize (info: Readonly<FramebufferInfo>): void {
        this._renderPass = info.renderPass;
        this._colorTextures = info.colorTextures || [];
        const depthStencilTexture: CCWebGLTexture = this._depthStencilTexture = info.depthStencilTexture  as CCWebGLTexture || null;

        let lodLevel = 0;

        const gpuColorTextures: IWebGLGPUTexture[] = [];
        for (let i = 0; i < info.colorTextures.length; ++i) {
            const colorTexture = info.colorTextures[i] as CCWebGLTexture;
            if (colorTexture) {
                gpuColorTextures.push(colorTexture.gpuTexture);
                lodLevel = colorTexture.lodLevel;
            }
        }

        let gpuDepthStencilTexture: IWebGLGPUTexture | null = null;
        if (depthStencilTexture) {
            gpuDepthStencilTexture = depthStencilTexture.gpuTexture;
            lodLevel = depthStencilTexture.lodLevel;
        }

        let width = Number.MAX_SAFE_INTEGER;
        let height = Number.MAX_SAFE_INTEGER;
        this._gpuFramebuffer = {
            gpuRenderPass: (info.renderPass as WebGLRenderPass).gpuRenderPass,
            gpuColorTextures,
            gpuDepthStencilTexture,
            glFramebuffer: null,
            isOffscreen: true,
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
            lodLevel,
        };

        WebGLCmdFuncCreateFramebuffer(WebGLDeviceManager.instance, this._gpuFramebuffer);
        this.gpuFramebuffer.gpuColorTextures.forEach((tex) => this._gpuColorTextures.push(tex.glTexture));
        this._gpuDepthStencilTexture = this.gpuFramebuffer.gpuDepthStencilTexture?.glTexture;
        this._width = this._gpuFramebuffer.width;
        this._height = this._gpuFramebuffer.height;
    }

    public destroy (): void {
        if (this._gpuFramebuffer) {
            WebGLCmdFuncDestroyFramebuffer(WebGLDeviceManager.instance, this._gpuFramebuffer);
            this._gpuFramebuffer = null;
            this._gpuColorTextures.length = 0;
            this._gpuDepthStencilTexture = null;
        }
    }
}
