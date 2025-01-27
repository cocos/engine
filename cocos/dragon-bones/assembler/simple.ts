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

import { Armature, BlendMode } from '@cocos/dragonbones-js';
import { Color, Mat4, Vec3, cclegacy } from '../../core';
import { BlendFactor } from '../../gfx';
import { vfmtPosUvColor } from '../../2d/renderer/vertex-format';
import { MaterialInstance } from '../../render-scene/core/material-instance';
import type { IAssembler } from '../../2d/renderer/base';
import { ArmatureFrame } from '../ArmatureCache';
import { ArmatureDisplay } from '../ArmatureDisplay';
import { CCSlot } from '../CCSlot';
import { StaticVBAccessor } from '../../2d/renderer/static-vb-accessor';
import { RenderData } from '../../2d/renderer/render-data';
import type { Texture2D } from '../../asset/assets';
import type { TextureBase } from '../../asset/assets/texture-base';
import type { Node } from '../../scene-graph';
import { director } from '../../game';
import type { IBatcher } from '../../2d/renderer/i-batcher';

const NEED_COLOR = 0x01;
const NEED_BATCH = 0x10;

const _boneColor = new Color(255, 0, 0, 255);
const _slotColor = new Color(0, 0, 255, 255);
const _originColor = new Color(0, 255, 0, 255);

/** node R [0,1] */
let _nodeR: number;
/** node G [0,1] */
let _nodeG: number;
/** node B [0,1] */
let _nodeB: number;
/** node alpha [0,1] */
let _nodeA: number;

let _premultipliedAlpha: boolean;
let _multiply: number;
let _mustFlush: boolean;
let _renderData: RenderData | null;
let _ibuf: Uint16Array;
let _vbuf: Float32Array;
let _node: Node | undefined;
let _comp: ArmatureDisplay | undefined;
let _vertexFloatCount = 0;
let _vertexCount = 0;
let _vertexOffset = 0;
let _vertexFloatOffset = 0;
let _indexCount = 0;
let _indexOffset = 0;
let _actualVCount = 0;
let _actualICount = 0;
let _prevDrawIndexOffset = 0;
const LOCAL_FLOAT_PER_VERTEX  = 4; //xyuv
const PER_VERTEX_SIZE = 3 + 2 + 4; //xyz-uv-rgba;

const _c = new Float32Array(4);
let _handleVal: number;
const _tempVecPos = new Vec3(0, 0, 0);
const _slotMat = new Mat4();

let _currentMaterial: MaterialInstance | null = null;
let _currentTexture: Texture2D | null = null;

function _getSlotMaterial (tex: TextureBase | null, blendMode: BlendMode): MaterialInstance | null {
    if (!tex) return null;

    let src: BlendFactor;
    let dst: BlendFactor;
    switch (blendMode) {
    case 1:// additive
        src = _premultipliedAlpha ? BlendFactor.ONE : BlendFactor.SRC_ALPHA;
        dst = BlendFactor.ONE;
        break;
    case 10:// multiply
        src = BlendFactor.DST_COLOR;
        dst = BlendFactor.ONE_MINUS_SRC_ALPHA;
        break;
    case 12:// screen
        src = BlendFactor.ONE;
        dst = BlendFactor.ONE_MINUS_SRC_COLOR;
        break;
    case 0:// normal
    default:
        src = _premultipliedAlpha ? BlendFactor.ONE : BlendFactor.SRC_ALPHA;
        dst = BlendFactor.ONE_MINUS_SRC_ALPHA;
        break;
    }
    return _comp!.getMaterialForBlend(src, dst);
}

function _handleColor (color: {r: number, g: number, b: number, a: number}, parentOpacity: number): void {
    const _a = color.a * parentOpacity * _nodeA;
    const _multiply = _premultipliedAlpha ? _a / 255.0 : 1.0;
    const _r = color.r * _nodeR * _multiply / 255.0;
    const _g = color.g * _nodeG * _multiply / 255.0;
    const _b = color.b * _nodeB * _multiply / 255.0;
    _c[0] = _r;
    _c[1] = _g;
    _c[2] = _b;
    _c[3] = _premultipliedAlpha ? 1.0 : _a / 255.0;
}

let _accessor: StaticVBAccessor = null!;
/**
 * @engineInternal Since v3.7.2 this is an engine private object.
 * simple 组装器
 * 可通过 `UI.simple` 获取该组装器。
 */
class Simple implements IAssembler {
    private accessor = _accessor;
    private vCount = 32767;
    ensureAccessor (): StaticVBAccessor {
        if (!_accessor) {
            const device = director.root!.device;
            const batcher = director.root!.batcher2D;
            const attributes = vfmtPosUvColor;
            this.accessor = _accessor = new StaticVBAccessor(device, attributes, this.vCount);
            // Register to batcher so that batcher can upload buffers after batching process
            batcher.registerBufferAccessor(Number.parseInt('DRAGONBONES', 36), _accessor);
        }
        return this.accessor;
    }

    createData (comp: ArmatureDisplay): RenderData {
        let rd = comp.renderData;
        if (!rd) {
            this.ensureAccessor();
            const slots = comp._armature!._slots;
            let vCount = 0;
            let iCount = 0;
            for (let i = 0; i < slots.length; ++i) {
                const slot = slots[i] as CCSlot;
                const remainder = slot._localVertices.length % 4;
                if (remainder === 0) {
                    vCount += slot._localVertices.length / LOCAL_FLOAT_PER_VERTEX;
                } else {
                    vCount += (slot._localVertices.length - remainder) / LOCAL_FLOAT_PER_VERTEX + 1;
                }
                iCount += slot._indices.length;
            }

            rd = RenderData.add(vfmtPosUvColor, this.accessor);
            rd.resize(vCount, iCount);
            if (!rd.indices || iCount !== rd.indices.length) {
                rd.indices = new Uint16Array(iCount);
            }
        }
        return rd;
    }

    updateRenderData (comp: ArmatureDisplay): void {
        _comp = comp;
        const armature = comp._armature;
        if (armature) {
            updateComponentRenderData(comp);
        }
    }

    updateColor (comp: ArmatureDisplay): void {
        if (!comp) return;
        _comp = comp;
        _comp.markForUpdateRenderData();
    }
}

export const simple = new Simple();

function realTimeTraverse (armature: Armature, parentOpacity: number, worldMat?: Mat4): void {
    const rd = _renderData!;
    _vbuf = rd.chunk.vb;
    _ibuf = rd.indices!;

    const slots = armature._slots;
    let material: MaterialInstance;
    let vertices: number[];
    let indices: number[];
    let slotColor: Color;
    let slot: CCSlot;

    let cumulatedCount = 0;

    for (let i = 0, l = slots.length; i < l; i++) {
        slot = slots[i] as CCSlot;
        slotColor = slot._color;

        if (!slot._visible || !slot._displayData) continue;

        if (worldMat) {
            /* enable batch or recursive armature */
            Mat4.multiply(slot._worldMatrix, worldMat, slot._matrix);
        } else {
            Mat4.copy(slot._worldMatrix, slot._matrix);
        }

        if (slot.childArmature) {
            realTimeTraverse(slot.childArmature, slotColor.a / 255, slot._worldMatrix);
            continue;
        }

        material = _getSlotMaterial(slot.getTexture(), slot._blendMode)!;
        if (!material) {
            continue;
        }
        if (!_currentMaterial) _currentMaterial = material;

        const texture = slot.getTexture();

        if (_mustFlush || material.hash !== _currentMaterial.hash || (texture && _currentTexture !== texture)) {
            _mustFlush = false;
            const cumulatedCount = _indexOffset - _prevDrawIndexOffset;
            // Submit draw data
            if (cumulatedCount > 0) {
                _comp!._requestDrawData(_currentMaterial, _currentTexture!, _prevDrawIndexOffset, cumulatedCount);
                _prevDrawIndexOffset = _indexOffset;
            }
            _currentTexture = texture;
            _currentMaterial = material;
        }

        _handleColor(slotColor, parentOpacity);
        _slotMat.set(slot._worldMatrix);

        vertices = slot._localVertices;
        _vertexCount = vertices.length / LOCAL_FLOAT_PER_VERTEX;
        _vertexFloatCount = _vertexCount * PER_VERTEX_SIZE;
        indices = slot._indices;
        _indexCount = indices.length;

        // Slot and vertices in armature may be replaced in some cases
        // (for example caused by CCFactory.replaceSlotDisplay)
        let isResize = false;
        if (_vertexOffset + _vertexCount > _actualVCount) {
            _actualVCount = _vertexOffset + _vertexCount;
            isResize = true;
        }
        if (_indexOffset + _indexCount > _actualICount) {
            _actualICount = _indexOffset + _indexCount;
            isResize = true;
        }
        if (isResize) {
            const oldIndices = _ibuf;
            const oldChunkOffset = rd.chunk.vertexOffset;
            rd.resizeAndCopy(_actualVCount, _actualICount > rd.indexCount ? _actualICount : rd.indexCount);
            _vbuf = rd.chunk.vb;
            if (_actualICount > _ibuf.length) {
                _ibuf = rd.indices = new Uint16Array(_actualICount);
            }
            const correction = rd.chunk.vertexOffset - oldChunkOffset;
            for (let i = 0; i < _indexOffset; ++i) {
                _ibuf[i] = oldIndices[i] + correction;
            }
        }

        // vertext format:
        //       x y z u v r g b a
        for (let vi = 0, vl = vertices.length, v = _vertexFloatOffset; vi < vl; v += PER_VERTEX_SIZE) {
            _tempVecPos.x = vertices[vi++];
            _tempVecPos.y = vertices[vi++];
            _tempVecPos.z = 0;
            _tempVecPos.transformMat4(_slotMat);

            _vbuf[v] = _tempVecPos.x;
            _vbuf[v + 1] = _tempVecPos.y;
            _vbuf[v + 2] = _tempVecPos.z;

            _vbuf[v + 3] = vertices[vi++]; // u
            _vbuf[v + 4] = vertices[vi++]; // v

            _vbuf.set(_c, v + 5);// color
        }
        const chunkOffset = rd.chunk.vertexOffset;
        for (let i = 0, il = indices.length, ii = _indexOffset; i < il; i++, ii++) {
            _ibuf[ii] = _vertexOffset + indices[i] + chunkOffset;
        }
        _vertexFloatOffset += _vertexFloatCount;
        _vertexOffset += _vertexCount;
        _indexOffset += _indexCount;
        _vertexCount = 0;
        _indexCount = 0;
    }

    cumulatedCount = _indexOffset - _prevDrawIndexOffset;
    if (_currentTexture && cumulatedCount > 0) {
        _comp!._requestDrawData(_currentMaterial!, _currentTexture, _prevDrawIndexOffset, cumulatedCount);
        _prevDrawIndexOffset = _indexOffset;
    }
    if (_comp!.maxIndexCount < _actualICount) {
        _comp!.maxIndexCount = _actualICount;
    }
    if (_comp!.maxVertexCount < _actualVCount) {
        _comp!.maxVertexCount = _actualVCount;
    }
}

function cacheTraverse (frame: ArmatureFrame | null, parentMat?: Mat4): void {
    if (!frame) return;
    const segments = frame.segments;
    if (segments.length === 0) return;

    let material: MaterialInstance | null = null;
    // let offsetInfo;
    const vertices = frame.vertices;
    const indices = frame.indices;

    let chunkOffset = 0;
    let frameVFOffset = 0;
    let frameIndexOffset = 0;
    let segVFCount = 0;

    let colorOffset = 0;
    const colors = frame.colors;
    let nowColor = colors[colorOffset++];
    let maxVFOffset = nowColor.vfOffset!;
    _handleColor(nowColor, 1.0);

    const rd = _renderData!;
    const vbuf = rd.chunk.vb;
    const ibuf = rd.indices!;

    for (let i = 0, n = segments.length; i < n; i++) {
        const segInfo = segments[i];
        material = _getSlotMaterial(segInfo.tex, segInfo.blendMode)!;
        if (!material) continue;
        if (!_currentMaterial) _currentMaterial = material;
        if (_mustFlush || material.hash !== _currentMaterial.hash || (segInfo.tex && segInfo.tex !== _currentTexture)) {
            _mustFlush = false;
            const cumulatedCount = _indexOffset - _prevDrawIndexOffset;
            // Submit draw data
            if (cumulatedCount > 0) {
                _comp!._requestDrawData(_currentMaterial, _currentTexture!, _prevDrawIndexOffset, cumulatedCount);
                _prevDrawIndexOffset = _indexOffset;
            }
            _currentMaterial = material;
            _currentTexture = segInfo.tex!;
        }

        _vertexCount = segInfo.vertexCount;
        _indexCount = segInfo.indexCount;

        // Fill indices
        chunkOffset = rd.chunk.vertexOffset;
        for (let ii = _indexOffset, il = _indexOffset + _indexCount; ii < il; ii++) {
            ibuf[ii] = chunkOffset + _vertexOffset + indices[frameIndexOffset++];
        }

        // Fill vertices
        segVFCount = segInfo.vfCount;
        const subArray = vertices.subarray(frameVFOffset, segVFCount);
        vbuf.set(subArray, frameVFOffset);

        let offset = 0;
        if (parentMat) {
            for (let ii = 0, il = _vertexCount; ii < il; ii++) {
                _tempVecPos.x = vbuf[offset];
                _tempVecPos.y = vbuf[offset + 1];
                _tempVecPos.z = 0;
                _tempVecPos.transformMat4(parentMat);
                vbuf[offset] = _tempVecPos.x;
                vbuf[offset + 1] = _tempVecPos.y;
                vbuf[offset + 2] = _tempVecPos.z;
                offset += PER_VERTEX_SIZE;
            }
        }
        if ((_handleVal & NEED_COLOR)) {
            // handle color
            // tip: step of frameColorOffset should fix with vertex attributes, (xyzuvrgba--xyuvc)
            let frameColorOffset = frameVFOffset / 9 * 5;
            for (let ii = frameVFOffset, iEnd = frameVFOffset + segVFCount; ii < iEnd; ii += PER_VERTEX_SIZE, frameColorOffset += 5) {
                if (frameColorOffset >= maxVFOffset) {
                    nowColor = colors[colorOffset++];
                    _handleColor(nowColor, 1.0);
                    maxVFOffset = nowColor.vfOffset!;
                }
                vbuf.set(_c, ii + 5);
            }
        }
        // Segment increment
        frameVFOffset += segVFCount;
        _vertexOffset += _vertexCount;
        _indexOffset += _indexCount;
        _vertexCount = 0;
        _indexCount = 0;
    }
    const cumulatedCount = _indexOffset - _prevDrawIndexOffset;
    if (_currentTexture && cumulatedCount > 0) {
        _comp!._requestDrawData(_currentMaterial!, _currentTexture, _prevDrawIndexOffset, cumulatedCount);
    }
}

function updateComponentRenderData (comp: ArmatureDisplay): void {
    // comp.node._renderFlag |= RenderFlow.FLAG_UPDATE_RENDER_DATA;

    const armature = comp._armature;
    if (!armature || comp.renderData === null) return;

    // Init temp var.
    _mustFlush = true;
    _premultipliedAlpha = comp.premultipliedAlpha;
    // Reuse draw list
    comp.drawList.reset();
    _comp = comp;
    _node = comp.node;
    _renderData = comp.renderData!;
    _comp = comp;
    _handleVal = 0;
    _currentMaterial = null;

    const nodeColor = comp.color;
    _nodeR = nodeColor.r / 255;
    _nodeG = nodeColor.g / 255;
    _nodeB = nodeColor.b / 255;
    _nodeA = comp.node._uiProps.opacity;
    if (Color.toUint32(nodeColor) !== 0xffffffff) {
        _handleVal |= NEED_COLOR;
    }

    const worldMat = comp.node.getWorldMatrix();

    _vertexFloatCount = 0;
    _vertexOffset = 0;
    _vertexFloatOffset = 0;
    _indexCount = 0;
    _indexOffset = 0;
    _prevDrawIndexOffset = 0;
    _actualVCount = _comp.maxVertexCount;
    _actualICount = _comp.maxIndexCount;

    if (comp.isAnimationCached()) {
        // Traverse input assembler.
        cacheTraverse(comp._curFrame, worldMat);
    } else {
        // Traverse all armature.
        realTimeTraverse(armature, 1.0, worldMat);

        const graphics = comp._debugDraw;
        if (comp.debugBones && graphics) {
            graphics.clear();

            graphics.lineWidth = 5;
            graphics.strokeColor = _boneColor;
            graphics.fillColor = _slotColor; // Root bone color is same as slot color.

            const bones = armature.getBones();
            for (let i = 0, l = bones.length; i < l; i++) {
                const bone = bones[i];
                const boneLength = Math.max(bone.boneData.length, 5);
                const startX = bone.globalTransformMatrix.tx;
                const startY = bone.globalTransformMatrix.ty;
                const endX = startX + bone.globalTransformMatrix.a * boneLength;
                const endY = startY + bone.globalTransformMatrix.b * boneLength;

                graphics.moveTo(startX, startY);
                graphics.lineTo(endX, endY);
                graphics.stroke();

                // Bone origins.
                graphics.circle(startX, startY, Math.PI * 2);
                graphics.fill();
                if (i === 0) {
                    graphics.fillColor = _originColor;
                }
            }
        }
    }
    // Ensure mesh buffer update
    _accessor.getMeshBuffer(_renderData.chunk.bufferId).setDirty();

    // Clear temp var.
    _node = undefined;
    _comp = undefined;
}

cclegacy.internal.DragonBonesAssembler = simple;
