/*
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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

import { FiniteTimeAction } from './action';
import type { TweenUpdateUntilCallback } from '../tween';
import { cclegacy } from '../../core';

export class ActionUnknownDuration<T extends object, Args extends any[]> extends FiniteTimeAction {
    private _finished = false;
    private declare _cb: TweenUpdateUntilCallback<T, Args>;
    private declare _args: Args;

    constructor (cb: TweenUpdateUntilCallback<T, Args>, args: Args) {
        super();
        this._cb = cb;
        this._args = args;
    }

    override clone (): ActionUnknownDuration<T, Args> {
        return new ActionUnknownDuration(this._cb, this._args);
    }

    override reverse (): ActionUnknownDuration<T, Args> {
        return this.clone();
    }

    override step (dt: number): void {
        throw new Error('should never go here');
    }

    override update (t: number): void {
        const dt: number = cclegacy.game.deltaTime;
        this._finished = this._cb(this.target as T, dt, ...this._args);
    }

    override isDone (): boolean {
        return this._finished;
    }

    override isUnknownDuration (): boolean {
        return !this.isDone();
    }

    override toString (): string {
        return `<ActionUnknownDuration>`;
    }
}
