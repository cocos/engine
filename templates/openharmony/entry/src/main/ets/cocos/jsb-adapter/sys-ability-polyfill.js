/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/
import display from '@ohos.display';
import I18n from '@ohos.i18n';
import deviceInfo from '@ohos.deviceInfo';
import batteryInfo from '@ohos.batteryInfo';
import sensor from '@ohos.sensor';
import connection from '@ohos.net.connection'
import vibrator from '@ohos.vibrator';
import { ContextType } from "../common/Constants"
import cocos from "libcocos.so";

const systemUtils = cocos.getContext(ContextType.SYSTEM_UTILS);

let cutout = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
};

export function systemReady () {
    return new Promise(resolve => {
        if (typeof XMLHttpRequest === 'undefined') {
            window.XMLHttpRequest = function () {}
        }
        display.getDefaultDisplay((err, data) => {
            window.oh.display = data;
            // TODO: impl device in js.
            //https://developer.harmonyos.com/cn/docs/documentation/doc-references/js-apis-display-0000001281001106
        });
        resolve();
    })

}

window.getSystemLanguage = function () {
    return I18n.System.getSystemLanguage();
}

window.getOSFullName = function () {
    return deviceInfo.osFullName;
}

window.getDeviceModel = function () {
    return deviceInfo.productModel;
}

window.getBatteryLevel = function () {
    return batteryInfo.batterySOC;
}

window.getDPI = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.densityDPI;
}

window.getPixelRation = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.densityPixels;
}

let onDisplayChange = (data) => {
    // Monitor changes in screen orientation.
    systemUtils.onDisplayChange(window.getDeviceOrientation());

    // update screen cutout info
    window.initScreenInfo();
}

try {
    display.on("change", onDisplayChange);
} catch (exception) {
    console.log('Failed to register callback. Code: ' + JSON.stringify(exception));
}
window.getDeviceOrientation = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.rotation;
}

function radiansToDegrees(radians)  {
    var pi = Math.PI;
    return radians * (180/pi);
}

let sDeviceMotionValues = [];
try {
    sensor.on(sensor.SensorId.ACCELEROMETER, function (data) {
        sDeviceMotionValues[0] = data.x;
        sDeviceMotionValues[1] = data.y;
        sDeviceMotionValues[2] = -data.z;
    },
        { interval: 10000000000 }
    );
} catch (err) {
    sDeviceMotionValues[0] = 0;
    sDeviceMotionValues[1] = 0;
    sDeviceMotionValues[2] = 0;
}

try {
    sensor.on(sensor.SensorId.LINEAR_ACCELEROMETER, function(data){
        sDeviceMotionValues[3] = data.x;
        sDeviceMotionValues[4] = data.y;
        sDeviceMotionValues[5] = data.z;
    },
        {interval: 10000000000}
    );
} catch (err) {
    sDeviceMotionValues[3] = 0;
    sDeviceMotionValues[4] = 0;
    sDeviceMotionValues[5] = 0;
}
try {
    sensor.on(sensor.SensorId.GYROSCOPE, function(data){
        sDeviceMotionValues[6] = radiansToDegrees(data.x);
        sDeviceMotionValues[7] = radiansToDegrees(data.y);
        sDeviceMotionValues[8] = radiansToDegrees(data.z);
    },
        {interval: 10000000000}
    );
} catch (err) {
    sDeviceMotionValues[6] = 0;
    sDeviceMotionValues[7] = 0;
    sDeviceMotionValues[8] = 0;
}

window.getDeviceMotionValue = function () {
    return sDeviceMotionValues;
}

window.getNetworkType = function () {
    let netHandle = connection.getDefaultNetSync();
    if(netHandle && netHandle.netId != 0) {
        let result = connection.getNetCapabilitiesSync(netHandle);
        if (result && result.bearerTypes) {
            return result.bearerTypes[0];
        }
    }
    return -1;
}

window.vibrate = function (duration) {
    console.log('begin to vibrate, duration is.' + duration);
    try {
        vibrator.startVibration({
            type: 'time',
            duration: duration * 1000
        }, {
            id: 0,
            usage: 'alarm'
        }, (error) => {
            if (error) {
                console.error('vibrate fail, error.code: ' + error.code + 'error.message: ', + error.message);
                return error.code;
            }
            console.log('Vibration start sucessful.');
            return 0;
        });
      } catch (err) {
        console.error('errCode: ' + err.code + ' ,msg: ' + err.message);
      }
}

window.initScreenInfo = function () {
    display.getDefaultDisplaySync().getCutoutInfo().then((data) => {
        if (data.boundingRects.length == 0) {
            return;
        }

        cutout.left = data.boundingRects[0].left;
        cutout.top = data.boundingRects[0].top;
        cutout.width = data.boundingRects[0].width;
        cutout.height = data.boundingRects[0].height;
    }).catch((err) => {
        console.log("get cutout info error!");
    });
};
window.initScreenInfo();

window.getCutoutWidth = function () {
    if(!cutout.width) {
        return 0;
    }

    let disPlayWidth = display.getDefaultDisplaySync().width;
    if(cutout.left + cutout.width > disPlayWidth - cutout.left) {
        return disPlayWidth - cutout.left;
    }
    return cutout.left + cutout.width;
}

window.getCutoutHeight = function () {
    if(!cutout.height) {
        return 0;
    }

    let orientation = globalThis.getDeviceOrientation();
    if (orientation == display.Orientation.PORTRAIT) {
        return cutout.top + cutout.height;
    } else if(orientation == display.Orientation.PORTRAIT_INVERTED) {
        let displayHeight = display.getDefaultDisplaySync().height;
        return displayHeight - cutout.top;
    }
    return 0;
}