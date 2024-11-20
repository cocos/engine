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

import { TouchCallback } from 'pal/input';
import { EDITOR, TEST } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { screenAdapter } from 'pal/screen-adapter';
import { Rect, Vec2 } from '../../../cocos/core/math';
import { EventTarget } from '../../../cocos/core/event';
import { Touch, EventTouch } from '../../../cocos/input/types';
import { touchManager } from '../touch-manager';
import { macro } from '../../../cocos/core/platform/macro';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { Feature } from '../../system-info/enum-type';
import { warn } from '../../../cocos/core/platform/debug';

export class TouchInputSource {
    private _canvas?: HTMLCanvasElement;
    private _eventTarget: EventTarget = new EventTarget();

    constructor () {
        if (systemInfo.hasFeature(Feature.INPUT_TOUCH)) {
            this._canvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
            if (!this._canvas && !TEST && !EDITOR) {
                warn('failed to access canvas');
            }
            // In Editor, we don't receive touch event but maybe receive simulated touch event.
            if (!EDITOR) {
                this._registerEvent();
            }
        }
    }

    private _registerEvent (): void {
        // IDEA: need to register on window ?
        this._canvas?.addEventListener('touchstart', this._createCallback(InputEventType.TOUCH_START));
        this._canvas?.addEventListener('touchmove', this._createCallback(InputEventType.TOUCH_MOVE));
        this._canvas?.addEventListener('touchend', this._createCallback(InputEventType.TOUCH_END));
        this._canvas?.addEventListener('touchcancel', this._createCallback(InputEventType.TOUCH_CANCEL));
    }

    private _createCallback (eventType: InputEventType) {
        return (event: TouchEvent): void => {
            const canvasRect = this._getCanvasRect();
            const handleTouches: Touch[] = [];
            const length = event.changedTouches.length;
            for (let i = 0; i < length; ++i) {
                const changedTouch = event.changedTouches[i];
                const touchID = changedTouch.identifier;
                if (touchID === null) {
                    continue;
                }
                const location = this._getLocation(changedTouch, canvasRect);
                const touch = touchManager.getOrCreateTouch(touchID, location.x, location.y);
                if (!touch) {
                    continue;
                }
                if (eventType === InputEventType.TOUCH_END || eventType === InputEventType.TOUCH_CANCEL) {
                    touchManager.releaseTouch(touchID);
                }
                handleTouches.push(touch);
            }
            event.stopPropagation();
            if (event.target === this._canvas) {
                event.preventDefault();
            }
            if (eventType === InputEventType.TOUCH_START) {
                this._canvas?.focus();
            }
            if (handleTouches.length > 0) {
                const eventTouch = new EventTouch(
                    handleTouches,
                    false,
                    eventType,
                    touchManager.getAllTouches(),
                );
                this._eventTarget.emit(eventType, eventTouch);
            }
        };
    }

    private _getCanvasRect (): Rect {
        const canvas = this._canvas;
        const box = canvas?.getBoundingClientRect();
        if (box) {
            return new Rect(box.x, box.y, box.width, box.height);
        }
        return new Rect(0, 0, 0, 0);
    }

    private _getLocation (touch: globalThis.Touch, canvasRect: Rect): Vec2 {
        // webxr has been converted to screen coordinates via camera
        if (globalThis.__globalXR && globalThis.__globalXR.ar && globalThis.__globalXR.ar.isWebXR()) {
            return new Vec2(touch.clientX, touch.clientY);
        }

        let x = touch.clientX - canvasRect.x;
        let y = canvasRect.y + canvasRect.height - touch.clientY;
        if (screenAdapter.isFrameRotated) {
            const tmp = x;
            x = canvasRect.height - y;
            y = tmp;
        }
        const dpr = screenAdapter.devicePixelRatio;
        x *= dpr;
        y *= dpr;
        return new Vec2(x, y);
    }

    public on (eventType: InputEventType, callback: TouchCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    public dispatchEventsInCache (): void {
        // Do nothing
    }
}
