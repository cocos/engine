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

import { ImageAsset } from '../assets/image-asset';
import { Texture2D } from '../assets/texture-2d';
import { packCustomObjData, unpackJSONs } from '../../serialization/deserialize';
import { assertIsTrue, error, errorID, js } from '../../core';
import Cache from './cache';
import downloader from './downloader';
import { transform } from './helper';
import RequestItem from './request-item';
import { files } from './shared';

export type Unpacker = (
    packUuid: string[],
    data: any,
    options: Record<string, any>,
    onComplete: ((err: Error | null, data?: any) => void),
) => void;

interface IUnpackRequest {
    onComplete: ((err: Error | null, data?: any) => void);
    id: string;
}

/**
 * @en
 * Handle the packed asset, include unpacking, loading, cache and so on. It is a singleton. All member can be accessed with `assetManager.packManager`
 *
 * @zh
 * 处理打包资源，包括拆包，加载，缓存等等，这是一个单例, 所有成员能通过 `assetManager.packManager` 访问
 *
 */
export class PackManager {
    private _loading = new Cache<IUnpackRequest[]>();
    private _unpackers: Record<string, Unpacker> = {
        '.json': this.unpackJson,
    };

    /**
     * @en
     * Unpack the json, revert to what it was before packing
     *
     * @zh
     * 拆解 json 包，恢复为打包之前的内容
     *
     * @param pack - The pack
     * @param json - The content of pack
     * @param options - Some optional parameters
     * @param onComplete - Callback when finish unpacking
     * @param onComplete.err - The occurred error, null indicates success
     * @param onComplete.content - The unpacked assets
     *
     * @example
     * downloader.downloadFile('pack.json', { xhrResponseType: 'json'}, null, (err, file) => {
     *      packManager.unpackJson(['a', 'b'], file, null, (err, data) => console.log(err));
     * });
     *
     */
    public unpackJson (
        pack: string[],
        json: any,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: Record<string, any> | null) => void),
    ): void {
        const out: Record<string, any> = js.createMap(true);
        let err: Error | null = null;

        if (Array.isArray(json)) {
            json = unpackJSONs(json as unknown as Parameters<typeof unpackJSONs>[0]);

            if (json.length !== pack.length) {
                errorID(4915);
            }
            for (let i = 0; i < pack.length; i++) {
                out[`${pack[i]}@import`] = json[i];
            }
        } else {
            const textureType = js.getClassId(Texture2D);
            const imageAssetType = js.getClassId(ImageAsset);
            if (json.type === textureType && json.data) {
                const datas = json.data;
                if (datas.length !== pack.length) {
                    errorID(4915);
                }
                for (let i = 0; i < pack.length; i++) {
                    out[`${pack[i]}@import`] = packCustomObjData(textureType, { base: datas[i][0], mipmaps: datas[i][1] });
                }
            } else if (json.type === imageAssetType && json.data) {
                const datas = json.data;
                if (datas.length !== pack.length) {
                    errorID(4915);
                }
                for (let i = 0; i < pack.length; i++) {
                    out[`${pack[i]}@import`] = datas[i];
                }
            } else {
                err = new Error('unmatched type pack!');
                onComplete(err, null);
                return;
            }
        }
        onComplete(err, out);
    }

    public init (): void {
        this._loading.clear();
    }

    /**
     * @en
     * Register custom handler if you want to change default behavior or extend packManager to unpack other format pack
     *
     * @zh
     * 当你想修改默认行为或者拓展 packManager 来拆分其他格式的包时可以注册自定义的 handler
     *
     * @param type - Extension likes '.bin' or map likes {'.bin': binHandler, '.ab': abHandler}
     * @param handler - handler
     * @param handler.packUuid - The uuid of pack
     * @param handler.data - The content of pack
     * @param handler.options - Some optional parameters
     * @param handler.onComplete - Callback when finishing unpacking
     *
     * @example
     * packManager.register('.bin', (packUuid, file, options, onComplete) => onComplete(null, null));
     * packManager.register({
     *  '.bin': (packUuid, file, options, onComplete) => onComplete(null, null),
     *  '.ab': (packUuid, file, options, onComplete) => onComplete(null, null),
     * });
     */
    public register (type: string, handler: Unpacker): void;
    public register (map: Record<string, Unpacker>): void;
    public register (type: string | Record<string, Unpacker>, handler?: Unpacker): void {
        if (typeof type === 'object') {
            js.mixin(this._unpackers, type);
        } else {
            this._unpackers[type] = handler!;
        }
    }

    /**
     * @en
     * Use corresponding handler to unpack package
     *
     * @zh
     * 用对应的 handler 来进行解包
     *
     * @method unpack
     * @param pack - The uuid of packed assets
     * @param data - The packed data
     * @param type - The type indicates that which handler should be used to download, such as '.jpg'
     * @param options - Some optional parameter
     * @param onComplete - callback when finishing unpacking
     * @param onComplete.err -  The occurred error, null indicates success
     * @param onComplete.data - Original assets
     *
     * @example
     * downloader.downloadFile('pack.json', {xhrResponseType: 'json'}, null, (err, file) => {
     *      packManager.unpack(['2fawq123d', '1zsweq23f'], file, '.json', null, (err, data) => console.log(err));
     * });
     *
     */
    public unpack (
        pack: string[],
        data: any,
        type: string,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: any) => void),
    ): void {
        if (!data) {
            onComplete(new Error('package data is wrong!'));
            return;
        }
        const unpacker = this._unpackers[type];
        unpacker(pack, data, options, onComplete);
    }

    /**
     * @en
     * Download request item, If item is not in any package, download as usual. Otherwise, download the corresponding package and unpack it.
     * And then retrieve the corresponding content form it.
     *
     * @zh
     * 下载请求对象，如果请求对象不在任何包内，则正常下载，否则下载对应的 package 并进行拆解，并取回包内对应的内容
     *
     * @param item - Some item you want to download
     * @param options - Some optional parameters
     * @param onComplete - Callback when finished
     * @param onComplete.err - The occurred error, null indicates success
     * @param onComplete.data - The unpacked data retrieved from package
     *
     * @example
     * var requestItem = AssetManager.RequestItem.create();
     * requestItem.uuid = 'fcmR3XADNLgJ1ByKhqcC5Z';
     * requestItem.info = config.getAssetInfo('fcmR3XADNLgJ1ByKhqcC5Z');
     * packManager.load(requestItem, null, (err, data) => console.log(err));
     *
     */
    public load (item: RequestItem, options: Record<string, any> | null, onComplete: ((err: Error | null, data?: any) => void)): void {
        // if not in any package, download as uausl
        if (item.isNative || !item.info || !item.info.packs) {
            downloader.download(item.id, item.url, item.ext, item.options, onComplete);
            return;
        }

        if (files.has(item.id)) {
            onComplete(null, files.get(item.id));
            return;
        }

        const packs = item.info.packs;

        // find a loading package
        const loadingPack = packs.find((val): boolean => this._loading.has(val.uuid));

        if (loadingPack) {
            const req = this._loading.get(loadingPack.uuid);
            assertIsTrue(req);
            req.push({ onComplete, id: item.id });
            return;
        }

        // download a new package
        const pack = packs[0];
        this._loading.add(pack.uuid, [{ onComplete, id: item.id }]);

        // find the url of pack
        assertIsTrue(item.config);
        const url = transform(pack.uuid, { ext: pack.ext, bundle: item.config.name }) as string;

        downloader.download(pack.uuid, url, pack.ext, item.options, (err, data): void => {
            files.remove(pack.uuid);
            if (err) {
                error(err.message, err.stack);
            }
            // unpack package
            this.unpack(pack.packedUuids, data, pack.ext, item.options, (err2, result): void => {
                if (!err2) {
                    for (const id in result) {
                        files.add(id, result[id]);
                    }
                }
                const callbacks = this._loading.remove(pack.uuid);
                assertIsTrue(callbacks);
                for (let i = 0, l = callbacks.length; i < l; i++) {
                    const cb = callbacks[i];
                    if (err || err2) {
                        cb.onComplete(err || err2);
                        continue;
                    }

                    const unpackedData = result[cb.id];
                    if (!unpackedData) {
                        cb.onComplete(new Error('can not retrieve data from package'));
                    } else {
                        cb.onComplete(null, unpackedData);
                    }
                }
            });
        });
    }
}

export default new PackManager();
