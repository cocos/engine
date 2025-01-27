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

import { ccclass, help, disallowMultiple, executeInEditMode,
    executionOrder, menu, tooltip, type, serializable } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { Camera, CameraEvent } from '../../misc/camera-component';
import { Widget } from '../../ui/widget';
import { Vec3, screen, Enum, cclegacy, visibleRect } from '../../core';
import { view } from '../../ui/view';
import { RenderRoot2D } from './render-root-2d';

const _worldPos = new Vec3();

enum CanvasRenderMode {
    OVERLAY = 0,
    INTERSPERSE= 1,
}

/**
 * @en
 * The root node of UI.
 * Provide an aligned window for all child nodes, also provides ease of setting screen adaptation policy interfaces from the editor.
 * Line-of-sight range is -999 to 1000.
 *
 * @zh
 * 作为 UI 根节点，为所有子节点提供对齐视窗，另外提供屏幕适配策略接口，方便从编辑器设置。
 * 注：由于本节点的尺寸会跟随屏幕拉伸，所以 anchorPoint 只支持 (0.5, 0.5)，否则适配不同屏幕时坐标会有偏差。
 * UI 的视距范围是 -999 ～ 1000.
 */
@ccclass('cc.Canvas')
@help('i18n:cc.Canvas')
@executionOrder(100)
@menu('UI/Canvas')
@executeInEditMode
@disallowMultiple
export class Canvas extends RenderRoot2D {
    /**
     * @en
     * The render mode of Canvas.
     * When you choose the mode of INTERSPERSE, You can specify the rendering order of the Canvas with the camera in the scene.
     * When you choose the mode of OVERLAY, the builtin camera of Canvas will render after all scene cameras are rendered.
     * NOTE: The cameras in the scene (including the Canvas built-in camera) must have a ClearFlag selection of SOLID_COLOR,
     * otherwise a splash screen may appear on the mobile device.
     *
     * @zh
     * Canvas 渲染模式。
     * intersperse 下可以指定 Canvas 与场景中的相机的渲染顺序，overlay 下 Canvas 会在所有场景相机渲染完成后渲染。
     * 注意：场景里的相机（包括 Canvas 内置的相机）必须有一个的 ClearFlag 选择 SOLID_COLOR，否则在移动端可能会出现闪屏。
     *
     * @deprecated since v3.0, please use [[Camera.priority]] to control overlapping between cameras.
     */
    get renderMode (): number {
        return this._renderMode;
    }
    set renderMode (val) {
        this._renderMode = val;

        if (this._cameraComponent) {
            this._cameraComponent.priority = this._getViewPriority();
        }
    }

    /**
     * @en The camera component that will be aligned with this canvas
     * @zh 将与此 canvas 对齐的相机组件
     */
    @type(Camera)
    @tooltip('i18n:canvas.camera')
    get cameraComponent (): Camera | null {
        return this._cameraComponent;
    }

    set cameraComponent (value) {
        if (this._cameraComponent === value) { return; }

        this._cameraComponent = value;

        this._onResizeCamera();
    }

    /**
     * @en Align canvas with screen
     * @zh 是否使用屏幕对齐画布
     */
    @tooltip('i18n:canvas.align')
    get alignCanvasWithScreen (): boolean {
        return this._alignCanvasWithScreen;
    }

    set alignCanvasWithScreen (value) {
        this._alignCanvasWithScreen = value;

        this._onResizeCamera();
    }

    @type(Camera)
    protected _cameraComponent: Camera | null = null;
    @serializable
    protected _alignCanvasWithScreen = true;

    protected declare _thisOnCameraResized: () => void;
    // fit canvas node to design resolution
    protected declare fitDesignResolution_EDITOR: (() => void) | undefined;

    private _pos = new Vec3();
    private _renderMode = CanvasRenderMode.OVERLAY;

    constructor () {
        super();
        this._thisOnCameraResized = this._onResizeCamera.bind(this);

        if (EDITOR_NOT_IN_PREVIEW) {
            this.fitDesignResolution_EDITOR = (): void => {
                // TODO: support paddings of locked widget
                this.node.getPosition(this._pos);
                const nodeSize = view.getDesignResolutionSize();
                const trans = this.node._getUITransformComp()!;

                let scaleX = this.node.scale.x;
                let anchorX = trans.anchorX;
                if (scaleX < 0) {
                    anchorX = 1.0 - anchorX;
                    scaleX = -scaleX;
                }
                nodeSize.width = scaleX === 0 ? nodeSize.width : nodeSize.width / scaleX;

                let scaleY = this.node.scale.y;
                let anchorY = trans.anchorY;
                if (scaleY < 0) {
                    anchorY = 1.0 - anchorY;
                    scaleY = -scaleY;
                }
                nodeSize.height = scaleY === 0 ? nodeSize.height : nodeSize.height / scaleY;

                Vec3.set(_worldPos, nodeSize.width * anchorX, nodeSize.height * anchorY, 0);

                if (!this._pos.equals(_worldPos)) {
                    this.node.setPosition(_worldPos);
                }
                if (trans.width !== nodeSize.width) {
                    trans.width = nodeSize.width;
                }
                if (trans.height !== nodeSize.height) {
                    trans.height = nodeSize.height;
                }
            };
        }
    }

    public __preload (): void {
        // Stretch to matched size during the scene initialization
        const widget = this.getComponent('cc.Widget') as unknown as Widget;
        if (widget) {
            widget.updateAlignment();
        } else if (EDITOR_NOT_IN_PREVIEW) {
            this.fitDesignResolution_EDITOR!();
        }

        if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._cameraComponent) {
                this._cameraComponent._createCamera();
                this._cameraComponent.node.on(CameraEvent.TARGET_TEXTURE_CHANGE, this._thisOnCameraResized);
            }
        }

        this._onResizeCamera();

        if (EDITOR_NOT_IN_PREVIEW) {
            // In Editor can not edit these attrs.
            // (Position in Node, contentSize in uiTransform)
            // (anchor in uiTransform, but it can edit, this is different from cocos creator)
            this._objFlags |= cclegacy.Object.Flags.IsPositionLocked | cclegacy.Object.Flags.IsSizeLocked | cclegacy.Object.Flags.IsAnchorLocked;
        } else {
            // In Editor dont need resized camera when scene window resize
            view.on('canvas-resize', this._thisOnCameraResized, this);
            view.on('design-resolution-changed', this._thisOnCameraResized, this);
        }
    }

    public onEnable (): void {
        super.onEnable();
        if (!EDITOR_NOT_IN_PREVIEW && this._cameraComponent) {
            this._cameraComponent.node.on(CameraEvent.TARGET_TEXTURE_CHANGE, this._thisOnCameraResized);
        }
    }

    public onDisable (): void {
        super.onDisable();
        if (this._cameraComponent) {
            this._cameraComponent.node.off(CameraEvent.TARGET_TEXTURE_CHANGE, this._thisOnCameraResized);
        }
    }

    public onDestroy (): void {
        super.onDestroy();
        view.off('canvas-resize', this._thisOnCameraResized, this);
        view.off('design-resolution-changed', this._thisOnCameraResized, this);
    }

    protected _onResizeCamera (): void {
        if (this._cameraComponent && this._alignCanvasWithScreen) {
            if (this._cameraComponent.targetTexture) {
                this._cameraComponent.orthoHeight = visibleRect.height / 2;
            } else {
                const size = screen.windowSize;
                this._cameraComponent.orthoHeight = size.height / view.getScaleY() / 2;
            }

            this.node.getWorldPosition(_worldPos);
            this._cameraComponent.node.setWorldPosition(_worldPos.x, _worldPos.y, 1000);
        }
    }

    private _getViewPriority (): number {
        if (this._cameraComponent) {
            let priority = this.cameraComponent?.priority as number;
            priority = this._renderMode === CanvasRenderMode.OVERLAY ? priority | 1 << 30 : priority & ~(1 << 30);
            return priority;
        }

        return 0;
    }
}

cclegacy.Canvas = Canvas;
