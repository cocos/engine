/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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

// Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.
import { EDITOR } from 'internal:constants';
import { builtinResMgr } from '../../asset/asset-manager/builtin-res-mgr';
import { Material } from '../../asset/assets/material';
import { RenderingSubMesh } from '../../asset/assets/rendering-sub-mesh';
import { Node } from '../../scene-graph';
import { Layers } from '../../scene-graph/layers';
import { RenderScene } from '../core/render-scene';
import { Texture2D } from '../../asset/assets/texture-2d';
import { SubModel } from './submodel';
import { IMacroPatch } from '../core/pass';
import { Mat4, Vec3, Vec4, geometry, cclegacy, EPSILON, v3, v4 } from '../../core';
import { Attribute, DescriptorSet, Device, Buffer, BufferInfo,
    BufferUsageBit, MemoryUsageBit, Filter, Address, SamplerInfo, deviceManager, Texture } from '../../gfx';
import {
    UBOLocal,
    UBOLocalEnum, UBOSH, UBOSHEnum, UBOWorldBound, UNIFORM_LIGHTMAP_TEXTURE_BINDING, UNIFORM_REFLECTION_PROBE_BLEND_CUBEMAP_BINDING,
    UNIFORM_REFLECTION_PROBE_CUBEMAP_BINDING, UNIFORM_REFLECTION_PROBE_DATA_MAP_BINDING,
    UNIFORM_REFLECTION_PROBE_TEXTURE_BINDING,
} from '../../rendering/define';
import { Root } from '../../root';
import { TextureCube } from '../../asset/assets';
import { ShadowType } from './shadows';
import { ProbeType, ReflectionProbe } from './reflection-probe';
import { ReflectionProbeType } from '../../3d/reflection-probe/reflection-probe-enum';
import type { SH } from '../../gi/light-probe/sh';
import type { PipelineSceneData } from '../../rendering';

const m4_1 = new Mat4();

const shadowMapPatches: IMacroPatch[] = [
    { name: 'CC_RECEIVE_SHADOW', value: true },
];

const staticLightMapPatches: IMacroPatch[] = [
    { name: 'CC_USE_LIGHTMAP', value: 1 },
];

const stationaryLightMapPatches: IMacroPatch[] = [
    { name: 'CC_USE_LIGHTMAP', value: 2 },
];

const highpLightMapPatches: IMacroPatch[] = [
    { name: 'CC_LIGHT_MAP_VERSION', value: 2 },
];

const lightProbePatches: IMacroPatch[] = [
    { name: 'CC_USE_LIGHT_PROBE', value: true },
];
const CC_USE_REFLECTION_PROBE = 'CC_USE_REFLECTION_PROBE';
const CC_DISABLE_DIRECTIONAL_LIGHT = 'CC_DISABLE_DIRECTIONAL_LIGHT';
export enum ModelType {
    DEFAULT,
    SKINNING,
    BAKED_SKINNING,
    BATCH_2D,
    PARTICLE_BATCH,
    LINE,
}

const lightmapSamplerHash = new SamplerInfo(
    Filter.LINEAR,
    Filter.LINEAR,
    Filter.NONE,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
);

const lightmapSamplerWithMipHash = new SamplerInfo(
    Filter.LINEAR,
    Filter.LINEAR,
    Filter.LINEAR,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
);

/**
 * @en A representation of a model instance
 * The base model class, which is the core component of [[MeshRenderer]],
 * adds its own Model to the rendered scene for rendering submissions when [[MeshRenderer]] is enabled.
 * This type of object represents a rendering instance in a scene, and it can contain multiple sub models,
 * each of which corresponds to a material. These sub models share the same location and form a complete object.
 * Each sub model references a sub mesh resource, which provides vertex and index buffers for rendering.
 * @zh 代表一个模型实例
 * 基础模型类，它是 [[MeshRenderer]] 的核心组成部分，在 [[MeshRenderer]] 启用时会将自己的 Model 添加到渲染场景中用于提交渲染。
 * 此类型对象代表一个场景中的渲染实例，它可以包含多个子模型，每个子模型对应一个材质。这些子模型共享同样的位置，组成一个完整的物体。
 * 每个子模型引用一个子网格资源，后者提供渲染所用的顶点与索引缓冲。
 */
export class Model {
    /**
     * @en Sub models of the current model
     * @zh 获取所有子模型
     */
    get subModels (): SubModel[] {
        return this._subModels;
    }

    /**
     * @en Whether the model is initialized
     * @zh 是否初始化
     */
    get inited (): boolean {
        return this._inited;
    }

    /**
     * @en The axis-aligned bounding box of the model in the world space
     * @zh 获取世界空间包围盒
     */
    get worldBounds (): geometry.AABB | null {
        return this._worldBounds;
    }

    /**
     * @en The axis-aligned bounding box of the model in the model space
     * @zh 获取模型空间包围盒
     */
    get modelBounds (): geometry.AABB | null {
        return this._modelBounds;
    }

    /**
     * @en The ubo buffer of the model
     * @zh 获取模型的 ubo 缓冲
     */
    get localBuffer (): Buffer | null {
        return this._localBuffer;
    }

    /**
     * @en The SH ubo buffer of the model
     * @zh 获取模型的球谐 ubo 缓冲
     */
    get localSHBuffer (): Buffer | null {
        return this._localSHBuffer;
    }

    /**
     * @en The world bound ubo buffer
     * @zh 获取世界包围盒 ubo 缓冲
     */
    get worldBoundBuffer (): Buffer | null {
        return this._worldBoundBuffer;
    }

    /**
     * @en The time stamp of last update
     * @zh 获取上次更新时间戳
     */
    get updateStamp (): number {
        return this._updateStamp;
    }

    /**
     * @en Use LightProbe or not
     * @zh 光照探针开关
     */
    get useLightProbe (): boolean {
        return this._useLightProbe$;
    }

    set useLightProbe (val) {
        this._useLightProbe$ = val;
        this.onMacroPatchesStateChanged();
    }

    /**
     * @en located tetrahedron index
     * @zh 模型所处的四面体索引
     */
    get tetrahedronIndex (): number {
        return this._tetrahedronIndex$;
    }

    set tetrahedronIndex (index: number) {
        this._tetrahedronIndex$ = index;
    }

    /**
     * @en Model level shadow bias
     * @zh 阴影偏移值
     */
    get shadowBias (): number {
        return this._shadowBias;
    }

    set shadowBias (val) {
        this._shadowBias = val;
    }

    /**
     * @en Model level shadow normal bias
     * @zh 阴影法线偏移值
     */
    get shadowNormalBias (): number {
        return this._shadowNormalBias;
    }

    set shadowNormalBias (val) {
        this._shadowNormalBias = val;
    }

    /**
     * @en Whether the model should receive shadow
     * @zh 是否接收阴影
     */
    get receiveShadow (): boolean {
        return this._receiveShadow;
    }

    set receiveShadow (val) {
        this._receiveShadow = val;
        this.onMacroPatchesStateChanged();
    }

    /**
     * @en Whether the model should cast shadow
     * @zh 是否投射阴影
     */
    get castShadow (): boolean {
        return this._castShadow;
    }

    set castShadow (val) {
        this._castShadow = val;
    }

    /**
     * @en Gets or sets receive direction Light.
     * @zh 获取或者设置接收平行光光照。
     */
    get receiveDirLight (): boolean {
        return this._receiveDirLight;
    }
    set receiveDirLight (val) {
        this._receiveDirLight = val;
        this.onMacroPatchesStateChanged();
    }

    /**
     * @en The node to which the model belongs
     * @zh 模型所在的节点
     */
    get node (): Node {
        return this._node;
    }

    set node (n: Node) {
        this._node = n;
    }

    /**
     * @en Model's transform
     * @zh 模型的变换
     */
    get transform (): Node {
        return this._transform;
    }

    set transform (n: Node) {
        this._transform = n;
    }

    /**
     * @en Model's visibility tag
     * Model's visibility flags, it's different from [[Node.layer]],
     * but it will also be compared with [[Camera.visibility]] during culling process.
     * @zh 模型的可见性标志
     * 模型的可见性标志与 [[Node.layer]] 不同，它会在剔除阶段与 [[Camera.visibility]] 进行比较
     */
    get visFlags (): number {
        return this._visFlags;
    }

    set visFlags (val: number) {
        this._visFlags = val;
    }

    /**
     * @en Whether the model is enabled in the render scene so that it will be rendered
     * @zh 模型是否在渲染场景中启用并被渲染
     */
    get enabled (): boolean {
        return this._enabled;
    }

    set enabled (val: boolean) {
        this._enabled = val;
    }

    /**
     * @en Rendering priority in the transparent queue of model.
     * @zh Model 在透明队列中的渲染排序优先级
     */
    get priority (): number {
        return this._priority;
    }

    set priority (val: number) {
        this._priority = val;
    }

    /**
     * @en Whether the model can be render by the reflection probe
     * @zh 模型是否能被反射探针渲染
     */
    get bakeToReflectionProbe (): boolean {
        return this._bakeToReflectionProbe;
    }

    set bakeToReflectionProbe (val) {
        this._bakeToReflectionProbe = val;
    }

    /**
     * @en Reflection probe type
     * @zh 反射探针类型。
     */
    get reflectionProbeType (): ReflectionProbeType {
        return this._reflectionProbeType;
    }

    set reflectionProbeType (val) {
        this._reflectionProbeType = val;
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            subModels[i].useReflectionProbeType = val;
        }
        this.onMacroPatchesStateChanged();
    }

    /**
     * @en sets or gets reflection probe id
     * @zh 设置或获取反射探针id。
     */
    get reflectionProbeId (): number {
        return this._reflectionProbeId;
    }

    set reflectionProbeId (val) {
        this._reflectionProbeId = val;
    }

    /**
     * @en Sets or gets the reflection probe id for blend.
     * @zh 设置或获取用于混合的反射探针id。
     */
    get reflectionProbeBlendId (): number {
        return this._reflectionProbeBlendId;
    }

    set reflectionProbeBlendId (val) {
        this._reflectionProbeBlendId = val;
    }

    /**
     * @en Sets or gets the reflection probe blend weight.
     * @zh 设置或获取反射探针混合权重。
     */
    get reflectionProbeBlendWeight (): number {
        return this._reflectionProbeBlendWeight;
    }

    set reflectionProbeBlendWeight (val) {
        this._reflectionProbeBlendWeight = val;
    }

    /**
     * @en The type of the model
     * @zh 模型类型
     */
    public type = ModelType.DEFAULT;

    /**
     * @en The render scene to which the model belongs
     * @zh 模型所在的场景
     */
    public scene: RenderScene | null = null;

    /**
     * @en Whether dynamic batching is enabled for model
     * @zh 是否动态合批
     */
    public isDynamicBatching = false;

    /**
     * @en The world axis-aligned bounding box
     * @zh 世界空间包围盒
     */
    protected _worldBounds: geometry.AABB | null = null;

    /**
     * @en The model axis-aligned bounding box
     * @zh 模型空间包围盒
     */
    protected _modelBounds: geometry.AABB | null = null;

    /**
     * @en Sub models
     * @zh 子模型
     */
    protected _subModels: SubModel[] = [];

    /**
     * @en The node to which the model belongs
     * @zh 模型所在的节点
     */
    protected _node: Node = null!;

    /**
     * @en Model's transform
     * @zh 子模型的变换
     */
    protected _transform: Node = null!;

    /**
     * @en Current gfx device
     * @zh 当前 GFX 设备
     */
    protected declare _device: Device;

    /**
     * @en Whether the model is initialized
     * @zh 是否初始化过
     */
    protected _inited = false;

    /**
     * @en Descriptor set count
     * @zh 描述符集合个数
     */
    protected _descriptorSetCount = 1;

    /**
     * @en Time stamp for last update
     * @zh 更新时间戳
     */
    protected _updateStamp = -1;

    /**
     * @en Local ubo data dirty flag
     * @zh 本地 ubo 数据是否修改过
     */
    protected _localDataUpdated = true;

    /**
     * @en Local ubo data
     * @zh 本地 ubo 数据
     */
    protected _localData = new Float32Array(UBOLocalEnum.COUNT);

    /**
     * @en Local ubo buffer
     * @zh 本地 ubo 缓冲
     */
    protected _localBuffer: Buffer | null = null;

    /**
     * @en Local SH ubo data
     * @zh 本地球谐 ubo 数据
     */
    protected _localSHData: Float32Array | null = null;

    /**
     * @en Local SH ubo buffer
     * @zh 本地球谐 ubo 缓冲
     */
    protected _localSHBuffer: Buffer | null = null;

    private _lightmap$: Texture2D | null = null;
    private _lightmapUVParam$: Vec4 = v4();

    /**
     * @en located tetrahedron index
     * @zh 所处的四面体索引
     */
    private _tetrahedronIndex$ = -1;
    private _lastWorldBoundCenter$ = v3(Infinity, Infinity, Infinity);
    private _useLightProbe$ = false;

    /**
     * @en World AABB buffer
     * @zh 世界空间包围盒缓冲
     */
    protected _worldBoundBuffer: Buffer | null = null;

    /**
     * @en Whether the model should receive shadow
     * @zh 是否接收阴影
     */
    protected _receiveShadow = false;

    /**
     * @en Whether the model should cast shadow
     * @zh 是否投射阴影
     */
    protected _castShadow = false;

    /**
     * @en Is received direction Light.
     * @zh 是否接收平行光光照。
     */
    protected _receiveDirLight = true;

    /**
     * @en Shadow bias
     * @zh 阴影偏移
     */
    protected _shadowBias = 0;

    /**
     * @en Shadow normal bias
     * @zh 阴影法线偏移
     */
    protected _shadowNormalBias = 0;

    /**
     * @en Reflect probe Id
     * @zh 使用第几个反射探针
     */
    protected _reflectionProbeId = -1;

    /**
     * @en Use which probe to blend
     * @zh 使用第几个反射探针进行混合
     */
    protected _reflectionProbeBlendId = -1;

    /**
     * @en Reflection probe blend weight
     * @zh 反射探针混合权重
     */
    protected _reflectionProbeBlendWeight = 0;

    /**
     * @en Whether the model is enabled in the render scene so that it will be rendered
     * @zh 模型是否在渲染场景中启用并被渲染
     */
    protected _enabled = true;

    /**
     * @en The visibility flags
     * @zh 可见性标志位
     */
    protected _visFlags = Layers.Enum.NONE;

    protected _priority = 0;

    /**
     * @en Whether the model can be render by the reflection probe
     * @zh 模型是否能被反射探针渲染
     */
    protected _bakeToReflectionProbe = true;

    /**
     * @en Reflection probe type.
     * @zh 反射探针类型。
     */
    protected _reflectionProbeType = ReflectionProbeType.NONE;

    /**
     * @internal
     * @en native object
     * @zh 原生对象
     */

    /**
     * @internal
     * @en return native object
     * @zh 返回原生对象
     */
    /**
     * @en Constructor to create an empty model
     * @zh 创建一个空模型
     */
    constructor () {
        this._device = deviceManager.gfxDevice;
    }

    /**
     * @en Initialize the model
     * @zh 初始化模型
     */
    public initialize (): void {
        if (this._inited) {
            return;
        }
        this._receiveShadow = true;
        this.castShadow = false;
        this.enabled = true;
        this.visFlags = Layers.Enum.NONE;
        this._inited = true;
        this._bakeToReflectionProbe = true;
        this._reflectionProbeType = ReflectionProbeType.NONE;
    }

    /**
     * @en Destroy the model
     * @zh 销毁模型
     */
    public destroy (): void {
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            this._subModels[i].destroy();
        }
        if (this._localBuffer) {
            this._localBuffer.destroy();
            this._localBuffer = null;
        }
        if (this._localSHBuffer) {
            this._localSHBuffer.destroy();
            this._localSHBuffer = null;
        }
        if (this._worldBoundBuffer) {
            this._worldBoundBuffer.destroy();
            this._worldBoundBuffer = null;
        }
        this._worldBounds = null;
        this._modelBounds = null;
        this._subModels.length = 0;
        this._inited = false;
        this._localDataUpdated = true;
        this._transform = null!;
        this._node = null!;
        this.isDynamicBatching = false;
    }

    /**
     * @en Attach the model to a [[renderer.RenderScene]]
     * @zh 添加模型到渲染场景 [[renderer.RenderScene]] 中
     * @param scene destination scene
     */
    public attachToScene (scene: RenderScene): void {
        this.scene = scene;
        this._localDataUpdated = true;
    }

    /**
     * @en Detach the model from its render scene
     * @zh 移除场景中的模型
     */
    public detachFromScene (): void {
        this.scene = null;
    }

    /**
     * @en Update the model's transform
     * @zh 更新模型的变换
     * @param stamp time stamp
     */
    public updateTransform (stamp: number): void {
        const node = this.transform;
        if (node.hasChangedFlags || node.isTransformDirty()) {
            node.updateWorldTransform();
            this._localDataUpdated = true;
            const worldBounds = this._worldBounds;
            if (this._modelBounds && worldBounds) {
                this._modelBounds.transform(node._mat, node._pos, node._rot, node._scale, worldBounds);
            }
        }
    }

    /**
     * @en Update the model's world AABB
     * @zh 更新模型的世界空间包围盒
     */
    public updateWorldBound (): void {
        const node = this.transform;
        if (node !== null) {
            node.updateWorldTransform();
            this._localDataUpdated = true;
            const worldBounds = this._worldBounds;
            if (this._modelBounds && worldBounds) {
                this._modelBounds.transform(node._mat, node._pos, node._rot, node._scale, worldBounds);
            }
        }
    }

    /**
     * @en Update the model's ubo
     * @zh 更新模型的 ubo
     * @param stamp time stamp
     */
    public updateUBOs (stamp: number): void {
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            subModels[i].update();
        }
        this._updateStamp = stamp;

        this.updateSHUBOs();
        const forceUpdateUBO = this.node.scene.globals.shadows.enabled && this.node.scene.globals.shadows.type === ShadowType.Planar;

        if (!this._localDataUpdated) { return; }
        this._localDataUpdated = false;

        const worldMatrix = this.transform._mat;
        let hasNonInstancingPass = false;
        for (let i = 0; i < subModels.length; i++) {
            const subModel = subModels[i];
            const idx = subModel.instancedWorldMatrixIndex;
            if (idx >= 0) {
                subModel.updateInstancedWorldMatrix(worldMatrix, idx);
            } else {
                hasNonInstancingPass = true;
            }
        }
        if ((hasNonInstancingPass || forceUpdateUBO) && this._localBuffer) {
            Mat4.toArray(this._localData, worldMatrix, UBOLocalEnum.MAT_WORLD_OFFSET);

            Mat4.invert(m4_1, worldMatrix);
            Mat4.transpose(m4_1, m4_1);

            Mat4.toArray(this._localData, m4_1, UBOLocalEnum.MAT_WORLD_IT_OFFSET);
            this._localBuffer.update(this._localData);
        }
    }

    /**
     * @engineInternal
     * @en Invalidate local data
     * @zh 使本地数据失效
     */
    public invalidateLocalData (): void {
        this._localDataUpdated = true;
    }

    public showTetrahedron (): boolean {
        return this.isLightProbeAvailable$();
    }

    private isLightProbeAvailable$ (): boolean {
        if (!this._useLightProbe$) {
            return false;
        }

        const lightProbes = (cclegacy.director.root as Root).pipeline.pipelineSceneData.lightProbes;
        if (!lightProbes || lightProbes.empty()) {
            return false;
        }

        if (!this._worldBounds) {
            return false;
        }

        return true;
    }

    private updateSHBuffer$ (): void {
        if (!this._localSHData) {
            return;
        }

        const subModels = this._subModels;
        let hasNonInstancingPass = false;
        for (let i = 0; i < subModels.length; i++) {
            const subModel = subModels[i];
            const idx = subModel.instancedSHIndex;
            if (idx >= 0) {
                subModel.updateInstancedSH(this._localSHData, idx);
            } else {
                hasNonInstancingPass = true;
            }
        }

        if (hasNonInstancingPass && this._localSHBuffer) {
            this._localSHBuffer.update(this._localSHData);
        }
    }

    /**
     * @en Clear the model's SH ubo
     * @zh 清除模型的球谐 ubo
     */
    public clearSHUBOs (): void {
        if (!this._localSHData) {
            return;
        }

        for (let i = 0; i < UBOSHEnum.COUNT; i++) {
            this._localSHData[i] = 0.0;
        }

        this.updateSHBuffer$();
    }

    /**
     * @en Update the model's SH ubo
     * @zh 更新模型的球谐 ubo
     */
    public updateSHUBOs (): void {
        if (!this.isLightProbeAvailable$()) {
            return;
        }

        const center = this._worldBounds!.center;
        if (!EDITOR && center.equals(this._lastWorldBoundCenter$, EPSILON)) {
            return;
        }

        const coefficients: Vec3[] = [];
        const weights = new Vec4();
        const lightProbes = (cclegacy.director.root.pipeline.pipelineSceneData as PipelineSceneData).lightProbes;

        this._lastWorldBoundCenter$.set(center);
        this._tetrahedronIndex$ = lightProbes.data!.getInterpolationWeights(center, this._tetrahedronIndex$, weights);
        const result = lightProbes.data!.getInterpolationSHCoefficients(this._tetrahedronIndex$, weights, coefficients);
        if (!result) {
            return;
        }

        if (!this._localSHData) {
            return;
        }

        const SHCls: typeof SH = cclegacy.internal.SH;
        SHCls.reduceRinging(coefficients, lightProbes.reduceRinging);
        SHCls.updateUBOData(this._localSHData, UBOSHEnum.SH_LINEAR_CONST_R_OFFSET, coefficients);
        this.updateSHBuffer$();
    }

    /**
     * @en Create the model's AABB
     * @zh 创建模型的包围盒
     * @param minPos min position of the AABB
     * @param maxPos max position of the AABB
     */
    public createBoundingShape (minPos?: Vec3, maxPos?: Vec3): void {
        if (!minPos || !maxPos) { return; }
        if (!this._modelBounds) { this._modelBounds = geometry.AABB.create(); }
        if (!this._worldBounds) { this._worldBounds = geometry.AABB.create(); }
        geometry.AABB.fromPoints(this._modelBounds, minPos, maxPos);
        this._worldBounds.copy(this._modelBounds);
    }

    private _createSubModel$ (): SubModel {
        return new SubModel();
    }

    /**
     * @en Initialize a sub model with the sub mesh data and the material.
     * @zh 用子网格数据和材质初始化一个子模型。
     * @param idx sub model's index
     * @param subMeshData sub mesh
     * @param mat sub material
     */
    public initSubModel (idx: number, subMeshData: RenderingSubMesh, mat: Material): void {
        this.initialize();

        if (this._subModels[idx] == null) {
            this._subModels[idx] = this._createSubModel$();
        } else {
            this._subModels[idx].destroy();
        }
        this._subModels[idx].initialize(subMeshData, mat.passes, this.getMacroPatches(idx));

        this._updateAttributesAndBinding(idx);
    }

    /**
     * @en Set material for a given sub model
     * @zh 为指定的子模型设置材质
     * @param idx sub model's index
     * @param subMesh sub mesh
     */
    public setSubModelMesh (idx: number, subMesh: RenderingSubMesh): void {
        if (!this._subModels[idx]) { return; }
        this._subModels[idx].subMesh = subMesh;
    }

    /**
     * @en Set a sub material
     * @zh 设置一个子材质
     * @param idx sub model's index
     * @param mat sub material
     */
    public setSubModelMaterial (idx: number, mat: Material): void {
        if (!this._subModels[idx]) { return; }
        this._subModels[idx].passes = mat.passes;
        this._updateAttributesAndBinding(idx);
    }

    /**
     * @en Pipeline changed callback
     * @zh 管线更新回调
     */
    public onGlobalPipelineStateChanged (): void {
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            subModels[i].onPipelineStateChanged();
        }
    }

    /**
     * @en Shader macro changed callback
     * @zh Shader 宏更新回调
     */
    public onMacroPatchesStateChanged (): void {
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            subModels[i].onMacroPatchesStateChanged(this.getMacroPatches(i));
        }
    }

    public onGeometryChanged (): void {
        const subModels = this._subModels;
        for (let i = 0; i < subModels.length; i++) {
            subModels[i].onGeometryChanged();
        }
    }

    /**
     * @internal
     * If the model has lighting map
     * initialize lighting map info before model initializing
     * because the lighting map will influence the shader
     */
    public initLightingmap (texture: Texture2D | null, uvParam: Vec4): void {
        this._lightmap$ = texture;
        this._lightmapUVParam$ = uvParam;
    }

    /**
     * @en Update the light map info
     * @zh 更新光照贴图信息
     * @param texture light map
     * @param uvParam uv coordinate
     */
    public updateLightingmap (texture: Texture2D | null, uvParam: Vec4): void {
        Vec4.toArray(this._localData, uvParam, UBOLocalEnum.LIGHTINGMAP_UVPARAM);
        this._localDataUpdated = true;
        this._lightmap$ = texture;
        this._lightmapUVParam$ = uvParam;

        this.onMacroPatchesStateChanged();

        if (!texture) {
            texture = builtinResMgr.get<Texture2D>('empty-texture');
        }

        const gfxTexture = texture.getGFXTexture();
        if (gfxTexture) {
            const sampler = this._device.getSampler(texture.mipmaps.length > 1 ? lightmapSamplerWithMipHash : lightmapSamplerHash);
            const subModels = this._subModels;
            for (let i = 0; i < subModels.length; i++) {
                const { descriptorSet } = subModels[i];
                descriptorSet.bindTexture(UNIFORM_LIGHTMAP_TEXTURE_BINDING, gfxTexture);
                descriptorSet.bindSampler(UNIFORM_LIGHTMAP_TEXTURE_BINDING, sampler);
                descriptorSet.update();
            }
        }
    }

    /**
     * @en Update the cube map of the reflection probe
     * @zh 更新反射探针的立方体贴图
     * @param texture probe cubemap
     */
    public updateReflectionProbeCubemap (texture: TextureCube | null): void {
        this._localDataUpdated = true;
        this.onMacroPatchesStateChanged();

        if (!texture) {
            texture = builtinResMgr.get<TextureCube>('default-cube-texture');
        }

        const gfxTexture = texture.getGFXTexture();
        if (gfxTexture) {
            const reflectionSampler = this._device.getSampler(texture.getSamplerInfo());
            const subModels = this._subModels;
            for (let i = 0; i < subModels.length; i++) {
                const { descriptorSet } = subModels[i];
                if (descriptorSet) {
                    descriptorSet.bindSampler(UNIFORM_REFLECTION_PROBE_CUBEMAP_BINDING, reflectionSampler);
                    descriptorSet.bindTexture(UNIFORM_REFLECTION_PROBE_CUBEMAP_BINDING, gfxTexture);
                    descriptorSet.update();
                }
            }
        }
    }

    /**
     * @en Update the cube map of the reflection probe for blend
     * @zh 更新用于blend的反射探针立方体贴图
     * @param texture probe cubemap
     */
    public updateReflectionProbeBlendCubemap (texture: TextureCube | null): void {
        this._localDataUpdated = true;
        this.onMacroPatchesStateChanged();

        if (!texture) {
            texture = builtinResMgr.get<TextureCube>('default-cube-texture');
        }

        const gfxTexture = texture.getGFXTexture();
        if (gfxTexture) {
            const reflectionSampler = this._device.getSampler(texture.getSamplerInfo());
            const subModels = this._subModels;
            for (let i = 0; i < subModels.length; i++) {
                const { descriptorSet } = subModels[i];
                if (descriptorSet) {
                    descriptorSet.bindSampler(UNIFORM_REFLECTION_PROBE_BLEND_CUBEMAP_BINDING, reflectionSampler);
                    descriptorSet.bindTexture(UNIFORM_REFLECTION_PROBE_BLEND_CUBEMAP_BINDING, gfxTexture);
                    descriptorSet.update();
                }
            }
        }
    }

    /**
     * @en Update the planar relflection map of the reflection probe
     * @zh 更新反射探针的平面反射贴图
     * @param texture planar relflection map
     */
    public updateReflectionProbePlanarMap (texture: Texture | null): void {
        this._localDataUpdated = true;
        this.onMacroPatchesStateChanged();

        const sampler = this._device.getSampler(new SamplerInfo(
            Filter.LINEAR,
            Filter.LINEAR,
            Filter.NONE,
            Address.CLAMP,
            Address.CLAMP,
            Address.CLAMP,
        ));
        if (!texture) {
            texture = builtinResMgr.get<Texture2D>('empty-texture').getGFXTexture()!;
        }
        if (texture) {
            const subModels = this._subModels;
            for (let i = 0; i < subModels.length; i++) {
                const { descriptorSet } = subModels[i];
                if (descriptorSet) {
                    descriptorSet.bindTexture(UNIFORM_REFLECTION_PROBE_TEXTURE_BINDING, texture);
                    descriptorSet.bindSampler(UNIFORM_REFLECTION_PROBE_TEXTURE_BINDING, sampler);
                    descriptorSet.update();
                }
            }
        }
    }

    /**
     * @en Update the data map of the reflection probe
     * @zh 更新反射探针的数据贴图
     * @param texture data map
     */
    public updateReflectionProbeDataMap (texture: Texture2D | null): void {
        this._localDataUpdated = true;
        this.onMacroPatchesStateChanged();

        if (!texture) {
            texture = builtinResMgr.get<Texture2D>('empty-texture');
        }
        const gfxTexture = texture.getGFXTexture();
        if (gfxTexture) {
            const subModels = this._subModels;
            for (let i = 0; i < subModels.length; i++) {
                const { descriptorSet } = subModels[i];
                if (descriptorSet) {
                    descriptorSet.bindTexture(UNIFORM_REFLECTION_PROBE_DATA_MAP_BINDING, gfxTexture);
                    descriptorSet.bindSampler(UNIFORM_REFLECTION_PROBE_DATA_MAP_BINDING, texture.getGFXSampler());
                    descriptorSet.update();
                }
            }
        }
    }

    /**
     * @en Update the shadow bias
     * @zh 更新阴影偏移
     */
    public updateLocalShadowBias (): void {
        const sv = this._localData;
        sv[UBOLocalEnum.LOCAL_SHADOW_BIAS + 0] = this._shadowBias;
        sv[UBOLocalEnum.LOCAL_SHADOW_BIAS + 1] = this._shadowNormalBias;
        this._localDataUpdated = true;
    }

    /**
     * @en Update the id of reflection probe
     * @zh 更新物体使用哪个反射探针
     */
    public updateReflectionProbeId  (): void {
        const sv = this._localData;
        sv[UBOLocalEnum.LOCAL_SHADOW_BIAS + 2] = this._reflectionProbeId;
        sv[UBOLocalEnum.LOCAL_SHADOW_BIAS + 3] = this._reflectionProbeBlendId;
        let probe: ReflectionProbe | null = null;
        let blendProbe: ReflectionProbe | null = null;
        if (cclegacy.internal.reflectionProbeManager) {
            probe = cclegacy.internal.reflectionProbeManager.getProbeById(this._reflectionProbeId);
            blendProbe = cclegacy.internal.reflectionProbeManager.getProbeById(this._reflectionProbeBlendId);
        }
        if (probe) {
            if (probe.probeType === ProbeType.PLANAR) {
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1] = probe.node.up.x;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 1] = probe.node.up.y;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 2] = probe.node.up.z;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 3] = 1.0;

                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2] = 1.0;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 1] = 0.0;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 2] = 0.0;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 3] = 1.0;
            } else {
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1] = probe.node.worldPosition.x;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 1] = probe.node.worldPosition.y;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 2] = probe.node.worldPosition.z;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA1 + 3] = 0.0;

                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2] = probe.size.x;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 1] = probe.size.y;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 2] = probe.size.z;
                const mipAndUseRGBE = probe.isRGBE() ? 1000 : 0;
                sv[UBOLocalEnum.REFLECTION_PROBE_DATA2 + 3] = probe.cubemap ? probe.cubemap.mipmapLevel + mipAndUseRGBE : 1.0 + mipAndUseRGBE;
            }
            // eslint-disable-next-line max-len
            if (this._reflectionProbeType === ReflectionProbeType.BLEND_PROBES
                || this._reflectionProbeType === ReflectionProbeType.BLEND_PROBES_AND_SKYBOX) {
                if (blendProbe) {
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA1] = blendProbe.node.worldPosition.x;
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA1 + 1] = blendProbe.node.worldPosition.y;
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA1 + 2] = blendProbe.node.worldPosition.z;
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA1 + 3] = this.reflectionProbeBlendWeight;

                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA2] = blendProbe.size.x;
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA2 + 1] = blendProbe.size.y;
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA2 + 2] = blendProbe.size.z;
                    const mipAndUseRGBE = blendProbe.isRGBE() ? 1000 : 0;
                    // eslint-disable-next-line max-len
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA2 + 3] = blendProbe.cubemap ? blendProbe.cubemap.mipmapLevel + mipAndUseRGBE : 1.0 + mipAndUseRGBE;
                } else if (this._reflectionProbeType === ReflectionProbeType.BLEND_PROBES_AND_SKYBOX) {
                    //blend with skybox
                    sv[UBOLocalEnum.REFLECTION_PROBE_BLEND_DATA1 + 3] = this.reflectionProbeBlendWeight;
                }
            }
        }
        this._localDataUpdated = true;
    }

    /**
     * @en Return shader's macro patches
     * @zh 获取 shader 宏
     * @param subModelIndex sub model's index
     */
    public getMacroPatches (subModelIndex: number): IMacroPatch[] | null {
        let patches = this.receiveShadow ? shadowMapPatches : null;
        if (this._lightmap$ != null) {
            if (this.node && this.node.scene && !this.node.scene.globals.disableLightmap) {
                const mainLightIsStationary = this.node.scene.globals.bakedWithStationaryMainLight;
                const lightmapPathes = mainLightIsStationary ? stationaryLightMapPatches : staticLightMapPatches;

                patches = patches ? patches.concat(lightmapPathes) : lightmapPathes;
                // use highp lightmap
                if (this.node.scene.globals.bakedWithHighpLightmap) {
                    patches = patches.concat(highpLightMapPatches);
                }
            }
        }
        if (this._useLightProbe$) {
            patches = patches ? patches.concat(lightProbePatches) : lightProbePatches;
        }
        const reflectionProbePatches: IMacroPatch[] = [
            { name: CC_USE_REFLECTION_PROBE, value: this._reflectionProbeType },
        ];
        patches = patches ? patches.concat(reflectionProbePatches) : reflectionProbePatches;
        const receiveDirLightPatches: IMacroPatch[] = [
            { name: CC_DISABLE_DIRECTIONAL_LIGHT, value: !this._receiveDirLight },
        ];
        patches = patches ? patches.concat(receiveDirLightPatches) : receiveDirLightPatches;

        return patches;
    }

    protected _updateAttributesAndBinding (subModelIndex: number): void {
        const subModel = this._subModels[subModelIndex];
        if (!subModel) { return; }

        this._initLocalDescriptors(subModelIndex);
        this._updateLocalDescriptors(subModelIndex, subModel.descriptorSet);

        this._initLocalSHDescriptors(subModelIndex);
        this._updateLocalSHDescriptors(subModelIndex, subModel.descriptorSet);

        this._initWorldBoundDescriptors(subModelIndex);

        if (subModel.worldBoundDescriptorSet) {
            this._updateWorldBoundDescriptors(subModelIndex, subModel.worldBoundDescriptorSet);
        }

        const attributes: Attribute[] = [];
        const attributeSet = new Set<string>();
        for (const pass of subModel.passes) {
            const shader = pass.getShaderVariant(subModel.patches)!;
            for (const attr of shader.attributes) {
                if (!attributeSet.has(attr.name)) {
                    attributes.push(attr);
                    attributeSet.add(attr.name);
                }
            }
        }
        this._updateInstancedAttributes(attributes, subModel);
    }

    // sub-classes can override the following functions if needed

    // for now no subModel level instancing attributes
    protected _updateInstancedAttributes (attributes: Attribute[], subModel: SubModel): void {
        subModel.UpdateInstancedAttributes(attributes);
        this._localDataUpdated = true;
    }

    protected _initLocalDescriptors (subModelIndex: number): void {
        if (!this._localBuffer) {
            this._localBuffer = this._device.createBuffer(new BufferInfo(
                BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                UBOLocalEnum.SIZE,
                UBOLocalEnum.SIZE,
            ));
        }
    }

    protected _initLocalSHDescriptors (subModelIndex: number): void {
        if (!EDITOR && !this._useLightProbe$) {
            return;
        }

        if (!this._localSHData) {
            this._localSHData = new Float32Array(UBOSHEnum.COUNT);
        }

        if (!this._localSHBuffer) {
            this._localSHBuffer = this._device.createBuffer(new BufferInfo(
                BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                UBOSHEnum.SIZE,
                UBOSHEnum.SIZE,
            ));
        }
    }

    protected _initWorldBoundDescriptors (subModelIndex: number): void {
        if (!this._worldBoundBuffer) {
            this._worldBoundBuffer = this._device.createBuffer(new BufferInfo(
                BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                UBOWorldBound.SIZE,
                UBOWorldBound.SIZE,
            ));
        }
    }

    protected _updateLocalDescriptors (subModelIndex: number, descriptorSet: DescriptorSet): void {
        if (this._localBuffer) descriptorSet.bindBuffer(UBOLocal.BINDING, this._localBuffer);
    }

    protected _updateLocalSHDescriptors (subModelIndex: number, descriptorSet: DescriptorSet): void {
        if (this._localSHBuffer) descriptorSet.bindBuffer(UBOSH.BINDING, this._localSHBuffer);
    }

    protected _updateWorldBoundDescriptors (subModelIndex: number, descriptorSet: DescriptorSet): void {
        if (this._worldBoundBuffer) descriptorSet.bindBuffer(UBOWorldBound.BINDING, this._worldBoundBuffer);
    }
}
