/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, disallowMultiple, editable, executeInEditMode, executionOrder, help, menu, serializable, tooltip } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW, JSB } from 'internal:constants';
import { Component } from '../../scene-graph/component';
import { clamp } from '../../core';
import { UIRenderer } from '../framework/ui-renderer';
import { Node } from '../../scene-graph';
import { NodeEventType } from '../../scene-graph/node-event';

/**
 * @en
 * Recursively sets localopacity.
 *
 * @zh
 * 递归设置localopacity。
 *
 * @param node @en recursive node.
 *             @zh 递归的节点。
 * @param dirty @en Is the color dirty.
 *              @zh color是否dirty。
 * @param parentOpacity @en The parent node's opacity.
 *                      @zh 父节点的opacity。
 * @param stopRecursiveIfHasOpacity @en Stop recursion if UiOpacity component exists.
 *                                  @zh 如果存在UiOpacity组件则停止递归。
 */
function setEntityLocalOpacityDirtyRecursively (
    node: Node,
    dirty: boolean,
    parentOpacity: number,
    stopRecursiveIfHasOpacity: boolean,
): void {
    if (!node.isValid) {
        // Since children might be destroyed before the parent,
        // we should add protecting condition when executing recursion downwards.
        return;
    }

    const uiOp = node.getComponent(UIOpacity);
    if (uiOp && stopRecursiveIfHasOpacity) {
        // Because it's possible that UiOpacity components are handled by themselves (at onEnable or onDisable)
        uiOp._setParentOpacity(parentOpacity);
        return;
    }

    // If the node has never been activated, then node._uiProps.uiComp won't be set.
    // We need to check if the UIRenderer exists or not.
    let render = node._uiProps.uiComp as UIRenderer | null;
    if (!render) {
        render = node.getComponent(UIRenderer);
    }

    if (render && render.color) { // exclude UIMeshRenderer which has not color
        render.renderEntity.colorDirty = dirty;
        if (uiOp) {
            uiOp._setParentOpacity(parentOpacity);
            render.renderEntity.localOpacity = parentOpacity * uiOp.opacity / 255;
        } else {
            // there is a just UIRenderer but no UIOpacity on the node, we should just transport the parentOpacity to the node.
            render.renderEntity.localOpacity = parentOpacity;
        }
        render.node._uiProps.localOpacity = render.renderEntity.localOpacity;
        //No need for recursion here. Because it doesn't affect the capacity of the child nodes.
        return;
    }

    if (uiOp) {
        // there is a just UIOpacity but no UIRenderer on the node.
        // we should transport the interrupt opacity downward
        uiOp._setParentOpacity(parentOpacity);
        parentOpacity = parentOpacity * uiOp.opacity / 255;
    }

    const children = node.children;
    for (let i = 0, len = children.length; i < len; ++i) {
        setEntityLocalOpacityDirtyRecursively(
            children[i],
            dirty || (parentOpacity < 1),
            parentOpacity,
            stopRecursiveIfHasOpacity,
        );
    }
}

/**
 * @en
 * Set the UI transparency component.
 * This component can be used to influence subsequent render nodes.
 * Nodes that already have a rendering component can modify the alpha channel of color directly.
 *
 * @zh
 * UI 透明度设置组件。可以通过该组件设置透明度来影响后续的渲染节点。已经带有渲染组件的节点可以直接修改 color 的 alpha 通道。
 */
@ccclass('cc.UIOpacity')
@help('i18n:cc.UIOpacity')
@executionOrder(110)
@menu('UI/UIOpacity')
@executeInEditMode
@disallowMultiple
export class UIOpacity extends Component {
    constructor () {
        super();
    }

    /**
     * @en
     * The parent node's opacity.
     *
     * @zh
     * 父节点的opacity。
     *
     */
    private _parentOpacity: number = 1.0;

    /**
     * @engineInternal
     * @mangle
     */
    _setParentOpacity (v: number): void {
        this._parentOpacity = v;
    }

    private _parentOpacityResetFlag: boolean = true;

    /**
     * @en
     * The transparency value of the impact.
     *
     * @zh
     * 透明度。
     */
    @editable
    @tooltip('i18n:UIOpacity.opacity')
    get opacity (): number {
        return this._opacity;
    }

    set opacity (value) {
        if (this._opacity === value) {
            return;
        }
        value = clamp(value, 0, 255);
        this._opacity = value;
        this.node._uiProps.localOpacity = value / 255;

        if (JSB) {
            setEntityLocalOpacityDirtyRecursively(this.node, true, this._parentOpacity, false);
        }

        if (EDITOR_NOT_IN_PREVIEW) {
            setTimeout(() => {
                EditorExtends.Node.emit('change', this.node.uuid, this.node);
            }, 200);
        }
    }

    @serializable
    protected _opacity = 255;

    protected _getParentOpacity (node: Node): number {
        if (node == null || !node.isValid) {
            return 1;
        }
        const render = node._uiProps.uiComp as UIRenderer;
        const uiOp = node.getComponent(UIOpacity);
        if (render && render.color) {
            return 1;
        }
        if (uiOp) {
            return uiOp._parentOpacity * (uiOp._opacity / 255);
        }
        return this._getParentOpacity(node.getParent()!);
    }

    protected _parentChanged (): void {
        if (!JSB) {
            return;
        }
        const parent = this.node.getParent();
        let opacity = 1;
        if (parent) {
            this._parentOpacity = this._getParentOpacity(parent);
            opacity = this._parentOpacity;
        } else {
            this._parentOpacityResetFlag = true;
        }
        setEntityLocalOpacityDirtyRecursively(this.node, true, opacity, false);
    }

    protected _setEntityLocalOpacityRecursively (opacity: number): void {
        // Because JSB's localOpacity value is present in the renderEntity, but non-JSB's are not.
        if (!JSB) {
            return;
        }
        const render = this.node._uiProps.uiComp as UIRenderer;
        if (render && render.color) { // exclude UIMeshRenderer which has not color
            render.renderEntity.colorDirty = true;
            render.renderEntity.localOpacity = opacity;
            render.node._uiProps.localOpacity = opacity;
            return;
        }
        // The current node is not recursive, only the child nodes are recursive.
        for (const child of this.node.children) {
            setEntityLocalOpacityDirtyRecursively(child, true, opacity, true);
        }
    }

    public onEnable (): void {
        this.node.on(NodeEventType.PARENT_CHANGED, this._parentChanged, this);
        this.node._uiProps.localOpacity = this._parentOpacity * this._opacity / 255;
        if (this._parentOpacityResetFlag) {
            this._parentChanged();
            this._parentOpacityResetFlag = false;
        } else {
            this._setEntityLocalOpacityRecursively(this.node._uiProps.localOpacity);
        }
    }

    public onDisable (): void {
        this.node.off(NodeEventType.PARENT_CHANGED, this._parentChanged, this);
        this.node._uiProps.localOpacity = 1;
        this._setEntityLocalOpacityRecursively(this.node._uiProps.localOpacity);
    }
}
