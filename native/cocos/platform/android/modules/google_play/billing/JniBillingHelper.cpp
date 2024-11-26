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
#include "platform/android/modules/google_play/billing/JniBillingHelper.h"
#include "platform/android/modules/google_play/billing/billing.h"
#include "platform/java/jni/JniHelper.h"

#include <cstring>
#include "base/UTF8.h"
#include "base/memory/Memory.h"

#include "cocos/bindings/jswrapper/SeApi.h"
#include "cocos/bindings/jswrapper/Value.h"
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/bindings/manual/jsb_global_init.h"

namespace {

#ifndef JCLS_BILLING
    #define JCLS_BILLING "com/cocos/billing/CocosBillingHelper"
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

template <typename... Args>
void callJSfunc(const char* jsFunctionName, Args&&... inargs) { // NOLINT(readability-identifier-naming)
    if (!se::ScriptEngine::getInstance()->isValid()) {
        return;
    }
    se::AutoHandleScope scope;
    se::ValueArray args;
    args.resize(sizeof...(Args));
    nativevalue_to_se_args_v(args, inargs...);
    se::Value func;
    __jsbObj->getProperty(jsFunctionName, &func);
    if (func.isObject() && func.toObject()->isFunction()) {
        func.toObject()->call(args, nullptr);
    }
    return;
}

void callJSfunc(const char* jsFunctionName) { // NOLINT(readability-identifier-naming)
    if (!se::ScriptEngine::getInstance()->isValid()) {
        return;
    }
    se::AutoHandleScope scope;
    se::ValueArray args;
    se::Value func;
    __jsbObj->getProperty(jsFunctionName, &func);
    if (func.isObject() && func.toObject()->isFunction()) {
        func.toObject()->call(args, nullptr);
    }
}

template void callJSfunc(const char*, BillingResult*&&);
template void callJSfunc(const char*, BillingResult*&&, const std::vector<cc::ProductDetails*>&);
template void callJSfunc(const char*, BillingResult*&&, const std::vector<cc::Purchase*>&);
template void callJSfunc(const char*, BillingResult*&&, const std::string&);
template void callJSfunc(const char*, BillingResult*&&, BillingConfig*&&);
template void callJSfunc(const char*, BillingResult*&&, AlternativeBillingOnlyReportingDetails*&&);
template void callJSfunc(const char*, BillingResult*&&, ExternalOfferReportingDetails*&&);
template void callJSfunc(const char*, InAppMessageResult*&&);

void JniBillingHelper::removeProductDetails(int productDetailsID) {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "removeProductDetails", productDetailsID);
}

void JniBillingHelper::removePurchase(int purchaseID) {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "removePurchase", purchaseID);
}


void JniBillingHelper::startConnection() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "startConnection");
}

void JniBillingHelper::endConnection() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "endConnection");
}

int JniBillingHelper::getConnectionState() {
    return JniHelper::callStaticIntMethod(JCLS_BILLING, "getConnectionState");
}

bool JniBillingHelper::isReady() {
    return JniHelper::callStaticBooleanMethod(JCLS_BILLING, "isReady");
}

void JniBillingHelper::queryProductDetailsParams(const std::vector<std::string>& productIds, const std::string& type) {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "queryProductDetailsParams", productIds, type);
}

void JniBillingHelper::queryPurchasesAsync(const std::string& productType) {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "queryPurchasesAsync", productType);
}

void JniBillingHelper::getBillingConfigAsync() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "getBillingConfigAsync");
}

void JniBillingHelper::createAlternativeBillingOnlyReportingDetailsAsync() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "createAlternativeBillingOnlyReportingDetailsAsync");
}

void JniBillingHelper::isAlternativeBillingOnlyAvailableAsync() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "isAlternativeBillingOnlyAvailableAsync");
}

void JniBillingHelper::createExternalOfferReportingDetailsAsync() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "createExternalOfferReportingDetailsAsync");
}

void JniBillingHelper::isExternalOfferAvailableAsync() {
    JniHelper::callStaticVoidMethod(JCLS_BILLING, "isExternalOfferAvailableAsync");
}

BillingResult* JniBillingHelper::showAlternativeBillingOnlyInformationDialog() {
    return callFunctionAndReturnBillingResult("showAlternativeBillingOnlyInformationDialog");
}

BillingResult* JniBillingHelper::showExternalOfferInformationDialog() {
    return callFunctionAndReturnBillingResult("showExternalOfferInformationDialog");
}

BillingResult* JniBillingHelper::showInAppMessages() {
    return callFunctionAndReturnBillingResult("showInAppMessages");
}

void JniBillingHelper::launchBillingFlow(const std::vector<ProductDetails*>& productDetailsList, const std::string& selectedOfferToken) {
    if (productDetailsList.empty()) {
        return;
    }
    auto* env = JniHelper::getEnv();
    const int size = productDetailsList.size();
    jintArray result = env->NewIntArray(size);
    jint* buf = new jint[size];
    for (int i = 0; i < size; ++i) {
        buf[i] = productDetailsList[i]->_id;
    }
    env->SetIntArrayRegion(result, 0, size, buf);
    delete[] buf;
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, "launchBillingFlow", "([ILjava/lang/String;)V");
    jstring offerToken = env->NewStringUTF(selectedOfferToken.c_str());
    t.env->CallStaticVoidMethod(t.classID, t.methodID, result, offerToken);
}

void JniBillingHelper::consumePurchases(const std::vector<Purchase*>& purchases) {
    if (purchases.empty()) {
        return;
    }
    auto* env = JniHelper::getEnv();
    const int size = purchases.size();
    jintArray result = env->NewIntArray(size);
    jint* buf = new jint[size];
    for (int i = 0; i < size; ++i) {
        buf[i] = purchases[i]->_id;
    }
    env->SetIntArrayRegion(result, 0, size, buf);
    delete[] buf;
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, "consumePurchases", "([I)V");
    t.env->CallStaticVoidMethod(t.classID, t.methodID, result);
}

void JniBillingHelper::acknowledgePurchase(const std::vector<Purchase*>& purchases) {
    if (purchases.empty()) {
        return;
    }
    auto* env = JniHelper::getEnv();
    const int size = purchases.size();
    jintArray result = env->NewIntArray(size);
    jint* buf = new jint[size];
    for (int i = 0; i < size; ++i) {
        buf[i] = purchases[i]->_id;
    }
    env->SetIntArrayRegion(result, 0, size, buf);
    delete[] buf;
    cc::JniMethodInfo t;
    cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, "acknowledgePurchases", "([I)V");
    t.env->CallStaticVoidMethod(t.classID, t.methodID, result);
}

BillingResult* JniBillingHelper::callFunctionAndReturnBillingResult(const std::string& functionName) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    if (cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, functionName.c_str(), "()Lcom/android/billingclient/api/BillingResult;")) {
        jobject obj = t.env->CallStaticObjectMethod(t.classID, t.methodID);
        return toBillingResult(env, obj);
    }
    return nullptr;
}

BillingResult* JniBillingHelper::isFeatureSupported(const std::string& feature) {
    auto* env = JniHelper::getEnv();
    cc::JniMethodInfo t;
    if (cc::JniHelper::getStaticMethodInfo(t, JCLS_BILLING, "isFeatureSupported", "(Ljava/lang/String;)Lcom/android/billingclient/api/BillingResult;")) {
        jstring jFeature = cc::StringUtils::newStringUTFJNI(env, feature);
        jobject obj = t.env->CallStaticObjectMethod(t.classID, t.methodID, jFeature);
        return toBillingResult(env, obj);
    }
    return nullptr;
}

void JniBillingHelper::onBillingSetupFinished(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    cc::callJSfunc("onBillingSetupFinished", toBillingResult(env, billingResultObj));
}

void JniBillingHelper::onBillingServiceDisconnected(JNIEnv* env, jclass clazz) {
    cc::callJSfunc("onBillingServiceDisconnected");
}

void JniBillingHelper::onProductDetailsResponse(JNIEnv* env, jclass clazz,
                                                jobject billingResultObj,
                                                jobject productDetailsListObj,
                                                jint startID) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    std::vector<cc::ProductDetails*> productDetailsList = cc::JniBillingHelper::toProductDetailList(env, productDetailsListObj, startID);
    cc::callJSfunc("onProductDetailsResponse", billingResult, productDetailsList);
}

void JniBillingHelper::onPurchasesUpdated(JNIEnv* env, jclass clazz,
                                          jobject billingResultObj,
                                          jobject purchasesListObj,
                                          jint startID) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    if (purchasesListObj != nullptr) {
        std::vector<cc::Purchase*> purchasesList = cc::JniBillingHelper::toPurchaseList(env, purchasesListObj, startID);
        cc::callJSfunc("onPurchasesUpdated", billingResult, purchasesList);
    } else {
        cc::callJSfunc("onPurchasesUpdated", billingResult, std::vector<cc::Purchase*>());
    }
}

void JniBillingHelper::onConsumeResponse(JNIEnv* env, jclass clazz, jobject billingResultObj, jstring purchaseToken) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onConsumeResponse", billingResult, cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(purchaseToken)));
}

void JniBillingHelper::onQueryPurchasesResponse(JNIEnv* env, jclass clazz, jobject billingResultObj, jobject purchasesListObj, jint startID) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    std::vector<cc::Purchase*> purchasesList = cc::JniBillingHelper::toPurchaseList(env, purchasesListObj, startID);
    cc::callJSfunc("onQueryPurchasesResponse", billingResult, purchasesList);
}

void JniBillingHelper::onAcknowledgePurchaseResponse(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onAcknowledgePurchaseResponse", billingResult);
}

void JniBillingHelper::onBillingConfigResponse(JNIEnv* env, jclass clazz, jobject billingResultObj, jobject billingConfigObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::BillingConfig* billingConfig = nullptr;
    if (billingConfigObj) {
        billingConfig = cc::JniBillingHelper::toBillingConfig(env, billingConfigObj);
    }
    cc::callJSfunc("onBillingConfigResponse", billingResult, billingConfig);
}
void JniBillingHelper::onAlternativeBillingOnlyTokenResponse(JNIEnv* env, jclass clazz, jobject billingResultObj, jobject alternativeBillingOnlyReportingDetailsObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::AlternativeBillingOnlyReportingDetails* toAlternativeBillingOnlyReporting = nullptr;
    if (alternativeBillingOnlyReportingDetailsObj) {
        toAlternativeBillingOnlyReporting = cc::JniBillingHelper::toAlternativeBillingOnlyReportingDetails(env, alternativeBillingOnlyReportingDetailsObj);
    }
    cc::callJSfunc("onAlternativeBillingOnlyTokenResponse", billingResult, toAlternativeBillingOnlyReporting);
}

void JniBillingHelper::onExternalOfferReportingDetailsResponse(JNIEnv* env, jclass clazz, jobject billingResultObj, jobject externalOfferReportingDetailsObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::ExternalOfferReportingDetails* externalOfferReportingDetails = nullptr;
    if (externalOfferReportingDetailsObj) {
        externalOfferReportingDetails = cc::JniBillingHelper::toExternalOfferReportingDetails(env, externalOfferReportingDetailsObj);
    }
    cc::callJSfunc("onExternalOfferReportingDetailsResponse", billingResult, externalOfferReportingDetails);
}

void JniBillingHelper::onAlternativeBillingOnlyAvailabilityResponse(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onAlternativeBillingOnlyAvailabilityResponse", billingResult);
}

void JniBillingHelper::onExternalOfferAvailabilityResponse(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onExternalOfferAvailabilityResponse", billingResult);
}

void JniBillingHelper::onAlternativeBillingOnlyInformationDialogResponse(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onAlternativeBillingOnlyInformationDialogResponse", billingResult);
}

void JniBillingHelper::onExternalOfferInformationDialogResponse(JNIEnv* env, jclass clazz, jobject billingResultObj) {
    auto* billingResult = cc::JniBillingHelper::toBillingResult(env, billingResultObj);
    cc::callJSfunc("onExternalOfferInformationDialogResponse", billingResult);
}

void JniBillingHelper::onInAppMessageResponse(JNIEnv* env, jclass clazz, jobject inAppMessageResultObj) {
    auto* inAppMessageResult = cc::JniBillingHelper::toInAppMessageResult(env, inAppMessageResultObj);
    cc::callJSfunc("onInAppMessageResponse", inAppMessageResult);
}

cc::BillingResult* JniBillingHelper::toBillingResult(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* billingResult = ccnew cc::BillingResult;
    billingResult->debugMessage = callStringMethod(env, clazz, obj, "getDebugMessage");
    billingResult->responseCode = callIntMethod(env, clazz, obj, "getResponseCode");
    billingResult->toString = callStringMethod(env, clazz, obj, "toString");
    return billingResult;
}

cc::OneTimePurchaseOfferDetails* JniBillingHelper::toOneTimePurchaseOfferDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto oneTimePurchaseOfferDetails = new cc::OneTimePurchaseOfferDetails;
    oneTimePurchaseOfferDetails->formattedPrice = callStringMethod(env, clazz, obj, "getFormattedPrice");
    oneTimePurchaseOfferDetails->priceAmountMicros = callLongMethod(env, clazz, obj, "getPriceAmountMicros");
    oneTimePurchaseOfferDetails->priceCurrencyCode = callStringMethod(env, clazz, obj, "getPriceCurrencyCode");
    return oneTimePurchaseOfferDetails;
}

cc::InstallmentPlanDetails* JniBillingHelper::toInstallmentPlanDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* installmentPlanDetails = new cc::InstallmentPlanDetails;
    installmentPlanDetails->installmentPlanCommitmentPaymentsCount = callIntMethod(env, clazz, obj, "getInstallmentPlanCommitmentPaymentsCount");
    installmentPlanDetails->subsequentInstallmentPlanCommitmentPaymentsCount = callIntMethod(env, clazz, obj, "subsequentInstallmentPlanCommitmentPaymentsCount");
    return installmentPlanDetails;
}

cc::PricingPhase* JniBillingHelper::toPricingPhase(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);

    auto* pricingPhase = new cc::PricingPhase;
    pricingPhase->billingCycleCount = callIntMethod(env, clazz, obj, "getBillingCycleCount");
    pricingPhase->billingPeriod = callStringMethod(env, clazz, obj, "getBillingPeriod");
    pricingPhase->formattedPrice = callStringMethod(env, clazz, obj, "getFormattedPrice");
    pricingPhase->priceAmountMicros = callLongMethod(env, clazz, obj, "getPriceAmountMicros");
    pricingPhase->priceCurrencyCode = callStringMethod(env, clazz, obj, "getPriceCurrencyCode");
    pricingPhase->recurrenceMode = callIntMethod(env, clazz, obj, "getRecurrenceMode");
    return pricingPhase;
}

cc::PricingPhases* JniBillingHelper::toPricingPhases(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);

    auto* pricingPhases = new cc::PricingPhases;
    jmethodID methodId = env->GetMethodID(clazz, "getPricingPhaseList", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject pricingPhaseObj = env->CallObjectMethod(listObj, listGetMethod, i);
        cc::PricingPhase* pricingPhase = toPricingPhase(env, pricingPhaseObj);
        pricingPhases->pricingPhaseList.push_back(pricingPhase);
    }
    return pricingPhases;
}

cc::SubscriptionOfferDetails* JniBillingHelper::toSubscriptionOfferDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* details = ccnew cc::SubscriptionOfferDetails;
    details->basePlanId = callStringMethod(env, clazz, obj,
                                           "getBasePlanId");

    jobject installmentPlanDetailsObj = callObjectMethod(env, clazz, obj, "getInstallmentPlanDetails", "com/android/billingclient/api/ProductDetails$InstallmentPlanDetails;");
    if (installmentPlanDetailsObj != nullptr) {
        details->installmentPlanDetails.reset(toInstallmentPlanDetails(env, installmentPlanDetailsObj));
    }
    details->offerId = callStringMethod(env, clazz, obj, "getOfferId");

    jmethodID methodId = env->GetMethodID(clazz, "getOfferTags", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        details->offerTags.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    details->offerToken = callStringMethod(env, clazz, obj, "getOfferToken");
    jobject pricingPhasesObj = callObjectMethod(env, clazz, obj, "getPricingPhases", "com/android/billingclient/api/ProductDetails$PricingPhases;");
    details->pricingPhases.reset(toPricingPhases(env, pricingPhasesObj));

    return details;
}

std::vector<ProductDetails*> JniBillingHelper::toProductDetailList(JNIEnv* env, jobject productListObj, jint startID) {
    jclass clazz = env->GetObjectClass(productListObj);
    jmethodID listGetMethod = env->GetMethodID(clazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, clazz, productListObj, "size");
    std::vector<cc::ProductDetails*> productDetailsList;
    for (int i = 0; i < size; ++i) {
        jobject productDetailObj = env->CallObjectMethod(productListObj, listGetMethod, i);
        cc::ProductDetails* productDetails = cc::JniBillingHelper::toProductDetail(env, productDetailObj);
        productDetails->_id = startID++;
        productDetailsList.push_back(productDetails);
    }
    return std::move(productDetailsList);
}

cc::ProductDetails* JniBillingHelper::toProductDetail(JNIEnv* env, jobject productObj) {
    jclass clazz = env->GetObjectClass(productObj);
    auto* productDetails = new cc::ProductDetails;

    productDetails->hashCode = callIntMethod(env, clazz, productObj, "hashCode");
    productDetails->description = callStringMethod(env, clazz, productObj, "getDescription");
    productDetails->name = callStringMethod(env, clazz, productObj, "getName");
    productDetails->productId = callStringMethod(env, clazz, productObj, "getProductId");
    productDetails->productType = callStringMethod(env, clazz, productObj, "getProductType");
    productDetails->title = callStringMethod(env, clazz, productObj, "getTitle");
    productDetails->toString = callStringMethod(env, clazz, productObj, "toString");

    jmethodID methodId = env->GetMethodID(clazz, "getOneTimePurchaseOfferDetails", "()Lcom/android/billingclient/api/ProductDetails$OneTimePurchaseOfferDetails;");
    jobject oneTimePurchaseOfferDetailsObj = env->CallObjectMethod(productObj, methodId);
    if (oneTimePurchaseOfferDetailsObj != nullptr) {
        productDetails->oneTimePurchaseOfferDetails.reset(toOneTimePurchaseOfferDetails(env, oneTimePurchaseOfferDetailsObj));
    }

    jmethodID getSubscriptionOfferDetails = env->GetMethodID(clazz, "getSubscriptionOfferDetails", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(productObj, getSubscriptionOfferDetails);
    if (listObj != nullptr) {
        jclass listClazz = env->GetObjectClass(listObj);
        jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
        int size = callIntMethod(env, listClazz, listObj, "size");
        std::vector<cc::SubscriptionOfferDetails*> details;
        for (int i = 0; i < size; ++i) {
            jobject subscriptionOfferDetailsObj = env->CallObjectMethod(listObj, listGetMethod, i);
            cc::SubscriptionOfferDetails* detail = toSubscriptionOfferDetails(env, subscriptionOfferDetailsObj);
            productDetails->subscriptionOfferDetails.push_back(detail);
        }
    }

    return productDetails;
}

cc::AccountIdentifiers* JniBillingHelper::toAccountIdentifiers(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* accountIdentifiers = new cc::AccountIdentifiers;
    accountIdentifiers->obfuscatedAccountId = callStringMethod(env, clazz, obj, "getObfuscatedAccountId");
    accountIdentifiers->obfuscatedProfileId = callStringMethod(env, clazz, obj, "getObfuscatedProfileId");
    return accountIdentifiers;
}

cc::PendingPurchaseUpdate* JniBillingHelper::toPendingPurchaseUpdate(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* pendingPurchaseUpdate = new cc::PendingPurchaseUpdate;
    jmethodID methodId = env->GetMethodID(clazz, "getProducts", "()Ljava/util/ArrayList;");
    jobject listObj = env->CallObjectMethod(obj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/String;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        pendingPurchaseUpdate->products.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    pendingPurchaseUpdate->purchaseToken = callStringMethod(env, clazz, obj, "getPurchaseToken");
    return pendingPurchaseUpdate;
}

std::vector<Purchase*> JniBillingHelper::toPurchaseList(JNIEnv* env, jobject productsListObj, jint startID) {
    jclass clazz = env->GetObjectClass(productsListObj);
    jmethodID listGetMethod = env->GetMethodID(clazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, clazz, productsListObj, "size");
    std::vector<cc::Purchase*> purchases;
    for (int i = 0; i < size; ++i) {
        jobject purchaseObj = env->CallObjectMethod(productsListObj, listGetMethod, i);
        cc::Purchase* purchase = cc::JniBillingHelper::toPurchase(env, purchaseObj);
        purchase->_id = startID++;
        purchases.push_back(purchase);
    }
    return std::move(purchases);
}

cc::Purchase* JniBillingHelper::toPurchase(JNIEnv* env, jobject purchaseObj) {
    jclass clazz = env->GetObjectClass(purchaseObj);
    auto* purchase = new cc::Purchase;

    jmethodID getAccountIdentifiers = env->GetMethodID(clazz, "getAccountIdentifiers", "()Lcom/android/billingclient/api/AccountIdentifiers;");
    jobject accountIdentifiersObj = env->CallObjectMethod(purchaseObj, getAccountIdentifiers);
    if (accountIdentifiersObj) {
        purchase->accountIdentifiers.reset(toAccountIdentifiers(env, accountIdentifiersObj));
    }

    purchase->developerPayload = callStringMethod(env, clazz, purchaseObj, "getDeveloperPayload");
    purchase->orderId = callStringMethod(env, clazz, purchaseObj, "getOrderId");
    purchase->originalJson = callStringMethod(env, clazz, purchaseObj, "getOriginalJson");
    purchase->packageName = callStringMethod(env, clazz, purchaseObj, "getPackageName");

    jmethodID getPendingPurchaseUpdate = env->GetMethodID(clazz, "getPendingPurchaseUpdate", "()Lcom/android/billingclient/api/Purchase$PendingPurchaseUpdate;");
    jobject pendingPurchaseUpdateObj = env->CallObjectMethod(purchaseObj, getPendingPurchaseUpdate);
    if (pendingPurchaseUpdateObj) {
        purchase->pendingPurchaseUpdate.reset(toPendingPurchaseUpdate(env, pendingPurchaseUpdateObj));
    }

    jmethodID methodId = env->GetMethodID(clazz, "getProducts", "()Ljava/util/List;");
    jobject listObj = env->CallObjectMethod(purchaseObj, methodId);
    jclass listClazz = env->GetObjectClass(listObj);
    jmethodID listGetMethod = env->GetMethodID(listClazz, "get", "(I)Ljava/lang/Object;");
    int size = callIntMethod(env, listClazz, listObj, "size");
    auto& products = purchase->products;
    for (int i = 0; i < size; ++i) {
        jobject strObj = env->CallObjectMethod(listObj, listGetMethod, i);
        products.push_back(cc::StringUtils::getStringUTFCharsJNI(env, static_cast<jstring>(strObj)));
    }
    purchase->purchaseState = callIntMethod(env, clazz, purchaseObj, "getPurchaseState");
    purchase->purchaseTime = callLongMethod(env, clazz, purchaseObj, "getPurchaseTime");
    purchase->purchaseToken = callStringMethod(env, clazz, purchaseObj, "getPurchaseToken");
    purchase->quantity = callIntMethod(env, clazz, purchaseObj, "getQuantity");
    purchase->signature = callStringMethod(env, clazz, purchaseObj, "getSignature");
    purchase->hashCode = callIntMethod(env, clazz, purchaseObj, "hashCode");
    purchase->isAcknowledged = callBooleanMethod(env, clazz, purchaseObj, "isAcknowledged");
    purchase->isAutoRenewing = callBooleanMethod(env, clazz, purchaseObj, "isAutoRenewing");
    purchase->toString = callStringMethod(env, clazz, purchaseObj, "toString");
    return purchase;
}

cc::BillingConfig* JniBillingHelper::toBillingConfig(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* billingConfig = new cc::BillingConfig;
    billingConfig->countryCode = callStringMethod(env, clazz, obj, "getCountryCode");
    return billingConfig;
}

cc::AlternativeBillingOnlyReportingDetails* JniBillingHelper::toAlternativeBillingOnlyReportingDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* alternativeBillingOnlyReportingDetails = new cc::AlternativeBillingOnlyReportingDetails;
    alternativeBillingOnlyReportingDetails->externalTransactionToken = callStringMethod(env, clazz, obj, "getExternalTransactionToken");
    return alternativeBillingOnlyReportingDetails;
}

cc::ExternalOfferReportingDetails* JniBillingHelper::toExternalOfferReportingDetails(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* externalOfferReportingDetails = new cc::ExternalOfferReportingDetails;
    externalOfferReportingDetails->externalTransactionToken = callStringMethod(env, clazz, obj, "getExternalTransactionToken");
    return externalOfferReportingDetails;
}

cc::InAppMessageResult* JniBillingHelper::toInAppMessageResult(JNIEnv* env, jobject obj) {
    jclass clazz = env->GetObjectClass(obj);
    auto* inAppMessageResult = new cc::InAppMessageResult;
    inAppMessageResult->responseCode = callIntMethod(env, clazz, obj, "getResponseCode");
    inAppMessageResult->purchaseToken = callStringMethod(env, clazz, obj, "getPurchaseToken");
    return inAppMessageResult;
}

} // namespace cc
