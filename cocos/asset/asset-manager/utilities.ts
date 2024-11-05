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

import { EDITOR } from 'internal:constants';
import { Asset } from '../assets/asset';
import { cclegacy, error, errorID, js, misc } from '../../core';
import Config from './config';
import { dependMap, nativeDependMap } from './depend-maps';
import dependUtil from './depend-util';
import { isScene } from './helper';
import RequestItem from './request-item';
import { assets, references } from './shared';
import Task from './task';
import type { AssetManager } from './asset-manager';

let defaultProgressCallback: ((finished: number, total: number, item: RequestItem) => void) | null = null;

declare class WeakRef {
    constructor (obj: any);
}

export function setDefaultProgressCallback (onProgress: (finished: number, total: number, item: RequestItem) => void): void {
    defaultProgressCallback = onProgress;
}

export function clear (task: Task, clearRef: boolean): void {
    for (let i = 0, l = task.input.length; i < l; i++) {
        const item = task.input[i] as RequestItem;
        if (clearRef) {
            if (!item.isNative && item.content instanceof Asset) {
                item.content.decRef(false);
            }
        }
        item.recycle();
    }
    task.input = null;
}

export function urlAppendTimestamp (url: string, append: boolean): string {
    if (append) {
        if (/\?/.test(url)) {
            return `${url}&_t=${Date.now()}`;
        }

        return `${url}?_t=${Date.now()}`;
    }
    return url;
}

export type RetryFunction = (times: number, done: ((err: Error | null, data?: any) => void)) => void;

export function retry (
    process: RetryFunction,
    times: number,
    wait: number,
    onComplete: ((err: Error | null, data?: any) => void),
    index = 0,
): void {
    process(index, (err, result): void => {
        index++;
        if (!err || index > times) {
            if (onComplete) {
                onComplete(err, result);
            }
        } else {
            setTimeout((): void => {
                retry(process, times, wait, onComplete, index);
            }, wait);
        }
    });
}

export function getDepends (
    uuid: string,
    data: Asset | Record<string, any>,
    exclude: Record<string, any>,
    depends: any[],
    config: Config,
): void {
    try {
        const info = dependUtil.parse(uuid, data);
        for (let i = 0, l = info.deps.length; i < l; i++) {
            const dep = info.deps[i];
            if (!(dep in exclude)) {
                exclude[dep] = true;
                depends.push({ uuid: dep, bundle: config && config.name });
            }
        }
        if (info.nativeDep) {
            if (config) {
                info.nativeDep.bundle = config.name;
            }
            depends.push({ ...info.nativeDep });
        }
    } catch (e) {
        error((e as Error).message, (e as Error).stack);
    }
}

export function cache (id: string, asset: Asset, cacheAsset?: boolean): void {
    if (!asset) { return; }
    cacheAsset = cacheAsset !== undefined ? cacheAsset : cclegacy.assetManager.cacheAsset;
    if (!isScene(asset) && cacheAsset && !asset.isDefault) {
        assets.add(id, asset);
    }
}

export function setProperties (uuid: string, asset: Asset, assetsMap: Record<string, any>): boolean {
    let missingAsset = false;
    const depends = dependMap.get(asset);
    if (depends) {
        let missingAssetReporter: any = null;
        for (let i = 0, l = depends.length; i < l; i++) {
            const depend = depends[i];
            const dependAsset = assetsMap[`${depend.uuid}@import`];
            if (!dependAsset) {
                if (EDITOR) {
                    if (!missingAssetReporter) {
                        // eslint-disable-next-line new-cap
                        missingAssetReporter = new EditorExtends.MissingReporter.object(asset);
                    }
                    missingAssetReporter.stashByOwner(depend.owner, depend.prop, EditorExtends.serialize.asAsset(depend.uuid));
                } else {
                    errorID(16350, depend.uuid);
                }
                (cclegacy.assetManager as AssetManager).dispatchAssetMissing(asset, depend.owner, depend.prop, depend.uuid);
                if (depend.type && depend.type !== Asset) {
                    // eslint-disable-next-line new-cap
                    const placeHolder = new depend.type();
                    placeHolder.initDefault(depend.uuid);
                    depend.owner[depend.prop] = placeHolder;
                }
                missingAsset = true;
            } else {
                depend.owner[depend.prop] = dependAsset.addRef();
                if (EDITOR) {
                    let reference = references!.get(dependAsset as string);
                    if (!reference || isScene(asset)) {
                        reference = [];
                        references!.add(depend.uuid, reference);
                    }
                    reference.push([new WeakRef(asset), new WeakRef(depend.owner), depend.prop]);
                }
            }
        }

        if (missingAssetReporter) {
            missingAssetReporter.reportByOwner();
        }
        dependMap.delete(asset);
    }

    if (nativeDependMap.has(asset)) {
        if (assetsMap[`${uuid}@native`]) {
            asset._nativeAsset = assetsMap[`${uuid}@native`];
        } else {
            missingAsset = true;
            errorID(16351, uuid);
        }
        nativeDependMap.delete(asset);
    }
    return missingAsset;
}

export function gatherAsset (task: Task): void {
    const source = task.source;
    if (!task.options!.__outputAsArray__ && source.length === 1) {
        task.output = source[0].content;
    } else {
        const output: any[] = task.output = [];
        for (let i = 0, l = source.length; i < l; i++) {
            output.push(source[i].content);
        }
    }
}

type ForEachFunction<T> = (item: T, done: ((err?: Error | null) => void)) => void;

export function forEach<T = any> (array: T[], process: ForEachFunction<T>, onComplete: (errs: Error[]) => void): void {
    let count = 0;
    const errs: Error[] = [];
    const length = array.length;
    if (length === 0 && onComplete) {
        onComplete(errs);
    }
    const cb = (err?: Error | null): void => {
        if (err) {
            errs.push(err);
        }
        count++;
        if (count === length) {
            if (onComplete) {
                onComplete(errs);
            }
        }
    };
    for (let i = 0; i < length; i++) {
        process(array[i], cb);
    }
}

interface IParameters<T> {
    options: Record<string, any>;
    onProgress: ((finished: number, total: number, item: RequestItem) => void) | null;
    onComplete: T | null;
}

interface ILoadResArgs<T> {
    type: Constructor<Asset> | null;
    onProgress: ((finished: number, total: number, item: RequestItem) => void) | null;
    onComplete: T | null;
}

export function parseParameters<T extends (
...args) => void> (
    options: Record<string, any> | ((finished: number, total: number, item: RequestItem) => void) | T | null | undefined,
    onProgress: ((finished: number, total: number, item: RequestItem) => void) | T | null | undefined,
    onComplete: T | null | undefined,
): IParameters<T> {
    let optionsOut: any = options;
    let onProgressOut: any = onProgress;
    let onCompleteOut: any = onComplete;
    if (onComplete === undefined) {
        const isCallback = typeof options === 'function';
        if (onProgress) {
            onCompleteOut = onProgress as T;
            if (!isCallback) {
                onProgressOut = null;
            }
        } else if (onProgress === undefined && isCallback) {
            onCompleteOut = options as T;
            optionsOut = null;
            onProgressOut = null;
        }
        if (onProgress !== undefined && isCallback) {
            onProgressOut = options as ((finished: number, total: number, item: RequestItem) => void);
            optionsOut = null;
        }
    }

    return { options: optionsOut || Object.create(null), onProgress: onProgressOut, onComplete: onCompleteOut };
}

export function parseLoadResArgs<T extends (
...args) => void> (
    type: Constructor<Asset> | ((finished: number, total: number, item: RequestItem) => void) | T | null | undefined,
    onProgress: ((finished: number, total: number, item: RequestItem) => void) | T | null | undefined,
    onComplete: T | null | undefined,
): ILoadResArgs<T> {
    let typeOut: any = type;
    let onProgressOut: any = onProgress;
    let onCompleteOut: any = onComplete;
    if (onComplete === undefined) {
        const isValidType = js.isChildClassOf(type as Constructor<Asset>, Asset);
        if (onProgress) {
            onCompleteOut = onProgress as T;
            if (isValidType) {
                onProgressOut = null;
            }
        } else if (onProgress === undefined && !isValidType) {
            onCompleteOut = type as T;
            onProgressOut = null;
            typeOut = null;
        }
        if (onProgress !== undefined && !isValidType) {
            onProgressOut = type as ((finished: number, total: number, item: RequestItem) => void);
            typeOut = null;
        }
    }

    return { type: typeOut, onProgress: onProgressOut || defaultProgressCallback, onComplete: onCompleteOut };
}

export function checkCircleReference (owner: string, uuid: string, map: Record<string, any>, checked: Record<string, boolean> = {}): boolean {
    const item = map[uuid];
    if (!item || checked[uuid]) {
        return false;
    }
    checked[uuid] = true;
    let result = false;
    const deps = dependUtil.getDeps(uuid);
    if (deps) {
        for (let i = 0, l = deps.length; i < l; i++) {
            const dep = deps[i];
            if (dep === owner || checkCircleReference(owner, dep, map, checked)) {
                result = true;
                break;
            }
        }
    }
    return result;
}

export function asyncify (cb: ((p1?: any, p2?: any) => void) | null): (p1?: any, p2?: any) => void {
    return (p1, p2): void => {
        if (!cb) { return; }
        const refs: Asset[] = [];
        if (Array.isArray(p2)) {
            p2.forEach((x): number | boolean => x instanceof Asset && refs.push(x.addRef()));
        } else if (p2 instanceof Asset) {
            refs.push(p2.addRef());
        }
        misc.callInNextTick((): void => {
            refs.forEach((x): Asset => x.decRef(false));
            cb(p1, p2);
        });
    };
}
