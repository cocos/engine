/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

import { removeProperty, replaceProperty } from '../utils';
import { Event } from '../event';
import { EventKeyboard, EventMouse, EventTouch, SystemEvent, SystemEventType } from './event-manager';
import { sys } from './sys';
import { View } from './view';

removeProperty(View.prototype, 'View.prototype', [
    {
        name: 'isAntiAliasEnabled',
        suggest: 'The API of Texture2d have been largely modified, no alternative',
    },
    {
        name: 'enableAntiAlias',
        suggest: 'The API of Texture2d have been largely modified, no alternative',
    },
]);

// deprecate Event property
replaceProperty(Event, 'Event', [
    {
        name: 'NO_TYPE',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
    {
        name: 'ACCELERATION',
        newName: 'DEVICEMOTION',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
    {
        name: 'TOUCH',
        customGetter () {
            return 'touch';
        },
    },
    {
        name: 'MOUSE',
        customGetter () {
            return 'mouse';
        },
    },
    {
        name: 'KEYBOARD',
        customGetter () {
            return 'keyboard';
        },
    },
]);

// depracate EventMouse property
replaceProperty(EventMouse, 'EventMouse',
    ['DOWN', 'UP', 'MOVE'].map((item) => ({
        name: item,
        newName: `MOUSE_${item}`,
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    })));
replaceProperty(EventMouse, 'EventMouse', [
    {
        name: 'SCROLL',
        newName: 'MOUSE_WHEEL',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);
replaceProperty(EventMouse.prototype, 'EventMouse.prototype', [
    {
        name: 'eventType',
        newName: 'type',
    },
]);

// depracate EventTouch property
replaceProperty(EventTouch, 'EventTouch', [
    {
        name: 'BEGAN',
        newName: 'TOUCH_START',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);
replaceProperty(EventTouch, 'EventTouch', [
    {
        name: 'MOVED',
        newName: 'TOUCH_MOVE',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);
replaceProperty(EventTouch, 'EventTouch', [
    {
        name: 'ENDED',
        newName: 'TOUCH_END',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);
replaceProperty(EventTouch, 'EventTouch', [
    {
        name: 'CANCELLED',
        newName: 'TOUCH_CANCEL',
        target: SystemEvent.EventType,
        targetName: 'SystemEvent.EventType',
    },
]);
replaceProperty(EventTouch.prototype, 'EventTouch.prototype', [
    {
        name: 'getEventCode',
        customFunction () {
            // @ts-expect-error this points to an EventTouch instance.
            return this.type as SystemEventType;
        },
    },
]);

// deprecated EventKeyboard property
replaceProperty(EventKeyboard.prototype, 'EventKeyboard.prototype', [
    {
        name: 'isPressed',
        suggest: 'use Event.prototype.type !== SystemEventType.KEYBOARD_UP instead',
        customGetter () {
            // @ts-expect-error this points to an EventKeyboard intance.
            return this.type !== SystemEventType.KEYBOARD_UP;
        },
    },
]);

// deprecate languageCode field
replaceProperty(sys, 'sys',
    ['UNKNOWN', 'ENGLISH', 'CHINESE', 'FRENCH', 'ITALIAN',
        'GERMAN', 'SPANISH', 'DUTCH', 'RUSSIAN', 'KOREAN',
        'JAPANESE', 'HUNGARIAN', 'PORTUGUESE', 'ARABIC', 'NORWEGIAN',
        'POLISH', 'TURKISH', 'UKRAINIAN', 'ROMANIAN', 'BULGARIAN'].map((item) => ({
        name: `LANGUAGE_${item}`,
        newName: item,
        target: sys.Language,
        targetName: 'sys.Language',
    })));

// deprecate os field
replaceProperty(sys, 'sys',
    ['UNKNOWN', 'IOS', 'ANDROID', 'WINDOWS', 'LINUX', 'OSX'].map((item) => ({
        name: `OS_${item}`,
        newName: item,
        target: sys.OS,
        targetName: 'sys.OS',
    })));

// deprecate browserType field
replaceProperty(sys, 'sys',
    ['UNKNOWN', 'WECHAT', 'ANDROID', 'IE', 'EDGE', 'QQ', 'MOBILE_QQ',
        'UC', 'UCBS', 'BAIDU_APP', 'BAIDU', 'MAXTHON', 'OPERA',
        'OUPENG', 'MIUI', 'FIREFOX', 'SAFARI', 'CHROME', 'LIEBAO',
        'QZONE', 'SOUGOU', 'HUAWEI'].map((item) => ({
        name: `BROWSER_TYPE_${item}`,
        newName: item,
        target: sys.BrowserType,
        targetName: 'sys.BrowserType',
    })));
replaceProperty(sys, 'sys', [
    {
        name: 'BROWSER_TYPE_360',
        newName: 'BROWSER_360',
        target: sys.BrowserType,
        targetName: 'sys.BrowserType',
    },
]);

// deprecate platform field
replaceProperty(sys, 'sys',
    ['UNKNOWN', 'EDITOR_PAGE', 'EDITOR_CORE', 'MOBILE_BROWSER', 'DESKTOP_BROWSER', 'WIN32', 'MACOS', 'IOS', 'ANDROID',
        'WECHAT_GAME', 'BAIDU_MINI_GAME', 'XIAOMI_QUICK_GAME', 'ALIPAY_MINI_GAME', 'BYTEDANCE_MINI_GAME',
        'OPPO_MINI_GAME', 'VIVO_MINI_GAME', 'HUAWEI_QUICK_GAME', 'COCOSPLAY',  'LINKSURE_MINI_GAME', 'QTT_MINI_GAME'].map((item) => ({
        name: item,
        target: sys.Platform,
        targetName: 'sys.Platform',
    })));

// remove platform field
replaceProperty(sys, 'sys', [
    {
        name: 'IPHONE',
        newName: 'IOS',
        target: sys.Platform,
        targetName: 'sys.Platform',
    },
    {
        name: 'IPAD',
        newName: 'IOS',
        target: sys.Platform,
        targetName: 'sys.Platform',
    },
]);
removeProperty(sys, 'sys',
    ['LINUX', 'BLACKBERRY', 'NACL', 'EMSCRIPTEN', 'TIZEN',
        'WINRT', 'WP8', 'QQ_PLAY', 'FB_PLAYABLE_ADS'].map((item) => ({
        name: item,
    })));

// deprecate KEY event
replaceProperty(SystemEventType, 'SystemEventType', [
    {
        name: 'KEY_DOWN',
        newName: 'KEYBOARD_DOWN',
        suggest: 'the KEY_DOWN event will be continuously dispatched in the key pressed state, it\'s not a good API design for developers.',
        customGetter () {
            return 'keydown';
        },
    },
    {
        name: 'KEY_UP',
        newName: 'KEYBOARD_UP',
        customGetter () {
            return 'keyup';
        },
    },
]);
