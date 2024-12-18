/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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
import { HTML5, NATIVE, TAOBAO, TAOBAO_MINIGAME } from 'internal:constants';
import { legacyCC } from './global-exports';

declare const fsUtils: any;
declare const require: (path: string) =>  Promise<void>;

/**
 * @zh
 * Settings 中的默认分组，通常与模块一一对应。
 *
 * @en
 * The default grouping in Settings, which usually corresponds to the module.
 */
export enum SettingsCategory {
    PATH = 'path',
    ENGINE = 'engine',
    ASSETS = 'assets',
    SCRIPTING = 'scripting',
    PHYSICS = 'physics',
    RENDERING = 'rendering',
    LAUNCH = 'launch',
    SCREEN = 'screen',
    SPLASH_SCREEN = 'splashScreen',
    ANIMATION = 'animation',
    PROFILING = 'profiling',
    PLUGINS = 'plugins',
    XR = 'xr',
}

/**
 * @zh
 * 配置模块用于获取 settings.json 配置文件中的配置信息，同时你可以覆盖一些配置从而影响引擎的启动和运行，可参考 [game.init] 的参数选项说明。你可以通过 [settings] 访问此模块单例。
 * @en
 * The Settings module is used to get the configuration information in the settings.json configuration file,
 * and you can override some of the configuration to affect the launch and running of the engine, as described in the [game.init] parameter options.
 * You can access this single instance of the module via [settings].
 */
export class Settings {
    static Category = SettingsCategory;

    /**
     * Initialization
     * @internal
     */
    init (path = '', overrides: Record<string, any> = {}): Promise<void> {
        for (const categoryName in overrides) {
            const category = overrides[categoryName];
            if (category) {
                for (const name in category) {
                    this.overrideSettings(categoryName, name, category[name]);
                }
            }
        }
        if (!path) return Promise.resolve();

        if (NATIVE) {
            if (window.oh && window.scriptEngineType === 'napi') {
                return new Promise((resolve, reject): void => {
                    // TODO: to support a virtual module of settings.
                    // For now, we use a system module context to dynamically import the relative path of module.
                    const settingsModule = '../settings.js';
                    import(settingsModule).then((res): void => {
                        this._settings = res.default;
                        resolve();
                    }).catch((e): void => reject(e));
                });
            }
        }
        return new Promise((resolve, reject): void => {
            if (!HTML5 && !path.startsWith('http')) {
                // TODO: readJsonSync not working on Taobao IDE
                if (TAOBAO || TAOBAO_MINIGAME) {
                    globalThis.fsUtils.readJson(path, (err, result): void => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        this._settings = result;
                        resolve();
                    });
                } else {
                    const result = fsUtils.readJsonSync(path);
                    if (result instanceof Error) {
                        reject(result);
                    } else {
                        this._settings = result;
                        resolve();
                    }
                }
            } else {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', path);
                xhr.responseType = 'text';
                xhr.onload = (): void => {
                    this._settings = JSON.parse(xhr.response as string);
                    resolve();
                };
                xhr.onerror = (): void => {
                    reject(new Error('request settings failed!'));
                };
                xhr.send(null);
            }
        });
    }

    /**
     * @zh
     * 覆盖一部分配置数据。
     *
     * @en
     * Override some configuration info in Settings module.
     *
     * @param category @en The category you want to override. @zh 想要覆盖的分组。
     * @param name @en The name of the configuration in the category you want to override. @zh 分组中想要覆盖的具体配置名称。
     * @param value @en The value of the configuration you want to override. @zh 想要覆盖的具体值。
     *
     * @example
     * ```ts
     * console.log(settings.querySettings(SettingsCategory.ASSETS, 'server')); // print https://www.cocos.com
     * settings.overrideSettings(SettingsCategory.ASSETS, 'server', 'http://www.test.com');
     * console.log(settings.querySettings(SettingsCategory.ASSETS, 'server')); // print http://www.test.com
     * ```
     */
    overrideSettings<T = any> (category: SettingsCategory | string, name: string, value: T): void {
        if (!(category in this._override)) {
            this._override[category] = {};
        }
        this._override[category][name] = value;
    }

    /**
     * @zh
     * 查询配置模块中具体分组中的具体配置值。
     *
     * @en
     * Query specific configuration values in specific category in the settings module.
     *
     * @param category @en The name of category to query. @zh 想要查询的分组名称。
     * @param name @en The name of configuration in category to query. @zh 分组中想要查询的具体的配置名称。
     * @returns @en The value of configuration to query. @zh 想要查询的具体配置值。
     *
     * @example
     * ```ts
     * console.log(settings.querySettings(SettingsCategory.ENGINE, 'debug')); // print false
     * ```
     */
    querySettings<T = any> (category: SettingsCategory | string, name: string): T | null {
        if (category in this._override) {
            const categorySettings = this._override[category];
            if (categorySettings && name in categorySettings) {
                return categorySettings[name] as T;
            }
        }
        if (category in this._settings) {
            const categorySettings = this._settings[category];
            if (categorySettings && name in categorySettings) {
                return categorySettings[name] as T;
            }
        }
        return null;
    }

    private _settings: Record<string, any> = {};
    private _override: Record<string, any> = {};
}

export declare namespace Settings {
    export type Category = typeof SettingsCategory;
}

/**
 * @zh
 * Settings 模块单例，你能通过此单例访问 settings.json 中的配置数据。
 * @en
 * Settings module singleton, through this you can access the configuration data in settings.json.
 */
export const settings = new Settings();
legacyCC.settings = settings;
