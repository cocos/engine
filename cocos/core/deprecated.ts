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

import { replaceProperty, removeProperty } from './utils/x-deprecated';
import * as math from './math';
import { Scheduler } from './scheduler';
import { legacyCC } from './global-exports';

import { SystemPriority } from './system';

// VMATH

const vmath = {};
replaceProperty(vmath, 'vmath', [
    {
        name: 'vec2',
        newName: 'Vec2',
        target: math,
        targetName: 'math',
    },
    {
        name: 'vec3',
        newName: 'Vec3',
        target: math,
        targetName: 'math',
    },
    {
        name: 'vec4',
        newName: 'Vec4',
        target: math,
        targetName: 'math',
    },
    {
        name: 'quat',
        newName: 'Quat',
        target: math,
        targetName: 'math',
    },
    {
        name: 'mat3',
        newName: 'Mat3',
        target: math,
        targetName: 'math',
    },    {
        name: 'mat4',
        newName: 'Mat4',
        target: math,
        targetName: 'math',
    },
    {
        name: 'color4',
        newName: 'Color',
        target: math,
        targetName: 'math',
    },
    {
        name: 'rect',
        newName: 'Rect',
        target: math,
        targetName: 'math',
    },
    {
        name: 'approx',
        newName: 'approx',
        target: math,
        targetName: 'math',
    },
    {
        name: 'EPSILON',
        newName: 'EPSILON',
        target: math,
        targetName: 'math',
    },
    {
        name: 'equals',
        newName: 'equals',
        target: math,
        targetName: 'math',
    },
    {
        name: 'clamp',
        newName: 'clamp',
        target: math,
        targetName: 'math',
    },
    {
        name: 'clamp01',
        newName: 'clamp01',
        target: math,
        targetName: 'math',
    },
    {
        name: 'lerp',
        newName: 'lerp',
        target: math,
        targetName: 'math',
    },
    {
        name: 'toRadian',
        newName: 'toRadian',
        target: math,
        targetName: 'math',
    },
    {
        name: 'toDegree',
        newName: 'toDegree',
        target: math,
        targetName: 'math',
    },
    {
        name: 'random',
        newName: 'random',
        target: math,
        targetName: 'math',
    },
    {
        name: 'randomRange',
        newName: 'randomRange',
        target: math,
        targetName: 'math',
    },
    {
        name: 'randomRangeInt',
        newName: 'randomRangeInt',
        target: math,
        targetName: 'math',
    },
    {
        name: 'pseudoRandom',
        newName: 'pseudoRandom',
        target: math,
        targetName: 'math',
    },
    {
        name: 'pseudoRandomRangeInt',
        newName: 'pseudoRandomRangeInt',
        target: math,
        targetName: 'math',
    },
    {
        name: 'nextPow2',
        newName: 'nextPow2',
        target: math,
        targetName: 'math',
    },
    {
        name: 'repeat',
        newName: 'repeat',
        target: math,
        targetName: 'math',
    },
    {
        name: 'pingPong',
        newName: 'pingPong',
        target: math,
        targetName: 'math',
    },
    {
        name: 'inverseLerp',
        newName: 'inverseLerp',
        target: math,
        targetName: 'math',
    },
]);

legacyCC.vmath = vmath;

export { vmath };

// Scheduler

replaceProperty(Scheduler.prototype, 'Scheduler.prototype', [
    {
        name: 'enableForTarget',
        newName: 'enableForTarget',
        target: Scheduler,
        targetName: 'Scheduler',
    },
]);

// replace Scheduler static property
replaceProperty(Scheduler, 'Scheduler', [
    {
        name: 'PRIORITY_SYSTEM',
        newName: 'System.Priority.SCHEDULER',
        customGetter (): number {
            return SystemPriority.SCHEDULER;
        },
    },
]);

// remove Scheduler static property
removeProperty(Scheduler, 'Scheduler', [
    {
        name: 'PRIORITY_NON_SYSTEM',
        suggest: 'Use enum` System.Priority` instead',
    },
]);
