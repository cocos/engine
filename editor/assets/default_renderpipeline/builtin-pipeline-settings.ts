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
    _decorator, Camera, CCBoolean, CCFloat, CCInteger, Component,
    Material, rendering, Texture2D,
} from 'cc';

import { EDITOR } from 'cc/env';

import {
    fillRequiredPipelineSettings, makePipelineSettings, PipelineSettings,
} from './builtin-pipeline-types';

const { ccclass, disallowMultiple, executeInEditMode, menu, property, requireComponent, type } = _decorator;

@ccclass('BuiltinPipelineSettings')
@menu('Rendering/BuiltinPipelineSettings')
@requireComponent(Camera)
@disallowMultiple
@executeInEditMode
export class BuiltinPipelineSettings extends Component {
    @property
    private readonly _settings: PipelineSettings = makePipelineSettings();

    getPipelineSettings(): PipelineSettings {
        return this._settings;
    }

    // Enable/Disable
    onEnable(): void {
        fillRequiredPipelineSettings(this._settings);
        const cameraComponent = this.getComponent(Camera)!;
        const camera = cameraComponent.camera;
        camera.pipelineSettings = this._settings;

        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    onDisable(): void {
        const cameraComponent = this.getComponent(Camera)!;
        const camera = cameraComponent.camera;
        camera.pipelineSettings = null;

        if (EDITOR) {
            this._disableEditorPreview();
        }
    }

    // Editor Preview
    @property(CCBoolean)
    protected _editorPreview = false;

    @property({
        displayName: 'Editor Preview (Experimental)',
        type: CCBoolean,
    })
    get editorPreview(): boolean {
        return this._editorPreview;
    }
    set editorPreview(v: boolean) {
        this._editorPreview = v;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    public _tryEnableEditorPreview(): void {
        if (rendering === undefined) {
            return;
        }
        if (this._editorPreview) {
            rendering.setEditorPipelineSettings(this._settings);
        } else {
            this._disableEditorPreview();
        }
    }
    public _disableEditorPreview(): void {
        if (rendering === undefined) {
            return;
        }
        const current = rendering.getEditorPipelineSettings() as PipelineSettings | null;
        if (current === this._settings) {
            rendering.setEditorPipelineSettings(null);
        }
    }

    // MSAA
    @property({
        group: { id: 'MSAA', name: 'Multisample Anti-Aliasing' },
        type: CCBoolean,
    })
    get MsaaEnable(): boolean {
        return this._settings.msaa.enabled;
    }
    set MsaaEnable(value: boolean) {
        this._settings.msaa.enabled = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }

    @property({
        group: { id: 'MSAA', name: 'Multisample Anti-Aliasing', style: 'section' },
        type: CCInteger,
        range: [2, 4, 2],
    })
    set msaaSampleCount(value: number) {
        value = 2 ** Math.ceil(Math.log2(Math.max(value, 2)));
        value = Math.min(value, 4);
        this._settings.msaa.sampleCount = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get msaaSampleCount(): number {
        return this._settings.msaa.sampleCount;
    }

    // Shading Scale
    @property({
        group: { id: 'ShadingScale', name: 'ShadingScale', style: 'section' },
        type: CCBoolean,
    })
    set shadingScaleEnable(value: boolean) {
        this._settings.enableShadingScale = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get shadingScaleEnable(): boolean {
        return this._settings.enableShadingScale;
    }

    @property({
        tooltip: 'i18n:postprocess.shadingScale',
        group: { id: 'ShadingScale', name: 'ShadingScale' },
        type: CCFloat,
        range: [0.01, 4, 0.01],
        slide: true,
    })
    set shadingScale(value: number) {
        this._settings.shadingScale = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get shadingScale(): number {
        return this._settings.shadingScale;
    }

    // Bloom
    @property({
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set bloomEnable(value: boolean) {
        this._settings.bloom.enabled = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get bloomEnable(): boolean {
        return this._settings.bloom.enabled;
    }

    @property({
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: Material,
    })
    set bloomMaterial(value: Material) {
        if (this._settings.bloom.material === value) {
            return;
        }
        this._settings.bloom.material = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get bloomMaterial(): Material {
        return this._settings.bloom.material!;
    }

    @property({
        tooltip: 'i18n:bloom.enableAlphaMask',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set bloomEnableAlphaMask(value: boolean) {
        this._settings.bloom.enableAlphaMask = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get bloomEnableAlphaMask(): boolean {
        return this._settings.bloom.enableAlphaMask;
    }

    @property({
        tooltip: 'i18n:bloom.iterations',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCInteger,
        range: [1, 6, 1],
        slide: true,
    })
    set bloomIterations(value: number) {
        this._settings.bloom.iterations = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get bloomIterations(): number {
        return this._settings.bloom.iterations;
    }

    @property({
        tooltip: 'i18n:bloom.threshold',
        group: { id: 'Bloom', name: 'Bloom (PostProcessing)', style: 'section' },
        type: CCFloat,
        min: 0,
    })
    set bloomThreshold(value: number) {
        this._settings.bloom.threshold = value;
    }
    get bloomThreshold(): number {
        return this._settings.bloom.threshold;
    }

    set bloomIntensity(value: number) {
        this._settings.bloom.intensity = value;
    }
    get bloomIntensity(): number {
        return this._settings.bloom.intensity;
    }

    // Color Grading (LDR)
    @property({
        group: { id: 'Color Grading', name: 'ColorGrading (LDR) (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set colorGradingEnable(value: boolean) {
        this._settings.colorGrading.enabled = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get colorGradingEnable(): boolean {
        return this._settings.colorGrading.enabled;
    }

    @property({
        group: { id: 'Color Grading', name: 'ColorGrading (LDR) (PostProcessing)', style: 'section' },
        type: Material,
    })
    set colorGradingMaterial(value: Material) {
        if (this._settings.colorGrading.material === value) {
            return;
        }
        this._settings.colorGrading.material = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get colorGradingMaterial(): Material {
        return this._settings.colorGrading.material!;
    }

    @property({
        tooltip: 'i18n:color_grading.contribute',
        group: { id: 'Color Grading', name: 'ColorGrading (LDR) (PostProcessing)', style: 'section' },
        type: CCFloat,
        range: [0, 1, 0.01],
        slide: true,
    })
    set colorGradingContribute(value: number) {
        this._settings.colorGrading.contribute = value;
    }
    get colorGradingContribute(): number {
        return this._settings.colorGrading.contribute;
    }

    @property({
        tooltip: 'i18n:color_grading.originalMap',
        group: { id: 'Color Grading', name: 'ColorGrading (LDR) (PostProcessing)', style: 'section' },
        type: Texture2D,
    })
    set colorGradingMap(val: Texture2D) {
        this._settings.colorGrading.colorGradingMap = val;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get colorGradingMap(): Texture2D {
        return this._settings.colorGrading.colorGradingMap!;
    }

    // FXAA
    @property({
        group: { id: 'FXAA', name: 'Fast Approximate Anti-Aliasing (PostProcessing)', style: 'section' },
        type: CCBoolean,
    })
    set fxaaEnable(value: boolean) {
        this._settings.fxaa.enabled = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get fxaaEnable(): boolean {
        return this._settings.fxaa.enabled;
    }

    @property({
        group: { id: 'FXAA', name: 'Fast Approximate Anti-Aliasing (PostProcessing)', style: 'section' },
        type: Material,
    })
    set fxaaMaterial(value: Material) {
        if (this._settings.fxaa.material === value) {
            return;
        }
        this._settings.fxaa.material = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get fxaaMaterial(): Material {
        return this._settings.fxaa.material!;
    }

    // FSR
    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: CCBoolean,
    })
    set fsrEnable(value: boolean) {
        this._settings.fsr.enabled = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get fsrEnable(): boolean {
        return this._settings.fsr.enabled;
    }

    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: Material,
    })
    set fsrMaterial(value: Material) {
        if (this._settings.fsr.material === value) {
            return;
        }
        this._settings.fsr.material = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get fsrMaterial(): Material {
        return this._settings.fsr.material!;
    }

    @property({
        group: { id: 'FSR', name: 'FidelityFX Super Resolution', style: 'section' },
        type: CCFloat,
        range: [0, 1, 0.01],
        slide: true,
    })
    set fsrSharpness(value: number) {
        this._settings.fsr.sharpness = value;
    }
    get fsrSharpness(): number {
        return this._settings.fsr.sharpness;
    }

    @property({
        group: { id: 'ToneMapping', name: 'ToneMapping', style: 'section' },
        type: Material,
    })
    set toneMappingMaterial(value: Material) {
        if (this._settings.toneMapping.material === value) {
            return;
        }
        this._settings.toneMapping.material = value;
        if (EDITOR) {
            this._tryEnableEditorPreview();
        }
    }
    get toneMappingMaterial(): Material {
        return this._settings.toneMapping.material!;
    }
}
