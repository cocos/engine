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

#include "Class.h"
#include <string>
#include "CommonHeader.h"
#include "ScriptEngine.h"
#include "Utils.h"

namespace se {

JSVM_Value *Class::_exports = nullptr;
std::vector<Class *> __allClasses;

Class::Class() {
    __allClasses.push_back(this);
};

Class::~Class() {
}

/* static */
Class *Class::create(const std::string &clsName, se::Object *parent, Object *parentProto, JSVM_Callback ctor) {
    Class *cls = new Class();
    if (cls != nullptr && !cls->init(clsName, parent, parentProto, ctor)) {
        delete cls;
        cls = nullptr;
    }
    return cls;
}

Class* Class::create(const std::initializer_list<const char *> &classPath, se::Object *parent, Object *parentProto, JSVM_Callback ctor) {
    se::AutoHandleScope scope;
    se::Object *currentParent = parent;
    se::Value tmp;
    for (auto i = 0; i < classPath.size() - 1; i++) {
        bool ok = currentParent->getProperty(*(classPath.begin() + i), &tmp);
        assert(ok); // class or namespace in path is not defined
        currentParent = tmp.toObject();
    }
    return create(*(classPath.end() - 1), currentParent, parentProto, ctor);
}

bool Class::init(const std::string &clsName, Object *parent, Object *parentProto, JSVM_Callback ctor) {
    _name   = clsName;
    _parent = parent;
    if (_parent != nullptr)
        _parent->incRef();
    _parentProto = parentProto;

    if (_parentProto != nullptr)
        _parentProto->incRef();
    if (ctor) {
        _ctorFunc = ctor;
    }

    return true;
}

JSVM_Value Class::_defaultCtor(JSVM_Env env, JSVM_CallbackInfo info) {
    JSVM_Value thisArg;
    JSVM_Status status;
    NODE_API_CALL(status, env, OH_JSVM_GetCbInfo(env, info, nullptr, nullptr, &thisArg, nullptr));
    return thisArg;
}

void Class::defineProperty(const char* name, JSVM_Callback g, JSVM_Callback s) {
    _properties.push_back({name, nullptr, nullptr, g, s, 0, JSVM_DEFAULT_JSPROPERTY});
}

void Class::defineProperty(const std::initializer_list<const char *> &names, JSVM_Callback g, JSVM_Callback s) {
    for (const auto *name : names) {
        defineProperty(name, g, s);
    }
}

void Class::defineStaticProperty(const char* name, JSVM_Callback g, JSVM_Callback s) {
    if(g != nullptr && s != nullptr) 
        _properties.push_back({name, nullptr, nullptr, g, s, 0, JSVM_STATIC});
}

void Class::defineFunction(const char* name, JSVM_Callback func) {
	// When JSVM defines a function, it needs to add the enum attribute, otherwise JS cannot traverse the function
    _properties.push_back({name, nullptr, func, nullptr, nullptr, nullptr, JSVM_JSPROPERTY_NO_RECEIVER_CHECK});
}

void Class::defineStaticFunction(const char* name, JSVM_Callback func) {
    _properties.push_back({name, nullptr, func, nullptr, nullptr, 0, JSVM_PropertyAttributes((int)JSVM_STATIC|(int)JSVM_WRITABLE)});
}

bool Class::defineStaticProperty(const char *name, const Value &v, PropertyAttribute attribute /* = PropertyAttribute::NONE */) {
    // TODO(qgh): Assigning get and set to nullptr in openharmony will cause a crash
    //napi_value value;
    //internal::seToJsValue(v, &value);
    //_properties.push_back({name, nullptr, nullptr, nullptr, nullptr, value, napi_static, 0});
    return true;
}

void Class::defineFinalizeFunction(JSVM_Finalize func) {
    assert(func != nullptr);
    _finalizeFunc = func;
}

JSVM_Finalize Class::_getFinalizeFunction() const {
    return _finalizeFunc;
}

bool Class::install() {
    auto env = ScriptEngine::getEnv();
    JSVM_Value  cons;
    JSVM_Status status;
    NODE_API_CALL(status, env, OH_JSVM_DefineClass(env, _name.c_str(), -1, _ctorFunc, _properties.size(), _properties.data(), &cons));
    if (_parentProto) {
        inherit(env, cons, _parentProto->_getJSObject());
    }

    NODE_API_CALL(status, env, OH_JSVM_CreateReference(env, cons, 1, &_constructor));
        SE_LOGD("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq   install   %p     %p", this, _constructor);
    NODE_API_CALL(status, env, OH_JSVM_SetNamedProperty(env, _parent->_getJSObject(), _name.c_str(), cons));

    JSVM_Value proto;
    NODE_API_CALL(status, env, OH_JSVM_GetNamedProperty(env, cons, "prototype", &proto));

    if (status == JSVM_OK) {
        _proto = Object::_createJSObject(env, proto, nullptr);
        _proto->root();
    }

	return true;
}

JSVM_Status Class::inherit(JSVM_Env env, JSVM_Value subclass, JSVM_Value superProto) {
    JSVM_Value global, objectClass, setProto;
    JSVM_Value argv[2];
    JSVM_Value callbackResult = nullptr;

    JSVM_Status status;
    NODE_API_CALL(status, env, OH_JSVM_GetGlobal(env, &global));
    NODE_API_CALL(status, env, OH_JSVM_GetNamedProperty(env, global, "Object", &objectClass));
    if (status != JSVM_OK) {
        return JSVM_OK;
    }
    NODE_API_CALL(status, env, OH_JSVM_GetNamedProperty(env, objectClass, "setPrototypeOf", &setProto));
    if (status != JSVM_OK) {
        return JSVM_OK;
    }
    NODE_API_CALL(status, env, OH_JSVM_GetNamedProperty(env, subclass, "prototype", &argv[0]));
    if (status != JSVM_OK) {
        return JSVM_OK;
    }
    argv[1] = superProto;
    NODE_API_CALL(status, env, OH_JSVM_CallFunction(env, objectClass, setProto, 2, argv, &callbackResult));
    if (status != JSVM_OK) {
        return JSVM_OK;
    }
    return JSVM_OK;
}

JSVM_Value Class::_createJSObjectWithClass(Class *cls) {
    assert(cls);
    JSVM_Value clsCtor = cls->_getCtorFunc();
    if (!clsCtor) {
        LOGE("get ctor func err");
        return nullptr;
    }
    auto env = ScriptEngine::getEnv();
    JSVM_Value obj = nullptr;
    JSVM_Status status;

    se::ScriptEngine::getInstance()->_setNeedCallConstructor(false);
    NODE_API_CALL(status, env, OH_JSVM_NewInstance(env, clsCtor, 0, nullptr, &obj));
    se::ScriptEngine::getInstance()->_setNeedCallConstructor(true);
    return obj;
}

Object *Class::getProto() const {
    //not impl
    return _proto;
}

JSVM_Ref Class::_getCtorRef() const {
    SE_LOGD("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq   _getCtorRef   %p     %p", this, _constructor);
    return _constructor;
}

JSVM_Value Class::_getCtorFunc() const {
    assert(_constructor);
    JSVM_Value  result = nullptr;
    JSVM_Status status;
    SE_LOGD("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq   _getCtorFunc   %p     %p", this, _constructor);
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_GetReferenceValue(ScriptEngine::getEnv(), _constructor, &result));
    return result;
}

void Class::_setCtor(Object *obj) {
    SE_LOGD("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq   _setCtor   %p     %p", this, obj);
    assert(!_ctor.has_value());
    _ctor = obj;
    if (obj != nullptr) {
        obj->root();
        obj->incRef();
    }
}

void Class::destroy() {
    SAFE_DEC_REF(_parent);
    SAFE_DEC_REF(_proto);
    SE_LOGD("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq   destroy   %p   ", this);
    SAFE_DEC_REF(_parentProto);
    if (_ctor.has_value()) {
        if (_ctor.value() != nullptr) {
            _ctor.value()->unroot();
            _ctor.value()->decRef();
        }
        _ctor.reset();
    }
}

void Class::cleanup() {
    for (auto cls : __allClasses) {
        cls->destroy();
    }

    se::ScriptEngine::getInstance()->addAfterCleanupHook([]() {
        for (auto cls : __allClasses) {
            delete cls;
        }
        __allClasses.clear();
    });
}
}; // namespace se