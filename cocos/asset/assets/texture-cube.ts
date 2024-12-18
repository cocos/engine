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

import { EDITOR, OPPO, TEST, VIVO, WECHAT, WECHAT_MINI_PROGRAM } from 'internal:constants';
import { ccclass, serializable } from 'cc.decorator';
import { TextureType, TextureInfo, TextureViewInfo, BufferTextureCopy } from '../../gfx';
import { ImageAsset } from './image-asset';
import { PresumedGFXTextureInfo, PresumedGFXTextureViewInfo, SimpleTexture } from './simple-texture';
import { ITexture2DCreateInfo, Texture2D } from './texture-2d';
import { legacyCC, ccwindow } from '../../core/global-exports';
import { errorID, js, sys } from '../../core';
import { OS } from '../../../pal/system-info/enum-type';

export type ITextureCubeCreateInfo = ITexture2DCreateInfo;
/**
 * @en The MipmapAtlas region interface
 * @zh MipmapAtlas的region接口。
 */
interface IMipmapAtlasLayout {
    left: number;
    top: number;
    width: number;
    height: number;
    level: number;
}
/**
 * @en The texture cube MipmapAtlas interface
 * @zh 立方体贴图的 MipmapAtlas 接口。
 */
interface ITextureCubeMipmapAtlas {
    atlas: ITextureCubeMipmap;
    layout: IMipmapAtlasLayout[];
}

/**
 * @en The texture cube mipmap interface
 * @zh 立方体贴图的 Mipmap 接口。
 */
interface ITextureCubeMipmap {
    front: ImageAsset;
    back: ImageAsset;
    left: ImageAsset;
    right: ImageAsset;
    top: ImageAsset;
    bottom: ImageAsset;
}

/**
 * @en The index for all faces of the cube
 * @zh 立方体每个面的约定索引。
 */
enum FaceIndex {
    right = 0,
    left = 1,
    top = 2,
    bottom = 3,
    front = 4,
    back = 5,
}
/**
 * @en The way to fill mipmaps.
 * @zh 填充mipmaps的方式。
 */
export enum MipmapMode {
    /**
     * @zh
     * 不使用mipmaps
     * @en
     * Not using mipmaps
     * @readonly
     */
    NONE = 0,
    /**
     * @zh
     * 使用自动生成的mipmaps
     * @en
     * Using the automatically generated mipmaps
     * @readonly
     */
    AUTO = 1,
    /**
     * @zh
     * 使用卷积图填充mipmaps
     * @en
     * Filling mipmaps with convolutional maps
     * @readonly
     */
    BAKED_CONVOLUTION_MAP = 2,
}

/**
 * @en The texture cube asset.
 * Each mipmap level of a texture cube have 6 [[ImageAsset]], represents 6 faces of the cube.
 * @zh 立方体贴图资源。
 * 立方体贴图资源的每个 Mipmap 层级都为 6 张 [[ImageAsset]]，分别代表了立方体贴图的 6 个面。
 */
@ccclass('cc.TextureCube')
export class TextureCube extends SimpleTexture {
    public static FaceIndex = FaceIndex;

    @serializable
    isRGBE = false;

    @serializable
    _mipmapAtlas: ITextureCubeMipmapAtlas | null = null;

    @serializable
    _mipmapMode = MipmapMode.NONE;

    constructor () {
        super();
    }

    /**
     * @en All levels of mipmap images, be noted, automatically generated mipmaps are not included.
     * When setup mipmap, the size of the texture and pixel format could be modified.
     * @zh 所有层级 Mipmap，注意，这里不包含自动生成的 Mipmap。
     * 当设置 Mipmap 时，贴图的尺寸以及像素格式可能会改变。
     */
    get mipmaps (): ITextureCubeMipmap[] {
        return this._mipmaps;
    }

    set mipmaps (value: ITextureCubeMipmap[]) {
        this._mipmaps = value;

        const cubeMaps: ITextureCubeMipmap[] = [];
        if (value.length === 1) {
            const cubeMipmap = value[0];
            const front = cubeMipmap.front.extractMipmaps();
            const back = cubeMipmap.back.extractMipmaps();
            const left = cubeMipmap.left.extractMipmaps();
            const right = cubeMipmap.right.extractMipmaps();
            const top = cubeMipmap.top.extractMipmaps();
            const bottom = cubeMipmap.bottom.extractMipmaps();

            if (front.length !== back.length
                || front.length !== left.length
                || front.length !== right.length
                || front.length !== top.length
                || front.length !== bottom.length) {
                errorID(16347);
                this._setMipmapParams([]);
                return;
            }

            const level = front.length;
            for (let i = 0; i < level; ++i) {
                const cubeMap: ITextureCubeMipmap = {
                    front: front[i],
                    back: back[i],
                    left: left[i],
                    right: right[i],
                    top: top[i],
                    bottom: bottom[i],
                };
                cubeMaps.push(cubeMap);
            }
        } else if (value.length > 1) {
            value.forEach((mipmap): void => {
                const cubeMap: ITextureCubeMipmap = {
                    front: mipmap.front.extractMipmap0(),
                    back: mipmap.back.extractMipmap0(),
                    left: mipmap.left.extractMipmap0(),
                    right: mipmap.right.extractMipmap0(),
                    top: mipmap.top.extractMipmap0(),
                    bottom: mipmap.bottom.extractMipmap0(),
                };
                cubeMaps.push(cubeMap);
            });
        }

        this._setMipmapParams(cubeMaps);
    }

    private _setMipmapParams (value: ITextureCubeMipmap[]): void {
        this._generatedMipmaps = value;
        this._setMipmapLevel(this._generatedMipmaps.length);
        if (this._generatedMipmaps.length > 0) {
            const imageAsset: ImageAsset = this._generatedMipmaps[0].front;
            this.reset({
                width: imageAsset.width,
                height: imageAsset.height,
                format: imageAsset.format,
                mipmapLevel: this._generatedMipmaps.length,
                baseLevel: this._baseLevel,
                maxLevel: this._maxLevel,
            });
            this._generatedMipmaps.forEach((mipmap, level): void => {
                _forEachFace(mipmap, (face, faceIndex): void => {
                    this._assignImage(face, level, faceIndex);
                });
            });
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
     * @en Fill mipmaps for cube map with atlas.
     * @zh 使用 atlas 方式排布的图填充到立方体贴图的 mipmaps。
     * @param value @en All mipmaps of each face of the cube map are stored in the form of atlas
     * and the value contains the atlas of the 6 faces and the layout information of each mipmap layer.
     * @zh 立方体贴图六个面的图，其中每张图中的全部 mip 数据都使用 atlas 方式排布
     */
    set mipmapAtlas (value: ITextureCubeMipmapAtlas | null) {
        this._mipmapAtlas = value;
        if (!this._mipmapAtlas) {
            this.reset({
                width: 0,
                height: 0,
                mipmapLevel: 0,
            });
            return;
        }
        const imageAtlasAsset: ImageAsset = this._mipmapAtlas.atlas.front;
        if (!imageAtlasAsset.data) {
            return;
        }
        //In ios wechat mini-game platform drawImage and getImageData can not get correct data,so upload to gfxTexture than use readPixels to get data
        //The performance of upload to gfxTexture and readPixels is not good, so only use this way in the ios wechat mini-game platform
        if (((WECHAT || WECHAT_MINI_PROGRAM) && sys.os === OS.IOS) || VIVO || OPPO) {
            this._uploadAtlas();
            return;
        }
        const faceAtlas = this._mipmapAtlas.atlas;
        const layout = this._mipmapAtlas.layout;
        const mip0Layout = layout[0];

        const ctx = Object.assign(ccwindow.document.createElement('canvas'), {
            width: imageAtlasAsset.width,
            height: imageAtlasAsset.height,
        }).getContext('2d')!;

        this.reset({
            width: mip0Layout.width,
            height: mip0Layout.height,
            format: imageAtlasAsset.format,
            mipmapLevel: layout.length,
        });

        for (let j = 0; j < layout.length; j++) {
            const layoutInfo = layout[j];
            _forEachFace(faceAtlas, (face, faceIndex): void => {
                ctx.clearRect(0, 0, imageAtlasAsset.width, imageAtlasAsset.height);
                const drawImg = face.data as HTMLImageElement;
                ctx.drawImage(drawImg, 0, 0);
                const rawData = ctx.getImageData(layoutInfo.left, layoutInfo.top, layoutInfo.width, layoutInfo.height);

                const bufferAsset = new ImageAsset({
                    _data: rawData.data,
                    _compressed: face.isCompressed,
                    width: rawData.width,
                    height: rawData.height,
                    format: face.format,
                });
                this._assignImage(bufferAsset, layoutInfo.level, faceIndex);
            });
        }
    }

    get mipmapAtlas (): ITextureCubeMipmapAtlas | null {
        return this._mipmapAtlas;
    }

    /**
     * @en Whether mipmaps are baked convolutional maps.
     * @zh mipmaps是否为烘焙出来的卷积图。
     */
    public isUsingOfflineMipmaps (): boolean {
        return this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP;
    }

    /**
     * @en Level 0 mipmap image.
     * Be noted, `this.image = img` equals `this.mipmaps = [img]`,
     * sets image will clear all previous mipmaps.
     * @zh 0 级 Mipmap。
     * 注意，`this.image = img` 等价于 `this.mipmaps = [img]`，
     * 也就是说，通过 `this.image` 设置 0 级 Mipmap 时将隐式地清除之前的所有 Mipmap。
     */
    get image (): ITextureCubeMipmap | null {
        return this._mipmaps.length === 0 ? null : this._mipmaps[0];
    }

    set image (value) {
        this.mipmaps = value ? [value] : [];
    }

    /**
     * @en Create a texture cube with an array of [[Texture2D]] which represents 6 faces of the texture cube.
     * @zh 通过二维贴图数组指定每个 Mipmap 的每个面创建立方体贴图。
     * @param textures Texture array, the texture count must be multiple of 6. Every 6 textures are 6 faces of a mipmap level.
     * The order should obey [[FaceIndex]] order.
     * @param out Output texture cube, if not given, will create a new texture cube.
     * @returns The created texture cube.
     * @example
     * ```ts
     * const textures = new Array<Texture2D>(6);
     * textures[TextureCube.FaceIndex.front] = frontImage;
     * textures[TextureCube.FaceIndex.back] = backImage;
     * textures[TextureCube.FaceIndex.left] = leftImage;
     * textures[TextureCube.FaceIndex.right] = rightImage;
     * textures[TextureCube.FaceIndex.top] = topImage;
     * textures[TextureCube.FaceIndex.bottom] = bottomImage;
     * const textureCube = TextureCube.fromTexture2DArray(textures);
     * ```
     */

    public static fromTexture2DArray (textures: Texture2D[], out?: TextureCube): TextureCube {
        const mipmaps: ITextureCubeMipmap[] = [];
        const nMipmaps = textures.length / 6;
        for (let i = 0; i < nMipmaps; i++) {
            const x = i * 6;
            mipmaps.push({
                front: textures[x + FaceIndex.front].image!,
                back: textures[x + FaceIndex.back].image!,
                left: textures[x + FaceIndex.left].image!,
                right: textures[x + FaceIndex.right].image!,
                top: textures[x + FaceIndex.top].image!,
                bottom: textures[x + FaceIndex.bottom].image!,
            });
        }
        out = out || new TextureCube();
        out.mipmaps = mipmaps;
        return out;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _mipmaps: ITextureCubeMipmap[] = [];

    private _generatedMipmaps: ITextureCubeMipmap[] = [];

    public onLoaded (): void {
        if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            this.mipmapAtlas = this._mipmapAtlas;
        } else {
            this.mipmaps = this._mipmaps;
        }
    }

    /**
     * @en Reset the current texture with given size, pixel format and mipmap images.
     * After reset, the gfx resource will become invalid, you must use [[uploadData]] explicitly to upload the new mipmaps to GPU resources.
     * @zh 将当前贴图重置为指定尺寸、像素格式以及指定 mipmap 层级。重置后，贴图的像素数据将变为未定义。
     * mipmap 图像的数据不会自动更新到贴图中，你必须显式调用 [[uploadData]] 来上传贴图数据。
     * @param info @en The create information. @zh 创建贴图的相关信息。
     */
    public reset (info: ITextureCubeCreateInfo): void {
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
     * @en Updates the given level mipmap image.
     * @zh 更新指定层级范围内的 Mipmap。当 Mipmap 数据发生了改变时应调用此方法提交更改。
     * 若指定的层级范围超出了实际已有的层级范围，只有覆盖的那些层级范围会被更新。
     * @param firstLevel @en First level to be updated. @zh 更新指定层的 mipmap。
     * @param count @en Mipmap level count to be updated。 @zh 指定要更新层的数量。
     */
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
            _forEachFace(this._generatedMipmaps[level], (face, faceIndex): void => {
                this._assignImage(face, level, faceIndex);
            });
        }
    }

    /**
     * @en Destroys this texture, clear all mipmaps and release GPU resources
     * @zh 销毁此贴图，清空所有 Mipmap 并释放占用的 GPU 资源。
     */
    public destroy (): boolean {
        this._mipmaps = [];
        this._generatedMipmaps = [];
        this._mipmapAtlas = null;
        return super.destroy();
    }

    /**
     * @en Release used GPU resources.
     * @zh 释放占用的 GPU 资源。
     * @deprecated please use [[destroy]] instead
     */
    public releaseTexture (): void {
        this.destroy();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _serialize (ctxForExporting: any): Record<string, unknown> | null {
        if (EDITOR || TEST) {
            if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
                const atlas = this._mipmapAtlas!.atlas;
                let uuids = {};
                if (ctxForExporting && ctxForExporting._compressUuid) {
                    uuids = {
                        front: EditorExtends.UuidUtils.compressUuid(atlas.front._uuid, true),
                        back: EditorExtends.UuidUtils.compressUuid(atlas.back._uuid, true),
                        left: EditorExtends.UuidUtils.compressUuid(atlas.left._uuid, true),
                        right: EditorExtends.UuidUtils.compressUuid(atlas.right._uuid, true),
                        top: EditorExtends.UuidUtils.compressUuid(atlas.top._uuid, true),
                        bottom: EditorExtends.UuidUtils.compressUuid(atlas.bottom._uuid, true),
                    };
                } else {
                    uuids = {
                        front: atlas.front._uuid,
                        back: atlas.back._uuid,
                        left: atlas.left._uuid,
                        right: atlas.right._uuid,
                        top: atlas.top._uuid,
                        bottom: atlas.bottom._uuid,
                    };
                }
                return {
                    base: super._serialize(ctxForExporting),
                    rgbe: this.isRGBE,
                    mipmapMode: this._mipmapMode,
                    mipmapAtlas: uuids,
                    mipmapLayout: this._mipmapAtlas!.layout,
                };
            } else {
                return {
                    base: super._serialize(ctxForExporting),
                    rgbe: this.isRGBE,
                    mipmaps: this._mipmaps.map((mipmap) => ((ctxForExporting && ctxForExporting._compressUuid) ? {
                        front: EditorExtends.UuidUtils.compressUuid(mipmap.front._uuid, true),
                        back: EditorExtends.UuidUtils.compressUuid(mipmap.back._uuid, true),
                        left: EditorExtends.UuidUtils.compressUuid(mipmap.left._uuid, true),
                        right: EditorExtends.UuidUtils.compressUuid(mipmap.right._uuid, true),
                        top: EditorExtends.UuidUtils.compressUuid(mipmap.top._uuid, true),
                        bottom: EditorExtends.UuidUtils.compressUuid(mipmap.bottom._uuid, true),
                    } : {
                        front: mipmap.front._uuid,
                        back: mipmap.back._uuid,
                        left: mipmap.left._uuid,
                        right: mipmap.right._uuid,
                        top: mipmap.top._uuid,
                        bottom: mipmap.bottom._uuid,
                    })),
                };
            }
        }
        return null;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _deserialize (serializedData: ITextureCubeSerializeData, handle: any): void {
        const data = serializedData;
        super._deserialize(data.base, handle);
        this.isRGBE = data.rgbe;
        this._mipmapMode = data.mipmapMode;
        if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            const mipmapAtlas = data.mipmapAtlas;
            const mipmapLayout = data.mipmapLayout;
            this._mipmapAtlas = {
                atlas: {} as ITextureCubeMipmap,
                layout: mipmapLayout,
            };
            this._mipmapAtlas.atlas = {
                front: new ImageAsset(),
                back: new ImageAsset(),
                left: new ImageAsset(),
                right: new ImageAsset(),
                top: new ImageAsset(),
                bottom: new ImageAsset(),
            };
            const imageAssetClassId = js.getClassId(ImageAsset);
            handle.result.push(this._mipmapAtlas.atlas, `front`, mipmapAtlas.front, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `back`, mipmapAtlas.back, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `left`, mipmapAtlas.left, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `right`, mipmapAtlas.right, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `top`, mipmapAtlas.top, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `bottom`, mipmapAtlas.bottom, imageAssetClassId);
        } else {
            this._mipmaps = new Array(data.mipmaps.length);
            for (let i = 0; i < data.mipmaps.length; ++i) {
                // Prevent resource load failed
                this._mipmaps[i] = {
                    front: new ImageAsset(),
                    back: new ImageAsset(),
                    left: new ImageAsset(),
                    right: new ImageAsset(),
                    top: new ImageAsset(),
                    bottom: new ImageAsset(),
                };
                const mipmap = data.mipmaps[i];
                const imageAssetClassId = js.getClassId(ImageAsset);
                handle.result.push(this._mipmaps[i], `front`, mipmap.front, imageAssetClassId);
                handle.result.push(this._mipmaps[i], `back`, mipmap.back, imageAssetClassId);
                handle.result.push(this._mipmaps[i], `left`, mipmap.left, imageAssetClassId);
                handle.result.push(this._mipmaps[i], `right`, mipmap.right, imageAssetClassId);
                handle.result.push(this._mipmaps[i], `top`, mipmap.top, imageAssetClassId);
                handle.result.push(this._mipmaps[i], `bottom`, mipmap.bottom, imageAssetClassId);
            }
        }
    }

    protected _getGfxTextureCreateInfo (presumed: PresumedGFXTextureInfo): TextureInfo {
        const texInfo = new TextureInfo(TextureType.CUBE);
        texInfo.width = this._width;
        texInfo.height = this._height;
        texInfo.layerCount = 6;
        Object.assign(texInfo, presumed);
        return texInfo;
    }

    protected _getGfxTextureViewCreateInfo (presumed: PresumedGFXTextureViewInfo): TextureViewInfo {
        const texViewInfo = new TextureViewInfo();
        texViewInfo.type = TextureType.CUBE;
        texViewInfo.baseLayer = 0;
        texViewInfo.layerCount = 6;
        Object.assign(texViewInfo, presumed);
        return texViewInfo;
    }

    protected _uploadAtlas (): void {
        const layout = this._mipmapAtlas!.layout;
        const mip0Layout = layout[0];
        this.reset({
            width: mip0Layout.width,
            height: mip0Layout.height,
            format: this._mipmapAtlas!.atlas.front.format,
            mipmapLevel: layout.length,
        });

        _forEachFace(this._mipmapAtlas!.atlas, (face, faceIndex): void => {
            const tex = new Texture2D();
            tex.image = face;
            tex.reset({
                width: face.width,
                height: face.height,
                format: face.format,
            });
            tex.uploadData(face.data!);

            for (let i = 0; i < layout.length; i++) {
                const layoutInfo = layout[i];

                const size = tex.getGFXTexture()!.size;
                const buffer = new Uint8Array(size); // should use the gfxTexture memory size
                const region = new BufferTextureCopy();
                region.texOffset.x = layoutInfo.left;
                region.texOffset.y = layoutInfo.top;
                region.texExtent.width = layoutInfo.width;
                region.texExtent.height = layoutInfo.height;

                this._getGFXDevice()!.copyTextureToBuffers(tex.getGFXTexture()!, [buffer], [region]);
                const bufferAsset = new ImageAsset({
                    _data: buffer,
                    _compressed: face.isCompressed,
                    width: layoutInfo.width,
                    height: layoutInfo.height,
                    format: face.format,
                });
                this._assignImage(bufferAsset, layoutInfo.level, faceIndex);
            }
        });
    }

    public initDefault (uuid?: string): void {
        super.initDefault(uuid);

        const imageAsset = new ImageAsset();
        imageAsset.initDefault();
        this.mipmaps = [{
            front: imageAsset,
            back: imageAsset,
            top: imageAsset,
            bottom: imageAsset,
            left: imageAsset,
            right: imageAsset,
        }];
    }

    public validate (): boolean {
        if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
            if (this.mipmapAtlas === null || this.mipmapAtlas.layout.length === 0) {
                return false;
            }
            const atlas = this.mipmapAtlas.atlas;
            return !!(atlas.top && atlas.bottom && atlas.front && atlas.back && atlas.left && atlas.right);
        } else {
            return this._mipmaps.length !== 0 && !this._mipmaps.find((x): boolean => !(x.top && x.bottom && x.front && x.back && x.left && x.right));
        }
    }
}

legacyCC.TextureCube = TextureCube;

interface ITextureCubeSerializeData {
    base: string;
    rgbe: boolean;
    mipmapMode: number;
    mipmapAtlas: {
        front: string;
        back: string;
        left: string;
        right: string;
        top: string;
        bottom: string;
    };
    mipmapLayout: [];
    mipmaps: {
        front: string;
        back: string;
        left: string;
        right: string;
        top: string;
        bottom: string;
    }[];
}

/**
 * @param {Mipmap} mipmap
 * @param {(face: ImageAsset) => void} callback
 */
function _forEachFace (mipmap: ITextureCubeMipmap, callback: (face: ImageAsset, faceIndex: number) => void): void {
    callback(mipmap.front, FaceIndex.front);
    callback(mipmap.back, FaceIndex.back);
    callback(mipmap.left, FaceIndex.left);
    callback(mipmap.right, FaceIndex.right);
    callback(mipmap.top, FaceIndex.top);
    callback(mipmap.bottom, FaceIndex.bottom);
}
