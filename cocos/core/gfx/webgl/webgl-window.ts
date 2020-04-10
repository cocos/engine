import {
    GFXFormat,
    GFXLoadOp,
    GFXStoreOp,
    GFXTextureFlagBit,
    GFXTextureLayout,
    GFXTextureType,
    GFXTextureUsageBit,
    GFXTextureViewType,
} from '../define';
import { GFXTextureView } from '../texture-view';
import { GFXWindow, IGFXWindowInfo } from '../window';

export class WebGLGFXWindow extends GFXWindow {

    protected _initialize (info: IGFXWindowInfo): boolean {

        this._renderPass = this._device.createRenderPass({
            colorAttachments: [{
                format: this._colorFmt,
                loadOp: GFXLoadOp.CLEAR,
                storeOp: GFXStoreOp.STORE,
                sampleCount: 1,
                beginLayout: GFXTextureLayout.COLOR_ATTACHMENT_OPTIMAL,
                endLayout: GFXTextureLayout.COLOR_ATTACHMENT_OPTIMAL,
            }],
            depthStencilAttachment: {
                format : this._depthStencilFmt,
                depthLoadOp : GFXLoadOp.CLEAR,
                depthStoreOp : GFXStoreOp.STORE,
                stencilLoadOp : GFXLoadOp.CLEAR,
                stencilStoreOp : GFXStoreOp.STORE,
                sampleCount : 1,
                beginLayout : GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL,
                endLayout : GFXTextureLayout.DEPTH_STENCIL_ATTACHMENT_OPTIMAL,
            },
        });

        const colorViews: GFXTextureView[] = [];

        if (this._isOffscreen) {
            if (this._colorFmt !== GFXFormat.UNKNOWN) {
                this._colorTex = this._device.createTexture({
                    type : GFXTextureType.TEX2D,
                    usage : GFXTextureUsageBit.COLOR_ATTACHMENT | GFXTextureUsageBit.SAMPLED,
                    format : this._colorFmt,
                    width : this._width,
                    height : this._height,
                    depth : 1,
                    arrayLayer : 1,
                    mipLevel : 1,
                    flags : GFXTextureFlagBit.NONE,
                });
                this._colorTexView = this._device.createTextureView({
                    texture : this._colorTex,
                    type : GFXTextureViewType.TV2D,
                    format : this._colorFmt,
                    baseLevel : 0,
                    levelCount : 1,
                    baseLayer : 0,
                    layerCount : 1,
                });
                colorViews.push(this._colorTexView);
            }

            if (this._depthStencilFmt !== GFXFormat.UNKNOWN) {
                this._depthStencilTex = this._device.createTexture({
                    type : GFXTextureType.TEX2D,
                    usage : GFXTextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
                    format : this._depthStencilFmt,
                    width : this._width,
                    height : this._height,
                    depth : 1,
                    arrayLayer : 1,
                    mipLevel : 1,
                    flags : GFXTextureFlagBit.NONE,
                });

                this._depthStencilTexView = this._device.createTextureView({
                    texture : this._depthStencilTex,
                    type : GFXTextureViewType.TV2D,
                    format : this._depthStencilFmt,
                    baseLevel : 0,
                    levelCount : 1,
                    baseLayer : 0,
                    layerCount : 1,
                });
            }
        }

        this._framebuffer = this._device.createFramebuffer({
            renderPass: this._renderPass,
            colorViews,
            depthStencilView: this._depthStencilTexView,
            isOffscreen: this._isOffscreen,
        });

        return true;
    }

    protected _destroy () {
        if (this._depthStencilTexView) {
            this._depthStencilTexView.destroy();
            this._depthStencilTexView = null;
        }

        if (this._depthStencilTex) {
            this._depthStencilTex.destroy();
            this._depthStencilTex = null;
        }

        if (this._colorTexView) {
            this._colorTexView.destroy();
            this._colorTexView = null;
        }

        if (this._colorTex) {
            this._colorTex.destroy();
            this._colorTex = null;
        }

        if (this._framebuffer) {
            this._framebuffer.destroy();
            this._framebuffer = null;
        }

        if (this._renderPass) {
            this._renderPass.destroy();
            this._renderPass = null;
        }
    }

    protected _resize (width: number, height: number) {
        if (width > this._nativeWidth ||
            height > this._nativeHeight) {

            if (this._depthStencilTex) {
                this._depthStencilTex.resize(width, height);
                this._depthStencilTexView!.destroy();
                this._depthStencilTexView!.initialize({
                    texture : this._depthStencilTex,
                    type : GFXTextureViewType.TV2D,
                    format : this._depthStencilFmt,
                });
            }

            if (this._colorTex) {
                this._colorTex.resize(width, height);
                this._colorTexView!.destroy();
                this._colorTexView!.initialize({
                    texture : this._colorTex,
                    type : GFXTextureViewType.TV2D,
                    format : this._colorFmt,
                });
            }

            if (this._framebuffer && this._framebuffer.isOffscreen) {
                this._framebuffer.destroy();
                this._framebuffer.initialize({
                    renderPass: this._renderPass!,
                    colorViews: [ this._colorTexView! ],
                    depthStencilView: this._depthStencilTexView!,
                });
            }
        }
    }
}
