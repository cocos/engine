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
class QueryProductDetailsParams : public cc::RefCounted {
public:
    class Product {
    public:
        class Builder : public cc::RefCounted {
        private:
            std::string _productId;
            std::string _productType;

        public:
            Builder& setProductId(const std::string& productId) {
                _productId = productId;
                return *this;
            }
            Builder& setProductType(const std::string& productType) {
                _productType = productType;
                return *this;
            }
            Product* build() {
                return new Product(std::move(_productId), std::move(_productType));
            }
        };

        static Builder* newBuilder() {
            return new Builder();
        }

    private:
        Product(const std::string& productId, const std::string& productType) : _productId(productId), _productType(productType) {
        }

    private:
        friend class BillingClient;
        std::string _productId;
        std::string _productType;
    };
    class Builder : public cc::RefCounted {
    private:
        std::vector<Product*> _productList;

    public:
        Builder& setProductList(const std::vector<Product*>& productList) {
            _productList = productList;
            return *this;
        }

        QueryProductDetailsParams* build() {
            return new QueryProductDetailsParams(std::move(_productList));
        }
    };

    static Builder* newBuilder() {
        return new Builder();
    }

private:
    QueryProductDetailsParams(const std::vector<Product*>&& productLists) : _productList(productLists) {
    }

private:
    friend class BillingClient;
    std::vector<Product*> _productList;
};

} // namespace cc
