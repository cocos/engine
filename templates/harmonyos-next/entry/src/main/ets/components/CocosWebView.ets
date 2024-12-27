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
import { PortProxy } from '../common/PortProxy';
import web from '@ohos.web.webview';

interface param {
  viewTag: number,
  url: string,
}

@Observed
export class WebViewInfo {
  // position
  public x: number = 0;
  public y: number = 0;
  // size
  public w: number = 0;
  public h: number = 0;
  // url
  public url: string = '';
  // tag
  public viewTag: number = 0;
  // Whether to display
  public visible: boolean = true;
  /*
   * doc : https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/arkui-ts/ts-basic-components-web.md#webcontroller
   */
  public controller: web.WebviewController = new web.WebviewController();

  constructor(x: number, y: number, w: number, h: number, viewTag: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.viewTag = viewTag;

    web.once("webInited", () => {
      if (this.url != '') {
        this.controller.loadUrl(this.url);
      }
    });
  }
}

@Component
export struct CocosWebView {
  @ObjectLink viewInfo: WebViewInfo;
  public workPort: PortProxy | null = null;

  build() {
    Web({ src: this.viewInfo.url, controller: this.viewInfo.controller })
      .position({ x: this.viewInfo.x, y: this.viewInfo.y })
      .width(this.viewInfo.w)
      .height(this.viewInfo.h)
      .border({ width: 1 })
      .onControllerAttached(() => {
        if (this.viewInfo.url != '') {
          this.viewInfo.controller.loadUrl(this.viewInfo.url);
        }
      })
      .onPageBegin((event) => {
        this.workPort?.postMessage("onPageBegin", {
          viewTag: this.viewInfo.viewTag as number,
          url: event?.url as string
        } as param);
      })
      .onPageEnd((event) => {
        this.workPort?.postMessage("onPageEnd", { viewTag: this.viewInfo.viewTag as number, url: event?.url as string } as param)
      })
      .onErrorReceive((event) => {
        this.workPort?.postMessage("onErrorReceive", { viewTag: this.viewInfo.viewTag as number, url: this.viewInfo.url as string } as param)
      })
      .onHttpErrorReceive((event) => {
        this.workPort?.postMessage("onErrorReceive", { viewTag: this.viewInfo.viewTag as number, url: this.viewInfo.url as string } as param)
      })
      .domStorageAccess(true)// enable DOM storage permissions
      .databaseAccess(true)// enable database storage permissions
      .imageAccess(true)// enable image loading permissions
      .javaScriptAccess(true)// support JS code running
      .visibility(this.viewInfo.visible ? Visibility.Visible : Visibility.None)
  }
}