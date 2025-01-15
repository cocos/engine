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
import { AttributeName, Format, Attribute, FormatInfos } from '../../gfx';
import { Mat4, Vec2, Vec3, Vec4, pseudoRandom, Quat, EPSILON, approx, RecyclePool, warn, Color } from '../../core';
import { MaterialInstance, IMaterialInstanceInfo } from '../../render-scene/core/material-instance';
import { MacroRecord } from '../../render-scene/core/pass-utils';
import { ParticleAlignmentSpace, ParticleRenderMode, ParticleSpace } from '../enum';
import { Particle, IParticleModule, PARTICLE_MODULE_ORDER, PARTICLE_MODULE_NAME } from '../particle';
import { ParticleSystemRendererBase } from './particle-system-renderer-base';
import { Camera } from '../../render-scene/scene/camera';
import { Pass } from '../../render-scene';
import { ParticleNoise } from '../noise';
import { NoiseModule } from '../animator/noise-module';
import { isCurveTwoValues } from '../particle-general-function';
import type { ParticleSystem } from '../particle-system';
import type ParticleSystemRenderer from './particle-system-renderer-data';

const _tempNodeScale = new Vec4();
const _tempAttribUV = new Vec3();
const _tempWorldTrans = new Mat4();
const _tempParentInverse = new Mat4();
const _node_rot = new Quat();
const _node_euler = new Vec3();

const _animModule = [
    '_colorOverLifetimeModule',
    '_sizeOvertimeModule',
    '_velocityOvertimeModule',
    '_forceOvertimeModule',
    '_limitVelocityOvertimeModule',
    '_rotationOvertimeModule',
    '_textureAnimationModule',
    '_noiseModule',
];

const _uvs = [
    0, 0, // bottom-left
    1, 0, // bottom-right
    0, 1, // top-left
    1, 1, // top-right
];

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';

const CC_RENDER_MODE = 'CC_RENDER_MODE';
const ROTATION_OVER_TIME_MODULE_ENABLE = 'ROTATION_OVER_TIME_MODULE_ENABLE';
const INSTANCE_PARTICLE = 'CC_INSTANCE_PARTICLE';
const RENDER_MODE_BILLBOARD = 0;
const RENDER_MODE_STRETCHED_BILLBOARD = 1;
const RENDER_MODE_HORIZONTAL_BILLBOARD = 2;
const RENDER_MODE_VERTICAL_BILLBOARD = 3;
const RENDER_MODE_MESH = 4;

const _vertex_attrs = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // color
];

const _vertex_attrs_stretch = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // color
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGB32F),         // particle velocity
];

const _vertex_attrs_mesh = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),       // particle position
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F),      // uv,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),     // particle color
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F),     // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F),         // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true),    // mesh color
];

const _vertex_attrs_ins = [
    new Attribute(AttributeName.ATTR_TEX_COORD4, Format.RGBA32F, false, 0, true),    // position,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F, false, 0, true),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F, false, 0, true),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true, 0, true),            // color
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F, false, 1),            // uv
];

const _vertex_attrs_stretch_ins = [
    new Attribute(AttributeName.ATTR_TEX_COORD4, Format.RGBA32F, false, 0, true),    // position,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F, false, 0, true),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F, false, 0, true),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true, 0, true),            // color
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGB32F, false, 0, true),         // particle velocity
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F, false, 1),            // uv
];

const _vertex_attrs_mesh_ins = [
    new Attribute(AttributeName.ATTR_TEX_COORD4, Format.RGBA32F, false, 0, true),    // particle position,frame idx
    new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F, false, 0, true),     // size
    new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F, false, 0, true),     // rotation
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true, 0, true),            // particle color
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F, false, 1),            // mesh uv
    new Attribute(AttributeName.ATTR_TEX_COORD3, Format.RGB32F, false, 1),           // mesh position
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F, false, 1),               // mesh normal
    new Attribute(AttributeName.ATTR_COLOR1, Format.RGBA8, true, 1),                 // mesh color
];

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

export class PVData {
    public position: Vec3;
    public texcoord: Vec3;
    public size: Vec3;
    public rotation: Vec3;
    public color: number;
    public velocity: Vec3 | null;

    constructor () {
        this.position = new Vec3();
        this.texcoord = new Vec3();
        this.size = new Vec3();
        this.rotation = new Vec3();
        this.color = 0;
        this.velocity = null;
    }
}

export default class ParticleSystemRendererCPU extends ParticleSystemRendererBase {
    private _defines: MacroRecord;
    private _trailDefines: MacroRecord;
    private _frameTile_velLenScale: Vec4;
    private _tmp_velLenScale: Vec4;
    private _defaultMat: Material | null = null;
    private _node_scale: Vec3;
    private _particleVertexData: PVData;
    private _particles: RecyclePool<Particle> | null = null;
    private _defaultTrailMat: Material | null = null;
    private _updateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _animateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _runAnimateList: IParticleModule[] = [];
    private _fillDataFunc: ((p: Particle, idx: number, fi: number) => void) | null = null;
    private _uScaleHandle = 0;
    private _uLenHandle = 0;
    private _uNodeRotHandle = 0;
    private _alignSpace = ParticleAlignmentSpace.View;
    private _inited = false;
    private _localMat: Mat4 = new Mat4();
    private _gravity: Vec4 = new Vec4();

    constructor (info: ParticleSystemRenderer) {
        super(info);

        this._model = null;

        this._frameTile_velLenScale = new Vec4(1, 1, 0, 0);
        this._tmp_velLenScale = this._frameTile_velLenScale.clone();
        this._node_scale = new Vec3();
        this._particleVertexData = new PVData();
        this._defines = {
            CC_USE_WORLD_SPACE: true,
            CC_USE_BILLBOARD: true,
            CC_USE_STRETCHED_BILLBOARD: false,
            CC_USE_HORIZONTAL_BILLBOARD: false,
            CC_USE_VERTICAL_BILLBOARD: false,
        };
        this._trailDefines = {
            CC_USE_WORLD_SPACE: true,
            // CC_DRAW_WIRE_FRAME: true,   // <wireframe debug>
        };
    }

    public onInit (ps: ParticleSystem): void {
        super.onInit(ps);

        this._particles = new RecyclePool((): Particle => new Particle(this), 16);
        this._setVertexAttrib();
        this._setFillFunc();
        this._initModuleList();
        this._initModel();
        this.updateMaterialParams();
        this.updateTrailMaterial();
        this.setVertexAttributes();
        this._inited = true;
    }

    public clear (): void {
        super.clear();
        this._particles!.reset();
        if (this._particleSystem && this._particleSystem._trailModule) {
            this._particleSystem._trailModule.clear();
        }
        this.updateRenderData();
        this._model!.enabled = false;
    }

    public updateRenderMode (): void {
        this._setVertexAttrib();
        this._setFillFunc();
        this.updateMaterialParams();
        this.setVertexAttributes();
    }

    public onDestroy (): void {
        this._particles?.destroy();
        super.onDestroy();
    }

    public getFreeParticle (): Particle | null {
        if (this._particleSystem && this._particles!.length >= this._particleSystem.capacity) {
            return null;
        }
        return this._particles!.add();
    }

    public getDefaultTrailMaterial (): any {
        return this._defaultTrailMat;
    }

    public setNewParticle (p: Particle): void {
    }

    private _initModuleList (): void {
        _animModule.forEach((val: string): void => {
            if (!this._particleSystem) {
                return;
            }
            const pm = this._particleSystem[val] as IParticleModule;
            if (pm && pm.enable) {
                if (pm.needUpdate) {
                    this._updateList.set(pm.name, pm);
                }

                if (pm.needAnimate) {
                    this._animateList.set(pm.name, pm);
                }
            }
        });

        // reorder
        this._runAnimateList.length = 0;
        for (let i = 0, len = PARTICLE_MODULE_ORDER.length; i < len; i++) {
            const p = this._animateList.get(PARTICLE_MODULE_ORDER[i]);
            if (p) {
                this._runAnimateList.push(p);
            }
        }
    }

    public enableModule (name: string, val: boolean, pm: IParticleModule): void {
        if (val) {
            if (pm.needUpdate) {
                this._updateList.set(pm.name, pm);
            }

            if (pm.needAnimate) {
                this._animateList.set(pm.name, pm);
            }
        } else {
            this._animateList.delete(name);
            this._updateList.delete(name);
        }
        // reorder
        this._runAnimateList.length = 0;
        for (let i = 0, len = PARTICLE_MODULE_ORDER.length; i < len; i++) {
            const p = this._animateList.get(PARTICLE_MODULE_ORDER[i]);
            if (p) {
                this._runAnimateList.push(p);
            }
        }

        this.updateMaterialParams();
    }

    public updateAlignSpace (space: number): void {
        this._alignSpace = space;
    }

    public getDefaultMaterial (): Material | null {
        return this._defaultMat;
    }

    public updateRotation (pass: Pass | null): void {
        if (pass) {
            this.doUpdateRotation(pass);
        }
    }

    private doUpdateRotation (pass: Pass): void {
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
            if (cameraLst !== undefined) {
                for (let i = 0; i < cameraLst?.length; ++i) {
                    const camera: Camera = cameraLst[i];
                    // eslint-disable-next-line max-len
                    const checkCamera: boolean = !EDITOR_NOT_IN_PREVIEW ? (camera.visibility & this._particleSystem!.node.layer) === this._particleSystem!.node.layer : camera.name === 'Editor Camera';
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
            this._particleSystem?.node.getScale(nodeScale);
            break;
        case ParticleSpace.World:
            this._particleSystem?.node.getWorldScale(nodeScale);
            break;
        default:
            break;
        }
        // NOTE: the `_node_scale` should be a Vec3, but we implement `scale` uniform property as a Vec4,
        // here we pass a temperate Vec4 object to prevent creating Vec4 object every time we set uniform.
        pass.setUniform(this._uScaleHandle, _tempNodeScale.set(nodeScale.x, nodeScale.y, nodeScale.z));
    }

    private noise: ParticleNoise = new ParticleNoise();

    public updateParticles (dt: number): number {
        const ps = this._particleSystem;
        if (!ps) {
            return this._particles!.length;
        }
        ps.node.getWorldMatrix(_tempWorldTrans);
        const mat: Material | null = ps.getMaterialInstance(0) || this._defaultMat;
        const pass = mat!.passes[0];
        this.doUpdateScale(pass);
        this.doUpdateRotation(pass);

        this._updateList.forEach((value: IParticleModule, key: string): void => {
            // TODO(cjh): Bug here? _updateList is a Map, the old code uses `this._updateList['some_key'] = some_value;`
            // to do the assignment which forEach will not take care of it.
            // In order not to change the behavior in this PR ( https://github.com/cocos/cocos-engine/pull/17289 )
            // We commented the update the particle module temporarily.
            // value.update(ps.simulationSpace, _tempWorldTrans);
        });

        const trailModule = ps._trailModule;
        const trailEnable = trailModule && trailModule.enable;
        if (trailEnable) {
            trailModule.update();
        }

        const useGravity = !ps.gravityModifier.isZero();
        if (useGravity) {
            if (ps.simulationSpace === ParticleSpace.Local) {
                const r: Quat = ps.node.getRotation();
                Mat4.fromQuat(this._localMat, r);
                this._localMat.transpose(); // just consider rotation, use transpose as invert
            }

            if (ps.node.parent) {
                const r: Quat = ps.node.parent.getWorldRotation();
                Mat4.fromQuat(_tempParentInverse, r);
                _tempParentInverse.transpose();
            }
        }

        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            p.remainingLifetime -= dt;
            Vec3.set(p.animatedVelocity, 0, 0, 0);

            if (p.remainingLifetime < 0.0) {
                if (trailEnable) {
                    trailModule.removeParticle(p);
                }
                this._particles!.removeAt(i);
                --i;
                continue;
            }

            // apply gravity when both the mode is not Constant and the value is not 0.
            if (useGravity) {
                const rand = isCurveTwoValues(ps.gravityModifier) ? pseudoRandom(p.randomSeed) : 0;
                if (ps.simulationSpace === ParticleSpace.Local) {
                    const time = 1 - p.remainingLifetime / p.startLifetime;
                    const gravityFactor = -ps.gravityModifier.evaluate(time, rand)! * 9.8 * dt;
                    this._gravity.x = 0.0;
                    this._gravity.y = gravityFactor;
                    this._gravity.z = 0.0;
                    this._gravity.w = 1.0;
                    if (!approx(gravityFactor, 0.0, EPSILON)) {
                        if (ps.node.parent) {
                            this._gravity = this._gravity.transformMat4(_tempParentInverse);
                        }
                        this._gravity = this._gravity.transformMat4(this._localMat);

                        p.velocity.x += this._gravity.x;
                        p.velocity.y += this._gravity.y;
                        p.velocity.z += this._gravity.z;
                    }
                } else {
                    // apply gravity.
                    p.velocity.y -= ps.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, rand)! * 9.8 * dt;
                }
            }
            Vec3.copy(p.ultimateVelocity, p.velocity);

            this._runAnimateList.forEach((value): void => {
                value.animate(p, dt);
            });

            Vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
            if (trailEnable) {
                trailModule.animate(p, dt);
            }
        }

        this._model!.enabled = this._particles!.length > 0;
        return this._particles!.length;
    }

    public getNoisePreview (out: number[], width: number, height: number): void {
        this._runAnimateList.forEach((value): void => {
            if (value.name === PARTICLE_MODULE_NAME.NOISE) {
                const m = value as NoiseModule;
                m.getNoisePreview(out, this._particleSystem!, width, height);
            }
        });
    }

    // internal function
    public updateRenderData (): void {
        // update vertex buffer
        let idx = 0;
        for (let i = 0; i < this._particles!.length; ++i) {
            const p = this._particles!.data[i];
            let fi = 0;
            const textureModule = this._particleSystem!._textureAnimationModule;
            if (textureModule && textureModule.enable) {
                fi = p.frameIndex;
            }
            idx = i * 4;
            this._fillDataFunc!(p, idx, fi);
        }
    }

    public beforeRender (): void {
        // because we use index buffer, per particle index count = 6.
        this._model!.updateIA(this._particles!.length);
    }

    public getParticleCount (): number {
        return this._particles!.length;
    }

    public onMaterialModified (index: number, material: Material): void {
        if (!this._inited) {
            return;
        }

        if (index === 0) {
            this.updateMaterialParams();
        } else {
            this.updateTrailMaterial();
        }
    }

    public onRebuildPSO (index: number, material: Material): void {
        if (this._model && index === 0) {
            this._model.setSubModelMaterial(0, material);
        }
        const trailModule = this._particleSystem!._trailModule;
        const trailModel = trailModule?.getModel();
        if (trailModel && index === 1) {
            trailModel.setSubModelMaterial(0, material);
        }
    }

    private _setFillFunc (): void {
        if (this._renderInfo!.renderMode === ParticleRenderMode.Mesh) {
            this._fillDataFunc = this._fillMeshData;
        } else if (this._renderInfo!.renderMode === ParticleRenderMode.StrecthedBillboard) {
            this._fillDataFunc = this._fillStrecthedData;
        } else {
            this._fillDataFunc = this._fillNormalData;
        }
    }

    private _fillMeshData (p: Particle, idx: number, fi: number): void {
        const i = idx / 4;
        Vec3.copy(this._particleVertexData.position, p.position);
        _tempAttribUV.z = fi;
        Vec3.copy(this._particleVertexData.texcoord, _tempAttribUV);
        Vec3.copy(this._particleVertexData.size, p.size);
        Vec3.copy(this._particleVertexData.rotation, p.rotation);
        this._particleVertexData.color = Color.toUint32(p.color);
        this._model!.addParticleVertexData(i, this._particleVertexData);
    }

    private _fillStrecthedData (p: Particle, idx: number, fi: number): void {
        if (!this._useInstance) {
            for (let j = 0; j < 4; ++j) { // four verts per particle.
                Vec3.copy(this._particleVertexData.position, p.position);
                _tempAttribUV.x = _uvs[2 * j];
                _tempAttribUV.y = _uvs[2 * j + 1];
                _tempAttribUV.z = fi;
                Vec3.copy(this._particleVertexData.texcoord, _tempAttribUV);
                Vec3.copy(this._particleVertexData.size, p.size);
                Vec3.copy(this._particleVertexData.rotation, p.rotation);
                this._particleVertexData.color = Color.toUint32(p.color);
                this._particleVertexData.velocity = p.ultimateVelocity;
                this._model!.addParticleVertexData(idx++, this._particleVertexData);
            }
        } else {
            this._fillStrecthedDataIns(p, idx, fi);
        }
    }

    private _fillStrecthedDataIns (p: Particle, idx: number, fi: number): void {
        const i = idx / 4;
        Vec3.copy(this._particleVertexData.position, p.position);
        _tempAttribUV.z = fi;
        Vec3.copy(this._particleVertexData.texcoord, _tempAttribUV);
        Vec3.copy(this._particleVertexData.size, p.size);
        Vec3.copy(this._particleVertexData.rotation, p.rotation);
        this._particleVertexData.color = Color.toUint32(p.color);
        this._particleVertexData.velocity = p.ultimateVelocity;
        this._model!.addParticleVertexData(i, this._particleVertexData);
    }

    private _fillNormalData (p: Particle, idx: number, fi: number): void {
        if (!this._useInstance) {
            for (let j = 0; j < 4; ++j) { // four verts per particle.
                Vec3.copy(this._particleVertexData.position, p.position);
                _tempAttribUV.x = _uvs[2 * j];
                _tempAttribUV.y = _uvs[2 * j + 1];
                _tempAttribUV.z = fi;
                Vec3.copy(this._particleVertexData.texcoord, _tempAttribUV);
                Vec3.copy(this._particleVertexData.size, p.size);
                Vec3.copy(this._particleVertexData.rotation, p.rotation);
                this._particleVertexData.color = Color.toUint32(p.color);
                this._model!.addParticleVertexData(idx++, this._particleVertexData);
            }
        } else {
            this._fillNormalDataIns(p, idx, fi);
        }
    }

    private _fillNormalDataIns (p: Particle, idx: number, fi: number): void {
        const i = idx / 4;
        Vec3.copy(this._particleVertexData.position, p.position);
        _tempAttribUV.z = fi;
        Vec3.copy(this._particleVertexData.texcoord, _tempAttribUV);
        Vec3.copy(this._particleVertexData.size, p.size);
        Vec3.copy(this._particleVertexData.rotation, p.rotation);
        this._particleVertexData.color = Color.toUint32(p.color);
        this._model!.addParticleVertexData(i, this._particleVertexData);
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
                this._vertAttrs[7] = new Attribute(AttributeName.ATTR_COLOR1, type, true, !this._useInstance ? 0 : 1);
            } else { // mesh without vertex color
                const type = Format.RGBA8;
                this._vertAttrs[7] = new Attribute(AttributeName.ATTR_COLOR1, type, true, !this._useInstance ? 0 : 1);
            }
        }
    }

    private _setVertexAttrib (): void {
        if (!this._useInstance) {
            switch (this._renderInfo!.renderMode) {
            case ParticleRenderMode.StrecthedBillboard:
                this._vertAttrs = _vertex_attrs_stretch.slice();
                break;
            case ParticleRenderMode.Mesh:
                this._vertAttrs = _vertex_attrs_mesh.slice();
                break;
            default:
                this._vertAttrs = _vertex_attrs.slice();
            }
        } else {
            this._setVertexAttribIns();
        }
    }

    private _setVertexAttribIns (): void {
        switch (this._renderInfo!.renderMode) {
        case ParticleRenderMode.StrecthedBillboard:
            this._vertAttrs = _vertex_attrs_stretch_ins.slice();
            break;
        case ParticleRenderMode.Mesh:
            this._vertAttrs = _vertex_attrs_mesh_ins.slice();
            break;
        default:
            this._vertAttrs = _vertex_attrs_ins.slice();
        }
    }

    public updateMaterialParams (): void {
        if (!this._particleSystem) {
            return;
        }

        const ps = this._particleSystem;
        const shareMaterial = ps.sharedMaterial;
        if (shareMaterial != null) {
            this._renderInfo!.mainTexture = shareMaterial.getProperty('mainTexture', 0) as Texture2D;
        }

        if (ps.sharedMaterial == null && this._defaultMat == null) {
            _matInsInfo.parent = builtinResMgr.get<Material>('default-particle-material');
            _matInsInfo.owner = this._particleSystem;
            _matInsInfo.subModelIdx = 0;
            this._defaultMat = new MaterialInstance(_matInsInfo);
            _matInsInfo.parent = null!;
            _matInsInfo.owner = null!;
            _matInsInfo.subModelIdx = 0;
            if (this._renderInfo!.mainTexture !== null) {
                this._defaultMat.setProperty('mainTexture', this._renderInfo!.mainTexture);
            }
        }
        const mat: Material = ps.getMaterialInstance(0) || this._defaultMat!;
        if (ps.simulationSpace === ParticleSpace.World) {
            this._defines[CC_USE_WORLD_SPACE] = true;
        } else {
            this._defines[CC_USE_WORLD_SPACE] = false;
        }

        const pass = mat.passes[0];
        this._uScaleHandle = pass.getHandle('scale');
        this._uLenHandle = pass.getHandle('frameTile_velLenScale');
        this._uNodeRotHandle = pass.getHandle('nodeRotation');

        const renderMode = this._renderInfo!.renderMode;
        const vlenScale = this._frameTile_velLenScale;
        if (renderMode === ParticleRenderMode.Billboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_BILLBOARD;
        } else if (renderMode === ParticleRenderMode.StrecthedBillboard) {
            this._defines[CC_RENDER_MODE] = RENDER_MODE_STRETCHED_BILLBOARD;
            vlenScale.z = this._renderInfo!.velocityScale;
            vlenScale.w = this._renderInfo!.lengthScale;
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
            Vec4.copy(this._tmp_velLenScale, vlenScale); // fix textureModule switch bug
            Vec2.set(this._tmp_velLenScale, textureModule.numTilesX, textureModule.numTilesY);
            pass.setUniform(this._uLenHandle, this._tmp_velLenScale);
        } else {
            pass.setUniform(this._uLenHandle, vlenScale);
        }

        let enable = false;
        const roationModule = this._particleSystem._rotationOvertimeModule;
        enable = roationModule ? roationModule.enable : false;
        this._defines[ROTATION_OVER_TIME_MODULE_ENABLE] = enable;
        this._defines[INSTANCE_PARTICLE] = this._useInstance;

        mat.recompileShaders(this._defines);
        if (this._model) {
            this._model.updateMaterial(mat);
        }
    }

    public updateTrailMaterial (): void {
        if (!this._particleSystem) {
            return;
        }
        const ps = this._particleSystem;
        const trailModule = ps._trailModule;
        if (trailModule && trailModule.enable) {
            if (ps.simulationSpace === ParticleSpace.World || trailModule.space === ParticleSpace.World) {
                this._trailDefines[CC_USE_WORLD_SPACE] = true;
            } else {
                this._trailDefines[CC_USE_WORLD_SPACE] = false;
            }
            let mat: Material | null = ps.getMaterialInstance(1);
            if (mat === null && this._defaultTrailMat === null) {
                _matInsInfo.parent = builtinResMgr.get<Material>('default-trail-material');
                _matInsInfo.owner = this._particleSystem;
                _matInsInfo.subModelIdx = 1;
                this._defaultTrailMat = new MaterialInstance(_matInsInfo);
                _matInsInfo.parent = null!;
                _matInsInfo.owner = null!;
                _matInsInfo.subModelIdx = 0;
            }
            mat = mat || this._defaultTrailMat!;
            mat.recompileShaders(this._trailDefines);
            trailModule.updateMaterial();
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
}
