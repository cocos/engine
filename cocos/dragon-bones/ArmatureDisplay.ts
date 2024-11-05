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

import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { Armature, Bone, EventObject, AnimationState } from '@cocos/dragonbones-js';
import { UIRenderer } from '../2d/framework/ui-renderer';
import { Color, Enum, ccenum, errorID, RecyclePool, js, CCObject, EventTarget, cclegacy, _decorator, warn } from '../core';
import { BlendFactor } from '../gfx';
import { AnimationCache, ArmatureCache, ArmatureFrame } from './ArmatureCache';
import { AttachUtil } from './AttachUtil';
import { CCFactory } from './CCFactory';
import { DragonBonesAsset } from './DragonBonesAsset';
import { DragonBonesAtlasAsset } from './DragonBonesAtlasAsset';
import { Graphics } from '../2d/components';
import { CCArmatureDisplay } from './CCArmatureDisplay';
import { MaterialInstance } from '../render-scene/core/material-instance';
import { ArmatureSystem } from './ArmatureSystem';
import { Batcher2D } from '../2d/renderer/batcher-2d';
import { RenderEntity, RenderEntityType } from '../2d/renderer/render-entity';
import { RenderDrawInfo } from '../2d/renderer/render-draw-info';
import { Material, Texture2D } from '../asset/assets';
import { Node } from '../scene-graph';
import { builtinResMgr } from '../asset/asset-manager';
import { setPropertyEnumType } from '../core/internal-index';

enum DefaultArmaturesEnum {
    default = -1,
}
ccenum(DefaultArmaturesEnum);

enum DefaultAnimsEnum {
    '<None>' = 0,
}
ccenum(DefaultAnimsEnum);

enum DefaultCacheMode {
    REALTIME = 0,
}
ccenum(DefaultCacheMode);

/**
 * @en Control animation speed, should be larger than 0.
 * @zh 控制龙骨动画播放速度，数值应大于 0。
 */
// eslint-disable-next-line prefer-const,import/no-mutable-exports
export let timeScale = 1;

/**
 * @en Enum for cache mode type.
 * @zh Dragonbones 渲染类型。
 * @enum ArmatureDisplay.AnimationCacheMode
 */
export enum AnimationCacheMode {
    /**
     * @en The realtime mode.
     * @zh 实时计算模式。
     * @property {Number} REALTIME
     */
    REALTIME = 0,
    /**
     * @en The shared cache mode.
     * @zh 共享缓存模式。
     * @property {Number} SHARED_CACHE
     */
    SHARED_CACHE = 1,
    /**
     * @en The private cache mode.
     * @zh 私有缓存模式。
     * @property {Number} PRIVATE_CACHE
     */
    PRIVATE_CACHE = 2
}
ccenum(AnimationCacheMode);

const { ccclass, serializable, editable, type, help, menu, tooltip, visible, displayName, override, displayOrder, executeInEditMode } = _decorator;

/**
 * @en Struct that can store rendering data-related information.
 * @zh 用于存储渲染数据相关信息的结构体。
 */
export interface ArmatureDisplayDrawData {
    /**
     * @en A Material instance. @zh 材质实例。
     */
    material: Material | null;
    /**
     * @en 2D Texture. @zh 2D 纹理。
     */
    texture: Texture2D | null;
    /**
     * @en Vertex index offset. @zh 顶点索引偏移。
     */
    indexOffset: number;
    /**
     * @en Vertex index count. @zh 顶点索引数量。
     */
    indexCount: number;
}

/**
 * @en DragonBones Socket. Used to attach components to bone nodes and move them together
 * with bone animations. Developers need to specify the bone path that needs to follow the
 * movement and which node the motion transformation will be applied to.
 * @zh 骨骼挂点。用于将组件挂载在骨骼节点上，随骨骼动画一起运动。
 * 用户需指定需要跟随运动的骨骼路径以及运动变换将作用于哪个节点上。
 */
@ccclass('dragonBones.ArmatureDisplay.DragonBoneSocket')
export class DragonBoneSocket {
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

    public boneIndex: number | null = null;

    constructor (path = '', target: Node | null = null) {
        this.path = path;
        this.target = target;
    }
}

js.setClassAlias(DragonBoneSocket, 'dragonBones.ArmatureDisplay.DragonBoneSocket');

// eslint-disable-next-line @typescript-eslint/ban-types
interface BoneIndex extends Number {
    _any: number;
}

/**
 * @en
 * The Armature Display of DragonBones <br/>
 * <br/>
 * Armature Display has a reference to a DragonBonesAsset and stores the state for ArmatureDisplay instance,
 * which consists of the current pose's bone SRT, slot colors, and which slot attachments are visible. <br/>
 * Multiple Armature Display can use the same DragonBonesAsset which includes all animations, skins, and attachments. <br/>
 * Cocos Creator supports DragonBones version to 5.6.300.
 * @zh
 * DragonBones 骨骼动画 <br/>
 * <br/>
 * Armature Display 具有对骨骼数据的引用并且存储了骨骼实例的状态，
 * 它由当前的骨骼动作，slot 颜色，和可见的 slot attachments 组成。<br/>
 * 多个 Armature Display 可以使用相同的骨骼数据，其中包括所有的动画，皮肤和 attachments。<br/>
 * Cocos Creator 支持 DragonBones 版本最高到 v5.6.300.
 *
 * @class ArmatureDisplay
 * @extends RenderComponent
 */
@ccclass('dragonBones.ArmatureDisplay')
@help('i18n:cc.DragonBones')
@menu('DragonBones/ArmatureDisplay')
@executeInEditMode
export class ArmatureDisplay extends UIRenderer {
    static AnimationCacheMode = AnimationCacheMode;

    /**
     * @en
     * The DragonBones data contains the armatures information (bind pose bones, slots, draw order,
     * attachments, skins, etc) and animations but does not hold any state.<br/>
     * Multiple ArmatureDisplay can share the same DragonBones data.
     * @zh
     * 骨骼数据包含了骨骼信息（绑定骨骼动作，slots，渲染顺序，
     * attachments，皮肤等等）和动画但不持有任何状态。<br/>
     * 多个 ArmatureDisplay 可以共用相同的骨骼数据。
     * @property {DragonBonesAsset} dragonAsset
     */
    @editable
    @type(DragonBonesAsset)
    @tooltip('i18n:COMPONENT.dragon_bones.dragon_bones_asset')
    get dragonAsset (): DragonBonesAsset | null {
        return this._dragonAsset;
    }
    set dragonAsset (value) {
        this._dragonAsset = value;
        this.destroyRenderData();
        this._refresh();
        if (EDITOR_NOT_IN_PREVIEW) {
            this._defaultArmatureIndex = 0;
            this._animationIndex = 0;
        }
    }

    /**
     * @en
     * The atlas asset for the DragonBones.
     * @zh
     * 骨骼数据所需的 Atlas Texture 数据。
     * @property {DragonBonesAtlasAsset} dragonAtlasAsset
     */
    @editable
    @type(DragonBonesAtlasAsset)
    @tooltip('i18n:COMPONENT.dragon_bones.dragon_bones_atlas_asset')
    get dragonAtlasAsset (): DragonBonesAtlasAsset | null { return this._dragonAtlasAsset; }
    set dragonAtlasAsset (value) {
        this._dragonAtlasAsset = value;
        this._parseDragonAtlasAsset();
        this._refresh();
    }

    /**
     * @en The name of current armature.
     * @zh 当前的 Armature 名称。
     * @property {String} armatureName
     */
    @visible(false)
    get armatureName (): string { return this._armatureName; }
    set armatureName (name) {
        this._armatureName = name;
        const animNames = this.getAnimationNames(this._armatureName);

        if (!this.animationName || animNames.indexOf(this.animationName) < 0) {
            if (EDITOR_NOT_IN_PREVIEW) {
                this.animationName = animNames[0];
            } else {
                // Not use default animation name at runtime
                this.animationName = '';
            }
        }

        if (this._armature && !this.isAnimationCached()) {
            this._factory!._dragonBones.clock.remove(this._armature);
        }

        this._refresh();

        if (this._armature && !this.isAnimationCached()) {
            this._factory!._dragonBones.clock.add(this._armature);
        }
    }

    /**
     * @en The name of current playing animation.
     * @zh 当前播放的动画名称。
     * @property {String} animationName
     */
    @visible(false)
    get animationName (): string {
        return this._animationName;
    }
    set animationName (value) {
        this._animationName = value;
    }

    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    @displayName('Armature')
    @editable
    @type(DefaultArmaturesEnum)
    @tooltip('i18n:COMPONENT.dragon_bones.armature_name')
    get _defaultArmatureIndex (): DefaultArmaturesEnum {
        return this._defaultArmatureIndexValue;
    }
    set _defaultArmatureIndex (value: DefaultArmaturesEnum) {
        this._defaultArmatureIndexValue = value;
        let armatureName = '';
        if (this.dragonAsset) {
            let armaturesEnum;
            if (this.dragonAsset) {
                armaturesEnum = this.dragonAsset.getArmatureEnum();
            }
            if (!armaturesEnum) {
                errorID(7400, this.name);
                return;
            }

            armatureName = armaturesEnum[this._defaultArmatureIndex];
        }

        if (armatureName !== undefined) {
            this.armatureName = armatureName;
        } else {
            errorID(7401, this.name);
        }
        this.markForUpdateRenderData();
    }

    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    @editable
    @type(DefaultAnimsEnum)
    @displayName('Animation')
    @tooltip('i18n:COMPONENT.dragon_bones.animation_name')
    get _animationIndex (): DefaultAnimsEnum {
        return this._animationIndexValue;
    }
    set _animationIndex (value) {
        this._animationIndexValue = value;

        if (this._animationIndex === 0) {
            this.animationName = '';
            return;
        }

        let animsEnum;
        if (this.dragonAsset) {
            animsEnum = this.dragonAsset.getAnimsEnum(this.armatureName);
        }

        if (!animsEnum) {
            return;
        }

        const animName = animsEnum[this._animationIndex];
        if (animName !== undefined) {
            this.playAnimation(animName, this.playTimes);
        } else {
            errorID(7402, this.name);
        }
    }

    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    @editable
    @displayName('Animation Cache Mode')
    @tooltip('i18n:COMPONENT.dragon_bones.animation_cache_mode')
    get _defaultCacheMode (): AnimationCacheMode { return this._defaultCacheModeValue; }
    set _defaultCacheMode (value) {
        this._defaultCacheModeValue = value;

        if (this._defaultCacheMode !== AnimationCacheMode.REALTIME) {
            if (this._armature && !ArmatureCache.canCache(this._armature)) {
                this._defaultCacheMode = AnimationCacheMode.REALTIME;
                warn('Animation cache mode doesn\'t support skeletal nesting');
                return;
            }
        }
        this.setAnimationCacheMode(this._defaultCacheMode);
    }
    /**
     * @en The time scale of this armature.
     * @zh 当前骨骼中所有动画的时间缩放率。
     * @property {Number} timeScale
     * @default 1
     */
    @editable
    @tooltip('i18n:COMPONENT.dragon_bones.time_scale')
    @serializable
    get timeScale (): number { return this._timeScale; }
    set timeScale (value) {
        this._timeScale = value;

        if (this._armature && !this.isAnimationCached()) {
            this._armature.animation.timeScale = this.timeScale;
        }
    }

    /**
     * @en The play times of the default animation.
     *      -1 means using the value of config file;
     *      0 means repeat for ever
     *      >0 means repeat times
     * @zh 播放默认动画的循环次数
     *      -1 表示使用配置文件中的默认值;
     *      0 表示无限循环
     *      >0 表示循环次数
     * @property {Number} playTimes
     * @default -1
     */
    @tooltip('i18n:COMPONENT.dragon_bones.play_times')
    @editable
    @serializable
    public playTimes = -1;

    /**
     * @en Indicates whether to enable premultiplied alpha.
     * You should disable this option when image's transparent area appears to have opaque pixels,
     * or enable this option when image's half transparent area appears to be darken.
     * @zh 是否启用贴图预乘。
     * 当图片的透明区域出现色块时需要关闭该选项，当图片的半透明区域颜色变黑时需要启用该选项。
     * @property {Boolean} premultipliedAlpha
     * @default false
     */
    @serializable
    @editable
    @tooltip('i18n:COMPONENT.skeleton.premultipliedAlpha')
    public premultipliedAlpha = false;

    /**
     * @en Indicates whether open debug bones.
     * @zh 是否显示 bone 的 debug 信息。
     * @property {Boolean} debugBones
     * @default false
     */
    @tooltip('i18n:COMPONENT.dragon_bones.debug_bones')
    @editable
    get debugBones (): boolean { return this._debugBones; }
    set debugBones (value) {
        this._debugBones = value;
        this._updateDebugDraw();
    }

    /**
     * @en Enabled batch model. If rendering a large number of identical textures and simple
     * skeleton animations, enabling batching can reduce the number of drawcalls and improve
     * rendering efficiency, otherwise it is not necessary to enable it.
     * @zh 开启合批。如果渲染大量相同纹理，且结构简单的龙骨动画，开启合批可以降低 drawcall 数量，
     * 提升渲染效率，否则不需要开启。
    */
    @tooltip('i18n:COMPONENT.dragon_bones.enabled_batch')
    @editable
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
     * Sockets have to be registered here before attaching custom nodes to animated bones.
     * @zh
     * 当前动画组件维护的挂点数组。要挂载自定义节点到受动画驱动的骨骼上，必须先在此注册挂点。
     */
    @type([DragonBoneSocket])
    @tooltip('i18n:animation.sockets')
    get sockets (): DragonBoneSocket[] {
        return this._sockets;
    }

    set sockets (val: DragonBoneSocket[]) {
        this._verifySockets(val);
        this._sockets = val;
        this._updateSocketBindings();
        // this.attachUtil._syncAttachedNode();
        if (val.length > 0 && this._frameCache) {
            this._frameCache.enableCacheAttachedInfo();
        }
    }
    /**
     * @en Gets the socket nodes. Socket nodes are registered synchronous motion
     * transformation with bones.
     * @zh 获取 socket nodes，socket nodes 被注册到组件上，可以随骨骼做同步运动变换。
     */
    get socketNodes (): Map<string, Node> { return this._socketNodes; }
    /**
     * @en The armature is the core of the skeletal animation system.
     * @zh 骨架是骨骼动画系统的核心。
     */
    _armature: Armature | null = null;
    /**
     * @en The tool for mounting functionality.
     * @zh 挂载工具。
     */
    public attachUtil: AttachUtil;
    /**
     * @en Draw call list.
     * @zh Draw call 列表。
     */
    get drawList (): RecyclePool<ArmatureDisplayDrawData> { return this._drawList; }
    @serializable
    protected _defaultArmatureIndexValue: DefaultArmaturesEnum = DefaultArmaturesEnum.default;
    /**
     * @en The skeleton data of dragonBones.
     * @zh DragonBones 的骨骼数据。
     */
    @serializable
    /* protected */ _dragonAsset: DragonBonesAsset | null = null;
    /**
     * @en The skeleton atlas data of dragonBones.
     * @zh DragonBones 的骨骼纹理数据。
     */
    @serializable
    /* protected */ _dragonAtlasAsset: DragonBonesAtlasAsset | null = null;
    @serializable
    /**
     * @en The armature data name.
     * @zh 骨架数据名称。
     */
    /* protected */ _armatureName = '';
    @serializable
    protected _animationName = '';
    @serializable
    protected _animationIndexValue: DefaultAnimsEnum = 0;
    protected _preCacheMode = -1;
    protected _cacheMode: AnimationCacheMode = AnimationCacheMode.REALTIME;
    @serializable
    protected _defaultCacheModeValue: AnimationCacheMode = AnimationCacheMode.REALTIME;
    @serializable
    protected _timeScale = 1;
    @serializable
    protected _playTimes = -1;

    @serializable
    protected _debugBones = false;

    @serializable
    protected _enableBatch = false;
    /**
     * @en The graphics component for debugging.
     * @zh 用于调试的 Graphics 组件。
     */
    /* protected */ _debugDraw: Graphics | null = null;

    // DragonBones data store key.
    /**
     * @engineInternal
     */
    protected _armatureKey = '';

    // Below properties will effect when cache mode is SHARED_CACHE or PRIVATE_CACHE.
    // accumulate time
    /**
     * @engineInternal
     */
    protected _accTime = 0;
    // Play times counter
    /**
     * @engineInternal
     */
    protected _playCount = 0;
    // Frame cache
    /**
     * @engineInternal
     */
    protected _frameCache: AnimationCache | null = null;
    // Cur frame
    /**
     * @engineInternal
     */
    public _curFrame: ArmatureFrame | null = null;
    // Playing flag
    protected _playing = false;
    // Armature cache
    protected _armatureCache: ArmatureCache | null = null;

    protected _eventTarget: EventTarget;

    protected _factory: CCFactory | null = null;

    protected _displayProxy: CCArmatureDisplay | null = null;

    protected _drawIdx = 0;
    protected _drawList = new RecyclePool<ArmatureDisplayDrawData>((): ArmatureDisplayDrawData => ({
        material: null,
        texture: null,
        indexOffset: 0,
        indexCount: 0,
    }), 1);
    /**
    * @engineInternal
    */
    public maxVertexCount = 0;
    /**
    * @engineInternal
    */
    public maxIndexCount = 0;

    protected _materialCache: { [key: string]: MaterialInstance } = {} as any;

    protected _enumArmatures: any = Enum({});
    protected _enumAnimations: any = Enum({});

    protected _socketNodes = new Map<string, Node>();
    protected _cachedSockets = new Map<string, BoneIndex>();

    @serializable
    protected _sockets: DragonBoneSocket[] = [];

    private _inited;
    private _drawInfoList: RenderDrawInfo[] = [];
    private requestDrawInfo (idx: number): RenderDrawInfo {
        if (!this._drawInfoList[idx]) {
            this._drawInfoList[idx] = new RenderDrawInfo();
        }
        return this._drawInfoList[idx];
    }

    constructor () {
        super();
        // Property _materialCache Use to cache material,since dragonBones may use multiple texture,
        // it will clone from the '_material' property,if the dragonbones only have one texture,
        // it will just use the _material,won't clone it.
        // So if invoke getMaterial,it only return _material,if you want to change all materialCache,
        // you can change materialCache directly.
        this._eventTarget = new EventTarget();
        this._inited = false;
        this.attachUtil = new AttachUtil();
        this.initFactory();
        setPropertyEnumType(this, '_animationIndex', this._enumAnimations);
        setPropertyEnumType(this, '_defaultArmatureIndex', this._enumArmatures);
        this._useVertexOpacity = true;
    }
    /**
     * @en Initializes _factory from CCFactory, if golbal factory not exists, will create a new one.
     * @zh 初始化变量 _factory，如果全局工厂实例不存在将新创建一个工厂实列对象。
     */
    initFactory (): void {
        this._factory = CCFactory.getInstance();
    }

    onLoad (): void {
        super.onLoad();
    }

    /**
     * @engineInternal
     */
    public _requestDrawData (material: Material, texture: Texture2D, indexOffset: number, indexCount: number): ArmatureDisplayDrawData {
        const draw = this._drawList.add();
        draw.material = material;
        draw.texture = texture;
        draw.indexOffset = indexOffset;
        draw.indexCount = indexCount;
        return draw;
    }
    /**
     * @en
     * Destroy render data，will be called when need to rebuild render data or component is destroyed.
     * @zh
     * 销毁渲染数据，一般在重新生成渲染数据时或销毁组件时调用。
     */
    public destroyRenderData (): void {
        this._drawList.reset();
        super.destroyRenderData();
    }

    private getMaterialTemplate (): Material {
        if (this.customMaterial !== null) return this.customMaterial;
        if (this.material) return this.material;
        this.updateMaterial();
        return this.material!;
    }

    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    public getMaterialForBlend (src: BlendFactor, dst: BlendFactor): MaterialInstance {
        const key = `${src}/${dst}`;
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
        inst.recompileShaders({ TWO_COLORED: false, USE_LOCAL: false });
        this._materialCache[key] = inst;
        inst.overridePipelineStates({
            blendState: {
                targets: [{
                    blendSrc: src, blendDst: dst,
                }],
            },
        });
        return inst;
    }

    protected _updateBuiltinMaterial (): Material {
        const material = builtinResMgr.get<Material>('default-spine-material');
        return material;
    }

    /**
     * @en Custom material.
     * @zh 自定义材质。
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

    /**
     * @engineInternal
     */
    public updateMaterial (): void {
        let mat;
        if (this._customMaterial) mat = this._customMaterial;
        else mat = this._updateBuiltinMaterial();
        this.setSharedMaterial(mat as Material, 0);
        this._cleanMaterialCache();
    }

    protected _render (batcher: Batcher2D): void {
        let indicesCount = 0;
        if (this.renderData && this._drawList) {
            const rd = this.renderData;
            const chunk = rd.chunk;
            const accessor = chunk.vertexAccessor;
            const meshBuffer = rd.getMeshBuffer()!;
            const origin = meshBuffer.indexOffset;
            // Fill index buffer
            for (let i = 0; i < this._drawList.length; i++) {
                this._drawIdx = i;
                const dc = this._drawList.data[i];
                if (dc.texture) {
                    batcher.commitMiddleware(
                        this,
                        meshBuffer,
                        origin + dc.indexOffset,
                        dc.indexCount,
                        dc.texture,
                        dc.material!,
                        this._enableBatch,
                    );
                }
                indicesCount += dc.indexCount;
            }
            const subIndices = rd.indices!.subarray(0, indicesCount);
            accessor.appendIndices(chunk.bufferId, subIndices);
        }
    }

    __preload (): void {
        super.__preload();
        this._init();
    }
    /**
     * @en Initialize asset data and internal data within the component.
     * @zh 初始化资产数据以及组件内部数据。
     */
    _init (): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            const Flags = CCObject.Flags;
            this._objFlags |= (Flags.IsAnchorLocked | Flags.IsSizeLocked);
            // this._refreshInspector();
        }

        this._cacheMode = this._defaultCacheMode;

        if (this._inited) return;
        this._inited = true;

        // this._resetAssembler();
        // this._activateMaterial();

        this._parseDragonAtlasAsset();
        this._refresh();

        const children = this.node.children;
        for (let i = 0, n = children.length; i < n; i++) {
            const child = children[i];
            if (child && child.name === 'DEBUG_DRAW_NODE') {
                child.destroy();
            }
        }
        this._updateDebugDraw();
        this._indexBoneSockets();
        this._updateSocketBindings();
    }

    /**
     * @en
     * The key of dragonbones cache data, which is regard as 'dragonbonesName', when you want to change dragonbones cloth.
     * @zh
     * 缓存龙骨数据的 key 值，换装的时会使用到该值，作为 'dragonbonesName' 使用。
     * @method getArmatureKey
     * @returns @en The key of dragonbones cache data. @zh 缓存龙骨数据的 key 值。
     * @example
     * let factory = dragonBones.CCFactory.getInstance();
     * let needChangeSlot = needChangeArmature.armature().getSlot("changeSlotName");
     * factory.replaceSlotDisplay(toChangeArmature.getArmatureKey(), "armatureName", "slotName", "displayName", needChangeSlot);
     */
    getArmatureKey (): string {
        return this._armatureKey;
    }

    /**
     * @en
     * It's best to set cache mode before set property 'dragonAsset', or will waste some cpu time.
     * If set the mode in editor, then no need to worry about order problem.
     * @zh
     * 若想切换渲染模式，最好在设置'dragonAsset'之前，先设置好渲染模式，否则有运行时开销。
     * 若在编辑中设置渲染模式，则无需担心设置次序的问题。
     *
     * @method setAnimationCacheMode
     * @param cacheMode
     *      @en The value can be set to REALTIME, SHARED_CACHE, or PRIVATE_CACHE.
     *      @zh 可以在 REALTIME，SHARED_CACHE，PRIVATE_CACHE 中取值。
     * @example
     * armatureDisplay.setAnimationCacheMode(dragonBones.ArmatureDisplay.AnimationCacheMode.SHARED_CACHE);
     */
    setAnimationCacheMode (cacheMode: AnimationCacheMode): void {
        if (this._preCacheMode !== cacheMode) {
            this._cacheMode = cacheMode;
            this._buildArmature();
            if (this._armature && !this.isAnimationCached()) {
                this._factory!._dragonBones.clock.add(this._armature);
            }
            this._updateSocketBindings();
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en Whether in cached mode.
     * @zh 当前是否处于缓存模式。
     * @method isAnimationCached
     * @returns @en True means animation mode is SHARED_CACHE or PRIVATE_CACHE.
     *              False means animation mode is REALTIME.
     *          @zh True 代表动画使用 SHARED_CACHE 或 PRIVATE_CACHE 模式。
     *              False 代表动画使用 REALTIME 模式。
     */
    isAnimationCached (): boolean {
        if (EDITOR_NOT_IN_PREVIEW) return false;
        return this._cacheMode !== AnimationCacheMode.REALTIME;
    }
    /**
     * @en Be called when the component state becomes available.
     * Instance of ArmatureDisplay will be added into ArmatureSystem.
     * @zh 组件状态变为可用时调用。ArmatureDisplay 实例将被添加到 ArmatureSystem。
     */
    onEnable (): void {
        super.onEnable();
        // If cache mode is cache, no need to update by dragonbones library.
        if (this._armature && !this.isAnimationCached()) {
            this._factory!._dragonBones.clock.add(this._armature);
        }
        this._flushAssembler();
        ArmatureSystem.getInstance().add(this);
    }
    /**
     * @en Be called when the component state becomes invalid.
     * Instance of ArmatureDisplay will be removed from ArmatureSystem.
     * @zh 组件状态变为不可用时调用。ArmatureDisplay 实例将被从 ArmatureSystem 移除。
     */
    onDisable (): void {
        super.onDisable();
        // If cache mode is cache, no need to update by dragonbones library.
        if (this._armature && !this.isAnimationCached()) {
            this._factory!._dragonBones.clock.remove(this._armature);
        }
        ArmatureSystem.getInstance().remove(this);
    }
    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _emitCacheCompleteEvent (): void {
        // Animation loop complete, the event diffrent from dragonbones inner event,
        // It has no event object.
        this._eventTarget.emit(EventObject.LOOP_COMPLETE);

        // Animation complete the event diffrent from dragonbones inner event,
        // It has no event object.
        this._eventTarget.emit(EventObject.COMPLETE);
    }
    /**
     * @en Update animation frame.
     * @zh 更新动画序列。
     * @param dt @en Delta time, unit is second. @zh 时间差，单位为秒。
     */
    updateAnimation (dt): void {
        this.markForUpdateRenderData();
        if (!this.isAnimationCached()) return;
        if (!this._frameCache) return;

        const frameCache = this._frameCache;
        if (!frameCache.isInited()) {
            return;
        }

        const frames = frameCache.frames;
        if (!this._playing) {
            if (frameCache.isInvalid()) {
                frameCache.updateToFrame();
                this._curFrame = frames[frames.length - 1]!;
                // Update render data size if needed
                if (this.renderData
                    && (this.renderData.vertexCount < frameCache.maxVertexCount
                    || this.renderData.indexCount < frameCache.maxIndexCount)) {
                    this.maxVertexCount = frameCache.maxVertexCount > this.maxVertexCount ? frameCache.maxVertexCount : this.maxVertexCount;
                    this.maxIndexCount = frameCache.maxIndexCount > this.maxIndexCount ? frameCache.maxIndexCount : this.maxIndexCount;
                    this.renderData.resize(this.maxVertexCount, this.maxIndexCount);
                    if (!this.renderData.indices || this.maxIndexCount > this.renderData.indices.length) {
                        this.renderData.indices = new Uint16Array(this.maxIndexCount);
                    }
                }
            }
            return;
        }

        const frameTime = ArmatureCache.FrameTime;

        // Animation Start, the event different from dragonbones inner event,
        // It has no event object.
        if (this._accTime === 0 && this._playCount === 0) {
            this._eventTarget.emit(EventObject.START);
        }

        const globalTimeScale = timeScale;
        this._accTime += dt * this.timeScale * globalTimeScale;
        let frameIdx = Math.floor(this._accTime / frameTime);
        if (!frameCache.isCompleted) {
            frameCache.updateToFrame(frameIdx);
            // Update render data size if needed
            if (this.renderData
                && (this.renderData.vertexCount < frameCache.maxVertexCount
                || this.renderData.indexCount < frameCache.maxIndexCount)) {
                this.maxVertexCount = frameCache.maxVertexCount > this.maxVertexCount ? frameCache.maxVertexCount : this.maxVertexCount;
                this.maxIndexCount = frameCache.maxIndexCount > this.maxIndexCount ? frameCache.maxIndexCount : this.maxIndexCount;
                this.renderData.resize(this.maxVertexCount, this.maxIndexCount);
                if (!this.renderData.indices || this.maxIndexCount > this.renderData.indices.length) {
                    this.renderData.indices = new Uint16Array(this.maxIndexCount);
                }
            }
        }

        if (frameCache.isCompleted && frameIdx >= frames.length) {
            this._playCount++;
            if ((this.playTimes > 0 && this._playCount >= this.playTimes)) {
                // set frame to end frame.
                this._curFrame = frames[frames.length - 1]!;
                this._accTime = 0;
                this._playing = false;
                this._playCount = 0;
                this._emitCacheCompleteEvent();
                this.attachUtil._syncAttachedNode();
                return;
            }
            this._accTime = 0;
            frameIdx = 0;
            this._emitCacheCompleteEvent();
        }

        this._curFrame = frames[frameIdx]!;
        this.attachUtil._syncAttachedNode();
    }
    /**
     * @en Destroy component, release resource.
     * @zh 销毁组件时调用，释放相关资源。
     */
    onDestroy (): void {
        this._materialInstances = this._materialInstances.filter((instance): boolean => !!instance);
        this._inited = false;

        if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._cacheMode === AnimationCacheMode.PRIVATE_CACHE) {
                this._armatureCache!.dispose();
                this._armatureCache = null;
                this._armature = null;
            } else if (this._cacheMode === AnimationCacheMode.SHARED_CACHE) {
                this._armatureCache = null;
                this._armature = null;
            } else if (this._armature) {
                this._armature.dispose();
                this._armature = null;
            }
        } else if (this._armature) {
            this._armature.dispose();
            this._armature = null;
        }
        this._drawList.destroy();
        super.onDestroy();
    }
    /**
     * @en Update the debugging component show.
     * @zh 更新调试 Graphic 组件的显示。
     */
    _updateDebugDraw (): void {
        if (this.debugBones) {
            if (!this._debugDraw) {
                const debugDrawNode = new Node('DEBUG_DRAW_NODE');
                debugDrawNode.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
                const debugDraw = debugDrawNode.addComponent(Graphics);
                debugDraw.lineWidth = 1;
                debugDraw.strokeColor = new Color(255, 0, 0, 255);

                this._debugDraw = debugDraw;
            }

            this._debugDraw.node.parent = this.node;
        } else if (this._debugDraw) {
            this._debugDraw.node.parent = null;
        }
        this.markForUpdateRenderData();
    }
    /**
     * @en Update related data due to batching settings.
     * @zh 更新由于合批设置导致的相关数据。
     */
    protected _updateBatch (): void {
        this._cleanMaterialCache();
        this.markForUpdateRenderData();
    }
    /**
     * @en Building data of armature.
     * @zh 构建骨架数据。
     */
    _buildArmature (): void {
        if (!this.dragonAsset || !this.dragonAtlasAsset || !this.armatureName) return;

        // Switch Asset or Atlas or cacheMode will rebuild armature.
        if (this._armature) {
            // dispose pre build armature
            if (!EDITOR_NOT_IN_PREVIEW) {
                if (this._preCacheMode === AnimationCacheMode.PRIVATE_CACHE) {
                    this._armatureCache!.dispose();
                } else if (this._preCacheMode === AnimationCacheMode.REALTIME) {
                    this._armature.dispose();
                }
            } else {
                this._armature.dispose();
            }

            this._armatureCache = null;
            this._armature = null;
            this._displayProxy = null;
            this._frameCache = null;
            this._curFrame = null;
            this._playing = false;
            this._preCacheMode = -1;
        }

        if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._cacheMode === AnimationCacheMode.SHARED_CACHE) {
                this._armatureCache = ArmatureCache.sharedCache;
            } else if (this._cacheMode === AnimationCacheMode.PRIVATE_CACHE) {
                this._armatureCache = new ArmatureCache();
                this._armatureCache.enablePrivateMode();
            }
        }

        const atlasUUID = this.dragonAtlasAsset._uuid;
        this._armatureKey = this.dragonAsset.init(this._factory!, atlasUUID);

        if (this.isAnimationCached()) {
            this._armature = this._armatureCache!.getArmatureCache(this.armatureName, this._armatureKey, atlasUUID);
            if (!this._armature) {
                // Cache fail,swith to REALTIME cache mode.
                this._cacheMode = AnimationCacheMode.REALTIME;
            }
        }

        this._preCacheMode = this._cacheMode;
        if (EDITOR_NOT_IN_PREVIEW || this._cacheMode === AnimationCacheMode.REALTIME) {
            this._displayProxy = this._factory!.buildArmatureDisplay(this.armatureName, this._armatureKey, '', atlasUUID) as CCArmatureDisplay;
            if (!this._displayProxy) return;
            this._displayProxy._ccNode = this.node;
            this._displayProxy._ccComponent = this;
            this._displayProxy.setEventTarget(this._eventTarget);
            this._armature = this._displayProxy._armature;
            this._armature!.animation.timeScale = this.timeScale;
            // If change mode or armature, armature must insert into clock.
            // this._factory._dragonBones.clock.add(this._armature);
        }

        if (this._cacheMode !== AnimationCacheMode.REALTIME && this.debugBones) {
            warn('Debug bones is invalid in cached mode');
        }

        if (this._armature) {
            const armatureData = this._armature.armatureData;
            const aabb = armatureData.aabb;
            this.node._uiProps.uiTransformComp!.setContentSize(aabb.width, aabb.height);
        }
        this.attachUtil.init(this);

        if (this.animationName) {
            this.playAnimation(this.animationName, this.playTimes);
        }
        this._flushAssembler();
    }
    /**
     * @en Gets sockets binding on this component.
     * @zh 获取绑定在本组件上的socket。
     */
    public querySockets (): string[] {
        if (!this._armature) {
            return [];
        }
        if (this._cachedSockets.size === 0) {
            this._indexBoneSockets();
        }
        return Array.from(this._cachedSockets.keys()).sort();
    }

    /**
     * @en Query socket path with slot or bone name.
     * @zh 查询 Socket 路径。
     * @param name @en Slot name or Bone name. @zh 插槽或骨骼名称。
     */
    public querySocketPathByName (name: string): string[] {
        const ret: string[] = [];
        for (const key of this._cachedSockets.keys()) {
            if (key.endsWith(name)) {
                ret.push(key);
            }
        }
        return ret;
    }

    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _parseDragonAtlasAsset (): void {
        if (this.dragonAtlasAsset) {
            this.dragonAtlasAsset.init(this._factory!);
        }
    }
    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _refresh (): void {
        this._buildArmature();
        this._indexBoneSockets();
        if (EDITOR_NOT_IN_PREVIEW) {
            // update inspector
            this._updateArmatureEnum();
            this._updateAnimEnum();
            this._updateCacheModeEnum();
            // Editor.Utils.refreshSelectedInspector('node', this.node.uuid);
        }
        this.markForUpdateRenderData();
    }

    private _cacheModeEnum: any;
    // EDITOR
    _updateCacheModeEnum (): void {
        this._cacheModeEnum = Enum({});
        if (this._armature) {
            Object.assign(this._cacheModeEnum, AnimationCacheMode);
        } else {
            Object.assign(this._cacheModeEnum, DefaultCacheMode);
        }
        setPropertyEnumType(this, '_defaultCacheMode', this._cacheModeEnum);
    }

    // update animation list for editor
    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _updateAnimEnum (): void {
        let animEnum;
        if (this.dragonAsset) {
            animEnum = this.dragonAsset.getAnimsEnum(this.armatureName);
        } else {
            animEnum = DefaultAnimsEnum;
        }

        this._enumAnimations = Enum({});
        Object.assign(this._enumAnimations, animEnum || DefaultAnimsEnum);
        Enum.update(this._enumAnimations);
        // change enum
        setPropertyEnumType(this, '_animationIndex', this._enumAnimations);
    }

    // update armature list for editor
    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _updateArmatureEnum (): void {
        let armatureEnum;
        if (this.dragonAsset) {
            armatureEnum = this.dragonAsset.getArmatureEnum();
        } else {
            armatureEnum = DefaultArmaturesEnum;
        }

        this._enumArmatures = Enum({});
        Object.assign(this._enumArmatures, armatureEnum || DefaultArmaturesEnum);
        Enum.update(this._enumArmatures);
        // change enum
        setPropertyEnumType(this, '_defaultArmatureIndex', this._enumArmatures);
    }
    /**
     * @engineInternal Since v3.7.2 this is an engine private function.
     */
    _indexBoneSockets (): void {
        if (!this._armature) {
            return;
        }
        this._cachedSockets.clear();
        const nameToBone = this._cachedSockets;
        const cacheBoneName = (bi: BoneIndex, bones: Bone[], cache: Map<BoneIndex, string>): string => {
            if (cache.has(bi)) { return cache.get(bi)!; }
            const bone = bones[bi as unknown as number];
            if (!bone.parent) {
                cache.set(bi, bone.name);
                (bone as any).path = bone.name;
                return bone.name;
            }
            const name = `${cacheBoneName((bone.parent as any)._boneIndex, bones, cache)}/${bone.name}`;
            cache.set(bi, name);
            (bone as any).path = name;
            return name;
        };
        const walkArmature = (prefix: string, armature: Armature): void => {
            const bones = armature.getBones();
            const boneToName = new Map<BoneIndex, string>();
            for (let i = 0; i < bones.length; i++) {
                (bones[i] as any)._boneIndex = i;
            }
            for (let i = 0; i < bones.length; i++) {
                cacheBoneName(i as unknown as BoneIndex, bones, boneToName);
            }
            for (const bone of boneToName.keys()) {
                nameToBone.set(`${prefix}${boneToName.get(bone)!}`, bone);
            }
            const slots = armature.getSlots();
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].childArmature) {
                    walkArmature(slots[i].name, slots[i].childArmature!);
                }
            }
        };
        walkArmature('', this._armature);
    }

    /**
     * @en
     * Play the specified animation.
     * Parameter animName specify the animation name.
     * Parameter playTimes specify the repeat times of the animation.
     * -1 means use the value of the config file.
     * 0 means play the animation for ever.
     * >0 means repeat times.
     * @zh
     * 播放指定的动画.
     * animName 指定播放动画的名称。
     * playTimes 指定播放动画的次数。
     * -1 为使用配置文件中的次数。
     * 0 为无限循环播放。
     * >0 为动画的重复次数。
     */
    playAnimation (animName: string, playTimes?: number): AnimationState | null {
        this.playTimes = (playTimes === undefined) ? -1 : playTimes;
        this.animationName = animName;

        if (this.isAnimationCached()) {
            let cache = this._armatureCache!.getAnimationCache(this._armatureKey, animName);
            if (!cache) {
                cache = this._armatureCache!.initAnimationCache(this._armatureKey, animName);
            }
            if (cache) {
                this._accTime = 0;
                this._playCount = 0;
                this._frameCache = cache;
                if (this._sockets.length > 0) {
                    this._frameCache.enableCacheAttachedInfo();
                }
                this._frameCache.updateToFrame(0);
                this._playing = true;
                this._curFrame = this._frameCache.frames[0]!;
            }
        } else if (this._armature) {
            return this._armature.animation.play(animName, this.playTimes);
        }
        this.markForUpdateRenderData();
        return null;
    }

    /**
     * @en
     * Updating an animation cache to calculate all frame data in the animation is a cost in
     * performance due to calculating all data in a single frame.
     * To update the cache, use the invalidAnimationCache method with high performance.
     * @zh
     * 更新某个动画缓存, 预计算动画中所有帧数据，由于在单帧计算所有数据，所以较消耗性能。
     * 若想更新缓存，可使用 invalidAnimationCache 方法，具有较高性能。
     * @method updateAnimationCache
     * @param animName @en Animation's name. @zh 动画名称。
     */
    updateAnimationCache (animName: string): void {
        if (!this.isAnimationCached()) return;
        this._armatureCache!.updateAnimationCache(this._armatureKey, animName);
    }

    /**
     * @en
     * Invalidates the animation cache, which is then recomputed on each frame.
     * @zh
     * 使动画缓存失效，之后会在每帧重新计算。
     * @method invalidAnimationCache
     */
    invalidAnimationCache (): void {
        if (!this.isAnimationCached()) return;
        this._armatureCache!.invalidAnimationCache(this._armatureKey);
    }

    /**
     * @en
     * Get the all armature names in the DragonBones Data.
     * @zh
     * 获取 DragonBones 数据中所有的 armature 名称。
     * @method getArmatureNames
     * @returns @en Return an array of armature names. @zh 返回 armature 名称数组。
     */
    getArmatureNames (): string[] {
        const dragonBonesData = this._factory!.getDragonBonesData(this._armatureKey);
        return (dragonBonesData && dragonBonesData.armatureNames) || [];
    }

    /**
     * @en
     * Get the all animation names of specified armature.
     * @zh
     * 获取指定的 armature 的所有动画名称。
     * @method getAnimationNames
     * @param armatureName @en The name of armature. @zh Armature 名称。
     * @returns @en Return an array of all animation names.
     *          @zh 返回包含所有动画名称的数组。
     */
    getAnimationNames (armatureName: string): string[] {
        const ret: string[] = [];
        const dragonBonesData = this._factory!.getDragonBonesData(this._armatureKey);
        if (dragonBonesData) {
            const armatureData = dragonBonesData.getArmature(armatureName);
            if (armatureData) {
                for (const animName in armatureData.animations) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (armatureData.animations.hasOwnProperty(animName)) {
                        ret.push(animName);
                    }
                }
            }
        }
        return ret;
    }

    /**
     * @en
     * Add event listener for the DragonBones Event, the same to addEventListener.
     * @zh
     * 添加 DragonBones 事件监听器，与 addEventListener 作用相同。
     * @method on
     * @param eventType @en A string representing the event type to listen for.
     *                  @zh 用于表示监听事件类型的字符串。
     * @param listener  @en The callback that will be invoked when the event is dispatched.
     *                  @zh 事件派发时的回调。
     * @param target    @en The target (this object) to invoke the callback, can be null.
     *                  @zh 调用回调函数的对象，可以为 null。
     */
    on (eventType: string, listener, target): void {
        this.addEventListener(eventType, listener, target);
    }

    /**
     * @en
     * Remove the event listener for the DragonBones Event, the same to removeEventListener.
     * @zh
     * 移除 DragonBones 事件监听器，与 removeEventListener 作用相同。
     * @method off
     * @param eventType @en A string representing the event type to listen for.
     *                  @zh 用于表示监听事件类型的字符串。
     * @param listener  @en The callback that will be invoked when the event is dispatched.
     *                  @zh 事件派发时的回调。
     * @param target    @en The target (this object) to invoke the callback, can be null.
     *                  @zh 调用回调函数的对象，可以为 null。
     */
    off (eventType: string, listener, target): void {
        this.removeEventListener(eventType, listener, target);
    }

    /**
     * @en
     * Add DragonBones one-time event listener, the callback will remove itself after the first time it is triggered.
     * @zh
     * 添加 DragonBones 一次性事件监听器，回调会在第一时间被触发后删除自身。
     * @method once
     * @param eventType @en A string representing the event type to listen for.
     *                  @zh 用于表示监听事件类型的字符串。
     * @param listener  @en The callback that will be invoked when the event is dispatched.
     *                  @zh 事件派发时的回调。
     * @param target    @en The target (this object) to invoke the callback, can be null.
     *                  @zh 调用回调函数的对象，可以为 null。
     */
    once (eventType: string, listener, target): void {
        this._eventTarget.once(eventType, listener, target);
    }

    /**
     * @en
     * Add event listener for the DragonBones Event.
     * @zh
     * 添加 DragonBones 事件监听器。
     * @method addEventListener
     * @param eventType @en A string representing the event type to listen for.
     *                  @zh 用于表示监听事件类型的字符串。
     * @param listener  @en The callback that will be invoked when the event is dispatched.
     *                  @zh 事件派发时的回调。
     * @param target    @en The target (this object) to invoke the callback, can be null.
     *                  @zh 调用回调函数的对象，可以为 null。
     */
    addEventListener (eventType, listener, target): void {
        this._eventTarget.on(eventType, listener, target);
    }

    /**
     * @en Remove the event listener for the DragonBones Event.
     * @zh 移除 DragonBones 事件监听器。
     * @method removeEventListener
     * @param eventType @en A string representing the event type to listen for.
     *                  @zh 用于表示监听事件类型的字符串。
     * @param listener  @en The callback that will be invoked when the event is dispatched.
     *                  @zh 事件派发时的回调。
     * @param target    @en The target (this object) to invoke the callback, can be null.
     *                  @zh 调用回调函数的对象，可以为 null。
     */
    removeEventListener (eventType, listener, target): void {
        this._eventTarget.off(eventType, listener, target);
    }

    /**
     * @en Build the armature for specified name.
     * @zh 构建指定名称的 armature 对象。
     * @method buildArmature
     * @param armatureName @en The name of armature. @zh Armature 名称。
     * @param node @en The node contains ArmatureDisplay component.
     *             @zh 承载 ArmatureDisplay 组件的 node。
     * @returns @en Return a new ArmatureDisplay component.
     *          @zh 返回一个新创建的 ArmatureDisplay 组件。
     */
    buildArmature (armatureName: string, node?: Node): ArmatureDisplay {
        return this._factory!.createArmatureNode(this, armatureName, node);
    }

    /**
     * @en
     * Get the current armature object of the ArmatureDisplay.
     * @zh
     * 获取 ArmatureDisplay 当前使用的 Armature 对象。
     * @method armature
     * @returns @en Return the armature object. @zh 返回 armature 对象。
     */
    armature (): Armature | null {
        return this._armature;
    }

    protected _flushAssembler (): void {
        const assembler = ArmatureDisplay.Assembler.getAssembler(this);
        if (this._assembler !== assembler) {
            this._assembler = assembler;
        }
        if (this._armature && this._assembler) {
            this._renderData = this._assembler.createData(this);
            if (this._renderData) {
                this.maxVertexCount = this._renderData.vertexCount;
                this.maxIndexCount = this._renderData.indexCount;
            }
            this.markForUpdateRenderData();
            this._updateColor();
        }
    }

    protected _updateSocketBindings (): void {
        if (!this._armature) return;
        this._socketNodes.clear();
        for (let i = 0, l = this._sockets.length; i < l; i++) {
            const socket = this._sockets[i];
            if (socket.path && socket.target) {
                const bone = this._cachedSockets.get(socket.path);
                if (!bone) {
                    console.error(`Skeleton data does not contain path ${socket.path}`);
                    continue;
                }
                socket.boneIndex = bone as unknown as number;
                this._socketNodes.set(socket.path, socket.target);
            }
        }
    }

    private _verifySockets (sockets: DragonBoneSocket[]): void {
        for (let i = 0, l = sockets.length; i < l; i++) {
            const target = sockets[i].target;
            if (target) {
                if (!target.parent || (target.parent !== this.node)) {
                    console.error(`Target node ${target.name} is expected to be a direct child of ${this.node.name}`);
                    continue;
                }
            }
        }
    }

    private _cleanMaterialCache (): void {
        for (const val in this._materialCache) {
            this._materialCache[val].destroy();
        }
        this._materialCache = {};
    }

    protected createRenderEntity (): RenderEntity {
        const renderEntity = new RenderEntity(RenderEntityType.DYNAMIC);
        renderEntity.setUseLocal(false);
        return renderEntity;
    }
    /**
     * @en Sets flag for update render data.
     * @zh 标记组件渲染数据更新。
     */
    public markForUpdateRenderData (enable = true): void {
        super.markForUpdateRenderData(enable);
        if (this._debugDraw) {
            this._debugDraw.markForUpdateRenderData(enable);
        }
    }

    /**
     * @engineInternal since v3.7.2 this is an engine private function.
     */
    public syncAttachedNode (): void {
        // sync attached node matrix
        this.attachUtil._syncAttachedNode();
    }
}

cclegacy.internal.ArmatureDisplay = ArmatureDisplay;
