/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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
import { fastRemoveAt } from '../utils/array';

export abstract class ScalableContainer {
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _poolHandle = -1;
    constructor () {
        scalableContainerManager.addContainer(this);
    }

    abstract tryShrink (): void;

    destroy (): void {
        scalableContainerManager.removeContainer(this);
    }
}

/**
 * @en ScalableContainerManager is a sequence container that stores ScalableContainers.
 * It will shrink all managed ScalableContainer in a fixed interval.
 */
class ScalableContainerManager {
    private _pools: ScalableContainer[] = [];
    private _lastShrinkPassed = 0;
    /**
     * @en Shrink interval in seconds.
     */
    public shrinkTimeSpan = 5;

    /**
     * @en Add a ScalableContainer. Will add the same ScalableContainer instance once.
     * @param pool @en The ScalableContainer to add.
     */
    addContainer (pool: ScalableContainer): void {
        if (pool._poolHandle !== -1) return;
        pool._poolHandle = this._pools.length;
        this._pools.push(pool);
    }

    /**
     * @en Remove a ScalableContainer.
     * @param pool @en The ScalableContainer to remove.
     */
    removeContainer (pool: ScalableContainer): void {
        if (pool._poolHandle === -1) return;
        this._pools[this._pools.length - 1]._poolHandle = pool._poolHandle;
        fastRemoveAt(this._pools, pool._poolHandle);
        pool._poolHandle = -1;
    }

    /**
     * @en Try to shrink all managed ScalableContainers.
     */
    tryShrink (): void {
        for (let i = 0; i < this._pools.length; i++) {
            this._pools[i].tryShrink();
        }
    }

    /**
     * @en An update function invoked every frame.
     * @param dt @en Delta time of frame interval in secondes.
     */
    update (dt: number): void {
        this._lastShrinkPassed += dt;
        if (this._lastShrinkPassed > this.shrinkTimeSpan) {
            this.tryShrink();
            this._lastShrinkPassed -= this.shrinkTimeSpan;
        }
    }
}

/**
 * @en A global ScalableContainerManager instance.
 */
export const scalableContainerManager = new ScalableContainerManager();
