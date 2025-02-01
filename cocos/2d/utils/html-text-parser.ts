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

import { TEST } from 'internal:constants';
import { cclegacy } from '../../core';

/**
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
const eventRegx = /^(click)(\s)*=|(param)(\s)*=/;
const imageAttrReg = /(\s)*src(\s)*=|(\s)*height(\s)*=|(\s)*width(\s)*=|(\s)*align(\s)*=|(\s)*offset(\s)*=|(\s)*click(\s)*=|(\s)*param(\s)*=/;

/**
 * @en A utils class for parsing HTML texts. The parsed results will be an object array.
 * @zh 一个用于解析HTML文本的工具类。解析后的结果将是一个对象数组。
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export interface IHtmlTextParserResultObj{
    text?: string;
    style?: IHtmlTextParserStack;
}

/**
 * @en Html Text Parser Stack interface
 * @zh Html 文本解析器接口
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export interface IHtmlTextParserStack{
    color?: string;
    size?: number;
    event?: { [k: string]: string};
    isNewLine?: boolean;
    isImage?: boolean;
    src?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageOffset?: string;
    imageAlign?: string;
    underline?: boolean;
    italic?: boolean;
    bold?: boolean;
    outline?: { color: string, width: number };
}

/**
 * @en Html Text Parser Stack
 * @zh Html 文本解析器
 * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
 */
export class HtmlTextParser {
    private _specialSymbolArray: Array<[RegExp, string]> = [];
    private _stack: IHtmlTextParserStack[] = [];
    private _resultObjectArray: IHtmlTextParserResultObj[] = [];

    constructor () {
        this._specialSymbolArray.push([/&lt;/g, '<']);
        this._specialSymbolArray.push([/&gt;/g, '>']);
        this._specialSymbolArray.push([/&amp;/g, '&']);
        this._specialSymbolArray.push([/&quot;/g, '"']);
        this._specialSymbolArray.push([/&apos;/g, '\'']);
    }

    public parse (htmlString: string): IHtmlTextParserResultObj[] {
        this._resultObjectArray.length = 0;
        this._stack.length = 0;

        let startIndex = 0;
        const length = htmlString.length;
        while (startIndex < length) {
            let tagEndIndex = htmlString.indexOf('>', startIndex);
            let tagBeginIndex = -1;
            if (tagEndIndex >= 0) {
                tagBeginIndex = htmlString.lastIndexOf('<', tagEndIndex);
                const noTagBegin = tagBeginIndex < (startIndex - 1);

                if (noTagBegin) {
                    tagBeginIndex = htmlString.indexOf('<', tagEndIndex + 1);
                    tagEndIndex = htmlString.indexOf('>', tagBeginIndex + 1);
                }
            }
            if (tagBeginIndex < 0) {
                this._stack.pop();
                this._processResult(htmlString.substring(startIndex));
                startIndex = length;
            } else {
                let newStr = htmlString.substring(startIndex, tagBeginIndex);
                const tagStr = htmlString.substring(tagBeginIndex + 1, tagEndIndex);
                if (tagStr === '') newStr = htmlString.substring(startIndex, tagEndIndex + 1);
                this._processResult(newStr);
                if (tagEndIndex === -1) {
                    // cc.error('The HTML tag is invalid!');
                    tagEndIndex = tagBeginIndex;
                } else if (htmlString.charAt(tagBeginIndex + 1) === '/') {
                    this._stack.pop();
                } else {
                    this._addToStack(tagStr);
                }
                startIndex = tagEndIndex + 1;
            }
        }

        return this._resultObjectArray;
    }

    private _attributeToObject (attribute: string): IHtmlTextParserStack {
        attribute = attribute.trim();

        const obj: IHtmlTextParserStack = {};
        let header = /^(color|size)(\s)*=/.exec(attribute);
        let tagName = '';
        let nextSpace = 0;
        let eventHandlerString = '';
        if (header) {
            tagName = header[0];
            attribute = attribute.substring(tagName.length).trim();
            if (attribute === '') {
                return obj;
            }

            // parse color
            nextSpace = attribute.indexOf(' ');
            switch (tagName[0]) {
            case 'c':
                if (nextSpace > -1) {
                    obj.color = attribute.substring(0, nextSpace).trim();
                } else {
                    obj.color = attribute;
                }
                break;
            case 's':
                obj.size = parseInt(attribute);
                break;
            default:
                break;
            }

            // tag has event arguments
            if (nextSpace > -1) {
                eventHandlerString = attribute.substring(nextSpace + 1).trim();
                obj.event = this._processEventHandler(eventHandlerString);
            }
            return obj;
        }

        header = /^(br(\s)*\/)/.exec(attribute);
        if (header && header[0].length > 0) {
            tagName = header[0].trim();
            if (tagName.startsWith('br') && tagName[tagName.length - 1] === '/') {
                obj.isNewLine = true;
                this._resultObjectArray.push({ text: '', style: { isNewLine: true } as IHtmlTextParserStack });
                return obj;
            }
        }

        header = /^(img(\s)*src(\s)*=[^>]+\/)/.exec(attribute);
        let remainingArgument = '';
        let rightQuot = -1;
        if (header && header[0].length > 0) {
            tagName = header[0].trim();
            if (tagName.startsWith('img') && tagName[tagName.length - 1] === '/') {
                header = imageAttrReg.exec(attribute);
                let tagValue: string;
                let isValidImageTag = false;
                while (header) {
                    // skip the invalid tags at first
                    attribute = attribute.substring(attribute.indexOf(header[0]));
                    tagName = attribute.substring(0, header[0].length);
                    const originTagNameLength = tagName.length;
                    tagName = tagName.replace(/[^a-zA-Z]/g, '').trim();
                    tagName = tagName.toLowerCase();

                    // remove space and = character
                    remainingArgument = attribute.substring(originTagNameLength).trim();
                    if (tagName === 'src') {
                        rightQuot = this.getRightQuotationIndex(remainingArgument);
                    } else {
                        rightQuot = -1;
                    }
                    nextSpace = remainingArgument.indexOf(' ', rightQuot + 1 >= remainingArgument.length ? -1 : rightQuot + 1);
                    tagValue = (nextSpace > -1) ? remainingArgument.substring(0, nextSpace) : remainingArgument;
                    attribute = remainingArgument.substring(nextSpace).trim();

                    if (tagValue.endsWith('/')) {
                        tagValue = tagValue.slice(0, -1);
                    }
                    if (tagName === 'src') {
                        switch (tagValue.charCodeAt(0)) {
                        case 34: // "
                        case 39: // '
                            isValidImageTag = true;
                            tagValue = tagValue.slice(1, -1);
                            break;
                        default:
                            break;
                        }
                        obj.isImage = true;
                        obj.src = tagValue;
                    } else if (tagName === 'height') {
                        obj.imageHeight = parseInt(tagValue);
                    } else if (tagName === 'width') {
                        obj.imageWidth = parseInt(tagValue);
                    } else if (tagName === 'align') {
                        switch (tagValue.charCodeAt(0)) {
                        case 34: // "
                        case 39: // '
                            tagValue = tagValue.slice(1, -1);
                            break;
                        default:
                            break;
                        }
                        obj.imageAlign = tagValue.toLowerCase();
                    } else if (tagName === 'offset') {
                        obj.imageOffset = tagValue;
                    } else if (tagName === 'click') {
                        obj.event = this._processEventHandler(`${tagName}=${tagValue}`);
                    }

                    if (obj.event && tagName === 'param') {
                        obj.event[tagName] = tagValue.replace(/^"|"$/g, '');
                    }

                    header = imageAttrReg.exec(attribute);
                }

                if (isValidImageTag && obj.isImage) {
                    this._resultObjectArray.push({ text: '', style: obj });
                }

                return {};
            }
        }

        header = /^(outline(\s)*[^>]*)/.exec(attribute);
        if (header) {
            attribute = header[0].substring('outline'.length).trim();
            const defaultOutlineObject = { color: '#ffffff', width: 1 };
            if (attribute) {
                const outlineAttrReg = /(\s)*color(\s)*=|(\s)*width(\s)*=|(\s)*click(\s)*=|(\s)*param(\s)*=/;
                header = outlineAttrReg.exec(attribute);
                let tagValue: string;
                while (header) {
                    // skip the invalid tags at first
                    attribute = attribute.substring(attribute.indexOf(header[0]));
                    tagName = attribute.substring(0, header[0].length);
                    // remove space and = character
                    remainingArgument = attribute.substring(tagName.length).trim();
                    nextSpace = remainingArgument.indexOf(' ');
                    if (nextSpace > -1) {
                        tagValue = remainingArgument.substring(0, nextSpace);
                    } else {
                        tagValue = remainingArgument;
                    }
                    tagName = tagName.replace(/[^a-zA-Z]/g, '').trim();
                    tagName = tagName.toLowerCase();

                    attribute = remainingArgument.substring(nextSpace).trim();
                    if (tagName === 'click') {
                        obj.event = this._processEventHandler(`${tagName}=${tagValue}`);
                    } else if (tagName === 'color') {
                        defaultOutlineObject.color = tagValue;
                    } else if (tagName === 'width') {
                        defaultOutlineObject.width = parseInt(tagValue);
                    }

                    if (obj.event && tagName === 'param') {
                        obj.event[tagName] = tagValue.replace(/^"|"$/g, '');
                    }

                    header = outlineAttrReg.exec(attribute);
                }
            }
            obj.outline = defaultOutlineObject;
        }

        header = /^(on|u|b|i)(\s)*/.exec(attribute);
        if (header && header[0].length > 0) {
            tagName = header[0];
            attribute = attribute.substring(tagName.length).trim();
            switch (tagName[0]) {
            case 'u':
                obj.underline = true;
                break;
            case 'i':
                obj.italic = true;
                break;
            case 'b':
                obj.bold = true;
                break;
            default:
                break;
            }
            if (attribute === '') {
                return obj;
            }

            obj.event = this._processEventHandler(attribute);
        }

        return obj;
    }

    // find the right part of the first pair of following quotations.
    private getRightQuotationIndex (remainingArgument: string): number {
        let leftQuot = -1;
        let rightQuot = -1;
        // Skip a pair of quotations for avoiding spaces in image name are detected.
        const leftSingleQuot = remainingArgument.indexOf('\'');
        const leftDoubleQuot = remainingArgument.indexOf('"');

        const useSingleQuot = leftSingleQuot  > -1 && (leftSingleQuot < leftDoubleQuot || leftDoubleQuot === -1);
        const useDoubleQuot = leftDoubleQuot > -1 && (leftDoubleQuot < leftSingleQuot || leftSingleQuot === -1);
        if (useSingleQuot) {
            leftQuot = leftSingleQuot;
            rightQuot = remainingArgument.indexOf('\'', leftQuot + 1 >= remainingArgument.length ? -1 : leftQuot + 1);
        } else if (useDoubleQuot) {
            leftQuot = leftDoubleQuot;
            rightQuot = remainingArgument.indexOf('"', leftQuot + 1 >= remainingArgument.length ? -1 : leftQuot + 1);
        }

        return rightQuot;
    }

    private _processEventHandler (eventString: string): Record<string, any> {
        const obj = {};
        let index = 0;
        let isValidTag = false;
        let eventNames = eventRegx.exec(eventString);
        while (eventNames) {
            let eventName = eventNames[0];
            let eventValue = '';
            isValidTag = false;
            eventString = eventString.substring(eventName.length).trim();
            if (eventString.charAt(0) === '"') {
                index = eventString.indexOf('"', 1);
                if (index > -1) {
                    eventValue = eventString.substring(1, index).trim();
                    isValidTag = true;
                }
                index++;
            } else if (eventString.charAt(0) === '\'') {
                index = eventString.indexOf('\'', 1);
                if (index > -1) {
                    eventValue = eventString.substring(1, index).trim();
                    isValidTag = true;
                }
                index++;
            } else {
                // skip the invalid attribute value
                const match = /(\S)+/.exec(eventString);
                if (match) {
                    eventValue = match[0];
                } else {
                    eventValue = '';
                }
                index = eventValue.length;
            }

            if (isValidTag) {
                eventName = eventName.substring(0, eventName.length - 1).trim();
                obj[eventName] = eventValue;
            }

            eventString = eventString.substring(index).trim();
            eventNames = eventRegx.exec(eventString);
        }

        return obj;
    }

    private _addToStack (attribute: string): void {
        const obj = this._attributeToObject(attribute);

        if (this._stack.length === 0) {
            this._stack.push(obj);
        } else {
            if (obj.isNewLine || obj.isImage) {
                return;
            }
            // for nested tags
            const previousTagObj = this._stack[this._stack.length - 1];
            for (const key in previousTagObj) {
                if (!(obj[key])) {
                    obj[key] = previousTagObj[key];
                }
            }
            this._stack.push(obj);
        }
    }

    private _processResult (value: string): void {
        if (value.length === 0) {
            return;
        }

        value = this._escapeSpecialSymbol(value);
        if (this._stack.length > 0) {
            this._resultObjectArray.push({ text: value, style: this._stack[this._stack.length - 1] });
        } else {
            this._resultObjectArray.push({ text: value } as IHtmlTextParserResultObj);
        }
    }

    private _escapeSpecialSymbol (str: string): string {
        for (const symbolArr of this._specialSymbolArray) {
            const key = symbolArr[0];
            const value = symbolArr[1];

            str = str.replace(key, value);
        }

        return str;
    }
}

if (TEST) {
    cclegacy._Test.HtmlTextParser = HtmlTextParser;
}
