/****************************************************************************
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/

#include "platform/java/jni/JniHelper.h"
#if CC_PLATFORM == CC_PLATFORM_ANDROID
    #include <android/keycodes.h>
    #include <android/log.h>
#elif CC_PLATFORM == CC_PLATFORM_OHOS
    #include <hilog/log.h>
#endif

#include <jni.h>
#include "cocos/base/UTF8.h"
#include "engine/EngineEvents.h"
#include "platform/java/jni/glue/JniNativeGlue.h"
#include "platform/java/modules/SystemWindow.h"

#include "base/memory/Memory.h"
#include "base/std/container/string.h"
#include "cocos/platform/android/modules/google_play/billing/JniBillingHelper.h"
#include "cocos/platform/android/modules/google_play/billing/billing.h"

namespace cc {

}

extern "C" {

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onBillingSetupFinished(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onBillingSetupFinished(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onBillingServiceDisconnected(JNIEnv *env, jclass clazz) {
    cc::JniBillingHelper::onBillingServiceDisconnected(env, clazz);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onProductDetailsResponse(JNIEnv *env, jclass clazz,
                                                                                      jobject billingResultObj,
                                                                                      jobject productDetailsListObj) {
    cc::JniBillingHelper::onProductDetailsResponse(env, clazz, billingResultObj, productDetailsListObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onPurchasesUpdated(JNIEnv *env, jclass clazz,
                                                                                jobject billingResultObj,
                                                                                jobject purchaseListObj) {
    cc::JniBillingHelper::onPurchasesUpdated(env, clazz, billingResultObj, purchaseListObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onConsumeResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jstring purchaseToken) {
    cc::JniBillingHelper::onConsumeResponse(env, clazz, billingResultObj, purchaseToken);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onQueryPurchasesResponse(JNIEnv *env, jclass clazz, jobject billingResultObj,
                                                                                      jobject purchaseListObj) {
    cc::JniBillingHelper::onQueryPurchasesResponse(env, clazz, billingResultObj, purchaseListObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onAcknowledgePurchaseResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onAcknowledgePurchaseResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onBillingConfigResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject billingConfigObj) {
    cc::JniBillingHelper::onBillingConfigResponse(env, clazz, billingResultObj, billingConfigObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onAlternativeBillingOnlyTokenResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject alternativeBillingOnlyReportingDetailsObj) {
    cc::JniBillingHelper::onAlternativeBillingOnlyTokenResponse(env, clazz, billingResultObj, alternativeBillingOnlyReportingDetailsObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onExternalOfferReportingDetailsResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject externalOfferReportingDetailsObj) {
    cc::JniBillingHelper::onExternalOfferReportingDetailsResponse(env, clazz, billingResultObj, externalOfferReportingDetailsObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onAlternativeBillingOnlyAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onAlternativeBillingOnlyAvailabilityResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onExternalOfferAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onExternalOfferAvailabilityResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onAlternativeBillingOnlyInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onAlternativeBillingOnlyInformationDialogResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onExternalOfferInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::JniBillingHelper::onExternalOfferInformationDialogResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_com_cocos_lib_CocosBillingHelper_onInAppMessageResponse(JNIEnv *env, jclass clazz, jobject inAppMessageResultObj) {
    cc::JniBillingHelper::onInAppMessageResponse(env, clazz, inAppMessageResultObj);
}
}
