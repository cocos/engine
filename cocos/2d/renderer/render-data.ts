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

import { DEBUG, JSB } from 'internal:constants';
import { director } from '../../game/director';
import { Material } from '../../asset/assets/material';
import { TextureBase } from '../../asset/assets/texture-base';
import { Color, Pool, RecyclePool, murmurhash2_32_gc, assert, assertIsTrue } from '../../core';
import { SpriteFrame } from '../assets/sprite-frame';
import { UIRenderer } from '../framework/ui-renderer';
import { StaticVBAccessor, StaticVBChunk } from './static-vb-accessor';
import { getAttributeStride, vfmtPosUvColor } from './vertex-format';
import { Buffer, BufferInfo, BufferUsageBit, Device, Attribute, InputAssembler, InputAssemblerInfo, MemoryUsageBit } from '../../gfx';
import { RenderDrawInfo, RenderDrawInfoType } from './render-draw-info';
import { Batcher2D } from './batcher-2d';
import { RenderEntity, RenderEntityType } from './render-entity';
import type { MeshBuffer } from './mesh-buffer';

/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export interface IRenderData {
    x: number;
    y: number;
    z: number;
    u: number;
    v: number;
    color: Color;
}

const DEFAULT_STRIDE = getAttributeStride(vfmtPosUvColor) >> 2;

/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export class BaseRenderData {
    get vertexCount (): number {
        return this._vc;
    }
    get indexCount (): number {
        return this._ic;
    }
    get stride (): number {
        return this._floatStride << 2;
    }
    get floatStride (): number {
        return this._floatStride;
    }
    get vertexFormat (): Attribute[] {
        return this._vertexFormat;
    }

    get drawInfoType (): RenderDrawInfoType {
        return this._drawInfoType;
    }
    set drawInfoType (type: RenderDrawInfoType) {
        this._drawInfoType = type;
        if (this._renderDrawInfo) {
            this._renderDrawInfo.setDrawInfoType(type);
        }
    }

    public chunk: StaticVBChunk = null!;

    // entity for native
    protected _renderDrawInfo: RenderDrawInfo = null!;
    public get renderDrawInfo (): RenderDrawInfo {
        return this._renderDrawInfo;
    }

    protected _material: Material | null = null;
    get material (): Material | null {
        return this._material!;
    }
    set material (val: Material | null) {
        this._material = val;
        if (this._renderDrawInfo) {
            this._renderDrawInfo.setMaterial(val!);
        }
    }

    protected _dataHash = 0;
    get dataHash (): number {
        return this._dataHash;
    }
    set dataHash (val: number) {
        this._dataHash = val;
        if (this._renderDrawInfo) {
            this._renderDrawInfo.setDataHash(val);
        }
    }

    public _isMeshBuffer = false;

    protected _vc = 0;
    protected _ic = 0;
    protected _floatStride = 0;
    protected _vertexFormat = vfmtPosUvColor;
    protected _drawInfoType: RenderDrawInfoType = RenderDrawInfoType.COMP;
    protected _multiOwner = false;
    get multiOwner (): boolean { return this._multiOwner; }
    set multiOwner (val) {
        this._multiOwner = val;
    }

    protected _batcher: Batcher2D | null = null;
    get batcher (): Batcher2D {
        if (!this._batcher) {
            this._batcher = director.root!.batcher2D;
        }
        return this._batcher;
    }

    constructor (vertexFormat = vfmtPosUvColor) {
        this._floatStride = vertexFormat === vfmtPosUvColor ? DEFAULT_STRIDE : (getAttributeStride(vertexFormat) >> 2);
        this._vertexFormat = vertexFormat;
    }

    public isValid (): false | StaticVBAccessor {
        return this._ic > 0 && this.chunk.vertexAccessor;
    }

    // it should be invoked at where a render data is allocated.
    public initRenderDrawInfo (comp: UIRenderer, drawInfoType: RenderDrawInfoType = RenderDrawInfoType.COMP): void {
        if (JSB) {
            const renderEntity: RenderEntity = comp.renderEntity;

            if (renderEntity.renderEntityType === RenderEntityType.STATIC) {
                if (!this._renderDrawInfo) {
                    // initialization should be in native
                    const drawInfo = renderEntity.getStaticRenderDrawInfo();
                    if (drawInfo) {
                        this._renderDrawInfo = drawInfo;
                    }
                }
            } else if (this.multiOwner === false) {
                if (!this._renderDrawInfo) {
                    this._renderDrawInfo = new RenderDrawInfo();
                    // for no resize() invoking components
                    //this.setRenderDrawInfoAttributes();
                    renderEntity.addDynamicRenderDrawInfo(this._renderDrawInfo);
                }
            }

            this.drawInfoType = drawInfoType;
            this.setRenderDrawInfoAttributes();
        }
    }

    public removeRenderDrawInfo (comp: UIRenderer): void {
        if (JSB) {
            const renderEntity: RenderEntity = comp.renderEntity;
            if (renderEntity.renderEntityType === RenderEntityType.DYNAMIC) {
                renderEntity.removeDynamicRenderDrawInfo();
            } else if (renderEntity.renderEntityType === RenderEntityType.STATIC) {
                renderEntity.clearStaticRenderDrawInfos();
            }
        }
    }

    protected setRenderDrawInfoAttributes (): void {
        if (JSB) {
            if (!this._renderDrawInfo) {
                return;
            }
            if (this.chunk) {
                this._renderDrawInfo.setBufferId(this.chunk.bufferId);
                this._renderDrawInfo.setVertexOffset(this.chunk.vertexOffset);
                this._renderDrawInfo.setVB(this.chunk.vb);
                // TODO: on TS 4.2, argument of type 'Readonly<Uint16Array>' is not assignable to parameter of type 'Uint16Array'.
                this._renderDrawInfo.setIB(this.chunk.ib as Uint16Array);
                if (this.chunk.meshBuffer) {
                    this._renderDrawInfo.setIndexOffset(this.chunk.meshBuffer.indexOffset);
                    this._renderDrawInfo.setVData(this.chunk.meshBuffer.vData.buffer);
                    this._renderDrawInfo.setIData(this.chunk.meshBuffer.iData.buffer);
                }
            }
            this._renderDrawInfo.setVBCount(this._vc);
            this._renderDrawInfo.setIBCount(this._ic);

            this._renderDrawInfo.setDataHash(this.dataHash);
            this._renderDrawInfo.setIsMeshBuffer(this._isMeshBuffer);
            this._renderDrawInfo.setMaterial(this.material!);
            this._renderDrawInfo.setDrawInfoType(this._drawInfoType);
        }
    }
}

/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export class RenderData extends BaseRenderData {
    public static add (vertexFormat = vfmtPosUvColor, accessor: StaticVBAccessor | null = null): RenderData {
        const rd = new RenderData(vertexFormat, accessor);
        if (!accessor) {
            const batcher = director.root!.batcher2D;
            accessor = batcher.switchBufferAccessor(rd._vertexFormat);
        }
        rd._accessor = accessor;
        return rd;
    }

    public static remove (data: RenderData): void {
        // const idx = _pool.data.indexOf(data);
        // if (idx === -1) {
        //     return;
        // }

        data.clear();
        data._accessor = null!;
        // _pool.removeAt(idx);
    }

    get dataLength (): number {
        return this._data.length;
    }

    set dataLength (length: number) {
        const data: IRenderData[] = this._data;
        if (data.length !== length) {
            for (let i = data.length; i < length; i++) {
                data.push({
                    x: 0,
                    y: 0,
                    z: 0,
                    u: 0,
                    v: 0,
                    color: Color.WHITE.clone(),
                });
            }

            data.length = length;
        }

        this.syncRender2dBuffer();
    }

    get data (): IRenderData[] {
        return this._data;
    }

    public _vertDirty = true;
    get vertDirty (): boolean {
        return this._vertDirty;
    }
    set vertDirty (val: boolean) {
        this._vertDirty = val;
        if (this._renderDrawInfo && val) {
            this._renderDrawInfo.setVertDirty(val);
        }
    }

    protected _textureHash = 0;
    get textureHash (): number {
        return this._textureHash;
    }
    set textureHash (val: number) {
        this._textureHash = val;
    }

    public indices: Uint16Array | null = null;

    public set frame (val: SpriteFrame | TextureBase | null) {
        this._frame = val;
        if (this._renderDrawInfo) {
            if (this._frame) {
                this._renderDrawInfo.setTexture(this._frame.getGFXTexture());
                this._renderDrawInfo.setSampler(this._frame.getGFXSampler());
            } else {
                this._renderDrawInfo.setTexture(null);
                this._renderDrawInfo.setSampler(null);
            }
        }
    }
    public get frame (): SpriteFrame | TextureBase | null {
        return this._frame;
    }
    public layer = 0;

    public nodeDirty = true;
    public passDirty = true;
    public textureDirty = true;
    public hashDirty = true;

    private _data: IRenderData[] = [];
    private _frame: SpriteFrame | TextureBase | null = null;
    protected _accessor: StaticVBAccessor = null!;
    get accessor (): StaticVBAccessor { return this._accessor; }

    public vertexRow = 1;
    public vertexCol = 1;

    public constructor (vertexFormat = vfmtPosUvColor, accessor: StaticVBAccessor | null = null) {
        super(vertexFormat);
        if (!accessor) {
            accessor = this.batcher.switchBufferAccessor(this._vertexFormat);
        }
        this._accessor = accessor;
    }

    public resize (vertexCount: number, indexCount: number): void {
        if (vertexCount === this._vc && indexCount === this._ic && this.chunk) return;
        this._vc = vertexCount;
        this._ic = indexCount;
        if (this.chunk) {
            this._accessor.recycleChunk(this.chunk);
            this.chunk = null!;
        }
        // renderData always have chunk
        this.chunk = this._accessor.allocateChunk(vertexCount, indexCount)!;
        this.updateHash();

        if (JSB && this.multiOwner === false && this._renderDrawInfo) {
            // for sync vData and iData address to native
            this._renderDrawInfo.setDrawInfoType(this._drawInfoType);
            this._renderDrawInfo.setBufferId(this.chunk.bufferId);
            this._renderDrawInfo.setVertexOffset(this.chunk.vertexOffset);
            this._renderDrawInfo.setIndexOffset(this.chunk.meshBuffer.indexOffset);
            this._renderDrawInfo.setVB(this.chunk.vb);
            // TODO: on TS 4.2, argument of type 'Readonly<Uint16Array>' is not assignable to parameter of type 'Uint16Array'.
            this._renderDrawInfo.setIB(this.chunk.ib as Uint16Array);
            this._renderDrawInfo.setVData(this.chunk.meshBuffer.vData.buffer);
            this._renderDrawInfo.setIData(this.chunk.meshBuffer.iData.buffer);
            this._renderDrawInfo.setVBCount(this._vc);
            this._renderDrawInfo.setIBCount(this._ic);
        }
    }

    protected setRenderDrawInfoAttributes (): void {
        if (JSB) {
            if (!this._renderDrawInfo) {
                return;
            }
            this._renderDrawInfo.setAccId(this._accessor.id);
            super.setRenderDrawInfoAttributes();
            this._renderDrawInfo.setTexture(this.frame ? this.frame.getGFXTexture() : null);
            this._renderDrawInfo.setSampler(this.frame ? this.frame.getGFXSampler() : null);
        }
    }
    /**
     * @internal
     */
    public fillDrawInfoAttributes (drawInfo: RenderDrawInfo): void {
        if (JSB) {
            if (!drawInfo) {
                return;
            }
            drawInfo.setDrawInfoType(this._drawInfoType);
            drawInfo.setAccAndBuffer(this._accessor.id, this.chunk.bufferId);
            drawInfo.setVertexOffset(this.chunk.vertexOffset);
            drawInfo.setIndexOffset(this.chunk.meshBuffer.indexOffset);
            drawInfo.setVB(this.chunk.vb);
            // TODO: on TS 4.2, argument of type 'Readonly<Uint16Array>' is not assignable to parameter of type 'Uint16Array'.
            drawInfo.setIB(this.chunk.ib as Uint16Array);
            drawInfo.setVData(this.chunk.meshBuffer.vData.buffer);
            drawInfo.setIData(this.chunk.meshBuffer.iData.buffer);
            drawInfo.setVBCount(this._vc);
            drawInfo.setIBCount(this._ic);
            drawInfo.setDataHash(this.dataHash);
            drawInfo.setIsMeshBuffer(this._isMeshBuffer);
        }
    }

    // Initial advance render data for native
    protected syncRender2dBuffer (): void {
        if (JSB && this.multiOwner === false) {
            if (!this._renderDrawInfo) {
                return;
            }
            this.renderDrawInfo.setStride(this.floatStride);
            this.renderDrawInfo.setVBCount(this.dataLength);
            this.renderDrawInfo.initRender2dBuffer();
        }
    }

    public resizeAndCopy (vertexCount: number, indexCount: number): void {
        if (vertexCount === this._vc && indexCount === this._ic && this.chunk) return;
        this._vc = vertexCount;
        this._ic = indexCount;
        const oldChunk = this.chunk;
        // renderData always have chunk
        this.chunk = this._accessor.allocateChunk(vertexCount, indexCount)!;
        // Copy old chunk data
        if (oldChunk) {
            this.chunk.vb.set(oldChunk.vb);
            this._accessor.recycleChunk(oldChunk);
        }
        this.updateHash();
    }

    public getMeshBuffer (): MeshBuffer | null {
        if (this.chunk && this._accessor) {
            return this._accessor.getMeshBuffer(this.chunk.bufferId);
        } else {
            return null;
        }
    }

    public updateNode (comp: UIRenderer): void {
        this.layer = comp.node.layer;
        this.nodeDirty = false;
        this.hashDirty = true;
    }

    public updatePass (comp: UIRenderer): void {
        this.material = comp.getRenderMaterial(0)!;
        this.passDirty = false;
        this.hashDirty = true;
    }

    public updateTexture (frame: SpriteFrame | TextureBase): void {
        this.frame = frame;
        this.textureHash = frame.getHash();
        this.textureDirty = false;
        this.hashDirty = true;
    }

    public updateHash (): void {
        const bid = this.chunk ? this.chunk.bufferId : -1;
        const hashString = `${bid}${this.layer} ${this.textureHash}`;
        this.dataHash = murmurhash2_32_gc(hashString, 666);
        this.hashDirty = false;
    }

    public updateRenderData (comp: UIRenderer, frame: SpriteFrame | TextureBase): void {
        if (this.passDirty) {
            this.material = comp.getRenderMaterial(0)!;
            this.passDirty = false;
            this.hashDirty = true;

            if (this._renderDrawInfo) {
                this._renderDrawInfo.setMaterial(this.material);
            }
        }
        if (this.nodeDirty) {
            const renderScene = comp.node.scene ? comp._getRenderScene() : null;
            this.layer = comp.node.layer;
            // Hack for updateRenderData when node not add to scene
            if (renderScene !== null) {
                this.nodeDirty = false;
            }
            this.hashDirty = true;
        }
        if (this.textureDirty) {
            this.frame = frame;
            this.textureHash = frame.getHash();
            this.textureDirty = false;
            this.hashDirty = true;

            if (this._renderDrawInfo) {
                this._renderDrawInfo.setTexture(this.frame ? this.frame.getGFXTexture() : null);
                this._renderDrawInfo.setSampler(this.frame ? this.frame.getGFXSampler() : null);
            }
        }
        if (this.hashDirty) {
            this.updateHash();

            if (this._renderDrawInfo) {
                this._renderDrawInfo.setDataHash(this.dataHash);
            }
        }

        // Hack Do not update pre frame
        if (JSB && this.multiOwner === false) {
            if (DEBUG) {
                if (this._renderDrawInfo && this._renderDrawInfo.render2dBuffer) {
                    assert(this._renderDrawInfo.render2dBuffer.length === this._floatStride * this._data.length, 'Vertex count doesn\'t match.');
                }
            }
            // sync shared buffer to native
            this._renderDrawInfo.fillRender2dBuffer(this._data);
        }
    }

    public clear (): void {
        this.resize(0, 0);
        this._data.length = 0;
        this.indices = null;
        this.vertDirty = true;
        this.material = null;

        this.nodeDirty = true;
        this.passDirty = true;
        this.textureDirty = true;
        this.hashDirty = true;

        this.layer = 0;
        this.frame = null;
        this.textureHash = 0;
        this.dataHash = 0;
        if (JSB && this._renderDrawInfo) {
            this._renderDrawInfo.clear();
        }
    }
    public static createStaticVBAccessor (attributes: Attribute[], vCount?: number, iCount?: number): StaticVBAccessor {
        const device = director.root!.device;
        const accessor = new StaticVBAccessor(device, attributes, vCount, iCount);
        return accessor;
    }
}

/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export class MeshRenderData extends BaseRenderData {
    public static add (vertexFormat = vfmtPosUvColor): MeshRenderData {
        // const rd = _meshDataPool.add();
        const rd = new MeshRenderData();
        rd._floatStride = vertexFormat === vfmtPosUvColor ? DEFAULT_STRIDE : (getAttributeStride(vertexFormat) >> 2);
        rd._vertexFormat = vertexFormat;
        return rd;
    }

    public static remove (data: MeshRenderData): void {
        // const idx = _meshDataPool.data.indexOf(data);
        // if (idx === -1) {
        //     return;
        // }

        // _meshDataPool.data[idx].clear();
        // _meshDataPool.removeAt(idx);

        data.clear();
    }

    /**
     * @deprecated
     */
    set formatByte (value: number) {
        // empty
    }
    get formatByte (): number { return this.stride; }

    get floatStride (): number { return this._floatStride; }

    /**
     * Index of Float32Array: vData
     */
    get vDataOffset (): number { return this._byteLength >>> 2; }

    public _isMeshBuffer = true;
    public declare vData: Float32Array;
    public declare iData: Uint16Array;
    /**
     * First vertex used in the current IA
     */
    public vertexStart = 0;
    /**
     * Vertex count used in the current IA
     */
    public vertexRange = 0;
    /**
     * First index used in the current IA
     */
    public indexStart = 0;
    /**
     * Index count used in the current IA
     */
    public indexRange = 0;
    // only for graphics
    public lastFilledIndex = 0;
    public lastFilledVertex = 0;

    public frame: SpriteFrame | null = null;

    private _byteLength = 0;
    private _vertexBuffers: Buffer[] = [];
    private _indexBuffer: Buffer = null!;

    private _iaPool: RecyclePool<InputAssembler> | null = null;
    private _iaInfo: InputAssemblerInfo = null!;

    constructor (vertexFormat = vfmtPosUvColor) {
        super(vertexFormat);
        this.vData = new Float32Array(256 * this.stride);
        this.iData = new Uint16Array(256 * 6);
    }

    public request (vertexCount: number, indexCount: number): boolean {
        const byteOffset = this._byteLength + vertexCount * this.stride;
        const succeed = this.reserve(vertexCount, indexCount);
        if (!succeed) return false;
        this._vc += vertexCount; // vertexOffset
        this._ic += indexCount; // indicesOffset
        this._byteLength = byteOffset; // byteOffset
        this.vertexRange = this._vc;
        this.indexRange = this._ic;
        return true;
    }

    public reserve (vertexCount: number, indexCount: number): boolean {
        const newVBytes = this._byteLength + vertexCount * this.stride;
        const newICount = this.indexCount + indexCount;

        if (vertexCount + this.vertexCount > 65535) {
            return false;
        }

        let byteLength = this.vData.byteLength;
        let indicesLength = this.iData.length;
        let vCount = this.vData.length;
        let iCount = this.iData.length;
        if (newVBytes > byteLength || newICount > indicesLength) {
            while (byteLength < newVBytes || indicesLength < newICount) {
                vCount *= 2;
                iCount *= 2;

                byteLength = vCount * 4;
                indicesLength = iCount;
            }

            this._reallocBuffer(vCount, iCount);
        }
        return true;
    }

    // overload
    // Resize buffer and IA range
    public resize (vertexCount: number, indexCount: number): void {
        const byteLength = vertexCount * this.stride;
        assertIsTrue(vertexCount >= 0 && indexCount >= 0 && byteLength <= this.vData.byteLength && indexCount <= this.iData.length);
        this._vc = vertexCount;
        this._ic = indexCount;
        this._byteLength = byteLength;
        this.updateRange(0, vertexCount, 0, indexCount);
    }

    // Only resize IA range
    public updateRange (vertOffset: number, vertexCount: number, indexOffset: number, indexCount: number): void {
        assertIsTrue(vertexCount >= 0 && indexCount >= 0 && vertexCount <= this._vc && indexCount <= this._ic);
        this.vertexStart = vertOffset;
        this.indexStart = indexOffset;
        this.vertexRange = vertexCount;
        this.indexRange = indexCount;
    }

    public requestIA (device: Device): InputAssembler {
        this._initIAInfo(device);
        const ia = this._iaPool!.add();
        ia.firstIndex = this.indexStart;
        ia.indexCount = this.indexRange;
        return ia;
    }

    public uploadBuffers (): void {
        if (this._byteLength === 0 || !this._vertexBuffers[0] || !this._indexBuffer) {
            return;
        }

        const indexCount = this._ic;
        const verticesData = new Float32Array(this.vData.buffer, 0, this._byteLength >> 2);
        const indicesData = new Uint16Array(this.iData.buffer, 0, indexCount);

        const vertexBuffer = this._vertexBuffers[0];
        if (this._byteLength > vertexBuffer.size) {
            vertexBuffer.resize(this._byteLength);
        }
        vertexBuffer.update(verticesData);

        const indexBytes = indexCount << 1;
        if (indexBytes > this._indexBuffer.size) {
            this._indexBuffer.resize(indexBytes);
        }
        this._indexBuffer.update(indicesData);
    }

    public freeIAPool (): void {
        if (this._iaPool) {
            this._iaPool.reset();
        }
    }

    public reset (): void {
        this._vc = 0;
        this._ic = 0;
        this._byteLength = 0;
        this.vertexStart = 0;
        this.vertexRange = 0;
        this.indexStart = 0;
        this.indexRange = 0;
        this.lastFilledIndex = 0;
        this.lastFilledVertex = 0;
        this.material = null;
        this.freeIAPool();
    }

    public clear (): void {
        this.reset();
        if (this._iaPool) {
            this._iaPool.destroy();
        }
        if (this._vertexBuffers[0]) {
            this._vertexBuffers[0].destroy();
            this._vertexBuffers = [];
        }
        this._iaInfo = null!;
        this.vData = new Float32Array(256 * this.stride);
        this.iData = new Uint16Array(256 * 6);
    }

    protected _initIAInfo (device: Device): void {
        if (!this._iaInfo) {
            const vbStride = this.stride;
            const vbs = this._vertexBuffers;
            if (!vbs.length) {
                vbs.push(device.createBuffer(new BufferInfo(
                    BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.DEVICE,
                    vbStride,
                    vbStride,
                )));
            }
            const ibStride = Uint16Array.BYTES_PER_ELEMENT;
            if (!this._indexBuffer) {
                this._indexBuffer = device.createBuffer(new BufferInfo(
                    BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.DEVICE,
                    ibStride,
                    ibStride,
                ));
            }
            this._iaInfo = new InputAssemblerInfo(this._vertexFormat, vbs, this._indexBuffer);
            this._iaPool = new RecyclePool(() => device.createInputAssembler(this._iaInfo), 1, (ia) => { ia.destroy(); });
        }
    }

    protected _reallocBuffer (vCount: number, iCount: number): void {
        // copy old data
        const oldVData = this.vData;
        this.vData = new Float32Array(vCount);
        if (oldVData) {
            this.vData.set(oldVData, 0);
        }
        const oldIData = this.iData;
        this.iData = new Uint16Array(iCount);
        if (oldIData) {
            this.iData.set(oldIData, 0);
        }
    }

    public setRenderDrawInfoAttributes (): void {
        if (JSB) {
            if (!this._renderDrawInfo) {
                return;
            }
            this._renderDrawInfo.setVData(this.vData.buffer);
            this._renderDrawInfo.setIData(this.iData.buffer);
            this._renderDrawInfo.setVBCount(this._vc);
            this._renderDrawInfo.setIBCount(this._ic);
            this._renderDrawInfo.setVertexOffset(this.vertexStart);
            this._renderDrawInfo.setIndexOffset(this.indexStart);

            this._renderDrawInfo.setIsMeshBuffer(this._isMeshBuffer);
            this._renderDrawInfo.setMaterial(this.material!);
            if (this.frame) {
                this._renderDrawInfo.setTexture(this.frame.getGFXTexture());
                this._renderDrawInfo.setSampler(this.frame.getGFXSampler());
            }
        }
    }

    //  only for particle2d
    public particleInitRenderDrawInfo (entity: RenderEntity): void {
        if (JSB) {
            if (entity.renderEntityType === RenderEntityType.STATIC) {
                if (!this._renderDrawInfo) {
                    // initialization should be in native
                    const drawInfo = entity.getStaticRenderDrawInfo();
                    if (drawInfo) {
                        this._renderDrawInfo = drawInfo;
                    }
                }
            }
        }
    }
}
