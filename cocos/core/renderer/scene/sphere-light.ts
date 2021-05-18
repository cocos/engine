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

import { JSB } from 'internal:constants';
import { AABB } from '../../geometry';
import { Vec3 } from '../../math';
import { Light, LightType, nt2lm } from './light';
import { AABBHandle, AABBPool, AABBView, LightPool, LightView, NULL_HANDLE } from '../core/memory-pools';

export class SphereLight extends Light {
    declare protected _hAABB: AABBHandle;
    protected _init (): void {
        super._init();
        if (JSB) {
            this._hAABB = AABBPool.alloc();
            LightPool.set(this._handle, LightView.AABB, this._hAABB);
        }
    }

    protected _destroy (): void {
        if (this._hAABB) {
            AABBPool.free(this._hAABB);
            this._hAABB = NULL_HANDLE;
        }
        super._destroy();
    }

    protected _update (): void {
        if (JSB) {
            LightPool.setVec3(this._handle, LightView.POSITION, this._pos);
            AABBPool.setVec3(this._hAABB, AABBView.CENTER, this._aabb.center);
            AABBPool.setVec3(this._hAABB, AABBView.HALF_EXTENSION, this._aabb.halfExtents);

            this._nativeObj.setPosition(this._pos);
            this._nativeObj.setAABB(this._aabb);
        }
    }

    get position () {
        return this._pos;
    }

    set size (size: number) {
        this._size = size;
        if (JSB) {
            LightPool.set(this._handle, LightView.SIZE, size);
            this._nativeObj.setSize(size);
        }
    }

    get size (): number {
        return this._size;
    }

    set range (range: number) {
        this._range = range;
        if (JSB) {
            LightPool.set(this._handle, LightView.RANGE, range);
            this._nativeObj.setRange(range);
        }

        this._needUpdate = true;
    }

    get range (): number {
        return this._range;
    }

    set luminance (lum: number) {
        this._luminance = lum;
        if (JSB) {
            LightPool.set(this._handle, LightView.ILLUMINANCE, lum);
            this._nativeObj.setIlluminance(lum);
        }
    }

    get luminance (): number {
        return this._luminance;
    }

    get aabb () {
        return this._aabb;
    }

    protected _needUpdate = false;
    protected _size = 0.15;
    protected _range = 1.0;
    protected _luminance = 0;
    protected _pos: Vec3;
    protected _aabb: AABB;

    constructor () {
        super();
        this._aabb = AABB.create();
        this._pos = new Vec3();
        this._type = LightType.SPHERE;
    }

    public initialize () {
        super.initialize();

        const size = 0.15;
        this.size = size;
        this.range = 1.0;
        this.luminance = 1700 / nt2lm(size);
    }

    public update () {
        if (this._node && (this._node.hasChangedFlags || this._needUpdate)) {
            this._node.getWorldPosition(this._pos);
            const range = this._range;
            AABB.set(this._aabb, this._pos.x, this._pos.y, this._pos.z, range, range, range);
            this._needUpdate = false;

            this._update();
        }
    }
}
