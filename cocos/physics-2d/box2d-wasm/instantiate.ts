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

import { BUILD, LOAD_BOX2D_MANUALLY } from 'internal:constants';
import { selector } from '../framework/physics-selector';
import { B2PhysicsWorld } from './physics-world';
import { B2RigidBody2D } from './rigid-body';
import { B2BoxShape } from './shapes/box-shape-2d';
import { B2CircleShape } from './shapes/circle-shape-2d';
import { B2PolygonShape } from './shapes/polygon-shape-2d';
import { B2MouseJoint } from './joints/mouse-joint';
import { B2DistanceJoint } from './joints/distance-joint';
import { B2SpringJoint } from './joints/spring-joint';
import { B2RelativeJoint } from './joints/relative-joint';
import { B2SliderJoint } from './joints/slider-joint';
import { B2FixedJoint } from './joints/fixed-joint';
import { B2WheelJoint } from './joints/wheel-joint';
import { B2HingeJoint } from './joints/hinge-joint';

import { Game, game } from '../../game';
import { waitForBox2dWasmInstantiation } from './instantiated';
import { PhysicsSystem2D } from '../framework';

game.once(Game.EVENT_PRE_SUBSYSTEM_INIT, () => {
    selector.register('box2d-wasm', {
        PhysicsWorld: B2PhysicsWorld,
        RigidBody: B2RigidBody2D,

        BoxShape: B2BoxShape,
        CircleShape: B2CircleShape,
        PolygonShape: B2PolygonShape,

        MouseJoint: B2MouseJoint,
        DistanceJoint: B2DistanceJoint,
        SpringJoint: B2SpringJoint,
        RelativeJoint: B2RelativeJoint,
        SliderJoint: B2SliderJoint,
        FixedJoint: B2FixedJoint,
        WheelJoint: B2WheelJoint,
        HingeJoint: B2HingeJoint,
    });
});

let loadBox2dPromise: Promise<void> | undefined;

export function loadWasmModuleBox2D (): Promise<void> {
    if (BUILD && LOAD_BOX2D_MANUALLY) {
        if (loadBox2dPromise) return loadBox2dPromise;
        loadBox2dPromise = Promise.resolve()
            .then(() => waitForBox2dWasmInstantiation())
            .then(() => PhysicsSystem2D.constructAndRegister());
        return loadBox2dPromise;
    } else {
        return Promise.resolve();
    }
}
