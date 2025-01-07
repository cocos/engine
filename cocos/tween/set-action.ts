/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { ActionInstant } from './actions/action-instant';

export class SetAction extends ActionInstant {
    private _props: any;

    constructor (props?: any) {
        super();
        this._props = {};
        if (props) this.init(props);
    }

    init (props: any): boolean {
        for (const name in props) {
            this._props[name] = props[name];
        }
        return true;
    }

    update (): void {
        const props = this._props;
        const target = this._getWorkerTarget();
        for (const name in props) {
            (target as any)[name] = props[name];
        }
    }

    clone (): SetAction {
        const action = new SetAction();
        action._id = this._id;
        action.init(this._props);
        return action;
    }

    isUnknownDuration (): boolean {
        return false;
    }
}
