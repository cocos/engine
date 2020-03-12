/**
 * @hidden
 */

import { ILifecycle } from './i-lifecycle'
import { IGroupMask } from './i-group-mask'
import { IVec3Like } from '../../core/math/type-define';
import { ColliderComponent, RigidBodyComponent } from '../../../exports/physics-framework';
import { Mesh } from '../../core';

export interface IBaseShape extends ILifecycle, IGroupMask {
    readonly collider: ColliderComponent;
    readonly attachedRigidBody: RigidBodyComponent | null;
    material: any;
    isTrigger: boolean;
    center: IVec3Like;
}

export interface IBoxShape extends IBaseShape {
    size: IVec3Like;
}

export interface ISphereShape extends IBaseShape {
    radius: number;
}

export interface ICapsuleShape extends IBaseShape {
    radius: number;
    height: number;
    direction: number;
}

export interface ITrimeshShape extends IBaseShape {
    mesh: Mesh | null;
}