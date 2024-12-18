/*
 Copyright (c) 2018-2023 Xiamen Yaji Software Co., Ltd.

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

type CleanUpFunction<T> = (value: T) => boolean | void;

/**
 * @en
 * A fixed-length object pool designed for general type.<br>
 * The implementation of this object pool is very simple.
 * It can help you to improve your game performance for objects which need frequent release and recreate operations.<br/>
 * @zh
 * 长度固定的对象缓存池，可以用来缓存各种对象类型。<br/>
 * 这个对象池的实现非常精简，它可以帮助您提高游戏性能，适用于优化对象的反复创建和销毁。
 * @class js.Pool
 * @example
 * ```
 *
 * Example 1:
 *
 * function Details () {
 *     this.uuidList = [];
 * };
 * Details.prototype.reset = function () {
 *     this.uuidList.length = 0;
 * };
 * Details.pool = new js.Pool(function (obj) {
 *     obj.reset();
 * }, 5);
 * Details.pool.get = function () {
 *     return this._get() || new Details();
 * };
 *
 * var detail = Details.pool.get();
 * ...
 * Details.pool.put(detail);
 *
 * Example 2:
 *
 * function Details (buffer) {
 *    this.uuidList = buffer;
 * };
 * ...
 * Details.pool.get = function (buffer) {
 *     var cached = this._get();
 *     if (cached) {
 *         cached.uuidList = buffer;
 *         return cached;
 *     }
 *     else {
 *         return new Details(buffer);
 *     }
 * };
 *
 * var detail = Details.pool.get( [] );
 * ...
 * ```
 */
export class Pool<T> {
    /**
     * @en
     * The current number of available objects, the default is 0. It will gradually increase with the recycle of the object,
     * the maximum will not exceed the size specified when the constructor is called.
     * @zh
     * 当前可用对象数量，一开始默认是 0，随着对象的回收会逐渐增大，最大不会超过调用构造函数时指定的 size。
     * @default 0
     */
    public count: number = 0;

    /**
     * @en
     * Gets an object from pool.
     * @zh 从对象池中获取一个对象。
     * @returns @en An object or null if this pool doesn't contain any object.
     * @zh 获取的对象。如果对象池中没有对象，返回 null。
     */
    public get (): T | null {
        return this._get();
    }

    private declare _pool: Array<T | null>;
    private declare _cleanup: CleanUpFunction<T> | null;

    /**
     * @en Constructor. @zh 构造函数。
     * @param cleanupFunc @en Callback method used to process the cleanup logic when the object is recycled.
     * @zh 当对象放入对象池时，用来执行清理逻辑的回调函数。
     * @param size @en Pool size. @zh 对象池大小。
     */
    constructor (cleanup: CleanUpFunction<T>, size: number);

    /**
     * @en Constructor. @zh 构造函数。
     * @param size @en Pool size. @zh 对象池大小。
     */
    constructor (size: number);

    /**
     * @en Constructor. @zh 构造函数。
     * @param _0 @en If it is a number, it is the array size. Or it is a callback function used to process
     * the cleanup logic when the object is recycled.
     * @zh 如果是 number，那么它是对象池大小。否则是当对象放入对象池时，用来执行清理逻辑的回调函数。
     * @param _1 @en Array size if it is a valid number. @zh 如果是个有效的 number 类型，那么是对象池大小。
     */
    constructor (_0: CleanUpFunction<T> | number, _1?: number) {
        const size = (_1 === undefined) ? (_0 as number) : _1;
        const cleanupFunc = (_1 === undefined) ? null : (_0 as CleanUpFunction<T>);
        this._pool = new Array(size);
        this._cleanup = cleanupFunc;
    }

    /**
     * @en
     * Gets an object from pool.
     * @zh 从对象池中获取一个对象。
     * @returns @en An object or null if this pool doesn't contain any object.
     * @zh 获取的对象。如果对象池中没有对象，返回 null。
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _get (): T | null {
        if (this.count > 0) {
            --this.count;
            const cache = this._pool[this.count];
            this._pool[this.count] = null;
            return cache;
        }
        return null;
    }

    /**
     * @en Put an object into the pool.
     * @zh 向对象池返还一个不再需要的对象。
     */
    public put (obj: T): void {
        const pool = this._pool;
        if (this.count < pool.length) {
            if (this._cleanup && this._cleanup(obj) === false) {
                return;
            }
            pool[this.count] = obj;
            ++this.count;
        }
    }

    /**
     * @en Resize the pool.
     * @zh 设置对象池容量。
     * @param length @en New pool size.
     * @zh 新对象池大小。
     */
    public resize (length: number): void {
        if (length >= 0) {
            this._pool.length = length;
            if (this.count > length) {
                this.count = length;
            }
        }
    }
}
