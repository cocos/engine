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
    BufferFlagBit,
    BufferFlags,
    BufferUsage,
    BufferUsageBit,
    MemoryUsage,
    MemoryUsageBit,
    GFXObject,
    ObjectType,
    BufferInfo,
    BufferViewInfo,
    BufferSource,
} from './define';

/**
 * @en GFX buffer.
 * @zh GFX 缓冲。
 */
export abstract class Buffer extends GFXObject {
    /**
     * @en Usage type of the buffer.
     * @zh 缓冲使用方式。
     */
    get usage (): BufferUsage {
        return this._usage;
    }

    /**
     * @en Memory usage of the buffer.
     * @zh 缓冲的内存使用方式。
     */
    get memUsage (): MemoryUsage {
        return this._memUsage;
    }

    /**
     * @en Size of the buffer.
     * @zh 缓冲大小。
     */
    get size (): number {
        return this._size;
    }

    /**
     * @en Stride of the buffer.
     * @zh 缓冲步长。
     */
    get stride (): number {
        return this._stride;
    }

    /**
     * @en Count of the buffer wrt. stride.
     * @zh 缓冲条目数量。
     */
    get count (): number {
        return this._count;
    }

    get flags (): BufferFlags {
        return this._flags;
    }

    protected _usage: BufferUsage = BufferUsageBit.NONE;
    protected _memUsage: MemoryUsage = MemoryUsageBit.NONE;
    protected _size = 0;
    protected _stride = 1;
    protected _count = 0;
    protected _flags: BufferFlags = BufferFlagBit.NONE;
    protected _isBufferView = false;

    constructor () {
        super(ObjectType.BUFFER);
    }

    public abstract initialize (info: Readonly<BufferInfo> | Readonly<BufferViewInfo>): void;

    public abstract destroy (): void;

    /**
     * @en Resize the buffer.
     * @zh 重置缓冲大小。
     * @param size The new buffer size.
     */
    public abstract resize (size: number): void;

    /**
     * @en Update the buffer data.
     * @zh 更新缓冲内容。
     * @param buffer The new buffer data.
     * @param size Size in bytes to be updated.
     */
    public abstract update (buffer: Readonly<BufferSource>, size?: number): void;
}
