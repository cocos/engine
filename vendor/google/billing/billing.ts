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
import './billing-enum';

const ns = JSB ? jsb : {} as unknown as typeof jsb;
export namespace google {
    export namespace billing {
        export const BillingClient = ns.BillingClient;
        export const BillingResult = ns.BillingResult;
        export const InAppMessageResult = ns.InAppMessageResult;
        export const ProductDetails = ns.ProductDetails;
        export const Purchase = ns.Purchase;
        export const PendingPurchasesParams = ns.PendingPurchasesParams;
        export const QueryProductDetailsParams = ns.QueryProductDetailsParams;
        export const BillingFlowParams = ns.BillingFlowParams;
        export const ConsumeParams = ns.ConsumeParams;
        export const AcknowledgePurchaseParams = ns.AcknowledgePurchaseParams;
        export const QueryPurchasesParams = ns.QueryPurchasesParams;
        export const GetBillingConfigParams = ns.GetBillingConfigParams;
        export const InAppMessageParams = ns.InAppMessageParams;
    }
}
export declare namespace google {
    export namespace billing {
        export type AcknowledgePurchaseResponseListener = jsb.AcknowledgePurchaseResponseListener;
        export type AlternativeBillingOnlyAvailabilityListener = jsb.AlternativeBillingOnlyAvailabilityListener;
        export type AlternativeBillingOnlyInformationDialogListener = jsb.AlternativeBillingOnlyInformationDialogListener;
        export type AlternativeBillingOnlyReportingDetailsListener = jsb.AlternativeBillingOnlyReportingDetailsListener;
        export type BillingConfigResponseListener = jsb.BillingConfigResponseListener;
        export type ConsumeResponseListener = jsb.ConsumeResponseListener;
        export type ExternalOfferAvailabilityListener = jsb.ExternalOfferAvailabilityListener;
        export type ExternalOfferInformationDialogListener = jsb.ExternalOfferInformationDialogListener;
        export type ExternalOfferReportingDetailsListener = jsb.ExternalOfferReportingDetailsListener;
        export type InAppMessageResponseListener = jsb.InAppMessageResponseListener;
        export type ProductDetailsResponseListener = jsb.ProductDetailsResponseListener;
        export type PurchasesResponseListener = jsb.PurchasesResponseListener;
        export type PurchasesUpdatedListener = jsb.PurchasesUpdatedListener;
        export type UserChoiceBillingListener = jsb.UserChoiceBillingListener;
        export type BillingClientStateListener = jsb.BillingClientStateListener;

        export type UserChoiceDetails = jsb.UserChoiceDetails;
        export type AccountIdentifiers = jsb.AccountIdentifiers;
        export type PendingPurchaseUpdate = jsb.PendingPurchaseUpdate;
        export type BillingConfig = jsb.BillingConfig;
        export type AlternativeBillingOnlyReportingDetails = jsb.AlternativeBillingOnlyReportingDetails;
        export type ExternalOfferReportingDetails = jsb.ExternalOfferReportingDetails;
        export namespace InAppMessageResult {
            export type InAppMessageResponseCode = jsb.InAppMessageResponseCode;
        }
        export type InAppMessageResult = jsb.InAppMessageResult;

        export namespace PendingPurchasesParams {
            export type Builder = jsb.PendingPurchasesParamsBuilder;
        }
        export type PendingPurchasesParams = jsb.PendingPurchasesParams;

        export namespace ProductDetails {
            export type RecurrenceMode = jsb.RecurrenceMode;
            export type OneTimePurchaseOfferDetails = jsb.OneTimePurchaseOfferDetails;
            export type InstallmentPlanDetails = jsb.InstallmentPlanDetails;
            export type PricingPhase = jsb.PricingPhase;
            export type PricingPhases = jsb.PricingPhases;
            export type SubscriptionOfferDetails = jsb.SubscriptionOfferDetails;
        }
        export type ProductDetails = jsb.ProductDetails;

        export namespace Purchase {
            export type PurchaseState = jsb.PurchaseState;
        }
        export type Purchase = jsb.Purchase;

        export namespace BillingClient {
            export type Builder = jsb.BillingClientBuilder;
            export type ConnectionState = jsb.ConnectionState;
            export type BillingResponseCode = jsb.BillingResponseCode;
            export type FeatureType = jsb.FeatureType;
            export type ProductType = jsb.ProductType;
        }
        export type BillingClient = jsb.BillingClient;
        export namespace BillingFlowParams {
            export type Builder = jsb.BillingFlowParamsBuilder;
            export namespace SubscriptionUpdateParams {
                export type Builder = jsb.SubscriptionUpdateParamsBuilder;
                export type ReplacementMode = jsb.ReplacementMode;
            }
            export type SubscriptionUpdateParams = jsb.SubscriptionUpdateParams;
            export namespace ProductDetailsParams {
                export type Builder = jsb.ProductDetailsParamsBuilder;
            }
            export type ProductDetailsParams = jsb.ProductDetailsParams;

        }
        export type BillingFlowParams = jsb.BillingFlowParams;

        export namespace QueryProductDetailsParams {
            export type Builder = jsb.QueryProductDetailsParamsBuilder;
            export namespace Product {
                export type Builder = jsb.QueryProductDetailsParamsProductBuilder;
            }
            export type Product = jsb.QueryProductDetailsParamsProduct;
        }
        export type QueryProductDetailsParams = jsb.QueryProductDetailsParams;

        export namespace BillingResult {
            export type Builder = jsb.BillingResultBuilder;
        }
        export type BillingResult = jsb.BillingResult;

        export namespace ConsumeParams {
            export type Builder = jsb.ConsumeParamsBuilder;
        }
        export type ConsumeParams = jsb.ConsumeParams;

        export namespace AcknowledgePurchaseParams {
            export type Builder = jsb.AcknowledgePurchaseParamsBuilder;
        }
        export type AcknowledgePurchaseParams = jsb.AcknowledgePurchaseParams;

        export namespace QueryPurchasesParams {
            export type Builder = jsb.QueryPurchasesParamsBuilder;
        }
        export type QueryPurchasesParams = jsb.QueryPurchasesParams;

        namespace InAppMessageParams {
            export type Builder = jsb.InAppMessageParamsBuilder;
            export type InAppMessageCategoryId = jsb.InAppMessageCategoryId;
        }
        export type InAppMessageParams = jsb.InAppMessageParams;
        namespace GetBillingConfigParams {
            export type Builder = jsb.GetBillingConfigParams;
        }
        export type GetBillingConfigParams = jsb.GetBillingConfigParams;

    }
}
