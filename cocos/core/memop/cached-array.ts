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
 * @en
 * Cached array is a data structure for objects cache, it's designed for persistent data.
 * Its content array length will keep grow.
 * @zh
 * 适用于对象缓存的数组类型封装，一般用于不易被移除的常驻数据。
 * 它的内部数组长度会持续增长，不会减少。
 */
export class CachedArray<T> extends ScalableContainer {
    /**
     * @en
     * The array which stores actual content.
     * @zh
     * 实际存储数据内容的数组。
     */
    public declare array: T[];

    /**
     * @en
     * The actual count of data object.
     * @zh
     * 实际存储的元素数量。
     */
    public length = 0;

    private declare _compareFn?: (a: T, b: T) => number;
    private _initSize = 0;

    /**
     * @en Constructor. @zh 构造函数。
     * @param length @en Initial length of the CachedArray. @zh CachedArray 的初始长度。
     * @param compareFn @en Function used to determine the order of the elements. It is expected to return
     * a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
     * value otherwise. If omitted, the elements are sorted in ascending, ASCII character order.
     * @zh 用来确定元素顺序的函数。如果第一个参数小于第二个参数，它应该返回一个负值，如果它们相等，则返回0，否则返回一个正值。
     * 如果省略，元素将按 ASCII 字符升序排序。
     */
    constructor (length: number, compareFn?: (a: T, b: T) => number) {
        super();
        this.array = new Array(length);
        this._initSize = length;
        this._compareFn = compareFn;
    }

    /**
     * @en
     * Push an element to the end of the array.
     * @zh
     * 向数组末尾添加一个元素。
     * @param item @en The item to be added. @zh 被添加到数组的元素。
     */
    public push (item: T): void {
        this.array[this.length++] = item;
    }

    /**
     * @en
     * Pop the last element in the array. The [[length]] will reduce, but the internal array will keep its size.
     * @zh
     * 弹出数组最后一个元素，CachedArray 的 [[length]] 会减少，但是内部数组的实际长度不变。
     * @returns @en The last element of this CachedArray. If CachedArray is empty, will return undefined.
     * @zh 数组的最后一个元素。如果数组为空，将返回 undefined。
     */
    public pop (): T | undefined {
        return this.array[--this.length];
    }

    /**
     * @en
     * Get the element at the specified index of the array.
     * @zh
     * 获取数组中指定位置的元素。
     * @param idx @en The index of the requested element. @zh 用于获取数组元素的索引。
     * @returns @en The element at given index. If idx not in [0, [[length]]) or array is empty, will return undefined.
     * @zh 数组下标对应的元素。如果 idx 超出 [0, [[length]]），或者数组是空的，将返回 undefined。
     */
    public get (idx: number): T | undefined {
        return this.array[idx];
    }

    /**
     * @en
     * Clear the cache. The [[length]] will be set to 0, but the internal array will keep its size.
     * @zh
     * 清空数组所有元素。[[length]] 会被设为 0，但内部数组的实际长度不变
     */
    public clear (): void {
        this.length = 0;
    }

    /**
     * @en
     * Destroy the array. The [[length]] will be set to 0, and clear the internal array.
     * @zh
     * 销毁数组。[[length]] 会被设为 0，并且清空内部数组。
     */
    public destroy (): void {
        this.length = 0;
        this.array.length = 0;
        super.destroy();
    }

    /**
     * @en Requests the removal of unused capacity.
     * @zh 尝试释放多余的内存。
     */
    public tryShrink (): void {
        if (this.array.length >> 2 > this.length) {
            this.array.length = Math.max(this._initSize, this.array.length >> 1);
        }
    }

    /**
     * @en
     * Sort the existing elements in cache by [[compareFn]] passed in constructor.
     * If [[compareFn]] is not passed in, the elements are sorted in ascending, ASCII character order.
     * @zh
     * 使用构造函数传入的 [[compareFn]] 排序所有现有元素。如果没有传入比较函数，将按照 ASCII 升序排序。
     */
    public sort (): void {
        this.array.length = this.length;
        this.array.sort(this._compareFn);
    }

    /**
     * @en
     * Add all elements of a given array to the end of the current array.
     * @zh
     * 添加一个指定数组中的所有元素到当前数组末尾。
     * @param array @en The given array to be appended. @zh 被添加的数组。
     */
    public concat (array: T[]): void {
        for (let i = 0; i < array.length; ++i) {
            this.array[this.length++] = array[i];
        }
    }

    /**
     * @en Delete the element at the specified location and move the last element to that location.
     * @zh 删除指定位置的元素并将最后一个元素移动至该位置。
     * @param idx @en The index of the element to be deleted. If idx out of range [0, length), there is
     * not effect.
     *  @zh 希望被删除的索引。如果索引超出 [0, length)，将没有效果。
     */
    public fastRemove (idx: number): void {
        if (idx >= this.length || idx < 0) {
            return;
        }
        const last = --this.length;
        this.array[idx] = this.array[last];
    }

    /**
     * @en Returns the first index that compares equal to val.
     * @zh 返回在数组中找到的第一个和 val 相等的元素的索引。
     * @param val @en Value to search for. @zh 搜索的值。
     * @returns The index to the first element that compares equal to val. If no elements match, returns -1.
     * @zh 第一个和 val 相等的元素的索引。如果没找到，将返回 -1。
     */
    public indexOf (val: T): number {
        for (let i = 0, len = this.length; i < len; ++i) {
            if (this.array[i] === val) {
                return i;
            }
        }
        return -1;
    }
}
