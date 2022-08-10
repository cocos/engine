/*
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import { Mat3 } from '../../core/math/mat3';
import { EPSILON } from '../../core/math/utils';
import { Vec3 } from '../../core/math/vec3';
import { warnID } from '../../core/platform/debug';

export class Vertex {
    public position: Vec3;
    public normal = new Vec3(0, 0, 0);
    public coefficients: Vec3[] = [];

    public constructor (pos: Vec3) {
        this.position = new Vec3(pos);
    }
}

class Edge {
    public tetrahedron = -1;    // tetrahedron index this edge belongs to
    public index = -1;          // index in triangle's three edges of an outer cell
    public vertex0 = -1;
    public vertex1 = -1;

    public constructor (tet: number, i: number, v0: number, v1: number) {
        this.tetrahedron = tet;
        this.index = i;
        this.vertex0 = v0;
        this.vertex1 = v1;
    }

    public isSame (other: Edge) {
        return ((this.vertex0 === other.vertex0 && this.vertex1 === other.vertex1)
                || (this.vertex0 === other.vertex1 && this.vertex1 === other.vertex0));
    }
}

class Triangle {
    public invalid = false;
    public isHullSurface = true;
    public tetrahedron = -1;    // tetrahedron index this triangle belongs to
    public index = -1;          // index in tetrahedron's four triangles
    public vertex0 = -1;
    public vertex1 = -1;
    public vertex2 = -1;

    public constructor (tet: number, i: number, v0: number, v1: number, v2: number) {
        this.tetrahedron = tet;
        this.index = i;
        this.vertex0 = v0;
        this.vertex1 = v1;
        this.vertex2 = v2;
    }

    public isSame (other: Triangle) {
        return ((this.vertex0 === other.vertex0 && this.vertex1 === other.vertex1 && this.vertex2 === other.vertex2)
                || (this.vertex0 === other.vertex0 && this.vertex1 === other.vertex2 && this.vertex2 === other.vertex1)
                || (this.vertex0 === other.vertex1 && this.vertex1 === other.vertex0 && this.vertex2 === other.vertex2)
                || (this.vertex0 === other.vertex1 && this.vertex1 === other.vertex2 && this.vertex2 === other.vertex0)
                || (this.vertex0 === other.vertex2 && this.vertex1 === other.vertex0 && this.vertex2 === other.vertex1)
                || (this.vertex0 === other.vertex2 && this.vertex1 === other.vertex1 && this.vertex2 === other.vertex0));
    }
}

class CircumSphere {
    public center = new Vec3(0, 0, 0);
    public radiusSquared = 0.0;

    public init (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3) {
        // calculate circumsphere of 4 points in R^3 space.
        const mat = new Mat3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z,
            p2.x - p0.x, p2.y - p0.y, p2.z - p0.z,
            p3.x - p0.x, p3.y - p0.y, p3.z - p0.z);
        mat.invert();
        mat.transpose();

        const n = new Vec3(((p1.x + p0.x) * (p1.x - p0.x) + (p1.y + p0.y) * (p1.y - p0.y) + (p1.z + p0.z) * (p1.z - p0.z)) * 0.5,
            ((p2.x + p0.x) * (p2.x - p0.x) + (p2.y + p0.y) * (p2.y - p0.y) + (p2.z + p0.z) * (p2.z - p0.z)) * 0.5,
            ((p3.x + p0.x) * (p3.x - p0.x) + (p3.y + p0.y) * (p3.y - p0.y) + (p3.z + p0.z) * (p3.z - p0.z)) * 0.5);

        Vec3.transformMat3(this.center, n, mat);
        this.radiusSquared = Vec3.squaredDistance(p0, this.center);
    }
}

/**
 * inner tetrahedron or outer cell structure
 */
export class Tetrahedron {
    public invalid = false;
    public vertex0 = -1;
    public vertex1 = -1;
    public vertex2 = -1;
    public vertex3 = -1;     // -1 means outer cell, otherwise inner tetrahedron
    public neighbours: number[] = [-1, -1, -1, -1]

    public matrix = new Mat3();
    public offset = new Vec3();         // only valid in outer cell
    public barycentric = new Vec3();    // only valid in inner tetrahedron
    public sphere = new CircumSphere(); // only valid in inner tetrahedron

    // inner tetrahedron or outer cell constructor
    public constructor (delaunay: Delaunay, v0: number, v1: number, v2: number, v3 = -1) {
        this.vertex0 = v0;
        this.vertex1 = v1;
        this.vertex2 = v2;
        this.vertex3 = v3;

        // inner tetrahedron
        if (v3 !== -1) {
            const probes = delaunay.getProbes();
            const p0 = probes[this.vertex0].position;
            const p1 = probes[this.vertex1].position;
            const p2 = probes[this.vertex2].position;
            const p3 = probes[this.vertex3].position;

            this.barycentric = new Vec3(0.0, 0.0, 0.0);
            Vec3.add(this.barycentric, p0, p1);
            Vec3.add(this.barycentric, this.barycentric, p2);
            Vec3.add(this.barycentric, this.barycentric, p3);
            Vec3.multiplyScalar(this.barycentric, this.barycentric, 0.25);
            this.sphere.init(p0, p1, p2, p3);
        }
    }

    public isInCircumSphere (point: Vec3) {
        return Vec3.squaredDistance(point, this.sphere.center) <= this.sphere.radiusSquared;
    }

    public contain (vertexIndex: number) {
        return (this.vertex0 === vertexIndex || this.vertex1 === vertexIndex
            || this.vertex2 === vertexIndex || this.vertex3 === vertexIndex);
    }
}

export class Delaunay {
    private _probes: Vertex[] = [];
    private _tetrahedrons: Tetrahedron[] = [];

    public getProbes () { return this._probes; }
    public getTetrahedrons () { return this._tetrahedrons; }

    public build (points: Vec3[]) {
        this.reset();

        const pointCount = points.length;
        if (pointCount < 4) {
            warnID(17000);
            return;
        }

        for (let i = 0; i < points.length; i++) {
            this._probes.push(new Vertex(points[i]));
        }

        this.tetrahedralize();
        this.computeAdjacency();
        this.computeMatrices();
    }

    public getResults (probes: Vertex[], tetrahedrons: Tetrahedron[]) {
        probes = this._probes;
        tetrahedrons = this._tetrahedrons;
    }

    private reset () {
        this._probes.length = 0;
        this._tetrahedrons.length = 0;
    }

    /**
     * Bowyer-Watson algorithm
     */
    private tetrahedralize () {
        // get probe count first
        const probeCount = this._probes.length;

        // init a super tetrahedron containing all probes
        const center = this.initTetrahedron();

        for (let i = 0; i < probeCount; i++) {
            this.addProbe(i);
        }

        // remove all tetrahedrons which contain the super tetrahedron's vertices
        this._tetrahedrons = this._tetrahedrons.filter((tetrahedron) => {
            const vertexIndex = probeCount;
            const isSuperTetrahedron = (
                tetrahedron.contain(vertexIndex)
                || tetrahedron.contain(vertexIndex + 1)
                || tetrahedron.contain(vertexIndex + 2)
                || tetrahedron.contain(vertexIndex + 3));

            return !isSuperTetrahedron;
        });

        // remove all additional points in the super tetrahedron
        this._probes.length = probeCount;

        this.reorder(center);
    }

    private initTetrahedron () {
        const minPos = new Vec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        const maxPos = new Vec3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

        for (let i = 0; i < this._probes.length; i++) {
            const position = this._probes[i].position;
            minPos.x = Math.min(minPos.x, position.x);
            maxPos.x = Math.max(maxPos.x, position.x);

            minPos.y = Math.min(minPos.y, position.y);
            maxPos.y = Math.max(maxPos.y, position.y);

            minPos.z = Math.min(minPos.z, position.z);
            maxPos.z = Math.max(maxPos.z, position.z);
        }

        const center = new Vec3(0.0, 0.0, 0.0);
        Vec3.add(center, minPos, maxPos);
        Vec3.multiplyScalar(center, center, 0.5);

        const extent = new Vec3(0.0, 0.0, 0.0);
        Vec3.subtract(extent, maxPos, minPos);
        const offset = Math.max(extent.x, extent.y, extent.z) * 10.0;

        const p0 = new Vec3(center.x, center.y + offset, center.z);
        const p1 = new Vec3(center.x - offset, center.y - offset, center.z - offset);
        const p2 = new Vec3(center.x - offset, center.y - offset, center.z + offset);
        const p3 = new Vec3(center.x + offset, center.y - offset, center.z);

        const index = this._probes.length;
        this._probes.push(new Vertex(p0));
        this._probes.push(new Vertex(p1));
        this._probes.push(new Vertex(p2));
        this._probes.push(new Vertex(p3));

        this._tetrahedrons.push(new Tetrahedron(this, index, index + 1, index + 2, index + 3));

        return center;
    }

    private addProbe (vertexIndex: number) {
        let triangles: Triangle[] = [];
        const probe = this._probes[vertexIndex];

        for (let i = 0; i < this._tetrahedrons.length; i++) {
            const tetrahedron = this._tetrahedrons[i];
            if (tetrahedron.isInCircumSphere(probe.position)) {
                tetrahedron.invalid = true;

                triangles.push(new Triangle(i, 0, tetrahedron.vertex1, tetrahedron.vertex3, tetrahedron.vertex2));
                triangles.push(new Triangle(i, 1, tetrahedron.vertex0, tetrahedron.vertex2, tetrahedron.vertex3));
                triangles.push(new Triangle(i, 2, tetrahedron.vertex0, tetrahedron.vertex3, tetrahedron.vertex1));
                triangles.push(new Triangle(i, 3, tetrahedron.vertex0, tetrahedron.vertex1, tetrahedron.vertex2));
            }
        }

        for (let i = 0; i < triangles.length; i++) {
            for (let k = i + 1; k < triangles.length; k++) {
                if (triangles[i].isSame(triangles[k])) {
                    triangles[i].invalid = true;
                    triangles[k].invalid = true;
                }
            }
        }

        // remove all duplicated triangles.
        triangles = triangles.filter((triangle) => !triangle.invalid);

        // remove containing tetrahedron
        this._tetrahedrons = this._tetrahedrons.filter((tetrahedron) => !tetrahedron.invalid);

        for (let i = 0; i < triangles.length; i++) {
            const triangle = triangles[i];
            this._tetrahedrons.push(new Tetrahedron(this, triangle.vertex0, triangle.vertex1, triangle.vertex2, vertexIndex));
        }
    }

    private reorder (center: Vec3) {
        // The tetrahedron in the middle is placed at the front of the vector
        this._tetrahedrons.sort((a, b) => Vec3.squaredDistance(a.barycentric, center) - Vec3.squaredDistance(b.barycentric, center));
    }

    private computeAdjacency () {
        const triangles: Triangle[] = [];
        const edges: Edge[] = [];
        const normal = new Vec3(0.0, 0.0, 0.0);
        const edge1 = new Vec3(0.0, 0.0, 0.0);
        const edge2 = new Vec3(0.0, 0.0, 0.0);

        const tetrahedronCount = this._tetrahedrons.length;

        for (let i = 0; i < this._tetrahedrons.length; i++) {
            const tetrahedron = this._tetrahedrons[i];

            triangles.push(new Triangle(i, 0, tetrahedron.vertex1, tetrahedron.vertex3, tetrahedron.vertex2));
            triangles.push(new Triangle(i, 1, tetrahedron.vertex0, tetrahedron.vertex2, tetrahedron.vertex3));
            triangles.push(new Triangle(i, 2, tetrahedron.vertex0, tetrahedron.vertex3, tetrahedron.vertex1));
            triangles.push(new Triangle(i, 3, tetrahedron.vertex0, tetrahedron.vertex1, tetrahedron.vertex2));
        }

        for (let i = 0; i < triangles.length; i++) {
            for (let k = i; k < triangles.length; k++) {
                if (triangles[i].isSame(triangles[k])) {
                    // update adjacency between tetrahedrons
                    this._tetrahedrons[triangles[i].tetrahedron].neighbours[triangles[i].index] = triangles[k].tetrahedron;
                    this._tetrahedrons[triangles[k].tetrahedron].neighbours[triangles[k].index] = triangles[i].tetrahedron;
                    triangles[i].isHullSurface = false;
                    triangles[k].isHullSurface = false;
                    break;
                }
            }

            if (triangles[i].isHullSurface) {
                const probe0 = this._probes[triangles[i].vertex0];
                const probe1 = this._probes[triangles[i].vertex1];
                const probe2 = this._probes[triangles[i].vertex2];

                Vec3.subtract(edge1, probe1.position, probe0.position);
                Vec3.subtract(edge2, probe2.position, probe0.position);
                Vec3.cross(normal, edge1, edge2);

                // accumulate weighted normal
                Vec3.add(probe0.normal, probe0.normal, normal);
                Vec3.add(probe1.normal, probe1.normal, normal);
                Vec3.add(probe2.normal, probe2.normal, normal);

                // create an outer cell
                const tetrahedron = new Tetrahedron(this, triangles[i].vertex0, triangles[i].vertex1, triangles[i].vertex2);

                // update adjacency between tetrahedron and outer cell
                tetrahedron.neighbours[3] = triangles[i].tetrahedron;
                this._tetrahedrons[triangles[i].tetrahedron].neighbours[triangles[i].index] = this._tetrahedrons.length;
                this._tetrahedrons.push(tetrahedron);
            }
        }

        // start from outer cell index
        for (let i = tetrahedronCount; i < this._tetrahedrons.length; i++) {
            const tetrahedron = this._tetrahedrons[i];

            edges.push(new Edge(i, 0, tetrahedron.vertex1, tetrahedron.vertex2));
            edges.push(new Edge(i, 1, tetrahedron.vertex2, tetrahedron.vertex0));
            edges.push(new Edge(i, 2, tetrahedron.vertex0, tetrahedron.vertex1));
        }

        for (let i = 0; i < edges.length; i++) {
            for (let k = i; i < edges.length; k++) {
                if (edges[i].isSame(edges[k])) {
                    // update adjacency between outer cells
                    this._tetrahedrons[edges[i].tetrahedron].neighbours[edges[i].index] = edges[k].tetrahedron;
                    this._tetrahedrons[edges[k].tetrahedron].neighbours[edges[k].index] = edges[i].tetrahedron;
                }
            }
        }

        // normalize all convex hull probes' normal
        for (let i = 0; i < this._probes.length; i++) {
            this._probes[i].normal.normalize();
        }
    }

    private computeMatrices () {
        for (let i = 0; i < this._tetrahedrons.length; i++) {
            const tetrahedron = this._tetrahedrons[i];

            if (tetrahedron.vertex3 !== -1) {
                this.computeTetrahedronMatrix(tetrahedron);
            } else {
                this.computeOuterCellMatrix(tetrahedron);
            }
        }
    }

    private computeTetrahedronMatrix (tetrahedron: Tetrahedron) {
        const p0 = this._probes[tetrahedron.vertex0].position;
        const p1 = this._probes[tetrahedron.vertex1].position;
        const p2 = this._probes[tetrahedron.vertex2].position;
        const p3 = this._probes[tetrahedron.vertex3].position;

        tetrahedron.matrix.set(
            p0.x - p3.x, p1.x - p3.x, p2.x - p3.x,
            p0.y - p3.y, p1.y - p3.y, p2.y - p3.y,
            p0.z - p3.z, p1.z - p3.z, p2.z - p3.z,
        );
        tetrahedron.matrix.invert();
    }

    private computeOuterCellMatrix (tetrahedron: Tetrahedron) {
        const v: Vec3[] = [];
        const p: Vec3[] = [];

        v[0] = this._probes[tetrahedron.vertex0].normal;
        v[1] = this._probes[tetrahedron.vertex1].normal;
        v[2] = this._probes[tetrahedron.vertex2].normal;

        p[0] = this._probes[tetrahedron.vertex0].position;
        p[1] = this._probes[tetrahedron.vertex1].position;
        p[2] = this._probes[tetrahedron.vertex2].position;

        const A = new Vec3(0.0, 0.0, 0.0);
        Vec3.subtract(A, p[0], p[2]);
        const Ap = new Vec3(0.0, 0.0, 0.0);
        Vec3.subtract(Ap, v[0], v[2]);
        const B = new Vec3(0.0, 0.0, 0.0);
        Vec3.subtract(A, p[1], p[2]);
        const Bp = new Vec3(0.0, 0.0, 0.0);
        Vec3.subtract(Ap, v[1], v[2]);
        const P2 = new Vec3(p[2]);
        const Cp = new Vec3(0.0, 0.0, 0.0);
        Vec3.negate(Cp, v[2]);

        const m: number[] = [];

        m[0] = Ap.y * Bp.z - Ap.z * Bp.y;
        m[3] = -Ap.x * Bp.z + Ap.z * Bp.x;
        m[6] = Ap.x * Bp.y - Ap.y * Bp.x;
        m[9] = A.x * Bp.y * Cp.z
                - A.y * Bp.x * Cp.z
                + Ap.x * B.y * Cp.z
                - Ap.y * B.x * Cp.z
                + A.z * Bp.x * Cp.y
                - A.z * Bp.y * Cp.x
                + Ap.z * B.x * Cp.y
                - Ap.z * B.y * Cp.x
                - A.x * Bp.z * Cp.y
                + A.y * Bp.z * Cp.x
                - Ap.x * B.z * Cp.y
                + Ap.y * B.z * Cp.x;
        m[9] -= P2.x * m[0] + P2.y * m[3] + P2.z * m[6];

        m[1] = Ap.y * B.z + A.y * Bp.z - Ap.z * B.y - A.z * Bp.y;
        m[4] = -A.x * Bp.z - Ap.x * B.z + A.z * Bp.x + Ap.z * B.x;
        m[7] = A.x * Bp.y - A.y * Bp.x + Ap.x * B.y - Ap.y * B.x;
        m[10] = A.x * B.y * Cp.z
                - A.y * B.x * Cp.z
                - A.x * B.z * Cp.y
                + A.y * B.z * Cp.x
                + A.z * B.x * Cp.y
                - A.z * B.y * Cp.x;
        m[10] -= P2.x * m[1] + P2.y * m[4] + P2.z * m[7];

        m[2] = -A.z * B.y + A.y * B.z;
        m[5] = -A.x * B.z + A.z * B.x;
        m[8] = A.x * B.y - A.y * B.x;
        m[11] = 0.0;
        m[11] -= P2.x * m[2] + P2.y * m[5] + P2.z * m[8];

        const a = Ap.x * Bp.y * Cp.z
                - Ap.y * Bp.x * Cp.z
                + Ap.z * Bp.x * Cp.y
                - Ap.z * Bp.y * Cp.x
                + Ap.y * Bp.z * Cp.x
                - Ap.x * Bp.z * Cp.y;

        if (Math.abs(a) > EPSILON) {
            // t^3 + p * t^2 + q * t + r = 0
            for (let k = 0; k < 12; k++) {
                m[k] /= a;
            }
        } else {
            // set last vertex index of outer cell to -2
            // p * t^2 + q * t + r = 0
            tetrahedron.vertex3 = -2;
        }

        // transpose the matrix
        tetrahedron.matrix.set(m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]);

        // last column of mat3x4
        tetrahedron.offset.set(m[3], m[7], m[11]);
    }
}
