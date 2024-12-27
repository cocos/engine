/*
 Copyright (c) Huawei Technologies Co., Ltd. 2020-2021.
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

/**
 * @category pipeline
 */
import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { Camera } from '../../render-scene/scene';
import { SetIndex, UBOLocalEnum } from '../define';
import { Color, Rect, PipelineState, ClearFlagBit, DescriptorSetInfo, BufferInfo, BufferUsageBit, MemoryUsageBit, DescriptorSet, Buffer } from '../../gfx';
import { IRenderStageInfo, RenderStage } from '../render-stage';
import { CommonStagePriority } from '../enum';
import { Material } from '../../asset/assets/material';
import { PipelineStateManager } from '../pipeline-state-manager';
import { RenderQueueDesc } from '../pipeline-serialization';
import { renderProfiler } from '../pipeline-funcs';
import { RenderPipeline } from '../render-pipeline';
import { RenderFlow } from '../render-flow';
import { UIPhase } from '../ui-phase';
import { DeferredPipelineSceneData } from './deferred-pipeline-scene-data';

const colors: Color[] = [new Color(0, 0, 0, 1)];

/**
  * @en The postprocess render stage
  * @zh 后处理渲染阶段。
  */
@ccclass('PostProcessStage')
export class PostProcessStage extends RenderStage {
    public static initInfo: IRenderStageInfo = {
        name: 'PostProcessStage',
        priority: CommonStagePriority.POST_PROCESS,
        tag: 0,
    };

    @type(Material)
    @serializable
    @displayOrder(3)
    private _postProcessMaterial: Material | null = null;

    @type([RenderQueueDesc])
    @serializable
    @displayOrder(2)
    private renderQueues: RenderQueueDesc[] = [];

    private _renderArea = new Rect();
    private declare _uiPhase: UIPhase;
    private _stageDesc: DescriptorSet | null = null;
    private _localUBO: Buffer | null = null;
    constructor () {
        super();
        this._uiPhase = new UIPhase();
    }

    public initialize (info: IRenderStageInfo): boolean {
        super.initialize(info);
        return true;
    }

    public activate (pipeline: RenderPipeline, flow: RenderFlow): void {
        super.activate(pipeline, flow);
        if (this._postProcessMaterial) { (pipeline.pipelineSceneData as DeferredPipelineSceneData).postprocessMaterial = this._postProcessMaterial; }
        this._uiPhase.activate(pipeline);
    }

    public destroy (): void {
    }
    public render (camera: Camera): void {
        const pipeline = this._pipeline;
        const device = pipeline.device;
        const sceneData = pipeline.pipelineSceneData;
        const cmdBuff = pipeline.commandBuffers[0];
        pipeline.pipelineUBO.updateCameraUBO(camera);

        const vp = camera.viewport;
        this._renderArea.x = vp.x * camera.window.width;
        this._renderArea.y = vp.y * camera.window.height;
        this._renderArea.width = vp.width * camera.window.width;
        this._renderArea.height = vp.height * camera.window.height;
        const renderData = pipeline.getPipelineRenderData();
        const framebuffer = camera.window.framebuffer;
        const renderPass = pipeline.getRenderPass(camera.clearFlag, framebuffer);

        if (camera.clearFlag & ClearFlagBit.COLOR) {
            colors[0].x = camera.clearColor.x;
            colors[0].y = camera.clearColor.y;
            colors[0].z = camera.clearColor.z;
        }

        colors[0].w = camera.clearColor.w;

        cmdBuff.beginRenderPass(
            renderPass,
            framebuffer,
            this._renderArea,
            colors,
            camera.clearDepth,
            camera.clearStencil,
        );
        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);
        // Postprocess
        const builtinPostProcess = (sceneData as DeferredPipelineSceneData).postprocessMaterial;
        const pass = builtinPostProcess.passes[0];
        const shader = pass.getShaderVariant();

        if (pipeline.bloomEnabled) {
            pass.descriptorSet.bindTexture(0, renderData.bloom!.combineTex);
        } else {
            pass.descriptorSet.bindTexture(0, renderData.outputRenderTargets[0]);
        }
        pass.descriptorSet.bindSampler(0, renderData.sampler);
        pass.descriptorSet.update();

        const inputAssembler = camera.window.swapchain ? pipeline.quadIAOnscreen : pipeline.quadIAOffscreen;
        let pso: PipelineState | null = null;
        if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
        }

        const renderObjects = pipeline.pipelineSceneData.renderObjects;
        if (pso != null && renderObjects.length > 0) {
            if (!this._stageDesc) {
                this._stageDesc = device.createDescriptorSet(new DescriptorSetInfo(pass.localSetLayout));
                this._localUBO = device.createBuffer(new BufferInfo(
                    BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.DEVICE,
                    UBOLocalEnum.SIZE,
                    UBOLocalEnum.SIZE,
                ));
                this._stageDesc.bindBuffer(UBOLocalEnum.BINDING, this._localUBO);
            }
            this._stageDesc.update();
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
            cmdBuff.bindDescriptorSet(SetIndex.LOCAL, this._stageDesc);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }
        this._uiPhase.render(camera, renderPass);
        renderProfiler(device, renderPass, cmdBuff, pipeline.profiler, camera);

        cmdBuff.endRenderPass();
    }
}
