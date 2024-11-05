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

import { cclegacy, js, _decorator, path, jsbUtils, CallbacksInvoker, applyMixins } from '../../core';
import { getUrlWithUuid } from '../asset-manager/helper';
import { patch_cc_Asset } from '../../native-binding/decorators';
import type { Asset as JsbAsset } from './asset';
import type { AssetManager } from '../asset-manager';

declare const jsb: any;

/**
 * @param error - null or the error info
 * @param node - the created node or null
 */
export type CreateNodeCallback = (error: Error | null, node: Node) => void;

applyMixins(jsb.Asset, [CallbacksInvoker, jsbUtils.ExtraEventMethods]);

const assetProto: any = jsb.Asset.prototype;

assetProto._ctor = function () {
    this.loaded = true; // deprecated in v3.3
    this._ref = 0;
    this.__nativeRefs = {};
    this.__jsb_ref_id = undefined;
    this._iN$t = null;
    this.__editorExtras__ = { editorOnly: true };

    this._callbackTable = js.createMap(true);
    this._file = null;
    // for deserialization
    // _initializerDefineProperty(_this, "_native", _descriptor$1, _assertThisInitialized(_this));
};

Object.defineProperty (assetProto, '_nativeAsset', {
    get (): any {
        return this._file;
    },
    set (obj: any) {
        this._file = obj;
    }
});

Object.defineProperty (assetProto, 'nativeUrl', {
    get (): string {
        if (!this._nativeUrl) {
            if (!this._native) return '';
            const name = this._native;
            if (name.charCodeAt(0) === 47) {    // '/'
                // remove library tag
                // not imported in library, just created on-the-fly
                return name.slice(1);
            }
            if (name.charCodeAt(0) === 46) {  // '.'
                // imported in dir where json exist
                this._nativeUrl = getUrlWithUuid(this._uuid, { nativeExt: name, isNative: true });
            } else {
                // imported in an independent dir
                this._nativeUrl = getUrlWithUuid(this._uuid, { __nativeName__: name, nativeExt: path.extname(name), isNative: true });
            }
        }
        return this._nativeUrl;
    }
});

Object.defineProperty(assetProto, 'refCount', {
    configurable: true,
    enumerable: true,
    get () {
        return this._ref;
    }
});

assetProto.addRef = function (): Asset {
    this._ref++;
    this.addAssetRef();
    return this;
};

assetProto.decRef = function (autoRelease = true): Asset {
    this.decAssetRef();
    if (this._ref > 0) {
        this._ref--;
    }
    if (autoRelease) {
        (cclegacy.assetManager as AssetManager).getReleaseManager().tryRelease(this);
    }
    return this;
};

assetProto.toString = function () {
    return this.nativeUrl;   
};

assetProto.createNode = null!;

export type Asset = JsbAsset;
export const Asset: typeof JsbAsset = jsb.Asset;

cclegacy.Asset = jsb.Asset;

// handle meta data, it is generated automatically
patch_cc_Asset({Asset});