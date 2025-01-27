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
#include "ark_runtime/jsvm.h"
#include "platform/openharmony/napi/native_common.h"

// Empty value so that macros here are able to return NULL or void
#define NODE_API_RETVAL_NOTHING // Intentionally blank #define

// Returns NULL on failed assertion.
// This is meant to be used inside JSVM_Callback methods.
#define NODE_API_ASSERT(env, assertion, message) \
    NODE_API_ASSERT_BASE(env, assertion, message, NULL)

// Returns empty on failed assertion.
// This is meant to be used inside functions with void return type.
#define NODE_API_ASSERT_RETURN_VOID(env, assertion, message) \
    NODE_API_ASSERT_BASE(env, assertion, message, NODE_API_RETVAL_NOTHING)

#define NODE_API_CALL_BASE(env, the_call, ret_val)                        \
    do {                                                                  \
        if ((the_call) != JSVM_OK) {                                      \
            se::internal::logJsException((env), __FILE_NAME__, __LINE__); \
        }                                                                 \
    } while (0)

// Returns nullptr if the_call doesn't return JSVM_OK.
#define NODE_API_CALL(status, env, the_call)                                 \
    do {                                                                     \
        status = the_call;                                                   \
        if (status != JSVM_OK) {                                             \
            se::internal::logJsException((env), __FILE_NAME__, __LINE__);    \
        }                                                                    \
    } while (0)

// Returns empty if the_call doesn't return JSVM_OK.
#define NODE_API_CALL_RETURN_VOID(env, the_call) \
    NODE_API_CALL_BASE(env, the_call, NODE_API_RETVAL_NOTHING)

#define DECLARE_NODE_API_PROPERTY(name, func) \
    { (name), nullptr, (func), nullptr, nullptr, nullptr, JSVM_DEFAULT, nullptr }

#define DECLARE_NODE_API_GETTER(name, func) \
    { (name), nullptr, nullptr, (func), nullptr, nullptr, JSVM_DEFAULT, nullptr }

#define JSVM_CALL_BASE(theCall, retVal) \
    do {                                \
        if((theCall) != JSVM_OK){       \
            return retVal;              \
        }                               \
    } while (0)

#define JSVM_CALL_RETURN_VOID(theCall) JSVM_CALL_BASE(theCall, NODE_API_RETVAL_NOTHING)

void add_returned_status(JSVM_Env env,
                         const char* key,
                         JSVM_Value object,
                         char* expected_message,
                         JSVM_Status expected_status,
                         JSVM_Status actual_status);

void add_last_status(JSVM_Env env, const char* key, JSVM_Value return_value);
