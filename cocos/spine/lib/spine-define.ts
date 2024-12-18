/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
/* eslint @typescript-eslint/no-explicit-any: "off" */
/* eslint @typescript-eslint/no-unsafe-argument: "off" */

import spine from './spine-core';
import { js } from '../../core';

function resizeArray (array: any[], newSize: number): any[] {
    if (!array) return new Array(newSize);
    if (newSize === array.length) return array;
    if (newSize < array.length) return array.slice(0, newSize);
    else return new Array(newSize);
}

function overrideDefineArrayProp (prototype: any, getPropVector: any, name: string): void {
    const _name = `_${name}`;
    Object.defineProperty(prototype, name, {
        get (): any[] {
            const vectors = getPropVector.call(this);
            const count = vectors.size();
            let array = this[_name] as any[];
            array = resizeArray(array, count);
            for (let i = 0; i < count; i++) array[i] = vectors.get(i);
            this[_name] = array;
            return array;
        },
    });
}

function overrideDefineArrayArrayProp (prototype: any, getPropVector: any, name: string): void {
    const _name = `_${name}`;
    Object.defineProperty(prototype, name, {
        get (): any[] {
            const vectors = getPropVector.call(this);
            const count = vectors.size();
            let array = this[_name];
            array = resizeArray(array, count);
            for (let i = 0; i < count; i++) {
                const vectorI = vectors.get(i);
                const countJ = vectorI.size();
                let arrayJ: any[] = array[i];
                arrayJ = resizeArray(arrayJ, countJ);
                for (let j = 0; j < countJ; j++) arrayJ[j] = vectorI.get(j);
                array[i] = arrayJ;
            }
            this[_name] = array;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return array;
        },
    });
}

function overrideDefineArrayFunction (prototype: any, getPropVector: any, name: string): void {
    const _name = `_${name}`;
    Object.defineProperty(prototype, name, {
        value (): any[] {
            const vectors = getPropVector.call(this);
            const count = vectors.size();
            let array = this[_name] as any[];
            array = resizeArray(array, count);
            for (let i = 0; i < count; i++) array[i] = vectors.get(i);
            this[_name] = array;
            return array;
        },
    });
}

function overrideClass (wasm): void {
    spine.wasmUtil = wasm.SpineWasmUtil;
    spine.wasmUtil.wasm = wasm;
    spine.wasmUtil.spineWasmInit();

    for (const k in wasm) {
        const v = wasm[k];
        if (!spine[k]) {
            spine[k] = v;
        }
    }
}

function overrideProperty_IkConstraintData (): void {
    const prototype = spine.IkConstraintData.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_PathConstraintData (): void {
    const prototype = spine.PathConstraintData.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_VertexAttachment (): void {
    const prototype = spine.VertexAttachment.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
    overrideDefineArrayProp(prototype, prototype.getVertices, 'vertices');
    const originComputeWorldVertices = prototype.computeWorldVertices;
    const vectors = new spine.SPVectorFloat();
    Object.defineProperty(prototype, 'computeWorldVertices', {
        value (slot: spine.Slot, start: number, count: number, worldVertices: number[], offset: number, stride: number) {
            const length = worldVertices.length;
            vectors.resize(length, 0);
            for (let i = 0; i < length; i++) vectors.set(i, worldVertices[i]);
            originComputeWorldVertices.call(this, slot, start, count, vectors, offset, stride);
            for (let i = 0; i < length; i++) worldVertices[i] = vectors.get(i);
        },
    });
}

function overrideProperty_MeshAttachment (): void {
    const prototype = spine.MeshAttachment.prototype as any;

    overrideDefineArrayProp(prototype, prototype.getRegionUVs, 'regionUVs');
    overrideDefineArrayProp(prototype, prototype.getUVs, 'uvs');
    overrideDefineArrayProp(prototype, prototype.getTriangles, 'triangles');
    overrideDefineArrayProp(prototype, prototype.getEdges, 'edges');
}

function overrideProperty_PathAttachment (): void {
    const prototype = spine.PathAttachment.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getLengths, 'lengths');
}

function overrideProperty_RegionAttachment (): void {
    const prototype = spine.RegionAttachment.prototype as any;

    overrideDefineArrayProp(prototype, prototype.getOffset, 'offset');
    const getUVs = prototype.getUVs;
    const setUVs = prototype.setUVs;
    const _uvs = '_uvs';
    Object.defineProperty(prototype, 'uvs', {
        get (): any {
            const vectors = getUVs.call(this);
            const count = vectors.size();
            let array = prototype[_uvs];
            array = resizeArray(array, count);
            for (let i = 0; i < count; i++) array[i] = vectors.get(i);
            prototype[_uvs] = array;
            return array;
        },
        set (value: number[]) {
            setUVs.call(this, value[0], value[1], value[2], value[3], value[4] === 1);
        },
    });

    const originComputeWorldVertices = prototype.computeWorldVertices;
    const vectors = new spine.SPVectorFloat();
    Object.defineProperty(prototype, 'computeWorldVertices', {
        value (bone: spine.Bone, worldVertices: number[], offset: number, stride: number) {
            const length = worldVertices.length;
            vectors.resize(length, 0);
            for (let i = 0; i < length; i++) vectors.set(i, worldVertices[i]);
            originComputeWorldVertices.call(this, bone, vectors, offset, stride);
            for (let i = 0; i < length; i++) worldVertices[i] = vectors.get(i);
        },
    });
}

function overrideProperty_IkConstraint (): void {
    const prototype = spine.IkConstraint.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_PathConstraint (): void {
    const prototype = spine.PathConstraint.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_TransformConstraintData (): void {
    const prototype = spine.TransformConstraintData.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_TransformConstraint (): void {
    const prototype = spine.TransformConstraint.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_Bone (): void {
    const prototype = spine.Bone.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getChildren, 'children');
}

function overrideProperty_Slot (): void {
    const prototype = spine.Slot.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getDeform, 'deform');
}

function overrideProperty_Skin (): void {
    const prototype = spine.Skin.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
    overrideDefineArrayProp(prototype, prototype.getAttachments, 'attachments');
    overrideDefineArrayProp(prototype, prototype.getConstraints, 'constraints');
    overrideDefineArrayFunction(prototype, prototype.getAttachments, 'getAttachments');
    const originGetAttachmentsForSlot = prototype.getAttachmentsForSlot;
    Object.defineProperty(prototype, 'getAttachmentsForSlot', {
        value (slotIndex: number, attachments: Array<spine.SkinEntry>) {
            const vectors = originGetAttachmentsForSlot.call(this, slotIndex);
            const count = vectors.size();
            attachments.length = count;
            for (let i = 0; i < count; i++) {
                attachments[i] = vectors.get(i);
            }
            vectors.delete();
        },
    });
    const originFindNamesForSlot = prototype.findNamesForSlot;
    Object.defineProperty(prototype, 'findNamesForSlot', {
        value (slotIndex: number, names: Array<string>) {
            const vectors = originFindNamesForSlot.call(this, slotIndex);
            const count = vectors.size();
            names.length = count;
            for (let i = 0; i < count; i++) {
                names[i] = vectors.get(i);
            }
            vectors.delete();
        },
    });
}

function overrideProperty_SkinEntry (): void {
    const prototype = spine.SkinEntry.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
        ['attachment', prototype.getAttachment],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
}

function overrideProperty_SkeletonData (): void {
    const prototype = spine.SkeletonData.prototype as any;

    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
    overrideDefineArrayProp(prototype, prototype.getSlots, 'slots');
    overrideDefineArrayProp(prototype, prototype.getSkins, 'skins');
    overrideDefineArrayProp(prototype, prototype.getAnimations, 'animations');
    overrideDefineArrayProp(prototype, prototype.getEvents, 'events');
    overrideDefineArrayProp(prototype, prototype.getIkConstraints, 'ikConstraints');
    overrideDefineArrayProp(prototype, prototype.getTransformConstraints, 'transformConstraints');
    overrideDefineArrayProp(prototype, prototype.getPathConstraints, 'pathConstraints');
}

function overrideProperty_RotateTimeline (): void {
    const prototype = spine.RotateTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
}

function overrideProperty_ColorTimeline (): void {
    const prototype = spine.ColorTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
}

function overrideProperty_AttachmentTimeline (): void {
    const prototype = spine.AttachmentTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
    overrideDefineArrayProp(prototype, prototype.getAttachmentNames, 'attachmentNames');
}

function overrideProperty_DeformTimeline (): void {
    const prototype = spine.DeformTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
    overrideDefineArrayArrayProp(prototype, prototype.getFrameVertices, 'frameVertices');
}

function overrideProperty_EventTimeline (): void {
    const prototype = spine.EventTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
    overrideDefineArrayProp(prototype, prototype.getEvents, 'events');
}

function overrideProperty_DrawOrderTimeline (): void {
    const prototype = spine.DrawOrderTimeline.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
}

function overrideProperty_AnimationState (): void {
    const prototype = spine.AnimationState.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getTracks, 'tracks');
}

function overrideProperty_Animation (): void {
    const prototype = spine.Animation.prototype as any;
    overrideDefineArrayProp(prototype, prototype.getTimelines, 'timelines');
}

function overrideProperty_Skeleton (): void {
    const prototype = spine.Skeleton.prototype as any;

    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
    overrideDefineArrayProp(prototype, prototype.getSlots, 'slots');
    overrideDefineArrayProp(prototype, prototype.getDrawOrder, 'drawOrder');
    overrideDefineArrayProp(prototype, prototype.getIkConstraints, 'ikConstraints');
    overrideDefineArrayProp(prototype, prototype.getTransformConstraints, 'transformConstraints');
    overrideDefineArrayProp(prototype, prototype.getPathConstraints, 'pathConstraints');
    overrideDefineArrayProp(prototype, prototype.getUpdateCacheList, '_updateCache');
}

export function overrideSpineDefine (wasm): void {
    overrideClass(wasm);
    overrideProperty_IkConstraintData();
    overrideProperty_PathConstraintData();
    overrideProperty_MeshAttachment();
    overrideProperty_PathAttachment();
    overrideProperty_RegionAttachment();
    overrideProperty_VertexAttachment();
    overrideProperty_IkConstraint();
    overrideProperty_PathConstraint();
    overrideProperty_TransformConstraintData();
    overrideProperty_TransformConstraint();
    overrideProperty_Bone();
    overrideProperty_Slot();
    overrideProperty_Skin();
    overrideProperty_SkinEntry();
    overrideProperty_SkeletonData();
    overrideProperty_RotateTimeline();
    overrideProperty_ColorTimeline();
    overrideProperty_AttachmentTimeline();
    overrideProperty_DeformTimeline();
    overrideProperty_EventTimeline();
    overrideProperty_DrawOrderTimeline();
    overrideProperty_AnimationState();
    overrideProperty_Animation();
    overrideProperty_Skeleton();
}
