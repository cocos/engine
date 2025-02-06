/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { EDITOR, SUPPORT_JIT } from 'internal:constants';
import { cclegacy, errorID, warn, editorExtrasTag } from '../../core';
import { Node } from '../node';
import { Component } from '../component';
import {
    MountedChildrenInfo,
    PropertyOverrideInfo,
    MountedComponentsInfo,
    TargetInfo, TargetMap,
    PrefabInstance,
    TargetOverrideInfo,
} from './prefab-info';
import { ValueType } from '../../core/value-types';

export * from './prefab-info';

export function createNodeWithPrefab (node: Node): void {
    const prefabInfo = node?.prefab;
    if (!prefabInfo) {
        return;
    }

    const prefabInstance = prefabInfo.instance;

    if (!prefabInstance) {
        return;
    }

    if (!prefabInfo.asset) {
        if (EDITOR) {
            // TODO show message in editor
        } else {
            errorID(3701, node.name);
        }

        prefabInfo.instance = undefined;
        return;
    }

    // save root's preserved props to avoid overwritten by prefab
    const _objFlags = node._objFlags;
    const _parent = node.getParent();
    const _id = node.uuid;
    // TODO(PP_Pro): after we support editorOnly tag, we could remove this any type assertion.
    // Tracking issue: https://github.com/cocos/cocos-engine/issues/14613
    const editorExtras = node[editorExtrasTag];

    // instantiate prefab
    cclegacy.game._isCloning = true;
    if (SUPPORT_JIT) {
        prefabInfo.asset._doInstantiate(node);
    } else {
        // root in prefab asset is always synced
        const prefabRoot = prefabInfo.asset.data;

        // use node as the instantiated prefabRoot to make references to prefabRoot in prefab redirect to node
        prefabRoot._iN$t = node;

        // instantiate prefab and apply to node
        cclegacy.instantiate._clone(prefabRoot, prefabRoot);
    }
    cclegacy.game._isCloning = false;

    // restore preserved props
    node._objFlags = _objFlags;
    node.modifyParent(_parent);
    node.id = _id;
    if (EDITOR) {
        node[editorExtrasTag] = editorExtras;
    }

    if (node.prefab) {
        // just keep the instance
        node.prefab.instance = prefabInfo.instance;
    }
}

// TODO: more efficient id->Node/Component map
export function generateTargetMap (node: Node, targetMap: TargetMap, isRoot: boolean): void {
    if (!targetMap) {
        return;
    }

    if (!node) {
        return;
    }

    let curTargetMap = targetMap;

    const prefabInstance = node.prefab?.instance;
    if (!isRoot && prefabInstance) {
        targetMap[prefabInstance.fileId] = {};
        curTargetMap = targetMap[prefabInstance.fileId] as TargetMap;
    }

    const prefabInfo = node.prefab;
    if (prefabInfo) {
        curTargetMap[prefabInfo.fileId] = node;
    }

    node.components.forEach((comp) => {
        if (comp.__prefab) {
            curTargetMap[comp.__prefab.fileId] = comp;
        }
    });

    node.children.forEach((childNode) => {
        generateTargetMap(childNode, curTargetMap, false);
    });
}

export function getTarget (localID: string[], targetMap: any): Node | Component | null {
    if (!localID) {
        return null;
    }

    let target: Component | Node | null = null;
    let targetIter: any = targetMap;
    for (let i = 0; i < localID.length; i++) {
        if (!targetIter) {
            return null;
        }
        targetIter = targetIter[localID[i]];
    }

    target = targetIter;

    return target;
}

export function applyMountedChildren (node: Node, mountedChildren: MountedChildrenInfo[], targetMap: TargetMap): void {
    if (!mountedChildren) {
        return;
    }

    for (let i = 0; i < mountedChildren.length; i++) {
        const childInfo = mountedChildren[i];
        if (childInfo && childInfo.targetInfo) {
            const target = getTarget(childInfo.targetInfo.localID, targetMap) as Node;
            if (!target) {
                continue;
            }

            let curTargetMap = targetMap;
            const localID = childInfo.targetInfo.localID;
            if (localID.length > 0) {
                for (let i = 0; i < localID.length - 1; i++) {
                    curTargetMap = curTargetMap[localID[i]] as TargetMap;
                }
            }
            if (childInfo.nodes) {
                for (let i = 0; i < childInfo.nodes.length; i++) {
                    const childNode = childInfo.nodes[i];

                    if (!childNode || target.children.includes(childNode)) {
                        continue;
                    }

                    target.children.push(childNode);
                    childNode.modifyParent(target);
                    if (EDITOR) {
                        if (!childNode[editorExtrasTag]) {
                            childNode[editorExtrasTag] = {};
                        }
                        // NOTE: editor polyfill
                        (childNode[editorExtrasTag] as any).mountedRoot = node;
                    }
                    // mounted node need to add to the target map
                    generateTargetMap(childNode, curTargetMap, false);
                    childNode.siblingIndex = target.children.length - 1;
                    expandPrefabInstanceNode(childNode, true);
                }
            }
        }
    }
}

export function applyMountedComponents (node: Node, mountedComponents: MountedComponentsInfo[], targetMap: TargetMap): void {
    if (!mountedComponents) {
        return;
    }

    for (let i = 0; i < mountedComponents.length; i++) {
        const componentsInfo = mountedComponents[i];
        if (componentsInfo && componentsInfo.targetInfo) {
            const target = getTarget(componentsInfo.targetInfo.localID, targetMap) as Node;
            if (!target) {
                continue;
            }

            if (componentsInfo.components) {
                for (let i = 0; i < componentsInfo.components.length; i++) {
                    const comp = componentsInfo.components[i];
                    if (!comp) {
                        continue;
                    }

                    comp.node = target;
                    if (EDITOR) {
                        if (!comp[editorExtrasTag]) {
                            comp[editorExtrasTag] = {};
                        }
                        // TODO: editor polyfill
                        (comp[editorExtrasTag] as any).mountedRoot = node;
                    }
                    target.getWritableComponents().push(comp);
                }
            }
        }
    }
}

export function applyRemovedComponents (node: Node, removedComponents: TargetInfo[], targetMap: TargetMap): void {
    if (!removedComponents) {
        return;
    }

    for (let i = 0; i < removedComponents.length; i++) {
        const targetInfo = removedComponents[i];
        if (targetInfo) {
            const target = getTarget(targetInfo.localID, targetMap) as Component;
            if (!target || !target.node) {
                continue;
            }

            const index = target.node.components.indexOf(target);
            if (index >= 0) {
                target.node.getWritableComponents().splice(index, 1);
            }
        }
    }
}

export function applyPropertyOverrides (node: Node, propertyOverrides: PropertyOverrideInfo[], targetMap: TargetMap): void {
    if (propertyOverrides.length <= 0) {
        return;
    }

    let target: any = null;
    for (let i = 0; i < propertyOverrides.length; i++) {
        const propOverride = propertyOverrides[i];
        if (propOverride && propOverride.targetInfo) {
            const targetInfo = propOverride.targetInfo;
            target = getTarget(targetInfo.localID, targetMap);
            if (!target) {
                // Can't find target
                continue;
            }

            let targetPropOwner: any = target;
            const propertyPath = propOverride.propertyPath.slice();
            if (propertyPath.length > 0) {
                const targetPropName = propertyPath.pop();
                if (!targetPropName) {
                    continue;
                }

                for (let i = 0; i < propertyPath.length; i++) {
                    const propName = propertyPath[i];
                    targetPropOwner = targetPropOwner[propName];
                    if (!targetPropOwner) {
                        break;
                    }
                }

                if (!targetPropOwner) {
                    continue;
                }

                if (Array.isArray(targetPropOwner)) {
                    // if set element of a array, the length of a array must has been defined.
                    if (targetPropName === 'length') {
                        targetPropOwner[targetPropName] = propOverride.value;
                    } else {
                        const index = Number.parseInt(targetPropName);
                        if (Number.isInteger(index) && index < targetPropOwner.length) {
                            targetPropOwner[targetPropName] = propOverride.value;
                        }
                    }
                } else if (targetPropOwner[targetPropName] instanceof ValueType) {
                    targetPropOwner[targetPropName].set(propOverride.value);
                } else {
                    targetPropOwner[targetPropName] = propOverride.value;
                }
            } else if (EDITOR) {
                warn('property path is empty');
            }
        }
    }
}

export function applyTargetOverrides (node: Node): void {
    const targetOverrides = node.prefab?.targetOverrides as TargetOverrideInfo[];
    if (targetOverrides) {
        for (let i = 0; i < targetOverrides.length; i++) {
            const targetOverride = targetOverrides[i];

            let source: Node | Component | null = targetOverride.source;
            const sourceInfo = targetOverride.sourceInfo;
            if (sourceInfo) {
                const src = targetOverride.source as Node;
                const sourceInstance = src?.prefab?.instance;
                if (sourceInstance && sourceInstance.targetMap) {
                    source = getTarget(sourceInfo.localID, sourceInstance.targetMap);
                }
            }

            if (!source) {
                // Can't find source
                continue;
            }

            let target: Node | Component | null = null;
            const targetInfo = targetOverride.targetInfo;
            if (!targetInfo) {
                continue;
            }
            const targetAsNode = targetOverride.target as Node;
            const targetInstance = targetAsNode?.prefab?.instance;
            if (!targetInstance || !targetInstance.targetMap) {
                continue;
            }
            target = getTarget(targetInfo.localID, targetInstance.targetMap);
            if (!target) {
                // Can't find target
                continue;
            }

            const propertyPath = targetOverride.propertyPath.slice();
            let targetPropOwner: any = source;
            if (propertyPath.length > 0) {
                const targetPropName = propertyPath.pop();
                if (!targetPropName) {
                    return;
                }

                for (let i = 0; i < propertyPath.length; i++) {
                    const propName = propertyPath[i];
                    targetPropOwner = targetPropOwner[propName];
                    if (!targetPropOwner) {
                        break;
                    }
                }

                if (!targetPropOwner) {
                    continue;
                }

                targetPropOwner[targetPropName] = target;
            }
        }
    }
}

export function expandPrefabInstanceNode (node: Node, recursively = false): void {
    const prefabInstance = node?.prefab?.instance as PrefabInstance;
    if (prefabInstance && !prefabInstance.expanded) {
        createNodeWithPrefab(node);
        // nested prefab should expand before parent(property override order)
        if (recursively) {
            if (node && node.children) {
                node.children.forEach((child) => {
                    expandPrefabInstanceNode(child, true);
                });
            }
        }

        const targetMap = {};
        prefabInstance.targetMap = targetMap;
        generateTargetMap(node, targetMap, true);
        applyMountedChildren(node, prefabInstance.mountedChildren, targetMap);
        applyRemovedComponents(node, prefabInstance.removedComponents, targetMap);
        applyMountedComponents(node, prefabInstance.mountedComponents, targetMap);
        applyPropertyOverrides(node, prefabInstance.propertyOverrides, targetMap);
        prefabInstance.expanded = true;
    } else if (recursively) {
        if (node && node.children) {
            node.children.forEach((child) => {
                expandPrefabInstanceNode(child, true);
            });
        }
    }
}

export function expandNestedPrefabInstanceNode (node: Node): void {
    const prefabInfo = node.prefab;

    if (prefabInfo && prefabInfo.nestedPrefabInstanceRoots) {
        prefabInfo.nestedPrefabInstanceRoots.forEach((instanceNode: Node) => {
            expandPrefabInstanceNode(instanceNode);
            // when expanding the prefab,it's children will be change,so need to apply after expanded
            // if (!EDITOR) {
            //     applyNodeAndComponentId(instanceNode, (instanceNode as any)._prefab?.instance?.fileId ?? '');
            // }
        });
    }
}

// make sure prefab instance's children id is fixed
export function applyNodeAndComponentId (prefabInstanceNode: Node, rootId: string): void {
    const { components, children } = prefabInstanceNode;
    for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const fileID = comp.__prefab?.fileId ?? '';
        comp._id = `${rootId}${fileID}`;
    }
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        // TODO(PP_Pro): after we support editorOnly tag, we could remove this any type assertion.
        // Tracking issue: https://github.com/cocos/cocos-engine/issues/14613
        const prefabInfo = child.prefab!;
        const fileId = prefabInfo?.instance ? prefabInfo.instance.fileId : prefabInfo?.fileId;
        if (!fileId) continue;
        child.id = `${rootId}${fileId}`;

        // ignore prefab instance,because it will be apply in 'nestedPrefabInstanceRoots' for loop;
        if (!prefabInfo?.instance) {
            applyNodeAndComponentId(child, rootId);
        }
    }
}
