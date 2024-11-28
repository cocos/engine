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
import { ThreadWorkerGlobalScope } from '@ohos.worker';
import { MessageEvent } from '@ohos.worker';

export class PortProxy {
  private autoId: number = 0;
  public actionHandleMap = {}
  private port: ThreadWorkerGlobalScope = null;

  public _messageHandle?: (e: MessageEvent<any>) => void;

  constructor(worker) {
    this.port = worker;
    this.port.onmessage = this.onMessage.bind(this);
  }

  public onMessage(e) {
    let data = e['data'];
    if (data.type != "syncResult" && this._messageHandle) {
      this._messageHandle(e);
    } else if (data.type == "syncResult") {
      const { id, response } = data.data;
      if (!this.actionHandleMap[id]) {
        return;
      }
      this.actionHandleMap[id].call(this, response);
      delete this.actionHandleMap[id];
    }
  }

  public postReturnMessage(e: any, res: any) {
    if (e.type == "sync" && res != null && res != undefined) {
      this.port.postMessage({ type: "syncResult", data: { id: e.data.cbId, response: res } });
    }
  }

  public postMessage(msgName: string, msgData: any) {
    this.port.postMessage({ type: "async", data: { name: msgName, param: msgData } });
  }

  public postSyncMessage(msgName: string, msgData: any) {
    const id = this.autoId++;
    return new Promise((resolve, reject) => {
      const message = {
        type: "sync", data: { cbId: id, name: msgName, param: msgData }
      }
      this.port.postMessage(message);
      this.actionHandleMap[id] = (response) => {
        resolve(response)
      }
    })
  }
}