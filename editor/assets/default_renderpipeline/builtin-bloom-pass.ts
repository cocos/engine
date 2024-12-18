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
    PipelineConfigs,
    PipelineContext,
} from './builtin-pipeline';

const { ccclass, disallowMultiple, executeInEditMode, menu, property, requireComponent } = _decorator;

const { Color, LoadOp, StoreOp } = gfx;

export interface BloomPassConfigs {
    enableBloom: boolean;
}

@ccclass('BuiltinBloomPass')
@menu('Rendering/BuiltinBloomPass')
@requireComponent(BuiltinPipelineSettings)
@disallowMultiple
@executeInEditMode
export class BuiltinBloomPass extends BuiltinPipelinePassBuilder
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
    renderOrder = 200;

    @property
    protected _bloomEnable = true;
    @property
    protected _bloomMaterial: Material | null = null;
    @property
    protected _bloomEnableAlphaMask = false;
    @property
    protected _bloomIterations = 3;
    @property
    protected _bloomThreshold = 0.8;
    @property
    protected _bloomIntensity = 2.3;

    // Bloom
    @property({
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set bloomEnable(value: boolean) {
        this._bloomEnable = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get bloomEnable(): boolean {
        return this._bloomEnable;
    }

    @property({
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: Material,
    })
    set bloomMaterial(value: Material) {
        if (this._bloomMaterial === value) {
            return;
        }
        this._bloomMaterial = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get bloomMaterial(): Material {
        return this._bloomMaterial!;
    }

    @property({
        tooltip: 'i18n:bloom.enableAlphaMask',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set bloomEnableAlphaMask(value: boolean) {
        this._bloomEnableAlphaMask = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get bloomEnableAlphaMask(): boolean {
        return this._bloomEnableAlphaMask;
    }

    @property({
        tooltip: 'i18n:bloom.iterations',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCInteger,
        range: [1, 6, 1],
        slide: true,
    })
    set bloomIterations(value: number) {
        this._bloomIterations = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get bloomIterations(): number {
        return this._bloomIterations;
    }

    @property({
        tooltip: 'i18n:bloom.threshold',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCFloat,
        min: 0,
    })
    set bloomThreshold(value: number) {
        this._bloomThreshold = value;
    }
    get bloomThreshold(): number {
        return this._bloomThreshold;
    }

    set bloomIntensity(value: number) {
        this._bloomIntensity = value;
    }
    get bloomIntensity(): number {
        return this._bloomIntensity;
    }

    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pipelineConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs): void {
        cameraConfigs.enableBloom = this._bloomEnable && !!this._bloomMaterial;
        if (cameraConfigs.enableBloom) {
            ++cameraConfigs.remainingPasses;
        }
    }
    windowResize(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs,
        window: renderer.RenderWindow): void {
        if (cameraConfigs.enableBloom) {
            const id = window.renderWindowId;
            let bloomWidth = cameraConfigs.width;
            let bloomHeight = cameraConfigs.height;
            for (let i = 0; i !== this._bloomIterations + 1; ++i) {
                bloomWidth = Math.max(Math.floor(bloomWidth / 2), 1);
                bloomHeight = Math.max(Math.floor(bloomHeight / 2), 1);
                ppl.addRenderTarget(`BloomTex${id}_${i}`,
                    cameraConfigs.radianceFormat, bloomWidth, bloomHeight);
            }
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableBloom) {
            return prevRenderPass;
        }

        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);
        const id = camera.window.renderWindowId;
        assert(!!this._bloomMaterial);
        return this._addKawaseDualFilterBloomPasses(
            ppl, pplConfigs,
            cameraConfigs,
            id,
            cameraConfigs.width,
            cameraConfigs.height,
            context.colorName);
    }

    private _addKawaseDualFilterBloomPasses(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & Readonly<BloomPassConfigs>,
        id: number,
        width: number,
        height: number,
        radianceName: string,
    ): rendering.BasicRenderPassBuilder {
        assert(!!this._bloomMaterial);
        const QueueHint = rendering.QueueHint;
        // Based on Kawase Dual Filter Blur. Saves bandwidth on mobile devices.
        // eslint-disable-next-line max-len
        // https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-20-66/siggraph2015_2D00_mmg_2D00_marius_2D00_slides.pdf

        // Size: [prefilter(1/2), downsample(1/4), downsample(1/8), downsample(1/16), ...]
        const iterations = this._bloomIterations;
        const sizeCount = iterations + 1;
        this._bloomWidths.length = sizeCount;
        this._bloomHeights.length = sizeCount;
        this._bloomWidths[0] = Math.max(Math.floor(width / 2), 1);
        this._bloomHeights[0] = Math.max(Math.floor(height / 2), 1);
        for (let i = 1; i !== sizeCount; ++i) {
            this._bloomWidths[i] = Math.max(Math.floor(this._bloomWidths[i - 1] / 2), 1);
            this._bloomHeights[i] = Math.max(Math.floor(this._bloomHeights[i - 1] / 2), 1);
        }

        // Bloom texture names
        this._bloomTexNames.length = sizeCount;
        for (let i = 0; i !== sizeCount; ++i) {
            this._bloomTexNames[i] = `BloomTex${id}_${i}`;
        }

        // Setup bloom parameters
        this._bloomParams.x = pplConfigs.useFloatOutput ? 1 : 0;
        this._bloomParams.x = 0; // unused
        this._bloomParams.z = this._bloomThreshold;
        this._bloomParams.w = this._bloomEnableAlphaMask ? 1 : 0;

        // Prefilter pass
        const prefilterPass = ppl.addRenderPass(this._bloomWidths[0], this._bloomHeights[0], 'cc-bloom-prefilter');
        prefilterPass.addRenderTarget(
            this._bloomTexNames[0],
            LoadOp.CLEAR,
            StoreOp.STORE,
            this._clearColorTransparentBlack,
        );
        prefilterPass.addTexture(radianceName, 'inputTexture');
        prefilterPass.setVec4('g_platform', pplConfigs.platform);
        prefilterPass.setVec4('bloomParams', this._bloomParams);
        prefilterPass
            .addQueue(QueueHint.OPAQUE)
            .addFullscreenQuad(this._bloomMaterial, 0);

        // Downsample passes
        for (let i = 1; i !== sizeCount; ++i) {
            const downPass = ppl.addRenderPass(this._bloomWidths[i], this._bloomHeights[i], 'cc-bloom-downsample');
            downPass.addRenderTarget(this._bloomTexNames[i], LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
            downPass.addTexture(this._bloomTexNames[i - 1], 'bloomTexture');
            this._bloomTexSize.x = this._bloomWidths[i - 1];
            this._bloomTexSize.y = this._bloomHeights[i - 1];
            downPass.setVec4('g_platform', pplConfigs.platform);
            downPass.setVec4('bloomTexSize', this._bloomTexSize);
            downPass
                .addQueue(QueueHint.OPAQUE)
                .addFullscreenQuad(this._bloomMaterial, 1);
        }

        // Upsample passes
        for (let i = iterations; i-- > 0;) {
            const upPass = ppl.addRenderPass(this._bloomWidths[i], this._bloomHeights[i], 'cc-bloom-upsample');
            upPass.addRenderTarget(this._bloomTexNames[i], LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
            upPass.addTexture(this._bloomTexNames[i + 1], 'bloomTexture');
            this._bloomTexSize.x = this._bloomWidths[i + 1];
            this._bloomTexSize.y = this._bloomHeights[i + 1];
            upPass.setVec4('g_platform', pplConfigs.platform);
            upPass.setVec4('bloomTexSize', this._bloomTexSize);
            upPass
                .addQueue(QueueHint.OPAQUE)
                .addFullscreenQuad(this._bloomMaterial, 2);
        }

        // Combine pass
        const combinePass = ppl.addRenderPass(width, height, 'cc-bloom-combine');
        combinePass.addRenderTarget(radianceName, LoadOp.LOAD, StoreOp.STORE);
        combinePass.addTexture(this._bloomTexNames[0], 'bloomTexture');
        combinePass.setVec4('g_platform', pplConfigs.platform);
        combinePass.setVec4('bloomParams', this._bloomParams);
        combinePass
            .addQueue(QueueHint.BLEND)
            .addFullscreenQuad(this._bloomMaterial, 3);

        if (cameraConfigs.remainingPasses === 0) {
            return addCopyToScreenPass(ppl, pplConfigs, cameraConfigs, radianceName);
        } else {
            return combinePass;
        }
    }
    // Bloom
    private readonly _clearColorTransparentBlack = new Color(0, 0, 0, 0);
    private readonly _bloomParams = new Vec4(0, 0, 0, 0);
    private readonly _bloomTexSize = new Vec4(0, 0, 0, 0);
    private readonly _bloomWidths: Array<number> = [];
    private readonly _bloomHeights: Array<number> = [];
    private readonly _bloomTexNames: Array<string> = [];
}
