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

import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { builtinResMgr } from '../../asset/asset-manager';
import { Material, Texture2D } from '../../asset/assets';
import { Component } from '../../scene-graph';
import { AttributeName, Format, Attribute, API, deviceManager, FormatInfos } from '../../gfx';
import { Mat4, Vec2, Vec4, Quat, Vec3, warn } from '../../core';
import { MaterialInstance, IMaterialInstanceInfo } from '../../render-scene/core/material-instance';
import { MacroRecord } from '../../render-scene/core/pass-utils';
import { ParticleAlignmentSpace, ParticleRenderMode, ParticleSpace } from '../enum';
import { Particle, IParticleModule } from '../particle';
import { packGradientRange } from '../animator/gradient-range';
import { Pass } from '../../render-scene/core/pass';
import { packCurveRangeXYZ, packCurveRangeZ, packCurveRangeXYZW, packCurveRangeN, packCurveRangeXY } from '../animator/curve-range';
import { ParticleSystemRendererBase } from './particle-system-renderer-base';
import { Camera } from '../../render-scene/scene/camera';
import type { ParticleSystem } from '../particle-system';
import type ParticleSystemRenderer from './particle-system-renderer-data';

const _tempNodeScale = new Vec4();
const _tempWorldTrans = new Mat4();
const _tempVec4 = new Vec4();
const _world_rot = new Quat();
const _node_rot = new Quat();
const _node_euler = new Vec3();

const _sample_num = 32;
const _sample_interval = 1.0 / _sample_num;

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';

const CC_RENDER_MODE = 'CC_RENDER_MODE';
const RENDER_MODE_BILLBOARD = 0;
const RENDER_MODE_STRETCHED_BILLBOARD = 1;
const RENDER_MODE_HORIZONTAL_BILLBOARD = 2;
const RENDER_MODE_VERTICAL_BILLBOARD = 3;
const RENDER_MODE_MESH = 4;

const COLOR_OVER_TIME_MODULE_ENABLE = 'COLOR_OVER_TIME_MODULE_ENABLE';
const ROTATION_OVER_TIME_MODULE_ENABLE = 'ROTATION_OVER_TIME_MODULE_ENABLE';
const SIZE_OVER_TIME_MODULE_ENABLE = 'SIZE_OVER_TIME_MODULE_ENABLE';
const VELOCITY_OVER_TIME_MODULE_ENABLE = 'VELOCITY_OVER_TIME_MODULE_ENABLE';
const FORCE_OVER_TIME_MODULE_ENABLE = 'FORCE_OVER_TIME_MODULE_ENABLE';
const TEXTURE_ANIMATION_MODULE_ENABLE = 'TEXTURE_ANIMATION_MODULE_ENABLE';
const USE_VK_SHADER = 'USE_VK_SHADER';
const INSTANCE_PARTICLE = 'CC_INSTANCE_PARTICLE';

const _vert_attr_name = {
    POSITION_STARTTIME: 'a_position_starttime',
    VERT_SIZE_UV: 'a_size_uv',
    VERT_ROTATION_UV: 'a_rotation_uv',
    COLOR: 'a_color',
    DIR_LIFE: 'a_dir_life',
    RANDOM_SEED: 'a_rndSeed',
    VERT_SIZE_FID: 'a_size_fid',
    VERT_ROTATION: 'a_rotation',
    VERT_UV: 'a_uv',
};

const _gpu_vert_attr = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_SIZE_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_ROTATION_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F),
];

const _gpu_vert_attr_mesh = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_SIZE_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.VERT_ROTATION_UV, Format.RGBA32F),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F),     // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F),         // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true),    // mesh color
];

const _gpu_vert_attr_ins = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.VERT_SIZE_FID, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.VERT_ROTATION, Format.RGB32F, false, 0, true),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F, false, 0, true),
    new Attribute(_vert_attr_name.VERT_UV, Format.RGB32F, false, 1),
];

const _gpu_vert_attr_mesh_ins = [
    new Attribute(_vert_attr_name.POSITION_STARTTIME, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.VERT_SIZE_FID, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.VERT_ROTATION, Format.RGB32F, false, 0, true),
    new Attribute(_vert_attr_name.COLOR, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.DIR_LIFE, Format.RGBA32F, false, 0, true),
    new Attribute(_vert_attr_name.RANDOM_SEED, Format.R32F, false, 0, true),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F, false, 1),      // mesh uv
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F, false, 1),     // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F, false, 1),         // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true, 1),           // mesh color
];

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

export default class ParticleSystemRendererGPU extends ParticleSystemRendererBase {
    private _defines: MacroRecord;
    private _frameTile_velLenScale: Vec4;
    private _unifrom_velLenScale: Vec4;
    private _tmp_velLenScale: Vec4;
    private _node_scale: Vec3;
    protected _vertAttrs: Attribute[] = [];
    protected _defaultMat: Material | null = null;
    private _particleNum = 0;
    private _tempParticle: Particle | null = null;
    private _colorTexture: Texture2D | null = null;
    private _forceTexture: Texture2D | null = null;
    private _velocityTexture: Texture2D | null = null;
    private _rotationTexture: Texture2D | null = null;
    private _sizeTexture: Texture2D | null = null;
    private _animTexture: Texture2D | null = null;
    private _colorData: Uint8Array | null = null;
    private _forceData: Float32Array | null = null;
    private _velocityData: Float32Array | null = null;
    private _rotationData: Float32Array | null = null;
    private _sizeData: Float32Array | null = null;
    private _animData: Float32Array | null = null;
    private _uTimeHandle = 0;
    private _uRotHandle = 0;
    private _uNodeRotHandle = 0;
    private _alignSpace = ParticleAlignmentSpace.View;
    private _inited = false;

    constructor (info: ParticleSystemRenderer) {
        super(info);

        this._frameTile_velLenScale = new Vec4(1, 1, 0, 0);
        this._unifrom_velLenScale = this._frameTile_velLenScale.clone();
        this._tmp_velLenScale = this._frameTile_velLenScale.clone();
        this._node_scale = new Vec3();
        this._defines = {
            CC_USE_WORLD_SPACE: true,
            CC_USE_BILLBOARD: true,
            CC_USE_STRETCHED_BILLBOARD: false,
            CC_USE_HORIZONTAL_BILLBOARD: false,
            CC_USE_VERTICAL_BILLBOARD: false,
            COLOR_OVER_TIME_MODULE_ENABLE: false,
        };

        this._tempParticle = new Particle(null);
        this._particleNum = 0;
    }

    public onInit (ps: ParticleSystem): void {
        super.onInit(ps);
        this._setVertexAttrib();
        this._initModel();
        this.updateMaterialParams();
        this.setVertexAttributes();
        this._inited = true;
    }

    public updateRenderMode (): void {
        this._setVertexAttrib();
        this.updateMaterialParams();
        this.setVertexAttributes();
    }

    public setVertexAttributes (): void {
        super.setVertexAttributes();
        this._model!.constructAttributeIndex();
    }

    public clear (): void {
        super.clear();
        this._particleNum = 0;
        this.updateRenderData();
    }

    public onDestroy (): void {
        super.onDestroy();
        if (this._forceTexture) this._forceTexture.destroy();
        if (this._velocityTexture) this._velocityTexture.destroy();
        if (this._colorTexture) this._colorTexture.destroy();
        if (this._sizeTexture) this._sizeTexture.destroy();
        if (this._rotationTexture) this._rotationTexture.destroy();
        if (this._animTexture) this._animTexture.destroy();
        this._forceData = null;
        this._velocityData = null;
        this._colorData = null;
        this._sizeData = null;
        this._rotationData = null;
        this._animData = null;
    }

    public enableModule (name: string, val: boolean, pm: IParticleModule): void {
        const mat: Material | null = this._particleSystem?.getMaterialInstance(0) || this._defaultMat;
        if (!mat) {
            return;
        }
        this.initShaderUniform(mat);
        mat.recompileShaders(this._defines);
        if (this._model) {
            this._model.setSubModelMaterial(0, mat);
        }
    }

    public getFreeParticle (): Particle | null {
        if (this._particleSystem && this._particleNum >= this._particleSystem?.capacity) {
            return null;
        }

        return this._tempParticle;
    }

    public setNewParticle (p: Particle): void {
        if (!this._particleSystem) {
            return;
        }
        this._model!.addGPUParticleVertexData(p, this._particleNum, this._particleSystem.time);
        this._particleNum++;
    }

    public getDefaultMaterial (): Material | null {
        return this._defaultMat;
    }

    public updateRotation (pass: Pass | null): void {
        if (pass) {
            this.doUpdateRotation(pass);
        }
    }

    private doUpdateRotation (pass): void {
        const mode = this._renderInfo!.renderMode;
        if (mode !== ParticleRenderMode.Mesh && this._alignSpace === ParticleAlignmentSpace.View) {
            return;
        }

        if (this._alignSpace === ParticleAlignmentSpace.Local) {
            this._particleSystem?.node.getRotation(_node_rot);
        } else if (this._alignSpace === ParticleAlignmentSpace.World) {
            this._particleSystem?.node.getWorldRotation(_node_rot);
        } else if (this._alignSpace === ParticleAlignmentSpace.View) {
            // Quat.fromEuler(_node_rot, 0.0, 0.0, 0.0);
            _node_rot.set(0.0, 0.0, 0.0, 1.0);
            const cameraLst: Camera[] | undefined = this._particleSystem?.node.scene.renderScene?.cameras;
            if (cameraLst !== undefined && this._particleSystem) {
                for (let i = 0; i < cameraLst?.length; ++i) {
                    const camera: Camera = cameraLst[i];
                    // eslint-disable-next-line max-len
                    const checkCamera: boolean = !EDITOR_NOT_IN_PREVIEW ? (camera.visibility & this._particleSystem.node.layer) === this._particleSystem.node.layer : camera.name === 'Editor Camera';
                    if (checkCamera) {
                        Quat.fromViewUp(_node_rot, camera.forward);
                        break;
                    }
                }
            }
        } else {
            _node_rot.set(0.0, 0.0, 0.0, 1.0);
        }
        pass.setUniform(this._uNodeRotHandle, _node_rot);
    }

    public updateScale (pass: Pass | null): void {
        if (pass) {
            this.doUpdateScale(pass);
        }
    }

    private doUpdateScale (pass): void {
        const nodeScale = this._node_scale;
        switch (this._particleSystem?.scaleSpace) {
        case ParticleSpace.Local:
            this._particleSystem.node.getScale(nodeScale);
            break;
        case ParticleSpace.World:
            this._particleSystem.node.getWorldScale(nodeScale);
            break;
        default:
            break;
        }
        // NOTE: the `_node_scale` should be a Vec3, but we implement `scale` uniform property as a Vec4,
        // here we pass a temperate Vec4 object to prevent creating Vec4 object every time we set uniform.
        pass.setUniform(pass.getHandle('scale'), _tempNodeScale.set(nodeScale.x, nodeScale.y, nodeScale.z));
    }

    public updateParticles (dt: number): number {
        if (!this._particleSystem) {
            return this._particleNum;
        }
        if (EDITOR_NOT_IN_PREVIEW) {
            const mat: Material | null = this._particleSystem.getMaterialInstance(0) || this._defaultMat;

            this._particleSystem.node.getWorldMatrix(_tempWorldTrans);
            switch (this._particleSystem.scaleSpace) {
            case ParticleSpace.Local:
                this._particleSystem.node.getScale(this._node_scale);
                break;
            case ParticleSpace.World:
                this._particleSystem.node.getWorldScale(this._node_scale);
                break;
            default:
                break;
            }

            this.initShaderUniform(mat!);
        }
        this._particleNum = this._model!.updateGPUParticles(this._particleNum, this._particleSystem.time, dt);
        this.updateShaderUniform(dt);
        this._model!.enabled = this._particleNum > 0;
        return this._particleNum;
    }

    // internal function
    public updateRenderData (): void {
    }

    public beforeRender (): void {
        // update vertex buffer
        this._model!.updateIA(this._particleNum);
    }

    public updateAlignSpace (space: number): void {
        this._alignSpace = space;
    }

    public updateShaderUniform (dt: number): void {
        if (!this._particleSystem) {
            return;
        }
        const mat: Material | null = this._particleSystem.getMaterialInstance(0) || this._defaultMat;
        if (!mat) {
            return;
        }

        const pass = mat.passes[0];
        _tempVec4.x = this._particleSystem.time;
        _tempVec4.y = dt;
        pass.setUniform(this._uTimeHandle, _tempVec4);

        this._particleSystem.node.getWorldRotation(_world_rot);
        pass.setUniform(this._uRotHandle, _world_rot);

        this.doUpdateRotation(pass);
    }

    public initShaderUniform (mat: Material): void {
        const pass = mat.passes[0];

        this._uTimeHandle = pass.getHandle('u_timeDelta');
        this._uRotHandle = pass.getHandle('u_worldRot');
        this._uNodeRotHandle = pass.getHandle('nodeRotation');

        this.doUpdateScale(pass);
        pass.setUniform(pass.getHandle('frameTile_velLenScale'), this._unifrom_velLenScale);
        _tempVec4.x = _sample_num;
        _tempVec4.y = _sample_interval;
        pass.setUniform(pass.getHandle('u_sampleInfo'), _tempVec4);

        let enable = false;
        // force
        const forceModule = this._particleSystem?._forceOvertimeModule;
        enable = forceModule ? forceModule.enable : false;
        this._defines[FORCE_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            const packed = packCurveRangeXYZ(this._forceTexture, this._forceData, _sample_num, forceModule!.x, forceModule!.y, forceModule!.z);
            this._forceTexture = packed.texture;
            this._forceData = packed.texdata;
            const handle = pass.getHandle('force_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._forceTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._forceTexture.getGFXTexture()!);
            const spaceHandle = pass.getHandle('u_force_space');
            pass.setUniform(spaceHandle, forceModule!.space);
            const modeHandle = pass.getHandle('u_force_mode');
            pass.setUniform(modeHandle, this._forceTexture.height);
        }

        // velocity
        const velocityModule = this._particleSystem?._velocityOvertimeModule;
        enable = velocityModule ? velocityModule.enable : false;
        this._defines[VELOCITY_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            const packed = packCurveRangeXYZW(
                this._velocityTexture,
                this._velocityData,
                _sample_num,
                velocityModule!.x,
                velocityModule!.y,
                velocityModule!.z,
                velocityModule!.speedModifier,
            );
            this._velocityTexture = packed.texture;
            this._velocityData = packed.texdata;
            const handle = pass.getHandle('velocity_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._velocityTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._velocityTexture.getGFXTexture()!);
            const spaceHandle = pass.getHandle('u_velocity_space');
            pass.setUniform(spaceHandle, velocityModule!.space);
            const modeHandle = pass.getHandle('u_velocity_mode');
            pass.setUniform(modeHandle, this._velocityTexture.height);
        }

        // color module
        const colorModule = this._particleSystem?._colorOverLifetimeModule;
        enable = colorModule ? colorModule.enable : false;
        this._defines[COLOR_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            const packed = packGradientRange(this._colorTexture, this._colorData, _sample_num, colorModule!.color);
            this._colorTexture = packed.texture;
            this._colorData = packed.texdata;
            const handle = pass.getHandle('color_over_time_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._colorTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._colorTexture.getGFXTexture()!);
            const modeHandle = pass.getHandle('u_color_mode');
            pass.setUniform(modeHandle, this._colorTexture.height);
        }

        // rotation module
        const roationModule = this._particleSystem?._rotationOvertimeModule;
        enable = roationModule ? roationModule.enable : false;
        this._defines[ROTATION_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            let packed;
            if (roationModule!.separateAxes) {
                // eslint-disable-next-line max-len
                packed = packCurveRangeXYZ(this._rotationTexture, this._rotationData, _sample_num, roationModule!.x, roationModule!.y, roationModule!.z);
            } else {
                packed = packCurveRangeZ(this._rotationTexture, this._rotationData, _sample_num, roationModule!.z);
            }
            this._rotationTexture = packed.texture;
            this._rotationData = packed.texdata;
            if (this._rotationTexture) {
                const handle = pass.getHandle('rotation_over_time_tex0');
                const binding = Pass.getBindingFromHandle(handle);
                pass.bindSampler(binding, this._rotationTexture.getGFXSampler()!);
                pass.bindTexture(binding, this._rotationTexture.getGFXTexture()!);
                const modeHandle = pass.getHandle('u_rotation_mode');
                pass.setUniform(modeHandle, this._rotationTexture.height);
            }
        }

        // size module
        const sizeModule = this._particleSystem?._sizeOvertimeModule;
        enable = sizeModule ? sizeModule.enable : false;
        this._defines[SIZE_OVER_TIME_MODULE_ENABLE] = enable;
        if (enable) {
            let packed;
            if (sizeModule!.separateAxes) {
                packed = packCurveRangeXYZ(this._sizeTexture, this._sizeData, _sample_num, sizeModule!.x, sizeModule!.y, sizeModule!.z, true);
            } else {
                packed = packCurveRangeN(this._sizeTexture, this._sizeData, _sample_num, sizeModule!.size, true);
            }
            this._sizeTexture = packed.texture;
            this._sizeData = packed.texdata;
            if (this._sizeTexture) {
                const handle = pass.getHandle('size_over_time_tex0');
                const binding = Pass.getBindingFromHandle(handle);
                pass.bindSampler(binding, this._sizeTexture.getGFXSampler()!);
                pass.bindTexture(binding, this._sizeTexture.getGFXTexture()!);
                const modeHandle = pass.getHandle('u_size_mode');
                pass.setUniform(modeHandle, this._sizeTexture.height);
            }
        }

        // texture module
        const textureModule = this._particleSystem?._textureAnimationModule;
        enable = textureModule ? textureModule.enable : false;
        this._defines[TEXTURE_ANIMATION_MODULE_ENABLE] = enable;
        if (enable) {
            // eslint-disable-next-line max-len
            const packed = packCurveRangeXY(this._animTexture, this._animData, _sample_num, textureModule!.startFrame, textureModule!.frameOverTime, true);
            this._animTexture = packed.texture;
            this._animData = packed.texdata;
            const handle = pass.getHandle('texture_animation_tex0');
            const binding = Pass.getBindingFromHandle(handle);
            pass.bindSampler(binding, this._animTexture.getGFXSampler()!);
            pass.bindTexture(binding, this._animTexture.getGFXTexture()!);
            const infoHandle = pass.getHandle('u_anim_info');
            _tempVec4.x = this._animTexture.height;
            _tempVec4.y = textureModule!.numTilesX * textureModule!.numTilesY;
            _tempVec4.z = textureModule!.cycleCount;
            pass.setUniform(infoHandle, _tempVec4);
        }

        this._defines[USE_VK_SHADER] = deviceManager.gfxDevice.gfxAPI === API.VULKAN;
        this._defines[INSTANCE_PARTICLE] = this._useInstance;
    }

    public getParticleCount (): number {
        return this._particleNum;
    }

    public onMaterialModified (index: number, material: Material): void {
        if (!this._inited) {
            return;
        }
        this.updateMaterialParams();
    }

    public onRebuildPSO (index: number, material: Material): void {
        if (this._model && index === 0) {
            this._model.setSubModelMaterial(0, material);
        }
    }

    public updateVertexAttrib (): void {
        if (this._renderInfo!.renderMode !== ParticleRenderMode.Mesh) {
            return;
        }
        if (this._renderInfo!.mesh) {
            const format = this._renderInfo!.mesh.readAttributeFormat(0, AttributeName.ATTR_COLOR);
            if (format) {
                let type = Format.RGBA8;
                for (let i = 0; i < FormatInfos.length; ++i) {
                    if (FormatInfos[i].name === format.name) {
                        type = i;
                        break;
                    }
                }
                this._vertAttrs[9] = new Attribute(AttributeName.ATTR_COLOR1, type, true, !this._useInstance ? 0 : 1);
            } else { // mesh without vertex color
                const type = Format.RGBA8;
                this._vertAttrs[9] = new Attribute(AttributeName.ATTR_COLOR1, type, true, !this._useInstance ? 0 : 1);
            }
        }
    }

    private _setVertexAttrib (): void {
        if (!this._useInstance) {
            switch (this._renderInfo!.renderMode) {
            case ParticleRenderMode.StrecthedBillboard:
                this._vertAttrs = _gpu_vert_attr.slice();
                break;
            case ParticleRenderMode.Mesh:
                this._vertAttrs = _gpu_vert_attr_mesh.slice();
                break;
            default:
                this._vertAttrs = _gpu_vert_attr.slice();
            }
        } else {
            this._setVertexAttribIns();
        }
    }

    private _setVertexAttribIns (): void {
        switch (this._renderInfo!.renderMode) {
        case ParticleRenderMode.StrecthedBillboard:
            this._vertAttrs = _gpu_vert_attr_ins.slice();
            break;
        case ParticleRenderMode.Mesh:
            this._vertAttrs = _gpu_vert_attr_mesh_ins.slice();
            break;
        default:
            this._vertAttrs = _gpu_vert_attr_ins.slice();
        }
    }

    public updateMaterialParams (): void {
        if (!this._particleSystem) {
            return;
        }
        const ps = this._particleSystem;
        const shareMaterial = ps.sharedMaterial;
        if (shareMaterial !== null) {
            this._renderInfo!.mainTexture = shareMaterial.getProperty('mainTexture', 0) as Texture2D;
        }

        if (ps.sharedMaterial == null && this._defaultMat == null) {
            _matInsInfo.parent = builtinResMgr.get<Material>('default-particle-gpu-material');
            _matInsInfo.owner = ps;
            _matInsInfo.subModelIdx = 0;
            this._defaultMat = new MaterialInstance(_matInsInfo);
            _matInsInfo.parent = null!;
            _matInsInfo.owner = null!;
            _matInsInfo.subModelIdx = 0;
            if (this._renderInfo!.mainTexture !== null) {
                this._defaultMat.setProperty('mainTexture', this._renderInfo!.mainTexture);
            }
        }
        const mat: Material | null = ps.getMaterialInstance(0) || this._defaultMat;

        ps.node.getWorldMatrix(_tempWorldTrans);

        if (ps.simulationSpace === ParticleSpace.World) {
            this._defines[CC_USE_WORLD_SPACE] = true;
        } else {
            this._defines[CC_USE_WORLD_SPACE] = false;
        }
        const renderMode = this._renderInfo!.renderMode;
        if (renderMode === ParticleRenderMode.Billboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_BILLBOARD;
        } else if (renderMode === ParticleRenderMode.StrecthedBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_STRETCHED_BILLBOARD;
            this._frameTile_velLenScale.z = this._renderInfo!.velocityScale;
            this._frameTile_velLenScale.w = this._renderInfo!.lengthScale;
        } else if (renderMode === ParticleRenderMode.HorizontalBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_HORIZONTAL_BILLBOARD;
        } else if (renderMode === ParticleRenderMode.VerticalBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_VERTICAL_BILLBOARD;
        } else if (renderMode === ParticleRenderMode.Mesh) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_MESH;
        } else {
            warn(`particle system renderMode ${renderMode} not support.`);
        }
        const textureModule = ps._textureAnimationModule;
        if (textureModule && textureModule.enable) {
            Vec2.set(this._frameTile_velLenScale, textureModule.numTilesX, textureModule.numTilesY);
            Vec4.copy(this._unifrom_velLenScale, this._frameTile_velLenScale);
        } else {
            this._tmp_velLenScale.z = this._frameTile_velLenScale.z;
            this._tmp_velLenScale.w = this._frameTile_velLenScale.w;
            Vec4.copy(this._unifrom_velLenScale, this._tmp_velLenScale);
        }

        this.initShaderUniform(mat!);

        mat!.recompileShaders(this._defines);

        if (this._model) {
            this._model.updateMaterial(mat!);
        }
    }

    public setUseInstance (value: boolean): void {
        if (this._useInstance === value) {
            return;
        }
        this._useInstance = value;
        if (this._model) {
            this._model.useInstance = value;
            this._model.doDestroy();
        }
        this.updateRenderMode();
    }

    public getNoisePreview (out: number[], width: number, height: number): void {

    }
}
