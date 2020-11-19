/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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
 */

/**
 * @packageDocumentation
 * @hidden
 */

import { BaseNode } from './base-node';
import { replaceProperty, removeProperty } from '../utils/x-deprecated';
import { Layers } from './layers';
import { Node } from './node';
import { Vec2 } from '../math/vec2';
import { Size } from '../math/size';
import { Scene } from './scene';

replaceProperty(BaseNode.prototype, 'BaseNode', [
    {
        'name': 'childrenCount',
        'newName': 'children.length',
        'customGetter': function (this: BaseNode) {
            return this.children.length;
        }
    }
]);

replaceProperty(Node.prototype, 'Node', [
    {
        'name': 'width',
        'targetName': 'node.getComponent(UITransform)',
        'customGetter': function (this: Node) {
            return this._uiProps.uiTransformComp!.width;
        },
        'customSetter': function (this: Node, value: number) {
            this._uiProps.uiTransformComp!.width = value;
        }
    },
    {
        'name': 'height',
        'targetName': 'node.getComponent(UITransform)',
        'customGetter': function (this: Node) {
            return this._uiProps.uiTransformComp!.height;
        },
        'customSetter': function (this: Node, value: number) {
            this._uiProps.uiTransformComp!.height = value;
        }
    },
    {
        'name': 'anchorX',
        'targetName': 'node.getComponent(UITransform)',
        'customGetter': function (this: Node) {
            return this._uiProps.uiTransformComp!.anchorX;
        },
        'customSetter': function (this: Node, value: number) {
            this._uiProps.uiTransformComp!.anchorX = value;
        }
    },
    {
        'name': 'anchorY',
        'targetName': 'node.getComponent(UITransform)',
        'customGetter': function (this: Node) {
            return this._uiProps.uiTransformComp!.anchorY;
        },
        'customSetter': function (this: Node, value: number) {
            this._uiProps.uiTransformComp!.anchorY = value;
        }
    },
    {
        'name': 'getAnchorPoint',
        'targetName': 'node.getComponent(UITransform)',
        'customFunction': function (this: Node, out?: Vec2) {
            if (!out) {
                out = new Vec2();
            }
            out.set(this._uiProps.uiTransformComp!.anchorPoint);
            return out;
        }
    },
    {
        'name': 'setAnchorPoint',
        'targetName': 'node.getComponent(UITransform)',
        'customFunction': function (this: Node, point: Vec2 | number, y?: number) {
            this._uiProps.uiTransformComp!.setAnchorPoint(point, y);
        }
    },
    {
        'name': 'getContentSize',
        'targetName': 'node.getComponent(UITransform)',
        'customFunction': function (this: Node, out?: Size): Size {
            if (!out) {
                out = new Size();
            }
    
            out.set(this._uiProps.uiTransformComp!.contentSize);
            return out;
        }
    },
    {
        'name': 'setContentSize',
        'targetName': 'node.getComponent(UITransform)',
        'customFunction': function (this: Node, size: Size | number, height?: number) {
            this._uiProps.uiTransformComp!.setContentSize(size, height);
        }
    },
]);

removeProperty(Node.prototype, 'Node.prototype', [
    {
        'name': 'addLayer',
    },
    {
        'name': 'removeLayer',
    }
]);

removeProperty(Layers, 'Layers', [
    {
        'name': 'All',
    },
    {
        'name': 'RaycastMask',
    },
    {
        'name': 'check',
    }
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

removeProperty(Layers.Enum,'Layers.Enum',[
    {
        'name': 'ALWAYS',
    }
]);

removeProperty(Layers.BitMask,'Layers.BitMask',[
    {
        'name': 'ALWAYS',
    }
]);
