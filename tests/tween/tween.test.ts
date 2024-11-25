import { Vec3, System, size, Size, approx, color, v3, lerp, EPSILON } from "../../cocos/core";
import { ITweenOption, ITweenCustomProperty, tween, Tween, TweenSystem, tweenProgress } from "../../cocos/tween";
import { Node, Scene } from "../../cocos/scene-graph";
import { Component } from "../../cocos/scene-graph/component";
import { game, director } from "../../cocos/game";
import { UITransform } from "../../cocos/2d/framework/ui-transform";
import { Canvas } from "../../cocos/2d/framework/canvas";
import { Batcher2D } from "../../cocos/2d/renderer/batcher-2d";
import { Label, UIOpacity } from "../../cocos/2d";
import { Sprite } from "../../cocos/2d";

function isSizeEqualTo(a: Size, b: Size) {
    return approx(a.width, b.width) && approx(a.height, b.height);
}

function runFrames(frames: number) {
    for (let i = 0; i < frames; ++i) {
        game.step();
    }
}

test('remove actions by tag', function () {
    const scene = new Scene('test-tags');
    const node = new Node();
    scene.addChild(node);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    director.runSceneImmediate(scene);

    tween(node).tag(1).repeat(10, tween<Node>().by(3, { scale : new Vec3(1, 1, 1) })).start();;
    tween(node).tag(1).repeat(10, tween<Node>().by(3, { position: new Vec3(10,10,0) })).start();

    Tween.stopAllByTag(1);

    expect(TweenSystem.instance.ActionManager.getActionByTag(1, node)).toBeNull();
});

test('destroySelf', function () {
    const scene = new Scene('test-destroy');
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    director.runSceneImmediate(scene);

    const node = new Node();
    var comp = node.addComponent(Component);
    const onDestroy = (comp as any).onDestroy = jest.fn(() => {});
    scene.addChild(node);
    tween(node).destroySelf().start();
    game.step();
    expect(onDestroy).toBeCalledTimes(1);
    director.unregisterSystem(sys);
});

test('to/by ITweenOption no type', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const opt: ITweenOption = {
        progress(start, end, current, ratio): number {
            return lerp(start, end, ratio);
        },
    };

    tween(node).to(1, { position: v3(90, 0, 0) }, opt).start();
    tween(node).by(1, { position: v3(90, 0, 0) }, opt).start();

    director.unregisterSystem(sys);
});

test('different targets in parallel', function () {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isContentSizeTweenComplete = false;

    // test begin
    tween(node)
        .parallel(
            tween(node).to(1, { position: new Vec3(100, 100, 0) }, {
                onComplete: () => {
                    isPositionTweenComplete = true;
                }
            }).call((target) => {
                expect(target === node).toBeTruthy();
            }),
            tween(node.getComponent(UITransform) as UITransform).to(1, { contentSize: size(100, 100) }, {
                onComplete: () => {
                    isContentSizeTweenComplete = true;
                }
            }).call((target) => {
                expect(target === spUitrs).toBeTruthy();
            }),
        )
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();

    // complete
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();

    expect(isPositionTweenComplete).toBeTruthy();;
    expect(isContentSizeTweenComplete).toBeTruthy();;

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in sequence', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isContentSizeTweenComplete = false;

    // test begin
    tween(node)
        .sequence(
            tween(node).to(1, { position: new Vec3(100, 100, 0) }, {
                onComplete: () => {
                    isPositionTweenComplete = true;
                }
            }).call((target) => {
                expect(target === node).toBeTruthy();
            }),
            tween(node.getComponent(UITransform) as UITransform).to(1, { contentSize: size(100, 100) }, {
                onComplete: () => {
                    isContentSizeTweenComplete = true;
                }
            }).call((target) => {
                expect(target === spUitrs).toBeTruthy();
            }),
        ).call((target) => {
            expect(target).toEqual(node);
        })
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();
    expect(isPositionTweenComplete).toBeTruthy();
    expect(isContentSizeTweenComplete).toBeFalsy();

    // Do content size tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    // Float value is 99.99999999999977, it's approximately equal to 100 but doesn't reach,
    // so bellow we need to step once more to make the tween complete.
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(100, 100))).toBeTruthy();
    
    game.step();
    expect(isContentSizeTweenComplete).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in then', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isContentSizeTweenComplete = false;

    // test begin
    tween(node).to(1, { position: new Vec3(100, 100, 0) }, {
        onComplete: () => {
            isPositionTweenComplete = true;
        }
    }).call((target) => {
        expect(target === node).toBeTruthy();
    }).then(
        tween(node.getComponent(UITransform) as UITransform).to(1, { contentSize: size(100, 100) }, {
            onComplete: () => {
                isContentSizeTweenComplete = true;
            }
        }).call((target) => {
            expect(target === spUitrs).toBeTruthy();
        })
    ).start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();
    expect(isPositionTweenComplete).toBeTruthy();
    expect(isContentSizeTweenComplete).toBeFalsy();

    // Do content size tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    // Float value is 99.99999999999977, it's approximately equal to 100 but doesn't reach,
    // so bellow we need to step once more to make the tween complete.
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(100, 100))).toBeTruthy();
    
    game.step();
    expect(isContentSizeTweenComplete).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in clone/then', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isContentSizeTweenComplete1 = false;
    let isContentSizeTweenComplete2 = false;

    const uiTransformTween1 = tween().to(1, { contentSize: size(100, 100) }, {
        onComplete: () => {
            isContentSizeTweenComplete1 = true;
        }
    }).call((target) => {
        expect(target === spUitrs).toBeTruthy();
    })

    const uiTransformTween2 = tween().to(1, { contentSize: size(0, 0) }, {
        onComplete: () => {
            isContentSizeTweenComplete2 = true;
        }
    }).call((target) => {
        expect(target === spUitrs).toBeTruthy();
    })

    // test begin
    tween(node)
        .to(1, { position: new Vec3(100, 100, 0) }, {
            onComplete: () => {
                isPositionTweenComplete = true;
            }
        })
        .call((target) => {
            expect(target === node).toBeTruthy();
        })
        .then(uiTransformTween1.clone(spUitrs))
        .then(uiTransformTween2.clone(spUitrs))
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();
    expect(isPositionTweenComplete).toBeTruthy();
    expect(isContentSizeTweenComplete1).toBeFalsy();
    expect(isContentSizeTweenComplete2).toBeFalsy();

    // Do content size to tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    // Float value is 99.99999999999977, it's approximately equal to 100 but doesn't reach,
    // so bellow we need to step once more to make the tween complete.
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(100, 100))).toBeTruthy();
    
    game.step();
    expect(isContentSizeTweenComplete1).toBeTruthy();

    // Do content size (0, 0) tween 
    for (let i = 0; i < 19; ++i) { // We do an extra step above, so 19 here.
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    // Float value is 99.99999999999977, it's approximately equal to 100 but doesn't reach,
    // so bellow we need to step once more to make the tween complete.
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();
    
    game.step();
    expect(isContentSizeTweenComplete2).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in clone2', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node1 = new Node();
    node1.setScale(0, 0, 0);
    const node2 = new Node();
    node2.setScale(0, 0, 0);
    const moveTween = tween(node1)
        .to(1, { position: new Vec3(100, 100, 0) })
        .tag(100)
        .start();

    // test begin
    moveTween
        .clone(node2)
        .to(1, { scale: new Vec3(10, 10, 10) })
        .tag(200)
        .start();

    // 1s
    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node1.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(node1.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    expect(node2.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node1.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(node1.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    expect(node2.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node1.position.equals(new Vec3(3.0/3.0*100, 3.0/3.0*100, 0))).toBeTruthy();
    expect(node1.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    expect(node2.position.equals(new Vec3(3.0/3.0*100, 3.0/3.0*100, 0))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // 2s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node1.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in re-target', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    scene.addChild(node);

    let isPositionTweenComplete = false;

    // test begin
    tween()
        .to(1, { position: new Vec3(100, 100, 0) }, {
            onComplete: () => {
                isPositionTweenComplete = true;
            }
        })
        .call((target) => {
            expect(target === node).toBeTruthy();
        })
        .target(node)
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isPositionTweenComplete).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target in nest sequence 1', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    node.setScale(0, 0, 0);
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(100, 100);
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isScaleTweenComplete = false;

    // test begin
    tween(node)
        .to(1, { position: new Vec3(100, 100, 0) }, { // 1s
            onComplete: () => {
                isPositionTweenComplete = true;
            }
        })
        .sequence(
            tween().parallel(
                tween().sequence(
                    tween(node).to(1, { scale: new Vec3(10, 10, 10) }, {
                        onComplete(target) {
                            isScaleTweenComplete = true;
                        },
                    }), // 2s
                    tween(spUitrs).to(1, { contentSize: new Size(100, 100) }, {
                        onStart(target) {
                            expect(target === spUitrs).toBeTruthy();
                                                    },
                        onComplete(target) {
                            expect(target === spUitrs).toBeTruthy();
                        },
                    }).call((target?: UITransform)=>{
                        expect(target == spUitrs).toBeTruthy();
                    }), // 3s
                    tween(node).to(1, { scale: new Vec3(0, 0, 0) })  // 4s
                ),
                tween(spUitrs).to(1, { contentSize: new Size(0, 0) }) // 2s
            ),
            tween(node).to(1, { angle: 90 }) // 5s
        )
        .call((target) => {
            expect(target === node).toBeTruthy();
        })
        .start();

    // 1s
    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isPositionTweenComplete).toBeTruthy();

    // 2s
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(1.0/2.0*10, 1.0/2.0*10, 1.0/2.0*10))).toBeTruthy();
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy(); // 9.999999999999979, need to do a more step to make the action complete
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(0, 0))).toBeTruthy();

    game.step();
    expect(isScaleTweenComplete).toBeTruthy();
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy(); // 9.999999999999979, need to do a more step to make the action complete
    // 3s
    for (let i = 0; i < 59; ++i) { // We did an extra step above, so only 59 needed.
        game.step();
    }
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(100, 100))).toBeTruthy();
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();

    // 4s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    expect(node.angle).toBe(0);

    // 5s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(approx(node.angle, 90)).toBeTruthy();

    // test end
    director.unregisterSystem(sys);
});

test('Test different target and union', function() {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    // test begin
    const rootTarget = { position: new Vec3() };
    const uiTransformTarget = { contentSize: new Size() };

    tween(rootTarget)
        .parallel(
            tween(rootTarget).by(1, { position: new Vec3(100, 100, 100) }, {
                onStart(target) {
                    expect(target === rootTarget).toBeTruthy();
                },
            }),
            tween(uiTransformTarget).by(1, { contentSize: new Size(100, 100) }, {
                onStart(target) {
                    expect(target === uiTransformTarget).toBeTruthy();
                },
            }),
        )
        .union()
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(new Vec3(1.0/3.0*100, 1.0/3.0*100, 1.0/3.0*100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }

    expect(new Vec3(2.0/3.0*100, 2.0/3.0*100, 2.0/3.0*100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }

    expect(new Vec3(100, 100, 100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(100, 100))).toBeTruthy();
    
    // test end
    director.unregisterSystem(sys);
});

test('Test different target, union, repeat with embed tween', function() {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    // test begin
    const rootTarget = { position: new Vec3() };
    const uiTransformTarget = { contentSize: new Size() };

    const t = tween(rootTarget).parallel(
        tween(rootTarget).by(1, { position: new Vec3(100, 100, 100) }, {
            onStart(target) {
                expect(target === rootTarget).toBeTruthy();
            },
        }),
        tween(uiTransformTarget).by(1, { contentSize: new Size(100, 100) }, {
            onStart(target) {
                expect(target === uiTransformTarget).toBeTruthy();
            },
        }),
    ).union();

    tween(rootTarget).repeat(2, t).start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(new Vec3(1.0/3.0*100, 1.0/3.0*100, 1.0/3.0*100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }

    expect(new Vec3(2.0/3.0*100, 2.0/3.0*100, 2.0/3.0*100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    // complete position tween
    for (let i = 0; i < 20; ++i) {
        game.step();
    }

    expect(new Vec3(100, 100, 100).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(100, 100))).toBeTruthy();

    // 2s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(new Vec3(200, 200, 200).equals(rootTarget.position)).toBeTruthy();
    expect(isSizeEqualTo(uiTransformTarget.contentSize, new Size(200, 200))).toBeTruthy();
    
    // test end
    director.unregisterSystem(sys);
});

test('Test different target in nest sequence 2', function() {
    // @ts-expect-error
    director.root!._batcher = new Batcher2D(director.root!);

    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene = new Scene('test');
    director.runSceneImmediate(scene);

    let canvasNode = new Node("Canvas");
    scene.addChild(canvasNode);
    let canvas = canvasNode.addComponent(Canvas) as Canvas;
    let uitrs = canvasNode.addComponent(UITransform) as UITransform;
    uitrs.contentSize = new Size(100, 100);

    const node = new Node();
    node.setScale(0, 0, 0);
    let spUitrs = node.addComponent(UITransform) as UITransform;
    spUitrs.contentSize = new Size(0, 0);
    let uiOpacity = node.addComponent(UIOpacity) as UIOpacity;
    scene.addChild(node);

    let isPositionTweenComplete = false;
    let isScaleTweenComplete = false;
    let isContentSizeTweenComplete = false;

    // test begin
    tween(node)
        .parallel(
            tween().parallel(
                tween().parallel(
                    tween().parallel(
                        tween().parallel(
                            tween().parallel(
                                tween(node).to(1, { position: new Vec3(100, 100, 0) }, {
                                    onComplete: () => {
                                        isPositionTweenComplete = true;
                                    }
                                }).call((target) => {
                                    expect(target === node).toBeTruthy();
                                }),
                                tween(spUitrs).to(1, { contentSize: size(100, 100) }, {
                                    onComplete: (target?: UITransform): void => {
                                        isContentSizeTweenComplete = true;
                                    }
                                }).call((target) => {
                                    expect(target === spUitrs).toBeTruthy();
                                }),
                            ),
                            tween(uiOpacity).to(1, { opacity: 255 })
                        ),
                        tween(uiOpacity).to(1, { opacity: 0 })
                    ),
                    tween(uiOpacity).to(1, { opacity: 255 })
                ),
                tween(uiOpacity).to(1, { opacity: 0 })
            ),
            tween(uiOpacity).to(1, { opacity: 255 })
        )
        .start();

    // The first step is from 0, so we need to add one more frame to make the action run to 1/3 time.
    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    // 2/3 time
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 0))).toBeTruthy();
    expect(approx(spUitrs.contentSize.width, 2.0/3.0*100)).toBeTruthy();

    // complete
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 0))).toBeTruthy();
    expect(isSizeEqualTo(spUitrs.contentSize, new Size(100, 100))).toBeTruthy();

    expect(isPositionTweenComplete).toBeTruthy();;
    expect(isContentSizeTweenComplete).toBeTruthy();;

    // test end
    director.unregisterSystem(sys);
});

test('Test one action in sequence and parallel', function() {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    let completed = false;
    const target = { color: [255, 255, 255, 255] };

    const subTween1 = tween(target).to(1, { color: [0, 0, 0, 0] }, {
        onStart(t?: typeof target) {
            expect(t === target).toBeTruthy();
        },
        onComplete(t?: typeof target): void {
            if (!t) return;
            expect(t.color[0]).toBe(0);
            expect(t.color[1]).toBe(0);
            expect(t.color[2]).toBe(0);
            expect(t.color[3]).toBe(0);
            completed = true;
        },
    });
    const subTweenArray1 = [subTween1];

    tween({})
        .sequence(...subTweenArray1)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(completed).toBeTruthy();
    expect(subTweenArray1.length === 1);

    const subTween2 = tween(target).to(1, { color: [255, 255, 255, 255] }, {
        onStart(t?: typeof target) {
            expect(t === target).toBeTruthy();
        },
        onComplete(t?: typeof target): void {
            if (!t) return;
            expect(t.color[0]).toBe(255);
            expect(t.color[1]).toBe(255);
            expect(t.color[2]).toBe(255);
            expect(t.color[3]).toBe(255);
            completed = true;
        },
    });
    const subTweenArray2 = [subTween2];

    completed = false;
    tween({})
        .parallel(...subTweenArray2)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(completed).toBeTruthy();

    director.unregisterSystem(sys);
});

test('Test empty action in sequence and parallel', function() {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    tween({})
        .sequence()
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    tween({})
        .parallel()
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }

    director.unregisterSystem(sys);
});

test('sequence', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const target = new Vec3(10, 20, 30);
    const tweenact = tween(node).to(1, {position: target}, { easing: "bounceOut" });
    tween(node).sequence(tweenact).start();

    for (let i = 0; i < 100; ++i) {
        game.step();
    }
    // @ts-expect-error access private property 
    const action = tweenact._actions[0] as TweenAction;
    const props = action._props;
    for (const property in props) {
        const prop = props[property];
        expect(Vec3.equals(prop.current, target)).toBeTruthy();
    }

    director.unregisterSystem(sys);
});

test('reverseTime', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    let completed = false;
    const node = new Node();
    tween(node)
        .to(1, { position: new Vec3(100, 100, 100) }, {
            onStart(target?: Node) {
                if (!target) return;
                expect(target.position.equals(new Vec3(100, 100, 100)));
            },
            onComplete() {
                completed = true;    
            },
        })
        .reverseTime()
        .start()

    for (let i = 0; i < 21; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(2.0/3.0*100, 2.0/3.0*100, 2.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(1.0/3.0*100, 1.0/3.0*100, 1.0/3.0*100))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    expect(completed).toBeTruthy();

    director.unregisterSystem(sys);
});

test('tween color', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const sprite: Sprite = node.addComponent(Sprite);
    sprite.color.set(255, 255, 255, 255);

    let isComplete = false;
    const t = tween(node.getComponent(Sprite) as Sprite)
        .to(1, { color: color(0, 0, 0, 0) }, {
            onComplete (target?: object) {
                isComplete = true;
            },

        })
        .start();

    // Pass 1/3 time, 255 get 174 remain: 255 * (1 - 1/3 + 1/60) = 174.24 ≈ 174
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(sprite.color.equals(color(174, 174, 174, 174))).toBeTruthy();

    // Pass 2/3 time, 255 get 89 remain: 255 * (1 - 2/3 + 1/60) = 89.24 ≈ 89
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(sprite.color.equals(color(89, 89, 89, 89))).toBeTruthy();

    // Pass the whole time, 255 get 4 remain: 255 * (1 - 1 + 1/60) = 4.25 ≈ 4
    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(sprite.color.equals(color(4, 4, 4, 4))).toBeTruthy();

    // Do the last step
    game.step();
    expect(sprite.color.equals(color(0, 0, 0, 0))).toBeTruthy();
    expect(isComplete).toBeTruthy();;

    director.unregisterSystem(sys);
});

test('reverse()', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node).by(1, { position: new Vec3(100, 0, 0) }).reverse();

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .then(t)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse(t) 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node).by(1, { position: new Vec3(100, 0, 0) });

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse(t) 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(0.5, { position: new Vec3(50, 0, 0) })
        .by(0.5, { position: new Vec3(50, 0, 0) });

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse(t, -1) not found id', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node).by(1, { position: new Vec3(100, 0, 0) });

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t, -1)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    // reverse(t, -1) failed, so the position will not be changed.
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse(t, -1) found id -1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node).by(1, { position: new Vec3(100, 0, 0) }).id(-1);

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t, -1)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});


test('reverse action in tween with id 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(1, { position: new Vec3(100, 0, 0) }).id(123)
        .to(1, { position: new Vec3(1000, 0, 0) });

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t, 123)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse action in tween with id 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .parallel(
            tween(node).sequence(
                tween(node).by(1, { position: new Vec3(100, 0, 0) }).id(123),
                tween(node).to(1, { position: new Vec3(1000, 0, 0) }),
            ),
            tween(node).delay(1),
        )
        

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t, 123)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse cloned action in tween with id', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(1, { position: new Vec3(100, 0, 0) }).id(123)
        .to(1, { position: new Vec3(1000, 0, 0) })
        .clone();

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) })
        .reverse(t, 123)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(150, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse action in current tween with id', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node)
        .to(1, { scale: new Vec3(10, 10, 10) })
        .by(1, { position: new Vec3(200, 0, 0) }).id(123)
        .delay(1)
        .reverse(123)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();
    
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    // delay 1s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }

    //
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('reverse unsupported action', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node).to(1, { position: new Vec3(100, 0, 0) }).reverse();
    const t2 = tween(node)
        .to(1, { position: new Vec3(100, 0, 0) }).id(456)
        .by(1, { position: new Vec3(100, 0, 0) });

    tween(node)
        .to(1, { position: new Vec3(200, 0, 0) }).id(123)
        .then(t)
        .reverse(123)
        .reverse(t2, 456)
        .start();
    
    for (let i = 0; i < 31; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    for (let j = 0; j < 2; ++j) {
        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();
    }

    director.unregisterSystem(sys);
});

test('reverse sequence with call', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const result = [0, 0, 0, 0];
    let index = 0;

    const t = tween(node)
        .call((target?: Node, data?: number)=>{
            if (target === undefined || data === undefined) 
                return;

            expect(node === target).toBeTruthy();
            expect(data === 300).toBeTruthy();
            result[index] = 300;
            ++index;
        }, null, 300)
        .by(1, { position: new Vec3(100, 0, 0) })
        .call((target?: Node, data?: number)=>{
            if (target === undefined || data === undefined) 
                return;

            expect(node === target).toBeTruthy();
            expect(data === 400).toBeTruthy();
            result[index] = 400;
            ++index;
        }, null, 400)
        .delay(1)
    ;

    tween(node)
        .then(t)
        .then(t.reverse())
        .start();
    

    game.step();
    expect(result[0]).toStrictEqual(300);
    expect(result[1]).toStrictEqual(0);
    expect(result[2]).toStrictEqual(0);
    expect(result[3]).toStrictEqual(0);


    // --->
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    expect(result[0]).toStrictEqual(300);
    expect(result[1]).toStrictEqual(400);
    expect(result[2]).toStrictEqual(0);
    expect(result[3]).toStrictEqual(0);

    // delay 2s
    for (let i = 0; i < 120; ++i) {
        game.step();
    }

    expect(result[0]).toStrictEqual(300);
    expect(result[1]).toStrictEqual(400);
    expect(result[2]).toStrictEqual(0);
    expect(result[3]).toStrictEqual(0);

    // <---
    for (let i = 0; i < 30; ++i) {
        game.step();
        if (index === 0) {
            expect(result[0]).toStrictEqual(300);
            expect(result[1]).toStrictEqual(400);
            expect(result[2]).toStrictEqual(400);
            expect(result[3]).toStrictEqual(0);
        }
    }
    expect(node.position.equals(new Vec3(50, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // Make one more step to make the call invoked.
    game.step();
    
    expect(result[0]).toStrictEqual(300);
    expect(result[1]).toStrictEqual(400);
    expect(result[2]).toStrictEqual(400);
    expect(result[3]).toStrictEqual(300);

    expect(result.length === 4).toBeTruthy();

    director.unregisterSystem(sys);
});

test('union from id', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node)
        .to(1, { scale: new Vec3(10, 10, 10) })
        .by(1, { position: new Vec3(200, 0, 0) }).id(123)
        .delay(1)
        .reverse(123)
        .union(123)
        .repeat(3)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();
    
    for (let j = 0; j < 3; ++j) {
        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

        // delay 1s
        for (let i = 0; i < 60; ++i) {
            game.step();
        }

        //
        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

        for (let i = 0; i < 30; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    }

    director.unregisterSystem(sys);
});

test('union from id (-1) not found', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node)
        .to(1, { scale: new Vec3(10, 10, 10) })
        .by(1, { position: new Vec3(200, 0, 0) }).id(123)
        .delay(1)
        .reverse(123)
        .union(-1)
        .repeat(2)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();
    
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    // delay 1s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }

    //
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // reverse(123) again since union failed!
    //
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-200, 0, 0))).toBeTruthy();


    director.unregisterSystem(sys);
});

test('union from id (-1) found', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node)
        .to(1, { scale: new Vec3(10, 10, 10) })
        .call(()=>{}).id(-1)
        .by(1, { position: new Vec3(200, 0, 0) }).id(123)
        .delay(1)
        .reverse(123)
        .union(-1)
        .repeat(2)
        .start();

    for (let i = 0; i < 61; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();
    
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    // delay 1s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }

    //
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // time 2
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(200, 0, 0))).toBeTruthy();

    // delay 1s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 0, 0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();


    director.unregisterSystem(sys);
});


test('timeScale test 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node)
        .to(1, { position: new Vec3(100, 100, 100) })
        .timeScale(0.5)
        .start();

    // Start
    game.step();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('timeScale test 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    node.setScale(0, 0, 0);

    const tPosition = tween(node).by(1, { position: new Vec3(100, 100, 100) });
    const tScale = tween(node).by(1, { scale: new Vec3(10, 10, 10) });

    tween(node)
        .then(tPosition)
        .then(tScale)
        .timeScale(0.5)
        .parallel(
            tPosition.reverse(),
            tScale.reverse(),
        )
        .sequence(
            tPosition.clone(),
            tScale.clone(),
        )
        .start();

    // Start
    game.step();

    // position
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

    // scale
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(2.5, 2.5, 2.5))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(5.0, 5.0, 5.0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(7.5, 7.5, 7.5))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();

    // parallel
    for (let i = 0; i < 120; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    expect(node.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

    // .sequence
    // position
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

    // scale
    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(2.5, 2.5, 2.5))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(5.0, 5.0, 5.0))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(7.5, 7.5, 7.5))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.scale.equals(new Vec3(10, 10, 10))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('timeScale * timeScale', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    node.setScale(0, 0, 0);

    let done = false;

    const t1 = tween(node)
        .parallel(
            tween(node)
                .by(1, { position: new Vec3(100, 100, 100) })
                .by(1, { position: new Vec3(100, 100, 100) }),
            tween(node)
                .by(1, { scale: new Vec3(2, 2, 2) })
                .delay(1)
        )
        .timeScale(0.5)
        .reverse();

    tween(node)
        .to(1, { position: new Vec3(100, 100, 100) })
        .then(t1)
        .timeScale(0.5)
        .call(()=>{
            done = true;
        })
        .start();

    // Start
    game.step();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    for (let i = 0; i < 30; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

    // 4s = 1s / (0.5 * 0.5), scale action will run after 4s
    expect(node.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    expect(node.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-25, -25, -25))).toBeTruthy();
    expect(node.scale.equals(new Vec3(-0.5, -0.5, -0.5))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-50, -50, -50))).toBeTruthy();
    expect(node.scale.equals(new Vec3(-1.0, -1.0, -1.0))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-75, -75, -75))).toBeTruthy();
    expect(node.scale.equals(new Vec3(-1.5, -1.5, -1.5))).toBeTruthy();

    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(-100, -100, -100))).toBeTruthy();
    expect(node.scale.equals(new Vec3(-2, -2, -2))).toBeTruthy();
    
    game.step(); // once more
    expect(done).toBeTruthy();

    director.unregisterSystem(sys);
});

test('timeScale * timeScale * timeScale', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    node.setScale(0, 0, 0);

    const t1 = tween(node).by(0.0166666666666666 * 80, { position: new Vec3(800, 0, 0) }).timeScale(2)
    const t2 = tween(node).then(t1).timeScale(2);

    let done = false;
    tween(node).then(t2).timeScale(2).call(()=> { done = true } ).start();
    
    game.step();

    for (let i = 0; i < 5; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(400, 0, 0))).toBeTruthy();

    for (let i = 0; i < 5; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(800, 0, 0))).toBeTruthy();
    expect(done).toBeTruthy();

    director.unregisterSystem(sys);
});

test('timeScale negative value', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    node.setScale(0, 0, 0);

    let done = false;
    const t = tween(node).by(1, { position: new Vec3(90, 0, 0) }).call(()=>done = true);

    t.start();
    
    game.step();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(30, 0, 0))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(60, 0, 0))).toBeTruthy();

    t.timeScale(-1);

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(30, 0, 0))).toBeTruthy();

    t.timeScale(0.5);

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(45, 0, 0))).toBeTruthy();

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(60, 0, 0))).toBeTruthy();

    t.timeScale(1);

    for (let i = 0; i < 20; ++i) {
        game.step();
    }
    expect(node.position.equals(new Vec3(90, 0, 0))).toBeTruthy();

    expect(done).toBeTruthy();

    director.unregisterSystem(sys);
});

test('timeScale for repeat', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(1, { position: new Vec3(100, 100, 100) }).id(123)
        .reverse(123)
        .timeScale(0.5)
        .union()
        .repeat(10)
        .start();

    expect(t.duration === 10);

    // Start
    runFrames(1);

    for (let i = 0; i < 10; ++i) {
        runFrames(30);
        expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    }

    director.unregisterSystem(sys);
});

test('timeScale for repeatForever', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(1, { position: new Vec3(100, 100, 100) }).id(123)
        .reverse(123)
        .timeScale(0.5)
        .union()
        .repeatForever()
        .start();

    expect(t.duration === Infinity);

    for (let i = 0; i < 10; ++i) {
        // Start
        runFrames(1);

        runFrames(30);
        expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

        runFrames(30);
        expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    }

    director.unregisterSystem(sys);
});

test('timeScale with zero', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const t = tween(node)
        .by(1, { position: new Vec3(100, 100, 100) })
        .timeScale(0.5)
        .start();

    // Start
    runFrames(1);

    runFrames(30);
    expect(node.position.equals(new Vec3(25, 25, 25))).toBeTruthy();

    runFrames(30);
    expect(node.position.equals(new Vec3(50, 50, 50))).toBeTruthy();

    runFrames(30);
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    t.timeScale(0);

    runFrames(30);
    expect(node.position.equals(new Vec3(75, 75, 75))).toBeTruthy();

    t.timeScale(0.5)

    runFrames(30);
    expect(node.position.equals(new Vec3(100, 100, 100))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('duration', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    node.setScale(0, 0, 0);

    const t = tween(node)
        .to(1, { position: new Vec3(100, 0, 0) })
        .parallel(
            tween(node).to(1, { scale: new Vec3(10, 0, 0) }),
            tween(node).to(1, { eulerAngles: new Vec3(0, 0, 10) }),
        )
        .then(tween(node).by(2, { position: new Vec3(-10, 0, 0) })).id(123)
        .reverse(123)
        .start();

    expect(t.duration).toBe(6);

    director.unregisterSystem(sys);
});

test('repeat', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);
    const zoomIn = tween(node).by(1, { scale: new Vec3(10, 10, 10) });
    const zoomOut = tween(node).by(1, { scale: new Vec3(-10, -10, -10) });
    let complete = false;
    tween(node)
        .delay(1)
        .then(zoomIn).id(123) // 1s
        .then(zoomOut) // 2s
        .call(()=>{
                console.log(`Finish one!`);
        })
        .union(123)
        .repeat(3) // 6s
        .call(()=>{
            complete = true;
        })
        .start();

    // delay 1s
    for (let i = 0; i < 60; ++i) {
        game.step();
    }
    // start
    game.step();

    for (let i = 0; i < 3; ++i) {
        // 1
        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(1.0/3.0*10, 1.0/3.0*10, 1.0/3.0*10))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(2.0/3.0*10, 2.0/3.0*10, 2.0/3.0*10))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(3.0/3.0*10, 3.0/3.0*10, 3.0/3.0*10))).toBeTruthy();

        // 2
        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(2.0/3.0*10, 2.0/3.0*10, 2.0/3.0*10))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(1.0/3.0*10, 1.0/3.0*10, 1.0/3.0*10))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();

        if (i === 2) {
            game.step();
            expect(complete).toBeTruthy();
        } else {
            expect(complete).toBeFalsy();
        }
    }

    director.unregisterSystem(sys);
});

test('repeatForever with > 1 actions in tween', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    
    const node = new Node();
    node.setScale(0, 0, 0);

    tween(node)
        .delay(2)
        .call(()=>{})
        .delay(2)
        .call(()=>{})
        .by(1, { position: new Vec3(100, 0, 0) }).id(123)
        .reverse(123)
        .union(123)
        .repeatForever()
        .start();
    
    for (let i = 0; i < 60 * 4; ++i) {
        game.step();
    }

    // start
    game.step();
    for (let i = 0; i < 10; ++i) {
        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(1.0/3.0*100, 0, 0))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(2.0/3.0*100, 0, 0))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(3.0/3.0*100, 0, 0))).toBeTruthy();

        //
        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(2.0/3.0*100, 0, 0))).toBeTruthy();

        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(1.0/3.0*100, 0, 0))).toBeTruthy();
        
        for (let i = 0; i < 20; ++i) {
            game.step();
        }
        expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    }

    //
    director.unregisterSystem(sys);
});

test('repeatForever', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    
    const node = new Node();
    
    tween(node)
        .by(1, { position: new Vec3(90, 0, 0) }).id(123)
        .reverse(123)
        .union()
        .repeatForever()
        .start();

    // start
    runFrames(1);

    runFrames(20);
    expect(node.position.equals(new Vec3(30, 0, 0))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('pause/resume 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    
    const node = new Node();
    
    const t = tween(node)
        .by(1, { position: new Vec3(90, 0, 0) }).id(123)
        .reverse(123)
        .union()
        .repeatForever()
        .start();

    for (let i = 0; i < 10; ++i) {
        runFrames(1);
        runFrames(20);
        expect(node.position.equals(new Vec3(30, 0, 0))).toBeTruthy();

        t.pause();

        runFrames(1000);
        expect(node.position.equals(new Vec3(30, 0, 0))).toBeTruthy();

        t.resume();

        runFrames(20);
        expect(node.position.equals(new Vec3(60, 0, 0))).toBeTruthy();

        t.pause();

        runFrames(1000);
        expect(node.position.equals(new Vec3(60, 0, 0))).toBeTruthy();

        t.resume();
        runFrames(20);
        expect(node.position.equals(new Vec3(90, 0, 0))).toBeTruthy();

        runFrames(60);
        expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    }

    //
    director.unregisterSystem(sys);
});

test('pause/resume 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    const t1 = tween(node)
        .by(1, { position: v3(90, 90, 90) })
        .start();

    const t2 = tween(node)
        .by(1, { scale: v3(9, 9, 9) })
        .start();

    // Start
    runFrames(1);

    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();
    expect(node.scale.equals(new Vec3(3, 3, 3))).toBeTruthy();

    t1.pause();
    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();
    expect(node.scale.equals(new Vec3(6, 6, 6))).toBeTruthy();

    t1.resume();
    t2.pause();
    runFrames(20);
    expect(node.position.equals(new Vec3(60, 60, 60))).toBeTruthy();
    expect(node.scale.equals(new Vec3(6, 6, 6))).toBeTruthy();

    t2.resume();
    runFrames(20);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();
    expect(node.scale.equals(new Vec3(9, 9, 9))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('pause/resume 3', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    const t1 = tween(node)
        .by(1, { position: v3(90, 90, 90) })
        .start();

    t1.pause();

    runFrames(100);
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    t1.resume();

    // Start
    runFrames(1);

    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();

    t1.pause();
    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();

    t1.resume();
    runFrames(20);
    expect(node.position.equals(new Vec3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('pause/start a repeatForever action', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    const t = tween(node)
        .by(1, { position: v3(90, 90, 90) })
        .repeatForever()
        .start();

    t.pause();
    t.start();

    // Start
    runFrames(1);

    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(new Vec3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('pauseAllByTarget/resumeAllByTarget', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    const node2 = new Node();
    node2.setScale(0, 0, 0);

    const t1 = tween(node)
        .by(1, { position: v3(90, 90, 90) })
        .start();

    const t2 = tween(node)
        .by(1, { scale: v3(9, 9, 9) })
        .start();

    t1.clone(node2).start();
    t2.clone(node2).start();

    // Start
    runFrames(1);

    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();
    expect(node.scale.equals(new Vec3(3, 3, 3))).toBeTruthy();
    expect(node2.position.equals(new Vec3(30, 30, 30))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(3, 3, 3))).toBeTruthy();

    Tween.pauseAllByTarget(node);
    runFrames(20);
    expect(node.position.equals(new Vec3(30, 30, 30))).toBeTruthy();
    expect(node.scale.equals(new Vec3(3, 3, 3))).toBeTruthy();
    expect(node2.position.equals(new Vec3(60, 60, 60))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(6, 6, 6))).toBeTruthy();

    Tween.resumeAllByTarget(node);
    Tween.pauseAllByTarget(node2);
    runFrames(20);
    expect(node.position.equals(new Vec3(60, 60, 60))).toBeTruthy();
    expect(node.scale.equals(new Vec3(6, 6, 6))).toBeTruthy();
    expect(node2.position.equals(new Vec3(60, 60, 60))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(6, 6, 6))).toBeTruthy();

    Tween.resumeAllByTarget(node2);
    runFrames(20);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();
    expect(node.scale.equals(new Vec3(9, 9, 9))).toBeTruthy();
    expect(node2.position.equals(new Vec3(90, 90, 90))).toBeTruthy();
    expect(node2.scale.equals(new Vec3(9, 9, 9))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('update 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    let done = false;
    let currentRatio = 0;

    tween(node)
        .delay(1)
        .by(1, { position: v3(90, 90, 90) })
        .update(1, (target: Node, ratio: number, a: number, b: boolean, c: string, d: { 'world': () => number }): void =>{
            expect(target === node).toBeTruthy();
            expect(a).toBe(123);
            expect(b).toBe(true);
            expect(c).toBe('hello');
            expect(d['world']()).toBe(456);
            currentRatio = ratio;
        }, 123, true, 'hello', { 'world': (): number => 456 })
        .repeat(2)
        .call(()=>{ done = true; })
        .start();

    // Start
    runFrames(1);
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    runFrames(60);
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    runFrames(60);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();

    runFrames(20);
    expect(currentRatio).toBeCloseTo(1/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(2/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(3/3);

    runFrames(20);
    expect(currentRatio).toBeCloseTo(1/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(2/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(3/3);

    runFrames(1); // Do one more step to make the tween done!
    expect(done).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('update 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    let done = false;
    let currentRatio = 0;

    const args = [123, true, 'hello', { 'world': (): number => 456 }];

    tween(node)
        .delay(1)
        .by(1, { position: v3(90, 90, 90) })
        .update(1, (target: Node, ratio: number, ...args: any[]): void =>{
            expect(target === node).toBeTruthy();
            const [a, b, c, d] = args;
            expect(a).toBe(123);
            expect(b).toBe(true);
            expect(c).toBe('hello');
            expect(d['world']()).toBe(456);
            currentRatio = ratio;
        }, ...args)
        .call(()=>{ done = true; })
        .start();

    // Start
    runFrames(1);
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();
    
    runFrames(60);
    expect(node.position.equals(new Vec3(0, 0, 0))).toBeTruthy();

    runFrames(60);
    expect(node.position.equals(new Vec3(90, 90, 90))).toBeTruthy();

    runFrames(20);
    expect(currentRatio).toBeCloseTo(1/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(2/3);
    runFrames(20);
    expect(currentRatio).toBeCloseTo(3/3);

    runFrames(1); // Do one more step to make the tween done!
    expect(done).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('update 3', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const node = new Node();
    node.setScale(0, 0, 0);

    const head = new Node();
    head.setPosition(0, 90, 0);
    const hand = new Node();
    hand.setPosition(0, 60, 0);
    const foot = new Node();
    foot.setPosition(0, 30, 0);

    tween(node)
        .update(1.0, (target: Node, ratio: number, head: Node, hand: Node, foot: Node) => {
            const [v1, v2, v3] = [100, 10, 1];
            head.setPosition(v1 * ratio, head.position.y, head.position.z);
            hand.setPosition(v2 * ratio, hand.position.y, hand.position.z);
            foot.setPosition(v3 * ratio, foot.position.y, foot.position.z);
        }, head, hand, foot)
        .start();

    // Start
    runFrames(1);
    expect(head.position.equals(new Vec3(0, 90, 0))).toBeTruthy();
    expect(hand.position.equals(new Vec3(0, 60, 0))).toBeTruthy();
    expect(foot.position.equals(new Vec3(0, 30, 0))).toBeTruthy();

    runFrames(20);
    expect(head.position.equals(new Vec3(100 * 1/3, 90, 0))).toBeTruthy();
    expect(hand.position.equals(new Vec3(10 * 1/3, 60, 0))).toBeTruthy();
    expect(foot.position.equals(new Vec3(1 * 1/3, 30, 0))).toBeTruthy();

    runFrames(20);
    expect(head.position.equals(new Vec3(100 * 2/3, 90, 0))).toBeTruthy();
    expect(hand.position.equals(new Vec3(10 * 2/3, 60, 0))).toBeTruthy();
    expect(foot.position.equals(new Vec3(1 * 2/3, 30, 0))).toBeTruthy();

    runFrames(20);
    expect(head.position.equals(new Vec3(100 * 3/3, 90, 0))).toBeTruthy();
    expect(hand.position.equals(new Vec3(10 * 3/3, 60, 0))).toBeTruthy();
    expect(foot.position.equals(new Vec3(1 * 3/3, 30, 0))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('Tween.start(time)', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const node = new Node();

    let firstCalled = false;
    let sencondCalled = false;

    tween(node)
        .delay(1)
        .call(()=>{
            firstCalled = true;
        })
        .to(1, { position: v3(100, 100, 100) })
        .delay(1)
        .call(()=>{
            sencondCalled = true;
        })
        .delay(1)
        .call(()=>{
            firstCalled = false;
            sencondCalled = false;
        })
        .set({ position: v3(0, 0, 0) })
        .union()
        .repeat(2)
        .start(1.5);
    
    runFrames(1);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(50, 50, 50))).toBeTruthy();

    runFrames(15);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(75, 75, 75))).toBeTruthy();

    runFrames(15);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    runFrames(60);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    runFrames(1);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeTruthy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    runFrames(59);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeTruthy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    // Sencond
    runFrames(1)
    expect(firstCalled).toBeFalsy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(60);
    const secondPosStart = 1.666666666666; // Second round will not start from v3(0, 0, 0)
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(secondPosStart, secondPosStart, secondPosStart))).toBeTruthy();

    runFrames(60);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    runFrames(60);
    expect(firstCalled).toBeTruthy();
    expect(sencondCalled).toBeTruthy();
    expect(node.position.equals(v3(100, 100, 100))).toBeTruthy();

    runFrames(60);
    expect(firstCalled).toBeFalsy();
    expect(sencondCalled).toBeFalsy();
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();
    //
    director.unregisterSystem(sys);
});

test('Tween.start(time) negative time', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const node = new Node();

    tween(node)
        .to(1, { position: v3(90, 90, 90) })
        .start(-100);

    // Start
    runFrames(1);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('Tween.start(time) time larger than duration', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const node = new Node();

    tween(node)
        .to(1, { position: v3(90, 90, 90) })
        .start(1000);

    // Start
    runFrames(1);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    //
    director.unregisterSystem(sys);
});

test('clone', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const sprite = new Sprite();
    
    const t1 = tween(node).by(1, { position: v3(90, 90, 90) });
    const t2 = t1.clone();
    const t3 = t1.clone(sprite);

    expect(t1.getTarget()).toBe(node);
    expect(t2.getTarget()).toBe(node);
    expect(t3.getTarget()).toBe(sprite);

    director.unregisterSystem(sys);
});

test('auto pause/resume tween by node active state', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene1 = new Scene('test-auto-pause-resume1');
    scene1['_inited'] = false;
    const scene2 = new Scene('test-auto-pause-resume2');
    scene2['_inited'] = false;
    const node1 = new Node();
    const node2 = new Node();
    scene1.addChild(node1);
    scene1.addChild(node2);

    tween(node1).by(1, { scale: v3(2, 2, 2) }).start();
    const t1 = tween(node1).by(1, { position: v3(90, 90, 90) }).start();
    
    tween(node2).by(1, { scale: v3(2, 2, 2) }).start();
    const t2 = tween(node2).by(1, { position: v3(90, 90, 90) }).start();

    node1.active = false;
    node2.active = false;

    director.runSceneImmediate(scene1);

    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(100);
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    node1.active = true;
    node2.active = true;

    // Start
    runFrames(1);

    runFrames(20);
    expect(node1.position.equals(v3(30, 30, 30))).toBeTruthy();
    expect(node2.position.equals(v3(30, 30, 30))).toBeTruthy();

    node1.active = false;

    runFrames(20);
    expect(node1.position.equals(v3(30, 30, 30))).toBeTruthy();
    expect(node2.position.equals(v3(60, 60, 60))).toBeTruthy();

    node1.active = true;
    node2.active = false;

    runFrames(20);
    expect(node1.position.equals(v3(60, 60, 60))).toBeTruthy();
    expect(node2.position.equals(v3(60, 60, 60))).toBeTruthy();

    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(2);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(2);

    t2.stop();
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(2);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(1);

    t1.stop();
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(1);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(1);

    Tween.stopAllByTarget(node1);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(0);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(1);

    Tween.stopAllByTarget(node2);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(0);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(0);

    t1.clone().start();
    t2.clone().start();

    node2.active = true;

    runFrames(1); // Start
    runFrames(20);
    expect(node1.position.equals(v3(90, 90, 90))).toBeTruthy();
    expect(node2.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.runSceneImmediate(scene2);

    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node1)).toBe(0);
    expect(TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(node2)).toBe(0);

    // node1 and node2 were destroyed.
    runFrames(20);
    expect(node1.position).toBeNull();
    expect(node2.position).toBeNull();

    director.unregisterSystem(sys);
});

test('node not active 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene1 = new Scene('test-auto-pause-resume1');
    scene1['_inited'] = false;
    const scene2 = new Scene('test-auto-pause-resume2');
    scene2['_inited'] = false;
    const node1 = new Node();
    const node2 = new Node();
    scene1.addChild(node1);
    scene1.addChild(node2);

    node1.active = false;
    node2.active = false;

    tween(node1).by(1, { scale: v3(2, 2, 2) }).start();
    tween(node1).by(1, { position: v3(90, 90, 90) }).start();
    
    tween(node2).by(1, { scale: v3(2, 2, 2) }).start();
    tween(node2).by(1, { position: v3(90, 90, 90) }).start();

    director.runSceneImmediate(scene1);

    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(100);
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('node not active 3', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene1 = new Scene('test-auto-pause-resume1');
    scene1['_inited'] = false;
    const scene2 = new Scene('test-auto-pause-resume2');
    scene2['_inited'] = false;
    const node1 = new Node();
    const node2 = new Node();

    node1.active = false;
    node2.active = false;

    scene1.addChild(node1);
    scene1.addChild(node2);

    tween(node1).by(1, { scale: v3(2, 2, 2) }).start();
    tween(node1).by(1, { position: v3(90, 90, 90) }).start();
    
    tween(node2).by(1, { scale: v3(2, 2, 2) }).start();
    tween(node2).by(1, { position: v3(90, 90, 90) }).start();

    director.runSceneImmediate(scene1);

    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(100);
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('node active + pause/resume  ', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const scene1 = new Scene('test-auto-pause-resume1');
    scene1['_inited'] = false;
    const scene2 = new Scene('test-auto-pause-resume2');
    scene2['_inited'] = false;
    const node1 = new Node();
    const node2 = new Node();
    node1.setScale(0, 0, 0);
    node2.setScale(0, 0, 0);

    node1.active = false;
    node2.active = false;

    scene1.addChild(node1);
    scene1.addChild(node2);

    const t1 = tween(node1).by(1, { scale: v3(9, 9, 9) }).start();
    const t2 = tween(node1).by(1, { position: v3(90, 90, 90) }).start();
    
    const t3 = tween(node2).by(1, { scale: v3(9, 9, 9) }).start();
    const t4 = tween(node2).by(1, { position: v3(90, 90, 90) }).start();

    director.runSceneImmediate(scene1);

    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node1.scale.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node1.scale.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(v3(0, 0, 0))).toBeTruthy();
    
    t2.resume();
    t4.resume();

    runFrames(20);
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node1.scale.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(v3(0, 0, 0))).toBeTruthy();

    t1.resume();
    t3.resume();
    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node1.scale.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(v3(0, 0, 0))).toBeTruthy();

    node1.active = true;
    node2.active = true;

    t1.pause();
    t2.pause();
    t3.pause();
    t4.pause();

    expect(node1.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node1.scale.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.position.equals(v3(0, 0, 0))).toBeTruthy();
    expect(node2.scale.equals(v3(0, 0, 0))).toBeTruthy();

    t1.resume();
    t2.resume();
    t3.resume();
    t4.resume();

    runFrames(1); // Start
    
    runFrames(20);
    expect(node1.position.equals(v3(30, 30, 30))).toBeTruthy();
    expect(node1.scale.equals(v3(3, 3, 3))).toBeTruthy();
    expect(node2.position.equals(v3(30, 30, 30))).toBeTruthy();
    expect(node2.scale.equals(v3(3, 3, 3))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom prop value with callback', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, { angle: ()=>90, position: v3(90, 90, 90) }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(30);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(60);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom prop value with value', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, { angle: { value: 90 }, position: v3(90, 90, 90) }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(30);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(60);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom prop value with value, custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, {
        angle: { 
            value: 90,
            progress(start: number, end: number, current: number, ratio: number): number {
                return lerp(start, end, ratio);
            },
        },
        position: v3(90, 90, 90),
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(30);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(60);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom prop value with value, custom easing with builtin string type', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, {
        angle: { 
            value: 90,
            easing: 'backIn',
        },
        position: v3(90, 90, 90),
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(-8.010533333333335);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(3.978933333333372);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom prop value with value, custom easing function', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, {
        angle: { 
            value: 90,
            easing: (k: number): number => { 
                if (k === 1) {
                    return 1;
                }
                const s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
        },
        position: v3(90, 90, 90),
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(-8.010533333333335);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(3.978933333333372);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom progress in opt', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, { angle: 90, position: v3(90, 90, 90) }, {
        progress(start: number, end: number, current: number, ratio: number): number {
            return lerp(start, end, ratio);
        },
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(30);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(60);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom easing with builtin type in opt', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, { angle: 90, position: v3(90, 90, 90) }, {
        easing: 'backIn',
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(-8.010533333333335);
    expect(node.position.equals(v3(-8.010533333333335, -8.010533333333335, -8.010533333333335))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(3.978933333333372);
    expect(node.position.equals(v3(3.978933333333372, 3.978933333333372, 3.978933333333372))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

test('custom easing function in opt', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    tween(node).to(1, { angle: 90, position: v3(90, 90, 90) }, {
        easing: (k: number): number => { 
            if (k === 1) {
                return 1;
            }
            const s = 1.70158;
            return k * k * ((s + 1) * k - s);
         },
    }).start();

    runFrames(1); // Start
    expect(node.angle).toBeCloseTo(0);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(-8.010533333333335);
    expect(node.position.equals(v3(-8.010533333333335, -8.010533333333335, -8.010533333333335))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(3.978933333333372);
    expect(node.position.equals(v3(3.978933333333372, 3.978933333333372, 3.978933333333372))).toBeTruthy();

    runFrames(20);
    expect(node.angle).toBeCloseTo(90);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();

    director.unregisterSystem(sys);
});

class StringTarget {
    string = '';
}

test('to string, 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '0';

    tween(t).to(1, { string: 100 }).start();

    runFrames(1); // Start
    expect(t.string).toBe('0');

    runFrames(20);
    expect(t.string).toBe('33');

    runFrames(20);
    expect(t.string).toBe('67');

    runFrames(20);
    expect(t.string).toBe('100');

    director.unregisterSystem(sys);
});

test('to string, 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '10';

    tween(t).to(1, { string: '100' }).start();

    runFrames(1); // Start
    expect(t.string).toBe('10');

    runFrames(20);
    expect(t.string).toBe('40');

    runFrames(20);
    expect(t.string).toBe('70');

    runFrames(20);
    expect(t.string).toBe('100');

    director.unregisterSystem(sys);
});

test('to string, toFixed: 2, 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '10';

    tween(t).to(1, { string: { value: 110, toFixed: 2 } }).start();

    runFrames(1); // Start
    expect(t.string).toBe('10.00');

    runFrames(20);
    expect(t.string).toBe('43.33');

    runFrames(20);
    expect(t.string).toBe('76.67');

    runFrames(20);
    expect(t.string).toBe('110.00');

    director.unregisterSystem(sys);
});

test('to string, toFixed: 2, 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '0';

    tween(t).to(1, { string: { value: '100', toFixed: 2 } }).start();

    runFrames(1); // Start
    expect(t.string).toBe('0.00');

    runFrames(20);
    expect(t.string).toBe('33.33');

    runFrames(20);
    expect(t.string).toBe('66.67');

    runFrames(20);
    expect(t.string).toBe('100.00');

    director.unregisterSystem(sys);
});

test('by string', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '10';

    tween(t)
        .by(1, { string: 90 }).id(123)
        .reverse(123)
        .start();

    runFrames(1); // Start
    expect(t.string).toBe('10');

    runFrames(20);
    expect(t.string).toBe('40');

    runFrames(20);
    expect(t.string).toBe('70');

    runFrames(20);
    expect(t.string).toBe('100');

    runFrames(20);
    expect(t.string).toBe('70');

    runFrames(20);
    expect(t.string).toBe('40');

    runFrames(20);
    expect(t.string).toBe('10');

    director.unregisterSystem(sys);
});

test('by string, toFixed: 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '10';

    tween(t)
        .by(1, { string: { value: ()=>90, toFixed: 2 } }).id(123)
        .reverse(123)
        .start();

    runFrames(1); // Start
    expect(t.string).toBe('10.00');

    runFrames(20);
    expect(t.string).toBe('40.00');

    runFrames(20);
    expect(t.string).toBe('70.00');

    runFrames(20);
    expect(t.string).toBe('100.00');

    runFrames(20);
    expect(t.string).toBe('70.00');

    runFrames(20);
    expect(t.string).toBe('40.00');

    runFrames(20);
    expect(t.string).toBe('10.00');

    director.unregisterSystem(sys);
});

test('to string, custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '0';

    const fnCustomProgress = jest.fn((start: number, end: number, current: string, ratio: number): string => {
        return lerp(start, end, ratio).toFixed(0);
    });

    tween(t)
        .to(1, { string: { value: 100, progress: fnCustomProgress, } })
        .start();

    runFrames(1); // Start
    expect(fnCustomProgress).toBeCalledTimes(1);
    expect(t.string).toBe('0');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20);
    expect(t.string).toBe('33');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20 + 20);
    expect(t.string).toBe('67');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20 + 20 + 20);
    expect(t.string).toBe('100');

    director.unregisterSystem(sys);
});

test('to string, custom progress, prefix ¥', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const t = new StringTarget();
    t.string = '¥0';

    const fnCustomProgress = jest.fn((start: number, end: number, current: string, ratio: number): string => {
        return '¥' + lerp(start, end, ratio).toFixed(2);
    });

    tween(t)
        .to(1, { string: { value: 100, progress: fnCustomProgress, convert: (v: string) => v.slice(1) } })
        .start();

    runFrames(1); // Start
    expect(fnCustomProgress).toBeCalledTimes(1);
    expect(t.string).toBe('¥0.00');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20);
    expect(t.string).toBe('¥33.33');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20 + 20);
    expect(t.string).toBe('¥66.67');

    runFrames(20);
    expect(fnCustomProgress).toBeCalledTimes(1 + 20 + 20 + 20);
    expect(t.string).toBe('¥100.00');

    director.unregisterSystem(sys);
});

test('to string, custom progress, wrap value', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const o = { gold: "¥0.00" };

    function money(value) {
        return {
            value: `¥${value}`,
            progress(start: number, end: number, current: string, ratio: number): string {
                return `¥${lerp(start, end, ratio).toFixed(2)}`;
            },
            convert(v: string): number {
                return Number(v.slice(1));
            }
        }
    }

    tween(o).to(1, { gold: money(100) }).start();

    runFrames(1); // Start
    expect(o.gold).toBe('¥0.00');

    runFrames(20);
    expect(o.gold).toBe('¥33.33');

    runFrames(20);
    expect(o.gold).toBe('¥66.67');

    runFrames(20);
    expect(o.gold).toBe('¥100.00');

    director.unregisterSystem(sys);
});

test('to string, custom progress, wrap value 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const o = { 
        _position: v3(0, 0, 0),
        set position(v) {
            this._position.set(v)
        },
        get position() {
            return this._position;
        },
        gold: "¥0.00",
        exp: '1000/1000',
        lv: 'Lv.100',
        attack: '100 points',
        health: '10.00',
    };

    const tweenFormat = {
        currency(value: number): ITweenCustomProperty<string> {
            return {
                value: `¥${value}`,
                progress(start: number, end: number, current: string, ratio: number): string {
                    return `¥${lerp(start, end, ratio).toFixed(2)}`;
                },
                convert(v: string): number {
                    return Number(v.slice(1));
                },
            };
        },

        health(value: number): ITweenCustomProperty<string> {
            return {
                value: `${value}`,
                toFixed: 2,
            };
        },

        exp(value: number): ITweenCustomProperty<string> {
            return {
                value: () => `${value}/1000`,
                progress(start: number, end: number, current: string, ratio: number): string {
                    return `${lerp(start, end, ratio).toFixed(0)}/1000`;
                },
                convert(v: string): number {
                    return Number(v.slice(0, v.indexOf('/')));
                },
            };
        },

        lv(value: number): ITweenCustomProperty<string> {
            return {
                value: `Lv.${value}`,
                progress(start: number, end: number, current: string, ratio: number): string {
                    return `Lv.${lerp(start, end, ratio).toFixed(0)}`;
                },
                convert(v: string): number {
                    return Number(v.slice(v.indexOf('.') + 1));
                },
            };
        },
    };

    tween(o).to(1, { 
        position: v3(90, 0, 0),
        gold: tweenFormat.currency(100),
        health: tweenFormat.health(1),
        exp: tweenFormat.exp(0),
        lv: tweenFormat.lv(0),
    }).start();

    runFrames(1); // Start
    expect(o.position.equals(v3(0, 0, 0)));
    expect(o.gold).toBe('¥0.00');
    expect(o.health).toBe('10.00');
    expect(o.exp).toBe('1000/1000');
    expect(o.lv).toBe('Lv.100');

    runFrames(20);
    expect(o.position.equals(v3(30, 0, 0)));
    expect(o.gold).toBe('¥33.33');
    expect(o.health).toBe('7.00');
    expect(o.exp).toBe('667/1000');
    expect(o.lv).toBe('Lv.67');

    runFrames(20);
    expect(o.position.equals(v3(60, 0, 0)));
    expect(o.gold).toBe('¥66.67');
    expect(o.health).toBe('4.00');
    expect(o.exp).toBe('333/1000');
    expect(o.lv).toBe('Lv.33');

    runFrames(20);
    expect(o.position.equals(v3(90, 0, 0)));
    expect(o.gold).toBe('¥100.00');
    expect(o.health).toBe('1.00');
    expect(o.exp).toBe('0/1000');
    expect(o.lv).toBe('Lv.0');

    director.unregisterSystem(sys);
});

let lerpCalledCount = 0;
let cloneCalledCount = 0;
let addCalledCount = 0;
let subCalledCount = 0;
class MyProp {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    public static lerp (a: MyProp, b: MyProp, out: MyProp, t: number): MyProp {
        ++lerpCalledCount;
        const x = a.x;
        const y = a.y;
        out.x = x + t * (b.x - x);
        out.y = y + t * (b.y - y);
        return out;
    }

    public static add (a: MyProp, b: MyProp): MyProp {
        ++addCalledCount;
        const out = new MyProp();
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        return out;
    }

    public static sub (a: MyProp, b: MyProp): MyProp {
        ++subCalledCount;
        const out = new MyProp();
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        return out;
    }

    clone(): MyProp {
        ++cloneCalledCount;
        return new MyProp(this.x, this.y);
    }

    equals (other: MyProp, epsilon = EPSILON): boolean {
        return (
            Math.abs(this.x - other.x)
            <= epsilon * Math.max(1.0, Math.abs(this.x), Math.abs(other.x))
            && Math.abs(this.y - other.y)
            <= epsilon * Math.max(1.0, Math.abs(this.y), Math.abs(other.y))
        );
    }

    x = 0;
    y = 0;
}

class MyObject {
    angle = 0;
    str = '';
    private _myProp = new MyProp();

    set myProp(v) {
        if (Number.isNaN(v.x) || Number.isNaN(v.y)) {
            console.error('xxxx');
        }
        this._myProp.x = v.x;
        this._myProp.y = v.y;
    }

    get myProp() {
        return this._myProp;
    }
}

test('to object, no custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    lerpCalledCount = 0;
    cloneCalledCount = 0;
    addCalledCount = 0;

    const o = new MyObject();

    tween(o)
        .to(1, {
            myProp: {
                value: new MyProp(100, 100),
            },
        })
        .start();

    runFrames(1); // Started
    expect(o.myProp.equals(new MyProp(0, 0))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1/3*100, 1/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(2/3*100, 2/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(3/3*100, 3/3*100))).toBeTruthy();

    expect(lerpCalledCount).toBe(0);
    expect(cloneCalledCount).toBe(0);
    expect(addCalledCount).toBe(0);

    director.unregisterSystem(sys);
});

test('by object, no custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    lerpCalledCount = 0;
    cloneCalledCount = 0;
    addCalledCount = 0;

    const o = new MyObject();
    o.myProp.x = 1;
    o.myProp.y = 1;

    tween(o)
        .by(1, { myProp: {
            value: new MyProp(100, 100),
        } }).id(123)
        .reverse(123)
        .start();

    runFrames(1); // Started
    expect(o.myProp.equals(new MyProp(1, 1))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 1/3*100, 1 + 1/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 2/3*100, 1 + 2/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 3/3*100, 1 + 3/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 2/3*100, 1 + 2/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 1/3*100, 1 + 1/3*100))).toBeTruthy();

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1, 1))).toBeTruthy();

    expect(lerpCalledCount).toBe(0);
    expect(cloneCalledCount).toBe(0);
    expect(addCalledCount).toBe(0);

    director.unregisterSystem(sys);
});

test('to object, custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    lerpCalledCount = 0;
    cloneCalledCount = 0;
    addCalledCount = 0;

    const o = new MyObject();

    tween(o)
        .to(1, { myProp: {
            value: new MyProp(100, 100),
            progress: MyProp.lerp,
            clone: v => v.clone(),
            legacyProgress: false,
        } })
        .start();

    runFrames(1); // Started
    expect(o.myProp.equals(new MyProp(0, 0))).toBeTruthy();
    expect(lerpCalledCount).toBe(1);
    expect(cloneCalledCount).toBe(3);
    expect(addCalledCount).toBe(0);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1/3*100, 1/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 1);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(2/3*100, 2/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 2);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(3/3*100, 3/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 3);

    director.unregisterSystem(sys);
});

test('by object, custom progress', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    lerpCalledCount = 0;
    cloneCalledCount = 0;
    addCalledCount = 0;
    subCalledCount = 0;

    const o = new MyObject();
    o.myProp.x = 1;
    o.myProp.y = 1;

    tween(o)
        .by(1, { myProp: {
            value: new MyProp(100, 100),
            progress: MyProp.lerp,
            clone: v => v.clone(),
            add: MyProp.add,
            legacyProgress: false,
        } })
        .start();

    runFrames(1); // Started
    expect(o.myProp.equals(new MyProp(1, 1))).toBeTruthy();
    expect(lerpCalledCount).toBe(1);
    expect(cloneCalledCount).toBe(2);
    expect(addCalledCount).toBe(1);
    expect(subCalledCount).toBe(0);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 1/3*100, 1 + 1/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 1);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 2/3*100, 1 + 2/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 2);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 3/3*100, 1 + 3/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 3);

    director.unregisterSystem(sys);
});

test('by object, custom progress, reverse', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    lerpCalledCount = 0;
    cloneCalledCount = 0;
    addCalledCount = 0;
    subCalledCount = 0;

    const o = new MyObject();
    o.myProp.x = 1;
    o.myProp.y = 1;

    tween(o)
        .by(1, { myProp: {
            value: new MyProp(100, 100),
            progress: MyProp.lerp,
            clone: v => v.clone(),
            add: MyProp.add,
            sub: MyProp.sub,
            legacyProgress: false,
        } }).id(123)
        .reverse(123)
        .start();

    runFrames(1); // Started
    expect(o.myProp.equals(new MyProp(1, 1))).toBeTruthy();
    expect(lerpCalledCount).toBe(1);
    expect(cloneCalledCount).toBe(2);
    expect(addCalledCount).toBe(1);
    expect(subCalledCount).toBe(0);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 1/3*100, 1 + 1/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 1);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 2/3*100, 1 + 2/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(1 + 20 * 2);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 3/3*100, 1 + 3/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(2 + 20 * 3);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 2/3*100, 1 + 2/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(2 + 20 * 4);
    expect(addCalledCount).toBe(1);
    expect(subCalledCount).toBe(1);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1 + 1/3*100, 1 + 1/3*100))).toBeTruthy();
    expect(lerpCalledCount).toBe(2 + 20 * 5);

    runFrames(20);
    expect(o.myProp.equals(new MyProp(1, 1))).toBeTruthy();
    expect(lerpCalledCount).toBe(2 + 20 * 6);

    director.unregisterSystem(sys);
});

test('tween custom object, ensure same type', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    class MyVec2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
        x = 0;
        y = 0;
    }

    class MyTarget {
        pos = new MyVec2();
    }

    const target = new MyTarget();
    tween(target).to(1, { pos: new MyVec2(100, 100) }).start();

    runFrames(61);

    expect(target.pos).toBeInstanceOf(MyVec2);
    expect(target.pos.x).toBe(100);
    expect(target.pos.y).toBe(100);

    director.unregisterSystem(sys);
});

test('test stop and running', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const node = new Node();

    const t = tween(node)
        .parallel(
            tween(node).by(1, { position: v3(90, 90, 90) }),
            tween(node).delay(0.5).call(()=>{}),
        );
        
    expect(t.running).toBeFalsy();
    t.start();
    expect(t.running).toBeTruthy();

    // Start
    runFrames(1);
    expect(node.position.equals(v3(0, 0, 0))).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    expect(t.running).toBeTruthy();
    t.stop();
    expect(t.running).toBeFalsy();

    runFrames(20);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();

    t.start();
    expect(t.running).toBeTruthy();
    // Start
    runFrames(1);
    expect(node.position.equals(v3(30, 30, 30))).toBeTruthy();
    expect(t.running).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(60, 60, 60))).toBeTruthy();
    expect(t.running).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();
    expect(t.running).toBeTruthy();

    runFrames(20);
    expect(node.position.equals(v3(120, 120, 120))).toBeTruthy();

    // DONE
    expect(t.running).toBeFalsy();
    //
    director.unregisterSystem(sys);
});

test('stopAll', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const tweens: Array<Tween<Node>> = new Array(10);
    for (let i = 0; i < tweens.length; ++i) {
        const node = new Node();
        tweens[i] = tween(node)
            .by(1, { position: new Vec3(100, 0, 0) })
            .delay(Math.random() * 10)
            .parallel(
                tween(node).by(1, { scale: new Vec3(2, 2, 2) }),
                tween(node).by(1, { angle: 90 })
            )
            .start();

        expect(Tween.getRunningCount(node)).toBe(1);
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
    }

    Tween.stopAll();

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeFalsy();
        expect(Tween.getRunningCount(tweens[i].getTarget)).toBe(0);
    }

    //
    director.unregisterSystem(sys);
});

test('stopAllByTag(tag) 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const tweens: Array<Tween<Node>> = new Array(10);
    for (let i = 0; i < tweens.length; ++i) {
        const node = new Node();
        tweens[i] = tween(node)
            .tag(i)
            .by(1, { position: new Vec3(100, 0, 0) })
            .start();
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
        Tween.stopAllByTag(i);
        expect(tweens[i].running).toBeFalsy();
    }

    //
    director.unregisterSystem(sys);
});

test('stopAllByTag(tag) 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //

    const tweens: Array<Tween<Node>> = new Array(10);
    for (let i = 0; i < tweens.length; ++i) {
        const node = new Node();
        tweens[i] = tween(node)
            .tag(i % 5)
            .by(1, { position: new Vec3(100, 0, 0) })
            .start();
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
    }

    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i].running).toBeTruthy();
        expect(tweens[i + 5].running).toBeTruthy();
        Tween.stopAllByTag(i);
        expect(tweens[i].running).toBeFalsy();
        expect(tweens[i + 5].running).toBeFalsy();
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeFalsy();
    }

    //
    director.unregisterSystem(sys);
});

test('stopAllByTag(tag, target)', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const tweens: Array<Tween<Node>> = new Array(10);
    const node1 = new Node();
    const node2 = new Node();
    for (let i = 0; i < tweens.length; ++i) {
        tweens[i] = tween(Math.floor(i / 5) === 0 ? node1 : node2)
            .tag(i % 5)
            .by(1, { position: new Vec3(100, 0, 0) })
            .start();
    }

    expect(Tween.getRunningCount(node1)).toBe(5);
    expect(Tween.getRunningCount(node2)).toBe(5);

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
    }

    runFrames(10);

    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i].running).toBeTruthy();
        Tween.stopAllByTag(i, node1);
        expect(tweens[i].running).toBeFalsy();
    }

    expect(Tween.getRunningCount(node1)).toBe(0);
    expect(Tween.getRunningCount(node2)).toBe(5);

    runFrames(10);

    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i+5].running).toBeTruthy();
        Tween.stopAllByTag(i, node2);
        expect(tweens[i+5].running).toBeFalsy();
    }

    expect(Tween.getRunningCount(node1)).toBe(0);
    expect(Tween.getRunningCount(node2)).toBe(0);

    runFrames(10);

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeFalsy();
    }
    //
    director.unregisterSystem(sys);
});

test('stopAllByTarget(target)', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);
    //
    const tweens: Array<Tween<Node>> = new Array(10);
    const node1 = new Node();
    const node2 = new Node();
    for (let i = 0; i < tweens.length; ++i) {
        tweens[i] = tween(Math.floor(i / 5) === 0 ? node1 : node2)
            .tag(i % 5)
            .by(1, { position: new Vec3(100, 0, 0) })
            .start();
    }

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeTruthy();
    }

    runFrames(10);

    Tween.stopAllByTarget(node1);
    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i].running).toBeFalsy();
    }

    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i + 5].running).toBeTruthy();
    }

    runFrames(10);

    Tween.stopAllByTarget(node2);
    for (let i = 0; i < tweens.length / 2; ++i) {
        expect(tweens[i+5].running).toBeFalsy();
    }

    runFrames(10);

    for (let i = 0; i < tweens.length; ++i) {
        expect(tweens[i].running).toBeFalsy();
    }

    //
    director.unregisterSystem(sys);
});

test('update destroyed node', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    tween(node).to(1, { position: new Vec3(100, 100, 100) }).start();

    runFrames(1);// Start

    runFrames(30);
    expect(node.position.equals(v3(50, 50, 50))).toBeTruthy();

    node._destroyImmediate();

    expect(node.position).toBeNull();
    expect(node.scale).toBeNull();

    Tween.stopAllByTarget(node);

    runFrames(30);

    // node was destroyed, it should not be updated any more.
    tween(node).to(1, { scale: new Vec3(3, 3, 3) }).start();

    runFrames(30);

    expect(node.position).toBeNull();
    expect(node.scale).toBeNull();

    director.unregisterSystem(sys);
});

test('Bezier Curve', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const originalKnots: ReadonlyArray<Vec3> = [
        // v3(-360, -180, 0), // start
        v3(-270, 80, 0),
        v3(-100, -80, 0),
        v3(0, 0, 0),
        v3(0, 0, 0),
        v3(100, -80, 0),
        v3(270, 80, 0),
        v3(360, -180, 0),
    ];

    const node = new Node();
    node.setPosition(-360, -180, 0);

    const pos = node.getPosition().clone();
    const offsetKnots = originalKnots.map((v: Vec3) => v.clone().subtract(pos));

    tween(node)
        .by(2, { position: tweenProgress.bezier(...offsetKnots) }).id(1)
        .reverse(1)
        .start();

    const positionFootprintsBy: Vec3[] = [];

    for (let i = 0, len = 4 * 60 + 1; i < len; ++i) {
        runFrames(1);
        positionFootprintsBy.push(node.getPosition().clone());
    }

    expect(positionFootprintsBy).toMatchSnapshot('BezierBy Positions');

    // Reset position
    node.setPosition(-360, -180, 0);
    const reverseKnots = originalKnots.slice();
    reverseKnots.reverse();
    reverseKnots.push(pos);
    reverseKnots.splice(0, 1);

    tween(node)
        .to(2, { position: tweenProgress.bezier(...originalKnots)})
        .to(2, { position: tweenProgress.bezier(...reverseKnots)})
        .start();

    const positionFootprintsTo: Vec3[] = [];
    for (let i = 0, len = 4 * 60 + 1; i < len; ++i) {
        runFrames(1);
        positionFootprintsTo.push(node.getPosition().clone());
    }

    expect(positionFootprintsBy).toMatchSnapshot('BezierTo Positions');
    expect(positionFootprintsBy.length).toBe(positionFootprintsTo.length);
    positionFootprintsBy.forEach((v: Vec3, i: number) => {
        expect(v.equals(positionFootprintsTo[i])).toBeTruthy();
    });

    director.unregisterSystem(sys);
});

test('CatmullRom Curve', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const originalKnots: ReadonlyArray<Vec3> = [
        // v3(-360, -180, 0), // start
        v3(-270, 80, 0),
        v3(-100, -80, 0),
        v3(0, 0, 0),
        v3(100, -80, 0),
        v3(270, 80, 0),
        v3(360, -180, 0),
    ];

    const node = new Node();
    node.setPosition(-360, -180, 0);

    const pos = node.getPosition().clone();
    const offsetKnots = originalKnots.map((v: Vec3) => v.clone().subtract(pos));

    tween(node)
        .by(2, { position: tweenProgress.catmullRom(...offsetKnots) }).id(1)
        .reverse(1)
        .start();

    const positionFootprintsBy: Vec3[] = [];

    for (let i = 0, len = 4 * 60 + 1; i < len; ++i) {
        runFrames(1);
        positionFootprintsBy.push(node.getPosition().clone());
    }

    expect(positionFootprintsBy).toMatchSnapshot('CatmullRomBy Positions');

    // Reset position
    node.setPosition(-360, -180, 0);
    const reverseKnots = originalKnots.slice();
    reverseKnots.reverse();
    reverseKnots.push(pos);
    reverseKnots.splice(0, 1);

    tween(node)
        .to(2, { position: tweenProgress.catmullRom(...originalKnots)})
        .to(2, { position: tweenProgress.catmullRom(...reverseKnots)})
        .start();

    const positionFootprintsTo: Vec3[] = [];
    for (let i = 0, len = 4 * 60 + 1; i < len; ++i) {
        runFrames(1);
        positionFootprintsTo.push(node.getPosition().clone());
    }

    expect(positionFootprintsBy).toMatchSnapshot('CatmullRomTo Positions');
    expect(positionFootprintsBy.length).toBe(positionFootprintsTo.length);
    positionFootprintsBy.forEach((v: Vec3, i: number) => {
        expect(v.equals(positionFootprintsTo[i])).toBeTruthy();
    });

    director.unregisterSystem(sys);
});

test('updateUntil 1', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();
    const REPEAT_COUNT = 2;
    let elapsed = 0;
    let updateUntilSuccessTimes = 0;

    const firstCb = jest.fn(()=>{
        // console.log(`first`);
    });

    const finishCb = jest.fn(()=>{
        // console.log(`second callback`);
    });

    tween(node)
        .call(firstCb)
        .by(1, { position: v3(90, 90, 90) })
        .updateUntil((target: Node, dt: number, arg0: number, arg1: boolean, arg2: string): boolean => {
            elapsed += dt;
            if (elapsed >= 1) {
                ++updateUntilSuccessTimes;
                elapsed = 0;
                return true;
            }
            return false;
        }, 1, false, 'hello')
        .call(finishCb)
        .union().id(1)
        .reverse(1)
        .union()
        .repeat(REPEAT_COUNT)
        .start();

    runFrames(1); // Start

    for (let i = 0; i < REPEAT_COUNT; ++i) {
        runFrames(60);
        runFrames(60);
        runFrames(60);
        runFrames(60);
    }

    expect(firstCb).toBeCalledTimes(REPEAT_COUNT * 2);
    expect(finishCb).toBeCalledTimes(REPEAT_COUNT * 2);
    expect(updateUntilSuccessTimes).toBe(REPEAT_COUNT * 2);

    director.unregisterSystem(sys);
});

test('updateUntil 2', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    let elapsed = 0;
    let updateUntilSuccessTimes = 0;

    const node = new Node();
    node.setScale(0, 0, 0);
    const cb = jest.fn(()=>{});
    const cb2 = jest.fn(()=>{});

    const target2 = { x: 0 };

    tween(node)
        .delay(1)
        .sequence(
            tween(node).parallel(
                tween(node).by(1, { position: v3(90, 90, 90) }).call(cb),
                tween(node).updateUntil((target: Node, dt: number, arg0: number, arg1: boolean, arg2: string): boolean => {
                    elapsed += dt;
                    if (elapsed >= 2) {
                        ++updateUntilSuccessTimes;
                        elapsed = 0;
                        return true;
                    }
                    return false;
                }, 1, false, 'hello'),
                tween(node).by(3, { scale: v3(30, 30, 30) })
            ),
            tween(node).call(cb2),
            tween(target2).by(1, { x: 100 }),
        )
        .updateUntil((target: Node, dt: number, arg0: number, arg1: boolean, arg2: string): boolean => {
            elapsed += dt;
            if (elapsed >= 2) {
                ++updateUntilSuccessTimes;
                elapsed = 0;
                return true;
            }
            return false;
        }, 2, true, 'world')
        .start();

    runFrames(1); // Start

    runFrames(60); // Delay 1s

    runFrames(60); // by

    expect(node.position.equals(v3(90, 90, 90))).toBeTruthy();
    expect(node.scale.equals(v3(10, 10, 10))).toBeTruthy();

    runFrames(1);
    expect(cb).toBeCalledTimes(1);

    runFrames(60-1); // updateUntil

    expect(cb).toBeCalledTimes(1);
    expect(updateUntilSuccessTimes).toBe(1);
    expect(cb2).toBeCalledTimes(0);
    expect(node.scale.equals(v3(20, 20, 20))).toBeTruthy();
    runFrames(60);
    expect(node.scale.equals(v3(30, 30, 30))).toBeTruthy();
    runFrames(1);
    expect(cb2).toBeCalledTimes(1);

    runFrames(60); // by
    expect(target2.x).toBe(100);

    runFrames(120) // updateUnitl 2
    expect(updateUntilSuccessTimes).toBe(2);

    director.unregisterSystem(sys);
});

test('parallel with two call tween', function () {
    const sys = new TweenSystem();
    (TweenSystem.instance as any) = sys;
    director.registerSystem(TweenSystem.ID, sys, System.Priority.MEDIUM);

    const node = new Node();

    const cb1 = jest.fn(()=>{});
    const cb2 = jest.fn(()=>{});
    
    const a = tween(node).call(cb1);
    const b = tween(node).call(cb2);

    tween(node).parallel(a, b).start();

    expect(cb1).toBeCalledTimes(0);
    expect(cb2).toBeCalledTimes(0);

    runFrames(1);

    expect(cb1).toBeCalledTimes(1);
    expect(cb2).toBeCalledTimes(1);

    runFrames(60);

    expect(cb1).toBeCalledTimes(1);
    expect(cb2).toBeCalledTimes(1);

    director.unregisterSystem(sys);
});