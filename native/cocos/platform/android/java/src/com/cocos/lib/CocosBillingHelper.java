/****************************************************************************
Copyright (c) 2024
 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

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

package com.cocos.lib;

import android.annotation.SuppressLint;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AlternativeBillingOnlyReportingDetails;
import com.android.billingclient.api.BillingConfig;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ExternalOfferReportingDetails;
import com.android.billingclient.api.InAppMessageResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import java.util.List;

import com.cocos.lib.CocosBilling;

public class CocosBillingHelper {
    public static native void onBillingSetupFinished(@NonNull BillingResult billingResult);
    public static native void onBillingServiceDisconnected();
    public static native void onProductDetailsResponse(@NonNull BillingResult billingResult, @NonNull List<ProductDetails> productDetailsList);
    public static native void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchasesList);
    public static native void onQueryPurchasesResponse(@NonNull BillingResult billingResult, @NonNull List<Purchase> purchasesList);
    public static native void onConsumeResponse(@NonNull BillingResult billingResult, @NonNull String purchaseToken);
    public static native void onAcknowledgePurchaseResponse(@NonNull BillingResult billingResult);
    public static native void onBillingConfigResponse(@NonNull BillingResult billingResult, @Nullable BillingConfig billingConfig);

    public static native void onAlternativeBillingOnlyTokenResponse(@NonNull BillingResult billingResult,
                                                                    @Nullable AlternativeBillingOnlyReportingDetails alternativeBillingOnlyReportingDetails);
    public static native void onAlternativeBillingOnlyAvailabilityResponse(@NonNull BillingResult billingResult);

    public static native void onExternalOfferReportingDetailsResponse(
        @NonNull BillingResult billingResult,
        @Nullable ExternalOfferReportingDetails externalOfferReportingDetails
    );
    public static native void onExternalOfferAvailabilityResponse(@NonNull BillingResult billingResult);
    public static native void onExternalOfferInformationDialogResponse(@NonNull BillingResult billingResult);
    public static native void onAlternativeBillingOnlyInformationDialogResponse(@NonNull BillingResult billingResult);
    public static native void onInAppMessageResponse(@NonNull InAppMessageResult inAppMessageResult);

    @SuppressLint("StaticFieldLeak")
    private static CocosBilling instance;

    public static CocosBilling getInstance() {
        if (instance == null) {
            instance = new CocosBilling();
        }
        return instance;
    }

    public static void startConnection() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().startConnection();
            }
        });
    }

    public static void endConnection() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().endConnection();
            }
        });
    }

    public static int getConnectionState() {
        return getInstance().getConnectionState();
    }

    public static BillingResult isFeatureSupported(String feature) {
        return getInstance().isFeatureSupported(feature);
    }

    public static boolean isReady() {
        return getInstance().isReady();
    }

    public static void createAlternativeBillingOnlyReportingDetailsAsync() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().createAlternativeBillingOnlyReportingDetailsAsync();
            }
        });
    }

    public static void isAlternativeBillingOnlyAvailableAsync() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().isAlternativeBillingOnlyAvailableAsync();
            }
        });
    }

    public static void createExternalOfferReportingDetailsAsync() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().createExternalOfferReportingDetailsAsync();
            }
        });
    }

    public static void isExternalOfferAvailableAsync() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().isExternalOfferAvailableAsync();
            }
        });
    }

    public static void queryProductDetailsParams(String[] productIds, String type) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().queryProductDetailsParams(productIds, type);
            }
        });
    }

    public static void launchBillingFlow(int[] productDetailsHashs, String selectedOfferToken) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().launchBillingFlow(productDetailsHashs, selectedOfferToken);
            }
        });
    }

    public static void queryPurchasesAsync(String type) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().queryPurchasesAsync(type);
            }
        });
    }

    public static void consumePurchases(@NonNull int[] purchaseHashs) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().consumePurchases(purchaseHashs);
            }
        });
    }

    public static void acknowledgePurchases(@NonNull int[] purchaseHashs) {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().acknowledgePurchases(purchaseHashs);
            }
        });
    }

    public static void getBillingConfigAsync() {
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getInstance().getBillingConfigAsync();
            }
        });
    }

    public static BillingResult showAlternativeBillingOnlyInformationDialog() {
        return getInstance().showAlternativeBillingOnlyInformationDialog();
    }

    public static BillingResult showExternalOfferInformationDialog() {
        return getInstance().showExternalOfferInformationDialog();
    }
    public static BillingResult showInAppMessages() {
        return getInstance().showInAppMessages();
    }
}
