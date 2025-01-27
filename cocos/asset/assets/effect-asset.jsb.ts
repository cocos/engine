/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

import{ cclegacy } from '../../core';
import './asset';
import { patch_cc_EffectAsset } from '../../native-binding/decorators';
import type { EffectAsset as JsbEffectAsset } from './effect-asset';
import type { BlendState, DepthStencilState, RasterizerState, DynamicStateFlags, PrimitiveMode, ShaderStageFlags, Type, Uniform, MemoryAccess, Format, SampleType } from "../../gfx/index.jsb";
import type { RenderPassStage } from '../../rendering/define';
import type { MacroRecord } from '../../render-scene/core/pass-utils';
import { TextureBase } from './texture-base';

declare const jsb: any;

export type EffectAsset = JsbEffectAsset;
export const EffectAsset: typeof JsbEffectAsset = jsb.EffectAsset;

cclegacy.EffectAsset = EffectAsset;

const effectAssetProto: any = EffectAsset.prototype;

effectAssetProto._ctor = function () {
    jsb.Asset.prototype._ctor.apply(this, arguments);
    this.hideInEditor = false;
};

// NOTE: TS cannot merge exported type in multiple modules, so we need to declare namespace EffectAsset again here.
export declare namespace EffectAsset {
    export interface IPropertyInfo {
        type: number; // auto-extracted from shader
        handleInfo?: [string, number, number]; // auto-generated from 'target'
        samplerHash?: number; // auto-generated from 'sampler'
        value?: number[] | string | TextureBase; // default value
        linear?: boolean; // whether to convert the input to linear space first before applying
    }
    // Pass instance itself are compliant to IPassStates too
    export interface IPassStates {
        priority?: number;
        primitive?: PrimitiveMode;
        stage?: RenderPassStage;
        rasterizerState?: RasterizerState;
        depthStencilState?: DepthStencilState;
        blendState?: BlendState;
        dynamicStates?: DynamicStateFlags;
        phase?: string | number;
        pass?: string;
        subpass?: string;
    }
    export interface IPassInfo extends IPassStates {
        program: string; // auto-generated from 'vert' and 'frag'
        embeddedMacros?: MacroRecord;
        propertyIndex?: number;
        switch?: string;
        properties?: Record<string, IPropertyInfo>;
        shader?: IShaderInfo;
    }
    export interface ITechniqueInfo {
        passes: IPassInfo[];
        name?: string;
    }

    export interface IBlockInfo {
        binding: number;
        name: string;
        members: Uniform[];
        stageFlags: ShaderStageFlags;
    }
    export interface ISamplerTextureInfo {
        binding: number;
        name: string;
        type: Type;
        count: number;
        stageFlags: ShaderStageFlags;
        sampleType: SampleType;
    }
    export interface ISamplerInfo {
        set: number;
        binding: number;
        name: string;
        count: number;
        stageFlags: ShaderStageFlags;
    }
    export interface ITextureInfo {
        set: number;
        binding: number;
        name: string;
        type: Type;
        count: number;
        stageFlags: ShaderStageFlags;
        sampleType: SampleType;
    }
    export interface IBufferInfo {
        binding: number;
        name: string;
        memoryAccess: MemoryAccess;
        stageFlags: ShaderStageFlags;
    }
    export interface IImageInfo {
        binding: number;
        name: string;
        type: Type;
        count: number;
        memoryAccess: MemoryAccess;
        stageFlags: ShaderStageFlags;
    }

    export interface IInputAttachmentInfo {
        set: number;
        binding: number;
        name: string;
        count: number;
        stageFlags: ShaderStageFlags;
    }
    export interface IAttributeInfo {
        name: string;
        format: Format;
        isNormalized: boolean;
        stream: number;
        isInstanced: boolean;
        location: number;
        defines: string[];
    }
    export interface IDefineInfo {
        name: string;
        type: string;
        range?: number[];
        options?: string[];
        default?: string;
    }
    export interface IBuiltin {
        name: string;
        defines: string[];
        binding?: number;
    }
    export interface IBuiltinInfo {
        buffers: IBuiltin[];
        blocks: IBuiltin[];
        samplerTextures: IBuiltin[];
        images: IBuiltin[];
    }
    export interface IDescriptorInfo {
        rate: number;
        blocks: IBlockInfo[];
        samplerTextures: ISamplerTextureInfo[];
        samplers: ISamplerInfo[];
        textures: ITextureInfo[];
        buffers: IBufferInfo[];
        images: IImageInfo[];
        subpassInputs: IInputAttachmentInfo[];
    }
    export interface IShaderInfo {
        name: string;
        hash: number;
        glsl4: { vert: string, frag: string, compute?: string };
        glsl3: { vert: string, frag: string, compute?: string };
        glsl1: { vert: string, frag: string };
        builtins: { globals: IBuiltinInfo, locals: IBuiltinInfo, statistics: Record<string, number> };
        defines: IDefineInfo[];
        attributes: IAttributeInfo[];
        blocks: IBlockInfo[];
        samplerTextures: ISamplerTextureInfo[];
        samplers: ISamplerInfo[];
        textures: ITextureInfo[];
        buffers: IBufferInfo[];
        images: IImageInfo[];
        subpassInputs: IInputAttachmentInfo[];
        descriptors: IDescriptorInfo[];
    }
    export interface IPreCompileInfo {
        [name: string]: boolean[] | number[] | string[];
    }
}

// handle meta data, it is generated automatically
patch_cc_EffectAsset({EffectAsset})
