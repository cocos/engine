/*
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
 */
import { legacyCC } from "../core/global-exports";
import { NATIVE } from 'internal:constants';
const globalJsb = globalThis.jsb ?? {};
if( NATIVE ){
    Object.defineProperty(globalJsb, 'reflection', {
        get () {
            if (globalJsb.__bridge !== undefined) return globalJsb.__bridge;
            if (globalThis.JavascriptJavaBridge && (legacyCC.sys.os === legacyCC.sys.OS.ANDROID || legacyCC.sys.os === legacyCC.sys.OS.OHOS)) {
                globalJsb.__bridge = new globalThis.JavascriptJavaBridge();
            } else if (globalThis.JavaScriptObjCBridge && (legacyCC.sys.os === legacyCC.sys.OS.IOS || legacyCC.sys.os === legacyCC.sys.OS.OSX)) {
                globalJsb.__bridge = new globalThis.JavaScriptObjCBridge();
            } else   {
                globalJsb.__bridge = null;
            }
            return globalJsb.__bridge;
        },
        enumerable: true,
        configurable: true,
        set (value) {
            globalJsb.__bridge = value;
        },
    });
    Object.defineProperty(globalJsb, 'bridge', {
        get () {
            if (globalJsb.__ccbridge !== undefined) return globalJsb.__ccbridge;
            if (window.ScriptNativeBridge && legacyCC.sys.os === legacyCC.sys.OS.ANDROID || legacyCC.sys.os === legacyCC.sys.OS.IOS || legacyCC.sys.os === legacyCC.sys.OS.OSX || legacyCC.sys.os === legacyCC.sys.OS.OHOS) {
                globalJsb.__ccbridge = new ScriptNativeBridge();
            } else {
                globalJsb.__ccbridge = null;
            }
            return globalJsb.__ccbridge;
        },
        enumerable: true,
        configurable: true,
        set (value) {
            globalJsb.__ccbridge = value;
        },
    });
    const JsbBridgeWrapper = {
        eventMap: new Map(),
        addNativeEventListener (eventName, listener) {
            if (!this.eventMap.get(eventName)) {
                this.eventMap.set(eventName, []);
            }
            const arr = this.eventMap.get(eventName);
            if (!arr.find(listener)) {
                arr.push(listener);
            }
        },
        dispatchEventToNative (eventName, arg) {
            globalJsb.bridge.sendToNative(eventName, arg);
        },
        removeAllListenersForEvent (eventName) {
            return this.eventMap.delete(eventName);
        },
        removeNativeEventListener (eventName, listener) {
            const arr = this.eventMap.get(eventName);
            if (!arr) {
                return false;
            }
            for (let i = 0, l = arr.length; i < l; i++) {
                if (arr[i] === listener) {
                    arr.splice(i, 1);
                    return true;
                }
            }
            return true;
        },
        removeAllListeners () {
            this.eventMap.clear();
        },
        triggerEvent (eventName, arg) {
            const arr = this.eventMap.get(eventName);
            if (!arr) {
                console.error(`${eventName} does not exist`);
                return;
            }
            arr.map((listener) => listener.call(null, arg));
        },
    };
    
    Object.defineProperty(globalJsb, 'jsbBridgeWrapper', {
        get () {
            if (globalJsb.__JsbBridgeWrapper !== undefined) return globalJsb.__JsbBridgeWrapper;
    
            if (window.ScriptNativeBridge && legacyCC.sys.os === legacyCC.sys.OS.ANDROID || legacyCC.sys.os === legacyCC.sys.OS.IOS || legacyCC.sys.os === legacyCC.sys.OS.OSX || legacyCC.sys.os === legacyCC.sys.OS.OHOS) {
                globalJsb.__JsbBridgeWrapper = JsbBridgeWrapper;
                globalJsb.bridge.onNative = (methodName, arg1) => {
                    console.log(`Trigger event: ${methodName} with argeter: ${arg1}`);
                    globalJsb.__JsbBridgeWrapper.triggerEvent(methodName, arg1);
                };
            } else {
                globalJsb.__JsbBridgeWrapper = null;
            }
            return globalJsb.__JsbBridgeWrapper;
        },
        enumerable: true,
        configurable: true,
        set (value) {
            globalJsb.__JsbBridgeWrapper = value;
        },
    });
}

export const native = {
    DownloaderHints: globalJsb.DownloaderHints,
    Downloader: globalJsb.Downloader,
    zipUtils: globalJsb.zipUtils,
    fileUtils: globalJsb.fileUtils,
    DebugRenderer: globalJsb.DebugRenderer,
};
