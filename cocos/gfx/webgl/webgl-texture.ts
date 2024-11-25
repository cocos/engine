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

import { FormatSurfaceSize, TextureInfo, TextureViewInfo, IsPowerOf2, ISwapchainTextureInfo, TextureUsageBit, FormatInfos } from '../base/define';
import { Texture } from '../base/texture';
import { WebGLCmdFuncCreateTexture, WebGLCmdFuncDestroyTexture, WebGLCmdFuncResizeTexture } from './webgl-commands';
import { WebGLDeviceManager } from './webgl-define';
import { IWebGLGPUTexture } from './webgl-gpu-objects';

export class WebGLTexture extends Texture {
    get gpuTexture (): IWebGLGPUTexture {
        return this._gpuTexture!;
    }

    get lodLevel (): number {
        return this._lodLevel;
    }

    private _gpuTexture: IWebGLGPUTexture | null = null;
    private _lodLevel = 0;

    constructor () {
        super();
    }

    public initialize (info: Readonly<TextureInfo> | Readonly<TextureViewInfo>, isSwapchainTexture?: boolean): void {
        let texInfo = info as Readonly<TextureInfo>;
        const viewInfo = info as Readonly<TextureViewInfo>;

        if ('texture' in info) {
            texInfo = viewInfo.texture.info;
            this._isTextureView = true;
        }

        this._info.copy(texInfo);

        this._isPowerOf2 = IsPowerOf2(this._info.width) && IsPowerOf2(this._info.height);
        this._size = FormatSurfaceSize(
            this._info.format,
            this.width,
            this.height,
            this.depth,
            this._info.levelCount,
        ) * this._info.layerCount;

        if (!this._isTextureView) {
            this._gpuTexture = {
                type: texInfo.type,
                format: texInfo.format,
                usage: texInfo.usage,
                width: texInfo.width,
                height: texInfo.height,
                depth: texInfo.depth,
                size: this._size,
                arrayLayer: texInfo.layerCount,
                mipLevel: texInfo.levelCount,
                samples: texInfo.samples,
                flags: texInfo.flags,
                isPowerOf2: this._isPowerOf2,

                glTarget: 0,
                glInternalFmt: 0,
                glFormat: 0,
                glType: 0,
                glUsage: 0,
                glTexture: null,
                glRenderbuffer: null,
                glWrapS: 0,
                glWrapT: 0,
                glMinFilter: 0,
                glMagFilter: 0,

                isSwapchainTexture: isSwapchainTexture || false,
            };

            if (!this._gpuTexture.isSwapchainTexture) {
                WebGLCmdFuncCreateTexture(WebGLDeviceManager.instance, this._gpuTexture);
                WebGLDeviceManager.instance.memoryStatus.textureSize += this._size;
            }

            this._viewInfo.texture = this;
            this._viewInfo.type = info.type;
            this._viewInfo.format = info.format;
            this._viewInfo.baseLevel = 0;
            this._viewInfo.levelCount = info.levelCount;
            this._viewInfo.baseLayer = 0;
            this._viewInfo.layerCount = info.layerCount;
        } else {
            this._viewInfo.copy(viewInfo);
            this._lodLevel = viewInfo.baseLevel;
            this._gpuTexture = (viewInfo.texture as WebGLTexture)._gpuTexture;
        }
    }

    public destroy (): void {
        if (!this._isTextureView && this._gpuTexture) {
            WebGLCmdFuncDestroyTexture(WebGLDeviceManager.instance, this._gpuTexture);
            WebGLDeviceManager.instance.memoryStatus.textureSize -= this._size;
            this._gpuTexture = null;
        }
    }

    public getTextureHandle (): number {
        const gpuTexture = this._gpuTexture;
        if (!gpuTexture) {
            return 0;
        }

        if (gpuTexture.glTexture) {
            return gpuTexture.glTexture as number;
        } else if (gpuTexture.glRenderbuffer) {
            return gpuTexture.glRenderbuffer as number;
        }

        return 0;
    }

    public resize (width: number, height: number): void {
        if (this._info.width === width && this._info.height === height) {
            return;
        }

        if (this._info.levelCount === WebGLTexture.getLevelCount(this._info.width, this._info.height)) {
            this._info.levelCount = WebGLTexture.getLevelCount(width, height);
        } else if (this._info.levelCount > 1) {
            this._info.levelCount = Math.min(this._info.levelCount, WebGLTexture.getLevelCount(width, height));
        }

        const oldSize = this._size;
        this._info.width = width;
        this._info.height = height;

        this._size = FormatSurfaceSize(
            this._info.format,
            this.width,
            this.height,
            this.depth,
            this._info.levelCount,
        ) * this._info.layerCount;

        if (!this._isTextureView && this._gpuTexture) {
            this._gpuTexture.width = width;
            this._gpuTexture.height = height;
            this._gpuTexture.size = this._size;
            if (!this._gpuTexture.isSwapchainTexture) {
                WebGLCmdFuncResizeTexture(WebGLDeviceManager.instance, this._gpuTexture);
                WebGLDeviceManager.instance.memoryStatus.textureSize -= oldSize;
                WebGLDeviceManager.instance.memoryStatus.textureSize += this._size;
            }
        }
    }

    // ======================= Swapchain Specific ======================= //

    /**
     * @engineInternal
     */
    public initAsSwapchainTexture (info: Readonly<ISwapchainTextureInfo>): void {
        const texInfo = new TextureInfo();
        texInfo.format = info.format;
        texInfo.usage = FormatInfos[info.format].hasDepth ? TextureUsageBit.DEPTH_STENCIL_ATTACHMENT : TextureUsageBit.COLOR_ATTACHMENT;
        texInfo.width = info.width;
        texInfo.height = info.height;
        this.initialize(texInfo, true);
    }
}
