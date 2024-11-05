/*
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
*/

import { BUILD, EDITOR, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { sys, js, misc, path, cclegacy } from '../../core';
import Cache from './cache';
import downloadDomImage from './download-dom-image';
import downloadFile, { FileProgressCallback } from './download-file';
import downloadScript from './download-script';
import { files } from './shared';
import { retry, RetryFunction, urlAppendTimestamp } from './utilities';
import { IConfigOption } from './config';
import { CCON, parseCCONJson, decodeCCONBinary } from '../../serialization/ccon';
import type { AssetManager } from './asset-manager';

export type DownloadHandler = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void;

interface IDownloadRequest {
    id: string;
    priority: number;
    url: string;
    options: Record<string, any>;
    done: ((err: Error | null, data?: any) => void);
    handler: DownloadHandler;
}

const REGEX = /^(?:\w+:\/\/|\.+\/).+/;

const downloadImage = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void => {
    // if createImageBitmap is valid, we can transform blob to ImageBitmap. Otherwise, just use HTMLImageElement to load
    const func = sys.hasFeature(sys.Feature.IMAGE_BITMAP) && cclegacy.assetManager.allowImageBitmap ? downloadBlob : downloadDomImage;
    func(url, options, onComplete);
};

const downloadBlob = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void => {
    options.xhrResponseType = 'blob';
    downloadFile(url, options, options.onFileProgress as FileProgressCallback, onComplete);
};

const downloadJson = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: Record<string, any> | null) => void)): void => {
    options.xhrResponseType = 'json';
    downloadFile(url, options, options.onFileProgress as FileProgressCallback, onComplete);
};

const downloadArrayBuffer = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void => {
    options.xhrResponseType = 'arraybuffer';
    downloadFile(url, options, options.onFileProgress as FileProgressCallback, onComplete);
};

const downloadCCON = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: CCON | null) => void)): void => {
    downloader._downloadJson(url, options, (err, json): void => {
        if (err) {
            onComplete(err);
            return;
        }
        const cconPreface = parseCCONJson(json);
        const chunkPromises = Promise.all(cconPreface.chunks.map((chunk): Promise<Uint8Array> => new Promise<Uint8Array>((resolve, reject): void => {
            downloader._downloadArrayBuffer(`${path.mainFileName(url)}${chunk}`, {}, (errChunk, chunkBuffer: ArrayBuffer): void => {
                if (err) {
                    reject(err);
                } else {
                    resolve(new Uint8Array(chunkBuffer));
                }
            });
        })));
        chunkPromises.then((chunks): void => {
            const ccon = new CCON(cconPreface.document, chunks);
            onComplete(null, ccon);
        }).catch((err: Error): void => {
            onComplete(err);
        });
    });
};

const downloadCCONB = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: CCON | null) => void)): void => {
    downloader._downloadArrayBuffer(url, options, (err, arrayBuffer: ArrayBuffer): void => {
        if (err) {
            onComplete(err);
            return;
        }
        try {
            const ccon = decodeCCONBinary(new Uint8Array(arrayBuffer));
            onComplete(null, ccon);
        } catch (err) {
            onComplete(err as Error);
        }
    });
};

const downloadText = (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void => {
    options.xhrResponseType = 'text';
    downloadFile(url, options, options.onFileProgress as FileProgressCallback, onComplete);
};

const downloadBundle = (nameOrUrl: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void => {
    const bundleName = path.basename(nameOrUrl);
    let url = nameOrUrl;
    if (!REGEX.test(url)) {
        if (downloader.remoteBundles.indexOf(bundleName) !== -1) {
            url = `${downloader.remoteServerAddress}remote/${bundleName}`;
        } else {
            url = `assets/${bundleName}`;
        }
    }
    const version = options.version || downloader.bundleVers[bundleName];
    let count = 0;
    const config = `${url}/config.${version ? `${version}.` : ''}json`;
    let out: IConfigOption | null = null;
    let error: Error | null = null;
    downloadJson(config, options, (err, response): void => {
        error = err || error;
        out = response as IConfigOption;
        if (out) { out.base = `${url}/`; }
        if (++count === 2) {
            onComplete(error, out);
        }
    });

    const jspath = `${url}/index.${version ? `${version}.` : ''}js`;
    downloadScript(jspath, options, (err): void => {
        error = err || error;
        if (++count === 2) {
            onComplete(error, out);
        }
    });
};

/**
 * @en
 * Manages all download process, it is a singleton.
 * You can access it via [[AssetManager.downloader]], It can download various types of files.
 *
 * @zh
 * 管理所有下载过程，downloader 是个单例，你能通过 [[AssetManager.downloader]] 访问它，它能下载各种类型的文件。
 *
 */
export class Downloader {
    /**
     * @en Global singleton for [[Downloader]]. You can access it via [[AssetManager.downloader]].
     * @zh [[Downloader]] 的全局单例. 你可以通过 [[AssetManager.downloader]] 访问.
     */
    public static get instance (): Downloader {
        if (!Downloader._instance) {
            Downloader._instance = new Downloader();
        }
        return Downloader._instance;
    }

    /**
     * @en
     * The maximum number of concurrent when downloading.
     *
     * @zh
     * 下载时的最大并发数。
     */
    public maxConcurrency = 15;

    /**
     * @en
     * The maximum number of request can be launched per frame when downloading.
     *
     * @zh
     * 下载时每帧可以启动的最大请求数。
     *
     */
    public maxRequestsPerFrame = 15;

    /**
     * @en
     * The address of remote server.
     *
     * @zh
     * 远程服务器地址。
     *
     */
    public get remoteServerAddress (): string {
        return this._remoteServerAddress$;
    }

    /**
     * @en
     * The max number of retries when fail.
     *
     * @zh
     * 失败重试次数。
     *
     */
    public maxRetryCount = BUILD ? 3 : 0;

    /**
     * Whether to automatically add a timestamp after the url.
     * This function is mainly used to prevent the browser from using cache in editor mode.
     * You don't need to change it at runtime.
     * @internal
     */
    public appendTimeStamp = !!EDITOR_NOT_IN_PREVIEW;

    /**
     * @engineInternal
     */
    public limited = !EDITOR;

    /**
     * @en
     * Wait for while before another retry, unit: ms.
     *
     * @zh
     * 重试的间隔时间，单位为毫秒。
     *
     */
    public retryInterval = 2000;

    /**
     * @en Version information of all bundles.
     * @zh 所有包的版本信息。
     */
    public bundleVers: Record<string, string> = {};

    /**
     * @en The names of remote bundles.
     * @zh 远程包名列表。
     */
    public remoteBundles: ReadonlyArray<string> = [];

    /**
     * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using HTMLImageElement.
     */
    public downloadDomImage = downloadDomImage;

    /**
     * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using HTMLAudioElement.
     */
    public downloadDomAudio: DownloadHandler | null = null;

    /**
     * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using XMLHttpRequest.
     */
    public downloadFile = downloadFile;

    /**
     * @deprecated Since v3.7, this is an engine internal interface. You can easily implement the functionality of this API using XMLHttpRequest.
     */
    public downloadScript = downloadScript;

    /**
     * @engineInternal
     */
    public _downloadArrayBuffer = downloadArrayBuffer;

    /**
     * @engineInternal
     */
    public _downloadJson = downloadJson;

    // default handler map
    private _downloaders$: Record<string, DownloadHandler> = {
        // Images
        '.png': downloadImage,
        '.jpg': downloadImage,
        '.bmp': downloadImage,
        '.jpeg': downloadImage,
        '.gif': downloadImage,
        '.ico': downloadImage,
        '.tiff': downloadImage,
        '.webp': downloadImage,
        '.image': downloadImage,
        '.pvr': downloadArrayBuffer,
        '.pkm': downloadArrayBuffer,
        '.astc': downloadArrayBuffer,

        // Txt
        '.txt': downloadText,
        '.xml': downloadText,
        '.vsh': downloadText,
        '.fsh': downloadText,
        '.atlas': downloadText,

        '.tmx': downloadText,
        '.tsx': downloadText,

        '.json': downloadJson,
        '.ExportJson': downloadJson,
        '.plist': downloadText,

        '.ccon': downloadCCON,
        '.cconb': downloadCCONB,

        '.fnt': downloadText,

        // Binary
        '.binary': downloadArrayBuffer,
        '.bin': downloadArrayBuffer,
        '.dbbin': downloadArrayBuffer,
        '.skel': downloadArrayBuffer,

        '.js': downloadScript,

        bundle: downloadBundle,

        default: downloadText,
    };

    private _downloading$ = new Cache<((err: Error | null, data?: any) => void)[]>();
    private _queue$: IDownloadRequest[] = [];
    private _queueDirty$ = false;
    // the number of loading thread
    private _totalNum$ = 0;
    // the number of request that launched in this period
    private _totalNumThisPeriod$ = 0;
    // last time, if now - lastTime > period, refresh _totalNumThisPeriod.
    private _lastDate$ = -1;
    // if _totalNumThisPeriod equals max, move request to next period using setTimeOut.
    private _checkNextPeriod$ = false;
    private _remoteServerAddress$ = '';
    private _maxInterval$ = 1 / 30;
    private static _instance: Downloader;

    /**
     * @engineInternal
     */
    public init (remoteServerAddress = '', bundleVers: Record<string, string> = {}, remoteBundles: string[] = []): void {
        this._downloading$.clear();
        this._queue$.length = 0;
        this._remoteServerAddress$ = remoteServerAddress;
        this.bundleVers = bundleVers;
        this.remoteBundles = remoteBundles;
    }

    /**
     * @en
     * Register custom handler if you want to change default behavior or extend downloader to download other format file.
     *
     * @zh
     * 当你想修改默认行为或者拓展 downloader 来下载其他格式文件时可以注册自定义的 handler。
     *
     * @param type
     * @en Extension name likes '.jpg' or map likes {'.jpg': jpgHandler, '.png': pngHandler}.
     * @zh 扩展名，或者形如 {'.jpg': jpgHandler, '.png': pngHandler} 的映射表。
     * @param handler @en Customized handling for this extension. @zh 针对此扩展名的自定义的处理方法。
     * @param handler.url @en The url to be downloaded. @zh 待下载的 url.
     * @param handler.options @en Some optional parameters will be transferred to handler. @zh 传递到处理方法的可选参数。
     * @param handler.onComplete
     * @en Callback when finishing downloading. You need to call this method manually and pass in the execution result after the custom handler
     * is executed.
     * @zh 完成下载后的回调。你需要在自定义处理方法执行完后手动调用此方法，并将执行结果传入。
     *
     * @example
     * downloader.register('.tga', (url, options, onComplete) => onComplete(null, null));
     * downloader.register({'.tga': (url, options, onComplete) => onComplete(null, null),
     *                      '.ext': (url, options, onComplete) => onComplete(null, null)});
     *
     */
    public register (type: string, handler: (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void): void;
    public register (map: Record<string, (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void>): void;
    public register (
        type: string | Record<string, (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void>,
        handler?: (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void,
    ): void {
        if (typeof type === 'object') {
            js.mixin(this._downloaders$, type);
        } else {
            this._downloaders$[type] = handler as DownloadHandler;
        }
    }

    /**
     * @en
     * Use corresponding handler to download file under limitation.
     *
     * @zh
     * 在限制下使用对应的 handler 来下载文件。
     *
     * @param id @en The unique id of this download. @zh 本次下载的唯一 id.
     * @param url @en The url should be downloaded. @zh 待下载的 url。
     * @param type @en The type indicates that which handler should be used to download, such as '.jpg'. @zh 要使用的处理方法的类型，例如 '.jpg'。
     * @param options @en Some optional parameters will be transferred to the corresponding handler. @zh 传递到处理方法的一些可选参数。
     * @param options.onFileProgress @en Progressive callback will be transferred to handler. @zh 传递到处理方法的进度回调。
     * @param options.maxRetryCount @en How many times should retry when download failed. @zh 下载失败后的重试数量。
     * @param options.maxConcurrency @en The maximum number of concurrent when downloading. @zh 下载的最大并行数。
     * @param options.maxRequestsPerFrame @en The maximum number of request can be launched per frame when downloading. @zh 每帧能发起的最大请求数量，在下载时。
     * @param options.priority @en The priority of this url, default is 0, the greater number is higher priority. @zh 下载的优先级，值越大优先级越高。
     * @param onComplete @en Callback when finishing downloading. @zh 完成下载后的回调。
     * @param onComplete.err @en The occurred error, null indicates success. @zh 下载过程中出现的错误，如果为 null 则表明下载成功。
     * @param onComplete.content @en The downloaded file. @zh 下载下来的文件内容。
     *
     * @example
     * download('http://example.com/test.tga', '.tga', { onFileProgress: (loaded, total) => console.log(loaded/total) },
     *      onComplete: (err) => console.log(err));
     */
    public download (id: string, url: string, type: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)): void {
        // if it is downloaded, don't download again
        const file = files.get(id);
        if (file) {
            onComplete(null, file);
            return;
        }

        const downloadCallbacks = this._downloading$.get(id);
        if (downloadCallbacks) {
            downloadCallbacks.push(onComplete);
            const request = this._queue$.find((x): boolean => x.id === id);
            if (!request) { return; }
            const priority: number = options.priority || 0;
            if (request.priority < priority) {
                request.priority = priority;
                this._queueDirty$ = true;
            }
            return;
        }

        // if download fail, should retry
        const maxRetryCount = typeof options.maxRetryCount !== 'undefined' ? options.maxRetryCount as number : this.maxRetryCount;
        const maxConcurrency = typeof options.maxConcurrency !== 'undefined' ? options.maxConcurrency as number : this.maxConcurrency;
        const maxRequestsPerFrame = typeof options.maxRequestsPerFrame !== 'undefined' ? options.maxRequestsPerFrame as number : this.maxRequestsPerFrame;
        const handler = this._downloaders$[type] || this._downloaders$.default;

        const process: RetryFunction = (index, callback): void => {
            if (index === 0) {
                this._downloading$.add(id, [onComplete]);
            }

            if (!this.limited) {
                handler(urlAppendTimestamp(url, this.appendTimeStamp), options, callback);
                return;
            }

            // refresh
            this._updateTime();

            const done: ((err: Error | null, data?: any) => void) = (err, data): void => {
                // when finish downloading, update _totalNum
                this._totalNum$--;
                this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame);
                callback(err, data);
            };

            if (this._totalNum$ < maxConcurrency && this._totalNumThisPeriod$ < maxRequestsPerFrame) {
                handler(urlAppendTimestamp(url, this.appendTimeStamp), options, done);
                this._totalNum$++;
                this._totalNumThisPeriod$++;
            } else {
                // when number of request up to limitation, cache the rest
                this._queue$.push({ id, priority: options.priority || 0, url, options, done, handler });
                this._queueDirty$ = true;

                if (this._totalNum$ < maxConcurrency) { this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame); }
            }
        };

        // when retry finished, invoke callbacks
        const finale = (err: Error | null, result: any): void => {
            if (!err) { files.add(id, result); }
            const callbacks = this._downloading$.remove(id) as ((err: Error | null, data?: any) => void)[];
            for (let i = 0, l = callbacks.length; i < l; i++) {
                callbacks[i](err, result);
            }
        };

        retry(process, maxRetryCount, this.retryInterval, finale);
    }

    /**
     * @en Load sub package with name.
     * @zh 通过子包名加载子包。
     * @param name @en Sub package name. @zh 子包名称。
     * @param completeCallback @en Callback invoked when sub package loaded. @zh 子包加载完成后的回调。
     * @param completeCallback.error @en Error information. Will be null if loaded successfully. @zh 错误信息。如果加载成功则为 null。
     *
     * @deprecated loader.downloader.loadSubpackage is deprecated, please use AssetManager.loadBundle instead.
     */
    public loadSubpackage (name: string, completeCallback?: ((err?: Error | null) => void)): void {
        (cclegacy.assetManager as AssetManager).loadBundle(name, null, completeCallback);
    }

    private constructor () {}

    private _updateTime (): void {
        const now = performance.now();
        // use deltaTime as interval
        const deltaTime = cclegacy.game.deltaTime;
        const interval = deltaTime > this._maxInterval$ ? this._maxInterval$ : deltaTime;
        if (now - this._lastDate$ > interval * 1000) {
            this._totalNumThisPeriod$ = 0;
            this._lastDate$ = now;
        }
    }

    // handle the rest request in next period
    private _handleQueue (maxConcurrency: number, maxRequestsPerFrame: number): void {
        this._checkNextPeriod$ = false;
        this._updateTime();
        while (this._queue$.length > 0 && this._totalNum$ < maxConcurrency && this._totalNumThisPeriod$ < maxRequestsPerFrame) {
            if (this._queueDirty$) {
                this._queue$.sort((a, b): number => a.priority - b.priority);
                this._queueDirty$ = false;
            }
            const request = this._queue$.pop();
            if (!request) {
                break;
            }
            this._totalNum$++;
            this._totalNumThisPeriod$++;
            request.handler(urlAppendTimestamp(request.url, this.appendTimeStamp), request.options, request.done);
        }

        this._handleQueueInNextFrame(maxConcurrency, maxRequestsPerFrame);
    }

    private _handleQueueInNextFrame (maxConcurrency: number, maxRequestsPerFrame: number): void {
        if (!this._checkNextPeriod$ && this._queue$.length > 0) {
            misc.callInNextTick(this._handleQueue.bind(this), maxConcurrency, maxRequestsPerFrame);
            this._checkNextPeriod$ = true;
        }
    }
}
const downloader = Downloader.instance;
export default Downloader.instance;
