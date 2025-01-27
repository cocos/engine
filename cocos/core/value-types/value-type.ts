/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { errorID } from '../platform/debug';
import * as js from '../utils/js';
import { legacyCC } from '../global-exports';

/**
 * @en The base class of all value types.
 * @zh 所有值类型的基类。
 */
export class ValueType {
    constructor () {}
    /**
     * @en
     * Clone the current object. The clone result of the object should be equal to the current object,
     * i.e. satisfy `this.equals(this, value.clone())`.
     * The base version of this method do nothing and returns `this'.
     * The derived class **must** rewrite this method and the returned object should not be `this`, i.e. satisfy `this !== this.clone()`.
     * @zh
     * 克隆当前值。克隆的结果值应与当前值相等，即满足 `this.equals(this, value.clone())`。
     * 本方法的基类版本简单地返回 `this`；
     * 派生类**必须**重写本方法，并且返回的对象不应当为 `this`，即满足 `this !== this.clone()`。
     * @returns @en The cloned object. @zh 克隆的对象。
     */
    public clone (): ValueType {
        errorID(100, `${js.getClassName(this)}.clone`);
        return this;
    }

    /**
     * @en
     * Check whether the current object is equal to the specified object.
     * This check should be interchangeable, i.e. satisfy `this.equals(other) === other.equals(this)`.
     * The base version of this method will returns `false'.
     * @zh
     * 判断当前值是否与指定值相等。此判断应当具有交换性，即满足 `this.equals(other) === other.equals(this)`。
     * 本方法的基类版本简单地返回 `false`。
     * @param other @en The other object @zh 指定值。
     * @returns @en `true` if equal, otherwise returns `false` @zh 如果相等，则返回 `true`，否则返回 `false`。
     */
    public equals (other: this): boolean {
        // errorID(100, js.getClassName(this) + '.equals');
        return false;
    }

    /**
     * @en
     * Set the property values of the current object with the given object.
     * The base version of this method will returns `this' and the derived class **must** rewrite this method.
     * @zh
     * 赋值当前值使其与指定值相等。
     * 本方法的基类版本简单地返回 `this`，派生类**必须**重写本方法。
     * @param other @en The other object. @zh 指定值。
     */
    public set (other: this): void {
        errorID(100, `${js.getClassName(this)}.set`);
    }

    /**
     * @en
     * Convert the current object to a string.
     * The base version of this method will returns an empty string.
     * @zh
     * 返回当前值的字符串表示。
     * 本方法的基类版本返回空字符串。
     * @returns @en The string representation of the current value. @zh 当前值的字符串表示。
     */
    public toString (): string {
        return `${''}`;
    }
}
js.setClassName('cc.ValueType', ValueType);

legacyCC.ValueType = ValueType;
