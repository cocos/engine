/*
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

import { EffectAsset } from '../../asset/assets/effect-asset';
import { MaterialInstance } from './material-instance';
import { BatchingSchemes, Pass, PassOverrides } from './pass';
import { overrideMacros, MacroRecord } from './pass-utils';

/**
 * @en A pass instance defines an variant version of the [[renderer.Pass]]
 * @zh 表示 [[renderer.Pass]] 的一种特殊实例
 */
export class PassInstance extends Pass {
    /**
     * @en The parent pass
     * @zh 相关联的原始 Pass
     */
    get parent (): Pass { return this._parent; }

    private declare _parent: Pass;

    private declare _owner: MaterialInstance;

    private _dontNotify = false;

    constructor (parent: Pass, owner: MaterialInstance) {
        super(parent.root);
        this._parent = parent;
        this._owner = owner;
        this._doInit(this._parent, true); // defines may change now

        this._shaderInfo.blocks.forEach((u) => {
            const block = this._blocks[u.binding];
            const parentBlock = this._parent.blocks[u.binding];
            block.set(parentBlock);
        });
        this._rootBufferDirty = true;
        const parentInstance = this._parent as PassInstance;
        const thisDescriptorSet = this._descriptorSet;
        this._shaderInfo.samplerTextures.forEach((u) => {
            for (let j = 0; j < u.count; j++) {
                const parentDescriptorSet = parentInstance._descriptorSet;
                const binding = u.binding;
                const sampler = parentDescriptorSet.getSampler(binding, j);
                const texture = parentDescriptorSet.getTexture(binding, j);
                thisDescriptorSet.bindSampler(binding, sampler, j);
                thisDescriptorSet.bindTexture(binding, texture, j);
            }
        });
        super.tryCompile();
    }

    /**
     * @en Override pipeline states with the given pass override info.
     * This won't affect the original pass
     * @zh 重载当前 Pass 的管线状态。这不会影响原始 Pass
     * @param original The original pass info
     * @param value The override pipeline state info
     */
    public overridePipelineStates (original: EffectAsset.IPassInfo, overrides: PassOverrides): void {
        this._bs.reset();
        this._rs.reset();
        this._dss.reset();

        Pass.fillPipelineInfo(this, original);
        Pass.fillPipelineInfo(this, overrides);
        this._onStateChange();
    }

    public tryCompile (defineOverrides?: MacroRecord): boolean {
        if (defineOverrides) {
            if (!overrideMacros(this._defines, defineOverrides)) {
                return false;
            }
        }
        const res = super.tryCompile();
        this._onStateChange();
        return res;
    }

    /**
     * @en Prepare to change states of the pass and do not notify the material to rebuild the pipeline state object
     * @zh 开始静默修改 Pass 相关状态，不会通知材质去重新构建管线状态对象。
     */
    public beginChangeStatesSilently (): void {
        this._dontNotify = true;
    }

    /**
     * @en End the silent states changing process, all state changes will be notified.
     * @zh 结束静默状态修改，所有修改将会开始通知材质。
     */
    public endChangeStatesSilently (): void {
        this._dontNotify = false;
    }

    protected _syncBatchingScheme (): void {
        this._defines.USE_INSTANCING = false;
        this._batchingScheme = BatchingSchemes.NONE;
    }

    protected _onStateChange (): void {
        this._hash = Pass.getPassHash(this);
        this._owner.onPassStateChange(this._dontNotify);
    }
}
