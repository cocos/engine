/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { ccclass, help, executionOrder, menu, tooltip, displayOrder,
    type, visible, serializable, range, slide, executeInEditMode } from 'cc.decorator';
import { JSB } from 'internal:constants';
import { clamp, Color, Mat4, Vec2, Vec3, warnID, cclegacy, ccenum, errorID } from '../../core';
import { Graphics } from './graphics';
import { TransformBit } from '../../scene-graph/node-enum';
import { Stage } from '../renderer/stencil-manager';
import { NodeEventProcessor } from '../../scene-graph/node-event-processor';
import { MaskMode } from '../renderer/render-entity';
import { Sprite } from './sprite';
import { NodeEventType, Component } from '../../scene-graph';
import type { SpriteFrame } from '../assets';
import type { Material } from '../../asset/assets';
import { MaterialInstance } from '../../render-scene';

const _worldMatrix = new Mat4();
const _vec2_temp = new Vec2();
const _mat4_temp = new Mat4();

const _circlePoints: Vec3[] = [];
function _calculateCircle (center: Vec3, radius: Vec3, segments: number): Vec3[] {
    _circlePoints.length = 0;
    const anglePerStep = Math.PI * 2 / segments;
    for (let step = 0; step < segments; ++step) {
        _circlePoints.push(new Vec3(
            radius.x * Math.cos(anglePerStep * step) + center.x,
            radius.y * Math.sin(anglePerStep * step) + center.y,

            0,
        ));
    }

    return _circlePoints;
}
/**
 * @en The type for mask.
 *
 * @zh 遮罩组件类型。
 */
export enum MaskType {
    /**
     * @en Rect mask.
     *
     * @zh
     * 使用矩形作为遮罩。
     */
    GRAPHICS_RECT = 0,

    /**
     * @en Ellipse Mask.
     *
     * @zh
     * 使用椭圆作为遮罩。
     */
    GRAPHICS_ELLIPSE = 1,

    /**
     * @en Graphics Mask.
     *
     * @zh
     * 使用图像模版作为遮罩。
     */
    GRAPHICS_STENCIL = 2,

    /**
     * @en SpriteFrame Mask.
     *
     * @zh
     * 使用图片模版作为遮罩。
     */
    SPRITE_STENCIL = 3,
}

ccenum(MaskType);

const SEGMENTS_MIN = 3;
const SEGMENTS_MAX = 10000;

/**
 * @en
 * The Mask Component.
 *
 * @zh
 * 遮罩组件。
 */
@ccclass('cc.Mask')
@help('i18n:cc.Mask')
@executionOrder(110)
@menu('2D/Mask')
@executeInEditMode
export class Mask extends Component {
    /**
     * @en The type for mask.
     *
     * @zh 遮罩组件类型。
     */
    public static Type = MaskType;

    constructor () {
        super();
    }

    /**
     * @en
     * The mask type.
     *
     * @zh
     * 遮罩类型。
     */
    @type(MaskType)
    @tooltip('i18n:mask.type')
    get type (): MaskType {
        return this._type;
    }

    set type (value: MaskType) {
        if (this._type === value) {
            return;
        }

        this._type = value;

        if (this._type !== MaskType.SPRITE_STENCIL) {
            if (this._sprite) {
                this.node.removeComponent(Sprite);
                this._sprite._destroyImmediate();
                this._sprite = null;
            }
            this._changeRenderType();
            this._updateGraphics();
            if (JSB) {
                this.subComp!.renderEntity.setMaskMode(this._inverted ? MaskMode.MASK_INVERTED : MaskMode.MASK);
            }
        } else {
            if (this._graphics) {
                this._graphics.clear();
                this.node.removeComponent(Graphics);
                this._graphics._destroyImmediate();
                this._graphics = null;
            }
            this._changeRenderType();
            if (JSB) {
                this.subComp!.renderEntity.setMaskMode(this._inverted ? MaskMode.MASK_INVERTED : MaskMode.MASK);
            }
        }
    }

    /**
     * @en
     * Reverse mask.
     * @zh
     * 反向遮罩。
     */
    @displayOrder(14)
    @tooltip('i18n:mask.inverted')
    get inverted (): boolean {
        return this._inverted;
    }

    set inverted (value) {
        this._inverted = value;
        this.subComp!.stencilStage = this.inverted ? Stage.ENTER_LEVEL_INVERTED : Stage.ENTER_LEVEL;

        if (JSB) {
            this.subComp!.renderEntity.setMaskMode(this._inverted ? MaskMode.MASK_INVERTED : MaskMode.MASK);
        }
    }

    /**
     * @en
     * The segments for ellipse mask.
     *
     * TODO: remove segments, not supported by graphics
     * @zh
     * 椭圆遮罩的曲线细分数。
     */
    @visible(function (this: Mask) {
        return this.type === MaskType.GRAPHICS_ELLIPSE;
    })
    get segments (): number {
        return this._segments;
    }

    set segments (value) {
        if (this._segments === value) {
            return;
        }

        this._segments = clamp(value, SEGMENTS_MIN, SEGMENTS_MAX);
        this._updateGraphics();
    }

    /**
     * @en
     * The mask image.
     *
     * @zh
     * 遮罩所需要的贴图。
     * @deprecated since v3.6.1
     */
    get spriteFrame (): SpriteFrame | null {
        if (this._sprite) {
            return this._sprite.spriteFrame;
        }
        return null;
    }

    set spriteFrame (value) {
        if (this._sprite) {
            this._sprite.spriteFrame = value;
        } else {
            errorID(16307);
        }
    }

    /**
     * @en
     * The alpha threshold.(Not supported Canvas Mode) <br/>
     * The content is drawn only where the stencil have pixel with alpha greater than the alphaThreshold. <br/>
     * Should be a float between 0 and 1. <br/>
     * This default to 0.1.
     * When it's set to 1, the stencil will discard all pixels, nothing will be shown.
     * @zh
     * Alpha 阈值（不支持 Canvas 模式）<br/>
     * 只有当模板的像素的 alpha 大于等于 alphaThreshold 时，才会绘制内容。<br/>
     * 该数值 0 ~ 1 之间的浮点数，默认值为 0.1
     * 当被设置为 1 时，会丢弃所有蒙版像素，所以不会显示任何内容
     */
    @visible(function (this: Mask): boolean {
        return this.type === MaskType.SPRITE_STENCIL;
    })
    @range([0, 1, 0.1])
    @slide
    get alphaThreshold (): number {
        return this._alphaThreshold;
    }

    set alphaThreshold (value) {
        if (this._alphaThreshold === value) {
            return;
        }

        this._alphaThreshold = value;
        if (this.type === MaskType.SPRITE_STENCIL && this._sprite) {
            const mat = this._sprite.getMaterialInstance(0)!;
            mat.setProperty('alphaThreshold', this._alphaThreshold);
        }
    }

    /**
     * @en Rendering component for providing stencil buffer information.
     * @zh 用于提供 stencil buffer 信息的渲染组件。
     */
    get subComp (): Sprite | Graphics | null {
        return this._graphics || this._sprite;
    }

    @serializable
    protected _type = MaskType.GRAPHICS_RECT;

    @serializable
    protected _inverted = false;

    @serializable
    protected _segments = 64;

    @serializable
    protected _alphaThreshold = 0.1;

    protected _sprite: Sprite | null = null;
    protected _graphics: Graphics | null = null;

    protected _stencilStage: Stage = Stage.DISABLED;

    public onLoad (): void {
        this._changeRenderType();

        if (JSB) {
            if (this.subComp) {
                this.subComp.renderEntity.setMaskMode(this._inverted ? MaskMode.MASK_INVERTED : MaskMode.MASK);
            }
        }
    }

    public onEnable (): void {
        this._changeRenderType();// Maybe useless,a protect,may effect custom setting
        this._updateGraphics();
        this._enableRender();
        this.node.on(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.on(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
    }

    public onRestore (): void {
        this._changeRenderType();
        this._updateGraphics();
    }

    public onDisable (): void {
        this._disableRender();
        this.node.off(NodeEventType.ANCHOR_CHANGED, this._nodeStateChange, this);
        this.node.off(NodeEventType.SIZE_CHANGED, this._nodeStateChange, this);
    }

    public onDestroy (): void {
        this._removeMaskNode();
    }

    /**
     * @en Hit test with point in World Space.
     * @zh 世界空间中的点击测试。
     * @param worldPt @en point in World Space. @zh 世界空间中的点击点。
     */
    public isHit (worldPt: Vec2): boolean {
        const uiTrans = this.node._getUITransformComp()!;
        const size = uiTrans.contentSize;
        const w = size.width;
        const h = size.height;
        const testPt = _vec2_temp;

        this.node.getWorldMatrix(_worldMatrix);
        Mat4.invert(_mat4_temp, _worldMatrix);
        Vec2.transformMat4(testPt, worldPt, _mat4_temp);
        const ap = uiTrans.anchorPoint;
        testPt.x += ap.x * w;
        testPt.y += ap.y * h;

        let result = false;
        if (this.type === MaskType.GRAPHICS_RECT || this.type === MaskType.GRAPHICS_STENCIL || this.type === MaskType.SPRITE_STENCIL) {
            result = testPt.x >= 0 && testPt.y >= 0 && testPt.x <= w && testPt.y <= h;
        } else if (this.type === MaskType.GRAPHICS_ELLIPSE) {
            const rx = w / 2;
            const ry = h / 2;
            const px = testPt.x - 0.5 * w;
            const py = testPt.y - 0.5 * h;
            result = px * px / (rx * rx) + py * py / (ry * ry) < 1;
        }

        if (this._inverted) {
            result = !result;
        }

        return result;
    }

    protected _nodeStateChange (type: TransformBit): void {
        this._updateGraphics();
    }

    private _changeRenderType (): void {
        const isGraphics = (this._type !== MaskType.SPRITE_STENCIL);
        if (isGraphics) {
            this._createGraphics();
        } else {
            this._createSprite();
        }
    }

    protected _createSprite (): void {
        if (!this._sprite) {
            let sprite = this._sprite = this.node.getComponent(Sprite);
            if (!sprite) {
                const node = this.node;
                sprite = this._sprite = node.addComponent(Sprite);
            }
        }
        this._sprite!.stencilStage = this.inverted ? Stage.ENTER_LEVEL_INVERTED : Stage.ENTER_LEVEL;
        this._sprite!.updateMaterial();
    }

    protected _createGraphics (): void {
        if (!this._graphics) {
            let graphics = this._graphics = this.node.getComponent(Graphics);
            if (!graphics) {
                const node = this.node;
                graphics = this._graphics = node.addComponent(Graphics);
            }
            graphics.lineWidth = 1;
            const color = Color.WHITE.clone();
            color.a = 0;
            graphics.fillColor = color;
        }
        this._graphics!.stencilStage = this.inverted ? Stage.ENTER_LEVEL_INVERTED : Stage.ENTER_LEVEL;
    }

    protected _updateGraphics (): void {
        if (!this._graphics || (this._type !== MaskType.GRAPHICS_RECT && this._type !== MaskType.GRAPHICS_ELLIPSE)) {
            return;
        }

        const uiTrans = this.node._getUITransformComp()!;
        const graphics = this._graphics;
        // Share render data with graphics content
        graphics.clear();
        const size = uiTrans.contentSize;
        const width = size.width;
        const height = size.height;
        const ap = uiTrans.anchorPoint;
        const x = -width * ap.x;
        const y = -height * ap.y;
        if (this._type === MaskType.GRAPHICS_RECT) {
            graphics.rect(x, y, width, height);
        } else if (this._type === MaskType.GRAPHICS_ELLIPSE) {
            const center = new Vec3(x + width / 2, y + height / 2, 0);
            const radius = new Vec3(width / 2, height / 2, 0);
            const points = _calculateCircle(center, radius, this._segments);
            for (let i = 0; i < points.length; ++i) {
                const point = points[i];
                if (i === 0) {
                    graphics.moveTo(point.x, point.y);
                } else {
                    graphics.lineTo(point.x, point.y);
                }
            }
            graphics.close();
        }

        graphics.fill();
    }

    protected _enableRender (): void {
        if (this.subComp) {
            this.subComp.enabled = true;
        }
    }

    protected _disableRender (): void {
        if (this.subComp) {
            this.subComp.stencilStage = Stage.DISABLED;
            this.subComp.updateMaterial();
            if (this.node.activeInHierarchy) {
                this.subComp.enabled = false;
            }
        }
    }

    protected _removeMaskNode (): void {
        if (this._sprite) {
            this._sprite = null;
        }
        if (this._graphics) {
            this._graphics = null;
        }
    }

    // deprecated interface
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get customMaterial (): Material | null {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.customMaterial;
        }
        return null;
    }
    set customMaterial (val) {
        warnID(9007);
        if (this.subComp) {
            this.subComp.customMaterial = val;
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get color (): Color | null {
        warnID(9007);
        if (this.subComp) {
            // FIXME: the type of subComp is Sprite | graphics, and Sprite.color returns Readonly<Color>.
            // so have to use as Color here. And i don't want to change the return type to Readonly<Color>
            // as it will break compatibility.
            return this.subComp.color as Color;
        }
        return null;
    }
    set color (value) {
        warnID(9007);
        if (this.subComp && value) {
            this.subComp.color = value;
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public markForUpdateRenderData (enable = true): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp._markForUpdateRenderData(enable);
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public requestRenderData (any): void {
        warnID(9007);
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public destroyRenderData (): void {
        warnID(9007);
    }

    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public updateRenderer (): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp.updateRenderer();
        }
    }

    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public fillBuffers (render: any): void {
        warnID(9007);
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public postUpdateAssembler (render: any): void {
        warnID(9007);
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public setNodeDirty (): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp.setNodeDirty();
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public setTextureDirty (): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp.setTextureDirty();
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get sharedMaterial (): Material | null {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.sharedMaterial;
        }
        return null;
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get sharedMaterials (): (Material | null)[] | null {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.sharedMaterials;
        }
        return null;
    }
    set sharedMaterials (val) {
        warnID(9007);
        if (this.subComp && val) {
            this.subComp.sharedMaterials = val;
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get material (): any {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.material;
        }
        return null;
    }
    set material (val: any) {
        warnID(9007);
        if (this.subComp) {
            this.subComp.material = val;
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    get materials (): (any)[] {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.materials;
        }
        return [null];
    }
    set materials (val: (any)[]) {
        warnID(9007);
        if (this.subComp) {
            this.subComp.materials = val;
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public getMaterial (idx: number): any {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.getSharedMaterial(idx);
        }
        return null;
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public setMaterial (material: Material | MaterialInstance | null, index: number): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp.setMaterial(material, index);
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public getMaterialInstance (idx: number): any {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.getMaterialInstance(idx);
        }
        return null;
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public setMaterialInstance (matInst: Material | MaterialInstance | null, index: number): void {
        warnID(9007);
        if (this.subComp) {
            this.subComp.setMaterialInstance(matInst, index);
        }
    }
    /**
     * @deprecated Since v3.6, Because mask changes the inheritance relationship,
     * you can directly manipulate the rendering components under the same node to complete the operation
     */
    public getRenderMaterial (index: number): any {
        warnID(9007);
        if (this.subComp) {
            return this.subComp.getRenderMaterial(index);
        }
        return null;
    }
}

NodeEventProcessor._maskComp = Mask;

cclegacy.Mask = Mask;
