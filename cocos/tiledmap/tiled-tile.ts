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

/**
 * @en TiledTile can control the specified map tile.
 * It will apply the node rotation, scale, translate to the map tile.
 * You can change the TiledTile's gid to change the map tile's style.
 * @zh TiledTile 可以单独对某一个地图块进行操作。
 * 他会将节点的旋转，缩放，平移操作应用在这个地图块上，并可以通过更换当前地图块的 gid 来更换地图块的显示样式。
 * @class TiledTile
 * @extends Component
 */

import { ccclass, executeInEditMode, help, menu, requireComponent, type } from 'cc.decorator';
import { Component } from '../scene-graph/component';
import { TiledLayer } from './tiled-layer';
import { CCInteger, warn } from '../core';
import { UITransform } from '../2d/framework';
import { NodeEventType } from '../scene-graph/node-event';

@ccclass('cc.TiledTile')
@help('i18n:cc.TiledTile')
@menu('TiledMap/TiledTile')
@requireComponent(UITransform)
@executeInEditMode
export class TiledTile extends Component {
    _layer: TiledLayer | null = null;

    constructor () {
        super();
    }

    @type(CCInteger)
    _x = 0;
    @type(CCInteger)
    _y = 0;

    /**
     * @en Specify the TiledTile horizontal coordinate，use map tile as the unit.
     * @zh 指定 TiledTile 的横向坐标，以地图块为单位
     * @property {Number} x
     * @default 0
     */

    @type(CCInteger)
    get x (): number {
        return this._x;
    }
    set x (value) {
        if (value === this._x) return;
        if (this._layer && this._layer.isInvalidPosition(value, this._y)) {
            warn(`Invalid x, the valid value is between [%s] ~ [%s]`, 0, this._layer.layerSize.width);
            return;
        }
        this._resetTile();
        this._x = value;
        this.updateInfo();
    }

    /**
     * @en Specify the TiledTile vertical coordinate，use map tile as the unit.
     * @zh 指定 TiledTile 的纵向坐标，以地图块为单位
     * @property {Number} y
     * @default 0
     */
    @type(CCInteger)
    get y (): number {
        return this._y;
    }
    set y (value: number) {
        if (value === this._y) return;
        if (this._layer && this._layer.isInvalidPosition(this._x, value)) {
            warn(`Invalid y, the valid value is between [%s] ~ [%s]`, 0, this._layer.layerSize.height);
            return;
        }
        this._resetTile();
        this._y = value;
        this.updateInfo();
    }
    /**
     * @en Specify the TiledTile gid.
     * @zh 指定 TiledTile 的 gid 值
     * @property {Number} gid
     * @default 0
     */
    @type(CCInteger)
    get grid (): number {
        if (this._layer) {
            return this._layer.getTileGIDAt(this._x, this._y) as unknown as number;
        }
        return 0;
    }
    set grid (value: number) {
        if (this._layer) {
            this._layer.setTileGIDAt(value, this._x, this._y);
        }
    }

    onEnable (): void {
        const parent = this.node.parent!;
        this._layer = parent.getComponent('cc.TiledLayer') as TiledLayer;
        this.node.on(NodeEventType.TRANSFORM_CHANGED, this._updatePosition, this);
        this.node.on(NodeEventType.SIZE_CHANGED, this._updatePosition, this);
        this._resetTile();
        this.updateInfo();
    }

    onDisable (): void {
        this._resetTile();
        this.node.off(NodeEventType.TRANSFORM_CHANGED, this._updatePosition, this);
        this.node.off(NodeEventType.SIZE_CHANGED, this._updatePosition, this);
    }

    private _resetTile (): void {
        if (this._layer && this._layer.getTiledTileAt(this._x, this._y) === this) {
            this._layer.setTiledTileAt(this._x, this._y, null);
        }
    }

    public updateInfo (): void {
        if (!this._layer) return;

        const x = this._x;
        const y = this._y;
        if (this._layer.getTiledTileAt(x, y)) {
            warn('There is already a TiledTile at [%s, %s]', x, y);
            return;
        }
        const p = this._layer.getPositionAt(x, y);
        this.node.setPosition(p!.x, p!.y);
        this._layer.setTiledTileAt(x, y, this);
        this._layer._markForUpdateRenderData();
    }

    private _updatePosition (): void {
        this._layer!._markForUpdateRenderData();
    }
}
