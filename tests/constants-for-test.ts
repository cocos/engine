import { NativeCodeBundleMode } from "../cocos/misc/webassembly-support";

const _globalThis = typeof global === 'undefined' ? globalThis : global;
const _global = typeof window === 'undefined' ? _globalThis : window;

function defined (name: string) {
    return typeof _global[name] === 'object';
}

function tryDefineGlobal (name: string, value: boolean): boolean {
    if (typeof _global[name] === 'undefined') {
        return (_global[name] = value);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return _global[name];
    }
}

// No export to global required since we have already done here.
export const BUILD = tryDefineGlobal('CC_BUILD', false);
export const TEST = tryDefineGlobal('CC_TEST', true);
export const EDITOR = tryDefineGlobal('CC_EDITOR', false);
export const PREVIEW = tryDefineGlobal('CC_PREVIEW', !EDITOR);
export const DEV = tryDefineGlobal('CC_DEV', true); // (CC_EDITOR && !CC_BUILD) || CC_PREVIEW || CC_TEST
export const DEBUG = tryDefineGlobal('CC_DEBUG', true); // CC_DEV || Debug Build
export const JSB = tryDefineGlobal('CC_JSB', defined('jsb'));
export const NATIVE = JSB;
export const HTML5 = !(EDITOR && NATIVE);
// @ts-expect-error: 'wx' is wechat namespace.
export const WECHAT = tryDefineGlobal('CC_WECHAT', !!(defined('wx') && (wx.getSystemInfoSync || wx.getSharedCanvas)));
export const MINIGAME = tryDefineGlobal('CC_MINIGAME', false);
export const RUNTIME_BASED = tryDefineGlobal('CC_RUNTIME_BASED', false);
export const ALIPAY = tryDefineGlobal('CC_ALIPAY', false);
export const XIAOMI = tryDefineGlobal('CC_XIAOMI', false);
export const BYTEDANCE = tryDefineGlobal('CC_BYTEDANCE', false);
export const HUAWEI = tryDefineGlobal('CC_HUAWEI', false);
export const OPPO = tryDefineGlobal('CC_OPPO', false);
export const VIVO = tryDefineGlobal('CC_VIVO', false);
// @ts-expect-error: 'loadRuntime' exits only in runtime environment.
export const SUPPORT_JIT = tryDefineGlobal('CC_SUPPORT_JIT', (typeof loadRuntime === 'function'));
export const SERVER_MODE = false;
export const NATIVE_CODE_BUNDLE_MODE = NativeCodeBundleMode.WASM;
