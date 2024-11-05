/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import {
    ccclass, executeInEditMode, executionOrder, help, menu, type,
} from 'cc.decorator';
import type { AnimationClip } from '../../animation/animation-clip';
import { Material } from '../../asset/assets';
import { Skeleton } from '../assets/skeleton';
import { Node } from '../../scene-graph/node';
import { MeshRenderer } from '../framework/mesh-renderer';
import type { SkeletalAnimation } from '../skeletal-animation';
import { cclegacy, assertIsTrue } from '../../core';
import { SkinningModel } from '../models/skinning-model';
import { BakedSkinningModel } from '../models/baked-skinning-model';
import type { Root } from '../../root';

/**
 * @en The skinned mesh renderer component.
 * @zh 蒙皮网格渲染器组件。
 */
@ccclass('cc.SkinnedMeshRenderer')
@help('i18n:cc.SkinnedMeshRenderer')
@executionOrder(100)
@executeInEditMode
@menu('Mesh/SkinnedMeshRenderer')
export class SkinnedMeshRenderer extends MeshRenderer {
    @type(Skeleton)
    protected _skeleton: Skeleton | null = null;

    @type(Node)
    protected _skinningRoot: Node | null = null;

    protected _clip: AnimationClip | null = null;

    /**
     * @en The skeleton asset.
     * @zh 骨骼资源。
     */
    @type(Skeleton)
    get skeleton (): Skeleton | null {
        return this._skeleton;
    }

    set skeleton (val) {
        if (val === this._skeleton) { return; }
        this._skeleton = val;
        this._update();
    }

    /**
     * @en The skinning root. (The node where the controlling Animation is located)
     * @zh 骨骼根节点的引用，对应控制此模型的动画组件所在节点。
     */
    @type(Node)
    get skinningRoot (): Node | null {
        return this._skinningRoot;
    }

    set skinningRoot (value) {
        if (value === this._skinningRoot) { return; }
        this._skinningRoot = value;
        this._tryBindAnimation();
        this._update();
    }

    get model (): SkinningModel | BakedSkinningModel | null {
        return this._model as SkinningModel | BakedSkinningModel | null;
    }

    /**
     * Set associated animation.
     * @internal This method only friends to skeletal animation component.
     */
    public associatedAnimation: SkeletalAnimation | null = null;

    constructor () {
        super();
        this._modelType = BakedSkinningModel;
    }

    public onLoad (): void {
        super.onLoad();
        this._tryBindAnimation();
    }

    public onDestroy (): void {
        if (this.associatedAnimation) {
            this.associatedAnimation.notifySkinnedMeshRemoved(this);
            assertIsTrue(this.associatedAnimation === null);
        }

        super.onDestroy();
    }

    public uploadAnimation (clip: AnimationClip | null): void {
        this._clip = clip;
        if (this.model && this.model.uploadAnimation) {
            this.model.uploadAnimation(clip);
        }
    }

    /**
     * Set if bake mode should be used.
     * @internal This method only friends to skeletal animation component.
     */
    public setUseBakedAnimation (val = true, force = false): void {
        const modelType = val ? BakedSkinningModel : SkinningModel;
        if (!force && this._modelType === modelType) { return; }
        this._modelType = modelType;
        if (this._model) {
            (cclegacy.director.root as Root).destroyModel(this._model);
            this._model = null;
            this._models.length = 0;
            this._updateModels();
            this._updateCastShadow();
            this._updateReceiveShadow();
            this._updateUseLightProbe();
            if (this.enabledInHierarchy) {
                this._attachToScene();
            }
        }
    }

    public setSharedMaterial (material: Material | null, index: number): void {
        super.setSharedMaterial(material, index);
        if (this._modelType === SkinningModel) {
            this.getMaterialInstance(index);
        }
    }

    protected _updateModelParams (): void {
        this._update(); // should bind skeleton before super create pso
        super._updateModelParams();
    }

    private _tryBindAnimation (): void {
        const { _skinningRoot: skinningRoot } = this;
        if (!skinningRoot) {
            return;
        }

        let skinningRootIsParent = false;
        for (let current: Node | null = this.node; current; current = current.parent) {
            if (current === skinningRoot) {
                skinningRootIsParent = true;
                break;
            }
        }
        if (!skinningRootIsParent) {
            return;
        }

        const animation = skinningRoot.getComponent('cc.SkeletalAnimation') as SkeletalAnimation;
        if (animation && animation.enabledInHierarchy) {
            animation.notifySkinnedMeshAdded(this);
        } else {
            this.setUseBakedAnimation(false);
        }
    }

    private _update (): void {
        if (this.model) {
            this.model.bindSkeleton(this._skeleton, this._skinningRoot, this._mesh);
            if (this.model.uploadAnimation) { this.model.uploadAnimation(this._clip); }
        }
    }
}
