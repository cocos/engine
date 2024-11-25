/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { ccclass, serializable, editable } from 'cc.decorator';
import { SUPPORT_JIT, ALIPAY, RUNTIME_BASED, JSB } from 'internal:constants';
import { compile } from '../../serialization/instantiate-jit';
import { js } from '../../core';
import { Enum } from '../../core/value-types';
import { Asset } from '../../asset/assets/asset';
import { Node } from '../node';
import { legacyCC } from '../../core/global-exports';
import { warnID } from '../../core/platform/debug';
import { updateChildrenForDeserialize } from '../../core/utils/jsb-utils';
import * as utils from './utils';

/**
 * @en An enumeration used with the [[Prefab.optimizationPolicy]] to specify how to optimize the instantiate operation.
 * @zh Prefab 创建实例所用的优化策略，配合 [[Prefab.optimizationPolicy]] 使用。
 */
const OptimizationPolicy = Enum({
    /**
     * @en The optimization policy is automatically chosen based on the number of instantiations.
     * When you first create an instance, the behavior is the same as SINGLE_INSTANCE.
     * MULTI_INSTANCE will be automatically used after multiple creation.
     * @zh 根据创建次数自动调整优化策略。初次创建实例时，行为等同 SINGLE_INSTANCE，多次创建后将自动采用 MULTI_INSTANCE。
     */
    AUTO: 0,
    /**
     * @en Optimize for single instance creation.<br>
     * This option skips code generation for this prefab.
     * When this prefab will usually create only one instances, please select this option.
     * @zh 优化单次创建性能。<br>
     * 该选项会跳过针对这个 prefab 的代码生成优化操作。当该 prefab 加载后，一般只会创建一个实例时，请选择此项。
     */
    SINGLE_INSTANCE: 1,
    /**
     * @en Optimize for creating instances multiple times.<br>
     * This option enables code generation for this prefab.
     * When this prefab will usually create multiple instances, please select this option.
     * It is also recommended to select this option if the prefab instance in the scene
     * has Auto Sync enabled and there are multiple instances in the scene.
     * @zh 优化多次创建性能。<br>
     * 该选项会启用针对这个 prefab 的代码生成优化操作。当该 prefab 加载后，一般会创建多个实例时，请选择此项。如果该 prefab 在场景中的节点启用了自动关联，并且在场景中有多份实例，也建议选择此项。
     */
    MULTI_INSTANCE: 2,
});

/**
 * @en Class for prefab handling.
 * @zh 预制资源类。
 */
@ccclass('cc.Prefab')
export class Prefab extends Asset {
    /**
     * @en Enumeration for optimization policy
     * @zh Prefab 创建实例所用的优化策略枚举类型
     */
    public static OptimizationPolicy = OptimizationPolicy;

    public static OptimizationPolicyThreshold = 3;

    /**
     * @en The main [[Node]] in the prefab
     * @zh Prefab 中的根节点，[[Node]] 类型
     */
    @serializable
    @editable
    public data: any = null;

    /**
     * @zh
     * 设置实例化这个 prefab 时所用的优化策略。根据使用情况设置为合适的值，能优化该 prefab 实例化所用的时间。推荐在编辑器的资源中设置。
     * @en
     * Indicates the optimization policy for instantiating this prefab.
     * Set to a suitable value based on usage, can optimize the time it takes to instantiate this prefab.
     * Suggest to set this policy in the editor's asset inspector.
     * @default Prefab.OptimizationPolicy.AUTO
     * @example
     * ```ts
     * import { Prefab } from 'cc';
     * prefab.optimizationPolicy = Prefab.OptimizationPolicy.MULTI_INSTANCE;
     * ```
     */
    @serializable
    @editable
    public optimizationPolicy = OptimizationPolicy.AUTO;

    @serializable
    @editable
    public persistent = false;

    // Cache function to optimize instance creation.
    private _createFunction: ((...arg: any[]) => Node) | null = null;
    private _instantiatedTimes: number = 0;
    constructor () {
        super();
    }

    public createNode (cb: (err: Error | null, node: Node) => void): void {
        const node = legacyCC.instantiate(this) as Node;
        node.name = this.name;
        cb(null, node);
    }

    /**
     * @en
     * Dynamically translation prefab data into minimized code.<br/>
     * This method will be called automatically before the first time the prefab being instantiated,<br/>
     * but you can re-call to refresh the create function once you modified the original prefab data in script.
     * @zh
     * 将预制数据动态转换为最小化代码。<br/>
     * 此方法将在第一次实例化预制件之前自动调用，<br/>
     * 但是您可以在脚本中修改原始预制数据后重新调用以刷新创建功能。
     */
    public compileCreateFunction (): void {
        if (SUPPORT_JIT) {
            this._createFunction = compile(this.data);
        }
    }

    // just instantiate, will not initialize the Node, this will be called during Node's initialization.
    // @param {Node} [rootToRedirect] - specify an instantiated prefabRoot that all references to prefabRoot in prefab
    //                                  will redirect to
    /**
     * @engineInternal
     */
    public _doInstantiate (rootToRedirect?: any): Node {
        if (!this.data._prefab) {
            // temp guard code
            warnID(3700);
        }
        if (!this._createFunction) {
            this.compileCreateFunction();
        }
        return this._createFunction!(rootToRedirect);  // this.data._instantiate();
    }

    private _instantiate (): Node {
        let node: Node;
        let useJit = false;
        if (SUPPORT_JIT) {
            if (this.optimizationPolicy === OptimizationPolicy.SINGLE_INSTANCE) {
                useJit = false;
            } else if (this.optimizationPolicy === OptimizationPolicy.MULTI_INSTANCE) {
                useJit = true;
            } else {
                // auto
                useJit = (this._instantiatedTimes + 1) >= Prefab.OptimizationPolicyThreshold;
            }
        }
        if (useJit) {
            // instantiate node
            node = this._doInstantiate();
            // initialize node
            this.data._instantiate(node);
        } else {
            // instantiate node
            node = this.data._instantiate();
        }
        ++this._instantiatedTimes;

        return node;
    }

    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        this.data = new Node();
        this.data.name = '(Missing Node)';
        const prefabInfo = new legacyCC._PrefabInfo();
        prefabInfo.asset = this;
        prefabInfo.root = this.data;
        this.data._prefab = prefabInfo;
    }

    public validate (): boolean {
        return !!this.data;
    }

    public onLoaded (): void {
        const rootNode = this.data as Node;
        utils.expandNestedPrefabInstanceNode(rootNode);
        utils.applyTargetOverrides(rootNode);
        if (JSB) {
            updateChildrenForDeserialize(rootNode);
        }
    }
}

export declare namespace Prefab {
    export { utils as _utils };
}

js.value(Prefab, '_utils', utils);

legacyCC.Prefab = Prefab;
if (ALIPAY || RUNTIME_BASED) {
    legacyCC._Prefab = Prefab;
} else {
    js.obsolete(legacyCC, 'cc._Prefab', 'Prefab');
}
