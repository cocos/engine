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

import { SpriteFrame } from '../2d/assets';
import { Texture2D } from '../asset/assets';
import { Rect } from '../core';
import { GID, TiledGrid, TiledTextureGrids, TMXTilesetInfo } from './tiled-types';

let _enableTexelOffset = false;

export function enableTexelOffsetUtils (enable: boolean): void {
    _enableTexelOffset = enable;
}

export function fillTextureGrids (tileset: TMXTilesetInfo, texGrids: TiledTextureGrids, spFrame?: SpriteFrame): void {
    const spf: SpriteFrame = spFrame || tileset.sourceImage!;
    const tex: Texture2D = spf.texture as Texture2D;

    const collection = tileset.collection;

    if (!tileset.imageSize.width || !tileset.imageSize.height) {
        const sourceImage = tileset.sourceImage!;
        tileset.imageSize.width = sourceImage.width;
        tileset.imageSize.height = sourceImage.height;
    }

    const imageWidth = tileset.imageSize.width;
    const imageHeight = tileset.imageSize.height;

    const tw = tileset._tileSize.width;
    const th = tileset._tileSize.height;
    const texWidth = spf.width;
    const texHeight = spf.height;
    const spacing = tileset.spacing;
    const margin = tileset.margin;

    let count = 1;
    if (!collection) {
        const cols = Math.floor((imageWidth - margin * 2 + spacing) / (tw + spacing));
        const rows = Math.floor((imageHeight - margin * 2 + spacing) / (th + spacing));
        count = Math.max(1, rows * cols);
    }

    const firstGid = tileset.firstGid;
    let grid: TiledGrid | null = null;
    let override = !!texGrids.get(firstGid);

    // Tiledmap may not be partitioned into blocks, resulting in a count value of 0

    const maxGid = (tileset.firstGid as unknown as number) + count;
    let gid = firstGid as unknown as number;
    for (; gid < maxGid; ++gid) {
        // Avoid overlapping
        if (override && !texGrids.get(gid as unknown as GID)) {
            override = false;
        }
        if (!override && texGrids.get(gid as unknown as GID)) {
            break;
        }

        grid = {
            tileset,
            x: 0,
            y: 0,
            width: tw,
            height: th,
            t: 0,
            l: 0,
            r: 0,
            b: 0,
            cx: 0,
            cy: 0,
            offsetX: 0,
            offsetY: 0,
            rotated: false,
            gid: gid as unknown as GID,
            spriteFrame: spf,
            texture: tex,
        };

        tileset.rectForGID(gid as unknown as GID, grid);

        if (!spFrame || count > 1 || tileset.imageOffset) {
            if (spFrame) {
                grid._name = spFrame.name;
                const lm = spFrame.unbiasUV[0];
                const bm = spFrame.rotated ? spFrame.unbiasUV[1] : spFrame.unbiasUV[5];

                if (_enableTexelOffset) {
                    grid.l = lm + (grid.x + 0.5) / texWidth;
                    grid.t = bm + (grid.y + 0.5) / texHeight;
                    grid.r = lm + (grid.x + grid.width - 0.5) / texWidth;
                    grid.b = bm + (grid.y + grid.height - 0.5) / texHeight;
                } else {
                    grid.l = lm + (grid.x) / texWidth;
                    grid.t = bm + (grid.y) / texHeight;
                    grid.r = lm + (grid.x + grid.width) / texWidth;
                    grid.b = bm + (grid.y + grid.height) / texHeight;
                }

                grid._rect = new Rect(grid.x, grid.y, grid.width, grid.height);
            } else {
                grid.l = grid.x / texWidth;
                grid.t = grid.y / texHeight;
                grid.r = (grid.x + grid.width) / texWidth;
                grid.b = (grid.y + grid.height) / texHeight;
                grid._rect = new Rect(grid.x, grid.y, grid.width, grid.height);
            }
        } else if (spFrame.rotated) {
            grid._rotated = true;
            grid._name = spFrame.name;
            grid._rect = spFrame.getRect();
            grid.l = spFrame.unbiasUV[0];
            grid.t = spFrame.unbiasUV[1];
            grid.r = spFrame.unbiasUV[4];
            grid.b = spFrame.unbiasUV[3];
        } else {
            grid._name = spFrame.name;
            grid._rect = spFrame.getRect();
            grid.l = spFrame.unbiasUV[0];
            grid.t = spFrame.unbiasUV[5];
            grid.r = spFrame.unbiasUV[2];
            grid.b = spFrame.unbiasUV[1];
        }
        grid.cx = (grid.l + grid.r) / 2;
        grid.cy = (grid.t + grid.b) / 2;

        texGrids.set(gid as unknown as GID, grid);
    }
}
