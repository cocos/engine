import { IMiniGame, SystemInfo } from 'pal/minigame';
import { Orientation } from '../screen-adapter/enum-type';
import { cloneObject } from '../utils';
import { Language } from '../system-info/enum-type';

//taobao IDE language   ("Chinese")
//taobao phone language (Andrond: "cn", iPad: 'zh_CN')
const languageMap: Record<string, Language> = {
    Chinese: Language.CHINESE,
    cn: Language.CHINESE,
    zh_CN: Language.CHINESE,
};

declare let my: any;

// @ts-expect-error can't init minigame when it's declared
const minigame: IMiniGame = {};
cloneObject(minigame, my);

// #region SystemInfo
const systemInfo = minigame.getSystemInfoSync();
systemInfo.language = languageMap[systemInfo.language] || systemInfo.language;
minigame.getSystemInfoSync = () => systemInfo;

minigame.isDevTool = my.isIDE;

minigame.isLandscape = systemInfo.screenWidth > systemInfo.screenHeight;
// init landscapeOrientation as LANDSCAPE_RIGHT
const landscapeOrientation = Orientation.LANDSCAPE_RIGHT;
// NOTE: onDeviceOrientationChange is not supported on this platform
// my.onDeviceOrientationChange((res) => {
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

// #region Audio
minigame.createInnerAudioContext = function (): InnerAudioContext {
    const audio: InnerAudioContext = my.createInnerAudioContext();
    // @ts-expect-error InnerAudioContext has onCanPlay
    audio.onCanplay = audio.onCanPlay.bind(audio);
    // @ts-expect-error InnerAudioContext has onCanPlay
    delete audio.onCanPlay;
    return audio;
};
// #region Audio

// #region Font
minigame.loadFont = function (url) {
    // my.loadFont crash when url is not in user data path
    return 'Arial';
};
// #endregion Font

// #region Accelerometer
let _accelerometerCb: AccelerometerChangeCallback | undefined;
minigame.onAccelerometerChange = function (cb: AccelerometerChangeCallback) {
    minigame.offAccelerometerChange();
    // onAccelerometerChange would start accelerometer
    // so we won't call this method here
    _accelerometerCb = (res: any) => {
        let x: number = res.x;
        let y: number = res.y;
        if (minigame.isLandscape) {
            const orientationFactor: number = (landscapeOrientation === Orientation.LANDSCAPE_RIGHT ? 1 : -1);
            x = -res.y * orientationFactor;
            y = res.x * orientationFactor;
        }

        const resClone = {
            x,
            y,
            z: res.z,
        };
        cb(resClone);
    };
};
minigame.offAccelerometerChange = function (cb?: AccelerometerChangeCallback) {
    if (_accelerometerCb) {
        my.offAccelerometerChange(_accelerometerCb);
        _accelerometerCb = undefined;
    }
};
minigame.startAccelerometer = function (res: any) {
    if (_accelerometerCb) {
        my.onAccelerometerChange(_accelerometerCb);
    } else {
        // my.startAccelerometer() is not implemented.
        console.error('minigame.onAccelerometerChange() should be invoked before minigame.startAccelerometer() on taobao platform');
    }
};
minigame.stopAccelerometer = function (res: any) {
    // my.stopAccelerometer() is not implemented.
    minigame.offAccelerometerChange();
};
// #endregion Accelerometer

// #region SafeArea
// It should be a value that is not multiplied by dpr
minigame.getSafeArea = function () {
    const systemInfo = minigame.getSystemInfoSync();
    if (typeof systemInfo.safeArea !== 'undefined') {
        return systemInfo.safeArea;
    }
    console.warn('getSafeArea is not supported on this platform');
    return {
        top: 0,
        left: 0,
        bottom: systemInfo.windowHeight,
        right: systemInfo.windowWidth,
        width: systemInfo.windowWidth,
        height: systemInfo.windowHeight,
    };
};
// #endregion SafeArea

// TODO: adapt GL.getUniformLocation
// Android return value: undefined.   iOS return value: {ID: -1}.
if (!my.isIDE && my.getSystemInfoSync().platform.toLocaleLowerCase() === 'ios') {
    // @ts-expect-error canvas defined in global
    const locCanvas = $global.screencanvas;
    if (locCanvas) {
        const webglRC = locCanvas.getContext('webgl');
        const originalGetUniformLocation = webglRC.getUniformLocation.bind(webglRC);
        webglRC.getUniformLocation = function (program, name) {
            const glLoc = originalGetUniformLocation(program, name);
            if (glLoc && glLoc.ID === -1) {
                return undefined;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return originalGetUniformLocation(program, name);
        };
    }
}

export { minigame };
