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
#include "platform/openharmony/napi/NapiHelper.h"

#include <ace/xcomponent/native_interface_xcomponent.h>

#include "bindings/jswrapper/SeApi.h"
#include "platform/interfaces//modules/IScreen.h"
#include "platform/openharmony/FileUtils-OpenHarmony.h"
#include "platform/openharmony/OpenHarmonyPlatform.h"
#include "platform/openharmony/modules/SystemWindow.h"

#if CC_USE_EDITBOX
    #include "ui/edit-box/EditBox-openharmony.h"
#endif
#if CC_USE_WEBVIEW
    #include "ui/webview/WebViewImpl-openharmony.h"
#endif

namespace cc {

// Must be the same as the value called by js
enum ContextType {
    APP_LIFECYCLE = 0,
    JS_PAGE_LIFECYCLE,
    XCOMPONENT_CONTEXT,
    XCOMPONENT_REGISTER_LIFECYCLE_CALLBACK,
    NATIVE_RENDER_API,
    WORKER_INIT,
    ENGINE_UTILS,
    EDITBOX_UTILS,
    WEBVIEW_UTILS,
    DISPLAY_UTILS,
    UV_ASYNC_SEND,
    VIDEO_UTILS
};

#define KEYCODE_BACK_OH 6

static Napi::Env gWorkerEnv(nullptr);
static Napi::FunctionReference *gPostMessageToUIThreadFunc = nullptr;
static Napi::FunctionReference *gPostSyncMessageToUIThreadFunc = nullptr;

#define DEFINE_FUNCTION_CALLBACK(functionName, cachedFunctionRefPtr)                                             \
    static void functionName(const Napi::CallbackInfo &info) {                                                   \
        Napi::Env env = info.Env();                                                                              \
        if (info.Length() != 1) {                                                                                \
            Napi::Error::New(env, "setPostMessageFunction, 1 argument expected").ThrowAsJavaScriptException();   \
            return;                                                                                              \
        }                                                                                                        \
                                                                                                                 \
        if (!info[0].IsFunction()) {                                                                             \
            Napi::TypeError::New(env, "setPostMessageFunction, function expected").ThrowAsJavaScriptException(); \
            return;                                                                                              \
        }                                                                                                        \
                                                                                                                 \
        delete cachedFunctionRefPtr;                                                                             \
        cachedFunctionRefPtr = new Napi::FunctionReference(Napi::Persistent(info[0].As<Napi::Function>()));      \
    }

DEFINE_FUNCTION_CALLBACK(js_set_PostMessage2UIThreadCallback, gPostMessageToUIThreadFunc)
DEFINE_FUNCTION_CALLBACK(js_set_PostSyncMessage2UIThreadCallback, gPostSyncMessageToUIThreadFunc)

/* static */
void NapiHelper::postMessageToUIThread(const std::string &type, Napi::Value param) {
    if (gPostMessageToUIThreadFunc == nullptr) {
        CC_LOG_ERROR("callback was not set %s, type: %s", __FUNCTION__, type.c_str());
        return;
    }
    gPostMessageToUIThreadFunc->Call({Napi::String::New(getWorkerEnv(), type), param});
}

/* static */
Napi::Value NapiHelper::postSyncMessageToUIThread(const std::string &type, Napi::Value param) {
    if (gPostSyncMessageToUIThreadFunc == nullptr) {
        CC_LOG_ERROR("callback was not set %s, type: %s", __FUNCTION__, type.c_str());
        return getWorkerEnv().Undefined();
    }

    // it return a promise object
    return gPostSyncMessageToUIThreadFunc->Call({Napi::String::New(getWorkerEnv(), type), param}).As<Napi::Promise>();
}

/* static */
Napi::Value NapiHelper::napiCallFunction(const char *functionName) {
    auto env = getWorkerEnv();
    auto funcVal = env.Global().Get(functionName);
    if (!funcVal.IsFunction()) {
        return {};
    }
    return funcVal.As<Napi::Function>().Call(env.Global(), {});
}

/* static */
Napi::Value NapiHelper::napiCallFunction(const char *functionName, float duration) {
    auto env = getWorkerEnv();
    auto funcVal = env.Global().Get(functionName);
    if (!funcVal.IsFunction()) {
        return {};
    }
    const std::initializer_list<napi_value> args = {Napi::Number::New(env, duration)};
    return funcVal.As<Napi::Function>().Call(env.Global(), args);
}

// NAPI Interface
static bool exportFunctions(Napi::Object exports) {
    Napi::MaybeOrValue<Napi::Value> xcomponentObject = exports.Get(OH_NATIVE_XCOMPONENT_OBJ);
    if (!xcomponentObject.IsObject()) {
        CC_LOG_ERROR("Could not get property: %s", OH_NATIVE_XCOMPONENT_OBJ);
        return false;
    }

    auto *nativeXComponent = Napi::ObjectWrap<OH_NativeXComponent>::Unwrap(xcomponentObject.As<Napi::Object>());
    if (nativeXComponent == nullptr) {
        CC_LOG_ERROR("nativeXComponent is nullptr");
        return false;
    }

    OpenHarmonyPlatform::getInstance()->setNativeXComponent(nativeXComponent);
    return true;
}

// APP Lifecycle
static void napiOnCreate(const Napi::CallbackInfo &info) {
    // uv_loop_t* loop = nullptr;
    // NAPI_CALL(env, napi_get_uv_event_loop(env, &loop));
    // OpenHarmonyPlatform::getInstance()->onCreateNative(env, loop);
    CC_LOG_INFO("napiOnCreate");
}

static void napiOnShow(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiOnShow");
    cc::WorkerMessageData data{cc::MessageType::WM_APP_SHOW, nullptr, nullptr};
    OpenHarmonyPlatform::getInstance()->enqueue(data);
}

static void napiOnHide(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiOnHide");
    cc::WorkerMessageData data{cc::MessageType::WM_APP_HIDE, nullptr, nullptr};
    OpenHarmonyPlatform::getInstance()->enqueue(data);
}

static void napiOnBackPress(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("NapiHelper::napiOnBackPress");
    KeyboardEvent event;
    event.key = KEYCODE_BACK_OH;
    event.action = KeyboardEvent::Action::RELEASE;
    events::Keyboard::broadcast(event);
}

static void napiOnDestroy(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiOnDestroy");
    cc::WorkerMessageData data{cc::MessageType::WM_APP_DESTROY, nullptr, nullptr};
    OpenHarmonyPlatform::getInstance()->enqueue(data);
}

// JS Page : Lifecycle
static void napiOnPageShow(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiOnPageShow");
}

static void napiOnPageHide(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiOnPageHide");
}

static void napiNativeEngineInit(const Napi::CallbackInfo &info) {
#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_NAPI
    se::ScriptEngine::setEnv(info.Env());
#endif
    CC_LOG_INFO("napiNativeEngineInit before run");
    OpenHarmonyPlatform::getInstance()->run(0, nullptr);
    CC_LOG_INFO("napiNativeEngineInit after run");
}

static void napiNativeEngineStart(const Napi::CallbackInfo &info) {
    OpenHarmonyPlatform::getInstance()->requestVSync();
}

static void napiWorkerInit(const Napi::CallbackInfo &info) {
    CC_LOG_INFO("napiWorkerInit ...");
    Napi::Env env = info.Env();
    uv_loop_t *loop = nullptr;
    napi_status status = napi_get_uv_event_loop(napi_env(env), &loop);
    if (status != napi_ok) {
        CC_LOG_ERROR("napi_get_uv_event_loop failed!");
        return;
    }
    OpenHarmonyPlatform::getInstance()->workerInit(loop);
}

static void napiOnDisplayChange(const Napi::CallbackInfo &info) {
    if (info.Length() != 1) {
        Napi::Error::New(info.Env(), "1 argument expected").ThrowAsJavaScriptException();
        return;
    }

    int32_t rotation = info[0].As<Napi::Number>().Int32Value();

    int orientation = static_cast<int>(cc::IScreen::Orientation::PORTRAIT);
    switch (rotation) {
        case 0: // ROTATION_0
            orientation = static_cast<int>(cc::IScreen::Orientation::PORTRAIT);
            break;
        case 1: // ROTATION_90
            orientation = static_cast<int>(cc::IScreen::Orientation::LANDSCAPE_LEFT);
            break;
        case 2: // ROTATION_180
            orientation = static_cast<int>(cc::IScreen::Orientation::PORTRAIT_UPSIDE_DOWN);
            break;
        case 3: // ROTATION_270
            orientation = static_cast<int>(cc::IScreen::Orientation::LANDSCAPE_RIGHT);
            break;
    }
    cc::events::Orientation::broadcast(orientation);
}

static void napiResourceManagerInit(const Napi::CallbackInfo &info) {
    if (info.Length() != 1) {
        Napi::Error::New(info.Env(), "1 argument expected").ThrowAsJavaScriptException();
        return;
    }

    FileUtilsOpenHarmony::initResourceManager(napi_env(info.Env()), napi_value(info[0]));
}

static void napiWritablePathInit(const Napi::CallbackInfo &info) {
    if (info.Length() != 1) {
        Napi::Error::New(info.Env(), "1 argument expected").ThrowAsJavaScriptException();
        return;
    }

    if (!info[0].IsString()) {
        Napi::Error::New(info.Env(), "string expected").ThrowAsJavaScriptException();
        return;
    }

    FileUtilsOpenHarmony::_ohWritablePath = info[0].As<Napi::String>().Utf8Value();
}

static void registerFunction(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info.Length() != 2) {
        Napi::Error::New(info.Env(), "2 argument expected").ThrowAsJavaScriptException();
        return;
    }
    std::string functionName = info[0].As<Napi::String>().Utf8Value();
    if (!info[1].IsFunction()) {
        Napi::Error::New(info.Env(), "Function expected").ThrowAsJavaScriptException();
        return;
    }
    Napi::Function jsFunction = info[1].As<Napi::Function>();
    napi_ref fucRef;
    napi_create_reference(env, jsFunction, 1, &fucRef);
    char *name = new char[functionName.length() + 1];
    strcpy(name, functionName.c_str());
    JSFunction *jsFunctionPtr = new JSFunction(name, env, fucRef);
    JSFunction::addFunction(name, jsFunctionPtr);
    return;
}

std::unordered_map<std::string, JSFunction> JSFunction::jsFunctionMap;

static void napiASend(const Napi::CallbackInfo &info) {
    OpenHarmonyPlatform::getInstance()->triggerMessageSignal();
}

static void napiOnVideoEvent(const Napi::CallbackInfo &info) {
    if (info.Length() != 1) {
        Napi::Error::New(info.Env(), "napiOnVideoEvent, 1 argument expected").ThrowAsJavaScriptException();
        return;
    }
    se::AutoHandleScope hs;
    auto *global = se::ScriptEngine::getInstance()->getGlobalObject();
    se::Value ohVal;
    bool ok = global->getProperty("oh", &ohVal);
    if (!ok || !ohVal.isObject()) {
        CC_LOG_ERROR("oh var not found");
        return;
    }
    se::Value onVideoEventVal;
    ok = ohVal.toObject()->getProperty("onVideoEvent", &onVideoEventVal);
    if (!ok || !onVideoEventVal.isObject() || !onVideoEventVal.toObject()->isFunction()) {
        CC_LOG_ERROR("onVideoEvent not found");
        return;
    }
    // Convert args to se::ValueArray
    se::ValueArray seArgs;
    seArgs.reserve(1);
    seArgs.emplace_back(se::Value(info[0].As<Napi::String>().Utf8Value()));
    ok = onVideoEventVal.toObject()->call(seArgs, ohVal.toObject());
    if (!ok) {
        CC_LOG_ERROR("Call oh.onEventEvent failed!");
    }
}

// NAPI Interface
static Napi::Value getContext(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    size_t argc = info.Length();
    if (argc != 1) {
        Napi::Error::New(env, "Wrong argument count, 1 expected!").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (!info[0].IsNumber()) {
        Napi::TypeError::New(env, "number expected!").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    auto exports = Napi::Object::New(env);
    int64_t value = info[0].As<Napi::Number>().Int64Value();

    switch (value) {
        case APP_LIFECYCLE: {
            exports["onCreate"] = Napi::Function::New(env, napiOnCreate);
            exports["onDestroy"] = Napi::Function::New(env, napiOnDestroy);
            exports["onShow"] = Napi::Function::New(env, napiOnShow);
            exports["onHide"] = Napi::Function::New(env, napiOnHide);
            exports["onBackPress"] = Napi::Function::New(env, napiOnBackPress);
        } break;
        case JS_PAGE_LIFECYCLE: {
            exports["onPageShow"] = Napi::Function::New(env, napiOnPageShow);
            exports["onPageHide"] = Napi::Function::New(env, napiOnPageHide);
        } break;
        case XCOMPONENT_REGISTER_LIFECYCLE_CALLBACK: {
        } break;
        case NATIVE_RENDER_API: {
            exports["nativeEngineInit"] = Napi::Function::New(env, napiNativeEngineInit);
            exports["nativeEngineStart"] = Napi::Function::New(env, napiNativeEngineStart);
        } break;
        case WORKER_INIT: {
#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_NAPI
            se::ScriptEngine::setEnv(env);
#endif

            gWorkerEnv = env;
            exports["workerInit"] = Napi::Function::New(env, napiWorkerInit);
            exports["setPostMessageFunction"] = Napi::Function::New(env, js_set_PostMessage2UIThreadCallback);
            exports["setPostSyncMessageFunction"] = Napi::Function::New(env, js_set_PostSyncMessage2UIThreadCallback);

        } break;
        case ENGINE_UTILS: {
            exports["resourceManagerInit"] = Napi::Function::New(env, napiResourceManagerInit);
            exports["writablePathInit"] = Napi::Function::New(env, napiWritablePathInit);
            exports["registerFunction"] = Napi::Function::New(env, registerFunction);
        } break;
        case EDITBOX_UTILS: {
#if CC_USE_EDITBOX
            exports["onTextChange"] = Napi::Function::New(env, OpenHarmonyEditBox::napiOnTextChange);
            exports["onComplete"] = Napi::Function::New(env, OpenHarmonyEditBox::napiOnComplete);
            exports["onConfirm"] = Napi::Function::New(env, OpenHarmonyEditBox::napiOnConfirm);
#endif
        } break;
        case WEBVIEW_UTILS: {
#if CC_USE_WEBVIEW
            exports["shouldStartLoading"] = Napi::Function::New(env, OpenHarmonyWebView::napiShouldStartLoading);
            exports["finishLoading"] = Napi::Function::New(env, OpenHarmonyWebView::napiFinishLoading);
            exports["failLoading"] = Napi::Function::New(env, OpenHarmonyWebView::napiFailLoading);
            exports["jsCallback"] = Napi::Function::New(env, OpenHarmonyWebView::napiJsCallback);
#endif
        } break;
        case DISPLAY_UTILS: {
            exports["onDisplayChange"] = Napi::Function::New(env, napiOnDisplayChange);
        } break;
        case UV_ASYNC_SEND: {
            exports["send"] = Napi::Function::New(env, napiASend);
        } break;
        case VIDEO_UTILS: {
            exports["onVideoEvent"] = Napi::Function::New(env, napiOnVideoEvent);
        } break;
        default:
            CC_LOG_ERROR("unknown type");
    }

    return exports;
}

/* static */
Napi::Env NapiHelper::getWorkerEnv() {
    return gWorkerEnv;
}

static bool sevalue_to_napivalue(const se::Value &seVal, Napi::Value *napiVal, Napi::Env env);

static bool seobject_to_napivalue(se::Object *seObj, Napi::Value *napiVal, Napi::Env env) {
    auto napiObj = Napi::Object::New(env);
    std::vector<std::string> allKeys;
    bool ok = seObj->getAllKeys(&allKeys);
    if (ok && !allKeys.empty()) {
        for (const auto &key : allKeys) {
            Napi::Value napiProp;
            se::Value prop;
            ok = seObj->getProperty(key.c_str(), &prop);
            if (ok) {
                ok = sevalue_to_napivalue(prop, &napiProp, env);
                if (ok) {
                    napiObj.Set(key.c_str(), napiProp);
                }
            }
        }
    }
    *napiVal = napiObj;
    return true;
}

static bool sevalue_to_napivalue(const se::Value &seVal, Napi::Value *napiVal, Napi::Env env) {
    // Only supports number or {tag: number, url: string} now
    if (seVal.isNumber()) {
        *napiVal = Napi::Number::New(env, seVal.toDouble());
    } else if (seVal.isString()) {
        *napiVal = Napi::String::New(env, seVal.toString().c_str());
    } else if (seVal.isBoolean()) {
        *napiVal = Napi::Boolean::New(env, seVal.toBoolean());
    } else if (seVal.isObject()) {
        seobject_to_napivalue(seVal.toObject(), napiVal, env);
    } else {
        CC_LOG_WARNING("sevalue_to_napivalue, Unsupported type: %d", static_cast<int32_t>(seVal.getType()));
        return false;
    }

    return true;
}

Napi::Value evalString(const Napi::CallbackInfo &info){
    Napi::Env env = info.Env();
    size_t argc = info.Length();
    if (argc != 1) {
        Napi::Error::New(env, "Wrong argument count, 1 expected!").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "string expected!").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    std::string value = info[0].As<Napi::String>().ToString();
    
    if (!se::ScriptEngine::getInstance()->isValid()) {
        CC_LOG_WARNING("ScriptEngine has not been initialized");
        return env.Undefined();
    }

    se::AutoHandleScope hs;
    
    size_t length = value.length();
    char* cValue = new char[length + 1];
    strcpy(cValue, value.c_str());
    se::Value ret;
    se::ScriptEngine::getInstance()->evalString(cValue, length, &ret);
    delete[] cValue;
    Napi::Value result;
    sevalue_to_napivalue(ret, &result, env);
        
    return result;
}

/* static */
Napi::Object NapiHelper::init(Napi::Env env, Napi::Object exports) {
    exports["getContext"] = Napi::Function::New(env, getContext);
    exports["evalString"] = Napi::Function::New(env, evalString);
    bool ret = exportFunctions(exports);
    if (!ret) {
        CC_LOG_ERROR("NapiHelper init failed");
    }
    return exports;
}

} // namespace cc
