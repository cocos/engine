/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { CCFloat, CCInteger, _decorator, Vec3, random } from '../../core';
import { ParticleNoise } from '../noise';
import { Particle, PARTICLE_MODULE_NAME, ParticleModuleBase } from '../particle';
import type { ParticleSystem } from '../particle-system';

const { ccclass, serializable, displayOrder, type, range, slide, visible } = _decorator;

/**
 * @en
 * Adding noise to your particles is a simple and effective way to create interesting patterns and effects.
 * @zh
 * 为粒子添加噪声是创建有趣方案和效果的简单有效方法。
 */
@ccclass('cc.NoiseModule')
export class NoiseModule extends ParticleModuleBase {
    constructor () {
        super();
    }
    @serializable
    _enable = false;
    /**
     * @en Enable this module or not.
     * @zh 是否启用。
     */
    @displayOrder(0)
    public get enable (): boolean {
        return this._enable;
    }

    public set enable (val) {
        if (this._enable === val) return;
        this._enable = val;
        if (!this.target) return;
        this.target.enableModule(this.name, val, this);
    }

    /**
     * @en Strength on X axis.
     * @zh X 轴上的强度大小。
     */
    @type(CCFloat)
    @range([0, 100])
    @displayOrder(16)
    @slide
    get strengthX (): number {
        return this._strengthX;
    }
    set strengthX (value: number) {
        this._strengthX = value;
    }
    @serializable
    private _strengthX = 10;

    /**
     * @en Strength on Y axis.
     * @zh Y 轴上的强度大小。
     */
    @type(CCFloat)
    @range([0, 100])
    @displayOrder(16)
    @slide
    get strengthY (): number {
        return this._strengthY;
    }
    set strengthY (value: number) {
        this._strengthY = value;
    }
    @serializable
    private _strengthY = 10;

    /**
     * @en Strength on Z axis.
     * @zh Z 轴上的强度大小。
     */
    @type(CCFloat)
    @range([0, 100])
    @displayOrder(16)
    @slide
    get strengthZ (): number {
        return this._strengthZ;
    }
    set strengthZ (value: number) {
        this._strengthZ = value;
    }
    @serializable
    private _strengthZ = 10;

    /**
     * @en Noise texture roll speed on X axis.
     * @zh X 轴上的噪声图滚动速度。
     */
    @type(CCFloat)
    @range([0, 100])
    @slide
    @displayOrder(16)
    get noiseSpeedX (): number {
        return this._noiseSpeedX;
    }
    set noiseSpeedX (value: number) {
        this._noiseSpeedX = value;
    }
    @serializable
    private _noiseSpeedX = 0;

    /**
     * @en Noise texture roll speed on Y axis.
     * @zh Y 轴上的噪声图滚动速度。
     */
    @type(CCFloat)
    @range([0, 100])
    @displayOrder(16)
    @slide
    get noiseSpeedY (): number {
        return this._noiseSpeedY;
    }
    set noiseSpeedY (value: number) {
        this._noiseSpeedY = value;
    }
    @serializable
    private _noiseSpeedY = 0;

    /**
     * @en Noise texture roll speed on Z axis.
     * @zh Z 轴上的噪声图滚动速度。
     */
    @type(CCFloat)
    @range([0, 100])
    @displayOrder(16)
    @slide
    get noiseSpeedZ (): number {
        return this._noiseSpeedZ;
    }
    set noiseSpeedZ (value: number) {
        this._noiseSpeedZ = value;
    }
    @serializable
    private _noiseSpeedZ = 0;

    /**
     * @en Noise frequency.
     * @zh 噪声图频率。
     */
    @type(CCFloat)
    @range([0, 100, 0.1])
    @displayOrder(16)
    @slide
    get noiseFrequency (): number {
        return this._noiseFrequency;
    }
    set noiseFrequency (value: number) {
        this._noiseFrequency = value;
    }
    @serializable
    private _noiseFrequency = 1;

    /**
     * @en Remap the final noise X axis values into a different range.
     * @zh 噪声值映射到 X 轴的不同范围。
     */
    @visible(false)
    @type(CCFloat)
    @range([0, 1, 0.1])
    @displayOrder(16)
    @slide
    get remapX (): number {
        return this._remapX;
    }
    set remapX (value: number) {
        this._remapX = value;
    }
    @serializable
    private _remapX = 0;

    /**
     * @en Remap the final noise Y axis values into a different range.
     * @zh 噪声值映射到 Y 轴的不同范围。
     */
    @visible(false)
    @type(CCFloat)
    @range([0, 1, 0.1])
    @displayOrder(16)
    @slide
    get remapY (): number {
        return this._remapY;
    }
    set remapY (value: number) {
        this._remapY = value;
    }
    @serializable
    private _remapY = 0;

    /**
     * @en Remap the final noise Z axis values into a different range.
     * @zh 噪声值映射到 Z 轴的不同范围。
     */
    @visible(false)
    @type(CCFloat)
    @range([0, 1, 0.1])
    @displayOrder(16)
    @slide
    get remapZ (): number {
        return this._remapZ;
    }
    set remapZ (value: number) {
        this._remapZ = value;
    }
    @serializable
    private _remapZ = 0;

    /**
     * @en Specify how many layers of overlapping noise are combined to produce the final noise values.
     * @zh 指定组合多少层重叠噪声来产生最终噪声值。
     */
    @type(CCInteger)
    @range([1, 4, 1])
    @displayOrder(16)
    @slide
    get octaves (): number {
        return this._octaves;
    }
    set octaves (value: number) {
        this._octaves = value;
    }
    @serializable
    private _octaves = 1;

    /**
     * @en For each additional noise layer, reduce the strength by this proportion.
     * @zh 对于每个附加的噪声层，按此比例降低强度。
     */
    // eslint-disable-next-line func-names
    @visible(function (this: NoiseModule) { return this._octaves > 1; })
    @type(CCFloat)
    @range([0, 1, 0.1])
    @displayOrder(16)
    get octaveMultiplier (): number {
        return this._octaveMultiplier;
    }
    set octaveMultiplier (value: number) {
        this._octaveMultiplier = value;
    }
    @serializable
    private _octaveMultiplier = 0.5;

    /**
     * @en For each additional noise layer, adjust the frequency by this multiplier.
     * @zh 对于每个附加的噪声层，按此乘数调整频率。
     */
    // eslint-disable-next-line func-names
    @visible(function (this: NoiseModule) { return this._octaves > 1; })
    @type(CCFloat)
    @range([1, 4, 0.1])
    @displayOrder(16)
    get octaveScale (): number {
        return this._octaveScale;
    }
    set octaveScale (value: number) {
        this._octaveScale = value;
    }
    @serializable
    private _octaveScale = 2;

    public name = PARTICLE_MODULE_NAME.NOISE;

    private noise: ParticleNoise = new ParticleNoise();

    private samplePosition: Vec3 = new Vec3();

    /**
     * @en Apply noise effect to particle.
     * @zh 作用噪声效果到粒子上。
     * @param particle @en Particle to animate @zh 模块需要更新的粒子
     * @param dt @en Update interval time @zh 粒子系统更新的间隔时间
     * @internal
     */
    public animate (particle: Particle, dt: number): void {
        this.noise.setTime(particle.particleSystem.time);
        this.noise.setSpeed(this.noiseSpeedX, this.noiseSpeedY, this.noiseSpeedZ);
        this.noise.setFrequency(this.noiseFrequency);
        this.noise.setAbs(this.remapX, this.remapY, this.remapZ);
        this.noise.setAmplititude(this.strengthX, this.strengthY, this.strengthZ);
        this.noise.setOctaves(this.octaves, this.octaveMultiplier, this.octaveScale);

        this.samplePosition.set(particle.position);
        this.samplePosition.add3f(random() * 1.0, random() * 1.0, random() * 1.0);
        this.noise.setSamplePoint(this.samplePosition);
        this.noise.getNoiseParticle();

        const noisePosition: Vec3 = this.noise.getResult();
        noisePosition.multiply3f(random(), random(), random());
        Vec3.add(particle.position, particle.position, noisePosition.multiplyScalar(dt));
    }

    /**
     * @en Gets the preview of noise texture.
     * @zh 获取噪声图预览。
     * @param out @en Noise texture pixels array @zh 噪声图像素数组
     * @param ps @en Particle system @zh 噪声图作用的粒子系统
     * @param width @en Texture width @zh 噪声图宽度
     * @param height @en Texture height @zh 噪声图高度
     */
    public getNoisePreview (out: number[], ps: ParticleSystem, width: number, height: number): void {
        this.noise.setTime(ps.time);
        this.noise.setSpeed(this.noiseSpeedX, this.noiseSpeedY, this.noiseSpeedZ);
        this.noise.setFrequency(this.noiseFrequency);
        this.noise.setAbs(this.remapX, this.remapY, this.remapZ);
        this.noise.setAmplititude(this.strengthX, this.strengthY, this.strengthZ);
        this.noise.setOctaves(this.octaves, this.octaveMultiplier, this.octaveScale);
        this.noise.getNoiseParticle();

        this.noise.getPreview(out, width, height);
    }
}
