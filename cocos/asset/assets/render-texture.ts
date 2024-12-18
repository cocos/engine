/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { ccclass } from 'cc.decorator';
import { EDITOR, TEST } from 'internal:constants';
import { clamp, cclegacy, errorID } from '../../core';
import { Texture, ColorAttachment, DepthStencilAttachment, GeneralBarrierInfo, AccessFlagBit, RenderPassInfo, Format, deviceManager,
    BufferTextureCopy, TextureFlags, TextureFlagBit } from '../../gfx';
import { RenderWindow, IRenderWindowInfo } from '../../render-scene/core/render-window';
import { Root } from '../../root';
import { TextureBase } from './texture-base';

export interface IRenderTextureCreateInfo {
    name?: string;
    width: number;
    height: number;
    passInfo?: RenderPassInfo;
    externalResLow?: number; // for vulkan vkImage/opengl es texture created from external
    externalResHigh?: number; // for vulkan vkImage created from external
    externalFlag?: TextureFlags; // external texture type normal or oes
}

const _colorAttachment = new ColorAttachment();
_colorAttachment.format = Format.RGBA8;
const _depthStencilAttachment = new DepthStencilAttachment();
_depthStencilAttachment.format = Format.DEPTH_STENCIL;
const passInfo = new RenderPassInfo([_colorAttachment], _depthStencilAttachment);

const _windowInfo: IRenderWindowInfo = {
    width: 1,
    height: 1,
    renderPassInfo: passInfo,
};

/**
 * @en Render texture is a render target for [[Camera]] or [[Canvas]] component,
 * the render pipeline will use its `RenderWindow` as the target of the rendering process.
 * @zh 渲染贴图是 [[Camera]] 或 [[Canvas]] 组件的渲染目标对象，渲染管线会使用它的 `RenderWindow` 作为渲染的目标窗口。
 */
@ccclass('cc.RenderTexture')
export class RenderTexture extends TextureBase {
    private _window: RenderWindow | null = null;
    constructor () {
        super();
    }

    /**
     * @en The render window for the render pipeline, it's created internally and cannot be modified.
     * @zh 渲染管线所使用的渲染窗口，内部逻辑创建，无法被修改。
     */
    get window (): RenderWindow | null {
        return this._window;
    }

    /**
     * @en Initialize the render texture. Using IRenderTextureCreateInfo.
     * @zh 初始化渲染贴图。设置渲染贴图的名称、尺寸、渲染通道信息。
     * @param info @en The create info of render texture. @zh 渲染贴图的创建信息。
     */
    public initialize (info: IRenderTextureCreateInfo): void {
        this._name = info.name || '';
        this._width = info.width;
        this._height = info.height;
        this._initWindow(info);
    }

    /**
     * @en Reset the render texture. User may change the name, size or render pass info of the render texture.
     * @zh 重新初始化渲染贴图。用户可以更改渲染贴图的名称、尺寸、渲染通道信息。
     * @param info @en The create info of render texture. @zh 渲染贴图的创建信息。
     */
    public reset (info: IRenderTextureCreateInfo): void { // to be consistent with other assets
        this.initialize(info);
    }

    /**
     * @en Destroy the render texture.
     * @zh 销毁渲染贴图。
     */
    public destroy (): boolean {
        if (this._window) {
            const root = cclegacy.director.root as Root;
            root?.destroyWindow(this._window);
            this._window = null;
        }

        return super.destroy();
    }

    /**
     * @en Resize the render texture.
     * @zh 修改渲染贴图的尺寸。
     * @param width @en The pixel width to resize to, the range is from 1 to 2048. @zh 需要调整到的像素宽度，范围为 1-2048。
     * @param height @en The pixel height to resize to, the range is from 1 to 2048. @zh 需要调整到的像素高度，范围为 1-2048。
     */
    public resize (width: number, height: number): void {
        this._width = Math.floor(clamp(width, 1, 2048));
        this._height = Math.floor(clamp(height, 1, 2048));
        if (this._window) {
            this._window.resize(this._width, this._height);
        }
        this.emit('resize', this._window);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _serialize (ctxForExporting: any): any {
        if (EDITOR || TEST) {
            return { base: super._serialize(ctxForExporting), w: this._width, h: this._height, n: this._name };
        }
        return {};
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _deserialize (serializedData: any, handle: any): void {
        const data = serializedData;
        this._width = data.w;
        this._height = data.h;
        this._name = data.n;
        super._deserialize(data.base, handle);
    }

    // To be compatible with material property interface
    /**
     * @en Gets the related [[gfx.Texture]] resource, it's also the color attachment for the render window.
     * @zh 获取渲染贴图的 GFX 资源，同时也是渲染窗口所指向的颜色缓冲贴图资源。
     * @return @en The low level gfx texture. @zh 底层的 gfx 贴图。
     */
    public getGFXTexture (): Texture | null {
        return this._window && this._window.framebuffer.colorTextures[0];
    }

    /**
     * @en Callback function after render texture is loaded in [[AssetManager]]. Initialize the render texture.
     * @zh 通过 [[AssetManager]] 加载完成时的回调，初始化渲染贴图。
     */
    public onLoaded (): void {
        this._initWindow();
    }

    /**
     * @en Implementation of the render texture initialization.
     * @zh 初始化渲染贴图的具体实现。
     * @param info @en The create info of render texture. @zh 渲染贴图的创建信息。
     * @engineInternal
     */
    protected _initWindow (info?: IRenderTextureCreateInfo): void {
        const root = cclegacy.director.root as Root;

        _windowInfo.title = this._name;
        _windowInfo.width = this._width;
        _windowInfo.height = this._height;
        _windowInfo.renderPassInfo = info && info.passInfo ? info.passInfo : passInfo;
        _windowInfo.externalResLow = info && info.externalResLow ? info.externalResLow : 0;
        _windowInfo.externalResHigh = info && info.externalResHigh ? info.externalResHigh : 0;
        _windowInfo.externalFlag = info && info.externalFlag ? info.externalFlag : TextureFlagBit.NONE;
        _windowInfo.renderPassInfo.colorAttachments.forEach((colorAttachment) => {
            colorAttachment.format = root.device.swapchainFormat;
        });

        _colorAttachment.barrier = deviceManager.gfxDevice.getGeneralBarrier(new GeneralBarrierInfo(
            AccessFlagBit.FRAGMENT_SHADER_READ_TEXTURE,
            AccessFlagBit.FRAGMENT_SHADER_READ_TEXTURE,
        ));

        if (this._window) {
            this._window.destroy();
            this._window.initialize(deviceManager.gfxDevice, _windowInfo);
        } else {
            this._window = root.createWindow(_windowInfo);
        }
    }

    /**
     * @en Initialize the render texture with uuid. The default size is 1x1.
     * @zh 初始化渲染贴图。使用 uuid 进行初始化，贴图的尺寸为 1x1。
     * @param uuid @en asset uuid. @zh 资源 uuid。
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        this._width = this._height = 1;
        this._initWindow();
    }

    /**
     * @en Validate the correctness of the render texture.
     * @zh 验证渲染贴图的正确性。
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public validate (): boolean {
        return this.width >= 1 && this.width <= 2048 && this.height >= 1 && this.height <= 2048;
    }

    /**
     * @en Read pixel buffer from render texture. @zh 从 render texture 读取像素数据。
     * @param x @en The location on x axis. @zh 起始位置X轴坐标。
     * @param y @en The location on y axis. @zh 起始位置Y轴坐标。
     * @param width @en The pixel width. @zh 像素宽度。
     * @param height @en The pixel height. @zh 像素高度。
     * @param buffer @en The buffer to hold pixel data. @zh 像素缓存。
     */
    public readPixels (x?: number, y?: number, width?: number, height?: number, buffer?: Uint8Array): Uint8Array | null {
        x = x || 0;
        y = y || 0;
        width = width || this.width;
        height = height || this.height;
        const gfxTexture = this.getGFXTexture();
        if (!gfxTexture) {
            errorID(7606);
            return null;
        }
        const needSize = 4 * width * height;
        if (buffer === undefined) {
            buffer = new Uint8Array(needSize);
        } else if (buffer.length < needSize) {
            errorID(7607, needSize);
            return null;
        }

        const gfxDevice = this._getGFXDevice();

        const bufferViews: ArrayBufferView[] = [];
        const regions: BufferTextureCopy[] = [];

        const region0 = new BufferTextureCopy();
        region0.texOffset.x = x;
        region0.texOffset.y = y;
        region0.texExtent.width = width;
        region0.texExtent.height = height;
        regions.push(region0);

        bufferViews.push(buffer);
        gfxDevice?.copyTextureToBuffers(gfxTexture, bufferViews, regions);
        return buffer;
    }
}

cclegacy.RenderTexture = RenderTexture;
