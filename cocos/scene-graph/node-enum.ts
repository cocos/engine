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

import { legacyCC } from '../core/global-exports';
import { Enum } from '../core/value-types';

/**
 * @en Node's coordinate space
 * @zh 节点的坐标空间
 */
export enum NodeSpace {
    LOCAL,
    WORLD,
}

/**
 * @en Bit masks for node's transformation
 * @zh 节点的空间变换位标记
 */
export enum TransformBit {
    /**
     * @en No change
     * @zh 无改变
     */
    NONE = 0,
    /**
     * @en Translation changed
     * @zh 节点位置改变
     */
    POSITION = (1 << 0),
    /**
     * @en Rotation changed
     * @zh 节点旋转
     */
    ROTATION = (1 << 1),
    /**
     * @en Scale changed
     * @zh 节点缩放
     */
    SCALE = (1 << 2),
    /**
     * @en Skew changed
     * @zh 节点斜切
     */
    SKEW = (1 << 3),
    /**
     * @en Rotation or scale changed
     * @zh 节点旋转及缩放
     */
    RS = TransformBit.ROTATION | TransformBit.SCALE,

    /**
     * @en Rotation, scale or skew changed
     */
    RSS = TransformBit.ROTATION | TransformBit.SCALE | TransformBit.SKEW,
    /**
     * @en Translation, rotation or scale changed
     * @zh 节点平移，旋转及缩放
     */
    TRS = TransformBit.POSITION | TransformBit.ROTATION | TransformBit.SCALE,
    /**
     * @en Invert mask of [[TRS]]
     * @zh [[TRS]] 的反向掩码
     */
    TRS_MASK = ~TransformBit.TRS,
}

legacyCC.internal.TransformBit = TransformBit;

/**
 * @en Node's mobility
 * @zh 节点的移动性
 */
export const MobilityMode = Enum({
    /**
     * @en Static node
     * @zh 静态节点
     */
    Static: 0,

    /**
     * @en Stationary node
     * @zh 固定节点
     */
    Stationary: 1,

    /**
     * @en Movable node
     * @zh 可移动节点
     */
    Movable: 2,
});
