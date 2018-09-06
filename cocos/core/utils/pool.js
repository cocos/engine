/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * !#en
 * A fixed-length object pool designed for general type.<br>
 * The implementation of this object pool is very simple,
 * it can helps you to improve your game performance for objects which need frequent release and recreate operations<br/>
 * !#zh
 * 长度固定的对象缓存池，可以用来缓存各种对象类型。<br/>
 * 这个对象池的实现非常精简，它可以帮助您提高游戏性能，适用于优化对象的反复创建和销毁。
 * @class js.Pool
 * @example
 *
 *Example 1:
 *
 *function Details () {
 *    this.uuidList = [];
 *};
 *Details.prototype.reset = function () {
 *    this.uuidList.length = 0;
 *};
 *Details.pool = new js.Pool(function (obj) {
 *    obj.reset();
 *}, 5);
 *Details.pool.get = function () {
 *    return this._get() || new Details();
 *};
 *
 *var detail = Details.pool.get();
 *...
 *Details.pool.put(detail);
 *
 *Example 2:
 *
 *function Details (buffer) {
 *    this.uuidList = buffer;
 *};
 *...
 *Details.pool.get = function (buffer) {
 *    var cached = this._get();
 *    if (cached) {
 *        cached.uuidList = buffer;
 *        return cached;
 *    }
 *    else {
 *        return new Details(buffer);
 *    }
 *};
 *
 *var detail = Details.pool.get( [] );
 *...
 */
export default class Pool {
    /**
     * !#en
     * Constructor for creating an object pool for the specific object type.
     * You can pass a callback argument for process the cleanup logic when the object is recycled.
     * !#zh
     * 使用构造函数来创建一个指定对象类型的对象池，您可以传递一个回调函数，用于处理对象回收时的清理逻辑。
     * @method constructor
     * @param {Function} [cleanupFunc] - the callback method used to process the cleanup logic when the object is recycled.
     * @param {Object} cleanupFunc.obj
     * @param {Number} size - initializes the length of the array
     * @typescript
     * constructor(cleanupFunc: (obj: any) => void, size: number)
     * constructor(size: number)
     */
    constructor (cleanupFunc, size) {
        if (size === undefined) {
            size = cleanupFunc;
            cleanupFunc = null;
        }
        this.get = null;
        this.count = 0;
        this._pool = new Array(size);
        this._cleanup = cleanupFunc;
    }

    /**
     * !#en
     * Get an object from pool, if no available object in the pool, null will be returned.
     * !#zh
     * 获取对象池中的对象，如果对象池没有可用对象，则返回空。
     * @method _get
     * @returns {Object|null}
     */
    _get () {
        if (this.count > 0) {
            --this.count;
            var cache = this._pool[this.count];
            this._pool[this.count] = null;
            return cache;
        }
        return null;
    }

    /**
     * !#en Put an object into the pool.
     * !#zh 向对象池返还一个不再需要的对象。
     * @method put
     */
    put (obj) {
        var pool = this._pool;
        if (this.count < pool.length) {
            if (this._cleanup && this._cleanup(obj) === false) {
                return;
            }
            pool[this.count] = obj;
            ++this.count;
        }
    }

    /**
     * !#en Resize the pool.
     * !#zh 设置对象池容量。
     * @method resize
     */
    resize (length) {
        if (length >= 0) {
            this._pool.length = length;
            if (this.count > length) {
                this.count = length;
            }
        }
    }
}

/**
 * !#en
 * Get and initialize an object from pool. This method defaults to null and requires the user to implement it.
 * !#zh
 * 获取并初始化对象池中的对象。这个方法默认为空，需要用户自己实现。
 * @method get
 * @param {any} ...params - parameters to used to initialize the object
 * @returns {Object}
 */

/**
 * !#en
 * The current number of available objects, the default is 0, it will gradually increase with the recycle of the object,
 * the maximum will not exceed the size specified when the constructor is called.
 * !#zh
 * 当前可用对象数量，一开始默认是 0，随着对象的回收会逐渐增大，最大不会超过调用构造函数时指定的 size。
 * @property {Number} count
 * @default 0
 */
