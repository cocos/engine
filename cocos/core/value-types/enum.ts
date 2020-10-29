/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
*/

/**
 * @packageDocumentation
 * @module core/value-types
 */

import { value } from '../utils/js';
import { EDITOR, TEST, DEV } from 'internal:constants';
import { legacyCC } from '../global-exports';
import { errorID } from '../platform/debug';
import { assertIsTrue } from '../data/utils/asserts';

/**
 * @en
 * Define an enum type. <br/>
 * If a enum item has a value of -1, it will be given an Integer number according to it's order in the list.<br/>
 * Otherwise it will use the value specified by user who writes the enum definition.
 *
 * @zh
 * 定义一个枚举类型。<br/>
 * 用户可以把枚举值设为任意的整数，如果设为 -1，系统将会分配为上一个枚举值 + 1。
 *
 * @param obj - a JavaScript literal object containing enum names and values, or a TypeScript enum type
 * @return the defined enum type
 */
export function Enum<T> (obj: T): T {
    if ('__enums__' in obj) {
        return obj;
    }
    value(obj, '__enums__', null, true);
    return Enum.update(obj);
}

/**
 * @en
 * Update the enum object properties.
 * @zh
 * 更新枚举对象的属性列表。
 * @param obj
 */
Enum.update = <T> (obj: T): T => {
    let lastIndex: number = -1;
    const keys: string[] = Object.keys(obj);

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let val = obj[key];
        if (val === -1) {
            val = ++lastIndex;
            obj[key] = val;
        }
        else {
            if (typeof val === 'number') {
                lastIndex = val;
            }
            else if (typeof val === 'string' && Number.isInteger(parseFloat(key))) {
                continue;
            }
        }
        const reverseKey: string = '' + val;
        if (key !== reverseKey) {
            if ((EDITOR || TEST) && reverseKey in obj && obj[reverseKey] !== key) {
                errorID(7100, reverseKey);
                continue;
            }
            value(obj, reverseKey, key);
        }
    }
    // auto update list if __enums__ is array
    if(Array.isArray(obj['__enums__'])) {
        updateList(obj);
    }
    return obj;
}

namespace Enum {
    export interface Enumerator<EnumT> {
        /**
         * The name of the enumerator.
         */
        name: keyof EnumT;

        /**
         * The value of the numerator.
         */
        value: EnumT[keyof EnumT];
    }
}

interface EnumExtras<EnumT> {
    __enums__: null | Enum.Enumerator<EnumT>[];
}

/**
 * Determines if the object is an enum type.
 * @param enumType The object to judge.
 */
Enum.isEnum = <EnumT extends {}>(enumType: EnumT) => {
    return enumType && enumType.hasOwnProperty('__enums__');
};

function assertIsEnum <EnumT extends {}>(enumType: EnumT): asserts enumType is EnumT & EnumExtras<EnumT> {
    assertIsTrue(enumType.hasOwnProperty('__enums__'));
}

/**
 * Get the enumerators from the enum type.
 * @param enumType An enum type.
 */
Enum.getList = <EnumT extends {}>(enumType: EnumT): readonly Enum.Enumerator<EnumT>[] => {
    assertIsEnum(enumType);

    if (enumType.__enums__) {
        return enumType.__enums__;
    }

    return updateList(enumType as EnumT);
};

/**
 * Update the enumerators from the enum type.
 * @param enumType - the enum type defined from cc.Enum
 * @return {Object[]}
 */
function updateList<EnumT extends {}>(enumType: EnumT): readonly Enum.Enumerator<EnumT>[] {
    assertIsEnum(enumType);
    const enums: any[] = enumType.__enums__ || [];
    enums.length = 0;
    // tslint:disable-next-line: forin
    for (const name in enumType) {
        const v = enumType[name];
        if (Number.isInteger(v)) {
            enums.push({ name, value: v });
        }
    }
    enums.sort((a, b) => a.value - b.value);
    enumType.__enums__ = enums;
    return enums;
};

if (DEV) {
    // check key order in object literal
    const _TestEnum = Enum({
        ZERO: -1,
        ONE: -1,
        TWO: -1,
        THREE: -1,
    });
    if (_TestEnum.ZERO !== 0 || _TestEnum.ONE !== 1 || _TestEnum.THREE !== 3) {
        errorID(7101);
    }
}

/**
 * Make the enum type `enumType` as enumeration so that Creator may identify, operate on it.
 * Formally, as a result of invocation on this function with enum type `enumType`:
 * - `Enum.isEnum(enumType)` returns `true`;
 * - `Enum.getList(enumType)` returns the enumerators of `enumType`.
 * @param enumType An enum type, eg, a kind of type with similar semantic defined by TypeScript.
 */
export function ccenum<EnumT extends {}> (enumType: EnumT) {
    if (!('__enums__' in enumType)) {
        value(enumType, '__enums__', null, true);
    }
}

legacyCC.Enum = Enum;
