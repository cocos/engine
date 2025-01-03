/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, serializable, editable, type } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { cclegacy } from '../../core';
import { Prefab } from './prefab';
import { CCObject, CCString } from '../../core/data';
import { Component } from '../component';
import { Node } from '../node';

function compareStringArray (array1: string[] | undefined, array2: string[] | undefined): boolean {
    if (!array1 || !array2) {
        return false;
    }

    if (array1.length !== array2.length) {
        return false;
    }

    return array1.every((value, index) => value === array2[index]);
}

@ccclass('cc.TargetInfo')
export class TargetInfo {
    constructor () {}
    // as the target's fileId in prefab asset,used to find the target when prefab expanded.
    @serializable
    @type([CCString])
    public localID: string[] = [];
}
@ccclass('cc.TargetOverrideInfo')
export class TargetOverrideInfo {
    constructor () {}

    @serializable
    @type(CCObject)
    public source: Component | Node | null = null;
    // if owner is in a prefab, use TargetInfo to index it
    @serializable
    @type(TargetInfo)
    public sourceInfo: TargetInfo | null = null;
    @serializable
    @type([CCString])
    public propertyPath: string[] = [];
    @serializable
    @type(Node)
    public target: Node | null = null;
    // if target is in a prefab, use TargetInfo to index it
    @serializable
    @type(TargetInfo)
    public targetInfo: TargetInfo | null = null;
}

@ccclass('cc.CompPrefabInfo')
export class CompPrefabInfo {
    constructor () {}

    // To identify current component in a prefab asset, so only needs to be unique.
    @serializable
    @editable
    public fileId = '';
}

@ccclass('CCPropertyOverrideInfo')
export class PropertyOverrideInfo {
    constructor () {}
    @serializable
    @type(TargetInfo)
    public targetInfo: TargetInfo | null = null;
    @serializable
    @type([CCString])
    public propertyPath: string[] = [];
    @serializable
    public value: any;

    // eslint-disable-next-line consistent-return
    public isTarget (localID: string[], propPath: string[]): boolean | undefined {
        if (EDITOR) {
            return compareStringArray(this.targetInfo?.localID, localID)
                && compareStringArray(this.propertyPath, propPath);
        }
    }
}

@ccclass('cc.MountedChildrenInfo')
export class MountedChildrenInfo {
    constructor () {}

    @serializable
    @type(TargetInfo)
    public targetInfo: TargetInfo | null = null;
    @serializable
    @type([Node])
    public nodes: Node[] = [];

    // eslint-disable-next-line consistent-return
    public isTarget (localID: string[]): boolean | undefined {
        if (EDITOR) {
            return compareStringArray(this.targetInfo?.localID, localID);
        }
    }
}

@ccclass('cc.MountedComponentsInfo')
export class MountedComponentsInfo {
    constructor () {}

    @serializable
    @type(TargetInfo)
    public targetInfo: TargetInfo | null = null;
    @serializable
    @type([Component])
    public components: Component[] = [];

    // eslint-disable-next-line consistent-return
    public isTarget (localID: string[]): boolean | undefined {
        if (EDITOR) {
            return compareStringArray(this.targetInfo?.localID, localID);
        }
    }
}

/**
 * Prefab实例类
 * @internal
 */
@ccclass('cc.PrefabInstance')
export class PrefabInstance {
    constructor () {}

    // Identify current prefabInstance;
    @serializable
    public fileId = '';

    // record the node with the Prefab that this prefabInstance belongs to.
    @serializable
    @type(Node)
    public prefabRootNode?: Node;

    // record children nodes that exist in this prefabInstance but not in prefab asset.
    @serializable
    @type([MountedChildrenInfo])
    public mountedChildren: MountedChildrenInfo[] = [];

    // record components that exist in this prefabInstance but not in prefab asset.
    @serializable
    @type([MountedComponentsInfo])
    public mountedComponents: MountedComponentsInfo[] = [];

    // override properties info in this prefabInstance.
    @serializable
    @type([PropertyOverrideInfo])
    public propertyOverrides: PropertyOverrideInfo[] = [];

    // record components that exist in ths prefab asset but not in prefabInstance.
    @serializable
    @type([TargetInfo])
    public removedComponents: TargetInfo[] = [];

    public targetMap: TargetMap = {};

    /**
     * make sure prefab instance expand only once
     * @internal
     */
    public expanded = false;

    // eslint-disable-next-line consistent-return
    public findPropertyOverride (localID: string[], propPath: string[]): Prefab._utils.PropertyOverrideInfo | null | undefined {
        if (EDITOR) {
            for (let i = 0; i < this.propertyOverrides.length; i++) {
                const propertyOverride = this.propertyOverrides[i];
                if (propertyOverride.isTarget(localID, propPath)) {
                    return propertyOverride;
                }
            }
            return null;
        }
    }

    public removePropertyOverride (localID: string[], propPath: string[]): void {
        if (EDITOR) {
            for (let i = 0; i < this.propertyOverrides.length; i++) {
                const propertyOverride = this.propertyOverrides[i];
                if (propertyOverride.isTarget(localID, propPath)) {
                    this.propertyOverrides.splice(i, 1);
                    break;
                }
            }
        }
    }
}

export interface TargetMap { [k: string]: TargetMap | Node | Component }

@ccclass('cc.PrefabInfo')
export class PrefabInfo {
    constructor () {}

    // the most top node of this prefab in the scene
    @serializable
    @type(Node)
    public root?: Node;

    // reference to the prefab asset file.
    // In Editor, only asset._uuid is usable because asset will be changed.
    @serializable
    public asset?: Prefab;

    // prefabInfo's id,unique in the asset.
    @serializable
    @editable
    public fileId = '';

    // Instance of a prefabAsset
    @serializable
    @type(PrefabInstance)
    public instance?: PrefabInstance;

    @serializable
    @type([TargetOverrideInfo])
    public targetOverrides?: TargetOverrideInfo[];

    // record outMost prefabInstance nodes in descendants
    // collected when saving sceneAsset or prefabAsset
    @serializable
    public nestedPrefabInstanceRoots?: Node[];
}

cclegacy._PrefabInfo = PrefabInfo;
