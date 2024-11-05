/* eslint-disable max-len */
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

import { BUILD, EDITOR, PREVIEW } from 'internal:constants';
import { Asset } from '../assets/asset';
import { error, settings, path, cclegacy, EventTarget, SettingsCategory } from '../../core';
import Bundle from './bundle';
import Cache, { ICache } from './cache';
import CacheManager from './cache-manager';
import dependUtil, { DependUtil } from './depend-util';
import downloader, { Downloader } from './downloader';
import factory from './factory';
import fetch from './fetch';
import * as helper from './helper';
import load from './load';
import packManager from './pack-manager';
import parser, { Parser } from './parser';
import { Pipeline } from './pipeline';
import preprocess from './preprocess';
import { ReleaseManager, releaseManager } from './release-manager';
import RequestItem from './request-item';
import {
    presets,
    references,
    assets, BuiltinBundleName, bundles, fetchPipeline, files, parsed, pipeline, transformPipeline, assetsOverrideMap, IRequest } from './shared';

import Task from './task';
import { combine, parse, replaceOverrideAsset } from './url-transformer';
import { asyncify, parseParameters } from './utilities';
import { IAddressableInfo, IAssetInfo, IPackInfo, ISceneInfo } from './config';

const EVENT_ASSET_MISSING = 'asset-missing';
/**
 * @zh
 * AssetManager 配置。
 * @en
 * AssetManager configuration.
 */
export interface IAssetManagerOptions {
    /* Only valid on Editor */
    importBase?: string;
    /* Only valid on Editor */
    nativeBase?: string;
    /* Only valid on native */
    jsbDownloaderMaxTasks?: number;
    /* Only valid on native */
    jsbDownloaderTimeout?: number;

    /**
     * @zh
     * 所有 bundle 的版本信息。
     * @en
     * Version for all bundles.
     */
    bundleVers?: Record<string, string>;

    /**
     * @zh
     * 远程服务器地址。
     * @en
     * Remote server address.
     */
    server?: string;

    /**
     * @zh
     * 配置为子包的 bundle。
     * @en
     * All subpackages.
     */
    subpackages?: string[];

    /**
     * @zh
     * 配置为远程包的 bundle。
     * @en
     * All remote bundles.
     */
    remoteBundles?: string[];

    /**
     * @en
     * The maximum number of concurrent when downloading.
     *
     * @zh
     * 下载时的最大并发数。
     */
    downloadMaxConcurrency?: number;
}

/**
 * @en
 * This module controls asset's behaviors and information, include loading, releasing etc. it is a singleton
 * You can access it via [[assetManager]].
 *
 * @zh
 * 此模块管理资源的行为和信息，包括加载，释放等，这是一个单例，你能够通过 `assetManager` 访问它。
 */
export class AssetManager {
    /**
     * @en
     * Normal loading pipeline. Asset manager uses this pipeline to load all assets, it has an additional asset parsing process compared to the fetchPipeline.
     *
     * @zh
     * 正常加载管线。Asset manager 使用此管线来加载所有资源，他与 fetchPipeline 相比额外多了资源的解析过程。
     */
    public pipeline: Pipeline = pipeline.append(preprocess).append(load);

    /**
     * @en
     * Fetching pipeline. Asset manager uses this pipeline to preload all assets, which lacks the asset parsing process compared to the pipeline.
     *
     * @zh
     * 下载管线。Asset manager 使用此管线来预加载所有资源，他与 pipeline 相比缺少了资源的解析过程。
     *
     */
    public fetchPipeline: Pipeline = fetchPipeline.append(preprocess).append(fetch);

    /**
     * @en
     * Url transformer. Asset manager uses this pipeline to convert the uuid, path, etc. to the path of the final file path to be loaded.
     * You can customize this pipeline to redirect the path to the path you want.
     *
     * @zh
     * Url 转换器。Asset manager 使用此管线将 uuid, 路径等信息转换为最终要加载的文件路径。你可以自定义此管线将路径重定向到你想要的路径。
     *
     */
    public transformPipeline: Pipeline = transformPipeline.append(parse).append(replaceOverrideAsset).append(combine);

    /**
     * @en
     * The collection of bundle which is already loaded, you can remove cache with [[removeBundle]].
     *
     * @zh
     * 已加载 bundle 的集合， 你能通过 [[removeBundle]] 来移除缓存。
     *
     */
    public bundles: ICache<Bundle> = bundles;

    /**
     * @en
     * The collection of asset which is already loaded, you can remove cache with [[releaseAsset]].
     *
     * @zh
     * 已加载资源的集合， 你能通过 [[releaseAsset]] 来移除缓存。
     */
    public assets: ICache<Asset> = assets;

    /**
     * @internal only using in L10N for now.
     */
    public readonly assetsOverrideMap = assetsOverrideMap;

    /**
     * @internal
     */
    public generalImportBase = '';
    /**
     * @internal
     */
    public generalNativeBase = '';

    /**
     * @en
     * Manage relationship between asset and its dependencies.
     *
     * @zh
     * 管理资源间依赖关系。
     */
    public dependUtil = dependUtil;

    /**
     * @en
     * A flag indicates whether to force loading assets and ignore errors.
     *
     * @zh
     * 是否强制加载资源标志, 如果为 true，加载资源时将会忽略错误。
     *
     */
    public force = EDITOR || PREVIEW;

    /**
     * @en
     * Whether to use image bitmap to load image first. If enabled, images loading will become faster but memory usage will increase.
     *
     * @zh
     * 是否优先使用 image bitmap 来加载图片，启用之后，图片加载速度会更快, 但内存占用会变高。
     *
     */
    public allowImageBitmap = false;

    /**
     * @en
     * Some useful functions, such as the convert function between url and uuid.
     *
     * @zh
     * 一些有用的方法, 例如 url 与 uuid 之间的转换方法。
     *
     */
    public utils = helper;

    /**
     * @en
     * The downloader used by `assetManager`.It manages all downloading tasks.
     *
     * @zh
     * `assetManager` 所使用的下载器，管理所有下载任务。
     *
     */
    public downloader = downloader;

    /**
     * @en
     * The parser used by `assetManager`.It manages all parsing tasks.
     *
     * @zh
     * `assetManager` 所使用的解析器，管理所有解析任务。
     *
     */
    public parser = parser;

    /**
     * @en
     * Manage all packed assets.
     *
     * @zh
     * 管理所有合并后的资源。
     *
     * @deprecated Since v3.7, this is an engine internal interface. You usually don't need to care about how resources are merged and split.
     */
    public packManager = packManager;

    /**
     * @en
     * Whether to cache loaded assets.
     *
     * @zh
     * 是否缓存已加载的资源。
     *
     */
    public cacheAsset = true;

    /**
     * @en
     * Cache manager is a module which controls all caches downloaded from server in non-web platform.
     *
     * @zh
     * 缓存管理器是一个模块，在非 WEB 平台上，用于管理所有从服务器上下载下来的缓存。
     *
     */
    public cacheManager: CacheManager | null = null;

    /**
     * @en
     * The preset of options.
     *
     * @zh
     * 可选参数的预设集。
     *
     */
    public presets = presets;

    /**
     * @internal
     */
    public factory = factory;

    /**
     * @internal
     */
    public preprocessPipe = preprocess;

    /**
     * @internal
     */
    public fetchPipe = fetch;

    /**
     * @internal
     */
    public loadPipe = load;

    /**
     * @internal
     */
    public references = references;

    private _releaseManager$ = releaseManager;
    private _files$ = files;
    private _parsed$ = parsed;
    private _parsePipeline$ = BUILD ? null : new Pipeline('parse existing json', [this.loadPipe]);
    private _projectBundles$: string[] = [];
    private static _instance: AssetManager;
    private _eventTarget$ = new EventTarget();

    /**
     * @en
     * A global singleton instance of [[AssetManager]], which you can access directly through [[assetManager]].
     *
     * @zh
     * [[AssetManager]] 的全局单例，你可以直接通过 [[assetManager]] 访问。
     */
    static get instance (): AssetManager {
        if (!this._instance) {
            this._instance = new AssetManager();
        }
        return this._instance;
    }

    private constructor () {}

    /**
     * @engineInternal
     */
    public getReleaseManager (): ReleaseManager {
        return this._releaseManager$;
    }

    /**
     * @en
     * The builtin 'main' bundle.
     *
     * @zh
     * 内置 main 包。
     */
    public get main (): Bundle | null {
        return bundles.get(BuiltinBundleName.MAIN) || null;
    }

    /**
     * @en
     * The builtin 'resources' bundle.
     *
     * @zh
     * 内置 resources 包。
     *
     */
    public get resources (): Bundle | null {
        return bundles.get(BuiltinBundleName.RESOURCES) || null;
    }

    /**
     * @en
     * Add a delegate which will be invoked when asset is missing.
     *
     * @zh
     * 添加当资源丢失时调用的委托。
     *
     * @param func - @en The missing asset delegate. @zh 资源丢失委托。
     * @param target - @en The target of the missing asset delegate, can be null. @zh 资源丢失委托的目标对象，可以为空。
     * @internal
     * @engineInternal
     */
    public onAssetMissing (func: (parentAsset: Asset, owner: any, propName: string, uuid: string) => void, target?: any): void {
        this._eventTarget$.on(EVENT_ASSET_MISSING, func, target);
    }

    /**
     * @en
     * Remove the delegate when asset is missing.
     * @zh
     * 移除资源丢失时调用的委托。
     * @param func - @en The missing asset delegate. @zh 资源丢失委托。
     * @param target - @en The target of the missing asset delegate, can be null. @zh 资源丢失委托的目标对象，可以为空。
     * @internal
     * @engineInternal
     */
    public offAssetMissing (func: (parentAsset: Asset, owner: any, propName: string, uuid: string) => void, target?: any): void {
        this._eventTarget$.off(EVENT_ASSET_MISSING, func, target);
    }

    /**
     * @en
     * Dispatch event when asset is missing.
     * @zh
     * 触发资源丢失时事件。
     * @param parentAsset - @en The parent asset of the missing asset. @zh 丢失的资源的父资源。
     * @param owner - @en The owner of the missing asset. @zh 丢失的资源的拥有者。
     * @param propName - @en The property name of the missing asset. @zh 丢失的资源的属性名称。
     * @param uuid - @en The uuid of the missing asset. @zh 丢失的资源的 uuid。
     * @internal
     * @engineInternal
     */
    public dispatchAssetMissing (parentAsset: Asset, owner: any, propName: string, uuid: string): void {
        this._eventTarget$.emit(EVENT_ASSET_MISSING, parentAsset, owner, propName, uuid);
    }

    /**
     * @en
     * Initializes assetManager with options.
     * This method will be called automatically when the engine starts, you should not call this method manually at any time.
     *
     * @zh
     * 初始化资源管理器，引擎在启动时，将会自动调用此方法，你不应该在任何时候手动调用此方法。
     *
     * @param options @en The configuration of asset manager. @zh 资源管理器的配置选项。
     * @internal
     */
    public init (options: IAssetManagerOptions = {}): void {
        const server = options.server || settings.querySettings(SettingsCategory.ASSETS, 'server') || '';
        const bundleVers = options.bundleVers || settings.querySettings(SettingsCategory.ASSETS, 'bundleVers') || {};
        const remoteBundles = options.remoteBundles || settings.querySettings(SettingsCategory.ASSETS, 'remoteBundles') || [];
        const downloadMaxConcurrency = options.downloadMaxConcurrency || settings.querySettings(SettingsCategory.ASSETS, 'downloadMaxConcurrency');
        if (downloadMaxConcurrency && downloadMaxConcurrency > 0) {
            this.downloader.maxConcurrency = downloadMaxConcurrency;
        }

        this._files$.clear();
        this._parsed$.clear();
        this._releaseManager$.init();
        this.assets.clear();
        this.bundles.clear();
        this.packManager.init();
        this.downloader.init(server, bundleVers, remoteBundles);
        this.parser.init();
        this.dependUtil.init();
        let importBase = options.importBase || settings.querySettings(SettingsCategory.ASSETS, 'importBase') || '';
        if (importBase && importBase.endsWith('/')) {
            importBase = importBase.substr(0, importBase.length - 1);
        }
        let nativeBase = options.nativeBase || settings.querySettings(SettingsCategory.ASSETS, 'nativeBase') || '';
        if (nativeBase && nativeBase.endsWith('/')) {
            nativeBase = nativeBase.substr(0, nativeBase.length - 1);
        }
        this.generalImportBase = importBase;
        this.generalNativeBase = nativeBase;
        this._projectBundles$ = settings.querySettings(SettingsCategory.ASSETS, 'projectBundles') || [];
        const assetsOverride = settings.querySettings(SettingsCategory.ASSETS, 'assetsOverrides') || {};
        for (const key in assetsOverride) {
            this.assetsOverrideMap.set(key, assetsOverride[key] as string);
        }
    }

    /**
     * @en
     * Gets the bundle which has been loaded with the name of bundle.
     *
     * @zh
     * 通过包名称获取已加载的分包。
     *
     * @param name @en The name of bundle. @zh 资源包的名称。
     * @returns @en The loaded bundle. @zh 已加载的资源包。
     *
     * @example
     * // ${project}/assets/test1
     * assetManager.getBundle('test1');
     *
     * assetManager.getBundle('resources');
     *
     */
    public getBundle (name: string): Bundle | null {
        return bundles.get(name) || null;
    }

    /**
     * @en
     * Removes this bundle. NOTE: The asset within this bundle will not be released automatically,
     * you can call [[AssetManager.Bundle.releaseAll]] manually before removing it if you need.
     *
     * @zh
     * 移除此包, 注意：这个包内的资源不会自动释放, 如果需要的话你可以在摧毁之前手动调用 [[AssetManager.Bundle.releaseAll]] 进行释放。
     *
     * @param bundle @en The bundle to be removed. @zh 准备移除的 Bundle。
     *
     */
    public removeBundle (bundle: Bundle): void {
        bundle._destroy();
        bundles.remove(bundle.name);
    }

    /**
     * @en
     * General interface used to load assets with a progression callback and a complete callback.
     * It is highly recommended that you use more simple API, such as `load`, `loadDir` etc. You can pass
     * some additional data via the `options` parameter, and the parameters in `options` will affect this loading.
     * The optional parameter will be transferred to handler of `downloader` and `parser` as `options`. You can
     * register you own handler downloader or parser to collect these custom parameters for some effect.
     *
     * Reserved Keywords for additional parameters: `uuid`, `url`, `path`, `dir`, `scene`, `type`, `priority`, `preset`, `audioLoadMode`, `ext`,
     * `bundle`, `onFileProgress`, `maxConcurrency`, `maxRequestsPerFrame`, `maxRetryCount`, `version`, `xhrResponseType`,
     * `xhrWithCredentials`, `xhrMimeType`, `xhrTimeout`, `xhrHeader`, `reloadAsset`, `cacheAsset`, `cacheEnabled`,
     * Please DO NOT use these words as your own options!
     *
     * @zh
     * 通用加载资源接口，可传入进度回调以及完成回调，建议你使用更简单的API，例如 `load`、`loadDir` 等。你可以通过 `options` 参数额外传递一些数据，`options` 中的参数将会影响本次加载。
     * 额外参数会传入加载流程中的 `downloader`, `parser` 的处理方法中, 你可以扩展 `downloader`, `parser` 收集参数完成想实现的效果。
     *
     * 额外参数保留关键字: `uuid`, `url`, `path`, `dir`, `scene`, `type`, `priority`, `preset`, `audioLoadMode`, `ext`, `bundle`, `onFileProgress`,
     *  `maxConcurrency`, `maxRequestsPerFrame`, `maxRetryCount`, `version`, `xhrResponseType`, `xhrWithCredentials`, `xhrMimeType`, `xhrTimeout`, `xhrHeader`,
     *  `reloadAsset`, `cacheAsset`, `cacheEnabled`, 请不要使用这些字段为你自己的参数!
     *
     * @param requests @en The loading requests. @zh 加载请求。
     * @param options @en Optional parameters. @zh 可选参数。
     * @param onProgress @en Callback invoked when the loading progress change. @zh 加载进度发生变化时执行的回调。
     * @param onProgress.finished
     * @en The number of request items that have finished loading.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total @en The number of all request items to be loaded. @zh 所有待加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
     * @param onComplete @en Callback invoked when all assets loaded. @zh 所有资源加载完成后的回调。
     * @param onComplete.err @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
     * @param onComplete.data @en The loaded data, or null if an error occurred during loading. @zh 已加载的数据，如果加载过程中有错误发生，则为 null。
     *
     * @example
     * assetManager.loadAny({url: 'http://example.com/a.png'}, (err, img) => log(img));
     * assetManager.loadAny(['60sVXiTH1D/6Aft4MRt9VC'], (err, assets) => log(assets));
     * assetManager.loadAny([{ uuid: '0cbZa5Y71CTZAccaIFluuZ'}, {url: 'http://example.com/a.png'}], (err, assets) => log(assets));
     * assetManager.downloader.register('.asset', (url, options, onComplete) => {
     *      url += '?userName=' + options.userName + "&password=" + options.password;
     *      // other logic.
     * });
     * assetManager.parser.register('.asset', (file, options, onComplete) => {
     *      var json = JSON.parse(file);
     *      var skin = json[options.skin];
     *      var model = json[options.model];
     *      onComplete(null, {skin, model});
     * });
     * assetManager.loadAny({ url: 'http://example.com/my.asset' }, { skin: 'xxx', model: 'xxx', userName: 'xxx', password: 'xxx' });
     *
     */
    public loadAny (requests: string | string[] | IRequest | Array<IRequest>, options: { [key: string]: any, preset?: string } | null, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: any) => void) | null): void;
    public loadAny (requests: string | string[] | IRequest | Array<IRequest>, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: any) => void) | null): void;
    public loadAny (requests: string | string[] | IRequest | Array<IRequest>, options: { [key: string]: any, preset?: string } | null, onComplete?: ((err: Error | null, data: any) => void) | null): void;
    public loadAny<T extends Asset> (requests: string, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public loadAny<T extends Asset> (requests: string[], onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public loadAny (requests: string | string[] | IRequest | Array<IRequest>, onComplete?: ((err: Error | null, data: any) => void) | null): void;
    public loadAny (
        requests: string | string[] | IRequest | Array<IRequest>,
        options?: { [key: string]: any, preset?: string } | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: any) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: any) => void) | null,
        onComplete?: ((err: Error | null, data: any) => void) | null,
    ): void {
        const { options: opts, onProgress: onProg, onComplete: onComp } = parseParameters(options, onProgress, onComplete);
        opts.preset = opts.preset || 'default';
        requests = Array.isArray(requests) ? requests.slice() : requests;
        const task = Task.create({ input: requests, onProgress: onProg, onComplete: asyncify(onComp), options: opts });
        pipeline.async(task);
    }

    /**
     * @en
     * General interface used to preload assets with a progression callback and a complete callback.It is highly recommended that you use
     * more simple API, such as `preloadRes`, `preloadResDir` etc. Everything about preload is just likes `assetManager.loadAny`, the
     * difference is `assetManager.preloadAny` will only download asset but not parse asset. You need to invoke `assetManager.loadAny()`
     * to finish loading asset
     *
     * @zh
     * 通用预加载资源接口，可传入进度回调以及完成回调，非常建议你使用更简单的 API ，例如 `preloadRes`, `preloadResDir` 等。`preloadAny` 和 `loadAny`
     * 几乎一样，区别在于 `preloadAny` 只会下载资源，不会去解析资源，你需要调用 `assetManager.loadAny()` 来完成资源加载。
     *
     * @param requests @en The preloading requests. @zh 预加载请求。
     * @param options @en Optional parameters. @zh 可选参数。
     * @param onProgress @en Callback invoked when the preloading progress change. @zh 预加载进度发生变化时执行的回调。
     * @param onProgress.finished
     * @en The number of request items that have finished preloading.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total @en The number of all request items to be preloaded. @zh 所有待预加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的预加载项。
     * @param onComplete @en Callback invoked when all assets preloaded. @zh 所有资源预加载完成后的回调。
     * @param onComplete.err
     * @en The error occurred in preloading process. Or null if preloaded successfully.
     * @zh 预加载过程中的发生的错误，如果预加载成功则为 null。
     * @param onComplete.items @en The preloaded content. @zh 完成预加载的内容。
     *
     * @example
     * assetManager.preloadAny('0cbZa5Y71CTZAccaIFluuZ', (err) => assetManager.loadAny('0cbZa5Y71CTZAccaIFluuZ'));
     *
     */
    public preloadAny (
        requests: string | string[] | IRequest | Array<IRequest>,
        options: { [key: string]: any, preset?: string } | null,
        onProgress: ((finished: number, total: number, item: RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: RequestItem[]) => void)|null): void;
    public preloadAny (requests: string | string[] | IRequest | Array<IRequest>, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadAny (requests: string | string[] | IRequest | Array<IRequest>, options: { [key: string]: any, preset?: string } | null, onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadAny (requests: string | string[] | IRequest | Array<IRequest>, onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadAny (
        requests: string | string[] | IRequest | Array<IRequest>,
        options?: { [key: string]: any, preset?: string } | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void) | null,
        onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null,
    ): void {
        const { options: opts, onProgress: onProg, onComplete: onComp } = parseParameters(options, onProgress, onComplete);
        opts.preset = opts.preset || 'preload';
        requests = Array.isArray(requests) ? requests.slice() : requests;
        const task = Task.create({ input: requests, onProgress: onProg, onComplete: asyncify(onComp), options: opts });
        fetchPipeline.async(task);
    }

    /**
     * @en
     * Loads remote asset with url, such as audio, image, text and so on.
     * Note that `loadRemote` uses the extension name in the url to determine how to load the asset.
     * If you pass in a url without the extension name, you need to specify the `ext` parameter
     * in the `options` to indicate how you want the asset loaded. See the third example below.
     *
     * @zh
     * 使用 url 加载远程资源，例如音频，图片，文本等等。需要注意的是 `loadRemote` 是通过 url 中的扩展名判断以何种方式加载该资源，
     * 如果你传入的 url 中没有携带后缀名，你需要额外指定 `options` 中的 `ext` 参数来表明你需要何种方式加载该资源。请参考下面的第三个示例。
     *
     * @param url @en The url of asset. @zh 资源的 URL 链接。
     * @param options @en Some optional parameters. @zh 一些可选参数。
     * @param options.ext
     * @en If the url does not have an extension name, you can specify one manually. This will affect the way the assets are loaded.
     * @zh 如果 URL 链接中没有包含扩展名，你可以手动指定一个扩展名。这将会影响资源的加载方式。
     * @param onComplete @en Callback invoked when finish loading. @zh 当完成加载时触发的回调函数。
     * @param onComplete.err @en The error occurred in loading process. Or null if loaded successfully. @zh 加载过程中出现的错误，如果加载成功则为 null。
     * @param onComplete.asset
     * @en The loaded asset. If there is an error in the loading process, this asset will be null.
     * @zh 加载好的资源，如果加载过程出现了错误，资源将会 null。
     *
     * @example
     * assetManager.loadRemote('http://www.cloud.com/test1.jpg', (err, texture) => console.log(err));
     * assetManager.loadRemote('http://www.cloud.com/test2.mp3', (err, audioClip) => console.log(err));
     * assetManager.loadRemote('http://www.cloud.com/test3', { ext: '.png' }, (err, texture) => console.log(err));
     *
     */
    public loadRemote<T extends Asset> (url: string, options: { [k: string]: any, ext?: string } | null, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public loadRemote<T extends Asset> (url: string, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public loadRemote<T extends Asset> (url: string, options?: { [k: string]: any, ext?: string } | ((err: Error | null, data: T) => void) | null, onComplete?: ((err: Error | null, data: T) => void) | null): void {
        const { options: opts, onComplete: onComp } = parseParameters<((err: Error | null, data: T) => void)>(options, undefined, onComplete);

        if (!opts.reloadAsset && this.assets.has(url)) {
            asyncify(onComp)(null, this.assets.get(url));
            return;
        }

        opts.__isNative__ = true;
        opts.preset = opts.preset || 'remote';
        this.loadAny({ url }, opts, null, (err, data): void => {
            if (err) {
                error(err.message, err.stack);
                if (onComp) { onComp(err, data as T); }
            } else {
                factory.create(url, data, (opts.ext as string) || path.extname(url), opts, (p1, p2): void => {
                    if (onComp) { onComp(p1, p2 as T); }
                });
            }
        });
    }

    /**
     * @en
     * loads bundle with bundle name or URL. When you have configured a bundle in your project, you can load the bundle by the name configured in your project.
     * Or when you put the bundle on the server, you can also load it by the full url address.
     *
     * Note: When you load a remote bundle by name, the bundle will be cached locally after download and will continue to use that cache in future, even if
     * the version of the bundle file on your server has changed. When you need to load the latest bundle, you can pass an additional `version` parameter in the
     * optional parameters and the asset system will compare this version number with the local cache, if the comparison fails, the asset system will pull
     * the latest version of the bundle data from the server again.
     *
     * @zh
     * 通过包名称或 url 加载资源包。当你在项目中配置了 Bundle 后，你可以通过项目中配置的名称来加载该 Bundle。
     * 或者当你将 bundle 放在服务器上时，你也可以通过完整的 url 地址进行加载。
     *
     * 注意：当你用名称加载远程 bundle 时，该 bundle 在下载后将会缓存在本地并在后续持续使用该缓存，即使你服务器上的 bundle 文件版本已经发生变化。当你需要加载
     * 最新的 bundle 时，你可以在可选参数中额外传入一个 `version` 参数，资源系统将比对此版本号与本地缓存是否一致，如果比对失败，则资源系统将重新从服务器上拉取
     * 最新版本的 bundle 数据。
     *
     * @param nameOrUrl @en The name or root path of bundle. @zh 待加载的 bundle 在项目中的名称或在服务器上的 url 路径。
     * @param options @en Some optional parameters. @zh 一些可选参数。
     * @param options.version
     * @en The version of the bundle, which you can get in the editor's build system, or directly by looking at the md5 hash value in the `config.json` path in the bundle directory after the build.
     * @zh bundle 的版本号，你可以在编辑器的构建系统中获取，或者直接查看构建后的 bundle 目录中 config.json 路径中的 md5 hash 值。
     * @param onComplete @en Callback invoked when bundle loaded or failed. @zh bundle 加载完成的回调。
     * @param onComplete.err @en The occurred error during the loading, Or null if loaded successfully. @zh 加载过程中发生的错误，如果加载成功则为 null。
     * @param onComplete.bundle
     * @en The loaded bundle. If there is an error in the loading process, this bundle will be null.
     * @zh 加载完成的 bundle。如果加载过程中出现了错误，则为 null。
     *
     * @example
     * loadBundle('myBundle', (err, bundle) => console.log(bundle));
     * loadBundle('http://localhost:8080/test', null, (err, bundle) => console.log(err));
     *
     */
    public loadBundle (nameOrUrl: string, options: { [k: string]: any, version?: string } | null, onComplete?: ((err: Error | null, data: Bundle) => void) | null): void;
    public loadBundle (nameOrUrl: string, onComplete?: ((err: Error | null, data: Bundle) => void) | null): void;
    public loadBundle (nameOrUrl: string, options?: { [k: string]: any, version?: string } | ((err: Error | null, data: Bundle) => void) | null, onComplete?: ((err: Error | null, data: Bundle) => void) | null): void {
        const { options: opts, onComplete: onComp } = parseParameters<((err: Error | null, data: Bundle) => void)>(options, undefined, onComplete);

        const bundleName = path.basename(nameOrUrl);

        if (this.bundles.has(bundleName)) {
            asyncify(onComp)(null, this.getBundle(bundleName));
            return;
        }

        opts.preset = opts.preset || 'bundle';
        opts.ext = 'bundle';
        opts.__isNative__ = true;
        this.loadAny({ url: nameOrUrl }, opts, null, (err, data): void => {
            if (err) {
                error(err.message, err.stack);
                if (onComp) { onComp(err, data as Bundle); }
            } else {
                factory.create(nameOrUrl, data, 'bundle', opts, (p1, p2): void => {
                    if (onComp) { onComp(p1, p2 as Bundle); }
                });
            }
        });
    }

    /**
     * @en
     * Release asset and it's dependencies.
     * This method will not only remove the cache of the asset in assetManager, but also clean up its content.
     * For example, if you release a texture, the texture asset and its gl texture data will be freed up.
     * Notice, this method may cause the texture to be unusable, if there are still other nodes use the same texture,
     * they may turn to black and report gl errors.
     *
     * @zh
     * 释放资源以及其依赖资源, 这个方法不仅会从 assetManager 中删除资源的缓存引用，还会清理它的资源内容。
     * 比如说，当你释放一个 texture 资源，这个 texture 和它的 gl 贴图数据都会被释放。
     * 注意，这个函数可能会导致资源贴图或资源所依赖的贴图不可用，如果场景中存在节点仍然依赖同样的贴图，它们可能会变黑并报 GL 错误。
     *
     * @param asset @en The asset to be released. @zh 被释放的资源。
     *
     * @example
     * // release a texture which is no longer need
     * assetManager.releaseAsset(texture);
     *
     */
    public releaseAsset (asset: Asset): void {
        releaseManager.tryRelease(asset, true);
    }

    /**
     * @en
     * Release all unused assets. Refer to [[releaseAsset]] for detailed information.
     *
     * @zh
     * 释放所有没有用到的资源。详细信息请参考 [[releaseAsset]]。
     *
     * @engineInternal
     *
     */
    public releaseUnusedAssets (): void {
        assets.forEach((asset): void => {
            releaseManager.tryRelease(asset);
        });
    }

    /**
     * @en
     * Release all assets. Refer to [[releaseAsset]] for detailed information.
     *
     * @zh
     * 释放所有资源。详细信息请参考 [[releaseAsset]]。
     *
     */
    public releaseAll (): void {
        assets.forEach((asset): void => {
            releaseManager.tryRelease(asset, true);
        });
    }

    /**
     * For internal usage.
     * @param json
     * @param options
     * @param onComplete
     * @internal
     */
    public loadWithJson<T extends Asset> (
        json: Record<string, any>,
        options: { [key: string]: any, assetId?: string } | null,
        onProgress: ((finished: number, total: number, item: RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: T) => void) | null): void;
    public loadWithJson<T extends Asset> (json: Record<string, any>, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: T) => void) | null): void;
    public loadWithJson<T extends Asset> (json: Record<string, any>, options: { [key: string]: any, assetId?: string }, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public loadWithJson<T extends Asset> (json: Record<string, any>, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public loadWithJson<T extends Asset> (
        json: Record<string, any>,
        options?: { [key: string]: any, assetId?: string } | ((err: Error | null, data: T) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: T) => void) | null,
        onComplete?: ((err: Error | null, data: T) => void) | null,
    ): void {
        if (BUILD) { throw new Error('Only valid in Editor'); }

        const { options: opts, onProgress: onProg, onComplete: onComp } = parseParameters<((err: Error | null, data: T) => void)>(options, onProgress, onComplete);

        const item = RequestItem.create();
        item.isNative = false;
        item.uuid = opts.assetId || (`${new Date().getTime()}${Math.random()}`);
        item.file = json;
        item.ext = '.json';

        const task = Task.create({
            input: [item],
            onProgress: onProg,
            options: opts,
            onComplete: asyncify((err: Error | null, data: T): void => {
                if (!err) {
                    if (!opts.assetId) {
                        data._uuid = '';
                    }
                }
                if (onComp) { onComp(err, data); }
            }),
        });
        this._parsePipeline$!.async(task);
    }
}

AssetManager.Pipeline = Pipeline;
AssetManager.Task = Task;
AssetManager.Cache = Cache;
AssetManager.RequestItem = RequestItem;
AssetManager.Bundle = Bundle;
AssetManager.BuiltinBundleName = BuiltinBundleName;
AssetManager.CacheManager = CacheManager;
AssetManager.Downloader = Downloader;
AssetManager.Parser = Parser;
AssetManager.DependUtil = DependUtil;

export declare namespace AssetManager {
    export { Pipeline };
    export { Task };
    export { Cache };
    export { RequestItem };
    export { Bundle };
    export { BuiltinBundleName };
    export { CacheManager };
    // Can not export interface in namespace for now.
    // export { ICache };
    // export { IAssetInfo, IPackInfo, IAddressableInfo, ISceneInfo, IRequest };
    export { DependUtil };
    export { Downloader };
    export { Parser };
}

/**
 * @en `assetManager` is a global singleton instance of [[AssetManager]].
 * The engine uses `assetManager` to manage all asset and asset bundle, including loading, releasing, etc.
 * @zh `assetManager` 为 [[AssetManager]] 的全局单例，引擎使用 `assetManager` 来完成所有资源和资源包的管理工作，包括加载，释放等。
 */
const assetManager = cclegacy.assetManager = AssetManager.instance;
export default assetManager;
cclegacy.AssetManager = AssetManager;
