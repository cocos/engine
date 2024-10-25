/*
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

import { DEV, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';

const _global = typeof window === 'undefined' ? global : window;

/**
 * @en
 * The main namespace of Cocos engine, all engine core classes, functions, properties and constants are defined in this namespace.
 * @zh
 * Cocos引擎的主要命名空间，引擎代码中所有的类，函数，属性和常量都在这个命名空间中定义。
 * @deprecated
 */
export const legacyCC: Record<string, any> & {
    _global: typeof globalThis;
} = {
    _global,
};

// For internal usage
legacyCC.internal = {};

if (DEV) {
    legacyCC._Test = {};
}

const engineVersion = '3.8.3';

/**
 * @en
 * The current version of Cocos engine.
 * Please DO NOT remove this String, it is an important flag for bug tracking.
 * If you post a bug to forum, please attach this flag.
 * @zh
 * 当前使用的 Cocos 引擎版本。
 * 请不要删除此字符串，它是错误跟踪的重要标志。
 * 如果您将错误发布到论坛，请附上此标志。
 */
_global.CocosEngine = legacyCC.ENGINE_VERSION = engineVersion;

_global.cc = legacyCC;

export { engineVersion as VERSION };

if (EDITOR_NOT_IN_PREVIEW === undefined) {
    // Used to indicate whether it is currently in preview mode.
    // 'isPreviewProcess' is defined only in the editor's process.
    legacyCC.GAME_VIEW = typeof globalThis.isPreviewProcess !== 'undefined' ? globalThis.isPreviewProcess : false;
}

const ccwindow: typeof window = typeof globalThis.jsb !== 'undefined' ? (typeof jsb.window !== 'undefined' ? jsb.window : globalThis) : globalThis;
_global.ccwindow = ccwindow;

/**
 * @en
 * It is jsb.window in native mode, otherwise it is the window object in the web context.
 * @zh
 * 原生环境下为 jsb.window, 引擎为模拟部分 web 环境所提供. Web 环境这个变量是 window 对象。
 */
export { ccwindow };
