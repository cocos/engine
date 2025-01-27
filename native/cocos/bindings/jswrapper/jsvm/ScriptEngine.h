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

#include <functional>
#include <thread>
#include "../Value.h"
#include "../config.h"
#include "CommonHeader.h"

using HandleScope = JSVM_HandleScope;
namespace se {
class AutoHandleScope {
public:
    // This interface needs to be implemented in JSVM, similar to V8. 
    // Ref:https://nodejs.org/docs/latest-v17.x/api/n-api.html#object-lifetime-management
    AutoHandleScope();
    ~AutoHandleScope();

private:
    HandleScope _handleScope;
};
using RegisterCallback  = bool (*)(Object *);
using ExceptionCallback = std::function<void(const char *, const char *, const char *)>; // location, message, stack

class ScriptEngine {
public:
    /**
         *  Delegate class for file operation
         */
    class FileOperationDelegate {
    public:
        FileOperationDelegate()
        : onGetDataFromFile(nullptr),
          onGetStringFromFile(nullptr),
          onCheckFileExist(nullptr),
          onGetFullPath(nullptr) {}

        /**
             *  @brief Tests whether delegate is valid.
             */
        bool isValid() const {
            return onGetDataFromFile != nullptr && onGetStringFromFile != nullptr && onCheckFileExist != nullptr && onGetFullPath != nullptr;
        }

        // path, buffer, buffer size
        std::function<void(const std::string &, const std::function<void(const uint8_t *, size_t)> &)> onGetDataFromFile;
        // path, return file string content.
        std::function<std::string(const std::string &)> onGetStringFromFile;
        // path
        std::function<bool(const std::string &)> onCheckFileExist;
        // path, return full path
        std::function<std::string(const std::string &)> onGetFullPath;
    };
    ScriptEngine();
    ~ScriptEngine();
    /**
         *  @brief Sets the delegate for file operation.
         *  @param delegate[in] The delegate instance for file operation.
         */
    void setFileOperationDelegate(const FileOperationDelegate &delegate);

    /**
         *  @brief Compile script file into v8::ScriptCompiler::CachedData and save to file.
         *  @param[in] path The path of script file.
         *  @param[in] pathBc The location where bytecode file should be written to. The path should be ends with ".bc", which indicates a bytecode file.
         *  @return true if succeed, otherwise false.
         */
    bool saveByteCodeToFile(const std::string &path, const std::string &pathBc);

    /**
         *  @brief Gets the delegate for file operation.
         *  @return The delegate for file operation
         */
    const FileOperationDelegate &getFileOperationDelegate() const;

    static ScriptEngine *getInstance();

    /**
         *  @brief Destroys the instance of script engine.
         */
    static void destroyInstance();

    /**
         *  @brief Clears all exceptions.
         */
    void clearException();

    /**
         *  @brief Sets the callback function while an exception is fired in JS.
         *  @param[in] cb The callback function to notify that an exception is fired.
         */
    void setJSExceptionCallback(const ExceptionCallback &cb);

    /**
         *  @brief Sets the callback function while an exception is fired.
         *  @param[in] cb The callback function to notify that an exception is fired.
         */
    void setExceptionCallback(const ExceptionCallback &cb);

     ExceptionCallback& getExceptionCallback() {
          return _exceptionCallback;
     }

    /**
         * @brief Grab a snapshot of the current JavaScript execution stack.
         * @return current stack trace string
         */
    std::string getCurrentStackTrace();
    /**
         *  @brief Executes a utf-8 string buffer which contains JavaScript code.
         *  @param[in] script A utf-8 string buffer, if it isn't null-terminated, parameter `length` should be assigned and > 0.
         *  @param[in] length The length of parameter `scriptStr`, it will be set to string length internally if passing < 0 and parameter `scriptStr` is null-terminated.
         *  @param[in] ret The se::Value that results from evaluating script. Passing nullptr if you don't care about the result.
         *  @param[in] fileName A string containing a URL for the script's source file. This is used by debuggers and when reporting exceptions. Pass NULL if you do not care to include source file information.
         *  @return true if succeed, otherwise false.
         */
    bool evalString(const char *script, ssize_t length = -1, Value *ret = nullptr, const char *fileName = nullptr);

    /**
         *  @brief Adds a callback for registering a native binding module, which will not be removed by ScriptEngine::cleanup.
         *  @param[in] cb A callback for registering a native binding module.
         *  @note This method just add a callback to a vector, callbacks is invoked in `start` method.
         */
     void addPermanentRegisterCallback(RegisterCallback cb);

    /**
         *  @brief Starts the script engine.
         *  @return true if succeed, otherwise false.
         *  @note This method will invoke all callbacks of native binding modules by the order of registration.
         */
    bool start();

    /**
         *  @brief Initializes script engine.
         *  @return true if succeed, otherwise false.
         *  @note This method will create JavaScript context and global object.
         */
    bool init();

    /**
         *  @brief Adds a hook function before initializing script engine.
         *  @param[in] hook A hook function to be invoked before initializing script engine.
         *  @note Multiple hook functions could be added, they will be invoked by the order of adding.
         */
    void addBeforeInitHook(const std::function<void()> &hook);

    /**
         *  @brief Adds a hook function after initializing script engine.
         *  @param[in] hook A hook function to be invoked before initializing script engine.
         *  @note Multiple hook functions could be added, they will be invoked by the order of adding.
         */
    void addAfterInitHook(const std::function<void()> &hook);

    /**
         *  @brief Cleanups script engine.
         *  @note This method will removes all objects in JavaScript VM even whose are rooted, then shutdown JavaScript VMf.
         */
    void cleanup();

    /**
         *  @brief Adds a hook function before cleanuping script engine.
         *  @param[in] hook A hook function to be invoked before cleanuping script engine.
         *  @note Multiple hook functions could be added, they will be invoked by the order of adding.
         */
    void addBeforeCleanupHook(const std::function<void()> &hook);

    /**
         *  @brief Adds a hook function after cleanuping script engine.
         *  @param[in] hook A hook function to be invoked after cleanuping script engine.
         *  @note Multiple hook functions could be added, they will be invoked by the order of adding.
         */
    void addAfterCleanupHook(const std::function<void()> &hook);
    /**
         *  @brief Gets the global object of JavaScript VM.
         *  @return The se::Object stores the global JavaScript object.
         */
    Object *getGlobalObject() const;

    static JSVM_Env getEnv();
    static void     setEnv(JSVM_Env env);

    /**
         *  @brief Adds a callback for registering a native binding module.
         *  @param[in] cb A callback for registering a native binding module.
         *  @note This method just add a callback to a vector, callbacks is invoked in `start` method.
         */
    void addRegisterCallback(RegisterCallback cb);

    const std::chrono::steady_clock::time_point &getStartTime() const;

    /**
         *  @brief Tests whether script engine is doing garbage collection.
         *  @return true if it's in garbage collection, otherwise false.
         */
    bool isGarbageCollecting() const;

    /**
         *  @brief Performs a JavaScript garbage collection.
         */
    void garbageCollect();

    /**
          *  @brief Tests whether script engine is being cleaned up.
          *  @return true if it's in cleaning up, otherwise false.
          */
    bool isInCleanup() const { return _isInCleanup; }
    /**
         *  @brief Executes a file which contains JavaScript code.
         *  @param[in] path Script file path.
         *  @param[in] ret The se::Value that results from evaluating script. Passing nullptr if you don't care about the result.
         *  @return true if succeed, otherwise false.
         */
    bool runScript(const std::string &path, Value *ret = nullptr);

    /**
         *  @brief Tests whether script engine is valid.
         *  @return true if it's valid, otherwise false.
         */
    bool isValid() const;

    /**
         *  @brief Enables JavaScript debugger
         *  @param[in] serverAddr The address of debugger server.
         *  @param[in] isWait Whether wait debugger attach when loading.
         */
    void enableDebugger(const std::string &serverAddr, uint32_t port, bool isWait = false);

    /**
         *  @brief Tests whether JavaScript debugger is enabled
         *  @return true if JavaScript debugger is enabled, otherwise false.
         */
    bool isDebuggerEnabled() const;

    /**
         *  @brief Main loop update trigger, it's need to invoked in main thread every frame.
         */
    void mainLoopUpdate();

    bool runByteCodeFile(const std::string &pathBc, Value *ret /* = nullptr */);

    /**
     * @brief Throw JS exception
     */
    void throwException(const std::string &errorMessage);

     /**
     * @brief for jsvm_new_instance, skip constructor.
     */
    void _setNeedCallConstructor(bool need);

     /**
     * @brief for jsvm_new_instance, skip constructor.
     */
    bool _needCallConstructor();

    /**
     * @brief Fast version of call script function, faster than Object::call
     */
    bool callFunction(Object *targetObj, const char *funcName, uint32_t argc, Value *args, Value *rval = nullptr);

    void _setGarbageCollecting(bool isGarbageCollecting); // NOLINT(readability-identifier-naming)

    void handlePromiseExceptions();

private:
    FileOperationDelegate         _fileOperationDelegate;
    std::vector<RegisterCallback> _registerCallbackArray;
    std::vector<RegisterCallback> _permRegisterCallbackArray;

    std::vector<std::function<void()>> _beforeInitHookArray;
    std::vector<std::function<void()>> _afterInitHookArray;
    std::vector<std::function<void()>> _beforeCleanupHookArray;
    std::vector<std::function<void()>> _afterCleanupHookArray;

    Object * _globalObj = nullptr;
    Value _gcFuncValue;
    Object *_gcFunc{nullptr};

    JSVM_Env _env       = nullptr;
    JSVM_VM _vm         = nullptr;
    JSVM_VMScope _vmScope = nullptr;
    JSVM_EnvScope _envScope = nullptr;
    ExceptionCallback _exceptionCallback;

    bool _isValid{false};
    bool _isGarbageCollecting{false};
    bool _isInCleanup{false};
    bool _isErrorHandleWorking{false};
    bool _isneedCallConstructor{true};
    std::chrono::steady_clock::time_point _startTime;

    JSVM_HandleScope _handleScope;
};
}; // namespace se
