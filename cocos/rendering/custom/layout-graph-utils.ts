/****************************************************************************
 Copyright (c) 2021-2022 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

/* eslint-disable max-len */
import { EffectAsset } from '../../asset/assets';
import { assert } from '../../core';
import { DescriptorSetLayout, DescriptorSetLayoutBinding, DescriptorSetLayoutInfo, DescriptorType, Device, ShaderStageFlagBit, Type, Uniform, UniformBlock } from '../../gfx';
import { DefaultVisitor, depthFirstSearch, GraphColor, MutableVertexPropertyMap } from './graph';
import { DescriptorBlockData, DescriptorData, DescriptorDB, DescriptorSetData, DescriptorSetLayoutData, LayoutGraph, LayoutGraphData, LayoutGraphDataValue, LayoutGraphValue, PipelineLayoutData, RenderPhase, RenderPhaseData, RenderStageData, ShaderProgramData } from './layout-graph';
import { LayoutGraphBuilder } from './pipeline';
import { UpdateFrequency, getUpdateFrequencyName, getDescriptorTypeOrderName, Descriptor, DescriptorBlock, DescriptorBlockFlattened, DescriptorBlockIndex, DescriptorTypeOrder, ParameterType } from './types';

function getGfxTypeName (type: Type): string {
    switch (type) {
    case Type.UNKNOWN: return 'Unknown';
    case Type.BOOL: return 'Bool';
    case Type.BOOL2: return 'Bool2';
    case Type.BOOL3: return 'Bool3';
    case Type.BOOL4: return 'Bool4';
    case Type.INT: return 'Int';
    case Type.INT2: return 'Int2';
    case Type.INT3: return 'Int3';
    case Type.INT4: return 'Int4';
    case Type.UINT: return 'Uint';
    case Type.UINT2: return 'Uint2';
    case Type.UINT3: return 'Uint3';
    case Type.UINT4: return 'Uint4';
    case Type.FLOAT: return 'Float';
    case Type.FLOAT2: return 'Float2';
    case Type.FLOAT3: return 'Float3';
    case Type.FLOAT4: return 'Float4';
    case Type.MAT2: return 'Mat2';
    case Type.MAT2X3: return 'Mat2x3';
    case Type.MAT2X4: return 'Mat2x4';
    case Type.MAT3X2: return 'Mat3x2';
    case Type.MAT3: return 'Mat3';
    case Type.MAT3X4: return 'Mat3x4';
    case Type.MAT4X2: return 'Mat4x2';
    case Type.MAT4X3: return 'Mat4x3';
    case Type.MAT4: return 'Mat4';
    case Type.SAMPLER1D: return 'Sampler1D';
    case Type.SAMPLER1D_ARRAY: return 'Sampler1DArray';
    case Type.SAMPLER2D: return 'Sampler2D';
    case Type.SAMPLER2D_ARRAY: return 'Sampler2DArray';
    case Type.SAMPLER3D: return 'Sampler3D';
    case Type.SAMPLER_CUBE: return 'SamplerCube';
    case Type.SAMPLER: return 'Sampler';
    case Type.TEXTURE1D: return 'Texture1D';
    case Type.TEXTURE1D_ARRAY: return 'Texture1DArray';
    case Type.TEXTURE2D: return 'Texture2D';
    case Type.TEXTURE2D_ARRAY: return 'Texture2DArray';
    case Type.TEXTURE3D: return 'Texture3D';
    case Type.TEXTURE_CUBE: return 'TextureCube';
    case Type.IMAGE1D: return 'Image1D';
    case Type.IMAGE1D_ARRAY: return 'Image1DArray';
    case Type.IMAGE2D: return 'Image2D';
    case Type.IMAGE2D_ARRAY: return 'Image2DArray';
    case Type.IMAGE3D: return 'Image3D';
    case Type.IMAGE_CUBE: return 'ImageCube';
    case Type.SUBPASS_INPUT: return 'SubpassInput';
    case Type.COUNT: return 'Count';
    default: return 'Unknown';
    }
}

export function getGfxDescriptorType (type: DescriptorTypeOrder): DescriptorType {
    switch (type) {
    case DescriptorTypeOrder.UNIFORM_BUFFER:
        return DescriptorType.UNIFORM_BUFFER;
    case DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER:
        return DescriptorType.DYNAMIC_UNIFORM_BUFFER;
    case DescriptorTypeOrder.SAMPLER_TEXTURE:
        return DescriptorType.SAMPLER_TEXTURE;
    case DescriptorTypeOrder.SAMPLER:
        return DescriptorType.SAMPLER;
    case DescriptorTypeOrder.TEXTURE:
        return DescriptorType.TEXTURE;
    case DescriptorTypeOrder.STORAGE_BUFFER:
        return DescriptorType.STORAGE_BUFFER;
    case DescriptorTypeOrder.DYNAMIC_STORAGE_BUFFER:
        return DescriptorType.DYNAMIC_STORAGE_BUFFER;
    case DescriptorTypeOrder.STORAGE_IMAGE:
        return DescriptorType.STORAGE_IMAGE;
    case DescriptorTypeOrder.INPUT_ATTACHMENT:
        return DescriptorType.INPUT_ATTACHMENT;
    default:
        console.error('DescriptorType not found');
        return DescriptorType.INPUT_ATTACHMENT;
    }
}

function hasFlag (flags: ShaderStageFlagBit, flagToTest: ShaderStageFlagBit): boolean {
    return (flags & flagToTest) !== 0;
}

function getVisibilityName (stage: ShaderStageFlagBit): string {
    let count = 0;
    let str = '';
    if (hasFlag(stage, ShaderStageFlagBit.VERTEX)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Vertex';
    }
    if (hasFlag(stage, ShaderStageFlagBit.CONTROL)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Control';
    }
    if (hasFlag(stage, ShaderStageFlagBit.EVALUATION)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Evaluation';
    }
    if (hasFlag(stage, ShaderStageFlagBit.GEOMETRY)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Geometry';
    }
    if (hasFlag(stage, ShaderStageFlagBit.FRAGMENT)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Fragment';
    }
    if (hasFlag(stage, ShaderStageFlagBit.COMPUTE)) {
        if (count++) {
            str += ' | ';
        }
        str += 'Compute';
    }
    if (stage === ShaderStageFlagBit.ALL) {
        if (count++) {
            str += ' | ';
        }
        str += 'All';
    }
    return str;
}

export class PrintVisitor extends DefaultVisitor {
    discoverVertex (u: number, g: LayoutGraphData) {
        const ppl: PipelineLayoutData = g.getLayout(u);
        const name: string = g._names[u];
        const freq: UpdateFrequency = g._updateFrequencies[u];
        this.oss += `${this.space}"${name}": `;
        if (g.holds(LayoutGraphDataValue.RenderStage, u)) {
            this.oss += `RenderStage {\n`;
        } else {
            this.oss += `RenderPhase {\n`;
        }
        this.space = indent(this.space);

        // eslint-disable-next-line no-loop-func
        ppl.descriptorSets.forEach((value, key) => {
            this.oss += `${this.space}DescriptorSet<${getUpdateFrequencyName(key)}> {\n`;
            this.space = indent(this.space);
            const uniformBlocks = value.descriptorSetLayoutData.uniformBlocks;
            uniformBlocks.forEach((uniformBlock, attrNameID) => {
                const name = g.valueNames[attrNameID];
                this.oss += `${this.space}UniformBlock "${name}" {\n`;
                for (const u of uniformBlock.members) {
                    if (u.count > 1) {
                        this.oss += `${this.space}    ${u.name}[${u.count}]: ${getGfxTypeName(u.type)}\n`;
                    } else {
                        this.oss += `${this.space}    ${u.name}: ${getGfxTypeName(u.type)}\n`;
                    }
                }
                this.oss += `${this.space}}\n`;
            });

            const blocks = value.descriptorSetLayoutData.descriptorBlocks;
            for (let j = 0; j < blocks.length; ++j) {
                const block = blocks[j];
                this.oss += `${this.space}Block<${getDescriptorTypeOrderName(block.type)}, ${getVisibilityName(block.visibility)}> {\n`;
                this.oss += `${this.space}    offset: ${block.offset}\n`;
                this.oss += `${this.space}    capacity: ${block.capacity}\n`;
                this.oss += `${this.space}    count: ${block.descriptors.length}\n`;
                if (block.descriptors.length > 0) {
                    this.oss += `${this.space}    Descriptors{ \n`;
                    const count = 0;
                    for (let k = 0; k < block.descriptors.length; ++k) {
                        const d: DescriptorData = block.descriptors[k];
                        // if (count++) {
                        this.oss += this.space;
                        this.oss += '        ';
                        const n: string = g.valueNames[d.descriptorID];
                        this.oss += `"${n}`;
                        if (d.count !== 1) {
                            this.oss += `[${d.count}]`;
                        }
                        this.oss += '"';
                        // }
                        this.oss += '\n';
                    }
                    this.oss += `${this.space}    }\n`;
                }
                this.oss += `${this.space}}\n`;
            }
            this.space = unindent(this.space);
            this.oss += `${this.space}}\n`;
        });
    }
    finishVertex (v: number, g: LayoutGraphData) {
        this.space = unindent(this.space);
        this.oss += `${this.space}}\n`;
    }
    space = '';
    oss = '';
}

function indent (space: string): string {
    return `${space}    `;
}

function unindent (space: string): string {
    return space.substring(0, space.length > 4 ? space.length - 4 : 0);
}

function convertDescriptorBlock (block: DescriptorBlock): DescriptorBlockFlattened {
    const flattened = new DescriptorBlockFlattened();

    const descriptors = Array.from(block.descriptors).sort(
        (a, b) => String(a[0]).localeCompare(b[0]),
    );

    descriptors.forEach((v: [string, Descriptor]) => {
        const name: string = v[0];
        const d = v[1];
        flattened.descriptorNames.push(name);
        flattened.descriptors.push(d);
    });

    const uniformBlocks = Array.from(block.uniformBlocks).sort(
        (a, b) => String(a[0]).localeCompare(b[0]),
    );

    uniformBlocks.forEach((v: [string, UniformBlock]) => {
        const name = v[0];
        const uniformBlock = v[1];
        flattened.uniformBlockNames.push(name);
        flattened.uniformBlocks.push(uniformBlock);
    });
    flattened.count = block.count;
    flattened.capacity = block.capacity;
    return flattened;
}

class DescriptorCounter {
    public addDescriptor (key: string, name: string, count: number) {
        const v = this.counter.get(key);
        if (v === undefined) {
            this.counter.set(key, count);
            this.inspector.set(key, [name]);
            return;
        }
        this.counter.set(key, v + count);
        this.inspector.get(key)?.push(name);
    }
    readonly counter = new Map<string, number>();
    readonly inspector = new Map<string, Array<string>>();
}

class LayoutGraphPrintVisitor extends DefaultVisitor {
    discoverVertex (v: number, g: LayoutGraph) {
        const info: DescriptorDB = g.getDescriptors(v);
        const name = g.getName(v);

        this.oss += `${this.space}"${name}": `;
        switch (g.id(v)) {
        case LayoutGraphValue.RenderStage:
            this.oss += `RenderStage {\n`;
            break;
        case LayoutGraphValue.RenderPhase:
            this.oss += `RenderPhase {\n`;
            break;
        default:
            this.oss += `unknown LayoutGraphValue {\n`;
            break;
        }
        this.space = indent(this.space);

        const sortedMap: Map<string, DescriptorBlock> = new Map<string, DescriptorBlock>(
            Array.from(info.blocks).sort((a, b) => String(a[0]).localeCompare(b[0])),
        );

        sortedMap.forEach((block: DescriptorBlock, key: string) => {
            const index: DescriptorBlockIndex = JSON.parse(key);
            const flat = convertDescriptorBlock(block);
            this.oss += `${this.space}DescriptorBlock {\n`;
            this.space = indent(this.space);
            this.oss += `${this.space}updateRate: ${getUpdateFrequencyName(index.updateFrequency)}\n`;
            this.oss += `${this.space}type: ${getDescriptorTypeOrderName(index.descriptorType)}\n`;
            this.oss += `${this.space}visibility: ${getVisibilityName(index.visibility)}\n`;
            this.oss += `${this.space}descriptors: [${flat.descriptorNames.join(', ')}]\n`;
            this.oss += `${this.space}uniformBlocks: [`;
            for (let i = 0; i < flat.uniformBlocks.length; ++i) {
                if (i) {
                    this.oss += ', ';
                }
                this.oss += `${flat.uniformBlocks[i].name}`;
            }
            this.oss += `]\n`;
            this.oss += `${this.space}count: ${flat.count}\n`;
            this.oss += `${this.space}capacity: ${flat.capacity}\n`;
            this.space = unindent(this.space);
            this.oss += `${this.space}}\n`;
        });
    }
    finishVertex (v: number, g: LayoutGraphData) {
        this.space = unindent(this.space);
        this.oss += `${this.space}}\n`;
    }
    space = '';
    oss = '';
}

function getPassName (pass: EffectAsset.IPassInfo): string {
    if (pass.pass === undefined) {
        return 'default';
    }
    return pass.pass;
}
function getPhaseName (pass: EffectAsset.IPassInfo): string {
    if (pass.phase === undefined) {
        return 'default';
    }
    if (typeof (pass.phase) === 'number') {
        return pass.phase.toString();
    }
    return pass.phase;
}

export class VisibilityIndex {
    constructor (
        updateFrequency = UpdateFrequency.PER_INSTANCE,
        parameterType = ParameterType.TABLE,
        descriptorType = DescriptorTypeOrder.UNIFORM_BUFFER,
    ) {
        this.updateFrequency = updateFrequency;
        this.parameterType = parameterType;
        this.descriptorType = descriptorType;
    }
    updateFrequency: UpdateFrequency;
    parameterType: ParameterType;
    descriptorType: DescriptorTypeOrder;
}

export class VisibilityBlock {
    public mergeVisibility (name: string, vis: ShaderStageFlagBit) {
        const v0 = this.descriptors.get(name);
        if (v0 === undefined) {
            this.descriptors.set(name, vis);
        } else {
            this.descriptors.set(name, v0 | vis);
        }
    }
    public getVisibility (name: string): ShaderStageFlagBit {
        const v = this.descriptors.get(name);
        if (v === undefined) {
            console.error(`Can't find visibility for descriptor: ${name}`);
            return ShaderStageFlagBit.NONE;
        }
        return v;
    }
    descriptors = new Map<string, ShaderStageFlagBit>();
}

export class VisibilityDB {
    public getBlock (index: VisibilityIndex): VisibilityBlock {
        const key = JSON.stringify(index);
        let block = this.blocks.get(key);
        if (block === undefined) {
            block = new VisibilityBlock();
            this.blocks.set(key, block);
        }
        return block;
    }
    blocks = new Map<string, VisibilityBlock>();
}

export class VisibilityPass {
    public getPhase (phaseName: string): VisibilityDB {
        const phase = this.phases.get(phaseName);
        if (phase === undefined) {
            const newPhase = new VisibilityDB();
            this.phases.set(phaseName, newPhase);
            return newPhase;
        }
        return phase;
    }
    phases = new Map<string, VisibilityDB>();
}

export class VisibilityGraph {
    public getPass (passName: string): VisibilityPass {
        const pass = this.passes.get(passName);
        if (pass === undefined) {
            const newPass = new VisibilityPass();
            this.passes.set(passName, newPass);
            return newPass;
        }
        return pass;
    }
    private merge (
        rate: UpdateFrequency,
        order: DescriptorTypeOrder,
        infoArray: EffectAsset.IBlockInfo[] |
        EffectAsset.IBufferInfo[] |
        EffectAsset.ISamplerInfo[] |
        EffectAsset.IInputAttachmentInfo[] |
        EffectAsset.IImageInfo[] |
        EffectAsset.ISamplerTextureInfo[] |
        EffectAsset.ITextureInfo[],
        db: VisibilityDB,
    ) {
        const blockIndex = new VisibilityIndex(
            rate,
            ParameterType.TABLE,
            order,
        );
        const block = db.getBlock(blockIndex);
        for (const info of infoArray) {
            block.mergeVisibility(info.name, info.stageFlags);
        }
    }
    public mergeEffect (asset: EffectAsset) {
        for (const tech of asset.techniques) {
            for (const pass of tech.passes) {
                const programName = pass.program;
                let shader: EffectAsset.IShaderInfo | null = null;
                for (const shaderInfo of asset.shaders) {
                    if (shaderInfo.name === programName) {
                        shader = shaderInfo;
                    }
                }
                if (!shader) {
                    continue;
                }
                if (shader.descriptors === undefined) {
                    console.warn(`No descriptors in shader: ${programName}, please reimport ALL effects`);
                    continue;
                }
                const passName = getPassName(pass);
                const passData = this.getPass(passName);
                const phaseName = getPhaseName(pass);
                const phaseData = passData.getPhase(phaseName);
                for (const list of shader.descriptors) {
                    this.merge(list.rate, DescriptorTypeOrder.UNIFORM_BUFFER, list.blocks, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.STORAGE_BUFFER, list.buffers, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.TEXTURE, list.textures, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.SAMPLER_TEXTURE, list.samplerTextures, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.SAMPLER, list.samplers, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.STORAGE_IMAGE, list.images, phaseData);
                    this.merge(list.rate, DescriptorTypeOrder.INPUT_ATTACHMENT, list.subpassInputs, phaseData);
                }
            }
        }
    }
    passes = new Map<string, VisibilityPass>();
}

class VectorGraphColorMap implements MutableVertexPropertyMap<GraphColor> {
    constructor (sz: number) {
        this.colors = new Array<GraphColor>(sz);
    }
    get (u: number): GraphColor {
        return this.colors[u];
    }
    put (u: number, value: GraphColor): void {
        this.colors[u] = value;
    }
    readonly colors: Array<GraphColor>;
}

export class LayoutGraphInfo {
    constructor (visg: VisibilityGraph) {
        this.visg = visg;
    }
    lg = new LayoutGraph();
    visg: VisibilityGraph;
    readonly enableDebug = false;
    private getPassID (passName: string): number {
        const lg = this.lg;
        let passID = lg.locateChild(lg.nullVertex(), passName);
        if (passID === lg.nullVertex()) {
            passID = lg.addVertex<LayoutGraphValue.RenderStage>(
                LayoutGraphValue.RenderStage, 0,
                passName, new DescriptorDB(),
                lg.nullVertex(),
            );
        }
        return passID;
    }
    private getPhaseID (phaseName: string, passID: number): number {
        const lg = this.lg;
        let phaseID = lg.locateChild(passID, phaseName);
        if (phaseID === lg.nullVertex()) {
            phaseID = lg.addVertex<LayoutGraphValue.RenderPhase>(
                LayoutGraphValue.RenderPhase, new RenderPhase(),
                phaseName, new DescriptorDB(),
                passID,
            );
        }
        return phaseID;
    }
    private getDescriptorBlock (key: string, descriptorDB: DescriptorDB): DescriptorBlock {
        const value = descriptorDB.blocks.get(key);
        if (value === undefined) {
            const uniformBlock: DescriptorBlock = new DescriptorBlock();
            descriptorDB.blocks.set(key, uniformBlock);
            return uniformBlock;
        }
        return value;
    }
    private checkConsistency (lhs: UniformBlock, rhs: UniformBlock): boolean {
        if (lhs.count !== 1) {
            return false;
        }
        if (lhs.members.length !== rhs.members.length) {
            return false;
        }
        for (let i = 0; i < lhs.members.length; ++i) {
            if (lhs.members[i].name !== rhs.members[i].name) {
                return false;
            }
            if (lhs.members[i].type !== rhs.members[i].type) {
                return false;
            }
            if (lhs.members[i].count !== rhs.members[i].count) {
                return false;
            }
        }
        return true;
    }
    private makeUniformBlock (info: EffectAsset.IBlockInfo): UniformBlock {
        const uniformBlock = new UniformBlock(0, 0, info.name);
        uniformBlock.count = 1;
        for (const member of info.members) {
            uniformBlock.members.push(new Uniform(member.name, member.type, member.count));
        }
        return uniformBlock;
    }
    private addDescriptor (block: DescriptorBlock, name: string, type = Type.UNKNOWN) {
        const value = block.descriptors.get(name);
        if (value === undefined) {
            block.descriptors.set(name, new Descriptor(type));
            ++block.capacity;
            ++block.count;
            return;
        }
        if (value.type !== type) {
            console.warn(`Type mismatch for descriptor ${name}`);
        }
    }
    private addUniformBlock (block: DescriptorBlock,
        name: string, gfxBlock: UniformBlock): void {
        const value = block.uniformBlocks.get(name);
        if (value === undefined) {
            block.uniformBlocks.set(name, gfxBlock);
            return;
        }
        if (!this.checkConsistency(value, gfxBlock)) {
            console.warn(`Uniform block ${name} is inconsistent in the same block`);
        }
    }
    private buildBlocks (visDB: VisibilityDB, rate: UpdateFrequency, blocks: EffectAsset.IBlockInfo[], db: DescriptorDB, counter: DescriptorCounter) {
        const visBlock = visDB.getBlock({
            updateFrequency: rate,
            parameterType: ParameterType.TABLE,
            descriptorType: DescriptorTypeOrder.UNIFORM_BUFFER,
        });
        for (const info of blocks) {
            const blockIndex = new DescriptorBlockIndex(
                rate,
                ParameterType.TABLE,
                DescriptorTypeOrder.UNIFORM_BUFFER,
                visBlock.getVisibility(info.name),
            );
            const key = JSON.stringify(blockIndex);
            const block = this.getDescriptorBlock(key, db);
            if (blockIndex.updateFrequency > UpdateFrequency.PER_BATCH) {
                this.addDescriptor(block, info.name);
                this.addUniformBlock(block, info.name, this.makeUniformBlock(info));
            } else {
                counter.addDescriptor(key, info.name, 1);
            }
        }
    }
    private buildBuffers (
        visDB: VisibilityDB,
        rate: UpdateFrequency,
        infoArray: EffectAsset.IBufferInfo[],
        type: Type, db: DescriptorDB, counter: DescriptorCounter,
    ) {
        const visBlock = visDB.getBlock({
            updateFrequency: rate,
            parameterType: ParameterType.TABLE,
            descriptorType: DescriptorTypeOrder.STORAGE_BUFFER,
        });
        for (const info of infoArray) {
            const blockIndex = new DescriptorBlockIndex(
                rate,
                ParameterType.TABLE,
                DescriptorTypeOrder.STORAGE_BUFFER,
                visBlock.getVisibility(info.name),
            );
            const key = JSON.stringify(blockIndex);
            const block = this.getDescriptorBlock(key, db);
            if (blockIndex.updateFrequency > UpdateFrequency.PER_BATCH) {
                this.addDescriptor(block, info.name, type);
            } else {
                counter.addDescriptor(key, info.name, 1);
            }
        }
    }
    private buildNonTextures (
        visDB: VisibilityDB,
        rate: UpdateFrequency,
        order: DescriptorTypeOrder,
        infoArray: EffectAsset.ISamplerInfo[] | EffectAsset.IInputAttachmentInfo[],
        type: Type, db: DescriptorDB, counter: DescriptorCounter,
    ) {
        const visBlock = visDB.getBlock({
            updateFrequency: rate,
            parameterType: ParameterType.TABLE,
            descriptorType: order,
        });
        for (const info of infoArray) {
            const blockIndex = new DescriptorBlockIndex(
                rate,
                ParameterType.TABLE,
                order,
                visBlock.getVisibility(info.name),
            );
            const key = JSON.stringify(blockIndex);
            const block = this.getDescriptorBlock(key, db);
            if (blockIndex.updateFrequency > UpdateFrequency.PER_BATCH) {
                this.addDescriptor(block, info.name, type);
            } else {
                counter.addDescriptor(key, info.name, info.count);
            }
        }
    }
    private buildTextures (
        visDB: VisibilityDB,
        rate: UpdateFrequency,
        order: DescriptorTypeOrder,
        infoArray: EffectAsset.IImageInfo[] | EffectAsset.ISamplerTextureInfo[] | EffectAsset.ITextureInfo[],
        db: DescriptorDB, counter: DescriptorCounter,
    ) {
        const visBlock = visDB.getBlock({
            updateFrequency: rate,
            parameterType: ParameterType.TABLE,
            descriptorType: order,
        });
        for (const info of infoArray) {
            const blockIndex = new DescriptorBlockIndex(
                rate,
                ParameterType.TABLE,
                order,
                visBlock.getVisibility(info.name),
            );
            const key = JSON.stringify(blockIndex);
            const block = this.getDescriptorBlock(key, db);
            if (blockIndex.updateFrequency > UpdateFrequency.PER_BATCH) {
                this.addDescriptor(block, info.name, info.type);
            } else {
                counter.addDescriptor(key, info.name, info.count);
            }
        }
    }
    public addEffect (asset: EffectAsset): void {
        const lg = this.lg;
        for (const tech of asset.techniques) {
            for (const pass of tech.passes) {
                const programName = pass.program;
                let shader: EffectAsset.IShaderInfo | null = null;
                for (const shaderInfo of asset.shaders) {
                    if (shaderInfo.name === programName) {
                        shader = shaderInfo;
                    }
                }
                if (!shader) {
                    console.warn(`program: ${programName} not found`);
                    continue;
                }
                if (shader.descriptors === undefined) {
                    console.warn(`No descriptors in shader: ${programName}, please reimport ALL effects`);
                    continue;
                }
                // get database
                const passName = getPassName(pass);
                const phaseName = getPhaseName(pass);
                const passID = this.getPassID(passName);
                const phaseID = this.getPhaseID(phaseName, passID);
                const passVis = this.visg.getPass(passName);
                const visDB = passVis.getPhase(phaseName);
                const db = lg.getDescriptors(phaseID);
                const counter = new DescriptorCounter();

                // merge descriptors and reserve capacity
                for (const list of shader.descriptors) {
                    this.buildBlocks(visDB, list.rate, list.blocks, db, counter);
                    this.buildBuffers(visDB, list.rate, list.buffers, Type.UNKNOWN, db, counter);
                    this.buildNonTextures(visDB, list.rate, DescriptorTypeOrder.SAMPLER, list.samplers, Type.SAMPLER, db, counter);
                    this.buildNonTextures(visDB, list.rate, DescriptorTypeOrder.INPUT_ATTACHMENT, list.subpassInputs, Type.SAMPLER, db, counter);
                    this.buildTextures(visDB, list.rate, DescriptorTypeOrder.TEXTURE, list.textures, db, counter);
                    this.buildTextures(visDB, list.rate, DescriptorTypeOrder.SAMPLER_TEXTURE, list.samplerTextures, db, counter);
                    this.buildTextures(visDB, list.rate, DescriptorTypeOrder.STORAGE_IMAGE, list.images, db, counter);
                }

                // update max capacity and debug info
                counter.counter.forEach((v: number, key: string) => {
                    const block = this.getDescriptorBlock(key, db);
                    if (v > block.capacity) {
                        block.capacity = Math.max(block.capacity, v);
                        if (this.enableDebug) {
                            const names = counter.inspector.get(key);
                            if (names === undefined) {
                                return;
                            }
                            block.descriptors.clear();
                            for (const name of names) {
                                block.descriptors.set(name, new Descriptor());
                            }
                        }
                    }
                });
            }
        }
    }
    public build (): number {
        const lg = this.lg;
        const visMap = new Map<number, VisibilityDB>();
        // merge phase to pass
        for (const v of lg.vertices()) {
            if (lg.id(v) === LayoutGraphValue.RenderStage) {
                visMap.set(v, new VisibilityDB());
                continue;
            }
            const phaseID = v;
            const parentID = lg.getParent(phaseID);
            if (lg.id(parentID) !== LayoutGraphValue.RenderStage) {
                console.error(`phase: ${lg.getName(phaseID)} has no parent stage`);
                return 1;
            }
            const phaseDB = lg.getDescriptors(phaseID);
            const passVisDB = visMap.get(parentID);
            if (!passVisDB) {
                console.error(`pass: ${lg.getName(parentID)} has no visibility database`);
                return 1;
            }
            for (const [key, block] of phaseDB.blocks) {
                const index: DescriptorBlockIndex = JSON.parse(key);
                if (index.updateFrequency <= UpdateFrequency.PER_PHASE) {
                    continue;
                }
                const visIndex = new VisibilityIndex(index.updateFrequency, index.parameterType, index.descriptorType);
                const passVisBlock = passVisDB.getBlock(visIndex);
                for (const [name, d] of block.descriptors) {
                    passVisBlock.mergeVisibility(name, index.visibility);
                }
            }
        }
        for (const v of lg.vertices()) {
            if (lg.id(v) === LayoutGraphValue.RenderStage) {
                continue;
            }
            const phaseID = v;
            const parentID = lg.getParent(phaseID);
            if (lg.id(parentID) !== LayoutGraphValue.RenderStage) {
                console.error(`phase: ${lg.getName(phaseID)} has no parent stage`);
                return 1;
            }
            const passDB = lg.getDescriptors(parentID);
            const phaseDB = lg.getDescriptors(phaseID);
            const passVisDB = visMap.get(parentID);
            if (passVisDB === undefined) {
                console.error(`pass: ${lg.getName(parentID)} has no visibility database`);
                return 1;
            }
            for (const [key0, block] of phaseDB.blocks) {
                const index0: DescriptorBlockIndex = JSON.parse(key0);
                if (index0.updateFrequency <= UpdateFrequency.PER_PHASE) {
                    continue;
                }
                const visIndex = new VisibilityIndex(
                    index0.updateFrequency, index0.parameterType, index0.descriptorType,
                );
                const passVisBlock = passVisDB.getBlock(visIndex);

                for (const [name, d] of block.descriptors) {
                    const vis = passVisBlock.getVisibility(name);
                    let passBlock: DescriptorBlock;
                    if (vis === index0.visibility) {
                        passBlock = this.getDescriptorBlock(key0, passDB);
                    } else {
                        const index = new DescriptorBlockIndex(
                            index0.updateFrequency,
                            index0.parameterType,
                            index0.descriptorType,
                            vis,
                        );
                        const key = JSON.stringify(index);
                        passBlock = this.getDescriptorBlock(key, passDB);
                    }
                    this.addDescriptor(passBlock, name, d.type);
                    if (index0.descriptorType !== DescriptorTypeOrder.UNIFORM_BUFFER) {
                        continue;
                    }
                    const b = block.uniformBlocks.get(name);
                    if (!b) {
                        console.error(`uniform block: ${name} not found`);
                        return 1;
                    }
                    this.addUniformBlock(passBlock, name, b);
                }
            }
        }
        // update pass
        for (const passID of lg.vertices()) {
            if (lg.id(passID) !== LayoutGraphValue.RenderStage) {
                continue;
            }
            const passDB = lg.getDescriptors(passID);
            // update children phases
            for (const e of lg.children(passID)) {
                const phaseID = lg.child(e);
                const phaseDB = lg.getDescriptors(phaseID);
                for (const [key, passBlock] of passDB.blocks) {
                    const index: DescriptorBlockIndex = JSON.parse(key);
                    if (index.updateFrequency !== UpdateFrequency.PER_PASS) {
                        console.error(`phase: ${lg.getName(phaseID)} update frequency is not PER_PASS`);
                        return 1;
                    }
                    if (passBlock.count === 0) {
                        console.error(`pass: ${lg.getName(passID)} count is 0`);
                        return 1;
                    }
                    if (passBlock.capacity !== passBlock.count) {
                        console.error(`pass: ${lg.getName(passID)} capacity does not equal count`);
                        return 1;
                    }
                    const phaseBlock = this.getDescriptorBlock(key, phaseDB);
                    phaseBlock.descriptors.clear();
                    phaseBlock.uniformBlocks.clear();
                    phaseBlock.capacity = passBlock.capacity;
                    phaseBlock.count = passBlock.count;
                    for (const [name, d] of passBlock.descriptors) {
                        phaseBlock.descriptors.set(name, d);
                    }
                    for (const [name, b] of passBlock.uniformBlocks) {
                        phaseBlock.uniformBlocks.set(name, b);
                    }
                }
            }
        }
        return 0;
    }
    public print (): string {
        const print = new LayoutGraphPrintVisitor();
        const colorMap = new VectorGraphColorMap(this.lg.numVertices());
        depthFirstSearch(this.lg, print, colorMap);
        return print.oss;
    }
}

function buildLayoutGraphDataImpl (graph: LayoutGraph, builder: LayoutGraphBuilder) {
    for (const v of graph.vertices()) {
        const db = graph.getDescriptors(v);
        let minLevel = UpdateFrequency.PER_INSTANCE;
        let maxLevel = UpdateFrequency.PER_PASS;
        switch (graph.id(v)) {
        case LayoutGraphValue.RenderStage: {
            const vertID = builder.addRenderStage(graph.getName(v));
            if (vertID !== v) {
                console.error('vertex id mismatch');
            }
            minLevel = UpdateFrequency.PER_PASS;
            maxLevel = UpdateFrequency.PER_PASS;
            break;
        }
        case LayoutGraphValue.RenderPhase: {
            const parentID = graph.getParent(v);
            const vertID = builder.addRenderPhase(graph.getName(v), parentID);
            if (vertID !== v) {
                console.error('vertex id mismatch');
            }
            const phase = graph.getRenderPhase(v);
            for (const shaderName of phase.shaders) {
                builder.addShader(shaderName, v);
            }
            minLevel = UpdateFrequency.PER_INSTANCE;
            maxLevel = UpdateFrequency.PER_PHASE;
            break;
        }
        default:
            console.error('unknown vertex type');
            minLevel = UpdateFrequency.PER_INSTANCE;
            minLevel = UpdateFrequency.PER_PASS;
            break;
        }

        const flattenedBlocks = Array.from(db.blocks).sort(
            (lhs: [string, DescriptorBlock], rhs: [string, DescriptorBlock]) => {
                const lhsIndex: DescriptorBlockIndex = JSON.parse(lhs[0]);
                const rhsIndex: DescriptorBlockIndex = JSON.parse(rhs[0]);
                const lhsValue =                    lhsIndex.updateFrequency * 10000
                    + lhsIndex.parameterType * 1000
                    + lhsIndex.descriptorType * 100
                    + lhsIndex.visibility;
                const rhsValue =                    rhsIndex.updateFrequency * 10000
                    + rhsIndex.parameterType * 1000
                    + rhsIndex.descriptorType * 100
                    + rhsIndex.visibility;
                return lhsValue - rhsValue;
            },
        );

        flattenedBlocks.forEach((value: [string, DescriptorBlock]) => {
            const key = value[0];
            const block = value[1];
            const index: DescriptorBlockIndex = JSON.parse(key);
            if (index.updateFrequency > maxLevel || index.updateFrequency < minLevel) {
                return;
            }
            const flattened = convertDescriptorBlock(block);
            if (block.capacity === 0) {
                console.error('block capacity is 0');
                return;
            }
            if (index.updateFrequency > UpdateFrequency.PER_BATCH) {
                builder.addDescriptorBlock(v, index, flattened);
                for (let i = 0; i < flattened.uniformBlockNames.length; ++i) {
                    builder.addUniformBlock(v, index, flattened.uniformBlockNames[i], flattened.uniformBlocks[i]);
                }
            } else {
                builder.reserveDescriptorBlock(v, index, flattened);
            }
        });
    }
}

class LayoutGraphBuilder2 implements LayoutGraphBuilder {
    public constructor (lg: LayoutGraphData) {
        this.lg = lg;
    }
    clear (): void {
        this.lg.clear();
    }
    addRenderStage (name: string): number {
        return this.lg.addVertex<LayoutGraphDataValue.RenderStage>(
            LayoutGraphDataValue.RenderStage,
            new RenderStageData(), name,
            UpdateFrequency.PER_PASS, new PipelineLayoutData(),
        );
    }
    addRenderPhase (name: string, parentID: number): number {
        return this.lg.addVertex<LayoutGraphDataValue.RenderPhase>(
            LayoutGraphDataValue.RenderPhase,
            new RenderPhaseData(), name,
            UpdateFrequency.PER_PHASE, new PipelineLayoutData(),
            parentID,
        );
    }
    addShader (name: string, parentPhaseID: number): void {
        const lg = this.lg;
        const phaseData = lg.getRenderPhase(parentPhaseID);
        // 填充shaderData数据
        const shaderData = new ShaderProgramData();
        const id = phaseData.shaderPrograms.length;
        phaseData.shaderPrograms.push(shaderData);
        phaseData.shaderIndex.set(name, id);
        // 注册shader所在的phase的ID
        lg.shaderLayoutIndex.set(name, parentPhaseID);
    }
    private getDescriptorSetData (ppl: PipelineLayoutData, rate: UpdateFrequency): DescriptorSetData {
        const data = ppl.descriptorSets.get(rate);
        if (data === undefined) {
            const newData = new DescriptorSetData();
            ppl.descriptorSets.set(rate, newData);
            return newData;
        }
        return data;
    }
    private getDescriptorID (name: string): number {
        const lg = this.lg;
        const nameID = lg.attributeIndex.get(name);
        if (nameID === undefined) {
            const newID = lg.valueNames.length;
            lg.attributeIndex.set(name, newID);
            lg.valueNames.push(name);
            return newID;
        }
        return nameID;
    }
    addDescriptorBlock (nodeID: number, index: DescriptorBlockIndex, block: Readonly<DescriptorBlockFlattened>): void {
        if (block.capacity <= 0) {
            console.error('empty block');
            return;
        }
        if (block.descriptorNames.length !== block.descriptors.length) {
            console.error('error descriptor');
            return;
        }
        if (block.uniformBlockNames.length !== block.uniformBlocks.length) {
            console.error('error uniform');
            return;
        }
        if (!(index.updateFrequency >= UpdateFrequency.PER_INSTANCE
            && index.updateFrequency <= UpdateFrequency.PER_PASS)) {
            console.error('invalid update frequency');
            return;
        }

        const lg = this.lg;
        const ppl: PipelineLayoutData = lg.getLayout(nodeID);
        const setData = this.getDescriptorSetData(ppl, index.updateFrequency);
        const layout = setData.descriptorSetLayoutData;

        const dstBlock = new DescriptorBlockData(index.descriptorType, index.visibility, block.capacity);
        dstBlock.offset = layout.capacity;
        layout.descriptorBlocks.push(dstBlock);
        for (let j = 0; j < block.descriptors.length; ++j) {
            const name: string = block.descriptorNames[j];
            const d: Descriptor = block.descriptors[j];
            const nameID = this.getDescriptorID(name);
            const data = new DescriptorData(nameID, d.count);
            dstBlock.descriptors.push(data);
        }
        layout.capacity += block.capacity;
    }
    addUniformBlock (nodeID: number, index: DescriptorBlockIndex, name: string, uniformBlock: UniformBlock): void {
        const g: LayoutGraphData = this.lg;
        const ppl: PipelineLayoutData = g.getLayout(nodeID);
        const setData = this.getDescriptorSetData(ppl, index.updateFrequency);
        const layout = setData.descriptorSetLayoutData;
        const nameID = this.getDescriptorID(name);
        layout.uniformBlocks.set(nameID, uniformBlock);
    }
    reserveDescriptorBlock (nodeID: number, index: DescriptorBlockIndex, block: DescriptorBlockFlattened): void {
        if (block.capacity <= 0) {
            console.error('empty block');
            return;
        }
        const g: LayoutGraphData = this.lg;
        const ppl: PipelineLayoutData = g.getLayout(nodeID);
        const setData = this.getDescriptorSetData(ppl, index.updateFrequency);
        const layout = setData.descriptorSetLayoutData;

        const dstBlock = new DescriptorBlockData(index.descriptorType, index.visibility, block.capacity);
        dstBlock.offset = layout.capacity;
        layout.descriptorBlocks.push(dstBlock);
        layout.capacity += block.capacity;
    }
    compile (): number {
        return 0;
    }
    print (): string {
        const g: LayoutGraphData = this.lg;
        const visitor = new PrintVisitor();
        const colorMap = new VectorGraphColorMap(g.numVertices());
        depthFirstSearch(g, visitor, colorMap);
        return visitor.oss;
    }
    readonly lg: LayoutGraphData;
}

export function buildLayoutGraphData (lg: LayoutGraph, lgData: LayoutGraphData) {
    const builder = new LayoutGraphBuilder2(lgData);
    buildLayoutGraphDataImpl(lg, builder);
    builder.compile();
}

export function printLayoutGraphData (g: LayoutGraphData): string {
    const visitor = new PrintVisitor();
    const colorMap = new VectorGraphColorMap(g.numVertices());
    depthFirstSearch(g, visitor, colorMap);
    return visitor.oss;
}

function initializeDescriptorSetLayoutInfo (layoutData: DescriptorSetLayoutData,
    info: DescriptorSetLayoutInfo): void {
    for (let i = 0; i < layoutData.descriptorBlocks.length; ++i) {
        const block = layoutData.descriptorBlocks[i];
        let slot = block.offset;
        for (let j = 0; j < block.descriptors.length; ++j) {
            const d = block.descriptors[j];
            const binding = new DescriptorSetLayoutBinding();
            binding.binding = slot;
            binding.descriptorType = getGfxDescriptorType(block.type);
            binding.count = d.count;
            binding.stageFlags = block.visibility;
            binding.immutableSamplers = [];
            info.bindings.push(binding);
            slot += d.count;
        }
    }
}

let _emptyDescriptorSetLayout: DescriptorSetLayout;

export function initializeLayoutGraphData (device: Device, lg: LayoutGraphData) {
    _emptyDescriptorSetLayout = device.createDescriptorSetLayout(new DescriptorSetLayoutInfo());
    for (const v of lg.vertices()) {
        const layoutData = lg.getLayout(v);
        for (const [_, set] of layoutData.descriptorSets) {
            if (set.descriptorSetLayout !== null) {
                continue;
            }
            initializeDescriptorSetLayoutInfo(set.descriptorSetLayoutData,
                set.descriptorSetLayoutInfo);
            set.descriptorSetLayout = device.createDescriptorSetLayout(set.descriptorSetLayoutInfo);
        }
    }
}

export function terminateLayoutGraphData (lg: LayoutGraphData) {
    for (const v of lg.vertices()) {
        const layoutData = lg.getLayout(v);
        for (const [_, set] of layoutData.descriptorSets) {
            if (set.descriptorSetLayout !== null) {
                set.descriptorSetLayout.destroy();
            }
        }
    }
    _emptyDescriptorSetLayout.destroy();
}

export function getDescriptorSetLayout (lg: LayoutGraphData,
    passID: number, phaseID: number, rate: UpdateFrequency): DescriptorSetLayout {
    if (rate < UpdateFrequency.PER_PASS) {
        const phaseData = lg.getLayout(phaseID);
        const data = phaseData.descriptorSets.get(rate);
        if (data) {
            if (!data.descriptorSetLayout) {
                console.error('descriptor set layout not initialized');
                return _emptyDescriptorSetLayout;
            }
            return data.descriptorSetLayout;
        }
        return _emptyDescriptorSetLayout;
    }

    assert(rate === UpdateFrequency.PER_PASS);
    assert(passID === lg.getParent(phaseID));

    const passData = lg.getLayout(passID);
    const data = passData.descriptorSets.get(rate);
    if (data) {
        if (!data.descriptorSetLayout) {
            console.error('descriptor set layout not initialized');
            return _emptyDescriptorSetLayout;
        }
        return data.descriptorSetLayout;
    }
    return _emptyDescriptorSetLayout;
}

const _emptyDescriptorSetLayoutData = new DescriptorSetLayoutData();

export function getDescriptorSetLayoutData (lg: LayoutGraphData,
    passID: number, phaseID: number, rate: UpdateFrequency): DescriptorSetLayoutData {
    if (rate < UpdateFrequency.PER_PASS) {
        const phaseData = lg.getLayout(phaseID);
        const data = phaseData.descriptorSets.get(rate);
        if (data) {
            return data.descriptorSetLayoutData;
        }
        return _emptyDescriptorSetLayoutData;
    }

    assert(rate === UpdateFrequency.PER_PASS);
    assert(passID === lg.getParent(phaseID));

    const passData = lg.getLayout(passID);
    const data = passData.descriptorSets.get(rate);
    if (data) {
        return data.descriptorSetLayoutData;
    }
    return _emptyDescriptorSetLayoutData;
}
