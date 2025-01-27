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

import { HandleCallback } from 'pal/input';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { EventTarget } from '../../../cocos/core/event';
import { InputSourceButton, InputSourceStick, InputSourcePosition, InputSourceOrientation, InputSourceTouch } from '../input-source';
import { Vec3, Quat } from '../../../cocos/core/math';

export class HandleInputDevice {
    public get buttonNorth (): InputSourceButton { return this._buttonNorth; }
    public get buttonEast (): InputSourceButton { return this._buttonEast; }
    public get buttonWest (): InputSourceButton { return this._buttonWest; }
    public get buttonSouth (): InputSourceButton { return this._buttonSouth; }
    public get buttonTriggerLeft (): InputSourceButton { return this._buttonTriggerLeft; }
    public get buttonTriggerRight (): InputSourceButton { return this._buttonTriggerRight; }
    public get triggerLeft (): InputSourceButton { return this._triggerLeft; }
    public get triggerRight (): InputSourceButton { return this._triggerRight; }
    public get gripLeft (): InputSourceButton { return this._gripLeft; }
    public get gripRight (): InputSourceButton { return this._gripRight; }
    public get leftStick (): InputSourceStick { return this._leftStick; }
    public get rightStick (): InputSourceStick { return this._rightStick; }
    public get buttonLeftStick (): InputSourceButton { return this._buttonLeftStick; }
    public get buttonRightStick (): InputSourceButton { return this._buttonRightStick; }
    public get buttonOptions (): InputSourceButton { return this._buttonOptions; }
    public get buttonStart (): InputSourceButton { return this._buttonStart; }
    public get handLeftPosition (): InputSourcePosition { return this._handLeftPosition; }
    public get handLeftOrientation (): InputSourceOrientation { return this._handLeftOrientation; }
    public get handRightPosition (): InputSourcePosition { return this._handRightPosition; }
    public get handRightOrientation (): InputSourceOrientation { return this._handRightOrientation; }
    public get aimLeftPosition (): InputSourcePosition { return this._aimLeftPosition; }
    public get aimLeftOrientation (): InputSourceOrientation { return this._aimLeftOrientation; }
    public get aimRightPosition (): InputSourcePosition { return this._aimRightPosition; }
    public get aimRightOrientation (): InputSourceOrientation { return this._aimRightOrientation; }
    public get touchButtonA (): InputSourceTouch { return this._touchButtonA; }
    public get touchButtonB (): InputSourceTouch { return this._touchButtonB; }
    public get touchButtonX (): InputSourceTouch { return this._touchButtonX; }
    public get touchButtonY (): InputSourceTouch { return this._touchButtonY; }
    public get touchButtonTriggerLeft (): InputSourceTouch { return this._touchButtonTriggerLeft; }
    public get touchButtonTriggerRight (): InputSourceTouch { return this._touchButtonTriggerRight; }
    public get touchButtonThumbStickLeft (): InputSourceTouch { return this._touchButtonThumbStickLeft; }
    public get touchButtonThumbStickRight (): InputSourceTouch { return this._touchButtonThumbStickRight; }

    private _eventTarget: EventTarget = new EventTarget();

    private declare _buttonNorth: InputSourceButton;
    private declare _buttonEast: InputSourceButton;
    private declare _buttonWest: InputSourceButton;
    private declare _buttonSouth: InputSourceButton;
    private declare _buttonTriggerLeft: InputSourceButton;
    private declare _buttonTriggerRight: InputSourceButton;
    private declare _triggerLeft: InputSourceButton;
    private declare _triggerRight: InputSourceButton;
    private declare _gripLeft: InputSourceButton;
    private declare _gripRight: InputSourceButton;
    private declare _leftStick: InputSourceStick;
    private declare _rightStick: InputSourceStick;
    private declare _buttonLeftStick: InputSourceButton;
    private declare _buttonRightStick: InputSourceButton;
    private declare _buttonOptions: InputSourceButton;
    private declare _buttonStart: InputSourceButton;
    private declare _handLeftPosition: InputSourcePosition;
    private declare _handLeftOrientation: InputSourceOrientation;
    private declare _handRightPosition: InputSourcePosition;
    private declare _handRightOrientation: InputSourceOrientation;
    private declare _aimLeftPosition: InputSourcePosition;
    private declare _aimLeftOrientation: InputSourceOrientation;
    private declare _aimRightPosition: InputSourcePosition;
    private declare _aimRightOrientation: InputSourceOrientation;
    private declare _touchButtonA: InputSourceTouch;
    private declare _touchButtonB: InputSourceTouch;
    private declare _touchButtonX: InputSourceTouch;
    private declare _touchButtonY: InputSourceTouch;
    private declare _touchButtonTriggerLeft: InputSourceTouch;
    private declare _touchButtonTriggerRight: InputSourceTouch;
    private declare _touchButtonThumbStickLeft: InputSourceTouch;
    private declare _touchButtonThumbStickRight: InputSourceTouch;

    constructor () {
        this._initInputSource();
    }

    /**
     * @engineInternal
     */
    public _on (eventType: InputEventType, callback: HandleCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    private _initInputSource (): void {
        const self = this;
        self._buttonNorth = new InputSourceButton();
        self._buttonNorth.getValue = (): number => 0;
        self._buttonEast = new InputSourceButton();
        self._buttonEast.getValue = (): number => 0;
        self._buttonWest = new InputSourceButton();
        self._buttonWest.getValue = (): number => 0;
        self._buttonSouth = new InputSourceButton();
        self._buttonSouth.getValue = (): number => 0;

        self._buttonTriggerLeft = new InputSourceButton();
        self._buttonTriggerLeft.getValue = (): number => 0;
        self._buttonTriggerRight = new InputSourceButton();
        self._buttonTriggerRight.getValue = (): number => 0;
        self._triggerLeft = new InputSourceButton();
        self._triggerLeft.getValue = (): number => 0;
        self._triggerRight = new InputSourceButton();
        self._triggerRight.getValue = (): number => 0;
        self._gripLeft = new InputSourceButton();
        self._gripLeft.getValue = (): number => 0;
        self._gripRight = new InputSourceButton();
        self._gripRight.getValue = (): number => 0;

        self._buttonLeftStick = new InputSourceButton();
        self._buttonLeftStick.getValue = (): number => 0;
        const leftStickUp = new InputSourceButton();
        leftStickUp.getValue = (): number => 0;
        const leftStickDown = new InputSourceButton();
        leftStickDown.getValue = (): number => 0;
        const leftStickLeft = new InputSourceButton();
        leftStickLeft.getValue = (): number => 0;
        const leftStickRight = new InputSourceButton();
        leftStickRight.getValue = (): number => 0;
        self._leftStick = new InputSourceStick({ up: leftStickUp, down: leftStickDown, left: leftStickLeft, right: leftStickRight });

        self._buttonRightStick = new InputSourceButton();
        self._buttonRightStick.getValue = (): number => 0;
        const rightStickUp = new InputSourceButton();
        rightStickUp.getValue = (): number => 0;
        const rightStickDown = new InputSourceButton();
        rightStickDown.getValue = (): number => 0;
        const rightStickLeft = new InputSourceButton();
        rightStickLeft.getValue = (): number => 0;
        const rightStickRight = new InputSourceButton();
        rightStickRight.getValue = (): number => 0;
        self._rightStick = new InputSourceStick({ up: rightStickUp, down: rightStickDown, left: rightStickLeft, right: rightStickRight });

        self._buttonOptions = new InputSourceButton();
        self._buttonOptions.getValue = (): number => 0;
        self._buttonStart = new InputSourceButton();
        self._buttonStart.getValue = (): number => 0;

        self._handLeftPosition = new InputSourcePosition();
        self._handLeftPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        self._handLeftOrientation = new InputSourceOrientation();
        self._handLeftOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        self._handRightPosition = new InputSourcePosition();
        self._handRightPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        self._handRightOrientation = new InputSourceOrientation();
        self._handRightOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        self._aimLeftPosition = new InputSourcePosition();
        self._aimLeftPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        self._aimLeftOrientation = new InputSourceOrientation();
        self._aimLeftOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        self._aimRightPosition = new InputSourcePosition();
        self._aimRightPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        self._aimRightOrientation = new InputSourceOrientation();
        self._aimRightOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        self._touchButtonA = new InputSourceTouch();
        self._touchButtonA.getValue = (): number => 0;
        self._touchButtonB = new InputSourceTouch();
        self._touchButtonB.getValue = (): number => 0;
        self._touchButtonX = new InputSourceTouch();
        self._touchButtonX.getValue = (): number => 0;
        self._touchButtonY = new InputSourceTouch();
        self._touchButtonY.getValue = (): number => 0;
        self._touchButtonTriggerLeft = new InputSourceTouch();
        self._touchButtonTriggerLeft.getValue = (): number => 0;
        self._touchButtonTriggerRight = new InputSourceTouch();
        self._touchButtonTriggerRight.getValue = (): number => 0;
        self._touchButtonThumbStickLeft = new InputSourceTouch();
        self._touchButtonThumbStickLeft.getValue = (): number => 0;
        self._touchButtonThumbStickRight = new InputSourceTouch();
        self._touchButtonThumbStickRight.getValue = (): number => 0;
    }
}
