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

import { EDITOR, DEV, TEST } from 'internal:constants';
import { warnID, error, errorID, StringSubstitution } from '../platform/debug';
import { IDGenerator }  from './id-generator';

const tempCIDGenerator = new IDGenerator('TmpCId.');

const aliasesTag = typeof Symbol === 'undefined' ? '__aliases__' : Symbol('[[Aliases]]');
const classNameTag = '__classname__';
const classIdTag = '__cid__';

/**
 * @en
 * Checks if an object is `number`.
 * @zh
 * 检查对象是否是 number 类型。
 * @param object @en The object to check. @zh 要检查的对象。
 * @returns @en True if it is a number primitive or a `Number` instance, false else.
 * @zh 如果该对象是基础数字类型或者是 `Number` 实例，返回 `true`；否则返回 `false`。
 * @example
 * ```ts
 * var obj = 10;
 * isNumber(obj); // returns true
 *
 * obj = new Number(10);
 * isNumber(obj); // returns true
 * ```
 */
export function isNumber (object: any): boolean {
    return typeof object === 'number' || object instanceof Number;
}

/**
 * @en
 * Checks if an object is `string`.
 * @zh
 * 检查对象是否是 string 类型。
 * @param object @en The object to check. @zh 要检查的对象。
 * @returns @en True if it is a string primitive or a `String` instance, false else.
 * @zh 如果该对象是基础字符串类型或者是 `String` 实例，返回 `true`；否则返回 `false`。
 * @example
 * ```ts
 * var obj = "it is a string";
 * isString(obj); // returns true
 *
 * obj = new String("it is a string");
 * isString(obj); // returns true
 * ```
 */
export function isString (object: any): boolean {
    return typeof object === 'string' || object instanceof String;
}

/**
 * @en
 * Checks if an object is empty object. If an object does not have any enumerable property
 * (including properties inherits from prototype chains), then it is an empty object.
 * @zh
 * 检查对象是否为空对象。空对象的定义是：没有任何可被枚举的属性（包括从原型链继承的属性）的对象。
 * @param obj @en The object to check. @zh 要检查的对象。
 * @returns @en True if it is not an empty object or not an object, false else.
 * @zh 如果不是空对象或者不是一个对象，返回 `true`；否则返回 `false`。
 */
export function isEmptyObject (obj: any): boolean {
    for (const key in obj) {
        return false;
    }
    return true;
}

/**
 * @en A helper function to add a property to an object, or modifies attributes
 * of an existing property. The property is configurable.
 * @zh 为对象添加属性或者修改已有属性的辅助函数。该属性是可配置的。
 * @param object @en The object to add or modify attributes. @zh 要添加或者修改属性的对象。
 * @param propertyName @en The property name to add or modify. @zh 要添加或修改的属性名。
 * @param value_ @en The property value to add or new value to replace a existing attribute.
 * @zh 要添加的属性值，或者取代现有属性的新值。
 * @param writable @en If the property is writable. @zh 属性是否可写。
 * @param enumerable @en If the property is enumerable. @zh 属性是否可枚举。
 */
export const value = ((): (object: Record<string | number, any>, propertyName: string, value_: any, writable?: boolean, enumerable?: boolean) => void => {
    const descriptor: PropertyDescriptor = {
        value: undefined,
        enumerable: false,
        writable: false,
        configurable: true,
    };
    return (object: Record<string | number, any>, propertyName: string, value_: any, writable?: boolean, enumerable?: boolean): void => {
        descriptor.value = value_;
        descriptor.writable = writable;
        descriptor.enumerable = enumerable;
        Object.defineProperty(object, propertyName, descriptor);
        descriptor.value = undefined;
    };
})();

/**
 * @en A helper function to add or modify `get`, `set`, `enumerable` or `configurable` of a property.
 * @zh 添加或修改属性的 `get`, `set`, `enumerable` 或者 `configurable`。
 * @param object @en The object to add or modify attributes. @zh 要添加或者修改属性的对象。
 * @param propertyName @en The property name to add or modify. @zh 要添加或修改的属性名。
 * @param getter @en The getter of a property. @zh 属性的获取函数。
 * @param setter @en The setter of a property. @zh 属性的设置函数。
 * @param enumerable @en If the property is enumerable. @zh 属性是否可列举。
 * @param configurable @en If the property is configurable. @zh 属性是否可配置。
 */
export const getset = ((): (object: Record<string | number, any>, propertyName: string, getter: Getter, setter?: Setter | boolean, enumerable?: boolean, configurable?: boolean) => void => {
    const descriptor: PropertyDescriptor = {
        get: undefined,
        set: undefined,
        enumerable: false,
    };
    return (object: Record<string | number, any>, propertyName: string, getter: Getter, setter?: Setter | boolean, enumerable = false, configurable = false): void => {
        if (typeof setter === 'boolean') {
            console.log('Set `setter` to boolean is deprecated. Please don not use like this again.');
            enumerable = setter;
            setter = undefined;
        }
        descriptor.get = getter;
        // TODO: on OH platform, strictNullCheck compiler option is false, so we need to force inferring as Setter type. @PP_Pro
        descriptor.set = setter as Setter;
        descriptor.enumerable = enumerable;
        descriptor.configurable = configurable;
        Object.defineProperty(object, propertyName, descriptor);
        descriptor.get = undefined;
        descriptor.set = undefined;
    };
})();

/**
 * @en A helper function to add or modify `get`, `enumerable` or `configurable` of a property.
 * @zh 添加或修改属性的 `get`, `enumerable` 或者 `configurable`。
 * @param object @en The object to add or modify attributes. @zh 要添加或者修改属性的对象。
 * @param propertyName @en The property name to add or modify. @zh 要添加或修改的属性名。
 * @param getter @en The getter of a property. @zh 属性的获取函数。
 * @param enumerable @en If the property is enumerable. @zh 属性是否可列举。
 * @param configurable @en If the property is configurable. @zh 属性是否可配置。
 */
export const get = ((): (object: Record<string | number, any>, propertyName: string, getter: Getter, enumerable?: boolean, configurable?: boolean) => void => {
    const descriptor: PropertyDescriptor = {
        get: undefined,
        enumerable: false,
        configurable: false,
    };
    return (object: Record<string | number, any>, propertyName: string, getter: Getter, enumerable?: boolean, configurable?: boolean): void => {
        descriptor.get = getter;
        descriptor.enumerable = enumerable;
        descriptor.configurable = configurable;
        Object.defineProperty(object, propertyName, descriptor);
        descriptor.get = undefined;
    };
})();

/**
 * @en A helper function to add or modify `get`, `enumerable` or `configurable` of a property.
 * @zh 添加或修改属性的 `get`, `enumerable` 或者 `configurable`。
 * @param object @en The object to add or modify attributes. @zh 要添加或者修改属性的对象。
 * @param propertyName @en The property name to add or modify. @zh 要添加或修改的属性名。
 * @param setter @en The setter of a property. @zh 属性的设置函数。
 * @param enumerable @en If the property is enumerable. @zh 属性是否可列举。
 * @param configurable @en If the property is configurable. @zh 属性是否可配置。
 */
export const set = ((): (object: Record<string | number, any>, propertyName: string, setter: Setter, enumerable?: boolean, configurable?: boolean) => void => {
    const descriptor: PropertyDescriptor = {
        set: undefined,
        enumerable: false,
        configurable: false,
    };
    return (object: Record<string | number, any>, propertyName: string, setter: Setter, enumerable?: boolean, configurable?: boolean): void => {
        descriptor.set = setter;
        descriptor.enumerable = enumerable;
        descriptor.configurable = configurable;
        Object.defineProperty(object, propertyName, descriptor);
        descriptor.set = undefined;
    };
})();

/**
 * @en
 * A simple wrapper of `Object.create(null)` which ensures the return object have no prototype (and thus no inherited members).
 * This eliminates the need to make `hasOwnProperty` judgments when we look for values by key on the object,
 * which is helpful for performance in this case.
 * @zh
 * 该方法是对 `Object.create(null)` 的简单封装。
 * `Object.create(null)` 用于创建无 prototype （也就无继承）的空对象。
 * 这样我们在该对象上查找属性时，就不用进行 `hasOwnProperty` 判断，此时对性能提升有帮助。
 *
 * @param forceDictMode @en Apply the delete operator to newly created map object. This will let V8 put the object in
 * "dictionary mode" and disables creation of hidden classes. This will improve the performance of objects that are
 * constantly changing shape.
 * @zh 对新创建的地图对象应用删除操作。这将让V8将对象置于 "字典模式"，并禁止创建隐藏类。这将提高那些不断变化形状对象的性能。
 * @returns @en A newly map object. @zh 一个新的 map 对象。
 */
export function createMap (forceDictMode?: boolean): any {
    const map = Object.create(null);
    if (forceDictMode) {
        const INVALID_IDENTIFIER_1 = '.';
        const INVALID_IDENTIFIER_2 = '/';
        // assign dummy values on the object
        map[INVALID_IDENTIFIER_1] = 1;
        map[INVALID_IDENTIFIER_2] = 1;
        delete map[INVALID_IDENTIFIER_1];
        delete map[INVALID_IDENTIFIER_2];
    }
    return map;
}

/**
 * @en
 * Gets class name of the object, if object is just a {} (and which class named 'Object'), it will return "".
 * (modified from <a href="http://stackoverflow.com/questions/1249531/how-to-get-a-javascript-objects-class">the code of stackoverflow post</a>)
 * @zh
 * 获取对象的类型名称，如果对象是 {} 字面量，将会返回 ""。参考了 stackoverflow 的代码实现：
 * <a href="http://stackoverflow.com/questions/1249531/how-to-get-a-javascript-objects-class">stackoverflow 的实现</a>
 * @param objOrCtor @en An object instance or constructor. @zh 类实例或者构造函数。
 * @returns @en The class name. @zh 类名。
 */
export function getClassName (objOrCtor: any): string {
    if (typeof objOrCtor === 'function') {
        const prototype = objOrCtor.prototype;
        // eslint-disable-next-line no-prototype-builtins
        if (prototype && prototype.hasOwnProperty(classNameTag) && prototype[classNameTag]) {
            return prototype[classNameTag] as string;
        }
        let ret = '';
        //  for browsers which have name property in the constructor of the object, such as chrome
        if (objOrCtor.name) {
            ret = objOrCtor.name;
        } else if (objOrCtor.toString) {
            let arr;
            const str = objOrCtor.toString();
            if (str.charAt(0) === '[') {
                // str is "[object objectClass]"
                // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                arr = /\[\w+\s*(\w+)\]/.exec(str);
            } else {
                // str is function objectClass () {} for IE Firefox
                // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                arr = /^function\s*(\w+)/.exec(str);
            }
            if (arr && arr.length === 2) {
                ret = arr[1];
            }
        }
        return ret !== 'Object' ? ret : '';
    } else if (objOrCtor && objOrCtor.constructor) {
        return getClassName(objOrCtor.constructor);
    }
    return '';
}

/**
 * @en Deprecates a property. It will print waring message if the deprecated property is accessed.
 * The warning message includes new property name to use.
 * @zh 废弃一个属性。如果被废弃属性还在使用的话，会打印警告消息。警告消息包含新的属性名。
 * @param object @en The object or class of the property to deprecate.
 *               @zh 被废弃属性的对象或者类。
 * @param obsoleted @en The property name to deprecate. It could be a property name or `className.propertyName`.
 * @zh 要废弃的属性名。可以直接传属性名或者是 `类名.属性名` 的形式。
 * @param newExpr @en New property name to use. It could be a property name or `className.propertyName`.
 * @zh 新的属性名。可以直接传属性名或者是 `类名.属性名` 的形式。
 * @param writable @en Whether the property is writable. Default is false. @zh 该属性是否可写。默认不可写。
 */
export function obsolete (object: any, obsoleted: string, newExpr: string, writable?: boolean): void {
    const extractPropName = /([^.]+)$/;
    const oldProp = extractPropName.exec(obsoleted)![0];
    const newProp = extractPropName.exec(newExpr)![0];
    function getter (this: any): unknown {
        if (DEV) {
            warnID(5400, obsoleted, newExpr);
        }
        return this[newProp] as unknown;
    }
    function setter (this: any, value_: any): void {
        if (DEV) {
            warnID(5401, obsoleted, newExpr);
        }
        this[newProp] = value_;
    }

    if (writable) {
        getset(object, oldProp, getter, setter);
    } else {
        get(object, oldProp, getter);
    }
}

/**
 * @en Deprecates some properties. It will print waring message if any deprecated property is accessed.
 * The warning message includes new property name to use.
 * @zh 废弃一组属性。如果被废弃属性还在使用的话，会打印警告消息。警告消息包含新的属性名。
 * @param obj @en The object or class of these properties to deprecate.
 *            @zh 被废弃属性的对象或者类。
 * @param objName @en The object name or class name of these properties to deprecate.
 *                @zh 被废弃属性的对象名或者类名。
 * @param props @en The property names to deprecate. @zh 被废弃的一组属性名。
 * @param writable @en Whether these properties are writable. @zh 被废弃的属性是否可写。
 */
export function obsoletes (obj, objName, props, writable): void {
    for (const obsoleted in props) {
        const newName = props[obsoleted];
        obsolete(obj, `${objName}.${obsoleted}`, newName, writable);
    }
}

const REGEXP_NUM_OR_STR = /(%d)|(%s)/;
const REGEXP_STR = /%s/;

/**
 * @en
 * A string tool to construct a string with format string.
 * @zh
 * 根据格式字符串构造一个字符串。
 * @param msg @en A JavaScript string containing zero or more substitution strings (%s).
 * @zh 包含有 0 个或者多个格式符的字符串。
 * @param subst @en JavaScript objects with which to replace substitution strings within msg.
 * @zh 替换 `msg` 里格式符的表达式。
 * @returns @en A new formatted string. @zh 格式化后的新字符串。
 * @example
 * ```
 * import { js } from 'cc';
 * js.formatStr("a: %s, b: %s", a, b);
 * js.formatStr(a, b, c);
 * ```
 */
export function formatStr (msg: string, ...subst: StringSubstitution[]): string;
/**
 * @en
 * A string tool to constructs a string from an arbitrary sequence of js object arguments.
 * @zh
 * 根据任意 js 对象参数序列构造一个字符串。
 * @returns @en A new formatted string. @zh 格式化后的新字符串。
 * @example
 * ```
 * import { js } from 'cc';
 * js.formatStr({}, null, undefined);  // [object Object] null undefined
 * ```
 */
export function formatStr (...data: unknown[]): string;
export function formatStr (msg: unknown, ...subst: unknown[]): string {
    if (arguments.length === 0) {
        return '';
    }
    if (subst.length === 0) {
        return `${msg}`;
    }

    const hasSubstitution = typeof msg === 'string' && REGEXP_NUM_OR_STR.test(msg);
    if (hasSubstitution) {
        for (const arg of subst) {
            const regExpToTest = typeof arg === 'number' ? REGEXP_NUM_OR_STR : REGEXP_STR;
            if (regExpToTest.test(msg as string)) {
                const notReplaceFunction = `${arg}`;
                msg = (msg as string).replace(regExpToTest, notReplaceFunction);
            } else {
                msg += ` ${arg}`;
            }
        }
    } else {
        for (const arg of subst) {
            msg += ` ${arg}`;
        }
    }
    return msg as string;
}

// see https://github.com/petkaantonov/bluebird/issues/1389
/**
 * @en Removes the first argument. @zh 移除第一个参数。
 * @returns @en An Array that contains all arguments except the first one.
 * @zh 新的参数数组，该数组不包含第一个参数。
 */
export function shiftArguments (): any[] {
    const len = arguments.length - 1;
    const args = new Array(len);
    for (let i = 0; i < len; ++i) {
        args[i] = arguments[i + 1];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return args;
}

/**
 * @en Gets a property descriptor by property name of an object or its prototypes.
 * @zh 根据属性名从一个对象或者它的原型链中获取属性描述符。
 * @param object @en The object to get property descriptor. @zh 获取描述符的对象。
 * @param propertyName @en The property name to get property descriptor.
 * @zh 获取属性描述符的属性名。
 * @returns @en A `PropertyDescriptor` instance or null if not found.
 * @zh 属性描述符对象。如果没找到的话，返回 null。
 */
export function getPropertyDescriptor (object: any, propertyName: string): PropertyDescriptor | null {
    while (object) {
        const pd = Object.getOwnPropertyDescriptor(object, propertyName);
        if (pd) {
            return pd;
        }
        object = Object.getPrototypeOf(object);
    }
    return null;
}

function _copyProp (name: string, source: any, target: any): void {
    const pd = getPropertyDescriptor(source, name);
    if (pd) {
        Object.defineProperty(target, name, pd);
    }
}

/**
 * @en Copies all properties except those in `excepts` from `source` to `target`.
 * @zh 把 `source` 的所有属性，除了那些定义在 `excepts`的属性，拷贝到 `target`。
 * @param source @en Source object to copy from. @zh 拷贝的源对象。
 * @param target @en Target object to copy to. @zh 拷贝到目标对象。
 * @param excepts @en Properties are not copied. @zh 不拷贝到属性。
 */
export function copyAllProperties (source: any, target: any, excepts: Array<string>): void {
    const propertyNames: Array<string> = Object.getOwnPropertyNames(source);
    for (let i = 0, len = propertyNames.length; i < len; ++i) {
        const propertyName: string = propertyNames[i];
        if (excepts.indexOf(propertyName) !== -1) {
            continue;
        }

        _copyProp(propertyName, source, target);
    }
}

/**
 * @en Copies all the properties in "sources" that are not defined in object from "sources" to "object".
 * @zh 将 "sources" 中的所有没在 object 定义的属性从 "sources" 复制到 "object"。
 * @param object @en Object to copy properties to. @zh 拷贝的目标对象。
 * @param sources @en Source objects to copy properties from. @zh 拷贝到源对象数组。
 * @return @en The passing `object` or a new object if passing object is not valid.
 * @zh 传入的对象。如果传入的对象无效或者没传入，将返回一个新对象。
 */
export function addon (object?: Record<string | number, any>, ...sources: any[]): Record<string | number, any> {
    object = object || {};
    for (let i = 0; i < sources.length; ++i) {
        const source = sources[i];
        if (source) {
            if (typeof source !== 'object') {
                errorID(5402, source as string);
                continue;
            }
            for (const name in source) {
                if (!(name in object)) {
                    _copyProp(name, source, object);
                }
            }
        }
    }
    return object;
}

/**
 * @en Copies all the properties in "sources" from "sources" to "object".
 * @zh 将 "sources" 中的所有属性从 "sources" 复制到 "object"。
 * @param object @en Object to copy properties to. @zh 拷贝的目标对象。
 * @param sources @en Source objects to copy properties from. @zh 拷贝到源对象数组。
 * @return @en The passing `object` or a new object if passing object is not valid.
 * @zh 传入的对象。如果传入的对象无效或者没传入，将返回一个新对象。
 */
export function mixin (object?: Record<string | number, any>, ...sources: any[]): Record<string | number, any> {
    object = object || {};
    for (let i = 0; i < sources.length; ++i) {
        const source = sources[i];
        if (source) {
            if (typeof source !== 'object') {
                errorID(5403, source as string);
                continue;
            }
            for (const name in source) {
                _copyProp(name, source, object);
            }
        }
    }
    return object;
}

/**
 * @en
 * Makes a class inherit from the supplied base class.
 * @zh
 * 将一个类型继承另一个类型。
 * @param cls @en The class to inherit. @zh 要继承的类。
 * @param base @en The class to inherit from. @zh 被继承的类。
 * @returns @en Passed in `cls`. @zh 传入的 `cls`。
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function extend (cls: Function, base: Function): Function | undefined {
    if (DEV) {
        if (!base) {
            errorID(5404);
            return;
        }
        if (!cls) {
            errorID(5405);
            return;
        }
        if (Object.keys(cls.prototype).length > 0) {
            errorID(5406);
        }
    }
    // eslint-disable-next-line no-prototype-builtins
    for (const p in base) { if (base.hasOwnProperty(p)) { cls[p] = base[p]; } }
    cls.prototype = Object.create(base.prototype, {
        constructor: {
            value: cls,
            writable: true,
            configurable: true,
        },
    });
    // eslint-disable-next-line consistent-return
    return cls;
}

/**
 * @en Get super class.
 * @zh 获取父类。
 * @param constructor @en The constructor to get super class.
 * @zh 要获取父类的构造函数。
 * @returns @en Super class. @zh 父类。
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function getSuper (constructor: Function): any {
    const proto = constructor.prototype; // bound function do not have prototype
    const dunderProto = proto && Object.getPrototypeOf(proto);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return dunderProto && dunderProto.constructor;
}

/**
 * @en
 * Checks whether a class is child of another class, or is the same type as another class.
 * @zh 判断一类型是否是另一类型的子类或本身。
 * @param subclass @en Sub class to check. @zh 子类类型。
 * @param superclass @en Super class to check. @zh 父类类型。
 * @return @en True if sub class is child of super class, or they are the same type. False else.
 * @zh 如果子类类型是父类类型的子类，或者二者是相同类型，那么返回 true，否则返回 false。
 */
export function isChildClassOf<T extends Constructor>(subclass: unknown, superclass: T): subclass is T;
export function isChildClassOf(subclass: unknown, superclass: unknown): boolean;
export function isChildClassOf (subclass: unknown, superclass: unknown): boolean {
    if (subclass && superclass) {
        if (typeof subclass !== 'function') {
            return false;
        }
        if (typeof superclass !== 'function') {
            if (DEV) {
                warnID(3625, superclass as string);
            }
            return false;
        }
        if (subclass === superclass) {
            return true;
        }
        for (; ;) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            subclass = getSuper(subclass as Function);
            if (!subclass) {
                return false;
            }
            if (subclass === superclass) {
                return true;
            }
        }
    }
    return false;
}

/**
 * @en Removes all enumerable properties from a object.
 * @zh 移除对象中所有可枚举属性.
 * @param object @en The object to remove enumerable properties from.
 * @zh 要删除可枚举属性的对象。
 */
export function clear (object: Record<string | number, any>): void {
    for (const key of Object.keys(object)) {
        delete object[key];
    }
}

function isTempClassId (id): boolean {
    return typeof id !== 'string' || id.startsWith(tempCIDGenerator.prefix);
}

// id registration
/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export const _idToClass: Record<string, Constructor> = createMap(true);
/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export const _nameToClass: Record<string, Constructor> = createMap(true);

function setup (tag: string, table: Record<string | number, any>, allowExist: boolean): (id: string, constructor: Constructor) => void {
    return function (id: string, constructor: Constructor): void {
        // deregister old
        // eslint-disable-next-line no-prototype-builtins
        if (constructor.prototype.hasOwnProperty(tag)) {
            delete table[constructor.prototype[tag]];
        }
        value(constructor.prototype, tag, id);
        // register class
        if (id) {
            const registered = table[id];
            if (!allowExist && registered && registered !== constructor) {
                let detail = '';
                if (TEST) {
                    // eslint-disable-next-line no-multi-str
                    detail += ' (This may be caused by error of unit test.) \
If you dont need serialization, you can set class id to "". You can also call \
js.unregisterClass to remove the id of unused class';
                }
                errorID(16334, tag, id, detail);
            } else {
                table[id] = constructor;
            }
            // if (id === "") {
            //    console.trace("", table === _nameToClass);
            // }
        }
    };
}

/**
 * @en
 * Register the class by specified id, if its classname is not defined, the class name will also be set.
 * @zh
 * 通过 id 注册类型
 * @method _setClassId
 * @param classId
 * @param constructor
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export const _setClassId = setup('__cid__', _idToClass, false);

const doSetClassName = setup('__classname__', _nameToClass, true);

/**
 * @en Registers a class by specified name manually.
 * @zh 通过指定的名称手动注册类型
 * @param className @en Class name to register. @zh 注册的类名。
 * @param constructor @en Constructor to register. @zh 注册的构造函数。
 */
export function setClassName (className: string, constructor: Constructor): void {
    doSetClassName(className, constructor);
    // auto set class id
    // eslint-disable-next-line no-prototype-builtins
    if (!constructor.prototype.hasOwnProperty(classIdTag)) {
        const id = className || tempCIDGenerator.getNewId();
        if (id) {
            _setClassId(id, constructor);
        }
    }
}

/**
 * @en Sets an alias for a class.
 * After executing `setClassAlias(target, alias)`, `alias` will be a single way short cut for class `target`.
 * `js.getClassByName(alias)` and `getClassById(alias)` will return `target`. But `js.getClassName(target)`
 * will return the original class name of `target`, not the alias.
 * @zh 为类设置别名。执行 `setClassAlias(target, alias)` 后，`alias` 将作为类 `target` 的 “单向 ID” 和 “单向名称”。
 * 因此，`getClassById(alias)` 和 `getClassByName(alias)` 都会得到 `target`。这种映射是单向的，这意味着 `getClassName(target)`
 * 和 `getClassId(target)` 将不会返回 `alias`。
 * @param target @en Constructor of a class to set an alias. @zh 设置别名的类的构造函数。
 * @param alias @en Alias to set. The name shall not have been set as class name or alias of another class.
 * @zh 类的别名。别名不能重复，也不能是已有类的名字。
 */
export function setClassAlias (target: Constructor, alias: string): void {
    const nameRegistry = _nameToClass[alias];
    const idRegistry = _idToClass[alias];
    let ok = true;
    if (nameRegistry && nameRegistry !== target) {
        errorID(16335, alias);
        ok = false;
    }
    if (idRegistry && idRegistry !== target) {
        errorID(16336, alias);
        ok = false;
    }
    if (ok) {
        let classAliases = target[aliasesTag];
        if (!classAliases) {
            classAliases = [];
            target[aliasesTag] = classAliases;
        }
        classAliases.push(alias);
        _nameToClass[alias] = target;
        _idToClass[alias] = target;
    }
}

/**
 * @en
 * Unregister some classes from engine.
 * If you don't need a registered class anymore, you should unregister the class or engine will keep its reference.
 * Please note that it‘s your responsibility to remove other references to the class.
 * @zh
 * 取消注册类型。如果你不再需要一个注册的类，你应该取消注册这个类，否则引擎会还有对它的引用。
 * 请注意，你仍然有责任释放其他地方对该类的引用。
 *
 * @param ...constructor @en The classes to unregister. @zh 取消注册的类型列表。
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function unregisterClass (...constructors: Function[]): void {
    for (const constructor of constructors) {
        const p = constructor.prototype;
        const classId = p[classIdTag];
        if (classId) {
            delete _idToClass[classId];
        }
        const classname = p[classNameTag];
        if (classname) {
            delete _nameToClass[classname];
        }
        const aliases = p[aliasesTag];
        if (aliases) {
            for (let iAlias = 0; iAlias < aliases.length; ++iAlias) {
                const alias = aliases[iAlias];
                delete _nameToClass[alias];
                delete _idToClass[alias];
            }
        }
    }
}

/**
 * @en Gets a registered class by id.
 * @zh 通过 id 获取已注册的类型。
 * @param classId @en An id to get class.
 * @return constructor
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 * Please use `getClassById()` instead.
 */
export function _getClassById (classId): Constructor<unknown> {
    return getClassById(classId);
}

/**
 * @en Gets the registered class by id.
 * @zh 通过 id 获取已注册的类型。
 * @param classId @en The class id used to get class. @zh 获取类的 id。
 * @returns @en The constructor of the registered class. @zh 注册的类构造函数。
 */
export function getClassById (classId): Constructor<unknown> {
    return _idToClass[classId];
}

/**
 * @en
 * Gets the registered class by class name.
 * @zh
 * 通过类名获取已注册的类型。
 * @param classname @en The class name used to get class. @zh 获取类的类名。
 * @returns @en The constructor of the registered class. @zh 注册的类构造函数。
 */
export function getClassByName (classname): Constructor<unknown> {
    return _nameToClass[classname];
}

/**
 * @en
 * Get class id of the object
 * @zh
 * 获取对象的 class id
 * @param obj - instance or constructor
 * @param [allowTempId = true]   - can return temp id in editor
 * @return
 * @deprecated since v3.5.0. this is an engine private interface that will be removed in the future.
 * Please use `getClassId()` instead.
 */
export function _getClassId (obj, allowTempId?: boolean): string {
    return getClassId(obj, allowTempId);
}

/**
 * @en
 * Gets class id of an object
 * @zh
 * 获取对象的 class id。
 * @param obj @en An object instance to get class id. @zh 获取类标识的对象。
 * @param allowTempId @en Whether allow to return a temple class id in editor.
 * @zh 在编辑器时，是否允许返回一个临时的类标识。
 * @returns @en Class id if found, empty string else.
 * @zh 找到的类标识。如果没找到的话，返回空字符串。
 */
export function getClassId (obj, allowTempId?: boolean): string {
    allowTempId = (typeof allowTempId !== 'undefined' ? allowTempId : true);

    let res;
    // eslint-disable-next-line no-prototype-builtins
    if (typeof obj === 'function' && obj.prototype.hasOwnProperty(classIdTag)) {
        res = obj.prototype[classIdTag];
        if (!allowTempId && (DEV || EDITOR) && isTempClassId(res)) {
            return '';
        }
        return res as string;
    }
    if (obj && obj.constructor) {
        const prototype = obj.constructor.prototype;
        // eslint-disable-next-line no-prototype-builtins
        if (prototype && prototype.hasOwnProperty(classIdTag)) {
            res = obj[classIdTag];
            if (!allowTempId && (DEV || EDITOR) && isTempClassId(res)) {
                return '';
            }
            return res as string;
        }
    }
    return '';
}
