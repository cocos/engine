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

import { v3, Vec3 } from '../../core';
import { TransformBit } from '../../scene-graph/node-enum';
import { RenderScene } from '../core/render-scene';
import { Node } from '../../scene-graph';
import { CAMERA_DEFAULT_MASK } from '../../rendering/define';

// Color temperature (in Kelvin) to RGB
export function ColorTemperatureToRGB (rgb: Vec3, kelvin: number): void {
    if (kelvin < 1000.0) {
        kelvin = 1000.0;
    } else if (kelvin > 15000.0) {
        kelvin = 15000.0;
    }

    // Approximate Planckian locus in CIE 1960 UCS
    const kSqr = kelvin * kelvin;
    const u = (0.860117757 + 1.54118254e-4 * kelvin + 1.28641212e-7 * kSqr) / (1.0 + 8.42420235e-4 * kelvin + 7.08145163e-7 * kSqr);
    const v = (0.317398726 + 4.22806245e-5 * kelvin + 4.20481691e-8 * kSqr) / (1.0 - 2.89741816e-5 * kelvin + 1.61456053e-7 * kSqr);

    const d = (2.0 * u - 8.0 * v + 4.0);
    const x = (3.0 * u) / d;
    const y = (2.0 * v) / d;
    const z = (1.0 - x) - y;

    const X = (1.0 / y) * x;
    const Z = (1.0 / y) * z;

    // XYZ to RGB with BT.709 primaries
    rgb.x =  3.2404542 * X + -1.5371385 + -0.4985314 * Z;
    rgb.y = -0.9692660 * X +  1.8760108 +  0.0415560 * Z;
    rgb.z =  0.0556434 * X + -0.2040259 +  1.0572252 * Z;
}

/**
 * @en The light type enumeration.
 * @zh 光源类型枚举。
 */
export enum LightType {
    DIRECTIONAL,
    SPHERE,
    SPOT,
    POINT,
    RANGED_DIRECTIONAL,
    UNKNOWN,
}

export const nt2lm = (size: number): number => 4 * Math.PI * Math.PI * size * size;

/**
 * @en The abstract light class of the render scene
 * @zh 渲染场景中的光源基类
 */
export class Light {
    /**
     * @en Whether it's a baked light source, baked light will be ignored in real time lighting pass
     * @zh 是否是烘焙光源，烘焙光源会在实时光照计算中被忽略
     */
    get baked (): boolean {
        return this._baked;
    }

    set baked (val) {
        this._baked = val;
    }

    /**
     * @en The color of the light
     * @zh 光源的颜色
     */
    set color (color: Vec3) {
        this._color.set(color);
        if (this._useColorTemperature) { Vec3.multiply(this._finalColor, this._color, this._colorTempRGB); }
    }

    get color (): Vec3 {
        return this._color;
    }

    /**
     * @en Whether to use color temperature
     * @zh 是否使用光源的色温
     */
    set useColorTemperature (enable: boolean) {
        this._useColorTemperature = enable;
        if (enable) { Vec3.multiply(this._finalColor, this._color, this._colorTempRGB); }
    }

    get useColorTemperature (): boolean {
        return this._useColorTemperature;
    }

    /**
     * @en The color temperature of the light
     * @zh 光源的色温
     */
    set colorTemperature (val: number) {
        this._colorTemp = val;
        ColorTemperatureToRGB(this._colorTempRGB, this._colorTemp);
        if (this._useColorTemperature) { Vec3.multiply(this._finalColor, this._color, this._colorTempRGB); }
    }

    get colorTemperature (): number {
        return this._colorTemp;
    }

    /**
     * @en The float RGB value of the color temperature, each channel is from 0 to 1
     * @zh 色温的浮点数颜色值，每个通道都是从 0 到 1
     */
    get colorTemperatureRGB (): Vec3 {
        return this._colorTempRGB;
    }

    get finalColor (): Readonly<Vec3> {
        return this._finalColor;
    }

    /**
     * @en Visibility mask of the light, declaring a set of node layers that will be visible to this light.
     * @zh 光照的可见性掩码，声明在当前光照中可见的节点层级集合。
     * @engineInternal
     */
    set visibility (vis: number) {
        this._visibility = vis;
    }
    get visibility (): number {
        return this._visibility;
    }

    set node (n) {
        this._node = n;
        if (this._node) {
            this._node.hasChangedFlags |= TransformBit.ROTATION;
        }
    }

    /**
     * @en The node which owns the light source
     * @zh 光源归属的节点
     */
    get node (): Node | null {
        return this._node;
    }

    /**
     * @en The type of the light source, e.g. directional light, spot light, etc
     * @zh 光源的类型，比如方向光、聚光灯等
     */
    get type (): LightType {
        return this._type;
    }

    /**
     * @en The name of the light source
     * @zh 光源的名字
     */
    get name (): string | null {
        return this._name;
    }

    set name (n) {
        this._name = n;
    }

    /**
     * @en The render scene which owns the current light
     * @zh 光源所属的渲染场景
     */
    get scene (): RenderScene | null {
        return this._scene;
    }

    protected _baked = false;

    protected _color: Vec3 = v3(1, 1, 1);

    protected _colorTemp = 6550.0;

    protected _colorTempRGB: Vec3 = v3(1, 1, 1);

    private _finalColor: Vec3 = v3(1, 1, 1);

    protected _scene: RenderScene | null = null;

    protected _node: Node | null = null;

    protected _name: string | null = null;

    protected _useColorTemperature = false;

    protected _type: LightType = LightType.UNKNOWN;

    protected _visibility = CAMERA_DEFAULT_MASK;

    public initialize (): void {
        this.color = v3(1, 1, 1);
        this.colorTemperature = 6550.0;
    }

    /**
     * @en Attach the light to a render scene
     * @zh 将光源挂载到渲染场景上
     * @param scene @en The render scene @zh 渲染场景
     */
    public attachToScene (scene: RenderScene): void {
        this._scene = scene;
    }

    /**
     * @en Detach the light from the render scene
     * @zh 将光源从渲染场景上移除
     */
    public detachFromScene (): void {
        this._scene = null;
    }

    public destroy (): void {
        this._name = null;
        this._node = null;
    }

    public update (): void {}
}
