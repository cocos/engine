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
import { getWrapShape, PX, _trans } from '../physx-adapter';
import { PhysXWorld } from '../physx-world';
import { PhysXShape } from '../shapes/physx-shape';
import { degreesToRadians } from '../../../core/utils/misc';
import { TransformBit } from '../../../scene-graph';

const v3_0 = new Vec3(0, 0, 0);
const v3_1 = new Vec3(0, 0, 0);

/** @mangle */
export class PhysXCharacterController implements IBaseCharacterController {
    private _isEnabled = false;
    protected _impl: any = null;
    protected _comp: CharacterController = null as any;
    private _pxCollisionFlags = 0;//: PX.PxControllerCollisionFlags;
    private _filterData: any;
    private _queryFilterCB: any = null;
    protected _word3 = 0;
    protected _overlapRecovery = true;

    readonly id: number;
    private static idCounter = 0;

    get isEnabled (): boolean { return this._isEnabled; }
    get impl (): any {
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        return this._impl;
    }
    get characterController (): CharacterController { return this._comp; }

    get filterData (): any {
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        return this._filterData;
    }

    get queryFilterCB (): any {
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        return this._queryFilterCB;
    }

    constructor () {
        this.id = PhysXCharacterController.idCounter++;
        this._filterData = { word0: 1, word1: 1, word2: 1, word3: 0 };
    }

    // virtual
    protected onComponentSet (): void { }
    protected create (): void { }
    protected updateScale (): void { }

    initialize (comp: CharacterController): boolean {
        this._comp = comp;

        this._queryFilterCB = PX.PxQueryFilterCallback.implement(PhysXCharacterController.queryCallback);

        const group = this._comp.group;
        this._filterData.word0 = this._comp.group;
        const mask = PhysicsSystem.instance.collisionMatrix[group];
        this._filterData.word1 = mask;

        this.onComponentSet();

        if (this._impl == null) {
            error('[Physics]: Initialize PhysXCharacterController Failed');
            return false;
        } else {
            return true;
        }
    }

    onEnable (): void {
        this._isEnabled = true;
        if (!this._impl) {
            this.onComponentSet();
        }
        this.setDetectCollisions(true);
        this.setOverlapRecovery(true);
        (PhysicsSystem.instance.physicsWorld as PhysXWorld).addCCT(this);
    }

    onDisable (): void {
        this._isEnabled = false;
        (PhysicsSystem.instance.physicsWorld as PhysXWorld).removeCCT(this);
        this.onDestroy();//to be optimized
    }

    onLoad (): void {

    }

    release (): void {
        if (this._impl) {
            if (this._impl.$$) {
                PX.IMPL_PTR[this._impl.$$.ptr] = null;
                delete PX.IMPL_PTR[this._impl.$$.ptr];
                const shapePtr = this._impl.getShape().$$.ptr;
                PX.IMPL_PTR[shapePtr] = null;
                delete PX.IMPL_PTR[shapePtr];
            }
            this._impl.release();
            this._impl = null;
        }
    }

    onDestroy (): void {
        this.release();
    }

    //world position of cct
    getPosition (out: IVec3Like): void {
        if (!this._impl) return;
        Vec3.copy(out, this._impl.getPosition());
    }

    setPosition (value: IVec3Like): void {
        if (!this._impl) return;
        this._impl.setPosition(value);
        this.syncPhysicsToScene();
    }

    setContactOffset (value: number): void {
        if (!this._impl) return;
        this._impl.setContactOffset(value);
    }

    setStepOffset (value: number): void {
        if (!this._impl) return;
        this._impl.setStepOffset(value);
    }

    setSlopeLimit (value: number): void {
        if (!this._impl) return;
        this._impl.setSlopeLimit(Math.cos(degreesToRadians(value)));
    }

    setDetectCollisions (value: boolean): void {
        if (!this._impl) return;
        this._impl.setCollision(value);
    }

    setQuery (value: boolean): void {
        if (!this._impl) return;
        this._impl.setQuery(value);
    }

    setOverlapRecovery (value: boolean): void {
        this._overlapRecovery = value;
    }

    onGround (): boolean {
        return (this._pxCollisionFlags & (1 << 2)) > 0;//PxControllerCollisionFlag::Enum::eCOLLISION_DOWN
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

    // eNONE = 0,   //!< the query should ignore this shape
    // eTOUCH = 1,  //!< a hit on the shape touches the intersection geometry of the query but does not block it
    // eBLOCK = 2   //!< a hit on the shape blocks the query (does not block overlap queries)
    static queryCallback = {
        preFilter (filterData: any, shape: any, _actor: any, _out: any): number {
            const pxShape = getWrapShape<PhysXShape>(shape);
            if (!pxShape) {
                return PX.QueryHitType.eNONE;
            }

            const collider = pxShape.collider;
            if (!(filterData.word0 & collider.getMask()) || !(filterData.word1 & collider.getGroup())) {
                return PX.QueryHitType.eNONE;
            }

            // Ignore trigger shape
            // this is done in physx::Cct::findTouchedGeometry
            // Ubi (EA) : Discarding Triggers
            // const shapeFlags = shape.getFlags();
            // if (shapeFlags.isSet(PX.ShapeFlag.eTRIGGER_SHAPE)) {
            //     return PX.QueryHitType.eNONE;
            // }

            return PX.QueryHitType.eBLOCK;
        },
    };

    move (movement: IVec3Like, minDist: number, elapsedTime: number): void {
        if (!this._isEnabled) { return; }
        (PhysicsSystem.instance.physicsWorld as PhysXWorld).controllerManager.setOverlapRecoveryModule(this._overlapRecovery);
        this._pxCollisionFlags = this._impl.move(movement, minDist, elapsedTime, this.filterData, this.queryFilterCB);
    }

    setGroup (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word0 = v;
        this.updateFilterData();
    }

    getGroup (): number {
        return this._filterData.word0;
    }

    addGroup (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word0 |= v;
        this.updateFilterData();
    }

    removeGroup (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word0 &= ~v;
        this.updateFilterData();
    }

    setMask (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word1 = v;
        this.updateFilterData();
    }

    getMask (): number {
        return this._filterData.word1;
    }

    addMask (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word1 |= v;
        this.updateFilterData();
    }

    removeMask (v: number): void {
        v >>>= 0; //convert to unsigned int(32bit) for physx
        this._filterData.word1 &= ~v;
        this.updateFilterData();
    }

    updateEventListener (): void {
        this.updateFilterData();
    }

    updateFilterData (): void {
        if (!this._impl) return;
        // this._impl.setQueryFilterData(filterData);//set inside move()
        this._impl.setSimulationFilterData(this.filterData);
    }
}
