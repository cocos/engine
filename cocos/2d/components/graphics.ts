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

import { ccclass, help, executionOrder, menu, tooltip, type, visible, override, editable, serializable } from 'cc.decorator';
import { JSB } from 'internal:constants';
import { builtinResMgr } from '../../asset/asset-manager';
import { InstanceMaterialType, UIRenderer } from '../framework/ui-renderer';
import { director } from '../../game/director';
import { Color, warnID, cclegacy } from '../../core';
import { scene } from '../../render-scene';
import type { IBatcher } from '../renderer/i-batcher';
import { LineCap, LineJoin } from '../assembler/graphics/types';
import { Impl } from '../assembler/graphics/webgl/impl';
import { Material, RenderingSubMesh } from '../../asset/assets';
import { Format, PrimitiveMode, Attribute, Device, BufferUsageBit, BufferInfo, MemoryUsageBit, deviceManager } from '../../gfx';
import { vfmtPosColor, getAttributeStride, getComponentPerVertex } from '../renderer/vertex-format';
import { NativeUIModelProxy } from '../renderer/native-2d';
import { RenderEntity, RenderEntityType } from '../renderer/render-entity';
import type { GraphicsAssembler } from '../assembler/graphics/webgl/graphics-assembler';

const attributes = vfmtPosColor.concat([
    new Attribute('a_dist', Format.R32F),
]);

const componentPerVertex = getComponentPerVertex(attributes);

const stride = getAttributeStride(attributes);

/**
 * @en
 * Graphics component.
 *
 * @zh
 * 自定义图形类。
 */
@ccclass('cc.Graphics')
@help('i18n:cc.Graphics')
@executionOrder(110)
@menu('2D/Graphics')
export class Graphics extends UIRenderer {
    /**
     * @en
     * Current line width.
     *
     * @zh
     * 当前线条宽度。
     */
    @editable
    @tooltip('i18n:graphics.lineWidth')
    get lineWidth (): number {
        return this._lineWidth;
    }
    set lineWidth (value) {
        this._lineWidth = value;
        if (!this.impl) {
            return;
        }

        this.impl.lineWidth = value;
    }

    /**
     * @en
     * Determines how two connecting segments (of lines, arcs or curves) with non-zero lengths in a shape are joined together.
     *
     * @zh
     * 用来设置2个长度不为0的相连部分（线段，圆弧，曲线）如何连接在一起的属性。
     */
    @type(LineJoin)
    @tooltip('i18n:graphics.lineJoin')
    get lineJoin (): LineJoin {
        return this._lineJoin;
    }

    set lineJoin (value: LineJoin) {
        this._lineJoin = value;
        if (!this.impl) {
            return;
        }

        this.impl.lineJoin = value;
    }

    /**
     * @en
     * Determines how the end points of every line are drawn.
     *
     * @zh
     * 指定如何绘制每一条线段末端。
     */
    @type(LineCap)
    @tooltip('i18n:graphics.lineCap')
    get lineCap (): LineCap {
        return this._lineCap;
    }

    set lineCap (value: LineCap) {
        this._lineCap = value;
        if (!this.impl) {
            return;
        }

        this.impl.lineCap = value;
    }

    /**
     * @en
     * Brush stroke color.
     *
     * @zh
     * 笔触的颜色。
     */
    @tooltip('i18n:graphics.strokeColor')
    // @constget
    get strokeColor (): Readonly<Color> {
        return this._strokeColor;
    }

    set strokeColor (value) {
        if (!this.impl) {
            return;
        }

        this._strokeColor.set(value);
        this.impl.strokeColor = this._strokeColor;
    }

    /**
     * @en
     * Fill paint color.
     *
     * @zh
     * 填充绘画的颜色。
     */
    @tooltip('i18n:graphics.fillColor')
    // @constget
    get fillColor (): Readonly<Color> {
        return this._fillColor;
    }

    set fillColor (value) {
        if (!this.impl) {
            return;
        }

        this._fillColor.set(value);
        this.impl.fillColor = this._fillColor;
    }

    /**
     * @en
     * Set the miter limit ratio.
     *
     * @zh
     * 设置斜接面限制比例。
     */
    @tooltip('i18n:graphics.miterLimit')
    get miterLimit (): number {
        return this._miterLimit;
    }

    set miterLimit (value) {
        this._miterLimit = value;
        // this.impl.miterLimit = value;
    }

    @override
    @visible(false)
    get color (): Color {
        return this._color;
    }

    set color (value) {
        if (this._color === value) {
            return;
        }

        this._color.set(value);
    }

    public static LineJoin = LineJoin;
    public static LineCap = LineCap;
    public impl: Impl | null = null;
    /**
     * @deprecated since v3.6.0, this is an engine private interface that will be removed in the future.
     */
    public model: scene.Model | null = null;
    @serializable
    protected _lineWidth = 1;
    @serializable
    protected _strokeColor = Color.BLACK.clone();
    @serializable
    protected _lineJoin = LineJoin.MITER;
    @serializable
    protected _lineCap = LineCap.BUTT;
    @serializable
    protected _fillColor = Color.WHITE.clone();
    @serializable
    protected _miterLimit = 10;

    protected _isDrawing = false;
    protected _isNeedUploadData = true;

    private _graphicsUseSubMeshes: RenderingSubMesh[] = [];

    //nativeObj
    protected declare _graphicsNativeProxy: NativeUIModelProxy;
    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get graphicsNativeProxy (): NativeUIModelProxy {
        return this._graphicsNativeProxy;
    }

    constructor () {
        super();
        this._instanceMaterialType = InstanceMaterialType.ADD_COLOR;
        this.impl = new Impl(this);
        if (JSB) {
            this._graphicsNativeProxy = new NativeUIModelProxy();
        }
    }

    public onRestore (): void {
        if (!this.impl) {
            this._flushAssembler();
        }
    }

    public onLoad (): void {
        super.onLoad();
        if (JSB) {
            this._graphicsNativeProxy.initModel(this.node);
            this.model = this._graphicsNativeProxy.getModel();
        } else {
            this.model = director.root!.createModel(scene.Model);
            this.model.node = this.model.transform = this.node;
        }
        this._flushAssembler();
    }

    public onEnable (): void {
        super.onEnable();
        this._updateMtlForGraphics();
    }

    public onDestroy (): void {
        this._sceneGetter = null;
        if (JSB) {
            this._graphicsNativeProxy.destroy();
            this.model = null;
        } else {
            if (this.model) {
                director.root!.destroyModel(this.model);
                this.model = null;
            }

            const subMeshLength = this._graphicsUseSubMeshes.length;
            if (subMeshLength > 0) {
                for (let i = 0; i < subMeshLength; ++i) {
                    this._graphicsUseSubMeshes[i].destroy();
                }
                this._graphicsUseSubMeshes.length = 0;
            }
        }

        if (this.impl) {
            this._isDrawing = false;
            this.impl.clear();
            this.impl = null;
        }

        super.onDestroy();
    }

    /**
     * @en
     * Move path start point to (x,y).
     *
     * @zh
     * 移动路径起点到坐标(x, y)。
     *
     * @param x @en The x-axis coordinate of the target position.
     *          @zh 目标位置的 X 轴坐标。
     * @param y @en The y-axis coordinate of the target position.
     *          @zh 目标位置的 y 轴坐标。
     */
    public moveTo (x: number, y: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.moveTo(x, y);
    }

    /**
     * @en
     * Adds a straight line to the path.
     *
     * @zh
     * 绘制直线路径。
     *
     * @param x @en The x-axis coordinate of the target position.
     *          @zh 目标位置的 x 轴坐标。
     * @param y @en The x-axis coordinate of the target position.
     *          @zh 目标位置的 y 轴坐标。
     */
    public lineTo (x: number, y: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.lineTo(x, y);
    }

    /**
     * @en
     * Adds a cubic Bézier curve to the path.
     *
     * @zh
     * 绘制三次贝赛尔曲线路径。
     *
     * @param c1x @en The x-axis coordinate of the first control point.
     *            @zh 第一个控制点的 x 轴坐标。
     * @param c1y @en The y-axis coordinate of the first control point.
     *            @zh 第一个控制点的 y 轴坐标。
     * @param c2x @en The x-axis coordinate of the second control point.
     *            @zh 第二个控制点的 x 轴坐标。
     * @param c2y @en The y-axis coordinate of the second control point.
     *            @zh 第二个控制点的 y 轴坐标。
     * @param x @en The x-axis coordinate of the last control point.
     *          @zh 最后一个控制点的 x 轴坐标。
     * @param y @en The y-axis coordinate of the last control point.
     *          @zh 最后一个控制点的 y 轴坐标。
     */
    public bezierCurveTo (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
    }

    /**
     * @en
     * Adds a quadratic Bézier curve to the path.
     *
     * @zh
     * 绘制二次贝赛尔曲线路径。
     *
     * @param cx @en The x-axis coordinate of the starting control point.
     *           @zh 起始控制点的 x 轴坐标。
     * @param cy @en The y-axis coordinate of the starting control point.
     *           @zh 起始控制点的 y 轴坐标。
     * @param x @en The x-axis coordinates of the endpoint control point.
     *          @zh 终点控制点的 x 轴坐标。
     * @param y @en The y-axis coordinates of the endpoint control point.
     *          @zh 终点控制点的 x 轴坐标。
     */
    public quadraticCurveTo (cx: number, cy: number, x: number, y: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.quadraticCurveTo(cx, cy, x, y);
    }

    /**
     * @en
     * Adds an arc to the path which is centered at (cx, cy) position with radius r starting at startAngle
     * and ending at endAngle going in the given direction by counterclockwise (defaulting to false).
     *
     * @zh
     * 绘制圆弧路径。圆弧路径的圆心在 (cx, cy) 位置，半径为 r ，根据 counterclockwise （默认为false）指定的方向从 startAngle 开始绘制，到 endAngle 结束。
     *
     * @param cx @en The coordinate x-axis of the central control point.
     *           @zh 中心控制点的坐标 x 轴。
     * @param cy @en The coordinate y-axis of the central control point.
     *           @zh 中心控制点的坐标 y 轴。
     * @param r @en Angle in Radian.
     *          @zh 圆弧弧度。
     * @param startAngle @en The starting angle in radian, measured clockwise from the positive x-axis.
     *                   @zh 弧度起点，从正 x 轴顺时针方向测量。
     * @param endAngle @en The ending angle in radian, measured clockwise from the positive x-axis.
     *                 @zh 弧度终点，从正 x 轴顺时针方向测量。
     * @param counterclockwise @en If true, draws counterclockwise between the two angles. Default is clockwise.
     *                         @zh 如果为真，在两个角度之间逆时针绘制。默认顺时针。
     */
    public arc (cx: number, cy: number, r: number, startAngle: number, endAngle: number, counterclockwise: boolean): void {
        if (!this.impl) {
            return;
        }

        this.impl.arc(cx, cy, r, startAngle, endAngle, counterclockwise);
    }

    /**
     * @en
     * Adds an ellipse to the path.
     *
     * @zh
     * 绘制椭圆路径。
     *
     * @param cx @en The x-axis coordinates of the center point.
     *           @zh 中心点的 x 轴坐标。
     * @param cy @en The y-axis coordinates of the center point.
     *           @zh 中心点的 y 轴坐标。
     * @param rx @en The radius of the x-axis of the ellipse.
     *           @zh 椭圆 x 轴半径。
     * @param ry @en The radius of the y-axis of the ellipse.
     *           @zh 椭圆 y 轴半径。
     */
    public ellipse (cx: number, cy: number, rx: number, ry: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.ellipse(cx, cy, rx, ry);
    }

    /**
     * @en
     * Adds a circle to the path.
     *
     * @zh
     * 绘制圆形路径。
     *
     * @param cx @en The x-axis coordinates of the center point.
     *           @zh 中心点的 x 轴坐标。
     * @param cy @en The y-axis coordinates of the center point.
     *           @zh 中心点的 y 轴坐标。
     * @param r @en Radius.
     *          @zh 圆半径。
     */
    public circle (cx: number, cy: number, r: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.circle(cx, cy, r);
    }

    /**
     * @en
     * Adds a rectangle to the path.
     *
     * @zh
     * 绘制矩形路径。
     *
     * @param x @en The x-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 x 轴坐标。
     * @param y @en The y-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 y 轴坐标。
     * @param w @en The width of the rectangle.
     *          @zh 矩形宽度。
     * @param h @en The height of the rectangle.
     *          @zh 矩形高度。
     */
    public rect (x: number, y: number, w: number, h: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.rect(x, y, w, h);
    }

    /**
     * @en
     * Adds a round corner rectangle to the path.
     *
     * @zh
     * 绘制圆角矩形路径。
     *
     * @param x @en The x-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 x 轴坐标。
     * @param y @en The y-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 y 轴坐标。
     * @param w @en The width of the rectangle.
     *          @zh 矩形宽度。
     * @param h @en The height of the rectangle.
     *          @zh 矩形高度。
     * @param r @en Radius of rectangular rounded corners.
     *          @zh 矩形圆角半径。
     */
    public roundRect (x: number, y: number, w: number, h: number, r: number): void {
        if (!this.impl) {
            return;
        }

        this.impl.roundRect(x, y, w, h, r);
    }

    /**
     * @en
     * Draws a filled rectangle.
     *
     * @zh
     * 绘制填充矩形。
     *
     * @param x @en The x-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 x 轴坐标。
     * @param y @en The y-axis coordinate of the top left point of the rectangle.
     *          @zh 矩形起始 y 轴坐标。
     * @param w @en The width of the rectangle.
     *          @zh 矩形宽度。
     * @param h @en The height of the rectangle.
     *          @zh 矩形高度。
     */
    public fillRect (x: number, y: number, w: number, h: number): void {
        this.rect(x, y, w, h);
        this.fill();
    }

    /**
     * @en
     * Erasing any previously drawn content.
     *
     * @zh
     * 擦除之前绘制的所有内容的方法。
     */
    public clear (): void {
        if (!this.impl) {
            return;
        }

        this.impl.clear();
        this._isDrawing = false;
        if (JSB) {
            this._graphicsNativeProxy.clear();// need native
        } else if (this.model) {
            for (let i = 0; i < this.model.subModels.length; i++) {
                const subModel = this.model.subModels[i];
                subModel.inputAssembler.indexCount = 0;
            }
        }

        this.markForUpdateRenderData();
    }

    /**
     * @en
     * Causes the point of the pen to move back to the start of the current path.
     * It tries to add a straight line from the current point to the start.
     *
     * @zh
     * 将笔点返回到当前路径起始点的。它尝试从当前点到起始点绘制一条直线。
     */
    public close (): void {
        if (!this.impl) {
            return;
        }

        this.impl.close();
    }

    /**
     * @en
     * Strokes the current or given path with the current stroke style.
     *
     * @zh
     * 根据当前的画线样式，绘制当前或已经存在的路径。
     */
    public stroke (): void {
        if (!this._assembler) {
            this._flushAssembler();
        }

        this._isDrawing = true;
        this._isNeedUploadData = true;
        (this._assembler as GraphicsAssembler).stroke(this);
    }

    /**
     * @en
     * Fills the current or given path with the current fill style.
     *
     * @zh
     * 根据当前的画线样式，填充当前或已经存在的路径。
     */
    public fill (): void {
        if (!this._assembler) {
            this._flushAssembler();
        }

        this._isDrawing = true;
        this._isNeedUploadData = true;
        (this._assembler as GraphicsAssembler).fill(this);
    }

    private _updateMtlForGraphics (): void {
        let mat;
        if (this._customMaterial) {
            mat = this.getMaterialInstance(0);
        } else {
            mat = builtinResMgr.get('ui-graphics-material');
            this.setSharedMaterial(mat as Material, 0);
            mat = this.getMaterialInstance(0);
            mat.recompileShaders({ USE_LOCAL: true });
        }
    }

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public activeSubModel (idx: number): void {
        if (!this.model) {
            warnID(4500, this.node.name);
            return;
        }

        if (this.model.subModels.length <= idx) {
            const gfxDevice: Device = deviceManager.gfxDevice;
            const vertexBuffer = gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                65535 * stride,
                stride,
            ));
            const indexBuffer = gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                65535 * Uint16Array.BYTES_PER_ELEMENT * 2,
                Uint16Array.BYTES_PER_ELEMENT,
            ));

            const renderMesh = new RenderingSubMesh([vertexBuffer], attributes, PrimitiveMode.TRIANGLE_LIST, indexBuffer);
            renderMesh.subMeshIdx = 0;

            this.model.initSubModel(idx, renderMesh, this.getMaterialInstance(0)!);
            this._graphicsUseSubMeshes.push(renderMesh);
        }
    }

    protected _uploadData (): void {
        const impl = this.impl;
        if (!impl) {
            return;
        }

        const renderDataList = impl && impl.getRenderDataList();
        if (renderDataList.length <= 0 || !this.model) {
            return;
        }

        const subModelList = this.model.subModels;
        for (let i = 0; i < renderDataList.length; i++) {
            const renderData = renderDataList[i];
            const ia = subModelList[i].inputAssembler;
            if (renderData.lastFilledVertex === renderData.vertexStart) {
                continue;
            }

            const vb = new Float32Array(renderData.vData.buffer, 0, renderData.vertexStart * componentPerVertex);
            ia.vertexBuffers[0].update(vb);
            ia.vertexCount = renderData.vertexStart;
            const ib = new Uint16Array(renderData.iData.buffer, 0, renderData.indexStart);
            ia.indexBuffer!.update(ib);
            ia.indexCount = renderData.indexStart;
            renderData.lastFilledVertex = renderData.vertexStart;
            renderData.lastFilledIndex = renderData.indexStart;
        }

        this._isNeedUploadData = false;
    }

    protected _render (render: IBatcher): void {
        if (this._isNeedUploadData) {
            if (this.impl) {
                const renderDataList = this.impl.getRenderDataList();
                const len = this.model!.subModels.length;
                if (renderDataList.length > len) {
                    for (let i = len; i < renderDataList.length; i++) {
                        this.activeSubModel(i);
                    }
                }
            }
            this._uploadData();
        }

        render.commitModel(this, this.model, this.getMaterialInstance(0));
    }

    protected _flushAssembler (): void {
        const assembler = Graphics.Assembler.getAssembler(this);

        if (this._assembler !== assembler) {
            this._assembler = assembler;
        }
    }

    protected _canRender (): boolean {
        if (!super._canRender()) {
            return false;
        }

        if (JSB) {
            return this._isDrawing;
        } else {
            return !!this.model && this._isDrawing;
        }
    }

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public updateRenderer (): void {
        super.updateRenderer();
        if (JSB) {
            if (this._isNeedUploadData) {
                if (this.impl) {
                    const renderDataList = this.impl.getRenderDataList();
                    for (let i = 0; i < renderDataList.length; i++) {
                        renderDataList[i].setRenderDrawInfoAttributes();
                    }
                    this._graphicsNativeProxy.activeSubModels();
                }
                this._graphicsNativeProxy.uploadData();
                this._isNeedUploadData = false;
            }
        }
    }

    protected createRenderEntity (): RenderEntity {
        return new RenderEntity(RenderEntityType.DYNAMIC);
    }
}

cclegacy.Graphics = Graphics;
