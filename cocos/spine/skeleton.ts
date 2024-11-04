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
import { EDITOR_NOT_IN_PREVIEW, JSB } from 'internal:constants';
import { ccclass, executeInEditMode, help, menu, serializable, type, displayName, override, displayOrder, editable, tooltip } from 'cc.decorator';
import { Material, Texture2D } from '../asset/assets';
import { error, logID, warn } from '../core/platform/debug';
import { Enum, EnumType, ccenum } from '../core/value-types/enum';
import { Node, NodeEventType } from '../scene-graph';
import { CCObject, Color, RecyclePool, js } from '../core';
import { SkeletonData } from './skeleton-data';
import { Graphics, UIRenderer } from '../2d';
import { Batcher2D } from '../2d/renderer/batcher-2d';
import { BlendFactor, BlendOp } from '../gfx';
import { MaterialInstance } from '../render-scene';
import { builtinResMgr } from '../asset/asset-manager';
import { legacyCC } from '../core/global-exports';
import { SkeletonSystem } from './skeleton-system';
import { RenderEntity, RenderEntityType } from '../2d/renderer/render-entity';
import { AttachUtil } from './attach-util';
import spine from './lib/spine-core';
import { VertexEffectDelegate } from './vertex-effect-delegate';
import SkeletonCache, { AnimationCache, AnimationFrame, SkeletonCacheItemInfo } from './skeleton-cache';
import { TrackEntryListeners } from './track-entry-listeners';
import { setPropertyEnumType } from '../core/internal-index';

const CachedFrameTime = 1 / 60;
const CUSTOM_SLOT_TEXTURE_BEGIN = 10000;
let _slotTextureID = CUSTOM_SLOT_TEXTURE_BEGIN;

type TrackListener = (x: spine.TrackEntry) => void;
type TrackListener2 = (x: spine.TrackEntry, ev: spine.Event | number) => void;
/**
 * @en
 * Animation playback rate.
 * @zh
 * 动画播放速率。
 */
export const timeScale = 1.0;

/**
 * @en Enum for animation cache mode type.
 * @zh Spine 动画缓存类型。
 */
export enum SpineAnimationCacheMode {
    /**
     * @en Unset mode.
     * @zh 未设置模式。
     */
    UNSET = -1,
    /**
     * @en The realtime mode.
     * @zh 实时计算模式。
     */
    REALTIME = 0,
    /**
     * @en The shared cache mode.
     * @zh 共享缓存模式。
     */
    SHARED_CACHE = 1,
    /**
     * @en The private cache mode.
     * @zh 私有缓存模式。
     */
    PRIVATE_CACHE = 2,
}
ccenum(SpineAnimationCacheMode);

// To keep the compatibility, don't use it internally, otherwise, enum value may be inlined to wrong value.
// Use AnimationCacheMode instead.
export const AnimationCacheMode = SpineAnimationCacheMode;

interface AnimationItem {
    animationName: string;
    loop: boolean;
    delay: number;
}

/**
 * @engineInternal
 */
export enum DefaultSkinsEnum {
    default = 0,
}
ccenum(DefaultSkinsEnum);

/**
 * @engineInternal
 */
export enum SpineDefaultAnimsEnum {
    '<None>' = 0
}
ccenum(SpineDefaultAnimsEnum);
// To keep the compatibility, don't use it internally, otherwise, enum value may be inlined to wrong value.
// Use SpineDefaultAnimsEnum instead.
export const DefaultAnimsEnum = SpineDefaultAnimsEnum;

/**
 * @engineInternal
 */
export enum SpineMaterialType {
    COLORED_TEXTURED = 0,
    TWO_COLORED = 1,
}

interface AnimationItem {
    animationName: string;
    loop: boolean;
    delay: number;
}

/**
 * @engineInternal
 */
export interface SkeletonDrawData {
    material: Material | null;
    texture: Texture2D | null;
    indexOffset: number;
    indexCount: number;
}

export interface TempColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * @en
 * The Sockets attached to bones, synchronous transform with spine animation.
 * @zh
 * Spine 挂点，可附着在目标骨骼上随 spine 动画一起运动。
 * @class SpineSocket
 */
@ccclass('sp.Skeleton.SpineSocket')
export class SpineSocket {
    /**
     * @en Path of the target joint.
     * @zh 此挂点的目标骨骼路径。
     */
    @serializable
    @editable
    public path = '';

    /**
     * @en Transform output node.
     * @zh 此挂点的变换信息输出节点。
     */
    @type(Node)
    @editable
    @serializable
    public target: Node | null = null;

    constructor (path = '', target: Node | null = null) {
        this.path = path;
        this.target = target;
    }
}

js.setClassAlias(SpineSocket, 'sp.Skeleton.SpineSocket');

/**
 * @en
 * The skeleton of Spine <br/>
 * <br/>
 * (Skeleton has a reference to a SkeletonData and stores the state for skeleton instance,
 * which consists of the current pose's bone SRT, slot colors, and which slot attachments are visible. <br/>
 * Multiple skeletons can use the same SkeletonData which includes all animations, skins, and attachments.) <br/>
 * Cocos Creator supports spine versions lower than 3.8.99.
 * @zh
 * Spine 骨骼动画 <br/>
 * <br/>
 * (Skeleton 具有对骨骼数据的引用并且存储了骨骼实例的状态，
 * 它由当前的骨骼动作，slot 颜色，和可见的 slot attachments 组成。<br/>
 * 多个 Skeleton 可以使用相同的骨骼数据，其中包括所有的动画，皮肤和 attachments。
 * Cocos Creator 支持 spine 版本最高到3.8.99。
 * @class Skeleton
 * @extends UIRenderer
 */
@ccclass('sp.Skeleton')
@help('i18n:cc.Spine')
@menu('Spine/Skeleton')
@executeInEditMode
export class Skeleton extends UIRenderer {
    public static SpineSocket = SpineSocket;
    public static AnimationCacheMode = SpineAnimationCacheMode;

    @serializable
    protected _skeletonData: SkeletonData | null = null;
    @serializable
    protected defaultSkin = '';
    @serializable
    protected defaultAnimation = '';
    /**
     * @en Indicates whether to enable premultiplied alpha.
     * You should disable this option when image's transparent area appears to have opaque pixels,
     * or enable this option when image's half transparent area appears to be darken.
     * @zh 是否启用贴图预乘。
     * 当图片的透明区域出现色块时需要关闭该选项，当图片的半透明区域颜色变黑时需要启用该选项。
     */
    @serializable
    protected _premultipliedAlpha = true;
    @serializable
    protected _timeScale = 1;
    @serializable
    protected _preCacheMode: SpineAnimationCacheMode = SpineAnimationCacheMode.UNSET;
    @serializable
    protected _cacheMode = SpineAnimationCacheMode.REALTIME;
    @serializable
    protected _sockets: SpineSocket[] = [];
    @serializable
    protected _useTint = false;
    @serializable
    protected _debugMesh = false;
    @serializable
    protected _debugBones = false;
    @serializable
    protected _debugSlots = false;
    @serializable
    protected _enableBatch = false;

    protected _runtimeData: spine.SkeletonData | null = null;
    public _skeleton: spine.Skeleton = null!;
    protected _instance: spine.SkeletonInstance | null = null;
    protected _state: spine.AnimationState = null!;
    protected _textures: Texture2D[] = [];
    private _skeletonInfo: SkeletonCacheItemInfo | null = null;
    // Animation name
    protected _animationName = '';
    protected _skinName = '';
    protected _drawList = new RecyclePool<SkeletonDrawData>((): SkeletonDrawData => ({
        material: null,
        texture: null,
        indexOffset: 0,
        indexCount: 0,
    }), 1);
    protected _materialCache: { [key: string]: MaterialInstance } = {} as any;
    public paused = false;
    protected _enumSkins: EnumType = Enum({});
    protected _enumAnimations: EnumType = Enum({});
    protected attachUtil: AttachUtil;
    protected _socketNodes: Map<number, Node> = new Map();
    protected _cachedSockets: Map<string, number> = new Map<string, number>();

    /**
     * @engineInternal
     */
    public _startEntry: spine.TrackEntry;
    /**
     * @engineInternal
     */
    public _endEntry: spine.TrackEntry;
    // Paused or playing state
    protected _paused = false;

    // Below properties will effect when cache mode is SHARED_CACHE or PRIVATE_CACHE.
    // accumulate time
    protected _accTime = 0;
    // Play times counter
    protected _playCount = 0;
    // Skeleton cache
    protected _skeletonCache: SkeletonCache | null = null;
    protected _animCache: AnimationCache | null = null;
    protected _animationQueue: AnimationItem[] = [];
    // Head animation info of
    protected _headAniInfo: AnimationItem | null = null;
    // Is animation complete.
    protected _isAniComplete = true;
    // Play times
    protected _playTimes = 0;
    /**
     * @engineInternal
     */
    public _curFrame: AnimationFrame | null = null;
    // Is need update skeltonData
    protected _needUpdateSkeltonData = true;
    protected _listener: TrackEntryListeners | null = null;

    /**
     * @engineInternal
     */
    public _debugRenderer: Graphics | null = null;
    /**
     * @engineInternal
     */
    public _startSlotIndex;
    /**
     * @engineInternal
     */
    public _endSlotIndex;

    private _slotTextures: Map<number, Texture2D> | null = null;

    _vLength = 0;
    _vBuffer: Uint8Array | null = null;
    _iLength = 0;
    _iBuffer: Uint8Array | null = null;
    _model: any;
    _tempColor: TempColor = { r: 0, g: 0, b: 0, a: 0 };
    private _eventListenerID: number = -1;

    constructor () {
        super();
        this._useVertexOpacity = true;
        this._startEntry = { animation: { name: '' }, trackIndex: 0 } as spine.TrackEntry;
        this._endEntry = { animation: { name: '' }, trackIndex: 0 } as spine.TrackEntry;
        this._startSlotIndex = -1;
        this._endSlotIndex = -1;
        if (!JSB) {
            this._instance = new spine.SkeletonInstance();
            this._instance.dtRate = this._timeScale * timeScale;
            this._instance.isCache = this.isAnimationCached();
        }
        this.attachUtil = new AttachUtil();
    }

    /**
     * @engineInternal
     */
    get drawList (): RecyclePool<SkeletonDrawData> { return this._drawList; }

    /**
     * @en
     * The skeleton data contains the skeleton information (bind pose bones, slots, draw order,
     * attachments, skins, etc) and animations but does not hold any state.<br/>
     * Multiple skeletons can share the same skeleton data.
     * @zh
     * 骨骼数据包含了骨骼信息（绑定骨骼动作，slots，渲染顺序，
     * attachments，皮肤等等）和动画但不持有任何状态。<br/>
     * 多个 Skeleton 可以共用相同的骨骼数据。
     * @property {sp.SkeletonData} skeletonData
     */
    @editable
    @type(SkeletonData)
    @displayName('SkeletonData')
    get skeletonData (): SkeletonData | null {
        return this._skeletonData;
    }
    set skeletonData (value: SkeletonData | null) {
        if (value) value.resetEnums();
        if (this._skeletonData !== value) {
            this.destroyRenderData();
            this._skeletonData = value as any;
            this.defaultSkin = '';
            this.defaultAnimation = '';
            this._animationName = '';
            this._skinName = '';
            this._updateSkeletonData();
            this._updateUITransform();
        }
    }

    /**
     * @engineInternal
     */
    @displayName('Default Skin')
    @type(DefaultSkinsEnum)
    @tooltip('i18n:COMPONENT.skeleton.default_skin')
    get _defaultSkinIndex (): number {
        if (this.skeletonData) {
            const skinsEnum = this.skeletonData.getSkinsEnum();
            if (skinsEnum) {
                if (this.defaultSkin === '') {
                    // eslint-disable-next-line no-prototype-builtins
                    if (skinsEnum.hasOwnProperty(0)) {
                        this._defaultSkinIndex = 0;
                        return 0;
                    }
                } else {
                    const skinIndex = skinsEnum[this.defaultSkin];
                    if (skinIndex !== undefined) {
                        return skinIndex;
                    }
                }
            }
        }
        return 0;
    }
    /**
     * @engineInternal
     */
    set _defaultSkinIndex (value: number) {
        let skinsEnum;
        if (this.skeletonData) {
            skinsEnum = this.skeletonData.getSkinsEnum();
        }
        if (!skinsEnum) {
            error(`${this.name} skin enums are invalid`);
            return;
        }

        const skinName = skinsEnum[value];
        if (skinName !== undefined) {
            this.defaultSkin = String(skinName);
            this.setSkin(this.defaultSkin);
            this._refreshInspector();
            this.markForUpdateRenderData();
        } else {
            error(`${this.name} skin enums are invalid`);
        }
    }

    // value of 0 represents no animation
    /**
     * @engineInternal
     */
    @displayName('Animation')
    @type(SpineDefaultAnimsEnum)
    @tooltip('i18n:COMPONENT.skeleton.animation')
    get _animationIndex (): number {
        const animationName = EDITOR_NOT_IN_PREVIEW ? this.defaultAnimation : this.animation;
        if (this.skeletonData) {
            if (animationName) {
                const animsEnum = this.skeletonData.getAnimsEnum();
                if (animsEnum) {
                    const animIndex = animsEnum[animationName];
                    if (animIndex !== undefined) {
                        return animIndex;
                    }
                }
            } else {
                this._refreshInspector();
            }
        }
        return 0;
    }
    /**
     * @engineInternal
     */
    set _animationIndex (value: number) {
        let animsEnum;
        if (this.skeletonData) {
            animsEnum = this.skeletonData.getAnimsEnum();
        }
        if (!animsEnum) {
            error(`${this.name} animation enums are invalid`);
            return;
        }
        const animName = String(animsEnum[value]);
        if (animName !== undefined) {
            this.animation = animName;
            if (EDITOR_NOT_IN_PREVIEW) {
                this.defaultAnimation = animName;
                this._refreshInspector();
            } else {
                this.animation = animName;
            }
        } else {
            error(`${this.name} animation enums are invalid`);
        }
    }

    /**
     * @en Animation mode, with options for real-time mode, private cached, or public cached mode.
     * @zh 动画模式，可选实时模式，私有 cached 或公共 cached 模式。
     */
    @displayName('Animation Cache Mode')
    @tooltip('i18n:COMPONENT.skeleton.animation_cache_mode')
    @editable
    @type(SpineAnimationCacheMode)
    get defaultCacheMode (): SpineAnimationCacheMode {
        return this._cacheMode;
    }
    set defaultCacheMode (mode: SpineAnimationCacheMode) {
        this._cacheMode = mode;
        this.setAnimationCacheMode(this._cacheMode);
    }

    /**
     * @en Whether premultipliedAlpha enabled.
     * @zh 是否启用 alpha 预乘。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.premultipliedAlpha')
    get premultipliedAlpha (): boolean { return this._premultipliedAlpha; }
    set premultipliedAlpha (v: boolean) {
        if (v !== this._premultipliedAlpha) {
            this._premultipliedAlpha = v;
            this._instance!.setPremultipliedAlpha(v);
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en Whether play animations in loop mode.
     * @zh 是否循环播放当前骨骼动画。
     */
    @serializable
    @tooltip('i18n:COMPONENT.skeleton.loop')
    public loop = true;

    /**
     * @en The time scale of this skeleton.
     * @zh 当前骨骼中所有动画的时间缩放率。
     */
    @tooltip('i18n:COMPONENT.skeleton.time_scale')
    @editable
    get timeScale (): number { return this._timeScale; }
    set timeScale (value) {
        if (value !== this._timeScale) {
            this._timeScale = value;
            if (this._instance) {
                this._instance.dtRate = this._timeScale * timeScale;
            }
        }
    }
    /**
     * @en Enabled two color tint.
     * @zh 是否启用染色效果。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.use_tint')
    get useTint (): boolean { return this._useTint; }
    set useTint (value) {
        if (value !== this._useTint) {
            this._useTint = value;
            this._updateUseTint();
        }
    }

    /**
     * @en If rendering a large number of identical textures and simple skeletal animations,
     * enabling batching can reduce the number of draw calls and improve rendering performance.
     * @zh 如果渲染大量相同纹理，且结构简单的骨骼动画，开启合批可以降低 draw call 数量提升渲染性能。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.enabled_batch')
    get enableBatch (): boolean { return this._enableBatch; }
    set enableBatch (value) {
        if (value !== this._enableBatch) {
            this._enableBatch = value;
            this._updateBatch();
        }
    }
    /**
     * @en
     * The bone sockets this animation component maintains.<br>
     * A SpineSocket object contains a path reference to bone, and a target node.
     * @zh
     * 当前动画组件维护的挂点数组。一个挂点组件包括动画节点路径和目标节点。
     */
    @type([SpineSocket])
    @tooltip('i18n:animation.sockets')
    get sockets (): SpineSocket[] {
        return this._sockets;
    }
    set sockets (val: SpineSocket[]) {
        if (EDITOR_NOT_IN_PREVIEW) {
            this._verifySockets(val);
        }
        this._sockets = val;
        this._updateSocketBindings();
        this.attachUtil.init(this);
    }

    /**
     * @en Indicates whether open debug slots.
     * @zh 是否显示 slot 的 debug 信息。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.debug_slots')
    get debugSlots (): boolean { return this._debugSlots; }
    set debugSlots (v: boolean) {
        if (v !== this._debugSlots) {
            this._debugSlots = v;
            this._updateDebugDraw();
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en Indicates whether open debug bones.
     * @zh 是否显示 bone 的 debug 信息。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.debug_bones')
    get debugBones (): boolean { return this._debugBones; }
    set debugBones (v: boolean) {
        if (v !== this._debugBones) {
            this._debugBones = v;
            this._updateDebugDraw();
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en Indicates whether open debug mesh.
     * @zh 是否显示 mesh 的 debug 信息。
     */
    @editable
    @tooltip('i18n:COMPONENT.skeleton.debug_mesh')
    get debugMesh (): boolean { return this._debugMesh; }
    set debugMesh (value) {
        if (value !== this._debugMesh) {
            this._debugMesh = value;
            this._updateDebugDraw();
            this.markForUpdateRenderData();
        }
    }
    get socketNodes (): Map<number, Node> | null { return this._socketNodes; }

    /**
     * @en The name of current playing animation.
     * @zh 当前播放的动画名称。
     * @property {String} animation
     */
    get animation (): string {
        return this._animationName;
    }
    set animation (value: string) {
        if (value) {
            this.setAnimation(0, value, this.loop);
        } else {
            this.clearAnimation(0);
        }
    }

    /**
     * @en The customMaterial。
     * @zh 用户自定材质。
     */
    @override
    @type(Material)
    @displayOrder(0)
    get customMaterial (): Material | null {
        return this._customMaterial;
    }
    set customMaterial (val) {
        this._customMaterial = val;
        this.updateMaterial();
        this.markForUpdateRenderData();
    }

    public __preload (): void {
        super.__preload();
        this._updateSkeletonData();
        this._updateDebugDraw();
    }

    /**
     * @engineInternal
     */
    public onRestore (): void {
        this.updateMaterial();
        this.markForUpdateRenderData();
    }

    /**
     * @en Gets the animation state object.
     * @zh 获取动画状态。
     * @method getState
     * @return {sp.spine.AnimationState} state
     */
    public getState (): spine.AnimationState | undefined {
        return this._state;
    }

    /**
     * @en Be called when component state becomes available.
     * @zh 组件状态变为可用时调用。
     */
    public onEnable (): void {
        super.onEnable();
        if (this._instance) {
            this._instance.enable = true;
        }
        this._flushAssembler();
        SkeletonSystem.getInstance().add(this);
    }
    /**
     * @en Be called when component state becomes disabled.
     * @zh 组件状态变为禁用状态时调用。
     */
    public onDisable (): void {
        super.onDisable();
        if (this._instance) {
            this._instance.enable = false;
        }
        SkeletonSystem.getInstance().remove(this);
    }

    public onDestroy (): void {
        if (this._eventListenerID > 0) {
            TrackEntryListeners.removeListener(this._eventListenerID);
            this._eventListenerID = -1;
        }
        this._drawList.destroy();
        this.destroyRenderData();
        this._cleanMaterialCache();
        this._vBuffer = null;
        this._iBuffer = null;
        this.attachUtil.reset();
        //this._textures.length = 0;
        this._slotTextures?.clear();
        this._slotTextures = null;
        this._cachedSockets.clear();
        this._socketNodes.clear();
        //if (this._cacheMode == SpineAnimationCacheMode.PRIVATE_CACHE) this._animCache?.destroy();
        this._animCache = null;
        SkeletonSystem.getInstance().remove(this);
        if (!JSB && this._instance) {
            this._instance.destroy();
            this._instance = null;
        }
        this._destroySkeletonInfo(this._skeletonCache);
        this._skeletonCache = null;
        super.onDestroy();
    }

    /**
     * @en Clear animation and set to setup pose, default value of track index is 0.
     * @zh 清除指定动画并还原到初始姿势, 默认清除 track索引 为0的动画。
     * @param {Number} [trackIndex] @en track index. @zh track 的索引。
     */
    public clearAnimation (trackIndex?: number): void {
        if (!this.isAnimationCached()) {
            this.clearTrack(trackIndex || 0);
            this.setToSetupPose();
        }
    }

    /**
     * @en Clear all animations and set to setup pose.
     * @zh 清除所有动画并还原到初始姿势。
     */
    public clearAnimations (): void {
        if (!this.isAnimationCached()) {
            this.clearTracks();
            this.setToSetupPose();
        }
    }

    protected _updateSkeletonData (): void {
        const skeletonData = this._skeletonData;
        if (!skeletonData) {
            this._runtimeData = null!;
            this._state = null!;
            this._skeleton = null!;
            this._textures = [];
            this._refreshInspector();
            return;
        }
        if (this._instance) {
            this._instance.dtRate = this._timeScale * timeScale;
        }
        this._needUpdateSkeltonData = false;
        //const data = this.skeletonData?.getRuntimeData();
        //if (!data) return;
        //this.setSkeletonData(data);
        this._runtimeData = skeletonData.getRuntimeData();
        if (!this._runtimeData) return;
        this.setSkeletonData(this._runtimeData);
        this._textures = skeletonData.textures;

        this._refreshInspector();
        if (this.defaultAnimation) this.animation = this.defaultAnimation.toString();
        if (this.defaultSkin && this.defaultSkin !== '') this.setSkin(this.defaultSkin);
        this._updateUseTint();
        this._indexBoneSockets();
        this._updateSocketBindings();
        this.attachUtil.init(this);
        this._preCacheMode = this._cacheMode;
    }

    /**
     * @en
     * Sets runtime skeleton data to sp.Skeleton.<br>
     * This method is different from the `skeletonData` property. This method is passed in the raw data provided by the
     *  Spine runtime, and the skeletonData type is the asset type provided by Creator.
     * @zh
     * 设置底层运行时用到的 SkeletonData。<br>
     * 这个接口有别于 `skeletonData` 属性，这个接口传入的是 Spine runtime 提供的原始数据，而 skeletonData 的类型是 Creator 提供的资源类型。
     * @param skeletonData @en The skeleton data contains the skeleton information (bind pose bones, slots, draw order, attachments,
     * skins, etc) and animations but does not hold any state. @zh 骨架数据(SkeletonData)包含骨架信息(绑定pose的骨骼、槽位、绘制顺序、附件、
     * 皮肤等)和动画, 但不保存任何状态。
     */
    public setSkeletonData (skeletonData: spine.SkeletonData): void {
        if (!EDITOR_NOT_IN_PREVIEW) {
            const preSkeletonCache = this._skeletonCache;
            if (this._cacheMode === SpineAnimationCacheMode.SHARED_CACHE) {
                this._skeletonCache = SkeletonCache.sharedCache;
            } else if (this._cacheMode === SpineAnimationCacheMode.PRIVATE_CACHE) {
                this._skeletonCache = new SkeletonCache();
                this._skeletonCache.enablePrivateMode();
            } else {
                this._skeletonCache = null;
            }
            //cache mode may be changed
            if (preSkeletonCache !== this._skeletonCache) {
                this._destroySkeletonInfo(preSkeletonCache);
            }
        }
        if (this.isAnimationCached()) {
            if (this.debugBones || this.debugSlots) {
                warn('Debug bones or slots is invalid in cached mode');
            }
            const skeletonInfo = this._skeletonCache!.getSkeletonInfo(this._skeletonData!);
            if (this._skeletonInfo !== skeletonInfo) {
                this._destroySkeletonInfo(this._skeletonCache);
                this._skeletonInfo = this._skeletonCache!.createSkeletonInfo(this._skeletonData!);
            }
            if (this._skeletonInfo) {
                this._skeleton = this._skeletonInfo.skeleton!;
            }
        } else {
            this._skeleton = this._instance!.initSkeleton(skeletonData);
            this._state = this._instance!.getAnimationState();
            this._instance!.setPremultipliedAlpha(this._premultipliedAlpha);
        }
        // Recreate render data and mark dirty
        this._flushAssembler();
    }

    /**
     * @en Sets slots visible range.
     * @zh 设置骨骼插槽可视范围。
     * @param {Number} startSlotIndex @en start slot index. @zh 开始插槽的索引。
     * @param {Number} endSlotIndex @en end slot index. @zh 结束插槽的索引。
     */
    public setSlotsRange (startSlotIndex: number, endSlotIndex: number): void {
        if (this.isAnimationCached()) {
            warn('Slots visible range can not be modified in cached mode.');
        } else {
            this._startSlotIndex = startSlotIndex;
            this._endSlotIndex = endSlotIndex;
        }
    }

    /**
     * @en
     * Returns the attachment for the slot and attachment name.
     * The skeleton looks first in its skin, then in the skeleton data’s default skin.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Attachment object.
     * @zh
     * 通过 slot 和 attachment 的名称获取 attachment。Skeleton 优先查找它的皮肤，然后才是 Skeleton Data 中默认的皮肤。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Attachment 对象。
     *
     * @method getAttachment
     * @param {String} slotName @en slot name. @zh 插槽的名字。
     * @param {String} attachmentName @en attachment name. @en 附件的名称。
     * @return {sp.spine.Attachment}
     */
    public getAttachment (slotName: string, attachmentName: string): spine.Attachment | null {
        if (this._skeleton) {
            return this._skeleton.getAttachmentByName(slotName, attachmentName);
        }
        return null;
    }

    /**
     * @en
     * Sets the attachment for the slot and attachment name.
     * The skeleton looks first in its skin, then in the skeleton data’s default skin.
     * @zh
     * 通过 slot 和 attachment 的名字来设置 attachment。
     * Skeleton 优先查找它的皮肤，然后才是 Skeleton Data 中默认的皮肤。
     * @method setAttachment
     * @param {String} slotName @en slot name. @zh 插槽的名字。
     * @param {String} attachmentName @en attachment name. @en 附件的名称。
     */
    public setAttachment (slotName: string, attachmentName: string): void {
        if (this._skeleton) {
            this._skeleton.setAttachment(slotName, attachmentName);
        }
        this.invalidAnimationCache();
    }

    /**
     * @en
     * Get Texture Atlas used in attachments.
     * @zh
     * 获取附件图集。
     * @param regionAttachment @en An attachment type of RegionAttachment or BoundingBoxAttachment. @zh RegionAttachment 或 BoundingBoxAttachment 的附件。
     * @return @en TextureRegion contains texture and atlas text information. @zh TextureRegion包含纹理和图集文本信息。
     */
    public getTextureAtlas (regionAttachment: spine.RegionAttachment | spine.BoundingBoxAttachment): spine.TextureRegion  {
        return (regionAttachment as spine.RegionAttachment).region;
    }
    /**
     * @en Set the current animation. Any queued animations are cleared.<br>
     * @zh 设置当前动画。队列中的任何的动画将被清除。<br>
     * @param trackIndex @en Index of track. @zh 动画通道索引。
     * @param name @en The name of animation. @zh 动画名称。
     * @param loop @en Use loop mode or not. @zh 是否使用循环播放模式。
     */
    public setAnimation (trackIndex: number, name: string, loop?: boolean): spine.TrackEntry | null {
        if (!(typeof name === 'string')) {
            logID(7511);
            return null;
        }
        const skeleton = this._skeleton;
        const animation = skeleton ? skeleton.data.findAnimation(name) : null;
        if (!animation) {
            logID(7509, name);
            return null;
        }
        let trackEntry: spine.TrackEntry | null = null;
        if (loop === undefined) loop = true;
        this._playTimes = loop ? 0 : 1;
        if (this.isAnimationCached()) {
            if (trackIndex !== 0) {
                warn('Track index can not greater than 0 in cached mode.');
            }
            if (!this._skeletonCache) return null;
            let cache = this._skeletonCache.getAnimationCache(this._skeletonData!.uuid, name);
            if (!cache) {
                cache = this._skeletonCache.initAnimationCache(this.skeletonData!.uuid, this._skeletonData!, name);
                cache?.setSkin(this._skinName);
            }
            if (cache) {
                this._animationName = name;
                this._isAniComplete = false;
                this._accTime = 0;
                this._playCount = 0;
                this._animCache = cache;
                if (this._socketNodes.size > 0) {
                    this._animCache.enableCacheAttachedInfo();
                }
                this._animCache.updateToFrame(0);
                this._curFrame = this._animCache.frames[0];
            }
        } else {
            this._animationName = name;
            trackEntry = this._instance!.setAnimation(trackIndex, name, loop);
        }
        this.markForUpdateRenderData();
        return trackEntry;
    }
    /**
     * @en Adds an animation to be played delay seconds after the current or last queued animation.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry object.
     * @zh 添加一个动画到动画队列尾部，还可以延迟指定的秒数。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry 对象。
     * @param trackIndex @en Index of trackEntry. @zh TrackEntry 索引。
     * @param name @en The name of animation. @zh 动画名称。
     * @param loop @en Set play animation in a loop. @zh 是否循环播放。
     * @param delay @en Delay time of animation start. @zh 动画开始的延迟时间。
     * @return {sp.spine.TrackEntry}
     */
    public addAnimation (trackIndex: number, name: string, loop: boolean, delay?: number): spine.TrackEntry | null {
        delay = delay || 0;
        if (this.isAnimationCached()) {
            if (trackIndex !== 0) {
                warn('Track index can not greater than 0 in cached mode.');
            }
            this._animationQueue.push({ animationName: name, loop, delay });
            return null;
        } else if (this._skeleton) {
            const animation = this._skeleton.data.findAnimation(name);
            if (!animation) {
                logID(7510, name);
                return null;
            }
            return this._state?.addAnimationWith(trackIndex, animation, loop, delay);
        }
        return null;
    }
    /**
     * @en Find animation with specified name.
     * @zh 查找指定名称的动画
     * @param name @en The name of animation. @zh 动画名称。
     * @returns {sp.spine.Animation}
     */
    public findAnimation (name: string): spine.Animation | null {
        if (this._skeleton) {
            return this._skeleton.data.findAnimation(name);
        }
        return null;
    }
    /**
     * @en Returns track entry by trackIndex.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry object.
     * @zh 通过 track 索引获取 TrackEntry。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.TrackEntry 对象。
     * @param trackIndex @en The index of trackEntry. @zh TrackEntry 索引。
     * @return {sp.spine.TrackEntry}
     */
    public getCurrent (trackIndex: number): spine.TrackEntry | null {
        if (this.isAnimationCached()) {
            warn('\'getCurrent\' interface can not be invoked in cached mode.');
        } else if (this._state) {
            return this._state.getCurrent(trackIndex);
        }
        return null;
    }

    /**
     * @en
     * Finds a skin by name and makes it the active skin.
     * This does a string comparison for every skin.<br>
     * Note that setting the skin does not change which attachments are visible.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Skin object.
     * @zh
     * 按名称查找皮肤，激活该皮肤。这里对每个皮肤的名称进行了比较。<br>
     * 注意：设置皮肤不会改变 attachment 的可见性。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Skin 对象。
     *
     * @param skinName @en The name of skin. @zh 皮肤名称。
     */
    public setSkin (name: string): void {
        if (!name) return;
        if (this._skeleton) this._skeleton.setSkinByName(name);
        this._instance!.setSkin(name);
        if (this.isAnimationCached()) {
            if (this._animCache) {
                this._animCache.setSkin(name);
            }
        }
        this._skinName = name;
        this.invalidAnimationCache();
    }

    /**
     * @en Update skeleton animation.
     * @zh 更新骨骼动画。
     * @param dt @en delta time. @zh 时间差。
     */
    public updateAnimation (dt: number): void {
        this.markForUpdateRenderData();
        if (EDITOR_NOT_IN_PREVIEW) return;
        if (this.paused) return;
        if (this.isAnimationCached()) {
            // On realTime mode, dt is multiplied at native side.
            dt *= this._timeScale * timeScale;
            if (this._isAniComplete) {
                if (this._animationQueue.length === 0 && !this._headAniInfo) {
                    const frameCache = this._animCache;
                    if (frameCache && frameCache.isInvalid()) {
                        frameCache.updateToFrame(0);
                        const frames = frameCache.frames;
                        this._curFrame = frames[frames.length - 1];
                    }
                    return;
                }
                if (!this._headAniInfo) {
                    this._headAniInfo = this._animationQueue.shift()!;
                }
                this._accTime += dt;
                if (this._accTime > this._headAniInfo?.delay) {
                    const aniInfo = this._headAniInfo;
                    this._headAniInfo = null;
                    this.setAnimation(0, aniInfo?.animationName, aniInfo?.loop);
                }
                return;
            }
            this._updateCache(dt);
        } else {
            this._instance!.updateAnimation(dt);
        }
    }

    protected _updateCache (dt: number): void {
        const frameCache = this._animCache!;
        if (!frameCache.isInited()) {
            return;
        }
        const frames = frameCache.frames;
        const frameTime = SkeletonCache.FrameTime;
        // Animation Start, the event different from _customMaterial inner event,
        // It has no event object.
        if (this._accTime === 0 && this._playCount === 0) {
            this._startEntry.animation.name = this._animationName;
            if (this._listener && this._listener.start) {
                this._listener.start(this._startEntry);
            }
        }

        this._accTime += dt;
        let frameIdx = Math.floor(this._accTime / frameTime);
        if (!frameCache.isCompleted) {
            frameCache.updateToFrame(frameIdx);
        }
        this._curFrame = frames[frameIdx];
        if (this._curFrame !== undefined) {
            this.attachUtil.updateSkeletonBones(this._curFrame.boneInfos);
        }
        if (frameCache.isCompleted && frameIdx >= frames.length) {
            this._playCount++;
            if (this._playTimes > 0 && this._playCount >= this._playTimes) {
                // set frame to end frame.
                this._curFrame = frames[frames.length - 1];
                this._accTime = 0;
                this._playCount = 0;
                this._isAniComplete = true;
                this._emitCacheCompleteEvent();
                return;
            }
            this._accTime = 0;
            frameIdx = 0;
            this._curFrame = frames[frameIdx];
            this._emitCacheCompleteEvent();
        }
    }

    protected _emitCacheCompleteEvent (): void {
        if (!this._listener) return;
        this._endEntry.animation.name = this._animationName;
        if (this._listener.complete) this._listener.complete(this._endEntry);
        if (this._listener.end) this._listener.end(this._endEntry);
    }

    /**
     * @engineInternal
     */
    public updateRenderData (): any {
        if (this.isAnimationCached()) {
            if (!this._curFrame) return null;
            const model = this._curFrame.model;
            return model;
        } else {
            const model = this._instance!.updateRenderData();
            return model;
        }
    }

    protected _flushAssembler (): void {
        const assembler = Skeleton.Assembler.getAssembler(this);
        if (this._assembler !== assembler) {
            this._assembler = assembler;
        }
        if (this._skeleton && this._assembler) {
            this._renderData = this._assembler.createData(this);
            this.markForUpdateRenderData();
            this._updateColor();
        }
    }

    protected _render (batcher: Batcher2D): void {
        let indicesCount = 0;
        if (this.renderData && this._drawList.length > 0) {
            const rd = this.renderData;
            const chunk = rd.chunk;
            const accessor = chunk.vertexAccessor;
            const meshBuffer = rd.getMeshBuffer()!;
            const origin = meshBuffer.indexOffset;
            // Fill index buffer
            for (let i = 0; i < this._drawList.length; i++) {
                const dc = this._drawList.data[i];
                if (dc.texture) {
                    batcher.commitMiddleware(this, meshBuffer, origin + dc.indexOffset, dc.indexCount, dc.texture, dc.material!, this._enableBatch);
                }
                indicesCount += dc.indexCount;
            }
            const subIndices = rd.indices!.subarray(0, indicesCount);
            accessor.appendIndices(chunk.bufferId, subIndices);
            accessor.getMeshBuffer(chunk.bufferId).setDirty();
        }
    }

    /**
     * @engineInternal
     */
    public requestDrawData (material: Material, textureID: number, indexOffset: number, indexCount: number): SkeletonDrawData {
        const draw = this._drawList.add();
        draw.material = material;
        if (textureID < CUSTOM_SLOT_TEXTURE_BEGIN) {
            draw.texture = this._textures[textureID];
        } else {
            const texture = this._slotTextures?.get(textureID);
            if (texture) draw.texture = texture;
        }
        draw.indexOffset = indexOffset;
        draw.indexCount = indexCount;
        return draw;
    }

    protected _updateBuiltinMaterial (): Material {
        const material = builtinResMgr.get<Material>('default-spine-material');
        return material;
    }
    /**
     * @engineInternal
     */
    public updateMaterial (): void {
        let mat: Material;
        if (this._customMaterial) mat = this._customMaterial;
        else mat = this._updateBuiltinMaterial();
        this.setSharedMaterial(mat, 0);
        this._cleanMaterialCache();
    }

    private getMaterialTemplate (): Material {
        if (this.customMaterial !== null) return this.customMaterial;
        if (this.material) return this.material;
        this.updateMaterial();
        return this.material!;
    }
    private _cleanMaterialCache (): void {
        for (const val in this._materialCache) {
            this._materialCache[val].destroy();
        }
        this._materialCache = {};
    }

    /**
     * @engineInternal
     */
    public getMaterialForBlendAndTint (src: BlendFactor, dst: BlendFactor, type: SpineMaterialType): MaterialInstance {
        const key = `${type}/${src}/${dst}`;
        let inst = this._materialCache[key];
        if (inst) {
            return inst;
        }

        const material = this.getMaterialTemplate();
        const matInfo = {
            parent: material,
            subModelIdx: 0,
            owner: this,
        };
        inst = new MaterialInstance(matInfo);
        this._materialCache[key] = inst;
        inst.overridePipelineStates({
            blendState: {
                blendColor: Color.WHITE,
                targets: [{
                    blendEq: BlendOp.ADD,
                    blendAlphaEq: BlendOp.ADD,
                    blendSrc: src,
                    blendDst: dst,
                    blendSrcAlpha: src,
                    blendDstAlpha: dst,
                }],
            },
        });
        let useTwoColor = false;
        if (type === SpineMaterialType.TWO_COLORED) {
            useTwoColor = true;
        }
        const useLocal = !this._enableBatch;
        inst.recompileShaders({ TWO_COLORED: useTwoColor, USE_LOCAL: useLocal });
        return inst;
    }

    // update animation list for editor
    protected _updateAnimEnum (): void {
        let animEnum;
        if (this.skeletonData) {
            animEnum = this.skeletonData.getAnimsEnum();
        } else {
            animEnum = SpineDefaultAnimsEnum;
        }

        // reset enum type
        this._enumAnimations = Enum({});
        Object.assign(this._enumAnimations, animEnum);
        Enum.update(this._enumAnimations);
        setPropertyEnumType(this, '_animationIndex', this._enumAnimations);
    }
    // update skin list for editor
    protected _updateSkinEnum (): void {
        let skinEnum;
        if (this.skeletonData) {
            skinEnum = this.skeletonData.getSkinsEnum();
        } else {
            skinEnum = DefaultSkinsEnum;
        }

        this._enumSkins = Enum({});
        Object.assign(this._enumSkins, skinEnum);
        Enum.update(this._enumSkins);
        setPropertyEnumType(this, '_defaultSkinIndex', this._enumSkins);
    }

    protected _refreshInspector (): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            // update inspector
            this._updateAnimEnum();
            this._updateSkinEnum();
            // TODO: refresh inspector
            // Editor.Utils.refreshSelectedInspector('node', this.node.uuid);
        }
    }

    /**
     * @en Call this method to destroy the rendering data.
     * @zh 调用该方法销毁渲染数据。
     */
    public destroyRenderData (): void {
        this._drawList.reset();
        super.destroyRenderData();
    }

    protected createRenderEntity (): RenderEntity {
        const renderEntity = new RenderEntity(RenderEntityType.DYNAMIC);
        renderEntity.setUseLocal(true);
        return renderEntity;
    }
    /**
     * @en Mark to re-update the rendering data, usually used to force refresh the display.
     * @zh 标记重新更新渲染数据，一般用于强制刷新显示。
     */
    public markForUpdateRenderData (enable = true): void {
        super.markForUpdateRenderData(enable);
        if (this._debugRenderer) {
            this._debugRenderer.markForUpdateRenderData(enable);
        }
    }

    /**
     * @engineInternal
     */
    public syncAttachedNode (): void {
        // sync attached node matrix
        this.attachUtil._syncAttachedNode();
    }

    /**
     * @en Whether in cached mode.
     * @zh 当前是否处于缓存模式。
     */
    public isAnimationCached (): boolean {
        if (EDITOR_NOT_IN_PREVIEW) return false;
        return this._cacheMode !== SpineAnimationCacheMode.REALTIME;
    }
    /**
     * @en
     * It's best to set cache mode before set property 'dragonAsset', or will waste some cpu time.
     * If set the mode in editor, then no need to worry about order problem.
     * @zh
     * 若想切换渲染模式，最好在设置'dragonAsset'之前，先设置好渲染模式，否则有运行时开销。
     * 若在编辑中设置渲染模式，则无需担心设置次序的问题。
     *
     * @example
     * skeleton.setAnimationCacheMode(sp.Skeleton.AnimationCacheMode.SHARED_CACHE);
     */
    public setAnimationCacheMode (cacheMode: SpineAnimationCacheMode): void {
        if (this._preCacheMode  !== cacheMode) {
            this._cacheMode = cacheMode;
            this._preCacheMode = cacheMode;
            if (this._instance) {
                this._instance.isCache = this.isAnimationCached();
            }
            this._updateSkeletonData();
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en Sets the bones and slots to the setup pose.
     * @zh 还原到起始动作。
     */
    public setToSetupPose (): void {
        if (this._skeleton) {
            this._skeleton.setToSetupPose();
        }
    }

    /**
     * @en
     * Sets the bones to the setup pose,
     * using the values from the `BoneData` list in the `SkeletonData`.
     * @zh
     * 设置 bone 到起始动作。
     * 使用 SkeletonData 中的 BoneData 列表中的值。
     */
    public setBonesToSetupPose (): void {
        if (this._skeleton) {
            this._skeleton.setBonesToSetupPose();
        }
    }

    /**
     * @en
     * Sets the slots to the setup pose,
     * using the values from the `SlotData` list in the `SkeletonData`.
     * @zh
     * 设置 slot 到起始动作。
     * 使用 SkeletonData 中的 SlotData 列表中的值。
     */
    public setSlotsToSetupPose (): void {
        if (this._skeleton) {
            this._skeleton.setSlotsToSetupPose();
        }
    }

    /**
     * @en
     * Invalidates the animation cache, which is then recomputed on each frame.
     * @zh
     * 使动画缓存失效，之后会在每帧重新计算。
     * @method invalidAnimationCache
     */
    public invalidAnimationCache (): void {
        if (!this.isAnimationCached()) return;
        if (this._skeletonCache) {
            this._skeletonCache.invalidAnimationCache(this._skeletonData!.uuid);
        }
    }

    /**
     * @en
     * Finds a bone by name.
     * This does a string comparison for every bone.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Bone object.
     * @zh
     * 通过名称查找 bone。
     * 这里对每个 bone 的名称进行了对比。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Bone 对象。
     *
     * @param boneName @en The name of bone. @zh 骨骼名称。
     */
    public findBone (boneName: string): spine.Bone | null {
        if (this._skeleton) {
            return this._skeleton.findBone(boneName);
        }
        return null;
    }

    /**
     * @en
     * Finds a slot by name. This does a string comparison for every slot.<br>
     * Returns a {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Slot object.
     * @zh
     * 通过名称查找 slot。这里对每个 slot 的名称进行了比较。<br>
     * 返回一个 {{#crossLinkModule "sp.spine"}}sp.spine{{/crossLinkModule}}.Slot 对象。
     *
     * @param slotName @en The name of slot. @zh 插槽名称。
     */
    public findSlot (slotName: string): spine.Slot | null {
        if (this._skeleton) {
            return this._skeleton.findSlot(slotName);
        }
        return null;
    }

    // ANIMATION
    /**
     * @en
     * Mix applies all keyframe values,
     * interpolated for the specified time and mixed with the current values.
     * @zh 为所有关键帧设定混合及混合时间（从当前值开始差值）。
     * @param fromAnimation @en Mix start animation. @zh 过渡起始动画。
     * @param toAnimation @en Mix end animation. @zh 过渡结束动画。
     * @param duration @ Time of animation mix. @zh 动画过渡时间。
     */
    public setMix (fromAnimation: string, toAnimation: string, duration: number): void {
        if (this.isAnimationCached()) {
            warn('cached mode not support setMix!!!');
            return;
        }
        if (this._state) {
            this._instance!.setMix(fromAnimation, toAnimation, duration);
            //this._state.data.setMix(fromAnimation, toAnimation, duration);
        }
    }

    /**
     * @en Clears all tracks of animation state.
     * @zh 清除所有 track 的动画状态。
     */
    public clearTracks (): void {
        if (this.isAnimationCached()) {
            warn('\'clearTracks\' interface can not be invoked in cached mode.');
        } else if (this._state) {
            this._state.clearTracks();
            this.setToSetupPose();
        }
    }

    /**
     * @en Clears track of animation state by trackIndex.
     * @zh 清除出指定 track 的动画状态。
     * @param trackIndex @en Index of track. @zh 动画通道索引。
     */
    public clearTrack (trackIndex: number): void {
        if (this.isAnimationCached()) {
            warn('\'clearTrack\' interface can not be invoked in cached mode.');
        } else if (this._state) {
            this._state.clearTrack(trackIndex);
            if (EDITOR_NOT_IN_PREVIEW) {
                this._state.update(0);
            }
        }
    }

    /**
     * @en Computes the world SRT from the local SRT for each bone.
     * @zh 重新更新所有骨骼的世界 Transform，
     * 当获取 bone 的数值未更新时，即可使用该函数进行更新数值。
     * @example
     * var bone = spine.findBone('head');
     * cc.log(bone.worldX); // return 0;
     * spine.updateWorldTransform();
     * bone = spine.findBone('head');
     * cc.log(bone.worldX); // return -23.12;
     */
    protected updateWorldTransform (): void {
        if (!this.isAnimationCached()) return;

        if (this._skeleton) {
            this._skeleton.updateWorldTransform();
        }
    }

    private _verifySockets (sockets: SpineSocket[]): void {
        for (let i = 0, l = sockets.length; i < l; i++) {
            const target = sockets[i].target;
            if (target) {
                if (!target.parent || (target.parent !== this.node)) {
                    error(`Target node ${target.name} is expected to be a direct child of ${this.node.name}`);
                    continue;
                }
            }
        }
        const uniqueSocketNode: Map<Node, boolean> = new Map();
        sockets.forEach((x: SpineSocket): void => {
            if (x.target) {
                if (uniqueSocketNode.get(x.target)) {
                    error(`Target node ${x.target.name} has existed.`);
                } else {
                    uniqueSocketNode.set(x.target, true);
                }
            }
        });
    }

    protected _updateSocketBindings (): void {
        if (!this._skeleton) return;
        this._socketNodes.clear();
        for (let i = 0, l = this._sockets.length; i < l; i++) {
            const socket = this._sockets[i];
            if (socket.path && socket.target) {
                const boneIdx = this._cachedSockets.get(socket.path);
                if (!boneIdx) {
                    error(`Skeleton data does not contain path ${socket.path}`);
                    continue;
                }
                this._socketNodes.set(boneIdx, socket.target);
            }
        }
    }

    protected _indexBoneSockets (): void {
        if (!this._skeleton) {
            return;
        }
        this._cachedSockets.clear();
        const bones = this._skeleton.bones;
        const getBoneName = (bone: spine.Bone): string => {
            if (bone.parent == null) return bone.data.name || '<Unamed>';
            return `${getBoneName(bones[bone.parent.data.index])}/${bone.data.name}`;
        };
        for (let i = 0, l = bones.length; i < l; i++) {
            const bd = bones[i].data;
            const boneName: string = getBoneName(bones[i]);
            this._cachedSockets.set(boneName, bd.index);
        }
    }

    /**
     * @en Query all bones that can attach sockets.
     * @zh 查询所有可以添加挂点的所有骨骼。
     * @return String typed array of bones's path.
     */
    public querySockets (): string[] {
        if (!this._skeleton) {
            return [];
        }
        if (this._cachedSockets.size === 0) {
            this._indexBoneSockets();
        }

        if (this._cachedSockets.size > 0) {
            return Array.from(this._cachedSockets.keys()).sort();
        }
        return [];
    }

    // if change use tint mode, just clear material cache
    protected _updateUseTint (): void {
        this._cleanMaterialCache();
        this.destroyRenderData();
        if (!JSB) {
            if (!this.isAnimationCached()) {
                this._instance!.setUseTint(this._useTint);
            }
        }
        if (this._assembler && this._skeleton) {
            this._renderData = this._assembler.createData(this);
            this.markForUpdateRenderData();
        }
    }

    // if change use batch mode, just clear material cache
    protected _updateBatch (): void {
        this._cleanMaterialCache();
        this.markForUpdateRenderData();
    }

    protected _updateDebugDraw (): void {
        if (this.debugBones || this.debugSlots || this.debugMesh) {
            if (!this._debugRenderer) {
                const debugDrawNode = new Node('DEBUG_DRAW_NODE');
                debugDrawNode.layer = this.node.layer;
                debugDrawNode.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
                const debugDraw = debugDrawNode.addComponent(Graphics);
                debugDraw.lineWidth = 5;
                debugDraw.strokeColor = new Color(255, 0, 0, 255);

                this._debugRenderer = debugDraw;
                debugDrawNode.parent = this.node;
                this.node.on(NodeEventType.LAYER_CHANGED, this._applyLayer, this);
            }
            if (this.isAnimationCached()) {
                warn('Debug bones or slots is invalid in cached mode');
            } else if (!JSB) {
                this._instance!.setDebugMode(true);
            }
        } else if (this._debugRenderer) {
            this.node.off(NodeEventType.LAYER_CHANGED, this._applyLayer, this);
            this._debugRenderer.node.destroy();
            this._debugRenderer = null;
            if (!this.isAnimationCached()) {
                if (this._instance) {
                    this._instance.setDebugMode(false);
                }
            }
        }
    }

    private _updateUITransform (): void {
        const uiTrans = this.node._uiProps.uiTransformComp!;
        const skeletonData = this._runtimeData;
        if (!skeletonData) {
            uiTrans.setContentSize(100, 100);
            uiTrans.anchorX = 0.5;
            uiTrans.anchorX = 0.5;
            return;
        }
        const width = skeletonData.width;
        const height = skeletonData.height;
        if (width && height) {
            uiTrans.setContentSize(width, height);
            if (width !== 0) uiTrans.anchorX = Math.abs(skeletonData.x) / width;
            if (height !== 0) uiTrans.anchorY = Math.abs(skeletonData.y) / height;
        }
    }

    /**
     * @engineInternal
     */
    public _updateColor (): void {
        const a = this.node._uiProps.opacity;
        // eslint-disable-next-line max-len
        if (this._tempColor.r === this._color.r && this._tempColor.g === this._color.g && this._tempColor.b === this._color.b && this._tempColor.a === a) {
            return;
        }
        this.node._uiProps.colorDirty = true;
        this._tempColor.r = this._color.r;
        this._tempColor.g = this._color.g;
        this._tempColor.b = this._color.b;
        this._tempColor.a = a;
        const r = this._color.r / 255.0;
        const g = this._color.g / 255.0;
        const b = this._color.b / 255.0;
        this._instance!.setColor(r, g, b, a);
    }

    /**
     * @en Sets vertex effect delegate.
     * @zh 设置顶点特效动画代理。
     * @param effectDelegate @en Vertex effect delegate. @zh 顶点特效代理。
     */
    public setVertexEffectDelegate (effectDelegate: VertexEffectDelegate | null | undefined): void {
        if (!this._instance) {
            return;
        }
        if (!effectDelegate) {
            this._instance.clearEffect();
            return;
        }
        const effectType = effectDelegate?.getEffectType();
        if (effectType === 'jitter') {
            const jitterEffect = effectDelegate?.getJitterVertexEffect();
            this._instance.setJitterEffect(jitterEffect);
        } else if (effectType === 'swirl') {
            const swirlEffect = effectDelegate?.getJitterVertexEffect();
            this._instance.setSwirlEffect(swirlEffect);
        }
    }

    protected _ensureListener (): void {
        if (!this._listener) {
            this._listener = new TrackEntryListeners();
            this._eventListenerID = TrackEntryListeners.addListener(this._listener);
            this._instance!.setListener(this._eventListenerID);
        }
    }

    /**
     * @en Sets the start event listener.
     * @zh 用来设置开始播放动画的事件监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setStartListener (listener: TrackListener): void {
        this._ensureListener();
        this._listener!.start = listener;
    }

    /**
     * @en Sets the interrupt event listener.
     * @zh 用来设置动画被打断的事件监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setInterruptListener (listener: TrackListener): void {
        this._ensureListener();
        this._listener!.interrupt = listener;
    }

    /**
     * @en Sets the end event listener.
     * @zh 用来设置动画播放完后的事件监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setEndListener (listener: TrackListener): void {
        this._ensureListener();
        this._listener!.end = listener;
    }

    /**
     * @en Sets the dispose event listener.
     * @zh 用来设置动画将被销毁的事件监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setDisposeListener (listener: TrackListener): void {
        this._ensureListener();
        this._listener!.dispose = listener;
    }

    /**
     * @en Sets the complete event listener.
     * @zh 用来设置动画播放一次循环结束后的事件监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setCompleteListener (listener: TrackListener): void {
        this._ensureListener();
        this._listener!.complete = listener;
    }

    /**
     * @en Sets the animation event listener.
     * @zh 用来设置动画播放过程中帧事件的监听。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setEventListener (listener: TrackListener2): void {
        this._ensureListener();
        this._listener!.event = listener;
    }

    /**
     * @en Sets the start event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画开始播放的事件监听。
     * @param entry @en Animation track entry. @zh Track entry。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackStartListener (entry: spine.TrackEntry, listener: TrackListener): void {
        TrackEntryListeners.getListeners(entry, this._instance!).start = listener;
    }

    /**
     * @en Sets the interrupt event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画被打断的事件监听。
     * @param entry
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackInterruptListener (entry: spine.TrackEntry, listener: TrackListener): void {
        TrackEntryListeners.getListeners(entry, this._instance!).interrupt = listener;
    }

    /**
     * @en Sets the end event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画播放结束的事件监听。
     * @param entry
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackEndListener (entry: spine.TrackEntry, listener: TrackListener): void {
        TrackEntryListeners.getListeners(entry, this._instance!).end = listener;
    }

    /**
     * @en Sets the dispose event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画即将被销毁的事件监听。
     * @param entry
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackDisposeListener (entry: spine.TrackEntry, listener: TrackListener): void {
        TrackEntryListeners.getListeners(entry, this._instance!).dispose = listener;
    }

    /**
     * @en Sets the complete event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画一次循环播放结束的事件监听。
     * @param entry @en AnimationState track. @zn 动画轨道属性。
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackCompleteListener (entry: spine.TrackEntry, listener: TrackListener2): void {
        const onComplete = (trackEntry: spine.TrackEntry): void => {
            const loopCount = Math.floor(trackEntry.trackTime / trackEntry.animationEnd);
            listener(trackEntry, loopCount);
            // this._instance.setListener(listenerID, spine.EventType.event);
            // this._listener!.event = listener;
        };
        TrackEntryListeners.getListeners(entry, this._instance!).complete = onComplete;
    }

    /**
     * @en Sets the event listener for specified TrackEntry.
     * @zh 用来为指定的 TrackEntry 设置动画帧事件的监听。
     * @param entry
     * @param listener @en Listener for registering callback functions. @zh 监听器对象，可注册回调方法。
     */
    public setTrackEventListener (entry: spine.TrackEntry, listener: TrackListener|TrackListener2): void {
        TrackEntryListeners.getListeners(entry, this._instance!).event = listener;
    }

    /**
     * @engineInternal
    */
    public getDebugShapes (): any {
        return this._instance!.getDebugShapes();
    }

    /**
     * @en Set texture for slot, this function can be use to changing local skin.
     * @zh 为 slot 设置贴图纹理，可使用该该方法实现局部换装功能。
     * @param slotName @en The name of slot. @zh Slot 名字。
     * @param tex2d @en The texture will show on the slot. @zh 在该 Slot 上显示的 2D 纹理。
     * @param createNew @en Whether to create new Attachment. If value is false, all sp.Skeleton share the
     * same attachment will be changed. @zh 是否需要创建新的 attachment，如果值为 false, 所有共享相同 attachment
     * 的组件都将受影响。
     */
    public setSlotTexture (slotName: string, tex2d: Texture2D, createNew?: boolean): void {
        if (this.isAnimationCached()) {
            error(`Cached mode can't change texture of slot`);
            return;
        }
        const slot = this.findSlot(slotName);
        if (!slot) {
            error(`No slot named:${slotName}`);
            return;
        }
        const width = tex2d.width;
        const height = tex2d.height;
        const createNewAttachment = createNew || false;
        this._instance!.resizeSlotRegion(slotName, width, height, createNewAttachment);
        if (!this._slotTextures) this._slotTextures = new Map<number, Texture2D>();
        let textureID = 0;
        this._slotTextures.forEach((value, key) => {
            if (value === tex2d) textureID = key;
        });
        if (textureID === 0) {
            textureID = ++_slotTextureID;
            this._slotTextures.set(textureID, tex2d);
        }
        this._instance!.setSlotTexture(slotName, textureID);
    }

    private _destroySkeletonInfo (skeletonCache: SkeletonCache | null): void {
        if (skeletonCache && this._skeletonInfo) {
            skeletonCache.destroySkeleton(this._skeletonInfo.assetUUID);
            this._skeletonInfo = null;
        }
    }

    protected _applyLayer (): void {
        if (this._debugRenderer) {
            this._debugRenderer.node.layer = this.node.layer;
        }
    }
}

legacyCC.internal.SpineSkeleton = Skeleton;
