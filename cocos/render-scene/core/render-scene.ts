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
import { Root } from '../../root';
import { Node } from '../../scene-graph';
import { Camera } from '../scene/camera';
import { DirectionalLight } from '../scene/directional-light';
import { Model } from '../scene/model';
import { SphereLight } from '../scene/sphere-light';
import { SpotLight } from '../scene/spot-light';
import { PointLight } from '../scene/point-light';
import { RangedDirectionalLight } from '../scene/ranged-directional-light';
import { TransformBit } from '../../scene-graph/node-enum';
import { DrawBatch2D } from '../../2d/renderer/draw-batch';
import { LODGroup } from '../scene/lod-group';

export interface IRenderSceneInfo {
    name: string;
}

export interface ISceneNodeInfo {
    name: string;
    isStatic?: boolean;
    // parent: Node;
}

/**
 * @en The result of one raycast operation
 * @zh 一次射线检测的结果
 */
export interface IRaycastResult {
    node: Node;
    distance: number;
}

/**
 * @en The render scene which is created by the [[Root]] and provides all basic render scene elements for the render process.
 * It manages:
 * 1. [[Camera]]s
 * 2. [[Light]]s
 * 3. Renderable objects: [[renderer.Model]]s and `DrawBatchs`
 * @zh 渲染场景，由 [[Root]] 创建，并提供用于渲染流程的所有场景基础元素。它管理：
 * 1. [[Camera]]s：相机
 * 2. [[Light]]s：光源
 * 3. 渲染元素：[[renderer.Model]]s 和 `DrawBatchs`
 */
export class RenderScene {
    /**
     * @en The root manager of the renderer.
     * @zh 基础渲染管理器。
     */
    get root (): Root {
        return this._root;
    }

    /**
     * @en The name of the render scene.
     * @zh 渲染场景的名称。
     */
    get name (): string {
        return this._name;
    }

    /**
     * @en All cameras of the render scene.
     * @zh 渲染场景管理的所有相机。
     */
    get cameras (): Camera[] {
        return this._cameras;
    }

    /**
     * @en The main directional light source of the render scene.
     * @zh 渲染场景管理的主方向光源。
     */
    get mainLight (): DirectionalLight | null {
        return this._mainLight;
    }

    /**
     * @en All sphere light sources of the render scene.
     * @zh 渲染场景管理的所有球面光源。
     */
    get sphereLights (): Readonly<SphereLight[]> {
        return this._sphereLights;
    }

    /**
     * @en All spot light sources of the render scene.
     * @zh 渲染场景管理的所有聚光灯光源。
     */
    get spotLights (): Readonly<SpotLight[]> {
        return this._spotLights;
    }

    /**
     * @en All point light sources of the render scene.
     * @zh 渲染场景管理的所有点光源。
     */
    get pointLights (): Readonly<PointLight[]> {
        return this._pointLights;
    }

    /**
     * @en All ranged directional light sources of the render scene.
     * @zh 渲染场景管理的所有范围平行光光源。
     */
    get rangedDirLights (): Readonly<RangedDirectionalLight[]> {
        return this._rangedDirLights;
    }

    /**
     * @en All active models of the render scene.
     * @zh 渲染场景管理的所有模型。
     */
    get models (): Model[] {
        return this._models;
    }

    /**
     * @en All active 2d draw batches of the render scene.
     * @zh 渲染场景管理的所有 2D 渲染批次对象。
     */
    get batches (): DrawBatch2D[] {
        return this._batches;
    }

    /**
     * @engineInternal
     * @en All LOD groups of the render scene.
     * @zh 渲染场景管理的所有 LOD 组。
     */
    get lodGroups (): readonly LODGroup[] { return this._lodGroups; }

    private declare _root: Root;
    private _name = '';
    private _cameras: Camera[] = [];
    private _models: Model[] = [];
    private _lodGroups: LODGroup[] = []; // LOD Group gathered
    private _batches: DrawBatch2D[] = [];
    private _directionalLights: DirectionalLight[] = [];
    private _sphereLights: SphereLight[] = [];
    private _spotLights: SpotLight[] = [];
    private _pointLights: PointLight[] = [];
    private _rangedDirLights: RangedDirectionalLight[] = [];
    private _mainLight: DirectionalLight | null = null;
    private _modelId = 0;
    private _lodStateCache: LodStateCache = null!;

    /**
     * Register the creation function of the render scene to root.
     * @internal
     */
    public static registerCreateFunc (root: Root): void {
        root._createSceneFun = (_root: Root): RenderScene => new RenderScene(_root);
    }

    constructor (root: Root) {
        this._root = root;
    }

    /**
     * @en Initialize the render scene
     * @zh 初始化渲染场景
     * @returns Successful
     */
    public initialize (info: IRenderSceneInfo): boolean {
        this._name = info.name;
        this._lodStateCache = new LodStateCache(this);
        return true;
    }

    /**
     * @en The update process of the render scene, it updates all rendering related data for the lights and the models.
     * @zh 渲染场景的更新流程，会更新所有光源和模型的渲染相关数据。
     * @param stamp The update time stamp
     * @returns void
     */
    public update (stamp: number): void {
        const mainLight = this._mainLight;
        if (mainLight) {
            mainLight.update();
        }

        const sphereLights = this._sphereLights;
        for (let i = 0; i < sphereLights.length; i++) {
            const light = sphereLights[i];
            light.update();
        }

        const spotLights = this._spotLights;
        for (let i = 0; i < spotLights.length; i++) {
            const light = spotLights[i];
            light.update();
        }

        const pointLights = this._pointLights;
        for (let i = 0; i < pointLights.length; i++) {
            const light = pointLights[i];
            light.update();
        }

        const rangedDirLights = this._rangedDirLights;
        for (let i = 0; i < rangedDirLights.length; i++) {
            const light = rangedDirLights[i];
            light.update();
        }

        const models = this._models;
        for (let i = 0; i < models.length; i++) {
            const model = models[i];

            if (model.enabled) {
                model.updateTransform(stamp);
                model.updateUBOs(stamp);
            }
        }
        this._lodStateCache.updateLodState();
    }

    /**
     * @en Destroy the render scene, dangerous, please do not invoke manually.
     * @zh 销毁渲染场景，请不要手动销毁，会造成未知行为。
     */
    public destroy (): void {
        this.removeCameras();
        this.removeSphereLights();
        this.removeSpotLights();
        this.removeRangedDirLights();
        this.removeModels();
        this.removeLODGroups();
        this._lodStateCache.clearCache();
    }

    public isCulledByLod (camera: Camera, model: Model): boolean {
        return this._lodStateCache.isLodModelCulled(camera, model);
    }

    /**
     * @en Attach a camera to the render scene
     * @zh 向渲染场景挂载一个相机
     */
    public addCamera (cam: Camera): void {
        cam.attachToScene(this);
        this._cameras.push(cam);
        this._lodStateCache.addCamera(cam);
    }

    /**
     * @en Detach a camera to the render scene
     * @zh 从渲染场景移除一个相机
     */
    public removeCamera (camera: Camera): void {
        for (let i = 0; i < this._cameras.length; ++i) {
            if (this._cameras[i] === camera) {
                this._cameras.splice(i, 1);
                camera.detachFromScene();
                this._lodStateCache.removeCamera(camera);
                return;
            }
        }
    }

    /**
     * @en Detach all cameras to the render scene
     * @zh 从渲染场景移除所有相机
     */
    public removeCameras (): void {
        for (const camera of this._cameras) {
            camera.detachFromScene();
            this._lodStateCache.removeCamera(camera);
        }
        this._cameras.splice(0);
    }

    /**
     * @en Sets the main light source for the render scene
     * @zh 给渲染场景设置主光源
     * @param dl The main directional light source
     */
    public setMainLight (dl: DirectionalLight | null): void {
        this._mainLight = dl;
        if (this._mainLight) this._mainLight.activate();
    }

    /**
     * @en Remove the main light source from the render scene
     * @zh 从渲染场景移除主光源
     * @param dl The main directional light source, if it's not the actual main light, nothing happens.
     */
    public unsetMainLight (dl: DirectionalLight): void {
        if (this._mainLight === dl) {
            const dlList = this._directionalLights;
            if (dlList.length) {
                this.setMainLight(dlList[dlList.length - 1]);
                if (this._mainLight.node) { // trigger update
                    this._mainLight.node.hasChangedFlags |= TransformBit.ROTATION;
                }
                return;
            }
            this.setMainLight(null);
        }
    }

    /**
     * @en Add a directional light source, only one directional light is active and act as the main light source.
     * @zh 增加一个方向光源，场景中只会有一个方向光是起效的，并且会作为主光源。
     * @param dl The directional light.
     */
    public addDirectionalLight (dl: DirectionalLight): void {
        dl.attachToScene(this);
        this._directionalLights.push(dl);
    }

    /**
     * @en Remove a directional light source.
     * @zh 删除一个方向光源。
     * @param dl The directional light.
     */
    public removeDirectionalLight (dl: DirectionalLight): void {
        for (let i = 0; i < this._directionalLights.length; ++i) {
            if (this._directionalLights[i] === dl) {
                dl.detachFromScene();
                this._directionalLights.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @en Add a sphere light source.
     * @zh 增加一个球面光源。
     * @param pl The sphere light.
     */
    public addSphereLight (pl: SphereLight): void {
        pl.attachToScene(this);
        this._sphereLights.push(pl);
    }

    /**
     * @en Remove a sphere light source.
     * @zh 删除一个球面光源。
     * @param pl The sphere light.
     */
    public removeSphereLight (pl: SphereLight): void {
        for (let i = 0; i < this._sphereLights.length; ++i) {
            if (this._sphereLights[i] === pl) {
                pl.detachFromScene();
                this._sphereLights.splice(i, 1);

                return;
            }
        }
    }

    /**
     * @en Add a spot light source.
     * @zh 增加一个聚光灯光源。
     * @param sl The spot light.
     */
    public addSpotLight (sl: SpotLight): void {
        sl.attachToScene(this);
        this._spotLights.push(sl);
    }

    /**
     * @en Remove a spot light source.
     * @zh 删除一个聚光灯光源。
     * @param sl The spot light.
     */
    public removeSpotLight (sl: SpotLight): void {
        for (let i = 0; i < this._spotLights.length; ++i) {
            if (this._spotLights[i] === sl) {
                sl.detachFromScene();
                this._spotLights.splice(i, 1);

                return;
            }
        }
    }

    /**
     * @en Remove all sphere light sources.
     * @zh 删除所有球面光源。
     */
    public removeSphereLights (): void {
        for (let i = 0; i < this._sphereLights.length; ++i) {
            this._sphereLights[i].detachFromScene();
        }
        this._sphereLights.length = 0;
    }

    /**
     * @en Remove all spot light sources.
     * @zh 删除所有聚光灯光源。
     */
    public removeSpotLights (): void {
        for (let i = 0; i < this._spotLights.length; ++i) {
            this._spotLights[i].detachFromScene();
        }
        this._spotLights.length = 0;
    }

    /**
     * @en Add a point light source.
     * @zh 增加一个点光源。
     * @param pl @en The point light. @zh 点光源。
     */
    public addPointLight (pl: PointLight): void {
        pl.attachToScene(this);
        this._pointLights.push(pl);
    }

    /**
     * @en Remove a sphere light source.
     * @zh 删除一个点光源。
     * @param pl @en The point light. @zh 点光源。
     */
    public removePointLight (pl: PointLight): void {
        for (let i = 0; i < this._pointLights.length; ++i) {
            if (this._pointLights[i] === pl) {
                pl.detachFromScene();
                this._pointLights.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @en Remove all point light sources.
     * @zh 删除所有点光源。
     */
    public removePointLights (): void {
        for (let i = 0; i < this._pointLights.length; ++i) {
            this._pointLights[i].detachFromScene();
        }
        this._pointLights.length = 0;
    }

    /**
     * @en Add a ranged directional light source.
     * @zh 增加一个范围平行光源。
     * @param l @en The ranged directional light. @zh 范围平行光。
     */
    public addRangedDirLight (l: RangedDirectionalLight): void {
        l.attachToScene(this);
        this._rangedDirLights.push(l);
    }

    /**
     * @en Remove a ranged directional light source.
     * @zh 删除一个范围平行光源。
     * @param l @en The ranged directional light. @zh 范围平行光。
     */
    public removeRangedDirLight (l: RangedDirectionalLight): void {
        for (let i = 0; i < this._rangedDirLights.length; ++i) {
            if (this._rangedDirLights[i] === l) {
                l.detachFromScene();
                this._rangedDirLights.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @en Remove all ranged directional light sources.
     * @zh 删除所有范围平行光源。
     */
    public removeRangedDirLights (): void {
        for (let i = 0; i < this._rangedDirLights.length; ++i) {
            this._rangedDirLights[i].detachFromScene();
        }
        this._rangedDirLights.length = 0;
    }

    /**
     * @en Add a model, all models attached to the render scene will be submitted for rendering.
     * @zh 增加一个模型，渲染场景上挂载的所有模型都会被提交渲染。
     * @param m The model.
     */
    public addModel (m: Model): void {
        m.attachToScene(this);
        this._models.push(m);
    }

    /**
     * @en Remove a model, model removed will no longer be submitted for rendering.
     * @zh 删除一个模型，移除的模型将不再被提交渲染。
     * @param m The model.
     */
    public removeModel (model: Model): void {
        for (let i = 0; i < this._models.length; ++i) {
            if (this._models[i] === model) {
                this._lodStateCache.removeModel(model);
                model.detachFromScene();
                this._models.splice(i, 1);

                return;
            }
        }
    }

    /**
     * @en Remove all models.
     * @zh 删除所有模型。
     */
    public removeModels (): void {
        for (const m of this._models) {
            this._lodStateCache.removeModel(m);
            m.detachFromScene();
            m.destroy();
        }
        this._models.length = 0;
    }

    /**
     * @en Add a draw batch of 2d objects, all draw batches attached to the render scene will be submitted for rendering.
     * @zh 增加一个 2D 渲染批次，渲染场景上挂载的所有 2D 渲染批次都会被提交渲染。
     * @param batch The draw batch.
     * @internal
     * @deprecated since v3.6.0, this is an engine private interface that will be removed in the future.
     */
    public addBatch (batch: DrawBatch2D): void {
        this._batches.push(batch);
    }

    /**
     * @en Remove a draw batch of 2d objects, draw batch removed will no longer be submitted for rendering.
     * @zh 删除一个 2D 渲染批次，移除的 2D 渲染批次将不再被提交渲染。
     * @param batch The draw batch.
     * @internal
     * @deprecated since v3.6.0, this is an engine private interface that will be removed in the future.
     */
    public removeBatch (batch: DrawBatch2D): void {
        for (let i = 0; i < this._batches.length; ++i) {
            if (this._batches[i] === batch) {
                this._batches.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @en Remove all 2d draw batches.
     * @zh 删除所有 2D 渲染批次。
     * @internal
     * @deprecated since v3.6.0, this is an engine private interface that will be removed in the future.
     */
    public removeBatches (): void {
        this._batches.length = 0;
    }

    /**
     * @engineInternal
     * @en Add a LOD group， all LOD groups attached to the render scene will be submitted for rendering.
     * @zh 增加一个LOD 组，渲染场景上挂载的所有LOD 组都会被提交渲染。
     * @param lodGroup the LOD group
     */
    addLODGroup (lodGroup: LODGroup): void {
        this._lodGroups.push(lodGroup);
        lodGroup.attachToScene(this);
        this._lodStateCache.addLodGroup(lodGroup);
    }

    /**
     * @engineInternal
     * @en Remove a LOD group, the LOD group removed will no longer be submitted for rendering.
     * @zh 删除一个LOD 组，移除的LOD 组将不再被提交渲染。
     * @param lodGroup the LOD group
     */
    removeLODGroup (lodGroup: LODGroup): void {
        const index = this._lodGroups.indexOf(lodGroup);
        if (index >= 0) {
            this._lodGroups.splice(index, 1);
            lodGroup.detachFromScene();
            this._lodStateCache.removeLodGroup(lodGroup);
        }
    }

    /**
     * @engineInternal
     * @en Remove all LOD groups.
     * @zh 删除所有LOD 组。
     */
    removeLODGroups (): void {
        for (const group of this._lodGroups) {
            this._lodStateCache.removeLodGroup(group);
        }
        this._lodGroups.length = 0;
    }

    /**
     * @en Notify all models that the global pipeline state have been updated so that they can update their render data and states.
     * @zh 通知所有模型全局管线状态已更新，需要更新自身状态。
     */
    public onGlobalPipelineStateChanged (): void {
        for (const m of this._models) {
            m.onGlobalPipelineStateChanged();
        }
    }

    /**
     * @en Generate a new model id.
     * @zh 生成一个新的模型 ID
     * @returns The model id
     */
    public generateModelId (): number {
        return this._modelId++;
    }
}

class LODInfo {
    /**
     * @zh 当前使用哪一级的 LOD, -1 表示没有层级被使用
     * @en Which level of LOD is currently in use, -1 means no levels are used
     */
    usedLevel = -1;
    lastUsedLevel = -1;
    transformDirty = true;
}

/**
 * @zh 管理LODGroup的使用状态，包含使用层级及其上的model可见相机列表；便于判断当前model是否被LODGroup裁剪
 * @en Manage the usage status of LODGroup, including the usage level and the list of visible cameras on its models;
 * easy to determine whether the current mod is cropped by LODGroup。
 */
class LodStateCache {
    constructor (scene: RenderScene) {
        this._renderScene = scene;
    }

    addCamera (camera: Camera): void {
        const needRegisterChanged = false;
        for (const lodGroup of this._renderScene.lodGroups) {
            const layer = lodGroup.node.layer;
            if ((camera.visibility & layer) === layer) {
                if (!this._lodStateInCamera.has(camera)) {
                    this._lodStateInCamera.set(camera, new Map<LODGroup, LODInfo>());
                }
                break;
            }
        }
    }

    removeCamera (camera: Camera): void {
        if (this._lodStateInCamera.has(camera)) {
            this._lodStateInCamera.delete(camera);
        }
    }

    addLodGroup (lodGroup: LODGroup): void {
        this._newAddedLodGroupVec.push(lodGroup);

        for (const camera of this._renderScene.cameras) {
            if (this._lodStateInCamera.has(camera)) {
                continue;
            }
            const layer = lodGroup.node.layer;
            if ((camera.visibility & layer) === layer) {
                this._lodStateInCamera.set(camera, new Map<LODGroup, LODInfo>());
            }
        }
    }

    removeLodGroup (lodGroup: LODGroup): void {
        for (let index = 0; index < lodGroup.lodCount; index++) {
            const lod = lodGroup.lodDataArray[index];
            for (const model of lod.models) {
                this._modelsInLODGroup.delete(model);
            }
        }
        for (const visibleCamera of this._lodStateInCamera) {
            visibleCamera[1].delete(lodGroup);
        }
        this._levelModels.delete(lodGroup);
    }

    removeModel (model: Model): void {
        if (this._modelsInLODGroup.has(model)) {
            this._modelsInLODGroup.delete(model);
        }
    }

    // Update list of visible cameras on _modelsInLODGroup and update lod usage level under specified camera.
    updateLodState (): void {
        // insert vecAddedLodGroup's model into modelsByAnyLODGroup
        for (const addedLodGroup of this._newAddedLodGroupVec) {
            let levelModels = this._levelModels.get(addedLodGroup);
            if (!levelModels) {
                levelModels = new Map<number, Array<Model>>();
                this._levelModels.set(addedLodGroup, levelModels);
            }
            for (let index = 0; index < addedLodGroup.lodCount; index++) {
                let lodModels = levelModels.get(index);
                if (!lodModels) {
                    lodModels = new Array<Model>();
                }
                const lod = addedLodGroup.lodDataArray[index];
                for (const model of lod.models) {
                    let modelInfo = this._modelsInLODGroup.get(model);
                    if (!modelInfo) {
                        modelInfo = new Map<Camera, boolean>();
                    }
                    this._modelsInLODGroup.set(model, modelInfo);
                    lodModels.push(model);
                }
                levelModels.set(index, lodModels);
            }
        }
        this._newAddedLodGroupVec.length = 0;

        // update current visible lod index & model's visible cameras list
        for (const lodGroup of this._renderScene.lodGroups) {
            if (lodGroup.enabled) {
                const lodLevels = lodGroup.getLockedLODLevels();
                const count = lodLevels.length;
                // count > 0, indicating that the user force to use certain layers of
                // lod
                if (count > 0) {
                    // Update the dirty flag to make it easier to update the visible
                    // index of lod after lifting the forced use of lod.
                    if (lodGroup.node.hasChangedFlags > 0) {
                        for (const visibleCamera of this._lodStateInCamera) {
                            let lodInfo = visibleCamera[1].get(lodGroup);
                            if (!lodInfo) {
                                lodInfo = new LODInfo();
                                visibleCamera[1].set(lodGroup, lodInfo);
                            }
                            lodInfo.transformDirty = true;
                        }
                    }
                    // Update the visible camera list of all models on lodGroup when the
                    // visible level changes.
                    if (lodGroup.isLockLevelChanged()) {
                        lodGroup.resetLockChangeFlag();

                        const lodModels = this._levelModels.get(lodGroup);
                        if (lodModels) {
                            lodModels.forEach((vecArray, index): void => {
                                vecArray.forEach((model): void => {
                                    const modelInfo = this._modelsInLODGroup.get(model);
                                    if (modelInfo) {
                                        modelInfo.clear();
                                    }
                                });
                            });

                            for (const visibleIndex of lodLevels) {
                                const vecModels = lodModels.get(visibleIndex);
                                if (vecModels) {
                                    vecModels.forEach((model): void => {
                                        const modelInfo = this._modelsInLODGroup.get(model);
                                        if (modelInfo && model.node && model.node.active) {
                                            for (const visibleCamera of this._lodStateInCamera) {
                                                modelInfo.set(visibleCamera[0], true);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                    continue;
                }

                // Normal Process, no LOD is forced.
                let hasUpdated = false;
                for (const visibleCamera of this._lodStateInCamera) {
                    let lodInfo = visibleCamera[1].get(lodGroup);
                    if (!lodInfo) {
                        lodInfo = new LODInfo();
                        visibleCamera[1].set(lodGroup, lodInfo);
                    }
                    const cameraChangeFlags = visibleCamera[0].node.hasChangedFlags;
                    const lodChangeFlags = lodGroup.node.hasChangedFlags;
                    // Changes in the camera matrix or changes in the matrix of the node
                    // where lodGroup is located or the transformDirty marker is true,
                    // etc. All need to recalculate the visible level of LOD.
                    if (cameraChangeFlags > 0 || lodChangeFlags > 0 || lodInfo.transformDirty) {
                        if (lodInfo.transformDirty) {
                            lodInfo.transformDirty = false;
                        }
                        const index = lodGroup.getVisibleLODLevel(visibleCamera[0]);
                        if (index !== lodInfo.usedLevel) {
                            lodInfo.lastUsedLevel = lodInfo.usedLevel;
                            lodInfo.usedLevel = index;
                            hasUpdated = true;
                        }
                    }
                }

                const lodModels = this._levelModels.get(lodGroup);
                if (!lodModels) {
                    continue;
                }

                // The LOD of the last frame is forced to be used, the list of visible
                // cameras of modelInfo needs to be updated.
                if (lodGroup.isLockLevelChanged()) {
                    lodGroup.resetLockChangeFlag();

                    lodModels.forEach((vecArray, index): void => {
                        vecArray.forEach((model): void => {
                            const modelInfo = this._modelsInLODGroup.get(model);
                            if (modelInfo) {
                                modelInfo.clear();
                            }
                        });
                    });
                    hasUpdated = true;
                } else if (hasUpdated) {
                    this._lodStateInCamera.forEach((lodState, camera): void => {
                        const lodInfo = lodState.get(lodGroup);
                        if (lodInfo && lodInfo.usedLevel !== lodInfo.lastUsedLevel) {
                            const vecModels = lodModels.get(lodInfo.lastUsedLevel);
                            if (vecModels) {
                                vecModels.forEach((model): void => {
                                    const modelInfo = this._modelsInLODGroup.get(model);
                                    if (modelInfo) {
                                        modelInfo.clear();
                                    }
                                });
                            }
                        }
                    });
                }

                if (hasUpdated) {
                    this._lodStateInCamera.forEach((lodState, camera): void => {
                        const lodInfo = lodState.get(lodGroup);
                        if (lodInfo) {
                            const usedLevel = lodInfo.usedLevel;
                            const vecModels = lodModels.get(usedLevel);
                            if (vecModels) {
                                vecModels.forEach((model): void => {
                                    const modelInfo = this._modelsInLODGroup.get(model);
                                    if (modelInfo && model.node && model.node.active) {
                                        modelInfo.set(camera, true);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }
    }

    isLodModelCulled (camera: Camera, model: Model): boolean {
        const modelInfo = this._modelsInLODGroup.get(model);
        if (!modelInfo) {
            return false;
        }

        return !modelInfo.has(camera);
    }

    clearCache (): void {
        this._levelModels.clear();
        this._modelsInLODGroup.clear();
        this._lodStateInCamera.clear();
        this._newAddedLodGroupVec.length = 0;
    }

    private isLodGroupVisibleByCamera (lodGroup: LODGroup, camera: Camera): boolean {
        const layer = lodGroup.node.layer;
        return (camera.visibility & layer) === layer;
    }

    private _renderScene: RenderScene = null!;

    /**
     * @zh LOD使用的model集合以及每个model当前能被看到的相机列表；包含每个LODGroup的每一级LOD
     * @en The set of models used by the LOD and the list of cameras that each models can currently be seen,
     *  contains each level of LOD for each LODGroup.
     */
    private _modelsInLODGroup: Map<Model, Map<Camera, boolean>> = new Map<Model, Map<Camera, boolean>>();

    /**
      * @zh 指定相机下，LODGroup使用哪一级的LOD
      * @en Specify which level of LOD is used by the LODGroup under the camera.
      */
    private _lodStateInCamera: Map<Camera, Map<LODGroup, LODInfo>> = new Map<Camera, Map<LODGroup, LODInfo>>();

    /**
      * @zh 上一帧添加的lodgroup
      * @en The lodgroup added in the previous frame.
      */
    private _newAddedLodGroupVec: Array<LODGroup> = new Array<LODGroup>();

    private _levelModels: Map<LODGroup, Map<number, Array<Model>>> = new Map<LODGroup, Map<number, Array<Model>>>();
}
