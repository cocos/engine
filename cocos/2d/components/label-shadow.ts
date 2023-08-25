/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { ccclass, help, executionOrder, menu, tooltip, requireComponent, executeInEditMode, serializable } from 'cc.decorator';
import { Component } from '../../scene-graph/component';
import { Color, Vec2 } from '../../core';
import { Label } from './label';

/**
 * @en Shadow effect for Label component, only for system fonts or TTF fonts.
 * @zh 用于给 Label 组件添加阴影效果，只能用于系统字体或 ttf 字体。
 *
 * @deprecated since v3.8.2, please use [[Label.shadowUsed]] instead.
 */
@ccclass('cc.LabelShadow')
@help('i18n:cc.LabelShadow')
@executionOrder(110)
@menu('UI/LabelShadow')
@requireComponent(Label)
@executeInEditMode
export class LabelShadow extends Component {
    @serializable
    protected _color = new Color(0, 0, 0, 255);
    @serializable
    protected _offset = new Vec2(2, 2);
    @serializable
    protected _blur = 2;

    /**
     * @en
     * Shadow color.
     *
     * @zh
     * 阴影的颜色。
     *
     * @deprecated since v3.8.2, please use [[Label.shadowColor]] instead.
     */
    @tooltip('i18n:labelShadow.color')
    get color (): Readonly<Color> {
        return this._color;
    }

    set color (value) {
        if (this._color === value) {
            return;
        }

        this._color.set(value);
        const label = this.node.getComponent(Label);
        if (label) {
            label.shadowColor = this._color;
        }
    }

    /**
     * @en
     * Offset between font and shadow.
     *
     * @zh
     * 字体与阴影的偏移。
     *
     * @deprecated since v3.8.2, please use [[Label.shadowOffset]] instead.
     */
    @tooltip('i18n:labelShadow.offset')
    get offset (): Vec2 {
        return this._offset;
    }

    set offset (value) {
        this._offset = value;
        const label = this.node.getComponent(Label);
        if (label) {
            label.shadowOffset = this._offset;
        }
    }

    /**
     * @en
     * A non-negative float specifying the level of shadow blur.
     *
     * @zh
     * 阴影的模糊程度。
     *
     * @deprecated since v3.8.2, please use [[Label.shadowBlur]] instead.
     */
    @tooltip('i18n:labelShadow.blur')
    get blur (): number {
        return this._blur;
    }

    set blur (value) {
        this._blur = value;
        const label = this.node.getComponent(Label);
        if (label) {
            label.shadowBlur = this._blur;
        }
    }

    /**
     * @deprecated since v3.8.2, please use [[Label.shadowUsed]] instead.
     */
    public onEnable (): void {
        const label = this.node.getComponent(Label);
        if (label) {
            label.shadowUsed = true;
        }
    }

    /**
     * @deprecated since v3.8.2, please use [[Label.shadowUsed]] instead.
     */
    public onDisable (): void {
        const label = this.node.getComponent(Label);
        if (label) {
            label.shadowUsed = false;
        }
    }
}
