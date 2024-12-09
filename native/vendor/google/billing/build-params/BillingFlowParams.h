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
class CC_DLL BillingFlowParams {
public:
    class SubscriptionUpdateParams {
    public:
        class Builder {
        public:
            Builder& setOldPurcchaseToken(const std::string& purchaseToken) {
                this->_purchaseToken = purchaseToken;
                return *this;
            }
            Builder& setOriginalExternalTransactionId(const std::string& externalTransactionId) {
                this->_externalTransactionId = externalTransactionId;
                return *this;
            }
            Builder& setSubscriptionReplacementMode(int subscriptionReplacementMode) {
                this->_subscriptionReplacementMode = subscriptionReplacementMode;
                return *this;
            }
            SubscriptionUpdateParams* build() {
                return new SubscriptionUpdateParams(_subscriptionReplacementMode, _purchaseToken, _externalTransactionId);
            }

        private:
            int _subscriptionReplacementMode;
            std::string _purchaseToken;
            std::string _externalTransactionId;
        };
        static Builder* newBuilder() {
            return new Builder();
        }

    private:
        SubscriptionUpdateParams(int subscriptionReplacementMode, const std::string& purchaseToken, const std::string& externalTransactionId) {
            this->_subscriptionReplacementMode = subscriptionReplacementMode;
            this->_purchaseToken = purchaseToken;
            this->_externalTransactionId = externalTransactionId;
        }
        friend class JniBilling;
        int _subscriptionReplacementMode;
        std::string _purchaseToken;
        std::string _externalTransactionId;
    };

    class ProductDetailsParams {
    public:
        class Builder {
        public:
            Builder& setOfferToken(const std::string& offerToken) {
                this->_offerToken = offerToken;
                return *this;
            }
            Builder& setProductDetails(ProductDetails* productDetails) {
                this->_productDetails = productDetails;
                return *this;
            }
            ProductDetailsParams* build() {
                return new ProductDetailsParams(_offerToken, _productDetails);
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
        ProductDetailsParams(std::string offerToken, ProductDetails* _productDetails) {
            this->_offerToken = offerToken;
            this->_productDetails = _productDetails;
        }

        std::string _offerToken;
        ProductDetails* _productDetails{nullptr};
    };

    class Builder {
    public:
        Builder& setIsOfferPersonalized(bool isOfferPersonalized) {
            this->_isOfferPersonalized = isOfferPersonalized;
            return *this;
        }
        Builder& setObfuscatedAccountId(const std::string& obfuscatedAccountid) {
            this->_obfuscatedAccountid = obfuscatedAccountid;
            return *this;
        }
        Builder& setObfuscatedProfileId(const std::string& obfuscatedProfileId) {
            this->_obfuscatedProfileId = obfuscatedProfileId;
            return *this;
        }
        Builder& setProductDetailsParamsList(const std::vector<ProductDetailsParams*>& productDetailsParamsList) {
            this->_productDetailsParamsList = productDetailsParamsList;
            return *this;
        }
        Builder& setSubscriptionUpdateParams(SubscriptionUpdateParams* subscriptionUpdateParams) {
            this->_subscriptionUpdateParams = subscriptionUpdateParams;
            return *this;
        }
        BillingFlowParams* build() {
            return new BillingFlowParams(_isOfferPersonalized, _obfuscatedAccountid, _obfuscatedProfileId, _productDetailsParamsList, _subscriptionUpdateParams);
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
                      const std::string& obfuscatedAccountid,
                      const std::string& obfuscatedProfileId,
                      const std::vector<ProductDetailsParams*>& productDetailsParamsList,
                      SubscriptionUpdateParams* subscriptionUpdateParams) {
        _isOfferPersonalized = isOfferPersonalized;
        _obfuscatedAccountid = obfuscatedAccountid;
        _obfuscatedProfileId = obfuscatedProfileId;
        _productDetailsParamsList = productDetailsParamsList;
        _subscriptionUpdateParams = subscriptionUpdateParams;
    }
    bool _isOfferPersonalized{false};
    std::string _obfuscatedAccountid;
    std::string _obfuscatedProfileId;
    std::vector<ProductDetailsParams*> _productDetailsParamsList;
    SubscriptionUpdateParams* _subscriptionUpdateParams{nullptr};
};

} // namespace cc
