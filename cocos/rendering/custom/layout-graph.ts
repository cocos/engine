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
import { HTML5 } from 'internal:constants';
import { AddressableGraph, AdjI, AdjacencyGraph, BidirectionalGraph, ComponentGraph, ED, InEI, MutableGraph, MutableReferenceGraph, NamedGraph, OutE, OutEI, PolymorphicGraph, PropertyGraph, ReferenceGraph, VertexListGraph, findRelative, getPath } from './graph';
import type { DescriptorSet, DescriptorSetLayout, PipelineLayout } from '../../gfx';
import { DescriptorSetLayoutInfo, Format, MemoryAccessBit, SampleType, ShaderStageFlagBit, Type, UniformBlock, ViewDimension } from '../../gfx';
import { ParameterType, UpdateFrequency, RenderCommonObjectPool } from './types';
import { RecyclePool } from '../../core/memop';
import type { OutputArchive, InputArchive } from './archive';
import { saveUniformBlock, loadUniformBlock, saveDescriptorSetLayoutInfo, loadDescriptorSetLayoutInfo } from './serialization';

function resetDescriptorSetLayoutInfo (info: DescriptorSetLayoutInfo): void {
    info.bindings.length = 0;
}

export const enum LayoutType {
    VULKAN,
    WEBGPU,
}

export class Layout {
    static type = LayoutType.VULKAN;
    static isWebGPU = false;
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
        accessType: MemoryAccessBit = MemoryAccessBit.READ_ONLY,
        viewDimension: ViewDimension = ViewDimension.UNKNOWN,
        sampleType: SampleType = SampleType.FLOAT,
        format: Format = Format.UNKNOWN,
    ) {
        this.updateFrequency = updateFrequency;
        this.parameterType = parameterType;
        this.descriptorType = descriptorType;
        this.visibility = visibility;
        this.accessType = accessType;
        this.viewDimension = viewDimension;
        this.sampleType = sampleType;
        this.format = format;
    }
    declare updateFrequency: UpdateFrequency;
    declare parameterType: ParameterType;
    declare descriptorType: DescriptorTypeOrder;
    declare visibility: ShaderStageFlagBit;
    declare accessType: MemoryAccessBit;
    declare viewDimension: ViewDimension;
    declare sampleType: SampleType;
    declare format: Format;
}

export class DescriptorDB {
    reset (): void {
        this.blocks.clear();
        this.groupBlocks.clear();
    }
    readonly blocks: Map<string, DescriptorBlock> = new Map<string, DescriptorBlock>();
    readonly groupBlocks: Map<string, DescriptorBlock> = new Map<string, DescriptorBlock>();
}

export class RenderPhase {
    reset (): void {
        this.shaders.clear();
    }
    readonly shaders: Set<string> = new Set<string>();
}

export const enum RenderPassType {
    SINGLE_RENDER_PASS,
    RENDER_PASS,
    RENDER_SUBPASS,
}

//=================================================================
// LayoutGraph
//=================================================================
// PolymorphicGraph Concept
export const enum LayoutGraphValue {
    RenderStage,
    RenderPhase,
}

export function getLayoutGraphValueName (e: LayoutGraphValue): string {
    switch (e) {
    case LayoutGraphValue.RenderStage: return 'RenderStage';
    case LayoutGraphValue.RenderPhase: return 'RenderPhase';
    default: return '';
    }
}

export interface LayoutGraphValueType {
    [LayoutGraphValue.RenderStage]: RenderPassType
    [LayoutGraphValue.RenderPhase]: RenderPhase
}

export interface LayoutGraphVisitor {
    renderStage(value: RenderPassType): unknown;
    renderPhase(value: RenderPhase): unknown;
}

export type LayoutGraphObject = RenderPassType | RenderPhase;

//-----------------------------------------------------------------
// Graph Concept
export class LayoutGraphVertex {
    constructor (
        readonly id: LayoutGraphValue,
        readonly object: LayoutGraphObject,
    ) {
        this.t = id;
        this.j = object;
    }
    /** Out edge list */
    readonly o: OutE[] = [];
    /** In edge list */
    readonly i: OutE[] = [];
    /** Polymorphic object Id */
    readonly t: LayoutGraphValue;
    /** Polymorphic object */
    j: LayoutGraphObject;
}
//-----------------------------------------------------------------
// ComponentGraph Concept
export const enum LayoutGraphComponent {
    Name,
    Descriptors,
}

export interface LayoutGraphComponentType {
    [LayoutGraphComponent.Name]: string;
    [LayoutGraphComponent.Descriptors]: DescriptorDB;
}

//-----------------------------------------------------------------
// LayoutGraph Implementation
export class LayoutGraph implements BidirectionalGraph
, AdjacencyGraph
, VertexListGraph
, MutableGraph
, PropertyGraph
, NamedGraph
, ComponentGraph
, PolymorphicGraph
, ReferenceGraph
, MutableReferenceGraph
, AddressableGraph {
    //-----------------------------------------------------------------
    // Graph
    /** null vertex descriptor */
    readonly N = 0xFFFFFFFF;
    // type edge_descriptor = ED;
    //-----------------------------------------------------------------
    // IncidenceGraph
    // type out_edge_iterator = OutEI;
    // type degree_size_type = number;
    edge (u: number, v: number): boolean {
        for (const oe of this.x[u].o) {
            if (v === oe.target as number) {
                return true;
            }
        }
        return false;
    }
    source (e: ED): number {
        return e.source as number;
    }
    target (e: ED): number {
        return e.target as number;
    }
    oe (v: number): OutEI {
        return new OutEI(this.x[v].o.values(), v);
    }
    od (v: number): number {
        return this.x[v].o.length;
    }
    //-----------------------------------------------------------------
    // BidirectionalGraph
    // type in_edge_iterator = InEI;
    ie (v: number): InEI {
        return new InEI(this.x[v].i.values(), v);
    }
    id (v: number): number {
        return this.x[v].i.length;
    }
    d (v: number): number {
        return this.od(v) + this.id(v);
    }
    //-----------------------------------------------------------------
    // AdjacencyGraph
    // type adjacency_iterator = AdjI;
    adj (v: number): AdjI {
        return new AdjI(this, this.oe(v));
    }
    //-----------------------------------------------------------------
    // VertexListGraph
    v (): IterableIterator<number> {
        return this.x.keys();
    }
    nv (): number {
        return this.x.length;
    }
    //-----------------------------------------------------------------
    // EdgeListGraph
    ne (): number {
        let numEdges = 0;
        for (const v of this.v()) {
            numEdges += this.od(v);
        }
        return numEdges;
    }
    //-----------------------------------------------------------------
    // MutableGraph
    clear (): void {
        // ComponentGraph
        this._names.length = 0;
        this._descriptors.length = 0;
        // Graph Vertices
        this.x.length = 0;
    }
    addVertex<T extends LayoutGraphValue> (
        id: T,
        object: LayoutGraphValueType[T],
        name: string,
        descriptors: DescriptorDB,
        u = 0xFFFFFFFF,
    ): number {
        const vert = new LayoutGraphVertex(id, object);
        const v = this.x.length;
        this.x.push(vert);
        this._names.push(name);
        this._descriptors.push(descriptors);

        // ReferenceGraph
        if (u !== 0xFFFFFFFF) {
            this.addEdge(u, v);
        }

        return v;
    }
    addEdge (u: number, v: number): ED | null {
        // update in/out edge list
        this.x[u].o.push(new OutE(v));
        this.x[v].i.push(new OutE(u));
        return new ED(u, v);
    }
    //-----------------------------------------------------------------
    // NamedGraph
    vertexName (v: number): string {
        return this._names[v];
    }
    //-----------------------------------------------------------------
    // ComponentGraph
    // skip setName, Name is constant in AddressableGraph
    getName (v: number): string {
        return this._names[v];
    }
    getDescriptors (v: number): DescriptorDB {
        return this._descriptors[v];
    }
    //-----------------------------------------------------------------
    // PolymorphicGraph
    h (id: LayoutGraphValue, v: number): boolean {
        return this.x[v].t === id;
    }
    w (v: number): LayoutGraphValue {
        return this.x[v].t;
    }
    object (v: number): LayoutGraphObject {
        return this.x[v].j;
    }
    value<T extends LayoutGraphValue> (id: T, v: number): LayoutGraphValueType[T] {
        if (this.x[v].t === id) {
            return this.x[v].j as LayoutGraphValueType[T];
        } else {
            throw Error('value id not match');
        }
    }
    visitVertex (visitor: LayoutGraphVisitor, v: number): unknown {
        const vert = this.x[v];
        switch (vert.t) {
        case LayoutGraphValue.RenderStage:
            return visitor.renderStage(vert.j as RenderPassType);
        case LayoutGraphValue.RenderPhase:
            return visitor.renderPhase(vert.j as RenderPhase);
        default:
            throw Error('polymorphic type not found');
        }
    }
    j<T extends LayoutGraphObject> (v: number): T {
        return this.x[v].j as T;
    }
    //-----------------------------------------------------------------
    // ReferenceGraph
    // type reference_descriptor = ED;
    // type child_iterator = OutEI;
    // type parent_iterator = InEI;
    reference (u: number, v: number): boolean {
        for (const oe of this.x[u].o) {
            if (v === oe.target as number) {
                return true;
            }
        }
        return false;
    }
    parent (e: ED): number {
        return e.source as number;
    }
    child (e: ED): number {
        return e.target as number;
    }
    children (v: number): OutEI {
        return new OutEI(this.x[v].o.values(), v);
    }
    numChildren (v: number): number {
        return this.x[v].o.length;
    }
    getParent (v: number): number {
        if (v === 0xFFFFFFFF) {
            return 0xFFFFFFFF;
        }
        const list = this.x[v].i;
        if (list.length === 0) {
            return 0xFFFFFFFF;
        } else {
            return list[0].target as number;
        }
    }
    //-----------------------------------------------------------------
    // MutableReferenceGraph
    addReference (u: number, v: number): ED | null {
        return this.addEdge(u, v);
    }
    //-----------------------------------------------------------------
    // ParentGraph
    locateChild (u: number, name: string): number {
        if (u === 0xFFFFFFFF) {
            for (const v of this.x.keys()) {
                const vert = this.x[v];
                if (vert.i.length === 0 && this._names[v] === name) {
                    return v;
                }
            }
            return 0xFFFFFFFF;
        }
        for (const oe of this.x[u].o) {
            const child = oe.target as number;
            if (name === this._names[child]) {
                return child;
            }
        }
        return 0xFFFFFFFF;
    }
    //-----------------------------------------------------------------
    // AddressableGraph
    locate (absPath: string): number {
        return findRelative(this, 0xFFFFFFFF, absPath) as number;
    }
    locateRelative (path: string, start = 0xFFFFFFFF): number {
        return findRelative(this, start, path) as number;
    }
    path (v: number): string {
        return getPath(this, v);
    }
    readonly x: LayoutGraphVertex[] = [];
    readonly _names: string[] = [];
    readonly _descriptors: DescriptorDB[] = [];
}

export class UniformData {
    constructor (uniformID = 0xFFFFFFFF, uniformType: Type = Type.UNKNOWN, offset = 0) {
        this.uniformID = uniformID;
        this.uniformType = uniformType;
        this.offset = offset;
    }
    reset (uniformID: number, uniformType: Type, offset: number): void {
        this.uniformID = uniformID;
        this.uniformType = uniformType;
        this.offset = offset;
        this.size = 0;
    }
    declare uniformID: number;
    declare uniformType: Type;
    declare offset: number;
    size = 0;
}

export class UniformBlockData {
    reset (): void {
        this.bufferSize = 0;
        this.uniforms.length = 0;
    }
    bufferSize = 0;
    readonly uniforms: UniformData[] = [];
}

export class DescriptorData {
    constructor (descriptorID = 0, type: Type = Type.UNKNOWN, count = 1) {
        this.descriptorID = descriptorID;
        this.type = type;
        this.count = count;
    }
    reset (descriptorID: number, type: Type, count: number): void {
        this.descriptorID = descriptorID;
        this.type = type;
        this.count = count;
    }
    declare descriptorID: number;
    declare type: Type;
    declare count: number;
}

export class DescriptorBlockData {
    constructor (
        type: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER,
        visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE,
        capacity = 0,
        accessType: MemoryAccessBit = MemoryAccessBit.READ_ONLY,
        viewDimension: ViewDimension = ViewDimension.UNKNOWN,
        sampleType: SampleType = SampleType.FLOAT,
        format: Format = Format.UNKNOWN,
    ) {
        this.type = type;
        this.visibility = visibility;
        this.capacity = capacity;
        this.accessType = accessType;
        this.viewDimension = viewDimension;
        this.sampleType = sampleType;
        this.format = format;
    }
    reset (
        type: DescriptorTypeOrder,
        visibility: ShaderStageFlagBit,
        capacity: number,
        accessType: MemoryAccessBit,
        viewDimension: ViewDimension,
        sampleType: SampleType,
        format: Format,
    ): void {
        this.type = type;
        this.visibility = visibility;
        this.offset = 0;
        this.capacity = capacity;
        this.accessType = accessType;
        this.viewDimension = viewDimension;
        this.sampleType = sampleType;
        this.format = format;
        this.descriptors.length = 0;
    }
    declare type: DescriptorTypeOrder;
    declare visibility: ShaderStageFlagBit;
    offset = 0;
    declare capacity: number;
    declare accessType: MemoryAccessBit;
    declare viewDimension: ViewDimension;
    declare sampleType: SampleType;
    declare format: Format;
    readonly descriptors: DescriptorData[] = [];
}

export class DescriptorSetLayoutData {
    constructor (
        slot = 0xFFFFFFFF,
        capacity = 0,
        descriptorBlocks: DescriptorBlockData[] = [],
        uniformBlocks: Map<number, UniformBlock> = new Map<number, UniformBlock>(),
        bindingMap: Map<number, number> = new Map<number, number>(),
    ) {
        this.slot = slot;
        this.capacity = capacity;
        this.descriptorBlocks = descriptorBlocks;
        this.uniformBlocks = uniformBlocks;
        this.bindingMap = bindingMap;
    }
    reset (
        slot: number,
        capacity: number,
    ): void {
        this.slot = slot;
        this.capacity = capacity;
        this.uniformBlockCapacity = 0;
        this.samplerTextureCapacity = 0;
        this.descriptorBlocks.length = 0;
        this.uniformBlocks.clear();
        this.bindingMap.clear();
    }
    declare slot: number;
    declare capacity: number;
    uniformBlockCapacity = 0;
    samplerTextureCapacity = 0;
    declare readonly descriptorBlocks: DescriptorBlockData[];
    declare readonly uniformBlocks: Map<number, UniformBlock>;
    declare readonly bindingMap: Map<number, number>;
}

export class DescriptorSetData {
    constructor (descriptorSetLayoutData: DescriptorSetLayoutData = new DescriptorSetLayoutData(), descriptorSetLayout: DescriptorSetLayout | null = null, descriptorSet: DescriptorSet | null = null) {
        this.descriptorSetLayoutData = descriptorSetLayoutData;
        this.descriptorSetLayout = descriptorSetLayout;
        this.descriptorSet = descriptorSet;
    }
    reset (descriptorSetLayout: DescriptorSetLayout | null, descriptorSet: DescriptorSet | null): void {
        this.descriptorSetLayoutData.reset(0xFFFFFFFF, 0);
        resetDescriptorSetLayoutInfo(this.descriptorSetLayoutInfo);
        this.descriptorSetLayout = descriptorSetLayout;
        this.descriptorSet = descriptorSet;
    }
    declare readonly descriptorSetLayoutData: DescriptorSetLayoutData;
    readonly descriptorSetLayoutInfo: DescriptorSetLayoutInfo = new DescriptorSetLayoutInfo();
    declare /*refcount*/ descriptorSetLayout: DescriptorSetLayout | null;
    declare /*refcount*/ descriptorSet: DescriptorSet | null;
}

export class PipelineLayoutData {
    reset (): void {
        this.descriptorSets.clear();
        this.descriptorGroups.clear();
    }
    getSets (): Map<UpdateFrequency, DescriptorSetData> {
        return HTML5 && Layout.isWebGPU ? this.descriptorGroups : this.descriptorSets;
    }
    getSet (frequency: UpdateFrequency): DescriptorSetData | undefined {
        return HTML5 && Layout.isWebGPU ? this.descriptorGroups.get(frequency) : this.descriptorSets.get(frequency);
    }
    readonly descriptorSets: Map<UpdateFrequency, DescriptorSetData> = new Map<UpdateFrequency, DescriptorSetData>();
    readonly descriptorGroups: Map<UpdateFrequency, DescriptorSetData> = new Map<UpdateFrequency, DescriptorSetData>();
}

export class ShaderBindingData {
    reset (): void {
        this.descriptorBindings.clear();
    }
    readonly descriptorBindings: Map<number, number> = new Map<number, number>();
}

export class ShaderLayoutData {
    reset (): void {
        this.layoutData.clear();
        this.bindingData.clear();
    }
    readonly layoutData: Map<UpdateFrequency, DescriptorSetLayoutData> = new Map<UpdateFrequency, DescriptorSetLayoutData>();
    readonly bindingData: Map<UpdateFrequency, ShaderBindingData> = new Map<UpdateFrequency, ShaderBindingData>();
}

export class TechniqueData {
    reset (): void {
        this.passes.length = 0;
    }
    readonly passes: ShaderLayoutData[] = [];
}

export class EffectData {
    reset (): void {
        this.techniques.clear();
    }
    readonly techniques: Map<string, TechniqueData> = new Map<string, TechniqueData>();
}

export class ShaderProgramData {
    reset (): void {
        this.layout.reset();
        this.pipelineLayout = null;
    }
    readonly layout: PipelineLayoutData = new PipelineLayoutData();
    /*refcount*/ pipelineLayout: PipelineLayout | null = null;
}

export class RenderStageData {
    reset (): void {
        this.descriptorVisibility.clear();
    }
    readonly descriptorVisibility: Map<number, ShaderStageFlagBit> = new Map<number, ShaderStageFlagBit>();
}

export class RenderPhaseData {
    reset (): void {
        this.rootSignature = '';
        this.shaderPrograms.length = 0;
        this.shaderIndex.clear();
        this.pipelineLayout = null;
    }
    rootSignature = '';
    readonly shaderPrograms: ShaderProgramData[] = [];
    readonly shaderIndex: Map<string, number> = new Map<string, number>();
    /*refcount*/ pipelineLayout: PipelineLayout | null = null;
}

//=================================================================
// LayoutGraphData
//=================================================================
// PolymorphicGraph Concept
export const enum LayoutGraphDataValue {
    RenderStage,
    RenderPhase,
}

export function getLayoutGraphDataValueName (e: LayoutGraphDataValue): string {
    switch (e) {
    case LayoutGraphDataValue.RenderStage: return 'RenderStage';
    case LayoutGraphDataValue.RenderPhase: return 'RenderPhase';
    default: return '';
    }
}

export interface LayoutGraphDataValueType {
    [LayoutGraphDataValue.RenderStage]: RenderStageData
    [LayoutGraphDataValue.RenderPhase]: RenderPhaseData
}

export interface LayoutGraphDataVisitor {
    renderStage(value: RenderStageData): unknown;
    renderPhase(value: RenderPhaseData): unknown;
}

export type LayoutGraphDataObject = RenderStageData | RenderPhaseData;

//-----------------------------------------------------------------
// Graph Concept
export class LayoutGraphDataVertex {
    constructor (
        readonly id: LayoutGraphDataValue,
        readonly object: LayoutGraphDataObject,
    ) {
        this.t = id;
        this.j = object;
    }
    /** Out edge list */
    readonly o: OutE[] = [];
    /** In edge list */
    readonly i: OutE[] = [];
    /** Polymorphic object Id */
    readonly t: LayoutGraphDataValue;
    /** Polymorphic object */
    j: LayoutGraphDataObject;
}
//-----------------------------------------------------------------
// ComponentGraph Concept
export const enum LayoutGraphDataComponent {
    Name,
    Update,
    Layout,
}

export interface LayoutGraphDataComponentType {
    [LayoutGraphDataComponent.Name]: string;
    [LayoutGraphDataComponent.Update]: UpdateFrequency;
    [LayoutGraphDataComponent.Layout]: PipelineLayoutData;
}

//-----------------------------------------------------------------
// LayoutGraphData Implementation
export class LayoutGraphData implements BidirectionalGraph
, AdjacencyGraph
, VertexListGraph
, MutableGraph
, PropertyGraph
, NamedGraph
, ComponentGraph
, PolymorphicGraph
, ReferenceGraph
, MutableReferenceGraph
, AddressableGraph {
    //-----------------------------------------------------------------
    // Graph
    /** null vertex descriptor */
    readonly N = 0xFFFFFFFF;
    // type edge_descriptor = ED;
    //-----------------------------------------------------------------
    // IncidenceGraph
    // type out_edge_iterator = OutEI;
    // type degree_size_type = number;
    edge (u: number, v: number): boolean {
        for (const oe of this.x[u].o) {
            if (v === oe.target as number) {
                return true;
            }
        }
        return false;
    }
    source (e: ED): number {
        return e.source as number;
    }
    target (e: ED): number {
        return e.target as number;
    }
    oe (v: number): OutEI {
        return new OutEI(this.x[v].o.values(), v);
    }
    od (v: number): number {
        return this.x[v].o.length;
    }
    //-----------------------------------------------------------------
    // BidirectionalGraph
    // type in_edge_iterator = InEI;
    ie (v: number): InEI {
        return new InEI(this.x[v].i.values(), v);
    }
    id (v: number): number {
        return this.x[v].i.length;
    }
    d (v: number): number {
        return this.od(v) + this.id(v);
    }
    //-----------------------------------------------------------------
    // AdjacencyGraph
    // type adjacency_iterator = AdjI;
    adj (v: number): AdjI {
        return new AdjI(this, this.oe(v));
    }
    //-----------------------------------------------------------------
    // VertexListGraph
    v (): IterableIterator<number> {
        return this.x.keys();
    }
    nv (): number {
        return this.x.length;
    }
    //-----------------------------------------------------------------
    // EdgeListGraph
    ne (): number {
        let numEdges = 0;
        for (const v of this.v()) {
            numEdges += this.od(v);
        }
        return numEdges;
    }
    //-----------------------------------------------------------------
    // MutableGraph
    clear (): void {
        // Members
        this.valueNames.length = 0;
        this.attributeIndex.clear();
        this.constantIndex.clear();
        this.shaderLayoutIndex.clear();
        this.effects.clear();
        this.constantMacros = '';
        // ComponentGraph
        this._names.length = 0;
        this._updateFrequencies.length = 0;
        this._layouts.length = 0;
        // Graph Vertices
        this.x.length = 0;
    }
    addVertex<T extends LayoutGraphDataValue> (
        id: T,
        object: LayoutGraphDataValueType[T],
        name: string,
        update: UpdateFrequency,
        layout: PipelineLayoutData,
        u = 0xFFFFFFFF,
    ): number {
        const vert = new LayoutGraphDataVertex(id, object);
        const v = this.x.length;
        this.x.push(vert);
        this._names.push(name);
        this._updateFrequencies.push(update);
        this._layouts.push(layout);

        // ReferenceGraph
        if (u !== 0xFFFFFFFF) {
            this.addEdge(u, v);
        }

        return v;
    }
    addEdge (u: number, v: number): ED | null {
        // update in/out edge list
        this.x[u].o.push(new OutE(v));
        this.x[v].i.push(new OutE(u));
        return new ED(u, v);
    }
    //-----------------------------------------------------------------
    // NamedGraph
    vertexName (v: number): string {
        return this._names[v];
    }
    //-----------------------------------------------------------------
    // ComponentGraph
    // skip setName, Name is constant in AddressableGraph
    getName (v: number): string {
        return this._names[v];
    }
    getUpdate (v: number): UpdateFrequency {
        return this._updateFrequencies[v];
    }
    setUpdate (v: number, value: UpdateFrequency): void {
        this._updateFrequencies[v] = value;
    }
    getLayout (v: number): PipelineLayoutData {
        return this._layouts[v];
    }
    //-----------------------------------------------------------------
    // PolymorphicGraph
    h (id: LayoutGraphDataValue, v: number): boolean {
        return this.x[v].t === id;
    }
    w (v: number): LayoutGraphDataValue {
        return this.x[v].t;
    }
    object (v: number): LayoutGraphDataObject {
        return this.x[v].j;
    }
    value<T extends LayoutGraphDataValue> (id: T, v: number): LayoutGraphDataValueType[T] {
        if (this.x[v].t === id) {
            return this.x[v].j as LayoutGraphDataValueType[T];
        } else {
            throw Error('value id not match');
        }
    }
    visitVertex (visitor: LayoutGraphDataVisitor, v: number): unknown {
        const vert = this.x[v];
        switch (vert.t) {
        case LayoutGraphDataValue.RenderStage:
            return visitor.renderStage(vert.j as RenderStageData);
        case LayoutGraphDataValue.RenderPhase:
            return visitor.renderPhase(vert.j as RenderPhaseData);
        default:
            throw Error('polymorphic type not found');
        }
    }
    j<T extends LayoutGraphDataObject> (v: number): T {
        return this.x[v].j as T;
    }
    //-----------------------------------------------------------------
    // ReferenceGraph
    // type reference_descriptor = ED;
    // type child_iterator = OutEI;
    // type parent_iterator = InEI;
    reference (u: number, v: number): boolean {
        for (const oe of this.x[u].o) {
            if (v === oe.target as number) {
                return true;
            }
        }
        return false;
    }
    parent (e: ED): number {
        return e.source as number;
    }
    child (e: ED): number {
        return e.target as number;
    }
    children (v: number): OutEI {
        return new OutEI(this.x[v].o.values(), v);
    }
    numChildren (v: number): number {
        return this.x[v].o.length;
    }
    getParent (v: number): number {
        if (v === 0xFFFFFFFF) {
            return 0xFFFFFFFF;
        }
        const list = this.x[v].i;
        if (list.length === 0) {
            return 0xFFFFFFFF;
        } else {
            return list[0].target as number;
        }
    }
    //-----------------------------------------------------------------
    // MutableReferenceGraph
    addReference (u: number, v: number): ED | null {
        return this.addEdge(u, v);
    }
    //-----------------------------------------------------------------
    // ParentGraph
    locateChild (u: number, name: string): number {
        if (u === 0xFFFFFFFF) {
            for (const v of this.x.keys()) {
                const vert = this.x[v];
                if (vert.i.length === 0 && this._names[v] === name) {
                    return v;
                }
            }
            return 0xFFFFFFFF;
        }
        for (const oe of this.x[u].o) {
            const child = oe.target as number;
            if (name === this._names[child]) {
                return child;
            }
        }
        return 0xFFFFFFFF;
    }
    //-----------------------------------------------------------------
    // AddressableGraph
    locate (absPath: string): number {
        return findRelative(this, 0xFFFFFFFF, absPath) as number;
    }
    locateRelative (path: string, start = 0xFFFFFFFF): number {
        return findRelative(this, start, path) as number;
    }
    path (v: number): string {
        return getPath(this, v);
    }
    readonly x: LayoutGraphDataVertex[] = [];
    readonly _names: string[] = [];
    readonly _updateFrequencies: UpdateFrequency[] = [];
    readonly _layouts: PipelineLayoutData[] = [];
    readonly valueNames: string[] = [];
    readonly attributeIndex: Map<string, number> = new Map<string, number>();
    readonly constantIndex: Map<string, number> = new Map<string, number>();
    readonly shaderLayoutIndex: Map<string, number> = new Map<string, number>();
    readonly effects: Map<string, EffectData> = new Map<string, EffectData>();
    constantMacros = '';
}

function createPool<T> (Constructor: new() => T): RecyclePool<T> {
    return new RecyclePool<T>(() => new Constructor(), 16);
}

export class LayoutGraphObjectPool {
    constructor (renderCommon: RenderCommonObjectPool) {
        this.renderCommon = renderCommon;
    }
    reset (): void {
        this.l.reset(); // Layout
        this.d.reset(); // Descriptor
        this.db.reset(); // DescriptorBlock
        this.dbf.reset(); // DescriptorBlockFlattened
        this.dbi.reset(); // DescriptorBlockIndex
        this.dgbi.reset(); // DescriptorGroupBlockIndex
        this.dd.reset(); // DescriptorDB
        this.rp.reset(); // RenderPhase
        this.lg.reset(); // LayoutGraph
        this.ud.reset(); // UniformData
        this.ubd.reset(); // UniformBlockData
        this.dd1.reset(); // DescriptorData
        this.dbd.reset(); // DescriptorBlockData
        this.dsld.reset(); // DescriptorSetLayoutData
        this.dsd.reset(); // DescriptorSetData
        this.pld.reset(); // PipelineLayoutData
        this.sbd.reset(); // ShaderBindingData
        this.sld.reset(); // ShaderLayoutData
        this.td.reset(); // TechniqueData
        this.ed.reset(); // EffectData
        this.spd.reset(); // ShaderProgramData
        this.rsd.reset(); // RenderStageData
        this.rpd.reset(); // RenderPhaseData
        this.lgd.reset(); // LayoutGraphData
    }
    createLayout (): Layout {
        const v = this.l.add(); // Layout
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
        accessType: MemoryAccessBit = MemoryAccessBit.READ_ONLY,
        viewDimension: ViewDimension = ViewDimension.UNKNOWN,
        sampleType: SampleType = SampleType.FLOAT,
        format: Format = Format.UNKNOWN,
    ): DescriptorGroupBlockIndex {
        const v = this.dgbi.add(); // DescriptorGroupBlockIndex
        v.updateFrequency = updateFrequency;
        v.parameterType = parameterType;
        v.descriptorType = descriptorType;
        v.visibility = visibility;
        v.accessType = accessType;
        v.viewDimension = viewDimension;
        v.sampleType = sampleType;
        v.format = format;
        return v;
    }
    createDescriptorDB (): DescriptorDB {
        const v = this.dd.add(); // DescriptorDB
        v.reset();
        return v;
    }
    createRenderPhase (): RenderPhase {
        const v = this.rp.add(); // RenderPhase
        v.reset();
        return v;
    }
    createLayoutGraph (): LayoutGraph {
        const v = this.lg.add(); // LayoutGraph
        v.clear();
        return v;
    }
    createUniformData (
        uniformID = 0xFFFFFFFF,
        uniformType: Type = Type.UNKNOWN,
        offset = 0,
    ): UniformData {
        const v = this.ud.add(); // UniformData
        v.reset(uniformID, uniformType, offset);
        return v;
    }
    createUniformBlockData (): UniformBlockData {
        const v = this.ubd.add(); // UniformBlockData
        v.reset();
        return v;
    }
    createDescriptorData (
        descriptorID = 0,
        type: Type = Type.UNKNOWN,
        count = 1,
    ): DescriptorData {
        const v = this.dd1.add(); // DescriptorData
        v.reset(descriptorID, type, count);
        return v;
    }
    createDescriptorBlockData (
        type: DescriptorTypeOrder = DescriptorTypeOrder.UNIFORM_BUFFER,
        visibility: ShaderStageFlagBit = ShaderStageFlagBit.NONE,
        capacity = 0,
        accessType: MemoryAccessBit = MemoryAccessBit.READ_ONLY,
        viewDimension: ViewDimension = ViewDimension.UNKNOWN,
        sampleType: SampleType = SampleType.FLOAT,
        format: Format = Format.UNKNOWN,
    ): DescriptorBlockData {
        const v = this.dbd.add(); // DescriptorBlockData
        v.reset(type, visibility, capacity, accessType, viewDimension, sampleType, format);
        return v;
    }
    createDescriptorSetLayoutData (
        slot = 0xFFFFFFFF,
        capacity = 0,
    ): DescriptorSetLayoutData {
        const v = this.dsld.add(); // DescriptorSetLayoutData
        v.reset(slot, capacity);
        return v;
    }
    createDescriptorSetData (
        descriptorSetLayout: DescriptorSetLayout | null = null,
        descriptorSet: DescriptorSet | null = null,
    ): DescriptorSetData {
        const v = this.dsd.add(); // DescriptorSetData
        v.reset(descriptorSetLayout, descriptorSet);
        return v;
    }
    createPipelineLayoutData (): PipelineLayoutData {
        const v = this.pld.add(); // PipelineLayoutData
        v.reset();
        return v;
    }
    createShaderBindingData (): ShaderBindingData {
        const v = this.sbd.add(); // ShaderBindingData
        v.reset();
        return v;
    }
    createShaderLayoutData (): ShaderLayoutData {
        const v = this.sld.add(); // ShaderLayoutData
        v.reset();
        return v;
    }
    createTechniqueData (): TechniqueData {
        const v = this.td.add(); // TechniqueData
        v.reset();
        return v;
    }
    createEffectData (): EffectData {
        const v = this.ed.add(); // EffectData
        v.reset();
        return v;
    }
    createShaderProgramData (): ShaderProgramData {
        const v = this.spd.add(); // ShaderProgramData
        v.reset();
        return v;
    }
    createRenderStageData (): RenderStageData {
        const v = this.rsd.add(); // RenderStageData
        v.reset();
        return v;
    }
    createRenderPhaseData (): RenderPhaseData {
        const v = this.rpd.add(); // RenderPhaseData
        v.reset();
        return v;
    }
    createLayoutGraphData (): LayoutGraphData {
        const v = this.lgd.add(); // LayoutGraphData
        v.clear();
        return v;
    }
    public readonly renderCommon: RenderCommonObjectPool;
    private readonly l: RecyclePool<Layout> = createPool(Layout);
    private readonly d: RecyclePool<Descriptor> = createPool(Descriptor);
    private readonly db: RecyclePool<DescriptorBlock> = createPool(DescriptorBlock);
    private readonly dbf: RecyclePool<DescriptorBlockFlattened> = createPool(DescriptorBlockFlattened);
    private readonly dbi: RecyclePool<DescriptorBlockIndex> = createPool(DescriptorBlockIndex);
    private readonly dgbi: RecyclePool<DescriptorGroupBlockIndex> = createPool(DescriptorGroupBlockIndex);
    private readonly dd: RecyclePool<DescriptorDB> = createPool(DescriptorDB);
    private readonly rp: RecyclePool<RenderPhase> = createPool(RenderPhase);
    private readonly lg: RecyclePool<LayoutGraph> = createPool(LayoutGraph);
    private readonly ud: RecyclePool<UniformData> = createPool(UniformData);
    private readonly ubd: RecyclePool<UniformBlockData> = createPool(UniformBlockData);
    private readonly dd1: RecyclePool<DescriptorData> = createPool(DescriptorData);
    private readonly dbd: RecyclePool<DescriptorBlockData> = createPool(DescriptorBlockData);
    private readonly dsld: RecyclePool<DescriptorSetLayoutData> = createPool(DescriptorSetLayoutData);
    private readonly dsd: RecyclePool<DescriptorSetData> = createPool(DescriptorSetData);
    private readonly pld: RecyclePool<PipelineLayoutData> = createPool(PipelineLayoutData);
    private readonly sbd: RecyclePool<ShaderBindingData> = createPool(ShaderBindingData);
    private readonly sld: RecyclePool<ShaderLayoutData> = createPool(ShaderLayoutData);
    private readonly td: RecyclePool<TechniqueData> = createPool(TechniqueData);
    private readonly ed: RecyclePool<EffectData> = createPool(EffectData);
    private readonly spd: RecyclePool<ShaderProgramData> = createPool(ShaderProgramData);
    private readonly rsd: RecyclePool<RenderStageData> = createPool(RenderStageData);
    private readonly rpd: RecyclePool<RenderPhaseData> = createPool(RenderPhaseData);
    private readonly lgd: RecyclePool<LayoutGraphData> = createPool(LayoutGraphData);
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
    a.n(v.sampleType);
    a.n(v.format);
}

export function loadDescriptorGroupBlockIndex (a: InputArchive, v: DescriptorGroupBlockIndex): void {
    v.updateFrequency = a.n();
    v.parameterType = a.n();
    v.descriptorType = a.n();
    v.visibility = a.n();
    v.accessType = a.n();
    v.viewDimension = a.n();
    v.sampleType = a.n();
    v.format = a.n();
}

export function saveDescriptorDB (a: OutputArchive, v: DescriptorDB): void {
    a.n(v.blocks.size); // Map<string, DescriptorBlock>
    for (const [k1, v1] of v.blocks) {
        saveDescriptorBlockIndex(a, JSON.parse(k1) as DescriptorBlockIndex);
        saveDescriptorBlock(a, v1);
    }
    a.n(v.groupBlocks.size); // Map<string, DescriptorBlock>
    for (const [k1, v1] of v.groupBlocks) {
        saveDescriptorGroupBlockIndex(a, JSON.parse(k1) as DescriptorGroupBlockIndex);
        saveDescriptorBlock(a, v1);
    }
}

export function loadDescriptorDB (a: InputArchive, v: DescriptorDB): void {
    let sz = 0;
    sz = a.n(); // Map<string, DescriptorBlock>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = new DescriptorBlockIndex();
        loadDescriptorBlockIndex(a, k1);
        const v1 = new DescriptorBlock();
        loadDescriptorBlock(a, v1);
        v.blocks.set(JSON.stringify(k1), v1);
    }
    sz = a.n(); // Map<string, DescriptorBlock>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = new DescriptorGroupBlockIndex();
        loadDescriptorGroupBlockIndex(a, k1);
        const v1 = new DescriptorBlock();
        loadDescriptorBlock(a, v1);
        v.groupBlocks.set(JSON.stringify(k1), v1);
    }
}

export function saveRenderPhase (a: OutputArchive, v: RenderPhase): void {
    a.n(v.shaders.size); // Set<string>
    for (const v1 of v.shaders) {
        a.s(v1);
    }
}

export function loadRenderPhase (a: InputArchive, v: RenderPhase): void {
    let sz = 0;
    sz = a.n(); // Set<string>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = a.s();
        v.shaders.add(v1);
    }
}

export function saveLayoutGraph (a: OutputArchive, g: LayoutGraph): void {
    const numVertices = g.nv();
    const numEdges = g.ne();
    a.n(numVertices);
    a.n(numEdges);
    let numStages = 0;
    let numPhases = 0;
    for (const v of g.v()) {
        switch (g.w(v)) {
        case LayoutGraphValue.RenderStage:
            numStages += 1;
            break;
        case LayoutGraphValue.RenderPhase:
            numPhases += 1;
            break;
        default:
            break;
        }
    }
    a.n(numStages);
    a.n(numPhases);
    for (const v of g.v()) {
        a.n(g.w(v));
        a.n(g.getParent(v));
        a.s(g.getName(v));
        saveDescriptorDB(a, g.getDescriptors(v));
        switch (g.w(v)) {
        case LayoutGraphValue.RenderStage:
            a.n(g.x[v].j as RenderPassType);
            break;
        case LayoutGraphValue.RenderPhase:
            saveRenderPhase(a, g.x[v].j as RenderPhase);
            break;
        default:
            break;
        }
    }
}

export function loadLayoutGraph (a: InputArchive, g: LayoutGraph): void {
    const numVertices = a.n();
    const numEdges = a.n();
    const numStages = a.n();
    const numPhases = a.n();
    for (let v = 0; v !== numVertices; ++v) {
        const id = a.n();
        const u = a.n();
        const name = a.s();
        const descriptors = new DescriptorDB();
        loadDescriptorDB(a, descriptors);
        switch (id) {
        case LayoutGraphValue.RenderStage: {
            const renderStage = a.n();
            g.addVertex<LayoutGraphValue.RenderStage>(LayoutGraphValue.RenderStage, renderStage, name, descriptors, u);
            break;
        }
        case LayoutGraphValue.RenderPhase: {
            const renderPhase = new RenderPhase();
            loadRenderPhase(a, renderPhase);
            g.addVertex<LayoutGraphValue.RenderPhase>(LayoutGraphValue.RenderPhase, renderPhase, name, descriptors, u);
            break;
        }
        default:
            break;
        }
    }
}

export function saveUniformData (a: OutputArchive, v: UniformData): void {
    a.n(v.uniformID);
    a.n(v.uniformType);
    a.n(v.offset);
    a.n(v.size);
}

export function loadUniformData (a: InputArchive, v: UniformData): void {
    v.uniformID = a.n();
    v.uniformType = a.n();
    v.offset = a.n();
    v.size = a.n();
}

export function saveUniformBlockData (a: OutputArchive, v: UniformBlockData): void {
    a.n(v.bufferSize);
    a.n(v.uniforms.length); // UniformData[]
    for (const v1 of v.uniforms) {
        saveUniformData(a, v1);
    }
}

export function loadUniformBlockData (a: InputArchive, v: UniformBlockData): void {
    v.bufferSize = a.n();
    let sz = 0;
    sz = a.n(); // UniformData[]
    v.uniforms.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new UniformData();
        loadUniformData(a, v1);
        v.uniforms[i1] = v1;
    }
}

export function saveDescriptorData (a: OutputArchive, v: DescriptorData): void {
    a.n(v.descriptorID);
    a.n(v.type);
    a.n(v.count);
}

export function loadDescriptorData (a: InputArchive, v: DescriptorData): void {
    v.descriptorID = a.n();
    v.type = a.n();
    v.count = a.n();
}

export function saveDescriptorBlockData (a: OutputArchive, v: DescriptorBlockData): void {
    a.n(v.type);
    a.n(v.visibility);
    a.n(v.offset);
    a.n(v.capacity);
    a.n(v.accessType);
    a.n(v.viewDimension);
    a.n(v.sampleType);
    a.n(v.format);
    a.n(v.descriptors.length); // DescriptorData[]
    for (const v1 of v.descriptors) {
        saveDescriptorData(a, v1);
    }
}

export function loadDescriptorBlockData (a: InputArchive, v: DescriptorBlockData): void {
    v.type = a.n();
    v.visibility = a.n();
    v.offset = a.n();
    v.capacity = a.n();
    v.accessType = a.n();
    v.viewDimension = a.n();
    v.sampleType = a.n();
    v.format = a.n();
    let sz = 0;
    sz = a.n(); // DescriptorData[]
    v.descriptors.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new DescriptorData();
        loadDescriptorData(a, v1);
        v.descriptors[i1] = v1;
    }
}

export function saveDescriptorSetLayoutData (a: OutputArchive, v: DescriptorSetLayoutData): void {
    a.n(v.slot);
    a.n(v.capacity);
    a.n(v.uniformBlockCapacity);
    a.n(v.samplerTextureCapacity);
    a.n(v.descriptorBlocks.length); // DescriptorBlockData[]
    for (const v1 of v.descriptorBlocks) {
        saveDescriptorBlockData(a, v1);
    }
    a.n(v.uniformBlocks.size); // Map<number, UniformBlock>
    for (const [k1, v1] of v.uniformBlocks) {
        a.n(k1);
        saveUniformBlock(a, v1);
    }
    a.n(v.bindingMap.size); // Map<number, number>
    for (const [k1, v1] of v.bindingMap) {
        a.n(k1);
        a.n(v1);
    }
}

export function loadDescriptorSetLayoutData (a: InputArchive, v: DescriptorSetLayoutData): void {
    v.slot = a.n();
    v.capacity = a.n();
    v.uniformBlockCapacity = a.n();
    v.samplerTextureCapacity = a.n();
    let sz = 0;
    sz = a.n(); // DescriptorBlockData[]
    v.descriptorBlocks.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new DescriptorBlockData();
        loadDescriptorBlockData(a, v1);
        v.descriptorBlocks[i1] = v1;
    }
    sz = a.n(); // Map<number, UniformBlock>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = new UniformBlock();
        loadUniformBlock(a, v1);
        v.uniformBlocks.set(k1, v1);
    }
    sz = a.n(); // Map<number, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = a.n();
        v.bindingMap.set(k1, v1);
    }
}

export function saveDescriptorSetData (a: OutputArchive, v: DescriptorSetData): void {
    saveDescriptorSetLayoutData(a, v.descriptorSetLayoutData);
    saveDescriptorSetLayoutInfo(a, v.descriptorSetLayoutInfo);
    // skip, v.descriptorSetLayout: DescriptorSetLayout
    // skip, v.descriptorSet: DescriptorSet
}

export function loadDescriptorSetData (a: InputArchive, v: DescriptorSetData): void {
    loadDescriptorSetLayoutData(a, v.descriptorSetLayoutData);
    loadDescriptorSetLayoutInfo(a, v.descriptorSetLayoutInfo);
    // skip, v.descriptorSetLayout: DescriptorSetLayout
    // skip, v.descriptorSet: DescriptorSet
}

export function savePipelineLayoutData (a: OutputArchive, v: PipelineLayoutData): void {
    a.n(v.descriptorSets.size); // Map<UpdateFrequency, DescriptorSetData>
    for (const [k1, v1] of v.descriptorSets) {
        a.n(k1);
        saveDescriptorSetData(a, v1);
    }
    a.n(v.descriptorGroups.size); // Map<UpdateFrequency, DescriptorSetData>
    for (const [k1, v1] of v.descriptorGroups) {
        a.n(k1);
        saveDescriptorSetData(a, v1);
    }
}

export function loadPipelineLayoutData (a: InputArchive, v: PipelineLayoutData): void {
    let sz = 0;
    sz = a.n(); // Map<UpdateFrequency, DescriptorSetData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = new DescriptorSetData();
        loadDescriptorSetData(a, v1);
        v.descriptorSets.set(k1, v1);
    }
    sz = a.n(); // Map<UpdateFrequency, DescriptorSetData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = new DescriptorSetData();
        loadDescriptorSetData(a, v1);
        v.descriptorGroups.set(k1, v1);
    }
}

export function saveShaderBindingData (a: OutputArchive, v: ShaderBindingData): void {
    a.n(v.descriptorBindings.size); // Map<number, number>
    for (const [k1, v1] of v.descriptorBindings) {
        a.n(k1);
        a.n(v1);
    }
}

export function loadShaderBindingData (a: InputArchive, v: ShaderBindingData): void {
    let sz = 0;
    sz = a.n(); // Map<number, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = a.n();
        v.descriptorBindings.set(k1, v1);
    }
}

export function saveShaderLayoutData (a: OutputArchive, v: ShaderLayoutData): void {
    a.n(v.layoutData.size); // Map<UpdateFrequency, DescriptorSetLayoutData>
    for (const [k1, v1] of v.layoutData) {
        a.n(k1);
        saveDescriptorSetLayoutData(a, v1);
    }
    a.n(v.bindingData.size); // Map<UpdateFrequency, ShaderBindingData>
    for (const [k1, v1] of v.bindingData) {
        a.n(k1);
        saveShaderBindingData(a, v1);
    }
}

export function loadShaderLayoutData (a: InputArchive, v: ShaderLayoutData): void {
    let sz = 0;
    sz = a.n(); // Map<UpdateFrequency, DescriptorSetLayoutData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = new DescriptorSetLayoutData();
        loadDescriptorSetLayoutData(a, v1);
        v.layoutData.set(k1, v1);
    }
    sz = a.n(); // Map<UpdateFrequency, ShaderBindingData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = new ShaderBindingData();
        loadShaderBindingData(a, v1);
        v.bindingData.set(k1, v1);
    }
}

export function saveTechniqueData (a: OutputArchive, v: TechniqueData): void {
    a.n(v.passes.length); // ShaderLayoutData[]
    for (const v1 of v.passes) {
        saveShaderLayoutData(a, v1);
    }
}

export function loadTechniqueData (a: InputArchive, v: TechniqueData): void {
    let sz = 0;
    sz = a.n(); // ShaderLayoutData[]
    v.passes.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new ShaderLayoutData();
        loadShaderLayoutData(a, v1);
        v.passes[i1] = v1;
    }
}

export function saveEffectData (a: OutputArchive, v: EffectData): void {
    a.n(v.techniques.size); // Map<string, TechniqueData>
    for (const [k1, v1] of v.techniques) {
        a.s(k1);
        saveTechniqueData(a, v1);
    }
}

export function loadEffectData (a: InputArchive, v: EffectData): void {
    let sz = 0;
    sz = a.n(); // Map<string, TechniqueData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new TechniqueData();
        loadTechniqueData(a, v1);
        v.techniques.set(k1, v1);
    }
}

export function saveShaderProgramData (a: OutputArchive, v: ShaderProgramData): void {
    savePipelineLayoutData(a, v.layout);
    // skip, v.pipelineLayout: PipelineLayout
}

export function loadShaderProgramData (a: InputArchive, v: ShaderProgramData): void {
    loadPipelineLayoutData(a, v.layout);
    // skip, v.pipelineLayout: PipelineLayout
}

export function saveRenderStageData (a: OutputArchive, v: RenderStageData): void {
    a.n(v.descriptorVisibility.size); // Map<number, ShaderStageFlagBit>
    for (const [k1, v1] of v.descriptorVisibility) {
        a.n(k1);
        a.n(v1);
    }
}

export function loadRenderStageData (a: InputArchive, v: RenderStageData): void {
    let sz = 0;
    sz = a.n(); // Map<number, ShaderStageFlagBit>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.n();
        const v1 = a.n();
        v.descriptorVisibility.set(k1, v1);
    }
}

export function saveRenderPhaseData (a: OutputArchive, v: RenderPhaseData): void {
    a.s(v.rootSignature);
    a.n(v.shaderPrograms.length); // ShaderProgramData[]
    for (const v1 of v.shaderPrograms) {
        saveShaderProgramData(a, v1);
    }
    a.n(v.shaderIndex.size); // Map<string, number>
    for (const [k1, v1] of v.shaderIndex) {
        a.s(k1);
        a.n(v1);
    }
    // skip, v.pipelineLayout: PipelineLayout
}

export function loadRenderPhaseData (a: InputArchive, v: RenderPhaseData): void {
    v.rootSignature = a.s();
    let sz = 0;
    sz = a.n(); // ShaderProgramData[]
    v.shaderPrograms.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        const v1 = new ShaderProgramData();
        loadShaderProgramData(a, v1);
        v.shaderPrograms[i1] = v1;
    }
    sz = a.n(); // Map<string, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = a.n();
        v.shaderIndex.set(k1, v1);
    }
    // skip, v.pipelineLayout: PipelineLayout
}

export function saveLayoutGraphData (a: OutputArchive, g: LayoutGraphData): void {
    const numVertices = g.nv();
    const numEdges = g.ne();
    a.n(numVertices);
    a.n(numEdges);
    let numStages = 0;
    let numPhases = 0;
    for (const v of g.v()) {
        switch (g.w(v)) {
        case LayoutGraphDataValue.RenderStage:
            numStages += 1;
            break;
        case LayoutGraphDataValue.RenderPhase:
            numPhases += 1;
            break;
        default:
            break;
        }
    }
    a.n(numStages);
    a.n(numPhases);
    for (const v of g.v()) {
        a.n(g.w(v));
        a.n(g.getParent(v));
        a.s(g.getName(v));
        a.n(g.getUpdate(v));
        savePipelineLayoutData(a, g.getLayout(v));
        switch (g.w(v)) {
        case LayoutGraphDataValue.RenderStage:
            saveRenderStageData(a, g.x[v].j as RenderStageData);
            break;
        case LayoutGraphDataValue.RenderPhase:
            saveRenderPhaseData(a, g.x[v].j as RenderPhaseData);
            break;
        default:
            break;
        }
    }
    a.n(g.valueNames.length); // string[]
    for (const v1 of g.valueNames) {
        a.s(v1);
    }
    a.n(g.attributeIndex.size); // Map<string, number>
    for (const [k1, v1] of g.attributeIndex) {
        a.s(k1);
        a.n(v1);
    }
    a.n(g.constantIndex.size); // Map<string, number>
    for (const [k1, v1] of g.constantIndex) {
        a.s(k1);
        a.n(v1);
    }
    a.n(g.shaderLayoutIndex.size); // Map<string, number>
    for (const [k1, v1] of g.shaderLayoutIndex) {
        a.s(k1);
        a.n(v1);
    }
    a.n(g.effects.size); // Map<string, EffectData>
    for (const [k1, v1] of g.effects) {
        a.s(k1);
        saveEffectData(a, v1);
    }
}

export function loadLayoutGraphData (a: InputArchive, g: LayoutGraphData): void {
    const numVertices = a.n();
    const numEdges = a.n();
    const numStages = a.n();
    const numPhases = a.n();
    for (let v = 0; v !== numVertices; ++v) {
        const id = a.n();
        const u = a.n();
        const name = a.s();
        const update = a.n();
        const layout = new PipelineLayoutData();
        loadPipelineLayoutData(a, layout);
        switch (id) {
        case LayoutGraphDataValue.RenderStage: {
            const renderStage = new RenderStageData();
            loadRenderStageData(a, renderStage);
            g.addVertex<LayoutGraphDataValue.RenderStage>(LayoutGraphDataValue.RenderStage, renderStage, name, update, layout, u);
            break;
        }
        case LayoutGraphDataValue.RenderPhase: {
            const renderPhase = new RenderPhaseData();
            loadRenderPhaseData(a, renderPhase);
            g.addVertex<LayoutGraphDataValue.RenderPhase>(LayoutGraphDataValue.RenderPhase, renderPhase, name, update, layout, u);
            break;
        }
        default:
            break;
        }
    }
    let sz = 0;
    sz = a.n(); // string[]
    g.valueNames.length = sz;
    for (let i1 = 0; i1 !== sz; ++i1) {
        g.valueNames[i1] = a.s();
    }
    sz = a.n(); // Map<string, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = a.n();
        g.attributeIndex.set(k1, v1);
    }
    sz = a.n(); // Map<string, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = a.n();
        g.constantIndex.set(k1, v1);
    }
    sz = a.n(); // Map<string, number>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = a.n();
        g.shaderLayoutIndex.set(k1, v1);
    }
    sz = a.n(); // Map<string, EffectData>
    for (let i1 = 0; i1 !== sz; ++i1) {
        const k1 = a.s();
        const v1 = new EffectData();
        loadEffectData(a, v1);
        g.effects.set(k1, v1);
    }
}
