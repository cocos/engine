/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { CachedArray } from '../../core';
import { TextureBase } from '../../asset/assets/texture-base';
import { Device, Attribute } from '../../gfx';
import { Camera } from '../../render-scene/scene/camera';
import { Model } from '../../render-scene/scene/model';
import { SpriteFrame } from '../assets/sprite-frame';
import { UIStaticBatch } from '../components/ui-static-batch';
import { UIRenderer, RenderRoot2D } from '../framework';
import { StaticVBAccessor } from './static-vb-accessor';
import { DrawBatch2D } from './draw-batch';
import { BaseRenderData } from './render-data';
import { UIMeshRenderer } from '../components/ui-mesh-renderer';
import { Material } from '../../asset/assets';
import { Node } from '../../scene-graph';

export interface IBatcher {
    currBufferAccessor: StaticVBAccessor;
    readonly batches: CachedArray<DrawBatch2D>;
    // registerCustomBuffer (attributes: MeshBuffer | Attribute[], callback: ((...args: number[]) => void) | null) : MeshBuffer;
    // unRegisterCustomBuffer (buffer: MeshBuffer);

    currStaticRoot: UIStaticBatch | null;
    currIsStatic: boolean;

    device: Device;

    initialize(): boolean;
    destroy(): void;

    addScreen (comp: RenderRoot2D): void;
    getFirstRenderCamera (node: Node): Camera | null;
    removeScreen (comp: RenderRoot2D): void;

    sortScreens (): void;

    update (): void;
    uploadBuffers (): void;
    reset (): void;

    switchBufferAccessor (attributes?: Attribute[]): StaticVBAccessor;

    commitComp (
        comp: UIRenderer,
        renderData: BaseRenderData|null,
        textureOrFrame: TextureBase | SpriteFrame | null,
        assembler: any,
        transform: Node | null
    ): void;

    commitModel (comp: UIMeshRenderer | UIRenderer, model: Model | null, mat: Material | null): void;

    setupStaticBatch (staticComp: UIStaticBatch, bufferAccessor: StaticVBAccessor): void;
    endStaticBatch (): void;
    commitStaticBatch (comp: UIStaticBatch): void;

    autoMergeBatches (renderComp?: UIRenderer): void;
    forceMergeBatches (material: Material, textureOrFrame: TextureBase | SpriteFrame | null, renderComp: UIRenderer): void;
    finishMergeBatches (): void;
    flushMaterial (mat: Material): void;

    walk (node: Node, level?: number): void;
}
