/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, serializable, editable } from 'cc.decorator';
import { Asset } from './asset';
import { cclegacy } from '../../core';

/**
 * @en Json asset, it will automatically parse the json to a JS object.
 * @zh Json 资源。
 * Json 资源加载后将直接解析为对象。如果你希望获得 JSON 的原始文本，你需要使用文本资源（使用文件名后缀“.txt”）。
 */
@ccclass('cc.JsonAsset')
export default class JsonAsset extends Asset {
    /**
     * @en The parsed JS object
     * @zh 解析后的对象。
     */
    @serializable
    @editable
    public json: Record<string, any> | null = null;

    constructor (name?: string) {
        super(name);
    }
}

cclegacy.JsonAsset = JsonAsset;
