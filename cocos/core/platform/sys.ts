/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { BYTEDANCE, WECHAT, WECHAT_MINI_PROGRAM } from 'internal:constants';

import { systemInfo } from 'pal/system-info';
import { screenAdapter } from 'pal/screen-adapter';
import { legacyCC } from '../global-exports';
import { Rect } from '../math/rect';
import { Vec2 } from '../math/vec2';
import { warnID, log } from './debug';
import { NetworkType, Language, OS, Platform, BrowserType, Feature } from '../../../pal/system-info/enum-type';
import { screen } from './screen';
import { macro } from './macro';
import type { View } from '../../ui/view';

// TODO: the type Storage conflicts with the one on OH platform.
type Storage = any;

export declare namespace sys {
    /**
     * @en
     * Platform related feature enum type.
     * @zh
     * 平台相关的特性枚举类型。
     */
    export type Feature = EnumAlias<typeof Feature>;
}

/**
 * @en A set of system related variables.
 * @zh 一系列系统相关环境变量。
 */
export const sys = {
    Feature,

    /**
     * @en
     * Returns if the specified platform related feature is supported.
     * @zh
     * 返回指定的平台相关的特性是否支持。
     * @param feature @zh 系统的特性。 @en Feature of the system.
     */
    hasFeature (feature: sys.Feature): boolean {
        return systemInfo.hasFeature(feature);
    },

    /**
     * @en
     * Network type enumeration.
     * @zh
     * 网络类型枚举。
     */
    NetworkType,

    /**
     * @en
     * LanguageCode type enumeration.
     * @zh
     * 语言码类型枚举。
     */
    Language,

    /**
     * @en
     * OS type enumeration.
     * @zh
     * 操作系统类型枚举。
     */
    OS,

    /**
     * @en
     * Platform type enumeration.
     * @zh
     * 平台类型枚举。
     */
    Platform,

    /**
     * @en
     * Browser type enumeration.
     * @zh
     * 浏览器类型枚举。
     */
    BrowserType,

    /**
     * @en Whether the running platform is native app.
     * @zh 指示运行平台是否是原生平台。
     */
    isNative: systemInfo.isNative,

    /**
     * @en Whether the running platform is browser.
     * @zh 指示运行平台是否是浏览器。
     */
    isBrowser: systemInfo.isBrowser,

    /**
     * @en Indicate whether the current running context is a mobile system.
     * @zh 指示当前运行平台是否是移动端平台。
     */
    isMobile: systemInfo.isMobile,

    /**
     * @en Whether the endianness of current platform is little endian.
     * @zh 当前平台字节顺序是否是小端序。
     */
    isLittleEndian: systemInfo.isLittleEndian,

    /**
     * @en The running platform.
     * @zh 当前运行平台或环境。
     */
    platform: systemInfo.platform,

    /**
     * @en Indicate the current language of the running system.
     * @zh 指示当前运行环境的语言。
     */
    language: systemInfo.language,

    /**
     * @en
     * Get current language iso 639-1 code.
     * Examples of valid language codes include "zh-tw", "en", "en-us", "fr", "fr-fr", "es-es", etc.
     * The actual value totally depends on results provided by destination platform.
     * @zh
     * 指示当前运行环境的语言
     * 获取当前的语言iso 639-1代码。
     * 有效的语言代码包括 "zh-tw"、"en"、"en-us"、"fr"、"fr-fr"、"es-es "等。
     * 实际值完全取决于目的地平台提供的结果。
     */
    languageCode: systemInfo.nativeLanguage,

    /**
     * @en Indicate the running os name.
     * @zh 指示当前运行系统。
     */
    os: systemInfo.os,

    /**
     * @en Indicate the running os version string.
     * @zh 指示当前运行系统版本字符串。
     */
    osVersion: systemInfo.osVersion,

    /**
     * @en Indicate the running os main version.
     * @zh 指示当前系统主版本。
     */
    osMainVersion: systemInfo.osMainVersion,

    /**
     * @en Indicate the running browser type.
     * @zh 指示当前运行的浏览器类型。
     */
    browserType: systemInfo.browserType,

    /**
     * @en Indicate the running browser version.
     * @zh 指示当前运行的浏览器版本。
     */
    browserVersion: systemInfo.browserVersion,

    /**
     * @en Whether the running platform is xr app.
     * @zh 指示运行平台是否是XR平台。
     */
    isXR: systemInfo.isXR,

    /**
     * @en Indicate the real pixel resolution of the whole game window.
     * @zh 指示游戏窗口的像素分辨率。
     *
     * @deprecated since v3.4.0, please use screen.windowSize instead.
     */
    windowPixelResolution: screen.windowSize,

    /**
     * @en The capabilities of the current platform.
     * @zh 当前平台的功能可用性。
     *
     * @deprecated since v3.4.0, please use sys.hasFeature() instead.
     */
    capabilities: {
        canvas: true,
        opengl: true,
        webp: systemInfo.hasFeature(Feature.WEBP),
        imageBitmap: systemInfo.hasFeature(Feature.IMAGE_BITMAP),
        touches: systemInfo.hasFeature(Feature.INPUT_TOUCH),
        mouse: systemInfo.hasFeature(Feature.EVENT_MOUSE),
        keyboard: systemInfo.hasFeature(Feature.EVENT_KEYBOARD),
        accelerometer: systemInfo.hasFeature(Feature.EVENT_ACCELEROMETER),
    },

    /**
     * @en It is a local storage component based on HTML5 localStorage API, on web platform, it's equal to window.localStorage.
     * @zh HTML5 标准中的 localStorage 的本地存储功能，在 Web 端等价于 window.localStorage。
     */
    localStorage: {} as Storage,

    /**
     * @en Get the network type of current device, return `sys.NetworkType.LAN` if failure.
     * @zh 获取当前设备的网络类型, 如果网络类型无法获取，默认将返回 `sys.NetworkType.LAN`。
     * @return @zh 返回 LAN 或 WWAN。 @en LAN or WWAN.
     */
    getNetworkType (): NetworkType {
        return systemInfo.networkType;
    },

    /**
     * @en Get the battery level of current device, return 1.0 if failure.
     * @zh 获取当前设备的电池电量，如果电量无法获取，默认将返回 1。
     * @return - 0.0 ~ 1.0
     */
    getBatteryLevel (): number {
        return systemInfo.getBatteryLevel();
    },

    /**
     * @en Forces the garbage collection, only available in native platforms.
     * @zh 强制进行 JS 内存垃圾回收，尽在原生平台有效。
     */
    garbageCollect (): void {
        systemInfo.triggerGC();
    },

    /**
     * @en Check whether an object is valid,
     * In web engine, it will return true if the object exist
     * In native engine, it will return true if the JS object and the correspond native object are both valid
     * @zh 检查一个对象是否非空或在原生平台有效，
     * 在 Web 平台，只要对象非空或非 Undefined 就会返回 true，在原生平台，我们会检查当前 JS 对象和其绑定的原生对象是否都有效。
     * @param obj @zh 校验的对象。@en The object to be checked.
     */
    isObjectValid (obj: any): boolean {
        if (obj === null || obj === undefined) {
            return false;
        }

        return true;
    },

    /**
     * @engineInternal
     * @mangle
     */
    __isWebIOS14OrIPadOS14Env: false,

    /**
     * @en Dump systemInfo informations.
     * @zh 在控制台打印当前的主要系统信息。
     */
    dump (): void {
        let str = '';
        str += `isMobile : ${this.isMobile}\r\n`;
        str += `language : ${this.language}\r\n`;
        str += `browserType : ${this.browserType}\r\n`;
        str += `browserVersion : ${this.browserVersion}\r\n`;
        str += `supports webp: ${sys.hasFeature(Feature.WEBP)}\r\n`;
        str += `supports bitmap: ${sys.hasFeature(Feature.IMAGE_BITMAP)}\r\n`;
        str += `supports touches: ${sys.hasFeature(Feature.INPUT_TOUCH)}\r\n`;
        str += `supports mouse: ${sys.hasFeature(Feature.EVENT_MOUSE)}\r\n`;
        str += `supports keyboard: ${sys.hasFeature(Feature.EVENT_KEYBOARD)}\r\n`;
        str += `supports accelerometer: ${sys.hasFeature(Feature.EVENT_ACCELEROMETER)}\r\n`;
        str += `os : ${this.os}\r\n`;
        str += `osVersion : ${this.osVersion}\r\n`;
        str += `platform : ${this.platform}\r\n`;
        str += `Using ${legacyCC.game.renderType === legacyCC.game.RENDER_TYPE_WEBGL ? 'WEBGL' : 'CANVAS'} renderer.\r\n`;
        log(str);
    },

    /**
     * @en Try to open a url in browser, may not work in some platforms.
     * @zh 尝试打开一个 web 页面，并非在所有平台都有效。
     * @param url @zh 访问的链接。 @en Visited links.
     */
    openURL (url: string): void {
        systemInfo.openURL(url);
    },

    /**
     * @engineInternal
     */
    init (): Promise<void> {
        return Promise.resolve()
            .then((): any => systemInfo.init())
            .then((): void => {
                try {
                    let localStorage: Storage = sys.localStorage = window.localStorage;
                    localStorage.setItem('storage', '');
                    localStorage.removeItem('storage');
                    localStorage = null;
                } catch (e) {
                    const warn = function warn (...args: any): any {
                        warnID(5200);
                    };
                    this.localStorage = {
                        getItem: warn,
                        setItem: warn,
                        clear: warn,
                        removeItem: warn,
                        key: warn,
                        length: 0,
                    };
                }

                if (WECHAT || WECHAT_MINI_PROGRAM || BYTEDANCE) {
                    this.__isWebIOS14OrIPadOS14Env = (sys.os === OS.IOS || sys.os === OS.OSX) && GameGlobal?.isIOSHighPerformanceMode
            && /(OS 1((4\.[0-9])|(5\.[0-3])))|(Version\/1((4\.[0-9])|(5\.[0-3])))/.test(window.navigator.userAgent);
                } else {
                    this.__isWebIOS14OrIPadOS14Env = (sys.os === OS.IOS || sys.os === OS.OSX) && systemInfo.isBrowser
            && /(OS 14)|(Version\/14)/.test(window.navigator.userAgent);
                }
            });
    },

    /**
     * @en Get the current time in milliseconds.
     * @zh 获取当前时间（毫秒为单位）。
     */
    now (): number {
        return systemInfo.now();
    },

    /**
     * @en Restart the JS VM, only available in native platforms.
     * @zh 重启JS虚拟机，仅仅在原生平台有效。
     * @private
     */
    restartVM (): void {
        systemInfo.restartJSVM();
    },

    /**
     * @en
     * Returns the safe area of the screen (in design resolution) based on the game view coordinate system.
     * If the screen is not notched, this method returns a Rect of the same size as visibleSize by default.
     * Currently supports Android, iOS and WeChat, ByteDance Mini Game platform.
     * @zh
     * 返回基于游戏视图坐标系的手机屏幕安全区域（设计分辨率为单位），如果不是异形屏将默认返回一个和 visibleSize 一样大的 Rect。
     * 目前支持安卓、iOS 原生平台和微信、字节小游戏平台。
     * @method getSafeAreaRect
     * @param [symmetric=true] @zh 基于屏幕对称的 Rect。 @en Rect that is symmetric based on the screen.
     * @return {Rect}
     */
    getSafeAreaRect (symmetric: boolean = true): Rect {
        const locView: View = legacyCC.view;
        const edge = screenAdapter.safeAreaEdge;
        if (symmetric) {
            if (screenAdapter.orientation === macro.ORIENTATION_PORTRAIT) {
                if (edge.top < edge.bottom) {
                    edge.top = edge.bottom;
                } else {
                    edge.bottom = edge.top;
                }
            } else if (edge.left < edge.right) {
                edge.left = edge.right;
            } else {
                edge.right = edge.left;
            }
        }
        const windowSize = screenAdapter.windowSize;

        // Get leftBottom and rightTop point in screen coordinates system.
        const leftBottom = new Vec2(edge.left, edge.bottom);
        const rightTop = new Vec2(windowSize.width - edge.right, windowSize.height - edge.top);

        // Convert view point to UI coordinate system.
        locView._convertToUISpace(leftBottom);
        locView._convertToUISpace(rightTop);

        const x = leftBottom.x;
        const y = leftBottom.y;
        const width = rightTop.x - leftBottom.x;
        const height = rightTop.y - leftBottom.y;
        return new Rect(x, y, width, height);
    },
};

legacyCC.sys = sys;
