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

import { ImageAsset, IMemoryImageSource } from '../assets/image-asset';
import { js, warn } from '../../core';
import Cache from './cache';
import deserialize from './deserialize';
import { isScene } from './helper';
import plistParser from './plist-parser';
import { files, parsed } from './shared';
import { CCON } from '../../serialization/ccon';
import { Asset } from '../assets';

export type ParseHandler = (file: any, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void;

/**
 * @en
 * Parse the downloaded file, it's a singleton, you can access it via [[AssetManager.parser]].
 *
 * @zh
 * 解析已下载的文件，parser 是一个单例, 你能通过 [[assetManager.parser]] 访问它。
 *
 */
export class Parser {
    private _parsing = new Cache<((err: Error | null, data?: any) => void)[]>();

    private _parsers: Record<string, ParseHandler> = {
        '.png': this.parseImage,
        '.jpg': this.parseImage,
        '.bmp': this.parseImage,
        '.jpeg': this.parseImage,
        '.gif': this.parseImage,
        '.ico': this.parseImage,
        '.tiff': this.parseImage,
        '.webp': this.parseImage,
        '.image': this.parseImage,
        '.pvr': this.parsePVRTex,
        '.pkm': this.parsePKMTex,
        '.astc': this.parseASTCTex,

        // plist
        '.plist': this.parsePlist,
        import: this.parseImport,

        '.ccon': this.parseImport,
        '.cconb': this.parseImport,
    };

    private static _instance: Parser;

    public static get instance (): Parser {
        if (!this._instance) {
            this._instance = new Parser();
        }
        return this._instance;
    }
    private constructor () {}

    /**
     * @engineInternal
     */
    public parseImage (
        file: HTMLImageElement | Blob,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: HTMLImageElement | ImageBitmap | null) => void),
    ): void {
        if (file instanceof HTMLImageElement) {
            onComplete(null, file);
            return;
        }
        createImageBitmap(file, { premultiplyAlpha: 'none' }).then((result): void => {
            onComplete(null, result);
        }, (err: Error | null): void => {
            onComplete(err, null);
        });
    }

    /**
     * @engineInternal
     */
    public parsePVRTex (
        file: ArrayBuffer | ArrayBufferView,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: IMemoryImageSource | null) => void),
    ): void {
        let err: Error | null = null;
        let out: IMemoryImageSource | null = null;
        try {
            out = ImageAsset.parseCompressedTextures(file, 0);
        } catch (e) {
            err = e as Error;
            warn(err);
        }
        onComplete(err, out);
    }

    /**
     * @engineInternal
     */
    public parsePKMTex (
        file: ArrayBuffer | ArrayBufferView,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: IMemoryImageSource | null) => void),
    ): void {
        let err: Error | null = null;
        let out: IMemoryImageSource | null = null;
        try {
            out = ImageAsset.parseCompressedTextures(file, 1);
        } catch (e) {
            err = e as Error;
            warn(err);
        }
        onComplete(err, out);
    }

    /**
     * @engineInternal
     */
    public parseASTCTex (
        file: ArrayBuffer | ArrayBufferView,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: IMemoryImageSource | null) => void),
    ): void {
        let err: Error | null = null;
        let out: IMemoryImageSource | null = null;
        try {
            out = ImageAsset.parseCompressedTextures(file, 2);
        } catch (e) {
            err = e as Error;
            warn(err);
        }
        onComplete(err, out);
    }

    /**
     * @engineInternal
     */
    public parsePlist (
        file: string,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: any) => void),
    ): void {
        let err: Error | null = null;
        const result = plistParser.parse(file);
        if (!result) { err = new Error('parse failed'); }
        onComplete(err, result);
    }

    /**
     * @engineInternal
     */
    public parseImport (
        file: Record<string, any> | CCON,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: Asset | null) => void),
    ): void {
        if (!file) {
            onComplete(new Error(`The json file of asset ${options.__uuid__ as string} is empty or missing`));
            return;
        }
        let result: Asset | null = null;
        let err: Error | null = null;
        try {
            result = deserialize(file, options);
        } catch (e) {
            err = e as Error;
        }
        onComplete(err, result);
    }

    /**
     * @engineInternal
     */
    public init (): void {
        this._parsing.clear();
    }

    /**
     * @en
     * Register custom handler if you want to change default behavior or extend parser to parse other format file.
     *
     * @zh
     * 当你想修改默认行为或者拓展 parser 来解析其他格式文件时可以注册自定义的 handler。
     *
     * @param type
     * @en Extension name likes '.jpg' or map likes {'.jpg': jpgHandler, '.png': pngHandler}.
     * @zh 形如 '.jpg' 的扩展名或形如 {'.jpg': jpgHandler, '.png': pngHandler} 的映射表。
     * @param handler @en The corresponding handler. @zh 对应扩展名的处理方法。
     * @param handler.file @en The file to be parsed. @zh 待解析的文件。
     * @param handler.options @en Some optional parameters. @zh 一些可选的参数。
     * @param handler.onComplete @en The callback invoked when parsing finished. @zh 完成解析的回调。
     *
     * @example
     * parser.register('.tga', (file, options, onComplete) => onComplete(null, null));
     * parser.register({'.tga': (file, options, onComplete) => onComplete(null, null),
     *                  '.ext': (file, options, onComplete) => onComplete(null, null)});
     *
     */
    public register (
        type: string,
        handler: (file: any,
            options: Record<string, any>,
            onComplete: ((err: Error | null, data?: any) => void)
        ) => void
    ): void;
    public register (
        map: Record<string, (file: any, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void>): void;
    public register (
        type: string | Record<string, (file: any, options: Record<string, any>, onComplete: ((err: Error | null, data?: any) => void)) => void>,
        handler?: (file: any,
            options: Record<string, any>,
            onComplete: ((err: Error | null, data?: any) => void)
        ) => void,
    ): void {
        if (typeof type === 'object') {
            js.mixin(this._parsers, type);
        } else {
            this._parsers[type] = handler as ParseHandler;
        }
    }

    /**
     * @en
     * Use corresponding handler to parse file.
     *
     * @zh
     * 使用对应的 handler 来解析文件。
     *
     * @param id @en The id of file. @zh 文件的唯一 id。
     * @param file @en The data of file. @zh 文件的数据。
     * @param type @en The corresponding type of file, likes '.jpg'. @zh 需要使用的解析方法类型。
     * @param options @en Some optional parameters will be transferred to the corresponding handler. @zh 传递到解析方法的额外参数。
     * @param onComplete @en The callback invoked when finishing parsing. @zh 完成解析的回调。
     * @param onComplete.err @en The occurred error, null indicates success. @zh 解析过程中发生的错误，null 表明解析成功。
     * @param onComplete.content @en The parsed data. @zh 解析后的数据。
     *
     * @example
     * downloader.download('test.jpg', 'test.jpg', '.jpg', {}, (err, file) => {
     *      parser.parse('test.jpg', file, '.jpg', null, (err, img) => console.log(err));
     * });
     *
     */
    public parse (
        id: string,
        file: any,
        type: string,
        options: Record<string, any>,
        onComplete: ((err: Error | null, data?: any) => void),
    ): void {
        const parsedAsset = parsed.get(id);
        if (parsedAsset) {
            onComplete(null, parsedAsset);
            return;
        }
        const parsing = this._parsing.get(id);
        if (parsing) {
            parsing.push(onComplete);
            return;
        }

        const parseHandler = this._parsers[type];
        if (!parseHandler) {
            onComplete(null, file);
            return;
        }

        this._parsing.add(id, [onComplete]);
        parseHandler(file, options, (err, data): void => {
            if (err) {
                files.remove(id);
            } else if (!isScene(data)) {
                parsed.add(id, data);
            }
            const callbacks = this._parsing.remove(id);
            for (let i = 0, l = callbacks!.length; i < l; i++) {
                callbacks![i](err, data);
            }
        });
    }
}

export default Parser.instance;
