/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import {
    ccclass,
    disallowMultiple,
    displayName,
    editable,
    executeInEditMode,
    help,
    menu,
    range,
    serializable,
    tooltip,
    type,
    visible,
} from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { NodeEventType } from '../../scene-graph/node-event';
import { Component } from '../../scene-graph/component';
import { Vec3, CCInteger } from '../../core';
import { AutoPlacement, PlaceMethod } from './auto-placement';

/**
 * @en The light probe group component.
 * @zh 光照探针组组件。
 */
@ccclass('cc.LightProbeGroup')
@help('i18n:cc.LightProbeGroup')
@menu('Rendering/LightProbeGroup')
@disallowMultiple
@executeInEditMode
export class LightProbeGroup extends Component {
    @serializable
    protected _probes: Vec3[] = [];

    @serializable
    protected _method = PlaceMethod.UNIFORM;

    @serializable
    protected _minPos = new Vec3(-5, -5, -5);

    @serializable
    protected _maxPos = new Vec3(5, 5, 5);

    @serializable
    protected _nProbesX = 3;

    @serializable
    protected _nProbesY = 3;

    @serializable
    protected _nProbesZ = 3;

    @editable
    @type([Vec3])
    @visible(false)
    get probes (): Vec3[] {
        return this._probes;
    }
    set probes (val: Vec3[]) {
        this._probes = val;
    }

    @editable
    @type(PlaceMethod)
    @tooltip('i18n:light_probe_group.method')
    @displayName('Generating Method')
    get method (): number {
        return this._method;
    }
    // Support this feature later.
    // set method (val) {
    //     this._method = val;
    // }

    /**
     * @en Minimum position of the light probe group
     * @zh 光照探针组包围盒最小值
     */
    @editable
    @tooltip('i18n:light_probe_group.minPos')
    @displayName('Generating Min Pos')
    get minPos (): Vec3 {
        return this._minPos;
    }
    set minPos (val: Vec3) {
        this._minPos = val;
    }

    /**
     * @en Maximum position of the light probe group
     * @zh 光照探针组包围盒最大值
     */
    @editable
    @tooltip('i18n:light_probe_group.maxPos')
    @displayName('Generating Max Pos')
    get maxPos (): Vec3 {
        return this._maxPos;
    }
    set maxPos (val: Vec3) {
        this._maxPos = val;
    }

    @editable
    @range([2, 65535, 1])
    @type(CCInteger)
    @tooltip('i18n:light_probe_group.nProbesX')
    @displayName('Number Of Probes X')
    get nProbesX (): number {
        return this._nProbesX;
    }
    set nProbesX (val: number) {
        this._nProbesX = val;
    }

    @editable
    @range([2, 65535, 1])
    @type(CCInteger)
    @tooltip('i18n:light_probe_group.nProbesY')
    @displayName('Number Of Probes Y')
    get nProbesY (): number {
        return this._nProbesY;
    }
    set nProbesY (val: number) {
        this._nProbesY = val;
    }

    @editable
    @range([2, 65535, 1])
    @type(CCInteger)
    @tooltip('i18n:light_probe_group.nProbesZ')
    @displayName('Number Of Probes Z')
    get nProbesZ (): number {
        return this._nProbesZ;
    }
    set nProbesZ (val: number) {
        this._nProbesZ = val;
    }

    public onLoad (): void {
        if (!EDITOR) {
            return;
        }

        if (!this.node) {
            return;
        }
        const lightProbeInfo = this.node.scene.globals.lightProbeInfo;
        const changed = lightProbeInfo.addNode(this.node);
        if (changed) {
            lightProbeInfo.syncData(this.node, this.probes);
            lightProbeInfo.update(true);
        }
    }

    public onEnable (): void {
        if (!EDITOR) {
            return;
        }

        if (!this.node) {
            return;
        }

        const changed = this.node.scene.globals.lightProbeInfo.addNode(this.node);
        if (changed) {
            this.onProbeChanged();
        }
    }

    public onDisable (): void {
        if (!EDITOR) {
            return;
        }

        if (!this.node) {
            return;
        }

        const changed = this.node.scene.globals.lightProbeInfo.removeNode(this.node);
        if (changed) {
            this.onProbeChanged();
        }
    }

    public generateLightProbes (): void {
        if (!this.node) {
            return;
        }

        this._probes = AutoPlacement.generate({
            method: this._method,
            nProbesX: this._nProbesX,
            nProbesY: this._nProbesY,
            nProbesZ: this._nProbesZ,
            minPos: this._minPos,
            maxPos: this._maxPos,
        });

        this.onProbeChanged();
    }

    public onProbeChanged (updateTet = true, emitEvent = true): void {
        const lightProbeInfo = this.node.scene.globals.lightProbeInfo;
        lightProbeInfo.syncData(this.node, this.probes);
        lightProbeInfo.update(updateTet);

        if (emitEvent) {
            this.node.emit(NodeEventType.LIGHT_PROBE_CHANGED);
        }
    }
}
