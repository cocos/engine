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

import { ccclass, tooltip, displayOrder, type, serializable, range, visible } from 'cc.decorator';
import { lerp, Vec3 } from '../../core';
import { VFXModule, ModuleExecStage, ModuleExecStageFlags } from '../vfx-module';
import { FloatExpression } from '../expressions/float';
import { BASE_SCALE, NORMALIZED_AGE, ParticleDataSet, RANDOM_SEED, SCALE, SPAWN_NORMALIZED_TIME } from '../particle-data-set';
import { ModuleExecContext } from '../base';
import { RandomStream } from '../random-stream';
import { EmitterDataSet } from '../emitter-data-set';
import { UserDataSet } from '../user-data-set';
import { ConstantFloatExpression, ConstantVec3Expression, Vec3Expression } from '../expressions';

const seed = new Vec3();

@ccclass('cc.ScaleMeshSizeModule')
@VFXModule.register('ScaleMeshSize', ModuleExecStageFlags.UPDATE | ModuleExecStageFlags.SPAWN, [SCALE.name], [NORMALIZED_AGE.name])
export class ScaleMeshSizeModule extends VFXModule {
    /**
      * @zh 决定是否在每个轴上独立控制粒子大小。
      */
    @serializable
    @displayOrder(1)
    @tooltip('i18n:sizeOvertimeModule.separateAxes')
    public separateAxes = false;

    /**
      * @zh 定义一条曲线来决定粒子在其生命周期中的大小变化。
      */
    @type(FloatExpression)
    @tooltip('i18n:sizeOvertimeModule.scale')
    @visible(function (this: ScaleMeshSizeModule): boolean { return !this.separateAxes; })
    public get uniformScalar () {
        if (!this._uniformScalar) {
            this._uniformScalar = new ConstantFloatExpression(1);
        }
        return this._uniformScalar;
    }

    public set uniformScalar (val) {
        this._uniformScalar = val;
    }

    @type(Vec3Expression)
    @tooltip('i18n:sizeOvertimeModule.scale')
    @visible(function (this: ScaleMeshSizeModule): boolean { return this.separateAxes; })
    public get scalar () {
        if (!this._scalar) {
            this._scalar = new ConstantVec3Expression(Vec3.ONE);
        }
        return this._scalar;
    }

    public set scalar (val) {
        this._scalar = val;
    }

    @serializable
    private _uniformScalar: FloatExpression | null = null;
    @serializable
    private _scalar: Vec3Expression | null = null;

    public tick (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        particles.markRequiredParameter(SCALE);
        if (context.executionStage === ModuleExecStage.SPAWN) {
            particles.markRequiredParameter(BASE_SCALE);
        }
        if (this.separateAxes) {
            this.scalar.tick(particles, emitter, user, context);
        } else {
            this.uniformScalar.tick(particles, emitter, user, context);
        }
    }

    public execute (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        const scale = context.executionStage === ModuleExecStage.SPAWN ? particles.getVec3Parameter(BASE_SCALE) : particles.getVec3Parameter(SCALE);
        const randomOffset = this._randomOffset;
        const { fromIndex, toIndex } = context;
        if (!this.separateAxes) {
            if (this.scalar.mode === FloatExpression.Mode.CONSTANT) {
                const constant = this.scalar.constant;
                for (let i = fromIndex; i < toIndex; i++) {
                    scale.multiply1fAt(constant, i);
                }
            } else if (this.scalar.mode === FloatExpression.Mode.CURVE) {
                const { spline, multiplier } = this.scalar;
                const normalizedTime = context.executionStage === ModuleExecStage.UPDATE ? particles.getFloatParameter(NORMALIZED_AGE).data : particles.getFloatParameter(SPAWN_NORMALIZED_TIME).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    scale.multiply1fAt(spline.evaluate(normalizedTime[i]) * multiplier, i);
                }
            } else if (this.scalar.mode === FloatExpression.Mode.TWO_CONSTANTS) {
                const { constantMin, constantMax } = this.scalar;
                const randomSeed = particles.getUint32Parameter(RANDOM_SEED).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    scale.multiply1fAt(lerp(constantMin, constantMax, RandomStream.getFloat(randomSeed[i] + randomOffset)), i);
                }
            } else {
                const { splineMin, splineMax, multiplier } = this.scalar;
                const normalizedTime = context.executionStage === ModuleExecStage.UPDATE ? particles.getFloatParameter(NORMALIZED_AGE).data : particles.getFloatParameter(SPAWN_NORMALIZED_TIME).data;
                const randomSeed = particles.getUint32Parameter(RANDOM_SEED).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const currentLife = normalizedTime[i];
                    scale.multiply1fAt(lerp(splineMin.evaluate(currentLife),
                        splineMax.evaluate(currentLife),
                        RandomStream.getFloat(randomSeed[i] + randomOffset)) * multiplier, i);
                }
            }
        } else {
            // eslint-disable-next-line no-lonely-if
            if (this.scalar.mode === FloatExpression.Mode.CONSTANT) {
                const { constant: constantX } = this.x;
                const { constant: constantY } = this.y;
                const { constant: constantZ } = this.z;
                for (let i = fromIndex; i < toIndex; i++) {
                    scale.multiply3fAt(constantX, constantY, constantZ, i);
                }
            } else if (this.scalar.mode === FloatExpression.Mode.CURVE) {
                const { spline: splineX, multiplier: xMultiplier } = this.x;
                const { spline: splineY, multiplier: yMultiplier } = this.y;
                const { spline: splineZ, multiplier: zMultiplier } = this.z;
                const normalizedTime = context.executionStage === ModuleExecStage.UPDATE ? particles.getFloatParameter(NORMALIZED_AGE).data : particles.getFloatParameter(SPAWN_NORMALIZED_TIME).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const currentLife = normalizedTime[i];
                    scale.multiply3fAt(splineX.evaluate(currentLife) * xMultiplier,
                        splineY.evaluate(currentLife) * yMultiplier,
                        splineZ.evaluate(currentLife) * zMultiplier, i);
                }
            } else if (this.scalar.mode === FloatExpression.Mode.TWO_CONSTANTS) {
                const { constantMin: xMin, constantMax: xMax } = this.x;
                const { constantMin: yMin, constantMax: yMax } = this.y;
                const { constantMin: zMin, constantMax: zMax } = this.z;
                const randomSeed = particles.getUint32Parameter(RANDOM_SEED).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const ratio = RandomStream.get3Float(randomSeed[i] + randomOffset, seed);
                    scale.multiply3fAt(lerp(xMin, xMax, ratio.x),
                        lerp(yMin, yMax, ratio.y),
                        lerp(zMin, zMax, ratio.z), i);
                }
            } else {
                const { splineMin: xMin, splineMax: xMax, multiplier: xMultiplier } = this.x;
                const { splineMin: yMin, splineMax: yMax, multiplier: yMultiplier } = this.y;
                const { splineMin: zMin, splineMax: zMax, multiplier: zMultiplier } = this.z;
                const normalizedTime = context.executionStage === ModuleExecStage.UPDATE ? particles.getFloatParameter(NORMALIZED_AGE).data : particles.getFloatParameter(SPAWN_NORMALIZED_TIME).data;
                const randomSeed = particles.getUint32Parameter(RANDOM_SEED).data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const currentLife = normalizedTime[i];
                    const ratio = RandomStream.get3Float(randomSeed[i] + randomOffset, seed);
                    scale.multiply3fAt(
                        lerp(xMin.evaluate(currentLife), xMax.evaluate(currentLife), ratio.x) * xMultiplier,
                        lerp(yMin.evaluate(currentLife), yMax.evaluate(currentLife), ratio.y) * yMultiplier,
                        lerp(zMin.evaluate(currentLife), zMax.evaluate(currentLife), ratio.z) * zMultiplier, i,
                    );
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
