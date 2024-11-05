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
import { Camera, Model } from '../../render-scene/scene';
import type { UIStaticBatch } from '../components/ui-static-batch';
import { Material } from '../../asset/assets/material';
import { RenderRoot2D, UIRenderer } from '../framework';
import { Texture, Device, Attribute, Sampler, DescriptorSetInfo, Buffer,
    BufferInfo, BufferUsageBit, MemoryUsageBit, DescriptorSet, InputAssembler, deviceManager, PrimitiveMode,
    DepthStencilState } from '../../gfx';
import { CachedArray, Pool, Mat4, cclegacy, assertIsTrue, assert, approx, EPSILON } from '../../core';
import { Root } from '../../root';
import { Node } from '../../scene-graph';
import { Stage, StencilManager } from './stencil-manager';
import { DrawBatch2D } from './draw-batch';
import { ModelLocalBindings, UBOLocal, UBOLocalEnum } from '../../rendering/define';
import { SpriteFrame } from '../assets';
import { TextureBase } from '../../asset/assets/texture-base';
import { IBatcher } from './i-batcher';
import { StaticVBAccessor } from './static-vb-accessor';
import { getAttributeStride, vfmt, vfmtPosUvColor } from './vertex-format';
import { updateOpacity } from '../assembler/utils';
import { BaseRenderData, MeshRenderData } from './render-data';
import { UIMeshRenderer } from '../components/ui-mesh-renderer';
import { NativeBatcher2d } from './native-2d';
import { MeshBuffer } from './mesh-buffer';
import { scene } from '../../render-scene';
import { builtinResMgr } from '../../asset/asset-manager';
import { RenderingSubMesh } from '../../asset/assets';
import { IAssembler } from './base';
import type { Director } from '../../game/director';

const _dsInfo = new DescriptorSetInfo(null!);
const m4_1 = new Mat4();

/**
 * @en UI rendering process
 * @zh UI 渲染流程
 */
export class Batcher2D implements IBatcher {
    protected declare _nativeObj: NativeBatcher2d;
    public get nativeObj (): NativeBatcher2d  {
        return this._nativeObj;
    }

    get currBufferAccessor (): StaticVBAccessor {
        if (this._staticVBBuffer) return this._staticVBBuffer;
        // create if not set
        this._staticVBBuffer = this.switchBufferAccessor();
        return this._staticVBBuffer;
    }

    get batches (): CachedArray<DrawBatch2D> {
        return this._batches;
    }

    set currStaticRoot (value: UIStaticBatch | null) {
        this._currStaticRoot = value;
    }

    set currIsStatic (value: boolean) {
        this._currIsStatic = value;
    }

    public declare device: Device;
    private _screens: RenderRoot2D[] = [];
    private _staticVBBuffer: StaticVBAccessor | null = null;
    private _bufferAccessors: Map<number, StaticVBAccessor> = new Map();

    private declare _drawBatchPool: Pool<DrawBatch2D>;
    private declare _batches: CachedArray<DrawBatch2D>;
    private _currBID = -1;
    private _indexStart = 0;

    private _emptyMaterial = new Material();
    private _currRenderData: BaseRenderData | null = null;
    private _currMaterial: Material = this._emptyMaterial;
    private _currTexture: Texture | null = null;
    private _currSampler: Sampler | null = null;
    private _currStaticRoot: UIStaticBatch | null = null;
    private _currComponent: UIRenderer | null = null;
    private _currTransform: Node | null = null;
    private _currTextureHash = 0;
    private _currSamplerHash = 0;
    private _currLayer = 0;
    private _currDepthStencilStateStage: Stage | null = null;
    private _currIsStatic = false;
    private _currHash = 0;

    //for middleware
    private _currIsMiddleware = false;
    private _middlewareEnableBatch = false;
    private _middlewareBuffer: MeshBuffer | null = null;
    private _middlewareIndexStart = 0;
    private _middlewareIndexCount = 0;

    private _pOpacity = 1;
    private _opacityDirty = 0;

    // DescriptorSet Cache Map
    private _descriptorSetCache = new DescriptorSetCache();

    private _meshDataArray: MeshRenderData[] = [];

    // mask use
    private _maskClearModel: Model | null = null;
    private _maskClearMtl: Material | null = null;
    private _maskModelMesh: RenderingSubMesh | null = null;

    constructor (private _root: Root) {
        this.device = _root.device;
        this._batches = new CachedArray(64);
        this._drawBatchPool = new Pool(() => new DrawBatch2D(), 128, (obj) => obj.destroy(this));
    }

    public initialize (): boolean {
        return true;
    }

    public destroy (): void {
        for (let i = 0; i < this._batches.length; i++) {
            if (this._batches.array[i]) {
                this._batches.array[i].destroy(this);
            }
        }
        this._batches.destroy();

        for (const accessor of this._bufferAccessors.values()) {
            accessor.destroy();
        }
        this._bufferAccessors.clear();

        if (this._drawBatchPool) {
            this._drawBatchPool.destroy();
        }

        this._descriptorSetCache.destroy();

        StencilManager.sharedManager!.destroy();

        if (this._maskClearModel && this._maskModelMesh) {
            (cclegacy.director.root as Root).destroyModel(this._maskClearModel);
            this._maskModelMesh.destroy();
        }
        if (this._maskClearMtl) {
            this._maskClearMtl.destroy();
        }
    }

    private syncRootNodesToNative (): void {
        if (JSB) {
            const rootNodes: Node[] = [];
            for (const screen of this._screens) {
                rootNodes.push(screen.node);
            }
            this._nativeObj.syncRootNodesToNative(rootNodes);
        }
    }

    /**
     * @en
     * Add the managed Canvas.
     *
     * @zh
     * 添加屏幕组件管理。
     *
     * @param comp @en The render root of 2d.
     *             @zh 2d 渲染入口组件。
     */
    public addScreen (comp: RenderRoot2D): void {
        this._screens.push(comp);
        this._screens.sort(this._screenSort);
        if (JSB) {
            this.syncRootNodesToNative();
        }
    }

    /**
     * @zh
     * Removes the Canvas from the list.
     *
     * @param comp @en The target to removed.
     *             @zh 被移除的屏幕。
     */
    public removeScreen (comp: RenderRoot2D): void {
        const idx = this._screens.indexOf(comp);
        if (idx === -1) {
            return;
        }
        this._screens.splice(idx, 1);
        if (JSB) {
            this.syncRootNodesToNative();
        }
    }

    public sortScreens (): void {
        this._screens.sort(this._screenSort);
        if (JSB) {
            this.syncRootNodesToNative();
        }
    }

    public getFirstRenderCamera (node: Node): Camera | null {
        if (node.scene && node.scene.renderScene) {
            const cameras = node.scene.renderScene.cameras;
            for (let i = 0; i < cameras.length; i++) {
                const camera = cameras[i];
                if (camera.visibility & node.layer) {
                    return camera;
                }
            }
        }
        return null;
    }

    public update (): void {
        if (JSB) {
            return;
        }
        const screens = this._screens;
        let offset = 0;
        for (let i = 0; i < screens.length; ++i) {
            const screen = screens[i];
            const scene = screen._getRenderScene();
            if (!screen.enabledInHierarchy || !scene) {
                continue;
            }
            // Reset state and walk
            this._opacityDirty = 0;
            this._pOpacity = 1;

            this.walk(screen.node);

            this.autoMergeBatches(this._currComponent!);
            this.resetRenderStates();

            let batchPriority = 0;
            if (this._batches.length > offset) {
                for (; offset < this._batches.length; ++offset) {
                    const batch = this._batches.array[offset];

                    if (batch.model) {
                        const subModels = batch.model.subModels;
                        for (let j = 0; j < subModels.length; j++) {
                            subModels[j].priority = batchPriority++;
                        }
                    } else {
                        batch.descriptorSet = this._descriptorSetCache.getDescriptorSet(batch);
                    }
                    scene.addBatch(batch);
                }
            }
        }
    }

    public uploadBuffers (): void {
        if (JSB) {
            this._nativeObj.uploadBuffers();
        } else if (this._batches.length > 0) {
            const length = this._meshDataArray.length;
            for (let i = 0; i < length; i++) {
                this._meshDataArray[i].uploadBuffers();
            }

            for (const accessor of this._bufferAccessors.values()) {
                accessor.uploadBuffers();
                accessor.reset();
            }

            this._descriptorSetCache.update();
        }
    }

    public reset (): void {
        if (JSB) {
            this._nativeObj.reset();
        } else {
            for (let i = 0; i < this._batches.length; ++i) {
                const batch = this._batches.array[i];
                if (batch.isStatic) {
                    continue;
                }

                batch.clear();
                this._drawBatchPool.free(batch);
            }
            // Reset buffer accessors
            for (const accessor of this._bufferAccessors.values()) {
                accessor.reset();
            }
            const length = this._meshDataArray.length;
            for (let i = 0; i < length; i++) {
                this._meshDataArray[i].freeIAPool();
            }
            this._meshDataArray.length = 0;
            this._staticVBBuffer = null;

            this._currBID = -1;
            this._indexStart = 0;
            this._currHash = 0;
            this._currLayer = 0;
            this._currRenderData = null;
            this._currMaterial = this._emptyMaterial;
            this._currTexture = null;
            this._currSampler = null;
            this._currComponent = null;
            this._currTransform = null;
            this._batches.clear();
            StencilManager.sharedManager!.reset();
        }
    }

    /**
     * @zh 如果有必要，为相应的顶点布局切换网格缓冲区。
     * @en Switch the mesh buffer for corresponding vertex layout if necessary.
     * @param attributes use VertexFormat.vfmtPosUvColor by default
     */
    public switchBufferAccessor (attributes: Attribute[] = vfmtPosUvColor): StaticVBAccessor {
        const strideBytes = attributes === vfmtPosUvColor ? 36 /* 9x4 */ : getAttributeStride(attributes);
        // If current accessor not compatible with the requested attributes
        if (!this._staticVBBuffer || (this._staticVBBuffer.vertexFormatBytes) !== strideBytes) {
            let accessor = this._bufferAccessors.get(strideBytes);
            if (!accessor) {
                accessor = new StaticVBAccessor(this.device, attributes);
                this._bufferAccessors.set(strideBytes, accessor);
            }

            this._staticVBBuffer = accessor;
            this._currBID = -1;
        }
        return this._staticVBBuffer;
    }

    public registerBufferAccessor (key: number, accessor: StaticVBAccessor): void {
        this._bufferAccessors.set(key, accessor);
    }

    public updateBuffer (attributes: Attribute[], bid: number): void {
        const accessor = this.switchBufferAccessor(attributes);
        // If accessor changed, then current bid will be reset to -1, this check will pass too
        if (this._currBID !== bid) {
            this._currBID = bid;
            this._indexStart = accessor.getMeshBuffer(bid).indexOffset;
        }
    }

    /**
     * @en
     * Render component data submission process of UI.
     * The submitted vertex data is the UI for world coordinates.
     * For example: The UI components except Graphics and UIModel.
     *
     * @zh
     * UI 渲染组件数据提交流程（针对提交的顶点数据是世界坐标的提交流程，例如：除 Graphics 和 UIModel 的大部分 ui 组件）。
     * 此处的数据最终会生成需要提交渲染的 model 数据。
     *
     * @param comp - The committed renderable component
     * @param renderData - The render data being committed
     * @param frame - Texture or sprite frame related to the draw batch, could be null
     * @param assembler - The assembler for the current component, could be null
     * @param transform - Node type transform, if passed, then batcher will consider it's using model matrix, could be null
     */
    public commitComp (
        comp: UIRenderer,
        renderData: BaseRenderData | null,
        frame: TextureBase | SpriteFrame | null,
        assembler: IAssembler,
        transform: Node | null,
    ): void {
        let dataHash = 0;
        let mat;
        let bufferID = -1;
        if (renderData && renderData.chunk) {
            if (!renderData.isValid()) return;
            dataHash = renderData.dataHash;
            mat = renderData.material;
            bufferID = renderData.chunk.bufferId;
        }
        // Notice: A little hack, if it is for mask, not need update here, while control by stencilManger
        if (comp.stencilStage === Stage.ENTER_LEVEL || comp.stencilStage === Stage.ENTER_LEVEL_INVERTED) {
            this._insertMaskBatch(comp);
        } else {
            comp.stencilStage = StencilManager.sharedManager!.stage;
        }
        const depthStencilStateStage = comp.stencilStage;

        if (this._currHash !== dataHash || dataHash === 0 || this._currMaterial !== mat
            || this._currDepthStencilStateStage !== depthStencilStateStage) {
            // Merge all previous data to a render batch, and update buffer for next render data
            this.autoMergeBatches(this._currComponent!);
            if (renderData && !renderData._isMeshBuffer) {
                this.updateBuffer(renderData.vertexFormat, bufferID);
            }

            this._currRenderData = renderData;
            this._currHash = renderData ? renderData.dataHash : 0;
            this._currComponent = comp;
            this._currTransform = transform;
            this._currMaterial = comp.getRenderMaterial(0)!;
            this._currDepthStencilStateStage = depthStencilStateStage;
            this._currLayer = comp.node.layer;
            if (frame) {
                if (DEBUG) {
                    assert(frame.isValid, 'frame should not be invalid, it may have been released');
                }
                this._currTexture = frame.getGFXTexture();
                this._currSampler = frame.getGFXSampler();
                this._currTextureHash = frame.getHash();
                this._currSamplerHash = this._currSampler.hash;
            } else {
                this._currTexture = null;
                this._currSampler = null;
                this._currTextureHash = 0;
                this._currSamplerHash = 0;
            }
        }

        assembler.fillBuffers(comp, this);
    }

    /**
     * @en
     * Render component data submission process for individual [[gfx.InputAssembler]]
     * @zh
     * 渲染组件中针对独立 [[gfx.InputAssembler]] 的提交流程
     * 例如：Spine 和 DragonBones 等包含动态数据和材质的组件在内部管理 IA 并提交批次
     * @param comp - The committed renderable component
     * @param ia - The committed [[gfx.InputAssembler]]
     * @param tex - The texture used
     * @param mat - The material used
     * @param [transform] - The related node transform if the render data is based on node's local coordinates
     * @deprecated since v3.6.2, please use [[commitMiddleware]] instead
     */
    public commitIA (renderComp: UIRenderer, ia: InputAssembler, tex?: TextureBase, mat?: Material, transform?: Node): void {
        // if the last comp is spriteComp, previous comps should be batched.
        if (this._currMaterial !== this._emptyMaterial) {
            this.autoMergeBatches(this._currComponent!);
            this.resetRenderStates();
        }
        let depthStencil: DepthStencilState | null = null;
        let dssHash = 0;
        if (renderComp) {
            renderComp.stencilStage = StencilManager.sharedManager!.stage;
            if (renderComp.customMaterial !== null) {
                depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage, mat);
            } else {
                depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage);
            }
            dssHash = StencilManager.sharedManager!.getStencilHash(renderComp.stencilStage);
        }

        const curDrawBatch = this._currStaticRoot ? this._currStaticRoot._requireDrawBatch() : this._drawBatchPool.alloc();
        curDrawBatch.visFlags = renderComp.node.layer;
        curDrawBatch.inputAssembler = ia;
        curDrawBatch.useLocalData = transform || null;
        if (tex) {
            curDrawBatch.texture = tex.getGFXTexture();
            curDrawBatch.sampler = tex.getGFXSampler();
            curDrawBatch.textureHash = tex.getHash();
            curDrawBatch.samplerHash = curDrawBatch.sampler.hash;
        }
        curDrawBatch.fillPasses(mat || null, depthStencil, dssHash, null);
        this._batches.push(curDrawBatch);
    }

    /**
     * @en
     * Render component data submission process for middleware2d components
     * @zh
     * 渲染组件中针对2D中间件组件渲染数据的提交流程
     * 例如：Spine 和 DragonBones 包含动态数据和材质的组件
     * @param comp - The committed renderable component
     * @param meshBuffer - The MeshBuffer used
     * @param indexOffset - indices offset
     * @param indexCount - indices count
     * @param tex - The texture used
     * @param mat - The material used
     * @param enableBatch - component support multi draw batch or not
     */
    public commitMiddleware (
        comp: UIRenderer,
        meshBuffer: MeshBuffer,
        indexOffset: number,
        indexCount: number,
        tex: TextureBase,
        mat: Material,
        enableBatch: boolean,
    ): void {
        // check if need merge draw batch
        const texture = tex.getGFXTexture();
        if (enableBatch && this._middlewareEnableBatch && this._middlewareBuffer === meshBuffer
            && this._currTexture === texture
            && this._currMaterial.hash === mat.hash
            && this._middlewareIndexStart + this._middlewareIndexCount === indexOffset
            && this._currLayer === comp.node.layer) {
            this._middlewareIndexCount += indexCount;
        } else {
            this.autoMergeBatches(this._currComponent!);
            this.resetRenderStates();

            this._currComponent = comp;
            this._currTexture = texture;
            this._currSampler = tex.getGFXSampler();
            this._currTextureHash = tex.getHash();
            this._currLayer = comp.node.layer;
            this._currSamplerHash = this._currSampler.hash;
            this._currHash = 0;
            this._currTransform = enableBatch ? null : comp.node;

            this._middlewareEnableBatch = enableBatch;
            this._middlewareBuffer = meshBuffer;
            this._currMaterial = mat;
            this._middlewareIndexStart = indexOffset;
            this._middlewareIndexCount = indexCount;
        }

        this._currIsMiddleware = true;
    }

    /**
     * @en
     * Render component data submission process of UI.
     * The submitted vertex data is the UI for local coordinates.
     * For example: The UI components of Graphics and UIModel.
     *
     * @zh
     * UI 渲染组件数据提交流程（针对例如： Graphics 和 UIModel 等数据量较为庞大的 ui 组件）。
     *
     * @param comp - The committed renderable component
     * @param model - The committed model
     * @param mat - The material used, could be null
     */
    public commitModel (comp: UIMeshRenderer | UIRenderer, model: Model | null, mat: Material | null): void {
        // if the last comp is spriteComp, previous comps should be batched.
        if (this._currMaterial !== this._emptyMaterial) {
            this.autoMergeBatches(this._currComponent!);
            this.resetRenderStates();
        }

        let depthStencil: DepthStencilState | null = null;
        let dssHash = 0;
        if (mat) {
            // Notice: A little hack, if it is for mask, not need update here, while control by stencilManger
            if (comp.stencilStage === Stage.ENTER_LEVEL || comp.stencilStage === Stage.ENTER_LEVEL_INVERTED) {
                this._insertMaskBatch(comp);
            } else {
                comp.stencilStage = StencilManager.sharedManager!.stage;
            }
            depthStencil = StencilManager.sharedManager!.getStencilStage(comp.stencilStage, mat);
            dssHash = StencilManager.sharedManager!.getStencilHash(comp.stencilStage);
        }

        const stamp: number = (cclegacy.director as Director).getTotalFrames();
        if (model) {
            model.updateTransform(stamp);
            model.updateUBOs(stamp);
        }

        for (let i = 0; i < model!.subModels.length; i++) {
            const curDrawBatch = this._drawBatchPool.alloc();
            const subModel = model!.subModels[i];
            curDrawBatch.visFlags = comp.node.layer;
            curDrawBatch.model = model;
            curDrawBatch.texture = null;
            curDrawBatch.sampler = null;
            curDrawBatch.useLocalData = null;
            if (!depthStencil) { depthStencil = null; }
            curDrawBatch.fillPasses(mat, depthStencil, dssHash, subModel.patches);
            curDrawBatch.inputAssembler = subModel.inputAssembler;
            curDrawBatch.model!.visFlags = curDrawBatch.visFlags;
            curDrawBatch.descriptorSet = subModel.descriptorSet;
            this._batches.push(curDrawBatch);
        }
    }

    public setupStaticBatch (staticComp: UIStaticBatch, bufferAccessor: StaticVBAccessor): void {
        this.finishMergeBatches();
        this._staticVBBuffer = bufferAccessor;
        this.currStaticRoot = staticComp;
    }

    public endStaticBatch (): void {
        this.finishMergeBatches();
        this.currStaticRoot = null;
        // Clear linear buffer to switch to the correct internal accessor
        this._staticVBBuffer = null;
        this.switchBufferAccessor();
    }

    /**
     * @en
     * Submit separate render data.
     * This data does not participate in the batch.
     *
     * @zh
     * 提交独立渲染数据.
     * @param comp @en The UIStaticBatch component.
     *             @zh 静态组件
     */
    public commitStaticBatch (comp: UIStaticBatch): void {
        this._batches.concat(comp.drawBatchList);
        this.finishMergeBatches();
    }

    /**
     * @en
     * End a section of render data and submit according to the batch condition.
     *
     * @zh
     * 根据合批条件，结束一段渲染数据并提交。
     */
    public autoMergeBatches (renderComp?: UIRenderer): void {
        if (this._currIsMiddleware) {
            this.mergeBatchesForMiddleware(renderComp!);
            return;
        }
        const mat = this._currMaterial;
        if (!mat) {
            return;
        }
        let ia: InputAssembler | undefined;
        const rd = this._currRenderData as MeshRenderData;
        const accessor = this._staticVBBuffer;
        // Previous batch using mesh buffer
        if (rd && rd._isMeshBuffer) {
            ia = rd.requestIA(this.device);
            if (this._meshDataArray.indexOf(rd) === -1) {
                this._meshDataArray.push(rd);
            }
        } else if (accessor) {
        // Previous batch using static vb buffer
            const bid = this._currBID;
            const buf = accessor.getMeshBuffer(bid);
            if (!buf) {
                return;
            }
            const indexCount = buf.indexOffset - this._indexStart;
            if (indexCount <= 0) return;
            assertIsTrue(this._indexStart < buf.indexOffset);
            buf.setDirty();
            // Request ia
            ia = buf.requireFreeIA(this.device);
            ia.firstIndex = this._indexStart;
            ia.indexCount = indexCount;
            // Update index tracker and bid
            this._indexStart = buf.indexOffset;
        }
        this._currBID = -1;

        // Request ia failed
        if (!ia || !this._currTexture) {
            return;
        }

        let depthStencil: DepthStencilState | null = null;
        let dssHash = 0;
        if (renderComp) {
            if (renderComp.customMaterial !== null) {
                depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage, mat);
            } else {
                depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage);
            }
            dssHash = StencilManager.sharedManager!.getStencilHash(renderComp.stencilStage);
        }

        const curDrawBatch = this._currStaticRoot ? this._currStaticRoot._requireDrawBatch() : this._drawBatchPool.alloc();
        curDrawBatch.visFlags = this._currLayer;
        curDrawBatch.texture = this._currTexture;
        curDrawBatch.sampler = this._currSampler;
        curDrawBatch.inputAssembler = ia;
        curDrawBatch.useLocalData = this._currTransform;
        curDrawBatch.textureHash = this._currTextureHash;
        curDrawBatch.samplerHash = this._currSamplerHash;
        curDrawBatch.fillPasses(mat, depthStencil, dssHash, null);

        this._batches.push(curDrawBatch);
    }

    private mergeBatchesForMiddleware (renderComp: UIRenderer): void {
        let depthStencil: DepthStencilState | null = null;
        let dssHash = 0;
        renderComp.stencilStage = StencilManager.sharedManager!.stage;
        if (renderComp.customMaterial !== null) {
            depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage, this._currMaterial);
        } else {
            depthStencil = StencilManager.sharedManager!.getStencilStage(renderComp.stencilStage);
        }
        dssHash = StencilManager.sharedManager!.getStencilHash(renderComp.stencilStage);

        const curDrawBatch = this._currStaticRoot ? this._currStaticRoot._requireDrawBatch() : this._drawBatchPool.alloc();
        curDrawBatch.visFlags = renderComp.node.layer;
        const ia = this._middlewareBuffer!.requireFreeIA(this.device);
        ia.firstIndex = this._middlewareIndexStart;
        ia.indexCount = this._middlewareIndexCount;

        curDrawBatch.inputAssembler = ia;
        curDrawBatch.useLocalData = this._currTransform;
        curDrawBatch.texture = this._currTexture;
        curDrawBatch.sampler = this._currSampler;
        curDrawBatch.textureHash = this._currTextureHash;
        curDrawBatch.samplerHash = this._currSamplerHash;
        curDrawBatch.fillPasses(this._currMaterial || null, depthStencil, dssHash, null);
        this._batches.push(curDrawBatch);

        this._currIsMiddleware = false;
        this._middlewareBuffer = null;
    }

    /**
     * @en
     * Force changes to current batch data and merge
     *
     * @zh
     * 强行修改当前批次数据并合并。
     *
     * @param material @en The material of the current batch.
     *                 @zh 当前批次的材质。
     * @param sprite @en Sprite frame of current batch.
     *               @zh 当前批次的精灵帧。
     */
    public forceMergeBatches (material: Material, frame: TextureBase | SpriteFrame | null, renderComp: UIRenderer): void {
        this._currMaterial = material;

        if (frame) {
            this._currTexture = frame.getGFXTexture();
            this._currSampler = frame.getGFXSampler();
            this._currTextureHash = frame.getHash();
            this._currSamplerHash = this._currSampler.hash;
        } else {
            this._currTexture = this._currSampler = null;
            this._currTextureHash = this._currSamplerHash = 0;
        }
        this._currLayer = renderComp.node.layer;

        this.autoMergeBatches(renderComp);
    }

    public resetRenderStates (): void {
        this._currMaterial = this._emptyMaterial;
        this._currRenderData = null;
        this._currTexture = null;
        this._currComponent = null;
        this._currTransform = null;
        this._currTextureHash = 0;
        this._currSamplerHash = 0;
        this._currLayer = 0;
    }

    /**
     * @en
     * Forced to merge the data of the previous batch to start a new batch.
     *
     * @zh
     * 强制合并上一个批次的数据，开启新一轮合批。
     */
    public finishMergeBatches (): void {
        this.autoMergeBatches();
        this.resetRenderStates();
    }

    /**
     * @en
     * Force to change the current material.
     *
     * @zh
     * 强制刷新材质。
     */
    public flushMaterial (mat: Material): void {
        this._currMaterial = mat;
    }

    public walk (node: Node, level = 0): void {
        if (!node.activeInHierarchy) {
            return;
        }
        const children = node.children;
        const uiProps = node._uiProps;
        const render = uiProps.uiComp as UIRenderer;

        // Save opacity
        const parentOpacity = this._pOpacity;
        let opacity = parentOpacity;
        // TODO Always cascade ui property's local opacity before remove it
        const selfOpacity = render && render.color ? render.color.a / 255 : 1;
        this._pOpacity = opacity *= selfOpacity * uiProps.localOpacity;
        // TODO Set opacity to ui property's opacity before remove it
        uiProps.setOpacity(opacity);
        if (!approx(opacity, 0, EPSILON)) {
            if (uiProps.colorDirty) {
            // Cascade color dirty state
                this._opacityDirty++;
            }

            // Render assembler update logic
            if (render && render.enabledInHierarchy) {
                render.fillBuffers(this);// for rendering
            }

            // Update cascaded opacity to vertex buffer
            if (this._opacityDirty && render && !render.useVertexOpacity && render.renderData && render.renderData.vertexCount > 0) {
            // HARD COUPLING
                updateOpacity(render.renderData, opacity);
                const buffer = render.renderData.getMeshBuffer();
                if (buffer) {
                    buffer.setDirty();
                }
            }

            if (children.length > 0 && !node._static) {
                for (let i = 0; i < children.length; ++i) {
                    const child = children[i];
                    this.walk(child, level);
                }
            }

            if (uiProps.colorDirty) {
            // Reduce cascaded color dirty state
                this._opacityDirty--;
                // Reset color dirty
                uiProps.colorDirty = false;
            }
        }
        // Restore opacity
        this._pOpacity = parentOpacity;

        // Post render assembler update logic
        // ATTENTION: Will also reset colorDirty inside postUpdateAssembler
        if (render && render.enabledInHierarchy) {
            render.postUpdateAssembler(this);
            if ((render.stencilStage === Stage.ENTER_LEVEL || render.stencilStage === Stage.ENTER_LEVEL_INVERTED)
            && (StencilManager.sharedManager!.getMaskStackSize() > 0)) {
                this.autoMergeBatches(this._currComponent!);
                this.resetRenderStates();
                StencilManager.sharedManager!.exitMask();
            }
        }

        level += 1;
    }

    private _screenSort (a: RenderRoot2D, b: RenderRoot2D): number {
        return a.node.getSiblingIndex() - b.node.getSiblingIndex();
    }

    // TODO: Not a good way to do the job
    // Although it's a private method, it is invoked in text-processing.ts and texture-base.ts
    // by legacyCC.director.root.batcher2D._releaseDescriptorSetCache
    /**
     * @engineInternal
     */
    public _releaseDescriptorSetCache (textureHash: number | Texture | null, sampler: Sampler | null = null): void {
        if (JSB) {
            this._nativeObj.releaseDescriptorSetCache(textureHash as Texture, sampler as Sampler);
        } else {
            this._descriptorSetCache.releaseDescriptorSetCache(textureHash as number);
        }
    }

    // Mask use
    private _createClearModel (): void {
        if (!this._maskClearModel) {
            this._maskClearMtl = builtinResMgr.get<Material>('default-clear-stencil');

            this._maskClearModel = (cclegacy.director.root as Root).createModel(scene.Model);
            const stride = getAttributeStride(vfmt);
            const gfxDevice: Device = deviceManager.gfxDevice;
            const vertexBuffer = gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                4 * stride,
                stride,
            ));

            const vb = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]);
            vertexBuffer.update(vb);
            const indexBuffer = gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                6 * Uint16Array.BYTES_PER_ELEMENT,
                Uint16Array.BYTES_PER_ELEMENT,
            ));

            const ib = new Uint16Array([0, 1, 2, 2, 1, 3]);
            indexBuffer.update(ib);
            this._maskModelMesh = new RenderingSubMesh([vertexBuffer], vfmt, PrimitiveMode.TRIANGLE_LIST, indexBuffer);
            this._maskModelMesh.subMeshIdx = 0;

            this._maskClearModel.initSubModel(0, this._maskModelMesh, this._maskClearMtl);
        }
    }

    private _insertMaskBatch (comp: UIRenderer | UIMeshRenderer): void {
        this.autoMergeBatches(this._currComponent!);
        this.resetRenderStates();
        this._createClearModel();
        this._maskClearModel!.node = this._maskClearModel!.transform = comp.node;
        const _stencilManager = StencilManager.sharedManager!;
        _stencilManager.pushMask(1);//not need object，only use length
        const stage =  _stencilManager.clear(comp); //invert

        let depthStencil: DepthStencilState | null = null;
        let dssHash = 0;
        const mat = this._maskClearMtl;
        if (mat) {
            depthStencil = _stencilManager.getStencilStage(stage, mat);
            dssHash = _stencilManager.getStencilHash(stage);
        }

        const model = this._maskClearModel!;
        const stamp: number = (cclegacy.director as Director).getTotalFrames();
        if (model) {
            model.updateTransform(stamp);
            model.updateUBOs(stamp);
        }

        for (let i = 0; i < model.subModels.length; i++) {
            const curDrawBatch = this._drawBatchPool.alloc();
            const subModel = model.subModels[i];
            curDrawBatch.visFlags = comp.node.layer;
            curDrawBatch.model = model;
            curDrawBatch.texture = null;
            curDrawBatch.sampler = null;
            curDrawBatch.useLocalData = null;
            if (!depthStencil) { depthStencil = null; }
            curDrawBatch.fillPasses(mat, depthStencil, dssHash, subModel.patches);
            curDrawBatch.inputAssembler = subModel.inputAssembler;
            curDrawBatch.model.visFlags = curDrawBatch.visFlags;
            curDrawBatch.descriptorSet = subModel.descriptorSet;
            this._batches.push(curDrawBatch);
        }
        _stencilManager.enableMask();
    }

    //sync mesh buffer to naive
    public syncMeshBuffersToNative (accId: number, buffers: MeshBuffer[]): void {
        if (JSB) {
            const nativeBuffers = buffers.map((buf) => buf.nativeObj);
            this._nativeObj.syncMeshBuffersToNative(accId, nativeBuffers);
        }
    }
}

class LocalDescriptorSet  {
    private _descriptorSet: DescriptorSet | null = null;
    private _transform: Node | null = null;
    private _textureHash = 0;
    private _samplerHash = 0;
    private _localBuffer: Buffer | null = null;
    private _transformUpdate = true;
    private declare _localData: Float32Array | null;

    public get descriptorSet (): DescriptorSet | null {
        return this._descriptorSet;
    }

    constructor () {
        const device = deviceManager.gfxDevice;
        this._localData = new Float32Array(UBOLocalEnum.COUNT);
        this._localBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            UBOLocalEnum.SIZE,
            UBOLocalEnum.SIZE,
        ));
    }

    public initialize (batch: DrawBatch2D): void {
        const device = deviceManager.gfxDevice;
        this._transform = batch.useLocalData;
        this._textureHash = batch.textureHash;
        this._samplerHash = batch.samplerHash;
        _dsInfo.layout = batch.passes[0].localSetLayout;
        this._descriptorSet = device.createDescriptorSet(_dsInfo);
        this._descriptorSet.bindBuffer(UBOLocal.BINDING, this._localBuffer!);
        const binding = ModelLocalBindings.SAMPLER_SPRITE;
        this._descriptorSet.bindTexture(binding, batch.texture!);
        this._descriptorSet.bindSampler(binding, batch.sampler!);
        this._descriptorSet.update();
        this._transformUpdate = true;
    }

    public updateTransform (transform: Node): void {
        if (transform === this._transform) return;
        this._transform = transform;
        this._transformUpdate = true;
        this.uploadLocalData();
    }

    public equals (transform, textureHash, samplerHash): boolean {
        return this._transform === transform && this._textureHash === textureHash && this._samplerHash === samplerHash;
    }

    public reset (): void {
        this._transform = null;
        this._textureHash = 0;
        this._samplerHash = 0;
    }

    public destroy (): void {
        if (this._localBuffer) {
            this._localBuffer.destroy();
            this._localBuffer = null;
        }

        if (this._descriptorSet) {
            this._descriptorSet.destroy();
            this._descriptorSet = null;
        }

        this._localData = null;
    }

    public isValid (): boolean | null {
        return this._transform && this._transform.isValid;
    }

    public uploadLocalData (): void {
        const node = this._transform!;
        if (node.hasChangedFlags || node.isTransformDirty()) {
            node.updateWorldTransform();
            this._transformUpdate = true;
        }
        if (this._transformUpdate) {
            const worldMatrix = node.worldMatrix;
            Mat4.toArray(this._localData!, worldMatrix, UBOLocalEnum.MAT_WORLD_OFFSET);

            Mat4.invert(m4_1, worldMatrix);
            Mat4.transpose(m4_1, m4_1);

            if (!JSB) {
                // fix precision lost of webGL on android device
                // scale worldIT mat to around 1.0 by product its sqrt of determinant.
                const det = Mat4.determinant(m4_1);
                const factor = 1.0 / Math.sqrt(det);
                Mat4.multiplyScalar(m4_1, m4_1, factor);
            }
            Mat4.toArray(this._localData!, m4_1, UBOLocalEnum.MAT_WORLD_IT_OFFSET);
            this._localBuffer!.update(this._localData!);
            this._transformUpdate = false;
        }
    }
}

class DescriptorSetCache {
    private _descriptorSetCache = new Map<number, DescriptorSet>();
    private _dsCacheHashByTexture = new Map<number, number>();
    private _localDescriptorSetCache: LocalDescriptorSet[] = [];
    private declare _localCachePool: Pool<LocalDescriptorSet>;

    constructor () {
        this._localCachePool = new Pool(() => new LocalDescriptorSet(), 16, (obj) => obj.destroy());
    }

    public getDescriptorSet (batch: DrawBatch2D): DescriptorSet {
        const root = cclegacy.director.root;
        if (batch.useLocalData) {
            const caches = this._localDescriptorSetCache;
            for (let i = 0, len = caches.length; i < len; i++) {
                const cache: LocalDescriptorSet = caches[i];
                if (cache.equals(batch.useLocalData, batch.textureHash, batch.samplerHash)) {
                    return cache.descriptorSet!;
                }
            }
            const localDs = this._localCachePool.alloc();
            localDs.initialize(batch);
            this._localDescriptorSetCache.push(localDs);
            return localDs.descriptorSet!;
        } else {
            const hash = batch.textureHash ^ batch.samplerHash;
            if (this._descriptorSetCache.has(hash)) {
                return this._descriptorSetCache.get(hash)!;
            } else {
                _dsInfo.layout = batch.passes[0].localSetLayout;
                const descriptorSet = deviceManager.gfxDevice.createDescriptorSet(_dsInfo);
                const binding = ModelLocalBindings.SAMPLER_SPRITE;
                descriptorSet.bindTexture(binding, batch.texture!);
                descriptorSet.bindSampler(binding, batch.sampler!);
                descriptorSet.update();

                this._descriptorSetCache.set(hash, descriptorSet);
                this._dsCacheHashByTexture.set(batch.textureHash, hash);

                return descriptorSet;
            }
        }
    }

    public update (): void {
        const caches = this._localDescriptorSetCache;
        const length = caches.length;
        if (length === 0) { return; }
        const uselessArray: number[] = [];
        for (let i = 0; i < length; i++) {
            const value = caches[i];
            if (value.isValid()) {
                value.uploadLocalData();
            } else {
                value.reset();
                const pos = caches.indexOf(value);
                uselessArray.push(pos);
            }
        }
        for (let i = uselessArray.length - 1; i >= 0; i--) {
            const index = uselessArray[i];
            const localDs = caches[index];
            caches.splice(index, 1);
            this._localCachePool.free(localDs);
        }
    }

    public reset (): void {
        const caches = this._localDescriptorSetCache;
        const length = caches.length;
        for (let i = 0; i < length; i++) {
            const value = caches[i];
            this._localCachePool.free(value);
        }
        this._localDescriptorSetCache.length = 0;
    }

    public releaseDescriptorSetCache (textureHash: number): void {
        const key = this._dsCacheHashByTexture.get(textureHash);
        if (key && this._descriptorSetCache.has(key)) {
            this._descriptorSetCache.get(key)!.destroy();
            this._descriptorSetCache.delete(key);
            this._dsCacheHashByTexture.delete(textureHash);
        }
    }

    public destroy (): void {
        for (const value of this._descriptorSetCache.values()) {
            value.destroy();
        }
        this._descriptorSetCache.clear();
        this._dsCacheHashByTexture.clear();
        this._localDescriptorSetCache.length = 0;
        this._localCachePool.destroy();
    }
}

cclegacy.internal.Batcher2D = Batcher2D;
