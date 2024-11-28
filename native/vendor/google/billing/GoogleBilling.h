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

#include <vector>

#include "base/Macros.h"
#include "base/RefCounted.h"

namespace cc {

class CC_DLL BillingResult : public cc::RefCounted {
public:
    int responseCode{0};
    std::string debugMessage;
    std::string toString;
};

class CC_DLL OneTimePurchaseOfferDetails {
public:
    long priceAmountMicros;
    std::string formattedPrice;
    std::string priceCurrencyCode;
};

class CC_DLL InstallmentPlanDetails {
public:
    int installmentPlanCommitmentPaymentsCount;
    int subsequentInstallmentPlanCommitmentPaymentsCount;
};

class CC_DLL PricingPhase {
public:
    int billingCycleCount;
    long priceAmountMicros;
    int recurrenceMode;
    std::string billingPeriod;
    std::string formattedPrice;
    std::string priceCurrencyCode;
};

class CC_DLL PricingPhases {
public:
    ~PricingPhases() {
        for (auto* pricingPhase : pricingPhaseList) {
            delete pricingPhase;
        }
        pricingPhaseList.clear();
    }
    std::vector<PricingPhase*> pricingPhaseList;
};

class CC_DLL SubscriptionOfferDetails {
public:
    std::string basePlanId;
    std::string offerId;
    std::string offerToken;
    std::vector<std::string> offerTags;
    std::unique_ptr<PricingPhases> pricingPhases;
    std::unique_ptr<InstallmentPlanDetails> installmentPlanDetails;
};

class CC_DLL ProductDetails : public cc::RefCounted {
public:
    ~ProductDetails() override;
    bool equals(const ProductDetails& other) const {
        return hashCode == other.hashCode;
    }
    int _id; // This is an ID that is not visible to ts and is used to free the java object.
    int hashCode;
    std::string description;
    std::string name;
    std::string productId;
    std::string productType;
    std::string title;
    std::string toString;
    std::unique_ptr<OneTimePurchaseOfferDetails> oneTimePurchaseOfferDetails;
    std::vector<SubscriptionOfferDetails*> subscriptionOfferDetails;
};


class CC_DLL AccountIdentifiers {
public:
    std::string obfuscatedAccountId;
    std::string obfuscatedProfileId;
};

class CC_DLL PendingPurchaseUpdate {
public:
    std::string purchaseToken;
    std::vector<std::string> products;
};

class CC_DLL Purchase : public  cc::RefCounted {
public:
    ~Purchase() override;
    bool equals(const Purchase& other) const {
        return hashCode == other.hashCode;
    }
    int _id; // This is an ID that is not visible to ts and is used to free the java object.
    bool isAcknowledged;
    bool isAutoRenewing;
    int purchaseState;
    int hashCode;
    int quantity;
    long purchaseTime;
    std::string developerPayload;
    std::string orderId;
    std::string originalJson;
    std::string packageName;
    std::string purchaseToken;
    std::string signature;
    std::string toString;
    std::unique_ptr<AccountIdentifiers> accountIdentifiers;
    std::unique_ptr<PendingPurchaseUpdate> pendingPurchaseUpdate;
    std::vector<std::string> products;
};

class CC_DLL BillingConfig : public  cc::RefCounted {
public:
    std::string countryCode;
};

class AlternativeBillingOnlyReportingDetails : public  cc::RefCounted{
public:
    std::string externalTransactionToken;
};

class ExternalOfferReportingDetails : public  cc::RefCounted{
public:
    std::string externalTransactionToken;
};

class InAppMessageResult : public  cc::RefCounted{
public:
    int responseCode;
    std::string purchaseToken;
};

class CC_DLL GoogleBilling {
public:
    static GoogleBilling &getInstance() {
        static GoogleBilling instance;
        return instance;
    }

    void startConnection();
    void endConnection();
    int getConnectionState() const;
    bool isReady() const;
    void queryProductDetailsParams(const std::vector<std::string>& productIds, const std::string& type);
    void launchBillingFlow(const std::vector<ProductDetails*>& productDetails, const std::string& selectedOfferToken);
    void consumePurchases(const std::vector<Purchase*>& purchase);
    void acknowledgePurchase(const std::vector<Purchase*>& purchase);
    void queryPurchasesAsync(const std::string& productType);
    void getBillingConfigAsync();

    void createAlternativeBillingOnlyReportingDetailsAsync();
    void isAlternativeBillingOnlyAvailableAsync();
    void createExternalOfferReportingDetailsAsync();
    void isExternalOfferAvailableAsync();
    BillingResult* isFeatureSupported(const std::string& feature);
    BillingResult* showAlternativeBillingOnlyInformationDialog();
    BillingResult* showExternalOfferInformationDialog();
    BillingResult* showInAppMessages();
private:
    GoogleBilling() = default;
};

} // namespace cc
