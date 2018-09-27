
const renderEngine = require('../../renderer/render-engine');
const gfx = renderEngine.gfx;
const RecyclePool = renderEngine.RecyclePool;
const aabb = require('./aabb');
const ray = require('./ray');
const triangle = require('./triangle');

const mat4 = cc.vmath.mat4;
const vec3 = cc.vmath.vec3;

/**
 * !#en 3D Intersection helper class
 * !#zh 辅助类，用于测试 3D 物体是否相交
 * @class Intersection3D
 * @static
 */
let Intersection3D = {};

/** 
 * !#en
 * Check whether ray intersect with a 3d aabb
 * !#zh
 * 检测射线是否与 3D 包围盒相交
 * @method rayAabb
 * @param {Ray} ray
 * @param {Aabb3D} aabb
 * @return Number
*/
Intersection3D.rayAabb = (function () {
    let min = vec3.create();
    let max = vec3.create();
    return function (ray, aabb) {
        let o = ray.o, d = ray.d;
        let ix = 1 / d.x, iy = 1 / d.y, iz = 1 / d.z;
        vec3.sub(min, aabb.center, aabb.halfExtents);
        vec3.add(max, aabb.center, aabb.halfExtents);
        let t1 = (min.x - o.x) * ix;
        let t2 = (max.x - o.x) * ix;
        let t3 = (min.y - o.y) * iy;
        let t4 = (max.y - o.y) * iy;
        let t5 = (min.z - o.z) * iz;
        let t6 = (max.z - o.z) * iz;
        let tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        let tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
        if (tmax < 0 || tmin > tmax) return 0;
        return tmin;
    };
})();

Intersection3D.rayTriangle = (function () {
    let ab = vec3.create(0, 0, 0);
    let ac = vec3.create(0, 0, 0);
    let pvec = vec3.create(0, 0, 0);
    let tvec = vec3.create(0, 0, 0);
    let qvec = vec3.create(0, 0, 0);

    return function (ray, triangle) {
        vec3.sub(ab, triangle.b, triangle.a);
        vec3.sub(ac, triangle.c, triangle.a);

        vec3.cross(pvec, ray.d, ac);
        let det = vec3.dot(ab, pvec);

        if (det <= 0) {
            return 0;
        }

        vec3.sub(tvec, ray.o, triangle.a);
        let u = vec3.dot(tvec, pvec);
        if (u < 0 || u > det) {
            return 0;
        }

        vec3.cross(qvec, tvec, ab);
        let v = vec3.dot(ray.d, qvec);
        if (v < 0 || u + v > det) {
            return 0;
        }

        let t = vec3.dot(ac, qvec) / det;
        if (t < 0) return 0;
        return t;
    };
})();

Intersection3D.rayMesh = (function () {
    let tri = triangle.create();
    let minDist = Infinity;
    function forEachTriangleIn(ray, vb, ib, format) {
        let fmt = format.element(gfx.ATTR_POSITION);
        let offset = fmt.offset / 4, stride = fmt.stride / 4;
        for (let i = 0; i < ib.length; i += 3) {
            let idx = ib[i] * stride + offset;
            vec3.set(tri.a, vb[idx], vb[idx + 1], vb[idx + 2]);
            idx = ib[i + 1] * stride + offset;
            vec3.set(tri.b, vb[idx], vb[idx + 1], vb[idx + 2]);
            idx = ib[i + 2] * stride + offset;
            vec3.set(tri.c, vb[idx], vb[idx + 1], vb[idx + 2]);

            let dist = Intersection3D.rayTriangle(ray, tri);
            if (dist > 0 && dist < minDist) {
                minDist = dist;
            }
        }
    };

    return function (ray, mesh) {
        minDist = Infinity;
        let subMeshes = mesh._subMeshes;
        for (let i = 0; i < subMeshes.length; i++) {
            if (subMeshes[i]._primitiveType !== gfx.PT_TRIANGLES) continue;

            let vb = (mesh._vbs[i] || mesh._vbs[0]);
            let vbData = vb.data;
            let dv = new DataView(vbData.buffer, vbData.byteOffset, vbData.byteLength);
            let ib = mesh._ibs[i].data;

            let format = vb.buffer._format;
            let fmt = format.element(gfx.ATTR_POSITION);
            let offset = fmt.offset, stride = fmt.stride;
            for (let i = 0; i < ib.length; i += 3) {
                let idx = ib[i] * stride + offset;
                vec3.set(tri.a, dv.getFloat32([idx], true), dv.getFloat32([idx + 4], true), dv.getFloat32([idx + 8], true));
                idx = ib[i + 1] * stride + offset;
                vec3.set(tri.b, dv.getFloat32([idx], true), dv.getFloat32([idx + 4], true), dv.getFloat32([idx + 8], true));
                idx = ib[i + 2] * stride + offset;
                vec3.set(tri.c, dv.getFloat32([idx], true), dv.getFloat32([idx + 4], true), dv.getFloat32([idx + 8], true));

                let dist = Intersection3D.rayTriangle(ray, tri);
                if (dist > 0 && dist < minDist) {
                    minDist = dist;
                }
            }
        }
        return minDist;
    };
})();

/** 
 * !#en
 * Check whether ray intersect with nodes
 * !#zh
 * 检测射线是否与物体有交集
 * @method raycast
 * @param {Ray} worldRay
 * @param {Function} handler
 * @param {Function} filter
*/
Intersection3D.raycast = (function () {
    function traversal(node, cb) {
        var children = node.children;

        for (var i = children.length - 1; i >= 0; i--) {
            var child = children[i];
            traversal(child, cb);
        }

        cb(node);
    }

    function cmp(a, b) {
        return a.distance - b.distance;
    }

    function transformMat4Normal(out, a, m) {
        let x = a.x, y = a.y, z = a.z,
            rhw = m.m03 * x + m.m07 * y + m.m11 * z;
        rhw = rhw ? 1 / rhw : 1;
        out.x = (m.m00 * x + m.m04 * y + m.m08 * z) * rhw;
        out.y = (m.m01 * x + m.m05 * y + m.m09 * z) * rhw;
        out.z = (m.m02 * x + m.m06 * y + m.m10 * z) * rhw;
        return out;
    }

    let results = new RecyclePool(function () {
        return {
            distance: 0,
            node: null
        }
    }, 1);

    // temp variable
    let nodeAabb = aabb.create();
    let minPos = vec3.create();
    let maxPos = vec3.create();

    let modelRay = ray.create();
    let m4 = mat4.create();

    function distanceValid (distance) {
        return distance > 0 && distance < Infinity;
    }

    return function (worldRay, handler, filter) {
        results.reset();

        let root = cc.director.getScene();
        traversal(root, function (node) {
            if (filter && !filter(node)) return;

            // transform world ray to model ray
            mat4.invert(m4, node.getWorldMatrix(m4));
            vec3.transformMat4(modelRay.o, worldRay.o, m4);
            vec3.normalize(modelRay.d, transformMat4Normal(modelRay.d, worldRay.d, m4));

            // raycast with bounding box
            let distance = Infinity;
            let component = node._renderComponent;
            if (component && component._boundingBox) {
                distance = Intersection3D.rayAabb(modelRay, component._boundingBox);
            }
            else if (node.width && node.height) {
                vec3.set(minPos, -node.width * node.anchorX, -node.height * node.anchorY, node.z);
                vec3.set(maxPos, node.width * (1 - node.anchorX), node.height * (1 - node.anchorY), node.z);
                aabb.fromPoints(nodeAabb, minPos, maxPos);
                distance = Intersection3D.rayAabb(modelRay, nodeAabb);
            }

            if (!distanceValid(distance)) return;

            if (handler) {
                distance = handler(modelRay, node, distance);
            }

            if (distanceValid(distance)) {
                let res = results.add();
                res.node = node;
                res.distance = distance;
            }
        });

        results.sort(cmp);
        return results;
    }
})();

cc.Intersection3D = module.exports = Intersection3D;
