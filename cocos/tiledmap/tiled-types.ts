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

import { Color, Rect, Size, Vec2 } from '../core';
import { SpriteFrame } from '../2d/assets';
import { ccenum } from '../core/value-types/enum';
import { HorizontalTextAlignment, VerticalTextAlignment } from '../2d/components/label';
import { Texture2D } from '../asset/assets';

export interface PropertiesInfo { [key: string]: number | string }
export type TiledAnimationType = Map<GID, TiledAnimation>;

export interface TiledAnimation {
    frames: { grid: TiledGrid | null, tileid: GID, duration: number }[];
    dt: number;
    frameIdx: number;
}

/**
 * @en The orientation of tiled map.
 * @zh Tiled Map 地图方向。
 * @enum TiledMap.Orientation
 * @static
 */
export enum Orientation {
    /**
     * @en Orthogonal orientation.
     * @zh 直角鸟瞰地图（90°地图）。
     * @property ORTHO
     * @type {Number}
     * @static
     */
    ORTHO = 0,

    /**
     * @en Hexagonal orientation.
     * @zh 六边形地图
     * @property HEX
     * @type {Number}
     * @static
     */
    HEX = 1,

    /**
     * Isometric orientation.
     * 等距斜视地图（斜45°地图）。
     * @property ISO
     * @type {Number}
     * @static
     */
    ISO = 2
}

ccenum(Orientation);

/**
 * The property type of tiled map.
 * @enum TiledMap.Property
 * @static
 */
export enum Property {
    /**
     * @property NONE
     * @type {Number}
     * @static
     */
    NONE = 0,

    /**
     * @property MAP
     * @type {Number}
     * @static
     */
    MAP = 1,

    /**
     * @property LAYER
     * @type {Number}
     * @static
     */
    LAYER = 2,

    /**
     * @property OBJECTGROUP
     * @type {Number}
     * @static
     */
    OBJECTGROUP = 3,

    /**
     * @property OBJECT
     * @type {Number}
     * @static
     */
    OBJECT = 4,

    /**
     * @property TILE
     * @type {Number}
     * @static
     */
    TILE = 5
}

ccenum(Property);

/**
 * The tile flags of tiled map.
 * @enum TiledMap.TileFlag
 * @static
 */
export enum TileFlag {
    /**
     * @property HORIZONTAL
     * @type {Number}
     * @static
     */
    HORIZONTAL = 0x80000000,

    /**
     * @property VERTICAL
     * @type {Number}
     * @static
     */
    VERTICAL = 0x40000000,

    /**
     * @property DIAGONAL
     * @type {Number}
     * @static
     */
    DIAGONAL = 0x20000000,

    /**
     * @property FLIPPED_ALL
     * @type {Number}
     * @static
     */
    FLIPPED_ALL = (0x80000000 | 0x40000000 | 0x20000000 | 0x10000000) >>> 0,

    /**
     * @property FLIPPED_MASK
     * @type {Number}
     * @static
     */
    FLIPPED_MASK = (~(0x80000000 | 0x40000000 | 0x20000000 | 0x10000000)) >>> 0
}

ccenum(TileFlag);

/**
 * @en The stagger axis of Hex tiled map.
 * @zh 六边形地图的 stagger axis 值
 * @enum TiledMap.StaggerAxis
 * @static
 */
export enum StaggerAxis {
    /**
     * @property STAGGERAXIS_X
     * @type {Number}
     * @static
     */
    STAGGERAXIS_X = 0,

    /**
     * @property STAGGERAXIS_Y
     * @type {Number}
     * @static
     */
    STAGGERAXIS_Y = 1
}

ccenum(StaggerAxis);

/**
 * @en The stagger index of Hex tiled map.
 * @zh 六边形地图的 stagger index 值
 * @enum TiledMap.RenderOrder
 * @static
 */
export enum StaggerIndex {
    /**
     * @property STAGGERINDEX_ODD
     * @type {Number}
     * @static
     */
    STAGGERINDEX_ODD = 0,

    /**
     * @property STAGGERINDEX_EVEN
     * @type {Number}
     * @static
     */
    STAGGERINDEX_EVEN = 1
}
ccenum(StaggerIndex);

/**
 * @en The render order of tiled map.
 * @zh 地图的渲染顺序
 * @enum TiledMap.RenderOrder
 * @static
 */
export enum RenderOrder {
    /**
     * @property RightDown
     * @type {Number}
     * @static
     */
    RightDown = 0,
    /**
     * @property RightUp
     * @type {Number}
     * @static
     */
    RightUp = 1,
    /**
     * @property LeftDown
     * @type {Number}
     * @static
     */
    LeftDown = 2,
    /**
     * @property LeftUp
     * @type {Number}
     * @static
     */
    LeftUp = 3,
}

ccenum(RenderOrder);

/**
 * @en TiledMap Object Type
 * @zh 地图物体类型
 * @enum TiledMap.TMXObjectType
 * @static
 */
export enum TMXObjectType {
    /**
     * @property RECT
     * @type {Number}
     * @static
     */
    RECT = 0,

    /**
     * @property ELLIPSE
     * @type {Number}
     * @static
     */
    ELLIPSE = 1,

    /**
     * @property POLYGON
     * @type {Number}
     * @static
     */
    POLYGON = 2,

    /**
     * @property POLYLINE
     * @type {Number}
     * @static
     */
    POLYLINE = 3,

    /**
     * @property IMAGE
     * @type {Number}
     * @static
     */
    IMAGE = 4,

    /**
     * @property TEXT
     * @type {Number}
     * @static
     */
    TEXT = 5,
}

ccenum(TMXObjectType);

// --- DEBUG types
// export interface MixedGID extends Number {
//     _mixed: string
// }
// export interface GID extends Number {
//     _gid: string;
// }
// export interface GIDFlags extends Number {
//     _flags: number;
// }

export type MixedGID = number;
export type GID = number;
export type GIDFlags = number;

/**
 * Size in pixels of the image
 * @property {cc.Size} imageSize
 */

/**
 * <p>cc.TMXTilesetInfo contains the information about the tilesets like: <br />
 * - Tileset name<br />
 * - Tileset spacing<br />
 * - Tileset margin<br />
 * - size of the tiles<br />
 * - Image used for the tiles<br />
 * - Image size<br />
 *
 * This information is obtained from the TMX file. </p>
 * @class TMXTilesetInfo
 */
export class TMXTilesetInfo {
    /**
     * Tileset name
     * @property {string} name
     */
    name = '';
    /**
     * First grid
     * @property {number} firstGid
     */
    firstGid: GID = 0;

    /**
     * Spacing
     * @property {number} spacing
     */
    spacing = 0;

    /**
     * Margin
     * @property {number} margin
     */

    margin = 0;
    /**
     * Texture containing the tiles (should be sprite sheet / texture atlas)
     * @property {cc.SpriteFrame} sourceImage
     */
    sourceImage?: SpriteFrame;
    // Size in pixels of the image

    imageName: string | null = null;

    imageOffset: Vec2 | null = null;

    imageSize = new Size(0, 0);

    tileOffset = new Vec2(0, 0);

    _tileSize = new Size(0, 0);

    collection = false;

    rectForGID (gid_: number, result?: TiledGrid): Rect | TiledGrid {
        const rect = result || new Rect(0, 0, 0, 0);
        rect.width = this._tileSize.width;
        rect.height = this._tileSize.height;
        let gid = gid_ as unknown as number;
        gid &= TileFlag.FLIPPED_MASK;
        gid -= (this.firstGid as unknown as number);
        if (this.imageOffset) {
            rect.x = this.imageOffset.x;
            rect.y = this.imageOffset.y;
        } else {
            const max_x = Math.floor((this.imageSize.width - this.margin * 2 + this.spacing) / (this._tileSize.width + this.spacing));
            rect.x = Math.round((gid % max_x) * (this._tileSize.width + this.spacing) + this.margin);
            rect.y = Math.round(Math.floor(gid / max_x) * (this._tileSize.height + this.spacing) + this.margin);
        }
        return rect;
    }
}

/**
 * <p>cc.TMXObjectGroupInfo contains the information about the object group like:
 * - group name
 * - group size
 * - group opacity at creation time (it can be modified at runtime)
 * - Whether the group is visible
 *
 * This information is obtained from the TMX file.</p>
 * @class TMXObjectGroupInfo
 */

export class TMXObjectGroupInfo {
    /**
     * Properties of the ObjectGroup info.
     * @property {Array} properties
     */
    properties: PropertiesInfo = {} as any;
    name = '';
    objects: TMXObject[] = [];
    visible = true;
    opacity = 0;
    color: Color = new Color(255, 255, 255, 255);
    offset: Vec2 = new Vec2(0, 0);
    draworder: DrawOrder = 'topdown';

    tintColor: Color | null = null;
    /**
     * Gets the Properties.
     * @return {Array}
     */
    getProperties (): PropertiesInfo {
        return this.properties;
    }

    /**
     * Set the Properties.
     * @param {object} value
     */
    setProperties (value: PropertiesInfo): void {
        this.properties = value;
    }
}

export interface TMXObject {
    properties: PropertiesInfo;
    id: number | string;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
    type: TMXObjectType;
    visible: boolean;
    wrap: boolean;
    color: Color;
    halign: HorizontalTextAlignment;
    valign: VerticalTextAlignment;
    pixelsize: number;
    text: string;
    gid: MixedGID;
    points: { x: number, y: number }[];
    polylinePoints: { x: number, y: number }[] | null;

    offset?: Vec2;
}

/**
 * cc.TMXLayerInfo contains the information about the layers like:
 * - Layer name
 * - Layer size
 * - Layer opacity at creation time (it can be modified at runtime)
 * - Whether the layer is visible (if it's not visible, then the CocosNode won't be created)
 * This information is obtained from the TMX file.
 * @class TMXLayerInfo
 */
export class TMXLayerInfo {
    /**
     * Properties of the layer info.
     * @property {Object} properties
     */
    properties: PropertiesInfo = {} as any;
    name = '';
    layerSize: Size | null = null;
    tiles: number[] | Uint32Array = [];
    visible = true;
    opacity = 0;
    ownTiles = true;
    minGID: GID = 100000 as unknown as GID;
    maxGID: GID = 0 as unknown as GID;
    offset: Vec2 = new Vec2(0, 0);
    tintColor: Color | null = null;

    /**
     * Gets the Properties.
     * @return {Object}
     */
    getProperties (): PropertiesInfo {
        return this.properties;
    }

    /**
     * Set the Properties.
     * @param {object} value
     */
    setProperties (value: PropertiesInfo): void {
        this.properties = value;
    }

    /**
     * @property ATTRIB_NONE
     * @constant
     * @static
     * @type {Number}
     * @default 1
     */
    static ATTRIB_NONE = 1 << 0;
    /**
     * @property ATTRIB_BASE64
     * @constant
     * @static
     * @type {Number}
     * @default 2
     */
    static ATTRIB_BASE64 = 1 << 1;
    /**
     * @property ATTRIB_GZIP
     * @constant
     * @static
     * @type {Number}
     * @default 4
     */
    static ATTRIB_GZIP = 1 << 2;
    /**
     * @property ATTRIB_ZLIB
     * @constant
     * @static
     * @type {Number}
     * @default 8
     */
    static ATTRIB_ZLIB = 1 << 3;
}

/**
 * cc.TMXImageLayerInfo contains the information about the image layers.
 * This information is obtained from the TMX file.
 * @class TMXImageLayerInfo
 */
export class TMXImageLayerInfo {
    name = '';
    visible = true;
    width = 0;
    height = 0;
    offset: Vec2 = new Vec2(0, 0);
    opacity = 0;
    trans = new Color(255, 255, 255, 255);
    sourceImage?: SpriteFrame;

    tintColor: Color | null = null;
}

type DrawOrder = 'topdown' | 'bottomup';

export interface TiledGrid {

    // record texture id
    // texId: TexID;
    // record belong to which tileset
    tileset: TMXTilesetInfo;
    x: number;
    y: number;
    width: number;
    height: number;
    t: number;
    l: number;
    r: number;
    b: number;
    cx: number;
    cy: number;
    offsetX: number;
    offsetY: number;
    rotated: boolean;
    gid: GID;
    spriteFrame: SpriteFrame;
    texture: Texture2D;

    _name?: string;
    _rect?: Rect;
    _rotated?: boolean;
}

export type TiledTextureGrids = Map<GID, TiledGrid>;
