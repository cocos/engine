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

import { minigame } from 'pal/minigame';
import { assertIsTrue } from '../../cocos/core/data/utils/asserts';
import { checkPalIntegrity, withImpl } from '../integrity-check';

export class Pacer {
    private _rafHandle = 0;
    private _onTick: (() => void) | null = null;
    private declare _updateCallback: () => void;
    private _targetFrameRate = 60;
    private _isPlaying = false;
    constructor () {
        this._updateCallback = (): void => {
            if (this._isPlaying) {
                this._rafHandle = requestAnimationFrame(this._updateCallback);
            }
            if (this._onTick) {
                this._onTick();
            }
        };
    }

    get targetFrameRate (): number {
        return this._targetFrameRate;
    }

    set targetFrameRate (val: number) {
        if (this._targetFrameRate !== val) {
            assertIsTrue(val > 0);
            this._targetFrameRate = val;
            minigame.setPreferredFramesPerSecond(this._targetFrameRate);
            if (this._isPlaying) {
                this.stop();
                this.start();
            }
        }
    }

    set onTick (val: (() => void) | null) {
        this._onTick = val;
    }

    get onTick (): (() => void) | null {
        return this._onTick;
    }

    start (): void {
        if (this._isPlaying) return;
        this._rafHandle = requestAnimationFrame(this._updateCallback);
        this._isPlaying = true;
    }

    stop (): void {
        if (!this._isPlaying) return;
        cancelAnimationFrame(this._rafHandle);
        this._rafHandle = 0;
        this._isPlaying = false;
    }
}

checkPalIntegrity<typeof import('pal/pacer')>(withImpl<typeof import('./pacer-minigame')>());
