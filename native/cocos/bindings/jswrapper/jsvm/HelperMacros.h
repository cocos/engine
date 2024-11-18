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

#pragma once

#include "CommonHeader.h"
#if !defined(_WIN)
    #include <hilog/log.h>

    #ifndef LOGI
        #define LOGI(...) ((void) OH_LOG_Print(LOG_APP, LOG_INFO, LOG_DOMAIN, "HMG_LOG", __VA_ARGS__))
        #define LOGW(...) ((void) OH_LOG_Print(LOG_APP, LOG_WARN, LOG_DOMAIN, "HMG_LOG", __VA_ARGS__))
        #define LOGE(...) ((void) OH_LOG_Print(LOG_APP, LOG_ERROR, LOG_DOMAIN, "HMG_LOG", __VA_ARGS__))
        #define LOGD(...) ((void) OH_LOG_Print(LOG_APP, LOG_DEBUG, LOG_DOMAIN, "HMG_LOG", __VA_ARGS__))
    #endif
#else
    #define LOGI
    #define LOGW
    #define LOGE
#endif
namespace se {
class Class;
class Object;
class State;
} // namespace se
using se_function_ptr = bool (*)(se::State &state);
using se_finalize_ptr = void (*)(JSVM_Env env, void *nativeObject, void *hint);

JSVM_Value jsbFunctionWrapper(JSVM_Env, JSVM_CallbackInfo, se_function_ptr, const char *);
void jsbFinalizeWrapper(void *thisObject, se_function_ptr, const char *);
JSVM_Value jsbConstructorWrapper(JSVM_Env, JSVM_CallbackInfo, se_function_ptr, se_finalize_ptr finalizeCb, se::Class *,
                                 const char *);
JSVM_Value jsbGetterWrapper(JSVM_Env, JSVM_CallbackInfo, se_function_ptr, const char *);
JSVM_Value jsbSetterWrapper(JSVM_Env, JSVM_CallbackInfo, se_function_ptr, const char *);
#ifdef __GNUC__
    #define SE_UNUSED __attribute__((unused))
    #define SE_HOT    __attribute__((hot))
#else
    #define SE_UNUSED
    #define SE_HOT
#endif

template <typename T, typename STATE>
constexpr inline T *SE_THIS_OBJECT(STATE &s) { // NOLINT(readability-identifier-naming)
    return reinterpret_cast<T *>(s.nativeThisObject());
}

#define SAFE_INC_REF(obj) \
    if (obj != nullptr)   \
    obj->incRef()
#define SAFE_DEC_REF(obj)   \
    if ((obj) != nullptr) { \
        (obj)->decRef();    \
        (obj) = nullptr;    \
    }

#define SE_QUOTEME_(x)            #x // NOLINT(readability-identifier-naming)
#define SE_QUOTEME(x)             SE_QUOTEME_(x)
#define SE_REPORT_ERROR(fmt, ...) SE_LOGE("[ERROR] (" __FILE__ ", " SE_QUOTEME(__LINE__) "): " fmt "\n", ##__VA_ARGS__)

#define SE_BIND_PROP_GET_IMPL(funcName, postFix)                                                              \
    JSVM_Value funcName##postFix##Registry(JSVM_Env env, JSVM_CallbackInfo info) {                            \
        return jsbGetterWrapper(env, info, funcName, #funcName);                                              \
    }                                                                                                         \
    JSVM_CallbackStruct funcName##postFix##RegistryStruct = {(funcName##postFix##Registry),nullptr};

#define SE_BIND_PROP_GET(funcName)         SE_BIND_PROP_GET_IMPL(funcName, )
#define SE_BIND_FUNC_AS_PROP_GET(funcName) SE_BIND_PROP_GET_IMPL(funcName, _asGetter)

#define SE_BIND_PROP_SET_IMPL(funcName, postFix)                                                              \
    JSVM_Value funcName##postFix##Registry(JSVM_Env env, JSVM_CallbackInfo info) {                            \
        return jsbSetterWrapper(env, info, funcName, #funcName);                                              \
    }                                                                                                         \
    JSVM_CallbackStruct funcName##postFix##RegistryStruct = {(funcName##postFix##Registry),nullptr};

#define SE_BIND_PROP_SET(funcName)         SE_BIND_PROP_SET_IMPL(funcName, )
#define SE_BIND_FUNC_AS_PROP_SET(funcName) SE_BIND_PROP_SET_IMPL(funcName, _asSetter)

#define SE_DECLARE_FUNC(funcName)                                                                             \
    JSVM_Value funcName##Registry(JSVM_Env env, JSVM_CallbackInfo info);                                      \
    extern JSVM_CallbackStruct funcName##RegistryStruct;                                                      

#define SE_BIND_FUNC(funcName)                                                                          \
    JSVM_Value funcName##Registry(JSVM_Env env, JSVM_CallbackInfo info) {                               \
        return jsbFunctionWrapper(env, info, funcName, #funcName);                                      \
    }                                                                                                   \
    JSVM_CallbackStruct funcName##RegistryStruct = {(funcName##Registry),nullptr};

#define SE_BIND_FUNC_FAST(funcName)                                                                      \
    JSVM_Value funcName##Registry(JSVM_Env env, JSVM_CallbackInfo info) {                                \
        JSVM_Status status;                                                                              \
        JSVM_Value _this;                                                                                \
        size_t argc = 15;                                                                                \
        JSVM_Value args[15];                                                                             \
        void *nativeThisObject = nullptr;                                                                \
        NODE_API_CALL(status, env, OH_JSVM_GetCbInfo(env, info, &argc, args, &_this, NULL));             \
        status = OH_JSVM_Unwrap(env, _this, &nativeThisObject);                                          \
        auto *nativeObject = nativeThisObject != nullptr ? ((se::Object*)nativeThisObject)->getPrivateData() : nullptr; \
        funcName(nativeObject);                                                                          \
        return nullptr;                                                                                  \
    }                                                                                                    \
    JSVM_CallbackStruct funcName##RegistryStruct = {(funcName##Registry),nullptr};

#define SE_BIND_CTOR(funcName, cls, finalizeCb)                                                       \
    JSVM_Value funcName##Registry(JSVM_Env env, JSVM_CallbackInfo info) {                             \
        return jsbConstructorWrapper(env, info, funcName, _SE(finalizeCb), cls, #funcName);           \
    }                                                                                                 \
    JSVM_CallbackStruct funcName##RegistryStruct = {(funcName##Registry),nullptr};


#define SE_BIND_SUB_CLS_CTOR SE_BIND_CTOR

#define SE_DECLARE_FINALIZE_FUNC(funcName)                                                            \
    void funcName##RegistryStruct(JSVM_Env env, void *nativeObject, void * /*finalize_hint*/);        \

#define SE_BIND_FINALIZE_FUNC(funcName)                                                               \
    void funcName##RegistryStruct(JSVM_Env env, void *nativeObject, void *hint /*finalize_hint*/) {   \
        if (nativeObject == nullptr) {                                                                \
            return;                                                                                   \
        }                                                                                             \
        jsbFinalizeWrapper(nativeObject, funcName, #funcName);                                        \
    }

#define _SE(name) &(name##RegistryStruct) 