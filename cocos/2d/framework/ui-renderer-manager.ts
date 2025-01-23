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

import { DEBUG } from 'internal:constants';
import { assert, js } from '../../core';
import { UIMeshRenderer } from '../components';
import { UIRenderer } from './ui-renderer';

/** @mangle */
export class UIRendererManager {
    private _allRenderers: (UIRenderer | UIMeshRenderer)[] = [];
    private _dirtyRenderers: (UIRenderer | UIMeshRenderer)[] = [];
    private _dirtyVersion = 0;
    public addRenderer (uiRenderer: UIRenderer | UIMeshRenderer): void {
        if (uiRenderer._internalId === -1) {
            uiRenderer._internalId = this._allRenderers.length;
            this._allRenderers.push(uiRenderer);
        }
    }

    public removeRenderer (uiRenderer: UIRenderer | UIMeshRenderer): void {
        if (uiRenderer._internalId !== -1) {
            if (DEBUG) {
                assert(this._allRenderers[uiRenderer._internalId] === uiRenderer);
            }
            const id = uiRenderer._internalId;
            this._allRenderers[this._allRenderers.length - 1]._internalId = id;
            js.array.fastRemoveAt(this._allRenderers, id);
            uiRenderer._internalId = -1;
            if (uiRenderer._dirtyVersion === this._dirtyVersion) {
                js.array.fastRemove(this._dirtyRenderers, uiRenderer);
                uiRenderer._dirtyVersion = -1;
            }
        }
    }

    public markDirtyRenderer (uiRenderer: UIRenderer | UIMeshRenderer): void {
        if (uiRenderer._dirtyVersion !== this._dirtyVersion && uiRenderer._internalId !== -1) {
            this._dirtyRenderers.push(uiRenderer);
            uiRenderer._dirtyVersion = this._dirtyVersion;
        }
    }

    public updateAllDirtyRenderers (): void {
        const dirtyRenderers = this._dirtyRenderers;
        for (let i = 0; i < this._dirtyRenderers.length; i++) {
            if (DEBUG) {
                assert(dirtyRenderers[i]._internalId !== -1);
            }
            dirtyRenderers[i].updateRenderer();
        }
        this._dirtyRenderers.length = 0;
        this._dirtyVersion++;
    }
}

export const uiRendererManager = new UIRendererManager();
