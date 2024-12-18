/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { DEBUG } from 'internal:constants';
import { NativeBufferPool } from './native-pools';
import { warn } from '../../core/platform/debug';

const contains = (a: number[], t: number): boolean => {
    for (let i = 0; i < a.length; ++i) {
        if (a[i] === t) return true;
    }
    return false;
};

interface IMemoryPool<P extends PoolType> {
    free (handle: IHandle<P>): void;
}

// a little hacky, but works (different specializations should not be assignable to each other)
// eslint-disable-next-line @typescript-eslint/ban-types
interface IHandle<P extends PoolType> extends Number {
    // we make this non-optional so that even plain numbers would not be directly assignable to handles.
    // this strictness will introduce some casting hassle in the pool implementation itself
    // but becomes generally more useful for client code type checking.
    _: P;
}

enum BufferDataType {
    UINT32,
    FLOAT32,
    NEVER,
}

interface BufferManifest {
     [key: string]: number | string;
     COUNT: number;
}

type BufferDataTypeManifest<E extends BufferManifest> = { [key in E[keyof E]]: BufferDataType };
type BufferDataMembersManifest<E extends BufferManifest> = { [key in E[keyof E]]: number };
type BufferArrayType = Float32Array | Uint32Array;

class BufferPool<P extends PoolType, E extends BufferManifest> implements IMemoryPool<P> {
    // naming convension:
    // this._bufferViews[chunk][entry][element]

    private declare _dataType: BufferDataTypeManifest<E>;
    private declare _dataMembers: BufferDataMembersManifest<E>;
    private declare _elementCount: number;
    private declare _entryBits: number;
    private declare _stride: number;
    private declare _entriesPerChunk: number;
    private declare _entryMask: number;
    private declare _chunkMask: number;
    private declare _poolFlag: number;
    private _arrayBuffers: ArrayBuffer[] = [];
    private _freeLists: number[][] = [];
    private _uint32BufferViews: Uint32Array[][] = [];
    private _float32BufferViews: Float32Array[][] = [];
    private _hasUint32 = false;
    private _hasFloat32 = false;
    private declare _nativePool: NativeBufferPool;

    constructor (poolType: P, dataType: BufferDataTypeManifest<E>, dataMembers: BufferDataMembersManifest<E>, enumType: E, entryBits = 8) {
        this._elementCount = enumType.COUNT;
        this._entryBits = entryBits;
        this._dataType = dataType;
        this._dataMembers = dataMembers;

        const bytesPerElement = 4;
        this._stride = bytesPerElement * this._elementCount;
        this._entriesPerChunk = 1 << entryBits;
        this._entryMask = this._entriesPerChunk - 1;
        this._poolFlag = 1 << 30;
        this._chunkMask = ~(this._entryMask | this._poolFlag);
        this._nativePool = new NativeBufferPool(poolType, entryBits, this._stride);

        let type: BufferDataType = BufferDataType.NEVER;
        let hasFloat32 = false; let hasUint32 = false;
        for (const e in dataType) {
            hasFloat32 = this._hasFloat32;
            hasUint32 = this._hasUint32;
            if (hasUint32 && hasFloat32) {
                break;
            }

            type = dataType[e as E[keyof E]];
            if (!hasFloat32 && type === BufferDataType.FLOAT32) {
                this._hasFloat32 = true;
            } else if (!hasUint32 && type === BufferDataType.UINT32) {
                this._hasUint32 = true;
            }
        }
    }

    public alloc (): IHandle<P> {
        let i = 0;
        for (; i < this._freeLists.length; i++) {
            const list = this._freeLists[i];
            if (list.length) {
                const j = list[list.length - 1]; list.length--;
                return (i << this._entryBits) + j + this._poolFlag as unknown as IHandle<P>;
            }
        }
        // add a new chunk
        const buffer = this._nativePool.allocateNewChunk();
        const float32BufferViews: Float32Array[] = [];
        const uint32BufferViews: Uint32Array[] = [];
        const freeList: number[] = [];
        const hasFloat32 = this._hasFloat32;
        const hasUint32 = this._hasUint32;
        for (let j = 0; j < this._entriesPerChunk; j++) {
            if (hasFloat32) { float32BufferViews.push(new Float32Array(buffer, this._stride * j, this._elementCount)); }
            if (hasUint32) { uint32BufferViews.push(new Uint32Array(buffer, this._stride * j, this._elementCount)); }
            if (j) { freeList.push(j); }
        }
        if (hasUint32) { this._uint32BufferViews.push(uint32BufferViews); }
        if (hasFloat32) { this._float32BufferViews.push(float32BufferViews); }
        this._freeLists.push(freeList);
        this._arrayBuffers.push(buffer);
        const handle = (i << this._entryBits) + this._poolFlag as unknown as IHandle<P>;
        return handle; // guarantees the handle is always not zero
    }

    public getBuffer (handle: IHandle<P>): BufferArrayType {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        const bufferViews = this._hasFloat32 ? this._float32BufferViews : this._uint32BufferViews;
        if (DEBUG && (!handle || chunk < 0 || chunk >= bufferViews.length
           || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            warn('invalid buffer pool handle');
            return [] as unknown as BufferArrayType;
        }

        return bufferViews[chunk][entry];
    }

    public getTypedArray<K extends E[keyof E]> (handle: IHandle<P>, element: K): BufferArrayType {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        const bufferViews = this._dataType[element] === BufferDataType.UINT32 ? this._uint32BufferViews : this._float32BufferViews;
        if (DEBUG && (!handle || chunk < 0 || chunk >= bufferViews.length
             || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            warn('invalid buffer pool handle');
            return [] as unknown as BufferArrayType;
        }
        const index = element as unknown as number;
        const view = bufferViews[chunk][entry];
        const count = this._dataMembers[element];

        return view.subarray(index, index + count);
    }

    public free (handle: IHandle<P>): void {
        const chunk = (this._chunkMask & handle as unknown as number) >> this._entryBits;
        const entry = this._entryMask & handle as unknown as number;
        if (DEBUG && (!handle || chunk < 0 || chunk >= this._freeLists.length
             || entry < 0 || entry >= this._entriesPerChunk || contains(this._freeLists[chunk], entry))) {
            warn('invalid buffer pool handle');
            return;
        }
        const bufferViews = this._hasUint32 ? this._uint32BufferViews : this._float32BufferViews;
        bufferViews[chunk][entry].fill(0);
        this._freeLists[chunk].push(entry);
    }
}

export enum PoolType {
    // buffers
    NODE,
    PASS,
    AABB,
    RENDER2D
}

export const NULL_HANDLE = 0 as unknown as IHandle<any>;

export type Render2dHandle = IHandle<PoolType.RENDER2D>;

export enum Render2dView {
    POSITION, // Vec3
    UV = 3, // Vec2
    COLOR = 5,  // Vec4
    COUNT = 9
}

const Render2dViewDataType: BufferDataTypeManifest<typeof Render2dView> = {
    [Render2dView.POSITION]: BufferDataType.FLOAT32,
    [Render2dView.UV]: BufferDataType.FLOAT32,
    [Render2dView.COLOR]: BufferDataType.UINT32,
    [Render2dView.COUNT]: BufferDataType.NEVER,
};

const Render2dViewDataMembers: BufferDataMembersManifest<typeof Render2dView> = {
    [Render2dView.POSITION]: Render2dView.UV - Render2dView.POSITION,
    [Render2dView.UV]: Render2dView.COLOR - Render2dView.UV,
    [Render2dView.COLOR]: Render2dView.COUNT - Render2dView.COLOR,
    [Render2dView.COUNT]: 1,
};

export const Render2dPool = new BufferPool<PoolType.RENDER2D,
typeof Render2dView>(PoolType.RENDER2D, Render2dViewDataType, Render2dViewDataMembers, Render2dView);

export type NodeHandle = IHandle<PoolType.NODE>;

export enum NodeView {
    DIRTY_FLAG,
    LAYER,
    WORLD_SCALE,        // Vec3
    WORLD_POSITION = 5, // Vec3
    WORLD_ROTATION = 8, // Quat
    WORLD_MATRIX = 12,  // Mat4
    LOCAL_SCALE = 28,   // Vec3
    LOCAL_POSITION = 31, // Vec3
    LOCAL_ROTATION = 34, // Quat
    COUNT = 38
}

const NodeViewDataType: BufferDataTypeManifest<typeof NodeView> = {
    [NodeView.DIRTY_FLAG]: BufferDataType.UINT32,
    [NodeView.LAYER]: BufferDataType.UINT32,
    [NodeView.WORLD_SCALE]: BufferDataType.FLOAT32,
    [NodeView.WORLD_POSITION]: BufferDataType.FLOAT32,
    [NodeView.WORLD_ROTATION]: BufferDataType.FLOAT32,
    [NodeView.WORLD_MATRIX]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_SCALE]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_POSITION]: BufferDataType.FLOAT32,
    [NodeView.LOCAL_ROTATION]: BufferDataType.FLOAT32,
    [NodeView.COUNT]: BufferDataType.NEVER,
};

const NodeViewDataMembers: BufferDataMembersManifest<typeof NodeView> = {
    [NodeView.DIRTY_FLAG]: NodeView.LAYER - NodeView.DIRTY_FLAG,
    [NodeView.LAYER]: NodeView.WORLD_SCALE - NodeView.LAYER,
    [NodeView.WORLD_SCALE]: NodeView.WORLD_POSITION - NodeView.WORLD_SCALE,
    [NodeView.WORLD_POSITION]: NodeView.WORLD_ROTATION - NodeView.WORLD_POSITION,
    [NodeView.WORLD_ROTATION]: NodeView.WORLD_MATRIX - NodeView.WORLD_ROTATION,
    [NodeView.WORLD_MATRIX]: NodeView.LOCAL_SCALE - NodeView.WORLD_MATRIX,
    [NodeView.LOCAL_SCALE]: NodeView.LOCAL_POSITION - NodeView.LOCAL_SCALE,
    [NodeView.LOCAL_POSITION]: NodeView.LOCAL_ROTATION - NodeView.LOCAL_POSITION,
    [NodeView.LOCAL_ROTATION]: NodeView.COUNT - NodeView.LOCAL_ROTATION,
    [NodeView.COUNT]: 1,
};

export const NodePool = new BufferPool<PoolType.NODE, typeof NodeView>(PoolType.NODE, NodeViewDataType, NodeViewDataMembers, NodeView);

export type PassHandle = IHandle<PoolType.PASS>;

export enum PassView {
    PRIORITY,
    STAGE,
    PHASE,
    PRIMITIVE,
    BATCHING_SCHEME,
    DYNAMIC_STATE,
    HASH,
    COUNT
}

const PassViewDataType: BufferDataTypeManifest<typeof PassView> = {
    [PassView.PRIORITY]: BufferDataType.UINT32,
    [PassView.STAGE]: BufferDataType.UINT32,
    [PassView.PHASE]: BufferDataType.UINT32,
    [PassView.PRIMITIVE]: BufferDataType.UINT32,
    [PassView.BATCHING_SCHEME]: BufferDataType.UINT32,
    [PassView.DYNAMIC_STATE]: BufferDataType.UINT32,
    [PassView.HASH]: BufferDataType.UINT32,
    [PassView.COUNT]: BufferDataType.NEVER,
};

const PassViewDataMembers: BufferDataMembersManifest<typeof PassView> = {
    [PassView.PRIORITY]: PassView.STAGE - PassView.PRIORITY,
    [PassView.STAGE]: PassView.PHASE - PassView.STAGE,
    [PassView.PHASE]: PassView.PRIMITIVE - PassView.PHASE,
    [PassView.PRIMITIVE]: PassView.BATCHING_SCHEME - PassView.PRIMITIVE,
    [PassView.BATCHING_SCHEME]: PassView.DYNAMIC_STATE - PassView.BATCHING_SCHEME,
    [PassView.DYNAMIC_STATE]: PassView.HASH - PassView.DYNAMIC_STATE,
    [PassView.HASH]: PassView.COUNT - PassView.HASH,
    [PassView.COUNT]: 1,
};

export const PassPool = new BufferPool<PoolType.PASS, typeof PassView>(PoolType.PASS, PassViewDataType, PassViewDataMembers, PassView);

export type AABBHandle = IHandle<PoolType.AABB>;

export enum AABBView {
    CENTER, // Vec3
    HALFEXTENTS = 3, // Vec3
    COUNT = 6
}

const AABBViewDataType: BufferDataTypeManifest<typeof AABBView> = {
    [AABBView.CENTER]: BufferDataType.FLOAT32,
    [AABBView.HALFEXTENTS]: BufferDataType.FLOAT32,
    [AABBView.COUNT]: BufferDataType.NEVER,
};

const AABBViewDataMembers: BufferDataMembersManifest<typeof AABBView> = {
    [AABBView.CENTER]: AABBView.HALFEXTENTS - AABBView.CENTER,
    [AABBView.HALFEXTENTS]: AABBView.COUNT - AABBView.HALFEXTENTS,
    [AABBView.COUNT]: 1,
};

export const AABBPool = new BufferPool<PoolType.AABB, typeof AABBView>(PoolType.AABB, AABBViewDataType, AABBViewDataMembers, AABBView);
