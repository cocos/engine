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

namespace cc {
class BillingResult;
class ProductDetails;
class Purchase;
class OneTimePurchaseOfferDetails;
class ProductDetailsInstallmentPlanDetails;
class PricingPhase;
class PricingPhases;
class SubscriptionOfferDetails;
class AccountIdentifiers;
class PendingPurchaseUpdate;
class BillingConfig;
class AlternativeBillingOnlyReportingDetails;
class ExternalOfferReportingDetails;
class InAppMessageResult;

class CC_DLL JniBillingHelper {
public:
    static void startConnection();
    static void endConnection();
    static int getConnectionState();
    static bool isReady();
    static void queryProductDetailsParams(const std::vector<std::string> &productIds, const std::string &type);

    static void launchBillingFlow(const std::vector<ProductDetails *> &productDetailsList, const std::string &selectedOfferToken);
    static void consumePurchases(const std::vector<Purchase *> &purchases);
    static void acknowledgePurchase(const std::vector<Purchase *> &purchases);
    static void queryPurchasesAsync(const std::string &productType);
    static void getBillingConfigAsync();

    static void createAlternativeBillingOnlyReportingDetailsAsync();
    static void isAlternativeBillingOnlyAvailableAsync();
    static void createExternalOfferReportingDetailsAsync();
    static void isExternalOfferAvailableAsync();
    static BillingResult *isFeatureSupported(const std::string &feature);

    static BillingResult *showAlternativeBillingOnlyInformationDialog();
    static BillingResult *showExternalOfferInformationDialog();
    static BillingResult *showInAppMessages();

    static void onBillingSetupFinished(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onBillingServiceDisconnected(JNIEnv *env, jclass clazz);
    static void onProductDetailsResponse(JNIEnv *env, jclass clazz,
                                         jobject billingResultObj,
                                         jobject productDetailsListObj);
    static void onPurchasesUpdated(JNIEnv *env, jclass clazz,
                                   jobject billingResultObj,
                                   jobject purchaseListObj);
    static void onConsumeResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jstring purchaseToken);
    static void onQueryPurchasesResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject purchaseListObj);
    static void onAcknowledgePurchaseResponse(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onBillingConfigResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject billingConfigObj);
    static void onAlternativeBillingOnlyTokenResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject alternativeBillingOnlyReportingDetailsObj);
    static void onExternalOfferReportingDetailsResponse(JNIEnv *env, jclass clazz, jobject billingResultObj, jobject externalOfferReportingDetailsObj);
    static void onAlternativeBillingOnlyAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onExternalOfferAvailabilityResponse(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onAlternativeBillingOnlyInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onExternalOfferInformationDialogResponse(JNIEnv *env, jclass clazz, jobject billingResultObj);
    static void onInAppMessageResponse(JNIEnv *env, jclass clazz, jobject inAppMessageResultObj);

private:
    static BillingResult *toBillingResult(JNIEnv *env, jobject obj);
    static std::vector<ProductDetails *> toProductDetailList(JNIEnv *env, jobject productsObj);
    static std::vector<Purchase *> toPurchaseList(JNIEnv *env, jobject productsObj);
    static BillingConfig *toBillingConfig(JNIEnv *env, jobject billingConfigObj);
    static AlternativeBillingOnlyReportingDetails *toAlternativeBillingOnlyReportingDetails(JNIEnv *env, jobject alternativeBillingOnlyReportingDetailsObj);
    static ExternalOfferReportingDetails *toExternalOfferReportingDetails(JNIEnv *env, jobject externalOfferReportingDetailsObj);
    static InAppMessageResult *toInAppMessageResult(JNIEnv *env, jobject inAppMessageResultObj);
    static ProductDetails *toProductDetail(JNIEnv *env, jobject productObj);
    static Purchase *toPurchase(JNIEnv *env, jobject purchaseObj);
    static OneTimePurchaseOfferDetails *toOneTimePurchaseOfferDetails(JNIEnv *env, jobject obj);
    static ProductDetailsInstallmentPlanDetails *toProductDetailsInstallmentPlanDetails(JNIEnv *env, jobject obj);
    static SubscriptionOfferDetails *toSubscriptionOfferDetails(JNIEnv *env, jobject obj);
    static AccountIdentifiers *toAccountIdentifiers(JNIEnv *env, jobject obj);
    static PendingPurchaseUpdate *toPendingPurchaseUpdate(JNIEnv *env, jobject obj);
    static PricingPhase *toPricingPhase(JNIEnv *env, jobject obj);
    static PricingPhases *toPricingPhases(JNIEnv* env, jobject obj);
    static BillingResult *callFunctionAndReturnBillingResult(const std::string &functionName);
};

} // namespace cc
