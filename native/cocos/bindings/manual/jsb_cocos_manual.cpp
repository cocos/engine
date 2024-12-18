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

#include "jsb_cocos_manual.h"

#include "base/ThreadPool.h"
#include "base/UTF8.h"

#include "bindings/auto/jsb_cocos_auto.h"
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "bindings/manual/jsb_global.h"
#include "bindings/manual/jsb_global_init.h"

#include "application/ApplicationManager.h"
#include "platform/interfaces/modules/ISystemWindowManager.h"
#include "storage/local-storage/LocalStorage.h"

extern se::Object *__jsb_cc_FileUtils_proto; // NOLINT(readability-redundant-declaration, readability-identifier-naming)

static bool jsb_ccx_empty_func(se::State & /*s*/) { // NOLINT(readability-identifier-naming)
    return true;
}
SE_BIND_FUNC(jsb_ccx_empty_func) // NOLINT(readability-identifier-naming)

class JSPlistDelegator : public cc::SAXDelegator {
public:
    static JSPlistDelegator *getInstance() {
        static JSPlistDelegator *pInstance = nullptr;
        if (pInstance == nullptr) {
            pInstance = ccnew JSPlistDelegator();
        }
        return pInstance;
    };

    ~JSPlistDelegator() override;

    cc::SAXParser *getParser();

    ccstd::string parse(const ccstd::string &path);
    ccstd::string parseText(const ccstd::string &text);

    // implement pure virtual methods of SAXDelegator
    void startElement(void *ctx, const char *name, const char **atts) override;
    void endElement(void *ctx, const char *name) override;
    void textHandler(void *ctx, const char *ch, int len) override;

private:
    cc::SAXParser _parser;
    ccstd::string _result;
    bool _isStoringCharacters;
    ccstd::string _currentValue;
};

// cc.PlistParser.getInstance()
static bool js_PlistParser_getInstance(se::State &s) { // NOLINT(readability-identifier-naming)
    JSPlistDelegator *delegator = JSPlistDelegator::getInstance();
    cc::SAXParser *parser = delegator->getParser();

    if (parser) {
        native_ptr_to_seval<cc::SAXParser>(parser, __jsb_cc_SAXParser_class, &s.rval());
        s.rval().toObject()->root();
        return true;
    }
    return false;
}
SE_BIND_FUNC(js_PlistParser_getInstance) // NOLINT(readability-identifier-naming)

// cc.PlistParser.getInstance().parse(text)
static bool js_PlistParser_parse(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    JSPlistDelegator *delegator = JSPlistDelegator::getInstance();

    bool ok = true;
    if (argc == 1) {
        ccstd::string arg0;
        ok &= sevalue_to_native(args[0], &arg0);
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        ccstd::string parsedStr = delegator->parseText(arg0);
        std::replace(parsedStr.begin(), parsedStr.end(), '\n', ' ');

        se::Value strVal;
        nativevalue_to_se(parsedStr, strVal);

        se::HandleObject robj(se::Object::createJSONObject(strVal.toString()));
        s.rval().setObject(robj);
        return true;
    }
    SE_REPORT_ERROR("js_PlistParser_parse : wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_PlistParser_parse)

cc::SAXParser *JSPlistDelegator::getParser() {
    return &_parser;
}

ccstd::string JSPlistDelegator::parse(const ccstd::string &path) {
    _result.clear();

    cc::SAXParser parser;
    if (parser.init("UTF-8")) {
        parser.setDelegator(this);
        parser.parse(cc::FileUtils::getInstance()->fullPathForFilename(path));
    }

    return _result;
}

JSPlistDelegator::~JSPlistDelegator() {
    CC_LOG_INFO("deallocing __JSSAXDelegator: %p", this);
}

ccstd::string JSPlistDelegator::parseText(const ccstd::string &text) {
    _result.clear();

    cc::SAXParser parser;
    if (parser.init("UTF-8")) {
        parser.setDelegator(this);
        parser.parse(text.c_str(), text.size());
    }

    return _result;
}

void JSPlistDelegator::startElement(void * /*ctx*/, const char *name, const char ** /*atts*/) {
    _isStoringCharacters = true;
    _currentValue.clear();

    ccstd::string elementName{name};

    auto end = static_cast<int>(_result.size()) - 1;
    if (end >= 0 && _result[end] != '{' && _result[end] != '[' && _result[end] != ':') {
        _result += ",";
    }

    if (elementName == "dict") {
        _result += "{";
    } else if (elementName == "array") {
        _result += "[";
    }
}

void JSPlistDelegator::endElement(void * /*ctx*/, const char *name) {
    _isStoringCharacters = false;
    ccstd::string elementName{name};

    if (elementName == "dict") {
        _result += "}";
    } else if (elementName == "array") {
        _result += "]";
    } else if (elementName == "key") {
        _result += "\"" + _currentValue + "\":";
    } else if (elementName == "string") {
        _result += "\"" + _currentValue + "\"";
    } else if (elementName == "false" || elementName == "true") {
        _result += elementName;
    } else if (elementName == "real" || elementName == "integer") {
        _result += _currentValue;
    }
}

void JSPlistDelegator::textHandler(void * /*unused*/, const char *ch, int len) {
    ccstd::string text(ch, 0, len);

    if (_isStoringCharacters) {
        _currentValue += text;
    }
}

static bool register_plist_parser(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    se::Value v;
    __jsbObj->getProperty("PlistParser", &v);
    CC_ASSERT(v.isObject());
    v.toObject()->defineFunction("getInstance", _SE(js_PlistParser_getInstance));

    __jsb_cc_SAXParser_proto->defineFunction("parse", _SE(js_PlistParser_parse));

    se::ScriptEngine::getInstance()->clearException();

    return true;
}

// cc.sys.localStorage

static bool JSB_localStorageGetItem(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        bool ok = true;
        ccstd::string key;
        ok = sevalue_to_native(args[0], &key);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        ccstd::string value;
        ok = localStorageGetItem(key, &value);
        if (ok) {
            s.rval().setString(value);
        } else {
            s.rval().setNull(); // Should return null to make JSB behavior same as Browser since returning undefined will make JSON.parse(undefined) trigger exception.
        }

        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_FUNC(JSB_localStorageGetItem) // NOLINT(readability-identifier-naming)

static bool JSB_localStorageRemoveItem(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        bool ok = true;
        ccstd::string key;
        ok = sevalue_to_native(args[0], &key);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        localStorageRemoveItem(key);
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_FUNC(JSB_localStorageRemoveItem) // NOLINT(readability-identifier-naming)

static bool JSB_localStorageSetItem(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 2) {
        bool ok = true;
        ccstd::string key;
        ok = sevalue_to_native(args[0], &key);
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        ccstd::string value = args[1].toStringForce();
        localStorageSetItem(key, value);
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_FUNC(JSB_localStorageSetItem) // NOLINT(readability-identifier-naming)

static bool JSB_localStorageClear(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 0) {
        localStorageClear();
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_FUNC(JSB_localStorageClear) // NOLINT(readability-identifier-naming)

static bool JSB_localStorageKey(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        bool ok = true;
        int nIndex = 0;
        ok = sevalue_to_native(args[0], &nIndex);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        ccstd::string value;
        localStorageGetKey(nIndex, &value);
        s.rval().setString(value);
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_FUNC(JSB_localStorageKey) // NOLINT(readability-identifier-naming)

static bool JSB_localStorage_getLength(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 0) {
        int nLength = 0;

        localStorageGetLength(nLength);
        s.rval().setInt32(nLength);
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments");
    return false;
}
SE_BIND_PROP_GET(JSB_localStorage_getLength); // NOLINT(readability-identifier-naming)

static bool register_sys_localStorage(se::Object *obj) { // NOLINT(readability-identifier-naming)
    se::Value sys;
    if (!obj->getProperty("sys", &sys)) {
        se::HandleObject sysObj(se::Object::createPlainObject());
        obj->setProperty("sys", se::Value(sysObj));
        sys.setObject(sysObj);
    }

    se::HandleObject localStorageObj(se::Object::createPlainObject());
    sys.toObject()->setProperty("localStorage", se::Value(localStorageObj));

    localStorageObj->defineFunction("getItem", _SE(JSB_localStorageGetItem));
    localStorageObj->defineFunction("removeItem", _SE(JSB_localStorageRemoveItem));
    localStorageObj->defineFunction("setItem", _SE(JSB_localStorageSetItem));
    localStorageObj->defineFunction("clear", _SE(JSB_localStorageClear));
    localStorageObj->defineFunction("key", _SE(JSB_localStorageKey));
    localStorageObj->defineProperty("length", _SE(JSB_localStorage_getLength), nullptr);

    ccstd::string strFilePath = cc::FileUtils::getInstance()->getWritablePath();
#if defined(__QNX__)
    // In the QNX environment, the execution of this statement will not take effect.
    // Not sure why
    // strFilePath += "/jsb.sqlite";

    // Use another way
    char path[256] = {0};
    sprintf(path, "%s/jsb.sqlite", strFilePath.c_str());
    localStorageInit(path);
#else
    strFilePath += "/jsb.sqlite";
    localStorageInit(strFilePath);
#endif

    se::ScriptEngine::getInstance()->addBeforeCleanupHook([]() {
        localStorageFree();
    });

    se::ScriptEngine::getInstance()->clearException();

    return true;
}

// IDEA:  move to auto bindings.
static bool js_CanvasRenderingContext2D_setCanvasBufferUpdatedCallback(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::ICanvasRenderingContext2D *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        std::function<void(const cc::Data &)> arg0;
        do {
            if (args[0].isObject() && args[0].toObject()->isFunction()) {
                se::Value jsThis(s.thisObject());
                se::Value jsFunc(args[0]);
                jsThis.toObject()->attachObject(jsFunc.toObject());
                se::Object *thisObj = s.thisObject();
                auto lambda = [=](const cc::Data &larg0) -> void {
                    se::ScriptEngine::getInstance()->clearException();
                    se::AutoHandleScope hs;

                    CC_UNUSED bool ok = true;
                    se::ValueArray args;
                    args.resize(1);
                    ok &= Data_to_TypedArray(larg0, &args[0]);
                    se::Value rval;
                    se::Object *funcObj = jsFunc.toObject();
                    bool succeed = funcObj->call(args, thisObj, &rval);
                    if (!succeed) {
                        se::ScriptEngine::getInstance()->clearException();
                    }
                };
                // Add an unroot to avoid the root of the copy constructor caused by the internal reference of Lambda.
                if (thisObj) {
                    thisObj->unroot();
                }
                jsFunc.toObject()->unroot();
                arg0 = lambda;
            } else {
                arg0 = nullptr;
            }
        } while (false);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        cobj->setCanvasBufferUpdatedCallback(arg0);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_CanvasRenderingContext2D_setCanvasBufferUpdatedCallback) // NOLINT(readability-identifier-naming)

static void setCanvasRenderingContext2DProps(cc::ICanvasRenderingContext2D *context, const se::Value &val) {
    se::Object *props = val.toObject();
    se::Value propVal;

    props->getProperty("lineWidth", &propVal);
    if (!propVal.isUndefined()) context->setLineWidth(propVal.toFloat());

    props->getProperty("lineJoin", &propVal);
    if (!propVal.isUndefined()) context->setLineJoin(propVal.toString());

    props->getProperty("fillStyle", &propVal);
    if (!propVal.isUndefined()) context->setFillStyle(propVal.toString());

    props->getProperty("font", &propVal);
    if (!propVal.isUndefined()) context->setFont(propVal.toString());

    props->getProperty("lineCap", &propVal);
    if (!propVal.isUndefined()) context->setLineCap(propVal.toString());

    props->getProperty("textAlign", &propVal);
    if (!propVal.isUndefined()) context->setTextAlign(propVal.toString());

    props->getProperty("textBaseline", &propVal);
    if (!propVal.isUndefined()) context->setTextBaseline(propVal.toString());

    props->getProperty("strokeStyle", &propVal);
    if (!propVal.isUndefined()) context->setStrokeStyle(propVal.toString());

    props->getProperty("globalCompositeOperation", &propVal);
    if (!propVal.isUndefined()) context->setGlobalCompositeOperation(propVal.toString());

    props->getProperty("shadowBlur", &propVal);
    if (!propVal.isUndefined()) context->setShadowBlur(propVal.toFloat());

    props->getProperty("shadowColor", &propVal);
    if (!propVal.isUndefined()) context->setShadowColor(propVal.toString());

    props->getProperty("shadowOffsetX", &propVal);
    if (!propVal.isUndefined()) context->setShadowOffsetX(propVal.toFloat());

    props->getProperty("shadowOffsetY", &propVal);
    if (!propVal.isUndefined()) context->setShadowOffsetY(propVal.toFloat());
}

static bool js_engine_CanvasRenderingContext2D_measureText(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::ICanvasRenderingContext2D *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 2) {
        ccstd::string arg0;
        ok &= sevalue_to_native(args[0], &arg0);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        SE_PRECONDITION2(args[1].isObject(), false, "no attributes set.");
        setCanvasRenderingContext2DProps(cobj, args[1]);
        cc::Size result = cobj->measureText(arg0);
        ok &= nativevalue_to_se(result, s.rval());
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_engine_CanvasRenderingContext2D_measureText) // NOLINT(readability-identifier-naming)

static bool js_engine_CanvasRenderingContext2D_fillRect(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::ICanvasRenderingContext2D *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 5) {
        float arg0 = 0;
        float arg1 = 0;
        float arg2 = 0;
        float arg3 = 0;
        ok &= sevalue_to_native(args[0], &arg0);
        ok &= sevalue_to_native(args[1], &arg1);
        ok &= sevalue_to_native(args[2], &arg2);
        ok &= sevalue_to_native(args[3], &arg3);
        SE_PRECONDITION2(args[4].isObject(), false, "no attributes set.");
        setCanvasRenderingContext2DProps(cobj, args[4]);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        cobj->fillRect(arg0, arg1, arg2, arg3);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 4);
    return false;
}
SE_BIND_FUNC(js_engine_CanvasRenderingContext2D_fillRect) // NOLINT(readability-identifier-naming)

static bool js_engine_CanvasRenderingContext2D_fillText(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::ICanvasRenderingContext2D *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 5) {
        ccstd::string arg0;
        float arg1 = 0;
        float arg2 = 0;
        float arg3 = 0;
        ok &= sevalue_to_native(args[0], &arg0);
        ok &= sevalue_to_native(args[1], &arg1);
        ok &= sevalue_to_native(args[2], &arg2);
        SE_PRECONDITION2(args[4].isObject(), false, "no attributes set.");
        setCanvasRenderingContext2DProps(cobj, args[4]);
        if (args[3].isUndefined()) {
            SE_PRECONDITION2(ok, false, "Error processing arguments");
            cobj->fillText(arg0, arg1, arg2, -1.0F);
        } else {
            ok &= sevalue_to_native(args[3], &arg3);
            SE_PRECONDITION2(ok, false, "Error processing arguments");
            cobj->fillText(arg0, arg1, arg2, arg3);
        }
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 4);
    return false;
}
SE_BIND_FUNC(js_engine_CanvasRenderingContext2D_fillText) // NOLINT(readability-identifier-naming)

static bool js_engine_CanvasRenderingContext2D_strokeText(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::ICanvasRenderingContext2D *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    bool ok = true;
    if (argc == 5) {
        ccstd::string arg0;
        float arg1 = 0;
        float arg2 = 0;
        float arg3 = 0;
        ok &= sevalue_to_native(args[0], &arg0);
        ok &= sevalue_to_native(args[1], &arg1);
        ok &= sevalue_to_native(args[2], &arg2);
        SE_PRECONDITION2(args[4].isObject(), false, "no attributes set.");
        setCanvasRenderingContext2DProps(cobj, args[4]);
        if (!args[3].isUndefined()) {
            ok &= sevalue_to_native(args[3], &arg3);
            SE_PRECONDITION2(ok, false, "Error processing arguments");
            cobj->strokeText(arg0, arg1, arg2, arg3);
        } else {
            SE_PRECONDITION2(ok, false, "Error processing arguments");
            cobj->strokeText(arg0, arg1, arg2, -1.0F);
        }

        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 4);
    return false;
}
SE_BIND_FUNC(js_engine_CanvasRenderingContext2D_strokeText) // NOLINT(readability-identifier-naming)

static se::Object *deviceMotionObject = nullptr;
static bool JSB_getDeviceMotionValue(se::State &s) { // NOLINT(readability-identifier-naming)
    if (deviceMotionObject == nullptr) {
        deviceMotionObject = se::Object::createArrayObject(9);
        deviceMotionObject->root();
    }

    const auto &v = cc::Device::getDeviceMotionValue();

    deviceMotionObject->setArrayElement(0, se::Value(v.accelerationX));
    deviceMotionObject->setArrayElement(1, se::Value(v.accelerationY));
    deviceMotionObject->setArrayElement(2, se::Value(v.accelerationZ));
    deviceMotionObject->setArrayElement(3, se::Value(v.accelerationIncludingGravityX));
    deviceMotionObject->setArrayElement(4, se::Value(v.accelerationIncludingGravityY));
    deviceMotionObject->setArrayElement(5, se::Value(v.accelerationIncludingGravityZ));
    deviceMotionObject->setArrayElement(6, se::Value(v.rotationRateAlpha));
    deviceMotionObject->setArrayElement(7, se::Value(v.rotationRateBeta));
    deviceMotionObject->setArrayElement(8, se::Value(v.rotationRateGamma));

    s.rval().setObject(deviceMotionObject);
    return true;
}
SE_BIND_FUNC(JSB_getDeviceMotionValue) // NOLINT(readability-identifier-naming)

static bool register_device(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    se::Value device;
    __jsbObj->getProperty("Device", &device);

    device.toObject()->defineFunction("getDeviceMotionValue", _SE(JSB_getDeviceMotionValue));

    se::ScriptEngine::getInstance()->addBeforeCleanupHook([]() {
        if (deviceMotionObject != nullptr) {
            deviceMotionObject->unroot();
            deviceMotionObject->decRef();
            deviceMotionObject = nullptr;
        }
    });

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

static bool register_canvas_context2d(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    __jsb_cc_ICanvasRenderingContext2D_proto->defineFunction("_setCanvasBufferUpdatedCallback", _SE(js_CanvasRenderingContext2D_setCanvasBufferUpdatedCallback));
    __jsb_cc_ICanvasRenderingContext2D_proto->defineFunction("fillText", _SE(js_engine_CanvasRenderingContext2D_fillText));
    __jsb_cc_ICanvasRenderingContext2D_proto->defineFunction("strokeText", _SE(js_engine_CanvasRenderingContext2D_strokeText));
    __jsb_cc_ICanvasRenderingContext2D_proto->defineFunction("fillRect", _SE(js_engine_CanvasRenderingContext2D_fillRect));
    __jsb_cc_ICanvasRenderingContext2D_proto->defineFunction("measureText", _SE(js_engine_CanvasRenderingContext2D_measureText));

    se::ScriptEngine::getInstance()->clearException();

    return true;
}

static bool js_engine_FileUtils_listFilesRecursively(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::FileUtils *>(s.nativeThisObject());
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 2) {
        ccstd::string arg0;
        ccstd::vector<ccstd::string> arg1;
        ok &= sevalue_to_native(args[0], &arg0);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        cobj->listFilesRecursively(arg0, &arg1);
        se::Object *list = args[1].toObject();
        SE_PRECONDITION2(args[1].isObject() && list->isArray(), false, "2nd argument should be an Array");
        for (uint32_t i = 0; i < static_cast<uint32_t>(arg1.size()); i++) {
            list->setArrayElement(i, se::Value(arg1[i]));
        }
        list->setProperty("length", se::Value(static_cast<uint32_t>(arg1.size())));
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}
SE_BIND_FUNC(js_engine_FileUtils_listFilesRecursively) // NOLINT(readability-identifier-naming)

static bool js_se_setExceptionCallback(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    if (args.size() != 1 || !args[0].isObject() || !args[0].toObject()->isFunction()) {
        SE_REPORT_ERROR("expect 1 arguments of Function type, %d provided", (int)args.size());
        return false;
    }

    se::Object *objFunc = args[0].toObject();
    // se::Value::reset will invoke decRef() while destroying s.args()
    // increase ref here
    objFunc->incRef();
    if (s.thisObject()) {
        s.thisObject()->attachObject(objFunc); // prevent GC
    } else {
        // prevent GC in C++ & JS
        objFunc->root();
    }

    se::ScriptEngine::getInstance()->setJSExceptionCallback([objFunc](const char *location, const char *message, const char *stack) {
        se::AutoHandleScope scope;
        se::ValueArray jsArgs;
        jsArgs.resize(3);
        jsArgs[0] = se::Value(location);
        jsArgs[1] = se::Value(message);
        jsArgs[2] = se::Value(stack);
        objFunc->call(jsArgs, nullptr);
    });

    se::ScriptEngine::getInstance()->addBeforeCleanupHook([objFunc] {
        objFunc->decRef();
    });

    return true;
}
SE_BIND_FUNC(js_se_setExceptionCallback) // NOLINT(readability-identifier-naming)

static bool js_readFile_getParameters(se::State &s, ccstd::string &fullPath, std::shared_ptr<se::Value> &callbackPtr) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 2) {
        ccstd::string path;
        ok &= sevalue_to_native(args[0], &path);
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        const auto &callbackVal = args[1];
        CC_ASSERT(callbackVal.isObject());
        CC_ASSERT(callbackVal.toObject()->isFunction());

        if (path.empty()) {
            se::ValueArray seArgs;
            seArgs.reserve(2);
            seArgs.emplace_back(se::Value("Path is empty"));
            seArgs.emplace_back(se::Value::Null);
            callbackVal.toObject()->call(seArgs, nullptr);
            return true;
        }

        callbackPtr = std::make_shared<se::Value>(callbackVal);

        // fullPathForFilename is not threadsafe, so don't invoke it in thread pool.
        fullPath = cc::FileUtils::getInstance()->fullPathForFilename(path);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}

template <typename T, bool isJson>
struct ReadFileDoJobReturnType {
    using value = std::shared_ptr<T>;
};

template <>
struct ReadFileDoJobReturnType<ccstd::string, true> {
#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_NAPI
    using value = std::shared_ptr<ccstd::string>;
#else
    using value = std::shared_ptr<std::u16string>;
#endif
};

template <>
struct ReadFileDoJobReturnType<ccstd::string, false> {
    using value = std::shared_ptr<ccstd::string>;
};

template <typename T, bool isJson>
static bool js_readFile_doJob(const ccstd::string &fullPath, typename ReadFileDoJobReturnType<T, isJson>::value &outValue) {
    auto *fs = cc::FileUtils::getInstance();
    if (fs == nullptr) {
        return false;
    }

    auto content = std::make_shared<T>();
    if (cc::FileUtils::Status::OK != fs->getContents(fullPath, content.get())) {
        return false;
    }


    if constexpr (std::is_same_v<T, ccstd::string> && isJson) {
// TODO(cjh): OpenHarmony NAPI support
#if SCRIPT_ENGINE_TYPE != SCRIPT_ENGINE_NAPI
        auto u16str = std::make_shared<std::u16string>();
        if (!cc::StringUtils::UTF8ToUTF16(*content, *u16str)) {
            CC_LOG_ERROR("UTF8ToUTF16 failed, file: %s", fullPath.c_str());
            return false;
        }
        outValue = u16str;
#endif
    } else {
        outValue = content;
    }

    return true;
}

template <typename T, bool isJson>
static void js_readFile_invokeCallback(bool doJobSucceed, const typename ReadFileDoJobReturnType<T, isJson>::value &content, const std::shared_ptr<se::Value> &callbackPtr) {
    se::AutoHandleScope hs;
    se::ValueArray seArgs;
    seArgs.reserve(2);

    if (!doJobSucceed) {
        seArgs.emplace_back(se::Value("readFile failed!"));
        seArgs.emplace_back(se::Value::Null);
        callbackPtr->toObject()->call(seArgs, nullptr);
        return;
    }

    static_assert(std::is_same_v<T, ccstd::string> || std::is_same_v<T, cc::Data>, "No supported type!");

    if constexpr (std::is_same_v<T, ccstd::string>) {
        if constexpr (isJson) {
#if SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_NAPI
            se::HandleObject jsonObj(se::Object::createJSONObject(*content));
#else
            se::HandleObject jsonObj(se::Object::createJSONObject(std::move(*content)));
#endif
            if (!jsonObj.get()) {
                seArgs.emplace_back(se::Value("Parse json failed!"));
                seArgs.emplace_back(se::Value::Null);
            } else {
                seArgs.emplace_back(se::Value::Null);
                seArgs.emplace_back(se::Value(jsonObj));
            }
            callbackPtr->toObject()->call(seArgs, nullptr);
        } else {
            seArgs.emplace_back(se::Value::Null);
            seArgs.emplace_back(se::Value(*content));
            callbackPtr->toObject()->call(seArgs, nullptr);
        }
    } else if constexpr (std::is_same_v<T, cc::Data>) {
        se::HandleObject dataObj(se::Object::createArrayBufferObject(content->getBytes(), content->getSize()));
        seArgs.emplace_back(se::Value::Null);
        seArgs.emplace_back(se::Value(dataObj));
        callbackPtr->toObject()->call(seArgs, nullptr);
    }
}

#define JSB_READ_FILE(funcName, type, isJson)                                                             \
    static bool funcName(se::State &s) {                                                                  \
        ccstd::string fullPath;                                                                           \
        std::shared_ptr<se::Value> callbackPtr;                                                           \
        bool ok = js_readFile_getParameters(s, fullPath, callbackPtr);                                    \
        if (!ok) return false;                                                                            \
                                                                                                          \
        gIOThreadPool->pushTask([fullPath, callbackPtr](int /* tid */) {                                  \
            ReadFileDoJobReturnType<type, isJson>::value content;                                         \
            bool doJobSucceed = js_readFile_doJob<type, isJson>(fullPath, content);                       \
            auto app = CC_CURRENT_APPLICATION();                                                          \
            if (!app) {                                                                                   \
                return;                                                                                   \
            }                                                                                             \
            auto engine = app->getEngine();                                                               \
            if (!engine) {                                                                                \
                return;                                                                                   \
            }                                                                                             \
            engine->getScheduler()->performFunctionInCocosThread([doJobSucceed, content, callbackPtr]() { \
                js_readFile_invokeCallback<type, isJson>(doJobSucceed, content, callbackPtr);             \
            });                                                                                           \
        });                                                                                               \
                                                                                                          \
        return true;                                                                                      \
    }                                                                                                     \
    SE_BIND_FUNC(funcName)

JSB_READ_FILE(js_readTextFile, ccstd::string, false)
JSB_READ_FILE(js_readJsonFile, ccstd::string, true)
JSB_READ_FILE(js_readDataFile, cc::Data, false)

static bool register_filetuils_ext(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    __jsb_cc_FileUtils_proto->defineFunction("listFilesRecursively", _SE(js_engine_FileUtils_listFilesRecursively));
    __jsb_cc_FileUtils_proto->defineFunction("readTextFile", _SE(js_readTextFile));
    __jsb_cc_FileUtils_proto->defineFunction("readDataFile", _SE(js_readDataFile));
    __jsb_cc_FileUtils_proto->defineFunction("readJsonFile", _SE(js_readJsonFile));

    return true;
}

static bool register_se_setExceptionCallback(se::Object *obj) { // NOLINT(readability-identifier-naming)
    se::Value jsb;
    if (!obj->getProperty("jsb", &jsb)) {
        jsb.setObject(se::Object::createPlainObject());
        obj->setProperty("jsb", jsb);
    }
    auto *jsbObj = jsb.toObject();
    jsbObj->defineFunction("onError", _SE(js_se_setExceptionCallback));

    return true;
}

static bool js_engine_Color_get_data(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Color>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    CC_UNUSED bool ok = true;
    se::Value jsret;
    uint8_t data[4] = {
        static_cast<uint8_t>(cobj->r),
        static_cast<uint8_t>(cobj->g),
        static_cast<uint8_t>(cobj->b),
        static_cast<uint8_t>(cobj->a)};
    se::HandleObject dataObj(se::Object::createTypedArray(se::Object::TypedArrayType::UINT8_CLAMPED,
                                                          data, sizeof(uint8_t) * 4));
    SE_PRECONDITION2(dataObj != nullptr, false, "Can not create Uint8ClampedTypedArray");

    s.rval() = se::Value(dataObj);
    return true;
}
SE_BIND_PROP_GET(js_engine_Color_get_data)

static bool js_engine_Color_set_data(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = s.args();
    auto *cobj = SE_THIS_OBJECT<cc::Color>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    CC_UNUSED bool ok = true;

    se::Value val;
    ok &= sevalue_to_native(args[0], &val, s.thisObject());
    ok &= val.isObject() && val.toObject()->isTypedArray();
    SE_PRECONDITION2(ok, false, "It is not a TypeArray");

    uint8_t *ptr = nullptr;
    size_t length = 0;
    val.toObject()->getTypedArrayData(&ptr, &length);
    SE_PRECONDITION2(length == sizeof(uint8_t) * 4, false, "Invalid TypedArray size");

    cobj->r = ptr[0];
    cobj->g = ptr[1];
    cobj->b = ptr[2];
    cobj->a = ptr[3];

    return true;
}
SE_BIND_PROP_SET(js_engine_Color_set_data)

static bool register_engine_Color_manual(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    __jsb_cc_Color_proto->defineProperty("_data", _SE(js_engine_Color_get_data), _SE(js_engine_Color_set_data));

    se::ScriptEngine::getInstance()->clearException();

    return true;
}
static bool js_cc_ISystemWindowManager_getInstance_static(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    CC_UNUSED bool ok = true;
    auto *instance = CC_GET_PLATFORM_INTERFACE(cc::ISystemWindowManager);
    ok &= nativevalue_to_se(instance, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "js_cc_ISystemWindowManager_getInstance Failed");

    return true;
}
SE_BIND_FUNC(js_cc_ISystemWindowManager_getInstance_static)

static bool register_platform(se::Object * /*obj*/) { // NOLINT(readability-identifier-naming)
    se::Value constructor;
    bool result = __jsb_cc_ISystemWindowManager_proto->getProperty("constructor", &constructor);
    result &= constructor.toObject()->defineFunction("getInstance", _SE(js_cc_ISystemWindowManager_getInstance_static));
    return result;
}

template <typename T>
static bool bindAsExternalBuffer(se::State &s) { // NOLINT
    auto *self = SE_THIS_OBJECT<T>(s);
    if (!self) {
        return false;
    }
    // NOLINTNEXTLINE
    se::HandleObject buffer(se::Object::createExternalArrayBufferObject(self, sizeof(*self), [](void *, size_t, void *) {}));
    s.rval().setObject(buffer);
    return true;
}

static bool js_cc_Vec2_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Vec2>(s);
}
SE_BIND_FUNC(js_cc_Vec2_underlyingData)

static bool js_cc_Vec3_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Vec3>(s);
}
SE_BIND_FUNC(js_cc_Vec3_underlyingData)

static bool js_cc_Vec4_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Vec4>(s);
}
SE_BIND_FUNC(js_cc_Vec4_underlyingData)

static bool js_cc_Mat3_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Mat3>(s);
}
SE_BIND_FUNC(js_cc_Mat3_underlyingData)

static bool js_cc_Mat4_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Mat4>(s);
}
SE_BIND_FUNC(js_cc_Mat4_underlyingData)

static bool js_cc_Quaternion_underlyingData(se::State &s) { // NOLINT
    return bindAsExternalBuffer<cc::Quaternion>(s);
}
SE_BIND_FUNC(js_cc_Quaternion_underlyingData)

bool register_all_cocos_manual(se::Object *obj) { // NOLINT(readability-identifier-naming)

    __jsb_cc_Vec2_proto->defineFunction("underlyingData", _SE(js_cc_Vec2_underlyingData));
    __jsb_cc_Vec3_proto->defineFunction("underlyingData", _SE(js_cc_Vec3_underlyingData));
    __jsb_cc_Vec4_proto->defineFunction("underlyingData", _SE(js_cc_Vec4_underlyingData));
    __jsb_cc_Mat3_proto->defineFunction("underlyingData", _SE(js_cc_Mat3_underlyingData));
    __jsb_cc_Mat4_proto->defineFunction("underlyingData", _SE(js_cc_Mat4_underlyingData));
    __jsb_cc_Quaternion_proto->defineFunction("underlyingData", _SE(js_cc_Quaternion_underlyingData));

    register_plist_parser(obj);
    register_sys_localStorage(obj);
    register_device(obj);
    register_canvas_context2d(obj);
    register_filetuils_ext(obj);
    register_engine_Color_manual(obj);
    register_se_setExceptionCallback(obj);
    register_platform(obj);
    return true;
}
