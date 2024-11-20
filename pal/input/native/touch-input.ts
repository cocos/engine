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

import { screenAdapter } from 'pal/screen-adapter';
import { Size, Vec2 } from '../../../cocos/core/math';
import { EventTarget } from '../../../cocos/core/event';
import { EventTouch, Touch as CCTouch } from '../../../cocos/input/types';
import { touchManager } from '../touch-manager';
import { InputEventType } from '../../../cocos/input/types/event-enum';

export type TouchCallback = (res: EventTouch) => void;

declare const jsb: any;

class TouchEventElement {
    type: InputEventType | null = null;
    changedTouches: Touch[] = [];
    windowId: number = 0;
}

class TouchEventCache {
    private _events: TouchEventElement[] = [];
    private _length = 0;

    push (eventType: InputEventType, changedTouches: Touch[], windowId: number): void {
        const events = this._events;
        const index = this._length;
        if (index >= events.length) {
            events.push(new TouchEventElement());
        }
        const e = events[index];
        const cachedTouches = e.changedTouches;
        e.type = eventType;
        cachedTouches.length = changedTouches.length;
        e.windowId = windowId;

        for (let i = 0, len = changedTouches.length; i < len; ++i) {
            const src = changedTouches[i];
            let dst = cachedTouches[i] as any;
            if (!dst) {
                (cachedTouches[i] as any) = dst = {
                    identifier: 0,
                    clientX: 0,
                    clientY: 0,
                    pageX: 0,
                    pageY: 0,
                };
            }
            dst.identifier = src.identifier;
            dst.clientX = src.clientX;
            dst.clientY = src.clientY;
            dst.pageX = src.pageX;
            dst.pageY = src.pageY;
        }

        ++this._length;
    }

    clear (): void {
        this._length = 0;
    }

    forEach (cb: ((e: TouchEventElement) => void)): void {
        for (let i = 0, len = this._length; i < len; ++i) {
            cb(this._events[i]);
        }
    }
}

export class TouchInputSource {
    private _eventTarget: EventTarget = new EventTarget();
    private _windowManager: any;

    private _cache = new TouchEventCache();

    constructor () {
        this._registerEvent();
        this._windowManager = jsb.ISystemWindowManager.getInstance();
    }

    private _registerEvent (): void {
        jsb.onTouchStart = this._createEventCacheCallback(InputEventType.TOUCH_START);
        jsb.onTouchMove = this._createEventCacheCallback(InputEventType.TOUCH_MOVE);
        jsb.onTouchEnd = this._createEventCacheCallback(InputEventType.TOUCH_END);
        jsb.onTouchCancel = this._createEventCacheCallback(InputEventType.TOUCH_CANCEL);
    }

    private _createEventCacheCallback (eventType: InputEventType) {
        return (changedTouches: Touch[], windowId: number): void => {
            this._cache.push(eventType, changedTouches, windowId);
        };
    }

    public dispatchEventsInCache (): void {
        const cache = this._cache;
        cache.forEach((e: TouchEventElement) => {
            this._dispatchEvent(e.type!, e.changedTouches, e.windowId);
        });

        cache.clear();
    }

    private _dispatchEvent (eventType: InputEventType, changedTouches: Touch[], windowId: number): void {
        const handleTouches: CCTouch[] = [];
        const length = changedTouches.length;
        const windowSize = this._windowManager.getWindow(windowId).getViewSize() as Size;
        for (let i = 0; i < length; ++i) {
            const changedTouch = changedTouches[i];
            const touchID = changedTouch.identifier;
            if (touchID === null) {
                continue;
            }
            const location = this._getLocation(changedTouch, windowSize);
            const touch = touchManager.getOrCreateTouch(touchID, location.x, location.y);
            if (!touch) {
                continue;
            }
            if (eventType === InputEventType.TOUCH_END || eventType === InputEventType.TOUCH_CANCEL) {
                touchManager.releaseTouch(touchID);
            }
            handleTouches.push(touch);
        }
        if (handleTouches.length > 0) {
            const eventTouch = new EventTouch(
                handleTouches,
                false,
                eventType,
                touchManager.getAllTouches(),
            );
            eventTouch.windowId = windowId;
            this._eventTarget.emit(eventType, eventTouch);
        }
    }

    private _getLocation (touch: globalThis.Touch, windowSize: Size): Vec2 {
        const dpr = screenAdapter.devicePixelRatio;
        const x = touch.clientX * dpr;
        const y = windowSize.height - touch.clientY * dpr;
        return new Vec2(x, y);
    }

    public on (eventType: InputEventType, callback: TouchCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }
}
