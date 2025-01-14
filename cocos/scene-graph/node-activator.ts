/*
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

import { EDITOR, DEV, SUPPORT_JIT, DEBUG } from 'internal:constants';
import { CCObjectFlags, isValid } from '../core/data/object';
import { array, Pool } from '../core/utils/js';
import { tryCatchFunctor_EDITOR } from '../core/utils/misc';
import { invokeOnEnable, createInvokeImpl, createInvokeImplJit, OneOffInvoker, LifeCycleInvoker, InvokeFunc } from './component-scheduler';
import { legacyCC } from '../core/global-exports';
import { assert, errorID, getError, log } from '../core/platform/debug';
import { NodeEventType } from './node-event';
import { assertIsTrue } from '../core/data/utils/asserts';
import type { Component } from './component';
import type { Node } from './node';

const MAX_POOL_SIZE = 4;

const IsPreloadStarted = CCObjectFlags.IsPreloadStarted;
const IsOnLoadStarted = CCObjectFlags.IsOnLoadStarted;
const IsOnLoadCalled = CCObjectFlags.IsOnLoadCalled;
const IsOnEnableCalled = CCObjectFlags.IsOnEnableCalled;
const Deactivating = CCObjectFlags.Deactivating;

// for __preload: used internally, no sort
class UnsortedInvoker extends LifeCycleInvoker {
    constructor (invokeFunc: InvokeFunc) {
        super(invokeFunc);
    }

    public add (comp: Component): void {
        this._zero.array.push(comp);
    }
    public remove (comp: Component): void {
        this._zero.fastRemove(comp);
    }
    public cancelInactive (flagToClear: number): void {
        LifeCycleInvoker.stableRemoveInactive(this._zero, flagToClear);
    }
    public invoke (): void {
        this._invoke(this._zero);
        this._zero.array.length = 0;
    }
}

const invokePreload = SUPPORT_JIT ? createInvokeImplJit('c.__preload();')
    : createInvokeImpl(
        (c: Component): void => { c.internalPreload?.(); },
        (iterator: array.MutableForwardIterator<Component>): void => {
            const array = iterator.array;
            for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
                array[iterator.i].internalPreload?.();
            }
        },
    );
const invokeOnLoad = SUPPORT_JIT ? createInvokeImplJit(`c.onLoad();c._objFlags|=${IsOnLoadCalled}`, false, IsOnLoadCalled)
    : createInvokeImpl(
        (c: Component): void => {
            c.internalOnLoad?.();
            c._objFlags |= IsOnLoadCalled;
        },
        (iterator: array.MutableForwardIterator<Component>): void => {
            const array = iterator.array;
            for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
                const comp: Component = array[iterator.i];
                comp.internalOnLoad?.();
                comp._objFlags |= IsOnLoadCalled;
            }
        },
        IsOnLoadCalled,
    );

interface ActivateTask {
    preload: UnsortedInvoker;
    onLoad: OneOffInvoker;
    onEnable: OneOffInvoker;
}

const activateTasksPool = new Pool<ActivateTask>(MAX_POOL_SIZE);
activateTasksPool.get = function getActivateTask (): ActivateTask {
    const task = this._get() || {
        preload: new UnsortedInvoker(invokePreload),
        onLoad: new OneOffInvoker(invokeOnLoad),
        onEnable: new OneOffInvoker(invokeOnEnable),
    };

    // reset index to -1 so we can skip invoked component in cancelInactive
    task.preload.zero.i = -1;
    let invoker = task.onLoad;
    invoker.zero.i = -1;
    invoker.neg.i = -1;
    invoker.pos.i = -1;
    invoker = task.onEnable;
    invoker.zero.i = -1;
    invoker.neg.i = -1;
    invoker.pos.i = -1;

    return task;
};

function _componentCorrupted (node: Node, comp: Component, index: number): void {
    errorID(3817, node.name, index);
    log('Corrupted component value:', comp);
    if (comp) {
        node._removeComponent(comp);
    } else {
        array.removeAt(node.getWritableComponents(), index);
    }
}

/**
 * @en The class used to perform activating and deactivating operations of node and component.
 * @zh 用于执行节点和组件的激活和停用操作的管理器。
 */
export default class NodeActivator {
    public declare resetComp?: ((comp: Component, didResetToDefault: boolean) => void);
    protected declare _activatingStack: ActivateTask[];

    constructor () {
        this.reset();
    }

    /**
     * @en Reset all activation or des-activation tasks
     * @zh 重置所有激活或非激活任务
     */
    public reset (): void {
        // a stack of node's activating tasks
        this._activatingStack = [];
    }

    /**
     * @en Activate or des-activate a node
     * @zh 激活或者停用某个节点
     * @param node Target node
     * @param active Which state to set the node to
     */
    public activateNode (node: Node, active: boolean): void {
        if (active) {
            const task = activateTasksPool.get();
            if (task) {
                this._activatingStack.push(task);

                this._activateNodeRecursively(node, task.preload, task.onLoad, task.onEnable);
                task.preload.invoke();
                task.onLoad.invoke();
                task.onEnable.invoke();

                this._activatingStack.pop();
                activateTasksPool.put(task);
            }
        } else {
            this._deactivateNodeRecursively(node);

            // remove children of this node from previous activating tasks to debounce
            // (this is an inefficient operation but it ensures general case could be implemented in a efficient way)
            const stack = this._activatingStack;
            for (const lastTask of stack) {
                lastTask.preload.cancelInactive(IsPreloadStarted);
                lastTask.onLoad.cancelInactive(IsOnLoadStarted);
                lastTask.onEnable.cancelInactive(IsOnEnableCalled);
            }
        }
        node.emit(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, node);
    }

    /**
     * @en Activate or des-activate a component
     * @zh 激活或者停用某个组件
     * @param comp Target component
     * @param preloadInvoker The invoker for `_preload` method, normally from [[ComponentScheduler]]
     * @param onLoadInvoker The invoker for `onLoad` method, normally from [[ComponentScheduler]]
     * @param onEnableInvoker The invoker for `onEnable` method, normally from [[ComponentScheduler]]
     */
    public activateComp (comp: Component, preloadInvoker?: UnsortedInvoker, onLoadInvoker?: OneOffInvoker, onEnableInvoker?: OneOffInvoker): void {
        if (!isValid(comp, true)) {
            // destroyed before activating
            return;
        }
        if (!(comp._objFlags & IsPreloadStarted)) {
            comp._objFlags |= IsPreloadStarted;
            if (comp.internalPreload) {
                if (preloadInvoker) {
                    preloadInvoker.add(comp);
                } else {
                    comp.internalPreload();
                }
            }
        }
        if (!(comp._objFlags & IsOnLoadStarted)) {
            comp._objFlags |= IsOnLoadStarted;
            if (comp.internalOnLoad) {
                if (onLoadInvoker) {
                    onLoadInvoker.add(comp);
                } else {
                    comp.internalOnLoad();
                    comp._objFlags |= IsOnLoadCalled;
                }
            } else {
                comp._objFlags |= IsOnLoadCalled;
            }
        }
        if (comp._enabled) {
            if (DEBUG) {
                assertIsTrue(comp.node, getError(3823, comp.uuid, comp.name));
            }
            const deactivatedOnLoading = !comp.node.activeInHierarchy;
            if (deactivatedOnLoading) {
                return;
            }
            legacyCC.director._compScheduler.enableComp(comp, onEnableInvoker);
        }
    }

    /**
     * @en Destroy a component
     * @zh 销毁一个组件
     * @param comp Target component
     */
    public destroyComp (comp: Component): void {
        // ensure onDisable called
        legacyCC.director._compScheduler.disableComp(comp);

        if (comp.internalOnDestroy && (comp._objFlags & IsOnLoadCalled)) {
            comp.internalOnDestroy();
        }
    }

    protected _activateNodeRecursively (node: Node, preloadInvoker: UnsortedInvoker, onLoadInvoker: OneOffInvoker, onEnableInvoker: OneOffInvoker): void {
        if (node._objFlags & Deactivating) {
            // en:
            // Forbid reactive the same node during its deactivating procedure
            // to avoid endless loop and simplify the implementation.
            // zh:
            // 对相同节点而言，无法撤销反激活，防止反激活 - 激活 - 反激活的死循环发生。
            // 这样设计简化了一些引擎的实现，而且对调用者来说能保证反激活操作都能成功。
            errorID(3816, node.name);
            return;
        }

        node._setActiveInHierarchy(true);

        // component maybe added during onEnable, and the onEnable of new component is already called
        // so we should record the origin length
        let originCount = node.components.length;
        // activate components
        for (let i = 0; i < originCount; ++i) {
            const component = node.components[i];
            if (component instanceof legacyCC.Component) {
                this.activateComp(component, preloadInvoker, onLoadInvoker, onEnableInvoker);
            } else {
                _componentCorrupted(node, component, i);
                --i;
                --originCount;
            }
        }

        // activate children recursively
        for (let i = 0, len = node.children.length; i < len; ++i) {
            const child = node.children[i];
            if (child.active) {
                this._activateNodeRecursively(child, preloadInvoker, onLoadInvoker, onEnableInvoker);
            }
        }
        node._onPostActivated(true);
    }

    protected _deactivateNodeRecursively (node: Node): void {
        if (DEV) {
            assert(!(node._objFlags & Deactivating), 'node should not deactivating');
            // ensures _activeInHierarchy is always changing when Deactivating flagged
            assert(node.activeInHierarchy, 'node should not deactivated');
        }
        node._objFlags |= Deactivating;
        node._setActiveInHierarchy(false);

        // component maybe added during onEnable, and the onEnable of new component is already called
        // so we should record the origin length
        const originCount = node.components.length;
        for (let c = 0; c < originCount; ++c) {
            const component = node.components[c];
            if (component._enabled) {
                legacyCC.director._compScheduler.disableComp(component);

                if (node.activeInHierarchy) {
                    // reactivated from root
                    node._objFlags &= ~Deactivating;
                    return;
                }
            }
        }
        for (let i = 0, len = node.children.length; i < len; ++i) {
            const child = node.children[i];
            if (child.activeInHierarchy) {
                this._deactivateNodeRecursively(child);

                if (node.activeInHierarchy) {
                    // reactivated from root
                    node._objFlags &= ~Deactivating;
                    return;
                }
            }
        }

        node._onPostActivated(false);
        node._objFlags &= ~Deactivating;
    }
}

if (EDITOR) {
    const callPreloadInTryCatch = tryCatchFunctor_EDITOR('__preload');
    const callOnLoadInTryCatch = function (c: Component): void {
        try {
            c.internalOnLoad?.();
        } catch (e) {
            legacyCC._throw(e);
        }
        c._objFlags |= IsOnLoadCalled;
        _onLoadInEditor(c);
    };
    const callOnDestroyInTryCatch = tryCatchFunctor_EDITOR('onDestroy');
    const callOnFocusInTryCatch = tryCatchFunctor_EDITOR('onFocusInEditor');
    const callOnLostFocusInTryCatch = tryCatchFunctor_EDITOR('onLostFocusInEditor');

    const _onLoadInEditor = (comp: Component): void => {
        if (comp.internalOnLoad && !legacyCC.GAME_VIEW) {
            const focused = Editor.Selection.getLastSelected('node') === comp.node.uuid;
            if (focused) {
                if (comp.onFocusInEditor && callOnFocusInTryCatch) {
                    callOnFocusInTryCatch(comp);
                }
            } else if (comp.onLostFocusInEditor && callOnLostFocusInTryCatch) {
                callOnLostFocusInTryCatch(comp);
            }
        }
    };

    NodeActivator.prototype.activateComp = (comp: Component, preloadInvoker: UnsortedInvoker, onLoadInvoker: OneOffInvoker, onEnableInvoker: OneOffInvoker): void => {
        if (!isValid(comp, true)) {
            // destroyed before activating
            return;
        }
        // NOTE: _executeInEditMode is dynamically injected on Editor environment
        if (legacyCC.GAME_VIEW || (comp.constructor as any)._executeInEditMode) {
            if (!(comp._objFlags & IsPreloadStarted)) {
                comp._objFlags |= IsPreloadStarted;
                if (comp.internalPreload) {
                    if (preloadInvoker) {
                        preloadInvoker.add(comp);
                    } else if (callPreloadInTryCatch) {
                        callPreloadInTryCatch(comp);
                    }
                }
            }
            if (!(comp._objFlags & IsOnLoadStarted)) {
                comp._objFlags |= IsOnLoadStarted;
                if (comp.internalOnLoad) {
                    if (onLoadInvoker) {
                        onLoadInvoker.add(comp);
                    } else if (callOnLoadInTryCatch) {
                        callOnLoadInTryCatch(comp);
                    }
                } else {
                    comp._objFlags |= IsOnLoadCalled;
                    _onLoadInEditor(comp);
                }
            }
        }
        if (comp._enabled) {
            if (DEBUG) {
                assertIsTrue(comp.node, getError(3823, comp.uuid, comp.name));
            }
            const deactivatedOnLoading = !comp.node.activeInHierarchy;
            if (deactivatedOnLoading) {
                return;
            }
            legacyCC.director._compScheduler.enableComp(comp, onEnableInvoker);
        }
    };

    NodeActivator.prototype.destroyComp = (comp: Component): void => {
        // ensure onDisable called
        legacyCC.director._compScheduler.disableComp(comp);

        if (comp.internalOnDestroy && (comp._objFlags & IsOnLoadCalled)) {
            // NOTE: _executeInEditMode is dynamically injected on Editor environment
            if (legacyCC.GAME_VIEW || (comp.constructor as any)._executeInEditMode) {
                callOnDestroyInTryCatch && callOnDestroyInTryCatch(comp);
            }
        }
    };

    NodeActivator.prototype.resetComp = (comp: Component, didResetToDefault: boolean): void => {
        if (comp.resetInEditor) {
            try {
                comp.resetInEditor(didResetToDefault);
            } catch (e) {
                legacyCC._throw(e);
            }
        }
    };
}
