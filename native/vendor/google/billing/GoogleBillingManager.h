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

#include <unordered_map>
#include <vector>

#include "base/Macros.h"
#include "base/RefCounted.h"

namespace cc {
class BillingClient;
class CC_DLL GoogleBillingManager {
public:
    static GoogleBillingManager* getInstance() {
        static GoogleBillingManager mgr;
        return &mgr;
    }
    void pushBillingClient(int tag, BillingClient* client) {
        _billingClients.insert(std::make_pair(tag, client));
    }

    void removeGoogleBilling(int tag) {
        auto it = _billingClients.find(tag);
        if (it != _billingClients.end()) {
            _billingClients.erase(it);
        }
    }

    BillingClient* getBillingClient(int tag) {
        auto it = _billingClients.find(tag);
        if (it != _billingClients.end()) {
            return it->second;
        }
        return nullptr;
    }

private:
    std::unordered_map<int, BillingClient*> _billingClients;
};

} // namespace cc
