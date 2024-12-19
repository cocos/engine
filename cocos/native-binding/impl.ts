/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
*/
import { sys } from "../core";
import { NATIVE } from 'internal:constants';

const globalJsb: any = globalThis.jsb ?? {};
declare const ScriptNativeBridge: any;

if (NATIVE) {
    Object.defineProperty(globalJsb, 'reflection', {
        get() {
            if (globalJsb.__bridge !== undefined) return globalJsb.__bridge;
            if (globalThis.JavascriptJavaBridge && (sys.os === sys.OS.ANDROID || sys.os === sys.OS.OHOS)) {
                globalJsb.__bridge = new globalThis.JavascriptJavaBridge();
            } else if (globalThis.JavaScriptObjCBridge && (sys.os === sys.OS.IOS || sys.os === sys.OS.OSX)) {
                globalJsb.__bridge = new globalThis.JavaScriptObjCBridge();
            } else if (globalThis.JavaScriptArkTsBridge && (sys.os === sys.OS.OPENHARMONY)) {
                globalJsb.__bridge = new globalThis.JavaScriptArkTsBridge();
            } else {
                globalJsb.__bridge = null;
            }
            return globalJsb.__bridge;
        },
        enumerable: true,
        configurable: true,
        set(value) {
            globalJsb.__bridge = value;
        },
    });
    Object.defineProperty(globalJsb, 'bridge', {
        get() {
            if (globalJsb.__ccbridge !== undefined) return globalJsb.__ccbridge;
            if (globalThis.ScriptNativeBridge && sys.os === sys.OS.ANDROID || sys.os === sys.OS.IOS || sys.os === sys.OS.OSX || sys.os === sys.OS.OHOS) {
                globalJsb.__ccbridge = new ScriptNativeBridge();
            } else {
                globalJsb.__ccbridge = null;
            }
            return globalJsb.__ccbridge;
        },
        enumerable: true,
        configurable: true,
        set(value) {
            globalJsb.__ccbridge = value;
        },
    });
    const JsbBridgeWrapper = {
        eventMap: new Map(),
        addNativeEventListener(eventName, listener) {
            if (!this.eventMap.get(eventName)) {
                this.eventMap.set(eventName, []);
            }
            const arr = this.eventMap.get(eventName);
            if (!arr.includes(listener)) {
                arr.push(listener);
            }
        },
        dispatchEventToNative(eventName, arg) {
            globalJsb.bridge.sendToNative(eventName, arg);
        },
        removeAllListenersForEvent(eventName) {
            return this.eventMap.delete(eventName);
        },
        removeNativeEventListener(eventName, listener) {
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
        removeAllListeners() {
            this.eventMap.clear();
        },
        triggerEvent(eventName, arg) {
            const arr = this.eventMap.get(eventName);
            if (!arr) {
                console.error(`${eventName} does not exist`);
                return;
            }
            arr.map((listener) => listener.call(null, arg));
        },
    };

    Object.defineProperty(globalJsb, 'jsbBridgeWrapper', {
        get() {
            if (globalJsb.__JsbBridgeWrapper !== undefined) return globalJsb.__JsbBridgeWrapper;

            if (globalThis.ScriptNativeBridge && sys.os === sys.OS.ANDROID || sys.os === sys.OS.IOS || sys.os === sys.OS.OSX || sys.os === sys.OS.OHOS) {
                globalJsb.__JsbBridgeWrapper = JsbBridgeWrapper;
                globalJsb.bridge.onNative = (methodName, arg1) => {
                    // console.log(`Trigger event: ${methodName} with argeter: ${arg1}`);
                    globalJsb.__JsbBridgeWrapper.triggerEvent(methodName, arg1);
                };
            } else {
                globalJsb.__JsbBridgeWrapper = null;
            }
            return globalJsb.__JsbBridgeWrapper;
        },
        enumerable: true,
        configurable: true,
        set(value) {
            globalJsb.__JsbBridgeWrapper = value;
        },
    });
    const originSaveImageData = globalJsb.saveImageData;
    globalJsb.saveImageData = (data: Uint8Array, width: number, height: number, filePath: string) => {
        return new Promise<void>((resolve, reject) => {
            originSaveImageData(data, width, height, filePath, (isSuccess) => {
                if (isSuccess) {
                    resolve();
                } else {
                    reject();
                }
            })
        });
    }
}

export const native = {
    DownloaderHints: globalJsb.DownloaderHints,
    Downloader: globalJsb.Downloader,
    zipUtils: globalJsb.zipUtils,
    fileUtils: globalJsb.fileUtils,
    DebugRenderer: globalJsb.DebugRenderer,
    copyTextToClipboard: globalJsb.copyTextToClipboard?.bind(globalJsb),
    garbageCollect: globalJsb.garbageCollect,
    reflection: globalJsb.reflection,
    bridge: globalJsb.bridge,
    jsbBridgeWrapper: globalJsb.jsbBridgeWrapper,
    AssetsManager: globalJsb.AssetsManager,
    EventAssetsManager: globalJsb.EventAssetsManager,
    Manifest: globalJsb.Manifest,
    saveImageData: globalJsb.saveImageData,
    process: globalJsb.process,
    adpf: globalJsb.adpf,
};
