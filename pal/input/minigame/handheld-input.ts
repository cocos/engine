/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { HandheldCallback } from 'pal/input';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { EventTarget } from '../../../cocos/core/event/event-target';
import { InputSourcePosition, InputSourceOrientation } from '../input-source';
import { Quat, Vec3 } from '../../../cocos/core/math';

export class HandheldInputDevice {
    public get handheldPosition (): InputSourcePosition { return this._handheldPosition; }
    public get handheldOrientation (): InputSourceOrientation { return this._handheldOrientation; }

    private _eventTarget: EventTarget = new EventTarget();

    private declare _handheldPosition: InputSourcePosition;
    private declare _handheldOrientation: InputSourceOrientation;

    constructor () {
        this._initInputSource();
    }

    /**
     * @engineInternal
     */
    public _on (eventType: InputEventType, callback: HandheldCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    private _initInputSource (): void {
        this._handheldPosition = new InputSourcePosition();
        this._handheldPosition.getValue = (): Readonly<Vec3> => Vec3.ZERO;
        this._handheldOrientation = new InputSourceOrientation();
        this._handheldOrientation.getValue = (): Readonly<Quat> => Quat.IDENTITY;
    }
}
