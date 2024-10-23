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

function overrideDefinePtrStringFunction (prototype: any, getPtr: any, name: string): void {
    Object.defineProperty(prototype, name, {
        value (): string {
            let str = '';
            const ptr = getPtr.call(this);
            const HEAPU8 = spine.wasmUtil.wasm.HEAPU8;
            const length = this.length;
            const buffer = HEAPU8.subarray(ptr, ptr + length);
            str = String.fromCharCode(...buffer);
            return str;
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

function overrideProperty_String (): void {
    const prototype = spine.String.prototype as any;
    const propertyPolyfills = [
        ['length', prototype.length],
        ['isEmpty', prototype.isEmpty],
        ['str', prototype.str],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.get(prototype, prop[0], prop[1]);
    });
    overrideDefinePtrStringFunction(prototype, prototype.strPtr, 'strPtr');
}

function overrideProperty_Vector2 (): void {
    const prototype = spine.Vector2.prototype as any;
    const propertyPolyfills = [
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.get(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_BoneData (): void {
    const prototype = spine.BoneData.prototype as any;
    const propertyPolyfills = [
        ['index', prototype.getIndex],
        ['name', prototype.getName],
        ['parent', prototype.getParent],
        ['length', prototype.getLength, prototype.setLength],
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
        ['rotation', prototype.getRotation, prototype.setRotation],
        ['scaleX', prototype.getScaleX, prototype.setScaleX],
        ['scaleY', prototype.getScaleY, prototype.setScaleY],
        ['shearX', prototype.getShearX, prototype.setShearX],
        ['shearY', prototype.getShearY, prototype.setShearY],
        ['transformMode', prototype.getTransformMode, prototype.setTransformMode],
        ['skinRequired', prototype.getSkinRequired, prototype.setSkinRequired],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_Attachment (): void {
    const prototype = spine.Attachment.prototype as any;
    js.getset(prototype, 'name', prototype.getName);
}

function overrideProperty_ConstraintData (): void {
    const prototype = spine.ConstraintData.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
        ['order', prototype.getOrder, prototype.setOder],
        ['skinRequired', prototype.getSkinRequired, prototype.setSkinRequired],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_IkConstraintData (): void {
    const prototype = spine.IkConstraintData.prototype as any;
    const propertyPolyfills = [
        ['target', prototype.getTarget, prototype.setTarget],
        ['bendDirection', prototype.getBendDirection, prototype.setBendDirection],
        ['compress', prototype.getCompress, prototype.setCompress],
        ['stretch', prototype.getStretch, prototype.setStretch],
        ['uniform', prototype.getUniform, prototype.setUniform],
        ['mix', prototype.getMix, prototype.setMix],
        ['softness', prototype.getSoftness, prototype.setSoftness],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_PathConstraintData (): void {
    const prototype = spine.PathConstraintData.prototype as any;
    const propertyPolyfills = [
        ['target', prototype.getTarget, prototype.setTarget],
        ['positionMode', prototype.getPositionMode, prototype.setPositionMode],
        ['spacingMode', prototype.getSpacingMode, prototype.setSpacingMode],
        ['rotateMode', prototype.getRotateMode, prototype.setRotateMode],
        ['offsetRotation', prototype.getOffsetRotation, prototype.setOffsetRotation],
        ['position', prototype.getPosition, prototype.setPosition],
        ['spacing', prototype.getSpacing, prototype.setSpacing],
        ['rotateMix', prototype.getRotateMix, prototype.setRotateMix],
        ['translateMix', prototype.getTranslateMix, prototype.setTranslateMix],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_Event (): void {
    const prototype = spine.Event.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['intValue', prototype.getIntValue, prototype.setIntValue],
        ['floatValue', prototype.getFloatValue, prototype.setFloatValue],
        ['stringValue', prototype.getStringValue, prototype.setStringValue],
        ['time', prototype.getTime],
        ['volume', prototype.getVolume, prototype.setVolume],
        ['balance', prototype.getBalance, prototype.setBalance],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_EventData (): void {
    const prototype = spine.EventData.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
        ['intValue', prototype.getIntValue, prototype.setIntValue],
        ['floatValue', prototype.getFloatValue, prototype.setFloatValue],
        ['stringValue', prototype.getStringValue, prototype.setStringValue],
        ['audioPath', prototype.getAudioPath, prototype.setAudioPath],
        ['volume', prototype.getVolume, prototype.setVolume],
        ['balance', prototype.getBalance, prototype.setBalance],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_VertexAttachment (): void {
    const prototype = spine.VertexAttachment.prototype as any;
    const propertyPolyfills = [
        ['id', prototype.getId],
        ['worldVerticesLength', prototype.getWorldVerticesLength, prototype.setWorldVerticesLength],
        ['deformAttachment', prototype.getDeformAttachment, prototype.setDeformAttachment],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
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

function overrideProperty_BoundingBoxAttachment (): void {
    const prototype = spine.BoundingBoxAttachment.prototype as any;
    js.getset(prototype, 'name', prototype.getName);
}

function overrideProperty_ClippingAttachment (): void {
    const prototype = spine.ClippingAttachment.prototype as any;
    js.getset(prototype, 'endSlot', prototype.getEndSlot, prototype.setEndSlot);
}

function overrideProperty_MeshAttachment (): void {
    const prototype = spine.MeshAttachment.prototype as any;
    const propertyPolyfills = [
        ['path', prototype.getPath, prototype.setPath],
        ['color', prototype.getColor],
        ['width', prototype.getWidth, prototype.setWidth],
        ['height', prototype.getHeight, prototype.setHeight],
        ['hullLength', prototype.getHullLength, prototype.setHullLength],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getRegionUVs, 'regionUVs');
    overrideDefineArrayProp(prototype, prototype.getUVs, 'uvs');
    overrideDefineArrayProp(prototype, prototype.getTriangles, 'triangles');
    overrideDefineArrayProp(prototype, prototype.getEdges, 'edges');
}

function overrideProperty_PathAttachment (): void {
    const prototype = spine.PathAttachment.prototype as any;
    const propertyPolyfills = [
        ['closed', prototype.getClosed, prototype.setClosed],
        ['constantSpeed', prototype.getConstantSpeed, prototype.setConstantSpeed],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getLengths, 'lengths');
}

function overrideProperty_PointAttachment (): void {
    const prototype = spine.PointAttachment.prototype as any;
    const propertyPolyfills = [
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
        ['rotation', prototype.getRotation, prototype.setRotation],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_RegionAttachment (): void {
    const prototype = spine.RegionAttachment.prototype as any;
    const propertyPolyfills = [
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
        ['scaleX', prototype.getScaleX, prototype.setScaleX],
        ['scaleY', prototype.getScaleY, prototype.setScaleY],
        ['rotation', prototype.getRotation, prototype.setRotation],
        ['width', prototype.getWidth, prototype.setWidth],
        ['height', prototype.getHeight, prototype.setHeight],
        ['color', prototype.getColor],
        ['path', prototype.getPath, prototype.setPath],
        ['rendererObject', prototype.getRendererObject],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });

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

function overrideProperty_TextureAtlas (): void {
    // const prototype = spine.TextureAtlas.prototype as any;
    // const propertyPolyfills = [
    //     {
    //         proto: prototype,
    //         property: 'pages',
    //         getter: prototype.getProp_pages,
    //     },
    //     {
    //         proto: prototype,
    //         property: 'regions',
    //         getter: prototype.getProp_regions,
    //     },
    // ];
    // propertyPolyfills.forEach((prop) => {
    //     js.getset(prototype, prop[0], prop[1]);
    // });
}

function overrideProperty_SlotData (): void {
    const prototype = spine.SlotData.prototype as any;
    const propertyPolyfills = [
        ['index', prototype.getIndex],
        ['boneData', prototype.getBoneData],
        ['name', prototype.getName],
        ['color', prototype.getColor],
        ['darkColor', prototype.getDarkColor],
        ['blendMode', prototype.getBlendMode, prototype.setBlendMode],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_IkConstraint (): void {
    const prototype = spine.IkConstraint.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['target', prototype.getTarget, prototype.setTarget],
        ['bendDirection', prototype.getBendDirection, prototype.setBendDirection],
        ['compress', prototype.getCompress, prototype.setCompress],
        ['stretch', prototype.getStretch, prototype.setStretch],
        ['mix', prototype.getMix, prototype.setMix],
        ['softness', prototype.getSoftness, prototype.setSoftness],
        ['active', prototype.getActive, prototype.setActive],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_PathConstraint (): void {
    const prototype = spine.PathConstraint.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['target', prototype.getTarget, prototype.setTarget],
        ['position', prototype.getPosition, prototype.setPosition],
        ['spacing', prototype.getSpacing, prototype.setSpacing],
        ['rotateMix', prototype.getRotateMix, prototype.setRotateMix],
        ['translateMix', prototype.getTranslateMix, prototype.setTranslateMix],
        ['active', prototype.getActive, prototype.setActive],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_TransformConstraintData (): void {
    const prototype = spine.TransformConstraintData.prototype as any;
    const propertyPolyfills = [
        ['target', prototype.getTarget],
        ['rotateMix', prototype.getRotateMix],
        ['translateMix', prototype.getTranslateMix],
        ['scaleMix', prototype.getScaleMix],
        ['shearMix', prototype.getShearMix],
        ['offsetRotation', prototype.getOffsetRotation],
        ['offsetX', prototype.getOffsetX],
        ['offsetY', prototype.getOffsetY],
        ['offsetScaleX', prototype.getOffsetScaleX],
        ['offsetScaleY', prototype.getOffsetScaleY],
        ['offsetShearY', prototype.getOffsetShearY],
        ['relative', prototype.getRelative],
        ['local', prototype.getLocal],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_TransformConstraint (): void {
    const prototype = spine.TransformConstraint.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['target', prototype.getTarget],
        ['rotateMix', prototype.getRotateMix, prototype.setRotateMix],
        ['translateMix', prototype.getTranslateMix, prototype.setTranslateMix],
        ['scaleMix', prototype.getScaleMix, prototype.setScaleMix],
        ['shearMix', prototype.getShearMix, prototype.setShearMix],
        ['active', prototype.getActive, prototype.setActive],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
}

function overrideProperty_Bone (): void {
    const prototype = spine.Bone.prototype as any;
    const propertyPolyfills = [
        ['skeleton', prototype.getSkeleton],
        ['data', prototype.getData],
        ['parent', prototype.getParent],
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
        ['rotation', prototype.getRotation, prototype.setRotation],
        ['scaleX', prototype.getScaleX, prototype.setScaleX],
        ['scaleY', prototype.getScaleY, prototype.setScaleY],
        ['shearX', prototype.getShearX, prototype.setShearX],
        ['shearY', prototype.getShearY, prototype.setShearY],
        ['ax', prototype.getAX, prototype.setAX],
        ['ay', prototype.getAY, prototype.setAY],
        ['arotation', prototype.getARotation, prototype.setARotation],
        ['ascaleX', prototype.getAScaleX, prototype.setAScaleX],
        ['ascaleY', prototype.getAScaleY, prototype.setAScaleY],
        ['ashearX', prototype.getAShearX, prototype.setAShearX],
        ['ashearY', prototype.getAShearY, prototype.setAShearY],
        ['appliedValid', prototype.getAppliedValid, prototype.setAppliedValid],
        ['a', prototype.getA, prototype.setA],
        ['b', prototype.getB, prototype.setB],
        ['c', prototype.getC, prototype.setC],
        ['d', prototype.getD, prototype.setD],
        ['worldX', prototype.getWorldX, prototype.setWorldX],
        ['worldY', prototype.getWorldY, prototype.setWorldY],
        ['active', prototype.getActive, prototype.setActive],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getChildren, 'children');
}

function overrideProperty_Slot (): void {
    const prototype = spine.Slot.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['bone', prototype.getBone],
        ['color', prototype.getColor],
        ['darkColor', prototype.getDarkColor],
        ['skeleton', prototype.getSkeleton],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getDeform, 'deform');
}

function overrideProperty_Skin (): void {
    const prototype = spine.Skin.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
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

function overrideProperty_SkeletonClipping (): void {
    const prototype = spine.SkeletonClipping.prototype as any;
    const propertyPolyfills = [
        ['clippedVertices', prototype.getClippedVertices],
        ['clippedTriangles', prototype.getClippedTriangles],
        ['clippedUVs', prototype.getClippedUVs],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
}

function overrideProperty_SkeletonData (): void {
    const prototype = spine.SkeletonData.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
        ['defaultSkin', prototype.getDefaultSkin, prototype.setDefaultSkin],
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
        ['width', prototype.getWidth, prototype.setWidth],
        ['height', prototype.getHeight, prototype.setHeight],
        ['version', prototype.getVersion, prototype.setVersion],
        ['hash', prototype.getHash, prototype.setHash],
        ['fps', prototype.getFps, prototype.setFps],
        ['imagesPath', prototype.getImagesPath, prototype.setImagesPath],
        ['audioPath', prototype.getAudioPath, prototype.setAudioPath],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });

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
    const propertyPolyfills = [
        ['boneIndex', prototype.getBoneIndex],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
}

function overrideProperty_ColorTimeline (): void {
    const prototype = spine.ColorTimeline.prototype as any;
    const propertyPolyfills = [
        ['slotIndex', prototype.getSlotIndex],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
}

function overrideProperty_TwoColorTimeline (): void {
    const prototype = spine.TwoColorTimeline.prototype as any;
    const propertyPolyfills = [
        ['slotIndex', prototype.getSlotIndex],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
}

function overrideProperty_AttachmentTimeline (): void {
    const prototype = spine.AttachmentTimeline.prototype as any;
    const propertyPolyfills = [
        ['slotIndex', prototype.getSlotIndex],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
    overrideDefineArrayProp(prototype, prototype.getFrames, 'frames');
    overrideDefineArrayProp(prototype, prototype.getAttachmentNames, 'attachmentNames');
}

function overrideProperty_DeformTimeline (): void {
    const prototype = spine.DeformTimeline.prototype as any;
    const propertyPolyfills = [
        ['slotIndex', prototype.getSlotIndex],
        ['attachment', prototype.getAttachment],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
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

function overrideProperty_TrackEntry (): void {
    const prototype = spine.TrackEntry.prototype as any;
    const propertyPolyfills = [
        ['animation', prototype.getAnimation],
        ['next', prototype.getNext],
        ['mixingFrom', prototype.getMixingFrom],
        ['mixingTo', prototype.getMixingTo],
        ['trackIndex', prototype.getTrackIndex],
        ['loop', prototype.getLoop, prototype.setLoop],
        ['holdPrevious', prototype.getHoldPrevious, prototype.setHoldPrevious],
        ['eventThreshold', prototype.getEventThreshold, prototype.setEventThreshold],
        ['attachmentThreshold', prototype.getAttachmentThreshold, prototype.setAttachmentThreshold],
        ['drawOrderThreshold', prototype.getDrawOrderThreshold, prototype.setDrawOrderThreshold],
        ['animationStart', prototype.getAnimationStart, prototype.setAnimationStart],
        ['animationEnd', prototype.getAnimationEnd, prototype.setAnimationEnd],
        ['animationLast', prototype.getAnimationLast, prototype.setAnimationLast],
        ['delay', prototype.getDelay, prototype.setDelay],
        ['trackTime', prototype.getTrackTime, prototype.setTrackTime],
        ['trackEnd', prototype.getTrackEnd, prototype.setTrackEnd],
        ['timeScale', prototype.getTimeScale, prototype.setTimeScale],
        ['alpha', prototype.getAlpha, prototype.setAlpha],
        ['mixTime', prototype.getMixTime, prototype.setMixTime],
        ['mixDuration', prototype.getMixDuration, prototype.setMixDuration],
        ['mixBlend', prototype.getMixBlend, prototype.setMixBlend],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_AnimationStateData (): void {
    const prototype = spine.AnimationStateData.prototype as any;
    const propertyPolyfills = [
        ['defaultMix', prototype.getDefaultMix],
        ['skeletonData', prototype.getSkeletonData],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1]);
    });
}

function overrideProperty_AnimationState (): void {
    const prototype = spine.AnimationState.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['timeScale', prototype.getTimeScale, prototype.setTimeScale],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });

    overrideDefineArrayProp(prototype, prototype.getTracks, 'tracks');
}

function overrideProperty_Animation (): void {
    const prototype = spine.Animation.prototype as any;
    const propertyPolyfills = [
        ['name', prototype.getName],
        ['duration', prototype.getDuration, prototype.setDuration],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
    overrideDefineArrayProp(prototype, prototype.getTimelines, 'timelines');
}

function overrideProperty_Skeleton (): void {
    const prototype = spine.Skeleton.prototype as any;
    const propertyPolyfills = [
        ['data', prototype.getData],
        ['skin', prototype.getSkin],
        ['color', prototype.getColor],
        ['time', prototype.getTime],
        ['scaleX', prototype.getScaleX, prototype.setScaleX],
        ['scaleY', prototype.getScaleY, prototype.setScaleY],
        ['x', prototype.getX, prototype.setX],
        ['y', prototype.getY, prototype.setY],
    ];
    propertyPolyfills.forEach((prop): void => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });

    overrideDefineArrayProp(prototype, prototype.getBones, 'bones');
    overrideDefineArrayProp(prototype, prototype.getSlots, 'slots');
    overrideDefineArrayProp(prototype, prototype.getDrawOrder, 'drawOrder');
    overrideDefineArrayProp(prototype, prototype.getIkConstraints, 'ikConstraints');
    overrideDefineArrayProp(prototype, prototype.getTransformConstraints, 'transformConstraints');
    overrideDefineArrayProp(prototype, prototype.getPathConstraints, 'pathConstraints');
    overrideDefineArrayProp(prototype, prototype.getUpdateCacheList, '_updateCache');
}

function overrideProperty_JitterEffect (): void {
    const prototype = spine.JitterEffect.prototype as any;
    const propertyPolyfills = [
        ['jitterX', prototype.getJitterX, prototype.setJitterX],
        ['jitterY', prototype.getJitterY, prototype.setJitterY],
    ];
    propertyPolyfills.forEach((prop) => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

function overrideProperty_SwirlEffect (): void {
    const prototype = spine.SwirlEffect.prototype as any;
    const propertyPolyfills = [
        ['centerX', prototype.getCenterX, prototype.setCenterX],
        ['centerY', prototype.getCenterY, prototype.setCenterY],
        ['radius', prototype.getRadius, prototype.setRadius],
        ['angle', prototype.getAngle, prototype.setAngle],
    ];
    propertyPolyfills.forEach((prop) => {
        js.getset(prototype, prop[0], prop[1], prop[2]);
    });
}

export function overrideSpineDefine (wasm): void {
    overrideClass(wasm);
    overrideProperty_String();
    overrideProperty_Vector2();
    overrideProperty_BoneData();
    overrideProperty_ConstraintData();
    overrideProperty_IkConstraintData();
    overrideProperty_PathConstraintData();
    overrideProperty_Event();
    overrideProperty_EventData();
    overrideProperty_BoundingBoxAttachment();
    overrideProperty_ClippingAttachment();
    overrideProperty_MeshAttachment();
    overrideProperty_PathAttachment();
    overrideProperty_PointAttachment();
    overrideProperty_RegionAttachment();
    overrideProperty_VertexAttachment();
    overrideProperty_TextureAtlas();
    overrideProperty_SlotData();
    overrideProperty_IkConstraint();
    overrideProperty_PathConstraint();
    overrideProperty_TransformConstraintData();
    overrideProperty_TransformConstraint();
    overrideProperty_Bone();
    overrideProperty_Slot();
    overrideProperty_Skin();
    overrideProperty_Attachment();
    overrideProperty_SkinEntry();
    overrideProperty_SkeletonClipping();
    overrideProperty_SkeletonData();
    overrideProperty_RotateTimeline();
    overrideProperty_ColorTimeline();
    overrideProperty_TwoColorTimeline();
    overrideProperty_AttachmentTimeline();
    overrideProperty_DeformTimeline();
    overrideProperty_EventTimeline();
    overrideProperty_DrawOrderTimeline();
    overrideProperty_TrackEntry();
    overrideProperty_AnimationStateData();
    overrideProperty_AnimationState();
    overrideProperty_Animation();
    overrideProperty_Skeleton();
    overrideProperty_JitterEffect();
    overrideProperty_SwirlEffect();
}
