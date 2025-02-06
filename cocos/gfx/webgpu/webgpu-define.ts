/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable func-names */
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

import { WEBGPU } from 'internal:constants';
import { gfx, webgpuAdapter, glslangWasmModule, promiseForWebGPUInstantiation, twgslModule } from '../../webgpu/instantiated';
import {
    Texture, CommandBuffer, DescriptorSet, Device, InputAssembler, Buffer, Shader
} from './override';
import {
    DeviceInfo, BufferTextureCopy, ShaderInfo, ShaderStageFlagBit, TextureViewInfo, TextureInfo, DrawInfo, BufferViewInfo, BufferInfo, BufferUsageBit, IndirectBuffer,
} from '../base/define';

import { ccwindow } from '../../core/global-exports';


WEBGPU && promiseForWebGPUInstantiation.then(() => {
    const originDeviceInitializeFunc = Device.prototype.initialize;
    Device.prototype.initialize = function (info: DeviceInfo) {
        const adapter = webgpuAdapter.adapter;
        const device = webgpuAdapter.device;
        gfx.preinitializedWebGPUDevice = device;
        device.lost.then((info) => {
            console.error('Device was lost.', info);
            throw new Error('Something bad happened');
        });
        console.log(adapter);

        originDeviceInitializeFunc.call(this, info);

        return true;
    };

    Device.prototype.flushCommands = function () {
    };

    const oldCreateTexture = Device.prototype.createTexture;
    Device.prototype.createTexture = function (info: TextureInfo | TextureViewInfo) {
        if ('texture' in info) {
            return this.createTextureView(info);
        } else {
            return oldCreateTexture.call(this, info);
        }
    };

    const oldCreateBuffer = Device.prototype.createBuffer;
    Device.prototype.createBuffer = function (info: BufferInfo | BufferViewInfo) {
        if ('buffer' in info) {
            return this.createBufferView(info);
        } else {
            return oldCreateBuffer.call(this, info);
        }
    };

    const oldDraw = CommandBuffer.prototype.draw;
    CommandBuffer.prototype.draw = function (info: DrawInfo | typeof InputAssembler) {
        if ('attributesHash' in info) {
            return this.draw(info.drawInfo);
        } else {
            return this.drawByInfo(info);
        }
    };

    const oldUpdateBuffer = Buffer.prototype.update;
    Buffer.prototype.update = function (data: BufferSource, size?: number) {
        if (this.usage & BufferUsageBit.INDIRECT) {
            this.updateIndirect(((data as unknown) as IndirectBuffer).drawInfos);
        } else {
            const updateSize = size === undefined ? data.byteLength : size;
            if ('buffer' in data) {
                oldUpdateBuffer.call(this, new Uint8Array(data.buffer, data.byteOffset, data.byteLength), updateSize);
            } else {
                oldUpdateBuffer.call(this, new Uint8Array(data), updateSize);
            }
        }

    };

    const oldCmdUpdateBuffer = CommandBuffer.prototype.updateBuffer;
    CommandBuffer.prototype.updateBuffer = function (buffer: typeof Buffer, data: BufferSource, size?: number) {
        if (this.usage & BufferUsageBit.INDIRECT) {
            this.updateIndirect(buffer, ((data as unknown) as IndirectBuffer).drawInfos);
        } else {
            const updateSize = size === undefined ? data.byteLength : size;
            if ('buffer' in data) {
                oldCmdUpdateBuffer.call(this, buffer, new Uint8Array(data.buffer, data.byteOffset, data.byteLength), updateSize);
            } else {
                oldCmdUpdateBuffer.call(this, buffer, new Uint8Array(data), updateSize);
            }
        }
    };

    const oldBindDescriptorSet = CommandBuffer.prototype.bindDescriptorSet;
    CommandBuffer.prototype.bindDescriptorSet = function (set: number, descriptorSet: typeof DescriptorSet, dynamicOffsets?: Readonly<number[]>) {
        if (dynamicOffsets === undefined) {
            oldBindDescriptorSet.call(this, set, descriptorSet, []);
        } else if ('buffer' in dynamicOffsets) {
            oldBindDescriptorSet.call(this, set, descriptorSet, new Uint32Array((dynamicOffsets as any).buffer, (dynamicOffsets as any).byteOffset, (dynamicOffsets as any).byteLength));
        } else {
            oldBindDescriptorSet.call(this, set, descriptorSet, new Uint32Array(dynamicOffsets));
        }
    };

    const oldCmdCopyBuffersToTexture = CommandBuffer.prototype.copyBuffersToTexture;
    CommandBuffer.prototype.copyBuffersToTexture = function (buffers: Readonly<ArrayBufferView[]>, texture: typeof Texture, regions: Readonly<BufferTextureCopy[]>) {
        const ucharBuffers: Uint8Array[] = [];
        const buffSize = buffers.length
        for (let i = 0; i < buffSize; ++i) {
            const buffer = buffers[i];
            if ('buffer' in buffer) {
                ucharBuffers.push(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
            } else {
                ucharBuffers.push(new Uint8Array(buffer as any));
            }
        }
        oldCmdCopyBuffersToTexture.call(this, ucharBuffers, texture, regions);
    };

    const oldDeviceCopyBuffersToTexture = Device.prototype.copyBuffersToTexture;
    Device.prototype.copyBuffersToTexture = function (buffers: Readonly<ArrayBufferView[]>, texture: typeof Texture, regions: Readonly<BufferTextureCopy[]>) {
        const ucharBuffers: Uint8Array[] = [];
        const buffSize = buffers.length;
        for (let i = 0; i < buffSize; ++i) {
            const buffer = buffers[i];
            if ('buffer' in buffer) {
                ucharBuffers.push(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
            } else {
                ucharBuffers.push(new Uint8Array(buffer as any));
            }
        }
        oldDeviceCopyBuffersToTexture.call(this, ucharBuffers, texture, regions);
    };

    Device.prototype.copyTexImagesToTexture = function (texImages: TexImageSource[], texture: typeof Texture, regions: BufferTextureCopy[]) {
        const buffers: Uint8Array[] = [];
        const regionSize = regions.length;
        for (let i = 0; i < regionSize; i++) {
            if ('getContext' in texImages[i]) {
                const canvasElem = texImages[i] as HTMLCanvasElement;
                const imageData = canvasElem.getContext('2d')?.getImageData(0, 0, texImages[i].width, texImages[i].height);
                const buff = imageData!.data.buffer;
                let data;
                let rawBuffer;
                if ('buffer' in buff) {
                    // es-lint as any
                    data = new Uint8Array((buff as any).buffer, (buff as any).byteOffset, (buff as any).byteLength);
                } else {
                    rawBuffer = buff;
                    data = new Uint8Array(rawBuffer);
                }
                buffers[i] = data;
            } else if (texImages[i] instanceof HTMLImageElement || texImages[i] instanceof ImageBitmap) {
                const img = texImages[i];
                const canvas = ccwindow.document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img as any, 0, 0);
                const imageData = ctx?.getImageData(0, 0, img.width, img.height);
                const buff = imageData!.data.buffer;
                let data;
                let rawBuffer;
                if ('buffer' in buff) {
                    // es-lint as any
                    data = new Uint8Array((buff as any).buffer, (buff as any).byteOffset, (buff as any).byteLength);
                } else {
                    rawBuffer = buff;
                    data = new Uint8Array(rawBuffer);
                }
                buffers[i] = data;
            } else {
                console.log('imageBmp copy not impled!');
            }
        }

        oldDeviceCopyBuffersToTexture.call(this, buffers, texture, regions);
    };

    const SEPARATE_SAMPLER_BINDING_OFFSET = 16;
    function seperateCombinedSamplerTexture(shaderSource: string) {
        // gather
        let samplerReg = /.*?(\(set = \d+, binding = )(\d+)\) uniform[^;]+sampler(\w*) (\w+);/g;
        let iter = samplerReg.exec(shaderSource);
        // samplerName, samplerType
        const referredMap = new Map<string, string>();
        while (iter) {
            const samplerName = iter[4];
            const samplerType = iter[3];
            referredMap.set(samplerName, samplerType);
            iter = samplerReg.exec(shaderSource);
        }

        // replaceAll --> es 2021 required
        let code = shaderSource;
        // referredMap.forEach((value, key)=> {
        //     const samplerName = key;
        //     const samplerType = value;
        //     const exp = new RegExp(`\\b${samplerName}\\b([^;])`);
        //     let it = exp.exec(code);
        //     while (it) {
        //         code = code.replace(exp, `sampler${samplerType}(_${samplerName}, _${samplerName}_sampler)${it[1]}`);
        //         it = exp.exec(code);
        //     }
        // });
        let sampReg = /.*?(\(set = \d+, binding = )(\d+)\) uniform[^;]+sampler(\w*) (\w+);/g;
        let it = sampReg.exec(code);
        while (it) {
            code = code.replace(sampReg, `layout$1 $2) uniform texture$3 $4;\nlayout$1 $2 + ${SEPARATE_SAMPLER_BINDING_OFFSET}) uniform sampler $4_sampler;\n`);
            it = sampReg.exec(code);
        }

        const builtinSample = ['texture', 'textureSize', 'texelFetch', 'textureLod'];
        const replaceBultin = function (samplerName: string, samplerType: string, target: string) {
            builtinSample.forEach((sampleFunc) => {
                const builtinSampleReg = new RegExp(`${sampleFunc}\\s*\\(\\s*${samplerName}\\s*,`);
                let builtinFuncIter = builtinSampleReg.exec(target);
                while (builtinFuncIter) {
                    target = target.replace(builtinFuncIter[0], `${sampleFunc}(sampler${samplerType}(${samplerName}, ${samplerName}_sampler),`);
                    builtinFuncIter = builtinSampleReg.exec(target);
                }
            });
            return target;
        }

        let funcReg = /\s([\S]+)\s*\(([\w\s,]+)\)[\s|\\|n]*{/g;
        let funcIter = funcReg.exec(code);
        const funcSet = new Set<string>();
        const paramTypeMap = new Map<string, string>();
        while (funcIter) {
            paramTypeMap.clear();

            const params = funcIter[2];
            let paramsRes = params.slice();
            if (params.includes('sampler')) {
                const paramIndexSet = new Set<number>();
                const paramArr = params.split(',');
                const paramSize = paramArr.length;
                for (let i = 0; i < paramSize; ++i) {
                    const paramDecl = paramArr[i].split(' ');
                    const typeDecl = paramDecl[paramDecl.length - 2];
                    if (typeDecl.includes('sampler') && typeDecl !== 'sampler') {
                        const samplerType = typeDecl.replace('sampler', '');
                        const paramName = paramDecl[paramDecl.length - 1];
                        paramsRes = paramsRes.replace(paramArr[i], ` texture${samplerType} ${paramName}, sampler ${paramName}_sampler`);
                        paramIndexSet.add(i);
                        paramTypeMap.set(paramName, samplerType);
                    }
                }
                // let singleParamReg = new RegExp(`(\\W?)(\\w+)\\s+\\b([^,)]+)\\b`);

                code = code.replace(params, paramsRes);

                const funcName = funcIter[1];
                // function may overload
                if (!funcSet.has(funcName)) {
                    // const samplerTypePrefix = '1D|2D|3D|Cube|Buffer';
                    const funcSamplerReg = new RegExp(`${funcName}\\s*?\\((\\s*[^;\\{]+)`, 'g');
                    const matches = code.matchAll(funcSamplerReg);
                    for (let matched of matches) {
                        if (!matched[1].match(/\b\w+\b\s*\b\w+\b/g)) {
                            const stripStr = matched[1][matched[1].length - 1] === ')' ? matched[1].slice(0, -1) : matched[1];
                            let params = stripStr.split(',');
                            let queued = 0; // '('
                            let paramIndex = 0;
                            const currParamsSize = params.length;
                            for (let i = 0; i < currParamsSize; ++i) {
                                if (params[i].includes('(')) {
                                    ++queued;
                                }
                                if (params[i].includes(')')) {
                                    --queued;
                                }

                                if (!queued || i === currParamsSize - 1) {
                                    if (paramIndexSet.has(paramIndex)) {
                                        params[i] += `, ${params[i]}_sampler`;
                                    }
                                    ++paramIndex;
                                }
                            }
                            const newParams = params.join(',');
                            const newInvokeStr = matched[0].replace(stripStr, newParams);
                            code = code.replace(matched[0], newInvokeStr);
                        }
                        // else: function declare
                    }
                }

                let count = 1;
                let startIndex = code.indexOf(funcIter[1], funcIter.index);
                startIndex = code.indexOf('{', startIndex) + 1;
                let endIndex = 0;
                while (count) {
                    if (code.at(startIndex) === '{') {
                        ++count;
                    } else if (code.at(startIndex) === '}') {
                        --count;
                    }

                    if (count === 0) {
                        endIndex = startIndex;
                        break;
                    }

                    const nextLeft = code.indexOf('{', startIndex + 1);
                    const nextRight = code.indexOf('}', startIndex + 1);
                    startIndex = nextLeft === -1 ? nextRight : Math.min(nextLeft, nextRight);
                }
                const funcBody = code.slice(funcIter.index, endIndex);
                let newFunc = funcBody;
                paramTypeMap.forEach((type, name) => {
                    newFunc = replaceBultin(name, type, newFunc);
                });

                code = code.replace(funcBody, newFunc);
                funcSet.add(funcIter[1]);
            }
            funcIter = funcReg.exec(code);
        }

        referredMap.forEach((type, name) => {
            code = replaceBultin(name, type, code);
        });

        ///////////////////////////////////////////////////////////
        // isNan, isInf has been removed in dawn:tint

        let functionDefs = '';
        const precisionKeyWord = 'highp';
        const isNanIndex = code.indexOf('isnan');
        if (isNanIndex !== -1) {
            // getPrecision(isNanIndex);
            functionDefs += `\n
             bool isNan(${precisionKeyWord} float val) {
                 return (val < 0.0 || 0.0 < val || val == 0.0) ? false : true;
             }
             \n`;
            code = code.replace(/isnan\(/gi, 'isNan(');
        }

        const isInfIndex = code.indexOf('isinf');
        if (isInfIndex !== -1) {
            // getPrecision(isInfIndex);
            functionDefs += `\n
             bool isInf(${precisionKeyWord} float x) {
                 return x == x * 2.0 && x != 0.0;
             }
             \n`;
            code = code.replace(/isinf\(/gi, 'isInf(');
        }

        ///////////////////////////////////////////////////////////

        let firstPrecisionIdx = code.indexOf('precision');
        firstPrecisionIdx = code.indexOf(';', firstPrecisionIdx);
        firstPrecisionIdx += 1;
        code = `${code.slice(0, firstPrecisionIdx)}\n${functionDefs}\n${code.slice(firstPrecisionIdx)}`;

        return code;
    }

    function reflect(wgsl: string[]) {
        const bindingList: number[][] = [];
        for (let wgslStr of wgsl) {
            // @group(1) @binding(0) var<uniform> x_78 : Constants;
            // @group(1) @binding(1) var albedoMap : texture_2d<f32>;
            const reg = new RegExp(/@group\((\d)\)\s+@binding\((\d+)\)/g);
            let iter = reg.exec(wgslStr);
            while (iter) {
                const set = +iter[1];
                const binding = +iter[2];
                while (bindingList.length <= set) {
                    bindingList.push([]);
                }
                bindingList[set][bindingList[set].length] = binding;
                iter = reg.exec(wgslStr);
            }
        }
        return bindingList;
    }

    function overwriteBlock(info: ShaderInfo, code: string): string {
        const regexp = new RegExp(/layout\(([^\)]+)\)\s+uniform\s+\b(\w+)\b/g);
        let src = code;
        let iter = regexp.exec(src);
        if (iter) {
            const blockName = iter[2];
            const block = info.blocks.find((ele) => { return ele.name === blockName; });
            const binding = block?.binding;
            const overwriteStr = iter[0].replace(iter[1], `${iter[1]}, set = 0, binding = ${binding}`);
            src = src.replace(iter[0], overwriteStr);
            iter = regexp.exec(src);
        }
        return src;
    }

    const createShader = Device.prototype.createShader;
    Device.prototype.createShader = function (shaderInfo: ShaderInfo) {
        const wgslStages: string[] = [];
        const stageSize = shaderInfo.stages.length;
        for (let i = 0; i < stageSize; ++i) {
            let glslSource = seperateCombinedSamplerTexture(shaderInfo.stages[i].source);
            const stageStr = shaderInfo.stages[i].stage === ShaderStageFlagBit.VERTEX ? 'vertex'
                : shaderInfo.stages[i].stage === ShaderStageFlagBit.FRAGMENT ? 'fragment' : 'compute';
            // if (stageStr === 'compute') {
            //     glslSource = overwriteBlock(shaderInfo, glslSource);
            // }
            const sourceCode = `#version 450\n#define CC_USE_WGPU 1\n${glslSource}`;
            const spv = glslangWasmModule.glslang.compileGLSL(sourceCode, stageStr, false, '1.3');

            const twgsl = twgslModule.twgsl;
            const wgsl = twgsl.convertSpirV2WGSL(spv);
            if (wgsl === '') {
                console.error("empty wgsl");
            }
            shaderInfo.stages[i].source = wgsl;
            wgslStages.push(wgsl);
        }

        const shader = this.createShaderNative(shaderInfo);
        // optioanl : reflect bindings in shader
        {
            const bindingList = reflect(wgslStages);
            for (let bindings of bindingList) {
                const u8Array = new Uint8Array(bindings);
                shader.reflectBinding(u8Array);
            }
        }
        return shader;
    };

    // if property being frequently get in TS, try cache it
    // attention: invalid if got this object from a native object,
    // eg. inputAssembler.indexBuffer.objectID
    function cacheReadOnlyWGPUProperties<T>(type: T, props: string[]) {
        const descriptor = { writable: true };
        props.map((prop) => {
            return Object.defineProperty(type['prototype'], `_${prop}`, descriptor);
        });

        // trick for emscripten object only, which contains a `name` indicates what type it is.
        const typename = type['name'].replace('CCWGPU', '');
        const oldCreate = Device.prototype[`create${typename}`];
        Device.prototype[`create${typename}`] = function (info) {
            const res = oldCreate.call(this, info);
            for (let prop of props) {
                res[`_${prop}`] = res[`${prop}`];
                Object.defineProperty(res, `${prop}`, {
                    get() {
                        return this[`_${prop}`];
                    }
                });
            }
            return res;
        }
        const oldInit = type['prototype']['initialize'];
        type['prototype']['initialize'] = function (info) {
            oldInit.call(this, info);
            for (let prop of props) {
                this[`_${prop}`] = this[`${prop}`];
            }
        }
    };

    cacheReadOnlyWGPUProperties(Buffer, ['objectID']);

});
