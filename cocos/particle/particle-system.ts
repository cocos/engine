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

// eslint-disable-next-line max-len
import { ccclass, help, executeInEditMode, executionOrder, menu, tooltip, displayOrder, type, range, displayName, formerlySerializedAs, override, radian, serializable, visible } from 'cc.decorator';
import { EDITOR, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { Renderer } from '../misc/renderer';
import { ModelRenderer } from '../misc/model-renderer';
import { Material } from '../asset/assets/material';
import { Mat4, pseudoRandom, Quat, randomRangeInt, Vec2, Vec3, CCBoolean, CCFloat, bits, geometry, cclegacy, warn } from '../core';
import { scene } from '../render-scene';
import ColorOverLifetimeModule from './animator/color-overtime';
import CurveRange, { Mode } from './animator/curve-range';
import ForceOvertimeModule from './animator/force-overtime';
import GradientRange from './animator/gradient-range';
import LimitVelocityOvertimeModule from './animator/limit-velocity-overtime';
import RotationOvertimeModule from './animator/rotation-overtime';
import SizeOvertimeModule from './animator/size-overtime';
import TextureAnimationModule from './animator/texture-animation';
import VelocityOvertimeModule from './animator/velocity-overtime';
import Burst from './burst';
import ShapeModule from './emitter/shape-module';
import { CullingMode, Space } from './enum';
import { particleEmitZAxis } from './particle-general-function';
import ParticleSystemRenderer from './renderer/particle-system-renderer-data';
import TrailModule from './renderer/trail';
import { ParticleSystemRendererBase } from './renderer/particle-system-renderer-base';
import { PARTICLE_MODULE_PROPERTY } from './particle';
import { TransformBit } from '../scene-graph/node-enum';
import { Camera } from '../render-scene/scene';
import { ParticleCuller } from './particle-culler';
import { NoiseModule } from './animator/noise-module';
import { director, DirectorEvent } from '../game/director';

const _world_mat = new Mat4();
const _world_rol = new Quat();

const superMaterials = Object.getOwnPropertyDescriptor(Renderer.prototype, 'sharedMaterials')!;

/**
 * @en
 * Particle system component, which can make many effects such as smoke and fire.
 * Include some interesting modules and components such as Velocity Overtime, Force Overtime, Trail and Noise.
 * You can open these modules to see how the particles animate.
 * @zh
 * 粒子系统能够用来制作许多特效，例如 烟雾和火焰。
 * 包含一些有趣的模块，例如 速度模块，受力模块，拖尾模块和噪声模块。
 * 打开这些模块可以看到粒子如何进行变化。
 */
@ccclass('cc.ParticleSystem')
@help('i18n:cc.ParticleSystem')
@menu('Effects/ParticleSystem')
@executionOrder(99)
@executeInEditMode
export class ParticleSystem extends ModelRenderer {
    /**
     * @en Maximum particle capacity to generate.
     * @zh 粒子系统能生成的最大粒子数量。
     */
    @range([0, Number.POSITIVE_INFINITY, 1])
    @displayOrder(1)
    @tooltip('i18n:particle_system.capacity')
    public get capacity (): number {
        return this._capacity;
    }

    public set capacity (val: number) {
        this._capacity = Math.floor(val > 0 ? val : 0);
        if (this.processor && this.processor.model) {
            this.processor.model.setCapacity(this._capacity);
        }
    }

    /**
     * @en The initial color of the particle.
     * @zh 粒子初始颜色。
     */
    @type(GradientRange)
    @serializable
    @displayOrder(8)
    @tooltip('i18n:particle_system.startColor')
    public startColor = new GradientRange();

    /**
     * @en The space of particle scaling.
     * @zh 计算粒子缩放的空间。
     */
    @type(Space)
    @serializable
    @displayOrder(9)
    @tooltip('i18n:particle_system.scaleSpace')
    public scaleSpace = Space.Local;

    /**
     * @en Whether to modify particle size on XYZ axis.
     * @zh 是否需要修改粒子在三个轴上的大小。
     */
    @serializable
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSize3D')
    public startSize3D = false;

    /**
     * @en The initial X size of the particle.
     * @zh 粒子初始x轴方向大小。
     */
    @formerlySerializedAs('startSize')
    @range([0, Number.POSITIVE_INFINITY])
    @type(CurveRange)
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeX')
    public startSizeX = new CurveRange();

    /**
     * @en The initial Y size of the particle.
     * @zh 粒子初始y轴方向大小。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeY')
    @visible(function (this: ParticleSystem): boolean { return this.startSize3D; })
    public startSizeY = new CurveRange();

    /**
     * @en The initial Z size of the particle.
     * @zh 粒子初始z轴方向大小。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(10)
    @tooltip('i18n:particle_system.startSizeZ')
    @visible(function (this: ParticleSystem): boolean { return this.startSize3D; })
    public startSizeZ = new CurveRange();

    /**
     * @en The initial velocity of the particle.
     * @zh 粒子初始速度。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(11)
    @tooltip('i18n:particle_system.startSpeed')
    public startSpeed = new CurveRange();

    /**
     * @en Whether to modify particle rotation on XYZ axis.
     * @zh 是否需要修改粒子在三个轴上的旋转。
     */
    @serializable
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotation3D')
    public startRotation3D = false;

    /**
     * @en The initial rotation angle of the particle on X axis.
     * @zh 粒子初始x轴旋转角度。
     */
    @type(CurveRange)
    @serializable
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationX')
    @visible(function (this: ParticleSystem): boolean { return this.startRotation3D; })
    public startRotationX = new CurveRange();

    /**
     * @en The initial rotation angle of the particle on Y axis.
     * @zh 粒子初始y轴旋转角度。
     */
    @type(CurveRange)
    @serializable
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationY')
    @visible(function (this: ParticleSystem): boolean { return this.startRotation3D; })
    public startRotationY = new CurveRange();

    /**
     * @en The initial rotation angle of the particle on Z axis.
     * @zh 粒子初始z轴旋转角度。
     */
    @type(CurveRange)
    @formerlySerializedAs('startRotation')
    @radian
    @displayOrder(12)
    @tooltip('i18n:particle_system.startRotationZ')
    public startRotationZ = new CurveRange();

    /**
     * @en The time delay to start emission after the particle system starts running.
     * @zh 粒子系统开始运行后，延迟粒子发射的时间。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(6)
    @tooltip('i18n:particle_system.startDelay')
    public startDelay = new CurveRange();

    /**
     * @en Particle life time.
     * @zh 粒子生命周期。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(7)
    @tooltip('i18n:particle_system.startLifetime')
    public startLifetime = new CurveRange();

    /**
     * @en Particle system duration time.
     * @zh 粒子系统运行时间。
     */
    @serializable
    @displayOrder(0)
    @tooltip('i18n:particle_system.duration')
    public duration = 5.0;

    /**
     * @en Whether the particle system is looping.
     * @zh 粒子系统是否循环播放。
     */
    @serializable
    @displayOrder(2)
    @tooltip('i18n:particle_system.loop')
    public loop = true;

    /**
     * @en Play one round before start this particle system.
     * @zh 选中之后，粒子系统会以已播放完一轮之后的状态开始播放（仅当循环播放启用时有效）。
     */
    @displayOrder(3)
    @tooltip('i18n:particle_system.prewarm')
    get prewarm (): boolean {
        return this._prewarm;
    }

    set prewarm (val) {
        if (val === true && this.loop === false) {
            // console.warn('prewarm only works if loop is also enabled.');
        }
        this._prewarm = val;
    }

    /**
     * @en The simulation space of the particle system, it could be world, local or custom.
     * @zh 选择粒子系统所在的坐标系[[Space]]。<br>
     */
    @type(Space)
    @serializable
    @displayOrder(4)
    @tooltip('i18n:particle_system.simulationSpace')
    get simulationSpace (): number {
        return this._simulationSpace;
    }

    set simulationSpace (val) {
        if (val !== this._simulationSpace) {
            this._simulationSpace = val;
            if (this.processor) {
                this.processor.updateMaterialParams();
                this.processor.updateTrailMaterial();
            }
        }
    }

    /**
     * @en The simulation speed of the particle system.
     * @zh 控制整个粒子系统的更新速度。
     */
    @serializable
    @displayOrder(5)
    @tooltip('i18n:particle_system.simulationSpeed')
    public simulationSpeed = 1.0;

    /**
     * @en Automatically start playing after particle system initialized.
     * @zh 粒子系统加载后是否自动开始播放。
     */
    @serializable
    @displayOrder(2)
    @tooltip('i18n:particle_system.playOnAwake')
    public playOnAwake = true;

    /**
     * @en The gravity of the particle system.
     * @zh 粒子受重力影响的重力系数。
     */
    @type(CurveRange)
    @serializable
    @displayOrder(13)
    @tooltip('i18n:particle_system.gravityModifier')
    public gravityModifier = new CurveRange();

    // emission module
    /**
     * @en The value curve of emission rate over time.
     * @zh 随时间推移发射的粒子数的变化曲线。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(14)
    @tooltip('i18n:particle_system.rateOverTime')
    public rateOverTime = new CurveRange();

    /**
     * @en The value curve of emission rate over distance.
     * @zh 每移动单位距离发射的粒子数的变化曲线。
     */
    @type(CurveRange)
    @serializable
    @range([0, Number.POSITIVE_INFINITY])
    @displayOrder(15)
    @tooltip('i18n:particle_system.rateOverDistance')
    public rateOverDistance = new CurveRange();

    /**
     * @en Burst triggers of the particle system.
     * @zh 设定在指定时间发射指定数量的粒子的 burst 的数量。
     */
    @type([Burst])
    @serializable
    @displayOrder(16)
    @tooltip('i18n:particle_system.bursts')
    public bursts: Burst[] = [];

    /**
     * @en Enable particle culling switch. Open it to enable particle culling.
     * If enabled will generate emitter bounding box and emitters outside the frustum will be culled.
     * @zh 粒子剔除开关，如果打开将会生成一个发射器包围盒，包围盒在相机外发射器将被剔除。
     */
    @type(CCBoolean)
    @displayOrder(27)
    @tooltip('i18n:particle_system.renderCulling')
    set renderCulling (value: boolean) {
        this._renderCulling = value;
        if (value) {
            if (!this._boundingBox) {
                this._boundingBox = new geometry.AABB();
                this._calculateBounding(false);
            }
        }
    }

    get renderCulling (): boolean {
        return this._renderCulling;
    }

    @serializable
    private _renderCulling = false;

    /**
     * @en Particle culling mode option. Includes pause, pause and catchup, always simulate.
     * @zh 粒子剔除模式选择。包括暂停模拟，暂停以后快进继续以及不间断模拟。
     */
    @type(CullingMode)
    @displayOrder(17)
    @tooltip('i18n:particle_system.cullingMode')
    get cullingMode (): number {
        return this._cullingMode;
    }

    set cullingMode (value: number) {
        this._cullingMode = value;
    }

    @serializable
    _cullingMode = CullingMode.Pause;

    /**
     * @en Emitter culling mode.
     * @zh 发射器的各种剔除模式。
     */
    public static CullingMode = CullingMode;

    /**
     * @en Particle bounding box half width.
     * @zh 粒子包围盒半宽。
     */
    @type(CCFloat)
    @displayOrder(17)
    @tooltip('i18n:particle_system.aabbHalfX')
    get aabbHalfX (): number {
        const res = this.getBoundingX();
        if (res) {
            return res;
        } else {
            return 0;
        }
    }

    set aabbHalfX (value: number) {
        this.setBoundingX(value);
    }

    @serializable
    private _aabbHalfX = 0;

    /**
     * @en Particle bounding box half height.
     * @zh 粒子包围盒半高。
     */
    @type(CCFloat)
    @displayOrder(17)
    @tooltip('i18n:particle_system.aabbHalfY')
    get aabbHalfY (): number {
        const res = this.getBoundingY();
        if (res) {
            return res;
        } else {
            return 0;
        }
    }

    set aabbHalfY (value: number) {
        this.setBoundingY(value);
    }

    @serializable
    private _aabbHalfY = 0;

    /**
     * @en Particle bounding box half depth.
     * @zh 粒子包围盒半深。
     */
    @type(CCFloat)
    @displayOrder(17)
    @tooltip('i18n:particle_system.aabbHalfZ')
    get aabbHalfZ (): number {
        const res = this.getBoundingZ();
        if (res) {
            return res;
        } else {
            return 0;
        }
    }

    set aabbHalfZ (value: number) {
        this.setBoundingZ(value);
    }

    @serializable
    private _aabbHalfZ = 0;

    /**
     * @en Culling module data before serialize.
     * @zh 序列化之前剔除不需要的模块数据。
     */
    @displayOrder(28)
    @tooltip('i18n:particle_system.dataCulling')
    get dataCulling (): boolean {
        return this._dataCulling;
    }

    set dataCulling (value: boolean) {
        this._dataCulling = value;
    }

    @serializable
    @formerlySerializedAs('enableCulling')
    private _dataCulling = false;

    @override
    @visible(false)
    @serializable
    @displayName('Materials')
    get sharedMaterials (): any {
        // if we don't create an array copy, the editor will modify the original array directly.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return superMaterials.get!.call(this);
    }

    set sharedMaterials (val) {
        // TODO: can we assert that superMaterials.set is defined ?
        superMaterials.set!.call(this, val);
    }

    // color over lifetime module
    @type(ColorOverLifetimeModule)
    _colorOverLifetimeModule: ColorOverLifetimeModule | null = null;
    /**
     * @en The module controlling particle's color over life time.
     * @zh 颜色控制模块。
     */
    @type(ColorOverLifetimeModule)
    @displayOrder(23)
    @tooltip('i18n:particle_system.colorOverLifetimeModule')
    public get colorOverLifetimeModule (): ColorOverLifetimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._colorOverLifetimeModule) {
                this._colorOverLifetimeModule = new ColorOverLifetimeModule();
                this._colorOverLifetimeModule.bindTarget(this.processor);
            }
        }
        return this._colorOverLifetimeModule;
    }

    public set colorOverLifetimeModule (val) {
        if (!val) return;
        this._colorOverLifetimeModule = val;
    }

    // shape module
    @type(ShapeModule)
    _shapeModule: ShapeModule | null = null;
    /**
     * @en The module controlling emitter's shape.
     * @zh 粒子发射器模块。
     */
    @type(ShapeModule)
    @displayOrder(17)
    @tooltip('i18n:particle_system.shapeModule')
    public get shapeModule (): ShapeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._shapeModule) {
                this._shapeModule = new ShapeModule();
                this._shapeModule.onInit(this);
            }
        }
        return this._shapeModule;
    }

    public set shapeModule (val) {
        if (!val) return;
        this._shapeModule = val;
    }

    // size over lifetime module
    @type(SizeOvertimeModule)
    _sizeOvertimeModule: SizeOvertimeModule | null = null;
    /**
     * @en The module controlling particle's size over time.
     * @zh 粒子大小模块。
     */
    @type(SizeOvertimeModule)
    @displayOrder(21)
    @tooltip('i18n:particle_system.sizeOvertimeModule')
    public get sizeOvertimeModule (): SizeOvertimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._sizeOvertimeModule) {
                this._sizeOvertimeModule = new SizeOvertimeModule();
                this._sizeOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._sizeOvertimeModule;
    }

    public set sizeOvertimeModule (val) {
        if (!val) return;
        this._sizeOvertimeModule = val;
    }

    // velocity overtime module
    @type(VelocityOvertimeModule)
    _velocityOvertimeModule: VelocityOvertimeModule | null = null;
    /**
     * @en The module controlling particle's velocity over time.
     * @zh 粒子速度模块。
     */
    @type(VelocityOvertimeModule)
    @displayOrder(18)
    @tooltip('i18n:particle_system.velocityOvertimeModule')
    public get velocityOvertimeModule (): VelocityOvertimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._velocityOvertimeModule) {
                this._velocityOvertimeModule = new VelocityOvertimeModule();
                this._velocityOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._velocityOvertimeModule;
    }

    public set velocityOvertimeModule (val) {
        if (!val) return;
        this._velocityOvertimeModule = val;
    }

    // force overTime module
    @type(ForceOvertimeModule)
    _forceOvertimeModule: ForceOvertimeModule | null = null;
    /**
     * @en The module controlling the force applied to particles over time.
     * @zh 粒子加速度模块。
     */
    @type(ForceOvertimeModule)
    @displayOrder(19)
    @tooltip('i18n:particle_system.forceOvertimeModule')
    public get forceOvertimeModule (): ForceOvertimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._forceOvertimeModule) {
                this._forceOvertimeModule = new ForceOvertimeModule();
                this._forceOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._forceOvertimeModule;
    }

    public set forceOvertimeModule (val) {
        if (!val) return;
        this._forceOvertimeModule = val;
    }

    // limit velocity overtime module
    @type(LimitVelocityOvertimeModule)
    _limitVelocityOvertimeModule: LimitVelocityOvertimeModule | null = null;

    /**
     * @en The module which limits the velocity applied to particles over time, only supported in CPU particle system.
     * @zh 粒子限制速度模块（只支持 CPU 粒子）。
     */
    @type(LimitVelocityOvertimeModule)
    @displayOrder(20)
    @tooltip('i18n:particle_system.limitVelocityOvertimeModule')
    public get limitVelocityOvertimeModule (): LimitVelocityOvertimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._limitVelocityOvertimeModule) {
                this._limitVelocityOvertimeModule = new LimitVelocityOvertimeModule();
                this._limitVelocityOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._limitVelocityOvertimeModule;
    }

    public set limitVelocityOvertimeModule (val) {
        if (!val) return;
        this._limitVelocityOvertimeModule = val;
    }

    // rotation overtime module
    @type(RotationOvertimeModule)
    _rotationOvertimeModule: RotationOvertimeModule | null = null;
    /**
     * @en The module controlling the rotation of particles over time.
     * @zh 粒子旋转模块。
     */
    @type(RotationOvertimeModule)
    @displayOrder(22)
    @tooltip('i18n:particle_system.rotationOvertimeModule')
    public get rotationOvertimeModule (): RotationOvertimeModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._rotationOvertimeModule) {
                this._rotationOvertimeModule = new RotationOvertimeModule();
                this._rotationOvertimeModule.bindTarget(this.processor);
            }
        }
        return this._rotationOvertimeModule;
    }

    public set rotationOvertimeModule (val) {
        if (!val) return;
        this._rotationOvertimeModule = val;
    }

    // texture animation module
    @type(TextureAnimationModule)
    _textureAnimationModule: TextureAnimationModule | null = null;
    /**
     * @en The module controlling the texture animation of particles.
     * @zh 贴图动画模块。
     */
    @type(TextureAnimationModule)
    @displayOrder(24)
    @tooltip('i18n:particle_system.textureAnimationModule')
    public get textureAnimationModule (): TextureAnimationModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._textureAnimationModule) {
                this._textureAnimationModule = new TextureAnimationModule();
                this._textureAnimationModule.bindTarget(this.processor);
            }
        }
        return this._textureAnimationModule;
    }

    public set textureAnimationModule (val) {
        if (!val) return;
        this._textureAnimationModule = val;
    }

    // noise module
    /**
     * @en Noise module which can add some interesting effects.
     * @zh 噪声模块能够增加许多有趣的特效。
     */
    @type(NoiseModule)
    private _noiseModule: NoiseModule | null = null;
    /**
     * @en The module controlling noise map applied to the particles, only supported in CPU particle system.
     * @zh 噪声动画模块，仅支持 CPU 粒子。
     */
    @type(NoiseModule)
    @displayOrder(24)
    @tooltip('i18n:particle_system.noiseModule')
    public get noiseModule (): NoiseModule | null {
        if (EDITOR) {
            if (!this._noiseModule) {
                this._noiseModule = new NoiseModule();
                this._noiseModule.bindTarget(this.processor);
            }
        }
        return this._noiseModule;
    }

    public set noiseModule (val) {
        if (!val) return;
        this._noiseModule = val;
    }

    // trail module
    @type(TrailModule)
    _trailModule: TrailModule | null = null;
    /**
     * @en The module controlling the trail module.
     * @zh 粒子轨迹模块。
     */
    @type(TrailModule)
    @displayOrder(25)
    @tooltip('i18n:particle_system.trailModule')
    public get trailModule (): TrailModule | null {
        if (EDITOR_NOT_IN_PREVIEW) {
            if (!this._trailModule) {
                this._trailModule = new TrailModule();
            }
        }
        return this._trailModule;
    }

    public set trailModule (val) {
        if (!val) return;
        this._trailModule = val;
    }

    // particle system renderer
    /**
     * @en Particle system renderer (CPU or GPU).
     * @zh 粒子系统渲染器（CPU 还是 GPU）。
     */
    @type(ParticleSystemRenderer)
    @serializable
    @displayOrder(26)
    @tooltip('i18n:particle_system.renderer')
    public renderer: ParticleSystemRenderer = new ParticleSystemRenderer();

    /**
     * @ignore
     */
    private _isPlaying: boolean;
    private _isPaused: boolean;
    private _isStopped: boolean;
    private _isEmitting: boolean;
    private _needToRestart: boolean;
    private _needRefresh: boolean;

    private _time: number;  // playback position in seconds.
    private _emitRateTimeCounter: number;
    private _emitRateDistanceCounter: number;
    private _oldWPos: Vec3;
    private _curWPos: Vec3;

    private _boundingBox: geometry.AABB | null;
    private _culler: ParticleCuller | null;
    private _oldPos: Vec3 | null;
    private _curPos: Vec3 | null;
    private _isCulled: boolean;
    private _isSimulating: boolean;

    private _customData1: Vec2;
    private _customData2: Vec2;

    private _subEmitters: any[]; // array of { emitter: ParticleSystem, type: 'birth', 'collision' or 'death'}

    private _needAttach: boolean;

    @serializable
    private _prewarm = false;

    @serializable
    private _capacity = 100;

    @serializable
    private _simulationSpace = Space.Local;

    /**
     * @en Particle update processor (update every particle).
     * @zh 粒子更新器（负责更新每个粒子）。
     */
    public processor: ParticleSystemRendererBase = null!;

    constructor () {
        super();

        this.rateOverTime.constant = 10;
        this.startLifetime.constant = 5;
        this.startSizeX.constant = 1;
        this.startSpeed.constant = 5;

        // internal status
        this._isPlaying = false;
        this._isPaused = false;
        this._isStopped = true;
        this._isEmitting = false;
        this._needToRestart = false;
        this._needRefresh = true;
        this._needAttach = false;

        this._time = 0.0;  // playback position in seconds.
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;
        this._oldWPos = new Vec3();
        this._curWPos = new Vec3();

        this._boundingBox = null;
        this._culler = null;
        this._oldPos = null;
        this._curPos = null;
        this._isCulled = false;
        this._isSimulating = true;

        this._customData1 = new Vec2();
        this._customData2 = new Vec2();

        this._subEmitters = []; // array of { emitter: ParticleSystem, type: 'birth', 'collision' or 'death'}
    }

    public onFocusInEditor (): void {
        this.renderer.create(this);
    }

    public onLoad (): void {
        // HACK, TODO
        this.renderer.onInit(this);
        if (this._shapeModule) this._shapeModule.onInit(this);
        if (this._trailModule && !this.renderer.useGPU && this._trailModule.enable) {
            this._trailModule.onInit(this);
        }
        this.bindModule();
        this._resetPosition();

        // this._system.add(this);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onMaterialModified (index: number, material: Material): void {
        if (this.processor !== null) {
            this.processor.onMaterialModified(index, material);
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onRebuildPSO (index: number, material: Material): void {
        this.processor.onRebuildPSO(index, material);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _collectModels (): scene.Model[] {
        this._models.length = 0;
        this._models.push(this.processor.model!);
        if (this._trailModule && this._trailModule.enable && this._trailModule.getModel()) {
            this._models.push(this._trailModule.getModel()!);
        }
        return this._models;
    }

    protected _attachToScene (): void {
        this.processor.attachToScene();
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule._attachToScene();
        }
    }

    /**
     * @engineInternal
     */
    public _detachFromScene (): void {
        this.processor.detachFromScene();
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule._detachFromScene();
        }
        if (this._boundingBox) {
            this._boundingBox = null;
        }
        if (this._culler) {
            this._culler.clear();
            this._culler.destroy();
            this._culler = null;
        }
    }

    /**
     * @en Bind module to particle processor.
     * @zh 把模块绑定到粒子更新函数上。
     */
    private bindModule (): void {
        if (this._colorOverLifetimeModule) this._colorOverLifetimeModule.bindTarget(this.processor);
        if (this._sizeOvertimeModule) this._sizeOvertimeModule.bindTarget(this.processor);
        if (this._rotationOvertimeModule) this._rotationOvertimeModule.bindTarget(this.processor);
        if (this._forceOvertimeModule) this._forceOvertimeModule.bindTarget(this.processor);
        if (this._limitVelocityOvertimeModule) this._limitVelocityOvertimeModule.bindTarget(this.processor);
        if (this._velocityOvertimeModule) this._velocityOvertimeModule.bindTarget(this.processor);
        if (this._textureAnimationModule) this._textureAnimationModule.bindTarget(this.processor);
        if (this._noiseModule) this._noiseModule.bindTarget(this.processor);
    }

    // TODO: Fast forward current particle system by simulating particles over given period of time, then pause it.
    // simulate(time, withChildren, restart, fixedTimeStep) {

    // }

    /**
     * @en Play particle system.
     * @zh 播放粒子效果。
     */
    public play (): void {
        if (this._needToRestart) {
            this.reset();
            this._needToRestart = false;
        }

        if (this._isPaused) {
            this._isPaused = false;
        }
        if (this._isStopped) {
            this._isStopped = false;
        }

        this._isPlaying = true;
        this._isEmitting = true;

        this._resetPosition();

        // prewarm
        if (this._prewarm) {
            this._prewarmSystem();
        }

        if (this._trailModule) {
            this._trailModule.play();
        }

        if (this.processor) {
            const model = this.processor.getModel();
            if (model) {
                model.enabled = this.enabledInHierarchy;
            }
        }
    }

    /**
     * @en Pause particle system.
     * @zh 暂停播放粒子效果。
     */
    public pause (): void {
        if (this._isStopped) {
            warn('pause(): particle system is already stopped.');
            return;
        }
        if (this._isPlaying) {
            this._isPlaying = false;
        }

        this._isPaused = true;
    }

    /**
     * @zh 停止发射粒子。
     * @en Stop emitting particles.
     */
    public stopEmitting (): void {
        this._isEmitting = false;
        this._needToRestart = true;
    }

    /**
     * @en Stop particle system.
     * @zh 停止播放粒子。
     */
    public stop (): void {
        if (this._isPlaying || this._isPaused) {
            this.clear();
        }
        if (this._isPlaying) {
            this._isPlaying = false;
        }
        if (this._isPaused) {
            this._isPaused = false;
        }
        if (this._isEmitting) {
            this._isEmitting = false;
        }

        this._isStopped = true;

        // if stop emit modify the refresh flag to true
        this._needRefresh = true;

        this.reset();
    }

    private reset (): void {
        this._time = 0.0;
        this._emitRateTimeCounter = 0.0;
        this._emitRateDistanceCounter = 0.0;
        this._resetPosition();

        this.bursts.forEach((burst) => {
            burst.reset();
        });
    }

    /**
     * @en remove all particles from current particle system.
     * @zh 将所有粒子从粒子系统中清除。
     */
    public clear (): void {
        if (this.enabledInHierarchy) {
            this.processor.clear();
            if (this._trailModule) this._trailModule.clear();
        }
        this._calculateBounding(false);
    }

    /**
     * @en Get current particle capacity.
     * @zh 获取当前粒子数量。
     */
    public getParticleCount (): number {
        if (this.processor) {
            return this.processor.getParticleCount();
        } else {
            return 0;
        }
    }

    /**
     * @ignore
     */
    public setCustomData1 (x: number, y: number): void {
        Vec2.set(this._customData1, x, y);
    }

    /**
     * @ignore
     */
    public setCustomData2 (x: number, y: number): void {
        Vec2.set(this._customData2, x, y);
    }

    protected onDestroy (): void {
        this.stop();
        if (this.processor.getModel()?.scene) {
            this.processor.detachFromScene();
            if (this._trailModule && this._trailModule.enable) {
                this._trailModule._detachFromScene();
            }
        }
        director.off(DirectorEvent.BEFORE_COMMIT, this.beforeRender, this);
        // this._system.remove(this);
        this.processor.onDestroy();
        if (this._trailModule) this._trailModule.destroy();
        if (this._culler) {
            this._culler.clear();
            this._culler.destroy();
            this._culler = null;
        }
    }

    protected onEnable (): void {
        super.onEnable();
        director.on(DirectorEvent.BEFORE_COMMIT, this.beforeRender, this);
        if (this.playOnAwake && !EDITOR_NOT_IN_PREVIEW) {
            this.play();
        }
        this.processor.onEnable();
        if (this._trailModule) this._trailModule.onEnable();
    }
    protected onDisable (): void {
        director.off(DirectorEvent.BEFORE_COMMIT, this.beforeRender, this);
        this.processor.onDisable();
        if (this._trailModule) this._trailModule.onDisable();
        if (this._boundingBox) {
            this._boundingBox = null;
        }
        this._oldPos = null;
        if (this._culler) {
            this._culler.clear();
            this._culler.destroy();
            this._culler = null;
        }
    }

    private _calculateBounding (forceRefresh: boolean): void {
        if (this._boundingBox) {
            if (!this._culler) {
                this._culler = new ParticleCuller(this);
            }
            this._culler.calculatePositions();
            geometry.AABB.fromPoints(this._boundingBox, this._culler.minPos, this._culler.maxPos);
            if (forceRefresh) {
                this.aabbHalfX = this._boundingBox.halfExtents.x;
                this.aabbHalfY = this._boundingBox.halfExtents.y;
                this.aabbHalfZ = this._boundingBox.halfExtents.z;
            } else {
                if (this.aabbHalfX) {
                    this.setBoundingX(this.aabbHalfX);
                } else {
                    this.aabbHalfX = this._boundingBox.halfExtents.x;
                }

                if (this.aabbHalfY) {
                    this.setBoundingY(this.aabbHalfY);
                } else {
                    this.aabbHalfY = this._boundingBox.halfExtents.y;
                }

                if (this.aabbHalfZ) {
                    this.setBoundingZ(this.aabbHalfZ);
                } else {
                    this.aabbHalfZ = this._boundingBox.halfExtents.z;
                }
            }
            this._culler.clear();
        }
    }

    protected update (dt: number): void {
        const scaledDeltaTime = dt * this.simulationSpeed;

        if (!this.renderCulling) {
            if (this._boundingBox) {
                this._boundingBox = null;
            }
            if (this._culler) {
                this._culler.clear();
                this._culler.destroy();
                this._culler = null;
            }
            this._isSimulating = true;
        } else {
            if (!this._boundingBox) {
                this._boundingBox = new geometry.AABB();
                this._calculateBounding(false);
            }

            if (!this._curPos) {
                this._curPos = new Vec3();
            }
            this.node.getWorldPosition(this._curPos);
            if (!this._oldPos) {
                this._oldPos = new Vec3();
                this._oldPos.set(this._curPos);
            }
            if (!this._curPos.equals(this._oldPos) && this._boundingBox && this._culler) {
                const dx = this._curPos.x - this._oldPos.x;
                const dy = this._curPos.y - this._oldPos.y;
                const dz = this._curPos.z - this._oldPos.z;
                const center = this._boundingBox.center;
                center.x += dx;
                center.y += dy;
                center.z += dz;
                this._culler.setBoundingBoxCenter(center.x, center.y, center.z);
                this._oldPos.set(this._curPos);
            }

            const cameraLst: Camera[]|undefined = this.node.scene.renderScene?.cameras;
            let culled = true;
            if (cameraLst !== undefined && this._boundingBox) {
                for (let i = 0; i < cameraLst.length; ++i) {
                    const camera: Camera = cameraLst[i];
                    const visibility = camera.visibility;
                    if ((visibility & this.node.layer) === this.node.layer) {
                        if (EDITOR_NOT_IN_PREVIEW) {
                            if (camera.name === 'Editor Camera' && geometry.intersect.aabbFrustum(this._boundingBox, camera.frustum)) {
                                culled = false;
                                break;
                            }
                        } else if (geometry.intersect.aabbFrustum(this._boundingBox, camera.frustum)) {
                            culled = false;
                            break;
                        }
                    }
                }
            }
            if (culled) {
                if (this._cullingMode !== CullingMode.AlwaysSimulate) {
                    this._isSimulating = false;
                }
                if (!this._isCulled) {
                    this.processor.detachFromScene();
                    this._isCulled = true;
                }
                if (this._trailModule && this._trailModule.enable) {
                    this._trailModule._detachFromScene();
                }
                if (this._cullingMode === CullingMode.PauseAndCatchup) {
                    this._time += scaledDeltaTime;
                }
                if (this._cullingMode !== CullingMode.AlwaysSimulate) {
                    return;
                }
            } else {
                if (this._isCulled) {
                    this._attachToScene();
                    this._isCulled = false;
                }
                if (!this._isSimulating) {
                    this._isSimulating = true;
                }
            }

            if (!this._isSimulating) {
                return;
            }
        }

        if (this._isPlaying) {
            this._time += scaledDeltaTime;

            // Execute emission
            this._emit(scaledDeltaTime);

            // simulation, update particles.
            if (this.processor.updateParticles(scaledDeltaTime) === 0 && !this._isEmitting) {
                this.stop();
            }
        } else {
            const mat: Material | null = this.getMaterialInstance(0) || this.processor.getDefaultMaterial();
            const pass = mat!.passes[0];
            this.processor.updateRotation(pass);
            this.processor.updateScale(pass);
        }

        if (this._needAttach) { // Check whether this particle model should be reattached
            if (this.getParticleCount() > 0) {
                if (!this._isCulled) {
                    if (!this.processor.getModel()?.scene) {
                        this.processor.attachToScene();
                    }
                    if (this._trailModule && this._trailModule.enable) {
                        if (!this._trailModule.getModel()?.scene) {
                            this._trailModule._attachToScene();
                        }
                    }
                    this._needAttach = false;
                }
            }
        }

        if (!this.renderer.useGPU && this._trailModule && this._trailModule.enable) {
            if (!this._trailModule.inited) {
                this._trailModule.clear();
                this._trailModule.destroy();
                this._trailModule.onInit(this);
                // Rebuild trail buffer
                this._trailModule.enable = false;
                this._trailModule.enable = true;
            }
        }
    }

    protected beforeRender (): void {
        if (this.getParticleCount() <= 0) {
            if (this.processor.getModel()?.scene) {
                this.processor.detachFromScene();
                if (this._trailModule && this._trailModule.enable) {
                    this._trailModule._detachFromScene();
                }
                this._needAttach = false;
            }
        } else if (!this.processor.getModel()?.scene) {
            this._needAttach = true;
        }

        if (!this._isPlaying) return;

        // update render data
        this.processor.updateRenderData();
        this.processor.beforeRender();
        // update trail
        if (this._trailModule && this._trailModule.enable) {
            this._trailModule.updateRenderData();
            this._trailModule.beforeRender();
        }
    }

    protected _onVisibilityChange (val): void {
        if (this.processor.model) {
            this.processor.model.visFlags = val;
        }
    }

    private emit (count: number, dt: number): void {
        const loopDelta = (this._time % this.duration) / this.duration; // loop delta value

        // refresh particle node position to update emit position
        if (this._needRefresh) {
            // this.node.setPosition(this.node.getPosition());
            this.node.invalidateChildren(TransformBit.POSITION);

            this._needRefresh = false;
        }

        if (this._simulationSpace === Space.World) {
            this.node.getWorldMatrix(_world_mat);
            this.node.getWorldRotation(_world_rol);
        }

        for (let i = 0; i < count; ++i) {
            const particle = this.processor.getFreeParticle();
            if (particle === null) {
                return;
            }
            particle.particleSystem = this;
            particle.reset();

            const rand = pseudoRandom(randomRangeInt(0, bits.INT_MAX));

            if (this._shapeModule && this._shapeModule.enable) {
                this._shapeModule.emit(particle);
            } else {
                Vec3.set(particle.position, 0, 0, 0);
                Vec3.copy(particle.velocity, particleEmitZAxis);
            }

            if (this._textureAnimationModule && this._textureAnimationModule.enable) {
                this._textureAnimationModule.init(particle);
            }

            const curveStartSpeed = this.startSpeed.evaluate(loopDelta, rand)!;
            Vec3.multiplyScalar(particle.velocity, particle.velocity, curveStartSpeed);

            if (this._simulationSpace === Space.World) {
                Vec3.transformMat4(particle.position, particle.position, _world_mat);
                Vec3.transformQuat(particle.velocity, particle.velocity, _world_rol);
            }

            Vec3.copy(particle.ultimateVelocity, particle.velocity);
            // apply startRotation.
            if (this.startRotation3D) {
                // eslint-disable-next-line max-len
                particle.startEuler.set(this.startRotationX.evaluate(loopDelta, rand), this.startRotationY.evaluate(loopDelta, rand), this.startRotationZ.evaluate(loopDelta, rand));
            } else {
                particle.startEuler.set(0, 0, this.startRotationZ.evaluate(loopDelta, rand));
            }
            particle.rotation.set(particle.startEuler);

            // apply startSize.
            if (this.startSize3D) {
                Vec3.set(
                    particle.startSize,
                    this.startSizeX.evaluate(loopDelta, rand)!,
                    this.startSizeY.evaluate(loopDelta, rand)!,
                    this.startSizeZ.evaluate(loopDelta, rand)!,
                );
            } else {
                Vec3.set(particle.startSize, this.startSizeX.evaluate(loopDelta, rand)!, 1, 1);
                particle.startSize.y = particle.startSize.x;
            }
            Vec3.copy(particle.size, particle.startSize);

            // apply startColor.
            particle.startColor.set(this.startColor.evaluate(loopDelta, rand));
            particle.color.set(particle.startColor);

            // apply startLifetime.
            particle.startLifetime = this.startLifetime.evaluate(loopDelta, rand)! + dt;
            particle.remainingLifetime = particle.startLifetime;

            particle.randomSeed = randomRangeInt(0, 233280);
            particle.loopCount++;

            this.processor.setNewParticle(particle);
        } // end of particles forLoop.
    }

    // initialize particle system as though it had already completed a full cycle.
    private _prewarmSystem (): void {
        this.startDelay.mode = Mode.Constant; // clear startDelay.
        this.startDelay.constant = 0;
        const dt = 1.0; // should use varying value?
        const cnt = this.duration / dt;

        for (let i = 0; i < cnt; ++i) {
            this._time += dt;
            this._emit(dt);
            this.processor.updateParticles(dt);
        }
    }

    // internal function
    private _emit (dt: number): void {
        // emit particles.
        const startDelay = this.startDelay.evaluate(0, 1)!;
        if (this._time > startDelay) {
            if (this._time > (this.duration + startDelay)) {
                // this._time = startDelay; // delay will not be applied from the second loop.(Unity)
                // this._emitRateTimeCounter = 0.0;
                // this._emitRateDistanceCounter = 0.0;
                if (!this.loop) {
                    this._isEmitting = false;
                }
            }

            if (!this._isEmitting) return;

            // emit by rateOverTime
            this._emitRateTimeCounter += this.rateOverTime.evaluate(this._time / this.duration, 1)! * dt;
            if (this._emitRateTimeCounter > 1) {
                const emitNum = Math.floor(this._emitRateTimeCounter);
                this._emitRateTimeCounter -= emitNum;
                this.emit(emitNum, dt);
            }

            // emit by rateOverDistance
            const rateOverDistance = this.rateOverDistance.evaluate(this._time / this.duration, 1)!;
            if (rateOverDistance > 0) {
                Vec3.copy(this._oldWPos, this._curWPos);
                this.node.getWorldPosition(this._curWPos);
                const distance = Vec3.distance(this._curWPos, this._oldWPos);
                this._emitRateDistanceCounter += distance * rateOverDistance;
            }

            if (this._emitRateDistanceCounter > 1) {
                const emitNum = Math.floor(this._emitRateDistanceCounter);
                this._emitRateDistanceCounter -= emitNum;
                this.emit(emitNum, dt);
            }

            // bursts
            for (const burst of this.bursts) {
                burst.update(this, dt);
            }
        }
    }

    private _resetPosition (): void {
        this.node.getWorldPosition(this._oldWPos);
        Vec3.copy(this._curWPos, this._oldWPos);
    }

    private addSubEmitter (subEmitter): void {
        this._subEmitters.push(subEmitter);
    }

    private removeSubEmitter (idx: number): void {
        this._subEmitters.splice(this._subEmitters.indexOf(idx), 1);
    }

    private addBurst (burst: Burst): void {
        this.bursts.push(burst);
    }

    private removeBurst (burst: Burst): void {
        const i = this.bursts.indexOf(burst);
        if (i > -1) {
            this.bursts.splice(i, 1);
        }
    }

    private getBoundingX (): number {
        return this._aabbHalfX;
    }

    private getBoundingY (): number {
        return this._aabbHalfY;
    }

    private getBoundingZ (): number {
        return this._aabbHalfZ;
    }

    private setBoundingX (value: number): void {
        if (this._boundingBox && this._culler) {
            this._boundingBox.halfExtents.x = value;
            this._culler.setBoundingBoxSize(this._boundingBox.halfExtents);
            this._aabbHalfX = value;
        }
    }

    private setBoundingY (value: number): void {
        if (this._boundingBox && this._culler) {
            this._boundingBox.halfExtents.y = value;
            this._culler.setBoundingBoxSize(this._boundingBox.halfExtents);
            this._aabbHalfY = value;
        }
    }

    private setBoundingZ (value: number): void {
        if (this._boundingBox && this._culler) {
            this._boundingBox.halfExtents.z = value;
            this._culler.setBoundingBoxSize(this._boundingBox.halfExtents);
            this._aabbHalfZ = value;
        }
    }

    /**
     * @ignore
     */
    get isPlaying (): boolean {
        return this._isPlaying;
    }

    /**
     * @en Query particle system is paused or not.
     * @zh 获取粒子系统当前是否已经暂停运行。
     */
    get isPaused (): boolean {
        return this._isPaused;
    }

    /**
     * @en Query particle system is stopped or not.
     * @zh 获取粒子系统当前是否已经停止。
     */
    get isStopped (): boolean {
        return this._isStopped;
    }

    /**
     * @en Query particle system is emitting or not.
     * @zh 获取粒子系统当前是否还在发射。
     */
    get isEmitting (): boolean {
        return this._isEmitting;
    }

    /**
     * @en Query particle system simulation time.
     * @zh 获取粒子系统运行时间。
     */
    get time (): number {
        return this._time;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _onBeforeSerialize (props): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.dataCulling ? props.filter((p: string): any => !PARTICLE_MODULE_PROPERTY.includes(p) || (this[p] && this[p].enable)) : props;
    }

    /**
     * @en Gets the preview of noise texture.
     * @zh 获取噪声图预览。
     * @param width @en Noise texture width @zh 噪声图宽度
     * @param height @en Noise texture height @zh 噪声图高度
     * @returns @en Noise texture RGB pixel array @zh 噪声图 RGB 纹理数组
     */
    public getNoisePreview (width: number, height: number): number[] {
        const out: number[] = [];
        if (this.processor) {
            this.processor.getNoisePreview(out, width, height);
        }
        return out;
    }
}
