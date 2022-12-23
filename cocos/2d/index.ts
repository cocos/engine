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

import {
    CanvasPool, // Todo: Remove
    graphicsAssembler,
    labelAssembler,
    spriteAssembler,
    earcut, // Todo: Remove
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
    MeshBuffer, // Todo: Remove
    StencilManager,
    CanvasPool, // Todo: Remove
    spriteAssembler, // use less
    labelAssembler, // use less
    graphicsAssembler, // use less
    earcut, // Todo: Remove
};

cclegacy.UI = {
    MeshBuffer, // use less
    spriteAssembler, // use less
    graphicsAssembler, // use less
    labelAssembler, // use less
    RenderData,
    MeshRenderData,
};
