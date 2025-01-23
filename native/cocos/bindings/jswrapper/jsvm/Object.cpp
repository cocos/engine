/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

#include "Object.h"
#include <memory>
#include <unordered_map>
#include "../MappingUtils.h"
#include "Class.h"
#include "ScriptEngine.h"
#include "Utils.h"
#include "application/ApplicationManager.h"

#define MAX_STRING_LEN 512

namespace se {
std::unique_ptr<std::unordered_map<Object*, void*>> __objectMap; // Currently, the value `void*` is always nullptr
std::set<Object*> Object::objBaseSet = {};

bool Object::restarting = false;

Object::Object() {}
Object::~Object() {
    if(restarting) {
        objBaseSet.insert(this);
    }
    if (__objectMap) {
        __objectMap->erase(this);
    }
}

Object* Object::createObjectWithClass(Class* cls) {
    JSVM_Value jsobj = Class::_createJSObjectWithClass(cls);
    Object* obj = Object::_createJSObject(ScriptEngine::getEnv(), jsobj, cls);
    return obj;
}

bool Object::setProperty(const char* name, const Value& data) {
    JSVM_Status status;
    JSVM_Value jsVal;
    internal::seToJsValue(data, &jsVal);
    NODE_API_CALL(status, _env, OH_JSVM_SetNamedProperty(_env, _objRef.getValue(_env), name, jsVal));
    return status == JSVM_OK;
}

bool Object::getProperty(const char* name, Value* d) {
    JSVM_Status status;
    JSVM_Value jsVal;
    Value data;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, _objRef.getValue(_env), name, &jsVal));
    if (status == JSVM_OK) {
        internal::jsToSeValue(jsVal, &data);
        *d = data;
        if (data.isUndefined()) {
            return false;
        }
        return true;
    }
    return false;
}

PrivateObjectBase* Object::getPrivateObject() const {
    return _privateObject;
}

void Object::setPrivateObject(PrivateObjectBase* data) {
    assert(_privateData == nullptr);
#if CC_DEBUG
    if (data != nullptr) {
        NativePtrToObjectMap::filter(data->getRaw(), _getClass())
            .forEach([&](se::Object* seObj) {
                auto* pri = seObj->getPrivateObject();
                SE_LOGE("Already exists object %s/[%s], trying to add %s/[%s]\n", pri->getName(), typeid(*pri).name(), data->getName(), typeid(*data).name());
    #if JSB_TRACK_OBJECT_CREATION
                SE_LOGE(" previous object created at %s\n", it->second->_objectCreationStackFrame.c_str());
    #endif
                CC_ABORT();
            });
    }
#endif

    if (data) {
        _privateData = data->getRaw();
        _privateObject = data;
        NativePtrToObjectMap::emplace(_privateData, this);
    }

    JSVM_Status status;
    auto tmpThis = _objRef.getValue(_env);
    JSVM_Ref result = nullptr;
    NODE_API_CALL(status, _env,
                  OH_JSVM_Wrap(_env, tmpThis, this, weakCallback,
                               (void*)this /* finalize_hint */, &result));
    //_objRef.setWeakref(_env, result);
    setProperty("__native_ptr__", se::Value(static_cast<uint64_t>(reinterpret_cast<uintptr_t>(data))));
    return;
}

bool Object::deleteProperty(const char* name) {
    JSVM_Status status;
    JSVM_Value key;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, _objRef.getValue(_env), name, &key));
    if (status != JSVM_OK) {
        return false;
    }
    bool ret = false;
    NODE_API_CALL(status, _env, OH_JSVM_DeleteProperty(_env, _objRef.getValue(_env), key, &ret));
    return ret;
}

bool Object::isArray() const {
    JSVM_Status status;
    bool ret = false;
    NODE_API_CALL(status, _env, OH_JSVM_IsArray(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::getArrayLength(uint32_t* length) const {
    JSVM_Status status;
    uint32_t len = 0;
    NODE_API_CALL(status, _env, OH_JSVM_GetArrayLength(_env, _objRef.getValue(_env), &len));
    if (length) {
        *length = len;
    }
    return true;
}

bool Object::getArrayElement(uint32_t index, Value* data) const {
    JSVM_Status status;
    JSVM_Value val;
    NODE_API_CALL(status, _env, OH_JSVM_GetElement(_env, _objRef.getValue(_env), index, &val));
    internal::jsToSeValue(val, data);
    return true;
}

bool Object::setArrayElement(uint32_t index, const Value& data) {
    JSVM_Status status;
    JSVM_Value val;
    internal::seToJsValue(data, &val);
    NODE_API_CALL(status, _env, OH_JSVM_SetElement(_env, _objRef.getValue(_env), index, val));
    return true;
}

bool Object::isTypedArray() const {
    JSVM_Status status;
    bool ret = false;
    NODE_API_CALL(status, _env, OH_JSVM_IsTypedarray(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::isProxy() const {
    //return const_cast<Object *>(this)->_obj.handle(__isolate)->IsProxy();
    // todo:
    return false;
}

Object::TypedArrayType Object::getTypedArrayType() const {
    JSVM_Status status;
    JSVM_TypedarrayType type;
    JSVM_Value inputBuffer;
    size_t byteOffset;
    size_t length;
    NODE_API_CALL(status, _env, OH_JSVM_GetTypedarrayInfo(_env, _objRef.getValue(_env), &type, &length, NULL, &inputBuffer, &byteOffset));

    TypedArrayType ret = TypedArrayType::NONE;
    switch (type) {
        case JSVM_INT8_ARRAY:
            ret = TypedArrayType::INT8;
            break;
        case JSVM_UINT8_ARRAY:
            ret = TypedArrayType::UINT8;
            break;
        case JSVM_UINT8_CLAMPED_ARRAY:
            ret = TypedArrayType::UINT8_CLAMPED;
            break;
        case JSVM_INT16_ARRAY:
            ret = TypedArrayType::INT16;
            break;
        case JSVM_UINT16_ARRAY:
            ret = TypedArrayType::UINT16;
            break;
        case JSVM_INT32_ARRAY:
            ret = TypedArrayType::INT32;
            break;
        case JSVM_UINT32_ARRAY:
            ret = TypedArrayType::UINT32;
            break;
        case JSVM_FLOAT32_ARRAY:
            ret = TypedArrayType::FLOAT32;
            break;
        case JSVM_FLOAT64_ARRAY:
            ret = TypedArrayType::FLOAT64;
            break;
        case JSVM_BIGINT64_ARRAY:
            ret = TypedArrayType::BIGINT64;
            break;
        case JSVM_BIGUINT64_ARRAY:
            ret = TypedArrayType::BIGUINT64;
            break;
        default:
            break;
    }
    return ret;
}

bool Object::getTypedArrayData(uint8_t** ptr, size_t* length) const {
    JSVM_Status status;
    JSVM_TypedarrayType type;
    JSVM_Value inputBuffer;
    size_t byteOffset;
    size_t arrayLength;
    void* data = nullptr;
    NODE_API_CALL(status, _env, OH_JSVM_GetTypedarrayInfo(_env, _objRef.getValue(_env), &type, &arrayLength, &data, &inputBuffer, &byteOffset));
    *ptr = (uint8_t*)(data);
    if (length) {
        size_t bytesOfElement = 1;
        switch (type) {
            case JSVM_INT16_ARRAY:
            case JSVM_UINT16_ARRAY:
                bytesOfElement = 2;
                break;
            case JSVM_INT32_ARRAY:
            case JSVM_UINT32_ARRAY:
            case JSVM_FLOAT32_ARRAY:
                bytesOfElement = 4;
                break;
            case JSVM_FLOAT64_ARRAY:
            case JSVM_BIGINT64_ARRAY:
            case JSVM_BIGUINT64_ARRAY:
                bytesOfElement = 8;
                break;
            default:
                break;
        }
        *length = arrayLength * bytesOfElement;
    }
    return true;
}

bool Object::isArrayBuffer() const {
    bool ret = false;
    JSVM_Status status;
    NODE_API_CALL(status, _env, OH_JSVM_IsArraybuffer(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::getArrayBufferData(uint8_t** ptr, size_t* length) const {
    JSVM_Status status;
    size_t len = 0;
    NODE_API_CALL(status, _env, OH_JSVM_GetArraybufferInfo(_env, _objRef.getValue(_env), reinterpret_cast<void**>(ptr), &len));
    if (length) {
        *length = len;
    }
    return true;
}

Object* Object::createTypedArray(Object::TypedArrayType type, const void* data, size_t byteLength) {
    JSVM_Status status;
    if (type == TypedArrayType::NONE) {
        SE_LOGE("Don't pass se::Object::TypedArrayType::NONE to createTypedArray API!");
        return nullptr;
    }

    JSVM_TypedarrayType jsvmType;
    JSVM_Value outputBuffer;
    void* outputPtr = nullptr;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateArraybuffer(ScriptEngine::getEnv(), byteLength, &outputPtr, &outputBuffer));
    if (outputPtr && data && byteLength > 0) {
        memcpy(outputPtr, data, byteLength);
    }
    size_t sizeOfEle = 0;
    switch (type) {
        case TypedArrayType::INT8:
            jsvmType = JSVM_INT8_ARRAY;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8:
            jsvmType = JSVM_UINT8_ARRAY;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8_CLAMPED:
            jsvmType = JSVM_UINT8_CLAMPED_ARRAY;
            sizeOfEle = 1;
            break;
        case TypedArrayType::INT16:
            jsvmType = JSVM_INT16_ARRAY;
            sizeOfEle = 2;
            break;
        case TypedArrayType::UINT16:
            jsvmType = JSVM_UINT16_ARRAY;
            sizeOfEle = 2;
            break;
        case TypedArrayType::INT32:
            jsvmType = JSVM_INT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::UINT32:
            jsvmType = JSVM_UINT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT32:
            jsvmType = JSVM_FLOAT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT64:
            jsvmType = JSVM_FLOAT64_ARRAY;
            sizeOfEle = 8;
            break;
        case TypedArrayType::BIGINT64:
            jsvmType = JSVM_BIGINT64_ARRAY;
            sizeOfEle = 8;
            break;
        case TypedArrayType::BIGUINT64:
            jsvmType = JSVM_BIGUINT64_ARRAY;
            sizeOfEle = 8;
            break;
        default:
            assert(false); // Should never go here.
            break;
    }
    size_t eleCounts = byteLength / sizeOfEle;
    JSVM_Value outputArray;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateTypedarray(ScriptEngine::getEnv(), jsvmType, eleCounts, outputBuffer, 0, &outputArray));

    Object* obj = Object::_createJSObject(ScriptEngine::getEnv(), outputArray, nullptr);
    return obj;
}

Object* Object::createTypedArrayWithBuffer(TypedArrayType type, const Object* obj) {
    return Object::createTypedArrayWithBuffer(type, obj, 0);
}

Object* Object::createTypedArrayWithBuffer(TypedArrayType type, const Object* obj, size_t offset) {
    size_t byteLength{0};
    uint8_t* skip{nullptr};

    if (obj->getArrayBufferData(&skip, &byteLength)) {
        return Object::createTypedArrayWithBuffer(type, obj, offset, byteLength - offset);
    }

    assert(false);
    return nullptr;
}

Object* Object::createTypedArrayWithBuffer(TypedArrayType type, const Object* obj, size_t offset, size_t byteLength) {
    if (type == TypedArrayType::NONE) {
        SE_LOGE("Don't pass se::Object::TypedArrayType::NONE to createTypedArray API!");
        return nullptr;
    }

    assert(obj->isArrayBuffer());
    JSVM_Status status;
    JSVM_Value outputBuffer = obj->_getJSObject();
    JSVM_TypedarrayType jsvmType;

    size_t sizeOfEle = 0;
    switch (type) {
        case TypedArrayType::INT8:
            jsvmType = JSVM_INT8_ARRAY;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8:
            jsvmType = JSVM_UINT8_ARRAY;
            sizeOfEle = 1;
            break;
        case TypedArrayType::INT16:
            jsvmType = JSVM_INT8_ARRAY;
            sizeOfEle = 2;
            break;
        case TypedArrayType::UINT16:
            jsvmType = JSVM_UINT8_ARRAY;
            sizeOfEle = 2;
            break;
        case TypedArrayType::INT32:
            jsvmType = JSVM_INT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::UINT32:
            jsvmType = JSVM_UINT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT32:
            jsvmType = JSVM_FLOAT32_ARRAY;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT64:
            jsvmType = JSVM_FLOAT64_ARRAY;
            sizeOfEle = 8;
            break;
        case TypedArrayType::BIGINT64:
            jsvmType = JSVM_BIGINT64_ARRAY;
            sizeOfEle = 8;
            break;
        case TypedArrayType::BIGUINT64:
            jsvmType = JSVM_BIGUINT64_ARRAY;
            sizeOfEle = 8;
            break;
        default:
            assert(false); // Should never go here.
            break;
    }
    size_t eleCounts = byteLength / sizeOfEle;
    JSVM_Value outputArray;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateTypedarray(ScriptEngine::getEnv(), jsvmType, eleCounts, outputBuffer, offset, &outputArray));

    return Object::_createJSObject(ScriptEngine::getEnv(), outputArray, nullptr);
}

Object* Object::createExternalArrayBufferObject(void* contents, size_t byteLength, BufferContentsFreeFunc freeFunc, void* freeUserData) {
    JSVM_Status status;
    JSVM_Value result;
    // JSVM does not support the napi_create_external_arraybuffer interface like in NAPI.
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateArrayBufferFromBackingStoreData(ScriptEngine::getEnv(), contents, byteLength, 0, byteLength, &result));
    Object* obj = Object::_createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

bool Object::isFunction() const {
    JSVM_ValueType valuetype0;
    JSVM_Status status;
    NODE_API_CALL(status, _env, OH_JSVM_Typeof(_env, _objRef.getValue(_env), &valuetype0));
    return (valuetype0 == JSVM_ValueType::JSVM_FUNCTION);
}

bool Object::defineFunction(const char* funcName, JSVM_Callback func) {
    JSVM_Value fn;
    JSVM_Status status;
    NODE_API_CALL(status, _env, OH_JSVM_CreateFunction(_env, funcName, JSVM_AUTO_LENGTH, func, &fn));
    NODE_API_CALL(status, _env, OH_JSVM_SetNamedProperty(_env, _objRef.getValue(_env), funcName, fn));
    return true;
}

bool Object::defineProperty(const char* name, JSVM_Callback getter, JSVM_Callback setter) {
    JSVM_Status status;
    JSVM_PropertyDescriptor properties[] = {{name, nullptr, nullptr, getter, setter, 0, JSVM_DEFAULT}};
    status = OH_JSVM_DefineProperties(_env, _objRef.getValue(_env), sizeof(properties) / sizeof(JSVM_PropertyDescriptor), properties);
    if (status == JSVM_OK) {
        return true;
    }
    return false;
}

Object* Object::_createJSObject(JSVM_Env env, JSVM_Value js_object, Class* cls) { // NOLINT(readability-identifier-naming)
    Object* ret = new Object();
    if (!ret->init(env, js_object, cls)) {
        delete ret;
        ret = nullptr;
    }
    return ret;
}

Object* Object::createPlainObject() {
    JSVM_Value result;
    JSVM_Status status;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateObject(ScriptEngine::getEnv(), &result));
    Object* obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

Object* Object::createArrayObject(size_t length) {
    JSVM_Value result;
    JSVM_Status status;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateArrayWithLength(ScriptEngine::getEnv(), length, &result));
    Object* obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

Object* Object::createArrayBufferObject(const void* data, size_t byteLength) {
    JSVM_Value result;
    JSVM_Status status;
    void* retData;
    Object* obj = nullptr;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateArraybuffer(ScriptEngine::getEnv(), byteLength, &retData, &result));
    if (status == JSVM_OK) {
        if (data) {
            memcpy(retData, data, byteLength);
        }
        obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    }
    return obj;
}

bool Object::getAllKeys(std::vector<std::string>* allKeys) const {
    JSVM_Status status;
    JSVM_Value names;

    NODE_API_CALL(status, _env, OH_JSVM_GetPropertyNames(_env, _objRef.getValue(_env), &names));
    if (status != JSVM_OK) {
        return false;
    }
    uint32_t name_len = 0;
    NODE_API_CALL(status, _env, OH_JSVM_GetArrayLength(_env, names, &name_len));
    for (uint32_t i = 0; i < name_len; i++) {
        JSVM_Value val;
        NODE_API_CALL(status, _env, OH_JSVM_GetElement(_env, names, i, &val));
        if (status == JSVM_OK) {
            char buffer[MAX_STRING_LEN];
            size_t result = 0;
            NODE_API_CALL(status, _env, OH_JSVM_GetValueStringUtf8(_env, val, buffer, MAX_STRING_LEN, &result));
            if (result > 0) {
                allKeys->push_back(buffer);
            }
        }
    }

    return true;
}

bool Object::init(JSVM_Env env, JSVM_Value js_object, Class* cls) {
    assert(env);
    _cls = cls;
    _env = env;
    _objRef.initWeakref(env, js_object);

    if (__objectMap) {
        assert(__objectMap->find(this) == __objectMap->end());
        __objectMap->emplace(this, nullptr);
    }
    return true;
}

bool Object::call(const ValueArray& args, Object* thisObject, Value* rval) {
    size_t argc = 0;
    std::vector<JSVM_Value> argv;
    argv.reserve(10);
    argc = args.size();
    internal::seToJsArgs(_env, args, &argv);
    JSVM_Value return_val;
    JSVM_Status status;
    assert(isFunction());
    JSVM_Value thisObj = thisObject ? thisObject->_getJSObject() : ({
        JSVM_Value undefinedValue;
        OH_JSVM_GetUndefined(_env, &undefinedValue);
        undefinedValue;
    });
    NODE_API_CALL(status, _env,
                  OH_JSVM_CallFunction(_env, thisObj, _getJSObject(), argc, argv.data(), &return_val));
    if (rval) {
        internal::jsToSeValue(return_val, rval);
    }
    return true;
}

void Object::_setFinalizeCallback(JSVM_Finalize finalizeCb) {
    assert(finalizeCb != nullptr);
    _finalizeCb = finalizeCb;
}

// void Object::setPrivateData(void* data){
//     assert(_privateData == nullptr);
//     assert(NativePtrToObjectMap::find(data) == NativePtrToObjectMap::end());
//     JSVM_Status status;
//     NativePtrToObjectMap::emplace(data, this);
//     _privateData = data;
//     //issue https://github.com/nodejs/node/issues/23999
//     auto tmpThis = _objRef.getValue(_env);
//     //_objRef.deleteRef();
//     NODE_API_CALL(status, _env,
//                   OH_JSVM_Wrap(_env, tmpThis, data, sendWeakCallback,
//                             (void*)this /* finalize_hint */, nullptr));
//     //_objRef.setWeakref(_env, result);
//     setProperty("__native_ptr__", se::Value(static_cast<long>(reinterpret_cast<uintptr_t>(data))));
// }

void* Object::getPrivateData() const {
    return _privateData;
}

bool Object::attachObject(Object* obj) {
    assert(obj);

    Object* global = ScriptEngine::getInstance()->getGlobalObject();
    Value jsbVal;
    if (!global->getProperty("jsb", &jsbVal)) {
        return false;
    }
    Object* jsbObj = jsbVal.toObject();

    Value func;

    if (!jsbObj->getProperty("registerNativeRef", &func)) {
        return false;
    }

    ValueArray args;
    args.push_back(Value(this));
    args.push_back(Value(obj));
    func.toObject()->call(args, global);
    return true;
}

bool Object::detachObject(Object* obj) {
    assert(obj);

    Object* global = ScriptEngine::getInstance()->getGlobalObject();
    Value jsbVal;
    if (!global->getProperty("jsb", &jsbVal)) {
        return false;
    }
    Object* jsbObj = jsbVal.toObject();

    Value func;

    if (!jsbObj->getProperty("unregisterNativeRef", &func)) {
        return false;
    }

    ValueArray args;
    args.push_back(Value(this));
    args.push_back(Value(obj));
    func.toObject()->call(args, global);
    return true;
}

std::string Object::toString() const {
    std::string ret;
    JSVM_Status status;
    if (isFunction() || isArray() || isTypedArray()) {
        JSVM_Value result;
        NODE_API_CALL(status, _env, OH_JSVM_CoerceToString(_env, _objRef.getValue(_env), &result));
        char buffer[MAX_STRING_LEN];
        size_t result_t = 0;
        NODE_API_CALL(status, _env, OH_JSVM_GetValueStringUtf8(_env, result, buffer, MAX_STRING_LEN, &result_t));
        ret = buffer;
    } else if (isArrayBuffer()) {
        ret = "[object ArrayBuffer]";
    } else {
        ret = "[object Object]";
    }
    return ret;
}

void Object::root() {
    JSVM_Status status;
    if (_rootCount == 0) {
        uint32_t result = 0;
        _objRef.incRef(_env);
    }
    ++_rootCount;
}

void Object::unroot() {
    JSVM_Status status;
    if (_rootCount > 0) {
        --_rootCount;
        if (_rootCount == 0) {
            _objRef.decRef(_env);
        }
    }
}

bool Object::isRooted() const {
    return _rootCount > 0;
}

Class* Object::_getClass() const {
    return _cls;
}

Object* Object::getObjectWithPtr(void* ptr) {
    Object* obj = nullptr;
    auto iter = NativePtrToObjectMap::find(ptr);
    if (iter != NativePtrToObjectMap::end()) {
        obj = iter->second;
        obj->incRef();
    }
    return obj;
}

JSVM_Value Object::_getJSObject() const {
    return _objRef.getValue(_env);
}

void Object::sendWeakCallback(JSVM_Env env, void* nativeObject, void* finalizeHint /*finalize_hint*/) {
    auto cb = std::bind(weakCallback, env, nativeObject, finalizeHint);
    CC_CURRENT_ENGINE()->getScheduler()->performFunctionInCocosThread(cb);
}

void Object::weakCallback(JSVM_Env env, void* nativeObject, void* finalizeHint /*finalize_hint*/) {
    if (finalizeHint) {
        if (nativeObject == nullptr) {
            return;
        }
        void* rawPtr = reinterpret_cast<Object*>(finalizeHint)->_privateData;
        Object* seObj = reinterpret_cast<Object*>(finalizeHint);

        auto it = objBaseSet.find(seObj);
        if(it != objBaseSet.end()) {
            return;
        }
        
        if (seObj->_onCleaingPrivateData) { //called by cleanPrivateData, not release seObj;
            return;
        }
        if (seObj->_clearMappingInFinalizer && rawPtr != nullptr) {
            auto iter = NativePtrToObjectMap::find(rawPtr);
            if (iter != NativePtrToObjectMap::end()) {
                    if (seObj->_finalizeCb != nullptr) {
                    seObj->_finalizeCb(env, finalizeHint, finalizeHint);
                } else {
                    assert(seObj->_getClass() != nullptr);
                    if (seObj->_getClass()->_getFinalizeFunction() != nullptr) {
                        seObj->_getClass()->_getFinalizeFunction()(env, finalizeHint, finalizeHint);
                    }
                }
                seObj->decRef();
                NativePtrToObjectMap::erase(iter);
            } else {
                SE_LOGE("not find ptr in NativePtrToObjectMap");
            }
        }
    }
}

void Object::setup() {
    restarting = false;
    __objectMap = std::make_unique<std::unordered_map<Object*, void*>>();
}

void Object::cleanup() {
    void* nativeObj = nullptr;
    Object* obj = nullptr;
    Class* cls = nullptr;

    const auto& nativePtrToObjectMap = NativePtrToObjectMap::instance();
    for (const auto& e : nativePtrToObjectMap) {
        nativeObj = e.first;
        obj = e.second;

        if (obj->_finalizeCb != nullptr) {
            obj->_finalizeCb(ScriptEngine::getEnv(), nativeObj, nullptr);
        } else {
            if (obj->_getClass() != nullptr) {
                if (obj->_getClass()->_getFinalizeFunction() != nullptr) {
                    obj->_getClass()->_getFinalizeFunction()(ScriptEngine::getEnv(), nativeObj, nullptr);
                }
            }
        }
        obj->decRef();
    }

    NativePtrToObjectMap::clear();

    if (__objectMap) {
        for (const auto& e : *__objectMap) {
            obj = e.first;
            cls = obj->_getClass();
            obj->_rootCount = 0;
        }
    }

    __objectMap.reset();
}

Object* Object::createJSONObject(const std::string& jsonStr) {
    auto _env = ScriptEngine::getEnv();
    JSVM_Status status;
    JSVM_Value global;
    // 获取js全局对象
    NODE_API_CALL(status, _env, OH_JSVM_GetGlobal(_env, &global));
    assert(status == JSVM_OK);

    // 获取js对象中的JSON对象
    JSVM_Value globalJsonObj;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, global, "JSON", &globalJsonObj));

    // 获取js对象中的parse方法
    JSVM_Value parseFunc;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, globalJsonObj, "parse", &parseFunc));

    // 创建一个js的string，字符源于输入的std::string jsonStr
    JSVM_Value jsJsonStr;
    NODE_API_CALL(status, _env, OH_JSVM_CreateStringUtf8(_env, jsonStr.c_str(), jsonStr.length(), &jsJsonStr));

    // 调用js中的JSON.parse将jsJsonStr转换成js对象
    JSVM_Value jsObj;
    NODE_API_CALL(status, _env, OH_JSVM_CallFunction(_env, globalJsonObj, parseFunc, 1, &jsJsonStr, &jsObj));

    Object* obj = nullptr;
    obj = Object::_createJSObject(_env, jsObj, nullptr);
    return obj;
}

Object* Object::createJSONObject(std::u16string&& jsonStr) {
    auto _env = ScriptEngine::getEnv();
    JSVM_Status status;
    JSVM_Value global;
    // 获取js全局对象
    NODE_API_CALL(status, _env, OH_JSVM_GetGlobal(_env, &global));
    assert(status == JSVM_OK);

    // 获取js对象中的JSON对象
    JSVM_Value globalJsonObj;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, global, "JSON", &globalJsonObj));

    // 获取js对象中的parse方法
    JSVM_Value parseFunc;
    NODE_API_CALL(status, _env, OH_JSVM_GetNamedProperty(_env, globalJsonObj, "parse", &parseFunc));

    // 创建一个js的string，字符源于输入的std::string jsonStr
    JSVM_Value jsJsonStr;
    NODE_API_CALL(status, _env, OH_JSVM_CreateStringUtf16(_env, jsonStr.c_str(), jsonStr.length(), &jsJsonStr));

    // 调用js中的JSON.parse将jsJsonStr转换成js对象
    JSVM_Value jsObj;
    NODE_API_CALL(status, _env, OH_JSVM_CallFunction(_env, globalJsonObj, parseFunc, 1, &jsJsonStr, &jsObj));

    Object* obj = nullptr;
    obj = Object::_createJSObject(_env, jsObj, nullptr);
    return obj;
}

Object* Object::createProxyTarget(se::Object* proxy) {
    // SE_ASSERT(proxy->isProxy(), "parameter is not a Proxy object");
    // v8::Local<v8::Object> jsobj = proxy->getProxyTarget().As<v8::Object>();
    // Object *obj = Object::_createJSObject(nullptr, jsobj);
    // return obj;
    return nullptr;
}

void Object::clearPrivateData(bool clearMapping) {
    if (_privateObject != nullptr) {
        JSVM_Status status;
        void* result = nullptr;
        auto tmpThis = _objRef.getValue(_env);
        _onCleaingPrivateData = true;
        if (clearMapping) {
            NativePtrToObjectMap::erase(_privateData);
        }
        NODE_API_CALL(status, _env, OH_JSVM_RemoveWrap(_env, tmpThis, &result));
        delete _privateObject;
        _privateObject = nullptr;
        _privateData = nullptr;
        _onCleaingPrivateData = false;
    }
}

JSVM_Value ObjectRef::getValue(JSVM_Env env) const {
    JSVM_Value  result;
    JSVM_Status status;
    NODE_API_CALL(status, env, OH_JSVM_GetReferenceValue(env, _ref, &result));
    assert(status == JSVM_OK);
    assert(result != nullptr);
    return result;
}

Object* Object::createUTF8String(const std::string& str) {
    JSVM_Status status;
    JSVM_Value result;
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_CreateStringUtf8(ScriptEngine::getEnv(), str.c_str(), JSVM_AUTO_LENGTH, &result));
    Object* obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

} // namespace se
