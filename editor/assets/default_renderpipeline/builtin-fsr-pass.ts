/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

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

import {
    _decorator, assert, CCBoolean, CCFloat, CCInteger,
    clamp,
    gfx, Material, renderer, rendering, Vec4,
} from 'cc';

import { EDITOR } from 'cc/env';

import {
    BuiltinPipelineSettings,
} from './builtin-pipeline-settings';

import {
    BuiltinPipelinePassBuilder,
} from './builtin-pipeline-pass';

import {
    CameraConfigs,
    getPingPongRenderTarget,
    PipelineConfigs,
    PipelineContext,
} from './builtin-pipeline';

const { ccclass, disallowMultiple, executeInEditMode, menu, property, requireComponent } = _decorator;

const { Color, LoadOp, StoreOp } = gfx;

export interface FSRPassConfigs {
    enableFSR: boolean;
}

@ccclass('BuiltinFSRPass')
@menu('Rendering/BuiltinFSRPass')
@requireComponent(BuiltinPipelineSettings)
@disallowMultiple
@executeInEditMode
export class BuiltinFSRPass extends BuiltinPipelinePassBuilder
    implements rendering.PipelinePassBuilder {
    @property({
        group: { id: 'BuiltinPass', name: 'Pass Settings', style: 'section' },
        type: CCInteger,
    })
        configOrder = 0;
    @property({
        group: { id: 'BuiltinPass', name: 'Pass Settings', style: 'section' },
        type: CCInteger,
    })
        renderOrder = 500;

    @property
    protected _fsrEnable = true;
    @property
    protected _fsrMaterial: Material | null = null;
    @property
    protected _fsrSharpness = 0.8;

    // FSR
    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: CCBoolean,
    })
    set fsrEnable(value: boolean) {
        this._fsrEnable = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get fsrEnable(): boolean {
        return this._fsrEnable;
    }

    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: Material,
    })
    set fsrMaterial(value: Material) {
        if (this._fsrMaterial === value) {
            return;
        }
        this._fsrMaterial = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get fsrMaterial(): Material {
        return this._fsrMaterial!;
    }

    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: CCFloat,
        range: [0, 1, 0.01],
        slide: true,
    })
    set fsrSharpness(value: number) {
        this._fsrSharpness = value;
    }
    get fsrSharpness(): number {
        return this._fsrSharpness;
    }

    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs): void {
        // FSR (Depend on Shading scale)
        cameraConfigs.enableFSR = this._fsrEnable
            && !!this._fsrMaterial
            && cameraConfigs.enableShadingScale
            && cameraConfigs.shadingScale < 1.0;

        if (cameraConfigs.enableFSR) {
            ++cameraConfigs.remainingPasses;
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableFSR) {
            return prevRenderPass;
        }
        --cameraConfigs.remainingPasses;

        const inputColorName = context.colorName;
        const outputColorName
            = cameraConfigs.remainingPasses === 0
                ? cameraConfigs.colorName
                : getPingPongRenderTarget(context.colorName, 'UiColor', cameraConfigs.renderWindowId);
        context.colorName = outputColorName;

        assert(!!this._fsrMaterial);
        return this._addFsrPass(ppl, pplConfigs, cameraConfigs,
            cameraConfigs.renderWindowId,
            cameraConfigs.width,
            cameraConfigs.height,
            inputColorName,
            cameraConfigs.nativeWidth,
            cameraConfigs.nativeHeight,
            outputColorName);
    }
    private _addFsrPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs,
        id: number,
        width: number,
        height: number,
        inputColorName: string,
        nativeWidth: number,
        nativeHeight: number,
        outputColorName: string,
    ): rendering.BasicRenderPassBuilder {
        assert(!!this._fsrMaterial);
        this._fsrTexSize.x = width;
        this._fsrTexSize.y = height;
        this._fsrTexSize.z = nativeWidth;
        this._fsrTexSize.w = nativeHeight;
        this._fsrParams.x = clamp(1.0 - this._fsrSharpness, 0.02, 0.98);

        const uiColorPrefix = 'UiColor';

        const fsrColorName = getPingPongRenderTarget(outputColorName, uiColorPrefix, id);

        const easuPass = ppl.addRenderPass(nativeWidth, nativeHeight, 'cc-fsr-easu');
        easuPass.addRenderTarget(fsrColorName, LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
        easuPass.addTexture(inputColorName, 'outputResultMap');
        easuPass.setVec4('g_platform', pplConfigs.platform);
        easuPass.setVec4('fsrTexSize', this._fsrTexSize);
        easuPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(this._fsrMaterial, 0);

        const rcasPass = ppl.addRenderPass(nativeWidth, nativeHeight, 'cc-fsr-rcas');
        rcasPass.addRenderTarget(outputColorName, LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
        rcasPass.addTexture(fsrColorName, 'outputResultMap');
        rcasPass.setVec4('g_platform', pplConfigs.platform);
        rcasPass.setVec4('fsrTexSize', this._fsrTexSize);
        rcasPass.setVec4('fsrParams', this._fsrParams);
        rcasPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(this._fsrMaterial, 1);

        return rcasPass;
    }
    // FSR
    private readonly _clearColorTransparentBlack = new Color(0, 0, 0, 0);
    private readonly _fsrParams = new Vec4(0, 0, 0, 0);
    private readonly _fsrTexSize = new Vec4(0, 0, 0, 0);
}
