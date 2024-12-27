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

import { selector } from '../framework/physics-selector';
import { b2PhysicsWorld } from './physics-world';
import { b2RigidBody2D } from './rigid-body';
import { b2BoxShape } from './shapes/box-shape-2d';
import { b2CircleShape } from './shapes/circle-shape-2d';
import { b2PolygonShape } from './shapes/polygon-shape-2d';
import { b2MouseJoint } from './joints/mouse-joint';
import { b2DistanceJoint } from './joints/distance-joint';
import { b2SpringJoint } from './joints/spring-joint';
import { b2RelativeJoint } from './joints/relative-joint';
import { b2SliderJoint } from './joints/slider-joint';
import { b2FixedJoint } from './joints/fixed-joint';
import { b2WheelJoint } from './joints/wheel-joint';
import { b2HingeJoint } from './joints/hinge-joint';

import { Game, game } from '../../game';

game.once(Game.EVENT_PRE_SUBSYSTEM_INIT, () => {
    selector.register('box2d', {
        PhysicsWorld: b2PhysicsWorld,
        RigidBody: b2RigidBody2D,

        BoxShape: b2BoxShape,
        CircleShape: b2CircleShape,
        PolygonShape: b2PolygonShape,

        MouseJoint: b2MouseJoint,
        DistanceJoint: b2DistanceJoint,
        SpringJoint: b2SpringJoint,
        RelativeJoint: b2RelativeJoint,
        SliderJoint: b2SliderJoint,
        FixedJoint: b2FixedJoint,
        WheelJoint: b2WheelJoint,
        HingeJoint: b2HingeJoint,
    });
});
