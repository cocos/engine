/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { EDITOR } from 'internal:constants';
import {
    ccclass, help, executeInEditMode, executionOrder, menu, tooltip, type, visible, override, serializable, editable,
} from 'cc.decorator';
import { getWorldTransformUntilRoot } from '../../animation/transform-utils';
import { Filter, PixelFormat } from '../../asset/assets/asset-enum';
import { Material } from '../../asset/assets/material';
import { Mesh } from '../assets/mesh';
import { Skeleton } from '../assets/skeleton';
import { Texture2D } from '../../asset/assets/texture-2d';
import { CCString, Mat4, Vec2, Vec3, cclegacy, warn } from '../../core';
import { AttributeName, FormatInfos, Format, Type, Attribute, BufferTextureCopy } from '../../gfx';
import { mapBuffer, readBuffer, writeBuffer } from '../misc/buffer';
import { SkinnedMeshRenderer } from './skinned-mesh-renderer';

const repeat = (n: number): number => n - Math.floor(n);
const batch_id: Attribute = new Attribute(AttributeName.ATTR_BATCH_ID, Format.R32F);
const batch_uv: Attribute = new Attribute(AttributeName.ATTR_BATCH_UV, Format.RG32F);
const batch_extras_size = FormatInfos[batch_id.format].size + FormatInfos[batch_uv.format].size;

@ccclass('cc.SkinnedMeshUnit')
export class SkinnedMeshUnit {
    /**
     * @en Skinned mesh of this unit.
     * @zh 子蒙皮模型的网格模型。
     */
    @type(Mesh)
    public mesh: Mesh | null = null;

    /**
     * @en Skeleton of this unit.
     * @zh 子蒙皮模型的骨骼。
     */
    @type(Skeleton)
    public skeleton: Skeleton | null = null;

    /**
     * @en Skinning material of this unit.
     * @zh 子蒙皮模型使用的材质。
     */
    @type(Material)
    public material: Material | null = null;

    /**
     * @en Local transform matrix
     * @zh 本地变换矩阵
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _localTransform = new Mat4();

    @serializable
    private _offset = new Vec2(0, 0);

    @serializable
    private _size = new Vec2(1, 1);

    /**
     * @en UV offset on texture atlas.
     * @zh 在图集中的 uv 坐标偏移。
     */
    @editable
    set offset (offset) {
        Vec2.copy(this._offset, offset);
    }

    get offset (): Vec2 {
        return this._offset;
    }

    /**
     * @en UV extent on texture atlas.
     * @zh 在图集中占的 UV 尺寸。
     */
    @editable
    set size (size) {
        Vec2.copy(this._size, size);
    }

    get size (): Vec2 {
        return this._size;
    }

    /**
     * @en Convenient setter, copying all necessary information from target [[SkinnedMeshRenderer]] component.
     * @zh 复制目标 [[SkinnedMeshRenderer]] 的所有属性到本单元，方便快速配置。
     */
    @type(SkinnedMeshRenderer)
    set copyFrom (comp: SkinnedMeshRenderer | null) {
        if (!comp) { return; }
        this.mesh = comp.mesh;
        this.skeleton = comp.skeleton;
        this.material = comp.getSharedMaterial(0);
        if (comp.skinningRoot) { getWorldTransformUntilRoot(comp.node, comp.skinningRoot, this._localTransform); }
    }

    get copyFrom (): SkinnedMeshRenderer | null {
        return null;
    }
}

const m4_local = new Mat4();
const m4_1 = new Mat4();
const v3_1 = new Vec3();

/**
 * @en The skinned mesh batch renderer component, batches multiple skeleton-sharing [[SkinnedMeshRenderer]].
 * @zh 蒙皮模型合批组件，用于合并绘制共享同一骨骼资源的所有蒙皮网格。
 */
@ccclass('cc.SkinnedMeshBatchRenderer')
@help('i18n:cc.SkinnedMeshBatchRenderer')
@executionOrder(100)
@executeInEditMode
@menu('Mesh/SkinnedMeshBatchRenderer')
export class SkinnedMeshBatchRenderer extends SkinnedMeshRenderer {
    /**
     * @en Size of the generated texture atlas.
     * @zh 合图生成的最终图集的边长。
     */
    @serializable
    @tooltip('i18n:batched_skinning_model.atlas_size')
    public atlasSize = 1024;

    /**
     * @en
     * Texture properties that will be actually using the generated atlas.<br>
     * The first unit's texture will be used if not specified.
     * @zh
     * 材质中真正参与合图的贴图属性，不参与的属性统一使用第一个 unit 的贴图。
     */
    @type([CCString])
    @serializable
    @tooltip('i18n:batched_skinning_model.batchable_texture_names')
    public batchableTextureNames: string[] = [];

    /**
     * @en Source skinning model components, containing all the data to be batched.
     * @zh 合批前的子蒙皮模型数组，最主要的数据来源。
     */
    @type([SkinnedMeshUnit])
    @serializable
    @tooltip('i18n:batched_skinning_model.units')
    public units: SkinnedMeshUnit[] = [];

    private _textures: Record<string, Texture2D> = {};

    private _batchMaterial: Material | null = null;

    constructor () {
        super();
    }

    @override
    @visible(false)
    get mesh (): Mesh | null {
        return super.mesh;
    }

    set mesh (val) {
        super.mesh = val;
    }

    @override
    @visible(false)
    get skeleton (): Skeleton | null {
        return super.skeleton;
    }

    set skeleton (val) {
        super.skeleton = val;
    }

    public onLoad (): void {
        super.onLoad();
        this.cook();
    }

    public onDestroy (): void {
        for (const tex in this._textures) {
            this._textures[tex].destroy();
        }
        this._textures = {};
        if (this._mesh) {
            this._mesh.destroy();
            this._mesh = null;
        }
        super.onDestroy();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onMaterialModified (idx: number, material: Material | null): void {
        this.cookMaterials();
        super._onMaterialModified(idx, this.getMaterialInstance(idx));
    }

    public cook (): void {
        this.cookMaterials();
        this.cookSkeletons();
        this.cookMeshes();
    }

    public cookMaterials (): void {
        if (!this._batchMaterial) {
            this._batchMaterial = this.getSharedMaterial(0);
        }
        const mat = this.getMaterialInstance(0);
        if (!mat || !this._batchMaterial || !this._batchMaterial.effectAsset) {
            warn('incomplete batch material!'); return;
        }
        mat.copy(this._batchMaterial); this.resizeAtlases();
        const tech = mat.effectAsset!.techniques[mat.technique];
        for (let i = 0; i < tech.passes.length; i++) {
            const pass = tech.passes[i];
            if (!pass.properties) { continue; }
            for (const prop in pass.properties) {
                if (pass.properties[prop].type >= (Type.SAMPLER1D as number)) { // samplers
                    let tex: Texture2D | null = null;
                    if (this.batchableTextureNames.find((n) => n === prop)) {
                        tex = this._textures[prop];
                        if (!tex) { tex = this.createTexture(prop); }
                        this.cookTextures(tex, prop, i);
                    } else {
                        this.units.some((u) => tex = u.material && u.material.getProperty(prop, i) as Texture2D | null);
                    }
                    if (tex) { mat.setProperty(prop, tex, i); }
                } else { // vectors
                    const value: any[] = [];
                    for (let u = 0; u < this.units.length; u++) {
                        const unit = this.units[u];
                        if (!unit.material) { continue; }
                        value.push(unit.material.getProperty(prop.slice(0, -3), i));
                    }
                    mat.setProperty(prop, value, i);
                }
            }
        }
    }

    public cookSkeletons (): void {
        if (!this._skinningRoot) { warn('no skinning root specified!'); return; }
        // merge joints accordingly
        const joints: string[] = [];
        const bindposes: Mat4[] = [];
        for (let u = 0; u < this.units.length; u++) {
            const unit = this.units[u];
            if (!unit || !unit.skeleton) { continue; }
            const partial = unit.skeleton;
            Mat4.invert(m4_local, unit._localTransform);
            for (let i = 0; i < partial.joints.length; i++) {
                const path = partial.joints[i];
                const idx = joints.findIndex((p) => p === path);
                if (idx >= 0) {
                    if (EDITOR) { // consistency check
                        Mat4.multiply(m4_1, partial.bindposes[i], m4_local);
                        if (!m4_1.equals(bindposes[idx])) {
                            warn(`${this.node.name}: Inconsistent bindpose at ${joints[idx]} in unit ${u}, artifacts may present`);
                        }
                    }
                    continue;
                }
                joints.push(path);
                // cancel out local transform
                bindposes.push(Mat4.multiply(new Mat4(), partial.bindposes[i] || Mat4.IDENTITY, m4_local));
            }
        }
        // sort the array to be more cache-friendly
        const idxMap = Array.from(Array(joints.length).keys()).sort((a, b) => {
            if (joints[a] > joints[b]) { return 1; }
            if (joints[a] < joints[b]) { return -1; }
            return 0;
        });
        const skeleton = new Skeleton();
        skeleton.joints = joints.map((_, idx, arr) => arr[idxMap[idx]]);
        skeleton.bindposes = bindposes.map((_, idx, arr) => arr[idxMap[idx]]);
        // apply
        if (this._skeleton) { this._skeleton.destroy(); }
        this.skeleton = skeleton;
    }

    public cookMeshes (): void {
        let isValid = false;
        for (let u = 0; u < this.units.length; u++) {
            const unit = this.units[u];
            if (unit.mesh) {
                isValid = true;
                break;
            }
        }

        if (!isValid || !this._skinningRoot) {
            return;
        }

        if (this._mesh) {
            this._mesh.destroyRenderingMesh();
        } else {
            this._mesh = new Mesh();
        }

        let posOffset = 0;
        let posFormat = Format.UNKNOWN;
        let normalOffset = 0;
        let normalFormat = Format.UNKNOWN;
        let tangentOffset = 0;
        let tangentFormat = Format.UNKNOWN;
        let uvOffset = 0;
        let uvFormat = Format.UNKNOWN;
        let jointOffset = 0;
        let jointFormat = Format.UNKNOWN;

        // prepare joint index map
        const jointIndexMap: number[][] = new Array(this.units.length);
        const unitLen = this.units.length;
        for (let i = 0; i < unitLen; i++) {
            const unit = this.units[i];
            if (!unit || !unit.skeleton) { continue; }
            jointIndexMap[i] = unit.skeleton.joints.map((j) => this._skeleton!.joints.findIndex((ref) => j === ref));
        }

        for (let i = 0; i < unitLen; i++) {
            const unit = this.units[i];
            if (!unit || !unit.mesh || !unit.mesh.data) { continue; }
            const newMesh = this._createUnitMesh(i, unit.mesh);
            const dataView = new DataView(newMesh.data.buffer);

            Mat4.invert(m4_local, unit._localTransform);
            Mat4.transpose(m4_local, m4_local);

            const { offset } = unit;
            const { size } = unit;
            for (let b = 0; b < newMesh.struct.vertexBundles.length; b++) {
                const bundle = newMesh.struct.vertexBundles[b];
                // apply local transform to mesh
                posOffset = bundle.view.offset;
                posFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === AttributeName.ATTR_POSITION as string) {
                        posFormat = attr.format;
                        break;
                    }
                    posOffset += FormatInfos[attr.format].size;
                }
                if (posFormat) {
                    const pos = readBuffer(dataView, posFormat, posOffset, bundle.view.length, bundle.view.stride);
                    for (let j = 0; j < pos.length; j += 3) {
                        Vec3.fromArray(v3_1, pos, j);
                        Vec3.transformMat4(v3_1, v3_1, unit._localTransform);
                        Vec3.toArray(pos, v3_1, j);
                    }
                    writeBuffer(dataView, pos, posFormat, posOffset, bundle.view.stride);
                }
                normalOffset = bundle.view.offset;
                normalFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === AttributeName.ATTR_NORMAL as string) {
                        normalFormat = attr.format;
                        break;
                    }
                    normalOffset += FormatInfos[attr.format].size;
                }
                if (normalFormat) {
                    const normal = readBuffer(dataView, normalFormat, normalOffset, bundle.view.length, bundle.view.stride);
                    for (let j = 0; j < normal.length; j += 3) {
                        Vec3.fromArray(v3_1, normal, j);
                        Vec3.transformMat4Normal(v3_1, v3_1, m4_local);
                        Vec3.toArray(normal, v3_1, j);
                    }
                    writeBuffer(dataView, normal, normalFormat, normalOffset, bundle.view.stride);
                }
                tangentOffset = bundle.view.offset;
                tangentFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === (AttributeName.ATTR_TANGENT) as string) {
                        tangentFormat = attr.format;
                        break;
                    }
                    tangentOffset += FormatInfos[attr.format].size;
                }
                if (tangentFormat) {
                    const tangent = readBuffer(dataView, tangentFormat, tangentOffset, bundle.view.length, bundle.view.stride);
                    for (let j = 0; j < tangent.length; j += 3) {
                        Vec3.fromArray(v3_1, tangent, j);
                        Vec3.transformMat4Normal(v3_1, v3_1, m4_local);
                        Vec3.toArray(tangent, v3_1, j);
                    }
                    writeBuffer(dataView, tangent, tangentFormat, tangentOffset, bundle.view.stride);
                }
                // merge UV
                uvOffset = bundle.view.offset;
                uvFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === AttributeName.ATTR_BATCH_UV as string) {
                        uvFormat = attr.format;
                        break;
                    }
                    uvOffset += FormatInfos[attr.format].size;
                }
                if (uvFormat) {
                    mapBuffer(dataView, (cur, idx) => {
                        cur = repeat(cur); // warp to [0, 1] first
                        const comp = idx === 0 ? 'x' : 'y';
                        return cur * size[comp] + offset[comp];
                    }, uvFormat, uvOffset, bundle.view.length, bundle.view.stride, dataView);
                }
                // merge joint indices
                const idxMap = jointIndexMap[i];
                if (!idxMap) { continue; }
                jointOffset = bundle.view.offset;
                jointFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === AttributeName.ATTR_JOINTS as string) {
                        jointFormat = attr.format;
                        break;
                    }
                    jointOffset += FormatInfos[attr.format].size;
                }
                if (jointFormat) {
                    mapBuffer(dataView, (cur) => idxMap[cur], jointFormat, jointOffset, bundle.view.length, bundle.view.stride, dataView);
                }
            }
            this._mesh.merge(newMesh);
        }

        this._onMeshChanged(this._mesh);
        this._updateModels();
    }

    protected cookTextures (target: Texture2D, prop: string, passIdx: number): void {
        const texImages: TexImageSource[] = [];
        const texImageRegions: BufferTextureCopy[] = [];
        const texBuffers: ArrayBufferView[] = [];
        const texBufferRegions: BufferTextureCopy[] = [];
        for (let u = 0; u < this.units.length; u++) {
            const unit = this.units[u];
            if (!unit.material) { continue; }
            const partial = unit.material.getProperty(prop, passIdx) as Texture2D | null;
            if (partial && partial.image && partial.image.data) {
                const region = new BufferTextureCopy();
                region.texOffset.x = unit.offset.x * this.atlasSize;
                region.texOffset.y = unit.offset.y * this.atlasSize;
                region.texExtent.width = unit.size.x * this.atlasSize;
                region.texExtent.height = unit.size.y * this.atlasSize;
                const { data } = partial.image;
                if (!ArrayBuffer.isView(data)) {
                    texImages.push(data);
                    texImageRegions.push(region);
                } else {
                    texBuffers.push(data);
                    texBufferRegions.push(region);
                }
            }
        }
        const gfxTex = target.getGFXTexture()!;
        const { device } = cclegacy.director.root!;
        if (texBuffers.length > 0) { device.copyBuffersToTexture(texBuffers, gfxTex, texBufferRegions); }
        if (texImages.length > 0) { device.copyTexImagesToTexture(texImages, gfxTex, texImageRegions); }
    }

    protected createTexture (prop: string): Texture2D {
        const tex = new Texture2D();
        tex.setFilters(Filter.LINEAR, Filter.LINEAR);
        tex.setMipFilter(Filter.NEAREST);
        tex.reset({
            width: this.atlasSize,
            height: this.atlasSize,
            format: PixelFormat.RGBA8888,
        });
        this._textures[prop] = tex;
        return tex;
    }

    protected resizeAtlases (): void {
        for (const prop in this._textures) {
            const tex = this._textures[prop];
            tex.reset({
                width: this.atlasSize,
                height: this.atlasSize,
                format: PixelFormat.RGBA8888,
            });
        }
    }

    private _createUnitMesh (unitIdx: number, mesh: Mesh): Mesh {
        // add batch ID to this temp mesh
        // first, update bookkeeping
        const newMeshStruct: Mesh.IStruct = JSON.parse(JSON.stringify(mesh.struct));
        const modifiedBundles: Record<number, [Format, number]> = {};
        for (let p = 0; p < mesh.struct.primitives.length; p++) {
            const primitive = mesh.struct.primitives[p];
            let uvOffset = 0;
            let uvFormat = Format.UNKNOWN;
            let bundleIdx = 0;
            for (; bundleIdx < primitive.vertexBundelIndices.length; bundleIdx++) {
                const bundle = mesh.struct.vertexBundles[primitive.vertexBundelIndices[bundleIdx]];
                uvOffset = bundle.view.offset;
                uvFormat = Format.UNKNOWN;
                for (let a = 0; a < bundle.attributes.length; a++) {
                    const attr = bundle.attributes[a];
                    if (attr.name === AttributeName.ATTR_TEX_COORD as string) {
                        uvFormat = attr.format;
                        break;
                    }
                    uvOffset += FormatInfos[attr.format].size;
                }
                if (uvFormat) { break; }
            }
            if (modifiedBundles[bundleIdx] !== undefined) { continue; }
            modifiedBundles[bundleIdx] = [uvFormat, uvOffset];
            const newBundle = newMeshStruct.vertexBundles[bundleIdx]; // put the new UVs in the same bundle with original UVs
            newBundle.attributes.push(batch_id);
            newBundle.attributes.push(batch_uv);
            newBundle.view.offset = 0;
            newBundle.view.length += newBundle.view.count * batch_extras_size;
            newBundle.view.stride += batch_extras_size;
        }
        let totalLength = 0;
        for (let b = 0; b < newMeshStruct.vertexBundles.length; b++) {
            totalLength += newMeshStruct.vertexBundles[b].view.length;
        }
        for (let p = 0; p < newMeshStruct.primitives.length; p++) {
            const pm = newMeshStruct.primitives[p];
            if (pm.indexView) {
                pm.indexView.offset = totalLength;
                totalLength += pm.indexView.length;
            }
        }
        // now, we ride!
        const newMeshData = new Uint8Array(totalLength);
        const oldMeshData = mesh.data;
        const newDataView = new DataView(newMeshData.buffer);
        const oldDataView = new DataView(oldMeshData.buffer);
        const { isLittleEndian } = cclegacy.sys;
        for (const b in modifiedBundles) {
            const newBundle = newMeshStruct.vertexBundles[b];
            const oldBundle = mesh.struct.vertexBundles[b];
            const [uvFormat, uvOffset] = modifiedBundles[b];
            const uvs = readBuffer(oldDataView, uvFormat, uvOffset, oldBundle.view.length, oldBundle.view.stride);
            const oldView = oldBundle.view;
            const newView = newBundle.view;
            const oldStride = oldView.stride;
            const newStride = newView.stride;
            let oldOffset = oldView.offset;
            let newOffset = newView.offset;
            for (let j = 0; j < newView.count; j++) {
                const srcVertex = oldMeshData.subarray(oldOffset, oldOffset + oldStride);
                newMeshData.set(srcVertex, newOffset);
                // insert batch ID
                newDataView.setFloat32(newOffset + oldStride, unitIdx);
                // insert batch UV
                newDataView.setFloat32(newOffset + oldStride + 4, uvs[j * 2], isLittleEndian as boolean);
                newDataView.setFloat32(newOffset + oldStride + 8, uvs[j * 2 + 1], isLittleEndian as boolean);
                newOffset += newStride;
                oldOffset += oldStride;
            }
        }
        for (let k = 0; k < newMeshStruct.primitives.length; k++) {
            const oldPrimitive = mesh.struct.primitives[k];
            const newPrimitive = newMeshStruct.primitives[k];
            if (oldPrimitive.indexView && newPrimitive.indexView) {
                const oldStride = oldPrimitive.indexView.stride;
                const newStride = newPrimitive.indexView.stride;
                let oldOffset = oldPrimitive.indexView.offset;
                let newOffset = newPrimitive.indexView.offset;
                for (let j = 0; j < newPrimitive.indexView.count; j++) {
                    const srcIndices = oldMeshData.subarray(oldOffset, oldOffset + oldStride);
                    newMeshData.set(srcIndices, newOffset);
                    newOffset += newStride;
                    oldOffset += oldStride;
                }
            }
        }
        const newMesh = new Mesh();
        newMesh.reset({
            struct: newMeshStruct,
            data: newMeshData,
        });
        return newMesh;
    }
}
