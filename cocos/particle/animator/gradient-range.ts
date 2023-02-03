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

import { ccclass, type, serializable, editable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Color, Enum, cclegacy } from '../../core';
import Gradient, { AlphaKey, ColorKey } from './gradient';
import { Texture2D } from '../../asset/assets';
import { PixelFormat, Filter, WrapMode } from '../../asset/assets/asset-enum';

const SerializableTable = EDITOR && [
    ['_mode', 'color'],
    ['_mode', 'gradient'],
    ['_mode', 'colorMin', 'colorMax'],
    ['_mode', 'gradientMin', 'gradientMax'],
    ['_mode', 'gradient'],
];

/**
 * @en
 * Gradinet is a component to calculate color value. It contains 5 modes:
 * Color is just the color value all the time.
 * Two Colors has 2 color values to interpolate the color value.
 * Gradient value is generated by many color keys interpolation.
 * Two Gradients has 2 gradients. The value is calculated by interpolation of the 2 gradients value.
 * Random Color has one gradient. The value is get from color keys of the gradient randomly.
 * @zh
 * 渐变曲线是用来计算颜色值的控件，它包含五种模式：
 * 单色从头到尾只返回一种颜色值。
 * 双色包含两个颜色值，返回两种颜色之间的插值。
 * 渐变曲线包含许多颜色帧，返回颜色帧之间的插值。
 * 双渐变曲线包含两个渐变曲线，对两个渐变曲线返回的颜色值再进行插值。
 * 随机颜色包含一个颜色曲线，从曲线中随机获取颜色值。
 */
const Mode = Enum({
    Color: 0,
    Gradient: 1,
    TwoColors: 2,
    TwoGradients: 3,
    RandomColor: 4,
});

/**
 * @en
 * GradientRange is a data structure which contains some constant colors or gradients.
 * Calculate the color by its mode and particle system will use it to change particle attribute associated with it.
 * Refer [[GradientRange.Mode]] to see the detail of calculation mode.
 * @zh
 * GradientRange 是一类数据结构，其包含了多个常数颜色或渐变色，计算时其将根据计算模式计算最终颜色，粒子系统使用此数据结构对所有的粒子的属性进行修改。
 * 详细的计算模式请参考 [[GradientRange.Mode]] 的解释。
 */
@ccclass('cc.GradientRange')
export default class GradientRange {
    /**
     * @en Gets/Sets color gradient mode to use. See [[Mode]].
     * @zh 使用的渐变色类型 参考 [[Mode]]。
     */
    @type(Mode)
    get mode () {
        return this._mode;
    }

    set mode (m) {
        if (EDITOR && !cclegacy.GAME_VIEW) {
            if (m === Mode.RandomColor) {
                if (this.gradient.colorKeys.length === 0) {
                    this.gradient.colorKeys.push(new ColorKey());
                }
                if (this.gradient.alphaKeys.length === 0) {
                    this.gradient.alphaKeys.push(new AlphaKey());
                }
            }
        }
        this._mode = m;
    }

    /**
     * @en The gradient mode. See [[Mode]].
     * @zh 渐变色类型 参考 [[Mode]]。
     */
    public static Mode = Mode;

    /**
     * @en Color value when use color mode.
     * @zh 当 mode 为 Color 时的颜色。
     */
    @serializable
    @editable
    public color = Color.WHITE.clone();

    /**
     * @en Min color value when use TwoColors mode.
     * @zh 当 mode 为 TwoColors 时的颜色下限。
     */
    @serializable
    @editable
    public colorMin = Color.WHITE.clone();

    /**
     * @en Max color value when use TwoColors mode.
     * @zh 当 mode 为 TwoColors 时的颜色上限。
     */
    @serializable
    @editable
    public colorMax = Color.WHITE.clone();

    /**
     * @en Gradient value when use gradient mode.
     * @zh 当 mode 为 Gradient 时的颜色渐变。
     */
    @type(Gradient)
    public gradient = new Gradient();

    /**
     * @en Gradient min value when use TwoGradients.
     * @zh 当mode为TwoGradients时的颜色渐变下限。
     */
    @type(Gradient)
    public gradientMin = new Gradient();

    /**
     * @en Gradient max value when use TwoGradients.
     * @zh 当 mode 为 TwoGradients 时的颜色渐变上限。
     */
    @type(Gradient)
    public gradientMax = new Gradient();

    @type(Mode)
    private _mode = Mode.Color;

    private _color = Color.WHITE.clone();

    /**
     * @en Calculate gradient value.
     * @zh 计算颜色渐变曲线数值。
     * @param time @en Normalized time to interpolate. @zh 用于插值的归一化时间。
     * @param rndRatio @en Interpolation ratio when mode is TwoColors or TwoGradients.
     *                     Particle attribute will pass in a random number to get a random result.
     *                 @zh 当模式为双色或双渐变色时，使用的插值比例，通常粒子系统会传入一个随机数以获得一个随机结果。
     * @returns @en Gradient value. @zh 颜色渐变曲线的值。
     */
    public evaluate (time: number, rndRatio: number) {
        switch (this._mode) {
        case Mode.Color:
            return this.color;
        case Mode.TwoColors:
            Color.lerp(this._color, this.colorMin, this.colorMax, rndRatio);
            return this._color;
        case Mode.RandomColor:
            return this.gradient.randomColor();
        case Mode.Gradient:
            return this.gradient.evaluate(time);
        case Mode.TwoGradients:
            Color.lerp(this._color, this.gradientMin.evaluate(time), this.gradientMax.evaluate(time), rndRatio);
            return this._color;
        default:
            return this.color;
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onBeforeSerialize (props: any) {
        return SerializableTable[this._mode];
    }
}

function evaluateGradient (gr: GradientRange, time: number, index: number) {
    switch (gr.mode) {
    case Mode.Color:
        return gr.color;
    case Mode.TwoColors:
        return index === 0 ? gr.colorMin : gr.colorMax;
    case Mode.RandomColor:
        return gr.gradient.randomColor();
    case Mode.Gradient:
        return gr.gradient.evaluate(time);
    case Mode.TwoGradients:
        return index === 0 ? gr.gradientMin.evaluate(time) : gr.gradientMax.evaluate(time);
    default:
        return gr.color;
    }
}
function evaluateHeight (gr: GradientRange) {
    switch (gr.mode) {
    case Mode.TwoColors:
        return 2;
    case Mode.TwoGradients:
        return 2;
    default:
        return 1;
    }
}
export function packGradientRange (tex: Texture2D | null, data: Uint8Array | null, samples: number, gr: GradientRange) {
    const height = evaluateHeight(gr);
    const len = samples * height * 4;
    if (data === null || data.length !== len) {
        data = new Uint8Array(samples * height * 4);
    }
    const interval = 1.0 / (samples);
    let offset = 0;

    for (let h = 0; h < height; h++) {
        for (let j = 0; j < samples; j++) {
            const color = evaluateGradient(gr, interval * j, h);
            data[offset] = color.r;
            data[offset + 1] = color.g;
            data[offset + 2] = color.b;
            data[offset + 3] = color.a;
            offset += 4;
        }
    }

    if (tex === null || samples !== tex.width || height !== tex.height) {
        if (tex) {
            tex.destroy();
        }
        tex = new Texture2D();
        tex.create(samples, height, PixelFormat.RGBA8888);
        tex.setFilters(Filter.LINEAR, Filter.LINEAR);
        tex.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
    }
    tex.uploadData(data);

    return { texture: tex, texdata: data };
}
