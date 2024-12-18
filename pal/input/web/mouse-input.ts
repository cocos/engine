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

import { EDITOR, TEST } from 'internal:constants';
import { MouseCallback } from 'pal/input';
import { systemInfo } from 'pal/system-info';
import { screenAdapter } from 'pal/screen-adapter';
import { EventMouse } from '../../../cocos/input/types';
import { EventTarget } from '../../../cocos/core/event';
import { Rect, Vec2 } from '../../../cocos/core/math';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { Feature } from '../../system-info/enum-type';
import { warn } from '../../../cocos/core/platform/debug';

export class MouseInputSource {
    private _canvas?: HTMLCanvasElement;
    private _eventTarget: EventTarget = new EventTarget();
    private _pointLocked = false;
    private _isPressed = false;
    private _preMousePos: Vec2 = new Vec2();

    private _handleMouseDown!: (event: MouseEvent) => void;
    private _handleMouseMove!: (event: MouseEvent) => void;
    private _handleMouseUp!: (event: MouseEvent) => void;

    constructor () {
        if (systemInfo.hasFeature(Feature.EVENT_MOUSE)) {
            this._canvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
            if (!this._canvas && !TEST && !EDITOR) {
                warn('failed to access canvas');
            }

            this._handleMouseDown = this._createCallback(InputEventType.MOUSE_DOWN);
            this._handleMouseMove = this._createCallback(InputEventType.MOUSE_MOVE);
            this._handleMouseUp = this._createCallback(InputEventType.MOUSE_UP);
            // In Editor, we receive mouse event from manually event dispatching.
            if (!EDITOR) {
                this._registerEvent();
            }
        }
    }

    public dispatchMouseDownEvent (nativeMouseEvent: any): void { this._handleMouseDown(nativeMouseEvent as MouseEvent); }
    public dispatchMouseMoveEvent (nativeMouseEvent: any): void { this._handleMouseMove(nativeMouseEvent as MouseEvent); }
    public dispatchMouseUpEvent (nativeMouseEvent: any): void { this._handleMouseUp(nativeMouseEvent as MouseEvent); }
    public dispatchScrollEvent (nativeMouseEvent: WheelEvent): void { this._handleMouseWheel(nativeMouseEvent); }

    public on (eventType: InputEventType, callback: MouseCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    private _getCanvasRect (): Rect {
        const canvas = this._canvas;
        const box = canvas?.getBoundingClientRect();
        if (box) {
            return new Rect(box.x, box.y, box.width, box.height);
        }
        return new Rect(0, 0, 0, 0);
    }

    private _getLocation (mouseEvent: MouseEvent): Vec2 {
        const canvasRect = this._getCanvasRect();
        const dpr = screenAdapter.devicePixelRatio;
        let x = this._pointLocked ? (this._preMousePos.x / dpr + mouseEvent.movementX) : (mouseEvent.clientX - canvasRect.x);
        let y = this._pointLocked ? (this._preMousePos.y / dpr - mouseEvent.movementY) : (canvasRect.y + canvasRect.height - mouseEvent.clientY);
        x *= dpr;
        y *= dpr;
        return new Vec2(x, y);
    }

    private _registerEvent (): void {
        // register mouse down event
        window.addEventListener('mousedown', () => {
            this._isPressed = true;
        });
        this._canvas?.addEventListener('mousedown', this._handleMouseDown);

        // register mouse move event
        this._canvas?.addEventListener('mousemove', this._handleMouseMove);

        // register mouse up event
        window.addEventListener('mouseup', this._handleMouseUp);
        this._canvas?.addEventListener('mouseup', this._handleMouseUp);

        // register wheel event
        this._canvas?.addEventListener('wheel', this._handleMouseWheel.bind(this));
        this._registerPointerLockEvent();

        this._canvas?.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        this._canvas?.addEventListener('mouseenter', this._handleMouseEnter.bind(this));
    }

    // To be removed in the future.
    private _registerPointerLockEvent (): void {
        const lockChangeAlert = (): void => {
            const canvas = this._canvas;
            // NOTE: mozPointerLockElement is not a standard web interface
            if (document.pointerLockElement === canvas || (document as any).mozPointerLockElement === canvas) {
                this._pointLocked = true;
            } else {
                this._pointLocked = false;
            }
        };
        if ('onpointerlockchange' in document) {
            document.addEventListener('pointerlockchange', lockChangeAlert, false);
        } else if ('onmozpointerlockchange' in document) {
            // NOTE: handle event compatibility
            (document as any).addEventListener('mozpointerlockchange', lockChangeAlert, false);
        }
    }

    private _createCallback (eventType: InputEventType) {
        return (mouseEvent: MouseEvent): void => {
            const location = this._getLocation(mouseEvent);
            const { button, buttons } = mouseEvent;
            let targetButton = button;
            switch (eventType) {
            case InputEventType.MOUSE_DOWN:
                this._canvas?.focus();
                this._isPressed = true;
                break;
            case InputEventType.MOUSE_UP:
                this._isPressed = false;
                break;
            case InputEventType.MOUSE_MOVE:
                // mouseEvent.button doesn't work well in mouse move event
                // now we don't support multiple buttons in one mouse event
                if (1 & buttons) {
                    targetButton = EventMouse.BUTTON_LEFT;
                } else if (2 & buttons) {
                    targetButton = EventMouse.BUTTON_RIGHT;
                } else if (4 & buttons) {
                    targetButton = EventMouse.BUTTON_MIDDLE;
                } else {
                    targetButton = EventMouse.BUTTON_MISSING;
                }
                break;
            default:
                break;
            }

            const eventMouse = new EventMouse(eventType, false, this._preMousePos);
            eventMouse.setLocation(location.x, location.y);
            eventMouse.setButton(targetButton);
            eventMouse.movementX = mouseEvent.movementX;
            eventMouse.movementY = mouseEvent.movementY;

            // update previous mouse position.
            this._preMousePos.set(location.x, location.y);
            mouseEvent.stopPropagation();
            if (mouseEvent.target === this._canvas) {
                mouseEvent.preventDefault();
            }
            this._eventTarget.emit(eventType, eventMouse);
        };
    }

    private _handleMouseWheel (mouseEvent: WheelEvent): void {
        const eventType = InputEventType.MOUSE_WHEEL;
        const location = this._getLocation(mouseEvent);
        const button = mouseEvent.button;

        const eventMouse = new EventMouse(eventType, false, this._preMousePos);
        eventMouse.setLocation(location.x, location.y);
        eventMouse.setButton(button);
        eventMouse.movementX = mouseEvent.movementX;
        eventMouse.movementY = mouseEvent.movementY;

        const wheelSensitivityFactor = 5;
        eventMouse.setScrollData(mouseEvent.deltaX * wheelSensitivityFactor, -mouseEvent.deltaY * wheelSensitivityFactor);
        // update previous mouse position.
        this._preMousePos.set(location.x, location.y);
        mouseEvent.stopPropagation();
        if (mouseEvent.target === this._canvas) {
            mouseEvent.preventDefault();
        }
        this._eventTarget.emit(eventType, eventMouse);
    }

    private _handleMouseLeave (mouseEvent: MouseEvent): void {
        const eventType = InputEventType.MOUSE_LEAVE;
        const eventMouse = new EventMouse(eventType, false);
        this._eventTarget.emit(eventType, eventMouse);
    }

    private _handleMouseEnter (mouseEvent: MouseEvent): void {
        const eventType = InputEventType.MOUSE_ENTER;
        const eventMouse = new EventMouse(eventType, false);
        this._eventTarget.emit(eventType, eventMouse);
    }

    public dispatchEventsInCache (): void {
        // Do nothing
    }
}
