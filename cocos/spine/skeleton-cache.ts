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

import { TrackEntryListeners } from './track-entry-listeners';
import { vfmtPosUvColor4B, vfmtPosUvTwoColor4B, getAttributeStride } from '../2d/renderer/vertex-format';

import spine from './lib/spine-core';
import { SkeletonData } from './skeleton-data';
import { warn } from '../core/platform/debug';

const MaxCacheTime = 30;
const FrameTime = 1 / 60;
const _useTint = true;
const _byteStrideOneColor = getAttributeStride(vfmtPosUvColor4B);
const _byteStrideTwoColor = getAttributeStride(vfmtPosUvTwoColor4B);

export class FrameBoneInfo {
    a = 0;
    b = 0;
    c = 0;
    d = 0;
    worldX = 0;
    worldY = 0;
}

export interface SkeletonCacheItemInfo {
    skeleton: spine.Skeleton | null;
    clipper: spine.SkeletonClipping | null;
    state: spine.AnimationState | null;
    listener: TrackEntryListeners;
    curAnimationCache: AnimationCache | null;
    animationsCache: { [key: string]: AnimationCache };
    assetUUID: string;
}

class SpineModel {
    public vCount = 0;
    public iCount = 0;
    public vData: Uint8Array = null!;
    public iData: Uint16Array = null!;
    public meshes: SpineDrawItem[] = [];
}

class SpineDrawItem {
    public iCount = 0;
    public blendMode = 0;
    public textureID = 0;
}

export interface AnimationFrame {
    model: SpineModel;
    boneInfos: FrameBoneInfo[];
}

export class AnimationCache {
    protected _instance: spine.SkeletonInstance | null = null;
    protected _state: spine.AnimationState = null!;
    protected _skeletonData: spine.SkeletonData = null!;
    protected _skeleton: spine.Skeleton = null!;
    public _privateMode = false;
    protected _curIndex = -1;
    protected _isCompleted = false;
    protected _maxFrameIdex = 0;
    protected _frameIdx = -1;
    protected _inited = false;
    protected _invalid = true;
    protected _enableCacheAttachedInfo = false;
    protected _skeletonInfo: SkeletonCacheItemInfo | null = null;
    protected _animationName: string | null = null;
    public isCompleted = false;
    public totalTime = 0;
    public frames: AnimationFrame[] = [];

    constructor (data: spine.SkeletonData) {
        this._privateMode = false;
        this._inited = false;
        this._invalid = true;
        this._instance = new spine.SkeletonInstance();
        this._instance.isCache = true;
        this._skeletonData = data;
        this._skeleton = this._instance.initSkeleton(data);
        this._instance.setUseTint(_useTint);
    }

    public init (skeletonInfo: SkeletonCacheItemInfo, animationName: string): void {
        this._inited = true;
        this._animationName = animationName;
        this._skeletonInfo = skeletonInfo;
    }

    get skeleton (): spine.Skeleton {
        return this._skeleton;
    }

    public setSkin (skinName: string): void {
        if (this._skeleton) this._skeleton.setSkinByName(skinName);
        this._instance!.setSkin(skinName);
    }

    public setAnimation (animationName: string): void {
        const animations = this._skeletonData.animations;
        let animation: spine.Animation | null = null;
        animations.forEach((element): void => {
            if (element.name === animationName) {
                animation = element;
            }
        });
        if (!animation) {
            warn(`find no animation named ${animationName} !!!`);
            return;
        }
        this._maxFrameIdex = Math.floor((animation as any).duration / FrameTime);
        if (this._maxFrameIdex <= 0) this._maxFrameIdex = 1;
        this._instance!.setAnimation(0, animationName, false);
    }

    public updateToFrame (frameIdx: number): void {
        if (!this._inited) return;
        this.begin();
        if (!this.needToUpdate(frameIdx)) return;
        do {
            // Solid update frame rate 1/60.
            this._frameIdx++;
            this.totalTime += FrameTime;
            this._instance!.updateAnimation(FrameTime);
            const model = this._instance!.updateRenderData();
            this.updateRenderData(this._frameIdx, model);
            if (this._frameIdx >= this._maxFrameIdex) {
                this.isCompleted = true;
            }
        } while (this.needToUpdate(frameIdx));
    }

    public getFrame (frameIdx: number): AnimationFrame {
        const index = frameIdx % this._maxFrameIdex;
        return this.frames[index];
    }

    public invalidAnimationFrames (): void {
        this._curIndex = -1;
        this._isCompleted = false;
        this.frames.length = 0;
    }

    private updateRenderData (index: number, model: any): void {
        const vc: number = model.vCount;
        const ic: number = model.iCount;
        const floatStride = (_useTint ?  _byteStrideTwoColor : _byteStrideOneColor) / Float32Array.BYTES_PER_ELEMENT;
        const vUint8Buf = new Uint8Array(Float32Array.BYTES_PER_ELEMENT * floatStride * vc);
        const iUint16Buf = new Uint16Array(ic);

        const HEAPU8: Uint8Array = spine.wasmUtil.wasm.HEAPU8;
        const vPtr = model.vPtr;
        const vLength = vc * Float32Array.BYTES_PER_ELEMENT * floatStride;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        vUint8Buf.set(HEAPU8.subarray(vPtr, vPtr + vLength));

        const iPtr = model.iPtr;
        const iLength = Uint16Array.BYTES_PER_ELEMENT * ic;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        const iUint8Buf = new Uint8Array(iUint16Buf.buffer);
        iUint8Buf.set(HEAPU8.subarray(iPtr, iPtr + iLength));

        const modelData = new SpineModel();
        modelData.vCount = vc;
        modelData.iCount = ic;
        modelData.vData = vUint8Buf;
        modelData.iData = iUint16Buf;

        const data = model.getData();
        const textures = model.getTextures();
        const count = data.size();
        for (let i = 0; i < count; i += 5) {
            const meshData = new SpineDrawItem();
            meshData.iCount = data.get(i + 3);
            meshData.blendMode = data.get(i + 4);
            meshData.textureID = textures.get(i / 5);
            modelData.meshes.push(meshData);
        }

        const bones = this._skeleton.bones;
        const boneInfosArray: FrameBoneInfo[] = [];
        bones.forEach((bone): void => {
            const boneInfo = new FrameBoneInfo();
            boneInfo.a = bone.a;
            boneInfo.b = bone.b;
            boneInfo.c = bone.c;
            boneInfo.d = bone.d;
            boneInfo.worldX = bone.worldX;
            boneInfo.worldY = bone.worldY;
            boneInfosArray.push(boneInfo);
        });
        this.frames[index] = {
            model: modelData,
            boneInfos: boneInfosArray,
        };
    }

    public begin (): void {
        if (!this._invalid) return;

        const skeletonInfo = this._skeletonInfo;
        const preAnimationCache = skeletonInfo?.curAnimationCache;

        if (preAnimationCache && preAnimationCache !== this) {
            if (this._privateMode) {
                // Private cache mode just invalid pre animation frame.
                preAnimationCache.invalidAllFrame();
            } else {
                // If pre animation not finished, play it to the end.
                preAnimationCache.updateToFrame(0);
            }
        }
        const listener = skeletonInfo?.listener;
        this._instance!.setAnimation(0, this._animationName!, false);
        this.bind(listener!);

        // record cur animation cache
        skeletonInfo!.curAnimationCache = this;
        this._frameIdx = -1;
        this.isCompleted = false;
        this.totalTime = 0;
        this._invalid = false;
    }

    public end (): void {
        if (!this.needToUpdate()) {
            // clear cur animation cache
            this._skeletonInfo!.curAnimationCache = null;
            this.frames.length = this._frameIdx + 1;
            this.isCompleted = true;
            this.unbind(this._skeletonInfo!.listener);
        }
    }

    public bind (listener: TrackEntryListeners): void {
        const completeHandle = (entry: spine.TrackEntry): void => {
            if (entry && entry.animation.name === this._animationName) {
                this.isCompleted = true;
            }
        };

        listener.complete = completeHandle;
    }

    public unbind (listener: TrackEntryListeners): void {
        (listener as any).complete = null;
    }

    protected needToUpdate (toFrameIdx?: number): boolean {
        return !this.isCompleted
            && this.totalTime < MaxCacheTime
            && (toFrameIdx === undefined || this._frameIdx < toFrameIdx);
    }

    public isInited (): boolean {
        return this._inited;
    }

    public isInvalid (): boolean {
        return this._invalid;
    }

    public invalidAllFrame (): void {
        this.isCompleted = false;
        this._invalid = true;
    }

    public enableCacheAttachedInfo (): void {
        if (!this._enableCacheAttachedInfo) {
            this._enableCacheAttachedInfo = true;
            this.invalidAllFrame();
        }
    }

    // Clear texture quote.
    public clear (): void {
        this._inited = false;
        this.invalidAllFrame();
    }

    public destroy (): void {
        if (this._instance) {
            this._instance.destroy();
            this._instance = null;
        }
    }
}

class SkeletonCache {
    public static readonly FrameTime = FrameTime;
    public static sharedCache = new SkeletonCache();

    protected _privateMode: boolean;
    protected _skeletonCache: { [key: string]: SkeletonCacheItemInfo };

    //for shared mode only
    protected _animationPool: { [key: string]: AnimationCache };
    //for shared mode only, key is asset uuid and value is ref count.
    private _sharedCacheMap: Map<string, number> = new Map<string, number>();
    constructor () {
        this._privateMode = false;
        this._animationPool = {};
        this._skeletonCache = {};
    }

    public enablePrivateMode (): void {
        this._privateMode = true;
    }

    public clear (): void {
        this._animationPool = {};
        this._skeletonCache = {};
    }

    public invalidAnimationCache (uuid: string): void {
        const skeletonInfo = this._skeletonCache[uuid];
        const skeleton = skeletonInfo && skeletonInfo.skeleton;
        if (!skeleton) return;

        const animationsCache = skeletonInfo.animationsCache;
        for (const aniKey in animationsCache) {
            const animationCache = animationsCache[aniKey];
            animationCache.invalidAllFrame();
        }
    }

    public destroySkeleton (assetUuid: string): void {
        if (!this._privateMode) {
            let refCount = this._sharedCacheMap.get(assetUuid);
            if (refCount) {
                refCount -= 1;
                if (refCount > 0) {
                    this._sharedCacheMap.set(assetUuid, refCount);
                    return;
                }
                this._sharedCacheMap.delete(assetUuid);
            }
        }

        const skeletonInfo = this._skeletonCache[assetUuid];
        if (!skeletonInfo) return;

        const sharedOperate = (aniKey: string, animationCache: AnimationCache): void => {
            this._animationPool[`${assetUuid}#${aniKey}`] = animationCache;
            animationCache.clear();
        };
        const privateOperate = (aniKey: string, animationCache: AnimationCache): void => {
            animationCache.destroy();
        };
        const operate = this._privateMode ? privateOperate : sharedOperate;
        const animationsCache = skeletonInfo.animationsCache;
        for (const aniKey in animationsCache) {
            // Clear cache texture, and put cache into pool.
            // No need to create TypedArray next time.
            const animationCache = animationsCache[aniKey];
            if (!animationCache) continue;
            operate(aniKey, animationCache);
        }

        if (skeletonInfo.skeleton) {
            spine.wasmUtil.destroySpineSkeleton(skeletonInfo.skeleton);
        }
        delete this._skeletonCache[assetUuid];
    }

    public createSkeletonInfo (skeletonAsset: SkeletonData): SkeletonCacheItemInfo {
        const uuid = skeletonAsset.uuid;
        const runtimeData = skeletonAsset.getRuntimeData();
        if (!this._privateMode) {
            let refCount = this._sharedCacheMap.get(uuid);
            if (!refCount) {
                refCount = 1;
            } else {
                refCount += 1;
            }
            this._sharedCacheMap.set(uuid, refCount);
        }
        if (this._skeletonCache[uuid]) {
            return this._skeletonCache[uuid];
        }

        const skeleton = new spine.Skeleton(runtimeData!);
        const clipper = null;
        const state = null;
        const listener = new TrackEntryListeners();

        const skeletonInfo = this._skeletonCache[uuid] = {
            skeleton,
            clipper,
            state,
            listener,
            // Cache all kinds of animation frame.
            // When skeleton is dispose, clear all animation cache.
            animationsCache: {} as any,
            curAnimationCache: null,
            assetUUID: uuid,
        };
        return skeletonInfo;
    }

    public getSkeletonInfo (skeletonAsset: SkeletonData): null | SkeletonCacheItemInfo {
        const uuid = skeletonAsset.uuid;
        return this._skeletonCache[uuid];
    }

    public getAnimationCache (uuid: string, animationName: string): null | AnimationCache {
        const skeletonInfo = this._skeletonCache[uuid];
        if (!skeletonInfo) return null;
        const animationsCache = skeletonInfo.animationsCache;
        return animationsCache[animationName];
    }

    public initAnimationCache (uuid: string, data: SkeletonData,  animationName: string): null | AnimationCache {
        const spData = data.getRuntimeData();
        if (!spData) return null;
        const skeletonInfo = this._skeletonCache[uuid];
        const skeleton = skeletonInfo && skeletonInfo.skeleton;
        if (!skeleton) return null;
        const animationsCache = skeletonInfo.animationsCache;
        let animationCache = animationsCache[animationName];
        if (!animationCache) {
            // If cache exist in pool, then just use it.
            const poolKey = `${uuid}#${animationName}`;
            animationCache = this._animationPool[poolKey];
            if (animationCache) {
                delete this._animationPool[poolKey];
            } else {
                animationCache = new AnimationCache(spData);
                animationCache._privateMode = this._privateMode;
            }
            animationCache.init(skeletonInfo, animationName);
            animationsCache[animationName] = animationCache;
        }
        animationCache.init(skeletonInfo, animationName);
        animationCache.setAnimation(animationName);
        return animationCache;
    }

    public destroyCachedAnimations (uuid?: string): void {
        if (uuid) {
            const animationPool = this._animationPool;
            for (const key in animationPool) {
                if (key.includes(uuid)) {
                    animationPool[key].destroy();
                    delete animationPool[key];
                }
            }
            let skeletonInfo = this._skeletonCache[uuid];
            const skeleton = skeletonInfo && skeletonInfo.skeleton;
            if (skeleton) {
                spine.wasmUtil.destroySpineSkeleton(skeleton);
            }
            if (skeletonInfo) {
                delete this._skeletonCache[uuid];
            }
        } else {
            const animationPool = this._animationPool;
            for (const key in animationPool) {
                animationPool[key].destroy();
                delete animationPool[key];
            }
        }
    }
}

export default SkeletonCache;
