/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

import { EffectAsset } from './effect-asset';
import { Texture } from '../../gfx';
import { TextureBase } from './texture-base';
import { PassOverrides, MacroRecord, MaterialProperty } from '../../render-scene';
import { Color, Mat3, Mat4, Quat, Vec2, Vec3, Vec4, cclegacy } from '../../core';
import './asset';
import { patch_cc_Material } from '../../native-binding/decorators';
import type { Material as JsbMaterial } from './material';

/**
 * @en The basic infos for material initialization.
 * @zh 用来初始化材质的基本信息。
 */
interface IMaterialInfo {
    /**
     * @en The EffectAsset to use. Must provide if `effectName` is not specified.
     * @zh
     * 这个材质将使用的 EffectAsset，直接提供资源引用，和 `effectName` 至少要指定一个。
     */
    effectAsset?: EffectAsset | null;
    /**
     * @en
     * The name of the EffectAsset to use. Must provide if `effectAsset` is not specified.
     * @zh
     * 这个材质将使用的 EffectAsset，通过 effect 名指定，和 `effectAsset` 至少要指定一个。
     */
    effectName?: string;
    /**
     * @en
     * The index of the technique to use.
     * @zh
     * 这个材质将使用第几个 technique，默认为 0。
     */
    technique?: number;
    /**
     * @en
     * The shader macro definitions. Default to 0 or the specified value in [[EffectAsset]].
     * @zh
     * 这个材质定义的预处理宏，默认全为 0，或 [[EffectAsset]] 中的指定值。
     */
    defines?: MacroRecord | MacroRecord[];
    /**
     * @en
     * The override values on top of the pipeline states specified in [[EffectAsset]].
     * @zh
     * 这个材质的自定义管线状态，将覆盖 effect 中的属性。<br>
     * 注意在可能的情况下请尽量少的自定义管线状态，以减小对渲染效率的影响。
     */
    states?: PassOverrides | PassOverrides[];
}

export type MaterialPropertyFull = MaterialProperty | TextureBase | Texture | null;

declare const jsb: any;
const matProto: any = jsb.Material.prototype;

type setProperyCB = (name: string, val: MaterialPropertyFull | MaterialPropertyFull[], passIdx?: number) => void;
function wrapSetProperty(cb: setProperyCB, target: Material, name: string, val: MaterialPropertyFull | MaterialPropertyFull[], passIdx?: number) {
    if (passIdx != undefined) {
        cb.call(target, name, val, passIdx);
    } else {
        cb.call(target, name, val);
    }
}
// Note: The MathType should be synchronized with MathType in jsb_conversion_spec.cpp
enum MathType {
    VEC2 = 0,
    VEC3,
    VEC4,
    QUATERNION,
    MAT3,
    MAT4,
    SIZE,
    RECT,
    COLOR,
};
matProto.setProperty = function (name: string, val: MaterialPropertyFull | MaterialPropertyFull[], passIdx?: number) {
    if (Array.isArray(val)) {
        const first = val[0];
        if (typeof first === 'number') {
            if (Number.isInteger(first)) {
                wrapSetProperty(this.setPropertyInt32Array, this, name, val, passIdx);
            } else {
                wrapSetProperty(this.setPropertyFloat32Array, this, name, val, passIdx);
            }
        } else if (first instanceof Vec2) {
            wrapSetProperty(this.setPropertyVec2Array, this, name, val, passIdx);
        } else if (first instanceof Vec3) {
            wrapSetProperty(this.setPropertyVec3Array, this, name, val, passIdx);
        } else if (first instanceof Vec4) {
            wrapSetProperty(this.setPropertyVec4Array, this, name, val, passIdx);
        } else if (first instanceof Color) {
            wrapSetProperty(this.setPropertyColorArray, this, name, val, passIdx);
        } else if (first instanceof Mat3) {
            wrapSetProperty(this.setPropertyMat3Array, this, name, val, passIdx);
        } else if (first instanceof Mat4) {
            wrapSetProperty(this.setPropertyMat4Array, this, name, val, passIdx);
        } else if (first instanceof Quat) {
            wrapSetProperty(this.setPropertyQuatArray, this, name, val, passIdx);
        } else if (first instanceof TextureBase) {
            wrapSetProperty(this.setPropertyTextureBaseArray, this, name, val, passIdx);
        } else if (first instanceof Texture) {
            wrapSetProperty(this.setPropertyGFXTextureArray, this, name, val, passIdx);
        } else {
            cclegacy.error(`Material.setProperty Unknown type: ${val}`);
        }
    } else if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            wrapSetProperty(this.setPropertyInt32, this, name, val, passIdx);
        } else {
            wrapSetProperty(this.setPropertyFloat32, this, name, val, passIdx);
        }
    } else if (val instanceof Vec2) {
        wrapSetProperty(this.setPropertyVec2, this, name, val, passIdx);
    } else if (val instanceof Vec3) {
        wrapSetProperty(this.setPropertyVec3, this, name, val, passIdx);
    } else if (val instanceof Vec4) {
        wrapSetProperty(this.setPropertyVec4, this, name, val, passIdx);
    } else if (val instanceof Color) {
        wrapSetProperty(this.setPropertyColor, this, name, val, passIdx);
    } else if (val instanceof Mat3) {
        wrapSetProperty(this.setPropertyMat3, this, name, val, passIdx);
    } else if (val instanceof Mat4) {
        wrapSetProperty(this.setPropertyMat4, this, name, val, passIdx);
    } else if (val instanceof Quat) {
        wrapSetProperty(this.setPropertyQuat, this, name, val, passIdx);
    } else if (val instanceof TextureBase) {
        wrapSetProperty(this.setPropertyTextureBase, this, name, val, passIdx);
    } else if (val instanceof Texture) {
        wrapSetProperty(this.setPropertyGFXTexture, this, name, val, passIdx);
    } else if (val === null) {
        if (passIdx) {
            this.setPropertyNull(name, passIdx);
        } else {
            this.setPropertyNull(name);
        }
    }
    else {
        cclegacy.error(`Material.setProperty Unknown type: ${val}`);
    }
};

matProto.getProperty = function (name: string, passIdx?: number) {
    let val: any;
    if (passIdx !== undefined) {
        val = this._getProperty(name, passIdx);
    } else {
        val = this._getProperty(name);
    }
    if (Array.isArray(val)) {
        const first = val[0];
        const arr: any[] = []; // cjh TODO: optimize temporary gc objects being created
        if (first instanceof jsb.Vec2 || first.type === MathType.VEC2) { // The type of first is uncertain, might be jsb.Color or plainObject.
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Vec2(e.x, e.y));
            }
        } else if (first.type === MathType.VEC3) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Vec3(e.x, e.y, e.z));
            }
        } else if (first.type === MathType.VEC4) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Vec4(e.x, e.y, e.z, e.w));
            }
        } else if (first instanceof jsb.Color) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Color(e.r, e.g, e.b, e.a));
            }
        } else if (first.type === MathType.MAT3) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Mat3(
                    e[0], e[1], e[2],
                    e[3], e[4], e[5],
                    e[6], e[7], e[8],
                ));
            }
        } else if (first.type === MathType.MAT4) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Mat4(
                    e[0], e[1], e[2], e[3],
                    e[4], e[5], e[6], e[7],
                    e[8], e[9], e[10], e[11],
                    e[12], e[13], e[14], e[15],
                ));
            }
        } else if (first.type === MathType.QUATERNION) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const e = val[i];
                arr.push(new Quat(e.x, e.y, e.z, e.w));
            }
        }

        return arr || val;
    } else if (val === null || val === undefined) {
        return null;
    }

    let ret;
    const e = val;
    if (val instanceof jsb.Vec2 || val.type === MathType.VEC2) {
        ret = new Vec3(e.x, e.y);
    } else if (val.type === MathType.VEC3) {
        ret = new Vec3(e.x, e.y, e.z);
    } else if (val.type === MathType.VEC4) {
        ret = new Vec4(e.x, e.y, e.z, e.w);
    } else if (val instanceof jsb.Color) {
        ret = new Color(e.r, e.g, e.b, e.a);
    } else if (val.type === MathType.MAT3) {
        ret = new Mat3(
            e[0], e[1], e[2],
            e[3], e[4], e[5],
            e[6], e[7], e[8],
        );
    } else if (val.type === MathType.MAT4) {
        ret = new Mat4(
            e[0], e[1], e[2], e[3],
            e[4], e[5], e[6], e[7],
            e[8], e[9], e[10], e[11],
            e[12], e[13], e[14], e[15],
        );
    } else if (val.type === MathType.QUATERNION) {
        ret = new Quat(e.x, e.y, e.z, e.w);
    }

    return ret || val;
};

export type Material = JsbMaterial;
export const Material: typeof JsbMaterial = jsb.Material;
cclegacy.Material = Material;

const materialProto: any = Material.prototype;

materialProto._ctor = function () {
    jsb.Asset.prototype._ctor.apply(this, arguments);
    this._props = [];
    this._passes = [];

    this._registerPassesUpdatedListener();
    this._isCtorCalled = true;
};

const oldOnLoaded = materialProto.onLoaded;
materialProto.onLoaded = function () {
    this._propsInternal = this._props;
    oldOnLoaded.call(this);
};

materialProto._onPassesUpdated = function () {
    this._passes = this.getPasses();
};

Object.defineProperty(materialProto, 'passes', {
    enumerable: true,
    configurable: true,
    get() {
        if (!this._isCtorCalled) {
            // Builtin materials are created in cpp, the _passes property is not updated when access it in JS.
            // So we need to invoke getPasses() to sync _passes property.
            this._ctor();
            this._passes = this.getPasses();
        }

        return this._passes;
    },
});

// handle meta data, it is generated automatically
patch_cc_Material({ Material, EffectAsset});
