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

#ifndef FOUNDATION_ACE_NAPI_INTERFACES_KITS_NAPI_NATIVE_COMMON_H
#define FOUNDATION_ACE_NAPI_INTERFACES_KITS_NAPI_NATIVE_COMMON_H

#define DEPRECATED __attribute__((__deprecated__))

#ifndef NAPI_VERSION
#define NAPI_VERSION 8
#endif

#define NAPI_RETVAL_NOTHING

#define GET_AND_THROW_LAST_ERROR(env)                                                                   \
    do {                                                                                                \
        const napi_extended_error_info* errorInfo = nullptr;                                            \
        napi_get_last_error_info((env), &errorInfo);                                                    \
        bool isPending = false;                                                                         \
        napi_is_exception_pending((env), &isPending);                                                   \
        if (!isPending && errorInfo != nullptr) {                                                       \
            const char* errorMessage =                                                                  \
                errorInfo->error_message != nullptr ? errorInfo->error_message : "empty error message"; \
            napi_throw_error((env), nullptr, errorMessage);                                             \
        }                                                                                               \
    } while (0)

#define NAPI_ASSERT_BASE(env, assertion, message, retVal)                                    \
    do {                                                                                     \
        if (!(assertion)) {                                                                  \
            napi_throw_error((env), nullptr, "assertion (" #assertion ") failed: " message); \
            return retVal;                                                                   \
        }                                                                                    \
    } while (0)

#define NAPI_ASSERT(env, assertion, message) NAPI_ASSERT_BASE(env, assertion, message, nullptr)

#define NAPI_ASSERT_RETURN_VOID(env, assertion, message) NAPI_ASSERT_BASE(env, assertion, message, NAPI_RETVAL_NOTHING)

#define NAPI_CALL_BASE(env, theCall, retVal) \
    do {                                     \
        if ((theCall) != napi_ok) {          \
            GET_AND_THROW_LAST_ERROR((env)); \
            return retVal;                   \
        }                                    \
    } while (0)

#define NAPI_CALL(env, theCall) NAPI_CALL_BASE(env, theCall, nullptr)

#define NAPI_CALL_RETURN_VOID(env, theCall) NAPI_CALL_BASE(env, theCall, NAPI_RETVAL_NOTHING)

#define DECLARE_NAPI_PROPERTY(name, val)                                       \
    {                                                                          \
        (name), nullptr, nullptr, nullptr, nullptr, val, napi_default, nullptr \
    }

#define DECLARE_NAPI_STATIC_PROPERTY(name, val)                               \
    {                                                                         \
        (name), nullptr, nullptr, nullptr, nullptr, val, napi_static, nullptr \
    }

#define DECLARE_NAPI_FUNCTION(name, func)                                         \
    {                                                                             \
        (name), nullptr, (func), nullptr, nullptr, nullptr, napi_default, nullptr \
    }

#define DECLARE_NAPI_FUNCTION_WITH_DATA(name, func, data)                         \
    {                                                                             \
        (name), nullptr, (func), nullptr, nullptr, nullptr, napi_default, data    \
    }

#define DECLARE_NAPI_STATIC_FUNCTION(name, func)                                 \
    {                                                                            \
        (name), nullptr, (func), nullptr, nullptr, nullptr, napi_static, nullptr \
    }

#define DECLARE_NAPI_GETTER(name, getter)                                           \
    {                                                                               \
        (name), nullptr, nullptr, (getter), nullptr, nullptr, napi_default, nullptr \
    }

#define DECLARE_NAPI_SETTER(name, setter)                                           \
    {                                                                               \
        (name), nullptr, nullptr, nullptr, (setter), nullptr, napi_default, nullptr \
    }

#define DECLARE_NAPI_GETTER_SETTER(name, getter, setter)                             \
    {                                                                                \
        (name), nullptr, nullptr, (getter), (setter), nullptr, napi_default, nullptr \
    }

#endif /* FOUNDATION_ACE_NAPI_INTERFACES_KITS_NAPI_NATIVE_COMMON_H */
