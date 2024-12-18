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

import {
    FormatSurfaceSize,
    TextureInfo,
    IsPowerOf2,
    TextureViewInfo,
    ISwapchainTextureInfo,
    TextureHandle,
    FormatInfos,
    TextureUsageBit,
} from '../base/define';
import { Texture } from '../base/texture';
import { WebGPUDeviceManager } from './define';
import {
    GFXFormatToWGPUFormat,
    WebGPUCmdFuncCreateTexture,
    WebGPUCmdFuncDestroyTexture,
    WebGPUCmdFuncResizeTexture,
    WGPUFormatToGFXFormat,
} from './webgpu-commands';
import { IWebGPUTexture } from './webgpu-gpu-objects';

export class WebGPUTexture extends Texture {
    public getTextureHandle (): TextureHandle {
        const gpuTexture = this._gpuTexture;
        if (!gpuTexture) {
            return 0;
        }
        if (gpuTexture.gpuTexture) {
            return gpuTexture.gpuTexture;
        }
        return 0;
    }
    public initAsSwapchainTexture (info: Readonly<ISwapchainTextureInfo>): void {
        const texInfo = new TextureInfo();
        texInfo.format = info.format;
        texInfo.usage = FormatInfos[info.format].hasDepth ? TextureUsageBit.DEPTH_STENCIL_ATTACHMENT : TextureUsageBit.COLOR_ATTACHMENT;
        texInfo.width = info.width;
        texInfo.height = info.height;
        this.initialize(texInfo, true);
    }
    get gpuTexture (): IWebGPUTexture {
        return this._gpuTexture!;
    }

    private _gpuTexture: IWebGPUTexture | null = null;
    private _texDescriptor: GPUTextureDescriptor | null = null;
    private _lodLevel = 0;
    private _hasChange = false;
    get lodLevel (): number {
        return this._lodLevel;
    }
    get hasChange (): boolean {
        return this._hasChange;
    }
    public resetChange (): void {
        this._hasChange = false;
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

                // default value, filled in when texture is created.
                gpuTarget: '2d',
                gpuInternalFmt: 'rgba8unorm',
                gpuFormat: 'rgba8unorm',
                gpuType: 0,
                gpuUsage: GPUTextureUsage.RENDER_ATTACHMENT,
                gpuTexture: undefined,
                gpuRenderbuffer: null,
                gpuWrapS: 'clamp-to-edge',
                gpuWrapT: 'clamp-to-edge',
                gpuMinFilter: 'linear',
                gpuMagFilter: 'linear',
                getTextureView: this.getNativeTextureView.bind(this),

                isSwapchainTexture: isSwapchainTexture || false,
            };
            if (!isSwapchainTexture) {
                const device = WebGPUDeviceManager.instance;
                WebGPUCmdFuncCreateTexture(device, this._gpuTexture);
                device.memoryStatus.textureSize += this._size;
            } else {
                this._gpuTexture.gpuInternalFmt = GFXFormatToWGPUFormat(this._gpuTexture.format);
                this._gpuTexture.gpuFormat = this._gpuTexture.gpuInternalFmt;
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
            this._gpuTexture = (viewInfo.texture as WebGPUTexture)._gpuTexture;
        }
    }

    set gpuFormat (val: GPUTextureFormat) {
        if (!this._isTextureView && this._gpuTexture && !this._gpuTexture.isSwapchainTexture) {
            WebGPUCmdFuncDestroyTexture(this._gpuTexture);
            const device = WebGPUDeviceManager.instance;
            this._gpuTexture.format =  WGPUFormatToGFXFormat(val);
            WebGPUCmdFuncCreateTexture(device, this._gpuTexture);
            this._hasChange = true;
        }
    }

    public getNativeTextureView (): GPUTextureView | null {
        if (!this._gpuTexture || !this._gpuTexture.gpuTexture) {
            return null;
        }
        return this._gpuTexture.gpuTexture.createView({
            format: this.gpuTexture.gpuFormat,
            dimension: this._gpuTexture.gpuTarget,
            mipLevelCount: this._gpuTexture.mipLevel,
            arrayLayerCount: this.viewInfo.layerCount,
            baseMipLevel: 0,
            baseArrayLayer: 0,
        });
    }

    public destroy (): void {
        if (this._isTextureView || (!this._isTextureView && !this._gpuTexture)) {
            return;
        }
        WebGPUCmdFuncDestroyTexture(this._gpuTexture!);
        const device = WebGPUDeviceManager.instance;
        device.memoryStatus.textureSize -= this._size;
        this._gpuTexture = null;
        this._hasChange = true;
    }

    public resize (width: number, height: number): void {
        if (this._info.width === width && this._info.height === height) {
            return;
        }
        if (this._info.levelCount === WebGPUTexture.getLevelCount(this._info.width, this._info.height)) {
            this._info.levelCount = WebGPUTexture.getLevelCount(width, height);
        } else if (this._info.levelCount > 1) {
            this._info.levelCount = Math.min(this._info.levelCount, WebGPUTexture.getLevelCount(width, height));
        }
        this._hasChange = true;
        const oldSize = this._size;
        this._info.width = width;
        this._info.height = height;
        this._size = FormatSurfaceSize(
            this.info.format,
            this.width,
            this.height,
            this.depth,
            this.info.levelCount,
        ) * this.info.layerCount;

        if (!this._isTextureView && this._gpuTexture) {
            this._gpuTexture.width = width;
            this._gpuTexture.height = height;
            this._gpuTexture.size = this._size;
            if (!this._gpuTexture.isSwapchainTexture) {
                const device = WebGPUDeviceManager.instance;
                WebGPUCmdFuncResizeTexture(device, this._gpuTexture);
                device.memoryStatus.textureSize -= oldSize;
                device.memoryStatus.textureSize += this._size;
            }
        }
    }
}
