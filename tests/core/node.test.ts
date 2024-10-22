import { find, Node, Scene, Component, TransformBit } from "../../cocos/scene-graph"
import { Mat4, Quat, Vec3 } from "../../cocos/core/math"
import { CCObject } from "../../cocos/core";
import { NodeEventType } from "../../cocos/scene-graph/node-event";
import { ccclass } from "../../cocos/core/data/decorators";
import {director, game } from '../../cocos/game';
import { Event } from "../../exports/base";

describe(`Node`, () => {

    test('@inverseTransformPoint', () => {
        let scene = new Scene('temp');
        let parentNode = new Node();
        let subNode = new Node();
        parentNode.setPosition(20, -30, 100);
        subNode.setPosition(55, 35, 22);
        parentNode.parent = scene;
        subNode.parent = parentNode;
        let p = new Vec3(100, 200, 0);
        subNode.inverseTransformPoint(p, p);
        expect(p).toStrictEqual(new Vec3(25, 195, -122));
    });

    test('get-current-path',() => {
        let scene = new Scene('tempScene');
        
        let node1: Node = new Node();
        node1.name = 'node1';
        node1.setParent(scene);
        
        let node2: Node = new Node();
        node2.name = 'node2';
        node2.setParent(node1);

        let node3: Node = new Node();
        node3.name = 'node3';
        node3.setParent(node2);

        let node3Bro: Node = new Node();
        node3Bro.name = 'node3Bro';
        node3Bro.setParent(node2);

        let path1 = node1.getPathInHierarchy();
        expect(path1).toStrictEqual('node1');

        let path2 = node2.getPathInHierarchy();
        expect(path2).toStrictEqual('node1/node2');

        let path3 = node3.getPathInHierarchy();
        expect(path3).toStrictEqual('node1/node2/node3');

        let path3Bro = node3Bro.getPathInHierarchy();
        expect(path3Bro).toStrictEqual('node1/node2/node3Bro');
    });

    test('active-in-hierarchy-changed', () => {
        const scene = new Scene('');
        director.runSceneImmediate(scene);
        const node = new Node();
        const cb = jest.fn((node: Node) => {
            expect(node.activeInHierarchy).toBeTruthy();
        });
        node.once(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, cb);
        scene.addChild(node);

        const cb1 = jest.fn((node: Node) => {
            expect(node.activeInHierarchy).toBeFalsy();
        });
        node.once(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, cb1);
        node.active = false;
        node.once(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, cb);
        node.active = true;

        const node2 = new Node();
        scene.addChild(node2);
        node2.active = false;
        node.once(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, cb1);
        node2.addChild(node);

        node.once(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, cb);
        node.setParent(scene);
        expect(cb).toBeCalledTimes(3);
        expect(cb1).toBeCalledTimes(2);
    });

    test('active-undefined', () => {
        let scene = new Scene('temp');
        let node = new Node();
        node.parent = scene;
        
        node.active = true;
        node.active = undefined;
        expect(node.active).toBe(false);

        node.active = true;
        node.active = null;
        expect(node.active).toBe(false);

        // @ts-expect-error
        node.active = '' as boolean;
        // @ts-expect-error
        node.active = 0 as boolean;

        node.active = true;
        expect(node.active).toBe(true);
    });

    test('set parent and keep world transform', () => {
        let scene = new Scene('temp');
        let node = new Node();
        node.parent = scene;
        node.position = new Vec3(10, 3.5, -2.4);
        node.eulerAngles = new Vec3(47.5, 23, -3);
        node.scale = new Vec3(2, 0.5, 1);

        let node2 = new Node();
        node2.position = new Vec3(5, -10, 3);
        node2.eulerAngles = new Vec3(0, 90, 45);
        node2.scale = new Vec3(1, 1, 2);
        node2.parent = scene;
        const globalPosition = node2.worldPosition.clone();

        node2.setParent(node, true);
        node2.updateWorldTransform();
        expect(node2.worldPosition.equals(globalPosition)).toBeTruthy();
        expect(Vec3.transformMat4(new Vec3(), new Vec3(0, 0, 0), node2.worldMatrix).equals(new Vec3(5, -10, 3))).toBeTruthy();
        expect(Mat4.multiply(new Mat4, Mat4.invert(new Mat4, node.worldMatrix), node2.worldMatrix).equals(Mat4.fromRTS(new Mat4(), node2.rotation, node2.position, node2.scale))).toBeTruthy();

        node2.setParent(scene, true);
        node2.updateWorldTransform();
        expect(node2.worldPosition.equals(globalPosition)).toBeTruthy();
        expect(Vec3.transformMat4(new Vec3(), new Vec3(0, 0, 0), node2.worldMatrix).equals(new Vec3(5, -10, 3))).toBeTruthy();
        expect(node2.worldMatrix.equals(Mat4.fromRTS(new Mat4(), node2.rotation, node2.position, node2.scale))).toBeTruthy();
        const rot = node2.rotation.clone();
        const scale = node2.scale.clone();
        const pos = node2.position.clone();
        const worldMat = node2.worldMatrix.clone();

        // set parent's scale to zero
        node.scale = new Vec3(0, 2, 1);
        node2.setParent(node, true);
        node2.updateWorldTransform();
        expect(node2.position.equals(pos)).toBeTruthy();
        expect(node2.rotation.equals(rot)).toBeTruthy();
        expect(node2.scale.equals(scale)).toBeTruthy();
        expect(node2.worldPosition.equals(globalPosition)).toBeFalsy();
        expect(node2.worldMatrix.equals(worldMat)).toBeFalsy();
        expect(Mat4.determinant(node2.worldMatrix)).toBeCloseTo(0, 6);
    });
    
    test('component event', () => {
        let onLoadCalled = false;
        let onDestroyCalled = false;
        @ccclass('TestComponent')
        class TestComponent extends Component {
            onLoad () {
                onLoadCalled = true;
            }

            onDestroy () {
                onDestroyCalled = true;
            }
        }

        const scene = new Scene('');
        director.runSceneImmediate(scene);
        const node = new Node();
        let compParam;
        const addCb = jest.fn((tempComp) => { compParam = tempComp; expect(onLoadCalled).toBeFalsy(); });
        const removeCb = jest.fn((tempComp) => { 
            compParam = tempComp; 
            if (onLoadCalled) { 
                expect(onDestroyCalled).toBeTruthy(); 
            } else {
                expect(onDestroyCalled).toBeFalsy(); 
            }
        });
        node.on(NodeEventType.COMPONENT_ADDED, addCb);
        node.on(NodeEventType.COMPONENT_REMOVED, removeCb)
        let comp = node.addComponent(TestComponent);
        expect(addCb).toBeCalledTimes(1);
        expect(comp).toBe(compParam);
        expect(onLoadCalled).toBeFalsy();
        node.removeComponent(comp);
        game.step();
        expect(removeCb).toBeCalledTimes(1);
        expect(comp).toBe(compParam);
        expect(onDestroyCalled).toBeFalsy();
        scene.addChild(node);
        comp = node.addComponent(TestComponent);
        expect(addCb).toBeCalledTimes(2);
        expect(comp).toBe(compParam);
        expect(onLoadCalled).toBeTruthy();
        comp.destroy();
        game.step();
        expect(removeCb).toBeCalledTimes(2);
        expect(comp).toBe(compParam);
        expect(onDestroyCalled).toBeTruthy();

        onLoadCalled = onDestroyCalled = false;
        comp = node.addComponent(TestComponent);
        expect(addCb).toBeCalledTimes(3);
        expect(comp).toBe(compParam);
        expect(onLoadCalled).toBeTruthy();
        comp._destroyImmediate();
        expect(removeCb).toBeCalledTimes(3);
        expect(comp).toBe(compParam);
        expect(onDestroyCalled).toBeTruthy();
    });

    test('query component with abstracted class', () => {
        abstract class BaseComponent extends Component {
            abstract testMethod ();
        }

        @ccclass('abc')
        class TestComponent extends BaseComponent {
            testMethod () {
                console.log('test');
            }
        }

        const node = new Node('test');
        const scene = new Scene('test-scene');
        director.runScene(scene);
        scene.addChild(node);
        const testComp = node.addComponent(TestComponent);
        expect(node.getComponent(BaseComponent)).toBe(testComp);
    });

    test('persist node', () => {
        const sceneA = new Scene('A');
        director.runSceneImmediate(sceneA);
        const nodeA = new Node('test a');
        sceneA.addChild(nodeA);
        game.addPersistRootNode(nodeA);
        const sceneB = new Scene('B');
        director.runSceneImmediate(sceneB);
        expect(find('test a')).toBe(nodeA);
        expect(nodeA._persistNode).toBeTruthy();
        expect(nodeA.hideFlags & CCObject.Flags.DontSave).toBeTruthy();

        const nodeB = new Node('test b');
        game.addPersistRootNode(nodeB);
        expect(nodeB._persistNode).toBeTruthy();
        expect(find('test b')).toBeTruthy();

        const sceneC = new Scene('C');
        // @ts-expect-error access priority
        sceneC._id = sceneA.uuid;
        const nodeC = new Node('test c');
        // @ts-expect-error access priority
        nodeC._id = nodeA.uuid;
        sceneC.addChild(nodeC);
        director.runSceneImmediate(sceneC);
        expect(find('test c')).toBeFalsy();
        expect(find('test a')).toBe(nodeA);
        expect(nodeA.hideFlags & CCObject.Flags.DontSave).toBeFalsy();
    });

    test('flagChangedVersion', () => {
        const node = new Node();
        const val1 = node.flagChangedVersion;
        expect(val1).toBe(0);
        node.position = new Vec3(1, 2, 3);
        const val2 = node.flagChangedVersion;
        expect(val2).not.toBe(val1);
        node.position = new Vec3(1, 2, 3);
        node.scale = new Vec3(1, 2, 3);
        node.eulerAngles = new Vec3(1, 2, 3);
        expect(node.flagChangedVersion).toBe(val2);
        Node.resetHasChangedFlags();
        node.scale = new Vec3(3, 2, 1);
        const val3 = node.flagChangedVersion;
        expect(val3).not.toBe(val2);
        expect(val3).not.toBe(val1);
        node.scale = new Vec3(1, 2, 3);
        expect(node.flagChangedVersion).toBe(val3);
        Node.resetHasChangedFlags();
        node.eulerAngles = new Vec3(3, 2, 1);
        const val4 = node.flagChangedVersion;
        expect(val4).not.toBe(val3);
        expect(val4).not.toBe(val2);
        expect(val4).not.toBe(val1);
        node.eulerAngles = new Vec3(1, 2, 3);
        expect(node.flagChangedVersion).toBe(val4);
    });

    test('setScale', () => {
        const node = new Node();

        let scale = new Vec3(2, 3, 4);
        node.setScale(scale);
        let scale1 = node.getScale();
        expect(scale1.equals(scale)).toBeTruthy();

        let scaleChanged = false;
        node.on(NodeEventType.TRANSFORM_CHANGED, (arg: TransformBit) => {
            if (arg === TransformBit.SCALE) {
                scaleChanged = true;
            }
        });

        scale.x += 1;
        node.setScale(scale);
        expect(scaleChanged).toBe(true);

        scaleChanged = false;
        scale.y += 1;
        node.setScale(scale);
        expect(scaleChanged).toBe(true);

        scaleChanged = false;
        scale.z += 1;
        node.setScale(scale);
        expect(scaleChanged).toBe(true);

        scaleChanged = false;
        scale1 = node.getScale();
        node.setScale(scale1.x + 1, scale1.y);
        expect(scaleChanged).toBe(true);

        scaleChanged = false;
        scale1 = node.getScale();
        node.setScale(scale1.x, scale1.y + 1);
        expect(scaleChanged).toBe(true);

        scaleChanged = false;
        scale1 = node.getScale();
        node.setScale(scale1.x, scale1.y, scale1.z + 1);
        expect(scaleChanged).toBe(true);
    });

    test('setPosition', () => {
        const node = new Node();

        let pos = new Vec3(2, 3, 4);
        node.setPosition(pos);
        let pos1 = node.getPosition();
        expect(pos1.equals(pos)).toBeTruthy();

        let positionChanged = false;
        node.on(NodeEventType.TRANSFORM_CHANGED, (arg: TransformBit) => {
            if (arg === TransformBit.POSITION) {
                positionChanged = true;
            }
        });

        pos.x += 1;
        node.setPosition(pos);
        expect(positionChanged).toBe(true);

        positionChanged = false;
        pos.y += 1;
        node.setPosition(pos);
        expect(positionChanged).toBe(true);

        positionChanged = false;
        pos.z += 1;
        node.setPosition(pos);
        expect(positionChanged).toBe(true);

        positionChanged = false;
        pos1 = node.getPosition();
        node.setPosition(pos1.x + 1, pos1.y);
        expect(positionChanged).toBe(true);

        positionChanged = false;
        pos1 = node.getPosition();
        node.setPosition(pos1.x, pos1.y + 1);
        expect(positionChanged).toBe(true);

        positionChanged = false;
        pos1 = node.getPosition();
        node.setPosition(pos1.x, pos1.y, pos.z + 1);
        expect(positionChanged).toBe(true);
    });

    test('setRotation', () => {
        const node = new Node();

        let quat = new Quat(2, 3, 4);
        node.setRotation(quat);
        let quat1 = node.getRotation();
        expect(quat1.equals(quat)).toBeTruthy();

        let rotationChanged = false;
        node.on(NodeEventType.TRANSFORM_CHANGED, (arg: TransformBit) => {
            if (arg === TransformBit.ROTATION) {
                rotationChanged = true;
            }
        });

        quat.x += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat.y += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat.z += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat = node.getRotation();
        quat.x += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat = node.getRotation();
        quat.y += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat = node.getRotation();
        quat.z += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);

        rotationChanged = false;
        quat = node.getRotation();
        quat.w += 1;
        node.setRotation(quat);
        expect(rotationChanged).toBe(true);
    });

    // refer to https://github.com/cocos/cocos-engine/issues/16914 for detail information
    test ('dispatch event with nested', () => {
        let son = new Node('son');

        let father = new Node('father');
        father.on('event2', () => {
            
        }, null, true);

        father.on('event1', () => {
        }, null, true);

        father.addChild(son);

        let grandFather = new Node('grandfather');
        grandFather.on('event2', () => {
            let event = new Event('event1');
            event.propagationStopped = true;
            son.dispatchEvent(event);
        }, null, true);
        grandFather.addChild(father);

        son.dispatchEvent(new Event('event2', true));
    });

    test ('setWorldPosition', ()=> {
        let parent = new Node();
        parent.setPosition(100, 100);

        let son = new Node();
        expect(son.getPosition()).toEqual(new Vec3(0, 0, 0));

        son.parent = parent;
        son.setWorldPosition(Vec3.ZERO);
        expect(son.getPosition()).toEqual(new Vec3(-100, -100, 0));
    });
    
    test ('setWorldRotation', ()=> {
        let parent = new Node();

        // rotate pi/60 around x axis
        const angle = Math.PI / 6;
        parent.setRotation(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));

        let son = new Node();
        expect(son.getRotation()).toEqual(Quat.IDENTITY);

        son.parent = parent;
        son.setWorldRotation(Quat.IDENTITY);
        expect(son.getRotation()).toEqual(new Quat(Math.sin(-angle / 2), 0, 0, Math.cos(-angle / 2)));
    });

    test ('setWorldRotationFromEuler', ()=> {
        let parent = new Node();

        // rotate 30 degrees around x axis
        parent.setWorldRotationFromEuler(30, 0, 0);

        let son = new Node();
        expect(son.getRotation()).toEqual(Quat.IDENTITY);

        son.parent = parent;
        son.setWorldRotationFromEuler(0, 0, 0);

        let quat = new Quat();
        Quat.fromEuler(quat, -30, 0, 0);
        expect(son.getRotation()).toEqual(quat);
    });

    test ('setWorldScale', ()=> {
        let parent = new Node();

        parent.setScale(2, 3, 4);

        let son = new Node();
        expect(son.getScale()).toEqual(new Vec3(1, 1, 1));

        son.parent = parent;
        son.setWorldScale(1, 1, 1);

        expect(son.getScale()).toEqual(new Vec3(1/2, 1/3, 1/4));
    });

    test ('setWorldScale(0, 0, 0)', ()=> {
        let parent = new Node();

        parent.setScale(2, 2, 2);

        let son = new Node();
        son.parent = parent;
        son.updateWorldTransform();

        son.setWorldScale(0, 0, 0);
        expect(son.scale).toEqual(new Vec3(0, 0, 0));
        expect(son.worldScale).toEqual(new Vec3(0, 0, 0));
        expect(son.worldMatrix).toEqual(new Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1));

        son.setWorldScale(1, 1, 1);
        expect(son.scale).toEqual(new Vec3(0.5, 0.5, 0.5));
        expect(son.worldScale).toEqual(new Vec3(1, 1, 1));
        expect(son.worldMatrix).toEqual(new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));

        son.setWorldScale(2, 2, 2);
        expect(son.scale).toEqual(new Vec3(1, 1, 1));
        expect(son.worldScale).toEqual(new Vec3(2, 2, 2));
        expect(son.worldMatrix).toEqual(new Mat4(2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1));

        son.setWorldScale(0, 0, 0);
        expect(son.scale).toEqual(new Vec3(0, 0, 0));
        expect(son.worldScale).toEqual(new Vec3(0, 0, 0));
        expect(son.worldMatrix).toEqual(new Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1));

    });

    test ('setWorldScale(0, 0, 0) and rotation', ()=> {
        let parent = new Node();

        parent.setScale(2, 2, 2);

        let son = new Node();
        son.setRotationFromEuler(10, 0, 0);
        son.parent = parent;
        son.updateWorldTransform();
        expect(son.scale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(2, 2, 2))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            2, 0, 0, 0,
            0, 1.969615506024416, 0.34729635533386066, 0,
            0, -0.34729635533386066, 1.969615506024416, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        son.setWorldScale(0, 0, 0);
        expect(son.scale.equals(new Vec3(0, 0, 0))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(0, 0, 0))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        son.setWorldScale(2, 2, 2);
        expect(son.scale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(2, 2, 2))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            2, 0, 0, 0,
            0, 1.969615506024416, 0.34729635533386066, 0,
            0, -0.34729635533386066, 1.969615506024416, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        son.setWorldScale(1, 1, 1);
        expect(son.scale.equals(new Vec3(0.5, 0.5, 0.5))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            1, 0, 0, 0,
            0, 0.984807753012208, 0.17364817766693033, 0,
            0, -0.17364817766693033, 0.984807753012208, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

    });

    test ('setWorldScale(0, y, z) and rotation', ()=> {
        let parent = new Node();

        parent.setScale(2, 2, 2);

        let son = new Node();
        son.setRotationFromEuler(10, 10, 10);
        son.parent = parent;
        son.updateWorldTransform();
        expect(son.scale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(2, 2, 2))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            1.9396926207859084, 0.3472963553338607, -0.3420201433256687, 0,
            -0.2765167096193736, 1.9396926207859084, 0.40141131793955337, 0,
            0.40141131793955337, -0.3420201433256687, 1.9292203542855129, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        son.setWorldScale(0, 2, 2);
        expect(son.scale.equals(new Vec3(0, 1, 1))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(0, 2, 2))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            0, 0, 0, 0,
            -0.2765167096193736, 1.9396926207859084, 0.40141131793955337, 0,
            0.40141131793955337, -0.3420201433256687, 1.9292203542855129, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        expect(son.rotation.equals(new Quat(0.09406091491321403, 0.09406091491321403, 0.07892647901187543, 0.9879654343559627))).toBeTruthy();
        expect(son.worldRotation.equals(new Quat(0, 0, 0, 1))).toBeTruthy(); // Could not decompose rotation in Mat4.toSRT since there is a axis is zero, so the rotation will be reset to unit quaternion.

        son.setRotationFromEuler(20, 20, 20);
        expect(son.rotation.equals(new Quat(0.1981076317236749, 0.1981076317236749, 0.1387164571097902, 0.9498760324550678))).toBeTruthy();
        expect(son.worldRotation.equals(new Quat(0, 0, 0, 1))).toBeTruthy();

        son.setRotationFromEuler(10, 10, 10);
        expect(son.rotation.equals(new Quat(0.09406091491321403, 0.09406091491321403, 0.07892647901187543, 0.9879654343559627))).toBeTruthy();
        expect(son.worldRotation.equals(new Quat(0, 0, 0, 1))).toBeTruthy();

        son.setWorldScale(1, 1, 1);
        expect(son.scale.equals(new Vec3(0.5, 0.5, 0.5))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            0.9698463103929542, 0.17364817766693036, -0.17101007166283436, 0,
            -0.1382583548096868, 0.9698463103929542, 0.20070565896977668, 0,
            0.20070565896977668, -0.17101007166283436, 0.9646101771427564, 0,
            0, 0, 0, 1
        ))).toBeTruthy();
        expect(son.rotation.equals(new Quat(0.09406091491321403, 0.09406091491321403, 0.07892647901187543, 0.9879654343559627))).toBeTruthy();
        expect(son.worldRotation.equals(new Quat(0.09406091491321403, 0.09406091491321403, 0.07892647901187543, 0.9879654343559627))).toBeTruthy();

        son.setWorldScale(2, 0, 0);
        expect(son.scale.equals(new Vec3(1, 0, 0))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(2, 0, 0))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            1.9396926207859084, 0.3472963553338607, -0.3420201433256687, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1
        ))).toBeTruthy();

        son.setWorldScale(2, 2, 2);
        expect(son.scale.equals(new Vec3(1, 1, 1))).toBeTruthy();
        expect(son.worldScale.equals(new Vec3(2, 2, 2))).toBeTruthy();
        expect(son.worldMatrix.equals(new Mat4(
            1.9396926207859084, 0.3472963553338607, -0.3420201433256687, 0,
            -0.2765167096193736, 1.9396926207859084, 0.40141131793955337, 0,
            0.40141131793955337, -0.3420201433256687, 1.9292203542855129, 0,
            0, 0, 0, 1
        ))).toBeTruthy();
    });

    test ('angle', ()=> {
        let node = new Node();

        // Rotate counterclockwise 90 degrees around the z-axis.
        let theta = Math.PI / 2;
        node.setWorldRotation(0, 0, Math.cos(theta / 2), Math.sin(theta / 2));

        expect(node.angle).toEqual(theta / Math.PI * 180);
    });
});
