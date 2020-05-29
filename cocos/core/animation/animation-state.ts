/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category animation
 */

import { EventArgumentsOf, EventCallbackOf } from '../event/defines';
import { Node } from '../scene-graph/node';
import { AnimationClip, IRuntimeCurve } from './animation-clip';
import { AnimCurve, RatioSampler } from './animation-curve';
import { createBoundTarget, createBufferedTarget, IBufferedTarget, IBoundTarget } from './bound-target';
import { Playable } from './playable';
import { WrapMode, WrapModeMask, WrappedInfo } from './types';
import { EDITOR } from 'internal:constants';
import { HierarchyPath, evaluatePath } from './target-path';
import { BlendStateBuffer, createBlendStateWriter, IBlendStateWriter } from './skeletal-animation-blending';
import { ccenum } from '../value-types/enum';
import { Eventify } from '../event';

/**
 * @en The event type supported by Animation
 * @zh Animation 支持的事件类型。
 */
export enum EventType {
    /**
     * @en Emit when begin playing animation
     * @zh 开始播放时触发。
     */
    PLAY = 'play',
    /**
     * @en Emit when stop playing animation
     * @zh 停止播放时触发。
     */
    STOP = 'stop',
    /**
     * @en Emit when pause animation
     * @zh 暂停播放时触发。
     */
    PAUSE = 'pause',
    /**
     * @en Emit when resume animation
     * @zh 恢复播放时触发。
     */
    RESUME = 'resume',

    /**
     * @en If animation repeat count is larger than 1, emit when animation play to the last frame.
     * @zh 假如动画循环次数大于 1，当动画播放到最后一帧时触发。
     */
    LASTFRAME = 'lastframe',

    /**
     * @en Triggered when finish playing animation.
     * @zh 动画完成播放时触发。
     */
    FINISHED = 'finished',

    /**
     * @en Triggered when the animation playing to the last frame or when finish its playing.
     * @zh 当动画完成播放时，或每当动画播放到最后一帧时触发。
     */
    LAST_FRAME_ARRIVED = 'last-frame-arrived',
}
ccenum(EventType);

export class ICurveInstance {
    public commonTargetIndex?: number;

    private _curve: AnimCurve;
    private _boundTarget: IBoundTarget;
    private _rootTargetProperty?: string;
    private _curveDetail: Omit<IRuntimeCurve, 'sampler'>;

    constructor (
        runtimeCurve: Omit<IRuntimeCurve, 'sampler'>,
        target: any,
        boundTarget: IBoundTarget) {
        this._curve = runtimeCurve.curve;
        this._curveDetail = runtimeCurve;

        this._boundTarget = boundTarget;
    }

    public applySample (ratio: number, index: number, lerpRequired: boolean, samplerResultCache, weight: number) {
        if (this._curve.empty()) {
            return;
        }
        let value: any;
        if (!this._curve.hasLerp() || !lerpRequired) {
            value = this._curve.valueAt(index);
        } else {
            value = this._curve.valueBetween(
                ratio,
                samplerResultCache.from,
                samplerResultCache.fromRatio,
                samplerResultCache.to,
                samplerResultCache.toRatio);
        }
        this._setValue(value, weight);
    }

    private _setValue (value: any, weight: number) {
        this._boundTarget.setValue(value);
    }

    get propertyName () { return this._rootTargetProperty || ''; }

    get curveDetail () {
        return this._curveDetail;
    }
}

/**
 * The curves in ISamplerSharedGroup share a same keys.
 */
interface ISamplerSharedGroup {
    sampler: RatioSampler | null;
    curves: ICurveInstance[];
    samplerResultCache: {
        from: number;
        fromRatio: number;
        to: number;
        toRatio: number;
    };
}

function makeSamplerSharedGroup (sampler: RatioSampler | null): ISamplerSharedGroup {
    return {
        sampler,
        curves: [],
        samplerResultCache: {
            from: 0,
            fromRatio: 0,
            to: 0,
            toRatio: 0,
        },
    };
}

const InvalidIndex = -1;
const stateAspect = 2;

/**
 * @en
 * The AnimationState gives full control over animation playback process.
 * In most cases the Animation Component is sufficient and easier to use. Use the AnimationState if you need full control.
 * @zh
 * AnimationState 完全控制动画播放过程。<br/>
 * 大多数情况下 动画组件 是足够和易于使用的。如果您需要更多的动画控制接口，请使用 AnimationState。
 *
 */
export class AnimationState extends Eventify(Playable) {

    /**
     * @en The clip that is being played by this animation state.
     * @zh 此动画状态正在播放的剪辑。
     */
    get clip () {
        return this._clip;
    }

    /**
     * @en The name of the playing animation.
     * @zh 动画的名字。
     */
    get name () {
        return this._name;
    }

    get length () {
        return this.duration;
    }

    /**
     * @en
     * Wrapping mode of the playing animation.
     * Notice : dynamic change wrapMode will reset time and repeatCount property
     * @zh
     * 动画循环方式。
     * 需要注意的是，动态修改 wrapMode 时，会重置 time 以及 repeatCount。
     * @default: WrapMode.Normal
     */
    get wrapMode () {
        return this._wrapMode;
    }

    set wrapMode (value: WrapMode) {
        this._wrapMode = value;

        if (EDITOR) { return; }

        // dynamic change wrapMode will need reset time to 0
        this.time = 0;

        if (value & WrapModeMask.Loop) {
            this.repeatCount = Infinity;
        }
        else {
            this.repeatCount = 1;
        }
    }

    /**
     * @en The animation's iteration count property.
     *
     * A real number greater than or equal to zero (including positive infinity) representing the number of times
     * to repeat the animation node.
     *
     * Values less than zero and NaN values are treated as the value 1.0 for the purpose of timing model
     * calculations.
     *
     * @zh 迭代次数，指动画播放多少次后结束, normalize time。 如 2.5（2次半）。
     *
     * @property repeatCount
     * @type {Number}
     * @default 1
     */
    get repeatCount () {
        return this._repeatCount;
    }

    set repeatCount (value: number) {
        this._repeatCount = value;

        const shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
        const reverse = (this.wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse;
        if (value === Infinity && !shouldWrap && !reverse) {
            this._process = this.simpleProcess;
        }
        else {
            this._process = this.process;
        }
    }

    /**
     * @en The start delay which represents the number of seconds from an animation's start time to the start of
     * the active interval.
     * @zh 延迟多少秒播放。
     * @default 0
     */
    get delay () {
        return this._delay;
    }

    set delay (value: number) {
        this._delayTime = this._delay = value;
    }

    // http://www.w3.org/TR/web-animations/#idl-def-AnimationTiming

    /**
     * @en The iteration duration of this animation in seconds. (length)
     * @zh 单次动画的持续时间，秒。（动画长度）
     * @readOnly
     */
    public duration = 1;

    /**
     * @en The animation's playback speed. 1 is normal playback speed.
     * @zh 播放速率。
     * @default: 1.0
     */
    public speed = 1;

    /**
     * @en The current time of this animation in seconds.
     * @zh 动画当前的时间，秒。
     * @default 0
     */
    public time = 0;

    /**
     * The weight.
     */
    public weight = 0;

    public frameRate = 0;

    protected _wrapMode = WrapMode.Normal;

    protected _repeatCount = 1;

    /**
     * Mark whether the current frame is played.
     * When set new time to animation state, we should ensure the frame at the specified time being played at next update.
     */
    protected _currentFramePlayed = false;
    protected _delay = 0;
    protected _delayTime = 0;
    protected _wrappedInfo = new WrappedInfo();
    protected _lastWrapInfo: WrappedInfo | null = null;
    protected _lastWrapInfoEvent: WrappedInfo | null = null;
    protected _process = this.process;
    protected _target: Node | null = null;
    protected _targetNode: Node | null = null;
    protected _clip: AnimationClip;
    protected _name: string;
    protected _lastIterations?: number;
    protected _samplerSharedGroups: ISamplerSharedGroup[] = [];

    /**
     * May be `null` due to failed to initialize.
     */
    protected _commonTargetStatuses: (null | {
        target: IBufferedTarget;
        changed: boolean;
    })[] = [];
    protected _curveLoaded = false;
    protected _ignoreIndex = InvalidIndex;
    private _blendStateBuffer: BlendStateBuffer | null = null;
    private _blendStateWriters: IBlendStateWriter[] = [];
    private _isBlendStateWriterInitialized = false;
    private _allowLastFrameEventMask = 0;

    constructor (clip: AnimationClip, name = '') {
        super();
        this._clip = clip;
        this._name = name || (clip && clip.name);
    }

    get curveLoaded () {
        return this._curveLoaded;
    }

    public initialize (root: Node, propertyCurves?: readonly IRuntimeCurve[]) {
        if (this._curveLoaded) { return; }
        this._curveLoaded = true;
        this._destroyBlendStateWriters();
        this._samplerSharedGroups.length = 0;
        this._blendStateBuffer = cc.director.getAnimationManager()?.blendState ?? null;
        this._targetNode = root;
        const clip = this._clip;

        this.duration = clip.duration;
        this.speed = clip.speed;
        this.wrapMode = clip.wrapMode;
        this.frameRate = clip.sample;

        if ((this.wrapMode & WrapModeMask.Loop) === WrapModeMask.Loop) {
            this.repeatCount = Infinity;
        } else {
            this.repeatCount = 1;
        }

        this._commonTargetStatuses = clip.commonTargets.map((commonTarget, index) => {
            const target = createBufferedTarget(root, commonTarget.modifiers, commonTarget.valueAdapter);
            if (target === null) {
                return null;
            } else {
                return {
                    target,
                    changed: false,
                };
            }
        });

        if (!propertyCurves) {
            propertyCurves = clip.getPropertyCurves();
        }
        for (let iPropertyCurve = 0; iPropertyCurve < propertyCurves.length; ++iPropertyCurve) {
            const propertyCurve = propertyCurves[iPropertyCurve];
            let samplerSharedGroup = this._samplerSharedGroups.find((value) => value.sampler === propertyCurve.sampler);
            if (!samplerSharedGroup) {
                samplerSharedGroup = makeSamplerSharedGroup(propertyCurve.sampler);
                this._samplerSharedGroups.push(samplerSharedGroup);
            }

            let rootTarget: any;
            if (typeof propertyCurve.commonTarget === 'undefined') {
                rootTarget = root;
            } else {
                const commonTargetStatus = this._commonTargetStatuses[propertyCurve.commonTarget];
                if (!commonTargetStatus) {
                    continue;
                }
                rootTarget = commonTargetStatus.target.peek();
            }

            let boundTarget: IBoundTarget | null = null;
            if (!isSkeletonCurve(propertyCurve) || !this._blendStateBuffer) {
                boundTarget = createBoundTarget(rootTarget, propertyCurve.modifiers, propertyCurve.valueAdapter);
            } else {
                const targetNode = evaluatePath(rootTarget, ...propertyCurve.modifiers.slice(0, propertyCurve.modifiers.length - 1));
                if (targetNode !== null && targetNode instanceof Node) {
                    const propertyName = propertyCurve.modifiers[propertyCurve.modifiers.length - 1] as 'position' | 'rotation' | 'scale';
                    const blendStateWriter = createBlendStateWriter(
                        this._blendStateBuffer,
                        targetNode,
                        propertyName,
                        this,
                        propertyCurve.curve.constant(),
                    );
                    this._blendStateWriters.push(blendStateWriter);
                    boundTarget = createBoundTarget(rootTarget, [], blendStateWriter);
                }
            }

            if (boundTarget === null) {
                // warn(`Failed to bind "${root.name}" to curve in clip ${clip.name}: ${err}`);
            } else {
                const curveInstance = new ICurveInstance(
                    propertyCurve,
                    rootTarget,
                    boundTarget,
                );
                curveInstance.commonTargetIndex = propertyCurve.commonTarget;
                samplerSharedGroup.curves.push(curveInstance);
            }
        }
    }

    public destroy () {
        this._destroyBlendStateWriters();
    }

    /**
     * @zh
     * 是否允许触发 `LastFrame` 事件。
     * @en
     * Whether `LastFrame` should be triggered.
     * @param allowed True if the last frame events may be triggered.
     * @param aspect DO NOT pass this argument. It indicates who fired the 'allowLastFrameEvent' request:
     * either from `AnimationState` itself or from `AnimationComponent`.
     * Because both `AnimationState` and `AnimationComponent` can subscribe to the 'last-frame' event or not.
     * We should distinguish here to keep them isolated.
     */
    public allowLastFrameEvent (allowed: boolean, aspect: number = 1) {
        if (allowed) {
            this._allowLastFrameEventMask |= (1 << aspect);
        } else {
            this._allowLastFrameEventMask &= ~(1 << aspect);
        }
    }

    public on<TFunction extends Function> (type: string, callback: TFunction, thisArg?: any) {
        if (type === EventType.LASTFRAME ||
            type === EventType.LAST_FRAME_ARRIVED) {
            this.allowLastFrameEvent(true, stateAspect);
        }
        return super.once(type, callback, thisArg);
    }

    public once<TFunction extends Function> (type: string, callback: TFunction, thisArg?: any) {
        if (type === EventType.LASTFRAME ||
            type === EventType.LAST_FRAME_ARRIVED) {
            this.allowLastFrameEvent(true, stateAspect);
        }
        return super.once(type, callback, thisArg);
    }

    public off<TFunction extends Function> (type: string, callback?: TFunction, thisArg?: any) {
        super.off(type, callback, thisArg);
        if ((type === EventType.LASTFRAME ||
            type === EventType.LAST_FRAME_ARRIVED) &&
            this.hasEventListener(type)) {
            this.allowLastFrameEvent(false, stateAspect);
        }
    }

    public _setEventTarget (target) {
        this._target = target;
    }

    public setTime (time: number) {
        this._currentFramePlayed = false;
        this.time = time || 0;

        if (!EDITOR) {
            this._lastWrapInfoEvent = null;
            this._ignoreIndex = InvalidIndex;

            const info = this.getWrappedInfo(time, this._wrappedInfo);
            const direction = info.direction;
            let frameIndex = this._clip.getEventGroupIndexAtRatio(info.ratio);

            // only ignore when time not on a frame index
            if (frameIndex < 0) {
                frameIndex = ~frameIndex - 1;

                // if direction is inverse, then increase index
                if (direction < 0) { frameIndex += 1; }

                this._ignoreIndex = frameIndex;
            }
        }
    }

    public update (delta: number) {
        // calculate delay time

        if (this._delayTime > 0) {
            this._delayTime -= delta;
            if (this._delayTime > 0) {
                // still waiting
                return;
            }
        }

        // make first frame perfect

        // var playPerfectFirstFrame = (this.time === 0);
        if (this._currentFramePlayed) {
            this.time += (delta * this.speed);
        }
        else {
            this._currentFramePlayed = true;
        }

        this._process();
    }

    public _needReverse (currentIterations: number) {
        const wrapMode = this.wrapMode;
        let needReverse = false;

        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
            const isEnd = currentIterations - (currentIterations | 0) === 0;
            if (isEnd && (currentIterations > 0)) {
                currentIterations -= 1;
            }

            const isOddIteration = currentIterations & 1;
            if (isOddIteration) {
                needReverse = !needReverse;
            }
        }
        if ((wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse) {
            needReverse = !needReverse;
        }
        return needReverse;
    }

    public getWrappedInfo (time: number, info?: WrappedInfo) {
        info = info || new WrappedInfo();

        let stopped = false;
        const duration = this.duration;
        const repeatCount = this.repeatCount;

        let currentIterations = time > 0 ? (time / duration) : -(time / duration);
        if (currentIterations >= repeatCount) {
            currentIterations = repeatCount;

            stopped = true;
            let tempRatio = repeatCount - (repeatCount | 0);
            if (tempRatio === 0) {
                tempRatio = 1;  // 如果播放过，动画不复位
            }
            time = tempRatio * duration * (time > 0 ? 1 : -1);
        }

        if (time > duration) {
            const tempTime = time % duration;
            time = tempTime === 0 ? duration : tempTime;
        }
        else if (time < 0) {
            time = time % duration;
            if (time !== 0) { time += duration; }
        }

        let needReverse = false;
        const shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
        if (shouldWrap) {
            needReverse = this._needReverse(currentIterations);
        }

        let direction = needReverse ? -1 : 1;
        if (this.speed < 0) {
            direction *= -1;
        }

        // calculate wrapped time
        if (shouldWrap && needReverse) {
            time = duration - time;
        }

        info.ratio = time / duration;
        info.time = time;
        info.direction = direction;
        info.stopped = stopped;
        info.iterations = currentIterations;

        return info;
    }

    public sample () {
        const info = this.getWrappedInfo(this.time, this._wrappedInfo);
        this._sampleCurves(info.ratio);
        if (!EDITOR) {
            this._sampleEvents(info);
        }
        return info;
    }

    public process () {
        // sample
        const info = this.sample();

        if (this._allowLastFrameEventMask) {
            let lastInfo;
            if (!this._lastWrapInfo) {
                lastInfo = this._lastWrapInfo = new WrappedInfo(info);
            } else {
                lastInfo = this._lastWrapInfo;
            }

            if (this.repeatCount > 1 && ((info.iterations | 0) > (lastInfo.iterations | 0))) {
                this._delayEmit(EventType.LASTFRAME, this);
                this._delayEmit(EventType.LAST_FRAME_ARRIVED, this);
            }

            lastInfo.set(info);
        }

        if (info.stopped) {
            this.stop();
            this._delayEmit(EventType.FINISHED, this);
            this._delayEmit(EventType.LAST_FRAME_ARRIVED, this);
        }
    }

    public simpleProcess () {
        const duration = this.duration;
        let time = this.time % duration;
        if (time < 0) { time += duration; }
        const ratio = time / duration;
        this._sampleCurves(ratio);

        if (!EDITOR) {
            if (this._clip.hasEvents()) {
                this._sampleEvents(this.getWrappedInfo(this.time, this._wrappedInfo));
            }
        }

        if (this._allowLastFrameEventMask) {
            if (this._lastIterations === undefined) {
                this._lastIterations = ratio;
            }

            if ((this.time > 0 && this._lastIterations > ratio) || (this.time < 0 && this._lastIterations < ratio)) {
                this._delayEmit(EventType.LASTFRAME, this);
                this._delayEmit(EventType.LAST_FRAME_ARRIVED, this);
            }

            this._lastIterations = ratio;
        }
    }

    public cache (frames: number) {
    }

    protected onPlay () {
        this.setTime(0);
        this._delayTime = this._delay;
        this._onReplayOrResume();
        this._delayEmit(EventType.PLAY, this);
    }

    protected onStop () {
        if (!this.isPaused) {
            this._onPauseOrStop();
        }
        this._delayEmit(EventType.STOP, this);
    }

    protected onResume () {
        this._onReplayOrResume();
        this._delayEmit(EventType.RESUME, this);
    }

    protected onPause () {
        this._onPauseOrStop();
        this._delayEmit(EventType.PAUSE, this);
    }

    protected _sampleCurves (ratio: number) {
        // Before we sample, we pull values of common targets.
        for (let iCommonTarget = 0; iCommonTarget < this._commonTargetStatuses.length; ++iCommonTarget) {
            const commonTargetStatus = this._commonTargetStatuses[iCommonTarget];
            if (!commonTargetStatus) {
                continue;
            }
            commonTargetStatus.target.pull();
            commonTargetStatus.changed = false;
        }

        for (let iSamplerSharedGroup = 0, szSamplerSharedGroup = this._samplerSharedGroups.length;
            iSamplerSharedGroup < szSamplerSharedGroup; ++iSamplerSharedGroup) {
            const samplerSharedGroup = this._samplerSharedGroups[iSamplerSharedGroup];
            const sampler = samplerSharedGroup.sampler;
            const { samplerResultCache } = samplerSharedGroup;
            let index: number = 0;
            let lerpRequired = false;
            if (!sampler) {
                index = 0;
            } else {
                index = sampler.sample(ratio);
                if (index < 0) {
                    index = ~index;
                    if (index <= 0) {
                        index = 0;
                    } else if (index >= sampler.ratios.length) {
                        index = sampler.ratios.length - 1;
                    } else {
                        lerpRequired = true;
                        samplerResultCache.from = index - 1;
                        samplerResultCache.fromRatio = sampler.ratios[samplerResultCache.from];
                        samplerResultCache.to = index;
                        samplerResultCache.toRatio = sampler.ratios[samplerResultCache.to];
                        index = samplerResultCache.from;
                    }
                }
            }

            for (let iCurveInstance = 0, szCurves = samplerSharedGroup.curves.length;
                iCurveInstance < szCurves; ++iCurveInstance) {
                const curveInstance = samplerSharedGroup.curves[iCurveInstance];
                curveInstance.applySample(ratio, index, lerpRequired, samplerResultCache, this.weight);
                if (curveInstance.commonTargetIndex !== undefined) {
                    const commonTargetStatus = this._commonTargetStatuses[curveInstance.commonTargetIndex];
                    if (commonTargetStatus) {
                        commonTargetStatus.changed = true;
                    }
                }
            }
        }

        // After sample, we push values of common targets.
        for (let iCommonTarget = 0; iCommonTarget < this._commonTargetStatuses.length; ++iCommonTarget) {
            const commonTargetStatus = this._commonTargetStatuses[iCommonTarget];
            if (!commonTargetStatus) {
                continue;
            }
            if (commonTargetStatus.changed) {
                commonTargetStatus.target.push();
            }
        }
    }

    private _sampleEvents (wrapInfo: WrappedInfo) {
        const length = this._clip.eventGroups.length;
        let direction = wrapInfo.direction;
        let eventIndex = this._clip.getEventGroupIndexAtRatio(wrapInfo.ratio);
        if (eventIndex < 0) {
            eventIndex = ~eventIndex - 1;
            // If direction is inverse, increase index.
            if (direction < 0) {
                eventIndex += 1;
            }
        }

        if (this._ignoreIndex !== eventIndex) {
            this._ignoreIndex = InvalidIndex;
        }

        wrapInfo.frameIndex = eventIndex;

        if (!this._lastWrapInfoEvent) {
            this._fireEvent(eventIndex);
            this._lastWrapInfoEvent = new WrappedInfo(wrapInfo);
            return;
        }

        const wrapMode = this.wrapMode;
        const currentIterations = wrapIterations(wrapInfo.iterations);

        const lastWrappedInfo = this._lastWrapInfoEvent;
        let lastIterations = wrapIterations(lastWrappedInfo.iterations);
        let lastIndex = lastWrappedInfo.frameIndex;
        const lastDirection = lastWrappedInfo.direction;

        const iterationsChanged = lastIterations !== -1 && currentIterations !== lastIterations;

        if (lastIndex === eventIndex && iterationsChanged && length === 1) {
            this._fireEvent(0);
        } else if (lastIndex !== eventIndex || iterationsChanged) {
            direction = lastDirection;

            do {
                if (lastIndex !== eventIndex) {
                    if (direction === -1 && lastIndex === 0 && eventIndex > 0) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = length;
                        }
                        lastIterations++;
                    } else if (direction === 1 && lastIndex === length - 1 && eventIndex < length - 1) {
                        if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = -1;
                        }
                        lastIterations++;
                    }

                    if (lastIndex === eventIndex) {
                        break;
                    }
                    if (lastIterations > currentIterations) {
                        break;
                    }
                }

                lastIndex += direction;

                cc.director.getAnimationManager().pushDelayEvent(this._fireEvent, this, [lastIndex]);
            } while (lastIndex !== eventIndex && lastIndex > -1 && lastIndex < length);
        }

        this._lastWrapInfoEvent.set(wrapInfo);
    }

    private _fireEvent (index: number) {
        if (!this._targetNode || !this._targetNode.isValid) {
            return;
        }

        const { eventGroups } = this._clip;
        if (index < 0 || index >= eventGroups.length || this._ignoreIndex === index) {
            return;
        }

        const eventGroup = eventGroups[index];
        const components = this._targetNode.components;
        for (const event of eventGroup.events) {
            const { functionName } = event;
            for (const component of components) {
                const fx = component[functionName];
                if (typeof fx === 'function') {
                    fx.apply(component, event.parameters);
                }
            }
        }
    }

    private _onReplayOrResume () {
        if (!this._isBlendStateWriterInitialized) {
            for (let iBlendStateWriter = 0; iBlendStateWriter < this._blendStateWriters.length; ++iBlendStateWriter) {
                this._blendStateWriters[iBlendStateWriter].initialize();
            }
            this._isBlendStateWriterInitialized = true;
        }
        cc.director.getAnimationManager().addAnimation(this);
    }

    private _onPauseOrStop () {
        cc.director.getAnimationManager().removeAnimation(this);
    }

    private _destroyBlendStateWriters () {
        for (let iBlendStateWriter = 0; iBlendStateWriter < this._blendStateWriters.length; ++iBlendStateWriter) {
            this._blendStateWriters[iBlendStateWriter].destroy();
        }
        this._blendStateWriters.length = 0;
        this._isBlendStateWriterInitialized = false;
    }

    private _delayEmit (...args: any[]) {
        cc.director.getAnimationManager().pushDelayEvent(this._emit, this, args);
    }

    private _emit (type: EventType, state: AnimationState) {
        if (state === this) {
            this.emit(type);
        }
        if (this._target && this._target.isValid) {
            this._target.emit(type, type, state);
        }
    }
}

function isSkeletonCurve (curve: IRuntimeCurve) {
    let prs: string | undefined;
    if (curve.modifiers.length === 1 && typeof curve.modifiers[0] === 'string') {
        prs = curve.modifiers[0];
    } else if (curve.modifiers.length > 1) {
        for (let i = 0; i < curve.modifiers.length - 1; ++i) {
            if (!(curve.modifiers[i] instanceof HierarchyPath)) {
                return false;
            }
        }
        prs = curve.modifiers[curve.modifiers.length - 1] as string;
    }
    switch (prs) {
        case 'position':
        case 'scale':
        case 'rotation':
            return true;
        default:
            return false;
    }
}

function wrapIterations (iterations: number) {
    if (iterations - (iterations | 0) === 0) {
        iterations -= 1;
    }
    return iterations | 0;
}

cc.AnimationState = AnimationState;
