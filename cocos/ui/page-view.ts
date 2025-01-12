/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { ccclass, help, executionOrder, menu, tooltip, type, slide, range, visible, override, serializable, editable } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { EventHandler as ComponentEventHandler, Node } from '../scene-graph';
import { EventTouch } from '../input/types';
import { v2, v3, Vec2, Vec3 } from '../core/math';
import { ccenum } from '../core/value-types/enum';
import { Layout } from './layout';
import { PageViewIndicator } from './page-view-indicator';
import { ScrollView, ScrollViewEventType as ScrollEventType } from './scroll-view';
import { ScrollBar } from './scroll-bar';
import { warnID, logID } from '../core/platform/debug';
import { extendsEnum } from '../core/data/utils/extends-enum';
import { legacyCC } from '../core/global-exports';
import { NodeEventType } from '../scene-graph/node-event';

const _tempVec2 = new Vec2();

/**
 * @en Enum for Page View Size Mode.
 *
 * @zh 页面视图每个页面统一的大小类型。
 */
enum SizeMode {
    /**
     * @en Each page is unified in size.
     * @zh 每个页面统一大小。
     */
    Unified = 0,
    /**
     * @en Each page is in free size.
     * @zh 每个页面大小随意。
     */
    Free = 1,
}

ccenum(SizeMode);

/**
 * @en Enum for Page View Direction.
 *
 * @zh 页面视图滚动类型。
 */
enum PageViewDirection {
    /**
     * @en Horizontal scroll.
     * @zh 水平滚动。
     */
    HORIZONTAL = 0,
    /**
     * @en Vertical scroll.
     * @zh 垂直滚动。
     */
    VERTICAL = 1,
}

ccenum(PageViewDirection);

/**
 * @en Enum for ScrollView event type.
 *
 * @zh 滚动视图事件类型。
 */
enum PageViewEventType {
    PAGE_TURNING = 'page-turning',
}

/**
 * @en
 * The PageView control.
 *
 * @zh
 * 页面视图组件。
 */
@ccclass('cc.PageView')
@help('i18n:cc.PageView')
@executionOrder(110)
@menu('UI/PageView')
export class PageView extends ScrollView {
    /**
     * @en
     * Specify the size type of each page in PageView.
     *
     * @zh
     * 页面视图中每个页面大小类型。
     */
    @type(SizeMode)
    @tooltip('i18n:pageview.sizeMode')
    get sizeMode (): SizeMode {
        return this._sizeMode;
    }

    set sizeMode (value) {
        if (this._sizeMode === value) {
            return;
        }

        this._sizeMode = value;
        this._syncSizeMode();
    }

    /**
     * @en
     * The page view direction.
     *
     * @zh
     * 页面视图滚动类型。
     */
    @type(PageViewDirection)
    @tooltip('i18n:pageview.direction')
    get direction (): PageViewDirection {
        return this._direction;
    }

    set direction (value) {
        if (this._direction === value) {
            return;
        }

        this._direction = value;
        this._syncScrollDirection();
    }

    /**
     * @en
     * The scroll threshold value, when drag exceeds this value,
     * release the next page will automatically scroll, less than the restore.
     *
     * @zh
     * 滚动临界值，默认单位百分比，当拖拽超出该数值时，松开会自动滚动下一页，小于时则还原。
     */
    @slide
    @range([0, 1, 0.01])
    @tooltip('i18n:pageview.scrollThreshold')
    get scrollThreshold (): number {
        return this._scrollThreshold;
    }

    set scrollThreshold (value) {
        if (this._scrollThreshold === value) {
            return;
        }

        this._scrollThreshold = value;
    }

    /**
     * @en
     * Change the PageTurning event timing of PageView.
     *
     * @zh
     * 设置 PageView PageTurning 事件的发送时机。
     */
    @slide
    @range([0, 1, 0.01])
    @tooltip('i18n:pageview.pageTurningEventTiming')
    get pageTurningEventTiming (): number {
        return this._pageTurningEventTiming;
    }

    set pageTurningEventTiming (value) {
        if (this._pageTurningEventTiming === value) {
            return;
        }

        this._pageTurningEventTiming = value;
    }

    /**
     * @en
     * The Page View Indicator.
     *
     * @zh
     * 页面视图指示器组件。
     */
    @type(PageViewIndicator)
    @tooltip('i18n:pageview.indicator')
    get indicator (): PageViewIndicator | null {
        return this._indicator;
    }

    set indicator (value) {
        if (this._indicator === value) {
            return;
        }

        this._indicator = value;
        if (this.indicator) {
            this.indicator.setPageView(this);
        }
    }

    get curPageIdx (): number {
        return this._curPageIdx;
    }

    /**
     * @en Enum for Page View Size Mode.
     * @zh 页面视图每个页面统一的大小类型。
     */
    public static SizeMode = SizeMode;
    /**
     * @en Enum for Page View Direction.
     * @zh 页面视图滚动类型。
     */
    public static Direction = PageViewDirection;
    /**
     * @en Enum for Page View event.
     * @zh 页面视图事件枚举
     */
    public static EventType = extendsEnum(PageViewEventType, ScrollEventType);

    /**
     * @en
     * Auto page turning velocity threshold. When users swipe the PageView quickly,
     * it will calculate a velocity based on the scroll distance and time,
     * if the calculated velocity is larger than the threshold, then it will trigger page turning.
     *
     * @zh
     * 快速滑动翻页临界值。
     * 当用户快速滑动时，会根据滑动开始和结束的距离与时间计算出一个速度值，
     * 该值与此临界值相比较，如果大于临界值，则进行自动翻页。
     */
    @serializable
    @tooltip('i18n:pageview.autoPageTurningThreshold')
    public autoPageTurningThreshold = 100;

    /**
     * @en
     * The vertical scrollbar reference.
     * @zh
     * 垂直滚动的 ScrollBar。
     */
    @type(ScrollBar)
    @override
    @visible(false)
    get verticalScrollBar (): ScrollBar | null {
        return super.verticalScrollBar;
    }

    set verticalScrollBar (value) {
        super.verticalScrollBar = value;
    }

    /**
     * @en
     * The horizontal scrollbar reference.
     * @zh
     * 水平滚动的 ScrollBar。
     */
    @type(ScrollBar)
    @override
    @visible(false)
    get horizontalScrollBar (): ScrollBar | null {
        return super.horizontalScrollBar;
    }

    set horizontalScrollBar (value) {
        super.horizontalScrollBar = value;
    }

    /**
     * @en
     * Enable horizontal scroll.
     * @zh
     * 是否开启水平滚动。
     */
    @override
    @serializable
    @visible(false)
    public horizontal = true;

    /**
     * @en
     * Enable vertical scroll.
     * @zh
     * 是否开启垂直滚动。
     */
    @override
    @serializable
    @visible(false)
    public vertical = true;

    /**
     * @en
     * If cancelInnerEvents is set to true, the scroll behavior will cancel touch events on inner content nodes
     * It's set to true by default.
     * @zh
     * 如果这个属性被设置为 true，那么滚动行为会取消子节点上注册的触摸事件，默认被设置为 true。<br/>
     * 注意，子节点上的 touchstart 事件仍然会触发，触点移动距离非常短的情况下 touchmove 和 touchend 也不会受影响。
     */
    @override
    @serializable
    @visible(false)
    public cancelInnerEvents = true;

    /**
     * @en
     * ScrollView events callback.
     * @zh
     * 滚动视图的事件回调函数。
     */
    @type([ComponentEventHandler])
    @serializable
    @override
    @visible(false)
    public scrollEvents: ComponentEventHandler[] = [];

    /**
     * @en The time required to turn over a page, unit: second.
     * @zh 每个页面翻页时所需时间，单位：秒。
     */
    @serializable
    @editable
    @tooltip('i18n:pageview.pageTurningSpeed')
    public pageTurningSpeed = 0.3;

    /**
     * @en PageView events callback.
     * @zh 滚动视图的事件回调函数。
     */
    @type([ComponentEventHandler])
    @serializable
    @tooltip('i18n:pageview.pageEvents')
    public pageEvents: ComponentEventHandler[] = [];

    @serializable
    protected _sizeMode = SizeMode.Unified;
    @serializable
    protected _direction = PageViewDirection.HORIZONTAL;
    @serializable
    protected _scrollThreshold = 0.5;
    @serializable
    protected _pageTurningEventTiming = 0.1;
    @serializable
    protected _indicator: PageViewIndicator | null = null;

    protected _curPageIdx = 0;
    protected _lastPageIdx = 0;
    protected _pages: Node[] = [];
    protected _initContentPos = v3();
    protected _scrollCenterOffsetX: number[] = []; // 每一个页面居中时需要的偏移量（X）
    protected _scrollCenterOffsetY: number[] = []; // 每一个页面居中时需要的偏移量（Y）
    protected _touchBeganPosition = v2();
    protected _touchEndPosition = v2();

    constructor () {
        super();
    }

    public onEnable (): void {
        super.onEnable();
        this.node.on(NodeEventType.SIZE_CHANGED, this._updateAllPagesSize, this);
        if (!EDITOR_NOT_IN_PREVIEW) {
            this.node.on(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this._dispatchPageTurningEvent, this);
        }
    }

    public onDisable (): void {
        super.onDisable();
        this.node.off(NodeEventType.SIZE_CHANGED, this._updateAllPagesSize, this);
        if (!EDITOR_NOT_IN_PREVIEW) {
            this.node.off(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this._dispatchPageTurningEvent, this);
        }
    }

    public onLoad (): void {
        this._initPages();
        if (this.indicator) {
            this.indicator.setPageView(this);
        }
    }

    /**
     * @en
     * Returns current page index.
     *
     * @zh
     * 返回当前页面索引。
     *
     * @returns @en Current page index of this page view. @zh 当前页面索引。
     */
    public getCurrentPageIndex (): number {
        return this._curPageIdx;
    }

    /**
     * @en
     * Set current page index.
     *
     * @zh
     * 设置当前页面索引。
     * @param index @en The page index to scroll to. @zh 需要滚动到的页面索引。
     */
    public setCurrentPageIndex (index: number): void {
        this.scrollToPage(index, 1);
    }

    /**
     * @en
     * Returns all pages of pageview.
     *
     * @zh
     * 返回视图中的所有页面。
     *
     * @returns @en return all pages of this page view. @zh 返回当前视图所有页面。
     */
    public getPages (): Node[] {
        return this._pages;
    }

    /**
     * @en
     * At the end of the current page view to insert a new view.
     *
     * @zh
     * 在当前页面视图的尾部插入一个新视图。
     *
     * @param page @en New page to add to this page view. @zh 新加入的视图。
     */
    public addPage (page: Node): void {
        if (!page || this._pages.indexOf(page) !== -1 || !this.content) {
            return;
        }
        if (!page._getUITransformComponent()) {
            logID(4301);
            return;
        }
        this.content.addChild(page);
        this._pages.push(page);
        this._updatePageView();
    }

    /**
     * @en
     * Inserts a page in the specified location.
     *
     * @zh
     * 将页面插入指定位置中。
     *
     * @param page @en New page to insert to this page view. @zh 新插入的视图。
     * @param index @en The index of new page to be inserted. @zh 新插入视图的索引。
     */
    public insertPage (page: Node, index: number): void {
        if (index < 0 || !page || this._pages.indexOf(page) !== -1 || !this.content) {
            return;
        }
        const pageCount = this._pages.length;
        if (index >= pageCount) {
            this.addPage(page);
        } else {
            if (!page._getUITransformComponent()) {
                logID(4301);
                return;
            }
            this._pages.splice(index, 0, page);
            this.content.insertChild(page, index);
            this._updatePageView();
        }
    }

    /**
     * @en
     * Removes a page from PageView.
     *
     * @zh
     * 移除指定页面。
     *
     * @param page @en The page to be removed. @zh 将被移除的页面。
     */
    public removePage (page: Node): void {
        if (!page || !this.content) { return; }
        const index = this._pages.indexOf(page);
        if (index === -1) {
            warnID(4300, page.name);
            return;
        }
        this.removePageAtIndex(index);
    }

    /**
     * @en
     * Removes a page at index of PageView.
     *
     * @zh
     * 移除指定下标的页面。
     *
     * @param index @en The index of the page to be removed. @zh 将被移除界面的页面下标。
     */
    public removePageAtIndex (index: number): void {
        const pageList = this._pages;
        if (index < 0 || index >= pageList.length) { return; }
        const page = pageList[index];
        if (!page || !this.content) { return; }
        this.content.removeChild(page);
        pageList.splice(index, 1);
        this._updatePageView();
    }

    /**
     * @en
     * Removes all pages from PageView.
     *
     * @zh
     * 移除所有页面。
     */
    public removeAllPages (): void {
        if (!this.content) { return; }
        const locPages = this._pages;
        for (let i = 0, len = locPages.length; i < len; i++) {
            this.content.removeChild(locPages[i]);
        }
        this._pages.length = 0;
        this._updatePageView();
    }

    /**
     * @en
     * Scroll PageView to index.
     *
     * @zh
     * 滚动到指定页面
     *
     * @param idx @en The index of page to be scroll to. @zh 希望滚动到的页面下标。
     * @param timeInSecond @en How long time to scroll to the page, in seconds. @zh 滚动到指定页面所需时间，单位：秒。
     */
    public scrollToPage (idx: number, timeInSecond = 0.3): void {
        if (idx < 0 || idx >= this._pages.length) {
            return;
        }

        this._curPageIdx = idx;
        this.scrollToOffset(this._moveOffsetValue(idx), timeInSecond, true);
        if (this.indicator) {
            this.indicator._changedState();
        }
    }

    // override the method of ScrollView
    public getScrollEndedEventTiming (): number {
        return this.pageTurningEventTiming;
    }

    // 刷新页面视图
    protected _updatePageView (): void {
        // 当页面数组变化时修改 content 大小
        if (!this.content) {
            return;
        }
        const layout = this.content.getComponent(Layout);
        if (layout && layout.enabled) {
            layout.updateLayout();
        }

        const pageCount = this._pages.length;
        if (this._curPageIdx >= pageCount) {
            this._curPageIdx = pageCount === 0 ? 0 : pageCount - 1;
            this._lastPageIdx = this._curPageIdx;
        }
        // 进行排序
        const contentPos = this._initContentPos;
        for (let i = 0; i < pageCount; ++i) {
            const page = this._pages[i];
            // page.setSiblingIndex(i);
            const pos = page.position;
            if (this.direction === PageViewDirection.HORIZONTAL) {
                this._scrollCenterOffsetX[i] = Math.abs(contentPos.x + pos.x);
            } else {
                this._scrollCenterOffsetY[i] = Math.abs(contentPos.y + pos.y);
            }
        }

        // 刷新 indicator 信息与状态
        if (this.indicator) {
            this.indicator._refresh();
        }
    }

    // 刷新所有页面的大小
    protected _updateAllPagesSize (): void {
        const viewTrans = this.view;
        if (!this.content || !viewTrans) {
            return;
        }

        if (this._sizeMode !== SizeMode.Unified) {
            return;
        }
        const locPages = EDITOR_NOT_IN_PREVIEW ? this.content.children : this._pages;
        const selfSize = viewTrans.contentSize;
        for (let i = 0, len = locPages.length; i < len; i++) {
            locPages[i]._getUITransformComponent()!.setContentSize(selfSize);
        }
    }

    protected _handleReleaseLogic (): void {
        this._autoScrollToPage();
        if (this._scrolling) {
            this._scrolling = false;
            if (!this._autoScrolling) {
                this._dispatchEvent(PageView.EventType.SCROLL_ENDED);
            }
        }
    }

    protected _onTouchBegan (event: EventTouch, captureListeners: Node[]): void {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchBeganPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchBegan(event, captureListeners);
    }

    protected _onTouchMoved (event: EventTouch, captureListeners: Node[]): void {
        super._onTouchMoved(event, captureListeners);
    }

    protected _onTouchEnded (event: EventTouch, captureListeners: Node[]): void {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchEnded(event, captureListeners);
    }

    protected _onTouchCancelled (event: EventTouch, captureListeners: Node[]): void {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchCancelled(event, captureListeners);
    }

    protected _onMouseWheel (): void { }

    protected _syncScrollDirection (): void {
        this.horizontal = this.direction === PageViewDirection.HORIZONTAL;
        this.vertical = this.direction === PageViewDirection.VERTICAL;
    }

    protected _syncSizeMode (): void {
        const viewTrans = this.view;
        if (!this.content || !viewTrans) { return; }
        const layout = this.content.getComponent(Layout);
        if (layout) {
            if (this._sizeMode === SizeMode.Free && this._pages.length > 0) {
                const firstPageTrans = this._pages[0]._getUITransformComponent()!;
                const lastPageTrans = this._pages[this._pages.length - 1]._getUITransformComponent()!;
                if (this.direction === PageViewDirection.HORIZONTAL) {
                    layout.paddingLeft = (viewTrans.width - firstPageTrans.width) / 2;
                    layout.paddingRight = (viewTrans.width - lastPageTrans.width) / 2;
                } else if (this.direction === PageViewDirection.VERTICAL) {
                    layout.paddingTop = (viewTrans.height - firstPageTrans.height) / 2;
                    layout.paddingBottom = (viewTrans.height - lastPageTrans.height) / 2;
                }
            }
            layout.updateLayout();
        }
    }

    // 初始化页面
    protected _initPages (): void {
        if (!this.content) { return; }
        this._initContentPos = this.content.position as Vec3;
        const children = this.content.children;
        for (let i = 0; i < children.length; ++i) {
            const page = children[i];
            if (this._pages.indexOf(page) >= 0) { continue; }
            this._pages.push(page);
        }
        this._syncScrollDirection();
        this._syncSizeMode();
        this._updatePageView();
    }

    protected _dispatchPageTurningEvent (): void {
        if (this._lastPageIdx === this._curPageIdx) { return; }
        this._lastPageIdx = this._curPageIdx;
        ComponentEventHandler.emitEvents(this.pageEvents, this, PageViewEventType.PAGE_TURNING);
        this.node.emit(PageViewEventType.PAGE_TURNING, this);
    }

    // 快速滑动
    protected _isQuicklyScrollable (touchMoveVelocity: Vec3): boolean {
        if (this.direction === PageViewDirection.HORIZONTAL) {
            if (Math.abs(touchMoveVelocity.x) > this.autoPageTurningThreshold) {
                return true;
            }
        } else if (this.direction === PageViewDirection.VERTICAL) {
            if (Math.abs(touchMoveVelocity.y) > this.autoPageTurningThreshold) {
                return true;
            }
        }
        return false;
    }

    // 通过 idx 获取偏移值数值
    protected _moveOffsetValue (idx: number): Vec2 {
        const offset = new Vec2();
        if (this._sizeMode === SizeMode.Free) {
            if (this.direction === PageViewDirection.HORIZONTAL) {
                offset.x = this._scrollCenterOffsetX[idx];
            } else if (this.direction === PageViewDirection.VERTICAL) {
                offset.y = this._scrollCenterOffsetY[idx];
            }
        } else {
            const viewTrans = this.view;
            if (!viewTrans) {
                return offset;
            }
            if (this.direction === PageViewDirection.HORIZONTAL) {
                offset.x = idx * viewTrans.width;
            } else if (this.direction === PageViewDirection.VERTICAL) {
                offset.y = idx * viewTrans.height;
            }
        }
        return offset;
    }

    protected _getDragDirection (moveOffset: Vec2): number {
        if (this._direction === PageViewDirection.HORIZONTAL) {
            if (moveOffset.x === 0) {
                return 0;
            }

            return (moveOffset.x > 0 ? 1 : -1);
        } else {
            // 由于滚动 Y 轴的原点在在右上角所以应该是小于 0
            if (moveOffset.y === 0) {
                return 0;
            }

            return (moveOffset.y < 0 ? 1 : -1);
        }
    }

    // 是否超过自动滚动临界值
    protected _isScrollable (offset: Vec2, index: number, nextIndex: number): boolean {
        if (this._sizeMode === SizeMode.Free) {
            let curPageCenter = 0;
            let nextPageCenter = 0;
            if (this.direction === PageViewDirection.HORIZONTAL) {
                curPageCenter = this._scrollCenterOffsetX[index];
                nextPageCenter = this._scrollCenterOffsetX[nextIndex];
                return Math.abs(offset.x) >= Math.abs(curPageCenter - nextPageCenter) * this.scrollThreshold;
            } else if (this.direction === PageViewDirection.VERTICAL) {
                curPageCenter = this._scrollCenterOffsetY[index];
                nextPageCenter = this._scrollCenterOffsetY[nextIndex];
                return Math.abs(offset.y) >= Math.abs(curPageCenter - nextPageCenter) * this.scrollThreshold;
            }
        } else {
            const viewTrans = this.view;
            if (!viewTrans) {
                return false;
            }
            if (this.direction === PageViewDirection.HORIZONTAL) {
                return Math.abs(offset.x) >= viewTrans.width * this.scrollThreshold;
            } else if (this.direction === PageViewDirection.VERTICAL) {
                return Math.abs(offset.y) >= viewTrans.height * this.scrollThreshold;
            }
        }
        return false;
    }

    protected _autoScrollToPage (): void {
        const bounceBackStarted = this._startBounceBackIfNeeded();
        if (bounceBackStarted) {
            const bounceBackAmount = this._getHowMuchOutOfBoundary();
            this._clampDelta(bounceBackAmount);
            if (bounceBackAmount.x > 0 || bounceBackAmount.y < 0) {
                this._curPageIdx = this._pages.length === 0 ? 0 : this._pages.length - 1;
            }
            if (bounceBackAmount.x < 0 || bounceBackAmount.y > 0) {
                this._curPageIdx = 0;
            }

            if (this.indicator) {
                this.indicator._changedState();
            }
        } else {
            const moveOffset = new Vec2();
            Vec2.subtract(moveOffset, this._touchBeganPosition, this._touchEndPosition);
            const index = this._curPageIdx;
            const nextIndex = index + this._getDragDirection(moveOffset);
            const timeInSecond = this.pageTurningSpeed * Math.abs(index - nextIndex);
            if (nextIndex < this._pages.length) {
                if (this._isScrollable(moveOffset, index, nextIndex)) {
                    this.scrollToPage(nextIndex, timeInSecond);
                    return;
                } else {
                    const touchMoveVelocity = this._calculateTouchMoveVelocity();
                    if (this._isQuicklyScrollable(touchMoveVelocity)) {
                        this.scrollToPage(nextIndex, timeInSecond);
                        return;
                    }
                }
            }
            this.scrollToPage(index, timeInSecond);
        }
    }
}

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event page-turning
 * @param event
 * @param pageView - The PageView component.
 */

legacyCC.PageView = PageView;
