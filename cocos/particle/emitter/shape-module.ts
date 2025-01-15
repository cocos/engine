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

import { ccclass, tooltip, displayOrder, type, formerlySerializedAs, serializable, visible, range } from 'cc.decorator';
import { Mat4, Quat, Vec2, Vec3, clamp, pingPong, random, randomRange, repeat, toDegree, toRadian, warn } from '../../core';

import CurveRange from '../animator/curve-range';
import { ParticleArcMode, ParticleEmitLocation, ParticleShapeType } from '../enum';
import { fixedAngleUnitVector2, particleEmitZAxis, randomPointBetweenCircleAtFixedAngle, randomPointBetweenSphere,
    randomPointInCube, randomSign, randomSortArray, randomUnitVector } from '../particle-general-function';
import { ParticleSystem } from '../particle-system';
import type { Particle } from '../particle';

const _intermediVec = new Vec3(0, 0, 0);
const _intermediArr: [number, number, number] = [0, 0, 0];
const _unitBoxExtent = new Vec3(0.5, 0.5, 0.5);
function getShapeTypeEnumName (enumValue: number): keyof typeof ParticleShapeType {
    let enumName = '';
    for (const key in ParticleShapeType) {
        const value = ParticleShapeType[key];
        if (typeof value === 'number' && value === enumValue) {
            enumName = key;
            break;
        }
    }
    return enumName as keyof typeof ParticleShapeType;
}

/**
 * @en
 * This module defines the the volume or surface from which particles can be emitted, and the direction of the start velocity.
 * The Shape property defines the shape of the emission volume, and the rest of the module properties vary depending on the Shape you choose.
 * All shapes have properties that define their dimensions, such as the Radius property.
 * To edit these, drag the handles on the wireframe emitter shape in the Scene view.
 * The choice of shape affects the region from which particles can be emitted, but also the initial direction of the particles.
 * @zh
 * 本模块定义一个发射体或发射面，粒子将会从它进行发射，并且定义了粒子发射的初始方向和初始速度。
 * 形状属性定义粒子系统的发射体，剩下的属性依赖于选择的形状。
 * 所有形状都具有定义其大小的属性，例如 Radius 属性。要编辑这些属性，请在视图中拖动线框发射器形状上的控制柄。
 * 形状的选择会影响可发射粒子的区域，但也会影响粒子的初始方向。
 */
@ccclass('cc.ShapeModule')
export default class ShapeModule {
    /**
     * @en Emitter position.
     * @zh 粒子发射器位置。
     */
    @displayOrder(13)
    @tooltip('i18n:shapeModule.position')
    get position (): Vec3 {
        return this._position;
    }
    set position (val) {
        this._position = val;
        this.constructMat();
    }

    /**
     * @en Emitter rotation.
     * @zh 粒子发射器旋转角度。
     */
    @displayOrder(14)
    @tooltip('i18n:shapeModule.rotation')
    get rotation (): Vec3 {
        return this._rotation;
    }
    set rotation (val) {
        this._rotation = val;
        this.constructMat();
    }

    /**
     * @en Emitter size scale.
     * @zh 粒子发射器缩放比例。
     */
    @displayOrder(15)
    @tooltip('i18n:shapeModule.scale')
    get scale (): Vec3 {
        return this._scale;
    }
    set scale (val) {
        this._scale = val;
        this.constructMat();
    }

    /**
     * @en Particles will be emitted in an arc if shape is Cone or Circle.
     * @zh 粒子发射器在一个扇形范围内发射。
     */
    @displayOrder(6)
    @tooltip('i18n:shapeModule.arc')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone', 'Circle'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    get arc (): number {
        return toDegree(this._arc);
    }

    set arc (val) {
        this._arc = toRadian(val);
    }

    /**
     * @en The angle of the Cone.<bg>
     * Define how the cone opening and closing.
     * @zh 圆锥的轴与母线的夹角<bg>。
     * 决定圆锥发射器的开合程度。
     */
    @displayOrder(5)
    @tooltip('i18n:shapeModule.angle')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    get angle (): number {
        return Math.round(toDegree(this._angle) * 100) / 100;
    }

    set angle (val) {
        this._angle = toRadian(val);
    }

    @serializable
    private _enable = false;
    /**
     * @en Enable this module or not.
     * @zh 是否启用。
     */
    @displayOrder(0)
    public get enable (): boolean {
        return this._enable;
    }

    public set enable (val) {
        this._enable = val;
    }

    /**
     * @en Emitter [[ShapeType]].
     * @zh 粒子发射器类型 [[ShapeType]]。
     *
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @type(ParticleShapeType)
    @formerlySerializedAs('shapeType')
    @displayOrder(1)
    public _shapeType = ParticleShapeType.Cone;

    @type(ParticleShapeType)
    @tooltip('i18n:shapeModule.shapeType')
    public get shapeType (): number {
        return this._shapeType;
    }

    public set shapeType (val) {
        this._shapeType = val;
        switch (this._shapeType) {
        case ParticleShapeType.Box:
            if (this.emitFrom === ParticleEmitLocation.Base) {
                this.emitFrom = ParticleEmitLocation.Volume;
            }
            break;
        case ParticleShapeType.Cone:
            if (this.emitFrom === ParticleEmitLocation.Edge) {
                this.emitFrom = ParticleEmitLocation.Base;
            }
            break;
        case ParticleShapeType.Sphere:
        case ParticleShapeType.Hemisphere:
            if (this.emitFrom === ParticleEmitLocation.Base || this.emitFrom === ParticleEmitLocation.Edge) {
                this.emitFrom = ParticleEmitLocation.Volume;
            }
            break;
        default:
            break;
        }
    }

    /**
     * @en Particles emitted from which part of the shape [[EmitLocation]] (Box Cone Sphere Hemisphere).
     * @zh 粒子从发射器哪个部位发射 [[EmitLocation]]。
     */
    @type(ParticleEmitLocation)
    @serializable
    @displayOrder(2)
    @tooltip('i18n:shapeModule.emitFrom')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Box', 'Cone', 'Sphere', 'Hemisphere'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public emitFrom = ParticleEmitLocation.Volume;

    /**
     * @en Align particle with particle direction.
     * @zh 根据粒子的初始方向决定粒子的移动方向。
     */
    @serializable
    @displayOrder(16)
    @tooltip('i18n:shapeModule.alignToDirection')
    public alignToDirection = false;

    /**
     * @en Particle direction random amount.
     * @zh 粒子生成方向随机设定。
     */
    @serializable
    @displayOrder(17)
    @tooltip('i18n:shapeModule.randomDirectionAmount')
    public randomDirectionAmount = 0;

    /**
     * @en Blend particle directions towards a spherical direction, where they travel outwards from the center of their transform.
     * @zh 表示当前发射方向与当前位置到结点中心连线方向的插值。
     */
    @serializable
    @displayOrder(18)
    @tooltip('i18n:shapeModule.sphericalDirectionAmount')
    public sphericalDirectionAmount = 0;

    /**
     * @en Particle position random amount.
     * @zh 粒子生成位置随机设定（设定此值为非 0 会使粒子生成位置超出生成器大小范围）。
     */
    @serializable
    @displayOrder(19)
    @tooltip('i18n:shapeModule.randomPositionAmount')
    public randomPositionAmount = 0;

    /**
     * @en Emition radius (available for Circle Cone Sphere Hemisphere).
     * @zh 粒子发射器半径。
     */
    @serializable
    @displayOrder(3)
    @tooltip('i18n:shapeModule.radius')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Circle', 'Cone', 'Sphere', 'Hemisphere'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public radius = 1;

    /**
     * @en Emit position in shape (available for Circle Cone Sphere Hemisphere): <bg>
     * - 0 Emit from surface;
     * - 1 Emit from volume center;
     * - 0 to 1 Emit within surface and volume center.
     * @zh 粒子发射器发射位置（对 Box 类型的发射器无效）：<bg>
     * - 0 表示从表面发射；
     * - 1 表示从中心发射；
     * - 0 ~ 1 之间表示在中心到表面之间发射。
     */
    @serializable
    @displayOrder(4)
    @tooltip('i18n:shapeModule.radiusThickness')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Circle', 'Cone', 'Sphere', 'Hemisphere'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public radiusThickness = 1;

    /**
     * @en Arc mode for Cone and Circle shape.
     * @zh 粒子在扇形范围内的发射方式 [[ArcMode]]。
     */
    @type(ParticleArcMode)
    @serializable
    @displayOrder(7)
    @tooltip('i18n:shapeModule.arcMode')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone', 'Circle'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public arcMode = ParticleArcMode.Random;

    /**
     * @en Control arc spread for Cone and circle shape.
     * @zh 控制可能产生粒子的弧周围的离散间隔。
     */
    @visible(function noArc (this: ShapeModule) { return this.arcMode !== ParticleArcMode.Random; }) // Bug fix: Hide this input when arcMode is random
    @serializable
    @displayOrder(9)
    @tooltip('i18n:shapeModule.arcSpread')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone', 'Circle'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public arcSpread = 0;

    /**
     * @en Emit speed around arc (available for Cone and Circle).
     * @zh 粒子沿圆周发射的速度。
     */
    @type(CurveRange)
    @visible(function noArc (this: ShapeModule) { return this.arcMode !== ParticleArcMode.Random; }) // Bug fix: Hide this input when arcMode is random
    @range([0, 1])
    @serializable
    @displayOrder(10)
    @tooltip('i18n:shapeModule.arcSpeed')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone', 'Circle'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public arcSpeed = new CurveRange();

    /**
     * @en The length from Cone bottom to top.
     * @zh 圆锥顶部截面距离底部的轴长<bg>。
     * 决定圆锥发射器的高度。
     */
    @serializable
    @displayOrder(11)
    @tooltip('i18n:shapeModule.length')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Cone'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public length = 5;

    /**
     * @en Shape thickness for box shape.
     * @zh 粒子发射器发射位置（针对 Box 类型的粒子发射器）。
     */
    @serializable
    @displayOrder(12)
    @tooltip('i18n:shapeModule.boxThickness')
    @visible(function (this: ShapeModule) {
        const subset: Array<keyof typeof ParticleShapeType> = ['Box'];
        const enumName = getShapeTypeEnumName(this.shapeType);
        return subset.includes(enumName);
    })
    public boxThickness = new Vec3(0, 0, 0);

    @serializable
    private _position = new Vec3(0, 0, 0);

    @serializable
    private _rotation = new Vec3(0, 0, 0);

    @serializable
    private _scale = new Vec3(1, 1, 1);

    @serializable
    private _arc = toRadian(360);

    @serializable
    private _angle = toRadian(25);

    private mat = new Mat4();
    private quat: Quat = new Quat();
    private particleSystem: ParticleSystem | null = null;
    private lastTime = 0;
    private totalAngle = 0;

    constructor () {}

    /**
     * @en Apply particle system to this shape and create shape transform matrix.
     * @zh 把发射形状应用到粒子系统，并且创建发射形状变换矩阵。
     * @param ps @en Emit shape applied to which Particle system. @zh 使用发射形状的粒子系统。
     * @internal
     */
    public onInit (ps: ParticleSystem): void {
        this.particleSystem = ps;
        this.constructMat();
        this.lastTime = this.particleSystem.time;
    }

    /**
     * @en Emit particle by this shape.
     * @zh 通过这个形状发射粒子。
     * @param p @en Particle emitted. @zh 发射出来的粒子。
     * @internal
     */
    public emit (p: Particle): void {
        switch (this.shapeType) {
        case ParticleShapeType.Box:
            boxEmit(this.emitFrom, this.boxThickness, p.position, p.velocity);
            break;
        case ParticleShapeType.Circle:
            circleEmit(this.radius, this.radiusThickness, this.generateArcAngle(), p.position, p.velocity);
            break;
        case ParticleShapeType.Cone:
            coneEmit(this.emitFrom, this.radius, this.radiusThickness, this.generateArcAngle(), this._angle, this.length, p.position, p.velocity);
            break;
        case ParticleShapeType.Sphere:
            sphereEmit(this.emitFrom, this.radius, this.radiusThickness, p.position, p.velocity);
            break;
        case ParticleShapeType.Hemisphere:
            hemisphereEmit(this.emitFrom, this.radius, this.radiusThickness, p.position, p.velocity);
            break;
        default:
            warn(`${this.shapeType} shapeType is not supported by ShapeModule.`);
        }
        if (this.randomPositionAmount > 0) {
            p.position.x += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
            p.position.y += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
            p.position.z += randomRange(-this.randomPositionAmount, this.randomPositionAmount);
        }
        Vec3.transformQuat(p.velocity, p.velocity, this.quat);
        Vec3.transformMat4(p.position, p.position, this.mat);
        if (this.sphericalDirectionAmount > 0) {
            const sphericalVel = Vec3.normalize(_intermediVec, p.position);
            Vec3.lerp(p.velocity, p.velocity, sphericalVel, this.sphericalDirectionAmount);
        }
        this.lastTime = this.particleSystem!.time;
    }

    private constructMat (): void {
        Quat.fromEuler(this.quat, this._rotation.x, this._rotation.y, this._rotation.z);
        Mat4.fromRTS(this.mat, this.quat, this._position, this._scale);
    }

    private generateArcAngle (): number {
        if (this.arcMode === ParticleArcMode.Random) {
            return randomRange(0, this._arc);
        }
        let angle = this.totalAngle + 2 * Math.PI * this.arcSpeed.evaluate(this.particleSystem!.time, 1)! * (this.particleSystem!.time - this.lastTime);
        this.totalAngle = angle;
        if (this.arcSpread !== 0) {
            angle = Math.floor(angle / (this._arc * this.arcSpread)) * this._arc * this.arcSpread;
        }
        switch (this.arcMode) {
        case ParticleArcMode.Loop:
            return repeat(angle, this._arc);
        case ParticleArcMode.PingPong:
            return pingPong(angle, this._arc);
        default:
            return repeat(angle, this._arc);
        }
    }
}

function sphereEmit (emitFrom: number, radius: number, radiusThickness: number, pos: Vec3, dir: Vec3): void {
    switch (emitFrom) {
    case ParticleEmitLocation.Volume:
        randomPointBetweenSphere(pos, radius * (1 - radiusThickness), radius);
        Vec3.normalize(dir, pos);
        break;
    case ParticleEmitLocation.Shell:
        randomUnitVector(pos);
        Vec3.multiplyScalar(pos, pos, radius);
        Vec3.normalize(dir, pos);
        break;
    default:
        warn(`${emitFrom} is not supported for sphere emitter.`);
    }
}

function hemisphereEmit (emitFrom: number, radius: number, radiusThickness: number, pos: Vec3, dir: Vec3): void {
    switch (emitFrom) {
    case ParticleEmitLocation.Volume:
        randomPointBetweenSphere(pos, radius * (1 - radiusThickness), radius);
        if (pos.z > 0) {
            pos.z *= -1;
        }
        Vec3.normalize(dir, pos);
        break;
    case ParticleEmitLocation.Shell:
        randomUnitVector(pos);
        Vec3.multiplyScalar(pos, pos, radius);
        if (pos.z > 0) {
            pos.z *= -1;
        }
        Vec3.normalize(dir, pos);
        break;
    default:
        warn(`${emitFrom} is not supported for hemisphere emitter.`);
    }
}

function coneEmit (
    emitFrom: number,
    radius: number,
    radiusThickness: number,
    theta: number,
    angle: number,
    length: number,
    pos: Vec3,
    dir: Vec3,
): void {
    switch (emitFrom) {
    case ParticleEmitLocation.Base:
        randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle) * radius;
        Vec3.normalize(dir, dir);
        pos.z = 0;
        break;
    case ParticleEmitLocation.Shell:
        fixedAngleUnitVector2(pos, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle);
        Vec3.normalize(dir, dir);
        Vec2.multiplyScalar(pos, pos, radius);
        pos.z = 0;
        break;
    case ParticleEmitLocation.Volume:
        randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
        Vec2.multiplyScalar(dir, pos, Math.sin(angle));
        dir.z = -Math.cos(angle) * radius;
        Vec3.normalize(dir, dir);
        pos.z = 0;
        Vec3.add(pos, pos, Vec3.multiplyScalar(_intermediVec, dir, length * random() / -dir.z));
        break;
    default:
        warn(`${emitFrom} is not supported for cone emitter.`);
    }
}

function boxEmit (emitFrom: number, boxThickness: Vec3, pos: Vec3, dir: Vec3): void {
    switch (emitFrom) {
    case ParticleEmitLocation.Volume:
        randomPointInCube(pos, _unitBoxExtent);
        // randomPointBetweenCube(pos, vec3.multiply(_intermediVec, _unitBoxExtent, boxThickness), _unitBoxExtent);
        break;
    case ParticleEmitLocation.Shell:
        _intermediArr[0] = randomRange(-0.5, 0.5);
        _intermediArr[1] = randomRange(-0.5, 0.5);
        _intermediArr[2] = randomSign() * 0.5;
        randomSortArray(_intermediArr);
        applyBoxThickness(_intermediArr, boxThickness);
        Vec3.set(pos, _intermediArr[0], _intermediArr[1], _intermediArr[2]);
        break;
    case ParticleEmitLocation.Edge:
        _intermediArr[0] = randomRange(-0.5, 0.5);
        _intermediArr[1] = randomSign() * 0.5;
        _intermediArr[2] = randomSign() * 0.5;
        randomSortArray(_intermediArr);
        applyBoxThickness(_intermediArr, boxThickness);
        Vec3.set(pos, _intermediArr[0], _intermediArr[1], _intermediArr[2]);
        break;
    default:
        warn(`${emitFrom} is not supported for box emitter.`);
    }
    Vec3.copy(dir, particleEmitZAxis);
}

function circleEmit (radius: number, radiusThickness: number, theta: number, pos: Vec3, dir: Vec3): void {
    randomPointBetweenCircleAtFixedAngle(pos, radius * (1 - radiusThickness), radius, theta);
    Vec3.normalize(dir, pos);
}

function applyBoxThickness (pos: [number, number, number], thickness: Vec3): void {
    if (thickness.x > 0) {
        pos[0] += 0.5 * randomRange(-thickness.x, thickness.x);
        pos[0] = clamp(pos[0], -0.5, 0.5);
    }
    if (thickness.y > 0) {
        pos[1] += 0.5 * randomRange(-thickness.y, thickness.y);
        pos[1] = clamp(pos[1], -0.5, 0.5);
    }
    if (thickness.z > 0) {
        pos[2] += 0.5 * randomRange(-thickness.z, thickness.z);
        pos[2] = clamp(pos[2], -0.5, 0.5);
    }
}
