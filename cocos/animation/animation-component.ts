/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { ccclass, executeInEditMode, executionOrder, help, menu, type, serializable, editable } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW, TEST } from 'internal:constants';
import { Component } from '../scene-graph/component';
import { Eventify, warnID, js, cclegacy } from '../core';
import { AnimationClip } from './animation-clip';
import { AnimationState, AnimationStateEventType } from './animation-state';
import { CrossFade } from './cross-fade';

/**
 * @en
 * Animation component governs a group of animation states to control playback of the states.
 * For convenient, it stores a group of animation clips.
 * Each of those clips would have an associated animation state uniquely created.
 * Animation component is eventful, it dispatch a serials playback status events.
 * See [[EventType]].
 * @zh
 * 动画组件管理一组动画状态，控制它们的播放。
 * 为了方便，动画组件还存储了一组动画剪辑。
 * 每个剪辑都会独自创建一个关联的动画状态对象。
 * 动画组件具有事件特性，它会派发一系列播放状态相关的事件。
 * 参考 [[EventType]]
 */
@ccclass('cc.Animation')
@help('i18n:cc.Animation')
@executionOrder(99)
@executeInEditMode
@menu('Animation/Animation')
export class Animation extends Eventify(Component) {
    /**
     * @en
     * Gets or sets clips this component governs.
     * When set, associated animation state of each existing clip will be stopped.
     * If the existing default clip is not in the set of new clips, default clip will be reset to null.
     * @zh
     * 获取或设置此组件管理的剪辑。
     * 设置时，已有剪辑关联的动画状态将被停止；若默认剪辑不在新的动画剪辑中，将被重置为空。
     */
    @type([AnimationClip])
    get clips (): (AnimationClip | null)[] {
        return this._clips;
    }

    set clips (value) {
        if (this._crossFade) {
            this._crossFade.clear();
        }
        // Remove state for old automatic clips.
        this._clips.forEach((clip) => {
            if (clip) {
                this._removeStateOfAutomaticClip(clip);
            }
        });
        // Create state for new clips.
        value.forEach((clip) => {
            if (clip) {
                this.createState(clip);
            }
        });
        // Default clip should be in the list of automatic clips.
        const newDefaultClip = value.find((clip) => equalClips(clip, this._defaultClip));
        if (newDefaultClip) {
            this._defaultClip = newDefaultClip;
        } else {
            this._defaultClip = null;
        }

        this._clips = value;
    }

    /**
     * @en
     * Gets or sets the default clip.
     * Two clips that both have same non-empty UUID are treat as equivalent.
     * @zh
     * 获取或设置默认剪辑。
     * 设置时，若指定的剪辑不在 `this.clips` 中则会被自动添加至 `this.clips`。
     * 具有相同的非空 UUID 的两个动画剪辑将被视为是相同的。
     * @see [[playOnLoad]]
     */
    @type(AnimationClip)
    get defaultClip (): AnimationClip | null {
        return this._defaultClip;
    }

    set defaultClip (value) {
        this._defaultClip = value;
        if (!value) {
            return;
        }
        const isBoundedDefaultClip = this._clips.findIndex((clip) => equalClips(clip, value)) >= 0;
        if (!isBoundedDefaultClip) {
            this._clips.push(value);
            this.createState(value);
        }
    }

    public static EventType = AnimationStateEventType;

    /**
     * @en
     * Whether the default clip should get into playing when this components starts.
     * Note, this field takes no effect if `crossFade()` or `play()` has been called before this component starts.
     * @zh
     * 是否在组件开始运行时自动播放默认剪辑。
     * 注意，若在组件开始运行前调用了 `crossFade` 或 `play()`，此字段将不会生效。
     */
    @serializable
    @editable
    public playOnLoad = false;

    /**
     * @internal
     */
    protected _crossFade = new CrossFade();

    /**
     * @internal
     */
    protected _nameToState: Record<string, AnimationState> = js.createMap(true);

    /**
     * @internal
     */
    @type([AnimationClip])
    protected _clips: (AnimationClip | null)[] = [];

    /**
     * @internal
     */
    @serializable
    protected _defaultClip: AnimationClip | null = null;

    /**
     * Whether if `crossFade()` or `play()` has been called before this component starts.
     */
    private _hasBeenPlayed = false;

    public onLoad (): void {
        this.clips = this._clips;
        for (const stateName in this._nameToState) {
            const state = this._nameToState[stateName];
            state.initialize(this.node);
        }
    }

    public start (): void {
        if (!EDITOR_NOT_IN_PREVIEW && (this.playOnLoad && !this._hasBeenPlayed) && this._defaultClip) {
            this.crossFade(this._defaultClip.name, 0);
        }
    }

    public onEnable (): void {
        this._crossFade.resume();
    }

    public onDisable (): void {
        this._crossFade.pause();
    }

    public onDestroy (): void {
        this._crossFade.stop();
        for (const name in this._nameToState) {
            const state = this._nameToState[name];
            state.destroy();
        }
        this._nameToState = js.createMap(true);
    }

    /**
     * @en
     * Switch to play specified animation state, without fading.
     * @zh
     * 立即切换到指定动画状态。
     * @param name The name of the animation to be played, if absent, the default clip will be played
     */
    public play (name?: string): void {
        this._hasBeenPlayed = true;
        if (!name) {
            if (!this._defaultClip) {
                return;
            }
            name = this._defaultClip.name;
        }
        this.crossFade(name, 0);
    }

    /**
     * @en
     * Smoothly switch to play specified animation state.
     * @zh
     * 平滑地切换到指定动画状态。
     * @param name The name of the animation to switch to
     * @param duration The duration of the cross fade, default value is 0.3s
     */
    public crossFade (name: string, duration = 0.3): void {
        this._hasBeenPlayed = true;
        const state = this._nameToState[name];
        if (state) {
            this.doPlayOrCrossFade(state, duration);
        }
    }

    /**
     * @en
     * Pause all animation states and all switching.
     * @zh
     * 暂停所有动画状态，并暂停所有切换。
     */
    public pause (): void {
        this._crossFade.pause();
    }

    /**
     * @en
     * Resume all animation states and all switching.
     * @zh
     * 恢复所有动画状态，并恢复所有切换。
     */
    public resume (): void {
        this._crossFade.resume();
    }

    /**
     * @en
     * Stop all animation states and all switching.
     * @zh
     * 停止所有动画状态，并停止所有切换。
     */
    public stop (): void {
        this._crossFade.stop();
    }

    /**
     * @en
     * Get specified animation state.
     * @zh
     * 获取指定的动画状态。
     * @param name The name of the animation
     * @returns If no animation found, return null, otherwise the correspond animation state is returned
     */
    public getState (name: string): AnimationState {
        const state = this._nameToState[name];
        if (state && !state.curveLoaded) {
            state.initialize(this.node);
        }
        return state || null;
    }

    /**
     * @en
     * Creates a state for specified clip.
     * If there is already a clip with same name, the existing animation state will be stopped and overridden.
     * @zh
     * 使用指定的动画剪辑创建一个动画状态。
     * 若指定名称的动画状态已存在，已存在的动画状态将先被设为停止并被覆盖。
     * @param clip The animation clip
     * @param name The animation state name, if absent, the default clip's name will be used
     * @returns The animation state created
     */
    public createState (clip: AnimationClip, name?: string): AnimationState {
        name = name || clip.name;
        this.removeState(name);

        return this._doCreateState(clip, name);
    }

    /**
     * @en
     * Stops and removes specified clip.
     * @zh
     * 停止并移除指定的动画状态。
     * @param name The name of the animation state
     */
    public removeState (name: string): void {
        const state = this._nameToState[name];
        if (state) {
            state.allowLastFrameEvent(false);
            state.stop();
            delete this._nameToState[name];
        }
    }

    /**
     * @zh
     * 添加一个动画剪辑到 `this.clips`中并以此剪辑创建动画状态。
     * @en
     * Adds an animation clip into this component and creates a animation state for this clip.
     * @param clip The animation clip
     * @param name The animation state name, if absent, the default clip's name will be used
     * @returns The created animation state
     */
    public addClip (clip: AnimationClip, name?: string): AnimationState {
        if (!js.array.contains(this._clips, clip)) {
            this._clips.push(clip);
        }
        return this.createState(clip, name);
    }

    /**
     * @en
     * Remove clip from the animation list. This will remove the clip and any animation states based on it.<br>
     * If there are animation states depend on the clip are playing or clip is defaultClip, it will not delete the clip.<br>
     * But if force is true, then will always remove the clip and any animation states based on it. If clip is defaultClip,
     * defaultClip will be reset to null
     * @zh
     * 从动画列表中移除指定的动画剪辑，<br/>
     * 如果依赖于 clip 的 AnimationState 正在播放或者 clip 是 defaultClip 的话，默认是不会删除 clip 的。<br/>
     * 但是如果 force 参数为 true，则会强制停止该动画，然后移除该动画剪辑和相关的动画。这时候如果 clip 是 defaultClip，defaultClip 将会被重置为 null。<br/>
     * @param force - If force is true, then will always remove the clip and any animation states based on it.
     */
    public removeClip (clip: AnimationClip, force?: boolean): void {
        let removalState: AnimationState | undefined;
        for (const name in this._nameToState) {
            const state = this._nameToState[name];
            const stateClip = state.clip;
            if (stateClip === clip) {
                removalState = state;
                break;
            }
        }

        if (clip === this._defaultClip) {
            if (force) { this._defaultClip = null; } else {
                if (!TEST) { warnID(3902); }
                return;
            }
        }

        if (removalState && removalState.isPlaying) {
            if (force) { removalState.stop(); } else {
                if (!TEST) { warnID(3903); }
                return;
            }
        }

        this._clips = this._clips.filter((item) => item !== clip);

        if (removalState) {
            delete this._nameToState[removalState.name];
        }
    }

    /**
     * @en
     * Register animation event callback.<bg>
     * The event arguments will provide the AnimationState which emit the event.<bg>
     * When play an animation, will auto register the event callback to the AnimationState,<bg>
     * and unregister the event callback from the AnimationState when animation stopped.
     * @zh
     * 注册动画事件回调。<bg>
     * 回调的事件里将会附上发送事件的 AnimationState。<bg>
     * 当播放一个动画时，会自动将事件注册到对应的 AnimationState 上，停止播放时会将事件从这个 AnimationState 上取消注册。
     * @param type The event type to listen to
     * @param callback The callback when event triggered
     * @param target The callee when invoke the callback, could be absent
     * @return The registered callback
     * @example
     * ```ts
     * onPlay: function (type, state) {
     *     // callback
     * }
     *
     * // register event to all animation
     * animation.on('play', this.onPlay, this);
     * ```
     */
    public on<TFunction extends (...any) => void> (type: AnimationStateEventType, callback: TFunction, thisArg?: any, once?: boolean): TFunction {
        const ret = super.on(type, callback, thisArg, once);
        if (type === AnimationStateEventType.LASTFRAME) {
            this._syncAllowLastFrameEvent();
        }
        return ret;
    }

    public once<TFunction extends (...any) => void> (type: AnimationStateEventType, callback: TFunction, thisArg?: any): TFunction {
        const ret = super.once(type, callback, thisArg);
        if (type === AnimationStateEventType.LASTFRAME) {
            this._syncAllowLastFrameEvent();
        }
        return ret;
    }

    /**
     * @en
     * Unregister animation event callback.
     * @zh
     * 取消注册动画事件回调。
     * @param {String} type The event type to unregister
     * @param {Function} callback The callback to unregister
     * @param {Object} target The callee of the callback, could be absent
     * @example
     * ```ts
     * // unregister event to all animation
     * animation.off('play', this.onPlay, this);
     * ```
     */
    public off (type: AnimationStateEventType, callback?: (...any) => void, thisArg?: any): void {
        super.off(type, callback, thisArg);
        if (type === AnimationStateEventType.LASTFRAME) {
            this._syncDisallowLastFrameEvent();
        }
    }

    /**
     * @internal
     */
    protected _createState (clip: AnimationClip, name?: string): AnimationState {
        return new AnimationState(clip, name);
    }

    /**
     * @internal
     */
    protected _doCreateState (clip: AnimationClip, name: string): AnimationState {
        const state = this._createState(clip, name);
        state._setEventTarget(this);
        state.allowLastFrameEvent(this.hasEventListener(AnimationStateEventType.LASTFRAME));
        if (this.node) {
            state.initialize(this.node);
        }
        this._nameToState[state.name] = state;
        return state;
    }

    /**
     * @internal This method only friends to skeletal animation component.
     */
    protected doPlayOrCrossFade (state: AnimationState, duration: number): void {
        this._crossFade.play();
        this._crossFade.crossFade(state, duration);
    }

    private _removeStateOfAutomaticClip (clip: AnimationClip): void {
        for (const name in this._nameToState) {
            const state = this._nameToState[name];
            if (equalClips(clip, state.clip)) {
                state.stop();
                delete this._nameToState[name];
            }
        }
    }

    private _syncAllowLastFrameEvent (): void {
        if (this.hasEventListener(AnimationStateEventType.LASTFRAME)) {
            for (const stateName in this._nameToState) {
                this._nameToState[stateName].allowLastFrameEvent(true);
            }
        }
    }

    private _syncDisallowLastFrameEvent (): void {
        if (!this.hasEventListener(AnimationStateEventType.LASTFRAME)) {
            for (const stateName in this._nameToState) {
                this._nameToState[stateName].allowLastFrameEvent(false);
            }
        }
    }
}

type EventType_ = AnimationStateEventType;

export declare namespace Animation {
    export type EventType = EventType_;
}

function equalClips (clip1: AnimationClip | null, clip2: AnimationClip | null): string | boolean {
    if (clip1 === clip2) {
        return true;
    }
    return !!clip1 && !!clip2 && (clip1._uuid === clip2._uuid) && clip1._uuid;
}

cclegacy.Animation = Animation;

/**
 * Alias of [[Animation]]
 * @deprecated Since v1.2
 */
export { Animation as AnimationComponent };
cclegacy.AnimationComponent = Animation;
js.setClassAlias(Animation, 'cc.AnimationComponent');
