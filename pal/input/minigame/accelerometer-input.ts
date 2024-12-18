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

import { AccelerometerCallback } from 'pal/input';
import { minigame, AccelerometerIntervalMode } from 'pal/minigame';
import { Acceleration, EventAcceleration } from '../../../cocos/input/types';
import { EventTarget } from '../../../cocos/core/event';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { errorID } from '../../../cocos/core/platform/debug';

export class AccelerometerInputSource {
    private _isStarted = false;
    private _accelMode: AccelerometerIntervalMode = 'normal';
    private _eventTarget: EventTarget = new  EventTarget();
    private declare _didAccelerateFunc: (event: AccelerometerData) => void;

    constructor () {
        this._didAccelerateFunc  = this._didAccelerate.bind(this);
    }

    private _registerEvent (): void {
        minigame.onAccelerometerChange(this._didAccelerateFunc);
    }

    private _unregisterEvent (): void {
        minigame.offAccelerometerChange(this._didAccelerateFunc);
    }

    private _didAccelerate (event: AccelerometerData): void {
        const timestamp = performance.now();
        const acceleration = new Acceleration(event.x, event.y, event.z, timestamp);
        const eventAcceleration = new EventAcceleration(acceleration);
        this._eventTarget.emit(InputEventType.DEVICEMOTION, eventAcceleration);
    }

    public start (): void {
        this._registerEvent();
        minigame.startAccelerometer({
            interval: this._accelMode,
            success: () => {
                this._isStarted = true;
            },
        });
    }
    public stop (): void {
        minigame.stopAccelerometer({
            success: () => {
                this._isStarted = false;
            },
            fail () {
                errorID(16305);
            },
        });
        this._unregisterEvent();
    }
    public setInterval (intervalInMileseconds: number): void {
        // reference: https://developers.weixin.qq.com/minigame/dev/api/device/accelerometer/wx.startAccelerometer.html
        if (intervalInMileseconds >= 200) {
            this._accelMode = 'normal';
        } else if (intervalInMileseconds >= 60) {
            this._accelMode = 'ui';
        } else {
            this._accelMode = 'game';
        }
        if (this._isStarted) {
            // restart accelerometer
            this.stop();
            this.start();
        }
    }
    public on (eventType: InputEventType, callback: AccelerometerCallback, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }
}
