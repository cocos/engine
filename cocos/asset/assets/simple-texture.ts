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

import { ccclass } from 'cc.decorator';
import { DEV } from 'internal:constants';
import { TextureFlagBit, TextureUsageBit, API, Texture, TextureInfo, TextureViewInfo, Device, BufferTextureCopy } from '../../gfx';
import { assertID, error, js, macro, cclegacy } from '../../core';
import { Filter } from './asset-enum';
import { ImageAsset } from './image-asset';
import { TextureBase } from './texture-base';
import dependUtil from '../asset-manager/depend-util';

const _regions: BufferTextureCopy[] = [new BufferTextureCopy()];

export type PresumedGFXTextureInfo = Pick<TextureInfo, 'usage' | 'flags' | 'format' | 'levelCount'>;
export type PresumedGFXTextureViewInfo = Pick<TextureViewInfo, 'texture' | 'format' | 'baseLevel' | 'levelCount'>;

function getMipLevel (width: number, height: number): number {
    let size = Math.max(width, height);
    let level = 0;
    while (size) { size >>= 1; level++; }
    return level;
}

function isPOT (n: number): boolean | 0 { return n && (n & (n - 1)) === 0; }
function canGenerateMipmap (device: Device, w: number, h: number): boolean | 0 {
    const needCheckPOT = device.gfxAPI === API.WEBGL;
    if (needCheckPOT) { return isPOT(w) && isPOT(h); }
    return true;
}

/**
 * @en The simple texture base class.
 * It create the GFX Texture and can set mipmap levels.
 * @zh 简单贴图基类。
 * 简单贴图内部创建了 GFX 贴图和该贴图上的 GFX 贴图视图。
 * 简单贴图允许指定不同的 Mipmap 层级。
 */
@ccclass('cc.SimpleTexture')
export class SimpleTexture extends TextureBase {
    /**
     * @engineInternal
     */
    protected _gfxTexture: Texture | null = null;
    /**
     * @engineInternal
     */
    protected _gfxTextureView: Texture | null = null;
    private _mipmapLevel = 1;
    // Cache these data to reduce JSB invoking.
    private _textureWidth = 0;
    private _textureHeight = 0;

    /**
     * @engineInternal
     */
    protected _baseLevel = 0;
    /**
     * @engineInternal
     */
    protected _maxLevel = 1000;

    constructor () {
        super();
    }

    /**
     * @en The mipmap level of the texture.
     * @zh 贴图中的 Mipmap 层级数量。
     */
    get mipmapLevel (): number {
        return this._mipmapLevel;
    }

    /**
     * @en The GFX Texture resource.
     * @zh 获取此贴图底层的 GFX 贴图对象。
     * @return @en The low level gfx texture. @zh 底层的 GFX 贴图。
     */
    public getGFXTexture (): Texture | null {
        return this._gfxTextureView;
    }

    public destroy (): boolean {
        this._tryDestroyTextureView();
        this._tryDestroyTexture();
        return super.destroy();
    }

    /**
     * @en Update the level 0 mipmap image.
     * @zh 更新 0 级 Mipmap。
     */
    public updateImage (): void {
        this.updateMipmaps(0);
    }

    /**
     * @en Update the given level mipmap image.
     * @zh 更新指定层级范围内的 Mipmap。当 Mipmap 数据发生了改变时应调用此方法提交更改。
     * 若指定的层级范围超出了实际已有的层级范围，只有覆盖的那些层级范围会被更新。
     * @param firstLevel @en First level to be updated. @zh 更新指定层的 mipmap。
     * @param count @en Mipmap level count to be updated。 @zh 指定要更新层的数量。
     */
    public updateMipmaps (firstLevel = 0, count: number | undefined = undefined): void {
        // empty
    }

    /**
     * @en Upload data to the given mipmap level.
     * The size of the image will affect how the mipmap is updated.
     * - When the image is an ArrayBuffer, the size of the image must match the mipmap size.
     * - If the image size matches the mipmap size, the mipmap data will be updated entirely.
     * - If the image size is smaller than the mipmap size, the mipmap will be updated from top left corner.
     * - If the image size is larger, an error will be raised
     * @zh 上传图像数据到指定层级的 Mipmap 中。
     * 图像的尺寸影响 Mipmap 的更新范围：
     * - 当图像是 `ArrayBuffer` 时，图像的尺寸必须和 Mipmap 的尺寸一致；否则，
     * - 若图像的尺寸与 Mipmap 的尺寸相同，上传后整个 Mipmap 的数据将与图像数据一致；
     * - 若图像的尺寸小于指定层级 Mipmap 的尺寸（不管是长或宽），则从贴图左上角开始，图像尺寸范围内的 Mipmap 会被更新；
     * - 若图像的尺寸超出了指定层级 Mipmap 的尺寸（不管是长或宽），都将引起错误。
     * @param source @en The source image or image data. @zh 源图像或图像数据。
     * @param level @en Mipmap level to upload the image to. @zh 要上传的 mipmap 层级。
     * @param arrayIndex @en The array index. @zh 要上传的数组索引。
     */
    public uploadData (source: HTMLCanvasElement | HTMLImageElement | ArrayBufferView | ImageBitmap, level = 0, arrayIndex = 0): void {
        if (!this._gfxTexture || this._mipmapLevel <= level) {
            return;
        }

        const gfxDevice = this._getGFXDevice();
        if (!gfxDevice) {
            return;
        }

        const region = _regions[0];
        region.texExtent.width = this._textureWidth >> level;
        region.texExtent.height = this._textureHeight >> level;
        region.texSubres.mipLevel = level;
        region.texSubres.baseArrayLayer = arrayIndex;

        if (DEV) {
            if (source instanceof HTMLElement) {
                if (source.height > region.texExtent.height
                    || source.width > region.texExtent.width) {
                    error(`Image source(${this.name}) bounds override.`);
                }
            }
        }

        if (ArrayBuffer.isView(source)) {
            gfxDevice.copyBuffersToTexture([source], this._gfxTexture, _regions);
        } else {
            gfxDevice.copyTexImagesToTexture([source], this._gfxTexture, _regions);
        }
    }

    /**
     * @engineInternal
     */
    protected _assignImage (image: ImageAsset, level: number, arrayIndex?: number): void {
        const data = image.data;
        if (!data) {
            return;
        }
        this.uploadData(data, level, arrayIndex);
        this._checkTextureLoaded();

        if (macro.CLEANUP_IMAGE_CACHE) {
            const deps = dependUtil.getDeps(this._uuid);
            const index = deps.indexOf(image._uuid);
            if (index !== -1) {
                js.array.fastRemoveAt(deps, index);
                image.decRef();
            }
        }
    }

    /**
     * @engineInternal
     */
    protected _checkTextureLoaded (): void {
        this._textureReady();
    }

    /**
     * @engineInternal
     */
    protected _textureReady (): void {
        this.loaded = true;
        this.emit('load');
    }

    /**
     * @en
     * Set mipmap level of this texture.
     * The value is passes as presumed info to `this._getGfxTextureCreateInfo()`.
     * @zh
     * 设置此贴图的 mipmap 层级
     * @param value The mipmap level.
     * @engineInternal
     *
     */
    protected _setMipmapLevel (value: number): void {
        this._mipmapLevel = value < 1 ? 1 : value;
    }

    /**
     * @engineInternal
     */
    protected _setMipRange (baseLevel: number, maxLevel: number): void {
        this._baseLevel = baseLevel < 1 ? 0 : baseLevel;
        this._maxLevel = maxLevel < 1 ? 0 : maxLevel;
    }

    /**
     * @en Set mipmap level range for this texture.
     * @zh 设置当前贴图的 mipmap 范围。
     * @param baseLevel @en The base mipmap level. @zh 最低 mipmap 等级。
     * @param maxLevel @en The maximum mipmap level. @zh 最高 mipmap 等级。
     */
    public setMipRange (baseLevel: number, maxLevel: number): void {
        assertID(baseLevel <= maxLevel, 3124);

        this._setMipRange(baseLevel, maxLevel);

        const device = this._getGFXDevice();
        if (!device) {
            return;
        }
        // create a new texture view before the destruction of the previous one to bypass the bug that
        // vulkan destroys textureview in use. This is a temporary solution, should be fixed later.
        const textureView = this._createTextureView(device);
        this._tryDestroyTextureView();
        this._gfxTextureView = textureView;
    }

    /**
     * @en This method is override by derived classes to provide GFX texture info.
     * @zh 这个方法被派生类重写以提供 GFX 纹理信息。
     * @param presumed The presumed GFX texture info.
     * @engineInternal
     */
    protected _getGfxTextureCreateInfo (presumed: PresumedGFXTextureInfo): TextureInfo | null {
        return null;
    }

    /**
     * @en This method is overrided by derived classes to provide GFX TextureViewInfo.
     * @zh 这个方法被派生类重写以提供 GFX 纹理视图信息。
     * @param presumed The presumed GFX TextureViewInfo.
     * @engineInternal
     */
    protected _getGfxTextureViewCreateInfo (presumed: PresumedGFXTextureViewInfo): TextureViewInfo | null {
        return null;
    }

    /**
     * @engineInternal
     */
    protected _tryReset (): void {
        this._tryDestroyTextureView();
        this._tryDestroyTexture();
        if (this._mipmapLevel === 0) {
            return;
        }
        const device = this._getGFXDevice();
        if (!device) {
            return;
        }
        this._createTexture(device);
        this._gfxTextureView = this._createTextureView(device);
    }

    /**
     * @en Whether mipmaps are baked convolutional maps.
     * @zh mipmaps 是否为烘焙出来的卷积图。
     */
    public isUsingOfflineMipmaps (): boolean {
        return false;
    }

    /**
     * @engineInternal
     */
    protected _createTexture (device: Device): void {
        if (this._width === 0 || this._height === 0) { return; }
        let flags = TextureFlagBit.NONE;
        if (this._mipFilter !== Filter.NONE && canGenerateMipmap(device, this._width, this._height)) {
            this._mipmapLevel = getMipLevel(this._width, this._height);
            if (!this.isUsingOfflineMipmaps() && !this.isCompressed) {
                flags = TextureFlagBit.GEN_MIPMAP;
            }
        }
        const textureCreateInfo = this._getGfxTextureCreateInfo({
            usage: TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_DST | TextureUsageBit.COLOR_ATTACHMENT,
            format: this._getGFXFormat(),
            levelCount: this._mipmapLevel,
            flags,
        });
        if (!textureCreateInfo) {
            return;
        }

        const texture = device.createTexture(textureCreateInfo);
        this._textureWidth = textureCreateInfo.width;
        this._textureHeight = textureCreateInfo.height;

        this._gfxTexture = texture;
    }

    /**
     * @engineInternal
     */
    protected _createTextureView (device: Device): Texture | null {
        if (!this._gfxTexture) {
            return null;
        }
        const maxLevel = this._maxLevel < this._mipmapLevel ? this._maxLevel : this._mipmapLevel - 1;
        const textureViewCreateInfo = this._getGfxTextureViewCreateInfo({
            texture: this._gfxTexture,
            format: this._getGFXFormat(),
            baseLevel: this._baseLevel,
            levelCount: maxLevel - this._baseLevel + 1,
        });
        if (!textureViewCreateInfo) {
            return null;
        }

        return device.createTexture(textureViewCreateInfo);
    }

    /**
     * @engineInternal
     */
    protected _tryDestroyTexture (): void {
        if (this._gfxTexture) {
            this._gfxTexture.destroy();
            this._gfxTexture = null;
        }
    }

    /**
     * @engineInternal
     */
    protected _tryDestroyTextureView (): void {
        if (this._gfxTextureView) {
            this._gfxTextureView.destroy();
            this._gfxTextureView = null;
        }
    }
}

cclegacy.SimpleTexture = SimpleTexture;
