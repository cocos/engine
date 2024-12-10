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
#include "vendor/google/billing/result-values/AccountIdentifiers.h"

namespace cc {

class CC_DLL Purchase : public cc::RefCounted {
public:
    class CC_DLL PendingPurchaseUpdate {
    public:
        std::string getPurchaseToken() const {
            return this->_purchaseToken;
        }

        std::vector<std::string> getProducts() const {
            return this->_products;
        }

    private:
        friend class JniBilling;
        std::string _purchaseToken;
        std::vector<std::string> _products;
    };

    int getPurchaseState() const {
        return this->_purchaseState;
    }
    int getQuantity() const {
        return this->_quantity;
    }

    int hashCode() const {
        return this->_hashCode;
    }

    long getPurchaseTime() const {
        return this->_purchaseTime;
    }

    AccountIdentifiers* getAccountIdentifiers() const {
        return this->_accountIdentifiers;
    }
    PendingPurchaseUpdate* getPendingPurchaseUpdate() const {
        return this->_pendingPurchaseUpdate;
    }

    std::string getDeveloperPayload() const {
        return this->_developerPayload;
    }

    std::string getOrderId() const {
        return this->_orderId;
    }

    std::string getOriginalJson() const {
        return this->_originalJson;
    }

    std::string getPackageName() const {
        return this->_packageName;
    }

    std::string getPurchaseToken() const {
        return this->_purchaseToken;
    }

    std::string getSignature() const {
        return this->_signature;
    }

    std::string toString() const {
        return this->_toString;
    }

    std::vector<std::string> getProducts() const {
        return this->_products;
    }
    bool isAcknowledged() const {
        return this->_isAcknowledged;
    }

    bool isAutoRenewing() const {
        return this->_isAutoRenewing;
    }
    ~Purchase() override;
    bool equals(const Purchase& other) const {
        return this->_hashCode == other._hashCode;
    }

private:
    friend class JniBilling;
    friend class GoogleBillingHelper;
    int _id{-1};  // This is an ID that is not visible to ts and is used to free the java object.
    int _tag{-1}; // This is an ID that is not visible to ts and is used to specify which billingclient.
    bool _isAcknowledged{false};
    bool _isAutoRenewing{false};
    int _purchaseState{0};
    int _hashCode{0};
    int _quantity{0};
    long _purchaseTime{0};
    std::string _developerPayload;
    std::string _orderId;
    std::string _originalJson;
    std::string _packageName;
    std::string _purchaseToken;
    std::string _signature;
    std::string _toString;
    AccountIdentifiers* _accountIdentifiers{nullptr};
    PendingPurchaseUpdate* _pendingPurchaseUpdate{nullptr};
    std::vector<std::string> _products;
};

} // namespace cc
