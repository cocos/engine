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

import { director } from '../game/director';
import { System, SystemPriority } from '../core';
import { Skeleton } from './skeleton';
import { legacyCC } from '../core/global-exports';

export class SkeletonSystem extends System {
    /**
     * @en
     * The ID flag of the system.
     * @zh
     * 此系统的 ID 标记。
     */
    static readonly ID = 'SKELETON';

    private static _instance: SkeletonSystem;

    private constructor () {
        super();
    }

    /**
     * @en
     * Gets the instance of the Spine Skeleton system.
     * @zh
     * 获取 Spine 骨骼系统的单例。
     */
    public static getInstance (): SkeletonSystem {
        if (!SkeletonSystem._instance) {
            SkeletonSystem._instance = new SkeletonSystem();
            director.registerSystem(SkeletonSystem.ID, SkeletonSystem._instance, SystemPriority.HIGH);
        }
        return SkeletonSystem._instance;
    }

    private _skeletons = new Set<Skeleton>();

    public add (skeleton: Skeleton | null): void {
        if (!skeleton) return;
        if (!this._skeletons.has(skeleton)) {
            this._skeletons.add(skeleton);
        }
    }

    public remove (skeleton: Skeleton | null): void {
        if (!skeleton) return;
        if (this._skeletons.has(skeleton)) {
            this._skeletons.delete(skeleton);
        }
    }

    postUpdate (dt: number): void {
        if (!this._skeletons) {
            return;
        }
        this._skeletons.forEach((skeleton) => {
            skeleton.updateAnimation(dt);
        });
    }

    public prepareRenderData (): void {
        if (!this._skeletons) {
            return;
        }
        this._skeletons.forEach((skeleton) => {
            skeleton._markForUpdateRenderData();
        });
    }
}
legacyCC.internal.SpineSkeletonSystem = SkeletonSystem;
