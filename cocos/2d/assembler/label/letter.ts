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

import { JSB } from 'internal:constants';
import { Color } from '../../../core';
import type { IBatcher } from '../../renderer/i-batcher';
import type { Label } from '../../components/label';
import { fillMeshVertices3D } from '../utils';
import { LetterFont } from './letter-font';
import type { RenderData } from '../../renderer/render-data';
import type { IAssembler } from '../../renderer/base';

const tempColor = new Color(255, 255, 255, 255);

/**
 * letter 组装器
 * 可通过 `UI.letter` 获取该组装器。
 */
class Letter extends LetterFont implements IAssembler {
    createData (comp: Label): RenderData {
        const renderData = comp.requestRenderData();
        renderData.resize(0, 0);
        return renderData;
    }

    fillBuffers (comp: Label, renderer: IBatcher): void {
        if (!comp.renderData) {
            return;
        }

        const node = comp.node;
        tempColor.a = node._uiProps.opacity * 255;
        // Fill All
        fillMeshVertices3D(node, renderer, comp.renderData, tempColor);
    }

    updateColor (label: Label): void {
        if (JSB) {
            const renderData = label.renderData!;
            const vertexCount = renderData.vertexCount;
            if (vertexCount === 0) return;
            const vData = renderData.chunk.vb;
            const stride = renderData.floatStride;
            let colorOffset = 5;
            for (let i = 0; i < vertexCount; i++) {
                vData[colorOffset] = 1;
                vData[colorOffset + 1] = 1;
                vData[colorOffset + 2] = 1;
                vData[colorOffset + 3] = 1;
                colorOffset += stride;
            }
        }
    }
}

export const letter = new Letter();
