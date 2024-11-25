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

import { TEST } from 'internal:constants';
import { Pool } from '../memop';
import { array, createMap } from '../utils/js';
import { isCCObject, isValid } from '../data/object';
import { legacyCC } from '../global-exports';

const fastRemoveAt = array.fastRemoveAt;

function empty (): void { }

class CallbackInfo {
    public callback: AnyFunction = empty;
    public target: unknown = undefined;
    public once = false;

    public set (callback: AnyFunction, target?: unknown, once?: boolean): void {
        this.callback = callback || empty;
        this.target = target;
        this.once = !!once;
    }

    public reset (): void {
        this.target = undefined;
        this.callback = empty;
        this.once = false;
    }

    public check (): boolean {
        // Validation
        if (isCCObject(this.target) && !isValid(this.target, true)) {
            return false;
        } else {
            return true;
        }
    }
}

const callbackInfoPool = new Pool(() => new CallbackInfo(), 32);
/**
 * @zh 事件监听器列表的简单封装。
 * @en A simple list of event callbacks
 */
export class CallbackList {
    public callbackInfos: Array<CallbackInfo | null> = [];
    public isInvoking = false;
    public containCanceled = false;

    /**
     * @zh 从列表中移除与指定目标相同回调函数的事件。
     * @en Remove the event listeners with the given callback from the list
     *
     * @param cb - The callback to be removed
     */
    public removeByCallback (cb: AnyFunction): void {
        for (let i = 0; i < this.callbackInfos.length; ++i) {
            const info = this.callbackInfos[i];
            if (info && info.callback === cb) {
                info.reset();
                callbackInfoPool.free(info);
                fastRemoveAt(this.callbackInfos, i);
                --i;
            }
        }
    }
    /**
     * @zh 从列表中移除与指定目标相同调用者的事件。
     * @en Remove the event listeners with the given target from the list
     * @param target
     */
    public removeByTarget (target: unknown): void {
        for (let i = 0; i < this.callbackInfos.length; ++i) {
            const info = this.callbackInfos[i];
            if (info && info.target === target) {
                info.reset();
                callbackInfoPool.free(info);
                fastRemoveAt(this.callbackInfos, i);
                --i;
            }
        }
    }

    /**
     * @zh 移除指定编号事件。
     * @en Remove the event listener at the given index
     * @param index
     */
    public cancel (index: number): void {
        const info = this.callbackInfos[index];
        if (info) {
            info.reset();
            if (this.isInvoking) {
                this.callbackInfos[index] = null;
            } else {
                fastRemoveAt(this.callbackInfos, index);
            }
            callbackInfoPool.free(info);
        }
        this.containCanceled = true;
    }

    /**
     * @zh 注销所有事件。
     * @en Cancel all event listeners
     */
    public cancelAll (): void {
        for (let i = 0; i < this.callbackInfos.length; i++) {
            const info = this.callbackInfos[i];
            if (info) {
                info.reset();
                callbackInfoPool.free(info);
                this.callbackInfos[i] = null;
            }
        }
        this.containCanceled = true;
    }

    /**
     * @zh 立即删除所有取消的回调。（在移除过程中会更加紧凑的排列数组）
     * @en Delete all canceled callbacks and compact array
     */
    public purgeCanceled (): void {
        for (let i = this.callbackInfos.length - 1; i >= 0; --i) {
            const info = this.callbackInfos[i];
            if (!info) {
                fastRemoveAt(this.callbackInfos, i);
            }
        }
        this.containCanceled = false;
    }

    /**
     * @zh 清除并重置所有数据。
     * @en Clear all data
     */
    public clear (): void {
        this.cancelAll();
        this.callbackInfos.length = 0;
        this.isInvoking = false;
        this.containCanceled = false;
    }
}

const MAX_SIZE = 16;
const callbackListPool = new Pool<CallbackList>(() => new CallbackList(), MAX_SIZE);

export interface ICallbackTable {
    [x: string]: CallbackList | undefined;
}

type EventType = string | number;
/**
 * @zh CallbacksInvoker 用来根据事件名（Key）管理事件监听器列表并调用回调方法。
 * @en CallbacksInvoker is used to manager and invoke event listeners with different event keys,
 * each key is mapped to a CallbackList.
 * @engineInternal
 */
export class CallbacksInvoker<EventTypeClass extends EventType = EventType> {
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _callbackTable: ICallbackTable = createMap(true);
    private _offCallback?: () => void;

    /**
     * @zh 向一个事件名注册一个新的事件监听器，包含回调函数和调用者
     * @en Register an event listener to a given event key with callback and target.
     *
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     * @param once - Whether invoke the callback only once (and remove it)
     */
    public on (key: EventTypeClass, callback: AnyFunction, target?: unknown, once?: boolean): AnyFunction {
        if (!this.hasEventListener(key, callback, target)) {
            let list = this._callbackTable[key];
            if (!list) {
                list = this._callbackTable[key] = callbackListPool.alloc();
            }
            const info = callbackInfoPool.alloc();
            info.set(callback, target, once);
            list.callbackInfos.push(info);
        }
        return callback;
    }

    /**
     * @zh 检查指定事件是否已注册回调。
     * @en Checks whether there is correspond event listener registered on the given event
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     */
    public hasEventListener (key: EventTypeClass, callback?: AnyFunction, target?: unknown): boolean {
        const list = this._callbackTable && this._callbackTable[key];
        if (!list) {
            return false;
        }

        // check any valid callback
        const infos = list.callbackInfos;
        if (!callback) {
            // Make sure no cancelled callbacks
            if (list.isInvoking) {
                for (let i = 0; i < infos.length; ++i) {
                    if (infos[i]) {
                        return true;
                    }
                }
                return false;
            } else {
                return infos.length > 0;
            }
        }

        for (let i = 0; i < infos.length; ++i) {
            const info = infos[i];
            if (info && info.check() && info.callback === callback && info.target === target) {
                return true;
            }
        }
        return false;
    }

    /**
     * @zh 移除在特定事件类型中注册的所有回调或在某个目标中注册的所有回调。
     * @en Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @param keyOrTarget - The event type or target with which the listeners will be removed
     */
    public removeAll (keyOrTarget: unknown): void {
        const type = typeof keyOrTarget;
        if (type === 'string' || type === 'number') {
            // remove by key
            const list = this._callbackTable && this._callbackTable[keyOrTarget as string|number];
            if (list) {
                if (list.isInvoking) {
                    list.cancelAll();
                } else {
                    list.clear();
                    callbackListPool.free(list);
                    delete this._callbackTable[keyOrTarget as string|number];
                }
            }
        } else if (keyOrTarget) {
            // remove by target
            for (const key in this._callbackTable) {
                const list = this._callbackTable[key]!;
                if (list.isInvoking) {
                    const infos = list.callbackInfos;
                    for (let i = 0; i < infos.length; ++i) {
                        const info = infos[i];
                        if (info && info.target === keyOrTarget) {
                            list.cancel(i);
                        }
                    }
                } else {
                    list.removeByTarget(keyOrTarget);
                }
            }
        }
    }

    /**
     * @zh 删除以指定事件，回调函数，目标注册的回调。
     * @en Remove event listeners registered with the given event key, callback and target
     * @param key - Event type
     * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
     * @param target - The callback callee of the event listener
     */
    public off (key: EventTypeClass, callback?: AnyFunction, target?: unknown): void {
        const list = this._callbackTable && this._callbackTable[key];
        if (list) {
            const infos = list.callbackInfos;
            if (callback) {
                for (let i = 0; i < infos.length; ++i) {
                    const info = infos[i];
                    if (info && info.callback === callback && info.target === target) {
                        list.cancel(i);
                        break;
                    }
                }
            } else {
                this.removeAll(key);
            }
        }
        this._offCallback?.();
    }

    /**
     * @zh 派发一个指定事件，并传递需要的参数
     * @en Trigger an event directly with the event name and necessary arguments.
     * @param key - event type
     * @param arg0 - The first argument to be passed to the callback
     * @param arg1 - The second argument to be passed to the callback
     * @param arg2 - The third argument to be passed to the callback
     * @param arg3 - The fourth argument to be passed to the callback
     * @param arg4 - The fifth argument to be passed to the callback
     */
    public emit (key: EventTypeClass, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        const list: CallbackList = this._callbackTable && this._callbackTable[key]!;
        if (list) {
            const rootInvoker = !list.isInvoking;
            list.isInvoking = true;

            const infos = list.callbackInfos;
            for (let i = 0, len = infos.length; i < len; ++i) {
                const info = infos[i];
                if (info) {
                    const callback = info.callback;
                    const target = info.target;
                    // Pre off once callbacks to avoid influence on logic in callback
                    if (info.once) {
                        this.off(key, callback, target);
                    }
                    // Lazy check validity of callback target,
                    // if target is CCObject and is no longer valid, then remove the callback info directly
                    if (!info.check()) {
                        this.off(key, callback, target);
                    } else if (target) {
                        callback.call(target, arg0, arg1, arg2, arg3, arg4);
                    } else {
                        callback(arg0, arg1, arg2, arg3, arg4);
                    }
                }
            }

            if (rootInvoker) {
                list.isInvoking = false;
                if (list.containCanceled) {
                    list.purgeCanceled();
                }
            }
        }
    }

    /**
     * 移除所有回调。
     */
    public clear (): void {
        for (const key in this._callbackTable) {
            const list = this._callbackTable[key];
            if (list) {
                list.clear();
                callbackListPool.free(list);
                delete this._callbackTable[key];
            }
        }
    }

    /**
     * @engineInternal
     */
    public _registerOffCallback (cb: () => void): void {
        this._offCallback = cb;
    }
}

if (TEST) {
    legacyCC._Test.CallbacksInvoker = CallbacksInvoker;
}
