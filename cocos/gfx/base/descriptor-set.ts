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

import { Buffer } from './buffer';
import { DescriptorSetLayout } from './descriptor-set-layout';
import { Sampler } from './states/sampler';
import { Texture } from './texture';
import { GFXObject, ObjectType, DescriptorSetInfo, DESCRIPTOR_BUFFER_TYPE, DESCRIPTOR_SAMPLER_TYPE, AccessFlags, AccessFlagBit } from './define';

/**
 * @en GFX descriptor sets.
 * @zh GFX 描述符集组。
 */
export abstract class DescriptorSet extends GFXObject {
    get layout (): DescriptorSetLayout {
        return this._layout!;
    }

    protected _layout: DescriptorSetLayout | null = null;
    protected _buffers: Buffer[] = [];
    protected _textures: Texture[] = [];
    protected _samplers: Sampler[] = [];

    protected _isDirty = false;

    constructor () {
        super(ObjectType.DESCRIPTOR_SET);
    }

    public abstract initialize (info: Readonly<DescriptorSetInfo>): void;

    public abstract destroy (): void;

    public abstract update (): void;

    /**
     * @en Bind buffer to the specified descriptor.
     * @zh 在指定的描述符位置上绑定缓冲。
     * @param binding The target binding.
     * @param buffer The buffer to be bound.
     */
    public bindBuffer (binding: number, buffer: Buffer, index = 0): void {
        const bindingIndex = this._layout!.bindingIndices[binding];
        const info = this._layout!.bindings[bindingIndex]; if (!info) { return; }
        if (info.descriptorType & DESCRIPTOR_BUFFER_TYPE) {
            const descriptorIndex = this._layout!.descriptorIndices[binding];
            if (this._buffers[descriptorIndex + index] !== buffer) {
                this._buffers[descriptorIndex + index] = buffer;
                this._isDirty = true;
            }
        }
    }

    /**
     * @en Bind sampler to the specified descriptor.
     * @zh 在指定的描述符位置上绑定采样器。
     * @param binding The target binding.
     * @param sampler The sampler to be bound.
     */
    public bindSampler (binding: number, sampler: Sampler, index = 0): void {
        const bindingIndex = this._layout!.bindingIndices[binding];
        const info = this._layout!.bindings[bindingIndex]; if (!info) { return; }
        if (info.descriptorType & DESCRIPTOR_SAMPLER_TYPE) {
            const descriptorIndex = this._layout!.descriptorIndices[binding];
            if (this._samplers[descriptorIndex + index] !== sampler) {
                this._samplers[descriptorIndex + index] = sampler;
                this._isDirty = true;
            }
        }
    }

    /**
     * @en Bind texture to the specified descriptor.
     * @zh 在指定的描述符位置上绑定纹理。
     * @param binding The target binding.
     * @param texture The texture to be bound.
     */
    public bindTexture (binding: number, texture: Texture, index = 0, flags = AccessFlagBit.NONE): void {
        const bindingIndex = this._layout!.bindingIndices[binding];
        const info = this._layout!.bindings[bindingIndex]; if (!info) { return; }
        if (info.descriptorType & DESCRIPTOR_SAMPLER_TYPE) {
            const descriptorIndex = this._layout!.descriptorIndices[binding];
            if (this._textures[descriptorIndex + index] !== texture) {
                this._textures[descriptorIndex + index] = texture;
                this._isDirty = true;
            }
        }
    }

    /**
     * @en Get buffer from the specified binding location.
     * @zh 获取当前指定绑定位置上的缓冲。
     * @param binding The target binding.
     */
    public getBuffer (binding: number, index = 0): Buffer {
        const descriptorIndex = this._layout!.descriptorIndices[binding];
        return this._buffers[descriptorIndex + index];
    }

    /**
     * @en Get sampler from the specified binding location.
     * @zh 获取当前指定绑定位置上的采样器。
     * @param binding The target binding.
     */
    public getSampler (binding: number, index = 0): Sampler {
        const descriptorIndex = this._layout!.descriptorIndices[binding];
        return this._samplers[descriptorIndex + index];
    }

    /**
     * @en Get texture from the specified binding location.
     * @zh 获取当前指定绑定位置上的贴图。
     * @param binding The target binding.
     */
    public getTexture (binding: number, index = 0): Texture {
        const descriptorIndex = this._layout!.descriptorIndices[binding];
        return this._textures[descriptorIndex + index];
    }
}
