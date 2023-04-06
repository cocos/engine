/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import { ccclass, visible, override, executeInEditMode, requireComponent, menu } from 'cc.decorator';
import { legacyCC } from '../core/global-exports';
import { ModelRenderer } from '../core';
import { ParticleEmitter } from './particle-emitter';
import { vfxManager } from './vfx-manager';
import { scene } from '../core/renderer';
import { RendererModule } from './modules/renderer';

@ccclass('cc.ParticleRenderer')
@menu('Effects/ParticleRenderer')
@executeInEditMode
@requireComponent(ParticleEmitter)
export class ParticleRenderer extends ModelRenderer {
    @override
    @visible(false)
    get sharedMaterials () {
        return super.sharedMaterials;
    }

    set sharedMaterials (val) {
        super.sharedMaterials = val;
    }

    private _model: scene.Model | null = null;
    private _emitter: ParticleEmitter | null = null;

    public onEnable () {
        this._emitter = this.getComponent(ParticleEmitter);
        if (!this._model) {
            this._model = legacyCC.director.root.createModel(scene.Model) as scene.Model;
            this._model.visFlags = this.node.layer;
            this._model.node = this._model.transform = this.node;
        }
        this._models.push(this._model);
        this._getRenderScene().addModel(this._model);
        vfxManager.addRenderer(this);
    }

    public onDisable () {
        this._model!.scene!.removeModel(this._model!);
        this._models.length = 0;
        vfxManager.removeRenderer(this);
    }

    public onDestroy () {
        if (this._model) {
            legacyCC.director.root.destroyModel(this._model);
            this._model = null;
        }
    }

    // internal function
    public updateRenderData () {
        if (!this._emitter || !this._model) return;
        const { particles } = this._emitter;
        this._model.enabled = particles.count !== 0;
        if (particles.count === 0) {
            return;
        }
        this._emitter.render();
        const model = this._model;
        const subModels = model.subModels;
        const rendererModules = this._emitter.renderStage.modules;
        const materials = this._materials;
        const materialInstances = this._materialInstances;
        let subModelIndex = 0;
        for (let i = 0, length = rendererModules.length; i < length; i++) {
            const module = rendererModules[i];
            if (!(module instanceof RendererModule) || !module.enabled) continue;
            const { renderingSubMesh, material, sharedMaterial } = module;
            if (renderingSubMesh && material) {
                let materialDirty = false;
                if (materialInstances[subModelIndex] !== material) {
                    materials[subModelIndex] = sharedMaterial;
                    materialInstances[subModelIndex] = material;
                    materialDirty = true;
                }
                let subModel = subModels[subModelIndex];
                if (!subModel) {
                    model.initSubModel(subModelIndex, renderingSubMesh, material);
                    subModel = subModels[subModelIndex];
                } else if (subModel.subMesh !== renderingSubMesh || materialDirty) {
                    model.setSubModelMesh(i, renderingSubMesh);
                    model.setSubModelMaterial(i, material);
                }
                subModel.inputAssembler.instanceCount = module.instanceCount;
                subModel.inputAssembler.vertexCount = module.vertexCount;
                subModel.inputAssembler.indexCount = module.indexCount;
                subModelIndex++;
            }
        }
        if (subModelIndex < subModels.length) {
            for (let i = subModelIndex, length = subModels.length; i < length; i++) {
                subModels[i].destroy();
            }
            subModels.length = subModelIndex;
        }
        model.createBoundingShape(this._emitter.boundsMin, this._emitter.boundsMax);
    }
}
