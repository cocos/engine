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

import { murmurhash2_32_gc } from '../../core/algorithm/murmurhash2_gc';
import { Buffer } from './buffer';
import { Attribute, GFXObject, ObjectType, InputAssemblerInfo, DrawInfo } from './define';

/**
 * @en GFX input assembler.
 * @zh GFX 输入汇集器。
 */
export abstract class InputAssembler extends GFXObject {
    /**
     * @en Get current attributes.
     * @zh 顶点属性数组。
     */
    get attributes (): Attribute[] {
        return this._attributes;
    }

    /**
     * @en Get current vertex buffers.
     * @zh 顶点缓冲数组。
     */
    get vertexBuffers (): Buffer[] {
        return this._vertexBuffers;
    }

    /**
     * @en Get current index buffer.
     * @zh 索引缓冲。
     */
    get indexBuffer (): Buffer | null {
        return this._indexBuffer;
    }

    /**
     * @en Get the indirect buffer, if present.
     * @zh 间接绘制缓冲。
     */
    get indirectBuffer (): Buffer | null {
        return this._indirectBuffer;
    }

    /**
     * @en Get hash of current attributes.
     * @zh 获取顶点属性数组的哈希值。
     */
    get attributesHash (): number {
        return this._attributesHash;
    }

    /**
     * @en Get current vertex count.
     * @zh 顶点数量。
     */
    set vertexCount (count: number) {
        this._drawInfo.vertexCount = count;
    }
    get vertexCount (): number {
        return this._drawInfo.vertexCount;
    }

    /**
     * @en Get starting vertex.
     * @zh 起始顶点。
     */
    set firstVertex (first: number) {
        this._drawInfo.firstVertex = first;
    }
    get firstVertex (): number {
        return this._drawInfo.firstVertex;
    }

    /**
     * @en Get current index count.
     * @zh 索引数量。
     */
    set indexCount (count: number) {
        this._drawInfo.indexCount = count;
    }
    get indexCount (): number {
        return this._drawInfo.indexCount;
    }

    /**
     * @en Get starting index.
     * @zh 起始索引。
     */
    set firstIndex (first: number) {
        this._drawInfo.firstIndex = first;
    }
    get firstIndex (): number {
        return this._drawInfo.firstIndex;
    }

    /**
     * @en Get current vertex offset.
     * @zh 顶点偏移量。
     */
    set vertexOffset (offset: number) {
        this._drawInfo.vertexOffset = offset;
    }
    get vertexOffset (): number {
        return this._drawInfo.vertexOffset;
    }

    /**
     * @en Get current instance count.
     * @zh 实例数量。
     */
    set instanceCount (count: number) {
        this._drawInfo.instanceCount = count;
    }
    get instanceCount (): number {
        return this._drawInfo.instanceCount;
    }

    /**
     * @en Get starting instance.
     * @zh 起始实例。
     */
    set firstInstance (first: number) {
        this._drawInfo.firstInstance = first;
    }
    get firstInstance (): number {
        return this._drawInfo.firstInstance;
    }

    /**
     * @en set the draw range
     * @zh 设置渲染范围
     */
    set drawInfo (info: DrawInfo) {
        this._drawInfo = info;
    }

    /**
     * @en get the draw range
     * @zh 获取渲染范围
     */
    get drawInfo (): DrawInfo {
        return this._drawInfo;
    }

    protected _attributes: Attribute[] = [];
    protected _attributesHash = 0;

    protected _vertexBuffers: Buffer[] = [];
    protected _indexBuffer: Buffer | null = null;
    protected _indirectBuffer: Buffer | null = null;

    protected _drawInfo = new DrawInfo();

    constructor () {
        super(ObjectType.INPUT_ASSEMBLER);
    }

    /**
     * @en Get the specified vertex buffer.
     * @zh 获取顶点缓冲。
     * @param stream The stream index of the vertex buffer.
     */
    public getVertexBuffer (stream = 0): Buffer | null {
        if (stream < this._vertexBuffers.length) {
            return this._vertexBuffers[stream];
        } else {
            return null;
        }
    }

    protected computeAttributesHash (): number {
        let res = 'attrs';
        for (let i = 0; i < this.attributes.length; ++i) {
            const at = this.attributes[i];
            res += `,${at.name},${at.format},${at.isNormalized},${at.stream},${at.isInstanced},${at.location}`;
        }
        return murmurhash2_32_gc(res, 666);
    }

    public abstract initialize (info: Readonly<InputAssemblerInfo>): void;
    public abstract destroy (): void;
}
