// Define module
// target_namespace means the name exported to JS, could be same as which in other modules
// audio at the last means the suffix of binding function name, different modules should use unique name
// Note: doesn't support number prefix
%module(target_namespace="jsb") billing

// Disable some swig warnings, find warning number reference here ( https://www.swig.org/Doc4.1/Warnings.html )
#pragma SWIG nowarn=503,302,401,317,402

// Insert code at the beginning of generated header file (.h)
%insert(header_file) %{
#pragma once
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "vendor/google/billing/GoogleBilling.h"
#include "vendor/google/billing/build-params/AcknowledgePurchaseParams.h"
#include "vendor/google/billing/build-params/BillingFlowParams.h"
#include "vendor/google/billing/build-params/ConsumeParams.h"
#include "vendor/google/billing/build-params/GetBillingConfigParams.h"
#include "vendor/google/billing/build-params/InAppMessageParams.h"
#include "vendor/google/billing/build-params/PendingPurchasesParams.h"
#include "vendor/google/billing/build-params/QueryProductDetailsParams.h"
#include "vendor/google/billing/build-params/QueryPurchasesParams.h"

#include "vendor/google/billing/result-values/AccountIdentifiers.h"
#include "vendor/google/billing/result-values/AlternativeBillingOnlyReportingDetails.h"
#include "vendor/google/billing/result-values/BillingConfig.h"
#include "vendor/google/billing/result-values/BillingResult.h"
#include "vendor/google/billing/result-values/ExternalOfferReportingDetails.h"
#include "vendor/google/billing/result-values/InAppMessageResult.h"
#include "vendor/google/billing/result-values/Purchase.h"
#include "vendor/google/billing/result-values/ProductDetails.h"
#include "vendor/google/billing/result-values/UserChoiceDetails.h"
%}

// Insert code at the beginning of generated source file (.cpp)
%{
#include "bindings/auto/jsb_google_billing_auto.h"
%}

// ----- Import Section ------
// Brief: Import header files which are depended by 'Include Section'
// Note: 
//   %import "your_header_file.h" will not generate code for that header file
//
%import "base/Macros.h"

// ----- Include Section ------
// Brief: Include header files in which classes and methods will be bound
%include "vendor/google/billing/result-values/AccountIdentifiers.h"
%include "vendor/google/billing/result-values/AlternativeBillingOnlyReportingDetails.h"
%include "vendor/google/billing/result-values/BillingConfig.h"
%include "vendor/google/billing/result-values/BillingResult.h"
%include "vendor/google/billing/result-values/ExternalOfferReportingDetails.h"
%include "vendor/google/billing/result-values/InAppMessageResult.h"
%include "vendor/google/billing/result-values/Purchase.h"
%include "vendor/google/billing/result-values/ProductDetails.h"
%include "vendor/google/billing/result-values/UserChoiceDetails.h"

%include "vendor/google/billing/build-params/AcknowledgePurchaseParams.h"
%include "vendor/google/billing/build-params/BillingFlowParams.h"
%include "vendor/google/billing/build-params/ConsumeParams.h"
%include "vendor/google/billing/build-params/GetBillingConfigParams.h"
%include "vendor/google/billing/build-params/InAppMessageParams.h"
%include "vendor/google/billing/build-params/PendingPurchasesParams.h"
%include "vendor/google/billing/build-params/QueryProductDetailsParams.h"
%include "vendor/google/billing/build-params/QueryPurchasesParams.h"

%include "vendor/google/billing/GoogleBilling.h"


