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

import { GFXObject, ObjectType, ShaderInfo, ShaderStage, UniformBlock, UniformSampler, Attribute } from './define';

/**
 * @en GFX shader.
 * @zh GFX 着色器。
 */
export abstract class Shader extends GFXObject {
    get name (): string {
        return this._name;
    }

    get attributes (): Attribute[] {
        return this._attributes;
    }

    get blocks (): UniformBlock[] {
        return this._blocks;
    }

    get samplers (): UniformSampler[] {
        return this._samplers;
    }

    get stages (): ShaderStage[] {
        return this._stages;
    }

    protected _name = '';
    protected _stages: ShaderStage[] = [];
    protected _attributes: Attribute[] = [];
    protected _blocks: UniformBlock[] = [];
    protected _samplers: UniformSampler[] = [];

    constructor () {
        super(ObjectType.SHADER);
    }

    public abstract initialize (info: Readonly<ShaderInfo>): void;

    public abstract destroy (): void;
}
