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

#include "vendor/google/billing/GoogleBilling.h"
#include "vendor/google/billing/GoogleBillingHelper.h"
#include "platform/java/jni/JniHelper.h"
#include "platform/java/jni/JniImp.h"

namespace cc {

ProductDetails::~ProductDetails() {
    for (auto* ptr : subscriptionOfferDetails) {
        delete ptr;
    }
    subscriptionOfferDetails.clear();
    GoogleBillingHelper::removeProductDetails(_id);
}

Purchase::~Purchase() {
    GoogleBillingHelper::removePurchase(_id);
}

void GoogleBilling::startConnection() {
    GoogleBillingHelper::startConnection();
}

void GoogleBilling::endConnection() {
    GoogleBillingHelper::endConnection();
}

int GoogleBilling::getConnectionState() const {
    return GoogleBillingHelper::getConnectionState();
}

bool GoogleBilling::isReady() const {
    return GoogleBillingHelper::isReady();
}

void GoogleBilling::queryProductDetailsParams(const std::vector<std::string>& productIds, const std::string& type) {
    GoogleBillingHelper::queryProductDetailsParams(productIds, type);
}

void GoogleBilling::launchBillingFlow(const std::vector<ProductDetails*>& productDetailsList, const std::string& selectedOfferToken) {
    GoogleBillingHelper::launchBillingFlow(productDetailsList, selectedOfferToken);
}

void GoogleBilling::consumePurchases(const std::vector<Purchase*>& purchases) {
    GoogleBillingHelper::consumePurchases(purchases);
}

void GoogleBilling::acknowledgePurchase(const std::vector<Purchase*>& purchases) {
    GoogleBillingHelper::acknowledgePurchase(purchases);
}

void GoogleBilling::queryPurchasesAsync(const std::string& productType) {
    GoogleBillingHelper::queryPurchasesAsync(productType);
}

void GoogleBilling::getBillingConfigAsync() {
    GoogleBillingHelper::getBillingConfigAsync();
}

BillingResult* GoogleBilling::isFeatureSupported(const std::string& feature) {
    return GoogleBillingHelper::isFeatureSupported(feature);
}

void GoogleBilling::createAlternativeBillingOnlyReportingDetailsAsync() {
    GoogleBillingHelper::createAlternativeBillingOnlyReportingDetailsAsync();
}

void GoogleBilling::isAlternativeBillingOnlyAvailableAsync() {
    GoogleBillingHelper::isAlternativeBillingOnlyAvailableAsync();
}

void GoogleBilling::createExternalOfferReportingDetailsAsync() {
    GoogleBillingHelper::createExternalOfferReportingDetailsAsync();
}

void GoogleBilling::isExternalOfferAvailableAsync() {
    GoogleBillingHelper::isExternalOfferAvailableAsync();
}

BillingResult* GoogleBilling::showAlternativeBillingOnlyInformationDialog() {
    return GoogleBillingHelper::showAlternativeBillingOnlyInformationDialog();
}

BillingResult* GoogleBilling::showExternalOfferInformationDialog() {
    return GoogleBillingHelper::showExternalOfferInformationDialog();
}

BillingResult* GoogleBilling::showInAppMessages() {
    return GoogleBillingHelper::showInAppMessages();
}

} // namespace cc
