/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

// This file only exports functions/classes that are only visible to engine internal.

export { editable, tooltip, visible, displayName, displayOrder, range, rangeStep, slide, disallowAnimation } from './data/decorators/editable';
export { override } from './data/decorators/override';
export { formerlySerializedAs, serializable } from './data/decorators/serializable';

export * from './algorithm/binary-search';
export { shift } from './algorithm/move';

export { garbageCollectionManager } from './data/garbage-collection';
export { GCObject } from './data/gc-object';

export type { DeserializationContext } from './data/custom-serializable';

export * from './data/utils/asserts';
export * from './data/utils/compiler';

export { setPropertyEnumType, setPropertyEnumTypeOnAttrs } from './data/utils/attribute-internal';

export { ENUM_TAG, BITMASK_TAG } from './data/class';
export { isCCObject, isValid } from './data/object';

export { EasingMethod } from './curves/easing-method';

export { CallbacksInvoker } from './event/callbacks-invoker';
export { applyMixins } from './event/event-target-factory';

export { _resetDebugSetting } from './platform/debug';
