/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

import { randomRangeInt, Vec3 } from '../../core';
import { ccclass } from '../../core/data/decorators';
import { InitializationModule, ParticleUpdateStage } from '../particle-module';
import { ParticleSOAData, RecordReason } from '../particle-soa-data';
import { ParticleSystemParams, ParticleUpdateContext } from '../particle-update-context';

@ccclass('cc.InitialModule')
export class InitialModule extends InitializationModule {
    public get name (): string {
        return 'InitialModule';
    }

    public get updateStage (): ParticleUpdateStage {
        return ParticleUpdateStage.INITIALIZE;
    }

    public get hideInInspector () {
        return true;
    }

    public get updatePriority (): number {
        return Number.NEGATIVE_INFINITY;
    }

    constructor () {
        super();
        this.enable = true;
    }

    public update (particles: ParticleSOAData, params: ParticleSystemParams, context: ParticleUpdateContext,
        fromIndex: number, toIndex: number, t: number) {
        const { randomSeed } = particles;
        for (let i = fromIndex; i < toIndex; i++) {
            randomSeed[i] = randomRangeInt(0, 233280);
        }
    }
}
