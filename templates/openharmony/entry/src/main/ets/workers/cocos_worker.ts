/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import worker from '@ohos.worker';
import cocos from 'libcocos.so';
import hilog from '@ohos.hilog';

import { ContextType } from '../common/Constants';
<% if(!useV8) { %>
import { launchEngine } from '../cocos/game';
<% } %>
import { PortProxy } from '../common/PortProxy';

globalThis.oh = globalThis.oh || {};

if (!(console as any).assert) {
    (console as any).assert = function(cond, msg) {
        if (!cond) {
            throw new Error(msg);
        }
    };
}

const nativeContext = cocos.getContext(ContextType.WORKER_INIT);
nativeContext.workerInit();

const nativeEditBox = cocos.getContext(ContextType.EDITBOX_UTILS);
const nativeWebView = cocos.getContext(ContextType.WEBVIEW_UTILS);
const appLifecycle = cocos.getContext(ContextType.APP_LIFECYCLE);
const nativeVideo = cocos.getContext(ContextType.VIDEO_UTILS);

let uiPort = new PortProxy(worker.workerPort);

nativeContext.postMessage = function (msgType: string, msgData: string): void {
  uiPort.postMessage(msgType, msgData);
}

nativeContext.postSyncMessage = async function (msgType: string, msgData: string): Promise<boolean | string | number> {
  const result = await uiPort.postSyncMessage(msgType, msgData) as boolean | string | number;
  return result;
}

// The purpose of this is to avoid being GC
nativeContext.setPostMessageFunction.call(nativeContext, nativeContext.postMessage)
nativeContext.setPostSyncMessageFunction.call(nativeContext, nativeContext.postSyncMessage)

globalThis.terminateProcess = function () {
  uiPort.postMessage("exitGame",0);
}

uiPort._messageHandle = function (e) {
  var data = e.data;
  var msg = data.data;

  switch (msg.name) {
    case "onXCLoad":
      const renderContext = cocos.getContext(ContextType.NATIVE_RENDER_API);
      renderContext.nativeEngineInit();
      <% if(!useV8) { %>
        launchEngine().then(() => {
          console.info('launch CC engine finished');
        }).catch(e => {
          console.error('launch CC engine failed');
        });
      <% } %>
      // @ts-ignore
      globalThis.oh.postMessage = nativeContext.postMessage;
      // @ts-ignore
      globalThis.oh.postSyncMessage = nativeContext.postSyncMessage;
      renderContext.nativeEngineStart();
      break;
    case "onTextInput":
      nativeEditBox.onTextChange(msg.param);
      break;
    case "onComplete":
      nativeEditBox.onComplete(msg.param);
      break;
    case "onConfirm":
      nativeEditBox.onConfirm(msg.param);
      break;
    case "onPageBegin":
      nativeWebView.shouldStartLoading(msg.param.viewTag, msg.param.url);
      break;
    case "onPageEnd":
      nativeWebView.finishLoading(msg.param.viewTag, msg.param.url);
      break;
    case "onErrorReceive":
      nativeWebView.failLoading(msg.param.viewTag, msg.param.url);
      break;
    case "onVideoEvent":
      nativeVideo.onVideoEvent(JSON.stringify(msg.param));
      break;
    case "backPress":
      appLifecycle.onBackPress();
      break;
    default:
      console.error("cocos worker: message type unknown");
      break;
  }
}
