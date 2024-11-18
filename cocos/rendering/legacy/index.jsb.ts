/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

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

declare const nr: any;
declare const jsb: any;

import { OPEN_HARMONY } from 'internal:constants'
import { legacyCC } from '../../core/global-exports';
import { ccenum, CCString } from '../../core';

import { 
    ForwardPipeline as NrForwardPipeline,
    ForwardFlow as NrForwardFlow,
    ShadowFlow as NrShadowFlow,
    ForwardStage as NrForwardStage,
    ShadowStage as NrShadowStage,
    DeferredPipeline as NrDeferredPipeline,
    MainFlow as NrMainFlow,
    LightingStage as NrLightingStage,
    PostProcessStage as NrPostProcessStage,
    GbufferStage as NrGbufferStage,
    BloomStage as NrBloomStage,
    ReflectionProbeFlow as NrReflectionProbeFlow,
    ReflectionProbeStage as NrReflectionProbeStage,
    RenderPipeline as NrRenderPipeline,
    RenderFlow as NrRenderFlow,
    RenderStage as NrRenderStage,
} from './index';
import * as decors from '../../native-binding/decorators';
import { ccclass, serializable, editable, type } from '../../core/data/class-decorator';
import { RenderTexture } from '../../asset/assets/render-texture';

export function createDefaultPipeline (): ForwardPipeline {
    const rppl = new ForwardPipeline();
    if (!window.oh) {
        rppl.initialize({ flows: [] });
    }
    return rppl;
}
export const ForwardPipeline: typeof NrForwardPipeline = nr.ForwardPipeline;
export type ForwardPipeline = NrForwardPipeline;
export const ForwardFlow: typeof NrForwardFlow = nr.ForwardFlow;
export type ForwardFlow = NrForwardFlow;
export const ShadowFlow: typeof NrShadowFlow = nr.ShadowFlow;
export type ShadowFlow = NrShadowFlow;
export const ForwardStage: typeof NrForwardStage = nr.ForwardStage;
export type ForwardStage = NrForwardStage;
export const ShadowStage: typeof NrShadowStage = nr.ShadowStage;
export type ShadowStage = NrShadowStage;
export const DeferredPipeline: typeof NrDeferredPipeline = nr.DeferredPipeline;
export type DeferredPipeline = NrDeferredPipeline;
export const MainFlow: typeof NrMainFlow = nr.MainFlow;
export type MainFlow = NrMainFlow;
export const LightingStage: typeof NrLightingStage = nr.LightingStage;
export type LightingStage = NrLightingStage;
export const PostProcessStage: typeof NrPostProcessStage = nr.PostProcessStage;
export type PostProcessStage = NrPostProcessStage;
export const GbufferStage: typeof NrGbufferStage = nr.GbufferStage;
export type GbufferStage = NrGbufferStage;
export const BloomStage: typeof NrBloomStage = nr.BloomStage;
export type BloomStage = NrBloomStage;
export const ReflectionProbeFlow: typeof NrReflectionProbeFlow = nr.ReflectionProbeFlow;
export type ReflectionProbeFlow = NrReflectionProbeFlow;
export const ReflectionProbeStage: typeof NrReflectionProbeStage = nr.ReflectionProbeStage;
export type ReflectionProbeStage = NrReflectionProbeStage;
export const RenderPipeline: typeof NrRenderPipeline = nr.RenderPipeline;
export type RenderPipeline = NrRenderPipeline;
export const RenderFlow: typeof NrRenderFlow = nr.RenderFlow;
export type RenderFlow = NrRenderFlow;
export const RenderStage: typeof NrRenderStage = nr.RenderStage;
export type RenderStage = NrRenderStage;

legacyCC.RenderFlow = RenderFlow;
legacyCC.RenderStage = RenderStage;
legacyCC.RenderPipeline = RenderPipeline;

interface IRenderPipelineInfo {
    flows: any[];
    tag: number;
}

interface IRenderFlowInfo {
    name: string;
    priority: number;
    stages: any[];
    tag: number;
}

interface IRenderStageInfo {
    name: string;
    priority: number;
    tag: number;
    renderQueues: RenderQueueDesc[];
}

// ForwardPipeline
// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const forwardPipelineProto: any = ForwardPipeline.prototype;
forwardPipelineProto._ctor = function () {
    this._tag = 0;
    this._flows = [];
};

forwardPipelineProto.init = function () {
    for (let i = 0; i < this._flows.length; i++) {
        this._flows[i].init(this);
    }
    const info: IRenderPipelineInfo = { tag: this._tag, flows: this._flows };
    this.initialize(info);
};

const oldForwardOnLoaded = forwardPipelineProto.onLoaded;
// hook to invoke init after deserialization
forwardPipelineProto.onLoaded = function () {
    if (oldForwardOnLoaded) oldForwardOnLoaded.call(this);
    for (let i = 0; i < this._flows.length; i++) {
        this._flows[i].init(this);
    }
    const info: IRenderPipelineInfo = { tag: this._tag, flows: this._flows };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const forwardFlowProto: any = ForwardFlow.prototype;
forwardFlowProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
}
forwardFlowProto.init = function (pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
        this._stages[i].init(pipeline);
    }
    const info: IRenderFlowInfo = { name: this._name, priority: this._priority, tag: this._tag, stages: this._stages };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const shadowFlowProto: any = ShadowFlow.prototype;
shadowFlowProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
}
shadowFlowProto.init = function (pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
        this._stages[i].init(pipeline);
    }
    const info: IRenderFlowInfo = { name: this._name, priority: this._priority, tag: this._tag, stages: this._stages };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const forwardStageProto: any = ForwardStage.prototype;
forwardStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
}
forwardStageProto.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const shadowStageProto: any = ShadowStage.prototype;
shadowStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
}

shadowStageProto.init = function (pipeline) {
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: [] };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const deferredPipelineProto: any = DeferredPipeline.prototype;
deferredPipelineProto._ctor = function () {
    this._tag = 0;
    this._flows = [];
    this.renderTextures = [];
    this.materials = [];
}

const oldDeferredOnLoaded = deferredPipelineProto.onLoaded;
// hook to invoke init after deserialization
deferredPipelineProto.onLoaded = function () {
    if (oldDeferredOnLoaded) oldDeferredOnLoaded.call(this);

    for (let i = 0; i < this._flows.length; i++) {
        this._flows[i].init(this);
    }
    let info = { tag: this._tag, flows: this._flows };
    this.initialize(info);
}


// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const mainFlowProto: any = MainFlow.prototype;
mainFlowProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
}
mainFlowProto.init = function (pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
        this._stages[i].init(pipeline);
    }
    const info: IRenderFlowInfo = { name: this._name, priority: this._priority, tag: this._tag, stages: this._stages };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const gbufferStageProto: any = GbufferStage.prototype;
gbufferStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
}
gbufferStageProto.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const lightingStageProto: any = LightingStage.prototype;
lightingStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
    this._deferredMaterial = null;
}
lightingStageProto.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    pipeline.pipelineSceneData.deferredLightingMaterial = this._deferredMaterial;
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const bloomStageProto: any = BloomStage.prototype;
bloomStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
    this._bloomMaterial = null;
}
bloomStageProto.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    pipeline.pipelineSceneData.bloomMaterial = this._bloomMaterial;
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}


// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const postProcessStageProto: any = PostProcessStage.prototype;
postProcessStageProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
    this._postProcessMaterial = null;
}
postProcessStageProto.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    pipeline.pipelineSceneData.postProcessMaterial = this._postProcessMaterial;
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const reflectionProbeFlowProto: any = ReflectionProbeFlow.prototype;
reflectionProbeFlowProto._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this._stages = [];
}
reflectionProbeFlowProto.init = function (pipeline) {
    for (let i = 0; i < this._stages.length; i++) {
        this._stages[i].init(pipeline);
    }
    const info: IRenderFlowInfo = { name: this._name, priority: this._priority, tag: this._tag, stages: this._stages };
    this.initialize(info);
}

// TODO: we mark it as type of any, because here we have many dynamic injected property @dumganhar
const reflectionProbeStage: any = ReflectionProbeStage.prototype;
reflectionProbeStage._ctor = function () {
    this._name = 0;
    this._priority = 0;
    this._tag = 0;
    this.renderQueues = [];
}
reflectionProbeStage.init = function (pipeline) {
    const queues = [];
    for (let i = 0; i < this.renderQueues.length; i++) {
        // @ts-ignore
        queues.push(this.renderQueues[i].init());
    }
    const info: IRenderStageInfo = { name: this._name, priority: this._priority, tag: this._tag, renderQueues: queues };
    this.initialize(info);
}

@ccclass('RenderTextureConfig')
class RenderTextureConfig {
    @serializable
    @editable
    public name = '';
    @type(RenderTexture)
    public texture: RenderTexture | null = null;
}

export enum RenderQueueSortMode {
    FRONT_TO_BACK,
    BACK_TO_FRONT,
}
ccenum(RenderQueueSortMode);

export class RenderQueueDesc {

    /**
 * @en Whether the render queue is a transparent queue
 * @zh 当前队列是否是半透明队列
    */
    @serializable
    @editable
    public isTransparent = false;

    /**
     * @en The sort mode of the render queue
     * @zh 渲染队列的排序模式
     */
    @type(RenderQueueSortMode)
    public sortMode: RenderQueueSortMode = RenderQueueSortMode.FRONT_TO_BACK;

    /**
 * @en The stages using this queue
 * @zh 使用当前渲染队列的阶段列表
 */
    @type([CCString])
    public stages: string[] = [];

    constructor() {
        this.stages = [];
    }

    public init(): any {
        return new nr.RenderQueueDesc(this.isTransparent, this.sortMode, this.stages);
    }
}

function proxyArrayAttributeImpl(proto: any, attr: string): void {
    const proxyTarget = `_${attr}_target`;
    let arrayProxy = (self, targetArrayAttr: string): any => {
        return new Proxy(self[targetArrayAttr], {
            get(targetArray, prop, receiver): any {
                return Reflect.get(targetArray, prop, receiver);
            },
            set(targetArray, prop, receiver): boolean {
                const ret = Reflect.set(targetArray, prop, receiver);
                self[targetArrayAttr] = targetArray;
                return ret;
            }
        });
    }

    Object.defineProperty(proto, attr, {
        configurable: true,
        enumerable: true,
        get: function () {
            this[proxyTarget] ||= [];
            return arrayProxy(this, proxyTarget);
        },
        set: function (v) {
            this[proxyTarget] = v;
        }
    });
}


let proxyArrayAttribute = proxyArrayAttributeImpl;

if (!OPEN_HARMONY) {
    // WORKAROUND: the proxy array getLength crashed on OH platform
    proxyArrayAttribute(RenderFlow.prototype, '_stages');
    proxyArrayAttribute(RenderPipeline.prototype, '_flows');
}

//-------------------- register types -------------------- 

const Material = jsb.Material;

decors.patch_GbufferStage({GbufferStage, RenderQueueDesc});
decors.patch_LightingStage({LightingStage, RenderQueueDesc, Material});
decors.patch_BloomStage({BloomStage, Material});
decors.patch_PostProcessStage({PostProcessStage, Material, RenderQueueDesc});
decors.patch_ForwardStage({ForwardStage, RenderQueueDesc});
decors.patch_ShadowStage({ShadowStage});
decors.patch_ReflectionProbeStage({ReflectionProbeStage});

decors.patch_MainFlow({MainFlow});
decors.patch_ForwardFlow({ForwardFlow});
decors.patch_ShadowFlow({ShadowFlow});
decors.patch_ReflectionProbeFlow({ReflectionProbeFlow});

decors.patch_ForwardPipeline({ForwardPipeline, RenderTextureConfig});
decors.patch_DeferredPipeline({DeferredPipeline, RenderTextureConfig});

decors.patch_RenderQueueDesc({RenderQueueDesc, RenderQueueSortMode, CCString});
decors.patch_RenderStage({RenderStage});

decors.patch_RenderFlow({RenderFlow, RenderStage});

decors.patch_cc_RenderPipeline({RenderPipeline, RenderFlow});
