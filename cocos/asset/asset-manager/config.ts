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
import { EDITOR_NOT_IN_PREVIEW, TEST } from 'internal:constants';
import { Asset } from '../assets';
import { js, cclegacy } from '../../core';
import Cache from './cache';
import { decodeUuid, normalize } from './helper';

export interface IConfigOption {
    importBase: string;
    nativeBase: string;
    base: string;
    name: string;
    deps: string[];
    uuids: string[];
    paths: Record<string, any[]>;
    scenes: Record<string, string>;
    packs: Record<string, string[]>;
    versions: { import: string[], native: string[] };
    redirect: string[];
    debug: boolean;
    types: string[];
    extensionMap: Record<string, string[]>;
}

/**
 * @en Th asset's meta information. Used to obtain information about the asset.
 * @zh 资源的元信息。用于获取资源的相关信息。
 */
export interface IAssetInfo {
    /**
     * @en The uuid of asset.
     * @zh 资源的 uuid.
     */
    uuid: string;
    /**
     * @en Information about the file where the asset is located. A asset can be in multiple merged files.
     * @zh 资源所在文件的相关信息。一个资源可在多个合并文件中。
     */
    packs?: IPackInfo[];
    /**
     * @en The redirect bundle of this asset. When multiple bundles with different priorities reference to the same asset,
     * the asset will be stored in the bundle with the higher priority first, while the other bundles will store a record
     * and the `redirect` property of that record will point to the bundle that actually stores the resource.
     * @zh 资源所重定向的 bundle。当多个 bundle 引用同一份资源，且优先级不一样时，资源会优先存储在优先级高的 bundle 中，
     * 其他 bundle 则会存储一条记录，并且该记录的 redirect 属性将指向真实存储此资源的 bundle。
     */
    redirect?: string;
    /**
     * @en The version of the asset.
     * @zh 资源的版本号。
     */
    ver?: string;
    /**
     * @en The version of the native dependency of the asset.
     * @zh 资源的原生依赖的版本号。
     */
    nativeVer?: string;
    /**
     * @en The extension of the asset, or 'json' if it is null.
     * This property is used to mark assets with special extensions like 'CCON'.
     * @zh 资源的原生依赖的版本号。
     */
    extension?: string;
}

/**
 * @en Information about the merged files.
 * @zh 合并文件的信息。
 */
export interface IPackInfo {
    /**
     * @en The unique id of this merged file.
     * @zh 此合并文件的唯一 id.
     */
    uuid: string;

    /**
     * @en The uuid of all the assets contained in this file.
     * @zh 此文件中包含的所有资源的 uuid。
     */
    packedUuids: string[];

    /**
     * @en The extension of this merged file on the file system, default is 'json'.
     * @zh 此合并文件在文件系统上的扩展名，默认为 'json'.
     */
    ext: string;
}

/**
 * @en Addressable asset information, you can look up the path of the asset in the project and the type of the asset.
 * @zh 可寻址资源的信息，你可以查询到该资源在项目中的路径与资源的类型。
 */
export interface IAddressableInfo extends IAssetInfo {
    /**
     * @en The relative path of this asset in the project relative to the bundle folder.
     * @zh 此资源在项目中相对于 bundle 文件夹的相对路径。
     */
    path: string;
    /**
     * @en The type of the asset.
     * @zh 此资源的类型。
     */
    ctor: Constructor<Asset>;
}

/**
 * @en Information about the scene asset.
 * @zh 场景资源的相关信息。
 */
export interface ISceneInfo extends IAssetInfo {
    /**
     * @en The path of the scene asset in the project relative to the bundle folder.
     * @zh 场景资源在项目中相对 bundle 文件夹的路径。
     */
    url: string;
}

const isMatchByWord = (path: string, test: string): boolean => {
    if (path.length > test.length) {
        const nextAscii = path.charCodeAt(test.length);
        return nextAscii === 47; // '/'
    }
    return true;
};

const processOptions = (options: IConfigOption): void => {
    if (EDITOR_NOT_IN_PREVIEW || TEST) { return; }
    let uuids = options.uuids;
    const paths = options.paths;
    const types = options.types;
    const bundles = options.deps;
    const realEntries = options.paths = Object.create(null);

    if (options.debug === false) {
        for (let i = 0, l = uuids.length; i < l; i++) {
            uuids[i] = decodeUuid(uuids[i]);
        }

        for (const id in paths) {
            const entry = paths[id];
            const type = entry[1];
            entry[1] = types[type];
        }
    } else {
        const out = Object.create(null);
        for (let i = 0, l = uuids.length; i < l; i++) {
            const uuid = uuids[i];
            uuids[i] = out[uuid] = decodeUuid(uuid);
        }
        uuids = out;
    }

    for (const id in paths) {
        const entry = paths[id];
        realEntries[uuids[id]] = entry;
    }

    const scenes = options.scenes;
    for (const name in scenes) {
        const uuid = scenes[name];
        scenes[name] = uuids[uuid];
    }

    const packs = options.packs;
    for (const packId in packs) {
        const packedIds = packs[packId];
        for (let j = 0; j < packedIds.length; ++j) {
            packedIds[j] = uuids[packedIds[j]];
        }
    }

    const versions = options.versions;
    if (versions) {
        for (const folder in versions) {
            const entries = versions[folder];
            for (let i = 0; i < entries.length; i += 2) {
                const uuid = entries[i];
                entries[i] = uuids[uuid] || uuid;
            }
        }
    }

    const redirect = options.redirect;
    if (redirect) {
        for (let i = 0; i < redirect.length; i += 2) {
            redirect[i] = uuids[redirect[i]];
            redirect[i + 1] = bundles[redirect[i + 1]];
        }
    }

    const extensionMap = options.extensionMap;
    if (extensionMap) {
        for (const ext in options.extensionMap) {
            if (!Object.prototype.hasOwnProperty.call(options.extensionMap, ext)) {
                continue;
            }
            options.extensionMap[ext].forEach((uuid, index): void => {
                options.extensionMap[ext][index] = uuids[uuid] || uuid;
            });
        }
    }
};

export default class Config {
    public name = '';

    public base = '';

    public importBase = '';

    public nativeBase = '';

    public deps: string[] | null = null;

    public assetInfos = new Cache<IAssetInfo>();

    public scenes = new Cache<ISceneInfo>();

    public paths = new Cache<IAddressableInfo[]>();

    public init (options: IConfigOption): void {
        processOptions(options);

        this.importBase = options.importBase || '';
        this.nativeBase = options.nativeBase || '';
        this.base = options.base || '';
        this.name = options.name || '';
        this.deps = options.deps || [];
        // init
        this._initUuid(options.uuids);
        this._initPath(options.paths);
        this._initScene(options.scenes);
        this._initPackage(options.packs);
        this._initVersion(options.versions);
        this._initRedirect(options.redirect);
        for (const ext in options.extensionMap) {
            if (!Object.prototype.hasOwnProperty.call(options.extensionMap, ext)) {
                continue;
            }
            options.extensionMap[ext].forEach((uuid): void => {
                const assetInfo = this.assetInfos.get(uuid);
                if (assetInfo) {
                    assetInfo.extension = ext;
                }
            });
        }
    }

    public getInfoWithPath (path: string, type?: Constructor<Asset> | null): IAddressableInfo | null {
        if (!path) {
            return null;
        }
        path = normalize(path);
        const items = this.paths.get(path);
        if (items) {
            if (type) {
                for (let i = 0, l = items.length; i < l; i++) {
                    const assetInfo = items[i];
                    if (js.isChildClassOf(assetInfo.ctor, type)) {
                        return assetInfo;
                    }
                }
            } else {
                return items[0];
            }
        }
        return null;
    }

    public getDirWithPath (path: string, type?: Constructor<Asset> | null, out?: IAddressableInfo[]): IAddressableInfo[] {
        path = normalize(path);
        if (path[path.length - 1] === '/') {
            path = path.slice(0, -1);
        }

        const infos = out || [];
        this.paths.forEach((items, p): void => {
            if ((p.startsWith(path) && isMatchByWord(p, path)) || !path) {
                for (let i = 0, l = items.length; i < l; i++) {
                    const entry = items[i];
                    if (!type || js.isChildClassOf(entry.ctor, type)) {
                        infos.push(entry);
                    }
                }
            }
        });

        return infos;
    }

    public getAssetInfo (uuid: string): IAssetInfo | null {
        return this.assetInfos.get(uuid) || null;
    }

    public getSceneInfo (name: string): ISceneInfo | null {
        if (!name.endsWith('.scene')) {
            name += '.scene';
        }
        if (name[0] !== '/' && !name.startsWith('db://')) {
            name = `/${name}`;
        }
        // search scene
        const info = this.scenes.find((val, key): boolean => key.endsWith(name));
        return info;
    }

    public destroy (): void {
        this.paths.destroy();
        this.scenes.destroy();
        this.assetInfos.destroy();
    }

    private _initUuid (uuidList: string[]): void {
        if (!uuidList) {
            return;
        }
        this.assetInfos.clear();
        for (let i = 0, l = uuidList.length; i < l; i++) {
            const uuid = uuidList[i];
            this.assetInfos.add(uuid, { uuid });
        }
    }

    private _initPath (pathList: Record<string, string[]>): void {
        if (!pathList) { return; }
        const paths = this.paths;
        paths.clear();
        for (const uuid in pathList) {
            const info = pathList[uuid];
            const path = info[0];
            const type = info[1];
            const isSubAsset = info.length === 3;

            const assetInfo = this.assetInfos.get(uuid) as IAddressableInfo;
            assetInfo.path = path;
            assetInfo.ctor = js.getClassById(type) as Constructor<Asset>;
            if (paths.has(path)) {
                if (isSubAsset) {
                    paths.get(path)!.push(assetInfo);
                } else {
                    paths.get(path)!.unshift(assetInfo);
                }
            } else {
                paths.add(path, [assetInfo]);
            }
        }
    }

    private _initScene (sceneList: Record<string, string>): void {
        if (!sceneList) { return; }
        const scenes = this.scenes;
        scenes.clear();
        const assetInfos = this.assetInfos;
        for (const sceneName in sceneList) {
            const uuid = sceneList[sceneName];
            const assetInfo = assetInfos.get(uuid) as ISceneInfo;
            assetInfo.url = sceneName;
            scenes.add(sceneName, assetInfo);
        }
    }

    private _initPackage (packageList: Record<string, string[]>): void {
        if (!packageList) { return; }
        const assetInfos = this.assetInfos;
        for (const packUuid in packageList) {
            const uuids = packageList[packUuid];
            const pack = { uuid: packUuid, packedUuids: uuids, ext: '.json' };
            assetInfos.add(packUuid, pack);

            for (let i = 0, l = uuids.length; i < l; i++) {
                const uuid = uuids[i];
                const assetInfo = assetInfos.get(uuid)!;
                const assetPacks = assetInfo.packs;
                if (assetPacks) {
                    if (l === 1) {
                        assetPacks.unshift(pack);
                    } else {
                        assetPacks.push(pack);
                    }
                } else {
                    assetInfo.packs = [pack];
                }
            }
        }
    }

    private _initVersion (versions: { import?: string[], native?: string[] }): void {
        if (!versions) { return; }
        const assetInfos = this.assetInfos;
        let entries = versions.import;
        if (entries) {
            for (let i = 0, l = entries.length; i < l; i += 2) {
                const uuid = entries[i];
                const assetInfo = assetInfos.get(uuid)!;
                assetInfo.ver = entries[i + 1];
            }
        }
        entries = versions.native;
        if (entries) {
            for (let i = 0, l = entries.length; i < l; i += 2) {
                const uuid = entries[i];
                const assetInfo = assetInfos.get(uuid)!;
                assetInfo.nativeVer = entries[i + 1];
            }
        }
    }

    private _initRedirect (redirect: string[]): void {
        if (!redirect) { return; }
        const assetInfos = this.assetInfos;
        for (let i = 0, l = redirect.length; i < l; i += 2) {
            const uuid = redirect[i];
            const assetInfo = assetInfos.get(uuid)!;
            assetInfo.redirect = redirect[i + 1];
        }
    }
}

if (TEST) {
    cclegacy._Test.Config = Config;
}
