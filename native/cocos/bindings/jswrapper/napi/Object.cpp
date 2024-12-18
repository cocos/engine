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

#define MAX_STRING_LEN 512
namespace se {
std::unique_ptr<std::unordered_map<Object*, void*>> __objectMap; // Currently, the value `void*` is always nullptr

Object::Object() {}
Object::~Object() {
    if (__objectMap) {
        __objectMap->erase(this);
    }
}

Object* Object::createObjectWithClass(Class* cls) {
    napi_value jsobj = Class::_createJSObjectWithClass(cls);
    Object* obj = Object::_createJSObject(ScriptEngine::getEnv(), jsobj, cls);
    return obj;
}

bool Object::setProperty(const char* name, const Value& data) {
    napi_status status;
    napi_value jsVal;
    internal::seToJsValue(data, &jsVal);
    NODE_API_CALL(status, _env, napi_set_named_property(_env, _objRef.getValue(_env), name, jsVal));
    return status == napi_ok;
}

bool Object::getProperty(const char* name, Value* d) {
    napi_status status;
    napi_value jsVal;
    Value data;
    NODE_API_CALL(status, _env, napi_get_named_property(_env, _objRef.getValue(_env), name, &jsVal));
    if (status == napi_ok) {
        internal::jsToSeValue(jsVal, &data);
        *d = data;
        if (data.isUndefined()) {
            return false;
        }
        return true;
    }
    return false;
}

bool Object::isArray() const {
    napi_status status;
    bool ret = false;
    NODE_API_CALL(status, _env, napi_is_array(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::getArrayLength(uint32_t* length) const {
    napi_status status;
    uint32_t len = 0;
    NODE_API_CALL(status, _env, napi_get_array_length(_env, _objRef.getValue(_env), &len));
    if (length) {
        *length = len;
    }
    return true;
}

bool Object::getArrayElement(uint32_t index, Value* data) const {
    napi_status status;
    napi_value val;
    NODE_API_CALL(status, _env, napi_get_element(_env, _objRef.getValue(_env), index, &val));
    internal::jsToSeValue(val, data);
    return true;
}

bool Object::setArrayElement(uint32_t index, const Value& data) {
    napi_status status;
    napi_value val;
    internal::seToJsValue(data, &val);
    NODE_API_CALL(status, _env, napi_set_element(_env, _objRef.getValue(_env), index, val));
    return true;
}

bool Object::isTypedArray() const {
    napi_status status;
    bool ret = false;
    NODE_API_CALL(status, _env, napi_is_typedarray(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::isProxy() const {
    //return const_cast<Object *>(this)->_obj.handle(__isolate)->IsProxy();
    // todo:
    return false;
}

Object* Object::createProxyTarget(se::Object* proxy) {
    // SE_ASSERT(proxy->isProxy(), "parameter is not a Proxy object");
    // v8::Local<v8::Object> jsobj = proxy->getProxyTarget().As<v8::Object>();
    // Object *obj = Object::_createJSObject(nullptr, jsobj);
    // return obj;
    return nullptr;
}

Object::TypedArrayType Object::getTypedArrayType() const {
    napi_status status;
    napi_typedarray_type type;
    napi_value inputBuffer;
    size_t byteOffset;
    size_t length;
    NODE_API_CALL(status, _env, napi_get_typedarray_info(_env, _objRef.getValue(_env), &type, &length, NULL, &inputBuffer, &byteOffset));

    TypedArrayType ret = TypedArrayType::NONE;
    switch (type) {
        case napi_int8_array:
            ret = TypedArrayType::INT8;
            break;
        case napi_uint8_array:
            ret = TypedArrayType::UINT8;
            break;
        case napi_uint8_clamped_array:
            ret = TypedArrayType::UINT8_CLAMPED;
            break;
        case napi_int16_array:
            ret = TypedArrayType::INT16;
            break;
        case napi_uint16_array:
            ret = TypedArrayType::UINT16;
            break;
        case napi_int32_array:
            ret = TypedArrayType::INT32;
            break;
        case napi_uint32_array:
            ret = TypedArrayType::UINT32;
            break;
        case napi_float32_array:
            ret = TypedArrayType::FLOAT32;
            break;
        case napi_float64_array:
            ret = TypedArrayType::FLOAT64;
            break;
        default:
            break;
    }
    return ret;
}

bool Object::getTypedArrayData(uint8_t** ptr, size_t* length) const {
    napi_status status;
    napi_typedarray_type type;
    napi_value inputBuffer;
    size_t byteOffset;
    size_t byteLength;
    void* data = nullptr;
    NODE_API_CALL(status, _env, napi_get_typedarray_info(_env, _objRef.getValue(_env), &type, &byteLength, &data, &inputBuffer, &byteOffset));
    *ptr = (uint8_t*)(data);
    if (length) {
        *length = byteLength;
    }
    return true;
}

bool Object::isArrayBuffer() const {
    bool ret = false;
    napi_status status;
    NODE_API_CALL(status, _env, napi_is_arraybuffer(_env, _objRef.getValue(_env), &ret));
    return ret;
}

bool Object::getArrayBufferData(uint8_t** ptr, size_t* length) const {
    napi_status status;
    size_t len = 0;
    NODE_API_CALL(status, _env, napi_get_arraybuffer_info(_env, _objRef.getValue(_env), reinterpret_cast<void**>(ptr), &len));
    if (length) {
        *length = len;
    }
    return true;
}

Object* Object::createTypedArray(Object::TypedArrayType type, const void* data, size_t byteLength) {
    napi_status status;
    if (type == TypedArrayType::NONE) {
        SE_LOGE("Don't pass se::Object::TypedArrayType::NONE to createTypedArray API!");
        return nullptr;
    }

    napi_typedarray_type napiType;
    napi_value outputBuffer;
    void* outputPtr = nullptr;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_arraybuffer(ScriptEngine::getEnv(), byteLength, &outputPtr, &outputBuffer));
    if (outputPtr && data && byteLength > 0) {
        memcpy(outputPtr, data, byteLength);
    }
    size_t sizeOfEle = 0;
    switch (type) {
        case TypedArrayType::INT8:
            napiType = napi_int8_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8:
            napiType = napi_uint8_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8_CLAMPED:
            napiType = napi_uint8_clamped_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::INT16:
            napiType = napi_int16_array;
            sizeOfEle = 2;
            break;
        case TypedArrayType::UINT16:
            napiType = napi_uint16_array;
            sizeOfEle = 2;
            break;
        case TypedArrayType::INT32:
            napiType = napi_int32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::UINT32:
            napiType = napi_uint32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT32:
            napiType = napi_float32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT64:
            napiType = napi_float64_array;
            sizeOfEle = 8;
            break;
        default:
            assert(false); // Should never go here.
            break;
    }
    size_t eleCounts = byteLength / sizeOfEle;
    napi_value outputArray;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_typedarray(ScriptEngine::getEnv(), napiType, eleCounts, outputBuffer, 0, &outputArray));

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

    CC_ASSERT(false);
    return nullptr;
}

Object* Object::createTypedArrayWithBuffer(TypedArrayType type, const Object* obj, size_t offset, size_t byteLength) {
    if (type == TypedArrayType::NONE) {
        SE_LOGE("Don't pass se::Object::TypedArrayType::NONE to createTypedArray API!");
        return nullptr;
    }


    CC_ASSERT(obj->isArrayBuffer());
    napi_status status;
    napi_value outputBuffer = obj->_getJSObject();
    napi_typedarray_type napiType;

    size_t sizeOfEle = 0;
    switch (type) {
        case TypedArrayType::INT8:
            napiType = napi_int8_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8:
            napiType = napi_uint8_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::UINT8_CLAMPED:
            napiType = napi_uint8_clamped_array;
            sizeOfEle = 1;
            break;
        case TypedArrayType::INT16:
            napiType = napi_int16_array;
            sizeOfEle = 2;
            break;
        case TypedArrayType::UINT16:
            napiType = napi_uint16_array;
            sizeOfEle = 2;
            break;
        case TypedArrayType::INT32:
            napiType = napi_int32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::UINT32:
            napiType = napi_uint32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT32:
            napiType = napi_float32_array;
            sizeOfEle = 4;
            break;
        case TypedArrayType::FLOAT64:
            napiType = napi_float64_array;
            sizeOfEle = 8;
            break;
        default:
            assert(false); // Should never go here.
            break;
    }
    size_t eleCounts = byteLength / sizeOfEle;
    napi_value outputArray;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_typedarray(ScriptEngine::getEnv(), napiType, eleCounts, outputBuffer, offset, &outputArray));

    return Object::_createJSObject(ScriptEngine::getEnv(), outputArray, nullptr);
}

Object* Object::createExternalArrayBufferObject(void* contents, size_t byteLength, BufferContentsFreeFunc freeFunc, void* freeUserData) {
    napi_status status;
    napi_value result;
    if (freeFunc) {
        struct ExternalArrayBufferCallbackParams* param = new (struct ExternalArrayBufferCallbackParams);
        param->func = freeFunc;
        param->contents = contents;
        param->byteLength = byteLength;
        param->userData = freeUserData;
        NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_external_arraybuffer(
                                                          ScriptEngine::getEnv(), contents, byteLength, [](napi_env env, void* finalize_data, void* finalize_hint) {
                                                              if (finalize_hint) {
                                                                  struct ExternalArrayBufferCallbackParams* param = reinterpret_cast<struct ExternalArrayBufferCallbackParams*>(finalize_hint);
                                                                  param->func(param->contents, param->byteLength, param->userData);
                                                                  delete param;
                                                              }
                                                          },
                                                          reinterpret_cast<void*>(param), &result));
    } else {
        NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_external_arraybuffer(ScriptEngine::getEnv(), contents, byteLength, nullptr, freeUserData, &result));
    }

    Object* obj = Object::_createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

bool Object::isFunction() const {
    napi_valuetype valuetype0;
    napi_status status;
    NODE_API_CALL(status, _env, napi_typeof(_env, _objRef.getValue(_env), &valuetype0));
    return (valuetype0 == napi_function);
}

bool Object::defineFunction(const char* funcName, napi_callback func) {
    napi_value fn;
    napi_status status;
    NODE_API_CALL(status, _env, napi_create_function(_env, funcName, NAPI_AUTO_LENGTH, func, NULL, &fn));
    NODE_API_CALL(status, _env, napi_set_named_property(_env, _objRef.getValue(_env), funcName, fn));
    return true;
}

bool Object::defineProperty(const char* name, napi_callback getter, napi_callback setter) {
    napi_status status;
    napi_property_descriptor properties[] = {{name, nullptr, nullptr, getter, setter, 0, napi_default, 0}};
    status = napi_define_properties(_env, _objRef.getValue(_env), sizeof(properties) / sizeof(napi_property_descriptor), properties);
    if (status == napi_ok) {
        return true;
    }
    return false;
}

Object* Object::_createJSObject(napi_env env, napi_value js_object, Class* cls) { // NOLINT(readability-identifier-naming)
    auto* ret = new Object();
    if (!ret->init(env, js_object, cls)) {
        delete ret;
        ret = nullptr;
    }
    return ret;
}

Object* Object::createPlainObject() {
    napi_value result;
    napi_status status;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_object(ScriptEngine::getEnv(), &result));
    Object* obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

Object* Object::createArrayObject(size_t length) {
    napi_value result;
    napi_status status;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_array_with_length(ScriptEngine::getEnv(), length, &result));
    Object* obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    return obj;
}

Object* Object::createArrayBufferObject(const void* data, size_t byteLength) {
    napi_value result;
    napi_status status;
    void* retData;
    Object* obj = nullptr;
    NODE_API_CALL(status, ScriptEngine::getEnv(), napi_create_arraybuffer(ScriptEngine::getEnv(), byteLength, &retData, &result));
    if (status == napi_ok) {
        if (data) {
            memcpy(retData, data, byteLength);
        }
        obj = _createJSObject(ScriptEngine::getEnv(), result, nullptr);
    }
    return obj;
}

bool Object::getAllKeys(std::vector<std::string>* allKeys) const {
    napi_status status;
    napi_value names;

    NODE_API_CALL(status, _env, napi_get_property_names(_env, _objRef.getValue(_env), &names));
    if (status != napi_ok) {
        return false;
    }
    uint32_t name_len = 0;
    NODE_API_CALL(status, _env, napi_get_array_length(_env, names, &name_len));
    for (uint32_t i = 0; i < name_len; i++) {
        napi_value val;
        NODE_API_CALL(status, _env, napi_get_element(_env, names, i, &val));
        if (status == napi_ok) {
            char buffer[MAX_STRING_LEN];
            size_t result = 0;
            NODE_API_CALL(status, _env, napi_get_value_string_utf8(_env, val, buffer, MAX_STRING_LEN, &result));
            if (result > 0) {
                allKeys->push_back(buffer);
            }
        }
    }

    return true;
}

bool Object::init(napi_env env, napi_value js_object, Class* cls) {
    assert(env);
    _cls = cls;
    _env = env;
    _objRef.initWeakref(env, js_object);

    if (__objectMap) {
        assert(__objectMap->find(this) == __objectMap->end());
        __objectMap->emplace(this, nullptr);
    }

    napi_status status;
    return true;
}

bool Object::call(const ValueArray& args, Object* thisObject, Value* rval) {
    size_t argc = 0;
    std::vector<napi_value> argv;
    argv.reserve(10);
    argc = args.size();
    internal::seToJsArgs(_env, args, &argv);
    napi_value return_val;
    napi_status status;
    assert(isFunction());
    napi_value thisObj = thisObject ? thisObject->_getJSObject() : nullptr;
    status =
        napi_call_function(_env, thisObj, _getJSObject(), argc, argv.data(), &return_val);
    if (rval) {
        internal::jsToSeValue(return_val, rval);
    }
    return true;
}

void Object::_setFinalizeCallback(napi_finalize finalizeCb) {
    assert(finalizeCb != nullptr);
    _finalizeCb = finalizeCb;
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
    napi_status status;
    if (data) {
        _privateData = data->getRaw();
        _privateObject = data;
        NativePtrToObjectMap::emplace(_privateData, this);
    }

    //issue https://github.com/nodejs/node/issues/23999
    auto tmpThis = _objRef.getValue(_env);
    //_objRef.deleteRef();
    napi_ref result = nullptr;
    NODE_API_CALL(status, _env,
                  napi_wrap(_env, tmpThis, this, weakCallback,
                            (void*)this /* finalize_hint */, &result));
    //_objRef.setWeakref(_env, result);
    setProperty("__native_ptr__", se::Value(static_cast<uint64_t>(reinterpret_cast<uintptr_t>(data))));

    return;
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
    napi_status status;
    if (isFunction() || isArray() || isTypedArray()) {
        napi_value result;
        NODE_API_CALL(status, _env, napi_coerce_to_string(_env, _objRef.getValue(_env), &result));
        char buffer[MAX_STRING_LEN];
        size_t result_t = 0;
        NODE_API_CALL(status, _env, napi_get_value_string_utf8(_env, result, buffer, MAX_STRING_LEN, &result_t));
        ret = buffer;
    } else if (isArrayBuffer()) {
        ret = "[object ArrayBuffer]";
    } else {
        ret = "[object Object]";
    }
    return ret;
}

void Object::root() {
    napi_status status;
    if (_rootCount == 0) {
        uint32_t result = 0;
        _objRef.incRef(_env);
        //NODE_API_CALL(status, _env, napi_reference_ref(_env, _wrapper, &result));
    }
    ++_rootCount;
}

void Object::unroot() {
    napi_status status;
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

napi_value Object::_getJSObject() const {
    return _objRef.getValue(_env);
}

void Object::weakCallback(napi_env env, void* nativeObject, void* finalizeHint /*finalize_hint*/) {
    if (finalizeHint) {
        if (nativeObject == nullptr) {
            return;
        }
        void* rawPtr = reinterpret_cast<Object*>(nativeObject)->_privateData;
        Object* seObj = reinterpret_cast<Object*>(nativeObject);
        if (seObj->_onCleaingPrivateData) { //called by cleanPrivateData, not release seObj;
            return;
        }
        if (seObj->_clearMappingInFinalizer && rawPtr != nullptr) {
            auto iter = NativePtrToObjectMap::find(rawPtr);
            if (iter != NativePtrToObjectMap::end()) {
                NativePtrToObjectMap::erase(iter);
            } else {
                CC_LOG_INFO("not find ptr in NativePtrToObjectMap");
            }
        }

        if (seObj->_finalizeCb != nullptr) {
            seObj->_finalizeCb(env, rawPtr, rawPtr);
        } else {
            assert(seObj->_getClass() != nullptr);
            if (seObj->_getClass()->_getFinalizeFunction() != nullptr) {
                seObj->_getClass()->_getFinalizeFunction()(env, rawPtr, rawPtr);
            }
        }
        seObj->decRef();
    }
}

void Object::setup() {
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
    //not impl
    return nullptr;
}

void Object::clearPrivateData(bool clearMapping) {
    if (_privateObject != nullptr) {
        napi_status status;
        void* result = nullptr;
        auto tmpThis = _objRef.getValue(_env);
        _onCleaingPrivateData = true;
        if (clearMapping) {
            NativePtrToObjectMap::erase(_privateData);
        }
        NODE_API_CALL(status, _env, napi_remove_wrap(_env, tmpThis, &result));
        delete _privateObject;
        _privateObject = nullptr;
        _privateData = nullptr;
        _onCleaingPrivateData = false;
    }
}

} // namespace se
