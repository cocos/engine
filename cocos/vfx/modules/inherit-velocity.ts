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

import { ccclass, type, serializable, visible } from 'cc.decorator';
import { Vec3 } from '../../core';
import { VFXModule, ModuleExecStage, ModuleExecStageFlags } from '../vfx-module';
import { BASE_VELOCITY, POSITION, ParticleDataSet, VELOCITY, FROM_INDEX, ContextDataSet, TO_INDEX, EmitterDataSet, IS_WORLD_SPACE, VELOCITY as EMITTER_VELOCITY, UserDataSet } from '../data-set';
import { ConstantVec3Expression, Vec3Expression } from '../expressions';
import { BoolParameter, Uint32Parameter, Vec3Parameter, Vec3ArrayParameter } from '../parameters';

const tempVelocity = new Vec3();
const scale = new Vec3();
@ccclass('cc.InheritVelocityModule')
@VFXModule.register('InheritVelocity', ModuleExecStageFlags.UPDATE | ModuleExecStageFlags.SPAWN, [VELOCITY.name])
export class InheritVelocityModule extends VFXModule {
    @type(Vec3Expression)
    @visible(true)
    public get scale () {
        if (!this._scale) { this._scale = new ConstantVec3Expression(Vec3.ONE); }
        return this._scale;
    }

    public set scale (val) {
        this._scale = val;
    }

    @serializable
    private _scale: Vec3Expression | null = null;

    public tick (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ContextDataSet) {
        if (!emitter.getParameterUnsafe<BoolParameter>(IS_WORLD_SPACE).data) { return; }
        this.scale.tick(particles, emitter, user, context);
        particles.markRequiredParameter(POSITION);
        particles.markRequiredParameter(VELOCITY);
        if (context.executionStage === ModuleExecStage.SPAWN) {
            particles.markRequiredParameter(BASE_VELOCITY);
        }
    }

    public execute (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ContextDataSet) {
        const fromIndex = context.getParameterUnsafe<Uint32Parameter>(FROM_INDEX).data;
        const toIndex = context.getParameterUnsafe<Uint32Parameter>(TO_INDEX).data;
        const initialVelocity = emitter.getParameterUnsafe<Vec3Parameter>(EMITTER_VELOCITY).data;
        if (!emitter.getParameterUnsafe<BoolParameter>(IS_WORLD_SPACE).data) { return; }
        const velocity = particles.getParameterUnsafe<Vec3ArrayParameter>(context.executionStage === ModuleExecStage.SPAWN ? BASE_VELOCITY : VELOCITY);
        const scaleExp = this._scale as Vec3Expression;
        scaleExp.bind(particles, emitter, user, context);
        if (scaleExp.isConstant) {
            Vec3.multiply(tempVelocity, initialVelocity, scaleExp.evaluate(0, scale));
            for (let i = fromIndex; i < toIndex; i++) {
                velocity.addVec3At(tempVelocity, i);
            }
        } else {
            for (let i = fromIndex; i < toIndex; i++) {
                Vec3.multiply(tempVelocity, initialVelocity, scaleExp.evaluate(i, scale));
                velocity.addVec3At(tempVelocity, i);
            }
        }
    }
}
