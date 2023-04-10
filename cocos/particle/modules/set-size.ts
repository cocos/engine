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

import { DEBUG } from 'internal:constants';
import { ccclass, displayOrder, formerlySerializedAs, radian, range, serializable, tooltip, type, visible } from '../../core/data/decorators';
import { ParticleModule, ModuleExecStage } from '../particle-module';
import { BuiltinParticleParameter, BuiltinParticleParameterFlags, BuiltinParticleParameterName as ParameterName, ParticleDataSet } from '../particle-data-set';
import { ParticleExecContext, ParticleEmitterParams, ParticleEmitterState } from '../particle-base';
import { CurveRange } from '../curve-range';
import { GradientRange } from '../gradient-range';
import { Color, lerp, Vec3 } from '../../core/math';
import { INT_MAX } from '../../core/math/bits';
import { Space } from '../enum';
import { assert } from '../../core';
import { RandomStream } from '../random-stream';

const seed = new Vec3();

@ccclass('cc.SetSizeModule')
@ParticleModule.register('SetSize', ModuleExecStage.SPAWN | ModuleExecStage.UPDATE, [ParameterName.SIZE], [ParameterName.NORMALIZED_ALIVE_TIME])
export class SetSizeModule extends ParticleModule {
    @serializable
    @tooltip('i18n:particle_system.startSize3D')
    public separateAxes = false;

    @range([0, 1])
    @type(CurveRange)
    @tooltip('i18n:particle_system.startSizeX')
    @visible(function (this: SetSizeModule): boolean { return !this.separateAxes; })
    public get size () {
        return this.x;
    }

    public set size (val) {
        this.x = val;
    }

    /**
      * @zh 粒子初始大小。
      */
    @range([0, 1])
    @type(CurveRange)
    @tooltip('i18n:particle_system.startSizeX')
    @visible(function (this: SetSizeModule): boolean { return this.separateAxes; })
    public x = new CurveRange(1);

    /**
      * @zh 粒子初始大小。
      */
    @type(CurveRange)
    @range([0, 1])
    @tooltip('i18n:particle_system.startSizeY')
    @visible(function (this: SetSizeModule): boolean { return this.separateAxes; })
    public get y () {
        if (!this._y) {
            this._y = new CurveRange(1);
        }
        return this._y;
    }

    public set y (val) {
        this._y = val;
    }

    /**
      * @zh 粒子初始大小。
      */
    @type(CurveRange)
    @range([0, 1])
    @tooltip('i18n:particle_system.startSizeZ')
    @visible(function (this: SetSizeModule): boolean { return this.separateAxes; })
    public get z () {
        if (!this._z) {
            this._z = new CurveRange(1);
        }
        return this._z;
    }

    public set z (val) {
        this._z = val;
    }

    @serializable
    private _y: CurveRange | null = null;
    @serializable
    private _z: CurveRange | null = null;
    private _randomOffset = 0;

    public onPlay (params: ParticleEmitterParams, state: ParticleEmitterState) {
        this._randomOffset = state.rand.getUInt32();
    }

    public tick (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        if (context.executionStage === ModuleExecStage.SPAWN) {
            context.markRequiredBuiltinParameters(BuiltinParticleParameterFlags.BASE_SIZE);
        }

        context.markRequiredBuiltinParameters(BuiltinParticleParameterFlags.SIZE);
        if (this.separateAxes && DEBUG) {
            assert(this.x.mode === this.y.mode && this.x.mode === this.z.mode,
                'SetSizeModule: x, y and z must have the same mode.');
        }
        if (this.x.mode === CurveRange.Mode.Curve || this.x.mode === CurveRange.Mode.TwoCurves) {
            if (context.executionStage === ModuleExecStage.SPAWN) {
                context.markRequiredBuiltinParameters(BuiltinParticleParameterFlags.SPAWN_NORMALIZED_TIME);
            } else {
                context.markRequiredBuiltinParameters(BuiltinParticleParameterFlags.NORMALIZED_ALIVE_TIME);
            }
        }
        if (this.x.mode === CurveRange.Mode.TwoConstants || this.x.mode === CurveRange.Mode.TwoCurves) {
            context.markRequiredBuiltinParameters(BuiltinParticleParameterFlags.RANDOM_SEED);
        }
    }

    public execute (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        const size = context.executionStage === ModuleExecStage.SPAWN ? particles.baseSize : particles.size;
        const { fromIndex, toIndex } = context;
        const randomOffset = this._randomOffset;
        if (this.separateAxes) {
            if (this.x.mode === CurveRange.Mode.Constant) {
                const constantX = this.x.constant;
                const constantY = this.y.constant;
                const constantZ = this.z.constant;
                for (let i = fromIndex; i < toIndex; ++i) {
                    size.set3fAt(constantX, constantY, constantZ, i);
                }
            } else if (this.x.mode === CurveRange.Mode.TwoConstants) {
                const { constantMin: xMin, constantMax: xMax } = this.x;
                const { constantMin: yMin, constantMax: yMax } = this.y;
                const { constantMin: zMin, constantMax: zMax } = this.z;
                const randomSeed = particles.randomSeed.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const ratio = RandomStream.get3Float(randomSeed[i] + randomOffset, seed);
                    const x = lerp(xMin, xMax, ratio.x);
                    const y = lerp(yMin, yMax, ratio.y);
                    const z = lerp(zMin, zMax, ratio.z);
                    size.set3fAt(x, y, z, i);
                }
            } else if (this.x.mode === CurveRange.Mode.Curve) {
                const { spline: xCurve, multiplier: xMultiplier } = this.x;
                const { spline: yCurve, multiplier: yMultiplier } = this.y;
                const { spline: zCurve, multiplier: zMultiplier } = this.z;
                const normalizedTime = context.executionStage === ModuleExecStage.SPAWN ? particles.spawnNormalizedTime.data : particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const time = normalizedTime[i];
                    const x = xCurve.evaluate(time) * xMultiplier;
                    const y = yCurve.evaluate(time) * yMultiplier;
                    const z = zCurve.evaluate(time) * zMultiplier;
                    size.set3fAt(x, y, z, i);
                }
            } else {
                const { splineMin: xMin, splineMax: xMax, multiplier: xMultiplier } = this.x;
                const { splineMin: yMin, splineMax: yMax, multiplier: yMultiplier } = this.y;
                const { splineMin: zMin, splineMax: zMax, multiplier: zMultiplier } = this.z;
                const randomSeed = particles.randomSeed.data;
                const normalizedTime = context.executionStage === ModuleExecStage.SPAWN ? particles.spawnNormalizedTime.data : particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const time = normalizedTime[i];
                    const ratio = RandomStream.get3Float(randomSeed[i] + randomOffset, seed);
                    const x = lerp(xMin.evaluate(time), xMax.evaluate(time), ratio.x) * xMultiplier;
                    const y = lerp(yMin.evaluate(time), yMax.evaluate(time), ratio.y) * yMultiplier;
                    const z = lerp(zMin.evaluate(time), zMax.evaluate(time), ratio.z) * zMultiplier;
                    size.set3fAt(x, y, z, i);
                }
            }
        } else {
            // eslint-disable-next-line no-lonely-if
            if (this.x.mode === CurveRange.Mode.Constant) {
                const constantX = this.x.constant;
                size.fill1f(constantX, fromIndex, toIndex);
            } else if (this.x.mode === CurveRange.Mode.TwoConstants) {
                const { constantMin: xMin, constantMax: xMax } = this.x;
                const randomSeed = particles.randomSeed.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const pSize = lerp(xMin, xMax, RandomStream.getFloat(randomSeed[i] + randomOffset));
                    size.set1fAt(pSize, i);
                }
            } else if (this.x.mode === CurveRange.Mode.Curve) {
                const { spline: xCurve, multiplier: xMultiplier } = this.x;
                const normalizedTime = context.executionStage === ModuleExecStage.SPAWN ? particles.spawnNormalizedTime.data : particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const pSize = xCurve.evaluate(normalizedTime[i]) * xMultiplier;
                    size.set1fAt(pSize, i);
                }
            } else {
                const { splineMin: xMin, splineMax: xMax, multiplier: xMultiplier } = this.x;
                const randomSeed = particles.randomSeed.data;
                const normalizedTime = context.executionStage === ModuleExecStage.SPAWN ? particles.spawnNormalizedTime.data : particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; ++i) {
                    const time = normalizedTime[i];
                    const pSize = lerp(xMin.evaluate(time), xMax.evaluate(time), RandomStream.getFloat(randomSeed[i] + randomOffset)) * xMultiplier;
                    size.set1fAt(pSize, i);
                }
            }
        }
    }

    protected needsFilterSerialization () {
        return true;
    }

    protected getSerializedProps () {
        if (!this.separateAxes) {
            return ['separateAxes', 'x'];
        } else {
            return ['separateAxes', 'x', '_y', '_z'];
        }
    }
}
