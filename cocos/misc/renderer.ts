/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

import { EDITOR } from 'internal:constants';
import { Material } from '../asset/assets/material';
import { Component } from '../scene-graph';
import { IMaterialInstanceInfo, MaterialInstance } from '../render-scene/core/material-instance';
import { warnID, _decorator, errorID } from '../core';

const _matInsInfo: IMaterialInstanceInfo = {
    parent: null!,
    owner: null!,
    subModelIdx: 0,
};

const { ccclass, serializable, disallowMultiple, type, displayOrder, displayName } = _decorator;

/**
 * @en Base class for all components which can submit contents for the rendering process.
 * It manages a series of [[renderer.Model]]s and the visibility, the materials and the material instances of the models.
 * There are several different material properties that must be distinguished clearly and used with caution:
 * - [[sharedMaterials]] are shared for all component instances that are using the same material asset, modification will be applied universally.
 * - [[materials]] are instances created independently for the component instance, modification will only be applied for the component instance.
 * - Render Materials retrieved by [[getRenderMaterial]] are materials used for the actual rendering process, material instances are used if exist.
 * By default, shared materials are used for rendering.
 * Material instances are created only when user try to retrieve a material instance with [[material]], [[materials]] and [[getMaterialInstance]].
 * @zh 所有可以提交内容到渲染流程的可渲染类的基类，它管理着一组 [[renderer.Model]]，以及它们的可见性、材质和材质实例。
 * 下面是这个组件所管理的各种材质属性的解释，需要正确区分并小心使用：
 * - [[sharedMaterials]] 是共享材质，所有使用此材质资源的组件实例都默认使用材质的共享实例对象，所有修改都会影响所有使用它的组件实例。
 * - [[materials]] 是专为组件对象创建的独立材质实例，所有修改仅会影响当前组件对象。
 * - 使用 [[getRenderMaterial]] 获取的渲染材质是用于实际渲染流程的材质对象，当存在材质实例的时候，永远使用材质实例。
 * 默认情况下，渲染组件使用共享材质进行渲染，材质实例也不会被创建出来。仅在用户通过 [[material]]，[[materials]] 和 [[getMaterialInstance]] 接口获取材质时才会创建材质实例。
 */
@ccclass('cc.Renderer')
@disallowMultiple
export class Renderer extends Component {
    constructor () {
        super();
    }

    /**
     * @en Get the default shared material
     * @zh 获取默认的共享材质
     */
    get sharedMaterial (): Material |null {
        return this.getSharedMaterial(0);
    }

    /**
     * @en All shared materials of model
     * @zh 模型的所有共享材质
     */
    @type(Material)
    @displayOrder(0)
    @displayName('Materials')
    get sharedMaterials (): (Material | null)[] {
        // if we don't create an array copy, the editor will modify the original array directly.
        return (EDITOR && this._materials.slice()) || this._materials;
    }

    set sharedMaterials (val) {
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== this._materials[i]) {
                this.setSharedMaterial(val[i], i);
            }
        }
        if (val.length < this._materials.length) {
            for (let i = val.length; i < this._materials.length; i++) {
                this.setSharedMaterial(null, i);
            }
            this._materials.splice(val.length);
        }
    }

    /**
     * @en The default material instance, it will create a new instance from the default shared material if not created yet.
     * @zh 获取默认的材质实例，如果还没有创建，将会根据默认共享材质创建一个新的材质实例
     */
    get material (): Material | MaterialInstance | null {
        return this.getMaterialInstance(0);
    }

    set material (val: Material | MaterialInstance | null) {
        if (this._materials.length === 1 && !this._materialInstances[0] && this._materials[0] === val) {
            return;
        }
        this.setMaterialInstance(val, 0);
    }

    /**
     * @en The materials of the model.
     * @zh 所有模型材质。
     */
    get materials (): (Material | MaterialInstance | null)[] {
        for (let i = 0; i < this._materials.length; i++) {
            this._materialInstances[i] = this.getMaterialInstance(i) as MaterialInstance;
        }
        return this._materialInstances;
    }

    set materials (val: (Material | MaterialInstance | null)[]) {
        const newLength = val.length;
        const oldLength = this._materials.length;
        for (let i = newLength; i < oldLength; i++) {
            this.setMaterialInstance(null, i);
        }
        this._materials.length = newLength;
        this._materialInstances.length = newLength;
        for (let i = 0; i < newLength; i++) {
            // they could be either undefined or null
            // eslint-disable-next-line eqeqeq
            if (this._materialInstances[i] != val[i]) {
                this.setMaterialInstance(val[i], i);
            }
        }
    }

    // _materials should be defined after sharedMaterials for Editor reset component reason
    @type([Material])
    protected _materials: (Material | null)[] = [];

    protected _materialInstances: (MaterialInstance | null)[] = [];

    /**
     * @deprecated Since v3.7.3, please use [[getSharedMaterial]] instead.
     */
    public getMaterial (idx: number): Material | null {
        return this.getSharedMaterial(idx);
    }

    /**
     * @deprecated Since v3.8.1, please use [[setSharedMaterial]] instead.
     */
    public setMaterial (material: Material | null, index: number): void {
        this.setSharedMaterial(material, index);
    }

    /**
     * @en Get the shared material asset of the specified sub-model.
     * @zh 获取指定子模型的共享材质资源。
     */
    public getSharedMaterial (idx: number): Material | null {
        if (idx < 0 || idx >= this._materials.length) {
            return null;
        }
        return this._materials[idx];
    }

    /**
     * @en Set the shared material asset of the specified sub-model,
     * new material instance will be created automatically if the sub-model is already using one.
     * @zh 设置指定子模型的 sharedMaterial，如果对应位置有材质实例则会创建一个对应的材质实例。
     */
    public setSharedMaterial (material: Material | null, index: number): void {
        if (material && material instanceof MaterialInstance) {
            errorID(12012);
        }

        if (this._materials[index] === material) return;

        this._materials[index] = material;
        const inst = this._materialInstances[index];
        if (inst) {
            inst.destroy();
            this._materialInstances[index] = null;
        }
        this._onMaterialModified(index, this._materials[index]);
    }

    /**
     * @en Get the material instance of the specified sub-model.
     * It will create a new instance from the corresponding shared material if not created yet.
     * @zh 获取指定子模型的材质实例。如果还没有创建，将会根据对应的共享材质创建一个新的材质实例
     */
    public getMaterialInstance (idx: number): MaterialInstance | null {
        const mat = this._materials[idx];
        if (!mat) {
            return null;
        }
        if (!this._materialInstances[idx]) {
            _matInsInfo.parent = this._materials[idx]!;
            _matInsInfo.owner = this;
            _matInsInfo.subModelIdx = idx;
            const instantiated = new MaterialInstance(_matInsInfo);
            _matInsInfo.parent = null!;
            _matInsInfo.owner = null!;
            _matInsInfo.subModelIdx = 0!;
            this.setMaterialInstance(instantiated, idx);
        }
        return this._materialInstances[idx];
    }

    /**
     * @en Set the material instance of the specified sub-model.
     * @zh 获取指定子模型的材质实例。
     */
    public setMaterialInstance (matInst: Material | MaterialInstance | null, index: number): void {
        if (typeof matInst === 'number') {
            warnID(12007);
            const temp: any = matInst;
            matInst = index as any;
            index = temp;
        }

        const curInst = this._materialInstances[index];

        // If the new material is an MaterialInstance
        if (matInst && matInst.parent) {
            if (matInst !== curInst) {
                this._materialInstances[index] = matInst as MaterialInstance;
                this._onMaterialModified(index, matInst);
            }
            return;
        }

        // Skip identity check if it's a Material property
        // Or if there is a MaterialInstance already
        if (matInst !== this._materials[index] || curInst) {
            this.setSharedMaterial(matInst as Material, index);
        }
    }

    /**
     * @en Get the actual rendering material of the specified sub-model.
     * (material instance if there is one, or the shared material asset)
     * @zh 获取指定位置可供渲染的材质，如果有材质实例则使用材质实例，如果没有则使用材质资源
     */
    public getRenderMaterial (index: number): Material | null {
        return this._materialInstances[index] || this._materials[index];
    }

    protected _onMaterialModified (index: number, material: Material | null): void {
        /* empty */
    }

    /**
     * @engineInternal
     * @mangle
     */
    public _onRebuildPSO (index: number, material: Material | null): void {
        /* empty */
    }

    protected _clearMaterials (): void {
        /* empty */
    }
}
