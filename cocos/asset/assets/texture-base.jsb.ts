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

import { TEST, EDITOR } from 'internal:constants';
import { deviceManager } from '../../gfx';
import { cclegacy } from '../../core';
import { Filter, PixelFormat, WrapMode } from './asset-enum';
import './asset';
import { patch_cc_TextureBase } from '../../native-binding/decorators';
import type { TextureBase as JsbTextureBase } from './texture-base';
import type { Batcher2D } from '../../2d/renderer/batcher-2d';

declare const jsb: any;

const textureBaseProto: any = jsb.TextureBase.prototype;

textureBaseProto._serialize = function (ctxForExporting: any): any {
    if (EDITOR || TEST) {
        return `${this._minFilter},${this._magFilter},${this._wrapS},${this._wrapT},${this._mipFilter},${this._anisotropy}`;
    }
    return '';
}

textureBaseProto._deserialize = function (serializedData: any, handle: any) {
    const data = serializedData as string;
    const fields = data.split(',');
    fields.unshift('');
    if (fields.length >= 5) {
        // decode filters
        this.setFilters(parseInt(fields[1]), parseInt(fields[2]));
        // decode wraps
        this.setWrapMode(parseInt(fields[3]), parseInt(fields[4]));
    }
    if (fields.length >= 7) {
        this.setMipFilter(parseInt(fields[5]));
        this.setAnisotropy(parseInt(fields[6]));
    }
};

textureBaseProto._getGFXDevice = function () {
    return deviceManager.gfxDevice;
};

textureBaseProto._getGFXFormat = function () {
    return this._getGFXPixelFormat(this.format);
};

textureBaseProto._setGFXFormat = function (format?: PixelFormat) {
    this.format = format === undefined ? PixelFormat.RGBA8888 : format;
};

textureBaseProto._getGFXPixelFormat = function (format) {
    if (format === PixelFormat.RGBA_ETC1) {
        format = PixelFormat.RGB_ETC1;
    } else if (format === PixelFormat.RGB_A_PVRTC_4BPPV1) {
        format = PixelFormat.RGB_PVRTC_4BPPV1;
    } else if (format === PixelFormat.RGB_A_PVRTC_2BPPV1) {
        format = PixelFormat.RGB_PVRTC_2BPPV1;
    }
    return format;
};

textureBaseProto.createNode = null!;

export type TextureBase = JsbTextureBase;
export const TextureBase: typeof JsbTextureBase = jsb.TextureBase;

TextureBase.Filter = Filter;
TextureBase.PixelFormat = PixelFormat;
TextureBase.WrapMode = WrapMode;

textureBaseProto._ctor = function () {
    jsb.Asset.prototype._ctor.apply(this, arguments);
    this._gfxSampler = null;
    this._samplerInfo = null;
    this._textureHash = 0;

    this._registerGFXSamplerUpdatedListener();
};

const oldGetGFXSampler = textureBaseProto.getGFXSampler;
textureBaseProto.getGFXSampler = function () {
    if (!this._gfxSampler) {
        this._gfxSampler = oldGetGFXSampler.call(this);
    }
    return this._gfxSampler;
};

const oldGetHash = textureBaseProto.getHash;
textureBaseProto.getHash = function () {
    if (this._textureHash === 0) {
        this._textureHash = oldGetHash.call(this);
    }
    return this._textureHash;
};

const oldGetSamplerInfo = textureBaseProto.getSamplerInfo;
textureBaseProto.getSamplerInfo = function () {
    if (!this._samplerInfo) {
        this._samplerInfo = oldGetSamplerInfo.call(this);
    }
    return this._samplerInfo;
};

const oldDestroy = textureBaseProto.destroy;
textureBaseProto.destroy = function () {
    if (cclegacy.director.root?.batcher2D) {
        // legacyCC.director.root.batcher2D._releaseDescriptorSetCache(this.getHash());
        (cclegacy.director.root.batcher2D as Batcher2D)._releaseDescriptorSetCache(this.getGFXTexture(), this.getGFXSampler());
    }
    // dispatch into C++ virtual function CCObject::destroy
    return oldDestroy.call(this);
};

textureBaseProto._onGFXSamplerUpdated = function (gfxSampler, samplerInfo) {
    this._gfxSampler = gfxSampler;
    this._samplerInfo = samplerInfo;
};

cclegacy.TextureBase = jsb.TextureBase;

// handle meta data, it is generated automatically
patch_cc_TextureBase({TextureBase, Filter, WrapMode, PixelFormat});