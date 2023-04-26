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

import { ccclass, range, serializable, tooltip, type, visible } from 'cc.decorator';
import { VFXModule, ModuleExecStage, ModuleExecStageFlags } from '../vfx-module';
import { BuiltinParticleParameterFlags, BuiltinParticleParameterName as ParameterName, ParticleDataSet } from '../particle-data-set';
import { ModuleExecContext } from '../base';
import { FloatExpression } from '../expressions/float';
import { lerp, Vec2, Vec3 } from '../../core';
import { RandomStream } from '../random-stream';
import { EmitterDataSet } from '../emitter-data-set';
import { UserDataSet } from '../user-data-set';
import { ConstantFloatExpression, ConstantVec2Expression, ConstantVec3Expression, Vec2Expression, Vec3Expression } from '../expressions';

const tempScale = new Vec3();

@ccclass('cc.SetSpriteSizeModule')
@VFXModule.register('SetSpriteSize', ModuleExecStageFlags.SPAWN | ModuleExecStageFlags.UPDATE, [ParameterName.SPRITE_SIZE], [ParameterName.NORMALIZED_AGE])
export class SetSpriteSizeModule extends VFXModule {
    @serializable
    @tooltip('i18n:particle_system.startSize3D')
    public separateAxes = false;

    @type(FloatExpression)
    @visible(function (this: SetSpriteSizeModule): boolean { return !this.separateAxes; })
    public get uniformSize () {
        if (!this._uniformSize) {
            this._uniformSize = new ConstantFloatExpression(1);
        }
        return this._uniformSize;
    }

    public set uniformSize (val) {
        this._uniformSize = val;
    }

    @type(Vec2Expression)
    @visible(function (this: SetSpriteSizeModule): boolean { return this.separateAxes; })
    public get size () {
        if (!this._size) {
            this._size = new ConstantVec2Expression(Vec2.ONE);
        }
        return this._size;
    }

    public set size (val) {
        this._size = val;
    }

    @serializable
    private _uniformSize: FloatExpression | null = null;
    @serializable
    private _size: Vec2Expression | null = null;

    public tick (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        if (context.executionStage === ModuleExecStage.SPAWN) {
            particles.markRequiredParameters(BuiltinParticleParameterFlags.BASE_SCALE);
        }

        particles.markRequiredParameters(BuiltinParticleParameterFlags.SCALE);
        if (this.separateAxes) {
            this.size.tick(particles, emitter, user, context);
        } else {
            this.uniformSize.tick(particles, emitter, user, context);
        }
    }

    public execute (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ModuleExecContext) {
        const scale = context.executionStage === ModuleExecStage.SPAWN ? particles.getVec2Parameter(BASE_SPRITE_SIZE) : particles.getVec2Parameter(SPRITE_SIZE);
        const { fromIndex, toIndex } = context;
        if (this.separateAxes) {
            const exp = this.size;
            exp.bind(particles, emitter, user, context);
            if (exp.isConstant) {
                const srcScale = exp.evaluate(0, tempScale);
                scale.fill(srcScale, fromIndex, toIndex);
            } else {
                for (let i = fromIndex; i < toIndex; ++i) {
                    exp.evaluate(i, tempScale);
                    scale.setVec3At(tempScale, i);
                }
            }
        } else {
            const exp = this.uniformSize;
            exp.bind(particles, emitter, user, context);
            if (exp.isConstant) {
                const srcScale = exp.evaluate(0);
                scale.fill1f(srcScale, fromIndex, toIndex);
            } else {
                for (let i = fromIndex; i < toIndex; ++i) {
                    const srcScale = exp.evaluate(i);
                    scale.set1fAt(srcScale, i);
                }
            }
        }
    }

    protected needsFilterSerialization () {
        return true;
    }

    protected getSerializedProps () {
        if (!this.separateAxes) {
            return ['separateAxes', 'scale'];
        } else {
            return ['separateAxes', 'uniformScale'];
        }
    }
}
