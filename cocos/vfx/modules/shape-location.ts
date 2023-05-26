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

import { ccclass, serializable, type } from 'cc.decorator';
import { Mat4, Quat, Vec3 } from '../../core';
import { VFXModule } from '../vfx-module';
import { ParticleDataSet, POSITION } from '../data-set/particle';
import { ContextDataSet } from '../data-set/context';
import { EmitterDataSet } from '../data-set/emitter';
import { UserDataSet } from '../data-set/user';
import { Vec3ArrayParameter } from '../parameters';
import { BindingVec3Expression, ConstantVec3Expression, Vec3Expression } from '../expressions';

const originVec = new Vec3(0, 0, 0);
const tempVec1 = new Vec3(0, 0, 0);
const tempVec2 = new Vec3(0, 0, 0);
const tempVec3 = new Vec3(0, 0, 0);
const tempQuat = new Quat(0, 0, 0, 0);

/**
 * 粒子在发射形状上的分布方式
 */
export enum DistributionMode {
    /**
     * 随机位置发射。
     */
    RANDOM,

    /**
     * 设置一个位置发射。
     */
    DIRECT,

    /**
     * 均匀分布在发射器形状上，依赖此帧发射的粒子总数。可以与 burst 配合使用。
     */
    UNIFORM,
}

@ccclass('cc.ShapeLocationModule')
export abstract class ShapeLocationModule extends VFXModule {
    /**
     * @zh 粒子发射器位置。
     */
    @type(Vec3Expression)
    get position () {
        if (!this._position) this._position = new ConstantVec3Expression(Vec3.ZERO);
        return this._position;
    }
    set position (val) {
        this._position = val;
    }

    /**
     * @zh 粒子发射器旋转角度。
     */
    @type(Vec3Expression)
    get rotation () {
        if (!this._rotation) this._rotation = new ConstantVec3Expression(Vec3.ZERO);
        return this._rotation;
    }
    set rotation (val) {
        this._rotation = val;
    }

    /**
     * @zh 粒子发射器缩放比例。
     */
    @type(Vec3Expression)
    get scale () {
        if (!this._scale) this._scale = new ConstantVec3Expression(Vec3.ONE);
        return this._scale;
    }
    set scale (val) {
        this._scale = val;
    }

    get origin () {
        if (!this._origin) this._origin = new BindingVec3Expression(POSITION);
        return this._origin;
    }
    set origin (val) {
        this._origin = val;
    }

    @serializable
    private _position: Vec3Expression | null = null;
    @serializable
    private _rotation: Vec3Expression | null = null;
    @serializable
    private _scale: Vec3Expression | null = null;
    @serializable
    private _origin: Vec3Expression | null = null;
    private _mat = new Mat4();
    protected storePosition = this.storePositionFast;

    public tick (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ContextDataSet) {
        this.position.tick(particles, emitter, user, context);
        this.rotation.tick(particles, emitter, user, context);
        this.scale.tick(particles, emitter, user, context);
        this.origin.tick(particles, emitter, user, context);
        particles.markRequiredParameter(POSITION);
    }

    public execute (particles: ParticleDataSet, emitter: EmitterDataSet, user: UserDataSet, context: ContextDataSet) {
        const position = this._position as Vec3Expression;
        const rotation = this._rotation as Vec3Expression;
        const scale = this._scale as Vec3Expression;
        const origin = this._origin as Vec3Expression;
        position.bind(particles, emitter, user, context);
        rotation.bind(particles, emitter, user, context);
        scale.bind(particles, emitter, user, context);
        origin.bind(particles, emitter, user, context);
        if (position.isConstant && rotation.isConstant && scale.isConstant) {
            rotation.evaluate(0, tempVec1);
            Mat4.fromSRT(this._mat, Quat.fromEuler(tempQuat, tempVec1.x, tempVec1.y, tempVec1.z), position.evaluate(0, tempVec2), scale.evaluate(0, tempVec3));
            this.storePosition = this.storePositionFast;
        } else {
            this.storePosition = this.storePositionSlow;
        }
    }

    protected storePositionFast (index: number, pos: Vec3, position: Vec3ArrayParameter) {
        Vec3.transformMat4(pos, pos, this._mat);
        Vec3.add(pos, pos, (this._origin as Vec3Expression).evaluate(index, originVec));
        position.setVec3At(pos, index);
    }

    protected storePositionSlow (index: number, pos: Vec3, position: Vec3ArrayParameter) {
        (this._rotation as Vec3Expression).evaluate(index, tempVec1);
        Mat4.fromSRT(this._mat, Quat.fromEuler(tempQuat, tempVec1.x, tempVec1.y, tempVec1.z),
            (this._position as Vec3Expression).evaluate(index, tempVec2), (this._scale as Vec3Expression).evaluate(0, tempVec3));
        Vec3.transformMat4(pos, pos, this._mat);
        Vec3.add(pos, pos, (this._origin as Vec3Expression).evaluate(index, originVec));
        position.setVec3At(pos, index);
    }
}
