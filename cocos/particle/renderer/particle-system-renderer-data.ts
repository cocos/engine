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

import { ccclass, tooltip, displayOrder, type, serializable, disallowAnimation, visible } from 'cc.decorator';
import { Mesh } from '../../3d';
import { Material, Texture2D } from '../../asset/assets';
import { ParticleAlignmentSpace, ParticleRenderMode } from '../enum';
import ParticleSystemRendererCPU from './particle-system-renderer-cpu';
import ParticleSystemRendererGPU from './particle-system-renderer-gpu';
import { director } from '../../game/director';
import { Device, Format, FormatFeatureBit } from '../../gfx';
import { errorID, warnID, cclegacy } from '../../core';

import type { ParticleSystem } from '../particle-system';

function isSupportGPUParticle (): boolean {
    const device: Device = director.root!.device;
    if (device.capabilities.maxVertexTextureUnits >= 8 && (device.getFormatFeatures(Format.RGBA32F)
        & (FormatFeatureBit.RENDER_TARGET | FormatFeatureBit.SAMPLED_TEXTURE))) {
        return true;
    }

    cclegacy.warn('Maybe the device has restrictions on vertex textures or does not support float textures.');
    return false;
}

@ccclass('cc.ParticleSystemRenderer')
export default class ParticleSystemRenderer {
    /**
     * @zh 设定粒子生成模式。
     */
    @type(ParticleRenderMode)
    @displayOrder(0)
    @tooltip('i18n:particleSystemRenderer.renderMode')
    public get renderMode (): number {
        return this._renderMode;
    }

    public set renderMode (val) {
        if (this._renderMode === val) {
            return;
        }
        this._renderMode = val;
        if (this._particleSystem) {
            this._particleSystem.processor.updateRenderMode();
        }
    }

    /**
     * @zh 在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按速度大小进行拉伸。
     */
    @displayOrder(1)
    @tooltip('i18n:particleSystemRenderer.velocityScale')
    public get velocityScale (): number {
        return this._velocityScale;
    }

    public set velocityScale (val) {
        this._velocityScale = val;
        if (this._particleSystem) {
            this._particleSystem.processor.updateMaterialParams();
        }
        // this._updateModel();
    }

    /**
     * @zh 在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按粒子大小进行拉伸。
     */
    @displayOrder(2)
    @tooltip('i18n:particleSystemRenderer.lengthScale')
    public get lengthScale (): number {
        return this._lengthScale;
    }

    public set lengthScale (val) {
        this._lengthScale = val;
        if (this._particleSystem) {
            this._particleSystem.processor.updateMaterialParams();
        }
        // this._updateModel();
    }

    @type(ParticleRenderMode)
    @serializable
    private _renderMode = ParticleRenderMode.Billboard;

    @serializable
    private _velocityScale = 1;

    @serializable
    private _lengthScale = 1;

    @serializable
    private _mesh: Mesh | null = null;

    /**
     * @zh 粒子发射的模型。
     */
    @type(Mesh)
    @displayOrder(7)
    @tooltip('i18n:particleSystemRenderer.mesh')
    public get mesh (): Mesh | null {
        return this._mesh;
    }

    public set mesh (val) {
        this._mesh = val;
        if (this._particleSystem) {
            this._particleSystem.processor.setVertexAttributes();
        }
    }

    /**
     * @zh 粒子使用的材质。
     */
    @type(Material)
    @displayOrder(8)
    @disallowAnimation
    @visible(false)
    @tooltip('i18n:particleSystemRenderer.particleMaterial')
    public get particleMaterial (): Material | null {
        if (!this._particleSystem) {
            return null;
        }
        return this._particleSystem.getSharedMaterial(0) as Material;
    }

    public set particleMaterial (val: Material | null) {
        if (this._particleSystem) {
            this._particleSystem.setSharedMaterial(val, 0);
        }
    }

    /**
     * @en particle cpu material
     * @zh 粒子使用的cpu材质。
     */
    @type(Material)
    @displayOrder(8)
    @disallowAnimation
    public get cpuMaterial (): Material | null {
        return this._cpuMaterial;
    }

    public set cpuMaterial (val: Material | null) {
        if (val) {
            const effectName = val.effectName;
            if (effectName.indexOf('particle') === -1 || effectName.indexOf('particle-gpu') !== -1) {
                warnID(6035);
                return;
            }
        }
        this._cpuMaterial = val;
        this.particleMaterial = this._cpuMaterial;
    }

    @serializable
    private _cpuMaterial: Material | null = null;

    /**
     * @en particle gpu material
     * @zh 粒子使用的gpu材质。
     */
    @type(Material)
    @displayOrder(8)
    @disallowAnimation
    public get gpuMaterial (): Material | null {
        return this._gpuMaterial;
    }

    public set gpuMaterial (val: Material | null) {
        if (val) {
            const effectName = val.effectName;
            if (effectName.indexOf('particle-gpu') === -1) {
                warnID(6035);
                return;
            }
        }
        this._gpuMaterial = val;
        this.particleMaterial = this._gpuMaterial;
    }

    @serializable
    private _gpuMaterial: Material | null = null;

    /**
     * @en particle trail material
     * @zh 拖尾使用的材质。
     */
    @type(Material)
    @displayOrder(9)
    @disallowAnimation
    @tooltip('i18n:particleSystemRenderer.trailMaterial')
    public get trailMaterial (): Material | null {
        if (!this._particleSystem) {
            return null;
        }
        return this._particleSystem.getSharedMaterial(1) as Material;
    }

    public set trailMaterial (val: Material | null) {
        if (this._particleSystem) {
            this._particleSystem.setSharedMaterial(val, 1);
        }
    }

    @serializable
    private _mainTexture: Texture2D | null = null;

    public get mainTexture (): Texture2D | null {
        return this._mainTexture;
    }

    public set mainTexture (val) {
        this._mainTexture = val;
    }

    @serializable
    private _useGPU = false;

    @displayOrder(10)
    @tooltip('i18n:particleSystemRenderer.useGPU')
    public get useGPU (): boolean {
        return this._useGPU;
    }

    public set useGPU (val) {
        if (this._useGPU === val) {
            return;
        }

        if (!isSupportGPUParticle()) {
            this._useGPU = false;
        } else {
            this._useGPU = val;
        }

        this._switchProcessor();
    }

    /**
     * @en Particle alignment space option. Includes world, local and view.
     * @zh 粒子对齐空间选择。包括世界空间，局部空间和视角空间。
     */
    @type(ParticleAlignmentSpace)
    @displayOrder(10)
    @tooltip('i18n:particle_system.alignSpace')
    public get alignSpace (): number {
        return this._alignSpace;
    }

    public set alignSpace (val: number) {
        this._alignSpace = val;
        this._particleSystem.processor.updateAlignSpace(this._alignSpace);
    }

    @serializable
    private _alignSpace = ParticleAlignmentSpace.View;

    public static AlignmentSpace = ParticleAlignmentSpace;

    private _particleSystem: ParticleSystem = null!;

    create (ps: ParticleSystem): void {
        // if particle system is null we run the old routine
        // else if particle system is not null we do nothing
        if (this._particleSystem === null) {
            this._particleSystem = ps;
        } else if (this._particleSystem !== ps) {
            errorID(6033);
        }
    }

    onInit (ps: ParticleSystem): void {
        this.create(ps);
        const useGPU = this._useGPU && isSupportGPUParticle();
        if (!this._particleSystem.processor) {
            this._particleSystem.processor = useGPU ? new ParticleSystemRendererGPU(this) : new ParticleSystemRendererCPU(this);
            this._particleSystem.processor.updateAlignSpace(this.alignSpace);
            this._particleSystem.processor.onInit(ps);
        } else {
            errorID(6034);
        }
        if (!useGPU) {
            if (this.particleMaterial && this.particleMaterial.effectName.indexOf('particle-gpu') !== -1) {
                this.particleMaterial = null;
                warnID(6035);
            }
            this.cpuMaterial = this.particleMaterial;
        } else {
            this.gpuMaterial = this.particleMaterial;
        }
    }

    private _switchProcessor (): void {
        if (!this._particleSystem) {
            return;
        }
        if (this._particleSystem.processor) {
            this._particleSystem.processor.detachFromScene();
            this._particleSystem.processor.clear();
            this._particleSystem.processor = null!;
        }
        const useGPU = this._useGPU && isSupportGPUParticle();
        this.particleMaterial = useGPU ? this.gpuMaterial : this.cpuMaterial;
        this._particleSystem.processor = useGPU ? new ParticleSystemRendererGPU(this) : new ParticleSystemRendererCPU(this);
        this._particleSystem.processor.updateAlignSpace(this.alignSpace);
        this._particleSystem.processor.onInit(this._particleSystem);
        this._particleSystem.processor.onEnable();
        (this._particleSystem as any).bindModule();
    }
}
