/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { ccclass, tooltip, range, slide, type, displayOrder, serializable, editable } from 'cc.decorator';
import { Component } from '../../scene-graph/component';
import { Color, Vec3, Enum, cclegacy } from '../../core';
import { scene } from '../../render-scene';
import { Root } from '../../root';
import { CAMERA_DEFAULT_MASK } from '../../rendering/define';
import { Layers } from '../../scene-graph/layers';
import type { LightType } from '../../render-scene/scene';

const _color_tmp = new Vec3();

/**
 * @en The physical term used for light.
 * @zh 光源所使用的物理计量单位。
 */
export const PhotometricTerm = Enum({
    LUMINOUS_FLUX: 0,
    LUMINANCE: 1,
});

/**
 * @en Static light settings.
 * @zh 静态灯光设置
 */
@ccclass('cc.StaticLightSettings')
class StaticLightSettings {
    @serializable
    protected _baked = false;
    @serializable
    protected _editorOnly = false;
    @serializable
    protected _castShadow = false;

    /**
     * @en Whether the light is editor only.
     * @zh 是否只在编辑器里生效。
     */
    @editable
    get editorOnly (): boolean {
        return this._editorOnly;
    }
    set editorOnly (val) {
        this._editorOnly = val;
    }

    /**
     * @en Whether the light is baked
     * @zh 光源是否被烘焙
     */
    get baked (): boolean {
        return this._baked;
    }

    set baked (val) {
        this._baked = val;
    }

    /**
     * @en Whether the light will cast shadow during baking process.
     * @zh 光源在烘焙时是否投射阴影。
     */
    @editable
    get castShadow (): boolean {
        return this._castShadow;
    }

    set castShadow (val) {
        this._castShadow = val;
    }
}

export declare namespace Light {
    export type Type = EnumAlias<typeof scene.LightType>;
    export type PhotometricTerm = EnumAlias<typeof PhotometricTerm>;
}

/**
 * @en The base class of all light components, contains basic light settings for both real time light and baked light.
 * @zh 光源组件基类，包含实时光源和烘焙光源的基本配置信息。
 */
@ccclass('cc.Light')
export class Light extends Component {
    /**
     * @en The light type enumeration.
     * @zh 光源类型枚举。
     */
    public static Type = scene.LightType;
    /**
     * @en The physical term used for light.
     * @zh 光源所使用的物理计量单位。
     */
    public static PhotometricTerm = PhotometricTerm;

    @serializable
    protected _color = Color.WHITE.clone();
    @serializable
    protected _useColorTemperature = false;
    @serializable
    protected _colorTemperature = 6550;
    @serializable
    protected _staticSettings: StaticLightSettings = new StaticLightSettings();
    @serializable
    protected _visibility = CAMERA_DEFAULT_MASK;

    protected _type = scene.LightType.UNKNOWN;
    protected _lightType: typeof scene.Light;
    protected _light: scene.Light | null = null;

    /**
     * @en The color of the light.
     * @zh 光源颜色。
     */
    @tooltip('i18n:lights.color')
    get color (): Readonly<Color> {
        return this._color;
    }
    set color (val: Readonly<Color>) {
        this._color = val.clone();
        if (this._light) {
            _color_tmp.x = val.r / 255.0;
            _color_tmp.y = val.g / 255.0;
            _color_tmp.z = val.b / 255.0;
            this._light.color = _color_tmp;
        }
    }

    /**
     * @en
     * Whether to enable light color temperature.
     * @zh
     * 是否启用光源色温。
     */
    @tooltip('i18n:lights.use_color_temperature')
    get useColorTemperature (): boolean {
        return this._useColorTemperature;
    }
    set useColorTemperature (enable) {
        this._useColorTemperature = enable;
        if (this._light) { this._light.useColorTemperature = enable; }
    }

    /**
     * @en
     * The light color temperature.
     * @zh
     * 光源色温。
     */
    @slide
    @range([1000, 15000, 100])
    @tooltip('i18n:lights.color_temperature')
    get colorTemperature (): number {
        return this._colorTemperature;
    }

    set colorTemperature (val) {
        this._colorTemperature = val;
        if (this._light) { this._light.colorTemperature = val; }
    }

    /**
     * @en
     * static light settings.
     * @zh
     * 静态灯光设置。
     */
    @type(StaticLightSettings)
    @displayOrder(50)
    get staticSettings (): StaticLightSettings {
        return this._staticSettings;
    }

    set staticSettings (val) {
        this._staticSettings = val;
    }

    /**
     * @en The light type.
     * @zh 光源类型。
     */
    get type (): LightType {
        return this._type;
    }

    /**
     * @en Whether the light is baked
     * @zh 光源是否被烘焙
     */
    get baked (): boolean {
        return this.staticSettings.baked;
    }

    set baked (val) {
        this.staticSettings.baked = val;
        if (this._light !== null) {
            this._light.baked = val;
        }
    }

    /**
     * @en Visibility mask of the light, declaring a set of node layers that will be visible to this light.
     * @zh 光照的可见性掩码，声明在当前光照中可见的节点层级集合。
     */
    @tooltip('i18n:lights.visibility')
    @displayOrder(255)
    @type(Layers.BitMask)
    set visibility (vis: number) {
        this._visibility = vis;
        if (this._light) { this._light.visibility = vis; }
        this._onUpdateReceiveDirLight();
    }
    get visibility (): number {
        return this._visibility;
    }

    constructor () {
        super();
        this._lightType = scene.Light;
    }

    public onLoad (): void {
        this._createLight();
    }

    public onEnable (): void {
        this._attachToScene();
    }

    public onDisable (): void {
        this._detachFromScene();
    }

    public onDestroy (): void {
        this._destroyLight();
    }

    protected _createLight (): void {
        if (!this._light) {
            this._light = (cclegacy.director.root as Root).createLight(this._lightType);
        }
        this.color = this._color;
        this.useColorTemperature = this._useColorTemperature;
        this.colorTemperature = this._colorTemperature;
        this._light.node = this.node;
        this._light.baked = this.baked;
        this._light.visibility = this.visibility;
    }

    protected _destroyLight (): void {
        if (this._light) {
            (cclegacy.director.root as Root).recycleLight(this._light);
            this._light = null;
        }
    }

    protected _attachToScene (): void {
        this._detachFromScene();
        if (this._light && !this._light.scene && this.node.scene) {
            const renderScene = this._getRenderScene();
            switch (this._type) {
            case scene.LightType.DIRECTIONAL:
                renderScene.addDirectionalLight(this._light as scene.DirectionalLight);
                renderScene.setMainLight(this._light as scene.DirectionalLight);
                break;
            case scene.LightType.SPHERE:
                renderScene.addSphereLight(this._light as scene.SphereLight);
                break;
            case scene.LightType.SPOT:
                renderScene.addSpotLight(this._light as scene.SpotLight);
                break;
            case scene.LightType.POINT:
                renderScene.addPointLight(this._light as scene.PointLight);
                break;
            case scene.LightType.RANGED_DIRECTIONAL:
                renderScene.addRangedDirLight(this._light as scene.RangedDirectionalLight);
                break;
            default:
                break;
            }
        }
    }

    protected _detachFromScene (): void {
        if (this._light && this._light.scene) {
            const renderScene = this._light.scene;
            switch (this._type) {
            case scene.LightType.DIRECTIONAL:
                renderScene.removeDirectionalLight(this._light as scene.DirectionalLight);
                renderScene.unsetMainLight(this._light as scene.DirectionalLight);
                break;
            case scene.LightType.SPHERE:
                renderScene.removeSphereLight(this._light as scene.SphereLight);
                break;
            case scene.LightType.SPOT:
                renderScene.removeSpotLight(this._light as scene.SpotLight);
                break;
            case scene.LightType.POINT:
                renderScene.removePointLight(this._light as scene.PointLight);
                break;
            case scene.LightType.RANGED_DIRECTIONAL:
                renderScene.removeRangedDirLight(this._light as scene.RangedDirectionalLight);
                break;
            default:
                break;
            }
        }
    }

    protected _onUpdateReceiveDirLight (): void {
        // do nothing
    }
}
