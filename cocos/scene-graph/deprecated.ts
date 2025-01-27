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

import { EDITOR } from 'internal:constants';
import { ccclass } from 'cc.decorator';
import { replaceProperty, removeProperty } from '../core/utils/x-deprecated';
import { Layers } from './layers';
import { Node } from './node';
import { Vec2 } from '../core/math/vec2';
import { Size } from '../core/math/size';
import { legacyCC } from '../core/global-exports';
import { CCObjectFlags } from '../core/data/object';
import { warnID } from '../core/platform/debug';
import { SceneGlobals } from './scene-globals';
import { SystemEventType } from '../input/types';
import { SystemEvent } from '../input';
import { NodeUIProperties } from './node-ui-properties';
import type { NodeEventType } from './node-event';

replaceProperty(Node.prototype, 'Node', [
    {
        name: 'childrenCount',
        newName: 'children.length',
        customGetter (this: Node): number {
            return this.children.length;
        },
    },
]);

replaceProperty(Node.prototype, 'Node', [
    {
        name: 'width',
        targetName: 'node.getComponent(UITransform)',
        customGetter (this: Node): number {
            return this._getUITransformComp()!.width;
        },
        customSetter (this: Node, value: number): void {
            this._getUITransformComp()!.width = value;
        },
    },
    {
        name: 'height',
        targetName: 'node.getComponent(UITransform)',
        customGetter (this: Node): number {
            return this._getUITransformComp()!.height;
        },
        customSetter (this: Node, value: number): void {
            this._getUITransformComp()!.height = value;
        },
    },
    {
        name: 'anchorX',
        targetName: 'node.getComponent(UITransform)',
        customGetter (this: Node): number {
            return this._getUITransformComp()!.anchorX;
        },
        customSetter (this: Node, value: number): void {
            this._getUITransformComp()!.anchorX = value;
        },
    },
    {
        name: 'anchorY',
        targetName: 'node.getComponent(UITransform)',
        customGetter (this: Node): number {
            return this._getUITransformComp()!.anchorY;
        },
        customSetter (this: Node, value: number): void {
            this._getUITransformComp()!.anchorY = value;
        },
    },
    {
        name: 'getAnchorPoint',
        targetName: 'node.getComponent(UITransform)',
        customFunction (this: Node, out?: Vec2): Vec2 {
            if (!out) {
                out = new Vec2();
            }
            out.set(this._getUITransformComp()!.anchorPoint);
            return out;
        },
    },
    {
        name: 'setAnchorPoint',
        targetName: 'node.getComponent(UITransform)',
        customFunction (this: Node, point: Vec2 | number, y?: number): void {
            this._getUITransformComp()!.setAnchorPoint(point, y);
        },
    },
    {
        name: 'getContentSize',
        targetName: 'node.getComponent(UITransform)',
        customFunction (this: Node, out?: Size): Size {
            if (!out) {
                out = new Size();
            }

            out.set(this._getUITransformComp()!.contentSize);
            return out;
        },
    },
    {
        name: 'setContentSize',
        targetName: 'node.getComponent(UITransform)',
        customFunction (this: Node, size: Size | number, height?: number): void {
            if (typeof size === 'number') {
                this._getUITransformComp()!.setContentSize(size, height!);
            } else {
                this._getUITransformComp()!.setContentSize(size);
            }
        },
    },
]);

removeProperty(SceneGlobals.prototype, 'SceneGlobals.prototype', [
    {
        name: 'aspect',
    },
    {
        name: 'selfShadow',
    },
    {
        name: 'linear',
    },
    {
        name: 'packing',
    },
    {
        name: 'autoAdapt',
    },
    {
        name: 'fixedArea',
    },
    {
        name: 'pcf',
    },
    {
        name: 'bias',
    },
    {
        name: 'normalBias',
    },
    {
        name: 'near',
    },
    {
        name: 'far',
    },
    {
        name: 'shadowDistance',
    },
    {
        name: 'invisibleOcclusionRange',
    },
    {
        name: 'orthoSize',
    },
    {
        name: 'saturation',
    },
]);

replaceProperty(SceneGlobals.prototype, 'SceneGlobals.prototype', [
    {
        name: 'distance',
        newName: 'planeHeight',
    },
    {
        name: 'normal',
        newName: 'planeDirection',
    },
    {
        name: 'size',
        newName: 'shadowMapSize',
    },
]);

removeProperty(Node.prototype, 'Node.prototype', [
    {
        name: 'addLayer',
    },
    {
        name: 'removeLayer',
    },
]);

replaceProperty(NodeUIProperties.prototype, 'NodeUIProperties', [
    {
        name: 'opacityDirty',
        newName: 'colorDirty',
    },
]);

removeProperty(Layers, 'Layers', [
    {
        name: 'All',
    },
    {
        name: 'RaycastMask',
    },
    {
        name: 'check',
    },
]);

replaceProperty(Layers, 'Layers', [
    {
        name: 'Default',
        newName: 'DEFAULT',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'Always',
        newName: 'ALWAYS',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'IgnoreRaycast',
        newName: 'IGNORE_RAYCAST',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'Gizmos',
        newName: 'GIZMOS',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'Editor',
        newName: 'EDITOR',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'UI',
        newName: 'UI_3D',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'UI2D',
        newName: 'UI_2D',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'SceneGizmo',
        newName: 'SCENE_GIZMO',
        target: Layers.Enum,
        targetName: 'Layers.Enum',
    },
    {
        name: 'makeInclusiveMask',
        newName: 'makeMaskInclude',
        target: Layers,
        targetName: 'Layers',
    },
    {
        name: 'makeExclusiveMask',
        newName: 'makeMaskExclude',
        target: Layers,
        targetName: 'Layers',
    },
]);

removeProperty(Layers.Enum, 'Layers.Enum', [
    {
        name: 'ALWAYS',
    },
]);

removeProperty(Layers.BitMask, 'Layers.BitMask', [
    {
        name: 'ALWAYS',
    },
]);

const HideInHierarchy = CCObjectFlags.HideInHierarchy;
const DontSave = CCObjectFlags.DontSave;

/**
 * @internal
 * @deprecated since v3.5
 */
@ccclass('cc.PrivateNode')
export class PrivateNode extends Node {
    constructor (name?: string) {
        super(name);
        warnID(12003, this.name);

        this.hideFlags |= DontSave | HideInHierarchy;
    }
}

if (EDITOR) {
    // check components to avoid missing node reference serialied in previous version
    PrivateNode.prototype._onBatchCreated = function onBatchCreated (this: PrivateNode, dontSyncChildPrefab: boolean): void {
        for (const comp of this._components) {
            comp.node = this;
        }

        Node.prototype._onBatchCreated.call(this, dontSyncChildPrefab);
    };
}

replaceProperty(SystemEventType, 'SystemEventType', [
    'MOUSE_ENTER',
    'MOUSE_LEAVE',
    'TRANSFORM_CHANGED',
    'SCENE_CHANGED_FOR_PERSISTS',
    'SIZE_CHANGED',
    'ANCHOR_CHANGED',
    'COLOR_CHANGED',
    'CHILD_ADDED',
    'CHILD_REMOVED',
    'PARENT_CHANGED',
    'NODE_DESTROYED',
    'LAYER_CHANGED',
    'SIBLING_ORDER_CHANGED',
].map((name: string): { name: string; target: typeof NodeEventType; targetName: string; } => ({
    name,
    target: Node.EventType,
    targetName: 'Node.EventType',
})));

replaceProperty(Node.EventType, 'Node.EventType', [
    {
        name: 'DEVICEMOTION',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
    {
        name: 'KEY_DOWN',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
    {
        name: 'KEY_UP',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);

legacyCC.PrivateNode = PrivateNode;
