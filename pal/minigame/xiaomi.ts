import { IMiniGame } from 'pal/minigame';
import { Orientation } from '../system/enum-type/orientation';
import { cloneObject } from '../utils';

declare let qg: any;

// @ts-expect-error can't init minigame when it's declared
const minigame: IMiniGame = {};
cloneObject(minigame, qg);

const systemInfo = minigame.getSystemInfoSync();
minigame.isDevTool = false;

minigame.isLandscape = systemInfo.screenWidth > systemInfo.screenHeight;
// init landscapeOrientation as LANDSCAPE_RIGHT
let landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
qg.onDeviceOrientationChange((res) => {
    if (res.value === 'landscape') {
        landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
    } else if (res.value === 'landscapeReverse') {
        landscapeOrientation = Orientation.LANDSCAPE_LEFT;
    }
});
Object.defineProperty(minigame, 'orientation', {
    get() {
        return minigame.isLandscape ? landscapeOrientation : Orientation.PORTRAIT;
    },
});

// // TouchEvent
// globalAdapter.onTouchStart = function (cb) {
//     window.canvas.ontouchstart = cb;
// };
// globalAdapter.onTouchMove = function (cb) {
//     window.canvas.ontouchmove = cb;
// };
// globalAdapter.onTouchEnd = function (cb) {
//     window.canvas.ontouchend = cb;
// };
// globalAdapter.onTouchCancel = function (cb) {
//     window.canvas.ontouchcancel = cb;
// };

// // Keyboard
// globalAdapter.showKeyboard = function (res) {
//     res.confirmHold = true;  // HACK: confirmHold not working on Xiaomi platform
//     qg.showKeyboard(res);
// };

// Accelerometer
qg.onDeviceOrientationChange((res) => {
    if (res.value === 'landscape') {
        orientation = Orientation.LANDSCAPE_RIGHT;
    } else if (res.value === 'landscapeReverse') {
        orientation = Orientation.LANDSCAPE_LEFT;
    }
});

minigame.onAccelerometerChange = function (cb) {
    qg.onAccelerometerChange((res) => {
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
        cb(resClone);
    });
    // onAccelerometerChange would start accelerometer, need to mannually stop it
    qg.stopAccelerometer();
};

minigame.getSafeArea = function () {
    console.warn('getSafeArea is not supported on this platform');
    if (minigame.getSystemInfoSync) {
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
    return {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
    };
};

export { minigame };
