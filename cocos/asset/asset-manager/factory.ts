/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR } from 'internal:constants';
import { ImageAsset } from '../assets/image-asset';
import JsonAsset from '../assets/json-asset';
import { TextAsset } from '../assets/text-asset';
import { Asset } from '../assets/asset';
import { BufferAsset } from '../assets/buffer-asset';
import Bundle, { resources } from './bundle';
import Cache from './cache';
import { IConfigOption } from './config';
import {
    assets, BuiltinBundleName, bundles,
} from './shared';
import { cache } from './utilities';
import { js } from '../../core';

export type CreateHandler = (id: string, data: any, options: Record<string, any>, onComplete: ((err: Error | null, data?: Asset | Bundle | null) => void)) => void;

function createImageAsset (id: string, data: HTMLImageElement, options: Record<string, any>, onComplete: ((err: Error | null, data?: ImageAsset | null) => void)): void {
    let out: ImageAsset | null = null;
    let err: Error | null = null;
    try {
        out = new ImageAsset();
        out._nativeUrl = id;
        out._nativeAsset = data;
    } catch (e) {
        err = e as Error;
    }
    onComplete(err, out);
}

function createJsonAsset (id: string, data: Record<string, any>, options: Record<string, any>, onComplete: ((err: Error | null, data?: JsonAsset | null) => void)): void {
    const out = new JsonAsset();
    out.json = data;
    onComplete(null, out);
}

function createTextAsset (id: string, data: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: TextAsset | null) => void)): void {
    const out = new TextAsset();
    out.text = data;
    onComplete(null, out);
}

function createBufferAsset (id: string, data: ArrayBufferView, options: Record<string, any>, onComplete: ((err: Error | null, data?: BufferAsset | null) => void)): void {
    const out = new BufferAsset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createAsset (id: string, data: any, options: Record<string, any>, onComplete: ((err: Error | null, data?: Asset | null) => void)): void {
    const out = new Asset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createBundle (id: string, data: IConfigOption, options: Record<string, any>, onComplete: ((err: Error | null, data?: Bundle | null) => void)): void {
    let bundle = bundles.get(data.name);
    if (!bundle) {
        bundle = data.name === BuiltinBundleName.RESOURCES ? resources : new Bundle();
        data.base = data.base || `${id}/`;
        bundle.init(data);
    }
    //HACK: Can not import scripts in GameView due to the difference of Scripting System between the GameView and Preview
    if (!EDITOR) {
        import(`virtual:///prerequisite-imports/${bundle.name}`).then((): void => {
            onComplete(null, bundle);
        }).catch(onComplete);
    } else {
        onComplete(null, bundle);
    }
}

export class Factory {
    private _creating = new Cache<((err: Error | null, data?: any | null) => void)[]>();

    private _producers: Record<string, CreateHandler> = {
        // Images
        '.png': createImageAsset,
        '.jpg': createImageAsset,
        '.bmp': createImageAsset,
        '.jpeg': createImageAsset,
        '.gif': createImageAsset,
        '.ico': createImageAsset,
        '.tiff': createImageAsset,
        '.webp': createImageAsset,
        '.image': createImageAsset,
        '.pvr': createImageAsset,
        '.pkm': createImageAsset,
        '.astc': createImageAsset,

        // Txt
        '.txt': createTextAsset,
        '.xml': createTextAsset,
        '.vsh': createTextAsset,
        '.fsh': createTextAsset,
        '.atlas': createTextAsset,

        '.tmx': createTextAsset,
        '.tsx': createTextAsset,
        '.fnt': createTextAsset,

        '.json': createJsonAsset,
        '.ExportJson': createJsonAsset,

        // Binary
        '.binary': createBufferAsset,
        '.bin': createBufferAsset,
        '.dbbin': createBufferAsset,
        '.skel': createBufferAsset,

        bundle: createBundle,

        default: createAsset,

    };

    public register (type: string | Record<string, CreateHandler>, handler?: CreateHandler): void {
        if (typeof type === 'object') {
            js.mixin(this._producers, type);
        } else {
            this._producers[type] = handler!;
        }
    }

    public create (id: string, data: any, type: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: Asset | Bundle | null) => void)): void {
        const handler = this._producers[type] || this._producers.default;
        const asset = assets.get(id);
        if (!options.reloadAsset && asset) {
            onComplete(null, asset);
            return;
        }
        const creating = this._creating.get(id);
        if (creating) {
            creating.push(onComplete);
            return;
        }

        this._creating.add(id, [onComplete]);
        handler(id, data, options, (err, result): void => {
            if (!err && result instanceof Asset) {
                result._uuid = id;
                cache(id, result, options.cacheAsset);
            }
            const callbacks = this._creating.remove(id);
            for (let i = 0, l = callbacks!.length; i < l; i++) {
                callbacks![i](err, result);
            }
        });
    }
}

export default new Factory();
