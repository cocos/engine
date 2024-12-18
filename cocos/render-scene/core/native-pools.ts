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

export class NativeBufferPool {
    private _arrayBuffers: ArrayBuffer[] = [];
    private declare _chunkSize: number;
    constructor (dataType: number, entryBits: number, stride: number) {
        this._chunkSize = stride * (1 << entryBits);
    }
    public allocateNewChunk (): ArrayBuffer { return new ArrayBuffer(this._chunkSize); }
}

export class NativeObjectPool<T> {
    constructor (dataType: number, array: T[]) {}
    public bind (index: number, obj: T): void {}
}

export class NativeBufferAllocator {
    constructor (poolType: number) {}
    public alloc (index: number, bytes: number): ArrayBuffer { return new ArrayBuffer(bytes); }
    public free (index: number): void {}
}
