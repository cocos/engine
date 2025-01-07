/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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
import { TextureFilter, PixelFormat, WrapMode } from './asset-enum';
import { js, cclegacy } from '../../core';
import './simple-texture';
import { EDITOR, TEST } from 'internal:constants';
import { patch_cc_TextureCube } from '../../native-binding/decorators';
import type { TextureCube as JsbTextureCube } from './texture-cube';

const textureCubeProto: any = jsb.TextureCube.prototype;
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

enum FaceIndex {
    right = 0,
    left = 1,
    top = 2,
    bottom = 3,
    front = 4,
    back = 5,
}
enum MipmapMode {
    NONE = 0,
    AUTO = 1,
    BAKED_CONVOLUTION_MAP = 2,
}
textureCubeProto.createNode = null!;

declare const jsb: any;

export type TextureCube = JsbTextureCube;
export const TextureCube: typeof JsbTextureCube = jsb.TextureCube;

TextureCube.Filter = TextureFilter;
TextureCube.PixelFormat = PixelFormat;
TextureCube.WrapMode = WrapMode;

textureCubeProto._ctor = function () {
    jsb.SimpleTexture.prototype._ctor.apply(this, arguments);
    this._mipmaps = null;
    this._mipmapAtlas = null;
};

Object.defineProperty(textureCubeProto, 'mipmaps', {
    get () {
        return this._mipmaps;
    },
    set (value) {
        this._mipmaps = value;
        this.setMipmaps(value);
    }
});


Object.defineProperty(textureCubeProto, 'image', {
    get () {
        return this._mipmaps.length === 0 ? null : this._mipmaps[0];
    },
    set (value) {
        this.mipmaps = value ? [value] : [];
    }
});

const oldOnLoaded = textureCubeProto.onLoaded;
textureCubeProto.onLoaded = function () {
    if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
        this.setMipmapAtlasForJS(this._mipmapAtlas);
    } else {
        this.setMipmapsForJS(this._mipmaps);
    }
    oldOnLoaded.apply(this);
}

textureCubeProto._serialize = function (ctxForExporting: any): Record<string, unknown> | null {
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
                base: jsb.TextureBase.prototype._serialize(ctxForExporting),
                rgbe: this.isRGBE,
                mipmapMode: this._mipmapMode,
                mipmapAtlas: uuids,
                mipmapLayout: this._mipmapAtlas!.layout,
            };
        } else {
            return {
                base: jsb.TextureBase.prototype._serialize(ctxForExporting),
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

textureCubeProto._deserialize = function (serializedData: ITextureCubeSerializeData, handle: any) {
    const data = serializedData;
    jsb.TextureBase.prototype._deserialize.call(this, data.base, handle);
    this.isRGBE = data.rgbe;
    if (data.mipmapMode != undefined) {
        this._mipmapMode = data.mipmapMode;
    }
    if (this._mipmapMode === MipmapMode.BAKED_CONVOLUTION_MAP) {
        const mipmapAtlas = data.mipmapAtlas;
        const mipmapLayout = data.mipmapLayout;
        this._mipmapAtlas = {
            atlas: {},
            layout: mipmapLayout,
        };
        this._mipmapAtlas.atlas = {
            front: new jsb.ImageAsset(),
            back: new jsb.ImageAsset(),
            left: new jsb.ImageAsset(),
            right: new jsb.ImageAsset(),
            top: new jsb.ImageAsset(),
            bottom: new jsb.ImageAsset(),
        };
        if (mipmapAtlas) {
            const imageAssetClassId = js.getClassId(jsb.ImageAsset);
            handle.result.push(this._mipmapAtlas.atlas, `front`, mipmapAtlas.front, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `back`, mipmapAtlas.back, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `left`, mipmapAtlas.left, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `right`, mipmapAtlas.right, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `top`, mipmapAtlas.top, imageAssetClassId);
            handle.result.push(this._mipmapAtlas.atlas, `bottom`, mipmapAtlas.bottom, imageAssetClassId);
        }
    } else {
        this._mipmaps = new Array(data.mipmaps.length);
        for (let i = 0; i < data.mipmaps.length; ++i) {
            // Prevent resource load failed
            this._mipmaps[i] = {
                front: new jsb.ImageAsset(),
                back: new jsb.ImageAsset(),
                left: new jsb.ImageAsset(),
                right: new jsb.ImageAsset(),
                top: new jsb.ImageAsset(),
                bottom: new jsb.ImageAsset(),
            };
            const mipmap = data.mipmaps[i];
            const imageAssetClassId = js.getClassId(jsb.ImageAsset);
            handle.result.push(this._mipmaps[i], `front`, mipmap.front, imageAssetClassId);
            handle.result.push(this._mipmaps[i], `back`, mipmap.back, imageAssetClassId);
            handle.result.push(this._mipmaps[i], `left`, mipmap.left, imageAssetClassId);
            handle.result.push(this._mipmaps[i], `right`, mipmap.right, imageAssetClassId);
            handle.result.push(this._mipmaps[i], `top`, mipmap.top, imageAssetClassId);
            handle.result.push(this._mipmaps[i], `bottom`, mipmap.bottom, imageAssetClassId);
        }
    }
}

cclegacy.TextureCube = jsb.TextureCube;

// handle meta data, it is generated automatically
patch_cc_TextureCube({TextureCube, MipmapMode});
