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

import { PipelineLayout } from './pipeline-layout';
import { RenderPass } from './render-pass';
import { Shader } from './shader';
import {
    DynamicStateFlagBit,
    DynamicStateFlags,
    GFXObject,
    ObjectType,
    PrimitiveMode,
    InputState,
    PipelineBindPoint,
} from './define';
import { BlendState, BlendTarget, RasterizerState, DepthStencilState } from './pipeline-sub-state';

export { BlendState, BlendTarget, RasterizerState, DepthStencilState };

export class PipelineStateInfo {
    declare private _token: never; // to make sure all usages must be an instance of this exact class, not assembled from plain object

    constructor (
        public shader: Shader = null!,
        public pipelineLayout: PipelineLayout = null!,
        public renderPass: RenderPass = null!,
        public inputState: InputState = new InputState(),
        public rasterizerState: RasterizerState = new RasterizerState(),
        public depthStencilState: DepthStencilState = new DepthStencilState(),
        public blendState: BlendState = new BlendState(),
        public primitive: PrimitiveMode = PrimitiveMode.TRIANGLE_LIST,
        public dynamicStates: DynamicStateFlags = DynamicStateFlagBit.NONE,
        public bindPoint: PipelineBindPoint = PipelineBindPoint.GRAPHICS,
    ) {}
}

/**
 * @en GFX pipeline state.
 * @zh GFX 管线状态。
 */
export abstract class PipelineState extends GFXObject {
    /**
     * @en Get current shader.
     * @zh GFX 着色器。
     */
    get shader (): Shader {
        return this._shader!;
    }

    /**
     * @en Get current pipeline layout.
     * @zh GFX 管线布局。
     */
    get pipelineLayout (): PipelineLayout {
        return this._pipelineLayout!;
    }

    /**
     * @en Get current primitve mode.
     * @zh GFX 图元模式。
     */
    get primitive (): PrimitiveMode {
        return this._primitive;
    }

    /**
     * @en Get current rasterizer state.
     * @zh GFX 光栅化状态。
     */
    get rasterizerState (): RasterizerState {
        return this._rs;
    }

    /**
     * @en Get current depth stencil state.
     * @zh GFX 深度模板状态。
     */
    get depthStencilState (): DepthStencilState {
        return this._dss;
    }

    /**
     * @en Get current blend state.
     * @zh GFX 混合状态。
     */
    get blendState (): BlendState {
        return this._bs;
    }

    /**
     * @en Get current input state.
     * @zh GFX 输入状态。
     */
    get inputState (): InputState {
        return this._is as InputState;
    }

    /**
     * @en Get current dynamic states.
     * @zh GFX 动态状态数组。
     */
    get dynamicStates (): DynamicStateFlags {
        return this._dynamicStates;
    }

    /**
     * @en Get current render pass.
     * @zh GFX 渲染过程。
     */
    get renderPass (): RenderPass {
        return this._renderPass as RenderPass;
    }

    protected _shader: Shader | null = null;
    protected _pipelineLayout: PipelineLayout | null = null;
    protected _primitive: PrimitiveMode = PrimitiveMode.TRIANGLE_LIST;
    protected _is: InputState | null = null;
    protected _rs: RasterizerState = new RasterizerState();
    protected _dss: DepthStencilState = new DepthStencilState();
    protected _bs: BlendState = new BlendState();
    protected _dynamicStates: DynamicStateFlags = DynamicStateFlagBit.NONE;
    protected _renderPass: RenderPass | null = null;

    constructor () {
        super(ObjectType.PIPELINE_STATE);
    }

    public abstract initialize (info: Readonly<PipelineStateInfo>): void;

    public abstract destroy (): void;
}
