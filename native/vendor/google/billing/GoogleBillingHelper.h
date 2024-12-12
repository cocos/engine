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

#pragma once

#include <jni.h>
#include <functional>
#include <map>

#include "base/Macros.h"
#include "vendor/google/billing/GoogleBilling.h"
namespace cc {
class BillingResult;
class ProductDetails;
class Purchase;
class OneTimePurchaseOfferDetails;
class InstallmentPlanDetails;
class PricingPhase;
class PricingPhases;
class SubscriptionOfferDetails;
class AccountIdentifiers;
class PendingPurchaseUpdate;
class BillingConfig;
class AlternativeBillingOnlyReportingDetails;
class ExternalOfferReportingDetails;
class InAppMessageResult;
class BillingFlowParams;
class ConsumeParams;
class AcknowledgePurchaseParams;

class CC_DLL GoogleBillingHelper {
public:
    static int createGoogleBilling(BillingClient::Builder* builder);
    static void removeGoogleBilling(int tag);
    static void removeProductDetails(int tag, int productDetailsID);
    static void removePurchase(int tag, int purchaseID);
    static void startConnection(int tag, int callbackID);
    static void endConnection(int tag);
    static int getConnectionState(int tag);
    static bool isReady(int tag);
    static void queryProductDetailsAsync(int tag, int callbackID, const std::vector<std::string> &productIds, const std::vector<std::string>& productTypes);

    static void launchBillingFlow(int tag, BillingFlowParams* params);
    static void consumeAsync(int tag, int callbackId, ConsumeParams* purchase);
    static void acknowledgePurchase(int tag, int callbackId, AcknowledgePurchaseParams* purchase);
    static void queryPurchasesAsync(int tag, int callbackId, const std::string &productType);
    static void getBillingConfigAsync(int tag, int callbackId);

    static void createAlternativeBillingOnlyReportingDetailsAsync(int tag, int callbackId);
    static void isAlternativeBillingOnlyAvailableAsync(int tag, int callbackId);
    static void createExternalOfferReportingDetailsAsync(int tag, int callbackId);
    static void isExternalOfferAvailableAsync(int tag, int callbackId);
    static BillingResult *isFeatureSupported(int tag, const std::string &feature);

    static BillingResult *showAlternativeBillingOnlyInformationDialog(int tag, int callbackId);
    static BillingResult *showExternalOfferInformationDialog(int tag, int callbackId);
    static BillingResult *showInAppMessages(int tag, int callbackId, const std::vector<int>& inAppMessageCategoryId);

    static void onBillingSetupFinished(JNIEnv *env, jclass clazz,  jint tag, jint callbackID, jobject billingResultObj);
    static void onBillingServiceDisconnected(JNIEnv *env, jclass clazz,  jint tag, jint callbackID);
    static void onProductDetailsResponse(JNIEnv *env, jclass clazz,  jint tag, jint callbackID,
                                         jobject billingResultObj,
                                         jobject productDetailsListObj,
                                         jint startID);
    static void onPurchasesUpdated(JNIEnv *env, jclass clazz,
                                   jint tag,
                                   jobject billingResultObj,
                                   jobject purchaseListObj,
                                   jint startID);
    static void onConsumeResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj, jstring purchaseToken);
    static void onQueryPurchasesResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj, jobject purchaseListObj, jint startID);
    static void onAcknowledgePurchaseResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
    static void onBillingConfigResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj, jobject billingConfigObj);
    static void onAlternativeBillingOnlyTokenResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj, jobject alternativeBillingOnlyReportingDetailsObj);
    static void onExternalOfferReportingDetailsResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj, jobject externalOfferReportingDetailsObj);
    static void onAlternativeBillingOnlyAvailabilityResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
    static void onExternalOfferAvailabilityResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
    static void onAlternativeBillingOnlyInformationDialogResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
    static void onExternalOfferInformationDialogResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
    static void onInAppMessageResponse(JNIEnv *env, jclass clazz, jint tag, jint callbackId, jobject inAppMessageResultObj);
    static void userSelectedAlternativeBilling(JNIEnv *env, jclass clazz, jint tag, jobject userChoiceDetailsObj);
private:
    static void responseOnlyWithBillingResult(const std::string& functionName, JNIEnv* env, jclass clazz, jint tag, jint callbackId, jobject billingResultObj);
private:

};

} // namespace cc
