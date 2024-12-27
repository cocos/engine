/****************************************************************************
 Copyright (c) 2021-2022 Xiamen Yaji Software Co., Ltd.

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

#include "platform/mac/MacPlatform.h"
#include "platform/interfaces/OSInterface.h"
#include "platform/mac/AppDelegate.h"

#include "modules/Accelerometer.h"
#include "modules/Battery.h"
#include "modules/Network.h"
#include "modules/System.h"
#include "modules/Vibrator.h"
#include "platform/SDLHelper.h"
#if defined(CC_SERVER_MODE)
    #include "platform/empty/modules/Screen.h"
    #include "platform/empty/modules/SystemWindow.h"
    #include "platform/empty/modules/SystemWindowManager.h"
#else
    #include "modules/Screen.h"
    #include "modules/SystemWindow.h"
    #include "modules/SystemWindowManager.h"
#endif

#import <AppKit/AppKit.h>

#include "base/memory/Memory.h"

extern int cocos_main(int argc, const char **argv);

namespace cc {

MacPlatform::~MacPlatform() {
}

int32_t MacPlatform::init() {
    registerInterface(std::make_shared<Accelerometer>());
    registerInterface(std::make_shared<Battery>());
    registerInterface(std::make_shared<Network>());
    registerInterface(std::make_shared<Screen>());
    registerInterface(std::make_shared<System>());
    _windowManager = std::make_shared<SystemWindowManager>();
    registerInterface(_windowManager);
    registerInterface(std::make_shared<Vibrator>());
    return _windowManager->init();
}

bool MacPlatform::readyToExit() {
    return _readyToExit;
}

void MacPlatform::exit() {
    if(!_readyToExit) {
        [[NSApplication sharedApplication] replyToApplicationShouldTerminate:true];
        _readyToExit = true;
    }
}

int32_t MacPlatform::loop(void) {
#if CC_EDITOR
    @autoreleasepool {
        runTask();
    }
    return 1;
#else
    while(!_readyToExit) {
        @autoreleasepool {
            pollEvent();
            runTask();
        }
    }
    onDestroy();
    return 0;
#endif
}

int32_t MacPlatform::run(int argc, const char **argv) {
#if defined(CC_SERVER_MODE)
    cocos_main(argc, argv);
    while (true) {
        @autoreleasepool {
            runTask();
        }
    }
    return 0;
#else
    NSArray *arguments = [[NSProcessInfo processInfo] arguments];
    argc = static_cast<int>(arguments.count);
    std::vector<const char*> argVec;
    argVec.reserve(argc);
    for (id arg in arguments) {
        argVec.emplace_back([arg UTF8String]);
    }
    
    id delegate = [[AppDelegate alloc] init];
    [NSApp setDelegate:delegate];
    
    if(cocos_main(argc, argVec.data()) != 0) {
        return -1;
    }
   
    return loop();
#endif
}

void MacPlatform::setFps(int32_t fps) {
    if(fps != getFps()) {
        UniversalPlatform::setFps(fps);
    }
}

void MacPlatform::onPause() {
    cc::WindowEvent ev;
    ev.type = cc::WindowEvent::Type::HIDDEN;
    cc::events::WindowEvent::broadcast(ev);
}

void MacPlatform::onResume() {
    cc::WindowEvent ev;
    ev.type = cc::WindowEvent::Type::SHOW;
    cc::events::WindowEvent::broadcast(ev);
}

void MacPlatform::onClose() {
    cc::WindowEvent ev;
    ev.type = cc::WindowEvent::Type::CLOSE;
    cc::events::WindowEvent::broadcast(ev);
}

cc::ISystemWindow *MacPlatform::createNativeWindow(uint32_t windowId, void *externalHandle) {
    return ccnew SystemWindow(windowId, externalHandle);
}

void MacPlatform::pollEvent() {
    _windowManager->processEvent();
}

} // namespace cc
