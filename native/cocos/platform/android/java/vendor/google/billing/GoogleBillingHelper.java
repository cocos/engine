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

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.AlternativeBillingOnlyAvailabilityListener;
import com.android.billingclient.api.AlternativeBillingOnlyInformationDialogListener;
import com.android.billingclient.api.AlternativeBillingOnlyReportingDetails;
import com.android.billingclient.api.AlternativeBillingOnlyReportingDetailsListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingConfig;
import com.android.billingclient.api.BillingConfigResponseListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.ExternalOfferAvailabilityListener;
import com.android.billingclient.api.ExternalOfferInformationDialogListener;
import com.android.billingclient.api.ExternalOfferReportingDetails;
import com.android.billingclient.api.ExternalOfferReportingDetailsListener;
import com.android.billingclient.api.InAppMessageParams;
import com.android.billingclient.api.InAppMessageResponseListener;
import com.android.billingclient.api.InAppMessageResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import java.util.List;

import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.UserChoiceBillingListener;
import com.android.billingclient.api.UserChoiceDetails;
import com.cocos.lib.CocosHelper;
import com.cocos.lib.GlobalObject;
import android.util.Log;
import android.util.SparseArray;
import com.android.billingclient.api.BillingClientStateListener;

public final class GoogleBillingHelper {
    private static final String TAG = GoogleBillingHelper.class.getSimpleName();
    private static SparseArray<GoogleBilling> googleBillings = new SparseArray<GoogleBilling>();
    private static int billingTag = 0;

    public static int newTag() {
        return billingTag++;
    }
    public static void createGoogleBilling(int tag, BillingClient.Builder builder) {
        GoogleBilling billing = new GoogleBilling(tag, builder);
        googleBillings.put(tag, billing);
    }

    public static void removeGoogleBilling(int tag) {
        googleBillings.remove(tag);
    }

    public static final class BillingClientPurchasesUpdatedListener implements PurchasesUpdatedListener {
        private int _tag;
        BillingClientPurchasesUpdatedListener(int tag) {
            this._tag = tag;
        }
        @Override
        public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchaseList) {
            int tag = this._tag;
            CocosHelper.runOnGameThread(new Runnable() {
                @Override
                public void run() {
                    GoogleBilling billing = googleBillings.get(tag);
                    if (billing != null) {
                        int startID = billing.pushPurchases(purchaseList);
                        GoogleBillingHelper.onPurchasesUpdated(tag, billingResult, purchaseList, startID);
                    }
                }
            });
        }
    }

    public static final class BillingClientUserChoiceBillingListener implements UserChoiceBillingListener {
        private int _tag;
        BillingClientUserChoiceBillingListener(int tag) {
            this._tag = tag;
        }
        @Override
        public void userSelectedAlternativeBilling(@NonNull UserChoiceDetails userChoiceDetails) {
            int tag = this._tag;
            CocosHelper.runOnGameThread(new Runnable() {
                @Override
                public void run() {
                    GoogleBilling billing = googleBillings.get(tag);
                    if (billing != null) {
                        GoogleBillingHelper.userSelectedAlternativeBilling(tag, userChoiceDetails);
                    }
                }
            });
        }
    }

    private static native void onBillingSetupFinished(int tag, int callbackId, @NonNull BillingResult billingResult);
    private static native void onBillingServiceDisconnected(int tag, int callbackId);
    private static native void onProductDetailsResponse(int tag, int callbackId, @NonNull BillingResult billingResult, @NonNull List<ProductDetails> productDetailsList, int startID);
    private static native void onPurchasesUpdated(int tag, @NonNull BillingResult billingResult, @Nullable List<Purchase> purchasesList, int startID);
    private static native void userSelectedAlternativeBilling(int tag, @NonNull UserChoiceDetails userChoiceDetails);
    private static native void onQueryPurchasesResponse(int tag, int callbackId, @NonNull BillingResult billingResult, @NonNull List<Purchase> purchasesList, int startID);
    private static native void onConsumeResponse(int tag, int callbackId, @NonNull BillingResult billingResult, @NonNull String purchaseToken);
    private static native void onAcknowledgePurchaseResponse(int tag, int callbackId, @NonNull BillingResult billingResult);
    private static native void onBillingConfigResponse(int tag, int callbackId, @NonNull BillingResult billingResult, @Nullable BillingConfig billingConfig);

    private static native void onAlternativeBillingOnlyTokenResponse(int tag, int callbackId, @NonNull BillingResult billingResult,
                                                                    @Nullable AlternativeBillingOnlyReportingDetails alternativeBillingOnlyReportingDetails);
    private static native void onAlternativeBillingOnlyAvailabilityResponse(int tag, int callbackId, @NonNull BillingResult billingResult);

    private static native void onExternalOfferReportingDetailsResponse(
        int tag,
        int callbackId,
        @NonNull BillingResult billingResult,
        @Nullable ExternalOfferReportingDetails externalOfferReportingDetails
    );
    private static native void onExternalOfferAvailabilityResponse(int tag, int callbackId, @NonNull BillingResult billingResult);
    private static native void onExternalOfferInformationDialogResponse(int tag, int callbackId, @NonNull BillingResult billingResult);
    private static native void onAlternativeBillingOnlyInformationDialogResponse(int tag, int callbackId, @NonNull BillingResult billingResult);
    private static native void onInAppMessageResponse(int tag, int callbackId, @NonNull InAppMessageResult inAppMessageResult);

    public static ProductDetails getProductDetailsObject(int tag, int productDetailsID) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            return billing.getProductDetails(productDetailsID);
        }
        return null;
    }

    public static void removeProductDetails(int tag, int productDetailsId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            billing.removeProductDetails(productDetailsId);
        }
    }

    public static void removePurchase(int tag, int purchaseID) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            billing.removePurchase(purchaseID);
        }
    }

    public static Purchase getPurchase(int tag, int purchaseId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            return billing.getPurchase(purchaseId);
        }
        return null;
    }


    public static void startConnection(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult billingResult) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onBillingSetupFinished(tag, callbackId, billingResult);
                        }
                    });
                }

                @Override
                public void onBillingServiceDisconnected() {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onBillingServiceDisconnected(tag, callbackId);
                        }
                    });

                }
            });
    }

    public static void endConnection(int tag) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            billing.endConnection();
        }
    }

    public static int getConnectionState(int tag) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            return billing.getConnectionState();
        }
        return 0;
    }

    public static BillingResult isFeatureSupported(int tag, String feature) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            return billing.isFeatureSupported(feature);
        }
        return BillingResult.newBuilder().build();
    }

    public static boolean isReady(int tag) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            return billing.isReady();
        }
        return false;
    }

    public static void createAlternativeBillingOnlyReportingDetailsAsync(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.createAlternativeBillingOnlyReportingDetailsAsync(
            new AlternativeBillingOnlyReportingDetailsListener() {
                @Override
                public void onAlternativeBillingOnlyTokenResponse(@NonNull BillingResult var1, @Nullable AlternativeBillingOnlyReportingDetails var2) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onAlternativeBillingOnlyTokenResponse(tag, callbackId, var1, var2);
                        }
                    });
                }
            }
        );
    }

    public static void isAlternativeBillingOnlyAvailableAsync(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.isAlternativeBillingOnlyAvailableAsync(
            new AlternativeBillingOnlyAvailabilityListener() {
                @Override
                public void onAlternativeBillingOnlyAvailabilityResponse(@NonNull BillingResult billingResult) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onAlternativeBillingOnlyAvailabilityResponse(tag, callbackId, billingResult);
                        }
                    });
                }
            }
        );
    }

    public static void createExternalOfferReportingDetailsAsync(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.createExternalOfferReportingDetailsAsync(
            new ExternalOfferReportingDetailsListener() {
                @Override
                public void onExternalOfferReportingDetailsResponse(@NonNull BillingResult billingResult, @Nullable ExternalOfferReportingDetails externalOfferReportingDetails) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onExternalOfferReportingDetailsResponse(tag, callbackId, billingResult, externalOfferReportingDetails);
                        }
                    });
                }
            }
        );
    }

    public static void isExternalOfferAvailableAsync(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.isExternalOfferAvailableAsync(
            new ExternalOfferAvailabilityListener() {
                @Override
                public void onExternalOfferAvailabilityResponse(@NonNull BillingResult billingResult) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            GoogleBillingHelper.onExternalOfferAvailabilityResponse(tag, callbackId, billingResult);
                        }
                    });
                }
            }
        );
    }

    public static void queryProductDetailsAsync(int tag, int callbackId, String[] productIds, String[] productTypes) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.queryProductDetailsAsync(productIds, productTypes,
            new ProductDetailsResponseListener() {
                @Override
                public void onProductDetailsResponse(@NonNull BillingResult billingResult, @NonNull List<ProductDetails> list) {
                    CocosHelper.runOnGameThread(new Runnable() {
                        @Override
                        public void run() {
                            int startID = billing.pushProductDetails(list);
                            GoogleBillingHelper.onProductDetailsResponse(tag, callbackId, billingResult, list, startID);
                        }
                    });
                }
            });
    }

    public static void launchBillingFlow(int tag, BillingFlowParams params) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing != null) {
            GlobalObject.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    BillingResult res = billing.launchBillingFlow(params);
                    Log.i(TAG, String.format("BillingResult: ResponseCode : %d, DebugMessage : %s,  ToString: %s", res.getResponseCode(), res.getDebugMessage(), res.toString()));
                }
            });
        }
    }

    public static void queryPurchasesAsync(int tag, int callbackId, String type) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.queryPurchasesAsync(type, new PurchasesResponseListener() {
            @Override
            public void onQueryPurchasesResponse(@NonNull BillingResult billingResult, @NonNull List<Purchase> list) {
                CocosHelper.runOnGameThread(new Runnable() {
                    @Override
                    public void run() {
                        int startID = billing.pushPurchases(list);
                        GoogleBillingHelper.onQueryPurchasesResponse(tag, callbackId, billingResult, list, startID);
                    }
                });
            }
        });
    }

    public static void consumeAsync(int tag, int callbackId, String purchaseToken) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.consumeAsync(purchaseToken, new ConsumeResponseListener() {
            @Override
            public void onConsumeResponse(@NonNull BillingResult billingResult, @NonNull String s) {
                CocosHelper.runOnGameThread(new Runnable() {
                    @Override
                    public void run() {
                        GoogleBillingHelper.onConsumeResponse(tag, callbackId, billingResult, s);
                    }
                });
            }
        });
    }

    public static void acknowledgePurchase(int tag, int callbackId, String purchaseToken) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.acknowledgePurchase(purchaseToken, new AcknowledgePurchaseResponseListener() {
            @Override
            public void onAcknowledgePurchaseResponse(@NonNull BillingResult billingResult) {
                CocosHelper.runOnGameThread(new Runnable() {
                    @Override
                    public void run() {
                        GoogleBillingHelper.onAcknowledgePurchaseResponse(tag, callbackId, billingResult);
                    }
                });
            }
        });
    }

    public static void getBillingConfigAsync(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        billing.getBillingConfigAsync(new BillingConfigResponseListener() {
            @Override
            public void onBillingConfigResponse(@NonNull BillingResult billingResult, @Nullable BillingConfig billingConfig) {
                CocosHelper.runOnGameThread(new Runnable() {
                    @Override
                    public void run() {
                        GoogleBillingHelper.onBillingConfigResponse(tag, callbackId, billingResult, billingConfig);
                    }
                });
            }
        });
    }

    public static void showAlternativeBillingOnlyInformationDialog(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                BillingResult res = billing.showAlternativeBillingOnlyInformationDialog(new AlternativeBillingOnlyInformationDialogListener() {
                    @Override
                    public void onAlternativeBillingOnlyInformationDialogResponse(@NonNull BillingResult billingResult) {
                        CocosHelper.runOnGameThread(new Runnable() {
                            @Override
                            public void run() {
                                GoogleBillingHelper.onAlternativeBillingOnlyInformationDialogResponse(tag, callbackId, billingResult);
                            }
                        });
                    }
                });
                Log.i(TAG, String.format("BillingResult: ResponseCode : %d, DebugMessage : %s,  ToString: %s", res.getResponseCode(), res.getDebugMessage(), res.toString()));
            }
        });
    }

    public static void showExternalOfferInformationDialog(int tag, int callbackId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        GlobalObject.runOnUiThread(new Runnable() {
           @Override
           public void run() {
               BillingResult res = billing.showExternalOfferInformationDialog(new ExternalOfferInformationDialogListener() {
                   @Override
                   public void onExternalOfferInformationDialogResponse(@NonNull BillingResult billingResult) {
                       CocosHelper.runOnGameThread(new Runnable() {
                           @Override
                           public void run() {
                               GoogleBillingHelper.onExternalOfferInformationDialogResponse(tag, callbackId, billingResult);
                           }
                       });
                   }
               });
               Log.i(TAG, String.format("BillingResult: ResponseCode : %d, DebugMessage : %s,  ToString: %s", res.getResponseCode(), res.getDebugMessage(), res.toString()));
           }
       });
    }
    public static void showInAppMessages(int tag, int callbackId, int[] inAppMessageCategoryId) {
        GoogleBilling billing = googleBillings.get(tag);
        if (billing == null) {
            return;
        }
        GlobalObject.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                InAppMessageParams.Builder builder = InAppMessageParams.newBuilder();
                for(int i = 0; i < inAppMessageCategoryId.length; ++i) {
                    builder.addInAppMessageCategoryToShow(inAppMessageCategoryId[i]);
                }
                BillingResult res = billing.showInAppMessages(builder.build(), new InAppMessageResponseListener() {
                    @Override
                    public void onInAppMessageResponse(@NonNull InAppMessageResult inAppMessageResult) {
                        CocosHelper.runOnGameThread(new Runnable() {
                            @Override
                            public void run() {
                                GoogleBillingHelper.onInAppMessageResponse(tag, callbackId, inAppMessageResult);
                            }
                        });
                    }
                });
                Log.i(TAG, String.format("BillingResult: ResponseCode : %d, DebugMessage : %s,  ToString: %s", res.getResponseCode(), res.getDebugMessage(), res.toString()));
            }
        });
    }
}
