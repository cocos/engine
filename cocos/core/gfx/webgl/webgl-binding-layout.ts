import { GFXBindingLayout, IGFXBindingLayoutInfo } from '../binding-layout';
import { GFXBindingType } from '../define';
import { WebGLGFXBuffer } from './webgl-buffer';
import { WebGLGPUBinding, WebGLGPUBindingLayout } from './webgl-gpu-objects';
import { WebGLGFXSampler } from './webgl-sampler';
import { WebGLGFXTextureView } from './webgl-texture-view';

export class WebGLGFXBindingLayout extends GFXBindingLayout {

    public get gpuBindingLayout (): WebGLGPUBindingLayout {
        return  this._gpuBindingLayout as WebGLGPUBindingLayout;
    }

    private _gpuBindingLayout: WebGLGPUBindingLayout | null = null;

    protected _initialize (info: IGFXBindingLayoutInfo): boolean {

        this._gpuBindingLayout = {
            gpuBindings: new Array<WebGLGPUBinding>(info.bindings.length),
        };

        for (let i = 0; i < info.bindings.length; ++i) {
            const binding = info.bindings[i];
            this._gpuBindingLayout.gpuBindings[i] = {
                binding: binding.binding,
                type: binding.bindingType,
                name: binding.name,
                gpuBuffer: null,
                gpuTexView: null,
                gpuSampler: null,
            };
        }

        return true;
    }

    protected _destroy () {
        this._gpuBindingLayout = null;
    }

    public update () {
        if (this._isDirty && this._gpuBindingLayout) {
            for (let i = 0; i < this._bindingUnits.length; ++i) {
                const bindingUnit = this._bindingUnits[i];
                switch (bindingUnit.type) {
                    case GFXBindingType.UNIFORM_BUFFER: {
                        if (bindingUnit.buffer) {
                            this._gpuBindingLayout.gpuBindings[i].gpuBuffer =
                                (bindingUnit.buffer as WebGLGFXBuffer).gpuBuffer;
                        }
                        break;
                    }
                    case GFXBindingType.SAMPLER: {
                        if (bindingUnit.texView) {
                            this._gpuBindingLayout.gpuBindings[i].gpuTexView =
                                (bindingUnit.texView as WebGLGFXTextureView).gpuTextureView;
                        }
                        if (bindingUnit.sampler) {
                            this._gpuBindingLayout.gpuBindings[i].gpuSampler =
                                (bindingUnit.sampler as WebGLGFXSampler).gpuSampler;
                        }
                        break;
                    }
                    default:
                }
            }
            this._isDirty = false;
        }
    }
}
