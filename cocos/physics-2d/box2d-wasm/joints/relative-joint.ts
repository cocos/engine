/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { B2 } from '../instantiated';
import { IRelativeJoint } from '../../spec/i-physics-joint';
import { B2Joint } from './joint-2d';
import { RelativeJoint2D } from '../../framework';
import { PHYSICS_2D_PTM_RATIO } from '../../framework/physics-types';
import { Vec2, toRadian } from '../../../core';

const tempB2Vec2 = { x: 0, y: 0 };//new b2.Vec2();

/** @mangle */
export class B2RelativeJoint extends B2Joint implements IRelativeJoint {
    setMaxForce (v: number): void {
        if (this._b2joint) {
            (this._b2joint as B2.MotorJoint).SetMaxForce(v);
        }
    }
    setAngularOffset (v: number): void {
        if (this._b2joint) {
            (this._b2joint as B2.MotorJoint).SetAngularOffset(toRadian(v));
        }
    }
    setLinearOffset (v: Vec2): void {
        if (this._b2joint) {
            tempB2Vec2.x = v.x / PHYSICS_2D_PTM_RATIO;
            tempB2Vec2.y = v.y / PHYSICS_2D_PTM_RATIO;
            (this._b2joint as B2.MotorJoint).SetLinearOffset(tempB2Vec2);
        }
    }
    setCorrectionFactor (v: number): void {
        if (this._b2joint) {
            (this._b2joint as B2.MotorJoint).SetCorrectionFactor(v);
        }
    }
    setMaxTorque (v: number): void {
        if (this._b2joint) {
            (this._b2joint as B2.MotorJoint).SetMaxTorque(v);
        }
    }

    _createJointDef (): any {
        const comp = this._jointComp as RelativeJoint2D;
        const def = new B2.MotorJointDef();
        def.linearOffset = { x: comp.linearOffset.x / PHYSICS_2D_PTM_RATIO, y: comp.linearOffset.y / PHYSICS_2D_PTM_RATIO };
        def.angularOffset = toRadian(comp.angularOffset);
        def.maxForce = comp.maxForce;
        def.maxTorque = comp.maxTorque;
        def.correctionFactor = comp.correctionFactor;
        return def;
    }
}
