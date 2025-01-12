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

import { btCache } from './instantiated';
import type { BulletSharedBody } from './bullet-shared-body';
import type { BulletCharacterController } from './character-controllers/bullet-character-controller';

// The import function used in c++ code, same as DLL Import
export const importFunc = {
    syncPhysicsToGraphics (id: number): void {
        const body = btCache.CACHE.getWrapper<BulletSharedBody>(id, btCache.BODY_CACHE_NAME);
        body.syncPhysicsToGraphics();
    },
    onShapeHitExt (hit: number, controller: number): void {
        const cct = btCache.CACHE.getWrapper<BulletCharacterController>(controller, btCache.CCT_CACHE_NAME);
        cct.onShapeHitExt(hit);
    },
    onDebugDrawLine (from: number, to: number, color: number): void {
        const world = btCache.CACHE.world;
        if (world) {
            world.onDebugDrawLine(from, to, color);
        }
    },
    clearLines (): void {
        const world = btCache.CACHE.world;
        if (world) {
            world.onClearLines();
        }
    },
    flushLines (): void {
        //empty
    },
};
