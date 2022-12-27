// clang-format off

/* ----------------------------------------------------------------------------
 * This file was automatically generated by SWIG (https://www.swig.org).
 * Version 4.1.0
 *
 * Do not make changes to this file unless you know what you are doing - modify
 * the SWIG interface file instead.
 * ----------------------------------------------------------------------------- */

/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunused-variable"
#elif defined(__GNUC__) || defined(__GNUG__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-variable"
#elif defined(_MSC_VER)
#pragma warning(push)
#pragma warning(disable : 4101)
#endif


#define SWIG_STD_MOVE(OBJ) std::move(OBJ)


#include <stdio.h>


#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "bindings/manual/jsb_global.h"


#include "bindings/auto/jsb_audio_auto.h"



se::Class* __jsb_cc_AudioProfile_class = nullptr;
se::Object* __jsb_cc_AudioProfile_proto = nullptr;
SE_DECLARE_FINALIZE_FUNC(js_delete_cc_AudioProfile) 

static bool js_cc_AudioProfile_name_set(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg1->name, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    
    
    return true;
}
SE_BIND_PROP_SET(js_cc_AudioProfile_name_set) 

static bool js_cc_AudioProfile_name_get(se::State& s)
{
    CC_UNUSED bool ok = true;
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= nativevalue_to_se(arg1->name, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(arg1->name, s.thisObject(), s.rval());
    
    
    
    return true;
}
SE_BIND_PROP_GET(js_cc_AudioProfile_name_get) 

static bool js_cc_AudioProfile_maxInstances_set(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg1->maxInstances, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    
    
    
    return true;
}
SE_BIND_PROP_SET(js_cc_AudioProfile_maxInstances_set) 

static bool js_cc_AudioProfile_maxInstances_get(se::State& s)
{
    CC_UNUSED bool ok = true;
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= nativevalue_to_se(arg1->maxInstances, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_PROP_GET(js_cc_AudioProfile_maxInstances_get) 

static bool js_cc_AudioProfile_minDelay_set(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg1->minDelay, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    
    return true;
}
SE_BIND_PROP_SET(js_cc_AudioProfile_minDelay_set) 

static bool js_cc_AudioProfile_minDelay_get(se::State& s)
{
    CC_UNUSED bool ok = true;
    cc::AudioProfile *arg1 = (cc::AudioProfile *) NULL ;
    
    arg1 = SE_THIS_OBJECT<cc::AudioProfile>(s);
    if (nullptr == arg1) return true;
    
    ok &= nativevalue_to_se(arg1->minDelay, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_PROP_GET(js_cc_AudioProfile_minDelay_get) 

static bool js_new_cc_AudioProfile(se::State& s) // NOLINT(readability-identifier-naming)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    cc::AudioProfile *result;
    result = (cc::AudioProfile *)new cc::AudioProfile();
    
    
    auto *ptr = JSB_MAKE_PRIVATE_OBJECT_WITH_INSTANCE(result);
    s.thisObject()->setPrivateObject(ptr);
    return true;
}
SE_BIND_CTOR(js_new_cc_AudioProfile, __jsb_cc_AudioProfile_class, js_delete_cc_AudioProfile)

static bool js_delete_cc_AudioProfile(se::State& s)
{
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_AudioProfile) 

bool js_register_cc_AudioProfile(se::Object* obj) {
    auto* cls = se::Class::create("AudioProfile", obj, nullptr, _SE(js_new_cc_AudioProfile)); 
    
    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("name", _SE(js_cc_AudioProfile_name_get), _SE(js_cc_AudioProfile_name_set)); 
    cls->defineProperty("maxInstances", _SE(js_cc_AudioProfile_maxInstances_get), _SE(js_cc_AudioProfile_maxInstances_set)); 
    cls->defineProperty("minDelay", _SE(js_cc_AudioProfile_minDelay_get), _SE(js_cc_AudioProfile_minDelay_set)); 
    
    
    
    
    
    cls->defineFinalizeFunction(_SE(js_delete_cc_AudioProfile));
    
    
    cls->install();
    JSBClassType::registerClass<cc::AudioProfile>(cls);
    
    __jsb_cc_AudioProfile_proto = cls->getProto();
    __jsb_cc_AudioProfile_class = cls;
    se::ScriptEngine::getInstance()->clearException();
    return true;
}


se::Class* __jsb_cc_AudioEngine_class = nullptr;
se::Object* __jsb_cc_AudioEngine_proto = nullptr;
SE_DECLARE_FINALIZE_FUNC(js_delete_cc_AudioEngine) 

static bool js_cc_AudioEngine_INVALID_AUDIO_ID_get(se::State& s)
{
    CC_UNUSED bool ok = true;
    int result;
    
    result = (int)(int)cc::AudioEngine::INVALID_AUDIO_ID;
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_PROP_GET(js_cc_AudioEngine_INVALID_AUDIO_ID_get) 

static bool js_cc_AudioEngine_TIME_UNKNOWN_get(se::State& s)
{
    CC_UNUSED bool ok = true;
    float result;
    
    result = (float)(float)cc::AudioEngine::TIME_UNKNOWN;
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_PROP_GET(js_cc_AudioEngine_TIME_UNKNOWN_get) 

static bool js_cc_AudioEngine_lazyInit_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    bool result;
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    result = (bool)cc::AudioEngine::lazyInit();
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_lazyInit_static) 

static bool js_cc_AudioEngine_end_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    cc::AudioEngine::end();
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_end_static) 

static bool js_cc_AudioEngine_getDefaultProfile_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::AudioProfile *result = 0 ;
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    result = (cc::AudioProfile *)cc::AudioEngine::getDefaultProfile();
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getDefaultProfile_static) 

static bool js_cc_AudioEngine_play2d_static__SWIG_0(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    bool arg2 ;
    float arg3 ;
    cc::AudioProfile *arg4 = (cc::AudioProfile *) NULL ;
    ccstd::string temp1 ;
    int result;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    
    ok &= sevalue_to_native(args[1], &arg2);
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[2], &arg3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[3], &arg4, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (int)cc::AudioEngine::play2d((ccstd::string const &)*arg1,arg2,arg3,(cc::AudioProfile const *)arg4);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_play2d_static__SWIG_1(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    bool arg2 ;
    float arg3 ;
    ccstd::string temp1 ;
    int result;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    
    ok &= sevalue_to_native(args[1], &arg2);
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[2], &arg3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (int)cc::AudioEngine::play2d((ccstd::string const &)*arg1,arg2,arg3);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_play2d_static__SWIG_2(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    bool arg2 ;
    ccstd::string temp1 ;
    int result;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    
    ok &= sevalue_to_native(args[1], &arg2);
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (int)cc::AudioEngine::play2d((ccstd::string const &)*arg1,arg2);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_play2d_static__SWIG_3(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    ccstd::string temp1 ;
    int result;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    result = (int)cc::AudioEngine::play2d((ccstd::string const &)*arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_play2d_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    
    if (argc == 4) {
        ok = js_cc_AudioEngine_play2d_static__SWIG_0(s);
        if (ok) {
            return true; 
        }
    } 
    if (argc == 3) {
        ok = js_cc_AudioEngine_play2d_static__SWIG_1(s);
        if (ok) {
            return true; 
        }
    } 
    if (argc == 2) {
        ok = js_cc_AudioEngine_play2d_static__SWIG_2(s);
        if (ok) {
            return true; 
        }
    } 
    if (argc == 1) {
        ok = js_cc_AudioEngine_play2d_static__SWIG_3(s);
        if (ok) {
            return true; 
        }
    } 
    SE_REPORT_ERROR("wrong number of arguments: %d", (int)argc);
    return false;
}
SE_BIND_FUNC(js_cc_AudioEngine_play2d_static) 

static bool js_cc_AudioEngine_setLoop_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    bool arg2 ;
    
    if(argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[1], &arg2);
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::setLoop(arg1,arg2);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setLoop_static) 

static bool js_cc_AudioEngine_isLoop_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    bool result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (bool)cc::AudioEngine::isLoop(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_isLoop_static) 

static bool js_cc_AudioEngine_setVolume_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    float arg2 ;
    
    if(argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[1], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::setVolume(arg1,arg2);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setVolume_static) 

static bool js_cc_AudioEngine_setVolumeFactor_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    float arg1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::setVolumeFactor(arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setVolumeFactor_static) 

static bool js_cc_AudioEngine_getVolume_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    float result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (float)cc::AudioEngine::getVolume(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getVolume_static) 

static bool js_cc_AudioEngine_pause_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::pause(arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_pause_static) 

static bool js_cc_AudioEngine_pauseAll_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    cc::AudioEngine::pauseAll();
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_pauseAll_static) 

static bool js_cc_AudioEngine_resume_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::resume(arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_resume_static) 

static bool js_cc_AudioEngine_resumeAll_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    cc::AudioEngine::resumeAll();
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_resumeAll_static) 

static bool js_cc_AudioEngine_stop_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::stop(arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_stop_static) 

static bool js_cc_AudioEngine_stopAll_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    cc::AudioEngine::stopAll();
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_stopAll_static) 

static bool js_cc_AudioEngine_setCurrentTime_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    float arg2 ;
    bool result;
    
    if(argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[1], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (bool)cc::AudioEngine::setCurrentTime(arg1,arg2);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setCurrentTime_static) 

static bool js_cc_AudioEngine_getCurrentTime_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    float result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (float)cc::AudioEngine::getCurrentTime(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getCurrentTime_static) 

static bool js_cc_AudioEngine_getDuration_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    float result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (float)cc::AudioEngine::getDuration(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getDuration_static) 

static bool js_cc_AudioEngine_getDurationFromFile_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    ccstd::string *arg1 = 0 ;
    ccstd::string temp1 ;
    float result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    result = (float)cc::AudioEngine::getDurationFromFile((ccstd::string const &)*arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getDurationFromFile_static) 

static bool js_cc_AudioEngine_getState_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    cc::AudioEngine::AudioState result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (cc::AudioEngine::AudioState)cc::AudioEngine::getState(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());
    
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getState_static) 

static bool js_cc_AudioEngine_setFinishCallback_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    std::function< void (int,ccstd::string const &) > *arg2 = 0 ;
    std::function< void (int,ccstd::string const &) > temp2 ;
    
    if(argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    
    ok &= sevalue_to_native(args[1], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;
    
    cc::AudioEngine::setFinishCallback(arg1,(std::function< void (int,ccstd::string const &) > const &)*arg2);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setFinishCallback_static) 

static bool js_cc_AudioEngine_getMaxAudioInstance_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int result;
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    result = (int)cc::AudioEngine::getMaxAudioInstance();
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getMaxAudioInstance_static) 

static bool js_cc_AudioEngine_setMaxAudioInstance_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int arg1 ;
    bool result;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (bool)cc::AudioEngine::setMaxAudioInstance(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setMaxAudioInstance_static) 

static bool js_cc_AudioEngine_uncache_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    ccstd::string *arg1 = 0 ;
    ccstd::string temp1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    cc::AudioEngine::uncache((ccstd::string const &)*arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_uncache_static) 

static bool js_cc_AudioEngine_uncacheAll_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    cc::AudioEngine::uncacheAll();
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_uncacheAll_static) 

static bool js_cc_AudioEngine_getProfile_static__SWIG_0(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    int arg1 ;
    cc::AudioProfile *result = 0 ;
    
    
    ok &= sevalue_to_native(args[0], &arg1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    result = (cc::AudioProfile *)cc::AudioEngine::getProfile(arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_getProfile_static__SWIG_1(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    ccstd::string temp1 ;
    cc::AudioProfile *result = 0 ;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    result = (cc::AudioProfile *)cc::AudioEngine::getProfile((ccstd::string const &)*arg1);
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval()); 
    
    
    return true;
}

static bool js_cc_AudioEngine_getProfile_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    
    if (argc == 1) {
        ok = js_cc_AudioEngine_getProfile_static__SWIG_0(s);
        if (ok) {
            return true; 
        }
    } 
    if (argc == 1) {
        ok = js_cc_AudioEngine_getProfile_static__SWIG_1(s);
        if (ok) {
            return true; 
        }
    } 
    SE_REPORT_ERROR("wrong number of arguments: %d", (int)argc);
    return false;
}
SE_BIND_FUNC(js_cc_AudioEngine_getProfile_static) 

static bool js_cc_AudioEngine_preload_static__SWIG_0(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    ccstd::string temp1 ;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    cc::AudioEngine::preload((ccstd::string const &)*arg1);
    
    
    return true;
}

static bool js_cc_AudioEngine_preload_static__SWIG_1(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    ccstd::string *arg1 = 0 ;
    std::function< void (bool) > *arg2 = 0 ;
    ccstd::string temp1 ;
    std::function< void (bool) > temp2 ;
    
    
    ok &= sevalue_to_native(args[0], &temp1, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp1;
    
    
    ok &= sevalue_to_native(args[1], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;
    
    cc::AudioEngine::preload((ccstd::string const &)*arg1,(std::function< void (bool) > const &)*arg2);
    
    
    return true;
}

static bool js_cc_AudioEngine_preload_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    
    if (argc == 1) {
        ok = js_cc_AudioEngine_preload_static__SWIG_0(s);
        if (ok) {
            return true; 
        }
    } 
    if (argc == 2) {
        ok = js_cc_AudioEngine_preload_static__SWIG_1(s);
        if (ok) {
            return true; 
        }
    } 
    SE_REPORT_ERROR("wrong number of arguments: %d", (int)argc);
    return false;
}
SE_BIND_FUNC(js_cc_AudioEngine_preload_static) 

static bool js_cc_AudioEngine_getPlayingAudioCount_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    int result;
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    result = (int)cc::AudioEngine::getPlayingAudioCount();
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject()); 
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_getPlayingAudioCount_static) 

static bool js_cc_AudioEngine_setEnabled_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    bool arg1 ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    
    ok &= sevalue_to_native(args[0], &arg1);
    SE_PRECONDITION2(ok, false, "Error processing arguments"); 
    cc::AudioEngine::setEnabled(arg1);
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_setEnabled_static) 

static bool js_cc_AudioEngine_isEnabled_static(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    bool result;
    
    if(argc != 0) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
        return false;
    }
    result = (bool)cc::AudioEngine::isEnabled();
    
    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    
    
    return true;
}
SE_BIND_FUNC(js_cc_AudioEngine_isEnabled_static) 

static bool js_new_cc_AudioEngine(se::State& s) // NOLINT(readability-identifier-naming)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    
    cc::AudioEngine *result;
    result = (cc::AudioEngine *)new cc::AudioEngine();
    
    
    auto *ptr = JSB_MAKE_PRIVATE_OBJECT_WITH_INSTANCE(result);
    s.thisObject()->setPrivateObject(ptr);
    return true;
}
SE_BIND_CTOR(js_new_cc_AudioEngine, __jsb_cc_AudioEngine_class, js_delete_cc_AudioEngine)

static bool js_delete_cc_AudioEngine(se::State& s)
{
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_AudioEngine) 

bool js_register_cc_AudioEngine(se::Object* obj) {
    auto* cls = se::Class::create("AudioEngine", obj, nullptr, _SE(js_new_cc_AudioEngine)); 
    
    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    
    
    cls->defineStaticProperty("INVALID_AUDIO_ID", _SE(js_cc_AudioEngine_INVALID_AUDIO_ID_get), nullptr); 
    cls->defineStaticProperty("TIME_UNKNOWN", _SE(js_cc_AudioEngine_TIME_UNKNOWN_get), nullptr); 
    
    cls->defineStaticFunction("lazyInit", _SE(js_cc_AudioEngine_lazyInit_static)); 
    cls->defineStaticFunction("end", _SE(js_cc_AudioEngine_end_static)); 
    cls->defineStaticFunction("getDefaultProfile", _SE(js_cc_AudioEngine_getDefaultProfile_static)); 
    cls->defineStaticFunction("play2d", _SE(js_cc_AudioEngine_play2d_static)); 
    cls->defineStaticFunction("setLoop", _SE(js_cc_AudioEngine_setLoop_static)); 
    cls->defineStaticFunction("isLoop", _SE(js_cc_AudioEngine_isLoop_static)); 
    cls->defineStaticFunction("setVolume", _SE(js_cc_AudioEngine_setVolume_static)); 
    cls->defineStaticFunction("setVolumeFactor", _SE(js_cc_AudioEngine_setVolumeFactor_static)); 
    cls->defineStaticFunction("getVolume", _SE(js_cc_AudioEngine_getVolume_static)); 
    cls->defineStaticFunction("pause", _SE(js_cc_AudioEngine_pause_static)); 
    cls->defineStaticFunction("pauseAll", _SE(js_cc_AudioEngine_pauseAll_static)); 
    cls->defineStaticFunction("resume", _SE(js_cc_AudioEngine_resume_static)); 
    cls->defineStaticFunction("resumeAll", _SE(js_cc_AudioEngine_resumeAll_static)); 
    cls->defineStaticFunction("stop", _SE(js_cc_AudioEngine_stop_static)); 
    cls->defineStaticFunction("stopAll", _SE(js_cc_AudioEngine_stopAll_static)); 
    cls->defineStaticFunction("setCurrentTime", _SE(js_cc_AudioEngine_setCurrentTime_static)); 
    cls->defineStaticFunction("getCurrentTime", _SE(js_cc_AudioEngine_getCurrentTime_static)); 
    cls->defineStaticFunction("getDuration", _SE(js_cc_AudioEngine_getDuration_static)); 
    cls->defineStaticFunction("getDurationFromFile", _SE(js_cc_AudioEngine_getDurationFromFile_static)); 
    cls->defineStaticFunction("getState", _SE(js_cc_AudioEngine_getState_static)); 
    cls->defineStaticFunction("setFinishCallback", _SE(js_cc_AudioEngine_setFinishCallback_static)); 
    cls->defineStaticFunction("getMaxAudioInstance", _SE(js_cc_AudioEngine_getMaxAudioInstance_static)); 
    cls->defineStaticFunction("setMaxAudioInstance", _SE(js_cc_AudioEngine_setMaxAudioInstance_static)); 
    cls->defineStaticFunction("uncache", _SE(js_cc_AudioEngine_uncache_static)); 
    cls->defineStaticFunction("uncacheAll", _SE(js_cc_AudioEngine_uncacheAll_static)); 
    cls->defineStaticFunction("getProfile", _SE(js_cc_AudioEngine_getProfile_static)); 
    cls->defineStaticFunction("preload", _SE(js_cc_AudioEngine_preload_static)); 
    cls->defineStaticFunction("getPlayingAudioCount", _SE(js_cc_AudioEngine_getPlayingAudioCount_static)); 
    cls->defineStaticFunction("setEnabled", _SE(js_cc_AudioEngine_setEnabled_static)); 
    cls->defineStaticFunction("isEnabled", _SE(js_cc_AudioEngine_isEnabled_static)); 
    
    
    cls->defineFinalizeFunction(_SE(js_delete_cc_AudioEngine));
    
    
    cls->install();
    JSBClassType::registerClass<cc::AudioEngine>(cls);
    
    __jsb_cc_AudioEngine_proto = cls->getProto();
    __jsb_cc_AudioEngine_class = cls;
    se::ScriptEngine::getInstance()->clearException();
    return true;
}




bool register_all_audio(se::Object* obj) {
    // Get the ns
    se::Value nsVal;
    if (!obj->getProperty("jsb", &nsVal, true))
    {
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        obj->setProperty("jsb", nsVal);
    }
    se::Object* ns = nsVal.toObject();
    /* Register classes */
    js_register_cc_AudioProfile(ns); 
    js_register_cc_AudioEngine(ns); 
    
    /* Register global variables & global functions */
    
    
    
    return true;
}


#if defined(__clang__)
#pragma clang diagnostic pop
#elif defined(__GNUC__) || defined(__GNUG__)
#pragma GCC diagnostic pop
#elif defined(_MSC_VER)
#pragma warning(pop)
#endif
// clang-format on
