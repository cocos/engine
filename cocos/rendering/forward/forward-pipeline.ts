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

import { ccclass, displayOrder, type, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { RenderPipeline, IRenderPipelineInfo } from '../render-pipeline';
import { ForwardFlow } from './forward-flow';
import { RenderTextureConfig } from '../pipeline-serialization';
import { ShadowFlow } from '../shadow/shadow-flow';
import { UBOGlobal, UBOShadow, UBOCamera, UNIFORM_SHADOWMAP_BINDING,
    UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, getDefaultShadowTexture } from '../define';
import { Swapchain, RenderPass } from '../../gfx';
import { Camera } from '../../render-scene/scene';
import { errorID, log } from '../../core/platform/debug';
import { PipelineSceneData } from '../pipeline-scene-data';
import { ReflectionProbeFlow } from '../reflection-probe/reflection-probe-flow';

const PIPELINE_TYPE = 0;

export function createDefaultPipeline (): ForwardPipeline {
    const rppl = new ForwardPipeline();
    rppl.initialize({ flows: [] });
    return rppl;
}

/**
 * @en The forward render pipeline
 * @zh 前向渲染管线。
 */
@ccclass('ForwardPipeline')
export class ForwardPipeline extends RenderPipeline {
    @type([RenderTextureConfig])
    @serializable
    @displayOrder(2)
    protected renderTextures: RenderTextureConfig[] = [];

    protected _postRenderPass: RenderPass | null = null;

    constructor () {
        super();
    }

    public get postRenderPass (): RenderPass | null {
        return this._postRenderPass;
    }

    public initialize (info: IRenderPipelineInfo): boolean {
        super.initialize(info);

        if (this._flows.length === 0) {
            const shadowFlow = new ShadowFlow();
            shadowFlow.initialize(ShadowFlow.initInfo);
            this._flows.push(shadowFlow);

            const reflectionFlow = new ReflectionProbeFlow();
            reflectionFlow.initialize(ReflectionProbeFlow.initInfo);
            this._flows.push(reflectionFlow);

            const forwardFlow = new ForwardFlow();
            forwardFlow.initialize(ForwardFlow.initInfo);
            this._flows.push(forwardFlow);
        }

        return true;
    }

    public activate (swapchain: Swapchain): boolean {
        if (EDITOR) { log('Forward render pipeline initialized.'); }

        this._macros = { CC_PIPELINE_TYPE: PIPELINE_TYPE };
        this._pipelineSceneData = new PipelineSceneData();

        if (!super.activate(swapchain)) {
            return false;
        }

        if (!this._activeRenderer(swapchain)) {
            errorID(2402);
            return false;
        }

        return true;
    }

    protected _ensureEnoughSize (cameras: Camera[]): void {
        let newWidth = this._width;
        let newHeight = this._height;
        for (let i = 0; i < cameras.length; ++i) {
            const window = cameras[i].window;
            newWidth = Math.max(window.width, newWidth);
            newHeight = Math.max(window.height, newHeight);
        }
        if (newWidth !== this._width || newHeight !== this._height) {
            this._width = newWidth;
            this._height = newHeight;
        }
    }

    public destroy (): boolean {
        this._destroyUBOs();
        this._destroyQuadInputAssembler();
        const rpIter = this._renderPasses.values();
        let rpRes = rpIter.next();
        while (!rpRes.done) {
            rpRes.value.destroy();
            rpRes = rpIter.next();
        }

        this._commandBuffers.length = 0;

        return super.destroy();
    }

    private _activeRenderer (swapchain: Swapchain): boolean {
        const device = this.device;

        this._commandBuffers.push(device.commandBuffer);
        const descriptorSet = this._descriptorSet;
        const shadowMapSampler = this.globalDSManager.pointSampler;
        descriptorSet.bindSampler(UNIFORM_SHADOWMAP_BINDING, shadowMapSampler);
        descriptorSet.bindTexture(UNIFORM_SHADOWMAP_BINDING, getDefaultShadowTexture(this.device));
        descriptorSet.bindSampler(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, shadowMapSampler);
        descriptorSet.bindTexture(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING, getDefaultShadowTexture(this.device));

        descriptorSet.update();

        return true;
    }

    private _destroyUBOs (): void {
        const descriptorSet = this._descriptorSet;
        if (descriptorSet) {
            descriptorSet.getBuffer(UBOGlobal.BINDING).destroy();
            descriptorSet.getBuffer(UBOShadow.BINDING).destroy();
            descriptorSet.getBuffer(UBOCamera.BINDING).destroy();

            descriptorSet.getTexture(UNIFORM_SHADOWMAP_BINDING).destroy();
            descriptorSet.getTexture(UNIFORM_SPOT_SHADOW_MAP_TEXTURE_BINDING).destroy();
        }
    }
}
