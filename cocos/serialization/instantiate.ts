/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { DEV, JSB } from 'internal:constants';
import { CCObject, isCCObject, js, ValueType, isCCClassOrFastDefined, getError, warn, misc, cclegacy } from '../core';
import { Prefab } from '../scene-graph/prefab';
import { Node } from '../scene-graph/node';
import { Component } from '../scene-graph/component';
import { updateChildrenForDeserialize } from '../core/utils/jsb-utils';

const Destroyed = CCObject.Flags.Destroyed;
const PersistentMask = CCObject.Flags.PersistentMask;

const objsToClearTmpVar: any[] = [];   // used to reset _iN$t variable

/**
 * Invoke _instantiate method if supplied.
 * The _instantiate callback will be called only on the root object, its associated object will not be called.
 * @param instantiated If supplied, _instantiate just need to initialize the instantiated object, no need to create new object by itself.
 * @returns The instantiated object.
 */
type CustomInstantiation = <T>(this: T, instantiated?: T) => T;

function hasImplementedInstantiate (original: any): original is { _instantiate (...args: unknown[]): unknown } {
    return typeof original._instantiate === 'function';
}

/**
 * @zh 从 Prefab 实例化出新节点。
 * @en Instantiate a node from the Prefab.
 * @param prefab The prefab.
 * @returns The instantiated node.
 * @example
 * ```ts
 * import { instantiate, director } from 'cc';
 * // Instantiate node from prefab.
 * const node = instantiate(prefabAsset);
 * node.parent = director.getScene();
 * ```
 */
export function instantiate (prefab: Prefab): Node;

/**
 * @en Clones the object `original.
 * @zh 克隆指定的任意类型的对象。
 * @param original An existing object that you want to make a copy of.
 * It can be any JavaScript object(`typeof original === 'object'`) but:
 * - it shall not be array or null;
 * - it shall not be object of `Asset`;
 * - if it's an object of `CCObject`, it should not have been destroyed.
 * @returns The newly instantiated object.
 * @example
 * ```ts
 * import { instantiate, director } from 'cc';
 * // Clone a node.
 * const node = instantiate(targetNode);
 * node.parent = director.getScene();
 * ```
 */
export function instantiate<T> (original: T): T;

export function instantiate (original: any, internalForce?: boolean): any {
    if (!internalForce) {
        if (DEV) {
            if (typeof original !== 'object' || Array.isArray(original)) {
                throw new TypeError(getError(6900));
            }
            if (!original) {
                throw new TypeError(getError(6901));
            }
            if (!cclegacy.isValid(original)) {
                throw new TypeError(getError(6901));
            }
            if (original instanceof Component) {
                warn('Should not instantiate a single cc.Component directly, you must instantiate the entire node.');
            }
        }
    }

    let clone;

    if (isCCObject(original)) {
        if (hasImplementedInstantiate(original)) {
            cclegacy.game._isCloning = true;
            clone = original._instantiate(null, true);
            cclegacy.game._isCloning = false;
            if (JSB) {
                updateChildrenForDeserialize(clone as Node);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return clone;
        } else if (original instanceof cclegacy.Asset) {
            throw new TypeError(getError(6903));
        }
    }

    cclegacy.game._isCloning = true;
    clone = doInstantiate(original);
    cclegacy.game._isCloning = false;
    if (JSB) {
        updateChildrenForDeserialize(clone as Node);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return clone;
}

/*
 * @en
 * Do instantiate object, the object to instantiate must be non-nil.
 * @zh
 * 这是一个通用的 instantiate 方法，可能效率比较低。
 * 之后可以给各种类型重写快速实例化的特殊实现，但应该在单元测试中将结果和这个方法的结果进行对比。
 * 值得注意的是，这个方法不可重入。
 * @param obj - 该方法仅供内部使用，用户需负责保证参数合法。什么参数是合法的请参考 cc.instantiate 的实现。
 * @param parent - 只有在该对象下的场景物体会被克隆。
 * @return {Object}
 * @private
 */
function doInstantiate (obj, parent?): any {
    if (DEV) {
        if (Array.isArray(obj)) {
            throw new TypeError(getError(6904));
        }
        if (misc.isDomNode(obj)) {
            throw new TypeError(getError(6905));
        }
    }

    let clone;
    if (obj._iN$t) {
        // User can specify an existing object by assigning the "_iN$t" property.
        // enumerateObject will always push obj to objsToClearTmpVar
        clone = obj._iN$t;
    } else if (obj.constructor) {
        const Klass = obj.constructor;
        clone = new Klass();
    } else {
        clone = Object.create(null);
    }

    enumerateObject(obj, clone, parent);

    for (let i = 0, len = objsToClearTmpVar.length; i < len; ++i) {
        objsToClearTmpVar[i]._iN$t = null;
    }
    objsToClearTmpVar.length = 0;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return clone;
}

// @param {Object} obj - The object to instantiate, typeof must be 'object' and should not be an array.

function enumerateCCClass (klass, obj, clone, parent): void {
    const props = klass.__values__;

    for (let p = 0; p < props.length; p++) {
        const key = props[p];
        const value = obj[key];
        if (typeof value === 'object' && value) {
            const initValue = clone[key];
            if (initValue instanceof ValueType
                && initValue.constructor === value.constructor) {
                initValue.set(value as ValueType);
            } else {
                clone[key] = value._iN$t || instantiateObj(value as any[], parent);
            }
        } else {
            clone[key] = value;
        }
    }
}

function enumerateObject (obj, clone, parent): void {
    // 目前使用“_iN$t”这个特殊字段来存实例化后的对象，这样做主要是为了防止循环引用
    // 注意，为了避免循环引用，所有新创建的实例，必须在赋值前被设为源对象的_iN$t
    js.value(obj as Record<string, any>, '_iN$t', clone, true);
    objsToClearTmpVar.push(obj);
    const klass: Constructor<unknown> = obj.constructor;
    if (isCCClassOrFastDefined(klass)) {
        enumerateCCClass(klass, obj, clone, parent);
    } else {
        // primitive javascript object
        for (const key in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (!obj.hasOwnProperty(key)
                || (key.charCodeAt(0) === 95 && key.charCodeAt(1) === 95   // starts with "__"
                 && key !== '__type__'
                 && key !== '__prefab')
            ) {
                continue;
            }
            const value = obj[key];
            if (typeof value === 'object' && value) {
                if (value === clone) {
                    continue;   // value is obj._iN$t
                }
                clone[key] = value._iN$t || instantiateObj(value as any[], parent);
            } else {
                clone[key] = value;
            }
        }
    }
    if (isCCObject(obj)) {
        clone._objFlags &= PersistentMask;
    }
}

/*
 * @param {Object|Array} obj - the original non-nil object, typeof must be 'object'
 * @return {Object|Array} - the original non-nil object, typeof must be 'object'
 */
function instantiateObj (obj: TypedArray | any[] | CCObject, parent: any): any {
    if (obj instanceof ValueType) {
        return obj.clone();
    }
    if (obj instanceof cclegacy.Asset) {
        // 所有资源直接引用，不需要拷贝
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return obj;
    }
    let clone: any;
    if (ArrayBuffer.isView(obj)) {
        const len = obj.length;
        clone = new (obj.constructor as TypedArrayConstructor)(len);
        // NOTE: unknown  injected property `_iN$t`
        (obj as any)._iN$t = clone;
        objsToClearTmpVar.push(obj);
        for (let i = 0; i < len; ++i) {
            clone[i] = obj[i];
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return clone;
    }
    if (Array.isArray(obj)) {
        const len = obj.length;
        clone = new Array(len);
        // NOTE: unknown  injected property `_iN$t`
        (obj as any)._iN$t = clone;
        objsToClearTmpVar.push(obj);
        for (let i = 0; i < len; ++i) {
            const value = obj[i];
            if (typeof value === 'object' && value) {
                clone[i] = value._iN$t || instantiateObj(value as any[], parent);
            } else {
                clone[i] = value;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return clone;
    } else if (obj._objFlags & Destroyed) {
        // the same as cc.isValid(obj)
        return null;
    }

    const ctor = obj.constructor as Constructor;
    if (isCCClassOrFastDefined(ctor)) {
        if (parent) {
            if (parent instanceof Component) {
                if (obj instanceof Node || obj instanceof Component) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return obj;
                }
            } else if (parent instanceof Node) {
                if (obj instanceof Node) {
                    if (!obj.isChildOf(parent)) {
                        // should not clone other nodes if not descendant
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return obj;
                    }
                } else if (obj instanceof Component) {
                    if (obj.node && !obj.node.isChildOf(parent)) {
                        // should not clone other component if not descendant
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return obj;
                    }
                }
            }
        }
        // eslint-disable-next-line new-cap
        clone = new ctor();
    } else if (ctor === Object) {
        clone = {};
    } else if (!ctor) {
        clone = Object.create(null);
    } else {
        // unknown type
        return obj;
    }
    enumerateObject(obj, clone, parent);
    return clone;
}

instantiate._clone = doInstantiate;
cclegacy.instantiate = instantiate;
