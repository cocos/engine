import { SpriteFrame } from "../../cocos/2d/assets/sprite-frame";
import { Sprite } from "../../cocos/2d/components/sprite";
import { assetManager, loader } from "../../cocos/asset/asset-manager";
import { releaseManager } from "../../cocos/asset/asset-manager/release-manager";
import { Texture2D } from "../../cocos/asset/assets/texture-2d";
import { isValid } from "../../cocos/core/data/object";
import { Scene, Node } from "../../cocos/scene-graph";

describe('releaseManager', () => {

    const libPath = './tests/fixtures/library';      
    assetManager.init({importBase: libPath, nativeBase: libPath});

    test('reference', function () {
        const tex = new Texture2D();
        tex._uuid = 'AAA';
        expect(tex.refCount).toBe(0);
        tex.addRef();
        expect(tex.refCount).toBe(1);
        tex.decRef(false);
        expect(tex.refCount).toBe(0);
    });

    test('release', function () {
        const tex = new Texture2D();
        tex._uuid = 'AAA';
        tex.addRef();
        assetManager.assets.add('AAA', tex);
        expect(isValid(tex, true)).toBeTruthy();
        // @ts-ignore
        releaseManager._free(tex, false);
        expect(assetManager.assets.count).toBe(1);
        expect(isValid(tex, true)).toBeTruthy();
        assetManager.releaseAsset(tex);
        expect(assetManager.assets.count).toBe(0);
        expect(isValid(tex, true)).toBeFalsy();
    });

    test('release dependencies', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef();
        assetManager.assets.add('BBB', texB);
        assetManager.dependUtil._depends.add('AAA', {deps: ['BBB']});
        // @ts-ignore
        releaseManager._free(texA);
        expect(assetManager.assets.count).toBe(0);
    });

    test('release circle reference', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef();
        texB.addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef();
        assetManager.assets.add('DDD', texD);
        assetManager.dependUtil._depends.add('AAA', {deps: ['BBB']});
        assetManager.dependUtil._depends.add('BBB', {deps: ['CCC']});
        assetManager.dependUtil._depends.add('CCC', {deps: ['AAA', 'DDD']});
        assetManager.dependUtil._depends.add('DDD', {deps: ['BBB']});
        // @ts-ignore
        releaseManager._free(texA);
        expect(assetManager.assets.count).toBe(0);
    });

    test('release circle reference2', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef();
        texB.addRef();
        texB.addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef();
        assetManager.assets.add('DDD', texD);
        assetManager.dependUtil._depends.add('AAA', {deps: ['BBB']});
        assetManager.dependUtil._depends.add('BBB', {deps: ['CCC']});
        assetManager.dependUtil._depends.add('CCC', {deps: ['AAA', 'DDD']});
        assetManager.dependUtil._depends.add('DDD', {deps: ['BBB']});
        // @ts-ignore
        releaseManager._free(texA);
        expect(assetManager.assets.count).toBe(4);
        assetManager.releaseAll();
    });

    test('release circle reference3', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef().addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef().addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef();
        assetManager.assets.add('DDD', texD);
        assetManager.dependUtil._depends.add('AAA', {deps: ['BBB']});
        assetManager.dependUtil._depends.add('BBB', {deps: ['CCC', 'DDD']});
        assetManager.dependUtil._depends.add('CCC', {deps: ['AAA', 'BBB']});
        assetManager.dependUtil._depends.add('DDD', {deps: ['AAA']});
        // @ts-ignore
        releaseManager._free(texA);
        expect(assetManager.assets.count).toBe(0);
    });

    test('release circle reference4', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef().addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef().addRef().addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef().addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef();
        assetManager.assets.add('DDD', texD);
        assetManager.dependUtil._depends.add('AAA', {deps: ['BBB']});
        assetManager.dependUtil._depends.add('BBB', {deps: ['CCC', 'DDD']});
        assetManager.dependUtil._depends.add('CCC', {deps: ['AAA', 'BBB']});
        assetManager.dependUtil._depends.add('DDD', {deps: ['AAA']});
        // @ts-ignore
        releaseManager._free(texA);
        expect(assetManager.assets.count).toBe(4);
        assetManager.releaseAll();
    });

    test('release circle reference5', function () {
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef().addRef();
        assetManager.assets.add('DDD', texD);
        assetManager.dependUtil._depends.add('AAA', {deps: ['DDD', 'BBB']});
        assetManager.dependUtil._depends.add('BBB', {deps: ['CCC']});
        assetManager.dependUtil._depends.add('CCC', {deps: ['DDD']});
        assetManager.dependUtil._depends.add('DDD', {deps: ['AAA']});
        // @ts-ignore
        releaseManager._free(texA);
        
        expect(assetManager.assets.count).toBe(0);
        assetManager.releaseAll();
    });

    test('AutoRelease', function () {
        const scene1 = new Scene('');
        // @ts-expect-error set private property
        scene1._id = 'scene 1';
        const scene2 = new Scene('');
        // @ts-expect-error set private property
        scene2._id = 'scene 2';
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        texA.addRef();
        assetManager.assets.add('AAA', texA);
        const texB = new Texture2D();
        texB._uuid = 'BBB';
        texB.addRef().addRef();
        assetManager.assets.add('BBB', texB);
        const texC = new Texture2D();
        texC._uuid = 'CCC';
        texC.addRef().addRef();
        assetManager.assets.add('CCC', texC);
        const texD = new Texture2D();
        texD._uuid = 'DDD';
        texD.addRef();
        assetManager.assets.add('DDD', texD);

        assetManager.dependUtil._depends.add('scene 1', {deps: ['AAA', 'BBB', 'CCC', 'DDD']});
        assetManager.dependUtil._depends.add('scene 2', {deps: ['BBB', 'CCC']});
        releaseManager._autoRelease(scene1, scene2, {});
        // @ts-expect-error set private property
        releaseManager._freeAssets();
        expect(assetManager.assets.count).toBe(2);
        expect(texB.refCount).toBe(1);
        expect(texC.refCount).toBe(1);
        assetManager.releaseAll();
    });

    test('autoRelease_polyfill', function () {
        const scene1 = new Scene('');
        // @ts-expect-error set private property
        scene1._id = 'scene 1';
        const scene2 = new Scene('');
        // @ts-expect-error set private property
        scene2._id = 'scene 2';
        const texA = new Texture2D();
        texA._uuid = 'AAA';
        assetManager.assets.add('AAA', texA);
        loader.setAutoRelease(texA, true);
        expect(assetManager.assets.count).toBe(1);
        releaseManager._autoRelease(scene1, scene2, {});
        // @ts-expect-error set private property
        releaseManager._freeAssets();
        expect(assetManager.assets.count).toBe(0);
    });

    test('persistNode', function () {
        const scene1 = new Scene('');
        // @ts-expect-error set private property
        scene1._id = 'scene 1';
        const scene2 = new Scene('');
        // @ts-expect-error set private property
        scene2._id = 'scene 2';
        const scene3 = new Scene('');
        // @ts-expect-error set private property
        scene3._id = 'scene 3';
        const sp = new SpriteFrame();
        sp._uuid = 'AAA';
        sp.addRef();
        const tex = new Texture2D();
        tex.loaded = true;
        sp.texture = tex;
        assetManager.assets.add('AAA', sp);
        const persistNode = new Node();
        (persistNode.addComponent(Sprite) as Sprite).spriteFrame = sp;
        releaseManager._addPersistNodeRef(persistNode);
        const persistNodes = {};
        persistNodes[persistNode.uuid] = persistNode;
        assetManager.dependUtil._depends.add('scene 1', {deps: ['AAA']});
        assetManager.dependUtil._depends.add('scene 2', {deps: []});
        releaseManager._autoRelease(scene1, scene2, persistNodes);
        // @ts-expect-error set private property
        releaseManager._freeAssets();
        expect(assetManager.assets.count).toBe(1);
        expect(assetManager.assets.get('AAA')).toBe(sp);
        expect(sp.refCount).toBe(2);
        releaseManager._removePersistNodeRef(persistNode);
        expect(sp.refCount).toBe(1);
        releaseManager._autoRelease(scene2, scene3, {});
        // @ts-expect-error set private property
        releaseManager._freeAssets();
        expect(assetManager.assets.count).toBe(0);
    });

    test('Dont destroy', function () {
        const tex = new Texture2D();
        tex._uuid = 'TestDontDestroy';
        releaseManager.addIgnoredAsset(tex);
        assetManager.assets.add('TestDontDestroy', tex);
        expect(isValid(tex, true)).toBeTruthy();
        // @ts-ignore
        releaseManager._free(tex, false);
        expect(assetManager.assets.count).toBe(1);
        expect(isValid(tex, true)).toBeTruthy();
        assetManager.releaseAsset(tex);
        expect(assetManager.assets.count).toBe(1);
        expect(isValid(tex, true)).toBeTruthy();
    });

});