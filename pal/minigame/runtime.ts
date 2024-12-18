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

import { VIVO } from 'internal:constants';
import { SystemInfo, IMiniGame } from 'pal/minigame';
import { checkPalIntegrity, withImpl } from '../integrity-check';

import { Orientation } from '../screen-adapter/enum-type';
import { cloneObject, createInnerAudioContextPolyfill } from '../utils';

declare let ral: any;

const minigame: IMiniGame = {} as IMiniGame;
cloneObject(minigame, ral);
minigame.ral = ral;

// #region SystemInfo
const systemInfo = minigame.getSystemInfoSync();
minigame.isDevTool = (systemInfo.platform === 'devtools');

// NOTE: size and orientation info is wrong at the init phase, need to define as a getter
Object.defineProperty(minigame, 'isLandscape', {
    get () {
        if (VIVO) {
            return systemInfo.screenWidth > systemInfo.screenHeight;
        } else {
            const locSysInfo = minigame.getSystemInfoSync();
            return locSysInfo.screenWidth > locSysInfo.screenHeight;
        }
    },
});
// init landscapeOrientation as LANDSCAPE_RIGHT
const landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
// NOTE: onDeviceOrientationChange is not supported on this platform
// ral.onDeviceOrientationChange((res) => {
//     if (res.value === 'landscape') {
//         landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
//     } else if (res.value === 'landscapeReverse') {
//         landscapeOrientation = Orientation.LANDSCAPE_LEFT;
//     }
// });
Object.defineProperty(minigame, 'orientation', {
    get () {
        return minigame.isLandscape ? landscapeOrientation : Orientation.PORTRAIT;
    },
});

// #endregion SystemInfo

// #region Accelerometer
let _customAccelerometerCb: AccelerometerChangeCallback | undefined;
let _innerAccelerometerCb: AccelerometerChangeCallback | undefined;
let _needHandleAccelerometerCb = false;
minigame.onAccelerometerChange = function (cb): void {
    if (!_innerAccelerometerCb) {
        _innerAccelerometerCb = (res): void => {
            if (!_needHandleAccelerometerCb) {
                return;
            }
            let x = res.x;
            let y = res.y;
            if (minigame.isLandscape) {
                const orientationFactor = landscapeOrientation === Orientation.LANDSCAPE_RIGHT ? 1 : -1;
                const tmp = x;
                x = -y * orientationFactor;
                y = tmp * orientationFactor;
            }
            const resClone = {
                x,
                y,
                z: res.z,
            };
            _customAccelerometerCb?.(resClone);
        };
        ral.onAccelerometerChange(_innerAccelerometerCb);
    }
    _needHandleAccelerometerCb = true;
    _customAccelerometerCb = cb;
};
minigame.offAccelerometerChange = function (cb): void {
    _needHandleAccelerometerCb = false;
    _customAccelerometerCb = undefined;
};
// #endregion Accelerometer

minigame.createInnerAudioContext = createInnerAudioContextPolyfill(ral, {
    onPlay: true,  // polyfill for vivo
    onPause: true,
    onStop: true,
    onSeek: true,
});

// #region SafeArea
minigame.getSafeArea = function (): SafeArea {
    const locSystemInfo = ral.getSystemInfoSync() as SystemInfo;
    if (locSystemInfo.safeArea) {
        return locSystemInfo.safeArea;
    } else {
        console.warn('getSafeArea is not supported on this platform');
        const systemInfo =  minigame.getSystemInfoSync();
        return {
            top: 0,
            left: 0,
            bottom: systemInfo.screenHeight,
            right: systemInfo.screenWidth,
            width: systemInfo.screenWidth,
            height: systemInfo.screenHeight,
        };
    }
};
// #endregion SafeArea

export { minigame };

checkPalIntegrity<typeof import('pal/minigame')>(withImpl<typeof import('./runtime')>());
