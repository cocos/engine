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

import { EDITOR } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { warnID, warn, debug } from '../../core/platform/debug';
import { WebGL2StateCache } from './webgl2-state-cache';
import { WebGL2Texture } from './webgl2-texture';
import { Format, TextureInfo, TextureFlagBit, TextureType,
    TextureUsageBit, BufferTextureCopy, SwapchainInfo, SurfaceTransform } from '../base/define';
import { Swapchain } from '../base/swapchain';
import { IWebGL2Extensions, WebGL2DeviceManager } from './webgl2-define';
import { OS } from '../../../pal/system-info/enum-type';
import { IWebGL2BlitManager } from './webgl2-gpu-objects';
import { WebGLConstants } from '../gl-constants';
import { macro } from '../../core/platform/macro';

const eventWebGLContextLost = 'webglcontextlost';

function initStates (gl: WebGL2RenderingContext): void {
    gl.activeTexture(WebGLConstants.TEXTURE0);
    gl.pixelStorei(WebGLConstants.PACK_ALIGNMENT, 1);
    gl.pixelStorei(WebGLConstants.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(WebGLConstants.UNPACK_FLIP_Y_WEBGL, false);

    gl.bindFramebuffer(WebGLConstants.FRAMEBUFFER, null);

    // rasterizer state
    gl.enable(WebGLConstants.SCISSOR_TEST);
    gl.enable(WebGLConstants.CULL_FACE);
    gl.cullFace(WebGLConstants.BACK);
    gl.frontFace(WebGLConstants.CCW);
    gl.polygonOffset(0.0, 0.0);

    // depth stencil state
    gl.enable(WebGLConstants.DEPTH_TEST);
    gl.depthMask(true);
    gl.depthFunc(WebGLConstants.LESS);

    gl.stencilFuncSeparate(WebGLConstants.FRONT, WebGLConstants.ALWAYS, 1, 0xffff);
    gl.stencilOpSeparate(WebGLConstants.FRONT, WebGLConstants.KEEP, WebGLConstants.KEEP, WebGLConstants.KEEP);
    gl.stencilMaskSeparate(WebGLConstants.FRONT, 0xffff);
    gl.stencilFuncSeparate(WebGLConstants.BACK, WebGLConstants.ALWAYS, 1, 0xffff);
    gl.stencilOpSeparate(WebGLConstants.BACK, WebGLConstants.KEEP, WebGLConstants.KEEP, WebGLConstants.KEEP);
    gl.stencilMaskSeparate(WebGLConstants.BACK, 0xffff);

    gl.disable(WebGLConstants.STENCIL_TEST);

    // blend state
    gl.disable(WebGLConstants.SAMPLE_ALPHA_TO_COVERAGE);
    gl.disable(WebGLConstants.BLEND);
    gl.blendEquationSeparate(WebGLConstants.FUNC_ADD, WebGLConstants.FUNC_ADD);
    gl.blendFuncSeparate(WebGLConstants.ONE, WebGLConstants.ZERO, WebGLConstants.ONE, WebGLConstants.ZERO);
    gl.colorMask(true, true, true, true);
    gl.blendColor(0.0, 0.0, 0.0, 0.0);
}

function getExtension (gl: WebGL2RenderingContext, ext: string): any {
    const prefixes = ['', 'WEBKIT_', 'MOZ_'];
    for (let i = 0; i < prefixes.length; ++i) {
        const _ext = gl.getExtension(prefixes[i] + ext);
        if (_ext) {
            return _ext;
        }
    }
    return null;
}

export function getExtensions (gl: WebGL2RenderingContext): IWebGL2Extensions {
    const res: IWebGL2Extensions = {
        EXT_texture_filter_anisotropic: getExtension(gl, 'EXT_texture_filter_anisotropic'),
        EXT_color_buffer_half_float: getExtension(gl, 'EXT_color_buffer_half_float'),
        EXT_color_buffer_float: getExtension(gl, 'EXT_color_buffer_float'),
        WEBGL_compressed_texture_etc1: getExtension(gl, 'WEBGL_compressed_texture_etc1'),
        WEBGL_compressed_texture_etc: getExtension(gl, 'WEBGL_compressed_texture_etc'),
        WEBGL_compressed_texture_pvrtc: getExtension(gl, 'WEBGL_compressed_texture_pvrtc'),
        WEBGL_compressed_texture_astc: getExtension(gl, 'WEBGL_compressed_texture_astc'),
        WEBGL_compressed_texture_s3tc: getExtension(gl, 'WEBGL_compressed_texture_s3tc'),
        WEBGL_compressed_texture_s3tc_srgb: getExtension(gl, 'WEBGL_compressed_texture_s3tc_srgb'),
        WEBGL_debug_shaders: getExtension(gl, 'WEBGL_debug_shaders'),
        WEBGL_lose_context: getExtension(gl, 'WEBGL_lose_context'),
        WEBGL_debug_renderer_info: getExtension(gl, 'WEBGL_debug_renderer_info'),
        OES_texture_half_float_linear: getExtension(gl, 'OES_texture_half_float_linear'),
        OES_texture_float_linear: getExtension(gl, 'OES_texture_float_linear'),
        WEBGL_multi_draw: null,
        useVAO: true,
    };

    // platform-specific extension hacks
    // eslint-disable-next-line no-lone-blocks
    {
        // Mobile implementation seems to have performance issues
        if (systemInfo.os !== OS.ANDROID && systemInfo.os !== OS.IOS) {
            res.WEBGL_multi_draw = getExtension(gl, 'WEBGL_multi_draw');
        }
    }

    return res;
}

export function getContext (canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    let context: WebGL2RenderingContext | null = null;
    try {
        if (globalThis.__globalXR?.webxrCompatible) {
            const glAttribs = {
                alpha: macro.ENABLE_TRANSPARENT_CANVAS,
                antialias: EDITOR || macro.ENABLE_WEBGL_ANTIALIAS,
                depth: true,
                stencil: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: 'default',
                failIfMajorPerformanceCaveat: false,
                xrCompatible: true,
            };
            context = canvas.getContext('webgl2', glAttribs) as WebGL2RenderingContext;
            return context;
        }

        const webGLCtxAttribs: WebGLContextAttributes = {
            alpha: macro.ENABLE_TRANSPARENT_CANVAS,
            antialias: EDITOR || macro.ENABLE_WEBGL_ANTIALIAS,
            depth: true,
            stencil: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
        };

        context = canvas.getContext('webgl2', webGLCtxAttribs);
    } catch (err) {
        return null;
    }

    return context;
}

export class WebGL2Swapchain extends Swapchain {
    constructor () {
        super();
    }

    get extensions (): IWebGL2Extensions {
        return this._extensions as IWebGL2Extensions;
    }

    get blitManager (): IWebGL2BlitManager | null {
        return this._blitManager;
    }

    public stateCache: WebGL2StateCache = new WebGL2StateCache();
    public nullTex2D: WebGL2Texture = null!;
    public nullTexCube: WebGL2Texture = null!;

    private _canvas: HTMLCanvasElement | null = null;
    private _webGL2ContextLostHandler: ((event: Event) => void) | null = null;
    private _extensions: IWebGL2Extensions | null = null;
    private _blitManager: IWebGL2BlitManager | null = null;

    public initialize (info: Readonly<SwapchainInfo>): void {
        this._canvas = info.windowHandle;

        this._webGL2ContextLostHandler = this._onWebGLContextLost.bind(this);
        this._canvas.addEventListener(eventWebGLContextLost, this._onWebGLContextLost);

        const gl = WebGL2DeviceManager.instance.gl;

        this.stateCache.initialize(
            WebGL2DeviceManager.instance.capabilities.maxTextureUnits,
            WebGL2DeviceManager.instance.capabilities.maxUniformBufferBindings,
            WebGL2DeviceManager.instance.capabilities.maxVertexAttributes,
        );

        this._extensions = getExtensions(gl);

        // init states
        initStates(gl);

        const colorFmt = Format.RGBA8;
        let depthStencilFmt = Format.DEPTH_STENCIL;

        const depthBits = gl.getParameter(WebGLConstants.DEPTH_BITS);
        const stencilBits = gl.getParameter(WebGLConstants.STENCIL_BITS);

        if (depthBits && stencilBits) depthStencilFmt = Format.DEPTH_STENCIL;
        else if (depthBits) depthStencilFmt = Format.DEPTH;

        this._colorTexture = new WebGL2Texture();
        this._colorTexture.initAsSwapchainTexture({
            swapchain: this,
            format: colorFmt,
            width: info.width,
            height: info.height,
        });

        this._depthStencilTexture = new WebGL2Texture();
        this._depthStencilTexture.initAsSwapchainTexture({
            swapchain: this,
            format: depthStencilFmt,
            width: info.width,
            height: info.height,
        });

        // create default null texture
        this.nullTex2D = WebGL2DeviceManager.instance.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED,
            Format.RGBA8,
            2,
            2,
            TextureFlagBit.NONE,
        )) as WebGL2Texture;

        this.nullTexCube = WebGL2DeviceManager.instance.createTexture(new TextureInfo(
            TextureType.CUBE,
            TextureUsageBit.SAMPLED,
            Format.RGBA8,
            2,
            2,
            TextureFlagBit.NONE,
            6,
        )) as WebGL2Texture;

        const nullTexRegion = new BufferTextureCopy();
        nullTexRegion.texExtent.width = 2;
        nullTexRegion.texExtent.height = 2;

        const nullTexBuff = new Uint8Array(this.nullTex2D.size);
        nullTexBuff.fill(0);
        WebGL2DeviceManager.instance.copyBuffersToTexture([nullTexBuff], this.nullTex2D, [nullTexRegion]);

        nullTexRegion.texSubres.layerCount = 6;
        WebGL2DeviceManager.instance.copyBuffersToTexture(
            [nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff],
            this.nullTexCube,
            [nullTexRegion],
        );

        this._blitManager = new IWebGL2BlitManager();
    }

    public destroy (): void {
        if (this._canvas && this._webGL2ContextLostHandler) {
            this._canvas.removeEventListener(eventWebGLContextLost, this._webGL2ContextLostHandler);
            this._webGL2ContextLostHandler = null;
        }

        if (this.nullTex2D) {
            this.nullTex2D.destroy();
            this.nullTex2D = null!;
        }

        if (this.nullTexCube) {
            this.nullTexCube.destroy();
            this.nullTexCube = null!;
        }

        if (this._blitManager) {
            this._blitManager.destroy();
            this._blitManager = null;
        }

        this._extensions = null;
        this._canvas = null;
    }

    public resize (width: number, height: number, surfaceTransform: SurfaceTransform): void {
        if (this._colorTexture.width !== width || this._colorTexture.height !== height) {
            debug(`Resizing swapchain: ${width}x${height}`);
            this._canvas!.width = width;
            this._canvas!.height = height;
            this._colorTexture.resize(width, height);
            this._depthStencilTexture.resize(width, height);
        }
    }

    private _onWebGLContextLost (event: Event): void {
        warnID(11000);
        warn(event);
        // 2020.9.3: `preventDefault` is not available on some platforms
        // event.preventDefault();
    }
}
