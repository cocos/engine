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

import { WebGLDevice } from './webgl-device';

// Extensions
export enum WebGLEXT {
    RGBA16F_EXT = 0x881A,
    RGB16F_EXT = 0x881B,
    RGBA32F_EXT = 0x8814,
    FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT = 0x8211,
    UNSIGNED_NORMALIZED_EXT = 0x8C17,
    UNSIGNED_INT_24_8_WEBGL = 0x84FA,
    HALF_FLOAT_OES = 0x8D61,

    SRGB_EXT = 0x8C40,
    SRGB_ALPHA_EXT = 0x8C42,
    SRGB8_ALPHA8_EXT = 0x8C43,

    COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0,
    COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1,
    COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2,
    COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3,

    COMPRESSED_SRGB_S3TC_DXT1_EXT = 0x8C4C,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = 0x8C4D,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT = 0x8C4E,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = 0x8C4F,

    COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00,
    COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01,
    COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02,
    COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03,

    COMPRESSED_RGB_ETC1_WEBGL = 0x8D64,

    COMPRESSED_R11_EAC = 0x9270,
    COMPRESSED_SIGNED_R11_EAC = 0x9271,
    COMPRESSED_RG11_EAC = 0x9272,
    COMPRESSED_SIGNED_RG11_EAC = 0x9273,
    COMPRESSED_RGB8_ETC2 = 0x9274,
    COMPRESSED_SRGB8_ETC2 = 0x9275,
    COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9276,
    COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9277,
    COMPRESSED_RGBA8_ETC2_EAC = 0x9278,
    COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = 0x9279,

    COMPRESSED_RGBA_ASTC_4x4_KHR = 0x93B0,
    COMPRESSED_RGBA_ASTC_5x4_KHR = 0x93B1,
    COMPRESSED_RGBA_ASTC_5x5_KHR = 0x93B2,
    COMPRESSED_RGBA_ASTC_6x5_KHR = 0x93B3,
    COMPRESSED_RGBA_ASTC_6x6_KHR = 0x93B4,
    COMPRESSED_RGBA_ASTC_8x5_KHR = 0x93B5,
    COMPRESSED_RGBA_ASTC_8x6_KHR = 0x93B6,
    COMPRESSED_RGBA_ASTC_8x8_KHR = 0x93B7,
    COMPRESSED_RGBA_ASTC_10x5_KHR = 0x93B8,
    COMPRESSED_RGBA_ASTC_10x6_KHR = 0x93B9,
    COMPRESSED_RGBA_ASTC_10x8_KHR = 0x93BA,
    COMPRESSED_RGBA_ASTC_10x10_KHR = 0x93BB,
    COMPRESSED_RGBA_ASTC_12x10_KHR = 0x93BC,
    COMPRESSED_RGBA_ASTC_12x12_KHR = 0x93BD,

    COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR = 0x93D0,
    COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR = 0x93D1,
    COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR = 0x93D2,
    COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR = 0x93D3,
    COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR = 0x93D4,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR = 0x93D5,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR = 0x93D6,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR = 0x93D7,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR = 0x93D8,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR = 0x93D9,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR = 0x93DA,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR = 0x93DB,
    COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR = 0x93DC,
    COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR = 0x93DD,
}

export interface IWebGLExtensions {
    EXT_texture_filter_anisotropic: EXT_texture_filter_anisotropic | null;
    EXT_blend_minmax: EXT_blend_minmax | null;
    EXT_frag_depth: EXT_frag_depth | null;
    EXT_shader_texture_lod: EXT_shader_texture_lod | null;
    EXT_sRGB: EXT_sRGB | null;
    OES_vertex_array_object: OES_vertex_array_object | null;
    EXT_color_buffer_half_float: EXT_color_buffer_half_float | null;
    WEBGL_multi_draw: WEBGL_multi_draw | null;
    WEBGL_color_buffer_float: WEBGL_color_buffer_float | null;
    WEBGL_compressed_texture_etc1: WEBGL_compressed_texture_etc1 | null;
    WEBGL_compressed_texture_etc: WEBGL_compressed_texture_etc | null;
    WEBGL_compressed_texture_pvrtc: WEBGL_compressed_texture_pvrtc | null;
    WEBGL_compressed_texture_astc: WEBGL_compressed_texture_astc | null;
    WEBGL_compressed_texture_s3tc: WEBGL_compressed_texture_s3tc | null;
    WEBGL_compressed_texture_s3tc_srgb: WEBGL_compressed_texture_s3tc_srgb | null;
    WEBGL_debug_shaders: WEBGL_debug_shaders | null;
    WEBGL_draw_buffers: WEBGL_draw_buffers | null;
    WEBGL_lose_context: WEBGL_lose_context | null;
    WEBGL_depth_texture: WEBGL_depth_texture | null;
    WEBGL_debug_renderer_info: WEBGL_debug_renderer_info | null;
    OES_texture_half_float: OES_texture_half_float | null;
    OES_texture_half_float_linear: OES_texture_half_float_linear | null;
    OES_texture_float: OES_texture_float | null;
    OES_texture_float_linear: OES_texture_float_linear | null;
    OES_standard_derivatives: OES_standard_derivatives | null;
    OES_element_index_uint: OES_element_index_uint | null;
    ANGLE_instanced_arrays: ANGLE_instanced_arrays | null;
    destroyShadersImmediately: boolean;
    noCompressedTexSubImage2D: boolean;
    isLocationActive: (glLoc: unknown) => glLoc is WebGLUniformLocation;
    useVAO: boolean;
}

// put the global instance here so that we won't have circular dependencies
export class WebGLDeviceManager {
    static get instance (): WebGLDevice {
        return WebGLDeviceManager._instance!;
    }
    static setInstance (instance: WebGLDevice): void {
        WebGLDeviceManager._instance = instance;
    }
    private static _instance: WebGLDevice | null = null;
}
