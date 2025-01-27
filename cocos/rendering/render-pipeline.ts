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

import { ccclass, displayOrder, serializable, type } from 'cc.decorator';
import { systemInfo } from 'pal/system-info';
import { sceneCulling, validPunctualLightsCulling } from './scene-culling';
import { Asset } from '../asset/assets/asset';
import { AccessFlagBit, Attribute, Buffer, BufferInfo, BufferUsageBit, ClearFlagBit, ClearFlags, ColorAttachment, CommandBuffer,
    DepthStencilAttachment, DescriptorSet, Device, Feature, Format, FormatFeatureBit, Framebuffer, FramebufferInfo, InputAssembler,
    InputAssemblerInfo, LoadOp, MemoryUsageBit, Rect, RenderPass, RenderPassInfo, Sampler, StoreOp, SurfaceTransform, Swapchain,
    Texture, TextureInfo, TextureType, TextureUsageBit, Viewport, GeneralBarrierInfo, deviceManager, DescriptorSetLayout,
} from '../gfx';
import { MacroRecord } from '../render-scene/core/pass-utils';
import { RenderWindow } from '../render-scene/core/render-window';
import { Camera, SkyBoxFlagValue } from '../render-scene/scene/camera';
import { Model } from '../render-scene/scene/model';
import { GlobalDSManager } from './global-descriptor-set-manager';
import { GeometryRenderer } from './geometry-renderer';
import { PipelineSceneData } from './pipeline-scene-data';
import { PipelineUBO } from './pipeline-ubo';
import { RenderFlow } from './render-flow';
import { IPipelineEvent, PipelineEventCallback, PipelineEventProcessor, PipelineEventType } from './pipeline-event';
import { decideProfilerCamera } from './pipeline-funcs';
import { OS } from '../../pal/system-info/enum-type';
import { macro, murmurhash2_32_gc, cclegacy } from '../core';
import { UBOSkinning } from './define';
import { PipelineInputAssemblerData } from './render-types';
import { PipelineRuntime } from './custom/pipeline';

/**
 * @en Render pipeline information descriptor
 * @zh 渲染管线描述信息。
 */
export interface IRenderPipelineInfo {
    flows: RenderFlow[];
    tag?: number;
}

export const MAX_BLOOM_FILTER_PASS_NUM = 6;

const tmpRect = new Rect();
const tmpViewport = new Viewport();

export class BloomRenderData {
    renderPass: RenderPass = null!;

    sampler: Sampler = null!;

    prefiterTex: Texture = null!;
    downsampleTexs: Texture[] = [];
    upsampleTexs: Texture[] = [];
    combineTex: Texture = null!;

    prefilterFramebuffer: Framebuffer = null!;
    downsampleFramebuffers: Framebuffer[] = [];
    upsampleFramebuffers: Framebuffer[] = [];
    combineFramebuffer: Framebuffer = null!;
}

export class PipelineRenderData {
    outputFrameBuffer: Framebuffer = null!;
    outputRenderTargets: Texture[] = [];
    outputDepth: Texture = null!;
    sampler: Sampler = null!;

    bloom: BloomRenderData | null = null;
}

function hashFrameBuffer (fbo: Framebuffer): number {
    let hash = 666;
    for (const color of fbo.colorTextures) {
        const info = color?.info;
        const hashStr = `${info!.type}_${info!.usage}_${info!.format}_${info!.width}_${info!.height}_${info!.flags}_
            ${info!.layerCount}_${info!.levelCount}_${info!.samples}_${info!.depth}_${info!.externalRes}`;
        hash = murmurhash2_32_gc(hashStr, hash);
    }

    if (fbo.depthStencilTexture) {
        const info = fbo.depthStencilTexture.info;
        const hashStr = `${info.type}_${info.usage}_${info.format}_${info.width}_${info.height}_${info.flags}_
            ${info.layerCount}_${info.levelCount}_${info.samples}_${info.depth}_${info.externalRes}`;
        hash = murmurhash2_32_gc(hashStr, hash);
    }

    return hash;
}

/**
 * @en Render pipeline describes how we handle the rendering process for all render objects in the related render scene root.
 * It contains some general pipeline configurations, necessary rendering resources and some [[RenderFlow]]s.
 * The rendering process function [[render]] is invoked by [[Root]] for all [[Camera]]s.
 * @zh 渲染管线对象决定了引擎对相关渲染场景下的所有渲染对象实施的完整渲染流程。
 * 这个类主要包含一些通用的管线配置，必要的渲染资源和一些 [[RenderFlow]]。
 * 渲染流程函数 [[render]] 会由 [[Root]] 发起调用并对所有 [[Camera]] 执行预设的渲染流程。
 */
@ccclass('cc.RenderPipeline')
export abstract class RenderPipeline extends Asset implements IPipelineEvent, PipelineRuntime {
    /**
     * @en The tag of pipeline.
     * @zh 管线的标签。
     * @readonly
     */
    get tag (): number {
        return this._tag;
    }

    /**
     * @en The flows of pipeline.
     * @zh 管线的渲染流程列表。
     * @readonly
     */
    get flows (): RenderFlow[] {
        return this._flows;
    }

    /**
     * @en Tag
     * @zh 标签
     * @readonly
     */
    @displayOrder(0)
    @serializable
    protected _tag = 0;

    /**
     * @en Flows
     * @zh 渲染流程列表
     * @readonly
     */
    @displayOrder(1)
    @type([RenderFlow])
    @serializable
    protected _flows: RenderFlow[] = [];

    protected _quadIB: Buffer | null = null;
    protected _quadVBOnscreen: Buffer | null = null;
    protected _quadVBOffscreen: Buffer | null = null;
    protected _quadIAOnscreen: InputAssembler | null = null;
    protected _quadIAOffscreen: InputAssembler | null = null;
    protected _eventProcessor: PipelineEventProcessor = new PipelineEventProcessor();

    constructor (name?: string) {
        super(name);
    }

    /**
     * @zh
     * 四边形输入汇集器。
     */
    public get quadIAOnscreen (): InputAssembler {
        return this._quadIAOnscreen!;
    }

    public get quadIAOffscreen (): InputAssembler {
        return this._quadIAOffscreen!;
    }

    public getPipelineRenderData (): PipelineRenderData {
        return this._pipelineRenderData!;
    }

    /**
     * @en
     * Constant macro string, static throughout the whole runtime.
     * Used to pass device-specific parameters to shader.
     * @zh 常量宏定义字符串，运行时全程不会改变，用于给 shader 传一些只和平台相关的参数。
     * @readonly
     */
    get constantMacros (): string {
        return this._constantMacros;
    }

    /**
     * @en
     * The current global-scoped shader macros.
     * Used to control effects like IBL, fog, etc.
     * @zh 当前的全局宏定义，用于控制如 IBL、雾效等模块。
     * @readonly
     */
    get macros (): MacroRecord {
        return this._macros;
    }

    get device (): Device {
        return this._device;
    }

    get globalDSManager (): GlobalDSManager {
        return this._globalDSManager;
    }

    get descriptorSetLayout (): DescriptorSetLayout {
        return this._globalDSManager.descriptorSetLayout;
    }

    get descriptorSet (): DescriptorSet {
        return this._descriptorSet;
    }

    get commandBuffers (): CommandBuffer[] {
        return this._commandBuffers;
    }

    get pipelineUBO (): PipelineUBO {
        return this._pipelineUBO;
    }

    get pipelineSceneData (): PipelineSceneData {
        return this._pipelineSceneData;
    }

    set profiler (value) {
        this._profiler = value;
    }

    get profiler (): Model | null {
        return this._profiler;
    }

    /**
     * @deprecated since v3.6, please use camera.geometryRenderer instead.
     */
    get geometryRenderer (): GeometryRenderer | null {
        return this._geometryRenderer;
    }

    set clusterEnabled (value) {
        this._clusterEnabled = value;
    }

    get clusterEnabled (): boolean {
        return this._clusterEnabled;
    }

    set bloomEnabled (value) {
        this._bloomEnabled = value;
    }

    get bloomEnabled (): boolean {
        return this._bloomEnabled;
    }

    protected _device!: Device;
    protected _globalDSManager!: GlobalDSManager;
    protected _descriptorSet!: DescriptorSet;
    protected _commandBuffers: CommandBuffer[] = [];
    protected _pipelineUBO = new PipelineUBO();
    protected _macros: MacroRecord = {};
    protected _constantMacros = '';
    protected _profiler: Model | null = null;
    protected _geometryRenderer: GeometryRenderer | null = null;
    protected declare _pipelineSceneData: PipelineSceneData;
    protected _pipelineRenderData: PipelineRenderData | null = null;
    protected _renderPasses = new Map<number, RenderPass>();
    protected _width = 0;
    protected _height = 0;
    protected _lastUsedRenderArea: Rect = new Rect();
    protected _clusterEnabled = false;
    protected _bloomEnabled = false;

    /**
     * @en The initialization process, user shouldn't use it in most case, only useful when need to generate render pipeline programmatically.
     * @zh 初始化函数，正常情况下不会用到，仅用于程序化生成渲染管线的情况。
     * @param info The render pipeline information
     */
    public initialize (info: IRenderPipelineInfo): boolean {
        this._flows = info.flows;
        if (info.tag) { this._tag = info.tag; }
        return true;
    }

    public createRenderPass (clearFlags: ClearFlags, colorFmt: Format, depthFmt: Format): RenderPass {
        const device = this._device;
        const colorAttachment = new ColorAttachment();
        const depthStencilAttachment = new DepthStencilAttachment();
        colorAttachment.format = colorFmt;
        depthStencilAttachment.format = depthFmt;
        depthStencilAttachment.stencilStoreOp = StoreOp.DISCARD;
        depthStencilAttachment.depthStoreOp = StoreOp.DISCARD;

        if (!(clearFlags & ClearFlagBit.COLOR)) {
            if (clearFlags & SkyBoxFlagValue.VALUE) {
                colorAttachment.loadOp = LoadOp.CLEAR;
            } else {
                colorAttachment.loadOp = LoadOp.LOAD;
                colorAttachment.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(
                    AccessFlagBit.COLOR_ATTACHMENT_WRITE,
                    AccessFlagBit.COLOR_ATTACHMENT_WRITE,
                ));
            }
        }

        if ((clearFlags & ClearFlagBit.DEPTH_STENCIL) !== ClearFlagBit.DEPTH_STENCIL) {
            if (!(clearFlags & ClearFlagBit.DEPTH)) depthStencilAttachment.depthLoadOp = LoadOp.LOAD;
            if (!(clearFlags & ClearFlagBit.STENCIL)) depthStencilAttachment.stencilLoadOp = LoadOp.LOAD;
        }
        depthStencilAttachment.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(
            AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE,
            AccessFlagBit.DEPTH_STENCIL_ATTACHMENT_WRITE,
        ));

        const renderPassInfo = new RenderPassInfo([colorAttachment], depthStencilAttachment);

        return device.createRenderPass(renderPassInfo);
    }

    public getRenderPass (clearFlags: ClearFlags, fbo: Framebuffer): RenderPass {
        const fbHash = hashFrameBuffer(fbo);
        const hash = murmurhash2_32_gc(`${fbHash}_${clearFlags}`, 666);
        let renderPass = this._renderPasses.get(hash);
        if (renderPass) { return renderPass; }
        renderPass = this.createRenderPass(clearFlags, fbo.colorTextures[0]!.format, fbo.depthStencilTexture!.format);
        this._renderPasses.set(hash, renderPass);
        return renderPass;
    }

    public newFramebufferByRatio (dyingFramebuffer: Framebuffer): Framebuffer {
        const sceneData = this.pipelineSceneData;
        const width = this._width * sceneData.shadingScale;
        const height = this._height * sceneData.shadingScale;
        const colorTexArr: Texture[] = dyingFramebuffer.colorTextures as Texture[];
        for (let i = 0; i < colorTexArr.length; i++) {
            colorTexArr[i]!.resize(width, height);
        }
        if (dyingFramebuffer.depthStencilTexture) {
            dyingFramebuffer.depthStencilTexture.resize(width, height);
        }
        // move
        const newFramebuffer = this._device.createFramebuffer(new FramebufferInfo(
            dyingFramebuffer.renderPass,
            colorTexArr,
            dyingFramebuffer.depthStencilTexture,
        ));
        dyingFramebuffer.destroy();
        return newFramebuffer;
    }

    /**
     * @en generate renderArea by camera
     * @zh 生成renderArea
     * @param camera the camera
     * @returns
     */
    public generateRenderArea (camera: Camera, out: Rect): void {
        const vp = camera.viewport;
        const w = camera.window.width;
        const h = camera.window.height;
        out.x = vp.x * w;
        out.y = vp.y * h;
        out.width = vp.width * w;
        out.height = vp.height * h;
    }

    public generateViewport (camera: Camera, out?: Viewport): Viewport {
        this.generateRenderArea(camera, tmpRect);
        if (!out) out = tmpViewport;
        const shadingScale = this.pipelineSceneData.shadingScale;
        out.left = tmpRect.x * shadingScale;
        out.top = tmpRect.y * shadingScale;
        out.width = tmpRect.width * shadingScale;
        out.height = tmpRect.height * shadingScale;
        return out;
    }

    public generateScissor (camera: Camera, out?: Rect): Rect {
        if (!out) out = tmpRect;
        this.generateRenderArea(camera, out);
        const shadingScale = this.pipelineSceneData.shadingScale;
        out.x *= shadingScale;
        out.y *= shadingScale;
        out.width *= shadingScale;
        out.height *= shadingScale;
        return out;
    }

    public get shadingScale (): number {
        return this._pipelineSceneData.shadingScale;
    }

    public set shadingScale (val: number) {
        if (this._pipelineSceneData.shadingScale !== val) {
            this._pipelineSceneData.shadingScale = val;
            this.emit(PipelineEventType.ATTACHMENT_SCALE_CAHNGED, val);
        }
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

    public setMacroString (name: string, value: string): void {
        this._macros[name] = value;
    }

    public setMacroInt (name: string, value: number): void {
        this._macros[name] = value;
    }

    public setMacroBool (name: string, value: boolean): void {
        this._macros[name] = value;
    }

    /**
     * @en Activate the render pipeline after loaded, it mainly activate the flows
     * @zh 当渲染管线资源加载完成后，启用管线，主要是启用管线内的 flow
     * TODO: remove swapchain dependency at this stage
     * after deferred pipeline can handle multiple swapchains
     */
    public activate (swapchain: Swapchain): boolean {
        this._device = deviceManager.gfxDevice;
        this._generateConstantMacros();
        this._globalDSManager = new GlobalDSManager(this._device);
        this._descriptorSet = this._globalDSManager.globalDescriptorSet;
        this._pipelineUBO.activate(this._device, this);
        // update global defines in advance here for deferred pipeline may tryCompile shaders.
        this._macros.CC_USE_HDR = this._pipelineSceneData.isHDR;
        this._macros.CC_USE_DEBUG_VIEW = 0;
        this._generateConstantMacros();
        this._pipelineSceneData.activate(this._device);

        for (let i = 0; i < this._flows.length; i++) {
            this._flows[i].activate(this);
        }

        return true;
    }

    protected _ensureEnoughSize (cameras: Camera[]): void {}

    /**
     * @en Render function, it basically run the render process of all flows in sequence for the given view.
     * @zh 渲染函数，对指定的渲染视图按顺序执行所有渲染流程。
     * @param view Render view。
     */
    public render (cameras: Camera[]): void {
        if (cameras.length === 0) {
            return;
        }
        this.updateGeometryRenderer(cameras); // for capability
        this._commandBuffers[0].begin();
        this.emit(PipelineEventType.RENDER_FRAME_BEGIN, cameras);
        this._ensureEnoughSize(cameras);
        decideProfilerCamera(cameras);

        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (camera.scene) {
                this.emit(PipelineEventType.RENDER_CAMERA_BEGIN, camera);
                validPunctualLightsCulling(this.pipelineSceneData, camera);
                sceneCulling(this.pipelineSceneData, this.pipelineUBO, camera);
                this._pipelineUBO.updateGlobalUBO(camera.window);
                this._pipelineUBO.updateCameraUBO(camera);
                for (let j = 0; j < this._flows.length; j++) {
                    this._flows[j].render(camera);
                }
                this.emit(PipelineEventType.RENDER_CAMERA_END, camera);
            }
        }
        this.emit(PipelineEventType.RENDER_FRAME_END, cameras);
        this._commandBuffers[0].end();
        this._device.queue.submit(this._commandBuffers);
    }

    /**
     * @zh
     * 销毁四边形输入汇集器。
     */
    protected _destroyQuadInputAssembler (): void {
        if (this._quadIB) {
            this._quadIB.destroy();
            this._quadIB = null;
        }

        if (this._quadVBOnscreen) {
            this._quadVBOnscreen.destroy();
            this._quadVBOnscreen = null;
        }

        if (this._quadVBOffscreen) {
            this._quadVBOffscreen.destroy();
            this._quadVBOffscreen = null;
        }

        if (this._quadIAOnscreen) {
            this._quadIAOnscreen.destroy();
            this._quadIAOnscreen = null;
        }

        if (this._quadIAOffscreen) {
            this._quadIAOffscreen.destroy();
            this._quadIAOffscreen = null;
        }
    }

    protected _destroyBloomData (): void {
        const bloom = this._pipelineRenderData!.bloom;
        if (bloom === null) return;

        if (bloom.prefiterTex) bloom.prefiterTex.destroy();
        if (bloom.prefilterFramebuffer) bloom.prefilterFramebuffer.destroy();

        for (let i = 0; i < bloom.downsampleTexs.length; ++i) {
            bloom.downsampleTexs[i].destroy();
            bloom.downsampleFramebuffers[i].destroy();
        }
        bloom.downsampleTexs.length = 0;
        bloom.downsampleFramebuffers.length = 0;

        for (let i = 0; i < bloom.upsampleTexs.length; ++i) {
            bloom.upsampleTexs[i].destroy();
            bloom.upsampleFramebuffers[i].destroy();
        }
        bloom.upsampleTexs.length = 0;
        bloom.upsampleFramebuffers.length = 0;

        if (bloom.combineTex) bloom.combineTex.destroy();
        if (bloom.combineFramebuffer) bloom.combineFramebuffer.destroy();

        bloom.renderPass?.destroy();

        this._pipelineRenderData!.bloom = null;
    }

    private _genQuadVertexData (surfaceTransform: SurfaceTransform, renderArea: Rect): Float32Array {
        const vbData = new Float32Array(4 * 4);

        const minX = renderArea.x / this._width;
        const maxX = (renderArea.x + renderArea.width) / this._width;
        let minY = renderArea.y / this._height;
        let maxY = (renderArea.y + renderArea.height) / this._height;
        if (this.device.capabilities.screenSpaceSignY > 0) {
            const temp = maxY;
            maxY       = minY;
            minY       = temp;
        }
        let n = 0;
        switch (surfaceTransform) {
        case (SurfaceTransform.IDENTITY):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = minY;
            break;
        case (SurfaceTransform.ROTATE_90):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = minY;
            break;
        case (SurfaceTransform.ROTATE_180):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            break;
        case (SurfaceTransform.ROTATE_270):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            break;
        default:
            break;
        }

        return vbData;
    }

    /**
     * @zh
     * 创建四边形输入汇集器。
     */
    protected _createQuadInputAssembler (): PipelineInputAssemblerData {
        // create vertex buffer
        const inputAssemblerData = new PipelineInputAssemblerData();

        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;

        const quadVB = this._device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE | MemoryUsageBit.HOST,
            vbSize,
            vbStride,
        ));

        if (!quadVB) {
            return inputAssemblerData;
        }

        // create index buffer
        const ibStride = Uint8Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;

        const quadIB = this._device.createBuffer(new BufferInfo(
            BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));

        if (!quadIB) {
            return inputAssemblerData;
        }

        const indices = new Uint8Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;

        quadIB.update(indices);

        // create input assembler

        const attributes = new Array<Attribute>(2);
        attributes[0] = new Attribute('a_position', Format.RG32F);
        attributes[1] = new Attribute('a_texCoord', Format.RG32F);

        const quadIA = this._device.createInputAssembler(new InputAssemblerInfo(
            attributes,
            [quadVB],
            quadIB,
        ));

        inputAssemblerData.quadIB = quadIB;
        inputAssemblerData.quadVB = quadVB;
        inputAssemblerData.quadIA = quadIA;
        return inputAssemblerData;
    }

    public updateQuadVertexData (renderArea: Rect, window: RenderWindow): void {
        const cachedArea = this._lastUsedRenderArea;
        if (cachedArea.x === renderArea.x
            && cachedArea.y === renderArea.y
            && cachedArea.width === renderArea.width
            && cachedArea.height === renderArea.height) {
            return;
        }

        const offData = this._genQuadVertexData(SurfaceTransform.IDENTITY, renderArea);
        this._quadVBOffscreen!.update(offData);
        const onData = this._genQuadVertexData(window.swapchain && window.swapchain.surfaceTransform || SurfaceTransform.IDENTITY, renderArea);
        this._quadVBOnscreen!.update(onData);

        cachedArea.copy(renderArea);
    }

    /**
     * @en Internal destroy function
     * @zh 内部销毁函数。
     */
    public destroy (): boolean {
        for (let i = 0; i < this._flows.length; i++) {
            this._flows[i].destroy();
        }
        this._flows.length = 0;

        if (this._descriptorSet) {
            this._descriptorSet.destroy();
        }

        this._globalDSManager?.destroy();

        for (let i = 0; i < this._commandBuffers.length; i++) {
            this._commandBuffers[i].destroy();
        }
        this._commandBuffers.length = 0;
        this._pipelineUBO.destroy();
        this._pipelineSceneData?.destroy();

        return super.destroy();
    }

    public onGlobalPipelineStateChanged (): void {
        // do nothing
    }

    protected _generateConstantMacros (): void {
        let str = '';
        str += `#define CC_DEVICE_SUPPORT_FLOAT_TEXTURE ${this.device.getFormatFeatures(Format.RGBA32F)
            & (FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE) ? 1 : 0}\n`;
        str += `#define CC_ENABLE_CLUSTERED_LIGHT_CULLING ${this._clusterEnabled ? 1 : 0}\n`;
        str += `#define CC_DEVICE_MAX_VERTEX_UNIFORM_VECTORS ${this.device.capabilities.maxVertexUniformVectors}\n`;
        str += `#define CC_DEVICE_MAX_FRAGMENT_UNIFORM_VECTORS ${this.device.capabilities.maxFragmentUniformVectors}\n`;
        str += `#define CC_DEVICE_CAN_BENEFIT_FROM_INPUT_ATTACHMENT ${this.device.hasFeature(Feature.INPUT_ATTACHMENT_BENEFIT) ? 1 : 0}\n`;
        str += `#define CC_PLATFORM_ANDROID_AND_WEBGL ${systemInfo.os === OS.ANDROID && systemInfo.isBrowser ? 1 : 0}\n`;
        str += `#define CC_ENABLE_WEBGL_HIGHP_STRUCT_VALUES ${macro.ENABLE_WEBGL_HIGHP_STRUCT_VALUES ? 1 : 0}\n`;

        const jointUniformCapacity = UBOSkinning.JOINT_UNIFORM_CAPACITY;
        str += `#define CC_JOINT_UNIFORM_CAPACITY ${jointUniformCapacity}\n`;

        this._constantMacros = str;
    }

    protected updateGeometryRenderer (cameras: Camera[]): void {
        if (this._geometryRenderer) {
            return;
        }

        // Query the first camera rendering to swapchain.
        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (camera && camera.window && camera.window.swapchain) {
                camera.initGeometryRenderer();
                this._geometryRenderer = camera.geometryRenderer;
                return;
            }
        }
    }

    public generateBloomRenderData (): void {
        if (this._pipelineRenderData!.bloom != null) return;

        const bloom = this._pipelineRenderData!.bloom = new BloomRenderData();
        const device = this.device;

        // create renderPass
        const colorAttachment = new ColorAttachment();
        colorAttachment.format = Format.RGBA8;
        colorAttachment.loadOp = LoadOp.CLEAR;
        colorAttachment.storeOp = StoreOp.STORE;
        colorAttachment.barrier = device.getGeneralBarrier(new GeneralBarrierInfo(
            AccessFlagBit.NONE,
            AccessFlagBit.COLOR_ATTACHMENT_WRITE,
        ));
        bloom.renderPass = device.createRenderPass(new RenderPassInfo([colorAttachment]));

        let curWidth = this._width;
        let curHeight = this._height;

        // prefilter
        bloom.prefiterTex = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED,
            Format.RGBA8,
            curWidth >> 1,
            curHeight >> 1,
        ));
        bloom.prefilterFramebuffer = device.createFramebuffer(new FramebufferInfo(
            bloom.renderPass,
            [bloom.prefiterTex],
        ));

        // downsample & upsample
        curWidth >>= 1;
        curHeight >>= 1;
        for (let i = 0; i < MAX_BLOOM_FILTER_PASS_NUM; ++i) {
            bloom.downsampleTexs.push(device.createTexture(new TextureInfo(
                TextureType.TEX2D,
                TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                curWidth >> 1,
                curHeight >> 1,
            )));
            bloom.downsampleFramebuffers[i] = device.createFramebuffer(new FramebufferInfo(
                bloom.renderPass,
                [bloom.downsampleTexs[i]],
            ));

            bloom.upsampleTexs.push(device.createTexture(new TextureInfo(
                TextureType.TEX2D,
                TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                curWidth,
                curHeight,
            )));
            bloom.upsampleFramebuffers[i] = device.createFramebuffer(new FramebufferInfo(
                bloom.renderPass,
                [bloom.upsampleTexs[i]],
            ));

            curWidth >>= 1;
            curHeight >>= 1;
        }

        // combine
        bloom.combineTex = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED,
            Format.RGBA8,
            this._width,
            this._height,
        ));
        bloom.combineFramebuffer = device.createFramebuffer(new FramebufferInfo(
            bloom.renderPass,
            [bloom.combineTex],
        ));

        // sampler
        bloom.sampler = this.globalDSManager.linearSampler;
    }

    /**
     * @en
     * Register an callback of the pipeline event type on the RenderPipeline.
     * @zh
     * 在渲染管线中注册管线事件类型的回调。
     */
    public on<TFunction extends PipelineEventCallback> (type: PipelineEventType, callback: TFunction, target?: any, once?: boolean): typeof callback {
        return this._eventProcessor.on(type, callback, target, once);
    }

    /**
     * @en
     * Register an callback of the pipeline event type on the RenderPipeline,
     * the callback will remove itself after the first time it is triggered.
     * @zh
     * 在渲染管线中注册管线事件类型的回调, 回调后会在第一时间删除自身。
     */
    public once<TFunction extends PipelineEventCallback> (type: PipelineEventType, callback: TFunction, target?: any): typeof callback {
        return this._eventProcessor.once(type, callback, target);
    }

    /**
     * @en
     * Removes the listeners previously registered with the same type, callback, target and or useCapture,
     * if only type is passed as parameter, all listeners registered with that type will be removed.
     * @zh
     * 删除之前用同类型、回调、目标或 useCapture 注册的事件监听器，如果只传递 type，将会删除 type 类型的所有事件监听器。
     */
    public off<TFunction extends PipelineEventCallback> (type: PipelineEventType, callback?: TFunction, target?: any): void {
        this._eventProcessor.off(type, callback, target);
    }

    /**
     * @zh 派发一个指定事件，并传递需要的参数
     * @en Trigger an event directly with the event name and necessary arguments.
     * @param type - event type
     * @param args - Arguments when the event triggered
     */
    public emit (type: PipelineEventType, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        this._eventProcessor.emit(type, arg0, arg1, arg2, arg3, arg4);
    }

    /**
     * @en Removes all callbacks previously registered with the same target (passed as parameter).
     * This is not for removing all listeners in the current event target,
     * and this is not for removing all listeners the target parameter have registered.
     * It's only for removing all listeners (callback and target couple) registered on the current event target by the target parameter.
     * @zh 在当前 EventTarget 上删除指定目标（target 参数）注册的所有事件监听器。
     * 这个函数无法删除当前 EventTarget 的所有事件监听器，也无法删除 target 参数所注册的所有事件监听器。
     * 这个函数只能删除 target 参数在当前 EventTarget 上注册的所有事件监听器。
     * @param typeOrTarget - The target to be searched for all related listeners
     */
    public targetOff (typeOrTarget: any): void {
        this._eventProcessor.targetOff(typeOrTarget);
    }

    /**
     * @zh 移除在特定事件类型中注册的所有回调或在某个目标中注册的所有回调。
     * @en Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @param typeOrTarget - The event type or target with which the listeners will be removed
     */
    public removeAll (typeOrTarget: any): void {
        this._eventProcessor.removeAll(typeOrTarget);
    }

    /**
     * @zh 检查指定事件是否已注册回调。
     * @en Checks whether there is correspond event listener registered on the given event.
     * @param type - Event type.
     * @param callback - Callback function when event triggered.
     * @param target - Callback callee.
     */
    public hasEventListener (type: PipelineEventType, callback?: PipelineEventCallback, target?: any): boolean {
        return this._eventProcessor.hasEventListener(type, callback, target);
    }
}

// Do not delete, for the class detection of editor
cclegacy.RenderPipeline = RenderPipeline;
