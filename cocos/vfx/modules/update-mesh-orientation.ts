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

import { ccclass, type, serializable } from 'cc.decorator';
import { Vec3 } from '../../core';
import { VFXModule, ModuleExecStageFlags } from '../vfx-module';
import { ContextDataSet, ParticleDataSet, EmitterDataSet, UserDataSet } from '../data-set';
import { Vec3Expression, ConstantVec3Expression } from '../expressions';
import { P_MESH_ORIENTATION, C_DELTA_TIME, C_FROM_INDEX, C_TO_INDEX } from '../define';

const eulerAngle = new Vec3();

@ccclass('cc.UpdateMeshOrientationModule')
@VFXModule.register('UpdateMeshOrientation', ModuleExecStageFlags.UPDATE, [P_MESH_ORIENTATION.name], [])
export class UpdateMeshOrientationModule extends VFXModule {
    /**
     * @zh 绕 X 轴设定旋转。
     */
    @type(Vec3Expression)
    public get rotationRate () {
        if (!this._rotationRate) {
            this._rotationRate = new ConstantVec3Expression();
        }
        return this._rotationRate;
    }

    public set rotationRate (val) {
        this._rotationRate = val;
    }

    @serializable
    private _rotationRate: Vec3Expression | null = null;

    public tick (dataStore: VFXDataStore) {
        particles.ensureParameter(P_MESH_ORIENTATION);
        this.rotationRate.tick(dataStore);
    }

    public execute (dataStore: VFXDataStore) {
        const meshOrientation = particles.getVec3ArrayParameter(P_MESH_ORIENTATION);
        const deltaTime = context.getFloatParameter(C_DELTA_TIME).data;
        const fromIndex = context.getUint32Parameter(C_FROM_INDEX).data;
        const toIndex = context.getUint32Parameter(C_TO_INDEX).data;

        const rotationRateExp = this._rotationRate as Vec3Expression;
        rotationRateExp.bind(dataStore);

        if (rotationRateExp.isConstant) {
            rotationRateExp.evaluate(0, eulerAngle);
            Vec3.multiplyScalar(eulerAngle, eulerAngle, deltaTime);
            for (let i = fromIndex; i < toIndex; i++) {
                meshOrientation.addVec3At(eulerAngle, i);
            }
        } else {
            for (let i = fromIndex; i < toIndex; i++) {
                const rate = rotationRateExp.evaluate(i, eulerAngle);
                Vec3.multiplyScalar(eulerAngle, eulerAngle, deltaTime);
                meshOrientation.addVec3At(eulerAngle, i);
            }
        }
    }
}
