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

import {
    AttributeName, Buffer, BufferUsageBit, Device, MemoryUsageBit, DescriptorSet, BufferInfo, FormatFeatureBit, Format, Texture, Sampler,
} from '../../gfx';
import { Mesh } from './mesh';
import { Texture2D } from '../../asset/assets/texture-2d';
import { ImageAsset } from '../../asset/assets/image-asset';
import { UBOMorph, UBOMorphEnum, UNIFORM_NORMAL_MORPH_TEXTURE_BINDING,
    UNIFORM_POSITION_MORPH_TEXTURE_BINDING, UNIFORM_TANGENT_MORPH_TEXTURE_BINDING } from '../../rendering/define';
import { Morph, SubMeshMorph } from './morph';
import { assertIsNonNullable, assertIsTrue, warn, bits, nextPow2, cclegacy, warnID } from '../../core';
import { IMacroPatch } from '../../render-scene';
import { TextureFilter, PixelFormat, WrapMode } from '../../asset/assets/asset-enum';

/**
 * True if force to use cpu computing based sub-mesh rendering.
 * Only customizable by modify the internal engine code.
 */
const preferCpuComputing = false;

/**
 * @en Interface for classes which control the rendering of morph resources.
 * @zh 支持形变网格渲染的基类。
 */
export interface MorphRendering {
    createInstance (): MorphRenderingInstance;
}

/**
 * @en The instance of [[MorphRendering]] for dedicated control in the mesh renderer.
 * The root [[MorphRendering]] is owned by [[Mesh]] asset, each [[MeshRenderer]] can have its own morph rendering instance.
 * @zh 用于网格渲染器中独立控制 [[MorphRendering]] 的实例。原始 [[MorphRendering]] 被 [[Mesh]] 资源持有，每个 [[MeshRenderer]] 都持有自己的形变网格渲染实例。
 */
export interface MorphRenderingInstance {
    /**
     * Sets weights of targets of specified sub mesh.
     * @param subMeshIndex
     * @param weights
     */
    setWeights (subMeshIndex: number, weights: number[]): void;

    /**
     * Adapts pipeline state to do the rendering.
     * @param subMeshIndex
     * @param pipelineState
     */
    adaptPipelineState (subMeshIndex: number, descriptorSet: DescriptorSet): void;

    /**
     * Acquire the define overrides needed to do the rendering.
     */
    requiredPatches (subMeshIndex: number): IMacroPatch[] | null;

    /**
     * Destroy the rendering instance.
     */
    destroy (): void;
}

/**
 * @en Create morph rendering from mesh which contains morph targets data.
 * @zh 从包含形变对象的网格资源中创建形变网格渲染对象。
 * @param mesh @en The mesh to create morph rendering from. @zh 用于创建形变网格渲染对象的原始网格资源。
 * @param gfxDevice @en The device instance acquired from [[Root]]. @zh 设备对象实例，可以从 [[Root]] 获取。
 */
export function createMorphRendering (mesh: Mesh, gfxDevice: Device): MorphRendering {
    return new StdMorphRendering(mesh, gfxDevice);
}

/**
 * @en Standard morph rendering class, it supports both GPU and CPU based morph blending.
 * If sub mesh morph targets count is less than [[pipeline.UBOMorphEnum.MAX_MORPH_TARGET_COUNT]], then GPU based blending is enabled.
 * Each of the sub-mesh morph has its own [[MorphRenderingInstance]],
 * its morph target weights, render pipeline state and strategy of morph blending are controlled separately.
 * @zh 标准形变网格渲染类，它同时支持 CPU 和 GPU 的形变混合计算。
 * 如果子网格形变目标数量少于 [[pipeline.UBOMorphEnum.MAX_MORPH_TARGET_COUNT]]，那么就会使用基于 GPU 的形变混合计算。
 * 每个子网格形变都使用自己独立的 [[MorphRenderingInstance]]，它的形变目标权重、渲染管线状态和形变混合计算策略都是独立控制的。
 */
export class StdMorphRendering implements MorphRendering {
    private declare _mesh: Mesh;
    private _subMeshRenderings: (SubMeshMorphRendering | null)[] = [];

    constructor (mesh: Mesh, gfxDevice: Device) {
        this._mesh = mesh;
        if (!this._mesh.struct.morph) {
            return;
        }

        const nSubMeshes = this._mesh.struct.primitives.length;
        this._subMeshRenderings = new Array(nSubMeshes).fill(null);
        for (let iSubMesh = 0; iSubMesh < nSubMeshes; ++iSubMesh) {
            const subMeshMorph = this._mesh.struct.morph.subMeshMorphs[iSubMesh];
            if (!subMeshMorph) {
                continue;
            }

            if (preferCpuComputing || subMeshMorph.targets.length > UBOMorphEnum.MAX_MORPH_TARGET_COUNT) {
                this._subMeshRenderings[iSubMesh] = new CpuComputing(
                    this._mesh,
                    iSubMesh,
                    this._mesh.struct.morph,
                    gfxDevice,
                );
            } else {
                this._subMeshRenderings[iSubMesh] = new GpuComputing(
                    this._mesh,
                    iSubMesh,
                    this._mesh.struct.morph,
                    gfxDevice,
                );
            }
        }
    }

    public createInstance (): MorphRenderingInstance {
        const nSubMeshes = this._mesh.struct.primitives.length;
        const subMeshInstances: (SubMeshMorphRenderingInstance | null)[] = new Array(nSubMeshes);
        for (let iSubMesh = 0; iSubMesh < nSubMeshes; ++iSubMesh) {
            subMeshInstances[iSubMesh] = this._subMeshRenderings[iSubMesh]?.createInstance() ?? null;
        }
        return {
            setWeights (subMeshIndex: number, weights: number[]): void {
                subMeshInstances[subMeshIndex]?.setWeights(weights);
            },

            requiredPatches: (subMeshIndex: number): IMacroPatch[] | null => {
                assertIsNonNullable(this._mesh.struct.morph);
                const subMeshMorph = this._mesh.struct.morph.subMeshMorphs[subMeshIndex];
                const subMeshRenderingInstance = subMeshInstances[subMeshIndex];
                if (subMeshRenderingInstance === null) {
                    return null;
                }
                assertIsNonNullable(subMeshMorph);
                const patches: IMacroPatch[] = [
                    { name: 'CC_USE_MORPH', value: true },
                    { name: 'CC_MORPH_TARGET_COUNT', value: subMeshMorph.targets.length },
                ];
                if (subMeshMorph.attributes.includes(AttributeName.ATTR_POSITION)) {
                    patches.push({ name: 'CC_MORPH_TARGET_HAS_POSITION', value: true });
                }
                if (subMeshMorph.attributes.includes(AttributeName.ATTR_NORMAL)) {
                    patches.push({ name: 'CC_MORPH_TARGET_HAS_NORMAL', value: true });
                }
                if (subMeshMorph.attributes.includes(AttributeName.ATTR_TANGENT)) {
                    patches.push({ name: 'CC_MORPH_TARGET_HAS_TANGENT', value: true });
                }
                patches.push(...subMeshRenderingInstance.requiredPatches());
                return patches;
            },

            adaptPipelineState: (subMeshIndex: number, descriptorSet: DescriptorSet): void => {
                subMeshInstances[subMeshIndex]?.adaptPipelineState(descriptorSet);
            },

            destroy: (): void => {
                subMeshInstances.forEach((subMeshInstance) => {
                    if (subMeshInstance) subMeshInstance.destroy();
                });
            },
        };
    }
}

/**
 * @en Sub-mesh morph rendering describes how to render a sub-mesh morph.
 * @zh 子网格形变渲染定义如何渲染一个子网格形变。
 */
interface SubMeshMorphRendering {
    /**
     * Creates a rendering instance.
     */
    createInstance (): SubMeshMorphRenderingInstance;
}

/**
 * @en The instance of sub-mesh morph rendering, each sub-mesh have its own instance
 * for controlling its morph target weights, render pipeline state and strategy of morph blending.
 * @zh 子网格形变渲染的实例，每个子网格都拥有自己独立的子网格形变渲染实例，用于独立控制形变目标权重、渲染管线状态和形变混合计算策略。
 */
interface SubMeshMorphRenderingInstance {
    /**
     * Set weights of each morph target.
     * @param weights The weights.
     */
    setWeights (weights: number[]): void;

    /**
     * Asks the define overrides needed to do the rendering.
     */
    requiredPatches (): IMacroPatch[];

    /**
     * Adapts the pipelineState to apply the rendering.
     * @param pipelineState
     */
    adaptPipelineState (descriptorSet: DescriptorSet): void;

    /**
     * Destroy this instance.
     */
    destroy (): void;
}

/**
 * (General purpose) Gpu computing based sub-mesh morph rendering.
 * This technique computes final attribute displacements on GPU.
 * Target displacements of each attribute are transferred through vertex texture, say, morph texture.
 */
class GpuComputing implements SubMeshMorphRendering {
    private declare _gfxDevice: Device;
    private declare _subMeshMorph: SubMeshMorph;
    private declare _textureInfo: {
        width: number;
        height: number;
    };
    private declare _attributes: {
        name: string;
        morphTexture: MorphTexture;
    }[];
    private declare _verticesCount: number;

    constructor (mesh: Mesh, subMeshIndex: number, morph: Morph, gfxDevice: Device) {
        this._gfxDevice = gfxDevice;
        const subMeshMorph = morph.subMeshMorphs[subMeshIndex];
        assertIsNonNullable(subMeshMorph);
        this._subMeshMorph = subMeshMorph;

        enableVertexId(mesh, subMeshIndex, gfxDevice);

        const nVertices = mesh.struct.vertexBundles[mesh.struct.primitives[subMeshIndex].vertexBundelIndices[0]].view.count;
        this._verticesCount = nVertices;
        const nTargets = subMeshMorph.targets.length;
        const vec4Required = nVertices * nTargets;

        const vec4TextureFactory = createVec4TextureFactory(gfxDevice, vec4Required);
        this._textureInfo = {
            width: vec4TextureFactory.width,
            height: vec4TextureFactory.height,
        };

        // Creates texture for each attribute.
        this._attributes = subMeshMorph.attributes.map((attributeName, attributeIndex) => {
            const vec4Tex = vec4TextureFactory.create();
            const valueView = vec4Tex.valueView;
            // if (DEV) { // Make it easy to view texture in profilers...
            //     for (let i = 0; i < valueView.length / 4; ++i) {
            //         valueView[i * 4 + 3] = 1.0;
            //     }
            // }
            subMeshMorph.targets.forEach((morphTarget, morphTargetIndex) => {
                const displacementsView = morphTarget.displacements[attributeIndex];
                const displacements = new Float32Array(mesh.data.buffer, mesh.data.byteOffset + displacementsView.offset, displacementsView.count);
                const displacementsOffset = (nVertices * morphTargetIndex) * 4;
                for (let iVertex = 0; iVertex < nVertices; ++iVertex) {
                    valueView[displacementsOffset + 4 * iVertex + 0] = displacements[3 * iVertex + 0];
                    valueView[displacementsOffset + 4 * iVertex + 1] = displacements[3 * iVertex + 1];
                    valueView[displacementsOffset + 4 * iVertex + 2] = displacements[3 * iVertex + 2];
                }
            });
            vec4Tex.updatePixels();
            return {
                name: attributeName,
                morphTexture: vec4Tex,
            };
        });
    }

    public destroy (): void {
        this._attributes.forEach((attribute) => {
            attribute.morphTexture.destroy();
        });
    }

    public createInstance (): {
        setWeights: (weights: number[]) => void;
        requiredPatches: () => IMacroPatch[];
        adaptPipelineState: (descriptorSet: DescriptorSet) => void;
        destroy: () => void;
        } {
        const morphUniforms = new MorphUniforms(this._gfxDevice, this._subMeshMorph.targets.length);
        morphUniforms.setMorphTextureInfo(this._textureInfo.width, this._textureInfo.height);
        morphUniforms.setVerticesCount(this._verticesCount);
        morphUniforms.commit();
        return {
            setWeights: (weights: number[]): void => {
                morphUniforms.setWeights(weights);
                morphUniforms.commit();
            },

            requiredPatches: (): IMacroPatch[] => [{ name: 'CC_MORPH_TARGET_USE_TEXTURE', value: true }],

            adaptPipelineState: (descriptorSet: DescriptorSet): void => {
                for (let i = 0; i < this._attributes.length; ++i) {
                    const attribute = this._attributes[i];
                    let binding: number | undefined;
                    switch (attribute.name) {
                    case AttributeName.ATTR_POSITION: binding = UNIFORM_POSITION_MORPH_TEXTURE_BINDING; break;
                    case AttributeName.ATTR_NORMAL: binding = UNIFORM_NORMAL_MORPH_TEXTURE_BINDING; break;
                    case AttributeName.ATTR_TANGENT: binding = UNIFORM_TANGENT_MORPH_TEXTURE_BINDING; break;
                    default:
                        warnID(16374); break;
                    }
                    if (binding !== undefined) {
                        descriptorSet.bindSampler(binding, attribute.morphTexture.sampler);
                        descriptorSet.bindTexture(binding, attribute.morphTexture.texture);
                    }
                }
                descriptorSet.bindBuffer(UBOMorph.BINDING, morphUniforms.buffer);
                descriptorSet.update();
            },

            destroy: (): void => {

            },
        };
    }
}

/**
 * Cpu computing based sub-mesh morph rendering.
 * This technique computes final attribute displacements on CPU.
 * The displacements, then, are passed to GPU.
 */
class CpuComputing implements SubMeshMorphRendering {
    private declare _gfxDevice: Device;
    private _attributes: {
        name: string;
        targets: {
            displacements: Float32Array;
        }[];
    }[] = [];

    constructor (mesh: Mesh, subMeshIndex: number, morph: Morph, gfxDevice: Device) {
        this._gfxDevice = gfxDevice;
        const subMeshMorph = morph.subMeshMorphs[subMeshIndex];
        assertIsNonNullable(subMeshMorph);
        enableVertexId(mesh, subMeshIndex, gfxDevice);
        this._attributes = subMeshMorph.attributes.map((attributeName, attributeIndex) =>  ({
            name: attributeName,
            targets: subMeshMorph.targets.map((attributeDisplacement) => ({
                displacements: new Float32Array(
                    mesh.data.buffer,
                    mesh.data.byteOffset + attributeDisplacement.displacements[attributeIndex].offset,
                    attributeDisplacement.displacements[attributeIndex].count,
                ),
            })),
        }));
    }

    /**
     * DO NOT use this field.
     */
    get data (): {
        name: string;
        targets: {
            displacements: Float32Array;
        }[];
    }[] {
        return this._attributes;
    }

    public createInstance (): CpuComputingRenderingInstance {
        return new CpuComputingRenderingInstance(
            this,
            this._attributes[0].targets[0].displacements.length / 3,
            this._gfxDevice,
        );
    }
}
class CpuComputingRenderingInstance implements SubMeshMorphRenderingInstance {
    private declare _attributes: {
        attributeName: string;
        morphTexture: MorphTexture;
    }[];
    private declare _owner: CpuComputing;
    private declare _morphUniforms: MorphUniforms;

    public constructor (owner: CpuComputing, nVertices: number, gfxDevice: Device) {
        this._owner = owner;
        this._morphUniforms = new MorphUniforms(gfxDevice, 0 /* TODO? */);

        const vec4TextureFactory = createVec4TextureFactory(gfxDevice, nVertices);
        this._morphUniforms.setMorphTextureInfo(vec4TextureFactory.width, vec4TextureFactory.height);
        this._morphUniforms.commit();

        this._attributes = this._owner.data.map((attributeMorph, attributeIndex) => {
            const morphTexture = vec4TextureFactory.create();
            return {
                attributeName: attributeMorph.name,
                morphTexture,
            };
        });
    }

    public setWeights (weights: number[]): void {
        for (let iAttribute = 0; iAttribute < this._attributes.length; ++iAttribute) {
            const myAttribute = this._attributes[iAttribute];
            const valueView = myAttribute.morphTexture.valueView;
            const attributeMorph = this._owner.data[iAttribute];
            assertIsTrue(weights.length === attributeMorph.targets.length);
            for (let iTarget = 0; iTarget < attributeMorph.targets.length; ++iTarget) {
                const targetDisplacements = attributeMorph.targets[iTarget].displacements;
                const weight = weights[iTarget];
                const nVertices = targetDisplacements.length / 3;
                if (iTarget === 0) {
                    for (let iVertex = 0; iVertex < nVertices; ++iVertex) {
                        valueView[4 * iVertex + 0] = targetDisplacements[3 * iVertex + 0] * weight;
                        valueView[4 * iVertex + 1] = targetDisplacements[3 * iVertex + 1] * weight;
                        valueView[4 * iVertex + 2] = targetDisplacements[3 * iVertex + 2] * weight;
                    }
                } else if (weight !== 0.0) {
                    for (let iVertex = 0; iVertex < nVertices; ++iVertex) {
                        valueView[4 * iVertex + 0] += targetDisplacements[3 * iVertex + 0] * weight;
                        valueView[4 * iVertex + 1] += targetDisplacements[3 * iVertex + 1] * weight;
                        valueView[4 * iVertex + 2] += targetDisplacements[3 * iVertex + 2] * weight;
                    }
                }
            }

            myAttribute.morphTexture.updatePixels();
        }
    }

    public requiredPatches (): IMacroPatch[] {
        return [
            { name: 'CC_MORPH_TARGET_USE_TEXTURE', value: true },
            { name: 'CC_MORPH_PRECOMPUTED', value: true },
        ];
    }

    public adaptPipelineState (descriptorSet: DescriptorSet): void {
        for (let i = 0; i < this._attributes.length; ++i) {
            const attribute = this._attributes[i];
            const attributeName = attribute.attributeName;
            let binding: number | undefined;
            switch (attributeName) {
            case AttributeName.ATTR_POSITION: binding = UNIFORM_POSITION_MORPH_TEXTURE_BINDING; break;
            case AttributeName.ATTR_NORMAL: binding = UNIFORM_NORMAL_MORPH_TEXTURE_BINDING; break;
            case AttributeName.ATTR_TANGENT: binding = UNIFORM_TANGENT_MORPH_TEXTURE_BINDING; break;
            default:
                warnID(16374); break;
            }
            if (binding !== undefined) {
                descriptorSet.bindSampler(binding, attribute.morphTexture.sampler);
                descriptorSet.bindTexture(binding, attribute.morphTexture.texture);
            }
        }
        descriptorSet.bindBuffer(UBOMorph.BINDING, this._morphUniforms.buffer);
        descriptorSet.update();
    }

    public destroy (): void {
        this._morphUniforms.destroy();
        for (let iAttribute = 0; iAttribute < this._attributes.length; ++iAttribute) {
            const myAttribute = this._attributes[iAttribute];
            myAttribute.morphTexture.destroy();
        }
    }
}

/**
 * Provides the access to morph related uniforms.
 */
class MorphUniforms {
    private declare _targetCount: number;
    private declare _localBuffer: DataView;
    private declare _remoteBuffer: Buffer;

    constructor (gfxDevice: Device, targetCount: number) {
        this._targetCount = targetCount;
        this._localBuffer = new DataView(new ArrayBuffer(UBOMorphEnum.SIZE));
        this._remoteBuffer = gfxDevice.createBuffer(new BufferInfo(
            BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            UBOMorphEnum.SIZE,
            UBOMorphEnum.SIZE,
        ));
    }

    public destroy (): void {
        this._remoteBuffer.destroy();
    }

    public get buffer (): Buffer {
        return this._remoteBuffer;
    }

    public setWeights (weights: number[]): void {
        assertIsTrue(weights.length === this._targetCount);
        const isLittleEndian = cclegacy.sys.isLittleEndian as boolean;
        for (let iWeight = 0; iWeight < weights.length; ++iWeight) {
            this._localBuffer.setFloat32(UBOMorphEnum.OFFSET_OF_WEIGHTS + 4 * iWeight, weights[iWeight], isLittleEndian);
        }
    }

    public setMorphTextureInfo (width: number, height: number): void {
        const isLittleEndian = cclegacy.sys.isLittleEndian as boolean;
        this._localBuffer.setFloat32(UBOMorphEnum.OFFSET_OF_DISPLACEMENT_TEXTURE_WIDTH, width, isLittleEndian);
        this._localBuffer.setFloat32(UBOMorphEnum.OFFSET_OF_DISPLACEMENT_TEXTURE_HEIGHT, height, isLittleEndian);
    }

    public setVerticesCount (count: number): void {
        const isLittleEndian = cclegacy.sys.isLittleEndian as boolean;
        this._localBuffer.setFloat32(UBOMorphEnum.OFFSET_OF_VERTICES_COUNT, count, isLittleEndian);
    }

    public commit (): void {
        this._remoteBuffer.update(this._localBuffer.buffer);
    }
}

function createVec4TextureFactory (gfxDevice: Device, vec4Capacity: number): {
    width: number;
    height: number;
    create: () => {
        readonly texture: Texture;
        readonly sampler: Sampler;
        readonly valueView: Float32Array;
        destroy(): void;
        updatePixels(): void;
    };
} {
    const hasFeatureFloatTexture = gfxDevice.getFormatFeatures(Format.RGBA32F) & FormatFeatureBit.SAMPLED_TEXTURE;

    let pixelRequired: number;
    let pixelFormat: PixelFormat;
    let pixelBytes: number;
    let UpdateViewConstructor: typeof Float32Array | typeof Uint8Array;
    if (hasFeatureFloatTexture) {
        pixelRequired = vec4Capacity;
        pixelBytes = 16;
        pixelFormat = PixelFormat.RGBA32F;
        UpdateViewConstructor = Float32Array;
    } else {
        pixelRequired = 4 * vec4Capacity;
        pixelBytes = 4;
        pixelFormat = PixelFormat.RGBA8888;
        UpdateViewConstructor = Uint8Array;
    }

    const { width, height } = bestSizeToHavePixels(pixelRequired);
    assertIsTrue(width * height >= pixelRequired);

    return {
        width,
        height,
        create: (): {
            readonly texture: Texture;
            readonly sampler: Sampler;
            readonly valueView: Float32Array;
            destroy(): void;
            updatePixels(): void;
        } => {
            const arrayBuffer = new ArrayBuffer(width * height * pixelBytes);
            const valueView = new Float32Array(arrayBuffer);
            const updateView = UpdateViewConstructor === Float32Array ? valueView : new UpdateViewConstructor(arrayBuffer);
            const image = new ImageAsset({
                width,
                height,
                _data: updateView,
                _compressed: false,
                format: pixelFormat,
            });
            const textureAsset = new Texture2D();
            textureAsset.setFilters(TextureFilter.NEAREST, TextureFilter.NEAREST);
            textureAsset.setMipFilter(TextureFilter.NONE);
            textureAsset.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
            textureAsset.image = image;
            if (!textureAsset.getGFXTexture()) {
                warnID(16375);
            }
            const sampler = gfxDevice.getSampler(textureAsset.getSamplerInfo());
            return {
                /**
                 * Gets the GFX texture.
                 */
                get texture (): Texture {
                    return textureAsset.getGFXTexture()!;
                },

                /**
                 * Gets the GFX sampler.
                 */
                get sampler (): Sampler {
                    return sampler;
                },

                /**
                 * Value view.
                 */
                get valueView (): Float32Array {
                    return valueView;
                },

                /**
                 * Destroy the texture. Release its GPU resources.
                 */
                destroy (): void {
                    textureAsset.destroy();
                    // Samplers allocated from `samplerLib` are not required and
                    // should not be destroyed.
                    // this._sampler.destroy();
                },

                /**
                 * Update the pixels content to `valueView`.
                 */
                updatePixels (): void {
                    textureAsset.uploadData(updateView);
                },
            };
        },
    };
}

type MorphTexture = ReturnType<ReturnType<typeof createVec4TextureFactory>['create']>;

/**
 * When use vertex-texture-fetch technique, we do need `gl_vertexId` when we sample per-vertex data.
 * WebGL 1.0 does not have `gl_vertexId`; WebGL 2.0, however, does.
 */
function enableVertexId (mesh: Mesh, subMeshIndex: number, gfxDevice: Device): void {
    mesh.renderingSubMeshes[subMeshIndex].enableVertexIdChannel(gfxDevice);
}

/**
 * Decides a best texture size to have the specified pixel capacity at least.
 * The decided width and height has the following characteristics:
 * - the width and height are both power of 2;
 * - if the width and height are different, the width would be set to the larger once;
 * - the width is ensured to be multiple of 4.
 * @param nPixels Least pixel capacity.
 */
function bestSizeToHavePixels (nPixels: number): {
    width: number;
    height: number;
} {
    if (nPixels < 5) {
        nPixels = 5;
    }
    const aligned = nextPow2(nPixels);
    const epxSum = bits.log2(aligned);
    const h = epxSum >> 1;
    const w = (epxSum & 1) ? (h + 1) : h;
    return {
        width: 1 << w,
        height: 1 << h,
    };
}
