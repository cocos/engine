/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { EDITOR, TEST } from 'internal:constants';
import { ccclass, type } from 'cc.decorator';
import { TextureType, TextureInfo, TextureViewInfo } from '../../gfx';
import { PixelFormat } from './asset-enum';
import { ImageAsset } from './image-asset';
import { PresumedGFXTextureInfo, PresumedGFXTextureViewInfo, SimpleTexture } from './simple-texture';
import { js, cclegacy } from '../../core';

/**
 * @en The create information for [[Texture2D]].
 * @zh 用来创建贴图的信息。
 */
export interface ITexture2DCreateInfo {
    /**
     * @en The pixel width.
     * @zh 像素宽度。
     */
    width: number;

    /**
     * @en The pixel height.
     * @zh 像素高度。
     */
    height: number;

    /**
     * @en The pixel format.
     * @zh 像素格式。
     * @default PixelFormat.RGBA8888
     */
    format?: PixelFormat;

    /**
     * @en The mipmap level count.
     * @zh mipmap 层级。
     * @default 1
     */
    mipmapLevel?: number;

    /**
     * @en The selected base mipmap level.
     * @zh 选择使用的最小 mipmap 层级。
     * @default 1
     */
    baseLevel?: number;

    /**
     * @en The selected maximum mipmap level.
     * @zh 选择使用的最大 mipmap 层级。
     * @default 1000
     */
    maxLevel?: number;
}

/**
 * @en The 2D texture asset. It supports mipmap, each level of mipmap use an [[ImageAsset]].
 * @zh 二维贴图资源。二维贴图资源的每个 Mipmap 层级都为一张 [[ImageAsset]]。
 */
@ccclass('cc.Texture2D')
export class Texture2D extends SimpleTexture {
    constructor () {
        super();
    }

    /**
     * @en All levels of mipmap images, be noted, automatically generated mipmaps are not included.
     * When setup mipmap, the size of the texture and pixel format could be modified.
     * @zh 所有层级 Mipmap，注意，这里不包含自动生成的 Mipmap。
     * 当设置 Mipmap 时，贴图的尺寸以及像素格式可能会改变。
     */
    get mipmaps (): ImageAsset[] {
        return this._mipmaps;
    }
    set mipmaps (value) {
        this._mipmaps = value;

        const mipmaps: ImageAsset[] = [];
        if (value.length === 1) {
            // might contain auto generated mipmaps
            const image = value[0];
            mipmaps.push(...image.extractMipmaps());
        } else if (value.length > 1) {
            // image asset mip0 as mipmaps
            for (let i = 0; i < value.length; ++i) {
                const image = value[i];
                mipmaps.push(image.extractMipmap0());
            }
        }

        this._setMipmapParams(mipmaps);
    }

    /**
     * TODO: See: cocos/cocos-engine#15305
     */
    private _setMipmapParams (value: ImageAsset[]): void {
        this._generatedMipmaps = value;
        this._setMipmapLevel(this._generatedMipmaps.length);
        if (this._generatedMipmaps.length > 0) {
            const imageAsset: ImageAsset = this._generatedMipmaps[0];
            this.reset({
                width: imageAsset.width,
                height: imageAsset.height,
                format: imageAsset.format,
                mipmapLevel: this._generatedMipmaps.length,
                baseLevel: this._baseLevel,
                maxLevel: this._maxLevel,
            });
            this._generatedMipmaps.forEach((mipmap, level) => {
                this._assignImage(mipmap, level);
            });
            //
        } else {
            this.reset({
                width: 0,
                height: 0,
                mipmapLevel: this._generatedMipmaps.length,
                baseLevel: this._baseLevel,
                maxLevel: this._maxLevel,
            });
        }
    }

    /**
     * @en Level 0 mipmap image.
     * Be noted, `this.image = img` equals `this.mipmaps = [img]`,
     * sets image will clear all previous mipmaps.
     * @zh 0 级 Mipmap。
     * 注意，`this.image = img` 等价于 `this.mipmaps = [img]`，
     * 也就是说，通过 `this.image` 设置 0 级 Mipmap 时将隐式地清除之前的所有 Mipmap。
     */
    get image (): ImageAsset | null {
        return this._mipmaps.length === 0 ? null : this._mipmaps[0];
    }

    set image (value) {
        this.mipmaps = value ? [value] : [];
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @type([ImageAsset])
    public _mipmaps: ImageAsset[] = [];

    private _generatedMipmaps: ImageAsset[] = [];

    /**
     * @engineInternal
     */
    public initialize (): void {
        this.mipmaps = this._mipmaps;
    }

    public onLoaded (): void {
        this.initialize();
    }

    /**
     * @en Reset the current texture with given size, pixel format and mipmap images.
     * After reset, the gfx resource will become invalid, you must use [[uploadData]] explicitly to upload the new mipmaps to GPU resources.
     * @zh 将当前贴图重置为指定尺寸、像素格式以及指定 mipmap 层级。重置后，贴图的像素数据将变为未定义。
     * mipmap 图像的数据不会自动更新到贴图中，你必须显式调用 [[uploadData]] 来上传贴图数据。
     * @param info @en The create information. @zh 创建贴图的相关信息。
     */
    public reset (info: ITexture2DCreateInfo): void {
        this._width = info.width;
        this._height = info.height;
        this._setGFXFormat(info.format);
        const mipLevels = info.mipmapLevel === undefined ? 1 : info.mipmapLevel;
        this._setMipmapLevel(mipLevels);
        const minLod = info.baseLevel === undefined ? 0 : info.baseLevel;
        const maxLod = info.maxLevel === undefined ? 1000 : info.maxLevel;
        this._setMipRange(minLod, maxLod);
        this._tryReset();
    }

    /**
     * @en Reset the current texture with given size, pixel format and mipmap images.
     * After reset, the gfx resource will become invalid, you must use [[uploadData]] explicitly to upload the new mipmaps to GPU resources.
     * @zh 将当前贴图重置为指定尺寸、像素格式以及指定 mipmap 层级。重置后，贴图的像素数据将变为未定义。
     * mipmap 图像的数据不会自动更新到贴图中，你必须显式调用 [[uploadData]] 来上传贴图数据。
     * @param width Pixel width
     * @param height Pixel height
     * @param format Pixel format
     * @param mipmapLevel Mipmap level count
     * @param baseLevel Mipmap base level
     * @param maxLevel Mipmap maximum level
     * @deprecated since v1.0 please use [[reset]] instead
     */
    public create (width: number, height: number, format = PixelFormat.RGBA8888, mipmapLevel = 1, baseLevel = 0, maxLevel = 1000): void {
        this.reset({
            width,
            height,
            format,
            mipmapLevel,
            baseLevel,
            maxLevel,
        });
    }

    public toString (): string {
        return this._mipmaps.length !== 0 ? this._mipmaps[0].url : '';
    }

    public updateMipmaps (firstLevel = 0, count: number | undefined = undefined): void {
        if (firstLevel >= this._generatedMipmaps.length) {
            return;
        }

        const nUpdate = Math.min(
            count === undefined ? this._generatedMipmaps.length : count,
            this._generatedMipmaps.length - firstLevel,
        );

        for (let i = 0; i < nUpdate; ++i) {
            const level = firstLevel + i;
            this._assignImage(this._generatedMipmaps[level], level);
        }
    }

    /**
     * @en If the level 0 mipmap image is a HTML element, then return it, otherwise return null.
     * @zh 若此贴图 0 级 Mipmap 的图像资源的实际源存在并为 HTML 元素则返回它，否则返回 `null`。
     * @returns @en HTMLElement or `null`. @zh HTML 元素或者 null。
     * @deprecated Please use [[ImageAsset.data]] instead
     */
    public getHtmlElementObj (): HTMLCanvasElement | HTMLImageElement | null {
        return (this._mipmaps[0] && (this._mipmaps[0].data instanceof HTMLElement)) ? this._mipmaps[0].data : null;
    }

    /**
     * @en Destroy the current 2d texture, clear up all mipmap levels and the related GPU resources.
     * @zh 销毁此贴图，清空所有 Mipmap 并释放占用的 GPU 资源。
     */
    public destroy (): boolean {
        this._mipmaps = [];
        this._generatedMipmaps = [];
        return super.destroy();
    }

    /**
     * @en Gets the description of the 2d texture.
     * @zh 返回此贴图的描述。
     * @returns @en The description. @zh 贴图的描述信息。
     */
    public description (): string {
        const url = this._mipmaps[0] ? this._mipmaps[0].url : '';
        return `<cc.Texture2D | Name = ${url} | Dimension = ${this.width} x ${this.height}>`;
    }

    /**
     * @en Release used GPU resources.
     * @zh 释放占用的 GPU 资源。
     * @deprecated please use [[destroy]] instead.
     */
    public releaseTexture (): void {
        this.destroy();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _serialize (ctxForExporting: any): {
        base: any;
        mipmaps: (string | null)[];
    } | null {
        if (EDITOR || TEST) {
            return {
                base: super._serialize(ctxForExporting),
                mipmaps: this._mipmaps.map((mipmap) => {
                    if (!mipmap || !mipmap._uuid) {
                        return null;
                    }
                    if (ctxForExporting && ctxForExporting._compressUuid) {
                        // ctxForExporting.dependsOn('_textureSource', texture); TODO
                        return EditorExtends.UuidUtils.compressUuid(mipmap._uuid, true);
                    }
                    return mipmap._uuid;
                }),
            };
        }
        return null;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _deserialize (serializedData: any, handle: any): void {
        const data = serializedData as ITexture2DSerializeData;
        super._deserialize(data.base, handle);

        this._mipmaps = new Array(data.mipmaps.length);
        for (let i = 0; i < data.mipmaps.length; ++i) {
            // Prevent resource load failed
            this._mipmaps[i] = new ImageAsset();
            if (!data.mipmaps[i]) {
                continue;
            }
            const mipmapUUID = data.mipmaps[i];
            handle.result.push(this._mipmaps, `${i}`, mipmapUUID, js.getClassId(ImageAsset));
        }
    }

    /**
     * @engineInternal
     */
    protected _getGfxTextureCreateInfo (presumed: PresumedGFXTextureInfo): TextureInfo {
        const texInfo = new TextureInfo(TextureType.TEX2D);
        texInfo.width = this._width;
        texInfo.height = this._height;
        Object.assign(texInfo, presumed);
        return texInfo;
    }

    /**
     * @engineInternal
     */
    protected _getGfxTextureViewCreateInfo (presumed: PresumedGFXTextureViewInfo): TextureViewInfo {
        const texViewInfo = new TextureViewInfo();
        texViewInfo.type = TextureType.TEX2D;
        Object.assign(texViewInfo, presumed);
        return texViewInfo;
    }

    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        const imageAsset = new ImageAsset();
        imageAsset.initDefault();
        this.image = imageAsset;
    }

    public validate (): boolean {
        return this.mipmaps && this.mipmaps.length !== 0;
    }
}

cclegacy.Texture2D = Texture2D;

export interface ITexture2DSerializeData {
    base: string;
    mipmaps: string[];
}
