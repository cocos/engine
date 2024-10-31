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

import { ccclass, displayOrder, executionOrder, help, menu, range, requireComponent, serializable, tooltip, type } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { UITransform } from '../2d/framework';
import { legacyCC } from '../core/global-exports';
import { Size, Vec2, Vec3, approx, v2, v3 } from '../core/math';
import { errorID, logID } from '../core/platform/debug';
import { director, DirectorEvent } from '../game/director';
import { input } from '../input/input';
import { Event, EventGamepad, EventHandle, EventMouse, EventTouch, SystemEventType, Touch } from '../input/types';
import { EventHandler as ComponentEventHandler } from '../scene-graph/component-event-handler';
import { Node } from '../scene-graph/node';
import { TransformBit } from '../scene-graph/node-enum';
import { NodeEventType } from '../scene-graph/node-event';
import { DeviceType, XrUIPressEvent, XrUIPressEventType } from '../xr/event/xr-event-handle';
import { Layout } from './layout';
import { ScrollBar } from './scroll-bar';
import { ViewGroup } from './view-group';
import { InputEventType } from '../input/types/event-enum';

const NUMBER_OF_GATHERED_TOUCHES_FOR_MOVE_SPEED = 5;
const OUT_OF_BOUNDARY_BREAKING_FACTOR = 0.05;
const EPSILON = 1e-4;
const TOLERANCE = 1e4;
const MOVEMENT_FACTOR = 0.7;
const _tempVec3 = v3();
const _tempVec3_1 = v3();
const _tempVec2 = v2();
const _tempVec2_1 = v2();

const quintEaseOut = (time: number): number => {
    time -= 1;
    return time * time * time * time * time + 1;
};

const getTimeInMilliseconds = (): number => {
    const currentTime = new Date();
    return currentTime.getMilliseconds();
};

const eventMap = {
    'scroll-to-top': 0,
    'scroll-to-bottom': 1,
    'scroll-to-left': 2,
    'scroll-to-right': 3,
    scrolling: 4,
    'bounce-bottom': 6,
    'bounce-left': 7,
    'bounce-right': 8,
    'bounce-top': 5,
    'scroll-ended': 9,
    'touch-up': 10,
    'scroll-ended-with-threshold': 11,
    'scroll-began': 12,
};

const _moveDeltaOptions = {
    anchor: v2(),
    applyToHorizontal: false,
    applyToVertical: false,
};

const assignMoveDeltaOption = (x: number, y: number, applyToHorizontal: boolean, applyToVertical: boolean): void => {
    _moveDeltaOptions.anchor.set(x, y);
    _moveDeltaOptions.applyToHorizontal = applyToHorizontal;
    _moveDeltaOptions.applyToVertical = applyToVertical;
};

/**
 * @en
 * Enum for ScrollView event type.
 *
 * @zh
 * 滚动视图事件类型。
 */
export enum ScrollViewEventType {
    /**
     * @en
     * It means an invalid event type or "default empty value" of EventType.
     *
     * @zh
     * 代表无效事件, 或者EventType的默认空值。
     */
    NONE = '',

    /**
     * @en
     * The event emitted when ScrollView scroll to the top boundary of inner container.
     *
     * @zh
     * 滚动视图滚动到顶部边界事件。
     */
    SCROLL_TO_TOP = 'scroll-to-top',
    /**
     * @en
     * The event emitted when ScrollView scroll to the bottom boundary of inner container.
     *
     * @zh
     * 滚动视图滚动到底部边界事件。
     */
    SCROLL_TO_BOTTOM = 'scroll-to-bottom',
    /**
     * @en
     * The event emitted when ScrollView scroll to the left boundary of inner container.
     *
     * @zh
     * 滚动视图滚动到左边界事件。
     */
    SCROLL_TO_LEFT = 'scroll-to-left',
    /**
     * @en
     * The event emitted when ScrollView scroll to the right boundary of inner container.
     *
     * @zh
     * 滚动视图滚动到右边界事件。
     */
    SCROLL_TO_RIGHT = 'scroll-to-right',
    /**
     * @en
     * The event emitted when ScrollView scroll began.
     *
     * @zh
     * 滚动视图滚动开始时发出的事件。
     */
    SCROLL_BEGAN = 'scroll-began',
    /**
     * @en
     * The event emitted when ScrollView auto scroll ended.
     *
     * @zh
     * 滚动视图滚动结束的时候发出的事件。
     */
    SCROLL_ENDED = 'scroll-ended',
    /**
     * @en
     * The event emitted when ScrollView scroll to the top boundary of inner container and start bounce.
     *
     * @zh
     * 滚动视图滚动到顶部边界并且开始回弹时发出的事件。
     */
    BOUNCE_TOP = 'bounce-top',
    /**
     * @en
     * The event emitted when ScrollView scroll to the bottom boundary of inner container and start bounce.
     *
     * @zh
     * 滚动视图滚动到底部边界并且开始回弹时发出的事件。
     */
    BOUNCE_BOTTOM = 'bounce-bottom',
    /**
     * @en
     * The event emitted when ScrollView scroll to the left boundary of inner container and start bounce.
     *
     * @zh
     * 滚动视图滚动到左边界并且开始回弹时发出的事件。
     */
    BOUNCE_LEFT = 'bounce-left',
    /**
     * @en
     * The event emitted when ScrollView scroll to the right boundary of inner container and start bounce.
     *
     * @zh
     * 滚动视图滚动到右边界并且开始回弹时发出的事件。
     */
    BOUNCE_RIGHT = 'bounce-right',
    /**
     * @en
     * The event emitted when ScrollView is scrolling.
     *
     * @zh
     * 滚动视图正在滚动时发出的事件。
     */
    SCROLLING = 'scrolling',
    /**
     * @en
     * The event emitted when ScrollView auto scroll ended with a threshold.
     *
     * @zh
     * 滚动视图自动滚动快要结束的时候发出的事件。
     */
    SCROLL_ENG_WITH_THRESHOLD = 'scroll-ended-with-threshold',
    /**
     * @en
     * The event emitted when user release the touch.
     *
     * @zh
     * 当用户松手的时候会发出一个事件。
     */
    TOUCH_UP = 'touch-up',
}

enum XrhoverType {
    NONE = 0,
    LEFT = 1,
    RIGHT = 2
}

/**
 * @en
 * Layout container for a view hierarchy that can be scrolled by the user,
 * allowing it to be larger than the physical display.
 *
 * @zh
 * 滚动视图组件。
 */

@ccclass('cc.ScrollView')
@help('i18n:cc.ScrollView')
@executionOrder(110)
@menu('UI/ScrollView')
@requireComponent(UITransform)
export class ScrollView extends ViewGroup {
    public static EventType = ScrollViewEventType;

    /**
     * @en
     * The elapse time of bouncing back. A value of 0 will bounce back immediately.
     *
     * @zh
     * 回弹持续的时间，0 表示将立即反弹。
     */
    @serializable
    @range([0, 10])
    @displayOrder(5)
    @tooltip('i18n:scrollview.bounceDuration')
    public bounceDuration = 1;

    /**
     * @en
     * It determines how quickly the content stop moving. A value of 1 will stop the movement immediately.
     * A value of 0 will never stop the movement until it reaches to the boundary of scrollview.
     *
     * @zh
     * 开启惯性后，在用户停止触摸后滚动多快停止，0表示永不停止，1表示立刻停止。
     */
    @serializable
    @range([0, 1, 0.1])
    @displayOrder(3)
    @tooltip('i18n:scrollview.brake')
    public brake = 0.5;

    /**
     * @en
     * When elastic is set, the content will be bounce back when move out of boundary.
     *
     * @zh
     * 是否允许滚动内容超过边界，并在停止触摸后回弹。
     */
    @serializable
    @displayOrder(3)
    @tooltip('i18n:scrollview.elastic')
    public elastic = true;

    /**
     * @en
     * When inertia is set, the content will continue to move when touch ended.
     *
     * @zh
     * 是否开启滚动惯性。
     */
    @serializable
    @displayOrder(2)
    @tooltip('i18n:scrollview.inertia')
    public inertia = true;

    /**
     * @en
     * This is a reference to the UI element to be scrolled.
     *
     * @zh
     * 可滚动展示内容的节点。
     */
    @type(Node)
    @displayOrder(5)
    @tooltip('i18n:scrollview.content')
    get content (): Node | null {
        return this._content;
    }
    set content (value) {
        if (this._content === value) {
            return;
        }
        const viewTrans = value && value.parent && value.parent._uiProps.uiTransformComp;
        if (value && (!value || !viewTrans)) {
            logID(4302);
            return;
        }

        this._content = value;
        this._calculateBoundary();
    }

    /**
     * @en
     * Enable horizontal scroll.
     *
     * @zh
     * 是否开启水平滚动。
     */
    @serializable
    @displayOrder(0)
    @tooltip('i18n:scrollview.horizontal')
    public horizontal = true;

    /**
     * @en
     * The horizontal scrollbar reference.
     * @zh
     * 水平滚动的 ScrollBar。
     */
    @type(ScrollBar)
    @displayOrder(0)
    @tooltip('i18n:scrollview.horizontal_bar')
    get horizontalScrollBar (): ScrollBar | null {
        const horizontalScrollBar = this._horizontalScrollBar;
        if (horizontalScrollBar && !horizontalScrollBar.isValid) {
            errorID(4303, 'horizontal', this.node.name);
        }
        return horizontalScrollBar;
    }

    set horizontalScrollBar (value: ScrollBar | null) {
        if (this._horizontalScrollBar === value) {
            return;
        }

        this._horizontalScrollBar = value;

        if (this._horizontalScrollBar) {
            this._horizontalScrollBar.setScrollView(this);
            this._updateScrollBar(Vec2.ZERO);
        }
    }

    /**
     * @en
     * Enable vertical scroll.
     *
     * @zh
     * 是否开启垂直滚动。
     */
    @serializable
    @displayOrder(1)
    @tooltip('i18n:scrollview.vertical')
    public vertical = true;

    /**
     * @en
     * The vertical scrollbar reference.
     *
     * @zh
     * 垂直滚动的 ScrollBar。
     */
    @type(ScrollBar)
    @displayOrder(1)
    @tooltip('i18n:scrollview.vertical_bar')
    get verticalScrollBar (): ScrollBar | null {
        const verticalScrollBar = this._verticalScrollBar;
        if (verticalScrollBar && !verticalScrollBar.isValid) {
            errorID(4303, 'vertical', this.node.name);
        }
        return verticalScrollBar;
    }

    set verticalScrollBar (value: ScrollBar | null) {
        if (this._verticalScrollBar === value) {
            return;
        }

        this._verticalScrollBar = value;

        if (this._verticalScrollBar) {
            this._verticalScrollBar.setScrollView(this);
            this._updateScrollBar(Vec2.ZERO);
        }
    }

    /**
     * @en
     * If cancelInnerEvents is set to true, the scroll behavior will cancel touch events on inner content nodes
     * It's set to true by default.
     *
     * @zh
     * 如果这个属性被设置为 true，那么滚动行为会取消子节点上注册的触摸事件，默认被设置为 true。<br/>
     * 注意，子节点上的 touchstart 事件仍然会触发，触点移动距离非常短的情况下 touchmove 和 touchend 也不会受影响。
     */
    @serializable
    @displayOrder(9)
    @tooltip('i18n:scrollview.cancelInnerEvents')
    public cancelInnerEvents = true;

    /**
     * @en
     * ScrollView events callback.
     *
     * @zh
     * 滚动视图的事件回调函数。
     */
    @type([ComponentEventHandler])
    @serializable
    @displayOrder(10)
    @tooltip('i18n:scrollview.scrollEvents')
    public scrollEvents: ComponentEventHandler[] = [];

    /**
     * @en The display view in the scroll view component.
     * @zh scroll view 组件中的显示区域。
     */
    get view (): UITransform | null {
        const parent = this._content && this._content.parent;
        if (!parent) {
            return null;
        }
        return parent._uiProps.uiTransformComp;
    }

    protected _autoScrolling = false;
    protected _scrolling = false;
    @serializable
    protected _content: Node | null = null;
    @serializable
    protected _horizontalScrollBar: ScrollBar | null = null;
    @serializable
    protected _verticalScrollBar: ScrollBar | null = null;

    protected _topBoundary = 0;
    protected _bottomBoundary = 0;
    protected _leftBoundary = 0;
    protected _rightBoundary = 0;

    protected _touchMoveDisplacements: Vec3[] = [];
    protected _touchMoveTimeDeltas: number[] = [];
    protected _touchMovePreviousTimestamp = 0;
    protected _touchMoved = false;
    protected _autoScrollAttenuate = false;
    protected _autoScrollStartPosition = new Vec3();
    protected _autoScrollTargetDelta = new Vec3();
    protected _autoScrollTotalTime = 0;
    protected _autoScrollAccumulatedTime = 0;
    protected _autoScrollCurrentlyOutOfBoundary = false;
    protected _autoScrollBraking = false;
    protected _autoScrollBrakingStartPosition = new Vec3();

    protected _outOfBoundaryAmount = new Vec3();
    protected _outOfBoundaryAmountDirty = true;
    protected _stopMouseWheel = false;
    protected _mouseWheelEventElapsedTime = 0.0;
    protected _isScrollEndedWithThresholdEventFired = false;
    // use bit wise operations to indicate the direction
    protected _scrollEventEmitMask = 0;
    protected _isBouncing = false;
    protected _contentPos = new Vec3();
    protected _deltaPos = new Vec3();
    protected _deltaAmount = new Vec3();

    protected _hoverIn: XrhoverType = XrhoverType.NONE;

    constructor () {
        super();
    }

    /**
     * @en
     * Scroll the content to the bottom boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图底部。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true) @zh 滚动加速是否衰减，默认为 true
     * @example
     * ```ts
     * // Scroll to the bottom of the view.
     * scrollView.scrollToBottom(0.1);
     * ```
     */
    public scrollToBottom (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(0, 0, false, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta, true);
        }
    }

    /**
     * @en
     * Scroll the content to the top boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图顶部。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true
     * @example
     * ```ts
     * // Scroll to the top of the view.
     * scrollView.scrollToTop(0.1);
     * ```
     */
    public scrollToTop (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(0, 1, false, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the left boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图左边。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the left of the view.
     * scrollView.scrollToLeft(0.1);
     * ```
     */
    public scrollToLeft (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(0, 0, true, false);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the right boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图右边。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the right of the view.
     * scrollView.scrollToRight(0.1);
     * ```
     */
    public scrollToRight (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(1, 0, true, false);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the top left boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图左上角。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the upper left corner of the view.
     * scrollView.scrollToTopLeft(0.1);
     * ```
     */
    public scrollToTopLeft (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(0, 1, true, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the top right boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图右上角。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the top right corner of the view.
     * scrollView.scrollToTopRight(0.1);
     * ```
     */
    public scrollToTopRight (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(1, 1, true, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the bottom left boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图左下角。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the lower left corner of the view.
     * scrollView.scrollToBottomLeft(0.1);
     * ```
     */
    public scrollToBottomLeft (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(0, 0, true, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the bottom right boundary of ScrollView.
     *
     * @zh
     * 视图内容将在规定时间内滚动到视图右下角。
     *
     * @param timeInSecond
     * @en The rolling time(in seconds). If time is up, the content will slide to the bottom border. @zh 滚动时间（s）。 如果超时，内容将立即跳到底部边界。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to the lower right corner of the view.
     * scrollView.scrollToBottomRight(0.1);
     * ```
     */
    public scrollToBottomRight (timeInSecond?: number, attenuated = true): void {
        assignMoveDeltaOption(1, 0, true, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll with an offset related to the ScrollView's top left origin, if timeInSecond is omitted,
     * then it will jump to the specific offset immediately.
     *
     * @zh
     * 视图内容在规定时间内将滚动到 ScrollView 相对左上角原点的偏移位置, 如果 timeInSecond 参数不传，则立即滚动到指定偏移位置。
     *
     * @param offset
     * @en After scrolling the view, the position of the view content relative to the view window. @zh 滚动视图后，视图内容（content）相对于视图窗口（viewport）的位置。
     * @param timeInSecond
     * @en Scroll time (s). If it times out, the content immediately jumps to the specified offset. @zh 滚动时间（s）。 如果超时，内容将立即跳到指定偏移量处。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to middle position in 0.1 second in x-axis
     * let maxScrollOffset = this.getMaxScrollOffset();
     * scrollView.scrollToOffset(new Vec2(maxScrollOffset.x / 2, 0), 0.1);
     * ```
     */
    public scrollToOffset (offset: Vec2, timeInSecond?: number, attenuated = true): void {
        const maxScrollOffset = this.getMaxScrollOffset();

        const anchor = v2();
        // if maxScrollOffset is 0, then always align the content's top left origin to the top left corner of its parent
        if (maxScrollOffset.x === 0) {
            anchor.x = 0;
        } else {
            anchor.x = offset.x / maxScrollOffset.x;
        }

        if (maxScrollOffset.y === 0) {
            anchor.y = 1;
        } else {
            anchor.y = (maxScrollOffset.y - offset.y) / maxScrollOffset.y;
        }

        this.scrollTo(anchor, timeInSecond, attenuated);
    }

    /**
     * @en
     * Get the position of the scrolling view relative to the origin in the upper-left corner of the viewport.
     *
     * @zh
     * 获取滚动视图相对于视图窗口左上角原点的位置。
     *
     * @return @en Current rolling offset. @zh 当前滚动偏移量。
     */
    public getScrollOffset (): Vec2 {
        const topDelta = this._getContentTopBoundary() - this._topBoundary;
        const leftDelta = this._getContentLeftBoundary() - this._leftBoundary;

        return new Vec2(leftDelta, topDelta);
    }

    /**
     * @en
     * Get the maximize available  scroll offset.
     *
     * @zh
     * 获取滚动视图最大可以滚动的偏移量。
     *
     * @return @en Maximum scrollable offset. @zh 最大可滚动偏移量。
     */
    public getMaxScrollOffset (): Vec2 {
        if (!this._content || !this.view) {
            return Vec2.ZERO;
        }
        const contentSize = this._content._uiProps.uiTransformComp!.contentSize;
        let horizontalMaximizeOffset = contentSize.width - this.view.width;
        let verticalMaximizeOffset = contentSize.height - this.view.height;
        horizontalMaximizeOffset = horizontalMaximizeOffset >= 0 ? horizontalMaximizeOffset : 0;
        verticalMaximizeOffset = verticalMaximizeOffset >= 0 ? verticalMaximizeOffset : 0;

        return new Vec2(horizontalMaximizeOffset, verticalMaximizeOffset);
    }

    /**
     * @en
     * Scroll the content to the horizontal percent position of ScrollView.
     *
     * @zh
     * 视图内容在规定时间内将滚动到 ScrollView 水平方向的百分比位置上。
     *
     * @param percent
     * @en Scroll to the destination which is located at the percent interpolation from left border to the right border @zh 滚动到从左到右指定百分比插值的位置
     * @param timeInSecond
     * @en Scroll time (s). If it times out, the content immediately jumps to the specified offset. @zh 滚动时间（s）。 如果超时，内容将立即跳到指定偏移量处。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Scroll to middle position.
     * scrollView.scrollToBottomRight(0.5, 0.1);
     * ```
     */
    public scrollToPercentHorizontal (percent: number, timeInSecond: number, attenuated: boolean): void {
        assignMoveDeltaOption(percent, 0, true, false);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the percent position of ScrollView in any direction.
     *
     * @zh
     * 视图内容在规定时间内进行垂直方向和水平方向的滚动，并且滚动到指定百分比位置上。
     *
     * @param anchor
     * @en Scroll to the destination which is located at the anchor interpolation from left/top border to the right/bottom border.
     * @zh 滚动到从左/上到右/下指定锚点对应分量插值的位置。
     * @param timeInSecond
     * @en Scroll time (s). If it times out, the content immediately jumps to the specified offset. @zh 滚动时间（s）。 如果超时，内容将立即跳到指定偏移量处。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * // Vertical scroll to the bottom of the view.
     * scrollView.scrollTo(new Vec2(0, 1), 0.1);
     *
     * // Horizontal scroll to view right.
     * scrollView.scrollTo(new Vec2(1, 0), 0.1);
     * ```
     */
    public scrollTo (anchor: Vec2, timeInSecond?: number, attenuated?: boolean): void {
        assignMoveDeltaOption(anchor.x, anchor.y, true, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Scroll the content to the vertical percent position of ScrollView.
     *
     * @zh
     * 视图内容在规定时间内滚动到 ScrollView 垂直方向的百分比位置上。
     *
     * @param percent
     * @en Scroll to the destination which is located at the percent interpolation from top border to the bottom border. @zh 滚动到从上到下指定百分比插值的位置。
     * @param timeInSecond
     * @en Scroll time (s). If it times out, the content immediately jumps to the specified offset. @zh 滚动时间（s）。 如果超时，内容将立即跳到指定偏移量处。
     * @param attenuated @en Whether the rolling acceleration is attenuated(The default is true). @zh 滚动加速是否衰减，默认为 true。
     * @example
     * ```ts
     * scrollView.scrollToPercentVertical(0.5, 0.1);
     * ```
     */
    public scrollToPercentVertical (percent: number, timeInSecond?: number, attenuated?: boolean): void {
        assignMoveDeltaOption(0, percent, false, true);
        const moveDelta = this._calculateMovePercentDelta(_moveDeltaOptions);

        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    /**
     * @en
     * Stop auto scroll immediately.
     *
     * @zh
     * 停止自动滚动, 调用此 API 可以让 ScrollView 立即停止滚动。
     */
    public stopAutoScroll (): void {
        this._autoScrolling = false;
        this._autoScrollAccumulatedTime = this._autoScrollTotalTime;
    }

    /**
     * @en
     * Modify the content position.
     *
     * @zh
     * 设置当前视图内容的坐标点。
     *
     * @param position @en Current content position. @zh 希望设置内容框体的位置。
     * @deprecated Since 3.1.0, setContentPosition is deprecated, please use scrollToOffset instead.
     */
    public setContentPosition (position: Vec3): void {
        this._setContentPosition(position);
    }

    private _setContentPosition (position: Readonly<Vec3>): void {
        if (!this._content) {
            return;
        }
        const contentPos = this._getContentPosition();
        if (Math.abs(position.x - contentPos.x) < EPSILON && Math.abs(position.y - contentPos.y) < EPSILON) {
            return;
        }

        this._content.setPosition(position);
        this._outOfBoundaryAmountDirty = true;
    }

    /**
     * @en
     * Query the content's position in its parent space.
     *
     * @zh
     * 获取当前视图内容的坐标点。
     *
     * @returns @en current content position. @zh 当前视图内容的坐标点。
     * @deprecated Since 3.1.0, getContentPosition is deprecated.
     */
    public getContentPosition (): Vec3 {
        return this._getContentPosition();
    }

    private _getContentPosition (): Vec3 {
        if (!this._content) {
            return Vec3.ZERO.clone();
        }

        this._contentPos.set(this._content.position);
        return this._contentPos;
    }

    /**
     * @en
     * Query whether the user is currently dragging the ScrollView to scroll it.
     *
     * @zh
     * 用户是否在拖拽当前滚动视图。
     *
     * @returns @en If or not the current scrolling view is being dragged.  @zh 是否在拖拽当前滚动视图。
     */
    public isScrolling (): boolean {
        return this._scrolling;
    }

    /**
     * @en
     * Query whether the ScrollView is currently scrolling because of a bounceback or inertia slowdown.
     *
     * @zh
     * 当前滚动视图是否在惯性滚动。
     *
     * @returns @en Whether the scrolling view is scrolling inertially.  @zh 滚动视图是否在惯性滚动。
     */
    public isAutoScrolling (): boolean {
        return this._autoScrolling;
    }

    /**
     * @en Get the minimum precision time of the end-of-scroll event.
     * @zh 获得滚动结束的事件的最小精度时间。
     * @returns @en Minimum time. @zh 最小时间。
     */
    public getScrollEndedEventTiming (): number {
        return EPSILON;
    }

    public start (): void {
        this._calculateBoundary();
        // Because widget component will adjust content position and scrollView position is correct after visit
        // So this event could make sure the content is on the correct position after loading.
        if (this._content) {
            director.once(DirectorEvent.BEFORE_DRAW, this._adjustContentOutOfBoundary, this);
        }
    }

    public onEnable (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const  self = this;

        if (!EDITOR_NOT_IN_PREVIEW) {
            self._registerEvent();
            const content = this._content;
            if (content) {
                content.on(NodeEventType.SIZE_CHANGED, self._calculateBoundary, self);
                content.on(NodeEventType.TRANSFORM_CHANGED, self._scaleChanged, self);

                const view = self.view;
                if (view) {
                    view.node.on(NodeEventType.TRANSFORM_CHANGED, self._scaleChanged, self);
                    view.node.on(NodeEventType.SIZE_CHANGED, self._calculateBoundary, self);
                }
            }

            self._calculateBoundary();
        }
        self._updateScrollBarState();
    }

    public update (dt: number): void {
        const deltaAmount = this._deltaAmount;
        if (this._autoScrolling) {
            this._processAutoScrolling(dt);
            deltaAmount.x = 0;
            deltaAmount.y = 0;
        } else if (deltaAmount.x !== 0 || deltaAmount.y !== 0) {
            this._processDeltaMove(deltaAmount);
            deltaAmount.x = 0;
            deltaAmount.y = 0;
        }
    }

    public onDisable (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!EDITOR_NOT_IN_PREVIEW) {
            self._unregisterEvent();

            const content = self.content;
            if (content) {
                content.off(NodeEventType.SIZE_CHANGED, self._calculateBoundary, self);
                content.off(NodeEventType.TRANSFORM_CHANGED, self._scaleChanged, self);

                const view = self.view;
                if (view) {
                    view.node.off(NodeEventType.TRANSFORM_CHANGED, self._scaleChanged, self);
                    view.node.off(NodeEventType.SIZE_CHANGED, self._calculateBoundary, self);
                }
            }
        }
        self._deltaAmount.set(0, 0);
        self._hideScrollBar();
        self.stopAutoScroll();
    }

    // private methods
    protected _registerEvent (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const node = self.node;
        node.on(NodeEventType.TOUCH_START, self._onTouchBegan, self, true);
        node.on(NodeEventType.TOUCH_MOVE, self._onTouchMoved, self, true);
        node.on(NodeEventType.TOUCH_END, self._onTouchEnded, self, true);
        node.on(NodeEventType.TOUCH_CANCEL, self._onTouchCancelled, self, true);
        node.on(NodeEventType.MOUSE_WHEEL, self._onMouseWheel, self, true);

        node.on(XrUIPressEventType.XRUI_HOVER_ENTERED, self._xrHoverEnter, self);
        node.on(XrUIPressEventType.XRUI_HOVER_EXITED, self._xrHoverExit, self);

        input.on(InputEventType.HANDLE_INPUT, self._dispatchEventHandleInput, self);
        input.on(InputEventType.GAMEPAD_INPUT, self._dispatchEventHandleInput, self);
    }

    protected _unregisterEvent (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const node = self.node;
        node.off(NodeEventType.TOUCH_START, self._onTouchBegan, self, true);
        node.off(NodeEventType.TOUCH_MOVE, self._onTouchMoved, self, true);
        node.off(NodeEventType.TOUCH_END, self._onTouchEnded, self, true);
        node.off(NodeEventType.TOUCH_CANCEL, self._onTouchCancelled, self, true);
        node.off(NodeEventType.MOUSE_WHEEL, self._onMouseWheel, self, true);

        node.off(XrUIPressEventType.XRUI_HOVER_ENTERED, self._xrHoverEnter, self);
        node.off(XrUIPressEventType.XRUI_HOVER_EXITED, self._xrHoverExit, self);
        input.off(InputEventType.HANDLE_INPUT, self._dispatchEventHandleInput, self);
        input.off(InputEventType.GAMEPAD_INPUT, self._dispatchEventHandleInput, self);
    }

    protected _onMouseWheel (event: EventMouse, captureListeners?: Node[]): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (self.enabledInHierarchy) {
            return;
        }

        if (self._hasNestedViewGroup(event, captureListeners)) {
            return;
        }

        const deltaMove = new Vec3();
        const wheelPrecision = -0.1;
        const scrollY = event.getScrollY();
        if (self.vertical) {
            deltaMove.set(0, scrollY * wheelPrecision, 0);
        } else if (self.horizontal) {
            deltaMove.set(scrollY * wheelPrecision, 0, 0);
        }

        self._mouseWheelEventElapsedTime = 0;
        self._deltaAmount.add(deltaMove);

        if (!self._stopMouseWheel) {
            self._handlePressLogic();
            self.schedule(this._checkMouseWheel, 1.0 / 60);
            self._stopMouseWheel = true;
        }

        self._stopPropagationIfTargetIsMe(event);
    }

    protected _onTouchBegan (event: EventTouch, captureListeners?: Node[]): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.enabledInHierarchy || !self._content) {
            return;
        }
        if (self._hasNestedViewGroup(event, captureListeners)) {
            return;
        }

        self._handlePressLogic();

        self._touchMoved = false;
        self._stopPropagationIfTargetIsMe(event);
    }

    protected _onTouchMoved (event: EventTouch, captureListeners?: Node[]): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.enabledInHierarchy || !self._content) {
            return;
        }
        if (self._hasNestedViewGroup(event, captureListeners)) {
            return;
        }

        const touch = event.touch!;
        self._handleMoveLogic(touch);

        // Do not prevent touch events in inner nodes
        if (!self.cancelInnerEvents) {
            return;
        }

        const deltaMove = touch.getUILocation(_tempVec2);
        deltaMove.subtract(touch.getUIStartLocation(_tempVec2_1));
        // FIXME: touch move delta should be calculated by DPI.
        if (deltaMove.length() > 7) {
            if (!self._touchMoved && event.target !== self.node) {
                // Simulate touch cancel for target node
                const cancelEvent = new EventTouch(event.getTouches(), event.bubbles, SystemEventType.TOUCH_CANCEL);
                cancelEvent.touch = event.touch;
                cancelEvent.simulate = true;
                (event.target as Node).dispatchEvent(cancelEvent);
                self._touchMoved = true;
            }
        }
        self._stopPropagationIfTargetIsMe(event);
    }

    protected _onTouchEnded (event: EventTouch, captureListeners?: Node[]): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.enabledInHierarchy || !self._content || !event) {
            return;
        }
        if (self._hasNestedViewGroup(event, captureListeners)) {
            return;
        }

        self._dispatchEvent(ScrollViewEventType.TOUCH_UP);

        const touch = event.touch!;
        self._handleReleaseLogic(touch);

        if (self._touchMoved) {
            event.propagationStopped = true;
        } else {
            self._stopPropagationIfTargetIsMe(event);
        }
    }

    protected _onTouchCancelled (event: EventTouch, captureListeners?: Node[]): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.enabledInHierarchy || !self._content) {
            return;
        }
        if (self._hasNestedViewGroup(event, captureListeners)) {
            return;
        }

        // Filter touch cancel event send from self
        if (event && !event.simulate) {
            self._handleReleaseLogic(event.touch!);
        }
        self._stopPropagationIfTargetIsMe(event);
    }

    protected _calculateBoundary (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (self._content && self.view) {
            // refresh content size
            const layout = self._content.getComponent(Layout);
            if (layout && layout.enabledInHierarchy) {
                layout.updateLayout();
            }
            const viewTrans = self.view;

            const anchorX = viewTrans.width * viewTrans.anchorX;
            const anchorY = viewTrans.height * viewTrans.anchorY;

            self._leftBoundary = -anchorX;
            self._bottomBoundary = -anchorY;

            self._rightBoundary = self._leftBoundary + viewTrans.width;
            self._topBoundary = self._bottomBoundary + viewTrans.height;

            self._moveContentToTopLeft(viewTrans.contentSize);
        }
    }

    protected _hasNestedViewGroup (event: Event, captureListeners?: Node[]): boolean {
        if (!event || event.eventPhase !== Event.CAPTURING_PHASE) {
            return false;
        }

        if (captureListeners) {
            // captureListeners are arranged from child to parent
            for (const listener of captureListeners) {
                if (this.node === listener) {
                    if (event.target && (event.target as Node).getComponent(ViewGroup)) {
                        return true;
                    }
                    return false;
                }

                if (listener.getComponent(ViewGroup)) {
                    return true;
                }
            }
        }
        return false;
    }

    protected _startInertiaScroll (touchMoveVelocity: Vec3): void {
        const inertiaTotalMovement = new Vec3(touchMoveVelocity);
        inertiaTotalMovement.multiplyScalar(MOVEMENT_FACTOR);
        this._startAttenuatingAutoScroll(inertiaTotalMovement, touchMoveVelocity);
    }

    protected _calculateAttenuatedFactor (distance: number): number {
        if (this.brake <= 0) {
            return 1 - this.brake;
        }

        // attenuate formula from: http://learnopengl.com/#!Lighting/Light-casters
        return (1 - this.brake) * (1 / (1 + distance * 0.000014 + distance * distance * 0.000000008));
    }

    protected _startAttenuatingAutoScroll (deltaMove: Vec3, initialVelocity: Vec3): void {
        const targetDelta = deltaMove.clone();
        targetDelta.normalize();
        if (this._content && this.view) {
            const contentSize = this._content._uiProps.uiTransformComp!.contentSize;
            const scrollViewSize = this.view.contentSize;

            const totalMoveWidth = contentSize.width - scrollViewSize.width;
            const totalMoveHeight = contentSize.height - scrollViewSize.height;

            const attenuatedFactorX = this._calculateAttenuatedFactor(totalMoveWidth);
            const attenuatedFactorY = this._calculateAttenuatedFactor(totalMoveHeight);

            targetDelta.x = targetDelta.x * totalMoveWidth * (1 - this.brake) * attenuatedFactorX;
            targetDelta.y = targetDelta.y * totalMoveHeight * attenuatedFactorY * (1 - this.brake);
            targetDelta.z = 0;
        }

        const originalMoveLength = deltaMove.length();
        let factor = targetDelta.length() / originalMoveLength;

        if (this.brake > 0 && factor > 7) {
            factor = Math.sqrt(factor);
            targetDelta.set(deltaMove);
            targetDelta.multiplyScalar(factor + 1);
        } else {
            targetDelta.add(deltaMove);
        }

        let time = this._calculateAutoScrollTimeByInitialSpeed(initialVelocity.length());
        if (this.brake > 0 && factor > 3) {
            factor = 3;
            time *= factor;
        }

        if (this.brake === 0 && factor > 1) {
            time *= factor;
        }

        this._startAutoScroll(targetDelta, time, true);
    }

    protected _calculateAutoScrollTimeByInitialSpeed (initialSpeed: number): number {
        return Math.sqrt(Math.sqrt(initialSpeed / 5));
    }

    protected _startAutoScroll (deltaMove: Vec3, timeInSecond: number, attenuated = false): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const adjustedDeltaMove = self._flattenVectorByDirection(deltaMove);

        self._autoScrolling = true;
        self._autoScrollTargetDelta = adjustedDeltaMove;
        self._autoScrollAttenuate = attenuated;
        Vec3.copy(self._autoScrollStartPosition, self._getContentPosition());
        self._autoScrollTotalTime = timeInSecond;
        self._autoScrollAccumulatedTime = 0;
        self._autoScrollBraking = false;
        self._isScrollEndedWithThresholdEventFired = false;
        self._autoScrollBrakingStartPosition.set(0, 0, 0);

        const currentOutOfBoundary = self._getHowMuchOutOfBoundary();
        if (!currentOutOfBoundary.equals(Vec3.ZERO, EPSILON)) {
            this._autoScrollCurrentlyOutOfBoundary = true;
        }
    }

    protected _calculateTouchMoveVelocity (): Vec3 {
        const out = new Vec3();
        let totalTime = 0;
        totalTime = this._touchMoveTimeDeltas.reduce((a, b) => a + b, totalTime);

        if (totalTime <= 0 || totalTime >= 0.5) {
            out.set(Vec3.ZERO);
        } else {
            let totalMovement = new Vec3();
            totalMovement = this._touchMoveDisplacements.reduce((a, b) => {
                a.add(b);
                return a;
            }, totalMovement);

            // eslint-disable-next-line function-paren-newline
            out.set(totalMovement.x * (1 - this.brake) / totalTime,
                totalMovement.y * (1 - this.brake) / totalTime,
                totalMovement.z,
            );
        }
        return out;
    }

    protected _flattenVectorByDirection (vector: Vec3): Vec3 {
        if (!this.horizontal) vector.x = 0;
        if (!this.vertical) vector.y = 0;
        return vector;
    }

    protected _moveContent (deltaMove: Vec3, canStartBounceBack?: boolean): void {
        const adjustedMove = this._flattenVectorByDirection(deltaMove);
        _tempVec3.set(this._getContentPosition());
        _tempVec3.add(adjustedMove);
        _tempVec3.set(Math.round(_tempVec3.x * TOLERANCE) * EPSILON, Math.round(_tempVec3.y * TOLERANCE) * EPSILON, _tempVec3.z);
        this._setContentPosition(_tempVec3);
        const outOfBoundary = this._getHowMuchOutOfBoundary();
        _tempVec2.set(outOfBoundary.x, outOfBoundary.y);
        this._updateScrollBar(_tempVec2);

        if (this.elastic && canStartBounceBack) {
            this._startBounceBackIfNeeded();
        }
    }

    protected _getContentLeftBoundary (): number {
        if (!this._content) {
            return -1;
        }
        const contentPos = this._getContentPosition();
        const uiTrans = this._content._uiProps.uiTransformComp!;
        return contentPos.x - uiTrans.anchorX * uiTrans.width;
    }

    protected _getContentRightBoundary (): number {
        if (!this._content) {
            return -1;
        }
        const uiTrans = this._content._uiProps.uiTransformComp!;
        return this._getContentLeftBoundary() + uiTrans.width;
    }

    protected _getContentTopBoundary (): number {
        if (!this._content) {
            return -1;
        }
        const uiTrans = this._content._uiProps.uiTransformComp!;
        return this._getContentBottomBoundary() + uiTrans.height;
    }

    protected _getContentBottomBoundary (): number {
        if (!this._content) {
            return -1;
        }
        const contentPos = this._getContentPosition();
        const uiTrans = this._content._uiProps.uiTransformComp!;
        return contentPos.y - uiTrans.anchorY * uiTrans.height;
    }

    protected _getHowMuchOutOfBoundary (addition?: Vec3): Vec3 {
        addition = addition || new Vec3();
        if (addition.equals(Vec3.ZERO, EPSILON) && !this._outOfBoundaryAmountDirty) {
            return this._outOfBoundaryAmount;
        }

        const outOfBoundaryAmount = new Vec3();
        const tempLeftBoundary: number = this._getContentLeftBoundary();
        const tempRightBoundary: number = this._getContentRightBoundary();
        if (tempLeftBoundary + addition.x > this._leftBoundary) {
            outOfBoundaryAmount.x = this._leftBoundary - (tempLeftBoundary + addition.x);
        } else if (tempRightBoundary + addition.x < this._rightBoundary) {
            outOfBoundaryAmount.x = this._rightBoundary - (tempRightBoundary + addition.x);
        }

        const tempTopBoundary: number = this._getContentTopBoundary();
        const tempBottomBoundary: number = this._getContentBottomBoundary();
        if (tempTopBoundary + addition.y < this._topBoundary) {
            outOfBoundaryAmount.y = this._topBoundary - (tempTopBoundary + addition.y);
        } else if (tempBottomBoundary + addition.y > this._bottomBoundary) {
            outOfBoundaryAmount.y = this._bottomBoundary - (tempBottomBoundary + addition.y);
        }

        if (addition.equals(Vec3.ZERO, EPSILON)) {
            this._outOfBoundaryAmount = outOfBoundaryAmount;
            this._outOfBoundaryAmountDirty = false;
        }

        this._clampDelta(outOfBoundaryAmount);
        return outOfBoundaryAmount;
    }

    protected _updateScrollBar (outOfBoundary: Vec2 | Readonly<Vec2>): void {
        if (this._horizontalScrollBar && this._horizontalScrollBar.isValid) {
            this._horizontalScrollBar.onScroll(outOfBoundary);
        }

        if (this._verticalScrollBar && this._verticalScrollBar.isValid) {
            this._verticalScrollBar.onScroll(outOfBoundary);
        }
    }

    protected _onScrollBarTouchBegan (): void {
        if (this._horizontalScrollBar && this._horizontalScrollBar.isValid) {
            this._horizontalScrollBar.onTouchBegan();
        }

        if (this._verticalScrollBar && this._verticalScrollBar.isValid) {
            this._verticalScrollBar.onTouchBegan();
        }
    }

    protected _onScrollBarTouchEnded (): void {
        if (this._horizontalScrollBar && this._horizontalScrollBar.isValid) {
            this._horizontalScrollBar.onTouchEnded();
        }

        if (this._verticalScrollBar && this._verticalScrollBar.isValid) {
            this._verticalScrollBar.onTouchEnded();
        }
    }

    protected _dispatchEvent (event: string): void {
        if (event === ScrollViewEventType.SCROLL_ENDED as string) {
            this._scrollEventEmitMask = 0;
        } else if (event === ScrollViewEventType.SCROLL_TO_TOP as string
            || event === ScrollViewEventType.SCROLL_TO_BOTTOM as string
            || event === ScrollViewEventType.SCROLL_TO_LEFT as string
            || event === ScrollViewEventType.SCROLL_TO_RIGHT as string) {
            const flag = 1 << eventMap[event];
            if (this._scrollEventEmitMask & flag) {
                return;
            } else {
                this._scrollEventEmitMask |= flag;
            }
        }

        ComponentEventHandler.emitEvents(this.scrollEvents, this, eventMap[event]);
        this.node.emit(event, this);
    }

    protected _adjustContentOutOfBoundary (): void {
        if (!this._content) {
            return;
        }

        this._outOfBoundaryAmountDirty = true;
        const outOfBoundary = this._getHowMuchOutOfBoundary();
        const _isOutOfBoundary = !outOfBoundary.equals(Vec3.ZERO, EPSILON);
        if (_isOutOfBoundary) {
            _tempVec3.set(this._getContentPosition());
            _tempVec3.add(outOfBoundary);
            this._setContentPosition(_tempVec3);
            this._updateScrollBar(Vec2.ZERO);
        }
    }

    protected _hideScrollBar (): void {
        if (this._horizontalScrollBar && this._horizontalScrollBar.isValid) {
            this._horizontalScrollBar.hide();
        }

        if (this._verticalScrollBar && this._verticalScrollBar.isValid) {
            this._verticalScrollBar.hide();
        }
    }

    protected _updateScrollBarState (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self._content || !self.view) {
            return;
        }
        const viewTrans = self.view;
        const uiTrans = self._content._uiProps.uiTransformComp!;

        const verticalScrollBar = self._verticalScrollBar;
        if (verticalScrollBar && verticalScrollBar.isValid) {
            if (uiTrans.height < viewTrans.height || approx(uiTrans.height, viewTrans.height)) {
                verticalScrollBar.hide();
            } else {
                verticalScrollBar.show();
            }
        }

        const horizontalScrollBar = self._horizontalScrollBar;
        if (horizontalScrollBar && horizontalScrollBar.isValid) {
            if (uiTrans.width < viewTrans.width || approx(uiTrans.width, viewTrans.width)) {
                horizontalScrollBar.hide();
            } else {
                horizontalScrollBar.show();
            }
        }
    }

    // This is for ScrollView as children of a Button
    protected _stopPropagationIfTargetIsMe (event: Event): void {
        if (event.eventPhase === Event.AT_TARGET && event.target === this.node) {
            event.propagationStopped = true;
        }
    }

    protected _processDeltaMove (deltaMove: Vec3): void {
        this._scrollChildren(deltaMove);
        this._gatherTouchMove(deltaMove);
    }

    protected _handleMoveLogic (touch: Touch): void {
        this._getLocalAxisAlignDelta(this._deltaPos, touch);
        this._deltaAmount.add(this._deltaPos);
    }

    protected _handleReleaseLogic (touch: Touch): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        self._getLocalAxisAlignDelta(self._deltaPos, touch);
        self._gatherTouchMove(self._deltaPos);
        self._processInertiaScroll();

        if (self._scrolling) {
            self._scrolling = false;
            if (!self._autoScrolling) {
                self._dispatchEvent(ScrollViewEventType.SCROLL_ENDED);
            }
        }
    }

    protected _getLocalAxisAlignDelta (out: Vec3, touch: Touch): void {
        const uiTransformComp = this.node._uiProps.uiTransformComp;

        if (uiTransformComp) {
            touch.getUILocation(_tempVec2);
            touch.getUIPreviousLocation(_tempVec2_1);
            _tempVec3.set(_tempVec2.x, _tempVec2.y, 0);
            _tempVec3_1.set(_tempVec2_1.x, _tempVec2_1.y, 0);
            uiTransformComp.convertToNodeSpaceAR(_tempVec3, _tempVec3);
            uiTransformComp.convertToNodeSpaceAR(_tempVec3_1, _tempVec3_1);
            Vec3.subtract(out, _tempVec3, _tempVec3_1);
        }
    }

    protected _scrollChildren (deltaMove: Vec3): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        self._clampDelta(deltaMove);

        const realMove = deltaMove;
        let outOfBoundary: Vec3;
        if (self.elastic) {
            outOfBoundary = self._getHowMuchOutOfBoundary();
            realMove.x *= outOfBoundary.x === 0 ? 1 : 0.5;
            realMove.y *= outOfBoundary.y === 0 ? 1 : 0.5;
        }

        if (!self.elastic) {
            outOfBoundary = self._getHowMuchOutOfBoundary(realMove);
            realMove.add(outOfBoundary);
        }

        let verticalScrollEventType: ScrollViewEventType = ScrollViewEventType.NONE;
        let horizontalScrollEventType: ScrollViewEventType = ScrollViewEventType.NONE;
        if (self._content) {
            const { anchorX, anchorY, width, height } = self._content._uiProps.uiTransformComp!;
            const pos = self._content.position || Vec3.ZERO;

            if (self.vertical) {
                if (realMove.y > 0) { // up
                    const icBottomPos = pos.y - anchorY * height;

                    if (icBottomPos + realMove.y >= self._bottomBoundary) {
                        verticalScrollEventType = ScrollViewEventType.SCROLL_TO_BOTTOM;
                    }
                } else if (realMove.y < 0) { // down
                    const icTopPos = pos.y - anchorY * height + height;

                    if (icTopPos + realMove.y <= self._topBoundary) {
                        verticalScrollEventType = ScrollViewEventType.SCROLL_TO_TOP;
                    }
                }
            }

            if (self.horizontal) {
                if (realMove.x < 0) { // left
                    const icRightPos = pos.x - anchorX * width + width;
                    if (icRightPos + realMove.x <= self._rightBoundary) {
                        horizontalScrollEventType = ScrollViewEventType.SCROLL_TO_RIGHT;
                    }
                } else if (realMove.x > 0) { // right
                    const icLeftPos = pos.x - anchorX * width;
                    if (icLeftPos + realMove.x >= self._leftBoundary) {
                        horizontalScrollEventType = ScrollViewEventType.SCROLL_TO_LEFT;
                    }
                }
            }
        }

        self._moveContent(realMove, false);

        if ((self.horizontal && realMove.x !== 0) || (self.vertical && realMove.y !== 0)) {
            if (!self._scrolling) {
                self._scrolling = true;
                self._dispatchEvent(ScrollViewEventType.SCROLL_BEGAN);
            }
            self._dispatchEvent(ScrollViewEventType.SCROLLING);
        }

        if (verticalScrollEventType !== ScrollViewEventType.NONE) {
            self._dispatchEvent(verticalScrollEventType);
        }
        if (horizontalScrollEventType !== ScrollViewEventType.NONE) {
            self._dispatchEvent(horizontalScrollEventType);
        }
    }

    protected _handlePressLogic (): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (self._autoScrolling) {
            self._dispatchEvent(ScrollViewEventType.SCROLL_ENDED);
        }

        self._autoScrolling = false;
        self._isBouncing = false;

        self._touchMovePreviousTimestamp = getTimeInMilliseconds();
        self._touchMoveDisplacements.length = 0;
        self._touchMoveTimeDeltas.length = 0;

        self._onScrollBarTouchBegan();
    }

    protected _clampDelta (out: Vec3): void {
        if (this._content && this.view) {
            const scrollViewSize = this.view.contentSize;
            const uiTrans = this._content._uiProps.uiTransformComp!;
            if (uiTrans.width < scrollViewSize.width) {
                out.x = 0;
            }
            if (uiTrans.height < scrollViewSize.height) {
                out.y = 0;
            }
        }
    }

    protected _gatherTouchMove (delta: Vec3): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const clampDt = delta.clone();
        self._clampDelta(clampDt);

        while (self._touchMoveDisplacements.length >= NUMBER_OF_GATHERED_TOUCHES_FOR_MOVE_SPEED) {
            self._touchMoveDisplacements.shift();
            self._touchMoveTimeDeltas.shift();
        }

        self._touchMoveDisplacements.push(clampDt);

        const timeStamp = getTimeInMilliseconds();
        self._touchMoveTimeDeltas.push((timeStamp - self._touchMovePreviousTimestamp) / 1000);
        self._touchMovePreviousTimestamp = timeStamp;
    }

    protected _startBounceBackIfNeeded (): boolean {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.elastic) {
            return false;
        }

        const bounceBackAmount = self._getHowMuchOutOfBoundary();
        self._clampDelta(bounceBackAmount);

        if (bounceBackAmount.equals(Vec3.ZERO, EPSILON)) {
            return false;
        }

        const bounceBackTime = Math.max(self.bounceDuration, 0);
        self._startAutoScroll(bounceBackAmount, bounceBackTime, true);

        if (!self._isBouncing) {
            if (bounceBackAmount.y > 0) {
                self._dispatchEvent(ScrollViewEventType.BOUNCE_TOP);
            }
            if (bounceBackAmount.y < 0) {
                self._dispatchEvent(ScrollViewEventType.BOUNCE_BOTTOM);
            }
            if (bounceBackAmount.x > 0) {
                self._dispatchEvent(ScrollViewEventType.BOUNCE_RIGHT);
            }
            if (bounceBackAmount.x < 0) {
                self._dispatchEvent(ScrollViewEventType.BOUNCE_LEFT);
            }
            self._isBouncing = true;
        }

        return true;
    }

    protected _processInertiaScroll (): void {
        const bounceBackStarted = this._startBounceBackIfNeeded();
        if (!bounceBackStarted && this.inertia) {
            const touchMoveVelocity = this._calculateTouchMoveVelocity();
            if (!touchMoveVelocity.equals(_tempVec3, EPSILON) && this.brake < 1) {
                this._startInertiaScroll(touchMoveVelocity);
            }
        }

        this._onScrollBarTouchEnded();
    }

    protected _isOutOfBoundary (): boolean {
        const outOfBoundary = this._getHowMuchOutOfBoundary();
        return !outOfBoundary.equals(Vec3.ZERO, EPSILON);
    }

    protected _isNecessaryAutoScrollBrake (): boolean {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (self._autoScrollBraking) {
            return true;
        }

        if (self._isOutOfBoundary()) {
            if (!self._autoScrollCurrentlyOutOfBoundary) {
                self._autoScrollCurrentlyOutOfBoundary = true;
                self._autoScrollBraking = true;
                Vec3.copy(self._autoScrollBrakingStartPosition, self._getContentPosition());
                return true;
            }
        } else {
            self._autoScrollCurrentlyOutOfBoundary = false;
        }

        return false;
    }

    protected _processAutoScrolling (dt): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const isAutoScrollBrake = self._isNecessaryAutoScrollBrake();
        const brakingFactor = isAutoScrollBrake ? OUT_OF_BOUNDARY_BREAKING_FACTOR : 1;
        self._autoScrollAccumulatedTime += dt * (1 / brakingFactor);

        let percentage = Math.min(1, self._autoScrollAccumulatedTime / self._autoScrollTotalTime);
        if (self._autoScrollAttenuate) {
            percentage = quintEaseOut(percentage);
        }

        const clonedAutoScrollTargetDelta = self._autoScrollTargetDelta.clone();
        clonedAutoScrollTargetDelta.multiplyScalar(percentage);
        const clonedAutoScrollStartPosition = self._autoScrollStartPosition.clone();
        clonedAutoScrollStartPosition.add(clonedAutoScrollTargetDelta);
        let reachedEnd = Math.abs(percentage - 1) <= EPSILON;

        const fireEvent = Math.abs(percentage - 1) <= self.getScrollEndedEventTiming();
        if (fireEvent && !self._isScrollEndedWithThresholdEventFired) {
            self._dispatchEvent(ScrollViewEventType.SCROLL_ENG_WITH_THRESHOLD);
            self._isScrollEndedWithThresholdEventFired = true;
        }

        if (self.elastic) {
            const brakeOffsetPosition = clonedAutoScrollStartPosition.clone();
            brakeOffsetPosition.subtract(self._autoScrollBrakingStartPosition);
            if (isAutoScrollBrake) {
                brakeOffsetPosition.multiplyScalar(brakingFactor);
            }
            clonedAutoScrollStartPosition.set(self._autoScrollBrakingStartPosition);
            clonedAutoScrollStartPosition.add(brakeOffsetPosition);
        } else {
            const moveDelta = clonedAutoScrollStartPosition.clone();
            moveDelta.subtract(self.getContentPosition());
            const outOfBoundary = self._getHowMuchOutOfBoundary(moveDelta);
            if (!outOfBoundary.equals(Vec3.ZERO, EPSILON)) {
                clonedAutoScrollStartPosition.add(outOfBoundary);
                reachedEnd = true;
            }
        }

        if (reachedEnd) {
            self._autoScrolling = false;
        }

        const deltaMove = clonedAutoScrollStartPosition.clone();
        deltaMove.subtract(self._getContentPosition());
        self._clampDelta(deltaMove);
        self._moveContent(deltaMove, reachedEnd);
        self._dispatchEvent(ScrollViewEventType.SCROLLING);

        if (!self._autoScrolling) {
            self._isBouncing = false;
            self._scrolling = false;
            self._dispatchEvent(ScrollViewEventType.SCROLL_ENDED);
        }
    }

    protected _checkMouseWheel (dt: number): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const currentOutOfBoundary = self._getHowMuchOutOfBoundary();
        const maxElapsedTime = 0.1;

        if (!currentOutOfBoundary.equals(Vec3.ZERO, EPSILON)) {
            self._processInertiaScroll();
            if (self._scrolling) {
                self._scrolling = false;
                if (!self._autoScrolling) {
                    self._dispatchEvent(ScrollViewEventType.SCROLL_ENDED);
                }
            }
            self.unschedule(self._checkMouseWheel);
            self._stopMouseWheel = false;
            return;
        }

        self._mouseWheelEventElapsedTime += dt;

        // mouse wheel event is ended
        if (self._mouseWheelEventElapsedTime > maxElapsedTime) {
            self._onScrollBarTouchEnded();
            if (self._scrolling) {
                self._scrolling = false;
                if (!self._autoScrolling) {
                    self._dispatchEvent(ScrollViewEventType.SCROLL_ENDED);
                }
            }
            self.unschedule(self._checkMouseWheel);
            self._stopMouseWheel = false;
        }
    }

    protected _calculateMovePercentDelta (options): Vec3 {
        const anchor = options.anchor;
        const applyToHorizontal = options.applyToHorizontal;
        const applyToVertical = options.applyToVertical;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        self._calculateBoundary();

        anchor.clampf(Vec2.ZERO, Vec2.ONE);

        let bottomDelta = self._getContentBottomBoundary() - self._bottomBoundary;
        bottomDelta = -bottomDelta;

        let leftDelta = self._getContentLeftBoundary() - self._leftBoundary;
        leftDelta = -leftDelta;

        const moveDelta = new Vec3();
        if (self._content && self.view) {
            let totalScrollDelta = 0;
            const uiTrans = self._content._uiProps.uiTransformComp!;
            const contentSize = uiTrans.contentSize;
            const scrollSize = self.view.contentSize;
            if (applyToHorizontal) {
                totalScrollDelta = contentSize.width - scrollSize.width;
                moveDelta.x = leftDelta - totalScrollDelta * anchor.x;
            }
            if (applyToVertical) {
                totalScrollDelta = contentSize.height - scrollSize.height;
                moveDelta.y = bottomDelta - totalScrollDelta * anchor.y;
            }
        }

        return moveDelta;
    }

    protected _moveContentToTopLeft (scrollViewSize: Size): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        let bottomDelta = self._getContentBottomBoundary() - self._bottomBoundary;
        bottomDelta = -bottomDelta;
        const moveDelta = new Vec3();
        let totalScrollDelta = 0;

        let leftDelta = self._getContentLeftBoundary() - self._leftBoundary;
        leftDelta = -leftDelta;

        // 是否限制在上视区上边
        if (self._content) {
            const uiTrans = self._content._uiProps.uiTransformComp!;
            const contentSize = uiTrans.contentSize;
            if (contentSize.height < scrollViewSize.height) {
                totalScrollDelta = contentSize.height - scrollViewSize.height;
                moveDelta.y = bottomDelta - totalScrollDelta;
            }

            // 是否限制在上视区左边
            if (contentSize.width < scrollViewSize.width) {
                totalScrollDelta = contentSize.width - scrollViewSize.width;
                moveDelta.x = leftDelta;
            }
        }

        self._updateScrollBarState();
        self._moveContent(moveDelta);
        self._adjustContentOutOfBoundary();
    }

    protected _scaleChanged (value: TransformBit): void {
        if (value === TransformBit.SCALE) {
            this._calculateBoundary();
        }
    }

    protected _xrHoverEnter (event: XrUIPressEvent): void {
        if (event.deviceType === DeviceType.Left) {
            this._hoverIn = XrhoverType.LEFT;
        } else if (event.deviceType === DeviceType.Right) {
            this._hoverIn = XrhoverType.RIGHT;
        }
    }

    protected _xrHoverExit (event: XrUIPressEvent): void {
        this._hoverIn = XrhoverType.NONE;
    }

    private _dispatchEventHandleInput (event: EventHandle | EventGamepad): void {
        let handleInputDevice;
        if (event instanceof EventGamepad) {
            handleInputDevice = event.gamepad;
        } else if (event instanceof EventHandle) {
            handleInputDevice = event.handleInputDevice;
        }
        let value: Vec2;
        if (!this.enabledInHierarchy || this._hoverIn === XrhoverType.NONE) {
            return;
        }
        if (this._hoverIn === XrhoverType.LEFT) {
            value = handleInputDevice.leftStick.getValue();
            if (!value.equals(Vec2.ZERO)) {
                this._xrThumbStickMove(value);
            }
        } else if (this._hoverIn === XrhoverType.RIGHT) {
            value = handleInputDevice.rightStick.getValue();
            if (!value.equals(Vec2.ZERO)) {
                this._xrThumbStickMove(value);
            }
        }
    }

    protected _xrThumbStickMove (event: Vec2): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (!self.enabledInHierarchy) {
            return;
        }

        const deltaMove = new Vec3();
        const wheelPrecision = -62.5;
        const scrollY = event.y;
        if (self.vertical) {
            deltaMove.set(0, scrollY * wheelPrecision, 0);
        } else if (self.horizontal) {
            deltaMove.set(scrollY * wheelPrecision, 0, 0);
        }

        self._mouseWheelEventElapsedTime = 0;
        self._deltaAmount.add(deltaMove);

        if (!self._stopMouseWheel) {
            self._handlePressLogic();
            self.schedule(self._checkMouseWheel, 1.0 / 60, NaN, 0);
            self._stopMouseWheel = true;
        }
    }
}

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-to-top
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-to-bottom
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-to-left
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-to-right
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scrolling
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event bounce-bottom
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event bounce-top
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event bounce-left
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event bounce-right
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-ended
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event touch-up
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event scroll-began
 * @param {Event.EventCustom} event
 * @param {ScrollView} scrollView - The ScrollView component.
 */

legacyCC.ScrollView = ScrollView;
