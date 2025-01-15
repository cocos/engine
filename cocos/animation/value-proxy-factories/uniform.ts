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

import { ccclass, float, serializable } from 'cc.decorator';
import { builtinResMgr } from '../../asset/asset-manager';
import { Material } from '../../asset/assets/material';
import { SpriteFrame } from '../../2d/assets/sprite-frame';
import { TextureBase } from '../../asset/assets/texture-base';
import { deviceManager, Type } from '../../gfx';
import { Pass } from '../../render-scene/core/pass';
import { getBindingFromHandle, getDefaultFromType, getStringFromType, getTypeFromHandle, MaterialProperty } from '../../render-scene/core/pass-utils';
import { IValueProxy, IValueProxyFactory } from '../value-proxy';
import { warn, warnID } from '../../core';

/**
 * @en
 * Value proxy factory for setting uniform on material target.
 * @zh
 * 用于设置材质目标上指定 Uniform 的曲线值代理工厂。
 */
@ccclass('cc.animation.UniformProxyFactory')
export class UniformProxyFactory implements IValueProxyFactory {
    /**
     * @en Pass index.
     * @zh Pass 索引。
     */
    @serializable
    public passIndex = 0;

    /**
     * @en Uniform name.
     * @zh Uniform 名称。
     */
    @serializable
    public uniformName = '';

    /**
     * @en
     * Specify the aimed channel of the uniform.
     * Use this when you're aiming at a single channel of the uniform instead of who uniform.
     * For example, only green(1) channel of a color uniform.
     * @zh
     * 指定目标 Uniform 的通道。
     * 当你希望设置 Uniform 单独的通道而非整个 Uniform 时应该当使用此字段。
     * 例如，仅设置颜色 Uniform 的红色通道。
     */
    @float
    public channelIndex: number | undefined = undefined;

    constructor (uniformName?: string, passIndex?: number) {
        this.passIndex = passIndex || 0;
        this.uniformName = uniformName || '';
    }

    public forTarget (target: unknown): IValueProxy | undefined {
        if (!(target instanceof Material)) {
            warnID(3940, target as string);
            return undefined;
        }

        const {
            passIndex,
            uniformName,
            channelIndex,
        } = this;

        if (passIndex < 0 || passIndex >= target.passes.length) {
            warnID(3941, target.name, passIndex);
            return undefined;
        }

        const pass = target.passes[passIndex];
        const handle = pass.getHandle(uniformName);
        if (!handle) {
            warnID(3942, target.name, passIndex, uniformName);
            return undefined;
        }

        const type = getTypeFromHandle(handle);
        if (type < Type.SAMPLER1D) {
            const realHandle = channelIndex === undefined ? handle : pass.getHandle(uniformName, channelIndex, Type.FLOAT);
            if (!realHandle) {
                warnID(3943, target.name, passIndex, uniformName, channelIndex!);
                return undefined;
            }
            if (isUniformArray(pass, uniformName)) {
                return {
                    set: (value: MaterialProperty[]): void => {
                        pass.setUniformArray(realHandle, value);
                    },
                };
            }
            return {
                set: (value: MaterialProperty): void => {
                    pass.setUniform(realHandle, value);
                },
            };
        } else {
            const binding = getBindingFromHandle(handle);
            const prop = pass.properties[uniformName];
            const texName = prop && prop.value ? `${prop.value as string}${getStringFromType(prop.type)}` : getDefaultFromType(prop.type) as string;
            let dftTex = builtinResMgr.get<TextureBase>(texName);
            if (!dftTex) {
                warn(`Illegal texture default value: ${texName}.`);
                dftTex = builtinResMgr.get<TextureBase>('default-texture');
            }
            return {
                set: (value: TextureBase | SpriteFrame): void => {
                    if (!value) { value = dftTex; }
                    const texture = value.getGFXTexture();
                    if (!texture || !texture.width || !texture.height) { return; }
                    pass.bindTexture(binding, texture);
                    if (value instanceof TextureBase) {
                        pass.bindSampler(binding, deviceManager.gfxDevice.getSampler(value.getSamplerInfo()));
                    }
                },
            };
        }
    }
}

function isUniformArray (pass: Pass, name: string): boolean {
    for (const block of pass.shaderInfo.blocks) {
        for (const uniform of block.members) {
            if (uniform.name === name) {
                return uniform.count > 1;
            }
        }
    }
    return false;
}
