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

import { IHingeJoint } from '../../spec/i-physics-joint';
import { HingeJoint2D } from '../../framework';
import { b2Joint } from './joint-2d';
import { PHYSICS_2D_PTM_RATIO } from '../../framework/physics-types';
import { toRadian } from '../../../core';

export class b2HingeJoint extends b2Joint implements IHingeJoint {
    enableLimit (v: boolean): void {
        if (this._b2joint) {
            (this._b2joint as b2.RevoluteJoint).EnableLimit(v);
        }
    }
    setLowerAngle (v: number): void {
        this.updateLimits();
    }
    setUpperAngle (v: number): void {
        this.updateLimits();
    }
    updateLimits (): void {
        if (this._b2joint) {
            const comp = this._jointComp as HingeJoint2D;
            (this._b2joint as b2.RevoluteJoint).SetLimits(toRadian(comp.lowerAngle), toRadian(comp.upperAngle));
        }
    }

    // motor
    enableMotor (v: boolean): void {
        if (this._b2joint) {
            (this._b2joint as b2.RevoluteJoint).EnableMotor(v);
        }
    }
    setMaxMotorTorque (v: number): void {
        if (this._b2joint) {
            (this._b2joint as b2.RevoluteJoint).SetMaxMotorTorque(v);
        }
    }
    setMotorSpeed (v: number): void {
        if (this._b2joint) {
            (this._b2joint as b2.RevoluteJoint).SetMotorSpeed(v);
        }
    }

    _createJointDef (): any {
        const comp = this._jointComp as HingeJoint2D;
        const def = new b2.RevoluteJointDef();
        def.localAnchorA = { x: comp.anchor.x / PHYSICS_2D_PTM_RATIO, y: comp.anchor.y / PHYSICS_2D_PTM_RATIO };
        def.localAnchorB = { x: comp.connectedAnchor.x / PHYSICS_2D_PTM_RATIO, y: comp.connectedAnchor.y / PHYSICS_2D_PTM_RATIO };

        def.enableMotor = comp.enableMotor;
        def.maxMotorTorque = comp.maxMotorTorque;
        def.motorSpeed = toRadian(comp.motorSpeed);

        def.enableLimit = comp.enableLimit;
        def.lowerAngle = toRadian(comp.lowerAngle);
        def.upperAngle = toRadian(comp.upperAngle);
        return def;
    }
}
