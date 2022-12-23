/*
 Copyright (c) 2021 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { ccclass, disallowMultiple, executeInEditMode,
    executionOrder, menu, requireComponent } from 'cc.decorator';
import { Component } from '../../scene-graph/component';
import { cclegacy } from '../../core';
import { UITransform } from './ui-transform';

/**
 * @en The entry node for 2D object data collection, all 2D rendering objects need to be rendered under the RenderRoot node.
 * @zh 2D 对象数据收集的入口节点，所有的 2D渲染对象需在 RenderRoot 节点下才可以被渲染
 */
@ccclass('cc.RenderRoot2D')
@executionOrder(100)
@menu('2D/RenderRoot2D')
@requireComponent(UITransform)
@disallowMultiple
@executeInEditMode
export class RenderRoot2D extends Component {
    public onEnable () {
        cclegacy.director.root!.batcher2D.addScreen(this);
    }

    public onDisable () {
        cclegacy.director.root!.batcher2D.removeScreen(this);
    }

    public onDestroy () {
        cclegacy.director.root!.batcher2D.removeScreen(this);
    }
}
