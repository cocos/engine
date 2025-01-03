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

import { RenderingSubMesh } from '../../asset/assets/rendering-sub-mesh';
import { RenderPriority, UNIFORM_REFLECTION_TEXTURE_BINDING, UNIFORM_REFLECTION_STORAGE_BINDING,
    INST_MAT_WORLD, INST_SH, isEnableEffect,
    UBOSHEnum } from '../../rendering/define';
import { BatchingSchemes, IMacroPatch, Pass } from '../core/pass';
import { DescriptorSet, DescriptorSetInfo, Device, InputAssembler, Texture, TextureType, TextureUsageBit, TextureInfo,
    Format, Sampler, Filter, Address, Shader, SamplerInfo, deviceManager,
    Attribute, Feature, FormatInfos, getTypedArrayConstructor } from '../../gfx';
import { errorID, Mat4, cclegacy } from '../../core';
import { getPhaseID } from '../../rendering/pass-phase';
import { Root } from '../../root';

const _dsInfo = new DescriptorSetInfo(null!);
const MAX_PASS_COUNT = 8;

export interface IInstancedAttributeBlock {
    buffer: Uint8Array;
    views: TypedArray[];
    attributes: Attribute[];
}

/**
 * @en A sub part of the model, it describes how to render a specific sub mesh.
 * It contains geometry information in [[RenderingSubMesh]] and all sort of rendering configuration like shaders, macro patches, passes etc.
 * @zh 组成模型对象的子模型，它用来描述如何渲染模型的一个子网格。
 * 它包含 [[RenderingSubMesh]] 代表的几何网格信息和所有渲染需要的数据，比如着色器程序，着色器宏定义，渲染 pass，等。
 */
export class SubModel {
    protected _device: Device | null = null;
    protected _passes: Pass[] | null = null;
    protected _shaders: Shader[] | null = null;
    protected _subMesh: RenderingSubMesh | null = null;
    protected _patches: IMacroPatch[] | null = null;
    protected _priority: RenderPriority = RenderPriority.DEFAULT;
    protected _inputAssembler: InputAssembler | null = null;
    protected _descriptorSet: DescriptorSet | null = null;
    protected _worldBoundDescriptorSet: DescriptorSet | null = null;
    protected _reflectionTex: Texture | null = null;
    protected _reflectionSampler: Sampler | null = null;
    protected _instancedAttributeBlock: IInstancedAttributeBlock = { buffer: null!, views: [], attributes: [] };
    protected _instancedWorldMatrixIndex = -1;
    protected _instancedSHIndex = -1;
    protected _useReflectionProbeType = 0;

    constructor () {}

    /**
     * @en
     * sub model's passes
     * @zh
     * 子模型的 passes
     * @param passes @en The passes @zh 设置的 passes
     */
    /**
     * @en Render passes for the sub-model
     * @zh 子模型的渲染 pass
     */
    set passes (passes) {
        const passLengh = passes.length;
        if (passLengh > MAX_PASS_COUNT) {
            errorID(12004, MAX_PASS_COUNT);
            return;
        }
        this._passes = passes;
        this._flushPassInfo();

        // DS layout might change too
        if (this._descriptorSet) {
            this._descriptorSet.destroy();
            _dsInfo.layout = passes[0].localSetLayout;
            this._descriptorSet = this._device!.createDescriptorSet(_dsInfo);
        }
    }

    get passes (): Pass[] {
        return this._passes!;
    }

    /**
     * @en Shaders for the sub-model, each shader corresponds to one of the [[passes]]
     * @zh 子模型的着色器程序列表，每个着色器程序对应其中一个渲染 [[passes]]
     */
    get shaders (): Shader[] {
        return this._shaders!;
    }

    /**
     * @en The rendering sub mesh for the sub-model, each sub-model can only have one sub mesh.
     * @zh 用于渲染的子网格对象，每个子模型只能包含一个子网格。
     */
    set subMesh (subMesh) {
        this._inputAssembler!.destroy();
        this._inputAssembler = this._device!.createInputAssembler(subMesh.iaInfo);
        this._subMesh = subMesh;
    }

    get subMesh (): RenderingSubMesh {
        return this._subMesh!;
    }

    /**
     * @en The rendering priority of the sub-model
     * @zh 子模型的渲染优先级
     */
    set priority (val) {
        this._priority = val;
    }

    get priority (): RenderPriority {
        return this._priority;
    }

    /**
     * @en The low level input assembler which contains geometry data
     * @zh 底层渲染用的输入汇集器，包含几何信息
     */
    get inputAssembler (): InputAssembler {
        return this._inputAssembler!;
    }

    /**
     * @en The descriptor set used for sub-model rendering
     * @zh 底层渲染子模型用的描述符集组
     */
    get descriptorSet (): DescriptorSet {
        return this._descriptorSet!;
    }

    /**
     * @en The descriptor set for world bound
     * @zh 用于存储世界包围盒的描述符集组
     */
    get worldBoundDescriptorSet (): DescriptorSet | null {
        return this._worldBoundDescriptorSet;
    }

    /**
     * @en The macro patches for the shaders
     * @zh 着色器程序所用的宏定义组合
     */
    get patches (): Readonly<IMacroPatch[] | null> {
        return this._patches;
    }

    /**
     * @en The instance attribute block, access by sub model
     * @zh 硬件实例化属性，通过子模型访问
     */
    get instancedAttributeBlock (): IInstancedAttributeBlock {
        return this._instancedAttributeBlock;
    }

    /**
     * @en Get or set instance matrix id, access by sub model
     * @zh 获取或者设置硬件实例化中的矩阵索引，通过子模型访问
     */
    set instancedWorldMatrixIndex (val: number) {
        this._instancedWorldMatrixIndex = val;
    }
    get instancedWorldMatrixIndex (): number {
        return this._instancedWorldMatrixIndex;
    }

    /**
     * @en Get or set instance SH id, access by sub model
     * @zh 获取或者设置硬件实例化中的球谐索引，通过子模型访问
     */
    set instancedSHIndex (val: number) {
        this._instancedSHIndex = val;
    }
    get instancedSHIndex (): number {
        return this._instancedSHIndex;
    }

    /**
     * @en Gets or sets the type of reflection probe, Used to process instance
     * @zh 获取或设置使用反射探针的类型，用于处理instance
     */
    set useReflectionProbeType (val) {
        this._useReflectionProbeType = val;
    }
    get useReflectionProbeType (): number {
        return this._useReflectionProbeType;
    }

    /**
     * @en
     * init sub model
     * @zh
     * 子模型初始化
     * @param subMesh @en The sub mesh @zh 子网格资源
     * @param passes @en The passes @zh 渲染的 passes
     * @param patches @en The shader's macro @zh 着色器的宏定义
     */
    public initialize (subMesh: RenderingSubMesh, passes: Pass[], patches: IMacroPatch[] | null = null): void {
        const root = cclegacy.director.root as Root;
        this._device = deviceManager.gfxDevice;
        _dsInfo.layout = passes[0].localSetLayout;

        this._inputAssembler = this._device.createInputAssembler(subMesh.iaInfo);
        this._descriptorSet = this._device.createDescriptorSet(_dsInfo);

        const pipeline = (cclegacy.director.root as Root).pipeline;
        const occlusionPass = pipeline.pipelineSceneData.getOcclusionQueryPass();
        if (occlusionPass) {
            const occlusionDSInfo = new DescriptorSetInfo(null!);
            occlusionDSInfo.layout = occlusionPass.localSetLayout;
            this._worldBoundDescriptorSet = this._device.createDescriptorSet(occlusionDSInfo);
        }

        this._subMesh = subMesh;
        this._patches = patches ? patches.sort() : null;
        this._passes = passes;

        this._flushPassInfo();

        this.priority = RenderPriority.DEFAULT;
        const r = cclegacy.rendering;
        // initialize resources for reflection material
        if (((!r || !r.enableEffectImport) && passes[0].phase === getPhaseID('reflection'))
        || (isEnableEffect() && passes[0].phaseID === r.getPhaseID(r.getPassID('default'), 'reflection'))) {
            let texWidth = root.mainWindow!.width;
            let texHeight = root.mainWindow!.height;
            const minSize = 512;

            if (texHeight < texWidth) {
                texWidth = minSize * texWidth / texHeight;
                texHeight = minSize;
            } else {
                texWidth = minSize;
                texHeight = minSize * texHeight / texWidth;
            }

            this._reflectionTex = this._device.createTexture(new TextureInfo(
                TextureType.TEX2D,
                TextureUsageBit.STORAGE | TextureUsageBit.TRANSFER_SRC | TextureUsageBit.SAMPLED,
                Format.RGBA8,
                texWidth,
                texHeight,
            ));

            this.descriptorSet.bindTexture(UNIFORM_REFLECTION_TEXTURE_BINDING, this._reflectionTex);

            this._reflectionSampler = this._device.getSampler(new SamplerInfo(
                Filter.LINEAR,
                Filter.LINEAR,
                Filter.NONE,
                Address.CLAMP,
                Address.CLAMP,
                Address.CLAMP,
            ));
            this.descriptorSet.bindSampler(UNIFORM_REFLECTION_TEXTURE_BINDING, this._reflectionSampler);
            this.descriptorSet.bindTexture(UNIFORM_REFLECTION_STORAGE_BINDING, this._reflectionTex);
        }
    }

    /**
     * @en
     * destroy sub model
     * @zh
     * 销毁子模型
     */
    public destroy (): void {
        this._descriptorSet!.destroy();
        this._descriptorSet = null;

        this._inputAssembler!.destroy();
        this._inputAssembler = null;

        this._worldBoundDescriptorSet?.destroy();
        this._worldBoundDescriptorSet = null;

        this.priority = RenderPriority.DEFAULT;

        this._patches = null;
        this._subMesh = null;

        this._passes = null;
        this._shaders = null;

        if (this._reflectionTex) this._reflectionTex.destroy();
        this._reflectionTex = null;
        this._reflectionSampler = null;
    }

    /**
     * @en
     * update sub model
     * @zh
     * 更新子模型
     */
    public update (): void {
        for (let i = 0; i < this._passes!.length; ++i) {
            const pass = this._passes![i];
            pass.update();
        }
        this._descriptorSet!.update();
        this._worldBoundDescriptorSet?.update();
    }

    /**
     * @en Pipeline changed callback
     * @zh 管线更新回调
     */
    public onPipelineStateChanged (): void {
        const passes = this._passes;
        if (!passes) { return; }

        for (let i = 0; i < passes.length; i++) {
            const pass = passes[i];
            pass.beginChangeStatesSilently();
            pass.tryCompile(); // force update shaders
            pass.endChangeStatesSilently();
        }

        this._flushPassInfo();
    }

    /**
     * @en Shader macro changed callback
     * @zh Shader 宏更新回调
     */
    public onMacroPatchesStateChanged (patches: IMacroPatch[] | null): void {
        if (!patches && !this._patches) {
            return;
        } else if (patches) {
            patches = patches.sort();
            // Sorting on shorter patches outperforms hashing, with negative optimization on longer global patches.
            if (this._patches && patches.length === this._patches.length) {
                const patchesStateUnchanged = JSON.stringify(patches) === JSON.stringify(this._patches);
                if (patchesStateUnchanged) return;
            }
        }
        this._patches = patches;

        const passes = this._passes;
        if (!passes) { return; }

        for (let i = 0; i < passes.length; i++) {
            const pass = passes[i];
            pass.beginChangeStatesSilently();
            pass.tryCompile(); // force update shaders
            pass.endChangeStatesSilently();
        }

        this._flushPassInfo();
    }

    /**
     * @en
     * geometry changed callback
     * @zh
     * 几何数据改变后的回调
     */
    public onGeometryChanged (): void {
        if (!this._subMesh) {
            return;
        }

        // update draw info
        const drawInfo = this._subMesh.drawInfo;

        // to invoke getter/setter function for wasm object
        if (this._inputAssembler && drawInfo) {
            const dirtyDrawInfo = this._inputAssembler.drawInfo;
            Object.keys(drawInfo).forEach((key): void => {
                dirtyDrawInfo[key] = drawInfo[key];
            });
            this._inputAssembler.drawInfo = dirtyDrawInfo;
        }
    }

    /**
     * @en
     * get instanced attribute index
     * @zh
     * 获取硬件实例化相关索引
     */
    /**
     * @internal
     */
    public getInstancedAttributeIndex (name: string): number {
        const { attributes } = this.instancedAttributeBlock;
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name === name) { return i; }
        }
        return -1;
    }

    /**
     * @en
     * update instancing related data, invoked by model
     * @zh
     * 更新硬件实例化相关数据，一般由model调用
     */
    /**
     * @internal
     */
    public updateInstancedWorldMatrix (mat: Mat4, idx: number): void {
        const attrs = this.instancedAttributeBlock.views;
        const v1 = attrs[idx];
        const v2 = attrs[idx + 1];
        const v3 = attrs[idx + 2];
        v1[0] = mat.m00; v1[1] = mat.m01; v1[2] = mat.m02; v1[3] = mat.m12;
        v2[0] = mat.m04; v2[1] = mat.m05; v2[2] = mat.m06; v2[3] = mat.m13;
        v3[0] = mat.m08; v3[1] = mat.m09; v3[2] = mat.m10; v3[3] = mat.m14;
    }

    /**
     * @en
     * update instancing SH data, invoked by model
     * @zh
     * 更新硬件实例化球谐数据，一般由model调用
     */
    /**
     * @internal
     */
    public updateInstancedSH (data: Float32Array, idx: number): void {
        const attrs = this.instancedAttributeBlock.views;
        const count = (UBOSHEnum.SH_QUADRATIC_R_OFFSET - UBOSHEnum.SH_LINEAR_CONST_R_OFFSET) / 4;
        let offset = 0;

        for (let i = idx; i < idx + count; i++) {
            for (let k = 0; k < 4; k++) {
                attrs[i][k] = data[offset++];
            }
        }
    }

    /**
     * @en
     * update instancing related data, invoked by model
     * @zh
     * 更新硬件实例化相关数据，一般由model调用
     */
    /**
     * @internal
     */
    public UpdateInstancedAttributes (attributes: Attribute[]): void {
        // initialize subModelWorldMatrixIndex
        this.instancedWorldMatrixIndex = -1;
        this.instancedSHIndex = -1;

        const pass = this.passes[0];
        if (!pass.device.hasFeature(Feature.INSTANCED_ARRAYS)) { return; }
        // free old data

        let size = 0;
        for (let j = 0; j < attributes.length; j++) {
            const attribute = attributes[j];
            if (!attribute.isInstanced) { continue; }
            size += FormatInfos[attribute.format].size;
        }

        const attrs = this.instancedAttributeBlock;
        attrs.buffer = new Uint8Array(size);
        attrs.views.length = attrs.attributes.length = 0;
        let offset = 0;
        for (let j = 0; j < attributes.length; j++) {
            const attribute = attributes[j];
            if (!attribute.isInstanced) { continue; }
            const attr = new Attribute();
            attr.format = attribute.format;
            attr.name = attribute.name;
            attr.isNormalized = attribute.isNormalized;
            attr.location = attribute.location;
            attrs.attributes.push(attr);

            const info = FormatInfos[attribute.format];

            const typeViewArray = new (getTypedArrayConstructor(info))(attrs.buffer.buffer, offset, info.count);
            attrs.views.push(typeViewArray);
            offset += info.size;
        }
        if (pass.batchingScheme === BatchingSchemes.INSTANCING) { pass.getInstancedBuffer().destroy(); } // instancing IA changed
        this.instancedWorldMatrixIndex = this.getInstancedAttributeIndex(INST_MAT_WORLD);
        this.instancedSHIndex = this.getInstancedAttributeIndex(INST_SH);
    }

    protected _flushPassInfo (): void {
        const passes = this._passes;
        if (!passes) { return; }
        if (!this._shaders) { this._shaders = []; }

        this._shaders.length = passes.length;
        for (let i = 0, len = passes.length; i < len; i++) {
            this._shaders[i] = passes[i].getShaderVariant(this.patches)!;
        }
    }
}
