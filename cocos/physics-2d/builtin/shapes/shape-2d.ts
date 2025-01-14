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

import { IBaseShape } from '../../spec/i-physics-shape';
import { Collider2D, PhysicsSystem2D } from '../../../../exports/physics-2d-framework';
import { Rect, Vec2 } from '../../../core';
import { BuiltinPhysicsWorld } from '../builtin-world';
import { BuiltinContact } from '../builtin-contact';

/** @mangle */
export class BuiltinShape2D implements IBaseShape {
    protected _collider: Collider2D | null = null;

    protected _worldAabb = new Rect();
    //contacts contain this Shape
    public _contacts: BuiltinContact[] = [];

    get impl (): null {
        return null;
    }

    get collider (): Collider2D {
        return this._collider!;
    }

    apply (): void {

    }

    initialize (comp: Collider2D): void {
        this._collider = comp;
    }

    onLoad (): void {
    }

    onEnable (): void {
        (PhysicsSystem2D.instance.physicsWorld as BuiltinPhysicsWorld).addShape(this);
    }

    onDisable (): void {
        (PhysicsSystem2D.instance.physicsWorld as BuiltinPhysicsWorld).removeShape(this);
    }

    start (): void {
    }

    update (): void {
    }

    get worldAABB (): Readonly<Rect> {
        return this._worldAabb;
    }

    containsPoint (p: Vec2): boolean {
        if (!this.worldAABB.contains(p)) {
            return false;
        }
        return true;
    }

    intersectsRect (rect: Rect): boolean {
        if (!this.worldAABB.intersects(rect)) {
            return false;
        }
        return true;
    }

    onGroupChanged (): void {
        (PhysicsSystem2D.instance.physicsWorld as BuiltinPhysicsWorld).updateShapeGroup(this);
    }
}
