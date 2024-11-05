/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, disallowMultiple, executeInEditMode,
    executionOrder, help, menu, requireComponent } from 'cc.decorator';
import { Component } from '../../scene-graph/component';
import { cclegacy } from '../../core';
import { UITransform } from './ui-transform';
import type { Batcher2D } from '../renderer/batcher-2d';

/**
 * @en The entry node for 2D object data collection, all 2D rendering objects need to be rendered under the RenderRoot node.
 * @zh 2D 对象数据收集的入口节点，所有的 2D渲染对象需在 RenderRoot 节点下才可以被渲染。
 */
@ccclass('cc.RenderRoot2D')
@help('i18n:cc.RenderRoot2D')
@executionOrder(100)
@menu('2D/RenderRoot2D')
@requireComponent(UITransform)
@disallowMultiple
@executeInEditMode
export class RenderRoot2D extends Component {
    public onEnable (): void {
        (cclegacy.director.root!.batcher2D as Batcher2D).addScreen(this);
    }

    public onDisable (): void {
        (cclegacy.director.root!.batcher2D as Batcher2D).removeScreen(this);
    }

    public onDestroy (): void {
        (cclegacy.director.root!.batcher2D as Batcher2D).removeScreen(this);
    }
}
