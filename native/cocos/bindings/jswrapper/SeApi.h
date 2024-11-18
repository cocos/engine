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

#include "config.h"

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_SM
    #include "sm/SeApi.h"
#endif

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_V8
    #include "v8/SeApi.h"
#endif

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_JSC
    #include "jsc/SeApi.h"
#endif

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_CHAKRACORE
    #include "chakracore/SeApi.h"
#endif

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_NAPI
    #include "napi/SeApi.h"
#endif

#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_JSVM
    #include "jsvm/SeApi.h"
#endif

#include "HandleObject.h"
#include "Object.h"
#include "State.h"
#include "Value.h"
