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

import { binarySearchEpsilon } from '../algorithm/binary-search';
import { CCClass } from '../data/class';
import { assertIsTrue } from '../data/utils/asserts';
import { approx } from '../math';
import type { CurveBase } from './curve-base';

type KeyFrame<TKeyframeValue> = [number, TKeyframeValue];

/**
 * @en
 * Keyframe curve.
 * @zh
 * 关键帧曲线。
 */
export class KeyframeCurve<TKeyframeValue> implements CurveBase, Iterable<KeyFrame<TKeyframeValue>> {
    /**
     * @en
     * Gets the count of keyframes.
     * @zh
     * 获取关键帧数量。
     */
    get keyFramesCount (): number {
        return this._times.length;
    }

    /**
     * @en
     * Gets the minimal keyframe time on this curve.
     * @zh
     * 获取此曲线上最小的关键帧时间。
     */
    get rangeMin (): number {
        return this._times[0];
    }

    /**
     * @en
     * Gets the maximum keyframe time on this curve.
     * @zh
     * 获取此曲线上最大的关键帧时间。
     */
    get rangeMax (): number {
        return this._times[this._values.length - 1];
    }

    /**
     * @en
     * Returns an iterator to keyframe pairs.
     * @zh
     * 返回关键帧对的迭代器。
     */
    [Symbol.iterator] (): { next: () => IteratorResult<KeyFrame<TKeyframeValue>> } {
        let index = 0;
        return {
            next: (): IteratorResult<KeyFrame<TKeyframeValue>> => {
                if (index >= this._times.length) {
                    return {
                        done: true,
                        value: undefined,
                    };
                } else {
                    const value: KeyFrame<TKeyframeValue> = [this._times[index], this._values[index]];
                    ++index;
                    return {
                        done: false,
                        value,
                    };
                }
            },
        };
    }

    /**
     * @en
     * Returns an iterator to keyframe pairs.
     * @zh
     * 返回关键帧对的迭代器。
     */
    public keyframes (): Iterable<KeyFrame<TKeyframeValue>> {
        return this;
    }

    /**
     * @en
     * Returns an iterator to keyframe times.
     * @zh
     * 返回关键帧时间的迭代器。
     */
    public times (): Iterable<number> {
        return this._times;
    }

    /**
     * @en
     * Returns an iterator to keyframe values.
     * @zh
     * 返回关键帧值的迭代器。
     */
    public values (): Iterable<TKeyframeValue> {
        return this._values;
    }

    /**
     * @en
     * Gets the time of specified keyframe.
     * @zh
     * 获取指定关键帧上的时间。
     * @param index Index to the keyframe.
     * @returns The keyframe 's time.
     */
    public getKeyframeTime (index: number): number {
        return this._times[index];
    }

    /**
     * @en
     * Gets the value of specified keyframe.
     * @zh
     * 获取指定关键帧上的值。
     * @param index Index to the keyframe.
     * @returns The keyframe 's value.
     */
    public getKeyframeValue (index: number): TKeyframeValue {
        return this._values[index];
    }

    /**
     * @en
     * Adds a keyframe into this curve.
     * @zh
     * 添加一个关键帧到此曲线中。
     * @param time Time of the keyframe.
     * @param keyframeValue Value of the keyframe.
     * @returns The index to the new keyframe.
     */
    public addKeyFrame (time: number, keyframeValue: TKeyframeValue): number {
        return this._insertNewKeyframe(time, keyframeValue);
    }

    /**
     * @en
     * Removes a keyframe from this curve.
     * @zh
     * 移除此曲线的一个关键帧。
     * @param index Index to the keyframe.
     */
    public removeKeyframe (index: number): void {
        this._times.splice(index, 1);
        this._values.splice(index, 1);
    }

    /**
     * @en
     * Searches for the keyframe at specified time.
     * @zh
     * 搜索指定时间上的关键帧。
     * @param time Time to search.
     * @returns Index to the keyframe or negative number if not found.
     */
    public indexOfKeyframe (time: number): number {
        return binarySearchEpsilon(this._times, time);
    }

    /**
     * @en
     * Updates the time of a keyframe.
     * @zh
     * 更新关键帧的时间。
     * @param index Index to the keyframe.
     * @param time New time.
     */
    public updateTime (index: number, time: number): void {
        const value = this._values[index];
        this.removeKeyframe(index);
        this._insertNewKeyframe(time, value);
    }

    /**
     * @en
     * Assigns all keyframes.
     * @zh
     * 赋值所有关键帧。
     * @param keyframes An iterable to keyframes. The keyframes should be sorted by their time.
     */
    public assignSorted (keyframes: Iterable<[number, TKeyframeValue]>): void;

    /**
     * @en
     * Assigns all keyframes.
     * @zh
     * 赋值所有关键帧。
     * @param times Times array. Should be sorted.
     * @param values Values array. Corresponding to each time in `times`.
     */
    public assignSorted (times: readonly number[], values: TKeyframeValue[]): void;

    public assignSorted (times: Iterable<[number, TKeyframeValue]> | readonly number[], values?: readonly TKeyframeValue[]): void {
        if (values !== undefined) {
            assertIsTrue(Array.isArray(times));
            this.setKeyframes(
                (times as number[]).slice(),
                values.slice(),
            );
        } else {
            const keyframes = Array.from(times as Iterable<[number, TKeyframeValue]>);
            this.setKeyframes(
                keyframes.map(([time]) => time),
                keyframes.map(([, value]) => value),
            );
        }
    }

    /**
     * @en
     * Removes all key frames.
     * @zh
     * 移除所有关键帧。
     */
    public clear (): void {
        this._times.length = 0;
        this._values.length = 0;
    }

    protected searchKeyframe (time: number): number {
        return binarySearchEpsilon(this._times, time);
    }

    protected setKeyframes (times: number[], values: TKeyframeValue[]): void {
        assertIsTrue(times.length === values.length);
        assertIsTrue(isSorted(times));
        this._times = times;
        this._values = values;
    }

    private _insertNewKeyframe (time: number, value: TKeyframeValue): number {
        const times = this._times;
        const values = this._values;
        const nFrames = times.length;

        const index = binarySearchEpsilon(times, time);
        if (index >= 0) {
            return index;
        }
        const iNext = ~index;
        if (iNext === 0) {
            times.unshift(time);
            values.unshift(value);
        } else if (iNext === nFrames) {
            times.push(time);
            values.push(value);
        } else {
            assertIsTrue(nFrames > 1);
            times.splice(iNext - 1, 0, time);
            values.splice(iNext - 1, 0, value);
        }
        return iNext;
    }

    /**
     * Times are always sorted and 1-1 correspond to values.
     * @dontmangle
     * NOTE: _times is a serializable property set by `CCClass.fastDefine`,
     * so it should not be mangled while `mangleProtected` is true in `<<ProjectRoot>>/engine-mangle-config.json`.
     */
    protected _times: number[] = [];
    /**
     * @dontmangle
     * NOTE: _values is a serializable property set by `CCClass.fastDefine`,
     * so it should not be mangled while `mangleProtected` is true in `<<ProjectRoot>>/engine-mangle-config.json`.
     */
    protected _values: TKeyframeValue[] = [];
}

CCClass.fastDefine('cc.KeyframeCurve', KeyframeCurve, {
    _times: [],
    _values: [],
});

function isSorted (values: number[]): boolean {
    return values.every(
        (value, index, array) => index === 0
            || value > array[index - 1] || approx(value, array[index - 1], 1e-6),
    );
}
