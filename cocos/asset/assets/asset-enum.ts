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

import { Address, Filter, Format } from '../../gfx';

// define a specified number for the pixel format which gfx do not have a standard definition.
enum CustomPixelFormat {
    VALUE = 1024,
}

/**
 * @en
 * The texture pixel format, default value is RGBA8888,<br>
 * you should note that textures loaded by normal image files (png, jpg) can only support RGBA8888 format,<br>
 * other formats are supported by compressed file types or raw data.
 * @zh
 * 纹理像素格式，默认值为RGBA8888，<br>
 * 你应该注意到普通图像文件（png，jpg）加载的纹理只能支持RGBA8888格式，<br>
 * 压缩文件类型或原始数据支持其他格式。
 */
export enum PixelFormat {
    /**
     * @en
     * 16-bit pixel format containing red, green and blue channels
     * @zh
     * 包含 RGB 通道的 16 位纹理。
     */
    RGB565 = Format.R5G6B5,
    /**
     * @en
     * 16-bit pixel format containing red, green, blue channels with 5 bits per channel and one bit alpha channel: RGB5A1
     * @zh
     * 包含 RGB（分别占 5 bits）和 1 bit 的 alpha 通道的 16 位纹理：RGB5A1。
     */
    RGB5A1 = Format.RGB5A1,
    /**
     * @en
     * 16-bit pixel format containing red, green, blue and alpha channels: RGBA4444
     * @zh
     * 包含 RGBA 通道的 16 位纹理：RGBA4444。
     */
    RGBA4444 = Format.RGBA4,
    /**
     * @en
     * 24-bit pixel format containing red, green and blue channels: RGB888
     * @zh
     * 包含 RGB 通道的 24 位纹理：RGB888。
     */
    RGB888 = Format.RGB8,
    /**
     * @en
     * 32-bit float pixel format containing red, green and blue channels: RGBA32F
     * @zh
     * 包含 RGB 通道的 32 位浮点数像素格式：RGBA32F。
     */
    RGB32F = Format.RGB32F,
    /**
     * @en
     * 32-bit pixel format containing red, green, blue and alpha channels: RGBA8888
     * @zh
     * 包含 RGBA 四通道的 32 位整形像素格式：RGBA8888。
     */
    RGBA8888 = Format.RGBA8,
    /**
     * @en
     * 32-bit pixel format containing blue, green, red, and alpha channels: BGRA8888
     * @zh
     * 包含 BGRA 四通道的 32 位整形像素格式：BGRA8888。
     */
    BGRA8888 = Format.BGRA8,
    /**
     * @en
     * 32-bit float pixel format containing red, green, blue and alpha channels: RGBA32F
     * @zh
     * 32位浮点数像素格式：RGBA32F。
     */
    RGBA32F = Format.RGBA32F,
    /**
     * @en
     * 8-bit pixel format used as masks
     * @zh
     * 用作蒙版的8位纹理。
     */
    A8 = Format.A8,
    /**
     * @en
     * 8-bit intensity pixel format
     * @zh
     * 8位强度纹理。
     */
    I8 = Format.L8,
    /**
     * @en
     * 16-bit pixel format used as masks
     * @zh
     * 用作蒙版的16位纹理。
     */
    AI8 = Format.LA8,
    /**
     * @en A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
     * @zh 包含 RGB 通道的 PVR 2BPP 压缩纹理格式
     */
    RGB_PVRTC_2BPPV1 = Format.PVRTC_RGB2,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
     * @zh 包含 RGBA 通道的 PVR 2BPP 压缩纹理格式
     */
    RGBA_PVRTC_2BPPV1 = Format.PVRTC_RGBA2,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
     * RGB_A_PVRTC_2BPPV1 texture is a 2x height RGB_PVRTC_2BPPV1 format texture.
     * It separate the origin alpha channel to the bottom half atlas, the origin rgb channel to the top half atlas.
     * @zh 包含 RGBA 通道的 PVR 2BPP 压缩纹理格式
     * 这种压缩纹理格式贴图的高度是普通 RGB_PVRTC_2BPPV1 贴图高度的两倍，使用上半部分作为原始 RGB 通道数据，下半部分用来存储透明通道数据。
     */
    RGB_A_PVRTC_2BPPV1 = CustomPixelFormat.VALUE,
    /**
     * @en A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
     * @zh 包含 RGB 通道的 PVR 4BPP 压缩纹理格式
     */
    RGB_PVRTC_4BPPV1 = Format.PVRTC_RGB4,
    /**
     * @en A pixel format containing red, green, blue and alpha channels that is PVR 4bpp compressed.
     * @zh 包含 RGBA 通道的 PVR 4BPP 压缩纹理格式
     */
    RGBA_PVRTC_4BPPV1 = Format.PVRTC_RGBA4,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
     * RGB_A_PVRTC_4BPPV1 texture is a 2x height RGB_PVRTC_4BPPV1 format texture.
     * It separate the origin alpha channel to the bottom half atlas, the origin rgb channel to the top half atlas.
     * @zh 包含 RGBA 通道的 PVR 4BPP 压缩纹理格式
    * 这种压缩纹理格式贴图的高度是普通 RGB_PVRTC_4BPPV1 贴图高度的两倍，使用上半部分作为原始 RGB 通道数据，下半部分用来存储透明通道数据。
     */
    RGB_A_PVRTC_4BPPV1 = CustomPixelFormat.VALUE + 1,
    /**
     * @en A pixel format containing red, green, and blue channels that is ETC1 compressed.
     * @zh 包含 RGB 通道的 ETC1 压缩纹理格式
     */
    RGB_ETC1 = Format.ETC_RGB8,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ETC1 compressed.
     * @zh 包含 RGBA 通道的 ETC1 压缩纹理格式
     */
    RGBA_ETC1 = CustomPixelFormat.VALUE + 2,
    /**
     * @en A pixel format containing red, green, and blue channels that is ETC2 compressed.
     * @zh 包含 RGB 通道的 ETC2 压缩纹理格式
     */
    RGB_ETC2 = Format.ETC2_RGB8,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ETC2 compressed.
     * @zh 包含 RGBA 通道的 ETC2 压缩纹理格式
     */
    RGBA_ETC2 = Format.ETC2_RGBA8,

    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 4x4 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 4x4
     */
    RGBA_ASTC_4x4 = Format.ASTC_RGBA_4X4,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 5x4 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 5x4
     */
    RGBA_ASTC_5x4 = Format.ASTC_RGBA_5X4,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 5x5 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 5x5
     */
    RGBA_ASTC_5x5 = Format.ASTC_RGBA_5X5,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 6x5 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 6x5
     */
    RGBA_ASTC_6x5 = Format.ASTC_RGBA_6X5,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 6x6 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 6x6
     */
    RGBA_ASTC_6x6 = Format.ASTC_RGBA_6X6,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x5 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x5
     */
    RGBA_ASTC_8x5 = Format.ASTC_RGBA_8X5,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x6 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x6
     */
    RGBA_ASTC_8x6 = Format.ASTC_RGBA_8X6,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 8x8 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 8x8
     */
    RGBA_ASTC_8x8 = Format.ASTC_RGBA_8X8,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x5 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x5
     */
    RGBA_ASTC_10x5 = Format.ASTC_RGBA_10X5,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x6 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x6
     */
    RGBA_ASTC_10x6 = Format.ASTC_RGBA_10X6,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x8 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x8
     */
    RGBA_ASTC_10x8 = Format.ASTC_RGBA_10X8,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 10x10 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 10x10
     */
    RGBA_ASTC_10x10 = Format.ASTC_RGBA_10X10,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 12x10 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 12x10
     */
    RGBA_ASTC_12x10 = Format.ASTC_RGBA_12X10,
    /**
     * @en A pixel format containing red, green, blue, and alpha channels that is ASTC compressed with 12x12 block size.
     * @zh 包含 RGBA 通道的 ASTC 压缩纹理格式，压缩分块大小为 12x12
     */
    RGBA_ASTC_12x12 = Format.ASTC_RGBA_12X12,
}

/**
 * @en
 * The texture wrap mode.
 * @zh
 * 纹理环绕方式。
 */
export enum WrapMode {
    /**
     * @en
     * Specifies that the repeat warp mode will be used.
     * @zh
     * 指定环绕模式：重复纹理图像。
     */
    REPEAT = Address.WRAP,
    /**
     * @en
     * Specifies that the clamp to edge warp mode will be used.
     * @zh
     * 指定环绕模式：纹理边缘拉伸效果。
     */
    CLAMP_TO_EDGE = Address.CLAMP,
    /**
     * @en
     * Specifies that the mirrored repeat warp mode will be used.
     * @zh
     * 指定环绕模式：以镜像模式重复纹理图像。
     */
    MIRRORED_REPEAT = Address.MIRROR,
    /**
     * @en
     * Specifies that the  clamp to border wrap mode will be used.
     * @zh
     * 指定环绕模式：超出纹理坐标部分以用户指定颜色填充。
     */
    CLAMP_TO_BORDER = Address.BORDER,
}

/**
 * @en
 * The texture filter mode
 * @zh
 * 纹理过滤模式。
 */
export enum TextureFilter {
    NONE = Filter.NONE,
    /**
     * @en
     * Specifies linear filtering.
     * @zh
     * 线性过滤模式。
     */
    LINEAR = Filter.LINEAR,
    /**
     * @en
     * Specifies nearest filtering.
     * @zh
     * 临近过滤模式。
     */
    NEAREST = Filter.POINT,
}

export { TextureFilter as Filter };
