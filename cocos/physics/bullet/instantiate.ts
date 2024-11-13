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

import { BUILD, LOAD_BULLET_MANUALLY } from 'internal:constants';
import { Game, game } from '../../game';
import { selector } from '../framework/physics-selector';
import { BulletRigidBody } from './bullet-rigid-body';
import { BulletWorld } from './bullet-world';
import { BulletBoxShape } from './shapes/bullet-box-shape';
import { BulletSphereShape } from './shapes/bullet-sphere-shape';
import { BulletCapsuleShape } from './shapes/bullet-capsule-shape';
import { BulletTrimeshShape } from './shapes/bullet-trimesh-shape';
import { BulletCylinderShape } from './shapes/bullet-cylinder-shape';
import { BulletConeShape } from './shapes/bullet-cone-shape';
import { BulletTerrainShape } from './shapes/bullet-terrain-shape';
import { BulletSimplexShape } from './shapes/bullet-simplex-shape';
import { BulletPlaneShape } from './shapes/bullet-plane-shape';
import { BulletP2PConstraint } from './constraints/bullet-p2p-constraint';
import { BulletFixedConstraint } from './constraints/bullet-fixed-constraint';
import { BulletHingeConstraint } from './constraints/bullet-hinge-constraint';
import { BulletConfigurableConstraint } from './constraints/bullet-configurable-constraint';

import { BulletCapsuleCharacterController } from './character-controllers/bullet-capsule-character-controller';
import { BulletBoxCharacterController } from './character-controllers/bullet-box-character-controller';
import { waitForAmmoInstantiation } from './instantiated';
import { PhysicsSystem } from '../framework';

game.once(Game.EVENT_PRE_SUBSYSTEM_INIT, () => {
    selector.register('bullet', {
        PhysicsWorld: BulletWorld,
        RigidBody: BulletRigidBody,

        BoxShape: BulletBoxShape,
        SphereShape: BulletSphereShape,
        CapsuleShape: BulletCapsuleShape,
        TrimeshShape: BulletTrimeshShape,
        CylinderShape: BulletCylinderShape,
        ConeShape: BulletConeShape,
        TerrainShape: BulletTerrainShape,
        SimplexShape: BulletSimplexShape,
        PlaneShape: BulletPlaneShape,

        PointToPointConstraint: BulletP2PConstraint,
        HingeConstraint: BulletHingeConstraint,
        FixedConstraint: BulletFixedConstraint,
        ConfigurableConstraint: BulletConfigurableConstraint,

        BoxCharacterController: BulletBoxCharacterController,
        CapsuleCharacterController: BulletCapsuleCharacterController,
    });
});

let loadBulletPromise: Promise<void> | undefined;

export function loadWasmModuleBullet (): Promise<void> {
    if (BUILD && LOAD_BULLET_MANUALLY) {
        if (loadBulletPromise) return loadBulletPromise;
        loadBulletPromise = Promise.resolve()
            .then(() => waitForAmmoInstantiation())
            .then(() => PhysicsSystem.constructAndRegisterManually());
        return loadBulletPromise;
    } else {
        return Promise.resolve();
    }
}
