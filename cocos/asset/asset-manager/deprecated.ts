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

import { BUILD } from 'internal:constants';
import { Asset } from '../assets/asset';
import { getError, macro, path, removeProperty, replaceProperty, cclegacy } from '../../core';
import Cache from './cache';
import assetManager, { AssetManager } from './asset-manager';
import { resources } from './bundle';
import dependUtil from './depend-util';
import downloader, { Downloader } from './downloader';
import { getUuidFromURL, transform } from './helper';
import parser, { Parser } from './parser';
import { releaseManager } from './release-manager';
import { assets, BuiltinBundleName, bundles } from './shared';
import { parseLoadResArgs, setDefaultProgressCallback } from './utilities';
import factory from './factory';
import RequestItem from './request-item';

const ImageFmts = ['.png', '.jpg', '.bmp', '.jpeg', '.gif', '.ico', '.tiff', '.webp', '.image', '.pvr', '.pkm', '.astc'];
const AudioFmts = ['.mp3', '.ogg', '.wav', '.m4a'];

function GetTrue (): boolean { return true; }

const md5Pipe = {
    transformURL (url: string): string {
        const uuid = getUuidFromURL(url);
        if (!uuid) { return url; }
        const bundle = bundles.find((b): boolean => !!b.getAssetInfo(uuid));
        if (!bundle) { return url; }
        let hashValue = '';
        const info = bundle.getAssetInfo(uuid);
        if (url.startsWith(bundle.base + bundle.config.nativeBase)) {
            hashValue = info!.nativeVer || '';
        } else {
            hashValue = info!.ver || '';
        }
        if (!hashValue || url.indexOf(hashValue) !== -1) { return url; }
        let hashPatchInFolder = false;
        if (path.extname(url) === '.ttf') {
            hashPatchInFolder = true;
        }
        if (hashPatchInFolder) {
            const dirname = path.dirname(url);
            const basename = path.basename(url);
            url = `${dirname}.${hashValue}/${basename}`;
        } else {
            url = url.replace(/.*[/\\][0-9a-fA-F]{2}[/\\]([0-9a-fA-F-@]{8,})/, (match, uuid): string => `${match}.${hashValue}`);
        }

        return url;
    },
};

type LoadProgressCallback = (completedCount: number, totalCount: number, item: any) => void;
type LoadCompleteCallback<T> = (error: Error | null, asset: T) => void;
type LoadDirCompleteCallback<T> = (error: Error | null, asset: T[], urls: string[]) => void;

/**
 * @en Loader for resource loading process. The engine automatically initialize its singleton object [[loader]].
 * @zh 资源加载管理器，引擎会自动创建一个单例对象 [[loader]]。
 *
 * @class loader
 * @static
 * @deprecated since v3.0 loader is deprecated, please backup your project and upgrade to assetManager
 */
export class CCLoader {
    /**
     * @en The default progression callback during the loading process,
     * if no progression callback is passed to [[load]] function, then this default callback will be used.
     * @zh Loader 默认的进度回调函数，如果在调用 [[load]] 函数时没有指定进度回调函数的话，会调用默认进度回调函数。
     *
     * @deprecated since v3.0, loader.onProgress is deprecated, please transfer onProgress to API as a parameter
     */
    public set onProgress (val: ((finished: number, total: number, item: RequestItem) => void)) {
        setDefaultProgressCallback(val);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _autoReleaseSetting: Record<string, boolean> = Object.create(null);
    private _parseLoadResArgs = parseLoadResArgs;

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public get _cache (): Record<string, Asset> {
        if (assets instanceof Cache) {
            return assets.map!;
        } else {
            const map = {};
            assets.forEach((val, key): void => {
                map[key] = val;
            });
            return map;
        }
    }

    /**
     * @en
     * Load resources with a progression callback and a complete callback.<br>
     *
     * @zh
     * 使用进度回调和完整回调加载资源。<br>
     *
     * @example
     * ```TypeScript
     * loader.load('a.png', function (err, tex) {
     *     log('Result should be a texture: ' + (tex instanceof Texture2D));
     * });
     *
     * loader.load('http://example.com/a.png', function (err, tex) {
     *     log('Should load a texture from external url: ' + (tex instanceof Texture2D));
     * });
     *
     * loader.load({url: 'http://example.com/getImageREST?file=a.png', type: 'png'}, function (err, tex) {
     *     log('Should load a texture from RESTful API by specify the type: ' + (tex instanceof Texture2D));
     * });
     * ```
     *
     * @param res - Url list in an array
     * @param progressCallback - Callback invoked when progression change
     * @param {Number} progressCallback.completedCount - The number of the items that are already completed
     * @param {Number} progressCallback.totalCount - The total number of the items
     * @param {Object} progressCallback.item - The latest item which flow out the pipeline
     * @param completeCallback - Callback invoked when all resources loaded
     * @deprecated since v3.0, loader.load is deprecated, please use assetManager.loadRemote instead
     */
    public load (res: string|string[]|Record<string, any>, progressCallback?: ((...args) => void)|null, completeCallback?: ((...args) => void)|null): void {
        if (completeCallback === undefined) {
            if (progressCallback !== undefined) {
                completeCallback = progressCallback;
                progressCallback = null;
            }
        }
        const requests = Array.isArray(res) ? res : [res];
        for (let i = 0; i < requests.length; i++) {
            const item = requests[i];
            if (typeof item === 'string') {
                requests[i] = { url: item, __isNative__: true };
            } else {
                if (item.type) {
                    item.ext = `.${item.type}`;
                    item.type = undefined;
                }

                if (item.url) {
                    item.__isNative__ = true;
                }
            }
        }
        const images: any[] = [];
        const audios: any[] = [];
        assetManager.loadAny(requests, null, (finish, total, item): void => {
            if (item.content) {
                if (ImageFmts.includes(item.ext)) {
                    images.push(item.content);
                } else if (AudioFmts.includes(item.ext)) {
                    audios.push(item.content);
                }
            }
            if (progressCallback) { progressCallback(finish, total, item); }
        }, (err, native): void => {
            let out: any = null;
            if (!err) {
                native = Array.isArray(native) ? native : [native];
                for (let i = 0; i < native.length; i++) {
                    const item = native[i];
                    if (!(item instanceof Asset)) {
                        let asset = item;
                        const url = (requests[i] as Record<string, any>).url;
                        if (images.includes(asset)) {
                            factory.create(url, item, '.png', {}, (err, image): void => {
                                asset = native[i] = image;
                            });
                        } else if (audios.includes(asset)) {
                            factory.create(url, item, '.mp3', {}, (err, audio): void => {
                                asset = native[i] = audio;
                            });
                        }
                        assets.add(url, asset);
                    }
                }
                if (native.length > 1) {
                    const map = Object.create(null);
                    native.forEach((asset): void => {
                        map[asset._uuid] = asset;
                    });
                    out = { isCompleted: GetTrue, _map: map };
                } else {
                    out = native[0];
                }
            }
            if (completeCallback) { completeCallback(err, out); }
        });
    }

    /**
     * @en Gets a new XMLHttpRequest instance.
     * @zh 获取一个新的 XMLHttpRequest 的实例。
     *
     * @deprecated since v3.0 loader.getXMLHttpRequest is deprecated, please use XMLHttpRequest directly
     */
    public getXMLHttpRequest (): XMLHttpRequest {
        return new XMLHttpRequest();
    }

    /**
     * @en Returns an item in pipeline.
     * @zh 根据 id 获取一个 item
     * @param id The id of the item
     *
     * @return {Object}
     * @deprecated since v3.0 loader.getItem is deprecated, please use assetManager.assets.get instead
     */
    public getItem (id): { content: Asset | null | undefined; } | null {
        return assetManager.assets.has(id) ? { content: assetManager.assets.get(id) } : null;
    }

    /**
     * @en
     * Load assets from the "resources" folder inside the "assets" folder of your project.<br>
     * <br>
     * Note: All asset URLs in Creator use forward slashes, URLs using backslashes will not work.
     * @zh
     * 从项目的 “assets” 文件夹下的 “resources” 文件夹中加载资源<br>
     * <br>
     * 注意：Creator 中的所有资源 URL 都使用正斜杠，使用反斜杠的 URL 将不起作用。
     *
     * @deprecated since v3.0 loader.loadRes is deprecated, please use resources.load  instead
     * @param url - Url of the target resource.
     *                       The url is relative to the "resources" folder, extensions must be omitted.
     * @param type - Only asset of type will be loaded if this argument is supplied.
     * @param progressCallback - Callback invoked when progression change.
     * @param {Number} progressCallback.completedCount - The number of the items that are already completed.
     * @param {Number} progressCallback.totalCount - The total number of the items.
     * @param {Object} progressCallback.item - The latest item which flow out the pipeline.
     * @param completeCallback - Callback invoked when the resource loaded.
     * @param {Error} completeCallback.error - The error info or null if loaded successfully.
     * @param {Object} completeCallback.resource - The loaded resource if it can be found otherwise returns null.
     * @example
     * ```typescript
     * // load the prefab (project/assets/resources/misc/character/cocos) from resources folder
     * loader.loadRes('misc/character/cocos', function (err, prefab) {
     *     if (err) {
     *         error(err.message || err);
     *         return;
     *     }
     *     log('Result should be a prefab: ' + (prefab instanceof Prefab));
     * });
     *
     * // load the sprite frame of (project/assets/resources/imgs/cocos.png) from resources folder
     * loader.loadRes('imgs/cocos', SpriteFrame, function (err, spriteFrame) {
     *     if (err) {
     *         error(err.message || err);
     *         return;
     *     }
     *     log('Result should be a sprite frame: ' + (spriteFrame instanceof SpriteFrame));
     * });
     *
     */
    public loadRes<T extends Asset> (
        url: string,
        type: Constructor<T>,
        progressCallback: LoadProgressCallback,
        completeCallback: LoadCompleteCallback<T>,
    ): any;
    public loadRes<T extends Asset> (
        url: string,
        type: Constructor<T>,
        completeCallback: LoadCompleteCallback<T>,
    ): any;
    public loadRes<T extends Asset> (
        url: string,
        progressCallback: LoadProgressCallback,
        completeCallback: LoadCompleteCallback<T>,
    ): any;
    public loadRes<T extends Asset> (
        url: string,
        completeCallback: LoadCompleteCallback<T>,
    ): any;
    public loadRes<T extends Asset> (
        url: string,
        type?: Constructor<T> | LoadCompleteCallback<T> | LoadProgressCallback,
        progressCallback?: LoadProgressCallback | LoadCompleteCallback<T>,
        completeCallback?: LoadCompleteCallback<T>,
    ): any {
        const { type: _type, onProgress, onComplete } = this._parseLoadResArgs(
type as any,
            progressCallback as LoadProgressCallback,
            completeCallback as LoadCompleteCallback<T>,
        );
        const extname = path.extname(url);
        if (extname && !resources.getInfoWithPath(url, _type)) {
            // strip extname
            url = url.slice(0, -extname.length);
        }
        resources.load(url, _type as Constructor<T>, onProgress, onComplete);
    }

    /**
     * @en This method is like [[loadRes]] except that it accepts array of url.
     * @zh 此方法除了接受 URL 数组参数外，与 [[loadRes]] 方法相同。
     *
     * @deprecated since v3.0 loader.loadResArray is deprecated, please use resources.load instead
     * @param urls - Array of URLs of the target resource.
     *                          The url is relative to the "resources" folder, extensions must be omitted.
     * @param type - Only asset of type will be loaded if this argument is supplied.
     * @param progressCallback - Callback invoked when progression change.
     * @param {Number} progressCallback.completedCount - The number of the items that are already completed.
     * @param {Number} progressCallback.totalCount - The total number of the items.
     * @param {Object} progressCallback.item - The latest item which flow out the pipeline.
     * @param completeCallback - A callback which is called when all assets have been loaded, or an error occurs.
     * @param {Error} completeCallback.error - If one of the asset failed, the complete callback is immediately called
     *                                         with the error. If all assets are loaded successfully, error will be null.
     * @param {Asset[]|Array} completeCallback.assets - An array of all loaded assets.
     *                                                     If nothing to load, assets will be an empty array.
     * @example
     * ```typescript
     * // load the SpriteFrames from resources folder
     * let spriteFrames;
     * let urls = ['misc/characters/character_01', 'misc/weapons/weapons_01'];
     * loader.loadResArray(urls, SpriteFrame, function (err, assets) {
     *     if (err) {
     *         error(err);
     *         return;
     *     }
     *     spriteFrames = assets;
     *     // ...
     * });
     * ```
     */
    public loadResArray<T extends Asset> (
        urls: string[],
        type?: Constructor<T>,
        progressCallback?: LoadProgressCallback,
        completeCallback?: LoadCompleteCallback<T[]>,
    ): void {
        const { type: _type, onProgress, onComplete } = this._parseLoadResArgs<LoadCompleteCallback<Asset[]>>(
type as any,
            progressCallback as LoadProgressCallback,
            completeCallback as LoadCompleteCallback<Asset[]>,
        );
        urls.forEach((url, i): void => {
            const extname = path.extname(url);
            if (extname && !resources.getInfoWithPath(url, _type)) {
                // strip extname
                urls[i] = url.slice(0, -extname.length);
            }
        });
        resources.load(urls, _type, onProgress, onComplete);
    }

    /**
     * @en
     * Load all assets in a folder inside the "assets/resources" folder of your project.<br>
     * <br>
     * Note: All asset URLs in Creator use forward slashes, URLs using backslashes will not work.
     * @zh
     * 将所有资产加载到项目 “assets / resources” 文件夹中
     * <br>
     * 注意：Creator 中的所有资源 URL 都使用正斜杠，使用反斜杠的 URL 将不起作用。
     *
     * @deprecated since v3.0 loader.loadResDir is deprecated, please use resources.loadDir instead
     * @param url - Url of the target folder.
     *                       The url is relative to the "resources" folder, extensions must be omitted.
     * @param type - Only asset of type will be loaded if this argument is supplied.
     * @param progressCallback - Callback invoked when progression change.
     * @param {Number} progressCallback.completedCount - The number of the items that are already completed.
     * @param {Number} progressCallback.totalCount - The total number of the items.
     * @param {Object} progressCallback.item - The latest item which flow out the pipeline.
     * @param completeCallback - A callback which is called when all assets have been loaded, or an error occurs.
     * @param {Error} completeCallback.error - If one of the asset failed, the complete callback is immediately called
     *                                         with the error. If all assets are loaded successfully, error will be null.
     * @param {Asset[]} completeCallback.assets - An array of all loaded assets.
     *                                             If nothing to load, assets will be an empty array.
     * @param {String[]} completeCallback.urls - An array that lists all the URLs of loaded assets.
     * ```typescript
     * // load the texture (resources/imgs/cocos.png) and the corresponding sprite frame
     * loader.loadResDir('imgs/cocos', function (err, assets) {
     *     if (err) {
     *         error(err);
     *         return;
     *     }
     *     let texture = assets[0];
     *     let spriteFrame = assets[1];
     * });
     *
     * // load all textures in "resources/imgs/"
     * loader.loadResDir('imgs', Texture2D, function (err, textures) {
     *     let texture1 = textures[0];
     *     let texture2 = textures[1];
     * });
     *
     * // load all JSONs in "resources/data/"
     * loader.loadResDir('data', function (err, objects, urls) {
     *     let data = objects[0];
     *     let url = urls[0];
     * });
     * ```
     */
    public loadResDir<T extends Asset> (
        url: string,
        type: Constructor<T>,
        progressCallback: LoadProgressCallback,
        completeCallback: LoadDirCompleteCallback<T>,
    ): any;
    public loadResDir<T extends Asset> (
        url: string,
        type: Constructor<T>,
        completeCallback: LoadDirCompleteCallback<T>,
    ): any;
    public loadResDir<T extends Asset> (
        url: string,
        progressCallback: LoadProgressCallback,
        completeCallback: LoadDirCompleteCallback<T>,
    ): any;
    public loadResDir<T extends Asset> (
        url: string,
        completeCallback: LoadDirCompleteCallback<T>,
    ): any;
    public loadResDir<T extends Asset> (
        url: string,
        type?: Constructor<T> | LoadProgressCallback | LoadDirCompleteCallback<T>,
        progressCallback?: LoadProgressCallback | LoadDirCompleteCallback<T>,
        completeCallback?: LoadDirCompleteCallback<T>,
    ): any {
        const { type: _type, onProgress, onComplete } = this._parseLoadResArgs<LoadDirCompleteCallback<Asset>>(
type as any,
            progressCallback as LoadProgressCallback,
            completeCallback as LoadDirCompleteCallback<Asset>,
        );
        resources.loadDir(url, _type, onProgress, (err, out): void => {
            let urls: string[] = [];
            if (!err) {
                const infos = resources.getDirWithPath(url, _type);
                urls = infos.map((info): string => info.path);
            }
            if (onComplete) { onComplete(err, out, urls); }
        });
    }

    /**
     * @en
     * Get resource data by id. <br>
     * When you load resources with [[load]] or [[loadRes]],
     * the url will be the unique identity of the resource.
     * After loaded, you can acquire them by passing the url to this API.
     * @zh
     * 根据 ID 获取资源数据。<br>
     * 当使用 [[load]] 或 [[loadRes]] 来加载资源时，<br>
     * URL 将是资源的唯一标识。<br>
     * 在完成加载之后，你可以通过将 URL 传递给此 API 来获取它们。
     *
     * @param url
     * @param type - Only asset of type will be returned if this argument is supplied.
     * @deprecated since v3.0 loader.getRes is deprecated, please use resources.get instead
     */
    public getRes<T extends Asset> (url: string, type?: Constructor<T>): T | null {
        return assets.has(url) ? assets.get(url) as T : resources.get<T>(url, type);
    }

    /**
     * @en Get total resources count in loader.
     * @zh 获取加载的总资源数量
     * @deprecated since v3.0 loader.getResCount is deprecated, please use assetManager.assets.count instead
     */
    public getResCount (): number {
        return assets.count;
    }

    /**
     * @en
     * Get all resource dependencies of the requested asset in an array, including itself.<br>
     * The owner parameter accept the following types: 1. The asset itself; 2. The resource url; 3. The asset's uuid.<br>
     * The returned array stores the dependencies with their uuids, after retrieve dependencies,<br>
     * you can release them, access dependent assets by passing the uuid to [[getRes]], or other stuffs you want.<br>
     * For release all dependencies of an asset, please refer to [[release]]
     * Here is some examples:
     * @zh
     * 获取一个指定资源的所有依赖资源，包含它自身，并保存在数组中返回。<br>
     * owner 参数接收以下几种类型：1. 资源 asset 对象；2. 资源目录下的 url；3. 资源的 uuid。<br>
     * 返回的数组将仅保存依赖资源的 uuid，获取这些 uuid 后，你可以从 loader 释放这些资源；通过 [[getRes]] 获取某个资源或者进行其他你需要的操作。<br>
     * 想要释放一个资源及其依赖资源，可以参考 [[release]]。<br>
     * 下面是一些示例代码：
     * @example
     * ```typescript
     * // Release all dependencies of a loaded prefab
     * let deps = loader.getDependsRecursively(prefab);
     * loader.release(deps);
     * // Retrieve all dependent textures
     * let deps = loader.getDependsRecursively('prefabs/sample');
     * let textures = [];
     * for (let i = 0; i < deps.length; ++i) {
     *     let item = loader.getRes(deps[i]);
     *     if (item instanceof Texture2D) {
     *         textures.push(item);
     *     }
     * }
     * ```
     *
     * @deprecated since v3.0 loader.getDependsRecursively is deprecated, please use use assetManager.dependUtil.getDepsRecursively instead
     * @param owner - The owner asset or the resource url or the asset's uuid
     * @returns the dependencies list
     */
    public getDependsRecursively (owner: Asset|string): string[] {
        if (!owner) { return []; }
        const uuid = typeof owner === 'string' ? owner : owner._uuid;
        return dependUtil.getDepsRecursively(uuid).concat([uuid]);
    }

    /**
     * @en The md5 pipe in loader's pipeline, it could be absent if the project isn't build with md5 option.<br>
     * It's used to modify the url to the real downloadable url with md5 suffix.
     * @zh loader 中的 md5 加载管道，如果项目没有使用 md5 构建，则此项可能不存在。<br>
     * 用于修改带有 md5 后缀的真实可下载的 URL 。
     *
     * @deprecated since v3.0 loader.md5Pipe is deprecated, assetLoader and md5Pipe were merged into assetManager.transformPipeline
     */
    public get md5Pipe (): {
        transformURL(url: string): string;
        } {
        return md5Pipe;
    }

    /**
     * @en
     * The downloader in loader's pipeline, it's by default the second pipe.<br>
     * It's used to download files with several handlers: pure text, image, script, audio, font, uuid.<br>
     * You can add your own download function with addDownloadHandlers
     * @zh
     * loader 中的资源下载程序，默认情况下是第二个加载的。<br>
     * 它用于下载带有多个处理程序的文件：纯文本，图像，脚本，音频，字体，uuid。<br>
     * 您可以使用 addDownloadHandlers 来添加自己的下载函数
     *
     * @deprecated since v3.0 loader.downloader is deprecated, please use assetManager.downloader instead
     */
    get downloader (): Downloader {
        return downloader;
    }

    /**
     * @en
     * The loader in loader's pipeline, it's by default the third pipe.<br>
     * It's used to parse downloaded content with several handlers: JSON, image, plist, fnt, uuid.<br>
     * You can add your own download function with addLoadHandlers
     * @zh
     * loader 中的资源下载程序，默认情况下是第三个加载的。<br>
     * 它用于解析下载的内容及多个处理程序的文件：纯文本，图像，脚本，音频，字体，uuid。<br>
     * 您可以使用 addLoadHandlers 来添加自己的下载函数
     *
     * @deprecated since v3.0 loader.loader is deprecated, please use assetManager.parser instead
     */
    get loader (): Parser {
        return assetManager.parser;
    }

    /**
     * @en Add custom supported types handler or modify existing type handler for download process.
     * @zh 为下载程序添加自定义支持的类型处理程序或修改现有的类型处理程序。
     * @example
     * ```typescript
     *  loader.addDownloadHandlers({
     *      // This will match all url with `.scene` extension or all url with `scene` type
     *      'scene' : function (url, callback) {}
     *  });
     * ```
     * @param extMap Handlers for corresponding type in a map
     * @deprecated since v3.0 loader.addDownloadHandlers is deprecated, please use assetManager.downloader.register instead
     */
    public addDownloadHandlers (extMap: Record<string, (item: { url: string }, cb: ((err: Error | null, data?: any | null) => void)) => void>): void {
        const handler = Object.create(null);
        for (const type in extMap) {
            const func = extMap[type];
            handler[`.${type}`] = (url, options, onComplete): void => {
                func({ url }, onComplete);
            };
        }
        downloader.register(handler);
    }

    /**
     * @en Add custom supported types handler or modify existing type handler for load process.
     * @zh 为加载程序添加自定义支持的类型处理程序或修改现有的类型处理程序。
     * @example
     * ```typescript
     *  loader.addLoadHandlers({
     *      // This will match all url with `.scene` extension or all url with `scene` type
     *      'scene' : function (url, callback) {}
     *  });
     * ```
     * @param extMap Handlers for corresponding type in a map
     * @deprecated since v3.0 loader.addLoadHandlers is deprecated, please use assetManager.parser.register instead
     */
    public addLoadHandlers (extMap: Record<string, (config: { content: any }, cb: ((err: Error | null, data?: any | null) => void)) => void>): void {
        const handler = Object.create(null);
        for (const type in extMap) {
            const func = extMap[type];
            handler[`.${type}`] = (file, options, onComplete): void => {
                func({ content: file }, onComplete);
            };
        }
        parser.register(handler);
    }

    /**
     * @en
     * Release the content of an asset or an array of assets by uuid.<br>
     * This method will not only remove the cache of the asset in loader, but also clean up its content.<br>
     * For example, if you release a texture, the texture asset and its gl texture data will be freed up.<br>
     * In complex project, you can use this function with [[getDependsRecursively]] to free up memory in critical circumstances.<br>
     * Notice, this method may cause the texture to be unusable, if there are still other nodes use the same texture, they may turn to black
     * and report gl errors.<br>
     * @zh
     * 通过 id（通常是资源 url）来释放一个资源或者一个资源数组。<br>
     * 这个方法不仅会从 loader 中删除资源的缓存引用，还会清理它的资源内容。<br>
     * 比如说，当你释放一个 texture 资源，这个 texture 和它的 gl 贴图数据都会被释放。<br>
     * 在复杂项目中，我们建议你结合 [[getDependsRecursively]] 来使用，便于在设备内存告急的情况下更快地释放不再需要的资源的内存。<br>
     * 注意，这个函数可能会导致资源贴图或资源所依赖的贴图不可用，如果场景中存在节点仍然依赖同样的贴图，它们可能会变黑并报 GL 错误。<br>
     *
     * @example
     * ```typescript
     * // Release a texture which is no longer need
     * loader.release(texture);
     * // Release all dependencies of a loaded prefab
     * let deps = loader.getDependsRecursively('prefabs/sample');
     * loader.release(deps);
     * // If there is no instance of this prefab in the scene, the prefab and its dependencies like textures, sprite frames, etc, will be freed up.
     * // If you have some other nodes share a texture in this prefab, you can skip it in two ways:
     * // 1. Forbid auto release a texture before release
     * loader.setAutoRelease(texture2d, false);
     * // 2. Remove it from the dependencies array
     * let deps = loader.getDependsRecursively('prefabs/sample');
     * let index = deps.indexOf(texture2d._uuid);
     * if (index !== -1)
     *     deps.splice(index, 1);
     * loader.release(deps);
     * ```
     * @param asset Asset or assets to be released
     * @deprecated since v3.0 loader.release is deprecated, please use assetManager.releaseAsset instead
     */
    public release (asset: Asset|string|Array<Asset|string>): void {
        if (Array.isArray(asset)) {
            for (let i = 0; i < asset.length; i++) {
                let key = asset[i];
                if (typeof key === 'string') { key = assets.get(key) as Asset; }
                assetManager.releaseAsset(key);
            }
        } else if (asset) {
            if (typeof asset === 'string') { asset = assets.get(asset) as Asset; }
            assetManager.releaseAsset(asset);
        }
    }

    /**
     * @en Release the asset by its object. Refer to [[release]] for detailed informations.
     * @zh 通过资源对象自身来释放资源。详细信息请参考 [[release]]
     * @param asset The asset to be released
     *
     * @deprecated since v3.0 loader.releaseAsset is deprecated, please use assetManager.releaseAsset instead
     */
    public releaseAsset (asset: Asset): void {
        assetManager.releaseAsset(asset);
    }

    /**
     * @en Release the asset loaded by [[loadRes]]. Refer to [[release]] for detailed informations.
     * @zh 释放通过 [[loadRes]] 加载的资源。详细信息请参考 [[release]]
     * @param res The asset url, it should be related path without extension to the `resources` folder.
     * @param type If type is provided, the asset for correspond type will be returned
     *
     * @deprecated since v3.0 loader.releaseRes is deprecated, please use assetManager.releaseRes instead
     */
    public releaseRes (res: string, type?: Constructor<Asset>): void {
        resources.release(res, type);
    }

    /**
     *
     * @en Resource all assets. Refer to [[release]] for detailed informations.
     * @zh 释放所有资源。详细信息请参考 [[release]]
     *
     * @deprecated since v3.0 loader.releaseAll is deprecated, please use assetManager.releaseAll instead
     */
    public releaseAll (): void {
        assetManager.releaseAll();
        assets.clear();
    }

    /**
     * @en Removes an completed item in pipeline.
     * It will only remove the cache in the pipeline or loader, its dependencies won't be released.
     * loader provided another method to completely cleanup the resource and its dependencies,
     * please refer to [[release]]
     * @zh 移除指定的已完成 item。
     * 这将仅仅从 pipeline 或者 loader 中删除其缓存，并不会释放它所依赖的资源。
     * loader 中提供了另一种删除资源及其依赖的清理方法，请参考 [[release]]
     * @param id The id of the item
     * @return succeed or not
     *
     * @deprecated since 3.0, loader.removeItem is deprecated, please use assetManager.assets.remove instead
     */
    public removeItem (id): boolean {
        return !!assets.remove(id);
    }

    /**
     * @en
     * Indicates whether to release the asset when loading a new scene.<br>
     * By default, when loading a new scene, all assets in the previous scene will be released or preserved<br>
     * according to whether the previous scene checked the "Auto Release Assets" option.<br>
     * On the other hand, assets dynamically loaded by using `loader.loadRes` or `loader.loadResDir`<br>
     * will not be affected by that option, remain not released by default.<br>
     * Use this API to change the default behavior on a single asset, to force preserve or release specified asset when scene switching.<br>
     * <br>
     * See: [[setAutoReleaseRecursively]], [[isAutoRelease]]
     * @zh
     * 设置当场景切换时是否自动释放资源。<br>
     * 默认情况下，当加载新场景时，旧场景的资源根据旧场景是否勾选“Auto Release Assets”，将会被释放或者保留。<br>
     * 而使用 `loader.loadRes` 或 `loader.loadResDir` 动态加载的资源，则不受场景设置的影响，默认不自动释放。<br>
     * 使用这个 API 可以在单个资源上改变这个默认行为，强制在切换场景时保留或者释放指定资源。<br>
     * <br>
     * 参考：[[setAutoReleaseRecursively]]，[[isAutoRelease]]
     *
     * @example
     * ```typescript
     * // auto release the texture event if "Auto Release Assets" disabled in current scene
     * loader.setAutoRelease(texture2d, true);
     * // don't release the texture even if "Auto Release Assets" enabled in current scene
     * loader.setAutoRelease(texture2d, false);
     * // first parameter can be url
     * loader.setAutoRelease(audioUrl, false);
     * ```
     * @param asset - The asset or its url or its uuid
     * @param autoRelease - Whether to release automatically during scene switch
     *
     * @deprecated since v3.0 loader.setAutoRelease is deprecated, if you want to prevent some asset from auto releasing, please use Asset.addRef instead
     */
    public setAutoRelease (asset: Asset|string, autoRelease: boolean): void {
        if (typeof asset === 'object') { asset = asset._uuid; }
        this._autoReleaseSetting[asset] = !!autoRelease;
    }

    /**
     * @en
     * Indicates whether to release the asset and its referenced other assets when loading a new scene.<br>
     * By default, when loading a new scene, all assets in the previous scene will be released or preserved<br>
     * according to whether the previous scene checked the "Auto Release Assets" option.<br>
     * On the other hand, assets dynamically loaded by using `loader.loadRes` or `loader.loadResDir`<br>
     * will not be affected by that option, remain not released by default.<br>
     * Use this API to change the default behavior on the specified asset and its recursively referenced assets,
     * to force preserve or release specified asset when scene switching.<br>
     * <br>
     * See: [[setAutoRelease]], [[isAutoRelease]]
     * @zh
     * 设置当场景切换时是否自动释放资源及资源引用的其它资源。<br>
     * 默认情况下，当加载新场景时，旧场景的资源根据旧场景是否勾选“Auto Release Assets”，将会被释放或者保留。<br>
     * 而使用 `loader.loadRes` 或 `loader.loadResDir` 动态加载的资源，则不受场景设置的影响，默认不自动释放。<br>
     * 使用这个 API 可以在指定资源及资源递归引用到的所有资源上改变这个默认行为，强制在切换场景时保留或者释放指定资源。<br>
     * <br>
     * 参考：[[setAutoRelease]]，[[isAutoRelease]]
     *
     * @example
     * ```typescript
     * // auto release the SpriteFrame and its Texture event if "Auto Release Assets" disabled in current scene
     * loader.setAutoReleaseRecursively(spriteFrame, true);
     * // don't release the SpriteFrame and its Texture even if "Auto Release Assets" enabled in current scene
     * loader.setAutoReleaseRecursively(spriteFrame, false);
     * // don't release the Prefab and all the referenced assets
     * loader.setAutoReleaseRecursively(prefab, false);
     * ```
     * @param asset - The asset or its url or its uuid
     * @param autoRelease - Whether to release automatically during scene switch
     * @deprecated loader.setAutoReleaseRecursively is deprecated, if you want to prevent some asset from auto releasing, please use Asset.addRef instead
     */
    public setAutoReleaseRecursively (asset: Asset|string, autoRelease: boolean): void {
        if (typeof asset === 'object') { asset = asset._uuid; }
        autoRelease = !!autoRelease;
        this._autoReleaseSetting[asset] = autoRelease;
        const depends = dependUtil.getDepsRecursively(asset);
        for (let i = 0; i < depends.length; i++) {
            this._autoReleaseSetting[depends[i]] = autoRelease;
        }
    }

    /**
     * @en Returns whether the asset is configured as auto released, despite how "Auto Release Assets" property is set on scene asset.<br>
     * <br>
     * See: [[setAutoRelease]], [[setAutoReleaseRecursively]]
     * @zh 返回指定的资源是否有被设置为自动释放，不论场景的“Auto Release Assets”如何设置。<br>
     * <br>
     * 参考：[[setAutoRelease]]，[[setAutoReleaseRecursively]]
     *
     * @method isAutoRelease
     * @param {Asset|String} asset - asset object or the raw asset's url
     * @returns {Boolean}
     * @deprecated loader.isAutoRelease is deprecated
     */
    public isAutoRelease (asset: Asset|string): boolean {
        if (typeof asset === 'object') { asset = asset._uuid; }
        return !!this._autoReleaseSetting[asset];
    }
}

/**
 * @deprecated since 3.0, loader is deprecated, please use assetManager instead
 */
export const loader = new CCLoader();

/**
 * @en
 * Used to load/unload resources in the project
 * @zh
 * 管理项目中加载/卸载资源的资源库。
 *
 * @deprecated since v3.0 AssetLibrary is deprecated, please backup your project and upgrade to assetManager
 */
export const AssetLibrary = {

    /**
     * @en
     * init the asset library
     * @zh
     * 初始化 AssetLibrary。
     * @method init
     * @param {Object} options
     * @param {String} options.libraryPath - 能接收的任意类型的路径，通常在编辑器里使用绝对的，在网页里使用相对的。
     * @param {Object} options.mountPaths - mount point of actual urls for raw assets (only used in editor)
     * @param {Object} [options.rawAssets] - uuid to raw asset's urls (only used in runtime)
     * @param {String} [options.rawAssetsBase] - base of raw asset's urls (only used in runtime)
     * @param {String} [options.packedAssets] - packed assets (only used in runtime)
     * @deprecated AssetLibrary.init is deprecated, please use assetManager.init instead
     */
    init (options: Record<string, any>): void {
        options.importBase = options.libraryPath;
        options.nativeBase = BUILD ? options.rawAssetsBase : options.libraryPath;
        assetManager.init(options);
        if (options.rawAssets) {
            resources.init({
                base: '',
                deps: [],
                scenes: {},
                redirect: [],
                debug: true,
                packs: {},
                types: [],
                versions: { import: [], native: [] },
                name: BuiltinBundleName.RESOURCES,
                importBase: options.importBase,
                nativeBase: options.nativeBase,
                paths: options.rawAssets.assets,
                uuids: Object.keys(options.rawAssets.assets),
                extensionMap: {},
            });
        }
    },

    /**
     * @zh
     * 加载资源。
     * @param {String} uuid
     * @param {loadCallback} callback - @en Callback function to be executed after loading asset. @zh 加载完成后执行的回调函数。
     * @param {Object} options
     * @param {Boolean} options.readMainCache - 默认为true。如果为false，则资源及其所有依赖资源将重新加载并从库中创建新实例。
     * @param {Boolean} options.writeMainCache - 默认为true。如果为true，则结果将缓存到 AssetLibrary，并且必须由用户手动卸载。
     * @param {Asset} options.existingAsset - 加载现有资源，此参数仅在编辑器中可用。
     * @deprecated since v3.0 AssetLibrary.loadAsset is deprecated, please use assetManager.loadAny instead
     */
    loadAsset (uuid: string, callback: ((err: Error | null, data?: any | null) => void), options?): void {
        assetManager.loadAny(uuid, callback);
    },
};

/**
 *
 * @class url
 * @static
 *
 * @deprecated since v3.0 url is deprecated
 */
export const url = {};

replaceProperty(url, 'url', [
    {
        name: 'normalize',
        target: assetManager.utils,
        targetName: 'assetManager.utils',
        newName: 'normalize',
    },
    {
        name: 'raw',
        targetName: 'Asset.prototype',
        newName: 'nativeUrl',
        customFunction: (url: string): string => {
            if (url.startsWith('resources/')) {
                return transform({
                    path: path.changeExtname(url.substring(10)),
                    bundle: BuiltinBundleName.RESOURCES,
                    __isNative__: true,
                    ext: path.extname(url),
                }) as string;
            }
            return '';
        },
    },
]);

removeProperty(AssetLibrary, 'AssetLibrary', [
    {
        name: 'getLibUrlNoExt',
        suggest: 'AssetLibrary.getLibUrlNoExt was removed, if you want to transform url, please use assetManager.utils.getUrlWithUuid instead',
    },
    {
        name: 'queryAssetInfo',
        suggest: 'AssetLibrary.queryAssetInfo was removed',
    },
]);

removeProperty(loader, 'loader', [
    {
        name: 'releaseResDir',
        suggest: 'loader.releaseResDir was removed, please use assetManager.releaseAsset instead',
    },
    {
        name: 'flowInDeps',
        suggest: 'loader.flowInDeps was removed',
    },
    {
        name: 'assetLoader',
        suggest: 'loader.assetLoader was removed, assetLoader and md5Pipe were merged into assetManager.transformPipeline',
    },
]);

replaceProperty(cclegacy, 'cc', [
    {
        name: 'loader',
        newName: 'assetManager',
        logTimes: 1,
        customGetter: (): CCLoader => loader,
    }, {
        name: 'AssetLibrary',
        newName: 'assetManager',
        logTimes: 1,
        customGetter: (): typeof AssetLibrary => AssetLibrary,
    }, {
        name: 'Pipeline',
        target: AssetManager,
        targetName: 'AssetManager',
        newName: 'Pipeline',
        logTimes: 1,
    }, {
        name: 'url',
        targetName: 'assetManager',
        newName: 'utils',
        logTimes: 1,
        customGetter: (): Record<string, any> => url,
    },
]);

removeProperty(cclegacy, 'cc', [{
    name: 'LoadingItems',
    suggest: getError(1400, 'LoadingItems', 'AssetManager.Task'),
}]);

replaceProperty(macro, 'macro', [
    {
        name: 'DOWNLOAD_MAX_CONCURRENT',
        target: downloader,
        targetName: 'assetManager.downloader',
        newName: 'maxConcurrency',
    },
]);

const _autoRelease = releaseManager._autoRelease;
releaseManager._autoRelease = function (oldScene, newScene, persistNodes): void {
    _autoRelease.call(releaseManager, oldScene, newScene, persistNodes);
    const releaseSettings = loader._autoReleaseSetting;
    const keys = Object.keys(releaseSettings);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (releaseSettings[key] === true) {
            const asset = assets.get(key);
            if (asset) { releaseManager.tryRelease(asset); }
        }
    }
};
