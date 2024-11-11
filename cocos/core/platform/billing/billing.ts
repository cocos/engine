import { JSB } from 'internal:constants';
import { native } from '../../../native-binding';
import { EventTarget } from '../../event';
import { ccenum } from '../../value-types/enum';

declare const jsb: any;
/**
 * @en Google play billing event type
 * @zh 输入事件类型
 */
export enum BillingEventType {
    /**
     * @en
     * Called to notify that setup is complete.
     *
     * @zh
     * 当安装已经完成时触发。
     */
    BILLING_SETUP_FINISHED = 'billing_setup_finished',
    /**
     * @en
     * Called to notify that the connection to the billing service was lost.
     *
     * @zh
     * 当Billing服务连接断开时触发。
     */
    BILLING_SERVICE_DISCONNECTED = 'billing_service_disconnected',
    /**
     * @en
     * Listen to this event to get notifications of purchase updates.
     *
     * @zh
     * 监听这个事件可以获取购买更新。
     */
    PURCHASES_UPDATED = 'purchases_updated',
    /**
     * @en
     * Called to notify that query product details operation has finished.
     *
     * @zh
     * 查询产品详细信息操作完成时触发。
     */
    PRODUCT_DETAILS_RESPONSE = 'product_details_response',
    /**
     * @en
     * Called to notify that the query purchases operation has finished.
     *
     * @zh
     * 查询购买操作完成时触发。
     */
    QUERY_PURCHASES_RESPONSE = 'query_purchases_response',
    /**
     * @en
     * Called to notify that a consume operation has finished.
     *
     * @zh
     * 消费操作完成时触发。
     */
    CONSUME_RESPONSE = 'consume_response',
    /**
     * @en
     * Called to notify that an acknowledge purchase operation has finished.
     *
     * @zh
     * 确认购买操作完成时触发。
     */
    ACKNOWLEDGE_PURCHASES_RESPONSE = 'acknowledge_purchases_response',
    /**
     * @en
     * Called to notify when the get billing config flow has finished.
     *
     * @zh
     * 获取Billing配置流程完成时触发。
     */
    BILLING_CONFIG_RESPONSE = 'billing_config_response',
    /**
     * @en
     * Called to receive the results from createAlternativeBillingOnlyReportingDetailsAsync when it is finished.
     *
     * @zh
     * 当调用createAlternativeBillingOnlyReportingDetailsAsync接口完成时触发，可以接收调用结果。
     */
    ALTERNATIVE_BILLING_ONLY_TOKEN_RESPONSE = 'alternative_billing_only_token_response',
    /**
     * @en
     * Called to notify that query product details operation has finished.
     *
     * @zh
     * 当通知查询产品详细信息操作已完成时调用。
     */
    EXTERNAL_OFFER_REPORTING_DETAILS_RESPONSE = 'external_offer_reporting_details_response',
    /**
     * @en
     * Called to receive the results from BillingClient#isAlternativeBillingOnlyAvailableAsync when it is finished.
     *
     * @zh
     * 当调用BillingClient#isAlternativeBillingOnlyAvailableAsync接口完成时触发，可以接收调用结果。
     */
    ALTERNATIVE_BILLING_ONLY_AVAILABILITY_RESPONSE = 'alternative_billing_only_availability_response',
        /**
     * @en
     * Called to notify that query product details operation has finished.
     *
     * @zh
     * 当通知查询产品详细信息操作已完成时调用。
     */
    EXTERNAL_OFFER_AVAILABILITY_RESPONSE = 'external_offer_availability_response',
    /**
     * @en
     * Called to notify that the alternative billing only dialog flow is finished.
     *
     * @zh
     * 当仅替代Billing对话流程已完成时触发。
     */
    ALTERNATIVE_BILLING_ONLY_INFORMATION_DIALOG_RESPONSE = 'alternative_billing_only_information_dialog_response',
        /**
     * @en
     * Called to notify that query product details operation has finished.
     *
     * @zh
     * 当通知查询产品详细信息操作已完成时调用。
     */
    EXTERNAL_OFFER_INFORMATION_DIALOG_RESPONSE = 'external_offer_information_dialog_response',
    /**
     * @en
     * Called to notify when the in-app messaging flow has finished.
     *
     * @zh
     * 当应用内消息流程完成时触发。
     */
    IN_APP_MESSAGE_RESPONSE = 'in_app_message_response',

}
ccenum(BillingEventType);

/**
 * @en
 * Supported Product types.
 *
 * @zh
 * 支持的产品类型。
 */
export enum ProductType {
    /**
     * @en
     * A Product type for Android apps in-app products.
     *
     * @zh
     * Android 应用内产品的产品类型。
     */
    INAPP = 'inapp',
    /**
     * @en
     * A Product type for Android apps subscriptions.
     *
     * @zh
     * Android 应用程序订阅的产品类型。
     */
    SUBS = 'subs'
}

/**
 * @en
 * Possible response codes.
 *
 * @zh
 * 可能的响应代码。
 */
export enum BillingResponseCode {
    /**
     * @en
     * This field is deprecated.
     * See SERVICE_UNAVAILABLE which will be used instead of this code.
     *
     * @zh
     * 这个字段已经废弃。
     * 看看SERVICE_UNAVAILABLE将使用哪一个来代替此代码。
     */
    SERVICE_TIMEOUT = -3,
    /**
     * @en
     * The requested feature is not supported by the Play Store on the current device.
     *
     * @zh
     * 当前设备上的 Play Store 不支持所请求的功能。
     */
    FEATURE_NOT_SUPPORTED = -2,
    /**
     * @en
     * The app is not connected to the Play Store service via the Google Play Billing Library.
     *
     * @zh
     * 该应用未通过 Google Play 结算库连接到 Play Store 服务。
     */
    SERVICE_DISCONNECTED = -1,
    /**
     * @en
     * Success.
     *
     * @zh
     * 成功。
     */
    OK = 0,
    /**
     * @en
     * Transaction was canceled by the user.
     *
     * @zh
     * 交易已被用户取消。
     */
    USER_CANCELED = 1,
    /**
     * @en
     * The service is currently unavailable.
     *
     * @zh
     * 当前设备上的 Play Store 不支持所请求的功能。
     */
    SERVICE_UNAVAILABLE = 2,
    /**
     * @en
     * A user billing error occurred during processing.
     *
     * @zh
     * 处理过程中出现用户计费错误。
     */
    BILLING_UNAVAILABLE = 3,
    /**
     * @en
     * The requested product is not available for purchase.
     *
     * @zh
     * 所请求的产品无法购买。
     */
    ITEM_UNAVAILABLE = 4,
    /**
     * @en
     * Error resulting from incorrect usage of the API.
     *
     * @zh
     * 由于错误使用 API 而导致的错误。
     */
    DEVELOPER_ERROR = 5,
    /**
     * @en
     * Fatal error during the API action.
     *
     * @zh
     * API 操作期间发生致命错误。
     */
    ERROR = 6,
    /**
     * @en
     * The purchase failed because the item is already owned.
     *
     * @zh
     * 购买失败，因为该物品已被拥有。
     */
    ITEM_ALREADY_OWNED = 7,
    /**
     * @en
     * Requested action on the item failed since it is not owned by the user.
     *
     * @zh
     * 由于该项目不属于用户，因此对该项目请求的操作失败。
     */
    ITEM_NOT_OWNED = 8,
    /**
     * @en
     * A network error occurred during the operation.
     *
     * @zh
     * 操作期间发生网络错误。
     */
    NETWORK_ERROR = 12,
}

/**
 * @en
 * Recurrence mode of the pricing phase.
 *
 * @zh
 * 定价阶段的复现模式。
 */
export enum RecurrenceMode {
    /**
     * @en
     * The billing plan payment recurs for infinite billing periods unless cancelled.
     *
     * @zh
     * 除非取消，否则计费计划付款将无限期地重复。
     */
    INFINITE_RECURRING = 1,
    /**
     * @en
     * The billing plan payment recurs for a fixed number of billing period set in billingCycleCount.
     *
     * @zh
     * 计费计划付款将在 billingCycleCount 中设置的固定计费周期内重复发生。
     */
    FINITE_RECURRING = 2,
    /**
     * @en
     * The billing plan payment is a one time charge that does not repeat.
     *
     * @zh
     * 计费计划付款是一次性费用，不会重复。
     */
    NON_RECURRING = 3,
}

/**
 * @en
 * Connection state of billing client.
 *
 * @zh
 * BillingClient的连接状态
 */
export enum ConnectionState {
    /**
     * @en
     * This client was not yet connected to billing service or was already closed.
     *
     * @zh
     * 此客户端尚未连接到Billing服务或已关闭。
     */
    DISCONNECTED = 0,
    /**
     * @en
     * This client is currently in process of connecting to billing service.
     *
     * @zh
     * 此客户端目前正在连接到Billing服务。
     */
    CONNECTING = 1,
    /**
     * @en
     * This client is currently connected to billing service.
     *
     * @zh
     * 此客户端当前已连接到Billing服务。
     */
    CONNECTED = 2,
    /**
     * @en
     * This client was already closed and shouldn't be used again.
     *
     * @zh
     * 该客户端已关闭，不应再次使用。
     */
    CLOSED = 3,
}

/**
 * @en
 * Features/capabilities supported by isFeatureSupported.
 *
 * @zh
 * 支持的特性/能力isFeatureSupported。
 */
export enum FeatureType {
    /**
     * @en
     * Alternative billing only.
     *
     * @zh
     * 仅限替代Billing。
     */
    ALTERNATIVE_BILLING_ONLY = 'jjj',
    /**
     * @en
     * Get billing config.
     *
     * @zh
     * 获取计费配置。。
     */
    BILLING_CONFIG = 'ggg',
    /**
     * @en
     * Play billing library support for external offer.
     *
     * @zh
     * Play billing库支持外部报价。
     */
    EXTERNAL_OFFER = 'kkk',
    /**
     * @en
     * Show in-app messages.
     *
     * @zh
     * 显示应用内消息。
     */
    IN_APP_MESSAGING  = 'bbb',
    /**
     * @en
     * Launch a price change confirmation flow.
     *
     * @zh
     * 启动价格变动确认流程。
     */
    PRICE_CHANGE_CONFIRMATION = 'priceChangeConfirmation',
    /**
     * @en
     * Play billing library support for querying and purchasing.
     *
     * @zh
     * Play Billing库支持查询、购买。
     */
    PRODUCT_DETAILS = 'fff',
    /**
     * @en
     * Purchase/query for subscriptions.
     *
     * @zh
     * 购买/查询订阅。
     */
    SUBSCRIPTIONS = 'subscriptions',
    /**
     * @en
     * Subscriptions update/replace.
     *
     * @zh
     * 订阅更新/替换。
     */
    UBSCRIPTIONS_UPDATE = 'subscriptionsUpdate',
}

/**
 * @en
 * Possible purchase states.
 *
 * @zh
 * 可能的购买状态。
 */
export enum PurchaseState {
    /**
     * @en
     * Purchase is pending and not yet completed to be processed by your app.
     *
     * @zh
     * 购买处于待处理状态且尚未完成，无法由您的应用程序处理。
     */
    PENDING = 2,
    /**
     * @en
     * Purchase is completed..
     *
     * @zh
     * 购买完成。
     */
    PURCHASED = 1,
    /**
     * @en
     * Purchase with unknown state.
     *
     * @zh
     * 未知状态
     */
    UNSPECIFIED_STATE = 0,
}

/**
 * @en
 * Possible response codes.
 *
 * @zh
 * InAppMessage可能的影响代码。
 */
export enum InAppMessageResponseCode {
    /**
     * @en
     * The flow has finished and there is no action needed from developers.
     *
     * @zh
     * 流程已完成，开发人员无需采取任何行动。
     */
    NO_ACTION_NEEDED = 0,
    /**
     * @en
     * The subscription status changed.
     *
     * @zh
     * 订阅状态已改变。
     */
    SUBSCRIPTION_STATUS_UPDATED = 1,
}

interface BillingEventMap {
    [BillingEventType.BILLING_SETUP_FINISHED]: (result: native.BillingResult) => void,
    [BillingEventType.BILLING_SERVICE_DISCONNECTED]: () => void,
    [BillingEventType.PRODUCT_DETAILS_RESPONSE]: (result: native.BillingResult,
        productDetailsList: native.ProductDetails[]) => void,
    [BillingEventType.PURCHASES_UPDATED]: (result: native.BillingResult,
        purchases: native.Purchase[]) => void,
    [BillingEventType.CONSUME_RESPONSE]: (result: native.BillingResult,
        purchaseToken: string) => void,
    [BillingEventType.QUERY_PURCHASES_RESPONSE]: (result: native.BillingResult,
        purchases: native.Purchase[]) => void,
    [BillingEventType.BILLING_CONFIG_RESPONSE]: (result: native.BillingResult, config: native.BillingConfig) => void
    [BillingEventType.ALTERNATIVE_BILLING_ONLY_TOKEN_RESPONSE]: (result: native.BillingResult, alternativeBillingOnlyReportingDetails: native.AlternativeBillingOnlyReportingDetails) => void
    [BillingEventType.EXTERNAL_OFFER_REPORTING_DETAILS_RESPONSE]: (result: native.BillingResult, externalOfferReportingDetails: native.ExternalOfferReportingDetails) => void
    [BillingEventType.ALTERNATIVE_BILLING_ONLY_AVAILABILITY_RESPONSE]: (result: native.BillingResult) => void
    [BillingEventType.EXTERNAL_OFFER_AVAILABILITY_RESPONSE]: (result: native.BillingResult) => void
    [BillingEventType.ALTERNATIVE_BILLING_ONLY_INFORMATION_DIALOG_RESPONSE]: (result: native.BillingResult) => void
    [BillingEventType.EXTERNAL_OFFER_INFORMATION_DIALOG_RESPONSE]: (result: native.BillingResult) => void
    [BillingEventType.IN_APP_MESSAGE_RESPONSE]: (result: native.InAppMessageResult) => void
}

export class GooglePlayBilling {
    private _eventTarget: EventTarget = new EventTarget();
    constructor () {
        if (!JSB || !jsb.billing) {
            return;
        }
        jsb.onBillingSetupFinished = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.BILLING_SETUP_FINISHED, result);
        };

        jsb.onBillingServiceDisconnected = (): void => {
            this._eventTarget.emit(BillingEventType.BILLING_SERVICE_DISCONNECTED);
        };

        jsb.onProductDetailsResponse = (
            result: native.BillingResult,
            productDetailsList: native.ProductDetails[],
        ): void => {
            this._eventTarget.emit(BillingEventType.PRODUCT_DETAILS_RESPONSE, result, productDetailsList);
        };

        jsb.onPurchasesUpdated = (
            result: native.BillingResult,
            purchaseList: native.Purchase[],
        ): void => {
            this._eventTarget.emit(BillingEventType.PURCHASES_UPDATED, result, purchaseList);
        };

        jsb.onConsumeResponse = (
            result: native.BillingResult,
            purchaseToken: string,
        ): void => {
            this._eventTarget.emit(BillingEventType.CONSUME_RESPONSE, result, purchaseToken);
        };

        jsb.onAcknowledgePurchaseResponse = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.ACKNOWLEDGE_PURCHASES_RESPONSE, result);
        };

        jsb.onQueryPurchasesResponse = (
            result: native.BillingResult,
            purchaseList: native.Purchase[],
        ): void => {
            this._eventTarget.emit(BillingEventType.QUERY_PURCHASES_RESPONSE, result, purchaseList);
        };

        jsb.onBillingConfigResponse = (result: native.BillingResult, config: native.BillingConfig): void => {
            this._eventTarget.emit(BillingEventType.BILLING_CONFIG_RESPONSE, result, config);
        };

        jsb.onAlternativeBillingOnlyTokenResponse = (result: native.BillingResult, alternativeBillingOnlyReportingDetails: native.AlternativeBillingOnlyReportingDetails): void => {
            this._eventTarget.emit(BillingEventType.ALTERNATIVE_BILLING_ONLY_TOKEN_RESPONSE, result, alternativeBillingOnlyReportingDetails);
        };

        jsb.onExternalOfferReportingDetailsResponse = (result: native.BillingResult, externalOfferReportingDetails: native.ExternalOfferReportingDetails): void => {
            this._eventTarget.emit(BillingEventType.EXTERNAL_OFFER_REPORTING_DETAILS_RESPONSE, result, externalOfferReportingDetails);
        };

        jsb.onAlternativeBillingOnlyAvailabilityResponse = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.ALTERNATIVE_BILLING_ONLY_AVAILABILITY_RESPONSE, result);
        };

        jsb.onExternalOfferAvailabilityResponse = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.EXTERNAL_OFFER_AVAILABILITY_RESPONSE, result);
        };

        jsb.onAlternativeBillingOnlyInformationDialogResponse = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.ALTERNATIVE_BILLING_ONLY_INFORMATION_DIALOG_RESPONSE, result);
        };

        jsb.onExternalOfferInformationDialogResponse = (result: native.BillingResult): void => {
            this._eventTarget.emit(BillingEventType.EXTERNAL_OFFER_INFORMATION_DIALOG_RESPONSE, result);
        };

        jsb.onInAppMessageResponse = (result: native.InAppMessageResult): void => {
            this._eventTarget.emit(BillingEventType.IN_APP_MESSAGE_RESPONSE, result);
        };
    }

    /**
     * @en Starts up BillingClient setup process asynchronously.
     * @zh 异步启动 BillingClient 设置过程。
     */
    public startConnection (): void {
        jsb.billing?.startConnection();
    }

    /**
     * @en Closes the connection and releases all held resources such as service connections.
     * @zh 关闭连接并释放所有持有的资源，例如服务连接。
     */
    public endConnection (): void {
        jsb.billing?.endConnection();
    }

    /**
     * @en Get the current billing client connection state.
     * @zh 获取当前计费客户端连接状态。
     */
    public getConnectionState (): number {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.getConnectionState();
        }
        return 0;
    }

    /**
     * @en Checks if the client is currently connected to the service, so that requests to other methods will succeed.
           Returns true if the client is currently connected to the service, false otherwise.
     * @zh 检查客户端当前是否连接到服务，以便对其他方法的请求能够成功。
           如果客户端当前已连接到服务，则返回 true，否则返回 false。
     */
    public isReady (): boolean {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.isReady();
        }
        return false;
    }

    /**
     * @en Performs a network query the details of products available for sale in your app.
     * @zh 执行网络查询您的应用中可供销售的产品的详细信息。
     */
    public queryProductDetailsParams (productId: string[] | string, productType: ProductType): void {
        if (productId instanceof Array) {
            jsb.billing?.queryProductDetailsParams(productId, productType);
        } else {
            const productIdList: string[] = [];
            productIdList.push(productId);
            jsb.billing?.queryProductDetailsParams(productIdList, productType);
        }
    }

    /**
     * @en Initiates the billing flow for an in-app purchase or subscription.
     * @zh 启动应用内购买或订阅的计费流程。
     */
    public launchBillingFlow (productDetails: native.ProductDetails[] | native.ProductDetails, selectedOfferToken: string | null): void {
        if (productDetails instanceof Array) {
            jsb.billing?.launchBillingFlow(productDetails, selectedOfferToken);
        } else {
            const productDetailsList: native.ProductDetails[] = [];
            productDetailsList.push(productDetails);
            jsb.billing?.launchBillingFlow(productDetailsList, selectedOfferToken);
        }
    }

    /**
     * @en Consumes a given in-app product.
     * @zh 消费指定的应用内产品。
     */
    public consumePurchases (purchase: native.Purchase[] | native.Purchase): void {
        if (purchase instanceof Array) {
            jsb.billing?.consumePurchases(purchase);
        } else {
            const purchaseList: native.Purchase[] = [];
            purchaseList.push(purchase);
            jsb.billing?.consumePurchases(purchaseList);
        }
    }

    /**
     * @en Acknowledges in-app purchases.
     * @zh 确认应用内购买。
     */
    public acknowledgePurchase (purchase: native.Purchase[] | native.Purchase): void {
        if (purchase instanceof Array) {
            jsb.billing?.acknowledgePurchase(purchase);
        } else {
            const purchaseList: native.Purchase[] = [];
            purchaseList.push(purchase);
            jsb.billing?.acknowledgePurchase(purchase);
        }
    }

    /**
     * @en Returns purchases details for currently owned items bought within your app.
     * @zh 返回您应用内当前拥有的购买商品的购买详情。
     */
    public queryPurchasesAsync (productType: ProductType): void {
        jsb.billing?.queryPurchasesAsync(productType);
    }

    /**
     * @en Gets the billing config, which stores configuration used to perform billing operations.
     * @zh 获取计费配置，其中存储用于执行计费操作的配置。
     */
    public getBillingConfigAsync (): void {
        jsb.billing?.getBillingConfigAsync();
    }

    /**
     * @en Creates alternative billing only purchase details that can be used to report a transaction made via alternative billing without user choice to use Google Play billing.
     * @zh 创建仅限替代结算的购买详情，可用于报告通过替代结算进行的交易，而无需用户选择使用 Google Play 结算。
     */
    public createAlternativeBillingOnlyReportingDetailsAsync (): void {
        jsb.billing?.createAlternativeBillingOnlyReportingDetailsAsync();
    }

    /**
     * @en Checks the availability of offering alternative billing without user choice to use Google Play billing.
     * @zh 检查是否可以提供替代结算方式，而无需用户选择使用 Google Play 结算方式。
     */
    public isAlternativeBillingOnlyAvailableAsync (): void {
        jsb.billing?.isAlternativeBillingOnlyAvailableAsync();
    }

    /**
     * @en Creates purchase details that can be used to report a transaction made via external offer.
     * @zh 创建可用于报告通过外部报价进行的交易的购买详情。
     */
    public createExternalOfferReportingDetailsAsync (): void {
        jsb.billing?.createExternalOfferReportingDetailsAsync();
    }

    /**
     * @en Checks the availability of providing external offer.
     * @zh 检查提供外部报价的可用性。
     */
    public isExternalOfferAvailableAsync (): void {
        jsb.billing?.isExternalOfferAvailableAsync();
    }

    /**
     * @en Checks if the specified feature or capability is supported by the Play Store.
     * @zh 检查 Play Store 是否支持指定的功能。
     */
    public isFeatureSupported (feature: string): native.BillingResult | null {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.isFeatureSupported(feature);
        }
        return null;
    }

    /**
     * @en Shows the alternative billing only information dialog on top of the calling app.
     * @zh 在调用应用程序顶部显示仅显示备用计费信息对话框。
     */
    public showAlternativeBillingOnlyInformationDialog (): native.BillingResult | null {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.showAlternativeBillingOnlyInformationDialog();
        }
        return null;
    }

    /**
     * @en Shows the external offer information dialog on top of the calling app.
     * @zh 在调用应用程序顶部显示外部优惠信息对话框。
     */
    public showExternalOfferInformationDialog (): native.BillingResult | null {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.showExternalOfferInformationDialog();
        }
        return null;
    }

    /**
     * @en Overlays billing related messages on top of the calling app.
     * @zh 在调用应用程序上叠加与计费相关的消息。
     */
    public showInAppMessages (): native.BillingResult | null {
        if (jsb.billing) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return jsb.billing.showInAppMessages();
        }
        return null;
    }

    public on <K extends keyof BillingEventMap> (type: K, callback: BillingEventMap[K], target?: unknown): BillingEventMap[K] {
        this._eventTarget.on(type, callback, target);
        return callback;
    }
    public once <K extends keyof BillingEventMap> (type: K, callback: BillingEventMap[K], target?: unknown): BillingEventMap[K] {
        this._eventTarget.once(type, callback, target);
        return callback;
    }
    public off<K extends keyof BillingEventMap> (eventType: K, callback?: BillingEventMap[K], target?: any): void {
        this._eventTarget.off(eventType, callback, target);
    }
}

/**
 * @en
 * The singleton of the Input class, this singleton manages all events of input. include: touch, mouse, accelerometer, gamepad, handle, hmd and keyboard.
 *
 * @zh
 * google play的blling支付模块的接口。
 *
 * @example
 */
export const googlePlayBilling = new GooglePlayBilling();
