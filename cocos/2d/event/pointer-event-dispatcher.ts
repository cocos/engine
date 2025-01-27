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

import { Node } from '../../scene-graph/node';
import { Input, input } from '../../input';
import { Event, EventMouse, EventTouch } from '../../input/types';
import { DispatcherEventType, NodeEventProcessor } from '../../scene-graph/node-event-processor';
import { js } from '../../core';
import { InputEventType } from '../../input/types/event-enum';
import { EventDispatcherPriority, IEventDispatcher } from '../../input/input';

const mouseEvents = [
    InputEventType.MOUSE_DOWN,
    InputEventType.MOUSE_MOVE,
    InputEventType.MOUSE_UP,
    InputEventType.MOUSE_WHEEL,
    InputEventType.MOUSE_LEAVE,
    InputEventType.MOUSE_ENTER,
];
const touchEvents = [
    InputEventType.TOUCH_START,
    InputEventType.TOUCH_MOVE,
    InputEventType.TOUCH_END,
    InputEventType.TOUCH_CANCEL,
];

class PointerEventDispatcher implements IEventDispatcher {
    public priority: EventDispatcherPriority = EventDispatcherPriority.UI;

    private _isListDirty = false;
    private _inDispatchCount = 0;
    private _pointerEventProcessorList: NodeEventProcessor[] = [];
    private _processorListToAdd: NodeEventProcessor[] = [];
    private _processorListToRemove: NodeEventProcessor[] = [];

    constructor () {
        input._registerEventDispatcher(this);
        const callbacksInvoker = NodeEventProcessor.callbacksInvoker;
        callbacksInvoker.on(DispatcherEventType.ADD_POINTER_EVENT_PROCESSOR, this.addPointerEventProcessor, this);
        callbacksInvoker.on(DispatcherEventType.REMOVE_POINTER_EVENT_PROCESSOR, this.removePointerEventProcessor, this);
        callbacksInvoker.on(DispatcherEventType.MARK_LIST_DIRTY, this._markListDirty, this);
    }

    onThrowException (): void {
        this._inDispatchCount = 0;
    }

    public dispatchEvent (event: Event): boolean {
        const eventType = event.type as Input.EventType;
        if (touchEvents.includes(eventType)) {
            return this.dispatchEventTouch(event as EventTouch);
        } else if (mouseEvents.includes(eventType)) {
            return this.dispatchEventMouse(event as EventMouse);
        }
        return true;
    }

    private addPointerEventProcessor (pointerEventProcessor: NodeEventProcessor): void {
        if (this._inDispatchCount === 0) {
            if (!this._pointerEventProcessorList.includes(pointerEventProcessor)) {
                this._pointerEventProcessorList.push(pointerEventProcessor);
                this._isListDirty = true;
            }
        } else if (!this._processorListToAdd.includes(pointerEventProcessor)) {
            this._processorListToAdd.push(pointerEventProcessor);
        }
        js.array.remove(this._processorListToRemove, pointerEventProcessor);
    }

    private removePointerEventProcessor (pointerEventProcessor: NodeEventProcessor): void {
        if (this._inDispatchCount === 0) {
            js.array.remove(this._pointerEventProcessorList, pointerEventProcessor);
            this._isListDirty = true;
        } else if (!this._processorListToRemove.includes(pointerEventProcessor)) {
            this._processorListToRemove.push(pointerEventProcessor);
        }
        js.array.remove(this._processorListToAdd, pointerEventProcessor);
    }

    private dispatchEventMouse (eventMouse: EventMouse): boolean {
        this._inDispatchCount++;
        this._sortPointerEventProcessorList();
        const pointerEventProcessorList = this._pointerEventProcessorList;
        const length = pointerEventProcessorList.length;
        let dispatchToNextEventDispatcher = true;
        for (let i = 0; i < length; ++i) {
            const pointerEventProcessor = pointerEventProcessorList[i];
            if (pointerEventProcessor.isEnabled && pointerEventProcessor.shouldHandleEventMouse
                && pointerEventProcessor._handleEventMouse(eventMouse)) {
                dispatchToNextEventDispatcher = false;
                if (!eventMouse.preventSwallow) {
                    break;
                } else {
                    eventMouse.preventSwallow = false;  // reset swallow state
                }
            }
        }
        if (--this._inDispatchCount <= 0) {
            this._updatePointerEventProcessorList();
        }
        return dispatchToNextEventDispatcher;
    }

    private dispatchEventTouch (eventTouch: EventTouch): boolean {
        this._inDispatchCount++;
        this._sortPointerEventProcessorList();
        const pointerEventProcessorList = this._pointerEventProcessorList;
        const length = pointerEventProcessorList.length;
        const touch = eventTouch.touch!;
        let dispatchToNextEventDispatcher = true;
        for (let i = 0; i < length; ++i) {
            const pointerEventProcessor = pointerEventProcessorList[i];
            if (pointerEventProcessor.isEnabled && pointerEventProcessor.shouldHandleEventTouch) {
                if (eventTouch.type === InputEventType.TOUCH_START as string) {
                    if (pointerEventProcessor._handleEventTouch(eventTouch)) {
                        // pointerEventProcessor may be disabled in handling touch event above.
                        if (pointerEventProcessor.isEnabled) {
                            pointerEventProcessor.claimedTouchIdList.push(touch.getID());
                        } else {
                            const cancelEvent = new EventTouch([eventTouch.touch!], true, InputEventType.TOUCH_CANCEL);
                            cancelEvent.touch = eventTouch.touch!;
                            pointerEventProcessor.dispatchEvent(cancelEvent);
                            pointerEventProcessor.claimedTouchIdList.length = 0;
                        }

                        dispatchToNextEventDispatcher = false;
                        if (!eventTouch.preventSwallow) {
                            break;
                        } else {
                            eventTouch.preventSwallow = false;  // reset swallow state
                        }
                    }
                } else if (pointerEventProcessor.claimedTouchIdList.length > 0) {
                    const index = pointerEventProcessor.claimedTouchIdList.indexOf(touch.getID());
                    if (index !== -1) {
                        pointerEventProcessor._handleEventTouch(eventTouch);
                        if (eventTouch.type === (InputEventType.TOUCH_END as string) || eventTouch.type === (InputEventType.TOUCH_CANCEL as string)) {
                            js.array.removeAt(pointerEventProcessor.claimedTouchIdList, index);
                            // The event is handled, and the event can be swallowed, so should remove other EventProcessor's claimedTouchIdList.
                            if (!eventTouch.preventSwallow) {
                                this._removeClaimedTouch(i + 1, touch.getID());
                            }
                        }
                        dispatchToNextEventDispatcher = false;
                        if (!eventTouch.preventSwallow) {
                            break;
                        } else {
                            eventTouch.preventSwallow = false;  // reset swallow state
                        }
                    }
                }
            }
        }
        if (--this._inDispatchCount <= 0) {
            this._updatePointerEventProcessorList();
        }
        return dispatchToNextEventDispatcher;
    }

    private _removeClaimedTouch (eventProcessorIndex: number, touchID: number): void {
        const pointerEventProcessorList = this._pointerEventProcessorList;
        const length = pointerEventProcessorList.length;
        for (let i = eventProcessorIndex; i < length; ++i) {
            const pointerEventProcessor = pointerEventProcessorList[i];
            const touchIndex = pointerEventProcessor.claimedTouchIdList.indexOf(touchID);
            if (touchIndex !== -1) {
                js.array.removeAt(pointerEventProcessor.claimedTouchIdList, touchIndex);
            }
        }
    }

    private _updatePointerEventProcessorList (): void {
        const listToAdd = this._processorListToAdd;
        const addLength = listToAdd.length;
        for (let i = 0; i < addLength; ++i) {
            this.addPointerEventProcessor(listToAdd[i]);
        }
        listToAdd.length = 0;

        const listToRemove = this._processorListToRemove;
        const removeLength = listToRemove.length;
        for (let i = 0; i < removeLength; ++i) {
            this.removePointerEventProcessor(listToRemove[i]);
        }
        listToRemove.length = 0;
    }

    private _sortPointerEventProcessorList (): void {
        if (!this._isListDirty) {
            return;
        }
        const pointerEventProcessorList = this._pointerEventProcessorList;
        const length = pointerEventProcessorList.length;
        for (let i = 0; i < length; ++i) {
            const pointerEventProcessor = pointerEventProcessorList[i];
            const node = pointerEventProcessor.node;
            if (node._uiProps) {
                const trans = node._getUITransformComp();
                pointerEventProcessor.cachedCameraPriority = trans!.cameraPriority;
            }
        }
        pointerEventProcessorList.sort(this._sortByPriority);
        this._isListDirty = false;
    }

    private _sortByPriority (p1: NodeEventProcessor, p2: NodeEventProcessor): number {
        const node1: Node = p1.node;
        const node2: Node = p2.node;
        if (!p2 || !node2 || !node2.activeInHierarchy || !node2._getUITransformComp()) {
            return -1;
        } else if (!p1 || !node1 || !node1.activeInHierarchy || !node1._getUITransformComp()) {
            return 1;
        }

        if (p1.cachedCameraPriority !== p2.cachedCameraPriority) {
            return p2.cachedCameraPriority - p1.cachedCameraPriority;
        }
        let n1: Node | null = node1;
        let n2: Node | null = node2;
        let ex = false;
        while (n1!.parent?.uuid !== n2!.parent?.uuid) {
            n1 = n1?.parent?.parent === null ? (ex = true) && node2 : n1 && n1.parent;
            n2 = n2?.parent?.parent === null ? (ex = true) && node1 : n2 && n2.parent;
        }

        if (n1!.uuid === n2!.uuid) {
            if (n1!.uuid === node2.uuid) {
                return -1;
            }
            if (n1!.uuid === node1.uuid) {
                return 1;
            }
        }

        const priority1 = n1 ? n1.siblingIndex : 0;
        const priority2 = n2 ? n2.siblingIndex : 0;

        return ex ? priority1 - priority2 : priority2 - priority1;
    }

    private _markListDirty (): void {
        this._isListDirty = true;
    }
}

export const pointerEventDispatcher = new PointerEventDispatcher();
