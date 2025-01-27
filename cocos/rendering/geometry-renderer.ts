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

import { Color, Mat4, Vec3, Vec4, geometry, warnID, toRadian, cclegacy } from '../core';
import { SetIndex } from './define';
import { PipelineStateManager } from './pipeline-state-manager';
import { Attribute, AttributeName, Buffer, BufferInfo, BufferUsageBit,
    CommandBuffer, Device, DrawInfo, Format, InputAssembler,
    InputAssemblerInfo, MemoryUsageBit, RenderPass } from '../gfx';

import { PipelineSceneData } from './pipeline-scene-data';

const _min = new Vec3();
const _max = new Vec3();
const _v0 = new Vec3();
const _v1 = new Vec3();
const _v2 = new Vec3();
const _v3 = new Vec3();
const _v4 = new Vec3();
const _v5 = new Vec3();
const _v6 = new Vec3();
const _v7 = new Vec3();

/**
 * GEOMETRY_DEPTH_TYPE_COUNT:
 * [0]: no depthTest
 * [1]: depthTest
 */
const GEOMETRY_DEPTH_TYPE_COUNT       = 2;
const GEOMETRY_NO_DEPTH_TEST_PASS_NUM = 1;
const GEOMETRY_DEPTH_TEST_PASS_NUM    = 2;
const GEOMETRY_VERTICES_PER_LINE      = 2;
const GEOMETRY_VERTICES_PER_TRIANGLE  = 3;
const GEOMETRY_MAX_LINES              = 30000;
const GEOMETRY_MAX_DASHED_LINES       = 10000;
const GEOMETRY_MAX_TRIANGLES          = 10000;

enum GeometryType {
    LINE = 0,
    DASHED_LINE = 1,
    TRIANGLE = 2
}

class GeometryVertexBuffer {
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _maxVertices = 0;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _vertexCount = 0;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _stride = 0;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _vertices!: Float32Array;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _buffer!: Buffer;
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _inputAssembler!: InputAssembler;

    public init (device: Device, maxVertices: number, stride: number, attributes: Attribute[]): void {
        this._maxVertices = maxVertices;
        this._vertexCount = 0;
        this._stride = stride;
        this._vertices = new Float32Array(maxVertices * stride / Float32Array.BYTES_PER_ELEMENT);
        this._buffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            maxVertices * stride,
            stride,
        ));
        this._inputAssembler = device.createInputAssembler(new InputAssemblerInfo(attributes, [this._buffer], null));
    }

    public getCount (): number { return Math.min(this._vertexCount, this._maxVertices); }
    public empty (): boolean { return this._vertexCount === 0; }
    public reset (): void { this._vertexCount = 0; }

    public update (): void {
        if (!this.empty()) {
            const count = this.getCount();
            const size = count * this._stride;
            this._buffer.update(this._vertices, size);
        }
    }

    public destroy (): void {
        if (this._inputAssembler) {
            this._inputAssembler.destroy();
        }

        if (this._buffer) {
            this._buffer.destroy();
        }
    }
}

class GeometryVertexBuffers {
    public lines: GeometryVertexBuffer[] = [];
    public dashedLines: GeometryVertexBuffer[] = [];
    public triangles: GeometryVertexBuffer[] = [];

    constructor () {
        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            this.lines[i] = new GeometryVertexBuffer();
            this.dashedLines[i] = new GeometryVertexBuffer();
            this.triangles[i] = new GeometryVertexBuffer();
        }
    }
}

export interface IGeometryInfo {
    maxLines: number;
    maxDashedLines: number;
    maxTriangles: number;
}

export class GeometryRenderer {
    private _device: Device | null = null;
    private _buffers: GeometryVertexBuffers;

    public constructor () {
        this._buffers = new GeometryVertexBuffers();
    }

    public activate (device: Device, info?: IGeometryInfo): void {
        this._device = device;

        const posColorAttributes: Attribute[] = [
            new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
            new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
        ];

        const posNormColorAttributes: Attribute[] = [
            new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
            new Attribute(AttributeName.ATTR_NORMAL, Format.RGBA32F),
            new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
        ];

        const maxLines = info ? info.maxLines : GEOMETRY_MAX_LINES;
        const maxDashedLines = info ? info.maxDashedLines : GEOMETRY_MAX_DASHED_LINES;
        const maxTriangles = info ? info.maxTriangles : GEOMETRY_MAX_TRIANGLES;
        const lineStride = Float32Array.BYTES_PER_ELEMENT * (Vec3.length + Color.length);
        const triangleStride = Float32Array.BYTES_PER_ELEMENT * (Vec3.length + Vec4.length + Color.length);

        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            this._buffers.lines[i].init(this._device, maxLines * GEOMETRY_VERTICES_PER_LINE, lineStride, posColorAttributes);
            this._buffers.dashedLines[i].init(this._device, maxDashedLines * GEOMETRY_VERTICES_PER_LINE, lineStride, posColorAttributes);
            this._buffers.triangles[i].init(this._device, maxTriangles * GEOMETRY_VERTICES_PER_TRIANGLE, triangleStride, posNormColorAttributes);
        }
    }

    public render (renderPass: RenderPass, cmdBuff: CommandBuffer, sceneData: PipelineSceneData): void {
        const passes = sceneData.geometryRendererPasses;
        const shaders = sceneData.geometryRendererShaders;

        let offset = 0;
        const passCount: number[] = [GEOMETRY_NO_DEPTH_TEST_PASS_NUM, GEOMETRY_DEPTH_TEST_PASS_NUM];

        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            const lines = this._buffers.lines[i];
            if (!lines.empty()) {
                const drawInfo = new DrawInfo();
                drawInfo.vertexCount = lines.getCount();

                for (let p = 0; p < passCount[i]; p++) {
                    const pass   = passes[offset + p];
                    const shader = shaders[offset + p];
                    const pso    = PipelineStateManager.getOrCreatePipelineState(this._device!, pass, shader, renderPass, lines._inputAssembler);
                    cmdBuff.bindPipelineState(pso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
                    cmdBuff.bindInputAssembler(lines._inputAssembler);
                    cmdBuff.draw(drawInfo);
                }
            }

            offset += passCount[i];
        }

        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            const dashedLines = this._buffers.dashedLines[i];
            if (!dashedLines.empty()) {
                const drawInfo = new DrawInfo();
                drawInfo.vertexCount = dashedLines.getCount();

                for (let p = 0; p < passCount[i]; p++) {
                    const pass   = passes[offset + p];
                    const shader = shaders[offset + p];
                    const pso = PipelineStateManager.getOrCreatePipelineState(this._device!, pass, shader, renderPass, dashedLines._inputAssembler);
                    cmdBuff.bindPipelineState(pso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
                    cmdBuff.bindInputAssembler(dashedLines._inputAssembler);
                    cmdBuff.draw(drawInfo);
                }
            }

            offset += passCount[i];
        }

        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            const triangles = this._buffers.triangles[i];
            if (!triangles.empty()) {
                const drawInfo = new DrawInfo();
                drawInfo.vertexCount = triangles.getCount();

                for (let p = 0; p < passCount[i]; p++) {
                    const pass   = passes[offset + p];
                    const shader = shaders[offset + p];
                    const pso    = PipelineStateManager.getOrCreatePipelineState(this._device!, pass, shader, renderPass, triangles._inputAssembler);
                    cmdBuff.bindPipelineState(pso);
                    cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
                    cmdBuff.bindInputAssembler(triangles._inputAssembler);
                    cmdBuff.draw(drawInfo);
                }
            }

            offset += passCount[i];
        }

        // reset all geometry data for next frame
        this.reset();
    }

    public destroy (): void {
        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            this._buffers.lines[i].destroy();
            this._buffers.dashedLines[i].destroy();
            this._buffers.triangles[i].destroy();
        }
    }

    public empty (): boolean {
        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            if (!this._buffers.lines[i].empty()
                || !this._buffers.dashedLines[i].empty()
                || !this._buffers.triangles[i].empty()) {
                return false;
            }
        }

        return true;
    }

    public update (): void {
        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            this._buffers.lines[i].update();
            this._buffers.dashedLines[i].update();
            this._buffers.triangles[i].update();
        }
    }

    public reset (): void {
        for (let i = 0; i < GEOMETRY_DEPTH_TYPE_COUNT; i++) {
            this._buffers.lines[i].reset();
            this._buffers.dashedLines[i].reset();
            this._buffers.triangles[i].reset();
        }
    }

    public addDashedLine (v0: Vec3, v1: Vec3, color: Color, depthTest = true): void {
        const dashedLines = this._buffers.dashedLines[depthTest ? 1 : 0];
        if (dashedLines._vertexCount + GEOMETRY_VERTICES_PER_LINE > dashedLines._maxVertices) {
            warnID(12008);
            return;
        }

        // add v0 vertex
        let offset = dashedLines._vertexCount * (Vec3.length + Color.length);
        Vec3.toArray(dashedLines._vertices, v0, offset);
        offset += Vec3.length;
        Color.toArray(dashedLines._vertices, color, offset);
        offset += Color.length;

        // add v1 vertex
        Vec3.toArray(dashedLines._vertices, v1, offset);
        offset += Vec3.length;
        Color.toArray(dashedLines._vertices, color, offset);

        dashedLines._vertexCount += GEOMETRY_VERTICES_PER_LINE;
    }

    public addLine (v0: Vec3, v1: Vec3, color: Color, depthTest = true): void {
        const lines = this._buffers.lines[depthTest ? 1 : 0];
        if (lines._vertexCount + GEOMETRY_VERTICES_PER_LINE > lines._maxVertices) {
            warnID(12008);
            return;
        }

        // add v0 vertex
        let offset = lines._vertexCount * (Vec3.length + Color.length);
        Vec3.toArray(lines._vertices, v0, offset);
        offset += Vec3.length;
        Color.toArray(lines._vertices, color, offset);
        offset += Color.length;

        // add v1 vertex
        Vec3.toArray(lines._vertices, v1, offset);
        offset += Vec3.length;
        Color.toArray(lines._vertices, color, offset);

        lines._vertexCount += GEOMETRY_VERTICES_PER_LINE;
    }

    public addTriangle (v0: Vec3, v1: Vec3, v2: Vec3, color: Color, wireframe = true, depthTest = true, unlit = false): void {
        if (wireframe) {
            this.addLine(v0, v1, color, depthTest);
            this.addLine(v1, v2, color, depthTest);
            this.addLine(v2, v0, color, depthTest);
            return;
        }

        const triangles = this._buffers.triangles[depthTest ? 1 : 0];
        if (triangles._vertexCount + GEOMETRY_VERTICES_PER_TRIANGLE > triangles._maxVertices) {
            warnID(12009);
            return;
        }

        const normal = new Vec4(Vec4.ZERO);
        if (!unlit) {
            const dist1 = new Vec3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
            const dist2 = new Vec3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
            const norm = new Vec3();
            Vec3.normalize(norm, Vec3.cross(norm, dist1, dist2));
            normal.set(norm.x, norm.y, norm.z, 1.0);
        }

        // add v0 vertex
        let offset = triangles._vertexCount * (Vec3.length + Vec4.length + Color.length);
        Vec3.toArray(triangles._vertices, v0, offset);
        offset += Vec3.length;
        Vec4.toArray(triangles._vertices, normal, offset);
        offset += Vec4.length;
        Color.toArray(triangles._vertices, color, offset);
        offset += Color.length;

        // add v1 vertex
        Vec3.toArray(triangles._vertices, v1, offset);
        offset += Vec3.length;
        Vec4.toArray(triangles._vertices, normal, offset);
        offset += Vec4.length;
        Color.toArray(triangles._vertices, color, offset);
        offset += Color.length;

        // add v2 vertex
        Vec3.toArray(triangles._vertices, v2, offset);
        offset += Vec3.length;
        Vec4.toArray(triangles._vertices, normal, offset);
        offset += Vec4.length;
        Color.toArray(triangles._vertices, color, offset);

        triangles._vertexCount += GEOMETRY_VERTICES_PER_TRIANGLE;
    }

    public addQuad (v0: Vec3, v1: Vec3, v2: Vec3, v3: Vec3, color: Color, wireframe = true, depthTest = true, unlit = false): void {
        /**
         *  3---2
         *  |   |
         *  0---1
         */

        if (wireframe) {
            this.addLine(v0, v1, color, depthTest);
            this.addLine(v1, v2, color, depthTest);
            this.addLine(v2, v3, color, depthTest);
            this.addLine(v3, v0, color, depthTest);
        } else {
            this.addTriangle(v0, v1, v2, color, wireframe, depthTest, unlit);
            this.addTriangle(v0, v2, v3, color, wireframe, depthTest, unlit);
        }
    }

    public addBoundingBox (
        aabb: geometry.AABB,
        color: Color,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Mat4 = new Mat4(),
    ): void {
        /**
         *     2---3
         *    /   /
         *   6---7
         *     0---1
         *    /   /
         *   4---5
         *
         */

        _min.set(aabb.center.x - aabb.halfExtents.x, aabb.center.y - aabb.halfExtents.y, aabb.center.z - aabb.halfExtents.z);
        _max.set(aabb.center.x + aabb.halfExtents.x, aabb.center.y + aabb.halfExtents.y, aabb.center.z + aabb.halfExtents.z);

        _v0.set(_min.x, _min.y, _min.z);
        _v1.set(_max.x, _min.y, _min.z);
        _v2.set(_min.x, _max.y, _min.z);
        _v3.set(_max.x, _max.y, _min.z);
        _v4.set(_min.x, _min.y, _max.z);
        _v5.set(_max.x, _min.y, _max.z);
        _v6.set(_min.x, _max.y, _max.z);
        _v7.set(_max.x, _max.y, _max.z);

        if (useTransform) {
            Vec3.transformMat4(_v0, _v0, transform);
            Vec3.transformMat4(_v1, _v1, transform);
            Vec3.transformMat4(_v2, _v2, transform);
            Vec3.transformMat4(_v3, _v3, transform);
            Vec3.transformMat4(_v4, _v4, transform);
            Vec3.transformMat4(_v5, _v5, transform);
            Vec3.transformMat4(_v6, _v6, transform);
            Vec3.transformMat4(_v7, _v7, transform);
        }

        if (wireframe) {
            this.addLine(_v6, _v7, color, depthTest);
            this.addLine(_v7, _v3, color, depthTest);
            this.addLine(_v3, _v2, color, depthTest);
            this.addLine(_v2, _v6, color, depthTest);

            this.addLine(_v4, _v5, color, depthTest);
            this.addLine(_v5, _v1, color, depthTest);
            this.addLine(_v1, _v0, color, depthTest);
            this.addLine(_v0, _v4, color, depthTest);

            this.addLine(_v6, _v4, color, depthTest);
            this.addLine(_v7, _v5, color, depthTest);
            this.addLine(_v3, _v1, color, depthTest);
            this.addLine(_v2, _v0, color, depthTest);
        } else {
            this.addQuad(_v4, _v5, _v7, _v6, color, wireframe, depthTest, unlit);
            this.addQuad(_v5, _v1, _v3, _v7, color, wireframe, depthTest, unlit);
            this.addQuad(_v1, _v0, _v2, _v3, color, wireframe, depthTest, unlit);
            this.addQuad(_v0, _v4, _v6, _v2, color, wireframe, depthTest, unlit);
            this.addQuad(_v6, _v7, _v3, _v2, color, wireframe, depthTest, unlit);
            this.addQuad(_v0, _v1, _v5, _v4, color, wireframe, depthTest, unlit);
        }
    }

    public addCross (position: Vec3, size: number, color: Color, depthTest = true): void {
        const halfSize = size * 0.5;

        const v0 = new Vec3(position.x - halfSize, position.y, position.z);
        const v1 = new Vec3(position.x + halfSize, position.y, position.z);
        this.addLine(v0, v1, color, depthTest);

        v0.set(position.x, position.y - halfSize, position.z);
        v1.set(position.x, position.y + halfSize, position.z);
        this.addLine(v0, v1, color, depthTest);

        v0.set(position.x, position.y, position.z - halfSize);
        v1.set(position.x, position.y, position.z + halfSize);
        this.addLine(v0, v1, color, depthTest);
    }

    public addFrustum (frustum: geometry.Frustum, color: Color, depthTest = true): void {
        const vertices = frustum.vertices;

        this.addLine(vertices[0], vertices[1], color, depthTest);
        this.addLine(vertices[1], vertices[2], color, depthTest);
        this.addLine(vertices[2], vertices[3], color, depthTest);
        this.addLine(vertices[3], vertices[0], color, depthTest);

        this.addLine(vertices[4], vertices[5], color, depthTest);
        this.addLine(vertices[5], vertices[6], color, depthTest);
        this.addLine(vertices[6], vertices[7], color, depthTest);
        this.addLine(vertices[7], vertices[4], color, depthTest);

        this.addLine(vertices[0], vertices[4], color, depthTest);
        this.addLine(vertices[1], vertices[5], color, depthTest);
        this.addLine(vertices[2], vertices[6], color, depthTest);
        this.addLine(vertices[3], vertices[7], color, depthTest);
    }

    public addCapsule (
        center: Vec3,
        radius: number,
        height: number,
        color: Color,
        segmentsU = 32,
        hemiSegmentsV = 8,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi   = Math.PI * 2.0 / segmentsU;
        const deltaTheta = Math.PI / 2.0 / hemiSegmentsV;
        const bottomCenter = new Vec3(center.x, center.y - height / 2.0, center.z);
        const topCenter = new Vec3(center.x, center.y + height / 2.0, center.z);

        const bottomPoints: Vec3[][] = [];
        const topPoints: Vec3[][] = [];

        for (let i = 0; i < hemiSegmentsV + 1; i++) {
            const bottomList: Vec3[] = [];
            const topList: Vec3[] = [];

            const theta    = i * deltaTheta;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let j = 0; j < segmentsU + 1; j++) {
                const phi    = j * deltaPhi;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const  p = new Vec3(radius * sinTheta * cosPhi, radius * cosTheta, radius * sinTheta * sinPhi);

                const p0 = new Vec3(bottomCenter.x + p.x, bottomCenter.y - p.y, bottomCenter.z + p.z);
                const p1 = new Vec3(topCenter.x + p.x, topCenter.y + p.y, topCenter.z + p.z);
                bottomList.push(p0);
                topList.push(p1);
            }

            bottomPoints.push(bottomList);
            topPoints.push(topList);
        }

        if (useTransform) {
            for (let i = 0; i < hemiSegmentsV + 1; i++) {
                for (let j = 0; j < segmentsU + 1; j++) {
                    Vec3.transformMat4(bottomPoints[i][j], bottomPoints[i][j], transform);
                    Vec3.transformMat4(topPoints[i][j], topPoints[i][j], transform);
                }
            }
        }

        for (let i = 0; i < hemiSegmentsV; i++) {
            for (let j = 0; j < segmentsU; j++) {
                this.addTriangle(bottomPoints[i + 1][j], bottomPoints[i][j + 1], bottomPoints[i][j], color, wireframe, depthTest, unlit);
                this.addTriangle(bottomPoints[i + 1][j], bottomPoints[i + 1][j + 1], bottomPoints[i][j + 1], color, wireframe, depthTest, unlit);

                this.addTriangle(topPoints[i][j], topPoints[i + 1][j + 1], topPoints[i + 1][j], color, wireframe, depthTest, unlit);
                this.addTriangle(topPoints[i][j], topPoints[i][j + 1], topPoints[i + 1][j + 1], color, wireframe, depthTest, unlit);
            }
        }

        const bottomCircle = bottomPoints[hemiSegmentsV];
        const topCircle    = topPoints[hemiSegmentsV];
        for (let j = 0; j < segmentsU; j++) {
            this.addTriangle(topCircle[j], bottomCircle[j + 1], bottomCircle[j], color, wireframe, depthTest, unlit);
            this.addTriangle(topCircle[j], topCircle[j + 1], bottomCircle[j + 1], color, wireframe, depthTest, unlit);
        }
    }

    public addCylinder (
        center: Vec3,
        radius: number,
        height: number,
        color: Color,
        segments = 32,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi = Math.PI * 2.0 / segments;
        const bottomCenter = new Vec3(center.x, center.y - height / 2.0, center.z);
        const topCenter = new Vec3(center.x, center.y + height / 2.0, center.z);
        const bottomPoints: Vec3[] = [];
        const topPoints: Vec3[] = [];

        for (let i = 0; i < segments + 1; i++) {
            const phi = i * deltaPhi;
            const p = new Vec3(radius * Math.cos(phi), 0.0, radius * Math.sin(phi));
            const p0 = new Vec3(p.x + bottomCenter.x, p.y + bottomCenter.y, p.z + bottomCenter.z);
            const p1 = new Vec3(p.x + topCenter.x, p.y + topCenter.y, p.z + topCenter.z);
            bottomPoints.push(p0);
            topPoints.push(p1);
        }

        if (useTransform) {
            Vec3.transformMat4(bottomCenter, bottomCenter, transform);
            Vec3.transformMat4(topCenter, topCenter, transform);

            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(bottomPoints[i], bottomPoints[i], transform);
                Vec3.transformMat4(topPoints[i], topPoints[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addTriangle(topCenter, topPoints[i + 1], topPoints[i], color, wireframe, depthTest, unlit);
            this.addTriangle(bottomCenter, bottomPoints[i], bottomPoints[i + 1], color, wireframe, depthTest, unlit);

            this.addTriangle(topPoints[i], bottomPoints[i + 1], bottomPoints[i], color, wireframe, depthTest, unlit);
            this.addTriangle(topPoints[i], topPoints[i + 1], bottomPoints[i + 1], color, wireframe, depthTest, unlit);
        }
    }

    public addCone (
        center: Vec3,
        radius: number,
        height: number,
        color: Color,
        segments = 32,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi = Math.PI * 2.0 / segments;
        const bottomCenter = new Vec3(center.x, center.y - height / 2.0, center.z);
        const topCenter = new Vec3(center.x, center.y + height / 2.0, center.z);
        const bottomPoints: Vec3[] = [];

        for (let i = 0; i < segments + 1; i++) {
            const point = new Vec3(radius * Math.cos(i * deltaPhi), 0.0, radius * Math.sin(i * deltaPhi));
            const p0 = new Vec3(point.x + bottomCenter.x, point.y + bottomCenter.y, point.z + bottomCenter.z);
            bottomPoints.push(p0);
        }

        if (useTransform) {
            Vec3.transformMat4(bottomCenter, bottomCenter, transform);
            Vec3.transformMat4(topCenter, topCenter, transform);

            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(bottomPoints[i], bottomPoints[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addTriangle(topCenter, bottomPoints[i + 1], bottomPoints[i], color, wireframe, depthTest, unlit);
            this.addTriangle(bottomCenter, bottomPoints[i], bottomPoints[i + 1], color, wireframe, depthTest, unlit);
        }
    }

    public addCircle (center: Vec3, radius: number, color: Color, segments = 32, depthTest = true, useTransform = false, transform: Readonly<Mat4> = Mat4.IDENTITY): void {
        const deltaPhi = Math.PI * 2.0 / segments;
        const points: Vec3[] = [];

        for (let i = 0; i < segments + 1; i++) {
            const point = new Vec3(radius * Math.cos(i * deltaPhi), 0.0, radius * Math.sin(i * deltaPhi));
            const p0 = new Vec3(point.x + center.x, point.y + center.y, point.z + center.z);
            points.push(p0);
        }

        if (useTransform) {
            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(points[i], points[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addLine(points[i], points[i + 1], color, depthTest);
        }
    }

    public addArc (
        center: Vec3,
        radius: number,
        color: Color,
        startAngle: number,
        endAngle: number,
        segments = 32,
        depthTest = true,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const startRadian = toRadian(startAngle);
        const endRadian = toRadian(endAngle);
        const deltaPhi = (endRadian - startRadian) / segments;
        const points: Vec3[] = [];

        for (let i = 0; i < segments + 1; i++) {
            const point = new Vec3(radius * Math.cos(i * deltaPhi + startRadian), 0.0, radius * Math.sin(i * deltaPhi + startRadian));
            const p0 = new Vec3(point.x + center.x, point.y + center.y, point.z + center.z);
            points.push(p0);
        }

        if (useTransform) {
            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(points[i], points[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addLine(points[i], points[i + 1], color, depthTest);
        }
    }

    public addPolygon (
        center: Vec3,
        radius: number,
        color: Color,
        segments = 6,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        if (wireframe) {
            this.addCircle(center, radius, color, segments, depthTest, useTransform, transform);
        } else {
            this.addDisc(center, radius, color, segments, wireframe, depthTest, unlit, useTransform, transform);
        }
    }

    public addDisc (
        center: Vec3,
        radius: number,
        color: Color,
        segments = 32,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi = Math.PI * 2.0 / segments;
        const points: Vec3[] = [];
        const newCenter = new Vec3(center);

        for (let i = 0; i < segments + 1; i++) {
            const point = new Vec3(radius * Math.cos(i * deltaPhi), 0.0, radius * Math.sin(i * deltaPhi));
            const p0 = new Vec3(point.x + newCenter.x, point.y + newCenter.y, point.z + newCenter.z);
            points.push(p0);
        }

        if (useTransform) {
            Vec3.transformMat4(newCenter, newCenter, transform);

            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(points[i], points[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addTriangle(newCenter, points[i], points[i + 1], color, wireframe, depthTest, unlit);
        }

        // two sides
        if (!wireframe) {
            for (let i = 0; i < segments; i++) {
                this.addTriangle(newCenter, points[i + 1], points[i], color, wireframe, depthTest, unlit);
            }
        }
    }

    public addSector (
        center: Vec3,
        radius: number,
        color: Color,
        startAngle: number,
        endAngle: number,
        segments = 32,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const startRadian = toRadian(startAngle);
        const endRadian   = toRadian(endAngle);
        const deltaPhi    = (endRadian - startRadian) / segments;
        const points: Vec3[] = [];
        const newCenter = new Vec3(center);

        for (let i = 0; i < segments + 1; i++) {
            const point = new Vec3(radius * Math.cos(i * deltaPhi), 0.0, radius * Math.sin(i * deltaPhi));
            const p0 = new Vec3(point.x + newCenter.x, point.y + newCenter.y, point.z + newCenter.z);
            points.push(p0);
        }

        if (useTransform) {
            Vec3.transformMat4(newCenter, newCenter, transform);

            for (let i = 0; i < segments + 1; i++) {
                Vec3.transformMat4(points[i], points[i], transform);
            }
        }

        for (let i = 0; i < segments; i++) {
            this.addTriangle(newCenter, points[i], points[i + 1], color, wireframe, depthTest, unlit);
        }

        // two sides
        if (!wireframe) {
            for (let i = 0; i < segments; i++) {
                this.addTriangle(newCenter, points[i + 1], points[i], color, wireframe, depthTest, unlit);
            }
        }
    }

    public addSphere (
        center: Vec3,
        radius: number,
        color: Color,
        segmentsU = 32,
        segmentsV = 16,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi   = Math.PI * 2.0 / segmentsU;
        const deltaTheta = Math.PI / segmentsV;
        const points: Vec3[][] = [];

        for (let i = 0; i < segmentsV + 1; i++) {
            const list: Vec3[] = [];

            const theta    = i * deltaTheta;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let j = 0; j < segmentsU + 1; j++) {
                const phi    = j * deltaPhi;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const p = new Vec3(radius * sinTheta * cosPhi, radius * cosTheta, radius * sinTheta * sinPhi);
                const p0 = new Vec3(center.x + p.x, center.y + p.y, center.z + p.z);

                list.push(p0);
            }

            points.push(list);
        }

        if (useTransform) {
            for (let i = 0; i < segmentsV + 1; i++) {
                for (let j = 0; j < segmentsU + 1; j++) {
                    Vec3.transformMat4(points[i][j], points[i][j], transform);
                }
            }
        }

        for (let i = 0; i < segmentsV; i++) {
            for (let j = 0; j < segmentsU; j++) {
                this.addTriangle(points[i][j], points[i + 1][j + 1], points[i + 1][j], color, wireframe, depthTest, unlit);
                this.addTriangle(points[i][j], points[i][j + 1], points[i + 1][j + 1], color, wireframe, depthTest, unlit);
            }
        }
    }

    public addTorus (
        center: Vec3,
        bigRadius: number,
        radius: number,
        color: Color,
        segmentsU = 32,
        segmentsV = 16,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaPhi   = Math.PI * 2.0 / segmentsU;
        const deltaTheta = Math.PI * 2.0 / segmentsV;
        const points: Vec3[][] = [];

        for (let i = 0; i < segmentsU + 1; i++) {
            const list: Vec3[] = [];
            const phi    = i * deltaPhi;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            for (let j = 0; j < segmentsV + 1; j++) {
                const theta    = j * deltaTheta;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                const p = new Vec3((bigRadius + radius * cosTheta) * cosPhi, radius * sinTheta, (bigRadius + radius * cosTheta) * sinPhi);
                const p0 = new Vec3(center.x + p.x, center.y + p.y, center.z + p.z);

                list.push(p0);
            }

            points.push(list);
        }

        if (useTransform) {
            for (let i = 0; i < segmentsU + 1; i++) {
                for (let j = 0; j < segmentsV + 1; j++) {
                    Vec3.transformMat4(points[i][j], points[i][j], transform);
                }
            }
        }

        for (let i = 0; i < segmentsU; i++) {
            for (let j = 0; j < segmentsV; j++) {
                this.addTriangle(points[i][j + 1], points[i + 1][j], points[i][j], color, wireframe, depthTest, unlit);
                this.addTriangle(points[i][j + 1], points[i + 1][j + 1], points[i + 1][j], color, wireframe, depthTest, unlit);
            }
        }
    }

    public addOctahedron (
        center: Vec3,
        radius: number,
        color: Color,
        wireframe = true,
        depthTest = true,
        unlit = false,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const points: Vec3[] = [];

        points.push(new Vec3(radius + center.x, center.y, center.z));
        points.push(new Vec3(center.x, center.y, center.z - radius));
        points.push(new Vec3(-radius + center.x, center.y, center.z));
        points.push(new Vec3(center.x, center.y, center.z + radius));
        points.push(new Vec3(center.x, center.y + radius, center.z));
        points.push(new Vec3(center.x, center.y - radius, center.z));

        if (useTransform) {
            for (let i = 0; i < points.length; i++) {
                Vec3.transformMat4(points[i], points[i], transform);
            }
        }

        if (wireframe) {
            this.addLine(points[0], points[1], color, depthTest);
            this.addLine(points[1], points[2], color, depthTest);
            this.addLine(points[2], points[3], color, depthTest);
            this.addLine(points[3], points[0], color, depthTest);

            this.addLine(points[0], points[4], color, depthTest);
            this.addLine(points[1], points[4], color, depthTest);
            this.addLine(points[2], points[4], color, depthTest);
            this.addLine(points[3], points[4], color, depthTest);

            this.addLine(points[0], points[5], color, depthTest);
            this.addLine(points[1], points[5], color, depthTest);
            this.addLine(points[2], points[5], color, depthTest);
            this.addLine(points[3], points[5], color, depthTest);
        } else {
            this.addTriangle(points[0], points[1], points[4], color, wireframe, depthTest, unlit);
            this.addTriangle(points[1], points[2], points[4], color, wireframe, depthTest, unlit);
            this.addTriangle(points[2], points[3], points[4], color, wireframe, depthTest, unlit);
            this.addTriangle(points[3], points[0], points[4], color, wireframe, depthTest, unlit);
            this.addTriangle(points[0], points[3], points[5], color, wireframe, depthTest, unlit);
            this.addTriangle(points[3], points[2], points[5], color, wireframe, depthTest, unlit);
            this.addTriangle(points[2], points[1], points[5], color, wireframe, depthTest, unlit);
            this.addTriangle(points[1], points[0], points[5], color, wireframe, depthTest, unlit);
        }
    }

    public addBezier (
        v0: Vec3,
        v1: Vec3,
        v2: Vec3,
        v3: Vec3,
        color: Color,
        segments = 32,
        depthTest = true,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        const deltaT = 1.0 / segments;
        const points: Vec3[] = [];

        const newV0 = new Vec3(v0);
        const newV1 = new Vec3(v1);
        const newV2 = new Vec3(v2);
        const newV3 = new Vec3(v3);

        if (useTransform) {
            Vec3.transformMat4(newV0, newV0, transform);
            Vec3.transformMat4(newV1, newV1, transform);
            Vec3.transformMat4(newV2, newV2, transform);
            Vec3.transformMat4(newV3, newV3, transform);
        }

        for (let i = 0; i < segments + 1; i++) {
            const t = i * deltaT;
            const a = (1.0 - t) * (1.0 - t) * (1.0 - t);
            const b = 3.0 * t * (1.0 - t) * (1.0 - t);
            const c = 3.0 * t * t * (1.0 - t);
            const d = t * t * t;
            const p0 = new Vec3(
                a * newV0.x + b * newV1.x + c * newV2.x + d * newV3.x,
                a * newV0.y + b * newV1.y + c * newV2.y + d * newV3.y,
                a * newV0.z + b * newV1.z + c * newV2.z + d * newV3.z,
            );

            points.push(p0);
        }

        for (let i = 0; i < segments; i++) {
            this.addLine(points[i], points[i + 1], color, depthTest);
        }
    }

    public addSpline (spline: geometry.Spline, color: Color, index = 0xffffffff, knotSize = 0.5, segments = 32, depthTest = true, useTransform = false, transform: Readonly<Mat4> = Mat4.IDENTITY): void {
        const numPoints = segments + 1;
        const points = spline.getPoints(numPoints, index);

        if (useTransform) {
            points.forEach((v: Vec3) => {
                v.transformMat4(transform);
            });
        }

        for (let i = 0; i < segments; i++) {
            this.addLine(points[i], points[i + 1], color, depthTest);
        }

        if (knotSize > 0.0 && index === 0xffffffff) {
            const crossColor = new Color(255 - color.r, 255 - color.g, 255 - color.b, color.a);
            const numKnots = spline.getKnotCount();
            const knots = spline.knots;

            for (let i = 0; i < numKnots; i++) {
                let knot = knots[i];
                if (useTransform) {
                    knot = knot.clone().transformMat4(transform);
                }
                this.addCross(knot, knotSize, crossColor, depthTest);
            }
        }
    }

    public addMesh (center: Vec3, vertices: Array<Vec3>, color: Color, depthTest = true, useTransform = false, transform: Readonly<Mat4> = Mat4.IDENTITY): void {
        for (let i = 0; i < vertices.length; i += 3) {
            const v0 = new Vec3(center.x + vertices[i].x, center.y + vertices[i].y, center.z + vertices[i].z);
            const v1 = new Vec3(center.x + vertices[i + 1].x, center.y + vertices[i + 1].y, center.z + vertices[i + 1].z);
            const v2 = new Vec3(center.x + vertices[i + 2].x, center.y + vertices[i + 2].y, center.z + vertices[i + 2].z);

            if (useTransform) {
                Vec3.transformMat4(v0, v0, transform);
                Vec3.transformMat4(v1, v1, transform);
                Vec3.transformMat4(v2, v2, transform);
            }

            this.addLine(v0, v1, color, depthTest);
            this.addLine(v1, v2, color, depthTest);
            this.addLine(v2, v0, color, depthTest);
        }
    }

    public addIndexedMesh (
        center: Vec3,
        vertices: Array<Vec3>,
        indices: Array<number>,
        color: Color,
        depthTest = true,
        useTransform = false,
        transform: Readonly<Mat4> = Mat4.IDENTITY,
    ): void {
        for (let i = 0; i < indices.length; i += 3) {
            const v0 = new Vec3(center.x + vertices[indices[i]].x, center.y + vertices[indices[i]].y, center.z + vertices[indices[i]].z);
            const v1 = new Vec3(center.x + vertices[indices[i + 1]].x, center.y + vertices[indices[i + 1]].y, center.z + vertices[indices[i + 1]].z);
            const v2 = new Vec3(center.x + vertices[indices[i + 2]].x, center.y + vertices[indices[i + 2]].y, center.z + vertices[indices[i + 2]].z);

            if (useTransform) {
                Vec3.transformMat4(v0, v0, transform);
                Vec3.transformMat4(v1, v1, transform);
                Vec3.transformMat4(v2, v2, transform);
            }

            this.addLine(v0, v1, color, depthTest);
            this.addLine(v1, v2, color, depthTest);
            this.addLine(v2, v0, color, depthTest);
        }
    }
}

cclegacy.internal.GeometryRenderer = GeometryRenderer;
