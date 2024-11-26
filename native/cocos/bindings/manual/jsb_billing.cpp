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
*****************************************************************************/

#include "application/ApplicationManager.h"
#include "bindings/jswrapper/SeApi.h"

#if CC_PLATFORM == CC_PLATFORM_ANDROID
    #include "bindings/jswrapper/SeApi.h"
    #include "bindings/manual/jsb_conversions.h"
    #include "bindings/manual/jsb_global.h"
    #include "cocos/platform/android/modules/google_play/billing/billing.h"
JSB_REGISTER_OBJECT_TYPE(cc::BillingResult);
JSB_REGISTER_OBJECT_TYPE(cc::OneTimePurchaseOfferDetails);
JSB_REGISTER_OBJECT_TYPE(cc::InstallmentPlanDetails);
JSB_REGISTER_OBJECT_TYPE(cc::PricingPhase);
JSB_REGISTER_OBJECT_TYPE(cc::SubscriptionOfferDetails);
JSB_REGISTER_OBJECT_TYPE(cc::ProductDetails);
JSB_REGISTER_OBJECT_TYPE(cc::AccountIdentifiers);
JSB_REGISTER_OBJECT_TYPE(cc::PendingPurchaseUpdate);
JSB_REGISTER_OBJECT_TYPE(cc::Purchase);
JSB_REGISTER_OBJECT_TYPE(cc::BillingConfig);
JSB_REGISTER_OBJECT_TYPE(cc::Billing);

#endif

#if CC_PLATFORM == CC_PLATFORM_ANDROID
SE_DECLARE_FINALIZE_FUNC(js_delete_cc_BillingResult)
static bool js_cc_BillingResult_debugMessage_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* arg1 = (cc::BillingResult*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::BillingResult>(s);
    if (nullptr == arg1) return true;
    result = arg1->debugMessage;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_BillingResult_debugMessage_get)

static bool js_cc_BillingResult_responseCode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* arg1 = (cc::BillingResult*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::BillingResult>(s);
    if (nullptr == arg1) return true;
    result = arg1->responseCode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    return true;
}
SE_BIND_PROP_GET(js_cc_BillingResult_responseCode_get)

static bool js_cc_BillingResult_toString_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* arg1 = (cc::BillingResult*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::BillingResult>(s);
    if (nullptr == arg1) return true;
    result = arg1->toString;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());
    return true;
}
SE_BIND_PROP_GET(js_cc_BillingResult_toString_get)

static bool js_delete_cc_BillingResult(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_BillingResult)

bool js_register_cc_BillingResult(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("BillingResult", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("debugMessage", _SE(js_cc_BillingResult_debugMessage_get), nullptr);
    cls->defineProperty("responseCode", _SE(js_cc_BillingResult_responseCode_get), nullptr);
    cls->defineProperty("toStr", _SE(js_cc_BillingResult_toString_get), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_BillingResult));

    cls->install();
    JSBClassType::registerClass<cc::BillingResult>(cls);
    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_OneTimePurchaseOfferDetails)

static bool js_cc_OneTimePurchaseOfferDetails_formattedPrice_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::OneTimePurchaseOfferDetails* arg1 = (cc::OneTimePurchaseOfferDetails*)NULL;

    arg1 = SE_THIS_OBJECT<cc::OneTimePurchaseOfferDetails>(s);
    if (nullptr == arg1) return true;

    ok &= nativevalue_to_se(arg1->formattedPrice, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(arg1->formattedPrice, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_OneTimePurchaseOfferDetails_formattedPrice_get)

static bool js_cc_OneTimePurchaseOfferDetails_priceAmountMicros_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::OneTimePurchaseOfferDetails* arg1 = (cc::OneTimePurchaseOfferDetails*)NULL;

    arg1 = SE_THIS_OBJECT<cc::OneTimePurchaseOfferDetails>(s);
    if (nullptr == arg1) return true;

    ok &= nativevalue_to_se(arg1->priceAmountMicros, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_OneTimePurchaseOfferDetails_priceAmountMicros_get)

static bool js_cc_OneTimePurchaseOfferDetails_priceCurrencyCode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::OneTimePurchaseOfferDetails* arg1 = (cc::OneTimePurchaseOfferDetails*)NULL;

    arg1 = SE_THIS_OBJECT<cc::OneTimePurchaseOfferDetails>(s);
    if (nullptr == arg1) return true;

    ok &= nativevalue_to_se(arg1->priceCurrencyCode, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(arg1->priceCurrencyCode, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_OneTimePurchaseOfferDetails_priceCurrencyCode_get)

static bool js_delete_cc_OneTimePurchaseOfferDetails(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_OneTimePurchaseOfferDetails)

bool js_register_cc_OneTimePurchaseOfferDetails(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("OneTimePurchaseOfferDetails", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("formattedPrice", _SE(js_cc_OneTimePurchaseOfferDetails_formattedPrice_get), nullptr);
    cls->defineProperty("priceAmountMicros", _SE(js_cc_OneTimePurchaseOfferDetails_priceAmountMicros_get), nullptr);
    cls->defineProperty("priceCurrencyCode", _SE(js_cc_OneTimePurchaseOfferDetails_priceCurrencyCode_get), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_OneTimePurchaseOfferDetails));

    cls->install();
    JSBClassType::registerClass<cc::OneTimePurchaseOfferDetails>(cls);
    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_InstallmentPlanDetails)
static bool js_cc_InstallmentPlanDetails_installmentPlanCommitmentPaymentsCount_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::InstallmentPlanDetails* arg1 = (cc::InstallmentPlanDetails*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::InstallmentPlanDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->installmentPlanCommitmentPaymentsCount;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_InstallmentPlanDetails_installmentPlanCommitmentPaymentsCount_get)

static bool js_cc_InstallmentPlanDetails_subsequentInstallmentPlanCommitmentPaymentsCount_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::InstallmentPlanDetails* arg1 = (cc::InstallmentPlanDetails*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::InstallmentPlanDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->subsequentInstallmentPlanCommitmentPaymentsCount;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_InstallmentPlanDetails_subsequentInstallmentPlanCommitmentPaymentsCount_get)

static bool js_delete_cc_InstallmentPlanDetails(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_InstallmentPlanDetails)

bool js_register_cc_InstallmentPlanDetails(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("InstallmentPlanDetails", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("installmentPlanCommitmentPaymentsCount", _SE(js_cc_InstallmentPlanDetails_installmentPlanCommitmentPaymentsCount_get), nullptr);
    cls->defineProperty("subsequentInstallmentPlanCommitmentPaymentsCount", _SE(js_cc_InstallmentPlanDetails_subsequentInstallmentPlanCommitmentPaymentsCount_get), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_InstallmentPlanDetails));

    cls->install();
    JSBClassType::registerClass<cc::InstallmentPlanDetails>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}
SE_DECLARE_FINALIZE_FUNC(js_delete_cc_PricingPhase)

static bool js_cc_PricingPhase_billingCycleCount_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->billingCycleCount;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_billingCycleCount_get)

static bool js_cc_PricingPhase_priceAmountMicros_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    long result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->priceAmountMicros;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_priceAmountMicros_get)

static bool js_cc_PricingPhase_recurrenceMode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->recurrenceMode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_recurrenceMode_get)

static bool js_cc_PricingPhase_billingPeriod_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->billingPeriod;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_billingPeriod_get)

static bool js_cc_PricingPhase_formattedPrice_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->formattedPrice;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_formattedPrice_get)

static bool js_cc_PricingPhase_priceCurrencyCode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PricingPhase* arg1 = (cc::PricingPhase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::PricingPhase>(s);
    if (nullptr == arg1) return true;
    result = arg1->priceCurrencyCode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhase_priceCurrencyCode_get)

static bool js_delete_cc_PricingPhase(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_PricingPhase)

bool js_register_cc_PricingPhase(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("PricingPhase", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("billingCycleCount", _SE(js_cc_PricingPhase_billingCycleCount_get), nullptr);
    cls->defineProperty("priceAmountMicros", _SE(js_cc_PricingPhase_priceAmountMicros_get), nullptr);
    cls->defineProperty("recurrenceMode", _SE(js_cc_PricingPhase_recurrenceMode_get), nullptr);
    cls->defineProperty("billingPeriod", _SE(js_cc_PricingPhase_billingPeriod_get), nullptr);
    cls->defineProperty("formattedPrice", _SE(js_cc_PricingPhase_formattedPrice_get), nullptr);
    cls->defineProperty("priceCurrencyCode", _SE(js_cc_PricingPhase_priceCurrencyCode_get), nullptr);
    cls->defineFinalizeFunction(_SE(js_delete_cc_PricingPhase));

    cls->install();
    JSBClassType::registerClass<cc::PricingPhase>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_PricingPhases)
static bool js_cc_PricingPhases_pricingPhaseList_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    cc::PricingPhases* result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->pricingPhases.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PricingPhases_pricingPhaseList_get)
static bool js_delete_cc_PricingPhases(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_PricingPhases)
bool js_register_cc_PricingPhases(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("PricingPhases", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("pricingPhaseList", _SE(js_cc_PricingPhases_pricingPhaseList_get), nullptr);
    cls->defineFinalizeFunction(_SE(js_delete_cc_PricingPhases));

    cls->install();
    JSBClassType::registerClass<cc::PricingPhases>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_SubscriptionOfferDetails)

static bool js_cc_SubscriptionOfferDetails_basePlanId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->basePlanId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_basePlanId_get)

static bool js_cc_SubscriptionOfferDetails_installmentPlanDetails_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    cc::InstallmentPlanDetails* result = 0;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->installmentPlanDetails.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_installmentPlanDetails_get)

static bool js_cc_SubscriptionOfferDetails_offerId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->offerId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_offerId_get)

static bool js_cc_SubscriptionOfferDetails_offerTags_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    std::vector<std::string> result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->offerTags;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_offerTags_get)

static bool js_cc_SubscriptionOfferDetails_offerToken_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->offerToken;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_offerToken_get)

static bool js_cc_SubscriptionOfferDetails_pricingPhases_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::SubscriptionOfferDetails* arg1 = (cc::SubscriptionOfferDetails*)NULL;
    cc::PricingPhases* result;

    arg1 = SE_THIS_OBJECT<cc::SubscriptionOfferDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->pricingPhases.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_SubscriptionOfferDetails_pricingPhases_get)

static bool js_delete_cc_SubscriptionOfferDetails(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_SubscriptionOfferDetails)

bool js_register_cc_SubscriptionOfferDetails(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("SubscriptionOfferDetails", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("basePlanId", _SE(js_cc_SubscriptionOfferDetails_basePlanId_get), nullptr);
    cls->defineProperty("installmentPlanDetails", _SE(js_cc_SubscriptionOfferDetails_installmentPlanDetails_get), nullptr);
    cls->defineProperty("offerId", _SE(js_cc_SubscriptionOfferDetails_offerId_get), nullptr);
    cls->defineProperty("offerTags", _SE(js_cc_SubscriptionOfferDetails_offerTags_get), nullptr);
    cls->defineProperty("offerToken", _SE(js_cc_SubscriptionOfferDetails_offerToken_get), nullptr);
    cls->defineProperty("pricingPhases", _SE(js_cc_SubscriptionOfferDetails_pricingPhases_get), nullptr);
    cls->defineFinalizeFunction(_SE(js_delete_cc_SubscriptionOfferDetails));

    cls->install();
    JSBClassType::registerClass<cc::SubscriptionOfferDetails>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_ProductDetails)

static bool js_cc_ProductDetails_equals(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    cc::ProductDetails* arg2 = (cc::ProductDetails*)NULL;
    bool result;
    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;

    ok &= sevalue_to_native(args[0], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    result = (bool)((cc::ProductDetails const*)arg1)->equals(*arg2);

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    return true;
}
SE_BIND_FUNC(js_cc_ProductDetails_equals)

static bool js_cc_ProductDetails_hashCode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->hashCode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_hashCode_get)

static bool js_cc_ProductDetails_description_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->description;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_description_get)

static bool js_cc_ProductDetails_name_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->name;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_name_get)

static bool js_cc_ProductDetails_oneTimePurchaseOfferDetails_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    cc::OneTimePurchaseOfferDetails* result = 0;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->oneTimePurchaseOfferDetails.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_oneTimePurchaseOfferDetails_get)

static bool js_cc_ProductDetails_productId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->productId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_productId_get)

static bool js_cc_ProductDetails_productType_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->productType;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_productType_get)

static bool js_cc_ProductDetails_title_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->title;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_title_get)

static bool js_cc_ProductDetails_toString_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->toString;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_toString_get)

static bool js_cc_ProductDetails_subscriptionOfferDetails_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::ProductDetails* arg1 = (cc::ProductDetails*)NULL;
    std::vector<cc::SubscriptionOfferDetails*> result;

    arg1 = SE_THIS_OBJECT<cc::ProductDetails>(s);
    if (nullptr == arg1) return true;
    result = arg1->subscriptionOfferDetails;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_ProductDetails_subscriptionOfferDetails_get)

static bool js_delete_cc_ProductDetails(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_ProductDetails)

bool js_register_cc_ProductDetails(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("ProductDetails", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("hashCode", _SE(js_cc_ProductDetails_hashCode_get), nullptr);
    cls->defineProperty("description", _SE(js_cc_ProductDetails_description_get), nullptr);
    cls->defineProperty("name", _SE(js_cc_ProductDetails_name_get), nullptr);
    cls->defineProperty("oneTimePurchaseOfferDetails", _SE(js_cc_ProductDetails_oneTimePurchaseOfferDetails_get), nullptr);
    cls->defineProperty("productId", _SE(js_cc_ProductDetails_productId_get), nullptr);
    cls->defineProperty("productType", _SE(js_cc_ProductDetails_productType_get), nullptr);
    cls->defineProperty("title", _SE(js_cc_ProductDetails_title_get), nullptr);
    cls->defineProperty("toStr", _SE(js_cc_ProductDetails_toString_get), nullptr);
    cls->defineProperty("subscriptionOfferDetails", _SE(js_cc_ProductDetails_subscriptionOfferDetails_get), nullptr);

    cls->defineFunction("equals", _SE(js_cc_ProductDetails_equals));

    cls->defineFinalizeFunction(_SE(js_delete_cc_ProductDetails));

    cls->install();
    JSBClassType::registerClass<cc::ProductDetails>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_AccountIdentifiers)

static bool js_cc_AccountIdentifiers_obfuscatedAccountId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::AccountIdentifiers* arg1 = (cc::AccountIdentifiers*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::AccountIdentifiers>(s);
    if (nullptr == arg1) return true;
    result = arg1->obfuscatedAccountId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_AccountIdentifiers_obfuscatedAccountId_get)

static bool js_cc_AccountIdentifiers_obfuscatedProfileId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::AccountIdentifiers* arg1 = (cc::AccountIdentifiers*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::AccountIdentifiers>(s);
    if (nullptr == arg1) return true;
    result = arg1->obfuscatedProfileId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_AccountIdentifiers_obfuscatedProfileId_get)

static bool js_delete_cc_AccountIdentifiers(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_AccountIdentifiers)

bool js_register_cc_AccountIdentifiers(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("AccountIdentifiers", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("obfuscatedAccountId", _SE(js_cc_AccountIdentifiers_obfuscatedAccountId_get), nullptr);
    cls->defineProperty("obfuscatedProfileId", _SE(js_cc_AccountIdentifiers_obfuscatedProfileId_get), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_AccountIdentifiers));

    cls->install();
    JSBClassType::registerClass<cc::AccountIdentifiers>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_PendingPurchaseUpdate)

static bool js_cc_PendingPurchaseUpdate_products_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PendingPurchaseUpdate* arg1 = (cc::PendingPurchaseUpdate*)NULL;
    std::vector<std::string> result;

    arg1 = SE_THIS_OBJECT<cc::PendingPurchaseUpdate>(s);
    if (nullptr == arg1) return true;
    result = arg1->products;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PendingPurchaseUpdate_products_get)

static bool js_cc_PendingPurchaseUpdate_purchaseToken_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::PendingPurchaseUpdate* arg1 = (cc::PendingPurchaseUpdate*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::PendingPurchaseUpdate>(s);
    if (nullptr == arg1) return true;
    result = arg1->purchaseToken;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_PendingPurchaseUpdate_purchaseToken_get)

static bool js_delete_cc_PendingPurchaseUpdate(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_PendingPurchaseUpdate)

bool js_register_cc_PendingPurchaseUpdate(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("PendingPurchaseUpdate", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("products", _SE(js_cc_PendingPurchaseUpdate_products_get), nullptr);
    cls->defineProperty("purchaseToken", _SE(js_cc_PendingPurchaseUpdate_purchaseToken_get), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_PendingPurchaseUpdate));

    cls->install();
    JSBClassType::registerClass<cc::PendingPurchaseUpdate>(cls);
    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_Purchase)

static bool js_cc_Purchase_equals(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    cc::Purchase* arg2 = 0;
    cc::Purchase temp2;
    bool result;

    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;

    result = (bool)((cc::Purchase const*)arg1)->equals((cc::Purchase const&)*arg2);

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_FUNC(js_cc_Purchase_equals)

static bool js_cc_Purchase_accountIdentifiers_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    cc::AccountIdentifiers* result = 0;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->accountIdentifiers.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_accountIdentifiers_get)

static bool js_cc_Purchase_developerPayload_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->developerPayload;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_developerPayload_get)

static bool js_cc_Purchase_orderId_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->orderId;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_orderId_get)

static bool js_cc_Purchase_originalJson_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->originalJson;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_originalJson_get)

static bool js_cc_Purchase_packageName_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->packageName;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_packageName_get)

static bool js_cc_Purchase_pendingPurchaseUpdate_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    cc::PendingPurchaseUpdate* result = 0;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->pendingPurchaseUpdate.get();

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_pendingPurchaseUpdate_get)

static bool js_cc_Purchase_products_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::vector<std::string> result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->products;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_products_get)

static bool js_cc_Purchase_purchaseState_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->purchaseState;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_purchaseState_get)

static bool js_cc_Purchase_purchaseTime_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    long result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = (long)arg1->purchaseTime;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_purchaseTime_get)

static bool js_cc_Purchase_purchaseToken_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->purchaseToken;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_purchaseToken_get)

static bool js_cc_Purchase_quantity_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->quantity;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_quantity_get)

static bool js_cc_Purchase_signature_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->signature;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_signature_get)

static bool js_cc_Purchase_hashCode_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    int result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->hashCode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_hashCode_get)

static bool js_cc_Purchase_isAcknowledged_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    bool result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->isAcknowledged;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_isAcknowledged_get)

static bool js_cc_Purchase_isAutoRenewing_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    bool result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->isAutoRenewing;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_isAutoRenewing_get)

static bool js_cc_Purchase_toString_get(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::Purchase* arg1 = (cc::Purchase*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::Purchase>(s);
    if (nullptr == arg1) return true;
    result = arg1->toString;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_Purchase_toString_get)

static bool js_delete_cc_Purchase(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_Purchase)

bool js_register_cc_Purchase(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("Purchase", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);
    cls->defineProperty("accountIdentifiers", _SE(js_cc_Purchase_accountIdentifiers_get), nullptr);
    cls->defineProperty("developerPayload", _SE(js_cc_Purchase_developerPayload_get), nullptr);
    cls->defineProperty("orderId", _SE(js_cc_Purchase_orderId_get), nullptr);
    cls->defineProperty("originalJson", _SE(js_cc_Purchase_originalJson_get), nullptr);
    cls->defineProperty("packageName", _SE(js_cc_Purchase_packageName_get), nullptr);
    cls->defineProperty("pendingPurchaseUpdate", _SE(js_cc_Purchase_pendingPurchaseUpdate_get), nullptr);
    cls->defineProperty("products", _SE(js_cc_Purchase_products_get), nullptr);
    cls->defineProperty("purchaseState", _SE(js_cc_Purchase_purchaseState_get), nullptr);
    cls->defineProperty("purchaseTime", _SE(js_cc_Purchase_purchaseTime_get), nullptr);
    cls->defineProperty("purchaseToken", _SE(js_cc_Purchase_purchaseToken_get), nullptr);
    cls->defineProperty("quantity", _SE(js_cc_Purchase_quantity_get), nullptr);
    cls->defineProperty("signature", _SE(js_cc_Purchase_signature_get), nullptr);
    cls->defineProperty("hashCode", _SE(js_cc_Purchase_hashCode_get), nullptr);
    cls->defineProperty("isAcknowledged", _SE(js_cc_Purchase_isAcknowledged_get), nullptr);
    cls->defineProperty("isAutoRenewing", _SE(js_cc_Purchase_isAutoRenewing_get), nullptr);
    cls->defineProperty("toStr", _SE(js_cc_Purchase_toString_get), nullptr);

    cls->defineFunction("equals", _SE(js_cc_Purchase_equals));

    cls->defineFinalizeFunction(_SE(js_delete_cc_Purchase));

    cls->install();
    JSBClassType::registerClass<cc::Purchase>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

static bool js_cc_BillingConfig_countryCode(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingConfig* arg1 = (cc::BillingConfig*)NULL;
    std::string result;

    arg1 = SE_THIS_OBJECT<cc::BillingConfig>(s);
    if (nullptr == arg1) return true;
    result = arg1->countryCode;

    ok &= nativevalue_to_se(result, s.rval(), s.thisObject() /*ctx*/);
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    SE_HOLD_RETURN_VALUE(result, s.thisObject(), s.rval());

    return true;
}
SE_BIND_PROP_GET(js_cc_BillingConfig_countryCode)

static bool js_delete_cc_BillingConfig(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_BillingConfig)

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_BillingConfig)

bool js_register_cc_BillingConfig(se::Object* obj) { // NOLINT
    auto* cls = se::Class::create("BillingConfig", obj, nullptr, nullptr);

    cls->defineStaticProperty("__isJSB", se::Value(true), se::PropertyAttribute::READ_ONLY | se::PropertyAttribute::DONT_ENUM | se::PropertyAttribute::DONT_DELETE);

    cls->defineProperty("countryCode", _SE(js_cc_BillingConfig_countryCode), nullptr);

    cls->defineFinalizeFunction(_SE(js_delete_cc_BillingConfig));

    cls->install();
    JSBClassType::registerClass<cc::BillingConfig>(cls);

    se::ScriptEngine::getInstance()->clearException();
    return true;
}

SE_DECLARE_FINALIZE_FUNC(js_delete_cc_Billing)

static bool js_cc_Billing_startConnection(se::State& s) { // NOLINT
    cc::Billing::getInstance().startConnection();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_startConnection)

static bool js_cc_Billing_endConnection(se::State& s) { // NOLINT
    cc::Billing::getInstance().endConnection();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_endConnection)

static bool js_cc_Billing_getConnectionState(se::State& s) { // NOLINT
    int connectionState = cc::Billing::getInstance().getConnectionState();
    s.rval().setFloat(connectionState);
    return true;
}
SE_BIND_FUNC(js_cc_Billing_getConnectionState)

static bool js_cc_Billing_isReady(se::State& s) {
    int isReady = cc::Billing::getInstance().isReady();
    s.rval().setFloat(isReady);
    return true;
}
SE_BIND_FUNC(js_cc_Billing_isReady)

static bool js_cc_Billing_queryProductDetailsParams(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();

    std::vector<std::string>* arg2 = 0;
    std::string* arg3 = 0;
    std::vector<std::string> temp2;
    std::string temp3;

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;

    ok &= sevalue_to_native(args[1], &temp3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg3 = &temp3;

    cc::Billing::getInstance().queryProductDetailsParams((std::vector<std::string> const&)*arg2, (std::string const&)*arg3);
    return true;
}
SE_BIND_FUNC(js_cc_Billing_queryProductDetailsParams)

static bool js_cc_Billing_launchBillingFlow(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();

    std::vector<cc::ProductDetails*>* arg2 = 0;
    std::string* arg3 = 0;
    std::vector<cc::ProductDetails*> temp2;
    std::string temp3;

    if (argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;

    ok &= sevalue_to_native(args[1], &temp3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg3 = &temp3;

    cc::Billing::getInstance().launchBillingFlow((std::vector<cc::ProductDetails*> const&)*arg2, (std::string const&)*arg3);

    return true;
}
SE_BIND_FUNC(js_cc_Billing_launchBillingFlow)

static bool js_cc_Billing_consumePurchases(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    std::vector<cc::Purchase*>* arg2 = 0;
    std::vector<cc::Purchase*> temp2;

    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;

    cc::Billing::getInstance().consumePurchases((std::vector<cc::Purchase*> const&)*arg2);

    return true;
}
SE_BIND_FUNC(js_cc_Billing_consumePurchases)

static bool js_cc_Billing_acknowledgePurchase(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    std::vector<cc::Purchase*>* arg1 = 0;
    std::vector<cc::Purchase*> temp2;

    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1 = &temp2;

    cc::Billing::getInstance().acknowledgePurchase((std::vector<cc::Purchase*> const&)*arg1);

    return true;
}
SE_BIND_FUNC(js_cc_Billing_acknowledgePurchase)

static bool js_cc_Billing_queryPurchasesAsync(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    std::string* arg2 = 0;
    std::string temp2;

    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg2 = &temp2;

    cc::Billing::getInstance().queryPurchasesAsync((std::string const&)*arg2);

    return true;
}
SE_BIND_FUNC(js_cc_Billing_queryPurchasesAsync)

static bool js_cc_Billing_getBillingConfigAsync(se::State& s) { // NOLINT
    cc::Billing::getInstance().getBillingConfigAsync();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_getBillingConfigAsync)

static bool js_cc_Billing_createAlternativeBillingOnlyReportingDetailsAsync(se::State& s) { // NOLINT
    cc::Billing::getInstance().createAlternativeBillingOnlyReportingDetailsAsync();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_createAlternativeBillingOnlyReportingDetailsAsync)

static bool js_cc_Billing_isAlternativeBillingOnlyAvailableAsync(se::State& s) { // NOLINT
    cc::Billing::getInstance().isAlternativeBillingOnlyAvailableAsync();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_isAlternativeBillingOnlyAvailableAsync)

static bool js_cc_Billing_createExternalOfferReportingDetailsAsync(se::State& s) { // NOLINT
    cc::Billing::getInstance().createExternalOfferReportingDetailsAsync();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_createExternalOfferReportingDetailsAsync)

static bool js_cc_Billing_isExternalOfferAvailableAsync(se::State& s) { // NOLINT
    cc::Billing::getInstance().isExternalOfferAvailableAsync();
    return true;
}
SE_BIND_FUNC(js_cc_Billing_isExternalOfferAvailableAsync)

static bool js_cc_Billing_isFeatureSupported(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    std::string temp2;

    if (argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }

    ok &= sevalue_to_native(args[0], &temp2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");

    cc::BillingResult* result = cc::Billing::getInstance().isFeatureSupported(temp2);

    ok &= nativevalue_to_se(*result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    return true;
}
SE_BIND_FUNC(js_cc_Billing_isFeatureSupported)

static bool js_cc_Billing_showAlternativeBillingOnlyInformationDialog(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* result = cc::Billing::getInstance().showAlternativeBillingOnlyInformationDialog();
    ok &= nativevalue_to_se(*result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    return true;
}
SE_BIND_FUNC(js_cc_Billing_showAlternativeBillingOnlyInformationDialog)

static bool js_cc_Billing_showExternalOfferInformationDialog(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* result = cc::Billing::getInstance().showExternalOfferInformationDialog();
    ok &= nativevalue_to_se(*result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    return true;
}
SE_BIND_FUNC(js_cc_Billing_showExternalOfferInformationDialog)

static bool js_cc_Billing_showInAppMessages(se::State& s) { // NOLINT
    CC_UNUSED bool ok = true;
    cc::BillingResult* result = cc::Billing::getInstance().showInAppMessages();
    ok &= nativevalue_to_se(*result, s.rval(), s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    return true;
}
SE_BIND_FUNC(js_cc_Billing_showInAppMessages)

static bool js_delete_cc_Billing(se::State& s) { // NOLINT
    return true;
}
SE_BIND_FINALIZE_FUNC(js_delete_cc_Billing)

bool js_register_cc_Billing(se::Object* obj) { // NOLINT
    se::Value billingVal{se::Object::createPlainObject()};
    auto* cls = billingVal.toObject();

    cls->defineFunction("startConnection", _SE(js_cc_Billing_startConnection));
    cls->defineFunction("endConnection", _SE(js_cc_Billing_endConnection));
    cls->defineFunction("getConnectionState", _SE(js_cc_Billing_getConnectionState));
    cls->defineFunction("isReady", _SE(js_cc_Billing_isReady));
    cls->defineFunction("queryProductDetailsParams", _SE(js_cc_Billing_queryProductDetailsParams));

    cls->defineFunction("launchBillingFlow", _SE(js_cc_Billing_launchBillingFlow));
    cls->defineFunction("consumePurchases", _SE(js_cc_Billing_consumePurchases));
    cls->defineFunction("acknowledgePurchase", _SE(js_cc_Billing_acknowledgePurchase));
    cls->defineFunction("queryPurchasesAsync", _SE(js_cc_Billing_queryPurchasesAsync));
    cls->defineFunction("getBillingConfigAsync", _SE(js_cc_Billing_getBillingConfigAsync));

    cls->defineFunction("createAlternativeBillingOnlyReportingDetailsAsync", _SE(js_cc_Billing_createAlternativeBillingOnlyReportingDetailsAsync));
    cls->defineFunction("isAlternativeBillingOnlyAvailableAsync", _SE(js_cc_Billing_isAlternativeBillingOnlyAvailableAsync));
    cls->defineFunction("createExternalOfferReportingDetailsAsync", _SE(js_cc_Billing_createExternalOfferReportingDetailsAsync));
    cls->defineFunction("isExternalOfferAvailableAsync", _SE(js_cc_Billing_isExternalOfferAvailableAsync));

    cls->defineFunction("isFeatureSupported", _SE(js_cc_Billing_isFeatureSupported));

    cls->defineFunction("showAlternativeBillingOnlyInformationDialog", _SE(js_cc_Billing_showAlternativeBillingOnlyInformationDialog));
    cls->defineFunction("showExternalOfferInformationDialog", _SE(js_cc_Billing_showExternalOfferInformationDialog));
    cls->defineFunction("showInAppMessages", _SE(js_cc_Billing_showInAppMessages));

    obj->setProperty("billing", billingVal);

    return true;
}

bool jsb_register_all_billing(se::Object* obj) { // NOLINT
    se::Value nsVal;
    if (!obj->getProperty("jsb", &nsVal, true)) {
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        obj->setProperty("jsb", nsVal);
    }
    se::Object* ns = nsVal.toObject();
    /* Register classes */
    js_register_cc_BillingResult(ns);
    js_register_cc_OneTimePurchaseOfferDetails(ns);
    js_register_cc_InstallmentPlanDetails(ns);
    js_register_cc_PricingPhases(ns);
    js_register_cc_PricingPhase(ns);

    js_register_cc_SubscriptionOfferDetails(ns);
    js_register_cc_ProductDetails(ns);
    js_register_cc_AccountIdentifiers(ns);
    js_register_cc_PendingPurchaseUpdate(ns);
    js_register_cc_Purchase(ns);
    js_register_cc_BillingConfig(ns);
    js_register_cc_Billing(ns);
    return true;
}

#else
void jsb_register_all_billing(se::Object *ns) {} // NOLINT

#endif // CC_PLATFORM_ANDROID
