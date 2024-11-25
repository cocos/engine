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

import { Rect, Viewport } from '../base/define';
import { BlendState, DepthStencilState, RasterizerState } from '../base/pipeline-state';

export interface IWebGLTexUnit {
    glTexture: WebGLTexture | null;
}

export class WebGLStateCache {
    public glArrayBuffer: WebGLBuffer | null = null;
    public glElementArrayBuffer: WebGLBuffer | null = null;
    public glVAO: WebGLVertexArrayObjectOES | null = null;
    public texUnit = 0;
    public glTexUnits: IWebGLTexUnit[] = [];
    public glRenderbuffer: WebGLRenderbuffer | null = null;
    public glFramebuffer: WebGLFramebuffer | null = null;
    public viewport = new Viewport();
    public scissorRect = new Rect(0, 0, 0, 0);
    public rs = new RasterizerState();
    public dss = new DepthStencilState();
    public bs = new BlendState();
    public glProgram: WebGLProgram | null = null;
    public glEnabledAttribLocs: boolean[] = [];
    public glCurrentAttribLocs: boolean[] = [];
    public texUnitCacheMap: Record<string, number> = {};

    initialize (texUnit: number, vertexAttributes: number): void {
        for (let i = 0; i < texUnit; ++i) this.glTexUnits.push({ glTexture: null });

        this.glEnabledAttribLocs.length = vertexAttributes;
        this.glEnabledAttribLocs.fill(false);

        this.glCurrentAttribLocs.length = vertexAttributes;
        this.glCurrentAttribLocs.fill(false);
    }
}
