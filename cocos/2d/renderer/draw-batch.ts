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

import { Material } from '../../asset/assets/material';
import { Texture, Sampler, InputAssembler, DescriptorSet, Shader, DepthStencilState } from '../../gfx';
import { Node } from '../../scene-graph';
import { Model } from '../../render-scene/scene/model';
import { Layers } from '../../scene-graph/layers';
import { cclegacy } from '../../core';
import { IMacroPatch, Pass } from '../../render-scene/core/pass';
import { IBatcher } from './i-batcher';
import type { Root } from '../../root';

const UI_VIS_FLAG = Layers.Enum.NONE | Layers.Enum.UI_3D;

/** @mangle */
export class DrawBatch2D {
    get passes (): Pass[] {
        return this._passes;
    }

    public get shaders (): Shader[] {
        return this._shaders;
    }

    // public bufferBatch: MeshBuffer | null = null; // use less
    // public camera: Camera | null = null; // use less
    // public renderScene: RenderScene | null = null; // use less for now
    public model: Model | null = null; // for uimodel
    public texture: Texture | null = null;
    public sampler: Sampler | null = null;
    public useLocalData: Node | null = null;
    public isStatic = false; // use less,remove when remove Static batch
    public textureHash = 0;
    public samplerHash = 0;
    private _passes: Pass[] = [];
    private _shaders: Shader[] = [];
    public visFlags: number = UI_VIS_FLAG;
    public inputAssembler: InputAssembler | null = null;
    public descriptorSet: DescriptorSet | null = null;
    //private declare _nativeObj: any;

    public destroy (ui: IBatcher): void {
        this._passes = [];
    }

    public clear (): void {
        // this.bufferBatch = null;
        this.inputAssembler = null;
        this.descriptorSet = null;
        // this.camera = null;
        this.texture = null;
        this.sampler = null;
        this.textureHash = 0;
        this.samplerHash = 0;
        this.model = null;
        this.isStatic = false;
        this.useLocalData = null;
        this.visFlags = UI_VIS_FLAG;
        // this.renderScene = null;
    }

    // object version
    public fillPasses (mat: Material | null, dss: DepthStencilState | null, dssHash: number, patches: Readonly<IMacroPatch[] | null>): void {
        if (mat) {
            const passes = mat.passes;
            if (!passes) { return; }

            const hashFactor = 0;
            let dirty = false;

            this._shaders.length = passes.length;

            for (let i = 0; i < passes.length; i++) {
                if (!this._passes[i]) {
                    this._passes[i] = new Pass(cclegacy.director.root as Root);
                }
                const mtlPass = passes[i];
                const passInUse = this._passes[i];

                mtlPass.update();

                // Hack: Cause pass.hash can not check all pass value
                if (!dss) { dss = mtlPass.depthStencilState; dssHash = 0; }

                passInUse._initPassFromTarget(mtlPass, dss, dssHash);

                this._shaders[i] = passInUse.getShaderVariant(patches)!;

                dirty = true;
            }
        }
    }
}
