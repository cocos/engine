/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { ccclass, serializable, editable } from 'cc.decorator';
import { EDITOR, TEST } from 'internal:constants';
import { CCObject } from '../core/data/object';
import { assert, getError } from '../core/platform/debug';
import { RenderScene } from '../render-scene/core/render-scene';
import { Node } from './node';
import { legacyCC } from '../core/global-exports';
import { Component } from './component';
import { SceneGlobals } from './scene-globals';
import { applyTargetOverrides, expandNestedPrefabInstanceNode } from './prefab/utils';

/**
 * @en
 * Scene is a subclass of [[Node]], composed by nodes, representing the root of a runnable environment in the game.
 * It's managed by [[Director]] and user can switch from a scene to another using [[Director.loadScene]]
 * @zh
 * Scene 是 [[Node]] 的子类，由节点所构成，代表着游戏中可运行的某一个整体环境。
 * 它由 [[Director]] 管理，用户可以使用 [[Director.loadScene]] 来切换场景
 */
@ccclass('cc.Scene')
export class Scene extends Node {
    /**
     * @en The renderer scene, normally user don't need to use it
     * @zh 渲染层场景，一般情况下用户不需要关心它
     */
    get renderScene (): RenderScene | null {
        return this._renderScene;
    }

    @editable
    get globals (): SceneGlobals {
        return this._globals;
    }

    /**
     * @en Indicates whether all (directly or indirectly) static referenced assets of this scene are releasable by default after scene unloading.
     * @zh 指示该场景中直接或间接静态引用到的所有资源是否默认在场景切换后自动释放。
     */
    @serializable
    @editable
    public autoReleaseAssets = false;

    /**
     * @en Per-scene level rendering info
     * @zh 场景级别的渲染信息
     *
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _globals = new SceneGlobals();

    public dependAssets = null; // cache all depend assets for auto release

    protected _renderScene: RenderScene | null = null;

    protected declare _inited: boolean;

    protected _prefabSyncedInLiveReload = false;

    protected _updateScene (): void {
        this._scene = this;
    }

    constructor (name: string) {
        super(name);
        this._activeInHierarchy = false;
        if (legacyCC.director && legacyCC.director.root) {
            this._renderScene = legacyCC.director.root.createScene({});
        }
        this._inited = legacyCC.game ? !legacyCC.game._isCloning : true;
    }

    /**
     * @en Destroy the current scene and all its nodes, this action won't destroy related assets
     * @zh 销毁当前场景中的所有节点，这个操作不会销毁资源
     */
    public destroy (): boolean {
        const success = CCObject.prototype.destroy.call(this);
        if (success) {
            const children = this._children;
            for (let i = 0; i < children.length; ++i) {
                children[i].active = false;
            }
        }
        if (this._renderScene) legacyCC.director.root.destroyScene(this._renderScene);
        this._active = false;
        this._activeInHierarchy = false;
        return success;
    }

    /**
     * @en Only for compatibility purpose, user should not add any component to the scene
     * @zh 仅为兼容性保留，用户不应该在场景上直接添加任何组件
     */
    public addComponent(...args: any[]): Component;

    /**
     * @en Only for compatibility purpose, user should not add any component to the scene
     * @zh 仅为兼容性保留，用户不应该在场景上直接添加任何组件
     */
    public addComponent (): Component {
        throw new Error(getError(3822));
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onHierarchyChanged (): void {
        // do nothing
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onPostActivated (active: boolean): void {
        // do nothing
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onBatchCreated (dontSyncChildPrefab: boolean): void {
        const len = this._children.length;
        for (let i = 0; i < len; ++i) {
            this._children[i]._siblingIndex = i;
            this._children[i]._onBatchCreated(dontSyncChildPrefab);
        }
    }

    /**
     * @en
     * Refer to [[Node.updateWorldTransform]]
     * @zh
     * 参考 [[Node.updateWorldTransform]]
     */
    public updateWorldTransform (): void {
        // do nothing
    }

    // life-cycle call backs

    protected _instantiate (cloned?: Node | null, isSyncedNode: boolean = false): Node {
        // Can not initialize scene.
        return null as unknown as Node;
    }

    /**
     * @engineInternal
     * @mangle
     */
    public _load (): void {
        if (!this._inited) {
            if (TEST) {
                assert(!this._activeInHierarchy, 'Should deactivate ActionManager by default');
            }

            expandNestedPrefabInstanceNode(this);
            applyTargetOverrides(this);
            this._onBatchCreated(EDITOR && this._prefabSyncedInLiveReload);
            this._inited = true;
        }
        // static method can't use this as parameter type
        this.walk(Node._setScene);
    }

    /**
     * @engineInternal
     * @mangle
     */
    public _activate (active = true): void {
        if (EDITOR) {
            // register all nodes to editor
            // TODO: `_registerIfAttached` is injected property
            // issue: https://github.com/cocos/cocos-engine/issues/14643
            (this as any)._registerIfAttached!(active);
        }
        legacyCC.director._nodeActivator.activateNode(this, active);
        // The test environment does not currently support the renderer
        if (!TEST) {
            this._globals.activate(this);
        }
    }
}

legacyCC.Scene = Scene;
