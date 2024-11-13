/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, help, executeInEditMode, menu, tooltip, type, displayOrder, serializable, requireComponent } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { UITransform } from '../2d/framework';
import { Component, EventHandler as ComponentEventHandler } from '../scene-graph';
import { WebViewImplManager } from './web-view-impl-manager';
import { WebViewEventType } from './web-view-enums';
import { legacyCC } from '../core/global-exports';
import type { WebViewImpl  } from './web-view-impl';

/**
 * @en
 * WebView component, used to display web pages in the game.
 * Since different platforms have different authorizations, APIs, and control methods for WebView components, there is no unified standard yet.
 * So currently only Web, iOS, and Android platforms are supported.
 * @zh
 * WebView 组件，用于在游戏中显示网页。
 * 由于不同平台对于 WebView 组件的授权、API、控制方式都不同，还没有形成统一的标准，所以目前只支持 Web、iOS 和 Android 平台。
 */
@ccclass('cc.WebView')
@help('i18n:cc.WebView')
@menu('Miscellaneous/WebView')
@requireComponent(UITransform)
@executeInEditMode
export class WebView extends Component {
    @serializable
    protected _url = 'https://cocos.com';

    protected _impl: WebViewImpl | null = null;

    /**
     * @en WebView event type.
     * @zh 网页视图事件类型。
     */
    public static EventType = WebViewEventType;

    constructor () {
        super();
    }

    /**
     * @en
     * A given URL to be loaded by the WebView, it should have a http or https prefix.
     * @zh
     * 指定 WebView 加载的网址，它应该是一个 http 或者 https 开头的字符串。
     */
    @tooltip('i18n:webview.url')
    get url (): string {
        return this._url;
    }
    set url (val: string) {
        this._url = val;
        if (this._impl) {
            this._impl.loadURL(val);
        }
    }

    /**
     * @en
     * The webview's event callback, it will be triggered after the loading is completed or when the loading error occurs.
     * @zh
     * WebView 的回调事件，当网页加载过程中，加载完成后或者加载出错时都会回调此函数。
     */
    @serializable
    @type([ComponentEventHandler])
    @displayOrder(20)
    @tooltip('i18n:webview.webviewEvents')
    public webviewEvents: ComponentEventHandler[] = [];

    /**
     * @en
     * Raw webview objects for user customization.
     * @zh
     * 原始网页对象，用于用户定制。
     */
    get nativeWebView (): HTMLIFrameElement | null {
        return (this._impl && this._impl.webview) || null;
    }

    /**
     * @en
     * Gets the current webview state.
     * @zh
     * 获取当前网页视图状态。
     */
    get state (): WebViewEventType {
        if (!this._impl) { return WebViewEventType.NONE; }
        return this._impl.state;
    }

    /**
     * @en
     * Sets javascript interface scheme (see also setOnJSCallback).
     * Note: Supports only on the Android and iOS. For HTML5, please refer to the official documentation.
     * Please refer to the official documentation for more details.
     * @zh
     * 设置 JavaScript 接口方案（与 'setOnJSCallback' 配套使用）。
     * 注意：只支持 Android 和 iOS ，Web 端用法请前往官方文档查看。
     * 详情请参阅官方文档
     * @method setJavascriptInterfaceScheme
     * @param {String} scheme
     */
    public setJavascriptInterfaceScheme (scheme: string): void {
        if (this._impl) {
            this._impl.setJavascriptInterfaceScheme(scheme);
        }
    }

    /**
     * @en
     * This callback called when load URL that start with javascript
     * interface scheme (see also setJavascriptInterfaceScheme).
     * Note: Supports only on the Android and iOS. For HTML5, please refer to the official documentation.
     * Please refer to the official documentation for more details.
     * @zh
     * 当加载 URL 以 JavaScript 接口方案开始时调用这个回调函数。
     * 注意：只支持 Android 和 iOS，Web 端用法请前往官方文档查看。
     * 详情请参阅官方文档。
     * @method setOnJSCallback
     * @param {Function} callback
     */
    public setOnJSCallback (callback: () => void): void {
        if (this._impl) {
            this._impl.setOnJSCallback(callback);
        }
    }

    /**
     * @en
     * Evaluates JavaScript in the context of the currently displayed page.
     * Please refer to the official document for more details
     * Note: Cross domain issues need to be resolved by yourself
     * @zh
     * 执行 WebView 内部页面脚本（详情请参阅官方文档）。
     * 注意：需要自行解决跨域问题。
     * @method evaluateJS
     * @param {String} str
     */
    public evaluateJS (str: string): void {
        if (this._impl) {
            this._impl.evaluateJS(str);
        }
    }

    public __preload (): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            return;
        }
        this._impl = WebViewImplManager.getImpl(this);
        // must be register the event listener
        this._impl.componentEventList.set(WebViewEventType.LOADING, this.onLoading.bind(this));
        this._impl.componentEventList.set(WebViewEventType.LOADED, this.onLoaded.bind(this));
        this._impl.componentEventList.set(WebViewEventType.ERROR, this.onError.bind(this));
        this._impl.loadURL(this._url);
    }

    onLoading (): void {
        ComponentEventHandler.emitEvents(this.webviewEvents, this, WebViewEventType.LOADING);
        this.node.emit(WebViewEventType.LOADING, this);
    }

    onLoaded (): void {
        ComponentEventHandler.emitEvents(this.webviewEvents, this, WebViewEventType.LOADED);
        this.node.emit(WebViewEventType.LOADED, this);
    }

    onError (...args: any[any]): void {
        ComponentEventHandler.emitEvents(this.webviewEvents, this, WebViewEventType.ERROR, args);
        this.node.emit(WebViewEventType.ERROR, this, args);
    }

    public onEnable (): void {
        if (this._impl) {
            this._impl.enable();
        }
    }

    public onDisable (): void {
        if (this._impl) {
            this._impl.disable();
        }
    }

    public onDestroy (): void {
        if (this._impl) {
            this._impl.destroy();
            this._impl = null;
        }
    }

    public update (dt: number): void {
        if (this._impl) {
            this._impl.syncMatrix();
        }
    }
}

// TODO Since jsb adapter does not support import cc, put it on internal first and adjust it later.
legacyCC.internal.WebView = WebView;
