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

import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { System, SystemPriority } from '../core';
import { ActionManager } from './actions/action-manager';
import { director, DirectorEvent } from '../game';

/**
 * @en
 * Tween system.
 * @zh
 * 缓动系统。
 */
export class TweenSystem extends System {
    /**
     * @en
     * The ID flag of the system.
     * @zh
     * 此系统的 ID 标记。
     */
    static readonly ID = 'TWEEN';

    /**
     * @en
     * Gets the instance of the tween system.
     * @zh
     * 获取缓动系统的实例。
     */
    static readonly instance: TweenSystem;

    /**
     * @en
     * Gets the action manager.
     * @zh
     * 获取动作管理器。
     */
    get ActionManager (): ActionManager {
        return this.actionMgr;
    }

    private readonly actionMgr = new ActionManager();

    constructor () {
        super();
    }

    /**
     * @en
     * The update will auto execute after all components update.
     * @zh
     * 此方法会在组件 update 之后自动执行。
     * @param dt @en The delta time @zh 间隔时间
     */
    update (dt: number): void {
        if (!EDITOR_NOT_IN_PREVIEW || this._executeInEditMode) {
            this.actionMgr.update(dt);
        }
    }
}

director.on(DirectorEvent.INIT, () => {
    const sys = new TweenSystem();
    (TweenSystem as any).instance = sys;
    director.registerSystem(TweenSystem.ID, sys, SystemPriority.MEDIUM);
});
