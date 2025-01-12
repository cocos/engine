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

import { B2, B2ObjectType, addImplPtrReference, addImplPtrReferenceWASM, getImplPtr, removeImplPtrReference, removeImplPtrReferenceWASM } from '../instantiated';
import { IJoint2D } from '../../spec/i-physics-joint';
import { Joint2D, PhysicsSystem2D, RigidBody2D } from '../../framework';
import { B2PhysicsWorld } from '../physics-world';
import { warn } from '../../../core';

/** @mangle */
export class B2Joint implements IJoint2D {
    get impl (): B2.Joint | null {
        return this._b2joint;
    }
    get comp (): Joint2D | null {
        return this._jointComp;
    }
    get body (): RigidBody2D | null {
        return this._body;
    }

    protected _b2joint: B2.Joint | null = null;
    protected _jointComp: Joint2D | null = null;
    protected _body: RigidBody2D | null = null;

    private _inited = false;

    initialize (comp: Joint2D): void {
        this._jointComp = comp;
    }

    onEnable (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this._init);
    }

    onDisable (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this.destroy);
    }

    // need init after body and connected body init
    start (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this._init);
    }

    apply (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this.destroy);
        if (this.comp!.enabledInHierarchy) {
            PhysicsSystem2D.instance._callAfterStep(this, this._init);
        }
    }

    _init (): void {
        if (this._inited) return;

        const comp = this._jointComp!;
        if (!comp.isValid) {
            return;
        }

        this._body = comp.getComponent(RigidBody2D);
        if (!this._body) {
            warn(`Joint2D: Body is not found, can not create joint. Node Name: ${comp.node.name}`);
            return;
        }

        const def = this._createJointDef();
        if (!def) {
            return;
        }

        def.SetBodyA(this._body.impl!.impl as B2.Body);
        const connectedBody = comp.connectedBody;
        //if connected body is set but not active, return
        if (connectedBody && !connectedBody.enabledInHierarchy) {
            return;
        }

        //if connected body is not set, use scene origin as connected body
        if (!connectedBody) {
            def.SetBodyB((PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld).groundBodyImpl);
        } else {
            def.SetBodyB(connectedBody.impl!.impl  as B2.Body);
        }

        def.collideConnected = comp.collideConnected;

        this._b2joint = (PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld).impl.CreateJoint(def);
        addImplPtrReference(B2ObjectType.Joint, this, getImplPtr(this._b2joint));
        addImplPtrReferenceWASM(B2ObjectType.Joint, this._b2joint, getImplPtr(this._b2joint));

        this._inited = true;
    }

    destroy (): void {
        if (!this._inited) return;

        removeImplPtrReference(B2ObjectType.Joint, getImplPtr(this._b2joint));
        removeImplPtrReferenceWASM(B2ObjectType.Joint, getImplPtr(this._b2joint));
        (PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld).impl.DestroyJoint(this._b2joint!);

        this._b2joint = null;
        this._inited = false;
    }

    _createJointDef (): B2.JointDef | null {
        return null;
    }

    isValid (): Joint2D | null {
        return this._b2joint && this._body && this._body.impl && this._jointComp;
    }
}
