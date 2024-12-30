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
// @ts-nocheck
import { IBaseShape } from '../../spec/i-physics-shape';
import { Collider2D, PhysicsSystem2D, RigidBody2D, PHYSICS_2D_PTM_RATIO } from '../../../../exports/physics-2d-framework';
import { Rect, Vec3 } from '../../../core';
import { b2PhysicsWorld } from '../physics-world';
import { PhysicsGroup } from '../../../physics/framework/physics-enum';

declare const b2: any;
const tempFilter = new b2.Filter();
const lowerBound = { x: 0, y: 0 };
const upperBound = { x: 0, y: 0 };

function getFilter (shape: b2Shape2D): any {
    const comp = shape.collider;
    if (comp.body) {
        tempFilter.categoryBits = comp.group === PhysicsGroup.DEFAULT ? comp.body.group : comp.group;
    } else {
        tempFilter.categoryBits = comp.group;
    }
    tempFilter.maskBits = PhysicsSystem2D.instance.collisionMatrix[tempFilter.categoryBits];
    return tempFilter;
}

export class b2Shape2D implements IBaseShape {
    protected _shapes: b2.Shape[] = [];
    protected _fixtures: b2.Fixture[] = [];

    protected _collider: Collider2D | null = null;
    protected _body: b2.Body | null = null;

    private _inited = false;

    private _rect = new Rect();

    get impl (): b2.Shape[] {
        return this._shapes;
    }

    get collider (): Collider2D {
        return this._collider!;
    }

    initialize (comp: Collider2D): void {
        this._collider = comp;
    }

    onLoad (): void {
    }

    onEnable (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this._init);
    }

    onDisable (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this._destroy);
    }

    start (): void {

    }

    onGroupChanged (): void {
        const filter = getFilter(this);
        this._fixtures.forEach((f): void => {
            f.SetFilterData(filter);
        });
    }

    apply (): void {
        this._destroy();
        if (this.collider.enabledInHierarchy) {
            this._init();
        }
    }

    get worldAABB (): Readonly<Rect> {
        const MAX = 10e6;

        let minX = MAX; let minY = MAX;
        let maxX = -MAX; let maxY = -MAX;

        const fixtures = this._fixtures;
        for (let i = 0; i < fixtures.length; i++) {
            const fixture = fixtures[i];

            const count = fixture.GetShape().GetChildCount();
            for (let j = 0; j < count; j++) {
                const lower = fixture.GetAABB(j).lowerBound;
                lowerBound.x = lower.x;
                lowerBound.y = lower.y;
                const upper = fixture.GetAABB(j).upperBound;
                upperBound.x = upper.x;
                upperBound.y = upper.y;

                if (fixture.GetShape().m_type === 2) { //b2ShapeType.e_polygonShape
                    const skinWidth = fixture.GetShape().m_radius;
                    lowerBound.x += skinWidth;
                    lowerBound.y += skinWidth;
                    upperBound.x -= skinWidth;
                    upperBound.y -= skinWidth;
                }
                if (lowerBound.x < minX) minX = lowerBound.x;
                if (lowerBound.y < minY) minY = lowerBound.y;
                if (upperBound.x > maxX) maxX = upperBound.x;
                if (upperBound.y > maxY) maxY = upperBound.y;
            }
        }

        minX *= PHYSICS_2D_PTM_RATIO;
        minY *= PHYSICS_2D_PTM_RATIO;
        maxX *= PHYSICS_2D_PTM_RATIO;
        maxY *= PHYSICS_2D_PTM_RATIO;

        const r = this._rect;
        r.x = minX;
        r.y = minY;
        r.width = maxX - minX;
        r.height = maxY - minY;

        return r;
    }

    getFixtureIndex (fixture: b2.Fixture): number {
        return this._fixtures.indexOf(fixture);
    }

    //relativePositionX/Y : relative Position from shape to rigid body
    _createShapes (scaleX: number, scaleY: number, relativePositionX: number, relativePositionY: number): b2.Shape[] {
        return [];
    }

    _init (): void {
        if (this._inited) return;

        const comp = this.collider;
        const scale = comp.node.worldScale;
        // relative Position from shape to rigid body
        let relativePosition = Vec3.ZERO;
        const body = comp.getComponent(RigidBody2D);

        //if rigid body is not attached to the same node of collider, this b2.shape is attached
        // to the groundRigidBody(pos zero, rot zero)
        if (body && body.impl && body.impl.impl) {
            this._body = body.impl.impl as b2.Body;
        } else {
            this._body = (PhysicsSystem2D.instance.physicsWorld as b2PhysicsWorld).groundBodyImpl;
            relativePosition = comp.node.worldPosition;
        }

        const shapes = scale.x === 0 && scale.y === 0 ? [] : this._createShapes(scale.x, scale.y, relativePosition.x, relativePosition.y);

        const filter = getFilter(this);

        for (let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];

            const fixDef = new b2.FixtureDef();

            fixDef.density = comp.density;
            fixDef.isSensor = comp.sensor;
            fixDef.friction = comp.friction;
            fixDef.restitution = comp.restitution;
            fixDef.shape = shape;
            fixDef.filter = filter;

            const fixture = this._body.CreateFixture(fixDef);
            fixture.m_userData = this;

            if (body?.enabledContactListener) {
                (PhysicsSystem2D.instance.physicsWorld as b2PhysicsWorld).registerContactFixture(fixture);
            }

            this._shapes.push(shape);
            this._fixtures.push(fixture);
        }

        this._inited = true;
    }

    _destroy (): void {
        if (!this._inited) return;

        const fixtures = this._fixtures;
        const body = this._body;

        for (let i = fixtures.length - 1; i >= 0; i--) {
            const fixture = fixtures[i];
            fixture.m_userData = null;

            (PhysicsSystem2D.instance.physicsWorld as b2PhysicsWorld).unregisterContactFixture(fixture);

            if (body) {
                body.DestroyFixture(fixture);
            }
        }

        this._body = null;

        this._fixtures.length = 0;
        this._shapes.length = 0;
        this._inited = false;
    }
}
