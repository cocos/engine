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

import {
    ccclass, executeInEditMode, executionOrder, help, menu, type, serializable, editable,
} from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { SkinnedMeshRenderer } from '../skinned-mesh-renderer';
import { Mat4, cclegacy, js, assertIsTrue, warn } from '../../core';
import { DataPoolManager } from './data-pool-manager';
import { Node } from '../../scene-graph/node';
import { AnimationClip } from '../../animation/animation-clip';
import { Animation } from '../../animation/animation-component';
import { SkelAnimDataHub } from './skeletal-animation-data-hub';
import { SkeletalAnimationState } from './skeletal-animation-state';
import { getWorldTransformUntilRoot } from '../../animation/transform-utils';
import type { AnimationState } from '../../animation/animation-state';
import { getGlobalAnimationManager } from '../../animation/global-animation-manager';

const FORCE_BAN_BAKED_ANIMATION = EDITOR_NOT_IN_PREVIEW;

/**
 * @en The socket to synchronize transform from skeletal joint to target node.
 * @zh 骨骼动画的挂点，用于将骨骼树的挂点节点变化矩阵同步到目标节点上
 */
@ccclass('cc.SkeletalAnimation.Socket')
export class Socket {
    /**
     * @en Path of the target joint.
     * @zh 此挂点的目标骨骼路径。
     */
    @serializable
    @editable
    public path = '';

    /**
     * @en Transform output node.
     * @zh 此挂点的变换信息输出节点。
     */
    @type(Node)
    public target: Node | null = null;

    constructor (path = '', target: Node | null = null) {
        this.path = path;
        this.target = target;
    }
}

js.setClassAlias(Socket, 'cc.SkeletalAnimationComponent.Socket');

const m4_1 = new Mat4();
const m4_2 = new Mat4();

function collectRecursively (node: Node, prefix = '', out: string[] = []): string[] {
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) { continue; }
        const path = prefix ? `${prefix}/${child.name}` : child.name;
        out.push(path);
        collectRecursively(child, path, out);
    }
    return out;
}

/**
 * @en
 * Skeletal animation component, offers the following features on top of [[Animation]]:
 * * Choice between baked animation and real-time calculation, to leverage efficiency and expressiveness.
 * * Joint socket system: Create any socket node directly under the animation component root node,
 *   find your target joint and register both to the socket list, so that the socket node would be in-sync with the joint.
 * @zh
 * 骨骼动画组件，在普通动画组件基础上额外提供以下功能：
 * * 可选预烘焙动画模式或实时计算模式，用以权衡运行时效率与效果；
 * * 提供骨骼挂点功能：通过在动画根节点下创建挂点节点，并在骨骼动画组件上配置 socket 列表，挂点节点的 Transform 就能与骨骼保持同步。
 */
@ccclass('cc.SkeletalAnimation')
@help('i18n:cc.SkeletalAnimation')
@executionOrder(99)
@executeInEditMode
@menu('Animation/SkeletalAnimation')
export class SkeletalAnimation extends Animation {
    public static Socket = Socket;

    /**
     * @en
     * The joint sockets this animation component maintains.<br>
     * Sockets have to be registered here before attaching custom nodes to animated joints.
     * @zh
     * 当前动画组件维护的挂点数组。要挂载自定义节点到受动画驱动的骨骼上，必须先在此注册挂点。
     */
    @type([Socket])
    @editable
    get sockets (): Socket[] {
        return this._sockets;
    }

    set sockets (val) {
        if (!this._useBakedEffectively) {
            const animMgr = getGlobalAnimationManager();
            animMgr.removeSockets(this.node, this._sockets);
            animMgr.addSockets(this.node, val);
        }
        this._sockets = val;
        this.rebuildSocketAnimations();
    }

    /**
     * @en
     * Whether to bake animations. Default to true,<br>
     * which substantially increases performance while making all animations completely fixed.<br>
     * Dynamically changing this property will take effect when playing the next animation clip.
     * Note, in editor(not in preview) mode, this option takes no effect: animation is always non-baked.
     * @zh
     * 是否使用预烘焙动画，默认启用，可以大幅提高运行效时率，但所有动画效果会被彻底固定，不支持任何形式的编辑和混合。<br>
     * 运行时动态修改此选项会在播放下一条动画片段时生效。
     * 注意，在编辑器（非预览）模式下，此选项不起作用：动画总是非预烘焙的。
     */
    @editable
    get useBakedAnimation (): boolean {
        return this._useBakedAnimation;
    }

    set useBakedAnimation (value) {
        this._useBakedAnimation = value;
        this._applyBakeFlagChange();
    }

    @serializable
    protected _useBakedAnimation = true;

    @type([Socket])
    protected _sockets: Socket[] = [];

    public onLoad (): void {
        super.onLoad();
        // Actively search for potential users and notify them that an animation is usable.
        const comps = this.node.getComponentsInChildren(SkinnedMeshRenderer);
        for (let i = 0; i < comps.length; ++i) {
            const comp = comps[i];
            if (comp.skinningRoot === this.node) {
                this.notifySkinnedMeshAdded(comp);
            }
        }
    }

    public onDestroy (): void {
        super.onDestroy();
        (cclegacy.director.root.dataPoolManager as DataPoolManager).jointAnimationInfo.destroy(this.node.uuid);
        getGlobalAnimationManager().removeSockets(this.node, this._sockets);
        this._removeAllUsers();
    }

    public onEnable (): void {
        super.onEnable();
        this._currentBakedState?.resume();
    }

    public onDisable (): void {
        super.onDisable();
        this._currentBakedState?.pause();
    }

    public start (): void {
        this.sockets = this._sockets;
        this._applyBakeFlagChange();
        super.start();
    }

    public pause (): void {
        if (!this._useBakedEffectively) {
            super.pause();
        } else {
            this._currentBakedState?.pause();
        }
    }

    public resume (): void {
        if (!this._useBakedEffectively) {
            super.resume();
        } else {
            this._currentBakedState?.resume();
        }
    }

    public stop (): void {
        if (!this._useBakedEffectively) {
            super.stop();
        } else if (this._currentBakedState) {
            this._currentBakedState.stop();
            this._currentBakedState = null;
        }
    }

    /**
     * @en Query all socket paths
     * @zh 获取所有挂点的骨骼路径
     * @returns @en All socket paths @zh 所有挂点的骨骼路径
     */
    public querySockets (): string[] {
        const animPaths = (this._defaultClip && Object.keys(SkelAnimDataHub.getOrExtract(this._defaultClip).joints).sort()
            .reduce((acc, cur): string[] => (cur.startsWith(`${acc[acc.length - 1]}/`) ? acc : (acc.push(cur), acc)), [] as string[])) || [];
        if (!animPaths.length) { return ['please specify a valid default animation clip first']; }
        const out: string[] = [];
        for (let i = 0; i < animPaths.length; i++) {
            const path = animPaths[i];
            const node = this.node.getChildByPath(path);
            if (!node) { continue; }
            out.push(path);
            collectRecursively(node, path, out);
        }
        return out;
    }

    /**
     * @en Rebuild animations to synchronize immediately all sockets to their target node.
     * @zh 重建动画并立即同步所有挂点的转换矩阵到它们的目标节点上。
     */
    public rebuildSocketAnimations (): void {
        this._sockets.forEach((socket) => {
            const joint = this.node.getChildByPath(socket.path);
            const { target } = socket;
            if (joint && target) {
                target.name = `${socket.path.substring(socket.path.lastIndexOf('/') + 1)} Socket`;
                target.parent = this.node;
                getWorldTransformUntilRoot(joint, this.node, m4_1);
                Mat4.fromRTS(m4_2, target.rotation, target.position, target.scale);
                if (!Mat4.equals(m4_2, m4_1)) { target.matrix = m4_1; }
            }
        });
        for (const stateName in this._nameToState) {
            const state = this._nameToState[stateName] as SkeletalAnimationState;
            state.rebuildSocketCurves(this._sockets);
        }
    }

    /**
     * @en Create or get the target node from a socket.
     * If a socket haven't been created for the corresponding path, this function will register a new socket.
     * @zh 创建或获取一个挂点的同步目标节点。
     * 如果对应路径还没有创建挂点，这个函数会创建一个新的挂点。
     * @param path @en Path of the target joint. @zh 此挂点的骨骼路径。
     * @returns @en The target node of the socket. @zh 挂点的目标节点
     */
    public createSocket (path: string): Node | null {
        const socket = this._sockets.find((s) => s.path === path);
        if (socket) { return socket.target; }
        const joint = this.node.getChildByPath(path);
        if (!joint) { warn('illegal socket path'); return null; }
        const target = new Node();
        target.parent = this.node;
        this._sockets.push(new Socket(path, target));
        this.rebuildSocketAnimations();
        return target;
    }

    /**
     * @internal This method only friends to skinned mesh renderer.
     */
    public notifySkinnedMeshAdded (skinnedMeshRenderer: SkinnedMeshRenderer): void {
        const { _useBakedEffectively } = this;
        const formerBound = skinnedMeshRenderer.associatedAnimation;
        if (formerBound) {
            formerBound._users.delete(skinnedMeshRenderer);
        }
        skinnedMeshRenderer.associatedAnimation = this;
        skinnedMeshRenderer.setUseBakedAnimation(_useBakedEffectively, true);
        if (_useBakedEffectively) {
            const { _currentBakedState: playingState } = this;
            if (playingState) {
                skinnedMeshRenderer.uploadAnimation(playingState.clip);
            }
        }
        this._users.add(skinnedMeshRenderer);
    }

    /**
     * @internal This method only friends to skinned mesh renderer.
     */
    public notifySkinnedMeshRemoved (skinnedMeshRenderer: SkinnedMeshRenderer): void {
        assertIsTrue(skinnedMeshRenderer.associatedAnimation === this || skinnedMeshRenderer.associatedAnimation === null);
        skinnedMeshRenderer.setUseBakedAnimation(false);
        skinnedMeshRenderer.associatedAnimation = null;
        this._users.delete(skinnedMeshRenderer);
    }

    /**
     * Get all users.
     * @internal This method only friends to the skeleton animation state.
     */
    public getUsers (): Set<SkinnedMeshRenderer> {
        return this._users;
    }

    protected _createState (clip: AnimationClip, name?: string): SkeletalAnimationState {
        return new SkeletalAnimationState(clip, name);
    }

    protected _doCreateState (clip: AnimationClip, name: string): SkeletalAnimationState {
        const state = super._doCreateState(clip, name) as SkeletalAnimationState;
        state.rebuildSocketCurves(this._sockets);
        return state;
    }

    protected doPlayOrCrossFade (state: AnimationState, duration: number): void {
        if (this._useBakedEffectively) {
            if (this._currentBakedState) {
                this._currentBakedState.stop();
            }
            const skeletalAnimationState = state as SkeletalAnimationState;
            this._currentBakedState = skeletalAnimationState;
            skeletalAnimationState.play();
        } else {
            super.doPlayOrCrossFade(state, duration);
        }
    }

    private _users = new Set<SkinnedMeshRenderer>();

    private _currentBakedState: SkeletalAnimationState | null = null;

    private _removeAllUsers (): void {
        Array.from(this._users).forEach((user) => {
            this.notifySkinnedMeshRemoved(user);
        });
    }

    private get _useBakedEffectively (): boolean {
        if (FORCE_BAN_BAKED_ANIMATION) {
            return false;
        } else {
            return this._useBakedAnimation;
        }
    }

    private _applyBakeFlagChange (): void {
        const useBakedEffectively = this._useBakedEffectively;

        for (const stateName in this._nameToState) {
            const state = this._nameToState[stateName] as SkeletalAnimationState;
            state.setUseBaked(useBakedEffectively);
        }

        this._users.forEach((user) => {
            user.setUseBakedAnimation(useBakedEffectively);
        });

        if (useBakedEffectively) {
            getGlobalAnimationManager().removeSockets(this.node, this._sockets);
        } else {
            getGlobalAnimationManager().addSockets(this.node, this._sockets);
            this._currentBakedState = null;
        }
    }
}
