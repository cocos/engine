/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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

import { error, IVec3Like, Vec3 } from '../../../core';
import { PhysicsSystem  } from '../../framework';
import { CharacterController } from '../../framework/components/character-controllers/character-controller';
import { IBaseCharacterController } from '../../spec/i-character-controller';
import { BulletCache } from '../bullet-cache';
import { bullet2CocosVec3, cocos2BulletVec3 } from '../bullet-utils';
import { BulletWorld } from '../bullet-world';
import { bt, btCache, EBulletType } from '../instantiated';
import { PhysicsGroup } from '../../framework/physics-enum';
import { BulletShape } from '../shapes/bullet-shape';
import { degreesToRadians } from '../../../core/utils/misc';
import { TransformBit } from '../../../scene-graph';

const v3_0 = new Vec3(0, 0, 0);
const v3_1 = new Vec3(0, 0, 0);
const v3_2 = new Vec3(0, 0, 0);

/** @mangle */
export abstract class BulletCharacterController implements IBaseCharacterController {
    readonly wrappedWorld: BulletWorld;
    private _isEnabled = false;
    protected _impl: number = 0; //btCapsuleCharacterController
    protected _comp: CharacterController = null as any;
    private _btCollisionFlags = 0;//: btControllerCollisionFlag
    protected _word3 = 0;
    protected _dirty = false;
    private _collisionFilterGroup: number = PhysicsGroup.DEFAULT;
    private _collisionFilterMask = -1;
    private static idCounter = 0;
    readonly id = BulletCharacterController.idCounter++;

    get isEnabled (): boolean { return this._isEnabled; }
    get impl (): number {
        return this._impl;
    }
    get characterController (): CharacterController { return this._comp; }

    constructor () {
        this.wrappedWorld = PhysicsSystem.instance.physicsWorld as BulletWorld;
    }

    // virtual
    protected onComponentSet (): void {
        //empty
    }
    protected updateScale (): void {
        //empty
    }

    initialize (comp: CharacterController): boolean {
        this._comp = comp;
        const group = this._comp.group;
        const mask =  PhysicsSystem.instance.collisionMatrix[group];
        this._collisionFilterGroup = group;
        this._collisionFilterMask = mask;

        this.onComponentSet();

        if (this._impl === 0) {
            error('[Physics]: Initialize BulletCharacterController failed');
            return false;
        } else {
            return true;
        }
    }

    setWrapper (): void {
        BulletCache.setWrapper(this._impl, btCache.CCT_CACHE_NAME, this);
        const cctCollisionShapeImpl = bt.CharacterController_getCollisionShape(this.impl);
        BulletCache.setWrapper(cctCollisionShapeImpl, btCache.CCT_CACHE_NAME, this);
    }

    onEnable (): void {
        this._isEnabled = true;
        if (!this._impl) {
            this.onComponentSet();
        }
        this.setDetectCollisions(false);
        this.setOverlapRecovery(true);
        (PhysicsSystem.instance.physicsWorld as BulletWorld).addCCT(this);
        this.setWrapper();
    }

    onDisable (): void {
        this._isEnabled = false;
        this.wrappedWorld.removeCCT(this);
        this.onDestroy();
    }

    onDestroy (): void {
        //(this._comp as any) = null;
        bt._safe_delete(this._impl, EBulletType.EBulletTypeCharacterController);
        BulletCache.delWrapper(this._impl, btCache.CCT_CACHE_NAME);
        this._impl = 0;
        //(this.wrappedWorld as any) = null;
    }

    onLoad (): void {
        //empty
    }

    getPosition (out: IVec3Like): void {
        if (!this._impl) return;
        bullet2CocosVec3(out, bt.CharacterController_getPosition(this.impl) as number);
    }

    setPosition (value: IVec3Like): void {
        if (!this._impl) return;
        cocos2BulletVec3(bt.CharacterController_getPosition(this.impl)  as number, value);
        this.syncPhysicsToScene();
    }

    setContactOffset (value: number): void {
        if (!this._impl) return;
        bt.CharacterController_setContactOffset(this._impl, value);
    }

    setStepOffset (value: number): void {
        if (!this._impl) return;
        bt.CharacterController_setStepOffset(this._impl, value);
    }

    setSlopeLimit (value: number): void {
        if (!this._impl) return;
        bt.CharacterController_setSlopeLimit(this._impl, degreesToRadians(value));
    }

    setDetectCollisions (value: boolean): void {
        if (!this._impl) return;
        bt.CharacterController_setCollision(this.impl, value);
    }

    setOverlapRecovery (value: boolean): void {
        if (!this._impl) return;
        bt.CharacterController_setOverlapRecovery(this.impl, value);
    }

    onGround (): boolean {
        return (this._btCollisionFlags & (1 << 2)) > 0;//btControllerCollisionFlag::Enum::BULLET_CONTROLLER_COLLISION_DOWN
    }

    syncSceneToPhysics (): void {
        const node = this.characterController.node;
        if (node.hasChangedFlags) {
            if (node.hasChangedFlags & TransformBit.SCALE) this.syncScale();
            //teleport
            if (node.hasChangedFlags & TransformBit.POSITION) {
                Vec3.add(v3_0, node.worldPosition, this.scaledCenter);
                this.setPosition(v3_0);
            }
        }
    }

    syncPhysicsToScene (): void {
        this.getPosition(v3_0);
        v3_0.subtract(this.scaledCenter);
        this._comp.node.setWorldPosition(v3_0);
    }

    syncScale (): void {
        this.updateScale();
    }

    get scaledCenter (): Vec3 {
        Vec3.multiply(v3_1, this._comp.center, this._comp.node.worldScale);
        return v3_1;
    }

    move (movement: IVec3Like, minDist: number, elapsedTime: number): void {
        if (!this._isEnabled) { return; }
        const movementBT = BulletCache.instance.BT_V3_0;
        bt.Vec3_set(movementBT, movement.x, movement.y, movement.z);
        this._btCollisionFlags = bt.CharacterController_move(this.impl, movementBT, minDist, elapsedTime);
    }

    setGroup (v: number): void {
        if (v !== this._collisionFilterGroup) {
            this._collisionFilterGroup = v;
            this._dirty = true;
        }
    }

    getGroup (): number {
        return this._collisionFilterGroup;
    }

    addGroup (v: number): void {
        this._collisionFilterGroup |= v;
        this._dirty = true;
    }

    removeGroup (v: number): void {
        this._collisionFilterGroup &= ~v;
        this._dirty = true;
    }

    setMask (v: number): void {
        if (v !== this._collisionFilterMask) {
            this._collisionFilterMask = v;
            this._dirty = true;
        }
    }

    getMask (): number {
        return this._collisionFilterMask;
    }

    addMask (v: number): void {
        this._collisionFilterMask |= v;
        this._dirty = true;
    }

    removeMask (v: number): void {
        this._collisionFilterMask &= ~v;
        this._dirty = true;
    }

    updateEventListener (): void {
        this.wrappedWorld.updateNeedEmitCCTEvents(this.characterController.needCollisionEvent);
    }

    // update group and mask by re-adding cct to physics world
    updateDirty (): void {
        if (this._dirty) {
            (PhysicsSystem.instance.physicsWorld as BulletWorld).removeCCT(this);
            (PhysicsSystem.instance.physicsWorld as BulletWorld).addCCT(this);
            this._dirty = false;
        }
    }

    onShapeHitExt (hit: number): void {
        const shapePtr = bt.ControllerShapeHit_getHitShape(hit);
        const bulletWorld = (PhysicsSystem.instance.physicsWorld as BulletWorld);
        //use characterController impl and shape impl pair as key
        let item = bulletWorld.cctShapeEventDic.get<any>(this.impl, shapePtr);
        const worldPos = new Vec3();
        bullet2CocosVec3(worldPos, bt.ControllerHit_getHitWorldPos(hit));
        const worldNormal = new Vec3();
        bullet2CocosVec3(worldNormal, bt.ControllerHit_getHitWorldNormal(hit));
        const motionDir = new Vec3();
        bullet2CocosVec3(motionDir, bt.ControllerHit_getHitMotionDir(hit));
        const motionLength = bt.ControllerHit_getHitMotionLength(hit);
        const s: BulletShape = BulletCache.getWrapper(shapePtr, BulletShape.TYPE);
        if (s) {
            item = bulletWorld.cctShapeEventDic.set(
                this.impl,
                shapePtr,
                { BulletCharacterController: this, BulletShape: s, worldPos, worldNormal, motionDir, motionLength },
            );
        }
    }
}
