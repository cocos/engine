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

import { JSB } from 'internal:constants';
import { Device, BufferUsageBit, MemoryUsageBit, Attribute, Buffer, BufferInfo, InputAssembler, InputAssemblerInfo } from '../../gfx';
import { getAttributeStride } from './vertex-format';
import { sys, getError, warnID, assertIsTrue } from '../../core';
import { NativeUIMeshBuffer } from './native-2d';

interface IIARef {
    ia: InputAssembler;
    vertexBuffers: Buffer[];
    indexBuffer: Buffer;
}

enum MeshBufferSharedBufferView {
    byteOffset,
    vertexOffset,
    indexOffset,
    dirty,
    count,
}

const IA_POOL_USED_SCALE = 1 / 2;

/**
 * @en Mesh buffer used for 2d rendering, used internally and not of concern to the user.
 * @zh 2d 渲染使用的网格缓冲数据，内部使用，用户不须关心。
 * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export class MeshBuffer {
    /**
     * @en The vertex attributes of the buffer.
     * @zh buffer 的顶点属性。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get attributes (): Attribute[] { return this._attributes; }
    /**
     * @en Number of bytes in vertex format.
     * @zh 顶点格式的字节数。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get vertexFormatBytes (): number { return this._vertexFormatBytes; }

    protected _byteOffset = 0;
    /**
     * @en byte offset.
     * @zh 字节偏移量。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get byteOffset (): number {
        return this._byteOffset;
    }
    set byteOffset (val: number) {
        this._byteOffset = val;
        if (JSB) {
            this._sharedBuffer[MeshBufferSharedBufferView.byteOffset] = val;
        }
    }

    protected _vertexOffset = 0;
    /**
     * @en Vertexes offset.
     * @zh 顶点数偏移。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get vertexOffset (): number {
        return this._vertexOffset;
    }
    set vertexOffset (val: number) {
        this._vertexOffset = val;
        if (JSB) {
            this._sharedBuffer[MeshBufferSharedBufferView.vertexOffset] = val;
        }
    }

    protected _indexOffset = 0;
    /**
     * @en Indices offset.
     * @zh 索引偏移。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get indexOffset (): number {
        return this._indexOffset;
    }
    set indexOffset (val: number) {
        this._indexOffset = val;
        if (JSB) {
            this._sharedBuffer[MeshBufferSharedBufferView.indexOffset] = val;
        }
    }

    protected _dirty = false;
    /**
     * @en Dirty flag.
     * @zh 脏标记。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get dirty (): boolean {
        return this._dirty;
    }
    set dirty (val: boolean) {
        this._dirty = val;
        if (JSB) {
            this._sharedBuffer[MeshBufferSharedBufferView.dirty] = val ? 1 : 0;
        }
    }

    protected _floatsPerVertex = 0;
    /**
     * @en Float numbers per vertex.
     * @zh 每顶点的浮点数长度。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get floatsPerVertex (): number {
        return this._floatsPerVertex;
    }
    set floatsPerVertex (val: number) {
        this._floatsPerVertex = val;
    }

    protected _vData: Float32Array = null!;
    /**
     * @en Vertexes data.
     * @zh 顶点数据。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get vData (): Float32Array {
        return this._vData;
    }
    set vData (val: Float32Array) {
        this._vData = val;
        //还得看是否需要共享.buffer
        if (JSB) {
            this._nativeObj.vData = val;
        }
    }

    protected _iData: Uint16Array = null!;
    /**
     * @en Indices data.
     * @zh 索引数据。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get iData (): Uint16Array {
        return this._iData;
    }
    set iData (val: Uint16Array) {
        this._iData = val;
        if (JSB) {
            this._nativeObj.iData = val;
        }
    }

    private _vertexFormatBytes = 0;
    private _initVDataCount = 0;
    private _initIDataCount = 0;
    private _attributes: Attribute[] = null!;

    // InputAssembler pools for each mesh buffer, array offset correspondent
    private _iaPool: IIARef[] = [];
    private _iaInfo: InputAssemblerInfo = null!;
    private _nextFreeIAHandle = 0;

    //nativeObj
    protected declare _nativeObj: NativeUIMeshBuffer;
    /**
     * @en Native object.
     * @zh 原生对象。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get nativeObj (): NativeUIMeshBuffer {
        return this._nativeObj;
    }

    //sharedBuffer
    protected declare _sharedBuffer: Uint32Array;
    /**
     * @en Native shared buffer.
     * @zh 原生共享缓冲。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get sharedBuffer (): Uint32Array {
        return this._sharedBuffer;
    }

    /**
     * @en Initial native shared buffer.
     * @zh 初始化原生共享缓冲。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public initSharedBuffer (): void {
        if (JSB) {
            this._sharedBuffer = new Uint32Array(MeshBufferSharedBufferView.count);
        }
    }

    /**
     * @en Synchronized native shared buffer.
     * @zh 同步原生共享缓冲。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public syncSharedBufferToNative (): void {
        if (JSB) {
            this._nativeObj.syncSharedBufferToNative(this._sharedBuffer);
        }
    }

    constructor () {
        if (JSB) {
            this._nativeObj = new NativeUIMeshBuffer();
        }
        this.initSharedBuffer();
        this.syncSharedBufferToNative();
    }

    /**
     * @en Initialize mesh buffer.
     * @zh 初始化对象。
     * @param device @en The GFX device. @zh GFX设备。
     * @param attrs @en The vertex attributes of the buffer. @zh 缓冲区的顶点属性。
     * @param vFloatCount @en The vertexes float count. @zh 每顶点所需的 float 数量。
     * @param iCount @en The indices count. @zh 索引数量。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public initialize (device: Device, attrs: Attribute[], vFloatCount: number, iCount: number): void {
        this._initVDataCount = vFloatCount;
        this._initIDataCount = iCount;
        this._attributes = attrs;

        this.floatsPerVertex = getAttributeStride(attrs) >> 2;

        assertIsTrue(this._initVDataCount / this._floatsPerVertex < 65536, getError(9005));

        if (!this.vData || !this.iData) {
            this.vData = new Float32Array(this._initVDataCount);
            this.iData = new Uint16Array(this._initIDataCount);
        }
        // Initialize the first ia
        this._iaPool.push(this.createNewIA(device));
        if (JSB) {
            this._nativeObj.initialize(attrs);
        }
    }

    /**
     * @en Reset state.
     * @zh 重置状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public reset (): void {
        this._nextFreeIAHandle = 0;
        this.dirty = false;
    }

    public destroy (): void {
        this.reset();
        this._attributes = null!;
        this._iaInfo = null!;
        this.vData = null!;
        this.iData = null!;

        // Destroy InputAssemblers
        for (let i = 0; i < this._iaPool.length; ++i) {
            const iaRef = this._iaPool[i];
            const vertexBuffer0 = iaRef.vertexBuffers[0];
            if (vertexBuffer0) {
                vertexBuffer0.destroy();
            }
            const indexBuffer = iaRef.indexBuffer;
            if (indexBuffer) {
                indexBuffer.destroy();
            }
            iaRef.ia.destroy();
        }
        this._iaPool.length = 0;
    }

    /**
     * @en Set dirty flag.
     * @zh 设置脏标签。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public setDirty (): void {
        this.dirty = true;
    }

    /**
     * @deprecated since v3.4.0, please use BufferAccessor's request
     * @see [[BufferAccessor.request]]
     */
    public request (vertexCount: number, indexCount: number): boolean {
        warnID(9002);
        return false;
    }

    /**
     * @en require Free input assembler.
     * @zh 请求可用的输入汇集器。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public requireFreeIA (device: Device): InputAssembler {
        if (this._iaPool.length <= this._nextFreeIAHandle) {
            this._iaPool.push(this.createNewIA(device));
        }
        const ia = this._iaPool[this._nextFreeIAHandle++].ia;
        return ia;
    }

    /**
     * @en recycle input assembler.
     * @zh 回收输入汇集器。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public recycleIA (ia: InputAssembler): void {
        const pool = this._iaPool;
        for (let i = 0; i < this._nextFreeIAHandle; ++i) {
            if (ia === pool[i].ia) {
                // Swap to recycle the ia
                const iaRef = pool[i];
                pool[i] = pool[--this._nextFreeIAHandle];
                pool[this._nextFreeIAHandle] = iaRef;
                return;
            }
        }
    }

    /**
     * @en check capacity.
     * @zh 检查可分配余量。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public checkCapacity (vertexCount: number, indexCount: number): boolean {
        const maxVertex = (this.vertexOffset + vertexCount) * this._floatsPerVertex;
        const maxIndex = this.indexOffset + indexCount;
        if (maxVertex > this._initVDataCount || maxIndex > this._initIDataCount) {
            return false;
        }
        return true;
    }

    /**
     * @en Upload and update buffers data.
     * @zh 上传更新缓冲内容。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public uploadBuffers (): void {
        if (this.byteOffset === 0 || !this._dirty) {
            return;
        }

        // On iOS14, different IAs can not share same GPU buffer, so must submit the same date to different buffers
        const iOS14 = sys.__isWebIOS14OrIPadOS14Env;
        const submitCount = iOS14 ? this._nextFreeIAHandle : 1;
        if (iOS14 && (submitCount / this._iaPool.length < IA_POOL_USED_SCALE)) {
            const count = submitCount / IA_POOL_USED_SCALE;
            const length = this._iaPool.length;
            // Destroy InputAssemblers
            for (let i = length - 1; i >= count; i--) {
                const iaRef = this._iaPool[i];
                if (iaRef.vertexBuffers[0]) {
                    iaRef.vertexBuffers[0].destroy();
                }
                if (iaRef.indexBuffer) {
                    iaRef.indexBuffer.destroy();
                }
                iaRef.ia.destroy();
            }
            this._iaPool.length = count;
        }
        const byteCount = this.byteOffset;
        const indexCount = this.indexOffset;
        for (let i = 0; i < submitCount; ++i) {
            const iaRef = this._iaPool[i];

            const verticesData = new Float32Array(this.vData.buffer, 0, byteCount >> 2);
            const indicesData = new Uint16Array(this.iData.buffer, 0, indexCount);

            const vertexBuffer = iaRef.vertexBuffers[0];
            if (byteCount > vertexBuffer.size) {
                vertexBuffer.resize(byteCount);
            }
            vertexBuffer.update(verticesData);

            if (indexCount * 2 > iaRef.indexBuffer.size) {
                iaRef.indexBuffer.resize(indexCount * 2);
            }
            iaRef.indexBuffer.update(indicesData);
        }
        this.dirty = false;
    }

    private createNewIA (device: Device): IIARef {
        let ia: InputAssembler;
        let vertexBuffers: Buffer[];
        let indexBuffer: Buffer;
        // HACK: After sharing buffer between drawcalls, the performance degradation a lots on iOS 14 or iPad OS 14 device
        // TODO: Maybe it can be removed after Apple fixes it?
        if (sys.__isWebIOS14OrIPadOS14Env || !this._iaPool[0]) {
            const vbStride = this._vertexFormatBytes = this._floatsPerVertex * Float32Array.BYTES_PER_ELEMENT;
            const ibStride = Uint16Array.BYTES_PER_ELEMENT;
            const vertexBuffer = device.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                vbStride,
                vbStride,
            ));
            indexBuffer = device.createBuffer(new BufferInfo(
                BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                ibStride,
                ibStride,
            ));

            vertexBuffers = [vertexBuffer];
            // Reuse purpose for new IAs
            this._iaInfo = new InputAssemblerInfo(this._attributes, vertexBuffers, indexBuffer);
            ia = device.createInputAssembler(this._iaInfo);
        } else {
            ia = device.createInputAssembler(this._iaInfo);
            vertexBuffers = this._iaInfo.vertexBuffers;
            indexBuffer = this._iaInfo.indexBuffer!;
        }
        return {
            ia,
            vertexBuffers,
            indexBuffer,
        };
    }
}
