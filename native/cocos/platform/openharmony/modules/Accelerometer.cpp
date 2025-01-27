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

#include "platform/openharmony/modules/Accelerometer.h"
#include "sensors/oh_sensor.h"

namespace cc {
constexpr Sensor_Type SENSOR_ID[]{SENSOR_TYPE_ACCELEROMETER, SENSOR_TYPE_LINEAR_ACCELERATION, SENSOR_TYPE_GYROSCOPE};
int64_t sensorSamplePeriod = 200000000;
constexpr int64_t INVALID_VALUE = -1;

Sensor_Subscriber *g_user[3] = {nullptr, nullptr, nullptr};
Sensor_SubscriptionId *g_id[3] = {nullptr, nullptr, nullptr};
Sensor_SubscriptionAttribute *g_attr[3] = {nullptr, nullptr, nullptr};

static IAccelerometer::MotionValue motionValue;

float radiansToDegrees(float radians) {
    const float pi = M_PI;
    return radians * (180.0 / pi);
}

void SensorDataCallbackImpl(Sensor_Event *event) {
    if (event == nullptr) {
        CC_LOG_WARNING("event is null");
        return;
    }
    int64_t timestamp = INVALID_VALUE;
    int32_t ret = OH_SensorEvent_GetTimestamp(event, &timestamp);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    Sensor_Type sensorType;
    ret = OH_SensorEvent_GetType(event, &sensorType);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    Sensor_Accuracy accuracy = SENSOR_ACCURACY_UNRELIABLE;
    ret = OH_SensorEvent_GetAccuracy(event, &accuracy);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    float *data = nullptr;
    uint32_t length = 0;
    ret = OH_SensorEvent_GetData(event, &data, &length);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    switch (sensorType) {
    case SENSOR_TYPE_ACCELEROMETER:
        motionValue.accelerationIncludingGravityX = data[0];
        motionValue.accelerationIncludingGravityY = data[1];
        motionValue.accelerationIncludingGravityZ = -data[2];
        break;
    case SENSOR_TYPE_LINEAR_ACCELERATION:
        motionValue.accelerationX = data[0];
        motionValue.accelerationY = data[1];
        motionValue.accelerationZ = data[2];
        break;
    case SENSOR_TYPE_GYROSCOPE:
        motionValue.rotationRateAlpha = radiansToDegrees(data[0]);
        motionValue.rotationRateBeta = radiansToDegrees(data[1]);
        motionValue.rotationRateGamma = radiansToDegrees(data[2]);
        break;
    }
}

static void enableSensor(int index) {
    Sensor_Subscriber *gUser = OH_Sensor_CreateSubscriber();
    int32_t ret = OH_SensorSubscriber_SetCallback(gUser, SensorDataCallbackImpl);
    if (ret != SENSOR_SUCCESS) {
        return;
    }

    Sensor_SubscriptionId *id = OH_Sensor_CreateSubscriptionId();
    ret = OH_SensorSubscriptionId_SetType(id, SENSOR_ID[index]);
    if (ret != SENSOR_SUCCESS) {
        return;
    }

    Sensor_SubscriptionAttribute *attr = OH_Sensor_CreateSubscriptionAttribute();
    ret = OH_SensorSubscriptionAttribute_SetSamplingInterval(attr, sensorSamplePeriod);
    if (ret != SENSOR_SUCCESS) {
        return;
    }

    ret = OH_Sensor_Subscribe(id, attr, gUser);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    g_user[index] = gUser;
    g_id[index] = id;
    g_attr[index] = attr;

    CC_LOG_INFO("Subscriber successful");
}

static void disableSensor(int index) {
    int32_t ret = -1;
    Sensor_SubscriptionId *it = g_id[index];
    Sensor_SubscriptionAttribute *at = g_attr[index];
    Sensor_Subscriber *gUser = g_user[index];

    if(it == nullptr || at == nullptr || gUser == nullptr) {
        return;
    }
    ret = OH_Sensor_Unsubscribe(it, gUser);
    if (ret != SENSOR_SUCCESS) {
        return;
    }
    if (it != nullptr) {
        OH_Sensor_DestroySubscriptionId(it);
    }
    if (at != nullptr) {
        OH_Sensor_DestroySubscriptionAttribute(at);
    }
    if (gUser != nullptr) {
        OH_Sensor_DestroySubscriber(gUser);
        gUser = nullptr;
    }
}

void Accelerometer::setAccelerometerEnabled(bool isEnabled) {
    constexpr int length = sizeof(SENSOR_ID) / sizeof(SENSOR_ID[0]);
    if (isEnabled) {
        for (uint32_t i = 0; i < length; i++) {
            disableSensor(i);
        }
        for (uint32_t i = 0; i < length; i++) {
            enableSensor(i);
        }
    } else {
        for (uint32_t i = 0; i < length; i++) {
            disableSensor(i);
        }
    }
}

void Accelerometer::setAccelerometerInterval(float interval) {
    sensorSamplePeriod = static_cast<int64_t>(interval * 1000 * 1000 * 1000);
    setAccelerometerEnabled(true);
}

const Accelerometer::MotionValue &Accelerometer::getDeviceMotionValue() {
    return motionValue;
}

} // namespace cc
