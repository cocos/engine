/*
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

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

import {
    ccclass, range, serializable,
} from 'cc.decorator';
import { scene } from '../renderer';
import { Layers } from '../scene-graph/layers';
import { Renderer } from './renderer';
import { clamp } from '../math/utils';
import { SortingManager } from '../scene-graph/sorting-manager';

const MAX_UINT_NUM = (1 << 15) - 1;
const MIN_UINT_NUM = -1 << 15;

/**
 * @en Base class for all rendering components containing model.
 * @zh 所有包含 model 的渲染组件基类。
 */
@ccclass('cc.ModelRenderer')
export class ModelRenderer extends Renderer {
    @serializable
    protected _visFlags = Layers.Enum.NONE;

    @serializable
    protected _sortingLayerID = 0;
    @serializable
    protected _sortingOrder = 0;

    /**
     * @zh 组件所属层，影响该组件下的所有 model 的 visFlags
     * @en The layer of the current component, which affects all the visFlags of the models belonging to this component.
     */
    get visibility () {
        return this._visFlags;
    }

    set visibility (val) {
        this._visFlags = val;
        this._onVisibilityChange(val);
    }

    /**
     * @zh 组件所属排序层 id，影响组件的渲染排序。
     * @en The sorting layer id of the component, which affects the rendering order of the component.
     */
    // Todo,how to show on inspector
    get sortingLayerID () {
        return this._sortingLayerID;
    }
    set sortingLayerID (val) {
        if (val === this._sortingLayerID || !SortingManager.idIsValid(val)) return;
        this._sortingLayerID = val;
        this._updateSortingPriority();
    }

    /**
     * @zh 组件在当前排序层中的顺序。
     * @en Model Renderer's order within a sorting layer.
     */
    @range([MIN_UINT_NUM, MAX_UINT_NUM, 1])
    get sortingOrder () {
        return this._sortingOrder;
    }
    set sortingOrder (val) {
        if (val === this._sortingOrder) return;
        this._sortingOrder = clamp(val, MIN_UINT_NUM, MAX_UINT_NUM);
        this._updateSortingPriority();
    }

    /**
     * @zh 通过 name 设置组件的 sortingLayer
     * @en Set the sortingLayer of the component by name
     * @param name
     */
    public setSortingLayerByName (name: string) {
        const id = SortingManager.getSortingIDFromName(name);
        this.sortingLayerID = id;
    }

    protected _models: scene.Model[] = [];

    /**
     * @zh 收集组件中的 models
     * @en Collect the models in this component.
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _collectModels (): scene.Model[] {
        return this._models;
    }

    protected _attachToScene () {
    }

    protected _detachFromScene () {
    }

    protected _onVisibilityChange (val) {
    }

    protected _updateSortingPriority () {
        const sortingLayerValue = SortingManager.getSortingLayerIndex(this._sortingLayerID);
        const sortingPriority = SortingManager.getSortingPriority(sortingLayerValue, this._sortingOrder);
        if (this._models.length > 0) {
            for (let i = 0; i < this._models.length; i++) {
                this._models[i].sortingPriority = sortingPriority;
            }
        }
    }
}
