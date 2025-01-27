import { DEBUG } from 'internal:constants';
import { Vec3, RecyclePool, assert } from '../../core';
import { Frustum, intersect, AABB } from '../../core/geometry';
import { CommandBuffer, Device, Buffer, BufferInfo, BufferViewInfo, MemoryUsageBit, BufferUsageBit } from '../../gfx';
import { BatchingSchemes, RenderScene } from '../../render-scene';
import { CSMLevel, Camera, DirectionalLight, Light, LightType, Model, PointLight, ProbeType,
    RangedDirectionalLight,
    ReflectionProbe, SkyBoxFlagValue, ShadowType, Shadows, SphereLight, SpotLight } from '../../render-scene/scene';
import { Layers, Node } from '../../scene-graph';
import { PipelineSceneData } from '../pipeline-scene-data';
import { bool, AlignUp, SetLightUBO, hashCombineKey } from './define';
import { LayoutGraphData } from './layout-graph';
import { CullingFlags, RenderGraph, RenderGraphValue, SceneData, RenderQueue as RenderQueue0 } from './render-graph';
import { SceneFlags } from './types';
import { RenderQueue, RenderQueueQuery, instancePool } from './web-pipeline-types';
import { getUniformBlockSize } from './layout-graph-utils';
import { WebProgramLibrary } from './web-program-library';

class CullingPools {
    frustumCullingKeyRecycle = new RecyclePool(() => new FrustumCullingKey(), 8);
    frustumCullingsRecycle = new RecyclePool(() => new FrustumCulling(), 8);
    lightBoundsCullingRecycle = new RecyclePool(() => new LightBoundsCulling(), 8);
    lightBoundsCullingResultRecycle = new RecyclePool(() => new LightBoundsCullingResult(), 8);
    lightBoundsCullingKeyRecycle = new RecyclePool(() => new LightBoundsCullingKey(), 8);
    renderQueueRecycle = new RecyclePool(() => new RenderQueue(), 8);
    renderQueueQueryRecycle = new RecyclePool(() => new RenderQueueQuery(), 8);
}
const REFLECTION_PROBE_DEFAULT_MASK = Layers.makeMaskExclude([Layers.BitMask.UI_2D, Layers.BitMask.UI_3D,
    Layers.BitMask.GIZMOS, Layers.BitMask.EDITOR,
    Layers.BitMask.SCENE_GIZMO, Layers.BitMask.PROFILER]);
const objIdMap: WeakMap<object, number> = new WeakMap();
let cullingKeys: string = '';
let objectCount: number = 0;
function objectID (claze: object): number {
    if (!objIdMap.has(claze)) objIdMap.set(claze, ++objectCount);
    return objIdMap.get(claze)!;
}
function computeCullingKey (
    sceneData: SceneData,
    castShadows: boolean,
    refId: number = -1,
): string {
    cullingKeys = '';
    const camera = sceneData.camera!;
    const light = sceneData.light.light!;
    const lightLevel = sceneData.light.level;
    const reflectProbe = sceneData.light.probe!;
    const shadeLight = sceneData.shadingLight;
    cullingKeys += hashCombineKey(camera ? objectID(camera) : 0);
    cullingKeys += hashCombineKey(reflectProbe ? objectID(reflectProbe) : 0);
    cullingKeys += hashCombineKey((refId === -1 && light) ? objectID(light) : 0);
    cullingKeys += hashCombineKey((refId !== -1 && shadeLight) ? objectID(shadeLight) : 0);
    cullingKeys += hashCombineKey(refId === -1 ? lightLevel : 0);
    cullingKeys += hashCombineKey(castShadows ? 1 : 0);
    cullingKeys += hashCombineKey(refId);
    return cullingKeys;
}

class FrustumCullingKey {
    sceneData: SceneData | null = null;
    castShadows = false;
    constructor (sceneData: SceneData | null = null, castShadows: boolean = false) {
        this.sceneData = sceneData;
        this.castShadows = castShadows;
    }
    update (sceneData: SceneData, castShadows: boolean): void {
        this.sceneData = sceneData;
        this.castShadows = castShadows;
    }
}

class LightBoundsCullingKey {
    sceneData: SceneData | null = null;
    frustumCullingID: FrustumCullingID = -1;
    constructor (sceneData: SceneData | null = null, frustumCullingID: FrustumCullingID = -1) {
        this.sceneData = sceneData;
        this.frustumCullingID = frustumCullingID;
    }
    update (sceneData: SceneData | null = null, frustumCullingID: FrustumCullingID = -1): void {
        this.sceneData = sceneData;
        this.frustumCullingID = frustumCullingID;
    }
}

class LightBoundsCulling {
    resultKeyIndex: Map<string, LightBoundsCullingKey> = new Map<string, LightBoundsCullingKey>();
    resultIndex: Map<string, LightBoundsCullingID> = new Map<string, LightBoundsCullingID>();
    update (): void {
        this.resultIndex.clear();
        this.resultKeyIndex.clear();
    }
}

class LightBoundsCullingResult {
    instances: Model[] = [];
    lightByteOffset: number = 0xFFFFFFFF;
    update (): LightBoundsCullingResult {
        this.instances.length = 0;
        this.lightByteOffset = 0xFFFFFFFF;
        return this;
    }
}

type FrustumCullingID = number;
type LightBoundsCullingID = number;
type RenderQueueID = number;

function makeRenderQueueKey (
    frustumCulledResultID: FrustumCullingID,
    lightBoundsCulledResultID: LightBoundsCullingID,
    queueLayoutID: RenderQueueID,
): string {
    return `${frustumCulledResultID}-${lightBoundsCulledResultID}-${queueLayoutID}`;
}

function extractRenderQueueKey (key: string): number[] {
    const keys = key.split('-');
    return [parseInt(keys[0]), parseInt(keys[1]), parseInt(keys[2])];
}

let pSceneData: PipelineSceneData;

class FrustumCulling {
    // key: hash val
    resultIndex: Map<string, FrustumCullingID> = new Map<string, FrustumCullingID>();
    resultKeyIndex: Map<string, FrustumCullingKey> = new Map<string, FrustumCullingKey>();
    update (): void {
        this.resultIndex.clear();
        this.resultKeyIndex.clear();
    }
}

function isNodeVisible (node: Node, visibility: number): boolean {
    return node && ((visibility & node.layer) === node.layer);
}

function isModelVisible (model: Model, visibility: number): boolean {
    return !!(visibility & model.visFlags);
}

function isVisible (model: Model, visibility: number): boolean {
    return isNodeVisible(model.node, visibility) || isModelVisible(model, visibility);
}

function isReflectProbeMask (model: Model): boolean {
    return bool((model.node.layer & REFLECTION_PROBE_DEFAULT_MASK) === model.node.layer || (REFLECTION_PROBE_DEFAULT_MASK & model.visFlags));
}

const transWorldBounds = new AABB();
function isFrustumVisible (model: Model, frustum: Readonly<Frustum>, castShadow: boolean): boolean {
    const modelWorldBounds = model.worldBounds!;
    const shadows = pSceneData.shadows;
    if (castShadow && shadows.type === ShadowType.Planar) {
        AABB.transform(transWorldBounds, modelWorldBounds, shadows.matLight);
        return !intersect.aabbFrustum(transWorldBounds, frustum);
    }
    return !intersect.aabbFrustum(modelWorldBounds, frustum);
}

function isIntersectAABB (lAABB: AABB, rAABB: AABB): boolean {
    return !intersect.aabbWithAABB(lAABB, rAABB);
}

function sceneCulling (
    scene: RenderScene,
    camera: Camera,
    camOrLightFrustum: Readonly<Frustum>,
    castShadow: boolean,
    probe: ReflectionProbe | null,
    models: Array<Model>,
): void {
    const skybox = pSceneData.skybox;
    const skyboxModel = skybox.model;
    const visibility = camera.visibility;
    const camSkyboxFlag = camera.clearFlag & SkyBoxFlagValue.VALUE;
    if (!castShadow && skybox && skybox.enabled && skyboxModel && camSkyboxFlag) {
        models.push(skyboxModel);
    }

    for (const model of scene.models) {
        if (!model.enabled || !model.node || (castShadow && !model.castShadow)) {
            continue;
        }
        if (scene.isCulledByLod(camera, model)) {
            continue;
        }
        const wBounds = model.worldBounds;
        if (!probe) {
            if (!isVisible(model, visibility)) {
                continue;
            }
            // frustum culling
            if (wBounds && isFrustumVisible(model, camOrLightFrustum, castShadow)) {
                continue;
            }
            models.push(model);
        } else if (probe.probeType === ProbeType.CUBE) {
            if (!isVisible(model, visibility)) {
                continue;
            }
            if (wBounds && isIntersectAABB(wBounds, probe.boundingBox!)) {
                continue;
            }
            models.push(model);
        } else if (isReflectProbeMask(model)) {
            models.push(model);
        }
    }
}

const _tempVec3 = new Vec3();
function computeSortingDepth (camera: Camera, model: Model): number {
    let depth = 0;
    if (model.node) {
        Vec3.subtract(_tempVec3, model.worldBounds ? model.worldBounds.center : model.node.worldPosition, camera.position);
        depth = Vec3.dot(_tempVec3, camera.forward);
    }
    return depth;
}

function addRenderObject (
    phaseLayoutId: number,
    isDrawOpaqueOrMask: boolean,
    isDrawBlend: boolean,
    isDrawProbe: boolean,
    camera: Camera,
    model: Model,
    queue: RenderQueue,
): void {
    const probeQueue = queue.probeQueue;
    if (isDrawProbe) {
        probeQueue.addToProbeQueue(model, phaseLayoutId);
    }
    const subModels = model.subModels;
    const subModelCount = subModels.length;
    const skyboxModel = pSceneData.skybox.model;
    const depth = computeSortingDepth(camera, model);
    for (let subModelIdx = 0; subModelIdx < subModelCount; ++subModelIdx) {
        const subModel = subModels[subModelIdx];
        const passes = subModel.passes;
        const passCount = passes.length;
        const probePhase = probeQueue.probeMap.includes(subModel);
        if (probePhase) phaseLayoutId = probeQueue.defaultId;
        for (let passIdx = 0; passIdx < passCount; ++passIdx) {
            if (model === skyboxModel && !subModelIdx && !passIdx && isDrawOpaqueOrMask) {
                queue.opaqueQueue.add(model, depth, subModelIdx, passIdx);
                continue;
            }
            const pass = passes[passIdx];
            // check phase
            const phaseAllowed = phaseLayoutId === pass.phaseID;
            if (!phaseAllowed) {
                continue;
            }
            // check scene flags
            const is_blend = pass.blendState.targets[0].blend;
            const isOpaqueOrMask = !is_blend;
            if (!isDrawBlend && is_blend) {
                // skip transparent object
                continue;
            }
            if (!isDrawOpaqueOrMask && isOpaqueOrMask) {
                // skip opaque object
                continue;
            }

            // add object to queue
            if (pass.batchingScheme === BatchingSchemes.INSTANCING) {
                if (is_blend) {
                    queue.transparentInstancingQueue.add(pass, subModel, passIdx);
                } else {
                    queue.opaqueInstancingQueue.add(pass, subModel, passIdx);
                }
            } else if (is_blend) {
                queue.transparentQueue.add(model, depth, subModelIdx, passIdx);
            } else {
                queue.opaqueQueue.add(model, depth, subModelIdx, passIdx);
            }
        }
    }
}
const rangedDirLightBoundingBox = new AABB(0, 0, 0, 0.5, 0.5, 0.5);
const lightAABB = new AABB();
export class SceneCulling {
    frustumCullings: Map<RenderScene, FrustumCulling> = new Map<RenderScene, FrustumCulling>();
    frustumCullingResults: Array<Array<Model>> = [];
    lightBoundsCullings: Map<RenderScene, LightBoundsCulling> = new Map<RenderScene, LightBoundsCulling>();
    lightBoundsCullingResults: Array<LightBoundsCullingResult> = [];
    renderQueueIndex: Map<string, number> = new Map<string, RenderQueueID>();
    renderQueues: Array<RenderQueue> = [];
    renderQueueQueryIndex: Map<number, RenderQueueQuery> = new Map<number, RenderQueueQuery>();
    cullingPools = new CullingPools();
    // source id
    numFrustumCulling = 0;
    numLightBoundsCulling = 0;
    // target id
    numRenderQueues = 0;
    layoutGraph;
    renderGraph!: RenderGraph;
    enableLightCulling = true;

    readonly kFilterMask = SceneFlags.SHADOW_CASTER | SceneFlags.REFLECTION_PROBE;
    readonly kDrawMask = SceneFlags.OPAQUE | SceneFlags.MASK | SceneFlags.BLEND;
    readonly kAllMask = this.kFilterMask | this.kDrawMask;

    resetPool (): void {
        const cullingPools = this.cullingPools;
        cullingPools.frustumCullingKeyRecycle.reset();
        cullingPools.frustumCullingsRecycle.reset();
        cullingPools.lightBoundsCullingRecycle.reset();
        cullingPools.lightBoundsCullingResultRecycle.reset();
        cullingPools.lightBoundsCullingKeyRecycle.reset();
        cullingPools.renderQueueRecycle.reset();
        cullingPools.renderQueueQueryRecycle.reset();
        instancePool.reset();
    }
    clear (): void {
        this.resetPool();
        this.frustumCullings.clear();
        this.frustumCullingResults.length = 0;
        this.lightBoundsCullings.clear();
        this.lightBoundsCullingResults.length = 0;
        this.renderQueueIndex.clear();
        this.renderQueues.length = 0;
        this.renderQueueQueryIndex.clear();
        this.numLightBoundsCulling = 0;
        this.numFrustumCulling = 0;
        this.numRenderQueues = 0;
    }

    buildRenderQueues (rg: RenderGraph, lg: LayoutGraphData, pplSceneData: PipelineSceneData): void {
        this.layoutGraph = lg;
        this.renderGraph = rg;
        pSceneData = pplSceneData;
        this.collectCullingQueries(rg);
        this.batchFrustumCulling(pplSceneData);
        this.batchLightBoundsCulling();
        this.fillRenderQueues();
    }

    private getOrCreateLightBoundsCulling (sceneData: SceneData, frustumCullingID: FrustumCullingID): LightBoundsCullingID {
        if (!(sceneData.cullingFlags & CullingFlags.LIGHT_BOUNDS)) {
            return 0xFFFFFFFF; // Return an empty ID.
        }
        if (sceneData.shadingLight?.type === LightType.DIRECTIONAL) {
            return 0xFFFFFFFF;
        }
        if (!this.enableLightCulling) {
            return 0xFFFFFFFF; // Return an empty ID.
        }
        const scene = sceneData.scene!;

        let queries = this.lightBoundsCullings.get(scene);
        if (!queries) {
            const cullingQuery = this.cullingPools.lightBoundsCullingRecycle.add();
            cullingQuery.update();
            this.lightBoundsCullings.set(scene, cullingQuery);
            queries = this.lightBoundsCullings.get(scene)!;
        }
        const key = computeCullingKey(sceneData, false, frustumCullingID);
        const cullNum = queries.resultIndex.get(key);
        if (cullNum !== undefined) {
            return cullNum;
        }
        const lightBoundsCullingID: LightBoundsCullingID = this.numLightBoundsCulling++;
        if (this.numLightBoundsCulling >  this.lightBoundsCullingResults.length) {
            this.lightBoundsCullingResults.push(this.cullingPools.lightBoundsCullingResultRecycle.add().update());
        }
        queries.resultIndex.set(key, lightBoundsCullingID);
        const cullingKey = this.cullingPools.lightBoundsCullingKeyRecycle.add();
        cullingKey.update(
            sceneData,
            frustumCullingID,
        );
        queries.resultKeyIndex.set(key, cullingKey);
        return lightBoundsCullingID;
    }

    private getOrCreateFrustumCulling (sceneId: number): number {
        const sceneData: SceneData = this.renderGraph.j<SceneData>(sceneId);
        const scene = sceneData.scene!;
        let queries = this.frustumCullings.get(scene);
        if (!queries) {
            const cullingQuery = this.cullingPools.frustumCullingsRecycle.add();
            cullingQuery.update();
            this.frustumCullings.set(scene, cullingQuery);
            queries = this.frustumCullings.get(scene)!;
        }
        const castShadow: boolean = bool(sceneData.flags & SceneFlags.SHADOW_CASTER);
        const key = computeCullingKey(sceneData, castShadow);
        const cullNum = queries.resultIndex.get(key);
        if (cullNum !== undefined) {
            return cullNum;
        }
        const frustumCulledResultID: FrustumCullingID = this.numFrustumCulling++;
        if (this.numFrustumCulling >  this.frustumCullingResults.length) {
            this.frustumCullingResults.push([]);
        }
        queries.resultIndex.set(key, frustumCulledResultID);
        const cullingKey = this.cullingPools.frustumCullingKeyRecycle.add();
        cullingKey.update(
            sceneData,
            castShadow,
        );
        queries.resultKeyIndex.set(key, cullingKey);
        return frustumCulledResultID;
    }

    private getOrCreateRenderQueue (renderQueueKey: string, sceneFlags: SceneFlags, camera: Camera | null): number {
        const renderQueueID = this.renderQueueIndex.get(renderQueueKey);
        if (renderQueueID !== undefined) {
            const rq = this.renderQueues[renderQueueID];
            if (DEBUG) {
                assert(rq.camera === camera);
                assert((rq.sceneFlags & this.kFilterMask) === (sceneFlags & this.kFilterMask));
            }
            rq.sceneFlags |= sceneFlags & this.kDrawMask;
            return renderQueueID;
        }

        const targetID = this.numRenderQueues++;

        // renderQueues are not cleared, so we can reuse the space
        // this->renderQueues.size() is more like a capacity
        if (this.numRenderQueues > this.renderQueues.length) {
            const renderQueue = this.cullingPools.renderQueueRecycle.add();
            renderQueue.update();
            this.renderQueues.push(renderQueue);
        }
        const rq = this.renderQueues[targetID];

        // Update render queue index
        this.renderQueueIndex.set(renderQueueKey, targetID);

        // Update render queue
        if (DEBUG) {
            assert(rq.empty());
            assert(rq.camera === null);
            assert(rq.sceneFlags === SceneFlags.NONE);
            assert(camera !== null);
            assert(this.renderQueueIndex.size === this.numRenderQueues);
        }
        rq.camera = camera;
        rq.sceneFlags = sceneFlags & this.kAllMask;

        return targetID;
    }

    private collectCullingQueries (rg: RenderGraph): void {
        for (const v of rg.v()) {
            if (!rg.h(RenderGraphValue.Scene, v) || !rg.getValid(v)) {
                continue;
            }
            const sceneData = rg.j<SceneData>(v);
            if (!sceneData.scene) {
                continue;
            }
            const frustumCulledResultID = this.getOrCreateFrustumCulling(v);
            const lightBoundsCullingID = this.getOrCreateLightBoundsCulling(sceneData, frustumCulledResultID);

            // Get render queue phaseLayoutID
            const queueID = rg.getParent(v);
            if (DEBUG) {
                assert(queueID !== 0xFFFFFFFF);
                assert(rg.h(RenderGraphValue.Queue, queueID));
            }
            const renderQueue = rg.j<RenderQueue0>(queueID);
            const phaseLayoutID = renderQueue.phaseID;

            // Make render queue key
            const renderQueueKey = makeRenderQueueKey(
                frustumCulledResultID,
                lightBoundsCullingID,
                phaseLayoutID,
            );

            // Get or create render queue
            const renderQueueID = this.getOrCreateRenderQueue(renderQueueKey, sceneData.flags, sceneData.camera);

            // add render queue query
            const renderQueueQuery = this.cullingPools.renderQueueQueryRecycle.add();
            renderQueueQuery.update(frustumCulledResultID, lightBoundsCullingID, renderQueueID);

            // add render queue to query source
            this.renderQueueQueryIndex.set(v, renderQueueQuery);
        }
    }

    uploadInstancing (cmdBuffer: CommandBuffer): void {
        for (let queueID = 0; queueID !== this.numRenderQueues; ++queueID) {
            const queue = this.renderQueues[queueID];
            queue.opaqueInstancingQueue.uploadBuffers(cmdBuffer);
            queue.transparentInstancingQueue.uploadBuffers(cmdBuffer);
        }
    }

    private _getPhaseIdFromScene (scene: number): number {
        const rg: RenderGraph = this.renderGraph;
        const renderQueueId = rg.getParent(scene);
        const graphRenderQueue = rg.j<RenderQueue0>(renderQueueId);
        return graphRenderQueue.phaseID;
    }

    private getBuiltinShadowFrustum (pplSceneData: PipelineSceneData, camera: Camera, mainLight: DirectionalLight, level: number): Readonly<Frustum> {
        const csmLayers = pplSceneData.csmLayers;
        const csmLevel = mainLight.csmLevel;
        let frustum: Readonly<Frustum>;
        const shadows = pplSceneData.shadows;
        if (shadows.type === ShadowType.Planar) {
            return camera.frustum;
        }
        if (shadows.enabled && shadows.type === ShadowType.ShadowMap && mainLight && mainLight.node) {
            // pplSceneData.updateShadowUBORange(UBOShadowEnum.SHADOW_COLOR_OFFSET, shadows.shadowColor);
            csmLayers.update(pplSceneData, camera);
        }

        if (mainLight.shadowFixedArea || csmLevel === CSMLevel.LEVEL_1) {
            return csmLayers.specialLayer.validFrustum;
        }
        return csmLayers.layers[level].validFrustum;
    }

    private batchFrustumCulling (pplSceneData: PipelineSceneData): void {
        for (const [scene, queries] of this.frustumCullings) {
            for (const [key, frustomCulledResultID] of queries.resultIndex) {
                const cullingKey = queries.resultKeyIndex.get(key)!;
                const sceneData = cullingKey.sceneData!;
                const light = sceneData.light.light;
                const level = sceneData.light.level;
                const castShadow = cullingKey.castShadows;
                const probe = sceneData.light.probe;
                const camera = probe ? probe.camera : sceneData.camera;
                const models = this.frustumCullingResults[frustomCulledResultID];
                if (probe) {
                    sceneCulling(scene, camera!, camera!.frustum, castShadow, probe, models);
                    continue;
                }
                if (light) {
                    switch (light.type) {
                    case LightType.SPOT:
                        sceneCulling(scene, camera!, (light as SpotLight).frustum, castShadow, null, models);
                        break;
                    case LightType.DIRECTIONAL: {
                        const frustum = this.getBuiltinShadowFrustum(pplSceneData, camera!, light as DirectionalLight, level);
                        sceneCulling(scene, camera!, frustum, castShadow, null, models);
                    }
                        break;
                    default:
                    }
                } else {
                    sceneCulling(scene, camera!, camera!.frustum, castShadow, null, models);
                }
            }
        }
    }

    private executeSphereLightCulling (light: SphereLight, frustumCullingResult: Array<Model>, lightBoundsCullingResult: Array<Model>): void {
        const lightAABB = light.aabb;
        for (const model of frustumCullingResult) {
            const modelBounds = model.worldBounds;
            if (!modelBounds || intersect.aabbWithAABB(modelBounds, lightAABB)) {
                lightBoundsCullingResult.push(model);
            }
        }
    }

    private executeSpotLightCulling (light: SpotLight, frustumCullingResult: Array<Model>, lightBoundsCullingResult: Array<Model>): void {
        const lightAABB = light.aabb;
        const lightFrustum: Frustum = light.frustum;
        for (const model of frustumCullingResult) {
            const modelBounds = model.worldBounds;
            if (!modelBounds || (intersect.aabbWithAABB(lightAABB, modelBounds) && intersect.aabbFrustum(modelBounds, lightFrustum))) {
                lightBoundsCullingResult.push(model);
            }
        }
    }

    private executePointLightCulling (light: PointLight, frustumCullingResult: Array<Model>, lightBoundsCullingResult: Array<Model>): void {
        const lightAABB = light.aabb;
        for (const model of frustumCullingResult) {
            const modelBounds = model.worldBounds;
            if (!modelBounds || intersect.aabbWithAABB(lightAABB, modelBounds)) {
                lightBoundsCullingResult.push(model);
            }
        }
    }

    private executeRangedDirectionalLightCulling (
        light: RangedDirectionalLight,
        frustumCullingResult: Array<Model>,
        lightBoundsCullingResult: Array<Model>,
    ): void {
        rangedDirLightBoundingBox.transform(light.node!.worldMatrix, null, null, null, lightAABB);
        for (const model of frustumCullingResult) {
            const modelBounds = model.worldBounds;
            if (!modelBounds || intersect.aabbWithAABB(lightAABB, modelBounds)) {
                lightBoundsCullingResult.push(model);
            }
        }
    }

    private batchLightBoundsCulling (): void {
        for (const [scene, queries] of this.lightBoundsCullings) {
            for (const [key, cullingID] of queries.resultIndex) {
                const cullingKey = queries.resultKeyIndex.get(key)!;
                const sceneData = cullingKey.sceneData!;
                const frustumCullingID = cullingKey.frustumCullingID;
                const frustumCullingResult = this.frustumCullingResults[frustumCullingID];
                const lightBoundsCullingResult = this.lightBoundsCullingResults[cullingID];
                switch (sceneData.shadingLight!.type) {
                case LightType.SPHERE:
                    {
                        const light = sceneData.shadingLight as SphereLight;
                        this.executeSphereLightCulling(light, frustumCullingResult, lightBoundsCullingResult.instances);
                    }
                    break;
                case LightType.SPOT:
                    {
                        const light = sceneData.shadingLight as SpotLight;
                        this.executeSpotLightCulling(light, frustumCullingResult, lightBoundsCullingResult.instances);
                    }
                    break;
                case LightType.POINT:
                    {
                        const light = sceneData.shadingLight as PointLight;
                        this.executePointLightCulling(light, frustumCullingResult, lightBoundsCullingResult.instances);
                    }
                    break;
                case LightType.RANGED_DIRECTIONAL:
                    {
                        const light = sceneData.shadingLight as RangedDirectionalLight;
                        this.executeRangedDirectionalLightCulling(light, frustumCullingResult, lightBoundsCullingResult.instances);
                    }
                    break;
                case LightType.DIRECTIONAL:
                case LightType.UNKNOWN:
                default:
                }
            }
        }
    }

    private _getModelsByCullingResults (lightBoundsCullingID, frustomCulledResultID): Array<Model> {
        // is culled by light bounds
        if (lightBoundsCullingID !== 0xFFFFFFFF) {
            if (lightBoundsCullingID < this.lightBoundsCullingResults.length) {
                return this.lightBoundsCullingResults[lightBoundsCullingID].instances;
            } else {
                return [];
            }
        }
        // not culled by light bounds
        if (frustomCulledResultID < this.frustumCullingResults.length) {
            return this.frustumCullingResults[frustomCulledResultID];
        } else {
            return [];
        }
    }

    private fillRenderQueues (): void {
        for (const [key, targetID] of this.renderQueueIndex) {
            // render queue target
            const renderQueue = this.renderQueues[targetID];
            if (DEBUG) {
                assert(targetID < this.renderQueues.length);
                assert(renderQueue.empty());
            }

            const [frustomCulledResultID, lightBoundsCullingID, phaseLayoutID] = extractRenderQueueKey(key);

            // check scene flags
            const isDrawBlend: boolean = bool(renderQueue.sceneFlags & SceneFlags.BLEND);
            const isDrawOpaqueOrMask: boolean = bool(renderQueue.sceneFlags & (SceneFlags.OPAQUE | SceneFlags.MASK));
            const isDrawShadowCaster: boolean = bool(renderQueue.sceneFlags & SceneFlags.SHADOW_CASTER);
            const isDrawProbe: boolean = bool(renderQueue.sceneFlags & SceneFlags.REFLECTION_PROBE);

            if (!isDrawShadowCaster && !isDrawBlend && !isDrawOpaqueOrMask && !isDrawProbe) {
                // nothing to draw
                continue;
            }

            // culling source
            const sourceModels = this._getModelsByCullingResults(lightBoundsCullingID, frustomCulledResultID);

            // skybox
            const camera = renderQueue.camera!;

            // fill render queue
            for (const model of sourceModels) {
                addRenderObject(
                    phaseLayoutID,
                    isDrawOpaqueOrMask,
                    isDrawBlend,
                    isDrawProbe,
                    camera,
                    model,
                    renderQueue,
                );
            }
            // post-processing
            renderQueue.sort();
        }
    }
}

export class LightResource {
    private cpuBuffer!: Float32Array;
    private programLibrary?: WebProgramLibrary;
    private device: Device | null = null;
    private elementSize: number = 0;
    private maxNumLights: number = 16;
    private binding: number = 0xFFFFFFFF;
    private resized: boolean = false;
    private lightBuffer?: Buffer;
    private firstLightBufferView: Buffer | null = null;
    private readonly lights: Array<Light> = [];
    private readonly lightIndex = new Map<Light, number>();

    init (programLib: WebProgramLibrary, deviceIn: Device, maxNumLights: number): void {
        this.device = deviceIn;
        this.programLibrary = programLib;

        const instanceLayout = this.programLibrary.localLayoutData;
        const attrID: number = programLib.layoutGraph.attributeIndex.get('CCForwardLight')!;
        const uniformBlock = instanceLayout.uniformBlocks.get(attrID);

        this.elementSize = AlignUp(
            getUniformBlockSize(uniformBlock!.members),
            this.device.capabilities.uboOffsetAlignment,
        );
        this.maxNumLights = maxNumLights;
        this.binding = programLib.localLayoutData.bindingMap.get(attrID)!;

        const bufferSize = this.elementSize * this.maxNumLights;

        this.lightBuffer = this.device.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            bufferSize,
            this.elementSize,
        ));
        this.firstLightBufferView = this.device.createBuffer(new BufferViewInfo(
            this.lightBuffer,
            0,
            this.elementSize,
        ));

        this.cpuBuffer = new Float32Array(bufferSize / Float32Array.BYTES_PER_ELEMENT);
        this.resized = true;
    }

    buildLights (sceneCulling: SceneCulling, bHDR: boolean, shadowInfo: Shadows | null): void {
        // Build light buffer
        for (const [scene, lightBoundsCullings] of sceneCulling.lightBoundsCullings) {
            for (const [key, lightBoundsCullingID] of lightBoundsCullings.resultIndex) {
                const lightBoundsCulling = lightBoundsCullings.resultKeyIndex.get(key)!;
                const sceneData = lightBoundsCulling.sceneData!;
                let exposure: number = 1.0;
                if (sceneData.camera) {
                    exposure = sceneData.camera.exposure;
                } else if (sceneData.light.probe && sceneData.light.probe.camera) {
                    exposure = sceneData.light.probe.camera.exposure;
                } else {
                    throw new Error('Unexpected situation: No camera or probe found.');
                }
                const lightByteOffset: number = this.addLight(
                    sceneData.shadingLight!,
                    bHDR,
                    exposure,
                    shadowInfo,
                );

                // Save light byte offset for each light bounds culling
                const result: LightBoundsCullingResult = sceneCulling.lightBoundsCullingResults[lightBoundsCullingID];
                result.lightByteOffset = lightByteOffset;
            }
        }

        // Assign light byte offset to each queue
        for (const [sceneID, query] of sceneCulling.renderQueueQueryIndex) {
            if (query.lightBoundsCulledResultID === 0xFFFFFFFF) {
                continue;
            }
            const lightByteOffset: number = sceneCulling.lightBoundsCullingResults[query.lightBoundsCulledResultID].lightByteOffset;

            sceneCulling.renderQueues[query.renderQueueTarget].lightByteOffset = lightByteOffset;
        }
    }

    tryUpdateRenderSceneLocalDescriptorSet (sceneCulling: SceneCulling): void {
        if (!sceneCulling.lightBoundsCullings.size) {
            return;
        }

        for (const [scene, culling] of sceneCulling.frustumCullings) {
            for (const model of scene.models) {
                if (!model) {
                    throw new Error('Unexpected null model.');
                }
                for (const submodel of model.subModels) {
                    const set = submodel.descriptorSet;
                    const prev = set.getBuffer(this.binding);
                    if (this.resized || prev !== this.firstLightBufferView) {
                        set.bindBuffer(this.binding, this.firstLightBufferView!);
                        set.update();
                    }
                }
            }
        }
        this.resized = false;
    }

    clear (): void {
        this.cpuBuffer.fill(0);
        this.lights.length = 0;
        this.lightIndex.clear();
    }

    addLight (light: Light, bHDR: boolean, exposure: number, shadowInfo: Shadows | null): number {
        // Already added
        const existingLightID = this.lightIndex.get(light);
        if (existingLightID !== undefined) {
            return existingLightID;
        }

        // Resize buffer if needed
        if (this.lights.length === this.maxNumLights) {
            this.resized = true;
            this.maxNumLights *= 2;
            const bufferSize = this.elementSize * this.maxNumLights;
            this.lightBuffer!.resize(bufferSize);
            this.firstLightBufferView = this.device!.createBuffer(new BufferViewInfo(
                this.lightBuffer,
                0,
                this.elementSize,
            ));
            const prevCpuBuffer = this.cpuBuffer;
            this.cpuBuffer = new Float32Array(bufferSize / Float32Array.BYTES_PER_ELEMENT);
            this.cpuBuffer.set(prevCpuBuffer);
        }

        // Add light
        const lightID = this.lights.length;
        this.lights[lightID] = light;
        this.lightIndex.set(light, lightID);

        // Update buffer
        const offset = this.elementSize / Float32Array.BYTES_PER_ELEMENT * lightID;
        SetLightUBO(light, bHDR, exposure, shadowInfo, this.cpuBuffer, offset, this.elementSize);

        return lightID * this.elementSize;
    }

    buildLightBuffer (cmdBuffer: CommandBuffer): void {
        cmdBuffer.updateBuffer(
            this.lightBuffer!,
            this.cpuBuffer,
            (this.lights.length * this.elementSize) / Float32Array.BYTES_PER_ELEMENT,
        );
    }
}
