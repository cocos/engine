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

import { EDITOR, TEST } from 'internal:constants';
import { Asset } from '../assets/asset';
import { isValid, js, misc } from '../../core';
import { Node, Scene } from '../../scene-graph';
import Cache from './cache';
import dependUtil from './depend-util';
import { assets, references } from './shared';

function visitAsset (asset: Asset, deps: string[]): void {
    // Skip assets generated programmatically or by user (e.g. label texture)
    if (!asset._uuid) {
        return;
    }
    deps.push(asset._uuid);
}

function visitComponent (comp: any, deps: string[]): void {
    const props = Object.getOwnPropertyNames(comp);
    for (let i = 0; i < props.length; i++) {
        const propName = props[i];
        if (propName === 'node' || propName === '__eventTargets') { continue; }
        const value = comp[propName];
        if (typeof value === 'object' && value) {
            if (Array.isArray(value)) {
                for (let j = 0; j < value.length; j++) {
                    const val = value[j];
                    if (val instanceof Asset) {
                        visitAsset(val, deps);
                    }
                }
            } else if (!value.constructor || value.constructor === Object) {
                const keys = Object.getOwnPropertyNames(value);
                for (let j = 0; j < keys.length; j++) {
                    const val = value[keys[j]];
                    if (val instanceof Asset) {
                        visitAsset(val, deps);
                    }
                }
            } else if (value instanceof Asset) {
                visitAsset(value, deps);
            }
        }
    }
}

function visitNode (node: any, deps: string[]): void {
    for (let i = 0; i < node._components.length; i++) {
        visitComponent(node._components[i], deps);
    }
    for (let i = 0; i < node._children.length; i++) {
        visitNode(node._children[i], deps);
    }
}

function descendOpRef (asset: Asset, refs: Record<string, number>, exclude: string[], op: number): void {
    exclude.push(asset._uuid);
    const depends = dependUtil.getDeps(asset._uuid);
    for (let i = 0, l = depends.length; i < l; i++) {
        const dependAsset = assets.get(depends[i]);
        if (!dependAsset) { continue; }
        const uuid = dependAsset._uuid;
        if (!(uuid in refs)) {
            refs[uuid] = dependAsset.refCount + op;
        } else {
            refs[uuid] += op;
        }
        if (exclude.includes(uuid)) { continue; }
        descendOpRef(dependAsset, refs, exclude, op);
    }
}

const _temp = [];
function checkCircularReference (asset: Asset): number {
    // check circular reference
    const refs: Record<string, number> = Object.create(null);
    refs[asset._uuid] = asset.refCount;
    descendOpRef(asset, refs, _temp, -1);
    _temp.length = 0;
    if (refs[asset._uuid] !== 0) { return refs[asset._uuid]; }

    for (const uuid in refs) {
        if (refs[uuid] !== 0) {
            descendOpRef(assets.get(uuid)!, refs, _temp, 1);
        }
    }
    _temp.length = 0;

    return refs[asset._uuid];
}

export class ReleaseManager {
    private _persistNodeDeps$ = new Cache<string[]>();
    private _toDelete$ = new Cache<Asset>();
    private _eventListener$ = false;
    private _dontDestroyAssets$: string[] = [];

    public addIgnoredAsset (asset: Asset): void {
        this._dontDestroyAssets$.push(asset._uuid);
    }

    public init (): void {
        this._persistNodeDeps$.clear();
        this._toDelete$.clear();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _addPersistNodeRef (node: Node): void {
        const deps = [];
        visitNode(node, deps);
        for (let i = 0, l = deps.length; i < l; i++) {
            const dependAsset = assets.get(deps[i]);
            if (dependAsset) {
                dependAsset.addRef();
            }
        }
        this._persistNodeDeps$.add(node.uuid, deps);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _removePersistNodeRef (node: Node): void {
        if (!this._persistNodeDeps$.has(node.uuid)) { return; }

        const deps = this._persistNodeDeps$.get(node.uuid) as string[];
        for (let i = 0, l = deps.length; i < l; i++) {
            const dependAsset = assets.get(deps[i]);
            if (dependAsset) {
                dependAsset.decRef();
            }
        }
        this._persistNodeDeps$.remove(node.uuid);
    }

    // do auto release
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _autoRelease (oldScene: Scene, newScene: Scene, persistNodes: Record<string, Node>): void {
        if (oldScene) {
            const childs = dependUtil.getDeps(oldScene.uuid);
            for (let i = 0, l = childs.length; i < l; i++) {
                const asset = assets.get(childs[i]);
                if (asset) {
                    asset.decRef(TEST || oldScene.autoReleaseAssets);
                }
            }

            const dependencies = dependUtil._depends.get(oldScene.uuid);
            if (dependencies && dependencies.persistDeps) {
                const persistDeps = dependencies.persistDeps;
                for (let i = 0, l = persistDeps.length; i < l; i++) {
                    const asset = assets.get(persistDeps[i]);
                    if (asset) {
                        asset.decRef(TEST || oldScene.autoReleaseAssets);
                    }
                }
            }

            if (oldScene.uuid !== newScene.uuid) {
                dependUtil.remove(oldScene.uuid);
            }
        }

        // transfer refs from persist nodes to new scene
        const sceneDeps = dependUtil._depends.get(newScene.uuid);
        if (sceneDeps) { sceneDeps.persistDeps = []; }
        for (const key in persistNodes) {
            const node = persistNodes[key];
            const deps = this._persistNodeDeps$.get(node.uuid) as string[];
            for (const dep of deps) {
                const dependAsset = assets.get(dep);
                if (dependAsset) {
                    dependAsset.addRef();
                }
            }
            if (!sceneDeps) { continue; }
            sceneDeps.persistDeps!.push(...deps);
        }
    }

    public tryRelease (asset: Asset, force = false): void {
        if (!(asset instanceof Asset)) { return; }
        if (force) {
            this._free$(asset, force);
            return;
        }

        this._toDelete$.add(asset._uuid, asset);
        if (TEST) return;
        if (!this._eventListener$) {
            this._eventListener$ = true;
            misc.callInNextTick(this._freeAssets$.bind(this));
        }
    }

    private _freeAssets$ (): void {
        this._eventListener$ = false;
        this._toDelete$.forEach((asset): void => {
            this._free$(asset);
        });
        this._toDelete$.clear();
    }

    private _free$ (asset: Asset, force = false): void {
        const uuid = asset._uuid;
        this._toDelete$.remove(uuid);

        if (!isValid(asset, true) || this._dontDestroyAssets$.indexOf(uuid) !== -1) { return; }

        if (!force) {
            if (asset.refCount > 0) {
                if (checkCircularReference(asset) > 0) { return; }
            }
        }

        // remove from cache
        assets.remove(uuid);
        const depends = dependUtil.getDeps(uuid);
        for (let i = 0, l = depends.length; i < l; i++) {
            const dependAsset = assets.get(depends[i]);
            if (dependAsset) {
                dependAsset.decRef(false);
                // no need to release dependencies recursively in editor
                if (!EDITOR) {
                    this._free$(dependAsset, false);
                }
            }
        }
        // only release non-gc asset in editor
        if (!EDITOR) {
            asset.destroy();
        }
        dependUtil.remove(uuid);
        if (EDITOR) {
            const dependant = references!.get(uuid);
            if (dependant && dependant.length === 0) {
                references!.remove(uuid);
            }
            references!.forEach((dependance, key): void => {
                for (let i = dependance.length - 1; i >= 0; i--) {
                    if (dependance[i][0].deref() === asset) {
                        js.array.fastRemoveAt(dependance, i);
                    }
                }
                if (dependance.length === 0) {
                    references!.remove(key);
                }
            });
        }
    }
}

export const releaseManager =  new ReleaseManager();
