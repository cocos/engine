/*
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

/**
 * ui 相关模块
 * @module ui
 */

import type { UIRenderer } from '../framework/ui-renderer';
import type { IBatcher } from './i-batcher';
import type { BaseRenderData } from './render-data';

/**
 * @internal
 */
export interface IAssembler {
    createData? (comp: UIRenderer): BaseRenderData;
    fillBuffers? (comp: UIRenderer, renderer: IBatcher): void;
    updateUVs? (comp: UIRenderer, ...args: any[]): void;
    updateColor? (comp: UIRenderer): void;
    updateRenderData? (comp: UIRenderer): void;
    update? (comp: UIRenderer, dt: number): void;
    resetAssemblerData? (data: any): void;
    removeData? (data: BaseRenderData): void;
}

/**
 * @internal
 */
export interface IAssemblerManager {
    getAssembler (component: UIRenderer): IAssembler;
}
