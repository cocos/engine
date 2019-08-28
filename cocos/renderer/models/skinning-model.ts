/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @hidden
 */

import { Skeleton } from '../../3d/assets/skeleton';
import { SkeletalAnimationClip } from '../../animation';
import { INode } from '../../core/utils/interfaces';
import { GFXBuffer } from '../../gfx/buffer';
import { GFXAddress, GFXBufferUsageBit, GFXFilter, GFXMemoryUsageBit } from '../../gfx/define';
import { UBOSkinningTexture, UNIFORM_JOINTS_TEXTURE } from '../../pipeline/define';
import { Pass } from '../core/pass';
import { genSamplerHash, samplerLib } from '../core/sampler-lib';
import { Model } from '../scene/model';
import { RenderScene } from '../scene/render-scene';
import { IJointsTextureHandle } from './joints-texture-utils';

const jointsTextureSamplerHash = genSamplerHash([
    GFXFilter.POINT,
    GFXFilter.POINT,
    GFXFilter.NONE,
    GFXAddress.CLAMP,
    GFXAddress.CLAMP,
    GFXAddress.CLAMP,
]);

interface IJointsInfo {
    buffer: GFXBuffer | null;
    jointsTextureInfo: Float32Array;
    texture: IJointsTextureHandle | null;
}

export class SkinningModel extends Model {

    public uploadedAnim: SkeletalAnimationClip | null = null;

    private _jointsMedium: IJointsInfo;
    private _skeleton: Skeleton | null = null;

    get worldBounds () {
        return this.uploadedAnim ? null : this._worldBounds;
    }

    constructor (scene: RenderScene, node: INode) {
        super(scene, node);
        this._type = 'skinning';
        const jointsTextureInfo = new Float32Array(4);
        const texture = this._scene.texturePool.getDefaultJointsTexture();
        this._jointsMedium = { buffer: null, jointsTextureInfo, texture };
    }

    public destroy () {
        super.destroy();
        if (this._jointsMedium.buffer) {
            this._jointsMedium.buffer.destroy();
            this._jointsMedium.buffer = null;
        }
    }

    public bindSkeleton (skeleton: Skeleton | null, skinningRoot: INode | null) {
        this._skeleton = skeleton;
        if (!skeleton || !skinningRoot) { return; }
        this._transform = skinningRoot;
        if (!this._jointsMedium.buffer) {
            this._jointsMedium.buffer = this._device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOSkinningTexture.SIZE,
                stride: UBOSkinningTexture.SIZE,
            });
        }
        this.uploadAnimation(this.uploadedAnim);
    }

    public uploadAnimation (anim: SkeletalAnimationClip | null = null) {
        if (!this._skeleton) { return; }
        this.uploadedAnim = anim;
        const texture = this.uploadedAnim ?
        this._scene.texturePool.getJointsTextureWithAnimation(this._skeleton, this.uploadedAnim) :
            this._scene.texturePool.getDefaultJointsTexture(this._skeleton);
        this._applyJointsTexture(texture);
    }

    public setFrameID (val: number) {
        this._jointsMedium.jointsTextureInfo[3] = val;
    }

    public getFrameID () {
        return this._jointsMedium.jointsTextureInfo[3];
    }

    public updateUBOs () {
        if (!super.updateUBOs()) { return false; }
        const { buffer, jointsTextureInfo } = this._jointsMedium;
        if (buffer) { buffer.update(jointsTextureInfo); }
        return true;
    }

    protected _applyJointsTexture (texture: IJointsTextureHandle | null) {
        if (!texture) { return; }
        // we skip freeing the joints texture by default as an aggressive caching strategy
        // toggle the following when memory usage becomes more important than stable performance
        // const oldTex = this._jointsMedium.texture;
        // if (oldTex && oldTex !== texture) { this._scene.texturePool.releaseTexture(oldTex); }
        this._jointsMedium.texture = texture;
        const { buffer, jointsTextureInfo } = this._jointsMedium;
        jointsTextureInfo[0] = texture.handle.texture.width;
        jointsTextureInfo[1] = texture.pixelOffset + 0.1; // guard against floor() underflow
        jointsTextureInfo[2] = this.uploadedAnim ? this.uploadedAnim.keys[0].length : 1;
        jointsTextureInfo[3] = 0; // restore fid
        if (buffer) { buffer.update(jointsTextureInfo); }
        const sampler = samplerLib.getSampler(this._device, jointsTextureSamplerHash);
        for (const submodel of this._subModels) {
            if (!submodel.psos) { continue; }
            for (const pso of submodel.psos) {
                pso.pipelineLayout.layouts[0].bindTextureView(UNIFORM_JOINTS_TEXTURE.binding, texture.handle.texView);
                pso.pipelineLayout.layouts[0].bindSampler(UNIFORM_JOINTS_TEXTURE.binding, sampler);
            }
        }
    }

    protected _doCreatePSO (pass: Pass) {
        const pso = super._doCreatePSO(pass);
        const { buffer, texture } = this._jointsMedium;
        pso.pipelineLayout.layouts[0].bindBuffer(UBOSkinningTexture.BLOCK.binding, buffer!);
        const sampler = samplerLib.getSampler(this._device, jointsTextureSamplerHash);
        if (texture) {
            pso.pipelineLayout.layouts[0].bindTextureView(UNIFORM_JOINTS_TEXTURE.binding, texture.handle.texView);
            pso.pipelineLayout.layouts[0].bindSampler(UNIFORM_JOINTS_TEXTURE.binding, sampler);
        }
        return pso;
    }
}
