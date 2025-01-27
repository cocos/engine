/*
 Copyright (c) 2018-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import * as _decorator from './class-decorator';
import { legacyCC } from '../global-exports';

legacyCC._decorator = _decorator;
export { _decorator };
export { CCClass, isCCClassOrFastDefined } from './class';
export { CCObject, CCObjectFlags } from './object';
export { CCInteger, CCFloat, CCBoolean, CCString } from './utils/attribute';
export { CompactValueTypeArray } from './utils/compact-value-type-array';
export { editorExtrasTag } from './editor-extras-tag';
export { deserializeTag, serializeTag } from './custom-serializable';
export type {
    SerializationInput,
    SerializationOutput,
    SerializationContext,
    CustomSerializable,
} from './custom-serializable';
export { getSerializationMetadata } from './serialization-metadata';
export type { SerializationMetadata } from './serialization-metadata';
export { EditorExtendable } from './editor-extendable';
