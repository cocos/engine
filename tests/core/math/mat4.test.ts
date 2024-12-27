import { Mat4, Quat, Vec3 } from "../../../cocos/core";

describe('Test Mat4', () => {
    test('Conversion between TRS', () => {
        const t = new Vec3(1., 2., 3.);
        const r = new Quat(4., 5., 6., 7.);
        Quat.normalize(r, r);
        const s = new Vec3(8., 9., 10.);

        const mat4 = new Mat4();
        expect(Mat4.fromRTS(
            mat4,
            r,
            t,
            s,
        )).toBe(mat4);
        const t2 = new Vec3();
        const r2 = new Quat();
        const s2 = new Vec3();
        Mat4.toSRT(mat4, r2, t2, s2);
        expect(Vec3.equals(t2, t)).toBe(true);
        expect(Vec3.equals(s2, s)).toBe(true);
        expect(Quat.equals(r2, r)).toBe(true);
        expect(Vec3.equals(mat4.getTranslation(new Vec3()), t)).toBe(true);
        expect(Vec3.equals(mat4.getScale(new Vec3()), s)).toBe(true);
        expect(Quat.equals(mat4.getRotation(new Quat()), r)).toBe(true);
    });

    test('toSRT: zero axis length', () => {
        const m = new Mat4(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 1, 0,
            0.000002836869271050091, -64.9000015258789, 0, 1
        );
        
        const q = new Quat();
        const t = new Vec3();
        const s = new Vec3();
        Mat4.toSRT(m, q, t, s);
        expect(Quat.equals(q, new Quat(0, 0, 0, 1))).toBe(true);
        expect(Vec3.equals(t, new Vec3(0.000002836869271050091, -64.9000015258789, 0))).toBe(true);
        expect(Vec3.equals(s, new Vec3(0, 0, 1))).toBe(true);
    });

    test('clone', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = Mat4.clone(a);
        expect(Mat4.equals(a, b)).toBe(true);
    });
    test('copy', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4();
        Mat4.copy(b, a);
        expect(Mat4.equals(a, b)).toBe(true);
    });
    test('set', () => {
        const a = new Mat4();
        Mat4.set(
            a,
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const c = new Mat4();
        c.set(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        expect(Mat4.equals(a, b)).toBe(true);
        expect(Mat4.equals(c, b)).toBe(true);
    });
    test('identity', () => {
        const a = new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        const b = Mat4.identity(new Mat4());
        const c = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        c.identity();
        expect(Mat4.equals(a, Mat4.IDENTITY)).toBe(true); // check Mat4.IDENTITY
        expect(Mat4.equals(a, b)).toBe(true); // check Mat4.identity
        expect(Mat4.equals(a, c)).toBe(true); // check this.identity
    });
    test('transpose', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            1, 5, 9, 13,
            2, 6, 10, 14,
            3, 7, 11, 15,
            4, 8, 12, 16,
        );
        const c = Mat4.transpose(new Mat4(), a); // static
        a.transpose(); // this

        expect(Mat4.equals(a, b)).toBe(true);
        expect(Mat4.equals(b, c)).toBe(true);
    });
    test('invert', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = Mat4.invert(new Mat4(), a);
        a.invert();
        const zero = new Mat4(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        );
        expect(Mat4.equals(b, zero)).toBe(true); // check static invert 0 case
        expect(Mat4.equals(a, zero)).toBe(true); // check this.invert 0 case

        const c = new Mat4(
            1, 1, 1, 3,
            5, 4, 1, 7,
            9, 3, 2, 1,
            4, 4, 3, 1,
        );
        const res = new Mat4(
            4 / 165, -1 / 55, 28 / 165, -19 / 165,
            -41 / 55, 17/ 55, -12 / 55, 16 / 55,
            13 /  15, -2 / 5, 1/ 15, 2 / 15,
            47 / 165, 2 / 55, -1 / 165, -17 / 165,
        );
        const d = Mat4.invert(new Mat4(), c);
        c.invert();
        expect(Mat4.equals(d, res)).toBe(true);
        expect(Mat4.equals(c, res)).toBe(true);
    });
    test('determinant', () => {
        const a = new Mat4(
            1, 1, 1, 3,
            5, 4, 1, 7,
            9, 3, 2, 1,
            4, 4, 3, 1,
        );
        const res = 165;
        const b = Mat4.determinant(a);
        expect(b).toBeCloseTo(res, 6); // static
        expect(a.determinant()).toBeCloseTo(res, 6); // this
    });
    test('multiply', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const c = new Mat4(
            90, 100, 110, 120,
            202, 228, 254, 280,
            314, 356, 398, 440,
            426, 484, 542, 600,
        );
        const d = Mat4.multiply(new Mat4(), a, b);
        a.multiply(b);
        expect(Mat4.equals(a, c)).toBe(true); // check this
        expect(Mat4.equals(c, d)).toBe(true); // check static
    });
    test('transform', () => {
        const a = new Mat4(
            1, 1, 1, 3,
            5, 4, 1, 7,
            9, 3, 2, 1,
            4, 4, 3, 1,
        );
        const va = new Vec3(1, 2, 3);
        const vb = new Vec3(14, 38, 62);
        const res1 = new Mat4(
            1, 1, 1, 3,
            5, 4, 1, 7,
            9, 3, 2, 1,
            42, 22, 12, 21,
        );
        const res2 = new Mat4(
            1, 1, 1, 3,
            5, 4, 1, 7,
            9, 3, 2, 1,
            766, 356, 179, 371,
        );
        const ra = Mat4.transform(new Mat4(), a, va);
        const rb = Mat4.transform(new Mat4(), a, vb);
        const rc = Mat4.clone(a);
        rc.transform(va);
        const rd = Mat4.clone(a);
        rd.transform(vb);
        expect(Mat4.equals(ra, res1)).toBe(true); // check static
        expect(Mat4.equals(rb, res2)).toBe(true);
        expect(Mat4.equals(rc, res1)).toBe(true); // check this
        expect(Mat4.equals(rd, res2)).toBe(true);
    });
    test('translate', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const va = new Vec3(1, 2, 3);
        const res = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            14, 16, 18, 16,
        );
        const r = Mat4.translate(new Mat4(), a, va);
        a.translate(va);
        expect(Mat4.equals(r, res)).toBe(true); // static
        expect(Mat4.equals(a, res)).toBe(true); // this
    });
    test('scale', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const va = new Vec3(1, 2, 3);
        const res = new Mat4(
            1, 2, 3, 4,
            10, 12, 14, 16,
            27, 30, 33, 36,
            13, 14, 15, 16,
        );
        const r = Mat4.scale(new Mat4(), a, va);
        a.scale (va);
        expect(Mat4.equals(r, res)).toBe(true); // static
        expect(Mat4.equals(a, res)).toBe(true); // this
    });
    test('rotate', () => {
        // rotate, rotateX, rotateY, rotateZ
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const resX = new Mat4(
            1, 2, 3, 4,
            -5, -6, -7, -8,
            -9, -10, -11, -12,
            13, 14, 15, 16,
        );
        const rx = Mat4.rotate(new Mat4(), a, Math.PI, Vec3.UNIT_X)!; // static
        expect(Mat4.equals(rx, resX)).toBe(true);
        const resY = new Mat4(
            -1, -2, -3, -4,
            5, 6, 7, 8,
            -9, -10, -11, -12,
            13, 14, 15, 16,
        );
        const ry = Mat4.rotate(new Mat4(), a, Math.PI, Vec3.UNIT_Y)!; // static
        expect(Mat4.equals(ry, resY)).toBe(true);
        const resZ = new Mat4(
            -1, -2, -3, -4,
            -5, -6, -7, -8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const rz = Mat4.rotate(new Mat4(), a, Math.PI, Vec3.UNIT_Z)!; // static
        expect(Mat4.equals(rz, resZ)).toBe(true);
        
        a.rotate(Math.PI, Vec3.UNIT_X);
        expect(Mat4.equals(a, resX)).toBe(true); // this
    });
    test('fromTranslation', () => {
        const v = new Vec3(1, 2, 3);
        const res = new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            1, 2, 3, 1,
        );
        const r = Mat4.fromTranslation(new Mat4(), v);
        expect(Mat4.equals(r, res)).toBe(true); // static only
    });
    test('fromScaling', () => {
        const scale = new Vec3(1, 2, 3);
        const mat = new Mat4();
        const res = new Mat4(
            1, 0, 0, 0,
            0, 2, 0, 0,
            0, 0, 3, 0,
            0, 0, 0, 1,
        );
        const r = Mat4.fromScaling(new Mat4(), scale);
        mat.scale(scale);
        expect(Mat4.equals(r, res)).toBe(true); // static
        expect(Mat4.equals(mat, res)).toBe(true); // this
    });
    test('fromRotation', () => {
        // fromRotation, fromXRotation, fromYRotation, fromZRotation
        const resX = new Mat4(
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1,
        );
        const rx = Mat4.fromXRotation(new Mat4(), Math.PI / 2);
        expect(Mat4.equals(rx, resX)).toBe(true);
        const resY = new Mat4(
            0, 0, -1, 0,
            0, 1, 0, 0,
            1, 0, 0, 0,
            0, 0, 0, 1,
        );
        const ry = Mat4.fromYRotation(new Mat4(), Math.PI / 2);
        expect(Mat4.equals(ry, resY)).toBe(true);
        const resZ = new Mat4(
            0, 1, 0, 0,
            -1, 0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        const rz = Mat4.fromZRotation(new Mat4(), Math.PI / 2);
        expect(Mat4.equals(rz, resZ)).toBe(true);
    });
    test('fromRT', () => {
        const t = new Vec3(1, 2, 3);
        const r = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const res1 = Mat4.fromRT(new Mat4(), r, t);

        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotate(mat, mat, Math.PI / 2, Vec3.UNIT_Y);

        expect(Mat4.equals(mat, res1)).toBe(true);
    });
    test('getTranslation', () => {
        const a = new Mat4(
            1, 2, 3, 0,
            5, 6, 7, 0,
            9, 10, 11, 0,
            13, 14, 15, 1,
        );
        const res = new Vec3(13, 14, 15);
        const r = Mat4.getTranslation(new Vec3(), a);
    });
    test('getScaling', () => {
        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotate(mat, Mat4.IDENTITY, Math.PI / 2, Vec3.UNIT_Y);
        Mat4.scale(mat, mat, new Vec3(1, 2, 3));
        const res = new Vec3(1, 2, 3);
        const r = Mat4.getScaling(new Vec3(), mat);
        expect(Vec3.equals(r, res)).toBe(true);
    });
    test('getRotation', () => {
        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotate(mat, Mat4.IDENTITY, Math.PI / 2, Vec3.UNIT_Y);
        const res = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const r = Mat4.getRotation(new Quat(), mat);
        expect(Vec3.equals(r, res)).toBe(true);
    });
    test('toSRT', () => {
        // toRTS, toSRT
        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotate(mat, mat, Math.PI / 2, Vec3.UNIT_Y);
        Mat4.scale(mat, mat, new Vec3(1, 2, 3));

        const res = new Vec3(1, 2, 3);
        const r = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const s = new Vec3(1, 2, 3);

        const resS = new Vec3();
        const resR = new Quat();
        const resT = new Vec3();
        Mat4.toSRT(mat, resR, resT, resS); // static only
    
        expect(Vec3.equals(resS, s)).toBe(true);
        expect(Vec3.equals(resT, res)).toBe(true);
        expect(Quat.equals(resR, r)).toBe(true);
    });
    test('toEuler', () => {
        const mat = new Mat4();
        let rotX = 32;
        let rotY = -50;
        let rotZ = 90;
        Mat4.rotate(mat, mat, rotX / 180 * Math.PI, Vec3.UNIT_X);
        Mat4.rotate(mat, mat, rotY / 180 * Math.PI, Vec3.UNIT_Y);
        Mat4.rotate(mat, mat, rotZ / 180 * Math.PI, Vec3.UNIT_Z);
    });
    test('fromSRT', () => {
        // fromRTS, fromSRT, static and non-static
        const t = new Vec3(1, 2, 3);
        const r = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const s = new Vec3(1, 2, 3);

        const res1 = Mat4.fromSRT(new Mat4(), r, t, s);
        const res2 = new Mat4();
        res2.fromSRT(r, t, s);
        const res3 = Mat4.fromRTS(new Mat4(), r, t, s);
        const res4 = new Mat4();
        res4.fromRTS(r, t, s);

        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.rotate(mat, mat, Math.PI / 2, Vec3.UNIT_Y);
        Mat4.scale(mat, mat, new Vec3(1, 2, 3));
        const res = new Mat4(
            0, 0, -1, 0,
            0, 2, 0, 0,
            3, 0, 0, 0,
            1, 2, 3, 1,
        );

        expect(Mat4.equals(res1, res)).toBe(true);
        expect(Mat4.equals(res2, res)).toBe(true);
        expect(Mat4.equals(res3, res)).toBe(true);
        expect(Mat4.equals(res4, res)).toBe(true);
        expect(Mat4.equals(res, mat)).toBe(true);
    });
    test('fromSRTOrigin', () => {
        // fromSRTOrigin, fromRTSOrigin
        const t = new Vec3(1, 2, 3);
        const r = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const s = new Vec3(1, 2, 3);
        const o = new Vec3(1, 2, 3);
        const oi = new Vec3(-1, -2, -3);

        const res1 = Mat4.fromSRTOrigin(new Mat4(), r, t, s, o);
        
        const mat = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.transform(mat, mat, o);
        Mat4.rotate(mat, mat, Math.PI / 2, Vec3.UNIT_Y);
        Mat4.scale(mat, mat, new Vec3(1, 2, 3));
        Mat4.transform(mat, mat, oi);

        expect(Mat4.equals(res1, mat)).toBe(true);
    });
    test('fromQuat', () => {
        const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.PI / 2);
        const res = new Mat4(
            0, 0, -1, 0,
            0, 1, 0, 0,
            1, 0, 0, 0,
            0, 0, 0, 1,
        );
        const mat = Mat4.fromQuat(new Mat4(), q);
        expect(Mat4.equals(mat, res)).toBe(true);
    });
    test('frustum', () => {
        const mat = Mat4.frustum(new Mat4(), -1, 1, -1, 1, 2, 4);
        const res = new Mat4(
            2, 0, 0, 0,
            0, 2, 0, 0,
            0, 0, -3, -1,
            0, 0, -8, 0,
        );
        expect(Mat4.equals(mat, res)).toBe(true);
    });
    test('perspective', () => {
        const mat = Mat4.perspective(new Mat4(), 90, 1, 2, 4);
        const res = new Mat4(
            0.6173696237835551, 0, 0, 0,
            0, 0.6173696237835551, 0, 0,
            0, 0, -3, -1,
            0, 0, -8, 0,
        );
        expect(Mat4.equals(mat, res)).toBe(true);
    });
    test('ortho', () => {
        const mat = Mat4.ortho(new Mat4(), -1, 1, -1, 1, 2, 4);
        const res = new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, 0,
            0, 0, -3, 1,
        );
        expect(Mat4.equals(mat, res)).toBe(true);
    });
    test('lookAt', () => {
        const mat = Mat4.lookAt(new Mat4(), new Vec3(0, 0, 0), new Vec3(0, 0, -1), new Vec3(0, 1, 0));
        const res = new Mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        expect(Mat4.equals(mat, res)).toBe(true);
    });

    test('toArray', () => {
        const array = new Float32Array(16);
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        Mat4.toArray(array, a); // static only
        for (let i = 0; i < 16; i++) {
            expect(array[i]).toBeCloseTo(i + 1, 6);
        }
    });
    test('fromArray', () => {
        const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        const a = Mat4.fromArray(new Mat4(), array);
        const res = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        expect(Mat4.equals(a, res)).toBe(true);
    });
    test('add', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            17, 18, 19, 20,
            21, 22, 23, 24,
            25, 26, 27, 28,
            29, 30, 31, 32,
        );
        const res = new Mat4(
            18, 20, 22, 24,
            26, 28, 30, 32,
            34, 36, 38, 40,
            42, 44, 46, 48,
        );
        const r = Mat4.add(new Mat4(), a, b);
        a.add(b);
        expect(Mat4.equals(r, res)).toBe(true); // static only
        expect(Mat4.equals(a, res)).toBe(true); // this
    });
    test('subtract', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            17, 18, 19, 20,
            21, 22, 23, 24,
            25, 26, 27, 28,
            29, 30, 31, 32,
        );
        const res = new Mat4(
            -16, -16, -16, -16,
            -16, -16, -16, -16,
            -16, -16, -16, -16,
            -16, -16, -16, -16,
        );
        const r = Mat4.subtract(new Mat4(), a, b);
        a.subtract(b);
        expect(Mat4.equals(r, res)).toBe(true); // static
        expect(Mat4.equals(a, res)).toBe(true); // this
    });
    test('multiplyScalar', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const res = new Mat4(
            2, 4, 6, 8,
            10, 12, 14, 16,
            18, 20, 22, 24,
            26, 28, 30, 32,
        );
        const r = Mat4.multiplyScalar(new Mat4(), a, 2);
        a.multiplyScalar(2);
        expect(Mat4.equals(r, res)).toBe(true); // static only
        expect(Mat4.equals(a, res)).toBe(true); // this
    });
    test('multiplyScalarAndAdd', () => {
        const a = new Mat4(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16,
        );
        const b = new Mat4(
            17, 18, 19, 20,
            21, 22, 23, 24,
            25, 26, 27, 28,
            29, 30, 31, 32,
        );
        // res = b + a * 2
        const res = new Mat4(
            19, 22, 25, 28,
            31, 34, 37, 40,
            43, 46, 49, 52,
            55, 58, 61, 64,
        );
        const r = Mat4.multiplyScalarAndAdd(new Mat4(), b, a, 2);
        expect(Mat4.equals(r, res)).toBe(true);
    });

    test('toString', () => {
        const m = new Mat4(
12.1234, 0.002, 44.123433, 55.12234,
6.1230835, 12384.126, 7348.12237, 283.23848943,
1283.8, 0.000009, 0.012384294, 0.18492384,
1284734.123, 0.12841203, 0, 0.00001283
);
        const expect0 = `[
12.1234, 0.002, 44.123433, 55.12234,
6.1230835, 12384.126, 7348.12237, 283.23848943,
1283.8, 0.000009, 0.012384294, 0.18492384,
1284734.123, 0.12841203, 0, 0.00001283
]`;
        expect(m.toString()).toBe(expect0);
    });
});