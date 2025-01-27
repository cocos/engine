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

#include "Utils.h"
#include "CommonHeader.h"
#include "ScriptEngine.h"
#include "Class.h"

#define MAX_STRING_LENS 1024

namespace se {
namespace internal {
void jsToSeValue(const target_value& value, Value* v) {
    assert(v != nullptr);
    auto env = ScriptEngine::getEnv();
    JSVM_Status    status;
    JSVM_ValueType valType;
    int64_t iRet      = 0;
    double  dRet      = 0.0;
    bool    bRet      = false;
    bool    lossless  = false;
    size_t  len       = 0;
    void*   privateObjPtr = nullptr;
    void*   nativePtr = nullptr;
    Object* obj       = nullptr;

    if (!value) {
        valType = JSVM_ValueType::JSVM_UNDEFINED;
    }else {
        NODE_API_CALL(status, env, OH_JSVM_Typeof(env, value, &valType));
    }

    switch (valType) {
        case JSVM_ValueType::JSVM_UNDEFINED:
            v->setUndefined();
            break;
        case JSVM_ValueType::JSVM_NULL:
            v->setNull();
            break;
        case JSVM_ValueType::JSVM_NUMBER:
            NODE_API_CALL(status, env, OH_JSVM_GetValueDouble(env, value, &dRet));
            if (status == JSVM_OK) {
                v->setDouble(dRet);
            } else {
                v->setUndefined();
            }
            break;
        case JSVM_ValueType::JSVM_BIGINT:
            NODE_API_CALL(status, env, OH_JSVM_GetValueBigintInt64(env, value, &iRet, &lossless));
            if (lossless) {
                v->setInt64(iRet);
            } else {
                v->setUndefined();
            }

            break;
        case JSVM_ValueType::JSVM_STRING:
            NODE_API_CALL(status, env, OH_JSVM_GetValueStringUtf8(env, value, nullptr, 0, &len));
            if (status == JSVM_OK) {
                std::string valueStr;
                len += 1;
                valueStr.resize(len);
                NODE_API_CALL(status, env, OH_JSVM_GetValueStringUtf8(env, value, const_cast<char*>(valueStr.data()), valueStr.size(), &len));
                if (valueStr.length() != len) {
                    valueStr.resize(len);
                }
                v->setString(valueStr);
            } else {
                v->setUndefined();
            }
            break;
        case JSVM_ValueType::JSVM_BOOLEAN:
            NODE_API_CALL(status, env, OH_JSVM_GetValueBool(env, value, &bRet));
            if (status == JSVM_OK) {
                v->setBoolean(bRet);
            } else {
                v->setUndefined();
            }
            break;
        case JSVM_ValueType::JSVM_OBJECT:
        case JSVM_ValueType::JSVM_FUNCTION:
            status = OH_JSVM_Unwrap(env, value, &privateObjPtr);
             if (status == JSVM_OK && privateObjPtr) {
                nativePtr = reinterpret_cast<Object*>(privateObjPtr)->getPrivateData();
            }
            if(nativePtr) {
                obj = Object::getObjectWithPtr(nativePtr);
            }
            if (obj == nullptr) {
                obj = Object::_createJSObject(env, value, nullptr);
            }
            if (obj) {
                v->setObject(obj, true);
                obj->decRef();
            } else {
                v->setUndefined();
            }
            break;
        default:
            break;
    }
}

void jsToSeArgs(size_t argc, target_value* argv, ValueArray* outArr) {
    assert(outArr != nullptr);
    for (int i = 0; i < argc; i++) {
        Value v;
        jsToSeValue(argv[i], &v);
        outArr->push_back(v);
    }
}

bool seToJsValue(const Value& v, target_value* outJsVal) {
    assert(outJsVal != nullptr);
    auto env = ScriptEngine::getEnv();
    bool ret = false;
    JSVM_Status status = JSVM_OK;
    switch (v.getType()) {
        case Value::Type::Number:
            NODE_API_CALL(status, env, OH_JSVM_CreateDouble(env, v.toDouble(), outJsVal));
            ret = (status == JSVM_OK);
            break;
        case Value::Type::String: 
            NODE_API_CALL(status, env, OH_JSVM_CreateStringUtf8(env, v.toString().c_str(), v.toString().length(), outJsVal));
            ret = (status == JSVM_OK);
            break;
        case Value::Type::Boolean:
            NODE_API_CALL(status, env, OH_JSVM_GetBoolean(env, v.toBoolean(), outJsVal));
            ret = (status == JSVM_OK);
            break;
        case Value::Type::Object:
            *outJsVal = v.toObject()->_getJSObject();
            ret       = (outJsVal != nullptr);
            break;
        case Value::Type::Null:
            NODE_API_CALL(status, env, OH_JSVM_GetNull(env, outJsVal));
            ret = (status == JSVM_OK);
            break;
        case Value::Type::Undefined:
            NODE_API_CALL(status, env, OH_JSVM_GetUndefined(env, outJsVal));
            ret = (status == JSVM_OK);
            break;
        case Value::Type::BigInt:
            NODE_API_CALL(status, env, OH_JSVM_CreateBigintInt64(env, v.toInt64(), outJsVal));
            ret = (status == JSVM_OK);
            break;
        default:
            assert(false);
            break;
    }
    //LOGI("type :%d", v.getType());
    return ret;
}

void seToJsArgs(JSVM_Env env, const ValueArray& args, std::vector<target_value>* outArr) {
    assert(outArr != nullptr);
    for (const auto& data : args) {
        JSVM_Value jsval;
        seToJsValue(data, &jsval);
        outArr->push_back(jsval);
    }
}

bool setReturnValue(const Value& data, target_value& argv) {
    if (data.getType() == Value::Type::BigInt) {
        // TODO: fix 'TypeError: Cannot mix BigInt and other types, use explicit conversions' for spine & dragonbones
        auto env = ScriptEngine::getEnv();
        JSVM_Status status;
        NODE_API_CALL(status, env, OH_JSVM_CreateDouble(env, data.toDouble(), &argv));
        return true;
    }

    return seToJsValue(data, &argv);
}

std::string jsToString(const target_value &value) {
    se::Value seValue;
    internal::jsToSeValue(value, &seValue);
    if (seValue.isString()) {
        return seValue.toString();
    } else {
        return "";
    }
}

void logJsException(JSVM_Env env, const char *file, int line) {
    bool isPending = false;
    JSVM_CALL_RETURN_VOID(OH_JSVM_IsExceptionPending(env, &isPending));
    if (!isPending) {
        return;
    }

    JSVM_Value error;
    JSVM_CALL_RETURN_VOID(OH_JSVM_GetAndClearLastException(env, &error));

    JSVM_Value name;
    JSVM_CALL_RETURN_VOID(OH_JSVM_GetNamedProperty(env, error, "name", &name));

    JSVM_Value stack;
    JSVM_CALL_RETURN_VOID(OH_JSVM_GetNamedProperty(env, error, "stack", &stack));

    JSVM_Value message;
    JSVM_CALL_RETURN_VOID(OH_JSVM_GetNamedProperty(env, error, "stack", &message));

    std::string nameStr = jsToString(name);
    std::string stackStr = jsToString(stack);
    std::string messageStr = jsToString(message);

    SE_LOGE("JS exception occurred at %{public}s:%{public}d\n\
            [name]: %{public}s\n\
            [message]: %{public}s\n\
            [stack]: %{public}s",
            file, line, nameStr.c_str(), messageStr.c_str(), stackStr.c_str());
    auto exceptionCallback = ScriptEngine::getInstance()->getExceptionCallback();
    exceptionCallback("", messageStr.c_str(), stackStr.c_str());
}

} // namespace internal
}; // namespace se
