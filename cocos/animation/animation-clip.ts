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

import { ccclass, serializable } from 'cc.decorator';
import { DEBUG } from 'internal:constants';
import { Asset } from '../asset/assets/asset';
import { SpriteFrame } from '../2d/assets/sprite-frame';
import { errorID, warnID, cclegacy, js, geometry, approx, clamp, Mat4, Quat,
    Vec3, murmurhash2_32_gc, binarySearchEpsilon, assertIsTrue, RealCurve,
} from '../core';
import { SkelAnimDataHub } from '../3d/skeletal-animation/skeletal-animation-data-hub';
import { WrapMode as AnimationWrapMode, WrapMode } from './types';
import { Node } from '../scene-graph/node';
import type { PoseOutput } from './pose-output';
import * as legacy from './legacy-clip-data';
import { BAKE_SKELETON_CURVE_SYMBOL } from './internal-symbols';
import { Binder, RuntimeBinding, Track, TrackBinding, trackBindingTag, TrackEval, TrackPath, TrsTrackPath } from './tracks/track';
import { createEvalSymbol } from './define';
import { UntypedTrack, UntypedTrackRefine } from './tracks/untyped-track';
import { Range } from './tracks/utils';
import { ObjectTrack } from './tracks/object-track';
import type { ExoticAnimation } from './exotic-animation/exotic-animation';
import './exotic-animation/exotic-animation';
import type { AnimationMask } from './marionette/animation-mask';
import { getGlobalAnimationManager } from './global-animation-manager';
import { EmbeddedPlayableState, EmbeddedPlayer } from './embedded-player/embedded-player';
import { AuxiliaryCurveEntry } from './auxiliary-curve-entry';
import { removeIf } from '../core/utils/array';
import { invokeComponentMethodsEngagedInAnimationEvent } from './event/event-emitter';
import type { DataPoolManager } from '../3d/skeletal-animation/data-pool-manager';

export declare namespace AnimationClip {
    export interface IEvent {
        frame: number;
        func: string;
        params: string[];
    }

    /**
     * @internal
     */
    export type { legacy as _legacy };
}

// #region Tracks

// Export for test
export const searchForRootBonePathSymbol = Symbol('SearchForRootBonePath');

// #endregion

interface SkeletonAnimationBakeInfo {
    samples: number;

    frames: number;

    joints: Record<string, {
        transforms?: Mat4[];
    }>;
}

export const exoticAnimationTag = Symbol('ExoticAnimation');

export const embeddedPlayerCountTag = Symbol('[[EmbeddedPlayerCount]]');
export const getEmbeddedPlayersTag = Symbol('[[GetEmbeddedPlayers]]');
export const addEmbeddedPlayerTag = Symbol('[[AddEmbeddedPlayer]]');
export const removeEmbeddedPlayerTag = Symbol('[[RemoveEmbeddedPlayer]]');
export const clearEmbeddedPlayersTag = Symbol('[[ClearEmbeddedPlayers]]');

/**
 * Tag to access the additive settings associated on animation clip.
 */
export const additiveSettingsTag = Symbol('[[Additive Settings]]');

/**
 * @zh 动画剪辑表示一段使用动画编辑器编辑的关键帧动画或是外部美术工具生产的骨骼动画。
 * 它的数据主要被分为几层：轨道、关键帧和曲线。
 * @en The animation clip represents a sequence of key frame animation created with the animation editor or skeletal animation other DCC tools.
 * The data is divided in different levels: tracks, key frames, curves.
 */
@ccclass('cc.AnimationClip')
export class AnimationClip extends Asset {
    public static WrapMode = AnimationWrapMode;

    /**
     * @en Crate clip with a set of sprite frames
     * @zh 使用一组序列帧图片来创建动画剪辑
     * @example
     * ```
     * import { AnimationClip } from 'cc';
     * const clip = AnimationClip.createWithSpriteFrames(spriteFrames, 10);
     * ```
     */
    public static createWithSpriteFrames (spriteFrames: SpriteFrame[], sample: number): AnimationClip {
        const clip = new AnimationClip();
        clip.sample = sample || clip.sample;
        clip.duration = spriteFrames.length / clip.sample;
        const step = 1 / clip.sample;
        const track = new ObjectTrack<SpriteFrame>();
        track.path =  new TrackPath().toComponent('cc.Sprite').toProperty('spriteFrame');
        const curve = track.channels()[0].curve;
        curve.assignSorted(spriteFrames.map((spriteFrame, index) => [step * index, spriteFrame]));
        clip.addTrack(track);
        return clip;
    }

    /**
     * @zh 动画帧率，单位为帧/秒。注意此属性仅用于编辑器动画编辑。
     * @en Animation frame rate: frames per second.
     * Note this property is only used for animation editing in Editor.
     */
    @serializable
    public sample = 60;

    /**
     * @zh 动画的播放速度。
     * @en Animation playback speed.
     */
    @serializable
    public speed = 1;

    /**
     * @zh 动画的循环模式。
     * @en Animation loop mode.
     */
    @serializable
    public wrapMode = AnimationWrapMode.Normal;

    /**
     * Sets if node TRS curves in this animation can be blended.
     * Normally this flag is enabled for model animation and disabled for other case.
     * @internal This is an internal slot. Never use it in your code.
     */
    @serializable
    public enableTrsBlending = false;

    /**
     * @zh 动画的周期。
     * @en Animation duration.
     */
    get duration (): number {
        return this._duration;
    }

    set duration (value) {
        this._duration = value;
    }

    /**
     * @en
     * Gets the count of tracks this animation owns.
     * @zh
     * 获取此动画中的轨道数量。
     */
    get tracksCount (): number {
        return this._tracks.length;
    }

    /**
     * @en
     * Gets an iterable to tracks.
     * @zh
     * 获取可用于迭代轨道的对象。
     */
    get tracks (): Iterable<Track> {
        return this._tracks;
    }

    get hash (): number {
        // hashes should already be computed offline, but if not, make one
        if (this._hash) { return this._hash; }
        // Only hash exotic animations(including skeletal animations imported from model file).
        // The behavior is consistent with how `.hash` implemented prior to 3.3.
        const hashString = `Exotic:${this._exoticAnimation?.toHashString() ?? ''}`;
        return this._hash = murmurhash2_32_gc(hashString, 666);
    }

    /**
     * @zh 动画包含的事件数据。
     * @en Associated event data.
     */
    get events (): AnimationClip.IEvent[] {
        return this._events;
    }

    set events (value) {
        this._events = value;

        const ratios: number[] = [];
        const eventGroups: IAnimationEventGroup[] = [];
        const events = this.events.sort((a, b) => a.frame - b.frame);
        const nEvents = events.length;
        for (let iEvent = 0; iEvent < nEvents; ++iEvent) {
            const eventData = events[iEvent];
            const ratio = eventData.frame / this._duration;
            let i = ratios.findIndex((r) => r === ratio);
            if (i < 0) {
                i = ratios.length;
                ratios.push(ratio);
                eventGroups.push({
                    events: [],
                });
            }
            eventGroups[i].events.push({
                functionName: eventData.func,
                parameters: eventData.params,
            });
        }

        this._runtimeEvents = {
            ratios,
            eventGroups,
        };
    }

    get [exoticAnimationTag] (): ExoticAnimation | null {
        return this._exoticAnimation;
    }

    set [exoticAnimationTag] (value) {
        this._exoticAnimation = value;
    }

    /**
     * Gets if this animation clip contains additive animation.
     * @experimental
     */
    get isAdditive_experimental (): boolean {
        return this._additiveSettings.enabled;
    }

    /**
     * Accesses the additive animation settings.
     * @internal
     */
    get [additiveSettingsTag] (): AdditiveSettings {
        return this._additiveSettings;
    }

    public onLoaded (): void {
        this.frameRate = this.sample;
        this.events = this._events;
    }

    /**
     * @en
     * Counts the time range that the tracks within this animation span.
     * @zh
     * 获取此动画所有轨道占据的时间范围。
     * @returns The time range.
     */
    public range (): Range {
        const range: Range = { min: Infinity, max: -Infinity };
        const { _tracks: tracks } = this;
        const nTracks = tracks.length;
        for (let iTrack = 0; iTrack < nTracks; ++iTrack) {
            const track = tracks[iTrack];
            const trackRange = track.range();
            range.min = Math.min(range.min, trackRange.min);
            range.max = Math.max(range.max, trackRange.max);
        }
        return range;
    }

    /**
     * @en
     * Gets the specified track.
     * @zh
     * 获取指定的轨道。
     * @param index Index to the track.
     * @returns The track.
     */
    public getTrack (index: number): Track {
        return this._tracks[index];
    }

    /**
     * @en
     * Adds a track into this animation.
     * @zh
     * 添加一个轨道到此动画中。
     * @param track The track.
     * @returns Index to the track.
     */
    public addTrack (track: Track): number {
        const index = this._tracks.length;
        this._tracks.push(track);
        return index;
    }

    /**
     * @en
     * Removes a track from this animation.
     * @zh
     * 移除此动画中的指定轨道。
     * @param index Index to the track.
     */
    public removeTrack (index: number): void {
        this._tracks.splice(index, 1);
    }

    /**
     * @en
     * Removes all tracks from this animation.
     * @zh
     * 移除此动画的所有轨道。
     */
    public clearTracks (): void {
        this._tracks.length = 0;
    }

    /**
     * Returns if this clip has any event.
     * @internal Do not use this in your code.
     */
    public containsAnyEvent (): boolean {
        return this._events.length !== 0;
    }

    /**
     * Creates an event evaluator for this animation.
     * @param targetNode Target node used to fire events.
     * @internal Do not use this in your code.
     */
    public createEventEvaluator (targetNode: Node): EventEvaluator {
        return new EventEvaluator(
            targetNode,
            this._runtimeEvents.ratios,
            this._runtimeEvents.eventGroups,
            this.wrapMode,
        );
    }

    /**
     * Returns if this clip has any embedded player.
     * @internal Do not use this in your code.
     */
    public containsAnyEmbeddedPlayer (): boolean {
        return this._embeddedPlayers.length !== 0;
    }

    /**
     * Creates an embedded player evaluator for this animation.
     * @param targetNode Target node.
     * @internal Do not use this in your code.
     */
    public createEmbeddedPlayerEvaluator (targetNode: Node): EmbeddedPlayerEvaluation {
        return new EmbeddedPlayerEvaluation(
            this._embeddedPlayers,
            targetNode,
        );
    }

    /**
     * Creates an evaluator for this animation.
     * @param context The context.
     * @returns The evaluator.
     * @internal Do not use this in your code.
     */
    public createEvaluator (context: AnimationClipEvalContext): AnimationClipEvaluation {
        const {
            target,
        } = context;

        const binder: Binder = (binding: TrackBinding) => {
            if (context.mask && binding.isMaskedOff(context.mask)) {
                return undefined;
            }

            const trackTarget = binding.createRuntimeBinding(
                target,
                this.enableTrsBlending ? context.pose : undefined,
                false,
            );
            if (DEBUG && !trackTarget) {
                // If we got a null track target here, we should already have warn logged,
                // To elaborate on error details, we warn here as well.
                // Note: if in the future this log appears alone,
                // it must be a BUG which break promise by above statement.
                warnID(
                    3937,
                    this.name,
                    ((context.target instanceof Node) ? context.target.name : context.target) as string,
                );
            }
            return trackTarget ?? undefined;
        };

        return this._createEvalWithBinder(target, binder, context.rootMotion);
    }

    public destroy (): boolean {
        const dataPoolManager = cclegacy.director.root?.dataPoolManager as (DataPoolManager | null);
        if (dataPoolManager) {
            dataPoolManager.releaseAnimationClip(this);
        }
        SkelAnimDataHub.destroy(this);
        return super.destroy();
    }

    public [BAKE_SKELETON_CURVE_SYMBOL] (start: number, samples: number, frames: number): SkeletonAnimationBakeInfo {
        const step = 1.0 / samples;

        const animatedJoints = this._collectAnimatedJoints();
        const nAnimatedJoints = animatedJoints.length;

        const jointsBakeInfo: Record<string, {
            transforms: Mat4[];
        }> = {};
        for (let iAnimatedJoint = 0; iAnimatedJoint < nAnimatedJoints; ++iAnimatedJoint) {
            const joint = animatedJoints[iAnimatedJoint];
            jointsBakeInfo[joint] = {
                transforms: Array.from({ length: frames }, () => new Mat4()),
            };
        }

        const skeletonFrames = animatedJoints.reduce((result, joint) => {
            result[joint] = new BoneGlobalTransform();
            return result;
        }, {} as Record<string, BoneGlobalTransform>);
        for (const joint in skeletonFrames) {
            const skeletonFrame = skeletonFrames[joint];
            const parentJoint = joint.lastIndexOf('/');
            if (parentJoint >= 0) {
                const parentJointName = joint.substring(0, parentJoint);
                const parentJointFrame = skeletonFrames[parentJointName];
                // Parent joint can be nil since some of joints' parents
                // are not in animation list. For example, joints under socket nodes.
                if (parentJointFrame) {
                    skeletonFrame.parent = parentJointFrame;
                }
            }
        }

        const binder: Binder = (binding: TrackBinding) => {
            const trsPath = binding.parseTrsPath();
            if (!trsPath) {
                return undefined;
            }

            const jointFrame = skeletonFrames[trsPath.node];
            if (!jointFrame) {
                return undefined;
            }

            return createBoneTransformBinding(jointFrame, trsPath.property);
        };

        const evaluator = this._createEvalWithBinder(undefined, binder, undefined);

        for (let iFrame = 0; iFrame < frames; ++iFrame) {
            const time = start + step * iFrame;
            evaluator.evaluate(time);
            for (let iAnimatedJoint = 0; iAnimatedJoint < nAnimatedJoints; ++iAnimatedJoint) {
                const joint = animatedJoints[iAnimatedJoint];
                Mat4.copy(
                    jointsBakeInfo[joint].transforms[iFrame],
                    skeletonFrames[joint].globalTransform,
                );
            }
            for (let iAnimatedJoint = 0; iAnimatedJoint < nAnimatedJoints; ++iAnimatedJoint) {
                const joint = animatedJoints[iAnimatedJoint];
                skeletonFrames[joint].invalidate();
            }
        }

        return {
            samples,

            frames,

            joints: jointsBakeInfo,
        };
    }

    /**
     * Convert all untyped tracks into typed ones and delete the original.
     * @param refine How to decide the type on specified path.
     * @internal DO NOT USE THIS IN YOUR CODE.
     */
    public upgradeUntypedTracks (refine: UntypedTrackRefine): void {
        const newTracks: Track[] = [];
        const removals: Track[] = [];
        const { _tracks: tracks } = this;
        const nTracks = tracks.length;
        for (let iTrack = 0; iTrack < nTracks; ++iTrack) {
            const track = tracks[iTrack];
            if (!(track instanceof UntypedTrack)) {
                continue;
            }
            const newTrack = track.upgrade(refine);
            if (newTrack) {
                newTracks.push(newTrack);
                removals.push(track);
            }
        }
        const nRemovalTracks = removals.length;
        for (let iRemovalTrack = 0; iRemovalTrack < nRemovalTracks; ++iRemovalTrack) {
            js.array.remove(tracks, removals[iRemovalTrack]);
        }
        tracks.push(...newTracks);
    }

    /**
     * @internal Export for test.
     */
    public [searchForRootBonePathSymbol] (): string {
        return this._searchForRootBonePath();
    }

    // #region Legacy area
    // The following are significantly refactored and deprecated since 3.3.
    // We deprecates the direct exposure of keys, values, events.
    // Instead, we use track to organize them together.

    /**
     * @zh 曲线可引用的所有时间轴。
     * @en Frame keys referenced by curves.
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    get keys (): number[][] {
        return this._getLegacyData().keys;
    }

    set keys (value) {
        this._legacyDataDirty = true;
        this._getLegacyData().keys = value;
    }

    /**
     * @zh 此动画包含的所有曲线。
     * @en Curves this animation contains.
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    get curves (): legacy.LegacyClipCurve[] {
        this._legacyDataDirty = true;
        return this._getLegacyData().curves;
    }

    set curves (value) {
        this._getLegacyData().curves = value;
    }

    /**
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    get commonTargets (): legacy.LegacyCommonTarget[] {
        return this._getLegacyData().commonTargets;
    }

    set commonTargets (value) {
        this._legacyDataDirty = true;
        this._getLegacyData().commonTargets = value;
    }

    /**
     * @en
     * The animation's data.
     * @zh
     * 此动画的数据。
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    get data (): Uint8Array | null {
        return this._getLegacyData().data;
    }

    /**
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    public getPropertyCurves (): readonly legacy.LegacyRuntimeCurve[] {
        return this._getLegacyData().getPropertyCurves();
    }

    /**
     * @deprecated Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    get eventGroups (): readonly IAnimationEventGroup[] {
        return this._runtimeEvents.eventGroups;
    }

    /**
     * @zh 提交事件数据的修改。
     * 当你修改了 `this.events` 时，必须调用 `this.updateEventDatas()` 使修改生效。
     * @en
     * Commit event data update.
     * You should call this function after you changed the `events` data to take effect.
     * @deprecated Since V3.3. Please Assign to `this.events`.
     */
    public updateEventDatas (): void {
        this.events = this._events;
    }

    /**
     * @zh 返回本动画是否包含事件数据。
     * @en Returns if this animation contains event data.
     * @protected
     */
    public hasEvents (): boolean {
        return this.events.length !== 0;
    }

    /**
     * Migrates legacy data into tracks.
     * NOTE: This method tend to be used as internal purpose or patch.
     * DO NOT use it in your code since it might be removed for the future at any time.
     * @internal Since V3.3. Please reference to the track/channel/curve mechanism introduced in V3.3.
     */
    public syncLegacyData (): void {
        if (this._legacyData) {
            this._fromLegacy(this._legacyData);
            this._legacyData = undefined;
        }
    }

    // #endregion

    /**
     * @internal
     */
    get [embeddedPlayerCountTag] (): number {
        return this._embeddedPlayers.length;
    }

    /**
     * @internal
     */
    public [getEmbeddedPlayersTag] (): Iterable<EmbeddedPlayer> {
        return this._embeddedPlayers;
    }

    /**
     * @internal
     */
    public [addEmbeddedPlayerTag] (embeddedPlayer: EmbeddedPlayer): void {
        this._embeddedPlayers.push(embeddedPlayer);
    }

    /**
     * @internal
     */
    public [removeEmbeddedPlayerTag] (embeddedPlayer: EmbeddedPlayer): void {
        const iEmbeddedPlayer = this._embeddedPlayers.indexOf(embeddedPlayer);
        if (iEmbeddedPlayer >= 0) {
            this._embeddedPlayers.splice(iEmbeddedPlayer, 1);
        }
    }

    /**
     * @internal
     */
    public [clearEmbeddedPlayersTag] (): void {
        this._embeddedPlayers.length = 0;
    }

    /**
     * @zh 获取此动画剪辑中的辅助曲线数量。
     * @en Gets the count of auxiliary curves within this animation clip.
     */
    public get auxiliaryCurveCount_experimental (): number {
        return this._auxiliaryCurveEntries.length;
    }

    /**
     * @zh 返回此动画剪辑中所有辅助曲线的名称。
     * @en Returns names of all auxiliary curves within this animation clip.
     */
    public getAuxiliaryCurveNames_experimental (): readonly string[] {
        return this._auxiliaryCurveEntries.map((entry) => entry.name);
    }

    /**
     * @zh 返回此动画剪辑中是否存在指定的辅助曲线。
     * @en Returns if the specified auxiliary curve exists in this animation clip.
     */
    public hasAuxiliaryCurve_experimental (name: string): boolean {
        return !!this._findAuxiliaryCurveEntry(name);
    }

    /**
     * @zh 添加一条辅助曲线。如果已存在同名的辅助曲线，则直接返回。
     * @en Adds an auxiliary curve. Directly return if there is already such named auxiliary curve.
     * @param name @zh 辅助曲线的名称。@en The auxiliary curve's name.
     * @returns @zh 新增或已存在的辅助曲线。 @en The newly created or existing auxiliary curve.
     * @experimental
     */
    public addAuxiliaryCurve_experimental (name: string): RealCurve {
        let entry = this._findAuxiliaryCurveEntry(name);
        if (!entry) {
            entry = new AuxiliaryCurveEntry();
            entry.name = name;
            this._auxiliaryCurveEntries.push(entry);
        }
        return entry.curve;
    }

    /**
     * @zh 获取指定的辅助曲线。
     * @en Gets the specified auxiliary curve.
     * @param name @zh 辅助曲线的名称。@en The auxiliary curve's name.
     * @returns @zh 指定的辅助曲线。@en The specified auxiliary curve.
     * @experimental
     */
    public getAuxiliaryCurve_experimental (name: string): RealCurve {
        const entry = this._findAuxiliaryCurveEntry(name);
        assertIsTrue(entry);
        return entry.curve;
    }

    /**
     * @zh 重命名指定的辅助曲线。
     * @en Renames the specified auxiliary curve.
     * @param name @zh 要重命名的辅助曲线的名称。@en Name of the auxiliary curve to rename.
     * @param newName @zh 新名称。@en New name.
     */
    public renameAuxiliaryCurve_experimental (name: string, newName: string): void {
        const entry = this._findAuxiliaryCurveEntry(name);
        if (entry) {
            entry.name = newName;
        }
    }

    /**
     * @zh 移除指定的辅助曲线。
     * @en Removes the specified auxiliary curve.
     * @param name @zh 辅助曲线的名称。@en The auxiliary curve's name.
     * @experimental
     */
    public removeAuxiliaryCurve_experimental (name: string): void {
        removeIf(this._auxiliaryCurveEntries, (entry) => entry.name === name);
    }

    /**
     * @internal
     */
    public _trySyncLegacyData (): void {
        if (this._legacyDataDirty) {
            this._legacyDataDirty = false;
            this.syncLegacyData();
        }
    }

    @serializable
    private _duration = 0;

    @serializable
    private _hash = 0;

    private frameRate = 0;

    @serializable
    private _tracks: Track[] = [];

    @serializable
    private _exoticAnimation: ExoticAnimation | null = null;

    private _legacyData: legacy.AnimationClipLegacyData | undefined = undefined;

    private _legacyDataDirty = false;

    @serializable
    private _events: AnimationClip.IEvent[] = [];

    @serializable
    private _embeddedPlayers: EmbeddedPlayer[] = [];

    @serializable
    private _additiveSettings = new AdditiveSettings();

    @serializable
    private _auxiliaryCurveEntries: AuxiliaryCurveEntry[] = [];

    private _runtimeEvents: {
        ratios: number[];
        eventGroups: IAnimationEventGroup[];
    } = {
            ratios: [],
            eventGroups: [],
        };

    private _createEvalWithBinder (target: unknown, binder: Binder, rootMotionOptions: RootMotionOptions | undefined): AnimationClipEvaluation {
        if (this._legacyDataDirty) {
            this._legacyDataDirty = false;
            this.syncLegacyData();
        }

        const rootMotionTrackExcludes: Track[] = [];
        let rootMotionEvaluation: RootMotionEvaluation | undefined;
        if (rootMotionOptions) {
            rootMotionEvaluation = this._createRootMotionEvaluation(
                target,
                rootMotionOptions,
                rootMotionTrackExcludes,
            );
        }

        const trackEvalStatues: TrackEvalStatus<unknown>[] = [];
        let exoticAnimationEvaluator: ExoticAnimationEvaluator | undefined;

        const { _tracks: tracks } = this;
        const nTracks = tracks.length;
        for (let iTrack = 0; iTrack < nTracks; ++iTrack) {
            const track = tracks[iTrack];
            if (rootMotionTrackExcludes.includes(track)) {
                continue;
            }
            if (Array.from(track.channels()).every(({ curve }) => curve.keyFramesCount === 0)) {
                continue;
            }
            const runtimeBinding = binder(track[trackBindingTag]);
            if (!runtimeBinding) {
                continue;
            }

            let trackEval: TrackEval<unknown>;
            if (!(track instanceof UntypedTrack)) {
                trackEval = track[createEvalSymbol]();
            } else {
                // Handle untyped track specially.
                if (!runtimeBinding.getValue) {
                    // If we can not get a value from binding,
                    // we're not able to instantiate the untyped track.
                    // This matches the behavior prior to V3.3.
                    errorID(3930);
                    continue;
                }

                const hintValue = runtimeBinding.getValue();
                trackEval = track.createLegacyEval(hintValue);
            }

            trackEvalStatues.push(new TrackEvalStatus(runtimeBinding, trackEval));
        }

        if (this._exoticAnimation) {
            exoticAnimationEvaluator = this._exoticAnimation.createEvaluator(binder);
        }

        const evaluation = new AnimationClipEvaluation(
            trackEvalStatues,
            exoticAnimationEvaluator,
            rootMotionEvaluation,
        );

        return evaluation;
    }

    private _createRootMotionEvaluation (
        target: unknown,
        rootMotionOptions: RootMotionOptions,
        rootMotionTrackExcludes: Track[],
    ): RootMotionEvaluation | undefined {
        if (!(target instanceof Node)) {
            errorID(3920);
            return undefined;
        }

        const rootBonePath = this._searchForRootBonePath();
        if (!rootBonePath) {
            warnID(3923);
            return undefined;
        }

        const rootBone = target.getChildByPath(rootBonePath);
        if (!rootBone) {
            warnID(3924);
            return undefined;
        }

        // const { } = rootMotionOptions;

        const boneTransform = new BoneTransform();
        const rootMotionsTrackEvaluations: TrackEvalStatus<unknown>[] = [];
        const { _tracks: tracks } = this;
        const nTracks = tracks.length;
        for (let iTrack = 0; iTrack < nTracks; ++iTrack) {
            const track = tracks[iTrack];
            const { [trackBindingTag]: trackBinding } = track;
            const trsPath = trackBinding.parseTrsPath();
            if (!trsPath) {
                continue;
            }
            const bonePath = trsPath.node;
            if (bonePath !== rootBonePath) {
                continue;
            }
            rootMotionTrackExcludes.push(track);
            const property = trsPath.property;
            const runtimeBinding = createBoneTransformBinding(boneTransform, property);
            if (!runtimeBinding) {
                continue;
            }
            const trackEval = track[createEvalSymbol]();
            rootMotionsTrackEvaluations.push(new TrackEvalStatus(runtimeBinding, trackEval));
        }
        const rootMotionEvaluation = new RootMotionEvaluation(
            rootBone,
            this._duration,
            boneTransform,
            rootMotionsTrackEvaluations,
        );

        return rootMotionEvaluation;
    }

    private _searchForRootBonePath (): string {
        const paths = this._tracks.map((track) => {
            const trsPath = track[trackBindingTag].parseTrsPath();
            if (trsPath) {
                const nodePath = trsPath.node;
                return {
                    path: nodePath,
                    rank: nodePath.split('/').length,
                };
            } else {
                return {
                    path: '',
                    rank: 0,
                };
            }
        });

        paths.sort((a, b) => a.rank - b.rank);

        const iNonEmptyPath = paths.findIndex((p) => p.rank !== 0);
        if (iNonEmptyPath < 0) {
            return '';
        }

        const nPaths = paths.length;
        const firstPath = paths[iNonEmptyPath];
        let highestPathsAreSame = true;
        for (let iPath = iNonEmptyPath + 1; iPath < nPaths; ++iPath) {
            const path = paths[iPath];
            if (path.rank !== firstPath.rank) {
                break;
            }
            if (path.path !== firstPath.path) {
                highestPathsAreSame = false;
                break;
            }
        }

        return highestPathsAreSame ? firstPath.path : '';
    }

    private _getLegacyData (): legacy.AnimationClipLegacyData {
        if (!this._legacyData) {
            this._legacyData = this._toLegacy();
        }
        return this._legacyData;
    }

    private _toLegacy (): legacy.AnimationClipLegacyData {
        const keys: number[][] = [];
        const legacyCurves: legacy.LegacyClipCurve[] = [];
        const commonTargets: legacy.LegacyCommonTarget[] = [];

        const legacyClipData = new legacy.AnimationClipLegacyData(this._duration);
        legacyClipData.keys = keys;
        legacyClipData.curves = legacyCurves;
        legacyClipData.commonTargets = commonTargets;
        return legacyClipData;
    }

    private _fromLegacy (legacyData: legacy.AnimationClipLegacyData): void {
        const newTracks = legacyData.toTracks();
        const nNewTracks = newTracks.length;
        for (let iNewTrack = 0; iNewTrack < nNewTracks; ++iNewTrack) {
            this.addTrack(newTracks[iNewTrack]);
        }
    }

    private _collectAnimatedJoints (): string[] {
        const joints = new Set<string>();

        const { _tracks: tracks } = this;
        const nTracks = tracks.length;
        for (let iTrack = 0; iTrack < nTracks; ++iTrack) {
            const track = tracks[iTrack];
            const trsPath = track[trackBindingTag].parseTrsPath();
            if (trsPath) {
                joints.add(trsPath.node);
            }
        }

        if (this._exoticAnimation) {
            const animatedJoints = this._exoticAnimation.collectAnimatedJoints();
            const nAnimatedJoints = animatedJoints.length;
            for (let iAnimatedJoint = 0; iAnimatedJoint < nAnimatedJoints; ++iAnimatedJoint) {
                joints.add(animatedJoints[iAnimatedJoint]);
            }
        }

        return Array.from(joints);
    }

    private _findAuxiliaryCurveEntry (name: string): AuxiliaryCurveEntry | undefined {
        return this._auxiliaryCurveEntries.find((entry) => entry.name === name);
    }
}

@ccclass('cc.AnimationClipAdditiveSettings')
class AdditiveSettings {
    @serializable
    public enabled = false;

    @serializable
    public refClip: AnimationClip | null = null;
}

export { AdditiveSettings as AnimationClipAdditiveSettings };

type WrapMode_ = WrapMode;

export declare namespace AnimationClip {
    export type WrapMode = WrapMode_;
}

cclegacy.AnimationClip = AnimationClip;

class TrackEvalStatus<TValue> {
    constructor (binding: RuntimeBinding<TValue>, trackEval: TrackEval<TValue>) {
        this._binding = binding;
        this._trackEval = trackEval;
        this._shouldEvaluateDefault = !!binding.getValue && trackEval.requiresDefault;
    }

    public evaluate (time: number): void {
        const { _binding: binding, _trackEval: trackEval } = this;
        const defaultValue = this._shouldEvaluateDefault
            // See `this._shouldEvaluateDefault` for the assertion.
            ? (binding.getValue!)() as TValue extends unknown ? unknown : Readonly<TValue>
            : undefined;
        const value = trackEval.evaluate(time, defaultValue);
        binding.setValue(value);
    }

    private _binding: RuntimeBinding<TValue>;
    private _trackEval: TrackEval<TValue>;
    private _shouldEvaluateDefault = true;
}

interface AnimationClipEvalContext {
    /**
     * The output pose.
     */
    pose?: PoseOutput;

    /**
     * The root animating target(should be scene node now).
     */
    target: unknown;

    /**
     * The animation mask applied.
     */
    mask?: AnimationMask;

    /**
     * Path to the root bone.
     */
    rootMotion?: RootMotionOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RootMotionOptions {
}

type ExoticAnimationEvaluator = ReturnType<ExoticAnimation['createEvaluator']>;

class EmbeddedPlayerEvaluation {
    constructor (embeddedPlayers: ReadonlyArray<EmbeddedPlayer>, rootNode: Node) {
        this._embeddedPlayers = embeddedPlayers;
        this._embeddedPlayerEvaluationInfos = embeddedPlayers.map(
            (embeddedPlayer): EmbeddedPlayerEvaluation['_embeddedPlayerEvaluationInfos'][0] => {
                const { playable: player } = embeddedPlayer;
                if (!player) {
                    return null;
                }
                const instantiatedPlayer = player.instantiate(rootNode);
                if (!instantiatedPlayer) {
                    return null;
                }
                return {
                    instantiatedPlayer,
                    entered: false,
                    hostPauseTime: 0.0,
                    lastIterations: 0,
                };
            },
        );
    }

    public destroy (): void {
        const {
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayerEvaluationInfos.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            embeddedPlayerEvaluationInfos[iEmbeddedPlayer]?.instantiatedPlayer.destroy();
        }
        this._embeddedPlayerEvaluationInfos.length = 0;
    }

    /**
     * Evaluates the embedded players.
     * @param time The time([0, clipDuration]).
     * @param iterations The iterations the evaluation occurred. Should be integral.
     */
    public evaluate (time: number, iterations: number): void {
        assertIsTrue(Number.isInteger(iterations));
        const {
            _embeddedPlayers: embeddedPlayers,
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayers.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            const embeddedPlayerEvaluationInfo = embeddedPlayerEvaluationInfos[iEmbeddedPlayer];
            if (!embeddedPlayerEvaluationInfo) {
                continue;
            }
            const { entered, instantiatedPlayer, lastIterations } = embeddedPlayerEvaluationInfo;
            const { begin, end } = embeddedPlayers[iEmbeddedPlayer];
            const withinEmbeddedPlayer = time >= begin && time <= end;
            if (withinEmbeddedPlayer) {
                if (!entered) {
                    instantiatedPlayer.play();
                    embeddedPlayerEvaluationInfo.entered = true;
                } else if (iterations !== lastIterations) {
                    instantiatedPlayer.stop();
                    instantiatedPlayer.play();
                    embeddedPlayerEvaluationInfo.entered = true;
                }
            } else if (entered) {
                instantiatedPlayer.stop();
                embeddedPlayerEvaluationInfo.entered = false;
            }
            embeddedPlayerEvaluationInfo.lastIterations = iterations;
            if (embeddedPlayerEvaluationInfo.entered) {
                const playerTime = time - begin;
                embeddedPlayerEvaluationInfo.instantiatedPlayer.setTime(playerTime);
            }
        }
    }

    public notifyHostSpeedChanged (speed: number): void {
        // Transmit the speed to embedded players that want a reconciled speed.
        const {
            _embeddedPlayers: embeddedPlayers,
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayers.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            const embeddedPlayerEvaluationInfo = embeddedPlayerEvaluationInfos[iEmbeddedPlayer];
            if (!embeddedPlayerEvaluationInfo) {
                continue;
            }
            const { instantiatedPlayer } = embeddedPlayerEvaluationInfo;
            const { reconciledSpeed } = embeddedPlayers[iEmbeddedPlayer];
            if (reconciledSpeed) {
                instantiatedPlayer.setSpeed(speed);
            }
        }
    }

    /**
     * Notifies that the host has ran into **playing** state.
     * @param time The time where host ran into playing state.
     */
    public notifyHostPlay (time: number): void {
        // Host has switched to "playing", this can be happened when:
        // - Previous state is "stopped": we must have stopped all embedded players.
        // - Is pausing: we need to resume all embedded players.
        const {
            _embeddedPlayers: embeddedPlayers,
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayers.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            const embeddedPlayerEvaluationInfo = embeddedPlayerEvaluationInfos[iEmbeddedPlayer];
            if (!embeddedPlayerEvaluationInfo) {
                continue;
            }
            const { begin, end } = embeddedPlayers[iEmbeddedPlayer];
            const { instantiatedPlayer, entered } = embeddedPlayerEvaluationInfo;
            if (entered) {
                const { hostPauseTime } = embeddedPlayerEvaluationInfo;
                // We can resume the embedded player
                // only if the pause/play happened at the same time
                // or the embedded player supports random access.
                // Otherwise we have to say goodbye to that embedded player.
                if (instantiatedPlayer.randomAccess || approx(hostPauseTime, time, 1e-5)) {
                    const startTime = clamp(time, begin, end);
                    instantiatedPlayer.play();
                    instantiatedPlayer.setTime(startTime - begin);
                } else {
                    instantiatedPlayer.stop();
                }
            }
        }
    }

    /**
     * Notifies that the host has ran into **pause** state.
     */
    public notifyHostPause (time: number): void {
        // Host is paused, simply transmit this to embedded players.
        const {
            _embeddedPlayers: embeddedPlayers,
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayers.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            const embeddedPlayerEvaluationInfo = embeddedPlayerEvaluationInfos[iEmbeddedPlayer];
            if (!embeddedPlayerEvaluationInfo) {
                continue;
            }
            const { instantiatedPlayer, entered } = embeddedPlayerEvaluationInfo;
            if (entered) {
                instantiatedPlayer.pause();
                embeddedPlayerEvaluationInfo.hostPauseTime = time;
            }
        }
    }

    /**
     * Notifies that the host has ran into **stopped** state.
     */
    public notifyHostStop (): void {
        // Now that host is stopped, we stop all embedded players' playing
        // regardless of their progresses.
        const {
            _embeddedPlayers: embeddedPlayers,
            _embeddedPlayerEvaluationInfos: embeddedPlayerEvaluationInfos,
        } = this;
        const nEmbeddedPlayers = embeddedPlayers.length;
        for (let iEmbeddedPlayer = 0; iEmbeddedPlayer < nEmbeddedPlayers; ++iEmbeddedPlayer) {
            const embeddedPlayerEvaluationInfo = embeddedPlayerEvaluationInfos[iEmbeddedPlayer];
            if (!embeddedPlayerEvaluationInfo) {
                continue;
            }
            const { instantiatedPlayer, entered } = embeddedPlayerEvaluationInfo;
            if (entered) {
                embeddedPlayerEvaluationInfo.entered = false;
                instantiatedPlayer.stop();
            }
        }
    }

    private declare _embeddedPlayers: ReadonlyArray<EmbeddedPlayer>;

    private declare _embeddedPlayerEvaluationInfos: Array<null | {
        instantiatedPlayer: EmbeddedPlayableState;
        entered: boolean;
        hostPauseTime: number;
        lastIterations: number;
    }>;
}

class AnimationClipEvaluation {
    constructor (
        trackEvalStatuses: TrackEvalStatus<unknown>[],
        exoticAnimationEvaluator: ExoticAnimationEvaluator | undefined,
        rootMotionEvaluation: RootMotionEvaluation | undefined,
    ) {
        this._trackEvalStatues = trackEvalStatuses;
        this._exoticAnimationEvaluator = exoticAnimationEvaluator;
        this._rootMotionEvaluation = rootMotionEvaluation;
    }

    /**
     * Evaluates this animation.
     * @param time The time.
     */
    public evaluate (time: number): void {
        const {
            _trackEvalStatues: trackEvalStatuses,
            _exoticAnimationEvaluator: exoticAnimationEvaluator,
        } = this;

        const nTrackEvalStatuses = trackEvalStatuses.length;
        for (let iTrackEvalStatus = 0; iTrackEvalStatus < nTrackEvalStatuses; ++iTrackEvalStatus) {
            trackEvalStatuses[iTrackEvalStatus].evaluate(time);
        }

        if (exoticAnimationEvaluator) {
            exoticAnimationEvaluator.evaluate(time);
        }
    }

    /**
     * Gets the root bone motion.
     * @param startTime Start time.
     * @param endTime End time.
     */
    public evaluateRootMotion (time: number, motionLength: number): void {
        const { _rootMotionEvaluation: rootMotionEvaluation } = this;
        if (rootMotionEvaluation) {
            rootMotionEvaluation.evaluate(time, motionLength);
        }
    }

    private _exoticAnimationEvaluator: ExoticAnimationEvaluator | undefined;
    private _trackEvalStatues: TrackEvalStatus<unknown>[] = [];
    private _rootMotionEvaluation: RootMotionEvaluation | undefined = undefined;
}

class BoneTransform {
    public position = new Vec3();
    public scale = new Vec3(1.0, 1.0, 1.0);
    public rotation = new Quat();
    public eulerAngles = new Vec3();

    public getTransform (out: Mat4): void {
        Mat4.fromRTS(out, this.rotation, this.position, this.scale);
    }
}

class BoneGlobalTransform extends BoneTransform {
    public parent: BoneGlobalTransform | null = null;

    public get globalTransform (): Readonly<Mat4> {
        const transform = this._transform;
        if (this._dirty) {
            this._dirty = false;
            Mat4.fromRTS(transform, this.rotation, this.position, this.scale);
            if (this.parent) {
                Mat4.multiply(transform, this.parent.globalTransform, transform);
            }
        }
        return this._transform;
    }

    public invalidate (): void {
        this._dirty = true;
    }

    private _dirty = true;
    private _transform = new Mat4();
}

const motionTransformCache = new Mat4();

class RootMotionEvaluation {
    constructor (
        private _rootBone: Node,
        private _duration: number,
        private _boneTransform: BoneTransform,
        private _trackEvalStatuses: TrackEvalStatus<unknown>[],
    ) {

    }

    public evaluate (time: number, motionLength: number): void {
        const motionTransform = this._calcMotionTransform(time, motionLength, this._motionTransformCache);

        const {
            _translationMotionCache: translationMotion,
            _rotationMotionCache: rotationMotion,
            _scaleMotionCache: scaleMotion,
            _rootBone: rootBone,
        } = this;

        Mat4.toRTS(motionTransform, rotationMotion, translationMotion, scaleMotion);

        Vec3.add(translationMotion, translationMotion, rootBone.position);
        rootBone.setPosition(translationMotion);

        Quat.multiply(rotationMotion, rotationMotion, rootBone.rotation);
        rootBone.setRotation(rotationMotion);

        Vec3.multiply(scaleMotion, scaleMotion, rootBone.scale);
        rootBone.setScale(scaleMotion);
    }

    private _calcMotionTransform (time: number, motionLength: number, outTransform: Mat4): Mat4 {
        const { _duration: duration } = this;
        const remainLength = duration - time;
        assertIsTrue(remainLength >= 0);
        const startTransform = this._evaluateAt(time, this._startTransformCache);
        if (motionLength < remainLength) {
            const endTransform = this._evaluateAt(time + motionLength, this._endTransformCache);
            relativeTransform(outTransform, startTransform, endTransform);
        } else {
            Mat4.identity(outTransform);

            const accumulateMotionTransform = (from: Mat4, to: Mat4): void => {
                relativeTransform(motionTransformCache, from, to);
                Mat4.multiply(outTransform, outTransform, motionTransformCache);
            };

            const diff = motionLength - remainLength;
            const repeatCount = Math.floor(diff / duration);
            const lastRemainTime = diff - repeatCount * duration;
            const clipStartTransform = this._evaluateAt(0, this._initialTransformCache);
            const clipEndTransform = this._evaluateAt(duration, this._clipEndTransformCache);
            const endTransform = this._evaluateAt(lastRemainTime, this._endTransformCache);

            // Start -> Clip End
            accumulateMotionTransform(startTransform, clipEndTransform);

            // Whole clip x Repeat Count
            relativeTransform(motionTransformCache, clipStartTransform, clipEndTransform);
            for (let i = 0; i < repeatCount; ++i) {
                Mat4.multiply(outTransform, outTransform, motionTransformCache);
            }

            // Clip Start -> End
            accumulateMotionTransform(clipStartTransform, endTransform);
        }
        return outTransform;
    }

    private _evaluateAt (time: number, outTransform: Mat4): Mat4 {
        const {
            _trackEvalStatuses: trackEvalStatuses,
        } = this;

        const nTrackEvalStatuses = trackEvalStatuses.length;
        for (let iTrackEvalStatus = 0; iTrackEvalStatus < nTrackEvalStatuses; ++iTrackEvalStatus) {
            trackEvalStatuses[iTrackEvalStatus].evaluate(time);
        }

        this._boneTransform.getTransform(outTransform);
        return outTransform;
    }

    private _initialTransformCache = new Mat4();
    private _clipEndTransformCache = new Mat4();
    private _startTransformCache = new Mat4();
    private _endTransformCache = new Mat4();
    private _motionTransformCache = new Mat4();
    private _translationMotionCache = new Vec3();
    private _rotationMotionCache = new Quat();
    private _scaleMotionCache = new Vec3();
}

function relativeTransform (out: Mat4, from: Mat4, to: Mat4): void {
    Mat4.invert(out, from);
    Mat4.multiply(out, to, out);
}

function createBoneTransformBinding (boneTransform: BoneTransform, property: TrsTrackPath[1]):  {
    setValue(value: Vec3): void;
} | {
    setValue(value: Quat): void;
} | undefined {
    switch (property) {
    default:
        return undefined;
    case 'position':
        return {
            setValue (value: Vec3): void {
                Vec3.copy(boneTransform.position, value);
            },
        };
    case 'rotation':
        return {
            setValue (value: Quat): void {
                Quat.copy(boneTransform.rotation, value);
            },
        };
    case 'scale':
        return {
            setValue (value: Vec3): void {
                Vec3.copy(boneTransform.scale, value);
            },
        };
    case 'eulerAngles':
        return {
            setValue (value: Vec3): void {
                Vec3.copy(boneTransform.eulerAngles, value);
            },
        };
    }
}

// #region Events

interface IAnimationEvent {
    functionName: string;
    parameters: string[];
}

interface IAnimationEventGroup {
    events: IAnimationEvent[];
}

const InvalidIndex = -1;

class EventEvaluator {
    constructor (
        private _targetNode: Node,
        private _ratios: readonly number[],
        private _eventGroups: readonly IAnimationEventGroup[],
        private _wrapMode: WrapMode,
    ) {

    }

    public setWrapMode (wrapMode: WrapMode): void {
        this._wrapMode = wrapMode;
    }

    public ignore (ratio: number, direction: number): void {
        this._ignoreIndex = InvalidIndex;
        this._sampled = false;

        let frameIndex = getEventGroupIndexAtRatio(ratio, this._ratios);

        // only ignore when time not on a frame index
        if (frameIndex < 0) {
            frameIndex = ~frameIndex - 1;

            // if direction is inverse, then increase index
            if (direction < 0) { frameIndex += 1; }

            this._ignoreIndex = frameIndex;
        }
    }

    public reset (): void {
        this._lastFrameIndex = -1;
        this._lastIterations = 0.0;
        this._lastDirection = 0;
        this._ignoreIndex = InvalidIndex;
        this._sampled = false;
    }

    public sample (ratio: number, direction: number, iterations: number): void {
        if (this._eventGroups.length === 0) {
            return;
        }

        const length = this._eventGroups.length;
        let eventIndex = getEventGroupIndexAtRatio(ratio, this._ratios);
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

        if (!this._sampled) {
            this._sampled = true;
            this._doFire(eventIndex, false);
            this._lastFrameIndex = eventIndex;
            this._lastIterations = iterations;
            this._lastDirection = direction;
            return;
        }

        const wrapMode = this._wrapMode;
        const currentIterations = wrapIterations(iterations);

        let lastIterations = wrapIterations(this._lastIterations);
        let lastIndex = this._lastFrameIndex;
        const lastDirection = this._lastDirection;

        const iterationsChanged = lastIterations !== -1 && currentIterations !== lastIterations;

        if (lastIndex === eventIndex && iterationsChanged && length === 1) {
            this._doFire(0, false);
        } else if (lastIndex !== eventIndex || iterationsChanged) {
            direction = lastDirection;

            do {
                if (lastIndex !== eventIndex) {
                    if (direction === -1 && lastIndex === 0 && eventIndex > 0) {
                        if ((wrapMode & geometry.WrapModeMask.PingPong) === geometry.WrapModeMask.PingPong) {
                            direction *= -1;
                        } else {
                            lastIndex = length;
                        }
                        lastIterations++;
                    } else if (direction === 1 && lastIndex === length - 1 && eventIndex < length - 1) {
                        if ((wrapMode & geometry.WrapModeMask.PingPong) === geometry.WrapModeMask.PingPong) {
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
                this._doFire(lastIndex, true);
            } while (lastIndex !== eventIndex && lastIndex > -1 && lastIndex < length);
        }

        this._lastFrameIndex = eventIndex;
        this._lastIterations = iterations;
        this._lastDirection = direction;
    }

    private _lastFrameIndex = -1;
    private _lastIterations = 0.0;
    private _lastDirection = 0;
    private _ignoreIndex = InvalidIndex;
    private _sampled = false;

    private _doFire (eventIndex: number, delay: boolean): void {
        if (delay) {
            getGlobalAnimationManager().pushDelayEvent(this._checkAndFire, this, [eventIndex]);
        } else {
            this._checkAndFire(eventIndex);
        }
    }

    private _checkAndFire (eventIndex: number): void {
        if (!this._targetNode || !this._targetNode.isValid) {
            return;
        }

        const { _eventGroups: eventGroups } = this;
        if (eventIndex < 0 || eventIndex >= eventGroups.length || this._ignoreIndex === eventIndex) {
            return;
        }

        const eventGroup = eventGroups[eventIndex];
        const nEvents = eventGroup.events.length;
        for (let iEvent = 0; iEvent < nEvents; ++iEvent) {
            const event = eventGroup.events[iEvent];
            invokeComponentMethodsEngagedInAnimationEvent(this._targetNode, event.functionName, event.parameters);
        }
    }
}

function wrapIterations (iterations: number): number {
    if (iterations - (iterations | 0) === 0) {
        iterations -= 1;
    }
    return iterations | 0;
}

function getEventGroupIndexAtRatio (ratio: number, ratios: readonly number[]): number {
    const result = binarySearchEpsilon(ratios, ratio);
    return result;
}

// #endregion
