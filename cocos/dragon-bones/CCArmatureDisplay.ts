/* eslint-disable @typescript-eslint/no-unsafe-return */
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

import { Armature, DisplayData, IEventDispatcher, Slot } from '@cocos/dragonbones-js';
import { Vec3, EventTarget, _decorator, warn } from '../core';
// eslint-disable-next-line import/named
import { CCSlot } from './CCSlot';
import { ArmatureDisplay } from './ArmatureDisplay';
import { Node } from '../scene-graph';

const { ccclass } = _decorator;

/**
 * @en CCArmatureDisplay contains function about data showing and sending events.
 * @zh CCArmatureDisplay 封装了数据显示和事件派发的功能。
 */
@ccclass('dragonBones.CCArmatureDisplay')
export class CCArmatureDisplay extends DisplayData implements IEventDispatcher {
    /**
     * @en Return this.
     * @zh 返回自身。
     */
    get node (): CCArmatureDisplay { return this; }
    /**
     * @deprecated This variable will be removed in the future.
     */
    shouldAdvanced = false;
    /**
     * @en The node contains ArmatureDisplay component.
     * @zh ArmatureDisplay 组件所在的 node。
     */
    _ccNode: Node|null = null;
    /**
     * @en ArmatureDisplay component.
     * @zh ArmatureDisplay 组件。
     */
    _ccComponent: ArmatureDisplay |null = null;
    /**
     * @en EventTarget is an object to which an event is dispatched when something has occurred.
     * @zh 事件目标是具有注册监听器、派发事件能力的对象。
     */
    _eventTarget: EventTarget;
    /**
     * @en The core Armature object.
     * @zh 核心骨架对象。
     */
    _armature: Armature | null = null;

    constructor () {
        super();
        this._eventTarget = new EventTarget();
    }
    /**
     * @en The funciton is empty and always return false.
     * @zh 方法未实现总返回 false。
     */
    hasEvent (type: string): boolean {
        warn('Method not implemented.');
        return false;
    }
    /**
     * @en The funciton has no realization.
     * @zh 方法未实现。
     */
    addEvent (type: string, listener: any, thisObject: any): void {
        warn('Method not implemented.');
    }
    /**
     * @en The funciton has no realization.
     * @zh 方法未实现。
     */
    removeEvent (type: string, listener: any, thisObject: any): void {
        warn('Method not implemented.');
    }
    /**
     * @en Sets EventTarget object.
     * @zh 设置事件目标。
     */
    setEventTarget (eventTarget: EventTarget): void {
        this._eventTarget = eventTarget;
    }
    /**
     * @en Gets the root display object.
     * @zh 获取顶层的显示容器实例。
     */
    getRootDisplay (): CCArmatureDisplay {
        let parentSlot = this._armature!._parent;
        if (!parentSlot) {
            return this;
        }

        let slot: Slot;
        while (parentSlot) {
            slot = parentSlot;
            parentSlot = parentSlot._armature._parent;
        }
        return slot!._armature.display;
    }
    /**
     * @en Convert pos to parent slot coordination.
     * @zh 将坐标转换到父插槽的坐标系下。
     */
    convertToRootSpace (pos: Vec3): Vec3 {
        const slot = this._armature!._parent as CCSlot;
        if (!slot) {
            return pos;
        }
        slot.updateWorldMatrix();

        const worldMatrix = slot._worldMatrix;
        const newPos = new Vec3(0, 0);
        newPos.x = pos.x * worldMatrix.m00 + pos.y * worldMatrix.m04 + worldMatrix.m12;
        newPos.y = pos.x * worldMatrix.m01 + pos.y * worldMatrix.m05 + worldMatrix.m13;
        return newPos;
    }
    /**
     * @en Convert pos to world coordination.
     * @zh 将坐标转换到世界坐标系下。
     */
    convertToWorldSpace (point: Vec3): Vec3 | undefined {
        const newPos = this.convertToRootSpace(point);
        const ccNode = this.getRootNode();
        return ccNode?._getUITransformComp()?.convertToWorldSpaceAR(newPos);
    }
    /**
     * @en Get the node of root ArmatureDisplay component in.
     * @zh 获取顶层 ArmatureDisplay 组件所在的 node。
     */
    getRootNode (): Node | null {
        const rootDisplay = this.getRootDisplay();
        return rootDisplay && rootDisplay._ccNode;
    }

    /**
     * @en Initialize _armature at start.
     * @zh 初始时设置骨架。
     */
    // dragonbones api
    dbInit (armature: Armature | null): void {
        this._armature = armature;
    }
    /**
     * @en Clears Armature object.
     * @zh 清除骨架对象。
     */
    dbClear (): void {
        this._armature = null;
    }
    /**
     * @en Trigger ArmatureDisplay component to update render data.
     * @zh 触发 ArmatureDisplay 组件更新渲染数据。
     */
    dbUpdate (): void {
        if (this._ccComponent) {
            this._ccComponent._markForUpdateRenderData();
        }
    }
    /**
     * @engineInternal Since v3.7.2.
     * @deprecated This variable will be removed in the future.
     */
    advanceTimeBySelf (on: boolean | number): void {
        this.shouldAdvanced = !!on;
    }

    hasDBEventListener (type: string): boolean {
        return this._eventTarget.hasEventListener(type);
    }

    addDBEventListener (type: string, listener, target): void {
        this._eventTarget.on(type, listener, target);
    }

    removeDBEventListener (type: string, listener, target): void {
        this._eventTarget.off(type, listener, target);
    }

    dispatchDBEvent (type: string, eventObject): void {
        this._eventTarget.emit(type, eventObject);
    }
}
