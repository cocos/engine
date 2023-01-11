/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import { ccclass, displayOrder, formerlySerializedAs, radian, range, serializable, tooltip, type, visible } from '../../core/data/decorators';
import { ParticleModule, ParticleUpdateStage } from '../particle-module';
import { ParticleSOAData } from '../particle-soa-data';
import { ParticleUpdateContext } from '../particle-update-context';
import { CurveRange } from '../curve-range';
import { GradientRange } from '../gradient-range';
import { lerp, pseudoRandom, randomRangeInt, Vec3 } from '../../core/math';
import { INT_MAX } from '../../core/math/bits';
import { particleEmitZAxis } from '../particle-general-function';
import { Space } from '../enum';

@ccclass('cc.InitializationModule')
export class InitializationModule extends ParticleModule {
    /**
     * @zh 粒子初始颜色。
     */
    @type(GradientRange)
    @serializable
    @displayOrder(8)
    @tooltip('i18n:particle_system.startColor')
    public startColor = new GradientRange();

    @serializable
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSize3D')
    public startSize3D = false;

    /**
     * @zh 粒子初始大小。
     */
    @formerlySerializedAs('startSize')
    @range([0, 1])
    @type(CurveRange)
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeX')
    public startSizeX = new CurveRange();

    /**
     * @zh 粒子初始大小。
     */
    @type(CurveRange)
    @serializable
    @range([0, 1])
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeY')
    @visible(function (this: InitializationModule): boolean { return this.startSize3D; })
    public startSizeY = new CurveRange();

    /**
     * @zh 粒子初始大小。
     */
    @type(CurveRange)
    @serializable
    @range([0, 1])
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeZ')
    @visible(function (this: InitializationModule): boolean { return this.startSize3D; })
    public startSizeZ = new CurveRange();

    /**
     * @zh 粒子初始速度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @displayOrder(11)
    @tooltip('i18n:particle_system.startSpeed')
    public startSpeed = new CurveRange();

    @serializable
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotation3D')
    public startRotation3D = false;

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationX')
    @visible(function (this: InitializationModule): boolean { return this.startRotation3D; })
    public startRotationX = new CurveRange();

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationY')
    @visible(function (this: InitializationModule): boolean { return this.startRotation3D; })
    public startRotationY = new CurveRange();

    /**
     * @zh 粒子初始旋转角度。
     */
    @type(CurveRange)
    @formerlySerializedAs('startRotation')
    @range([-1, 1])
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationZ')
    @visible(function (this: InitializationModule): boolean { return this.startRotation3D; })
    public startRotationZ = new CurveRange();

    /**
     * @zh 粒子生命周期。
     */
    @type(CurveRange)
    @serializable
    @range([0, 1])
    @displayOrder(7)
    @tooltip('i18n:particle_system.startLifetime')
    public startLifetime = new CurveRange();

    public get name (): string {
        return 'InitializationModule';
    }

    public get updateStage (): ParticleUpdateStage {
        return ParticleUpdateStage.INITIALIZE;
    }

    constructor () {
        super();
        this.startLifetime.constant = 5;
        this.startSizeX.constant = 1;
        this.startSpeed.constant = 5;
    }

    public update (particles: ParticleSOAData, particleUpdateContext: ParticleUpdateContext) {
        const { newParticleIndexStart, newParticleIndexEnd, normalizedTimeInCycle, worldRotation, simulationSpace } = particleUpdateContext;
        const { randomSeed, invStartLifeTime } = particles;
        const velocity = new Vec3();
        if (simulationSpace === Space.WORLD) {
            switch (this.startSpeed.mode) {
            case CurveRange.Mode.Constant:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const curveStartSpeed = this.startSpeed.constant;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    Vec3.transformQuat(velocity, velocity, worldRotation);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.TwoConstants:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    const curveStartSpeed = lerp(this.startSpeed.constantMin, this.startSpeed.constantMax, rand);
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    Vec3.transformQuat(velocity, velocity, worldRotation);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.Curve:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    const curveStartSpeed = this.startSpeed.spline.evaluate(normalizedTimeInCycle) * this.startSpeed.multiplier;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    Vec3.transformQuat(velocity, velocity, worldRotation);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.TwoCurves:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    const curveStartSpeed = lerp(this.startSpeed.splineMin.evaluate(normalizedTimeInCycle), this.startSpeed.splineMax.evaluate(normalizedTimeInCycle), rand) * this.startSpeed.multiplier;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    Vec3.transformQuat(velocity, velocity, worldRotation);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            default:
            }
        } else {
            switch (this.startSpeed.mode) {
            case CurveRange.Mode.Constant:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const curveStartSpeed = this.startSpeed.constant;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.TwoConstants:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    const curveStartSpeed = lerp(this.startSpeed.constantMin, this.startSpeed.constantMax, rand);
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.Curve:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const curveStartSpeed = this.startSpeed.spline.evaluate(normalizedTimeInCycle) * this.startSpeed.multiplier;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            case CurveRange.Mode.TwoCurves:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    const curveStartSpeed = lerp(this.startSpeed.splineMin.evaluate(normalizedTimeInCycle), this.startSpeed.splineMax.evaluate(normalizedTimeInCycle), rand) * this.startSpeed.multiplier;
                    Vec3.multiplyScalar(velocity, particleEmitZAxis, curveStartSpeed);
                    particles.setVelocityAt(velocity, i);
                }
                break;
            default:
            }
        }
        if (this.startRotation3D) {
            switch (this.startRotationX.mode) {
            case CurveRange.Mode.Constant:
                // eslint-disable-next-line no-case-declarations
                const lifeTime = 1 / this.startLifetime.constant;
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    invStartLifeTime[i] = lifeTime;
                }
                break;
            case CurveRange.Mode.TwoConstants:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    invStartLifeTime[i] = 1 / lerp(this.startLifetime.constantMin, this.startLifetime.constantMax, rand);
                }
                break;
            case CurveRange.Mode.Curve:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    invStartLifeTime[i] = 1 / (this.startLifetime.spline.evaluate(normalizedTimeInCycle) * this.startLifetime.multiplier);
                }
                break;
            case CurveRange.Mode.TwoCurves:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    invStartLifeTime[i] = 1 / (lerp(this.startLifetime.splineMin.evaluate(normalizedTimeInCycle), this.startLifetime.splineMax.evaluate(normalizedTimeInCycle), rand) * this.startLifetime.multiplier);
                }
                break;
            default:
            }
            // eslint-disable-next-line max-len
            particle.startEuler.set(this.startRotationX.evaluate(normalizedTimeInCycle, rand), this.startRotationY.evaluate(normalizedTimeInCycle, rand), this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
        } else {
            switch (this.startRotationX.mode) {
            case CurveRange.Mode.Constant:
                // eslint-disable-next-line no-case-declarations
                const lifeTime = 1 / this.startLifetime.constant;
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    invStartLifeTime[i] = lifeTime;
                }
                break;
            case CurveRange.Mode.TwoConstants:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    invStartLifeTime[i] = 1 / lerp(this.startLifetime.constantMin, this.startLifetime.constantMax, rand);
                }
                break;
            case CurveRange.Mode.Curve:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    invStartLifeTime[i] = 1 / (this.startLifetime.spline.evaluate(normalizedTimeInCycle) * this.startLifetime.multiplier);
                }
                break;
            case CurveRange.Mode.TwoCurves:
                for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                    const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                    invStartLifeTime[i] = 1 / (lerp(this.startLifetime.splineMin.evaluate(normalizedTimeInCycle), this.startLifetime.splineMax.evaluate(normalizedTimeInCycle), rand) * this.startLifetime.multiplier);
                }
                break;
            default:
            }
            particle.startEuler.set(0, 0, this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
        }

        if (this.startRotation3D) {
            // eslint-disable-next-line max-len
            particle.startEuler.set(this.startRotationX.evaluate(normalizedTimeInCycle, rand), this.startRotationY.evaluate(normalizedTimeInCycle, rand), this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
        } else {
            particle.startEuler.set(0, 0, this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
        }

        switch (this.startLifetime.mode) {
        case CurveRange.Mode.Constant:
            // eslint-disable-next-line no-case-declarations
            const lifeTime = 1 / this.startLifetime.constant;
            for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                invStartLifeTime[i] = lifeTime;
            }
            break;
        case CurveRange.Mode.TwoConstants:
            for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                invStartLifeTime[i] = 1 / lerp(this.startLifetime.constantMin, this.startLifetime.constantMax, rand);
            }
            break;
        case CurveRange.Mode.Curve:
            for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                invStartLifeTime[i] = 1 / (this.startLifetime.spline.evaluate(normalizedTimeInCycle) * this.startLifetime.multiplier);
            }
            break;
        case CurveRange.Mode.TwoCurves:
            for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
                const rand = pseudoRandom(randomRangeInt(0, INT_MAX));
                invStartLifeTime[i] = 1 / (lerp(this.startLifetime.splineMin.evaluate(normalizedTimeInCycle), this.startLifetime.splineMax.evaluate(normalizedTimeInCycle), rand) * this.startLifetime.multiplier);
            }
            break;
        default:
        }
        for (let i = newParticleIndexStart; i < newParticleIndexEnd; ++i) {
            randomSeed[i] = randomRangeInt(0, 233280);
        }
        for (let i = newParticleIndexOffset, l = newParticleIndexOffset + newEmittingCount; i < l; ++i) {
            const rand = pseudoRandom(randomRangeInt(0, INT_MAX));

            // apply startRotation.
            if (this.startRotation3D) {
                // eslint-disable-next-line max-len
                particle.startEuler.set(this.startRotationX.evaluate(normalizedTimeInCycle, rand), this.startRotationY.evaluate(normalizedTimeInCycle, rand), this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
            } else {
                particle.startEuler.set(0, 0, this.startRotationZ.evaluate(normalizedTimeInCycle, rand));
            }
            particle.rotation.set(particle.startEuler);

            // apply startSize.
            if (this.startSize3D) {
                Vec3.set(particle.startSize, this.startSizeX.evaluate(normalizedTimeInCycle, rand)!,
                    this.startSizeY.evaluate(normalizedTimeInCycle, rand)!,
                    this.startSizeZ.evaluate(normalizedTimeInCycle, rand)!);
            } else {
                Vec3.set(particle.startSize, this.startSizeX.evaluate(normalizedTimeInCycle, rand)!, 1, 1);
                particle.startSize.y = particle.startSize.x;
            }
            Vec3.copy(particle.size, particle.startSize);

            // apply startColor.
            particle.startColor.set(this.startColor.evaluate(normalizedTimeInCycle, rand));
            particle.color.set(particle.startColor);
        } // end of particles forLoop.
    }
}
