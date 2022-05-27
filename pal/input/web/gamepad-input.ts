import { GamepadCallback } from 'pal/input';
import { systemInfo } from 'pal/system-info';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { EventTarget } from '../../../cocos/core/event/event-target';
import legacyCC from '../../../predefine';
import { Feature } from '../../system-info/enum-type';
import { InputSourceButton, InputSourceDpad, InputSourceStick } from '../input-source';
import { fastRemoveAt } from '../../../cocos/core/utils/array';
import { EventGamepad } from '../../../cocos/input/types';

//#region button index alias
const BUTTON_SOUTH = 0;
const BUTTON_EAST = 1;
const BUTTON_WEST = 2;
const BUTTON_NORTH = 3;
const BUTTON_L1 = 4;
const BUTTON_R1 = 5;
const BUTTON_L2 = 6;
const BUTTON_R2 = 7;
const BUTTON_SHARE = 8;
const BUTTON_OPTIONS = 9;
const BUTTON_L3 = 10;
const BUTTON_R3 = 11;
const BUTTON_DPAD_UP = 12;
const BUTTON_DPAD_DOWN = 13;
const BUTTON_DPAD_LEFT = 14;
const BUTTON_DPAD_RIGHT = 15;
const BUTTON_HOME = 16;
const BUTTON_TOUCH_PAD = 17;
const AXIS_LEFT_STICK_X = 0;
const AXIS_LEFT_STICK_Y = 1;
const AXIS_RIGHT_STICK_X = 2;
const AXIS_RIGHT_STICK_Y = 3;
//#endregion  button index alias

const EPSILON = 0.01;
type WebGamepad = Gamepad;

export class GamepadInputDevice {
    public static all: GamepadInputDevice[] = [];

    public buttonNorth!: InputSourceButton;
    public buttonEast!: InputSourceButton;
    public buttonWest!: InputSourceButton;
    public buttonSouth!: InputSourceButton;

    public buttonL1!: InputSourceButton;
    public buttonL2!: InputSourceButton;
    public buttonL3!: InputSourceButton;
    public buttonR1!: InputSourceButton;
    public buttonR2!: InputSourceButton;
    public buttonR3!: InputSourceButton;

    public buttonTouchPad!: InputSourceButton;
    public buttonHome!: InputSourceButton;
    public buttonShare!: InputSourceButton;
    public buttonOptions!: InputSourceButton;

    public dpad!: InputSourceDpad;
    public leftStick!: InputSourceStick;
    public rightStick!: InputSourceStick;

    public get deviceId () {
        return this._deviceId;
    }
    public get connected () {
        return this._connected;
    }

    private static _eventTarget: EventTarget = new EventTarget();
    private static _cachedWebGamepads: (WebGamepad | null)[] = [];
    private static _intervalId = -1;

    private _deviceId = -1;
    private _connected = false;

    constructor (deviceId: number) {
        this._deviceId = deviceId;
        this._initInputSource();
    }

    /**
     * @engineInternal
     */
    public static _init () {
        if (!systemInfo.hasFeature(Feature.EVENT_GAMEPAD)) {
            return;
        }
        GamepadInputDevice._registerEvent();
    }

    /**
     * @engineInternal
     */
    public static _on (eventType: InputEventType, cb: GamepadCallback, target?: any) {
        GamepadInputDevice._eventTarget.on(eventType, cb, target);
    }

    private static _removeInputDevice (id: number) {
        const removeIndex = GamepadInputDevice.all.findIndex((device) => device.deviceId === id);
        if (removeIndex === -1) {
            return;
        }
        fastRemoveAt(GamepadInputDevice.all, removeIndex);
    }
    private static _getOrCreateInputDevice (id: number, connected: boolean): GamepadInputDevice {
        let device =  GamepadInputDevice.all.find((device) => device.deviceId === id);
        if (!device) {
            device = new GamepadInputDevice(id);
            GamepadInputDevice.all.push(device);
        }
        device._connected = connected;
        return device;
    }

    private static _ensureDirectorDefined () {
        return new Promise<void>((resolve) => {
            GamepadInputDevice._intervalId = setInterval(() => {
                if (legacyCC.director && legacyCC.Director) {
                    clearInterval(GamepadInputDevice._intervalId);
                    GamepadInputDevice._intervalId = -1;
                    resolve();
                }
            }, 50);
        });
    }

    private static _registerEvent () {
        GamepadInputDevice._ensureDirectorDefined().then(() => {
            legacyCC.director.on(legacyCC.Director.EVENT_BEGIN_FRAME, GamepadInputDevice._scanGamepads);
        }).catch((e) => {});
        window.addEventListener('gamepadconnected', (e) => {
            GamepadInputDevice._cachedWebGamepads[e.gamepad.index] = e.gamepad;
            const device = GamepadInputDevice._getOrCreateInputDevice(e.gamepad.index, true);
            GamepadInputDevice._eventTarget.emit(InputEventType.GAMEPAD_CHANGE, new EventGamepad(InputEventType.GAMEPAD_CHANGE, device));
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            GamepadInputDevice._cachedWebGamepads[e.gamepad.index] = null;
            const device = GamepadInputDevice._getOrCreateInputDevice(e.gamepad.index, false);
            GamepadInputDevice._removeInputDevice(e.gamepad.index);
            GamepadInputDevice._eventTarget.emit(InputEventType.GAMEPAD_CHANGE, new EventGamepad(InputEventType.GAMEPAD_CHANGE, device));
        });
    }

    private static _scanGamepads () {
        const webGamepads = GamepadInputDevice._getWebGamePads();
        if (!webGamepads) {
            return;
        }
        const devices: GamepadInputDevice[] = [];
        for (let i = 0; i < webGamepads.length; ++i) {
            const webGamepad = webGamepads?.[i];
            if (!webGamepad) {
                continue;
            }
            const cachedWebGamepad = GamepadInputDevice._cachedWebGamepads[webGamepad.index];
            // TODO: what if cachedWebGamepad is null
            if (cachedWebGamepad) {
                let device: GamepadInputDevice | undefined;
                const cachedButtons = cachedWebGamepad.buttons;
                for (let j = 0; j < cachedButtons.length; ++j) {
                    const cachedButton = cachedButtons[j];
                    const button = webGamepad.buttons[j];
                    if (Math.abs(cachedButton.value - button.value) > EPSILON) {
                        device = GamepadInputDevice._getOrCreateInputDevice(webGamepad.index, true);
                        break;
                    }
                }
                if (device) {
                    devices.push(device);
                    continue;
                }

                const cachedAxes = cachedWebGamepad.axes;
                for (let j = 0; j < cachedAxes.length; ++j) {
                    const cachedAxisValue = cachedAxes[j];
                    const axisValue = webGamepad.axes[j];
                    if (Math.abs(cachedAxisValue - axisValue) > EPSILON) {
                        device = GamepadInputDevice._getOrCreateInputDevice(webGamepad.index, true);
                        break;
                    }
                }
                if (device) {
                    devices.push(device);
                    continue;
                }
            }
        }
        // update cache
        GamepadInputDevice._cachedWebGamepads = webGamepads;
        // emit event
        for (let i = 0; i < devices.length; ++i) {
            const device = devices[i];
            GamepadInputDevice._eventTarget.emit(InputEventType.GAMEPAD_INPUT, new EventGamepad(InputEventType.GAMEPAD_INPUT, device));
        }
    }

    private static _getWebGamePads (): (WebGamepad | null)[] {
        if (typeof navigator.getGamepads === 'function') {
            return navigator.getGamepads();
            // @ts-expect-error Property 'webkitGetGamepads' does not exist on type 'Navigator'
        } else if (typeof navigator.webkitGetGamepads === 'function') {
            // @ts-expect-error Property 'webkitGetGamepads' does not exist on type 'Navigator'
            return navigator.webkitGetGamepads() as (Gamepad | null)[];
        }
        return [];
    }

    private static _getWebGamepad (deviceId: number): WebGamepad | undefined {
        const webGamepads = GamepadInputDevice._getWebGamePads();
        for (let i = 0; i < webGamepads.length; ++i) {
            const webGamepad = webGamepads[i];
            if (webGamepad && webGamepad.index === deviceId) {
                return webGamepad;
            }
        }
        return undefined;
    }

    private _initInputSource () {
        this.buttonNorth = new InputSourceButton();
        this.buttonNorth.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_NORTH].value; }
            return 0;
        };
        this.buttonEast = new InputSourceButton();
        this.buttonEast.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_EAST].value; }
            return 0;
        };
        this.buttonWest = new InputSourceButton();
        this.buttonWest.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_WEST].value; }
            return 0;
        };
        this.buttonSouth = new InputSourceButton();
        this.buttonSouth.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_SOUTH].value; }
            return 0;
        };

        this.buttonL1 = new InputSourceButton();
        this.buttonL1.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_L1].value; }
            return 0;
        };
        this.buttonL2 = new InputSourceButton();
        this.buttonL2.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_L2].value; }
            return 0;
        };
        this.buttonL3 = new InputSourceButton();
        this.buttonL3.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_L3].value; }
            return 0;
        };
        this.buttonR1 = new InputSourceButton();
        this.buttonR1.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_R1].value; }
            return 0;
        };
        this.buttonR2 = new InputSourceButton();
        this.buttonR2.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_R2].value; }
            return 0;
        };
        this.buttonR3 = new InputSourceButton();
        this.buttonR3.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_R3].value; }
            return 0;
        };

        this.buttonTouchPad = new InputSourceButton();
        this.buttonTouchPad.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_TOUCH_PAD].value; }
            return 0;
        };
        this.buttonHome = new InputSourceButton();
        this.buttonHome.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_HOME].value; }
            return 0;
        };
        this.buttonShare = new InputSourceButton();
        this.buttonShare.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_SHARE].value; }
            return 0;
        };
        this.buttonOptions = new InputSourceButton();
        this.buttonOptions.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_OPTIONS].value; }
            return 0;
        };

        const dpadUp = new InputSourceButton();
        dpadUp.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_DPAD_UP].value; }
            return 0;
        };
        const dpadDown = new InputSourceButton();
        dpadDown.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_DPAD_DOWN].value; }
            return 0;
        };
        const dpadLeft = new InputSourceButton();
        dpadLeft.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_DPAD_LEFT].value; }
            return 0;
        };
        const dpadRight = new InputSourceButton();
        dpadRight.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) { return webGamepad.buttons[BUTTON_DPAD_RIGHT].value; }
            return 0;
        };
        this.dpad = new InputSourceDpad({ up: dpadUp, down: dpadDown, left: dpadLeft, right: dpadRight });

        const leftStickUp = new InputSourceButton();
        leftStickUp.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_LEFT_STICK_Y] * -1;
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const leftStickDown = new InputSourceButton();
        leftStickDown.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_LEFT_STICK_Y];
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const leftStickLeft = new InputSourceButton();
        leftStickLeft.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_LEFT_STICK_X] * -1;
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const leftStickRight = new InputSourceButton();
        leftStickRight.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_LEFT_STICK_X];
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        this.leftStick = new InputSourceStick({ up: leftStickUp, down: leftStickDown, left: leftStickLeft, right: leftStickRight });

        const rightStickUp = new InputSourceButton();
        rightStickUp.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_RIGHT_STICK_Y] * -1;
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const rightStickDown = new InputSourceButton();
        rightStickDown.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_RIGHT_STICK_Y];
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const rightStickLeft = new InputSourceButton();
        rightStickLeft.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_RIGHT_STICK_X] * -1;
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        const rightStickRight = new InputSourceButton();
        rightStickRight.getValue = () => {
            const webGamepad = GamepadInputDevice._getWebGamepad(this.deviceId);
            if (webGamepad) {
                const value = webGamepad.axes[AXIS_RIGHT_STICK_X];
                return value < 0 ? 0 : value;
            }
            return 0;
        };
        this.rightStick = new InputSourceStick({ up: rightStickUp, down: rightStickDown, left: rightStickLeft, right: rightStickRight });
    }
}
