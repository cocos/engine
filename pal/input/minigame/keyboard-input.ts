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

import { KeyboardCallback } from 'pal/input';
import { KeyboardEventData, minigame } from 'pal/minigame';
import { systemInfo } from 'pal/system-info';
import { KeyCode, EventKeyboard } from '../../../cocos/input/types';
import { EventTarget } from '../../../cocos/core/event';
import { InputEventType } from '../../../cocos/input/types/event-enum';
import { Feature } from '../../system-info/enum-type';

const code2KeyCode: Record<string, KeyCode> = {
    Backspace: KeyCode.BACKSPACE,
    Tab: KeyCode.TAB,
    Enter: KeyCode.ENTER,
    ShiftLeft: KeyCode.SHIFT_LEFT,
    ControlLeft: KeyCode.CTRL_LEFT,
    AltLeft: KeyCode.ALT_LEFT,
    ShiftRight: KeyCode.SHIFT_RIGHT,
    ControlRight: KeyCode.CTRL_RIGHT,
    AltRight: KeyCode.ALT_RIGHT,
    Pause: KeyCode.PAUSE,
    CapsLock: KeyCode.CAPS_LOCK,
    Escape: KeyCode.ESCAPE,
    Space: KeyCode.SPACE,
    PageUp: KeyCode.PAGE_UP,
    PageDown: KeyCode.PAGE_DOWN,
    End: KeyCode.END,
    Home: KeyCode.HOME,
    ArrowLeft: KeyCode.ARROW_LEFT,
    ArrowUp: KeyCode.ARROW_UP,
    ArrowRight: KeyCode.ARROW_RIGHT,
    ArrowDown: KeyCode.ARROW_DOWN,
    Insert: KeyCode.INSERT,
    Delete: KeyCode.DELETE,
    Digit0: KeyCode.DIGIT_0,
    Digit1: KeyCode.DIGIT_1,
    Digit2: KeyCode.DIGIT_2,
    Digit3: KeyCode.DIGIT_3,
    Digit4: KeyCode.DIGIT_4,
    Digit5: KeyCode.DIGIT_5,
    Digit6: KeyCode.DIGIT_6,
    Digit7: KeyCode.DIGIT_7,
    Digit8: KeyCode.DIGIT_8,
    Digit9: KeyCode.DIGIT_9,
    KeyA: KeyCode.KEY_A,
    KeyB: KeyCode.KEY_B,
    KeyC: KeyCode.KEY_C,
    KeyD: KeyCode.KEY_D,
    KeyE: KeyCode.KEY_E,
    KeyF: KeyCode.KEY_F,
    KeyG: KeyCode.KEY_G,
    KeyH: KeyCode.KEY_H,
    KeyI: KeyCode.KEY_I,
    KeyJ: KeyCode.KEY_J,
    KeyK: KeyCode.KEY_K,
    KeyL: KeyCode.KEY_L,
    KeyM: KeyCode.KEY_M,
    KeyN: KeyCode.KEY_N,
    KeyO: KeyCode.KEY_O,
    KeyP: KeyCode.KEY_P,
    KeyQ: KeyCode.KEY_Q,
    KeyR: KeyCode.KEY_R,
    KeyS: KeyCode.KEY_S,
    KeyT: KeyCode.KEY_T,
    KeyU: KeyCode.KEY_U,
    KeyV: KeyCode.KEY_V,
    KeyW: KeyCode.KEY_W,
    KeyX: KeyCode.KEY_X,
    KeyY: KeyCode.KEY_Y,
    KeyZ: KeyCode.KEY_Z,
    Numpad0: KeyCode.NUM_0,
    Numpad1: KeyCode.NUM_1,
    Numpad2: KeyCode.NUM_2,
    Numpad3: KeyCode.NUM_3,
    Numpad4: KeyCode.NUM_4,
    Numpad5: KeyCode.NUM_5,
    Numpad6: KeyCode.NUM_6,
    Numpad7: KeyCode.NUM_7,
    Numpad8: KeyCode.NUM_8,
    Numpad9: KeyCode.NUM_9,
    NumpadMultiply: KeyCode.NUM_MULTIPLY,
    NumpadAdd: KeyCode.NUM_PLUS,
    NumpadSubtract: KeyCode.NUM_SUBTRACT,
    NumpadDecimal: KeyCode.NUM_DECIMAL,
    NumpadDivide: KeyCode.NUM_DIVIDE,
    NumpadEnter: KeyCode.NUM_ENTER,
    F1: KeyCode.F1,
    F2: KeyCode.F2,
    F3: KeyCode.F3,
    F4: KeyCode.F4,
    F5: KeyCode.F5,
    F6: KeyCode.F6,
    F7: KeyCode.F7,
    F8: KeyCode.F8,
    F9: KeyCode.F9,
    F10: KeyCode.F10,
    F11: KeyCode.F11,
    F12: KeyCode.F12,
    NumLock: KeyCode.NUM_LOCK,
    ScrollLock: KeyCode.SCROLL_LOCK,
    Semicolon: KeyCode.SEMICOLON,
    Equal: KeyCode.EQUAL,
    Comma: KeyCode.COMMA,
    Minus: KeyCode.DASH,
    Period: KeyCode.PERIOD,
    Slash: KeyCode.SLASH,
    Backquote: KeyCode.BACK_QUOTE,
    BracketLeft: KeyCode.BRACKET_LEFT,
    Backslash: KeyCode.BACKSLASH,
    BracketRight: KeyCode.BRACKET_RIGHT,
    Quote: KeyCode.QUOTE,
};

function getKeyCode (code: string): KeyCode {
    return code2KeyCode[code] || KeyCode.NONE;
}

export class KeyboardInputSource {
    private _eventTarget: EventTarget = new EventTarget();

    // KeyboardEvent.repeat is not supported on Wechat PC platform.
    private _keyStateMap: Record<number, boolean> = {};

    constructor () {
        if (systemInfo.hasFeature(Feature.EVENT_KEYBOARD)) {
            this._registerEvent();
        }
    }

    private _registerEvent (): void {
        minigame.wx?.onKeyDown?.((res) => {
            const keyCode = getKeyCode(res.code);
            if (!this._keyStateMap[keyCode]) {
                const eventKeyDown = this._getInputEvent(res, InputEventType.KEY_DOWN);
                this._eventTarget.emit(InputEventType.KEY_DOWN, eventKeyDown);
            } else {
                const eventKeyPressing = this._getInputEvent(res, InputEventType.KEY_PRESSING);
                this._eventTarget.emit(InputEventType.KEY_PRESSING, eventKeyPressing);
            }
            this._keyStateMap[keyCode] = true;
        });
        minigame.wx?.onKeyUp?.((res) => {
            const keyCode = getKeyCode(res.code);
            const eventKeyUp = this._getInputEvent(res, InputEventType.KEY_UP);
            this._keyStateMap[keyCode] = false;
            this._eventTarget.emit(InputEventType.KEY_UP, eventKeyUp);
        });
    }

    private _getInputEvent (event: KeyboardEventData, eventType: InputEventType): EventKeyboard {
        const keyCode = getKeyCode(event.code);
        const eventKeyboard = new EventKeyboard(keyCode, eventType);
        return eventKeyboard;
    }

    public on (eventType: InputEventType, callback: KeyboardCallback, target?: any): void {
        this._eventTarget.on(eventType, callback,  target);
    }
}
