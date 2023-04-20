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
import { ccclass, range, rangeMin, serializable, tooltip, type, visible } from 'cc.decorator';
import { ShapeModule, DistributionMode, MoveWarpMode } from './shape';
import { ModuleExecStageFlags, VFXModule } from '../vfx-module';
import { Enum, lerp } from '../../core';
import { BuiltinParticleParameterFlags, BuiltinParticleParameterName, ParticleDataSet } from '../particle-data-set';
import { VFXEmitterParams, VFXEmitterState, ModuleExecContext } from '../base';
import { FloatExpression } from '../expressions/float';
import { EmitterDataSet } from '../emitter-data-set';

@ccclass('cc.LineShapeModule')
@VFXModule.register('LineShape', ModuleExecStageFlags.SPAWN, [BuiltinParticleParameterName.INITIAL_DIR])
export class LineShapeModule extends ShapeModule {
    /**
     * @zh 粒子发射器半径。
     */
    @serializable
    @tooltip('i18n:shapeModule.radius')
    @rangeMin(0.0001)
    public length = 1;

    /**
     * @zh 粒子在扇形范围内的发射方式 [[ArcMode]]。
     */
    @type(Enum(DistributionMode))
    @serializable
    @tooltip('i18n:shapeModule.arcMode')
    public distributionMode = DistributionMode.RANDOM;

    @type(Enum(MoveWarpMode))
    @serializable
    @visible(function (this: LineShapeModule) {
        return this.distributionMode === DistributionMode.MOVE;
    })
    public moveWrapMode = MoveWarpMode.LOOP;

    /**
     * @zh 使用移动分布方式时的移动速度。
     */
    @type(FloatExpression)
    @range([0, 1])
    @serializable
    @tooltip('i18n:shapeModule.arcSpeed')
    @visible(function (this: LineShapeModule) {
        return this.distributionMode === DistributionMode.MOVE;
    })
    public moveSpeed = new FloatExpression();

    /**
      * @zh 控制可能产生粒子的弧周围的离散间隔。
      */
    @serializable
    @tooltip('i18n:shapeModule.arcSpread')
    public spread = 0;

    private _invLength = 0;
    private _lengthTimer = 0;
    private _lengthTimePrev = 0;
    private _spreadStep = 0;
    private _lengthRounded = 0;
    private _halfLength = 0;

    public onPlay (params: VFXEmitterParams, states: VFXEmitterState) {
        super.onPlay(params, states);
        this._lengthTimer = 0;
        this._lengthTimePrev = 0;
    }

    public tick (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        super.tick(particles, emitter, user, context);
        if (this.distributionMode === DistributionMode.MOVE) {
            particles.markRequiredParameters(BuiltinParticleParameterFlags.SPAWN_TIME_RATIO);
        }
        this._lengthTimePrev = this._lengthTimer;
        let deltaTime = context.emitterDeltaTime;
        if (context.normalizedLoopAge < context.normalizedPrevLoopAge) {
            this._lengthTimer += (this.moveSpeed.evaluate(1, 1) * (params.duration - context.previousTime));
            deltaTime = context.currentTime;
        }
        this._lengthTimer += this.moveSpeed.evaluate(context.normalizedLoopAge, 1) * deltaTime;
        this._invLength = 1 / this.length;
        this._spreadStep = this.spread * this._invLength;
        this._lengthRounded = Math.ceil(this.length / this._spreadStep) * this._spreadStep;
        this._halfLength = this.length * 0.5;
    }

    public execute (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        const { fromIndex, toIndex } = context;
        const { vec3Register, initialDir } = particles;
        const rand = this._rand;
        const spreadStep = this._spreadStep;
        const lengthTimer = this._lengthTimer;
        const lengthTimerPrev = this._lengthTimePrev;
        const length = this.length;
        const invLength = this._invLength;
        const lengthRounded = this._lengthRounded;
        const halfLength = this._halfLength;
        if (this.distributionMode === DistributionMode.RANDOM) {
            if (this.spread > 0) {
                for (let i = fromIndex; i < toIndex; ++i) {
                    const len = length * rand.getFloat();
                    vec3Register.set3fAt(len - halfLength, 0, 0, i);
                    initialDir.set3fAt(0, 1, 0, i);
                }
            } else {
                for (let i = fromIndex; i < toIndex; ++i) {
                    const len = Math.floor((lengthRounded * rand.getFloat()) / spreadStep) * spreadStep;
                    vec3Register.set3fAt(len - halfLength, 0, 0, i);
                    initialDir.set3fAt(0, 1, 0, i);
                }
            }
        } else if (this.distributionMode === DistributionMode.MOVE) {
            if (this.moveWrapMode === MoveWarpMode.LOOP) {
                const spawnTimeRatio = particles.spawnTimeRatio.data;
                if (this.spread > 0) {
                    for (let i = fromIndex; i < toIndex; ++i) {
                        let len = lerp(lengthTimer, lengthTimerPrev, spawnTimeRatio[i]);
                        len = Math.floor(len / spreadStep) * spreadStep;
                        len %= length;
                        if (len < 0) {
                            len += length;
                        }
                        vec3Register.set3fAt(len - halfLength, 0, 0, i);
                        initialDir.set3fAt(0, 1, 0, i);
                    }
                } else {
                    for (let i = fromIndex; i < toIndex; ++i) {
                        let len = lerp(lengthTimer, lengthTimerPrev, spawnTimeRatio[i]);
                        len %= length;
                        if (len < 0) {
                            len += length;
                        }
                        vec3Register.set3fAt(len - halfLength, 0, 0, i);
                        initialDir.set3fAt(0, 1, 0, i);
                    }
                }
            } else {
                const spawnTimeRatio = particles.spawnTimeRatio.data;
                if (this.spread > 0) {
                    for (let i = fromIndex; i < toIndex; ++i) {
                        let len = lerp(lengthTimer, lengthTimerPrev, spawnTimeRatio[i]);
                        len = Math.floor(len / spreadStep) * spreadStep;
                        len *= invLength;
                        len %= 2;
                        len = Math.abs(len);
                        if (len >= 1.0) {
                            len = 2 - len;
                        }
                        len *= length;
                        vec3Register.set3fAt(len - halfLength, 0, 0, i);
                        initialDir.set3fAt(0, 1, 0, i);
                    }
                } else {
                    for (let i = fromIndex; i < toIndex; ++i) {
                        let len = lerp(lengthTimer, lengthTimerPrev, spawnTimeRatio[i]);
                        len *= invLength;
                        len %= 2;
                        len = Math.abs(len);
                        if (len >= 1.0) {
                            len = 2 - len;
                        }
                        len *= length;
                        vec3Register.set3fAt(len - halfLength, 0, 0, i);
                        initialDir.set3fAt(0, 1, 0, i);
                    }
                }
            }
        } else {
            const invTotal = 1 / (toIndex - fromIndex);
            if (this.spread > 0) {
                for (let i = fromIndex; i < toIndex; ++i) {
                    let len = i * invTotal * length;
                    len = Math.floor(len / spreadStep) * spreadStep;
                    vec3Register.set3fAt(len - halfLength, 0, 0, i);
                    initialDir.set3fAt(0, 1, 0, i);
                }
            } else {
                for (let i = fromIndex; i < toIndex; ++i) {
                    const len = i * invTotal * length;
                    vec3Register.set3fAt(len - halfLength, 0, 0, i);
                    initialDir.set3fAt(0, 1, 0, i);
                }
            }
        }
        super.execute(particles, params, context);
    }
}
