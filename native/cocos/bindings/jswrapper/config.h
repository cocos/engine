/****************************************************************************
 Copyright (c) 2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

#pragma once

#include <cstdio>

#include "base/Log.h"

#define SCRIPT_ENGINE_NONE 0
#define SCRIPT_ENGINE_SM   1
#define SCRIPT_ENGINE_V8   2
#define SCRIPT_ENGINE_NAPI 5
#define SCRIPT_ENGINE_JSVM 6

#ifndef SCRIPT_ENGINE_TYPE
#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY
    #define SCRIPT_ENGINE_TYPE SCRIPT_ENGINE_NAPI
#else
    #define SCRIPT_ENGINE_TYPE SCRIPT_ENGINE_V8
#endif
#endif

#define SE_LOG_TO_JS_ENV 0 // print log to JavaScript environment, for example DevTools

#if !defined(ANDROID_INSTANT) && defined(USE_V8_DEBUGGER) && USE_V8_DEBUGGER > 0
    #define SE_ENABLE_INSPECTOR 1
    #define SE_DEBUG            2
    #define HAVE_INSPECTOR      1
#else
    #define SE_ENABLE_INSPECTOR 0
    #define SE_DEBUG            0
    #define HAVE_INSPECTOR      0
#endif

#if defined(__clang__) || defined(__GNUC__)
    #define CC_FORMAT_HINT(si, fi) __attribute__((__format__(__printf__, si, fi)))
#else
    #define CC_FORMAT_HINT(si, fi)
#endif

CC_FORMAT_HINT(3, 4)
void selogMessage(cc::LogLevel level, const char *tag, const char *format, ...);

#if CC_DEBUG
#define SE_LOGD(...) selogMessage(cc::LogLevel::LEVEL_DEBUG, "D/", ##__VA_ARGS__)
#else
#define SE_LOGD(...)
#endif
#define SE_LOGE(...) selogMessage(cc::LogLevel::ERR, "E/", ##__VA_ARGS__)

#if defined(__unix__) || (defined(__APPLE__) && defined(__MACH__))

    #define __POSIX__ //NOLINT

#endif

#if defined(_WIN32) && defined(_WINDOWS)
    #include <BaseTsd.h>

    #if !defined(__SSIZE_T)
typedef SSIZE_T ssize_t;
        #define __SSIZE_T
        #define _SSIZE_T_DEFINED // libuv also defines ssize_t, use the one defined here.
    #endif                       // __SSIZE_T

#endif // #if defined(_WIN32) && defined(_WINDOWS)

/** @def SE_DEPRECATED_ATTRIBUTE
 * Only certain compilers support __attribute__((deprecated)).
 */
#if defined(__GNUC__) && ((__GNUC__ >= 4) || ((__GNUC__ == 3) && (__GNUC_MINOR__ >= 1)))
    #define SE_DEPRECATED_ATTRIBUTE __attribute__((deprecated))
#elif _MSC_VER >= 1400 //vs 2005 or higher
    #define SE_DEPRECATED_ATTRIBUTE __declspec(deprecated)
#else
    #define SE_DEPRECATED_ATTRIBUTE
#endif // SE_DEPRECATED_ATTRIBUTE

#if defined(__GNUC__) && __GNUC__ >= 4
    #define SE_LIKELY(x)   (__builtin_expect((x), 1))
    #define SE_UNLIKELY(x) (__builtin_expect((x), 0))
#else
    #define SE_LIKELY(x)   (x)
    #define SE_UNLIKELY(x) (x)
#endif
