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

import { ccenum } from '../core';
import { legacyCC } from '../core/global-exports';
import spineLib from './lib/spine-core';

/**
 * @en
 * The global main namespace of Spine, all classes, functions,
 * properties and constants of Spine are defined in this namespace
 * @zh
 * Spine 的全局的命名空间，
 * 与 Spine 相关的所有的类，函数，属性，常量都在这个命名空间中定义。
 * @module sp
 * @main sp
 */

/*
 * Reference:
 * http://esotericsoftware.com/spine-runtime-terminology
 * http://esotericsoftware.com/files/runtime-diagram.png
 * http://en.esotericsoftware.com/spine-using-runtimes
 */

export * from './skeleton';
export * from './skeleton-data';
export * from './assembler';

export const spine = globalThis.spine;
spine.EventType = spineLib.EventType
export const VertexEffectDelegate = spine.VertexEffectDelegate;


/**
 * @en
 * The attachment type of spine. It contains four types: REGION(0), BOUNDING_BOX(1), MESH(2) and SKINNED_MESH.
 * @zh
 * Attachment 类型枚举。类型包括 REGION，BOUNDING_BOX，MESH，SKINNED_MESH。
 */
export enum ATTACHMENT_TYPE {
    REGION = 0,
    BOUNDING_BOX = 1,
    MESH = 2,
    SKINNED_MESH = 3
}
ccenum(ATTACHMENT_TYPE);

/**
 * @en The event type of spine skeleton animation.
 * @zh 骨骼动画事件类型。
 * @enum AnimationEventType
 */
export enum AnimationEventType {
    /**
     * @en The play spine skeleton animation start type.
     * @zh 开始播放骨骼动画。
     * @property {Number} START
     */
    START = 0,
    /**
     * @en Another entry has replaced this entry as the current entry. This entry may continue being applied for mixing.
     * @zh 当前的 entry 被其他的 entry 替换。当使用 mixing 时，当前的 entry 会继续运行。
     */
    INTERRUPT = 1,
    /**
     * @en The play spine skeleton animation finish type.
     * @zh 播放骨骼动画结束。
     * @property {Number} END
     */
    END = 2,
    /**
     * @en The entry will be disposed.
     * @zh entry 将被销毁。
     */
    DISPOSE = 3,
    /**
     * @en The play spine skeleton animation complete type.
     * @zh 播放骨骼动画完成。
     * @property {Number} COMPLETE
     */
    COMPLETE = 4,
    /**
     * @en The spine skeleton animation event type.
     * @zh 骨骼动画事件。
     * @property {Number} EVENT
     */
    EVENT = 5
}
ccenum(AnimationEventType);

legacyCC.internal.SpineAnimationEventType = AnimationEventType;

export function loadWasmModuleSpine (): Promise<void> {
    return Promise.resolve();
}
