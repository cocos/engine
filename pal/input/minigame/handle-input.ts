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
        this._buttonNorth = new InputSourceButton();
        this._buttonNorth.getValue = (): number => 0;
        this._buttonEast = new InputSourceButton();
        this._buttonEast.getValue = (): number => 0;
        this._buttonWest = new InputSourceButton();
        this._buttonWest.getValue = (): number => 0;
        this._buttonSouth = new InputSourceButton();
        this._buttonSouth.getValue = (): number => 0;

        this._buttonTriggerLeft = new InputSourceButton();
        this._buttonTriggerLeft.getValue = (): number => 0;
        this._buttonTriggerRight = new InputSourceButton();
        this._buttonTriggerRight.getValue = (): number => 0;
        this._triggerLeft = new InputSourceButton();
        this._triggerLeft.getValue = (): number => 0;
        this._triggerRight = new InputSourceButton();
        this._triggerRight.getValue = (): number => 0;
        this._gripLeft = new InputSourceButton();
        this._gripLeft.getValue = (): number => 0;
        this._gripRight = new InputSourceButton();
        this._gripRight.getValue = (): number => 0;

        this._buttonLeftStick = new InputSourceButton();
        this._buttonLeftStick.getValue = (): number => 0;
        const leftStickUp = new InputSourceButton();
        leftStickUp.getValue = (): number => 0;
        const leftStickDown = new InputSourceButton();
        leftStickDown.getValue = (): number => 0;
        const leftStickLeft = new InputSourceButton();
        leftStickLeft.getValue = (): number => 0;
        const leftStickRight = new InputSourceButton();
        leftStickRight.getValue = (): number => 0;
        this._leftStick = new InputSourceStick({ up: leftStickUp, down: leftStickDown, left: leftStickLeft, right: leftStickRight });

        this._buttonRightStick = new InputSourceButton();
        this._buttonRightStick.getValue = (): number => 0;
        const rightStickUp = new InputSourceButton();
        rightStickUp.getValue = (): number => 0;
        const rightStickDown = new InputSourceButton();
        rightStickDown.getValue = (): number => 0;
        const rightStickLeft = new InputSourceButton();
        rightStickLeft.getValue = (): number => 0;
        const rightStickRight = new InputSourceButton();
        rightStickRight.getValue = (): number => 0;
        this._rightStick = new InputSourceStick({ up: rightStickUp, down: rightStickDown, left: rightStickLeft, right: rightStickRight });

        this._buttonOptions = new InputSourceButton();
        this._buttonOptions.getValue = (): number => 0;
        this._buttonStart = new InputSourceButton();
        this._buttonStart.getValue = (): number => 0;

        this._handLeftPosition = new InputSourcePosition();
        this._handLeftPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        this._handLeftOrientation = new InputSourceOrientation();
        this._handLeftOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        this._handRightPosition = new InputSourcePosition();
        this._handRightPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        this._handRightOrientation = new InputSourceOrientation();
        this._handRightOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        this._aimLeftPosition = new InputSourcePosition();
        this._aimLeftPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        this._aimLeftOrientation = new InputSourceOrientation();
        this._aimLeftOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        this._aimRightPosition = new InputSourcePosition();
        this._aimRightPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        this._aimRightOrientation = new InputSourceOrientation();
        this._aimRightOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;

        this._touchButtonA = new InputSourceTouch();
        this._touchButtonA.getValue = (): number => 0;
        this._touchButtonB = new InputSourceTouch();
        this._touchButtonB.getValue = (): number => 0;
        this._touchButtonX = new InputSourceTouch();
        this._touchButtonX.getValue = (): number => 0;
        this._touchButtonY = new InputSourceTouch();
        this._touchButtonY.getValue = (): number => 0;
        this._touchButtonTriggerLeft = new InputSourceTouch();
        this._touchButtonTriggerLeft.getValue = (): number => 0;
        this._touchButtonTriggerRight = new InputSourceTouch();
        this._touchButtonTriggerRight.getValue = (): number => 0;
        this._touchButtonThumbStickLeft = new InputSourceTouch();
        this._touchButtonThumbStickLeft.getValue = (): number => 0;
        this._touchButtonThumbStickRight = new InputSourceTouch();
        this._touchButtonThumbStickRight.getValue = (): number => 0;
    }
}
