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

import { BUILD, LOAD_PHYSX_MANUALLY } from 'internal:constants';
import { selector } from '../framework/physics-selector';

import { PhysXWorld } from './physx-world';
import { PhysXRigidBody } from './physx-rigid-body';

import { PhysXSphereShape } from './shapes/physx-sphere-shape';
import { PhysXBoxShape } from './shapes/physx-box-shape';
import { PhysXCapsuleShape } from './shapes/physx-capsule-shape';
import { PhysXPlaneShape } from './shapes/physx-plane-shape';
import { PhysXTrimeshShape } from './shapes/physx-trimesh-shape';
import { PhysXTerrainShape } from './shapes/physx-terrain-shape';
import { PhysXCylinderShape } from './shapes/physx-cylinder-shape';
import { PhysXConeShape } from './shapes/physx-cone-shape';

import { PhysXFixedJoint } from './joints/physx-fixed-joint';
import { PhysXSphericalJoint } from './joints/physx-spherical-joint';
import { PhysXRevoluteJoint } from './joints/physx-revolute-joint';
import { PhysXConfigurableJoint } from './joints/physx-configurable-joint';

import { PhysXBoxCharacterController } from './character-controllers/physx-box-character-controller';
import { PhysXCapsuleCharacterController } from './character-controllers/physx-capsule-character-controller';

import { Game, game } from '../../game';
import { initPhysXLibs } from './physx-adapter';
import { PhysicsSystem } from '../framework/physics-system';

game.once(Game.EVENT_PRE_SUBSYSTEM_INIT, () => {
    selector.register('physx', {
        PhysicsWorld: PhysXWorld,
        RigidBody: PhysXRigidBody,

        BoxShape: PhysXBoxShape,
        SphereShape: PhysXSphereShape,
        CapsuleShape: PhysXCapsuleShape,
        TrimeshShape: PhysXTrimeshShape,
        CylinderShape: PhysXCylinderShape,
        ConeShape: PhysXConeShape,
        TerrainShape: PhysXTerrainShape,
        PlaneShape: PhysXPlaneShape,

        PointToPointConstraint: PhysXSphericalJoint,
        HingeConstraint: PhysXRevoluteJoint,
        FixedConstraint: PhysXFixedJoint,
        ConfigurableConstraint: PhysXConfigurableJoint,

        BoxCharacterController: PhysXBoxCharacterController,
        CapsuleCharacterController: PhysXCapsuleCharacterController,
    });
});

let loadPhysXPromise: Promise<void> | undefined;

export function loadWasmModulePhysX (): Promise<void> {
    if (BUILD && LOAD_PHYSX_MANUALLY) {
        if (loadPhysXPromise) return loadPhysXPromise;
        loadPhysXPromise = Promise.resolve()
            .then(() => initPhysXLibs())
            .then(() => PhysicsSystem.constructAndRegisterManually());
        return loadPhysXPromise;
    } else {
        return Promise.resolve();
    }
}
