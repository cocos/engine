/*
 Copyright (c) 2021 Xiamen Yaji Software Co., Ltd.

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

import * as VertexFormat from './vertex-format';
import { Batcher2D } from './batcher-2d';
import { DrawBatch2D } from './draw-batch';
import { markAsWarning, replaceProperty } from '../../core/utils/x-deprecated';
import { MeshBuffer } from './mesh-buffer';

export { VertexFormat as UIVertexFormat };

export { Batcher2D as UI };

export { DrawBatch2D as UIDrawBatch };

markAsWarning(MeshBuffer.prototype, 'MeshBuffer', 
    [
        'byteStart',
        'vertexStart',
        'indicesStart',
        'request',
    ].map((item) => ({
        name: item,
        suggest: `please use meshBuffer.accessor.${item} instead`,
    })));
markAsWarning(MeshBuffer.prototype, 'MeshBuffer', [
    {
        name: 'vertexBuffers',
        suggest: 'please use meshBuffer.vertexBuffer instead',
    }
]);

replaceProperty(MeshBuffer.prototype, 'MeshBuffer', [
    {
        name: 'indicesOffset',
        newName: 'indexOffset',
    },
]);
