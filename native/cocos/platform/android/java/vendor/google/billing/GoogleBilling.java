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

package google.billing;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;


import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;

import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.AlternativeBillingOnlyReportingDetailsListener;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.GetBillingConfigParams;
import com.android.billingclient.api.BillingConfigResponseListener;
import com.android.billingclient.api.AlternativeBillingOnlyAvailabilityListener;
import com.android.billingclient.api.AlternativeBillingOnlyInformationDialogListener;
import com.android.billingclient.api.ExternalOfferReportingDetailsListener;
import com.android.billingclient.api.ExternalOfferAvailabilityListener;
import com.android.billingclient.api.ExternalOfferInformationDialogListener;
import com.android.billingclient.api.InAppMessageParams;
import com.android.billingclient.api.InAppMessageResponseListener;
import com.android.billingclient.api.BillingClientStateListener;
import com.cocos.lib.GlobalObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class GoogleBilling {

    private static final String TAG = GoogleBilling.class.getSimpleName();
    private Map<Integer, ProductDetails> _productDetails = new HashMap<>();
    private Map<Integer, Purchase> _purchase = new HashMap<>();
    private int _productDetailsNextID = 0;
    private int _purchaseNextID = 0;
    private int _tag = 0;
    /**
     * The billing client.
     */
    private BillingClient _billingClient;

    public GoogleBilling(int tag, BillingClient.Builder builder) {
        assert tag >= 0 && builder != null;
        this._tag = tag;
        try {
            _billingClient = builder.build();
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }

    public void removeProductDetails(int productDetailsId) {
        if (_productDetails.containsKey(productDetailsId)) {
            _productDetails.remove(productDetailsId);
            Log.w(TAG, "removeProductDetails");
        } else {
            Log.w(TAG, "Remove invalid product details id");
        }
    }
    public int pushProductDetails(List<ProductDetails> productDetailsList) {
        int startID = _productDetailsNextID;
        for (ProductDetails productDetails: productDetailsList) {
            _productDetails.put(_productDetailsNextID++, productDetails);
            Log.w(TAG, "pushProductDetails");
        }
        return startID;
    }

    public ProductDetails getProductDetails(int productDetailsId) {
        if (_productDetails.containsKey(productDetailsId)) {
            return _productDetails.get(productDetailsId);
        } else {
            Log.w(TAG, "Remove invalid product details id");
        }
        return null;
    }

    public int pushPurchases(List<Purchase> purchaseList) {
        int startID = _purchaseNextID;
        if(purchaseList != null) {
            for (Purchase purchase: purchaseList) {
                _purchase.put(_purchaseNextID++, purchase);
            }
        }
        return startID;
    }
    public void removePurchase(int purchaseId) {
        if (_purchase.containsKey(purchaseId)) {
            _purchase.remove(purchaseId);
        } else {
            Log.w(TAG, "Remove invalid purchase id");
        }
    }

    public Purchase getPurchase(int purchaseId) {
        if (_purchase.containsKey(purchaseId)) {
            return _purchase.get(purchaseId);
        } else {
            Log.w(TAG, "Remove invalid product details id");
        }
        return null;
    }

    public void startConnection(@NonNull BillingClientStateListener listener) {
        _billingClient.startConnection(listener);
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

    public void createAlternativeBillingOnlyReportingDetailsAsync(@NonNull AlternativeBillingOnlyReportingDetailsListener listener) {
        _billingClient.createAlternativeBillingOnlyReportingDetailsAsync(listener);
    }

    public void isAlternativeBillingOnlyAvailableAsync(@NonNull AlternativeBillingOnlyAvailabilityListener listener) {
        _billingClient.isAlternativeBillingOnlyAvailableAsync(listener);
    }

    public void createExternalOfferReportingDetailsAsync(@NonNull ExternalOfferReportingDetailsListener listener) {
        _billingClient.createExternalOfferReportingDetailsAsync(listener);
    }

    public void isExternalOfferAvailableAsync(@NonNull ExternalOfferAvailabilityListener listener) {
        _billingClient.isExternalOfferAvailableAsync(listener);
    }

    public void queryProductDetailsAsync(String[] productIds, String[] productTypes,
                                         ProductDetailsResponseListener listener) {
        if(productIds.length == 0) {
            Log.e(TAG, "Product id must be provided.");
            return;
        }
        if(productIds.length != productTypes.length) {
            Log.e(TAG, "Product ID does not match the number of product types");
            return;
        }
        try {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            for(int i = 0; i < productIds.length; ++i) {
                String inputType = "";
                if(productTypes[i].equals(BillingClient.ProductType.INAPP)) {
                    inputType = BillingClient.ProductType.INAPP;
                } else if(productTypes[i].equals(BillingClient.ProductType.SUBS)) {
                    inputType = BillingClient.ProductType.SUBS;
                }
                products.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productIds[i])
                        .setProductType(inputType)
                        .build());
            }
            QueryProductDetailsParams params =
                QueryProductDetailsParams.newBuilder().setProductList(products).build();
            _billingClient.queryProductDetailsAsync(params, listener);
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }
    public BillingResult launchBillingFlow(BillingFlowParams params) {
        return _billingClient.launchBillingFlow(GlobalObject.getActivity(), params);
    }

    public void queryPurchasesAsync(String type, @NonNull PurchasesResponseListener listener) {
        String inputType = "";
        if(type.equals(BillingClient.ProductType.INAPP)) {
            inputType = BillingClient.ProductType.INAPP;
        } else if(type.equals(BillingClient.ProductType.SUBS)) {
            inputType = BillingClient.ProductType.SUBS;
        } else {
            Log.w(TAG, "Undefined product types.");
            return;
        }
        try {
            _billingClient.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
                .setProductType(inputType)
                .build(), listener);
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }

    public void consumeAsync(String purchaseToken, ConsumeResponseListener listener) {
        try {
            _billingClient.consumeAsync(ConsumeParams.newBuilder()
                    .setPurchaseToken(purchaseToken).build(),
                listener);
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }

    public void acknowledgePurchase(@Nullable String purchaseToken, AcknowledgePurchaseResponseListener listener) {
        try {
            _billingClient.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchaseToken).build(),
                listener);
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }

    public void getBillingConfigAsync( @NonNull BillingConfigResponseListener listener) {
        try {
            GetBillingConfigParams getBillingConfigParams = GetBillingConfigParams.newBuilder().build();
            _billingClient.getBillingConfigAsync(getBillingConfigParams, listener);
        } catch (RuntimeException e) {
            Log.e(TAG, e.getMessage());
        }
    }

    public BillingResult showAlternativeBillingOnlyInformationDialog(@NonNull AlternativeBillingOnlyInformationDialogListener listener) {
        return _billingClient.showAlternativeBillingOnlyInformationDialog(GlobalObject.getActivity(), listener);
    }

    public BillingResult showExternalOfferInformationDialog(@NonNull ExternalOfferInformationDialogListener listener) {
        return _billingClient.showExternalOfferInformationDialog(GlobalObject.getActivity(), listener);
    }
    public BillingResult showInAppMessages(InAppMessageParams params, @NonNull InAppMessageResponseListener listener) {
        return _billingClient.showInAppMessages(GlobalObject.getActivity(), params, listener);
    }
}
