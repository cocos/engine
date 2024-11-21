/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

/* eslint-disable import/no-dynamic-require */
import { BAIDU, TAOBAO, TAOBAO_MINIGAME, WECHAT, WECHAT_MINI_PROGRAM, XIAOMI } from 'internal:constants';
import { checkPalIntegrity, withImpl } from '../../integrity-check';

declare const require: (path: string) => any;
declare const __baiduRequire: (path: string) => any;
declare const __wxRequire: (path: string) => any;
declare const __taobaoRequire: (path: string) => any;

export function findCanvas (): { frame: HTMLDivElement, container: HTMLDivElement, canvas: HTMLCanvasElement } {
    const container = document.createElement('div');
    return { frame: container, canvas: window.canvas, container };
}

export function loadJsFile (path: string): any {
    if (XIAOMI) {
        return require(`../../${path}`);
    }
    if (WECHAT || WECHAT_MINI_PROGRAM) {
        return __wxRequire(path);
    }
    if (TAOBAO_MINIGAME) {
        return globalThis.__taobaoRequire(path);
    }
    if (TAOBAO) {
        // NOTE: Taobao doesn't support dynamic require
        return undefined;
    }
    return require(`../${path}`);
}

checkPalIntegrity<typeof import('pal/env')>(withImpl<typeof import('./env')>());
