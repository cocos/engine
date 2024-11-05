/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { DEBUG, EDITOR, NATIVE, PREVIEW, TEST, EDITOR_NOT_IN_PREVIEW, WECHAT } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { findCanvas, loadJsFile } from 'pal/env';
import { Pacer } from 'pal/pacer';
import { ConfigOrientation } from 'pal/screen-adapter';
import assetManager, { IAssetManagerOptions } from '../asset/asset-manager/asset-manager';
import { EventTarget, AsyncDelegate, sys, macro, VERSION, cclegacy, screen, settings,
    assert, garbageCollectionManager, DebugMode, warn, log, _resetDebugSetting, errorID, logID,
    SettingsCategory,
    Settings } from '../core';
import { input } from '../input';
import { deviceManager, LegacyRenderMode } from '../gfx';
import { SplashScreen } from './splash-screen';
import { Layers, Node } from '../scene-graph';
import { builtinResMgr } from '../asset/asset-manager/builtin-res-mgr';
import { director, DirectorEvent } from './director';
import { bindingMappingInfo } from '../rendering/define';
import { ICustomJointTextureLayout } from '../3d/skeletal-animation/skeletal-animation-utils';
import { IPhysicsConfig } from '../physics/framework/physics-config';
import { effectSettings } from '../core/effect-settings';
/**
 * @zh
 * 游戏配置。
 * @en
 * Game configuration.
 */
export interface IGameConfig {
    /**
     * @zh
     * 引擎配置文件路径
     * @en
     * The path of settings.json
     */
    settingsPath?: string;

    /**
     * @zh
     * 引擎内 Effect 配置文件路径
     * @en
     * The path of effectSettings.json
     */
    effectSettingsPath?: string;

    /**
     * @zh
     * 设置 debug 模式，在浏览器中这个选项会被忽略。
     * @en
     * Set debug mode, only valid in non-browser environment.
     */
    debugMode?: DebugMode;

    /**
     * @zh
     * 覆盖 settings 模块中的配置项, 用于控制引擎的启动和初始化，你可以在 game.init 中传入参数，也可以在 [game.onPostBaseInitDelegate] 事件回调中覆盖。
     * 需要注意的是你需要在 application.js 模板中指定此选项和监听此事件。
     * @en
     * Overrides the settings module's some configuration, which is used to control the startup and initialization of the engine.
     * You can pass in parameters in game.init or override them in the [game.onPostBaseInitDelegate] event callback.
     * Note: you need to specify this option in the application.js template or add a delegate callback.
     */
    overrideSettings: Partial<{ [k in Settings.Category[keyof Settings.Category]]: Record<string, any> }>

    /**
     * @zh
     * 当 showFPS 为 true 的时候界面的左下角将显示 fps 的信息，否则被隐藏。
     * @en
     * Left bottom corner fps information will show when "showFPS" equals true, otherwise it will be hide.
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.PROFILING: { "showFPS": true }}``` to set this.
     */
    showFPS?: boolean;

    /**
     * @zh
     * 设置想要的帧率你的游戏，但真正的FPS取决于你的游戏实现和运行环境。
     * @en
     * Set the wanted frame rate for your game, but the real fps depends on your game implementation and the running environment.
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.SCREEN: { "frameRate": 60 }}``` to set this.
     */
    frameRate?: number;

    /**
     * @zh
     * 渲染模式。
     * 设置渲染器类型，仅适用于 web 端：
     * - 0 - 通过引擎自动选择。
     * - 1 - 强制使用 canvas 渲染。
     * - 2 - 强制使用 WebGL 渲染，但是在部分 Android 浏览器中这个选项会被忽略。
     * - 3 - 使用空渲染器，可以用于测试和服务器端环境，目前暂时用于 Cocos 内部测试使用
     * - 4 - 强制使用 WebGPU 渲染，但是在部分浏览器中这个选项会被忽略
     * @en
     * Sets the renderer type, only useful on web:
     * - 0 - Automatically chosen by engine.
     * - 1 - Forced to use canvas renderer.
     * - 2 - Forced to use WebGL renderer, but this will be ignored on mobile browsers.
     * - 3 - Use Headless Renderer, which is useful in test or server env, only for internal use by cocos team for now
     * - 4 - Force WebGPU rendering, but this option will be ignored in some browsers.
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.RENDERING: { "renderMode": 0 }}``` to set this.
     */
    renderMode?: 0 | 1 | 2 | 3 | 4;

    /**
     * @en
     * Render pipeline resources
     * @zh
     * Render pipeline 资源
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.RENDERING: { "renderPipeline": '' }}``` to set this.
     */
    renderPipeline?: string;

    /**
     * @en
     * Asset Manager initialization options
     * @zh
     * 资源管理器初始化设置
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.ASSETS: {}}``` to set this.
     */
    assetOptions?: IAssetManagerOptions;

    /**
     * @en
     * GPU instancing options
     * @zh
     * GPU instancing 选项
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.ANIMATION: { customJointTextureLayouts: [] }}``` to set this.
     */
    customJointTextureLayouts?: ICustomJointTextureLayout[];

    /**
     * @en
     * Physics system config
     * @zh
     * 物理系统设置
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.PHYSICS: {}}``` to set this.
     */
    physics?: IPhysicsConfig;

    /**
     * @en
     * The orientation from the builder configuration.
     * Available value can be 'auto', 'landscape', 'portrait'.
     * @zh
     * 屏幕旋转方向，可选 “自动”，“横屏”，“竖屏”
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.SCREEN: { 'orientation': 'auto' }}``` to set this.
     */
    orientation?: ConfigOrientation;

    /**
     * @en
     * Determine whether the game frame exact fits the screen.
     * Now it only works on Web platform.
     * @zh
     * 是否让游戏外框对齐到屏幕上，目前只在 web 平台生效
     * @deprecated Since v3.6, Please use ```overrideSettings: { SettingsCategory.SCREEN: { 'exactFitScreen': true }}``` to set this.
     */
    exactFitScreen?: boolean,
}

/**
 * @en An object to boot the game.
 * @zh 包含游戏主体信息并负责驱动游戏的游戏对象。
 */
export class Game extends EventTarget {
    /**
     * @en Event triggered when game hide to background.<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter background event, os status bar or notification center may not trigger this event.
     * @zh 游戏进入后台时触发的事件。<br>
     * 请注意，在 WEB 平台，这个事件不一定会 100% 触发，这完全取决于浏览器的回调行为。<br>
     * 在原生平台，它对应的是应用被切换到后台事件，下拉菜单和上拉状态栏等不一定会触发这个事件，这取决于系统行为。
     * @example
     * ```ts
     * import { game } from 'cc';
     * game.on(Game.EVENT_HIDE, function () {
     *
     * });
     * ```
     */
    public static readonly EVENT_HIDE = 'game_on_hide';

    /**
     * @en Event triggered when game back to foreground<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter foreground event.
     * @zh 游戏进入前台运行时触发的事件。<br>
     * 请注意，在 WEB 平台，这个事件不一定会 100% 触发，这完全取决于浏览器的回调行为。<br>
     * 在原生平台，它对应的是应用被切换到前台事件。
     */
    public static readonly EVENT_SHOW: string = 'game_on_show';

    /**
     * @en Event triggered when system in low memory status.<br>
     * This event is only triggered on native iOS/Android platform.
     * @zh 程序在内存不足时触发的事件。<br>
     * 该事件只会在 iOS/Android 平台触发。
     */
    public static readonly EVENT_LOW_MEMORY: string = 'game_on_low_memory';

    /**
     * @en Event triggered after game inited, at this point all engine objects and game scripts are loaded
     * @zh 游戏启动后的触发事件，此时加载所有的引擎对象和游戏脚本。
     */
    public static readonly EVENT_GAME_INITED = 'game_inited';

    /**
     * @en Event triggered after engine inited, at this point you will be able to use all engine classes.<br>
     * It was defined as EVENT_RENDERER_INITED in cocos creator v1.x and renamed in v2.0.
     * Since Cocos Creator v3.0, EVENT_RENDERER_INITED is a new event, look up define for details.
     * @zh 在引擎初始化之后触发的事件，此时您能够使用引擎所有的类。<br>
     * 它在 Cocos Creator v1.x 版本中名字为 EVENT_RENDERER_INITED，在 v2.0 更名为 EVENT_ENGINE_INITED
     * 并在 Cocos Creator v3.0 中将 EVENT_RENDERER_INITED 用作为渲染器初始化的事件。
     */
    public static readonly EVENT_ENGINE_INITED = 'engine_inited';

    /**
     * @en Event triggered after renderer inited, at this point you will be able to use all gfx renderer feature.<br>
     * @zh 在渲染器初始化之后触发的事件，此事件在 EVENT_ENGINE_INITED 之前触发，此时开始可使用 gfx 渲染框架。
     */
    public static readonly EVENT_RENDERER_INITED: string = 'renderer_inited';

    /**
     * @en Event triggered pre base module initialization, at this point you can not use pal/logging/sys/settings API.
     * @zh 基础模块初始化之前的事件，在这个事件点你无法使用 pal/logging/sys/settings 的相关接口。
     */
    public static readonly EVENT_PRE_BASE_INIT = 'pre_base_init';
    /**
     * @en Event triggered post base module initialization, at this point you can use pal/logging/sys/settings API safely.
     * @zh 基础模块初始化之后的事件，在这个事件点你可以安全使用 pal/logging/sys/settings 的相关接口。
     */
    public static readonly EVENT_POST_BASE_INIT = 'post_base_init';
    /**
     * @en Event triggered pre infrastructure initialization, at this point you can not use assetManager/gfx/screen/builtinResMgr/macro/Layer API.
     * @zh 基础设施初始化之前的事件，在这个事件点你无法使用 assetManager/gfx/screen/builtinResMgr/macro/Layer 的相关接口。
     */
    public static readonly EVENT_PRE_INFRASTRUCTURE_INIT = 'pre_infrastructure_init';
    /**
     * @en Event triggered post infrastructure initialization, at this point you can use assetManager/gfx/screen/builtinResMgr/macro/Layer API safely.
     * @zh 基础设施初始化之后的事件，在这个事件点你可以安全使用 assetManager/gfx/screen/builtinResMgr/macro/Layer 的相关接口。
     */
    public static readonly EVENT_POST_INFRASTRUCTURE_INIT = 'post_infrastructure_init';
    /**
     * @en Event triggered pre subsystem initialization, at this point you can not use physics/animation/rendering/tween/etc API.
     * @zh 子系统初始化之前的事件，在这个事件点你无法使用 physics/animation/rendering/tween/etc 的相关接口。
     */
    public static readonly EVENT_PRE_SUBSYSTEM_INIT = 'pre_subsystem_init';
    /**
     * @en Event triggered post subsystem initialization, at this point you can use physics/animation/rendering/tween/etc API safely.
     * @zh 子系统初始化之后的事件，在这个事件点你可以安全使用 physics/animation/rendering/tween/etc 的相关接口。
     */
    public static readonly EVENT_POST_SUBSYSTEM_INIT = 'post_subsystem_init';
    /**
     * @en Event triggered pre project data initialization,
     * at this point you can not access project data using [resources.load]/[director.loadScene] API.
     * @zh 项目数据初始化之前的事件，在这个事件点你无法使用访问项目数据的相关接口，例如 [resources.load]/[director.loadScene] 等 API。
     */
    public static readonly EVENT_PRE_PROJECT_INIT = 'pre_project_init';
    /**
     * @en Event triggered post project data initialization,
     * at this point you can access project data using [resources.load]/[director.loadScene] API safely.
     * @zh 项目数据初始化之后的事件，在这个事件点你可以安全使用访问项目数据的相关接口，例如 [resources.load]/[director.loadScene] 等 API。
     */
    public static readonly EVENT_POST_PROJECT_INIT = 'post_project_init';

    /**
     * @en Event triggered when game restart
     * @zh 调用restart后，触发事件
     */
    public static readonly EVENT_RESTART = 'game_on_restart';

    /**
     * @en Triggered when the game is paused.<br>
     * @zh 游戏暂停时触发该事件。<br>
     * @example
     * ```ts
     * import { game } from 'cc';
     * game.on(Game.EVENT_PAUSE, function () {
     *     //pause audio or video
     * });
     * ```
     */
    public static readonly EVENT_PAUSE = 'game_on_pause';

    /**
     * @en Triggered when the game is resumed.<br>
     * @zh 游戏恢复时触发该事件。<br>
     */
    public static readonly EVENT_RESUME = 'game_on_resume';

    /**
     * @en Triggered when the game will be closed. <br>
     * @zh 游戏将要关闭时触发的事件。<br>
     */
    public static readonly EVENT_CLOSE = 'game_on_close';

    /**
     * @en Web Canvas 2d API as renderer backend.
     * @zh 使用 Web Canvas 2d API 作为渲染器后端。
     */
    public static readonly RENDER_TYPE_CANVAS = 0;
    /**
     * @en WebGL API as renderer backend.
     * @zh 使用 WebGL API 作为渲染器后端。
     */
    public static readonly RENDER_TYPE_WEBGL = 1;
    /**
     * @en OpenGL API as renderer backend.
     * @zh 使用 OpenGL API 作为渲染器后端。
     */
    public static readonly RENDER_TYPE_OPENGL = 2;

    /**
     * @en Headless Renderer, usually used in test or server env
     * @zh 空渲染器，通常用于测试环境或服务器端模式
     */
    public static readonly RENDER_TYPE_HEADLESS = 3;

    /**
     * @en If delta time since last frame is more than this threshold in seconds,
     * the game timer will consider user is debugging and adjust the delta time to [[frameTime]].
     * @zh 如果距离上一帧的帧间隔超过了这个阈值（单位是 s），那么就会被认为正在调试，帧间隔会被自动调节为 [[frameTime]].
     */
    public static DEBUG_DT_THRESHOLD = 1;

    /**
     * @en The outer frame of the game canvas; parent of game container.
     * @zh 游戏画布的外框，container 的父容器。
     *
     * @deprecated since 3.4.0, frame is a concept on web standard, please manager screens via the `screen` module.
     */
    public frame: HTMLDivElement | null = null;
    /**
     * @en The container of game canvas.
     * @zh 游戏画布的容器。
     *
     * @deprecated since 3.4.0, container is a concept on web standard, please manager screens via the `screen` module.
     */
    public container: HTMLDivElement | null = null;
    /**
     * @en The canvas of the game.
     * @zh 游戏的画布。
     */
    public canvas: HTMLCanvasElement | null = null;

    /**
     * @en The renderer backend of the game.
     * @zh 游戏的渲染器类型。
     */
    public renderType = -1;

    public eventTargetOn = super.on;
    public eventTargetOnce = super.once;

    /**
     * @en
     * The current game configuration,
     * please be noticed any modification directly on this object after the game initialization won't take effect.
     * @zh
     * 当前的游戏配置
     * 注意：请不要直接修改这个对象，它不会有任何效果。
     */
    public config: IGameConfig = {} as IGameConfig;

    /**
     * @en Callback when the scripts of engine have been load.
     * @zh 当引擎完成启动后的回调函数。
     * @method onStart
     */
    public onStart: Game.OnStart | null = null;

    constructor () {
        super();
    }

    /**
     * @en Indicates whether the engine and the renderer has been initialized
     * @zh 引擎和渲染器是否以完成初始化
     */
    public get inited (): boolean {
        return this._inited$;
    }

    /**
     * @en Expected frame rate of the game.
     * @zh 游戏的设定帧率。
     */
    public get frameRate (): string | number {
        return this._frameRate$;
    }
    public set frameRate (frameRate: number | string) {
        if (typeof frameRate !== 'number') {
            frameRate = parseInt(frameRate, 10);
            if (Number.isNaN(frameRate)) {
                frameRate = 60;
            }
        }
        this._frameRate$ = frameRate;
        this.frameTime = 1000 / frameRate;
        if (this._pacer$) this._pacer$.targetFrameRate = this._frameRate$;
    }

    /**
     * @en The delta time since last frame, unit: s.
     * @zh 获取上一帧的增量时间，以秒为单位。
     */
    public get deltaTime (): number {
        return this._useFixedDeltaTime$ ? this.frameTime / 1000 : this._deltaTime$;
    }

    /**
     * @en The total passed time since game start, unit: ms
     * @zh 获取从游戏开始到现在总共经过的时间，以毫秒为单位
     */
    public get totalTime (): number {
        return performance.now() - this._initTime$;
    }

    /**
     * @en The start time of the current frame in milliseconds.
     * @zh 获取当前帧开始的时间（以 ms 为单位）。
     */
    public get frameStartTime (): number {
        return this._startTime$;
    }

    /**
     * @en The expected delta time of each frame in milliseconds
     * @zh 期望帧率对应的每帧时间（以 ms 为单位）
     */
    public frameTime = 1000 / 60;

    // states
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _isCloning = false;    // deserializing or instantiating
    private _inited$ = false;
    private _engineInited$ = false; // whether the engine has inited
    private _rendererInitialized$ = false;
    private _paused$ = true;
    private _pausedByEngine$ = false;
    // frame control
    private _frameRate$ = 60;
    private _pacer$: Pacer | null = null;
    private _initTime$ = 0;
    private _startTime$ = 0;
    private _deltaTime$ = 0.0;
    private _useFixedDeltaTime$ = false;
    private _shouldLoadLaunchScene$ = true;

    /**
     * @en The event delegate pre base module initialization. At this point you can not use pal/logging/sys/settings API.
     * @zh 基础模块初始化之前的事件代理。在这个事件点你无法使用 pal/logging/sys/settings 的相关接口。
     */
    public readonly onPreBaseInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate post base module initialization. At this point you can use pal/logging/sys/settings API safely.
     * @zh 基础模块初始化之后的事件代理。在这个事件点你可以安全使用 pal/logging/sys/settings 的相关接口。
     */
    public readonly onPostBaseInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate pre infrastructure module initialization.
     * At this point you can not use assetManager/gfx/screen/builtinResMgr/macro/Layer API.
     * @zh 基础设施模块初始化之前的事件代理。在这个事件点你无法使用 assetManager/gfx/screen/builtinResMgr/macro/Layer 的相关接口。
     */
    public readonly onPreInfrastructureInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate post infrastructure module initialization.
     * At this point you can use assetManager/gfx/screen/builtinResMgr/macro/Layer API safely.
     *
     * @zh 基础设施模块初始化之后的事件代理。在这个事件点你可以安全使用 assetManager/gfx/screen/builtinResMgr/macro/Layer 的相关接口。
     */
    public readonly onPostInfrastructureInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate pre sub system module initialization. At this point you can not use physics/animation/rendering/tween/etc API.
     * @zh 子系统模块初始化之前的事件代理。在这个事件点你无法使用 physics/animation/rendering/tween/etc 的相关接口。
     */
    public readonly onPreSubsystemInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate post sub system module initialization. At this point you can use physics/animation/rendering/tween/etc API safely.
     * @zh 子系统模块初始化之后的事件代理。在这个事件点你可以安全使用 physics/animation/rendering/tween/etc 的相关接口。
     */
    public readonly onPostSubsystemInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate pre project data initialization.
     * At this point you can not access project data using [resources.load]/[director.loadScene] API.
     * @zh 项目数据初始化之前的事件代理。在这个事件点你无法使用访问项目数据的相关接口，例如 [resources.load]/[director.loadScene] 等 API。
     */
    public readonly onPreProjectInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    /**
     * @en The event delegate post project data initialization.
     * at this point you can access project data using [resources.load]/[director.loadScene] API safely.
     * @zh 项目数据初始化之后的事件代理。
     * 在这个事件点你可以安全使用访问项目数据的相关接口，例如 [resources.load]/[director.loadScene] 等 API。
     */
    public readonly onPostProjectInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();

    // @Methods

    //  @Game play control

    /**
     * @en Set frame rate of game.
     * @zh 设置游戏帧率。
     * @deprecated since v3.3.0 please use [[game.frameRate]]
     */
    public setFrameRate (frameRate: number | string): void {
        this.frameRate = frameRate;
    }

    /**
     * @en Get frame rate set for the game, it doesn't represent the real frame rate.
     * @zh 获取设置的游戏帧率（不等同于实际帧率）。
     * @return frame rate
     * @deprecated since v3.3.0 please use [[game.frameRate]]
     */
    public getFrameRate (): number {
        return this.frameRate as number;
    }

    /**
     * @en Run the game frame by frame with a fixed delta time correspond to frame rate.
     * @zh 以固定帧间隔执行一帧游戏循环，帧间隔与设定的帧率匹配。
     */
    public step (): void {
        director.tick(this._calculateDT(true));
    }

    /**
     * @en Called by the engine to pause the game.
     * @zh 提供给引擎调用暂停游戏接口。
     */
    private pauseByEngine$ (): void {
        if (this._paused$) { return; }
        this._pausedByEngine$ = true;
        this.pause();
    }

    /**
     * @en Resume paused game by engine call.
     * @zh 提供给引擎调用恢复暂停游戏接口。
     */
    private resumeByEngine$ (): void {
        if (this._pausedByEngine$) {
            this.resume();
            this._pausedByEngine$ = false;
        }
    }

    /**
     * @en Pause the game main loop. This will pause:
     * - game logic execution
     * - rendering process
     * - input event dispatching (excluding Web and Minigame platforms)
     *
     * This is different with `director.pause()` which only pause the game logic execution.
     *
     * @zh 暂停游戏主循环。包含：
     * - 游戏逻辑
     * - 渲染
     * - 输入事件派发（Web 和小游戏平台除外）
     *
     * 这点和只暂停游戏逻辑的 `director.pause()` 不同。
     */
    public pause (): void {
        if (this._paused$) { return; }
        this._paused$ = true;
        this._pacer$?.stop();
        this.emit(Game.EVENT_PAUSE);
    }

    /**
     * @en Resume the game from pause. This will resume:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * @zh 恢复游戏主循环。包含：游戏逻辑，渲染，事件处理，背景音乐和所有音效。
     */
    public resume (): void {
        if (!this._paused$) { return; }
        input._clearEvents();
        this._paused$ = false;
        this._pacer$?.start();
        this.emit(Game.EVENT_RESUME);
    }

    /**
     * @en Check whether the game is paused.
     * @zh 判断游戏是否暂停。
     */
    public isPaused (): boolean {
        return this._paused$;
    }

    /**
     * @en Restart game.
     * @zh 重新开始游戏
     */
    public restart (): Promise<void> {
        const endFramePromise = new Promise<void>((resolve): void => {
            director.once(DirectorEvent.END_FRAME, (): void => resolve());
        });
        return endFramePromise.then((): void => {
            director.reset();
            cclegacy.Object._deferredDestroy();
            this.pause();
            this.resume();
            this._shouldLoadLaunchScene$ = true;
        }).then((): Promise<void[]> => {
            if (WECHAT) {
                return Promise.resolve([]);
            } else {
                return SplashScreen.createInstance().init();
            }
        }).then((): void => {
            this._safeEmit$(Game.EVENT_RESTART);
        });
    }

    /**
     * @en End game, it will close the game window
     * @zh 退出游戏
     */
    public end (): void {
        systemInfo.close();
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object.<br>
     * This type of event should be triggered via `emit`.<br>
     * @zh
     * 注册 game 的特定事件类型回调。这种类型的事件应该被 `emit` 触发。<br>
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @param once - After the first invocation, whether the callback should be unregistered.
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     */
    public on (type: string, callback: () => void, target?: any, once?: boolean): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if (this.canRegisterEvent$(type)) {
            callback.call(target);
        }
        return this.eventTargetOn(type, callback, target, once);
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object,<br>
     * the callback will remove itself after the first time it is triggered.<br>
     * @zh
     * 注册 game 的特定事件类型回调，回调会在第一时间被触发后删除自身。
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     */
    public once (type: string, callback: () => void, target?: any): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if (this.canRegisterEvent$(type)) {
            return callback.call(target);
        }
        return this.eventTargetOnce(type, callback, target);
    }

    private canRegisterEvent$ (type: string): boolean {
        return this._engineInited$ && type === Game.EVENT_ENGINE_INITED
            || this._inited$ && type === Game.EVENT_GAME_INITED
            || this._rendererInitialized$ && type === Game.EVENT_RENDERER_INITED;
    }

    /**
     * @en Init game with configuration object. Initialization process like below:
     * -PreBaseInitEvent
     * -BaseModuleInitialization(logging, sys, settings)
     * -PostBaseInitEvent
     * -PreInfrastructureInitEvent
     * -InfrastructureModuleInitialization(assetManager, builtinResMgr, gfxDevice, screen, Layer, macro)
     * -PostInfrastructureInitEvent
     * -PreSubsystemInitEvent
     * -SubsystemModuleInitialization(animation, physics, tween, ui, middleware, etc)
     * -PostSubsystemInitEvent
     * -EngineInitedEvent
     * -PreProjectDataInitEvent
     * -ProjectDataInitialization(GamePlayScripts, resources, etc)
     * -PostProjectDataInitEvent
     * -GameInitedEvent
     *
     * @zh 使用指定的配置初始化引擎。初始化流程如下：
     * -PreBaseInitEvent
     * -BaseModuleInitialization(logging, sys, settings)
     * -PostBaseInitEvent
     * -PreInfrastructureInitEvent
     * -InfrastructureModuleInitialization(assetManager, builtinResMgr, gfxDevice, screen, Layer, macro)
     * -PostInfrastructureInitEvent
     * -PreSubsystemInitEvent
     * -SubsystemModuleInitialization(animation, physics, tween, ui, middleware, etc)
     * -PostSubsystemInitEvent
     * -EngineInitedEvent
     * -PreProjectDataInitEvent
     * -ProjectDataInitialization(GamePlayScripts, resources, etc)
     * -PostProjectDataInitEvent
     * -GameInitedEvent
     * @param config - Pass configuration object
     */
    public init (config: IGameConfig): Promise<void> {
        this._compatibleWithOldParams$(config);
        // DONT change the order unless you know what's you doing
        return Promise.resolve()
            // #region Base
            .then((): Promise<void[]> => {
                this.emit(Game.EVENT_PRE_BASE_INIT);
                return this.onPreBaseInitDelegate.dispatch();
            })
            .then((): void => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.time('Init Base');
                }
                const debugMode = config.debugMode || DebugMode.NONE;
                _resetDebugSetting(debugMode);
            })
            .then((): Promise<void> => sys.init())
            .then((): void => {
                this._initEvents$();
            })
            .then((): Promise<void> => settings.init(config.settingsPath, config.overrideSettings))
            .then((): Promise<void[]> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.timeEnd('Init Base');
                }
                this.emit(Game.EVENT_POST_BASE_INIT);
                return this.onPostBaseInitDelegate.dispatch();
            })
            // #endregion Base
            // #region Infrastructure
            .then((): Promise<void[]> => {
                this.emit(Game.EVENT_PRE_INFRASTRUCTURE_INIT);
                return this.onPreInfrastructureInitDelegate.dispatch();
            })
            // gfx init
            .then((): boolean | Promise<boolean> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.time('Init Infrastructure');
                }
                macro.init();
                this._initXR$();
                const adapter = findCanvas();
                if (adapter) {
                    this.canvas = adapter.canvas;
                    this.frame = adapter.frame;
                    this.container = adapter.container;
                }
                screen.init();
                garbageCollectionManager.init();
                return deviceManager.init(this.canvas, bindingMappingInfo);
            })
            .then(() => {
                const usesCustomPipeline = settings.querySettings(
                    SettingsCategory.RENDERING,
                    'customPipeline',
                );
                if (usesCustomPipeline) {
                    if (!cclegacy.rendering) {
                        errorID(12109);
                        return;
                    }
                    if (!macro.CUSTOM_PIPELINE_NAME) {
                        // If custom pipeline is used, but the name is not set, use the default name
                        macro.CUSTOM_PIPELINE_NAME = 'Builtin';
                    }
                } else {
                    // If custom pipeline is not used, disable custom-pipeline module
                    cclegacy.rendering = undefined;
                }
                assetManager.init();
                builtinResMgr.init();
                Layers.init();
                this.initPacer$();
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.timeEnd('Init Infrastructure');
                }
            })
            .then((): Promise<void[]> => {
                this.emit(Game.EVENT_POST_INFRASTRUCTURE_INIT);
                return this.onPostInfrastructureInitDelegate.dispatch();
            })
            // #endregion Infrastructure
            // #region Subsystem
            .then((): Promise<void[]> => {
                this.emit(Game.EVENT_PRE_SUBSYSTEM_INIT);
                return this.onPreSubsystemInitDelegate.dispatch();
            })
            .then((): Promise<void> => effectSettings.init(settings.querySettings(SettingsCategory.RENDERING, 'effectSettingsPath') as string))
            .then((): void => {
                // initialize custom render pipeline
                if (!cclegacy.rendering || !cclegacy.rendering.enableEffectImport) {
                    return;
                }
                const renderMode = settings.querySettings(SettingsCategory.RENDERING, 'renderMode');
                if (renderMode === LegacyRenderMode.HEADLESS) {
                    cclegacy.rendering.init(deviceManager.gfxDevice, null);
                    return;
                }
                const data = effectSettings.data;
                if (data === null) {
                    errorID(1102);
                    return;
                }
                cclegacy.rendering.init(deviceManager.gfxDevice, data);
            })
            .then((): Promise<any[]> => {
                const scriptPackages = settings.querySettings<string[]>(SettingsCategory.SCRIPTING, 'scriptPackages');
                if (scriptPackages) {
                    return Promise.all(scriptPackages.map((pack): Promise<any> => import(pack)));
                }
                return Promise.resolve([]);
            })
            .then((): Promise<void> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.time('Init SubSystem');
                }
                director.init();
                return builtinResMgr.loadBuiltinAssets();
            })
            .then((): Promise<void[]> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.timeEnd('Init SubSystem');
                }
                this.emit(Game.EVENT_POST_SUBSYSTEM_INIT);
                return this.onPostSubsystemInitDelegate.dispatch();
            })
            .then((): void => {
                log(`Cocos Creator v${VERSION}`);
                this.emit(Game.EVENT_ENGINE_INITED);
                this._engineInited$ = true;
            })
            // #endregion Subsystem
            // #region Project
            .then((): Promise<void[]> => {
                this.emit(Game.EVENT_PRE_PROJECT_INIT);
                return this.onPreProjectInitDelegate.dispatch();
            })
            .then((): Promise<void> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.time('Init Project');
                }
                const jsList = settings.querySettings<string[]>(SettingsCategory.PLUGINS, 'jsList');
                let promise = Promise.resolve();
                if (jsList) {
                    jsList.forEach((jsListFile): void => {
                        promise = promise.then((): any => loadJsFile(`${PREVIEW ? 'plugins' : 'src'}/${jsListFile}`));
                    });
                }
                return promise;
            })
            .then((): Promise<any[]> => this._loadProjectBundles())
            .then((): Promise<void> => this._loadCCEScripts$())
            .then((): void | Promise<void> => this._setupRenderPipeline$())
            .then((): Promise<any[]> => this._loadPreloadAssets$())
            .then((): Promise<void[]> => {
                builtinResMgr.compileBuiltinMaterial();
                if (WECHAT) {
                    return Promise.resolve([]);
                }
                return SplashScreen.createInstance().init();
            })
            .then((): Promise<void[]> => {
                if (DEBUG) {
                    // eslint-disable-next-line no-console
                    console.timeEnd('Init Project');
                }
                this.emit(Game.EVENT_POST_PROJECT_INIT);
                return this.onPostProjectInitDelegate.dispatch();
            })
            // #endregion Project
            .then((): void => {
                this._inited$ = true;
                this._safeEmit$(Game.EVENT_GAME_INITED);
            });
    }

    private _initXR$ (): void {
        if (typeof globalThis.__globalXR === 'undefined') {
            globalThis.__globalXR = {};
        }
        const globalXR = globalThis.__globalXR;
        globalXR.webxrCompatible = settings.querySettings(SettingsCategory.XR, 'webxrCompatible') ?? false;

        if (sys.isXR) {
            // XrEntry must not be destroyed
            xr.entry = xr.XrEntry.getInstance();

            const xrMSAA = settings.querySettings(SettingsCategory.RENDERING, 'msaa') ?? 1;
            const xrRenderingScale = settings.querySettings(SettingsCategory.RENDERING, 'renderingScale') ?? 1.0;
            xr.entry.setMultisamplesRTT(xrMSAA);
            xr.entry.setRenderingScale(xrRenderingScale);
        }
    }

    private _compatibleWithOldParams$ (config: IGameConfig): void {
        const overrideSettings = config.overrideSettings = config.overrideSettings || {};
        if ('showFPS' in config) {
            overrideSettings.profiling = overrideSettings.profiling || {};
            overrideSettings.profiling.showFPS = config.showFPS;
        }
        if ('frameRate' in config) {
            overrideSettings.screen = overrideSettings.screen || {};
            overrideSettings.screen.frameRate = config.frameRate;
        }
        if ('renderMode' in config) {
            overrideSettings.rendering = overrideSettings.rendering || {};
            overrideSettings.rendering.renderMode = config.renderMode;
        }
        if ('renderPipeline' in config) {
            overrideSettings.rendering = overrideSettings.rendering || {};
            overrideSettings.rendering.renderPipeline = config.renderPipeline;
        }
        if ('assetOptions' in config) {
            overrideSettings.assets = overrideSettings.assets || {};
            Object.assign(overrideSettings.assets, config.assetOptions);
        }
        if ('customJointTextureLayouts' in config) {
            overrideSettings.animation = overrideSettings.animation || {};
            overrideSettings.animation.customJointTextureLayouts = config.customJointTextureLayouts;
        }
        if ('physics' in config) {
            overrideSettings.physics = overrideSettings.physics || {};
            Object.assign(overrideSettings.physics, config.physics);
        }
        if ('orientation' in config) {
            overrideSettings.screen = overrideSettings.screen || {};
            overrideSettings.screen.orientation = config.orientation;
        }
        if ('exactFitScreen' in config) {
            overrideSettings.screen = overrideSettings.screen || {};
            overrideSettings.screen.exactFitScreen = config.exactFitScreen;
        }
    }

    private _loadPreloadAssets$ (): Promise<any[]> {
        const preloadAssets = settings.querySettings<string[]>(SettingsCategory.ASSETS, 'preloadAssets');
        if (!preloadAssets) return Promise.resolve([]);
        return Promise.all(preloadAssets.map((uuid): Promise<void> => new Promise<void>((resolve, reject): void => {
            assetManager.loadAny(uuid, (err): void => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })));
    }

    /**
     * @internal only for browser preview
     */
    private _loadCCEScripts$ (): Promise<void> {
        return new Promise<void>((resolve, reject): void => {
            // Since there is no script in the bundle during preview, we need to load the user's script in the following way
            if (PREVIEW && !TEST && !EDITOR && !NATIVE) {
                const bundneName = 'cce:/internal/x/prerequisite-imports';
                import(bundneName).then((): void => resolve(), (reason): void => reject(reason));
            } else {
                resolve();
            }
        });
    }

    /**
     * @internal only for game-view
     */
    public _loadProjectBundles (): Promise<void[]> {
        const preloadBundles = settings.querySettings<{ bundle: string, version: string }[]>(SettingsCategory.ASSETS, 'preloadBundles');
        if (!preloadBundles) return Promise.resolve([]);
        return Promise.all(preloadBundles.map(({ bundle, version }): Promise<void> => new Promise<void>((resolve, reject): void => {
            const opts: Record<string, any> = {};
            if (version) opts.version = version;
            assetManager.loadBundle(bundle, opts, (err): void => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })));
    }

    /**
     * @en Run game with configuration object and onStart function.
     * @zh 运行游戏，并且指定引擎配置和 onStart 的回调。
     * @param onStart - function to be executed after game initialized
     */
    public run (onStart?: Game.OnStart): void {
        if (onStart) {
            this.onStart = onStart;
        }
        if (!this._inited$ || EDITOR_NOT_IN_PREVIEW) {
            return;
        }
        this.resume();
    }

    // @Methods
    /**
     * @engineInternal
     */
    public _calculateDT (useFixedDeltaTime: boolean): number {
        this._useFixedDeltaTime$ = useFixedDeltaTime;

        if (useFixedDeltaTime) {
            this._startTime$ = performance.now();
            return this.frameTime / 1000;
        }

        const now = performance.now();
        this._deltaTime$ = now > this._startTime$ ? (now - this._startTime$) / 1000 : 0;
        if (this._deltaTime$ > Game.DEBUG_DT_THRESHOLD) {
            this._deltaTime$ = this.frameTime / 1000;
        }
        this._startTime$ = now;
        return this._deltaTime$;
    }

    private _updateCallback$ (): void {
        if (!this._inited$) return;
        if (!WECHAT && SplashScreen.instance && !SplashScreen.instance.isFinished) {
            SplashScreen.instance.update(this._calculateDT(false));
        } else if (this._shouldLoadLaunchScene$) {
            if (!WECHAT) {
                SplashScreen.releaseInstance();
            }
            this._shouldLoadLaunchScene$ = false;
            const launchScene = settings.querySettings(SettingsCategory.LAUNCH, 'launchScene') as string;
            if (launchScene) {
                // load scene
                director.loadScene(launchScene, (): void => {
                    logID(1103, launchScene);
                    this._initTime$ = performance.now();
                    director.startAnimation();
                    this.onStart?.();
                });
            } else {
                this._initTime$ = performance.now();
                director.startAnimation();
                this.onStart?.();
            }
        } else {
            director.tick(this._calculateDT(false));
        }
    }

    private initPacer$ (): void {
        const frameRate = settings.querySettings(SettingsCategory.SCREEN, 'frameRate') ?? 60;
        assert(typeof frameRate === 'number');
        this._pacer$ = new Pacer();
        this._pacer$.onTick = this._updateCallback$.bind(this);
        this.frameRate = frameRate;
    }

    private _initEvents$ (): void {
        systemInfo.on('show', this._onShow$, this);
        systemInfo.on('hide', this._onHide$, this);
        systemInfo.on('close', this._onClose$, this);
    }

    private _onHide$ (): void {
        this.emit(Game.EVENT_HIDE);
        this.pauseByEngine$();
    }

    private _onShow$ (): void {
        this.emit(Game.EVENT_SHOW);
        this.resumeByEngine$();
    }

    private _onClose$ (): void {
        this.emit(Game.EVENT_CLOSE);
        // TODO : Release Resources.
        systemInfo.exit();
    }

    //  @ Persist root node section
    /**
     * @en
     * Add a persistent root node to the game, the persistent node won't be destroyed during scene transition.<br>
     * The target node must be placed in the root level of hierarchy, otherwise this API won't have any effect.
     * @zh
     * 声明常驻根节点，该节点不会在场景切换中被销毁。<br>
     * 目标节点必须位于为层级的根节点，否则无效。
     * @param node - The node to be made persistent
     * @deprecated Since v3.6.0, please use director.addPersistRootNode instead.
     */
    public addPersistRootNode (node: Node): void {
        director.addPersistRootNode(node);
    }

    /**
     * @en Remove a persistent root node.
     * @zh 取消常驻根节点。
     * @param node - The node to be removed from persistent node list
     * @deprecated Since v3.6.0, please use director.removePersistRootNode instead.
     */
    public removePersistRootNode (node: Node): void {
        director.removePersistRootNode(node);
    }

    /**
     * @en Check whether the node is a persistent root node.
     * @zh 检查节点是否是常驻根节点。
     * @param node - The node to be checked.
     * @deprecated Since v3.6.0, please use director.isPersistRootNode instead.
     */
    public isPersistRootNode (node: Node): boolean {
        return director.isPersistRootNode(node);
    }

    private _setupRenderPipeline$ (): void | Promise<void> {
        const usesCustomPipeline = settings.querySettings(
            SettingsCategory.RENDERING,
            'customPipeline',
        );

        return this._setRenderPipeline$(!!usesCustomPipeline);
    }

    private _setRenderPipeline$ (customPipeline: boolean): void {
        if (!director.root!.setRenderPipeline(customPipeline)) {
            errorID(1222);
            return;
        }

        this._rendererInitialized$ = true;
        this._safeEmit$(Game.EVENT_RENDERER_INITED);
    }

    private _safeEmit$ (event: string | number): void {
        if (EDITOR) {
            try {
                this.emit(event);
            } catch (e) {
                warn(e);
            }
        } else {
            this.emit(event);
        }
    }
}

export declare namespace Game {
    export type OnStart = () => void;
}

cclegacy.Game = Game;

/**
 * @en
 * This is a Game instance.
 * @zh
 * 这是一个 Game 类的实例，包含游戏主体信息并负责驱动游戏的游戏对象。
 */
export const game = cclegacy.game = new Game();
