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

import { ccclass, type, serializable, editable } from 'cc.decorator';
import { createMesh } from '../3d/misc';
import { Mesh } from '../3d/assets/mesh';
import * as primitives from '.';
import { Enum, cclegacy } from '../core';

enum PrimitiveType {
    BOX = 0,
    SPHERE = 1,
    CYLINDER = 2,
    CONE = 3,
    CAPSULE = 4,
    TORUS = 5,
    PLANE = 6,
    QUAD = 7,
}
Enum(PrimitiveType); // Need reversed keys in Primitive.onLoaded, so use Enum to generate reversed keys.

/**
 * @en
 * Basic primitive mesh, this can be generate some primitive mesh at runtime.
 * @zh
 * 基础图形网格，可以在运行时构建一些基础的网格。
 */
@ccclass('cc.Primitive')
export class Primitive extends Mesh {
    public static PrimitiveType = PrimitiveType;

    /**
     * @en
     * The type of the primitive mesh, set it before you call onLoaded.
     * @zh
     * 此基础图形网格的类型，请在 onLoaded 调用之前设置。
     */
    @type(PrimitiveType)
    public type: number = PrimitiveType.BOX;

    /**
     * @en
     * The option for build the primitive mesh, set it before you call onLoaded.
     * @zh
     * 创建此基础图形网格的可选参数，请在 onLoaded 调用之前设置。
     */
    @serializable
    @editable
    public info: Record<string, number> = {};

    constructor (type = PrimitiveType.BOX) {
        super();
        this.type = type;
    }

    /**
     * @en
     * Construct the primitive mesh with `type` and `info`.
     * @zh
     * 根据`type`和`info`构建相应的网格。
     */
    public onLoaded (): void {
        const factory = primitives[PrimitiveType[this.type].toLowerCase()] as (arg: typeof this.info) => primitives.IGeometry;
        createMesh(factory(this.info), this);
    }
}

export declare namespace Primitive {
    export type PrimitiveType = EnumAlias<typeof PrimitiveType>;
}

cclegacy.Primitive = Primitive;
