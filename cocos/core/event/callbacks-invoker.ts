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
import { createMap } from '../utils/js';
import { isCCObject, isValid } from '../data/object';
import { legacyCC } from '../global-exports';

function empty(): void {}

class CallbackInfo {
    callback: AnyFunction = empty;
    target: unknown = null;
    once = false;

    valid = false;// 是否有效
    next: CallbackInfo | null = null;// 链表下一个节点

    set (callback: AnyFunction, target?: unknown, once?: boolean) {
        this.callback = callback;
        this.target = target;
        this.once = !!once;
        this.valid = true;
        return this;
    }

    reset () {
        this.callback = empty;
        this.target = null;
        this.once = false;
        this.valid = false;
    }

    clear () {
        this.reset();
        this.next = null;
        return this;
    }

    check (): boolean {
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
class CallbackList {
    isInvoking = false;
    containCanceled = false;

    head: CallbackInfo | null = null;// 链表头节点

    find (callback: AnyFunction, target?: unknown) {
        let info = this.head;
        while (info) {
            if (info.callback === callback && info.target === target) {
                return info;
            }
            info = info.next;
        }
        return null;
    }

    add (callback: AnyFunction, target?: unknown, once?: boolean) {
        let tail: CallbackInfo | null = null;
        let info = this.head;
        while (info) {
            if (info.callback === callback && info.target === target) {
                return callback;
            }
            tail = info;
            info = info.next;
        }
        info = callbackInfoPool.alloc().set(callback, target, once);
        if (tail) {
            tail.next = info;
        } else {
            this.head = info;
        }
        return callback;
    }

    remove (callback: AnyFunction, target?: unknown) {
        let tail: CallbackInfo | null = null;
        let info = this.head;
        while (info) {
            if (info.callback === callback && info.target === target) {
                this.erase(info, tail);
                break;
            }
            tail = info;
            info = info.next;
        }
    }

    removeByTarget (target: unknown) {
        let tail: CallbackInfo | null = null;
        let info = this.head;
        while (info) {
            if (info.target === target) {
                info = this.erase(info, tail);
            } else {
                tail = info;
                info = info.next;
            }
        }
    }


    cancel(info: CallbackInfo) {
        info.reset();
        this.containCanceled = true;
    }

    cancelByCallback (callback: AnyFunction, target?: unknown) {
        let info = this.head;
        while (info) {
            if (info.callback === callback && info.target === target) {
                this.cancel(info);
                break;
            }
            info = info.next;
        }
    }

    cancelByTarget (target: unknown) {
        let info = this.head;
        while (info) {
            if (info.target === target) {
                this.cancel(info);
            }
            info = info.next;
        }
    }

    cancelAll () {
        let info = this.head;
        while (info) {
            this.cancel(info);
            info = info.next;
        }
    }

    purgeCanceled (): void {
        let tail: CallbackInfo | null = null;
        let info = this.head;
        while (info) {
            if (!info.valid) {
                info = this.erase(info, tail);
            } else {
                tail = info;
                info = info.next;
            }
        }
        this.containCanceled = false;
    }

    private erase (info: CallbackInfo, tail: CallbackInfo | null) {
        const next = info.next;
        if (next) {
            if (tail) {
                tail.next = next;
            } else {
                this.head = next;
            }
        } else {
            if (tail) {
                tail.next = null;
            } else {
                this.head = null;// current info is head
            }
        }
        callbackInfoPool.free(info.clear());
        return next;
    }

    clear (): this {
        let temp: CallbackInfo | null = null;
        let info = this.head;
        while (info) {
            temp = info;
            info = info.next;
            callbackInfoPool.free(temp.clear());
        }
        this.head = null;
        this.isInvoking = false;
        this.containCanceled = false;
        return this;
    }
}

const callbackListPool = new Pool<CallbackList>(() => new CallbackList(), 16);

export interface ICallbackTable {
    [x: string]: CallbackList | undefined;
}

type EventType = string | number;

/**
 * @zh CallbacksInvoker 用来根据事件名（Key）管理事件监听器列表并调用回调方法。
 * @en CallbacksInvoker is used to manager and invoke event listeners with different event keys, each key is mapped to a CallbackList.
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
     * 
     * @returns callback
     */
    on (key: EventTypeClass, callback: AnyFunction, target?: unknown, once?: boolean): typeof callback {
        let list = this._callbackTable[key];
        if (!list) {
            list = callbackListPool.alloc();
            this._callbackTable[key] = list;
        }
        return list!.add(callback, target, once);
    }

    /**
     * @zh 向一个事件名注册一个新的事件监听器，包含回调函数和调用者，该监听器只执行一次。
     * @en Register an event listener to a given event key with callback and target.
     *
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     * 
     * @returns callback
     */
    once (key: EventTypeClass, callback: AnyFunction, target?: unknown) {
        return this.on(key, callback, target, true);
    }

    /**
     * @zh 删除以指定事件，回调函数，目标注册的回调。
     * @en Remove event listeners registered with the given event key, callback and target
     * @param key - Event type
     * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
     * @param target - The callback callee of the event listener
     */
    off (key: EventTypeClass, callback: AnyFunction, target?: unknown): void {
        const list = this._callbackTable[key];
        if (list) {
            if (!list.isInvoking) {
                list.remove(callback, target);
                if (!list.head) {
                    callbackListPool.free(list.clear());
                    delete this._callbackTable[key];
                }
            } else {
                list.cancelByCallback(callback, target);
            }
        }
        this._offCallback?.();
    }

    /**
     * @zh 移除在特定事件类型中注册的所有回调或在某个目标中注册的所有回调。
     * @en Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @param keyOrTarget - The event type or target with which the listeners will be removed
     */
    public removeAll (keyOrTarget: unknown): void {
        const type = typeof keyOrTarget;
        if (type === 'string' || type === 'number') {
            const list = this._callbackTable[type];
            if (list) {
                if (!list.isInvoking) {
                    callbackListPool.free(list.clear());
                    delete this._callbackTable[type];
                } else {
                    list.cancelAll();
                }
            }
        } else if (keyOrTarget) {
            for (const k in this._callbackTable) {
                const list = this._callbackTable[k]!;
                if (!list.isInvoking) {
                    list.removeByTarget(keyOrTarget);
                    if (!list.head) {
                        callbackListPool.free(list.clear());
                        delete this._callbackTable[k];
                    }
                } else {
                    list.cancelByTarget(keyOrTarget);
                }
            }
        }
    }

    hasTarget(target: unknown) {
        let list: CallbackList, info: CallbackInfo | null;
        for (const k in this._callbackTable) {
            list = this._callbackTable[k]!;
            info = list.head;
            while (info) {
                if (info.valid && info.target === target) {
                    return true;
                }
                info = info.next;
            }
        }
        return false;
    }

    /**
     * @zh 检查指定事件是否已注册回调。
     * @en Checks whether there is correspond event listener registered on the given event
     * 
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     */
    hasEventListener (key: EventTypeClass, callback?: AnyFunction, target?: unknown): boolean {
        const list = this._callbackTable[key];
        if (!list) {
            return false;
        }
        // check any valid callback
        if (!callback) {
            if (list.isInvoking) {
                let info = list.head;
                while (info) {
                    if (info.valid) {
                        return true;// make sure no cancelled callbacks
                    }
                    info = info.next;
                }
                return false;
            } else {
                return !!list.head;
            }
        }
        return !!list.find(callback, target)?.check();
    }

    /**
     * @zh 派发一个指定事件，并传递需要的参数
     * @en Trigger an event directly with the event name and necessary arguments.
     * @param key - Event type
     * @param arg0 - The first argument to be passed to the callback
     * @param arg1 - The second argument to be passed to the callback
     * @param arg2 - The third argument to be passed to the callback
     * @param arg3 - The fourth argument to be passed to the callback
     * @param arg4 - The fifth argument to be passed to the callback
     */
    emit (key: EventTypeClass, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        const list = this._callbackTable[key];
        if (!list) {
            return;
        }
        const rootInvoker = !list.isInvoking;
        list.isInvoking = true;
        let callback: AnyFunction, target: unknown;
        let info = list.head;
        while (info) {
            if (!info.check()) {
                list.cancel(info);
                info = info.next;
                continue;
            }
            callback = info.callback;
            target = info.target;
            if (info.once) {
                list.cancel(info);
            }
            info = info.next;
            if (target) {
                callback.call(target, arg0, arg1, arg2, arg3, arg4);
            } else {
                callback(arg0, arg1, arg2, arg3, arg4);
            }
        }
        if (rootInvoker) {
            list.isInvoking = false;
            if (list.containCanceled) {
                list.purgeCanceled();
                if (!list.head) {
                    callbackListPool.free(list.clear());
                    delete this._callbackTable[key];
                }
            }
        }
    }

    clear (): void {
        for (const key in this._callbackTable) {
            const list = this._callbackTable[key];
            if (list) {
                callbackListPool.free(list.clear());
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