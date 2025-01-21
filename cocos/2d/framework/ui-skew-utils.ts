/*
 Copyright (c) 2025 Xiamen Yaji Software Co., Ltd.

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

import { mat4, Mat4 } from '../../core';
import type { Node } from '../../scene-graph/node';
import type { UISkew } from './ui-skew';

const m4_1 = mat4();
const tempNodes: Node[] = [];
const DEG_TO_RAD = Math.PI / 180.0;

export function getParentWorldMatrixNoSkew (parent: Node | null, out: Mat4): boolean {
    if (!parent) {
        return false;
    }
    tempNodes.length = 0;
    const ancestors: Node[] = tempNodes;
    let startNode: Node | null = null;
    for (let cur: Node | null = parent; cur; cur = cur.parent) {
        ancestors.push(cur);
        if (cur._uiProps._uiSkewComp) {
            startNode = cur;
        }
    }

    let ret = false;
    if (startNode) {
        out.set(startNode.parent!._mat); // Set the first no-skew node's world matrix to out.
        const start = ancestors.indexOf(startNode);
        for (let i = start; i >= 0; --i) {
            const node = ancestors[i];
            Mat4.fromSRT(m4_1, node.rotation, node.position, node.scale);
            Mat4.multiply(out, out, m4_1);
        }
        ret = true;
    }

    tempNodes.length = 0;
    return ret;
}

export function updateLocalMatrixBySkew (uiSkewComp: UISkew, outLocalMatrix: Mat4): void {
    if (!uiSkewComp.skewEnabled) return;
    if (uiSkewComp.x === 0 && uiSkewComp.y === 0) return;
    const skewX = Math.tan(uiSkewComp.x * DEG_TO_RAD);
    const skewY = Math.tan(uiSkewComp.y * DEG_TO_RAD);
    const a = outLocalMatrix.m00;
    const b = outLocalMatrix.m01;
    const c = outLocalMatrix.m04;
    const d = outLocalMatrix.m05;
    outLocalMatrix.m00 = a + c * skewY;
    outLocalMatrix.m01 = b + d * skewY;
    outLocalMatrix.m04 = c + a * skewX;
    outLocalMatrix.m05 = d + b * skewX;
}
