/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR, PREVIEW } from 'internal:constants';
import { _decorator, Eventify, path, debug, getError, CCObject, cclegacy } from '../../core';
import { getUrlWithUuid } from '../asset-manager/helper';
import { Node } from '../../scene-graph';
import type { AssetManager } from '../asset-manager';

const { ccclass, serializable, property } = _decorator;

/**
 * @en
 * Base class for handling assets used in Creator.<br/>
 *
 * You may want to override:<br/>
 * - createNode<br/>
 * - getset functions of _nativeAsset<br/>
 * - `Object._serialize`<br/>
 * - `Object._deserialize`<br/>
 * @zh
 * Creator 中的资源基类。<br/>
 *
 * 您可能需要重写：<br/>
 * - createNode <br/>
 * - _nativeAsset 的 getset 方法<br/>
 * - `Object._serialize`<br/>
 * - `Object._deserialize`<br/>
 *
 * @class Asset
 * @extends CCObject
 */
@ccclass('cc.Asset')
export class Asset extends Eventify(CCObject) {
    /**
     * 应 AssetDB 要求提供这个方法。
     * @internal
     * @method deserialize
     * @param {String} data
     * @return {Asset}
     */
    public static deserialize (data): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return cclegacy.deserialize(data);
    }

    /**
     * @en
     * Whether the asset is loaded or not
     * @zh
     * 该资源是否已经成功加载。
     *
     * @deprecated since v3.3
     */
    public loaded = true;

    /**
     * @en
     * The UUID of this asset.
     *
     * @zh
     * 资源的 UUID。
     *
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future, please use [[Asset.uuid]] instead.
     */
    public declare _uuid: string;

    /**
     * @en
     * Indicates whether this asset is a default asset.
     *
     * @zh
     * 表明此资源是否是默认资源。
     *
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public declare isDefault: boolean;

    /**
     * @en
     * Serializable url for native asset. For internal usage.
     * @zh
     * 用于本机资产的可序列化URL。供内部使用。
     * @default ""
     *
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _native = '';

    /**
     * @en
     * Path to native dependency.
     * @zh
     * 原生依赖的路径。
     *
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _nativeUrl = '';

    private _file: any = null;
    private _ref = 0;

    /**
     * @en
     * Returns the url of this asset's native object, will return an empty string if this asset does not have any native dependency.
     * @zh
     * 返回该资源对应的目标平台资源的 URL，如果此资源没有原生依赖将返回一个空字符串。
     * @readOnly
     */
    get nativeUrl (): string {
        if (!this._nativeUrl) {
            if (!this._native) return '';
            const name = this._native;
            if (name.charCodeAt(0) === 47) {    // '/'
                // remove library tag
                // not imported in library, just created on-the-fly
                return name.slice(1);
            }
            if (name.charCodeAt(0) === 46) {  // '.'
                // imported in dir where json exist
                this._nativeUrl = getUrlWithUuid(this._uuid, { nativeExt: name, isNative: true });
            } else {
                // imported in an independent dir
                this._nativeUrl = getUrlWithUuid(this._uuid, { __nativeName__: name, nativeExt: path.extname(name), isNative: true });
            }
        }
        return this._nativeUrl;
    }

    /**
     * @en
     * The UUID of this asset.
     *
     * @zh
     * 资源的 UUID。
     */
    get uuid (): string {
        return this._uuid;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future, please use `nativeAsset` instead.
     */
    @property
    get _nativeAsset (): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._file;
    }
    set _nativeAsset (obj) {
        this._file = obj;
    }

    /**
     * @en
     * The underlying native asset of this asset if one is available.<br>
     * This property can be used to access additional details or functionality related to the asset.<br>
     * This property will be initialized by the loader if `_native` is available.
     * @zh
     * 此资源的基础资源（如果有）。 此属性可用于访问与资源相关的其他详细信息或功能。<br>
     * 如果`_native`可用，则此属性将由加载器初始化。
     */
    public get nativeAsset (): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this._file;
    }

    constructor (...args: ConstructorParameters<typeof CCObject>) {
        super(...args);

        Object.defineProperty(this, '_uuid', {
            value: '',
            writable: true,
            // enumerable is false by default, to avoid uuid being assigned to empty string during destroy
        });

        if (EDITOR || PREVIEW) {
            Object.defineProperty(this, 'isDefault', {
                value: false,
                writable: true,
            });
        }
    }

    /**
     * @en
     * Returns the string representation of the object.<br>
     * The `Asset` object overrides the `toString()` method of the `Object` object.<br>
     * JavaScript calls the toString() method automatically<br>
     * when an asset is to be represented as a text value or when a texture is referred to in a string concatenation.<br>
     * <br>
     * For assets of the native type, it will return `this.nativeUrl`.<br>
     * Otherwise, an empty string is returned.<br>
     * This method may be overwritten by subclasses.
     * @zh
     * 返回对象的字符串表示形式。<br>
     * `Asset` 对象将会重写 `Object` 对象的 `toString()` 方法。<br>
     * 当资源要表示为文本值时或在字符串连接时引用时，<br>
     * JavaScript 会自动调用 toString() 方法。<br>
     * <br>
     * 对于原始类型的资源，它将返回`this.nativeUrl`。<br>
     * 否则，返回空字符串。<br>
     * 子类可能会覆盖此方法。
     * @method toString
     * @returns @en String representation of this asset. @zh 此资源的字符串表示。
     */
    public toString (): string {
        return this.nativeUrl;
    }

    /**
     * 应 AssetDB 要求提供这个方法。
     * 返回一个序列化后的对象
     *
     * @method serialize
     * @returns {String}
     * @private
     */
    public serialize (): void { }

    /**
     * @en
     * Set native file name for this asset.
     * @zh
     * 为此资源设置原始文件名。
     * @seealso nativeUrl
     *
     * @param filename
     * @param inLibrary
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _setRawAsset (filename: string, inLibrary = true): void {
        if (inLibrary !== false) {
            this._native = filename || '';
        } else {
            this._native = `/${filename}`;  // simply use '/' to tag location where is not in the library
        }
    }

    /**
     * @en
     * Create a new node using this asset in the scene.<br/>
     * If this type of asset don't have its corresponding node type, this method should be null.
     * @zh
     * 使用该资源在场景中创建一个新节点。<br/>
     * 如果这类资源没有相应的节点类型，该方法应该是空的。
     */
    public createNode? (callback: CreateNodeCallback): void;

    /**
     * @en
     * Get native dependency information.
     *
     * @zh
     * 获取原生依赖信息。
     *
     * @returns @en The native dependency information. @zh 原生依赖信息。
     *
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public get _nativeDep (): {
        __isNative__: boolean;
        uuid: string;
        ext: string;
    } | undefined {
        if (this._native) {
            return { __isNative__: true, uuid: this._uuid, ext: this._native };
        }
        return undefined;
    }

    /**
     * @en
     * Current reference count to this asset.
     *
     * @zh
     * 当前该资源被引用的数量。
     */
    public get refCount (): number {
        return this._ref;
    }

    /**
     * @en
     * Increase the reference count. This will prevent assets from being automatically recycled.
     * When you no longer need to hold the asset, you need to using [[decRef]] to decrease the refCount.
     *
     * @zh
     * 增加资源的引用。这将阻止资源被自动释放。当你不再需要持有该资源时，你需要调用 [[decRef]] 来减少引用计数。
     *
     * @returns @en The asset itself. @zh 此资源本身。
     *
     */
    public addRef (): Asset {
        this._ref++;
        return this;
    }

    /**
     * @en
     * Decrease the reference count and it will be auto released when refCount equals 0.
     *
     * @zh
     * 减少资源的引用，如果引用数量为 0，则将自动释放该资源。
     *
     * @return @en The asset itself. @zh 此资源本身。
     *
     */
    public decRef (autoRelease = true): Asset {
        if (this._ref > 0) {
            this._ref--;
        }
        if (autoRelease) {
            (cclegacy.assetManager as AssetManager).getReleaseManager().tryRelease(this);
        }
        return this;
    }

    /**
     * @en
     * A callback after the asset is loaded that you can use to initialize the asset's internal data.
     *
     * @zh
     * 资源加载后的回调，你可以用于初始化资源的内部数据。
     *
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public onLoaded (): void {}

    /**
     * @en
     * Initializes default asset.
     *
     * @zh
     * 初始化为默认资源。
     *
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public initDefault (uuid?: string): void {
        if (uuid) { this._uuid = uuid; }
        this.isDefault = true;
    }

    /**
     * @en
     * Used to verify this asset is an available asset.
     *
     * @zh
     * 用于验证此资源是否为可用资源。
     *
     * @returns @zh 是否是可用资源。@en Whether this asset is available or not.
     * @deprecated Since v3.7, this is an internal engine interface and you should not call this interface under any circumstances.
     */
    public validate (): boolean {
        return true;
    }

    /**
     * @en
     * Destroy this asset and its internal data.
     *
     * @zh
     * 销毁此资源以及其内部数据。
     */
    public destroy (): boolean {
        debug(getError(12101, this._uuid));
        return super.destroy();
    }
}

/**
 * @param error - null or the error info
 * @param node - the created node or null
 */
type CreateNodeCallback = (error: Error | null, node: Node) => void;

Asset.prototype.createNode = null!;

cclegacy.Asset = Asset;
