// some interfaces might be overridden
/* eslint-disable import/no-mutable-exports */

/**
 * API for jsb module
 * Author: haroel
 * Homepage: https://github.com/haroel/creatorexDTS
 *
 * @deprecated since v3.6.0, please import `native` from 'cc' module instead like `import { native } from 'cc';`.
 */
declare namespace jsb {

    let window: any;

    type AccelerationXYZ = number;
    type AccelerationIncludingGravityXYZ = number;
    type RotationRateAlpha = number;
    type RotationRateBeta = number;
    type RotationRateGamma = number;
    type DeviceMotionValue = [AccelerationXYZ, AccelerationXYZ, AccelerationXYZ,
        AccelerationIncludingGravityXYZ, AccelerationIncludingGravityXYZ, AccelerationIncludingGravityXYZ,
        RotationRateAlpha, RotationRateBeta, RotationRateGamma];
    export namespace device {
        export function getBatteryLevel(): number;
        export function getDevicePixelRatio(): number;
        export function getDeviceOrientation(): number;
        export function getNetworkType(): number; // TODO: enum type
        export function getSafeAreaEdge(): NativeSafeAreaEdge;

        export function setAccelerometerEnabled(isEnabled: boolean);
        export function setAccelerometerInterval(intervalInSeconds: number);
        export function getDeviceMotionValue(): DeviceMotionValue;
    }

    export interface NativeSafeAreaEdge {
        /**
         * top
         */
        x: number;
        /**
         * left
         */
        y: number;
        /**
         * bottom
         */
        z: number;
        /**
         * right
         */
        w: number;
    }

    export interface MouseEvent {
        x: number,
        y: number,
        xDelta: number | undefined,
        yDelta: number | undefined,
        button: number,
        windowId: number,
    }
    type MouseEventCallback = (mouseEvent: MouseEvent) => void;
    export interface MouseWheelEvent extends MouseEvent {
        wheelDeltaX: number,
        wheelDeltaY: number,
    }
    type MouseWheelEventCallback = (mouseEvent: MouseWheelEvent) => void;
    export let onMouseDown: MouseEventCallback | undefined;
    export let onMouseMove: MouseEventCallback | undefined;
    export let onMouseUp: MouseEventCallback | undefined;
    export let onMouseWheel: MouseWheelEventCallback | undefined;

    type TouchEventCallback = (touchList: TouchList, windowId?: number) => void;
    export let onTouchStart: TouchEventCallback | undefined;
    export let onTouchMove: TouchEventCallback | undefined;
    export let onTouchEnd: TouchEventCallback | undefined;
    export let onTouchCancel: TouchEventCallback | undefined;

    export interface ControllerInfo {
        id: number;
        axisInfoList: AxisInfo[],
        buttonInfoList: ButtonInfo[],
        touchInfoList: TouchInfo[],
    }

    export interface AxisInfo {
        code: number,
        value: number,
    }

    export interface ButtonInfo {
        code: number,
        isPressed: boolean,
    }

    export interface TouchInfo {
        code: number,
        value: number,
    }

    export let onControllerInput: (infoList: ControllerInfo[]) => void | undefined;
    export let onHandleInput: (infoList: ControllerInfo[]) => void | undefined;
    export let onControllerChange: (controllerIds: number[]) => void | undefined;

    export interface PoseInfo {
        code: number,
        x: number,
        y: number,
        z: number,
        quaternionX: number,
        quaternionY: number,
        quaternionZ: number,
        quaternionW: number,
    }

    export let onHandlePoseInput: (infoList: PoseInfo[]) => void | undefined;
    export let onHMDPoseInput: (infoList: PoseInfo[]) => void | undefined;
    export let onHandheldPoseInput: (infoList: PoseInfo[]) => void | undefined;

    export interface KeyboardEvent {
        altKey: boolean;
        ctrlKey: boolean;
        metaKey: boolean;
        shiftKey: boolean;
        repeat: boolean;
        keyCode: number;
        windowId: number;
        code: string;
    }
    type KeyboardEventCallback = (keyboardEvent: KeyboardEvent) => void;
    export let onKeyDown: KeyboardEventCallback | undefined;
    export let onKeyUp: KeyboardEventCallback | undefined;

    export interface WindowEvent {
        windowId: number;
        width: number;
        height: number;
    }

    /**
     * @en WindowEvent.width and WindowEvent.height have both been multiplied by DPR
     * @zh WindowEvent.width 和 WindowEvent.height 都已乘以 DPR
     */
    export let onResize: (event: WindowEvent) => void | undefined;
    export let onOrientationChanged: (event: { orientation: number }) => void | undefined;  // TODO: enum orientation type
    export let onResume: () => void | undefined;
    export let onPause: () => void | undefined;
    export let onClose: () => void | undefined;
    export let onWindowLeave: () => void | undefined;
    export let onWindowEnter: () => void | undefined;
    export function openURL(url: string): void;
    export function garbageCollect(): void;
    enum AudioFormat {
        UNKNOWN,
        SIGNED_8,
        UNSIGNED_8,
        SIGNED_16,
        UNSIGNED_16,
        SIGNED_32,
        UNSIGNED_32,
        FLOAT_32,
        FLOAT_64
    }
    interface PCMHeader {
        totalFrames: number;
        sampleRate: number;
        bytesPerFrame: number;
        audioFormat: AudioFormat;
        channelCount: number;
    }
    export namespace AudioEngine {
        export function preload(url: string, cb: (isSuccess: boolean) => void);

        export function play2d(url: string, loop: boolean, volume: number): number;
        export function pause(id: number);
        export function pauseAll();
        export function resume(id: number);
        export function resumeAll();
        export function stop(id: number);
        export function stopAll();

        export function getPlayingAudioCount(): number;
        export function getMaxAudioInstance(): number;
        export function getState(id: number): any;
        export function getDuration(id: number): number;
        export function getVolume(id: number): number;
        export function isLoop(id: number): boolean;
        export function getCurrentTime(id: number): number;

        export function setVolume(id: number, val: number);
        export function setLoop(id: number, val: boolean);
        export function setCurrentTime(id: number, val: number);

        export function uncache(url: string);
        export function uncacheAll();
        export function setErrorCallback(id: number, cb: (err: any) => void);
        export function setFinishCallback(id: number, cb: () => void);

        /**
         * Get PCM header without pcm data. if you want to get pcm data, use getOriginalPCMBuffer instead
         */
        export function getPCMHeader(url: string): PCMHeader;
        /**
         * Get PCM Data in decode format for example Int16Array, the format information is written in PCMHeader.
         * @param url: file relative path, for example player._path
         * @param channelID: ChannelID which should smaller than channel count, start from 0
         */
        export function getOriginalPCMBuffer(url: string, channelID: number): ArrayBuffer | undefined;
    }

    class NativePOD {
        underlyingData(): ArrayBuffer;
        _data(): TypedArray;
        __data: TypedArray;
    }

    export class Color extends NativePOD {
    }
    export class Quat extends NativePOD {
    }
    export class Vec2 extends NativePOD {
    }
    export class Vec3 extends NativePOD {
    }
    export class Vec4 extends NativePOD {
    }

    export class Mat3 extends NativePOD {
    }
    export class Mat4 extends NativePOD {
    }
    export interface ManifestAsset {
        md5: string;
        path: string;
        compressed: boolean;
        size: number;
        downloadState: number;
    }

    export class Manifest {
        constructor(manifestUrl: string);
        constructor(content: string, manifestRoot: string);
        parseFile(manifestUrl: string): void;
        parseJSONString(content: string, manifestRoot: string): void;

        getManifestRoot(): string;
        getManifestFileUrl(): string;
        getVersionFileUrl(): string;
        getSearchPaths(): [string];
        getVersion(): string;
        getPackageUrl(): boolean;

        setUpdating(isUpdating: boolean): void;
        isUpdating(): boolean;
        isVersionLoaded(): boolean;
        isLoaded(): boolean;
    }

    export class EventAssetsManager {
        // EventCode
        static ERROR_NO_LOCAL_MANIFEST: number;
        static ERROR_DOWNLOAD_MANIFEST: number;
        static ERROR_PARSE_MANIFEST: number;
        static NEW_VERSION_FOUND: number;
        static ALREADY_UP_TO_DATE: number;
        static UPDATE_PROGRESSION: number;
        static ASSET_UPDATED: number;
        static ERROR_UPDATING: number;
        static UPDATE_FINISHED: number;
        static UPDATE_FAILED: number;
        static ERROR_DECOMPRESS: number;

        constructor(eventName: string, manager: AssetsManager, eventCode: number,
            assetId?: string, message?: string, curleCode?: number, curlmCode?: number);
        getAssetsManagerEx(): AssetsManager;
        isResuming(): boolean;

        getDownloadedFiles(): number;
        getDownloadedBytes(): number;
        getTotalFiles(): number;
        getTotalBytes(): number;
        getPercent(): number;
        getPercentByFile(): number;

        getEventCode(): number;
        getMessage(): string;
        getAssetId(): string;
        getCURLECode(): number;
        getCURLMCode(): number;
    }

    export namespace AssetsManager {
        export enum State {
            UNINITED,
            UNCHECKED,
            PREDOWNLOAD_VERSION,
            DOWNLOADING_VERSION,
            VERSION_LOADED,
            PREDOWNLOAD_MANIFEST,
            DOWNLOADING_MANIFEST,
            MANIFEST_LOADED,
            NEED_UPDATE,
            READY_TO_UPDATE,
            UPDATING,
            UNZIPPING,
            UP_TO_DATE,
            FAIL_TO_UPDATE,
        }
    }

    export class AssetsManager {
        constructor(manifestUrl: string, storagePath: string, versionCompareHandle?: (versionA: string, versionB: string) => number);
        static create(manifestUrl: string, storagePath: string): AssetsManager;

        getState(): AssetsManager.State;
        getStoragePath(): string
        getMaxConcurrentTask(): number;
        // setMaxConcurrentTask (max: number): void;  // actually not supported

        checkUpdate(): void;
        prepareUpdate(): void;
        update(): void;
        isResuming(): boolean;

        getDownloadedFiles(): number;
        getDownloadedBytes(): number;
        getTotalFiles(): number;
        getTotalBytes(): number;
        downloadFailedAssets(): void;

        getLocalManifest(): Manifest;
        loadLocalManifest(manifestUrl: string): boolean;
        loadLocalManifest(localManifest: Manifest, storagePath: string): boolean;
        getRemoteManifest(): Manifest;
        loadRemoteManifest(remoteManifest: Manifest): boolean;

        /**
         * Setup your own version compare handler, versionA and B is versions in string.
         * if the return value greater than 0, versionA is greater than B,
         * if the return value equals 0, versionA equals to B,
         * if the return value smaller than 0, versionA is smaller than B.
         */
        setVersionCompareHandle(versionCompareHandle?: (versionA: string, versionB: string) => number): void;
        /**
         * Setup the verification callback, Return true if the verification passed, otherwise return false
         */
        setVerifyCallback(verifyCallback: (path: string, asset: ManifestAsset) => boolean): void;
        setEventCallback(eventCallback: (event: EventAssetsManager) => void): void;
    }

    // Android ADPF module
    const adpf: {
        readonly thermalHeadroom: number;
        readonly thermalStatus: number;
        readonly thermalStatusMin: number;
        readonly thermalStatusMax: number;
        readonly thermalStatusNormalized: number;
        onThermalStatusChanged?: (previousStatus: number, newStatus: number, statusMin: number, statusMax: number) => void;
    } | undefined;

    /**
     * @en Params containing the response code and the debug message from In-app Billing API response.
     * @zh 包含应用内结算 API 响应代码和调试信息的参数
     */
    export interface BillingResult {
        /**
         * @en Debug message returned in In-app Billing API calls.
         * @zh 应用内结算 API 调用中返回的调试消息。
         */
        readonly debugMessage: string;
        /**
         * @en Code returned in In-app Billing API calls.
         * @zh 应用内结算 API 调用中返回的响应代码。
         */
        readonly responseCode: string;
        readonly toStr: string;
    }

    /**
     * @en Represents the offer details to buy an one-time purchase product.
     * @zh 代表一次性购买产品的报价详情。
     */
    export interface OneTimePurchaseOfferDetails {
        /**
         * @en The price for the payment in micro-units, where 1,000,000 micro-units equal one unit of the currency.
         * @zh 以微单位返回支付价格，其中 1,000,000 个微单位等于 1 个货币单位。
         */
        readonly priceAmountMicros: number;
        /**
         * @en Formatted price for the payment, including its currency sign.
         * @zh 支付的格式化价格，包括其货币单位。
         */
        readonly formattedPrice: string;
        /**
         * @en ISO 4217 currency code for price.
         * @zh 价格的 ISO 4217 货币代码。
         */
        readonly priceCurrencyCode: string;
    }

    /**
     * @en Represents additional details of an installment subscription plan.
     * @zh 表示分期付款订阅计划的附加详细信息。
     */
    export interface InstallmentPlanDetails {
        /**
         * @en Committed payments count after a user signs up for this subscription plan.
         * @zh 用户注册此订阅计划后承诺的付款数量。
         */
        readonly installmentPlanCommitmentPaymentsCount: number;
        /**
         * @en Subsequent committed payments count after this subscription plan renews.
         * @zh 此订阅计划续订后的后续承诺付款数量。
         */
        readonly subsequentInstallmentPlanCommitmentPaymentsCount: number;
    }

    /**
     * @en Represents a pricing phase, describing how a user pays at a point in time.
     * @zh 表示定价阶段，描述用户在某个时间点如何付款。
     */
    export interface PricingPhase {
        /**
         * @en Number of cycles for which the billing period is applied.
         * @zh 计费周期适用的周期数。
         */
        readonly billingCycleCount: number;
        /**
         * @en The price for the payment cycle in micro-units, where 1,000,000 micro-units equal one unit of the currency.
         * @zh 微单位付款周期的价格，其中 1,000,000 个微单位等于 1 个货币单位。
         */
        readonly priceAmountMicros: number;
        /**
         * @en RecurrenceMode for the pricing phase.
         * @zh 定价阶段的RecurrenceMode。
         */
        readonly recurrenceMode: number;
        /**
         * @en Billing period for which the given price applies, specified in ISO 8601 format.
         * @zh 给定价格适用的计费期，以 ISO 8601 格式指定。
         */
        readonly billingPeriod: string;
        /**
         * @en Formatted price for the payment cycle, including its currency sign.
         * @zh 付款周期的格式化价格，包括其货币符号。
         */
        readonly formattedPrice: string;
        /**
         * @en Returns ISO 4217 currency code for price.
         * @zh 返回价格的 ISO 4217 货币代码。
         */
        readonly priceCurrencyCode: string;
    }

    /**
     * @en Represents the available purchase plans to buy a subscription product.
     * @zh 代表一次性购买产品的报价详情。
     */
    export interface SubscriptionOfferDetails {
        /**
         * @en The base plan id associated with the subscription product.
         * @zh 与订阅产品相关的基本计划 ID。
         */
        readonly basePlanId: string;
        /**
        * @en The offer id associated with the subscription product.
        * @zh 与订阅产品相关的优惠 ID。
        */
        readonly offerId: string;
        /**
        * @en The offer tags associated with this Subscription Offer.
        * @zh 与此订阅优惠相关的优惠标签。
        */
        readonly offerTags: string[];
        /**
        * @en The offer token required to pass in launchBillingFlow to purchase the subscription product with these pricing phases.
        * @zh 在 launchBillingFlow 中传递以使用这些定价阶段购买订阅产品所需的优惠令牌。
        */
        readonly offerToken: string;
        /**
         * @en The pricing phases for the subscription product.
         * @zh 订阅产品的定价区间。
         */
        readonly pricingPhaseList: PricingPhase[];
        /**
        * @en The additional details of an installment plan.
        * @zh 分期付款计划的附加详细信息。
        */
        readonly installmentPlanDetails: InstallmentPlanDetails;
    }
    /**
     * @en Represents the details of a one time or subscription product.
     * @zh 代表一次性或订阅产品的详细信息。
     */
    export interface ProductDetails {
        /**
         * @en Hash code
         * @zh hash值
         */
        readonly hashCode: number;
        /**
         * @en The description of the product.
         * @zh 产品的描述。
         */
        readonly description: string;
        /**
         * @en The name of the product being sold.
         * @zh 所售产品的名称。
         */
        readonly name: string;
        /**
         * @en The product's Id.
         * @zh 产品的 ID。
         */
        readonly productId: string;
        /**
         * @en The ProductType of the product.
         * @zh ProductType产品的。
         */
        readonly productType: string;
        /**
         * @en The title of the product being sold.
         * @zh 所售产品的标题。
         */
        readonly title: string;
        /**
         * @en To string
         * @zh 转换成字符串
         */
        readonly toStr: string;
        /**
         * @en The offer details of an one-time purchase product.
         * @zh 代表一次性购买产品的报价详情。
         */
        readonly oneTimePurchaseOfferDetails: OneTimePurchaseOfferDetails;
        /**
         * @en A list containing all available offers to purchase a subscription product.
         * @zh 返回包含购买订阅产品的所有可用优惠的列表。
         */
        readonly subscriptionOfferDetails: SubscriptionOfferDetails[];
    }

    /**
     * @en Account identifiers that were specified when the purchase was made.
     * @zh 购买时指定的帐户标识符。
     */
    export interface AccountIdentifiers {
        /**
         * @en The obfuscated account id specified in setObfuscatedAccountId.
         * @zh 在setObfuscatedAccountId中设置的混淆账户id
         */
        readonly obfuscatedAccountId: string;
        /**
         * @en The obfuscated profile id specified in setObfuscatedProfileId.
         * @zh 在setObfuscatedProfileId中设置的混淆profile id
         */
        readonly obfuscatedProfileId: string;
    }

    /**
     * @en Represents a pending change/update to the existing purchase.
     * @zh 表示对现有购买的待定更改/更新。
     */
    export interface PendingPurchaseUpdate {
        /**
         * @en A token that uniquely identifies this pending transaction.
         * @zh 唯一标识此待处理交易的令牌。
         */
        readonly purchaseToken: string;
        /**
         * @en The product ids.
         * @zh 产品 ID。
         */
        readonly products: string[];
    }

    /**
     * @en Represents an in-app billing purchase.
     * @zh 代表应用内billing购买。
     */
    export interface Purchase {
        /**
         * @en One of PurchaseState indicating the state of the purchase.
         * @zh PurchaseState表示购买状态的其中一个值。
         */
        readonly purchaseState: number;
        /**
         * @en The time the product was purchased, in milliseconds since the epoch (Jan 1, 1970).
         * @zh 产品购买的时间，以纪元（1970 年 1 月 1 日）以来的毫秒数表示。
         */
        readonly purchaseTime: number;
        /**
         * @en Indicates whether the purchase has been acknowledged.
         * @zh 表示是否已确认购买。
         */
        readonly isAcknowledged: number;
        /**
         * @en Indicates whether the subscription renews automatically.
         * @zh 指示订阅是否自动续订。
         */
        readonly isAutoRenewing: number;
        /**
         * @en Hash code
         * @zh hash值
         */
        readonly hashCode: number;

        /**
         * @en The quantity of the purchased product.
         * @zh 购买产品的数量。
         */
        readonly quantity: number;
        /**
         * @en The payload specified when the purchase was acknowledged or consumed.
         * @zh 确认或消费购买时指定的有效负载。
         */
        readonly developerPayload: string;
        /**
         * @en Returns a unique order identifier for the transaction.
         * @zh 交易的唯一订单标识符。
         */
        readonly orderId: string;
        /**
         * @en Returns a String in JSON format that contains details about the purchase order.
         * @zh 包含有关采购订单详细信息的 JSON 格式的字符串。
         */
        readonly originalJson: string;
        /**
         * @en The application package from which the purchase originated.
         * @zh 购买来源的应用程序包。
         */
        readonly packageName: string;
        /**
         * @en A token that uniquely identifies a purchase for a given item and user pair.
         * @zh 唯一标识给定商品和用户对的购买的令牌。
         */
        readonly purchaseToken: string;
        /**
         * @en String containing the signature of the purchase data that was signed with the private key of the developer.
         * @zh 包含使用开发者私钥签名的购买数据签名的字符串。
         */
        readonly signature: string;
        /**
         * @en To string
         * @zh 转换成字符串
         */
        readonly toStr: string;

        /**
         * @en Returns account identifiers that were provided when the purchase was made.
         * @zh 返回购买时提供的帐户标识符。
         */
        readonly accountIdentifiers: AccountIdentifiers;
        /**
         * @en The PendingPurchaseUpdate for an uncommitted transaction.
         * @zh 返回PendingPurchaseUpdate未提交的事务。
         */
        readonly pendingPurchaseUpdate: PendingPurchaseUpdate;
        /**
         * @en the product Ids.
         * @zh 产品 ID。
         */
        readonly products: string[];
    }

    export interface BillingConfig {
        /**
         * @en The customer's country code.
         * @zh 客户的国家代码。
         */
        readonly countryCode: string;
    }

    /**
     * @en The details used to report transactions made via alternative billing without user choice to use Google Play billing.
     * @zh 用于报告用户未选择使用 Google Play 结算方式而通过替代结算方式进行的交易的详细信息。
     */
    export interface AlternativeBillingOnlyReportingDetails {
        /**
         * @en An external transaction token that can be used to report a transaction made via alternative billing
         *     without user choice to use Google Play billing.
         * @zh 返回一个外部交易令牌，该令牌可用于报告通过替代付款方式进行的交易，而无需用户选择使用 Google Play 付款方式。
         */
        readonly externalTransactionToken: string;
    }

    /**
     * @en The details used to report transactions made via external offer.
     * @zh 用于报告通过外部报价进行的交易的详细信息。
     */
    export interface ExternalOfferReportingDetails {
        /**
         * @en An external transaction token that can be used to report a transaction made via external offer.
         * @zh 可用于报告通过外部报价进行的交易的外部交易令牌。
         */
        readonly externalTransactionToken: string;
    }

    /**
     * @en Results related to in-app messaging.
     * @zh 与应用程序内消息相关的结果。
     */
    export interface InAppMessageResult {
        /**
         * @en Response code for the in-app messaging API call.
         * @zh 应用内消息传递 API 调用的响应代码。
         */
        readonly responseCode: number;
        /**
         * @en Token that identifies the purchase to be acknowledged, if any.
         * @zh 返回标识需要确认的购买的令牌。
         */
        readonly purchaseToken: string;
    }

    /**
     * @en Main interface for communication between the google play library and user application code.
     * @zh 产品 ID。
     */
    const billing: {
        /**
         * @en Starts up BillingClient setup process asynchronously.
         * @zh 异步启动 BillingClient 设置过程。
         */
        startConnection(): void;

        /**
         * @en Closes the connection and releases all held resources such as service connections.
         * @zh 关闭连接并释放所有持有的资源，例如服务连接。
         */
        endConnection(): void;

        /**
         * @en Get the current billing client connection state.
         * @zh 获取当前计费客户端连接状态。
         */
        getConnectionState(): number;

        /**
         * @en Checks if the client is currently connected to the service, so that requests to other methods will succeed.
               Returns true if the client is currently connected to the service, false otherwise.
         * @zh 检查客户端当前是否连接到服务，以便对其他方法的请求能够成功。
               如果客户端当前已连接到服务，则返回 true，否则返回 false。
         */
        isReady(): boolean;

        /**
         * @en Performs a network query the details of products available for sale in your app.
         * @zh 执行网络查询您的应用中可供销售的产品的详细信息。
         */
        queryProductDetailsParams(productId: string[], productType: string): void;
        /**
         * @en Initiates the billing flow for an in-app purchase or subscription.
         * @zh 启动应用内购买或订阅的计费流程。
         */
        launchBillingFlow(productDetails: ProductDetails[], selectedOfferToken: string | null): void;
        /**
         * @en Consumes a given in-app product.
         * @zh 消费指定的应用内产品。
         */
        consumePurchases(purchases: Purchase[]): void;
        /**
         * @en Returns purchases details for currently owned items bought within your app.
         * @zh 返回您应用内当前拥有的购买商品的购买详情。
         */
        queryPurchasesAsync(productType: string): void;
        /**
         * @en Acknowledges in-app purchases..
         * @zh 确认应用内购买。
         */
        acknowledgePurchase(purchases: Purchase[]): void;
        /**
         * @en Gets the billing config, which stores configuration used to perform billing operations.
         * @zh 获取计费配置，其中存储用于执行计费操作的配置。
         */
        getBillingConfigAsync(): void;

        /**
         * @en Creates alternative billing only purchase details that can be used to report a transaction made via alternative billing without user choice to use Google Play billing.
         * @zh 创建仅限替代结算的购买详情，可用于报告通过替代结算进行的交易，而无需用户选择使用 Google Play 结算。
         */
        createAlternativeBillingOnlyReportingDetailsAsync(): void;
        /**
         * @en Checks the availability of offering alternative billing without user choice to use Google Play billing.
         * @zh 检查是否可以提供替代结算方式，而无需用户选择使用 Google Play 结算方式。
         */
        isAlternativeBillingOnlyAvailableAsync(): void;

        /**
         * @en Creates purchase details that can be used to report a transaction made via external offer.
         * @zh 创建可用于报告通过外部报价进行的交易的购买详情。
         */
        createExternalOfferReportingDetailsAsync(): void;
        /**
         * @en Checks the availability of providing external offer.
         * @zh 检查提供外部报价的可用性。
         */
        isExternalOfferAvailableAsync(): void;

        /**
         * @en Checks if the specified feature or capability is supported by the Play Store.
         * @zh 检查 Play Store 是否支持指定的功能。
         */
        isFeatureSupported(feature: string): BillingResult;

        /**
         * @en Shows the alternative billing only information dialog on top of the calling app.
         * @zh 在调用应用程序顶部显示仅显示备用计费信息对话框。
         */
        showAlternativeBillingOnlyInformationDialog(): BillingResult;

        /**
         * @en Shows the external offer information dialog on top of the calling app.
         * @zh 在调用应用程序顶部显示外部优惠信息对话框。
         */
        showExternalOfferInformationDialog(): BillingResult;

        /**
         * @en Overlays billing related messages on top of the calling app.
         * @zh 在调用应用程序上叠加与计费相关的消息。
         */
        showInAppMessages(): BillingResult;
    } | undefined;
    export let onBillingSetupFinished: (result: BillingResult) => void | undefined;
    export let onBillingServiceDisconnected: () => void | undefined;
    export let onProductDetailsResponse: (result: BillingResult, productDetailsList: ProductDetails[]) => void | undefined;
    export let onPurchasesUpdated: (result: BillingResult, purchaseList: Purchase[]) => void | undefined;
    export let onConsumeResponse: (result: BillingResult, purchaseToken: string) => void | undefined;
    export let onAcknowledgePurchaseResponse: (result: BillingResult) => void | undefined;
    export let onQueryPurchasesResponse: (result: BillingResult, purchaseList: Purchase[]) => void | undefined;
    export let onBillingConfigResponse: (result: BillingResult, config: BillingConfig) => void | undefined;
    export let onAlternativeBillingOnlyTokenResponse: (result: BillingResult, details: AlternativeBillingOnlyReportingDetails) => void | undefined;
    export let onExternalOfferReportingDetailsResponse: (result: BillingResult, details: ExternalOfferReportingDetails) => void | undefined;
    export let onAlternativeBillingOnlyAvailabilityResponse: (result: BillingResult) => void | undefined;
    export let onExternalOfferAvailabilityResponse: (result: BillingResult) => void | undefined;
    export let onAlternativeBillingOnlyInformationDialogResponse: (result: BillingResult) => void | undefined;
    export let onExternalOfferInformationDialogResponse: (result: BillingResult) => void | undefined;
    export let onInAppMessageResponse: (result: InAppMessageResult) => void | undefined;
}

declare namespace ns {

    class NativePOD {
        underlyingData(): ArrayBuffer;
        _arraybuffer(): ArrayBuffer;
    }
    export class Line extends jsb.NativePOD {
    }
    export class Plane extends jsb.NativePOD {
    }
    export class Ray extends jsb.NativePOD {
    }
    export class Triangle extends jsb.NativePOD {
    }
    export class Sphere extends jsb.NativePOD {
    }
    export class AABB extends jsb.NativePOD {
    }
    export class Capsule extends jsb.NativePOD {
    }
    export class Frustum extends jsb.NativePOD {
    }
}

/**
 * Only defined on native platforms.
 * Now we only support 'V8'
 */
declare const scriptEngineType: 'V8';
