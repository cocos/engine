import { director, game, Game } from "../../cocos/game";
import { physics, PhysicsMaterial, PhysicsSystem } from "../../exports/physics-framework";

import "../../exports/physics-physx";
import "../../exports/physics-builtin";
import "../../exports/physics-ammo";
import "../../exports/physics-cannon";
import { initPhysXLibs } from '../../cocos/physics/physx/physx-adapter';
import { waitForAmmoInstantiation } from "../../cocos/physics/bullet/instantiated";
import EventTest from "./event";
import RaycastTest from "./raycast";
import SweepTest from "./sweep";
import SleepTest from "./sleep";
import StableTest from "./stability";
import VolumeTest from "./volume";
import FilterTest from "./filtering";
import DynamicTest from "./dynamic";
import ConstraintTest from "./constraint";
import CharacterControllerTest from "./character-controller";
import { Node, Scene } from "../../cocos/scene-graph";
import { builtinResMgr } from "../../exports/base";

beforeAll(async () => {
    await waitForAmmoInstantiation();
    await initPhysXLibs();
});

game.emit(Game.EVENT_PRE_SUBSYSTEM_INIT);
// Manually construct and register the system
PhysicsSystem.constructAndRegister();
//Manual load default builtin physics material
const builtinMaterial = builtinResMgr.get<PhysicsMaterial>('default-physics-material');
PhysicsSystem.instance.setDefaultPhysicsMaterial(builtinMaterial);

test(`physics test | selector`, done => {
    physics.selector.switchTo('builtin');
    expect(physics.selector.id).toBe('builtin');
    done();
});

export interface PhysicsTestEnv {
    rootNode: Node;
    backendId: 'builtin' | 'physx' | 'bullet' | 'cannon.js';
}

describe.each(Object.keys(physics.selector.backend))(
    `Backend: %s`, (id) => {

    let scene!: Scene;
    let temp0!: Node;
    const env: PhysicsTestEnv = {
        backendId: id as PhysicsTestEnv['backendId'],
        get rootNode() {
            return temp0;
        },
    };

    beforeAll(() => {
        physics.selector.switchTo(id);
        expect(physics.selector.id).toBe(id);
    
        scene = new Scene('test');
        director.runSceneImmediate(scene);
    
        temp0 = new Node();
        scene.addChild(temp0);
    });

    afterAll(() => {
        scene.destroy();
    });

    afterEach(() => {
        temp0.destroyAllChildren();
        temp0.removeAllChildren();
    });

    EventTest(env);

    RaycastTest(env);

    SweepTest(env);

    if (id === 'builtin') {
        return;
    }

    SleepTest(env);

    StableTest(env);

    VolumeTest(env);

    FilterTest(env);

    DynamicTest(env);

    ConstraintTest(env);

    CharacterControllerTest(env);
});
