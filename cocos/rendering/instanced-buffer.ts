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

import { Pass } from '../render-scene';
import { SubModel } from '../render-scene/scene';
import { UNIFORM_LIGHTMAP_TEXTURE_BINDING, UNIFORM_REFLECTION_PROBE_BLEND_CUBEMAP_BINDING, UNIFORM_REFLECTION_PROBE_CUBEMAP_BINDING,
    UNIFORM_REFLECTION_PROBE_TEXTURE_BINDING } from './define';
import { BufferUsageBit, MemoryUsageBit, Device, Texture, InputAssembler, InputAssemblerInfo,
    Attribute, Buffer, BufferInfo, CommandBuffer, Shader, DescriptorSet  } from '../gfx';

export interface IInstancedItem {
    count: number;
    capacity: number;
    vb: Buffer;
    data: Uint8Array;
    ia: InputAssembler;
    stride: number;
    shader: Shader | null;
    descriptorSet: DescriptorSet;
    lightingMap: Texture;
    reflectionProbeCubemap: Texture;
    reflectionProbePlanarMap: Texture;
    useReflectionProbeType: number;
    reflectionProbeBlendCubemap: Texture;
}

const INITIAL_CAPACITY = 32;
const MAX_CAPACITY = 1024;

export class InstancedBuffer {
    public instances: IInstancedItem[] = [];
    public declare pass: Pass;
    public hasPendingModels = false;
    public dynamicOffsets: number[] = [];
    private declare _device: Device;

    constructor (pass: Pass) {
        this._device = pass.device;
        this.pass = pass;
    }

    public destroy (): void {
        this.instances.forEach((instance) => {
            instance.vb.destroy();
            instance.ia.destroy();
        });
        this.instances.length = 0;
    }

    public merge (subModel: SubModel, passIdx: number, shaderImplant: Shader | null = null): void {
        const attrs = subModel.instancedAttributeBlock;
        const stride = attrs.buffer.length;
        if (!stride) { return; } // we assume per-instance attributes are always present
        const sourceIA = subModel.inputAssembler;
        const subModelDescriptorSet = subModel.descriptorSet;
        const lightingMap = subModelDescriptorSet.getTexture(UNIFORM_LIGHTMAP_TEXTURE_BINDING);
        const reflectionProbeCubemap = subModelDescriptorSet.getTexture(UNIFORM_REFLECTION_PROBE_CUBEMAP_BINDING);
        const reflectionProbePlanarMap = subModelDescriptorSet.getTexture(UNIFORM_REFLECTION_PROBE_TEXTURE_BINDING);
        const reflectionProbeBlendCubemap = subModelDescriptorSet.getTexture(UNIFORM_REFLECTION_PROBE_BLEND_CUBEMAP_BINDING);
        const useReflectionProbeType = subModel.useReflectionProbeType;
        let shader = shaderImplant;
        if (!shader) {
            shader = subModel.shaders[passIdx];
        }
        const descriptorSet = subModel.descriptorSet;
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            if (instance.ia.indexBuffer?.objectID !== sourceIA.indexBuffer?.objectID || instance.count >= MAX_CAPACITY) { continue; }

            // check same binding
            if (instance.lightingMap.objectID !== lightingMap.objectID) {
                continue;
            }

            if (instance.useReflectionProbeType !== useReflectionProbeType) {
                continue;
            }
            if (instance.reflectionProbeCubemap.objectID !== reflectionProbeCubemap.objectID) {
                continue;
            }
            if (instance.reflectionProbePlanarMap.objectID !== reflectionProbePlanarMap.objectID) {
                continue;
            }
            if (instance.reflectionProbeBlendCubemap.objectID !== reflectionProbeBlendCubemap.objectID) {
                continue;
            }

            if (instance.stride !== stride) {
                // we allow this considering both baked and non-baked
                // skinning models may be present in the same buffer
                continue;
            }
            if (instance.count >= instance.capacity) { // resize buffers
                instance.capacity <<= 1;
                const newSize = instance.stride * instance.capacity;
                const oldData = instance.data;
                instance.data = new Uint8Array(newSize);
                instance.data.set(oldData);
                instance.vb.resize(newSize);
            }
            instance.shader = shader;
            instance.descriptorSet = descriptorSet;
            instance.data.set(attrs.buffer, instance.stride * instance.count++);
            this.hasPendingModels = true;
            return;
        }

        // Create a new instance
        const vb = this._device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
            stride * INITIAL_CAPACITY,
            stride,
        ));
        const data = new Uint8Array(stride * INITIAL_CAPACITY);
        const vertexBuffers = sourceIA.vertexBuffers.slice();
        const attributes = sourceIA.attributes.slice();
        const indexBuffer = sourceIA.indexBuffer;

        for (let i = 0; i < attrs.attributes.length; i++) {
            const attr = attrs.attributes[i];
            const newAttr = new Attribute(attr.name, attr.format, attr.isNormalized, vertexBuffers.length, true);
            attributes.push(newAttr);
        }
        data.set(attrs.buffer);

        vertexBuffers.push(vb);
        const iaInfo = new InputAssemblerInfo(attributes, vertexBuffers, indexBuffer);
        const ia = this._device.createInputAssembler(iaInfo);
        // eslint-disable-next-line max-len
        this.instances.push({ count: 1, capacity: INITIAL_CAPACITY, vb, data, ia, stride, shader, descriptorSet, lightingMap, reflectionProbeCubemap, reflectionProbePlanarMap, useReflectionProbeType, reflectionProbeBlendCubemap });
        this.hasPendingModels = true;
    }

    public uploadBuffers (cmdBuff: CommandBuffer): void {
        for (let i = 0; i < this.instances.length; ++i) {
            const instance = this.instances[i];
            if (!instance.count) { continue; }
            instance.ia.instanceCount = instance.count;
            cmdBuff.updateBuffer(instance.vb, instance.data);
        }
    }

    public clear (): void {
        this.instances.forEach((instance) => {
            instance.count = 0;
        });
        this.hasPendingModels = false;
    }
}
