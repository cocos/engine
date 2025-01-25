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

#include "cocos/bindings/manual/jsb_module_register.h"
#include "cocos/base/DeferredReleasePool.h"
#include "cocos/bindings/auto/jsb_2d_auto.h"
#include "cocos/bindings/auto/jsb_assets_auto.h"
#include "cocos/bindings/auto/jsb_cocos_auto.h"
#include "cocos/bindings/auto/jsb_extension_auto.h"
#include "cocos/bindings/auto/jsb_geometry_auto.h"
#include "cocos/bindings/auto/jsb_gfx_auto.h"
#include "cocos/bindings/auto/jsb_gi_auto.h"
#include "cocos/bindings/auto/jsb_network_auto.h"
#include "cocos/bindings/auto/jsb_pipeline_auto.h"
#include "cocos/bindings/auto/jsb_render_auto.h"
#include "cocos/bindings/auto/jsb_scene_auto.h"
#include "cocos/bindings/dop/jsb_dop.h"
#include "cocos/bindings/jswrapper/SeApi.h"
#include "cocos/bindings/manual/jsb_assets_manual.h"
#include "cocos/bindings/manual/jsb_cocos_manual.h"
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/bindings/manual/jsb_geometry_manual.h"
#include "cocos/bindings/manual/jsb_gfx_manual.h"
#include "cocos/bindings/manual/jsb_global.h"
#include "cocos/bindings/manual/jsb_network_manual.h"
#include "cocos/bindings/manual/jsb_pipeline_manual.h"
#include "cocos/bindings/manual/jsb_platform.h"
#include "cocos/bindings/manual/jsb_scene_manual.h"
#include "cocos/bindings/manual/jsb_xmlhttprequest.h"
#if CC_USE_BOX2D_JSB
#include "cocos/bindings/manual/jsb_box2d_manual.h"
#include "cocos/bindings/auto/jsb_box2d_auto.h"
#endif

#if USE_GFX_RENDERER
#endif

#if CC_USE_SOCKET
    #include "cocos/bindings/manual/jsb_socketio.h"
    #include "cocos/bindings/manual/jsb_websocket.h"
#endif // CC_USE_SOCKET

#if CC_USE_AUDIO
    #include "cocos/bindings/auto/jsb_audio_auto.h"
    #include "cocos/bindings/manual/jsb_audio_manual.h"
#endif

#if CC_USE_XR
    #include "cocos/bindings/auto/jsb_xr_auto.h"
    #include "cocos/bindings/auto/jsb_xr_extension_auto.h"
#endif

#if CC_USE_AR_MODULE
    #include "cocos/bindings/auto/jsb_ar_auto.h"
    #include "cocos/bindings/manual/jsb_ar_manual.h"
#endif

#if (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_MACOS)
    #include "cocos/bindings/manual/JavaScriptObjCBridge.h"
#endif

#if (CC_PLATFORM == CC_PLATFORM_ANDROID || CC_PLATFORM == CC_PLATFORM_OHOS)
    #include "cocos/bindings/manual/JavaScriptJavaBridge.h"
#endif

#if (CC_PLATFORM == CC_PLATFORM_OPENHARMONY)
    #include "cocos/bindings/manual/JavaScriptArkTsBridge.h"
#endif

#if (CC_PLATFORM == CC_PLATFORM_OPENHARMONY)
    #if CC_USE_WEBVIEW
        #include "cocos/bindings/auto/jsb_webview_auto.h"
    #endif
#endif

#if (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_ANDROID || CC_PLATFORM == CC_PLATFORM_OHOS)

    #if CC_USE_VIDEO
        #include "cocos/bindings/auto/jsb_video_auto.h"
    #endif

    #if CC_USE_WEBVIEW
        #include "cocos/bindings/auto/jsb_webview_auto.h"
    #endif

#endif // (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_ANDROID)

#if CC_USE_SOCKET && CC_USE_WEBSOCKET_SERVER
    #include "cocos/bindings/manual/jsb_websocket_server.h"
#endif

#if CC_USE_MIDDLEWARE
    #include "cocos/bindings/auto/jsb_editor_support_auto.h"

    #if CC_USE_SPINE
        #include "cocos/bindings/auto/jsb_spine_auto.h"
        #include "cocos/bindings/manual/jsb_spine_manual.h"
    #endif

    #if CC_USE_DRAGONBONES
        #include "cocos/bindings/auto/jsb_dragonbones_auto.h"
        #include "cocos/bindings/manual/jsb_dragonbones_manual.h"
    #endif

#endif // CC_USE_MIDDLEWARE

#if CC_USE_PHYSICS_PHYSX
    #include "cocos/bindings/auto/jsb_physics_auto.h"
#endif

#if CC_USE_GOOGLE_BILLING
    #include "cocos/bindings/auto/jsb_google_billing_auto.h"
#endif

bool jsb_register_all_modules() {
    se::ScriptEngine *se = se::ScriptEngine::getInstance();

    se->addBeforeCleanupHook([se]() {
        se->garbageCollect();
        cc::DeferredReleasePool::clear();
        se->garbageCollect();
        cc::DeferredReleasePool::clear();
    });

    se->addRegisterCallback(jsb_register_global_variables);
    se->addRegisterCallback(register_all_engine);
    se->addRegisterCallback(register_all_cocos_manual);
    se->addRegisterCallback(register_platform_bindings);
    se->addRegisterCallback(register_all_gfx);
    se->addRegisterCallback(register_all_gfx_manual);

    se->addRegisterCallback(register_all_network);
    se->addRegisterCallback(register_all_network_manual);
    se->addRegisterCallback(register_all_xmlhttprequest);
    // extension depend on network
    se->addRegisterCallback(register_all_extension);
    se->addRegisterCallback(register_all_dop_bindings);
    se->addRegisterCallback(register_all_assets);
    se->addRegisterCallback(register_all_assets_manual);
    // pipeline depend on asset
    se->addRegisterCallback(register_all_pipeline);
    se->addRegisterCallback(register_all_pipeline_manual);
    se->addRegisterCallback(register_all_geometry);
    se->addRegisterCallback(register_all_geometry_manual);
    se->addRegisterCallback(register_all_scene);
    se->addRegisterCallback(register_all_gi);
    se->addRegisterCallback(register_all_scene_manual);
    se->addRegisterCallback(register_all_render);
    se->addRegisterCallback(register_all_native2d);
#if CC_USE_BOX2D_JSB
    se->addRegisterCallback(register_all_box2d);
    se->addRegisterCallback(register_all_box2d_manual);
#endif

#if (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_MACOS)
    se->addRegisterCallback(register_javascript_objc_bridge);
    se->addRegisterCallback(register_script_native_bridge);
#endif

#if (CC_PLATFORM == CC_PLATFORM_ANDROID || CC_PLATFORM == CC_PLATFORM_OHOS)
    se->addRegisterCallback(register_javascript_java_bridge);
    se->addRegisterCallback(register_script_native_bridge);
#endif

#if (CC_PLATFORM == CC_PLATFORM_OPENHARMONY)
    se->addRegisterCallback(register_javascript_arkTs_bridge);
#endif

#if CC_USE_AUDIO
    se->addRegisterCallback(register_all_audio);
    se->addRegisterCallback(register_all_audio_manual);
#endif

#if CC_USE_XR
    se->addRegisterCallback(register_all_xr);
    se->addRegisterCallback(register_all_xr_extension);
#endif

#if CC_USE_SOCKET
    se->addRegisterCallback(register_all_websocket);
    se->addRegisterCallback(register_all_socketio);
#endif

#if CC_USE_GOOGLE_BILLING
    se->addRegisterCallback(register_all_billing);
#endif

#if CC_USE_MIDDLEWARE
    se->addRegisterCallback(register_all_editor_support);

    #if CC_USE_SPINE
    se->addRegisterCallback(register_all_spine);
    se->addRegisterCallback(register_all_spine_manual);
    #endif

    #if CC_USE_DRAGONBONES
    se->addRegisterCallback(register_all_dragonbones);
    se->addRegisterCallback(register_all_dragonbones_manual);
    #endif

#endif // CC_USE_MIDDLEWARE

#if CC_USE_PHYSICS_PHYSX
    se->addRegisterCallback(register_all_physics);
#endif

#if CC_USE_AR_MODULE
    se->addRegisterCallback(register_all_ar);
    se->addRegisterCallback(register_all_ar_manual);
#endif // CC_USE_AR_MODULE
#if (CC_PLATFORM == CC_PLATFORM_OPENHARMONY)
    #if CC_USE_WEBVIEW
    se->addRegisterCallback(register_all_webview);
    #endif
#endif
#if (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_ANDROID || CC_PLATFORM == CC_PLATFORM_OHOS)

    #if CC_USE_VIDEO
    se->addRegisterCallback(register_all_video);
    #endif

    #if CC_USE_WEBVIEW
    se->addRegisterCallback(register_all_webview);
    #endif

#endif // (CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_ANDROID)

#if CC_USE_SOCKET && CC_USE_WEBSOCKET_SERVER
    se->addRegisterCallback(register_all_websocket_server);
#endif
    se->addAfterCleanupHook([]() {
        cc::DeferredReleasePool::clear();
        JSBClassType::cleanup();
    });
    return true;
}
