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

import { screenAdapter } from 'pal/screen-adapter';
import { WebViewEventType } from './web-view-enums';
import { error, warn } from '../core/platform';
import { WebViewImpl } from './web-view-impl';
import { game } from '../game';
import { mat4 } from '../core/math';
import { contains } from '../core/utils/misc';
import { ccwindow } from '../core/global-exports';
import type { WebView } from './web-view';

const ccdocument = ccwindow.document;

const _mat4_temp = mat4();

/** @mangle */
export class WebViewImplWeb extends WebViewImpl {
    constructor (component: WebView) {
        super(component);
    }

    _bindDomEvent (): void {
        if (!this.webview) {
            return;
        }
        const onLoaded = (e: Event): void => {
            this._forceUpdate = true;
            this.dispatchEvent(WebViewEventType.LOADED);

            const iframe = e.target as HTMLIFrameElement;
            const body = iframe.contentDocument && iframe.contentDocument.body;
            if (body && body.innerHTML.includes('404')) {
                this.dispatchEvent(WebViewEventType.ERROR, body.innerHTML);
            }
        };

        this.webview.addEventListener('load', onLoaded);
    }

    public loadURL (url: string): void {
        if (this.webview) {
            this.webview.src = url;
            // emit loading event
            this.dispatchEvent(WebViewEventType.LOADING);
        }
    }

    public createWebView (): void {
        const wrapper = ccdocument.createElement('div');
        this._wrapper = wrapper;
        wrapper.id = 'webview-wrapper';
        const wrapperStyle = wrapper.style;
        wrapperStyle['-webkit-overflow'] = 'auto';
        wrapperStyle['-webkit-overflow-scrolling'] = 'touch';
        wrapperStyle.position = 'absolute';
        wrapperStyle.bottom = '0px';
        wrapperStyle.left = '0px';
        wrapperStyle.transformOrigin = '0px 100% 0px';
        wrapperStyle['-webkit-transform-origin'] = '0px 100% 0px';
        game.container!.appendChild(wrapper);

        const webview = ccdocument.createElement('iframe');
        this._webview = webview;
        const webviewStyle = webview.style;
        webview.id = 'webview';
        webviewStyle.border = 'none';
        webviewStyle.width = '100%';
        webviewStyle.height = '100%';
        wrapper.appendChild(webview);
        this._bindDomEvent();
    }

    public removeWebView (): void {
        const wrapper = this._wrapper;
        if (contains(game.container, wrapper)) {
            game.container!.removeChild(wrapper);
        }
        this.reset();
    }

    public enable (): void {
        if (this._wrapper) {
            this._wrapper.style.visibility = 'visible';
        }
    }

    public disable (): void {
        if (this._wrapper) {
            this._wrapper.style.visibility = 'hidden';
        }
    }

    public evaluateJS (str: string): void {
        if (this.webview) {
            const win = this.webview.contentWindow;
            if (win) {
                try {
                    win.eval(str);
                } catch (e) {
                    this.dispatchEvent(WebViewEventType.ERROR, e);
                    error(e);
                }
            }
        }
    }

    public setOnJSCallback (callback: () => void): void {
        warn('The platform does not support');
    }

    public setJavascriptInterfaceScheme (scheme: string): void {
        warn('The platform does not support');
    }

    public syncMatrix (): void {
        if (!this._wrapper || !this._uiTrans || !this._component || this._wrapper.style.visibility === 'hidden') return;

        const camera = this.UICamera;
        if (!camera) {
            return;
        }

        this._component.node.getWorldMatrix(_mat4_temp);
        camera.update(true);
        camera.worldMatrixToScreen(_mat4_temp, _mat4_temp, game.canvas!.width, game.canvas!.height);

        const { width, height } = this._uiTrans.contentSize;
        if (!this._forceUpdate
            && this._m00 === _mat4_temp.m00 && this._m01 === _mat4_temp.m01
            && this._m04 === _mat4_temp.m04 && this._m05 === _mat4_temp.m05
            && this._m12 === _mat4_temp.m12 && this._m13 === _mat4_temp.m13
            && this._w === width && this._h === height) {
            return;
        }

        // update matrix cache
        this._m00 = _mat4_temp.m00;
        this._m01 = _mat4_temp.m01;
        this._m04 = _mat4_temp.m04;
        this._m05 = _mat4_temp.m05;
        this._m12 = _mat4_temp.m12;
        this._m13 = _mat4_temp.m13;
        this._w = width;
        this._h = height;

        // TODO: implement webView in PAL
        const dpr = screenAdapter.devicePixelRatio;
        const scaleX = 1 / dpr;
        const scaleY = 1 / dpr;

        const container = game.container!;
        const sx = _mat4_temp.m00 * scaleX;
        const b = _mat4_temp.m01;
        const c = _mat4_temp.m04;
        const sy = _mat4_temp.m05 * scaleY;

        this._wrapper.style.width = `${width}px`;
        this._wrapper.style.height = `${height}px`;
        const w = this._w * scaleX;
        const h = this._h * scaleY;

        const appx = (w * _mat4_temp.m00) * this._uiTrans.anchorX;
        const appy = (h * _mat4_temp.m05) * this._uiTrans.anchorY;

        const offsetX = container && container.style.paddingLeft ? parseInt(container.style.paddingLeft) : 0;
        const offsetY = container && container.style.paddingBottom ? parseInt(container.style.paddingBottom) : 0;
        const tx = _mat4_temp.m12 * scaleX - appx + offsetX;
        const ty = _mat4_temp.m13 * scaleY - appy + offsetY;

        const matrix = `matrix(${sx},${-b},${-c},${sy},${tx},${-ty})`;
        this._wrapper.style.transform = matrix;
        this._wrapper.style['-webkit-transform'] = matrix;
        this._forceUpdate = false;
    }
}
