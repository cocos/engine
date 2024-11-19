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

#include "jsb_platform.h"

#include "cocos/bindings/jswrapper/SeApi.h"
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/bindings/manual/jsb_global_init.h"
#include "cocos/platform/FileUtils.h"
#include <native_drawing/drawing_font_collection.h>
#include <native_drawing/drawing_register_font.h>
#include <regex>

using namespace cc;
static std::unordered_map<std::string, OH_Drawing_FontCollection*> _fontCollectionMap = {
    { defaultFontKey, OH_Drawing_CreateSharedFontCollection() }
};

const std::unordered_map<std::string, OH_Drawing_FontCollection*>& getFontFamilyCollectionMap() {
    return _fontCollectionMap;
}

static std::unordered_map<std::string, std::string> _fontFamilyNameMap;

const std::unordered_map<std::string, std::string> &getFontFamilyNameMap() {
    return _fontFamilyNameMap;
}

static bool JSB_loadFont(se::State &s) {
    const auto& args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc >= 1) {
        s.rval().setNull();
 
        std::string fontFamily;
        ok &= seval_to_std_string(args[0], &fontFamily);
        SE_PRECONDITION2(ok, false, "JSB_loadFont : Error processing argument: fontFamily");
 
        std::string source;
        ok &= seval_to_std_string(args[1], &source);
        SE_PRECONDITION2(ok, false, "JSB_loadFont : Error processing argument: source");
 
        std::string fontFilePath;
        std::regex re("url\\(\\s*'\\s*(.*?)\\s*'\\s*\\)");
        std::match_results<std::string::const_iterator> results;
        if (std::regex_search(source.cbegin(), source.cend(), results, re))
        {
            fontFilePath = results[1].str();
        }
 
        fontFilePath = FileUtils::getInstance()->fullPathForFilename(fontFilePath);
        if (fontFilePath.empty())
        {
            SE_LOGE("Font (%s) doesn't exist!", fontFilePath.c_str());
            return true;
        }

        OH_Drawing_FontCollection *_fontCollection = OH_Drawing_CreateSharedFontCollection();
        Data bufferData = FileUtils::getInstance()->getDataFromFile(fontFilePath);
        if (bufferData.isNull()) {
            SE_LOGE("bufferData read error (%s)!", fontFilePath.c_str());
            return true;
        }
        OH_Drawing_RegisterFontBuffer(_fontCollection, fontFamily.c_str(), bufferData.getBytes(), bufferData.getSize());
        _fontCollectionMap.emplace(fontFamily, _fontCollection);
        s.rval().setString(fontFamily);
        
        return true;
    }
 
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_loadFont)

bool register_platform_bindings(se::Object *obj) {
    __jsbObj->defineFunction("loadFont", _SE(JSB_loadFont));
    return true;
}
