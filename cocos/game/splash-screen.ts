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
import { Material, MaterialPropertyFull } from '../asset/assets/material';
import { clamp01, Mat4, Vec2, settings, sys, cclegacy, easing, preTransforms, SettingsCategory } from '../core';
import {
    Sampler, SamplerInfo, Shader, Texture, TextureInfo, Device, InputAssembler, InputAssemblerInfo, Attribute, Buffer,
    BufferInfo, Rect, Color, BufferTextureCopy, CommandBuffer, BufferUsageBit, Format,
    MemoryUsageBit, TextureType, TextureUsageBit, Address, Swapchain, Framebuffer,
} from '../gfx';
import { PipelineStateManager } from '../rendering';
import { SetIndex } from '../rendering/define';
import { ccwindow, legacyCC } from '../core/global-exports';
import { XREye } from '../xr/xr-enums';
import { PipelineRuntime } from '../rendering/custom';
import { ResolutionPolicy } from '../ui/view';

const v2_0 = new Vec2();
type SplashLogoType = 'default' | 'none' | 'custom';
type SplashBackgroundType = 'default' | 'color' | 'custom';
type WatermarkLocationType = 'default' | 'topLeft' | 'topRight' | 'topCenter' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

/** @mangle */
interface ISplashSetting {
    policy?: number;
    displayRatio: number;
    totalTime: number;
    watermarkLocation: WatermarkLocationType;
    autoFit: boolean;
    logo?: SplashLogo;
    background?: SplashBackground;
}

/** @mangle */
interface SplashBackground {
    type: SplashBackgroundType;
    color?: Color;
    image?: string;
    base64?: string;
}

/** @mangle */
interface SplashLogo {
    type: SplashLogoType;
    image?: string;
    base64?: string;
}

function setMaterialProperty (mat: Material, key: string, value: MaterialPropertyFull | MaterialPropertyFull[], passIdx?: number): void {
    mat.setProperty(key, value, passIdx);
}

export class SplashScreen {
    private settings!: ISplashSetting;
    private _curTime = 0;

    private device!: Device;
    private swapchain!: Swapchain;
    private shader!: Shader;
    private sampler!: Sampler;
    private cmdBuff!: CommandBuffer;
    private quadAssmebler!: InputAssembler;
    private vertexBuffers!: Buffer;
    private indicesBuffers!: Buffer;
    private renderArea!: Rect;
    private clearColors!: Color[];
    private projection!: Mat4;
    private isMobile = false;

    private bgMat!: Material;
    private bgImage!: HTMLImageElement;
    private bgTexture!: Texture;

    private logoMat!: Material;
    private logoImage!: HTMLImageElement;
    private logoTexture!: Texture;

    private watermarkMat!: Material;
    private watermarkTexture!: Texture;

    // layout
    private bgWidth = 1920;
    private bgHeight = 1080;
    private logoWidthTemp = 140;
    private logoHeightTemp = 200;
    private logoWidth = 0;
    private logoHeight = 0;
    private logoXTrans = 1 / 2;// Percent
    private logoYTrans = 1 / 6 + 2.5 / 6;// Percent

    private textSize = 24; // font size
    private textHeight = 24; // line height
    private textXTrans = 1 / 2;// Percent
    private textYExtraTrans = 32;// px
    private textExpandSize = 4;// px

    private scaleSize = 1;

    public get isFinished (): boolean {
        return this._curTime >= this.settings.totalTime;
    }

    set curTime (val) {
        this._curTime = val;
    }

    get curTime (): number {
        return this._curTime;
    }

    public init (): Promise<void[]> {
        let policy: number = ResolutionPolicy.SHOW_ALL;
        if (!EDITOR) {
            const designResolution = settings.querySettings(SettingsCategory.SCREEN, 'designResolution');
            if (designResolution !== null) {
                policy = designResolution.policy as number;
            }
        }
        this.settings = {
            policy: (policy) ?? ResolutionPolicy.SHOW_ALL,
            displayRatio: settings.querySettings<number>(SettingsCategory.SPLASH_SCREEN, 'displayRatio') ?? 0.4,
            totalTime: settings.querySettings<number>(SettingsCategory.SPLASH_SCREEN, 'totalTime') ?? 3000,
            watermarkLocation: settings.querySettings<WatermarkLocationType>(SettingsCategory.SPLASH_SCREEN, 'watermarkLocation') ?? 'default',
            autoFit: settings.querySettings<boolean>(SettingsCategory.SPLASH_SCREEN, 'autoFit') ?? true,
            logo: settings.querySettings<SplashLogo>(SettingsCategory.SPLASH_SCREEN, 'logo') ?? undefined,
            background: settings.querySettings<SplashBackground>(SettingsCategory.SPLASH_SCREEN, 'background') ?? undefined,
        };
        this._curTime = 0;

        if (EDITOR || this.settings.totalTime <= 0 || this.settings.logo === undefined || this.settings.background === undefined) {
            this.settings.totalTime = 0;
        } else {
            this.device = cclegacy.director.root!.device;
            this.swapchain = cclegacy.director.root!.mainWindow!.swapchain;

            this.preInit();
            this.initLayout();

            if (this.settings.logo.type === 'default') {
                this.initWaterMark();
            }
            let bgPromise = Promise.resolve();
            let logoPromise = Promise.resolve();
            if (this.settings.background.type === 'custom') {
                bgPromise = new Promise<void>((resolve, reject): void => {
                    this.bgImage = new ccwindow.Image();
                    this.bgImage.onload = (): void => {
                        this.initBG();
                        resolve();
                    };
                    this.bgImage.onerror = (): void => {
                        reject();
                    };
                    this.bgImage.src = this.settings.background!.base64!;
                });
            }
            if (this.settings.logo.type !== 'none') {
                logoPromise = new Promise<void>((resolve, reject): void => {
                    this.logoImage = new ccwindow.Image();
                    this.logoImage.onload = (): void => {
                        this.initLogo();
                        resolve();
                    };
                    this.logoImage.onerror = (): void => {
                        reject();
                    };
                    this.logoImage.src = this.settings.logo!.base64!;
                });
            }
            return Promise.all([bgPromise, logoPromise]);
        }
        return Promise.resolve([]);
    }

    private preInit (): void {
        const clearColor = this.settings.background?.color;
        this.clearColors = clearColor ? [new Color(clearColor.x, clearColor.y, clearColor.z, clearColor.w)] : [new Color(0, 0, 0, 1)];
        const { device, swapchain } = this;
        const { capabilities } = device;
        this.renderArea = new Rect(0, 0, swapchain.width, swapchain.height);
        this.cmdBuff = device.commandBuffer;

        // create input assembler
        // create vertex buffer
        const verts = new Float32Array([0.5, 0.5, 1, 0, -0.5, 0.5, 0, 0, 0.5, -0.5, 1, 1, -0.5, -0.5, 0, 1]);
        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;
        this.vertexBuffers = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));
        this.vertexBuffers.update(verts);

        // create index buffer
        const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);
        const ibStride = Uint16Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;
        this.indicesBuffers = device.createBuffer(new BufferInfo(
            BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));
        this.indicesBuffers.update(indices);

        const attributes: Attribute[] = [
            new Attribute('a_position', Format.RG32F),
            new Attribute('a_texCoord', Format.RG32F),
        ];
        const IAInfo = new InputAssemblerInfo(attributes, [this.vertexBuffers], this.indicesBuffers);
        this.quadAssmebler = device.createInputAssembler(IAInfo);

        this.projection = new Mat4();
        Mat4.ortho(
            this.projection,
            -1,
            1,
            -1,
            1,
            -1,
            1,
            capabilities.clipSpaceMinZ,
            capabilities.clipSpaceSignY,
            swapchain.surfaceTransform,
        );

        this.isMobile = sys.isMobile;
    }

    private initLayout (): void {
        if (this.isMobile) {
            this.bgWidth = 812;
            this.bgHeight = 375;

            this.logoWidthTemp = 70;
            this.logoHeightTemp = 100;

            this.textSize = 12; // font size
            this.textHeight = this.textSize + this.textExpandSize; // line height
            this.textXTrans = 1 / 2;// Percent
            this.textYExtraTrans = 16;// px
        } else {
            this.bgWidth = 1920;
            this.bgHeight = 1080;

            this.logoWidthTemp = 140;
            this.logoHeightTemp = 200;

            this.textSize = 24; // font size
            this.textHeight = this.textSize + this.textExpandSize; // line height
            this.textXTrans = 1 / 2;// Percent
            this.textYExtraTrans = 32;// px
        }
        this.logoXTrans = 1 / 2;// Percent
        this.logoYTrans = 1 / 6 + 2.5 / 6;// Percent
        this.initScale();
    }

    private initScale (): void {
        const dw = this.swapchain.width;
        const dh = this.swapchain.height;
        let desiredWidth = this.isMobile ? 375 : 1080;
        let desiredHeight = this.isMobile ? 812 : 1920;
        if (dw > dh) {
            const temp = desiredHeight;
            desiredHeight = desiredWidth;
            desiredWidth = temp;
        }
        if (dw / dh > 16 / 9) {
            this.scaleSize = dh / desiredHeight;
        } else {
            this.scaleSize = dw / desiredWidth;
        }
    }

    public update (deltaTime: number): void {
        const settings = this.settings;
        const { device, swapchain } = this;
        const { capabilities } = device;
        Mat4.ortho(
            this.projection,
            -1,
            1,
            -1,
            1,
            -1,
            1,
            capabilities.clipSpaceMinZ,
            capabilities.clipSpaceSignY,
            swapchain.surfaceTransform,
        );
        const dw = swapchain.width; const dh = swapchain.height;
        this.initScale();

        this._curTime += deltaTime * 1000;
        const percent = clamp01(this._curTime / settings.totalTime);
        const u_p = easing.cubicOut(percent);

        let scaleX = 1;
        let scaleY = 1;
        const bgImage = this.bgImage;
        // update bg uniform
        if (settings.background!.type === 'custom') {
            if (settings.policy === ResolutionPolicy.FIXED_WIDTH) {
                scaleX = dw;
                scaleY = (dw / bgImage.width) * bgImage.height;
            } else if (settings.policy === ResolutionPolicy.FIXED_HEIGHT) {
                scaleX = (dh / bgImage.height) * bgImage.width;
                scaleY = dh;
            } else if (settings.policy === ResolutionPolicy.SHOW_ALL) {
                if ((bgImage.width / this.bgHeight) > (dw / dh)) {
                    scaleX = dw;
                    scaleY = (dw / bgImage.width) * bgImage.height;
                } else {
                    scaleX = (dh / bgImage.height) * bgImage.width;
                    scaleY = dh;
                }
            } else if (settings.policy === ResolutionPolicy.NO_BORDER) {
                if ((bgImage.width / bgImage.height) > (dw / dh)) {
                    scaleX = (dh / bgImage.height) * bgImage.width;
                    scaleY = dh;
                } else {
                    scaleX = dw;
                    scaleY = (dw / bgImage.width) * bgImage.height;
                }
            } else {
                scaleX = dw;
                scaleY = dh;
            }

            const bgMat = this.bgMat;
            setMaterialProperty(bgMat, 'resolution', v2_0.set(dw, dh), 0);
            setMaterialProperty(bgMat, 'scale', v2_0.set(scaleX, scaleY), 0);
            setMaterialProperty(bgMat, 'translate', v2_0.set(dw * 0.5, dh * 0.5), 0);
            setMaterialProperty(bgMat, 'percent', 1.0);
            setMaterialProperty(bgMat, 'u_projection', this.projection);
            bgMat.passes[0].update();
        }
        // update logo uniform
        const logoYTrans = dh * this.logoYTrans;
        if (this.settings.logo!.type !== 'none') {
            // Product design is 0.185 of the height of the screen resolution as the display height of the logo.
            scaleY = dh * 0.185 * settings.displayRatio;
            scaleX = this.logoWidth * (dh * 0.185 / this.logoHeight) * settings.displayRatio;
            const logoMat = this.logoMat;
            setMaterialProperty(logoMat, 'resolution', v2_0.set(dw, dh), 0);
            setMaterialProperty(logoMat, 'scale', v2_0.set(scaleX, scaleY), 0);
            setMaterialProperty(logoMat, 'translate', v2_0.set(dw * this.logoXTrans, logoYTrans), 0);
            setMaterialProperty(logoMat, 'percent', u_p);
            setMaterialProperty(logoMat, 'u_projection', this.projection);
            logoMat.passes[0].update();
        }

        // update watermark uniform
        if (this.settings.logo!.type === 'default' && this.watermarkMat) {
            const watermarkTW = this.watermarkTexture.width; const watermarkTH = this.watermarkTexture.height;
            scaleX = watermarkTW;
            scaleY = watermarkTH;
            const textYTrans = logoYTrans - (this.logoHeight * 0.5 * settings.displayRatio + this.textYExtraTrans)
                * this.scaleSize - watermarkTH * 0.5;
            const watermarkMat = this.watermarkMat;
            setMaterialProperty(watermarkMat, 'resolution', v2_0.set(dw, dh), 0);
            setMaterialProperty(watermarkMat, 'scale', v2_0.set(scaleX, scaleY), 0);
            setMaterialProperty(watermarkMat, 'translate', v2_0.set(dw * this.textXTrans, textYTrans), 0);
            setMaterialProperty(watermarkMat, 'percent', u_p);
            setMaterialProperty(watermarkMat, 'u_projection', this.projection);
            watermarkMat.passes[0].update();
        }
        this.frame();
    }

    private initBG (): void {
        const device = this.device;

        this.bgMat = new Material();
        this.bgMat.initialize({ effectName: 'util/splash-screen' });

        const samplerInfo = new SamplerInfo();
        samplerInfo.addressU = Address.CLAMP;
        samplerInfo.addressV = Address.CLAMP;
        samplerInfo.addressW = Address.CLAMP;
        this.sampler = device.getSampler(samplerInfo);

        this.bgTexture = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_DST,
            Format.RGBA8,
            this.bgImage.width,
            this.bgImage.height,
        ));

        const pass = this.bgMat.passes[0];
        const binding = pass.getBinding('mainTexture');
        pass.bindTexture(binding, this.bgTexture);
        this.shader = pass.getShaderVariant()!;
        const descriptorSet = pass.descriptorSet;
        descriptorSet.bindSampler(binding, this.sampler);
        descriptorSet.update();
        const region = new BufferTextureCopy();
        const regionTexExtent = region.texExtent;
        regionTexExtent.width = this.bgImage.width;
        regionTexExtent.height = this.bgImage.height;
        regionTexExtent.depth = 1;
        device.copyTexImagesToTexture([this.bgImage], this.bgTexture, [region]);
    }

    private initLogo (): void {
        const device = this.device;

        this.logoMat = new Material();
        this.logoMat.initialize({ effectName: 'util/splash-screen' });

        const samplerInfo = new SamplerInfo();
        samplerInfo.addressU = Address.CLAMP;
        samplerInfo.addressV = Address.CLAMP;
        samplerInfo.addressW = Address.CLAMP;
        this.sampler = device.getSampler(samplerInfo);

        this.logoTexture = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_DST,
            Format.RGBA8,
            this.logoImage.width,
            this.logoImage.height,
        ));

        const pass = this.logoMat.passes[0];
        const binding = pass.getBinding('mainTexture');
        pass.bindTexture(binding, this.logoTexture);
        this.shader = pass.getShaderVariant()!;
        const descriptorSet = pass.descriptorSet;
        descriptorSet.bindSampler(binding, this.sampler);
        descriptorSet.update();
        const region = new BufferTextureCopy();
        const regionTexExtent = region.texExtent;
        regionTexExtent.width = this.logoImage.width;
        regionTexExtent.height = this.logoImage.height;
        regionTexExtent.depth = 1;
        device.copyTexImagesToTexture([this.logoImage], this.logoTexture, [region]);

        const logoRatio = this.logoImage.width / this.logoImage.height;
        if (logoRatio < 1) {
            this.logoWidth = this.logoWidthTemp;
            this.logoHeight = this.logoWidthTemp / logoRatio;
        } else {
            this.logoWidth = this.logoHeightTemp * logoRatio;
            this.logoHeight = this.logoHeightTemp;
        }
    }

    private initWaterMark (): void {
        // create texture from image
        const watermarkImg = ccwindow.document.createElement('canvas');
        watermarkImg.height = this.textHeight * this.scaleSize;
        watermarkImg.style.width = `${watermarkImg.width}`;
        watermarkImg.style.height = `${watermarkImg.height}`;

        const text = 'Created with Cocos';
        const ctx = watermarkImg.getContext('2d')!;
        ctx.font = `${this.textSize * this.scaleSize}px Arial`; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillStyle = '#707070';
        const textLength = ctx.measureText(text).width + 10;
        watermarkImg.width = textLength; // Tips: Set canvas width will clean context style
        ctx.font = `${this.textSize * this.scaleSize}px Arial`; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillStyle = '#707070';
        ctx.fillText(text, watermarkImg.width / 2, 0);
        const region = new BufferTextureCopy();
        const regionTexExtent = region.texExtent;
        regionTexExtent.width = watermarkImg.width;
        regionTexExtent.height = watermarkImg.height;
        regionTexExtent.depth = 1;
        this.watermarkTexture = this.device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_DST,
            Format.RGBA8,
            watermarkImg.width,
            watermarkImg.height,
        ));
        this.device.copyTexImagesToTexture([watermarkImg], this.watermarkTexture, [region]);
        // create material
        this.watermarkMat = new Material();
        this.watermarkMat.initialize({ effectName: 'util/splash-screen' });
        const pass = this.watermarkMat.passes[0];
        const binding = pass.getBinding('mainTexture');
        pass.bindTexture(binding, this.watermarkTexture);
        pass.descriptorSet.update();
    }

    private frame (): void {
        const { device, swapchain, projection, bgMat, logoMat, watermarkMat, settings, quadAssmebler } = this;
        const { capabilities } = device;

        if (!sys.isXR || xr.entry.isRenderAllowable()) {
            const renderSize = sys.isXR ? 2 : 1;
            for (let xrEye = 0; xrEye < renderSize; xrEye++) {
                if (sys.isXR) {
                    xr.entry.renderLoopStart(xrEye);
                    const xrFov = xr.entry.getEyeFov(xrEye);
                    // device's fov may be asymmetry
                    let radioLeft = 1.0;
                    let radioRight = 1.0;
                    if (xrEye === XREye.LEFT as number) {
                        radioLeft = Math.abs(Math.tan(xrFov[0] as number)) / Math.abs(Math.tan(xrFov[1] as number));
                    } else if (xrEye === XREye.RIGHT as number) {
                        radioRight = Math.abs(Math.tan(xrFov[1] as number)) / Math.abs(Math.tan(xrFov[0] as number));
                    }

                    Mat4.ortho(
                        projection,
                        -radioLeft,
                        radioRight,
                        -1,
                        1,
                        -1,
                        1,
                        capabilities.clipSpaceMinZ,
                        capabilities.clipSpaceSignY,
                        swapchain.surfaceTransform,
                    );
                    // keep scale to [-1, 1] only use offset
                    projection.m00 = preTransforms[swapchain.surfaceTransform][0];
                    projection.m05 = preTransforms[swapchain.surfaceTransform][3] * capabilities.clipSpaceSignY;
                    if (settings.background!.type === 'custom') {
                        setMaterialProperty(bgMat, 'u_projection', projection);
                        bgMat.passes[0].update();
                    }
                    if (settings.logo!.type !== 'none') {
                        setMaterialProperty(logoMat, 'u_projection', projection);
                        logoMat.passes[0].update();
                    }
                    if (settings.logo!.type === 'default' && watermarkMat) {
                        setMaterialProperty(watermarkMat, 'u_projection', projection);
                        watermarkMat.passes[0].update();
                    }
                }

                // for legacy pipeline
                device.enableAutoBarrier(true);

                device.acquire([swapchain]);
                // record command
                const cmdBuff = this.cmdBuff;
                const framebuffer = cclegacy.director.root!.mainWindow!.framebuffer as Framebuffer;
                const renderArea = this.renderArea;

                renderArea.width = swapchain.width;
                renderArea.height = swapchain.height;

                cmdBuff.begin();
                cmdBuff.beginRenderPass(framebuffer.renderPass, framebuffer, renderArea, this.clearColors, 1.0, 0);
                const pipeline = cclegacy.director.root.pipeline as PipelineRuntime;
                if (settings.background!.type === 'custom') {
                    const bgPass = bgMat.passes[0];
                    const bgPso = PipelineStateManager.getOrCreatePipelineState(
                        device,
                        bgPass,
                        this.shader,
                        framebuffer.renderPass,
                        quadAssmebler,
                    );

                    cmdBuff.bindPipelineState(bgPso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, bgPass.descriptorSet);
                    cmdBuff.bindInputAssembler(quadAssmebler);
                    cmdBuff.draw(quadAssmebler);
                }

                if (settings.logo!.type !== 'none') {
                    const logoPass = logoMat.passes[0];
                    const logoPso = PipelineStateManager.getOrCreatePipelineState(
                        device,
                        logoPass,
                        this.shader,
                        framebuffer.renderPass,
                        quadAssmebler,
                    );

                    cmdBuff.bindPipelineState(logoPso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, logoPass.descriptorSet);
                    cmdBuff.bindInputAssembler(quadAssmebler);
                    cmdBuff.draw(quadAssmebler);
                }

                if (settings.logo!.type === 'default' && watermarkMat) {
                    const wartermarkPass = this.watermarkMat.passes[0];
                    const watermarkPso = PipelineStateManager.getOrCreatePipelineState(
                        device,
                        wartermarkPass,
                        this.shader,
                        framebuffer.renderPass,
                        quadAssmebler,
                    );

                    cmdBuff.bindPipelineState(watermarkPso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, wartermarkPass.descriptorSet);
                    cmdBuff.bindInputAssembler(quadAssmebler);
                    cmdBuff.draw(quadAssmebler);
                }

                cmdBuff.endRenderPass();
                cmdBuff.end();
                device.flushCommands([cmdBuff]);
                device.queue.submit([cmdBuff]);
                device.present();
                device.enableAutoBarrier(!legacyCC.rendering);

                if (sys.isXR) {
                    xr.entry.renderLoopEnd(xrEye);
                }
            }
        }
    }

    private destroy (): void {
        this.device = null!;
        this.swapchain = null!;
        this.clearColors = null!;

        if (this.bgImage) {
            if ((this.bgImage as any).destroy) (this.bgImage as any).destroy();
            this.bgImage = null!;
        }

        if (this.bgMat) {
            this.bgMat.destroy();
            this.bgMat = null!;
        }

        if (this.bgTexture) {
            this.bgTexture.destroy();
            this.bgTexture = null!;
        }

        if (this.logoImage) {
            if ((this.logoImage as any).destroy) (this.logoImage as any).destroy();
            this.logoImage = null!;
        }

        if (this.logoMat) {
            this.logoMat.destroy();
            this.logoMat = null!;
        }

        if (this.logoTexture) {
            this.logoTexture.destroy();
            this.logoTexture = null!;
        }

        this.renderArea = null!;
        this.cmdBuff = null!;
        this.shader = null!;

        if (this.quadAssmebler) {
            this.quadAssmebler.destroy();
            this.quadAssmebler = null!;
        }

        if (this.vertexBuffers) {
            this.vertexBuffers.destroy();
            this.vertexBuffers = null!;
        }

        if (this.indicesBuffers) {
            this.indicesBuffers.destroy();
            this.indicesBuffers = null!;
        }
        this.sampler = null!;

        /** text */
        if (this.watermarkMat) {
            this.watermarkMat.destroy();
            this.watermarkMat = null!;
        }

        if (this.watermarkTexture) {
            this.watermarkTexture.destroy();
            this.watermarkTexture = null!;
        }

        this.settings = null!;
    }

    private static _ins: SplashScreen | null = null;

    public static get instance (): SplashScreen | null {
        return SplashScreen._ins;
    }

    public static createInstance (): SplashScreen {
        SplashScreen._ins = new SplashScreen();
        return SplashScreen._ins;
    }

    public static releaseInstance (): void {
        if (SplashScreen._ins) {
            SplashScreen._ins.destroy();
            SplashScreen._ins = null;
        }
    }

    // eslint-disable-next-line no-empty-function
    private constructor () {}
}

cclegacy.internal.SplashScreen = SplashScreen;
