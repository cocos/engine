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

import { UIRenderer } from '../2d/framework/ui-renderer';
import { warnID } from '../core/platform/debug';
import { UIMeshRenderer } from '../2d';
import type { Node } from './node';
import type { UITransform } from '../2d/framework/ui-transform';

/**
 * @en Node's UI properties abstraction
 * @zh 节点上 UI 相关的属性抽象类
 */
export class NodeUIProperties {
    /**
     * @en The UI transform component
     * @zh UI 变换组件
     */
    get uiTransformComp (): UITransform | null {
        if (!this._uiTransformComp) {
            this._uiTransformComp = this._node.getComponent('cc.UITransform') as UITransform;
        }

        return this._uiTransformComp;
    }
    set uiTransformComp (value: UITransform | null) {
        this._uiTransformComp = value;
    }

    /**
     * @en The base UI component
     * @zh UI 基类组件
     */
    get uiComp (): UIMeshRenderer | UIRenderer | null {
        return this._uiComp;
    }
    set uiComp (comp: UIMeshRenderer | UIRenderer | null) {
        if (this._uiComp && comp) {
            warnID(12002);
            return;
        }
        this._uiComp = comp;
    }

    private _uiComp: UIMeshRenderer | UIRenderer | null = null;

    /**
     * @en The opacity of the UI node for final rendering
     * @zh 最终显示的 UI 透明度，受父节点透明度影响
     */
    private _opacity = 1;
    /**
     * NOTE: engineInternal tag cannot only mark opacity setter as internal.
     * @engineInternal
     */
    public setOpacity (v: number): void { this._opacity = v; }
    public get opacity (): number { return this._opacity; }

    /**
     * @en The opacity of the UI node itself
     * @zh 本节点的 UI 透明度
     */
    private _localOpacity = 1;
    get localOpacity (): number { return this._localOpacity; }
    set localOpacity (val) {
        this._localOpacity = val;
        this.colorDirty = true;
    }

    public colorDirty = true;
    protected _uiTransformComp: UITransform | null = null;
    private declare _node: Node;

    constructor (node: Node) {
        this._node = node;
    }

    /**
     * @deprecated since v3.4
     */
    public applyOpacity (effectOpacity: number): void {
        this._opacity = this._localOpacity * effectOpacity;
    }

    /**
     * @en Make the opacity state of node tree is dirty, not effect anymore
     * @zh 为结点树的透明度状态设置脏标签，不再有效果
     * @deprecated since v3.4
     */
    public static markOpacityTree (node, isDirty = true): void {}
}
