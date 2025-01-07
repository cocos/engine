/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

#include "platform/java/jni/JniHelper.h"
#if ANDROID
    #include <android/log.h>
#else
    #include "cocos/base/Log.h"
#endif
#include <pthread.h>
#include <cstring>

#include "base/UTF8.h"

#define CC_CACHE_CLASS_ID 0

#if ANDROID
    #define LOG_TAG   "JniHelper"
    #define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
    #define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#else
    #define LOGD(...) CC_LOG_DEBUG(__VA_ARGS__)
    #define LOGE(...) CC_LOG_ERROR(__VA_ARGS__)
#endif

namespace {
pthread_key_t g_key; // NOLINT(readability-identifier-naming)
class JClassWrapper final {
public:
    explicit JClassWrapper(jclass kls) {
        if (kls) {
            _globalKls = static_cast<jclass>(cc::JniHelper::getEnv()->NewGlobalRef(static_cast<jobject>(kls)));
        }
    }
    ~JClassWrapper() {
        if (_globalKls) {
            cc::JniHelper::getEnv()->DeleteGlobalRef(_globalKls);
        }
        _globalKls = nullptr;
    }
    jclass operator*() const {
        return _globalKls;
    }

private:
    jclass _globalKls = {};
};
#if CC_CACHE_CLASS_ID
ccstd::unordered_map<const char *, JClassWrapper> _cachedJClasses;
#endif
}; // namespace

jclass _getClassID(const char *className) { // NOLINT
    if (nullptr == className) {
        return nullptr;
    }
#if CC_CACHE_CLASS_ID
    auto it = _cachedJClasses.find(className);
    if (it != _cachedJClasses.end()) {
        return *it->second;
    }
#endif

    JNIEnv *env = cc::JniHelper::getEnv();

    jstring jstrClassName = env->NewStringUTF(className);

    auto *klassObj = static_cast<jclass>(env->CallObjectMethod(cc::JniHelper::classloader,
                                                               cc::JniHelper::loadclassMethodMethodId,
                                                               jstrClassName));

    if (nullptr == klassObj || env->ExceptionCheck()) {
        LOGE("Classloader failed to find class of %s", className);
        if (env->ExceptionCheck()) {
            env->ExceptionDescribe();
        }
        env->ExceptionClear();
        klassObj = nullptr;
    }

    ccDeleteLocalRef(env, jstrClassName);
    //    LOGE("1. delete 0x%p", jstrClassName);
#if CC_CACHE_CLASS_ID
    if (klassObj) {
        _cachedJClasses.emplace(className, klassObj);
    }
#endif
    return klassObj;
}

void cbDetachCurrentThread(void * /*a*/) {
    cc::JniHelper::getJavaVM()->DetachCurrentThread();
}

namespace cc {
jmethodID JniHelper::loadclassMethodMethodId = nullptr;
jobject JniHelper::classloader = nullptr;
std::function<void()> JniHelper::classloaderCallback = nullptr;
jobject JniHelper::sContext = nullptr;
jobject JniHelper::sActivity = nullptr;
JavaVM *JniHelper::sJavaVM = nullptr;

JavaVM *JniHelper::getJavaVM() {
    pthread_t thisthread = pthread_self();
    LOGD("JniHelper::getJavaVM(), pthread_self() = %ld", thisthread);
    return JniHelper::sJavaVM;
}

void JniHelper::init(JNIEnv *env, jobject context) {
    env->GetJavaVM(&JniHelper::sJavaVM);
    JniHelper::sContext = context;

    pthread_key_create(&g_key, cbDetachCurrentThread);
    auto ok = JniHelper::setClassLoaderFrom(context);
    CC_ASSERT(ok);
}

void JniHelper::onDestroy() {
    if (JniHelper::sJavaVM) {
        if (sContext) {
            cc::JniHelper::getEnv()->DeleteGlobalRef(sContext);
            sContext = nullptr;
        }
        if (sActivity) {
            cc::JniHelper::getEnv()->DeleteGlobalRef(sActivity);
            sActivity = nullptr;
        }
        LOGD("JniHelper::onDestroy");
    }
}

JNIEnv *JniHelper::cacheEnv() {
    JavaVM *jvm = JniHelper::sJavaVM;
    JNIEnv *env = nullptr;
    // get jni environment
    jint ret = jvm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_4);

    switch (ret) {
        case JNI_OK:
            // Success!
            pthread_setspecific(g_key, env);
            return env;

        case JNI_EDETACHED:
            // Thread not attached
#if CC_PLATFORM == CC_PLATFORM_ANDROID
            if (jvm->AttachCurrentThread(&env, nullptr) < 0) {
#else
            if (jvm->AttachCurrentThread(reinterpret_cast<void **>(&env), nullptr) < 0) {
#endif
                LOGE("Failed to get the environment using AttachCurrentThread()");

                return nullptr;
            } else {
                // Success : Attached and obtained JNIEnv!
                pthread_setspecific(g_key, env);
                return env;
            }

        case JNI_EVERSION:
            // Cannot recover from this error
            LOGE("JNI interface version 1.4 not supported");
        default:
            LOGE("Failed to get the environment using GetEnv()");
            return nullptr;
    }
}

JNIEnv *JniHelper::getEnv() {
    auto *env = static_cast<JNIEnv *>(pthread_getspecific(g_key));
    if (env == nullptr) {
        env = JniHelper::cacheEnv();
    }
    return env;
}

jobject JniHelper::getContext() {
    return sContext;
}

jobject JniHelper::getActivity() {
    // TODO(cjh): In normal mode, sContext is Activity itself, but in surface-less mode, we need to
    // returns nullptr.
    return sActivity;
}

void JniHelper::setActivity(jobject activity) {
    if (sActivity) {
        cc::JniHelper::getEnv()->DeleteGlobalRef(sActivity);
        sActivity = nullptr;
    }
    sActivity = cc::JniHelper::getEnv()->NewGlobalRef(activity);
}

#if CC_PLATFORM == CC_PLATFORM_OHOS
bool JniHelper::setClassLoaderFrom(jobject contextInstance) {
    if (!JniHelper::classloader) {
        JniMethodInfo getclassloaderMethod;
        if (!JniHelper::getMethodInfoDefaultClassLoader(getclassloaderMethod,
                                                        "ohos/app/AbilityContext",
                                                        "getClassloader", // typo ?
                                                        "()Ljava/lang/ClassLoader;")) {
            return false;
        }

        jobject klassLoader = cc::JniHelper::getEnv()->CallObjectMethod(contextInstance,
                                                                        getclassloaderMethod.methodID);

        if (nullptr == klassLoader) {
            return false;
        }

        JniMethodInfo loadClass;
        if (!JniHelper::getMethodInfoDefaultClassLoader(loadClass,
                                                        "java/lang/ClassLoader",
                                                        "loadClass",
                                                        "(Ljava/lang/String;)Ljava/lang/Class;")) {
            return false;
        }

        JniHelper::classloader = cc::JniHelper::getEnv()->NewGlobalRef(klassLoader);
        JniHelper::loadclassMethodMethodId = loadClass.methodID;
    }

    JniHelper::sContext = cc::JniHelper::getEnv()->NewGlobalRef(contextInstance);
    if (JniHelper::classloaderCallback != nullptr) {
        JniHelper::classloaderCallback();
    }

    return true;
}
#elif CC_PLATFORM == CC_PLATFORM_ANDROID
bool JniHelper::setClassLoaderFrom(jobject contextInstance) {
    if (!JniHelper::classloader) {
        JniMethodInfo getClassloaderMethod;
        if (!JniHelper::getMethodInfoDefaultClassLoader(getClassloaderMethod,
                                                        "android/content/Context",
                                                        "getClassLoader",
                                                        "()Ljava/lang/ClassLoader;")) {
            return false;
        }

        jobject classLoader = cc::JniHelper::getEnv()->CallObjectMethod(contextInstance,
                                                                        getClassloaderMethod.methodID);

        if (nullptr == classLoader) {
            return false;
        }

        JniMethodInfo loadClass;
        if (!JniHelper::getMethodInfoDefaultClassLoader(loadClass,
                                                        "java/lang/ClassLoader",
                                                        "loadClass",
                                                        "(Ljava/lang/String;)Ljava/lang/Class;")) {
            return false;
        }

        JniHelper::classloader = cc::JniHelper::getEnv()->NewGlobalRef(classLoader);
        JniHelper::loadclassMethodMethodId = loadClass.methodID;
    }

    JniHelper::sContext = cc::JniHelper::getEnv()->NewGlobalRef(contextInstance);
    if (JniHelper::classloaderCallback != nullptr) {
        JniHelper::classloaderCallback();
    }

    return true;
}
#endif

bool JniHelper::getStaticMethodInfo(JniMethodInfo &methodinfo,
                                    const char *className,
                                    const char *methodName,
                                    const char *paramCode) {
    if ((nullptr == className) ||
        (nullptr == methodName) ||
        (nullptr == paramCode)) {
        return false;
    }

    JNIEnv *env = JniHelper::getEnv();
    if (!env) {
        LOGE("Failed to get JNIEnv");
        return false;
    }

    jclass classID = _getClassID(className);
    if (!classID) {
        LOGE("Failed to find class %s", className);
        env->ExceptionClear();
        return false;
    }

    jmethodID methodID = env->GetStaticMethodID(classID, methodName, paramCode);
    if (!methodID) {
        LOGE("Failed to find static method id of %s", methodName);
        env->ExceptionClear();
        return false;
    }

    methodinfo.classID = classID;
    methodinfo.env = env;
    methodinfo.methodID = methodID;
    return true;
}

//NOLINTNEXTLINE
bool JniHelper::getMethodInfoDefaultClassLoader(JniMethodInfo &methodinfo,
                                                const char *className,
                                                const char *methodName,
                                                const char *paramCode) {
    if ((nullptr == className) ||
        (nullptr == methodName) ||
        (nullptr == paramCode)) {
        return false;
    }

    JNIEnv *env = JniHelper::getEnv();
    if (!env) {
        return false;
    }

    jclass classID = env->FindClass(className);
    if (!classID) {
        LOGE("Failed to find class %s", className);
        env->ExceptionClear();
        return false;
    }

    jmethodID methodID = env->GetMethodID(classID, methodName, paramCode);
    if (!methodID) {
        LOGE("Failed to find method id of %s", methodName);
        env->ExceptionClear();
        return false;
    }

    methodinfo.classID = classID;
    methodinfo.env = env;
    methodinfo.methodID = methodID;

    return true;
}

bool JniHelper::getMethodInfo(JniMethodInfo &methodinfo,
                              const char *className,
                              const char *methodName,
                              const char *paramCode) {
    if ((nullptr == className) ||
        (nullptr == methodName) ||
        (nullptr == paramCode)) {
        return false;
    }

    JNIEnv *env = JniHelper::getEnv();
    if (!env) {
        return false;
    }

    jclass classID = _getClassID(className);
    if (!classID) {
        LOGE("Failed to find class %s", className);
        env->ExceptionClear();
        return false;
    }

    jmethodID methodID = env->GetMethodID(classID, methodName, paramCode);
    if (!methodID) {
        LOGE("Failed to find method id of %s", methodName);
        env->ExceptionClear();
        return false;
    }

    methodinfo.classID = classID;
    methodinfo.env = env;
    methodinfo.methodID = methodID;

    return true;
}

ccstd::string JniHelper::jstring2string(jstring jstr) {
    if (jstr == nullptr) {
        return "";
    }

    JNIEnv *env = JniHelper::getEnv();
    if (!env) {
        return "";
    }

    ccstd::string strValue = cc::StringUtils::getStringUTFCharsJNI(env, jstr);

    return strValue;
}

jstring JniHelper::convert(JniHelper::LocalRefMapType *localRefs, cc::JniMethodInfo *t, const char *x) {
    jstring ret = nullptr;
    if (x) {
        ret = cc::StringUtils::newStringUTFJNI(t->env, x);
    }

    (*localRefs)[t->env].push_back(ret);
    return ret;
}

jstring JniHelper::convert(JniHelper::LocalRefMapType *localRefs, cc::JniMethodInfo *t, const ccstd::string &x) {
    return convert(localRefs, t, x.c_str());
}

jobject JniHelper::convert(JniHelper::LocalRefMapType *localRefs, cc::JniMethodInfo *t, const std::vector<std::string> &x) {
    jclass stringClass = _getClassID("java/lang/String");
    jobjectArray ret = t->env->NewObjectArray(x.size(), stringClass, nullptr);
    for (auto i = 0; i < x.size(); i++) {
        jstring jstr = cc::StringUtils::newStringUTFJNI(t->env, x[i]);
        t->env->SetObjectArrayElement(ret, i, jstr);
        t->env->DeleteLocalRef(jstr);
    }
    (*localRefs)[t->env].push_back(ret);
    return ret;
}

void JniHelper::deleteLocalRefs(JNIEnv *env, JniHelper::LocalRefMapType *localRefs) {
    if (!env) {
        return;
    }

    for (const auto &ref : (*localRefs)[env]) {
        ccDeleteLocalRef(env, ref);
        //        LOGE("2. delete 0x%p", ref);
    }
    (*localRefs)[env].clear();
}

void JniHelper::reportError(const ccstd::string &className, const ccstd::string &methodName, const ccstd::string &signature) {
    LOGE("Failed to find static java method. Class name: %s, method name: %s, signature: %s ", className.c_str(), methodName.c_str(), signature.c_str());
}

} //namespace cc
