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

import { lerp, pseudoRandom } from '../../core';
import { ccclass, displayOrder, range, serializable, tooltip, type } from '../../core/data/decorators';
import { CurveRange } from '../curve-range';
import { ParticleModule, ModuleExecStage } from '../particle-module';
import { ParticleSOAData } from '../particle-soa-data';
import { ParticleEmitterParams, ParticleExecContext } from '../particle-base';

const SPEED_MODIFIER_RAND_OFFSET = 388180;

@ccclass('cc.SpeedModifierModule')
@ParticleModule.register('SpeedModifie', ModuleExecStage.UPDATE, 0)
export class SpeedModifierModule extends ParticleModule {
    /**
     * @zh 速度修正系数。
     */
    @type(CurveRange)
    @serializable
    @range([-1, 1])
    @displayOrder(5)
    @tooltip('i18n:velocityOvertimeModule.speedModifier')
    public speedModifier = new CurveRange(1);

    public execute (particles: ParticleSOAData, params: ParticleEmitterParams, context: ParticleExecContext) {
        const { speedModifier, normalizedAliveTime, randomSeed } = particles;
        const { fromIndex, toIndex } = context;
        if (this.speedModifier.mode === CurveRange.Mode.Constant) {
            const constant = this.speedModifier.constant;
            for (let i = fromIndex; i < toIndex; i++) {
                speedModifier[i] = constant;
            }
        } else if (this.speedModifier.mode === CurveRange.Mode.Curve) {
            const { spline, multiplier } = this.speedModifier;
            for (let i = fromIndex; i < toIndex; i++) {
                speedModifier[i] = spline.evaluate(normalizedAliveTime[i]) * multiplier;
            }
        } else if (this.speedModifier.mode === CurveRange.Mode.TwoConstants) {
            const { constantMin, constantMax } = this.speedModifier;
            for (let i = fromIndex; i < toIndex; i++) {
                speedModifier[i] = lerp(constantMin, constantMax, pseudoRandom(randomSeed[i] + SPEED_MODIFIER_RAND_OFFSET));
            }
        } else {
            const { splineMin, splineMax, multiplier } = this.speedModifier;
            for (let i = fromIndex; i < toIndex; i++) {
                const normalizedTime = normalizedAliveTime[i];
                speedModifier[i] = lerp(splineMin.evaluate(normalizedTime), splineMax.evaluate(normalizedTime), pseudoRandom(randomSeed[i] + SPEED_MODIFIER_RAND_OFFSET)) * multiplier;
            }
        }
    }
}
