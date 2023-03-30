/* eslint-disable max-len */
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

import { ccclass, tooltip, displayOrder, range, type, radian, serializable, visible, displayName } from 'cc.decorator';
import { DEBUG } from 'internal:constants';
import { Mat4, Quat, Vec4, Vec3, lerp } from '../../core/math';
import { ParticleModule, ModuleExecStage } from '../particle-module';
import { CurveRange } from '../curve-range';
import { assert, CCBoolean } from '../../core';
import { ParticleEmitterParams, ParticleExecContext } from '../particle-base';
import { BuiltinParticleParameter, BuiltinParticleParameterName, ParticleDataSet } from '../particle-data-set';
import { RandNumGen } from '../rand-num-gen';

const ROTATION_OVERTIME_RAND_OFFSET = 125292;
const seed = new Vec3();

@ccclass('cc.RotationModule')
@ParticleModule.register('Rotation', ModuleExecStage.UPDATE, [BuiltinParticleParameterName.ANGULAR_VELOCITY], [])
export class RotationModule extends ParticleModule {
    /**
     * @zh 是否三个轴分开设定旋转。
     */
    @type(CCBoolean)
    @displayOrder(1)
    @tooltip('i18n:rotationOvertimeModule.separateAxes')
    get separateAxes () {
        return this._separateAxes;
    }

    set separateAxes (val) {
        this._separateAxes = val;
    }

    /**
     * @zh 绕 X 轴设定旋转。
     */
    @type(CurveRange)
    @range([-1, 1])
    @radian
    @displayOrder(2)
    @tooltip('i18n:rotationOvertimeModule.x')
    @visible(function (this: RotationModule): boolean { return this.separateAxes; })
    public get x () {
        if (!this._x) {
            this._x = new CurveRange();
        }
        return this._x;
    }

    public set x (val) {
        this._x = val;
    }

    /**
     * @zh 绕 Y 轴设定旋转。
     */
    @type(CurveRange)
    @range([-1, 1])
    @radian
    @displayOrder(3)
    @tooltip('i18n:rotationOvertimeModule.y')
    @visible(function (this: RotationModule): boolean { return this.separateAxes; })
    public get y () {
        if (!this._y) {
            this._y = new CurveRange();
        }
        return this._y;
    }

    public set y (val) {
        this._y = val;
    }

    /**
     * @zh 绕 Z 轴设定旋转。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @radian
    @displayOrder(4)
    @tooltip('i18n:rotationOvertimeModule.z')
    @visible(function (this: RotationModule): boolean { return this.separateAxes; })
    public z = new CurveRange();

    @type(CurveRange)
    @range([-1, 1])
    @radian
    @displayOrder(4)
    @tooltip('i18n:rotationOvertimeModule.z')
    @visible(function (this: RotationModule): boolean { return !this.separateAxes; })
    public get angularVelocity () {
        return this.z;
    }

    public set angularVelocity (val) {
        this.z = val;
    }

    @serializable
    private _separateAxes = false;
    @serializable
    private _y: CurveRange | null = null;
    @serializable
    private _x: CurveRange | null = null;

    public tick (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        if (this.separateAxes && DEBUG) {
            assert(this.x.mode === this.y.mode && this.y.mode === this.z.mode, 'The curve of x, y, z must have same mode!');
        }
        context.markRequiredParameter(BuiltinParticleParameter.ANGULAR_VELOCITY);
        context.markRequiredParameter(BuiltinParticleParameter.ROTATION);
        if (this.z.mode === CurveRange.Mode.Curve || this.z.mode === CurveRange.Mode.TwoCurves) {
            context.markRequiredParameter(BuiltinParticleParameter.NORMALIZED_ALIVE_TIME);
        }
        if (this.z.mode === CurveRange.Mode.TwoConstants || this.z.mode === CurveRange.Mode.TwoCurves) {
            context.markRequiredParameter(BuiltinParticleParameter.RANDOM_SEED);
        }
    }

    public execute (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        const { angularVelocity } = particles;
        const { fromIndex, toIndex } = context;
        if (!this._separateAxes) {
            if (this.z.mode === CurveRange.Mode.Constant) {
                const constant = this.z.constant;
                for (let i = fromIndex; i < toIndex; i++) {
                    angularVelocity.addZAt(constant, i);
                }
            } else if (this.z.mode === CurveRange.Mode.Curve) {
                const { spline, multiplier } = this.z;
                const normalizedAliveTime = particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; i++) {
                    angularVelocity.addZAt(spline.evaluate(normalizedAliveTime[i]) * multiplier, i);
                }
            } else if (this.z.mode === CurveRange.Mode.TwoConstants) {
                const randomSeed = particles.randomSeed.data;
                const { constantMin, constantMax } = this.z;
                for (let i = fromIndex; i < toIndex; i++) {
                    angularVelocity.addZAt(lerp(constantMin, constantMax, RandNumGen.getFloat(randomSeed[i] + ROTATION_OVERTIME_RAND_OFFSET)), i);
                }
            } else {
                const { splineMin, splineMax, multiplier } = this.z;
                const normalizedAliveTime = particles.normalizedAliveTime.data;
                const randomSeed = particles.randomSeed.data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const time = normalizedAliveTime[i];
                    angularVelocity.addZAt(lerp(splineMin.evaluate(time), splineMax.evaluate(time), RandNumGen.getFloat(randomSeed[i] + ROTATION_OVERTIME_RAND_OFFSET)) * multiplier, i);
                }
            }
        } else {
            // eslint-disable-next-line no-lonely-if
            if (this.z.mode === CurveRange.Mode.Constant) {
                const constantX = this.x.constant;
                const constantY = this.y.constant;
                const constantZ = this.z.constant;
                for (let i = fromIndex; i < toIndex; i++) {
                    angularVelocity.add3fAt(constantX, constantY, constantZ, i);
                }
            } else if (this.z.mode === CurveRange.Mode.Curve) {
                const { spline: splineX, multiplier: xMultiplier } = this.x;
                const { spline: splineY, multiplier: yMultiplier } = this.y;
                const { spline: splineZ, multiplier: zMultiplier } = this.z;
                const normalizedAliveTime = particles.normalizedAliveTime.data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const time = normalizedAliveTime[i];
                    angularVelocity.add3fAt(splineX.evaluate(time) * xMultiplier,
                        splineY.evaluate(time) * yMultiplier,
                        splineZ.evaluate(time) * zMultiplier, i);
                }
            } else if (this.z.mode === CurveRange.Mode.TwoConstants) {
                const { constantMin: xMin, constantMax: xMax } = this.x;
                const { constantMin: yMin, constantMax: yMax } = this.y;
                const { constantMin: zMin, constantMax: zMax } = this.z;
                const randomSeed = particles.randomSeed.data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const ratio = RandNumGen.get3Float(randomSeed[i] + ROTATION_OVERTIME_RAND_OFFSET, seed);
                    angularVelocity.add3fAt(lerp(xMin, xMax, ratio.x),
                        lerp(yMin, yMax, ratio.y),
                        lerp(zMin, zMax, ratio.z), i);
                }
            } else {
                const { splineMin: xMin, splineMax: xMax, multiplier: xMultiplier } = this.x;
                const { splineMin: yMin, splineMax: yMax, multiplier: yMultiplier } = this.y;
                const { splineMin: zMin, splineMax: zMax, multiplier: zMultiplier } = this.z;
                const normalizedAliveTime = particles.normalizedAliveTime.data;
                const randomSeed = particles.randomSeed.data;
                for (let i = fromIndex; i < toIndex; i++) {
                    const time = normalizedAliveTime[i];
                    const seed = randomSeed[i];
                    angularVelocity.add3fAt(lerp(xMin.evaluate(time), xMax.evaluate(time), RandNumGen.getFloat(seed + ROTATION_OVERTIME_RAND_OFFSET)) * xMultiplier,
                        lerp(yMin.evaluate(time), yMax.evaluate(time), RandNumGen.getFloat(seed + ROTATION_OVERTIME_RAND_OFFSET)) * yMultiplier,
                        lerp(zMin.evaluate(time), zMax.evaluate(time), RandNumGen.getFloat(seed + ROTATION_OVERTIME_RAND_OFFSET)) * zMultiplier, i);
                }
            }
        }
    }

    protected needsFilterSerialization () {
        return true;
    }

    protected getSerializedProps () {
        if (!this.separateAxes) {
            return ['separateAxes', 'z'];
        } else {
            return ['separateAxes', '_x', '_y', 'z'];
        }
    }
}
