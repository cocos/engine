/****************************************************************************
Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

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

package com.cocos.billing;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.BillingConfig;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.InAppMessageResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.AlternativeBillingOnlyReportingDetailsListener;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.GetBillingConfigParams;
import com.android.billingclient.api.BillingConfigResponseListener;
import com.android.billingclient.api.AlternativeBillingOnlyReportingDetails;
import com.android.billingclient.api.AlternativeBillingOnlyAvailabilityListener;
import com.android.billingclient.api.AlternativeBillingOnlyInformationDialogListener;
import com.android.billingclient.api.ExternalOfferReportingDetailsListener;
import com.android.billingclient.api.ExternalOfferReportingDetails;
import com.android.billingclient.api.ExternalOfferAvailabilityListener;
import com.android.billingclient.api.ExternalOfferInformationDialogListener;
import com.android.billingclient.api.InAppMessageParams;
import com.android.billingclient.api.InAppMessageResponseListener;
import com.cocos.lib.GlobalObject;
import com.cocos.lib.CocosHelper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CocosBilling implements BillingClientStateListener,
    PurchasesUpdatedListener, ProductDetailsResponseListener, PurchasesResponseListener,
    ConsumeResponseListener, AcknowledgePurchaseResponseListener, BillingConfigResponseListener,
    AlternativeBillingOnlyReportingDetailsListener, AlternativeBillingOnlyAvailabilityListener,AlternativeBillingOnlyInformationDialogListener,
    ExternalOfferReportingDetailsListener, ExternalOfferAvailabilityListener,ExternalOfferInformationDialogListener, InAppMessageResponseListener {

    private static final String TAG = CocosBilling.class.getSimpleName();
    private Map<Integer, ProductDetails> _productDetails = new HashMap<>();
    private Map<Integer, Purchase> _purchase = new HashMap<>();
    private int _productDetailsNextID = 0;
    private int _purchaseNextID = 0;

    /**
     * The billing client.
     */
    private BillingClient _billingClient;

    public CocosBilling() {
        _billingClient = BillingClient.newBuilder(GlobalObject.getActivity())
            .setListener(this)
            .enablePendingPurchases()
            .build();
    }

    public void removeProductDetails(int productDetailsID) {
        if (_productDetails.containsKey(productDetailsID)) {
            _productDetails.remove(productDetailsID);
        } else {
            Log.w(TAG, "Remove invalid product details id");
        }
    }

    public void removePurchase(int purchaseID) {
        if (_purchase.containsKey(purchaseID)) {
            _purchase.remove(purchaseID);
        } else {
            Log.w(TAG, "Remove invalid purchase id");
        }
    }

    public void startConnection() {
        _billingClient.startConnection(this);
    }
    public void endConnection() {
        _billingClient.endConnection();
    }

    public int getConnectionState() {
        return _billingClient.getConnectionState();
    }

    public BillingResult isFeatureSupported(String feature) {
        return _billingClient.isFeatureSupported(feature);
    }

    public boolean isReady() {
        return _billingClient.isReady();
    }

    public boolean isConnected() {
        return getConnectionState() == BillingClient.ConnectionState.CONNECTED;
    }

    public void createAlternativeBillingOnlyReportingDetailsAsync() {
        _billingClient.createAlternativeBillingOnlyReportingDetailsAsync(this);
    }

    public void isAlternativeBillingOnlyAvailableAsync() {
        _billingClient.isAlternativeBillingOnlyAvailableAsync(this);
    }

    public void createExternalOfferReportingDetailsAsync() {
        _billingClient.createExternalOfferReportingDetailsAsync(this);
    }

    public void isExternalOfferAvailableAsync() {
        _billingClient.isExternalOfferAvailableAsync(this);
    }

    public void queryProductDetailsParams(String[] productIds, String type) {
        if(!isConnected()) {
            Log.e(TAG, "Must be connected before use this interface");
            return;
        }
        if(productIds.length == 0) {
            Log.e(TAG, "Product ID cannot be empty");
            return;
        }
        String inputType;
        if(type.equals(BillingClient.ProductType.INAPP)) {
            inputType = BillingClient.ProductType.INAPP;
        } else if(type.equals(BillingClient.ProductType.SUBS)) {
            inputType = BillingClient.ProductType.SUBS;
        } else {
            Log.e(TAG, "Undefined product types.");
            return;
        }
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for(String productId: productIds) {
            products.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(inputType)
                    .build());
        }
        QueryProductDetailsParams params =
            QueryProductDetailsParams.newBuilder().setProductList(products).build();
        _billingClient.queryProductDetailsAsync(params, this);
    }

    public void launchBillingFlow(int[] productDetailsHashs, String selectedOfferToken) {
        if(!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }
        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        for (int productDetailsHash: productDetailsHashs) {
            if(_productDetails.containsKey(productDetailsHash)) {
                if(selectedOfferToken.isEmpty()) {
                    productDetailsParamsList.add(
                        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(_productDetails.get(productDetailsHash)).build()
                    );
                } else {
                    productDetailsParamsList.add(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(_productDetails.get(productDetailsHash))
                            .setOfferToken(selectedOfferToken)
                            .build()
                    );
                }
            } else {
                Log.w(TAG, "Purchased product ID does not exist");
            }

        }
        if(productDetailsParamsList.isEmpty()) {
            Log.w(TAG, "Purchased product ID does not exist");
            return;
        }
        BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(productDetailsParamsList).build();
        _billingClient.launchBillingFlow(GlobalObject.getActivity(), params);
    }

    public void queryPurchasesAsync(String type) {
        if(!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }
        String inputType;
        if(type.equals(BillingClient.ProductType.INAPP)) {
            inputType = BillingClient.ProductType.INAPP;
        } else if(type.equals(BillingClient.ProductType.SUBS)) {
            inputType = BillingClient.ProductType.SUBS;
        } else {
            Log.w(TAG, "Undefined product types.");
            return;
        }
        _billingClient.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
            .setProductType(inputType)
            .build(), this);
    }

    public void consumePurchase(@Nullable Purchase purchase) {
        if(!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }
        if(purchase != null && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            _billingClient.consumeAsync(ConsumeParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken()).build(),
                this);
        }
    }

    private void consumePurchases(@NonNull List<Purchase> purchases) {
        if(!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }
        for (Purchase purchase : purchases) {
            consumePurchase(purchase);
        }
    }

    public void consumePurchases(@NonNull int[] purchaseHashs) {
        if(purchaseHashs.length == 0) {
            return;
        }
        List<Purchase> purchases = new ArrayList<>();
        for (int purchaseHash: purchaseHashs) {
            if(_purchase.containsKey(purchaseHash)) {
                purchases.add(_purchase.get(purchaseHash));
            } else {
                Log.w(TAG, "Purchase id for consumption does not exist");
            }
        }
        if (!isConnected()) {
            startConnection();
            return;
        }
        consumePurchases(purchases);
    }

    private void acknowledgePurchase(@Nullable Purchase purchase) {
        if (!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }

        if (purchase != null && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            //if (!purchase.isAcknowledged()) {
                _billingClient.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken()).build(),
                    this);
            //}
        }
    }

    private void acknowledgePurchases(@Nullable List<Purchase> purchases) {
        if (!isConnected()) {
            Log.w(TAG, "Must be connected before use this interface");
            return;
        }
        if(purchases != null) {
            for (Purchase purchase : purchases) {
                acknowledgePurchase(purchase);
            }
        }
    }

    public void acknowledgePurchases(@NonNull int[] purchaseHashs) {
        List<Purchase> purchases = new ArrayList<>();
        for (int purchaseHash: purchaseHashs) {
            if(_purchase.containsKey(purchaseHash)) {
                purchases.add(_purchase.get(purchaseHash));
            } else {
                Log.w(TAG, "Purchase id for acknowledge does not exist");
            }
        }
        acknowledgePurchases(purchases);
    }

    public void getBillingConfigAsync() {
        GetBillingConfigParams getBillingConfigParams = GetBillingConfigParams.newBuilder().build();
        _billingClient.getBillingConfigAsync(getBillingConfigParams, this);
    }

    public BillingResult showAlternativeBillingOnlyInformationDialog() {
        return _billingClient.showAlternativeBillingOnlyInformationDialog(GlobalObject.getActivity(), this);
    }

    public BillingResult showExternalOfferInformationDialog() {
        return _billingClient.showExternalOfferInformationDialog(GlobalObject.getActivity(), this);
    }
    public BillingResult showInAppMessages() {
        return _billingClient.showInAppMessages(GlobalObject.getActivity(), InAppMessageParams.newBuilder().build(), this);
    }

    @Override
    public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onBillingSetupFinished(billingResult);
            }
        });
    }

    public void onBillingServiceDisconnected() {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onBillingServiceDisconnected();
            }
        });
    }

    @Override
    public void onProductDetailsResponse(@NonNull BillingResult billingResult,
                                         @NonNull List<ProductDetails> productDetailsList) {
        int startID = _productDetailsNextID;
        for (ProductDetails productDetails: productDetailsList) {
            _productDetails.put(_productDetailsNextID++, productDetails);
        }
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onProductDetailsResponse(billingResult, productDetailsList, startID);
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult,
                                   @Nullable List<Purchase> purchaseList) {
        int startID = _purchaseNextID;
        if(purchaseList != null) {
            for (Purchase purchase: purchaseList) {
                _purchase.put(_purchaseNextID++, purchase);
            }
        }
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onPurchasesUpdated(billingResult, purchaseList, startID);
            }
        });
    }

    @Override
    public void onQueryPurchasesResponse(@NonNull BillingResult billingResult,
                                         @NonNull List<Purchase> purchaseList) {
        int startID = _purchaseNextID;
        for (Purchase purchase: purchaseList) {
            _purchase.put(_purchaseNextID++, purchase);
        }
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onQueryPurchasesResponse(billingResult, purchaseList, startID);
            }
        });
    }

    @Override
    public void onConsumeResponse(@NonNull BillingResult billingResult,
                                  @NonNull String purchaseToken) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onConsumeResponse(billingResult, purchaseToken);
            }
        });
    }

    @Override
    public void onAcknowledgePurchaseResponse(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onAcknowledgePurchaseResponse(billingResult);
            }
        });
    }

    @Override
    public void onBillingConfigResponse(@NonNull BillingResult billingResult, @Nullable BillingConfig billingConfig) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onBillingConfigResponse(billingResult, billingConfig);
            }
        });
    }

    @Override
    public void onAlternativeBillingOnlyTokenResponse(
        @NonNull BillingResult billingResult,
        @Nullable AlternativeBillingOnlyReportingDetails alternativeBillingOnlyReportingDetails) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onAlternativeBillingOnlyTokenResponse(billingResult, alternativeBillingOnlyReportingDetails);
            }
        });
    }

    @Override
    public void onAlternativeBillingOnlyAvailabilityResponse(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onAlternativeBillingOnlyAvailabilityResponse(billingResult);
            }
        });
    }

    @Override
    public void onExternalOfferReportingDetailsResponse(
        @NonNull BillingResult billingResult,
        @Nullable ExternalOfferReportingDetails externalOfferReportingDetails
    ) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onExternalOfferReportingDetailsResponse(billingResult, externalOfferReportingDetails);
            }
        });
    }

    @Override
    public void onExternalOfferAvailabilityResponse(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onExternalOfferAvailabilityResponse(billingResult);
            }
        });
    }

    @Override
    public void onExternalOfferInformationDialogResponse(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onExternalOfferInformationDialogResponse(billingResult);
            }
        });
    }

    @Override
    public void onAlternativeBillingOnlyInformationDialogResponse(@NonNull BillingResult billingResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onAlternativeBillingOnlyInformationDialogResponse(billingResult);
            }
        });
    }

    @Override
    public void onInAppMessageResponse(@NonNull InAppMessageResult inAppMessageResult) {
        CocosHelper.runOnGameThread(new Runnable() {
            @Override
            public void run() {
                CocosBillingHelper.onInAppMessageResponse(inAppMessageResult);
            }
        });
    }
}
