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
#include <string>
#include <optional>
#include "CommonHeader.h"
#include "Object.h"
#include "../Define.h"

namespace se {
class Class {
public:
    static Class *create(const std::string &clsName, se::Object *parent, Object *parentProto, JSVM_Callback ctor = nullptr);
    static Class *create(const std::initializer_list<const char *> &classPath, se::Object *parent, Object *parentProto, JSVM_Callback ctor = nullptr);

    void          defineFunction(const char* name, JSVM_Callback func);
    void          defineProperty(const char* name, JSVM_Callback g, JSVM_Callback s);
    void          defineProperty(const std::initializer_list<const char *> &names, JSVM_Callback g, JSVM_Callback s);

    void          defineStaticFunction(const char* name, JSVM_Callback func);
    void          defineStaticProperty(const char* name, JSVM_Callback g, JSVM_Callback s);
    bool          defineStaticProperty(const char *name, const Value &value, PropertyAttribute attribute = PropertyAttribute::NONE);

    static JSVM_Value    _createJSObjectWithClass(Class *cls);
    
    void          defineFinalizeFunction(JSVM_Finalize func);
    JSVM_Finalize _getFinalizeFunction() const;
    
    
    Object *      getProto() const;
    bool          install();
    JSVM_Status   inherit(JSVM_Env env, JSVM_Value subclass, JSVM_Value superclass);
    JSVM_Ref      _getCtorRef() const;
    JSVM_Value    _getCtorFunc() const;
    const char *  getName() const { return _name.c_str(); }
    static void   setExports(JSVM_Value *expPtr) { _exports = expPtr; }
    static void cleanup();
    // Private API used in wrapper
    void _setCtor(Object *obj);                                                // NOLINT(readability-identifier-naming)
    inline const std::optional<Object *> &_getCtor() const { return _ctor; } // NOLINT(readability-identifier-naming)
private:
    Class();
    ~Class();
    bool              init(const std::string &clsName, Object *parent, Object *parentProto, JSVM_Callback ctor = nullptr);
    void              destroy();
    static JSVM_Value _defaultCtor(JSVM_Env env, JSVM_CallbackInfo info);

private:
    std::optional<Object *>             _ctor;
    static JSVM_Value *                   _exports;
    std::string                           _name;
    Object *                              _parent = nullptr;
    Object *                              _proto = nullptr;
    Object *                              _parentProto = nullptr;
    JSVM_CallbackStruct                   _ctorStruct = {Class::_defaultCtor,nullptr};
    JSVM_Callback                         _ctorFunc = &_ctorStruct;
    JSVM_Ref                              _constructor = nullptr;
    std::vector<JSVM_PropertyDescriptor>  _properties;
    JSVM_Finalize                         _finalizeFunc = nullptr;
};
}; // namespace se