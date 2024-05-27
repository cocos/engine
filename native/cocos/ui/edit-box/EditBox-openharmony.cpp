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

#include "EditBox.h"
#include "EditBox-openharmony.h"

#include "application/ApplicationManager.h"
#include "platform/openharmony/napi/NapiHelper.h"
#include "bindings/jswrapper/SeApi.h"
namespace cc {

/*************************************************************************
 Global variables and functions.
************************************************************************/

namespace {
se::Value g_textInputCallback;

void getTextInputCallback() {
    if (!g_textInputCallback.isUndefined())
        return;

    auto global = se::ScriptEngine::getInstance()->getGlobalObject();
    se::Value jsbVal;
    if (global->getProperty("jsb", &jsbVal) && jsbVal.isObject()) {
        jsbVal.toObject()->getProperty("onTextInput", &g_textInputCallback);
        // free globle se::Value before ScriptEngine clean up
        se::ScriptEngine::getInstance()->addBeforeCleanupHook([]() {
            g_textInputCallback.setUndefined();
        });
    }
}

void callJSFunc(const ccstd::string &type, const ccstd::string &text) {
    getTextInputCallback();

    se::AutoHandleScope scope;
    se::ValueArray args;
    args.push_back(se::Value(type));
    args.push_back(se::Value(text));
    g_textInputCallback.toObject()->call(args, nullptr);
}

} // namespace

/*************************************************************************
Implementation of EditBox.
************************************************************************/
void EditBox::show(const EditBox::ShowInfo &showInfo) {
    auto env = NapiHelper::getWorkerEnv();
    auto args = Napi::Object::New(env);
    args["defaultValue"] = Napi::String::New(env, showInfo.defaultValue);
    args["confirmType"] = Napi::String::New(env, showInfo.confirmType);
    args["inputType"] = Napi::String::New(env, showInfo.inputType);
    
    args["maxLength"] = Napi::Number::New(env, showInfo.maxLength);
    args["x"] = Napi::Number::New(env, showInfo.x);
    args["y"] = Napi::Number::New(env, showInfo.y);
    args["width"] = Napi::Number::New(env, showInfo.width);
    args["height"] = Napi::Number::New(env, showInfo.height);
    
    args["confirmHold"] = Napi::Boolean::New(env, showInfo.confirmHold);
    args["isMultiline"] = Napi::Boolean::New(env, showInfo.isMultiline);

    args["fontSize"] = Napi::Number::New(env, showInfo.fontSize);
    args["fontColor"] = Napi::Number::New(env, showInfo.fontColor);
    args["backColor"] = Napi::Number::New(env, showInfo.backColor);
    args["backgroundColor"] = Napi::Number::New(env, showInfo.backgroundColor);

    args["isBold"] = Napi::Boolean::New(env, showInfo.isBold);
    args["isItalic"] = Napi::Boolean::New(env, showInfo.isItalic);
    args["isUnderline"] = Napi::Boolean::New(env, showInfo.isUnderline);

    args["underlineColor"] = Napi::Number::New(env, showInfo.underlineColor);
    args["textAlignment"] = Napi::Number::New(env, showInfo.textAlignment);
    
    NapiHelper::postMessageToUIThread("showEditBox", args);
}

void EditBox::hide() {
    NapiHelper::postMessageToUIThread("hideEditBox", Napi::String::New(NapiHelper::getWorkerEnv(), ""));
}

bool EditBox::complete() {
    callJSFunc("complete", "");
    return true;
}

void OpenHarmonyEditBox::napiOnComplete(const Napi::CallbackInfo &info) {
    EditBox::complete();
}

void OpenHarmonyEditBox::napiOnTextChange(const Napi::CallbackInfo &info) {
    auto env = info.Env();
    if (info.Length() != 1) {
        Napi::Error::New(env, "napiOnTextChange, 1 argument expected").ThrowAsJavaScriptException();
        return;
    }

    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "napiOnTextChange, string argument expected").ThrowAsJavaScriptException();
        return;
    }

    ccstd::string buffer = info[0].As<Napi::String>().Utf8Value();
    callJSFunc("input", buffer);
}


void OpenHarmonyEditBox::napiOnConfirm(const Napi::CallbackInfo &info) {
    auto env = info.Env();
    if (info.Length() != 1) {
        Napi::Error::New(env, "napiOnConfirm, 1 argument expected").ThrowAsJavaScriptException();
        return;
    }

    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "napiOnConfirm, string argument expected").ThrowAsJavaScriptException();
        return;
    }
    ccstd::string buffer = info[0].As<Napi::String>().Utf8Value();
    callJSFunc("confirm", buffer);
}

} // namespace cc


