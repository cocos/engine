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
#include "cocos/bindings/jswrapper/SeApi.h"
#include "platform/java/jni/JniHelper.h"
#include "platform/java/jni/JniImp.h"
#include "vendor/google/billing/result-values/BillingResult.h"
#include "vendor/google/billing/GoogleBillingHelper.h"
#include "vendor/google/billing/GoogleBillingManager.h"
#include "vendor/google/billing/build-params/AcknowledgePurchaseParams.h"
#include "vendor/google/billing/build-params/BillingFlowParams.h"
#include "vendor/google/billing/build-params/ConsumeParams.h"
#include "vendor/google/billing/build-params/GetBillingConfigParams.h"
#include "vendor/google/billing/build-params/InAppMessageParams.h"
#include "vendor/google/billing/build-params/PendingPurchasesParams.h"
#include "vendor/google/billing/build-params/QueryProductDetailsParams.h"
#include "vendor/google/billing/build-params/QueryPurchasesParams.h"

namespace cc {
BillingClient::scopedListener::scopedListener(se::Object* obj) : _obj(obj) {
    if (_obj) {
        _obj->root();
        _obj->incRef();
    }
}

BillingClient::scopedListener::~scopedListener() {
    if (_obj) {
        _obj->unroot();
        _obj->decRef();
    }
}

void BillingClient::scopedListener::reset(se::Object* obj) {
    if (_obj) {
        _obj->unroot();
        _obj->decRef();
    }
    _obj = obj;
    if (_obj) {
        _obj->root();
        _obj->incRef();
    }
}

BillingClient::Builder& BillingClient::Builder::enableUserChoiceBilling(se::Object* listener) {
    if (!listener) {
        CC_LOG_WARNING("Can't set an empty listener.");
        return *this;
    }

    _userChoiceBillingListener.reset(listener);
    return *this;
}

BillingClient::Builder& BillingClient::Builder::setListener(se::Object* listener) {
    if (!listener) {
        CC_LOG_WARNING("Can't set an empty listener.");
        return *this;
    }
    _purchasesUpdatedListener.reset(listener);
    return *this;
}

BillingClient::BillingClient(Builder* builder) {
    this->_enableAlternativeBillingOnly = builder->_enableAlternativeBillingOnly;
    this->_enableExternalOffer = builder->_enableExternalOffer;
    this->_pendingPurchasesParams = builder->_pendingPurchasesParams;

    _purchasesUpdatedListener.reset(builder->_purchasesUpdatedListener.get());
    _userChoiceBillingListener.reset(builder->_userChoiceBillingListener.get());

    _tag = GoogleBillingHelper::createGoogleBilling(builder);

    CC_ASSERT(_tag >= 0);
    GoogleBillingManager::getInstance()->pushBillingClient(_tag, this);
    delete builder;
}

BillingClient::~BillingClient() {
    CC_ASSERT(_tag >= 0);
    GoogleBillingHelper::removeGoogleBilling(_tag);
    GoogleBillingManager::getInstance()->removeGoogleBilling(_tag);
    _listeners.clear();
}

int BillingClient::getNextListenerId() {
    return _nextListnerId++;
}

int BillingClient::addListener(se::Object* listener) {
    int listenerId = getNextListenerId();
    _listeners[listenerId].reset(listener);
    return listenerId;
}

void BillingClient::startConnection(se::Object* listener) {
    int listenerId = addListener(listener);
    GoogleBillingHelper::startConnection(_tag, listenerId);
}

void BillingClient::endConnection() {
    GoogleBillingHelper::endConnection(_tag);
}

int BillingClient::getConnectionState() const {
    return GoogleBillingHelper::getConnectionState(_tag);
}

bool BillingClient::isReady() const {
    return GoogleBillingHelper::isReady(_tag);
}

void BillingClient::queryProductDetailsAsync(QueryProductDetailsParams* params, se::Object* listener) {
    if(!params || !listener) {
        CC_LOG_WARNING("QueryProductDetailsParams or listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    std::vector<std::string> productIds;
    std::vector<std::string> productTypes;
    size_t size = params->_productList.size();
    productIds.reserve(size);
    productTypes.reserve(size);
    for (auto product : params->_productList) {
        productIds.push_back(product->_productId);
        productTypes.push_back(product->_productType);
    }
    GoogleBillingHelper::queryProductDetailsAsync(_tag, listenerId, productIds, productTypes);
}

void BillingClient::launchBillingFlow(BillingFlowParams* params) {
    if(!params) {
        CC_LOG_WARNING("BillingFlowParams can't be null");
        return;
    }
    GoogleBillingHelper::launchBillingFlow(_tag, params);
}

void BillingClient::consumeAsync(ConsumeParams* params, se::Object* listener) {
    if(!params || !listener) {
        CC_LOG_WARNING("ConsumeParams or listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::consumeAsync(_tag, listenerId, params);
}

void BillingClient::acknowledgePurchase(AcknowledgePurchaseParams* params, se::Object* listener) {
    if(!params || !listener) {
        CC_LOG_WARNING("AcknowledgePurchaseParams or listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::acknowledgePurchase(_tag, listenerId, params);
}

void BillingClient::queryPurchasesAsync(QueryPurchasesParams* params, se::Object* listener) {
    if(!params || !listener) {
        CC_LOG_WARNING("QueryPurchasesParams or listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::queryPurchasesAsync(_tag, listenerId, params->_productType);
}

void BillingClient::getBillingConfigAsync(GetBillingConfigParams* params, se::Object* listener) {
    if(!params || !listener) {
        CC_LOG_WARNING("GetBillingConfigParams or listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::getBillingConfigAsync(_tag, listenerId);
}

BillingResult* BillingClient::isFeatureSupported(const std::string& feature) {
    return GoogleBillingHelper::isFeatureSupported(_tag, feature);
}

void BillingClient::createAlternativeBillingOnlyReportingDetailsAsync(se::Object* listener) {
    if(!listener) {
        CC_LOG_WARNING("Listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::createAlternativeBillingOnlyReportingDetailsAsync(_tag, listenerId);
}

void BillingClient::isAlternativeBillingOnlyAvailableAsync(se::Object* listener) {
    if(!listener) {
        CC_LOG_WARNING("Listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::isAlternativeBillingOnlyAvailableAsync(_tag, listenerId);
}

void BillingClient::createExternalOfferReportingDetailsAsync(se::Object* listener) {
    if(!listener) {
        CC_LOG_WARNING("Listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::createExternalOfferReportingDetailsAsync(_tag, listenerId);
}

void BillingClient::isExternalOfferAvailableAsync(se::Object* listener) {
    if(!listener) {
        CC_LOG_WARNING("Listener can't be null");
        return;
    }
    int listenerId = addListener(listener);
    GoogleBillingHelper::isExternalOfferAvailableAsync(_tag, listenerId);
}

BillingResult* BillingClient::showAlternativeBillingOnlyInformationDialog(se::Object* listener) {
    if(!listener) {
        // Extending the return value of BillingResult.Normal behavior wouldn't get in here.
        auto* builder = BillingResult::newBuilder();
        return (*builder).setResponseCode(6).setDebugMessage("Listener can't be null").build();
    }
    int listenerId = addListener(listener);
    return GoogleBillingHelper::showAlternativeBillingOnlyInformationDialog(_tag, listenerId);
}

BillingResult* BillingClient::showExternalOfferInformationDialog(se::Object* listener) {
    if(!listener) {
        // Extending the return value of BillingResult.Normal behavior wouldn't get in here.
        auto* builder = BillingResult::newBuilder();
        return (*builder).setResponseCode(6).setDebugMessage("Listener can't be null").build();
    }
    int listenerId = addListener(listener);
    return GoogleBillingHelper::showExternalOfferInformationDialog(_tag, listenerId);
}

BillingResult* BillingClient::showInAppMessages(InAppMessageParams* params, se::Object* listener) {
    if(!params || !listener) {
        // Extending the return value of BillingResult.Normal behavior wouldn't get in here.
        auto* builder = BillingResult::newBuilder();
        return (*builder).setResponseCode(6).setDebugMessage("Listener can't be null").build();
    }
    int listenerId = addListener(listener);
    return GoogleBillingHelper::showInAppMessages(_tag, listenerId, params->_inAppMessageCategoryIds);
}

} // namespace cc
