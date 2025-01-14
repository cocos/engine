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

import { ccclass, override } from 'cc.decorator';
import { assertIsNonNullable, cclegacy } from '../../core';
import { Asset } from './asset';

/**
 * @en
 * `BufferAsset` is a kind of assets whose internal data is a section of memory buffer
 * that you can access through the [[BufferAsset.buffer]] function.
 * @zh
 * `BufferAsset` 是一类资产，其内部数据是一段内存缓冲，你可以通过 [[BufferAsset.buffer]] 函数获取其内部数据。
 */
@ccclass('cc.BufferAsset')
export class BufferAsset extends Asset {
    private _buffer: ArrayBuffer | null = null;

    constructor (name?: string) {
        super(name);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @override
    get _nativeAsset (): ArrayBuffer | ArrayBufferView {
        return this._buffer as ArrayBuffer;
    }
    set _nativeAsset (bin: ArrayBufferView | ArrayBuffer) {
        if (bin instanceof ArrayBuffer) {
            this._buffer = bin;
        } else {
            this._buffer = bin.buffer;
        }
    }

    /**
     * @zh 获取此资源中的缓冲数据。
     * @en Get the ArrayBuffer data of this asset.
     * @returns @en The ArrayBuffer. @zh 缓冲数据。
     */
    public buffer (): ArrayBuffer {
        assertIsNonNullable(this._buffer);
        return this._buffer;
    }

    public validate (): boolean {
        return !!this._buffer;
    }
}

cclegacy.BufferAsset = BufferAsset;
