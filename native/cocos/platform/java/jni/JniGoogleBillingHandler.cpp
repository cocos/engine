/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

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
#include <jni.h>
#include "vendor/google/billing/GoogleBillingHelper.h"

extern "C" {

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onBillingSetupFinished(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onBillingSetupFinished(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onBillingServiceDisconnected(JNIEnv *env, jclass clazz) {
    cc::GoogleBillingHelper::onBillingServiceDisconnected(env, clazz);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onProductDetailsResponse(JNIEnv *env, jclass clazz,
                                                                                      jobject billingResultObj,
                                                                                      jobject productDetailsListObj,
                                                                                      jint startID) {
    cc::GoogleBillingHelper::onProductDetailsResponse(env, clazz, billingResultObj, productDetailsListObj, startID);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onPurchasesUpdated(JNIEnv *env, jclass clazz,
                                                                                jobject billingResultObj,
                                                                                jobject purchaseListObj,
                                                                                jint startID) {
    cc::GoogleBillingHelper::onPurchasesUpdated(env, clazz, billingResultObj, purchaseListObj, startID);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onConsumeResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jstring purchaseToken) {
    cc::GoogleBillingHelper::onConsumeResponse(env, clazz, billingResultObj, purchaseToken);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onQueryPurchasesResponse(JNIEnv *env, jclass clazz, jobject billingResultObj,
                                                                                      jobject purchaseListObj, jint startID) {
    cc::GoogleBillingHelper::onQueryPurchasesResponse(env, clazz, billingResultObj, purchaseListObj, startID);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onAcknowledgePurchaseResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onAcknowledgePurchaseResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onBillingConfigResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject billingConfigObj) {
    cc::GoogleBillingHelper::onBillingConfigResponse(env, clazz, billingResultObj, billingConfigObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onAlternativeBillingOnlyTokenResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject alternativeBillingOnlyReportingDetailsObj) {
    cc::GoogleBillingHelper::onAlternativeBillingOnlyTokenResponse(env, clazz, billingResultObj, alternativeBillingOnlyReportingDetailsObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onExternalOfferReportingDetailsResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject externalOfferReportingDetailsObj) {
    cc::GoogleBillingHelper::onExternalOfferReportingDetailsResponse(env, clazz, billingResultObj, externalOfferReportingDetailsObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onAlternativeBillingOnlyAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onAlternativeBillingOnlyAvailabilityResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onExternalOfferAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onExternalOfferAvailabilityResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onAlternativeBillingOnlyInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onAlternativeBillingOnlyInformationDialogResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onExternalOfferInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj) {
    cc::GoogleBillingHelper::onExternalOfferInformationDialogResponse(env, clazz, billingResultObj);
}

// NOLINTNEXTLINE
JNIEXPORT void JNICALL Java_google_billing_GoogleBillingHelper_onInAppMessageResponse(JNIEnv *env, jclass clazz, jobject inAppMessageResultObj) {
    cc::GoogleBillingHelper::onInAppMessageResponse(env, clazz, inAppMessageResultObj);
}
}
