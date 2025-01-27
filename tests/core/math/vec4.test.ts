import { Mat4, Quat, Vec4, Vec3, Color} from "../../../cocos/core";

describe('Test Vec4', () => {
    test('clone', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = v4_0.clone();

        expect(v4_1).not.toBe(v4_0);
        expect(v4_1.x).toBeCloseTo(v4_0.x, 6);
        expect(v4_1.y).toBeCloseTo(v4_0.y, 6);
        expect(v4_1.z).toBeCloseTo(v4_0.z, 6);
        expect(v4_1.w).toBeCloseTo(v4_0.w, 6);

        // static clone
        const v4_2 = Vec4.clone(v4_0);
        expect(v4_2).not.toBe(v4_0);
        expect(v4_2.x).toBeCloseTo(v4_0.x, 6);
        expect(v4_2.y).toBeCloseTo(v4_0.y, 6);
        expect(v4_2.z).toBeCloseTo(v4_0.z, 6);
        expect(v4_2.w).toBeCloseTo(v4_0.w, 6);
    });

    test('set', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // set another Vec4
        v4_0.set(v4_1);
        expect(v4_0.x).toBeCloseTo(v4_1.x, 6);
        expect(v4_0.y).toBeCloseTo(v4_1.y, 6);
        expect(v4_0.z).toBeCloseTo(v4_1.z, 6);
        expect(v4_0.w).toBeCloseTo(v4_1.w, 6);

        // set by numbers
        v4_0.set(9, 10, 11, 12);
        expect(v4_0.x).toBeCloseTo(9, 6);
        expect(v4_0.y).toBeCloseTo(10, 6);
        expect(v4_0.z).toBeCloseTo(11, 6);
        expect(v4_0.w).toBeCloseTo(12, 6);

        // static set
        const v4_2 = Vec4.set(new Vec4(), 13, 14, 15, 16);
        expect(v4_2.x).toBeCloseTo(13, 6);
        expect(v4_2.y).toBeCloseTo(14, 6);
        expect(v4_2.z).toBeCloseTo(15, 6);
        expect(v4_2.w).toBeCloseTo(16, 6);
    });

    test('fromColor', () => {
        const v4_0 = new Vec4();
        const c0 = new Color(255, 188, 0, 255);

        Vec4.fromColor(v4_0, c0);

        expect(v4_0.x).toBeCloseTo(255, 6);
        expect(v4_0.y).toBeCloseTo(188, 6);
        expect(v4_0.z).toBeCloseTo(0, 6);
        expect(v4_0.w).toBeCloseTo(255, 6);
    });

    test('angle', () => {
        const v4_0 = new Vec4(1, 0, 0, 0);
        const v4_1 = new Vec4(0, 1, 0, 0);

        expect(Vec4.angle(v4_0, v4_1)).toBeCloseTo(Math.PI / 2, 6);
    });

    test('add', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // add another Vec4
        v4_0.add(v4_1);
        expect(v4_0.x).toBeCloseTo(6, 6);
        expect(v4_0.y).toBeCloseTo(8, 6);
        expect(v4_0.z).toBeCloseTo(10, 6);
        expect(v4_0.w).toBeCloseTo(12, 6);

        // static add
        const v4_2 = Vec4.add(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(11, 6);
        expect(v4_2.y).toBeCloseTo(14, 6);
        expect(v4_2.z).toBeCloseTo(17, 6);
        expect(v4_2.w).toBeCloseTo(20, 6);
    });

    test('subtract', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // subtract another Vec4
        v4_0.subtract(v4_1);
        expect(v4_0.x).toBeCloseTo(-4, 6);
        expect(v4_0.y).toBeCloseTo(-4, 6);
        expect(v4_0.z).toBeCloseTo(-4, 6);
        expect(v4_0.w).toBeCloseTo(-4, 6);

        // static subtract
        const v4_2 = Vec4.subtract(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(-9, 6);
        expect(v4_2.y).toBeCloseTo(-10, 6);
        expect(v4_2.z).toBeCloseTo(-11, 6);
        expect(v4_2.w).toBeCloseTo(-12, 6);
    });

    test('multiply', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // multiply another Vec4
        v4_0.multiply(v4_1);
        expect(v4_0.x).toBeCloseTo(5, 6);
        expect(v4_0.y).toBeCloseTo(12, 6);
        expect(v4_0.z).toBeCloseTo(21, 6);
        expect(v4_0.w).toBeCloseTo(32, 6);

        // static multiply
        const v4_2 = Vec4.multiply(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(25, 6);
        expect(v4_2.y).toBeCloseTo(72, 6);
        expect(v4_2.z).toBeCloseTo(147, 6);
        expect(v4_2.w).toBeCloseTo(256, 6);
    });

    test('divide', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // divide another Vec4
        v4_0.divide(v4_1);
        expect(v4_0.x).toBeCloseTo(1 / 5, 6);
        expect(v4_0.y).toBeCloseTo(2 / 6, 6);
        expect(v4_0.z).toBeCloseTo(3 / 7, 6);
        expect(v4_0.w).toBeCloseTo(4 / 8, 6);

        // static divide
        const v4_2 = Vec4.divide(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(1 / 25, 6);
        expect(v4_2.y).toBeCloseTo(2 / 36, 6);
        expect(v4_2.z).toBeCloseTo(3 / 49, 6);
        expect(v4_2.w).toBeCloseTo(4 / 64, 6);
    });

    test('ceil', () => {
        const v4_0 = new Vec4(1.1, 2.2, 3.3, 4.4);

        // static ceil
        const v4_1 = Vec4.ceil(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(2, 6);
        expect(v4_1.y).toBeCloseTo(3, 6);
        expect(v4_1.z).toBeCloseTo(4, 6);
        expect(v4_1.w).toBeCloseTo(5, 6);
    });

    test('floor', () => {
        const v4_0 = new Vec4(1.1, 2.2, 3.3, 4.4);

        // static floor
        const v4_1 = Vec4.floor(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(2, 6);
        expect(v4_1.z).toBeCloseTo(3, 6);
        expect(v4_1.w).toBeCloseTo(4, 6);
    });

    test('min', () => {
        const v4_0 = new Vec4(1, 6, 3, 8);
        const v4_1 = new Vec4(5, 2, 7, 4);

        // static min
        const v4_2 = Vec4.min(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(1, 6);
        expect(v4_2.y).toBeCloseTo(2, 6);
        expect(v4_2.z).toBeCloseTo(3, 6);
        expect(v4_2.w).toBeCloseTo(4, 6);
    });

    test('max', () => {
        const v4_0 = new Vec4(1, 6, 3, 8);
        const v4_1 = new Vec4(5, 2, 7, 4);

        // static max
        const v4_2 = Vec4.max(new Vec4(), v4_0, v4_1);
        expect(v4_2.x).toBeCloseTo(5, 6);
        expect(v4_2.y).toBeCloseTo(6, 6);
        expect(v4_2.z).toBeCloseTo(7, 6);
        expect(v4_2.w).toBeCloseTo(8, 6);
    });

    test('round', () => {
        const v4_0 = new Vec4(1.3, 2.4, 3.5, 4.6);

        // static round
        const v4_1 = Vec4.round(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(2, 6);
        expect(v4_1.z).toBeCloseTo(4, 6);
        expect(v4_1.w).toBeCloseTo(5, 6);
    });

    test('multiplyScalar', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // multiplyScalar
        v4_0.multiplyScalar(2);
        expect(v4_0.x).toBeCloseTo(2, 6);
        expect(v4_0.y).toBeCloseTo(4, 6);
        expect(v4_0.z).toBeCloseTo(6, 6);
        expect(v4_0.w).toBeCloseTo(8, 6);

        // static multiplyScalar
        const v4_1 = Vec4.multiplyScalar(new Vec4(), v4_0, 2);
        expect(v4_1.x).toBeCloseTo(4, 6);
        expect(v4_1.y).toBeCloseTo(8, 6);
        expect(v4_1.z).toBeCloseTo(12, 6);
        expect(v4_1.w).toBeCloseTo(16, 6);
    });

    test('scaleAndAdd', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // static scaleAndAdd
        const v4_2 = Vec4.scaleAndAdd(new Vec4(), v4_0, v4_1, 2);
        expect(v4_2.x).toBeCloseTo(11, 6);
        expect(v4_2.y).toBeCloseTo(14, 6);
        expect(v4_2.z).toBeCloseTo(17, 6);
        expect(v4_2.w).toBeCloseTo(20, 6);
    });

    test('distance', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // static distance
        const distance = Vec4.distance(v4_0, v4_1);
        expect(distance).toBeCloseTo(8, 6);
    });

    test('squaredDistance', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(5, 6, 7, 8);

        // static squaredDistance
        const squaredDistance = Vec4.squaredDistance(v4_0, v4_1);
        expect(squaredDistance).toBeCloseTo(64, 6);
    });

    test('length', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // length
        const len = v4_0.length();
        expect(len).toBeCloseTo(Math.sqrt(30), 6);

        // static len
        const len2 = Vec4.len(v4_0);
        expect(len2).toBeCloseTo(Math.sqrt(30), 6);
    });

    test('lengthSqr', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // lengthSqr
        const len = v4_0.lengthSqr();
        expect(len).toBeCloseTo(30, 6);

        // static lengthSqr
        const len2 = Vec4.lengthSqr(v4_0);
        expect(len2).toBeCloseTo(30, 6);
    });

    test ('negate', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // negate
        v4_0.negative();
        expect(v4_0.x).toBeCloseTo(-1, 6);
        expect(v4_0.y).toBeCloseTo(-2, 6);
        expect(v4_0.z).toBeCloseTo(-3, 6);
        expect(v4_0.w).toBeCloseTo(-4, 6);

        // static negate
        const v4_1 = Vec4.negate(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(2, 6);
        expect(v4_1.z).toBeCloseTo(3, 6);
        expect(v4_1.w).toBeCloseTo(4, 6);
    });

    test('inverse', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // static inverse
        const v4_1 = Vec4.inverse(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(0.5, 6);
        expect(v4_1.z).toBeCloseTo(1 / 3, 6);
        expect(v4_1.w).toBeCloseTo(0.25, 6);

        const v4_2 = new Vec4(0, 0, 0, 0);
        const v4_3 = Vec4.inverse(new Vec4(), v4_2);
        expect(v4_3.x).toBeCloseTo(Infinity, 6);
        expect(v4_3.y).toBeCloseTo(Infinity, 6);
        expect(v4_3.z).toBeCloseTo(Infinity, 6);
        expect(v4_3.w).toBeCloseTo(Infinity, 6);
    });

    test('inverseSafe', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // static inverseSafe
        const v4_1 = Vec4.inverseSafe(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(0.5, 6);
        expect(v4_1.z).toBeCloseTo(1 / 3, 6);
        expect(v4_1.w).toBeCloseTo(0.25, 6);

        const v4_2 = new Vec4(1e-3, 1e-7, 1, 0);
        const v4_3 = Vec4.inverseSafe(new Vec4(), v4_2);
        expect(v4_3.x).toBeCloseTo(1e3, 6);
        expect(v4_3.y).toBeCloseTo(0, 6);
        expect(v4_3.z).toBeCloseTo(1, 6);
        expect(v4_3.w).toBeCloseTo(0, 6);
    });

    test('normalize', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // normalize
        v4_0.normalize();
        expect(v4_0.x).toBeCloseTo(1 / Math.sqrt(30), 6);
        expect(v4_0.y).toBeCloseTo(2 / Math.sqrt(30), 6);
        expect(v4_0.z).toBeCloseTo(3 / Math.sqrt(30), 6);
        expect(v4_0.w).toBeCloseTo(4 / Math.sqrt(30), 6);

        // static normalize
        const v4_1 = Vec4.normalize(new Vec4(), v4_0);
        expect(v4_1.x).toBeCloseTo(1 / Math.sqrt(30), 6);
        expect(v4_1.y).toBeCloseTo(2 / Math.sqrt(30), 6);
        expect(v4_1.z).toBeCloseTo(3 / Math.sqrt(30), 6);
        expect(v4_1.w).toBeCloseTo(4 / Math.sqrt(30), 6);
    });

    test('dot', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(2, 3, 4, 5);

        // dot
        const dot = v4_0.dot(v4_1);
        expect(dot).toBeCloseTo(40, 6);

        // static dot
        const dot2 = Vec4.dot(v4_0, v4_1);
        expect(dot2).toBeCloseTo(40, 6);
    });

    test('lerp', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(2, 3, 4, 5);

        // static lerp
        const v4_2 = Vec4.lerp(new Vec4(), v4_0, v4_1, 0.5);
        expect(v4_2.x).toBeCloseTo(1.5, 6);
        expect(v4_2.y).toBeCloseTo(2.5, 6);
        expect(v4_2.z).toBeCloseTo(3.5, 6);
        expect(v4_2.w).toBeCloseTo(4.5, 6);

        // lerp
        v4_0.lerp(v4_1, 0.5);
        expect(v4_0.x).toBeCloseTo(1.5, 6);
        expect(v4_0.y).toBeCloseTo(2.5, 6);
        expect(v4_0.z).toBeCloseTo(3.5, 6);
        expect(v4_0.w).toBeCloseTo(4.5, 6);
    });

    test('scale', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);

        // scale
        v4_0.scale(2);
        expect(v4_0.x).toBeCloseTo(2, 6);
        expect(v4_0.y).toBeCloseTo(4, 6);
        expect(v4_0.z).toBeCloseTo(6, 6);
        expect(v4_0.w).toBeCloseTo(8, 6);

        // static scale
        const v4_1 = Vec4.scale(new Vec4(), v4_0, 2);
        expect(v4_1.x).toBeCloseTo(4, 6);
        expect(v4_1.y).toBeCloseTo(8, 6);
        expect(v4_1.z).toBeCloseTo(12, 6);
        expect(v4_1.w).toBeCloseTo(16, 6);
    });

    test('random', () => {
        const v4_0 = Vec4.random(new Vec4());

        const len = v4_0.length();
        expect(len).toBeCloseTo(1, 6);

        const v4_1 = Vec4.random(new Vec4(), 2);
        const len2 = v4_1.length();
        expect(len2).toBeCloseTo(2, 6);
    });

    test('transformMat4', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const m4_0 = Mat4.fromXRotation(new Mat4(), Math.PI / 2);

        // transformMat4
        v4_0.transformMat4(m4_0);
        expect(v4_0.x).toBeCloseTo(1, 6);
        expect(v4_0.y).toBeCloseTo(-3, 6);
        expect(v4_0.z).toBeCloseTo(2, 6);
        expect(v4_0.w).toBeCloseTo(4, 6);

        // static transformMat4
        const v4_1 = Vec4.transformMat4(new Vec4(), v4_0, m4_0);
        expect(v4_1.x).toBeCloseTo(1, 6);
        expect(v4_1.y).toBeCloseTo(-2, 6);
        expect(v4_1.z).toBeCloseTo(-3, 6);
        expect(v4_1.w).toBeCloseTo(4, 6);
    });

    test('transformAffine', () => {
        const v4_0 = new Vec4(1, 2, 3, 1);
        const m4_0 = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotateX(m4_0, m4_0, Math.PI / 2);

        // transformAffine
        Vec4.transformAffine(v4_0, v4_0, m4_0);
        expect(v4_0.x).toBeCloseTo(2, 6);
        expect(v4_0.y).toBeCloseTo(-1, 6);
        expect(v4_0.z).toBeCloseTo(5, 6);
        expect(v4_0.w).toBeCloseTo(1, 6);
    });

    test('transformQuat', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const q0 = Quat.rotateX(new Quat(), Quat.IDENTITY, Math.PI / 2);

        // transformQuat
        Vec4.transformQuat(v4_0, v4_0, q0);
        expect(v4_0.x).toBeCloseTo(1, 6);
        expect(v4_0.y).toBeCloseTo(-3, 6);
        expect(v4_0.z).toBeCloseTo(2, 6);
        expect(v4_0.w).toBeCloseTo(4, 6);
    });

    test('toArray', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const array = Vec4.toArray([0,0,0,0], v4_0);

        expect(array[0]).toBe(1);
        expect(array[1]).toBe(2);
        expect(array[2]).toBe(3);
        expect(array[3]).toBe(4);
    });

    test('fromArray', () => {
        const v4_0 = Vec4.fromArray(new Vec4(), [1, 2, 3, 4]);

        expect(v4_0.x).toBe(1);
        expect(v4_0.y).toBe(2);
        expect(v4_0.z).toBe(3);
        expect(v4_0.w).toBe(4);
    });

    test('equals', () => {
        const v4_0 = new Vec4(1, 2, 3, 4);
        const v4_1 = new Vec4(1, 2, 3.0000001, 4);
        const v4_2 = new Vec4(2, 2, 3, 4.00001);

        expect(Vec4.equals(v4_0, v4_1)).toBeTruthy();
        expect(Vec4.equals(v4_0, v4_2)).toBeFalsy();
    });

    test('toString', () => {
        const v = new Vec4(100, 100, 1283.3892389, 0);
        expect(v.toString()).toBe('(100, 100, 1283.3892389, 0)');
    });
});