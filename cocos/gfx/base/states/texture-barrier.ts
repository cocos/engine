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

import { murmurhash2_32_gc } from '../../../core/algorithm/murmurhash2_gc';
import { GFXObject, ObjectType, TextureBarrierInfo } from '../define';

/**
 * @en GFX texture barrier.
 * @zh GFX 贴图内存屏障。
 */
export class TextureBarrier extends GFXObject {
    get info (): Readonly<TextureBarrierInfo> { return this._info; }
    get hash (): number { return this._hash; }

    protected _info: TextureBarrierInfo = new TextureBarrierInfo();
    protected _hash = 0;

    constructor (info: Readonly<TextureBarrierInfo>, hash: number) {
        super(ObjectType.TEXTURE_BARRIER);
        this._info.copy(info);
        this._hash = hash;
    }

    static computeHash (info: Readonly<TextureBarrierInfo>): number {
        let res = `${info.prevAccesses} ${info.nextAccesses}`;
        res += info.type;
        res += info.range.mipLevel;
        res += info.range.levelCount;
        res += info.range.firstSlice;
        res += info.range.numSlices;
        res += info.range.basePlane;
        res += info.range.planeCount;
        res += info.discardContents;
        res += info.srcQueue ? info.srcQueue.type : 0;
        res += info.dstQueue ? info.dstQueue.type : 0;

        return murmurhash2_32_gc(res, 666);
    }
}
