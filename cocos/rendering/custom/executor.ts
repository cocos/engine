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

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
/* eslint-disable max-len */
import { getPhaseID, PipelineStateManager } from '..';
import { cclegacy, RecyclePool } from '../../core';
import intersect from '../../core/geometry/intersect';
import { Sphere } from '../../core/geometry/sphere';
import {
    AccessFlagBit,
    Attribute,
    Buffer,
    BufferInfo,
    BufferUsageBit,
    BufferViewInfo,
    Color,
    ColorAttachment,
    CommandBuffer,
    DepthStencilAttachment,
    DescriptorSet,
    DescriptorSetInfo,
    Device,
    deviceManager,
    DispatchInfo,
    Format,
    Framebuffer,
    FramebufferInfo,
    GeneralBarrierInfo,
    InputAssembler,
    InputAssemblerInfo,
    LoadOp,
    MemoryUsageBit,
    PipelineBindPoint,
    PipelineState,
    PipelineStateInfo,
    Rect,
    RenderPass,
    RenderPassInfo,
    SamplerInfo,
    StoreOp,
    SurfaceTransform,
    Swapchain,
    Texture,
    TextureInfo,
    TextureType,
    TextureUsageBit,
    Viewport,
} from '../../gfx';
import { legacyCC } from '../../core/global-exports';
import { Vec3 } from '../../core/math/vec3';
import { Vec4 } from '../../core/math/vec4';
import { Camera } from '../../render-scene/scene/camera';
import { ShadowType } from '../../render-scene/scene/shadows';
import { Root } from '../../root';
import { IRenderPass, SetIndex, UBODeferredLight, UBOForwardLight, UBOLocal, UBOLocalEnum } from '../define';
import { PipelineSceneData } from '../pipeline-scene-data';
import { PipelineInputAssemblerData } from '../render-types';
import { DescriptorSetData, LayoutGraphData, LayoutGraphDataValue, PipelineLayoutData, RenderPhaseData, RenderStageData } from './layout-graph';
import { BasicPipeline } from './pipeline';
import {
    Blit,
    ClearView,
    ComputePass,
    ComputeSubpass,
    ComputeView,
    CopyPass,
    Dispatch,
    FormatView,
    ManagedBuffer,
    ManagedResource,
    ManagedTexture,
    MovePass,
    PersistentBuffer,
    PersistentTexture,
    RasterPass,
    RasterSubpass,
    RaytracePass,
    RenderData,
    RenderGraph,
    RenderGraphValue,
    RenderGraphVisitor,
    RenderQueue,
    RenderSwapchain,
    ResolvePass,
    ResourceDesc,
    ResourceGraph,
    ResourceGraphVisitor,
    ResourceTraits,
    SceneData,
    SubresourceView,
} from './render-graph';
import {
    AccessType,
    AttachmentType,
    QueueHint,
    ResourceDimension,
    ResourceFlags,
    ResourceResidency,
    SceneFlags,
    UpdateFrequency,
} from './types';
import { DefaultVisitor, depthFirstSearch, ReferenceGraphView } from './graph';
import { VectorGraphColorMap } from './effect';
import {
    bool,
    getDescriptorSetDataFromLayout,
    getRenderArea,
    updateGlobalDescBinding,
} from './define';
import { LightResource, SceneCulling } from './scene-culling';
import { Pass, RenderScene } from '../../render-scene';
import { WebProgramLibrary } from './web-program-library';
import { recordCommand, RenderQueue as RenderExeQueue } from './web-pipeline-types';
import { SpotLight, SphereLight } from '../../render-scene/scene';

class ResourceVisitor implements ResourceGraphVisitor {
    name: string;
    constructor (resName = '') {
        this.name = resName;
        if (context) {
            const ppl = context.pipeline as any;
            ppl.resourceUses.push(resName);
        }
    }
    set resName (value: string) {
        this.name = value;
    }
    checkTexture (name: string): boolean {
        const dTex = context.deviceTextures.get(name);
        if (!dTex) return false;
        const { width: descWidth, height: descHeight } = context.resourceGraph.getDesc(context.resourceGraph.vertex(name));
        const checkDimensions = (actualWidth: number, actualHeight: number): boolean => actualWidth === descWidth && actualHeight === descHeight;
        return (dTex.texture ? checkDimensions(dTex.texture.width, dTex.texture.height)
            : dTex.swapchain ? checkDimensions(dTex.swapchain.width, dTex.swapchain.height)
                : false);
    }
    createDeviceTex (value: PersistentTexture | Framebuffer | ManagedResource | RenderSwapchain): void {
        let dTex = context.deviceTextures.get(this.name);
        if (!dTex || !this.checkTexture(this.name)) {
            if (dTex?.texture) {
                dTex.texture.destroy();
            }
            dTex = new DeviceTexture(this.name, value);
            context.deviceTextures.set(this.name, dTex);
        }
    }
    checkBuffer (name: string): boolean {
        const dBuf = context.deviceBuffers.get(name)!;
        const resID = context.resourceGraph.vertex(this.name);
        const desc = context.resourceGraph.getDesc(resID);
        return dBuf.buffer!.size >= desc.width;
    }
    createDeviceBuf (value: ManagedBuffer | PersistentBuffer): void {
        let dBuf = context.deviceBuffers.get(this.name);
        if (!dBuf || !this.checkBuffer(this.name)) {
            if (dBuf?.buffer) {
                dBuf.buffer.destroy();
            }
            dBuf = new DeviceBuffer(this.name, value);
            context.deviceBuffers.set(this.name, dBuf);
        }
    }
    managed (value: ManagedResource): void {
        this.createDeviceTex(value);
    }
    managedBuffer (value: ManagedBuffer): void {
        this.createDeviceBuf(value);
    }
    managedTexture (value: ManagedTexture): void {
        // noop
    }
    persistentBuffer (value: PersistentBuffer): void {
        this.createDeviceBuf(value);
    }
    persistentTexture (value: PersistentTexture): void {
        this.createDeviceTex(value);
    }
    framebuffer (value: Framebuffer): void {
        this.createDeviceTex(value);
    }
    swapchain (value: RenderSwapchain): void {
        this.createDeviceTex(value);
    }
    formatView (value: FormatView): void {
        // do nothing
    }
    subresourceView (value: SubresourceView): void {
        // do nothing
    }
}

// Defining the recording interface
interface RecordingInterface {
    preRecord(): void;
    record(): void;
    postRecord(): void;
  }

let context: ExecutorContext;
class DeviceResource {
    protected _name: string;
    constructor (name: string) {
        this._name = name;
    }
    get name (): string { return this._name; }
}
class DeviceTexture extends DeviceResource {
    protected _texture: Texture | null = null;
    protected _swapchain: Swapchain | null = null;
    protected _framebuffer: Framebuffer | null = null;
    protected _desc: ResourceDesc | null = null;
    protected _trait: ResourceTraits | null = null;

    get texture (): Texture | null { return this._texture; }
    set framebuffer (val: Framebuffer | null) { this._framebuffer = val; }
    get framebuffer (): Framebuffer | null { return this._framebuffer; }
    get description (): ResourceDesc | null { return this._desc; }
    get trait (): ResourceTraits | null { return this._trait; }
    get swapchain (): Swapchain | null { return this._swapchain; }

    constructor (name: string, tex: PersistentTexture | Framebuffer | RenderSwapchain | ManagedResource) {
        super(name);
        const resGraph = context.resourceGraph;
        const verID = resGraph.vertex(name);
        this._desc = resGraph.getDesc(verID);
        this._trait = resGraph.getTraits(verID);

        if (tex instanceof Texture) {
            this._texture = tex;
        } else if (tex instanceof Framebuffer) {
            this._framebuffer = tex;
        } else if (tex instanceof RenderSwapchain) {
            this._swapchain = tex.swapchain;
        } else {
            this.createTextureFromDesc(this._desc);
        }
    }

    private createTextureFromDesc (desc: ResourceDesc): void {
        let type = TextureType.TEX2D;
        switch (desc.dimension) {
        case ResourceDimension.TEXTURE1D:
            type = TextureType.TEX1D;
            break;
        case ResourceDimension.TEXTURE3D:
            type = TextureType.TEX3D;
            break;
        default:
        }

        const usageFlags = [
            [ResourceFlags.COLOR_ATTACHMENT, TextureUsageBit.COLOR_ATTACHMENT],
            [ResourceFlags.DEPTH_STENCIL_ATTACHMENT, TextureUsageBit.DEPTH_STENCIL_ATTACHMENT],
            [ResourceFlags.INPUT_ATTACHMENT, TextureUsageBit.INPUT_ATTACHMENT],
            [ResourceFlags.SAMPLED, TextureUsageBit.SAMPLED],
            [ResourceFlags.STORAGE, TextureUsageBit.STORAGE],
            [ResourceFlags.TRANSFER_SRC, TextureUsageBit.TRANSFER_SRC],
            [ResourceFlags.TRANSFER_DST, TextureUsageBit.TRANSFER_DST],
        ].reduce((acc, [flag, bit]) => (desc.flags & flag ? acc | bit : acc), TextureUsageBit.NONE);

        this._texture = context.device.createTexture(new TextureInfo(
            type,
            usageFlags,
            desc.format,
            desc.width,
            desc.height,
        ));
    }

    release (): void {
        this.framebuffer?.destroy();
        this._framebuffer = null;
        this.texture?.destroy();
        this._texture = null;
    }
}

function isShadowMap (scene?: SceneData): boolean {
    const pSceneData: PipelineSceneData = cclegacy.director.root.pipeline.pipelineSceneData;
    return !!(pSceneData.shadows.enabled
        && pSceneData.shadows.type === ShadowType.ShadowMap
        && scene
        && (scene.flags & SceneFlags.SHADOW_CASTER) !== 0);
}

class DeviceBuffer extends DeviceResource {
    private _buffer: Buffer | null = null;

    get buffer (): Buffer | null {
        return this._buffer;
    }

    constructor (name: string, buffer: ManagedBuffer | PersistentBuffer) {
        super(name);
        const resGraph = context.resourceGraph;
        const verID = resGraph.vertex(name);
        const desc = resGraph.getDesc(verID);
        const bufferInfo = new BufferInfo(
            this.calculateBufferUsage(desc.flags),
            MemoryUsageBit.DEVICE,
            desc.width,
        );
        this._buffer = context.device.createBuffer(bufferInfo);
    }

    private calculateBufferUsage (flags: ResourceFlags): BufferUsageBit {
        const flagToUsageMap: [ResourceFlags, BufferUsageBit][] = [
            [ResourceFlags.INDIRECT, BufferUsageBit.INDIRECT],
            [ResourceFlags.UNIFORM, BufferUsageBit.UNIFORM],
            [ResourceFlags.STORAGE, BufferUsageBit.STORAGE],
            [ResourceFlags.TRANSFER_SRC, BufferUsageBit.TRANSFER_SRC],
            [ResourceFlags.TRANSFER_DST, BufferUsageBit.TRANSFER_DST],
        ];

        return flagToUsageMap.reduce((acc, [flag, usage]) => ((flags & flag) ? acc | usage : acc), BufferUsageBit.NONE);
    }

    release (): void {
        this._buffer?.destroy();
        this._buffer = null;
    }
}

const _vec4Array = new Float32Array(4);

class BlitDesc {
    private _isUpdate = false;
    private _isGatherLight = false;
    private _blit: Blit;
    private _screenQuad: PipelineInputAssemblerData | null = null;
    private _stageDesc: DescriptorSet | undefined;
    // If VOLUMETRIC_LIGHTING is turned on, it needs to be assigned
    private _lightVolumeBuffer: Buffer | null = null;
    private _lightMeterScale = 10000.0;
    private _lightBufferData!: Float32Array;

    get screenQuad (): PipelineInputAssemblerData | null { return this._screenQuad; }
    get blit (): Blit { return this._blit; }
    set blit (blit: Blit) { this._blit = blit; }
    get stageDesc (): DescriptorSet | undefined { return this._stageDesc; }

    constructor (blit: Blit) {
        this._blit = blit;
    }

    /**
     * @zh
     * 创建四边形输入汇集器。
     */
    protected _createQuadInputAssembler (): PipelineInputAssemblerData {
        return context.blit.pipelineIAData;
    }

    createScreenQuad (): void {
        if (!this._screenQuad) {
            this._screenQuad = this._createQuadInputAssembler();
        }
    }

    private _gatherVolumeLights (camera: Camera): void {
        if (!camera.scene) return;

        const pipeline = context.pipeline;
        const cmdBuff = context.commandBuffer;
        const sphereLights = camera.scene.sphereLights;
        const spotLights = camera.scene.spotLights;
        const exposure = camera.exposure;
        const maxLights = UBODeferredLight.LIGHTS_PER_PASS;
        const elementLen = Vec4.length; // sizeof(vec4) / sizeof(float32)
        const fieldLen = elementLen * maxLights;
        const _sphere = Sphere.create(0, 0, 0, 1);
        let idx = 0;

        const processLight = (light: SphereLight | SpotLight, isSpot: boolean): void => {
            if (idx >= maxLights) return;
            Sphere.set(_sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(_sphere, camera.frustum)) {
                // cc_lightPos
                Vec3.toArray(_vec4Array, light.position);
                _vec4Array[3] = isSpot ? 1 : 0;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 0);

                // cc_lightColor
                Vec3.toArray(_vec4Array, light.color);
                if (light.useColorTemperature) {
                    const tempRGB = light.colorTemperatureRGB;
                    _vec4Array[0] *= tempRGB.x;
                    _vec4Array[1] *= tempRGB.y;
                    _vec4Array[2] *= tempRGB.z;
                }
                _vec4Array[3] = pipeline.pipelineSceneData.isHDR
                    ? light.luminance * exposure * this._lightMeterScale
                    : light.luminance;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 1);

                // cc_lightSizeRangeAngle
                _vec4Array[0] = light.size;
                _vec4Array[1] = light.range;
                _vec4Array[2] = isSpot ? (light as SpotLight).spotAngle : 0.0;
                this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 2);

                if (isSpot) {
                    // cc_lightDir
                    Vec3.toArray(_vec4Array, (light as SpotLight).direction);
                    this._lightBufferData.set(_vec4Array, idx * elementLen + fieldLen * 3);
                }
                idx++;
            }
        };

        for (const light of sphereLights) {
            processLight(light, false);
        }

        for (const light of spotLights) {
            processLight(light, true);
        }

        // Set the count of lights in cc_lightDir[0].w
        const offset = fieldLen * 3 + 3;
        this._lightBufferData.set([idx], offset);
        cmdBuff.updateBuffer(this._lightVolumeBuffer!, this._lightBufferData);
    }

    update (): void {
        if (this.blit.sceneFlags & SceneFlags.VOLUMETRIC_LIGHTING && this.blit.camera && !this._isGatherLight) {
            this._gatherVolumeLights(this.blit.camera);
            this._isGatherLight = true;
            this._isUpdate = false;
        }
        if (!this._isUpdate) {
            this._stageDesc!.update();
            this._isUpdate = true;
        }
    }

    reset (): void {
        this._isUpdate = false;
        this._isGatherLight = false;
    }

    createStageDescriptor (): void {
        const blit = this.blit;
        const pass = blit.material!.passes[blit.passID];
        const device = context.device;
        this._stageDesc = context.blit.stageDescs.get(pass) || device.createDescriptorSet(new DescriptorSetInfo(pass.localSetLayout));
        context.blit.stageDescs.set(pass, this._stageDesc);
        if (this.blit.sceneFlags & SceneFlags.VOLUMETRIC_LIGHTING) {
            this._lightVolumeBuffer = context.blit.lightVolumeBuffer;
            const deferredLitsBufView = context.blit.deferredLitsBufView;
            this._lightBufferData = context.blit.lightBufferData;
            this._lightBufferData.fill(0);
            this._stageDesc.bindBuffer(UBOForwardLight.BINDING, deferredLitsBufView);
        }

        this._stageDesc.bindBuffer(UBOLocal.BINDING, context.blit.emptyLocalUBO);
    }
}

class DeviceComputeQueue implements RecordingInterface {
    preRecord (): void {
        // nothing to do
    }
    postRecord (): void {
        // nothing to do
    }
    private _devicePass: DeviceComputePass | undefined;
    private _hint: QueueHint = QueueHint.NONE;
    private _phaseID: number = getPhaseID('default');
    private _renderPhase: RenderPhaseData | null = null;
    private _descSetData: DescriptorSetData | null = null;
    private _layoutID = -1;
    private _isUploadInstance = false;
    private _isUploadBatched = false;
    private _queueId = -1;
    init (devicePass: DeviceComputePass, renderQueue: RenderQueue, id: number): void {
        this.reset();
        this.queueHint = renderQueue.hint;
        this.queueId = id;
        this._devicePass = devicePass;
        this._phaseID = cclegacy.rendering.getPhaseID(devicePass.passID, context.renderGraph.getLayout(id));
    }
    get phaseID (): number { return this._phaseID; }
    set layoutID (value: number) {
        this._layoutID = value;
        const layoutGraph = context.layoutGraph;
        this._renderPhase = layoutGraph.h(LayoutGraphDataValue.RenderPhase, value)
            ? layoutGraph.j<RenderPhaseData>(value)
            : null;
        const layout = layoutGraph.getLayout(value);
        this._descSetData = layout.descriptorSets.get(UpdateFrequency.PER_PHASE)!;
    }
    get layoutID (): number { return this._layoutID; }
    get descSetData (): DescriptorSetData | null { return this._descSetData; }
    get renderPhase (): RenderPhaseData | null { return this._renderPhase; }
    set queueId (val) { this._queueId = val; }
    get queueId (): number { return this._queueId; }
    set isUploadInstance (value: boolean) { this._isUploadInstance = value; }
    get isUploadInstance (): boolean { return this._isUploadInstance; }
    set isUploadBatched (value: boolean) { this._isUploadBatched = value; }
    get isUploadBatched (): boolean { return this._isUploadBatched; }

    reset (): void {
        this._isUploadInstance = false;
        this._isUploadBatched = false;
    }
    set queueHint (value: QueueHint) { this._hint = value; }
    get queueHint (): QueueHint { return this._hint; }
    get devicePass (): DeviceComputePass { return this._devicePass!; }

    record (): void {
        if (this._descSetData && this._descSetData.descriptorSet) {
            context.commandBuffer
                .bindDescriptorSet(SetIndex.COUNT, this._descSetData.descriptorSet);
        }
    }
}

class DeviceRenderQueue implements RecordingInterface {
    private _renderScenes: DeviceRenderScene[] = [];
    private _devicePass?: DeviceRenderPass;
    private _hint: QueueHint = QueueHint.NONE;
    private _graphQueue!: RenderQueue;
    private _phaseID: number = getPhaseID('default');
    private _renderPhase: RenderPhaseData | null = null;
    private _descSetData: DescriptorSetData | null = null;
    private _viewport: Viewport | null = null;
    private _scissor: Rect | null = null;
    private _layoutID = -1;
    private _isUploadInstance = false;
    private _isUploadBatched = false;
    get phaseID (): number { return this._phaseID; }
    set layoutID (value: number) {
        this._layoutID = value;
        const layoutGraph = context.layoutGraph;
        this._renderPhase = layoutGraph.h(LayoutGraphDataValue.RenderPhase, value)
            ? layoutGraph.j<RenderPhaseData>(value)
            : null;
        const layout = layoutGraph.getLayout(value);
        this._descSetData = layout.descriptorSets.get(UpdateFrequency.PER_PHASE)!;
    }
    get layoutID (): number { return this._layoutID; }
    get descSetData (): DescriptorSetData | null { return this._descSetData; }
    get renderPhase (): RenderPhaseData | null { return this._renderPhase; }
    get viewport (): Viewport | null { return this._viewport; }
    get scissor (): Rect | null { return this._scissor; }
    private _blitDesc: BlitDesc | null = null;
    private _queueId = -1;
    set queueId (val) { this._queueId = val; }
    get queueId (): number { return this._queueId; }
    set isUploadInstance (value: boolean) { this._isUploadInstance = value; }
    get isUploadInstance (): boolean { return this._isUploadInstance; }
    set isUploadBatched (value: boolean) { this._isUploadBatched = value; }
    get isUploadBatched (): boolean { return this._isUploadBatched; }
    init (devicePass, renderQueue: RenderQueue, id: number): void {
        this.reset();
        this._graphQueue = renderQueue;
        this.queueHint = renderQueue.hint;
        const viewport = this._viewport = renderQueue.viewport;
        if (viewport) {
            this._scissor = new Rect(viewport.left, viewport.top, viewport.width, viewport.height);
        }
        this.queueId = id;
        this._devicePass = devicePass;
        this._phaseID = cclegacy.rendering.getPhaseID(devicePass.passID, context.renderGraph.getLayout(id));
    }
    createBlitDesc (blit: Blit): void {
        if (!this._blitDesc) {
            this._blitDesc = new BlitDesc(blit);
        }
        this._blitDesc.createScreenQuad();
        this._blitDesc.createStageDescriptor();
    }

    setScene (sceneID: number, scene?: SceneData, blit?: Blit): DeviceRenderScene {
        const deviceScene = context.pools.addDeviceScene();
        deviceScene.init(this, sceneID, scene, blit);
        this._renderScenes.push(deviceScene);
        return deviceScene;
    }
    reset (): void {
        this._renderScenes.length = 0;
        this._isUploadInstance = false;
        this._isUploadBatched = false;
        this._blitDesc?.reset();
    }
    get graphQueue (): RenderQueue { return this._graphQueue; }
    get blitDesc (): BlitDesc | null { return this._blitDesc; }
    get renderScenes (): DeviceRenderScene[] { return this._renderScenes; }
    set queueHint (value: QueueHint) { this._hint = value; }
    get queueHint (): QueueHint { return this._hint; }
    get devicePass (): DeviceRenderPass { return this._devicePass!; }
    preRecord (): void {
        // nothing to do
    }

    record (): void {
        if (this._descSetData && this._descSetData.descriptorSet) {
            context.commandBuffer
                .bindDescriptorSet(SetIndex.COUNT, this._descSetData.descriptorSet);
        }
        this._renderScenes.forEach((scene) => {
            scene.record();
        });
    }

    postRecord (): void {
        // nothing to do
    }
}

class RenderPassLayoutInfo {
    protected _layoutID = 0;
    protected _vertID = -1;
    private _resID = -1;
    protected _stage: RenderStageData | null = null;
    protected _layout: PipelineLayoutData;
    protected _inputName: string;
    protected _descriptorSet: DescriptorSet | null = null;
    constructor (layoutId: number, vertId: number, input: [string, ComputeView[]]) {
        this._inputName = input[0];
        this._layoutID = layoutId;
        this._vertID = vertId;

        const lg = context.layoutGraph;
        this._stage = lg.j<RenderStageData>(layoutId);
        this._layout = lg.getLayout(layoutId);

        const layoutData = this._layout.descriptorSets.get(UpdateFrequency.PER_PASS);
        if (!layoutData) {
            return;
        }

        const layoutDesc = layoutData.descriptorSet!;
        const deviceTex = context.deviceTextures.get(this._inputName);
        const gfxTex = deviceTex?.texture;

        const deviceBuf = context.deviceBuffers.get(this._inputName);
        const gfxBuf = deviceBuf?.buffer;

        if (!gfxTex && !gfxBuf) {
            throw new Error(`Could not find texture with resource name ${this._inputName}`);
        }

        this._resID = context.resourceGraph.vertex(this._inputName);
        const samplerInfo = context.resourceGraph.getSampler(this._resID);

        // bind descriptors
        for (const descriptor of input[1]) {
            const descriptorName = descriptor.name;
            const descriptorID = lg.attributeIndex.get(descriptorName);
            if (descriptorID === undefined) {
                continue;
            }
            this.bindDescriptor(layoutDesc, descriptorID, gfxTex!, gfxBuf!, samplerInfo, input[1][0].accessType);
        }
    }

    private bindDescriptor (
        layoutDesc: DescriptorSet,
        descriptorID: number,
        gfxTex: Texture,
        gfxBuf: Buffer,
        samplerInfo: SamplerInfo,
        accessType: AccessType,
    ): void {
        const layoutData = this._layout.descriptorSets.get(UpdateFrequency.PER_PASS)!;
        const desc = context.resourceGraph.getDesc(this._resID);
        for (const block of layoutData.descriptorSetLayoutData.descriptorBlocks) {
            for (let i = 0; i < block.descriptors.length; ++i) {
                if (descriptorID === block.descriptors[i].descriptorID) {
                    if (gfxTex) {
                        layoutDesc.bindTexture(block.offset + i, gfxTex);
                        const renderData = context.renderGraph.getData(this._vertID);
                        const sampler = renderData.samplers.get(descriptorID) || context.device.getSampler(samplerInfo);
                        layoutDesc.bindSampler(block.offset + i, sampler);
                    } else if (desc.flags & ResourceFlags.STORAGE) {
                        const access = accessType !== AccessType.READ ? AccessFlagBit.COMPUTE_SHADER_WRITE : AccessFlagBit.COMPUTE_SHADER_READ_OTHER;
                        (layoutDesc as any).bindBuffer(block.offset + i, gfxBuf, 0, access);
                    } else {
                        layoutDesc.bindBuffer(block.offset + i, gfxBuf);
                    }
                    if (!this._descriptorSet) {
                        this._descriptorSet = layoutDesc;
                    }
                    break;
                }
            }
        }
    }

    get descriptorSet (): DescriptorSet | null { return this._descriptorSet; }
    get layoutID (): number { return this._layoutID; }
    get vertID (): number { return this._vertID; }
    get stage (): RenderStageData | null { return this._stage; }
    get layout (): PipelineLayoutData { return this._layout; }
}

const profilerViewport = new Viewport();
const renderPassArea = new Rect();
const resourceVisitor = new ResourceVisitor();
class DeviceRenderPass implements RecordingInterface {
    protected _renderPass: RenderPass;
    protected _framebuffer!: Framebuffer;
    protected _clearColor: Color[] = [];
    protected _deviceQueues: Map<number, DeviceRenderQueue> = new Map();
    protected _clearDepth = 1;
    protected _clearStencil = 0;
    protected _passID: number;
    protected _rasterID: number;
    protected _rasterPass: RasterPass;
    protected _layoutName: string;
    protected _viewport: Viewport | null = null;
    private _layout: RenderPassLayoutInfo | null = null;
    private _idxOfRenderData: number = 0;
    constructor (rasterID: number, rasterPass: RasterPass) {
        this._rasterID = rasterID;
        this._rasterPass = rasterPass;
        const device = context.device;
        this._layoutName = context.renderGraph.getLayout(rasterID);
        this._passID = cclegacy.rendering.getPassID(this._layoutName);
        const depAtt = new DepthStencilAttachment();
        depAtt.format = Format.DEPTH_STENCIL;
        const colors: ColorAttachment[] = [];
        const colorTexs: Texture[] = [];
        let depthTex: Texture | null = null;
        let swapchain: Swapchain | null = null;
        let framebuffer: Framebuffer | null = null;
        this._processRenderLayout(rasterPass);
        for (const [resName, rasterV] of rasterPass.rasterViews) {
            let resTex = context.deviceTextures.get(resName);
            if (!resTex) {
                this.visitResource(resName);
                resTex = context.deviceTextures.get(resName)!;
            } else {
                const resGraph = context.resourceGraph;
                const resId = resGraph.vertex(resName);
                const resFbo = resGraph.object(resId);
                if (resTex.framebuffer && resFbo instanceof Framebuffer && resTex.framebuffer !== resFbo) {
                    resTex.framebuffer = resFbo;
                } else if (resTex.texture) {
                    const desc = resGraph.getDesc(resId);
                    if (resTex.texture.width !== desc.width || resTex.texture.height !== desc.height) {
                        resTex.texture.resize(desc.width, desc.height);
                    }
                }
            }
            if (!swapchain) swapchain = resTex.swapchain;
            if (!framebuffer) framebuffer = resTex.framebuffer;
            if (rasterV.attachmentType === AttachmentType.RENDER_TARGET) {
                if (!resTex.swapchain && !resTex.framebuffer) colorTexs.push(resTex.texture!);
                const colAtt = new ColorAttachment();
                colAtt.format = resTex.description!.format;
                colAtt.sampleCount = resTex.description!.sampleCount;
                colAtt.loadOp = rasterV.loadOp;
                colAtt.storeOp = rasterV.storeOp;
                colAtt.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(
                    rasterV.loadOp === LoadOp.LOAD ? AccessFlagBit.COLOR_ATTACHMENT_WRITE : AccessFlagBit.NONE,
                    rasterV.storeOp === StoreOp.STORE ? AccessFlagBit.COLOR_ATTACHMENT_WRITE : AccessFlagBit.NONE,
                ));
                const currCol = new Color();
                currCol.copy(rasterV.clearColor);
                this._clearColor.push(currCol);
                colors.push(colAtt);
            } else if (rasterV.attachmentType === AttachmentType.DEPTH_STENCIL) {
                depAtt.depthStoreOp = rasterV.storeOp;
                depAtt.stencilStoreOp = rasterV.storeOp;
                depAtt.depthLoadOp = rasterV.loadOp;
                depAtt.stencilLoadOp = rasterV.loadOp;
                depAtt.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(
                    rasterV.loadOp === LoadOp.LOAD ? AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE : AccessFlagBit.NONE,
                    rasterV.storeOp === StoreOp.STORE ? AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE : AccessFlagBit.NONE,
                ));
                if (!resTex.swapchain && !resTex.framebuffer) {
                    depthTex = resTex.texture!;
                } else if (resTex.swapchain) {
                    depthTex = resTex.swapchain.depthStencilTexture;
                }
                this._clearDepth = rasterV.clearColor.x;
                this._clearStencil = rasterV.clearColor.y;
            }
        }
        if (colors.length === 0) {
            const colorAttachment = new ColorAttachment();
            colors.push(colorAttachment);
        }
        if (colorTexs.length === 0 && !swapchain && !framebuffer) {
            const currTex = device.createTexture(new TextureInfo());
            colorTexs.push(currTex);
        }
        const renderPassInfo = new RenderPassInfo();
        renderPassInfo.colorAttachments = colors;
        const depth = swapchain ? swapchain.depthStencilTexture : depthTex;
        if (depth) {
            renderPassInfo.depthStencilAttachment = depAtt;
        }
        this._renderPass = device.createRenderPass(renderPassInfo);
        this._createFramebuffer(
            framebuffer,
            swapchain ? [swapchain.colorTexture] : colorTexs,
            swapchain ? swapchain.depthStencilTexture : depthTex,
        );
    }
    get indexOfRD (): number { return this._idxOfRenderData; }
    get rasterID (): number { return this._rasterID; }
    get layoutName (): string { return this._layoutName; }
    get passID (): number { return this._passID; }
    get renderLayout (): RenderPassLayoutInfo | null { return this._layout; }
    get renderPass (): RenderPass { return this._renderPass; }
    get framebuffer (): Framebuffer { return this._framebuffer; }
    get clearColor (): Color[] { return this._clearColor; }
    get clearDepth (): number { return this._clearDepth; }
    get clearStencil (): number { return this._clearStencil; }
    get deviceQueues (): Map<number, DeviceRenderQueue> { return this._deviceQueues; }
    get viewport (): Viewport | null { return this._viewport; }
    addIdxOfRD (): void {
        this._idxOfRenderData++;
    }
    visitResource (resName: string): void {
        const resourceGraph = context.resourceGraph;
        const vertId = resourceGraph.vertex(resName);
        resourceVisitor.resName = resName;
        resourceGraph.visitVertex(resourceVisitor, vertId);
    }
    addQueue (queue: DeviceRenderQueue): void {
        this._deviceQueues.set(queue.queueId, queue);
    }
    preRecord (): void {
        context.passDescriptorSet = getDescriptorSetDataFromLayout(this.layoutName)!.descriptorSet;
    }
    protected _applyRenderLayout (input: [string, ComputeView[]]): void {
        const stageName = context.renderGraph.getLayout(this._rasterID);
        if (stageName) {
            const layoutGraph = context.layoutGraph;
            const stageId = layoutGraph.locateChild(layoutGraph.N, stageName);
            if (stageId !== 0xFFFFFFFF) {
                this._layout = new RenderPassLayoutInfo(stageId, this._rasterID, input);
            }
        }
    }
    getGlobalDescData (): DescriptorSetData {
        const stageId = context.layoutGraph.locateChild(context.layoutGraph.N, 'default');
        const layout = context.layoutGraph.getLayout(stageId);
        const layoutData = layout.descriptorSets.get(UpdateFrequency.PER_PASS)!;
        return layoutData;
    }

    protected _applyViewport (frameTex: Texture): void {
        this._viewport = null;
        const viewport = this._rasterPass.viewport;
        if (viewport.left !== 0
            || viewport.top !== 0
            || viewport.width !== 0
            || viewport.height !== 0) {
            this._viewport = viewport;
        }
    }

    protected _showProfiler (rect: Rect): void {
        const profiler = context.pipeline.profiler!;
        if (!profiler || !profiler.enabled) {
            return;
        }
        const profilerDesc = context.profilerDescriptorSet;
        const renderPass = this._renderPass;
        const cmdBuff = context.commandBuffer;
        const submodel = profiler.subModels[0];
        const pass = submodel.passes[0];
        const ia = submodel.inputAssembler;
        profilerViewport.width = rect.width;
        profilerViewport.height = rect.height;
        cmdBuff.setViewport(profilerViewport);
        cmdBuff.setScissor(rect);
        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, profilerDesc);
        recordCommand(cmdBuff, renderPass, pass, submodel.descriptorSet, submodel.shaders[0], ia);
    }

    beginPass (): void {
        const tex = this.framebuffer.colorTextures[0]!;
        this._applyViewport(tex);
        const cmdBuff = context.commandBuffer;

        if (this._viewport) {
            renderPassArea.x = this._viewport.left;
            renderPassArea.y = this._viewport.top;
            renderPassArea.width = this._viewport.width;
            renderPassArea.height = this._viewport.height;
        } else {
            renderPassArea.y = renderPassArea.x = 0;
            renderPassArea.width = tex.width;
            renderPassArea.height = tex.height;
        }
        cmdBuff.beginRenderPass(
            this.renderPass,
            this.framebuffer,
            renderPassArea,
            this.clearColor,
            this.clearDepth,
            this.clearStencil,
        );
        if (context.passDescriptorSet) {
            cmdBuff.bindDescriptorSet(
                SetIndex.GLOBAL,
                context.passDescriptorSet,
            );
        }
    }

    endPass (): void {
        const cmdBuff = context.commandBuffer;
        cmdBuff.endRenderPass();
    }
    // record common buffer
    record (): void {
        this.beginPass();
        for (const queue of this._deviceQueues.values()) {
            queue.record();
        }
        if (this._rasterPass.showStatistics) {
            this._showProfiler(renderPassArea);
        }
        this.endPass();
    }

    postRecord (): void {
        // nothing to do
    }

    private _processRenderLayout (pass: RasterPass): void {
        for (const cv of pass.computeViews) {
            this._applyRenderLayout(cv);
        }
        // update the layout descriptorSet
        if (this.renderLayout && this.renderLayout.descriptorSet) {
            this.renderLayout.descriptorSet.update();
        }
    }

    private _createFramebuffer (fbo: Framebuffer | null, cols: Texture[], depthTex: Texture | null): void {
        if (!fbo && !cols.length) return;
        if (this._framebuffer && fbo !== this._framebuffer) this._framebuffer.destroy();
        this._framebuffer = fbo || context.device.createFramebuffer(new FramebufferInfo(
            this._renderPass,
            cols,
            depthTex,
        ));
    }

    resetResource (id: number, pass: RasterPass): void {
        this._rasterID = id;
        this._rasterPass = pass;
        this._layoutName = context.renderGraph.getLayout(id);
        this._passID = cclegacy.rendering.getPassID(this._layoutName);
        this._deviceQueues.clear();
        this._idxOfRenderData = 0;
        let framebuffer: Framebuffer | null = null;
        const colTextures: Texture[] = [];
        const currFramebuffer = this._framebuffer;
        const currFBDepthTex = currFramebuffer?.depthStencilTexture ?? null;
        let depTexture = currFramebuffer ? currFBDepthTex : null;
        this._processRenderLayout(pass);
        const currentWidth = currFramebuffer?.width ?? 0;
        const currentHeight = currFramebuffer?.height ?? 0;

        let [width, height] = [0, 0];
        for (const [resName, rasterV] of pass.rasterViews) {
            if (rasterV.attachmentType !== AttachmentType.SHADING_RATE) {
                const resDesc = context.resourceGraph.getDesc(context.resourceGraph.vertex(resName));
                width = resDesc.width;
                height = resDesc.height;
                break;
            }
        }
        // The texture inside the fbo was destroyed？
        const isInsideTexDestroy = currFramebuffer?.colorTextures.some((colTex) => !colTex || colTex.getTextureHandle() === 0)
                               || (currFBDepthTex && currFBDepthTex.getTextureHandle() === 0);
        const needRebuild = width !== currentWidth || height !== currentHeight || (currFramebuffer?.needRebuild ?? false) || isInsideTexDestroy;
        for (const [resName, rasterV] of pass.rasterViews) {
            let deviceTex = context.deviceTextures.get(resName)!;
            if (!deviceTex) {
                this.visitResource(resName);
                deviceTex = context.deviceTextures.get(resName)!;
            }
            const resGraph = context.resourceGraph;
            const resId = resGraph.vertex(resName);
            const resFbo = resGraph.object(resId);
            const resDesc = resGraph.getDesc(resId);
            if (deviceTex.framebuffer && resFbo instanceof Framebuffer && (deviceTex.framebuffer !== resFbo || resFbo !== this._framebuffer)) {
                framebuffer = this._framebuffer = deviceTex.framebuffer = resFbo;
            } else if (deviceTex.texture && needRebuild) {
                const gfxTex = deviceTex.texture;
                gfxTex.resize(resDesc.width, resDesc.height);
                if (rasterV.attachmentType === AttachmentType.RENDER_TARGET) {
                    colTextures.push(gfxTex);
                } else if (rasterV.attachmentType === AttachmentType.DEPTH_STENCIL) {
                    depTexture = gfxTex;
                }
            }
        }
        this._createFramebuffer(framebuffer, colTextures, depTexture);
    }
}

class ComputePassInfo {
    protected _id!: number;
    protected _pass!: ComputePass;
    get id (): number { return this._id; }
    get pass (): ComputePass { return this._pass; }
    applyInfo (id: number, pass: ComputePass): void {
        this._id = id;
        this._pass = pass;
    }
}

class DeviceComputePass implements RecordingInterface {
    protected _deviceQueues: DeviceComputeQueue[] = [];
    protected _passID: number;
    protected _layoutName: string;
    protected _viewport: Viewport | null = null;
    private _computeInfo: ComputePassInfo;
    private _layout: RenderPassLayoutInfo | null = null;
    constructor (passInfo: ComputePassInfo) {
        this._computeInfo = passInfo;
        this._layoutName = context.renderGraph.getLayout(passInfo.id);
        this._passID = cclegacy.rendering.getPassID(this._layoutName);

        for (const cv of passInfo.pass.computeViews) {
            let resTex = context.deviceTextures.get(cv[0]);
            if (!resTex) {
                this.visitResource(cv[0]);
                resTex = context.deviceTextures.get(cv[0])!;
            }
            this._applyRenderLayout(cv);
        }
        // update the layout descriptorSet
        if (this.renderLayout && this.renderLayout.descriptorSet) {
            this.renderLayout.descriptorSet.update();
        }
    }
    preRecord (): void {
        context.passDescriptorSet = getDescriptorSetDataFromLayout(this.layoutName)!.descriptorSet;
    }
    postRecord (): void {
        // nothing to do
    }
    get layoutName (): string { return this._layoutName; }
    get passID (): number { return this._passID; }
    get renderLayout (): RenderPassLayoutInfo | null { return this._layout; }

    get deviceQueues (): DeviceComputeQueue[] { return this._deviceQueues; }
    get computePassInfo (): ComputePassInfo { return this._computeInfo; }
    visitResource (resName: string): void {
        const resourceGraph = context.resourceGraph;
        const vertId = resourceGraph.vertex(resName);
        resourceVisitor.resName = resName;
        resourceGraph.visitVertex(resourceVisitor, vertId);
    }
    addQueue (queue: DeviceComputeQueue): void { this._deviceQueues.push(queue); }
    protected _applyRenderLayout (input: [string, ComputeView[]]): void {
        const stageName = context.renderGraph.getLayout(this._computeInfo.id);
        if (stageName) {
            const layoutGraph = context.layoutGraph;
            const stageId = layoutGraph.locateChild(layoutGraph.N, stageName);
            if (stageId !== 0xFFFFFFFF) {
                this._layout = new RenderPassLayoutInfo(stageId, this._computeInfo.id, input);
            }
        }
    }
    getGlobalDescData (): DescriptorSetData {
        const stageId = context.layoutGraph.locateChild(context.layoutGraph.N, 'default');
        const layout = context.layoutGraph.getLayout(stageId);
        const layoutData = layout.descriptorSets.get(UpdateFrequency.PER_PASS)!;
        return layoutData;
    }

    // record common buffer
    record (): void {
        const cmdBuff = context.commandBuffer;
        if (context.passDescriptorSet) {
            cmdBuff.bindDescriptorSet(
                SetIndex.GLOBAL,
                context.passDescriptorSet,
            );
        }

        for (const queue of this._deviceQueues) {
            queue.record();
        }
        const renderData = context.renderGraph.getData(this._computeInfo.id);
        updateGlobalDescBinding(renderData, -1, 0, context.renderGraph.getLayout(this._computeInfo.id));
    }

    resetResource (id: number, pass: ComputePass): void {
        this._computeInfo.applyInfo(id, pass);
        this._layoutName = context.renderGraph.getLayout(id);
        this._passID = cclegacy.rendering.getPassID(this._layoutName);
        this._deviceQueues.length = 0;
        for (const cv of this._computeInfo.pass.computeViews) {
            this._applyRenderLayout(cv);
        }
        // update the layout descriptorSet
        if (this.renderLayout && this.renderLayout.descriptorSet) {
            this.renderLayout.descriptorSet.update();
        }
    }
}

const sceneViewport = new Viewport();
class DeviceRenderScene implements RecordingInterface {
    protected _currentQueue!: DeviceRenderQueue;
    protected _renderPass!: RenderPass;
    protected _scene: RenderScene | null = null;
    protected _camera: Camera | null = null;
    protected _sceneData?: SceneData;
    protected _blit?: Blit;
    protected _sceneID: number = -1;
    get blit (): Blit | undefined { return this._blit; }
    get sceneData (): SceneData | undefined { return this._sceneData; }
    get sceneID (): number { return this._sceneID; }
    get camera (): Camera | null { return this._camera; }
    preRecord (): void {
        if (this._blit) {
            this._currentQueue.createBlitDesc(this._blit);
            this._currentQueue.blitDesc!.update();
        }
        context.lightResource.buildLightBuffer(context.commandBuffer);
        context.lightResource.tryUpdateRenderSceneLocalDescriptorSet(context.culling);
    }
    postRecord (): void {
        // nothing to do
    }
    init (queue: DeviceRenderQueue, sceneID: number, scene?: SceneData, blit?: Blit): void {
        this._currentQueue = queue;
        this._sceneData = scene;
        this._blit = blit;
        this._sceneID = sceneID;
        this._renderPass = queue.devicePass.renderPass;
        const camera = scene && scene.camera ? scene.camera : null;
        if (camera) {
            this._scene = camera.scene;
            this._camera = camera;
        }
    }

    protected _recordUI (): void {
        const batches = this.camera!.scene!.batches;
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            let visible = false;
            if (this.camera!.visibility & batch.visFlags) {
                visible = true;
            }

            if (!visible) continue;
            // shaders.length always equals actual used passes.length
            const count = batch.shaders.length;
            for (let j = 0; j < count; j++) {
                const pass = batch.passes[j];
                if (pass.phaseID !== this._currentQueue.phaseID) continue;
                const shader = batch.shaders[j];
                const ia: InputAssembler = batch.inputAssembler!;
                const ds = batch.descriptorSet!;
                recordCommand(context.commandBuffer, this._renderPass, pass, ds, shader, ia);
            }
        }
    }

    private _recordBlit (): void {
        if (!this.blit) { return; }

        const blit = this.blit;
        const currMat = blit.material!;
        const pass = currMat.passes[blit.passID];
        pass.update();
        const shader = pass.getShaderVariant();
        const blitDesc = this._currentQueue.blitDesc!;
        const screenIa = blitDesc.screenQuad!.quadIA;
        recordCommand(context.commandBuffer, this._renderPass, pass, blitDesc.stageDesc!, shader, screenIa);
    }

    protected _updateGlobal (data: RenderData, sceneId: number): void {
        const devicePass = this._currentQueue.devicePass;
        devicePass.addIdxOfRD();
        updateGlobalDescBinding(data, sceneId, devicePass.indexOfRD, context.renderGraph.getLayout(devicePass.rasterID));
    }

    protected _updateRenderData (): void {
        const devicePass = this._currentQueue.devicePass;
        const rasterId = devicePass.rasterID;
        const passRenderData = context.renderGraph.getData(rasterId);
        const sceneId = this.sceneID;
        // CCGlobal
        this._updateGlobal(passRenderData, sceneId);
        // CCCamera, CCShadow, CCCSM
        const queueId = this._currentQueue.queueId;
        const queueRenderData = context.renderGraph.getData(queueId)!;
        this._updateGlobal(queueRenderData, sceneId);
        context.passDescriptorSet?.update();
    }

    private _applyViewport (): void {
        const queueViewport = this._currentQueue.viewport;
        if (queueViewport) {
            context.commandBuffer.setViewport(queueViewport);
            context.commandBuffer.setScissor(this._currentQueue.scissor!);
        } else if (!this._currentQueue.devicePass.viewport) {
            const texture = this._currentQueue.devicePass.framebuffer.colorTextures[0]!;
            const lightInfo = this.sceneData ? this.sceneData.light : null;
            const area = isShadowMap(this.sceneData) && this.sceneData && lightInfo!.light
                ? getRenderArea(this.camera!, texture.width, texture.height, lightInfo!.light, lightInfo!.level)
                : getRenderArea(this.camera!, texture.width, texture.height);
            sceneViewport.left = area.x;
            sceneViewport.top = area.y;
            sceneViewport.width = area.width;
            sceneViewport.height = area.height;
            context.commandBuffer.setViewport(sceneViewport);
            context.commandBuffer.setScissor(area);
        }
    }

    public record (): void {
        const devicePass = this._currentQueue.devicePass;
        const sceneCulling = context.culling;
        this._updateRenderData();
        this._applyViewport();

        // Currently processing blit and camera first
        if (this.blit) {
            this._recordBlit();
            return;
        }
        const rqQuery = sceneCulling.renderQueueQueryIndex.get(this.sceneID)!;
        const rq = sceneCulling.renderQueues[rqQuery.renderQueueTarget];
        const graphSceneData = this.sceneData!;
        const isProbe = bool(graphSceneData.flags & SceneFlags.REFLECTION_PROBE);
        if (isProbe) rq.probeQueue.applyMacro();
        rq.recordCommands(context.commandBuffer, this._renderPass, graphSceneData.flags);
        if (isProbe) rq.probeQueue.removeMacro();
        if (graphSceneData.flags & SceneFlags.GEOMETRY) {
            this.camera!.geometryRenderer?.render(
                devicePass.renderPass,
                context.commandBuffer,
                context.pipeline.pipelineSceneData,
            );
        }
        if (graphSceneData.flags & SceneFlags.UI) {
            this._recordUI();
        }
    }
}

class ExecutorPools {
    constructor () {
        this.deviceQueuePool = new RecyclePool<DeviceRenderQueue>((): DeviceRenderQueue => new DeviceRenderQueue(), 16);
        this.deviceScenePool = new RecyclePool<DeviceRenderScene>((): DeviceRenderScene => new DeviceRenderScene(), 16);
        this.computeQueuePool = new RecyclePool<DeviceComputeQueue>((): DeviceComputeQueue => new DeviceComputeQueue(), 16);
        this.passPool = new RecyclePool<IRenderPass>((): { priority: number; hash: number; depth: number; shaderId: number; subModel: any; passIdx: number; } => ({
            priority: 0,
            hash: 0,
            depth: 0,
            shaderId: 0,
            subModel: null!,
            passIdx: 0,
        }), 64);
    }
    addDeviceQueue (): DeviceRenderQueue {
        return this.deviceQueuePool.add();
    }
    addComputeQueue (): DeviceComputeQueue {
        return this.computeQueuePool.add();
    }
    addDeviceScene (): DeviceRenderScene {
        return this.deviceScenePool.add();
    }
    reset (): void {
        this.deviceQueuePool.reset();
        this.computeQueuePool.reset();
        this.deviceScenePool.reset();
    }
    readonly deviceQueuePool: RecyclePool<DeviceRenderQueue>;
    readonly computeQueuePool: RecyclePool<DeviceComputeQueue>;
    readonly passPool: RecyclePool<IRenderPass>;
    readonly deviceScenePool: RecyclePool<DeviceRenderScene>;
}

const vbData = new Float32Array(4 * 4);
const quadRect = new Rect();
// The attribute length of the volume light
const volLightAttrCount = 5;

class BlitInfo {
    private _pipelineIAData: PipelineInputAssemblerData;
    private _context: ExecutorContext;
    private _width: number;
    private _height: number;
    private _lightVolumeBuffer!: Buffer;
    private _lightBufferData!: Float32Array;
    private _deferredLitsBufView!: Buffer;
    private _localUBO!: Buffer;
    private _stageDescs: Map<Pass, DescriptorSet> = new Map();
    get pipelineIAData (): PipelineInputAssemblerData {
        return this._pipelineIAData;
    }
    get deferredLitsBufView (): Buffer {
        return this._deferredLitsBufView;
    }
    get lightVolumeBuffer (): Buffer {
        return this._lightVolumeBuffer;
    }
    get lightBufferData (): Float32Array {
        return this._lightBufferData;
    }
    get stageDescs (): Map<Pass, DescriptorSet> {
        return this._stageDescs;
    }
    get emptyLocalUBO (): Buffer {
        return this._localUBO;
    }
    constructor (context: ExecutorContext) {
        this._context = context;
        this._width = context.width;
        this._height = context.height;
        this._pipelineIAData = this._createQuadInputAssembler();
        const vb = this._genQuadVertexData(SurfaceTransform.IDENTITY, new Rect(0, 0, context.width, context.height));
        this._pipelineIAData.quadVB!.update(vb);
        this._createLightVolumes();
        const size: number = UBOLocalEnum.SIZE;
        this._localUBO = context.device.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            size,
            size,
        ));
    }

    resize (width, height): void {
        if (width !== this._width || height !== this._height) {
            quadRect.y = quadRect.x = 0;
            quadRect.width = width;
            quadRect.height = height;
            const vb = this._genQuadVertexData(SurfaceTransform.IDENTITY, quadRect);
            this._pipelineIAData.quadVB!.update(vb);
        }
    }

    private _createLightVolumes (): void {
        const device = this._context.root.device;
        let totalSize = Float32Array.BYTES_PER_ELEMENT * volLightAttrCount * 4 * UBODeferredLight.LIGHTS_PER_PASS;
        totalSize = Math.ceil(totalSize / device.capabilities.uboOffsetAlignment) * device.capabilities.uboOffsetAlignment;

        this._lightVolumeBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            totalSize,
            device.capabilities.uboOffsetAlignment,
        ));

        this._deferredLitsBufView = device.createBuffer(new BufferViewInfo(this._lightVolumeBuffer, 0, totalSize));
        this._lightBufferData = new Float32Array(totalSize / Float32Array.BYTES_PER_ELEMENT);
    }

    private _genQuadVertexData (surfaceTransform: SurfaceTransform, renderArea: Rect): Float32Array {
        const minX = renderArea.x / this._context.width;
        const maxX = (renderArea.x + renderArea.width) / this._context.width;
        let minY = renderArea.y / this._context.height;
        let maxY = (renderArea.y + renderArea.height) / this._context.height;

        // Flip the minimum maximum Y value according to the sign of the Y-axis of the screen space
        if (this._context.root.device.capabilities.screenSpaceSignY > 0) {
            [minY, maxY] = [maxY, minY];
        }
        const vbData = new Float32Array(16);
        const fillVertices = (x1, y1, u1, v1, x2, y2, u2, v2, x3, y3, u3, v3, x4, y4, u4, v4): void => {
            vbData.set([x1, y1, u1, v1, x2, y2, u2, v2, x3, y3, u3, v3, x4, y4, u4, v4]);
        };
        switch (surfaceTransform) {
        case SurfaceTransform.IDENTITY:
            fillVertices(-1, -1, minX, maxY, 1, -1, maxX, maxY, -1, 1, minX, minY, 1, 1, maxX, minY);
            break;
        case SurfaceTransform.ROTATE_90:
            fillVertices(-1, -1, maxX, maxY, 1, -1, maxX, minY, -1, 1, minX, maxY, 1, 1, minX, minY);
            break;
        case SurfaceTransform.ROTATE_180:
            fillVertices(-1, -1, minX, minY, 1, -1, maxX, minY, -1, 1, minX, maxY, 1, 1, maxX, maxY);
            break;
        case SurfaceTransform.ROTATE_270:
            fillVertices(-1, -1, minX, minY, 1, -1, minX, maxY, -1, 1, maxX, minY, 1, 1, maxX, maxY);
            break;
        default:
        }
        return vbData;
    }

    private _createQuadInputAssembler (): PipelineInputAssemblerData {
        // create vertex buffer
        const inputAssemblerData = new PipelineInputAssemblerData();

        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;
        const device = cclegacy.director.root.device;
        const quadVB: Buffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE | MemoryUsageBit.HOST,
            vbSize,
            vbStride,
        ));

        if (!quadVB) {
            return inputAssemblerData;
        }

        // create index buffer
        const ibStride = Uint16Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;

        const quadIB: Buffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));

        if (!quadIB) {
            return inputAssemblerData;
        }

        const indices = new Uint16Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;

        quadIB.update(indices.buffer);

        // create input assembler

        const attributes = new Array<Attribute>(2);
        attributes[0] = new Attribute('a_position', Format.RG32F);
        attributes[1] = new Attribute('a_texCoord', Format.RG32F);

        const quadIA = device.createInputAssembler(new InputAssemblerInfo(
            attributes,
            [quadVB],
            quadIB,
        ));

        inputAssemblerData.quadIB = quadIB;
        inputAssemblerData.quadVB = quadVB;
        inputAssemblerData.quadIA = quadIA;
        return inputAssemblerData;
    }
}

class ExecutorContext {
    constructor (
        pipeline: BasicPipeline,
        device: Device,
        resourceGraph: ResourceGraph,
        renderGraph: RenderGraph,
        layoutGraph: LayoutGraphData,
        width: number,
        height: number,
        descriptorSet = null,
    ) {
        this.pipeline = pipeline;
        this.device = device;
        this.commandBuffer = device.commandBuffer;
        this.pipelineSceneData = pipeline.pipelineSceneData;
        this.resourceGraph = resourceGraph;
        this.renderGraph = renderGraph;
        this.root = legacyCC.director.root;
        this.layoutGraph = layoutGraph;
        this.width = width;
        this.height = height;
        this.pools = new ExecutorPools();
        this.blit = new BlitInfo(this);
        this.culling = new SceneCulling();
        this.passDescriptorSet = descriptorSet;
        this.profilerDescriptorSet = getDescriptorSetDataFromLayout('default')!.descriptorSet!;
    }
    reset (): void {
        this.culling.clear();
        this.pools.reset();
        this.cullCamera = null;
        this.lightResource.clear();
    }
    resize (width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.blit.resize(width, height);
    }
    readonly device: Device;
    readonly pipeline: BasicPipeline;
    readonly commandBuffer: CommandBuffer;
    readonly pipelineSceneData: PipelineSceneData;
    readonly resourceGraph: ResourceGraph;
    readonly devicePasses: Map<number, DeviceRenderPass> = new Map<number, DeviceRenderPass>();
    readonly deviceTextures: Map<string, DeviceTexture> = new Map<string, DeviceTexture>();
    readonly deviceBuffers: Map<string, DeviceBuffer> = new Map<string, DeviceBuffer>();
    readonly layoutGraph: LayoutGraphData;
    readonly root: Root;
    readonly pools: ExecutorPools;
    readonly blit: BlitInfo;
    readonly culling: SceneCulling;
    lightResource: LightResource = new LightResource();
    renderGraph: RenderGraph;
    width: number;
    height: number;
    cullCamera;
    passDescriptorSet: DescriptorSet | null;
    profilerDescriptorSet: DescriptorSet;
}

export class Executor {
    constructor (
        pipeline: BasicPipeline,
        device: Device,
        resourceGraph: ResourceGraph,
        layoutGraph: LayoutGraphData,
        width: number,
        height: number,
    ) {
        context = this._context = new ExecutorContext(
            pipeline,
            device,
            resourceGraph,
            new RenderGraph(),
            layoutGraph,
            width,
            height,
        );
        const programLib: WebProgramLibrary = cclegacy.rendering.programLib;
        context.lightResource.init(programLib, device, 16);
    }

    resize (width: number, height: number): void {
        context.resize(width, height);
    }

    private _removeDeviceResource (): void {
        const pipeline: any = context.pipeline;
        const resourceUses = pipeline.resourceUses;
        const deletes: string[] = [];
        const deviceTexs = context.deviceTextures;
        for (const [name, dTex] of deviceTexs) {
            const resId = context.resourceGraph.vertex(name);
            const trait = context.resourceGraph.getTraits(resId);
            if (!resourceUses.includes(name)) {
                switch (trait.residency) {
                case ResourceResidency.MANAGED:
                    deletes.push(name);
                    break;
                default:
                }
            }
        }
        for (const name of deletes) {
            deviceTexs.get(name)!.release();
            deviceTexs.delete(name);
        }

        const deletesBuff: string[] = [];
        const deviceBuffs = context.deviceBuffers;
        for (const [name, dBuff] of deviceBuffs) {
            const resId = context.resourceGraph.vertex(name);
            const trait = context.resourceGraph.getTraits(resId);
            if (!resourceUses.includes(name)) {
                switch (trait.residency) {
                case ResourceResidency.MANAGED:
                    deletesBuff.push(name);
                    break;
                default:
                }
            }
        }
        for (const name of deletesBuff) {
            deviceBuffs.get(name)!.release();
            deviceBuffs.delete(name);
        }
        resourceUses.length = 0;
    }

    execute (rg: RenderGraph): void {
        context.renderGraph = rg;
        context.reset();
        const cmdBuff = context.commandBuffer;
        const culling = context.culling;
        culling.buildRenderQueues(rg, context.layoutGraph, context.pipelineSceneData);
        context.lightResource.buildLights(culling, context.pipelineSceneData.isHDR, context.pipelineSceneData.shadows);
        this._removeDeviceResource();
        cmdBuff.begin();
        culling.uploadInstancing(cmdBuff);
        if (!this._visitor) this._visitor = new RenderVisitor();
        depthFirstSearch(this._visitor.graphView, this._visitor, this._visitor.colorMap);
        cmdBuff.end();
        context.device.queue.submit([cmdBuff]);
    }

    release (): void {
        context.devicePasses.clear();
        for (const [k, v] of context.deviceTextures) {
            v.release();
        }
        context.deviceTextures.clear();

        for (const [k, v] of context.deviceBuffers) {
            v.release();
        }
        context.deviceBuffers.clear();
    }
    readonly _context: ExecutorContext;
    private _visitor: RenderVisitor | undefined;
}

class BaseRenderVisitor {
    public queueID = 0xFFFFFFFF;
    public sceneID = 0xFFFFFFFF;
    public passID = 0xFFFFFFFF;
    public dispatchID = 0xFFFFFFFF;
    public currPass: DeviceRenderPass | DeviceComputePass | undefined;
    public currQueue: DeviceRenderQueue |DeviceComputeQueue | undefined;
    public rg: RenderGraph;
    constructor () {
        this.rg = context.renderGraph;
    }
    protected _isRasterPass (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.RasterPass, u);
    }
    protected isComputePass (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.Compute, u);
    }
    protected isDispatch (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.Dispatch, u);
    }
    protected _isQueue (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.Queue, u);
    }
    protected _isScene (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.Scene, u);
    }
    protected _isBlit (u: number): boolean {
        return context.renderGraph.h(RenderGraphValue.Blit, u);
    }
    applyID (id: number): void {
        if (this._isRasterPass(id)) {
            this.passID = id;
        } else if (this._isQueue(id)) {
            this.queueID = id;
        } else if (this._isScene(id) || this._isBlit(id)) {
            this.sceneID = id;
        } else if (this.isComputePass(id)) {
            this.passID = id;
        } else if (this.isDispatch(id)) {
            this.dispatchID = id;
        }
    }
}

class PreRenderVisitor extends BaseRenderVisitor implements RenderGraphVisitor {
    constructor () {
        super();
    }
    clear (value: ClearView[]): void {
        // do nothing
    }
    viewport (value: Viewport): void {
        // do nothing
    }
    rasterPass (pass: RasterPass): void {
        if (!this.rg.getValid(this.passID)) return;
        const devicePasses = context.devicePasses;
        const passHash = pass.hashValue;
        this.currPass = devicePasses.get(passHash);
        if (!this.currPass) {
            this.currPass = new DeviceRenderPass(this.passID, pass);
            devicePasses.set(passHash, this.currPass);
        } else {
            this.currPass.resetResource(this.passID, pass);
        }
        this.currPass.preRecord();
    }
    rasterSubpass (value: RasterSubpass): void {
        // do nothing
    }
    computeSubpass (value: ComputeSubpass): void {
        // do nothing
    }
    resolve (value: ResolvePass): void {
        // do nothing
    }
    move (value: MovePass): void {
        // do nothing
    }
    raytrace (value: RaytracePass): void {
        // do nothing
    }
    compute (pass: ComputePass): void {
        if (!this.rg.getValid(this.passID)) return;
        const devicePasses = context.devicePasses;
        const computeInfo = new ComputePassInfo();
        computeInfo.applyInfo(this.passID, pass);
        this.currPass = new DeviceComputePass(computeInfo);
        this.currPass.preRecord();
        this.currPass.record();
    }
    copy (value: CopyPass): void {
        if (value.uploadPairs.length) {
            for (const upload of value.uploadPairs) {
                const resBuffers = context.deviceBuffers;
                const resourceGraph = context.resourceGraph;
                const vertId = resourceGraph.vertex(upload.target);
                resourceVisitor.resName = upload.target;
                resourceGraph.visitVertex(resourceVisitor, vertId);

                const gfxBuffer = resBuffers.get(upload.target);
                context.device.commandBuffer.updateBuffer(gfxBuffer!.buffer!, upload.source, upload.source.byteLength);
            }
        }
    }
    queue (value: RenderQueue): void {
        if (!this.rg.getValid(this.queueID)) return;
        let deviceQueue: DeviceComputeQueue | DeviceRenderQueue;
        if (this.currPass instanceof DeviceRenderPass) {
            deviceQueue = context.pools.addDeviceQueue();
            deviceQueue.init(this.currPass, value, this.queueID);
            this.currQueue = deviceQueue;
            this.currPass.addQueue(deviceQueue);
        } else {
            deviceQueue = context.pools.addComputeQueue();
            deviceQueue.init(this.currPass!, value, this.queueID);
            this.currQueue = deviceQueue;
            this.currPass!.addQueue(deviceQueue);
        }
        const layoutName = this.rg.getLayout(this.queueID);
        if (layoutName) {
            const layoutGraph = context.layoutGraph;
            if (this.currPass!.renderLayout) {
                const layoutId = layoutGraph.locateChild(this.currPass!.renderLayout.layoutID, layoutName);
                this.currQueue.layoutID = layoutId;
            }
        }
        this.currQueue.preRecord();
    }
    scene (value: SceneData): void {
        if (!this.rg.getValid(this.sceneID)) return;
        const renderQueue = this.currQueue as DeviceRenderQueue;
        const renderScene = renderQueue.setScene(this.sceneID, value);
        renderScene.preRecord();
    }
    blit (value: Blit): void {
        if (!this.rg.getValid(this.sceneID)) return;
        const renderQueue = this.currQueue as DeviceRenderQueue;
        const renderScene = renderQueue.setScene(this.sceneID, undefined, value);
        renderScene.preRecord();
    }
    dispatch (value: Dispatch): void {
        let pso: PipelineState | null = null;
        const devicePass = this.currPass as DeviceComputePass;
        const pass = value.material?.passes[value.passID];
        pass?.update();
        const shader = pass?.getShaderVariant();

        if (pass !== null && shader !== null) {
            const psoInfo = new PipelineStateInfo(
                shader,
                pass?.pipelineLayout,
            );
            psoInfo.bindPoint = PipelineBindPoint.COMPUTE;
            pso = deviceManager.gfxDevice.createPipelineState(psoInfo);
        }
        const cmdBuff = context.commandBuffer;
        if (pso) {
            cmdBuff.bindPipelineState(pso);
            const layoutStage = devicePass.renderLayout;
            const layoutDesc = layoutStage!.descriptorSet!;
            cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, layoutDesc);
        }

        const gx = value.threadGroupCountX;
        const gy = value.threadGroupCountY;
        const gz = value.threadGroupCountZ;
        (cmdBuff as any).dispatch(new DispatchInfo(gx, gy, gz));
    }
}

class PostRenderVisitor extends BaseRenderVisitor implements RenderGraphVisitor {
    constructor () {
        super();
    }
    clear (value: ClearView[]): void {
        // do nothing
    }
    viewport (value: Viewport): void {
        // do nothing
    }
    rasterPass (pass: RasterPass): void {
        const devicePasses = context.devicePasses;
        const passHash = pass.hashValue;
        const currPass = devicePasses.get(passHash);
        if (!currPass) return;
        this.currPass = currPass;
        this.currPass.record();
    }
    rasterSubpass (value: RasterSubpass): void {
        // do nothing
    }
    computeSubpass (value: ComputeSubpass): void {
        // do nothing
    }
    resolve (value: ResolvePass): void {
        // do nothing
    }
    compute (value: ComputePass): void {
        // do nothing
    }
    copy (value: CopyPass): void {
        // do nothing
    }
    move (value: MovePass): void {
        // do nothing
    }
    raytrace (value: RaytracePass): void {
        // do nothing
    }
    queue (value: RenderQueue): void {
        // collect scene results
    }
    scene (value: SceneData): void {
        // scene command list finished
    }
    blit (value: Blit): void {
        // do nothing
    }
    dispatch (value: Dispatch): void {
        // do nothing
    }
}

export class RenderVisitor extends DefaultVisitor {
    private _preVisitor: PreRenderVisitor;
    private _postVisitor: PostRenderVisitor;
    private _graphView: ReferenceGraphView<RenderGraph>;
    private _colorMap: VectorGraphColorMap;
    constructor () {
        super();
        this._preVisitor = new PreRenderVisitor();
        this._postVisitor = new PostRenderVisitor();
        this._graphView = new ReferenceGraphView<RenderGraph>(context.renderGraph);
        this._colorMap = new VectorGraphColorMap(context.renderGraph.nv());
    }

    get graphView (): ReferenceGraphView<RenderGraph> { return this._graphView; }
    get colorMap (): VectorGraphColorMap { return this._colorMap; }
    discoverVertex (u: number, gv: ReferenceGraphView<RenderGraph>): void {
        const g = gv.g;
        this._preVisitor.applyID(u);
        g.visitVertex(this._preVisitor, u);
    }
    finishVertex (v: number, gv: ReferenceGraphView<RenderGraph>): void {
        const g = gv.g;
        g.visitVertex(this._postVisitor, v);
    }
}
