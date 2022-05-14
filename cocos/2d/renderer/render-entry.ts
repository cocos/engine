import { BaseRenderData } from './render-data';
import { Stage } from './stencil-manager';
import { JSB } from '../../core/default-constants';
import { NativeRenderEntry } from '../../core/renderer/scene/native-scene';

export class RenderEntry {
    public renderData: BaseRenderData=null!;
    public stencilStage:Stage = Stage.DISABLED;

    //具体的渲染数据
    public bufferId: number | undefined;
    public vertexOffset: number | undefined;
    public indexOffset: number | undefined;
    public vb: Float32Array | undefined;
    public vData: Float32Array | undefined;//要考虑是否每个组件都需要存这个指针
    public iData: Uint16Array | undefined;

    protected declare _nativeObj: NativeRenderEntry;

    public init () {
        if (JSB) {
            this._nativeObj = new NativeRenderEntry();
            this._nativeObj.bufferId = 1;
        }
    }

    public setVB (vbBuffer: ArrayBufferLike) {
        if (JSB) {
            if (this._nativeObj) {
                this._nativeObj.vbBuffer = vbBuffer;
            }
        }
    }
}
