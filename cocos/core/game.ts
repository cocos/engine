/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { EDITOR, HTML5, JSB, PREVIEW, RUNTIME_BASED, TEST } from 'internal:constants';
import { systemInfo } from 'pal/system-info';
import { findCanvas, loadJsFile } from 'pal/env';
import { Pacer } from 'pal/pacer';
import assetManager from './asset-manager/asset-manager';
import { EventTarget } from './event';
import { AsyncDelegate } from './event/async-delegate';
import { input } from '../input';
import * as debug from './platform/debug';
import { deviceManager } from './gfx';
import { sys } from './platform/sys';
import { macro } from './platform/macro';
import { legacyCC, VERSION } from './global-exports';
import { localDescriptorSetLayout_ResizeMaxJoints } from './pipeline/define';
import { SplashScreen } from './splash-screen';
import { RenderPipeline } from './pipeline/render-pipeline';
import { Layers, Node } from './scene-graph';
import { garbageCollectionManager } from './data/garbage-collection';
import { screen } from './platform/screen';
import { builtinResMgr } from './builtin/builtin-res-mgr';
import { Settings, settings } from './settings';
import { Director, director } from './director';
import { bindingMappingInfo } from './pipeline/define';
import { assert } from './platform/debug';
import { IBundleOptions } from './asset-manager/shared';

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
     * 设置 debug 模式，在浏览器中这个选项会被忽略。
     * @en
     * Set debug mode, only valid in non-browser environment.
     */
    debugMode?: debug.DebugMode;

    overrideSettings : Partial<{ [ k in Settings.Category[keyof Settings.Category] ]: any }>
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
     * import { game, audioEngine } from 'cc';
     * game.on(Game.EVENT_HIDE, function () {
     *     audioEngine.pauseMusic();
     *     audioEngine.pauseAllEffects();
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

    public static readonly EVENT_PRE_SETTINGS_INIT = 'pre_settings_init';
    public static readonly EVENT_POST_SETTINGS_INIT = 'post_settings_init';
    public static readonly EVENT_PRE_BASE_INIT = 'pre_base_init';
    public static readonly EVENT_POST_BASE_INIT = 'post_base_init';
    public static readonly EVENT_PRE_PAL_INIT = 'pre_pal_init';
    public static readonly EVENT_POST_PAL_INIT = 'post_pal_init';
    public static readonly EVENT_PRE_INFRASTRUCTURE_INIT = 'pre_infrastructure_init';
    public static readonly EVENT_POST_INFRASTRUCTURE_INIT = 'post_infrastructure_init';
    public static readonly EVENT_PRE_SUBSYSTEM_INIT = 'pre_subsystem_init';
    public static readonly EVENT_POST_SUBSYSTEM_INIT = 'post_subsystem_init';
    public static readonly EVENT_PRE_PROJECT_INIT = 'pre_project_init';
    public static readonly EVENT_POST_PROJECT_INIT = 'post_project_init';

    /**
     * @en Event triggered when game restart
     * @zh 调用restart后，触发事件
     */
    public static readonly EVENT_RESTART = 'game_on_restart';

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

    /**
     * @en Indicates whether the engine and the renderer has been initialized
     * @zh 引擎和渲染器是否以完成初始化
     */
    public get inited () {
        return this._inited;
    }

    /**
     * @en Expected frame rate of the game.
     * @zh 游戏的设定帧率。
     */
    public get frameRate () {
        return this._frameRate;
    }
    public set frameRate (frameRate: number | string) {
        if (typeof frameRate !== 'number') {
            frameRate = parseInt(frameRate, 10);
            if (Number.isNaN(frameRate)) {
                frameRate = 60;
            }
        }
        this._frameRate = frameRate;
        this.frameTime = 1000 / frameRate;
        this._pacer!.targetFrameRate = this._frameRate;
    }

    /**
     * @en The delta time since last frame, unit: s.
     * @zh 获取上一帧的增量时间，以秒为单位。
     */
    public get deltaTime () {
        return this._deltaTime;
    }

    /**
     * @en The total passed time since game start, unit: ms
     * @zh 获取从游戏开始到现在总共经过的时间，以毫秒为单位
     */
    public get totalTime () {
        return performance.now() - this._initTime;
    }

    /**
     * @en The start time of the current frame in milliseconds.
     * @zh 获取当前帧开始的时间（以 ms 为单位）。
     */
    public get frameStartTime () {
        return this._startTime;
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
    private _inited = false;
    private _engineInited = false; // whether the engine has inited
    private _rendererInitialized = false;
    private _paused = true;
    // frame control
    private _frameRate = 60;
    private _pacer: Pacer | null = null;
    private _initTime = 0;
    private _startTime = 0;
    private _deltaTime = 0.0;
    private _shouldLoadLaunchScene = true;

    public readonly onPreSettingsInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostSettingsInitDelegate: AsyncDelegate<(settings: Settings) => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPreBaseInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostBaseInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPrePALInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostPALInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPreInfrastructureInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostInfrastructureInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPreSubsystemInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostSubsystemInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPreProjectInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();
    public readonly onPostProjectInitDelegate: AsyncDelegate<() => (Promise<void> | void)> = new AsyncDelegate();

    // @Methods

    //  @Game play control

    /**
     * @en Set frame rate of game.
     * @zh 设置游戏帧率。
     * @deprecated since v3.3.0 please use [[game.frameRate]]
     */
    public setFrameRate (frameRate: number | string) {
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
    public step () {
        director.tick(this.frameTime / 1000);
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
    public pause () {
        if (this._paused) { return; }
        this._paused = true;
        this._pacer?.stop();
    }

    /**
     * @en Resume the game from pause. This will resume:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * @zh 恢复游戏主循环。包含：游戏逻辑，渲染，事件处理，背景音乐和所有音效。
     */
    public resume () {
        if (!this._paused) { return; }
        // @ts-expect-error _clearEvents is a private method.
        input._clearEvents();
        this._paused = false;
        this._pacer?.start();
    }

    /**
     * @en Check whether the game is paused.
     * @zh 判断游戏是否暂停。
     */
    public isPaused (): boolean {
        return this._paused;
    }

    /**
     * @en Restart game.
     * @zh 重新开始游戏
     */
    public restart (): Promise<void> {
        const endFramePromise = new Promise<void>((resolve) => { director.once(Director.EVENT_END_FRAME, () => resolve()); });
        return endFramePromise.then(() => {
            director.reset();
            legacyCC.profiler.reset();
            legacyCC.Object._deferredDestroy();
            this.pause();
            this.resume();
            this._safeEmit(Game.EVENT_RESTART);
        });
    }

    /**
     * @en End game, it will close the game window
     * @zh 退出游戏
     */
    public end () {
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
        if ((this._engineInited && type === Game.EVENT_ENGINE_INITED)
        || (this._inited && type === Game.EVENT_GAME_INITED)
        || (this._rendererInitialized && type === Game.EVENT_RENDERER_INITED)) {
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
        if (this._engineInited && type === Game.EVENT_ENGINE_INITED) {
            return callback.call(target);
        }
        return this.eventTargetOnce(type, callback, target);
    }

    /**
     * @en Init game with configuration object.
     * @zh 使用指定的配置初始化引擎。
     * @param config - Pass configuration object
     */
    public init (config: IGameConfig) {
        // DONT change the order unless you know what's you doing
        return Promise.resolve()
            .then(() => {
                this.emit(Game.EVENT_PRE_BASE_INIT);
                return this.onPreBaseInitDelegate.dispatch();
            })
            .then(() => {
                const debugMode = config.debugMode || debug.DebugMode.NONE;
                debug._resetDebugSetting(debugMode);
                sys.init();
                this._initEvents();
            })
            .then(() => {
                this.emit(Game.EVENT_POST_BASE_INIT);
                return this.onPostBaseInitDelegate.dispatch();
            })
            // settings initialization
            .then(() => {
                this.emit(Game.EVENT_PRE_SETTINGS_INIT);
                return this.onPreSettingsInitDelegate.dispatch();
            })
            .then(() => settings.init(config.settingsPath, config.overrideSettings))
            .then(() => {
                this.emit(Game.EVENT_POST_SETTINGS_INIT);
                return this.onPostSettingsInitDelegate.dispatch(settings);
            })
            // Infrastructure region
            .then(() => {
                this.emit(Game.EVENT_PRE_INFRASTRUCTURE_INIT);
                return this.onPreInfrastructureInitDelegate.dispatch();
            })
            .then(() => {
                macro.init();
                const adapter = findCanvas();
                if (adapter) {
                    this.canvas = adapter.canvas;
                    this.frame = adapter.frame;
                    this.container = adapter.container;
                }
                screen.init();
                garbageCollectionManager.init();
                deviceManager.init(this.canvas, bindingMappingInfo);
                //set max joints after device initialize.
                this._resizeMaxJointForDS();
                assetManager.init();
                builtinResMgr.init();
                Layers.init();
                this.initPacer();
            })
            .then(() => {
                this.emit(Game.EVENT_POST_INFRASTRUCTURE_INIT);
                return this.onPostInfrastructureInitDelegate.dispatch();
            })
            // Infrastructure region
            // Subsystem region
            .then(() => {
                this.emit(Game.EVENT_PRE_SUBSYSTEM_INIT);
                return this.onPreSubsystemInitDelegate.dispatch();
            })
            .then(() => director.init())
            .then(() => builtinResMgr.loadBuiltinAsset())
            .then(() => {
                this.emit(Game.EVENT_POST_SUBSYSTEM_INIT);
                return this.onPostSubsystemInitDelegate.dispatch();
            })
            .then(() => {
                debug.log(`Cocos Creator v${VERSION}`);
                this.emit(Game.EVENT_ENGINE_INITED);
                this._engineInited = true;
            })
            // Subsystem region
            // Project region
            .then(() => {
                this.emit(Game.EVENT_PRE_PROJECT_INIT);
                return this.onPreProjectInitDelegate.dispatch();
            })
            .then(() => {
                const jsList = settings.querySettings<string[]>(Settings.Category.SCRIPTING, 'jsList');
                let promise = Promise.resolve();
                if (jsList) {
                    jsList.forEach((jsListFile) => {
                        promise = promise.then(() => loadJsFile(`${PREVIEW ? 'plugins' : 'src'}/${jsListFile}`));
                    });
                }
                return promise;
            })
            .then(() => {
                const scriptPackages = settings.querySettings<string[]>(Settings.Category.SCRIPTING, 'scriptPackages');
                if (scriptPackages) {
                    return Promise.all(scriptPackages.map((pack) => import(pack)));
                }
            })
            .then(() => this._loadProjectBundles())
            .then(() => this._setupRenderPipeline())
            .then(() => this._loadPreloadAssets())
            .then(() => SplashScreen.instance.init())
            .then(() => {
                this.emit(Game.EVENT_POST_PROJECT_INIT);
                return this.onPostProjectInitDelegate.dispatch();
            })
            .then(() => {
                this._inited = true;
                this._safeEmit(Game.EVENT_GAME_INITED);
            });
        // Project region
    }

    _loadPreloadAssets () {
        const preloadAssets = settings.querySettings<string[]>(Settings.Category.ASSETS, 'preloadAssets');
        if (!preloadAssets) return Promise.resolve([]);
        return Promise.all(preloadAssets.map((uuid) => new Promise<void>((resolve, reject) => {
            assetManager.loadAny(uuid, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })));
    }

    _loadProjectBundles () {
        const preloadBundles = settings.querySettings<{ bundle: string, version: string }[]>(Settings.Category.ASSETS, 'preloadBundles');
        if (!preloadBundles) return Promise.resolve([]);
        return Promise.all(preloadBundles.map(({ bundle, version }) => new Promise<void>((resolve, reject) => {
            const opts: IBundleOptions = {};
            if (version) opts.version = version;
            assetManager.loadBundle(bundle, opts, (err) => {
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
    public run (onStart?: Game.OnStart) {
        if (onStart) {
            this.onStart = onStart;
        }
        if (!this._inited || (EDITOR && !legacyCC.GAME_VIEW)) {
            return;
        }
        this.resume();
    }

    // @Methods

    private _calculateDT () {
        const now = performance.now();
        this._deltaTime = now > this._startTime ? (now - this._startTime) / 1000 : 0;
        if (this._deltaTime > Game.DEBUG_DT_THRESHOLD) {
            this._deltaTime = this.frameTime / 1000;
        }
        this._startTime = now;
        return this._deltaTime;
    }

    private _updateCallback () {
        if (!this._inited) return;
        if (!SplashScreen.instance.isFinished) {
            SplashScreen.instance.update(this._calculateDT());
        } else if (this._shouldLoadLaunchScene) {
            this._shouldLoadLaunchScene = false;
            const launchScene = settings.querySettings(Settings.Category.LAUNCH, 'launchScene');
            if (launchScene) {
                // load scene
                director.loadScene(launchScene, () => {
                    console.log(`Success to load scene: ${launchScene}`);
                    this._initTime = performance.now();
                    director.startAnimation();
                    this.onStart?.();
                });
            } else {
                this._initTime = performance.now();
                director.startAnimation();
                this.onStart?.();
            }
        } else {
            director.tick(this._calculateDT());
        }
    }

    private initPacer () {
        const frameRate = settings.querySettings(Settings.Category.SCREEN, 'frameRate') ?? 60;
        assert(typeof frameRate === 'number');
        this._pacer = new Pacer();
        this._pacer.onTick = this._updateCallback.bind(this);
        this.frameRate = frameRate;
    }

    private _initEvents () {
        systemInfo.on('show', this._onShow, this);
        systemInfo.on('hide', this._onHide, this);
    }

    private _onHide () {
        this.emit(Game.EVENT_HIDE);
        this.pause();
    }

    private _onShow () {
        this.emit(Game.EVENT_SHOW);
        this.resume();
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
    public addPersistRootNode (node: Node) {
        director.addPersistRootNode(node);
    }

    /**
     * @en Remove a persistent root node.
     * @zh 取消常驻根节点。
     * @param node - The node to be removed from persistent node list
     * @deprecated Since v3.6.0, please use director.removePersistRootNode instead.
     */
    public removePersistRootNode (node: Node) {
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

    private _setupRenderPipeline () {
        const renderPipeline = settings.querySettings(Settings.Category.RENDERING, 'renderPipeline');
        if (!renderPipeline) {
            return this._setRenderPipeline();
        }
        return new Promise<RenderPipeline>((resolve, reject) => {
            assetManager.loadAny(renderPipeline, (err, asset) => ((err || !(asset instanceof RenderPipeline))
                ? reject(err)
                : resolve(asset)));
        }).then((asset) => {
            this._setRenderPipeline(asset);
        }).catch((reason) => {
            debug.warn(reason);
            debug.warn(`Failed load render pipeline: ${renderPipeline}, engine failed to initialize, will fallback to default pipeline`);
            this._setRenderPipeline();
        });
    }

    private _setRenderPipeline (rppl?: RenderPipeline) {
        if (!director.root!.setRenderPipeline(rppl)) {
            this._setRenderPipeline();
        }

        this._rendererInitialized = true;
        this._safeEmit(Game.EVENT_RENDERER_INITED);
    }

    private _safeEmit (event) {
        if (EDITOR) {
            try {
                this.emit(event);
            } catch (e) {
                debug.warn(e);
            }
        } else {
            this.emit(event);
        }
    }

    private _resizeMaxJointForDS () {
        let maxJoints = Math.floor((deviceManager.gfxDevice.capabilities.maxVertexUniformVectors - 38) / 3);
        maxJoints = maxJoints < 256 ? maxJoints : 256;
        localDescriptorSetLayout_ResizeMaxJoints(maxJoints);
    }
}

export declare namespace Game {
    export type OnStart = () => void;
}

legacyCC.Game = Game;

/**
 * @en
 * This is a Game instance.
 * @zh
 * 这是一个 Game 类的实例，包含游戏主体信息并负责驱动游戏的游戏对象。
 */
export const game = legacyCC.game = new Game();
