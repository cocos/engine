/****************************************************************************
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
****************************************************************************/

/* eslint-disable max-len */
import { EffectAsset } from '../../asset/assets';
import { assert, error, warn } from '../../core';
import { ShaderStageFlagBit, Type, Uniform, UniformBlock } from '../../gfx';
import { DefaultVisitor, depthFirstSearch, GraphColor, MutableVertexPropertyMap } from './graph';
import { DescriptorBlockData, DescriptorData, DescriptorDB, DescriptorSetData, LayoutGraph, LayoutGraphData, LayoutGraphDataValue, LayoutGraphValue, PipelineLayoutData, RenderPassType, RenderPhase, RenderPhaseData, RenderStageData, ShaderProgramData } from './layout-graph';
import { ENABLE_SUBPASS, getOrCreateDescriptorID, sortDescriptorBlocks } from './layout-graph-utils';
import { UpdateFrequency, Descriptor, DescriptorBlock, DescriptorBlockFlattened, DescriptorBlockIndex, DescriptorTypeOrder, ParameterType } from './types';
import { getUpdateFrequencyName, getDescriptorTypeOrderName } from './types-names';

export function getLayoutGraphDataVersion (): number {
    return 1;
}

// get name of gfx.Type
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

// check ShaderStageFlagBit has certain bits
function hasFlag (flags: ShaderStageFlagBit, flagToTest: ShaderStageFlagBit): boolean {
    return (flags & flagToTest) !== 0;
}

// get name of visibility
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

// print LayoutGraphData
export class PrintVisitor extends DefaultVisitor {
    discoverVertex (u: number, g: LayoutGraphData): void {
        const ppl: PipelineLayoutData = g.getLayout(u);
        const name: string = g._names[u];
        const freq: UpdateFrequency = g._updateFrequencies[u];
        this.oss += `${this.space}"${name}": `;
        if (g.h(LayoutGraphDataValue.RenderStage, u)) {
            this.oss += `RenderStage {\n`;
        } else {
            this.oss += `RenderPhase {\n`;
        }
        this.space = indent(this.space);

        // eslint-disable-next-line no-loop-func
        ppl.descriptorSets.forEach((value, key): void => {
            this.oss += `${this.space}DescriptorSet<${getUpdateFrequencyName(key)}> {\n`;
            this.space = indent(this.space);
            const uniformBlocks = value.descriptorSetLayoutData.uniformBlocks;
            uniformBlocks.forEach((uniformBlock, attrNameID): void => {
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
    finishVertex (v: number, g: LayoutGraphData): void {
        this.space = unindent(this.space);
        this.oss += `${this.space}}\n`;
    }
    space = '';
    oss = '';
}

// text tools, indent 4 spaces
function indent (space: string): string {
    return `${space}    `;
}

// text tools, unindent 4 spaces
function unindent (space: string): string {
    return space.substring(0, space.length > 4 ? space.length - 4 : 0);
}

// flatten DescriptorBlock to DescriptorBlockFlattened
function convertDescriptorBlock (block: DescriptorBlock): DescriptorBlockFlattened {
    const flattened = new DescriptorBlockFlattened();

    // sort descriptors by name
    const descriptors = Array.from(block.descriptors).sort(
        (a, b): number => String(a[0]).localeCompare(b[0]),
    );

    // flatten descriptors
    descriptors.forEach((v: [string, Descriptor]): void => {
        const name: string = v[0];
        const d = v[1];
        flattened.descriptorNames.push(name);
        flattened.descriptors.push(d);
    });

    // sort uniforms by name
    const uniformBlocks = Array.from(block.uniformBlocks).sort(
        (a, b): number => String(a[0]).localeCompare(b[0]),
    );

    // flatten uniforms
    uniformBlocks.forEach((v: [string, UniformBlock]): void => {
        const name = v[0];
        const uniformBlock = v[1];
        flattened.uniformBlockNames.push(name);
        flattened.uniformBlocks.push(uniformBlock);
    });

    // calculate count and capacity
    flattened.count = block.count;
    flattened.capacity = block.capacity;
    return flattened;
}

// cache of descriptor blocks
class DescriptorCounter {
    public addDescriptor (key: string, name: string, count: number): void {
        // key is DescriptorBlockIndex
        // name is Descriptor name
        // count is Descriptor count
        const v = this.counter.get(key);
        if (v === undefined) {
            this.counter.set(key, count);
            this.inspector.set(key, [name]);
            return;
        }
        this.counter.set(key, v + count);
        this.inspector.get(key)?.push(name);
    }
    // counter is the num of descriptors in each block
    readonly counter = new Map<string, number>();
    readonly inspector = new Map<string, Array<string>>();
}

// print LayoutGraph (not LayoutGraphData)
class LayoutGraphPrintVisitor extends DefaultVisitor {
    discoverVertex (v: number, g: LayoutGraph): void {
        const info: DescriptorDB = g.getDescriptors(v);
        const name = g.getName(v);

        this.oss += `${this.space}"${name}": `;
        switch (g.w(v)) {
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
            Array.from(info.blocks).sort((a, b): number => String(a[0]).localeCompare(b[0])),
        );

        sortedMap.forEach((block: DescriptorBlock, key: string): void => {
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
    finishVertex (v: number, g: LayoutGraphData): void {
        this.space = unindent(this.space);
        this.oss += `${this.space}}\n`;
    }
    space = '';
    oss = '';
}

// get pass name from effect
function getPassName (pass: EffectAsset.IPassInfo): string {
    if (pass.pass === undefined) {
        return 'default';
    }
    return pass.pass;
}

// get phase name from effect
function getPhaseName (pass: EffectAsset.IPassInfo): string {
    if (pass.phase === undefined) {
        return 'default';
    }
    if (typeof (pass.phase) === 'number') {
        return pass.phase.toString();
    }
    return pass.phase;
}

// key of Visibility
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

// descriptors of same visibility
export class VisibilityBlock {
    public mergeVisibility (name: string, vis: ShaderStageFlagBit): void {
        // for each descriptor, merge visibility
        // rate must >= PER_PHASE
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
            error(`Can't find visibility for descriptor: ${name}`);
            return ShaderStageFlagBit.NONE;
        }
        return v;
    }
    descriptors = new Map<string, ShaderStageFlagBit>();
}

// visibility database of phase
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

// visibility database of pass
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
    ): void {
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
    public mergeEffect (asset: EffectAsset): void {
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
                    warn(`No descriptors in shader: ${programName}, please reimport ALL effects`);
                    continue;
                }
                const passName = getPassName(pass);
                const passData = this.getPass(passName);
                const phaseName = getPhaseName(pass);
                const phaseData = passData.getPhase(phaseName);
                for (const list of shader.descriptors) {
                    if (list.rate < (UpdateFrequency.PER_PHASE as number)) {
                        // do not merger PER_BATCH, PER_INSTANCE descriptors
                        continue;
                    }
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

// graph coloring help class
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

// class to layout all descriptors
export class LayoutGraphInfo {
    constructor (visg: VisibilityGraph) {
        this.visg = visg;
    }
    lg = new LayoutGraph();
    visg: VisibilityGraph;
    readonly enableDebug = false;
    private getPassID (passName: string, type: RenderPassType): number {
        const lg = this.lg;
        let passID = lg.locateChild(lg.N, passName);
        if (passID === lg.N) {
            passID = lg.addVertex<LayoutGraphValue.RenderStage>(
                LayoutGraphValue.RenderStage,
                type,
                passName,
                new DescriptorDB(),
                lg.N,
            );
        }
        assert(passID !== lg.N);
        return passID;
    }
    private getSubpassID (subpassName: string, passID: number): number {
        const lg = this.lg;
        let subpassID = lg.locateChild(passID, subpassName);
        if (subpassID === lg.N) {
            subpassID = lg.addVertex<LayoutGraphValue.RenderStage>(
                LayoutGraphValue.RenderStage,
                RenderPassType.RENDER_SUBPASS,
                subpassName,
                new DescriptorDB(),
                passID,
            );
        }
        assert(subpassID !== lg.N);
        return subpassID;
    }
    private getPhaseID (phaseName: string, subpassOrPassID: number): number {
        const lg = this.lg;
        let phaseID = lg.locateChild(subpassOrPassID, phaseName);
        if (phaseID === lg.N) {
            phaseID = lg.addVertex<LayoutGraphValue.RenderPhase>(
                LayoutGraphValue.RenderPhase,
                new RenderPhase(),
                phaseName,
                new DescriptorDB(),
                subpassOrPassID,
            );
        }
        assert(phaseID !== lg.N);
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
    private addDescriptor (block: DescriptorBlock, name: string, type = Type.UNKNOWN): void {
        const value = block.descriptors.get(name);
        if (value === undefined) {
            block.descriptors.set(name, new Descriptor(type));
            ++block.capacity;
            ++block.count;
            return;
        }
        if (value.type !== type) {
            warn(`Type mismatch for descriptor ${name}`);
        }
    }
    private addUniformBlock (
        block: DescriptorBlock,
        name: string,
        gfxBlock: UniformBlock,
    ): void {
        const value = block.uniformBlocks.get(name);
        if (value === undefined) {
            block.uniformBlocks.set(name, gfxBlock);
            return;
        }
        if (!this.checkConsistency(value, gfxBlock)) {
            warn(`Uniform block ${name} is inconsistent in the same block`);
        }
    }
    private buildBlocks (visDB: VisibilityDB, rate: UpdateFrequency, blocks: EffectAsset.IBlockInfo[], db: DescriptorDB, counter: DescriptorCounter): void {
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
                rate >= UpdateFrequency.PER_PHASE ? visBlock.getVisibility(info.name) : info.stageFlags,
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
        type: Type,
        db: DescriptorDB,
        counter: DescriptorCounter,
    ): void {
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
                rate >= UpdateFrequency.PER_PHASE ? visBlock.getVisibility(info.name) : info.stageFlags,
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
        type: Type,
        db: DescriptorDB,
        counter: DescriptorCounter,
    ): void {
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
                rate >= UpdateFrequency.PER_PHASE ? visBlock.getVisibility(info.name) : info.stageFlags,
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
        db: DescriptorDB,
        counter: DescriptorCounter,
    ): void {
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
                rate >= UpdateFrequency.PER_PHASE ? visBlock.getVisibility(info.name) : info.stageFlags,
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
                    warn(`program: ${programName} not found`);
                    continue;
                }
                if (shader.descriptors === undefined) {
                    warn(`No descriptors in shader: ${programName}, please reimport ALL effects`);
                    continue;
                }
                // get database
                const passName = getPassName(pass);
                const phaseName = getPhaseName(pass);
                const enableSubpass = pass.subpass && pass.subpass !== '' && ENABLE_SUBPASS;
                const passID = this.getPassID(passName, enableSubpass
                    ? RenderPassType.RENDER_PASS : RenderPassType.SINGLE_RENDER_PASS);
                const subpassID: number | undefined = enableSubpass
                    ? this.getSubpassID(pass.subpass!, passID) : undefined;
                const phaseID = this.getPhaseID(phaseName, subpassID || passID);
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
                counter.counter.forEach((v: number, key: string): void => {
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
        for (const v of lg.v()) {
            if (lg.w(v) === LayoutGraphValue.RenderStage) {
                // create visibility database
                visMap.set(v, new VisibilityDB());
                continue;
            }
            const phaseID = v;
            const parentID = lg.getParent(phaseID);
            if (lg.w(parentID) !== LayoutGraphValue.RenderStage) {
                error(`phase: ${lg.getName(phaseID)} has no parent stage`);
                return 1;
            }
            const phaseDB = lg.getDescriptors(phaseID);
            const passVisDB = visMap.get(parentID);
            if (!passVisDB) {
                error(`pass: ${lg.getName(parentID)} has no visibility database`);
                return 1;
            }
            // merge phase visibility to pass visibility
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
        // build phase decriptors
        for (const v of lg.v()) {
            if (lg.w(v) === LayoutGraphValue.RenderStage) {
                continue;
            }
            const phaseID = v;
            const parentID = lg.getParent(phaseID);
            if (lg.w(parentID) !== LayoutGraphValue.RenderStage) {
                error(`phase: ${lg.getName(phaseID)} has no parent stage`);
                return 1;
            }
            const passDB = lg.getDescriptors(parentID);
            const phaseDB = lg.getDescriptors(phaseID);
            const passVisDB = visMap.get(parentID);
            if (passVisDB === undefined) {
                error(`pass: ${lg.getName(parentID)} has no visibility database`);
                return 1;
            }
            for (const [key0, block] of phaseDB.blocks) {
                const index0: DescriptorBlockIndex = JSON.parse(key0);
                if (index0.updateFrequency <= UpdateFrequency.PER_PHASE) {
                    continue;
                }
                const visIndex = new VisibilityIndex(index0.updateFrequency, index0.parameterType, index0.descriptorType);
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
                        error(`uniform block: ${name} not found`);
                        return 1;
                    }
                    this.addUniformBlock(passBlock, name, b);
                }
            }
        }
        // update pass
        for (const passID of lg.v()) {
            // skip RenderPhase
            if (lg.w(passID) !== LayoutGraphValue.RenderStage) {
                continue;
            }
            // skip RENDER_PASS
            if (lg.j<RenderPassType>(passID) === RenderPassType.RENDER_PASS) {
                continue;
            }
            // build SINGLE_RENDER_PASS or RENDER_SUBPASS
            assert(lg.j<RenderPassType>(passID) === RenderPassType.SINGLE_RENDER_PASS
                || lg.j<RenderPassType>(passID) === RenderPassType.RENDER_SUBPASS);
            const passDB = lg.getDescriptors(passID);
            // update children phases
            for (const e of lg.children(passID)) {
                const phaseID = lg.child(e);
                if (lg.w(phaseID) !== LayoutGraphValue.RenderPhase) {
                    error(`pass: ${lg.getName(passID)} is not single_render_pass or render_subpass`);
                    return 1;
                }
                const phaseDB = lg.getDescriptors(phaseID);
                for (const [key, passBlock] of passDB.blocks) {
                    const index: DescriptorBlockIndex = JSON.parse(key);
                    if (index.updateFrequency !== UpdateFrequency.PER_PASS) {
                        error(`phase: ${lg.getName(phaseID)} update frequency is not PER_PASS`);
                        return 1;
                    }
                    if (passBlock.count === 0) {
                        error(`pass: ${lg.getName(passID)} count is 0`);
                        return 1;
                    }
                    if (passBlock.capacity !== passBlock.count) {
                        error(`pass: ${lg.getName(passID)} capacity does not equal count`);
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
        // console.debug(this.print());
        return 0;
    }
    public print (): string {
        const print = new LayoutGraphPrintVisitor();
        const colorMap = new VectorGraphColorMap(this.lg.nv());
        depthFirstSearch(this.lg, print, colorMap);
        return print.oss;
    }
}

// build LayoutGraphData
function buildLayoutGraphDataImpl (graph: LayoutGraph, builder: LayoutGraphBuilder2): void {
    for (const v of graph.v()) {
        const db = graph.getDescriptors(v);
        let minLevel = UpdateFrequency.PER_INSTANCE;
        let maxLevel = UpdateFrequency.PER_PASS;
        let isRenderPass = false;
        switch (graph.w(v)) {
        case LayoutGraphValue.RenderStage: {
            const type = graph.j<RenderPassType>(v);
            const parentID = graph.getParent(v);
            if (type === RenderPassType.RENDER_SUBPASS) {
                assert(parentID !== graph.N);
            } else {
                assert(parentID === graph.N);
            }
            if (type === RenderPassType.RENDER_PASS) {
                isRenderPass = true;
            }
            const vertID = builder.addRenderStage(graph.getName(v), parentID);
            if (vertID !== v) {
                error('vertex id mismatch');
            }
            minLevel = UpdateFrequency.PER_PASS;
            maxLevel = UpdateFrequency.PER_PASS;
            break;
        }
        case LayoutGraphValue.RenderPhase: {
            const parentID = graph.getParent(v);
            const parentType = graph.j<RenderPassType>(parentID);
            assert(parentType === RenderPassType.RENDER_SUBPASS || parentType === RenderPassType.SINGLE_RENDER_PASS);
            const vertID = builder.addRenderPhase(graph.getName(v), parentID);
            if (vertID !== v) {
                error('vertex id mismatch');
            }
            const phase = graph.j<RenderPhase>(v);
            for (const shaderName of phase.shaders) {
                builder.addShader(shaderName, v);
            }
            minLevel = UpdateFrequency.PER_INSTANCE;
            maxLevel = UpdateFrequency.PER_PHASE;
            break;
        }
        default:
            error('unknown vertex type');
            minLevel = UpdateFrequency.PER_INSTANCE;
            minLevel = UpdateFrequency.PER_PASS;
            break;
        }

        if (isRenderPass) {
            assert(db.blocks.size === 0);
            continue;
        }

        const flattenedBlocks = Array.from(db.blocks).sort(sortDescriptorBlocks);

        flattenedBlocks.forEach((value: [string, DescriptorBlock]): void => {
            const key = value[0];
            const block = value[1];
            const index: DescriptorBlockIndex = JSON.parse(key);
            if (index.updateFrequency > maxLevel || index.updateFrequency < minLevel) {
                return;
            }
            const flattened = convertDescriptorBlock(block);
            if (block.capacity === 0) {
                error('block capacity is 0');
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

export function getOrCreateConstantID (lg: LayoutGraphData, name: string): number {
    const nameID = lg.constantIndex.get(name);
    if (nameID === undefined) {
        const newID = lg.valueNames.length;
        lg.constantIndex.set(name, newID);
        lg.valueNames.push(name);
        return newID;
    }
    return nameID;
}

// LayoutGraphData builder
class LayoutGraphBuilder2 {
    public constructor (lg: LayoutGraphData) {
        this.lg = lg;
    }
    clear (): void {
        this.lg.clear();
    }
    addRenderStage (name: string, parentID: number): number {
        return this.lg.addVertex<LayoutGraphDataValue.RenderStage>(
            LayoutGraphDataValue.RenderStage,
            new RenderStageData(),

            name,
            UpdateFrequency.PER_PASS,

            new PipelineLayoutData(),
            parentID,
        );
    }
    addRenderPhase (name: string, parentID: number): number {
        return this.lg.addVertex<LayoutGraphDataValue.RenderPhase>(
            LayoutGraphDataValue.RenderPhase,
            new RenderPhaseData(),

            name,
            UpdateFrequency.PER_PHASE,

            new PipelineLayoutData(),
            parentID,
        );
    }
    addShader (name: string, parentPhaseID: number): void {
        const lg = this.lg;
        const phaseData = lg.j<RenderPhaseData>(parentPhaseID);
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
    addDescriptorBlock (nodeID: number, index: DescriptorBlockIndex, block: Readonly<DescriptorBlockFlattened>): void {
        if (block.capacity <= 0) {
            error('empty block');
            return;
        }
        if (block.descriptorNames.length !== block.descriptors.length) {
            error('error descriptor');
            return;
        }
        if (block.uniformBlockNames.length !== block.uniformBlocks.length) {
            error('error uniform');
            return;
        }
        if (!(index.updateFrequency >= UpdateFrequency.PER_INSTANCE
            && index.updateFrequency <= UpdateFrequency.PER_PASS)) {
            error('invalid update frequency');
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
            const nameID = getOrCreateDescriptorID(lg, name);
            const data = new DescriptorData(nameID, d.type, d.count);
            dstBlock.descriptors.push(data);
        }
        layout.capacity += block.capacity;
        if (index.descriptorType === DescriptorTypeOrder.UNIFORM_BUFFER
            || index.descriptorType === DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER) {
            layout.uniformBlockCapacity += block.capacity;
        } else if (index.descriptorType === DescriptorTypeOrder.SAMPLER_TEXTURE) {
            layout.samplerTextureCapacity += block.capacity;
        }
    }
    addUniformBlock (nodeID: number, index: DescriptorBlockIndex, name: string, uniformBlock: UniformBlock): void {
        const g: LayoutGraphData = this.lg;
        const ppl: PipelineLayoutData = g.getLayout(nodeID);
        const setData = this.getDescriptorSetData(ppl, index.updateFrequency);
        const layout = setData.descriptorSetLayoutData;
        const nameID = getOrCreateDescriptorID(g, name);
        layout.uniformBlocks.set(nameID, uniformBlock);
        // register constant names
        for (const member of uniformBlock.members) {
            getOrCreateConstantID(g, member.name);
        }
    }
    reserveDescriptorBlock (nodeID: number, index: DescriptorBlockIndex, block: DescriptorBlockFlattened): void {
        if (block.capacity <= 0) {
            error('empty block');
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
        if (index.descriptorType === DescriptorTypeOrder.UNIFORM_BUFFER
            || index.descriptorType === DescriptorTypeOrder.DYNAMIC_UNIFORM_BUFFER) {
            layout.uniformBlockCapacity += block.capacity;
        } else if (index.descriptorType === DescriptorTypeOrder.SAMPLER_TEXTURE) {
            layout.samplerTextureCapacity += block.capacity;
        }
    }
    compile (): number {
        // console.debug(this.print());
        return 0;
    }
    print (): string {
        const g: LayoutGraphData = this.lg;
        const visitor = new PrintVisitor();
        const colorMap = new VectorGraphColorMap(g.nv());
        depthFirstSearch(g, visitor, colorMap);
        return visitor.oss;
    }
    readonly lg: LayoutGraphData;
}

export function buildLayoutGraphData (lg: LayoutGraph, lgData: LayoutGraphData): void {
    const builder = new LayoutGraphBuilder2(lgData);
    buildLayoutGraphDataImpl(lg, builder);
    builder.compile();
}

export function printLayoutGraphData (g: LayoutGraphData): string {
    const visitor = new PrintVisitor();
    const colorMap = new VectorGraphColorMap(g.nv());
    depthFirstSearch(g, visitor, colorMap);
    return visitor.oss;
}
