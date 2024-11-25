/*
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

import { CallbacksInvoker } from '../core/event/callbacks-invoker';
import { Event, EventMouse, EventTouch, Touch } from '../input/types';
import { Vec2 } from '../core/math/vec2';
import { Node } from './node';
import { legacyCC } from '../core/global-exports';
import { Component } from './component';
import { NodeEventType } from './node-event';
import { InputEventType, SystemEventTypeUnion } from '../input/types/event-enum';
import { Pool } from '../core';

const _arrayPool = new Pool((): Array<Node> => new Array<Node>(16), 3);
let _currentHovered: Node | null = null;
const pos = new Vec2();

const _touchEvents = [
    NodeEventType.TOUCH_START,
    NodeEventType.TOUCH_MOVE,
    NodeEventType.TOUCH_END,
    NodeEventType.TOUCH_CANCEL,
];

const _mouseEvents = [
    NodeEventType.MOUSE_DOWN,
    NodeEventType.MOUSE_ENTER,
    NodeEventType.MOUSE_MOVE,
    NodeEventType.MOUSE_LEAVE,
    NodeEventType.MOUSE_UP,
    NodeEventType.MOUSE_WHEEL,
];

export interface IMask {
    index: number;
    comp: Component;
}

export enum DispatcherEventType {
    ADD_POINTER_EVENT_PROCESSOR,
    REMOVE_POINTER_EVENT_PROCESSOR,
    MARK_LIST_DIRTY,
}

/**
 * @en The event processor for Node
 * @zh 节点事件类。
 */
export class NodeEventProcessor {
    /**
     * @internal
     */
    public static _maskComp: Constructor<Component> | null = null;
    /**
     * @internal
     */
    public static callbacksInvoker = new CallbacksInvoker<DispatcherEventType>();

    /**
     * Whether the node event is enabled
     */
    public get isEnabled (): boolean {
        return this._isEnabled;
    }

    /**
     * The list of claimed touch ids
     */
    public claimedTouchIdList: number[] = [];

    /**
     * The masks in the parent chain of the node
     */
    public maskList: IMask[] | null = null;

    /**
     * To cache camera priority.
     */
    public cachedCameraPriority = 0;

    /**
     * To record whether the mouse move in at the previous mouse event.
     */
    public previousMouseIn = false;

    /**
     * The owner of node event processor.
     */
    public get node (): Node {
        return this._node;
    }

    /**
     * Target in bubbling phase.
     */
    public bubblingTarget: CallbacksInvoker<SystemEventTypeUnion> | null = null;

    /**
     * Target in capturing phase.
     */
    public capturingTarget: CallbacksInvoker<SystemEventTypeUnion> | null = null;

    /**
     * Whether the node has registered the mouse event callback
     */
    public shouldHandleEventMouse = false;
    /**
     * Whether the node has registered the touch event callback
     */
    public shouldHandleEventTouch = false;

    // Whether dispatch cancel event when node is destroyed.
    private _dispatchingTouch: Touch | null = null;
    private _isEnabled = false;
    private declare _node: Node;
    // Indicate whether the mouse leaves window(only support one window). If it is
    // true, then will not continue dispatching mouse events, such as mouse move events.
    // Tested on macOS, mouse move events will be triggered once even mouse leaves the window.
    private _isMouseLeaveWindow = false;

    constructor (node: Node) {
        this._node = node;
    }

    /**
     * Set enable state of the node event processor
     * @param value Enable state
     * @param recursive Recursively set the state or not
     * @returns void
     */
    public setEnabled (value: boolean, recursive = false): void {
        if (this._isEnabled === value) {
            return;
        }
        this._isEnabled = value;
        const node = this.node;
        const children = node.children;
        if (value) {
            this._attachMask();
        }
        NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.MARK_LIST_DIRTY);
        if (recursive && children.length > 0) {
            for (let i = 0; i < children.length; ++i) {
                const child = children[i];
                child.eventProcessor.setEnabled(value, true);
            }
        }
    }

    public reattach (): void {
        let currentMaskList: IMask[] | null;
        this.node.walk((node) => {
            if (!currentMaskList) {
                currentMaskList = this._searchComponentsInParent(NodeEventProcessor._maskComp);
            }
            node.eventProcessor.maskList = currentMaskList;
        });
    }

    public destroy (): void {
        if (_currentHovered === this._node) {
            _currentHovered = null;
        }

        if (this.capturingTarget) this.capturingTarget.clear();
        if (this.bubblingTarget) this.bubblingTarget.clear();
        NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.REMOVE_POINTER_EVENT_PROCESSOR, this);
        if (this._dispatchingTouch) {
            // Dispatch touch cancel event when node is destroyed.
            const cancelEvent = new EventTouch([this._dispatchingTouch], true, InputEventType.TOUCH_CANCEL);
            cancelEvent.touch = this._dispatchingTouch;
            this.dispatchEvent(cancelEvent);
            this._dispatchingTouch = null;
        }
    }

    public on (type: NodeEventType, callback: AnyFunction, target?: unknown, useCapture?: boolean): AnyFunction {
        this._tryEmittingAddEvent(type);
        useCapture = !!useCapture;
        let invoker: CallbacksInvoker<SystemEventTypeUnion>;
        if (useCapture) {
            invoker = this.capturingTarget ??= this._newCallbacksInvoker();
        } else {
            invoker = this.bubblingTarget ??= this._newCallbacksInvoker();
        }
        invoker.on(type, callback, target);
        return callback;
    }

    public once (type: NodeEventType, callback: AnyFunction, target?: unknown, useCapture?: boolean): AnyFunction {
        this._tryEmittingAddEvent(type);
        useCapture = !!useCapture;
        let invoker: CallbacksInvoker<SystemEventTypeUnion>;
        if (useCapture) {
            invoker = this.capturingTarget ??= this._newCallbacksInvoker();
        } else {
            invoker = this.bubblingTarget ??= this._newCallbacksInvoker();
        }

        invoker.on(type, callback, target, true);
        return callback;
    }

    public off (type: NodeEventType, callback?: AnyFunction, target?: unknown, useCapture?: boolean): void {
        useCapture = !!useCapture;
        let invoker: CallbacksInvoker<SystemEventTypeUnion> | null;
        if (useCapture) {
            invoker = this.capturingTarget;
        } else {
            invoker = this.bubblingTarget;
        }
        invoker?.off(type, callback, target);
    }

    public targetOff (target: unknown): void {
        this.capturingTarget?.removeAll(target);
        this.bubblingTarget?.removeAll(target);

        // emit event
        if (this.shouldHandleEventTouch && !this._hasTouchListeners()) {
            this.shouldHandleEventTouch = false;
        }
        if (this.shouldHandleEventMouse && !this._hasMouseListeners()) {
            this.shouldHandleEventMouse = false;
        }
        if (!this._hasPointerListeners()) {
            NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.REMOVE_POINTER_EVENT_PROCESSOR, this);
        }
    }

    public emit (type: SystemEventTypeUnion, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        this.bubblingTarget?.emit(type, arg0, arg1, arg2, arg3, arg4);
    }

    public dispatchEvent (event: Event): void {
        const owner = this.node;
        let target: Node;
        let i = 0;
        event.target = owner;

        // Event.CAPTURING_PHASE
        const cachedArray = _arrayPool.alloc();
        cachedArray.length = 0;
        this.getCapturingTargets(event.type, cachedArray);
        // capturing
        event.eventPhase = 1;
        for (i = cachedArray.length - 1; i >= 0; --i) {
            target = cachedArray[i];
            if (target.eventProcessor.capturingTarget) {
                event.currentTarget = target;
                // fire event
                target.eventProcessor.capturingTarget.emit(event.type, event, cachedArray);
                // check if propagation stopped
                if (event.propagationStopped) {
                    _arrayPool.free(cachedArray);
                    return;
                }
            }
        }

        // Event.AT_TARGET
        // checks if destroyed in capturing callbacks
        event.eventPhase = 2;
        event.currentTarget = owner;
        if (this.capturingTarget) {
            this.capturingTarget.emit(event.type, event);
        }
        if (!event.propagationImmediateStopped && this.bubblingTarget) {
            this.bubblingTarget.emit(event.type, event);
        }

        if (!event.propagationStopped && event.bubbles) {
            // Event.BUBBLING_PHASE
            cachedArray.length = 0;
            this.getBubblingTargets(event.type, cachedArray);
            // propagate
            event.eventPhase = 3;
            for (i = 0; i < cachedArray.length; ++i) {
                target = cachedArray[i];
                if (target.eventProcessor.bubblingTarget) {
                    event.currentTarget = target;
                    // fire event
                    target.eventProcessor.bubblingTarget.emit(event.type, event);
                    // check if propagation stopped
                    if (event.propagationStopped) {
                        _arrayPool.free(cachedArray);
                        return;
                    }
                }
            }
        }

        _arrayPool.free(cachedArray);
    }

    public hasEventListener (type: SystemEventTypeUnion, callback?: AnyFunction, target?: unknown): boolean {
        let has = false;
        if (this.bubblingTarget) {
            has = this.bubblingTarget.hasEventListener(type, callback, target);
        }
        if (!has && this.capturingTarget) {
            has = this.capturingTarget.hasEventListener(type, callback, target);
        }
        return has;
    }

    /**
     * @zh
     * 获得所提供的事件类型在目标捕获阶段监听的所有目标。
     * 捕获阶段包括从根节点到目标节点的过程。
     * 结果保存在数组参数中，并且必须从子节点排序到父节点。
     *
     * @param type - 一个监听事件类型的字符串。
     * @param array - 接收目标的数组。
     */
    public getCapturingTargets (type: string, targets: Node[]): void {
        let parent = this._node.parent;
        while (parent) {
            if (parent.eventProcessor.capturingTarget?.hasEventListener(type)) {
                targets.push(parent);
            }
            parent = parent.parent;
        }
    }

    /**
     * @zh
     * 获得所提供的事件类型在目标冒泡阶段监听的所有目标。
     * 冒泡阶段目标节点到根节点的过程。
     * 结果保存在数组参数中，并且必须从子节点排序到父节点。
     *
     * @param type - 一个监听事件类型的字符串。
     * @param array - 接收目标的数组。
     */
    public getBubblingTargets (type: string, targets: Node[]): void {
        let parent = this._node.parent;
        while (parent) {
            if (parent.eventProcessor.bubblingTarget?.hasEventListener(type)) {
                targets.push(parent);
            }
            parent = parent.parent;
        }
    }

    public onUpdatingSiblingIndex (): void {
        NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.MARK_LIST_DIRTY);
    }

    private _searchComponentsInParent<T extends Component> (ctor: Constructor<T> | null): IMask[] | null {
        const node = this.node;
        if (ctor) {
            let index = 0;
            let list: IMask[] = [];
            for (let curr: Node | null = node; curr && Node.isNode(curr); curr = curr.parent, ++index) {
                const comp = curr.getComponent(ctor);
                if (comp) {
                    const next = {
                        index,
                        comp,
                    };

                    if (list) {
                        list.push(next);
                    } else {
                        list = [next];
                    }
                }
            }

            return list.length > 0 ? list : null;
        }

        return null;
    }

    private _attachMask (): void {
        this.maskList = this._searchComponentsInParent(NodeEventProcessor._maskComp);
    }

    private _isTouchEvent (type: NodeEventType): boolean {
        const index = _touchEvents.indexOf(type);
        return index !== -1;
    }

    private _isMouseEvent (type: NodeEventType): boolean {
        const index = _mouseEvents.indexOf(type);
        return index !== -1;
    }

    private _hasTouchListeners (): boolean {
        for (let i = 0; i < _touchEvents.length; ++i) {
            const eventType = _touchEvents[i];
            if (this.hasEventListener(eventType)) {
                return true;
            }
        }
        return false;
    }

    private _hasMouseListeners (): boolean {
        for (let i = 0; i < _mouseEvents.length; ++i) {
            const eventType = _mouseEvents[i];
            if (this.hasEventListener(eventType)) {
                return true;
            }
        }
        return false;
    }

    private _hasPointerListeners (): boolean {
        const has = this._hasTouchListeners();
        if (has) {
            return true;
        }
        return this._hasMouseListeners();
    }

    private _tryEmittingAddEvent (typeToAdd: NodeEventType): void {
        const isTouchEvent = this._isTouchEvent(typeToAdd);
        const isMouseEvent = this._isMouseEvent(typeToAdd);
        if (isTouchEvent) {
            this.shouldHandleEventTouch = true;
        } else if (isMouseEvent) {
            this.shouldHandleEventMouse = true;
        }
        if ((isTouchEvent || isMouseEvent) && !this._hasPointerListeners()) {
            NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.ADD_POINTER_EVENT_PROCESSOR, this);
        }
    }

    /**
     * Fix when reigster 'once' event callback, `this.off` method isn't be invoked after event is emitted.
     * We need to inject some nodeEventProcessor's logic into the `callbacksInvoker.off` method.
     * @returns {CallbacksInvoker<SystemEventTypeUnion>} decorated callbacks invoker
     */
    private _newCallbacksInvoker (): CallbacksInvoker<SystemEventTypeUnion> {
        const callbacksInvoker = new CallbacksInvoker<SystemEventTypeUnion>();
        callbacksInvoker._registerOffCallback(() => {
            if (this.shouldHandleEventTouch && !this._hasTouchListeners()) {
                this.shouldHandleEventTouch = false;
            }
            if (this.shouldHandleEventMouse && !this._hasMouseListeners()) {
                this.shouldHandleEventMouse = false;
            }
            if (!this._hasPointerListeners()) {
                NodeEventProcessor.callbacksInvoker.emit(DispatcherEventType.REMOVE_POINTER_EVENT_PROCESSOR, this);
            }
        });
        return callbacksInvoker;
    }

    // #region handle mouse event

    /**
     * @engineInternal
     */
    public _handleEventMouse (eventMouse: EventMouse): boolean {
        switch (eventMouse.type) {
        case InputEventType.MOUSE_DOWN:
            return this._handleMouseDown(eventMouse);
        case InputEventType.MOUSE_MOVE:
            return this._handleMouseMove(eventMouse);
        case InputEventType.MOUSE_UP:
            return this._handleMouseUp(eventMouse);
        case InputEventType.MOUSE_WHEEL:
            return this._handleMouseWheel(eventMouse);
        case InputEventType.MOUSE_LEAVE:
            return this._handleMouseLeave(eventMouse);
        case InputEventType.MOUSE_ENTER:
            return this._handleMouseEnter(eventMouse);
        default:
            return false;
        }
    }

    private _handleMouseDown (event: EventMouse): boolean {
        const node = this._node;
        if (!node || !node._uiProps.uiTransformComp) {
            return false;
        }

        event.getLocation(pos);

        if (node._uiProps.uiTransformComp.hitTest(pos, event.windowId)) {
            event.type = NodeEventType.MOUSE_DOWN;
            event.bubbles = true;
            node.dispatchEvent(event);
            event.propagationStopped = true;
            return true;
        }
        return false;
    }

    private _handleMouseMove (event: EventMouse): boolean {
        const node = this._node;
        if (!node || !node._uiProps.uiTransformComp || this._isMouseLeaveWindow) {
            return false;
        }

        event.getLocation(pos);

        const hit = node._uiProps.uiTransformComp.hitTest(pos, event.windowId);
        if (hit) {
            if (!this.previousMouseIn) {
                // Fix issue when hover node switched, previous hovered node won't get MOUSE_LEAVE notification
                if (_currentHovered && _currentHovered !== node) {
                    event.type = NodeEventType.MOUSE_LEAVE;
                    _currentHovered.dispatchEvent(event);
                    _currentHovered.eventProcessor.previousMouseIn = false;
                }
                _currentHovered = node;
                event.type = NodeEventType.MOUSE_ENTER;
                node.dispatchEvent(event);
                this.previousMouseIn = true;
            }
            event.type = NodeEventType.MOUSE_MOVE;
            event.bubbles = true;
            node.dispatchEvent(event);
            event.propagationStopped = true;
            return true;
        } else if (this.previousMouseIn) {
            event.type = NodeEventType.MOUSE_LEAVE;
            node.dispatchEvent(event);
            this.previousMouseIn = false;
            _currentHovered = null;
        }
        return false;
    }

    private _handleMouseUp (event: EventMouse): boolean {
        const node = this._node;
        if (!node || !node._uiProps.uiTransformComp) {
            return false;
        }

        event.getLocation(pos);

        if (node._uiProps.uiTransformComp.hitTest(pos, event.windowId)) {
            event.type = NodeEventType.MOUSE_UP;
            event.bubbles = true;
            node.dispatchEvent(event);
            event.propagationStopped = true;
            return true;
        }
        return false;
    }

    private _handleMouseWheel (event: EventMouse): boolean {
        const node = this._node;
        if (!node || !node._uiProps.uiTransformComp) {
            return false;
        }

        event.getLocation(pos);

        if (node._uiProps.uiTransformComp.hitTest(pos, event.windowId)) {
            event.type = NodeEventType.MOUSE_WHEEL;
            event.bubbles = true;
            node.dispatchEvent(event);
            // event.propagationStopped = true;
            event.propagationStopped = true;
            return true;
        }
        return false;
    }

    private _handleMouseLeave (event: EventMouse): boolean {
        this._isMouseLeaveWindow = true;
        if (this.previousMouseIn) {
            event.type = NodeEventType.MOUSE_LEAVE;
            this._node.dispatchEvent(event);
            this.previousMouseIn = false;
            _currentHovered = null;
        }
        return false;
    }

    private _handleMouseEnter (event: EventMouse): boolean {
        this._isMouseLeaveWindow = false;
        return false;
    }

    // #endregion handle mouse event

    // #region handle touch event

    /**
     * @engineInternal
     */
    public _handleEventTouch (eventTouch: EventTouch): boolean | void {
        try {
            switch (eventTouch.type) {
            case InputEventType.TOUCH_START:
                return this._handleTouchStart(eventTouch);
            case InputEventType.TOUCH_MOVE:
                return this._handleTouchMove(eventTouch);
            case InputEventType.TOUCH_END:
                return this._handleTouchEnd(eventTouch);
            case InputEventType.TOUCH_CANCEL:
                return this._handleTouchCancel(eventTouch);
            default:
                return false;
            }
        } catch (err) {
            this.claimedTouchIdList.length = 0;
            throw err;
        }
    }

    private _handleTouchStart (event: EventTouch): boolean {
        const node = this.node;
        if (!node || !node._uiProps.uiTransformComp) {
            return false;
        }

        event.getLocation(pos);

        if (node._uiProps.uiTransformComp.hitTest(pos, event.windowId)) {
            event.type = NodeEventType.TOUCH_START;
            event.bubbles = true;
            this._dispatchingTouch = event.touch;
            node.dispatchEvent(event);
            return true;
        }

        return false;
    }

    private _handleTouchMove (event: EventTouch): boolean {
        const node = this.node;
        if (!node || !node._uiProps.uiTransformComp) {
            return false;
        }

        event.type = NodeEventType.TOUCH_MOVE;
        event.bubbles = true;
        this._dispatchingTouch = event.touch;
        node.dispatchEvent(event);
        return true;
    }

    private _handleTouchEnd (event: EventTouch): void {
        const node = this.node;
        if (!node || !node._uiProps.uiTransformComp) {
            return;
        }

        event.getLocation(pos);

        if (node._uiProps.uiTransformComp.hitTest(pos, event.windowId)) {
            event.type = NodeEventType.TOUCH_END;
        } else {
            event.type = NodeEventType.TOUCH_CANCEL;
        }
        event.bubbles = true;
        node.dispatchEvent(event);
        this._dispatchingTouch = null;
    }

    private _handleTouchCancel (event: EventTouch): void {
        const node = this.node;
        if (!node || !node._uiProps.uiTransformComp) {
            return;
        }

        event.type = NodeEventType.TOUCH_CANCEL;
        event.bubbles = true;
        node.dispatchEvent(event);
        this._dispatchingTouch = null;
    }

    // #endregion handle touch event
}

legacyCC.NodeEventProcessor = NodeEventProcessor;
