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

import { ccclass, tooltip, displayOrder, type, formerlySerializedAs, serializable, range } from 'cc.decorator';
import { lerp, pseudoRandom, repeat, Enum, random, error } from '../../core';
import { Particle, ParticleModuleBase, PARTICLE_MODULE_NAME } from '../particle';
import CurveRange from './curve-range';
import { ModuleRandSeed } from '../enum';
import { isCurveTwoValues } from '../particle-general-function';

const TEXTURE_ANIMATION_RAND_OFFSET = ModuleRandSeed.TEXTURE;

/**
 * @en Texture animation type.
 * @zh 粒子贴图动画类型。
 * @enum textureAnimationModule.Mode
 */
const Mode = Enum({
    /**
     * 网格类型。
     */
    Grid: 0,

    /**
     * 精灵类型（暂未支持）。
     */
    // Sprites: 1,
});

/**
 * @en Mode to play texture animation.
 * @zh 贴图动画的播放方式。
 * @enum textureAnimationModule.Animation
 */
const Animation = Enum({
    /**
     * @en Play whole sheet of texture.
     * @zh 播放贴图中的所有帧。
     */
    WholeSheet: 0,

    /**
     * @en Play just one row of texture.
     * @zh 播放贴图中的其中一行动画。
     */
    SingleRow: 1,
});

/**
 * @en
 * Use this module to play frame animation of the particle texture.
 * @zh
 * 这个模块用于播放粒子纹理带的纹理帧动画。
 */
@ccclass('cc.TextureAnimationModule')
export default class TextureAnimationModule extends ParticleModuleBase {
    constructor () {
        super();
    }
    @serializable
    private _enable = false;

    @formerlySerializedAs('numTilesX')
    private _numTilesX = 0;

    @formerlySerializedAs('numTilesY')
    private _numTilesY = 0;

    /**
     * @en Enable this module or not.
     * @zh 是否启用。
     */
    @displayOrder(0)
    get enable (): boolean {
        return this._enable;
    }

    set enable (val) {
        if (this._enable === val) return;
        this._enable = val;
        if (!this.target) return;
        this.target.updateMaterialParams();
        this.target.enableModule(this.name, val, this);
    }

    @type(Mode)
    private _mode = Mode.Grid;

    /**
     * @en Set texture animation [[Mode]] (only support Grid mode).
     * @zh 设定粒子贴图动画的类型（暂只支持 Grid 模式）[[Mode]]。
     */
    @type(Mode)
    @displayOrder(1)
    @tooltip('i18n:textureAnimationModule.mode')
    get mode (): number {
        return this._mode;
    }

    set mode (val) {
        if (val !== Mode.Grid) {
            error('particle texture animation\'s sprites is not supported!');
        }
    }

    /**
     * @en Tile count on X axis.
     * @zh X 方向动画帧数。
     */
    @displayOrder(2)
    @tooltip('i18n:textureAnimationModule.numTilesX')
    get numTilesX (): number {
        return this._numTilesX;
    }

    set numTilesX (val) {
        if (this._numTilesX !== val) {
            this._numTilesX = val;
            this.target!.updateMaterialParams();
        }
    }

    /**
     * @en Tile count on Y axis.
     * @zh Y 方向动画帧数。
     */
    @displayOrder(3)
    @tooltip('i18n:textureAnimationModule.numTilesY')
    get numTilesY (): number {
        return this._numTilesY;
    }

    set numTilesY (val) {
        if (this._numTilesY !== val) {
            this._numTilesY = val;
            this.target!.updateMaterialParams();
        }
    }

    /**
     * @en Texture animation type. See [[Animation]].
     * @zh 动画播放方式 [[Animation]]。
     */
    @type(Animation)
    @serializable
    @displayOrder(4)
    @tooltip('i18n:textureAnimationModule.animation')
    public animation = Animation.WholeSheet;

    /**
     * @en Curve to control texture animation speed.
     * @zh 一个周期内动画播放的帧与时间变化曲线。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(7)
    @tooltip('i18n:textureAnimationModule.frameOverTime')
    public frameOverTime = new CurveRange();

    /**
     * @en Texture animation frame start to play.
     * @zh 从第几帧开始播放，时间为整个粒子系统的生命周期。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(8)
    @tooltip('i18n:textureAnimationModule.startFrame')
    public startFrame = new CurveRange();

    /**
     * @en Animation cycle count per particle life.
     * @zh 一个生命周期内播放循环的次数。
     */
    @serializable
    @displayOrder(9)
    @tooltip('i18n:textureAnimationModule.cycleCount')
    public cycleCount = 0;

    @serializable
    private _flipU = 0;

    /**
     * @ignore
     */
    get flipU (): number {
        return this._flipU;
    }

    set flipU (val) {
        error('particle texture animation\'s flipU is not supported!');
    }

    @serializable
    private _flipV = 0;

    get flipV (): number {
        return this._flipV;
    }

    set flipV (val) {
        error('particle texture animation\'s flipV is not supported!');
    }

    @serializable
    private _uvChannelMask = -1;

    get uvChannelMask (): number {
        return this._uvChannelMask;
    }

    set uvChannelMask (val) {
        error('particle texture animation\'s uvChannelMask is not supported!');
    }

    /**
     * @en Get random row from texture to generate animation.<br>
     * This option is available when [[Animation]] type is SingleRow.
     * @zh 随机从动画贴图中选择一行以生成动画。<br>
     * 此选项仅在动画播放方式为 SingleRow 时生效。
     */
    @serializable
    @displayOrder(5)
    @tooltip('i18n:textureAnimationModule.randomRow')
    public randomRow = false;

    /**
     * @en Generate animation from specific row in texture.<br>
     * This option is available when [[Animation]] type is SingleRow and randomRow option is disabled.
     * @zh 从动画贴图中选择特定行以生成动画。<br>
     * 此选项仅在动画播放方式为 SingleRow 时且禁用 randomRow 时可用。
     */
    @serializable
    @displayOrder(6)
    @tooltip('i18n:textureAnimationModule.rowIndex')
    public rowIndex = 0;

    public name = PARTICLE_MODULE_NAME.TEXTURE;

    /**
     * @en Init start row to particle.
     * @zh 给粒子创建初始行属性。
     * @param p @en Particle to set start row. @zh 设置初始行属性的粒子。
     * @internal
     */
    public init (p: Particle): void {
        p.startRow = Math.floor(random() * this.numTilesY);
    }

    /**
     * @en Apply texture animation to particle.
     * @zh 应用贴图动画到粒子。
     * @param p @en Particle to animate. @zh 模块需要更新的粒子。
     * @param dt @en Update interval time. @zh 粒子系统更新的间隔时间。
     * @internal
     */
    public animate (p: Particle, dt: number): void {
        const normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
        const randStart = isCurveTwoValues(this.startFrame) ? pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET) : 0;
        const randFrame = isCurveTwoValues(this.frameOverTime) ? pseudoRandom(p.randomSeed + TEXTURE_ANIMATION_RAND_OFFSET) : 0;
        const startFrame = this.startFrame.evaluate(normalizedTime, randStart)! / (this.numTilesX * this.numTilesY);
        if (this.animation === Animation.WholeSheet) {
            p.frameIndex = repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, randFrame)! + startFrame), 1);
        } else if (this.animation === Animation.SingleRow) {
            const rowLength = 1 / this.numTilesY;
            if (this.randomRow) {
                const f = repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, randFrame)! + startFrame), 1);
                const from = p.startRow * rowLength;
                const to = from + rowLength;
                p.frameIndex = lerp(from, to, f);
            } else {
                const from = this.rowIndex * rowLength;
                const to = from + rowLength;
                p.frameIndex = lerp(from, to, repeat(this.cycleCount * (this.frameOverTime.evaluate(normalizedTime, randFrame)! + startFrame), 1));
            }
        }
    }
}
