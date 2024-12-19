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

import { CCClass } from '../data/class';
import { ValueType } from '../value-types/value-type';
import { ISizeLike } from './type-define';
import { legacyCC } from '../global-exports';

/**
 * @en Two dimensional size type representing the width and height.
 * @zh 二维尺寸。
 */
export class Size extends ValueType {
    public static ZERO = Object.freeze(new Size(0, 0));
    public static ONE = Object.freeze(new Size(1, 1));

    /**
     * @en Calculate the interpolation result between this size and another one with given ratio
     * @zh 根据指定的插值比率，从当前尺寸到目标尺寸之间做插值。
     * @param out Output Size.
     * @param from Original Size.
     * @param to Target Size.
     * @param ratio The interpolation coefficient.The range is [0,1].
     * @return A vector consisting of linear interpolation of the width and height of the current size
     *         to the width and height of the target size at a specified interpolation ratio, respectively.
     */
    public static lerp <Out extends ISizeLike> (out: Out, from: Out, to: Out, ratio: number): Out {
        out.width = from.width + (to.width - from.width) * ratio;
        out.height = from.height + (to.height - from.height) * ratio;
        return out;
    }

    /**
     * @en Check whether `Size` a is equal to `Size` b.
     * @zh 判断两个尺寸是否相等。
     * @param a Size a.
     * @param b Size b.
     * @returns Returns `true' when both dimensions are equal in width and height; otherwise returns `false'.
     */
    public static equals <InType extends ISizeLike> (a: InType, b: InType): boolean {
        return a.width === b.width
                && a.height === b.height;
    }

    // compatibility with vector interfaces
    set x (val) { this.width = val; }
    get x (): number { return this.width; }
    set y (val) { this.height = val; }
    get y (): number { return this.height; }

    public declare width: number;

    public declare height: number;

    /**
     * @en Constructor a size from another one.
     * @zh 构造与指定尺寸相等的尺寸。
     * @param other Specified Size.
     */
    constructor (other: Size);

    /**
     * @en Constructor a size with specified values.
     * @zh 构造具有指定宽度和高度的尺寸。
     * @param width width of the Size, default value is 0.
     * @param height height of the Size, default value is 0.
     */
    constructor (width?: number, height?: number);

    constructor (width?: Size | number, height?: number) {
        super();
        if (typeof width === 'object') {
            this.width = width.width;
            this.height = width.height;
        } else {
            this.width = width || 0;
            this.height = height || 0;
        }
    }

    /**
     * @en clone the current `Size`.
     * @zh 克隆当前尺寸。
     */
    public clone (): Size {
        return new Size(this.width, this.height);
    }

    /**
     * @en Set values with another `Size`.
     * @zh 设置当前尺寸使其与指定的尺寸相等。
     * @param other Specified Size.
     * @returns `this`
     */
    public set (other: Size): any;

    /**
     * @en Set the value of each component of the current `Size`.
     * @zh 设置当前尺寸的具体参数。
     * @param width Specified width
     * @param height Specified height
     * @returns `this`
     */
    public set (width?: number, height?: number): any;

    public set (width?: Size | number, height?: number): any {
        if (typeof width === 'object') {
            this.height = width.height;
            this.width = width.width;
        } else {
            this.width = width || 0;
            this.height = height || 0;
        }
        return this;
    }

    /**
     * @en Check whether the current `Size` equals another one.
     * @zh 判断当前尺寸是否与指定尺寸的相等。
     * @param other Specified Size
     * @returns Returns `true' when both dimensions are equal in width and height; otherwise returns `false'.
     */
    public equals (other: Size): boolean {
        return this.width === other.width
            && this.height === other.height;
    }

    /**
     * @en Calculate the interpolation result between this size and another one with given ratio
     * @zh 根据指定的插值比率，从当前尺寸到目标尺寸之间做插值。
     * @param to Target Size.
     * @param ratio The interpolation coefficient.The range is [0,1].
     */
    public lerp (to: Size, ratio: number): Size {
        this.width += (to.width - this.width) * ratio;
        this.height += (to.height - this.height) * ratio;
        return this;
    }

    /**
     * @en Return the information of the current size in string
     * @zh 返回当前尺寸的字符串表示。
     * @returns The information of the current size in string
     */
    public toString (): string {
        return `(${this.width}, ${this.height})`;
    }
}

CCClass.fastDefine('cc.Size', Size, { width: 0, height: 0 });

/**
 * @en Constructs a `Size` object.
 * @zh 等价于 `new Size(other)`。
 * @param other Specified Size.
 * @returns `new Size(other)`
 */
export function size (other: Size): Size;

/**
 * @en Constructs a `Size` object.
 * @zh 等价于 `new Size(x, y)`。
 * @param width Specified width
 * @param height Specified height
 * @returns `new Size(w, h)`
 */
export function size (width?: number, height?: number): Size;

export function size (width: Size | number = 0, height = 0): Size {
    return new Size(width as number, height);
}

legacyCC.size = size;

legacyCC.Size = Size;
