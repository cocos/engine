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
import { EDITOR, TEST } from 'internal:constants';
import { cclegacy } from '../../core';
import { TextureFilter, PixelFormat, WrapMode } from './asset-enum';
import './asset';
import { patch_cc_RenderTexture } from '../../native-binding/decorators';
import type { RenderTexture as JsbRenderTexture } from './render-texture';

declare const jsb: any;
const renderTextureProto: any = jsb.RenderTexture.prototype;
const textureBaseProto: any = jsb.TextureBase.prototype;

renderTextureProto.createNode = null!;

export type RenderTexture = JsbRenderTexture;
export const RenderTexture: typeof JsbRenderTexture = jsb.RenderTexture;

RenderTexture.Filter = TextureFilter;
RenderTexture.PixelFormat = PixelFormat;
RenderTexture.WrapMode = WrapMode;

renderTextureProto._serialize = function (ctxForExporting: any): any {
    if (EDITOR || TEST) {
        return { base: textureBaseProto._serialize(ctxForExporting), w: this._width, h: this._height, n: this._name };
    }
    return {};
}


renderTextureProto._deserialize = function (serializedData: any, handle: any) {
    const data = serializedData;
    this._width = data.w;
    this._height = data.h;
    this._name = data.n;
    textureBaseProto._deserialize.call(this, data.base, handle);
};

const oldReadPixels = renderTextureProto.readPixels;
renderTextureProto.readPixels = function readPixels (x: number, y: number, width: number, height: number, buffer?: Uint8Array) {
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;


    let tmpBuffer = oldReadPixels.call(this, x, y, width, height);
    if (tmpBuffer.length == 0) {
        return null;
    }
    buffer = tmpBuffer;
    return buffer;
};

cclegacy.RenderTexture = jsb.RenderTexture;

// handle meta data, it is generated automatically
patch_cc_RenderTexture({RenderTexture});