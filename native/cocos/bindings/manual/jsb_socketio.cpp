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

#include "jsb_socketio.h"
#include "application/ApplicationManager.h"
#include "base/UTF8.h"
#include "cocos/base/DeferredReleasePool.h"
#include "cocos/bindings/jswrapper/SeApi.h"
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/bindings/manual/jsb_global.h"
#include "cocos/network/SocketIO.h"

// using namespace cc;
// using namespace cc::network;

se::Class *__jsb_SocketIO_class = nullptr; // NOLINT

class JSB_SocketIODelegate : public cc::RefCounted, public cc::network::SocketIO::SIODelegate {
public:
    // c++11 map to callbacks
    using JSB_SIOCallbackRegistry = ccstd::unordered_map<ccstd::string /* eventName */, se::ValueArray /* 0:callbackFunc, 1:target */>;

    JSB_SocketIODelegate() = default;

    ~JSB_SocketIODelegate() override {
        CC_LOG_INFO("In the destructor of JSB_SocketIODelegate(%p)", this);
    }

    void onConnect(cc::network::SIOClient * /*client*/) override {
    }

    void onMessage(cc::network::SIOClient * /*client*/, const ccstd::string & /*data*/) override {
    }

    void onClose(cc::network::SIOClient *client) override { // NOLINT
        CC_LOG_DEBUG("JSB SocketIO::SIODelegate->onClose method called from native");
        this->fireEventToScript(client, "disconnect", "");

        se::NativePtrToObjectMap::forEach(client, [](se::Object *obj) {
            obj->unroot();
        });

        if (getRefCount() == 1) {
            cc::DeferredReleasePool::add(this);
        } else {
            release();
        }
    }

    void onError(cc::network::SIOClient *client, const ccstd::string &data) override { // NOLINT
        CC_LOG_DEBUG("JSB SocketIO::SIODelegate->onError method called from native with data: %s", data.c_str());
        this->fireEventToScript(client, "error", data);

        se::NativePtrToObjectMap::forEach(client, [](se::Object *obj) {
            obj->unroot();
        });
    }

    void fireEventToScript(cc::network::SIOClient *client, const ccstd::string &eventName, const ccstd::string &data) override { // NOLINT
        CC_LOG_DEBUG("JSB SocketIO::SIODelegate->fireEventToScript method called from native with name '%s' data: %s", eventName.c_str(), data.c_str());

        se::ScriptEngine::getInstance()->clearException();
        se::AutoHandleScope hs;

        if (!CC_CURRENT_APPLICATION()) {
            return;
        }

        if (!se::NativePtrToObjectMap::contains(client)) { // IDEA: client probably be a new value with the same address as the old one, it may cause undefined result.
            return;
        }

        se::Value dataVal;
        if (data.empty()) {
            dataVal.setNull();
        } else {
            dataVal.setString(data);
        }

        auto it = _eventRegistry.find(eventName);

        if (it != _eventRegistry.end()) {
            const se::ValueArray &cbStruct = it->second;
            CC_ASSERT(cbStruct.size() == 2);
            const se::Value &callback = cbStruct[0];
            const se::Value &target = cbStruct[1];
            if (callback.isObject() && callback.toObject()->isFunction() && target.isObject()) {
                se::ValueArray args;
                args.push_back(dataVal);
                callback.toObject()->call(args, target.toObject());
            }
        }

        if (eventName == "disconnect") {
            CC_LOG_DEBUG("disconnect ... "); // IDEA:
        }
    }

    void addEvent(const ccstd::string &eventName, const se::Value &callback, const se::Value &target) {
        CC_ASSERT(callback.isObject() && callback.toObject()->isFunction());
        CC_ASSERT(target.isObject());
        _eventRegistry[eventName].clear();
        _eventRegistry[eventName].push_back(callback);
        _eventRegistry[eventName].push_back(target);
        target.toObject()->attachObject(callback.toObject());
    }

private:
    JSB_SIOCallbackRegistry _eventRegistry;
};

static bool SocketIO_finalize(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());
    CC_LOG_INFO("jsbindings: finalizing JS object %p (SocketIO)", cobj);
    cobj->disconnect();
    if(se::ScriptEngine::getInstance()->isInCleanup()) {
        return true;
    }
    auto *delegate = static_cast<JSB_SocketIODelegate *>(cobj->getDelegate());
    if (delegate->getRefCount() == 1) {
        cc::DeferredReleasePool::add(delegate);
    } else {
        delegate->release();
    }
    return true;
}
SE_BIND_FINALIZE_FUNC(SocketIO_finalize) // NOLINT(readability-identifier-naming)

static bool SocketIO_prop_getTag(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());
    s.rval().setString(cobj->getTag());
    return true;
}
SE_BIND_PROP_GET(SocketIO_prop_getTag) // NOLINT(readability-identifier-naming)

static bool SocketIO_prop_setTag(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());
    cobj->setTag(s.args()[0].toString().c_str());
    return true;
}
SE_BIND_PROP_SET(SocketIO_prop_setTag) // NOLINT(readability-identifier-naming)

static bool SocketIO_send(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());

    if (argc == 1) {
        ccstd::string payload;
        bool ok = sevalue_to_native(args[0], &payload);
        SE_PRECONDITION2(ok, false, "Converting payload failed!");

        cobj->send(payload);
        return true;
    }

    SE_REPORT_ERROR("Wrong number of arguments: %d, expected: %d", argc, 1);
    return false;
}
SE_BIND_FUNC(SocketIO_send) // NOLINT(readability-identifier-naming)

static bool SocketIO_emit(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());

    if (argc >= 1) {
        bool ok = false;
        ccstd::string eventName;
        ok = sevalue_to_native(args[0], &eventName);
        SE_PRECONDITION2(ok, false, "Converting eventName failed!");

        ccstd::string payload;
        if (argc >= 2) {
            const auto &arg1 = args[1];
            // Add this check to make it compatible with old version.
            // jsval_to_std_string in v1.6 returns empty string if arg1 is null or undefined
            // while seval_to_std_string since 1.7.2 follows JS standard to return "null" or "undefined".
            // Therefore, we need a workaround to make it be compatible with versions lower than v1.7.
            if (!arg1.isNullOrUndefined()) {
                ok = sevalue_to_native(arg1, &payload);
                SE_PRECONDITION2(ok, false, "Converting payload failed!");
            }
        }

        cobj->emit(eventName, payload);
        return true;
    }

    SE_REPORT_ERROR("Wrong number of arguments: %d, expected: %d", argc, 2);
    return false;
}
SE_BIND_FUNC(SocketIO_emit) // NOLINT(readability-identifier-naming)

static bool SocketIO_disconnect(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());

    if (argc == 0) {
        cobj->disconnect();
        return true;
    }

    SE_REPORT_ERROR("Wrong number of arguments: %d, expected: %d", argc, 0);
    return false;
}
SE_BIND_FUNC(SocketIO_disconnect) // NOLINT(readability-identifier-naming)

static bool SocketIO_on(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    auto *cobj = static_cast<cc::network::SIOClient *>(s.nativeThisObject());

    if (argc == 2) {
        bool ok = false;
        ccstd::string eventName;
        ok = sevalue_to_native(args[0], &eventName);
        SE_PRECONDITION2(ok, false, "Converting eventName failed!");

        CC_LOG_DEBUG("JSB SocketIO eventName to: '%s'", eventName.c_str());

        (static_cast<JSB_SocketIODelegate *>(cobj->getDelegate()))->addEvent(eventName, args[1], se::Value(s.thisObject()));
        return true;
    }

    SE_REPORT_ERROR("Wrong number of arguments: %d, expected: %d", argc, 2);
    return false;
}
SE_BIND_FUNC(SocketIO_on) // NOLINT(readability-identifier-naming)

// static
static bool SocketIO_connect(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    CC_LOG_DEBUG("JSB SocketIO.connect method called");

    if (argc >= 1 && argc <= 3) {
        ccstd::string url;
        ccstd::string caFilePath;
        bool ok = false;

        ok = sevalue_to_native(args[0], &url);
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        if (argc == 2) {
            if (args[1].isObject()) {
                // Just ignore the option argument
            } else if (args[1].isString()) {
                // Assume it's CA root file path
                ok = sevalue_to_native(args[1], &caFilePath);
                SE_PRECONDITION2(ok, false, "Error processing arguments");
            }
        }

        if (argc == 3) {
            // Just ignore the option argument

            if (args[2].isString()) {
                // Assume it's CA root file path
                ok = sevalue_to_native(args[2], &caFilePath);
                SE_PRECONDITION2(ok, false, "Error processing arguments");
            }
        }

        auto *siodelegate = ccnew JSB_SocketIODelegate();

        CC_LOG_DEBUG("Calling native SocketIO.connect method");
        cc::network::SIOClient *ret = cc::network::SocketIO::connect(url, *siodelegate, caFilePath);
        if (ret != nullptr) {
            ret->addRef();
            siodelegate->addRef();

            se::Object *obj = se::Object::createObjectWithClass(__jsb_SocketIO_class);
            obj->setPrivateData(ret);

            s.rval().setObject(obj);
            obj->root();

            return true;
        }
        siodelegate->release();
        SE_REPORT_ERROR("SocketIO.connect return nullptr!");
        return false;
    }
    SE_REPORT_ERROR("JSB SocketIO.connect: Wrong number of arguments");
    return false;
}
SE_BIND_FUNC(SocketIO_connect) // NOLINT(readability-identifier-naming)

// static
static bool SocketIO_close(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    if (argc == 0) {
        return true;
    }

    SE_REPORT_ERROR("Wrong number of arguments: %d, expected: %d", argc, 0);
    return false;
}
SE_BIND_FUNC(SocketIO_close) // NOLINT(readability-identifier-naming)

bool register_all_socketio(se::Object *global) {
    se::Value nsVal;
    if (!global->getProperty("jsb", &nsVal, true)) {
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        global->setProperty("jsb", nsVal);
    }
    se::Object *ns = nsVal.toObject();
    se::Class *cls = se::Class::create("SocketIO", ns, nullptr, nullptr);
    cls->defineFinalizeFunction(_SE(SocketIO_finalize));

    cls->defineProperty("tag", _SE(SocketIO_prop_getTag), _SE(SocketIO_prop_setTag));

    cls->defineFunction("send", _SE(SocketIO_send));
    cls->defineFunction("emit", _SE(SocketIO_emit));
    cls->defineFunction("disconnect", _SE(SocketIO_disconnect));
    cls->defineFunction("on", _SE(SocketIO_on));

    cls->install();

    JSBClassType::registerClass<cc::network::SocketIO>(cls);

    se::Value ctorVal;
    ns->getProperty("SocketIO", &ctorVal);
    ctorVal.toObject()->defineFunction("connect", _SE(SocketIO_connect));
    ctorVal.toObject()->defineFunction("close", _SE(SocketIO_close));

    __jsb_SocketIO_class = cls;

    se::ScriptEngine::getInstance()->clearException();
    return true;
}
