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

import { Fog } from '../render-scene/scene/fog';
import { Ambient } from '../render-scene/scene/ambient';
import { Skybox } from '../render-scene/scene/skybox';
import { Shadows } from '../render-scene/scene/shadows';
import { Octree } from '../render-scene/scene/octree';
import { IRenderObject } from './define';
import { Device, Framebuffer, InputAssembler, InputAssemblerInfo, Buffer, BufferInfo,
    BufferUsageBit, MemoryUsageBit, Attribute, Format, Shader } from '../gfx';
import { Light } from '../render-scene/scene/light';
import { Material } from '../asset/assets';
import { Pass } from '../render-scene/core/pass';
import { CSMLayers } from './shadow/csm-layers';
import { legacyCC } from '../core/global-exports';
import { Skin } from '../render-scene/scene/skin';
import { Model } from '../render-scene/scene/model';
import { PostSettings } from '../render-scene/scene/post-settings';
import { MeshRenderer } from '../3d/framework/mesh-renderer';
import type { LightProbes } from '../gi/light-probe';

const GEOMETRY_RENDERER_TECHNIQUE_COUNT = 6;

export class PipelineSceneData {
    /**
      * @en Is open HDR.
      * @zh 是否开启 HDR。
      * @readonly
      */
    public get isHDR (): boolean {
        return this._isHDR;
    }

    public set isHDR (val: boolean) {
        this._isHDR = val;
    }
    public get shadingScale (): number {
        return this._shadingScale;
    }

    public set shadingScale (val: number) {
        this._shadingScale = val;
    }

    public get csmSupported (): boolean {
        return this._csmSupported;
    }
    public set csmSupported (val: boolean) {
        this._csmSupported = val;
    }

    /**
     * @engineInternal
     * @en Get the Separable-SSS skin standard model.
     * @zh 获取全局的4s标准模型
     * @returns The model id
     */
    get standardSkinModel (): Model | null { return this._standardSkinModel; }
    set standardSkinModel (val: Model | null) {
        this._standardSkinModel = val;
    }

    /**
     * @engineInternal
     * @en Set the Separable-SSS skin standard model component.
     * @zh 设置一个全局的4s标准模型组件
     * @returns The model id
     */
    get standardSkinMeshRenderer (): MeshRenderer | null { return this._standardSkinMeshRenderer; }
    set standardSkinMeshRenderer (val: MeshRenderer | null) {
        if (this._standardSkinMeshRenderer && this._standardSkinMeshRenderer !== val) {
            this._standardSkinMeshRenderer.clearGlobalStandardSkinObjectFlag();
        }

        this._standardSkinMeshRenderer = val;
        this.standardSkinModel = val ? val.model : null;
    }

    get skinMaterialModel (): Model {
        return this._skinMaterialModel!;
    }
    set skinMaterialModel (val: Model) {
        this._skinMaterialModel = val;
    }

    public fog: Fog = new Fog();
    public ambient: Ambient = new Ambient();
    public skybox: Skybox = new Skybox();
    public shadows: Shadows = new Shadows();
    public csmLayers: CSMLayers = new CSMLayers();
    public octree: Octree = new Octree();
    public skin: Skin = new Skin();
    public postSettings: PostSettings = new PostSettings();
    public lightProbes: LightProbes = legacyCC.internal.LightProbes ? new legacyCC.internal.LightProbes() : null;

    /**
      * @en The list for valid punctual Lights, only available after the scene culling of the current frame.
      * @zh 场景中精确的有效光源，仅在当前帧的场景剔除完成后有效。
      */
    public validPunctualLights: Light[] = [];

    /**
      * @en The list for render objects, only available after the scene culling of the current frame.
      * @zh 渲染对象数组，仅在当前帧的场景剔除完成后有效。
      */
    public renderObjects: IRenderObject[] = [];
    public shadowFrameBufferMap: Map<Light, Framebuffer> = new Map();
    protected declare _device: Device;
    protected _geometryRendererMaterials: Material[] = [];
    protected _geometryRendererPasses: Pass[] = [];
    protected _geometryRendererShaders: Shader[] = [];
    protected _occlusionQueryVertexBuffer: Buffer | null = null;
    protected _occlusionQueryIndicesBuffer: Buffer | null = null;
    protected _occlusionQueryInputAssembler: InputAssembler | null = null;
    protected _occlusionQueryMaterial: Material | null = null;
    protected _occlusionQueryShader: Shader | null = null;
    protected _isHDR = true;
    protected _shadingScale = 1.0;
    protected _csmSupported = true;
    private _standardSkinMeshRenderer: MeshRenderer | null = null;
    private _standardSkinModel: Model | null = null;
    private _skinMaterialModel: Model | null = null;

    constructor () {
        this._shadingScale = 1.0;
    }

    public activate (device: Device): boolean {
        this._device = device;

        this.initGeometryRendererMaterials();
        this.initOcclusionQuery();

        return true;
    }

    public initGeometryRendererMaterials (): void {
        let offset = 0;
        for (let tech = 0; tech < GEOMETRY_RENDERER_TECHNIQUE_COUNT; tech++) {
            this._geometryRendererMaterials[tech] = new Material();
            this._geometryRendererMaterials[tech]._uuid = `geometry-renderer-material-${tech}`;
            this._geometryRendererMaterials[tech].initialize({ effectName: 'internal/builtin-geometry-renderer', technique: tech });

            for (let pass = 0; pass < this._geometryRendererMaterials[tech].passes.length; ++pass) {
                this._geometryRendererPasses[offset] = this._geometryRendererMaterials[tech].passes[pass];
                this._geometryRendererShaders[offset] = this._geometryRendererMaterials[tech].passes[pass].getShaderVariant()!;
                offset++;
            }
        }
    }

    public get geometryRendererPasses (): Pass[] {
        return this._geometryRendererPasses;
    }

    public get geometryRendererShaders (): Shader[] {
        return this._geometryRendererShaders;
    }

    public initOcclusionQuery (): void {
        if (!this._occlusionQueryInputAssembler) {
            this._occlusionQueryInputAssembler = this._createOcclusionQueryIA();
        }

        if (!this._occlusionQueryMaterial) {
            const mat = new Material();
            mat._uuid = 'default-occlusion-query-material';
            mat.initialize({ effectName: 'internal/builtin-occlusion-query' });
            this._occlusionQueryMaterial = mat;
            if (mat.passes.length > 0) {
                this._occlusionQueryShader = mat.passes[0].getShaderVariant();
            }
        }
    }

    public getOcclusionQueryPass (): Pass | null {
        if (this._occlusionQueryMaterial && this._occlusionQueryMaterial.passes.length > 0) {
            return this._occlusionQueryMaterial.passes[0];
        }

        return null;
    }

    public updatePipelineSceneData (): void {
    }

    public destroy (): void {
        this.shadows.destroy();
        this.csmLayers.destroy();
        this.validPunctualLights.length = 0;
        this._occlusionQueryInputAssembler?.destroy();
        this._occlusionQueryInputAssembler = null;
        this._occlusionQueryVertexBuffer?.destroy();
        this._occlusionQueryVertexBuffer = null;
        this._occlusionQueryIndicesBuffer?.destroy();
        this._occlusionQueryIndicesBuffer = null;
        this._standardSkinMeshRenderer = null;
        this._standardSkinModel = null;
        this._skinMaterialModel = null;
    }

    private _createOcclusionQueryIA (): InputAssembler {
        // create vertex buffer
        const device = this._device;
        const vertices = new Float32Array([-1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1]);
        const vbStride = Float32Array.BYTES_PER_ELEMENT * 3;
        const vbSize = vbStride * 8;
        this._occlusionQueryVertexBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));
        this._occlusionQueryVertexBuffer.update(vertices);

        // create index buffer
        const indices = new Uint16Array([0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 1, 3, 7, 1, 7, 5, 0, 4, 6, 0, 6, 2, 0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3]);
        const ibStride = Uint16Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 36;
        this._occlusionQueryIndicesBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));
        this._occlusionQueryIndicesBuffer.update(indices);

        const attributes: Attribute[] = [
            new Attribute('a_position', Format.RGB32F),
        ];

        // create cube input assembler
        const info = new InputAssemblerInfo(attributes, [this._occlusionQueryVertexBuffer], this._occlusionQueryIndicesBuffer);
        const inputAssembler = device.createInputAssembler(info);

        return inputAssembler;
    }
}
