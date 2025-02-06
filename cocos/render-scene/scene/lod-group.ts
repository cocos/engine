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
import { Model } from './model';
import { Vec3, assertIsTrue, v3 } from '../../core';
import { RenderScene } from '..';
import { Device, deviceManager } from '../../gfx';
import { Node } from '../../scene-graph';
import { Camera, CameraProjection } from './camera';

/**
 * @engineInternal
 * @mangle
 */
export class LODData {
    // Range in [0, 1].
    screenUsagePercentage = 1.0;

    private _models: Model[] = [];

    get models (): readonly Model[] {
        return this._models;
    }

    public addModel (model: Model): void {
        this._models.splice(0, 0, model);
    }

    public eraseModel (model: Model): void {
        const removeIndex = this._models.indexOf(model);
        if (removeIndex >= 0) {
            this._models.splice(removeIndex, 1);
        }
    }

    public clearModels (): void {
        this._models.length = 0;
    }
}

/**
 * @engineInternal
 * @mangle
 */
export class LODGroup {
    public scene?: RenderScene;

    public node: Node = null!;

    protected declare _device: Device;

    public enabled = true;

    private _localBoundaryCenter: Vec3 = v3(0, 0, 0);

    /**
     * @en Object Size in local space, may be auto-calculated value from object bounding box or value from user input.
    */
    protected _objectSize = 1;

    /**
     *@en The array of LODs
     */
    protected _lodDataArray: LODData[] = [];

    /**
     * For editor only, users maybe operate several LOD's object
     */
    protected _lockedLODLevelVec: number[] = [];

    private _isLockLevelChanged = false;

    constructor () {
        this._device = deviceManager.gfxDevice;
    }

    set localBoundaryCenter (val: Readonly<Vec3>) {  this._localBoundaryCenter.set(val); }

    get localBoundaryCenter (): Readonly<Vec3> { return this._localBoundaryCenter.clone(); }

    get lodCount (): number { return this._lodDataArray.length; }

    set objectSize (val: number) {
        this._objectSize = val;
    }

    get objectSize (): number { return this._objectSize; }

    get lodDataArray (): readonly LODData[] { return this._lodDataArray; }
    attachToScene (scene: RenderScene): void {
        this.scene = scene;
    }

    detachFromScene (): void {
        this.scene = null!;
    }

    lockLODLevels (lockLev: number[]): void {
        if (lockLev.length !== this._lockedLODLevelVec.length) {
            this._isLockLevelChanged = true;
        } else {
            const size = lockLev.length;
            let index = 0;
            for (; index < size; index++) {
                if (lockLev[index] !== this._lockedLODLevelVec[index]) {
                    this._isLockLevelChanged = true;
                    break;
                }
            }
        }
        this._lockedLODLevelVec = lockLev.slice();
    }

    isLockLevelChanged (): boolean {
        return this._isLockLevelChanged;
    }

    resetLockChangeFlag (): void {
        this._isLockLevelChanged = false;
    }

    getLockedLODLevels (): readonly number[] {
        return this._lockedLODLevelVec;
    }

    clearLODs (): void {
        this._lodDataArray.length = 0;
    }

    insertLOD (index: number, lod: LODData): void {
        this._lodDataArray.splice(index, 0, lod);
    }

    updateLOD (index: number, lod: LODData): void {
        this._lodDataArray[index] = lod;
    }

    eraseLOD (index: number): void {
        this._lodDataArray.splice(index, 1);
    }

    /**
     *
     * @param camera current perspective camera
     * @returns visible LOD index in lodGroup
     */
    getVisibleLODLevel (camera: Camera): number {
        const screenUsagePercentage = this.getScreenUsagePercentage(camera);

        let lodIndex = -1;
        for (let i = 0; i < this.lodCount; ++i) {
            const lod = this.lodDataArray[i];
            if (screenUsagePercentage >= lod.screenUsagePercentage) {
                lodIndex = i;
                break;
            }
        }
        return lodIndex;
    }

    /**
     *
     * @param camera current perspective camera
     * @returns height of current lod group relative to camera position in screen space, aka. relativeHeight
     */
    getScreenUsagePercentage (camera: Camera): number {
        if (!this.node) return 0;

        let distance: number | undefined;
        if (camera.projectionType === CameraProjection.PERSPECTIVE) {
            distance =  Vec3.len(this.localBoundaryCenter.transformMat4(this.node.worldMatrix).subtract(camera.node.worldPosition));
        }

        return this.distanceToScreenUsagePercentage(camera, distance, this.getWorldSpaceSize());
    }

    private distanceToScreenUsagePercentage (camera: Camera, distance: number | undefined, size: number): number {
        if (camera.projectionType === CameraProjection.PERSPECTIVE) {
            assertIsTrue(typeof distance === 'number', 'distance must be present for perspective projection');
            return (size * camera.matProj.m05) / (distance * 2.0); // note: matProj.m11 is 1 / tan(fov / 2.0)
        } else {
            return size * camera.matProj.m05 * 0.5;
        }
    }

    private getWorldSpaceSize (): number {
        const scale = this.node.scale;
        const maxScale = Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
        return maxScale * this.objectSize;
    }
}
