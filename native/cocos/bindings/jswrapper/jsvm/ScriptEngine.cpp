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

#include "ScriptEngine.h"
#include <sstream>
#include "../MappingUtils.h"
#include "Class.h"
#include "State.h"
#include "Utils.h"
#include "CommonHeader.h"
#include "ark_runtime/jsvm.h"

#define _EXPOSE_GC "__jsb_gc__"

namespace se {
AutoHandleScope::AutoHandleScope() {
    OH_JSVM_OpenHandleScope(ScriptEngine::getEnv(), &_handleScope);
}

AutoHandleScope::~AutoHandleScope() {
    OH_JSVM_CloseHandleScope(ScriptEngine::getEnv(), _handleScope);
}

bool __forceGC(State &s) {
    ScriptEngine::getInstance()->garbageCollect();
    return true;
}
SE_BIND_FUNC(__forceGC)

se::Value __oldConsoleLog;
se::Value __oldConsoleDebug;
se::Value __oldConsoleInfo;
se::Value __oldConsoleWarn;
se::Value __oldConsoleError;
se::Value __oldConsoleAssert;

bool JSB_console_format_log(State& s, const char* prefix, int msgIndex = 0) {
    if (msgIndex < 0)
        return false;

    const auto& args = s.args();
    int argc = (int)args.size();
    if ((argc - msgIndex) == 1) {
        std::string msg = args[msgIndex].toStringForce();
        SE_LOGD("JS: %{public}s%{public}s\n", prefix, msg.c_str());
    } else if (argc > 1) {
        std::string msg = args[msgIndex].toStringForce();
        size_t pos;
        for (int i = (msgIndex+1); i < argc; ++i) {
            pos = msg.find("%");
            if (pos != std::string::npos && pos != (msg.length()-1) && 
                (msg[pos+1] == 'd' || msg[pos+1] == 's' || msg[pos+1] == 'f')) {
                    msg.replace(pos, 2, args[i].toStringForce());
                } else {
                    msg += " " + args[i].toStringForce();
                }
        }
        SE_LOGD("JS: %{public}s%{public}s\n", prefix, msg.c_str());
    }
    return true;
}

bool JSB_console_log(State& s) {
    JSB_console_format_log(s, "");
    __oldConsoleLog.toObject()->call(s.args(), s.thisObject());
    return true;
}
        
SE_BIND_FUNC(JSB_console_log)

bool JSB_console_debug(State& s) {
    JSB_console_format_log(s, "[DEBUG]: ");
    __oldConsoleDebug.toObject()->call(s.args(), s.thisObject());
    return true;
}
        
SE_BIND_FUNC(JSB_console_debug)

bool JSB_console_info(State& s) {
    JSB_console_format_log(s, "[INFO]: ");
    __oldConsoleInfo.toObject()->call(s.args(), s.thisObject());
    return true;
}

SE_BIND_FUNC(JSB_console_info)

bool JSB_console_warn(State& s) {
    JSB_console_format_log(s, "[WARN]: ");
    __oldConsoleWarn.toObject()->call(s.args(), s.thisObject());
    return true;
}
        
SE_BIND_FUNC(JSB_console_warn)

bool JSB_console_error(State& s) {
    JSB_console_format_log(s, "[ERROR]: ");
    __oldConsoleError.toObject()->call(s.args(), s.thisObject());
    return true;
}

SE_BIND_FUNC(JSB_console_error)

bool JSB_console_assert(State& s) {
    const auto& args = s.args();
    if (!args.empty()) {
        if (args[0].isBoolean() && !args[0].toBoolean()) {
            JSB_console_format_log(s, "[ASSERT]: ", 1);
            __oldConsoleAssert.toObject()->call(s.args(), s.thisObject());
        }
    }
    return true;
}

SE_BIND_FUNC(JSB_console_assert)

ScriptEngine *gSriptEngineInstance = nullptr;

ScriptEngine::ScriptEngine() {
    static bool initialized = false;
    if (initialized) {
        return;
    }
    JSVM_InitOptions initOptions;
    memset(&initOptions, 0, sizeof(initOptions));
    OH_JSVM_Init(&initOptions);
    initialized = true;
};

ScriptEngine::~ScriptEngine() = default;

void ScriptEngine::setFileOperationDelegate(const FileOperationDelegate &delegate) {
    _fileOperationDelegate = delegate;
}

const ScriptEngine::FileOperationDelegate &ScriptEngine::getFileOperationDelegate() const {
    return _fileOperationDelegate;
}

ScriptEngine *ScriptEngine::getInstance() {
    if (gSriptEngineInstance == nullptr) {
        gSriptEngineInstance = new ScriptEngine();
    }

    return gSriptEngineInstance;
}

void ScriptEngine::destroyInstance() {
    if (gSriptEngineInstance) {
        gSriptEngineInstance->cleanup();
        delete gSriptEngineInstance;
        gSriptEngineInstance = nullptr;
    }
}

bool ScriptEngine::runScript(const std::string &path, Value *ret /* = nullptr */) {
    assert(!path.empty());
    assert(_fileOperationDelegate.isValid());

    std::string scriptBuffer = _fileOperationDelegate.onGetStringFromFile(path);

    if (!scriptBuffer.empty()) {
        return evalString(scriptBuffer.c_str(), scriptBuffer.length(), ret, path.c_str());
    }

    SE_LOGE("ScriptEngine::runScript script %s, buffer is empty!\n", path.c_str());
    return false;
}

bool ScriptEngine::evalString(const char *scriptStr, ssize_t length, Value *ret, const char *fileName) {
    length = length < 0 ? strlen(scriptStr) :length;
    JSVM_Status status;
    JSVM_Value  jsvmStr;
    NODE_API_CALL(status, _env, OH_JSVM_CreateStringUtf8(_env, scriptStr, length, &jsvmStr));
    if(status != JSVM_OK) {
        SE_LOGE("ScriptEngine::evalString, create string failed, fileName = %{public}s", fileName);
        return false;
    }

    uint8_t *cachedData = nullptr;
    size_t cacheLength = 0;

    bool cacheRejected = false;
    JSVM_Script compiledScript;
    JSVM_ScriptOrigin scriptOrigin{
        .sourceMapUrl = nullptr,
        .resourceName = fileName ? fileName : "",
        .resourceLineOffset = 0,
        .resourceColumnOffset = 0
    };

    NODE_API_CALL(status, _env, 
                  OH_JSVM_CompileScriptWithOrigin(_env, jsvmStr, cachedData, cacheLength, false, &cacheRejected,&scriptOrigin, &compiledScript));
    
    if(status != JSVM_OK) {
       SE_LOGE("ScriptEngine::evalSting, compile failed, fileName = %{public}s", fileName);
       return false;
    }

    JSVM_Value result;
    NODE_API_CALL(status, _env, OH_JSVM_RunScript(_env, compiledScript, &result));
    if(status != JSVM_OK) {
       SE_LOGE("ScriptEngine::evelSting, run failed, fileName = %{public}s", fileName);
       return false;
    }

    if(!cachedData || cacheRejected) {
        NODE_API_CALL(status, _env,
                      OH_JSVM_CreateCodeCache(_env, compiledScript, (const uint8_t **)&cachedData, &cacheLength));
    }
    
    if(ret) {
        internal::jsToSeValue(result, ret);
    }

    return true;
}

bool ScriptEngine::init() {
    JSVM_Status status;
    JSVM_Value  result;

    for (const auto &hook : _beforeInitHookArray) {
        hook();
    }
    _beforeInitHookArray.clear();
    NODE_API_CALL(status, _env, OH_JSVM_CreateVM(nullptr, &_vm));
    NODE_API_CALL(status, _env, OH_JSVM_OpenVMScope(_vm, &_vmScope));
    NODE_API_CALL(status, _env, OH_JSVM_CreateEnv(_vm, 0, nullptr, &_env));
    NODE_API_CALL(status, _env, OH_JSVM_OpenEnvScope(_env, &_envScope));

    se::AutoHandleScope hs;

    Object::setup();
    NativePtrToObjectMap::init();
    NODE_API_CALL(status, ScriptEngine::getEnv(), OH_JSVM_GetGlobal(ScriptEngine::getEnv(), &result));
    _globalObj = Object::_createJSObject(ScriptEngine::getEnv(), result, nullptr);
    _globalObj->root();
    _globalObj->setProperty("window", Value(_globalObj));
    _globalObj->setProperty("scriptEngineType", se::Value("jsvm"));

    se::Value consoleVal;
    if (_globalObj->getProperty("console", &consoleVal) && consoleVal.isObject()) {
        consoleVal.toObject()->getProperty("log", &__oldConsoleLog);
        consoleVal.toObject()->defineFunction("log", _SE(JSB_console_log));

        consoleVal.toObject()->getProperty("debug", &__oldConsoleDebug);
        consoleVal.toObject()->defineFunction("debug", _SE(JSB_console_debug));

        consoleVal.toObject()->getProperty("info", &__oldConsoleInfo);
        consoleVal.toObject()->defineFunction("info", _SE(JSB_console_info));

        consoleVal.toObject()->getProperty("warn", &__oldConsoleWarn);
        consoleVal.toObject()->defineFunction("warn", _SE(JSB_console_warn));

        consoleVal.toObject()->getProperty("error", &__oldConsoleError);
        consoleVal.toObject()->defineFunction("error", _SE(JSB_console_error));

        consoleVal.toObject()->getProperty("assert", &__oldConsoleAssert);
        consoleVal.toObject()->defineFunction("assert", _SE(JSB_console_assert));
    }

    _globalObj->defineFunction("log", _SE(JSB_console_log));
    _globalObj->defineFunction("forceGC", _SE(__forceGC));
        
    _globalObj->getProperty(_EXPOSE_GC, &_gcFuncValue);
    if(_gcFuncValue.isObject() && _gcFuncValue.toObject()->isFunction()) {
        _gcFunc = _gcFuncValue.toObject();
    } else {
        _gcFunc = nullptr;
    }

    _isValid = true;

    for (const auto &hook : _afterInitHookArray) {
        hook();
    }
    _afterInitHookArray.clear();

    return _isValid;
}

Object *ScriptEngine::getGlobalObject() const { return _globalObj; }
    
bool ScriptEngine::start() {
    bool ok = true;
    if (!init()) {
        return false;
    }
    se::AutoHandleScope hs;

    _startTime = std::chrono::steady_clock::now();
    for (auto cb : _permRegisterCallbackArray) {
        ok = cb(_globalObj);
        assert(ok);
        if (!ok) {
            break;
        }
    }

    for (auto cb : _registerCallbackArray) {
        ok = cb(_globalObj);
        assert(ok);
        if (!ok) {
            break;
        }
    }

    // After ScriptEngine is started, _registerCallbackArray isn't needed. Therefore, clear it here.
    _registerCallbackArray.clear();

    return ok;
}

void ScriptEngine::cleanup() {
    if (!_isValid) {
        return;
    }
    Object::restarting = true;
    Object::resetBaseSet();
    SE_LOGD("ScriptEngine::cleanup begin ...\n");
    _isInCleanup = true;
    se::AutoHandleScope hs;
    do{
        for (const auto &hook : _beforeCleanupHookArray) {
            hook();
        }
    }while (0);
    _beforeCleanupHookArray.clear();

    SAFE_DEC_REF(_globalObj);
    Object::cleanup();
    Class::cleanup();
    garbageCollect();

    __oldConsoleLog.setUndefined();
    __oldConsoleDebug.setUndefined();
    __oldConsoleInfo.setUndefined();
    __oldConsoleWarn.setUndefined();
    __oldConsoleError.setUndefined();
    __oldConsoleAssert.setUndefined();

    JSVM_Env env = _env;
    _env = nullptr;

    JSVM_Status status;
    NODE_API_CALL(status, env, OH_JSVM_CloseEnvScope(env, _envScope));

    NODE_API_CALL(status, env, OH_JSVM_DestroyEnv(env));
    NODE_API_CALL(status, env, OH_JSVM_CloseVMScope(_vm, _vmScope));
    NODE_API_CALL(status, env, OH_JSVM_DestroyVM(_vm));
    _envScope = nullptr;
    env = nullptr;
    _vmScope = nullptr;
    _vm = nullptr;

    _globalObj = nullptr;
    _isValid   = false;
    _gcFunc = nullptr;

    _registerCallbackArray.clear();

    for (const auto &hook : _afterCleanupHookArray) {
        hook();
    }
    _beforeInitHookArray.clear();
    _afterInitHookArray.clear();
    _beforeCleanupHookArray.clear();
    _afterCleanupHookArray.clear();

    _isInCleanup = false;
    NativePtrToObjectMap::destroy();
    _gcFuncValue.setUndefined();
    
    SE_LOGD("ScriptEngine::cleanup end ...\n");
}

void ScriptEngine::addBeforeCleanupHook(const std::function<void()> &hook) {
    _beforeCleanupHookArray.push_back(hook);
    return;
}

void ScriptEngine::addBeforeInitHook(const std::function<void()> &hook) {
    _beforeInitHookArray.push_back(hook);
}

void ScriptEngine::addAfterCleanupHook(const std::function<void()> &hook) {
    _afterCleanupHookArray.push_back(hook);
    return;
}

void ScriptEngine::addRegisterCallback(RegisterCallback cb) {
    assert(std::find(_registerCallbackArray.begin(), _registerCallbackArray.end(), cb) == _registerCallbackArray.end());
    _registerCallbackArray.push_back(cb);
}

JSVM_Env ScriptEngine::getEnv() { return getInstance()->_env; }

void ScriptEngine::setEnv(JSVM_Env env) { getInstance()->_env = env; }

void ScriptEngine::addPermanentRegisterCallback(RegisterCallback cb) {
    if (std::find(_permRegisterCallbackArray.begin(), _permRegisterCallbackArray.end(), cb) == _permRegisterCallbackArray.end()) {
        _permRegisterCallbackArray.push_back(cb);
    }
}

void ScriptEngine::setExceptionCallback(const ExceptionCallback &cb) {
    _exceptionCallback = cb;
}

const std::chrono::steady_clock::time_point &ScriptEngine::getStartTime() const { return _startTime; }

bool ScriptEngine::isValid() const { return _isValid; }

void ScriptEngine::enableDebugger(const std::string &serverAddr, uint32_t port, bool isWait) {
    //not impl
    return;
}

bool ScriptEngine::saveByteCodeToFile(const std::string &path, const std::string &pathBc) {
    //not impl
    return true;
}

void ScriptEngine::clearException() {
    //not impl
    return;
}

void ScriptEngine::garbageCollect() {
    SE_LOGD("GC begin ..., (js->native map) size: %{public}d",(int)NativePtrToObjectMap::size());

    if(_gcFunc == nullptr) {
        JSVM_Status status;
        NODE_API_CALL(status, _env, OH_JSVM_MemoryPressureNotification(_env, JSVM_MEMORY_PRESSURE_LEVEL_CRITICAL));
    } else {
        _gcFunc->call({}, nullptr);
    }
    
    SE_LOGD("GC end ..., (js->native map) size: %{public}d",(int)NativePtrToObjectMap::size());
}

bool ScriptEngine::isGarbageCollecting() const {
    return _isGarbageCollecting;
}

void ScriptEngine::_setGarbageCollecting(bool isGarbageCollecting) { //NOLINT(readability-identifier-naming)
    _isGarbageCollecting = isGarbageCollecting;
}

void ScriptEngine::setJSExceptionCallback(const ExceptionCallback &cb) {
    //not impl
    return;
}

void ScriptEngine::addAfterInitHook(const std::function<void()> &hook) {
    _afterInitHookArray.push_back(hook);
    return;
}

std::string ScriptEngine::getCurrentStackTrace() {
    //not impl
    return "";
}

void ScriptEngine::_setNeedCallConstructor(bool need) { _isneedCallConstructor = need; }

bool ScriptEngine::_needCallConstructor() { return _isneedCallConstructor; }

bool ScriptEngine::callFunction(Object *targetObj, const char *funcName, uint32_t argc, Value *args, Value *rval) {
    Value objFunc;
    if (!targetObj->getProperty(funcName, &objFunc)) {
        return false;
    }

    ValueArray argv;

    for (size_t i = 0; i < argc; ++i) {
        argv.push_back(args[i]);
    }

    objFunc.toObject()->call(argv, targetObj, rval);

    return true;
}

void ScriptEngine::handlePromiseExceptions() {
    //not impl
    assert(true);
    return;
}

void ScriptEngine::mainLoopUpdate() {
    // empty implementation
}

void ScriptEngine::throwException(const std::string &errorMessage) {
    JSVM_Status status;
    NODE_API_CALL(status, getEnv(), OH_JSVM_ThrowError(getEnv(), nullptr, errorMessage.c_str()));
}
}; // namespace se
