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
#include "vendor/google/billing/result-values/ProductDetails.h"

namespace cc {
class CC_DLL BillingFlowParams : public cc::RefCounted {
public:
    class SubscriptionUpdateParams : public cc::RefCounted {
    public:
        class Builder : public cc::RefCounted {
        public:
            Builder& setOldPurcchaseToken(const std::string& purchaseToken) {
                _purchaseToken = purchaseToken;
                return *this;
            }
            Builder& setOriginalExternalTransactionId(const std::string& externalTransactionId) {
                _externalTransactionId = externalTransactionId;
                return *this;
            }
            Builder& setSubscriptionReplacementMode(int subscriptionReplacementMode) {
                _subscriptionReplacementMode = subscriptionReplacementMode;
                return *this;
            }
            SubscriptionUpdateParams* build() {
                return new SubscriptionUpdateParams(_subscriptionReplacementMode, std::move(_purchaseToken), std::move(_externalTransactionId));
            }

        private:
            int _subscriptionReplacementMode{0};
            std::string _purchaseToken;
            std::string _externalTransactionId;
        };
        static Builder* newBuilder() {
            return new Builder();
        }

    private:
        SubscriptionUpdateParams(int subscriptionReplacementMode, const std::string&& purchaseToken, const std::string&& externalTransactionId)
        : _subscriptionReplacementMode(subscriptionReplacementMode), _purchaseToken(purchaseToken), _externalTransactionId(externalTransactionId) {
        }
        friend class JniBilling;
        int _subscriptionReplacementMode{0};
        std::string _purchaseToken;
        std::string _externalTransactionId;
    };

    class ProductDetailsParams : public cc::RefCounted {
    public:
        ~ProductDetailsParams() {
            if (_productDetails) {
                _productDetails->release();
            }
            _productDetails = nullptr;
        }
        class Builder : public cc::RefCounted {
        public:
            ~Builder() {
                if (_productDetails) {
                    _productDetails->release();
                }
                _productDetails = nullptr;
            }
            Builder& setOfferToken(const std::string& offerToken) {
                _offerToken = offerToken;
                return *this;
            }
            Builder& setProductDetails(ProductDetails* productDetails) {
                _productDetails = productDetails;
                if (_productDetails) {
                    _productDetails->addRef();
                }
                return *this;
            }
            ProductDetailsParams* build() {
                return new ProductDetailsParams(std::move(_offerToken), _productDetails);
            }

        private:
            std::string _offerToken;
            ProductDetails* _productDetails;
        };
        static Builder* newBuilder() {
            return new Builder();
        }

    private:
        friend class JniBilling;
        ProductDetailsParams(const std::string&& offerToken, ProductDetails* productDetails) : _offerToken(offerToken), _productDetails(productDetails) {
            if (_productDetails) {
                _productDetails->addRef();
            }
        }

        std::string _offerToken;
        ProductDetails* _productDetails{nullptr};
    };

    class Builder : public cc::RefCounted {
    public:
        Builder& setIsOfferPersonalized(bool isOfferPersonalized) {
            _isOfferPersonalized = isOfferPersonalized;
            return *this;
        }
        Builder& setObfuscatedAccountId(const std::string& obfuscatedAccountid) {
            _obfuscatedAccountid = obfuscatedAccountid;
            return *this;
        }
        Builder& setObfuscatedProfileId(const std::string& obfuscatedProfileId) {
            _obfuscatedProfileId = obfuscatedProfileId;
            return *this;
        }
        Builder& setProductDetailsParamsList(const std::vector<ProductDetailsParams*>& productDetailsParamsList) {
            _productDetailsParamsList = productDetailsParamsList;
            return *this;
        }
        Builder& setSubscriptionUpdateParams(SubscriptionUpdateParams* subscriptionUpdateParams) {
            _subscriptionUpdateParams = subscriptionUpdateParams;
            return *this;
        }
        BillingFlowParams* build() {
            return new BillingFlowParams(_isOfferPersonalized,
                                         std::move(_obfuscatedAccountid),
                                         std::move(_obfuscatedProfileId),
                                         std::move(_productDetailsParamsList),
                                         _subscriptionUpdateParams);
        }

    private:
        friend class JniBilling;
        bool _isOfferPersonalized{false};
        std::string _obfuscatedAccountid;
        std::string _obfuscatedProfileId;
        std::vector<ProductDetailsParams*> _productDetailsParamsList;
        SubscriptionUpdateParams* _subscriptionUpdateParams{nullptr};
    };
    static Builder* newBuilder() {
        return new Builder();
    }

private:
    friend class GoogleBillingHelper;
    friend class JniBilling;
    BillingFlowParams(bool isOfferPersonalized,
                      const std::string&& obfuscatedAccountid,
                      const std::string&& obfuscatedProfileId,
                      const std::vector<ProductDetailsParams*>&& productDetailsParamsList,
                      SubscriptionUpdateParams* subscriptionUpdateParams)
    : _isOfferPersonalized(isOfferPersonalized), _obfuscatedAccountid(obfuscatedAccountid), _obfuscatedProfileId(obfuscatedProfileId), _productDetailsParamsList(productDetailsParamsList), _subscriptionUpdateParams(subscriptionUpdateParams) {
    }
    bool _isOfferPersonalized{false};
    std::string _obfuscatedAccountid;
    std::string _obfuscatedProfileId;
    std::vector<ProductDetailsParams*> _productDetailsParamsList;
    SubscriptionUpdateParams* _subscriptionUpdateParams{nullptr};
};

} // namespace cc
