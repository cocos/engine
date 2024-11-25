/*
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2012 James Chen
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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
*/

import { screenAdapter } from 'pal/screen-adapter';
import { HTML5 } from 'internal:constants';
import { BitmapFont } from '../../2d/assets';
import { director } from '../../game/director';
import { game } from '../../game';
import { Mat4, Vec3, visibleRect, sys } from '../../core';
import { view, View } from '../view';
import { KeyCode } from '../../input/types';
import { contains } from '../../core/utils/misc';
import { Label } from '../../2d/components/label';
import { EditBox } from './edit-box';
import { tabIndexUtil } from './tabIndexUtil';
import { InputFlag, InputMode, KeyboardReturnType } from './types';
import { EditBoxImplBase } from './edit-box-impl-base';
import { BrowserType, OS } from '../../../pal/system-info/enum-type';
import { ccwindow } from '../../core/global-exports';

const ccdocument = ccwindow.document;

// https://segmentfault.com/q/1010000002914610
const SCROLLY = 40;
const LEFT_PADDING = 2;
const DELAY_TIME = 400;

const _matrix = new Mat4();
const _matrix_temp = new Mat4();
const _vec3 = new Vec3();

let _currentEditBoxImpl: EditBoxImpl | null = null;

let _domCount = 0;

export class EditBoxImpl extends EditBoxImplBase {
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _delegate: EditBox | null = null;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _inputMode: InputMode = -1 as InputMode;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _inputFlag: InputFlag = -1 as InputFlag;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _returnType: KeyboardReturnType = -1 as KeyboardReturnType;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public __eventListeners: any = {};
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public __autoResize = false;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public __orientationChanged: any;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _edTxt: HTMLInputElement | HTMLTextAreaElement | null = null;
    private _isTextArea = false;

    private _textLabelFont = null;
    private _textLabelFontSize: number | null = null;
    private _textLabelFontColor = null;
    private _textLabelAlign = null;
    private _placeholderLabelFont = null;
    private _placeholderLabelFontSize: number | null = null;
    private _placeholderLabelFontColor = null;
    private _placeholderLabelAlign = null;
    private _placeholderLineHeight = null;
    private _placeholderStyleSheet: HTMLStyleElement | null = null;
    private _domId = `EditBoxId_${++_domCount}`;
    private _forceUpdate: boolean = false;

    constructor () {
        super();
    }

    public init (delegate: EditBox): void {
        if (!HTML5) return;
        if (!delegate) {
            return;
        }

        this._delegate = delegate;
        if (delegate.inputMode === InputMode.ANY) {
            this._createTextArea();
        } else {
            this._createInput();
        }

        tabIndexUtil.add(this);
        this.setTabIndex(delegate.tabIndex);
        this._initStyleSheet();
        this._registerEventListeners();
        this._addDomToGameContainer();
        View.instance.on('canvas-resize', this._resize, this);
        screenAdapter.on('window-resize', this._resize, this);
    }

    public clear (): void {
        if (!HTML5) return;
        View.instance.off('canvas-resize', this._resize, this);
        screenAdapter.off('window-resize', this._resize, this);
        this._removeEventListeners();
        this._removeDomFromGameContainer();

        tabIndexUtil.remove(this);

        // clear while editing
        if (_currentEditBoxImpl === this) {
            _currentEditBoxImpl = null;
        }

        this._delegate = null;
    }

    private _resize (): void {
        this._forceUpdate = true;
    }

    // The beforeDraw function should be used here.
    // Because many attributes are modified after the update is executed,
    // this can lead to problems with incorrect coordinates.
    public beforeDraw (): void {
        if (!HTML5) return;
        const node = this._delegate!.node;
        if (!node.hasChangedFlags && !this._forceUpdate) {
            return;
        }
        this._forceUpdate = false;
        this._updateMatrix();
    }

    public setTabIndex (index: number): void {
        if (!HTML5) return;
        this._edTxt!.tabIndex = index;
        tabIndexUtil.resort();
    }

    public setSize (width: number, height: number): void {
        if (!HTML5) return;
        const elem = this._edTxt;
        if (elem) {
            elem.style.width = `${width}px`;
            elem.style.height = `${height}px`;
        }
    }

    public beginEditing (): void {
        if (!HTML5) return;
        if (_currentEditBoxImpl && _currentEditBoxImpl !== this) {
            _currentEditBoxImpl.setFocus(false);
        }

        this._editing = true;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        _currentEditBoxImpl = this;
        this._delegate!._editBoxEditingDidBegan();
        this._showDom();
        this._edTxt!.focus();
    }

    public endEditing (): void {
        if (!HTML5) return;
        this._edTxt!.blur();
    }

    private _createInput (): void {
        if (!HTML5) return;
        this._isTextArea = false;
        this._edTxt = ccdocument.createElement('input');
    }

    private _createTextArea (): void {
        if (!HTML5) return;
        this._isTextArea = true;
        this._edTxt = ccdocument.createElement('textarea');
    }

    private _addDomToGameContainer (): void {
        if (!HTML5) return;
        if (game.container && this._edTxt) {
            game.container.appendChild(this._edTxt);
            ccdocument.head.appendChild(this._placeholderStyleSheet!);
        }
    }

    private _removeDomFromGameContainer (): void {
        if (!HTML5) return;
        const hasElem = contains(game.container, this._edTxt);
        if (hasElem && this._edTxt) {
            game.container!.removeChild(this._edTxt);
        }
        const hasStyleSheet = contains(ccdocument.head, this._placeholderStyleSheet);
        if (hasStyleSheet) {
            ccdocument.head.removeChild(this._placeholderStyleSheet!);
        }

        this._edTxt = null;
        this._placeholderStyleSheet = null;
    }

    private _showDom (): void {
        if (!HTML5) return;
        this._updateMaxLength();
        this._updateInputType();
        this._updateStyleSheet();
        if (this._edTxt && this._delegate) {
            this._edTxt.style.display = '';
            this._delegate._hideLabels();
        }
        if (sys.isMobile) {
            this._showDomOnMobile();
        }
    }

    private _hideDom (): void {
        if (!HTML5) return;
        const elem = this._edTxt;
        if (elem && this._delegate) {
            elem.style.display = 'none';
            this._delegate._showLabels();
        }
        if (sys.isMobile) {
            this._hideDomOnMobile();
        }
    }

    private _showDomOnMobile (): void {
        if (!HTML5) return;
        if (sys.os !== OS.ANDROID && sys.os !== OS.OHOS) {
            return;
        }

        screenAdapter.handleResizeEvent = false;
        this._adjustWindowScroll();
    }

    private _hideDomOnMobile (): void {
        if (!HTML5) return;
        if (sys.os === OS.ANDROID || sys.os === OS.OHOS) {
            screenAdapter.handleResizeEvent = true;
        }

        this._scrollBackWindow();
    }

    private _isElementInViewport (): boolean {
        if (!HTML5) return false;
        if (this._edTxt) {
            const rect = this._edTxt.getBoundingClientRect();

            return (
                rect.top >= 0 && rect.left >= 0
                && rect.bottom <= (ccwindow.innerHeight || ccdocument.documentElement.clientHeight)
                && rect.right <= (ccwindow.innerWidth || ccdocument.documentElement.clientWidth)
            );
        }
        return false;
    }

    private _adjustWindowScroll (): void {
        if (!HTML5) return;
        setTimeout(() => {
            if (ccwindow.scrollY < SCROLLY && !this._isElementInViewport()) {
                this._edTxt!.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
            }
        }, DELAY_TIME);
    }

    private _scrollBackWindow (): void {
        if (!HTML5) return;
        setTimeout(() => {
            if (sys.browserType === BrowserType.WECHAT && sys.os === OS.IOS) {
                if (ccwindow.top) {
                    ccwindow.top.scrollTo(0, 0);
                }

                return;
            }

            ccwindow.scrollTo(0, 0);
        }, DELAY_TIME);
    }

    private _updateMatrix (): void {
        if (!HTML5) return;
        if (!this._edTxt) {
            return;
        }

        const node = this._delegate!.node;
        let scaleX = view.getScaleX();
        let scaleY = view.getScaleY();
        const viewport = view.getViewportRect();
        // TODO: implement editBox in PAL
        const dpr = screenAdapter.devicePixelRatio;

        node.getWorldMatrix(_matrix);
        const transform = node._uiProps.uiTransformComp;
        if (transform) {
            Vec3.set(_vec3, -transform.anchorX * transform.width, -transform.anchorY * transform.height, _vec3.z);
            Mat4.transform(_matrix, _matrix, _vec3);
        }

        if (!node._uiProps.uiTransformComp) {
            return;
        }

        const camera = director.root!.batcher2D.getFirstRenderCamera(node);
        if (!camera) return;

        camera.node.getWorldRT(_matrix_temp);
        const m12 = _matrix_temp.m12;
        const m13 = _matrix_temp.m13;
        const center = visibleRect.center;
        _matrix_temp.m12 = center.x - (_matrix_temp.m00 * m12 + _matrix_temp.m04 * m13);
        _matrix_temp.m13 = center.y - (_matrix_temp.m01 * m12 + _matrix_temp.m05 * m13);

        scaleX /= dpr;
        scaleY /= dpr;

        Vec3.set(_vec3, scaleX, scaleY, 1);
        Mat4.scale(_matrix_temp, _matrix_temp, _vec3);

        const container = game.container;
        let offsetX = parseInt((container && container.style.paddingLeft) || '0');
        offsetX += viewport.x / dpr;
        let offsetY = parseInt((container && container.style.paddingBottom) || '0');
        offsetY += viewport.y / dpr;
        _matrix_temp.m12 += offsetX;
        _matrix_temp.m13 += offsetY;

        Mat4.multiply(_matrix_temp, _matrix_temp, _matrix);

        const a = _matrix_temp.m00;
        const b = _matrix_temp.m01;
        const c = _matrix_temp.m04;
        const d = _matrix_temp.m05;

        const tx = _matrix_temp.m12;
        const ty = _matrix_temp.m13;

        const matrix = `matrix(${a},${-b},${-c},${d},${tx},${-ty})`;
        this._edTxt.style.transform = matrix;
        this._edTxt.style['-webkit-transform'] = matrix;
        this._edTxt.style['transform-origin'] = '0px 100% 0px';
        this._edTxt.style['-webkit-transform-origin'] = '0px 100% 0px';
    }

    private _updateInputType (): void {
        if (!HTML5) return;
        const delegate = this._delegate;
        const inputMode = delegate!.inputMode;
        const inputFlag = delegate!.inputFlag;
        const returnType = delegate!.returnType;
        let elem = this._edTxt;

        if (this._inputMode === inputMode
            && this._inputFlag === inputFlag
            && this._returnType === returnType) {
            return;
        }

        // update cache
        this._inputMode = inputMode;
        this._inputFlag = inputFlag;
        this._returnType = returnType;

        // FIX ME: TextArea actually dose not support password type.
        if (this._isTextArea) {
            // input flag
            let transform = 'none';
            if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
                transform = 'uppercase';
            } else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
                transform = 'capitalize';
            }
            elem!.style.textTransform = transform;
            return;
        }

        elem = elem as HTMLInputElement;
        // begin to updateInputType
        if (inputFlag === InputFlag.PASSWORD) {
            elem.type = 'password';
            elem.style.textTransform = 'none';
            return;
        }

        // input mode
        let type = elem.type;
        if (inputMode === InputMode.EMAIL_ADDR) {
            type = 'email';
        } else if (inputMode === InputMode.NUMERIC) {
            type = 'number';
        } else if (inputMode === InputMode.DECIMAL) {
            type = 'digit';
        } else if (inputMode === InputMode.PHONE_NUMBER) {
            type = 'tel';
            elem.addEventListener('wheel', () => false);
        } else if (inputMode === InputMode.URL) {
            type = 'url';
        } else {
            type = 'text';

            if (returnType === KeyboardReturnType.SEARCH) {
                type = 'search';
            }
        }
        elem.type = type;

        // input flag
        let textTransform = 'none';
        if (inputFlag === InputFlag.INITIAL_CAPS_ALL_CHARACTERS) {
            textTransform = 'uppercase';
        } else if (inputFlag === InputFlag.INITIAL_CAPS_WORD) {
            textTransform = 'capitalize';
        }
        elem.style.textTransform = textTransform;
    }

    private _updateMaxLength (): void {
        if (!HTML5) return;
        let maxLength = this._delegate!.maxLength;
        if (maxLength < 0) {
            maxLength = 65535;
        }
        this._edTxt!.maxLength = maxLength;
    }

    private _initStyleSheet (): void {
        if (!HTML5) return;
        if (!this._edTxt) {
            return;
        }
        let elem = this._edTxt;
        elem.style.color = '#000000';
        elem.style.border = '0px';
        elem.style.background = 'transparent';
        elem.style.width = '100%';
        elem.style.height = '100%';
        elem.style.outline = 'medium';
        elem.style.padding = '0';
        elem.style.textTransform = 'none';
        elem.style.display = 'none';
        elem.style.position = 'absolute';
        elem.style.bottom = '0px';
        elem.style.left = `${LEFT_PADDING}px`;
        elem.className = 'cocosEditBox';
        elem.style.fontFamily = 'Arial';
        elem.id = this._domId;

        if (!this._isTextArea) {
            elem = elem as HTMLInputElement;
            elem.type = 'text';
            elem.style['-moz-appearance'] = 'textfield';
        } else {
            elem.style.resize = 'none';
            elem.style.overflowY = 'scroll';
        }

        this._placeholderStyleSheet = ccdocument.createElement('style');
    }

    private _updateStyleSheet (): void {
        if (!HTML5) return;
        const delegate = this._delegate;
        const elem = this._edTxt;
        if (elem && delegate) {
            elem.value = delegate.string;
            this._updateTextLabel(delegate.textLabel);

            // NOTE: we don't show placeholder any more when editBox is editing
            // elem.placeholder = delegate.placeholder;
            // this._updatePlaceholderLabel(delegate.placeholderLabel);
        }
    }

    private _updateTextLabel (textLabel): void {
        if (!HTML5) return;
        if (!textLabel) {
            return;
        }

        let font = textLabel.font;
        if (font && !(font instanceof BitmapFont)) {
            font = font._fontFamily;
        } else {
            font = textLabel.fontFamily;
        }

        const fontSize = textLabel.fontSize * textLabel.node.scale.y;

        if (this._textLabelFont === font
            && this._textLabelFontSize === fontSize
            && this._textLabelFontColor === textLabel.fontColor
            && this._textLabelAlign === textLabel.horizontalAlign) {
            return;
        }

        this._textLabelFont = font;
        this._textLabelFontSize = fontSize;
        this._textLabelFontColor = textLabel.fontColor;
        this._textLabelAlign = textLabel.horizontalAlign;

        if (!this._edTxt) {
            return;
        }

        const elem = this._edTxt;
        elem.style.fontSize = `${fontSize}px`;
        elem.style.color = textLabel.color.toCSS();
        elem.style.fontFamily = font;

        switch (textLabel.horizontalAlign) {
        case Label.HorizontalAlign.LEFT:
            elem.style.textAlign = 'left';
            break;
        case Label.HorizontalAlign.CENTER:
            elem.style.textAlign = 'center';
            break;
        case Label.HorizontalAlign.RIGHT:
            elem.style.textAlign = 'right';
            break;
        default:
            break;
        }
    }

    private _updatePlaceholderLabel (placeholderLabel): void {
        if (!HTML5) return;
        if (!placeholderLabel) {
            return;
        }

        let font = placeholderLabel.font;
        if (font && !(font instanceof BitmapFont)) {
            font = placeholderLabel.font._fontFamily;
        } else {
            font = placeholderLabel.fontFamily;
        }

        const fontSize = placeholderLabel.fontSize * placeholderLabel.node.scale.y;

        if (this._placeholderLabelFont === font
            && this._placeholderLabelFontSize === fontSize
            && this._placeholderLabelFontColor === placeholderLabel.fontColor
            && this._placeholderLabelAlign === placeholderLabel.horizontalAlign
            && this._placeholderLineHeight === placeholderLabel.fontSize) {
            return;
        }

        this._placeholderLabelFont = font;
        this._placeholderLabelFontSize = fontSize;
        this._placeholderLabelFontColor = placeholderLabel.fontColor;
        this._placeholderLabelAlign = placeholderLabel.horizontalAlign;
        this._placeholderLineHeight = placeholderLabel.fontSize;

        const styleEl = this._placeholderStyleSheet;
        const fontColor = placeholderLabel.color.toCSS();
        const lineHeight = placeholderLabel.fontSize;

        let horizontalAlign = '';
        switch (placeholderLabel.horizontalAlign) {
        case Label.HorizontalAlign.LEFT:
            horizontalAlign = 'left';
            break;
        case Label.HorizontalAlign.CENTER:
            horizontalAlign = 'center';
            break;
        case Label.HorizontalAlign.RIGHT:
            horizontalAlign = 'right';
            break;
        default:
            break;
        }

        styleEl!.innerHTML = `#${this._domId}::-webkit-input-placeholder{text-transform: initial;-family: ${font};font-size: ${fontSize}px;color: ${fontColor};line-height: ${lineHeight}px;text-align: ${horizontalAlign};}`
                            + `#${this._domId}::-moz-placeholder{text-transform: initial;-family: ${font};font-size: ${fontSize}px;color: ${fontColor};line-height: ${lineHeight}px;text-align: ${horizontalAlign};}`
                            + `#${this._domId}::-ms-input-placeholder{text-transform: initial;-family: ${font};font-size: ${fontSize}px;color: ${fontColor};line-height: ${lineHeight}px;text-align: ${horizontalAlign};}`;
        // EDGE_BUG_FIX: hide clear button, because clearing input box in Edge does not emit input event
        // issue refference: https://github.com/angular/angular/issues/26307
        if (sys.browserType === BrowserType.EDGE) {
            styleEl!.innerHTML += `#${this._domId}::-ms-clear{display: none;}`;
        }
    }

    private _registerEventListeners (): void {
        if (!HTML5) return;
        if (!this._edTxt) {
            return;
        }

        const elem = this._edTxt;
        let inputLock = false;
        const cbs = this.__eventListeners;

        cbs.compositionStart = (): void => {
            inputLock = true;
        };

        cbs.compositionEnd = (): void => {
            inputLock = false;
            this._delegate!._editBoxTextChanged(elem.value);
        };

        cbs.onInput = (): void => {
            if (inputLock) {
                return;
            }
            const delegate = this._delegate;
            // input of number type doesn't support maxLength attribute
            const maxLength = delegate!.maxLength;
            if (maxLength >= 0) {
                elem.value = elem.value.slice(0, maxLength);
            }
            delegate!._editBoxTextChanged(elem.value);
        };

        cbs.onClick = (): void => {
            if (this._editing) {
                if (sys.isMobile) {
                    this._adjustWindowScroll();
                }
            }
        };

        cbs.onKeydown = (e): void => {
            if (e.keyCode === KeyCode.ENTER) {
                e.propagationStopped = true;
                this._delegate!._editBoxEditingReturn();

                if (!this._isTextArea) {
                    elem.blur();
                }
            } else if (e.keyCode === KeyCode.TAB) {
                e.propagationStopped = true;
                e.preventDefault();

                tabIndexUtil.next(this);
            }
        };

        cbs.onBlur = (): void => {
            // on mobile, sometimes input element doesn't fire compositionend event
            if (sys.isMobile && inputLock) {
                cbs.compositionEnd();
            }
            this._editing = false;
            _currentEditBoxImpl = null;
            this._hideDom();
            this._delegate!._editBoxEditingDidEnded();
        };

        elem.addEventListener('compositionstart', cbs.compositionStart as EventListenerOrEventListenerObject);
        elem.addEventListener('compositionend', cbs.compositionEnd as EventListenerOrEventListenerObject);
        elem.addEventListener('input', cbs.onInput as EventListenerOrEventListenerObject);
        elem.addEventListener('keydown', cbs.onKeydown as EventListenerOrEventListenerObject);
        elem.addEventListener('blur', cbs.onBlur as EventListenerOrEventListenerObject);
        elem.addEventListener('touchstart', cbs.onClick as EventListenerOrEventListenerObject);
    }
    private _removeEventListeners (): void {
        if (!HTML5) return;
        if (!this._edTxt) {
            return;
        }

        const elem = this._edTxt;
        const cbs = this.__eventListeners;

        elem.removeEventListener('compositionstart', cbs.compositionStart as EventListenerOrEventListenerObject);
        elem.removeEventListener('compositionend', cbs.compositionEnd as EventListenerOrEventListenerObject);
        elem.removeEventListener('input', cbs.onInput as EventListenerOrEventListenerObject);
        elem.removeEventListener('keydown', cbs.onKeydown as EventListenerOrEventListenerObject);
        elem.removeEventListener('blur', cbs.onBlur as EventListenerOrEventListenerObject);
        elem.removeEventListener('touchstart', cbs.onClick as EventListenerOrEventListenerObject);

        cbs.compositionStart = null;
        cbs.compositionEnd = null;
        cbs.onInput = null;
        cbs.onKeydown = null;
        cbs.onBlur = null;
        cbs.onClick = null;
    }
}
