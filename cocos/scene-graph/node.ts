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

import { ccclass, editable, serializable, type } from 'cc.decorator';
import { DEV, DEBUG, EDITOR, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { Layers } from './layers';
import { NodeUIProperties } from './node-ui-properties';
import { legacyCC } from '../core/global-exports';
import { nodePolyfill } from './node-dev';
import { ISchedulable } from '../core/scheduler';
import { approx, EPSILON, Mat3, mat4, Mat4, quat, Quat, v3, Vec3 } from '../core/math';
import { MobilityMode, NodeSpace, TransformBit } from './node-enum';
import { CustomSerializable, editorExtrasTag, SerializationContext, SerializationOutput, serializeTag } from '../core/data';
import { errorID, warnID, error, log, getError } from '../core/platform/debug';
import { Component } from './component';
import { property } from '../core/data/decorators/property';
import { CCObject, js } from '../core';
import type { Scene } from './scene';
import { PrefabInfo, PrefabInstance } from './prefab/prefab-info';
import { NodeEventType } from './node-event';
import { Event } from '../input/types';
import type { NodeEventProcessor } from './node-event-processor';

const Destroying = CCObject.Flags.Destroying;
const DontDestroy = CCObject.Flags.DontDestroy;
const Deactivating = CCObject.Flags.Deactivating;

export const TRANSFORM_ON = 1 << 0;
const ACTIVE_ON = 1 << 1;

const idGenerator = new js.IDGenerator('Node');

function getConstructor<T> (typeOrClassName: string | Constructor<T> | AbstractedConstructor<T>): Constructor<T> | AbstractedConstructor<T> | null | undefined {
    if (!typeOrClassName) {
        errorID(3804);
        return null;
    }
    if (typeof typeOrClassName === 'string') {
        return js.getClassByName(typeOrClassName) as Constructor<T> | undefined;
    }

    return typeOrClassName;
}

const v3_a = v3();
const v3_b = v3();
const q_a = quat();
const q_b = quat();
const qt_1 = quat();
const m3_1 = new Mat3();
const m4_1 = mat4();
const m4_2 = mat4();
const dirtyNodes: Node[] = [];

const reserveContentsForAllSyncablePrefabTag = Symbol('ReserveContentsForAllSyncablePrefab');
let globalFlagChangeVersion = 0;

/**
 * @zh
 * 场景树中的基本节点，基本特性有：
 * * 具有层级关系
 * * 持有各类组件
 * * 维护空间变换（坐标、旋转、缩放）信息
 */

/**
 * @en
 * Class of all entities in Cocos Creator scenes.
 * Basic functionalities include:
 * * Hierarchy management with parent and children
 * * Components management
 * * Coordinate system with position, scale, rotation in 3d space
 * @zh
 * Cocos Creator 场景中的所有节点类。
 * 基本特性有：
 * * 具有层级关系
 * * 持有各类组件
 * * 维护 3D 空间左边变换（坐标、旋转、缩放）信息
 */
@ccclass('cc.Node')
export class Node extends CCObject implements ISchedulable, CustomSerializable {
    // --------------------- legacy BaseNode ---------------------
    /**
     * @en Gets all components attached to this node.
     * @zh 获取附加到此节点的所有组件。
     */
    get components (): ReadonlyArray<Component> {
        return this._components;
    }

    /**
     * @en If true, the node is an persist node which won't be destroyed during scene transition.
     * If false, the node will be destroyed automatically when loading a new scene. Default is false.
     * @zh 如果为true，则该节点是一个常驻节点，不会在场景转换期间被销毁。
     * 如果为false，节点将在加载新场景时自动销毁。默认为 false。
     * @default false
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @property
    get _persistNode (): boolean {
        return (this._objFlags & DontDestroy) > 0;
    }
    set _persistNode (value) {
        if (value) {
            this._objFlags |= DontDestroy;
        } else {
            this._objFlags &= ~DontDestroy;
        }
    }

    // API

    /**
     * @en Name of node.
     * @zh 该节点名称。
     */
    @editable
    get name (): string {
        return this._name;
    }
    set name (value) {
        if (DEV && value.indexOf('/') !== -1) {
            errorID(1632);
            return;
        }
        this._name = value;
    }

    /**
     * @en The uuid for editor, will be stripped after building project.
     * @zh 主要用于编辑器的 uuid，在编辑器下可用于持久化存储，在项目构建之后将变成自增的 id。
     * @readOnly
     */
    get uuid (): string {
        return this._id;
    }

    /**
     * @en All children nodes.
     * @zh 节点的所有子节点。
     * @readOnly
     */
    @editable
    get children (): Node[] {
        return this._children as Node[]; // TODO:remove as Node[]?
    }

    /**
     * @en
     * The local active state of this node.
     * Note that a Node may be inactive because a parent is not active, even if this returns true.
     * Use [[activeInHierarchy]]
     * if you want to check if the Node is actually treated as active in the scene.
     * @zh
     * 当前节点的自身激活状态。
     * 值得注意的是，一个节点的父节点如果不被激活，那么即使它自身设为激活，它仍然无法激活。
     * 如果你想检查节点在场景中实际的激活状态可以使用 [[activeInHierarchy]]
     * @default true
     */
    @editable
    get active (): boolean {
        return this._active;
    }
    set active (isActive: boolean) {
        isActive = !!isActive;

        if (this._active !== isActive) {
            this._active = isActive;
            const parent = this._parent;
            if (parent) {
                const couldActiveInScene = parent._activeInHierarchy;
                if (couldActiveInScene) {
                    legacyCC.director._nodeActivator.activateNode(this, isActive);
                }
            }
        }
    }

    /**
     * @engineInternal please don't use this method.
     */
    public _setActiveInHierarchy (v: boolean): void {
        this._activeInHierarchy = v;
    }

    /**
     * @en Indicates whether this node is active in the scene.
     * @zh 表示此节点是否在场景中激活。
     */
    @editable
    get activeInHierarchy (): boolean {
        return this._activeInHierarchy;
    }

    /**
      * @en The parent node
      * @zh 父节点
      */
    @editable
    get parent (): Node | null {
        return this._parent;
    }
    set parent (value: Node | null) {
        this.setParent(value);
    }

    /**
     * @en Which scene this node belongs to.
     * @zh 此节点属于哪个场景。
     * @readonly
     */
    get scene (): Scene {
        return this._scene;
    }

    /**
     * @en The event processor of the current node, it provides EventTarget ability.
     * @zh 当前节点的事件处理器，提供 EventTarget 能力。
     * @readonly
     *
     * @deprecated since v3.4.0
     */
    get eventProcessor (): NodeEventProcessor {
        return this._eventProcessor;
    }

    /**
     * @internal
     */
    protected static idGenerator = idGenerator;

    /**
     * for walk
     * @internal
     */
    protected static _stacks: Array<Array<(Node | null)>> = [[]];
    /**
     * @internal
     */
    protected static _stackId = 0;

    /**
     * Call `_updateScene` of specified node.
     * @internal
     * @param node The node.
     */
    protected static _setScene (node: Node): void {
        node._updateScene();
    }

    protected static _findComponent<T extends Component> (node: Node, constructor: Constructor<T> | AbstractedConstructor<T>): T | null {
        const cls = constructor;
        const comps = node._components;
        // NOTE: internal rtti property
        if ((cls as any)._sealed) {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp.constructor === constructor) {
                    return comp as T;
                }
            }
        } else {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp instanceof constructor) {
                    return comp;
                }
            }
        }
        return null;
    }

    protected static _findComponents<T extends Component> (node: Node, constructor: Constructor<T> | AbstractedConstructor<T>, components: Component[]): void {
        const cls = constructor;
        const comps = node._components;
        // NOTE: internal rtti property
        if ((cls as any)._sealed) {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp.constructor === constructor) {
                    components.push(comp);
                }
            }
        } else {
            for (let i = 0; i < comps.length; ++i) {
                const comp = comps[i];
                if (comp instanceof constructor) {
                    components.push(comp);
                }
            }
        }
    }

    protected static _findChildComponent<T extends Component> (children: Node[], constructor: Constructor<T> | AbstractedConstructor<T>): T | null {
        for (let i = 0; i < children.length; ++i) {
            const node = children[i];
            let comp = Node._findComponent(node, constructor);
            if (comp) {
                return comp;
            }

            if (node._children.length > 0) {
                comp = Node._findChildComponent(node._children, constructor);
                if (comp) {
                    return comp;
                }
            }
        }
        return null;
    }

    protected static _findChildComponents<T extends Component> (
        children: Node[],
        constructor: Constructor<T> | AbstractedConstructor<T>,
        components: Component[],
    ): void {
        for (let i = 0; i < children.length; ++i) {
            const node = children[i];
            Node._findComponents(node, constructor, components);
            if (node._children.length > 0) {
                Node._findChildComponents(node._children, constructor, components);
            }
        }
    }

    @serializable
    protected _parent: this | null = null;

    @serializable
    protected _children: this[] = [];

    @serializable
    protected _active = true;

    /**
     * NOTE: components getter is typeof ReadonlyArray
     * @engineInternal
     */
    public getWritableComponents (): Component[] { return this._components; }
    @serializable
    protected _components: Component[] = [];

    /**
     * TODO(PP_Pro): this property should be exported to editor only, we should support editorOnly tag.
     * Tracking issue: https://github.com/cocos/cocos-engine/issues/14613
     */
    @serializable
    protected _prefab: PrefabInfo | null = null;
    /**
     * @engineInternal
     */
    public get prefab (): PrefabInfo | null { return this._prefab; }

    protected _scene: Scene = null!;

    protected _activeInHierarchy = false;

    /**
     * @engineInternal
     */
    public set id (v: string) { this._id = v; }
    protected _id: string = idGenerator.getNewId();

    protected _eventProcessor: NodeEventProcessor = new (legacyCC.NodeEventProcessor as typeof NodeEventProcessor)(this);
    protected _eventMask = 0;

    protected _siblingIndex = 0;
    /**
     * @engineInternal
     */
    public get siblingIndex (): number { return this._siblingIndex; }
    /**
     * @engineInternal
     */
    public set siblingIndex (val: number) { this._siblingIndex = val; }

    /**
     * @en
     * record scene's id when set this node as persist node
     * @zh
     * 当设置节点为常驻节点时记录场景的 id
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _originalSceneId = '';

    /**
     * Set `_scene` field of this node.
     * The derived `Scene` overrides this method to behavior differently.
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    protected _updateScene (): void {
        if (this._parent == null) {
            errorID(1640, this.name, this.uuid);
        } else {
            this._scene = this._parent._scene;
        }
    }

    /**
     * @en
     * Properties configuration function.
     * All properties in attrs will be set to the node,
     * when the setter of the node is available,
     * the property will be set via setter function.
     * @zh 属性配置函数。在 attrs 的所有属性将被设置为节点属性。
     * @param attrs - Properties to be set to node
     * @example
     * ```
     * var attrs = { name: 'New Name', active: false };
     * node.attr(attrs);
     * ```
     */
    public attr (attrs: unknown): void {
        js.mixin(this, attrs);
    }

    /**
     * @en Get parent of the node.
     * @zh 获取该节点的父节点。
     */
    public getParent (): Node | null {
        return this._parent;
    }

    /**
     * As there are setter and setParent(), and both of them not just modify _parent, but have
     * other logic. So add a new function that only modify _parent value.
     * @engineInternal
     */
    public modifyParent (parent: this | null): void {
        this._parent = parent;
    }

    /**
     * @en Set parent of the node.
     * @zh 设置该节点的父节点。
     * @param value Parent node
     * @param keepWorldTransform Whether keep node's current world transform unchanged after this operation
     */
    public setParent (value: Node | null, keepWorldTransform = false): void {
        if (keepWorldTransform) { this.updateWorldTransform(); }

        if (this._parent === value) {
            return;
        }
        const oldParent = this._parent;
        const newParent = value as this;
        if (DEBUG && oldParent
            // Change parent when old parent deactivating or activating
            && (oldParent._objFlags & Deactivating)) {
            errorID(3821);
        }

        this._parent = newParent;
        // Reset sibling index
        this._siblingIndex = 0;

        this._onSetParent(oldParent, keepWorldTransform);

        if (this.emit) {
            this.emit(NodeEventType.PARENT_CHANGED, oldParent);
        }

        if (oldParent) {
            if (!(oldParent._objFlags & Destroying)) {
                const removeAt = oldParent._children.indexOf(this);
                if (DEV && removeAt < 0) {
                    errorID(1633);
                    return;
                }
                oldParent._children.splice(removeAt, 1);
                oldParent._updateSiblingIndex();
                if (oldParent.emit) {
                    oldParent.emit(NodeEventType.CHILD_REMOVED, this);
                }
            }
        }

        if (newParent) {
            if (DEBUG && (newParent._objFlags & Deactivating)) {
                errorID(3821);
            }
            newParent._children.push(this);
            this._siblingIndex = newParent._children.length - 1;
            if (newParent.emit) {
                newParent.emit(NodeEventType.CHILD_ADDED, this);
            }
        }

        this._onHierarchyChanged(oldParent);
    }

    /**
     * @en Returns a child with the same uuid.
     * @zh 通过 uuid 获取节点的子节点。
     * @param uuid - The uuid to find the child node.
     * @return a Node whose uuid equals to the input parameter
     */
    public getChildByUuid (uuid: string): Node | null {
        if (!uuid) {
            log('Invalid uuid');
            return null;
        }

        const locChildren = this._children;
        for (let i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._id === uuid) {
                return locChildren[i] as Node;
            }
        }
        return null;
    }

    /**
     * @en Returns a child with the same name.
     * @zh 通过名称获取节点的子节点。
     * @param name - A name to find the child node.
     * @return a CCNode object whose name equals to the input parameter
     * @example
     * ```
     * var child = node.getChildByName("Test Node");
     * ```
     */
    public getChildByName (name: string): Node | null {
        if (!name) {
            log('Invalid name');
            return null;
        }

        const locChildren = this._children;
        for (let i = 0, len = locChildren.length; i < len; i++) {
            if (locChildren[i]._name === name) {
                return locChildren[i] as Node;
            }
        }
        return null;
    }

    /**
     * @en Returns a child with the given path.
     * @zh 通过路径获取节点的子节点。
     * @param path - A path to find the child node.
     * @return a Node object whose path equals to the input parameter
     * @example
     * ```
     * var child = node.getChildByPath("subNode/Test Node");
     * ```
     */
    public getChildByPath (path: string): Node | null {
        const segments = path.split('/');
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let lastNode: Node = this;
        for (let i = 0; i < segments.length; ++i) {
            const segment = segments[i];
            if (segment.length === 0) {
                continue;
            }
            const next = lastNode.children.find((childNode) => childNode.name === segment);
            if (!next) {
                return null;
            }
            lastNode = next;
        }
        return lastNode;
    }

    /**
     * @en Add a child to the current node.
     * @zh 添加一个子节点。
     * @param child - the child node to be added
     */
    public addChild (child: Node): void {
        child.setParent(this);
    }

    /**
     * @en Inserts a child to the node at a specified index.
     * @zh 插入子节点到指定位置
     * @param child - the child node to be inserted
     * @param siblingIndex - the sibling index to place the child in
     * @example
     * ```
     * node.insertChild(child, 2);
     * ```
     */
    public insertChild (child: Node, siblingIndex: number): void {
        child.setParent(this);
        child.setSiblingIndex(siblingIndex);
    }

    /**
     * @en Get the sibling index of the current node in its parent's children array.
     * @zh 获取当前节点在父节点的 children 数组中的位置。
     */
    public getSiblingIndex (): number {
        return this._siblingIndex;
    }

    /**
     * @en Set the sibling index of the current node in its parent's children array.
     * @zh 设置当前节点在父节点的 children 数组中的位置。
     */
    public setSiblingIndex (index: number): void {
        if (!this._parent) {
            return;
        }
        if (this._parent._objFlags & Deactivating) {
            errorID(3821);
            return;
        }
        const siblings = this._parent._children;
        index = index >= 0 ? index : siblings.length + index;
        const oldIndex = siblings.indexOf(this);
        if (index !== oldIndex) {
            siblings.splice(oldIndex, 1);
            if (index < siblings.length) {
                siblings.splice(index, 0, this);
            } else {
                siblings.push(this);
            }
            this._parent._updateSiblingIndex();
            if (this._onSiblingIndexChanged) {
                this._onSiblingIndexChanged(index);
            }
            this._eventProcessor.onUpdatingSiblingIndex();
        }
    }

    /**
     * @en Walk though the sub children tree of the current node.
     * Each node, including the current node, in the sub tree will be visited two times,
     * before all children and after all children.
     * This function call is not recursive, it's based on stack.
     * Please don't walk any other node inside the walk process.
     * @zh 遍历该节点的子树里的所有节点并按规则执行回调函数。
     * 对子树中的所有节点，包含当前节点，会执行两次回调，preFunc 会在访问它的子节点之前调用，postFunc 会在访问所有子节点之后调用。
     * 这个函数的实现不是基于递归的，而是基于栈展开递归的方式。
     * 请不要在 walk 过程中对任何其他的节点嵌套执行 walk。
     * @param preFunc The callback to process node when reach the node for the first time
     * @param postFunc The callback to process node when re-visit the node after walked all children in its sub tree
     * @example
     * ```
     * node.walk(function (target) {
     *     console.log('Walked through node ' + target.name + ' for the first time');
     * }, function (target) {
     *     console.log('Walked through node ' + target.name + ' after walked all children in its sub tree');
     * });
     * ```
     */
    public walk (preFunc: (target: this) => void, postFunc?: (target: this) => void): void {
        let index = 1;
        let children: this[] | null = null;
        let curr: this | null = null;
        let i = 0;
        let stack = Node._stacks[Node._stackId];
        if (!stack) {
            stack = [];
            Node._stacks.push(stack);
        }
        Node._stackId++;

        stack.length = 0;
        stack[0] = this;
        let parent: this | null = null;
        let afterChildren = false;
        while (index) {
            index--;
            curr = stack[index] as (this | null);
            if (!curr) {
                continue;
            }
            if (!afterChildren && preFunc) {
                // pre call
                preFunc(curr);
            } else if (afterChildren && postFunc) {
                // post call
                postFunc(curr);
            }

            // Avoid memory leak
            stack[index] = null;
            // Do not repeatedly visit child tree, just do post call and continue walk
            if (afterChildren) {
                if (parent === this._parent) break;
                afterChildren = false;
            } else {
                // Children not proceeded and has children, proceed to child tree
                if (curr._children.length > 0) {
                    parent = curr;
                    children = curr._children;
                    i = 0;
                    stack[index] = children[i];
                    index++;
                } else {
                    stack[index] = curr;
                    index++;
                    afterChildren = true;
                }
                continue;
            }
            // curr has no sub tree, so look into the siblings in parent children
            if (children) {
                i++;
                // Proceed to next sibling in parent children
                if (children[i]) {
                    stack[index] = children[i];
                    index++;
                } else if (parent) {
                    stack[index] = parent;
                    index++;
                    // Setup parent walk env
                    afterChildren = true;
                    if (parent._parent) {
                        children = parent._parent._children;
                        i = children.indexOf(parent);
                        parent = parent._parent;
                    } else {
                        // At root
                        parent = null;
                        children = null;
                    }

                    // ERROR
                    if (i < 0) {
                        break;
                    }
                }
            }
        }
        stack.length = 0;
        Node._stackId--;
    }

    /**
     * @en
     * Remove itself from its parent node.
     * If the node have no parent, then nothing happens.
     * @zh
     * 从父节点中删除该节点。
     * 如果这个节点是一个孤立节点，那么什么都不会发生。
     */
    public removeFromParent (): void {
        if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    /**
     * @en Removes a child from the container.
     * @zh 移除节点中指定的子节点。
     * @param child - The child node which will be removed.
     */
    public removeChild (child: this | Node): void {
        if (this._children.indexOf(child as this) > -1) {
            // invoke the parent setter
            child.parent = null;
        }
    }

    /**
     * @en Removes all children from the container.
     * @zh 移除节点所有的子节点。
     */
    public removeAllChildren (): void {
        // not using detachChild improves speed here
        const children = this._children;
        for (let i = children.length - 1; i >= 0; i--) {
            const node = children[i];
            if (node) {
                node.parent = null;
            }
        }
        this._children.length = 0;
    }

    /**
     * @en Is this node a child of the given node?
     * @zh 是否是指定节点的子节点？
     * @return True if this node is a child, deep child or identical to the given node.
     */
    public isChildOf (parent: this | Scene | null): boolean {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let child: Node | null = this;
        do {
            if (child === parent) {
                return true;
            }
            child = child._parent;
        }
        while (child);
        return false;
    }

    // COMPONENT

    /**
     * @en
     * Returns the component of supplied type if the node has one attached, null if it doesn't.
     * You can also get component in the node by passing in the name of the script.
     * @zh
     * 获取节点上指定类型的组件，如果节点有附加指定类型的组件，则返回，如果没有则为空。
     * 传入参数也可以是脚本的名称。
     * @param classConstructor The class of the target component
     * @example
     * ```
     * // get sprite component.
     * var sprite = node.getComponent(Sprite);
     * ```
     */
    public getComponent<T extends Component>(classConstructor: Constructor<T> | AbstractedConstructor<T>): T | null;

    /**
      * @en
      * Returns the component of supplied type if the node has one attached, null if it doesn't.
      * You can also get component in the node by passing in the name of the script.
      * @zh
      * 获取节点上指定类型的组件，如果节点有附加指定类型的组件，则返回，如果没有则为空。
      * 传入参数也可以是脚本的名称。
      * @param className The class name of the target component
      * @example
      * ```
      * // get custom test class.
      * var test = node.getComponent("Test");
      * ```
      */
    public getComponent(className: string): Component | null;

    public getComponent<T extends Component> (typeOrClassName: string | Constructor<T> | AbstractedConstructor<T>): T | null {
        const constructor = getConstructor(typeOrClassName);
        if (constructor) {
            return Node._findComponent(this, constructor);
        }
        return null;
    }

    /**
     * @en Returns all components of given type in the node.
     * @zh 返回节点上指定类型的所有组件。
     * @param classConstructor The class of the target component
     */
    public getComponents<T extends Component>(classConstructor: Constructor<T> | AbstractedConstructor<T>): T[];

    /**
     * @en Returns all components of given type in the node.
     * @zh 返回节点上指定类型的所有组件。
     * @param className The class name of the target component
     */
    public getComponents(className: string): Component[];

    public getComponents<T extends Component> (typeOrClassName: string | Constructor<T> | AbstractedConstructor<T>): Component[] {
        const constructor = getConstructor(typeOrClassName);
        const components: Component[] = [];
        if (constructor) {
            Node._findComponents(this, constructor, components);
        }
        return components;
    }

    /**
     * @en Returns the component of given type in any of its children using depth first search.
     * @zh 递归查找所有子节点中第一个匹配指定类型的组件。
     * @param classConstructor The class of the target component
     * @example
     * ```
     * var sprite = node.getComponentInChildren(Sprite);
     * ```
     */
    public getComponentInChildren<T extends Component>(classConstructor: Constructor<T> | AbstractedConstructor<T>): T | null;

    /**
     * @en Returns the component of given type in any of its children using depth first search.
     * @zh 递归查找所有子节点中第一个匹配指定类型的组件。
     * @param className The class name of the target component
     * @example
     * ```
     * var Test = node.getComponentInChildren("Test");
     * ```
     */
    public getComponentInChildren(className: string): Component | null;

    public getComponentInChildren<T extends Component> (typeOrClassName: string | Constructor<T> | AbstractedConstructor<T>): T | null {
        const constructor = getConstructor(typeOrClassName);
        if (constructor) {
            return Node._findChildComponent(this._children, constructor);
        }
        return null;
    }

    /**
     * @en Returns all components of given type in self or any of its children.
     * @zh 递归查找自身或所有子节点中指定类型的组件
     * @param classConstructor The class of the target component
     * @example
     * ```
     * var sprites = node.getComponentsInChildren(Sprite);
     * ```
     */
    public getComponentsInChildren<T extends Component>(classConstructor: Constructor<T> | AbstractedConstructor<T>): T[];

    /**
     * @en Returns all components of given type in self or any of its children.
     * @zh 递归查找自身或所有子节点中指定类型的组件
     * @param className The class name of the target component
     * @example
     * ```
     * var tests = node.getComponentsInChildren("Test");
     * ```
     */
    public getComponentsInChildren(className: string): Component[];

    public getComponentsInChildren<T extends Component> (typeOrClassName: string | Constructor<T> | AbstractedConstructor<T>): Component[] {
        const constructor = getConstructor(typeOrClassName);
        const components: Component[] = [];
        if (constructor) {
            Node._findComponents(this, constructor, components);
            Node._findChildComponents(this._children, constructor, components);
        }
        return components;
    }

    /**
     * @en Adds a component class to the node. You can also add component to node by passing in the name of the script.
     * @zh 向节点添加一个指定类型的组件类，你还可以通过传入脚本的名称来添加组件。
     * @param classConstructor The class of the component to add
     * @throws `TypeError` if the `classConstructor` does not specify a cc-class constructor extending the `Component`.
     * @example
     * ```
     * var sprite = node.addComponent(Sprite);
     * ```
     */
    public addComponent<T extends Component>(classConstructor: Constructor<T>): T;

    /**
     * @en Adds a component class to the node. You can also add component to node by passing in the name of the script.
     * @zh 向节点添加一个指定类型的组件类，你还可以通过传入脚本的名称来添加组件。
     * @param className The class name of the component to add
     * @throws `TypeError` if the `className` does not specify a cc-class constructor extending the `Component`.
     * @example
     * ```
     * var test = node.addComponent("Test");
     * ```
     */
    public addComponent(className: string): Component;

    public addComponent<T extends Component> (typeOrClassName: string | Constructor<T>): T {
        if (EDITOR && (this._objFlags & Destroying)) {
            throw Error('isDestroying');
        }

        // get component

        let constructor: Constructor<T> | null | undefined;
        if (typeof typeOrClassName === 'string') {
            constructor = js.getClassByName(typeOrClassName) as Constructor<T> | undefined;
            if (!constructor) {
                if (legacyCC._RF.peek()) {
                    errorID(3808, typeOrClassName);
                }
                throw TypeError(getError(3807, typeOrClassName));
            }
        } else {
            if (!typeOrClassName) {
                throw TypeError(getError(3804));
            }
            constructor = typeOrClassName;
        }

        // check component

        if (typeof constructor !== 'function') {
            throw TypeError(getError(3809));
        }
        if (!js.isChildClassOf(constructor, legacyCC.Component)) {
            throw TypeError(getError(3810));
        }

        if (EDITOR && (constructor as typeof constructor & { _disallowMultiple?: unknown })._disallowMultiple) {
            this._checkMultipleComp!(constructor);
        }

        // check requirement

        const reqComps = (constructor as typeof constructor & { _requireComponent?: typeof Component })._requireComponent;
        if (reqComps) {
            // FIXME: why it can be array here?
            if (Array.isArray(reqComps)) {
                for (let i = 0; i < reqComps.length; i++) {
                    const reqComp = reqComps[i] as Constructor<Component>;
                    if (!this.getComponent(reqComp)) {
                        this.addComponent(reqComp);
                    }
                }
            } else {
                const reqComp = reqComps;
                if (!this.getComponent(reqComp)) {
                    this.addComponent(reqComp);
                }
            }
        }

        /// / check conflict
        //
        // if (EDITOR && !_Scene.DetectConflict.beforeAddComponent(this, constructor)) {
        //    return null;
        // }

        //

        const component = new constructor();
        component.node = (this as unknown as Node); // TODO: HACK here
        this._components.push(component);
        if (EDITOR && EditorExtends.Node && EditorExtends.Component) {
            const node = EditorExtends.Node.getNode(this._id);
            if (node) {
                EditorExtends.Component.add(component._id, component);
            }
        }
        this.emit(NodeEventType.COMPONENT_ADDED, component);
        if (this._activeInHierarchy) {
            legacyCC.director._nodeActivator.activateComp(component);
        }
        if (EDITOR_NOT_IN_PREVIEW) {
            component.resetInEditor?.();
        }

        return component;
    }

    /**
     * @en
     * Removes a component identified by the given name or removes the component object given.
     * You can also use component.destroy() if you already have the reference.
     * @zh
     * 删除节点上的指定组件，传入参数可以是一个组件构造函数或组件名，也可以是已经获得的组件引用。
     * 如果你已经获得组件引用，你也可以直接调用 component.destroy()
     * @param classConstructor The class of the component to remove
     * @deprecated please destroy the component to remove it.
     * @example
     * ```
     * node.removeComponent(Sprite);
     * ```
     */
    public removeComponent<T extends Component>(classConstructor: Constructor<T> | AbstractedConstructor<T>): void;

    /**
     * @en
     * Removes a component identified by the given name or removes the component object given.
     * You can also use component.destroy() if you already have the reference.
     * @zh
     * 删除节点上的指定组件，传入参数可以是一个组件构造函数或组件名，也可以是已经获得的组件引用。
     * 如果你已经获得组件引用，你也可以直接调用 component.destroy()
     * @param classNameOrInstance The class name of the component to remove or the component instance to be removed
     * @deprecated please destroy the component to remove it.
     * @example
     * ```
     * import { Sprite } from 'cc';
     * const sprite = node.getComponent(Sprite);
     * if (sprite) {
     *     node.removeComponent(sprite);
     * }
     * node.removeComponent('Sprite');
     * ```
     */
    public removeComponent(classNameOrInstance: string | Component): void;

    public removeComponent (component: any): void {
        if (!component) {
            errorID(3813);
            return;
        }

        let componentInstance: Component | null = null;
        if (component instanceof Component) {
            componentInstance = component;
        } else {
            // "component as string": Just make eslint happy.
            componentInstance = this.getComponent(component as string);
        }
        if (componentInstance) {
            componentInstance.destroy();
        }
    }

    // EVENT PROCESSING

    /**
     * @en
     * Register a callback of a specific event type on Node.
     * Use this method to register touch or mouse event permit propagation based on scene graph,
     * These kinds of event are triggered with dispatchEvent, the dispatch process has three steps:
     * 1. Capturing phase: dispatch in capture targets, e.g. parents in node tree, from root to the real target
     * 2. At target phase: dispatch to the listeners of the real target
     * 3. Bubbling phase: dispatch in bubble targets, e.g. parents in node tree, from the real target to root
     * In any moment of the dispatching process, it can be stopped via `event.stopPropagation()` or `event.stopPropagationImmediate()`.
     * You can also register custom event and use `emit` to trigger custom event on Node.
     * For such events, there won't be capturing and bubbling phase,
     * your event will be dispatched directly to its listeners registered on the same node.
     * You can also pass event callback parameters with `emit` by passing parameters after `type`.
     * @zh
     * 在节点上注册指定类型的回调函数，也可以设置 target 用于绑定响应函数的 this 对象。
     * 鼠标或触摸事件会被系统调用 dispatchEvent 方法触发，触发的过程包含三个阶段：
     * 1. 捕获阶段：派发事件给捕获目标，比如，节点树中注册了捕获阶段的父节点，从根节点开始派发直到目标节点。
     * 2. 目标阶段：派发给目标节点的监听器。
     * 3. 冒泡阶段：派发事件给冒泡目标，比如，节点树中注册了冒泡阶段的父节点，从目标节点开始派发直到根节点。
     * 同时您可以将事件派发到父节点或者通过调用 stopPropagation 拦截它。
     * 你也可以注册自定义事件到节点上，并通过 emit 方法触发此类事件，对于这类事件，不会发生捕获冒泡阶段，只会直接派发给注册在该节点上的监听器
     * 你可以通过在 emit 方法调用时在 type 之后传递额外的参数作为事件回调的参数列表
     * @param type - A string representing the event type to listen for.<br>See [[Node.EventType.POSITION_CHANGED]] for all builtin events.
     * @param callback - The callback that will be invoked when the event is dispatched.
     * The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @param useCapture - When set to true, the listener will be triggered at capturing phase which is ahead of the final target emit,
     * otherwise it will be triggered during bubbling phase.
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     * @example
     * ```ts
     * this.node.on(NodeEventType.TOUCH_START, this.memberFunction, this);  // if "this" is component and the "memberFunction" declared in CCClass.
     * node.on(NodeEventType.TOUCH_START, callback, this);
     * node.on(NodeEventType.TOUCH_MOVE, callback, this);
     * node.on(NodeEventType.TOUCH_END, callback, this);
     * ```
     */
    public on (type: string | NodeEventType, callback: AnyFunction, target?: unknown, useCapture: boolean = false): void {
        switch (type) {
        case NodeEventType.TRANSFORM_CHANGED:
            this._eventMask |= TRANSFORM_ON;
            break;
        case NodeEventType.ACTIVE_CHANGED:
            this._eventMask |= ACTIVE_ON;
            break;
        default:
            break;
        }
        this._eventProcessor.on(type as NodeEventType, callback, target, useCapture);
    }

    /**
     * @en
     * Removes the callback previously registered with the same type, callback, target and or useCapture.
     * This method is merely an alias to removeEventListener.
     * @zh 删除之前与同类型，回调，目标或 useCapture 注册的回调。
     * @param type - A string representing the event type being removed.
     * @param callback - The callback to remove.
     * @param target - The target (this object) to invoke the callback, if it's not given, only callback without target will be removed
     * @param useCapture - When set to true, the listener will be triggered at capturing phase
     * which is ahead of the final target emit, otherwise it will be triggered during bubbling phase.
     * @example
     * ```ts
     * this.node.off(NodeEventType.TOUCH_START, this.memberFunction, this);
     * node.off(NodeEventType.TOUCH_START, callback, this.node);
     * ```
     */
    public off (type: string, callback?: AnyFunction, target?: unknown, useCapture: boolean = false): void {
        this._eventProcessor.off(type as NodeEventType, callback, target, useCapture);

        const hasListeners = this._eventProcessor.hasEventListener(type);
        // All listener removed
        if (!hasListeners) {
            switch (type) {
            case NodeEventType.TRANSFORM_CHANGED:
                this._eventMask &= ~TRANSFORM_ON;
                break;
            case NodeEventType.ACTIVE_CHANGED:
                this._eventMask &= ~ACTIVE_ON;
                break;
            default:
                break;
            }
        }
    }

    /**
     * @en
     * Register an callback of a specific event type on the Node,
     * the callback will remove itself after the first time it is triggered.
     * @zh
     * 注册节点的特定事件类型回调，回调会在第一时间被触发后删除自身。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     */
    public once (type: string, callback: AnyFunction, target?: unknown, useCapture?: boolean): void {
        this._eventProcessor.once(type as NodeEventType, callback, target, useCapture);
    }

    /**
     * @en
     * Trigger an event directly with the event name and necessary arguments.
     * @zh
     * 通过事件名发送自定义事件
     * @param type - event type
     * @param arg1 - First argument in callback
     * @param arg2 - Second argument in callback
     * @param arg3 - Third argument in callback
     * @param arg4 - Fourth argument in callback
     * @param arg5 - Fifth argument in callback
     * @example
     * ```ts
     * eventTarget.emit('fire', event);
     * eventTarget.emit('fire', message, emitter);
     * ```
     */
    public emit (type: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
        this._eventProcessor.emit(type, arg0, arg1, arg2, arg3, arg4);
    }

    /**
     * @en
     * Dispatches an event into the event flow.
     * The event target is the EventTarget object upon which the dispatchEvent() method is called.
     * @zh 分发事件到事件流中。
     * @param event - The Event object that is dispatched into the event flow
     */
    public dispatchEvent (event: Event): void {
        this._eventProcessor.dispatchEvent(event);
    }

    /**
     * @en Checks whether the EventTarget object has any callback registered for a specific type of event.
     * @zh 检查事件目标对象是否有为特定类型的事件注册的回调。
     * @param type - The type of event.
     * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
     * @param target - The callback callee of the event listener
     * @return True if a callback of the specified type is registered; false otherwise.
     */
    public hasEventListener (type: string, callback?: AnyFunction, target?: unknown): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._eventProcessor.hasEventListener(type, callback, target);
    }

    /**
     * @en Removes all callbacks previously registered with the same target.
     * @zh 移除目标上的所有注册事件。
     * @param target - The target to be searched for all related callbacks
     */
    public targetOff (target: unknown): void {
        this._eventProcessor.targetOff(target);
        // Check for event mask reset
        if ((this._eventMask & TRANSFORM_ON) && !this._eventProcessor.hasEventListener(NodeEventType.TRANSFORM_CHANGED)) {
            this._eventMask &= ~TRANSFORM_ON;
        }

        if ((this._eventMask & ACTIVE_ON) && !this._eventProcessor.hasEventListener(NodeEventType.ACTIVE_CHANGED)) {
            this._eventMask &= ~ACTIVE_ON;
        }
    }

    public destroy (): boolean {
        if (super.destroy()) {
            this.active = false;
            return true;
        }

        return false;
    }

    /**
     * @en
     * Destroy all children from the node, and release all their own references to other objects.
     * Actual destruct operation will delayed until before rendering.
     * @zh
     * 销毁所有子节点，并释放所有它们对其它对象的引用。
     * 实际销毁操作会延迟到当前帧渲染前执行。
     */
    public destroyAllChildren (): void {
        const children = this._children;
        for (let i = 0; i < children.length; ++i) {
            children[i].destroy();
        }
    }

    /**
     * Do remove component, only used internally.
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _removeComponent (component: Component): void {
        if (!component) {
            errorID(3814);
            return;
        }

        if (!(this._objFlags & Destroying)) {
            const i = this._components.indexOf(component);
            if (i !== -1) {
                this._components.splice(i, 1);
                if (EDITOR && EditorExtends.Component) {
                    EditorExtends.Component.remove(component._id);
                }
                this.emit(NodeEventType.COMPONENT_REMOVED, component);
            } else if (component.node !== (this as unknown as Node)) {
                errorID(3815);
            }
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _updateSiblingIndex (): void {
        for (let i = 0; i < this._children.length; ++i) {
            this._children[i]._siblingIndex = i;
        }

        this.emit(NodeEventType.CHILDREN_ORDER_CHANGED);
    }

    protected _instantiate (cloned?: Node | null, isSyncedNode: boolean = false): Node {
        if (!cloned) {
            cloned = legacyCC.instantiate._clone(this, this) as Node;
        }

        const newPrefabInfo = cloned._prefab;
        if (EDITOR && newPrefabInfo) {
            if (cloned === newPrefabInfo.root) {
                // when instantiate prefab in Editor,should add prefab instance info for root node
                EditorExtends.PrefabUtils.addPrefabInstance?.(cloned);
                // newPrefabInfo.fileId = '';
            } else {
                // var PrefabUtils = Editor.require('scene://utils/prefab');
                // PrefabUtils.unlinkPrefab(cloned);
            }
        }

        // reset and init
        cloned._parent = null;
        cloned._onBatchCreated(isSyncedNode);

        return cloned;
    }

    protected _onHierarchyChangedBase (oldParent: this | null): void {
        const newParent = this._parent;
        if (this._persistNode && !(newParent instanceof legacyCC.Scene)) {
            legacyCC.game.removePersistRootNode(this);
            if (EDITOR) {
                warnID(1623);
            }
        }

        if (EDITOR) {
            const scene = legacyCC.director.getScene() as this | null;
            const inCurrentSceneBefore = oldParent && oldParent.isChildOf(scene);
            const inCurrentSceneNow = newParent && newParent.isChildOf(scene);
            if (!inCurrentSceneBefore && inCurrentSceneNow) {
                // attached
                // TODO: `_registerIfAttached` is injected property
                // issue: https://github.com/cocos/cocos-engine/issues/14643
                (this as any)._registerIfAttached!(true);
            } else if (inCurrentSceneBefore && !inCurrentSceneNow) {
                // detached
                // TODO: `_registerIfAttached` is injected property
                // issue: https://github.com/cocos/cocos-engine/issues/14643
                (this as any)._registerIfAttached!(false);
            }

            // conflict detection
            // _Scene.DetectConflict.afterAddChild(this);
        }

        const shouldActiveNow = this._active && !!(newParent && newParent._activeInHierarchy);
        if (this._activeInHierarchy !== shouldActiveNow) {
            legacyCC.director._nodeActivator.activateNode(this, shouldActiveNow);
        }
    }

    protected _onPreDestroyBase (): boolean {
        // marked as destroying
        this._objFlags |= Destroying;

        // detach self and children from editor
        const parent = this._parent;
        const destroyByParent: boolean = (!!parent) && ((parent._objFlags & Destroying) !== 0);
        if (!destroyByParent && EDITOR) {
            // TODO: `_registerIfAttached` is injected property
            // issue: https://github.com/cocos/cocos-engine/issues/14643
            (this as any)._registerIfAttached!(false);
        }

        // remove from persist
        if (this._persistNode) {
            legacyCC.game.removePersistRootNode(this);
        }

        if (!destroyByParent) {
            // remove from parent
            if (parent) {
                this.emit(NodeEventType.PARENT_CHANGED, this);
                // During destroy process, sibling index is not reliable
                const childIndex = parent._children.indexOf(this);
                parent._children.splice(childIndex, 1);
                this._siblingIndex = 0;
                parent._updateSiblingIndex();
                if (parent.emit) {
                    parent.emit(NodeEventType.CHILD_REMOVED, this);
                }
            }
        }

        // emit node destroy event (this should before event processor destroy)
        this.emit(NodeEventType.NODE_DESTROYED, this);

        // Destroy node event processor
        this._eventProcessor.destroy();

        // destroy children
        const children = this._children;
        for (let i = 0; i < children.length; ++i) {
            // destroy immediate so its _onPreDestroy can be called
            children[i]._destroyImmediate();
        }

        // destroy self components
        const comps = this._components;
        for (let i = 0; i < comps.length; ++i) {
            // destroy immediate so its _onPreDestroy can be called
            // TO DO
            comps[i]._destroyImmediate();
        }

        return destroyByParent;
    }

    protected _onSiblingIndexChanged?(siblingIndex: number): void;

    /**
     * @en
     * Ensures that this node has already had the specified component(s). If not, this method throws.
     * @zh
     * 检查节点已经包含对应的组件，如果没有，则抛出异常
     * @param constructor Constructor of the component.
     * @throws If one or more component of same type have been existed in this node.
     */
    protected _checkMultipleComp?<T extends Component>(constructor: Constructor<T>): void;

    // ---------------------- Node ------------------------
    /**
     * @en Event types emitted by Node
     * @zh 节点可能发出的事件类型
     */
    public static EventType = NodeEventType;

    /**
     * @en Coordinates space
     * @zh 空间变换操作的坐标系
     */
    public static NodeSpace = NodeSpace;

    /**
     * @en Bit masks for Node transformation parts
     * @zh 节点变换更新的具体部分
     * @deprecated please use [[Node.TransformBit]]
     */
    public static TransformDirtyBit = TransformBit;

    /**
     * @en Bit masks for Node transformation parts, can be used to determine which part changed in [[NodeEventType.TRANSFORM_CHANGED]] event
     * @zh 节点变换更新的具体部分，可用于判断 [[NodeEventType.TRANSFORM_CHANGED]] 事件的具体类型
     */
    public static TransformBit = TransformBit;

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public static reserveContentsForAllSyncablePrefabTag = reserveContentsForAllSyncablePrefabTag;

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _uiProps = new NodeUIProperties(this);

    /**
     * @en Counter to clear node array
     * @zh 清除节点数组计时器
     */
    private static ClearFrame$ = 0;
    private static ClearRound$ = 1000;

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _static = false;
    /**
     * @engineInternal NOTE: this is engineInternal interface that doesn't have a side effect of updating the transforms
     */
    public declare _pos: Vec3;
    /**
     * @engineInternal NOTE: this is engineInternal interface that doesn't have a side effect of updating the transforms
     */
    public declare _rot: Quat;
    /**
     * @engineInternal NOTE: this is engineInternal interface that doesn't have a side effect of updating the transforms
     */
    public declare _scale: Vec3;
    /**
     * @engineInternal NOTE: this is engineInternal interface that doesn't have a side effect of updating the transforms
     */
    public declare _mat: Mat4;

    // local transform
    @serializable
    protected _lpos = new Vec3();

    @serializable
    protected _lrot = new Quat();

    @serializable
    protected _lscale = new Vec3(1, 1, 1);

    @serializable
    protected _mobility = MobilityMode.Static;

    @serializable
    protected _layer = Layers.Enum.DEFAULT; // the layer this node belongs to

    // local rotation in euler angles, maintained here so that rotation angles could be greater than 360 degree.
    @serializable
    protected _euler = new Vec3();

    protected _transformFlags = TransformBit.TRS; // does the world transform need to update?
    protected _eulerDirty = false;

    protected _flagChangeVersion = 0;
    protected _hasChangedFlags = 0;

    constructor (name?: string) {
        if (name === undefined) name = 'New Node';
        super(name);

        this._pos = new Vec3();
        this._rot = new Quat();
        this._scale = new Vec3(1, 1, 1);
        this._mat = new Mat4();
    }

    /**
     * @en Determine whether the given object is a normal Node. Will return false if [[Scene]] given.
     * @zh 指定对象是否是普通的节点？如果传入 [[Scene]] 会返回 false。
     */
    public static isNode (obj: unknown): obj is Node {
        return obj instanceof Node && (obj.constructor === Node || !(obj instanceof legacyCC.Scene));
    }

    protected _onPreDestroy (): boolean {
        return this._onPreDestroyBase();
    }

    /**
     * @en Position in local coordinate system
     * @zh 本地坐标系下的坐标
     */
    // @constget
    public get position (): Readonly<Vec3> {
        return this._lpos;
    }

    public set position (val: Readonly<Vec3>) {
        this.setPosition(val as Vec3);
    }

    /**
     * @en Position in world coordinate system
     * @zh 世界坐标系下的坐标
     */
    // @constget
    public get worldPosition (): Readonly<Vec3> {
        this.updateWorldTransform();
        return this._pos;
    }

    public set worldPosition (val: Readonly<Vec3>) {
        this.setWorldPosition(val as Vec3);
    }

    /**
     * @en Rotation in local coordinate system, represented by a quaternion
     * @zh 本地坐标系下的旋转，用四元数表示
     */
    // @constget
    public get rotation (): Readonly<Quat> {
        return this._lrot;
    }

    public set rotation (val: Readonly<Quat>) {
        this.setRotation(val as Quat);
    }

    /**
     * @en Rotation in local coordinate system, represented by euler angles
     * @zh 本地坐标系下的旋转，用欧拉角表示
     */
    @type(Vec3)
    set eulerAngles (val: Readonly<Vec3>) {
        this.setRotationFromEuler(val.x, val.y, val.z);
    }

    get eulerAngles (): Readonly<Vec3> {
        if (this._eulerDirty) {
            Quat.toEuler(this._euler, this._lrot);
            this._eulerDirty = false;
        }
        return this._euler;
    }

    /**
     * @en Rotation in local coordinate system, represented by euler angles, but limited on z axis
     * @zh 本地坐标系下的旋转，用欧拉角表示，但是限定在 z 轴上。
     */
    @editable
    get angle (): number {
        return this.eulerAngles.z;
    }

    set angle (val: number) {
        Vec3.set(this._euler, 0, 0, val);
        Quat.fromAngleZ(this._lrot, val);
        this._eulerDirty = false;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Rotation in world coordinate system, represented by a quaternion
     * @zh 世界坐标系下的旋转，用四元数表示
     */
    // @constget
    public get worldRotation (): Readonly<Quat> {
        this.updateWorldTransform();
        return this._rot;
    }

    public set worldRotation (val: Readonly<Quat>) {
        this.setWorldRotation(val as Quat);
    }

    /**
     * @en Scale in local coordinate system
     * @zh 本地坐标系下的缩放
     */
    // @constget
    public get scale (): Readonly<Vec3> {
        return this._lscale;
    }

    public set scale (val: Readonly<Vec3>) {
        this.setScale(val as Vec3);
    }

    /**
     * @en Scale in world coordinate system
     * @zh 世界坐标系下的缩放
     */
    // @constget
    public get worldScale (): Readonly<Vec3> {
        this.updateWorldTransform();
        return this._scale;
    }

    public set worldScale (val: Readonly<Vec3>) {
        this.setWorldScale(val as Vec3);
    }

    /**
     * @en Local transformation matrix
     * @zh 本地坐标系变换矩阵
     */
    public set matrix (val: Readonly<Mat4>) {
        Mat4.toRTS(val, this._lrot, this._lpos, this._lscale);
        this.invalidateChildren(TransformBit.TRS);
        this._eulerDirty = true;
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.TRS);
        }
    }

    /**
     * @en World transformation matrix
     * @zh 世界坐标系变换矩阵
     */
    // @constget
    public get worldMatrix (): Readonly<Mat4> {
        this.updateWorldTransform();
        return this._mat;
    }

    /**
     * @en The vector representing forward direction in local coordinate system, it's the minus z direction by default
     * @zh 当前节点面向的前方方向，默认前方为 -z 方向
     */
    get forward (): Vec3 {
        return Vec3.transformQuat(new Vec3(), Vec3.FORWARD, this.worldRotation);
    }

    set forward (dir: Vec3) {
        const len = dir.length();
        Vec3.multiplyScalar(v3_a, dir, -1 / len);
        Quat.fromViewUp(q_a, v3_a);
        this.setWorldRotation(q_a);
    }

    /**
     * @en Return the up direction vertor of this node in world space.
     * @zh 返回当前节点在世界空间中朝上的方向向量
     */
    get up (): Vec3 {
        return Vec3.transformQuat(new Vec3(), Vec3.UP, this.worldRotation);
    }

    /**
     * @en Return the right direction vector of this node in world space.
     * @zh 返回当前节点在世界空间中朝右的方向向量
     */
    get right (): Vec3 {
        return Vec3.transformQuat(new Vec3(), Vec3.RIGHT, this.worldRotation);
    }

    @editable
    @type(MobilityMode)
    set mobility (m: number) {
        if (this._mobility === m) {
            return;
        }

        this._mobility = m;
        this.emit(NodeEventType.MOBILITY_CHANGED);
    }

    get mobility (): number {
        return this._mobility;
    }

    /**
     * @en Layer of the current Node, it affects raycast, physics etc, refer to [[Layers]]
     * @zh 节点所属层，主要影响射线检测、物理碰撞等，参考 [[Layers]]
     */
    @editable
    set layer (l: number) {
        if (this._layer === l) {
            return;
        }

        this._layer = l;

        if (this._uiProps && this._uiProps.uiComp) {
            this._uiProps.uiComp.setNodeDirty();
            this._uiProps.uiComp.markForUpdateRenderData();
        }
        this.emit(NodeEventType.LAYER_CHANGED, this._layer);
    }

    get layer (): number {
        return this._layer;
    }

    /**
     * @zh 节点的变换改动版本号。
     * @en The transformation change version number of the node.
     * @engineInternal
     * @internal
     */
    get flagChangedVersion (): number {
        return this._flagChangeVersion;
    }

    /**
     * @en Whether the node's transformation have changed during the current frame.
     * @zh 这个节点的空间变换信息在当前帧内是否有变过？
     */
    get hasChangedFlags (): number {
        return this._flagChangeVersion === globalFlagChangeVersion ? this._hasChangedFlags : 0;
    }

    set hasChangedFlags (val: number) {
        this._flagChangeVersion = globalFlagChangeVersion;
        this._hasChangedFlags = val;
    }

    /**
     * @internal
     */
    public [serializeTag] (serializationOutput: SerializationOutput, context: SerializationContext): void {
        if (!EDITOR) {
            serializationOutput.writeThis();
            return;
        }

        // Detects if this node is mounted node of `PrefabInstance`
        // TODO: optimize
        const isMountedChild = (): boolean => !!(this[editorExtrasTag] as any)?.mountedRoot;

        // Returns if this node is under `PrefabInstance`
        // eslint-disable-next-line arrow-body-style
        const isSyncPrefab = (): boolean | PrefabInstance | undefined => {
            // 1. Under `PrefabInstance`, but not mounted
            // 2. If the mounted node is a `PrefabInstance`, it's also a "sync prefab".
            return this._prefab?.root?._prefab?.instance && (this?._prefab?.instance || !isMountedChild());
        };

        const canDiscardByPrefabRoot = (): boolean => !(context.customArguments[(reserveContentsForAllSyncablePrefabTag) as any]
            || !isSyncPrefab() || context.root === this);

        if (canDiscardByPrefabRoot()) {
            // discard props disallow to synchronize
            const isRoot = this._prefab?.root === this;
            if (isRoot) {
                // if B prefab is in A prefab,B can be referenced by component.We should discard it.because B is not the root of prefab
                let isNestedPrefab = false;
                let parent = this.getParent();
                while (parent) {
                    const nestedRoots = parent._prefab?.nestedPrefabInstanceRoots;
                    if (nestedRoots && nestedRoots.length > 0) {
                        // if this node is not in nestedPrefabInstanceRoots,it means this node is not the root of prefab,so it should be discarded.
                        isNestedPrefab = !nestedRoots.some((root) => root === this);
                        break;
                    }
                    parent = parent.getParent();
                }
                if (!isNestedPrefab) {
                    serializationOutput.writeProperty('_objFlags', this._objFlags);
                    serializationOutput.writeProperty('_parent', this._parent);
                    serializationOutput.writeProperty('_prefab', this._prefab);
                    if (context.customArguments.keepNodeUuid) {
                        serializationOutput.writeProperty('_id', this._id);
                    }
                }
                // TODO: editorExtrasTag may be a symbol in the future
                serializationOutput.writeProperty(editorExtrasTag, this[editorExtrasTag]);
            } else {
                // should not serialize child node of synchronizable prefab
            }
        } else {
            serializationOutput.writeThis();
        }
    }

    // ===============================
    // hierarchy
    // ===============================

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onSetParent (oldParent: this | null, keepWorldTransform = false): void {
        if (this._parent) {
            if ((oldParent == null || oldParent._scene !== this._parent._scene) && this._parent._scene != null) {
                this.walk(Node._setScene);
            }
        }

        if (keepWorldTransform) {
            const parent = this._parent;
            if (parent) {
                parent.updateWorldTransform();
                if (approx(Mat4.determinant(parent._mat), 0, EPSILON)) {
                    warnID(14300);
                    this._transformFlags |= TransformBit.TRS;
                    this.updateWorldTransform();
                } else {
                    Mat4.multiply(m4_1, Mat4.invert(m4_1, parent._mat), this._mat);
                    Mat4.toRTS(m4_1, this._lrot, this._lpos, this._lscale);
                }
            } else {
                Vec3.copy(this._lpos, this._pos);
                Quat.copy(this._lrot, this._rot);
                Vec3.copy(this._lscale, this._scale);
            }
            this._eulerDirty = true;
        }

        this.invalidateChildren(TransformBit.TRS);
    }

    protected _onHierarchyChanged (oldParent: this | null): void {
        this.eventProcessor.reattach();
        this._onHierarchyChangedBase(oldParent);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onBatchCreated (dontSyncChildPrefab: boolean): void {
        if (this._eventMask & ACTIVE_ON) {
            if (!this._activeInHierarchy) {
                this.emit(NodeEventType.ACTIVE_CHANGED, this, false);
            }
        }

        this.hasChangedFlags = TransformBit.TRS;
        const len = this._children.length;
        for (let i = 0; i < len; ++i) {
            this._children[i]._siblingIndex = i;
            this._children[i]._onBatchCreated(dontSyncChildPrefab);
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onBeforeSerialize (): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.eulerAngles; // make sure we save the correct eulerAngles
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onPostActivated (active: boolean): void {
        if (this._eventMask & ACTIVE_ON) {
            this.emit(NodeEventType.ACTIVE_CHANGED, this, active);
        }

        this._eventProcessor.setEnabled(active);

        if (active) { // activated
            // in case transform updated during deactivated period
            this.invalidateChildren(TransformBit.TRS);
            // ALL Node renderData dirty flag will set on here
            if (this._uiProps && this._uiProps.uiComp) {
                this._uiProps.uiComp.setNodeDirty();
                this._uiProps.uiComp.setTextureDirty(); // for dynamic atlas
                this._uiProps.uiComp.markForUpdateRenderData();
            }
        }
    }

    // ===============================
    // transform helper, convenient but not the most efficient
    // ===============================

    /**
     * @en Perform a translation on the node
     * @zh 移动节点
     * @param trans The increment on position
     * @param ns The operation coordinate space
     */
    public translate (trans: Vec3, ns?: NodeSpace): void {
        const space = ns || NodeSpace.LOCAL;
        if (space === NodeSpace.LOCAL) {
            Vec3.transformQuat(v3_a, trans, this._lrot);
            this._lpos.x += v3_a.x;
            this._lpos.y += v3_a.y;
            this._lpos.z += v3_a.z;
        } else if (space === NodeSpace.WORLD) {
            if (this._parent) {
                Quat.invert(q_a, this._parent.worldRotation);
                Vec3.transformQuat(v3_a, trans, q_a);
                const scale = this.worldScale;
                this._lpos.x += v3_a.x / scale.x;
                this._lpos.y += v3_a.y / scale.y;
                this._lpos.z += v3_a.z / scale.z;
            } else {
                this._lpos.x += trans.x;
                this._lpos.y += trans.y;
                this._lpos.z += trans.z;
            }
        }
        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Perform a rotation on the node
     * @zh 旋转节点
     * @param rot The increment on rotation
     * @param ns The operation coordinate space
     */
    public rotate (rot: Quat, ns?: NodeSpace): void {
        const space = ns || NodeSpace.LOCAL;
        Quat.normalize(q_a, rot);

        if (space === NodeSpace.LOCAL) {
            Quat.multiply(this._lrot, this._lrot, q_a);
        } else if (space === NodeSpace.WORLD) {
            const worldRot = this.worldRotation;
            Quat.multiply(q_b, q_a, worldRot);
            Quat.invert(q_a, worldRot);
            Quat.multiply(q_b, q_a, q_b);
            Quat.multiply(this._lrot, this._lrot, q_b);
        }
        this._eulerDirty = true;
        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set the orientation of the node to face the target position, the node is facing minus z direction by default
     * @zh 设置当前节点旋转为面向目标位置，默认前方为 -z 方向
     * @param pos Target position
     * @param up Up direction
     */
    public lookAt (pos: Readonly<Vec3>, up?: Readonly<Vec3>): void {
        this.getWorldPosition(v3_a);
        Vec3.subtract(v3_a, v3_a, pos);
        Vec3.normalize(v3_a, v3_a);
        Quat.fromViewUp(q_a, v3_a, up);
        this.setWorldRotation(q_a);
    }

    /**
     * @en Invalidate the world transform information
     * for this node and all its children recursively
     * @zh 递归标记节点世界变换为 dirty
     * @param dirtyBit The dirty bits to setup to children, can be composed with multiple dirty bits
     */
    public invalidateChildren (dirtyBit: TransformBit): void {
        let i = 0;
        let j = 0;
        let l = 0;
        let cur: Node;
        let children: Node[];
        let hasChangedFlags = 0;
        const childDirtyBit = dirtyBit | TransformBit.POSITION;

        dirtyNodes[0] = this;

        while (i >= 0) {
            cur = dirtyNodes[i--];
            hasChangedFlags = cur.hasChangedFlags;
            if (cur.isValid && (cur._transformFlags & hasChangedFlags & dirtyBit) !== dirtyBit) {
                cur._transformFlags |= dirtyBit;
                cur.hasChangedFlags = hasChangedFlags | dirtyBit;

                children = cur._children;
                l = children.length;
                for (j = 0; j < l; j++) {
                    dirtyNodes[++i] = children[j];
                }
            }
            dirtyBit = childDirtyBit;
        }
    }

    /**
     * @en Update the world transform information if outdated
     * @zh 更新节点的世界变换信息
     */
    public updateWorldTransform (): void {
        if (!this._transformFlags) { return; }
        // we need to recursively iterate this
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let cur: Node | null = this;
        let i = 0;
        while (cur && cur._transformFlags) {
            // top level node
            dirtyNodes[i++] = cur;
            cur = cur._parent;
        }
        let child: Node;
        let dirtyBits = 0;

        while (i) {
            child = dirtyNodes[--i];
            dirtyBits |= child._transformFlags;
            if (cur) {
                if (dirtyBits & TransformBit.POSITION) {
                    Vec3.transformMat4(child._pos, child._lpos, cur._mat);
                    child._mat.m12 = child._pos.x;
                    child._mat.m13 = child._pos.y;
                    child._mat.m14 = child._pos.z;
                }
                if (dirtyBits & TransformBit.RS) {
                    Mat4.fromSRT(child._mat, child._lrot, child._lpos, child._lscale);
                    Mat4.multiply(child._mat, cur._mat, child._mat);

                    const rotTmp = dirtyBits & TransformBit.ROTATION ? child._rot : null;
                    Mat4.toSRT(child._mat, rotTmp, null, child._scale);
                }
            } else {
                if (dirtyBits & TransformBit.POSITION) {
                    Vec3.copy(child._pos, child._lpos);
                    child._mat.m12 = child._pos.x;
                    child._mat.m13 = child._pos.y;
                    child._mat.m14 = child._pos.z;
                }
                if (dirtyBits & TransformBit.RS) {
                    if (dirtyBits & TransformBit.ROTATION) {
                        Quat.copy(child._rot, child._lrot);
                    }
                    if (dirtyBits & TransformBit.SCALE) {
                        Vec3.copy(child._scale, child._lscale);
                    }
                    Mat4.fromRTS(child._mat, child._rot, child._pos, child._scale);
                }
            }

            child._transformFlags = TransformBit.NONE;
            cur = child;
        }
    }

    // ===============================
    // transform
    // ===============================

    /**
     * @en Set position in local coordinate system
     * @zh 设置本地坐标
     * @param position Target position
     */
    public setPosition(position: Readonly<Vec3>): void;

    /**
     * @en Set position in local coordinate system
     * @zh 设置本地坐标
     * @param x X axis position
     * @param y Y axis position
     * @param z Z axis position
     */
    public setPosition(x: number, y: number, z?: number): void;

    public setPosition (val: Readonly<Vec3> | number, y?: number, z?: number): void {
        const localPosition = this._lpos;

        if (y === undefined) {
            Vec3.copy(localPosition, val as Vec3);
        } else {
            if (z === undefined) {
                z = localPosition.z;
            }

            Vec3.set(localPosition, val as number, y, z);
        }

        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Get position in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取本地坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getPosition (out?: Vec3): Vec3 {
        if (out) {
            return Vec3.set(out, this._lpos.x, this._lpos.y, this._lpos.z);
        }
        return Vec3.copy(new Vec3(), this._lpos);
    }

    /**
     * @en Set rotation in local coordinate system with a quaternion representing the rotation.
     * Please make sure the rotation is normalized.
     * @zh 用四元数设置本地旋转, 请确保设置的四元数已归一化。
     * @param rotation Rotation in quaternion
     */
    public setRotation(rotation: Readonly<Quat>): void;

    /**
     * @en Set rotation in local coordinate system with a quaternion representing the rotation.
     * Please make sure the rotation is normalized.
     * @zh 用四元数设置本地旋转, 请确保设置的四元数已归一化。
     * @param x X value in quaternion
     * @param y Y value in quaternion
     * @param z Z value in quaternion
     * @param w W value in quaternion
     */
    public setRotation(x: number, y: number, z: number, w: number): void;

    public setRotation (val: Readonly<Quat> | number, y?: number, z?: number, w?: number): void {
        if (y === undefined) {
            Quat.copy(this._lrot, val as Quat);
        } else {
            Quat.set(this._lrot, val as number, y, z!, w!);
        }

        this._eulerDirty = true;
        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set rotation in local coordinate system with a vector representing euler angles
     * @zh 用欧拉角设置本地旋转
     * @param rotation Rotation in vector
     */
    public setRotationFromEuler(rotation: Vec3): void;

    /**
     * @en Set rotation in local coordinate system with euler angles
     * @zh 用欧拉角设置本地旋转
     * @param x X axis rotation
     * @param y Y axis rotation
     * @param zOpt Z axis rotation
     */
    public setRotationFromEuler(x: number, y: number, zOpt?: number): void;

    public setRotationFromEuler (val: Vec3 | number, y?: number, zOpt?: number): void {
        if (y === undefined) {
            Vec3.copy(this._euler, val as Vec3);
            Quat.fromEuler(this._lrot, (val as Vec3).x, (val as Vec3).y, (val as Vec3).z);
        } else {
            const z = zOpt === undefined ? this._euler.z : zOpt;
            Vec3.set(this._euler, val as number, y, z);
            Quat.fromEuler(this._lrot, val as number, y, z);
        }

        this._eulerDirty = false;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Get rotation as quaternion in local coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
     * @zh 获取本地旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
     * @param out Set the result to out quaternion
     * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
     */
    public getRotation (out?: Quat): Quat {
        if (out) {
            return Quat.set(out, this._lrot.x, this._lrot.y, this._lrot.z, this._lrot.w);
        }
        return Quat.copy(new Quat(), this._lrot);
    }

    /**
     * @en Set scale in local coordinate system
     * @zh 设置本地缩放
     * @param scale Target scale
     */
    public setScale(scale: Readonly<Vec3>): void;

    /**
     * @en Set scale in local coordinate system
     * @zh 设置本地缩放
     * @param x X axis scale
     * @param y Y axis scale
     * @param z Z axis scale
     */
    public setScale(x: number, y: number, z?: number): void;

    public setScale (val: Readonly<Vec3> | number, y?: number, z?: number): void {
        const localScale = this._lscale;

        if (y === undefined) {
            Vec3.copy(localScale, val as Vec3);
        } else {
            if (z === undefined) {
                z = localScale.z;
            }
            Vec3.set(localScale, val as number, y, z);
        }

        this.invalidateChildren(TransformBit.SCALE);

        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SCALE);
        }
    }

    /**
     * @en Get scale in local coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取本地缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getScale (out?: Vec3): Vec3 {
        if (out) {
            return Vec3.set(out, this._lscale.x, this._lscale.y, this._lscale.z);
        }
        return Vec3.copy(new Vec3(), this._lscale);
    }

    /**
     * @en Inversely transform a point from world coordinate system to local coordinate system.
     * @zh 逆向变换一个空间点，一般用于将世界坐标转换到本地坐标系中。
     * @param out The result point in local coordinate system will be stored in this vector
     * @param p A position in world coordinate system
     */
    public inverseTransformPoint (out: Vec3, p: Vec3): Vec3 {
        Vec3.copy(out, p);
        // we need to recursively iterate this
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let cur: Node = this;
        let i = 0;
        while (cur._parent) {
            dirtyNodes[i++] = cur;
            cur = cur._parent;
        }
        while (i >= 0) {
            Vec3.transformInverseRTS(out, out, cur._lrot, cur._lpos, cur._lscale);
            cur = dirtyNodes[--i];
        }
        return out;
    }

    /**
     * @en Set position in world coordinate system
     * @zh 设置世界坐标
     * @param position Target position
     */
    public setWorldPosition(position: Vec3): void;

    /**
     * @en Set position in world coordinate system
     * @zh 设置世界坐标
     * @param x X axis position
     * @param y Y axis position
     * @param z Z axis position
     */
    public setWorldPosition(x: number, y: number, z: number): void;

    public setWorldPosition (val: Vec3 | number, y?: number, z?: number): void {
        const worldPosition = this._pos;

        if (y === undefined) {
            Vec3.copy(worldPosition, val as Vec3);
        } else {
            Vec3.set(worldPosition, val as number, y, z!);
        }

        const parent = this._parent;
        const local = this._lpos;
        if (parent) {
            // TODO: benchmark these approaches
            /* */
            parent.updateWorldTransform();
            Vec3.transformMat4(local, worldPosition, Mat4.invert(m4_1, parent._mat));
            /* *
            parent.inverseTransformPoint(local, this._pos);
            /* */
        } else {
            Vec3.copy(local, worldPosition);
        }

        this.invalidateChildren(TransformBit.POSITION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.POSITION);
        }
    }

    /**
     * @en Get position in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取世界坐标，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getWorldPosition (out?: Vec3): Vec3 {
        this.updateWorldTransform();
        if (out) {
            return Vec3.copy(out, this._pos);
        }
        return Vec3.copy(new Vec3(), this._pos);
    }

    /**
     * @en Set rotation in world coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置世界坐标系下的旋转
     * @param rotation Rotation in quaternion
     */
    public setWorldRotation(rotation: Quat): void;

    /**
     * @en Set rotation in world coordinate system with a quaternion representing the rotation
     * @zh 用四元数设置世界坐标系下的旋转
     * @param x X value in quaternion
     * @param y Y value in quaternion
     * @param z Z value in quaternion
     * @param w W value in quaternion
     */
    public setWorldRotation(x: number, y: number, z: number, w: number): void;

    public setWorldRotation (val: Quat | number, y?: number, z?: number, w?: number): void {
        const worldRotation = this._rot;
        if (y === undefined) {
            Quat.copy(worldRotation, val as Quat);
        } else {
            Quat.set(worldRotation, val as number, y, z!, w!);
        }

        if (this._parent) {
            this._parent.updateWorldTransform();
            Quat.multiply(this._lrot, Quat.conjugate(this._lrot, this._parent._rot), worldRotation);
        } else {
            Quat.copy(this._lrot, worldRotation);
        }
        this._eulerDirty = true;

        this.invalidateChildren(TransformBit.ROTATION);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.ROTATION);
        }
    }

    /**
     * @en Set rotation in world coordinate system with euler angles
     * @zh 用欧拉角设置世界坐标系下的旋转
     * @param x X axis rotation
     * @param y Y axis rotation
     * @param z Z axis rotation
     */
    public setWorldRotationFromEuler (x: number, y: number, z: number): void {
        Quat.fromEuler(q_a, x, y, z);
        this.setWorldRotation(q_a);
    }

    /**
     * @en Get rotation as quaternion in world coordinate system, please try to pass `out` quaternion and reuse it to avoid garbage.
     * @zh 获取世界坐标系下的旋转，注意，尽可能传递复用的 [[Quat]] 以避免产生垃圾。
     * @param out Set the result to out quaternion
     * @return If `out` given, the return value equals to `out`, otherwise a new quaternion will be generated and return
     */
    public getWorldRotation (out?: Quat): Quat {
        this.updateWorldTransform();
        if (out) {
            return Quat.copy(out, this._rot);
        }
        return Quat.copy(new Quat(), this._rot);
    }

    /**
     * @en Set scale in world coordinate system
     * @zh 设置世界坐标系下的缩放
     * @param scale Target scale
     */
    public setWorldScale(scale: Vec3): void;

    /**
     * @en Set scale in world coordinate system
     * @zh 设置世界坐标系下的缩放
     * @param x X axis scale
     * @param y Y axis scale
     * @param z Z axis scale
     */
    public setWorldScale(x: number, y: number, z: number): void;

    public setWorldScale (val: Vec3 | number, y?: number, z?: number): void {
        const parent = this._parent;
        if (parent) {
            this.updateWorldTransform();
        }

        const worldScale = this._scale;
        if (y === undefined) {
            Vec3.copy(worldScale, val as Vec3);
        } else {
            Vec3.set(worldScale, val as number, y, z!);
        }

        let rotationFlag = TransformBit.NONE;
        if (parent) {
            const xScale = Vec3.set(v3_b, this._mat.m00, this._mat.m01, this._mat.m02).length();
            const yScale = Vec3.set(v3_b, this._mat.m04, this._mat.m05, this._mat.m06).length();
            const zScale = Vec3.set(v3_b, this._mat.m08, this._mat.m09, this._mat.m10).length();
            if (xScale === 0) {
                v3_a.x = worldScale.x;
                this._mat.m00 = 1;
                rotationFlag = TransformBit.ROTATION;
            } else {
                v3_a.x = worldScale.x / xScale;
            }

            if (yScale === 0) {
                v3_a.y = worldScale.y;
                this._mat.m05 = 1;
                rotationFlag = TransformBit.ROTATION;
            } else {
                v3_a.y = worldScale.y / yScale;
            }

            if (zScale === 0) {
                v3_a.z = worldScale.z;
                this._mat.m10 = 1;
                rotationFlag = TransformBit.ROTATION;
            } else {
                v3_a.z = worldScale.z / zScale;
            }

            Mat4.scale(m4_1, this._mat, v3_a);
            Mat4.multiply(m4_2, Mat4.invert(m4_2, parent._mat), m4_1);
            Mat3.fromQuat(m3_1, Quat.conjugate(qt_1, this._lrot));
            Mat3.multiplyMat4(m3_1, m3_1, m4_2);

            const localScale = this._lscale;
            localScale.x = Vec3.set(v3_a, m3_1.m00, m3_1.m01, m3_1.m02).length();
            localScale.y = Vec3.set(v3_a, m3_1.m03, m3_1.m04, m3_1.m05).length();
            localScale.z = Vec3.set(v3_a, m3_1.m06, m3_1.m07, m3_1.m08).length();
            if (localScale.x === 0 || localScale.y === 0 || localScale.z === 0) {
                rotationFlag = TransformBit.ROTATION;
            }
        } else {
            Vec3.copy(this._lscale, worldScale);
        }

        this.invalidateChildren(TransformBit.SCALE | rotationFlag);
        if (this._eventMask & TRANSFORM_ON) {
            this.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SCALE | rotationFlag);
        }
    }

    /**
     * @en Get scale in world coordinate system, please try to pass `out` vector and reuse it to avoid garbage.
     * @zh 获取世界缩放，注意，尽可能传递复用的 [[Vec3]] 以避免产生垃圾。
     * @param out Set the result to out vector
     * @return If `out` given, the return value equals to `out`, otherwise a new vector will be generated and return
     */
    public getWorldScale (out?: Vec3): Vec3 {
        this.updateWorldTransform();
        if (out) {
            return Vec3.copy(out, this._scale);
        }
        return Vec3.copy(new Vec3(), this._scale);
    }

    /**
     * @en Get a world transform matrix
     * @zh 获取世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldMatrix (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        const target = out || new Mat4();
        return Mat4.copy(target, this._mat);
    }

    /**
     * @en Get a world transform matrix with only rotation and scale
     * @zh 获取只包含旋转和缩放的世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldRS (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        const target = out || new Mat4();
        Mat4.copy(target, this._mat);
        target.m12 = 0; target.m13 = 0; target.m14 = 0;
        return target;
    }

    /**
     * @en Get a world transform matrix with only rotation and translation
     * @zh 获取只包含旋转和位移的世界变换矩阵
     * @param out Set the result to out matrix
     * @return If `out` given, the return value equals to `out`, otherwise a new matrix will be generated and return
     */
    public getWorldRT (out?: Mat4): Mat4 {
        this.updateWorldTransform();
        const target = out || new Mat4();
        return Mat4.fromRT(target, this._rot, this._pos);
    }

    /**
     * @en Set local transformation with rotation, position and scale separately.
     * @zh 一次性设置所有局部变换（平移、旋转、缩放）信息
     * @param rot The rotation
     * @param pos The position
     * @param scale The scale
     */
    public setRTS (rot?: Quat | Vec3, pos?: Vec3, scale?: Vec3): void {
        let dirtyBit: TransformBit = 0;
        if (rot) {
            dirtyBit |= TransformBit.ROTATION;
            if ((rot as Quat).w !== undefined) {
                Quat.copy(this._lrot, rot as Quat);
                this._eulerDirty = true;
            } else {
                Vec3.copy(this._euler, rot);
                Quat.fromEuler(this._lrot, rot.x, rot.y, rot.z);
                this._eulerDirty = false;
            }
        }
        if (pos) {
            Vec3.copy(this._lpos, pos);
            dirtyBit |= TransformBit.POSITION;
        }
        if (scale) {
            Vec3.copy(this._lscale, scale);
            dirtyBit |= TransformBit.SCALE;
        }
        if (dirtyBit) {
            this.invalidateChildren(dirtyBit);
            if (this._eventMask & TRANSFORM_ON) {
                this.emit(NodeEventType.TRANSFORM_CHANGED, dirtyBit);
            }
        }
    }

    /**
     * @en Does the world transform information of this node need to be updated?
     * @zh 这个节点的空间变换信息是否需要更新？
     */
    public isTransformDirty (): boolean {
        return this._transformFlags !== TransformBit.NONE;
    }

    /**
     * @en
     * Pause all system events which is dispatched by [[SystemEvent]].
     * If recursive is set to true, then this API will pause the node system events for the node and all nodes in its sub node tree.
     * @zh
     * 暂停所有 [[SystemEvent]] 派发的系统事件。
     * 如果传递 recursive 为 true，那么这个 API 将暂停本节点和它的子树上所有节点的节点系统事件。
     *
     * @param recursive Whether pause system events recursively for the child node tree
     */
    public pauseSystemEvents (recursive: boolean): void {
        this._eventProcessor.setEnabled(false, recursive);
    }

    /**
     * @en
     * Resume all paused system events which is dispatched by [[SystemEvent]].
     * If recursive is set to true, then this API will resume the node system events for the node and all nodes in its sub node tree.
     *
     * @zh
     * 恢复所有 [[SystemEvent]] 派发的系统事件。
     * 如果传递 recursive 为 true，那么这个 API 将恢复本节点和它的子树上所有节点的节点系统事件。
     *
     * @param recursive Whether resume system events recursively for the child node tree
     */
    public resumeSystemEvents (recursive: boolean): void {
        this._eventProcessor.setEnabled(true, recursive);
    }

    /**
     * @en
     * clear all node dirty state.
     * @zh
     * 清除所有节点的脏标记。
     */
    public static resetHasChangedFlags (): void {
        globalFlagChangeVersion += 1;
    }

    /**
     * @en
     * clear node array
     * @zh
     * 清除节点数组
     */
    public static clearNodeArray (): void {
        if (Node.ClearFrame$ < Node.ClearRound$ && !EDITOR) {
            Node.ClearFrame$++;
        } else {
            Node.ClearFrame$ = 0;
            dirtyNodes.length = 0;
        }
    }

    /**
     * @en
     * Get the complete path of the current node in the hierarchy.
     *
     * @zh
     * 获得当前节点在 hierarchy 中的完整路径。
     */
    public getPathInHierarchy (): string {
        let result = this.name;
        let curNode: Node | null = this.parent;
        while (curNode && !(curNode instanceof legacyCC.Scene)) {
            result = `${curNode.name}/${result}`;
            curNode = curNode.parent;
        }

        return result;
    }
}

nodePolyfill(Node);

legacyCC.Node = Node;
