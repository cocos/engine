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

import { AnimationClip } from '../../animation/animation-clip';
import { Skeleton } from '../../assets/skeleton';
import { aabb } from '../../geom-utils';
import { GFXBuffer } from '../../gfx/buffer';
import { GFXBufferUsageBit, GFXMemoryUsageBit } from '../../gfx/define';
import { Vec3 } from '../../math';
import { UBOSkinningAnimation, UBOSkinningTexture, UniformJointsTexture } from '../../pipeline/define';
import { INode } from '../../utils/interfaces';
import { Pass } from '../core/pass';
import { samplerLib } from '../core/sampler-lib';
import { Model } from '../scene/model';
import { RenderScene } from '../scene/render-scene';
import { AnimatedBoundsInfo, IAnimInfo, IJointsTextureHandle,
    JointsAnimationInfo, jointsTextureSamplerHash, selectJointsMediumType } from './skeletal-animation-utils';

interface IJointsInfo {
    buffer: GFXBuffer | null;
    jointsTextureInfo: Float32Array;
    texture: IJointsTextureHandle | null;
    animInfo: IAnimInfo | null;
    boundsInfo: aabb[] | null;
}

export class SkinningModel extends Model {

    public uploadedAnim: AnimationClip | null = null;

    private _jointsMedium: IJointsInfo;
    private _skeleton: Skeleton | null = null;
    private _staticModelBounds: aabb | null = null;
    private _boundOffset = new Vec3();
    private _boundScale = new Vec3(1, 1, 1);
    private _tmpModelBounds = new aabb();

    constructor (scene: RenderScene, node: INode) {
        super(scene, node);
        this._type = 'skinning';
        const jointsTextureInfo = new Float32Array(4);
        const texture = this._scene.texturePool.getDefaultJointsTexture();
        this._jointsMedium = { buffer: null, jointsTextureInfo, texture, animInfo: null, boundsInfo: null };
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
        this._jointsMedium.animInfo = JointsAnimationInfo.get(skinningRoot.uuid);
        if (!this._jointsMedium.buffer) {
            this._jointsMedium.buffer = this._device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOSkinningTexture.SIZE,
                stride: UBOSkinningTexture.SIZE,
            });
        }
        this._updateBoundMapping();
    }

    public updateTransform () {
        super.updateTransform();
        if (!this.uploadedAnim) { return; }
        const { animInfo, boundsInfo } = this._jointsMedium;
        const skelBound = boundsInfo![animInfo!.data[1]];
        Vec3.add(this._tmpModelBounds.center, skelBound.center, this._boundOffset);
        Vec3.multiply(this._tmpModelBounds.halfExtents, skelBound.halfExtents, this._boundScale);
        const node = this._transform;
        if (this._worldBounds) { // just do it every frame
            // @ts-ignore TS2339
            skelBound.transform(node._mat, node._pos, node._rot, node._scale, this._worldBounds);
        }
    }

    // update fid buffer only when visible
    public updateUBOs () {
        if (!super.updateUBOs()) { return false; }
        const info = this._jointsMedium.animInfo!;
        if (info.dirty) { info.buffer.update(info.data); info.dirty = false; }
        return true;
    }

    public createBoundingShape (minPos?: Vec3, maxPos?: Vec3) {
        super.createBoundingShape(minPos, maxPos);
        this._staticModelBounds = this._modelBounds && aabb.clone(this._modelBounds);
        this._updateBoundMapping();
    }

    public uploadAnimation (anim: AnimationClip | null) {
        if (!this._skeleton) { return; }
        this.uploadedAnim = anim;
        const texture = anim ? this._scene.texturePool.getJointsTextureWithAnimation(this._skeleton, anim) :
            this._scene.texturePool.getDefaultJointsTexture(this._skeleton);
        JointsAnimationInfo.switchClip(this._jointsMedium.animInfo!, anim);
        this._applyJointsTexture(texture);
        this._jointsMedium.boundsInfo = anim ? AnimatedBoundsInfo.get(this._skeleton, anim) : null;
        this._modelBounds = anim ? this._staticModelBounds : null; // don't calc bounds again in Model
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
        jointsTextureInfo[1] = 1 / jointsTextureInfo[0];
        jointsTextureInfo[2] = texture.pixelOffset + 0.1; // guard against floor() underflow
        if (buffer) { buffer.update(jointsTextureInfo); }
        const sampler = samplerLib.getSampler(this._device, jointsTextureSamplerHash);
        for (const submodel of this._subModels) {
            if (!submodel.psos) { continue; }
            for (const pso of submodel.psos) {
                const bindingLayout = pso.pipelineLayout.layouts[0];
                bindingLayout.bindTextureView(UniformJointsTexture.binding, texture.handle.texView);
                bindingLayout.bindSampler(UniformJointsTexture.binding, sampler);
            }
        }
        for (const pso of this._implantPSOs) {
            const bindingLayout = pso.pipelineLayout.layouts[0];
            bindingLayout.bindTextureView(UniformJointsTexture.binding, texture.handle.texView);
            bindingLayout.bindSampler(UniformJointsTexture.binding, sampler);
            bindingLayout.update();
        }
    }

    protected _doCreatePSO (pass: Pass) {
        const pso = super._doCreatePSO(pass, { CC_USE_SKINNING: selectJointsMediumType(this._device) });
        const { buffer, texture, animInfo } = this._jointsMedium;
        const bindingLayout = pso.pipelineLayout.layouts[0];
        bindingLayout.bindBuffer(UBOSkinningTexture.BLOCK.binding, buffer!);
        bindingLayout.bindBuffer(UBOSkinningAnimation.BLOCK.binding, animInfo!.buffer);
        const sampler = samplerLib.getSampler(this._device, jointsTextureSamplerHash);
        if (texture) {
            bindingLayout.bindTextureView(UniformJointsTexture.binding, texture.handle.texView);
            bindingLayout.bindSampler(UniformJointsTexture.binding, sampler);
        }
        return pso;
    }

    protected _updateBoundMapping () {
        if (!this._staticModelBounds || !this._skeleton) { return; }
        const skelBound = this._skeleton.bounds;
        const meshBound = this._staticModelBounds;
        // Vec3.subtract(this._boundOffset, meshBound.center, skelBound.center);
        Vec3.divide(this._boundScale, meshBound.halfExtents, skelBound.halfExtents);
        Vec3.max(this._boundScale, this._boundScale, Vec3.ONE);
    }
}
