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

import { ccclass } from 'cc.decorator';
import { System, errorID, cclegacy, js, SystemPriority } from '../core';
import { director, DirectorEvent } from '../game/director';
import { Node } from '../scene-graph';
import { LegacyBlendStateBuffer } from '../3d/skeletal-animation/skeletal-animation-blending';
import { AnimationState } from './animation-state';
import type { CrossFade } from './cross-fade';
import { IJointTransform, deleteTransform, getTransform, getWorldMatrix } from './skeletal-animation-utils';
import { Socket } from '../3d/skeletal-animation/skeletal-animation';

interface ISocketData {
    target: Node;
    transform: IJointTransform;
}

@ccclass
export class AnimationManager extends System {
    public get blendState (): LegacyBlendStateBuffer {
        return this._blendStateBuffer;
    }

    public static ID = 'animation';
    private _anims = new js.array.MutableForwardIterator<AnimationState>([]);
    private _crossFades = new js.array.MutableForwardIterator<CrossFade>([]);
    private _delayEvents: {
        fn: (...args: any[]) => void;
        thisArg: any;
        args: any[];
    }[] = [];
    private _blendStateBuffer: LegacyBlendStateBuffer = new LegacyBlendStateBuffer();
    private _sockets: ISocketData[] = [];

    public addCrossFade (crossFade: CrossFade): void {
        const index = this._crossFades.array.indexOf(crossFade);
        if (index === -1) {
            this._crossFades.push(crossFade);
        }
    }

    public removeCrossFade (crossFade: CrossFade): void {
        const index = this._crossFades.array.indexOf(crossFade);
        if (index >= 0) {
            this._crossFades.fastRemoveAt(index);
        } else {
            errorID(3907);
        }
    }

    public update (dt: number): void {
        const { _delayEvents, _crossFades: crossFadesIter, _sockets } = this;

        { // Update cross fades
            const crossFades = crossFadesIter.array;
            for (crossFadesIter.i = 0; crossFadesIter.i < crossFades.length; ++crossFadesIter.i) {
                const crossFade = crossFades[crossFadesIter.i];
                crossFade.update(dt);
            }
        }

        const iterator = this._anims;
        const array = iterator.array;
        for (iterator.i = 0; iterator.i < array.length; ++iterator.i) {
            const anim = array[iterator.i];
            if (!anim.isMotionless) {
                anim.update(dt);
            }
        }
        this._blendStateBuffer.apply();

        const stamp = director.getTotalFrames();
        for (let i = 0, l = _sockets.length; i < l; i++) {
            const { target, transform } = _sockets[i];
            target.matrix = getWorldMatrix(transform, stamp);
        }

        for (let i = 0, l = _delayEvents.length; i < l; i++) {
            const event = _delayEvents[i];
            event.fn.apply(event.thisArg, event.args);
        }
        _delayEvents.length = 0;
    }

    public destruct (): void {

    }

    public addAnimation (anim: AnimationState): void {
        const index = this._anims.array.indexOf(anim);
        if (index === -1) {
            this._anims.push(anim);
        }
    }

    public removeAnimation (anim: AnimationState): void {
        const index = this._anims.array.indexOf(anim);
        if (index >= 0) {
            this._anims.fastRemoveAt(index);
        } else {
            errorID(3907);
        }
    }

    public pushDelayEvent (fn: (...args: any[]) => void, thisArg: any, args: any[]): void {
        this._delayEvents.push({
            fn,
            thisArg,
            args,
        });
    }

    public addSockets (root: Node, sockets: Socket[]): void {
        for (let i = 0; i < sockets.length; ++i) {
            const socket = sockets[i];
            if (this._sockets.find((s) => s.target === socket.target)) { continue; }
            const targetNode = root.getChildByPath(socket.path);
            const transform = socket.target && targetNode && getTransform(targetNode, root);
            if (transform) {
                this._sockets.push({ target: socket.target!, transform });
            }
        }
    }

    public removeSockets (root: Node, sockets: Socket[]): void {
        for (let i = 0; i < sockets.length; ++i) {
            const socketToRemove = sockets[i];
            for (let j = 0; j < this._sockets.length; ++j) {
                const socket = this._sockets[j];
                if (socket.target ===  socketToRemove.target) {
                    deleteTransform(socket.transform.node);
                    this._sockets[j] = this._sockets[this._sockets.length - 1];
                    this._sockets.length--;
                    break;
                }
            }
        }
    }
}

director.on(DirectorEvent.INIT, (): void => {
    const animationManager = new AnimationManager();
    director.registerSystem(AnimationManager.ID, animationManager, SystemPriority.HIGH);
});

cclegacy.AnimationManager = AnimationManager;
