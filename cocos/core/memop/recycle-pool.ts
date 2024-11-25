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

import { ScalableContainer } from './scalable-container';

/**
 * @en Recyclable object pool. It's designed to be entirely reused each time.
 * There is no put and get method, each time you get the [[data]], you can use all elements as new.
 * You shouldn't simultaneously use the same RecyclePool in more than two overlapped logic.
 * Its size can be automatically incremented or manually resized.
 * @zh 循环对象池。这种池子被设计为每次使用都完整复用。
 * 它没有回收和提取的函数，通过获取 [[data]] 可以获取池子中所有元素，全部都应该被当做新对象来使用。
 * 开发者不应该在相互交叉的不同逻辑中同时使用同一个循环对象池。
 * 池子尺寸可以在池子满时自动扩充，也可以手动调整。
 * @see [[Pool]]
 */
export class RecyclePool<T = any> extends ScalableContainer {
    private declare _fn: () => T;
    private declare _dtor: ((obj: T) => void) | null;
    private _count = 0;
    private declare _data: T[];
    private declare _initSize: number;

    /**
     * @en Constructor with the allocator of elements and initial pool size, all elements will be pre-allocated.
     * @zh 使用元素的构造器和初始大小的构造函数，所有元素都会被预创建。
     * @param fn The allocator of elements in pool, it's invoked directly without `new`
     * @param size Initial pool size
     * @param dtor The finalizer of element, it's invoked when this container is destroyed or shrunk
     */
    constructor (fn: () => T, size: number, dtor?: (obj: T) => void) {
        super();
        this._fn = fn;
        this._dtor = dtor || null;
        this._data = new Array(size);
        this._initSize = size;

        for (let i = 0; i < size; ++i) {
            this._data[i] = fn();
        }
    }

    /**
     * @en The length of the object pool.
     * @zh 对象池大小。
     */
    get length (): number {
        return this._count;
    }

    /**
     * @en The underlying array of all pool elements.
     * @zh 实际对象池数组。
     */
    get data (): T[] {
        return this._data;
    }

    /**
     * @en Resets the object pool. Only changes the length to 0.
     * @zh 清空对象池。目前仅仅会设置尺寸为 0。
     */
    public reset (): void {
        this._count = 0;
    }

    /**
     * @en Resize the object poo, and fills with new created elements.
     * @zh 设置对象池大小，并填充新的元素。
     * @param size @en The new size of the pool. @zh 新的对象池大小。
     */
    public resize (size: number): void {
        if (size > this._data.length) {
            for (let i = this._data.length; i < size; ++i) {
                this._data[i] = this._fn();
            }
        }
    }

    /**
     * @en Adds a new element. If the capacity is insufficient, it will automatically expand to twice its original size.
     * @zh 添加一个新元素，如果容量不足，会自动扩充尺寸到原来的 2 倍。
     */
    public add (): T {
        if (this._count >= this._data.length) {
            this.resize(this._data.length << 1);
        }

        return this._data[this._count++];
    }

    /**
     * @en Destroy the object pool. Please don't use it any more after it is destroyed.
     * @zh 销毁对象池。销毁后不能继续使用。
     */
    public destroy (): void {
        if (this._dtor) {
            for (let i = 0; i < this._data.length; i++) {
                this._dtor(this._data[i]);
            }
        }
        this._data.length = 0;
        this._count = 0;
        super.destroy();
    }

    /**
     * @en Try to shrink the object pool to free memory.
     * @zh 尝试回收没用的对象，释放内存。
     */
    public tryShrink (): void {
        if (this._data.length >> 2 > this._count) {
            const length = Math.max(this._initSize, this._data.length >> 1);
            if (this._dtor) {
                for (let i = length; i < this._data.length; i++) {
                    this._dtor(this._data[i]);
                }
            }
            this._data.length = length;
        }
    }

    /**
     * @en Remove the element with the specified index from the object pool. This will decrease pool size.
     * @zh 移除对象池中指定索引的元素，会减小池子尺寸。
     * @param idx @en The index of the element to remove. @zh 被移除的元素的索引。
     */
    public removeAt (idx: number): void {
        if (idx >= this._count) {
            return;
        }

        const last = this._count - 1;
        const tmp = this._data[idx];
        this._data[idx] = this._data[last];
        this._data[last] = tmp;
        this._count -= 1;
    }
}
