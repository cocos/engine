/*
 Copyright (c) 2025 Xiamen Yaji Software Co., Ltd.
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

import { cclegacy } from '../core/global-exports';
import type { Director } from '../game/director';
import type { Shadows } from '../render-scene/scene/shadows';
import type { Skybox } from '../render-scene/scene/skybox';
import type { PipelineSceneData } from './pipeline-scene-data';

export function getPipelineSceneData (): PipelineSceneData {
    return (cclegacy.director as Director).root!.pipeline.pipelineSceneData;
}

export function isHDRInPipelineSceneData (): boolean {
    return (cclegacy.director as Director).root!.pipeline.pipelineSceneData.isHDR;
}

export function setHDRInPipelineSceneData (v: boolean): void {
    (cclegacy.director as Director).root!.pipeline.pipelineSceneData.isHDR = v;
}

export function getShadowsInPipelineSceneData (): Shadows {
    return (cclegacy.director as Director).root!.pipeline.pipelineSceneData.shadows;
}

export function getSkyboxInPipelineSceneData (): Skybox {
    return (cclegacy.director as Director).root!.pipeline.pipelineSceneData.skybox;
}
