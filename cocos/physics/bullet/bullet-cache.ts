/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { Collider, TriggerEventType, CollisionEventType, IContactEquation, CharacterController } from '../../../exports/physics-framework';
import { Vec3, Quat, Mat4, Color } from '../../core';
import { CharacterTriggerEventType } from '../framework';
import { bt, btCache } from './instantiated';
import type { BulletWorld } from './bullet-world';

export const TriggerEventObject = {
    type: 'onTriggerEnter' as unknown as TriggerEventType,
    selfCollider: null as unknown as Collider,
    otherCollider: null as unknown as Collider,
    impl: null,
};

export const CollisionEventObject = {
    type: 'onCollisionEnter' as CollisionEventType,
    selfCollider: null as unknown as Collider,
    otherCollider: null as unknown as Collider,
    contacts: [] as IContactEquation[],
    impl: null,
};

export const CharacterTriggerEventObject = {
    type: 'onControllerTriggerEnter' as unknown as CharacterTriggerEventType,
    collider: null as unknown as Collider,
    characterController: null as unknown as CharacterController,
    impl: null,
};

export class BulletCache {
    private static _instance: BulletCache;
    static get instance (): BulletCache {
        if (BulletCache._instance == null) BulletCache._instance = new BulletCache();
        return BulletCache._instance;
    }

    static readonly ROOT: { [x: number]: Record<string, unknown> } = {};

    static setWrapper (impl: Bullet.ptr, type: string, wrap: any): void {
        if (!this.ROOT[type]) this.ROOT[type] = {};
        this.ROOT[type][impl] = wrap;
    }

    static delWrapper (impl: Bullet.ptr, type: string): void {
        delete this.ROOT[type][impl];
    }

    static getWrapper<T> (ptr: Bullet.ptr, type: string): T {
        return this.ROOT[type][ptr] as T;
    }

    static isNotEmptyShape (ptr: Bullet.ptr): boolean { return ptr !== bt.EmptyShape_static(); }

    static world: BulletWorld | null = null;

    readonly BT_TRANSFORM_0 = bt.Transform_new();
    readonly BT_TRANSFORM_1 = bt.Transform_new();
    readonly BT_V3_0 = bt.Vec3_new(0, 0, 0);
    readonly BT_V3_1 = bt.Vec3_new(0, 0, 0);
    readonly BT_V3_2 = bt.Vec3_new(0, 0, 0);
    readonly BT_QUAT_0 = bt.Quat_new(0, 0, 0, 1);
}

export const CC_V3_0 = new Vec3();
export const CC_V3_1 = new Vec3();
export const CC_V3_2 = new Vec3();
export const CC_QUAT_0 = new Quat();
export const CC_QUAT_1 = new Quat();
export const CC_MAT4_0 = new Mat4();
export const CC_MAT4_1 = new Mat4();
export const CC_COLOR_0 = new Color();

btCache.CACHE = BulletCache;
