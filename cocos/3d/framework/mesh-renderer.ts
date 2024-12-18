/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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
import { JSB } from 'internal:constants';
import { displayOrder, group, range } from 'cc.decorator';
import { Texture2D, TextureCube } from '../../asset/assets';
import { Material } from '../../asset/assets/material';
import { Mesh } from '../assets/mesh';
import { Vec4, Enum, cclegacy, CCBoolean, CCFloat, assertIsTrue, _decorator, CCInteger, EventTarget, warnID } from '../../core';
import { scene } from '../../render-scene';
import { MorphModel } from '../models/morph-model';
import { Root } from '../../root';
import { MobilityMode, TransformBit } from '../../scene-graph/node-enum';
import { ModelRenderer } from '../../misc/model-renderer';
import { MorphRenderingInstance } from '../assets/morph-rendering';
import { NodeEventType } from '../../scene-graph/node-event';
import { Texture } from '../../gfx';
import { builtinResMgr } from '../../asset/asset-manager/builtin-res-mgr';
import { settings, SettingsCategory } from '../../core/settings';
import { ReflectionProbeType } from '../reflection-probe/reflection-probe-enum';
import { getPhaseID } from '../../rendering/pass-phase';
import { SubModel } from '../../render-scene/scene';
import { isEnableEffect } from '../../rendering/define';
import type { Model } from '../../render-scene/scene';
import type { ReflectionProbeManager } from '../reflection-probe';

const { ccclass, help, executeInEditMode, executionOrder, menu, visible, type,
    formerlySerializedAs, serializable, editable, disallowAnimation } = _decorator;

let _phaseID = getPhaseID('specular-pass');
function getSkinPassIndex (subModel: SubModel): number {
    const passes = subModel.passes;
    const r = cclegacy.rendering;
    if (isEnableEffect()) _phaseID = r.getPhaseID(r.getPassID('specular-pass'), 'default');
    for (let k = 0; k < passes.length; k++) {
        if (((!r || !r.enableEffectImport) && passes[k].phase === _phaseID)
            || (isEnableEffect() && passes[k].phaseID === _phaseID)) {
            return k;
        }
    }
    return -1;
}

/**
 * @en Shadow projection mode.
 * @zh 阴影投射方式。
 */
const ModelShadowCastingMode = Enum({
    /**
     * @en Disable shadow projection.
     * @zh 不投射阴影。
     */
    OFF: 0,
    /**
     * @en Enable shadow projection.
     * @zh 开启阴影投射。
     */
    ON: 1,
});

/**
 * @en Shadow receive mode.
 * @zh 阴影接收方式。
 */
const ModelShadowReceivingMode = Enum({
    /**
     * @en Disable shadow receiving.
     * @zh 不接收阴影。
     */
    OFF: 0,
    /**
     * @en Enable shadow receiving.
     * @zh 开启阴影投射。
     */
    ON: 1,
});

enum ModelBakeSettingsEvent {
    /**
     * @en The event which will be triggered when the useLightProbe is changed.
     * @zh useLightProbe属性修改时触发的事件
     */
    USE_LIGHT_PROBE_CHANGED = 'use_light_probe_changed',

    /**
     * @en The event which will be triggered when the reflectionProbe is changed.
     * @zh reflectionProbe 属性修改时触发的事件
     */
    REFLECTION_PROBE_CHANGED = 'reflection_probe_changed',

    /**
     * @en The event which will be triggered when the bakeToReflectionProbe is changed.
     * @zh bakeToReflectionProbe 属性修改时触发的事件
     */
    BAKE_TO_REFLECTION_PROBE_CHANGED = 'bake_to_reflection_probe_changed',
}

/**
 * @en Model's bake settings.
 * @zh 模型烘焙设置
 */
@ccclass('cc.ModelBakeSettings')
class ModelBakeSettings extends EventTarget {
    /**
     * @en The event which will be triggered when the useLightProbe is changed.
     * @zh useLightProbe属性修改时触发的事件
     */
    public static readonly USE_LIGHT_PROBE_CHANGED = ModelBakeSettingsEvent.USE_LIGHT_PROBE_CHANGED;

    /**
     * @en The event which will be triggered when the reflectionProbe is changed.
     * @zh reflectionProbe 属性修改时触发的事件
     */
    public static readonly REFLECTION_PROBE_CHANGED = ModelBakeSettingsEvent.REFLECTION_PROBE_CHANGED;

    /**
     * @en The event which will be triggered when the bakeToReflectionProbe is changed.
     * @zh bakeToReflectionProbe 属性修改时触发的事件
     */
    public static readonly BAKE_TO_REFLECTION_PROBE_CHANGED = ModelBakeSettingsEvent.BAKE_TO_REFLECTION_PROBE_CHANGED;

    @serializable
    public texture: Texture2D|null = null;
    @serializable
    public uvParam: Vec4 = new Vec4();
    @serializable
    protected _bakeable = false;
    @serializable
    protected _castShadow = false;
    @formerlySerializedAs('_recieveShadow')
    protected _receiveShadow = false;
    @serializable
    protected _lightmapSize = 64;

    @serializable
    protected _useLightProbe = false;
    @serializable
    protected _bakeToLightProbe = true;

    @serializable
    protected _reflectionProbeType = ReflectionProbeType.NONE;
    @serializable
    protected _bakeToReflectionProbe = true;

    public probeCubemap: TextureCube | null = null;
    public probeBlendCubemap: TextureCube | null = null;
    public probePlanarmap: Texture | null = null;

    constructor () {
        super();
    }

    /**
     * @en Whether the model is static and bake-able with light map.
     * Notice: the model's vertex data must have the second UV attribute to enable light map baking.
     * @zh 模型是否是静态的并可以烘培光照贴图。
     * 注意：模型顶点数据必须包含第二套 UV 属性来支持光照贴图烘焙。
     */
    @group({ id: 'LightMap', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightMap.displayName', displayOrder: 0, style: 'section' })
    @editable
    get bakeable (): boolean {
        return this._bakeable;
    }

    set bakeable (val) {
        this._bakeable = val;
    }

    /**
     * @en Whether to cast shadow in light map baking.
     * @zh 在光照贴图烘焙中是否投射阴影。
     */
    @group({ id: 'LightMap', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightMap.displayName' })
    @editable
    get castShadow (): boolean {
        return this._castShadow;
    }

    set castShadow (val) {
        this._castShadow = val;
    }

    /**
     * @en Whether to receive shadow in light map baking.
     * @zh 在光照贴图烘焙中是否接受阴影。
     */
    @group({ id: 'LightMap', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightMap.displayName' })
    @editable
    get receiveShadow (): boolean {
        return this._receiveShadow;
    }

    set receiveShadow (val) {
        this._receiveShadow = val;
    }

    /**
     * @en The lightmap size.
     * @zh 光照图大小。
     */
    @group({ id: 'LightMap', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightMap.displayName' })
    @editable
    @type(CCInteger)
    @range([0, 1024])
    get lightmapSize (): number {
        return this._lightmapSize;
    }

    set lightmapSize (val) {
        this._lightmapSize = val;
    }

    /**
     * @en Whether to use light probe which provides indirect light to dynamic objects.
     * @zh 模型是否使用光照探针，光照探针为动态物体提供间接光。
     */
    @group({ id: 'LightProbe', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightProbe.displayName', displayOrder: 1, style: 'section' })
    @editable
    @type(CCBoolean)
    get useLightProbe (): boolean {
        return this._useLightProbe;
    }

    set useLightProbe (val) {
        this._useLightProbe = val;
        this.emit(ModelBakeSettingsEvent.USE_LIGHT_PROBE_CHANGED);
    }

    /**
     * @en Whether the model is used to calculate light probe
     * @zh 模型是否用于计算光照探针
     */
    @group({ id: 'LightProbe', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.LightProbe.displayName' })
    @editable
    @type(CCBoolean)
    get bakeToLightProbe (): boolean {
        return this._bakeToLightProbe;
    }

    set bakeToLightProbe (val) {
        this._bakeToLightProbe = val;
    }

    /**
     * @en Used to set whether to use the reflection probe or set probe's type.
     * @zh 用于设置是否使用反射探针或者设置反射探针的类型。
     */
    @group({
        id: 'ReflectionProbe',
        name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.ReflectionProbe.displayName',
        displayOrder: 2,
        style: 'section',
    })
    @type(Enum(ReflectionProbeType))
    get reflectionProbe (): ReflectionProbeType {
        return this._reflectionProbeType;
    }

    set reflectionProbe (val) {
        this._reflectionProbeType = val;
        this.emit(ModelBakeSettingsEvent.REFLECTION_PROBE_CHANGED);
    }

    /**
     * @en Whether the model can be render by the reflection probe
     * @zh 模型是否能被反射探针渲染
     */
    @group({ id: 'ReflectionProbe', name: 'i18n:ENGINE.classes.cc.ModelBakeSettings.groups.ReflectionProbe.displayName' })
    @type(CCBoolean)
    get bakeToReflectionProbe (): boolean {
        return this._bakeToReflectionProbe;
    }

    set bakeToReflectionProbe (val) {
        this._bakeToReflectionProbe = val;
        this.emit(ModelBakeSettingsEvent.BAKE_TO_REFLECTION_PROBE_CHANGED);
    }
}

/**
 * @en Mesh renderer component for general 3d model rendering, it generates and link to a Model in the render scene.
 * It supports real time lighting and shadow, baked light map, and morph rendering.
 * @zh 用于通用模型渲染的网格渲染器组件，会创建并关联一个渲染场景中的模型对象。
 * 该组件支持实时光照和阴影，预烘焙光照贴图和形变网格渲染。
 */
@ccclass('cc.MeshRenderer')
@help('i18n:cc.MeshRenderer')
@executionOrder(100)
@menu('Mesh/MeshRenderer')
@executeInEditMode
export class MeshRenderer extends ModelRenderer {
    /**
     * @en Shadow projection mode enumeration.
     * @zh 阴影投射方式枚举。
     */
    public static ShadowCastingMode = ModelShadowCastingMode;
    /**
     * @en Shadow receive mode enumeration.
     * @zh 阴影接收方式枚举。
     */
    public static ShadowReceivingMode = ModelShadowReceivingMode;

    /**
     * @en The settings for GI baking, it was called lightmapSettings before
     * @zh 全局光照烘焙的配置，以前名称为lightmapSettings
     */
    @serializable
    @editable
    @disallowAnimation
    @displayOrder(3)
    public bakeSettings = new ModelBakeSettings();

    @serializable
    protected _mesh: Mesh | null = null;

    @serializable
    protected _shadowCastingMode = ModelShadowCastingMode.OFF;

    @serializable
    protected _shadowReceivingMode = ModelShadowReceivingMode.ON;

    @serializable
    protected _shadowBias = 0;

    @serializable
    protected _shadowNormalBias = 0;

    @serializable
    protected _reflectionProbeId = -1;

    @serializable
    protected _reflectionProbeBlendId = -1;

    @serializable
    protected _reflectionProbeBlendWeight = 0;

    @serializable
    protected _enabledGlobalStandardSkinObject = false;

    protected _reflectionProbeDataMap: Texture2D | null = null;

    // @serializable
    private _subMeshShapesWeights: number[][] = [];

    /**
     * @en Local shadow bias for real time lighting.
     * @zh 实时光照下模型局部的阴影偏移。
     */
    @type(CCFloat)
    @group({
        id: 'DynamicShadow',
        name: 'i18n:ENGINE.classes.cc.MeshRenderer.groups.DynamicShadow.displayName',
        displayOrder: 2,
        style: 'section',
    })
    @disallowAnimation
    get shadowBias (): number {
        return this._shadowBias;
    }

    set shadowBias (val) {
        this._shadowBias = val;
        this._updateShadowBias();
        this._onUpdateLocalShadowBiasAndProbeId();
    }

    /**
   * @en local shadow normal bias for real time lighting.
   * @zh 实时光照下模型局部的阴影法线偏移。
   */
    @type(CCFloat)
    @group({ id: 'DynamicShadow', name: 'i18n:ENGINE.classes.cc.MeshRenderer.groups.DynamicShadow.displayName' })
    @disallowAnimation
    get shadowNormalBias (): number {
        return this._shadowNormalBias;
    }

    set shadowNormalBias (val) {
        this._shadowNormalBias = val;
        this._updateShadowNormalBias();
        this._onUpdateLocalShadowBiasAndProbeId();
    }

    /**
     * @en Shadow projection mode.
     * @zh 实时光照下阴影投射方式。
     */
    @type(ModelShadowCastingMode)
    @group({ id: 'DynamicShadow', name: 'i18n:ENGINE.classes.cc.MeshRenderer.groups.DynamicShadow.displayName' })
    @disallowAnimation
    @visible(false)
    get shadowCastingMode (): number {
        return this._shadowCastingMode;
    }

    set shadowCastingMode (val) {
        this._shadowCastingMode = val;
        this._updateCastShadow();
    }

    @group({ id: 'DynamicShadow', name: 'i18n:ENGINE.classes.cc.MeshRenderer.groups.DynamicShadow.displayName' })
    @disallowAnimation
    get shadowCastingModeForInspector (): boolean {
        return this.shadowCastingMode === ModelShadowCastingMode.ON;
    }
    set shadowCastingModeForInspector (val) {
        this.shadowCastingMode = val === true ? ModelShadowCastingMode.ON : ModelShadowCastingMode.OFF;
    }

    /**
     * @en Is received direction Light.
     * @zh 是否接收平行光光照。
     * @param visibility @en direction light visibility. @zh 方向光的可见性。
     */
    public onUpdateReceiveDirLight (visibility: number, forceClose = false): void {
        if (!this._model) { return; }
        if (forceClose) {
            this._model.receiveDirLight = false;
            return;
        }
        if (this.node && ((visibility & this.node.layer) === this.node.layer)
        || (visibility & this._model.visFlags)) {
            this._model.receiveDirLight = true;
        } else {
            this._model.receiveDirLight = false;
        }
    }

    /**
     * @en receive shadow.
     * @zh 实时光照下是否接受阴影。
     */
    @type(ModelShadowReceivingMode)
    @visible(false)
    get receiveShadow (): number {
        return this._shadowReceivingMode;
    }
    set receiveShadow (val) {
        this._shadowReceivingMode = val;
        this._updateReceiveShadow();
    }

    @group({ id: 'DynamicShadow', name: 'i18n:ENGINE.classes.cc.MeshRenderer.groups.DynamicShadow.displayName' })
    @disallowAnimation
    get receiveShadowForInspector (): boolean {
        return this._shadowReceivingMode === ModelShadowReceivingMode.ON;
    }
    set receiveShadowForInspector (val: boolean) {
        this._shadowReceivingMode = val === true ? ModelShadowReceivingMode.ON : ModelShadowReceivingMode.OFF;
        this._updateReceiveShadow();
    }

    /**
     * @en Gets or sets the mesh of the model.
     * Note, when set, all morph targets' weights would be reset to zero.
     * @zh 获取或设置模型的网格数据。
     * 注意，设置时，所有形变目标的权重都将归零。
     */
    @type(Mesh)
    @displayOrder(1)
    get mesh (): Mesh | null {
        return this._mesh;
    }

    set mesh (val) {
        const old = this._mesh;
        const mesh = this._mesh = val;
        mesh?.initialize();
        this._initSubMeshShapesWeights();
        this._watchMorphInMesh();
        this._onMeshChanged(old);
        this._updateModels();
        if (this.enabledInHierarchy) {
            this._attachToScene();
        }
        this._updateCastShadow();
        this._updateReceiveShadow();
        this._updateUseLightProbe();
        this._updateUseReflectionProbe();
        this._updateReceiveDirLight();
    }

    /**
     * @en Gets the model in [[RenderScene]].
     * @zh 获取渲染场景 [[RenderScene]] 中对应的模型。
     */
    get model (): Model | null {
        return this._model;
    }

    /**
     * @en Whether to enable morph rendering.
     * @zh 是否启用形变网格渲染。
     */
    // eslint-disable-next-line func-names
    @visible(function (this: MeshRenderer) {
        return !!(
            this.mesh
            && this.mesh.struct.morph
            && this.mesh.struct.morph.subMeshMorphs.some((subMeshMorph) => !!subMeshMorph)
        );
    })
    @disallowAnimation
    get enableMorph (): boolean {
        return this._enableMorph;
    }

    set enableMorph (value) {
        this._enableMorph = value;
    }

    /**
     * @en Set the Separable-SSS skin standard model component.
     * @zh 设置是否是全局的4s标准模型组件
     */
    @type(CCBoolean)
    @disallowAnimation
    get isGlobalStandardSkinObject (): boolean {
        return this._enabledGlobalStandardSkinObject;
    }

    set isGlobalStandardSkinObject (val) {
        (cclegacy.director.root as Root).pipeline.pipelineSceneData.standardSkinMeshRenderer = val ? this : null;
        this._enabledGlobalStandardSkinObject = val;
    }

    /**
     * @engineInternal
     */
    public clearGlobalStandardSkinObjectFlag (): void {
        this._enabledGlobalStandardSkinObject = false;
    }

    protected _modelType: typeof scene.Model = scene.Model;

    protected _model: scene.Model | null = null;

    private _morphInstance: MorphRenderingInstance | null = null;

    @serializable
    private _enableMorph = true;

    constructor () {
        super();

        const highQualityMode = settings.querySettings(SettingsCategory.RENDERING, 'highQualityMode');
        if (highQualityMode) {
            this._shadowCastingMode = ModelShadowCastingMode.ON;
            this.bakeSettings.castShadow = true;
            this.bakeSettings.receiveShadow = true;
        }
    }

    public onLoad (): void {
        if (this._mesh) { this._mesh.initialize(); }
        if (!this._validateShapeWeights()) {
            this._initSubMeshShapesWeights();
        }
        this._watchMorphInMesh();
        this._updateModels();
        this._updateCastShadow();
        this._updateReceiveShadow();
        this._updateShadowBias();
        this._updateShadowNormalBias();
        this._updateUseLightProbe();
        this._updateBakeToReflectionProbe();
        this._updateUseReflectionProbe();
        this._updateReceiveDirLight();
        this._updateStandardSkin();
    }

    // Redo, Undo, Prefab restore, etc.
    public onRestore (): void {
        this._updateModels();
        if (this.enabledInHierarchy) {
            this._attachToScene();
        }
        this._updateCastShadow();
        this._updateReceiveShadow();
        this._updateShadowBias();
        this._updateShadowNormalBias();
        this._updateUseLightProbe();
        this._updateBakeToReflectionProbe();
        this._updateUseReflectionProbe();
        this._updateReceiveDirLight();
        this._updateStandardSkin();
    }

    public onEnable (): void {
        super.onEnable();
        this.node.on(NodeEventType.MOBILITY_CHANGED, this.onMobilityChanged, this);
        this.node.on(NodeEventType.LIGHT_PROBE_BAKING_CHANGED, this.onLightProbeBakingChanged, this);
        this.bakeSettings.on(ModelBakeSettingsEvent.USE_LIGHT_PROBE_CHANGED, this.onUseLightProbeChanged, this);
        this.bakeSettings.on(ModelBakeSettingsEvent.REFLECTION_PROBE_CHANGED, this.onReflectionProbeChanged, this);
        this.bakeSettings.on(ModelBakeSettingsEvent.BAKE_TO_REFLECTION_PROBE_CHANGED, this.onBakeToReflectionProbeChanged, this);

        if (!this._model) {
            this._updateModels();
        }
        this._model!.onGlobalPipelineStateChanged();
        this._updateCastShadow();
        this._updateReceiveShadow();
        this._updateShadowBias();
        this._updateShadowNormalBias();
        this._updateBakeToReflectionProbe();
        this._updateUseReflectionProbe();
        this._onUpdateLocalShadowBiasAndProbeId();
        this._updateUseLightProbe();
        this._updateReceiveDirLight();
        this._onUpdateReflectionProbeDataMap();
        this._onUpdateLocalReflectionProbeData();
        this._updateStandardSkin();
        this._attachToScene();
    }

    public onDisable (): void {
        if (this._model) {
            this._detachFromScene();
        }
        this.node.off(NodeEventType.MOBILITY_CHANGED, this.onMobilityChanged, this);
        this.node.off(NodeEventType.LIGHT_PROBE_BAKING_CHANGED, this.onLightProbeBakingChanged, this);
        this.bakeSettings.off(ModelBakeSettingsEvent.USE_LIGHT_PROBE_CHANGED, this.onUseLightProbeChanged, this);
        this.bakeSettings.off(ModelBakeSettingsEvent.REFLECTION_PROBE_CHANGED, this.onReflectionProbeChanged, this);
        this.bakeSettings.off(ModelBakeSettingsEvent.BAKE_TO_REFLECTION_PROBE_CHANGED, this.onBakeToReflectionProbeChanged, this);
    }

    public onDestroy (): void {
        if (this._model) {
            (cclegacy.director.root as Root).destroyModel(this._model);
            this._model = null;
            this._models.length = 0;
        }
        if (this._morphInstance) {
            this._morphInstance.destroy();
        }
    }

    public onGeometryChanged (): void {
        if (this._model && this._mesh) {
            const meshStruct = this._mesh.struct;
            this._model.createBoundingShape(meshStruct.minPosition, meshStruct.maxPosition);
            this._model.updateWorldBound();
            this._model.onGeometryChanged();
        }
    }

    /**
     * @zh 获取子网格指定形变目标的权重。
     * @en Gets the weight at specified morph target of the specified sub mesh.
     * @param subMeshIndex Index to the sub mesh.
     * @param shapeIndex Index to the morph target of the sub mesh.
     * @returns The weight.
     */
    public getWeight (subMeshIndex: number, shapeIndex: number): number {
        const { _subMeshShapesWeights: subMeshShapesWeights } = this;
        assertIsTrue(subMeshIndex < subMeshShapesWeights.length);
        const shapeWeights = this._subMeshShapesWeights[subMeshIndex];
        assertIsTrue(shapeIndex < shapeWeights.length);
        return shapeWeights[shapeIndex];
    }

    /**
     * @zh
     * 设置子网格所有形变目标的权重。
     * `subMeshIndex` 是无效索引或 `weights` 的长度不匹配子网格的形变目标数量时，此方法不会生效。
     * @en
     * Sets weights of each morph target of the specified sub mesh.
     * If takes no effect if `subMeshIndex` is out of bounds or if `weights` has a different length with morph targets count of the sub mesh.
     * @param weights The weights.
     * @param subMeshIndex Index to the sub mesh.
     */
    public setWeights (weights: number[], subMeshIndex: number): void {
        const { _subMeshShapesWeights: subMeshShapesWeights } = this;
        if (subMeshIndex >= subMeshShapesWeights.length) {
            return;
        }
        const shapeWeights = subMeshShapesWeights[subMeshIndex];
        if (shapeWeights.length !== weights.length) {
            return;
        }
        subMeshShapesWeights[subMeshIndex] = weights.slice(0);
        this._uploadSubMeshShapesWeights(subMeshIndex);
    }

    /**
     * @zh
     * 设置子网格指定外形的权重。
     * `subMeshIndex` 或 `shapeIndex` 是无效索引时，此方法不会生效。
     * @en
     * Sets the weight at specified shape of specified sub mesh.
     * If takes no effect if
     * `subMeshIndex` or `shapeIndex` out of bounds.
     * @param weight The weight.
     * @param subMeshIndex Index to the sub mesh.
     * @param shapeIndex Index to the shape of the sub mesh.
     */
    public setWeight (weight: number, subMeshIndex: number, shapeIndex: number): void {
        const { _subMeshShapesWeights: subMeshShapesWeights } = this;
        if (subMeshIndex >= subMeshShapesWeights.length) {
            return;
        }
        const shapeWeights = subMeshShapesWeights[subMeshIndex];
        if (shapeIndex >= shapeWeights.length) {
            return;
        }
        shapeWeights[shapeIndex] = weight;
        this._uploadSubMeshShapesWeights(subMeshIndex);
    }

    public setInstancedAttribute (name: string, value: ArrayLike<number>): void {
        if (!this.model) {
            return;
        }

        if (JSB) {
            (this.model as any)._setInstancedAttribute(name, value);
        } else {
            const subModels = this.model.subModels;
            for (let i = 0; i < subModels.length; i++) {
                const subModel = subModels[i];
                const { attributes, views } = subModel.instancedAttributeBlock;
                for (let i = 0; i < attributes.length; i++) {
                    if (attributes[i].name === name) {
                        views[i].set(value);
                        break;
                    }
                }
            }
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _updateLightmap (lightmap: Texture2D|null, uOff: number, vOff: number, scale: number, lum: number): void {
        this.bakeSettings.texture = lightmap;
        this.bakeSettings.uvParam.x = uOff;
        this.bakeSettings.uvParam.y = vOff;
        this.bakeSettings.uvParam.z = scale;
        this.bakeSettings.uvParam.w = lum;

        this._onUpdateLightingmap();
        this._updateReceiveDirLight();
    }

    /**
     * @zh
     * 更新反射探针烘焙的cubemap。
     * @en
     * Updat cubemap baked with reflection probes.
     * @param cubeMap baked cubemap.
     * @param useDefaultTexture if the reflection probe has not been baked, is the skybox used instead.
     */
    public updateProbeCubemap (cubeMap: TextureCube | null): void {
        if (this.bakeSettings.probeCubemap && this.bakeSettings.probeCubemap === cubeMap) {
            return;
        }
        this.bakeSettings.probeCubemap = cubeMap;
        if (this.model !== null) {
            this.model.updateReflectionProbeCubemap(this.bakeSettings.probeCubemap);
        }
    }

    /**
     * @zh
     * 更新用于混合的反射探针烘焙的cubemap。
     * @en
     * Updat cubemap baked with reflection probes for blending.
     * @param cubeMap baked cubemap.
     */
    public updateProbeBlendCubemap (cubeMap: TextureCube | null): void {
        if (this.bakeSettings.probeBlendCubemap && this.bakeSettings.probeBlendCubemap === cubeMap) {
            return;
        }
        this.bakeSettings.probeBlendCubemap = cubeMap;
        if (this.model !== null) {
            this.model.updateReflectionProbeBlendCubemap(this.bakeSettings.probeBlendCubemap);
        }
    }

    /**
     * @zh
     * 更新平面反射渲染纹理。
     * @en
     * Update the reflection rendering texture.
     * @param planarMap render texture.
     */
    public updateProbePlanarMap (planarMap: Texture | null): void {
        if (this.bakeSettings.probePlanarmap === planarMap) {
            return;
        }
        this.bakeSettings.probePlanarmap = planarMap;
        if (this.model !== null) {
            this.model.updateReflectionProbePlanarMap(this.bakeSettings.probePlanarmap);
        }
    }

    /**
     * @zh
     * 更新反射探针的数据贴图。
     * @en
     * Update the data mapping of the reflection probe.
     * @param dataMap data mapping with data saved all reflection probe data.
     */
    public updateReflectionProbeDataMap (dataMap: Texture2D | null): void {
        this._reflectionProbeDataMap = dataMap;
        if (this.model !== null) {
            this.model.updateReflectionProbeDataMap(dataMap);
        }
    }

    /**
     * @zh
     * 更新反射探针的id。
     * @en
     * Update the id of the reflection probe.
     * @param probeId probe id.
     */
    public updateReflectionProbeId (probeId: number): void {
        this._reflectionProbeId = probeId;
        if (this.model) {
            this.model.reflectionProbeId = probeId;
        }
        this._onUpdateLocalShadowBiasAndProbeId();
    }

    /**
     * @zh
     * 更新用于混合的反射探针的id。
     * @en
     * Update the id of the reflection probe used for blending.
     * @param blendProbeId probe id of blend.
     */
    public updateReflectionProbeBlendId (blendProbeId: number): void {
        this._reflectionProbeBlendId = blendProbeId;
        if (this.model) {
            this.model.reflectionProbeBlendId = blendProbeId;
        }
        this._onUpdateLocalShadowBiasAndProbeId();
    }

    /**
     * @zh
     * 更新混合权重。
     * @en
     * Update blending weight.
     * @param weight blending weight.
     */
    public updateReflectionProbeBlendWeight (weight: number): void {
        this._reflectionProbeBlendWeight = weight;
        if (this.model) {
            this.model.reflectionProbeBlendWeight = weight;
        }
        this._onUpdateLocalReflectionProbeData();
    }

    protected _updateReflectionProbeTexture (): void {
        if (!this.model) return;

        const bakeSettings = this.bakeSettings;

        const reflectionProbe = bakeSettings.reflectionProbe;
        const probeBlendCubemap = bakeSettings.probeBlendCubemap;
        const probePlanarMap = bakeSettings.probePlanarmap;
        const probeCubeMap = bakeSettings.probeCubemap;

        if (reflectionProbe === ReflectionProbeType.BAKED_CUBEMAP) {
            this.model.updateReflectionProbeCubemap(probeCubeMap);
            this.model.updateReflectionProbePlanarMap(null);
            this.model.updateReflectionProbeBlendCubemap(null);
        } else if (reflectionProbe === ReflectionProbeType.BLEND_PROBES
            || reflectionProbe === ReflectionProbeType.BLEND_PROBES_AND_SKYBOX) {
            this.model.updateReflectionProbeCubemap(probeCubeMap);
            this.model.updateReflectionProbeBlendCubemap(probeBlendCubemap);
            this.model.updateReflectionProbePlanarMap(null);
        } else if (reflectionProbe === ReflectionProbeType.PLANAR_REFLECTION) {
            this.model.updateReflectionProbePlanarMap(probePlanarMap);
            this.model.updateReflectionProbeCubemap(null);
            this.model.updateReflectionProbeBlendCubemap(null);
        } else {
            this.model.updateReflectionProbeCubemap(null);
            this.model.updateReflectionProbePlanarMap(null);
            this.model.updateReflectionProbeBlendCubemap(null);
        }
    }

    protected _updateModels (): void {
        if (!this.enabledInHierarchy) {
            return;
        }

        const model = this._model;
        if (model) {
            model.destroy();
            model.initialize();
            model.node = model.transform = this.node;
        } else {
            this._createModel();
        }

        if (this._model) {
            if (this._mesh) {
                const meshStruct = this._mesh.struct;
                this._model.createBoundingShape(meshStruct.minPosition, meshStruct.maxPosition);
                this._model.updateWorldBound();
            }
            // Initialize lighting map before model initializing
            // because the lighting map will influence the model's shader
            this._model.initLightingmap(this.bakeSettings.texture, this.bakeSettings.uvParam);
            this._updateUseLightProbe();
            this._updateUseReflectionProbeType();
            this._updateModelParams();
            this._onUpdateLightingmap();
            this._onUpdateLocalShadowBiasAndProbeId();
            this._updateUseReflectionProbe();
            this._updateReceiveDirLight();
            this._onUpdateReflectionProbeDataMap();
            this._onUpdateLocalReflectionProbeData();
        }
    }

    protected _updateReceiveDirLight (): void {
        if (!this._model) { return; }
        const scene = this.node.scene;
        if (!scene || !scene.renderScene) { return; }
        const mainLight = scene.renderScene.mainLight;
        if (!mainLight) { return; }
        const visibility = mainLight.visibility;
        if (!mainLight.node) { return; }

        if (mainLight.node.mobility === MobilityMode.Static) {
            let forceClose = false;
            if (this.bakeSettings.texture && !this.node.scene.globals.disableLightmap) {
                forceClose = true;
            }
            if (this.node.scene.globals.lightProbeInfo.data
                && this.node.scene.globals.lightProbeInfo.data.hasCoefficients()
                && this._model.useLightProbe) {
                forceClose = true;
            }

            this.onUpdateReceiveDirLight(visibility, forceClose);
        } else {
            this.onUpdateReceiveDirLight(visibility);
        }
    }

    protected _createModel (): void {
        const preferMorphOverPlain = !!this._morphInstance;
        // Note we only change to use `MorphModel` if
        // we are required to render morph and the `this._modelType` is exactly the basic `Model`.
        // We do this since the `this._modelType` might be changed in classes derived from `Model`.
        // We shall not overwrite it.
        // Please notice that we do not enforce that
        // derived classes should use a morph-able model type(i.e. model type derived from `MorphModel`).
        // So we should take care of the edge case.
        const modelType = (preferMorphOverPlain && this._modelType === scene.Model) ? MorphModel : this._modelType;
        const model = this._model = (cclegacy.director.root as Root).createModel(modelType);
        model.visFlags = this.visibility;
        model.node = model.transform = this.node;
        this._models.length = 0;
        this._models.push(model);
        if (this._morphInstance && model instanceof MorphModel) {
            model.setMorphRendering(this._morphInstance);
        }
    }

    protected _attachToScene (): void {
        if (!this.node.scene || !this._model) {
            return;
        }
        const renderScene = this._getRenderScene();
        if (this._model.scene !== null) {
            this._detachFromScene();
        }
        renderScene.addModel(this._model);
    }

    /**
     * @engineInternal
     */
    public _detachFromScene (): void {
        if (this._model && this._model.scene) {
            this._model.scene.removeModel(this._model);
        }
    }

    protected _updateModelParams (): void {
        if (!this._mesh || !this._model) { return; }
        this.node.hasChangedFlags |= TransformBit.POSITION;
        this._model.transform.hasChangedFlags |= TransformBit.POSITION;
        this._model.isDynamicBatching = this._isBatchingEnabled();
        const meshCount = this._mesh ? this._mesh.renderingSubMeshes.length : 0;
        const renderingMesh = this._mesh.renderingSubMeshes;
        if (renderingMesh) {
            for (let i = 0; i < meshCount; ++i) {
                let material = this.getRenderMaterial(i);
                if (material && !material.isValid) {
                    material = null;
                }
                const subMeshData = renderingMesh[i];
                if (subMeshData) {
                    this._model.initSubModel(i, subMeshData, material || this._getBuiltinMaterial());
                }
            }
        }
        this._model.enabled = true;
    }

    protected _onUpdateLightingmap (): void {
        if (this.model !== null) {
            this.model.updateLightingmap(this.bakeSettings.texture, this.bakeSettings.uvParam);
        }

        this.setInstancedAttribute('a_lightingMapUVParam', [
            this.bakeSettings.uvParam.x,
            this.bakeSettings.uvParam.y,
            this.bakeSettings.uvParam.z,
            this.bakeSettings.uvParam.w,
        ]);
    }

    protected _onUpdateLocalShadowBiasAndProbeId (): void {
        if (this.model !== null) {
            this.model.updateLocalShadowBias();
            this.model.updateReflectionProbeId();
        }

        this.setInstancedAttribute('a_localShadowBiasAndProbeId', [
            this._shadowBias,
            this._shadowNormalBias,
            this._reflectionProbeId,
            this._reflectionProbeBlendId,
        ]);
    }

    protected _onUpdateLocalReflectionProbeData (): void {
        if (this.bakeSettings.reflectionProbe === ReflectionProbeType.BAKED_CUBEMAP
            || this.bakeSettings.reflectionProbe === ReflectionProbeType.BLEND_PROBES
            || this.bakeSettings.reflectionProbe === ReflectionProbeType.BLEND_PROBES_AND_SKYBOX) {
            if (this.model !== null) {
                this.model.updateReflectionProbeId();
            }

            this.setInstancedAttribute('a_reflectionProbeData', [
                this._reflectionProbeBlendWeight,
                0.0,
                0.0,
                0.0,
            ]);
        }
    }

    protected _onUpdateReflectionProbeDataMap (): void {
        if (this.model !== null) {
            this.model.updateReflectionProbeDataMap(this._reflectionProbeDataMap);
        }
    }

    protected _onMaterialModified (idx: number, material: Material | null): void {
        if (!this._model || !this._model.inited) { return; }
        this._onRebuildPSO(idx, material || this._getBuiltinMaterial());
        this._updateStandardSkin();
    }

    /**
     * @engineInternal
     */
    public _onRebuildPSO (idx: number, material: Material): void {
        if (!this._model || !this._model.inited) { return; }
        this._model.isDynamicBatching = this._isBatchingEnabled();
        this._model.setSubModelMaterial(idx, material);
        this._onUpdateLightingmap();
        this._onUpdateLocalShadowBiasAndProbeId();
        this._updateReflectionProbeTexture();
        this._onUpdateReflectionProbeDataMap();
        this._onUpdateLocalReflectionProbeData();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected _onMeshChanged (old: Mesh | null): void {
    }

    protected _clearMaterials (): void {
        if (!this._model) { return; }
        const subModels = this._model.subModels;
        for (let i = 0; i < subModels.length; ++i) {
            this._onMaterialModified(i, null);
        }
    }

    protected _getBuiltinMaterial (): Material {
        // classic ugly pink indicating missing material
        return builtinResMgr.get<Material>('missing-material');
    }

    protected _onVisibilityChange (val: number): void {
        if (!this._model) { return; }
        this._model.visFlags = val;
    }

    protected _updateShadowBias (): void {
        if (!this._model) { return; }
        this._model.shadowBias = this._shadowBias;
    }

    protected _updateShadowNormalBias (): void {
        if (!this._model) { return; }
        this._model.shadowNormalBias = this._shadowNormalBias;
    }

    protected _updateCastShadow (): void {
        if (!this._model) { return; }
        if (this._shadowCastingMode === ModelShadowCastingMode.OFF) {
            this._model.castShadow = false;
        } else {
            assertIsTrue(
                this._shadowCastingMode === ModelShadowCastingMode.ON,
                `ShadowCastingMode ${this._shadowCastingMode} is not supported.`,
            );
            this._model.castShadow = true;
        }
    }

    protected _updateReceiveShadow (): void {
        if (!this._model) { return; }
        if (this._shadowReceivingMode === ModelShadowReceivingMode.OFF) {
            this._model.receiveShadow = false;
        } else {
            this._model.receiveShadow = true;
        }
    }

    protected onMobilityChanged (): void {
        this._updateUseLightProbe();
        this._updateReceiveDirLight();
    }

    protected onLightProbeBakingChanged (): void {
        this._updateReceiveDirLight();
    }

    protected onUseLightProbeChanged (): void {
        this._updateUseLightProbe();
    }

    protected onReflectionProbeChanged (): void {
        this._updateUseReflectionProbe();
        this._onUpdateLocalShadowBiasAndProbeId();
        const reflectionProbeManager = cclegacy.internal.reflectionProbeManager as ReflectionProbeManager;
        const model = this._model!;
        if (this.bakeSettings.reflectionProbe === ReflectionProbeType.BAKED_CUBEMAP
            || this.bakeSettings.reflectionProbe === ReflectionProbeType.BLEND_PROBES
            || this.bakeSettings.reflectionProbe === ReflectionProbeType.BLEND_PROBES_AND_SKYBOX) {
            reflectionProbeManager.selectReflectionProbe(model);
            if (!reflectionProbeManager.getUsedReflectionProbe(model, false)) {
                warnID(16302);
            }
        } else if (this.bakeSettings.reflectionProbe === ReflectionProbeType.PLANAR_REFLECTION) {
            reflectionProbeManager.selectPlanarReflectionProbe(model);
            if (!reflectionProbeManager.getUsedReflectionProbe(model, true)) {
                warnID(16302);
            }
        }
    }

    protected onBakeToReflectionProbeChanged (): void {
        this._updateBakeToReflectionProbe();
    }

    protected _updateUseLightProbe (): void {
        if (!this._model) { return; }
        const node = this.node;
        if (this._mesh && node && node.mobility === MobilityMode.Movable && this.bakeSettings.useLightProbe) {
            this._model.useLightProbe = true;
        } else {
            this._model.useLightProbe = false;
        }
    }

    protected _isBatchingEnabled (): boolean {
        for (let i = 0; i < this._materials.length; ++i) {
            const mat = this._materials[i];
            if (!mat) { continue; }
            for (let p = 0; p < mat.passes.length; ++p) {
                const pass = mat.passes[p];
                if (pass.batchingScheme) { return true; }
            }
        }
        return false;
    }

    protected _updateUseReflectionProbe (): void {
        if (!this._model) return;
        this._model.reflectionProbeType = this.bakeSettings.reflectionProbe;
        this._updateReflectionProbeTexture();
    }

    protected _updateUseReflectionProbeType (): void {
        if (!this._model) return;
        this._model.reflectionProbeType = this.bakeSettings.reflectionProbe;
    }

    protected _updateBakeToReflectionProbe (): void {
        if (!this._model) { return; }
        this._model.bakeToReflectionProbe = this.bakeSettings.bakeToReflectionProbe;
    }

    private _watchMorphInMesh (): void {
        if (this._morphInstance) {
            this._morphInstance.destroy();
            this._morphInstance = null;
        }

        if (!this._enableMorph) {
            return;
        }

        if (!this._mesh
            || !this._mesh.struct.morph
            || !this._mesh.morphRendering) {
            return;
        }

        this._morphInstance = this._mesh.morphRendering.createInstance();
        const nSubMeshes = this._mesh.struct.primitives.length;
        for (let iSubMesh = 0; iSubMesh < nSubMeshes; ++iSubMesh) {
            this._uploadSubMeshShapesWeights(iSubMesh);
        }

        if (this._model && this._model instanceof MorphModel) {
            this._model.setMorphRendering(this._morphInstance);
        }
    }

    private _initSubMeshShapesWeights (): void {
        const { _mesh: mesh } = this;

        this._subMeshShapesWeights.length = 0;

        if (!mesh) {
            return;
        }

        const morph = mesh.struct.morph;
        if (!morph) {
            return;
        }

        const commonWeights = morph.weights;
        this._subMeshShapesWeights = morph.subMeshMorphs.map((subMeshMorph) => {
            if (!subMeshMorph) {
                return [];
            } else if (subMeshMorph.weights) {
                return subMeshMorph.weights.slice(0);
            } else if (commonWeights) {
                assertIsTrue(commonWeights.length === subMeshMorph.targets.length);
                return commonWeights.slice(0);
            } else {
                return new Array<number>(subMeshMorph.targets.length).fill(0.0);
            }
        });
    }

    private _validateShapeWeights (): boolean {
        const {
            _mesh: mesh,
            _subMeshShapesWeights: subMeshShapesWeights,
        } = this;

        if (!mesh || !mesh.struct.morph) {
            return subMeshShapesWeights.length === 0;
        }

        const { morph } = mesh.struct;
        if (morph.subMeshMorphs.length !== subMeshShapesWeights.length) {
            return false;
        }

        return subMeshShapesWeights.every(
            ({ length: shapeCount }, subMeshIndex) => (morph.subMeshMorphs[subMeshIndex]?.targets.length ?? 0) === shapeCount,
        );
    }

    private _uploadSubMeshShapesWeights (subMeshIndex: number): void {
        this._morphInstance?.setWeights(subMeshIndex, this._subMeshShapesWeights[subMeshIndex]);
    }

    private _updateStandardSkin (): void {
        const pipelineSceneData = (cclegacy.director.root as Root).pipeline.pipelineSceneData;
        if (this._enabledGlobalStandardSkinObject) {
            pipelineSceneData.standardSkinMeshRenderer = this;
            pipelineSceneData.standardSkinModel = this.model;
        }
        if (!pipelineSceneData.skinMaterialModel && this._model) {
            const subModels = this._model.subModels;
            for (let j = 0; j < subModels.length; j++) {
                const subModel = subModels[j];
                const skinPassIdx = getSkinPassIndex(subModel);
                if (skinPassIdx < 0) { continue; }
                pipelineSceneData.skinMaterialModel = this._model;
                return;
            }
        }
    }
}

export declare namespace MeshRenderer {
    /**
     * @en Shadow projection mode.
     * @zh 阴影投射方式。
     */
    export type ShadowCastingMode = EnumAlias<typeof ModelShadowCastingMode>;
    /**
     * @en Shadow receive mode.
     * @zh 阴影接收方式。
     */
    export type ShadowReceivingMode = EnumAlias<typeof ModelShadowReceivingMode>;
}
