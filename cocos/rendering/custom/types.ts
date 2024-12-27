/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
/* eslint-disable max-len */
import { Format, ResolveMode, ShaderStageFlagBit, Type, UniformBlock } from '../../gfx';
import type { ReflectionProbe } from '../../render-scene/scene/reflection-probe';
import type { Light } from '../../render-scene/scene';
import { RecyclePool } from '../../core/memop';
import type { OutputArchive, InputArchive } from './archive';
import { saveUniformBlock, loadUniformBlock } from './serialization';

export enum UpdateFrequency {
    PER_INSTANCE,
    PER_BATCH,
    PER_PHASE,
    PER_PASS,
    COUNT,
}

export const enum ParameterType {
    CONSTANTS,
    CBV,
    UAV,
    SRV,
    TABLE,
    SSV,
}

export enum ResourceResidency {
    MANAGED,
    MEMORYLESS,
    PERSISTENT,
    EXTERNAL,
    BACKBUFFER,
}

export enum QueueHint {
    NONE,
    OPAQUE,
    MASK,
    BLEND,
    RENDER_OPAQUE = OPAQUE,
    RENDER_CUTOUT = MASK,
    RENDER_TRANSPARENT = BLEND,
}

export enum ResourceDimension {
    BUFFER,
    TEXTURE1D,
    TEXTURE2D,
    TEXTURE3D,
}

export enum ViewDimension {
    UNKNOWN,
    BUFFER,
    TEX1D,
    TEX1DARRAY,
    TEX2D,
    TEX2DARRAY,
    TEX2DMS,
    TEX2DMSARRAY,
    TEX3D,
    TEXCUBE,
    TEXCUBEARRAY,
    RAYTRACING_ACCELERATION_STRUCTURE,
}

export enum ResourceFlags {
    NONE = 0,
    UNIFORM = 0x1,
    INDIRECT = 0x2,
    STORAGE = 0x4,
    SAMPLED = 0x8,
    COLOR_ATTACHMENT = 0x10,
    DEPTH_STENCIL_ATTACHMENT = 0x20,
    INPUT_ATTACHMENT = 0x40,
    SHADING_RATE = 0x80,
    TRANSFER_SRC = 0x100,
    TRANSFER_DST = 0x200,
}

export const enum TaskType {
    SYNC,
    ASYNC,
}

export enum SceneFlags {
    NONE = 0,
    OPAQUE = 0x1,
    MASK = 0x2,
    BLEND = 0x4,
    OPAQUE_OBJECT = OPAQUE,
    CUTOUT_OBJECT = MASK,
    TRANSPARENT_OBJECT = BLEND,
    SHADOW_CASTER = 0x8,
    UI = 0x10,
    DEFAULT_LIGHTING = 0x20,
    VOLUMETRIC_LIGHTING = 0x40,
    CLUSTERED_LIGHTING = 0x80,
    PLANAR_SHADOW = 0x100,
    GEOMETRY = 0x200,
    PROFILER = 0x400,
    DRAW_INSTANCING = 0x800,
    DRAW_NON_INSTANCING = 0x1000,
    REFLECTION_PROBE = 0x2000,
    GPU_DRIVEN = 0x4000,
    NON_BUILTIN = 0x8000,
    ALL = 0xFFFFFFFF,
}

export const enum LightingMode {
    NONE,
    DEFAULT,
    CLUSTERED,
}

export const enum AttachmentType {
    RENDER_TARGET,
    DEPTH_STENCIL,
    SHADING_RATE,
}

export enum AccessType {
    READ,
    READ_WRITE,
    WRITE,
}

export const enum ClearValueType {
    NONE,
    FLOAT_TYPE,
    INT_TYPE,
}

export class LightInfo {
    constructor (light: Light | null = null, level = 0, culledByLight = false, probe: ReflectionProbe | null = null) {
        this.light = light;
        this.probe = probe;
        this.level = level;
        this.culledByLight = culledByLight;
    }
    reset (light: Light | null, level: number, culledByLight: boolean, probe: ReflectionProbe | null): void {
        this.light = light;
        this.probe = probe;
        this.level = level;
        this.culledByLight = culledByLight;
    }
    declare /*refcount*/ light: Light | null;
    declare /*pointer*/ probe: ReflectionProbe | null;
    declare level: number;
    declare culledByLight: boolean;
}

export const enum DescriptorTypeOrder {
    UNIFORM_BUFFER,
    DYNAMIC_UNIFORM_BUFFER,
    SAMPLER_TEXTURE,
    SAMPLER,
    TEXTURE,
    STORAGE_BUFFER,
    DYNAMIC_STORAGE_BUFFER,
    STORAGE_IMAGE,
    INPUT_ATTACHMENT,
}

export class Descriptor {
    constructor (type: Type = Type.UNKNOWN) {
        this.type = type;
    }
    reset (type: Type): void {
        this.type = type;
        this.count = 1;
    }
    declare type: Type;
    count = 1;
}

export class DescriptorBlock {
    reset (): void {
        this.descriptors.clear();
        this.uniformBlocks.clear();
        this.capacity = 0;
        this.count = 0;
    }
    readonly descriptors: Map<string, Descriptor> = new Map<string, Descriptor>();
    readonly uniformBlocks: Map<string, UniformBlock> = new Map<string, UniformBlock>();
    capacity = 0;
    count = 0;
}

export class DescriptorBlockFlattened {
    reset (): void {
        this.descriptorNames.length = 0;
        this.uniformBlockNames.length = 0;
        this.descriptors.length = 0;
        this.uniformBlocks.length = 0;
        this.capacity = 0;
        this.count = 0;
    }
    readonly descriptorNames: string[] = [];
    readonly uniformBlockNames: string[] = [];
    readonly descriptors: Descriptor[] = [];
    readonly uniformBlocks: UniformBlock[] = [];
    capacity = 0;
    count = 0;
}

export class DescriptorBlockIndex {
    constructor (updateFrequency: UpdateFrequency = UpdateFrequency.PER_INSTANCE, parameterType: ParameterType = ParameterType.CONSTANTS, descriptorType: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER, visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE) {
        this.updateFrequency = updateFrequency;
        this.parameterType = parameterType;
        this.descriptorType = descriptorType;
        this.visibility = visibility;
    }
    declare updateFrequency: UpdateFrequency;
    declare parameterType: ParameterType;
    declare descriptorType: DescriptorTypeOrder;
    declare visibility: ShaderStageFlagBit;
}

export class DescriptorGroupBlockIndex {
    constructor (
        updateFrequency: UpdateFrequency = UpdateFrequency.PER_INSTANCE,
        parameterType: ParameterType = ParameterType.CONSTANTS,
        descriptorType: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER,
        visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE,
        accessType: AccessType = AccessType.READ,
        viewDimension: ViewDimension = ViewDimension.TEX2D,
        format: Format = Format.UNKNOWN,
    ) {
        this.updateFrequency = updateFrequency;
        this.parameterType = parameterType;
        this.descriptorType = descriptorType;
        this.visibility = visibility;
        this.accessType = accessType;
        this.viewDimension = viewDimension;
        this.format = format;
    }
    declare updateFrequency: UpdateFrequency;
    declare parameterType: ParameterType;
    declare descriptorType: DescriptorTypeOrder;
    declare visibility: ShaderStageFlagBit;
    declare accessType: AccessType;
    declare viewDimension: ViewDimension;
    declare format: Format;
}

export class DescriptorGroupBlock {
    reset (): void {
        this.descriptors.clear();
        this.uniformBlocks.clear();
        this.capacity = 0;
        this.count = 0;
    }
    readonly descriptors: Map<string, Descriptor> = new Map<string, Descriptor>();
    readonly uniformBlocks: Map<string, UniformBlock> = new Map<string, UniformBlock>();
    capacity = 0;
    count = 0;
}

export const enum ResolveFlags {
    NONE = 0,
    COLOR = 1 << 0,
    DEPTH = 1 << 1,
    STENCIL = 1 << 2,
}

export class ResolvePair {
    constructor (
        source = '',
        target = '',
        resolveFlags: ResolveFlags = ResolveFlags.NONE,
        mode: ResolveMode = ResolveMode.SAMPLE_ZERO,
        mode1: ResolveMode = ResolveMode.SAMPLE_ZERO,
    ) {
        this.source = source;
        this.target = target;
        this.resolveFlags = resolveFlags;
        this.mode = mode;
        this.mode1 = mode1;
    }
    reset (
        source: string,
        target: string,
        resolveFlags: ResolveFlags,
        mode: ResolveMode,
        mode1: ResolveMode,
    ): void {
        this.source = source;
        this.target = target;
        this.resolveFlags = resolveFlags;
        this.mode = mode;
        this.mode1 = mode1;
    }
    declare source: string;
    declare target: string;
    declare resolveFlags: ResolveFlags;
    declare mode: ResolveMode;
    declare mode1: ResolveMode;
}

export class CopyPair {
    constructor (
        source = '',
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        sourceMostDetailedMip = 0,
        sourceFirstSlice = 0,
        sourcePlaneSlice = 0,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ) {
        this.source = source;
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.sourceMostDetailedMip = sourceMostDetailedMip;
        this.sourceFirstSlice = sourceFirstSlice;
        this.sourcePlaneSlice = sourcePlaneSlice;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    reset (
        source: string,
        target: string,
        mipLevels: number,
        numSlices: number,
        sourceMostDetailedMip: number,
        sourceFirstSlice: number,
        sourcePlaneSlice: number,
        targetMostDetailedMip: number,
        targetFirstSlice: number,
        targetPlaneSlice: number,
    ): void {
        this.source = source;
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.sourceMostDetailedMip = sourceMostDetailedMip;
        this.sourceFirstSlice = sourceFirstSlice;
        this.sourcePlaneSlice = sourcePlaneSlice;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    declare source: string;
    declare target: string;
    declare mipLevels: number;
    declare numSlices: number;
    declare sourceMostDetailedMip: number;
    declare sourceFirstSlice: number;
    declare sourcePlaneSlice: number;
    declare targetMostDetailedMip: number;
    declare targetFirstSlice: number;
    declare targetPlaneSlice: number;
}

export class UploadPair {
    constructor (
        source: Uint8Array = new Uint8Array(0),
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ) {
        this.source = source;
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    reset (
        target: string,
        mipLevels: number,
        numSlices: number,
        targetMostDetailedMip: number,
        targetFirstSlice: number,
        targetPlaneSlice: number,
    ): void {
        // source: Uint8Array size unchanged
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    declare readonly source: Uint8Array;
    declare target: string;
    declare mipLevels: number;
    declare numSlices: number;
    declare targetMostDetailedMip: number;
    declare targetFirstSlice: number;
    declare targetPlaneSlice: number;
}

export class MovePair {
    constructor (
        source = '',
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ) {
        this.source = source;
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    reset (
        source: string,
        target: string,
        mipLevels: number,
        numSlices: number,
        targetMostDetailedMip: number,
        targetFirstSlice: number,
        targetPlaneSlice: number,
    ): void {
        this.source = source;
        this.target = target;
        this.mipLevels = mipLevels;
        this.numSlices = numSlices;
        this.targetMostDetailedMip = targetMostDetailedMip;
        this.targetFirstSlice = targetFirstSlice;
        this.targetPlaneSlice = targetPlaneSlice;
    }
    declare source: string;
    declare target: string;
    declare mipLevels: number;
    declare numSlices: number;
    declare targetMostDetailedMip: number;
    declare targetFirstSlice: number;
    declare targetPlaneSlice: number;
}

export class PipelineStatistics {
    reset (): void {
        this.numRenderPasses = 0;
        this.numManagedTextures = 0;
        this.totalManagedTextures = 0;
        this.numUploadBuffers = 0;
        this.numUploadBufferViews = 0;
        this.numFreeUploadBuffers = 0;
        this.numFreeUploadBufferViews = 0;
        this.numDescriptorSets = 0;
        this.numFreeDescriptorSets = 0;
        this.numInstancingBuffers = 0;
        this.numInstancingUniformBlocks = 0;
    }
    numRenderPasses = 0;
    numManagedTextures = 0;
    totalManagedTextures = 0;
    numUploadBuffers = 0;
    numUploadBufferViews = 0;
    numFreeUploadBuffers = 0;
    numFreeUploadBufferViews = 0;
    numDescriptorSets = 0;
    numFreeDescriptorSets = 0;
    numInstancingBuffers = 0;
    numInstancingUniformBlocks = 0;
}

function createPool<T> (Constructor: new() => T): RecyclePool<T> {
    return new RecyclePool<T>(() => new Constructor(), 16);
}

export class RenderCommonObjectPool {
    constructor () {
    }
    reset (): void {
        this.li.reset(); // LightInfo
        this.d.reset(); // Descriptor
        this.db.reset(); // DescriptorBlock
        this.dbf.reset(); // DescriptorBlockFlattened
        this.dbi.reset(); // DescriptorBlockIndex
        this.dgbi.reset(); // DescriptorGroupBlockIndex
        this.dgb.reset(); // DescriptorGroupBlock
        this.rp.reset(); // ResolvePair
        this.cp.reset(); // CopyPair
        this.up.reset(); // UploadPair
        this.mp.reset(); // MovePair
        this.ps.reset(); // PipelineStatistics
    }
    createLightInfo (
        light: Light | null = null,
        level = 0,
        culledByLight = false,
        probe: ReflectionProbe | null = null,
    ): LightInfo {
        const v = this.li.add(); // LightInfo
        v.reset(light, level, culledByLight, probe);
        return v;
    }
    createDescriptor (
        type: Type = Type.UNKNOWN,
    ): Descriptor {
        const v = this.d.add(); // Descriptor
        v.reset(type);
        return v;
    }
    createDescriptorBlock (): DescriptorBlock {
        const v = this.db.add(); // DescriptorBlock
        v.reset();
        return v;
    }
    createDescriptorBlockFlattened (): DescriptorBlockFlattened {
        const v = this.dbf.add(); // DescriptorBlockFlattened
        v.reset();
        return v;
    }
    createDescriptorBlockIndex (
        updateFrequency: UpdateFrequency = UpdateFrequency.PER_INSTANCE,
        parameterType: ParameterType = ParameterType.CONSTANTS,
        descriptorType: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER,
        visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE,
    ): DescriptorBlockIndex {
        const v = this.dbi.add(); // DescriptorBlockIndex
        v.updateFrequency = updateFrequency;
        v.parameterType = parameterType;
        v.descriptorType = descriptorType;
        v.visibility = visibility;
        return v;
    }
    createDescriptorGroupBlockIndex (
        updateFrequency: UpdateFrequency = UpdateFrequency.PER_INSTANCE,
        parameterType: ParameterType = ParameterType.CONSTANTS,
        descriptorType: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER,
        visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE,
        accessType: AccessType = AccessType.READ,
        viewDimension: ViewDimension = ViewDimension.TEX2D,
        format: Format = Format.UNKNOWN,
    ): DescriptorGroupBlockIndex {
        const v = this.dgbi.add(); // DescriptorGroupBlockIndex
        v.updateFrequency = updateFrequency;
        v.parameterType = parameterType;
        v.descriptorType = descriptorType;
        v.visibility = visibility;
        v.accessType = accessType;
        v.viewDimension = viewDimension;
        v.format = format;
        return v;
    }
    createDescriptorGroupBlock (): DescriptorGroupBlock {
        const v = this.dgb.add(); // DescriptorGroupBlock
        v.reset();
        return v;
    }
    createResolvePair (
        source = '',
        target = '',
        resolveFlags: ResolveFlags = ResolveFlags.NONE,
        mode: ResolveMode = ResolveMode.SAMPLE_ZERO,
        mode1: ResolveMode = ResolveMode.SAMPLE_ZERO,
    ): ResolvePair {
        const v = this.rp.add(); // ResolvePair
        v.reset(source, target, resolveFlags, mode, mode1);
        return v;
    }
    createCopyPair (
        source = '',
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        sourceMostDetailedMip = 0,
        sourceFirstSlice = 0,
        sourcePlaneSlice = 0,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ): CopyPair {
        const v = this.cp.add(); // CopyPair
        v.reset(source, target, mipLevels, numSlices, sourceMostDetailedMip, sourceFirstSlice, sourcePlaneSlice, targetMostDetailedMip, targetFirstSlice, targetPlaneSlice);
        return v;
    }
    createUploadPair (
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ): UploadPair {
        const v = this.up.add(); // UploadPair
        v.reset(target, mipLevels, numSlices, targetMostDetailedMip, targetFirstSlice, targetPlaneSlice);
        return v;
    }
    createMovePair (
        source = '',
        target = '',
        mipLevels = 0xFFFFFFFF,
        numSlices = 0xFFFFFFFF,
        targetMostDetailedMip = 0,
        targetFirstSlice = 0,
        targetPlaneSlice = 0,
    ): MovePair {
        const v = this.mp.add(); // MovePair
        v.reset(source, target, mipLevels, numSlices, targetMostDetailedMip, targetFirstSlice, targetPlaneSlice);
        return v;
    }
    createPipelineStatistics (): PipelineStatistics {
        const v = this.ps.add(); // PipelineStatistics
        v.reset();
        return v;
    }
    private readonly li: RecyclePool<LightInfo> = createPool(LightInfo);
    private readonly d: RecyclePool<Descriptor> = createPool(Descriptor);
    private readonly db: RecyclePool<DescriptorBlock> = createPool(DescriptorBlock);
    private readonly dbf: RecyclePool<DescriptorBlockFlattened> = createPool(DescriptorBlockFlattened);
    private readonly dbi: RecyclePool<DescriptorBlockIndex> = createPool(DescriptorBlockIndex);
    private readonly dgbi: RecyclePool<DescriptorGroupBlockIndex> = createPool(DescriptorGroupBlockIndex);
    private readonly dgb: RecyclePool<DescriptorGroupBlock> = createPool(DescriptorGroupBlock);
    private readonly rp: RecyclePool<ResolvePair> = createPool(ResolvePair);
    private readonly cp: RecyclePool<CopyPair> = createPool(CopyPair);
    private readonly up: RecyclePool<UploadPair> = createPool(UploadPair);
    private readonly mp: RecyclePool<MovePair> = createPool(MovePair);
    private readonly ps: RecyclePool<PipelineStatistics> = createPool(PipelineStatistics);
}

export function saveLightInfo (a: OutputArchive, v: LightInfo): void {
    // skip, v.light: Light
    // skip, v.probe: ReflectionProbe
    a.n(v.level);
    a.b(v.culledByLight);
}

export function loadLightInfo (a: InputArchive, v: LightInfo): void {
    // skip, v.light: Light
    // skip, v.probe: ReflectionProbe
    v.level = a.n();
    v.culledByLight = a.b();
}

export function saveDescriptor (a: OutputArchive, v: Descriptor): void {
    a.n(v.type);
    a.n(v.count);
}

export function loadDescriptor (a: InputArchive, v: Descriptor): void {
    v.type = a.n();
    v.count = a.n();
}

export function saveDescriptorBlock (a: OutputArchive, v: DescriptorBlock): void {
    a.n(v.descriptors.size); // Map<string, Descriptor>
    for (const [k1, v1] of v.descriptors) {
        a.s(k1);
        saveDescriptor(a, v1);
    }
    a.n(v.uniformBlocks.size); // Map<string, UniformBlock>
    for (const [k1, v1] of v.uniformBlocks) {
        a.s(k1);
        saveUniformBlock(a, v1);
    }
    a.n(v.capacity);
    a.n(v.count);
}

export function loadDescriptorBlock (a: InputArchive, v: DescriptorBlock): void {
    let sz = 0;
    sz = a.n(); // Map<string, Descriptor>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new Descriptor();
        loadDescriptor(a, v1);
        v.descriptors.set(k1, v1);
    }
    sz = a.n(); // Map<string, UniformBlock>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new UniformBlock();
        loadUniformBlock(a, v1);
        v.uniformBlocks.set(k1, v1);
    }
    v.capacity = a.n();
    v.count = a.n();
}

export function saveDescriptorBlockFlattened (a: OutputArchive, v: DescriptorBlockFlattened): void {
    a.n(v.descriptorNames.length); // string[]
    for (const v1 of v.descriptorNames) {
        a.s(v1);
    }
    a.n(v.uniformBlockNames.length); // string[]
    for (const v1 of v.uniformBlockNames) {
        a.s(v1);
    }
    a.n(v.descriptors.length); // Descriptor[]
    for (const v1 of v.descriptors) {
        saveDescriptor(a, v1);
    }
    a.n(v.uniformBlocks.length); // UniformBlock[]
    for (const v1 of v.uniformBlocks) {
        saveUniformBlock(a, v1);
    }
    a.n(v.capacity);
    a.n(v.count);
}

export function loadDescriptorBlockFlattened (a: InputArchive, v: DescriptorBlockFlattened): void {
    let sz = 0;
    sz = a.n(); // string[]
    v.descriptorNames.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        v.descriptorNames[i1] = a.s();
    }
    sz = a.n(); // string[]
    v.uniformBlockNames.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        v.uniformBlockNames[i1] = a.s();
    }
    sz = a.n(); // Descriptor[]
    v.descriptors.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new Descriptor();
        loadDescriptor(a, v1);
        v.descriptors[i1] = v1;
    }
    sz = a.n(); // UniformBlock[]
    v.uniformBlocks.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new UniformBlock();
        loadUniformBlock(a, v1);
        v.uniformBlocks[i1] = v1;
    }
    v.capacity = a.n();
    v.count = a.n();
}

export function saveDescriptorBlockIndex (a: OutputArchive, v: DescriptorBlockIndex): void {
    a.n(v.updateFrequency);
    a.n(v.parameterType);
    a.n(v.descriptorType);
    a.n(v.visibility);
}

export function loadDescriptorBlockIndex (a: InputArchive, v: DescriptorBlockIndex): void {
    v.updateFrequency = a.n();
    v.parameterType = a.n();
    v.descriptorType = a.n();
    v.visibility = a.n();
}

export function saveDescriptorGroupBlockIndex (a: OutputArchive, v: DescriptorGroupBlockIndex): void {
    a.n(v.updateFrequency);
    a.n(v.parameterType);
    a.n(v.descriptorType);
    a.n(v.visibility);
    a.n(v.accessType);
    a.n(v.viewDimension);
    a.n(v.format);
}

export function loadDescriptorGroupBlockIndex (a: InputArchive, v: DescriptorGroupBlockIndex): void {
    v.updateFrequency = a.n();
    v.parameterType = a.n();
    v.descriptorType = a.n();
    v.visibility = a.n();
    v.accessType = a.n();
    v.viewDimension = a.n();
    v.format = a.n();
}

export function saveDescriptorGroupBlock (a: OutputArchive, v: DescriptorGroupBlock): void {
    a.n(v.descriptors.size); // Map<string, Descriptor>
    for (const [k1, v1] of v.descriptors) {
        a.s(k1);
        saveDescriptor(a, v1);
    }
    a.n(v.uniformBlocks.size); // Map<string, UniformBlock>
    for (const [k1, v1] of v.uniformBlocks) {
        a.s(k1);
        saveUniformBlock(a, v1);
    }
    a.n(v.capacity);
    a.n(v.count);
}

export function loadDescriptorGroupBlock (a: InputArchive, v: DescriptorGroupBlock): void {
    let sz = 0;
    sz = a.n(); // Map<string, Descriptor>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new Descriptor();
        loadDescriptor(a, v1);
        v.descriptors.set(k1, v1);
    }
    sz = a.n(); // Map<string, UniformBlock>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new UniformBlock();
        loadUniformBlock(a, v1);
        v.uniformBlocks.set(k1, v1);
    }
    v.capacity = a.n();
    v.count = a.n();
}

export function saveResolvePair (a: OutputArchive, v: ResolvePair): void {
    a.s(v.source);
    a.s(v.target);
    a.n(v.resolveFlags);
    a.n(v.mode);
    a.n(v.mode1);
}

export function loadResolvePair (a: InputArchive, v: ResolvePair): void {
    v.source = a.s();
    v.target = a.s();
    v.resolveFlags = a.n();
    v.mode = a.n();
    v.mode1 = a.n();
}

export function saveCopyPair (a: OutputArchive, v: CopyPair): void {
    a.s(v.source);
    a.s(v.target);
    a.n(v.mipLevels);
    a.n(v.numSlices);
    a.n(v.sourceMostDetailedMip);
    a.n(v.sourceFirstSlice);
    a.n(v.sourcePlaneSlice);
    a.n(v.targetMostDetailedMip);
    a.n(v.targetFirstSlice);
    a.n(v.targetPlaneSlice);
}

export function loadCopyPair (a: InputArchive, v: CopyPair): void {
    v.source = a.s();
    v.target = a.s();
    v.mipLevels = a.n();
    v.numSlices = a.n();
    v.sourceMostDetailedMip = a.n();
    v.sourceFirstSlice = a.n();
    v.sourcePlaneSlice = a.n();
    v.targetMostDetailedMip = a.n();
    v.targetFirstSlice = a.n();
    v.targetPlaneSlice = a.n();
}

export function saveMovePair (a: OutputArchive, v: MovePair): void {
    a.s(v.source);
    a.s(v.target);
    a.n(v.mipLevels);
    a.n(v.numSlices);
    a.n(v.targetMostDetailedMip);
    a.n(v.targetFirstSlice);
    a.n(v.targetPlaneSlice);
}

export function loadMovePair (a: InputArchive, v: MovePair): void {
    v.source = a.s();
    v.target = a.s();
    v.mipLevels = a.n();
    v.numSlices = a.n();
    v.targetMostDetailedMip = a.n();
    v.targetFirstSlice = a.n();
    v.targetPlaneSlice = a.n();
}

export function savePipelineStatistics (a: OutputArchive, v: PipelineStatistics): void {
    a.n(v.numRenderPasses);
    a.n(v.numManagedTextures);
    a.n(v.totalManagedTextures);
    a.n(v.numUploadBuffers);
    a.n(v.numUploadBufferViews);
    a.n(v.numFreeUploadBuffers);
    a.n(v.numFreeUploadBufferViews);
    a.n(v.numDescriptorSets);
    a.n(v.numFreeDescriptorSets);
    a.n(v.numInstancingBuffers);
    a.n(v.numInstancingUniformBlocks);
}

export function loadPipelineStatistics (a: InputArchive, v: PipelineStatistics): void {
    v.numRenderPasses = a.n();
    v.numManagedTextures = a.n();
    v.totalManagedTextures = a.n();
    v.numUploadBuffers = a.n();
    v.numUploadBufferViews = a.n();
    v.numFreeUploadBuffers = a.n();
    v.numFreeUploadBufferViews = a.n();
    v.numDescriptorSets = a.n();
    v.numFreeDescriptorSets = a.n();
    v.numInstancingBuffers = a.n();
    v.numInstancingUniformBlocks = a.n();
}
