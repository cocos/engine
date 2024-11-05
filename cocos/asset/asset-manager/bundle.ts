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

import { Asset } from '../assets/asset';
import { SceneAsset } from '../assets/scene-asset';
import { error, errorID, cclegacy } from '../../core';
import Config, { IAddressableInfo, IAssetInfo, IConfigOption, ISceneInfo } from './config';
import { releaseManager } from './release-manager';
import RequestItem from './request-item';
import { assets, bundles, RequestType } from './shared';
import { parseLoadResArgs, parseParameters } from './utilities';
import type { AssetManager } from './asset-manager';

/**
 * @en
 * A bundle contains an amount of assets(includes scene), you can load, preload, release asset which is in this bundle.
 *
 * @zh
 * 一个包含一定数量资源（包括场景）的包，你可以加载，预加载，释放此包内的资源。
 *
 */
export default class Bundle {
    private _config$: Config = new Config();

    /**
     * For internal use.
     * @engineInternal
     */
    public get config (): Config {
        return this._config$;
    }

    /**
     * @en
     * The name of this bundle.
     *
     * @zh
     * 此 bundle 的名称。
     *
     */
    public get name (): string {
        return this._config$.name;
    }

    /**
     * @en
     * The dependent bundles of this bundle.
     *
     * @zh
     * 此 bundle 的依赖包。
     *
     */
    public get deps (): string[] {
        return this._config$.deps!;
    }

    /**
     * @en
     * The root path of this bundle, such like 'http://example.com/bundle1'.
     *
     * @zh
     * 此 bundle 的根路径, 例如 'http://example.com/bundle1'。
     *
     */
    public get base (): string {
        return this._config$.base;
    }

    /**
     * @en
     * Gets asset's info using path, only valid when asset is in bundle folder.
     *
     * @zh
     * 使用 path 获取资源的配置信息。
     *
     * @param path @en The relative path of asset, such as 'images/a'. @zh 资源的相对路径，例如 `images/a`。
     * @param type @en The constructor of asset, such as `Texture2D`. @zh 资源的类型，例如 [[Texture2D]]。
     * @returns @en The asset info. @zh 资源的信息。
     *
     * @example
     * const info = bundle.getInfoWithPath('image/a', Texture2D);
     *
     */
    public getInfoWithPath (path: string, type?: Constructor<Asset> | null): IAddressableInfo | null {
        return this._config$.getInfoWithPath(path, type);
    }

    /**
     * @en
     * Gets all asset's info within specific folder.
     *
     * @zh
     * 获取在某个指定文件夹下的所有资源信息。
     *
     * @param path @en The relative path of folder, such as 'images'. @zh 文件夹的相对路径，例如 `images`。
     * @param type
     * @en The asset type, can be used to find the information of the specified type of asset in the directory.
     * @zh 资源的类型，指定后可以用来查找目录下指定类型的资源信息。
     * @param out @en The output array. @zh 输出数组。
     * @returns @en Queried asset information. @zh 查询到的资源信息。
     *
     * @example
     * const infos = [];
     * bundle.getDirWithPath('images', Texture2D, infos);
     */
    public getDirWithPath (path: string, type?: Constructor<Asset> | null, out?: IAddressableInfo[]): IAddressableInfo[] {
        return this._config$.getDirWithPath(path, type, out);
    }

    /**
     * @en
     * Get asset's information with uuid.
     *
     * @zh
     * 通过 uuid 获取资源信息。
     *
     * @param  uuid @en The asset's uuid. @zh 资源的 uuid。
     * @returns @en The information of asset. @zh 资源的信息。
     *
     * @example
     * const info = bundle.getAssetInfo('fcmR3XADNLgJ1ByKhqcC5Z');
     *
     */
    public getAssetInfo (uuid: string): IAssetInfo | null {
        return this._config$.getAssetInfo(uuid);
    }

    /**
     * @en
     * Gets scene's information with name.
     *
     * @zh
     * 通过场景名获取场景信息。
     *
     * @param name @en The name of scene. @zh 场景名称。
     * @returns @en The information of scene. @zh 场景信息。
     *
     * @example
     * const info = bundle.getSceneInfo('first.fire');
     *
     */
    public getSceneInfo (name: string): ISceneInfo | null {
        return this._config$.getSceneInfo(name);
    }

    /**
     * @en
     * Initializes this bundle with options.
     *
     * @zh
     * 初始化此 bundle。
     *
     * @param options
     * @deprecate Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     *
     */
    public init (options: IConfigOption): void {
        this._config$.init(options);
        bundles.add(options.name, this);
    }

    /**
     * @en
     * Loads the asset within this bundle by the path which is relative to bundle's path.
     *
     * @zh
     * 通过相对路径加载分包中的资源。路径是相对分包文件夹路径的相对路径。
     *
     * @param paths
     * @en Paths of the target assets.These paths are relative to the bundle's folder, extension name must be omitted.
     * @zh 需要加载的资源的路径。此路径为工程中相对于 bundle 文件夹的相对路径，路径中请不要带扩展名。
     * @param type
     * @en Asset type, if this parameter is passed, the asset of the corresponding type will be found in the assets of the corresponding path to finish loading.
     * @zh 资源类型，如果传入此参数，则会在对应路径的资源中找到对应类型的资源完成加载。
     * @param onProgress
     * @en Callback invoked when the loading progress change.
     * @zh 加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been loaded.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be loaded.
     * @zh 所有待加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
     * @param onComplete @en Callback invoked when all assets loaded. @zh 所有资源加载完成后的回调。
     * @param onComplete.error @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
     * @param onComplete.assets @en The loaded asset, or null if an error occurred during loading. @zh 已加载的资源，如果加载过程中有错误发生，则为 null。
     *
     * @example
     * // load the texture (${project}/assets/resources/textures/background.jpg) from resources
     * resources.load('textures/background', Texture2D, (err, texture) => console.log(err));
     *
     * // load the audio (${project}/assets/resources/music/hit.mp3) from resources
     * resources.load('music/hit', AudioClip, (err, audio) => console.log(err));
     *
     * // load the prefab (${project}/assets/bundle1/misc/character/cocos) from bundle1 folder
     * bundle1.load('misc/character/cocos', Prefab, (err, prefab) => console.log(err));
     *
     * // load the sprite frame (${project}/assets/some/xxx/bundle2/imgs/cocos.png) from bundle2 folder
     * bundle2.load('imgs/cocos', SpriteFrame, null, (err, spriteFrame) => console.log(err));
     *
     */
    public load<T extends Asset> (
        paths: string,
        type: Constructor<T> | null,
        onProgress: ((finished: number, total: number, item: RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: T) => void) | null): void;
    public load<T extends Asset> (
        paths: string[], type: Constructor<T> | null,
        onProgress: ((finished: number, total: number, item: RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public load<T extends Asset> (paths: string, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: T) => void) | null): void;
    public load<T extends Asset> (paths: string[], onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public load<T extends Asset> (paths: string, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public load<T extends Asset> (paths: string[], onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public load<T extends Asset> (paths: string, type: Constructor<T> | null, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public load<T extends Asset> (paths: string[], type: Constructor<T> | null, onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public load<T extends Asset> (
        paths: string|string[],
        type?: Constructor<T> | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: T|T[]) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: T|T[]) => void) | null,
        onComplete?: ((err: Error | null, data: T|T[]) => void) | null,
    ): void {
        const { type: _type, onProgress: onProg, onComplete: onComp } = parseLoadResArgs(type, onProgress, onComplete);
        const options = { __requestType__: RequestType.PATH, type: _type, bundle: this.name, __outputAsArray__: Array.isArray(paths) };
        (cclegacy.assetManager as AssetManager).loadAny(paths, options, onProg, onComp);
    }

    /**
     * @en
     * Preloads the asset within this bundle by the path which is relative to bundle's path.
     * After calling this method, you still need to finish loading by calling [[Bundle.load]].
     * It will be totally fine to call [[Bundle.load]] at any time even if the preloading is not
     * yet finished.
     *
     * @zh
     * 通过相对路径预加载分包中的资源。路径是相对分包文件夹路径的相对路径。调用完后，你仍然需要通过 [[Bundle.load]] 来完成加载。
     * 就算预加载还没完成，你也可以直接调用 [[Bundle.load]]。
     *
     * @param paths
     * @en Paths of the target assets.These paths are relative to the bundle's folder, extension name must be omitted.
     * @zh 需要加载的资源的路径。此路径为工程中相对于 bundle 文件夹的相对路径，路径中请不要带扩展名。
     * @param type
     * @en Asset type, if this parameter is passed, the asset of the corresponding type will be found in the assets of the corresponding path to finish preloading.
     * @zh 资源类型，如果传入此参数，则会在对应路径的资源中找到对应类型的资源完成预加载。
     * @param onProgress
     * @en Callback invoked when the preloading progress change.
     * @zh 预加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been preloaded.
     * @zh 已经完成预加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be preloaded.
     * @zh 所有待预加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的预加载项。
     * @param onComplete @en Callback invoked when all assets preloaded. @zh 所有资源预加载完成后的回调。
     * @param onComplete.error @en Error message during preloading, or null if preloaded successfully. @zh 预加载过程中的错误信息，如果预加载成功则为 null。
     * @param onComplete.items @en The preloaded items. @zh 预加载项。
     *
     * @example
     * // preload the texture (${project}/assets/resources/textures/background.jpg) from resources
     * resources.preload('textures/background', Texture2D);
     *
     * // preload the audio (${project}/assets/resources/music/hit.mp3) from resources
     * resources.preload('music/hit', AudioClip);
     * // wait for while
     * resources.load('music/hit', AudioClip, (err, audioClip) => {});
     *
     * * // preload the prefab (${project}/assets/bundle1/misc/character/cocos) from bundle1 folder
     * bundle1.preload('misc/character/cocos', Prefab);
     *
     * // load the sprite frame of (${project}/assets/bundle2/imgs/cocos.png) from bundle2 folder
     * bundle2.preload('imgs/cocos', SpriteFrame);
     * // wait for while
     * bundle2.load('imgs/cocos', SpriteFrame, (err, spriteFrame) => {});
     *
     */
    public preload (paths: string|string[], type: Constructor<Asset>|null, onProgress: ((finished: number, total: number, item: RequestItem) => void)|null, onComplete: ((err: Error | null, data: RequestItem[]) => void)|null): void;
    public preload (paths: string|string[], onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preload (paths: string|string[], onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preload (paths: string|string[], type: Constructor<Asset> | null, onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preload (
        paths: string|string[],
        type?: Constructor<Asset> | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void) | null,
        onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null,
    ): void {
        const { type: _type, onProgress: onProg, onComplete: onComp } = parseLoadResArgs(type, onProgress, onComplete);
        (cclegacy.assetManager as AssetManager).preloadAny(paths, { __requestType__: RequestType.PATH, type: _type, bundle: this.name }, onProg, onComp);
    }

    /**
     * @en
     * Loads all assets under a folder inside the bundle folder.<br>
     * <br>
     * Note: All asset paths in Creator use forward slashes, paths using backslashes will not work.
     *
     * @zh
     * 加载目标文件夹中的所有资源, 注意：路径中只能使用斜杠，反斜杠将停止工作。
     *
     * @param dir @en The path of the target folder. The path is relative to the bundle folder. @zh 目标文件夹路径，此路径为相对于 bundle 文件夹的路径。
     * @param type @en The asset type. Only specify type asset will be loaded if this argument is supplied. @zh 资源类型，如果指定了此参数，则只会加载目标文件夹下此类型的资源。
     * @param onProgress
     * @en Callback invoked when the loading progress change.
     * @zh 加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been loaded.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be loaded.
     * @zh 所有待加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
     * @param onComplete @en Callback invoked when all assets loaded. @zh 所有资源加载完成后的回调。
     * @param onComplete.error @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
     * @param onComplete.assets @en An array of all loaded assets. @zh 完成加载的资源数组。
     *
     * @example
     * // load all audios (resources/audios/)
     * resources.loadDir('audios', AudioClip, (err, audios) => {});
     *
     * // load all textures in "resources/imgs/"
     * resources.loadDir('imgs', Texture2D, null, function (err, textures) {
     *     var texture1 = textures[0];
     *     var texture2 = textures[1];
     * });
     *
     * // load all prefabs (${project}/assets/bundle1/misc/characters/) from bundle1 folder
     * bundle1.loadDir('misc/characters', Prefab, (err, prefabs) => console.log(err));
     *
     * // load all sprite frame (${project}/assets/some/xxx/bundle2/skills/) from bundle2 folder
     * bundle2.loadDir('skills', SpriteFrame, null, (err, spriteFrames) => console.log(err));
     *
     */
    public loadDir<T extends Asset> (dir: string, type: Constructor<T> | null, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public loadDir<T extends Asset> (dir: string, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public loadDir<T extends Asset> (dir: string, onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public loadDir<T extends Asset> (dir: string, type: Constructor<T> | null, onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public loadDir<T extends Asset> (
        dir: string,
        type?: Constructor<T> | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: T[]) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: T[]) => void) | null,
        onComplete?: ((err: Error | null, data: T[]) => void) | null,
    ): void {
        const { type: _type, onProgress: onProg, onComplete: onComp } = parseLoadResArgs(type, onProgress, onComplete);
        (cclegacy.assetManager as AssetManager).loadAny(dir, { __requestType__: RequestType.DIR, type: _type, bundle: this.name, __outputAsArray__: true }, onProg, onComp);
    }

    /**
     * @en
     * Preloads all assets under a folder inside the bundle folder.<br> After calling this method, you still need to
     * finish loading by calling [[Bundle.loadDir]].
     * It will be totally fine to call [[Bundle.loadDir]] at any time even if the preloading is not yet finished.
     *
     * @zh
     * 预加载目标文件夹中的所有资源。调用完后，你仍然需要通过 [[Bundle.loadDir]] 来完成加载。
     * 就算预加载还没完成，你也可以直接调用 [[Bundle.loadDir]]。
     *
     * @param dir @en The path of the target folder. The path is relative to the bundle folder. @zh 目标文件夹路径，此路径为相对于 bundle 文件夹的路径。
     * @param type @en The asset type. Only specify type asset will be preloaded if this argument is supplied. @zh 资源类型，如果指定了此参数，则只会预加载目标文件夹下此类型的资源。
     * @param onProgress
     * @en Callback invoked when the preloading progress change.
     * @zh 预加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been preloaded.
     * @zh 已经完成预加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be preloaded.
     * @zh 所有待预加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的预加载项。
     * @param onComplete @en Callback invoked when all assets preloaded. @zh 所有资源预加载完成后的回调。
     * @param onComplete.error @en Error message during preloading, or null if preloaded successfully. @zh 预加载过程中的错误信息，如果预加载成功则为 null。
     * @param onComplete.items @en The preloaded items. @zh 预加载项。
     *
     * @example
     * // preload all audios (resources/audios/)
     * resources.preloadDir('audios', AudioClip);
     *
     * // preload all textures in "resources/imgs/"
     * resources.preloadDir('imgs', Texture2D);
     * // wait for while
     * resources.loadDir('imgs', Texture2D, (err, textures) => {});
     *
     * // preload all prefabs (${project}/assets/bundle1/misc/characters/) from bundle1 folder
     * bundle1.preloadDir('misc/characters', Prefab);
     *
     * // preload all sprite frame (${project}/assets/some/xxx/bundle2/skills/) from bundle2 folder
     * bundle2.preloadDir('skills', SpriteFrame);
     * // wait for while
     * bundle2.loadDir('skills', SpriteFrame, (err, spriteFrames) => {});
     */
    public preloadDir (dir: string, type: Constructor<Asset> | null, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadDir (dir: string, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadDir (dir: string, onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadDir (dir: string, type: Constructor<Asset> | null, onComplete?: ((err: Error | null, data: RequestItem[]) => void) | null): void;
    public preloadDir (
        dir: string,
        type?: Constructor<Asset> | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void)| null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: RequestItem[]) => void)| null,
        onComplete?: ((err: Error | null, data: RequestItem[]) => void)| null,
    ): void {
        const { type: _type, onProgress: onProg, onComplete: onComp } = parseLoadResArgs(type, onProgress, onComplete);
        (cclegacy.assetManager as AssetManager).preloadAny(dir, { __requestType__: RequestType.DIR, type: _type, bundle: this.name }, onProg, onComp);
    }

    /**
     * @en
     * Loads the scene asset within this bundle by its name.
     *
     * @zh
     * 通过场景名称加载分包中的场景资源。
     *
     * @param sceneName @en The name of the scene to be loaded. @zh 待加载的场景名称。
     * @param options @en Some optional parameters. @zh 可选参数。
     * @param onProgress
     * @en Callback invoked when the loading progress change.
     * @zh 加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been loaded.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be loaded.
     * @zh 所有待加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
     * @param onComplete @en Callback invoked when the scene loaded. @zh 场景加载完成后的回调。
     * @param onComplete.error @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
     * @param onComplete.sceneAsset @en The scene asset. @zh 加载完成的场景资源。
     *
     * @example
     * bundle1.loadScene('first', (err, sceneAsset) => director.runScene(sceneAsset));
     *
     */
    public loadScene (sceneName: string, options: { [key: string]: any, preset?: 'string' } | null, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: SceneAsset) => void) | null): void;
    public loadScene (sceneName: string, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err: Error | null, data: SceneAsset) => void) | null): void;
    public loadScene (sceneName: string, options: { [key: string]: any, preset?: 'string' } | null, onComplete?: ((err: Error | null, data: SceneAsset) => void) | null): void;
    public loadScene (sceneName: string, onComplete?: ((err: Error | null, data: SceneAsset) => void) | null): void;
    public loadScene (
        sceneName: string,
        options?: { [key: string]: any, preset?: 'string' } | ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: SceneAsset) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err: Error | null, data: SceneAsset) => void) | null,
        onComplete?: ((err: Error | null, data: SceneAsset) => void) | null,
    ): void {
        const { options: opts, onProgress: onProg, onComplete: onComp } = parseParameters<((err: Error | null, data: SceneAsset) => void)>(options, onProgress, onComplete);

        opts.preset = opts.preset || 'scene';
        opts.bundle = this.name;
        (cclegacy.assetManager as AssetManager).loadAny({ scene: sceneName }, opts, onProg, (err, sceneAsset: SceneAsset): void => {
            if (err) {
                error(err.message, err.stack);
            } else if (sceneAsset.scene) {
                const scene = sceneAsset.scene;
                scene.id = sceneAsset._uuid;
                scene.name = sceneAsset.name;
            } else {
                err = new Error(`The asset ${sceneAsset._uuid} is not a scene`);
            }
            if (onComp) { onComp(err, sceneAsset); }
        });
    }

    /**
     * @en
     * Preload the scene asset within this bundle by its name. After calling this method, you still need to finish loading
     * by calling [[Bundle.loadScene]] or [[Director.loadScene]].It will be totally fine to call [[Bundle.loadScene]] at any
     * time even if the preloading is not yet finished.
     *
     * @zh
     * 通过场景名称预加载分包中的场景资源.调用完后，你仍然需要通过 [[Bundle.loadScene]] 或 [[Director.loadScene]] 来完成加载。
     * 就算预加载还没完成，你也可以直接调用 [[Bundle.loadScene]] 或 [[Director.loadScene]]。
     *
     * @param sceneName @en The name of the scene to be preloaded. @zh 待预加载的场景名称。
     * @param options  @en Some optional parameters. @zh 可选参数。
     * @param onProgress
     * @en Callback invoked when the preloading progress change.
     * @zh 预加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been preloaded.
     * @zh 已经完成预加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be preloaded.
     * @zh 所有待预加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的预加载项。
     * @param onComplete @en Callback invoked when the scene preloaded. @zh 场景预加载完成后的回调。
     * @param onComplete.error @en Error message during preloading, or null if preloaded successfully. @zh 预加载过程中的错误信息，如果预加载成功则为 null。
     *
     * @example
     * bundle1.preloadScene('first');
     * // wait for a while
     * bundle1.loadScene('first', (err, scene) => director.runScene(scene));
     *
     */
    public preloadScene (sceneName: string, options: { [key: string]: any, preset?: 'string' } | null, onProgress: ((finished: number, total: number, item: RequestItem) => void), onComplete: ((err?: Error | null) => void) | null): void;
    public preloadScene (sceneName: string, onProgress: ((finished: number, total: number, item: RequestItem) => void) | null, onComplete: ((err?: Error | null) => void) | null): void;
    public preloadScene (sceneName: string, options: { [key: string]: any, preset?: 'string' } | null, onComplete?: ((err?: Error | null) => void) | null): void;
    public preloadScene (sceneName: string, onComplete?: ((err?: Error | null) => void) | null): void;
    public preloadScene (
        sceneName: string,
        options?: { [key: string]: any, preset?: 'string' } | ((finished: number, total: number, item: RequestItem) => void) | ((err?: Error | null) => void) | null,
        onProgress?: ((finished: number, total: number, item: RequestItem) => void) | ((err?: Error | null) => void) | null,
        onComplete?: ((err?: Error | null) => void) | null,
    ): void {
        const { options: opts, onProgress: onProg, onComplete: onComp } = parseParameters<((err?: Error | null) => void)>(options, onProgress, onComplete);

        opts.bundle = this.name;
        (cclegacy.assetManager as AssetManager).preloadAny({ scene: sceneName }, opts, onProg, (err): void => {
            if (err) {
                errorID(1210, sceneName, err.message);
            }
            if (onComp) { onComp(err); }
        });
    }

    /**
     * @en
     * Gets cached asset within this bundle by path and type. <br>
     * After you load asset with [[load]] or [[loadDir]],
     * you can acquire them by passing the path to this API.
     *
     * NOTE：When there are multiple asset with the same name, you can get the specific asset by specifying the type.
     * Otherwise the first asset matching that name will be returned.
     *
     * @zh
     * 通过路径与类型获取已缓存资源。在你使用 [[load]] 或者 [[loadDir]] 之后，
     * 你能通过传路径通过这个 API 获取到这些资源。
     *
     * 注意：当有多个同名的资产时，你可以通过指定类型来获得具体的资产。
     * 否则将返回与该名称相匹配的第一个资产。
     *
     * @param path @en The path of asset. @zh 资源的路径。
     * @param type @en The asset type. Only specify type asset will be returned if this argument is supplied. @zh 资源类型，指定后只会返回该类型的资源。
     * @returns @en The asset has been cached. @zh 已缓存的资源。
     *
     * @example
     * bundle1.get('music/hit', AudioClip);
     */
    public get<T extends Asset> (path: string, type?: Constructor<T> | null): T | null {
        const info = this.getInfoWithPath(path, type);
        if (info) {
            return assets.get(info.uuid) as T || null;
        }

        return null;
    }

    /**
     * @en
     * Releases the asset loaded by [[load]] or [[loadDir]].
     * and it's dependencies. Refer to [[AssetManager.releaseAsset]] for detailed information.
     *
     * NOTE：When there are multiple asset with the same name, you can specify the asset to be released by specifying the type.
     * Otherwise the first resource matching that name will be released.
     *
     * @zh
     * 释放通过 [[load]] 或者 [[loadDir]] 加载的资源。
     * 详细信息请参考 [[AssetManager.releaseAsset]]。
     *
     * 注意：当存在多个资源同名时，可以通过指定类型来指定要释放的资源，否则将释放第一个匹配该名称的资源。

     *
     * @param path @en The path of asset. @zh 资源的路径。
     * @param type @en The type of asset. @zh 资源的类型。
     *
     * @example
     * // release a texture which is no longer need
     * bundle1.release('misc/character/cocos');
     *
     */
    public release (path: string, type?: Constructor<Asset> | null): void {
        const asset = this.get(path, type);
        if (asset) {
            releaseManager.tryRelease(asset, true);
        }
    }

    /**
     * @en
     * Release all unused assets within this bundle. Refer to [[AssetManager.releaseAll]] for detailed information.
     *
     * @zh
     * 释放此包中的所有没有用到的资源。详细信息请参考 [[AssetManager.releaseAll]]。
     *
     * @example
     * // release all unused asset within bundle1
     * bundle1.releaseUnusedAssets();
     *
     * @engineInternal
     */
    public releaseUnusedAssets (): void {
        assets.forEach((asset): void => {
            const info = this.getAssetInfo(asset._uuid);
            if (info && !info.redirect) {
                releaseManager.tryRelease(asset);
            }
        });
    }

    /**
     * @en
     * Release all assets within this bundle. Refer to [[AssetManager.releaseAll]] for detailed information.
     *
     * @zh
     * 释放此包中的所有资源。详细信息请参考 [[AssetManager.releaseAll]]。
     *
     * @example
     * // release all asset within bundle1
     * bundle1.releaseAll();
     */
    public releaseAll (): void {
        assets.forEach((asset): void => {
            const info = this.getAssetInfo(asset._uuid);
            if (info && !info.redirect) {
                releaseManager.tryRelease(asset, true);
            }
        });
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _destroy (): void {
        this._config$.destroy();
    }
}

/**
 * @en
 * A [[Bundle]] instance to manage all assets in assets/resources.
 *
 * @zh
 * 一个 [[Bundle]] 实例，用于管理所有在 assets/resources 下的资源。
 */
export const resources: Bundle = new Bundle();
cclegacy.resources = resources;
