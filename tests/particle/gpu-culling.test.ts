import { director } from "../../cocos/game";
import { cclegacy } from "../../cocos/core";
import { ParticleSystem } from "../../exports/particle";
import { Node, Scene } from "../../cocos/scene-graph";

test('particle system gpu culling test', function () {
    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    const temp0 = new Node();
    scene.addChild(temp0);

    const particle = temp0.addComponent(ParticleSystem) as ParticleSystem;

    particle.renderCulling = true;
    particle.loop = false;
    particle.playOnAwake = true;
    particle.renderer.useGPU = true;

    cclegacy.game.step();

    expect(particle.aabbHalfX > 0 && particle.aabbHalfY > 0 && particle.aabbHalfZ > 0).toBeTruthy(); // ensure bounding box size > 0

    // @ts-expect-error
    expect(!particle._isSimulating).toBeTruthy(); // open culling, particle should be culled

    particle.renderCulling = false;

    cclegacy.game.step();

    // @ts-expect-error
    expect(particle._isSimulating).toBeTruthy(); // close culling, particle should continue simulating
});