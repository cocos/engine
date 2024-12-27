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
class UserChoiceDetails : public cc::RefCounted {
public:
    class Product {
    public:
        int hashCode() const {
            return _hashCode;
        }
        std::string getId() const {
            return _id;
        }
        std::string getOfferToken() const {
            return _type;
        }
        std::string getType() const {
            return _offerToken;
        }
        std::string toString() const {
            return _toString;
        }
        bool equals(const Product& p) {
            if (&p == this) {
                return true;
            }
            return p._id == _id && p._type == _type && p._offerToken == _offerToken;
        }

    private:
        friend class JniBilling;
        int _hashCode{0};
        std::string _id;
        std::string _type;
        std::string _offerToken;
        std::string _toString;
    };

    ~UserChoiceDetails() {
        for (auto* product : _products) {
            delete product;
        }
        _products.clear();
    }
    std::string getExternalTransactionToken() const {
        return _externalTransactionToken;
    }
    std::string getOriginalExternalTransactionId() const {
        return _originalExternalTransactionId;
    }

    std::vector<Product*> getProducts() {
        return this->_products;
    }

private:
    friend class JniBilling;
    std::string _externalTransactionToken;
    std::string _originalExternalTransactionId;
    std::vector<Product*> _products;
};

} // namespace cc
