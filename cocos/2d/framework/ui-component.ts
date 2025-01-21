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

import { ccclass, disallowMultiple, executeInEditMode, executionOrder, requireComponent } from 'cc.decorator';
import { IBatcher } from '../renderer/i-batcher';
import { Component } from '../../scene-graph/component';
import { UITransform } from './ui-transform';
import { Node } from '../../scene-graph';
import { Stage } from '../renderer/stencil-manager';
import type { UIRenderer } from './ui-renderer';

/**
 * @en Legacy 2D base class for rendering component, please use [[UIRenderer]] instead.
 * This component will setup NodeUIProperties.uiComp in its owner [[Node]].
 * @zh 旧的 2D 渲染组件基类，请使用 [[UIRenderer]] 替代。
 * 这个组件会设置 [[Node]] 上的 NodeUIProperties.uiComp。
 * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
 */
@ccclass('cc.UIComponent')
@requireComponent(UITransform)
@executionOrder(110)
@disallowMultiple
@executeInEditMode
export class UIComponent extends Component {
    protected _lastParent: Node | null = null;

    constructor () {
        super();
    }

    public __preload (): void {
        // TODO: UIComponent should not be assigned to UIMeshRenderer | UIRenderer @holycanvas
        // workaround: mark this as any
        // issue: https://github.com/cocos/cocos-engine/issues/14637
        this.node._uiProps.uiComp = this as unknown as UIRenderer;
    }

    public onEnable (): void {
    }

    public onDisable (): void {

    }

    public onDestroy (): void {
        // TODO: UIComponent should not be assigned to UIMeshRenderer | UIRenderer @holycanvas
        // workaround: mark this as any
        // issue: https://github.com/cocos/cocos-engine/issues/14637
        const uiProps = this.node._uiProps;
        if (uiProps.uiComp === this as unknown as UIRenderer) {
            uiProps.uiComp = null;
        }
    }

    /**
     * @en Post render data submission procedure, it's executed after assembler updated for all children.
     * It may assemble some extra render data to the geometry buffers, or it may only change some render states.
     * Don't call it unless you know what you are doing.
     * @zh 后置渲染数据组装程序，它会在所有子节点的渲染数据组装完成后被调用。
     * 它可能会组装额外的渲染数据到顶点数据缓冲区，也可能只是重置一些渲染状态。
     * 注意：不要手动调用该函数，除非你理解整个流程。
     * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
     */
    public postUpdateAssembler (render: IBatcher): void {
    }

    /**
     * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
     */
    public markForUpdateRenderData (enable = true): void {
    }

    /**
     * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
     */
    public stencilStage: Stage = Stage.DISABLED;

    /**
     * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
     */
    public setNodeDirty (): void {
    }

    /**
     * @deprecated since v3.4.1, please use [[UIRenderer]] instead.
     */
    public setTextureDirty (): void {
    }
}
