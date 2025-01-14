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

import { ccclass, type, serializable, editable, range } from 'cc.decorator';
import { repeat } from '../core/math';
import CurveRange from './animator/curve-range';
import type { ParticleSystem } from './particle-system';

/**
 * @en
 * A burst is a particle emission event, where a number of particles are all emitted at the same time
 * @zh
 * Burst 是粒子的一种发射事件，触发时很多粒子将会同时喷出
 */
@ccclass('cc.Burst')
export default class Burst {
    @serializable
    private _time = 0;

    /**
     *  @en The time from particle system start until this burst triggered.
     *  @zh 粒子系统开始运行到触发此次 Brust 的时间。
     */
    @editable
    get time (): number {
        return this._time;
    }

    set time (val) {
        this._time = val;
        this._curTime = val;
    }

    @serializable
    private _repeatCount = 1;

    /**
     * @en Burst trigger count.
     * @zh Burst 的触发次数。
     */
    @editable
    get repeatCount (): number {
        return this._repeatCount;
    }

    set repeatCount (val) {
        this._repeatCount = val;
        this._remainingCount = val;
    }

    /**
     * @en Trigger interval count.
     * @zh 每次触发的间隔时间。
     */
    @serializable
    @editable
    public repeatInterval = 1;

    /**
     * @en Burst particle count.
     * @zh 发射的粒子的数量。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY, 1])
    public count: CurveRange = new CurveRange();

    private _remainingCount = 0;
    private _curTime = 0.0;

    constructor () {
    }

    /**
     * @en Update burst trigger
     * @zh 更新触发事件
     * @param psys @en Particle system to burst. @zh 要触发的粒子系统。
     * @param dt @en Update interval time. @zh 粒子系统更新的间隔时间。
     * @internal
     */
    public update (psys: ParticleSystem, dt: number): void {
        if (this._remainingCount === 0) {
            this._remainingCount = this._repeatCount;
            this._curTime = this._time;
        }
        if (this._remainingCount > 0) {
            let preFrameTime = repeat(psys.time - psys.startDelay.evaluate(0, 1), psys.duration) - dt;
            preFrameTime = (preFrameTime > 0.0) ? preFrameTime : 0.0;
            const curFrameTime = repeat(psys.time - psys.startDelay.evaluate(0, 1), psys.duration);
            if (this._curTime >= preFrameTime && this._curTime < curFrameTime) {
                psys.emit(this.count.evaluate(this._curTime / psys.duration, 1), dt - (curFrameTime - this._curTime));
                this._curTime += this.repeatInterval;
                --this._remainingCount;
            }
        }
    }

    /**
     * @en Reset remaining burst count and burst time to zero.
     * @zh 重置触发时间和留存的触发次数为零。
     */
    public reset (): void {
        this._remainingCount = 0;
        this._curTime = 0.0;
    }

    /**
     * @en Get the max particle count this burst trigger.
     * @zh 获取最大的触发粒子数量。
     * @param psys @en Particle system to burst. @zh 要触发的粒子系统。
     * @returns @en burst max particle count. @zh 一次最多触发的粒子个数。
     */
    public getMaxCount (psys: ParticleSystem): number {
        return this.count.getMax() * Math.min(Math.ceil(psys.duration / this.repeatInterval), this.repeatCount);
    }
}
