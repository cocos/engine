import { director, game, Game } from "../../cocos/game";
import Utils from "./utilis";
import * as physics2d from "../../exports/physics-2d-framework";
import { Node, Scene } from "../../cocos/scene-graph";

import "../../exports/physics-2d-box2d-wasm";
import "../../exports/physics-2d-box2d";
import "../../exports/physics-2d-builtin";
import { waitForBox2dWasmInstantiation } from "../../cocos/physics-2d/box2d-wasm/instantiated";

import RigidBodyTest from "./rigid-body";
import ColliderTest from "./collider"; 
import SceneQueryTest from "./scene-query";
import EventTest from "./events";

game.emit(Game.EVENT_PRE_SUBSYSTEM_INIT);
physics2d.PhysicsSystem2D.constructAndRegister();

beforeAll(async () => {
    await waitForBox2dWasmInstantiation();
});

test(`physics2d test | utils`, done => {
    Utils();
    done();
});

for (const id in physics2d.selector.backend) {
    test(`physics2d test | ${id}`, done => {
        // init test scene (which will also immediately destroy the previous test scene)
        const scene = new Scene('test-' + id);
        director.runSceneImmediate(scene);

        // switch to backend after the previous scene is immediately destroyed
        physics2d.selector.switchTo(id);
        expect(physics2d.selector.id).toBe(id);

        const temp0 = new Node();
        scene.addChild(temp0);

        //test rigid body
        RigidBodyTest(temp0);

        //test collider
        ColliderTest(temp0);

        //test scene query
        SceneQueryTest(temp0);

        //test events
        EventTest(temp0);

        // destroy test scene
        temp0.destroy();
        scene.destroy();
        // all works done
        done();
    })
}