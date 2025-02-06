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

/**
 * Check whether the node or its parent has skew components and return the original world matrix without skew to `out` parameter.
 * @param node The node and its parent for finding skew.
 * @param out The node's original world matrix without skew.
 * @return true if the node or its parent has skew components, otherwise returns false.
 */
export function findSkewAndGetOriginalWorldMatrix (node: Node | null, out: Mat4): boolean {
    if (!node) {
        return false;
    }
    tempNodes.length = 0;
    const ancestors: Node[] = tempNodes;
    let startNode: Node | null = null;
    for (let cur: Node | null = node; cur; cur = cur.parent) {
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
            const cur = ancestors[i];
            Mat4.fromSRT(m4_1, cur.rotation, cur.position, cur.scale);
            Mat4.multiply(out, out, m4_1);
        }
        ret = true;
    } else {
        out.set(node._mat);
    }

    tempNodes.length = 0;
    return ret;
}

export function updateLocalMatrixBySkew (uiSkewComp: UISkew, outLocalMatrix: Mat4): void {
    if (!uiSkewComp.isSkewEnabled()) return;
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
