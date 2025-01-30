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

import { EDITOR, EDITOR_NOT_IN_PREVIEW, TEST } from 'internal:constants';
import { Asset } from '../assets/asset';
import { ImageAsset, ImageSource } from '../assets/image-asset';
import { SpriteFrame } from '../../2d/assets/sprite-frame';
import { Texture2D } from '../assets/texture-2d';
import { TextureCube } from '../assets/texture-cube';
import assetManager from './asset-manager';
import { BuiltinBundleName } from './shared';
import Bundle from './bundle';
import { settings, cclegacy, SettingsCategory } from '../../core';
import { releaseManager } from './release-manager';
import { Material } from '../assets';
import { TextureFilter, PixelFormat } from '../assets/asset-enum';

export class BuiltinResMgr {
    protected _resources: Record<string, Asset> = {};
    protected _materialsToBeCompiled: Material[] = [];

    constructor () {}

    // this should be called after renderer initialized
    public init (): void {
        const resources = this._resources;
        const len = 2;
        const numChannels = 4;
        const byteLength = len * len * numChannels;

        const blackValueView   = new Uint8Array(byteLength);
        const emptyValueView   = new Uint8Array(byteLength);
        const greyValueView    = new Uint8Array(byteLength);
        const whiteValueView   = new Uint8Array(byteLength);
        const normalValueView  = new Uint8Array(byteLength);

        let offset = 0;
        for (let i = 0; i < len * len; i++) {
            blackValueView[offset]     = 0;
            blackValueView[offset + 1] = 0;
            blackValueView[offset + 2] = 0;
            blackValueView[offset + 3] = 255;

            emptyValueView[offset]     = 0;
            emptyValueView[offset + 1] = 0;
            emptyValueView[offset + 2] = 0;
            emptyValueView[offset + 3] = 0;

            greyValueView[offset]     = 119;
            greyValueView[offset + 1] = 119;
            greyValueView[offset + 2] = 119;
            greyValueView[offset + 3] = 255;

            whiteValueView[offset]     = 255;
            whiteValueView[offset + 1] = 255;
            whiteValueView[offset + 2] = 255;
            whiteValueView[offset + 3] = 255;

            normalValueView[offset]     = 127;
            normalValueView[offset + 1] = 127;
            normalValueView[offset + 2] = 255;
            normalValueView[offset + 3] = 255;

            offset += numChannels;
        }

        const defaultSize = 16;
        const halfDefaultSize = defaultSize / 2;
        const defaultValueView = new Uint8Array(defaultSize * defaultSize * numChannels);

        offset = 0;
        for (let i = 0; i < defaultSize * defaultSize; i++) {
            defaultValueView[offset]     = 221;
            defaultValueView[offset + 1] = 221;
            defaultValueView[offset + 2] = 221;
            defaultValueView[offset + 3] = 255;

            offset += numChannels;
        }
        offset = 0;
        for (let i = 0; i < halfDefaultSize; i++) {
            for (let j = 0; j < halfDefaultSize; j++) {
                defaultValueView[offset]     = 85;
                defaultValueView[offset + 1] = 85;
                defaultValueView[offset + 2] = 85;
                defaultValueView[offset + 3] = 255;

                offset += numChannels;
            }
            offset += halfDefaultSize * numChannels;
        }
        offset += halfDefaultSize * numChannels;
        for (let i = 0; i < halfDefaultSize; i++) {
            for (let j = 0; j < halfDefaultSize; j++) {
                defaultValueView[offset]     = 85;
                defaultValueView[offset + 1] = 85;
                defaultValueView[offset + 2] = 85;
                defaultValueView[offset + 3] = 255;

                offset += numChannels;
            }
            offset += halfDefaultSize * numChannels;
        }

        const blackMemImageSource: ImageSource = {
            width: len,
            height: len,
            _data: blackValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        const emptyMemImageSource: ImageSource = {
            width: len,
            height: len,
            _data: emptyValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        const greyMemImageSource: ImageSource = {
            width: len,
            height: len,
            _data: greyValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        const whiteMemImageSource: ImageSource = {
            width: len,
            height: len,
            _data: whiteValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        const normalMemImageSource: ImageSource = {
            width: len,
            height: len,
            _data: normalValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        const defaultMemImageSource: ImageSource = {
            width: defaultSize,
            height: defaultSize,
            _data: defaultValueView,
            _compressed: false,
            format: PixelFormat.RGBA8888,
        };

        // ============================
        // builtin textures
        // type string postfix according to getStringFromType()
        // ============================

        // black texture
        const imgAsset = new ImageAsset(blackMemImageSource);
        const blackTexture = new Texture2D();
        blackTexture._uuid = 'black-texture';
        blackTexture.image = imgAsset;
        resources[blackTexture._uuid] = blackTexture;

        // empty texture
        const emptyImgAsset = new ImageAsset(emptyMemImageSource);
        const emptyTexture = new Texture2D();
        emptyTexture._uuid = 'empty-texture';
        emptyTexture.image = emptyImgAsset;
        resources[emptyTexture._uuid] = emptyTexture;

        // black cube texture
        const blackCubeTexture = new TextureCube();
        blackCubeTexture._uuid = 'black-cube-texture';
        blackCubeTexture.setMipFilter(TextureFilter.NEAREST);
        blackCubeTexture.image = {
            front: new ImageAsset(blackMemImageSource),
            back: new ImageAsset(blackMemImageSource),
            left: new ImageAsset(blackMemImageSource),
            right: new ImageAsset(blackMemImageSource),
            top: new ImageAsset(blackMemImageSource),
            bottom: new ImageAsset(blackMemImageSource),
        };
        resources[blackCubeTexture._uuid] = blackCubeTexture;

        // grey texture
        const greyImgAsset = new ImageAsset(greyMemImageSource);
        const greyTexture = new Texture2D();
        greyTexture._uuid = 'grey-texture';
        greyTexture.image = greyImgAsset;
        resources[greyTexture._uuid] = greyTexture;

        // grey cube texture
        const greyCubeTexture = new TextureCube();
        greyCubeTexture._uuid = 'grey-cube-texture';
        greyCubeTexture.setMipFilter(TextureFilter.NEAREST);
        greyCubeTexture.image = {
            front: new ImageAsset(greyMemImageSource),
            back: new ImageAsset(greyMemImageSource),
            left: new ImageAsset(greyMemImageSource),
            right: new ImageAsset(greyMemImageSource),
            top: new ImageAsset(greyMemImageSource),
            bottom: new ImageAsset(greyMemImageSource),
        };
        resources[greyCubeTexture._uuid] = greyCubeTexture;

        // white texture
        const whiteImgAsset = new ImageAsset(whiteMemImageSource);
        const whiteTexture = new Texture2D();
        whiteTexture._uuid = 'white-texture';
        whiteTexture.image = whiteImgAsset;
        resources[whiteTexture._uuid] = whiteTexture;

        // white cube texture
        const whiteCubeTexture = new TextureCube();
        whiteCubeTexture._uuid = 'white-cube-texture';
        whiteCubeTexture.setMipFilter(TextureFilter.NEAREST);
        whiteCubeTexture.image = {
            front: new ImageAsset(whiteMemImageSource),
            back: new ImageAsset(whiteMemImageSource),
            left: new ImageAsset(whiteMemImageSource),
            right: new ImageAsset(whiteMemImageSource),
            top: new ImageAsset(whiteMemImageSource),
            bottom: new ImageAsset(whiteMemImageSource),
        };
        resources[whiteCubeTexture._uuid] = whiteCubeTexture;

        // normal texture
        const normalImgAsset = new ImageAsset(normalMemImageSource);
        const normalTexture = new Texture2D();
        normalTexture._uuid = 'normal-texture';
        normalTexture.image = normalImgAsset;
        resources[normalTexture._uuid] = normalTexture;

        // default texture
        const defaultImgAsset = new ImageAsset(defaultMemImageSource);
        const defaultTexture = new Texture2D();
        defaultTexture._uuid = 'default-texture';
        defaultTexture.image = defaultImgAsset;
        resources[defaultTexture._uuid] = defaultTexture;

        // default cube texture
        const defaultCubeTexture = new TextureCube();
        defaultCubeTexture.setMipFilter(TextureFilter.NEAREST);
        defaultCubeTexture._uuid = 'default-cube-texture';
        defaultCubeTexture.image = {
            front: new ImageAsset(defaultMemImageSource),
            back: new ImageAsset(defaultMemImageSource),
            left: new ImageAsset(defaultMemImageSource),
            right: new ImageAsset(defaultMemImageSource),
            top: new ImageAsset(defaultMemImageSource),
            bottom: new ImageAsset(defaultMemImageSource),
        };
        resources[defaultCubeTexture._uuid] = defaultCubeTexture;

        if (cclegacy.SpriteFrame) {
            const spriteFrame = new cclegacy.SpriteFrame() as SpriteFrame;
            const image = imgAsset;
            const texture = new Texture2D();
            texture.image = image;
            spriteFrame.texture = texture;
            spriteFrame._uuid = 'default-spriteframe';
            resources[spriteFrame._uuid] = spriteFrame;
        }

        if (EDITOR) {
            const builtinAssets = settings.querySettings<string[]>(SettingsCategory.ENGINE, 'builtinAssets');
            const builtinBundle = new Bundle();
            builtinBundle.init({
                name: BuiltinBundleName.INTERNAL,
                uuids: builtinAssets || [],
                deps: [],
                importBase: '',
                nativeBase: '',
                base: '',
                paths: {},
                scenes: {},
                packs: {},
                versions: { import: [], native: [] },
                redirect: [],
                debug: false,
                types: [],
                extensionMap: {},
            });
        }
    }

    public addAsset (key: string, asset: Asset): void {
        this._resources[key] = asset;
    }

    public get<T extends Asset> (uuid: string): T {
        return this._resources[uuid] as T;
    }

    /**
     * @internal
     */
    public loadBuiltinAssets (): Promise<void> {
        const builtinAssets = settings.querySettings<string[]>(SettingsCategory.ENGINE, 'builtinAssets');
        if (TEST || !builtinAssets) return Promise.resolve();
        const resources = this._resources;
        return new Promise<void>((resolve, reject): void => {
            assetManager.loadBundle(BuiltinBundleName.INTERNAL, (err, bundle): void => {
                if (err) {
                    reject(err);
                    return;
                }
                assetManager.loadAny(builtinAssets, (err, assets): void => {
                    if (err) {
                        reject(err);
                    } else {
                        assets.forEach((asset): void => {
                            resources[asset.name] = asset;
                            // In Editor, no need to ignore asset destroy, we use auto gc to handle destroy
                            if (!EDITOR_NOT_IN_PREVIEW) { releaseManager.addIgnoredAsset(asset); }
                            if (asset instanceof cclegacy.Material) {
                                this._materialsToBeCompiled.push(asset as Material);
                            }
                        });
                        resolve();
                    }
                });
            });
        });
    }

    public compileBuiltinMaterial (): void {
        // NOTE: Builtin material should be compiled again after the render pipeline setup
        for (let i = 0; i < this._materialsToBeCompiled.length; ++i) {
            const mat = this._materialsToBeCompiled[i];
            for (let j = 0; j < mat.passes.length; ++j) {
                mat.passes[j].tryCompile();
            }
        }
        this._materialsToBeCompiled.length = 0;
    }
}

const builtinResMgr = cclegacy.builtinResMgr = new BuiltinResMgr();
export { builtinResMgr };
