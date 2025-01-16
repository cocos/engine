/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include "GLES3Wrangler.h"

#if defined(_WIN32) && !defined(ANDROID)
    #define WIN32_LEAN_AND_MEAN 1
    #include <string>
    #include "base/Log.h"
    #include "base/memory/Memory.h"
    #include <windows.h>

static HMODULE libegl = NULL;
static HMODULE libgles = NULL;
static PFNGLES3WLOADPROC pfnGles3wLoad = NULL;

bool gles3wOpen() {
    std::string eglPath = "libEGL.dll";
    std::string glesPath = "libGLESv2.dll";

    #if CC_EDITOR
    // In editor,there are same library,so we need to use abs path to load them.
    HMODULE engine = NULL;
    if (GetModuleHandleEx(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
                              GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                          (LPCWSTR)&gles3wOpen, &engine) != 0) {
        std::string dir;
        int times = 1;
        do {
            auto size = MAX_PATH * times++;
            char *path = static_cast<char *>(CC_MALLOC(size));
            if (path) {
                GetModuleFileNameA(engine, path, size);
                dir = path;
            }
            CC_FREE(path);
        } while (GetLastError() == ERROR_INSUFFICIENT_BUFFER);

        dir = dir.substr(0, dir.rfind("\\") + 1);
        eglPath = dir + eglPath;
        glesPath = dir + glesPath;
    } else {
        DWORD err = GetLastError();
        CC_LOG_WARNING("Failed to get abs path for editor,error code:%lu", err);
    }
    #endif

    libegl = LoadLibraryA(eglPath.c_str());
    libgles = LoadLibraryA(glesPath.c_str());
    return (libegl && libgles);
}

bool gles3wClose() {
    bool ret = true;
    if (libegl) {
        ret &= FreeLibrary(libegl) ? true : false;
        libegl = NULL;
    }

    if (libgles) {
        ret &= FreeLibrary(libgles) ? true : false;
        libgles = NULL;
    }

    return ret;
}

void *gles3wLoad(const char *proc) {
    void *res = nullptr;
    if (eglGetProcAddress) res = (void *)eglGetProcAddress(proc);
    if (!res) res = (void *)GetProcAddress(libegl, proc);
    return res;
}
#elif defined(__EMSCRIPTEN__)
bool gles3wOpen() { return true; }
bool gles3wClose() { return true; }
void *gles3wLoad(const char *proc) {
    return (void *)eglGetProcAddress(proc);
}
#else
    #include <dlfcn.h>
    #include "BasePlatform.h"
    #include "../gfx-gles-common/eglw.h"
    #include "../gfx-gles-common/gles2w.h"
    #include "../gfx-gles-common/gles3w.h"


namespace {
    void *libegl = nullptr;
    void *libgles = nullptr;
    PFNGLES3WLOADPROC pfnGles3wLoad = nullptr;
}

bool gles3wOpen() {
    libegl = dlopen("libEGL.so", RTLD_LAZY | RTLD_GLOBAL);
    libgles = dlopen("libGLESv3.so", RTLD_LAZY | RTLD_GLOBAL);
    return (libegl && libgles);
}

bool gles3wClose() {
    bool ret = true;
    if (libegl) {
        ret &= dlclose(libegl) == 0;
        libegl = nullptr;
    }

    if (libgles) {
        ret &= dlclose(libgles) == 0;
        libgles = nullptr;
    }

    return ret;
}

void *gles3wLoad(const char *proc) {
    void *res = nullptr;
    if (eglGetProcAddress) res = reinterpret_cast<void *>(eglGetProcAddress(proc));
    auto sdkVersion = cc::BasePlatform::getPlatform()->getSdkVersion();
    if (sdkVersion <= 23) {
        if (!res) res = dlsym(libgles, proc);
    } else {
        if (!res) res = dlsym(libegl, proc);
    }
    return res;
}
#endif

PFNGLES3WLOADPROC pfnGLES3wLoadProc() {
    return pfnGles3wLoad;
}

bool gles3wInit() {
    if (!gles3wOpen()) {
        return false;
    }
    eglwLoadProcs(gles3wLoad);
    gles2wLoadProcs(gles3wLoad);
    gles3wLoadProcs(gles3wLoad);

    pfnGles3wLoad = gles3wLoad;
    return true;
}

bool gles3wExit() {
    return gles3wClose();
}
