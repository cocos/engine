/*
 Copyright (c) 2018-2023 Xiamen Yaji Software Co., Ltd.

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

import type { Label } from '../../components';
import { IAssembler } from '../../renderer/base';
import { BmfontUtils } from './bmfontUtils';
import { shareLabelInfo, LetterAtlas, computeHash, LetterRenderTexture } from './font-utils';

const _atlasWidth = 1024;
const _atlasHeight = 1024;
const _isBold = false;

let _shareAtlas: LetterAtlas | null  = null;

export class LetterFont extends BmfontUtils {
    getAssemblerData (): LetterRenderTexture | null {
        if (!_shareAtlas) {
            _shareAtlas = new LetterAtlas(_atlasWidth, _atlasHeight);
        }

        return _shareAtlas.getTexture() as LetterRenderTexture | null;
    }

    protected _updateFontFamily (comp: Label): void {
        shareLabelInfo.fontAtlas = _shareAtlas;
        shareLabelInfo.fontFamily = this._getFontFamily(comp);

        // outline
        const isOutlined = comp.enableOutline && comp.outlineWidth > 0;
        if (isOutlined) {
            shareLabelInfo.isOutlined = true;
            shareLabelInfo.margin = comp.outlineWidth;
            shareLabelInfo.out = comp.outlineColor.clone();
            shareLabelInfo.out.a = comp.outlineColor.a * comp.color.a / 255.0;
        } else {
            shareLabelInfo.isOutlined = false;
            shareLabelInfo.margin = 0;
        }
    }

    protected _getFontFamily (comp: Label): string {
        let fontFamily = 'Arial';
        if (!comp.useSystemFont) {
            if (comp.font) {
                fontFamily = comp.font._nativeAsset || 'Arial';
            }
        } else {
            fontFamily = comp.fontFamily || 'Arial';
        }

        return fontFamily;
    }

    protected _updateLabelInfo (comp: Label): void {
        shareLabelInfo.fontDesc = this._getFontDesc();
        shareLabelInfo.color.set(comp.color);
        shareLabelInfo.hash = computeHash(shareLabelInfo);
    }

    protected _getFontDesc (): string {
        let fontDesc = `${shareLabelInfo.fontSize.toString()}px `;
        fontDesc += shareLabelInfo.fontFamily;
        if (_isBold) {
            fontDesc = `bold ${fontDesc}`;
        }

        return fontDesc;
    }
}
