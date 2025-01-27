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
#include "vendor/google/billing/JniBilling.h"

#include "platform/java/jni/JniHelper.h"

#include <cstring>
#include "base/UTF8.h"
#include "base/memory/Memory.h"

#include "cocos/bindings/jswrapper/SeApi.h"
#include "cocos/bindings/jswrapper/Value.h"
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/bindings/manual/jsb_global_init.h"
#include "vendor/google/billing/GoogleBilling.h"
#include "vendor/google/billing/build-params/PendingPurchasesParams.h"

namespace {

#ifndef JCLS_BILLING
    #define JCLS_BILLING "google/billing/GoogleBillingHelper"
#endif
}; // namespace

namespace cc {
namespace {
std::string callStringMethod(JNIEnv* env, jclass clazz, jobject obj, const char* methodName) {
    jmethodID methodId = env->GetMethodID(clazz, methodName, "()Ljava/lang/String;");
    jobject jStringObj = env->CallObjectMethod(obj, methodId);
    if (jStringObj != nullptr) {
        return cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(jStringObj));
    }
    return "";
}
jobject callObjectMethod(JNIEnv* env, jclass clazz, jobject obj, const char* methodName, const char* returnType) {
    std::string returnSign = cc::StringUtils::format("()L%s", returnType);
    jmethodID methodId = env->GetMethodID(clazz, methodName, returnSign.c_str());
    return env->CallObjectMethod(obj, methodId);
}

int callIntMethod(JNIEnv* env, jclass clazz, jobject obj, const char* methodName) {
    jmethodID methodId = env->GetMethodID(clazz, methodName, "()I");
    return env->CallIntMethod(obj, methodId);
}

bool callBooleanMethod(JNIEnv* env, jclass clazz, jobject obj, const char* methodName) {
    jmethodID methodId = env->GetMethodID(clazz, methodName, "()Z");
    return env->CallBooleanMethod(obj, methodId);
}

long callLongMethod(JNIEnv* env, jclass clazz, jobject obj, const char* methodName) {
    jmethodID methodId = env->GetMethodID(clazz, methodName, "()J");
    return env->CallLongMethod(obj, methodId);
}

} // namespace

cc::BillingResult* JniBilling::toBillingResult(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* billingResult = ccnew cc::BillingResult;
    billingResult->_debugMessage = callStringMethod(env, clazz, obj, "getDebugMessage");
    billingResult->_responseCode = callIntMethod(env, clazz, obj, "getResponseCode");
    billingResult->_toString = callStringMethod(env, clazz, obj, "toString");
    return billingResult;
}

cc::ProductDetails::OneTimePurchaseOfferDetails* JniBilling::toOneTimePurchaseOfferDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto oneTimePurchaseOfferDetails = new cc::ProductDetails::OneTimePurchaseOfferDetails;
    oneTimePurchaseOfferDetails->_formattedPrice = callStringMethod(env, clazz, obj, "getFormattedPrice");
    oneTimePurchaseOfferDetails->_priceAmountMicros = callLongMethod(env, clazz, obj, "getPriceAmountMicros");
    oneTimePurchaseOfferDetails->_priceCurrencyCode = callStringMethod(env, clazz, obj, "getPriceCurrencyCode");
    return oneTimePurchaseOfferDetails;
}

cc::ProductDetails::InstallmentPlanDetails* JniBilling::toInstallmentPlanDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* installmentPlanDetails = new cc::ProductDetails::InstallmentPlanDetails;
    installmentPlanDetails->_commitmentPaymentsCount = callIntMethod(env, clazz, obj, "getInstallmentPlanCommitmentPaymentsCount");
    installmentPlanDetails->_subsequentCommitmentPaymentsCount = callIntMethod(env, clazz, obj, "subsequentInstallmentPlanCommitmentPaymentsCount");
    return installmentPlanDetails;
}

cc::ProductDetails::PricingPhase* JniBilling::toPricingPhase(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);

    auto* pricingPhase = new cc::ProductDetails::PricingPhase;
    pricingPhase->_billingCycleCount = callIntMethod(env, clazz, obj, "getBillingCycleCount");
    pricingPhase->_billingPeriod = callStringMethod(env, clazz, obj, "getBillingPeriod");
    pricingPhase->_formattedPrice = callStringMethod(env, clazz, obj, "getFormattedPrice");
    pricingPhase->_priceAmountMicros = callLongMethod(env, clazz, obj, "getPriceAmountMicros");
    pricingPhase->_priceCurrencyCode = callStringMethod(env, clazz, obj, "getPriceCurrencyCode");
    pricingPhase->_recurrenceMode = callIntMethod(env, clazz, obj, "getRecurrenceMode");
    return pricingPhase;
}

cc::ProductDetails::PricingPhases* JniBilling::toPricingPhases(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);

    auto* pricingPhases = new cc::ProductDetails::PricingPhases;
    jmethodID methodId = env->GetMethodID(clazz, "getPricingPhaseList", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject pricingPhaseObj = env->CallObjectMethod(listObj, listGetMethod, i);
        cc::ProductDetails::PricingPhase* pricingPhase = toPricingPhase(env, pricingPhaseObj);
        pricingPhases->_pricingPhaseList.push_back(pricingPhase);
    }
    return pricingPhases;
}

cc::ProductDetails::SubscriptionOfferDetails* JniBilling::toSubscriptionOfferDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* details = ccnew cc::ProductDetails::SubscriptionOfferDetails;
    details->_basePlanId = callStringMethod(env, clazz, obj,
                                            "getBasePlanId");

    jobject installmentPlanDetailsObj = callObjectMethod(env, clazz, obj, "getInstallmentPlanDetails", "com/android/billingclient/api/ProductDetails$InstallmentPlanDetails;");
    if (installmentPlanDetailsObj != nullptr) {
        details->_installmentPlanDetails = toInstallmentPlanDetails(env, installmentPlanDetailsObj);
    }
    details->_offerId = callStringMethod(env, clazz, obj, "getOfferId");

    jmethodID methodId = env->GetMethodID(clazz, "getOfferTags", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        details->_offerTags.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    details->_offerToken = callStringMethod(env, clazz, obj, "getOfferToken");
    jobject pricingPhasesObj = callObjectMethod(env, clazz, obj, "getPricingPhases", "com/android/billingclient/api/ProductDetails$PricingPhases;");
    details->_pricingPhases = toPricingPhases(env, pricingPhasesObj);

    return details;
}

std::vector<ProductDetails*> JniBilling::toProductDetailList(JNIEnv* env, jobject productListObj, jint tag, jint startID) {
    jclass clazz = env->GetObjectClass(productListObj);
    jmethodID listGetMethod = env->GetMethodID(clazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, clazz, productListObj, "size");
    std::vector<cc::ProductDetails*> productDetailsList;
    for (int i = 0; i < size; ++i) {
        jobject productDetailObj = env->CallObjectMethod(productListObj, listGetMethod, i);
        cc::ProductDetails* productDetails = cc::JniBilling::toProductDetail(env, productDetailObj);
        productDetails->_id = startID++;
        productDetails->_tag = tag;
        productDetailsList.push_back(productDetails);
    }
    return std::move(productDetailsList);
}

cc::ProductDetails* JniBilling::toProductDetail(JNIEnv* env, jobject productObj) {
    jclass clazz = env->GetObjectClass(productObj);
    auto* productDetails = new cc::ProductDetails;

    productDetails->_hashCode = callIntMethod(env, clazz, productObj, "hashCode");
    productDetails->_description = callStringMethod(env, clazz, productObj, "getDescription");
    productDetails->_name = callStringMethod(env, clazz, productObj, "getName");
    productDetails->_productId = callStringMethod(env, clazz, productObj, "getProductId");
    productDetails->_productType = callStringMethod(env, clazz, productObj, "getProductType");
    productDetails->_title = callStringMethod(env, clazz, productObj, "getTitle");
    productDetails->_toString = callStringMethod(env, clazz, productObj, "toString");

    jmethodID methodId = env->GetMethodID(clazz, "getOneTimePurchaseOfferDetails", "()Lcom/android/billingclient/api/ProductDetails$OneTimePurchaseOfferDetails;");
    jobject oneTimePurchaseOfferDetailsObj = env->CallObjectMethod(productObj, methodId);
    if (oneTimePurchaseOfferDetailsObj != nullptr) {
        productDetails->_oneTimePurchaseOfferDetails = toOneTimePurchaseOfferDetails(env, oneTimePurchaseOfferDetailsObj);
    }

    jmethodID getSubscriptionOfferDetails = env->GetMethodID(clazz, "getSubscriptionOfferDetails", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(productObj, getSubscriptionOfferDetails);
    if (listObj != nullptr) {
        jclass listClazz = env->GetObjectClass(listObj);
        jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
        int size = callIntMethod(env, listClazz, listObj, "size");
        for (int i = 0; i < size; ++i) {
            jobject subscriptionOfferDetailsObj = env->CallObjectMethod(listObj, listGetMethod, i);
            cc::ProductDetails::SubscriptionOfferDetails* detail = toSubscriptionOfferDetails(env, subscriptionOfferDetailsObj);
            productDetails->_subscriptionOfferDetails.push_back(detail);
        }
    }

    return productDetails;
}

cc::AccountIdentifiers* JniBilling::toAccountIdentifiers(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* accountIdentifiers = new cc::AccountIdentifiers;
    accountIdentifiers->_obfuscatedAccountId = callStringMethod(env, clazz, obj, "getObfuscatedAccountId");
    accountIdentifiers->_obfuscatedProfileId = callStringMethod(env, clazz, obj, "getObfuscatedProfileId");
    return accountIdentifiers;
}

cc::Purchase::PendingPurchaseUpdate* JniBilling::toPendingPurchaseUpdate(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* pendingPurchaseUpdate = new cc::Purchase::PendingPurchaseUpdate;
    jmethodID methodId = env->GetMethodID(clazz, "getProducts", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/String;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        pendingPurchaseUpdate->_products.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    pendingPurchaseUpdate->_purchaseToken = callStringMethod(env, clazz, obj, "getPurchaseToken");
    return pendingPurchaseUpdate;
}

std::vector<Purchase*> JniBilling::toPurchaseList(JNIEnv* env, jobject productsListObj, jint tag, jint startID) {
    jclass clazz = env->GetObjectClass(productsListObj);
    jmethodID listGetMethod = env->GetMethodID(clazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, clazz, productsListObj, "size");
    std::vector<cc::Purchase*> purchases;
    for (int i = 0; i < size; ++i) {
        jobject purchaseObj = env->CallObjectMethod(productsListObj, listGetMethod, i);
        cc::Purchase* purchase = cc::JniBilling::toPurchase(env, purchaseObj);
        purchase->_id = startID++;
        purchase->_tag = tag;
        purchases.push_back(purchase);
    }
    return std::move(purchases);
}

cc::Purchase* JniBilling::toPurchase(JNIEnv* env, jobject purchaseObj) {
    jclass clazz = env->GetObjectClass(purchaseObj);
    auto* purchase = new cc::Purchase;

    jmethodID getAccountIdentifiers = env->GetMethodID(clazz, "getAccountIdentifiers", "()Lcom/android/billingclient/api/AccountIdentifiers;");
    jobject accountIdentifiersObj = env->CallObjectMethod(purchaseObj, getAccountIdentifiers);
    if (accountIdentifiersObj) {
        purchase->_accountIdentifiers = toAccountIdentifiers(env, accountIdentifiersObj);
    }

    purchase->_developerPayload = callStringMethod(env, clazz, purchaseObj, "getDeveloperPayload");
    purchase->_orderId = callStringMethod(env, clazz, purchaseObj, "getOrderId");
    purchase->_originalJson = callStringMethod(env, clazz, purchaseObj, "getOriginalJson");
    purchase->_packageName = callStringMethod(env, clazz, purchaseObj, "getPackageName");

    jmethodID getPendingPurchaseUpdate = env->GetMethodID(clazz, "getPendingPurchaseUpdate", "()Lcom/android/billingclient/api/Purchase$PendingPurchaseUpdate;");
    jobject pendingPurchaseUpdateObj = env->CallObjectMethod(purchaseObj, getPendingPurchaseUpdate);
    if (pendingPurchaseUpdateObj) {
        purchase->_pendingPurchaseUpdate = toPendingPurchaseUpdate(env, pendingPurchaseUpdateObj);
    }

    jmethodID methodId = env->GetMethodID(clazz, "getProducts", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(purchaseObj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    auto& products = purchase->_products;
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        products.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    purchase->_purchaseState = callIntMethod(env, clazz, purchaseObj, "getPurchaseState");
    purchase->_purchaseTime = callLongMethod(env, clazz, purchaseObj, "getPurchaseTime");
    purchase->_purchaseToken = callStringMethod(env, clazz, purchaseObj, "getPurchaseToken");
    purchase->_quantity = callIntMethod(env, clazz, purchaseObj, "getQuantity");
    purchase->_signature = callStringMethod(env, clazz, purchaseObj, "getSignature");
    purchase->_hashCode = callIntMethod(env, clazz, purchaseObj, "hashCode");
    purchase->_isAcknowledged = callBooleanMethod(env, clazz, purchaseObj, "isAcknowledged");
    purchase->_isAutoRenewing = callBooleanMethod(env, clazz, purchaseObj, "isAutoRenewing");
    purchase->_toString = callStringMethod(env, clazz, purchaseObj, "toString");
    return purchase;
}

cc::BillingConfig* JniBilling::toBillingConfig(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* billingConfig = new cc::BillingConfig("");
    billingConfig->_countryCode = callStringMethod(env, clazz, obj, "getCountryCode");
    return billingConfig;
}

cc::AlternativeBillingOnlyReportingDetails* JniBilling::toAlternativeBillingOnlyReportingDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* alternativeBillingOnlyReportingDetails = new cc::AlternativeBillingOnlyReportingDetails;
    alternativeBillingOnlyReportingDetails->_externalTransactionToken = callStringMethod(env, clazz, obj, "getExternalTransactionToken");
    return alternativeBillingOnlyReportingDetails;
}

cc::ExternalOfferReportingDetails* JniBilling::toExternalOfferReportingDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* externalOfferReportingDetails = new cc::ExternalOfferReportingDetails;
    externalOfferReportingDetails->_externalTransactionToken = callStringMethod(env, clazz, obj, "getExternalTransactionToken");
    return externalOfferReportingDetails;
}

cc::InAppMessageResult* JniBilling::toInAppMessageResult(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* inAppMessageResult = new cc::InAppMessageResult(0, "");
    inAppMessageResult->_responseCode = callIntMethod(env, clazz, obj, "getResponseCode");
    inAppMessageResult->_purchaseToken = callStringMethod(env, clazz, obj, "getPurchaseToken");
    return inAppMessageResult;
}

cc::UserChoiceDetails::Product* JniBilling::toUserChoiceDetailsProduct(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* product = new cc::UserChoiceDetails::Product();
    product->_hashCode = callIntMethod(env, clazz, obj, "hashCode");
    product->_id = callStringMethod(env, clazz, obj, "getId");
    product->_offerToken = callStringMethod(env, clazz, obj, "getOfferToken");
    product->_type = callStringMethod(env, clazz, obj, "getType");
    product->_toString = callStringMethod(env, clazz, obj, "toString");
    return product;
}

cc::UserChoiceDetails* JniBilling::toUserChoiceDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* userChoiceDetails = new cc::UserChoiceDetails();
    userChoiceDetails->_externalTransactionToken = callStringMethod(env, clazz, obj, "getExternalTransactionToken");
    userChoiceDetails->_originalExternalTransactionId = callStringMethod(env, clazz, obj, "getOriginalExternalTransactionId");

    jmethodID methodId = env->GetMethodID(clazz, "getProducts", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    auto& products = userChoiceDetails->_products;
    for (int i = 0; i < size; ++i) {
        jobject productObj = env->CallObjectMethod(listObj, listGetMethod, i);
        products.push_back(toUserChoiceDetailsProduct(env, productObj));
    }
    return userChoiceDetails;
}

BillingResult* JniBilling::callFunctionAndReturnBillingResult(const std::string& functionName, int tag, int callbackId) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    if (cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, functionName.c_str(), "(II)Lcom/android/billingclient/api/BillingResult;")) {
        jobject obj = t.env->CallStaticObjectMethod(t.classID, t.methodID, tag, callbackId);
        return cc::JniBilling::toBillingResult(env, obj);
    }
    return nullptr;
}

jobject JniBilling::newSubscriptionUpdateParamsObject(const BillingFlowParams::SubscriptionUpdateParams* params) {
    if (!params) {
        return nullptr;
    }
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, "com/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams", "newBuilder", "()Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams$Builder;");
    jobject builder = t.env->CallStaticObjectMethod(t.classID, t.methodID);
    jclass builderClass = env->GetObjectClass(builder);

    jmethodID setOldPurchaseTokenMethodId = env->GetMethodID(builderClass, "setOldPurchaseToken", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams$Builder;");
    env->CallObjectMethod(builder, setOldPurchaseTokenMethodId, cc::StringUtils::newStringUTFJNI(env, params->_purchaseToken));

    jmethodID setOriginalExternalTransactionIdMethodId = env->GetMethodID(builderClass, "setOriginalExternalTransactionId", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams$Builder;");
    env->CallObjectMethod(builder, setOriginalExternalTransactionIdMethodId, cc::StringUtils::newStringUTFJNI(env, params->_externalTransactionId));

    jmethodID setObfuscatedProfileIdMethodId = env->GetMethodID(builderClass, "setSubscriptionReplacementMode", "(I)Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams$Builder;");
    env->CallObjectMethod(builder, setObfuscatedProfileIdMethodId, params->_subscriptionReplacementMode);

    jmethodID buildMethodIdMethodId = env->GetMethodID(builderClass, "build", "()Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams;");
    return env->CallObjectMethod(builder, buildMethodIdMethodId);
}

jobject JniBilling::newProductDetailsParamsObject(int tag, const BillingFlowParams::ProductDetailsParams* params) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, "com/android/billingclient/api/BillingFlowParams$ProductDetailsParams", "newBuilder", "()Lcom/android/billingclient/api/BillingFlowParams$ProductDetailsParams$Builder;");
    jobject builder = t.env->CallStaticObjectMethod(t.classID, t.methodID);
    jclass builderClass = env->GetObjectClass(builder);

    if (!params->_offerToken.empty()) {
        jmethodID setOldPurchaseTokenMethodId = env->GetMethodID(builderClass, "setOfferToken", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingFlowParams$ProductDetailsParams$Builder;");
        env->CallObjectMethod(builder, setOldPurchaseTokenMethodId, cc::StringUtils::newStringUTFJNI(env, params->_offerToken));
    }

    cc::JniMethodInfo t2;
    cc::JniHelper::getStaticMethodInfo(t2, JCLS_BILLING, "getProductDetailsObject", "(II)Lcom/android/billingclient/api/ProductDetails;");
    if (params->_productDetails) {
        jobject productDetailsObject = t2.env->CallStaticObjectMethod(t2.classID, t2.methodID, tag, params->_productDetails->_id);
        jmethodID setProductDetailsMethodId = env->GetMethodID(builderClass, "setProductDetails", "(Lcom/android/billingclient/api/ProductDetails;)Lcom/android/billingclient/api/BillingFlowParams$ProductDetailsParams$Builder;");
        env->CallObjectMethod(builder, setProductDetailsMethodId, productDetailsObject);
    }

    jmethodID buildMethodId = env->GetMethodID(builderClass, "build", "()Lcom/android/billingclient/api/BillingFlowParams$ProductDetailsParams;");
    return env->CallObjectMethod(builder, buildMethodId);
}

jobject JniBilling::newProductDetailsParamsListObject(int tag, const std::vector<BillingFlowParams::ProductDetailsParams*>& listParams) {
    JNIEnv* env = cc::JniHelper::getEnv();
    jclass listClass = env->FindClass("java/util/ArrayList");
    jmethodID methodInit = env->GetMethodID(listClass, "<init>", "()V"); /* 无参构造 */
    jobject list = env->NewObjectA(listClass, methodInit, 0);
    jmethodID methodAdd = env->GetMethodID(listClass, "add", "(Ljava/lang/Object;)Z");
    for (auto param : listParams) {
        env->CallBooleanMethod(list, methodAdd, newProductDetailsParamsObject(tag, param));
    }
    return list;
}

jobject JniBilling::newBillingFlowParamsObject(int tag, const BillingFlowParams* params) {
    JNIEnv* env = cc::JniHelper::getEnv();
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, "com/android/billingclient/api/BillingFlowParams", "newBuilder", "()Lcom/android/billingclient/api/BillingFlowParams$Builder;");
    jobject builder = t.env->CallStaticObjectMethod(t.classID, t.methodID);
    jclass builderClass = env->GetObjectClass(builder);

    jmethodID setIsOfferPersonalizedMethodId = env->GetMethodID(builderClass, "setIsOfferPersonalized", "(Z)Lcom/android/billingclient/api/BillingFlowParams$Builder;");
    env->CallObjectMethod(builder, setIsOfferPersonalizedMethodId, params->_isOfferPersonalized);

    jmethodID setObfuscatedAccountIdMethodId = env->GetMethodID(builderClass, "setObfuscatedAccountId", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingFlowParams$Builder;");
    env->CallObjectMethod(builder, setObfuscatedAccountIdMethodId, cc::StringUtils::newStringUTFJNI(env, params->_obfuscatedAccountid));

    jmethodID setObfuscatedProfileIdMethodId = env->GetMethodID(builderClass, "setObfuscatedProfileId", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingFlowParams$Builder;");
    env->CallObjectMethod(builder, setObfuscatedProfileIdMethodId, cc::StringUtils::newStringUTFJNI(env, params->_obfuscatedProfileId));

    jobject listObjs = JniBilling::newProductDetailsParamsListObject(tag, params->_productDetailsParamsList);
    jmethodID setProductDetailsParamsListMethodId = env->GetMethodID(builderClass, "setProductDetailsParamsList", "(Ljava/util/List;)Lcom/android/billingclient/api/BillingFlowParams$Builder;");
    env->CallObjectMethod(builder, setProductDetailsParamsListMethodId, listObjs);

    if (params->_subscriptionUpdateParams) {
        jobject subscriptionOfferDetailsObj = JniBilling::newSubscriptionUpdateParamsObject(params->_subscriptionUpdateParams);
        jmethodID setSubscriptionUpdateParamsMethodId = env->GetMethodID(builderClass, "setSubscriptionUpdateParams", "(Lcom/android/billingclient/api/BillingFlowParams$SubscriptionUpdateParams;)Lcom/android/billingclient/api/BillingFlowParams$Builder;");
        env->CallObjectMethod(builder, setSubscriptionUpdateParamsMethodId, subscriptionOfferDetailsObj);
    }

    jmethodID buildMethodId = env->GetMethodID(builderClass, "build", "()Lcom/android/billingclient/api/BillingFlowParams;");
    return env->CallObjectMethod(builder, buildMethodId);
}

jobject JniBilling::newPendingPurchasesParamsObject(const PendingPurchasesParams* params) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, "com/android/billingclient/api/PendingPurchasesParams", "newBuilder", "()Lcom/android/billingclient/api/PendingPurchasesParams$Builder;");
    jobject builder = t.env->CallStaticObjectMethod(t.classID, t.methodID);
    jclass builderClass = env->GetObjectClass(builder);

    if (params->_enableOneTimeProducts) {
        jmethodID methodId = env->GetMethodID(builderClass, "enableOneTimeProducts", "()Lcom/android/billingclient/api/PendingPurchasesParams$Builder;");
        env->CallObjectMethod(builder, methodId);
    }
    if (params->_enablePrepaidPlans) {
        jmethodID methodId = env->GetMethodID(builderClass, "enablePrepaidPlans", "()Lcom/android/billingclient/api/PendingPurchasesParams$Builder;");
        env->CallObjectMethod(builder, methodId);
    }

    jmethodID buildMethodId = env->GetMethodID(builderClass, "build", "()Lcom/android/billingclient/api/PendingPurchasesParams;");
    return env->CallObjectMethod(builder, buildMethodId);
}

jobject JniBilling::newCustomListenerObject(int tag, const std::string& functionName) {
    auto* env = JniHelper::getEnv();
    std::string listener = std::string(JCLS_BILLING) + "$" + functionName;

    cc::JniMethodInfo t;
    cc::JniHelper::getMethodInfo(t, listener.c_str(), "<init>", "(I)V");

    return t.env->NewObject(t.classID, t.methodID, tag);
}

jobject JniBilling::newPurchaseUpdateListenerObject(int tag) {
    return newCustomListenerObject(tag, "BillingClientPurchasesUpdatedListener");
}

jobject JniBilling::newUserChoiceBillingListenerObj(int tag) {
    return newCustomListenerObject(tag, "BillingClientUserChoiceBillingListener");
}

jobject JniBilling::newBillingClientBuilderObject(int tag, const BillingClient::Builder* params) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    auto* javaGameActivity = cc::JniHelper::getActivity();
    cc::JniHelper::getStaticMethodInfo(t, "com/android/billingclient/api/BillingClient", "newBuilder", "(Landroid/content/Context;)Lcom/android/billingclient/api/BillingClient$Builder;");
    jobject builder = t.env->CallStaticObjectMethod(t.classID, t.methodID, javaGameActivity);
    jclass builderClass = env->GetObjectClass(builder);

    if (params->_enableAlternativeBillingOnly) {
        jmethodID methodId = env->GetMethodID(builderClass, "enableAlternativeBillingOnly", "()Lcom/android/billingclient/api/BillingClient$Builder;");
        env->CallObjectMethod(builder, methodId);
    }

    if (params->_enableExternalOffer) {
        jmethodID methodId = env->GetMethodID(builderClass, "enableExternalOffer", "()Lcom/android/billingclient/api/BillingClient$Builder;");
        env->CallObjectMethod(builder, methodId);
    }

    if (params->_pendingPurchasesParams) {
        jobject pendingPurchasesParamsObj = newPendingPurchasesParamsObject(params->_pendingPurchasesParams);
        jmethodID methodId = env->GetMethodID(builderClass, "enablePendingPurchases", "(Lcom/android/billingclient/api/PendingPurchasesParams;)Lcom/android/billingclient/api/BillingClient$Builder;");
        env->CallObjectMethod(builder, methodId, pendingPurchasesParamsObj);
    }

    if (params->_purchasesUpdatedListener) {
        jobject listenerObj = newPurchaseUpdateListenerObject(tag);
        jmethodID methodId = env->GetMethodID(builderClass, "setListener", "(Lcom/android/billingclient/api/PurchasesUpdatedListener;)Lcom/android/billingclient/api/BillingClient$Builder;");
        env->CallObjectMethod(builder, methodId, listenerObj);
    }

    if (params->_userChoiceBillingListener) {
        jobject userChoiceBillingListenerObj = newUserChoiceBillingListenerObj(tag);
        jmethodID methodId = env->GetMethodID(builderClass, "enableUserChoiceBilling", "(Lcom/android/billingclient/api/UserChoiceBillingListener;)Lcom/android/billingclient/api/BillingClient$Builder;");
        env->CallObjectMethod(builder, methodId, userChoiceBillingListenerObj);
    }

    return builder;
}

} // namespace cc
