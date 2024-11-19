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
#include "platform/openharmony/OpenHarmonyPlatform.h"
#include "base/Macros.h"

#include <ace/xcomponent/native_interface_xcomponent.h>
#include <napi/native_api.h>

#include "application/ApplicationManager.h"
#include "application/CocosApplication.h"
#include "platform/UniversalPlatform.h"

#include "platform/openharmony/modules/SystemWindow.h"
#include "platform/openharmony/modules/SystemWindowManager.h"

#include "platform/empty/modules/Accelerometer.h"
#include "platform/empty/modules/Battery.h"
#include "platform/empty/modules/Network.h"
#include "platform/empty/modules/Screen.h"
#include "platform/empty/modules/Vibrator.h"
#include "platform/openharmony/modules/System.h"

#include <chrono>
#include <sstream>

namespace {
void sendMsgToWorker(const cc::MessageType& type, void* data, void* window) {
    cc::OpenHarmonyPlatform* platform = dynamic_cast<cc::OpenHarmonyPlatform*>(cc::BasePlatform::getPlatform());
    CC_ASSERT(platform != nullptr);
    cc::WorkerMessageData msg{type, static_cast<void*>(data), window};
    platform->enqueue(msg);
}

void onSurfaceCreatedCB(OH_NativeXComponent* component, void* window) {
    // It is possible that when the message is sent, the worker thread has not yet started.
    //sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_SURFACE_CREATED, component, window);
    cc::ISystemWindowInfo info;
    info.title = "";
    info.x = 0;
    info.y = 0;
    info.width = 0;
    info.height = 0;
    info.flags = 0;
    info.externalHandle = window;
    cc::ISystemWindowManager* windowMgr =
        cc::OpenHarmonyPlatform::getInstance()->getInterface<cc::ISystemWindowManager>();
    windowMgr->createWindow(info);
}

void onSurfaceHideCB(OH_NativeXComponent* component, void* window) {
    int32_t ret;
    char idStr[OH_XCOMPONENT_ID_LEN_MAX + 1] = {};
    uint64_t idSize = OH_XCOMPONENT_ID_LEN_MAX + 1;
    ret = OH_NativeXComponent_GetXComponentId(component, idStr, &idSize);
    if(ret != OH_NATIVEXCOMPONENT_RESULT_SUCCESS) {
        return;
    }
    sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_SURFACE_HIDE, component, window);
}

void onSurfaceShowCB(OH_NativeXComponent* component, void* window) {
    int32_t ret;
    char idStr[OH_XCOMPONENT_ID_LEN_MAX + 1] = {};
    uint64_t idSize = OH_XCOMPONENT_ID_LEN_MAX + 1;
    ret = OH_NativeXComponent_GetXComponentId(component, idStr, &idSize);
    if(ret != OH_NATIVEXCOMPONENT_RESULT_SUCCESS) {
        return;
    }
    sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_SURFACE_SHOW, component, window);
}


cc::TouchEvent::Type touchTypeTransform(OH_NativeXComponent_TouchEventType touchType) {
    if (touchType == OH_NATIVEXCOMPONENT_DOWN) {
        return cc::TouchEvent::Type::BEGAN;
    } else if (touchType == OH_NATIVEXCOMPONENT_MOVE) {
        return cc::TouchEvent::Type::MOVED;
    } else if (touchType == OH_NATIVEXCOMPONENT_UP) {
        return cc::TouchEvent::Type::ENDED;
    } else if (touchType == OH_NATIVEXCOMPONENT_CANCEL) {
        return cc::TouchEvent::Type::CANCELLED;
    }
    return cc::TouchEvent::Type::UNKNOWN;
}

void dispatchTouchEventCB(OH_NativeXComponent* component, void* window) {
    OH_NativeXComponent_TouchEvent touchEvent;
    int32_t ret = OH_NativeXComponent_GetTouchEvent(component, window, &touchEvent);
    if (ret != OH_NATIVEXCOMPONENT_RESULT_SUCCESS) {
        return;
    }
    // TODO(qgh):Is it possible to find an efficient way to do this, I thought about using a cache queue but it requires locking.
    cc::TouchEvent* ev = new cc::TouchEvent;
    cc::SystemWindowManager* windowMgr =
        cc::OpenHarmonyPlatform::getInstance()->getInterface<cc::SystemWindowManager>();
    CC_ASSERT_NOT_NULL(windowMgr);
    cc::ISystemWindow* systemWindow = windowMgr->getWindowFromHandle(window);
    CC_ASSERT_NOT_NULL(systemWindow);
    ev->windowId = systemWindow->getWindowId();
    if (touchEvent.type == OH_NATIVEXCOMPONENT_DOWN) {
        ev->type = cc::TouchEvent::Type::BEGAN;
    } else if (touchEvent.type == OH_NATIVEXCOMPONENT_MOVE) {
        ev->type = cc::TouchEvent::Type::MOVED;
    } else if (touchEvent.type == OH_NATIVEXCOMPONENT_UP) {
        ev->type = cc::TouchEvent::Type::ENDED;
    } else if (touchEvent.type == OH_NATIVEXCOMPONENT_CANCEL) {
        ev->type = cc::TouchEvent::Type::CANCELLED;
    }
    for (int i = 0; i < touchEvent.numPoints; ++i) {
        int32_t id = touchEvent.touchPoints[i].id;
        if (touchEvent.id == id) {
            ev->touches.emplace_back(touchEvent.touchPoints[i].x, touchEvent.touchPoints[i].y, id);
        }
    }
    sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_TOUCH_EVENT, reinterpret_cast<void*>(ev), window);
}

void onSurfaceChangedCB(OH_NativeXComponent* component, void* window) {
    sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_SURFACE_CHANGED, reinterpret_cast<void*>(component), window);
}

void onSurfaceDestroyedCB(OH_NativeXComponent* component, void* window) {
    sendMsgToWorker(cc::MessageType::WM_XCOMPONENT_SURFACE_DESTROY, reinterpret_cast<void*>(component), window);
}

} // namespace

namespace cc {

OpenHarmonyPlatform::OpenHarmonyPlatform() {
    registerInterface(std::make_shared<System>());
    registerInterface(std::make_shared<Screen>());
    registerInterface(std::make_shared<Vibrator>());
    registerInterface(std::make_shared<Network>());
    registerInterface(std::make_shared<Battery>());
    registerInterface(std::make_shared<Accelerometer>());
    registerInterface(std::make_shared<SystemWindowManager>());

    _callback.OnSurfaceCreated = onSurfaceCreatedCB;
    _callback.OnSurfaceChanged = onSurfaceChangedCB;
    _callback.OnSurfaceDestroyed = onSurfaceDestroyedCB;
    _callback.DispatchTouchEvent = dispatchTouchEventCB;
}

int32_t OpenHarmonyPlatform::init() {
    return 0;
}

OpenHarmonyPlatform* OpenHarmonyPlatform::getInstance() {
    return dynamic_cast<OpenHarmonyPlatform*>(BasePlatform::getPlatform());
}

int32_t OpenHarmonyPlatform::run(int argc, const char** argv) {
    UniversalPlatform::run(argc, argv);
    /*
    if (_workerLoop) {
        // Todo: Starting the timer in this way is inaccurate and will be fixed later.
        uv_timer_init(_workerLoop, &_timerHandle);
        // 1s = 1000ms = 60fps;
        // 1000ms / 60fps = 16 ms/fps
        uv_timer_start(&_timerHandle, &OpenHarmonyPlatform::timerCb, 16, true);
    }
    */
    return 0;
}

void OpenHarmonyPlatform::setNativeXComponent(OH_NativeXComponent* component) {
    _component = component;
    OH_NativeXComponent_RegisterCallback(_component, &_callback);
    OH_NativeXComponent_RegisterSurfaceHideCallback(_component, onSurfaceHideCB);
    OH_NativeXComponent_RegisterSurfaceShowCallback(_component, onSurfaceShowCB);
}

void OpenHarmonyPlatform::enqueue(const WorkerMessageData& msg) {
    _messageQueue.enqueue(msg);
    triggerMessageSignal();
}

void OpenHarmonyPlatform::triggerMessageSignal() {
    if (_workerLoop != nullptr) {
        // It is possible that when the message is sent, the worker thread has not yet started.
        uv_async_send(&_messageSignal);
    }
}

bool OpenHarmonyPlatform::dequeue(WorkerMessageData* msg) {
    return _messageQueue.dequeue(msg);
}

// static
void OpenHarmonyPlatform::onMessageCallback(const uv_async_t* /* req */) {
    void* window = nullptr;
    WorkerMessageData msgData;
    OpenHarmonyPlatform* platform = OpenHarmonyPlatform::getInstance();
    while (true) {
        //loop until all msg dispatch
        if (!platform->dequeue(reinterpret_cast<WorkerMessageData*>(&msgData))) {
            // Queue has no data
            break;
        }

        if ((msgData.type >= MessageType::WM_XCOMPONENT_SURFACE_CREATED) && (msgData.type <= MessageType::WM_XCOMPONENT_SURFACE_DESTROY)) {
            if (msgData.type == MessageType::WM_XCOMPONENT_TOUCH_EVENT) {
                TouchEvent* ev = reinterpret_cast<TouchEvent*>(msgData.data);
                CC_ASSERT(ev != nullptr);
                events::Touch::broadcast(*ev);
                delete ev;
                ev = nullptr;
            } else if (msgData.type == MessageType::WM_XCOMPONENT_SURFACE_CREATED) {
                CC_LOG_INFO("onMessageCallback WM_XCOMPONENT_SURFACE_CREATED ...");
                OH_NativeXComponent* nativexcomponet = reinterpret_cast<OH_NativeXComponent*>(msgData.data);
                CC_ASSERT(nativexcomponet != nullptr);
                platform->onSurfaceCreated(nativexcomponet, msgData.window);
            } else if (msgData.type == MessageType::WM_XCOMPONENT_SURFACE_CHANGED) {
                CC_LOG_INFO("onMessageCallback WM_XCOMPONENT_SURFACE_CHANGED ...");
                OH_NativeXComponent* nativexcomponet = reinterpret_cast<OH_NativeXComponent*>(msgData.data);
                CC_ASSERT(nativexcomponet != nullptr);
                platform->onSurfaceChanged(nativexcomponet, msgData.window);
            } else if (msgData.type == MessageType::WM_XCOMPONENT_SURFACE_SHOW) {
                OH_NativeXComponent* nativexcomponet = reinterpret_cast<OH_NativeXComponent*>(msgData.data);
                CC_ASSERT(nativexcomponet != nullptr);        
                platform->onSurfaceShow(msgData.window);
            } else if (msgData.type == MessageType::WM_XCOMPONENT_SURFACE_HIDE) {
                OH_NativeXComponent* nativexcomponet = reinterpret_cast<OH_NativeXComponent*>(msgData.data);
                CC_ASSERT(nativexcomponet != nullptr);        
                platform->onSurfaceHide();
            } else if (msgData.type == MessageType::WM_XCOMPONENT_SURFACE_DESTROY) {
                CC_LOG_INFO("onMessageCallback WM_XCOMPONENT_SURFACE_DESTROY ...");
                OH_NativeXComponent* nativexcomponet = reinterpret_cast<OH_NativeXComponent*>(msgData.data);
                CC_ASSERT(nativexcomponet != nullptr);
                platform->onSurfaceDestroyed(nativexcomponet, msgData.window);
            } else {
                CC_ASSERT(false);
            }
            continue;
        }

        if (msgData.type == MessageType::WM_APP_SHOW) {
            platform->onShowNative();
        } else if (msgData.type == MessageType::WM_APP_HIDE) {
            platform->onHideNative();
        } else if (msgData.type == MessageType::WM_APP_DESTROY) {
            platform->onDestroyNative();
        }
        if (msgData.type == MessageType::WM_VSYNC) {
            platform->runTask();
        }
    }
}

void OpenHarmonyPlatform::onCreateNative(napi_env env, uv_loop_t* loop) {
}

void OpenHarmonyPlatform::onShowNative() {
    WindowEvent ev;
    ev.type = WindowEvent::Type::SHOW;
    ev.windowId = cc::ISystemWindow::mainWindowId;
    events::WindowEvent::broadcast(ev);
    onResume();
    if (_timerInited) {
        uv_timer_start(&_timerHandle, &OpenHarmonyPlatform::timerCb, 0, 1);
    }
}

void OpenHarmonyPlatform::onHideNative() {
    WindowEvent ev;
    ev.type = WindowEvent::Type::HIDDEN;
    ev.windowId = cc::ISystemWindow::mainWindowId;
    events::WindowEvent::broadcast(ev);
    onPause();
    if (_timerInited) {
        uv_timer_stop(&_timerHandle);
    }
}

void OpenHarmonyPlatform::onDestroyNative() {
    onDestroy();
     if (_timerInited) {
        uv_timer_stop(&_timerHandle);
    }
}

void OpenHarmonyPlatform::timerCb(uv_timer_t* handle) {
    OpenHarmonyPlatform::getInstance()->runTask();
}

void OpenHarmonyPlatform::restartJSVM() {
    g_started = false;
}

void OpenHarmonyPlatform::workerInit(uv_loop_t* loop) {
    _workerLoop = loop;
    if (_workerLoop) {
        uv_timer_init(_workerLoop, &_timerHandle);
        _timerInited = true;
        uv_async_init(_workerLoop, &_messageSignal, reinterpret_cast<uv_async_cb>(OpenHarmonyPlatform::onMessageCallback));
        if (!_messageQueue.empty()) {
            triggerMessageSignal(); // trigger the signal to handle the pending message
        }
	}
}

void OpenHarmonyPlatform::requestVSync() {
}

int32_t OpenHarmonyPlatform::loop() {
    return 0;
}

void OpenHarmonyPlatform::onSurfaceCreated(OH_NativeXComponent* component, void* window) {
}

void OpenHarmonyPlatform::onSurfaceChanged(OH_NativeXComponent* component, void* window) {
    uint64_t width = 0;
    uint64_t height = 0;
    int32_t ret = OH_NativeXComponent_GetXComponentSize(_component, window, &width, &height);
    CC_ASSERT(ret == OH_NATIVEXCOMPONENT_RESULT_SUCCESS);
    WindowEvent ev;
    ev.windowId = cc::ISystemWindow::mainWindowId;
    ev.type = WindowEvent::Type::SIZE_CHANGED;
    ev.width = width;
    ev.height = height;
    events::WindowEvent::broadcast(ev);
}

void OpenHarmonyPlatform::onSurfaceDestroyed(OH_NativeXComponent* component, void* window) {
    cc::SystemWindowManager* windowMgr = this->getInterface<cc::SystemWindowManager>();
    CC_ASSERT_NOT_NULL(windowMgr);
    windowMgr->removeWindow(window);
}

void OpenHarmonyPlatform::onSurfaceHide() {

}

void OpenHarmonyPlatform::onSurfaceShow(void* window) {

}


ISystemWindow* OpenHarmonyPlatform::createNativeWindow(uint32_t windowId, void* externalHandle) {
    SystemWindow* window = ccnew SystemWindow(windowId, externalHandle);
    uint64_t width = 0;
    uint64_t height = 0;
    CC_ASSERT_NOT_NULL(_component);
    int32_t ret = OH_NativeXComponent_GetXComponentSize(_component, externalHandle, &width, &height);
    CC_ASSERT(ret == OH_NATIVEXCOMPONENT_RESULT_SUCCESS);
    window->setViewSize(width, height);
    return window;
}

}; // namespace cc
