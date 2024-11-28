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
    _decorator, assert, CCBoolean, CCInteger,
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
    addCopyToScreenPass,
    CameraConfigs,
    getPingPongRenderTarget,
    PipelineConfigs,
    PipelineContext,
} from './builtin-pipeline';

const { ccclass, disallowMultiple, executeInEditMode, menu, property, requireComponent } = _decorator;

const { Color, LoadOp, StoreOp } = gfx;

export interface FXAAPassConfigs {
    enableFXAA: boolean;
}

@ccclass('BuiltinFXAAPass')
@menu('Rendering/BuiltinFXAAPass')
@requireComponent(BuiltinPipelineSettings)
@disallowMultiple
@executeInEditMode
export class BuiltinFXAAPass extends BuiltinPipelinePassBuilder
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
        renderOrder = 400;

    @property
    protected _fxaaEnable = true;
    @property
    protected _fxaaMaterial: Material | null = null;

    // FXAA
    @property({
        group: { id: 'FXAA', name: 'Fast Approximate Anti-Aliasing (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set fxaaEnable(value: boolean) {
        this._fxaaEnable = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get fxaaEnable(): boolean {
        return this._fxaaEnable;
    }

    @property({
        group: { id: 'FXAA', name: 'Fast Approximate Anti-Aliasing (PostProcessing)', style: 'section' },
        type: Material,
    })
    set fxaaMaterial(value: Material) {
        if (this._fxaaMaterial === value) {
            return;
        }
        this._fxaaMaterial = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get fxaaMaterial(): Material {
        return this._fxaaMaterial!;
    }

    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FXAAPassConfigs): void {
        cameraConfigs.enableFXAA = this._fxaaEnable && !!this._fxaaMaterial;
        if (cameraConfigs.enableFXAA) {
            ++cameraConfigs.remainingPasses;
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FXAAPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableFXAA) {
            return prevRenderPass;
        }
        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);

        const id = cameraConfigs.renderWindowId;
        const ldrColorPrefix = cameraConfigs.enableShadingScale
            ? `ScaledLdrColor`
            : `LdrColor`;
        const ldrColorName = getPingPongRenderTarget(context.colorName, ldrColorPrefix, id);

        assert(!!this._fxaaMaterial);
        if (cameraConfigs.remainingPasses === 0) {
            if (cameraConfigs.enableShadingScale) {
                this._addFxaaPass(ppl, pplConfigs,
                    this._fxaaMaterial,
                    cameraConfigs.width,
                    cameraConfigs.height,
                    context.colorName,
                    ldrColorName);
                return addCopyToScreenPass(ppl, pplConfigs, cameraConfigs, ldrColorName);
            } else {
                assert(cameraConfigs.width === cameraConfigs.nativeWidth);
                assert(cameraConfigs.height === cameraConfigs.nativeHeight);
                return this._addFxaaPass(ppl, pplConfigs,
                    this._fxaaMaterial,
                    cameraConfigs.width,
                    cameraConfigs.height,
                    context.colorName,
                    cameraConfigs.colorName);
            }
        } else {
            const inputColorName = context.colorName;
            context.colorName = ldrColorName;
            const lastPass = this._addFxaaPass(ppl, pplConfigs,
                this._fxaaMaterial,
                cameraConfigs.width,
                cameraConfigs.height,
                inputColorName,
                ldrColorName);
            return lastPass;
        }
    }
    private _addFxaaPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        fxaaMaterial: Material,
        width: number,
        height: number,
        ldrColorName: string,
        colorName: string,
    ): rendering.BasicRenderPassBuilder {
        this._fxaaParams.x = width;
        this._fxaaParams.y = height;
        this._fxaaParams.z = 1 / width;
        this._fxaaParams.w = 1 / height;

        const pass = ppl.addRenderPass(width, height, 'cc-fxaa');
        pass.addRenderTarget(colorName, LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
        pass.addTexture(ldrColorName, 'sceneColorMap');
        pass.setVec4('g_platform', pplConfigs.platform);
        pass.setVec4('texSize', this._fxaaParams);
        pass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(fxaaMaterial, 0);
        return pass;
    }
    // FXAA
    private readonly _fxaaParams = new Vec4(0, 0, 0, 0);
    private readonly _clearColorTransparentBlack = new Color(0, 0, 0, 0);
}
