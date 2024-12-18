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

import { Filter, SamplerInfo } from '../../base/define';
import { Sampler } from '../../base/states/sampler';
import { WebGLConstants } from '../../gl-constants';
import { IWebGLGPUSampler } from '../webgl-gpu-objects';

const WebGLWraps: GLenum[] = [
    0x2901, // WebGLRenderingContext.REPEAT,
    0x8370, // WebGLRenderingContext.MIRRORED_REPEAT,
    0x812F, // WebGLRenderingContext.CLAMP_TO_EDGE,
    0x812F, // WebGLRenderingContext.CLAMP_TO_EDGE,
];

export class WebGLSampler extends Sampler {
    public get gpuSampler (): IWebGLGPUSampler {
        return  this._gpuSampler!;
    }

    private _gpuSampler: IWebGLGPUSampler | null = null;

    constructor (info: Readonly<SamplerInfo>, hash: number) {
        super(info, hash);

        let glMinFilter = 0;
        let glMagFilter = 0;

        const minFilter = this._info.minFilter;
        const magFilter = this._info.magFilter;
        const mipFilter = this._info.mipFilter;

        if (minFilter === Filter.LINEAR || minFilter === Filter.ANISOTROPIC) {
            if (mipFilter === Filter.LINEAR || mipFilter === Filter.ANISOTROPIC) {
                glMinFilter = WebGLConstants.LINEAR_MIPMAP_LINEAR;
            } else if (mipFilter === Filter.POINT) {
                glMinFilter = WebGLConstants.LINEAR_MIPMAP_NEAREST;
            } else {
                glMinFilter = WebGLConstants.LINEAR;
            }
        } else if (mipFilter === Filter.LINEAR || mipFilter === Filter.ANISOTROPIC) {
            glMinFilter = WebGLConstants.NEAREST_MIPMAP_LINEAR;
        } else if (mipFilter === Filter.POINT) {
            glMinFilter = WebGLConstants.NEAREST_MIPMAP_NEAREST;
        } else {
            glMinFilter = WebGLConstants.NEAREST;
        }

        if (magFilter === Filter.LINEAR || magFilter === Filter.ANISOTROPIC) {
            glMagFilter = WebGLConstants.LINEAR;
        } else {
            glMagFilter = WebGLConstants.NEAREST;
        }

        const glWrapS = WebGLWraps[this._info.addressU];
        const glWrapT = WebGLWraps[this._info.addressV];
        const glWrapR = WebGLWraps[this._info.addressW];

        this._gpuSampler = {
            glMinFilter,
            glMagFilter,
            glWrapS,
            glWrapT,
            glWrapR,
        };
    }
}
