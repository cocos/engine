/****************************************************************************
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
#include "base/std/container/string.h"
#include "base/std/container/unordered_map.h"

#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY
#include <string>
#include <native_drawing/drawing_text_declaration.h>
#endif
namespace se {
class Object;
}

bool register_platform_bindings(se::Object *obj); // NOLINT[readability-identifier-naming]
const ccstd::unordered_map<ccstd::string, ccstd::string> &getFontFamilyNameMap();
#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY
const std::string defaultFontKey = "openharmony_system_font";
const std::unordered_map<std::string, OH_Drawing_FontCollection*>& getFontFamilyCollectionMap();
#endif
