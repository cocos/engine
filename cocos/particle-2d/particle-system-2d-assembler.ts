/*
 Copyright (c) 2017-2018 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import type { IAssembler, IAssemblerManager } from '../2d/renderer/base';
import { ParticleSystem2D } from './particle-system-2d';
import { MeshRenderData } from '../2d/renderer/render-data';
import { cclegacy } from '../core';

export class Particle2DAssembler implements IAssembler {
    maxParticleDeltaTime = 0;

    createData (comp: ParticleSystem2D): MeshRenderData {
        return MeshRenderData.add();
    }

    removeData (data: MeshRenderData): void {
        MeshRenderData.remove(data);
    }
}

export const particle2DAssembler = new Particle2DAssembler();

export const ParticleSystem2DAssembler: IAssemblerManager = {
    getAssembler (comp: ParticleSystem2D): IAssembler {
        if (!particle2DAssembler.maxParticleDeltaTime) {
            particle2DAssembler.maxParticleDeltaTime = cclegacy.game.frameTime / 1000 * 2;
        }
        return particle2DAssembler;
    },
};

ParticleSystem2D.Assembler = ParticleSystem2DAssembler;
