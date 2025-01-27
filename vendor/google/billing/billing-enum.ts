/* eslint-disable @typescript-eslint/no-namespace */
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
*****************************************************************************/
import { JSB } from 'internal:constants';

declare const jsb: any;

if (JSB) {
    jsb.BillingClient.ConnectionState = {
        DISCONNECTED: 0,
        CONNECTING: 1,
        CONNECTED: 2,
        CLOSED: 3,
    };
    jsb.BillingClient.BillingResponseCode = {
        SERVICE_TIMEOUT: -3,
        FEATURE_NOT_SUPPORTED: -2,
        SERVICE_DISCONNECTED: -1,
        OK: 0,
        USER_CANCELED: 1,
        SERVICE_UNAVAILABLE: 2,
        BILLING_UNAVAILABLE: 3,
        ITEM_UNAVAILABLE: 4,
        DEVELOPER_ERROR: 5,

        ERROR: 6,
        ITEM_ALREADY_OWNED: 7,
        ITEM_NOT_OWNED: 8,
        NETWORK_ERROR: 12,
    };

    jsb.BillingClient.FeatureType = {
        SUBSCRIPTIONS: 'subscriptions',
        SUBSCRIPTIONS_UPDATE: 'subscriptionsUpdate',
        PRICE_CHANGE_CONFIRMATION: 'priceChangeConfirmation',
        IN_APP_MESSAGING: 'bbb',
        PRODUCT_DETAILS: 'fff',
        BILLING_CONFIG: 'ggg',
        ALTERNATIVE_BILLING_ONLY: 'jjj',
        EXTERNAL_OFFER: 'kkk',
    };

    jsb.BillingClient.ProductType = {
        INAPP: 'inapp',
        SUBS: 'subs',
    };

    jsb.InAppMessageParams.InAppMessageCategoryId = {
        UNKNOWN_IN_APP_MESSAGE_CATEGORY_ID: 0,
        TRANSACTIONAL: 2,
    };

    jsb.InAppMessageResult.InAppMessageResponseCode = {
        NO_ACTION_NEEDED: 0,
        SUBSCRIPTION_STATUS_UPDATED: 1,
    };

    jsb.BillingFlowParams.SubscriptionUpdateParams.ReplacementMode = {
        UNKNOWN_REPLACEMENT_MODE: 0,
        WITH_TIME_PRORATION: 1,
        CHARGE_PRORATED_PRICE: 2,
        WITHOUT_PRORATION: 3,
        CHARGE_FULL_PRICE: 5,
        DEFERRED: 6,
    };

    jsb.ProductDetails.RecurrenceMode = {
        INFINITE_RECURRING: 1,
        FINITE_RECURRING: 2,
        NON_RECURRING: 3,
    };

    jsb.Purchase.PurchaseState = {
        PENDING: 2,
        PURCHASED: 1,
        UNSPECIFIED_STATE: 0,
    };
}

export {};
