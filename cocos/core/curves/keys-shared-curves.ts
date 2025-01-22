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
import { ccclass, serializable } from 'cc.decorator';
import { binarySearchEpsilon } from '../algorithm/binary-search';
import { assertIsTrue } from '../data/utils/asserts';
import { approx, IQuatLike, lerp, Quat } from '../math';
import { ExtrapolationMode, RealCurve } from './curve';
import { QuatCurve, QuatInterpolationMode } from './quat-curve';
import { RealInterpolationMode } from './real-curve-param';

const DEFAULT_EPSILON = 1e-5;

const DefaultFloatArray = Float32Array;

type DefaultFloatArray = InstanceType<typeof DefaultFloatArray>;

/**
 * Considering most of model animations are baked and most of its curves share same times,
 * we do not have to do time searching for many times.
 */
@ccclass('cc.KeySharedCurves')
class KeysSharedCurves {
    /**
     * Only for internal(serialization) usage.
     */
    constructor ();

    constructor (times: number[]);

    constructor (times?: number[]) {
        if (!times) {
            this._times = new DefaultFloatArray();
            return;
        }

        const nKeyframes = times.length;

        this._keyframesCount = nKeyframes;
        this._times = DefaultFloatArray.from(times);

        if (nKeyframes > 1) {
            const EPSILON = 1e-6;
            let lastDiff = 0.0;
            let mayBeOptimized = false;
            for (let iFrame = 1; iFrame < nKeyframes; iFrame++) {
                const curDiff = times[iFrame] - times[iFrame - 1];
                if (iFrame === 1) {
                    lastDiff = curDiff;
                } else if (Math.abs(curDiff - lastDiff) > EPSILON) {
                    mayBeOptimized = false;
                    break;
                }
            }
            if (mayBeOptimized) {
                this._optimized = true;
                this._times = new DefaultFloatArray([this._times[0], this._times[1]]);
            }
        }
    }

    get keyframesCount () {
        return this._keyframesCount;
    }

    protected matchTimes (times: readonly number[], EPSILON = DEFAULT_EPSILON) {
        if (this._optimized) {
            const firstTime = this._times[0];
            const diff = this._times[1] - firstTime;
            return times.every(
                (t, iKeyframe) => approx(t, firstTime + diff * iKeyframe, EPSILON),
            );
        } else {
            return times.every(
                (t, iKeyframe) => approx(t, this._times[iKeyframe], EPSILON),
            );
        }
    }

    protected getFirstTime () {
        return this._times[0];
    }

    protected getLastTime () {
        if (!this._optimized) {
            return this._times[this._times.length - 1];
        } else {
            const diff = this._times[1] - this._times[0];
            return this._times[0] + diff * this._keyframesCount;
        }
    }

    protected calculateLocation (time: number, out: TimeLocation) {
        const { _times: times, _optimized: optimized, keyframesCount: nKeyframes } = this;
        if (optimized) {
            const firstTime = times[0];
            const diff = times[1] - firstTime;
            const div = (time - firstTime) / diff;
            const previous = Math.floor(div);
            out.previous = previous;
            out.ratio = div - previous;
        } else {
            const index = binarySearchEpsilon(times, time);
            if (index >= 0) {
                // Exactly matched
                out.previous = index;
                out.ratio = 0.0;
            } else {
                const iNext = ~index;
                assertIsTrue(iNext >= 1 && iNext < nKeyframes);
                const iPrev = iNext - 1;
                const prevTime = times[iPrev];
                out.ratio = (time - prevTime) / (times[iNext] - prevTime);
                out.previous = iPrev;
            }
        }
        return out;
    }

    @serializable
    private _times: DefaultFloatArray;

    @serializable
    private _optimized = false;

    @serializable
    private _keyframesCount = 0;
}

interface TimeLocation {
    previous: number;
    ratio: number;
}

const globalLocation: TimeLocation = {
    previous: 0,
    ratio: 0,
};

@ccclass('cc.KeySharedRealCurves')
export class KeySharedRealCurves extends KeysSharedCurves {
    public static allowedForCurve (curve: RealCurve) {
        return curve.postExtrapolation === ExtrapolationMode.CLAMP
            && curve.preExtrapolation === ExtrapolationMode.CLAMP
            && Array.from(curve.values()).every((value) => value.interpolationMode === RealInterpolationMode.LINEAR);
    }

    get curveCount () {
        return this._curves.length;
    }

    public matchCurve (curve: RealCurve, EPSILON = DEFAULT_EPSILON) {
        if (curve.keyFramesCount !== this.keyframesCount) {
            return false;
        }
        const times = Array.from(curve.times());
        return super.matchTimes(times, EPSILON);
    }

    public addCurve (curve: RealCurve) {
        assertIsTrue(curve.keyFramesCount === this.keyframesCount);
        this._curves.push({
            values: DefaultFloatArray.from(Array.from(curve.values()).map(({ value }) => value)),
        });
    }

    public evaluate (time: number, values: number[]) {
        const {
            _curves: curves,
            keyframesCount: nKeyframes,
        } = this;

        const nCurves = curves.length;
        assertIsTrue(values.length === nCurves);

        if (nKeyframes === 0) {
            return;
        }

        const firstTime = super.getFirstTime();
        if (time <= firstTime) {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                values[iCurve] = this._curves[iCurve].values[0];
            }
            return;
        }

        const lastTime = super.getLastTime();
        if (time >= lastTime) {
            const iLastFrame = nKeyframes - 1;
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                values[iCurve] = this._curves[iCurve].values[iLastFrame];
            }
            return;
        }

        const { previous, ratio } = super.calculateLocation(time, globalLocation);
        if (ratio !== 0.0) {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                const { values: curveValues } = this._curves[iCurve];
                values[iCurve] = lerp(curveValues[previous], curveValues[previous + 1], ratio);
            }
        } else {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                const { values: curveValues } = this._curves[iCurve];
                values[iCurve] = curveValues[previous];
            }
        }
    }

    @serializable
    private _curves: {
        values: DefaultFloatArray;
    }[] = [];
}

const cacheQuat1 = new Quat();
const cacheQuat2 = new Quat();

@ccclass('cc.KeySharedQuatCurves')
export class KeySharedQuatCurves extends KeysSharedCurves {
    public static allowedForCurve (curve: QuatCurve) {
        return curve.postExtrapolation === ExtrapolationMode.CLAMP
            && curve.preExtrapolation === ExtrapolationMode.CLAMP
            && Array.from(curve.values()).every((value) => value.interpolationMode === QuatInterpolationMode.SLERP);
    }

    get curveCount () {
        return this._curves.length;
    }

    public matchCurve (curve: QuatCurve, EPSILON = 1e-5) {
        if (curve.keyFramesCount !== this.keyframesCount) {
            return false;
        }
        const times = Array.from(curve.times());
        return super.matchTimes(times, EPSILON);
    }

    public addCurve (curve: QuatCurve) {
        assertIsTrue(curve.keyFramesCount === this.keyframesCount);
        const values = new DefaultFloatArray(curve.keyFramesCount * 4);
        const nKeyframes = curve.keyFramesCount;
        for (let iKeyframe = 0; iKeyframe < nKeyframes; ++iKeyframe) {
            Quat.toArray(values, curve.getKeyframeValue(iKeyframe).value, 4 * iKeyframe);
        }
        this._curves.push({
            values,
        });
    }

    public evaluate (time: number, values: IQuatLike[]) {
        const {
            _curves: curves,
            keyframesCount: nKeyframes,
        } = this;

        const nCurves = curves.length;
        assertIsTrue(values.length === nCurves);

        if (nKeyframes === 0) {
            return;
        }

        const firstTime = super.getFirstTime();
        if (time <= firstTime) {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                Quat.fromArray(values[iCurve], this._curves[iCurve].values, 0);
            }
            return;
        }

        const lastTime = super.getLastTime();
        if (time >= lastTime) {
            const iLastFrame = nKeyframes - 1;
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                Quat.fromArray(values[iCurve], this._curves[iCurve].values, iLastFrame * 4);
            }
            return;
        }

        const { previous, ratio } = super.calculateLocation(time, globalLocation);
        if (ratio !== 0.0) {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                const { values: curveValues } = this._curves[iCurve];
                const q1 = Quat.fromArray(cacheQuat1, curveValues, previous * 4);
                const q2 = Quat.fromArray(cacheQuat2, curveValues, (previous + 1) * 4);
                Quat.slerp(values[iCurve], q1, q2, ratio);
            }
        } else {
            for (let iCurve = 0; iCurve < nCurves; ++iCurve) {
                Quat.fromArray(values[iCurve], this._curves[iCurve].values, previous * 4);
            }
        }
    }

    @serializable
    private _curves: {
        values: DefaultFloatArray;
    }[] = [];
}
