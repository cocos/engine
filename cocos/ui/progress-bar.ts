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

import { ccclass, help, executionOrder, menu, requireComponent, tooltip, type, range, slide, serializable } from 'cc.decorator';
import { Component } from '../scene-graph/component';
import { UITransform } from '../2d/framework';
import { Size, Vec2, Vec3 } from '../core/math';
import { Enum } from '../core/value-types';
import { clamp01 } from '../core/math/utils';
import { Sprite } from '../2d/components/sprite';
import { warnID } from '../core/platform/debug';
import { legacyCC } from '../core/global-exports';

/**
 * @en
 * Enum for ProgressBar mode.
 *
 * @zh
 * 进度条模式。
 */
enum Mode {
    /**
     * @en
     * The mode of horizontal.
     *
     * @zh
     * 水平方向模式。
     */
    HORIZONTAL = 0,

    /**
     * @en
     * The mode of vertical.
     *
     * @zh
     *  垂直方向模式。
     */
    VERTICAL = 1,
    /**
     * @en
     * The mode of fill.
     *
     * @zh
     * 填充模式。
     */
    FILLED = 2,
}

Enum(Mode);

/**
 * @en
 * Visual indicator of progress in some operation.
 * Displays a bar to the user representing how far the operation has progressed.
 *
 * @zh
 * 进度条组件，可用于显示加载资源时的进度。
 *
 * @example
 * ```ts
 * // update progressBar
 * update(dt) {
 *     var progress = progressBar.progress;
 *     if (progress > 0) {
 *         progress += dt;
 *     }
 *     else {
 *         progress = 1;
 *     }
 *     progressBar.progress = progress;
 * }
 * ```
 */
@ccclass('cc.ProgressBar')
@help('i18n:cc.ProgressBar')
@executionOrder(110)
@menu('UI/ProgressBar')
@requireComponent(UITransform)
// @executeInEditMode
export class ProgressBar extends Component {
    constructor () {
        super();
    }

    /**
     * @en
     * The targeted Sprite which will be changed progressively.
     *
     * @zh
     * 用来显示进度条比例的 Sprite 对象。
     */
    @type(Sprite)
    @tooltip('i18n:progress.bar_sprite')
    get barSprite (): Sprite | null {
        return this._barSprite;
    }

    set barSprite (value: Sprite | null) {
        if (this._barSprite === value) {
            return;
        }

        this._barSprite = value;
        this._initBarSprite();
    }

    /**
     * @en
     * The progress mode, there are two modes supported now: horizontal and vertical.
     *
     * @zh
     * 进度条的模式。
     */
    @type(Mode)
    @tooltip('i18n:progress.mode')
    get mode (): Mode {
        return this._mode;
    }

    set mode (value: Mode) {
        if (this._mode === value) {
            return;
        }

        this._mode = value;
        if (this._barSprite) {
            const entity = this._barSprite.node;
            if (!entity) { return; }

            const entitySize = entity._getUITransformComp()!.contentSize;
            if (this._mode === Mode.HORIZONTAL) {
                this.totalLength = entitySize.width;
            } else if (this._mode === Mode.VERTICAL) {
                this.totalLength = entitySize.height;
            } else if (this._mode === Mode.FILLED) {
                this.totalLength = this._barSprite.fillRange;
            }
        }
    }

    /**
     * @en
     * The total width or height of the bar sprite.
     *
     * @zh
     * 进度条实际的总长度。
     */
    @tooltip('i18n:progress.total_length')
    get totalLength (): number {
        return this._totalLength;
    }

    set totalLength (value) {
        if (this._mode === Mode.FILLED) {
            value = clamp01(value);
        }

        if (this._totalLength === value) {
            return;
        }

        this._totalLength = value;
        this._updateBarStatus();
    }

    /**
     * @en
     * The current progress of the bar sprite. The valid value is between 0-1.
     *
     * @zh
     * 当前进度值，该数值的区间是 0-1 之间。
     */
    @range([0, 1, 0.1])
    @slide
    @tooltip('i18n:progress.progress')
    get progress (): number {
        return this._progress;
    }

    set progress (value) {
        if (this._progress === value) {
            return;
        }

        this._progress = value;
        this._updateBarStatus();
    }

    /**
     * @en
     * Whether reverse the progress direction of the bar sprite.
     *
     * @zh
     * 进度条是否进行反方向变化。
     */
    @tooltip('i18n:progress.reverse')
    get reverse (): boolean {
        return this._reverse;
    }

    set reverse (value) {
        if (this._reverse === value) {
            return;
        }

        this._reverse = value;
        if (this._barSprite) {
            this._barSprite.fillStart = 1 - this._barSprite.fillStart;
        }
        this._updateBarStatus();
    }

    public static Mode = Mode;
    @serializable
    protected _barSprite: Sprite | null = null;
    @serializable
    protected _mode = Mode.HORIZONTAL;
    @serializable
    protected _totalLength = 1;
    @serializable
    protected _progress = 0.1;
    @serializable
    protected _reverse = false;

    protected onLoad (): void {
        this._updateBarStatus();
    }

    protected _initBarSprite (): void {
        if (this._barSprite) {
            const entity = this._barSprite.node;
            if (!entity) { return; }

            const trans = this.node._getUITransformComp()!;
            const nodeSize = trans.contentSize;
            const nodeAnchor = trans.anchorPoint;

            const barSpriteSize = entity._getUITransformComp()!.contentSize;

            // if (entity.parent === this.node) {
            //     this.node.setContentSize(barSpriteSize);
            // }

            if (this._barSprite.fillType === Sprite.FillType.RADIAL) {
                this._mode = Mode.FILLED;
            }

            if (this._mode === Mode.HORIZONTAL) {
                this.totalLength = barSpriteSize.width;
            } else if (this._mode === Mode.VERTICAL) {
                this.totalLength = barSpriteSize.height;
            } else {
                this.totalLength = this._barSprite.fillRange;
            }

            if (entity.parent === this.node) {
                const x = -nodeSize.width * nodeAnchor.x;
                entity.setPosition(x, 0, 0);
            }
        }
    }

    protected _updateBarStatus (): void {
        if (this._barSprite) {
            const entity = this._barSprite.node;

            if (!entity) { return; }

            const entTrans = entity._getUITransformComp()!;
            const entityAnchorPoint = entTrans.anchorPoint;
            const entitySize = entTrans.contentSize;

            let anchorPoint = new Vec2(0, 0.5);
            const progress = clamp01(this._progress);
            let actualLenth = this._totalLength * progress;
            let finalContentSize = entitySize;
            let totalWidth = 0;
            let totalHeight = 0;
            switch (this._mode) {
            case Mode.HORIZONTAL:
                if (this._reverse) {
                    anchorPoint = new Vec2(1, 0.5);
                }

                finalContentSize = new Size(actualLenth, entitySize.height);
                totalWidth = this._totalLength;
                totalHeight = entitySize.height;
                break;
            case Mode.VERTICAL:
                if (this._reverse) {
                    anchorPoint = new Vec2(0.5, 1);
                } else {
                    anchorPoint = new Vec2(0.5, 0);
                }

                finalContentSize = new Size(entitySize.width, actualLenth);
                totalWidth = entitySize.width;
                totalHeight = this._totalLength;
                break;
            default:
                break;
            }

            // handling filled mode
            if (this._mode === Mode.FILLED) {
                if (this._barSprite.type !== Sprite.Type.FILLED) {
                    warnID(16397);
                } else {
                    if (this._reverse) {
                        actualLenth *= -1;
                    }
                    this._barSprite.fillRange = actualLenth;
                }
            } else if (this._barSprite.type !== Sprite.Type.FILLED) {
                const anchorOffsetX = anchorPoint.x - entityAnchorPoint.x;
                const anchorOffsetY = anchorPoint.y - entityAnchorPoint.y;

                const finalPosition = new Vec3(entity.position);
                finalPosition.add3f(totalWidth * anchorOffsetX, totalHeight * anchorOffsetY, 0);
                entity.setPosition(finalPosition);

                entTrans.setAnchorPoint(anchorPoint);
                entTrans.setContentSize(finalContentSize);
            } else {
                warnID(16398);
            }
        }
    }
}

legacyCC.ProgressBar = ProgressBar;
