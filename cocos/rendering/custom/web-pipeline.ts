/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/

/* eslint-disable max-len */
import { systemInfo } from 'pal/system-info';
import { DEBUG, EDITOR } from 'internal:constants';
import { DescriptorSetLayout, Device, Feature, Format, FormatFeatureBit, Sampler, Swapchain, Texture, ClearFlagBit, DescriptorSet, deviceManager, Viewport, API, CommandBuffer, Type, SamplerInfo, Filter, Address, DescriptorSetInfo, LoadOp, StoreOp, ShaderStageFlagBit, BufferInfo, TextureInfo, TextureType, ResolveMode, SampleCount, Color, ComparisonFunc } from '../../gfx';
import { Vec4, macro, cclegacy, RecyclePool } from '../../core';
import { AccessType, AttachmentType, CopyPair, LightInfo, LightingMode, MovePair, QueueHint, RenderCommonObjectPool, ResolvePair, ResourceDimension, ResourceFlags, ResourceResidency, SceneFlags, UpdateFrequency, UploadPair } from './types';
import { ComputePass, CopyPass, MovePass, RasterPass, RasterSubpass, RenderData, RenderGraph, RenderGraphComponent, RenderGraphValue, RenderQueue, RenderSwapchain, ResourceDesc, ResourceGraph, ResourceGraphValue, ResourceStates, ResourceTraits, SceneData, Subpass, PersistentBuffer, RenderGraphObjectPool, CullingFlags, ManagedResource, ManagedBuffer } from './render-graph';
import { ComputePassBuilder, ComputeQueueBuilder, BasicPipeline, RenderQueueBuilder, RenderSubpassBuilder, PipelineType, BasicRenderPassBuilder, PipelineCapabilities, BasicMultisampleRenderPassBuilder, Setter, SceneBuilder } from './pipeline';
import { PipelineSceneData } from '../pipeline-scene-data';
import { Model, Camera, PCFType, ProbeType } from '../../render-scene/scene';
import { Light, LightType } from '../../render-scene/scene/light';
import { DescriptorSetData, LayoutGraphData } from './layout-graph';
import { Executor } from './executor';
import { RenderWindow } from '../../render-scene/core/render-window';
import { MacroRecord, RenderScene } from '../../render-scene';
import { GlobalDSManager } from '../global-descriptor-set-manager';
import { getDefaultShadowTexture, supportsR32FloatTexture, supportsRGBA16HalfFloatTexture, UBOSkinning } from '../define';
import { OS } from '../../../pal/system-info/enum-type';
import { Compiler } from './compiler';
import { GeometryRenderer } from '../geometry-renderer';
import { Material } from '../../asset/assets';
import { decideProfilerCamera } from '../pipeline-funcs';
import { DebugViewCompositeType } from '../debug-view';
import { buildReflectionProbePass, genHashValue } from './define';
import { createGfxDescriptorSetsAndPipelines } from './layout-graph-utils';
import { Root } from '../../root';
import { Scene } from '../../scene-graph';
import { Director } from '../../game';
import { ReflectionProbeManager } from '../../3d';
import { legacyCC } from '../../core/global-exports';
import { WebSetter, setCameraUBOValues, setShadowUBOLightView, setShadowUBOView, setTextureUBOView } from './web-pipeline-types';

const _uboVec = new Vec4();
const _samplerPointInfo = new SamplerInfo(
    Filter.POINT,
    Filter.POINT,
    Filter.NONE,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
);

class PipelinePool {
    renderData = new RenderData();
    layoutGraph = new LayoutGraphData();
    rg = new RenderGraph();
    vertId = -1;
    sceneData = new SceneData();
    resourceGraph = new ResourceGraph();
    computePass = new ComputePass();
    rasterPass = new RasterPass();
    rasterSubpass = new RasterSubpass();
    renderQueue = new RenderQueue();
    sceneBuilder = new RecyclePool<WebSceneBuilder>(() => new WebSceneBuilder(this.renderData, this.layoutGraph, this.rg, this.vertId, this.sceneData), 16);
    renderPassBuilder = new RecyclePool<WebRenderPassBuilder>(() => new WebRenderPassBuilder(this.renderData, this.rg, this.layoutGraph, this.resourceGraph, this.vertId, this.rasterPass, this.getPipelineSceneData()), 16);
    computeQueueBuilder = new RecyclePool<WebComputeQueueBuilder>(() => new WebComputeQueueBuilder(this.renderData, this.rg, this.layoutGraph, this.vertId, this.renderQueue, this.getPipelineSceneData()), 16);
    renderQueueBuilder = new RecyclePool<WebRenderQueueBuilder>(() => new WebRenderQueueBuilder(this.renderData, this.rg, this.layoutGraph, this.vertId, this.renderQueue, this.getPipelineSceneData()), 16);
    renderSubpassBuilder = new RecyclePool<WebRenderSubpassBuilder>(() => new WebRenderSubpassBuilder(this.renderData, this.rg, this.layoutGraph, this.vertId, this.rasterSubpass, this.getPipelineSceneData()), 16);
    computePassBuilder = new RecyclePool<WebComputePassBuilder>(() => new WebComputePassBuilder(this.renderData, this.rg, this.layoutGraph, this.resourceGraph, this.vertId, this.computePass, this.getPipelineSceneData()), 16);
    samplerInfo = new RecyclePool<SamplerInfo>(() => new SamplerInfo(), 16);
    color = new RecyclePool<Color>(() => new Color(), 16);
    renderCommonObjectPool = new RenderCommonObjectPool();
    renderGraphPool = new RenderGraphObjectPool(this.renderCommonObjectPool);
    viewport = new RecyclePool(() => new Viewport(), 16);

    getPipelineSceneData (): PipelineSceneData {
        return (legacyCC.director.root as Root).pipeline.pipelineSceneData;
    }

    createColor (
        x: number = 0,
        y: number = 0,
        z: number = 0,
        w: number = 0,
    ): Color {
        const color = this.color.add();
        color.set(x, y, z, w);
        return color;
    }
    createSamplerInfo (
        minFilter: Filter = Filter.LINEAR,
        magFilter: Filter = Filter.LINEAR,
        mipFilter: Filter = Filter.NONE,
        addressU: Address = Address.WRAP,
        addressV: Address = Address.WRAP,
        addressW: Address = Address.WRAP,
        maxAnisotropy: number = 0,
        cmpFunc: ComparisonFunc = ComparisonFunc.ALWAYS,
    ): SamplerInfo {
        const samplerInfo = this.samplerInfo.add();
        samplerInfo.minFilter = minFilter;
        samplerInfo.magFilter = magFilter;
        samplerInfo.mipFilter = mipFilter;
        samplerInfo.addressU = addressU;
        samplerInfo.addressV = addressV;
        samplerInfo.addressW = addressW;
        samplerInfo.maxAnisotropy = maxAnisotropy;
        samplerInfo.cmpFunc = cmpFunc;
        return samplerInfo;
    }
    reset (): void {
        this.sceneBuilder.reset();
        this.renderPassBuilder.reset();
        this.computePassBuilder.reset();
        this.computeQueueBuilder.reset();
        this.renderCommonObjectPool.reset();
        this.renderGraphPool.reset();
        this.viewport.reset();
        this.samplerInfo.reset();
        this.color.reset();
        this.renderQueueBuilder.reset();
        this.renderSubpassBuilder.reset();
    }
}
let pipelinePool: PipelinePool;
let renderGraphPool: RenderGraphObjectPool;

function setComputeConstants (setter: WebSetter, layoutName: string): void {
    const director = cclegacy.director;
    const root = director.root;
    const pipeline = root.pipeline as WebPipeline;
    // setter.addConstant('CCConst', layoutName);
}

function getTextureType (dimension: ResourceDimension, arraySize: number): TextureType {
    switch (dimension) {
    case ResourceDimension.TEXTURE1D:
        return arraySize > 1 ? TextureType.TEX1D_ARRAY : TextureType.TEX1D;
    case ResourceDimension.TEXTURE2D:
        return arraySize > 1 ? TextureType.TEX2D_ARRAY : TextureType.TEX2D;
    case ResourceDimension.TEXTURE3D:
        return TextureType.TEX3D;
    case ResourceDimension.BUFFER:
        return TextureType.TEX2D;
    default:
        break;
    }
    return TextureType.TEX2D;
}

function getResourceDimension (type: TextureType): ResourceDimension {
    switch (type) {
    case TextureType.TEX1D:
    case TextureType.TEX1D_ARRAY:
        return ResourceDimension.TEXTURE1D;
    case TextureType.TEX2D:
    case TextureType.TEX2D_ARRAY:
    case TextureType.CUBE:
        return ResourceDimension.TEXTURE2D;
    case TextureType.TEX3D:
        return ResourceDimension.TEXTURE3D;
    default:
        break;
    }
    return ResourceDimension.TEXTURE2D;
}

export class WebSceneBuilder extends WebSetter implements SceneBuilder {
    constructor (
        data: RenderData,
        layoutGraph: LayoutGraphData,
        rg: RenderGraph,
        sceneId: number,
        scene: SceneData,
    ) {
        super(data, layoutGraph);
        this._renderGraph = rg;
        this._scene = scene;
        this._vertID = sceneId;
    }
    update (
        data: RenderData,
        layoutGraph: LayoutGraphData,
        rg: RenderGraph,
        sceneId: number,
        scene: SceneData,
    ): void {
        this._data = data;
        this._lg = layoutGraph;
        this._renderGraph = rg;
        this._scene = scene;
        this._vertID = sceneId;
    }

    useLightFrustum (light: Light, csmLevel = 0, optCamera: Camera | undefined = undefined): void {
        this._scene.light.light = light;
        this._scene.light.level = csmLevel;
        this._scene.light.culledByLight = true;
        if (optCamera) {
            this._scene.camera = optCamera;
        }
        if (this._scene.flags & SceneFlags.NON_BUILTIN) {
            return;
        }
        const queueId = this._renderGraph.getParent(this._vertID);
        const passId = this._renderGraph.getParent(queueId);
        const layoutName = this._renderGraph.getLayout(passId);
        setShadowUBOLightView(this, this._scene.camera, light, csmLevel, layoutName);
    }
    private _renderGraph: RenderGraph;
    private _scene: SceneData;
}

export class WebRenderQueueBuilder extends WebSetter implements RenderQueueBuilder {
    constructor (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, vertID: number, queue: RenderQueue, pipeline: PipelineSceneData) {
        super(data, layoutGraph);
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._queue = queue;
        this._pipeline = pipeline;
    }
    update (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, vertID: number, queue: RenderQueue, pipeline: PipelineSceneData): void {
        this._data = data;
        this._lg = layoutGraph;
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._queue = queue;
        this._pipeline = pipeline;
    }

    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }

    addSceneOfCamera (camera: Camera, light: LightInfo, sceneFlags = SceneFlags.NONE, name = 'Camera'): void {
        const lightTarget = light.light;
        const sceneData = renderGraphPool.createSceneData(
            camera.scene,
            camera,
            sceneFlags,
            lightTarget && !(sceneFlags & SceneFlags.SHADOW_CASTER) ? CullingFlags.CAMERA_FRUSTUM | CullingFlags.LIGHT_BOUNDS : CullingFlags.CAMERA_FRUSTUM,
            lightTarget,
        );
        this._renderGraph.addVertex<RenderGraphValue.Scene>(RenderGraphValue.Scene, sceneData, name, '', renderGraphPool.createRenderData(), !DEBUG, this._vertID);
        const layoutName = this.getParentLayout();
        const scene: Scene = cclegacy.director.getScene();
        setCameraUBOValues(
            this,
            camera,
            this._pipeline,
            camera.scene || (scene ? scene.renderScene : null),
            layoutName,
        );
        if (sceneFlags & SceneFlags.SHADOW_CASTER || (lightTarget && lightTarget.type !== LightType.DIRECTIONAL)) {
            setShadowUBOLightView(this, camera, lightTarget!, light.level, layoutName);
        } else {
            setShadowUBOView(this, camera, layoutName);
        }
    }
    addScene (camera: Camera, sceneFlags = SceneFlags.NONE, light: Light | undefined = undefined, scene: RenderScene | undefined = undefined): SceneBuilder {
        const sceneData = renderGraphPool.createSceneData(
            scene || camera.scene,
            camera,
            sceneFlags,
            light && !(sceneFlags & SceneFlags.SHADOW_CASTER) ? CullingFlags.CAMERA_FRUSTUM | CullingFlags.LIGHT_BOUNDS : CullingFlags.CAMERA_FRUSTUM,
            light,
        );
        const renderData = renderGraphPool.createRenderData();
        const sceneId = this._renderGraph.addVertex<RenderGraphValue.Scene>(RenderGraphValue.Scene, sceneData, 'Scene', '', renderData, !DEBUG, this._vertID);
        if (!(sceneFlags & SceneFlags.NON_BUILTIN)) {
            const layoutName = this.getParentLayout();
            setCameraUBOValues(
                this,
                camera,
                this._pipeline,
                scene || camera.scene,
                layoutName,
            );
            if (light && light.type !== LightType.DIRECTIONAL) setShadowUBOLightView(this, camera, light, 0, layoutName);
            else if (!(sceneFlags & SceneFlags.SHADOW_CASTER)) setShadowUBOView(this, camera, layoutName);
        }
        const sceneBuilder = pipelinePool.sceneBuilder.add();
        sceneBuilder.update(renderData, this._lg, this._renderGraph, sceneId, sceneData);
        return sceneBuilder;
    }
    addFullscreenQuad (material: Material, passID: number, sceneFlags = SceneFlags.NONE, name = 'Quad'): void {
        this._renderGraph.addVertex<RenderGraphValue.Blit>(
            RenderGraphValue.Blit,
            renderGraphPool.createBlit(material, passID, sceneFlags, null),
            name,
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            this._vertID,
        );
        const layoutName = this.getParentLayout();
        const scene: Scene | null = cclegacy.director.getScene();
        setCameraUBOValues(
            this,
            null,
            this._pipeline,
            scene ? scene.renderScene : null,
            layoutName,
        );
        if (sceneFlags & SceneFlags.SHADOW_CASTER) {
            // setShadowUBOLightView(this, light.light!, light.level);
        } else {
            setShadowUBOView(this, null, layoutName);
        }
    }
    addCameraQuad (camera: Camera, material: Material, passID: number, sceneFlags = SceneFlags.NONE): void {
        this._renderGraph.addVertex<RenderGraphValue.Blit>(
            RenderGraphValue.Blit,
            renderGraphPool.createBlit(material, passID, sceneFlags, camera),
            'CameraQuad',
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            this._vertID,
        );
        const layoutName = this.getParentLayout();
        const scene: Scene = cclegacy.director.getScene();
        setCameraUBOValues(
            this,
            camera,
            this._pipeline,
            camera.scene || (scene ? scene.renderScene : null),
            layoutName,
        );
        if (sceneFlags & SceneFlags.SHADOW_CASTER) {
            // setShadowUBOLightView(this, light.light!, light.level);
        } else {
            setShadowUBOView(this, camera, layoutName);
        }
    }
    clearRenderTarget (name: string, color: Color = new Color()): void {
        const clearView = renderGraphPool.createClearView(name, ClearFlagBit.COLOR);
        clearView.clearColor.copy(color);
        this._renderGraph.addVertex<RenderGraphValue.Clear>(
            RenderGraphValue.Clear,
            [clearView],
            'ClearRenderTarget',
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            this._vertID,
        );
    }
    setViewport (viewport: Viewport): void {
        const currViewport = pipelinePool.viewport.add();
        this._queue.viewport = currViewport.copy(viewport);
    }
    addCustomCommand (customBehavior: string): void {
        throw new Error('Method not implemented.');
    }
    private _renderGraph: RenderGraph;
    private _queue: RenderQueue;
    private _pipeline: PipelineSceneData;
}

export class WebRenderSubpassBuilder extends WebSetter implements RenderSubpassBuilder {
    constructor (
        data: RenderData,
        renderGraph: RenderGraph,
        layoutGraph: LayoutGraphData,
        vertID: number,
        subpass: RasterSubpass,
        pipeline: PipelineSceneData,
    ) {
        super(data, layoutGraph);
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._subpass = subpass;
        this._pipeline = pipeline;

        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }
    update (
        data: RenderData,
        renderGraph: RenderGraph,
        layoutGraph: LayoutGraphData,
        vertID: number,
        subpass: RasterSubpass,
        pipeline: PipelineSceneData,
    ): void {
        this._data = data;
        this._lg = layoutGraph;
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._subpass = subpass;
        this._pipeline = pipeline;

        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }
    addRenderTarget (name: string, accessType: AccessType, slotName?: string | undefined, loadOp?: LoadOp | undefined, storeOp?: StoreOp | undefined, color?: Color | undefined): void {
        throw new Error('Method not implemented.');
    }
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void {
        throw new Error('Method not implemented.');
    }
    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }

    addDepthStencil (name: string, accessType: AccessType, depthSlotName = '', stencilSlotName = '', loadOp = LoadOp.CLEAR, storeOp = StoreOp.STORE, depth = 1, stencil = 0, clearFlag = ClearFlagBit.DEPTH_STENCIL): void {
        throw new Error('Method not implemented.');
    }
    addTexture (name: string, slotName: string, sampler: Sampler | null = null): void {
        throw new Error('Method not implemented.');
    }
    addStorageBuffer (name: string, accessType: AccessType, slotName: string): void {
        throw new Error('Method not implemented.');
    }
    addStorageImage (name: string, accessType: AccessType, slotName: string): void {
        throw new Error('Method not implemented.');
    }
    setViewport (viewport: Viewport): void {
        throw new Error('Method not implemented.');
    }
    addQueue (hint: QueueHint = QueueHint.RENDER_OPAQUE, layoutName = 'default', passName = ''): RenderQueueBuilder {
        const layoutId = this._lg.locateChild(this._layoutID, layoutName);
        const queue = renderGraphPool.createRenderQueue(hint, layoutId);
        const data = renderGraphPool.createRenderData();
        const queueID = this._renderGraph.addVertex<RenderGraphValue.Queue>(RenderGraphValue.Queue, queue, '', layoutName, data, !DEBUG, this._vertID);
        const queueBuilder = pipelinePool.renderQueueBuilder.add();
        queueBuilder.update(data, this._renderGraph, this._lg, queueID, queue, this._pipeline);
        return queueBuilder;
    }
    get showStatistics (): boolean {
        return this._subpass.showStatistics;
    }
    set showStatistics (enable: boolean) {
        this._subpass.showStatistics = enable;
    }
    private _renderGraph: RenderGraph;
    private _layoutID: number;
    private _subpass: RasterSubpass;
    private _pipeline: PipelineSceneData;
}

export class WebRenderPassBuilder extends WebSetter implements BasicMultisampleRenderPassBuilder {
    constructor (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, resourceGraph: ResourceGraph, vertID: number, pass: RasterPass, pipeline: PipelineSceneData) {
        super(data, layoutGraph);
        this._renderGraph = renderGraph;
        this._resourceGraph = resourceGraph;
        this._vertID = vertID;
        this._pass = pass;
        this._pipeline = pipeline;
        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }
    update (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, resourceGraph: ResourceGraph, vertID: number, pass: RasterPass, pipeline: PipelineSceneData): void {
        this._renderGraph = renderGraph;
        this._lg = layoutGraph;
        this._resourceGraph = resourceGraph;
        this._vertID = vertID;
        this._pass = pass;
        this._pipeline = pipeline;
        this._data = data;
        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }

    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void {
        throw new Error('Method not implemented.');
    }
    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    setVersion (name: string, version: number): void {
        this._pass.versionName = name;
        this._pass.version = version;
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }
    addRenderTarget (name: string, loadOp = LoadOp.CLEAR, storeOp = StoreOp.STORE, clearColor = new Color()): void {
        let clearFlag = ClearFlagBit.COLOR;
        if (loadOp === LoadOp.LOAD) {
            clearFlag = ClearFlagBit.NONE;
        }
        const view = renderGraphPool.createRasterView(
            '',
            AccessType.WRITE,

            AttachmentType.RENDER_TARGET,
            loadOp,
            storeOp,
            clearFlag,
        );
        view.clearColor.copy(clearColor);
        this._pass.rasterViews.set(name, view);
    }
    addDepthStencil (name: string, loadOp = LoadOp.CLEAR, storeOp = StoreOp.STORE, depth = 1, stencil = 0, clearFlag = ClearFlagBit.DEPTH_STENCIL): void {
        const view = renderGraphPool.createRasterView(
            '',
            AccessType.WRITE,

            AttachmentType.DEPTH_STENCIL,
            loadOp,
            storeOp,
            clearFlag,
        );
        view.clearColor.set(depth, stencil, 0, 0);
        this._pass.rasterViews.set(name, view);
    }
    resolveRenderTarget (source: string, target: string): void {
        // TODO
    }
    resolveDepthStencil (
        source: string,
        target: string,
        depthMode?: ResolveMode,
        stencilMode?: ResolveMode,
    ): void {
        // TODO
    }
    private _addComputeResource (name: string, accessType: AccessType, slotName: string): void {
        const view = renderGraphPool.createComputeView(slotName);
        view.accessType = accessType;
        if (this._pass.computeViews.has(name)) {
            this._pass.computeViews.get(name)?.push(view);
        } else {
            this._pass.computeViews.set(name, [view]);
        }
    }
    addTexture (name: string, slotName: string, sampler: Sampler | null = null): void {
        this._addComputeResource(name, AccessType.READ, slotName);
        if (sampler) {
            const descriptorID = this._lg.attributeIndex.get(slotName)!;
            this._data.samplers.set(descriptorID, sampler);
        }
    }
    addStorageBuffer (name: string, accessType: AccessType, slotName: string): void {
        this._addComputeResource(name, accessType, slotName);
    }
    addStorageImage (name: string, accessType: AccessType, slotName: string): void {
        this._addComputeResource(name, accessType, slotName);
    }
    addRenderSubpass (layoutName = ''): RenderSubpassBuilder {
        const name = 'Raster';
        const subpassID = this._pass.subpassGraph.nv();
        this._pass.subpassGraph.addVertex(name, renderGraphPool.createSubpass());
        const subpass = renderGraphPool.createRasterSubpass(subpassID, 1, 0);
        const data = renderGraphPool.createRenderData();
        const vertID = this._renderGraph.addVertex<RenderGraphValue.RasterSubpass>(RenderGraphValue.RasterSubpass, subpass, name, layoutName, data, !DEBUG);
        const result = pipelinePool.renderSubpassBuilder.add();
        result.update(data, this._renderGraph, this._lg, vertID, subpass, this._pipeline);
        return result;
    }
    addQueue (hint: QueueHint = QueueHint.RENDER_OPAQUE, layoutName = 'default', passName = ''): WebRenderQueueBuilder {
        const layoutId = this._lg.locateChild(this._layoutID, layoutName);
        const queue = renderGraphPool.createRenderQueue(hint, layoutId);
        const data = renderGraphPool.createRenderData();
        const queueID = this._renderGraph.addVertex<RenderGraphValue.Queue>(RenderGraphValue.Queue, queue, '', layoutName, data, !DEBUG, this._vertID);
        const result = pipelinePool.renderQueueBuilder.add();
        result.update(data, this._renderGraph, this._lg, queueID, queue, this._pipeline);
        return result;
    }

    addFullscreenQuad (material: Material, passID: number, sceneFlags = SceneFlags.NONE, name = 'FullscreenQuad'): void {
        const queue = renderGraphPool.createRenderQueue(QueueHint.RENDER_TRANSPARENT);
        const queueId = this._renderGraph.addVertex<RenderGraphValue.Queue>(
            RenderGraphValue.Queue,
            queue,
            'Queue',
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            this._vertID,
        );
        this._renderGraph.addVertex<RenderGraphValue.Blit>(
            RenderGraphValue.Blit,
            renderGraphPool.createBlit(material, passID, sceneFlags, null),
            name,
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            queueId,
        );
    }

    addCameraQuad (camera: Camera, material: Material, passID: number, sceneFlags: SceneFlags, name = 'CameraQuad'): void {
        const queue = renderGraphPool.createRenderQueue(QueueHint.RENDER_TRANSPARENT);
        const queueId = this._renderGraph.addVertex<RenderGraphValue.Queue>(
            RenderGraphValue.Queue,
            queue,
            'Queue',
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            this._vertID,
        );
        this._renderGraph.addVertex<RenderGraphValue.Blit>(
            RenderGraphValue.Blit,
            renderGraphPool.createBlit(material, passID, sceneFlags, camera),
            name,
            '',
            renderGraphPool.createRenderData(),
            !DEBUG,
            queueId,
        );
    }
    setViewport (viewport: Viewport): void {
        this._pass.viewport.copy(viewport);
    }
    get showStatistics (): boolean {
        return this._pass.showStatistics;
    }
    set showStatistics (enable: boolean) {
        this._pass.showStatistics = enable;
    }
    private _renderGraph: RenderGraph;
    private _layoutID: number;
    private _pass: RasterPass;
    private _pipeline: PipelineSceneData;
    private _resourceGraph: ResourceGraph;
}

export class WebComputeQueueBuilder extends WebSetter implements ComputeQueueBuilder {
    constructor (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, vertID: number, queue: RenderQueue, pipeline: PipelineSceneData) {
        super(data, layoutGraph);
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._queue = queue;
        this._pipeline = pipeline;
    }
    update (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, vertID: number, queue: RenderQueue, pipeline: PipelineSceneData): void {
        this._data = data;
        this._lg = layoutGraph;
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._queue = queue;
        this._pipeline = pipeline;
    }
    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }
    addDispatch (
        threadGroupCountX: number,
        threadGroupCountY: number,
        threadGroupCountZ: number,
        material: Material | null = null,
        passID = 0,
        name = 'Dispatch',
    ): void {
        this._renderGraph.addVertex<RenderGraphValue.Dispatch>(
            RenderGraphValue.Dispatch,
            renderGraphPool.createDispatch(material, passID, threadGroupCountX, threadGroupCountY, threadGroupCountZ),
            name,

            '',

            renderGraphPool.createRenderData(),

            !DEBUG,

            this._vertID,
        );
    }
    private _renderGraph: RenderGraph;
    private _queue: RenderQueue;
    private _pipeline: PipelineSceneData;
}

export class WebComputePassBuilder extends WebSetter implements ComputePassBuilder {
    constructor (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, resourceGraph: ResourceGraph, vertID: number, pass: ComputePass, pipeline: PipelineSceneData) {
        super(data, layoutGraph);
        this._renderGraph = renderGraph;
        this._resourceGraph = resourceGraph;
        this._vertID = vertID;
        this._pass = pass;
        this._pipeline = pipeline;

        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }
    update (data: RenderData, renderGraph: RenderGraph, layoutGraph: LayoutGraphData, resourceGraph: ResourceGraph, vertID: number, pass: ComputePass, pipeline: PipelineSceneData): void {
        this._data = data;
        this._renderGraph = renderGraph;
        this._lg = layoutGraph;
        this._resourceGraph = resourceGraph;
        this._vertID = vertID;
        this._pass = pass;
        this._pipeline = pipeline;

        const layoutName = this._renderGraph.getLayout(this._vertID);
        this._layoutID = layoutGraph.locateChild(layoutGraph.N, layoutName);
    }
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void {
        throw new Error('Method not implemented.');
    }
    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }
    addTexture (name: string, slotName: string, sampler: Sampler | null = null): void {
        throw new Error('Method not implemented.');
    }
    addStorageBuffer (name: string, accessType: AccessType, slotName: string): void {
        this._addComputeResource(name, accessType, slotName);
    }
    addStorageImage (name: string, accessType: AccessType, slotName: string): void {
        this._addComputeResource(name, accessType, slotName);
    }
    addMaterialTexture (resourceName: string, flags?: ShaderStageFlagBit | undefined): void {
        throw new Error('Method not implemented.');
    }
    addQueue (layoutName = 'default', passName = ''): WebComputeQueueBuilder {
        const layoutId = this._lg.locateChild(this._layoutID, layoutName);
        const queue = renderGraphPool.createRenderQueue(QueueHint.RENDER_OPAQUE, layoutId);
        const data = renderGraphPool.createRenderData();
        const queueID = this._renderGraph.addVertex<RenderGraphValue.Queue>(RenderGraphValue.Queue, queue, '', layoutName, data, !DEBUG, this._vertID);
        const computeQueueBuilder = pipelinePool.computeQueueBuilder.add();
        computeQueueBuilder.update(data, this._renderGraph, this._lg, queueID, queue, this._pipeline);
        return computeQueueBuilder;
    }

    private _addComputeResource (name: string, accessType: AccessType, slotName: string): void {
        const view = renderGraphPool.createComputeView(slotName);
        view.accessType = accessType;
        if (this._pass.computeViews.has(name)) {
            this._pass.computeViews.get(name)?.push(view);
        } else {
            this._pass.computeViews.set(name, [view]);
        }
    }

    private _renderGraph: RenderGraph;
    private _resourceGraph: ResourceGraph;
    private _layoutID: number;
    private _pass: ComputePass;
    private _pipeline: PipelineSceneData;
}

export class WebMovePassBuilder {
    constructor (renderGraph: RenderGraph, vertID: number, pass: MovePass) {
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._pass = pass;
    }
    setCustomBehavior (name: string): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }
    addPair (pair: MovePair): void {
        this._pass.movePairs.push(pair);
    }
    private readonly _renderGraph: RenderGraph;
    private readonly _vertID: number;
    private readonly _pass: MovePass;
}

export class WebCopyPassBuilder {
    constructor (renderGraph: RenderGraph, vertID: number, pass: CopyPass) {
        this._renderGraph = renderGraph;
        this._vertID = vertID;
        this._pass = pass;
    }
    addPair (pair: CopyPair): void {
        throw new Error('Method not implemented.');
    }
    setCustomBehavior (name: string): void {
        throw new Error('Method not implemented.');
    }
    get name (): string {
        return this._renderGraph.getName(this._vertID);
    }
    set name (name: string) {
        this._renderGraph.setName(this._vertID, name);
    }
    private readonly _renderGraph: RenderGraph;
    private readonly _vertID: number;
    private readonly _pass: CopyPass;
}

function isManaged (residency: ResourceResidency): boolean {
    return residency === ResourceResidency.MANAGED
        || residency === ResourceResidency.MEMORYLESS;
}

export class WebPipeline implements BasicPipeline {
    constructor (layoutGraph: LayoutGraphData) {
        this._layoutGraph = layoutGraph;
    }
    globalDSManager: GlobalDSManager;
    descriptorSetLayout: DescriptorSetLayout;
    descriptorSet: DescriptorSet;
    get type (): PipelineType {
        return PipelineType.BASIC;
    }
    get capabilities (): PipelineCapabilities {
        return new PipelineCapabilities();
    }
    get enableCpuLightCulling (): boolean {
        if (!this._executor) {
            return true;
        }
        return this._executor._context.culling.enableLightCulling;
    }
    set enableCpuLightCulling (enable: boolean) {
        if (!this._executor) {
            return;
        }
        this._executor._context.culling.enableLightCulling = enable;
    }
    addCustomBuffer (name: string, info: BufferInfo, type: string): number {
        throw new Error('Method not implemented.');
    }
    addCustomTexture (name: string, info: TextureInfo, type: string): number {
        throw new Error('Method not implemented.');
    }
    tryAddRenderWindowDepthStencil (
        width: number,
        height: number,
        depthStencilName?: string,
        swapchain?: Swapchain,
    ): void {
        if (!depthStencilName) {
            return;
        }
        if (swapchain) {
            this.addDepthStencilImpl(
                depthStencilName,
                swapchain.depthStencilTexture.format,
                width,
                height,
                ResourceResidency.BACKBUFFER,
                swapchain,
            );
        } else {
            this.addDepthStencilImpl(
                depthStencilName,
                Format.DEPTH_STENCIL,
                width,
                height,
                ResourceResidency.MANAGED,
            );
        }
    }
    addRenderWindow (
        name: string,
        format: Format,
        width: number,
        height: number,
        renderWindow: RenderWindow,
        depthStencilName?: string,
    ): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateRenderWindow(name, renderWindow, depthStencilName);
            return resID;
        }

        this.tryAddRenderWindowDepthStencil(width, height, depthStencilName, renderWindow.swapchain);

        // Objects need to be held for a long time, so there is no need to use pool management
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.TEXTURE2D;
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = renderWindow.framebuffer.colorTextures[0]!.format;
        desc.flags = ResourceFlags.COLOR_ATTACHMENT;

        if (!renderWindow.swapchain) {
            desc.sampleCount = renderWindow.framebuffer.colorTextures[0]!.info.samples;
            return this._resourceGraph.addVertex<ResourceGraphValue.Framebuffer>(
                ResourceGraphValue.Framebuffer,
                renderWindow.framebuffer,
                name,
                desc,
                new ResourceTraits(ResourceResidency.EXTERNAL),
                new ResourceStates(),
                new SamplerInfo(),
            );
        } else {
            return this._resourceGraph.addVertex<ResourceGraphValue.Swapchain>(
                ResourceGraphValue.Swapchain,
                new RenderSwapchain(renderWindow.swapchain),
                name,
                desc,
                new ResourceTraits(ResourceResidency.BACKBUFFER),
                new ResourceStates(),
                new SamplerInfo(),
            );
        }
    }
    updateRenderWindow (name: string, renderWindow: RenderWindow, depthStencilName?: string): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = renderWindow.width;
        desc.height = renderWindow.height;
        const currFbo = this.resourceGraph.object(resId);
        if (currFbo !== renderWindow.framebuffer) {
            this.resourceGraph.x[resId].j = renderWindow.framebuffer;
        }
        this.tryAddRenderWindowDepthStencil(renderWindow.width, renderWindow.height, depthStencilName, renderWindow.swapchain);
    }
    updateStorageBuffer (name: string, size: number, format = Format.UNKNOWN): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = size;
        if (format !== Format.UNKNOWN) {
            desc.format = format;
        }
    }
    updateRenderTarget (name: string, width: number, height: number, format: Format = Format.UNKNOWN): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = width;
        desc.height = height;
        if (format !== Format.UNKNOWN) desc.format = format;
    }
    updateDepthStencil (name: string, width: number, height: number, format: Format = Format.UNKNOWN): void {
        const resId = this.resourceGraph.find(name);
        if (resId === 0xFFFFFFFF) {
            return;
        }
        this.updateDepthStencilImpl(resId, width, height, format);
    }
    updateStorageTexture (name: string, width: number, height: number, format = Format.UNKNOWN): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = width;
        desc.height = height;
        if (format !== Format.UNKNOWN) {
            desc.format = format;
        }
    }
    updateShadingRateTexture (name: string, width: number, height: number): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = width;
        desc.height = height;
    }

    public addBuffer (name: string, size: number, flags: ResourceFlags, residency: ResourceResidency): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateBuffer(name, size);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.BUFFER;
        desc.width = size;
        desc.flags = flags;
        return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
            ResourceGraphValue.Managed,
            new ManagedResource(),
            name,

            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(Filter.LINEAR, Filter.LINEAR, Filter.NONE, Address.CLAMP, Address.CLAMP, Address.CLAMP),
        );
    }

    public updateBuffer (name: string, size: number): void {
        this.updateResource(name, Format.UNKNOWN, size, 0, 0, 0, 0, SampleCount.X1);
    }

    public addExternalTexture (name: string, texture: Texture, flags: ResourceFlags): number {
        throw new Error('Method not implemented.');
    }

    public updateExternalTexture (name: string, texture: Texture): void {
        throw new Error('Method not implemented.');
    }

    public addTexture (name: string, textureType: TextureType, format: Format, width: number, height: number, depth: number, arraySize: number, mipLevels: number, sampleCount: SampleCount, flags: ResourceFlags, residency: ResourceResidency): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateTexture(name, format, width, height, depth, arraySize, mipLevels, sampleCount);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = getResourceDimension(textureType);
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = desc.dimension === ResourceDimension.TEXTURE3D ? depth : arraySize;
        desc.mipLevels = mipLevels;
        desc.format = format;
        desc.sampleCount = sampleCount;
        desc.flags = flags;
        desc.viewType = textureType;
        return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
            ResourceGraphValue.Managed,
            new ManagedResource(),
            name,

            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(Filter.LINEAR, Filter.LINEAR, Filter.NONE, Address.CLAMP, Address.CLAMP, Address.CLAMP),
        );
    }

    public updateTexture (name: string, format: Format, width: number, height: number, depth: number, arraySize: number, mipLevels: number, sampleCount: SampleCount): void {
        this.updateResource(name, format, width, height, depth, arraySize, mipLevels, sampleCount);
    }

    public addResource (name: string, dimension: ResourceDimension, format: Format, width: number, height: number, depth: number, arraySize: number, mipLevels: number, sampleCount: SampleCount, flags: ResourceFlags, residency: ResourceResidency): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateResource(name, format, width, height, depth, arraySize, mipLevels, sampleCount);
            return resID;
        }
        if (dimension === ResourceDimension.BUFFER) {
            return this.addBuffer(name, width, flags, residency);
        } else {
            return this.addTexture(name, getTextureType(dimension, arraySize), format, width, height, depth, arraySize, mipLevels, sampleCount, flags, residency);
        }
    }
    public updateResource (name: string, format: Format, width: number, height: number, depth: number, arraySize: number, mipLevels: number, sampleCount: SampleCount): void {
        const resId = this.resourceGraph.vertex(name);
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = desc.dimension === ResourceDimension.TEXTURE3D ? depth : arraySize;
        desc.mipLevels = mipLevels;
        if (format !== Format.UNKNOWN) {
            desc.format = format;
        }
        desc.sampleCount = sampleCount;
    }
    public containsResource (name: string): boolean {
        return this._resourceGraph.contains(name);
    }
    public addResolvePass (resolvePairs: ResolvePair[]): void {
        // TODO: implement resolve pass
        throw new Error('Method not implemented.');
    }

    public addComputePass (passName: string): ComputePassBuilder {
        const name = 'Compute';
        const pass = renderGraphPool.createComputePass();

        const data = renderGraphPool.createRenderData();
        const vertID = this._renderGraph!.addVertex<RenderGraphValue.Compute>(RenderGraphValue.Compute, pass, name, passName, data, !DEBUG);
        const result = pipelinePool.computePassBuilder.add();
        result.update(data, this._renderGraph!, this._layoutGraph, this._resourceGraph, vertID, pass, this._pipelineSceneData);
        setComputeConstants(result, passName);
        return result;
    }

    public addUploadPass (uploadPairs: UploadPair[]): void {
        const name = 'UploadPass';
        const pass = renderGraphPool.createCopyPass();
        for (const up of uploadPairs) {
            pass.uploadPairs.push(up);
        }

        const vertID = this._renderGraph!.addVertex<RenderGraphValue.Copy>(RenderGraphValue.Copy, pass, name, '', renderGraphPool.createRenderData(), !DEBUG);
        // const result = new WebCopyPassBuilder(this._renderGraph!, vertID, pass);
    }

    public addCopyPass (copyPairs: CopyPair[]): void {
        for (const pair of copyPairs) {
            const targetName = pair.target;
            const tarVerId = this.resourceGraph.find(targetName);
            const resDesc = this.resourceGraph.getDesc(tarVerId);
            const currRaster = this.addRenderPass(resDesc.width, resDesc.height, 'copy-pass');
            currRaster.addRenderTarget(targetName, LoadOp.CLEAR, StoreOp.STORE, pipelinePool.createColor());
            currRaster.addTexture(pair.source, 'outputResultMap');
            currRaster.addQueue(QueueHint.NONE).addFullscreenQuad(this._copyPassMat, 0, SceneFlags.NONE);
        }
    }
    protected _generateConstantMacros (clusterEnabled: boolean): void {
        let str = '';
        str += `#define CC_DEVICE_SUPPORT_FLOAT_TEXTURE ${this._device.getFormatFeatures(Format.RGBA32F)
            & (FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE) ? 1 : 0}\n`;
        // str += `#define CC_ENABLE_CLUSTERED_LIGHT_CULLING ${clusterEnabled ? 1 : 0}\n`; // defined in material
        str += `#define CC_DEVICE_MAX_VERTEX_UNIFORM_VECTORS ${this._device.capabilities.maxVertexUniformVectors}\n`;
        str += `#define CC_DEVICE_MAX_FRAGMENT_UNIFORM_VECTORS ${this._device.capabilities.maxFragmentUniformVectors}\n`;
        str += `#define CC_DEVICE_CAN_BENEFIT_FROM_INPUT_ATTACHMENT ${this._device.hasFeature(Feature.INPUT_ATTACHMENT_BENEFIT) ? 1 : 0}\n`;
        str += `#define CC_PLATFORM_ANDROID_AND_WEBGL ${systemInfo.os === OS.ANDROID && systemInfo.isBrowser ? 1 : 0}\n`;
        str += `#define CC_ENABLE_WEBGL_HIGHP_STRUCT_VALUES ${macro.ENABLE_WEBGL_HIGHP_STRUCT_VALUES ? 1 : 0}\n`;
        const jointUniformCapacity = UBOSkinning.JOINT_UNIFORM_CAPACITY;
        str += `#define CC_JOINT_UNIFORM_CAPACITY ${jointUniformCapacity}\n`;
        this._constantMacros = str;
        this._layoutGraph.constantMacros = this._constantMacros;
    }
    public setCustomPipelineName (name: string): void {
        this._customPipelineName = name;
        if (this._customPipelineName === 'Deferred') {
            this._usesDeferredPipeline = true;
        }
    }

    public getGlobalDescriptorSetData (): DescriptorSetData | undefined {
        const stageId = this.layoutGraph.locateChild(this.layoutGraph.N, 'default');
        const layout = this.layoutGraph.getLayout(stageId);
        const layoutData: DescriptorSetData | undefined = layout.getSet(UpdateFrequency.PER_PASS);
        return layoutData;
    }

    private _initCombineSignY (): void {
        const device = this._device;
        this._combineSignY = (device.capabilities.screenSpaceSignY * 0.5 + 0.5) << 1 | (device.capabilities.clipSpaceSignY * 0.5 + 0.5);
    }

    public getCombineSignY (): number {
        return this._combineSignY;
    }

    get globalDescriptorSetData (): DescriptorSetData {
        return this._globalDescSetData;
    }

    get defaultSampler (): Sampler {
        return this._defaultSampler;
    }

    get defaultShadowTexture (): Texture {
        return getDefaultShadowTexture(this.device);
    }

    private _compileMaterial (): void {
        this._copyPassMat.initialize({
            effectName: 'pipeline/copy-pass',
        });
        for (let i = 0; i < this._copyPassMat.passes.length; ++i) {
            this._copyPassMat.passes[i].tryCompile();
        }
    }

    public activate (swapchain: Swapchain): boolean {
        this._device = deviceManager.gfxDevice;
        pipelinePool = new PipelinePool();
        renderGraphPool = pipelinePool.renderGraphPool;
        createGfxDescriptorSetsAndPipelines(this._device, this._layoutGraph);
        this._compileMaterial();
        this.setMacroBool('CC_USE_HDR', this._pipelineSceneData.isHDR);
        this.setMacroBool('CC_USE_FLOAT_OUTPUT', macro.ENABLE_FLOAT_OUTPUT && supportsRGBA16HalfFloatTexture(this._device));
        this._generateConstantMacros(false);
        this._pipelineSceneData.activate(this._device);
        this._initCombineSignY();
        const isFloat = supportsR32FloatTexture(this._device) ? 0 : 1;
        this.setMacroInt('CC_SHADOWMAP_FORMAT', isFloat);
        // 0: SHADOWMAP_LINER_DEPTH_OFF, 1: SHADOWMAP_LINER_DEPTH_ON.
        const isLinear = this._device.gfxAPI === API.WEBGL ? 1 : 0;
        this.setMacroInt('CC_SHADOWMAP_USE_LINEAR_DEPTH', isLinear);
        const director: Director = cclegacy.director;
        const root: Root = director.root!;
        this._defaultSampler = root.device.getSampler(_samplerPointInfo);
        // 0: UNIFORM_VECTORS_LESS_EQUAL_64, 1: UNIFORM_VECTORS_GREATER_EQUAL_125.
        this.pipelineSceneData.csmSupported = this.device.capabilities.maxFragmentUniformVectors
            >= (WebPipeline.CSM_UNIFORM_VECTORS + WebPipeline.GLOBAL_UNIFORM_VECTORS);
        this.setMacroBool('CC_SUPPORT_CASCADED_SHADOW_MAP', this.pipelineSceneData.csmSupported);

        // 0: CC_SHADOW_NONE, 1: CC_SHADOW_PLANAR, 2: CC_SHADOW_MAP
        this.setMacroInt('CC_SHADOW_TYPE', 0);

        // 0: PCFType.HARD, 1: PCFType.SOFT, 2: PCFType.SOFT_2X, 3: PCFType.SOFT_4X
        this.setMacroInt('CC_DIR_SHADOW_PCF_TYPE', PCFType.HARD);

        // 0: CC_DIR_LIGHT_SHADOW_NONE, 1: CC_DIR_LIGHT_SHADOW_UNIFORM, 2: CC_DIR_LIGHT_SHADOW_CASCADED, 3: CC_DIR_LIGHT_SHADOW_VARIANCE
        this.setMacroInt('CC_DIR_LIGHT_SHADOW_TYPE', 0);

        // 0: CC_CASCADED_LAYERS_TRANSITION_OFF, 1: CC_CASCADED_LAYERS_TRANSITION_ON
        this.setMacroBool('CC_CASCADED_LAYERS_TRANSITION', false);

        // enable the deferred pipeline
        if (this.usesDeferredPipeline) {
            this.setMacroInt('CC_PIPELINE_TYPE', 1);
        }
        return true;
    }
    public destroy (): boolean {
        this._pipelineSceneData?.destroy();
        return true;
    }
    public get device (): Device {
        return this._device;
    }
    public get lightingMode (): LightingMode {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._lightingMode;
    }
    public set lightingMode (mode: LightingMode) {
        this._lightingMode = mode;
    }
    public get usesDeferredPipeline (): boolean {
        return this._usesDeferredPipeline;
    }
    public get macros (): MacroRecord {
        return this._macros;
    }
    public get profilerDescriptorSet (): DescriptorSet {
        return this._profilerDescriptorSet!;
    }
    // public get globalDescriptorSet (): DescriptorSet {
    //     return this._globalDescriptorSet!;
    // }
    // public get globalDescriptorSetInfo (): DescriptorSetInfo {
    //     return this._globalDescriptorSetInfo!;
    // }
    public get commandBuffers (): CommandBuffer[] {
        return [this._device.commandBuffer];
    }
    public get pipelineSceneData (): PipelineSceneData {
        return this._pipelineSceneData;
    }
    public get constantMacros (): string {
        return this._constantMacros;
    }
    public get profiler (): Model | null {
        return this._profiler;
    }
    public set profiler (profiler: Model | null) {
        this._profiler = profiler;
    }
    public get geometryRenderer (): GeometryRenderer | null {
        throw new Error('Method not implemented.');
    }
    public get shadingScale (): number {
        return this._pipelineSceneData.shadingScale;
    }
    public set shadingScale (scale: number) {
        this._pipelineSceneData.shadingScale = scale;
    }
    public getMacroString (name: string): string {
        const str = this._macros[name];
        if (str === undefined) {
            return '';
        }
        return str as string;
    }
    public getMacroInt (name: string): number {
        const value = this._macros[name];
        if (value === undefined) {
            return 0;
        }
        return value as number;
    }
    public getMacroBool (name: string): boolean {
        const value = this._macros[name];
        if (value === undefined) {
            return false;
        }
        return value as boolean;
    }
    public getSamplerInfo (name: string): SamplerInfo | null {
        if (this.containsResource(name)) {
            const verId = this._resourceGraph.vertex(name);
            return this._resourceGraph.getSampler(verId);
        }
        return null;
    }
    public setMacroString (name: string, value: string): void {
        this._macros[name] = value;
    }
    public setMacroInt (name: string, value: number): void {
        this._macros[name] = value;
    }
    public setMacroBool (name: string, value: boolean): void {
        this._macros[name] = value;
    }
    public onGlobalPipelineStateChanged (): void {
        const builder = cclegacy.rendering.getCustomPipeline(macro.CUSTOM_PIPELINE_NAME);
        if (builder) {
            if (typeof builder.onGlobalPipelineStateChanged === 'function') {
                builder.onGlobalPipelineStateChanged();
            }
            cclegacy.rendering.forceResizeAllWindows();
        }
    }
    beginSetup (): void {
        if (!this._renderGraph) this._renderGraph = new RenderGraph();
        pipelinePool.reset();
    }
    endSetup (): void {
        this.compile();
    }
    addStorageBuffer (name: string, format: Format, size: number, residency = ResourceResidency.MANAGED): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateStorageBuffer(name, size, format);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.BUFFER;
        desc.width = size;
        desc.height = 1;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = format;
        desc.flags = ResourceFlags.STORAGE;

        if (residency === ResourceResidency.PERSISTENT) {
            return this._resourceGraph.addVertex<ResourceGraphValue.PersistentBuffer>(
                ResourceGraphValue.PersistentBuffer,
                new PersistentBuffer(),
                name,
                desc,
                new ResourceTraits(ResourceResidency.PERSISTENT),
                new ResourceStates(),
                new SamplerInfo(),
            );
        }

        return this._resourceGraph.addVertex<ResourceGraphValue.ManagedBuffer>(
            ResourceGraphValue.ManagedBuffer,
            new ManagedBuffer(),
            name,
            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(),
        );
    }
    addRenderTarget (name: string, format: Format, width: number, height: number, residency = ResourceResidency.MANAGED): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateRenderTarget(name, width, height, format);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.TEXTURE2D;
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = format;
        desc.sampleCount = SampleCount.X1;
        desc.flags = ResourceFlags.COLOR_ATTACHMENT | ResourceFlags.SAMPLED;

        return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
            ResourceGraphValue.Managed,
            new ManagedResource(),
            name,
            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(Filter.LINEAR, Filter.LINEAR, Filter.NONE, Address.CLAMP, Address.CLAMP, Address.CLAMP),
        );
    }
    updateDepthStencilImpl (
        resId: number,
        width: number,
        height: number,
        format: Format,
        swapchain?: Swapchain,
    ): void {
        const desc = this.resourceGraph.getDesc(resId);
        desc.width = width;
        desc.height = height;
        if (swapchain) {
            const sc = this.resourceGraph.j<RenderSwapchain>(resId);
            sc.swapchain = swapchain;
            desc.format = sc.swapchain.depthStencilTexture.format;
        } else if (format !== Format.UNKNOWN) {
            desc.format = format;
        }
    }
    addDepthStencilImpl (
        name: string,
        format: Format,
        width: number,
        height: number,
        residency: ResourceResidency,
        swapchain?: Swapchain,
    ): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateDepthStencilImpl(resID, width, height, format, swapchain);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.TEXTURE2D;
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = format;
        desc.sampleCount = SampleCount.X1;
        desc.flags = ResourceFlags.DEPTH_STENCIL_ATTACHMENT | ResourceFlags.SAMPLED;

        if (swapchain) {
            return this._resourceGraph.addVertex<ResourceGraphValue.Swapchain>(
                ResourceGraphValue.Swapchain,
                new RenderSwapchain(swapchain, true),
                name,
                desc,
                new ResourceTraits(residency),
                new ResourceStates(),
                new SamplerInfo(Filter.POINT, Filter.POINT, Filter.NONE),
            );
        } else {
            return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
                ResourceGraphValue.Managed,
                new ManagedResource(),
                name,
                desc,
                new ResourceTraits(residency),
                new ResourceStates(),
                new SamplerInfo(Filter.POINT, Filter.POINT, Filter.NONE),
            );
        }
    }
    addDepthStencil (name: string, format: Format, width: number, height: number, residency = ResourceResidency.MANAGED): number {
        return this.addDepthStencilImpl(name, format, width, height, residency);
    }
    addStorageTexture (name: string, format: Format, width: number, height: number, residency = ResourceResidency.MANAGED): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.updateStorageTexture(name, width, height, format);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.TEXTURE2D;
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = format;
        desc.flags = ResourceFlags.STORAGE | ResourceFlags.SAMPLED;
        return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
            ResourceGraphValue.Managed,
            new ManagedResource(),
            name,
            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(Filter.POINT, Filter.POINT, Filter.NONE),
        );
    }
    addShadingRateTexture (name: string, width: number, height: number, residency = ResourceResidency.MANAGED): number {
        const resID = this._resourceGraph.find(name);
        if (resID !== 0xFFFFFFFF) {
            this.addShadingRateTexture(name, width, height);
            return resID;
        }
        const desc = new ResourceDesc();
        desc.dimension = ResourceDimension.TEXTURE2D;
        desc.width = width;
        desc.height = height;
        desc.depthOrArraySize = 1;
        desc.mipLevels = 1;
        desc.format = Format.R8UI;
        desc.flags = ResourceFlags.SHADING_RATE | ResourceFlags.STORAGE | ResourceFlags.SAMPLED;

        return this._resourceGraph.addVertex<ResourceGraphValue.Managed>(
            ResourceGraphValue.Managed,
            new ManagedResource(),
            name,
            desc,
            new ResourceTraits(residency),
            new ResourceStates(),
            new SamplerInfo(Filter.LINEAR, Filter.LINEAR, Filter.NONE, Address.CLAMP, Address.CLAMP, Address.CLAMP),
        );
    }
    beginFrame (): void {
        const director: Director = cclegacy.director;
        director.buildRenderPipeline();
    }
    update (camera: Camera): void {
        // noop
    }
    endFrame (): void {
        this.renderGraph?.clear();
    }

    compile (): void {
        if (!this._renderGraph) {
            throw new Error('RenderGraph cannot be built without being created');
        }
        if (DEBUG) {
            if (!this._compiler) {
                this._compiler = new Compiler(this, this._renderGraph, this._resourceGraph, this._layoutGraph);
            }
            this._compiler.compile(this._renderGraph);
        } else {
            this._renderGraph.x.forEach((vert) => {
                if (vert.t === RenderGraphValue.RasterPass) {
                    genHashValue(vert.j as RasterPass);
                }
            });
        }
    }

    execute (): void {
        if (!this._renderGraph) {
            throw new Error('Cannot run without creating rendergraph');
        }
        if (!this._executor) {
            this._executor = new Executor(
                this,
                this._device,
                this._resourceGraph,
                this.layoutGraph,
                this.width,
                this.height,
            );
        }
        this._executor.resize(this.width, this.height);
        this._executor.execute(this._renderGraph);
    }
    protected _applySize (cameras: Camera[]): void {
        let newWidth = this._width;
        let newHeight = this._height;
        cameras.forEach((camera): void => {
            const window = camera.window;
            newWidth = Math.max(window.width, newWidth);
            newHeight = Math.max(window.height, newHeight);
            if (!this._cameras.includes(camera)) {
                this._cameras.push(camera);
            }
        });
        if (newWidth !== this._width || newHeight !== this._height) {
            this._width = newWidth;
            this._height = newHeight;
        }
    }

    private _width = 0;
    private _height = 0;
    get width (): number { return this._width; }
    get height (): number { return this._height; }
    render (cameras: Camera[]): void {
        if (cameras.length === 0) {
            return;
        }
        this._applySize(cameras);
        decideProfilerCamera(cameras);
        // build graph
        this.beginFrame();
        this.execute();
        this.endFrame();
    }
    addBuiltinReflectionProbePass (camera: Camera): void {
        const reflectionProbeManager = cclegacy.internal.reflectionProbeManager as ReflectionProbeManager;
        if (!reflectionProbeManager) return;
        const probes = reflectionProbeManager.getProbes();
        if (probes.length === 0) return;
        for (let i = 0; i < probes.length; i++) {
            const probe = probes[i];
            if (probe.needRender) {
                if (probes[i].probeType === ProbeType.PLANAR) {
                    buildReflectionProbePass(camera, this, probe, probe.realtimePlanarTexture!.window!, 0);
                } else if (EDITOR) {
                    for (let faceIdx = 0; faceIdx < probe.bakedCubeTextures.length; faceIdx++) {
                        probe.updateCameraDir(faceIdx);
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        buildReflectionProbePass(camera, this, probe, probe.bakedCubeTextures[faceIdx].window!, faceIdx);
                    }
                    probe.needRender = false;
                }
            }
        }
    }
    addRenderPassImpl (width: number, height: number, layoutName: string, count = 1, quality = 0): BasicMultisampleRenderPassBuilder {
        const name = 'Raster';
        const pass = renderGraphPool.createRasterPass();
        pass.viewport.width = width;
        pass.viewport.height = height;
        pass.count = count;
        pass.quality = quality;
        const data = renderGraphPool.createRenderData();
        const vertID = this._renderGraph!.addVertex<RenderGraphValue.RasterPass>(RenderGraphValue.RasterPass, pass, name, layoutName, data, !DEBUG);
        const result = pipelinePool.renderPassBuilder.add();
        result.update(data, this._renderGraph!, this._layoutGraph, this._resourceGraph, vertID, pass, this._pipelineSceneData);
        this._updateRasterPassConstants(result, width, height, layoutName);
        setTextureUBOView(result, this._pipelineSceneData);
        return result;
    }
    addRenderPass (width: number, height: number, layoutName = 'default'): BasicRenderPassBuilder {
        return this.addRenderPassImpl(width, height, layoutName);
    }
    addMultisampleRenderPass (width: number, height: number, count: number, quality: number, layoutName = 'default'): BasicMultisampleRenderPassBuilder {
        return this.addRenderPassImpl(width, height, layoutName, count, quality);
    }
    public getDescriptorSetLayout (shaderName: string, freq: UpdateFrequency): DescriptorSetLayout {
        const lg = this._layoutGraph;
        const phaseID = lg.shaderLayoutIndex.get(shaderName)!;
        const pplLayout = lg.getLayout(phaseID);
        const setLayout = pplLayout.getSet(freq)!;
        return setLayout.descriptorSetLayout as DescriptorSetLayout;
    }
    get renderGraph (): RenderGraph | null {
        return this._renderGraph;
    }
    get resourceGraph (): ResourceGraph {
        return this._resourceGraph;
    }
    get layoutGraph (): LayoutGraphData {
        return this._layoutGraph;
    }

    get resourceUses (): string[] {
        return this._resourceUses;
    }

    protected _updateRasterPassConstants (setter: WebSetter, width: number, height: number, layoutName = 'default'): void {
        const director: Director = cclegacy.director;
        const root: Root = director.root!;
        const shadingWidth = width;
        const shadingHeight = height;
        const pipeline = root.pipeline as WebPipeline;
        const layoutGraph = pipeline.layoutGraph;
        // Global
        _uboVec.set(root.cumulativeTime, root.frameTime, director.getTotalFrames());
        setter.setVec4('cc_time', _uboVec);
        _uboVec.set(shadingWidth, shadingHeight, 1.0 / shadingWidth, 1.0 / shadingHeight);
        setter.setVec4('cc_screenSize', _uboVec);
        _uboVec.set(shadingWidth, shadingHeight, 1.0 / shadingWidth, 1.0 / shadingHeight);
        setter.setVec4('cc_nativeSize', _uboVec);
        const debugView = root.debugView;
        _uboVec.set(0.0, 0.0, 0.0, 0.0);
        if (debugView) {
            const debugPackVec: number[] = [debugView.singleMode as number, 0.0, 0.0, 0.0];
            for (let i = DebugViewCompositeType.DIRECT_DIFFUSE as number; i < (DebugViewCompositeType.MAX_BIT_COUNT as number); i++) {
                const idx = i >> 3;
                const bit = i % 8;
                debugPackVec[idx + 1] += (debugView.isCompositeModeEnabled(i) ? 1.0 : 0.0) * (10.0 ** bit);
            }
            debugPackVec[3] += (debugView.lightingWithAlbedo ? 1.0 : 0.0) * (10.0 ** 6.0);
            debugPackVec[3] += (debugView.csmLayerColoration ? 1.0 : 0.0) * (10.0 ** 7.0);
            _uboVec.set(debugPackVec[0], debugPackVec[1], debugPackVec[2], debugPackVec[3]);
        }
        setter.setVec4('cc_debug_view_mode', _uboVec);
    }

    public static MAX_BLOOM_FILTER_PASS_NUM = 6;
    private _usesDeferredPipeline = false;
    private _copyPassMat: Material = new Material();
    private _device!: Device;
    private _defaultSampler!: Sampler;
    private _profilerDescriptorSet: DescriptorSet | null = null;
    private readonly _macros: MacroRecord = {};
    private readonly _pipelineSceneData: PipelineSceneData = new PipelineSceneData();
    private _constantMacros = '';
    private _lightingMode = LightingMode.DEFAULT;
    private _profiler: Model | null = null;
    private _cameras: Camera[] = [];
    private _resourceUses: string[] = [];

    private _layoutGraph: LayoutGraphData;
    private readonly _resourceGraph: ResourceGraph = new ResourceGraph();
    private _renderGraph: RenderGraph | null = null;
    private _compiler: Compiler | null = null;
    private _executor: Executor | null = null;
    private _customPipelineName = '';
    private _globalDescSetData!: DescriptorSetData;
    private _combineSignY = 0;
    // csm uniform used vectors count
    public static CSM_UNIFORM_VECTORS = 61;
    // all global uniform used vectors count
    public static GLOBAL_UNIFORM_VECTORS = 64;
}
