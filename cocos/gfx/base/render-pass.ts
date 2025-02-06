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

import { murmurhash2_32_gc } from '../../core/algorithm/murmurhash2_gc';
import {
    GFXObject,
    ObjectType,
    ColorAttachment,
    DepthStencilAttachment,
    SubpassInfo,
    RenderPassInfo,
} from './define';

/**
 * @en GFX render pass.
 * @zh GFX 渲染过程。
 */
export abstract class RenderPass extends GFXObject {
    /** @mangle */
    protected _colorInfos: ColorAttachment[] = [];
    /** @mangle */
    protected _depthStencilInfo: DepthStencilAttachment | null = null;
    /** @mangle */
    protected _subpasses: SubpassInfo[] = [];
    /** @mangle */
    protected _hash = 0;

    get colorAttachments (): Readonly<ColorAttachment[]> { return this._colorInfos; }
    get depthStencilAttachment (): Readonly<DepthStencilAttachment> | null { return this._depthStencilInfo; }
    get subPasses (): Readonly<SubpassInfo[]> { return this._subpasses; }
    get hash (): number { return this._hash; }

    constructor () {
        super(ObjectType.RENDER_PASS);
    }

    // Based on render pass compatibility
    protected computeHash (): number {
        let res = '';
        if (this._subpasses.length) {
            for (let i = 0; i < this._subpasses.length; ++i) {
                const subpass = this._subpasses[i];
                if (subpass.inputs.length) {
                    res += 'ia';
                    for (let j = 0; j < subpass.inputs.length; ++j) {
                        const ia = this._colorInfos[subpass.inputs[j]];
                        res += `,${ia.format},${ia.sampleCount}`;
                    }
                }
                if (subpass.colors.length) {
                    res += 'ca';
                    for (let j = 0; j < subpass.colors.length; ++j) {
                        const ca = this._colorInfos[subpass.colors[j]];
                        res += `,${ca.format},${ca.sampleCount}`;
                    }
                }
                if (subpass.depthStencil >= 0) {
                    const ds = this._colorInfos[subpass.depthStencil];
                    res += `ds,${ds.format},${ds.sampleCount}`;
                }
            }
        } else {
            res += 'ca';
            for (let i = 0; i < this._colorInfos.length; ++i) {
                const ca = this._colorInfos[i];
                res += `,${ca.format},${ca.sampleCount}`;
            }
            const ds = this._depthStencilInfo;
            if (ds) {
                res += `ds,${ds.format},${ds.sampleCount}`;
            }
        }

        return murmurhash2_32_gc(res, 666);
    }

    public abstract initialize (info: Readonly<RenderPassInfo>): void;

    public abstract destroy (): void;
}
