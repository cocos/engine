/*
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

import { ccclass, executeInEditMode, executionOrder, help, menu, serializable, type, visible } from 'cc.decorator';
import { builtinResMgr } from '../../asset/asset-manager';
import { Material } from '../../asset/assets';
import { Color, Vec2, cclegacy } from '../../core';
import { ModelLocalBindings } from '../../rendering/define';
import { Model } from '../../render-scene/scene';
import type { Root } from '../../root';
import { TransformBit } from '../../scene-graph/node-enum';
import { SpriteFrame } from '../assets/sprite-frame';
import { ModelRenderer } from '../../misc';

enum SpriteMode {
    SIMPLE = 0,
    SLICED = 1,
    TILED = 2,
}

/**
 * @en 2D rendering component that provides the ability to render sprite in 3D space.
 * @zh 2D 渲染基础组件，提供精灵渲染在 3D 空间中的能力。
 */
@ccclass('cc.SpriteRenderer')
@help('i18n:cc.SpriteRenderer')
@executionOrder(100)
@menu('2D/SpriteRenderer')
@executeInEditMode
export class SpriteRenderer extends ModelRenderer {
    constructor () {
        super();
    }

    /**
    * @en The spriteFrame that the component should render.
    * @zh 该组件应渲染的 spriteFrame。
    */
    @type(SpriteFrame)
    get spriteFrame (): SpriteFrame | null {
        return this._spriteFrame;
    }

    set spriteFrame (value) {
        if (this._spriteFrame === value) {
            return;
        }

        const lastSprite = this._spriteFrame;
        this._spriteFrame = value;
        if (this._spriteFrame) {
            this._spriteFrame.ensureMeshData(); // Make sure the mesh is available, you should call it before using the mesh
            const mesh = this._spriteFrame.mesh!;
            mesh.initialize();
        }
        this._updateModels();
        if (this.enabledInHierarchy) {
            this._attachToScene();
        }
        // TODO Update on Editor
    }

    /**
     * @en Rendering model of the component.
     * @zh 该组件的渲染模型。
     */
    get model (): Model | null {
        return this._model;
    }

    @serializable
    protected _spriteFrame: SpriteFrame | null = null;
    @serializable
    protected _mode = SpriteMode.SIMPLE;
    @serializable
    protected _color: Color = Color.WHITE.clone();
    @serializable
    protected _flipX = false;
    @serializable
    protected _flipY = false;
    @visible(false)
    @serializable
    protected _size: Vec2 = new Vec2(); // todo for sliced & tiled

    private _model: Model | null = null;

    public onLoad (): void {
        if (this._spriteFrame) {
            if (!this._spriteFrame.mesh) {
                this._spriteFrame.ensureMeshData();
            }
            this._spriteFrame.mesh!.initialize();
        }
        this._updateModels();
    }

    public onRestore (): void {
        this._updateModels();
        if (this.enabledInHierarchy) {
            this._attachToScene();
        }
    }

    public onEnable (): void {
        super.onEnable();
        if (!this._model) {
            this._updateModels();
        }
        this._attachToScene();
    }

    public onDisable (): void {
        if (this._model) {
            this._detachFromScene();
        }
    }

    public onDestroy (): void {
        if (this._model) {
            (cclegacy.director.root as Root).destroyModel(this._model);
            this._model = null;
            this._models.length = 0;
        }
    }

    protected _updateModels (): void {
        if (!this._spriteFrame) {
            return;
        }

        const model = this._model;
        if (model) {
            model.destroy();
            model.initialize();
            model.node = model.transform = this.node;
        } else {
            this._createModel();
        }

        if (this._model) {
            const mesh = this._spriteFrame.mesh!;
            this._model.createBoundingShape(mesh.struct.minPosition, mesh.struct.maxPosition);
            this._updateModelParams();
            this._onUpdateLocalDescriptorSet();
        }
    }

    protected _createModel (): void {
        const model = this._model = (cclegacy.director.root as Root).createModel<Model>(Model);
        model.visFlags = this.visibility;
        model.node = model.transform = this.node;
        this._models.length = 0;
        this._models.push(this._model);
    }

    protected _updateModelParams (): void {
        if (!this._spriteFrame || !this._model) { return; }
        this._spriteFrame.ensureMeshData();
        const mesh = this._spriteFrame.mesh!;
        this.node.hasChangedFlags |= TransformBit.POSITION; // Same as model, Maybe a hack
        this._model.transform.hasChangedFlags |= TransformBit.POSITION;
        const renderingMesh = mesh ? mesh.renderingSubMeshes : null;
        if (renderingMesh) {
            const meshCount = renderingMesh.length;
            for (let i = 0; i < meshCount; ++i) {
                let material = this.getRenderMaterial(i);
                if (material && !material.isValid) {
                    material = null;
                }
                const subMeshData = renderingMesh[i];
                if (subMeshData) {
                    this._model.initSubModel(i, subMeshData, material || this._getBuiltinMaterial());
                }
            }
        }
        this._model.enabled = true;
    }

    protected _getBuiltinMaterial (): Material {
        // classic ugly pink indicating missing material
        return builtinResMgr.get<Material>('missing-material');
    }

    protected _onMaterialModified (idx: number, material: Material | null): void {
        super._onMaterialModified(idx, material);
        if (!this._spriteFrame || !this._model || !this._model.inited) {
            return;
        }
        this._onRebuildPSO(idx, material || this._getBuiltinMaterial());
    }

    /**
     * @engineInternal
     */
    public _onRebuildPSO (idx: number, material: Material): void {
        if (!this._model || !this._model.inited) { return; }
        this._model.setSubModelMaterial(idx, material);
        this._onUpdateLocalDescriptorSet();
    }

    protected _onUpdateLocalDescriptorSet (): void {
        if (!this._spriteFrame || !this._model || !this._model.inited) {
            return;
        }

        const texture = this._spriteFrame.getGFXTexture()!;
        const sampler = this._spriteFrame.getGFXSampler();
        // We need a api like updateLocalDescriptors(texture,sampler,binding) from model
        const subModels = this._model.subModels;
        const binding = ModelLocalBindings.SAMPLER_SPRITE;
        for (let i = 0; i < subModels.length; i++) {
            const { descriptorSet } = subModels[i];
            descriptorSet.bindTexture(binding, texture);
            descriptorSet.bindSampler(binding, sampler);
            descriptorSet.update();
        }
    }

    protected _attachToScene (): void {
        if (!this.node.scene || !this._model) {
            return;
        }
        const renderScene = this._getRenderScene();
        if (this._model.scene !== null) {
            this._detachFromScene();
        }
        renderScene.addModel(this._model);
    }

    /**
     * @engineInternal
     */
    public _detachFromScene (): void {
        if (this._model && this._model.scene) {
            this._model.scene.removeModel(this._model);
        }
    }
}
