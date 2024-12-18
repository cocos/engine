/****************************************************************************
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/

#include "HelperMacros.h"
#include "../State.h"
#include "Class.h"
#include "Object.h"
#include "ScriptEngine.h"
#include "Utils.h"

SE_HOT JSVM_Value jsbFunctionWrapper(JSVM_Env env, JSVM_CallbackInfo info, se_function_ptr func, const char *funcName) {
    JSVM_Status status;
    bool ret = false;
    JSVM_Value _this;
    se::ValueArray seArgs;
    seArgs.reserve(15);
    size_t argc = 15;
    JSVM_Value args[15];
    NODE_API_CALL(status, env, OH_JSVM_GetCbInfo(env, info, &argc, args, &_this, NULL));

    void* nativeThisObject = nullptr;
    status = OH_JSVM_Unwrap(env, _this, &nativeThisObject);
    se::internal::jsToSeArgs(argc, args, &seArgs);
    se::State state(reinterpret_cast<se::Object*>(nativeThisObject), seArgs);
    ret = func(state);
    if (!ret) {
        SE_LOGE("[ERROR] Failed to invoke %s, location: %s:%d\n", funcName, __FILE__, __LINE__);
        return nullptr;
    }
    JSVM_Value retVal;
    if (se::internal::setReturnValue(state.rval(), retVal))
        return retVal;
    return nullptr;
}

SE_HOT void jsbFinalizeWrapper(void *thisObject, se_function_ptr func, const char *funcName) {
    se::State state(reinterpret_cast<se::Object *>(thisObject));
    bool ret = func(state);
    if (!ret) {
        SE_LOGE("[ERROR] Failed to invoke %s, location: %s:%d\n", funcName, __FILE__, __LINE__);
    }
}

SE_HOT JSVM_Value jsbConstructorWrapper(JSVM_Env env, JSVM_CallbackInfo info, se_function_ptr func, se_finalize_ptr finalizeCb, se::Class *cls, const char *funcName) {
    JSVM_Status status;
    bool ret = false;
    JSVM_Value _this;
    se::ValueArray seArgs;
    seArgs.reserve(10);
    size_t argc = 10;
    JSVM_Value args[10];
    NODE_API_CALL(status, env, OH_JSVM_GetCbInfo(env, info, &argc, args, &_this, NULL));
    if (!se::ScriptEngine::getInstance()->_needCallConstructor()) {
        return _this;
    }
    se::internal::jsToSeArgs(argc, args, &seArgs);
    se::Object *thisObject = se::Object::_createJSObject(env, _this, cls);
    thisObject->_setFinalizeCallback(finalizeCb);
    se::State state(thisObject, seArgs);
    ret = func(state);
    if (!ret) {
        SE_LOGE("[ERROR] Failed to invoke %s, location: %s:%d\n", funcName, __FILE__, __LINE__);
    }
    se::Value property;
    bool foundCtor = false;
    if (!cls->_getCtor().has_value()) {
        foundCtor = thisObject->getProperty("_ctor", &property, true);
        if (foundCtor) {
            cls->_setCtor(property.toObject());
        } else {
            cls->_setCtor(nullptr);
        }
    } else {
        auto *ctorObj = cls->_getCtor().value();
        if (ctorObj != nullptr) {
            property.setObject(ctorObj);
            foundCtor = true;
        }
    }

    if (foundCtor) {
        property.toObject()->call(seArgs, thisObject);
    }
    return _this;
}

SE_HOT JSVM_Value jsbGetterWrapper(JSVM_Env env, JSVM_CallbackInfo info, se_function_ptr func, const char *funcName) {
    JSVM_Value _this;
    JSVM_Status status;
    NODE_API_CALL(status, env,
                  OH_JSVM_GetCbInfo(env, info, nullptr, nullptr, &_this, nullptr));
    void* obj = nullptr;
    status = OH_JSVM_Unwrap(env, _this, &obj);
    se::State state(reinterpret_cast<se::Object*>(obj));
    bool ret = func(state);
    if (!ret) {
        SE_LOGE("[ERROR] Failed to invoke %s, location: %s:%d\n", funcName, __FILE__, __LINE__);
        return nullptr;
    }
    JSVM_Value retVal;
    se::internal::setReturnValue(state.rval(), retVal);
    return retVal;
}

SE_HOT JSVM_Value jsbSetterWrapper(JSVM_Env env, JSVM_CallbackInfo info, se_function_ptr func, const char *funcName) {
    JSVM_Status status;
    size_t argc = 1;
    JSVM_Value args[1];
    JSVM_Value _this;
    se::Value data;
    NODE_API_CALL(status, env, OH_JSVM_GetCbInfo(env, info, &argc, args, &_this, nullptr));
    se::internal::jsToSeValue(args[0], &data);
    se::ValueArray args2;
    args2.reserve(10);
    args2.push_back(std::move(data));
    void* nativeThisObject = nullptr;
    status = OH_JSVM_Unwrap(env, _this, &nativeThisObject);
    se::State state(reinterpret_cast<se::Object*>(nativeThisObject), args2);
    bool ret = func(state);
    if (!ret) {
        SE_LOGE("[ERROR] Failed to invoke %s, location: %s:%d\n", funcName, __FILE__, __LINE__);
    }
    return nullptr;
}
