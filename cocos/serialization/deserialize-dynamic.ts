/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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

import { EDITOR, TEST, DEV, DEBUG, JSB, PREVIEW, SUPPORT_JIT } from 'internal:constants';
import { cclegacy, js, misc, CCClass, ENUM_TAG, BITMASK_TAG, sys, error, assertIsTrue, CustomSerializable, DeserializationContext, deserializeTag, SerializationInput, errorID } from '../core';
import { MissingScript } from '../misc/missing-script';
import { Details } from './deserialize';
import { Platform } from '../../pal/system-info/enum-type';
import type { deserialize, CCClassConstructor } from './deserialize';
import { CCON } from './ccon';
import { Asset } from '../asset/assets';

function compileObjectTypeJit (
    sources: string[],
    defaultValue: unknown,
    accessorToSet: string,
    propNameLiteralToSet: string,
    assumeHavePropIfIsValue: boolean,
): void {
    if (defaultValue instanceof cclegacy.ValueType) {
        // fast case
        if (!assumeHavePropIfIsValue) {
            sources.push('if(prop){');
        }
        const ctorCode = js.getClassName(defaultValue);
        sources.push(`s._deserializeFastDefinedObject(o${accessorToSet},prop,${ctorCode});`);
        if (!assumeHavePropIfIsValue) {
            sources.push(`}else o${accessorToSet}=null;`);
        }
    } else {
        sources.push(`
if (prop) {
    s._deserializeAndAssignField(o, prop, ${propNameLiteralToSet});
} else {
    o${accessorToSet}=null;
}
`);
    }
}

type ReportMissingClass = deserialize.ReportMissingClass;

type ClassFinder = deserialize.ClassFinder;

type SerializableClassConstructor = deserialize.SerializableClassConstructor;

export type CompiledDeserializeFn = (
    deserializer: _Deserializer,
    object: Record<string, unknown>,
    deserialized: Record<string, unknown>,
    constructor: AnyFunction,
) => void;

const compileDeserialize = SUPPORT_JIT ? compileDeserializeJIT : compileDeserializeNative;

const DELIMITER = CCClass.Attr.DELIMETER;
const POSTFIX_TYPE: `${typeof DELIMITER}type` = `${DELIMITER}type`;
const POSTFIX_EDITOR_ONLY: `${typeof DELIMITER}editorOnly` = `${DELIMITER}editorOnly`;
const POSTFIX_DEFAULT: `${typeof DELIMITER}default` = `${DELIMITER}default`;
const POSTFIX_FORMERLY_SERIALIZED_AS: `${typeof DELIMITER}formerlySerializedAs` = `${DELIMITER}formerlySerializedAs`;
type AttributeName = string;
type AttributeFormerlySerializedAs = `${AttributeName}${typeof POSTFIX_FORMERLY_SERIALIZED_AS}`;
type AttributeDefault = `${AttributeName}${typeof POSTFIX_DEFAULT}`;
type AttributeType = `${AttributeName}${typeof POSTFIX_TYPE}`;
type AttributeEditorOnly = `${AttributeName}${typeof POSTFIX_EDITOR_ONLY}`;
interface AttrResult {
    [K: string]: typeof K extends AttributeFormerlySerializedAs ? string :
        typeof K extends AttributeDefault ? unknown :
        typeof K extends AttributeType ? AnyFunction :
        typeof K extends AttributeEditorOnly ? boolean : never;
}

function compileDeserializeJIT (self: _Deserializer, klass: CCClassConstructor<unknown>): CompiledDeserializeFn {
    const attrs: AttrResult = CCClass.Attr.getClassAttrs(klass);

    const props = klass.__values__;
    // self, obj, serializedData, klass
    const sources = [
        'var prop;',
    ];
    const fastMode = canBeDeserializedInFastMode(klass);
    // sources.push('var vb,vn,vs,vo,vu,vf;');    // boolean, number, string, object, undefined, function

    for (let p = 0; p < props.length; p++) {
        const propName = props[p];
        if ((PREVIEW || (EDITOR && self.ignoreEditorOnly)) && attrs[propName + POSTFIX_EDITOR_ONLY]) {
            continue;   // skip editor only if in preview
        }

        let accessorToSet: string;
        let propNameLiteralToSet: string;
        if (CCClass.IDENTIFIER_RE.test(propName)) {
            propNameLiteralToSet = `"${propName}"`;
            accessorToSet = `.${propName}`;
        } else {
            propNameLiteralToSet = CCClass.escapeForJS(propName);
            accessorToSet = `[${propNameLiteralToSet}]`;
        }

        let accessorToGet = accessorToSet;
        if (attrs[propName + POSTFIX_FORMERLY_SERIALIZED_AS]) {
            const propNameToRead = attrs[propName + POSTFIX_FORMERLY_SERIALIZED_AS] as string;
            if (CCClass.IDENTIFIER_RE.test(propNameToRead)) {
                accessorToGet = `.${propNameToRead}`;
            } else {
                accessorToGet = `[${CCClass.escapeForJS(propNameToRead)}]`;
            }
        }

        sources.push(`prop=d${accessorToGet};`);
        sources.push(`if(typeof ${JSB ? '(prop)' : 'prop'}!=="undefined"){`);

        // function undefined object(null) string boolean number
        const defaultValue = CCClass.getDefault(attrs[propName + POSTFIX_DEFAULT]);
        const userType = attrs[propName + POSTFIX_TYPE] as AnyFunction | string | undefined;
        if (fastMode && (defaultValue !== undefined || userType)) {
            const isPrimitiveTypeInFastMode = isPrimitivePropertyByDefaultOrType(defaultValue, userType);
            if (isPrimitiveTypeInFastMode) {
                sources.push(`o${accessorToSet}=prop;`);
            } else {
                compileObjectTypeJit(sources, defaultValue, accessorToSet, propNameLiteralToSet, true);
            }
        } else {
            sources.push(`${`if(typeof ${JSB ? '(prop)' : 'prop'}!=="object"){`
                             + 'o'}${accessorToSet}=prop;`
                         + `}else{`);
            compileObjectTypeJit(sources, defaultValue, accessorToSet, propNameLiteralToSet, false);
            sources.push('}');
        }
        sources.push('}');
    }
    if (js.isChildClassOf(klass, cclegacy.Node) || js.isChildClassOf(klass, cclegacy.Component)) {
        if (PREVIEW || (EDITOR && self.ignoreEditorOnly)) {
            const mayUsedInPersistRoot = js.isChildClassOf(klass, cclegacy.Node);
            if (mayUsedInPersistRoot) {
                sources.push('d._id&&(o._id=d._id);');
            }
        } else {
            sources.push('d._id&&(o._id=d._id);');
        }
    }
    if (props[props.length - 1] === '_$erialized') {
        // deep copy original serialized data
        sources.push('o._$erialized=JSON.parse(JSON.stringify(d));');
        // parse the serialized data as primitive javascript object, so its __id__ will be dereferenced
        sources.push('s._fillPlainObject(o._$erialized,d);');
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return Function('s', 'o', 'd', 'k', sources.join('')) as CompiledDeserializeFn;
}

function compileDeserializeNative (_self: _Deserializer, klass: CCClassConstructor<unknown>): CompiledDeserializeFn {
    const fastMode = canBeDeserializedInFastMode(klass);
    const shouldCopyId = js.isChildClassOf(klass, cclegacy.Node) || js.isChildClassOf(klass, cclegacy.Component);
    let shouldCopyRawData = false;

    const simpleProps: string[] = [];
    let simplePropsToRead = simpleProps;
    const advancedProps: string[] = [];
    let advancedPropsToRead = advancedProps;
    const advancedPropsValueType: any = [];

    ((): void => {
        const props: string[] = klass.__values__;
        shouldCopyRawData = props[props.length - 1] === '_$erialized';

        const attrs = CCClass.Attr.getClassAttrs(klass);

        for (let p = 0; p < props.length; p++) {
            const propName = props[p];
            let propNameToRead = propName;
            if (attrs[propName + POSTFIX_FORMERLY_SERIALIZED_AS]) {
                propNameToRead = attrs[propName + POSTFIX_FORMERLY_SERIALIZED_AS];
            }
            // function undefined object(null) string boolean number
            const defaultValue = CCClass.getDefault(attrs[propName + POSTFIX_DEFAULT]);
            const userType = attrs[propName + POSTFIX_TYPE] as AnyFunction | string | undefined;
            let isPrimitiveTypeInFastMode = false;
            if (fastMode && (defaultValue !== undefined || userType)) {
                isPrimitiveTypeInFastMode = isPrimitivePropertyByDefaultOrType(defaultValue, userType);
            }
            if (isPrimitiveTypeInFastMode) {
                if (propNameToRead !== propName && simplePropsToRead === simpleProps) {
                    simplePropsToRead = simpleProps.slice();
                }
                simpleProps.push(propName);
                if (simplePropsToRead !== simpleProps) {
                    simplePropsToRead.push(propNameToRead);
                }
            } else {
                if (propNameToRead !== propName && advancedPropsToRead === advancedProps) {
                    advancedPropsToRead = advancedProps.slice();
                }
                advancedProps.push(propName);
                if (advancedPropsToRead !== advancedProps) {
                    advancedPropsToRead.push(propNameToRead);
                }
                advancedPropsValueType.push((defaultValue instanceof cclegacy.ValueType) && defaultValue.constructor);
            }
        }
    })();

    return (s, o, d, k): void => {
        for (let i = 0; i < simpleProps.length; ++i) {
            const prop = d[simplePropsToRead[i]];
            if (prop !== undefined) {
                o[simpleProps[i]] = prop;
            }
        }
        for (let i = 0; i < advancedProps.length; ++i) {
            const propName = advancedProps[i];
            const prop = d[advancedPropsToRead[i]];
            if (prop === undefined) {
                continue;
            }
            if (!fastMode && typeof prop !== 'object') {
                o[propName] = prop;
            } else {
                // fastMode (so will not simpleProp) or object
                const valueTypeCtor = advancedPropsValueType[i];
                if (valueTypeCtor) {
                    if (fastMode || prop) {
                        s._deserializeFastDefinedObject(o[propName] as Record<PropertyKey, unknown>, prop as SerializedGeneralTypedObject, valueTypeCtor);
                    } else {
                        o[propName] = null;
                    }
                } else if (prop) {
                    s._deserializeAndAssignField(o, prop, propName);
                } else {
                    o[propName] = null;
                }
            }
        }
        if (shouldCopyId && d._id) {
            o._id = d._id;
        }
        if (shouldCopyRawData) {
            // deep copy original serialized data
            o._$erialized = JSON.parse(JSON.stringify(d));
            // parse the serialized data as primitive javascript object, so its __id__ will be dereferenced
            s._fillPlainObject(o._$erialized as Record<PropertyKey, unknown>, d);
        }
    };
}

/**
 * Tells if the class can be deserialized in "fast mode".
 * In fast mode, deserialization of the class will go into an optimized way:
 * each class property will be examined whether to be primitive according to their default value
 * and type. Finally, all primitive properties would be together deserialized using simple assignment,
 * without performing in-loop check.
 */
function canBeDeserializedInFastMode (klass: any): boolean {
    return misc.BUILTIN_CLASSID_RE.test(js.getClassId(klass));
}

function isPrimitivePropertyByDefaultOrType (defaultValue: any, userType: any): boolean {
    if (defaultValue === undefined) {
        return userType instanceof CCClass.Attr.PrimitiveType || userType === ENUM_TAG || userType === BITMASK_TAG;
    } else {
        const defaultType = typeof defaultValue;
        return defaultType === 'string'
                          || defaultType === 'number'
                          || defaultType === 'boolean';
    }
}

type TypedArrayViewConstructorName =
    | 'Uint8Array' | 'Int8Array'
    | 'Uint16Array' | 'Int16Array'
    | 'Uint32Array' | 'Int32Array'
    | 'Float32Array' | 'Float64Array';

interface SerializedTypedArray {
    __id__: never;
    __uuid__: never;
    __type__: 'TypedArray';
    array: number[];
    ctor: TypedArrayViewConstructorName;
}

interface SerializedTypedArrayRef {
    __id__: never;
    __uuid__: never;
    __type__: 'TypedArrayRef';
    ctor: TypedArrayViewConstructorName;
    offset: number;
    length: number;
}

type SerializedGeneralTypedObject = {
    __id__: never;
    __uuid__: never;
    __type__?: NotKnownTypeTag;
} & Record<NotTypeTag, SerializedFieldValue>;

interface SerializedObjectReference {
    __type__: never;
    __uuid__: never;
    __id__: number;
}

interface SerializedUUIDReference {
    __type__: never;
    __id__: never;
    __uuid__: string;
    __expectedType__: string;
}

type SerializedObject = SerializedTypedArray | SerializedTypedArrayRef | SerializedGeneralTypedObject;

type SerializedValue = SerializedObject | SerializedValue[] | string | number | boolean | null;

type SerializedPropertyKey = string | number;

type SerializedFieldObjectValue = SerializedObjectReference | SerializedUUIDReference | unknown;

type SerializedFieldValue = string | number | boolean | null | SerializedFieldObjectValue;

type NotA<T, ReservedNames> = T extends ReservedNames ? never : T;

type NotB<T, ReservedNames> = ReservedNames extends T ? never : T;

type FooName<T, ReservedNames> = NotA<T, ReservedNames> & NotB<T, ReservedNames>

type NotTypeTag = FooName<string, '__type__'>;

type NotKnownTypeTag = FooName<string, 'TypedArray' | 'TypedArrayRef'>;

type SerializedData = SerializedObject | SerializedObject[];

class DeserializerPool extends js.Pool<_Deserializer> {
    constructor () {
        super((deserializer: _Deserializer) => {
            deserializer.clear();
        }, 1);
    }
}

// TODO: this is should be a HACK, we've changed the method signature
// issue: https://github.com/cocos/cocos-engine/issues/14642
(DeserializerPool.prototype as any).get = function (
    this: DeserializerPool,
    details: Details,
    classFinder: ClassFinder,
    reportMissingClass: ReportMissingClass,
    customEnv: unknown,
    ignoreEditorOnly: boolean | undefined,
): _Deserializer {
    const cache = this._get();
    if (cache) {
        cache.reset(details, classFinder, reportMissingClass, customEnv, ignoreEditorOnly);
        return cache;
    } else {
        return new _Deserializer(details, classFinder, reportMissingClass, customEnv, ignoreEditorOnly);
    }
};

class _Deserializer {
    public static pool: DeserializerPool = new DeserializerPool();

    public declare result: Details;
    public declare customEnv: unknown;
    public deserializedList: Array<Record<PropertyKey, unknown> | undefined> = [];
    public deserializedData: any = null;
    private declare _classFinder: ClassFinder;
    private declare _reportMissingClass: ReportMissingClass;
    private declare _onDereferenced: ClassFinder['onDereferenced'];
    /**
     * @engineInternal
     */
    public get ignoreEditorOnly (): unknown { return this._ignoreEditorOnly; }
    private declare _ignoreEditorOnly: unknown;
    private declare _mainBinChunk: Uint8Array;
    private declare _serializedData: SerializedObject | SerializedObject[];
    private declare _context: DeserializationContext;

    constructor (result: Details, classFinder: ClassFinder, reportMissingClass: ReportMissingClass, customEnv: unknown, ignoreEditorOnly: unknown) {
        this.result = result;
        this.customEnv = customEnv;
        this._classFinder = classFinder;
        this._reportMissingClass = reportMissingClass;
        this._onDereferenced = classFinder?.onDereferenced;
        if (DEV) {
            this._ignoreEditorOnly = ignoreEditorOnly;
        }
    }

    public reset (result: Details, classFinder: ClassFinder, reportMissingClass: ReportMissingClass, customEnv: unknown, ignoreEditorOnly: unknown): void {
        this.result = result;
        this.customEnv = customEnv;
        this._classFinder = classFinder;
        this._reportMissingClass = reportMissingClass;
        this._onDereferenced = classFinder?.onDereferenced;
        if (DEV) {
            this._ignoreEditorOnly = ignoreEditorOnly;
        }
    }

    public clear (): void {
        this.result = null!;
        this.customEnv = null;
        this.deserializedList.length = 0;
        this.deserializedData = null;
        this._classFinder = null!;
        this._reportMissingClass = null!;
        this._onDereferenced = null!;
    }

    public deserialize (serializedData: SerializedData | CCON): any {
        let fromCCON = false;
        let jsonObj: SerializedData;
        if (serializedData instanceof CCON) {
            fromCCON = true;
            jsonObj = serializedData.document as SerializedData;
            if (serializedData.chunks.length > 0) {
                assertIsTrue(serializedData.chunks.length === 1);
                this._mainBinChunk = serializedData.chunks[0];
            }
        } else {
            jsonObj = serializedData;
        }

        this._serializedData = jsonObj;
        this._context = {
            fromCCON,
        };

        const serializedRootObject = Array.isArray(jsonObj) ? jsonObj[0] : jsonObj;

        if (EDITOR || TEST) {
            this.deserializedData = this._deserializeObject(serializedRootObject, 0, this.deserializedList, `${0}`);
        } else {
            this.deserializedData = this._deserializeObject(serializedRootObject, 0);
        }

        this._serializedData = undefined!;
        this._mainBinChunk = undefined!;
        this._context = undefined!;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.deserializedData;
    }

    /**
     * @param serialized - The object to deserialize, must be non-nil.
     * @param globalIndex - If the object is deserialized from "root objects" array.
     * @param owner - Tracing purpose.
     * @param propName - Tracing purpose.
     */
    private _deserializeObject (
        serialized: SerializedObject,
        globalIndex: number,
        owner?: Record<PropertyKey, unknown> | unknown[],
        propName?: string,
    ): Record<string, any> | null {
        switch (serialized.__type__) {
        case 'TypedArray':
            return this._deserializeTypedArrayView(serialized);
        case 'TypedArrayRef':
            return this._deserializeTypedArrayViewRef(serialized);
        default:
            // NOTE: when 'strictNullCheck' is false, TS can't infer serialized as SerializedGeneralTypedObject
            if ((serialized as unknown as SerializedGeneralTypedObject).__type__) { // Typed object (including CCClass)
                return this._deserializeTypeTaggedObject(serialized, globalIndex, owner, propName);
            } else if (!Array.isArray(serialized)) { // Embedded primitive javascript object
                return this._deserializePlainObject(serialized);
            } else { // Array
                return this._deserializeArray(serialized);
            }
        }
    }

    private _deserializeTypedArrayView (value: SerializedTypedArray): Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array {
        return globalThis[value.ctor].from(value.array);
    }

    private _deserializeTypedArrayViewRef (value: SerializedTypedArrayRef): Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array {
        const { offset, length, ctor: constructorName } = value;
        const obj = new globalThis[constructorName](
            this._mainBinChunk.buffer,
            this._mainBinChunk.byteOffset + offset,
            length,
        );
        return obj;
    }

    private _deserializeArray (value: SerializedValue[]): unknown[] {
        const obj = new Array<unknown>(value.length);
        let prop: unknown;
        for (let i = 0; i < value.length; i++) {
            prop = value[i];
            if (typeof prop === 'object' && prop) {
                const isAssetType = this._deserializeAndAssignField(obj, prop, `${i}`);
                if (isAssetType) {
                    // fill default value for primitive objects (no constructor)
                    obj[i] = null;
                }
            } else {
                obj[i] = prop;
            }
        }
        return obj;
    }

    private _deserializePlainObject (value: Record<string, unknown>): Record<string, any> {
        const obj = {};
        this._fillPlainObject(obj, value);
        return obj;
    }

    private _deserializeTypeTaggedObject (
        value: SerializedGeneralTypedObject,
        globalIndex: number,
        owner?: Record<PropertyKey, unknown> | unknown[],
        propName?: string,
    ): Record<string, unknown> | null {
        const type = value.__type__ as unknown as string;

        const klass = this._classFinder(type, value, owner, propName);
        if (!klass) {
            const notReported = this._classFinder === js.getClassById;
            if (notReported) {
                this._reportMissingClass(type);
            }
            return null;
        }

        const createObject = (constructor: deserialize.SerializableClassConstructor): Record<string, unknown> => {
            // eslint-disable-next-line new-cap
            const obj = new constructor() as Record<string, unknown>;
            if (globalIndex >= 0) {
                this.deserializedList[globalIndex] = obj;
            }
            return obj;
        };

        if (!(EDITOR && js.isChildClassOf(klass, cclegacy.Component))) {
            const obj = createObject(klass);
            this._deserializeInto(value, obj, klass);
            return obj;
        } else {
            try {
                const obj = createObject(klass);
                this._deserializeInto(value, obj, klass);
                return obj;
            } catch (e: unknown) {
                if (DEBUG) {
                    error(`Deserialize ${klass.name} failed, ${(e as { stack: string; }).stack}`);
                }
                const obj = createObject(MissingScript);
                this._deserializeInto(value, obj, MissingScript);
                return obj;
            }
        }
    }

    private _deserializeInto (
        value: SerializedGeneralTypedObject,
        object: Record<PropertyKey, unknown>,
        constructor: deserialize.SerializableClassConstructor,
        skipCustomized = false,
    ): void {
        if (!skipCustomized && (object as Partial<CustomSerializable>)[deserializeTag]) {
            this._runCustomizedDeserialize(
                value,
                object as Record<PropertyKey, unknown> & CustomSerializable,
                constructor,
            );
            return;
        }

        interface ClassicCustomizedDeserializable { _deserialize: (content: unknown, deserializer: _Deserializer) => void; }
        if ((object as Partial<ClassicCustomizedDeserializable>)._deserialize) {
            // TODO: content check?
            (object as Partial<ClassicCustomizedDeserializable>)._deserialize!((value as unknown as { content: unknown }).content, this);
            return;
        }

        if (cclegacy.Class._isCCClass(constructor)) {
            this._deserializeFireClass(object, value, constructor as CCClassConstructor<unknown>);
        } else {
            this._deserializeFastDefinedObject(object, value, constructor);
        }
    }

    private _runCustomizedDeserialize (
        value: SerializedGeneralTypedObject,
        object: Record<PropertyKey, unknown> & CustomSerializable,
        constructor: deserialize.SerializableClassConstructor,
    ): void {
        const serializationInput: SerializationInput = {
            readProperty: (name: string) => {
                const serializedField = value[name];
                if (typeof serializedField !== 'object' || !serializedField) {
                    return serializedField as unknown;
                } else {
                    return this._deserializeObjectField(serializedField) as unknown;
                }
            },

            readThis: () => {
                this._deserializeInto(value, object, constructor, true);
            },

            readSuper: () => {
                const superConstructor = js.getSuper(constructor);
                if (superConstructor) {
                    this._deserializeInto(value, object, superConstructor);
                }
            },
        };

        object[deserializeTag]!(serializationInput, this._context);
    }

    private _deserializeFireClass (obj: Record<PropertyKey, unknown>, serialized: SerializedGeneralTypedObject, klass: CCClassConstructor<unknown>): void {
        let deserialize: CompiledDeserializeFn;
        // eslint-disable-next-line no-prototype-builtins
        if (klass.hasOwnProperty('__deserialize__')) {
            deserialize = klass.__deserialize__ as CompiledDeserializeFn;
        } else {
            deserialize = compileDeserialize(this, klass);

            // DEBUG: Check MissingScript data for issue 9878
            try {
                if (klass === MissingScript) {
                    const props: string[] = klass.__values__;
                    if (props.length === 0 || props[props.length - 1] !== '_$erialized') {
                        errorID(16341);
                        errorID(16342, props.join(', '));
                        // props.push('_$erialized');
                    }

                    const rawDeserialize: CompiledDeserializeFn = deserialize;
                    deserialize = function (
                        deserializer: _Deserializer,
                        object: Record<string, unknown>,
                        deserialized: Record<string, unknown>,
                        constructor: AnyFunction,
                    ): void {
                        rawDeserialize(deserializer, object, deserialized, constructor);
                        if (!object._$erialized) {
                            errorID(16343, JSON.stringify(deserialized));
                        }
                    };
                }
            } catch (e) {
                errorID(16344, `${e}`);
            }

            js.value(klass, '__deserialize__', deserialize, true);
        }
        deserialize(this, obj, serialized, klass);
    }

    /**
     * @engineInternal
     */
    public _deserializeAndAssignField (
        obj: Record<PropertyKey, unknown> | unknown[],
        serializedField: SerializedFieldObjectValue,
        propName: string,
    ): boolean {
        const id = (serializedField as Partial<SerializedObjectReference>).__id__;
        if (typeof id === 'number') {
            const field = this.deserializedList[id];
            if (field) {
                obj[propName] = field;
            } else {
                // TODO: assertion
                const source = (this._serializedData as SerializedObject[])[id];
                if (EDITOR || TEST) {
                    obj[propName] = this._deserializeObject(source, id, obj, propName);
                } else {
                    obj[propName] = this._deserializeObject(source, id, undefined, propName);
                }
                this._onDereferenced?.(this.deserializedList, id, obj, propName);
            }
        } else {
            const uuid = (serializedField as Partial<SerializedUUIDReference>).__uuid__;
            if (uuid) {
                const expectedType = (serializedField as SerializedUUIDReference).__expectedType__;
                this.result.push(obj, propName, uuid, expectedType);
            } else if (EDITOR || TEST) {
                obj[propName] = this._deserializeObject(serializedField as SerializedObject, -1, obj, propName);
            } else {
                obj[propName] = this._deserializeObject(serializedField as SerializedObject, -1);
            }
        }
        return false;
    }

    private _deserializeObjectField (serializedField: SerializedFieldObjectValue): Record<string, any> | null {
        const id = (serializedField as Partial<SerializedObjectReference>).__id__;
        if (typeof id === 'number') {
            const field = this.deserializedList[id];
            if (field) {
                return field;
            } else {
                // TODO: assertion
                const source = (this._serializedData as SerializedObject[])[id];
                const field = this._deserializeObject(source, id, undefined, undefined);
                return field;
            }
        } else {
            const uuid = (serializedField as Partial<SerializedUUIDReference>).__uuid__;
            if (uuid) {
                const _expectedType = (serializedField as SerializedUUIDReference).__expectedType__;
                throw new Error(`Asset reference field serialization is currently not supported in custom serialization.`);
            } else {
                return this._deserializeObject(serializedField as SerializedObject, -1);
            }
        }
    }

    /**
     * @engineInternal
     */
    public _fillPlainObject (instance: Record<string, unknown>, serialized: Record<string, unknown>): void {
        for (const propName in serialized) {
            // eslint-disable-next-line no-prototype-builtins
            if (!serialized.hasOwnProperty(propName)) {
                continue;
            }
            const prop = serialized[propName];
            if (typeof prop !== 'object') {
                if (propName !== '__type__'/* && k != '__id__' */) {
                    instance[propName] = prop;
                }
            } else if (prop) {
                const isAssetType = this._deserializeAndAssignField(instance, prop, propName);
                if (isAssetType) {
                    // fill default value for primitive objects (no constructor)
                    instance[propName] = null;
                }
            } else {
                instance[propName] = null;
            }
        }
    }

    /**
     * @engineInternal
     */
    public _deserializeFastDefinedObject (
        instance: Record<PropertyKey, unknown>,
        serialized: SerializedGeneralTypedObject,
        klass: SerializableClassConstructor,
    ): void {
        if (klass === cclegacy.Vec2) {
            interface SerializedVec2 { x?: number; y?: number; }
            instance.x = (serialized as SerializedVec2).x || 0;
            instance.y = (serialized as SerializedVec2).y || 0;
            return;
        } else if (klass === cclegacy.Vec3) {
            interface SerializedVec3 { x?: number; y?: number; z?: number; }
            instance.x = (serialized as SerializedVec3).x || 0;
            instance.y = (serialized as SerializedVec3).y || 0;
            instance.z = (serialized as SerializedVec3).z || 0;
            return;
        } else if (klass === cclegacy.Color) {
            interface SerializedColor { r?: number; g?: number; b?: number; a?: number; }
            instance.r = (serialized as SerializedColor).r || 0;
            instance.g = (serialized as SerializedColor).g || 0;
            instance.b = (serialized as SerializedColor).b || 0;
            const a = (serialized as SerializedColor).a;
            instance.a = (a === undefined ? 255 : a);
            return;
        } else if (klass === cclegacy.Size) {
            interface SerializedSize { width?: number; height?: number; }
            instance.width = (serialized as SerializedSize).width || 0;
            instance.height = (serialized as SerializedSize).height || 0;
            return;
        }

        const attrs = CCClass.Attr.getClassAttrs(klass);
        // TODO: `__values__` is injected property
        // issue: https://github.com/cocos/cocos-engine/issues/14642
        const props: string[] = (klass as any).__values__;
        if (DEBUG && !props) {
            error(`Unable to deserialize ${js.getClassName(klass)}. `
                + 'For non-CCClass types, they can only be marked as serializable by `CCClass.fastDefine`.');
        }

        for (let i = 0; i < props.length; i++) {
            const propName: string = props[i];
            let value = serialized[propName];
            // eslint-disable-next-line no-prototype-builtins
            const exists: boolean = (value !== undefined || serialized.hasOwnProperty(propName));
            if (!exists) {
                // not serialized,
                // recover to default value in ValueType, because eliminated properties equals to
                // its default value in ValueType, not default value in user class
                value = CCClass.getDefault(attrs[propName + POSTFIX_DEFAULT]);
            }

            if (typeof value !== 'object') {
                instance[propName] = value;
            } else if (value) {
                this._deserializeAndAssignField(instance, value, propName);
            } else {
                instance[propName] = null;
            }
        }
    }
}

export interface DeserializeDynamicOptions {
    classFinder?: ClassFinder;
    ignoreEditorOnly?: boolean;
    createAssetRefs?: boolean;
    customEnv?: unknown;
    reportMissingClass?: ReportMissingClass;
}

export function deserializeDynamic (data: SerializedData | CCON, details: Details, options?: DeserializeDynamicOptions): any {
    options = options || {};
    const classFinder = options.classFinder || js.getClassById;
    const createAssetRefs = options.createAssetRefs || sys.platform === Platform.EDITOR_CORE;
    const customEnv = options.customEnv;
    const ignoreEditorOnly = options.ignoreEditorOnly;
    const reportMissingClass = options.reportMissingClass ?? cclegacy.deserialize.reportMissingClass;

    // var oldJson = JSON.stringify(data, null, 2);

    details.init();

    // TODO: this should be a HACK, we've changed the method signature
    // workaround: mark pool as type of any.
    // issue: https://github.com/cocos/cocos-engine/issues/14642
    const deserializer = (_Deserializer.pool as any).get(details, classFinder, reportMissingClass, customEnv, ignoreEditorOnly);

    cclegacy.game._isCloning = true;
    const res = deserializer.deserialize(data);
    cclegacy.game._isCloning = false;

    _Deserializer.pool.put(deserializer);
    if (createAssetRefs) {
        details.assignAssetsBy((uuid, options) => (EditorExtends.serialize.asAsset(uuid, options.type) as Asset));
    }

    // var afterJson = JSON.stringify(data, null, 2);
    // if (oldJson !== afterJson) {
    //     throw new Error('JSON SHOULD not changed');
    // }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return res;
}

export function parseUuidDependenciesDynamic (serialized: unknown): string[] {
    const depends: string[] = [];
    const parseDependRecursively = (data: any, out: string[]): void => {
        if (!data || typeof data !== 'object' || typeof data.__id__ === 'number') { return; }
        const uuid = data.__uuid__;
        if (Array.isArray(data)) {
            for (let i = 0, l = data.length; i < l; i++) {
                parseDependRecursively(data[i], out);
            }
        } else if (uuid) {
            out.push(uuid);
        } else {
            for (const prop in data) {
                parseDependRecursively(data[prop], out);
            }
        }
    };
    parseDependRecursively(serialized, depends);
    return depends;
}
