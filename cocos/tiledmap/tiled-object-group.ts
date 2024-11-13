/*
 Copyright (c) 2016 Chukong Technologies Inc.
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

import { ccclass, help, type, requireComponent } from 'cc.decorator';
import { Component } from '../scene-graph/component';
import { Sprite } from '../2d/components/sprite';
import { Label } from '../2d/components/label';
import { BlendFactor } from '../gfx';

import { TMXMapInfo } from './tmx-xml-parser';
import { TiledTextureGrids, GID, TileFlag, Orientation, StaggerAxis, TMXObjectType, PropertiesInfo, TiledAnimationType, TMXObject, TMXObjectGroupInfo } from './tiled-types';
import { UITransform } from '../2d/framework/ui-transform';
import { CCBoolean, Vec2, Color, CCObject } from '../core';
import { SpriteFrame } from '../2d/assets';
import { Node } from '../scene-graph/node';

/**
 * @en Renders the TMX object group.
 * @zh 渲染 tmx object group。
 * @class TiledObjectGroup
 * @extends Component
 */
@ccclass('cc.TiledObjectGroup')
@help('i18n:cc.TiledObjectGroup')
@requireComponent(UITransform)
export class TiledObjectGroup extends Component {
    protected _premultiplyAlpha = false;

    constructor () {
        super();
    }

    @type(CCBoolean)
    get premultiplyAlpha (): boolean {
        return this._premultiplyAlpha;
    }
    set premultiplyAlpha (value: boolean) {
        this._premultiplyAlpha = value;
    }

    /**
     * @en Offset position of child objects.
     * @zh 获取子对象的偏移位置。
     * @method getPositionOffset
     * @return {Vec2}
     * @example
     * let offset = tMXObjectGroup.getPositionOffset();
     */
    public getPositionOffset (): Vec2 | undefined {
        return this._positionOffset;
    }

    /**
     * @en List of properties stored in a dictionary.
     * @zh 以映射的形式获取属性列表。
     * @method getProperties
     * @return {Object}
     * @example
     * let offset = tMXObjectGroup.getProperties();
     */
    public getProperties (): PropertiesInfo | undefined {
        return this._properties;
    }

    /**
     * @en Gets the Group name.
     * @zh 获取组名称。
     * @method getGroupName
     * @return {String}
     * @example
     * let groupName = tMXObjectGroup.getGroupName;
     */
    public getGroupName (): string | undefined {
        return this._groupName;
    }

    /**
     * Return the value for the specific property name
     * @param {String} propertyName
     * @return {Object}
     */
    public getProperty (propertyName: { toString (): string } | string): string | number {
        return this._properties![propertyName.toString()];
    }

    /**
     * @en
     * Return the object for the specific object name. <br />
     * It will return the 1st object found on the array for the given name.
     * @zh 获取指定的对象。
     * @method getObject
     * @param {String} objectName
     * @return {Object|Null}
     * @example
     * let object = tMXObjectGroup.getObject("Group");
     */
    public getObject (objectName: string): TMXObject | null {
        for (let i = 0, len = this._objects.length; i < len; i++) {
            const obj = this._objects[i];
            if (obj && obj.name === objectName) {
                return obj;
            }
        }
        // object not found
        return null;
    }

    /**
     * @en Gets the objects.
     * @zh 获取对象数组。
     * @method getObjects
     * @return {Array}
     * @example
     * let objects = tMXObjectGroup.getObjects();
     */
    public getObjects (): TMXObject[] {
        return this._objects;
    }

    protected _groupName?: string;
    protected _positionOffset?: Vec2;
    protected _mapInfo?: TMXMapInfo;
    protected _properties?: PropertiesInfo;
    protected _offset?: Vec2;
    get offset (): Vec2 { return this._offset!; }
    protected _opacity?: number;
    protected _tintColor: Color | null = null;

    protected _animations?: TiledAnimationType;
    protected _hasAniObj?: boolean;
    protected _texGrids?: TiledTextureGrids;
    protected aniObjects?: {
        object: TMXObject,
        imgNode: Node,
        gridGID: GID
    }[];
    protected _objects: TMXObject[] = [];

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _init (groupInfo: TMXObjectGroupInfo, mapInfo: TMXMapInfo, texGrids: TiledTextureGrids): void {
        const FLIPPED_MASK = TileFlag.FLIPPED_MASK;
        const FLAG_HORIZONTAL = TileFlag.HORIZONTAL;
        const FLAG_VERTICAL = TileFlag.VERTICAL;

        this._groupName = groupInfo.name;
        this._positionOffset = groupInfo.offset;
        this._mapInfo = mapInfo;
        this._properties = groupInfo.getProperties();
        this._offset = new Vec2(groupInfo.offset.x, -groupInfo.offset.y);
        this._opacity = groupInfo.opacity;

        if (groupInfo.tintColor) {
            this._tintColor = groupInfo.tintColor;
        }

        this._texGrids = texGrids;
        this._animations = mapInfo.getTileAnimations();
        this.aniObjects = [];
        this._hasAniObj = false;

        const mapSize = mapInfo.mapSize;
        const tileSize = mapInfo.tileSize;
        let width = 0;
        let height = 0;
        const colorVal = new Color();

        const iso = Orientation.ISO === mapInfo.orientation;

        if (mapInfo.orientation === Orientation.HEX) {
            if (mapInfo.getStaggerAxis() === StaggerAxis.STAGGERAXIS_X) {
                height = tileSize.height * (mapSize.height + 0.5);
                width = (tileSize.width + mapInfo.getHexSideLength()) * Math.floor(mapSize.width / 2) + tileSize.width * (mapSize.width % 2);
            } else {
                width = tileSize.width * (mapSize.width + 0.5);
                height = (tileSize.height + mapInfo.getHexSideLength()) * Math.floor(mapSize.height / 2) + tileSize.height * (mapSize.height % 2);
            }
        } else if (iso) {
            const wh = mapSize.width + mapSize.height;
            width = tileSize.width * 0.5 * wh;
            height = tileSize.height * 0.5 * wh;
        } else {
            width = mapSize.width * tileSize.width;
            height = mapSize.height * tileSize.height;
        }

        const transComp = this.node._uiProps.uiTransformComp!;
        transComp.setContentSize(width, height);

        const leftTopX = width * transComp.anchorX;
        const leftTopY = height * (1 - transComp.anchorY);

        const objects = groupInfo.objects;
        const aliveNodes = {};
        for (let i = 0, l = objects.length; i < l; i++) {
            const object = objects[i];
            const objType = object.type;
            object.offset = new Vec2(object.x, object.y);

            const points = object.points || object.polylinePoints;
            if (points) {
                for (let pi = 0; pi < points.length; pi++) {
                    points[pi].y *= -1;
                }
            }

            if (iso) {
                const posIdxX = object.x / tileSize.height;
                const posIdxY = object.y / tileSize.height;
                object.x = tileSize.width * 0.5 * (mapSize.height + posIdxX - posIdxY);
                object.y = tileSize.height * 0.5 * (mapSize.width + mapSize.height - posIdxX - posIdxY);
            } else {
                object.y = height - object.y;
            }

            if (objType === TMXObjectType.TEXT) {
                const textName = `text${object.id}`;
                aliveNodes[textName] = true;

                let textNode = this.node.getChildByName(textName);
                if (!textNode) {
                    textNode = new Node();
                }

                textNode.setRotationFromEuler(0, 0, -object.rotation);
                textNode.setPosition(object.x - leftTopX, object.y - leftTopY);
                textNode.name = textName;
                textNode.parent = this.node;
                textNode.setSiblingIndex(i);
                textNode.layer = this.node.layer;

                let label = textNode.getComponent(Label);
                if (!label) {
                    label = textNode.addComponent(Label);
                }

                const textTransComp = textNode._uiProps.uiTransformComp!;
                textNode.active = object.visible;
                textTransComp.anchorX = 0;
                textTransComp.anchorY = 1;

                if (this._tintColor) {
                    colorVal.set(this._tintColor);
                    colorVal.a *= this._opacity / 255;
                    label.color.set(colorVal);
                } else {
                    const c = label.color as Color;
                    c.a *= this._opacity / 255;
                }

                label.overflow = Label.Overflow.SHRINK;
                label.lineHeight = object.height;
                label.string = object.text;
                label.horizontalAlign = object.halign;
                label.verticalAlign = object.valign;
                label.fontSize = object.pixelsize;

                textTransComp.setContentSize(object.width, object.height);
            } else if (objType === TMXObjectType.IMAGE) {
                const gid = object.gid;
                const gridGID: GID = (((gid as unknown as number) & FLIPPED_MASK) >>> 0) as any;
                const grid = texGrids.get(gridGID);
                if (!grid) continue;
                const tileset = grid.tileset;
                const imgName = `img${object.id}`;
                aliveNodes[imgName] = true;
                let imgNode = this.node.getChildByName(imgName);
                object.width = object.width || grid.width;
                object.height = object.height || grid.height;

                // Delete image nodes implemented as private nodes
                // Use cc.Node to implement node-level requirements
                if (imgNode && (imgNode._objFlags & CCObject.Flags.HideInHierarchy)) {
                    imgNode.removeFromParent();
                    imgNode.hideFlags |= CCObject.Flags.DontSave;
                    imgNode.destroy();
                    imgNode = null;
                }

                if (!imgNode) {
                    imgNode = new Node();
                }

                if (this._animations.get(gridGID)) {
                    this.aniObjects.push({
                        object,
                        imgNode,
                        gridGID,
                    });
                    this._hasAniObj = true;
                }

                const tileOffsetX = tileset.tileOffset.x;
                const tileOffsetY = tileset.tileOffset.y;
                imgNode.active = object.visible;
                imgNode.setRotationFromEuler(0, 0, -object.rotation);
                imgNode.setPosition(object.x - leftTopX, object.y - leftTopY);
                imgNode.name = imgName;
                imgNode.parent = this.node;
                imgNode.setSiblingIndex(i);
                imgNode.layer = this.node.layer;

                let sprite = imgNode.getComponent(Sprite);
                if (!sprite) {
                    sprite = imgNode.addComponent(Sprite);
                }

                const imgTrans = imgNode._uiProps.uiTransformComp!;
                if (iso) {
                    imgTrans.anchorX = 0.5 + tileOffsetX / object.width;
                    imgTrans.anchorY = tileOffsetY / object.height;
                } else {
                    imgTrans.anchorX = tileOffsetX / object.width;
                    imgTrans.anchorY = tileOffsetY / object.height;
                }

                if (this._tintColor) {
                    colorVal.set(this._tintColor);
                    colorVal.a *= this._opacity / 255;
                    sprite.color.set(colorVal);
                } else {
                    const c = sprite.color as Color;
                    c.a *= this._opacity / 255;
                }

                sprite.sizeMode = Sprite.SizeMode.CUSTOM;

                // HACK: we should support _premultiplyAlpha when group had material
                const srcBlendFactor = this._premultiplyAlpha ? BlendFactor.ONE : BlendFactor.SRC_ALPHA;
                if (sprite.srcBlendFactor !== srcBlendFactor) {
                    sprite.srcBlendFactor = srcBlendFactor;
                    if (sprite.material) {
                        sprite._updateBlendFunc();
                    }
                }

                let spf = grid.spriteFrame;
                if (!spf) {
                    spf = new SpriteFrame();
                } else {
                    spf = spf.clone();
                }
                if (((gid as unknown as number) & FLAG_HORIZONTAL) >>> 0) {
                    spf.flipUVX = !spf.flipUVX;
                }
                if (((gid as unknown as number) & FLAG_VERTICAL) >>> 0) {
                    spf.flipUVY = !spf.flipUVY;
                }
                spf.rotated = grid._rotated!;
                spf.rect = grid._rect!;
                sprite.spriteFrame = spf;

                imgTrans.setContentSize(object.width, object.height);

                sprite.markForUpdateRenderData();
            }
        }
        this._objects = objects;

        // destroy useless node
        const children = this.node.children;
        const uselessExp = /^(?:img|text)\d+$/;
        for (let i = 0, n = children.length; i < n; i++) {
            const c = children[i];
            const cName = c.name;
            const isUseless = uselessExp.test(cName);
            if (isUseless && !aliveNodes[cName]) c.destroy();
        }
    }

    public update (dt: number): void {
        if (!this._hasAniObj) {
            return;
        }

        const aniObjects = this.aniObjects!;
        const _texGrids = this._texGrids!;
        const iso = Orientation.ISO === this._mapInfo!.orientation;

        for (let i = 0, len = aniObjects.length; i < len; i++) {
            const aniObj = aniObjects[i];
            const gridGID = aniObj.gridGID;
            const grid = _texGrids.get(gridGID);
            if (!grid) {
                continue;
            }

            const tileset = grid.tileset;
            const object = aniObj.object;
            const imgNode: Node = aniObj.imgNode;

            const tileOffsetX = tileset.tileOffset.x;
            const tileOffsetY = tileset.tileOffset.y;
            const imgTrans = imgNode._uiProps.uiTransformComp!;
            if (iso) {
                imgTrans.anchorX = 0.5 + tileOffsetX / object.width;
                imgTrans.anchorY = tileOffsetY / object.height;
            } else {
                imgTrans.anchorX = tileOffsetX / object.width;
                imgTrans.anchorY = tileOffsetY / object.height;
            }

            const sp = imgNode.getComponent(Sprite)!;
            const spf = sp.spriteFrame!;

            spf.rotated = grid._rotated!;
            spf.rect = grid._rect!;

            sp.spriteFrame = spf;
            sp.markForUpdateRenderData();
        }
    }
}
