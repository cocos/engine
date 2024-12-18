import { director, game } from "../../cocos/game";
import { scalableContainerManager } from "../../cocos/core/memop/scalable-container";
import { Node, Scene } from "../../cocos/scene-graph";
import { ParticleSystem } from "../../exports/particle";

test('recycle pool release', () => {
    const scene = new Scene('test-scene');
    director.runSceneImmediate(scene);
    const node = new Node();
    scene.addChild(node);
    game.step();
    // @ts-expect-error access private property 
    const beforeLength = scalableContainerManager._pools.length;
    const comp = node.addComponent(ParticleSystem);
    game.step();
    // @ts-expect-error access private property  
    const currentLength = scalableContainerManager._pools.length;
    expect(currentLength).toBeGreaterThan(beforeLength);
    comp.destroy();
    game.step();

    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBeLessThan(currentLength);
});