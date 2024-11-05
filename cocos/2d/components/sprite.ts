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

import { ccclass, help, executionOrder, menu, tooltip, displayOrder, type, range, editable, serializable, visible } from 'cc.decorator';
import { BUILD, EDITOR } from 'internal:constants';
import { SpriteAtlas } from '../assets/sprite-atlas';
import { SpriteFrame, SpriteFrameEvent } from '../assets/sprite-frame';
import { Vec2, cclegacy, ccenum, clamp, warnID, error } from '../../core';
import { IBatcher } from '../renderer/i-batcher';
import { UIRenderer, InstanceMaterialType } from '../framework/ui-renderer';
import { PixelFormat } from '../../asset/assets/asset-enum';
import { TextureBase } from '../../asset/assets/texture-base';
import { Material, RenderTexture } from '../../asset/assets';
import { NodeEventType } from '../../scene-graph/node-event';
import assetManager from '../../asset/asset-manager/asset-manager';

/**
 * @en
 * Enum for sprite type.
 *
 * @zh
 * Sprite 类型。
 */
export enum SpriteType {
    /**
     * @en
     * The simple type.
     *
     * @zh
     * 普通类型。
     */
    SIMPLE = 0,
    /**
     * @en
     * The sliced type.
     *
     * @zh
     * 切片（九宫格）类型。
     */
    SLICED = 1,
    /**
     * @en
     * The tiled type.
     *
     * @zh  平铺类型
     */
    TILED =  2,
    /**
     * @en
     * The filled type.
     *
     * @zh
     * 填充类型。
     */
    FILLED = 3,
    // /**
    //  * @en The mesh type.
    //  * @zh  以 Mesh 三角形组成的类型
    //  */
    // MESH: 4
}
ccenum(SpriteType);

/**
 * @en
 * Enum for fill type.
 *
 * @zh
 * 填充类型。
 */
enum FillType {
    /**
     * @en
     * The horizontal fill.
     *
     * @zh
     * 水平方向填充。
     */
    HORIZONTAL = 0,
    /**
     * @en
     * The vertical fill.
     *
     * @zh
     * 垂直方向填充。
     */
    VERTICAL = 1,
    /**
     * @en
     * The radial fill.
     *
     * @zh  径向填充
     */
    RADIAL = 2,
}
ccenum(FillType);

/**
 * @en
 * Sprite Size can track trimmed size, raw size or none.
 *
 * @zh
 * 精灵尺寸调整模式。
 */
enum SizeMode {
    /**
     * @en
     * Use the customized node size.
     *
     * @zh
     * 使用节点预设的尺寸。
     */
    CUSTOM = 0,
    /**
     * @en
     * Match the trimmed size of the sprite frame automatically.
     *
     * @zh
     * 自动适配为精灵裁剪后的尺寸。
     */
    TRIMMED = 1,
    /**
     * @en
     * Match the raw size of the sprite frame automatically.
     *
     * @zh
     * 自动适配为精灵原图尺寸。
     */
    RAW = 2,
}
ccenum(SizeMode);

export enum SpriteEventType {
    SPRITE_FRAME_CHANGED = 'spriteframe-changed',
}

/**
 * @en
 * Renders a sprite in the scene.
 *
 * @zh
 * 渲染精灵组件。
 */
@ccclass('cc.Sprite')
@help('i18n:cc.Sprite')
@executionOrder(110)
@menu('2D/Sprite')
export class Sprite extends UIRenderer {
    constructor () {
        super();
    }

    /**
     * @en
     * The sprite atlas where the sprite is.
     *
     * @zh
     * 精灵的图集。
     */
    @type(SpriteAtlas)
    @displayOrder(4)
    @tooltip('i18n:sprite.atlas')
    get spriteAtlas (): SpriteAtlas | null {
        return this._atlas;
    }
    set spriteAtlas (value) {
        if (this._atlas === value) {
            return;
        }
        this._atlas = value;
    }

    /**
     * @en
     * The sprite frame of the sprite.
     *
     * @zh
     * 精灵的精灵帧。
     */
    @type(SpriteFrame)
    @displayOrder(5)
    @tooltip('i18n:sprite.sprite_frame')
    get spriteFrame (): SpriteFrame | null {
        return this._spriteFrame;
    }
    set spriteFrame (value) {
        if (this._spriteFrame === value) {
            return;
        }

        const lastSprite = this._spriteFrame;
        this._spriteFrame = value;
        this.markForUpdateRenderData();
        this._applySpriteFrame(lastSprite);
        if (EDITOR) {
            this.node.emit(SpriteEventType.SPRITE_FRAME_CHANGED, this);
        }
    }

    /**
     * @en
     * The sprite render type.
     *
     * @zh
     * 精灵渲染类型。
     *
     * @example
     * ```ts
     * import { Sprite } from 'cc';
     * sprite.type = Sprite.Type.SIMPLE;
     * ```
     */
    @type(SpriteType)
    @displayOrder(6)
    @tooltip('i18n:sprite.type')
    get type (): SpriteType {
        return this._type;
    }
    set type (value: SpriteType) {
        if (this._type !== value) {
            this._type = value;
            this._flushAssembler();
        }
    }

    /**
     * @en
     * The fill type, This will only have any effect if the "type" is set to “Sprite.Type.FILLED”.
     *
     * @zh
     * 精灵填充类型，仅渲染类型设置为 Sprite.Type.FILLED 时有效。
     *
     * @example
     * ```ts
     * import { Sprite } from 'cc';
     * sprite.fillType = Sprite.FillType.HORIZONTAL;
     * ```
     */
    @type(FillType)
    @displayOrder(6)
    @tooltip('i18n:sprite.fill_type')
    get fillType (): FillType {
        return this._fillType;
    }
    set fillType (value: FillType) {
        if (this._fillType !== value) {
            if (value === FillType.RADIAL || this._fillType === FillType.RADIAL) {
                this.destroyRenderData();
            } else if (this.renderData) {
                this.markForUpdateRenderData(true);
            }
        }

        this._fillType = value;
        this._flushAssembler();
    }

    /**
     * @en
     * The fill Center, This will only have any effect if the "type" is set to “Sprite.Type.FILLED”.
     *
     * @zh
     * 填充中心点，仅渲染类型设置为 Sprite.Type.FILLED 时有效。
     *
     * @example
     * ```ts
     * import { Vec2 } from 'cc';
     * sprite.fillCenter = new Vec2(0, 0);
     * ```
     */
    @displayOrder(6)
    @tooltip('i18n:sprite.fill_center')
    get fillCenter (): Vec2 {
        return this._fillCenter;
    }
    set fillCenter (value) {
        this._fillCenter.x = value.x;
        this._fillCenter.y = value.y;
        if (this._type === SpriteType.FILLED && this.renderData) {
            this.markForUpdateRenderData();
        }
    }

    /**
     * @en
     * The fill Start, This will only have any effect if the "type" is set to “Sprite.Type.FILLED”.
     *
     * @zh
     * 填充起始点，仅渲染类型设置为 Sprite.Type.FILLED 时有效。
     *
     * @example
     * ```ts
     * // -1 To 1 between the numbers
     * sprite.fillStart = 0.5;
     * ```
     */
    @range([0, 1, 0.1])
    @displayOrder(6)
    @tooltip('i18n:sprite.fill_start')
    get fillStart (): number {
        return this._fillStart;
    }

    set fillStart (value) {
        this._fillStart = clamp(value, 0, 1);
        if (this._type === SpriteType.FILLED && this.renderData) {
            this.markForUpdateRenderData();
            this._updateUVs();
        }
    }

    /**
     * @en
     * The fill Range, This will only have any effect if the "type" is set to “Sprite.Type.FILLED”.
     *
     * @zh
     * 填充范围，仅渲染类型设置为 Sprite.Type.FILLED 时有效。
     *
     * @example
     * ```ts
     * // -1 To 1 between the numbers
     * sprite.fillRange = 1;
     * ```
     */
    @range([-1, 1, 0.1])
    @displayOrder(6)
    @tooltip('i18n:sprite.fill_range')
    get fillRange (): number {
        return this._fillRange;
    }
    set fillRange (value) {
        // positive: counterclockwise, negative: clockwise
        this._fillRange = clamp(value, -1, 1);
        if (this._type === SpriteType.FILLED && this.renderData) {
            this.markForUpdateRenderData();
            this._updateUVs();
        }
    }
    /**
     * @en
     * specify the frame is trimmed or not.
     *
     * @zh
     * 是否使用裁剪模式。
     *
     * @example
     * ```ts
     * sprite.trim = true;
     * ```
     */
    @visible(function (this: Sprite) {
        return this._type === SpriteType.SIMPLE;
    })
    @displayOrder(8)
    @tooltip('i18n:sprite.trim')
    get trim (): boolean {
        return this._isTrimmedMode;
    }

    set trim (value) {
        if (this._isTrimmedMode === value) {
            return;
        }

        this._isTrimmedMode = value;
        if ((this._type === SpriteType.SIMPLE /* || this._type === SpriteType.MESH */)
            && this.renderData) {
            this.markForUpdateRenderData(true);
        }
    }

    /**
     * @en Grayscale mode.
     * @zh 是否以灰度模式渲染。
     */
    @editable
    @displayOrder(5)
    @tooltip('i18n:sprite.gray_scale')
    get grayscale (): boolean {
        return this._useGrayscale;
    }
    set grayscale (value) {
        if (this._useGrayscale === value) {
            return;
        }
        this._useGrayscale = value;
        this.changeMaterialForDefine();
        this.updateMaterial();
    }

    /**
     * @en
     * Specify the size tracing mode.
     *
     * @zh
     * 精灵尺寸调整模式。
     *
     * @example
     * ```ts
     * import { Sprite } from 'cc';
     * sprite.sizeMode = Sprite.SizeMode.CUSTOM;
     * ```
     */
    @type(SizeMode)
    @displayOrder(5)
    @tooltip('i18n:sprite.size_mode')
    get sizeMode (): SizeMode {
        return this._sizeMode;
    }
    set sizeMode (value) {
        if (this._sizeMode === value) {
            return;
        }

        this._sizeMode = value;
        if (value !== SizeMode.CUSTOM) {
            this._applySpriteSize();
        }
    }

    /**
     * @en Enum for fill type.
     * @zh 填充类型。
     */
    public static FillType = FillType;
    /**
     * @en Enum for sprite type.
     * @zh Sprite 类型。
     */
    public static Type = SpriteType;
    /**
     * @en Sprite's size mode, including trimmed size, raw size, and none.
     * @zh 精灵尺寸调整模式。
     */
    public static SizeMode = SizeMode;
    /**
     * @en Event types for sprite.
     * @zh sprite 的事件类型。
     */
    public static EventType = SpriteEventType;

    @serializable
    protected _spriteFrame: SpriteFrame | null = null;
    @serializable
    protected _type = SpriteType.SIMPLE;
    @serializable
    protected _fillType = FillType.HORIZONTAL;
    @serializable
    protected _sizeMode = SizeMode.TRIMMED;
    @serializable
    protected _fillCenter: Vec2 = new Vec2(0, 0);
    @serializable
    protected _fillStart = 0;
    @serializable
    protected _fillRange = 0;
    @serializable
    protected _isTrimmedMode = true;
    @serializable
    protected _useGrayscale = false;
    @serializable
    protected _atlas: SpriteAtlas | null = null;

    public __preload (): void {
        this.changeMaterialForDefine();
        super.__preload();

        if (EDITOR) {
            this._resized();
            this._applyAtlas(this._spriteFrame);
            this.node.on(NodeEventType.SIZE_CHANGED, this._resized, this);
        }
    }

    public onEnable (): void {
        super.onEnable();

        // Force update uv, material define, active material, etc
        this._activateMaterial();
        const spriteFrame = this._spriteFrame;
        if (spriteFrame) {
            this._updateUVs();
            if (this._type === SpriteType.SLICED) {
                spriteFrame.on(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            }
        }
    }

    public onDisable (): void {
        super.onDisable();
        if (this._spriteFrame && this._type === SpriteType.SLICED) {
            this._spriteFrame.off(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
        }
    }

    public onDestroy (): void {
        if (EDITOR) {
            this.node.off(NodeEventType.SIZE_CHANGED, this._resized, this);
        }
        super.onDestroy();
    }

    /**
     * @en
     * Quickly switch to other sprite frame in the sprite atlas.
     * If there is no atlas, the switch fails.
     *
     * @zh
     * 选取使用精灵图集中的其他精灵。
     * @param name @en Name of the spriteFrame to switch. @zh 要切换的 spriteFrame 名字。
     */
    public changeSpriteFrameFromAtlas (name: string): void {
        if (!this._atlas) {
            warnID(16377);
            return;
        }
        const sprite = this._atlas.getSpriteFrame(name);
        this.spriteFrame = sprite;
    }

    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public changeMaterialForDefine (): void {
        let texture;
        const lastInstanceMaterialType = this._instanceMaterialType;
        if (this._spriteFrame) {
            texture = this._spriteFrame.texture;
        }
        let value = false;
        if (texture instanceof TextureBase) {
            const format = texture.getPixelFormat();
            value = (format === PixelFormat.RGBA_ETC1 || format === PixelFormat.RGB_A_PVRTC_4BPPV1 || format === PixelFormat.RGB_A_PVRTC_2BPPV1);
        }

        if (value && this.grayscale) {
            this._instanceMaterialType = InstanceMaterialType.USE_ALPHA_SEPARATED_AND_GRAY;
        } else if (value) {
            this._instanceMaterialType = InstanceMaterialType.USE_ALPHA_SEPARATED;
        } else if (this.grayscale) {
            this._instanceMaterialType = InstanceMaterialType.GRAYSCALE;
        } else {
            this._instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
        }
        if (lastInstanceMaterialType !== this._instanceMaterialType) {
            this.updateMaterial();
        }
    }

    protected _updateBuiltinMaterial (): Material {
        let mat = super._updateBuiltinMaterial();
        if (this.spriteFrame && this.spriteFrame.texture instanceof RenderTexture) {
            const renderMat = new Material();
            renderMat.copy(mat, { defines: { SAMPLE_FROM_RT: true } });
            mat = renderMat;
        }
        return mat;
    }

    protected _render (render: IBatcher): void {
        render.commitComp(this, this.renderData, this._spriteFrame, this._assembler, null);
    }

    protected _canRender (): boolean {
        if (!super._canRender()) {
            return false;
        }

        const spriteFrame = this._spriteFrame;
        if (!spriteFrame || !spriteFrame.texture) {
            return false;
        }

        return true;
    }

    protected _flushAssembler (): void {
        const assembler = Sprite.Assembler.getAssembler(this);

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this.getRenderMaterial(0);
                this.markForUpdateRenderData();
                if (this.spriteFrame) {
                    this._assembler.updateUVs(this);
                }
                this._updateColor();
            }
        }

        // Only Sliced type need update uv when sprite frame insets changed
        if (this._spriteFrame) {
            if (this._type === SpriteType.SLICED) {
                this._spriteFrame.on(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            } else {
                this._spriteFrame.off(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            }
        }
    }

    private _applySpriteSize (): void {
        if (this._spriteFrame) {
            if (BUILD || !this._spriteFrame.isDefault) {
                if (SizeMode.RAW === this._sizeMode) {
                    const size = this._spriteFrame.originalSize;
                    this.node._uiProps.uiTransformComp!.setContentSize(size);
                } else if (SizeMode.TRIMMED === this._sizeMode) {
                    const rect = this._spriteFrame.rect;
                    this.node._uiProps.uiTransformComp!.setContentSize(rect.width, rect.height);
                }
            }
        }
    }

    private _resized (): void {
        if (!EDITOR) {
            return;
        }

        if (this._spriteFrame) {
            const actualSize = this.node._uiProps.uiTransformComp!.contentSize;
            let expectedW = actualSize.width;
            let expectedH = actualSize.height;
            if (this._sizeMode === SizeMode.RAW) {
                const size = this._spriteFrame.originalSize;
                expectedW = size.width;
                expectedH = size.height;
            } else if (this._sizeMode === SizeMode.TRIMMED) {
                const rect = this._spriteFrame.rect;
                expectedW = rect.width;
                expectedH = rect.height;
            }

            if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
                this._sizeMode = SizeMode.CUSTOM;
            }
        }
    }

    private _activateMaterial (): void {
        const spriteFrame = this._spriteFrame;
        const material = this.getRenderMaterial(0);
        if (spriteFrame) {
            if (material) {
                this.markForUpdateRenderData();
            }
        }

        if (this.renderData) {
            this.renderData.material = material;
        }
    }

    private _updateUVs (): void {
        if (this._assembler) {
            this._assembler.updateUVs(this);
        }
    }

    private _applySpriteFrame (oldFrame: SpriteFrame | null): void {
        const spriteFrame = this._spriteFrame;

        if (oldFrame && this._type === SpriteType.SLICED) {
            oldFrame.off(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
        }

        let textureChanged = false;
        if (spriteFrame) {
            if (!oldFrame || oldFrame.texture !== spriteFrame.texture) {
                textureChanged = true;
            }
            if (textureChanged) {
                if (this.renderData) this.renderData.textureDirty = true;
                // texture type changed, set this._instanceMaterialType to default value
                const oldIsRT = oldFrame ? oldFrame.texture instanceof RenderTexture : false;
                const newIsRT = spriteFrame.texture instanceof RenderTexture;
                if (oldIsRT !== newIsRT) {
                    this._instanceMaterialType = -1;
                }
                this.changeMaterialForDefine();
            }
            this._applySpriteSize();
            if (this._type === SpriteType.SLICED) {
                spriteFrame.on(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            }
        }

        if (EDITOR) {
            this._applyAtlas(spriteFrame);
        }
    }

    private _applyAtlas (spriteFrame: SpriteFrame | null): void {
        if (!EDITOR) return;

        if (!spriteFrame) return;

        if (spriteFrame.atlasUuid.length === 0) {
            this.spriteAtlas = null;
            return;
        }

        if (!this.spriteAtlas || this.spriteAtlas.uuid !== spriteFrame.atlasUuid) {
            assetManager.loadAny(spriteFrame.atlasUuid, (err: Error, asset: SpriteAtlas) => {
                if (err) {
                    this.spriteAtlas = null;
                    error(err);
                } else {
                    this.spriteAtlas = asset;
                }
            });
        }
    }
}

cclegacy.Sprite = Sprite;
