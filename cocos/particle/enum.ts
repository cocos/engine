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

import { Enum } from '../core';

export enum ParticleSpace {
    World = 0,
    Local = 1,
    Custom = 2,
}
Enum(ParticleSpace);

/**
 * @en Particle emitter culling mode
 * @zh 粒子的剔除模式。
 * @enum ParticleSystem.CullingMode
 */
export enum ParticleCullingMode {
    Pause = 0,
    PauseAndCatchup = 1,
    AlwaysSimulate = 2,
}
Enum(ParticleCullingMode);

/**
 * @en Particle emitter alignment space
 * @zh 粒子的对齐模式。
 * @enum ParticleSystemRenderer.AlignmentSpace
 */
export enum ParticleAlignmentSpace {
    World = 0,
    Local = 1,
    View = 2,
}
Enum(ParticleAlignmentSpace);

/**
 * 粒子的生成模式。
 * @enum ParticleSystemRenderer.RenderMode
 */
export enum ParticleRenderMode {

    /**
     * 粒子始终面向摄像机。
     */
    Billboard = 0,

    /**
     * 粒子始终面向摄像机但会根据参数进行拉伸。
     */
    StrecthedBillboard = 1,

    /**
     * 粒子始终与 XZ 平面平行。
     */
    HorizontalBillboard = 2,

    /**
     * 粒子始终与 Y 轴平行且朝向摄像机。
     */
    VerticalBillboard = 3,

    /**
     * 粒子保持模型本身状态。
     */
    Mesh = 4,
}
Enum(ParticleRenderMode);

/**
 * 粒子发射器类型。
 * @enum shapeModule.ShapeType
 */
export enum ParticleShapeType {
    /**
     * 立方体类型粒子发射器。
     */
    Box = 0,

    /**
     * 圆形粒子发射器。
     */
    Circle = 1,

    /**
     * 圆锥体粒子发射器。
     */
    Cone = 2,

    /**
     * 球体粒子发射器。
     */
    Sphere = 3,

    /**
     * 半球体粒子发射器。
     */
    Hemisphere = 4,
}
Enum(ParticleShapeType);

/**
 * 粒子从发射器的哪个部位发射。
 * @enum shapeModule.EmitLocation
 */
export enum ParticleEmitLocation {
    /**
     * 基础位置发射（仅对 Circle 类型及 Cone 类型的粒子发射器适用）。
     */
    Base = 0,

    /**
     * 边框位置发射（仅对 Box 类型及 Circle 类型的粒子发射器适用）。
     */
    Edge = 1,

    /**
     * 表面位置发射（对所有类型的粒子发射器都适用）。
     */
    Shell = 2,

    /**
     * 内部位置发射（对所有类型的粒子发射器都适用）。
     */
    Volume = 3,
}
Enum(ParticleEmitLocation);

/**
 * 粒子在扇形区域的发射方式。
 * @enum shapeModule.ArcMode
 */
export enum ParticleArcMode {
    /**
     * 随机位置发射。
     */
    Random = 0,

    /**
     * 沿某一方向循环发射，每次循环方向相同。
     */
    Loop = 1,

    /**
     * 循环发射，每次循环方向相反。
     */
    PingPong = 2,
}
Enum(ParticleArcMode);

/**
 * 选择如何为粒子系统生成轨迹。
 * @enum trailModule.TrailMode
 */
export enum ParticleTrailMode {
    /**
     * 粒子模式<bg>。
     * 创建一种效果，其中每个粒子在其路径中留下固定的轨迹。
     */
    Particles = 0,

    /**
     * 带模式<bg>。
     * 根据其生命周期创建连接每个粒子的轨迹带。
     */
    // Ribbon = 1,
}
Enum(ParticleTrailMode);

/**
 * 纹理填充模式。
 * @enum trailModule.TextureMode
 */
export enum ParticleTextureMode {
    /**
     * 拉伸填充纹理。
     */
    Stretch = 0,

    /**
     * 重复填充纹理。
     */
    // Repeat = 1,
}
Enum(ParticleTextureMode);

export enum ParticleModuleRandSeed {
    LIMIT = 23541,
    SIZE = 39825,
    TEXTURE = 90794,
    COLOR = 91041,
    FORCE = 212165,
    ROTATION = 125292,
    VELOCITY_X = 197866,
    VELOCITY_Y = 156497,
    VELOCITY_Z = 984136,
}
