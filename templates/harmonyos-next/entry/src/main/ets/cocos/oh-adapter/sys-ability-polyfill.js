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
import connection from '@ohos.net.connection'
import vibrator from '@ohos.vibrator';
import process from '@ohos.process';
import { ContextType } from "../../common/Constants"
import cocos from "libcocos.so";

const displayUtils = cocos.getContext(ContextType.DISPLAY_UTILS);

let pro = new process.ProcessManager();
let cutout = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
};

globalThis.getSystemLanguage = function () {
    return I18n.System.getSystemLanguage();
}

globalThis.getOSFullName = function () {
    return deviceInfo.osFullName;
}

globalThis.getDeviceModel = function () {
    return deviceInfo.productModel;
}

globalThis.getBatteryLevel = function () {
    return batteryInfo.batterySOC;
}

globalThis.getDPI = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.densityDPI;
}

globalThis.getPixelRation = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.densityPixels;
}

let onDisplayChange = (data) => {
    // Monitor changes in screen orientation.
    displayUtils.onDisplayChange(globalThis.getDeviceOrientation());

    // update screen cutout info
    globalThis.initScreenInfo();
}

try {
    display.on("change", onDisplayChange);
} catch (exception) {
    console.log('Failed to register callback. Code: ' + JSON.stringify(exception));
}

globalThis.getDeviceOrientation = function () {
    var displayClass = display.getDefaultDisplaySync();
    return displayClass.rotation;
}

globalThis.getNetworkType = function () {
    let netHandle = connection.getDefaultNetSync();
    if(netHandle && netHandle.netId != 0) {
        let result = connection.getNetCapabilitiesSync(netHandle);
        if (result && result.bearerTypes) {
            return result.bearerTypes[0];
        }
    }
    return -1;
}

globalThis.vibrate = function (duration) {
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

globalThis.terminateProcess = function () {
    pro.exit(0);
}

globalThis.initScreenInfo = function () {
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
globalThis.initScreenInfo();

globalThis.getCutoutWidth = function () {
    if(!cutout.width) {
        return 0;
    }

    let disPlayWidth = display.getDefaultDisplaySync().width;
    if(cutout.left + cutout.width > disPlayWidth - cutout.left) {
        return disPlayWidth - cutout.left;
    }
    return cutout.left + cutout.width;
}

globalThis.getCutoutHeight = function () {
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
