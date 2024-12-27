/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const misc = require('../utils/misc');
const NodeEvent = require('../CCNode').EventType;
const RenderComponent = require('./CCRenderComponent');
const BlendFunc = require('../utils/blend-func');


/**
 * !#en Enum for sprite type.
 * !#zh Sprite 类型
 * @enum Sprite.Type
 */
var SpriteType = cc.Enum({
    /**
     * !#en The simple type.
     * !#zh 普通类型
     * @property {Number} SIMPLE
     */
    SIMPLE: 0,
    /**
     * !#en The sliced type.
     * !#zh 切片（九宫格）类型
     * @property {Number} SLICED
     */
    SLICED: 1,
    /**
     * !#en The tiled type.
     * !#zh 平铺类型
     * @property {Number} TILED
     */
    TILED: 2,
    /**
     * !#en The filled type.
     * !#zh 填充类型
     * @property {Number} FILLED
     */
    FILLED: 3,
    /**
     * !#en The mesh type.
     * !#zh 以 Mesh 三角形组成的类型
     * @property {Number} MESH
     */
    MESH: 4
});

/**
 * !#en Enum for fill type.
 * !#zh 填充类型
 * @enum Sprite.FillType
 */
var FillType = cc.Enum({
    /**
     * !#en The horizontal fill.
     * !#zh 水平方向填充
     * @property {Number} HORIZONTAL
     */
    HORIZONTAL: 0,
    /**
     * !#en The vertical fill.
     * !#zh 垂直方向填充
     * @property {Number} VERTICAL
     */
    VERTICAL: 1,
    /**
     * !#en The radial fill.
     * !#zh 径向填充
     * @property {Number} RADIAL
     */
    RADIAL:2,
});

/**
 * !#en Sprite Size can track trimmed size, raw size or none.
 * !#zh 精灵尺寸调整模式
 * @enum Sprite.SizeMode
 */
var SizeMode = cc.Enum({
    /**
     * !#en Use the customized node size.
     * !#zh 使用节点预设的尺寸
     * @property {Number} CUSTOM
     */
    CUSTOM: 0,
    /**
     * !#en Match the trimmed size of the sprite frame automatically.
     * !#zh 自动适配为精灵裁剪后的尺寸
     * @property {Number} TRIMMED
     */
    TRIMMED: 1,
    /**
     * !#en Match the raw size of the sprite frame automatically.
     * !#zh 自动适配为精灵原图尺寸
     * @property {Number} RAW
     */
    RAW: 2
});
/**
 * !#en Sprite state can choice the normal or grayscale.
 * !#zh 精灵颜色通道模式。
 * @enum Sprite.State
 * @deprecated
 */
var State = cc.Enum({
    /**
     * !#en The normal state
     * !#zh 正常状态
     * @property {Number} NORMAL
     */
    NORMAL: 0,
    /**
     * !#en The gray state, all color will be modified to grayscale value.
     * !#zh 灰色状态，所有颜色会被转换成灰度值
     * @property {Number} GRAY
     */
    GRAY: 1
});

/**
 * !#en Renders a sprite in the scene.
 * !#zh 该组件用于在场景中渲染精灵。
 * @class Sprite
 * @extends RenderComponent
 * @uses BlendFunc
 * @example
 *  // Create a new node and add sprite components.
 *  var node = new cc.Node("New Sprite");
 *  var sprite = node.addComponent(cc.Sprite);
 *  node.parent = this.node;
 */
var Sprite = cc.Class({
    name: 'cc.Sprite',
    extends: RenderComponent,
    mixins: [BlendFunc],

    editor: CC_EDITOR && {
        menu: 'i18n:MAIN_MENU.component.renderers/Sprite',
        help: 'i18n:COMPONENT.help_url.sprite',
        inspector: 'packages://inspector/inspectors/comps/sprite.js',
    },

    properties: {
        _spriteFrame: {
            default: null,
            type: cc.SpriteFrame
        },
        _type: SpriteType.SIMPLE,
        _sizeMode: SizeMode.TRIMMED,
        _fillType: 0,
        _fillCenter: cc.v2(0,0),
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: true,
        _atlas: {
            default: null,
            type: cc.SpriteAtlas,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.atlas',
            editorOnly: true,
            visible: true,
            animatable: false
        },

        /**
         * !#en The sprite frame of the sprite.
         * !#zh 精灵的精灵帧
         * @property spriteFrame
         * @type {SpriteFrame}
         * @example
         * sprite.spriteFrame = newSpriteFrame;
         */
        spriteFrame: {
            get () {
                return this._spriteFrame;
            },
            set (value, force) {
                var lastSprite = this._spriteFrame;
                if (CC_EDITOR) {
                    if (!force && ((lastSprite && lastSprite._uuid) === (value && value._uuid))) {
                        return;
                    }
                }
                else {
                    if (lastSprite === value) {
                        return;
                    }
                }
                this._spriteFrame = value;
                this._applySpriteFrame(lastSprite);
                if (CC_EDITOR) {
                    this.node.emit('spriteframe-changed', this);
                }
            },
            type: cc.SpriteFrame,
        },

        /**
         * !#en The sprite render type.
         * !#zh 精灵渲染类型
         * @property type
         * @type {Sprite.Type}
         * @example
         * sprite.type = cc.Sprite.Type.SIMPLE;
         */
        type: {
            get () {
                return this._type;
            },
            set (value) {
                if (this._type !== value) {
                    this._type = value;
                    this.setVertsDirty();
                    this._resetAssembler();
                }
            },
            type: SpriteType,
            animatable: false,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.type',
        },

        /**
         * !#en
         * The fill type, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 精灵填充类型，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillType
         * @type {Sprite.FillType}
         * @example
         * sprite.fillType = cc.Sprite.FillType.HORIZONTAL;
         */
        fillType : {
            get () {
                return this._fillType;
            },
            set (value) {
                if (value !== this._fillType) {
                    this._fillType = value;
                    this.setVertsDirty();
                    this._resetAssembler();
                }
            },
            type: FillType,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_type'
        },

        /**
         * !#en
         * The fill Center, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充中心点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillCenter
         * @type {Vec2}
         * @example
         * sprite.fillCenter = new cc.Vec2(0, 0);
         */
        fillCenter: {
            get () {
                return this._fillCenter;
            },
            set (value) {
                this._fillCenter.x = value.x;
                this._fillCenter.y = value.y;
                if (this._type === SpriteType.FILLED) {
                    this.setVertsDirty();
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_center',
        },

        /**
         * !#en
         * The fill Start, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充起始点，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillStart
         * @type {Number}
         * @example
         * // -1 To 1 between the numbers
         * sprite.fillStart = 0.5;
         */
        fillStart: {
            get () {
                return this._fillStart;
            },
            set (value) {
                this._fillStart = misc.clampf(value, -1, 1);
                if (this._type === SpriteType.FILLED) {
                    this.setVertsDirty();
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_start'
        },

        /**
         * !#en
         * The fill Range, This will only have any effect if the "type" is set to “cc.Sprite.Type.FILLED”.
         * !#zh
         * 填充范围，仅渲染类型设置为 cc.Sprite.Type.FILLED 时有效。
         * @property fillRange
         * @type {Number}
         * @example
         * // -1 To 1 between the numbers
         * sprite.fillRange = 1;
         */
        fillRange: {
            get () {
                return this._fillRange;
            },
            set (value) {
                this._fillRange = misc.clampf(value, -1, 1);
                if (this._type === SpriteType.FILLED) {
                    this.setVertsDirty();
                }
            },
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.fill_range'
        },
        /**
         * !#en specify the frame is trimmed or not.
         * !#zh 是否使用裁剪模式
         * @property trim
         * @type {Boolean}
         * @example
         * sprite.trim = true;
         */
        trim: {
            get () {
                return this._isTrimmedMode;
            },
            set (value) {
                if (this._isTrimmedMode !== value) {
                    this._isTrimmedMode = value;
                    if (this._type === SpriteType.SIMPLE || this._type === SpriteType.MESH) {
                        this.setVertsDirty();
                    }
                    if (CC_EDITOR) {
                        this.node.emit('trim-changed', this);
                    }
                }
            },
            animatable: false,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.trim'
        },


        /**
         * !#en specify the size tracing mode.
         * !#zh 精灵尺寸调整模式
         * @property sizeMode
         * @type {Sprite.SizeMode}
         * @example
         * sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
         */
        sizeMode: {
            get () {
                return this._sizeMode;
            },
            set (value) {
                this._sizeMode = value;
                if (value !== SizeMode.CUSTOM) {
                    this._applySpriteSize();
                }
            },
            animatable: false,
            type: SizeMode,
            tooltip: CC_DEV && 'i18n:COMPONENT.sprite.size_mode'
        }
    },

    statics: {
        FillType: FillType,
        Type: SpriteType,
        SizeMode: SizeMode,
        State: State,
    },

    setVisible (visible) {
        this.enabled = visible;
    },

    /**
     * Change the state of sprite.
     * @method setState
     * @see `Sprite.State`
     * @param state {Sprite.State} NORMAL or GRAY State.
     * @deprecated
     */
    setState () {},

    /**
     * Gets the current state.
     * @method getState
     * @see `Sprite.State`
     * @return {Sprite.State}
     * @deprecated
     */
    getState () {},

    __preload () {
        this._super();
        CC_EDITOR && this.node.on(NodeEvent.SIZE_CHANGED, this._resizedInEditor, this);
        this._applySpriteFrame();
    },

    onEnable () {
        this._super();
        this._validateRender();
        this._spriteFrame && this._spriteFrame.isValid && this._spriteFrame.ensureLoadTexture();

        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.setVertsDirty, this);
        this.node.on(cc.Node.EventType.ANCHOR_CHANGED, this.setVertsDirty, this);
    },

    onDisable () {
        this._super();

        this.node.off(cc.Node.EventType.SIZE_CHANGED, this.setVertsDirty, this);
        this.node.off(cc.Node.EventType.ANCHOR_CHANGED, this.setVertsDirty, this);
    },

    onRestore: CC_EDITOR && function () {
        // Because undo/redo will not call onEnable/onDisable,
        // we need call onEnable/onDisable manually to active/disactive children nodes.
        if (this.enabledInHierarchy) {
            this.node._renderComponent = null;
            this.onEnable();
        }
        else {
            this.onDisable();
        }
    },

    _updateMaterial () {
        let texture = null;

        if (this._spriteFrame) {
            texture = this._spriteFrame.getTexture();
        }

        // make sure material is belong to self.
        let material = this.getMaterial(0);
        if (material) {
            let oldDefine = material.getDefine('USE_TEXTURE');
            if (oldDefine !== undefined && !oldDefine) {
                material.define('USE_TEXTURE', true);
            }
            let textureImpl = texture && texture.getImpl();
            if (material.getProperty('texture') !== textureImpl) {
                material.setProperty('texture', texture);
                this.setVertsDirty();
            }
        }

        BlendFunc.prototype._updateMaterial.call(this);
    },

    _applyAtlas: CC_EDITOR && function (spriteFrame) {
        // Set atlas
        if (spriteFrame && spriteFrame.isValid && spriteFrame._atlasUuid) {
            var self = this;
            cc.assetManager.loadAny(spriteFrame._atlasUuid, function (err, asset) {
                self._atlas = asset;
            });
        } else {
            this._atlas = null;
        }
    },

    _validateRender () {
        let spriteFrame = this._spriteFrame;
        if (this._materials[0] &&
            spriteFrame &&
            spriteFrame.textureLoaded()) {
            return;
        }

        this.disableRender();
    },

    _applySpriteSize () {
        if (!this.isValid || !this._spriteFrame || !this._spriteFrame.isValid) {
            return;
        }

        if (SizeMode.RAW === this._sizeMode) {
            var size = this._spriteFrame._originalSize;
            this.node.setContentSize(size);
        } else if (SizeMode.TRIMMED === this._sizeMode) {
            var rect = this._spriteFrame._rect;
            this.node.setContentSize(rect.width, rect.height);
        }

        this.setVertsDirty();
    },

    _applySpriteFrame (oldFrame) {
        if (!this.isValid)  return;

        let oldTexture = oldFrame && oldFrame.isValid && oldFrame.getTexture();
        if (oldTexture && !oldTexture.loaded) {
            oldFrame.off('load', this._applySpriteSize, this);
        }

        let spriteFrame = this._spriteFrame;
        const frameValid = spriteFrame && spriteFrame.isValid;
        let newTexture = frameValid && spriteFrame.getTexture();

        if (oldTexture !== newTexture) {
            this._updateMaterial();
        }

        if (newTexture && newTexture.loaded) {
            this._applySpriteSize();
        }
        else {
            this.disableRender();
            if (frameValid) {
                spriteFrame.once('load', this._applySpriteSize, this);
            }
        }

        if (CC_EDITOR) {
            // Set atlas
            this._applyAtlas(spriteFrame);
        }
    },
});

if (CC_EDITOR) {
    Sprite.prototype._resizedInEditor = function () {
        if (this._spriteFrame && this._spriteFrame.isValid) {
            var actualSize = this.node.getContentSize();
            var expectedW = actualSize.width;
            var expectedH = actualSize.height;
            if (this._sizeMode === SizeMode.RAW) {
                var size = this._spriteFrame.getOriginalSize();
                expectedW = size.width;
                expectedH = size.height;
            } else if (this._sizeMode === SizeMode.TRIMMED) {
                var rect = this._spriteFrame.getRect();
                expectedW = rect.width;
                expectedH = rect.height;

            }

            if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
                this._sizeMode = SizeMode.CUSTOM;
            }
        }
    };

    // override onDestroy
    Sprite.prototype.__superOnDestroy = RenderComponent.prototype.onDestroy;
    Sprite.prototype.onDestroy = function () {
        if (this.__superOnDestroy) this.__superOnDestroy();
        this.node.off(NodeEvent.SIZE_CHANGED, this._resizedInEditor, this);
    };
}

cc.Sprite = module.exports = Sprite;
