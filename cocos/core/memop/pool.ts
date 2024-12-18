/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { max } from '../math/bits';
import { warnID } from '../platform/debug';
import { ScalableContainer } from './scalable-container';

/**
 * @en Typed object pool.
 * It's a traditional design, you can get elements out of the pool or recycle elements by putting back into the pool.
 * @zh 支持类型的对象池。这是一个传统设计的对象池，你可以从对象池中取出对象或是放回不再需要对象来复用。
 * @see [[RecyclePool]]
 */
export class Pool<T> extends ScalableContainer {
    private declare _ctor: () => T;
    private declare _elementsPerBatch: number;
    private declare _shrinkThreshold: number;
    private declare _nextAvail: number;
    private _freePool: T[] = [];
    private declare _dtor: ((obj: T) => void) | null;

    /**
     * @en Constructor with the allocator of elements and initial pool size.
     * @zh 使用元素的构造器和初始大小的构造函数。
     * @param ctor @en The allocator of elements in pool, it's invoked directly without `new` in Pool.
     * @zh 元素的构造器，Pool 内部使用该构造器直接创建实例。
     * @param elementsPerBatch @en Initial pool size, this size will also be the incremental size when
     * the pool is overloaded.
     * @zh 对象池的初始大小。当对象池扩容时，也会使用该值。
     * @param dtor @en The finalizer of element, it's invoked when this Pool is destroyed or shrunk if
     * it is valid.
     * @zh 元素的析构器。如果存在的话，当对象池销毁或者缩容时，会使用该析构器。
     * @param shrinkThreshold @en The container is shrink only if the size of the container exceeds the shrinkThreshold,
     * and the size of the container after reduction is greater than or equal to the shrinkThreshold. The value equals elementsPerBatch
     * if not value is passed.
     * @zh 只有容器的数量大于 shrinkThreshold 时才缩容，缩减后的容器大小小于等于 shrinkThreshold。如果没有传入值，那么它的值和 elementsPerBatch 相同。
     */
    constructor (ctor: () => T, elementsPerBatch: number, dtor?: (obj: T) => void, shrinkThreshold?: number) {
        super();
        this._ctor = ctor;
        this._dtor = dtor || null;
        this._elementsPerBatch = Math.max(elementsPerBatch, 1);
        this._shrinkThreshold = shrinkThreshold ? max(shrinkThreshold, 1) : this._elementsPerBatch;
        this._nextAvail = this._elementsPerBatch - 1;

        for (let i = 0; i < this._elementsPerBatch; ++i) {
            this._freePool.push(ctor());
        }
    }

    /**
     * @en Take an object out of the object pool.
     * @zh 从对象池中取出一个对象。
     * @returns @en An object ready for use. This function always returns an object.
     * @zh 该函数总是返回一个可用的对象。
     */
    public alloc (): T {
        if (this._nextAvail < 0) {
            this._freePool.length = this._elementsPerBatch;
            for (let i = 0; i < this._elementsPerBatch; i++) {
                this._freePool[i] = this._ctor();
            }
            this._nextAvail = this._elementsPerBatch - 1;
        }

        return this._freePool[this._nextAvail--];
    }

    /**
     * @en Put an object back into the object pool.
     * @zh 将一个对象放回对象池中。
     * @param obj @en The object to be put back into the pool.
     * @zh 放回对象池中的对象。
     */
    public free (obj: T): void {
        this._freePool[++this._nextAvail] = obj;
    }

    /**
     * @en Put multiple objects back into the object pool.
     * @zh 将一组对象放回对象池中。
     * @param objs @en An array of objects to be put back into the pool.
     * @zh 放回对象池中的一组对象。
     */
    public freeArray (objs: T[]): void {
        this._freePool.length = this._nextAvail + 1;
        Array.prototype.push.apply(this._freePool, objs);
        this._nextAvail += objs.length;
    }

    /**
     * @en Try to shrink the object pool to reduce memory usage.
     * @zh 尝试缩容对象池，以释放内存。
     */
    public tryShrink (): void {
        const freeObjectNumber = this._nextAvail + 1;
        if (freeObjectNumber <= this._shrinkThreshold) {
            return;
        }

        let objectNumberToShrink = 0;
        if (freeObjectNumber >> 1 >= this._shrinkThreshold) {
            objectNumberToShrink = freeObjectNumber >> 1;
        } else {
            objectNumberToShrink = Math.floor((freeObjectNumber - this._shrinkThreshold + 1) / 2);
        }

        if (this._dtor) {
            for (let i = this._nextAvail - objectNumberToShrink + 1;  i <=  this._nextAvail; ++i) {
                this._dtor(this._freePool[i]);
            }
        }
        this._nextAvail -= objectNumberToShrink;
        this._freePool.length = this._nextAvail + 1;
    }

    /**
     * @en Destroy all elements and clear the pool.
     * @zh 释放对象池中所有资源并清空缓存池。
     */
    public destroy (): void {
        const dtor = arguments.length > 0 ? arguments[0] : null;
        if (dtor) { warnID(14100); }
        const readDtor = dtor || this._dtor;
        if (readDtor) {
            for (let i = 0; i <= this._nextAvail; i++) {
                readDtor(this._freePool[i]);
            }
        }
        this._freePool.length = 0;
        this._nextAvail = -1;
        super.destroy();
    }
}
