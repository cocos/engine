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

import { getTypedArrayConstructor, Format, FormatInfos, TextureType, TextureUsageBit,
    Texture, TextureInfo, Device, BufferTextureCopy } from '../../gfx';
import { debug } from '../../core';

export function nearestPOT (num: number): number {
    --num;
    num |= num >> 16;
    num |= num >> 8;
    num |= num >> 4;
    num |= num >> 2;
    num |= num >> 1;
    ++num;
    return num;
}

export interface ITextureBuffer {
    texture: Texture;
    size: number;
    start: number;
    end: number;
}

export interface ITextureBufferHandle {
    chunkIdx: number;
    start: number;
    end: number;
    texture: Texture;
}

export interface ITextureBufferPoolInfo {
    format: Format; // target texture format
    inOrderFree?: boolean; // will the handles be freed exactly in the order of their allocation?
    alignment?: number; // the data alignment for each handle allocated, in bytes
    roundUpFn?: (size: number, formatSize: number) => number; // given a target size, how will the actual texture size round up?
}

function roundUp (n: number, alignment: number): number {
    return Math.ceil(n / alignment) * alignment;
}

export class TextureBufferPool {
    private declare _device: Device;
    private _format = Format.UNKNOWN;
    private _formatSize = 0;
    private _chunks: ITextureBuffer[] = [];
    private _chunkCount = 0;
    private _handles: ITextureBufferHandle[] = [];
    private _region0 = new BufferTextureCopy();
    private _region1 = new BufferTextureCopy();
    private _region2 = new BufferTextureCopy();
    private _roundUpFn: ((targetSize: number, formatSize: number) => number) | null = null;
    private _bufferViewCtor: TypedArrayConstructor = Uint8Array;
    private _channels = 4;
    private _alignment = 1;

    public constructor (device: Device) {
        this._device = device;
    }

    public initialize (info: ITextureBufferPoolInfo): void {
        const formatInfo = FormatInfos[info.format];
        this._format = info.format;
        this._formatSize = formatInfo.size;
        this._channels = formatInfo.count;
        this._bufferViewCtor = getTypedArrayConstructor(formatInfo);
        this._roundUpFn = info.roundUpFn || null;
        this._alignment = info.alignment || 1;
        if (info.inOrderFree) { this.alloc = this._McDonaldAlloc; }
    }

    public destroy (): void {
        for (let i = 0; i < this._chunkCount; ++i) {
            const chunk = this._chunks[i];
            chunk.texture.destroy();
        }
        this._chunks.length = 0;
        this._handles.length = 0;
    }

    public alloc (size: number, chunkIdx?: number): ITextureBufferHandle {
        size = roundUp(size, this._alignment);

        let index = -1;
        let start = -1;
        if (chunkIdx !== undefined) {
            index = chunkIdx;
            start = this._findAvailableSpace(size, index);
        }

        if (start < 0) {
            for (let i = 0; i < this._chunkCount; ++i) {
                index = i;
                start = this._findAvailableSpace(size, index);
                if (start >= 0) { break; }
            }
        }

        if (start >= 0) {
            const chunk = this._chunks[index];
            chunk.start += size;
            const handle: ITextureBufferHandle = {
                chunkIdx: index,
                start,
                end: start + size,
                texture: chunk.texture,
            };
            this._handles.push(handle);
            return handle;
        }

        // create a new one
        const targetSize = Math.sqrt(size / this._formatSize);
        const texLength = this._roundUpFn && this._roundUpFn(targetSize, this._formatSize) || Math.max(1024, nearestPOT(targetSize));
        const newChunk = this._chunks[this.createChunk(texLength)];

        newChunk.start += size;
        const texHandle: ITextureBufferHandle = {
            chunkIdx: this._chunkCount - 1,
            start: 0,
            end: size,
            texture: newChunk.texture,
        };
        this._handles.push(texHandle);
        return texHandle;
    }

    public free (handle: ITextureBufferHandle): void {
        for (let i = 0; i < this._handles.length; ++i) {
            if (this._handles[i] === handle) {
                this._chunks[handle.chunkIdx].end = handle.end;
                this._handles.splice(i, 1);
                return;
            }
        }
    }

    public createChunk (length: number): number {
        const texSize = length * length * this._formatSize;

        debug(`TextureBufferPool: Allocate chunk ${this._chunkCount}, size: ${texSize}, format: ${this._format}`);

        const texture: Texture = this._device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_DST,
            this._format,
            length,
            length,
        ));

        const chunk: ITextureBuffer = {
            texture,
            size: texSize,
            start: 0,
            end: texSize,
        };
        this._chunks[this._chunkCount] = chunk;
        return this._chunkCount++;
    }

    public update (handle: ITextureBufferHandle, buffer: ArrayBuffer): void {
        const buffers: ArrayBufferView[] = [];
        const regions: BufferTextureCopy[] = [];
        const start = handle.start / this._formatSize;

        let remainSize = buffer.byteLength / this._formatSize;
        let offsetX = start % handle.texture.width;
        let offsetY = Math.floor(start / handle.texture.width);
        let copySize = Math.min(handle.texture.width - offsetX, remainSize);
        let begin = 0;

        if (offsetX > 0) {
            this._region0.texOffset.x = offsetX;
            this._region0.texOffset.y = offsetY;
            this._region0.texExtent.width = copySize;
            this._region0.texExtent.height = 1;

            buffers.push(new this._bufferViewCtor(buffer, begin * this._formatSize, copySize * this._channels));
            regions.push(this._region0);

            offsetX = 0;
            offsetY += 1;
            remainSize -= copySize;
            begin += copySize;
        }

        if (remainSize > 0) {
            this._region1.texOffset.x = offsetX;
            this._region1.texOffset.y = offsetY;

            if (remainSize > handle.texture.width) {
                this._region1.texExtent.width = handle.texture.width;
                this._region1.texExtent.height = Math.floor(remainSize / handle.texture.width);
                copySize = this._region1.texExtent.width * this._region1.texExtent.height;
            } else {
                copySize = remainSize;
                this._region1.texExtent.width = copySize;
                this._region1.texExtent.height = 1;
            }

            buffers.push(new this._bufferViewCtor(buffer, begin * this._formatSize, copySize * this._channels));
            regions.push(this._region1);

            offsetX = 0;
            offsetY += this._region1.texExtent.height;
            remainSize -= copySize;
            begin += copySize;
        }

        if (remainSize > 0) {
            this._region2.texOffset.x = offsetX;
            this._region2.texOffset.y = offsetY;
            this._region2.texExtent.width = remainSize;
            this._region2.texExtent.height = 1;

            buffers.push(new this._bufferViewCtor(buffer, begin * this._formatSize, remainSize * this._channels));
            regions.push(this._region2);
        }

        this._device.copyBuffersToTexture(buffers, handle.texture, regions);
    }

    private _findAvailableSpace (size: number, chunkIdx: number): number {
        const chunk = this._chunks[chunkIdx];
        let isFound = false;
        let start = chunk.start;
        if ((start + size) <= chunk.size) {
            isFound = true;
        } else {
            start = 0; // try to find from head again
            const handles = this._handles.filter((h): boolean => h.chunkIdx === chunkIdx).sort((a, b): number => a.start - b.start);
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                if ((start + size) <= handle.start) {
                    isFound = true;
                    break;
                }
                start = handle.end;
            }
            if (!isFound && (start + size) <= chunk.size) {
                isFound = true;
            }
        }
        return isFound ? start : -1;
    }

    // [McDonald 12] Efficient Buffer Management
    private _McDonaldAlloc (size: number): ITextureBufferHandle {
        size = roundUp(size, this._alignment);

        for (let i = 0; i < this._chunkCount; ++i) {
            const chunk = this._chunks[i];
            let isFound = false;
            let start = chunk.start;
            if ((start + size) <= chunk.end) {
                isFound = true;
            } else if (start > chunk.end) {
                if ((start + size) <= chunk.size) {
                    isFound = true;
                } else if (size <= chunk.end) {
                    // Try to find from head again.
                    chunk.start = start = 0;
                    isFound = true;
                }
            } else if (start === chunk.end) {
                chunk.start = start = 0;
                chunk.end = chunk.size;
                if (size <= chunk.end) {
                    isFound = true;
                }
            }
            if (isFound) {
                chunk.start += size;
                const handle: ITextureBufferHandle = {
                    chunkIdx: i,
                    start,
                    end: start + size,
                    texture: chunk.texture,
                };
                this._handles.push(handle);
                return handle;
            }
        }

        // create a new one
        const targetSize = Math.sqrt(size / this._formatSize);
        const texLength = this._roundUpFn && this._roundUpFn(targetSize, this._formatSize) || Math.max(1024, nearestPOT(targetSize));
        const newChunk = this._chunks[this.createChunk(texLength)];

        newChunk.start += size;
        const texHandle: ITextureBufferHandle = {
            chunkIdx: this._chunkCount,
            start: 0,
            end: size,
            texture: newChunk.texture,
        };
        this._handles.push(texHandle);
        return texHandle;
    }
}
