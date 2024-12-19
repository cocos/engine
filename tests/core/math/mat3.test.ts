import { log } from '../../test.log';
import { Vec3 } from '../../../cocos/core/math/vec3';
import { Mat3 } from '../../../cocos/core/math/mat3';
import { Mat4 } from '../../../cocos/core/math/mat4';
import { Quat } from '../../../cocos/core/math/quat';

describe('Test Mat3', () => {
    test('transpose', () => {
        const m0 = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        const m1 = new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        const expect0 = new Mat3(1, 4, 7, 2, 5, 8, 3, 6, 9);
        Mat3.transpose(m0, m0);
        m1.transpose();
        log('transpose 0: ', m0);
        log('transpose 1: ', m1);
        expect(Mat3.equals(m0, expect0)).toBe(true);
        expect(Mat3.equals(m1, expect0)).toBe(true);
    });

    test('invert', () => {
        const cos = Math.cos(Math.PI / 6);
        const sin = Math.sin(Math.PI / 6);
        const m0 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const m1 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const expect0 = new Mat3(cos, -sin, 0, sin, cos, 0, 0, 0, 1);
        Mat3.invert(m0, m0);
        m1.invert();
        log('invert 0: ', m0);
        log('invert 1: ', m1);
        expect(Mat3.equals(m0, expect0)).toBe(true);
        expect(Mat3.equals(m1, expect0)).toBe(true);
    });

    test('determinant', () => {
        const cos = Math.cos(Math.PI / 6);
        const sin = Math.sin(Math.PI / 6);
        const m0 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const expect0 = 1;
        const d0 = Mat3.determinant(m0);
        const d1 = m0.determinant();
        log('determinant 0: ', d0);
        log('determinant 1: ', d1);
        expect(d0).toBe(expect0);
        expect(d1).toBe(expect0);
    });

    test('multiply', () => {
        const cos = Math.cos(Math.PI / 6);
        const sin = Math.sin(Math.PI / 6);
        const cos2 = Math.cos(Math.PI / 3);
        const sin2 = Math.sin(Math.PI / 3);
        const m0 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const m1 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const expect0 = new Mat3(cos2, sin2, 0, -sin2, cos2, 0, 0, 0, 1);
        Mat3.multiply(m0, m0, m1);
        log('multiply: ', m0);
        expect(Mat3.equals(m0, expect0)).toBe(true);
    });

    test('multiplyMat4', () => {
        const cos = Math.cos(Math.PI / 6);
        const sin = Math.sin(Math.PI / 6);
        const cos2 = Math.cos(Math.PI / 3);
        const sin2 = Math.sin(Math.PI / 3);
        const m0 = new Mat3(cos, sin, 0, -sin, cos, 0, 0, 0, 1);
        const m1 = new Mat4(cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
        const expect0 = new Mat3(cos2, sin2, 0, -sin2, cos2, 0, 0, 0, 1);
        Mat3.multiplyMat4(m0, m0, m1);
        log('multiplyMat4: ', m0);
        expect(Mat3.equals(m0, expect0)).toBe(true);
    });

    test('translate', () => {
        const m0 = new Mat3(2, 0, 0, 0, 3, 0, 0, 0, 1);
        const v0 = new Vec3(1, 2, 1);
        const v1 = new Vec3(2, 3, 1);
        const expect0 = new Vec3(6, 15, 1);
        Mat3.translate(m0, m0, v1);
        Vec3.transformMat3(v0, v0, m0);
        log('translate: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('scale', () => {
        const m0 = new Mat3(2, 0, 0, 0, 3, 0, 0, 0, 1);
        const m1 = new Mat3(2, 0, 0, 0, 3, 0, 0, 0, 1);
        const v0 = new Vec3(1, 2, 1);
        const v1 = new Vec3(2, 3, 1);
        const expect0 = new Vec3(4, 18, 1);
        Mat3.scale(m0, m0, v1);
        m1.scale(v1);
        const s0 = Vec3.transformMat3(new Vec3(), v0, m0);
        const s1 = Vec3.transformMat3(new Vec3(), v0, m1);
        log('scale 0: ', s0);
        log('scale 1: ', s1);
        expect(Vec3.equals(s0, expect0)).toBe(true);
        expect(Vec3.equals(s1, expect0)).toBe(true);
    });

    test('rotate', () => {
        const m0 = new Mat3(2, 0, 0, 0, 3, 0, 0, 0, 1);
        const m1 = new Mat3(2, 0, 0, 0, 3, 0, 0, 0, 1);
        const v0 = new Vec3(1, 2, 1);
        const expect0 = new Vec3(-4, 3, 1);
        Mat3.rotate(m0, m0, Math.PI / 2);
        m1.rotate(Math.PI / 2);
        const r0 = Vec3.transformMat3(new Vec3(), v0, m0);
        const r1 = Vec3.transformMat3(new Vec3(), v0, m1);
        log('rotate 0: ', r0);
        log('rotate 1: ', r1);
        expect(Vec3.equals(r0, expect0)).toBe(true);
        expect(Vec3.equals(r1, expect0)).toBe(true);
    });

    test('fromQuat', () => {
        const m0 = new Mat3();
        const m1 = new Mat3();
        const q0 = Quat.fromAxisAngle(new Quat(), new Vec3(1, 0, 0), Math.PI);
        const v0 = new Vec3(0, 1, 0);
        const expect0 = new Vec3(0, -1, 0);
        Mat3.fromQuat(m0, q0);
        m1.fromQuat(q0);
        const r0 = Vec3.transformMat3(new Vec3(), v0, m0);
        const r1 = Vec3.transformMat3(new Vec3(), v0, m1);
        log('fromQuat 0: ', r0);
        log('fromQuat 1: ', r1);
        expect(Vec3.equals(r0, expect0)).toBe(true);
        expect(Vec3.equals(r1, expect0)).toBe(true);
    });

    test('toEuler', () => {
        const m0 = new Mat3();
        const q0 = Quat.fromAxisAngle(new Quat(), new Vec3(0, 0, 1), Math.PI);
        const v0 = new Vec3();
        const expect0 = new Vec3(0, 0, Math.PI);
        Mat3.fromQuat(m0, q0);
        Mat3.toEuler(m0, v0);
        log('toEuler: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('toString', () => {
        const m = new Mat3(
12.1234, 0, 44.123433,
55.12234, 6.1230835, 12384.126,
7348.12237, 1283.8, 0.000009
);
        const expect0 = `[
12.1234, 0, 44.123433,
55.12234, 6.1230835, 12384.126,
7348.12237, 1283.8, 0.000009
]`;
        const s = m.toString();
        log('toString: ', s);
        expect(s).toBe(expect0);
    });
});