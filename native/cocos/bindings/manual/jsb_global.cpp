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

#include "jsb_global.h"
#include "application/ApplicationManager.h"
#include "base/Assertf.h"
#include "base/Data.h"
#include "base/DeferredReleasePool.h"
#include "base/Scheduler.h"
#include "base/ThreadPool.h"
#include "base/UTF8.h"
#include "base/ZipUtils.h"
#include "base/base64.h"
#include "bindings/auto/jsb_cocos_auto.h"
#include "core/data/JSBNativeDataHolder.h"
#include "gfx-base/GFXDef.h"
#include "jsb_conversions.h"
#include "network/Downloader.h"
#include "network/HttpClient.h"
#include "platform/Image.h"
#include "platform/interfaces/modules/ISystem.h"
#include "platform/interfaces/modules/ISystemWindow.h"
#include "ui/edit-box/EditBox.h"
#include "xxtea/xxtea.h"

#include <chrono>
#include <regex>
#include <sstream>

#if CC_PLATFORM == CC_PLATFORM_ANDROID
    #include "platform/java/jni/JniImp.h"
#endif

#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY && SCRIPT_ENGINE_TYPE != SCRIPT_ENGINE_NAPI
    #include "platform/openharmony/napi/NapiHelper.h"
#endif

extern void jsb_register_ADPF(se::Object *); // NOLINT

using namespace cc; // NOLINT

LegacyThreadPool *gIOThreadPool = nullptr;

static std::shared_ptr<cc::network::Downloader> gLocalDownloader = nullptr;
static ccstd::unordered_map<ccstd::string, std::function<void(const ccstd::string &, unsigned char *, uint)>> gLocalDownloaderHandlers;
static uint64_t gLocalDownloaderTaskId = 1000000;

static cc::network::Downloader *localDownloader() {
    if (!gLocalDownloader) {
        gLocalDownloader = std::make_shared<cc::network::Downloader>();
        gLocalDownloader->onDataTaskSuccess = [=](const cc::network::DownloadTask &task,
                                                  const ccstd::vector<unsigned char> &data) {
            if (data.empty()) {
                SE_REPORT_ERROR("Getting image from (%s) failed!", task.requestURL.c_str());
                return;
            }

            auto callback = gLocalDownloaderHandlers.find(task.identifier);
            if (callback == gLocalDownloaderHandlers.end()) {
                SE_REPORT_ERROR("Getting image from (%s), callback not found!!", task.requestURL.c_str());
                return;
            }
            size_t imageBytes = data.size();
            auto *imageData = static_cast<unsigned char *>(malloc(imageBytes));
            memcpy(imageData, data.data(), imageBytes);

            (callback->second)("", imageData, static_cast<uint>(imageBytes));
            // initImageFunc("", imageData, imageBytes);
            gLocalDownloaderHandlers.erase(callback);
        };
        gLocalDownloader->onTaskError = [=](const cc::network::DownloadTask &task,
                                            int errorCode,                   // NOLINT
                                            int errorCodeInternal,           // NOLINT
                                            const ccstd::string &errorStr) { // NOLINT
            SE_REPORT_ERROR("Getting image from (%s) failed!", task.requestURL.c_str());
            gLocalDownloaderHandlers.erase(task.identifier);
        };
    }
    return gLocalDownloader.get();
}

static void localDownloaderCreateTask(const ccstd::string &url, const std::function<void(const ccstd::string &, unsigned char *, int)> &callback) {
#if CC_PLATFORM != CC_PLATFORM_OPENHARMONY // TODO(qgh):May be removed later
    std::stringstream ss;
    ss << "jsb_loadimage_" << (gLocalDownloaderTaskId++);
    ccstd::string key = ss.str();
    auto task = localDownloader()->createDataTask(url, key);
    gLocalDownloaderHandlers.emplace(task->identifier, callback);
#endif
}

bool jsb_set_extend_property(const char *ns, const char *clsName) { // NOLINT
    se::Object *globalObj = se::ScriptEngine::getInstance()->getGlobalObject();
    se::Value nsVal;
    if (globalObj->getProperty(ns, &nsVal) && nsVal.isObject()) {
        se::Value ccVal;
        if (globalObj->getProperty("cc", &ccVal) && ccVal.isObject()) {
            se::Value ccClassVal;
            if (ccVal.toObject()->getProperty("Class", &ccClassVal) && ccClassVal.isObject()) {
                se::Value extendVal;
                if (ccClassVal.toObject()->getProperty("extend", &extendVal) && extendVal.isObject() && extendVal.toObject()->isFunction()) {
                    se::Value targetClsVal;
                    if (nsVal.toObject()->getProperty(clsName, &targetClsVal) && targetClsVal.isObject()) {
                        return targetClsVal.toObject()->setProperty("extend", extendVal);
                    }
                }
            }
        }
    }
    return false;
}

namespace {

ccstd::unordered_map<ccstd::string, se::Value> gModuleCache;

static bool require(se::State &s) { // NOLINT
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    CC_ASSERT_GE(argc, 1);
    CC_ASSERT(args[0].isString());

    return jsb_run_script(args[0].toString(), &s.rval());
}
SE_BIND_FUNC(require)

static bool doModuleRequire(const ccstd::string &path, se::Value *ret, const ccstd::string &prevScriptFileDir) { // NOLINT
    se::AutoHandleScope hs;
    CC_ASSERT(!path.empty());

    const auto &fileOperationDelegate = se::ScriptEngine::getInstance()->getFileOperationDelegate();
    CC_ASSERT(fileOperationDelegate.isValid());

    ccstd::string fullPath;

    ccstd::string pathWithSuffix = path;
    if (pathWithSuffix.rfind(".js") != (pathWithSuffix.length() - 3)) {
        pathWithSuffix += ".js";
    }
    ccstd::string scriptBuffer = fileOperationDelegate.onGetStringFromFile(pathWithSuffix);

    if (scriptBuffer.empty() && !prevScriptFileDir.empty()) {
        ccstd::string secondPath = prevScriptFileDir;
        if (secondPath[secondPath.length() - 1] != '/') {
            secondPath += "/";
        }

        secondPath += path;

        if (FileUtils::getInstance()->isDirectoryExist(secondPath)) {
            if (secondPath[secondPath.length() - 1] != '/') {
                secondPath += "/";
            }
            secondPath += "index.js";
        } else {
            if (path.rfind(".js") != (path.length() - 3)) {
                secondPath += ".js";
            }
        }

        fullPath = fileOperationDelegate.onGetFullPath(secondPath);
        scriptBuffer = fileOperationDelegate.onGetStringFromFile(fullPath);
    } else {
        fullPath = fileOperationDelegate.onGetFullPath(pathWithSuffix);
    }

    if (!scriptBuffer.empty()) {
        const auto &iter = gModuleCache.find(fullPath);
        if (iter != gModuleCache.end()) {
            *ret = iter->second;
            //                printf("Found cache: %s, value: %d\n", fullPath.c_str(), (int)ret->getType());
            return true;
        }
        ccstd::string currentScriptFileDir = FileUtils::getInstance()->getFileDir(fullPath);

        // Add closure for evalutate the script
        char prefix[] = "(function(currentScriptDir){ window.module = window.module || {}; var exports = window.module.exports = {}; ";
        char suffix[512] = {0};
        snprintf(suffix, sizeof(suffix), "\nwindow.module.exports = window.module.exports || exports;\n})('%s'); ", currentScriptFileDir.c_str());

        // Add current script path to require function invocation
        scriptBuffer = prefix + std::regex_replace(scriptBuffer, std::regex("([^A-Za-z0-9]|^)requireModule\\((.*?)\\)"), "$1requireModule($2, currentScriptDir)") + suffix;

        //            FILE* fp = fopen("/Users/james/Downloads/test.txt", "wb");
        //            fwrite(scriptBuffer.c_str(), scriptBuffer.length(), 1, fp);
        //            fclose(fp);

#if CC_PLATFORM == CC_PLATFORM_MACOS || CC_PLATFORM == CC_PLATFORM_IOS
        ccstd::string reletivePath = fullPath;
    #if CC_PLATFORM == CC_PLATFORM_MACOS
        const ccstd::string reletivePathKey = "/Contents/Resources";
    #else
        const ccstd::string reletivePathKey = ".app";
    #endif

        size_t pos = reletivePath.find(reletivePathKey);
        if (pos != ccstd::string::npos) {
            reletivePath = reletivePath.substr(pos + reletivePathKey.length() + 1);
        }
#else
        const ccstd::string &reletivePath = fullPath;
#endif

        auto *se = se::ScriptEngine::getInstance();
        bool succeed = se->evalString(scriptBuffer.c_str(), static_cast<uint32_t>(scriptBuffer.length()), nullptr, reletivePath.c_str());
        se::Value moduleVal;
        if (succeed && se->getGlobalObject()->getProperty("module", &moduleVal) && moduleVal.isObject()) {
            se::Value exportsVal;
            if (moduleVal.toObject()->getProperty("exports", &exportsVal)) {
                if (ret != nullptr) {
                    *ret = exportsVal;
                }
                gModuleCache[fullPath] = std::move(exportsVal);
            } else {
                gModuleCache[fullPath] = se::Value::Undefined;
            }
            // clear module.exports
            moduleVal.toObject()->setProperty("exports", se::Value::Undefined);
        } else {
            gModuleCache[fullPath] = se::Value::Undefined;
        }
        CC_ASSERT(succeed);
        return succeed;
    }

    SE_LOGE("doModuleRequire %s, buffer is empty!\n", path.c_str());
    CC_ABORT();
    return false;
}

static bool moduleRequire(se::State &s) { // NOLINT
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    CC_ASSERT_GE(argc, 2);
    CC_ASSERT(args[0].isString());
    CC_ASSERT(args[1].isString());

    return doModuleRequire(args[0].toString(), &s.rval(), args[1].toString());
}
SE_BIND_FUNC(moduleRequire)
} // namespace

bool jsb_run_script(const ccstd::string &filePath, se::Value *rval /* = nullptr */) { // NOLINT
    se::AutoHandleScope hs;
    return se::ScriptEngine::getInstance()->runScript(filePath, rval);
}

bool jsb_run_script_module(const ccstd::string &filePath, se::Value *rval /* = nullptr */) { // NOLINT
    return doModuleRequire(filePath, rval, "");
}

static bool jsc_garbageCollect(se::State &s) { // NOLINT
    se::ScriptEngine::getInstance()->garbageCollect();
    return true;
}
SE_BIND_FUNC(jsc_garbageCollect)

static bool jsc_dumpNativePtrToSeObjectMap(se::State &s) { // NOLINT
    CC_LOG_DEBUG(">>> total: %d, Dump (native -> jsobj) map begin", (int)se::NativePtrToObjectMap::size());

    struct NamePtrStruct {
        const char *name;
        void *ptr;
    };

    ccstd::vector<NamePtrStruct> namePtrArray;

    for (const auto &e : se::NativePtrToObjectMap::instance()) {
        se::Object *jsobj = e.second;
        CC_ASSERT(jsobj->_getClass() != nullptr);
        NamePtrStruct tmp;
        tmp.name = jsobj->_getClass()->getName();
        tmp.ptr = e.first;
        namePtrArray.push_back(tmp);
    }

    std::sort(namePtrArray.begin(), namePtrArray.end(), [](const NamePtrStruct &a, const NamePtrStruct &b) -> bool {
        ccstd::string left = a.name;
        ccstd::string right = b.name;
        for (ccstd::string::const_iterator lit = left.begin(), rit = right.begin(); lit != left.end() && rit != right.end(); ++lit, ++rit) {
            if (::tolower(*lit) < ::tolower(*rit)) {
                return true;
            }
            if (::tolower(*lit) > ::tolower(*rit)) {
                return false;
            }
        }
        return left.size() < right.size();
    });

    for (const auto &e : namePtrArray) {
        CC_LOG_DEBUG("%s: %p", e.name, e.ptr);
    }
    CC_LOG_DEBUG(">>> total: %d, Dump (native -> jsobj) map end", (int)se::NativePtrToObjectMap::size());
    return true;
}
SE_BIND_FUNC(jsc_dumpNativePtrToSeObjectMap)

static bool jsc_dumpRoot(se::State &s) { // NOLINT
    CC_ABORT();
    return true;
}
SE_BIND_FUNC(jsc_dumpRoot)

static bool JSBCore_platform(se::State &s) { // NOLINT
    // Application::Platform platform = CC_CURRENT_ENGINE()->getPlatform();
    cc::BasePlatform::OSType type =
        cc::BasePlatform::getPlatform()->getOSType();
    s.rval().setInt32(static_cast<int32_t>(type));
    return true;
}
SE_BIND_FUNC(JSBCore_platform)

static bool JSBCore_os(se::State &s) { // NOLINT
    se::Value os;

    // osx, ios, android, windows, linux, etc..
#if (CC_PLATFORM == CC_PLATFORM_IOS)
    os.setString("iOS");
#elif (CC_PLATFORM == CC_PLATFORM_ANDROID)
    os.setString("Android");
#elif (CC_PLATFORM == CC_PLATFORM_WINDOWS)
    os.setString("Windows");
#elif (CC_PLATFORM == CC_PLATFORM_LINUX)
    os.setString("Linux");
#elif (CC_PLATFORM == CC_PLATFORM_QNX)
    os.setString("Qnx");
#elif (CC_PLATFORM == CC_PLATFORM_MACOS)
    os.setString("OS X");
#elif (CC_PLATFORM == CC_PLATFORM_OHOS)
    os.setString("OHOS");
#elif (CC_PLATFORM == CC_PLATFORM_OPENHARMONY)
    os.setString("OpenHarmony");
#endif

    s.rval() = os;
    return true;
}
SE_BIND_FUNC(JSBCore_os)

static bool JSBCore_getCurrentLanguage(se::State &s) { // NOLINT
    auto *systemIntf = CC_GET_PLATFORM_INTERFACE(ISystem);
    CC_ASSERT_NOT_NULL(systemIntf);
    ccstd::string languageStr = systemIntf->getCurrentLanguageToString();
    s.rval().setString(languageStr);
    return true;
}
SE_BIND_FUNC(JSBCore_getCurrentLanguage)

static bool JSBCore_getCurrentLanguageCode(se::State &s) { // NOLINT
    auto *systemIntf = CC_GET_PLATFORM_INTERFACE(ISystem);
    CC_ASSERT_NOT_NULL(systemIntf);
    ccstd::string language = systemIntf->getCurrentLanguageCode();
    s.rval().setString(language);
    return true;
}
SE_BIND_FUNC(JSBCore_getCurrentLanguageCode)

static bool JSB_getOSVersion(se::State &s) { // NOLINT
    auto *systemIntf = CC_GET_PLATFORM_INTERFACE(ISystem);
    CC_ASSERT_NOT_NULL(systemIntf);
    ccstd::string systemVersion = systemIntf->getSystemVersion();
    s.rval().setString(systemVersion);
    return true;
}
SE_BIND_FUNC(JSB_getOSVersion)

static bool JSB_supportHPE(se::State &s) { // NOLINT
#if CC_PLATFORM == CC_PLATFORM_ANDROID
    s.rval().setBoolean(getSupportHPE());
#else
    s.rval().setBoolean(false);
#endif
    return true;
}
SE_BIND_FUNC(JSB_supportHPE)

static bool JSB_core_restartVM(se::State &s) { // NOLINT
    // REFINE: release AudioEngine, waiting HttpClient & WebSocket threads to exit.
    CC_CURRENT_APPLICATION()->restart();
    return true;
}
SE_BIND_FUNC(JSB_core_restartVM)

static bool JSB_closeWindow(se::State &s) { // NOLINT
    CC_CURRENT_APPLICATION()->close();
    return true;
}
SE_BIND_FUNC(JSB_closeWindow)

static bool JSB_exit(se::State &s) { // NOLINT
    BasePlatform::getPlatform()->exit();
    return true;
}
SE_BIND_FUNC(JSB_exit);

static bool JSB_isObjectValid(se::State &s) { // NOLINT
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    if (argc == 1) {
        void *nativePtr = nullptr;
        seval_to_native_ptr(args[0], &nativePtr);
        s.rval().setBoolean(nativePtr != nullptr);
        return true;
    }

    SE_REPORT_ERROR("Invalid number of arguments: %d. Expecting: 1", argc);
    return false;
}
SE_BIND_FUNC(JSB_isObjectValid)

static bool JSB_setCursorEnabled(se::State &s) { // NOLINT
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    SE_PRECONDITION2(argc == 1, false, "Invalid number of arguments");
    bool ok = true;
    bool value = true;
    ok &= sevalue_to_native(args[0], &value);
    SE_PRECONDITION2(ok, false, "Error processing arguments");

    auto *systemWindowIntf = CC_GET_SYSTEM_WINDOW(ISystemWindow::mainWindowId);
    CC_ASSERT_NOT_NULL(systemWindowIntf);
    systemWindowIntf->setCursorEnabled(value);
    return true;
}
SE_BIND_FUNC(JSB_setCursorEnabled)

static bool JSB_saveByteCode(se::State &s) { // NOLINT
    const auto &args = s.args();
    int argc = static_cast<int>(args.size());
    SE_PRECONDITION2(argc == 2, false, "Invalid number of arguments");
    bool ok = true;
    ccstd::string srcfile;
    ccstd::string dstfile;
    ok &= sevalue_to_native(args[0], &srcfile);
    ok &= sevalue_to_native(args[1], &dstfile);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    ok = se::ScriptEngine::getInstance()->saveByteCodeToFile(srcfile, dstfile);
    s.rval().setBoolean(ok);
    return true;
}
SE_BIND_FUNC(JSB_saveByteCode)

static bool getOrCreatePlainObject_r(const char *name, se::Object *parent, se::Object **outObj) { // NOLINT
    CC_ASSERT_NOT_NULL(parent);
    CC_ASSERT_NOT_NULL(outObj);
    se::Value tmp;

    if (parent->getProperty(name, &tmp) && tmp.isObject()) {
        *outObj = tmp.toObject();
        (*outObj)->incRef();
    } else {
        *outObj = se::Object::createPlainObject();
        parent->setProperty(name, se::Value(*outObj));
    }

    return true;
}

static bool js_performance_now(se::State &s) { // NOLINT
    auto now = std::chrono::steady_clock::now();
    auto micro = std::chrono::duration_cast<std::chrono::microseconds>(now - se::ScriptEngine::getInstance()->getStartTime()).count();
    s.rval().setDouble(static_cast<double>(micro) * 0.001);
    return true;
}
SE_BIND_FUNC(js_performance_now)

namespace {
struct ImageInfo {
    uint32_t length = 0;
    uint32_t width = 0;
    uint32_t height = 0;
    uint8_t *data = nullptr;
    cc::gfx::Format format = cc::gfx::Format::UNKNOWN;
    bool hasAlpha = false;
    bool compressed = false;
    ccstd::vector<uint32_t> mipmapLevelDataSize;
};

uint8_t *convertRGB2RGBA(uint32_t length, uint8_t *src) {
    auto *dst = reinterpret_cast<uint8_t *>(malloc(length));
    for (uint32_t i = 0; i < length; i += 4) {
        dst[i] = *src++;
        dst[i + 1] = *src++;
        dst[i + 2] = *src++;
        dst[i + 3] = 255;
    }
    return dst;
}

uint8_t *convertIA2RGBA(uint32_t length, uint8_t *src) {
    auto *dst = reinterpret_cast<uint8_t *>(malloc(length));
    for (uint32_t i = 0; i < length; i += 4) {
        dst[i] = *src;
        dst[i + 1] = *src;
        dst[i + 2] = *src++;
        dst[i + 3] = *src++;
    }
    return dst;
}

uint8_t *convertI2RGBA(uint32_t length, uint8_t *src) {
    auto *dst = reinterpret_cast<uint8_t *>(malloc(length));
    for (uint32_t i = 0; i < length; i += 4) {
        dst[i] = *src;
        dst[i + 1] = *src;
        dst[i + 2] = *src++;
        dst[i + 3] = 255;
    }
    return dst;
}

struct ImageInfo *createImageInfo(Image *img) {
    auto *imgInfo = ccnew struct ImageInfo();
    imgInfo->length = static_cast<uint32_t>(img->getDataLen());
    imgInfo->width = img->getWidth();
    imgInfo->height = img->getHeight();
    img->takeData(&imgInfo->data);
    imgInfo->format = img->getRenderFormat();
    imgInfo->compressed = img->isCompressed();
    imgInfo->mipmapLevelDataSize = img->getMipmapLevelDataSize();

    // Convert to RGBA888 because standard web api will return only RGBA888.
    // If not, then it may have issue in glTexSubImage. For example, engine
    // will create a big texture, and update its content with small pictures.
    // The big texture is RGBA888, then the small picture should be the same
    // format, or it will cause 0x502 error on OpenGL ES 2.
    if (!imgInfo->compressed && imgInfo->format != cc::gfx::Format::RGBA8) {
        imgInfo->length = img->getWidth() * img->getHeight() * 4;
        uint8_t *dst = nullptr;
        uint32_t length = imgInfo->length;
        uint8_t *src = imgInfo->data;
        switch (imgInfo->format) {
            case cc::gfx::Format::A8:
            case cc::gfx::Format::LA8:
                dst = convertIA2RGBA(length, src);
                break;
            case cc::gfx::Format::L8:
            case cc::gfx::Format::R8:
            case cc::gfx::Format::R8I:
                dst = convertI2RGBA(length, src);
                break;
            case cc::gfx::Format::RGB8:
                dst = convertRGB2RGBA(length, src);
                break;
            default:
                SE_LOGE("unknown image format");
                break;
        }

        if (dst != imgInfo->data) free(imgInfo->data);
        imgInfo->data = dst;
        imgInfo->hasAlpha = true;
    }

    return imgInfo;
}
} // namespace

bool jsb_global_load_image(const ccstd::string &path, const se::Value &callbackVal) { // NOLINT(readability-identifier-naming)
    if (path.empty()) {
        se::ValueArray seArgs;
        callbackVal.toObject()->call(seArgs, nullptr);
        return true;
    }

    std::shared_ptr<se::Value> callbackPtr = std::make_shared<se::Value>(callbackVal);

    auto initImageFunc = [path, callbackPtr](const ccstd::string &fullPath, unsigned char *imageData, int imageBytes) {
        auto *img = ccnew Image();

        gIOThreadPool->pushTask([=](int /*tid*/) {
            // NOTE: FileUtils::getInstance()->fullPathForFilename isn't a threadsafe method,
            // Image::initWithImageFile will call fullPathForFilename internally which may
            // cause thread race issues. Therefore, we get the full path of file before
            // going into task callback.
            // Be careful of invoking any Cocos2d-x interface in a sub-thread.
            bool loadSucceed = false;
            if (fullPath.empty()) {
                loadSucceed = img->initWithImageData(imageData, imageBytes);
                free(imageData);
            } else {
                loadSucceed = img->initWithImageFile(fullPath);
            }

            ImageInfo *imgInfo = nullptr;
            if (loadSucceed) {
                imgInfo = createImageInfo(img);
            }
            auto app = CC_CURRENT_APPLICATION();
            if (!app) {
                delete imgInfo;
                delete img;
                return;
            }
            auto engine = app->getEngine();
            CC_ASSERT_NOT_NULL(engine);
            engine->getScheduler()->performFunctionInCocosThread([=]() {
                se::AutoHandleScope hs;
                se::ValueArray seArgs;

                if (loadSucceed) {
                    se::HandleObject retObj(se::Object::createPlainObject());
                    auto *obj = se::Object::createObjectWithClass(__jsb_cc_JSBNativeDataHolder_class);
                    auto *nativeObj = JSB_MAKE_PRIVATE_OBJECT(cc::JSBNativeDataHolder, imgInfo->data);
                    obj->setPrivateObject(nativeObj);
                    retObj->setProperty("data", se::Value(obj));
                    retObj->setProperty("width", se::Value(imgInfo->width));
                    retObj->setProperty("height", se::Value(imgInfo->height));

                    se::Value mipmapLevelDataSizeArr;
                    nativevalue_to_se(imgInfo->mipmapLevelDataSize, mipmapLevelDataSizeArr, nullptr);
                    retObj->setProperty("mipmapLevelDataSize", mipmapLevelDataSizeArr);

                    seArgs.push_back(se::Value(retObj));

                    delete imgInfo;
                } else {
                    SE_REPORT_ERROR("initWithImageFile: %s failed!", path.c_str());
                }
                callbackPtr->toObject()->call(seArgs, nullptr);
                delete img;
            });
        });
    };
    size_t pos = ccstd::string::npos;
    if (path.find("http://") == 0 || path.find("https://") == 0) {
        localDownloaderCreateTask(path, initImageFunc);

    } else if (path.find("data:") == 0 && (pos = path.find("base64,")) != ccstd::string::npos) {
        int imageBytes = 0;
        unsigned char *imageData = nullptr;
        size_t dataStartPos = pos + strlen("base64,");
        const char *base64Data = path.data() + dataStartPos;
        size_t dataLen = path.length() - dataStartPos;
        imageBytes = base64Decode(reinterpret_cast<const unsigned char *>(base64Data), static_cast<unsigned int>(dataLen), &imageData);
        if (imageBytes <= 0 || imageData == nullptr) {
            SE_REPORT_ERROR("Decode base64 image data failed!");
            return false;
        }
        initImageFunc("", imageData, imageBytes);
    } else {
        ccstd::string fullPath(FileUtils::getInstance()->fullPathForFilename(path));
        if (0 == path.find("file://")) {
            fullPath = FileUtils::getInstance()->fullPathForFilename(path.substr(strlen("file://")));
        }

        if (fullPath.empty()) {
            SE_REPORT_ERROR("File (%s) doesn't exist!", path.c_str());
            return false;
        }
        initImageFunc(fullPath, nullptr, 0);
    }
    return true;
}

static bool js_loadImage(se::State &s) { // NOLINT
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

        return jsb_global_load_image(path, callbackVal);
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}
SE_BIND_FUNC(js_loadImage)
// pixels(RGBA), width, height, fullFilePath(*.png/*.jpg)
static bool js_saveImageData(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    bool ok = true; // NOLINT(readability-identifier-length)
    if (argc == 4 || argc == 5) {
        auto *uint8ArrayObj = args[0].toObject();
        uint8_t *uint8ArrayData{nullptr};
        size_t length = 0;
        uint8ArrayObj->root();
        uint8ArrayObj->incRef();
        uint8ArrayObj->getTypedArrayData(&uint8ArrayData, &length);
        int32_t width;
        int32_t height;
        ok &= sevalue_to_native(args[1], &width);
        ok &= sevalue_to_native(args[2], &height);

        std::string filePath;
        ok &= sevalue_to_native(args[3], &filePath);
        SE_PRECONDITION2(ok, false, "js_saveImageData : Error processing arguments");

        se::Value callbackVal = argc == 5 ? args[4] : se::Value::Null;
        se::Object *callbackObj{nullptr};
        if (!callbackVal.isNull()) {
            CC_ASSERT(callbackVal.isObject());
            CC_ASSERT(callbackVal.toObject()->isFunction());
            callbackObj = callbackVal.toObject();
            callbackObj->root();
            callbackObj->incRef();
        }

        gIOThreadPool->pushTask([=](int /*tid*/) {
            // isToRGB = false, to keep alpha channel
            auto *img = ccnew Image();
            // A conversion from size_t to uint32_t might lose integer precision
            img->initWithRawData(uint8ArrayData, static_cast<uint32_t>(length), width, height, 32 /*Unused*/);
            bool isSuccess = img->saveToFile(filePath, false /*isToRGB*/);
            CC_CURRENT_ENGINE()->getScheduler()->performFunctionInCocosThread([=]() {
                se::AutoHandleScope hs;
                se::ValueArray seArgs;

                se::Value isSuccessVal;
                nativevalue_to_se(isSuccess, isSuccessVal);

                seArgs.push_back(isSuccessVal);
                if (callbackObj) {
                    callbackObj->call(seArgs, nullptr);
                    callbackObj->unroot();
                    callbackObj->decRef();
                }
                uint8ArrayObj->unroot();
                uint8ArrayObj->decRef();
                delete img;
            });
        });
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d or %d", (int)argc, 4, 5);
    return false;
}
SE_BIND_FUNC(js_saveImageData)
static bool js_destroyImage(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        cc::JSBNativeDataHolder *dataHolder = nullptr;
        ok &= sevalue_to_native(args[0], &dataHolder);
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        dataHolder->destroy();
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_destroyImage)

static bool JSB_openURL(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc > 0) {
        ccstd::string url;
        ok = sevalue_to_native(args[0], &url);
        SE_PRECONDITION2(ok, false, "url is invalid!");
        auto *systemIntf = CC_GET_PLATFORM_INTERFACE(ISystem);
        CC_ASSERT_NOT_NULL(systemIntf);
        systemIntf->openURL(url);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_openURL)

static bool JSB_copyTextToClipboard(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc > 0) {
        ccstd::string text;
        ok = sevalue_to_native(args[0], &text);
        SE_PRECONDITION2(ok, false, "text is invalid!");
        auto *systemIntf = CC_GET_PLATFORM_INTERFACE(ISystem);
        CC_ASSERT_NOT_NULL(systemIntf);
        systemIntf->copyTextToClipboard(text);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_copyTextToClipboard)

static bool JSB_setPreferredFramesPerSecond(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc > 0) {
        int32_t fps;
        ok = sevalue_to_native(args[0], &fps);
        SE_PRECONDITION2(ok, false, "fps is invalid!");
        // cc::log("EMPTY IMPLEMENTATION OF jsb.setPreferredFramesPerSecond");
        CC_CURRENT_ENGINE()->setPreferredFramesPerSecond(fps);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_setPreferredFramesPerSecond)

#if CC_USE_EDITBOX
static bool JSB_showInputBox(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        bool ok;
        se::Value tmp;
        const auto &obj = args[0].toObject();

        cc::EditBox::ShowInfo showInfo;

        ok = obj->getProperty("defaultValue", &tmp);
        SE_PRECONDITION2(ok && tmp.isString(), false, "defaultValue is invalid!");
        showInfo.defaultValue = tmp.toString();

        ok = obj->getProperty("maxLength", &tmp);
        SE_PRECONDITION2(ok && tmp.isNumber(), false, "maxLength is invalid!");
        showInfo.maxLength = tmp.toInt32();

        ok = obj->getProperty("multiple", &tmp);
        SE_PRECONDITION2(ok && tmp.isBoolean(), false, "multiple is invalid!");
        showInfo.isMultiline = tmp.toBoolean();

        if (obj->getProperty("confirmHold", &tmp)) {
            SE_PRECONDITION2(tmp.isBoolean(), false, "confirmHold is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.confirmHold = tmp.toBoolean();
            }
        }

        if (obj->getProperty("confirmType", &tmp)) {
            SE_PRECONDITION2(tmp.isString(), false, "confirmType is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.confirmType = tmp.toString();
            }
        }

        if (obj->getProperty("inputType", &tmp)) {
            SE_PRECONDITION2(tmp.isString(), false, "inputType is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.inputType = tmp.toString();
            }
        }

        if (obj->getProperty("originX", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "originX is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.x = tmp.toInt32();
            }
        }

        if (obj->getProperty("originY", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "originY is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.y = tmp.toInt32();
            }
        }

        if (obj->getProperty("width", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "width is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.width = tmp.toInt32();
            }
        }

        if (obj->getProperty("height", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "height is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.height = tmp.toInt32();
            }
        }
        if (obj->getProperty("fontSize", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "fontSize is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.fontSize = tmp.toUint32();
            }
        }
        if (obj->getProperty("fontColor", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "fontColor is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.fontColor = tmp.toUint32();
            }
        }
        if (obj->getProperty("isBold", &tmp)) {
            SE_PRECONDITION2(tmp.isBoolean(), false, "isBold is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.isBold = tmp.toBoolean();
            }
        }
        if (obj->getProperty("isItalic", &tmp)) {
            SE_PRECONDITION2(tmp.isBoolean(), false, "isItalic is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.isItalic = tmp.toBoolean();
            }
        }
        if (obj->getProperty("isUnderline", &tmp)) {
            SE_PRECONDITION2(tmp.isBoolean(), false, "isUnderline is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.isUnderline = tmp.toBoolean();
            }
        }
        if (obj->getProperty("underlineColor", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "underlinrColor is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.underlineColor = tmp.toUint32();
            }
        }
        if (obj->getProperty("backColor", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "backColor is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.backColor = tmp.toUint32();
            }
        }
        if (obj->getProperty("backgroundColor", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "backgroundColor is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.backgroundColor = tmp.toUint32();
            }
        }
        if (obj->getProperty("textAlignment", &tmp)) {
            SE_PRECONDITION2(tmp.isNumber(), false, "textAlignment is invalid!");
            if (!tmp.isUndefined()) {
                showInfo.textAlignment = tmp.toUint32();
            }
        }
        EditBox::show(showInfo);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_showInputBox);

static bool JSB_hideInputBox(se::State &s) { // NOLINT
    EditBox::hide();
    return true;
}
SE_BIND_FUNC(JSB_hideInputBox)

#endif

static bool jsb_createExternalArrayBuffer(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        uint32_t byteLength{0};
        ok &= sevalue_to_native(args[0], &byteLength, s.thisObject());
        SE_PRECONDITION2(ok, false, "Error processing arguments");
        if (byteLength > 0) {
// NOTE: Currently V8 use shared_ptr which has different abi on win64-debug and win64-release
#if CC_PLATFORM == CC_PLATFORM_WINDOWS && SCRIPT_ENGINE_TYPE == SCRIPT_ENGINE_V8
            se::HandleObject arrayBuffer{se::Object::createArrayBufferObject(nullptr, byteLength)};
#else
            void *buffer = malloc(byteLength);
            memset(buffer, 0x00, byteLength);
            se::HandleObject arrayBuffer{se::Object::createExternalArrayBufferObject(buffer, byteLength, [](void *contents, size_t /*byteLength*/, void * /*userData*/) {
                if (contents != nullptr) {
                    free(contents);
                }
            })};
#endif // CC_PLATFORM == CC_PLATFORM_WINDOWS
            s.rval().setObject(arrayBuffer);
        } else {
            s.rval().setNull();
        }
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(jsb_createExternalArrayBuffer)

static bool JSB_zipUtils_inflateMemory(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc > 0) {
        unsigned char *arg0 = nullptr;
        size_t arg1 = 0;
        if (args[0].isString()) {
            const ccstd::string &str = args[0].toString();
            arg0 = const_cast<unsigned char *>(reinterpret_cast<const unsigned char *>(str.c_str()));
            arg1 = str.size();
        } else if (args[0].isObject()) {
            se::Object *obj = args[0].toObject();
            if (obj->isArrayBuffer()) {
                ok &= obj->getArrayBufferData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
            } else if (obj->isTypedArray()) {
                ok &= obj->getTypedArrayData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
            } else {
                ok = false;
            }
        } else {
            ok = false;
        }
        SE_PRECONDITION2(ok, false, "args[0] is not in type of string | ArrayBuffer | TypedArray");
        unsigned char *arg2 = nullptr;
        uint32_t len = 0;
        if (argc == 1) {
            len = ZipUtils::inflateMemory(arg0, static_cast<uint32_t>(arg1), &arg2);
        } else if (argc == 2) {
            SE_PRECONDITION2(args[1].isNumber(), false, "outLengthHint is invalid!");
            uint32_t outLengthHint = 0;
            if (!args[1].isUndefined()) {
                outLengthHint = args[1].toUint32();
                len = ZipUtils::inflateMemoryWithHint(arg0, static_cast<uint32_t>(arg1), &arg2, outLengthHint);
            } else {
                ok = false;
            }
        } else {
            ok = false;
        }
        SE_PRECONDITION2(ok, false, "args number is not as expected!");
        se::HandleObject seObj(se::Object::createArrayBufferObject(arg2, len));
        if (!seObj.isEmpty() && len > 0) {
            s.rval().setObject(seObj);
        } else {
            s.rval().setNull();
        }
        free(arg2);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_inflateMemory)

static bool JSB_zipUtils_inflateGZipFile(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        SE_PRECONDITION2(args[0].isString(), false, "path is invalid!");
        ccstd::string arg0 = args[0].toString();
        unsigned char *arg1 = nullptr;
        int32_t len = ZipUtils::inflateGZipFile(arg0.c_str(), &arg1);
        se::HandleObject seObj(se::Object::createArrayBufferObject(arg1, len));
        if (!seObj.isEmpty() && len > 0) {
            s.rval().setObject(seObj);
        } else {
            s.rval().setNull();
        }
        free(arg1);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_inflateGZipFile)

static bool JSB_zipUtils_isGZipFile(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        SE_PRECONDITION2(args[0].isString(), false, "path is invalid!");
        ccstd::string arg0 = args[0].toString();
        bool flag = ZipUtils::isGZipFile(arg0.c_str());
        s.rval().setBoolean(flag);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_isGZipFile)

static bool JSB_zipUtils_isGZipBuffer(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        unsigned char *arg0 = nullptr;
        size_t arg1 = 0;
        if (args[0].isString()) {
            const ccstd::string &str = args[0].toString();
            arg0 = const_cast<unsigned char *>(reinterpret_cast<const unsigned char *>(str.c_str()));
            arg1 = str.size();
        } else if (args[0].isObject()) {
            se::Object *obj = args[0].toObject();
            if (obj->isArrayBuffer()) {
                ok &= obj->getArrayBufferData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
            } else if (obj->isTypedArray()) {
                ok &= obj->getTypedArrayData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
            } else {
                ok = false;
            }
        } else {
            ok = false;
        }
        SE_PRECONDITION2(ok, false, "args[0] is not in type of string | ArrayBuffer | TypedArray");
        bool flag = ZipUtils::isGZipBuffer(arg0, static_cast<uint32_t>(arg1));
        s.rval().setBoolean(flag);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_isGZipBuffer)

static bool JSB_zipUtils_inflateCCZFile(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        SE_PRECONDITION2(args[0].isString(), false, "path is invalid!");
        ccstd::string arg0 = args[0].toString();
        unsigned char *arg1 = nullptr;
        int32_t len = ZipUtils::inflateCCZFile(arg0.c_str(), &arg1);
        se::HandleObject seObj(se::Object::createArrayBufferObject(arg1, len));
        if (!seObj.isEmpty() && len > 0) {
            s.rval().setObject(seObj);
        } else {
            s.rval().setNull();
        }
        free(arg1);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_inflateCCZFile)

static bool JSB_zipUtils_inflateCCZBuffer(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        unsigned char *arg0 = nullptr;
        size_t arg1 = 0;
        if (args[0].isString()) {
            const ccstd::string &str = args[0].toString();
            arg0 = const_cast<unsigned char *>(reinterpret_cast<const unsigned char *>(str.c_str()));
            arg1 = str.size();
        } else if (args[0].isObject()) {
            se::Object *obj = args[0].toObject();
            if (obj->isArrayBuffer()) {
                ok &= obj->getArrayBufferData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
            } else if (obj->isTypedArray()) {
                ok &= obj->getTypedArrayData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
            } else {
                ok = false;
            }
        } else {
            ok = false;
        }
        SE_PRECONDITION2(ok, false, "args[0] is not in type of string | ArrayBuffer | TypedArray");
        unsigned char *arg2 = nullptr;
        int32_t len = ZipUtils::inflateCCZBuffer(arg0, static_cast<uint32_t>(arg1), &arg2);
        se::HandleObject seObj(se::Object::createArrayBufferObject(arg2, len));
        if (!seObj.isEmpty() && len > 0) {
            s.rval().setObject(seObj);
        } else {
            s.rval().setNull();
        }
        free(arg2);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_inflateCCZBuffer)

static bool JSB_zipUtils_isCCZFile(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 1) {
        ccstd::string arg0;
        SE_PRECONDITION2(args[0].isString(), false, "path is invalid!");
        arg0 = args[0].toString();
        bool flag = ZipUtils::isCCZFile(arg0.c_str());
        s.rval().setBoolean(flag);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_isCCZFile)

static bool JSB_zipUtils_isCCZBuffer(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        unsigned char *arg0 = nullptr;
        size_t arg1 = 0;
        if (args[0].isString()) {
            const ccstd::string &str = args[0].toString();
            arg0 = const_cast<unsigned char *>(reinterpret_cast<const unsigned char *>(str.c_str()));
            arg1 = str.size();
        } else if (args[0].isObject()) {
            se::Object *obj = args[0].toObject();
            if (obj->isArrayBuffer()) {
                ok &= obj->getArrayBufferData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
            } else if (obj->isTypedArray()) {
                ok &= obj->getTypedArrayData(&arg0, &arg1);
                SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
            } else {
                ok = false;
            }
        } else {
            ok = false;
        }
        SE_PRECONDITION2(ok, false, "args[0] is not in type of string | ArrayBuffer | TypedArray");
        bool flag = ZipUtils::isCCZBuffer(arg0, static_cast<uint32_t>(arg1));
        s.rval().setBoolean(flag);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_isCCZBuffer)

static bool JSB_zipUtils_setPvrEncryptionKeyPart(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 2) {
        SE_PRECONDITION2(args[0].isNumber() && args[1].isNumber(), false, "args is not as expected");
        int32_t arg0 = args[0].toInt32();
        uint32_t arg1 = args[1].toUint32();
        ZipUtils::setPvrEncryptionKeyPart(arg0, arg1);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_setPvrEncryptionKeyPart)

static bool JSB_zipUtils_setPvrEncryptionKey(se::State &s) { // NOLINT
    const auto &args = s.args();
    size_t argc = args.size();
    if (argc == 4) {
        SE_PRECONDITION2(args[0].isNumber() && args[1].isNumber(), false, "args is not as expected");
        uint32_t arg0 = args[0].toUint32();
        uint32_t arg1 = args[1].toUint32();
        uint32_t arg2 = args[2].toUint32();
        uint32_t arg3 = args[3].toUint32();
        ZipUtils::setPvrEncryptionKey(arg0, arg1, arg2, arg3);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 4);
    return false;
}
SE_BIND_FUNC(JSB_zipUtils_setPvrEncryptionKey)

// TextEncoder
static se::Class *__jsb_TextEncoder_class = nullptr; // NOLINT

static bool js_TextEncoder_finalize(se::State &) // NOLINT
{
    return true;
}
SE_BIND_FINALIZE_FUNC(js_TextEncoder_finalize)

static bool js_TextEncoder_constructor(se::State &s) // NOLINT(readability-identifier-naming)
{
    // https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/TextEncoder
    // Since TextEncoder doesn't associate with a c++ object, set the private object to nullptr.
    s.thisObject()->setPrivateObject(nullptr);
    return true;
}
SE_BIND_CTOR(js_TextEncoder_constructor, __jsb_TextEncoder_class, js_TextEncoder_finalize)

static bool js_TextEncoder_encode(se::State &s) // NOLINT(readability-identifier-naming)
{
    // https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encode
    const auto &args = s.args();
    size_t argc = args.size();

    if (argc == 1) {
        const auto &arg0 = args[0];
        SE_PRECONDITION2(arg0.isString(), false, "js_TextEncoder_encode, arg0 is not a string");
        const auto &str = arg0.toString();
        se::HandleObject encodedUint8Array{
            se::Object::createTypedArray(se::Object::TypedArrayType::UINT8, str.data(), str.length())};

        s.rval().setObject(encodedUint8Array);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_TextEncoder_encode)

// TextDecoder
static se::Class *__jsb_TextDecoder_class = nullptr; // NOLINT

static bool js_TextDecoder_finalize(se::State &) // NOLINT
{
    return true;
}
SE_BIND_FINALIZE_FUNC(js_TextDecoder_finalize)

static bool js_TextDecoder_constructor(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = s.args();
    size_t argc = args.size();
    ccstd::string encoding = "utf-8";
    if (argc > 0) {
        if (args[0].isString()) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings
            // NOTE: We only support utf-8 and utf-16 encoding now.
            auto label = args[0].toString();
            
            // Convert to lowercase to support 'UTF-8', 'UTF-16'
            std::transform(label.begin(), label.end(), label.begin(), [](char c){
                return ::tolower(c);
            });
            
            if (label == "unicode-1-1-utf-8" || label == "utf-8" || label == "utf8") {
                encoding = "utf-8";
            } else if (label == "utf-16" || label == "utf-16le") {
                encoding = "utf-16le";
            } else {
                CC_LOG_WARNING("TextDecoder only supports utf-8 and utf-16, but got: %s", label.c_str());
            }
        }
    }
    s.thisObject()->setProperty("encoding", se::Value{encoding});
    s.thisObject()->setProperty("fatal", se::Value{false});
    s.thisObject()->setProperty("ignoreBOM", se::Value{false});
    // Since TextDecoder doesn't associate with a c++ object, set the private object to nullptr.
    s.thisObject()->setPrivateObject(nullptr);
    return true;
}
SE_BIND_CTOR(js_TextDecoder_constructor, __jsb_TextDecoder_class, js_TextDecoder_finalize)

static bool js_TextDecoder_decode(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = s.args();
    size_t argc = args.size();

    if (argc == 1) {
        const auto &arg0 = args[0];
        SE_PRECONDITION2(arg0.isObject() && arg0.toObject()->isTypedArray(), false, "js_TextDecoder_decode, arg0 is not a Uint8Array");
        auto *uint8ArrayObj = arg0.toObject();
        uint8_t *uint8ArrayData = nullptr;
        size_t length = 0;
        bool ok = uint8ArrayObj->getTypedArrayData(&uint8ArrayData, &length);
        SE_PRECONDITION2(ok, false, "js_TextDecoder_decode, get typedarray data failed!");

        se::Value encodingVal;
        s.thisObject()->getProperty("encoding", &encodingVal);
        if (encodingVal.isString()) {
            const auto &encoding = encodingVal.toString();
            if (encoding == "utf-8") {
                ccstd::string str{reinterpret_cast<const char *>(uint8ArrayData), length};
                s.rval().setString(str);
            } else if (encoding == "utf-16le") {
                std::u16string u16Str{reinterpret_cast<const char16_t *>(uint8ArrayData), length / 2};
                ccstd::string u8Str;
                cc::StringUtils::UTF16ToUTF8(u16Str, u8Str);
                s.rval().setString(u8Str);
            } else {
                SE_REPORT_ERROR("Wrong encoding: %s, only utf-8 & utf-16 are supported", encoding.c_str());
            }
        } else {
            SE_REPORT_ERROR("TextDecoder.encoding is not a string");
        }

        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_TextDecoder_decode)

static bool jsb_register_TextEncoder(se::Object *globalObj) { // NOLINT
    auto *cls = se::Class::create("TextEncoder", globalObj, nullptr, _SE(js_TextEncoder_constructor));
    cls->defineFunction("encode", _SE(js_TextEncoder_encode));
    cls->defineFinalizeFunction(_SE(js_TextEncoder_finalize));
    cls->install();

    __jsb_TextEncoder_class = cls;

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

static bool jsb_register_TextDecoder(se::Object *globalObj) { // NOLINT
    auto *cls = se::Class::create("TextDecoder", globalObj, nullptr, _SE(js_TextDecoder_constructor));
    cls->defineFunction("decode", _SE(js_TextDecoder_decode));
    cls->defineFinalizeFunction(_SE(js_TextDecoder_finalize));
    cls->install();

    __jsb_TextDecoder_class = cls;

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

static bool JSB_process_get_argv(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = CC_CURRENT_APPLICATION()->getArguments();
    nativevalue_to_se(args, s.rval());
    return true;
}
SE_BIND_PROP_GET(JSB_process_get_argv)

#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY && SCRIPT_ENGINE_TYPE != SCRIPT_ENGINE_NAPI

static bool sevalue_to_napivalue(const se::Value &seVal, Napi::Value *napiVal, Napi::Env env);

static bool seobject_to_napivalue(se::Object *seObj, Napi::Value *napiVal, Napi::Env env) {
    auto napiObj = Napi::Object::New(env);
    ccstd::vector<ccstd::string> allKeys;
    bool ok = seObj->getAllKeys(&allKeys);
    if (ok && !allKeys.empty()) {
        for (const auto &key : allKeys) {
            Napi::Value napiProp;
            se::Value prop;
            ok = seObj->getProperty(key, &prop);
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

static bool JSB_openharmony_postMessage(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();

    if (argc == 2) {
        bool ok = false;
        ccstd::string msgType;
        ok = sevalue_to_native(args[0], &msgType, s.thisObject());
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        const auto &arg1 = args[1];
        auto env = NapiHelper::getWorkerEnv();

        Napi::Value napiArg1 = env.Undefined();

        if (arg1.isNumber()) {
            napiArg1 = Napi::Number::New(env, arg1.toDouble());
        } else if (arg1.isObject()) {
            seobject_to_napivalue(arg1.toObject(), &napiArg1, env);
        } else {
            SE_REPORT_ERROR("postMessage, Unsupported type");
            return false;
        }

        NapiHelper::postMessageToUIThread(msgType.c_str(), napiArg1);
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}
SE_BIND_FUNC(JSB_openharmony_postMessage)

static bool JSB_empty_promise_then(se::State &s) {
    return true;
}
SE_BIND_FUNC(JSB_empty_promise_then)

static bool JSB_openharmony_postSyncMessage(se::State &s) { // NOLINT(readability-identifier-naming)
    const auto &args = s.args();
    size_t argc = args.size();

    if (argc == 2) {
        bool ok = false;
        ccstd::string msgType;
        ok = sevalue_to_native(args[0], &msgType, s.thisObject());
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        const auto &arg1 = args[1];
        auto env = NapiHelper::getWorkerEnv();

        Napi::Value napiArg1 = env.Undefined();

        if (arg1.isNumber()) {
            napiArg1 = Napi::Number::New(env, arg1.toDouble());
        } else if (arg1.isObject()) {
            seobject_to_napivalue(arg1.toObject(), &napiArg1, env);
        } else {
            SE_REPORT_ERROR("postMessage, Unsupported type");
            return false;
        }

        Napi::Value napiPromise = NapiHelper::postSyncMessageToUIThread(msgType.c_str(), napiArg1);

        // TODO(cjh): Implement Promise for se
        se::HandleObject retObj(se::Object::createPlainObject());
        retObj->defineFunction("then", _SE(JSB_empty_promise_then));
        s.rval().setObject(retObj);
        //
        return true;
    }

    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
    return false;
}
SE_BIND_FUNC(JSB_openharmony_postSyncMessage)
#endif

bool jsb_register_global_variables(se::Object *global) { // NOLINT
    gIOThreadPool = LegacyThreadPool::newFixedThreadPool(5);

#if CC_EDITOR
    global->defineFunction("__require", _SE(require));
#else
    global->defineFunction("require", _SE(require));
#endif
    global->defineFunction("requireModule", _SE(moduleRequire));

    getOrCreatePlainObject_r("jsb", global, &__jsbObj);

    __jsbObj->defineFunction("garbageCollect", _SE(jsc_garbageCollect));
    __jsbObj->defineFunction("dumpNativePtrToSeObjectMap", _SE(jsc_dumpNativePtrToSeObjectMap));

    __jsbObj->defineFunction("loadImage", _SE(js_loadImage));
    __jsbObj->defineFunction("saveImageData", _SE(js_saveImageData));
    __jsbObj->defineFunction("openURL", _SE(JSB_openURL));
    __jsbObj->defineFunction("copyTextToClipboard", _SE(JSB_copyTextToClipboard));
    __jsbObj->defineFunction("setPreferredFramesPerSecond", _SE(JSB_setPreferredFramesPerSecond));
    __jsbObj->defineFunction("destroyImage", _SE(js_destroyImage));
    
#if CC_USE_EDITBOX
    __jsbObj->defineFunction("showInputBox", _SE(JSB_showInputBox));
    __jsbObj->defineFunction("hideInputBox", _SE(JSB_hideInputBox));
#endif
    __jsbObj->defineFunction("setCursorEnabled", _SE(JSB_setCursorEnabled));
    __jsbObj->defineFunction("saveByteCode", _SE(JSB_saveByteCode));
    __jsbObj->defineFunction("createExternalArrayBuffer", _SE(jsb_createExternalArrayBuffer));

    // Create process object
    se::HandleObject processObj{se::Object::createPlainObject()};
    processObj->defineProperty("argv", _SE(JSB_process_get_argv), nullptr);
    __jsbObj->setProperty("process", se::Value(processObj));

    se::HandleObject zipUtils(se::Object::createPlainObject());
    zipUtils->defineFunction("inflateMemory", _SE(JSB_zipUtils_inflateMemory));
    zipUtils->defineFunction("inflateGZipFile", _SE(JSB_zipUtils_inflateGZipFile));
    zipUtils->defineFunction("isGZipFile", _SE(JSB_zipUtils_isGZipFile));
    zipUtils->defineFunction("isGZipBuffer", _SE(JSB_zipUtils_isGZipBuffer));
    zipUtils->defineFunction("inflateCCZFile", _SE(JSB_zipUtils_inflateCCZFile));
    zipUtils->defineFunction("inflateCCZBuffer", _SE(JSB_zipUtils_inflateCCZBuffer));
    zipUtils->defineFunction("isCCZFile", _SE(JSB_zipUtils_isCCZFile));
    zipUtils->defineFunction("isCCZBuffer", _SE(JSB_zipUtils_isCCZBuffer));
    zipUtils->defineFunction("setPvrEncryptionKeyPart", _SE(JSB_zipUtils_setPvrEncryptionKeyPart));
    zipUtils->defineFunction("setPvrEncryptionKey", _SE(JSB_zipUtils_setPvrEncryptionKey));

    __jsbObj->setProperty("zipUtils", se::Value(zipUtils));

    global->defineFunction("__getPlatform", _SE(JSBCore_platform));
    global->defineFunction("__getOS", _SE(JSBCore_os));
    global->defineFunction("__getOSVersion", _SE(JSB_getOSVersion));
    global->defineFunction("__supportHPE", _SE(JSB_supportHPE));
    global->defineFunction("__getCurrentLanguage", _SE(JSBCore_getCurrentLanguage));
    global->defineFunction("__getCurrentLanguageCode", _SE(JSBCore_getCurrentLanguageCode));
    global->defineFunction("__restartVM", _SE(JSB_core_restartVM));
    global->defineFunction("__close", _SE(JSB_closeWindow));
    global->defineFunction("__isObjectValid", _SE(JSB_isObjectValid));
    global->defineFunction("__exit", _SE(JSB_exit));

    se::HandleObject performanceObj(se::Object::createPlainObject());
    performanceObj->defineFunction("now", _SE(js_performance_now));
    global->setProperty("performance", se::Value(performanceObj));

#if CC_PLATFORM == CC_PLATFORM_OPENHARMONY
    #if SCRIPT_ENGINE_TYPE != SCRIPT_ENGINE_NAPI
    se::HandleObject ohObj(se::Object::createPlainObject());
    global->setProperty("oh", se::Value(ohObj));
    ohObj->defineFunction("postMessage", _SE(JSB_openharmony_postMessage));
    ohObj->defineFunction("postSyncMessage", _SE(JSB_openharmony_postSyncMessage));
    #endif
#endif

    jsb_register_TextEncoder(global);
    jsb_register_TextDecoder(global);

    jsb_register_ADPF(__jsbObj);

    se::ScriptEngine::getInstance()->clearException();

    se::ScriptEngine::getInstance()->addBeforeCleanupHook([]() {
        delete gIOThreadPool;
        gIOThreadPool = nullptr;

        DeferredReleasePool::clear();
    });

    se::ScriptEngine::getInstance()->addAfterCleanupHook([]() {
        DeferredReleasePool::clear();

        gModuleCache.clear();

        SAFE_DEC_REF(__jsbObj);
        SAFE_DEC_REF(__glObj);
    });

    return true;
}
