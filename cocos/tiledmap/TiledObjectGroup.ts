/****************************************************************************
 Copyright (c) 2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 ****************************************************************************/

import { Component } from '../core/components';
import { ccclass, help, menu, type, requireComponent } from 'cc.decorator';
import * as cc from "../core";
import { legacyCC } from "../core/global-exports";
import { Sprite } from "../ui/components/sprite";
import { Label } from "../ui/components/label";
import * as gfx from "../core/gfx";

import { TMXMapInfo, TMXObjectGroupInfo, PropertiesInfo, TiledAnimationType, TMXObject } from './TMXXMLParser';
import { TiledTextureGrids, GID, TileFlag, Orientation, StaggerAxis, TMXObjectType } from './TiledTypes';
import { UITransform } from '../core/components/ui-base/ui-transform';

/**
 * !#en Renders the TMX object group.
 * !#zh 渲染 tmx object group。
 * @class TiledObjectGroup
 * @extends Component
 */
@ccclass('cc.TiledObjectGroup')
@help('i18n:cc.TiledObjectGroup')
@menu('Components/TiledObjectGroup')
@requireComponent(UITransform)
export class TiledObjectGroup extends Component {

    _premultiplyAlpha: boolean = false;

    @type(cc.CCBoolean)
    get premultiplyAlpha() {
        return this._premultiplyAlpha;
    }
    set premultiplyAlpha(value) {
        this._premultiplyAlpha = value;
    }


    /**
     * !#en Offset position of child objects.
     * !#zh 获取子对象的偏移位置。
     * @method getPositionOffset
     * @return {Vec2}
     * @example
     * let offset = tMXObjectGroup.getPositionOffset();
     */
    getPositionOffset() {
        return this._positionOffset;
    }

    /**
     * !#en List of properties stored in a dictionary.
     * !#zh 以映射的形式获取属性列表。
     * @method getProperties
     * @return {Object}
     * @example
     * let offset = tMXObjectGroup.getProperties();
     */
    getProperties() {
        this._properties;
    }

    /**
     * !#en Gets the Group name.
     * !#zh 获取组名称。
     * @method getGroupName
     * @return {String}
     * @example
     * let groupName = tMXObjectGroup.getGroupName;
     */
    getGroupName() {
        return this._groupName;
    }

    /**
     * Return the value for the specific property name
     * @param {String} propertyName
     * @return {Object}
     */
    getProperty(propertyName: { toString(): string } | string) {
        return this._properties![propertyName.toString()];
    }

    /**
     * !#en
     * Return the object for the specific object name. <br />
     * It will return the 1st object found on the array for the given name.
     * !#zh 获取指定的对象。
     * @method getObject
     * @param {String} objectName
     * @return {Object|Null}
     * @example
     * let object = tMXObjectGroup.getObject("Group");
     */
    getObject(objectName) {
        for (let i = 0, len = this._objects!.length; i < len; i++) {
            let obj = this._objects[i];
            if (obj && obj.name === objectName) {
                return obj;
            }
        }
        // object not found
        return null;
    }

    /**
     * !#en Gets the objects.
     * !#zh 获取对象数组。
     * @method getObjects
     * @return {Array}
     * @example
     * let objects = tMXObjectGroup.getObjects();
     */
    getObjects() {
        return this._objects;
    }

    _groupName?: string;
    _positionOffset?: cc.Vec2;
    _mapInfo?: TMXMapInfo;
    _properties?: PropertiesInfo;
    _offset?: cc.Vec2;
    _opacity?: number;
    _tintColor: cc.Color|null = null;

    _animations?: TiledAnimationType;
    _hasAniObj?: boolean;
    _texGrids?: TiledTextureGrids;
    aniObjects?: {
        object: TMXObject,
        imgNode: cc.Node,
        gridGID: GID
    }[];
    _objects: TMXObject[] = [];


    _init(groupInfo: TMXObjectGroupInfo, mapInfo: TMXMapInfo, texGrids: TiledTextureGrids) {

        const FLIPPED_MASK = TileFlag.FLIPPED_MASK;
        const FLAG_HORIZONTAL = TileFlag.HORIZONTAL;
        const FLAG_VERTICAL = TileFlag.VERTICAL;

        this._groupName = groupInfo.name;
        this._positionOffset = groupInfo.offset;
        this._mapInfo = mapInfo;
        this._properties = groupInfo.getProperties();
        this._offset = cc.v2(groupInfo.offset.x, -groupInfo.offset.y);
        this._opacity = groupInfo._opacity;

        if (groupInfo.tintColor) {
            this._tintColor = groupInfo.tintColor;
        }

        this._texGrids = texGrids;
        this._animations = mapInfo.getTileAnimations();
        this.aniObjects = [];
        this._hasAniObj = false;

        let mapSize = mapInfo._mapSize;
        let tileSize = mapInfo._tileSize;
        let width = 0,
            height = 0;
        let colorVal = new cc.Color;

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
            let wh = mapSize.width + mapSize.height;
            width = tileSize.width * 0.5 * wh;
            height = tileSize.height * 0.5 * wh;
        } else {
            width = mapSize.width * tileSize.width;
            height = mapSize.height * tileSize.height;
        }

        let transComp = this.node._uiProps.uiTransformComp!;
        transComp.setContentSize(width, height);

        let leftTopX = width * transComp.anchorX;
        let leftTopY = height * (1 - transComp.anchorY);

        let objects = groupInfo._objects;
        let aliveNodes = {};
        for (let i = 0, l = objects.length; i < l; i++) {
            let object = objects[i];
            let objType = object.type;
            object.offset = cc.v2(object.x, object.y);

            let points = object.points || object.polylinePoints;
            if (points) {
                for (let pi = 0; pi < points.length; pi++) {
                    points[pi].y *= -1;
                }
            }

            if (iso) {
                let posIdxX = object.x / tileSize.height;
                let posIdxY = object.y / tileSize.height;
                object.x = tileSize.width * 0.5 * (mapSize.height + posIdxX - posIdxY);
                object.y = tileSize.height * 0.5 * (mapSize.width + mapSize.height - posIdxX - posIdxY);
            } else {
                object.y = height - object.y;
            }

            if (objType === TMXObjectType.TEXT) {
                let textName = "text" + object.id;
                aliveNodes[textName] = true;

                let textNode = this.node.getChildByName(textName);
                if (!textNode) {
                    textNode = new cc.Node();
                }

                textNode.setRotationFromEuler(0, 0, -object.rotation);
                textNode.setPosition(object.x - leftTopX, object.y - leftTopY);
                textNode.name = textName;
                textNode.parent = this.node;
                textNode.setSiblingIndex(i);


                let label = textNode.getComponent(Label);
                if (!label) {
                    label = textNode.addComponent(Label);
                }

                let textTransComp = textNode._uiProps.uiTransformComp!;
                textNode.active = object.visible;
                textTransComp.anchorX = 0;
                textTransComp.anchorY = 1;

                if (this._tintColor) {
                    colorVal.set(this._tintColor);
                    colorVal.a *= this._opacity / 255;
                    label.color.set(colorVal);
                } else {
                    let c = label.color as cc.Color;
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
                let gid = object.gid;
                let gridGID: GID = (((gid as unknown as number) & FLIPPED_MASK) >>> 0) as any;
                let grid = texGrids.get(gridGID);
                if (!grid) continue;
                let tileset = grid.tileset;
                let imgName = "img" + object.id;
                aliveNodes[imgName] = true;
                let imgNode = this.node.getChildByName(imgName);
                object.width = object.width || grid.width;
                object.height = object.height || grid.height;

                // Delete image nodes implemented as private nodes
                // Use cc.Node to implement node-level requirements
                if (imgNode instanceof cc.PrivateNode) {
                    imgNode.removeFromParent();
                    imgNode.destroy();
                    imgNode = null;
                }

                if (!imgNode) {
                    imgNode = new cc.Node();
                }

                if (this._animations.get(gridGID)) {
                    this.aniObjects.push({
                        object: object,
                        imgNode: imgNode,
                        gridGID: gridGID,
                    })
                    this._hasAniObj = true;
                }

                let tileOffsetX = tileset.tileOffset.x;
                let tileOffsetY = tileset.tileOffset.y;
                imgNode.active = object.visible;
                imgNode.setRotationFromEuler(0, 0, -object.rotation);
                imgNode.setPosition(object.x - leftTopX, object.y - leftTopY);
                imgNode.name = imgName;
                imgNode.parent = this.node;
                imgNode.setSiblingIndex(i);

                let sprite = imgNode.getComponent(Sprite);
                if (!sprite) {
                    sprite = imgNode.addComponent(Sprite);
                }

                let imgTrans = imgNode._uiProps.uiTransformComp!;
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
                    let c = sprite.color as cc.Color;
                    c.a *= this._opacity / 255;
                }


                sprite.sizeMode = Sprite.SizeMode.CUSTOM;

                sprite.srcBlendFactor = this._premultiplyAlpha ? gfx.GFXBlendFactor.ONE : gfx.GFXBlendFactor.SRC_ALPHA;
                sprite.dstBlendFactor = gfx.GFXBlendFactor.ONE_MINUS_SRC_ALPHA;
                sprite._updateBlendFunc();


                let spf = grid.spriteFrame!;
                if (!spf) {
                    spf = new cc.SpriteFrame();
                }
                let scale = imgNode.getScale();
                let scaleX = scale.x, scaleY = scale.y;
                if (((gid as unknown as number) & FLAG_HORIZONTAL) >>> 0) {
                    scaleX *= -1;
                }

                if (((gid as unknown as number) & FLAG_VERTICAL) >>> 0) {
                    scaleY *= -1;
                }
                imgNode.setScale(scaleX, scaleY, scale.z);

                spf.rotated = grid._rotated!;
                spf.rect = grid._rect!;
                sprite.spriteFrame = spf;

                imgTrans.setContentSize(object.width, object.height);

                sprite.markForUpdateRenderData();
            }
        }
        this._objects = objects;

        // destroy useless node
        let children = this.node.children;
        let uselessExp = /^(?:img|text)\d+$/;
        for (let i = 0, n = children.length; i < n; i++) {
            let c = children[i];
            let cName = c.name;
            let isUseless = uselessExp.test(cName);
            if (isUseless && !aliveNodes[cName]) c.destroy();
        }
    }

    update(dt: number) {
        if (!this._hasAniObj) {
            return;
        }

        const aniObjects = this.aniObjects!;
        const _texGrids = this._texGrids!;
        const iso = Orientation.ISO === this._mapInfo!.orientation

        for (let i = 0, len = aniObjects.length; i < len; i++) {
            let aniObj = aniObjects[i];
            let gridGID = aniObj.gridGID;
            let grid = _texGrids.get(gridGID);
            if (!grid) {
                continue;
            }

            let tileset = grid.tileset;
            let object = aniObj.object;
            let imgNode: cc.Node = aniObj.imgNode;

            let tileOffsetX = tileset.tileOffset.x;
            let tileOffsetY = tileset.tileOffset.y;
            let imgTrans = imgNode._uiProps.uiTransformComp!;
            if (iso) {
                imgTrans.anchorX = 0.5 + tileOffsetX / object.width;
                imgTrans.anchorY = tileOffsetY / object.height;
            } else {
                imgTrans.anchorX = tileOffsetX / object.width;
                imgTrans.anchorY = tileOffsetY / object.height;
            }

            let sp = imgNode.getComponent(Sprite)!;
            let spf = sp.spriteFrame!;

            spf.rotated = grid._rotated!;
            spf.rect = grid._rect!;

            sp.spriteFrame = spf;
            sp.markForUpdateRenderData();
        }
    }

}

legacyCC.TiledObjectGroup = TiledObjectGroup;