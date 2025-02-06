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

import { BYTEDANCE } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { WebGLEXT } from './webgl-define';
import { WebGLDevice } from './webgl-device';
import {
    IWebGLGPUInputAssembler, IWebGLGPUUniform, IWebGLAttrib, IWebGLGPUDescriptorSet, IWebGLGPUBuffer, IWebGLGPUFramebuffer, IWebGLGPUInput,
    IWebGLGPUPipelineState, IWebGLGPUShader, IWebGLGPUTexture, IWebGLGPUUniformBlock, IWebGLGPUUniformSamplerTexture, IWebGLGPURenderPass,
} from './webgl-gpu-objects';
import {
    BufferUsageBit, ColorMask, CullMode, Format, BufferTextureCopy, Color, Rect,
    FormatInfos, FormatSize, LoadOp, MemoryUsageBit, ShaderStageFlagBit, UniformSamplerTexture,
    TextureFlagBit, TextureType, Type, FormatInfo, DynamicStateFlagBit, BufferSource, DrawInfo,
    IndirectBuffer, DynamicStates, Extent, getTypedArrayConstructor, formatAlignment, Offset, alignTo,
    TextureBlit, Filter,
} from '../base/define';

import { WebGLConstants } from '../gl-constants';
import { assertID, debugID, error, errorID } from '../../core/platform/debug';
import { cclegacy } from '../../core/global-exports';
import { OS } from '../../../pal/system-info/enum-type';

const max = Math.max;
const min = Math.min;

export function GFXFormatToWebGLType (format: Format, gl: WebGLRenderingContext): GLenum {
    switch (format) {
    case Format.R8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.R8SN: return WebGLConstants.BYTE;
    case Format.R8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.R8I: return WebGLConstants.BYTE;
    case Format.R16F: return WebGLEXT.HALF_FLOAT_OES;
    case Format.R16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.R16I: return WebGLConstants.SHORT;
    case Format.R32F: return WebGLConstants.FLOAT;
    case Format.R32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.R32I: return WebGLConstants.INT;

    case Format.RG8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RG8SN: return WebGLConstants.BYTE;
    case Format.RG8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RG8I: return WebGLConstants.BYTE;
    case Format.RG16F: return WebGLEXT.HALF_FLOAT_OES;
    case Format.RG16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.RG16I: return WebGLConstants.SHORT;
    case Format.RG32F: return WebGLConstants.FLOAT;
    case Format.RG32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.RG32I: return WebGLConstants.INT;

    case Format.RGB8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.SRGB8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGB8SN: return WebGLConstants.BYTE;
    case Format.RGB8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGB8I: return WebGLConstants.BYTE;
    case Format.RGB16F: return WebGLEXT.HALF_FLOAT_OES;
    case Format.RGB16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.RGB16I: return WebGLConstants.SHORT;
    case Format.RGB32F: return WebGLConstants.FLOAT;
    case Format.RGB32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.RGB32I: return WebGLConstants.INT;

    case Format.BGRA8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGBA8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.SRGB8_A8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGBA8SN: return WebGLConstants.BYTE;
    case Format.RGBA8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGBA8I: return WebGLConstants.BYTE;
    case Format.RGBA16F: return WebGLEXT.HALF_FLOAT_OES;
    case Format.RGBA16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.RGBA16I: return WebGLConstants.SHORT;
    case Format.RGBA32F: return WebGLConstants.FLOAT;
    case Format.RGBA32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.RGBA32I: return WebGLConstants.INT;

    case Format.R5G6B5: return WebGLConstants.UNSIGNED_SHORT_5_6_5;
    case Format.R11G11B10F: return WebGLConstants.FLOAT;
    case Format.RGB5A1: return WebGLConstants.UNSIGNED_SHORT_5_5_5_1;
    case Format.RGBA4: return WebGLConstants.UNSIGNED_SHORT_4_4_4_4;
    case Format.RGB10A2: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RGB10A2UI: return WebGLConstants.UNSIGNED_INT;
    case Format.RGB9E5: return WebGLConstants.UNSIGNED_BYTE;

    case Format.DEPTH: return WebGLConstants.UNSIGNED_INT;
    case Format.DEPTH_STENCIL: return WebGLEXT.UNSIGNED_INT_24_8_WEBGL;

    case Format.BC1: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC1_SRGB: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC2: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC2_SRGB: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC3: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC3_SRGB: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC4: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC4_SNORM: return WebGLConstants.BYTE;
    case Format.BC5: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC5_SNORM: return WebGLConstants.BYTE;
    case Format.BC6H_SF16: return WebGLConstants.FLOAT;
    case Format.BC6H_UF16: return WebGLConstants.FLOAT;
    case Format.BC7: return WebGLConstants.UNSIGNED_BYTE;
    case Format.BC7_SRGB: return WebGLConstants.UNSIGNED_BYTE;

    case Format.ETC_RGB8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.ETC2_RGB8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.ETC2_SRGB8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.ETC2_RGB8_A1: return WebGLConstants.UNSIGNED_BYTE;
    case Format.ETC2_SRGB8_A1: return WebGLConstants.UNSIGNED_BYTE;
    case Format.EAC_R11: return WebGLConstants.UNSIGNED_BYTE;
    case Format.EAC_R11SN: return WebGLConstants.BYTE;
    case Format.EAC_RG11: return WebGLConstants.UNSIGNED_BYTE;
    case Format.EAC_RG11SN: return WebGLConstants.BYTE;

    case Format.PVRTC_RGB2: return WebGLConstants.UNSIGNED_BYTE;
    case Format.PVRTC_RGBA2: return WebGLConstants.UNSIGNED_BYTE;
    case Format.PVRTC_RGB4: return WebGLConstants.UNSIGNED_BYTE;
    case Format.PVRTC_RGBA4: return WebGLConstants.UNSIGNED_BYTE;
    case Format.PVRTC2_2BPP: return WebGLConstants.UNSIGNED_BYTE;
    case Format.PVRTC2_4BPP: return WebGLConstants.UNSIGNED_BYTE;

    case Format.ASTC_RGBA_4X4:
    case Format.ASTC_RGBA_5X4:
    case Format.ASTC_RGBA_5X5:
    case Format.ASTC_RGBA_6X5:
    case Format.ASTC_RGBA_6X6:
    case Format.ASTC_RGBA_8X5:
    case Format.ASTC_RGBA_8X6:
    case Format.ASTC_RGBA_8X8:
    case Format.ASTC_RGBA_10X5:
    case Format.ASTC_RGBA_10X6:
    case Format.ASTC_RGBA_10X8:
    case Format.ASTC_RGBA_10X10:
    case Format.ASTC_RGBA_12X10:
    case Format.ASTC_RGBA_12X12:
    case Format.ASTC_SRGBA_4X4:
    case Format.ASTC_SRGBA_5X4:
    case Format.ASTC_SRGBA_5X5:
    case Format.ASTC_SRGBA_6X5:
    case Format.ASTC_SRGBA_6X6:
    case Format.ASTC_SRGBA_8X5:
    case Format.ASTC_SRGBA_8X6:
    case Format.ASTC_SRGBA_8X8:
    case Format.ASTC_SRGBA_10X5:
    case Format.ASTC_SRGBA_10X6:
    case Format.ASTC_SRGBA_10X8:
    case Format.ASTC_SRGBA_10X10:
    case Format.ASTC_SRGBA_12X10:
    case Format.ASTC_SRGBA_12X12:
        return WebGLConstants.UNSIGNED_BYTE;

    default: {
        return WebGLConstants.UNSIGNED_BYTE;
    }
    }
}

export function GFXFormatToWebGLInternalFormat (format: Format, gl: WebGLRenderingContext): GLenum {
    switch (format) {
    case Format.R5G6B5: return WebGLConstants.RGB565;
    case Format.RGB5A1: return WebGLConstants.RGB5_A1;
    case Format.RGBA4: return WebGLConstants.RGBA4;
    case Format.RGBA16F: return WebGLEXT.RGBA16F_EXT;
    case Format.RGBA32F: return WebGLEXT.RGBA32F_EXT;
    case Format.SRGB8_A8: return WebGLEXT.SRGB8_ALPHA8_EXT;
    case Format.DEPTH: return WebGLConstants.DEPTH_COMPONENT16;
    case Format.DEPTH_STENCIL: return WebGLConstants.DEPTH_STENCIL;

    default: {
        errorID(16309);
        return WebGLConstants.RGBA;
    }
    }
}

export function GFXFormatToWebGLFormat (format: Format, gl: WebGLRenderingContext): GLenum {
    switch (format) {
    case Format.A8: return WebGLConstants.ALPHA;
    case Format.L8: return WebGLConstants.LUMINANCE;
    case Format.LA8: return WebGLConstants.LUMINANCE_ALPHA;
    case Format.RGB8: return WebGLConstants.RGB;
    case Format.RGB16F: return WebGLConstants.RGB;
    case Format.RGB32F: return WebGLConstants.RGB;
    case Format.BGRA8: return WebGLConstants.RGBA;
    case Format.RGBA8: return WebGLConstants.RGBA;
    case Format.SRGB8_A8: return WebGLConstants.RGBA;
    case Format.RGBA16F: return WebGLConstants.RGBA;
    case Format.RGBA32F: return WebGLConstants.RGBA;
    case Format.R5G6B5: return WebGLConstants.RGB;
    case Format.RGB5A1: return WebGLConstants.RGBA;
    case Format.RGBA4: return WebGLConstants.RGBA;
    case Format.DEPTH: return WebGLConstants.DEPTH_COMPONENT;
    case Format.DEPTH_STENCIL: return WebGLConstants.DEPTH_STENCIL;

    case Format.BC1: return WebGLEXT.COMPRESSED_RGB_S3TC_DXT1_EXT;
    case Format.BC1_ALPHA: return WebGLEXT.COMPRESSED_RGBA_S3TC_DXT1_EXT;
    case Format.BC1_SRGB: return WebGLEXT.COMPRESSED_SRGB_S3TC_DXT1_EXT;
    case Format.BC1_SRGB_ALPHA: return WebGLEXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
    case Format.BC2: return WebGLEXT.COMPRESSED_RGBA_S3TC_DXT3_EXT;
    case Format.BC2_SRGB: return WebGLEXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
    case Format.BC3: return WebGLEXT.COMPRESSED_RGBA_S3TC_DXT5_EXT;
    case Format.BC3_SRGB: return WebGLEXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;

    case Format.ETC_RGB8: return WebGLEXT.COMPRESSED_RGB_ETC1_WEBGL;
    case Format.ETC2_RGB8: return WebGLEXT.COMPRESSED_RGB8_ETC2;
    case Format.ETC2_SRGB8: return WebGLEXT.COMPRESSED_SRGB8_ETC2;
    case Format.ETC2_RGB8_A1: return WebGLEXT.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_SRGB8_A1: return WebGLEXT.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_RGBA8: return WebGLEXT.COMPRESSED_RGBA8_ETC2_EAC;
    case Format.ETC2_SRGB8_A8: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
    case Format.EAC_R11: return WebGLEXT.COMPRESSED_R11_EAC;
    case Format.EAC_R11SN: return WebGLEXT.COMPRESSED_SIGNED_R11_EAC;
    case Format.EAC_RG11: return WebGLEXT.COMPRESSED_RG11_EAC;
    case Format.EAC_RG11SN: return WebGLEXT.COMPRESSED_SIGNED_RG11_EAC;

    case Format.PVRTC_RGB2: return WebGLEXT.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGBA2: return WebGLEXT.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGB4: return WebGLEXT.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
    case Format.PVRTC_RGBA4: return WebGLEXT.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;

    case Format.ASTC_RGBA_4X4: return WebGLEXT.COMPRESSED_RGBA_ASTC_4x4_KHR;
    case Format.ASTC_RGBA_5X4: return WebGLEXT.COMPRESSED_RGBA_ASTC_5x4_KHR;
    case Format.ASTC_RGBA_5X5: return WebGLEXT.COMPRESSED_RGBA_ASTC_5x5_KHR;
    case Format.ASTC_RGBA_6X5: return WebGLEXT.COMPRESSED_RGBA_ASTC_6x5_KHR;
    case Format.ASTC_RGBA_6X6: return WebGLEXT.COMPRESSED_RGBA_ASTC_6x6_KHR;
    case Format.ASTC_RGBA_8X5: return WebGLEXT.COMPRESSED_RGBA_ASTC_8x5_KHR;
    case Format.ASTC_RGBA_8X6: return WebGLEXT.COMPRESSED_RGBA_ASTC_8x6_KHR;
    case Format.ASTC_RGBA_8X8: return WebGLEXT.COMPRESSED_RGBA_ASTC_8x8_KHR;
    case Format.ASTC_RGBA_10X5: return WebGLEXT.COMPRESSED_RGBA_ASTC_10x5_KHR;
    case Format.ASTC_RGBA_10X6: return WebGLEXT.COMPRESSED_RGBA_ASTC_10x6_KHR;
    case Format.ASTC_RGBA_10X8: return WebGLEXT.COMPRESSED_RGBA_ASTC_10x8_KHR;
    case Format.ASTC_RGBA_10X10: return WebGLEXT.COMPRESSED_RGBA_ASTC_10x10_KHR;
    case Format.ASTC_RGBA_12X10: return WebGLEXT.COMPRESSED_RGBA_ASTC_12x10_KHR;
    case Format.ASTC_RGBA_12X12: return WebGLEXT.COMPRESSED_RGBA_ASTC_12x12_KHR;

    case Format.ASTC_SRGBA_4X4: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR;
    case Format.ASTC_SRGBA_5X4: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR;
    case Format.ASTC_SRGBA_5X5: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR;
    case Format.ASTC_SRGBA_6X5: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR;
    case Format.ASTC_SRGBA_6X6: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR;
    case Format.ASTC_SRGBA_8X5: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR;
    case Format.ASTC_SRGBA_8X6: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR;
    case Format.ASTC_SRGBA_8X8: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR;
    case Format.ASTC_SRGBA_10X5: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR;
    case Format.ASTC_SRGBA_10X6: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR;
    case Format.ASTC_SRGBA_10X8: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR;
    case Format.ASTC_SRGBA_10X10: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR;
    case Format.ASTC_SRGBA_12X10: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR;
    case Format.ASTC_SRGBA_12X12: return WebGLEXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR;

    default: {
        errorID(16310);
        return WebGLConstants.RGBA;
    }
    }
}

function GFXTypeToWebGLType (type: Type, gl: WebGLRenderingContext): GLenum {
    switch (type) {
    case Type.BOOL: return WebGLConstants.BOOL;
    case Type.BOOL2: return WebGLConstants.BOOL_VEC2;
    case Type.BOOL3: return WebGLConstants.BOOL_VEC3;
    case Type.BOOL4: return WebGLConstants.BOOL_VEC4;
    case Type.INT: return WebGLConstants.INT;
    case Type.INT2: return WebGLConstants.INT_VEC2;
    case Type.INT3: return WebGLConstants.INT_VEC3;
    case Type.INT4: return WebGLConstants.INT_VEC4;
    case Type.UINT: return WebGLConstants.UNSIGNED_INT;
    case Type.FLOAT: return WebGLConstants.FLOAT;
    case Type.FLOAT2: return WebGLConstants.FLOAT_VEC2;
    case Type.FLOAT3: return WebGLConstants.FLOAT_VEC3;
    case Type.FLOAT4: return WebGLConstants.FLOAT_VEC4;
    case Type.MAT2: return WebGLConstants.FLOAT_MAT2;
    case Type.MAT3: return WebGLConstants.FLOAT_MAT3;
    case Type.MAT4: return WebGLConstants.FLOAT_MAT4;
    case Type.SAMPLER2D: return WebGLConstants.SAMPLER_2D;
    case Type.SAMPLER_CUBE: return WebGLConstants.SAMPLER_CUBE;
    default: {
        errorID(16311);
        return Type.UNKNOWN;
    }
    }
}

function GFXTypeToTypedArrayCtor (type: Type): Int32ArrayConstructor | Float32ArrayConstructor {
    switch (type) {
    case Type.BOOL:
    case Type.BOOL2:
    case Type.BOOL3:
    case Type.BOOL4:
    case Type.INT:
    case Type.INT2:
    case Type.INT3:
    case Type.INT4:
    case Type.UINT:
        return Int32Array;
    case Type.FLOAT:
    case Type.FLOAT2:
    case Type.FLOAT3:
    case Type.FLOAT4:
    case Type.MAT2:
    case Type.MAT3:
    case Type.MAT4:
        return Float32Array;
    default: {
        errorID(16312);
        return Float32Array;
    }
    }
}

function WebGLTypeToGFXType (glType: GLenum, gl: WebGLRenderingContext): Type {
    switch (glType) {
    case WebGLConstants.BOOL: return Type.BOOL;
    case WebGLConstants.BOOL_VEC2: return Type.BOOL2;
    case WebGLConstants.BOOL_VEC3: return Type.BOOL3;
    case WebGLConstants.BOOL_VEC4: return Type.BOOL4;
    case WebGLConstants.INT: return Type.INT;
    case WebGLConstants.INT_VEC2: return Type.INT2;
    case WebGLConstants.INT_VEC3: return Type.INT3;
    case WebGLConstants.INT_VEC4: return Type.INT4;
    case WebGLConstants.UNSIGNED_INT: return Type.UINT;
    case WebGLConstants.FLOAT: return Type.FLOAT;
    case WebGLConstants.FLOAT_VEC2: return Type.FLOAT2;
    case WebGLConstants.FLOAT_VEC3: return Type.FLOAT3;
    case WebGLConstants.FLOAT_VEC4: return Type.FLOAT4;
    case WebGLConstants.FLOAT_MAT2: return Type.MAT2;
    case WebGLConstants.FLOAT_MAT3: return Type.MAT3;
    case WebGLConstants.FLOAT_MAT4: return Type.MAT4;
    case WebGLConstants.SAMPLER_2D: return Type.SAMPLER2D;
    case WebGLConstants.SAMPLER_CUBE: return Type.SAMPLER_CUBE;
    default: {
        errorID(16313);
        return Type.UNKNOWN;
    }
    }
}

function WebGLGetTypeSize (glType: GLenum, gl: WebGLRenderingContext): number {
    switch (glType) {
    case WebGLConstants.BOOL: return 4;
    case WebGLConstants.BOOL_VEC2: return 8;
    case WebGLConstants.BOOL_VEC3: return 12;
    case WebGLConstants.BOOL_VEC4: return 16;
    case WebGLConstants.INT: return 4;
    case WebGLConstants.INT_VEC2: return 8;
    case WebGLConstants.INT_VEC3: return 12;
    case WebGLConstants.INT_VEC4: return 16;
    case WebGLConstants.UNSIGNED_INT: return 4;
    case WebGLConstants.FLOAT: return 4;
    case WebGLConstants.FLOAT_VEC2: return 8;
    case WebGLConstants.FLOAT_VEC3: return 12;
    case WebGLConstants.FLOAT_VEC4: return 16;
    case WebGLConstants.FLOAT_MAT2: return 16;
    case WebGLConstants.FLOAT_MAT3: return 36;
    case WebGLConstants.FLOAT_MAT4: return 64;
    case WebGLConstants.SAMPLER_2D: return 4;
    case WebGLConstants.SAMPLER_CUBE: return 4;
    default: {
        errorID(16314);
        return 0;
    }
    }
}

function WebGLGetComponentCount (glType: GLenum, gl: WebGLRenderingContext): number {
    switch (glType) {
    case WebGLConstants.FLOAT_MAT2: return 2;
    case WebGLConstants.FLOAT_MAT3: return 3;
    case WebGLConstants.FLOAT_MAT4: return 4;
    default: {
        return 1;
    }
    }
}

const WebGLCmpFuncs: GLenum[] = [
    WebGLConstants.NEVER,
    WebGLConstants.LESS,
    WebGLConstants.EQUAL,
    WebGLConstants.LEQUAL,
    WebGLConstants.GREATER,
    WebGLConstants.NOTEQUAL,
    WebGLConstants.GEQUAL,
    WebGLConstants.ALWAYS,
];

const WebGLStencilOps: GLenum[] = [
    0x0000, // WebGLRenderingContext.ZERO,
    0x1E00, // WebGLRenderingContext.KEEP,
    0x1E01, // WebGLRenderingContext.REPLACE,
    0x1E02, // WebGLRenderingContext.INCR,
    0x1E03, // WebGLRenderingContext.DECR,
    0x150A, // WebGLRenderingContext.INVERT,
    0x8507, // WebGLRenderingContext.INCR_WRAP,
    0x8508, // WebGLRenderingContext.DECR_WRAP,
];

const WebGLBlendOps: GLenum[] = [
    0x8006, // WebGLRenderingContext.FUNC_ADD,
    0x800A, // WebGLRenderingContext.FUNC_SUBTRACT,
    0x800B, // WebGLRenderingContext.FUNC_REVERSE_SUBTRACT,
    0x8007, // WebGLRenderingContext.MIN,
    0x8008, // WebGLRenderingContext.MAX,
];

const WebGLBlendFactors: GLenum[] = [
    0x0000, // WebGLRenderingContext.ZERO,
    0x0001, // WebGLRenderingContext.ONE,
    0x0302, // WebGLRenderingContext.SRC_ALPHA,
    0x0304, // WebGLRenderingContext.DST_ALPHA,
    0x0303, // WebGLRenderingContext.ONE_MINUS_SRC_ALPHA,
    0x0305, // WebGLRenderingContext.ONE_MINUS_DST_ALPHA,
    0x0300, // WebGLRenderingContext.SRC_COLOR,
    0x0306, // WebGLRenderingContext.DST_COLOR,
    0x0301, // WebGLRenderingContext.ONE_MINUS_SRC_COLOR,
    0x0307, // WebGLRenderingContext.ONE_MINUS_DST_COLOR,
    0x0308, // WebGLRenderingContext.SRC_ALPHA_SATURATE,
    0x8001, // WebGLRenderingContext.CONSTANT_COLOR,
    0x8002, // WebGLRenderingContext.ONE_MINUS_CONSTANT_COLOR,
    0x8003, // WebGLRenderingContext.CONSTANT_ALPHA,
    0x8004, // WebGLRenderingContext.ONE_MINUS_CONSTANT_ALPHA,
];

export function WebGLCmdFuncCreateBuffer (device: WebGLDevice, gpuBuffer: IWebGLGPUBuffer): void {
    const { gl, stateCache } = device;
    const glUsage: GLenum = gpuBuffer.memUsage & MemoryUsageBit.HOST ? WebGLConstants.DYNAMIC_DRAW : WebGLConstants.STATIC_DRAW;

    if (gpuBuffer.usage & BufferUsageBit.VERTEX) {
        gpuBuffer.glTarget = WebGLConstants.ARRAY_BUFFER;
        const glBuffer = gl.createBuffer();
        if (glBuffer) {
            gpuBuffer.glBuffer = glBuffer;
            if (gpuBuffer.size > 0) {
                if (device.extensions.useVAO) {
                    if (stateCache.glVAO) {
                        device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                        stateCache.glVAO = null;
                    }
                }
                gfxStateCache.gpuInputAssembler = null;

                if (stateCache.glArrayBuffer !== gpuBuffer.glBuffer) {
                    gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
                    stateCache.glArrayBuffer = gpuBuffer.glBuffer;
                }

                gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.size, glUsage);
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                stateCache.glArrayBuffer = null;
            }
        }
    } else if (gpuBuffer.usage & BufferUsageBit.INDEX) {
        gpuBuffer.glTarget = WebGLConstants.ELEMENT_ARRAY_BUFFER;
        const glBuffer = gl.createBuffer();

        if (glBuffer) {
            gpuBuffer.glBuffer = glBuffer;
            if (gpuBuffer.size > 0) {
                if (device.extensions.useVAO) {
                    if (stateCache.glVAO) {
                        device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                        stateCache.glVAO = null;
                    }
                }
                gfxStateCache.gpuInputAssembler = null;

                if (stateCache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
                    gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                    stateCache.glElementArrayBuffer = gpuBuffer.glBuffer;
                }

                gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.size, glUsage);
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                stateCache.glElementArrayBuffer = null;
            }
        }
    } else if (gpuBuffer.usage & BufferUsageBit.UNIFORM) {
        gpuBuffer.glTarget = WebGLConstants.NONE;

        if (gpuBuffer.buffer) {
            gpuBuffer.vf32 = new Float32Array(gpuBuffer.buffer.buffer);
        }
    } else if (gpuBuffer.usage & BufferUsageBit.INDIRECT) {
        gpuBuffer.glTarget = WebGLConstants.NONE;
    } else if (gpuBuffer.usage & BufferUsageBit.TRANSFER_DST) {
        gpuBuffer.glTarget = WebGLConstants.NONE;
    } else if (gpuBuffer.usage & BufferUsageBit.TRANSFER_SRC) {
        gpuBuffer.glTarget = WebGLConstants.NONE;
    } else {
        errorID(16315);
        gpuBuffer.glTarget = WebGLConstants.NONE;
    }
}

export function WebGLCmdFuncDestroyBuffer (device: WebGLDevice, gpuBuffer: IWebGLGPUBuffer): void {
    const { gl } = device;
    const cache = device.stateCache;

    if (gpuBuffer.glBuffer) {
        // Firefox 75+ implicitly unbind whatever buffer there was on the slot sometimes
        // can be reproduced in the static batching scene at https://github.com/cocos-creator/test-cases-3d
        switch (gpuBuffer.glTarget) {
        case WebGLConstants.ARRAY_BUFFER:
            if (device.extensions.useVAO) {
                if (cache.glVAO) {
                    device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
            cache.glArrayBuffer = null;
            break;
        case WebGLConstants.ELEMENT_ARRAY_BUFFER:
            if (device.extensions.useVAO) {
                if (cache.glVAO) {
                    device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
            cache.glElementArrayBuffer = null;
            break;
        default:
        }

        gl.deleteBuffer(gpuBuffer.glBuffer);
        gpuBuffer.glBuffer = null;
    }
}

export function WebGLCmdFuncResizeBuffer (device: WebGLDevice, gpuBuffer: IWebGLGPUBuffer): void {
    const { gl, stateCache } = device;
    const glUsage: GLenum = gpuBuffer.memUsage & MemoryUsageBit.HOST ? WebGLConstants.DYNAMIC_DRAW : WebGLConstants.STATIC_DRAW;

    if (gpuBuffer.usage & BufferUsageBit.VERTEX) {
        if (device.extensions.useVAO) {
            if (stateCache.glVAO) {
                device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                stateCache.glVAO = null;
            }
        }
        gfxStateCache.gpuInputAssembler = null;

        if (stateCache.glArrayBuffer !== gpuBuffer.glBuffer) {
            gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
        }

        if (gpuBuffer.buffer) {
            gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.buffer, glUsage);
        } else {
            gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.size, glUsage);
        }
        gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
        stateCache.glArrayBuffer = null;
    } else if (gpuBuffer.usage & BufferUsageBit.INDEX) {
        if (device.extensions.useVAO) {
            if (stateCache.glVAO) {
                device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                stateCache.glVAO = null;
            }
        }
        gfxStateCache.gpuInputAssembler = null;

        if (stateCache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
            gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
        }

        if (gpuBuffer.buffer) {
            gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.buffer, glUsage);
        } else {
            gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.size, glUsage);
        }
        gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
        stateCache.glElementArrayBuffer = null;
    } else if (gpuBuffer.usage & BufferUsageBit.UNIFORM) {
        if (gpuBuffer.buffer) {
            gpuBuffer.vf32 = new Float32Array(gpuBuffer.buffer.buffer);
        }
    } else if ((gpuBuffer.usage & BufferUsageBit.INDIRECT)
            || (gpuBuffer.usage & BufferUsageBit.TRANSFER_DST)
            || (gpuBuffer.usage & BufferUsageBit.TRANSFER_SRC)) {
        gpuBuffer.glTarget = WebGLConstants.NONE;
    } else {
        errorID(16315);
        gpuBuffer.glTarget = WebGLConstants.NONE;
    }
}

export function WebGLCmdFuncUpdateBuffer (
    device: WebGLDevice,
    gpuBuffer: IWebGLGPUBuffer,
    buffer: Readonly<BufferSource>,
    offset: number,
    size: number,
): void {
    if (gpuBuffer.usage & BufferUsageBit.UNIFORM) {
        if (ArrayBuffer.isView(buffer)) {
            gpuBuffer.vf32!.set(buffer as Float32Array, offset / Float32Array.BYTES_PER_ELEMENT);
        } else {
            gpuBuffer.vf32!.set(new Float32Array(buffer as ArrayBuffer), offset / Float32Array.BYTES_PER_ELEMENT);
        }
    } else if (gpuBuffer.usage & BufferUsageBit.INDIRECT) {
        gpuBuffer.indirects.clearDraws();
        const drawInfos = (buffer as IndirectBuffer).drawInfos;
        for (let i = 0; i < drawInfos.length; ++i) {
            gpuBuffer.indirects.setDrawInfo(offset + i, drawInfos[i]);
        }
    } else {
        const buff = buffer as ArrayBuffer;
        const { gl, stateCache } = device;

        switch (gpuBuffer.glTarget) {
        case WebGLConstants.ARRAY_BUFFER: {
            if (device.extensions.useVAO) {
                if (stateCache.glVAO) {
                    device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                    stateCache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            if (stateCache.glArrayBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
                stateCache.glArrayBuffer = gpuBuffer.glBuffer;
            }
            break;
        }
        case WebGLConstants.ELEMENT_ARRAY_BUFFER: {
            if (device.extensions.useVAO) {
                if (stateCache.glVAO) {
                    device.extensions.OES_vertex_array_object!.bindVertexArrayOES(null);
                    stateCache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            if (stateCache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                stateCache.glElementArrayBuffer = gpuBuffer.glBuffer;
            }
            break;
        }
        default: {
            errorID(16316);
            return;
        }
        }

        if (systemInfo.os === OS.IOS  && (gpuBuffer.memUsage & MemoryUsageBit.HOST) && offset === 0 && size === buff.byteLength) {
            // Fix performance issue on iOS.
            // TODO(zhouzhenglong): glBufferSubData is faster than glBufferData in most cases.
            // We should use multiple buffers to avoid stall (cpu write conflicts with gpu read).
            // Before that, we will use glBufferData instead of glBufferSubData.
            gl.bufferData(gpuBuffer.glTarget, buff, gl.DYNAMIC_DRAW);
        } else if (size === buff.byteLength) {
            gl.bufferSubData(gpuBuffer.glTarget, offset, buff);
        } else {
            gl.bufferSubData(gpuBuffer.glTarget, offset, buff.slice(0, size));
        }
    }
}

export function WebGLCmdFuncCreateTexture (device: WebGLDevice, gpuTexture: IWebGLGPUTexture): void {
    const { gl, stateCache } = device;

    gpuTexture.glFormat = gpuTexture.glInternalFmt = GFXFormatToWebGLFormat(gpuTexture.format, gl);
    gpuTexture.glType = GFXFormatToWebGLType(gpuTexture.format, gl);

    let w = gpuTexture.width;
    let h = gpuTexture.height;

    switch (gpuTexture.type) {
    case TextureType.TEX2D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;

        const maxSize = max(w, h);
        if (maxSize > device.capabilities.maxTextureSize) {
            errorID(9100, maxSize, device.capabilities.maxTextureSize);
        }
        // TODO: The system bug in the TikTok mini-game; once they fix it, a rollback will be necessary.
        if (!device.textureExclusive[gpuTexture.format]
            && ((!device.extensions.WEBGL_depth_texture || BYTEDANCE) && FormatInfos[gpuTexture.format].hasDepth)) {
            gpuTexture.glInternalFmt = GFXFormatToWebGLInternalFormat(gpuTexture.format, gl);
            gpuTexture.glRenderbuffer = gl.createRenderbuffer();
            if (gpuTexture.size > 0) {
                if (stateCache.glRenderbuffer !== gpuTexture.glRenderbuffer) {
                    gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, gpuTexture.glRenderbuffer);
                    stateCache.glRenderbuffer = gpuTexture.glRenderbuffer;
                }
                gl.renderbufferStorage(WebGLConstants.RENDERBUFFER, gpuTexture.glInternalFmt, w, h);
            }
        } else {
            gpuTexture.glTexture = gl.createTexture();
            if (gpuTexture.size > 0) {
                const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];

                if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                    gl.bindTexture(WebGLConstants.TEXTURE_2D, gpuTexture.glTexture);
                    glTexUnit.glTexture = gpuTexture.glTexture;
                }

                if (FormatInfos[gpuTexture.format].isCompressed) {
                    for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                        const imgSize = FormatSize(gpuTexture.format, w, h, 1);
                        const view: Uint8Array = new Uint8Array(imgSize);
                        gl.compressedTexImage2D(WebGLConstants.TEXTURE_2D, i, gpuTexture.glInternalFmt, w, h, 0, view);
                        w = max(1, w >> 1);
                        h = max(1, h >> 1);
                    }
                } else {
                    for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                        gl.texImage2D(WebGLConstants.TEXTURE_2D, i, gpuTexture.glInternalFmt, w, h, 0, gpuTexture.glFormat, gpuTexture.glType, null);
                        w = max(1, w >> 1);
                        h = max(1, h >> 1);
                    }
                }

                if (gpuTexture.isPowerOf2) {
                    gpuTexture.glWrapS = WebGLConstants.REPEAT;
                    gpuTexture.glWrapT = WebGLConstants.REPEAT;
                } else {
                    gpuTexture.glWrapS = WebGLConstants.CLAMP_TO_EDGE;
                    gpuTexture.glWrapT = WebGLConstants.CLAMP_TO_EDGE;
                }
                gpuTexture.glMinFilter = WebGLConstants.LINEAR;
                gpuTexture.glMagFilter = WebGLConstants.LINEAR;

                gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_S, gpuTexture.glWrapS);
                gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_T, gpuTexture.glWrapT);
                gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MIN_FILTER, gpuTexture.glMinFilter);
                gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MAG_FILTER, gpuTexture.glMagFilter);
            }
        }

        break;
    }
    case TextureType.CUBE: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_CUBE_MAP;

        const maxSize = max(w, h);
        if (maxSize > device.capabilities.maxCubeMapTextureSize) {
            errorID(9100, maxSize, device.capabilities.maxTextureSize);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_CUBE_MAP, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let f = 0; f < 6; ++f) {
                    w = gpuTexture.width;
                    h = gpuTexture.height;
                    for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                        const imgSize = FormatSize(gpuTexture.format, w, h, 1);
                        const view: Uint8Array = new Uint8Array(imgSize);
                        gl.compressedTexImage2D(WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f, i, gpuTexture.glInternalFmt, w, h, 0, view);
                        w = max(1, w >> 1);
                        h = max(1, h >> 1);
                    }
                }
            } else {
                for (let f = 0; f < 6; ++f) {
                    w = gpuTexture.width;
                    h = gpuTexture.height;
                    for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                        gl.texImage2D(
                            WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                            i,
                            gpuTexture.glInternalFmt,
                            w,
                            h,
                            0,
                            gpuTexture.glFormat,
                            gpuTexture.glType,
                            null,
                        );
                        w = max(1, w >> 1);
                        h = max(1, h >> 1);
                    }
                }
            }

            if (gpuTexture.isPowerOf2) {
                gpuTexture.glWrapS = WebGLConstants.REPEAT;
                gpuTexture.glWrapT = WebGLConstants.REPEAT;
            } else {
                gpuTexture.glWrapS = WebGLConstants.CLAMP_TO_EDGE;
                gpuTexture.glWrapT = WebGLConstants.CLAMP_TO_EDGE;
            }
            gpuTexture.glMinFilter = WebGLConstants.LINEAR;
            gpuTexture.glMagFilter = WebGLConstants.LINEAR;

            gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_S, gpuTexture.glWrapS);
            gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_T, gpuTexture.glWrapT);
            gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MIN_FILTER, gpuTexture.glMinFilter);
            gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MAG_FILTER, gpuTexture.glMagFilter);
        }

        break;
    }
    default: {
        errorID(16317);
        gpuTexture.type = TextureType.TEX2D;
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;
    }
    }
}

export function WebGLCmdFuncDestroyTexture (device: WebGLDevice, gpuTexture: IWebGLGPUTexture): void {
    const { gl, stateCache } = device;
    if (gpuTexture.glTexture) {
        const glTexUnits = stateCache.glTexUnits;
        let texUnit = stateCache.texUnit;
        gl.deleteTexture(gpuTexture.glTexture);
        for (let i = 0; i < glTexUnits.length; i++) {
            if (glTexUnits[i].glTexture === gpuTexture.glTexture) {
                gl.activeTexture(WebGLConstants.TEXTURE0 + i);
                texUnit = i;
                gl.bindTexture(gpuTexture.glTarget, null);
                glTexUnits[i].glTexture = null;
            }
        }
        stateCache.texUnit = texUnit;
        gpuTexture.glTexture = null;
    }

    if (gpuTexture.glRenderbuffer) {
        const glRenderbuffer = stateCache.glRenderbuffer;
        gl.deleteRenderbuffer(gpuTexture.glRenderbuffer);
        if (glRenderbuffer === gpuTexture.glRenderbuffer) {
            gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, null);
            stateCache.glRenderbuffer = null;
        }
        gpuTexture.glRenderbuffer = null;
    }
}

export function WebGLCmdFuncResizeTexture (device: WebGLDevice, gpuTexture: IWebGLGPUTexture): void {
    if (!gpuTexture.size) return;

    const { gl, stateCache } = device;

    let w = gpuTexture.width;
    let h = gpuTexture.height;

    switch (gpuTexture.type) {
    case TextureType.TEX2D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;

        const maxSize = max(w, h);
        if (maxSize > device.capabilities.maxTextureSize) {
            errorID(9100, maxSize, device.capabilities.maxTextureSize);
        }

        if (gpuTexture.glRenderbuffer) {
            if (stateCache.glRenderbuffer !== gpuTexture.glRenderbuffer) {
                gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, gpuTexture.glRenderbuffer);
                stateCache.glRenderbuffer = gpuTexture.glRenderbuffer;
            }
            gl.renderbufferStorage(WebGLConstants.RENDERBUFFER, gpuTexture.glInternalFmt, w, h);
        } else if (gpuTexture.glTexture) {
            const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_2D, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, 1);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage2D(WebGLConstants.TEXTURE_2D, i, gpuTexture.glInternalFmt, w, h, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    gl.texImage2D(WebGLConstants.TEXTURE_2D, i, gpuTexture.glInternalFmt, w, h, 0, gpuTexture.glFormat, gpuTexture.glType, null);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            }
        }
        break;
    }
    case TextureType.CUBE: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_CUBE_MAP;

        const maxSize = max(w, h);
        if (maxSize > device.capabilities.maxCubeMapTextureSize) {
            errorID(9100, maxSize, device.capabilities.maxTextureSize);
        }

        const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];

        if (glTexUnit.glTexture !== gpuTexture.glTexture) {
            gl.bindTexture(WebGLConstants.TEXTURE_CUBE_MAP, gpuTexture.glTexture);
            glTexUnit.glTexture = gpuTexture.glTexture;
        }

        if (FormatInfos[gpuTexture.format].isCompressed) {
            for (let f = 0; f < 6; ++f) {
                w = gpuTexture.width;
                h = gpuTexture.height;
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, 1);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage2D(WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f, i, gpuTexture.glInternalFmt, w, h, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            }
        } else {
            for (let f = 0; f < 6; ++f) {
                w = gpuTexture.width;
                h = gpuTexture.height;
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    gl.texImage2D(
                        WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                        i,
                        gpuTexture.glInternalFmt,
                        w,
                        h,
                        0,
                        gpuTexture.glFormat,
                        gpuTexture.glType,
                        null,
                    );
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            }
        }
        break;
    }
    default: {
        errorID(16317);
        gpuTexture.type = TextureType.TEX2D;
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;
    }
    }
}

export function WebGLCmdFuncCreateFramebuffer (device: WebGLDevice, gpuFramebuffer: IWebGLGPUFramebuffer): void {
    for (let i = 0; i < gpuFramebuffer.gpuColorTextures.length; ++i) {
        const tex = gpuFramebuffer.gpuColorTextures[i];
        if (tex.isSwapchainTexture) {
            gpuFramebuffer.isOffscreen = false;
            return;
        }
    }

    const { gl, stateCache } = device;
    const attachments: GLenum[] = [];

    const glFramebuffer = gl.createFramebuffer();
    if (glFramebuffer) {
        gpuFramebuffer.glFramebuffer = glFramebuffer;

        if (stateCache.glFramebuffer !== gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, gpuFramebuffer.glFramebuffer);
        }

        for (let i = 0; i < gpuFramebuffer.gpuColorTextures.length; ++i) {
            const gpuTexture = gpuFramebuffer.gpuColorTextures[i];
            if (gpuTexture) {
                if (gpuTexture.glTexture) {
                    gl.framebufferTexture2D(
                        WebGLConstants.FRAMEBUFFER,
                        WebGLConstants.COLOR_ATTACHMENT0 + i,
                        gpuTexture.glTarget,
                        gpuTexture.glTexture,
                        0,
                    ); // level must be 0
                } else {
                    gl.framebufferRenderbuffer(
                        WebGLConstants.FRAMEBUFFER,
                        WebGLConstants.COLOR_ATTACHMENT0 + i,
                        WebGLConstants.RENDERBUFFER,
                        gpuTexture.glRenderbuffer,
                    );
                }

                attachments.push(WebGLConstants.COLOR_ATTACHMENT0 + i);
                gpuFramebuffer.width = min(gpuFramebuffer.width, gpuTexture.width);
                gpuFramebuffer.height = min(gpuFramebuffer.height, gpuTexture.height);
            }
        }

        const dst = gpuFramebuffer.gpuDepthStencilTexture;
        if (dst) {
            const glAttachment = FormatInfos[dst.format].hasStencil ? WebGLConstants.DEPTH_STENCIL_ATTACHMENT : WebGLConstants.DEPTH_ATTACHMENT;
            if (dst.glTexture) {
                gl.framebufferTexture2D(
                    WebGLConstants.FRAMEBUFFER,
                    glAttachment,
                    dst.glTarget,
                    dst.glTexture,
                    0,
                ); // level must be 0
            } else {
                gl.framebufferRenderbuffer(
                    WebGLConstants.FRAMEBUFFER,
                    glAttachment,
                    WebGLConstants.RENDERBUFFER,
                    dst.glRenderbuffer,
                );
            }
            gpuFramebuffer.width = min(gpuFramebuffer.width, dst.width);
            gpuFramebuffer.height = min(gpuFramebuffer.height, dst.height);
        }

        if (device.extensions.WEBGL_draw_buffers) {
            device.extensions.WEBGL_draw_buffers.drawBuffersWEBGL(attachments);
        }

        const status = gl.checkFramebufferStatus(WebGLConstants.FRAMEBUFFER);
        if (status !== WebGLConstants.FRAMEBUFFER_COMPLETE) {
            switch (status) {
            case WebGLConstants.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: {
                errorID(16318);
                break;
            }
            case WebGLConstants.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: {
                errorID(16319);
                break;
            }
            case WebGLConstants.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: {
                errorID(16320);
                break;
            }
            case WebGLConstants.FRAMEBUFFER_UNSUPPORTED: {
                errorID(16321);
                break;
            }
            default:
            }
        }

        if (stateCache.glFramebuffer !== gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, stateCache.glFramebuffer);
        }
    }
}

export function WebGLCmdFuncDestroyFramebuffer (device: WebGLDevice, gpuFramebuffer: IWebGLGPUFramebuffer): void {
    const { gl, stateCache } = device;
    if (gpuFramebuffer.glFramebuffer) {
        gl.deleteFramebuffer(gpuFramebuffer.glFramebuffer);
        if (stateCache.glFramebuffer === gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, null);
            stateCache.glFramebuffer = null;
        }
        gpuFramebuffer.glFramebuffer = null;
    }
}

export function WebGLCmdFuncCreateShader (device: WebGLDevice, gpuShader: IWebGLGPUShader): void {
    const { gl, stateCache } = device;

    for (let k = 0; k < gpuShader.gpuStages.length; k++) {
        const gpuStage = gpuShader.gpuStages[k];

        let glShaderType: GLenum = 0;
        let shaderTypeStr = '';
        let lineNumber = 1;

        switch (gpuStage.type) {
        case ShaderStageFlagBit.VERTEX: {
            shaderTypeStr = 'VertexShader';
            glShaderType = WebGLConstants.VERTEX_SHADER;
            break;
        }
        case ShaderStageFlagBit.FRAGMENT: {
            shaderTypeStr = 'FragmentShader';
            glShaderType = WebGLConstants.FRAGMENT_SHADER;
            break;
        }
        default: {
            errorID(16322);
            return;
        }
        }

        const glShader = gl.createShader(glShaderType);
        if (glShader) {
            gpuStage.glShader = glShader;
            gl.shaderSource(gpuStage.glShader, gpuStage.source);
            gl.compileShader(gpuStage.glShader);

            if (!gl.getShaderParameter(gpuStage.glShader, WebGLConstants.COMPILE_STATUS)) {
                errorID(16323, shaderTypeStr, gpuShader.name);
                errorID(16324, gpuStage.source.replace(/^|\n/g, (): string => `\n${lineNumber++} `));
                error(gl.getShaderInfoLog(gpuStage.glShader));

                for (let l = 0; l < gpuShader.gpuStages.length; l++) {
                    const stage = gpuShader.gpuStages[k];
                    if (stage.glShader) {
                        gl.deleteShader(stage.glShader);
                        stage.glShader = null;
                    }
                }
                return;
            }
        }
    }

    const glProgram = gl.createProgram();
    if (!glProgram) {
        return;
    }

    gpuShader.glProgram = glProgram;

    // link program
    for (let k = 0; k < gpuShader.gpuStages.length; k++) {
        const gpuStage = gpuShader.gpuStages[k];
        gl.attachShader(gpuShader.glProgram, gpuStage.glShader!);
    }

    gl.linkProgram(gpuShader.glProgram);

    // detach & delete immediately
    if (device.extensions.destroyShadersImmediately) {
        for (let k = 0; k < gpuShader.gpuStages.length; k++) {
            const gpuStage = gpuShader.gpuStages[k];
            if (gpuStage.glShader) {
                gl.detachShader(gpuShader.glProgram, gpuStage.glShader);
                gl.deleteShader(gpuStage.glShader);
                gpuStage.glShader = null;
            }
        }
    }

    if (gl.getProgramParameter(gpuShader.glProgram, WebGLConstants.LINK_STATUS)) {
        debugID(16325, gpuShader.name);
    } else {
        errorID(16326, gpuShader.name);
        error(gl.getProgramInfoLog(gpuShader.glProgram));
        return;
    }

    // parse inputs
    const activeAttribCount: number = gl.getProgramParameter(gpuShader.glProgram, WebGLConstants.ACTIVE_ATTRIBUTES);
    gpuShader.glInputs = new Array<IWebGLGPUInput>(activeAttribCount);

    for (let i = 0; i < activeAttribCount; ++i) {
        const attribInfo = gl.getActiveAttrib(gpuShader.glProgram, i);
        if (attribInfo) {
            const { type: attribType, name: attribName, size: attribSize } = attribInfo;
            let varName: string;
            const nameOffset = attribName.indexOf('[');
            if (nameOffset !== -1) {
                varName = attribName.substring(0, nameOffset);
            } else {
                varName = attribName;
            }

            const glLoc = gl.getAttribLocation(gpuShader.glProgram, varName);
            const gfxType = WebGLTypeToGFXType(attribType, gl);
            const stride = WebGLGetTypeSize(attribType, gl);

            gpuShader.glInputs[i] = {
                binding: glLoc,
                name: varName,
                type: gfxType,
                stride,
                count: attribSize,
                size: stride * attribSize,

                glType: attribType,
                glLoc,
            };
        }
    }

    // create uniform blocks
    if (gpuShader.blocks.length > 0) {
        gpuShader.glBlocks = new Array<IWebGLGPUUniformBlock>(gpuShader.blocks.length);
        for (let i = 0; i < gpuShader.blocks.length; ++i) {
            const block = gpuShader.blocks[i];

            const glBlock: IWebGLGPUUniformBlock = {
                set: block.set,
                binding: block.binding,
                name: block.name,
                size: 0,
                glUniforms: new Array<IWebGLGPUUniform>(block.members.length),
                glActiveUniforms: [],
            };

            gpuShader.glBlocks[i] = glBlock;

            for (let u = 0; u < block.members.length; ++u) {
                const uniform = block.members[u];
                const glType = GFXTypeToWebGLType(uniform.type, gl);
                const stride = WebGLGetTypeSize(glType, gl);
                const size = stride * uniform.count;

                glBlock.glUniforms[u] = {
                    binding: -1,
                    name: uniform.name,
                    type: uniform.type,
                    stride,
                    count: uniform.count,
                    size,
                    offset: 0,

                    glType,
                    glLoc: null!,
                    array: null!,
                };
            }
        }
    }

    // WebGL doesn't support Framebuffer Fetch
    for (let i = 0; i < gpuShader.subpassInputs.length; ++i) {
        const subpassInput = gpuShader.subpassInputs[i];
        gpuShader.samplerTextures.push(
            new UniformSamplerTexture(subpassInput.set, subpassInput.binding, subpassInput.name, Type.SAMPLER2D, subpassInput.count),
        );
    }

    // create uniform sampler textures
    if (gpuShader.samplerTextures.length > 0) {
        gpuShader.glSamplerTextures = new Array<IWebGLGPUUniformSamplerTexture>(gpuShader.samplerTextures.length);

        for (let i = 0; i < gpuShader.samplerTextures.length; ++i) {
            const sampler = gpuShader.samplerTextures[i];
            gpuShader.glSamplerTextures[i] = {
                set: sampler.set,
                binding: sampler.binding,
                name: sampler.name,
                type: sampler.type,
                count: sampler.count,
                units: [],
                glUnits: null!,
                glType: GFXTypeToWebGLType(sampler.type, gl),
                glLoc: null!,
            };
        }
    }

    // parse uniforms
    const activeUniformCount = gl.getProgramParameter(gpuShader.glProgram, WebGLConstants.ACTIVE_UNIFORMS);

    for (let i = 0; i < activeUniformCount; ++i) {
        const uniformInfo = gl.getActiveUniform(gpuShader.glProgram, i);
        if (uniformInfo) {
            const isSampler = (uniformInfo.type === WebGLConstants.SAMPLER_2D)
                || (uniformInfo.type === WebGLConstants.SAMPLER_CUBE);

            if (!isSampler) {
                const glLoc = gl.getUniformLocation(gpuShader.glProgram, uniformInfo.name);
                if (device.extensions.isLocationActive(glLoc)) {
                    let varName: string;
                    const nameOffset = uniformInfo.name.indexOf('[');
                    if (nameOffset !== -1) {
                        varName = uniformInfo.name.substring(0, nameOffset);
                    } else {
                        varName = uniformInfo.name;
                    }

                    // build uniform block mapping
                    for (let j = 0; j < gpuShader.glBlocks.length; j++) {
                        const glBlock = gpuShader.glBlocks[j];

                        for (let k = 0; k < glBlock.glUniforms.length; k++) {
                            const glUniform = glBlock.glUniforms[k];
                            if (glUniform.name === varName) {
                                glUniform.glLoc = glLoc;
                                glUniform.count = uniformInfo.size;
                                glUniform.size = glUniform.stride * glUniform.count;
                                glUniform.array = new (GFXTypeToTypedArrayCtor(glUniform.type))(glUniform.size / 4);

                                glBlock.glActiveUniforms.push(glUniform);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // calculate offset & size
    // WARNING: we can't handle inactive uniform arrays with wrong input sizes
    // and there is no way to detect that for now
    for (let j = 0; j < gpuShader.glBlocks.length; j++) {
        const glBlock = gpuShader.glBlocks[j];
        for (let k = 0; k < glBlock.glUniforms.length; k++) {
            const glUniform = glBlock.glUniforms[k];
            glUniform.offset = glBlock.size / 4;
            glBlock.size += glUniform.size;
        }
    }

    // texture unit index mapping optimization
    const glActiveSamplers: IWebGLGPUUniformSamplerTexture[] = [];
    const glActiveSamplerLocations: WebGLUniformLocation[] = [];
    const { bindingMappings, capabilities } = device;
    const { texUnitCacheMap } = device.stateCache;
    const { maxTextureUnits } = capabilities;

    if (!(cclegacy.rendering && cclegacy.rendering.enableEffectImport)) {
        let flexibleSetBaseOffset = 0;
        for (let i = 0; i < gpuShader.blocks.length; ++i) {
            if (gpuShader.blocks[i].set === bindingMappings.flexibleSet) {
                flexibleSetBaseOffset++;
            }
        }

        let arrayOffset = 0;
        for (let i = 0; i < gpuShader.samplerTextures.length; ++i) {
            const sampler = gpuShader.samplerTextures[i];
            const glLoc = gl.getUniformLocation(gpuShader.glProgram, sampler.name);
            if (device.extensions.isLocationActive(glLoc)) {
                glActiveSamplers.push(gpuShader.glSamplerTextures[i]);
                glActiveSamplerLocations.push(glLoc);
            }
            if (texUnitCacheMap[sampler.name] === undefined) {
                let binding = sampler.binding + bindingMappings.samplerTextureOffsets[sampler.set] + arrayOffset;
                if (sampler.set === bindingMappings.flexibleSet) { binding -= flexibleSetBaseOffset; }
                texUnitCacheMap[sampler.name] = binding % maxTextureUnits;
                arrayOffset += sampler.count - 1;
            }
        }
    } else {
        for (let i = 0; i < gpuShader.samplerTextures.length; ++i) {
            const sampler = gpuShader.samplerTextures[i];
            const glLoc = gl.getUniformLocation(gpuShader.glProgram, sampler.name);
            if (device.extensions.isLocationActive(glLoc)) {
                glActiveSamplers.push(gpuShader.glSamplerTextures[i]);
                glActiveSamplerLocations.push(glLoc);
            }
            if (texUnitCacheMap[sampler.name] === undefined) {
                texUnitCacheMap[sampler.name] = sampler.flattened % maxTextureUnits;
            }
        }
    }

    if (glActiveSamplers.length) {
        const usedTexUnits: boolean[] = [];
        // try to reuse existing mappings first
        for (let i = 0; i < glActiveSamplers.length; ++i) {
            const glSampler = glActiveSamplers[i];

            let cachedUnit = texUnitCacheMap[glSampler.name];
            if (cachedUnit !== undefined) {
                glSampler.glLoc = glActiveSamplerLocations[i];
                for (let t = 0; t < glSampler.count; ++t) {
                    while (usedTexUnits[cachedUnit]) {
                        cachedUnit = (cachedUnit + 1) % maxTextureUnits;
                    }
                    glSampler.units.push(cachedUnit);
                    usedTexUnits[cachedUnit] = true;
                }
            }
        }
        // fill in the rest sequencially
        let unitIdx = 0;
        for (let i = 0; i < glActiveSamplers.length; ++i) {
            const glSampler = glActiveSamplers[i];

            if (!device.extensions.isLocationActive(glSampler.glLoc)) {
                glSampler.glLoc = glActiveSamplerLocations[i];
                for (let t = 0; t < glSampler.count; ++t) {
                    while (usedTexUnits[unitIdx]) {
                        unitIdx = (unitIdx + 1) % maxTextureUnits;
                    }
                    if (texUnitCacheMap[glSampler.name] === undefined) {
                        texUnitCacheMap[glSampler.name] = unitIdx;
                    }
                    glSampler.units.push(unitIdx);
                    usedTexUnits[unitIdx] = true;
                }
            }
        }

        if (stateCache.glProgram !== gpuShader.glProgram) {
            gl.useProgram(gpuShader.glProgram);
        }

        for (let i = 0; i < glActiveSamplers.length; i++) {
            const glSampler = glActiveSamplers[i];
            glSampler.glUnits = new Int32Array(glSampler.units);
            gl.uniform1iv(glSampler.glLoc, glSampler.glUnits);
        }

        if (stateCache.glProgram !== gpuShader.glProgram) {
            gl.useProgram(stateCache.glProgram);
        }
    }

    // strip out the inactive ones
    for (let i = 0; i < gpuShader.glBlocks.length;) {
        if (gpuShader.glBlocks[i].glActiveUniforms.length) {
            i++;
        } else {
            gpuShader.glBlocks[i] = gpuShader.glBlocks[gpuShader.glBlocks.length - 1];
            gpuShader.glBlocks.length--;
        }
    }

    gpuShader.glSamplerTextures = glActiveSamplers;
}

export function WebGLCmdFuncDestroyShader (device: WebGLDevice, gpuShader: IWebGLGPUShader): void {
    if (gpuShader.glProgram) {
        const { gl, stateCache } = device;
        if (!device.extensions.destroyShadersImmediately) {
            for (let k = 0; k < gpuShader.gpuStages.length; k++) {
                const gpuStage = gpuShader.gpuStages[k];
                if (gpuStage.glShader) {
                    gl.detachShader(gpuShader.glProgram, gpuStage.glShader);
                    gl.deleteShader(gpuStage.glShader);
                    gpuStage.glShader = null;
                }
            }
        }
        gl.deleteProgram(gpuShader.glProgram);
        if (stateCache.glProgram === gpuShader.glProgram) {
            gl.useProgram(null);
            stateCache.glProgram = null;
        }
        gpuShader.glProgram = null;
    }
}

export function WebGLCmdFuncCreateInputAssember (device: WebGLDevice, gpuInputAssembler: IWebGLGPUInputAssembler): void {
    const { gl } = device;

    gpuInputAssembler.glAttribs = new Array<IWebGLAttrib>(gpuInputAssembler.attributes.length);

    const offsets = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < gpuInputAssembler.attributes.length; ++i) {
        const attrib = gpuInputAssembler.attributes[i];
        const { format: attribFormat, isNormalized: attribIsNormalized, isInstanced: attribIsInstanced } = attrib;

        const stream = attrib.stream !== undefined ? attrib.stream : 0;

        const gpuBuffer = gpuInputAssembler.gpuVertexBuffers[stream];

        const glType = GFXFormatToWebGLType(attribFormat, gl);
        const { size } = FormatInfos[attribFormat];

        gpuInputAssembler.glAttribs[i] = {
            name: attrib.name,
            glBuffer: gpuBuffer.glBuffer,
            glType,
            size,
            count: FormatInfos[attribFormat].count,
            stride: gpuBuffer.stride,
            componentCount: WebGLGetComponentCount(glType, gl),
            isNormalized: (attribIsNormalized !== undefined ? attribIsNormalized : false),
            isInstanced: (attribIsInstanced !== undefined ? attribIsInstanced : false),
            offset: offsets[stream],
        };

        offsets[stream] += size;
    }
}

export function WebGLCmdFuncDestroyInputAssembler (device: WebGLDevice, gpuInputAssembler: IWebGLGPUInputAssembler): void {
    const { stateCache } = device;
    const it = gpuInputAssembler.glVAOs.values();
    let res = it.next();
    const OES_vertex_array_object = device.extensions.OES_vertex_array_object!;
    let glVAO = stateCache.glVAO;
    while (!res.done) {
        OES_vertex_array_object.deleteVertexArrayOES(res.value);
        if (glVAO === res.value) {
            OES_vertex_array_object.bindVertexArrayOES(null);
            glVAO = null;
        }
        res = it.next();
    }
    stateCache.glVAO = glVAO;
    gpuInputAssembler.glVAOs.clear();
}

interface IWebGLStateCache {
    gpuPipelineState: IWebGLGPUPipelineState | null;
    gpuInputAssembler: IWebGLGPUInputAssembler | null;
    glPrimitive: number;
}
const gfxStateCache: IWebGLStateCache = {
    gpuPipelineState: null,
    gpuInputAssembler: null,
    glPrimitive: 0,
};

const realRenderArea = new Rect();
export function WebGLCmdFuncBeginRenderPass (
    device: WebGLDevice,
    gpuRenderPass: IWebGLGPURenderPass | null,
    gpuFramebuffer: IWebGLGPUFramebuffer | null,
    renderArea: Readonly<Rect>,
    clearColors: Readonly<Color[]>,
    clearDepth: number,
    clearStencil: number,
): void {
    const { gl } = device;
    const cache = device.stateCache;
    let clears: GLbitfield = 0;

    if (gpuFramebuffer) {
        const lodLevel = gpuFramebuffer.lodLevel;
        realRenderArea.x = renderArea.x << lodLevel;
        realRenderArea.y = renderArea.y << lodLevel;
        realRenderArea.width = renderArea.width << lodLevel;
        realRenderArea.height = renderArea.height << lodLevel;
    }

    if (gpuFramebuffer && gpuRenderPass) {
        const curGPUFrameBuffer = gpuFramebuffer.glFramebuffer;
        const { x: realRenderAreaX, y: realRenderAreaY, width: realRenderAreaWidth, height: realRenderAreaHeight } = realRenderArea;
        if (cache.glFramebuffer !== curGPUFrameBuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, curGPUFrameBuffer);
            cache.glFramebuffer = curGPUFrameBuffer;
        }

        const cacheViewport = cache.viewport;
        if (cacheViewport.left !== realRenderAreaX
            || cacheViewport.top !== realRenderAreaY
            || cacheViewport.width !== realRenderAreaWidth
            || cacheViewport.height !== realRenderAreaHeight) {
            gl.viewport(realRenderAreaX, realRenderAreaY, realRenderAreaWidth, realRenderAreaHeight);

            cacheViewport.left = realRenderAreaX;
            cacheViewport.top = realRenderAreaY;
            cacheViewport.width = realRenderAreaWidth;
            cacheViewport.height = realRenderAreaHeight;
        }

        const cacheScissorRect = cache.scissorRect;
        if (cacheScissorRect.x !== realRenderAreaX
            || cacheScissorRect.y !== realRenderAreaY
            || cacheScissorRect.width !== realRenderAreaWidth
            || cacheScissorRect.height !== realRenderAreaHeight) {
            gl.scissor(realRenderAreaX, realRenderAreaY, realRenderAreaWidth, realRenderAreaHeight);

            cacheScissorRect.x = realRenderAreaX;
            cacheScissorRect.y = realRenderAreaY;
            cacheScissorRect.width = realRenderAreaWidth;
            cacheScissorRect.height = realRenderAreaHeight;
        }

        // const invalidateAttachments: GLenum[] = [];
        let clearCount = clearColors.length;

        if (!device.extensions.WEBGL_draw_buffers) {
            clearCount = 1;
        }

        const cacheDSS = cache.dss;

        for (let j = 0; j < clearCount; ++j) {
            const colorAttachment = gpuRenderPass.colorAttachments[j];

            if (colorAttachment.format !== Format.UNKNOWN) {
                switch (colorAttachment.loadOp) {
                case LoadOp.LOAD: break; // GL default behavior
                case LoadOp.CLEAR: {
                    if (cache.bs.targets[0].blendColorMask !== ColorMask.ALL) {
                        gl.colorMask(true, true, true, true);
                    }

                    const clearColor = clearColors[0];
                    gl.clearColor(clearColor.x, clearColor.y, clearColor.z, clearColor.w);
                    clears |= WebGLConstants.COLOR_BUFFER_BIT;
                    break;
                }
                case LoadOp.DISCARD: {
                    // invalidate the framebuffer
                    // invalidateAttachments.push(WebGLConstants.COLOR_ATTACHMENT0 + j);
                    break;
                }
                default:
                }
            }
        } // if (curGPURenderPass)

        if (gpuRenderPass.depthStencilAttachment) {
            if (gpuRenderPass.depthStencilAttachment.format !== Format.UNKNOWN) {
                switch (gpuRenderPass.depthStencilAttachment.depthLoadOp) {
                case LoadOp.LOAD: break; // GL default behavior
                case LoadOp.CLEAR: {
                    if (!cacheDSS.depthWrite) {
                        gl.depthMask(true);
                    }

                    gl.clearDepth(clearDepth);

                    clears |= WebGLConstants.DEPTH_BUFFER_BIT;
                    break;
                }
                case LoadOp.DISCARD: {
                    // invalidate the framebuffer
                    // invalidateAttachments.push(WebGLConstants.DEPTH_ATTACHMENT);
                    break;
                }
                default:
                }

                if (FormatInfos[gpuRenderPass.depthStencilAttachment.format].hasStencil) {
                    switch (gpuRenderPass.depthStencilAttachment.stencilLoadOp) {
                    case LoadOp.LOAD: break; // GL default behavior
                    case LoadOp.CLEAR: {
                        if (!cacheDSS.stencilWriteMaskFront) {
                            gl.stencilMaskSeparate(WebGLConstants.FRONT, 0xffff);
                        }

                        if (!cacheDSS.stencilWriteMaskBack) {
                            gl.stencilMaskSeparate(WebGLConstants.BACK, 0xffff);
                        }

                        gl.clearStencil(clearStencil);
                        clears |= WebGLConstants.STENCIL_BUFFER_BIT;
                        break;
                    }
                    case LoadOp.DISCARD: {
                        // invalidate the framebuffer
                        // invalidateAttachments.push(WebGLConstants.STENCIL_ATTACHMENT);
                        break;
                    }
                    default:
                    }
                }
            }
        } // if (gpuRenderPass.depthStencilAttachment)

        /*
        if (invalidateAttachments.length) {
            gl.invalidateFramebuffer(WebGLConstants.FRAMEBUFFER, invalidateAttachments);
        }
        */

        if (clears) {
            gl.clear(clears);
        }

        // restore states
        if (clears & WebGLConstants.COLOR_BUFFER_BIT) {
            const colorMask = cache.bs.targets[0].blendColorMask;
            if (colorMask !== ColorMask.ALL) {
                const r = (colorMask & ColorMask.R) !== ColorMask.NONE;
                const g = (colorMask & ColorMask.G) !== ColorMask.NONE;
                const b = (colorMask & ColorMask.B) !== ColorMask.NONE;
                const a = (colorMask & ColorMask.A) !== ColorMask.NONE;
                gl.colorMask(r, g, b, a);
            }
        }

        if ((clears & WebGLConstants.DEPTH_BUFFER_BIT)
            && !cacheDSS.depthWrite) {
            gl.depthMask(false);
        }

        if (clears & WebGLConstants.STENCIL_BUFFER_BIT) {
            if (!cacheDSS.stencilWriteMaskFront) {
                gl.stencilMaskSeparate(WebGLConstants.FRONT, 0);
            }

            if (!cacheDSS.stencilWriteMaskBack) {
                gl.stencilMaskSeparate(WebGLConstants.BACK, 0);
            }
        }
    } // if (gpuFramebuffer)
}

export function WebGLCmdFuncBindStates (
    device: WebGLDevice,
    gpuPipelineState: IWebGLGPUPipelineState | null,
    gpuInputAssembler: IWebGLGPUInputAssembler | null,
    gpuDescriptorSets: Readonly<IWebGLGPUDescriptorSet[]>,
    dynamicOffsets: Readonly<number[]>,
    dynamicStates: Readonly<DynamicStates>,
): void {
    const { gl } = device;
    const cache = device.stateCache;
    const cacheDSS = cache.dss;
    const cacheBS = cache.bs;
    const gpuShader = gpuPipelineState && gpuPipelineState.gpuShader;

    let isShaderChanged = false;
    let glWrapS: number;
    let glWrapT: number;
    let glMinFilter: number;

    // bind pipeline
    if (gpuPipelineState && gfxStateCache.gpuPipelineState !== gpuPipelineState) {
        gfxStateCache.gpuPipelineState = gpuPipelineState;
        gfxStateCache.glPrimitive = gpuPipelineState.glPrimitive;

        if (gpuPipelineState.gpuShader) {
            const { glProgram } = gpuPipelineState.gpuShader;
            if (cache.glProgram !== glProgram) {
                gl.useProgram(glProgram);
                cache.glProgram = glProgram;
                isShaderChanged = true;
            }
        }

        // rasterizer state
        const { rs } = gpuPipelineState;
        const cacheRS = cache.rs;
        if (rs) {
            if (cacheRS.cullMode !== rs.cullMode) {
                switch (rs.cullMode) {
                case CullMode.NONE: {
                    gl.disable(WebGLConstants.CULL_FACE);
                    break;
                }
                case CullMode.FRONT: {
                    gl.enable(WebGLConstants.CULL_FACE);
                    gl.cullFace(WebGLConstants.FRONT);
                    break;
                }
                case CullMode.BACK: {
                    gl.enable(WebGLConstants.CULL_FACE);
                    gl.cullFace(WebGLConstants.BACK);
                    break;
                }
                default:
                }

                cacheRS.cullMode = rs.cullMode;
            }

            const isFrontFaceCCW = rs.isFrontFaceCCW;
            if (cacheRS.isFrontFaceCCW !== isFrontFaceCCW) {
                gl.frontFace(isFrontFaceCCW ? WebGLConstants.CCW : WebGLConstants.CW);
                cacheRS.isFrontFaceCCW = isFrontFaceCCW;
            }

            if ((cacheRS.depthBias !== rs.depthBias)
                || (cacheRS.depthBiasSlop !== rs.depthBiasSlop)) {
                gl.polygonOffset(rs.depthBias, rs.depthBiasSlop);
                cacheRS.depthBias = rs.depthBias;
                cacheRS.depthBiasSlop = rs.depthBiasSlop;
            }

            if (cacheRS.lineWidth !== rs.lineWidth) {
                gl.lineWidth(rs.lineWidth);
                cacheRS.lineWidth = rs.lineWidth;
            }
        } // rasterizater state

        // depth-stencil state
        const { dss } = gpuPipelineState;

        if (dss) {
            if (cacheDSS.depthTest !== dss.depthTest) {
                if (dss.depthTest) {
                    gl.enable(WebGLConstants.DEPTH_TEST);
                } else {
                    gl.disable(WebGLConstants.DEPTH_TEST);
                }
                cacheDSS.depthTest = dss.depthTest;
            }

            if (cacheDSS.depthWrite !== dss.depthWrite) {
                gl.depthMask(dss.depthWrite);
                cacheDSS.depthWrite = dss.depthWrite;
            }

            if (cacheDSS.depthFunc !== dss.depthFunc) {
                gl.depthFunc(WebGLCmpFuncs[dss.depthFunc]);
                cacheDSS.depthFunc = dss.depthFunc;
            }

            // front
            if ((cacheDSS.stencilTestFront !== dss.stencilTestFront)
                || (cacheDSS.stencilTestBack !== dss.stencilTestBack)) {
                if (dss.stencilTestFront || dss.stencilTestBack) {
                    gl.enable(WebGLConstants.STENCIL_TEST);
                } else {
                    gl.disable(WebGLConstants.STENCIL_TEST);
                }
                cacheDSS.stencilTestFront = dss.stencilTestFront;
                cacheDSS.stencilTestBack = dss.stencilTestBack;
            }

            if ((cacheDSS.stencilFuncFront !== dss.stencilFuncFront)
                || (cacheDSS.stencilRefFront !== dss.stencilRefFront)
                || (cacheDSS.stencilReadMaskFront !== dss.stencilReadMaskFront)) {
                gl.stencilFuncSeparate(
                    WebGLConstants.FRONT,
                    WebGLCmpFuncs[dss.stencilFuncFront],
                    dss.stencilRefFront,
                    dss.stencilReadMaskFront,
                );

                cacheDSS.stencilFuncFront = dss.stencilFuncFront;
                cacheDSS.stencilRefFront = dss.stencilRefFront;
                cacheDSS.stencilReadMaskFront = dss.stencilReadMaskFront;
            }

            if ((cacheDSS.stencilFailOpFront !== dss.stencilFailOpFront)
                || (cacheDSS.stencilZFailOpFront !== dss.stencilZFailOpFront)
                || (cacheDSS.stencilPassOpFront !== dss.stencilPassOpFront)) {
                gl.stencilOpSeparate(
                    WebGLConstants.FRONT,
                    WebGLStencilOps[dss.stencilFailOpFront],
                    WebGLStencilOps[dss.stencilZFailOpFront],
                    WebGLStencilOps[dss.stencilPassOpFront],
                );

                cacheDSS.stencilFailOpFront = dss.stencilFailOpFront;
                cacheDSS.stencilZFailOpFront = dss.stencilZFailOpFront;
                cacheDSS.stencilPassOpFront = dss.stencilPassOpFront;
            }

            if (cacheDSS.stencilWriteMaskFront !== dss.stencilWriteMaskFront) {
                gl.stencilMaskSeparate(WebGLConstants.FRONT, dss.stencilWriteMaskFront);
                cacheDSS.stencilWriteMaskFront = dss.stencilWriteMaskFront;
            }

            // back
            if ((cacheDSS.stencilFuncBack !== dss.stencilFuncBack)
                || (cacheDSS.stencilRefBack !== dss.stencilRefBack)
                || (cacheDSS.stencilReadMaskBack !== dss.stencilReadMaskBack)) {
                gl.stencilFuncSeparate(
                    WebGLConstants.BACK,
                    WebGLCmpFuncs[dss.stencilFuncBack],
                    dss.stencilRefBack,
                    dss.stencilReadMaskBack,
                );

                cacheDSS.stencilFuncBack = dss.stencilFuncBack;
                cacheDSS.stencilRefBack = dss.stencilRefBack;
                cacheDSS.stencilReadMaskBack = dss.stencilReadMaskBack;
            }

            if ((cacheDSS.stencilFailOpBack !== dss.stencilFailOpBack)
                || (cacheDSS.stencilZFailOpBack !== dss.stencilZFailOpBack)
                || (cacheDSS.stencilPassOpBack !== dss.stencilPassOpBack)) {
                gl.stencilOpSeparate(
                    WebGLConstants.BACK,
                    WebGLStencilOps[dss.stencilFailOpBack],
                    WebGLStencilOps[dss.stencilZFailOpBack],
                    WebGLStencilOps[dss.stencilPassOpBack],
                );

                cacheDSS.stencilFailOpBack = dss.stencilFailOpBack;
                cacheDSS.stencilZFailOpBack = dss.stencilZFailOpBack;
                cacheDSS.stencilPassOpBack = dss.stencilPassOpBack;
            }

            if (cacheDSS.stencilWriteMaskBack !== dss.stencilWriteMaskBack) {
                gl.stencilMaskSeparate(WebGLConstants.BACK, dss.stencilWriteMaskBack);
                cacheDSS.stencilWriteMaskBack = dss.stencilWriteMaskBack;
            }
        } // depth-stencil state

        // blend state
        const { bs } = gpuPipelineState;

        if (bs) {
            if (cacheBS.isA2C !== bs.isA2C) {
                if (bs.isA2C) {
                    gl.enable(WebGLConstants.SAMPLE_ALPHA_TO_COVERAGE);
                } else {
                    gl.disable(WebGLConstants.SAMPLE_ALPHA_TO_COVERAGE);
                }
                cacheBS.isA2C = bs.isA2C;
            }

            if ((cacheBS.blendColor.x !== bs.blendColor.x)
                || (cacheBS.blendColor.y !== bs.blendColor.y)
                || (cacheBS.blendColor.z !== bs.blendColor.z)
                || (cacheBS.blendColor.w !== bs.blendColor.w)) {
                gl.blendColor(bs.blendColor.x, bs.blendColor.y, bs.blendColor.z, bs.blendColor.w);

                cacheBS.blendColor.x = bs.blendColor.x;
                cacheBS.blendColor.y = bs.blendColor.y;
                cacheBS.blendColor.z = bs.blendColor.z;
                cacheBS.blendColor.w = bs.blendColor.w;
            }

            const target0 = bs.targets[0];
            const target0Cache = cacheBS.targets[0];

            if (target0Cache.blend !== target0.blend) {
                if (target0.blend) {
                    gl.enable(WebGLConstants.BLEND);
                } else {
                    gl.disable(WebGLConstants.BLEND);
                }
                target0Cache.blend = target0.blend;
            }

            if ((target0Cache.blendEq !== target0.blendEq)
                || (target0Cache.blendAlphaEq !== target0.blendAlphaEq)) {
                gl.blendEquationSeparate(WebGLBlendOps[target0.blendEq], WebGLBlendOps[target0.blendAlphaEq]);
                target0Cache.blendEq = target0.blendEq;
                target0Cache.blendAlphaEq = target0.blendAlphaEq;
            }

            if ((target0Cache.blendSrc !== target0.blendSrc)
                || (target0Cache.blendDst !== target0.blendDst)
                || (target0Cache.blendSrcAlpha !== target0.blendSrcAlpha)
                || (target0Cache.blendDstAlpha !== target0.blendDstAlpha)) {
                gl.blendFuncSeparate(
                    WebGLBlendFactors[target0.blendSrc],
                    WebGLBlendFactors[target0.blendDst],
                    WebGLBlendFactors[target0.blendSrcAlpha],
                    WebGLBlendFactors[target0.blendDstAlpha],
                );

                target0Cache.blendSrc = target0.blendSrc;
                target0Cache.blendDst = target0.blendDst;
                target0Cache.blendSrcAlpha = target0.blendSrcAlpha;
                target0Cache.blendDstAlpha = target0.blendDstAlpha;
            }

            if (target0Cache.blendColorMask !== target0.blendColorMask) {
                gl.colorMask(
                    (target0.blendColorMask & ColorMask.R) !== ColorMask.NONE,
                    (target0.blendColorMask & ColorMask.G) !== ColorMask.NONE,
                    (target0.blendColorMask & ColorMask.B) !== ColorMask.NONE,
                    (target0.blendColorMask & ColorMask.A) !== ColorMask.NONE,
                );

                target0Cache.blendColorMask = target0.blendColorMask;
            }
        } // blend state
    } // bind pipeline

    // bind descriptor sets
    if (gpuPipelineState && gpuPipelineState.gpuPipelineLayout && gpuShader) {
        const blockLen = gpuShader.glBlocks.length;
        const { dynamicOffsetIndices } = gpuPipelineState.gpuPipelineLayout;

        for (let j = 0; j < blockLen; j++) {
            const glBlock = gpuShader.glBlocks[j];
            const gpuDescriptorSet = gpuDescriptorSets[glBlock.set];
            const descriptorIdx = gpuDescriptorSet && gpuDescriptorSet.descriptorIndices[glBlock.binding];
            const gpuDescriptor = descriptorIdx >= 0 && gpuDescriptorSet.gpuDescriptors[descriptorIdx];
            let vf32: Float32Array | null = null; let offset = 0;

            if (gpuDescriptor && gpuDescriptor.gpuBuffer) {
                const { gpuBuffer } = gpuDescriptor;
                const dynamicOffsetIndexSet = dynamicOffsetIndices[glBlock.set];
                const dynamicOffsetIndex = dynamicOffsetIndexSet && dynamicOffsetIndexSet[glBlock.binding];
                if (dynamicOffsetIndex >= 0) { offset = dynamicOffsets[dynamicOffsetIndex]; }

                if ('vf32' in gpuBuffer) {
                    vf32 = gpuBuffer.vf32;
                } else {
                    offset += gpuBuffer.offset;
                    vf32 = gpuBuffer.gpuBuffer.vf32;
                }
                offset >>= 2;
            }

            if (!vf32) {
                // error(`Buffer binding '${glBlock.name}' at set ${glBlock.set} binding ${glBlock.binding} is not bounded`);
                continue;
            }

            const uniformLen = glBlock.glActiveUniforms.length;
            for (let l = 0; l < uniformLen; l++) {
                const glUniform = glBlock.glActiveUniforms[l];
                switch (glUniform.glType) {
                case WebGLConstants.BOOL:
                case WebGLConstants.INT: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform1iv(glUniform.glLoc, glUniform.array as Int32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.BOOL_VEC2:
                case WebGLConstants.INT_VEC2: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform2iv(glUniform.glLoc, glUniform.array as Int32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.BOOL_VEC3:
                case WebGLConstants.INT_VEC3: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform3iv(glUniform.glLoc, glUniform.array as Int32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.BOOL_VEC4:
                case WebGLConstants.INT_VEC4: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform4iv(glUniform.glLoc, glUniform.array as Int32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform1fv(glUniform.glLoc, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_VEC2: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform2fv(glUniform.glLoc, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_VEC3: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform3fv(glUniform.glLoc, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_VEC4: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniform4fv(glUniform.glLoc, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_MAT2: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniformMatrix2fv(glUniform.glLoc, false, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_MAT3: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniformMatrix3fv(glUniform.glLoc, false, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                case WebGLConstants.FLOAT_MAT4: {
                    for (let u = 0; u < glUniform.array.length; ++u) {
                        const idx = glUniform.offset + offset + u;
                        if (vf32[idx] !== glUniform.array[u]) {
                            for (let n = u, m = idx; n < glUniform.array.length; ++n, ++m) {
                                glUniform.array[n] = vf32[m];
                            }
                            gl.uniformMatrix4fv(glUniform.glLoc, false, glUniform.array as Float32Array);
                            break;
                        }
                    }
                    break;
                }
                default:
                }
            }
            continue;
        }

        const samplerLen = gpuShader.glSamplerTextures.length;
        for (let i = 0; i < samplerLen; i++) {
            const glSampler = gpuShader.glSamplerTextures[i];
            const gpuDescriptorSet = gpuDescriptorSets[glSampler.set];
            let descriptorIndex = gpuDescriptorSet && gpuDescriptorSet.descriptorIndices[glSampler.binding];
            let gpuDescriptor = descriptorIndex >= 0 && gpuDescriptorSet.gpuDescriptors[descriptorIndex];

            const texUnitLen = glSampler.units.length;
            for (let l = 0; l < texUnitLen; l++) {
                const texUnit = glSampler.units[l];

                if (!gpuDescriptor || !gpuDescriptor.gpuSampler) {
                    // error(`Sampler binding '${glSampler.name}' at set ${glSampler.set} binding ${glSampler.binding} index ${l} is not bounded`);
                    continue;
                }

                if (gpuDescriptor.gpuTexture && gpuDescriptor.gpuTexture.size > 0) {
                    const { gpuTexture } = gpuDescriptor;
                    const glTexUnit = cache.glTexUnits[texUnit];

                    if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                        if (cache.texUnit !== texUnit) {
                            gl.activeTexture(WebGLConstants.TEXTURE0 + texUnit);
                            cache.texUnit = texUnit;
                        }
                        if (gpuTexture.glTexture) {
                            gl.bindTexture(gpuTexture.glTarget, gpuTexture.glTexture);
                        } else {
                            gl.bindTexture(gpuTexture.glTarget, device.nullTex2D.gpuTexture.glTexture);
                        }
                        glTexUnit.glTexture = gpuTexture.glTexture;
                    }

                    const { gpuSampler } = gpuDescriptor;
                    if (gpuTexture.isPowerOf2) {
                        glWrapS = gpuSampler.glWrapS;
                        glWrapT = gpuSampler.glWrapT;
                    } else {
                        glWrapS = WebGLConstants.CLAMP_TO_EDGE;
                        glWrapT = WebGLConstants.CLAMP_TO_EDGE;
                    }

                    if (gpuTexture.isPowerOf2) {
                        if (gpuTexture.mipLevel <= 1
                            && (gpuSampler.glMinFilter === WebGLConstants.LINEAR_MIPMAP_NEAREST
                            || gpuSampler.glMinFilter === WebGLConstants.LINEAR_MIPMAP_LINEAR)) {
                            glMinFilter = WebGLConstants.LINEAR;
                        } else {
                            glMinFilter = gpuSampler.glMinFilter;
                        }
                    } else if (gpuSampler.glMinFilter === WebGLConstants.LINEAR
                            || gpuSampler.glMinFilter === WebGLConstants.LINEAR_MIPMAP_NEAREST
                            || gpuSampler.glMinFilter === WebGLConstants.LINEAR_MIPMAP_LINEAR) {
                        glMinFilter = WebGLConstants.LINEAR;
                    } else {
                        glMinFilter = WebGLConstants.NEAREST;
                    }

                    if (gpuTexture.glWrapS !== glWrapS) {
                        if (cache.texUnit !== texUnit) {
                            gl.activeTexture(WebGLConstants.TEXTURE0 + texUnit);
                            cache.texUnit = texUnit;
                        }
                        gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_S, glWrapS);
                        gpuTexture.glWrapS = glWrapS;
                    }

                    if (gpuTexture.glWrapT !== glWrapT) {
                        if (cache.texUnit !== texUnit) {
                            gl.activeTexture(WebGLConstants.TEXTURE0 + texUnit);
                            cache.texUnit = texUnit;
                        }
                        gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_WRAP_T, glWrapT);
                        gpuTexture.glWrapT = glWrapT;
                    }

                    if (gpuTexture.glMinFilter !== glMinFilter) {
                        if (cache.texUnit !== texUnit) {
                            gl.activeTexture(WebGLConstants.TEXTURE0 + texUnit);
                            cache.texUnit = texUnit;
                        }
                        gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MIN_FILTER, glMinFilter);
                        gpuTexture.glMinFilter = glMinFilter;
                    }

                    if (gpuTexture.glMagFilter !== gpuSampler.glMagFilter) {
                        if (cache.texUnit !== texUnit) {
                            gl.activeTexture(WebGLConstants.TEXTURE0 + texUnit);
                            cache.texUnit = texUnit;
                        }
                        gl.texParameteri(gpuTexture.glTarget, WebGLConstants.TEXTURE_MAG_FILTER, gpuSampler.glMagFilter);
                        gpuTexture.glMagFilter = gpuSampler.glMagFilter;
                    }
                }

                gpuDescriptor = gpuDescriptorSet.gpuDescriptors[++descriptorIndex];
            }
        }
    } // bind descriptor sets

    // bind vertex/index buffer
    if (gpuInputAssembler && gpuShader
        && (isShaderChanged || gfxStateCache.gpuInputAssembler !== gpuInputAssembler)) {
        gfxStateCache.gpuInputAssembler = gpuInputAssembler;
        const ia = device.extensions.ANGLE_instanced_arrays;

        if (device.extensions.useVAO) {
            const vao = device.extensions.OES_vertex_array_object!;

            // check vao
            let glVAO = gpuInputAssembler.glVAOs.get(gpuShader.glProgram!);
            if (!glVAO) {
                glVAO = vao.createVertexArrayOES()!;
                gpuInputAssembler.glVAOs.set(gpuShader.glProgram!, glVAO);

                vao.bindVertexArrayOES(glVAO);
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                cache.glArrayBuffer = null;
                cache.glElementArrayBuffer = null;

                let glAttrib: IWebGLAttrib | null;
                const inputLen = gpuShader.glInputs.length;
                for (let j = 0; j < inputLen; j++) {
                    const glInput = gpuShader.glInputs[j];
                    glAttrib = null;

                    const attribLen = gpuInputAssembler.glAttribs.length;
                    for (let k = 0; k < attribLen; k++) {
                        const attrib = gpuInputAssembler.glAttribs[k];
                        if (attrib.name === glInput.name) {
                            glAttrib = attrib;
                            break;
                        }
                    }

                    if (glAttrib) {
                        if (cache.glArrayBuffer !== glAttrib.glBuffer) {
                            gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, glAttrib.glBuffer);
                            cache.glArrayBuffer = glAttrib.glBuffer;
                        }

                        for (let c = 0; c < glAttrib.componentCount; ++c) {
                            const glLoc = glInput.glLoc + c;
                            const attribOffset = glAttrib.offset + glAttrib.size * c;

                            gl.enableVertexAttribArray(glLoc);
                            cache.glCurrentAttribLocs[glLoc] = true;

                            gl.vertexAttribPointer(glLoc, glAttrib.count, glAttrib.glType, glAttrib.isNormalized, glAttrib.stride, attribOffset);
                            if (ia) { ia.vertexAttribDivisorANGLE(glLoc, glAttrib.isInstanced ? 1 : 0); }
                        }
                    }
                }

                const gpuBuffer = gpuInputAssembler.gpuIndexBuffer;
                if (gpuBuffer) {
                    gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                }

                vao.bindVertexArrayOES(null);
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                cache.glArrayBuffer = null;
                cache.glElementArrayBuffer = null;
            }

            if (cache.glVAO !== glVAO) {
                vao.bindVertexArrayOES(glVAO);
                cache.glVAO = glVAO;
            }
        } else {
            for (let a = 0; a < device.capabilities.maxVertexAttributes; ++a) {
                cache.glCurrentAttribLocs[a] = false;
            }

            const inputLen = gpuShader.glInputs.length;
            for (let j = 0; j < inputLen; j++) {
                const glInput = gpuShader.glInputs[j];
                let glAttrib: IWebGLAttrib | null = null;

                const attribLen = gpuInputAssembler.glAttribs.length;
                for (let k = 0; k < attribLen; k++) {
                    const attrib = gpuInputAssembler.glAttribs[k];
                    if (attrib.name === glInput.name) {
                        glAttrib = attrib;
                        break;
                    }
                }

                if (glAttrib) {
                    if (cache.glArrayBuffer !== glAttrib.glBuffer) {
                        gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, glAttrib.glBuffer);
                        cache.glArrayBuffer = glAttrib.glBuffer;
                    }

                    for (let c = 0; c < glAttrib.componentCount; ++c) {
                        const glLoc = glInput.glLoc + c;
                        const attribOffset = glAttrib.offset + glAttrib.size * c;

                        if (!cache.glEnabledAttribLocs[glLoc] && glLoc >= 0) {
                            gl.enableVertexAttribArray(glLoc);
                            cache.glEnabledAttribLocs[glLoc] = true;
                        }
                        cache.glCurrentAttribLocs[glLoc] = true;

                        gl.vertexAttribPointer(glLoc, glAttrib.count, glAttrib.glType, glAttrib.isNormalized, glAttrib.stride, attribOffset);
                        if (ia) { ia.vertexAttribDivisorANGLE(glLoc, glAttrib.isInstanced ? 1 : 0); }
                    }
                }
            } // for

            const gpuBuffer = gpuInputAssembler.gpuIndexBuffer;
            if (gpuBuffer) {
                if (cache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
                    gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                    cache.glElementArrayBuffer = gpuBuffer.glBuffer;
                }
            }

            for (let a = 0; a < device.capabilities.maxVertexAttributes; ++a) {
                if (cache.glEnabledAttribLocs[a] !== cache.glCurrentAttribLocs[a]) {
                    gl.disableVertexAttribArray(a);
                    cache.glEnabledAttribLocs[a] = false;
                }
            }
        }
    } // bind vertex/index buffer

    // update dynamic states
    if (gpuPipelineState && gpuPipelineState.dynamicStates.length) {
        const dsLen = gpuPipelineState.dynamicStates.length;
        for (let j = 0; j < dsLen; j++) {
            const dynamicState = gpuPipelineState.dynamicStates[j];
            switch (dynamicState) {
            case DynamicStateFlagBit.LINE_WIDTH: {
                if (cache.rs.lineWidth !== dynamicStates.lineWidth) {
                    gl.lineWidth(dynamicStates.lineWidth);
                    cache.rs.lineWidth = dynamicStates.lineWidth;
                }
                break;
            }
            case DynamicStateFlagBit.DEPTH_BIAS: {
                if (cache.rs.depthBias !== dynamicStates.depthBiasConstant
                    || cache.rs.depthBiasSlop !== dynamicStates.depthBiasSlope) {
                    gl.polygonOffset(dynamicStates.depthBiasConstant, dynamicStates.depthBiasSlope);
                    cache.rs.depthBias = dynamicStates.depthBiasConstant;
                    cache.rs.depthBiasSlop = dynamicStates.depthBiasSlope;
                }
                break;
            }
            case DynamicStateFlagBit.BLEND_CONSTANTS: {
                const blendConstant = dynamicStates.blendConstant;
                if ((cacheBS.blendColor.x !== blendConstant.x)
                    || (cacheBS.blendColor.y !== blendConstant.y)
                    || (cacheBS.blendColor.z !== blendConstant.z)
                    || (cacheBS.blendColor.w !== blendConstant.w)) {
                    gl.blendColor(blendConstant.x, blendConstant.y, blendConstant.z, blendConstant.w);
                    cacheBS.blendColor.copy(blendConstant);
                }
                break;
            }
            case DynamicStateFlagBit.STENCIL_WRITE_MASK: {
                const front = dynamicStates.stencilStatesFront;
                const back = dynamicStates.stencilStatesBack;
                if (cacheDSS.stencilWriteMaskFront !== front.writeMask) {
                    gl.stencilMaskSeparate(WebGLConstants.FRONT, front.writeMask);
                    cacheDSS.stencilWriteMaskFront = front.writeMask;
                }
                if (cacheDSS.stencilWriteMaskBack !== back.writeMask) {
                    gl.stencilMaskSeparate(WebGLConstants.BACK, back.writeMask);
                    cacheDSS.stencilWriteMaskBack = back.writeMask;
                }
                break;
            }
            case DynamicStateFlagBit.STENCIL_COMPARE_MASK: {
                const front = dynamicStates.stencilStatesFront;
                const back = dynamicStates.stencilStatesBack;
                if (cacheDSS.stencilRefFront !== front.reference
                    || cacheDSS.stencilReadMaskFront !== front.compareMask) {
                    gl.stencilFuncSeparate(WebGLConstants.FRONT, WebGLCmpFuncs[cacheDSS.stencilFuncFront], front.reference, front.compareMask);
                    cacheDSS.stencilRefFront = front.reference;
                    cacheDSS.stencilReadMaskFront = front.compareMask;
                }
                if (cacheDSS.stencilRefBack !== back.reference
                    || cacheDSS.stencilReadMaskBack !== back.compareMask) {
                    gl.stencilFuncSeparate(WebGLConstants.BACK, WebGLCmpFuncs[cacheDSS.stencilFuncBack], back.reference, back.compareMask);
                    cacheDSS.stencilRefBack = back.reference;
                    cacheDSS.stencilReadMaskBack = back.compareMask;
                }
                break;
            }
            default:
            } // switch
        } // for
    } // update dynamic states
}

export function WebGLCmdFuncDraw (device: WebGLDevice, drawInfo: Readonly<DrawInfo>): void {
    const { gl } = device;
    const { ANGLE_instanced_arrays: ia, WEBGL_multi_draw: md } = device.extensions;
    const { gpuInputAssembler, glPrimitive } = gfxStateCache;

    if (gpuInputAssembler) {
        const indexBuffer = gpuInputAssembler.gpuIndexBuffer;
        if (gpuInputAssembler.gpuIndirectBuffer) {
            const indirects = gpuInputAssembler.gpuIndirectBuffer.indirects;
            if (indirects.drawByIndex) {
                for (let j = 0; j < indirects.drawCount; j++) {
                    indirects.byteOffsets[j] = indirects.offsets[j] * indexBuffer!.stride;
                }
                if (md) {
                    if (indirects.instancedDraw) {
                        md.multiDrawElementsInstancedWEBGL(
                            glPrimitive,
                            indirects.counts,
                            0,
                            gpuInputAssembler.glIndexType,
                            indirects.byteOffsets,
                            0,
                            indirects.instances,
                            0,
                            indirects.drawCount,
                        );
                    } else {
                        md.multiDrawElementsWEBGL(
                            glPrimitive,
                            indirects.counts,
                            0,
                            gpuInputAssembler.glIndexType,
                            indirects.byteOffsets,
                            0,
                            indirects.drawCount,
                        );
                    }
                } else {
                    for (let j = 0; j < indirects.drawCount; j++) {
                        if (indirects.instances[j] && ia) {
                            ia.drawElementsInstancedANGLE(
                                glPrimitive,
                                indirects.counts[j],
                                gpuInputAssembler.glIndexType,
                                indirects.byteOffsets[j],
                                indirects.instances[j],
                            );
                        } else {
                            gl.drawElements(glPrimitive, indirects.counts[j], gpuInputAssembler.glIndexType, indirects.byteOffsets[j]);
                        }
                    }
                }
            } else if (md) {
                if (indirects.instancedDraw) {
                    md.multiDrawArraysInstancedWEBGL(
                        glPrimitive,
                        indirects.offsets,
                        0,
                        indirects.counts,
                        0,
                        indirects.instances,
                        0,
                        indirects.drawCount,
                    );
                } else {
                    md.multiDrawArraysWEBGL(
                        glPrimitive,
                        indirects.offsets,
                        0,
                        indirects.counts,
                        0,
                        indirects.drawCount,
                    );
                }
            } else {
                for (let j = 0; j < indirects.drawCount; j++) {
                    if (indirects.instances[j] && ia) {
                        ia.drawArraysInstancedANGLE(glPrimitive, indirects.offsets[j], indirects.counts[j], indirects.instances[j]);
                    } else {
                        gl.drawArrays(glPrimitive, indirects.offsets[j], indirects.counts[j]);
                    }
                }
            }
        } else if (drawInfo.instanceCount && ia) {
            if (indexBuffer) {
                if (drawInfo.indexCount > 0) {
                    const offset = drawInfo.firstIndex * indexBuffer.stride;
                    ia.drawElementsInstancedANGLE(
                        glPrimitive,
                        drawInfo.indexCount,
                        gpuInputAssembler.glIndexType,
                        offset,
                        drawInfo.instanceCount,
                    );
                }
            } else if (drawInfo.vertexCount > 0) {
                ia.drawArraysInstancedANGLE(glPrimitive, drawInfo.firstVertex, drawInfo.vertexCount, drawInfo.instanceCount);
            }
        } else if (indexBuffer) {
            if (drawInfo.indexCount > 0) {
                const offset = drawInfo.firstIndex * indexBuffer.stride;
                gl.drawElements(glPrimitive, drawInfo.indexCount, gpuInputAssembler.glIndexType, offset);
            }
        } else if (drawInfo.vertexCount > 0) {
            gl.drawArrays(glPrimitive, drawInfo.firstVertex, drawInfo.vertexCount);
        }
    }
}

export function WebGLCmdFuncCopyTexImagesToTexture (
    device: WebGLDevice,
    texImages: Readonly<TexImageSource[]>,
    gpuTexture: IWebGLGPUTexture,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl, stateCache } = device;
    const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];
    if (glTexUnit.glTexture !== gpuTexture.glTexture) {
        gl.bindTexture(gpuTexture.glTarget, gpuTexture.glTexture);
        glTexUnit.glTexture = gpuTexture.glTexture;
    }

    let n = 0;
    let f = 0;

    switch (gpuTexture.glTarget) {
    case WebGLConstants.TEXTURE_2D: {
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            // console.debug('Copying image to texture 2D: ' + region.texExtent.width + ' x ' + region.texExtent.height);
            gl.texSubImage2D(
                WebGLConstants.TEXTURE_2D,
                region.texSubres.mipLevel,
                region.texOffset.x,
                region.texOffset.y,
                gpuTexture.glFormat,
                gpuTexture.glType,
                texImages[n++],
            );
        }
        break;
    }
    case WebGLConstants.TEXTURE_CUBE_MAP: {
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const regionTexOffset = region.texOffset;
            const regionTexSubres = region.texSubres;
            // console.debug('Copying image to texture cube: ' + region.texExtent.width + ' x ' + region.texExtent.height);
            const fcount = regionTexSubres.baseArrayLayer + regionTexSubres.layerCount;
            for (f = regionTexSubres.baseArrayLayer; f < fcount; ++f) {
                gl.texSubImage2D(
                    WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                    regionTexSubres.mipLevel,
                    regionTexOffset.x,
                    regionTexOffset.y,
                    gpuTexture.glFormat,
                    gpuTexture.glType,
                    texImages[n++],
                );
            }
        }
        break;
    }
    default: {
        errorID(16327);
    }
    }

    if ((gpuTexture.flags & TextureFlagBit.GEN_MIPMAP)
        && gpuTexture.isPowerOf2) {
        gl.generateMipmap(gpuTexture.glTarget);
    }
}

let stagingBuffer = new Uint8Array(1);
function pixelBufferPick (
    buffer: ArrayBufferView,
    format: Format,
    offset: number,
    stride: Extent,
    extent: Extent,
): ArrayBufferView {
    const blockHeight = formatAlignment(format).height;

    const bufferSize = FormatSize(format, extent.width, extent.height, extent.depth);
    const rowStride = FormatSize(format, stride.width, 1, 1);
    const sliceStride = FormatSize(format, stride.width, stride.height, 1);
    const chunkSize = FormatSize(format, extent.width, 1, 1);

    const ArrayBufferCtor: TypedArrayConstructor = getTypedArrayConstructor(FormatInfos[format]);

    if (stagingBuffer.byteLength < bufferSize) {
        stagingBuffer = new Uint8Array(bufferSize);
    }

    let destOffset = 0;
    let bufferOffset = offset;

    for (let i = 0; i < extent.depth; i++) {
        bufferOffset = offset + sliceStride * i;
        for (let j = 0; j < extent.height; j += blockHeight) {
            stagingBuffer.subarray(destOffset, destOffset + chunkSize).set(
                new Uint8Array(buffer.buffer, buffer.byteOffset + bufferOffset, chunkSize),
            );
            destOffset += chunkSize;
            bufferOffset += rowStride;
        }
    }
    const length = bufferSize / ArrayBufferCtor.BYTES_PER_ELEMENT;
    assertID(Number.isInteger(length), 9101);
    return new ArrayBufferCtor(stagingBuffer.buffer, 0, length);
}

export function WebGLCmdFuncCopyBuffersToTexture (
    device: WebGLDevice,
    buffers: Readonly<ArrayBufferView[]>,
    gpuTexture: IWebGLGPUTexture,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl, stateCache } = device;
    const glTexUnit = stateCache.glTexUnits[stateCache.texUnit];
    if (glTexUnit.glTexture !== gpuTexture.glTexture) {
        gl.bindTexture(gpuTexture.glTarget, gpuTexture.glTexture);
        glTexUnit.glTexture = gpuTexture.glTexture;
    }

    let n = 0;
    let f = 0;
    const fmtInfo: FormatInfo = FormatInfos[gpuTexture.format];
    const ArrayBufferCtor: TypedArrayConstructor = getTypedArrayConstructor(fmtInfo);
    const { isCompressed } = fmtInfo;

    const blockSize = formatAlignment(gpuTexture.format);

    const extent: Extent = new Extent();
    const offset: Offset = new Offset();
    const stride: Extent = new Extent();

    switch (gpuTexture.glTarget) {
    case WebGLConstants.TEXTURE_2D: {
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const mipLevel = region.texSubres.mipLevel;

            const regionTexOffset = region.texOffset;
            const regionTexExtent = region.texExtent;
            const regionTexExtentWidth = regionTexExtent.width;
            const regionTexExtentHeight = regionTexExtent.height;
            const blockSizeWidth = blockSize.width;
            const blockSizeHeight = blockSize.height;
            const regionBuffStride = region.buffStride;

            offset.x =  regionTexOffset.x === 0 ? 0 : alignTo(regionTexOffset.x, blockSizeWidth);
            offset.y =  regionTexOffset.y === 0 ? 0 : alignTo(regionTexOffset.y, blockSizeHeight);
            extent.width = regionTexExtentWidth < blockSizeWidth ? regionTexExtentWidth : alignTo(regionTexExtentWidth, blockSizeWidth);
            extent.height = regionTexExtentHeight < blockSizeHeight ? regionTexExtentWidth
                : alignTo(regionTexExtentHeight, blockSizeHeight);
            stride.width = regionBuffStride > 0 ?  regionBuffStride : extent.width;
            stride.height = region.buffTexHeight > 0 ? region.buffTexHeight : extent.height;

            const destWidth  = (regionTexExtentWidth + offset.x === (gpuTexture.width >> mipLevel)) ? regionTexExtentWidth : extent.width;
            const destHeight = (regionTexExtentHeight + offset.y === (gpuTexture.height >> mipLevel)) ? regionTexExtentHeight : extent.height;

            let pixels: ArrayBufferView;
            const buffer = buffers[n++];
            if (stride.width === extent.width && stride.height === extent.height) {
                const length = FormatSize(gpuTexture.format, destWidth, destHeight, 1) / ArrayBufferCtor.BYTES_PER_ELEMENT;
                assertID(Number.isInteger(length), 9101);
                pixels = new ArrayBufferCtor(buffer.buffer, buffer.byteOffset + region.buffOffset, length);
            } else {
                pixels = pixelBufferPick(buffer, gpuTexture.format, region.buffOffset, stride, extent);
            }

            if (!isCompressed) {
                gl.texSubImage2D(
                    WebGLConstants.TEXTURE_2D,
                    mipLevel,
                    offset.x,
                    offset.y,
                    destWidth,
                    destHeight,
                    gpuTexture.glFormat,
                    gpuTexture.glType,
                    pixels,
                );
            } else if (gpuTexture.glInternalFmt !== (WebGLEXT.COMPRESSED_RGB_ETC1_WEBGL as number) && !device.extensions.noCompressedTexSubImage2D) {
                gl.compressedTexSubImage2D(
                    WebGLConstants.TEXTURE_2D,
                    mipLevel,
                    offset.x,
                    offset.y,
                    destWidth,
                    destHeight,
                    gpuTexture.glFormat,
                    pixels,
                );
            } else { // WEBGL_compressed_texture_etc1
                gl.compressedTexImage2D(
                    WebGLConstants.TEXTURE_2D,
                    mipLevel,
                    gpuTexture.glInternalFmt,
                    destWidth,
                    destHeight,
                    0,
                    pixels,
                );
            }
        }
        break;
    }
    case WebGLConstants.TEXTURE_CUBE_MAP: {
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const mipLevel = region.texSubres.mipLevel;

            const regionTexOffset = region.texOffset;
            const regionTexExtent = region.texExtent;
            const regionTexSubres = region.texSubres;
            const regionTexExtentWidth = regionTexExtent.width;
            const regionTexExtentHeight = regionTexExtent.height;
            const blockSizeWidth = blockSize.width;
            const blockSizeHeight = blockSize.height;

            offset.x =  regionTexOffset.x === 0 ? 0 : alignTo(regionTexOffset.x, blockSizeWidth);
            offset.y =  regionTexOffset.y === 0 ? 0 : alignTo(regionTexOffset.y, blockSizeHeight);
            extent.width = regionTexExtentWidth < blockSizeWidth ? regionTexExtentWidth : alignTo(regionTexExtentWidth, blockSizeWidth);
            extent.height = regionTexExtentHeight < blockSizeHeight ? regionTexExtentWidth
                : alignTo(regionTexExtentHeight, blockSizeHeight);
            stride.width = region.buffStride > 0 ?  region.buffStride : extent.width;
            stride.height = region.buffTexHeight > 0 ? region.buffTexHeight : extent.height;

            const destWidth  = (regionTexExtentWidth + offset.x === (gpuTexture.width >> mipLevel)) ? regionTexExtentWidth : extent.width;
            const destHeight = (regionTexExtentHeight + offset.y === (gpuTexture.height >> mipLevel)) ? regionTexExtentHeight : extent.height;

            const fcount = regionTexSubres.baseArrayLayer + regionTexSubres.layerCount;
            for (f = regionTexSubres.baseArrayLayer; f < fcount; ++f) {
                let pixels: ArrayBufferView;
                const buffer = buffers[n++];
                if (stride.width === extent.width && stride.height === extent.height) {
                    const length = FormatSize(gpuTexture.format, destWidth, destHeight, 1) / ArrayBufferCtor.BYTES_PER_ELEMENT;
                    assertID(Number.isInteger(length), 9101);
                    pixels = new ArrayBufferCtor(buffer.buffer, buffer.byteOffset + region.buffOffset, length);
                } else {
                    pixels = pixelBufferPick(buffer, gpuTexture.format, region.buffOffset, stride, extent);
                }

                if (!isCompressed) {
                    gl.texSubImage2D(
                        WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                        mipLevel,
                        offset.x,
                        offset.y,
                        destWidth,
                        destHeight,
                        gpuTexture.glFormat,
                        gpuTexture.glType,
                        pixels,
                    );
                } else if (gpuTexture.glInternalFmt !== (WebGLEXT.COMPRESSED_RGB_ETC1_WEBGL as number)
                    && !device.extensions.noCompressedTexSubImage2D) {
                    gl.compressedTexSubImage2D(
                        WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                        mipLevel,
                        offset.x,
                        offset.y,
                        destWidth,
                        destHeight,
                        gpuTexture.glFormat,
                        pixels,
                    );
                } else { // WEBGL_compressed_texture_etc1
                    gl.compressedTexImage2D(
                        WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f,
                        mipLevel,
                        gpuTexture.glInternalFmt,
                        destWidth,
                        destHeight,
                        0,
                        pixels,
                    );
                }
            }
        }
        break;
    }
    default: {
        errorID(16327);
    }
    }

    if (gpuTexture.flags & TextureFlagBit.GEN_MIPMAP) {
        gl.generateMipmap(gpuTexture.glTarget);
    }
}

export function WebGLCmdFuncCopyTextureToBuffers (
    device: WebGLDevice,
    gpuTexture: IWebGLGPUTexture,
    buffers: Readonly<ArrayBufferView[]>,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl } = device;
    const cache = device.stateCache;

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, framebuffer);
    let x = 0;
    let y = 0;
    let w = 1;
    let h = 1;

    switch (gpuTexture.glTarget) {
    case WebGLConstants.TEXTURE_2D: {
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
            gl.framebufferTexture2D(
                WebGLConstants.FRAMEBUFFER,
                WebGLConstants.COLOR_ATTACHMENT0,
                gpuTexture.glTarget,
                gpuTexture.glTexture,
                region.texSubres.mipLevel,
            );
            x = region.texOffset.x;
            y = region.texOffset.y;
            w = region.texExtent.width;
            h = region.texExtent.height;
            gl.readPixels(x, y, w, h, gpuTexture.glFormat, gpuTexture.glType, buffers[k]);
        }
        break;
    }
    default: {
        errorID(16399);
    }
    }
    gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, null);
    cache.glFramebuffer = null;
    gl.deleteFramebuffer(framebuffer);
}

export function WebGLCmdFuncBlitTexture (
    device: WebGLDevice,
    srcTexture: Readonly<IWebGLGPUTexture>,
    dstTexture: IWebGLGPUTexture,
    regions: Readonly<TextureBlit []>,
    filter: Filter,
): void {
    // logic different from native, because framebuffer map is not implemented in webgl
    device.blitManager.draw(srcTexture, dstTexture, regions as TextureBlit[], filter);
}
