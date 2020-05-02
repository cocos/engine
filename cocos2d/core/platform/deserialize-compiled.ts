/****************************************************************************
 Copyright (c) present Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/

import js from './js';
import ValueType from '../value-types/value-type';
import Vec2 from '../value-types/vec2';
import Vec3 from '../value-types/vec3';
import Vec4 from '../value-types/vec4';
import Color from '../value-types/color';
import Size from '../value-types/size';
import Rect from '../value-types/rect';
import Quat from '../value-types/quat';
import Mat4 from '../value-types/mat4';

/****************************************************************************
 * BUILT-IN TYPES / CONSTAINTS
 ****************************************************************************/

const SUPPORT_LOWEST_FORMAT_VERSION = 1;

// Used for Data.ValueType.
// If a value type is not registered in this list, it will be serialized to Data.Class.
/*@__DROP_PURE_EXPORT__*/
export const BuiltinValueTypes: Array<typeof ValueType> = [
    Vec2,   // 0
    Vec3,   // 1
    Vec4,   // 2
    Quat,   // 3
    Color,  // 4
    Size,   // 5
    Rect,   // 6
    Mat4,   // 7
];

// Used for Data.ValueTypeCreated.
function BuiltinValueTypeParsers_xyzw (obj: Vec4, data: Array<number>) {
    obj.x = data[1];
    obj.y = data[2];
    obj.z = data[3];
    obj.w = data[4];
}
const BuiltinValueTypeSetters: Array<((obj: ValueType, data: Array<number>) => void)> = [
    function (obj: Vec2, data: Array<number>) {
        obj.x = data[1];
        obj.y = data[2];
    },
    function (obj: Vec3, data: Array<number>) {
        obj.x = data[1];
        obj.y = data[2];
        obj.z = data[3];
    },
    BuiltinValueTypeParsers_xyzw,   // Vec4
    BuiltinValueTypeParsers_xyzw,   // Quat
    function (obj: Color, data: Array<number>) {
        obj._val = data[1];
    },
    function (obj: Size, data: Array<number>) {
        obj.width = data[1];
        obj.height = data[2];
    },
    function (obj: Rect, data: Array<number>) {
        obj.x = data[1];
        obj.y = data[2];
        obj.width = data[3];
        obj.height = data[4];
    },
    function (obj: Mat4, data: Array<number>) {
        Mat4.fromArray(obj, data, 1);
    }
];

function serializeBuiltinValueTypes(obj: ValueType): IValueTypeData | null {
    let ctor = obj.constructor as typeof ValueType;
    let typeId = BuiltinValueTypes.indexOf(ctor);
    switch (ctor) {
        case Vec2:
            // @ts-ignore
            return [typeId, obj.x, obj.y];
        case Vec3:
            // @ts-ignore
            return [typeId, obj.x, obj.y, obj.z];
        case Vec4:
        case Quat:
            // @ts-ignore
            return [typeId, obj.x, obj.y, obj.z, obj.w];
        case Color:
            // @ts-ignore
            return [typeId, obj._val];
        case Size:
            // @ts-ignore
            return [typeId, obj.width, obj.height];
        case Rect:
            // @ts-ignore
            return [typeId, obj.x, obj.y, obj.width, obj.height];
        case Mat4:
            // @ts-ignore
            let res: IValueTypeData = new Array(1 + 16);
            res[VALUETYPE_SETTER] = typeId;
            Mat4.toArray(res, obj as Mat4, 1);
            return res;
        default:
            return null;
    }
}

// // TODO: Used for Data.TypedArray.
// const TypedArrays = [
//     Float32Array,
//     Float64Array,
//
//     Int8Array,
//     Int16Array,
//     Int32Array,
//
//     Uint8Array,
//     Uint16Array,
//     Uint32Array,
//
//     Uint8ClampedArray,
//     // BigInt64Array,
//     // BigUint64Array,
// ];


/****************************************************************************
 * TYPE DECLARATIONS
 ****************************************************************************/

export type SharedString = string;
export type StringIndex = number;
export type InstanceIndex = number;
export type RootInstanceIndex = InstanceIndex;

// T 和 U 的取值范围都是非负整数
// 当值 >= 0 代表 T
// 当值 < 0 则代表 ~U，使用 ~x 提取 U 的值。
export type Xor<T extends number, U extends number> = T|U;


// 当值 >= 0 代表字符串索引
// 当值 < 0 则代表非负整数。使用 ~x 提取。
export type StringIndexXorNumber = Xor<StringIndex, number>;

// A reverse index used to assign current parsing object to target command buffer so it could be assembled later.
// Should >= REF.OBJ_OFFSET
export type ReverseIndex = number;

// 用于将当前对象存入索引
export type InstanceXorReverseIndex = Xor<InstanceIndex, ReverseIndex>;

/*@__DROP_PURE_EXPORT__*/
export const enum DataTypeID {

    // Fields that can be assigned directly, can be values in any JSON, or even a complex JSON array, object (no type).
    // Contains null, no undefined, JSON does not support serialization of undefined.
    // This is the only type that supports null, and all other advanced fields are forbidden with null values.
    // If the value of an object is likely to be null, it needs to exist as a new class,
    // but the probability of this is very low and will be analyzed below.
    SimpleType = 0,

    //--------------------------------------------------------------------------
    // 除了 Simple，其余都属于 Advanced Type

    // Rarely will it be NULL, as NULL will be dropped as the default value.
    InstanceRef,

    // 类型完全相等的数组。
    // Arrays will have default values that developers will rarely assign to null manually.
    Array_InstanceRef,
    Array_AssetRefByInnerObj,

    // Embedded object
    // Rarely will it be NULL, as NULL will be dropped as the default value.
    Class,

    // Existing ValueType (created by the Class constructor).
    // Developers will rarely manually assign a null.
    ValueTypeCreated,

    // 给内嵌对象（如数组）用的资源引用，值是 DEPEND_OBJS 的索引
    //（INSTANCES 中的对象不需要动态解析资源引用关系，所以不需要有 AssetRef 类型）
    AssetRefByInnerObj,

    // Common TypedArray for cc.Node only. Never be null.
    TRS,

    // // From the point of view of simplified implementation,
    // // it is not supported to deserialize TypedArray that is initialized to null in the constructor.
    // // Also, the length of TypedArray cannot be changed.
    // // Developers will rarely manually assign a null.
    // TypedArray,

    // 需要重新 new 对象的 ValueType（数组、字典里面的）
    // Developers will rarely manually assign a null.
    ValueType,

    Array_Class,

    // TODO: SharedString,

    // CustomizedClass embedded in Class
    CustomizedClass,

    // Universal dictionary with unlimited types of values (except TypedArray)
    Dict,

    // Universal arrays, of any type (except TypedArray) and can be unequal.
    // (The editor doesn't seem to have a good way of stopping arrays of unequal types either)
    Array,
}

export type DataTypes = {
    [DataTypeID.SimpleType]: number | string | boolean | null | object;
    [DataTypeID.InstanceRef]: InstanceXorReverseIndex;
    [DataTypeID.Array_InstanceRef]: Array<DataTypes[DataTypeID.InstanceRef]>;
    [DataTypeID.Array_AssetRefByInnerObj]: Array<DataTypes[DataTypeID.AssetRefByInnerObj]>;
    [DataTypeID.Class]: IClassObjectData;
    [DataTypeID.ValueTypeCreated]: IValueTypeData;
    [DataTypeID.AssetRefByInnerObj]: number;
    [DataTypeID.TRS]: ITRSData;
    // [DataTypeID.TypedArray]: Array<InstanceOrReverseIndex>;
    [DataTypeID.ValueType]: IValueTypeData;
    [DataTypeID.Array_Class]: Array<DataTypes[DataTypeID.Class]>;
    [DataTypeID.CustomizedClass]: ICustomObjectData;
    [DataTypeID.Dict]: IDictData;
    [DataTypeID.Array]: IArrayData;
};

export type PrimitiveObjectTypeID = (
    DataTypeID.Array |
    DataTypeID.Array_Class |
    DataTypeID.Array_AssetRefByInnerObj |
    DataTypeID.Array_InstanceRef |
    DataTypeID.Dict
);

export type AdvancedTypeID = Exclude<DataTypeID, DataTypeID.SimpleType>


// 所有数据的类型集合
export type AnyData = DataTypes[keyof DataTypes];

export type AdvancedData = DataTypes[Exclude<keyof DataTypes, DataTypeID.SimpleType>];
// Instances will be [...IClassObjectData[], ...AdvancedObjectData[], RootInstanceIndex]
export type AdvancedObjectData = ICustomObjectDataContent | DataTypes[PrimitiveObjectTypeID];

// class Index of DataTypeID.CustomizedClass or PrimitiveObjectTypeID
/*@__DROP_PURE_EXPORT__*/
export type AdvancedObjectTypeID = Xor<number, PrimitiveObjectTypeID>;

export interface Ctor<T> extends Function {
    new(): T;
}
// Includes normal CCClass and fast defined class
export interface CCClass<T> extends Ctor<T> {
    __values__: string[]
}
export type AnyCtor = Ctor<Object>;
export type AnyCCClass = CCClass<Object>;

/**
 * 如果值的类型不同将会生成不同的 Class
 */
/*@__DROP_PURE_EXPORT__*/
export const CLASS_TYPE = 0;
/*@__DROP_PURE_EXPORT__*/
export const CLASS_KEYS = 1;
/*@__DROP_PURE_EXPORT__*/
export const CLASS_PROP_TYPE_OFFSET = 2;
export type IClass = [
    string|AnyCtor,
    string[],
    // offset - 用于指定 CLASS_KEYS 中的元素与其 AdvancedType 之间的对应关系，只对 AdvancedType 有效
    // 解析时，IClass[CLASS_KEYS][x] 的类型为 IClass[x + IClass[CLASS_PROP_TYPE_OFFSET]]
    // 序列化时，IClass[CLASS_PROP_TYPE_OFFSET] = CLASS_PROP_TYPE_OFFSET + 1 - （SimpleType 的数量）
    number,
    // 属性对应的 AdvancedType 类型
    ...DataTypeID[]
];

/**
 * Mask is used to define the properties and types that need to be deserialized.
 * Instances of the same class may have different Masks due to different default properties removed.
 */
/*@__DROP_PURE_EXPORT__*/
export const MASK_CLASS = 0;
export type IMask = [
    // The index of its Class
    number,
    // The indices of the property that needs to be deserialized in IClass, except that the last number represents OFFSET.
    // All properties before OFFSET are SimpleType, and those starting at OFFSET are AdvancedType.
    // default is 1
    ...number[]
];

/*@__DROP_PURE_EXPORT__*/
export const OBJ_DATA_MASK = 0;
export type IClassObjectData = [
    // The index of its Mask
    number,
    // Starting from 1, the values corresponding to the properties in the Mask
    ...AnyData[]
];

export type ICustomObjectDataContent = any;

/*@__DROP_PURE_EXPORT__*/
export const CUSTOM_OBJ_DATA_CLASS = 0;
/*@__DROP_PURE_EXPORT__*/
export const CUSTOM_OBJ_DATA_CONTENT = 1;
export interface ICustomObjectData extends Array<any> {
    // The index of its Class
    [CUSTOM_OBJ_DATA_CLASS]: number;
    // Content
    [CUSTOM_OBJ_DATA_CONTENT]: ICustomObjectDataContent;
}

/*@__DROP_PURE_EXPORT__*/
export const VALUETYPE_SETTER = 0;
export type IValueTypeData = [
    // Predefined parsing function index
    number,
    // Starting with 1, the corresponding value in the attributes are followed in order
    ...number[]
];

export type ITRSData = [number, number, number, number, number,
                        number, number, number, number, number];

/*@__DROP_PURE_EXPORT__*/
export const DICT_JSON_LAYOUT = 0;
export interface IDictData extends Array<any> {
    // The raw json object
    [DICT_JSON_LAYOUT]: any,
    // key
    // Shared strings are not considered here, can be defined as CCClass if it is required.
    [1]: string;
    // value type
    // Should not be SimpleType, SimpleType is built directly into DICT_JSON_LAYOUT.
    [2]: AdvancedTypeID;
    // value
    [3]: AdvancedData;
    // More repeated key values
    [index: number]: any,
}

/*@__DROP_PURE_EXPORT__*/
export const ARRAY_ITEM_VALUES = 0;
export type IArrayData = [
    AnyData[],
    // types
    ...DataTypeID[]
];

/*@__DROP_PURE_EXPORT__*/
export const TYPEDARRAY_TYPE = 0;
/*@__DROP_PURE_EXPORT__*/
export const TYPEDARRAY_ELEMENTS = 1;
export interface ITypedArrayData extends Array<number|number[]> {
    [TYPEDARRAY_TYPE]: number,
    [TYPEDARRAY_ELEMENTS]: number[],
}

/*@__DROP_PURE_EXPORT__*/
export const enum Refs {
    EACH_RECORD_LENGTH = 3,
    OWNER_OFFSET = 0,
    KEY_OFFSET = 1,
    TARGET_OFFSET = 2,
}

export interface IRefs extends Array<number> {
    // owner
    // The owner of all the objects in the front is of type object, starting from OFFSET * 3 are of type InstanceIndex
    [0]: (object | InstanceIndex),
    // property name
    [1]?: StringIndexXorNumber;
    // target object
    [2]?: InstanceIndex;
    // All the following objects are arranged in the order of the first three values,
    // except that the last number represents OFFSET.
    [index: number]: any;
}

/*@__DROP_PURE_EXPORT__*/
export const enum File {
    Version = 0,
    Context = 0,
    SharedUuids,
    SharedStrings,
    SharedClasses,
    SharedMasks,
    Instances,
    InstanceTypes,
    Refs,
    DependObjs,
    DependKeys,
    DependUuidIndices,
    ARRAY_LENGTH,
}

export interface IFileData extends Array<any> {
    // version
    [File.Version]: number | any;

    // Shared data area, the higher the number of references, the higher the position

    [File.SharedUuids]: SharedString[];           // Shared uuid strings for dependent assets
    [File.SharedStrings]: SharedString[];
    [File.SharedClasses]: (IClass|string|AnyCCClass)[];
    [File.SharedMasks]: IMask[];            // Shared Object layouts for IClassObjectData

    // Data area

    // A one-dimensional array to represent object datas, layout is [...IClassObjectData[], ...AdvancedObjectData[], RootInstanceIndex]
    // If the last element is not RootInstanceIndex, the first element will be the root object to return
    [File.Instances]: (IClassObjectData|AdvancedObjectData|RootInstanceIndex)[];
    [File.InstanceTypes]: AdvancedObjectTypeID[];
    // Object references infomation
    [File.Refs]: IRefs | null;

    // Result area

    // Asset-dependent objects that are deserialized and parsed into object arrays
    [File.DependObjs]: (object|InstanceIndex)[];
    // Asset-dependent key name or array index
    [File.DependKeys]: (StringIndexXorNumber|string)[];
    // UUID of dependent assets
    [File.DependUuidIndices]: (StringIndex|string)[];
}

interface ICustomHandler {
    result: Details,
    customEnv: any,
}
interface IOptions extends ICustomHandler {
    classFinder: {
        (type: string): AnyCtor;
        // // for editor
        // onDereferenced: (curOwner: object, curPropName: string, newOwner: object, newPropName: string) => void;
    };
    _version?: number;
}
interface ICustomClass {
    _deserialize: (content: any, context: ICustomHandler) => void;
}

/****************************************************************************
 * IMPLEMENTS
 ****************************************************************************/

/**
 * !#en Contains meta information collected during deserialization
 * !#zh 包含反序列化后附带的元信息
 * @class Details
 */
class Details {
    /**
     * the obj list whose field needs to load asset by uuid
     * @property {Object[]} uuidObjList
     */
    uuidObjList: IFileData[File.DependObjs] | null = null;
    /**
     * the corresponding field name which referenced to the asset
     * @property {(String|Number)[]} uuidPropList
     */
    uuidPropList: IFileData[File.DependKeys] | null = null;
    /**
     * list of the depends assets' uuid
     * @property {String[]} uuidList
     */
    uuidList: IFileData[File.DependUuidIndices] | null = null;

    static pool = new js.Pool(function (obj) {
        obj.reset();
    }, 5);

    /**
     * @method init
     * @param {Object} data
     */
    init (data: IFileData) {
        this.uuidObjList = data[File.DependObjs];
        this.uuidPropList = data[File.DependKeys];
        this.uuidList = data[File.DependUuidIndices];
    }

    /**
     * @method reset
     */
    reset  () {
        this.uuidList = null;
        this.uuidObjList = null;
        this.uuidPropList = null;
    };

    /**
     * @method push
     * @param {Object} obj
     * @param {String} propName
     * @param {String} uuid
     */
    push (obj: object, propName: string, uuid: string) {
        (this.uuidObjList as object[]).push(obj);
        (this.uuidPropList as string[]).push(propName);
        (this.uuidList as string[]).push(uuid);
    };
}
Details.pool.get = function () {
    return this._get() || new Details();
};
if (CC_EDITOR || CC_TEST) {
    // @ts-ignore
    Details.prototype.assignAssetsBy = function (getter: (uuid: string) => any) {
        for (var i = 0, len = (this.uuidList as string[]).length; i < len; i++) {
            var obj = (this.uuidObjList as object)[i];
            var prop = (this.uuidPropList as any[])[i];
            var uuid = (this.uuidList as string[])[i];
            obj[prop] = getter(uuid as string);
        }
    };
}

function dereference(refs: IRefs, instances: IFileData[File.Instances], strings: IFileData[File.SharedStrings]): void {
    let dataLength = refs.length - 1;
    let i = 0;
    // owner is object
    let instanceOffset: number = refs[dataLength] * Refs.EACH_RECORD_LENGTH;
    for (; i < instanceOffset; i += Refs.EACH_RECORD_LENGTH) {
        const owner = refs[i] as any;

        const target = instances[refs[i + Refs.TARGET_OFFSET]];
        const keyIndex = refs[i + Refs.KEY_OFFSET] as StringIndexXorNumber;
        if (keyIndex >= 0) {
            owner[strings[keyIndex]] = target;
        }
        else {
            owner[~keyIndex] = target;
        }
    }
    // owner is instance index
    for (; i < dataLength; i += Refs.EACH_RECORD_LENGTH) {
        const owner = instances[refs[i]] as any;

        const target = instances[refs[i + Refs.TARGET_OFFSET]];
        const keyIndex = refs[i + Refs.KEY_OFFSET] as StringIndexXorNumber;
        if (keyIndex >= 0) {
            owner[strings[keyIndex]] = target;
        }
        else {
            owner[~keyIndex] = target;
        }
    }
}

//

function deserializeCCObject (data: IFileData, objectData: IClassObjectData) {
    let mask = data[File.SharedMasks][objectData[OBJ_DATA_MASK]];
    let clazz = data[File.SharedClasses][mask[MASK_CLASS]]; // TODO - will it faster if we cache class in mask[0]?
    let ctor = clazz[CLASS_TYPE] as Exclude<AnyCtor, ICustomClass>;
    // if (!ctor) {
    //     return null;
    // }

    let obj = new ctor();

    let keys = clazz[CLASS_KEYS];
    let classTypeOffset = clazz[CLASS_PROP_TYPE_OFFSET];
    let maskTypeOffset = mask[mask.length - 1];

    // parse simple type
    let i = MASK_CLASS + 1;
    for (; i < maskTypeOffset; ++i) {
        let key = keys[mask[i]];
        obj[key] = objectData[i];
    }

    // parse advanced type
    for (; i < objectData.length; ++i) {
        let key = keys[mask[i]];
        let type = clazz[mask[i] + classTypeOffset];
        let op = ASSIGNMENTS[type] as ParseFunction;
        op(data, obj, key, objectData[i]);
    }

    return obj;
}

function deserializeCustomCCObject (data: IFileData, ctor: Ctor<ICustomClass>, value: ICustomObjectDataContent) {
    let obj = new ctor();
    if (obj._deserialize) {
        obj._deserialize(value, data[File.Context]);
    }
    else {
        cc.errorID(5303, js.getClassName(ctor));
    }
    return obj;
}

// Parse Functions

type ParseFunction = (data: IFileData, owner: any, key: string, value: AnyData) => void;

function assignInstanceRef (data: IFileData, owner: any, key: string, value: InstanceXorReverseIndex) {
    // TODO: if value bigger than current object index, use refs
    if (value >= 0) {
        owner[key] = data[File.Instances][value];
    }
    else {
        (data[File.Refs] as IRefs)[(~value) * Refs.EACH_RECORD_LENGTH] = owner;
    }
}

function genArrayParser (parser: ParseFunction): ParseFunction {
    return function (data: IFileData, owner: any, key: string, value: Array<any>) {
        owner[key] = value;
        for (let i = 0; i < value.length; ++i) {
            // @ts-ignore
            parser(data, value, i, value[i]);
        }
    };
}

function parseAssetRefByInnerObj (data: IFileData, owner: any, key: string, value: number) {
    owner[key] = null;
    data[File.DependObjs][value] = owner;
}

function parseClass (data: IFileData, owner: any, key: string, value: IClassObjectData) {
    owner[key] = deserializeCCObject(data, value);
}

function parseCustomClass (data: IFileData, owner: any, key: string, value: ICustomObjectData) {
    let ctor = data[File.SharedClasses][value[CUSTOM_OBJ_DATA_CLASS]] as CCClass<ICustomClass>;
    owner[key] = deserializeCustomCCObject(data, ctor, value[CUSTOM_OBJ_DATA_CONTENT]);
}

function parseValueTypeCreated (data: IFileData, owner: any, key: string, value: IValueTypeData) {
    BuiltinValueTypeSetters[value[VALUETYPE_SETTER]](owner[key], value);
}

function parseValueType (data: IFileData, owner: any, key: string, value: IValueTypeData) {
    let val: ValueType = new BuiltinValueTypes[value[VALUETYPE_SETTER]]();
    BuiltinValueTypeSetters[value[VALUETYPE_SETTER]](val, value);
    owner[key] = val;
}

function parseTRS (data: IFileData, owner: any, key: string, value: ITRSData) {
    let typedArray = owner[key] as (Float32Array | Float64Array);
    typedArray.set(value);
}

function parseDict (data: IFileData, owner: any, key: string, value: IDictData) {
    let dict = value[DICT_JSON_LAYOUT];
    owner[key] = dict;
    for (let i = DICT_JSON_LAYOUT + 1; i < value.length; i += 3) {
        let key = value[i] as string;
        let type = value[i + 1] as DataTypeID;
        let subValue = value[i + 2] as AnyData;
        let op = ASSIGNMENTS[type] as ParseFunction;
        op(data, dict, key, subValue);
    }
}

function parseArray (data: IFileData, owner: any, key: string, value: IArrayData) {
    let array = value[ARRAY_ITEM_VALUES];
    owner[key] = array;
    for (let i = 0; i < array.length; ++i) {
        let subValue = array[i] as AnyData;
        let type = value[i + 1] as DataTypeID;
        if (type !== DataTypeID.SimpleType) {
            let op = ASSIGNMENTS[type] as ParseFunction;
            // @ts-ignore
            op(data, array, i, subValue);
        }
    }
}

// function parseTypedArray (data: IFileData, owner: any, key: string, value: ITypedArrayData) {
//     let val: ValueType = new TypedArrays[value[TYPEDARRAY_TYPE]]();
//     BuiltinValueTypeSetters[value[VALUETYPE_SETTER]](val, value);
//     // obj = new window[serialized.ctor](array.length);
//     // for (let i = 0; i < array.length; ++i) {
//     //     obj[i] = array[i];
//     // }
//     // return obj;
//     owner[key] = val;
// }

const ASSIGNMENTS = new Array<ParseFunction | null>(DataTypeID.Array + 1);
ASSIGNMENTS[DataTypeID.SimpleType] = null;    // unused
ASSIGNMENTS[DataTypeID.InstanceRef] = assignInstanceRef;
ASSIGNMENTS[DataTypeID.Array_InstanceRef] = genArrayParser(assignInstanceRef);
ASSIGNMENTS[DataTypeID.Array_AssetRefByInnerObj] = genArrayParser(parseAssetRefByInnerObj);
ASSIGNMENTS[DataTypeID.Class] = parseClass;
ASSIGNMENTS[DataTypeID.ValueTypeCreated] = parseValueTypeCreated;
ASSIGNMENTS[DataTypeID.AssetRefByInnerObj] = parseAssetRefByInnerObj;
ASSIGNMENTS[DataTypeID.TRS] = parseTRS;
ASSIGNMENTS[DataTypeID.ValueType] = parseValueType;
ASSIGNMENTS[DataTypeID.Array_Class] = genArrayParser(parseClass);
ASSIGNMENTS[DataTypeID.CustomizedClass] = parseCustomClass;
ASSIGNMENTS[DataTypeID.Dict] = parseDict;
ASSIGNMENTS[DataTypeID.Array] = parseArray;
// ASSIGNMENTS[DataTypeID.TypedArray] = parseTypedArray;



function parseInstances (data: IFileData): RootInstanceIndex {
    let instances = data[File.Instances];
    let instanceTypes = data[File.InstanceTypes];
    let rootIndex = 0;
    let normalObjectCount = instances.length - instanceTypes.length;
    if (instances.length > 1) {
        rootIndex = instances[instances.length - 1];
        --normalObjectCount;
    }

    let insIndex = 0;
    for (; insIndex < normalObjectCount; ++insIndex) {
        instances[insIndex] = deserializeCCObject(data, instances[insIndex] as IClassObjectData);
    }

    let classes = data[File.SharedClasses];
    for (let typeIndex = 0; typeIndex < instanceTypes.length; ++typeIndex, ++insIndex) {
        let type = instanceTypes[typeIndex] as AdvancedObjectTypeID;
        let eachData = instances[insIndex];
        if (type >= 0) {
            // class index for DataTypeID.CustomizedClass
            let ctor = classes[type] as CCClass<ICustomClass>;
            instances[insIndex] = deserializeCustomCCObject(data, ctor, eachData as ICustomObjectDataContent);
        }
        else {
            type = (~type) as PrimitiveObjectTypeID;
            let op = ASSIGNMENTS[type];
            // @ts-ignore
            op(data, instances, insIndex, eachData);
        }
    }

    return rootIndex;
}

function lookupClasses (data: IFileData, options: IOptions) {
    let customFinder = options.classFinder;
    let classFinder = customFinder || js._getClassById;
    let classes = data[File.SharedClasses];
    for (let i = 0; i < classes.length; ++i) {
        let klassLayout = classes[i];
        let className = klassLayout[CLASS_TYPE] as string;
        let klass = classFinder(className);
        if (klass) {
            klassLayout[CLASS_TYPE] = klass;
        }
        else {
            if (!customFinder) {
                cc.deserialize.reportMissingClass(className);
            }
            klassLayout[CLASS_TYPE] = Object;
        }
    }
}

function parseResult (data: IFileData) {
    let instances = data[File.Instances];
    let sharedStrings = data[File.SharedStrings];
    let dependSharedUuids = data[File.SharedUuids];

    let dependObjs = data[File.DependObjs];
    let dependKeys = data[File.DependKeys];
    let dependUuids = data[File.DependUuidIndices];

    for (let i = 0; i < dependObjs.length; ++i) {
        let obj: any = dependObjs[i];
        if (typeof obj === 'number') {
            dependObjs[i] = instances[obj];
        }
        else {
            // assigned by DataTypeID.AssetRefByInnerObj or added by Details object directly in _deserialize
        }
        let key: any = dependKeys[i];
        if (typeof key === 'number') {
            if (key >= 0) {
                key = sharedStrings[key];
            }
            else {
                key = ~key;
            }
            dependKeys[i] = key;
        }
        else {
            // added by Details object directly in _deserialize
        }
        let uuid = dependUuids[i];
        if (typeof uuid === 'number') {
            dependUuids[i] = dependSharedUuids[uuid as StringIndex];
        }
        else {
            // added by Details object directly in _deserialize
        }
    }
}

cc.deserializeCompiled = function (data: IFileData, details: Details, options: IOptions): object {
    let borrowDetails = !details;
    details = details || Details.pool.get();
    details.init(data);
    let version = data[File.Version];
    if (version < SUPPORT_LOWEST_FORMAT_VERSION) {
        throw new Error(cc.debug.getError(5304, version));
    }

    options._version = version;
    options.result = details;

    data[File.Context] = options;

    lookupClasses(data, options);

    let instances = data[File.Instances];
    let rootIndex = parseInstances(data);

    if (data[File.Refs]) {
        dereference(data[File.Refs] as IRefs, instances, data[File.SharedStrings]);
    }

    parseResult(data);

    if (borrowDetails) {
        Details.pool.put(details);
    }

    return instances[rootIndex];
};

cc.deserialize.reportMissingClass = function (id: any) {
    if (CC_EDITOR && Editor.Utils.UuidUtils.isUuid(id)) {
        id = Editor.Utils.UuidUtils.decompressUuid(id);
        cc.warnID(5301, id);
    }
    else {
        cc.warnID(5302, id);
    }
};



if (CC_EDITOR || CC_TEST) {
    cc.deserialize.macros = {
    };
    cc.deserialize._BuiltinValueTypes = BuiltinValueTypes;
    cc.deserialize._serializeBuiltinValueTypes = serializeBuiltinValueTypes;
}

if (CC_TEST) {
    cc._Test.deserialize = {
        dereference,
        deserializeCCObject,
        deserializeCustomCCObject,
        parseInstances,
        File: {
            Version: File.Version,
            Context: File.Context,
            SharedUuids: File.SharedUuids,
            SharedStrings: File.SharedStrings,
            SharedClasses: File.SharedClasses,
            SharedMasks: File.SharedMasks,
            Instances: File.Instances,
            Instances_CustomClasses: File.InstanceTypes,
            Refs: File.Refs,
            DependObjs: File.DependObjs,
            DependKeys: File.DependKeys,
            DependUuidIndices: File.DependUuidIndices,
            // ArrayLength: File.ArrayLength,
        },
        DataTypeID: {
            SimpleType: DataTypeID.SimpleType,
            InstanceRef: DataTypeID.InstanceRef,
            Array_InstanceRef: DataTypeID.Array_InstanceRef,
            Array_AssetRefByInnerObj: DataTypeID.Array_AssetRefByInnerObj,
            Class: DataTypeID.Class,
            ValueTypeCreated: DataTypeID.ValueTypeCreated,
            AssetRefByInnerObj: DataTypeID.AssetRefByInnerObj,
            TRS: DataTypeID.TRS,
            ValueType: DataTypeID.ValueType,
            Array_Class: DataTypeID.Array_Class,
            CustomizedClass: DataTypeID.CustomizedClass,
            Dict: DataTypeID.Dict,
            Array: DataTypeID.Array,
            // TypedArray: DataTypeID.TypedArray,
        },
        BuiltinValueTypes,
    };
}
