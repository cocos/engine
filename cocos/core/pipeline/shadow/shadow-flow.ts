/**
 * @packageDocumentation
 * @module pipeline.forward
 */

import { ccclass } from 'cc.decorator';
import { PIPELINE_FLOW_SHADOW, UNIFORM_SHADOWMAP_BINDING } from '../define';
import { IRenderFlowInfo, RenderFlow } from '../render-flow';
import { ForwardFlowPriority } from '../forward/enum';
import { ShadowStage } from './shadow-stage';
import { RenderPass, LoadOp, StoreOp,
    TextureLayout, Format, Texture, TextureType, TextureUsageBit, Filter, Address,
    ColorAttachment, DepthStencilAttachment, RenderPassInfo, TextureInfo, FramebufferInfo } from '../../gfx';
import { RenderFlowTag } from '../pipeline-serialization';
import { ForwardPipeline } from '../forward/forward-pipeline';
import { RenderView } from '../render-view';
import { ShadowType } from '../../renderer/scene/shadows';
import { genSamplerHash, samplerLib } from '../../renderer/core/sampler-lib';
import { Light } from '../../renderer/scene/light';
import { lightCollecting, shadowCollecting } from '../forward/scene-culling';
import { Vec2 } from '../../math';

const _samplerInfo = [
    Filter.LINEAR,
    Filter.LINEAR,
    Filter.NONE,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
];

/**
 * @en Shadow map render flow
 * @zh 阴影贴图绘制流程
 */
@ccclass('ShadowFlow')
export class ShadowFlow extends RenderFlow {

    /**
     * @en A common initialization info for shadow map render flow
     * @zh 一个通用的 ShadowFlow 的初始化信息对象
     */
    public static initInfo: IRenderFlowInfo = {
        name: PIPELINE_FLOW_SHADOW,
        priority: ForwardFlowPriority.SHADOW,
        tag: RenderFlowTag.SCENE,
        stages: []
    };

    private _shadowRenderPass: RenderPass|null = null;

    public initialize (info: IRenderFlowInfo): boolean {
        super.initialize(info);
        if (this._stages.length === 0) {
            // add shadowMap-stages
            const shadowMapStage = new ShadowStage();
            shadowMapStage.initialize(ShadowStage.initInfo);
            this._stages.push(shadowMapStage);
        }
        return true;
    }

    public render (view: RenderView) {
        const pipeline = this._pipeline as ForwardPipeline;
        const shadowInfo = pipeline.shadows;
        if (shadowInfo.type !== ShadowType.ShadowMap) { return; }

        const validLights = lightCollecting(view, shadowInfo.maxReceived);
        shadowCollecting(pipeline, view);

        for (let l = 0; l < validLights.length; l++) {
            const light = validLights[l];

            if (!pipeline.shadowFrameBufferMap.has(light)) {
                this._initShadowFrameBuffer(pipeline, light);
            }
            const shadowFrameBuffer = pipeline.shadowFrameBufferMap.get(light);
            if (shadowInfo.shadowMapDirty) { this.resizeShadowMap(light, shadowInfo.size); }

            for (let i = 0; i < this._stages.length; i++) {
                const shadowStage = this._stages[i] as ShadowStage;
                shadowStage.setUsage(light, shadowFrameBuffer!);
                shadowStage.render(view);
            }
        }
    }


    public _initShadowFrameBuffer  (pipeline: ForwardPipeline, light: Light) {
        const device = pipeline.device;
        const shadowMapSize = pipeline.shadows.size;

        if (!this._shadowRenderPass) {
            const colorAttachment = new ColorAttachment();
            colorAttachment.format = Format.RGBA8;
            colorAttachment.loadOp = LoadOp.CLEAR; // should clear color attachment
            colorAttachment.storeOp = StoreOp.STORE;
            colorAttachment.sampleCount = 1;
            colorAttachment.beginLayout = TextureLayout.UNDEFINED;
            colorAttachment.endLayout = TextureLayout.PRESENT_SRC;

            const depthStencilAttachment = new DepthStencilAttachment();
            depthStencilAttachment.format = device.depthStencilFormat;
            depthStencilAttachment.depthLoadOp = LoadOp.CLEAR;
            depthStencilAttachment.depthStoreOp = StoreOp.STORE;
            depthStencilAttachment.stencilLoadOp = LoadOp.CLEAR;
            depthStencilAttachment.stencilStoreOp = StoreOp.STORE;
            depthStencilAttachment.sampleCount = 1;
            depthStencilAttachment.beginLayout = TextureLayout.UNDEFINED;
            depthStencilAttachment.endLayout = TextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

            const renderPassInfo = new RenderPassInfo([colorAttachment], depthStencilAttachment);
            this._shadowRenderPass = device.createRenderPass(renderPassInfo);
        }

        const shadowRenderTargets: Texture[] = [];
        shadowRenderTargets.push(device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED,
            Format.RGBA8,
            shadowMapSize.x,
            shadowMapSize.y,
        )));

        const depth = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
            device.depthStencilFormat,
            shadowMapSize.x,
            shadowMapSize.y,
        ));

        const shadowFrameBuffer = device.createFramebuffer(new FramebufferInfo(
            this._shadowRenderPass,
            shadowRenderTargets,
            depth,
        ));

        // Cache frameBuffer
        pipeline.shadowFrameBufferMap.set(light, shadowFrameBuffer);

        const shadowMapSamplerHash = genSamplerHash(_samplerInfo);
        const shadowMapSampler = samplerLib.getSampler(device, shadowMapSamplerHash);
        pipeline.descriptorSet.bindSampler(UNIFORM_SHADOWMAP_BINDING, shadowMapSampler);
    }

    private resizeShadowMap(light: Light, size: Vec2) {
        const width = size.x;
        const height = size.y;
        const pipeline = this._pipeline as ForwardPipeline;

        if (pipeline.shadowFrameBufferMap.has(light)) {
            const frameBuffer = pipeline.shadowFrameBufferMap.get(light);

            if (!frameBuffer) { return; }

            const renderTargets = frameBuffer.colorTextures;
            if (renderTargets && renderTargets.length > 0) {
                for (let j = 0; j < renderTargets.length; j++) {
                    const renderTarget = renderTargets[j];
                    if (renderTarget) { renderTarget.resize(width, height); }
                }
            }

            const depth = frameBuffer.depthStencilTexture;
            if (depth) { depth.resize(width, height); }

            const shadowRenderPass = frameBuffer.renderPass;
            frameBuffer.destroy();
            frameBuffer.initialize(new FramebufferInfo(
                shadowRenderPass,
                renderTargets,
                depth,
            ));
        }
    }
}
