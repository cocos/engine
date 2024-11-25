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

import { Vec2 } from '../../cocos/core/math/vec2';
import { logID } from '../../cocos/core/platform/debug';
import { macro } from '../../cocos/core/platform/macro';
import { Touch } from '../../cocos/input/types';

const tempVec2 = new Vec2();

class TouchManager {
    /**
     * A map from touch ID to touch object.
     */
    private _touchMap: Map<number, Touch> = new Map();
    private readonly _maxTouches = 8;

    constructor () {
    }

    /**
     * Create the touch object at the touch start event callback.
     * we have some policy to create the touch object:
     * - If the number of touches doesn't exceed the max count, we create a touch object.
     * - If the number of touches exceeds the max count, we discard the timeout touch to create a new one.
     * - If the number of touches exceeds the max count and there is no timeout touch, we can't create any touch object.
     * @param touchID The touch identifier
     * @param x The x-axis coordinate of the current touch point.
     * @param y The y-axis coordinate of the current touch point.
     * @return The Touch instance or undefined.
     */
    private _createTouch (touchID: number, x: number, y: number): Touch | undefined {
        if (this._touchMap.has(touchID)) {
            logID(2301);
            return undefined;
        }
        const checkResult = this._checkTouchMapSizeMoreThanMax(touchID);
        if (checkResult) {
            logID(2300);
            return undefined;
        }
        const touch = new Touch(x, y, touchID);
        this._touchMap.set(touchID, touch);
        this._updateTouch(touch, x, y);
        return touch;
    }

    /**
     * Release the touch object at the touch end or touch cancel event callback.
     * @param touchID
     * @returns
     */
    public releaseTouch (touchID: number): void {
        if (!this._touchMap.has(touchID)) {
            return;
        }
        this._touchMap.delete(touchID);
    }

    /**
     * Get touch object by touch ID.
     * @param touchID
     * @returns
     */
    public getTouch (touchID: number): Touch | undefined {
        return this._touchMap.get(touchID);
    }

    /**
     * Get or create touch object by touch ID.
     * @param touchID
     * @returns
     */
    public getOrCreateTouch (touchID: number, x: number, y: number): Touch | undefined {
        let touch = this.getTouch(touchID);
        if (!touch) {
            touch = this._createTouch(touchID, x, y);
        } else {
            this._updateTouch(touch, x, y);
        }
        return touch;
    }

    /**
     * Get all the current touches objects.
     * @returns
     */
    public getAllTouches (): Touch[] {
        const touches: Touch[] = [];
        this._touchMap.forEach((touch) => {
            if (touch) {
                touches.push(touch);
            }
        });
        return touches;
    }

    /**
     * Get the number of touches.
     */
    public getTouchCount (): number {
        return this._touchMap.size;
    }

    /**
     * Update the location and previous location of current touch ID.
     * @param touchID
     * @param x The current location X
     * @param y The current location Y
     */
    private _updateTouch (touch: Touch, x: number, y: number): void {
        touch.getLocation(tempVec2);
        touch.setPrevPoint(tempVec2);
        touch.setPoint(x, y);
    }

    private _checkTouchMapSizeMoreThanMax (touchID: number): boolean {
        if (this._touchMap.has(touchID)) {
            return false;
        }
        const maxSize = macro.ENABLE_MULTI_TOUCH ? this._maxTouches : 1;
        if (this._touchMap.size < maxSize) {
            return false;
        }
        // Handle when exceed the max number of touches
        const now = performance.now();
        this._touchMap.forEach((touch) => {
            if (now - touch.lastModified > macro.TOUCH_TIMEOUT) {
                logID(2302, touch.getID());
                // TODO: need to handle touch cancel event when exceed the max number of touches ?
                this.releaseTouch(touch.getID());
            }
        });
        return maxSize >= this._touchMap.size;
    }
}

export const touchManager = new TouchManager();
