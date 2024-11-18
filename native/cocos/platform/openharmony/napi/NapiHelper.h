/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

#pragma once

#define NODE_ADDON_API_ENABLE_TYPE_CHECK_ON_AS 1
#define NAPI_DISABLE_CPP_EXCEPTIONS 1
#define NODE_ADDON_API_DISABLE_DEPRECATED 1
#include "napi.h"
#include "NapiValueConverter.h"
#include "base/Log.h"

namespace cc {
using CallbackParamType = std::variant<std::string, double, bool>;

struct AsyncCallParam {
    std::function<void(CallbackParamType)> cb;
    std::string paramStr;
    napi_value callFunc;
    napi_ref executeFuncRef;
};

class NapiHelper {
public:
    static Napi::Env getWorkerEnv();
    static Napi::Object init(Napi::Env env, Napi::Object exports);
    static Napi::Value napiCallFunction(const char* functionName);
    static Napi::Value napiCallFunction(const char *functionName,float duration);
    static void postMessageToUIThread(const std::string& type, Napi::Value param);
    static Napi::Value postSyncMessageToUIThread(const std::string& type, Napi::Value param);
};

class JSFunction {
public:
    napi_ref funcRef;
    napi_env env;
    char* name = nullptr;

public:
    static std::unordered_map<std::string, JSFunction> FUNCTION_MAP;

    explicit JSFunction(char* name, napi_env env, napi_ref funcRef)
        : name(name), env(env), funcRef(funcRef){}

    explicit JSFunction(char* name, napi_env env)
        : name(name), env(env){}

    explicit JSFunction(char* name)
        : name(name){}

    static JSFunction getFunction(std::string functionName)
    {
        return FUNCTION_MAP.at(functionName);
    }

    static void addFunction(std::string name, JSFunction* jsFunction) {
        FUNCTION_MAP.emplace(name, *jsFunction);
    }

    template<typename ReturnType, typename... Args>
    typename std::enable_if<!std::is_same<ReturnType, void>::value, ReturnType>::type
    invoke(Args... args) {
        napi_value global;
        napi_status status = napi_get_global(env, &global);
        //if (status != napi_ok) return;

        napi_value func;
        status = napi_get_reference_value(env, funcRef, &func);

        napi_value jsArgs[sizeof...(Args)] = {NapiValueConverter::ToNapiValue(env, args)...};
        napi_value return_val;
        status = napi_call_function(env, global, func, sizeof...(Args), jsArgs, &return_val);

        ReturnType value;
        if (!NapiValueConverter::ToCppValue(env, return_val, value)) {
            // Handle error here
        }
        return value;
    }

    template<typename ReturnType, typename... Args>
    typename std::enable_if<std::is_same<ReturnType, void>::value, void>::type
    invoke(Args... args) {
        napi_value global;
        napi_status status = napi_get_global(env, &global);
        if (status != napi_ok) return;

        napi_value func;
        status = napi_get_reference_value(env, funcRef, &func);

        napi_value jsArgs[sizeof...(Args)] = {NapiValueConverter::ToNapiValue(env, args)...};
        napi_value return_val;
        status = napi_call_function(env, global, func, sizeof...(Args), jsArgs, &return_val);
    }

    void invokeAsync(AsyncCallParam *callParam) {
        callParam->executeFuncRef = funcRef;

        napi_status status;
        napi_value func;
        status = napi_get_reference_value(env, funcRef, &func);
        if (status != napi_ok) {
            CC_LOG_WARNING("invokeAsync napi_get_reference_value fail,status=%{public}d", status);
            return;
        }

        napi_value workName;
        status = napi_create_string_utf8(env, "Thread-safe call from async work", NAPI_AUTO_LENGTH, &workName);
        if (status != napi_ok) {
            CC_LOG_WARNING("invokeAsync napi_create_string_utf8 fail,status=%{public}d", status);
            return;
        }

        napi_threadsafe_function save_func;
        status = napi_create_threadsafe_function(env, func, nullptr, workName, 0, 1, nullptr,
        [](napi_env env, void *raw, void *hint) {}, callParam, CallJS, &save_func);
        if (status != napi_ok) {
            CC_LOG_WARNING("invokeAsync napi_create_threadsafe_function fail,status=%{public}d", status);
            return;
        }

        status = napi_acquire_threadsafe_function(save_func);
        if (status != napi_ok) {
            CC_LOG_WARNING("invokeAsync napi_acquire_threadsafe_function fail,status=%{public}d", status);
            return;
        }

        status = napi_call_threadsafe_function(save_func, NULL, napi_tsfn_blocking);
        if (status != napi_ok) {
            CC_LOG_WARNING("invokeAsync napi_call_threadsafe_function fail,status=%{public}d", status);
            return;
        }
    }

    static void CallJS(napi_env env, napi_value js_cb, void *context, void *data) {
        AsyncCallParam *callParam = (AsyncCallParam*) (context);
        if (callParam == nullptr) {
            CC_LOG_WARNING("CallJS AsyncCallParam callParam is null");
            return;
        }

        napi_status status;
        status = napi_get_reference_value(env, callParam->executeFuncRef, &js_cb);
        if (status != napi_ok) {
            CC_LOG_WARNING("CallJS napi_get_reference_value fail,status=%{public}d", status);
            return;
        }

        auto callback = [](napi_env env, napi_callback_info info) -> napi_value {
            size_t argc = 1;
            napi_value args[1] = {};
            void *param_in = nullptr;
            napi_get_cb_info(env, info, &argc, args, nullptr, &param_in);

            napi_value return_val;
            napi_get_undefined(env, &return_val);

            AsyncCallParam *callbackParam = reinterpret_cast<AsyncCallParam *>(param_in);
            if (callbackParam == nullptr) {
                CC_LOG_WARNING("CallJS AsyncCallParam callbackParam is null");
                return return_val;
            }

            napi_valuetype type;
            napi_typeof(env, args[0], &type);

            CallbackParamType callbackValue;

            if (type == napi_string) {
                std::string resultStr;
                NapiValueConverter::ToCppValue(env, args[0], resultStr);
                callbackValue = std::move(resultStr);
            } else if (type == napi_number) {
                double resultNum;
                NapiValueConverter::ToCppValue(env, args[0], resultNum);
                callbackValue = resultNum;
            } else if (type == napi_boolean) {
                bool resultBol;
                NapiValueConverter::ToCppValue(env, args[0], resultBol);
                callbackValue = resultBol;
            } else {
                callbackValue = "unknown";
            }
            callbackParam->cb(callbackValue);
            return return_val;
        };

        napi_value callbackFunc = nullptr;
        status = napi_create_function(env, "callbackFunc", NAPI_AUTO_LENGTH, callback, callParam, &callbackFunc);
        if (status != napi_ok) {
            CC_LOG_WARNING("CallJS napi_create_function fail,status=%{public}d", status);
            return;
        }

        napi_value jsArgs[3] = {callParam->callFunc, NapiValueConverter::ToNapiValue(env, callParam->paramStr), callbackFunc};
        napi_value return_val;
        napi_value global;
        status = napi_get_global(env, &global);
        if (status != napi_ok) {
            CC_LOG_WARNING("CallJS napi_get_global fail,status=%{public}d", status);
        }

        status = napi_call_function(env, global, js_cb, 3, jsArgs, &return_val);
        if (status != napi_ok) {
            CC_LOG_WARNING("CallJS napi_call_function fail,status=%{public}d", status);
        }
    }
};

}  // namespace cc
