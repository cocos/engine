/**
 * @hidden
 */

import { Vec3 } from '../../core/math';
import { BoxShape, PhysicsWorld, RigidBody, SphereShape, CapsuleShape, TrimeshShape } from './physics-selector';
import { IRigidBody } from '../spec/i-rigid-body';
import { IBoxShape, ISphereShape, ICapsuleShape, ITrimeshShape } from '../spec/i-physics-shape';
import { IPhysicsWorld } from '../spec/i-physics-world';
import { warn, error } from '../../core';
import { EDITOR, DEBUG, PHYSICS_BUILTIN, PHYSICS_AMMO, TEST, PHYSICS_CANNON } from 'internal:constants';

export function createPhysicsWorld (): IPhysicsWorld {
    if (DEBUG && checkPhysicsModule(PhysicsWorld)) { return null as any; }
    return new PhysicsWorld() as IPhysicsWorld;
}

export function createRigidBody (): IRigidBody {
    if (DEBUG && checkPhysicsModule(RigidBody)) { return null as any; }
    return new RigidBody() as IRigidBody;
}

export function createBoxShape (size: Vec3): IBoxShape {
    if (DEBUG && checkPhysicsModule(BoxShape)) { return null as any; }
    return new BoxShape(size) as IBoxShape;
}

export function createSphereShape (radius: number): ISphereShape {
    if (DEBUG && checkPhysicsModule(SphereShape)) { return null as any; }
    return new SphereShape(radius) as ISphereShape;
}

export function createCapsuleShape (radius = 0.5, height = 2, dir = 1): ICapsuleShape {
    if (PHYSICS_BUILTIN || PHYSICS_AMMO) {
        if (DEBUG && checkPhysicsModule(CapsuleShape)) { return null as any; }
        return new CapsuleShape(radius, height, dir) as ICapsuleShape;
    } else {
        warn('[Physics]: Currently cannon.js unsupport capsule collider');
        /** apater */
        return {
            radius: radius, height: height, direction: dir,
            material: null,
            isTrigger: false,
            center: new Vec3(),
            __preload: () => { },
            onLoad: () => { },
            onEnable: () => { },
            onDisable: () => { },
            onDestroy: () => { }
        } as any
    }
}

export function createTrimeshShape (): ITrimeshShape {
    if (PHYSICS_CANNON || PHYSICS_AMMO) {
        if (DEBUG && checkPhysicsModule(TrimeshShape)) { return null as any; }
        return new TrimeshShape() as ITrimeshShape;
    } else {
        warn('[Physics]: Currently builtin unsupport mesh collider');
        /** apater */
        return {
            mesh: null,
            material: null,
            isTrigger: false,
            center: new Vec3(),
            __preload: () => { },
            onLoad: () => { },
            onEnable: () => { },
            onDisable: () => { },
            onDestroy: () => { }
        } as any
    }
}

export function checkPhysicsModule (obj: any) {
    if (DEBUG && !TEST && !EDITOR && obj == null) {
        error("[Physics]: Please check to see if physics modules are included.");
        return true;
    }
    return false;
}
