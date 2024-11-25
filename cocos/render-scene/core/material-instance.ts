/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
import { PassInstance } from './pass-instance';
import { MacroRecord } from './pass-utils';
import { PassOverrides } from './pass';
import { Renderer } from '../../misc/renderer';

export interface IMaterialInstanceInfo {
    parent: Material;
    owner?: Renderer;
    subModelIdx?: number;
}

/**
 * @zh
 * 材质实例，当有材质修改需求时，根据材质资源创建的，可任意定制的实例。
 */
export class MaterialInstance extends Material {
    get parent (): Material {
        return this._parent;
    }

    get owner (): Renderer | null {
        return this._owner;
    }

    protected _passes: PassInstance[] = [];

    private declare _parent: Material;
    private declare _owner: Renderer | null;
    private _subModelIdx = 0;

    constructor (info: IMaterialInstanceInfo) {
        super();
        this._parent = info.parent;
        this._owner = info.owner || null;
        this._subModelIdx = info.subModelIdx || 0;
        this.copy(this._parent);
    }

    public recompileShaders (overrides: MacroRecord, passIdx?: number): void {
        if (!this._passes || !this.effectAsset) { return; }
        if (passIdx === undefined) {
            for (const pass of this._passes) {
                pass.tryCompile(overrides);
            }
        } else {
            this._passes[passIdx].tryCompile(overrides);
        }
    }

    public overridePipelineStates (overrides: PassOverrides, passIdx?: number): void {
        if (!this._passes || !this.effectAsset) { return; }
        const passInfos = this.effectAsset.techniques[this.technique].passes;
        if (passIdx === undefined) {
            for (let i = 0; i < this._passes.length; i++) {
                const pass = this._passes[i];
                const state = this._states[i] || (this._states[i] = {});
                for (const key in overrides) { state[key] = overrides[key]; }
                pass.overridePipelineStates(passInfos[pass.passIndex], state);
            }
        } else {
            const state = this._states[passIdx] || (this._states[passIdx] = {});
            for (const key in overrides) { state[key] = overrides[key]; }
            this._passes[passIdx].overridePipelineStates(passInfos[passIdx], state);
        }
    }

    public destroy (): boolean {
        this._doDestroy();
        return true;
    }

    public onPassStateChange (dontNotify: boolean): void {
        this._hash = Material.getHash(this);
        if (!dontNotify && this._owner) {
            this._owner._onRebuildPSO(this._subModelIdx, this);
        }
    }

    protected _createPasses (): PassInstance[] {
        const passes: PassInstance[] = [];
        const parentPasses = this._parent.passes;
        if (!parentPasses) { return passes; }
        for (let k = 0; k < parentPasses.length; ++k) {
            passes.push(new PassInstance(parentPasses[k], this));
        }
        return passes;
    }
}
