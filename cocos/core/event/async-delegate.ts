/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { array } from '../utils/js';

/**
 * @zh
 * Async Delegate 用于支持异步回调的代理，你可以新建一个异步代理，并注册异步回调，等到对应的时机触发代理事件。
 *
 * @en
 * Async Delegate is a delegate that supports asynchronous callbacks.
 * You can create a new AsyncDelegate, register the asynchronous callback, and wait until the corresponding time to dispatch the event.
 *
 * @example
 * ```ts
 * const ad = new AsyncDelegate();
 * ad.add(() => {
 *     return new Promise((resolve, reject) => {
 *        setTimeout(() => {
 *            console.log('hello world');
 *            resolve();
 *        }, 1000);
 *     })
 * });
 * await ad.dispatch();
 * ```
 */
export class AsyncDelegate<T extends (...args: any) => (Promise<void> | void) = () => (Promise<void> | void)> {
    private _delegates: T[] = [];

    /**
     * @en
     * Add an async callback or sync callback.
     *
     * @zh
     * 添加一个异步回调或同步回调。
     *
     * @param callback
     * @en The callback to add, and will be invoked when this delegate is dispatching.
     * @zh 要添加的回调，并将在该委托调度时被调用。
     */
    public add (callback: T): void {
        if (!this._delegates.includes(callback)) {
            this._delegates.push(callback);
        }
    }

    /**
     * @zh
     * 查询是否已注册某个回调。
     * @en
     * Queries if a callback has been registered.
     *
     * @param callback @en The callback to query. @zh 要查询的回调函数。
     * @returns @en Whether the callback has been added. @zh 是否已经添加了回调。
     */
    public hasListener (callback: T): boolean {
        return this._delegates.includes(callback);
    }

    /**
     * @en
     * Remove the specific callback of this delegate.
     *
     * @zh
     * 移除此代理中某个具体的回调。
     *
     * @param callback @en The callback to remove. @zh 要移除的某个回调。
     */
    public remove (callback: T): void {
        array.fastRemove(this._delegates, callback);
    }

    /**
     * @en
     * Dispatching the delegate event. This function will trigger all previously registered callbacks and does not guarantee execution order.
     *
     * @zh
     * 派发代理事件。此函数会触发所有之前注册的回调，并且不保证执行顺序。
     *
     * @param args @en The parameters to be transferred to callback. @zh 传递给回调函数的参数。
     * @returns @en The promise awaiting all async callback resolved. @zh 等待所有异步回调结束的 Promise 对象。
     */
    public dispatch (...args: Parameters<T>): Promise<void[]> {
        return Promise.all(this._delegates.map((func) => func(...arguments)).filter(Boolean));
    }
}
