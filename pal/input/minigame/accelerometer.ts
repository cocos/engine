import { AccelerometerCallback, AccelerometerInputEvent } from 'pal/input';
import { minigame, AccelerometerIntevcalMode } from 'pal/minigame';
import { clamp01, SystemEventType } from '../../../cocos/core';
import { EventTarget } from '../../../cocos/core/event/event-target';

export class AccelerometerInputSource {
    public support: boolean;

    private _isStarted = false;
    private _accelMode: AccelerometerIntevcalMode = 'normal';
    private _eventTarget: EventTarget = new  EventTarget();
    private _didAccelerateFunc: (event: AccelerometerData) => void;

    constructor () {
        this.support = true;
        this._didAccelerateFunc  = this._didAccelerate.bind(this);
    }

    private _registerEvent () {
        minigame.onAccelerometerChange(this._didAccelerateFunc);
    }

    private _unregisterEvent () {
        minigame.offAccelerometerChange(this._didAccelerateFunc);
    }

    private _didAccelerate (event: AccelerometerData) {
        const accelerometer: AccelerometerInputEvent = {
            type: SystemEventType.DEVICEMOTION,
            x: event.x,
            y: event.y,
            z: event.z,
            timestamp: performance.now(),
        };
        this._eventTarget.emit(SystemEventType.DEVICEMOTION, accelerometer);
    }

    public start () {
        this._registerEvent();
        minigame.startAccelerometer({
            interval: this._accelMode,
            success: () => {
                this._isStarted = true;
            },
        });
    }
    public stop () {
        minigame.stopAccelerometer({
            success: () => {
                this._isStarted = false;
            },
            fail () {
                console.error('failed to stop accelerometer');
            },
        });
        this._unregisterEvent();
    }
    public setInterval (interval: number) {
        interval = clamp01(interval);
        if (interval >= 0.2) {
            this._accelMode = 'normal';
        } else if (interval >= 0.06) {
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
    public onChange (cb: AccelerometerCallback) {
        this._eventTarget.on(SystemEventType.DEVICEMOTION, cb);
    }
}
