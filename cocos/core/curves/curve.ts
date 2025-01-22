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
import { assertIsTrue } from '../data/utils/asserts';
import { approx, lerp, pingPong, repeat } from '../math';
import { KeyframeCurve } from './keyframe-curve';
import { RealInterpolationMode, ExtrapolationMode, TangentWeightMode } from './real-curve-param';
import { binarySearchEpsilon } from '../algorithm/binary-search';
import { solveCubic } from './solve-cubic';
import { EditorExtendable } from '../data/editor-extendable';
import { CCClass, deserializeTag, editorExtrasTag, SerializationContext, SerializationInput, SerializationOutput, serializeTag } from '../data';
import { DeserializationContext } from '../data/custom-serializable';
import { EasingMethod, getEasingFn } from './easing-method';
import { getOrCreateSerializationMetadata } from '../data/serialization-metadata';
import { popCount } from '../math/bits';

export { RealInterpolationMode, ExtrapolationMode, TangentWeightMode, EasingMethod };

const REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START = 0;
const REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_MASK = 0xFF << REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START;

const REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START = 8;
const REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_MASK = 0xFF << REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START;

const REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START = 16;
const REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_MASK = 0xFF << REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START;

// The following assertions ensure they're adjacent and non-overlapped.

assertIsTrue(REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START
    === REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START + popCount(REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_MASK));

assertIsTrue(REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START
    === REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START + popCount(REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_MASK));

const REAL_KEYFRAME_VALUE_DEFAULT_FLAGS = (RealInterpolationMode.LINEAR << REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START)
    | (TangentWeightMode.NONE << REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START)
    | (EasingMethod.LINEAR << REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START);

/**
 * @en View to a real frame value.
 * Note, the view may be invalidated due to keyframe change/add/remove.
 * @zh 实数帧值的视图。
 * 注意，该视图可能因关键帧的添加、改变、移除而失效。
 */
class RealKeyframeValue extends EditorExtendable {
    constructor () {
        super();
    }
    /**
     * @en
     * When perform interpolation, the interpolation method should be taken
     * when for this keyframe is used as starting keyframe.
     * @zh
     * 在执行插值时，当以此关键帧作为起始关键帧时应当使用的插值方式。
     */
    get interpolationMode (): RealInterpolationMode {
        return (this._flags & REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_MASK) >> REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START;
    }

    set interpolationMode (value) {
        this._flags &= ~REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_MASK;
        this._flags |= (value << REAL_KEYFRAME_VALUE_FLAGS_INTERPOLATION_MODE_START);
    }

    /**
     * @en
     * Tangent weight mode when perform cubic interpolation
     * This field is regarded if current interpolation mode is not cubic.
     * @zh
     * 当执行三次插值时，此关键帧使用的切线权重模式。
     * 若当前的插值模式不是三次插值时，该字段无意义。
     */
    get tangentWeightMode (): TangentWeightMode {
        return (this._flags & REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_MASK) >> REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START;
    }

    set tangentWeightMode (value) {
        this._flags &= ~REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_MASK;
        this._flags |= (value << REAL_KEYFRAME_VALUE_FLAGS_TANGENT_WEIGHT_MODE_START);
    }

    /**
     * @en
     * Value of the keyframe.
     * @zh
     * 该关键帧的值。
     */
    public value = 0.0;

    /**
     * @en
     * The tangent of this keyframe
     * when it's used as starting point during cubic interpolation.
     * Regarded otherwise.
     * @zh
     * 当此关键帧作为三次插值的起始点时，此关键帧的切线。其他情况下该字段无意义。
     */
    public rightTangent = 0.0;

    /**
     * @en
     * The tangent weight of this keyframe
     * when it's used as starting point during weighted cubic interpolation.
     * Regarded otherwise.
     * @zh
     * 当此关键帧作为三次插值的起始点时，此关键帧的切线权重。其他情况下该字段无意义。
     */
    public rightTangentWeight = 0.0;

    /**
     * @en
     * The tangent of this keyframe
     * when it's used as ending point during cubic interpolation.
     * Regarded otherwise.
     * @zh
     * 当此关键帧作为三次插值的目标点时，此关键帧的切线。其他情况下该字段无意义。
     */
    public leftTangent = 0.0;

    /**
     * @en
     * The tangent weight of this keyframe
     * when it's used as ending point during weighted cubic interpolation.
     * Regarded otherwise.
     * @zh
     * 当此关键帧作为三次插值的目标点时，此关键帧的切线权重。其他情况下该字段无意义。
     */
    public leftTangentWeight = 0.0;

    /**
     * @deprecated Reserved for backward compatibility. Will be removed in future.
     */
    get easingMethod (): EasingMethod {
        return (this._flags & REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_MASK) >> REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START;
    }

    set easingMethod (value) {
        this._flags &= ~REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_MASK;
        this._flags |= (value << REAL_KEYFRAME_VALUE_FLAGS_EASING_METHOD_START);
    }

    private _flags = REAL_KEYFRAME_VALUE_DEFAULT_FLAGS;
}

CCClass.fastDefine(
    'cc.RealKeyframeValue',
    RealKeyframeValue,
    {
        interpolationMode: RealInterpolationMode.LINEAR,
        tangentWeightMode: TangentWeightMode.NONE,
        value: 0.0,
        rightTangent: 0.0,
        rightTangentWeight: 0.0,
        leftTangent: 0.0,
        leftTangentWeight: 0.0,
        easingMethod: EasingMethod.LINEAR,
        [editorExtrasTag]: undefined,
    },
);

CCClass.Attr.setClassAttr(
    RealKeyframeValue,
    editorExtrasTag,
    'editorOnly',
    true,
);

getOrCreateSerializationMetadata(RealKeyframeValue).uniquelyReferenced = true;

export type { RealKeyframeValue };

/**
 * @en
 * The parameter describing a real keyframe value.
 * In the case of partial keyframe value,
 * each component of the keyframe value is taken from the parameter.
 * For unspecified components, default values are taken:
 * - Interpolation mode: `InterpolationMode.Linear`
 * - Tangent weight mode: `TangentWeightMode.None`
 * - Value/Tangents/Tangent weights: `0.0`
 * @zh
 * 用于描述实数关键帧值的参数。
 * 若是部分关键帧的形式，关键帧值的每个分量都是从该参数中取得。
 * 对于未指定的分量，使用默认值：
 * - 插值模式：`InterpolationMode.Linear`
 * - 切线权重模式：`TangentWeightMode.None`
 * - 值/切线/切线权重：`0.0`
 */
type RealKeyframeValueParameters = number | Partial<RealKeyframeValue>;

function createRealKeyframeValue (params: RealKeyframeValueParameters): RealKeyframeValue {
    const realKeyframeValue = new RealKeyframeValue();
    if (typeof params === 'number') {
        realKeyframeValue.value = params;
    } else {
        const {
            interpolationMode,
            tangentWeightMode,
            value,
            rightTangent,
            rightTangentWeight,
            leftTangent,
            leftTangentWeight,
            easingMethod,
            [editorExtrasTag]: editorExtras,
        } = params;
        realKeyframeValue.value = value ?? realKeyframeValue.value;
        realKeyframeValue.rightTangent = rightTangent ?? realKeyframeValue.rightTangent;
        realKeyframeValue.rightTangentWeight = rightTangentWeight ?? realKeyframeValue.rightTangentWeight;
        realKeyframeValue.leftTangent = leftTangent ?? realKeyframeValue.leftTangent;
        realKeyframeValue.leftTangentWeight = leftTangentWeight ?? realKeyframeValue.leftTangentWeight;
        realKeyframeValue.interpolationMode = interpolationMode ?? realKeyframeValue.interpolationMode;
        realKeyframeValue.tangentWeightMode = tangentWeightMode ?? realKeyframeValue.tangentWeightMode;
        realKeyframeValue.easingMethod = easingMethod ?? realKeyframeValue.easingMethod;
        if (editorExtras) {
            realKeyframeValue[editorExtrasTag] = editorExtras;
        }
    }
    return realKeyframeValue;
}

/**
 * @en
 * Real curve.
 *
 * The real curve is a kind of keyframe curve.
 * When evaluating a real curve:
 * - If the input is just the time of a keyframe,
 *   keyframe value's numeric value is used as result.
 * - Otherwise, if the input is less than the time of the first keyframe or
 *   is greater than the time of the last keyframe time, it performs so-called extrapolation.
 * - Otherwise, the input falls between two keyframes and then it interpolates between the two keyframes.
 *
 * Every keyframe may specify an interpolation mode
 * to indicates how to perform the interpolation
 * from current keyframe to next keyframe.
 * Interpolation modes of keyframes may differ from each other.
 *
 * Real curve allows three interpolation modes: constant, linear and cubic.
 * The constant and linear mode is easy.
 * In case of cubic interpolation,
 * the interpolation algorithm is effectively equivalent to cubic bezier(or cubic hermite) interpolation.
 *
 * Related quantities related to cubic interpolation are:
 * - Keyframe times and numeric values.
 * - The tangent and tangent weight of the previous keyframe and next keyframe.
 *
 * While performing the cubic bezier interpolation,
 * The first control point is calculated from right tangent and right tangent weight of previous keyframe,
 * the second control point is calculated from left tangent and left tangent weight of next keyframe.
 *
 * In equivalent bezier representation,
 * the tangent is the line slope between sample point and control point
 * and the tangent weight is the distance between sample point and control point.
 * The tangent weight on either side can be marked as "not specified" through tangent weight mode.
 * If either side weight is not specified,
 * the tangent weight is treated at `sqrt(d_t^2 + (d_t * tangent)^2) * (1 / 3)`
 * where `d_t` is the difference between two keyframes 's time and `tangent` is the tangent of that side.
 *
 * Note, in some cases, tangent/tangent weight/tangent weight mode may be "meaningless".
 * The meaningless means that value can may not be stored(or serialized).
 * @zh
 * 实数曲线。
 *
 * 实数曲线是关键帧曲线的一种。
 * 在求值实数曲线时：
 * - 若输入正好就是关键帧上的时间，关键帧上的数值就作为结果。
 * - 否则，如果输入小于第一个关键帧上的时间或大于最后一个关键帧上的时间，它会进行所谓的外推。
 * - 否则，输入落于两帧之间，将通过插值两帧得到结果。
 *
 * 每个关键帧都可以指定插值模式，
 * 以表示从当前帧数值变化到下一帧数值所采用的插值算法，
 * 每个关键帧的插值模式都可以是各不相同的。
 *
 * 实数曲线允许三种插值模式：常量、线性和三次方的（也称立方）。
 * 常量和线性模式都比较简单。
 * 在三次插值的情况下，插值算法实质上等价于三次贝塞尔（或三次埃尔米特）插值。
 *
 * 三次插值的相关量有：
 * - 关键帧上的时间和数值；
 * - 前一关键帧和后一关键帧上的切线和切线权重。
 *
 * 当两帧之间进行三次贝塞尔曲线插值时，
 * 会取前一帧的右切线、右切线权重来计算出第一个控制点，
 * 会取后一帧的左切线、左切线权重来计算出第二个控制点。
 *
 * 在等效的贝塞尔表示中，
 * 切线就是样本点和控制点之间的切线斜率，而切线权重就是样本点和控制点之间的距离。
 * 任意一端的切线权重都可以通过切线权重模式来标记为“未指定的”。
 * 若任意一端的切线权重是未指定的，
 * 此端上的切线权重将被视为 `sqrt(d_t^2 + (d_t * tangent)^2) * (1 / 3)`，其中，
 * `d_t` 是两帧时间的差，`tangent` 是此端上的切线。
 *
 * 注意，切线/切线权重/切线权重模式在某些情况下可能是“无意义的”。
 * 无意义意味着这些值可能不会被存储或序列化。
 */
export class RealCurve extends KeyframeCurve<RealKeyframeValue> {
    constructor () {
        super();
    }

    /**
     * @en
     * Gets or sets the pre-extrapolation-mode of this curve.
     * Defaults to `ExtrapolationMode.CLAMP`.
     * @zh
     * 获取或设置此曲线的前向外推模式。
     * 默认为 `ExtrapolationMode.CLAMP`。
     */
    public preExtrapolation: ExtrapolationMode = ExtrapolationMode.CLAMP;

    /**
     * @en
     * Gets or sets the post-extrapolation-mode of this curve.
     * Defaults to `ExtrapolationMode.CLAMP`.
     * @zh
     * 获取或设置此曲线的后向外推模式。
     * 默认为 `ExtrapolationMode.CLAMP`。
     */
    public postExtrapolation: ExtrapolationMode = ExtrapolationMode.CLAMP;

    /**
     * @en
     * Evaluates this curve at specified time.
     * @zh
     * 计算此曲线在指定时间上的值。
     * @param time Input time.
     * @returns Result value.
     */
    public evaluate (time: number): number {
        const {
            _times: times,
            _values: values,
        } = this;

        const nFrames = times.length;

        if (nFrames === 0) {
            return 0.0;
        }

        const firstTime = times[0];
        const lastTime = times[nFrames - 1];
        if (time < firstTime) {
            // Underflow
            const { preExtrapolation } = this;
            const preValue = values[0];
            if (preExtrapolation === ExtrapolationMode.CLAMP || nFrames < 2) {
                return preValue.value;
            }
            switch (preExtrapolation) {
            case ExtrapolationMode.LINEAR:
                return linearTrend(firstTime, values[0].value, times[1], values[1].value, time);
            case ExtrapolationMode.LOOP:
                time = wrapRepeat(time, firstTime, lastTime);
                break;
            case ExtrapolationMode.PING_PONG:
                time = wrapPingPong(time, firstTime, lastTime);
                break;
            default:
                return preValue.value;
            }
        } else if (time > lastTime) {
            // Overflow
            const { postExtrapolation } = this;
            const preFrame = values[nFrames - 1];
            if (postExtrapolation === ExtrapolationMode.CLAMP || nFrames < 2) {
                return preFrame.value;
            }
            switch (postExtrapolation) {
            case ExtrapolationMode.LINEAR:
                return linearTrend(lastTime, preFrame.value, times[nFrames - 2], values[nFrames - 2].value, time);
            case ExtrapolationMode.LOOP:
                time = wrapRepeat(time, firstTime, lastTime);
                break;
            case ExtrapolationMode.PING_PONG:
                time = wrapPingPong(time, firstTime, lastTime);
                break;
            default:
                return preFrame.value;
            }
        }

        const index = binarySearchEpsilon(times, time);
        if (index >= 0) {
            return values[index].value;
        }

        const iNext = ~index;
        if (DEBUG) {
            assertIsTrue(iNext !== 0 && iNext !== nFrames && nFrames > 1);
        }

        const iPre = iNext - 1;
        const preTime = times[iPre];
        const preValue = values[iPre];
        const nextTime = times[iNext];
        const nextValue = values[iNext];
        if (DEBUG) {
            assertIsTrue(nextTime > time && time > preTime);
        }
        const dt = nextTime - preTime;

        const ratio = (time - preTime) / dt;
        return evalBetweenTwoKeyFrames(preTime, preValue, nextTime, nextValue, ratio);
    }

    /**
     * @en
     * Adds a keyframe into this curve.
     * @zh
     * 添加一个关键帧到此曲线。
     * @param time Time of the keyframe.
     * @param value Value of the keyframe.
     * @returns The index to the new keyframe.
     */
    public addKeyFrame (time: number, value: RealKeyframeValueParameters): number {
        return super.addKeyFrame(time, createRealKeyframeValue(value));
    }

    /**
     * @en
     * Assigns all keyframes.
     * @zh
     * 赋值所有关键帧。
     * @param keyframes An iterable to keyframes. The keyframes should be sorted by their time.
     */
    public assignSorted (keyframes: Iterable<[number, RealKeyframeValueParameters]>): void;

    /**
      * Assigns all keyframes.
      * @param times Times array. Should be sorted.
      * @param values Values array. Corresponding to each time in `times`.
      */
    public assignSorted (times: readonly number[], values: RealKeyframeValueParameters[]): void;

    public assignSorted (
        times: Iterable<[number, RealKeyframeValueParameters]> | readonly number[],
        values?: readonly RealKeyframeValueParameters[],
    ): void {
        if (values !== undefined) {
            assertIsTrue(Array.isArray(times));
            this.setKeyframes(
                (times as number[]).slice(),
                values.map((value) => createRealKeyframeValue(value)),
            );
        } else {
            const keyframes = Array.from(times as Iterable<[number, Partial<RealKeyframeValue>]>);
            this.setKeyframes(
                keyframes.map(([time]) => time),
                keyframes.map(([, value]) => createRealKeyframeValue(value)),
            );
        }
    }

    /**
     * @en
     * Returns if this curve is constant.
     * @zh
     * 返回此曲线是否是常量曲线。
     * @param tolerance The tolerance.
     * @returns Whether it is constant.
     */
    public isConstant (tolerance: number): boolean {
        if (this._values.length <= 1) {
            return true;
        }
        const firstVal = this._values[0].value;
        return this._values.every((frame): boolean => approx(frame.value, firstVal, tolerance));
    }

    /**
     * @internal
     */
    public [serializeTag] (output: SerializationOutput, context: SerializationContext): void {
        if (!context.toCCON) {
            output.writeThis();
            return;
        }

        const {
            _times: times,
            _values: keyframeValues,
        } = this;

        const nKeyframes = times.length;

        const dataSize = 0
            + OVERFLOW_BYTES + OVERFLOW_BYTES
            + FRAME_COUNT_BYTES
            + TIME_BYTES * nKeyframes
            + REAL_KEY_FRAME_VALUE_MAX_SIZE * nKeyframes;

        const dataView = new DataView(new ArrayBuffer(dataSize));
        let currentOffset = 0;

        // Overflow operations
        dataView.setUint8(currentOffset, this.preExtrapolation); currentOffset += OVERFLOW_BYTES;
        dataView.setUint8(currentOffset, this.postExtrapolation); currentOffset += OVERFLOW_BYTES;

        // Frame count
        dataView.setUint32(currentOffset, nKeyframes, true); currentOffset += FRAME_COUNT_BYTES;

        // Times
        times.forEach((time, index) => dataView.setFloat32(currentOffset + TIME_BYTES * index, time, true));
        currentOffset += TIME_BYTES * nKeyframes;

        // Frame values
        for (const keyframeValue of keyframeValues) {
            currentOffset = saveRealKeyFrameValue(dataView, keyframeValue, currentOffset);
        }

        const bytes = new Uint8Array(dataView.buffer, 0, currentOffset);
        output.writeProperty('bytes', bytes);

        const keyframeValueEditorExtras = keyframeValues.map((keyframeValue) => keyframeValue[editorExtrasTag]);
        if (keyframeValueEditorExtras.some((extras) => extras !== undefined)) {
            output.writeProperty(`keyframeValueEditorExtras`, keyframeValueEditorExtras);
        }
    }

    /**
     * @internal
     */
    public [deserializeTag] (input: SerializationInput, context: DeserializationContext): void {
        if (!context.fromCCON) {
            input.readThis();
            return;
        }

        const bytes = input.readProperty('bytes') as Uint8Array;

        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let currentOffset = 0;

        // Overflow operations
        this.preExtrapolation = dataView.getUint8(currentOffset); currentOffset += OVERFLOW_BYTES;
        this.postExtrapolation = dataView.getUint8(currentOffset); currentOffset += OVERFLOW_BYTES;

        // Frame count
        const nKeyframes = dataView.getUint32(currentOffset, true); currentOffset += FRAME_COUNT_BYTES;

        // Times
        const times = Array.from(
            { length: nKeyframes },
            (_, index) => dataView.getFloat32(currentOffset + TIME_BYTES * index, true),
        );
        currentOffset += TIME_BYTES * nKeyframes;

        // Frame values
        const keyframeValues = new Array<RealKeyframeValue>(nKeyframes);
        for (let iKeyFrame = 0; iKeyFrame < nKeyframes; ++iKeyFrame) {
            const keyframeValue = createRealKeyframeValue({});
            currentOffset = loadRealKeyFrameValue(dataView, keyframeValue, currentOffset);
            keyframeValues[iKeyFrame] = keyframeValue;
        }

        assertIsTrue(currentOffset === bytes.byteLength);

        const keyframeValueEditorExtras = input.readProperty(`keyframeValueEditorExtras`) as unknown[];
        if (keyframeValueEditorExtras) {
            assertIsTrue(keyframeValueEditorExtras.length === nKeyframes);
            keyframeValueEditorExtras.forEach(
                (extras, index) => keyframeValues[index][editorExtrasTag] = extras,
            );
        }

        this._times = times;
        this._values = keyframeValues;
    }
}

CCClass.fastDefine('cc.RealCurve', RealCurve, {
    _times: [],
    _values: [],
    preExtrapolation: ExtrapolationMode.CLAMP,
    postExtrapolation: ExtrapolationMode.CLAMP,
});

const FLAGS_EASING_METHOD_BITS_START = 8;
const FLAG_EASING_METHOD_MASK = 0xFF << FLAGS_EASING_METHOD_BITS_START; // 8-16 bits

enum KeyframeValueFlagMask {
    VALUE = 1 << 0,
    INTERPOLATION_MODE = 1 << 1,
    TANGENT_WEIGHT_MODE = 1 << 2,
    LEFT_TANGENT = 1 << 3,
    LEFT_TANGENT_WEIGHT = 1 << 4,
    RIGHT_TANGENT = 1 << 5,
    RIGHT_TANGENT_WEIGHT = 1 << 6,
}

const OVERFLOW_BYTES = 1;
const FRAME_COUNT_BYTES = 4;
const TIME_BYTES = 4;
const KEY_FRAME_VALUE_FLAGS_BYTES = 4;
const VALUE_BYTES = 4;
const INTERPOLATION_MODE_BYTES = 1;
const TANGENT_WEIGHT_MODE_BYTES = 1;
const LEFT_TANGENT_BYTES = 4;
const LEFT_TANGENT_WEIGHT_BYTES = 4;
const RIGHT_TANGENT_BYTES = 4;
const RIGHT_TANGENT_WEIGHT_BYTES = 4;

const {
    interpolationMode: DEFAULT_INTERPOLATION_MODE,
    tangentWeightMode: DEFAULT_TANGENT_WEIGHT_MODE,
    leftTangent: DEFAULT_LEFT_TANGENT,
    leftTangentWeight: DEFAULT_LEFT_TANGENT_WEIGHT,
    rightTangent: DEFAULT_RIGHT_TANGENT,
    rightTangentWeight: DEFAULT_RIGHT_TANGENT_WEIGHT,
} = createRealKeyframeValue({});

const REAL_KEY_FRAME_VALUE_MAX_SIZE = KEY_FRAME_VALUE_FLAGS_BYTES
    + VALUE_BYTES
    + INTERPOLATION_MODE_BYTES
    + TANGENT_WEIGHT_MODE_BYTES
    + LEFT_TANGENT_BYTES
    + LEFT_TANGENT_WEIGHT_BYTES
    + RIGHT_TANGENT_BYTES
    + RIGHT_TANGENT_WEIGHT_BYTES
    + 0;

function saveRealKeyFrameValue (dataView: DataView, keyframeValue: RealKeyframeValue, offset: number): number {
    let flags = 0;

    let currentOffset = offset;

    const pFlags = currentOffset; // Place holder for flags
    currentOffset += KEY_FRAME_VALUE_FLAGS_BYTES;

    const {
        value,
        interpolationMode,
        tangentWeightMode,
        rightTangent,
        rightTangentWeight,
        leftTangent,
        leftTangentWeight,
        easingMethod,
    } = keyframeValue;

    dataView.setFloat32(currentOffset, value, true);
    currentOffset += VALUE_BYTES;

    if (interpolationMode !== DEFAULT_INTERPOLATION_MODE) {
        flags |= KeyframeValueFlagMask.INTERPOLATION_MODE;
        dataView.setUint8(currentOffset, interpolationMode);
        currentOffset += INTERPOLATION_MODE_BYTES;
    }

    if (tangentWeightMode !== DEFAULT_TANGENT_WEIGHT_MODE) {
        flags |= KeyframeValueFlagMask.TANGENT_WEIGHT_MODE;
        dataView.setUint8(currentOffset, tangentWeightMode);
        currentOffset += TANGENT_WEIGHT_MODE_BYTES;
    }

    if (leftTangent !== DEFAULT_LEFT_TANGENT) {
        flags |= KeyframeValueFlagMask.LEFT_TANGENT;
        dataView.setFloat32(currentOffset, leftTangent, true);
        currentOffset += LEFT_TANGENT_BYTES;
    }

    if (leftTangentWeight !== DEFAULT_LEFT_TANGENT_WEIGHT) {
        flags |= KeyframeValueFlagMask.LEFT_TANGENT_WEIGHT;
        dataView.setFloat32(currentOffset, leftTangentWeight, true);
        currentOffset += LEFT_TANGENT_WEIGHT_BYTES;
    }

    if (rightTangent !== DEFAULT_RIGHT_TANGENT) {
        flags |= KeyframeValueFlagMask.RIGHT_TANGENT;
        dataView.setFloat32(currentOffset, rightTangent, true);
        currentOffset += RIGHT_TANGENT_BYTES;
    }

    if (rightTangentWeight !== DEFAULT_RIGHT_TANGENT_WEIGHT) {
        flags |= KeyframeValueFlagMask.RIGHT_TANGENT_WEIGHT;
        dataView.setFloat32(currentOffset, rightTangentWeight, true);
        currentOffset += RIGHT_TANGENT_WEIGHT_BYTES;
    }

    flags |= (easingMethod << FLAGS_EASING_METHOD_BITS_START);

    dataView.setUint32(pFlags, flags, true);

    return currentOffset;
}

function loadRealKeyFrameValue (dataView: DataView, keyframeValue: RealKeyframeValue, offset: number): number {
    let currentOffset = offset;

    const flags = dataView.getUint32(currentOffset, true);
    currentOffset += KEY_FRAME_VALUE_FLAGS_BYTES;

    keyframeValue.value = dataView.getFloat32(currentOffset, true);
    currentOffset += VALUE_BYTES;

    if (flags & KeyframeValueFlagMask.INTERPOLATION_MODE) {
        keyframeValue.interpolationMode = dataView.getUint8(currentOffset);
        currentOffset += INTERPOLATION_MODE_BYTES;
    }

    if (flags & KeyframeValueFlagMask.TANGENT_WEIGHT_MODE) {
        keyframeValue.tangentWeightMode = dataView.getUint8(currentOffset);
        currentOffset += TANGENT_WEIGHT_MODE_BYTES;
    }

    if (flags & KeyframeValueFlagMask.LEFT_TANGENT) {
        keyframeValue.leftTangent = dataView.getFloat32(currentOffset, true);
        currentOffset += LEFT_TANGENT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.LEFT_TANGENT_WEIGHT) {
        keyframeValue.leftTangentWeight = dataView.getFloat32(currentOffset, true);
        currentOffset += LEFT_TANGENT_WEIGHT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.RIGHT_TANGENT) {
        keyframeValue.rightTangent = dataView.getFloat32(currentOffset, true);
        currentOffset += RIGHT_TANGENT_BYTES;
    }

    if (flags & KeyframeValueFlagMask.RIGHT_TANGENT_WEIGHT) {
        keyframeValue.rightTangentWeight = dataView.getFloat32(currentOffset, true);
        currentOffset += RIGHT_TANGENT_WEIGHT_BYTES;
    }

    const easingMethod = ((flags & FLAG_EASING_METHOD_MASK) >> FLAGS_EASING_METHOD_BITS_START) as EasingMethod;
    keyframeValue.easingMethod = easingMethod;

    return currentOffset;
}

function wrapRepeat (time: number, prevTime: number, nextTime: number): number {
    return prevTime + repeat(time - prevTime, nextTime - prevTime);
}

function wrapPingPong (time: number, prevTime: number, nextTime: number): number {
    return prevTime + pingPong(time - prevTime, nextTime - prevTime);
}

function linearTrend (
    prevTime: number,
    prevValue: number,
    nextTime: number,
    nextValue: number,
    time: number,
): number {
    const slope = (nextValue - prevValue) / (nextTime - prevTime);
    return prevValue + (time - prevTime) * slope;
}

function evalBetweenTwoKeyFrames (
    prevTime: number,
    prevValue: RealKeyframeValue,
    nextTime: number,
    nextValue: RealKeyframeValue,
    ratio: number,
): number {
    const dt = nextTime - prevTime;
    switch (prevValue.interpolationMode) {
    default:
    case RealInterpolationMode.CONSTANT:
        return prevValue.value;
    case RealInterpolationMode.LINEAR: {
        const transformedRatio = prevValue.easingMethod === EasingMethod.LINEAR
            ? ratio
            : getEasingFn(prevValue.easingMethod)(ratio);
        return lerp(prevValue.value, nextValue.value, transformedRatio);
    }
    case RealInterpolationMode.CUBIC: {
        const ONE_THIRD = 1.0 / 3.0;
        const {
            rightTangent: prevTangent,
            rightTangentWeight: prevTangentWeightSpecified,
        } = prevValue;
        const prevTangentWeightEnabled = isRightTangentWeightEnabled(prevValue.tangentWeightMode);
        const {
            leftTangent: nextTangent,
            leftTangentWeight: nextTangentWeightSpecified,
        } = nextValue;
        const nextTangentWeightEnabled = isLeftTangentWeightEnabled(nextValue.tangentWeightMode);

        if (!prevTangentWeightEnabled && !nextTangentWeightEnabled) {
            // Optimize for the case when both x components of tangents are 1.
            // See below.
            const p1 = prevValue.value + ONE_THIRD * prevTangent * dt;
            const p2 = nextValue.value - ONE_THIRD * nextTangent * dt;
            return bezierInterpolate(prevValue.value, p1, p2, nextValue.value, ratio);
        } else {
            let prevTangentWeight = 0.0;
            if (prevTangentWeightEnabled) {
                prevTangentWeight = prevTangentWeightSpecified;
            } else {
                const x = dt;
                const y = dt * prevTangent;
                prevTangentWeight = Math.sqrt(x * x + y * y) * ONE_THIRD;
            }
            const angle0 = Math.atan(prevTangent);
            const tx0 = Math.cos(angle0) * prevTangentWeight + prevTime;
            const ty0 = Math.sin(angle0) * prevTangentWeight + prevValue.value;

            let nextTangentWeight = 0.0;
            if (nextTangentWeightEnabled) {
                nextTangentWeight = nextTangentWeightSpecified;
            } else {
                const x = dt;
                const y = dt * nextTangent;
                nextTangentWeight = Math.sqrt(x * x + y * y) * ONE_THIRD;
            }
            const angle1 = Math.atan(nextTangent);
            const tx1 = -Math.cos(angle1) * nextTangentWeight + nextTime;
            const ty1 = -Math.sin(angle1) * nextTangentWeight + nextValue.value;

            const dx = dt;
            // Hermite to Bezier
            const u0x = (tx0 - prevTime) / dx;
            const u1x = (tx1 - prevTime) / dx;
            const u0y = ty0;
            const u1y = ty1;
            // Converts from Bernstein Basis to Power Basis.
            // Formula: [1, 0, 0, 0; -3, 3, 0, 0; 3, -6, 3, 0; -1, 3, -3, 1] * [p_0; p_1; p_2; p_3]
            // --------------------------------------
            // | Basis | Coeff
            // | t^3   | 3 * p_1 - p_0 - 3 * p_2 + p_3
            // | t^2   | 3 * p_0 - 6 * p_1 + 3 * p_2
            // | t^1   | 3 * p_1 - 3 * p_0
            // | t^0   | p_0
            // --------------------------------------
            // where: p_0 = 0, p_1 = u0x, p_2 = u1x, p_3 = 1
            // Especially, when both tangents are 1, we will have u0x = 1/3 and u1x = 2/3
            // and then: ratio = t, eg. the ratios are
            // 1-1 corresponding to param t. That's why we can do optimization like above.
            const coeff0 = 0.0; // 0
            const coeff1 = 3.0 * u0x; // 1
            const coeff2 = 3.0 * u1x - 6.0 * u0x; // -1
            const coeff3 = 3.0 * (u0x - u1x) + 1.0; // 1
            // Solves the param t from equation X(t) = ratio.
            const solutions = [0.0, 0.0, 0.0] as [number, number, number];
            const nSolutions = solveCubic(coeff0 - ratio, coeff1, coeff2, coeff3, solutions);
            const param = getParamFromCubicSolution(solutions, nSolutions, ratio);
            // Solves Y.
            const y = bezierInterpolate(prevValue.value, u0y, u1y, nextValue.value, param);
            return y;
        }
    }
    }
}

function isLeftTangentWeightEnabled (tangentWeightMode: TangentWeightMode): boolean {
    return (tangentWeightMode & TangentWeightMode.LEFT) !== 0;
}

function isRightTangentWeightEnabled (tangentWeightMode: TangentWeightMode): boolean {
    return (tangentWeightMode & TangentWeightMode.RIGHT) !== 0;
}

function bezierInterpolate (p0: number, p1: number, p2: number, p3: number, t: number): number {
    const u = 1 - t;
    const coeff0 = u * u * u;
    const coeff1 = 3 * u * u * t;
    const coeff2 = 3 * u * t * t;
    const coeff3 = t * t * t;
    return coeff0 * p0 + coeff1 * p1 + coeff2 * p2 + coeff3 * p3;
}

function getParamFromCubicSolution (solutions: readonly [number, number, number], solutionsCount: number, x: number): number {
    let param = x;
    if (solutionsCount === 1) {
        param = solutions[0];
    } else {
        param = -Infinity;
        for (let iSolution = 0; iSolution < solutionsCount; ++iSolution) {
            const solution = solutions[iSolution];
            if (solution >= 0.0 && solution <= 1.0) {
                if (solution > param) {
                    param = solution;
                }
            }
        }
        if (param === -Infinity) {
            param = 0.0;
        }
    }
    return param;
}
