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

import { EDITOR, DEV } from 'internal:constants';
import { screenAdapter } from 'pal/screen-adapter';
import { director, DirectorEvent } from '../game/director';
import { Vec2, Vec3, visibleRect, js, cclegacy, approx, EPSILON } from '../core';
import { View } from './view';
import { Scene } from '../scene-graph';
import { Node } from '../scene-graph/node';
import { AlignFlags, AlignMode, computeInverseTransForTarget, getReadonlyNodeSize, Widget } from './widget';
import { UITransform } from '../2d/framework';

const _tempPos = new Vec3();
const _defaultAnchor = new Vec2();

const tInverseTranslate = new Vec2();
const tInverseScale = new Vec2(1, 1);
const _tempVec2_1 = new Vec2();
const _tempVec2_2 = new Vec2();

// align to borders by adjusting node's position and size (ignore rotation)
function align (node: Node, widget: Widget): void {
    // Hack: this flag use to ONCE mode
    if (widget._hadAlignOnce) return;
    if ((!EDITOR) && widget.alignMode === AlignMode.ONCE) {
        widget._hadAlignOnce = true;
    }
    const hasTarget = widget.target;
    let target: Node | Scene;
    const inverseTranslate = tInverseTranslate;
    const inverseScale = tInverseScale;
    if (hasTarget) {
        target = hasTarget;
        // inverseTranslate = tInverseTranslate;
        // inverseScale = tInverseScale;
        computeInverseTransForTarget(node, target, inverseTranslate, inverseScale);
    } else {
        target = node.parent!;
    }
    const targetSize = getReadonlyNodeSize(target);
    const useGlobal = target instanceof Scene || !target.getComponent(UITransform);
    const targetAnchor = useGlobal ? _defaultAnchor : target.getComponent(UITransform)!.anchorPoint;

    const isRoot = useGlobal;
    node.getPosition(_tempPos);
    const uiTrans = node._getUITransformComp()!;
    let x = _tempPos.x;
    let y = _tempPos.y;
    const anchor = uiTrans.anchorPoint;
    const scale = node.scale;    // It is a reference of Node's scale, don't change its value in this function.

    if (widget.alignFlags & AlignFlags.HORIZONTAL) {
        let localLeft = 0;
        let localRight = 0;
        const targetWidth = targetSize.width;
        if (isRoot) {
            localLeft = visibleRect.left.x;
            localRight = visibleRect.right.x;
        } else {
            localLeft = -targetAnchor.x * targetWidth;
            localRight = localLeft + targetWidth;
        }

        // adjust borders according to offsets
        localLeft += widget.isAbsoluteLeft ? widget.left : widget.left * targetWidth;
        localRight -= widget.isAbsoluteRight ? widget.right : widget.right * targetWidth;

        if (hasTarget) {
            localLeft += inverseTranslate.x;
            localLeft *= inverseScale.x;
            localRight += inverseTranslate.x;
            localRight *= inverseScale.x;
        }

        let width = 0;
        let anchorX = anchor.x;
        let scaleX = scale.x;
        if (scaleX < 0) {
            anchorX = 1.0 - anchorX;
            scaleX = -scaleX;
        }
        if (widget.isStretchWidth) {
            width = localRight - localLeft;
            if (scaleX !== 0) {
                uiTrans.width = width / scaleX;
            }
            x = localLeft + anchorX * width;
        } else {
            width = uiTrans.width * scaleX;
            if (widget.isAlignHorizontalCenter) {
                let localHorizontalCenter = widget.isAbsoluteHorizontalCenter ? widget.horizontalCenter : widget.horizontalCenter * targetWidth;
                let targetCenter = (0.5 - targetAnchor.x) * targetSize.width;
                if (hasTarget) {
                    localHorizontalCenter *= inverseScale.x;
                    targetCenter += inverseTranslate.x;
                    targetCenter *= inverseScale.x;
                }
                x = targetCenter + (anchorX - 0.5) * width + localHorizontalCenter;
            } else if (widget.isAlignLeft) {
                x = localLeft + anchorX * width;
            } else {
                x = localRight + (anchorX - 1) * width;
            }
            if (!approx(scaleX, 0, EPSILON)) {
                width /= scaleX;
            } else {
                width = uiTrans.width;
            }
        }

        widget._lastSize.width = width;
    }

    if (widget.alignFlags & AlignFlags.VERTICAL) {
        let localTop = 0;
        let localBottom = 0;
        const targetHeight = targetSize.height;
        if (isRoot) {
            localBottom = visibleRect.bottom.y;
            localTop = visibleRect.top.y;
        } else {
            localBottom = -targetAnchor.y * targetHeight;
            localTop = localBottom + targetHeight;
        }

        // adjust borders according to offsets
        localBottom += widget.isAbsoluteBottom ? widget.bottom : widget.bottom * targetHeight;
        localTop -= widget.isAbsoluteTop ? widget.top : widget.top * targetHeight;

        if (hasTarget) {
            // transform
            localBottom += inverseTranslate.y;
            localBottom *= inverseScale.y;
            localTop += inverseTranslate.y;
            localTop *= inverseScale.y;
        }

        let height = 0;
        let anchorY = anchor.y;
        let scaleY = scale.y;
        if (scaleY < 0) {
            anchorY = 1.0 - anchorY;
            scaleY = -scaleY;
        }
        if (widget.isStretchHeight) {
            height = localTop - localBottom;
            if (scaleY !== 0) {
                uiTrans.height = height / scaleY;
            }
            y = localBottom + anchorY * height;
        } else {
            height = uiTrans.height * scaleY;
            if (widget.isAlignVerticalCenter) {
                let localVerticalCenter = widget.isAbsoluteVerticalCenter ? widget.verticalCenter : widget.verticalCenter * targetHeight;
                let targetMiddle = (0.5 - targetAnchor.y) * targetSize.height;
                if (hasTarget) {
                    localVerticalCenter *= inverseScale.y;
                    targetMiddle += inverseTranslate.y;
                    targetMiddle *= inverseScale.y;
                }
                y = targetMiddle + (anchorY - 0.5) * height + localVerticalCenter;
            } else if (widget.isAlignBottom) {
                y = localBottom + anchorY * height;
            } else {
                y = localTop + (anchorY - 1) * height;
            }
            if (!approx(scaleY, 0, EPSILON)) {
                height /= scaleY;
            } else {
                height = uiTrans.height;
            }
        }

        widget._lastSize.height = height;
    }

    node.setPosition(x, y, _tempPos.z);
    Vec3.set(widget._lastPos, x, y, _tempPos.z);
}

// TODO: type is hack, Change to the type actually used (Node or BaseNode) when BaseNode complete
function visitNode (node: any): void {
    const widget = node.getComponent(Widget);
    if (widget && widget.enabled) {
        if (DEV) {
            widget._validateTargetInDEV();
        }
        // Notice: remove align to after visitNode, AlignMode.ONCE will use widget._hadAlignOnce flag
        // align(node, widget);
        // if ((!EDITOR || widgetManager.animationState!.animatedSinceLastFrame) && widget.alignMode === AlignMode.ONCE) {
        //     widget.enabled = false;
        // } else {
        if (!cclegacy.isValid(node, true)) {
            return;
        }
        activeWidgets.push(widget);
    }
    const children = node.children;
    for (const child of children) {
        if (child.active) {
            visitNode(child);
        }
    }
}

// This function will be called on AFTER_SCENE_LAUNCH and AFTER_UPDATE
function refreshScene (): void {
    const scene = director.getScene();
    if (scene) {
        widgetManager.isAligning = true;
        if (widgetManager._nodesOrderDirty) {
            activeWidgets.length = 0;
            visitNode(scene);
            widgetManager._nodesOrderDirty = false;
        }
        const i = 0;
        let widget: Widget | null = null;
        const iterator = widgetManager._activeWidgetsIterator;
        for (iterator.i = 0; iterator.i < activeWidgets.length; ++iterator.i) {
            widget = activeWidgets[iterator.i];
            if (widget._dirty) {
                align(widget.node, widget);
                widget._dirty = false;
            }
        }
        widgetManager.isAligning = false;
    }

    // check animation editor
    if (EDITOR) {
        widgetManager.animationState!.animatedSinceLastFrame = false;
    }
}

const activeWidgets: Widget[] = [];

// updateAlignment from scene to node recursively
function updateAlignment (node: Node): void {
    const parent = node.parent;
    if (parent && Node.isNode(parent)) {
        updateAlignment(parent);
    }

    // node._widget will be null when widget is disabled
    const widget = node.getComponent(Widget);
    if (widget && parent) {
        align(node, widget);
    }
}

/**
 * @en widget Manager， use to align widget
 * @zh widget 管理器，用于对齐操作
 * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export const widgetManager = cclegacy._widgetManager = {
    isAligning: false,
    _nodesOrderDirty: false,
    _activeWidgetsIterator: new js.array.MutableForwardIterator(activeWidgets),
    // hack
    animationState: EDITOR ? {
        previewing: false,
        time: 0,
        animatedSinceLastFrame: false,
    } : null,

    init (): void {
        director.on(DirectorEvent.AFTER_SCENE_LAUNCH, refreshScene);
        director.on(DirectorEvent.AFTER_UPDATE, refreshScene);

        View.instance.on('design-resolution-changed', this.onResized, this);
        if (!EDITOR) {
            const thisOnResized = this.onResized.bind(this);
            View.instance.on('canvas-resize', thisOnResized);
            screenAdapter.on('window-resize', thisOnResized);
        }
    },
    add (widget: Widget): void {
        this._nodesOrderDirty = true;
    },
    remove (widget: Widget): void {
        this._activeWidgetsIterator.remove(widget);
    },
    onResized (): void {
        const scene = director.getScene();
        if (scene) {
            this.refreshWidgetOnResized(scene);
        }
    },
    refreshWidgetOnResized (node: Node): void {
        const widget = Node.isNode(node) && node.getComponent(Widget);
        if (widget && widget.enabled && (
            widget.alignMode === AlignMode.ON_WINDOW_RESIZE || widget.alignMode === AlignMode.ALWAYS
        )) {
            widget.setDirty();
        }

        const children = node.children;
        for (const child of children) {
            this.refreshWidgetOnResized(child);
        }
    },
    updateOffsetsToStayPut (widget: Widget, e?: AlignFlags): void {
        function i (t: number, c: number): number {
            return Math.abs(t - c) > 1e-10 ? c : t;
        }
        const widgetNode = widget.node;
        let widgetParent = widgetNode.parent;
        if (widgetParent) {
            const zero = _tempVec2_1;
            zero.set(0, 0);
            const one = _tempVec2_2;
            one.set(1, 1);
            if (widget.target) {
                widgetParent = widget.target;
                computeInverseTransForTarget(widgetNode, widgetParent, zero, one);
            }

            if (!e) {
                return;
            }

            const parentTrans = widgetParent._uiProps && widgetParent._getUITransformComp();
            const parentAP = parentTrans ? parentTrans.anchorPoint : _defaultAnchor;
            const trans = widgetNode._getUITransformComp()!;
            const matchSize = getReadonlyNodeSize(widgetParent);
            const myAP = trans.anchorPoint;
            const pos = widgetNode.position;
            const alignFlags = AlignFlags;
            const widgetNodeScale = widgetNode.scale;

            let temp = 0;

            if (e & alignFlags.LEFT) {
                let l = -parentAP.x * matchSize.width;
                l += zero.x;
                l *= one.x;
                temp = pos.x - myAP.x * trans.width * Math.abs(widgetNodeScale.x) - l;
                if (!widget.isAbsoluteLeft) {
                    temp /= matchSize.width;
                }

                temp /= one.x;
                widget.left = i(widget.left, temp);
            }

            if (e & alignFlags.RIGHT) {
                let r = (1 - parentAP.x) * matchSize.width;
                r += zero.x;
                temp = (r *= one.x) - (pos.x + (1 - myAP.x) * trans.width * Math.abs(widgetNodeScale.x));
                if (!widget.isAbsoluteRight) {
                    temp /= matchSize.width;
                }

                temp /= one.x;
                widget.right = i(widget.right, temp);
            }

            if (e & alignFlags.TOP) {
                let t = (1 - parentAP.y) * matchSize.height;
                t += zero.y;
                temp = (t *= one.y) - (pos.y + (1 - myAP.y) * trans.height * Math.abs(widgetNodeScale.y));
                if (!widget.isAbsoluteTop) {
                    temp /= matchSize.height;
                }

                temp /= one.y;
                widget.top = i(widget.top, temp);
            }

            if (e & alignFlags.BOT) {
                let b = -parentAP.y * matchSize.height;
                b += zero.y;
                b *= one.y;
                temp = pos.y - myAP.y * trans.height * Math.abs(widgetNodeScale.y) - b;
                if (!widget.isAbsoluteBottom) {
                    temp /= matchSize.height;
                }

                temp /= one.y;
                widget.bottom = i(widget.bottom, temp);
            }
        }
    },
    updateAlignment,
    AlignMode,
    AlignFlags,
};

director.on(DirectorEvent.INIT, () => {
    widgetManager.init();
});
