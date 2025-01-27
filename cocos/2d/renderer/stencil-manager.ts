/*
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

import { ComparisonFunc, StencilOp, DepthStencilState } from '../../gfx';
import { Material } from '../../asset/assets';
import { UIRenderer } from '../framework/ui-renderer';
import { UIMeshRenderer } from '../components/ui-mesh-renderer';

/**
 * @en Stencil stage types enum.
 * @zh 模板状态类型枚举。
 * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export enum Stage {
    // Stencil disabled
    DISABLED = 0,
    // Clear stencil buffer
    CLEAR = 1,
    // Entering a new level, should handle new stencil
    ENTER_LEVEL = 2,
    // In content
    ENABLED = 3,
    // Exiting a level, should restore old stencil or disable
    EXIT_LEVEL = 4,
    // Clear stencil buffer & USE INVERTED
    CLEAR_INVERTED = 5,
    // Entering a new level & USE INVERTED
    ENTER_LEVEL_INVERTED = 6,
}

/**
 * @en Native stencil buffer format enum.
 * @zh 原生模板缓冲格式枚举。
 * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export enum StencilSharedBufferView {
    stencilTest,
    func,
    stencilMask,
    writeMask,
    failOp,
    zFailOp,
    passOp,
    ref,
    count,
}

/** @mangle */
interface StencilPattern {
    stencilTest: boolean;
    func: ComparisonFunc;
    stencilMask: number;
    writeMask: number;
    failOp: StencilOp;
    zFailOp: StencilOp;
    passOp: StencilOp;
    ref: number;
}

/**
 * @en Stencil state manager.
 * @zh 模板状态管理器。
 * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export class StencilManager {
    public static sharedManager: StencilManager | null = null;
    private _maskStack: number[] = [];
    private _stencilPattern: StencilPattern = {
        stencilTest: true,
        func: ComparisonFunc.ALWAYS,
        stencilMask: 0xffff,
        writeMask: 0xffff,
        failOp: StencilOp.KEEP,
        zFailOp: StencilOp.KEEP,
        passOp: StencilOp.KEEP,
        ref: 1,
    };

    private _stage: Stage = Stage.DISABLED;
    /**
     * @en Stencil stage.
     * @zh 模板缓冲阶段。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get stage (): Stage {
        return this._stage;
    }
    set stage (val: Stage) {
        this._stage = val;
    }

    /**
     * @en Stencil pattern.
     * @zh 模板缓冲样式。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get pattern (): {
        stencilTest: boolean;
        func: ComparisonFunc;
        stencilMask: number;
        writeMask: number;
        failOp: StencilOp;
        zFailOp: StencilOp;
        passOp: StencilOp;
        ref: number;
        } {
        return this._stencilPattern;
    }

    /**
     * @en Add mask nesting.
     * @zh 添加mask嵌套。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public pushMask (mask: number): void {
        this._maskStack.push(mask);
    }

    /**
     * @en clear stencil stage.
     * @zh 清空模板状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public clear (comp: UIRenderer | UIMeshRenderer): Stage {
        const isInverted = (comp.stencilStage !== Stage.ENTER_LEVEL);
        return isInverted ? Stage.CLEAR_INVERTED : Stage.CLEAR;
    }

    /**
     * @en Open stencil stage to enabled.
     * @zh 开启模板状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public enableMask (): void {
        this.stage = Stage.ENABLED;
    }

    /**
     * @en exit stencil.
     * @zh 退出模板状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public exitMask (): void {
        if (this._maskStack.length === 0) {
            // cc.errorID(9001);
            return;
        }
        this._maskStack.pop();
        if (this._maskStack.length === 0) {
            this.stage = Stage.DISABLED;
        } else {
            this.stage = Stage.ENABLED;
        }
    }

    /**
     * @en Get write mask count.
     * @zh 获取写入模板缓冲的位数。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public getWriteMask (): number {
        return 1 << (this._maskStack.length - 1);
    }

    /**
     * @en Get write mask count when exit.
     * @zh 获取退出时模板缓冲的位数。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public getExitWriteMask (): number {
        return 1 << this._maskStack.length;
    }

    private getStencilRef (): number {
        let result = 0;
        for (let i = 0; i < this._maskStack.length; ++i) {
            result += (0x00000001 << i);
        }
        return result;
    }

    /**
     * @en Get mask nesting count.
     * @zh 获取mask嵌套数量。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public getMaskStackSize (): number {
        return this._maskStack.length;
    }

    /**
     * @en Reset stencil stage.
     * @zh 重置模板状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public reset (): void {
        // reset stack and stage
        this._maskStack.length = 0;
        this.stage = Stage.DISABLED;
    }

    public destroy (): void {
        this.stencilStateMap.forEach((value, key) => {
            value.destroy();
        });
        this.stencilStateMap.clear();
    }

    private stencilStateMap = new Map<number, DepthStencilState>();
    private stencilStateMapWithDepth = new Map<number, DepthStencilState>();

    /**
     * @en Get stencil stage.
     * @zh 获取模板状态。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public getStencilStage (stage: Stage, mat?: Material): DepthStencilState {
        let key = 0;
        let depthTest = false;
        let depthWrite = false;
        let depthFunc = ComparisonFunc.LESS;
        let cacheMap = this.stencilStateMap;
        if (mat && mat.passes[0]) {
            const pass = mat.passes[0];
            const dss = pass.depthStencilState;
            let depthTestValue = 0;
            let depthWriteValue = 0;
            if (dss.depthTest) depthTestValue = 1;
            if (dss.depthWrite) depthWriteValue = 1;
            key = (depthTestValue) | (depthWriteValue << 1) | ((dss.depthFunc as number) << 2) | ((stage as number) << 6) | (this._maskStack.length << 9);
            depthTest = dss.depthTest;
            depthWrite = dss.depthWrite;
            depthFunc = dss.depthFunc;
            cacheMap = this.stencilStateMapWithDepth;
        } else {
            key = ((stage as number) << 16) | this._maskStack.length;
        }
        if (cacheMap && cacheMap.has(key)) {
            return cacheMap.get(key) as DepthStencilState;
        }
        this.setStateFromStage(stage);
        const stencilPattern = this._stencilPattern;
        const depthStencilState = new DepthStencilState(
            depthTest,
            depthWrite,
            depthFunc,
            stencilPattern.stencilTest,
            stencilPattern.func,
            stencilPattern.stencilMask,
            stencilPattern.writeMask,
            stencilPattern.failOp,
            stencilPattern.zFailOp,
            stencilPattern.passOp,
            stencilPattern.ref,
            stencilPattern.stencilTest,
            stencilPattern.func,
            stencilPattern.stencilMask,
            stencilPattern.writeMask,
            stencilPattern.failOp,
            stencilPattern.zFailOp,
            stencilPattern.passOp,
            stencilPattern.ref,
        );
        cacheMap.set(key, depthStencilState);
        return depthStencilState;
    }

    /**
     * @en Get stencil hash.
     * @zh 获取模板状态的哈希值。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public getStencilHash (stage: Stage): number {
        return (stage << 8) | this._maskStack.length;
    }

    // Notice: Only children node in Mask need use this.stage
    private setStateFromStage (stage: Stage): void {
        const pattern = this._stencilPattern;
        if (stage === Stage.DISABLED) {
            pattern.stencilTest = false;
            pattern.func = ComparisonFunc.ALWAYS;
            pattern.failOp = StencilOp.KEEP;
            pattern.stencilMask = pattern.writeMask = 0xffff;
            pattern.ref = 1;
        } else {
            pattern.stencilTest = true;
            if (stage === Stage.ENABLED) {
                pattern.func = ComparisonFunc.EQUAL;
                pattern.failOp = StencilOp.KEEP;
                pattern.stencilMask = pattern.ref = this.getStencilRef();
                pattern.writeMask = this.getWriteMask();
            } else if (stage === Stage.CLEAR) {
                pattern.func = ComparisonFunc.NEVER;
                pattern.failOp = StencilOp.ZERO;
                pattern.writeMask = pattern.stencilMask = pattern.ref = this.getWriteMask();
            } else if (stage === Stage.CLEAR_INVERTED) {
                pattern.func = ComparisonFunc.NEVER;
                pattern.failOp = StencilOp.REPLACE;
                pattern.writeMask = pattern.stencilMask = pattern.ref = this.getWriteMask();
            } else if (stage === Stage.ENTER_LEVEL) {
                pattern.func = ComparisonFunc.NEVER;
                pattern.failOp = StencilOp.REPLACE;
                pattern.writeMask = pattern.stencilMask = pattern.ref = this.getWriteMask();
            }  else if (stage === Stage.ENTER_LEVEL_INVERTED) {
                pattern.func = ComparisonFunc.NEVER;
                pattern.failOp = StencilOp.ZERO;
                pattern.writeMask = pattern.stencilMask = pattern.ref = this.getWriteMask();
            }
        }
    }
}

StencilManager.sharedManager = new StencilManager();
