/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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
import { IRenderData } from './render-data';
import { NativeRenderDrawInfo } from './native-2d';
import { Node } from '../../scene-graph';
import { Sampler, Texture } from '../../gfx';
import { Model } from '../../render-scene/scene';
import { Material } from '../../asset/assets';

export enum AttrUInt8ArrayView {
    DrawInfoType,
    VertDirty,
    IsMeshBuffer,
    Stride,
    Count
}

export enum AttrUInt16ArrayView {
    BufferID,
    AccessorID,
    Count
}

export enum AttrUInt32ArrayView {
    VertexOffset,
    IndexOffset,
    VBCount,
    IBCount,
    DataHash,
    Count
}

export enum RenderDrawInfoType {
    COMP,
    MODEL,
    MIDDLEWARE,
    SUB_NODE,
}

/** @mangle */
export class RenderDrawInfo {
    protected _accId = -1;
    protected _bufferId = -1;
    protected _vertexOffset = 0;
    protected _indexOffset = 0;
    protected _vb: Float32Array | null = null;
    protected _ib: Uint16Array | null = null;
    protected _vData: Float32Array | null = null;
    protected _iData: Uint16Array | null = null;
    protected _vertDirty = false;
    protected _vbCount = 0;
    protected _ibCount = 0;
    protected _dataHash = 0;
    protected _isMeshBuffer = false;
    protected _material: Material | null = null;
    protected _texture: Texture | null = null;
    protected _sampler: Sampler | null = null;
    protected _stride = 0;
    protected _useLocal = false;

    protected _model: Model | null = null;
    protected _drawInfoType: RenderDrawInfoType = RenderDrawInfoType.COMP;
    protected _subNode: Node | null = null;

    protected declare _nativeObj: NativeRenderDrawInfo;
    protected declare _uint8SharedBuffer: Uint8Array;
    protected declare _uint16SharedBuffer: Uint16Array;
    protected declare _uint32SharedBuffer: Uint32Array;

    // SharedBuffer of pos/uv/color
    protected _render2dBuffer: Float32Array | null = null;

    constructor (nativeDrawInfo?: NativeRenderDrawInfo) {
        this.init(nativeDrawInfo);
        const attrSharedBuffer = this._nativeObj.getAttrSharedBufferForJS();
        let offset = 0;
        this._uint8SharedBuffer = new Uint8Array(attrSharedBuffer, offset, AttrUInt8ArrayView.Count);
        offset += AttrUInt8ArrayView.Count * Uint8Array.BYTES_PER_ELEMENT;
        this._uint16SharedBuffer = new Uint16Array(attrSharedBuffer, offset, AttrUInt16ArrayView.Count);
        offset += AttrUInt16ArrayView.Count * Uint16Array.BYTES_PER_ELEMENT;
        this._uint32SharedBuffer = new Uint32Array(attrSharedBuffer, offset, AttrUInt32ArrayView.Count);
    }

    get nativeObj (): NativeRenderDrawInfo {
        return this._nativeObj;
    }

    get render2dBuffer (): Float32Array | null {
        return this._render2dBuffer;
    }

    private init (nativeDrawInfo?: NativeRenderDrawInfo): void {
        if (JSB) {
            if (nativeDrawInfo) {
                this._nativeObj = nativeDrawInfo;
            }
            if (!this._nativeObj) {
                this._nativeObj = new NativeRenderDrawInfo();
            }
        }
    }

    public clear (): void {
        this._bufferId = 0;
        this._vertexOffset = 0;
        this._indexOffset = 0;
        this._vertDirty = false;
    }

    public setAccId (accId): void {
        if (JSB) {
            if (this._accId !== accId) {
                this._uint16SharedBuffer[AttrUInt16ArrayView.AccessorID] = accId;
            }
        }
        this._accId = accId;
    }

    public setBufferId (bufferId): void {
        if (JSB) {
            if (this._bufferId !== bufferId) {
                this._uint16SharedBuffer[AttrUInt16ArrayView.BufferID] = bufferId;
                this._nativeObj.changeMeshBuffer();
            }
        }
        this._bufferId = bufferId;
    }

    public setAccAndBuffer (accId, bufferId): void {
        if (JSB) {
            if (this._accId !== accId || this._bufferId !== bufferId) {
                this._uint16SharedBuffer[AttrUInt16ArrayView.AccessorID] = accId;
                this._uint16SharedBuffer[AttrUInt16ArrayView.BufferID] = bufferId;
                this._nativeObj.changeMeshBuffer();
            }
        }
        this._bufferId = bufferId;
        this._accId = accId;
    }

    public setVertexOffset (vertexOffset): void {
        this._vertexOffset = vertexOffset;
        if (JSB) {
            this._uint32SharedBuffer[AttrUInt32ArrayView.VertexOffset] = vertexOffset;
        }
    }

    public setIndexOffset (indexOffset): void {
        this._indexOffset = indexOffset;
        if (JSB) {
            this._uint32SharedBuffer[AttrUInt32ArrayView.IndexOffset] = indexOffset;
        }
    }

    public setVB (vbBuffer: Float32Array): void {
        if (JSB) {
            this._nativeObj.vbBuffer = vbBuffer;
        }
    }

    public setIB (ibBuffer: Uint16Array): void {
        if (JSB) {
            this._nativeObj.ibBuffer = ibBuffer;
        }
    }

    public setVData (vDataBuffer: ArrayBufferLike): void {
        if (JSB) {
            this._nativeObj.vDataBuffer = vDataBuffer;
        }
    }

    public setIData (iDataBuffer: ArrayBufferLike): void {
        if (JSB) {
            this._nativeObj.iDataBuffer = iDataBuffer;
        }
    }

    public setVBCount (vbCount): void {
        if (JSB) {
            this._uint32SharedBuffer[AttrUInt32ArrayView.VBCount] = vbCount;
        }
        this._vbCount = vbCount;
    }

    public setIBCount (ibCount): void {
        if (JSB) {
            this._uint32SharedBuffer[AttrUInt32ArrayView.IBCount] = ibCount;
        }
    }

    public setVertDirty (val: boolean): void {
        if (JSB) {
            this._uint8SharedBuffer[AttrUInt8ArrayView.VertDirty] = val ? 1 : 0;
        }
        this._vertDirty = val;
    }

    public setDataHash (dataHash: number): void {
        if (JSB) {
            this._uint32SharedBuffer[AttrUInt32ArrayView.DataHash] = dataHash;
        }
        this._dataHash = dataHash;
    }

    public setIsMeshBuffer (isMeshBuffer: boolean): void {
        if (JSB) {
            this._uint8SharedBuffer[AttrUInt8ArrayView.IsMeshBuffer] = isMeshBuffer ? 1 : 0;
        }
        this._isMeshBuffer = isMeshBuffer;
    }

    public setMaterial (material: Material): void {
        if (JSB) {
            if (this._material !== material) {
                this._nativeObj.material = material;
            }
        }
        this._material = material;
    }

    public setTexture (texture: Texture | null): void {
        if (JSB) {
            if (this._texture !== texture) {
                this._nativeObj.texture = texture;
            }
        }
        this._texture = texture;
    }

    public setSampler (sampler: Sampler | null): void {
        if (JSB) {
            if (this._sampler !== sampler) {
                this._nativeObj.sampler = sampler;
            }
        }
        this._sampler = sampler;
    }

    public setModel (model: Model): void {
        if (JSB) {
            if (this._model !== model) {
                this._nativeObj.model = model;
            }
        }
    }

    public setDrawInfoType (drawInfoType: RenderDrawInfoType): void {
        if (JSB) {
            if (this._drawInfoType !== drawInfoType) {
                this._uint8SharedBuffer[AttrUInt8ArrayView.DrawInfoType] = drawInfoType;
            }
        }
        this._drawInfoType = drawInfoType;
    }

    public setSubNode (node: Node): void {
        if (JSB) {
            if (this._subNode !== node) {
                this._nativeObj.subNode = node;
            }
        }
        this._subNode = node;
    }

    public setStride (stride: number): void {
        if (JSB) {
            this._uint8SharedBuffer[AttrUInt8ArrayView.Stride] = stride;
        }
        this._stride = stride;
    }

    public initRender2dBuffer (): void {
        if (JSB) {
            this._render2dBuffer = new Float32Array(this._vbCount * this._stride);
            this._nativeObj.setRender2dBufferToNative(this._render2dBuffer);
        }
    }

    public fillRender2dBuffer (vertexDataArr: IRenderData[]): void {
        if (JSB) {
            if (!this._render2dBuffer) {
                return;
            }
            const fillLength = Math.min(this._vbCount, vertexDataArr.length);
            let bufferOffset = 0;
            for (let i = 0; i < fillLength; i++) {
                const temp = vertexDataArr[i];
                this._render2dBuffer[bufferOffset] = temp.x;
                this._render2dBuffer[bufferOffset + 1] = temp.y;
                this._render2dBuffer[bufferOffset + 2] = temp.z;
                bufferOffset += this._stride;
            }
        }
    }
}
