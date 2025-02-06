/*
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

import Config, { IAssetInfo } from './config';

/**
 * @en
 * A collection of information about a request.
 *
 * @zh
 * 请求的相关信息集合。
 *
 */
export default class RequestItem {
    /**
     * @en
     * The id of request, combined from uuid and isNative.
     *
     * @zh
     * 请求的 id, 由 uuid 和 isNative 组合而成。
     */
    get id (): string {
        if (!this._id) {
            this._id = `${this.overrideUuid || this.uuid}@${this.isNative ? 'native' : 'import'}`;
        }
        return this._id;
    }

    /**
     * @engineInternal
     * @mangle
     */
    public static MAX_DEAD_NUM = 500;

    /**
     * @en
     * Create a new request item from pool.
     *
     * @zh
     * 从对象池中创建 requestItem。
     *
     * @returns @en return a newly created RequestItem. @zh 返回一个刚创建的 `RequestItem`。
     *
     */
    public static create (): RequestItem {
        let out: RequestItem;
        if (RequestItem._deadPool.length !== 0) {
            out = RequestItem._deadPool.pop() as RequestItem;
        } else {
            out = new RequestItem();
        }

        return out;
    }

    private static _deadPool: RequestItem[] = [];

    /**
     * @en
     * The uuid of request.
     *
     * @zh
     * 所请求资源的 uuid。
     *
     */
    public uuid = '';

    /**
     * @engineInternal only used for L10N asset replacement.
     */
    public overrideUuid = '';

    /**
     * @en
     * The final url of request.
     *
     * @zh
     * 请求的最终 url。
     *
     */
    public url = '';

    /**
     * @en
     * The extension name of asset.
     *
     * @zh
     * 资源的扩展名。
     *
     */
    public ext = '.json';

    /**
     * @en
     * The content of asset.
     *
     * @zh
     * 资源的内容。
     *
     */
    public content: any = null;

    /**
     * @en
     * The file of asset.
     *
     * @zh
     * 资源的文件。
     *
     */
    public file: any = null;

    /**
     * @en
     * The information of asset.
     *
     * @zh
     * 资源的相关信息。
     *
     */
    public info: IAssetInfo | null = null;

    /**
     * @engineInternal
     */
    public config: Config | null = null;

    /**
     * @en
     * Whether or not it is native asset.
     *
     * @zh
     * 资源是否是原生资源。
     *
     */
    public isNative = false;

    /**
     * @en
     * Custom options.
     *
     * @zh
     * 自定义参数。
     *
     */
    public options: Record<string, any> = Object.create(null);

    private _id = '';

    /**
     * @en
     * Recycle this to be reused.
     *
     * @zh
     * 回收 requestItem 用于复用。
     *
     */
    public recycle (): void {
        if (RequestItem._deadPool.length === RequestItem.MAX_DEAD_NUM) { return; }
        this._id = '';
        this.uuid = '';
        this.overrideUuid = '';
        this.url = '';
        this.ext = '.json';
        this.content = null;
        this.file = null;
        this.info = null;
        this.config = null;
        this.isNative = false;
        this.options = Object.create(null);
        RequestItem._deadPool.push(this);
    }
}
