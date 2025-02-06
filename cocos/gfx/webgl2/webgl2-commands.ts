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

import { systemInfo } from 'pal/system-info';
import {
    BufferUsageBit, ColorMask, CullMode, DynamicStateFlagBit, Filter, Format, TextureType, Type, FormatInfo,
    FormatInfos, FormatSize, LoadOp, MemoryUsageBit, SampleCount, ShaderStageFlagBit, TextureFlagBit,
    Color, Rect, BufferTextureCopy, BufferSource, DrawInfo, IndirectBuffer, UniformBlock, DynamicStates,
    UniformSamplerTexture, alignTo, Extent, formatAlignment, getTypedArrayConstructor, Offset, TextureBlit,
} from '../base/define';
import { WebGL2EXT } from './webgl2-define';
import { WebGL2Device } from './webgl2-device';
import {
    IWebGL2GPUInputAssembler,
    IWebGL2Attrib,
    IWebGL2GPUDescriptorSet,
    IWebGL2GPUBuffer,
    IWebGL2GPUFramebuffer,
    IWebGL2GPUInput,
    IWebGL2GPUPipelineState,
    IWebGL2GPUSampler,
    IWebGL2GPUShader,
    IWebGL2GPUTexture,
    IWebGL2GPUUniformBlock,
    IWebGL2GPUUniformSamplerTexture,
    IWebGL2GPURenderPass,
} from './webgl2-gpu-objects';
import { error, errorID, assertID, debugID } from '../../core/platform/debug';
import { WebGLConstants } from '../gl-constants';
import { cclegacy } from '../../core/global-exports';
import { OS } from '../../../pal/system-info/enum-type';

const WebGLWraps: GLenum[] = [
    WebGLConstants.REPEAT,
    WebGLConstants.MIRRORED_REPEAT,
    WebGLConstants.CLAMP_TO_EDGE,
    WebGLConstants.CLAMP_TO_EDGE,
];

const _f32v4 = new Float32Array(4);
const max = Math.max;
const min = Math.min;

function CmpF32NotEuqal (a: number, b: number): boolean {
    const c = a - b;
    return (c > 0.000001 || c < -0.000001);
}

export function GFXFormatToWebGLType (format: Format, gl: WebGL2RenderingContext): GLenum {
    switch (format) {
    case Format.R8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.R8SN: return WebGLConstants.BYTE;
    case Format.R8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.R8I: return WebGLConstants.BYTE;
    case Format.R16F: return WebGLConstants.HALF_FLOAT;
    case Format.R16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.R16I: return WebGLConstants.SHORT;
    case Format.R32F: return WebGLConstants.FLOAT;
    case Format.R32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.R32I: return WebGLConstants.INT;

    case Format.RG8: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RG8SN: return WebGLConstants.BYTE;
    case Format.RG8UI: return WebGLConstants.UNSIGNED_BYTE;
    case Format.RG8I: return WebGLConstants.BYTE;
    case Format.RG16F: return WebGLConstants.HALF_FLOAT;
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
    case Format.RGB16F: return WebGLConstants.HALF_FLOAT;
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
    case Format.RGBA16F: return WebGLConstants.HALF_FLOAT;
    case Format.RGBA16UI: return WebGLConstants.UNSIGNED_SHORT;
    case Format.RGBA16I: return WebGLConstants.SHORT;
    case Format.RGBA32F: return WebGLConstants.FLOAT;
    case Format.RGBA32UI: return WebGLConstants.UNSIGNED_INT;
    case Format.RGBA32I: return WebGLConstants.INT;

    case Format.R5G6B5: return WebGLConstants.UNSIGNED_SHORT_5_6_5;
    case Format.R11G11B10F: return WebGLConstants.UNSIGNED_INT_10F_11F_11F_REV;
    case Format.RGB5A1: return WebGLConstants.UNSIGNED_SHORT_5_5_5_1;
    case Format.RGBA4: return WebGLConstants.UNSIGNED_SHORT_4_4_4_4;
    case Format.RGB10A2: return WebGLConstants.UNSIGNED_INT_2_10_10_10_REV;
    case Format.RGB10A2UI: return WebGLConstants.UNSIGNED_INT_2_10_10_10_REV;
    case Format.RGB9E5: return WebGLConstants.FLOAT;

    case Format.DEPTH: return WebGLConstants.FLOAT;
    case Format.DEPTH_STENCIL: return WebGLConstants.UNSIGNED_INT_24_8;

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

export function GFXFormatToWebGLInternalFormat (format: Format, gl: WebGL2RenderingContext): GLenum {
    switch (format) {
    case Format.A8: return WebGLConstants.ALPHA;
    case Format.L8: return WebGLConstants.LUMINANCE;
    case Format.LA8: return WebGLConstants.LUMINANCE_ALPHA;
    case Format.R8: return WebGLConstants.R8;
    case Format.R8SN: return WebGLConstants.R8_SNORM;
    case Format.R8UI: return WebGLConstants.R8UI;
    case Format.R8I: return WebGLConstants.R8I;
    case Format.RG8: return WebGLConstants.RG8;
    case Format.RG8SN: return WebGLConstants.RG8_SNORM;
    case Format.RG8UI: return WebGLConstants.RG8UI;
    case Format.RG8I: return WebGLConstants.RG8I;
    case Format.RGB8: return WebGLConstants.RGB8;
    case Format.RGB8SN: return WebGLConstants.RGB8_SNORM;
    case Format.RGB8UI: return WebGLConstants.RGB8UI;
    case Format.RGB8I: return WebGLConstants.RGB8I;
    case Format.BGRA8: return WebGLConstants.RGBA8;
    case Format.RGBA8: return WebGLConstants.RGBA8;
    case Format.RGBA8SN: return WebGLConstants.RGBA8_SNORM;
    case Format.RGBA8UI: return WebGLConstants.RGBA8UI;
    case Format.RGBA8I: return WebGLConstants.RGBA8I;
    case Format.R16I: return WebGLConstants.R16I;
    case Format.R16UI: return WebGLConstants.R16UI;
    case Format.R16F: return WebGLConstants.R16F;
    case Format.RG16I: return WebGLConstants.RG16I;
    case Format.RG16UI: return WebGLConstants.RG16UI;
    case Format.RG16F: return WebGLConstants.RG16F;
    case Format.RGB16I: return WebGLConstants.RGB16I;
    case Format.RGB16UI: return WebGLConstants.RGB16UI;
    case Format.RGB16F: return WebGLConstants.RGB16F;
    case Format.RGBA16I: return WebGLConstants.RGBA16I;
    case Format.RGBA16UI: return WebGLConstants.RGBA16UI;
    case Format.RGBA16F: return WebGLConstants.RGBA16F;
    case Format.R32I: return WebGLConstants.R32I;
    case Format.R32UI: return WebGLConstants.R32UI;
    case Format.R32F: return WebGLConstants.R32F;
    case Format.RG32I: return WebGLConstants.RG32I;
    case Format.RG32UI: return WebGLConstants.RG32UI;
    case Format.RG32F: return WebGLConstants.RG32F;
    case Format.RGB32I: return WebGLConstants.RGB32I;
    case Format.RGB32UI: return WebGLConstants.RGB32UI;
    case Format.RGB32F: return WebGLConstants.RGB32F;
    case Format.RGBA32I: return WebGLConstants.RGBA32I;
    case Format.RGBA32UI: return WebGLConstants.RGBA32UI;
    case Format.RGBA32F: return WebGLConstants.RGBA32F;
    case Format.R5G6B5: return WebGLConstants.RGB565;
    case Format.RGB5A1: return WebGLConstants.RGB5_A1;
    case Format.RGBA4: return WebGLConstants.RGBA4;
    case Format.SRGB8: return WebGLConstants.SRGB8;
    case Format.SRGB8_A8: return WebGLConstants.SRGB8_ALPHA8;
    case Format.RGB10A2: return WebGLConstants.RGB10_A2;
    case Format.RGB10A2UI: return WebGLConstants.RGB10_A2UI;
    case Format.R11G11B10F: return WebGLConstants.R11F_G11F_B10F;
    case Format.DEPTH: return WebGLConstants.DEPTH_COMPONENT32F;
    case Format.DEPTH_STENCIL: return WebGLConstants.DEPTH24_STENCIL8;

    case Format.BC1: return WebGL2EXT.COMPRESSED_RGB_S3TC_DXT1_EXT;
    case Format.BC1_ALPHA: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT1_EXT;
    case Format.BC1_SRGB: return WebGL2EXT.COMPRESSED_SRGB_S3TC_DXT1_EXT;
    case Format.BC1_SRGB_ALPHA: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
    case Format.BC2: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT3_EXT;
    case Format.BC2_SRGB: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
    case Format.BC3: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT5_EXT;
    case Format.BC3_SRGB: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;

    case Format.ETC_RGB8: return WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL;
    case Format.ETC2_RGB8: return WebGL2EXT.COMPRESSED_RGB8_ETC2;
    case Format.ETC2_SRGB8: return WebGL2EXT.COMPRESSED_SRGB8_ETC2;
    case Format.ETC2_RGB8_A1: return WebGL2EXT.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_SRGB8_A1: return WebGL2EXT.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_RGBA8: return WebGL2EXT.COMPRESSED_RGBA8_ETC2_EAC;
    case Format.ETC2_SRGB8_A8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
    case Format.EAC_R11: return WebGL2EXT.COMPRESSED_R11_EAC;
    case Format.EAC_R11SN: return WebGL2EXT.COMPRESSED_SIGNED_R11_EAC;
    case Format.EAC_RG11: return WebGL2EXT.COMPRESSED_RG11_EAC;
    case Format.EAC_RG11SN: return WebGL2EXT.COMPRESSED_SIGNED_RG11_EAC;

    case Format.PVRTC_RGB2: return WebGL2EXT.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGBA2: return WebGL2EXT.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGB4: return WebGL2EXT.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
    case Format.PVRTC_RGBA4: return WebGL2EXT.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;

    case Format.ASTC_RGBA_4X4: return WebGL2EXT.COMPRESSED_RGBA_ASTC_4x4_KHR;
    case Format.ASTC_RGBA_5X4: return WebGL2EXT.COMPRESSED_RGBA_ASTC_5x4_KHR;
    case Format.ASTC_RGBA_5X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_5x5_KHR;
    case Format.ASTC_RGBA_6X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_6x5_KHR;
    case Format.ASTC_RGBA_6X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_6x6_KHR;
    case Format.ASTC_RGBA_8X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x5_KHR;
    case Format.ASTC_RGBA_8X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x6_KHR;
    case Format.ASTC_RGBA_8X8: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x8_KHR;
    case Format.ASTC_RGBA_10X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x5_KHR;
    case Format.ASTC_RGBA_10X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x6_KHR;
    case Format.ASTC_RGBA_10X8: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x8_KHR;
    case Format.ASTC_RGBA_10X10: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x10_KHR;
    case Format.ASTC_RGBA_12X10: return WebGL2EXT.COMPRESSED_RGBA_ASTC_12x10_KHR;
    case Format.ASTC_RGBA_12X12: return WebGL2EXT.COMPRESSED_RGBA_ASTC_12x12_KHR;

    case Format.ASTC_SRGBA_4X4: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR;
    case Format.ASTC_SRGBA_5X4: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR;
    case Format.ASTC_SRGBA_5X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR;
    case Format.ASTC_SRGBA_6X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR;
    case Format.ASTC_SRGBA_6X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR;
    case Format.ASTC_SRGBA_8X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR;
    case Format.ASTC_SRGBA_8X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR;
    case Format.ASTC_SRGBA_8X8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR;
    case Format.ASTC_SRGBA_10X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR;
    case Format.ASTC_SRGBA_10X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR;
    case Format.ASTC_SRGBA_10X8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR;
    case Format.ASTC_SRGBA_10X10: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR;
    case Format.ASTC_SRGBA_12X10: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR;
    case Format.ASTC_SRGBA_12X12: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR;

    default: {
        errorID(16309);
        return WebGLConstants.RGBA;
    }
    }
}

export function GFXFormatToWebGLFormat (format: Format, gl: WebGL2RenderingContext): GLenum {
    switch (format) {
    case Format.A8: return WebGLConstants.ALPHA;
    case Format.L8: return WebGLConstants.LUMINANCE;
    case Format.LA8: return WebGLConstants.LUMINANCE_ALPHA;
    case Format.R8:
    case Format.R8SN: return WebGLConstants.RED;
    case Format.R8UI:
    case Format.R8I: return WebGLConstants.RED;
    case Format.RG8:
    case Format.RG8SN:
    case Format.RG8UI:
    case Format.RG8I: return WebGLConstants.RG;
    case Format.RGB8:
    case Format.RGB8SN:
    case Format.RGB8UI:
    case Format.RGB8I: return WebGLConstants.RGB;
    case Format.BGRA8:
    case Format.RGBA8:
    case Format.RGBA8SN:
    case Format.RGBA8UI:
    case Format.RGBA8I: return WebGLConstants.RGBA;
    case Format.R16UI:
    case Format.R16I:
    case Format.R16F: return WebGLConstants.RED;
    case Format.RG16UI:
    case Format.RG16I:
    case Format.RG16F: return WebGLConstants.RG;
    case Format.RGB16UI:
    case Format.RGB16I:
    case Format.RGB16F: return WebGLConstants.RGB;
    case Format.RGBA16UI:
    case Format.RGBA16I:
    case Format.RGBA16F: return WebGLConstants.RGBA;
    case Format.R32UI:
    case Format.R32I:
    case Format.R32F: return WebGLConstants.RED;
    case Format.RG32UI:
    case Format.RG32I:
    case Format.RG32F: return WebGLConstants.RG;
    case Format.RGB32UI:
    case Format.RGB32I:
    case Format.RGB32F: return WebGLConstants.RGB;
    case Format.RGBA32UI:
    case Format.RGBA32I:
    case Format.RGBA32F: return WebGLConstants.RGBA;
    case Format.RGB10A2: return WebGLConstants.RGBA;
    case Format.R11G11B10F: return WebGLConstants.RGB;
    case Format.R5G6B5: return WebGLConstants.RGB;
    case Format.RGB5A1: return WebGLConstants.RGBA;
    case Format.RGBA4: return WebGLConstants.RGBA;
    case Format.SRGB8: return WebGLConstants.RGB;
    case Format.SRGB8_A8: return WebGLConstants.RGBA;
    case Format.DEPTH: return WebGLConstants.DEPTH_COMPONENT;
    case Format.DEPTH_STENCIL: return WebGLConstants.DEPTH_STENCIL;

    case Format.BC1: return WebGL2EXT.COMPRESSED_RGB_S3TC_DXT1_EXT;
    case Format.BC1_ALPHA: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT1_EXT;
    case Format.BC1_SRGB: return WebGL2EXT.COMPRESSED_SRGB_S3TC_DXT1_EXT;
    case Format.BC1_SRGB_ALPHA: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
    case Format.BC2: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT3_EXT;
    case Format.BC2_SRGB: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
    case Format.BC3: return WebGL2EXT.COMPRESSED_RGBA_S3TC_DXT5_EXT;
    case Format.BC3_SRGB: return WebGL2EXT.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;

    case Format.ETC_RGB8: return WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL;
    case Format.ETC2_RGB8: return WebGL2EXT.COMPRESSED_RGB8_ETC2;
    case Format.ETC2_SRGB8: return WebGL2EXT.COMPRESSED_SRGB8_ETC2;
    case Format.ETC2_RGB8_A1: return WebGL2EXT.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_SRGB8_A1: return WebGL2EXT.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2;
    case Format.ETC2_RGBA8: return WebGL2EXT.COMPRESSED_RGBA8_ETC2_EAC;
    case Format.ETC2_SRGB8_A8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
    case Format.EAC_R11: return WebGL2EXT.COMPRESSED_R11_EAC;
    case Format.EAC_R11SN: return WebGL2EXT.COMPRESSED_SIGNED_R11_EAC;
    case Format.EAC_RG11: return WebGL2EXT.COMPRESSED_RG11_EAC;
    case Format.EAC_RG11SN: return WebGL2EXT.COMPRESSED_SIGNED_RG11_EAC;

    case Format.PVRTC_RGB2: return WebGL2EXT.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGBA2: return WebGL2EXT.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
    case Format.PVRTC_RGB4: return WebGL2EXT.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
    case Format.PVRTC_RGBA4: return WebGL2EXT.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;

    case Format.ASTC_RGBA_4X4: return WebGL2EXT.COMPRESSED_RGBA_ASTC_4x4_KHR;
    case Format.ASTC_RGBA_5X4: return WebGL2EXT.COMPRESSED_RGBA_ASTC_5x4_KHR;
    case Format.ASTC_RGBA_5X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_5x5_KHR;
    case Format.ASTC_RGBA_6X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_6x5_KHR;
    case Format.ASTC_RGBA_6X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_6x6_KHR;
    case Format.ASTC_RGBA_8X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x5_KHR;
    case Format.ASTC_RGBA_8X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x6_KHR;
    case Format.ASTC_RGBA_8X8: return WebGL2EXT.COMPRESSED_RGBA_ASTC_8x8_KHR;
    case Format.ASTC_RGBA_10X5: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x5_KHR;
    case Format.ASTC_RGBA_10X6: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x6_KHR;
    case Format.ASTC_RGBA_10X8: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x8_KHR;
    case Format.ASTC_RGBA_10X10: return WebGL2EXT.COMPRESSED_RGBA_ASTC_10x10_KHR;
    case Format.ASTC_RGBA_12X10: return WebGL2EXT.COMPRESSED_RGBA_ASTC_12x10_KHR;
    case Format.ASTC_RGBA_12X12: return WebGL2EXT.COMPRESSED_RGBA_ASTC_12x12_KHR;

    case Format.ASTC_SRGBA_4X4: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR;
    case Format.ASTC_SRGBA_5X4: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR;
    case Format.ASTC_SRGBA_5X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR;
    case Format.ASTC_SRGBA_6X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR;
    case Format.ASTC_SRGBA_6X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR;
    case Format.ASTC_SRGBA_8X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR;
    case Format.ASTC_SRGBA_8X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR;
    case Format.ASTC_SRGBA_8X8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR;
    case Format.ASTC_SRGBA_10X5: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR;
    case Format.ASTC_SRGBA_10X6: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR;
    case Format.ASTC_SRGBA_10X8: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR;
    case Format.ASTC_SRGBA_10X10: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR;
    case Format.ASTC_SRGBA_12X10: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR;
    case Format.ASTC_SRGBA_12X12: return WebGL2EXT.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR;

    default: {
        errorID(16310);
        return WebGLConstants.RGBA;
    }
    }
}

function GFXTypeToWebGLType (type: Type, gl: WebGL2RenderingContext): GLenum {
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
    case Type.MAT2X3: return WebGLConstants.FLOAT_MAT2x3;
    case Type.MAT2X4: return WebGLConstants.FLOAT_MAT2x4;
    case Type.MAT3X2: return WebGLConstants.FLOAT_MAT3x2;
    case Type.MAT3: return WebGLConstants.FLOAT_MAT3;
    case Type.MAT3X4: return WebGLConstants.FLOAT_MAT3x4;
    case Type.MAT4X2: return WebGLConstants.FLOAT_MAT4x2;
    case Type.MAT4X3: return WebGLConstants.FLOAT_MAT4x3;
    case Type.MAT4: return WebGLConstants.FLOAT_MAT4;
    case Type.SAMPLER2D: return WebGLConstants.SAMPLER_2D;
    case Type.SAMPLER2D_ARRAY: return WebGLConstants.SAMPLER_2D_ARRAY;
    case Type.SAMPLER3D: return WebGLConstants.SAMPLER_3D;
    case Type.SAMPLER_CUBE: return WebGLConstants.SAMPLER_CUBE;
    default: {
        errorID(16311);
        return Type.UNKNOWN;
    }
    }
}

function WebGLTypeToGFXType (glType: GLenum, gl: WebGL2RenderingContext): Type {
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
    case WebGLConstants.UNSIGNED_INT_VEC2: return Type.UINT2;
    case WebGLConstants.UNSIGNED_INT_VEC3: return Type.UINT3;
    case WebGLConstants.UNSIGNED_INT_VEC4: return Type.UINT4;
    case WebGLConstants.FLOAT: return Type.FLOAT;
    case WebGLConstants.FLOAT_VEC2: return Type.FLOAT2;
    case WebGLConstants.FLOAT_VEC3: return Type.FLOAT3;
    case WebGLConstants.FLOAT_VEC4: return Type.FLOAT4;
    case WebGLConstants.FLOAT_MAT2: return Type.MAT2;
    case WebGLConstants.FLOAT_MAT2x3: return Type.MAT2X3;
    case WebGLConstants.FLOAT_MAT2x4: return Type.MAT2X4;
    case WebGLConstants.FLOAT_MAT3x2: return Type.MAT3X2;
    case WebGLConstants.FLOAT_MAT3: return Type.MAT3;
    case WebGLConstants.FLOAT_MAT3x4: return Type.MAT3X4;
    case WebGLConstants.FLOAT_MAT4x2: return Type.MAT4X2;
    case WebGLConstants.FLOAT_MAT4x3: return Type.MAT4X3;
    case WebGLConstants.FLOAT_MAT4: return Type.MAT4;
    case WebGLConstants.SAMPLER_2D: return Type.SAMPLER2D;
    case WebGLConstants.SAMPLER_2D_ARRAY: return Type.SAMPLER2D_ARRAY;
    case WebGLConstants.SAMPLER_3D: return Type.SAMPLER3D;
    case WebGLConstants.SAMPLER_CUBE: return Type.SAMPLER_CUBE;
    default: {
        errorID(16313);
        return Type.UNKNOWN;
    }
    }
}

function WebGLGetTypeSize (glType: GLenum, gl: WebGL2RenderingContext): number {
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
    case WebGLConstants.UNSIGNED_INT_VEC2: return 8;
    case WebGLConstants.UNSIGNED_INT_VEC3: return 12;
    case WebGLConstants.UNSIGNED_INT_VEC4: return 16;
    case WebGLConstants.FLOAT: return 4;
    case WebGLConstants.FLOAT_VEC2: return 8;
    case WebGLConstants.FLOAT_VEC3: return 12;
    case WebGLConstants.FLOAT_VEC4: return 16;
    case WebGLConstants.FLOAT_MAT2: return 16;
    case WebGLConstants.FLOAT_MAT2x3: return 24;
    case WebGLConstants.FLOAT_MAT2x4: return 32;
    case WebGLConstants.FLOAT_MAT3x2: return 24;
    case WebGLConstants.FLOAT_MAT3: return 36;
    case WebGLConstants.FLOAT_MAT3x4: return 48;
    case WebGLConstants.FLOAT_MAT4x2: return 32;
    case WebGLConstants.FLOAT_MAT4x3: return 48;
    case WebGLConstants.FLOAT_MAT4: return 64;
    case WebGLConstants.SAMPLER_2D: return 4;
    case WebGLConstants.SAMPLER_2D_ARRAY: return 4;
    case WebGLConstants.SAMPLER_2D_ARRAY_SHADOW: return 4;
    case WebGLConstants.SAMPLER_3D: return 4;
    case WebGLConstants.SAMPLER_CUBE: return 4;
    case WebGLConstants.INT_SAMPLER_2D: return 4;
    case WebGLConstants.INT_SAMPLER_2D_ARRAY: return 4;
    case WebGLConstants.INT_SAMPLER_3D: return 4;
    case WebGLConstants.INT_SAMPLER_CUBE: return 4;
    case WebGLConstants.UNSIGNED_INT_SAMPLER_2D: return 4;
    case WebGLConstants.UNSIGNED_INT_SAMPLER_2D_ARRAY: return 4;
    case WebGLConstants.UNSIGNED_INT_SAMPLER_3D: return 4;
    case WebGLConstants.UNSIGNED_INT_SAMPLER_CUBE: return 4;
    default: {
        errorID(16314);
        return 0;
    }
    }
}

function WebGLGetComponentCount (glType: GLenum, gl: WebGL2RenderingContext): Type {
    switch (glType) {
    case WebGLConstants.FLOAT_MAT2: return 2;
    case WebGLConstants.FLOAT_MAT2x3: return 2;
    case WebGLConstants.FLOAT_MAT2x4: return 2;
    case WebGLConstants.FLOAT_MAT3x2: return 3;
    case WebGLConstants.FLOAT_MAT3: return 3;
    case WebGLConstants.FLOAT_MAT3x4: return 3;
    case WebGLConstants.FLOAT_MAT4x2: return 4;
    case WebGLConstants.FLOAT_MAT4x3: return 4;
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
    WebGLConstants.ZERO,
    WebGLConstants.KEEP,
    WebGLConstants.REPLACE,
    WebGLConstants.INCR,
    WebGLConstants.DECR,
    WebGLConstants.INVERT,
    WebGLConstants.INCR_WRAP,
    WebGLConstants.DECR_WRAP,
];

const WebGLBlendOps: GLenum[] = [
    WebGLConstants.FUNC_ADD,
    WebGLConstants.FUNC_SUBTRACT,
    WebGLConstants.FUNC_REVERSE_SUBTRACT,
    WebGLConstants.MIN,
    WebGLConstants.MAX,
];

const WebGLBlendFactors: GLenum[] = [
    WebGLConstants.ZERO,
    WebGLConstants.ONE,
    WebGLConstants.SRC_ALPHA,
    WebGLConstants.DST_ALPHA,
    WebGLConstants.ONE_MINUS_SRC_ALPHA,
    WebGLConstants.ONE_MINUS_DST_ALPHA,
    WebGLConstants.SRC_COLOR,
    WebGLConstants.DST_COLOR,
    WebGLConstants.ONE_MINUS_SRC_COLOR,
    WebGLConstants.ONE_MINUS_DST_COLOR,
    WebGLConstants.SRC_ALPHA_SATURATE,
    WebGLConstants.CONSTANT_COLOR,
    WebGLConstants.ONE_MINUS_CONSTANT_COLOR,
    WebGLConstants.CONSTANT_ALPHA,
    WebGLConstants.ONE_MINUS_CONSTANT_ALPHA,
];

export function WebGL2CmdFuncCreateBuffer (device: WebGL2Device, gpuBuffer: IWebGL2GPUBuffer): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const glUsage: GLenum = gpuBuffer.memUsage & MemoryUsageBit.HOST ? WebGLConstants.DYNAMIC_DRAW : WebGLConstants.STATIC_DRAW;

    if (gpuBuffer.usage & BufferUsageBit.VERTEX) {
        gpuBuffer.glTarget = WebGLConstants.ARRAY_BUFFER;
        const glBuffer = gl.createBuffer();

        if (glBuffer) {
            gpuBuffer.glBuffer = glBuffer;
            if (gpuBuffer.size > 0) {
                if (device.extensions.useVAO) {
                    if (cache.glVAO) {
                        gl.bindVertexArray(null);
                        cache.glVAO = null;
                    }
                }
                gfxStateCache.gpuInputAssembler = null;

                if (cache.glArrayBuffer !== gpuBuffer.glBuffer) {
                    gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
                    cache.glArrayBuffer = gpuBuffer.glBuffer;
                }

                gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.size, glUsage);

                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                cache.glArrayBuffer = null;
            }
        }
    } else if (gpuBuffer.usage & BufferUsageBit.INDEX) {
        gpuBuffer.glTarget = WebGLConstants.ELEMENT_ARRAY_BUFFER;
        const glBuffer = gl.createBuffer();
        if (glBuffer) {
            gpuBuffer.glBuffer = glBuffer;
            if (gpuBuffer.size > 0) {
                if (device.extensions.useVAO) {
                    if (cache.glVAO) {
                        gl.bindVertexArray(null);
                        cache.glVAO = null;
                    }
                }
                gfxStateCache.gpuInputAssembler = null;

                if (cache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
                    gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                    cache.glElementArrayBuffer = gpuBuffer.glBuffer;
                }

                gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.size, glUsage);

                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                cache.glElementArrayBuffer = null;
            }
        }
    } else if (gpuBuffer.usage & BufferUsageBit.UNIFORM) {
        gpuBuffer.glTarget = WebGLConstants.UNIFORM_BUFFER;
        const glBuffer = gl.createBuffer();
        if (glBuffer && gpuBuffer.size > 0) {
            gpuBuffer.glBuffer = glBuffer;
            if (cache.glUniformBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, gpuBuffer.glBuffer);
                cache.glUniformBuffer = gpuBuffer.glBuffer;
            }

            gl.bufferData(WebGLConstants.UNIFORM_BUFFER, gpuBuffer.size, glUsage);

            gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, null);
            cache.glUniformBuffer = null;
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

export function WebGL2CmdFuncDestroyBuffer (device: WebGL2Device, gpuBuffer: IWebGL2GPUBuffer): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const useVAO = device.extensions.useVAO;

    if (gpuBuffer.glBuffer) {
        // Firefox 75+ implicitly unbind whatever buffer there was on the slot sometimes
        // can be reproduced in the static batching scene at https://github.com/cocos-creator/test-cases-3d
        switch (gpuBuffer.glTarget) {
        case WebGLConstants.ARRAY_BUFFER:
            if (useVAO) {
                if (cache.glVAO) {
                    gl.bindVertexArray(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
            cache.glArrayBuffer = null;
            break;
        case WebGLConstants.ELEMENT_ARRAY_BUFFER:
            if (useVAO) {
                if (cache.glVAO) {
                    gl.bindVertexArray(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
            cache.glElementArrayBuffer = null;
            break;
        case WebGLConstants.UNIFORM_BUFFER:
            gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, null);
            cache.glUniformBuffer = null;
            break;
        default:
        }

        gl.deleteBuffer(gpuBuffer.glBuffer);
        gpuBuffer.glBuffer = null;
    }
}

export function WebGL2CmdFuncResizeBuffer (device: WebGL2Device, gpuBuffer: IWebGL2GPUBuffer): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const glUsage: GLenum = gpuBuffer.memUsage & MemoryUsageBit.HOST ? WebGLConstants.DYNAMIC_DRAW : WebGLConstants.STATIC_DRAW;

    if (gpuBuffer.usage & BufferUsageBit.VERTEX) {
        if (device.extensions.useVAO) {
            if (cache.glVAO) {
                gl.bindVertexArray(null);
                cache.glVAO = null;
            }
        }
        gfxStateCache.gpuInputAssembler = null;

        if (cache.glArrayBuffer !== gpuBuffer.glBuffer) {
            gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
        }

        if (gpuBuffer.buffer) {
            gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.buffer, glUsage);
        } else {
            gl.bufferData(WebGLConstants.ARRAY_BUFFER, gpuBuffer.size, glUsage);
        }
        gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
        cache.glArrayBuffer = null;
    } else if (gpuBuffer.usage & BufferUsageBit.INDEX) {
        if (device.extensions.useVAO) {
            if (cache.glVAO) {
                gl.bindVertexArray(null);
                cache.glVAO = null;
            }
        }
        gfxStateCache.gpuInputAssembler = null;

        if (cache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
            gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
        }

        if (gpuBuffer.buffer) {
            gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.buffer, glUsage);
        } else {
            gl.bufferData(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.size, glUsage);
        }
        gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
        cache.glElementArrayBuffer = null;
    } else if (gpuBuffer.usage & BufferUsageBit.UNIFORM) {
        if (cache.glUniformBuffer !== gpuBuffer.glBuffer) {
            gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, gpuBuffer.glBuffer);
        }

        gl.bufferData(WebGLConstants.UNIFORM_BUFFER, gpuBuffer.size, glUsage);
        gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, null);
        cache.glUniformBuffer = null;
    } else if ((gpuBuffer.usage & BufferUsageBit.INDIRECT)
            || (gpuBuffer.usage & BufferUsageBit.TRANSFER_DST)
            || (gpuBuffer.usage & BufferUsageBit.TRANSFER_SRC)) {
        gpuBuffer.glTarget = WebGLConstants.NONE;
    } else {
        errorID(16315);
        gpuBuffer.glTarget = WebGLConstants.NONE;
    }
}

export function WebGL2CmdFuncUpdateBuffer (
    device: WebGL2Device,
    gpuBuffer: IWebGL2GPUBuffer,
    buffer: Readonly<BufferSource>,
    offset: number,
    size: number,
): void {
    if (gpuBuffer.usage & BufferUsageBit.INDIRECT) {
        gpuBuffer.indirects.clearDraws();
        const drawInfos = (buffer as IndirectBuffer).drawInfos;
        for (let i = 0; i < drawInfos.length; ++i) {
            gpuBuffer.indirects.setDrawInfo(offset + i, drawInfos[i]);
        }
    } else {
        const buff = buffer as ArrayBuffer;
        const { gl } = device;
        const cache = device.getStateCache();

        switch (gpuBuffer.glTarget) {
        case WebGLConstants.ARRAY_BUFFER: {
            if (device.extensions.useVAO) {
                if (cache.glVAO) {
                    gl.bindVertexArray(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            if (cache.glArrayBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, gpuBuffer.glBuffer);
                cache.glArrayBuffer = gpuBuffer.glBuffer;
            }

            if (systemInfo.os === OS.IOS && (gpuBuffer.memUsage & MemoryUsageBit.HOST) && offset === 0 && size === buff.byteLength) {
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
            break;
        }
        case WebGLConstants.ELEMENT_ARRAY_BUFFER: {
            if (device.extensions.useVAO) {
                if (cache.glVAO) {
                    gl.bindVertexArray(null);
                    cache.glVAO = null;
                }
            }
            gfxStateCache.gpuInputAssembler = null;

            if (cache.glElementArrayBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                cache.glElementArrayBuffer = gpuBuffer.glBuffer;
            }

            if (systemInfo.os === OS.IOS && (gpuBuffer.memUsage & MemoryUsageBit.HOST) && offset === 0 && size === buff.byteLength) {
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
            break;
        }
        case WebGLConstants.UNIFORM_BUFFER: {
            if (cache.glUniformBuffer !== gpuBuffer.glBuffer) {
                gl.bindBuffer(WebGLConstants.UNIFORM_BUFFER, gpuBuffer.glBuffer);
                cache.glUniformBuffer = gpuBuffer.glBuffer;
            }

            if (systemInfo.os === OS.IOS && (gpuBuffer.memUsage & MemoryUsageBit.HOST) && offset === 0 && size === buff.byteLength) {
                // Fix performance issue on iOS.
                // TODO(zhouzhenglong): glBufferSubData is faster than glBufferData in most cases.
                // We should use multiple buffers to avoid stall (cpu write conflicts with gpu read).
                // Before that, we will use glBufferData instead of glBufferSubData.
                gl.bufferData(gpuBuffer.glTarget, buff, gl.DYNAMIC_DRAW);
            } else if (size === buff.byteLength) {
                gl.bufferSubData(gpuBuffer.glTarget, offset, buff);
            } else {
                gl.bufferSubData(gpuBuffer.glTarget, offset, new Float32Array(buff, 0, size / 4));
            }
            break;
        }
        default: {
            errorID(16316);
        }
        }
    }
}

export function WebGL2CmdFuncCreateTexture (device: WebGL2Device, gpuTexture: IWebGL2GPUTexture): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const capabilities = device.capabilities;

    gpuTexture.glInternalFmt = GFXFormatToWebGLInternalFormat(gpuTexture.format, gl);
    gpuTexture.glFormat = GFXFormatToWebGLFormat(gpuTexture.format, gl);
    gpuTexture.glType = GFXFormatToWebGLType(gpuTexture.format, gl);

    let w = gpuTexture.width;
    let h = gpuTexture.height;
    const d = gpuTexture.depth;
    const l = gpuTexture.arrayLayer;

    switch (gpuTexture.type) {
    case TextureType.TEX2D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }

        if (gpuTexture.samples === SampleCount.X1) {
            gpuTexture.glTexture = gl.createTexture();
            if (gpuTexture.size > 0) {
                const glTexUnit = cache.glTexUnits[cache.texUnit];

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
                } else if (gpuTexture.flags & TextureFlagBit.MUTABLE_STORAGE) {
                    gl.texImage2D(WebGLConstants.TEXTURE_2D, 0, gpuTexture.glInternalFmt, w, h, 0, gpuTexture.glFormat, gpuTexture.glType, null);
                } else {
                    gl.texStorage2D(WebGLConstants.TEXTURE_2D, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h);
                }
            }
        } else {
            gpuTexture.glRenderbuffer = gl.createRenderbuffer();
            if (gpuTexture.size > 0) {
                if (cache.glRenderbuffer !== gpuTexture.glRenderbuffer) {
                    gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, gpuTexture.glRenderbuffer);
                    cache.glRenderbuffer = gpuTexture.glRenderbuffer;
                }

                gl.renderbufferStorageMultisample(
                    WebGLConstants.RENDERBUFFER,
                    gpuTexture.samples,
                    gpuTexture.glInternalFmt,
                    gpuTexture.width,
                    gpuTexture.height,
                );
            }
        }
        break;
    }
    case TextureType.TEX2D_ARRAY: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D_ARRAY;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }
        if (l > capabilities.maxArrayTextureLayers) {
            errorID(9100, l, capabilities.maxArrayTextureLayers);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_2D_ARRAY, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, l);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage3D(WebGLConstants.TEXTURE_2D_ARRAY, i, gpuTexture.glInternalFmt, w, h, l, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                gl.texStorage3D(WebGLConstants.TEXTURE_2D_ARRAY, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h, l);
            }
        }
        break;
    }
    case TextureType.TEX3D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_3D;

        const maxSize = max(max(w, h), d);
        if (maxSize > capabilities.max3DTextureSize) {
            errorID(9100, maxSize, capabilities.max3DTextureSize);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_3D, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, d);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage3D(WebGLConstants.TEXTURE_3D, i, gpuTexture.glInternalFmt, w, h, d, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                gl.texStorage3D(WebGLConstants.TEXTURE_3D, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h, d);
            }
        }
        break;
    }
    case TextureType.CUBE: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_CUBE_MAP;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxCubeMapTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_CUBE_MAP, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, 1);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    for (let f = 0; f < 6; ++f) {
                        gl.compressedTexImage2D(WebGLConstants.TEXTURE_CUBE_MAP_POSITIVE_X + f, i, gpuTexture.glInternalFmt, w, h, 0, view);
                    }
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                gl.texStorage2D(WebGLConstants.TEXTURE_CUBE_MAP, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h);
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

export function WebGL2CmdFuncDestroyTexture (device: WebGL2Device, gpuTexture: IWebGL2GPUTexture): void {
    const { gl } = device;
    const cache = device.getStateCache();
    if (gpuTexture.glTexture) {
        const glTexUnits = cache.glTexUnits;
        let texUnit = cache.texUnit;
        gl.deleteTexture(gpuTexture.glTexture);
        for (let i = 0; i < glTexUnits.length; ++i) {
            if (glTexUnits[i].glTexture === gpuTexture.glTexture) {
                gl.activeTexture(WebGLConstants.TEXTURE0 + i);
                texUnit = i;
                gl.bindTexture(gpuTexture.glTarget, null);
                glTexUnits[i].glTexture = null;
            }
        }
        cache.texUnit = texUnit;
        gpuTexture.glTexture = null;
    }

    if (gpuTexture.glRenderbuffer) {
        const glRenderbuffer = cache.glRenderbuffer;
        gl.deleteRenderbuffer(gpuTexture.glRenderbuffer);
        if (glRenderbuffer === gpuTexture.glRenderbuffer) {
            gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, null);
            cache.glRenderbuffer = null;
        }
        gpuTexture.glRenderbuffer = null;
    }
}

export function WebGL2CmdFuncResizeTexture (device: WebGL2Device, gpuTexture: IWebGL2GPUTexture): void {
    if (!gpuTexture.size) return;

    const { gl } = device;
    const cache = device.getStateCache();
    const capabilities = device.capabilities;

    let w = gpuTexture.width;
    let h = gpuTexture.height;
    const d = gpuTexture.depth;
    const l = gpuTexture.arrayLayer;

    switch (gpuTexture.type) {
    case TextureType.TEX2D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }

        if (gpuTexture.samples === SampleCount.X1) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

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
                // immutable by default
                WebGL2CmdFuncDestroyTexture(device, gpuTexture);
                WebGL2CmdFuncCreateTexture(device, gpuTexture);
            }
        } else if (gpuTexture.glRenderbuffer) {
            if (cache.glRenderbuffer !== gpuTexture.glRenderbuffer) {
                gl.bindRenderbuffer(WebGLConstants.RENDERBUFFER, gpuTexture.glRenderbuffer);
                cache.glRenderbuffer = gpuTexture.glRenderbuffer;
            }

            gl.renderbufferStorageMultisample(
                WebGLConstants.RENDERBUFFER,
                gpuTexture.samples,
                gpuTexture.glInternalFmt,
                gpuTexture.width,
                gpuTexture.height,
            );
        }
        break;
    }
    case TextureType.TEX2D_ARRAY: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_2D_ARRAY;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }
        if (l > capabilities.maxArrayTextureLayers) {
            errorID(9100, l, capabilities.maxArrayTextureLayers);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_2D_ARRAY, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, l);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage3D(WebGLConstants.TEXTURE_2D_ARRAY, i, gpuTexture.glInternalFmt, w, h, l, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                gl.texStorage3D(WebGLConstants.TEXTURE_2D_ARRAY, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h, l);
            }
        }
        break;
    }
    case TextureType.TEX3D: {
        gpuTexture.glTarget = WebGLConstants.TEXTURE_3D;

        const maxSize = max(max(w, h), d);
        if (maxSize > capabilities.max3DTextureSize) {
            errorID(9100, maxSize, capabilities.max3DTextureSize);
        }

        gpuTexture.glTexture = gl.createTexture();
        if (gpuTexture.size > 0) {
            const glTexUnit = cache.glTexUnits[cache.texUnit];

            if (glTexUnit.glTexture !== gpuTexture.glTexture) {
                gl.bindTexture(WebGLConstants.TEXTURE_3D, gpuTexture.glTexture);
                glTexUnit.glTexture = gpuTexture.glTexture;
            }

            if (FormatInfos[gpuTexture.format].isCompressed) {
                for (let i = 0; i < gpuTexture.mipLevel; ++i) {
                    const imgSize = FormatSize(gpuTexture.format, w, h, d);
                    const view: Uint8Array = new Uint8Array(imgSize);
                    gl.compressedTexImage3D(WebGLConstants.TEXTURE_3D, i, gpuTexture.glInternalFmt, w, h, d, 0, view);
                    w = max(1, w >> 1);
                    h = max(1, h >> 1);
                }
            } else {
                gl.texStorage3D(WebGLConstants.TEXTURE_3D, gpuTexture.mipLevel, gpuTexture.glInternalFmt, w, h, d);
            }
        }
        break;
    }
    case TextureType.CUBE: {
        gpuTexture.type = TextureType.CUBE;
        gpuTexture.glTarget = WebGLConstants.TEXTURE_CUBE_MAP;

        const maxSize = max(w, h);
        if (maxSize > capabilities.maxCubeMapTextureSize) {
            errorID(9100, maxSize, capabilities.maxTextureSize);
        }

        const glTexUnit = cache.glTexUnits[cache.texUnit];

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
            // immutable by default
            WebGL2CmdFuncDestroyTexture(device, gpuTexture);
            WebGL2CmdFuncCreateTexture(device, gpuTexture);
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

export function WebGL2CmdFuncPrepareSamplerInfo (device: WebGL2Device, gpuSampler: IWebGL2GPUSampler): void {
    const { gl } = device;

    if (gpuSampler.minFilter === Filter.LINEAR || gpuSampler.minFilter === Filter.ANISOTROPIC) {
        if (gpuSampler.mipFilter === Filter.LINEAR || gpuSampler.mipFilter === Filter.ANISOTROPIC) {
            gpuSampler.glMinFilter = WebGLConstants.LINEAR_MIPMAP_LINEAR;
        } else if (gpuSampler.mipFilter === Filter.POINT) {
            gpuSampler.glMinFilter = WebGLConstants.LINEAR_MIPMAP_NEAREST;
        } else {
            gpuSampler.glMinFilter = WebGLConstants.LINEAR;
        }
    } else if (gpuSampler.mipFilter === Filter.LINEAR || gpuSampler.mipFilter === Filter.ANISOTROPIC) {
        gpuSampler.glMinFilter = WebGLConstants.NEAREST_MIPMAP_LINEAR;
    } else if (gpuSampler.mipFilter === Filter.POINT) {
        gpuSampler.glMinFilter = WebGLConstants.NEAREST_MIPMAP_NEAREST;
    } else {
        gpuSampler.glMinFilter = WebGLConstants.NEAREST;
    }

    if (gpuSampler.magFilter === Filter.LINEAR || gpuSampler.magFilter === Filter.ANISOTROPIC) {
        gpuSampler.glMagFilter = WebGLConstants.LINEAR;
    } else {
        gpuSampler.glMagFilter = WebGLConstants.NEAREST;
    }

    gpuSampler.glWrapS = WebGLWraps[gpuSampler.addressU];
    gpuSampler.glWrapT = WebGLWraps[gpuSampler.addressV];
    gpuSampler.glWrapR = WebGLWraps[gpuSampler.addressW];
}

export function WebGL2CmdFuncDestroySampler (device: WebGL2Device, gpuSampler: IWebGL2GPUSampler): void {
    const { gl } = device;
    const it = gpuSampler.glSamplers.values();
    const res = it.next();

    while (!res.done) {
        gl.deleteSampler(res.value);

        const glSamplerUnits = device.getStateCache().glSamplerUnits;
        for (let i = 0; i < glSamplerUnits.length; ++i) {
            if (glSamplerUnits[i] === res.value) {
                gl.bindSampler(i, null);
                glSamplerUnits[i] = null;
            }
        }
    }

    gpuSampler.glSamplers.clear();
}

export function WebGL2CmdFuncCreateFramebuffer (device: WebGL2Device, gpuFramebuffer: IWebGL2GPUFramebuffer): void {
    const cache = device.getStateCache();
    for (let i = 0; i < gpuFramebuffer.gpuColorViews.length; ++i) {
        const tex = gpuFramebuffer.gpuColorViews[i].gpuTexture;
        if (tex.isSwapchainTexture) {
            gpuFramebuffer.isOffscreen = false;
            return;
        }
    }

    const { gl } = device;
    const attachments: GLenum[] = [];

    const glFramebuffer = gl.createFramebuffer();
    if (glFramebuffer) {
        gpuFramebuffer.glFramebuffer = glFramebuffer;

        if (cache.glFramebuffer !== gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, gpuFramebuffer.glFramebuffer);
        }

        for (let i = 0; i < gpuFramebuffer.gpuColorViews.length; ++i) {
            const colorTextureView = gpuFramebuffer.gpuColorViews[i];
            const colorTexture = colorTextureView.gpuTexture;
            if (colorTexture) {
                if (colorTexture.glTexture) {
                    gl.framebufferTexture2D(
                        WebGLConstants.FRAMEBUFFER,
                        WebGLConstants.COLOR_ATTACHMENT0 + i,
                        colorTexture.glTarget,
                        colorTexture.glTexture,
                        colorTextureView.baseLevel,
                    );
                } else {
                    gl.framebufferRenderbuffer(
                        WebGLConstants.FRAMEBUFFER,
                        WebGLConstants.COLOR_ATTACHMENT0 + i,
                        WebGLConstants.RENDERBUFFER,
                        colorTexture.glRenderbuffer,
                    );
                }

                attachments.push(WebGLConstants.COLOR_ATTACHMENT0 + i);
                gpuFramebuffer.width = min(gpuFramebuffer.width, colorTexture.width >> colorTextureView.baseLevel);
                gpuFramebuffer.height = min(gpuFramebuffer.height, colorTexture.height >> colorTextureView.baseLevel);
            }
        }

        const dstView = gpuFramebuffer.gpuDepthStencilView;
        if (dstView) {
            const dst = dstView.gpuTexture;
            const glAttachment = FormatInfos[dst.format].hasStencil ? WebGLConstants.DEPTH_STENCIL_ATTACHMENT : WebGLConstants.DEPTH_ATTACHMENT;
            if (dst.glTexture) {
                gl.framebufferTexture2D(
                    WebGLConstants.FRAMEBUFFER,
                    glAttachment,
                    dst.glTarget,
                    dst.glTexture,
                    gpuFramebuffer.gpuDepthStencilView!.baseLevel,
                );
            } else {
                gl.framebufferRenderbuffer(
                    WebGLConstants.FRAMEBUFFER,
                    glAttachment,
                    WebGLConstants.RENDERBUFFER,
                    dst.glRenderbuffer,
                );
            }
            gpuFramebuffer.width = min(gpuFramebuffer.width, dst.width >> dstView.baseLevel);
            gpuFramebuffer.height = min(gpuFramebuffer.height, dst.height >> dstView.baseLevel);
        }

        gl.drawBuffers(attachments);

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

        if (cache.glFramebuffer !== gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, cache.glFramebuffer);
        }
    }
}

export function WebGL2CmdFuncDestroyFramebuffer (device: WebGL2Device, gpuFramebuffer: IWebGL2GPUFramebuffer): void {
    const { gl } = device;
    const cache = device.getStateCache();
    if (gpuFramebuffer.glFramebuffer) {
        gl.deleteFramebuffer(gpuFramebuffer.glFramebuffer);
        if (cache.glFramebuffer === gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, null);
            cache.glFramebuffer = null;
        }
        gpuFramebuffer.glFramebuffer = null;
    }
}

export function WebGL2CmdFuncCreateShader (device: WebGL2Device, gpuShader: IWebGL2GPUShader): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const capabilities = device.capabilities;

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
            gl.shaderSource(gpuStage.glShader, `#version 300 es\n${gpuStage.source}`);
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

    const enableEffectImport = !!(cclegacy.rendering && cclegacy.rendering.enableEffectImport);

    // link program
    for (let k = 0; k < gpuShader.gpuStages.length; k++) {
        const gpuStage = gpuShader.gpuStages[k];
        gl.attachShader(gpuShader.glProgram, gpuStage.glShader!);
    }

    gl.linkProgram(gpuShader.glProgram);

    // detach & delete immediately
    for (let k = 0; k < gpuShader.gpuStages.length; k++) {
        const gpuStage = gpuShader.gpuStages[k];
        if (gpuStage.glShader) {
            gl.detachShader(gpuShader.glProgram, gpuStage.glShader);
            gl.deleteShader(gpuStage.glShader);
            gpuStage.glShader = null;
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
    gpuShader.glInputs = new Array<IWebGL2GPUInput>(activeAttribCount);

    for (let i = 0; i < activeAttribCount; ++i) {
        const attribInfo = gl.getActiveAttrib(gpuShader.glProgram, i);
        if (attribInfo) {
            let varName: string;
            const nameOffset = attribInfo.name.indexOf('[');
            if (nameOffset !== -1) {
                varName = attribInfo.name.substring(0, nameOffset);
            } else {
                varName = attribInfo.name;
            }

            const glLoc = gl.getAttribLocation(gpuShader.glProgram, varName);
            const type = WebGLTypeToGFXType(attribInfo.type, gl);
            const stride = WebGLGetTypeSize(attribInfo.type, gl);

            gpuShader.glInputs[i] = {
                name: varName,
                type,
                stride,
                count: attribInfo.size,
                size: stride * attribInfo.size,

                glType: attribInfo.type,
                glLoc,
            };
        }
    }

    // create uniform blocks
    const activeBlockCount: number = gl.getProgramParameter(gpuShader.glProgram, WebGLConstants.ACTIVE_UNIFORM_BLOCKS);
    let blockName: string;
    let blockIdx: number;
    let blockSize: number;
    let block: UniformBlock | null;

    if (activeBlockCount) {
        gpuShader.glBlocks = new Array<IWebGL2GPUUniformBlock>(activeBlockCount);

        for (let b = 0; b < activeBlockCount; ++b) {
            blockName = gl.getActiveUniformBlockName(gpuShader.glProgram, b)!;
            const nameOffset = blockName.indexOf('[');
            if (nameOffset !== -1) {
                blockName = blockName.substring(0, nameOffset);
            }

            // blockIdx = gl.getUniformBlockIndex(gpuShader.glProgram, blockName);
            block = null;
            for (let k = 0; k < gpuShader.blocks.length; k++) {
                if (gpuShader.blocks[k].name === blockName) {
                    block = gpuShader.blocks[k];
                    break;
                }
            }

            if (!block) {
                errorID(16404, blockName);
            } else {
                // blockIdx = gl.getUniformBlockIndex(gpuShader.glProgram, blockName);
                blockIdx = b;
                blockSize = gl.getActiveUniformBlockParameter(gpuShader.glProgram, blockIdx, WebGLConstants.UNIFORM_BLOCK_DATA_SIZE);

                const glBinding = enableEffectImport
                    ? block.flattened
                    : block.binding + (device.bindingMappings.blockOffsets[block.set] || 0);

                gl.uniformBlockBinding(gpuShader.glProgram, blockIdx, glBinding);

                gpuShader.glBlocks[b] = {
                    set: block.set,
                    binding: block.binding,
                    idx: blockIdx,
                    name: blockName,
                    size: blockSize,
                    glBinding,
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
        gpuShader.glSamplerTextures = new Array<IWebGL2GPUUniformSamplerTexture>(gpuShader.samplerTextures.length);

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

    // texture unit index mapping optimization
    const glActiveSamplers: IWebGL2GPUUniformSamplerTexture[] = [];
    const glActiveSamplerLocations: WebGLUniformLocation[] = [];
    const texUnitCacheMap = cache.texUnitCacheMap;

    if (!enableEffectImport) {
        let flexibleSetBaseOffset = 0;
        for (let i = 0; i < gpuShader.blocks.length; ++i) {
            if (gpuShader.blocks[i].set === device.bindingMappings.flexibleSet) {
                flexibleSetBaseOffset++;
            }
        }

        let arrayOffset = 0;
        for (let i = 0; i < gpuShader.samplerTextures.length; ++i) {
            const sampler = gpuShader.samplerTextures[i];
            const glLoc = gl.getUniformLocation(gpuShader.glProgram, sampler.name);
            // wEcHAT just returns { id: -1 } for non-existing names /eyerolling
            if (glLoc && (glLoc as any).id !== -1) {
                glActiveSamplers.push(gpuShader.glSamplerTextures[i]);
                glActiveSamplerLocations.push(glLoc);
            }
            if (texUnitCacheMap[sampler.name] === undefined) {
                let binding = sampler.binding + device.bindingMappings.samplerTextureOffsets[sampler.set] + arrayOffset;
                if (sampler.set === device.bindingMappings.flexibleSet) { binding -= flexibleSetBaseOffset; }
                texUnitCacheMap[sampler.name] = binding % capabilities.maxTextureUnits;
                arrayOffset += sampler.count - 1;
            }
        }
    } else {
        for (let i = 0; i < gpuShader.samplerTextures.length; ++i) {
            const sampler = gpuShader.samplerTextures[i];
            const glLoc = gl.getUniformLocation(gpuShader.glProgram, sampler.name);
            // wEcHAT just returns { id: -1 } for non-existing names /eyerolling
            if (glLoc && (glLoc as any).id !== -1) {
                glActiveSamplers.push(gpuShader.glSamplerTextures[i]);
                glActiveSamplerLocations.push(glLoc);
            }
            if (texUnitCacheMap[sampler.name] === undefined) {
                texUnitCacheMap[sampler.name] = sampler.flattened % capabilities.maxTextureUnits;
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
                        cachedUnit = (cachedUnit + 1) % capabilities.maxTextureUnits;
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

            if (!glSampler.glLoc) {
                glSampler.glLoc = glActiveSamplerLocations[i];
                while (usedTexUnits[unitIdx]) { unitIdx++; }
                for (let t = 0; t < glSampler.count; ++t) {
                    while (usedTexUnits[unitIdx]) {
                        unitIdx = (unitIdx + 1) % capabilities.maxTextureUnits;
                    }
                    if (texUnitCacheMap[glSampler.name] === undefined) {
                        texUnitCacheMap[glSampler.name] = unitIdx;
                    }
                    glSampler.units.push(unitIdx);
                    usedTexUnits[unitIdx] = true;
                }
            }
        }

        if (cache.glProgram !== gpuShader.glProgram) {
            gl.useProgram(gpuShader.glProgram);
        }

        for (let k = 0; k < glActiveSamplers.length; k++) {
            const glSampler = glActiveSamplers[k];
            glSampler.glUnits = new Int32Array(glSampler.units);
            gl.uniform1iv(glSampler.glLoc, glSampler.glUnits);
        }

        if (cache.glProgram !== gpuShader.glProgram) {
            gl.useProgram(cache.glProgram);
        }
    }

    gpuShader.glSamplerTextures = glActiveSamplers;
}

export function WebGL2CmdFuncDestroyShader (device: WebGL2Device, gpuShader: IWebGL2GPUShader): void {
    const { gl } = device;
    const cache = device.getStateCache();
    if (gpuShader.glProgram) {
        gl.deleteProgram(gpuShader.glProgram);
        if (cache.glProgram === gpuShader.glProgram) {
            gl.useProgram(null);
            cache.glProgram = null;
        }
        gpuShader.glProgram = null;
    }
}

export function WebGL2CmdFuncCreateInputAssember (device: WebGL2Device, gpuInputAssembler: IWebGL2GPUInputAssembler): void {
    const { gl } = device;

    gpuInputAssembler.glAttribs = new Array<IWebGL2Attrib>(gpuInputAssembler.attributes.length);

    const offsets = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < gpuInputAssembler.attributes.length; ++i) {
        const attrib = gpuInputAssembler.attributes[i];

        const stream = attrib.stream !== undefined ? attrib.stream : 0;
        // if (stream < gpuInputAssembler.gpuVertexBuffers.length) {

        const gpuBuffer = gpuInputAssembler.gpuVertexBuffers[stream];

        const glType = GFXFormatToWebGLType(attrib.format, gl);
        const { size } = FormatInfos[attrib.format];

        gpuInputAssembler.glAttribs[i] = {
            name: attrib.name,
            glBuffer: gpuBuffer.glBuffer,
            glType,
            size,
            count: FormatInfos[attrib.format].count,
            stride: gpuBuffer.stride,
            componentCount: WebGLGetComponentCount(glType, gl),
            isNormalized: (attrib.isNormalized !== undefined ? attrib.isNormalized : false),
            isInstanced: (attrib.isInstanced !== undefined ? attrib.isInstanced : false),
            offset: offsets[stream],
        };

        offsets[stream] += size;
    }
}

export function WebGL2CmdFuncDestroyInputAssembler (device: WebGL2Device, gpuInputAssembler: IWebGL2GPUInputAssembler): void {
    const { gl } = device;
    const cache = device.getStateCache();

    const it = gpuInputAssembler.glVAOs.values();
    let res = it.next();

    let glVAO = cache.glVAO;
    while (!res.done) {
        gl.deleteVertexArray(res.value);
        if (glVAO === res.value) {
            gl.bindVertexArray(null);
            glVAO = null;
        }
        res = it.next();
    }
    cache.glVAO = glVAO;
    gpuInputAssembler.glVAOs.clear();
}

/** @mangle */
interface IWebGL2StateCache {
    gpuPipelineState: IWebGL2GPUPipelineState | null;
    gpuInputAssembler: IWebGL2GPUInputAssembler | null;
    glPrimitive: number;
    invalidateAttachments: GLenum[];
}

/** @mangle */
const gfxStateCache: IWebGL2StateCache = {
    gpuPipelineState: null,
    gpuInputAssembler: null,
    glPrimitive: 0,
    invalidateAttachments: [],
};

export function WebGL2CmdFuncBeginRenderPass (
    device: WebGL2Device,
    gpuRenderPass: IWebGL2GPURenderPass | null,
    gpuFramebuffer: IWebGL2GPUFramebuffer | null,
    renderArea: Readonly<Rect>,
    clearColors: Readonly<Color[]>,
    clearDepth: number,
    clearStencil: number,
): void {
    const { gl } = device;
    const cache = device.getStateCache();

    let clears: GLbitfield = 0;

    if (gpuFramebuffer && gpuRenderPass) {
        if (cache.glFramebuffer !== gpuFramebuffer.glFramebuffer) {
            gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, gpuFramebuffer.glFramebuffer);
            cache.glFramebuffer = gpuFramebuffer.glFramebuffer;
        }

        if (cache.viewport.left !== renderArea.x
            || cache.viewport.top !== renderArea.y
            || cache.viewport.width !== renderArea.width
            || cache.viewport.height !== renderArea.height) {
            gl.viewport(renderArea.x, renderArea.y, renderArea.width, renderArea.height);

            cache.viewport.left = renderArea.x;
            cache.viewport.top = renderArea.y;
            cache.viewport.width = renderArea.width;
            cache.viewport.height = renderArea.height;
        }

        if (cache.scissorRect.x !== renderArea.x
            || cache.scissorRect.y !== renderArea.y
            || cache.scissorRect.width !== renderArea.width
            || cache.scissorRect.height !== renderArea.height) {
            gl.scissor(renderArea.x, renderArea.y, renderArea.width, renderArea.height);

            cache.scissorRect.x = renderArea.x;
            cache.scissorRect.y = renderArea.y;
            cache.scissorRect.width = renderArea.width;
            cache.scissorRect.height = renderArea.height;
        }

        gfxStateCache.invalidateAttachments.length = 0;

        for (let j = 0; j < clearColors.length; ++j) {
            const colorAttachment = gpuRenderPass.colorAttachments[j];

            if (colorAttachment.format !== Format.UNKNOWN) {
                switch (colorAttachment.loadOp) {
                case LoadOp.LOAD: break; // GL default behavior
                case LoadOp.CLEAR: {
                    if (cache.bs.targets[0].blendColorMask !== ColorMask.ALL) {
                        gl.colorMask(true, true, true, true);
                    }

                    // We-chat mini-game, glClearBufferfv get INVALID_ENUM. MRT may not be supported. use clearColor instead.
                    if (gpuRenderPass.colorAttachments.length === 1) {
                        const clearColor = clearColors[0];
                        gl.clearColor(clearColor.x, clearColor.y, clearColor.z, clearColor.w);
                        clears |= WebGLConstants.COLOR_BUFFER_BIT;
                    } else {
                        _f32v4[0] = clearColors[j].x;
                        _f32v4[1] = clearColors[j].y;
                        _f32v4[2] = clearColors[j].z;
                        _f32v4[3] = clearColors[j].w;
                        gl.clearBufferfv(WebGLConstants.COLOR, j, _f32v4);
                    }
                    break;
                }
                case LoadOp.DISCARD: {
                    // invalidate the framebuffer
                    gfxStateCache.invalidateAttachments.push(WebGLConstants.COLOR_ATTACHMENT0 + j);
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
                    if (!cache.dss.depthWrite) {
                        gl.depthMask(true);
                    }

                    gl.clearDepth(clearDepth);

                    clears |= WebGLConstants.DEPTH_BUFFER_BIT;
                    break;
                }
                case LoadOp.DISCARD: {
                    // invalidate the framebuffer
                    gfxStateCache.invalidateAttachments.push(WebGLConstants.DEPTH_ATTACHMENT);
                    break;
                }
                default:
                }

                if (FormatInfos[gpuRenderPass.depthStencilAttachment.format].hasStencil) {
                    switch (gpuRenderPass.depthStencilAttachment.stencilLoadOp) {
                    case LoadOp.LOAD: break; // GL default behavior
                    case LoadOp.CLEAR: {
                        if (!cache.dss.stencilWriteMaskFront) {
                            gl.stencilMaskSeparate(WebGLConstants.FRONT, 0xffff);
                        }

                        if (!cache.dss.stencilWriteMaskBack) {
                            gl.stencilMaskSeparate(WebGLConstants.BACK, 0xffff);
                        }

                        gl.clearStencil(clearStencil);
                        clears |= WebGLConstants.STENCIL_BUFFER_BIT;
                        break;
                    }
                    case LoadOp.DISCARD: {
                        // invalidate the framebuffer
                        gfxStateCache.invalidateAttachments.push(WebGLConstants.STENCIL_ATTACHMENT);
                        break;
                    }
                    default:
                    }
                }
            }
        } // if (curGPURenderPass.depthStencilAttachment)

        if (gpuFramebuffer.glFramebuffer && gfxStateCache.invalidateAttachments.length) {
            gl.invalidateFramebuffer(WebGLConstants.FRAMEBUFFER, gfxStateCache.invalidateAttachments);
        }

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
            && !cache.dss.depthWrite) {
            gl.depthMask(false);
        }

        if (clears & WebGLConstants.STENCIL_BUFFER_BIT) {
            if (!cache.dss.stencilWriteMaskFront) {
                gl.stencilMaskSeparate(WebGLConstants.FRONT, 0);
            }

            if (!cache.dss.stencilWriteMaskBack) {
                gl.stencilMaskSeparate(WebGLConstants.BACK, 0);
            }
        }
    } // if (gpuFramebuffer)
}

export function WebGL2CmdFuncBindStates (
    device: WebGL2Device,
    gpuPipelineState: IWebGL2GPUPipelineState | null,
    gpuInputAssembler: IWebGL2GPUInputAssembler | null,
    gpuDescriptorSets: Readonly<IWebGL2GPUDescriptorSet[]>,
    dynamicOffsets: Readonly<number[]>,
    dynamicStates: Readonly<DynamicStates>,
): void {
    const { gl } = device;
    const capabilities = device.capabilities;
    const cache = device.getStateCache();
    const cacheRs = cache.rs;
    const cacheDss = cache.dss;
    const cacheBs = cache.bs;
    const cacheBlendColor = cacheBs.blendColor;
    const gpuShader = gpuPipelineState && gpuPipelineState.gpuShader;

    let isShaderChanged = false;

    // bind pipeline
    if (gpuPipelineState && gfxStateCache.gpuPipelineState !== gpuPipelineState) {
        gfxStateCache.gpuPipelineState = gpuPipelineState;
        gfxStateCache.glPrimitive = gpuPipelineState.glPrimitive;

        if (gpuShader) {
            const { glProgram } = gpuShader;
            if (cache.glProgram !== glProgram) {
                gl.useProgram(glProgram);
                cache.glProgram = glProgram;
                isShaderChanged = true;
            }
        }

        // rasterizer state
        const { rs } = gpuPipelineState;
        if (rs) {
            if (cacheRs.cullMode !== rs.cullMode) {
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

                cacheRs.cullMode = rs.cullMode;
            }

            const isFrontFaceCCW = rs.isFrontFaceCCW; // boolean XOR
            if (cacheRs.isFrontFaceCCW !== isFrontFaceCCW) {
                gl.frontFace(isFrontFaceCCW ? WebGLConstants.CCW : WebGLConstants.CW);
                cacheRs.isFrontFaceCCW = isFrontFaceCCW;
            }

            if ((cacheRs.depthBias !== rs.depthBias)
                || (cacheRs.depthBiasSlop !== rs.depthBiasSlop)) {
                gl.polygonOffset(rs.depthBias, rs.depthBiasSlop);
                cacheRs.depthBias = rs.depthBias;
                cacheRs.depthBiasSlop = rs.depthBiasSlop;
            }

            if (cacheRs.lineWidth !== rs.lineWidth) {
                gl.lineWidth(rs.lineWidth);
                cacheRs.lineWidth = rs.lineWidth;
            }
        } // rasterizater state

        // depth-stencil state
        const { dss } = gpuPipelineState;
        if (dss) {
            if (cacheDss.depthTest !== dss.depthTest) {
                if (dss.depthTest) {
                    gl.enable(WebGLConstants.DEPTH_TEST);
                } else {
                    gl.disable(WebGLConstants.DEPTH_TEST);
                }
                cacheDss.depthTest = dss.depthTest;
            }

            if (cacheDss.depthWrite !== dss.depthWrite) {
                gl.depthMask(dss.depthWrite);
                cacheDss.depthWrite = dss.depthWrite;
            }

            if (cacheDss.depthFunc !== dss.depthFunc) {
                gl.depthFunc(WebGLCmpFuncs[dss.depthFunc]);
                cacheDss.depthFunc = dss.depthFunc;
            }

            // front
            if ((cacheDss.stencilTestFront !== dss.stencilTestFront)
                || (cacheDss.stencilTestBack !== dss.stencilTestBack)) {
                if (dss.stencilTestFront || dss.stencilTestBack) {
                    gl.enable(WebGLConstants.STENCIL_TEST);
                } else {
                    gl.disable(WebGLConstants.STENCIL_TEST);
                }
                cacheDss.stencilTestFront = dss.stencilTestFront;
                cacheDss.stencilTestBack = dss.stencilTestBack;
            }

            if ((cacheDss.stencilFuncFront !== dss.stencilFuncFront)
                || (cacheDss.stencilRefFront !== dss.stencilRefFront)
                || (cacheDss.stencilReadMaskFront !== dss.stencilReadMaskFront)) {
                gl.stencilFuncSeparate(
                    WebGLConstants.FRONT,
                    WebGLCmpFuncs[dss.stencilFuncFront],
                    dss.stencilRefFront,
                    dss.stencilReadMaskFront,
                );

                cacheDss.stencilFuncFront = dss.stencilFuncFront;
                cacheDss.stencilRefFront = dss.stencilRefFront;
                cacheDss.stencilReadMaskFront = dss.stencilReadMaskFront;
            }

            if ((cacheDss.stencilFailOpFront !== dss.stencilFailOpFront)
                || (cacheDss.stencilZFailOpFront !== dss.stencilZFailOpFront)
                || (cacheDss.stencilPassOpFront !== dss.stencilPassOpFront)) {
                gl.stencilOpSeparate(
                    WebGLConstants.FRONT,
                    WebGLStencilOps[dss.stencilFailOpFront],
                    WebGLStencilOps[dss.stencilZFailOpFront],
                    WebGLStencilOps[dss.stencilPassOpFront],
                );

                cacheDss.stencilFailOpFront = dss.stencilFailOpFront;
                cacheDss.stencilZFailOpFront = dss.stencilZFailOpFront;
                cacheDss.stencilPassOpFront = dss.stencilPassOpFront;
            }

            if (cacheDss.stencilWriteMaskFront !== dss.stencilWriteMaskFront) {
                gl.stencilMaskSeparate(WebGLConstants.FRONT, dss.stencilWriteMaskFront);
                cacheDss.stencilWriteMaskFront = dss.stencilWriteMaskFront;
            }

            // back
            if ((cacheDss.stencilFuncBack !== dss.stencilFuncBack)
                || (cacheDss.stencilRefBack !== dss.stencilRefBack)
                || (cacheDss.stencilReadMaskBack !== dss.stencilReadMaskBack)) {
                gl.stencilFuncSeparate(
                    WebGLConstants.BACK,
                    WebGLCmpFuncs[dss.stencilFuncBack],
                    dss.stencilRefBack,
                    dss.stencilReadMaskBack,
                );

                cacheDss.stencilFuncBack = dss.stencilFuncBack;
                cacheDss.stencilRefBack = dss.stencilRefBack;
                cacheDss.stencilReadMaskBack = dss.stencilReadMaskBack;
            }

            if ((cacheDss.stencilFailOpBack !== dss.stencilFailOpBack)
                || (cacheDss.stencilZFailOpBack !== dss.stencilZFailOpBack)
                || (cacheDss.stencilPassOpBack !== dss.stencilPassOpBack)) {
                gl.stencilOpSeparate(
                    WebGLConstants.BACK,
                    WebGLStencilOps[dss.stencilFailOpBack],
                    WebGLStencilOps[dss.stencilZFailOpBack],
                    WebGLStencilOps[dss.stencilPassOpBack],
                );

                cacheDss.stencilFailOpBack = dss.stencilFailOpBack;
                cacheDss.stencilZFailOpBack = dss.stencilZFailOpBack;
                cacheDss.stencilPassOpBack = dss.stencilPassOpBack;
            }

            if (cacheDss.stencilWriteMaskBack !== dss.stencilWriteMaskBack) {
                gl.stencilMaskSeparate(WebGLConstants.BACK, dss.stencilWriteMaskBack);
                cacheDss.stencilWriteMaskBack = dss.stencilWriteMaskBack;
            }
        } // depth-stencil state

        // blend state
        const { bs } = gpuPipelineState;
        if (bs) {
            if (cacheBs.isA2C !== bs.isA2C) {
                if (bs.isA2C) {
                    gl.enable(WebGLConstants.SAMPLE_ALPHA_TO_COVERAGE);
                } else {
                    gl.disable(WebGLConstants.SAMPLE_ALPHA_TO_COVERAGE);
                }
                cacheBs.isA2C = bs.isA2C;
            }

            const blendColor = bs.blendColor;

            if ((cacheBlendColor.x !== blendColor.x)
                || (cacheBlendColor.y !== blendColor.y)
                || (cacheBlendColor.z !== blendColor.z)
                || (cacheBlendColor.w !== blendColor.w)) {
                gl.blendColor(blendColor.x, blendColor.y, blendColor.z, blendColor.w);

                cacheBlendColor.x = blendColor.x;
                cacheBlendColor.y = blendColor.y;
                cacheBlendColor.z = blendColor.z;
                cacheBlendColor.w = blendColor.w;
            }

            const target0 = bs.targets[0];
            const target0Cache = cache.bs.targets[0];

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
            const descriptorIndex = gpuDescriptorSet && gpuDescriptorSet.descriptorIndices[glBlock.binding];
            const gpuDescriptor = descriptorIndex >= 0 && gpuDescriptorSet.gpuDescriptors[descriptorIndex];

            if (!gpuDescriptor || !gpuDescriptor.gpuBuffer) {
                // error(`Buffer binding '${glBlock.name}' at set ${glBlock.set} binding ${glBlock.binding} is not bounded`);
                continue;
            }

            const dynamicOffsetIndexSet = dynamicOffsetIndices[glBlock.set];
            const dynamicOffsetIndex = dynamicOffsetIndexSet && dynamicOffsetIndexSet[glBlock.binding];
            let offset = gpuDescriptor.gpuBuffer.glOffset;
            if (dynamicOffsetIndex >= 0) { offset += dynamicOffsets[dynamicOffsetIndex]; }

            if (cache.glBindUBOs[glBlock.glBinding] !== gpuDescriptor.gpuBuffer.glBuffer
                || cache.glBindUBOOffsets[glBlock.glBinding] !== offset) {
                if (offset) {
                    gl.bindBufferRange(
                        WebGLConstants.UNIFORM_BUFFER,
                        glBlock.glBinding,
                        gpuDescriptor.gpuBuffer.glBuffer,
                        offset,
                        gpuDescriptor.gpuBuffer.size,
                    );
                } else {
                    gl.bindBufferBase(WebGLConstants.UNIFORM_BUFFER, glBlock.glBinding, gpuDescriptor.gpuBuffer.glBuffer);
                }
                cache.glUniformBuffer = cache.glBindUBOs[glBlock.glBinding] = gpuDescriptor.gpuBuffer.glBuffer;
                cache.glBindUBOOffsets[glBlock.glBinding] = offset;
            }
        }

        const samplerLen = gpuShader.glSamplerTextures.length;
        for (let i = 0; i < samplerLen; i++) {
            const glSampler = gpuShader.glSamplerTextures[i];
            const gpuDescriptorSet = gpuDescriptorSets[glSampler.set];
            let descriptorIndex = gpuDescriptorSet && gpuDescriptorSet.descriptorIndices[glSampler.binding];
            let gpuDescriptor = descriptorIndex >= 0 && gpuDescriptorSet.gpuDescriptors[descriptorIndex];

            for (let l = 0; l < glSampler.units.length; l++) {
                const texUnit = glSampler.units[l];

                const glTexUnit = cache.glTexUnits[texUnit];

                if (!gpuDescriptor || !gpuDescriptor.gpuTextureView || !gpuDescriptor.gpuTextureView.gpuTexture || !gpuDescriptor.gpuSampler) {
                    // error(`Sampler binding '${glSampler.name}' at set ${glSampler.set} binding ${glSampler.binding} index ${l} is not bounded`);
                    continue;
                }

                const gpuTextureView = gpuDescriptor.gpuTextureView;
                const gpuTexture = gpuTextureView.gpuTexture;
                const  minLod = gpuTextureView.baseLevel;
                const  maxLod = minLod + gpuTextureView.levelCount;

                if (gpuTexture.size > 0) {
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

                    const { gpuSampler } = gpuDescriptor; // get sampler with different mipmap levels
                    const glSampler = gpuSampler.getGLSampler(device, minLod, maxLod);
                    if (cache.glSamplerUnits[texUnit] !== glSampler) {
                        gl.bindSampler(texUnit, glSampler);
                        cache.glSamplerUnits[texUnit] = glSampler;
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

        if (device.extensions.useVAO) {
            // check vao
            let glVAO = gpuInputAssembler.glVAOs.get(gpuShader.glProgram!);
            if (!glVAO) {
                glVAO = gl.createVertexArray()!;
                gpuInputAssembler.glVAOs.set(gpuShader.glProgram!, glVAO);

                gl.bindVertexArray(glVAO);
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                cache.glArrayBuffer = null;
                cache.glElementArrayBuffer = null;

                let glAttrib: IWebGL2Attrib | null;
                for (let j = 0; j < gpuShader.glInputs.length; j++) {
                    const glInput = gpuShader.glInputs[j];
                    glAttrib = null;

                    for (let k = 0; k < gpuInputAssembler.glAttribs.length; k++) {
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
                            gl.vertexAttribDivisor(glLoc, glAttrib.isInstanced ? 1 : 0);
                        }
                    }
                }

                const gpuBuffer = gpuInputAssembler.gpuIndexBuffer;
                if (gpuBuffer) {
                    gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, gpuBuffer.glBuffer);
                }

                gl.bindVertexArray(null);
                gl.bindBuffer(WebGLConstants.ARRAY_BUFFER, null);
                gl.bindBuffer(WebGLConstants.ELEMENT_ARRAY_BUFFER, null);
                cache.glArrayBuffer = null;
                cache.glElementArrayBuffer = null;
            }

            if (cache.glVAO !== glVAO) {
                gl.bindVertexArray(glVAO);
                cache.glVAO = glVAO;
            }
        } else {
            for (let a = 0; a < capabilities.maxVertexAttributes; ++a) {
                cache.glCurrentAttribLocs[a] = false;
            }

            for (let j = 0; j < gpuShader.glInputs.length; j++) {
                const glInput = gpuShader.glInputs[j];
                let glAttrib: IWebGL2Attrib | null = null;

                for (let k = 0; k < gpuInputAssembler.glAttribs.length; k++) {
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
                        gl.vertexAttribDivisor(glLoc, glAttrib.isInstanced ? 1 : 0);
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

            for (let a = 0; a < capabilities.maxVertexAttributes; ++a) {
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
        for (let k = 0; k < dsLen; k++) {
            const dynamicState = gpuPipelineState.dynamicStates[k];
            switch (dynamicState) {
            case DynamicStateFlagBit.LINE_WIDTH: {
                if (cacheRs.lineWidth !== dynamicStates.lineWidth) {
                    gl.lineWidth(dynamicStates.lineWidth);
                    cacheRs.lineWidth = dynamicStates.lineWidth;
                }
                break;
            }
            case DynamicStateFlagBit.DEPTH_BIAS: {
                if (cacheRs.depthBias !== dynamicStates.depthBiasConstant
                    || cache.rs.depthBiasSlop !== dynamicStates.depthBiasSlope) {
                    gl.polygonOffset(dynamicStates.depthBiasConstant, dynamicStates.depthBiasSlope);
                    cacheRs.depthBias = dynamicStates.depthBiasConstant;
                    cacheRs.depthBiasSlop = dynamicStates.depthBiasSlope;
                }
                break;
            }
            case DynamicStateFlagBit.BLEND_CONSTANTS: {
                const blendConstant = dynamicStates.blendConstant;
                if ((cacheBlendColor.x !== blendConstant.x)
                    || (cacheBlendColor.y !== blendConstant.y)
                    || (cacheBlendColor.z !== blendConstant.z)
                    || (cacheBlendColor.w !== blendConstant.w)) {
                    gl.blendColor(blendConstant.x, blendConstant.y, blendConstant.z, blendConstant.w);
                    cacheBlendColor.copy(blendConstant);
                }
                break;
            }
            case DynamicStateFlagBit.STENCIL_WRITE_MASK: {
                const front = dynamicStates.stencilStatesFront;
                const back = dynamicStates.stencilStatesBack;
                if (cacheDss.stencilWriteMaskFront !== front.writeMask) {
                    gl.stencilMaskSeparate(WebGLConstants.FRONT, front.writeMask);
                    cacheDss.stencilWriteMaskFront = front.writeMask;
                }
                if (cacheDss.stencilWriteMaskBack !== back.writeMask) {
                    gl.stencilMaskSeparate(WebGLConstants.BACK, back.writeMask);
                    cacheDss.stencilWriteMaskBack = back.writeMask;
                }
                break;
            }
            case DynamicStateFlagBit.STENCIL_COMPARE_MASK: {
                const front = dynamicStates.stencilStatesFront;
                const back = dynamicStates.stencilStatesBack;
                if (cacheDss.stencilRefFront !== front.reference
                    || cacheDss.stencilReadMaskFront !== front.compareMask) {
                    gl.stencilFuncSeparate(WebGLConstants.FRONT, WebGLCmpFuncs[cacheDss.stencilFuncFront], front.reference, front.compareMask);
                    cacheDss.stencilRefFront = front.reference;
                    cacheDss.stencilReadMaskFront = front.compareMask;
                }
                if (cacheDss.stencilRefBack !== back.reference
                    || cacheDss.stencilReadMaskBack !== back.compareMask) {
                    gl.stencilFuncSeparate(WebGLConstants.BACK, WebGLCmpFuncs[cacheDss.stencilFuncBack], back.reference, back.compareMask);
                    cacheDss.stencilRefBack = back.reference;
                    cacheDss.stencilReadMaskBack = back.compareMask;
                }
                break;
            }
            default:
            } // switch
        } // for
    } // update dynamic states
}

export function WebGL2CmdFuncDraw (device: WebGL2Device, drawInfo: Readonly<DrawInfo>): void {
    const { gl } = device;
    const { gpuInputAssembler, glPrimitive } = gfxStateCache;
    const md = device.extensions.WEBGL_multi_draw;

    if (gpuInputAssembler) {
        const indexBuffer = gpuInputAssembler.gpuIndexBuffer;
        if (gpuInputAssembler.gpuIndirectBuffer) {
            const { indirects } = gpuInputAssembler.gpuIndirectBuffer;
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
                        if (indirects.instances[j]) {
                            gl.drawElementsInstanced(
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
                    if (indirects.instances[j]) {
                        gl.drawArraysInstanced(glPrimitive, indirects.offsets[j], indirects.counts[j], indirects.instances[j]);
                    } else {
                        gl.drawArrays(glPrimitive, indirects.offsets[j], indirects.counts[j]);
                    }
                }
            }
        } else if (drawInfo.instanceCount) {
            if (indexBuffer) {
                if (drawInfo.indexCount > 0) {
                    const offset = drawInfo.firstIndex * indexBuffer.stride;
                    gl.drawElementsInstanced(
                        glPrimitive,
                        drawInfo.indexCount,
                        gpuInputAssembler.glIndexType,
                        offset,
                        drawInfo.instanceCount,
                    );
                }
            } else if (drawInfo.vertexCount > 0) {
                gl.drawArraysInstanced(glPrimitive, drawInfo.firstVertex, drawInfo.vertexCount, drawInfo.instanceCount);
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

function toUseTexImage2D (texImages: Readonly<TexImageSource[]>, regions: Readonly<BufferTextureCopy[]>): boolean {
    if (texImages.length > 1 || regions.length > 1) return false;
    const isVideoElement = texImages[0] instanceof HTMLVideoElement;
    if (isVideoElement) {
        const videoElement = texImages[0] as HTMLVideoElement;
        const isSameSize = regions[0].texOffset.x === 0
        && regions[0].texOffset.y === 0
        && regions[0].texExtent.width === videoElement.videoWidth
        && regions[0].texExtent.height === videoElement.videoHeight;
        return isSameSize;
    }
    return false;
}

export function WebGL2CmdFuncCopyTexImagesToTexture (
    device: WebGL2Device,
    texImages: Readonly<TexImageSource[]>,
    gpuTexture: IWebGL2GPUTexture,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const glTexUnit = cache.glTexUnits[cache.texUnit];
    if (glTexUnit.glTexture !== gpuTexture.glTexture) {
        gl.bindTexture(gpuTexture.glTarget, gpuTexture.glTexture);
        glTexUnit.glTexture = gpuTexture.glTexture;
    }

    let n = 0;
    let f = 0;

    switch (gpuTexture.glTarget) {
    case WebGLConstants.TEXTURE_2D: {
        if ((gpuTexture.flags & TextureFlagBit.MUTABLE_STORAGE) || toUseTexImage2D(texImages, regions)) {
            gl.texImage2D(
                WebGLConstants.TEXTURE_2D,
                regions[0].texSubres.mipLevel,
                gpuTexture.glInternalFmt,
                regions[0].texExtent.width,
                regions[0].texExtent.height,
                0,
                gpuTexture.glFormat,
                gpuTexture.glType,
                texImages[0],
            );
        } else {
            for (let k = 0; k < regions.length; k++) {
                const region = regions[k];
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
        }
        break;
    }
    case WebGLConstants.TEXTURE_CUBE_MAP: {
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
            const regionTexSubres = region.texSubres;
            const regionTexOffset = region.texOffset;
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

    if (gpuTexture.flags & TextureFlagBit.GEN_MIPMAP) {
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
    const rowStrideSize = FormatSize(format, stride.width, 1, 1);
    const sliceStrideSize = FormatSize(format, stride.width, stride.height, 1);
    const destRowSize = FormatSize(format, extent.width, 1, 1);

    const ArrayBufferCtor: TypedArrayConstructor = getTypedArrayConstructor(FormatInfos[format]);

    if (stagingBuffer.byteLength < bufferSize) {
        stagingBuffer = new Uint8Array(bufferSize);
    }

    let destOffset = 0;
    let bufferOffset = offset;

    for (let i = 0; i < extent.depth; i++) {
        bufferOffset = offset + sliceStrideSize * i;
        for (let j = 0; j < extent.height; j += blockHeight) {
            stagingBuffer.subarray(destOffset, destOffset + destRowSize).set(
                new Uint8Array(buffer.buffer, buffer.byteOffset + bufferOffset, destRowSize),
            );
            destOffset += destRowSize;
            bufferOffset += rowStrideSize;
        }
    }
    const length = bufferSize / ArrayBufferCtor.BYTES_PER_ELEMENT;
    assertID(Number.isInteger(length), 9101);
    return new ArrayBufferCtor(stagingBuffer.buffer, 0, length);
}

export function WebGL2CmdFuncCopyBuffersToTexture (
    device: WebGL2Device,
    buffers: Readonly<ArrayBufferView[]>,
    gpuTexture: IWebGL2GPUTexture,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const glTexUnit = cache.glTexUnits[cache.texUnit];
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
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
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
            } else if (gpuTexture.glInternalFmt !== WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL as number) {
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
    case WebGLConstants.TEXTURE_2D_ARRAY: {
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
            const mipLevel = region.texSubres.mipLevel;

            const regionTexOffset = region.texOffset;
            const regionTexExtent = region.texExtent;
            const regionTexExtentWidth = regionTexExtent.width;
            const regionTexExtentHeight = regionTexExtent.height;
            const blockSizeWidth = blockSize.width;
            const blockSizeHeight = blockSize.height;
            const regionBuffStride = region.buffStride;
            const regionTexSubres = region.texSubres;

            offset.x =  regionTexOffset.x === 0 ? 0 : alignTo(regionTexOffset.x, blockSizeWidth);
            offset.y =  regionTexOffset.y === 0 ? 0 : alignTo(regionTexOffset.y, blockSizeHeight);
            extent.width = regionTexExtentWidth < blockSizeWidth ? regionTexExtentWidth : alignTo(regionTexExtentWidth, blockSizeWidth);
            extent.height = regionTexExtentHeight < blockSizeHeight ? regionTexExtentWidth
                : alignTo(regionTexExtentHeight, blockSizeHeight);
            extent.depth = 1;
            stride.width = regionBuffStride > 0 ?  regionBuffStride : extent.width;
            stride.height = region.buffTexHeight > 0 ? region.buffTexHeight : extent.height;

            const destWidth  = (regionTexExtentWidth + offset.x === (gpuTexture.width >> mipLevel)) ? regionTexExtentWidth : extent.width;
            const destHeight = (regionTexExtentHeight + offset.y === (gpuTexture.height >> mipLevel)) ? regionTexExtentHeight : extent.height;

            const fcount = regionTexSubres.baseArrayLayer + regionTexSubres.layerCount;
            for (f = regionTexSubres.baseArrayLayer; f < fcount; ++f) {
                offset.z = f;

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
                    gl.texSubImage3D(
                        WebGLConstants.TEXTURE_2D_ARRAY,
                        mipLevel,
                        offset.x,
                        offset.y,
                        offset.z,
                        destWidth,
                        destHeight,
                        extent.depth,
                        gpuTexture.glFormat,
                        gpuTexture.glType,
                        pixels,
                    );
                } else if (gpuTexture.glInternalFmt !== WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL as number) {
                    gl.compressedTexSubImage3D(
                        WebGLConstants.TEXTURE_2D_ARRAY,
                        mipLevel,
                        offset.x,
                        offset.y,
                        offset.z,
                        destWidth,
                        destHeight,
                        extent.depth,
                        gpuTexture.glFormat,
                        pixels,
                    );
                } else { // WEBGL_compressed_texture_etc1
                    gl.compressedTexImage3D(
                        WebGLConstants.TEXTURE_2D_ARRAY,
                        mipLevel,
                        gpuTexture.glInternalFmt,
                        destWidth,
                        destHeight,
                        extent.depth,
                        0,
                        pixels,
                    );
                }
            }
        }
        break;
    }
    case WebGLConstants.TEXTURE_3D: {
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
            const mipLevel = region.texSubres.mipLevel;
            const regionTexOffset = region.texOffset;
            const regionTexExtent = region.texExtent;
            const regionTexExtentWidth = regionTexExtent.width;
            const regionTexExtentHeight = regionTexExtent.height;
            const blockSizeWidth = blockSize.width;
            const blockSizeHeight = blockSize.height;
            const regionBuffStride = region.buffStride;

            offset.x = regionTexOffset.x === 0 ? 0 : alignTo(regionTexOffset.x, blockSizeWidth);
            offset.y = regionTexOffset.y === 0 ? 0 : alignTo(regionTexOffset.y, blockSizeHeight);
            offset.z = regionTexOffset.z;
            extent.width = regionTexExtentWidth < blockSizeWidth ? regionTexExtentWidth : alignTo(regionTexExtentWidth, blockSizeWidth);
            extent.height = regionTexExtentHeight < blockSizeHeight ? regionTexExtentWidth
                : alignTo(regionTexExtentHeight, blockSizeHeight);
            extent.depth = regionTexExtent.depth;
            stride.width = regionBuffStride > 0 ?  regionBuffStride : extent.width;
            stride.height = region.buffTexHeight > 0 ? region.buffTexHeight : extent.height;

            const destWidth  = (regionTexExtentWidth + offset.x === (gpuTexture.width >> mipLevel)) ? regionTexExtentWidth : extent.width;
            const destHeight = (regionTexExtentHeight + offset.y === (gpuTexture.height >> mipLevel)) ? regionTexExtentHeight : extent.height;

            let pixels: ArrayBufferView;
            const buffer = buffers[n++];
            if (stride.width === extent.width && stride.height === extent.height) {
                const length = FormatSize(gpuTexture.format, destWidth, destHeight, extent.depth) / ArrayBufferCtor.BYTES_PER_ELEMENT;
                assertID(Number.isInteger(length), 9101);
                pixels = new ArrayBufferCtor(buffer.buffer, buffer.byteOffset + region.buffOffset, length);
            } else {
                pixels = pixelBufferPick(buffer, gpuTexture.format, region.buffOffset, stride, extent);
            }

            if (!isCompressed) {
                gl.texSubImage3D(
                    WebGLConstants.TEXTURE_2D_ARRAY,
                    mipLevel,
                    offset.x,
                    offset.y,
                    offset.z,
                    destWidth,
                    destHeight,
                    extent.depth,
                    gpuTexture.glFormat,
                    gpuTexture.glType,
                    pixels,
                );
            } else if (gpuTexture.glInternalFmt !== WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL as number) {
                gl.compressedTexSubImage3D(
                    WebGLConstants.TEXTURE_2D_ARRAY,
                    mipLevel,
                    offset.x,
                    offset.y,
                    offset.z,
                    destWidth,
                    destHeight,
                    extent.depth,
                    gpuTexture.glFormat,
                    pixels,
                );
            } else { // WEBGL_compressed_texture_etc1
                gl.compressedTexImage3D(
                    WebGLConstants.TEXTURE_2D_ARRAY,
                    mipLevel,
                    gpuTexture.glInternalFmt,
                    destWidth,
                    destHeight,
                    extent.depth,
                    0,
                    pixels,
                );
            }
        }
        break;
    }
    case WebGLConstants.TEXTURE_CUBE_MAP: {
        for (let k = 0; k < regions.length; k++) {
            const region = regions[k];
            const mipLevel = region.texSubres.mipLevel;

            const regionTexOffset = region.texOffset;
            const regionTexExtent = region.texExtent;
            const regionTexExtentWidth = regionTexExtent.width;
            const regionTexExtentHeight = regionTexExtent.height;
            const blockSizeWidth = blockSize.width;
            const blockSizeHeight = blockSize.height;
            const regionBuffStride = region.buffStride;
            const regionTexSubres = region.texSubres;

            offset.x =  regionTexOffset.x === 0 ? 0 : alignTo(regionTexOffset.x, blockSizeWidth);
            offset.y =  regionTexOffset.y === 0 ? 0 : alignTo(regionTexOffset.y, blockSizeHeight);
            extent.width = regionTexExtentWidth < blockSizeWidth ? regionTexExtentWidth : alignTo(regionTexExtentWidth, blockSizeWidth);
            extent.height = regionTexExtentHeight < blockSizeHeight ? regionTexExtentWidth
                : alignTo(regionTexExtentHeight, blockSizeHeight);
            stride.width = regionBuffStride > 0 ?  regionBuffStride : extent.width;
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
                } else if (gpuTexture.glInternalFmt !== WebGL2EXT.COMPRESSED_RGB_ETC1_WEBGL as number) {
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

export function WebGL2CmdFuncCopyTextureToBuffers (
    device: WebGL2Device,
    gpuTexture: IWebGL2GPUTexture,
    buffers: Readonly<ArrayBufferView[]>,
    regions: Readonly<BufferTextureCopy[]>,
): void {
    const { gl } = device;
    const cache = device.getStateCache();

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

export function WebGL2CmdFuncBlitFramebuffer (
    device: WebGL2Device,
    src: IWebGL2GPUFramebuffer,
    dst: IWebGL2GPUFramebuffer,
    srcRect: Readonly<Rect>,
    dstRect: Readonly<Rect>,
    filter: Filter,
): void {
    const { gl } = device;
    const cache = device.getStateCache();

    if (cache.glReadFramebuffer !== src.glFramebuffer) {
        gl.bindFramebuffer(WebGLConstants.READ_FRAMEBUFFER, src.glFramebuffer);
        cache.glReadFramebuffer = src.glFramebuffer;
    }

    const rebindFBO = (dst.glFramebuffer !== cache.glFramebuffer);
    if (rebindFBO) {
        gl.bindFramebuffer(WebGLConstants.DRAW_FRAMEBUFFER, dst.glFramebuffer);
    }

    let mask = 0;
    if (src.gpuColorViews.length > 0) {
        mask |= WebGLConstants.COLOR_BUFFER_BIT;
    }

    if (src.gpuDepthStencilView) {
        mask |= WebGLConstants.DEPTH_BUFFER_BIT;
        if (FormatInfos[src.gpuDepthStencilView.gpuTexture.format].hasStencil) {
            mask |= WebGLConstants.STENCIL_BUFFER_BIT;
        }
    }

    const glFilter = (filter === Filter.LINEAR || filter === Filter.ANISOTROPIC) ? WebGLConstants.LINEAR : WebGLConstants.NEAREST;

    gl.blitFramebuffer(
        srcRect.x,
        srcRect.y,
        srcRect.x + srcRect.width,
        srcRect.y + srcRect.height,
        dstRect.x,
        dstRect.y,
        dstRect.x + dstRect.width,
        dstRect.y + dstRect.height,
        mask,
        glFilter,
    );

    if (rebindFBO) {
        gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, cache.glFramebuffer);
    }
}

export function WebGL2CmdFuncBlitTexture (
    device: WebGL2Device,
    src: Readonly<IWebGL2GPUTexture>,
    dst: IWebGL2GPUTexture,
    regions: Readonly<TextureBlit[]>,
    filter: Filter,
): void {
    const { gl } = device;
    const cache = device.getStateCache();
    const blitManager = device.blitManager;
    if (!blitManager) {
        return;
    }

    // logic different from native, because framebuffer-map is not implemented in webgl2
    const glFilter = (filter === Filter.LINEAR || filter === Filter.ANISOTROPIC) ? WebGLConstants.LINEAR : WebGLConstants.NEAREST;

    const srcFramebuffer = blitManager.srcFramebuffer;
    const dstFramebuffer = blitManager.dstFramebuffer;
    const origReadFBO = cache.glReadFramebuffer;
    const origDrawFBO = cache.glFramebuffer;

    let srcMip = regions[0].srcSubres.mipLevel;
    let dstMip = regions[0].dstSubres.mipLevel;

    const blitInfo = (formatInfo: FormatInfo): { mask: number; attachment: number; } => {
        let mask = 0;
        let attachment: number = WebGLConstants.COLOR_ATTACHMENT0;

        if (formatInfo.hasStencil) {
            attachment = WebGLConstants.DEPTH_STENCIL_ATTACHMENT;
        } else if (formatInfo.hasDepth) {
            attachment = WebGLConstants.DEPTH_ATTACHMENT;
        }

        if (formatInfo.hasDepth || formatInfo.hasStencil) {
            if (formatInfo.hasDepth) {
                mask |= WebGLConstants.DEPTH_BUFFER_BIT;
            }
            if (formatInfo.hasStencil) {
                mask |= WebGLConstants.STENCIL_BUFFER_BIT;
            }
        } else {
            mask |= WebGLConstants.COLOR_BUFFER_BIT;
        }

        return { mask, attachment };
    };

    const regionIndices = regions.map((_, i): number => i);
    regionIndices.sort((a, b): number => regions[a].srcSubres.mipLevel - regions[b].srcSubres.mipLevel);

    const { mask: srcMask, attachment: srcAttachment } = blitInfo(FormatInfos[src.format]);
    const { mask: dstMask, attachment: dstAttachment } = blitInfo(FormatInfos[dst.format]);

    if (cache.glReadFramebuffer !== srcFramebuffer) {
        gl.bindFramebuffer(WebGLConstants.READ_FRAMEBUFFER, srcFramebuffer);
        cache.glReadFramebuffer = srcFramebuffer;
    }

    if (cache.glFramebuffer !== dstFramebuffer) {
        gl.bindFramebuffer(WebGLConstants.DRAW_FRAMEBUFFER, dstFramebuffer);
        cache.glFramebuffer = dstFramebuffer;
    }

    if (src.glTexture) {
        gl.framebufferTexture2D(WebGLConstants.READ_FRAMEBUFFER, srcAttachment, src.glTarget, src.glTexture, srcMip);
    } else {
        gl.framebufferRenderbuffer(WebGLConstants.READ_FRAMEBUFFER, srcAttachment, WebGLConstants.RENDERBUFFER, src.glRenderbuffer);
    }

    if (dst.glTexture) {
        gl.framebufferTexture2D(WebGLConstants.DRAW_FRAMEBUFFER, dstAttachment, dst.glTarget, dst.glTexture, dstMip);
    } else {
        gl.framebufferRenderbuffer(WebGLConstants.DRAW_FRAMEBUFFER, dstAttachment, WebGLConstants.RENDERBUFFER, dst.glRenderbuffer);
    }

    for (let i = 0; i < regionIndices.length; i++) {
        const region = regions[regionIndices[i]];

        if (src.glTexture && srcMip !== region.srcSubres.mipLevel) {
            srcMip = region.srcSubres.mipLevel;
            gl.framebufferTexture2D(WebGLConstants.READ_FRAMEBUFFER, srcAttachment, src.glTarget, src.glTexture, srcMip);
        }

        if (dst.glTexture && dstMip !== region.dstSubres.mipLevel) {
            dstMip = region.dstSubres.mipLevel;
            gl.framebufferTexture2D(WebGLConstants.DRAW_FRAMEBUFFER, dstAttachment, dst.glTarget, dst.glTexture, dstMip);
        }

        gl.blitFramebuffer(
            region.srcOffset.x,
            region.srcOffset.y,
            region.srcOffset.x + region.srcExtent.width,
            region.srcOffset.y + region.srcExtent.height,
            region.dstOffset.x,
            region.dstOffset.y,
            region.dstOffset.x + region.dstExtent.width,
            region.dstOffset.y + region.dstExtent.height,
            srcMask,
            glFilter,
        );
    }

    // restore fbo state
    if (cache.glReadFramebuffer !== origReadFBO) {
        gl.bindFramebuffer(WebGLConstants.READ_FRAMEBUFFER, origReadFBO);
        cache.glReadFramebuffer = origReadFBO;
    }
    if (cache.glFramebuffer !== origDrawFBO) {
        gl.bindFramebuffer(WebGLConstants.DRAW_FRAMEBUFFER, origDrawFBO);
        cache.glFramebuffer = origDrawFBO;
    }
}
