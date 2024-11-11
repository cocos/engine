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

#include "platform/android/modules/google_play/billing/billing.h"
#include "platform/android/modules/google_play/billing/JniBillingHelper.h"
#include "platform/java/jni/JniHelper.h"
#include "platform/java/jni/JniImp.h"

namespace cc {

void Billing::startConnection() {
    JniBillingHelper::startConnection();
}

void Billing::endConnection() {
    JniBillingHelper::endConnection();
}

int Billing::getConnectionState() const {
    return JniBillingHelper::getConnectionState();
}

bool Billing::isReady() const {
    return JniBillingHelper::isReady();
}

void Billing::queryProductDetailsParams(const std::vector<std::string>& productIds, const std::string& type) {
    JniBillingHelper::queryProductDetailsParams(productIds, type);
}

void Billing::launchBillingFlow(const std::vector<ProductDetails*>& productDetailsList, const std::string& selectedOfferToken) {
    JniBillingHelper::launchBillingFlow(productDetailsList, selectedOfferToken);
}

void Billing::consumePurchases(const std::vector<Purchase*>& purchases) {
    JniBillingHelper::consumePurchases(purchases);
}

void Billing::acknowledgePurchase(const std::vector<Purchase*>& purchases) {
    JniBillingHelper::acknowledgePurchase(purchases);
}

void Billing::queryPurchasesAsync(const std::string& productType) {
    JniBillingHelper::queryPurchasesAsync(productType);
}

void Billing::getBillingConfigAsync() {
    JniBillingHelper::getBillingConfigAsync();
}

BillingResult* Billing::isFeatureSupported(const std::string& feature) {
    return JniBillingHelper::isFeatureSupported(feature);
}

void Billing::createAlternativeBillingOnlyReportingDetailsAsync() {
    JniBillingHelper::createAlternativeBillingOnlyReportingDetailsAsync();
}

void Billing::isAlternativeBillingOnlyAvailableAsync() {
    JniBillingHelper::isAlternativeBillingOnlyAvailableAsync();
}

void Billing::createExternalOfferReportingDetailsAsync() {
    JniBillingHelper::createExternalOfferReportingDetailsAsync();
}

void Billing::isExternalOfferAvailableAsync() {
    JniBillingHelper::isExternalOfferAvailableAsync();
}

BillingResult* Billing::showAlternativeBillingOnlyInformationDialog() {
    return JniBillingHelper::showAlternativeBillingOnlyInformationDialog();
}

BillingResult* Billing::showExternalOfferInformationDialog() {
    return JniBillingHelper::showExternalOfferInformationDialog();
}

BillingResult* Billing::showInAppMessages() {
    return JniBillingHelper::showInAppMessages();
}

} // namespace cc
