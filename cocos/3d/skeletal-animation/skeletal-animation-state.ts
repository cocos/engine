/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { JSB } from 'internal:constants';
import { Mat4, Quat, Vec3, cclegacy } from '../../core';
import { IAnimInfo, JointAnimationInfo } from './skeletal-animation-utils';
import { Node } from '../../scene-graph/node';
import type { AnimationClip } from '../../animation/animation-clip';
import { AnimationState } from '../../animation/animation-state';
import { SkeletalAnimation, Socket } from './skeletal-animation';
import { SkelAnimDataHub } from './skeletal-animation-data-hub';

const m4_1 = new Mat4();
const m4_2 = new Mat4();

interface ITransform {
    pos: Vec3;
    rot: Quat;
    scale: Vec3;
}

interface ISocketData {
    target: Node;
    frames: ITransform[];
}

/**
 * @en The animation state for skeletal animations.
 * @zh 骨骼动画的动画状态控制对象。
 */
export class SkeletalAnimationState extends AnimationState {
    protected _frames = 1;

    protected _bakedDuration = 0;

    protected _animInfo: IAnimInfo | null = null;

    protected _sockets: ISocketData[] = [];

    protected _animInfoMgr: JointAnimationInfo;

    protected _parent: SkeletalAnimation | null = null;

    protected _curvesInited = false;

    constructor (clip: AnimationClip, name = '') {
        super(clip, name);
        this._animInfoMgr = cclegacy.director.root.dataPoolManager.jointAnimationInfo;
    }

    public initialize (root: Node): void {
        if (this._curveLoaded) { return; }
        this._parent = root.getComponent('cc.SkeletalAnimation') as SkeletalAnimation;
        const baked = this._parent.useBakedAnimation;
        this._doNotCreateEval = baked;
        super.initialize(root);
        this._curvesInited = !baked;
        const { frames, samples } = SkelAnimDataHub.getOrExtract(this.clip);
        this._frames = frames - 1;
        this._animInfo = this._animInfoMgr.getData(root.uuid);
        this._bakedDuration = this._frames / samples; // last key
        this.setUseBaked(baked);
    }

    protected onPlay (): void {
        super.onPlay();
        const baked = this._parent!.useBakedAnimation;
        if (baked) {
            this._animInfoMgr.switchClip(this._animInfo!, this.clip);
            const users = this._parent!.getUsers();
            users.forEach((user) => {
                user.uploadAnimation(this.clip);
            });
        }
    }

    /**
     * @internal This method only friends to `SkeletalAnimation`.
     */
    public setUseBaked (useBaked: boolean): void {
        if (useBaked) {
            this._sampleCurves = this._sampleCurvesBaked;
            this.duration = this._bakedDuration;
        } else {
            this._sampleCurves = super._sampleCurves;
            this.duration = this.clip.duration;
            if (!this._curvesInited) {
                this._curveLoaded = false;
                super.initialize(this._targetNode!);
                this._curvesInited = true;
            }
        }
    }

    /**
     * @en Rebuild animation curves and register the socket transforms per frame to the sockets. It will replace the internal sockets list.
     * @zh 为所有指定挂点更新动画曲线运算结果，并存储所有挂点的逐帧变换矩阵。这个方法会用传入的挂点更新取代内部挂点列表。
     * @param sockets @en The sockets need update @zh 需要重建的挂点列表
     * @returns void
     */
    public rebuildSocketCurves (sockets: Socket[]): void {
        this._sockets.length = 0;
        if (!this._targetNode) { return; }
        const root = this._targetNode;
        for (let i = 0; i < sockets.length; ++i) {
            const socket = sockets[i];
            const targetNode = root.getChildByPath(socket.path);
            if (!socket.target) { continue; }
            const clipData = SkelAnimDataHub.getOrExtract(this.clip);
            let animPath = socket.path;
            let source = clipData.joints[animPath];
            let animNode = targetNode;
            let downstream: Mat4 | undefined;
            while (!source) {
                const idx = animPath.lastIndexOf('/');
                animPath = animPath.substring(0, idx);
                source = clipData.joints[animPath];
                if (animNode) {
                    if (!downstream) { downstream = Mat4.identity(m4_2); }
                    Mat4.fromRTS(m4_1, animNode.rotation, animNode.position, animNode.scale);
                    Mat4.multiply(downstream, m4_1, downstream);
                    animNode = animNode.parent;
                }
                if (idx < 0) { break; }
            }
            const curveData: Mat4[] | undefined = source && source.transforms;
            const { frames } = clipData;
            const transforms: ITransform[] = [];
            for (let f = 0; f < frames; f++) {
                let mat: Mat4;
                if (curveData && downstream) { // curve & static two-way combination
                    mat = Mat4.multiply(m4_1, curveData[f], downstream);
                } else if (curveData) { // there is a curve directly controlling the joint
                    mat = curveData[f];
                } else if (downstream) { // fallback to default pose if no animation curve can be found upstream
                    mat = downstream;
                } else { // bottom line: render the original mesh as-is
                    mat = new Mat4();
                }
                const tfm = { pos: new Vec3(), rot: new Quat(), scale: new Vec3() };
                Mat4.toSRT(mat, tfm.rot, tfm.pos, tfm.scale);
                transforms.push(tfm);
            }
            this._sockets.push({
                target: socket.target,
                frames: transforms,
            });
        }
    }

    private _sampleCurvesBaked (time: number): void {
        const ratio = time / this.duration;
        const info = this._animInfo!;
        const clip = this.clip;

        // Ensure I'm the one on which the anim info is sampling.
        if (info.currentClip !== clip) {
            // If not, switch to me.
            this._animInfoMgr.switchClip(this._animInfo!, clip);

            const users = this._parent!.getUsers();
            users.forEach((user) => {
                user.uploadAnimation(clip);
            });
            info.data[0] = -1; // reset frame index to -1. sampleCurves will calculate frame to 0.
        }

        const curFrame = (ratio * this._frames + 0.5) | 0;
        if (curFrame === info.data[0]) { return; }
        info.data[0] = curFrame;
        info.dirty = true;
        if (JSB) {
            info.dirtyForJSB[0] = 1;
        }
        for (let i = 0; i < this._sockets.length; ++i) {
            const { target, frames } = this._sockets[i];
            const { pos, rot, scale } = frames[curFrame]; // ratio guaranteed to be in [0, 1]
            target.setRTS(rot, pos, scale);
        }
    }
}
