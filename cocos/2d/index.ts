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

import {
    labelAssembler,
    spriteAssembler,
} from './assembler';
import { RenderData, MeshRenderData } from './renderer/render-data';
import { MeshBuffer } from './renderer/mesh-buffer';
import { StencilManager } from './renderer/stencil-manager';
import { cclegacy } from '../core';
import './event';

import './renderer/batcher-2d';

export * from './assets';
export * from './framework';
export * from './components';
export * from './renderer/render-data';
export * from './renderer/base';
export * from './renderer/deprecated';
export * from './utils';

export {
    MeshBuffer,
    StencilManager,
    spriteAssembler, // use less
    labelAssembler, // use less
};

cclegacy.UI = {
    MeshBuffer, // use less
    spriteAssembler, // use less
    labelAssembler, // use less
    RenderData,
    MeshRenderData,
};
