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

import { IParticleModule, Particle, PARTICLE_MODULE_ORDER } from './particle';
import { Node } from '../scene-graph/node';
import { TransformBit } from '../scene-graph/node-enum';
import { ParticleRenderMode, ParticleSpace } from './enum';
import { approx, EPSILON, Mat4, pseudoRandom, Quat, randomRangeInt, Vec3, Vec4, geometry, bits } from '../core';
import { isCurveTwoValues, particleEmitZAxis } from './particle-general-function';
import { ParticleSystemRendererBase } from './renderer/particle-system-renderer-base';
import { Mesh } from '../3d';
import type { ParticleSystem } from './particle-system';
import { Mode } from './animator/curve-range';

const _nodeMat = new Mat4();
const _nodeParentInv = new Mat4();
const _nodeRol = new Quat();
const _nodeScale = new Vec3();

const _animModule = [
    '_colorOverLifetimeModule',
    '_sizeOvertimeModule',
    '_velocityOvertimeModule',
    '_forceOvertimeModule',
    '_limitVelocityOvertimeModule',
    '_rotationOvertimeModule',
    '_textureAnimationModule',
];

export class ParticleCuller {
    private _particleSystem: ParticleSystem;
    private _processor: ParticleSystemRendererBase;
    private _node: Node;
    private _particlesAll: Particle[];
    private _updateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _animateList: Map<string, IParticleModule> = new Map<string, IParticleModule>();
    private _runAnimateList: IParticleModule[] = [];
    private _localMat: Mat4 = new Mat4();
    private _gravity: Vec4 = new Vec4();

    public minPos: Vec3 = new Vec3();
    public maxPos: Vec3 = new Vec3();

    private _nodePos: Vec3 = new Vec3();
    private _nodeSize: Vec3 = new Vec3();

    constructor (ps: ParticleSystem) {
        this._particleSystem = ps;
        this._processor = this._particleSystem.processor;
        this._node = ps.node;
        this._particlesAll = [];
        this._initModuleList();
    }

    private _updateBoundingNode (): void {
        this._nodeSize.set(this.maxPos.x - this.minPos.x, this.maxPos.y - this.minPos.y, this.maxPos.z - this.minPos.z);
        this._nodePos.set(this.minPos.x + this._nodeSize.x * 0.5, this.minPos.y + this._nodeSize.y * 0.5, this.minPos.z + this._nodeSize.z * 0.5);
    }

    public setBoundingBoxSize (halfExt: Vec3): void {
        this.maxPos.x = this._nodePos.x + halfExt.x;
        this.maxPos.y = this._nodePos.y + halfExt.y;
        this.maxPos.z = this._nodePos.z + halfExt.z;
        this.minPos.x = this._nodePos.x - halfExt.x;
        this.minPos.y = this._nodePos.y - halfExt.y;
        this.minPos.z = this._nodePos.z - halfExt.z;
        this._updateBoundingNode();
    }

    public setBoundingBoxCenter (px: number, py: number, pz: number): void {
        this.maxPos.x = px + this._nodeSize.x * 0.5;
        this.maxPos.y = py + this._nodeSize.y * 0.5;
        this.maxPos.z = pz + this._nodeSize.z * 0.5;
        this.minPos.x = px - this._nodeSize.x * 0.5;
        this.minPos.y = py - this._nodeSize.y * 0.5;
        this.minPos.z = pz - this._nodeSize.z * 0.5;
        this._updateBoundingNode();
    }

    private _initModuleList (): void {
        _animModule.forEach((val: string): void => {
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

    private _emit (count: number, dt: number, particleLst: Particle[]): void {
        const ps = this._particleSystem;
        const node = this._node;
        const loopDelta = (ps.time % ps.duration) / ps.duration; // loop delta value

        node.invalidateChildren(TransformBit.POSITION);
        if (ps.simulationSpace === ParticleSpace.World) {
            node.getWorldMatrix(_nodeMat);
            node.getWorldRotation(_nodeRol);
        }

        for (let i = 0; i < count; ++i) {
            const particle: Particle = new Particle(ps);
            particle.particleSystem = ps;
            particle.reset();

            const rand = pseudoRandom(randomRangeInt(0, bits.INT_MAX));

            if (ps._shapeModule && ps._shapeModule.enable) {
                ps._shapeModule.emit(particle);
            } else {
                Vec3.set(particle.position, 0, 0, 0);
                Vec3.copy(particle.velocity, particleEmitZAxis);
            }

            if (ps._textureAnimationModule && ps._textureAnimationModule.enable) {
                ps._textureAnimationModule.init(particle);
            }

            const curveStartSpeed = ps.startSpeed.evaluate(loopDelta, rand)!;
            Vec3.multiplyScalar(particle.velocity, particle.velocity, curveStartSpeed);

            if (ps.simulationSpace === ParticleSpace.World) {
                Vec3.transformMat4(particle.position, particle.position, _nodeMat);
                Vec3.transformQuat(particle.velocity, particle.velocity, _nodeRol);
            }

            Vec3.copy(particle.ultimateVelocity, particle.velocity);

            // apply startRotation.
            Vec3.set(particle.rotation, 0, 0, 0);

            // apply startSize.
            if (ps.startSize3D) {
                Vec3.set(
                    particle.startSize,
                    ps.startSizeX.evaluate(loopDelta, rand)!,
                    ps.startSizeY.evaluate(loopDelta, rand)!,
                    ps.startSizeZ.evaluate(loopDelta, rand)!,
                );
            } else {
                Vec3.set(particle.startSize, ps.startSizeX.evaluate(loopDelta, rand)!, 1, 1);
                particle.startSize.y = particle.startSize.x;
            }
            Vec3.copy(particle.size, particle.startSize);

            // apply startLifetime.
            particle.startLifetime = ps.startLifetime.evaluate(loopDelta, rand)! + dt;
            particle.remainingLifetime = particle.startLifetime;

            particleLst.push(particle);
        }
    }

    private _updateParticles (dt: number, particleLst: Particle[]): void {
        const ps = this._particleSystem;
        ps.node.getWorldMatrix(_nodeMat);

        switch (ps.scaleSpace) {
        case ParticleSpace.Local:
            ps.node.getScale(_nodeScale);
            break;
        case ParticleSpace.World:
            ps.node.getWorldScale(_nodeScale);
            break;
        default:
            break;
        }

        this._updateList.forEach((value: IParticleModule, key: string): void => {
            // TODO(cjh): Bug here? _updateList is a Map, the old code uses `this._updateList['some_key'] = some_value;`
            // to do the assignment which forEach will not take care of it.
            // In order not to change the behavior in this PR ( https://github.com/cocos/cocos-engine/pull/17289 )
            // We commented the update the particle module temporarily.
            // value.update(ps.simulationSpace, _node_mat);
        });

        if (ps.simulationSpace === ParticleSpace.Local) {
            const r: Quat = ps.node.getRotation();
            Mat4.fromQuat(this._localMat, r);
            this._localMat.transpose(); // just consider rotation, use transpose as invert
        }

        if (ps.node.parent) {
            ps.node.parent.getWorldMatrix(_nodeParentInv);
            _nodeParentInv.invert();
        }

        for (let i = 0; i < particleLst.length; ++i) {
            const p: Particle = particleLst[i];
            p.remainingLifetime -= dt;
            Vec3.set(p.animatedVelocity, 0, 0, 0);

            // apply gravity when both the mode is not Constant and the value is not 0.
            const useGravity = (ps.gravityModifier.mode !== Mode.Constant || ps.gravityModifier.constant !== 0);
            if (useGravity) {
                const rand = isCurveTwoValues(ps.gravityModifier) ? pseudoRandom(p.randomSeed) : 0;
                if (ps.simulationSpace === ParticleSpace.Local) {
                    const gravityFactor = -ps.gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, rand)! * 9.8 * dt;
                    this._gravity.x = 0.0;
                    this._gravity.y = gravityFactor;
                    this._gravity.z = 0.0;
                    this._gravity.w = 1.0;
                    if (!approx(gravityFactor, 0.0, EPSILON)) {
                        if (ps.node.parent) {
                            this._gravity = this._gravity.transformMat4(_nodeParentInv);
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

            this._runAnimateList.forEach((value: IParticleModule): void => {
                value.animate(p, dt);
            });

            Vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
        }
    }

    private _calculateBounding (isInit: boolean): void {
        const size: Vec3 = new Vec3();
        const position: Vec3 = new Vec3();
        const subPos: Vec3 = new Vec3();
        const addPos: Vec3 = new Vec3();

        const meshSize: Vec3 = new Vec3(1.0, 1.0, 1.0);
        if (this._processor.getInfo()!.renderMode === ParticleRenderMode.Mesh) {
            const mesh: Mesh | null = this._processor.getInfo().mesh;
            if (mesh && mesh.struct.minPosition && mesh.struct.maxPosition) {
                const meshAABB: geometry.AABB = new geometry.AABB();
                geometry.AABB.fromPoints(meshAABB, mesh.struct.minPosition, mesh.struct.maxPosition);
                const meshMax = Math.max(meshAABB.halfExtents.x, meshAABB.halfExtents.y, meshAABB.halfExtents.z);
                meshSize.set(meshMax, meshMax, meshMax);
            }
        }

        const worldMat = this._particleSystem.node.worldMatrix;
        for (let i = 0; i < this._particlesAll.length; ++i) {
            const p: Particle = this._particlesAll[i];
            Vec3.multiply(size, _nodeScale, p.size);
            Vec3.multiply(size, size, meshSize);
            position.set(p.position);
            if (this._particleSystem.simulationSpace !== ParticleSpace.World) {
                Vec3.transformMat4(position, position, worldMat);
            }
            if (isInit && i === 0) {
                Vec3.subtract(this.minPos, position, size);
                Vec3.add(this.maxPos, position, size);
            } else {
                Vec3.subtract(subPos, position, size);
                Vec3.add(addPos, position, size);
                Vec3.min(this.minPos, this.minPos, subPos);
                Vec3.max(this.maxPos, this.maxPos, addPos);
            }
        }
    }

    public calculatePositions (): void {
        this._emit(this._particleSystem.capacity, 0, this._particlesAll);
        const rand = isCurveTwoValues(this._particleSystem.startLifetime) ? pseudoRandom(randomRangeInt(0, bits.INT_MAX)) : 0;
        this._updateParticles(0, this._particlesAll);
        this._calculateBounding(true);
        this._updateParticles(this._particleSystem.startLifetime.evaluate(0, rand), this._particlesAll);
        this._calculateBounding(false);
        this._updateBoundingNode();
    }

    public clear (): void {
        this._particlesAll.length = 0;
    }

    public destroy (): void {

    }
}
