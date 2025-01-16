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

#include "GLES2Wrangler.h"

#if defined(_WIN32) && !defined(ANDROID)
    #define WIN32_LEAN_AND_MEAN 1
    #include <windows.h>

static HMODULE libegl = NULL;
static HMODULE libgles = NULL;

bool gles2wOpen() {
    libegl = LoadLibraryA("libEGL.dll");
    libgles = LoadLibraryA("libGLESv2.dll");
    return (libegl && libgles);
}

bool gles2wClose() {
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

void *gles2wLoad(const char *proc) {
    void *res = nullptr;
    if (eglGetProcAddress) res = (void *)eglGetProcAddress(proc);
    if (!res) res = (void *)GetProcAddress(libegl, proc);
    return res;
}
#elif defined(__EMSCRIPTEN__)
bool gles2wOpen() { return true; }
bool gles2wClose() { return true; }
void *gles2wLoad(const char *proc) {
    return (void *)eglGetProcAddress(proc);
}
#else
    #include <dlfcn.h>
    #include "BasePlatform.h"
    #include "../gfx-gles-common/eglw.h"
    #include "../gfx-gles-common/gles2w.h"

namespace {
    void *libegl = nullptr;
    void *libgles = nullptr;
}

bool gles2wOpen() {
    libegl = dlopen("libEGL.so", RTLD_LAZY | RTLD_GLOBAL);
    #if __OHOS__
    libgles = dlopen("libGLESv3.so", RTLD_LAZY | RTLD_GLOBAL);
    #else
    libgles = dlopen("libGLESv2.so", RTLD_LAZY | RTLD_GLOBAL);
    #endif
    return (libegl && libgles);
}

bool gles2wClose() {
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

void *gles2wLoad(const char *proc) {
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

bool gles2wInit() {
    if (!gles2wOpen()) {
        return false;
    }

    eglwLoadProcs(gles2wLoad);
    gles2wLoadProcs(gles2wLoad);

    return true;
}

bool gles2wExit() {
    return gles2wClose();
}
