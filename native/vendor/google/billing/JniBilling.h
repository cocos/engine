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
#include "vendor/google/billing/result-values/AccountIdentifiers.h"
#include "vendor/google/billing/result-values/AlternativeBillingOnlyReportingDetails.h"
#include "vendor/google/billing/result-values/BillingConfig.h"
#include "vendor/google/billing/result-values/BillingResult.h"
#include "vendor/google/billing/result-values/ExternalOfferReportingDetails.h"
#include "vendor/google/billing/result-values/InAppMessageResult.h"
#include "vendor/google/billing/result-values/Purchase.h"
#include "vendor/google/billing/result-values/ProductDetails.h"
#include "vendor/google/billing/result-values/UserChoiceDetails.h"
#include "vendor/google/billing/build-params/BillingFlowParams.h"

namespace cc {

class CC_DLL JniBilling {
public:
    static BillingResult *toBillingResult(JNIEnv *env, jobject obj);
    static std::vector<ProductDetails *> toProductDetailList(JNIEnv *env, jobject productsObj, jint tag, jint startID);
    static std::vector<Purchase *> toPurchaseList(JNIEnv *env, jobject productsObj, jint tag, jint startID);
    static BillingConfig *toBillingConfig(JNIEnv *env, jobject billingConfigObj);
    static AlternativeBillingOnlyReportingDetails *toAlternativeBillingOnlyReportingDetails(JNIEnv *env, jobject alternativeBillingOnlyReportingDetailsObj);
    static ExternalOfferReportingDetails *toExternalOfferReportingDetails(JNIEnv *env, jobject externalOfferReportingDetailsObj);
    static InAppMessageResult *toInAppMessageResult(JNIEnv *env, jobject inAppMessageResultObj);
    static ProductDetails *toProductDetail(JNIEnv *env, jobject productObj);
    static Purchase *toPurchase(JNIEnv *env, jobject purchaseObj);
    static ProductDetails::OneTimePurchaseOfferDetails *toOneTimePurchaseOfferDetails(JNIEnv *env, jobject obj);
    static ProductDetails::InstallmentPlanDetails *toInstallmentPlanDetails(JNIEnv *env, jobject obj);
    static ProductDetails::SubscriptionOfferDetails *toSubscriptionOfferDetails(JNIEnv *env, jobject obj);
    static AccountIdentifiers *toAccountIdentifiers(JNIEnv *env, jobject obj);
    static Purchase::PendingPurchaseUpdate *toPendingPurchaseUpdate(JNIEnv *env, jobject obj);
    static ProductDetails::PricingPhase *toPricingPhase(JNIEnv *env, jobject obj);
    static ProductDetails::PricingPhases *toPricingPhases(JNIEnv* env, jobject obj);
    static BillingResult *callFunctionAndReturnBillingResult(const std::string &functionName, int tag, int callbackId);

    static UserChoiceDetails::Product* toUserChoiceDetailsProduct(JNIEnv* env, jobject obj);
    static UserChoiceDetails* toUserChoiceDetails(JNIEnv* env, jobject obj);


    static jobject newBillingFlowParamsObject(int tag, const BillingFlowParams* params);
    static jobject newBillingClientBuilderObject(int tag, const BillingClient::Builder* params);
private:
    static jobject newSubscriptionUpdateParamsObject(const BillingFlowParams::SubscriptionUpdateParams* params);
    static jobject newProductDetailsParamsObject(int tag, const BillingFlowParams::ProductDetailsParams* params);
    static jobject newProductDetailsParamsListObject(int tag, const std::vector<BillingFlowParams::ProductDetailsParams*>& listParams);

    static jobject newPurchaseUpdateListenerObject(int tag);
    static jobject newUserChoiceBillingListenerObj(int tag);
    static jobject newPendingPurchasesParamsObject(const PendingPurchasesParams* params);
    static jobject newCustomListenerObject(int tag, const std::string& functionName);
};

} // namespace cc
