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

import { DEBUG, EDITOR, JSB } from 'internal:constants';
import {
    ccclass, executeInEditMode, requireComponent, tooltip,
    type, displayOrder, serializable, override, visible, displayName, disallowAnimation,
} from 'cc.decorator';
import { Color, assert, ccenum, cclegacy } from '../../core';
import { builtinResMgr } from '../../asset/asset-manager';
import { Material } from '../../asset/assets';
import { BlendFactor, BlendOp, ColorMask } from '../../gfx';
import { IAssembler, IAssemblerManager } from '../renderer/base';
import { RenderData } from '../renderer/render-data';
import { IBatcher } from '../renderer/i-batcher';
import { Node } from '../../scene-graph';
import { TransformBit } from '../../scene-graph/node-enum';
import { UITransform } from './ui-transform';
import { Stage } from '../renderer/stencil-manager';
import { NodeEventType } from '../../scene-graph/node-event';
import { Renderer } from '../../misc/renderer';
import { RenderEntity, RenderEntityType } from '../renderer/render-entity';
import { uiRendererManager } from './ui-renderer-manager';
import { RenderDrawInfoType } from '../renderer/render-draw-info';
import { director } from '../../game';
import type { Batcher2D } from '../renderer/batcher-2d';

// hack
ccenum(BlendFactor);
ccenum(BlendOp);
ccenum(ColorMask);

/**
 * @en
 * The shader property type of the material after instantiation.
 *
 * @zh
 * 实例后的材质的着色器属性类型。
 */
export enum InstanceMaterialType {
    /**
     * @en
     * The shader only has color properties.
     *
     * @zh
     * 着色器只带颜色属性。
     */
    ADD_COLOR = 0,

    /**
     * @en
     * The shader has color and texture properties.
     *
     * @zh
     * 着色器带颜色和贴图属性。
     */
    ADD_COLOR_AND_TEXTURE = 1,

    /**
     * @en
     * The shader has color and texture properties and uses grayscale mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用灰度模式。
     */
    GRAYSCALE = 2,

    /**
     * @en
     * The shader has color and texture properties and uses embedded alpha mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用透明通道分离贴图。
     */
    USE_ALPHA_SEPARATED = 3,

    /**
     * @en
     * The shader has color and texture properties and uses embedded alpha and grayscale mode.
     *
     * @zh
     * 着色器带颜色和贴图属性,并使用灰度模式。
     */
    USE_ALPHA_SEPARATED_AND_GRAY = 4,
}

/**
 * @en Base class for UI components which supports rendering features.
 * This component will setup NodeUIProperties.uiComp in its owner [[Node]]
 *
 * @zh 所有支持渲染的 UI 组件的基类。
 * 这个组件会设置 [[Node]] 上的 NodeUIProperties.uiComp。
 */
@ccclass('cc.UIRenderer')
@requireComponent(UITransform)
@executeInEditMode
export class UIRenderer extends Renderer {
    /**
     * @en The blend factor enums
     * @zh 混合模式枚举类型
     * @see [[gfx.BlendFactor]]
     * @internal
     */
    public static BlendState = BlendFactor;
    /**
     * @en The render data assembler
     * @zh 渲染数据组装器
     * @internal
     */
    public static Assembler: IAssemblerManager = null!;
    /**
     * @en The post render data assembler
     * @zh 后置渲染数据组装器
     * @internal
     */
    public static PostAssembler: IAssemblerManager | null = null;

    constructor () {
        super();
        this._renderEntity = this.createRenderEntity();
    }

    @override
    @visible(false)
    get sharedMaterials (): (Material | null)[] {
        // if we don't create an array copy, the editor will modify the original array directly.
        return EDITOR && this._materials.slice() || this._materials;
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
     * @en The customMaterial
     * @zh 用户自定材质
     */
    @type(Material)
    @displayOrder(0)
    @disallowAnimation
    get customMaterial (): Material | null {
        return this._customMaterial;
    }

    set customMaterial (val) {
        this._customMaterial = val;
        this.updateMaterial();
    }

    /**
     * @en Main color for rendering, it normally multiplies with texture color.
     * @zh 渲染颜色，一般情况下会和贴图颜色相乘。
     */
    @displayOrder(1)
    get color (): Readonly<Color> {
        return this._color;
    }
    set color (value) {
        if (this._color.equals(value)) {
            return;
        }
        this._color.set(value);
        this._updateColor();
        if (EDITOR) {
            const clone = this._color.clone();
            this.node.emit(NodeEventType.COLOR_CHANGED, clone);
        }
    }

    protected _renderData: RenderData | null = null;
    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get renderData (): RenderData | null {
        return this._renderData;
    }
    /**
     * As can not set setter internal individually, so add setRenderData();
     * @engineInternal
     */
    setRenderData (renderData: RenderData | null): void {
        this._renderData = renderData;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get useVertexOpacity (): boolean {
        return this._useVertexOpacity;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     * @en The component stencil stage (please do not any modification directly on this object)
     * @zh 组件模板缓冲状态 (注意：请不要直接修改它的值)
     */
    get stencilStage (): Stage {
        return this._stencilStage;
    }
    set stencilStage (val: Stage) {
        this._stencilStage = val;
        this._renderEntity.setStencilStage(val);
    }

    @override
    protected _materials: (Material | null)[] = [];
    @type(Material)
    protected _customMaterial: Material | null = null;

    @serializable
    protected _srcBlendFactor = BlendFactor.SRC_ALPHA;
    /**
     * @engineInternal
     * @internal
     */
    get srcBlendFactor (): BlendFactor { return this._srcBlendFactor; }
    set srcBlendFactor (srcBlendFactor: BlendFactor) { this._srcBlendFactor = srcBlendFactor; }
    @serializable
    protected _dstBlendFactor = BlendFactor.ONE_MINUS_SRC_ALPHA;
    @serializable
    protected _color: Color = Color.WHITE.clone();

    protected _stencilStage: Stage = Stage.DISABLED;

    protected _assembler: IAssembler | null = null;
    protected _postAssembler: IAssembler | null = null;

    // RenderEntity
    //protected renderData: RenderData | null = null;
    protected _renderDataFlag = true;
    protected _renderFlag = true;

    protected declare _renderEntity: RenderEntity;

    protected _instanceMaterialType = -1;
    protected _srcBlendFactorCache = BlendFactor.SRC_ALPHA;
    protected _dstBlendFactorCache = BlendFactor.ONE_MINUS_SRC_ALPHA;

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public _dirtyVersion = -1;
    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public _internalId = -1;
    /**
     * @engineInternal
     */
    public _flagChangedVersion = -1;

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get batcher (): Batcher2D {
        return director.root!.batcher2D;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get renderEntity (): RenderEntity {
        if (DEBUG) {
            assert(Boolean(this._renderEntity), 'this._renderEntity should not be invalid');
        }
        return this._renderEntity;
    }

    /**
     * @en Marks for calculating opacity per vertex
     * @zh 标记组件是否逐顶点计算透明度
     */
    protected _useVertexOpacity = false;

    protected _lastParent: Node | null = null;

    public onLoad (): void {
        this._renderEntity.setNode(this.node);
    }

    public __preload (): void {
        this.node._uiProps.uiComp = this;
        if (this._flushAssembler) {
            this._flushAssembler();
        }
    }

    public onEnable (): void {
        this.node.on(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.on(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
        this.node.on(NodeEventType.PARENT_CHANGED, this._colorDirty, this);
        this.updateMaterial();
        this._colorDirty();
        uiRendererManager.addRenderer(this);
        this.markForUpdateRenderData();
    }

    // For Redo, Undo
    public onRestore (): void {
        this.updateMaterial();
        // restore render data
        this.markForUpdateRenderData();
    }

    public onDisable (): void {
        this.node.off(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.off(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
        this.node.off(NodeEventType.PARENT_CHANGED, this._colorDirty, this);
        uiRendererManager.removeRenderer(this);
        this._renderFlag = false;
        this._renderEntity.enabled = false;
    }

    public onDestroy (): void {
        this._renderEntity.setNode(null);
        if (this.node._uiProps.uiComp === this) {
            this.node._uiProps.uiComp = null;
        }
        this.destroyRenderData();
        if (this._materialInstances) {
            for (let i = 0; i < this._materialInstances.length; i++) {
                const instance = this._materialInstances[i];
                if (instance) { instance.destroy(); }
            }
        }
    }

    /**
     * @en Marks the render data of the current component as modified so that the render data is recalculated.
     * @zh 标记当前组件的渲染数据为已修改状态，这样渲染数据才会重新计算。
     * @param enable Marked necessary to update or not
     */
    public markForUpdateRenderData (enable = true): void {
        if (enable) {
            const renderData = this._renderData;
            if (renderData) {
                renderData.vertDirty = true;
            }
            uiRendererManager.markDirtyRenderer(this);
        }
    }

    /**
     * @en Request new render data object.
     * @zh 请求新的渲染数据对象。
     * @return @en The new render data. @zh 新的渲染数据。
     */
    public requestRenderData (drawInfoType = RenderDrawInfoType.COMP): RenderData {
        const data = RenderData.add();
        data.initRenderDrawInfo(this, drawInfoType);
        this._renderData = data;
        return data;
    }

    /**
     * @en Destroy current render data.
     * @zh 销毁当前渲染数据。
     */
    public destroyRenderData (): void {
        if (!this._renderData) {
            return;
        }
        this._renderData.removeRenderDrawInfo(this);
        RenderData.remove(this._renderData);
        this._renderData = null;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public updateRenderer (): void {
        if (this._assembler) {
            this._assembler.updateRenderData(this);
        }
        this._renderFlag = this._canRender();
        this._renderEntity.enabled = this._renderFlag;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public fillBuffers (render: IBatcher): void {
        if (this._renderFlag) {
            this._render(render);
        }
    }

    /**
     * @en Post render data submission procedure, it's executed after assembler updated for all children.
     * It may assemble some extra render data to the geometry buffers, or it may only change some render states.
     * Don't call it unless you know what you are doing.
     * @zh 后置渲染数据组装程序，它会在所有子节点的渲染数据组装完成后被调用。
     * 它可能会组装额外的渲染数据到顶点数据缓冲区，也可能只是重置一些渲染状态。
     * 注意：不要手动调用该函数，除非你理解整个流程。
     */
    public postUpdateAssembler (render: IBatcher): void {
        if (this._postAssembler && this._renderFlag) {
            this._postRender(render);
        }
    }

    protected _render (render: IBatcher): void {
        // Implemented by subclasses
    }

    protected _postRender (render: IBatcher): void {
        // Implemented by subclasses
    }

    protected _canRender (): boolean {
        if (DEBUG) {
            assert(this.isValid, 'this component should not be invalid!');
        }
        return this.getSharedMaterial(0) !== null
            && this._enabled
            && this._color.a > 0;
    }

    protected _postCanRender (): void {
        // Implemented by subclasses
    }

    /**
     * @engineInternal
     */
    public updateMaterial (): void {
        if (this._customMaterial) {
            if (this.getSharedMaterial(0) !== this._customMaterial) {
                this.setSharedMaterial(this._customMaterial, 0);
            }
            return;
        }
        const mat = this._updateBuiltinMaterial();
        this.setSharedMaterial(mat, 0);
        if (this.stencilStage === Stage.ENTER_LEVEL || this.stencilStage === Stage.ENTER_LEVEL_INVERTED) {
            this.getMaterialInstance(0)!.recompileShaders({ USE_ALPHA_TEST: true });
        }
        this._updateBlendFunc();
    }

    protected _updateColor (): void {
        this.node._uiProps.colorDirty = true;
        this.setEntityColorDirty(true);
        this.setEntityColor(this._color);
        this.setEntityOpacity(this.node._uiProps.localOpacity);

        if (this._assembler) {
            this._assembler.updateColor(this);
            // Need update rendFlag when opacity changes from 0 to !0 or 0 to !0
            const renderFlag = this._renderFlag;
            this._renderFlag = this._canRender();
            this.setEntityEnabled(this._renderFlag);
            if (renderFlag !== this._renderFlag) {
                const renderData = this.renderData;
                if (renderData) {
                    renderData.vertDirty = true;
                }
            }
        }
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    // for common
    public static setEntityColorDirtyRecursively (node: Node, dirty: boolean): void {
        const render = node._uiProps.uiComp as UIRenderer;
        if (render && render.color) { // exclude UIMeshRenderer which has not color
            render._renderEntity.colorDirty = dirty;
        }
        for (let i = 0; i < node.children.length; i++) {
            UIRenderer.setEntityColorDirtyRecursively(node.children[i], dirty);
        }
    }

    private setEntityColorDirty (dirty: boolean): void {
        if (JSB) {
            UIRenderer.setEntityColorDirtyRecursively(this.node, dirty);
        }
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setEntityColor (color: Color): void {
        if (JSB) {
            this._renderEntity.color = color;
        }
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setEntityOpacity (opacity: number): void {
        if (JSB) {
            this._renderEntity.localOpacity = opacity;
        }
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setEntityEnabled (enabled: boolean): void {
        if (JSB) {
            this._renderEntity.enabled = enabled;
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _updateBlendFunc (): void {
        // todo: Not only Pass[0].target[0]
        let target = this.getRenderMaterial(0)!.passes[0].blendState.targets[0];
        this._dstBlendFactorCache = target.blendDst;
        this._srcBlendFactorCache = target.blendSrc;
        if (this._dstBlendFactorCache !== this._dstBlendFactor || this._srcBlendFactorCache !== this._srcBlendFactor) {
            target = this.getMaterialInstance(0)!.passes[0].blendState.targets[0];
            target.blend = true;
            target.blendDstAlpha = BlendFactor.ONE_MINUS_SRC_ALPHA;
            target.blendDst = this._dstBlendFactor;
            target.blendSrc = this._srcBlendFactor;
            const targetPass = this.getMaterialInstance(0)!.passes[0];
            targetPass.blendState.setTarget(0, target);
            targetPass._updatePassHash();
            this._dstBlendFactorCache = this._dstBlendFactor;
            this._srcBlendFactorCache = this._srcBlendFactor;
        }
    }

    // pos, rot, scale changed
    protected _nodeStateChange (transformType: TransformBit): void {
        if (this._renderData) {
            this.markForUpdateRenderData();
        }

        for (let i = 0; i < this.node.children.length; ++i) {
            const child = this.node.children[i];
            const renderComp = child.getComponent(UIRenderer);
            if (renderComp) {
                renderComp.markForUpdateRenderData();
            }
        }
    }

    protected _colorDirty (): void {
        this.node._uiProps.colorDirty = true;
        this.setEntityColorDirty(true);
    }

    protected _onMaterialModified (idx: number, material: Material | null): void {
        if (this._renderData) {
            this.markForUpdateRenderData();
            this._renderData.passDirty = true;
        }
        super._onMaterialModified(idx, material);
    }

    protected _updateBuiltinMaterial (): Material {
        let mat: Material;
        switch (this._instanceMaterialType) {
        case InstanceMaterialType.ADD_COLOR:
            mat = builtinResMgr.get(`ui-base-material`);
            break;
        case InstanceMaterialType.GRAYSCALE:
            mat = builtinResMgr.get(`ui-sprite-gray-material`);
            break;
        case InstanceMaterialType.USE_ALPHA_SEPARATED:
            mat = builtinResMgr.get(`ui-sprite-alpha-sep-material`);
            break;
        case InstanceMaterialType.USE_ALPHA_SEPARATED_AND_GRAY:
            mat = builtinResMgr.get(`ui-sprite-gray-alpha-sep-material`);
            break;
        default:
            mat = builtinResMgr.get(`ui-sprite-material`);
            break;
        }
        return mat;
    }

    protected _flushAssembler?(): void;

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setNodeDirty (): void {
        if (this._renderData) {
            this._renderData.nodeDirty = true;
        }
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setTextureDirty (): void {
        if (this._renderData) {
            this._renderData.textureDirty = true;
        }
    }

    // RenderEntity
    // it should be overwritten by inherited classes
    protected createRenderEntity (): RenderEntity {
        return new RenderEntity(RenderEntityType.STATIC);
    }
}

cclegacy.internal.UIRenderer = UIRenderer;
