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

import { ccclass, tooltip, displayOrder, type, serializable, range } from 'cc.decorator';
import { Material } from '../../asset/assets/material';
import { RenderingSubMesh } from '../../asset/assets/rendering-sub-mesh';
import { director } from '../../game/director';
import { AttributeName, BufferUsageBit, Format, FormatInfos, MemoryUsageBit, PrimitiveMode,
    Device, Attribute, BufferInfo } from '../../gfx';
import { Color, Mat4, Quat, toRadian, Vec3, Pool, warnID, cclegacy } from '../../core';
import { scene } from '../../render-scene';
import CurveRange from '../animator/curve-range';
import GradientRange from '../animator/gradient-range';
import { Space, TextureMode, TrailMode } from '../enum';
import { Particle } from '../particle';
import { TransformBit } from '../../scene-graph/node-enum';
import type { ParticleSystem } from '../particle-system';
import type { Root } from '../../root';

const PRE_TRIANGLE_INDEX = 1;
const NEXT_TRIANGLE_INDEX = 1 << 2;
const DIRECTION_THRESHOLD = Math.cos(toRadian(100));

const _temp_trailEle = { position: new Vec3(), velocity: new Vec3() } as ITrailElement;
const _temp_quat = new Quat();
const _temp_vec3 = new Vec3();
const _temp_vec3_1 = new Vec3();
const _temp_color = new Color();

// const barycentric = [1, 0, 0, 0, 1, 0, 0, 0, 1]; // <wireframe debug>

// let _bcIdx = 0; // <wireframe debug>

interface ITrailElement {
    position: Vec3;
    lifetime: number;
    width: number;
    velocity: Vec3;
    direction: number; // if one element's direction differs from the previous one,it means the trail's direction reverse.
    color: Color;
}

// the valid element is in [start,end) range.if start equals -1,it represents the array is empty.
class TrailSegment {
    public start: number;
    public end: number;
    public trailElements: ITrailElement[];

    constructor (maxTrailElementNum: number) {
        this.start = -1;
        this.end = -1;
        this.trailElements = [];
        while (maxTrailElementNum--) {
            this.trailElements.push({
                position: new Vec3(),
                lifetime: 0,
                width: 0,
                velocity: new Vec3(),
                direction: 0,
                color: new Color(),
            });
        }
    }

    public getElement (idx: number): ITrailElement | null {
        if (this.start === -1) {
            return null;
        }
        if (idx < 0) {
            idx = (idx + this.trailElements.length) % this.trailElements.length;
        }
        if (idx >= this.trailElements.length) {
            idx %= this.trailElements.length;
        }
        return this.trailElements[idx];
    }

    public addElement (): ITrailElement | null {
        if (this.trailElements.length === 0) {
            return null;
        }
        if (this.start === -1) {
            this.start = 0;
            this.end = 1;
            return this.trailElements[0];
        }
        if (this.start === this.end) {
            this.trailElements.splice(this.end, 0, {
                position: new Vec3(),
                lifetime: 0,
                width: 0,
                velocity: new Vec3(),
                direction: 0,
                color: new Color(),
            });
            this.start++;
            this.start %= this.trailElements.length;
        }
        const newEleLoc = this.end++;
        this.end %= this.trailElements.length;
        return this.trailElements[newEleLoc];
    }

    public iterateElement (
        target: TrailModule,
        f: (target: TrailModule, e: ITrailElement, p: Particle, dt: number) => boolean,
        p: Particle,
        dt: number,
    ): void {
        const end = this.start >= this.end ? this.end + this.trailElements.length : this.end;
        for (let i = this.start; i < end; i++) {
            if (f(target, this.trailElements[i % this.trailElements.length], p, dt)) {
                this.start++;
                this.start %= this.trailElements.length;
            }
        }
        if (this.start === end) {
            this.start = -1;
            this.end = -1;
        }
    }

    public count (): number {
        if (this.start < this.end) {
            return this.end - this.start;
        } else {
            return this.trailElements.length + this.end - this.start;
        }
    }

    public clear (): void {
        this.start = -1;
        this.end = -1;
    }

    // <debug>
    // public _print () {
    //     let msg = String();
    //     this.iterateElement(this, (target: object, e: ITrailElement, p: Particle, dt: number) => {
    //         msg += 'pos:' + e.position.toString() + ' lifetime:' + e.lifetime + ' dir:' + e.direction +
    //                ' velocity:' + e.velocity.toString() + '\n';
    //         return false;
    //     }, null, 0);
    //     console.log(msg);
    // }
}

@ccclass('cc.TrailModule')
export default class TrailModule {
    /**
     * 是否启用。
     */
    @displayOrder(0)
    public get enable (): boolean {
        return this._enable;
    }

    public set enable (val) {
        if (val === this._enable && this._trailModel) {
            return;
        }
        if (val && !this._enable) {
            this._enable = val;
            if (this._particleSystem!.processor) this._particleSystem!.processor.updateTrailMaterial();
        }
        if (val && !this._trailModel) {
            this._createModel();
            this.rebuild();
        }
        this._enable = val;
        if (this._trailModel) {
            this._trailModel.enabled = val;
        }

        if (val) this.onEnable();
        else this.onDisable();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _enable = false;

    /**
     * 设定粒子生成轨迹的方式。
     */
    @type(TrailMode)
    @serializable
    @displayOrder(1)
    @tooltip('i18n:trailSegment.mode')
    public mode = TrailMode.Particles;

    /**
     * 轨迹存在的生命周期。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(3)
    @tooltip('i18n:trailSegment.lifeTime')
    public lifeTime = new CurveRange();

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _minParticleDistance = 0.1;

    /**
     * 每个轨迹粒子之间的最小间距。
     */
    @displayOrder(5)
    @tooltip('i18n:trailSegment.minParticleDistance')
    public get minParticleDistance (): number {
        return this._minParticleDistance;
    }

    public set minParticleDistance (val) {
        this._minParticleDistance = val;
        this._minSquaredDistance = val * val;
    }

    @type(Space)
    @displayOrder(6)
    @tooltip('i18n:trailSegment.space')
    public get space (): number {
        return this._space;
    }

    public set space (val) {
        this._space = val;
        const ps = this._particleSystem;
        if (ps && ps.processor) {
            ps.processor.updateTrailMaterial();
        }
    }

    /**
     * 粒子本身是否存在。
     */
    @serializable
    public existWithParticles = true;

    /**
     * 设定纹理填充方式。
     */
    @type(TextureMode)
    @serializable
    @displayOrder(8)
    @tooltip('i18n:trailSegment.textureMode')
    public textureMode = TextureMode.Stretch;

    @serializable
    @displayOrder(9)
    @tooltip('i18n:trailSegment.widthFromParticle')
    public widthFromParticle = true;

    /**
     * 控制轨迹长度的曲线。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(10)
    @tooltip('i18n:trailSegment.widthRatio')
    public widthRatio = new CurveRange();

    @serializable
    @displayOrder(11)
    @tooltip('i18n:trailSegment.colorFromParticle')
    public colorFromParticle = false;

    @type(GradientRange)
    @serializable
    @displayOrder(12)
    @tooltip('i18n:trailSegment.colorOverTrail')
    public colorOverTrail = new GradientRange();

    @type(GradientRange)
    @serializable
    @displayOrder(13)
    @tooltip('i18n:trailSegment.colorOvertime')
    public colorOvertime = new GradientRange();

    /**
     * @en Get trail model
     * @zh 获取拖尾模型
     * @return Model of this trail and type is scene.Model
     */
    public getModel (): scene.Model | null {
        return this._trailModel;
    }

    /**
     * 轨迹设定时的坐标系。
     */
    @type(Space)
    private _space = Space.World;

    @serializable
    private _particleSystem: ParticleSystem | null = null;

    private _minSquaredDistance = 0;
    private _vertSize: number;
    private _trailNum = 0;
    private _trailLifetime = 0;
    private vbOffset = 0;
    private ibOffset = 0;
    private _trailSegments: Pool<TrailSegment> | null = null;
    private _particleTrail: Map<Particle, TrailSegment>;
    private _trailModel: scene.Model | null = null;
    private _subMeshData: RenderingSubMesh | null = null;
    private _vertAttrs: Attribute[];
    private _vbF32: Float32Array | null = null;
    private _vbUint32: Uint32Array | null = null;
    private _iBuffer: Uint16Array | null = null;
    private _needTransform = false;
    private _material: Material | null = null;
    private _psTransform = new Mat4();
    private _iaVertCount = 0;
    private _iaIndexCount = 0;
    /**
     * @engineInternal
     */
    public get inited (): boolean {
        return this._inited;
    }
    private _inited: boolean;

    constructor () {
        this._vertAttrs = [
            new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),   // xyz:position
            new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGBA32F), // x:index y:size zw:texcoord
            // new Attribute(AttributeName.ATTR_TEX_COORD2, Format.RGB32F), // <wireframe debug>
            new Attribute(AttributeName.ATTR_TEX_COORD1, Format.RGB32F), // xyz:velocity
            new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8, true),
        ];
        this._vertSize = 0;
        for (const a of this._vertAttrs) {
            this._vertSize += FormatInfos[a.format].size;
        }

        this._particleTrail = new Map<Particle, TrailSegment>();

        this._inited = false;
    }

    public onInit (ps: ParticleSystem): void {
        this._particleSystem = ps;
        this.minParticleDistance = this._minParticleDistance;
        let burstCount = 0;
        const psTime = ps.startLifetime.getMax();
        const psRate = ps.rateOverTime.getMax();
        const duration = ps.duration;
        for (let i = 0, len = ps.bursts.length; i < len; i++) {
            const b = ps.bursts[i];
            burstCount += b.getMaxCount(ps) * Math.ceil(psTime / duration);
        }
        if (this.lifeTime.getMax() < 1.0) {
            warnID(6036);
        }
        this._trailNum = Math.ceil(psTime * Math.ceil(this.lifeTime.getMax()) * 60 * (psRate * duration + burstCount));
        this._trailSegments = new Pool(
            (): TrailSegment => new TrailSegment(10),
            Math.ceil(psRate * duration),
            (obj: TrailSegment): void => { obj.trailElements.length = 0; },
        );
        if (this._enable) {
            this.enable = this._enable;
        }
        this._inited = true;
    }

    public onEnable (): void {
        this._attachToScene();
    }

    public onDisable (): void {
        this._particleTrail.clear();
        this._detachFromScene();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _attachToScene (): void {
        if (this._trailModel) {
            if (this._trailModel.scene) {
                this._detachFromScene();
            }
            this._particleSystem!._getRenderScene().addModel(this._trailModel);
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _detachFromScene (): void {
        if (this._trailModel && this._trailModel.scene) {
            this._trailModel.scene.removeModel(this._trailModel);
        }
    }

    public destroy (): void {
        this.destroySubMeshData();
        if (this._trailModel) {
            director.root!.destroyModel(this._trailModel);
            this._trailModel = null;
        }
        if (this._trailSegments) {
            this._trailSegments.destroy();
            this._trailSegments = null;
        }
    }

    public play (): void {
        if (this._trailModel && this._enable) {
            this._trailModel.enabled = true;
        }
    }

    public clear (): void {
        if (this.enable) {
            const trailIter = this._particleTrail.values();
            let trail = trailIter.next();
            while (!trail.done) {
                trail.value.clear();
                trail = trailIter.next();
            }
            this._particleTrail.clear();
            this.updateRenderData();
            if (this._trailModel) this._trailModel.enabled = false;
        }
    }

    public updateMaterial (): void {
        if (this._particleSystem) {
            this._material = this._particleSystem.getMaterialInstance(1)
                || (this._particleSystem.processor as any)._defaultTrailMat;
            if (this._trailModel) {
                this._trailModel.setSubModelMaterial(0, this._material!);
            }
        }
    }

    public update (): void {
        this._trailLifetime = this.lifeTime.evaluate(this._particleSystem!.time, 1)!;
        if (this.space === Space.World && this._particleSystem!.simulationSpace === Space.Local) {
            this._needTransform = true;
            this._particleSystem!.node.getWorldMatrix(this._psTransform);
            this._particleSystem!.node.getWorldRotation(_temp_quat);
        } else {
            this._needTransform = false;
        }
    }

    public animate (p: Particle, scaledDt: number): void {
        if (!this._trailSegments) {
            return;
        }

        if (p.loopCount > p.lastLoop) {
            if (p.trailDelay > 1) {
                p.lastLoop = p.loopCount;
                p.trailDelay = 0;
            } else {
                p.trailDelay++;
            }
            return;
        }

        let trail = this._particleTrail.get(p);
        if (!trail) {
            trail = this._trailSegments.alloc();
            this._particleTrail.set(p, trail);
            // Avoid position and trail are one frame apart at the end of the particle animation.
            return;
        }
        let lastSeg = trail.getElement(trail.end - 1);
        if (this._needTransform) {
            Vec3.transformMat4(_temp_vec3, p.position, this._psTransform);
        } else {
            Vec3.copy(_temp_vec3, p.position);
        }
        if (lastSeg) {
            trail.iterateElement(this, this._updateTrailElement, p, scaledDt);
            if (Vec3.squaredDistance(lastSeg.position, _temp_vec3) < this._minSquaredDistance) {
                return;
            }
        }
        lastSeg = trail.addElement();
        if (!lastSeg) {
            return;
        }

        Vec3.copy(lastSeg.position, _temp_vec3);
        lastSeg.lifetime = 0;
        if (this.widthFromParticle) {
            lastSeg.width = p.size.x * this.widthRatio.evaluate(0, 1)!;
        } else {
            lastSeg.width = this.widthRatio.evaluate(0, 1)!;
        }

        const trailNum = trail.count();
        if (trailNum === 2) {
            const lastSecondTrail = trail.getElement(trail.end - 2)!;
            Vec3.subtract(lastSecondTrail.velocity, lastSeg.position, lastSecondTrail.position);
        } else if (trailNum > 2) {
            const lastSecondTrail = trail.getElement(trail.end - 2)!;
            const lastThirdTrail = trail.getElement(trail.end - 3)!;
            Vec3.subtract(_temp_vec3, lastThirdTrail.position, lastSecondTrail.position);
            Vec3.subtract(_temp_vec3_1, lastSeg.position, lastSecondTrail.position);
            Vec3.subtract(lastSecondTrail.velocity, _temp_vec3_1, _temp_vec3);
            if (Vec3.equals(Vec3.ZERO, lastSecondTrail.velocity)) {
                Vec3.copy(lastSecondTrail.velocity, _temp_vec3);
            }
            Vec3.normalize(lastSecondTrail.velocity, lastSecondTrail.velocity);
            this._checkDirectionReverse(lastSecondTrail, lastThirdTrail);
        }
        if (this.colorFromParticle) {
            lastSeg.color.set(p.color);
        } else {
            lastSeg.color.set(this.colorOvertime.evaluate(0, 1));
        }
    }

    public removeParticle (p: Particle): void {
        const trail = this._particleTrail.get(p);
        if (trail && this._trailSegments) {
            trail.clear();
            this._trailSegments.free(trail);
            this._particleTrail.delete(p);
        }
    }

    public updateRenderData (): void {
        this.vbOffset = 0;
        this.ibOffset = 0;
        for (const p of this._particleTrail.keys()) {
            const trailSeg = this._particleTrail.get(p)!;
            if (trailSeg.start === -1) {
                continue;
            }
            const indexOffset = this.vbOffset * 4 / this._vertSize;
            const end = trailSeg.start >= trailSeg.end ? trailSeg.end + trailSeg.trailElements.length : trailSeg.end;
            const trailNum = end - trailSeg.start;
            // const lastSegRatio = vec3.distance(trailSeg.getTailElement()!.position, p.position) / this._minParticleDistance;
            const textCoordSeg = 1 / (trailNum /* - 1 + lastSegRatio */);
            const startSegEle = trailSeg.trailElements[trailSeg.start];
            this._fillVertexBuffer(startSegEle, this.colorOverTrail.evaluate(1, 1), indexOffset, 1, 0, NEXT_TRIANGLE_INDEX);
            for (let i = trailSeg.start + 1; i < end; i++) {
                const segEle = trailSeg.trailElements[i % trailSeg.trailElements.length];
                const j = i - trailSeg.start;
                this._fillVertexBuffer(
                    segEle,
                    this.colorOverTrail.evaluate(1 - j / trailNum, 1),
                    indexOffset,
                    1 - j * textCoordSeg,
                    j,
                    PRE_TRIANGLE_INDEX | NEXT_TRIANGLE_INDEX,
                );
            }
            if (this._needTransform) {
                Vec3.transformMat4(_temp_trailEle.position, p.position, this._psTransform);
            } else {
                Vec3.copy(_temp_trailEle.position, p.position);
            }

            // refresh particle node position to update emit position
            const trailModel = this._trailModel;
            if (trailModel) {
                trailModel.node.invalidateChildren(TransformBit.POSITION);
            }

            if (trailNum === 1 || trailNum === 2) {
                const lastSecondTrail = trailSeg.getElement(trailSeg.end - 1)!;
                Vec3.subtract(lastSecondTrail.velocity, _temp_trailEle.position, lastSecondTrail.position);
                this._vbF32![this.vbOffset - this._vertSize / 4 - 4] = lastSecondTrail.velocity.x;
                this._vbF32![this.vbOffset - this._vertSize / 4 - 3] = lastSecondTrail.velocity.y;
                this._vbF32![this.vbOffset - this._vertSize / 4 - 2] = lastSecondTrail.velocity.z;
                this._vbF32![this.vbOffset - 4] = lastSecondTrail.velocity.x;
                this._vbF32![this.vbOffset - 3] = lastSecondTrail.velocity.y;
                this._vbF32![this.vbOffset - 2] = lastSecondTrail.velocity.z;
                Vec3.subtract(_temp_trailEle.velocity, _temp_trailEle.position, lastSecondTrail.position);
                this._checkDirectionReverse(_temp_trailEle, lastSecondTrail);
            } else if (trailNum > 2) {
                const lastSecondTrail = trailSeg.getElement(trailSeg.end - 1)!;
                const lastThirdTrail = trailSeg.getElement(trailSeg.end - 2)!;
                Vec3.subtract(_temp_vec3, lastThirdTrail.position, lastSecondTrail.position);
                Vec3.subtract(_temp_vec3_1, _temp_trailEle.position, lastSecondTrail.position);
                Vec3.normalize(_temp_vec3, _temp_vec3);
                Vec3.normalize(_temp_vec3_1, _temp_vec3_1);
                Vec3.subtract(lastSecondTrail.velocity, _temp_vec3_1, _temp_vec3);
                Vec3.normalize(lastSecondTrail.velocity, lastSecondTrail.velocity);
                this._checkDirectionReverse(lastSecondTrail, lastThirdTrail);
                // refresh last trail segment data
                this.vbOffset -= this._vertSize / 4 * 2;
                this.ibOffset -= 6;
                // _bcIdx = (_bcIdx - 6 + 9) % 9;  // <wireframe debug>
                this._fillVertexBuffer(
                    lastSecondTrail,
                    this.colorOverTrail.evaluate(textCoordSeg, 1),
                    indexOffset,
                    textCoordSeg,
                    trailNum - 1,
                    PRE_TRIANGLE_INDEX | NEXT_TRIANGLE_INDEX,
                );
                Vec3.subtract(_temp_trailEle.velocity, _temp_trailEle.position, lastSecondTrail.position);
                Vec3.normalize(_temp_trailEle.velocity, _temp_trailEle.velocity);
                this._checkDirectionReverse(_temp_trailEle, lastSecondTrail);
            }
            if (this.widthFromParticle) {
                _temp_trailEle.width = p.size.x * this.widthRatio.evaluate(0, 1)!;
            } else {
                _temp_trailEle.width = this.widthRatio.evaluate(0, 1)!;
            }
            _temp_trailEle.color = p.color;

            if (Vec3.equals(_temp_trailEle.velocity, Vec3.ZERO)) {
                this.ibOffset -= 3;
            } else {
                this._fillVertexBuffer(_temp_trailEle, this.colorOverTrail.evaluate(0, 1), indexOffset, 0, trailNum, PRE_TRIANGLE_INDEX);
            }
        }
        if (this._trailModel) {
            this._trailModel.enabled = this.ibOffset > 0;
        }
    }

    public updateIA (count: number): void {
        const subModels = this._trailModel && this._trailModel.subModels;
        if (subModels && subModels.length > 0) {
            const subModel = subModels[0];
            subModel.inputAssembler.vertexBuffers[0].update(this._vbF32!);
            subModel.inputAssembler.indexBuffer!.update(this._iBuffer!);
            subModel.inputAssembler.firstIndex = 0;
            subModel.inputAssembler.indexCount = count;
            subModel.inputAssembler.vertexCount = this._iaVertCount;
        }
    }

    public beforeRender (): void {
        this.updateIA(this.ibOffset);
    }

    private _createModel (): void {
        if (this._trailModel) {
            return;
        }

        this._trailModel = (cclegacy.director.root as Root).createModel(scene.Model);
    }

    private rebuild (): void {
        const device: Device = director.root!.device;
        const vertexBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            this._vertSize * (this._trailNum + 1) * 2,
            this._vertSize,
        ));
        const vBuffer: ArrayBuffer = new ArrayBuffer(this._vertSize * (this._trailNum + 1) * 2);
        this._vbF32 = new Float32Array(vBuffer);
        this._vbUint32 = new Uint32Array(vBuffer);
        vertexBuffer.update(vBuffer);

        const indexBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            Math.max(1, this._trailNum) * 6 * Uint16Array.BYTES_PER_ELEMENT,
            Uint16Array.BYTES_PER_ELEMENT,
        ));
        this._iBuffer = new Uint16Array(Math.max(1, this._trailNum) * 6);
        indexBuffer.update(this._iBuffer);

        this._iaVertCount = (this._trailNum + 1) * 2;
        this._iaIndexCount = this._trailNum * 6;

        this._subMeshData = new RenderingSubMesh([vertexBuffer], this._vertAttrs, PrimitiveMode.TRIANGLE_LIST, indexBuffer);

        const trailModel = this._trailModel;
        if (trailModel && this._material) {
            trailModel.node = trailModel.transform = this._particleSystem!.node;
            trailModel.visFlags = this._particleSystem!.visibility;
            trailModel.initSubModel(0, this._subMeshData, this._material);
            trailModel.enabled = true;
        }
    }

    private _updateTrailElement (module: TrailModule, trailEle: ITrailElement, p: Particle, dt: number): boolean {
        trailEle.lifetime += dt;
        if (module.colorFromParticle) {
            trailEle.color.set(p.color);
            trailEle.color.multiply(module.colorOvertime.evaluate(1.0 - p.remainingLifetime / p.startLifetime, 1));
        } else {
            trailEle.color.set(module.colorOvertime.evaluate(1.0 - p.remainingLifetime / p.startLifetime, 1));
        }
        if (module.widthFromParticle) {
            trailEle.width = p.size.x * module.widthRatio.evaluate(trailEle.lifetime / module._trailLifetime, 1)!;
        } else {
            trailEle.width = module.widthRatio.evaluate(trailEle.lifetime / module._trailLifetime, 1)!;
        }
        return trailEle.lifetime > module._trailLifetime;
    }

    private _fillVertexBuffer (
        trailSeg: ITrailElement,
        colorModifer: Color,
        indexOffset: number,
        xTexCoord: number,
        trailEleIdx: number,
        indexSet: number,
    ): void {
        this._vbF32![this.vbOffset++] = trailSeg.position.x;
        this._vbF32![this.vbOffset++] = trailSeg.position.y;
        this._vbF32![this.vbOffset++] = trailSeg.position.z;
        this._vbF32![this.vbOffset++] = trailSeg.direction;
        this._vbF32![this.vbOffset++] = trailSeg.width;
        this._vbF32![this.vbOffset++] = xTexCoord;
        this._vbF32![this.vbOffset++] = 0;
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];  // <wireframe debug>
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];
        // _bcIdx %= 9;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.x;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.y;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.z;
        _temp_color.set(trailSeg.color);
        _temp_color.multiply(colorModifer);
        this._vbUint32![this.vbOffset++] = Color.toUint32(_temp_color);
        this._vbF32![this.vbOffset++] = trailSeg.position.x;
        this._vbF32![this.vbOffset++] = trailSeg.position.y;
        this._vbF32![this.vbOffset++] = trailSeg.position.z;
        this._vbF32![this.vbOffset++] = 1 - trailSeg.direction;
        this._vbF32![this.vbOffset++] = trailSeg.width;
        this._vbF32![this.vbOffset++] = xTexCoord;
        this._vbF32![this.vbOffset++] = 1;
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];  // <wireframe debug>
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];
        // this._vbF32![this.vbOffset++] = barycentric[_bcIdx++];
        // _bcIdx %= 9;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.x;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.y;
        this._vbF32![this.vbOffset++] = trailSeg.velocity.z;
        this._vbUint32![this.vbOffset++] = Color.toUint32(_temp_color);
        if (indexSet & PRE_TRIANGLE_INDEX) {
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx;
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx - 1;
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx + 1;
        }
        if (indexSet & NEXT_TRIANGLE_INDEX) {
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx;
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx + 1;
            this._iBuffer![this.ibOffset++] = indexOffset + 2 * trailEleIdx + 2;
        }
    }

    private _checkDirectionReverse (currElement: ITrailElement, prevElement: ITrailElement): void {
        if (Vec3.dot(currElement.velocity, prevElement.velocity) < DIRECTION_THRESHOLD) {
            currElement.direction = 1 - prevElement.direction;
        } else {
            currElement.direction = prevElement.direction;
        }
    }

    private destroySubMeshData (): void {
        if (this._subMeshData) {
            this._subMeshData.destroy();
            this._subMeshData = null;
        }
    }

    // <debug use>
    // private _printVB() {
    //     let log = new String();
    //     for (let i = 0; i < this.vbOffset; i++) {
    //         log += 'pos:' + this._vbF32![i++].toFixed(2) + ',' + this._vbF32![i++].toFixed(2) + ',' +
    //                this._vbF32![i++].toFixed(2) + ' dir:' + this._vbF32![i++].toFixed(0) + ' ';
    //         i += 6;
    //         log += 'vel:' + this._vbF32![i++].toFixed(2) + ',' + this._vbF32![i++].toFixed(2) + ',' + this._vbF32![i++].toFixed(2) + '\n';
    //     }
    //     if (log.length > 0) {
    //         console.log(log);
    //     }
    // }
}
