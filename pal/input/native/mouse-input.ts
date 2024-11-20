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
import { EventMouse } from '../../../cocos/input/types';
import { EventTarget } from '../../../cocos/core/event';
import { Vec2 } from '../../../cocos/core/math';
import { InputEventType } from '../../../cocos/input/types/event-enum';

export type MouseCallback = (res: EventMouse) => void;

declare const jsb: any;

class MouseEventElement {
    type: InputEventType | null = null;
    mouseEvent = {
        x: 0,
        y: 0,
        xDelta: 0,
        yDelta: 0,
        button: 0,
        windowId: 0,
        wheelDeltaX: 0,
        wheelDeltaY: 0,
    };
}

class MouseEventCache {
    private _events: MouseEventElement[] = [];
    private _length = 0;

    push (eventType: InputEventType, mouseEvent?: any): void {
        const events = this._events;
        const index = this._length;
        if (index >= events.length) {
            events.push(new MouseEventElement());
        }
        const e = events[index];
        e.type = eventType;
        const cachedEvent = e.mouseEvent;
        if (mouseEvent) {
            cachedEvent.x = mouseEvent.x;
            cachedEvent.y = mouseEvent.y;
            cachedEvent.xDelta = mouseEvent.xDelta;
            cachedEvent.yDelta = mouseEvent.yDelta;
            cachedEvent.button = mouseEvent.button;
            cachedEvent.windowId = mouseEvent.windowId;
            cachedEvent.wheelDeltaX = mouseEvent.wheelDeltaX;
            cachedEvent.wheelDeltaY = mouseEvent.wheelDeltaY;
        } else {
            cachedEvent.x = cachedEvent.y = cachedEvent.xDelta = cachedEvent.yDelta = 0;
            cachedEvent.button = cachedEvent.windowId = cachedEvent.wheelDeltaX = cachedEvent.wheelDeltaY = 0;
        }

        ++this._length;
    }

    clear (): void {
        this._length = 0;
    }

    forEach (cb: ((e: MouseEventElement) => void)): void {
        for (let i = 0, len = this._length; i < len; ++i) {
            cb(this._events[i]);
        }
    }
}

export class MouseInputSource {
    private _eventTarget: EventTarget = new EventTarget();
    private _preMousePos: Vec2 = new Vec2();
    private _isPressed = false;
    private _windowManager: any;
    private _pointLocked = false;
    private _cache = new MouseEventCache();

    private _handleMouseDown: (mouseEvent: jsb.MouseEvent) => void;
    private _handleMouseMove: (mouseEvent: jsb.MouseEvent) => void;
    private _handleMouseUp: (mouseEvent: jsb.MouseEvent) => void;
    private _handleWindowLeave: () => void;
    private _handleWindowEnter: () => void;
    private _handleMouseWheel: (mouseEvent: jsb.MouseWheelEvent) => void;

    constructor () {
        this._handleMouseDown = this._createEventCacheCallback$(InputEventType.MOUSE_DOWN);
        this._handleMouseMove = this._createEventCacheCallback$(InputEventType.MOUSE_MOVE);
        this._handleMouseUp =  this._createEventCacheCallback$(InputEventType.MOUSE_UP);
        this._handleWindowLeave = this._createEventCacheCallback$(InputEventType.MOUSE_LEAVE);
        this._handleWindowEnter = this._createEventCacheCallback$(InputEventType.MOUSE_ENTER);
        this._handleMouseWheel = this._createEventCacheCallback$(InputEventType.MOUSE_WHEEL);
        this._registerEvent$();
        this._windowManager = jsb.ISystemWindowManager.getInstance();
    }

    public dispatchMouseDownEvent (nativeMouseEvent: any): void { this._handleMouseDown(nativeMouseEvent as jsb.MouseEvent); }
    public dispatchMouseMoveEvent (nativeMouseEvent: any): void { this._handleMouseMove(nativeMouseEvent as jsb.MouseEvent); }
    public dispatchMouseUpEvent (nativeMouseEvent: any): void { this._handleMouseUp(nativeMouseEvent as jsb.MouseEvent); }
    public dispatchScrollEvent (nativeMouseEvent: any): void { this._handleMouseWheel(nativeMouseEvent as jsb.MouseWheelEvent); }

    private _getLocation (event: jsb.MouseEvent): Vec2 {
        const window = this._windowManager.getWindow(event.windowId);
        const windowSize = window.getViewSize();
        const dpr = screenAdapter.devicePixelRatio;
        const x = event.x * dpr;
        const y = windowSize.height - event.y * dpr;
        return new Vec2(x, y);
    }

    private _registerEvent$ (): void {
        jsb.onMouseDown = this._handleMouseDown;
        jsb.onMouseMove = this._handleMouseMove;
        jsb.onMouseUp =  this._handleMouseUp;
        jsb.onMouseWheel = this._handleMouseWheel;
        jsb.onPointerlockChange = (value: boolean): void => {
            this._pointLocked = value;
        };

        // Treat window leave/enter events as mouse events as web.
        jsb.onWindowLeave = this._handleWindowLeave;
        jsb.onWindowEnter = this._handleWindowEnter;
    }

    private _createEventCacheCallback$ (eventType: InputEventType) {
        return (mouseEvent?: jsb.MouseEvent | jsb.MouseWheelEvent): void => {
            this._cache.push(eventType, mouseEvent);
        };
    }

    public dispatchEventsInCache (): void {
        const cache = this._cache;

        cache.forEach((e: MouseEventElement) => {
            switch (e.type) {
            case InputEventType.MOUSE_LEAVE:
                this._dispatchWindowLeave$();
                break;
            case InputEventType.MOUSE_ENTER:
                this._dispatchWindowEnter$();
                break;
            case InputEventType.MOUSE_WHEEL:
                this._dispatchMouseWheel$(e.mouseEvent as jsb.MouseWheelEvent);
                break;
            default:
                this._dispatchEvent$(e.type!, e.mouseEvent);
                break;
            }
        });

        cache.clear();
    }

    private _dispatchEvent$ (eventType: InputEventType, mouseEvent: jsb.MouseEvent): void {
        const location = this._getLocation(mouseEvent);
        let button = mouseEvent.button;
        switch (eventType) {
        case InputEventType.MOUSE_DOWN:
            this._isPressed = true;
            break;
        case InputEventType.MOUSE_UP:
            this._isPressed = false;
            break;
        case InputEventType.MOUSE_MOVE:
            if (!this._isPressed) {
                button = EventMouse.BUTTON_MISSING;
            }
            break;
        default:
            break;
        }

        const eventMouse = new EventMouse(eventType, false, this._preMousePos, mouseEvent.windowId);
        eventMouse.setLocation(location.x, location.y);
        eventMouse.setButton(button);
        const dpr = screenAdapter.devicePixelRatio;
        eventMouse.movementX = typeof mouseEvent.xDelta === 'undefined' ? 0 : mouseEvent.xDelta * dpr;
        eventMouse.movementY = typeof mouseEvent.yDelta === 'undefined' ? 0 : mouseEvent.yDelta * dpr;
        // update previous mouse position.
        this._preMousePos.set(location.x, location.y);
        this._eventTarget.emit(eventType, eventMouse);
    }

    private _dispatchMouseWheel$ (mouseEvent: jsb.MouseWheelEvent): void {
        const eventType = InputEventType.MOUSE_WHEEL;
        const location = this._getLocation(mouseEvent);
        const button = mouseEvent.button;

        const eventMouse = new EventMouse(eventType, false, this._preMousePos, mouseEvent.windowId);
        eventMouse.setLocation(location.x, location.y);
        eventMouse.setButton(button);
        eventMouse.movementX = location.x - this._preMousePos.x;
        eventMouse.movementY = this._preMousePos.y - location.y;

        const matchStandardFactor = 120;
        eventMouse.setScrollData(mouseEvent.wheelDeltaX * matchStandardFactor, mouseEvent.wheelDeltaY * matchStandardFactor);
        // update previous mouse position.
        this._preMousePos.set(location.x, location.y);
        this._eventTarget.emit(eventType, eventMouse);
    }

    public on (eventType: InputEventType, callback: MouseCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    // Should include window id if supporting multiple windows.
    private _dispatchWindowLeave$ (): void {
        const eventType = InputEventType.MOUSE_LEAVE;
        const eventMouse = new EventMouse(eventType, false);
        this._eventTarget.emit(eventType, eventMouse);
    }

    private _dispatchWindowEnter$ (): void {
        const eventType = InputEventType.MOUSE_ENTER;
        const eventMouse = new EventMouse(eventType, false);
        this._eventTarget.emit(eventType, eventMouse);
    }
}
