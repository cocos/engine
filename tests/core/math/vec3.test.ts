import { log } from '../../test.log';
import { v3, Vec3 } from '../../../cocos/core/math/vec3';
import { Mat3 } from '../../../cocos/core/math/mat3';
import { Mat4 } from '../../../cocos/core/math/mat4';
import { Quat } from '../../../cocos/core/math/quat';
import '../../utils/matchers/value-type-asymmetric-matchers';

describe('Test Vec3', () => {
    test('normalize', () => {
        const v0 = new Vec3(3, 4, 12);
        const v1 = new Vec3(3, 4, 12);
        const expect0 = new Vec3(0.2307692, 0.3076923, 0.9230769);
        Vec3.normalize(v0, v0);
        v1.normalize();
        log('normalize 0: ', v0);
        log('normalize 1: ', v1);
        expect(Vec3.equals(v0, expect0)).toBe(true);
        expect(Vec3.equals(v1, expect0)).toBe(true);
    });

    test('dot', () => {
        const v0 = new Vec3(3, 4, 0);
        const v1 = new Vec3(-4, 3, 0);
        const value0 = Vec3.dot(v0, v1);
        const value1 = v0.dot(v1);
        const expect0 = 0;
        const expect1 = 0;
        log('dot 0: ', value0);
        log('dot 1: ', value1);
        expect(value0).toBe(expect0);
        expect(value1).toBe(expect1);
    });

    test('cross', () => {
        const v0 = new Vec3(3, 4, 0);
        const v1 = new Vec3(3, 4, 0);
        const value0 = Vec3.cross(new Vec3(), v0, v1);
        const value1 = v0.cross(v1);
        const expect0 = new Vec3(0, 0, 0);
        log('cross 0: ', value0);
        log('cross 1: ', value1);
        expect(Vec3.equals(value0, expect0)).toBe(true);
        expect(Vec3.equals(value1, expect0)).toBe(true);
    });

    test('transformMat4', () => {
        const v0 = new Vec3(3, 4, 5);
        const v1 = new Vec3(3, 4, 5);
        const m0 = Mat4.fromScaling(new Mat4(), new Vec3(1, 2, 3));
        const m1 = Mat4.fromTranslation(new Mat4(), new Vec3(1, 2, 3));
        Mat4.multiply(m0, m1, m0);
        const expect0 = new Vec3(4, 10, 18);
        Vec3.transformMat4(v0, v0, m0);
        v1.transformMat4(m0);
        log('transformMat4 0: ', v0);
        log('transformMat4 1: ', v1);
        expect(Vec3.equals(v0, expect0)).toBe(true);
        expect(Vec3.equals(v1, expect0)).toBe(true);
    });

    test('transformMat4Normal', () => {
        const v0 = new Vec3(3, 4, 5);
        const m0 = Mat4.fromScaling(new Mat4(), new Vec3(1, 2, 3));
        const expect0 = new Vec3(3, 8, 15);
        Vec3.transformMat4Normal(v0, v0, m0);
        log('transformMat4Normal: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('transformMat3', () => {
        const v0 = new Vec3(3, 4, 5);
        const m0 = new Mat3();
        m0.m00 = 1;
        m0.m04 = 2;
        m0.m08 = 3;
        const expect0 = new Vec3(3, 8, 15);
        Vec3.transformMat3(v0, v0, m0);
        log('transformMat3: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('transformAffine', () => {
        const v0 = new Vec3(3, 4, 5);
        const m0 = Mat4.fromScaling(new Mat4(), new Vec3(1, 2, 3));
        const expect0 = new Vec3(3, 8, 15);
        Vec3.transformAffine(v0, v0, m0);
        log('transformAffine: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('transformQuat', () => {
        const v0 = new Vec3(3, 4, 5);
        const q0 = Quat.fromAxisAngle(new Quat(), new Vec3(0, 0, 1), Math.PI / 2);
        const expect0 = new Vec3(-4, 3, 5);
        Vec3.transformQuat(v0, v0, q0);
        log('transformQuat: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('transformRTS', () => {
        const v0 = new Vec3(1, 1, 1);
        const s0 = new Vec3(2, 3, 4);
        const t0 = new Vec3(1, 2, 3);
        const q0 = Quat.fromAxisAngle(new Quat(), new Vec3(0, 0, 1), Math.PI / 2);
        const expect0 = new Vec3(-2, 4, 7);
        Vec3.transformRTS(v0, v0, q0, t0, s0);
        log('transformRTS: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('transformInverseRTS', () => {
        const v0 = new Vec3(-2, 4, 7);
        const s0 = new Vec3(2, 3, 4);
        const t0 = new Vec3(1, 2, 3);
        const q0 = Quat.fromAxisAngle(new Quat(), new Vec3(0, 0, 1), Math.PI / 2);
        const expect0 = new Vec3(1, 1, 1);
        Vec3.transformInverseRTS(v0, v0, q0, t0, s0);
        log('transformInverseRTS: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('rotateX', () => {
        const v0 = new Vec3(1, 2, 3);
        const expect0 = new Vec3(1, -3, 2);
        Vec3.rotateX(v0, v0, Vec3.ZERO, Math.PI / 2);
        log('rotateX: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('rotateY', () => {
        const v0 = new Vec3(1, 2, 3);
        const expect0 = new Vec3(3, 2, -1);
        Vec3.rotateY(v0, v0, Vec3.ZERO, Math.PI / 2);
        log('rotateY: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('rotateZ', () => {
        const v0 = new Vec3(1, 2, 3);
        const expect0 = new Vec3(-2, 1, 3);
        Vec3.rotateZ(v0, v0, Vec3.ZERO, Math.PI / 2);
        log('rotateZ: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('rotateN', () => {
        const v0 = new Vec3(1, 1, 0);
        const axis = new Vec3(-1, 1, 0);
        axis.normalize();
        const expect0 = new Vec3(-1, -1, 0);
        Vec3.rotateN(v0, v0, Vec3.ZERO, axis, Math.PI);
        log('rotateN: ', v0);
        expect(Vec3.equals(v0, expect0)).toBe(true);
    });

    test('angle', () => {
        const v0 = new Vec3(3, 4, 0);
        const v1 = new Vec3(-6, -8, 0);
        const expect0 = Math.PI;
        const value0 = Vec3.angle(v0, v1);
        log('angle: ', value0);
        expect(value0).toBe(expect0);
    });

    test('moveTowards', () => {
        const v0 = new Vec3(1, 1, 0);
        const v1 = new Vec3(5, 1, 0);
        const expect0 = new Vec3(3, 1, 0);
        const value0 = Vec3.moveTowards(new Vec3(), v0, v1, 2);
        log('moveTowards: ', value0);
        expect(Vec3.equals(value0, expect0)).toBe(true);
    });

    test(`generateOrthogonal`, () => {
        // Zero input results zero result.
        expect(gen(Vec3.ZERO)).toBeCloseToVec3(Vec3.ZERO);

        // Even the input is very close to zero, the result is not zero.
        expect(gen(Vec3.add(new Vec3(), Vec3.ZERO, new Vec3(1e-10, 1e-20, 1e-30)))).toEqual({
            x: 9.999999999999999e-11,
            y: -1,
            z: 0,
        });

        // Especially observe the behavior on standard unit vectors.
        {
            for (const len of [1, -1, 0.3, -6.18]) {
                if (len > 0) {
                    expect(gen(new Vec3(len, 0, 0))).toBeCloseToVec3(new Vec3(0, -1, 0));
                    expect(gen(new Vec3(0, len, 0))).toBeCloseToVec3(new Vec3(1, 0, 0));
                    expect(gen(new Vec3(0, 0, len))).toBeCloseToVec3(new Vec3(1, 0, 0));
                } else {
                    expect(gen(new Vec3(len, 0, 0))).toBeCloseToVec3(new Vec3(0, 1, 0));
                    expect(gen(new Vec3(0, len, 0))).toBeCloseToVec3(new Vec3(-1, 0, 0));
                    expect(gen(new Vec3(0, 0, len))).toBeCloseToVec3(new Vec3(-1, 0, 0));
                }
            }
        }

        expect(gen(new Vec3(1, -2, 3))).toEqual({
            x: 0,
            y: 0.8320502943378437,
            z: 0.5547001962252291,
        });
        expect(gen(new Vec3(1, -1, -1))).toEqual({
            x: -0.7071067811865475,
            y: -0.7071067811865475,
            z: 0,
        });

        // The input vector need not to be normalized,
        // but its effect should be equivalent to its normalized version.
        ((v: Readonly<Vec3>) => void expect(gen(v)).toBeCloseToVec3(gen(Vec3.normalize(new Vec3(), v))))(
            new Vec3(1, -2, 3));

        function gen (input: Readonly<Vec3>) {
            const result = new Vec3(Number.NaN, Number.NaN, Number.NaN);

            // The input should not be modified.
            const inputFrozen = Object.freeze(Vec3.clone(input));

            // The return value should be the `out` argument.
            expect(Vec3.generateOrthogonal(result, inputFrozen)).toBe(result);

            if (Vec3.strictEquals(input, Vec3.ZERO)) {
                // If the input is strictly 0, the result should be strictly 0.
                expect(Vec3.strictEquals(result, Vec3.ZERO)).toBe(true);
            } else {
                // Otherwise, the result should be normalized.
                expect(Vec3.lengthSqr(result)).toBeCloseTo(1, 5);
                // The result should be orthogonal to input.
                expect(Vec3.angle(input, result)).toBeCloseTo(Math.PI / 2, 5);
            }

            return result;
        };
    });

    test(`Signed angle`, () => {
        const MATCH_NUM_DIGITS = 6;
    
        // If either of the input vector is zero,
        // the result is equal to `Vec3.angle()`(ie. 0),
        // in despite of what "normal" is.
        assertsResult_zero(Vec3.ZERO, Vec3.ZERO, Vec3.ZERO);
        assertsResult_zero(Vec3.ZERO, Vec3.ZERO, v3(4., 5., 6.));
        assertsResult_zero(Vec3.ZERO, v3(1., 2., -3.), Vec3.ZERO);
        assertsResult_zero(v3(1., 2., -3.), Vec3.ZERO, Vec3.ZERO);
        assertsResult_zero(v3(1., 2., -3.), Vec3.ZERO, v3(4., 5., 6.));

        // If the input vectors are co-linear,
        // the result has positive sign.
        // in despite of what "normal" is.
        {
            const a = v3(1, 2, 3);
            const normal = v3(7, -1, 0.618);

            { // b is in same dir.
                const b = Vec3.multiplyScalar(v3(), a, 3);
                assertsResult_zero(a, b, Vec3.ZERO);
                assertsResult_zero(a, b, normal);
                assertsResult_zero(a, b, Vec3.negate(v3(), normal));
                assertsResult_zero(a, b, Vec3.multiplyScalar(v3(), a, -1.0086));
                assertsResult_zero(a, b, Vec3.multiplyScalar(v3(), a, 1.0086));
            }
            
            { // b is in opposite dir.
                const b = Vec3.multiplyScalar(v3(), a, -4);
                assertsResult_positiveSign(a, b, Vec3.ZERO);
                assertsResult_positiveSign(a, b, normal);
                assertsResult_positiveSign(a, b, Vec3.negate(v3(), normal));
                assertsResult_positiveSign(a, b, Vec3.multiplyScalar(v3(), a, -1.0086));
                assertsResult_positiveSign(a, b, Vec3.multiplyScalar(v3(), a, 1.0086));
            }
        }

        // If normal is zero, the result has positive sign.
        assertsResult_positiveSign(v3(1., 2., -3.), v3(7, -1, 0.618), Vec3.ZERO);

        // If normal is co-linear with either input vector,
        // the result is **indeterminate**, but it is equal to either ±`Vec3.angle()`.
        {
            const a = v3(1, 2, 3);
            const b = v3(7, -1, 0.618);
            // Theses result positive.
            assertsResult_positiveSign(a, b, Vec3.multiplyScalar(v3(), a, -1.5));
            assertsResult_positiveSign(a, b, Vec3.multiplyScalar(v3(), a, 1.5));
            assertsResult_positiveSign(a, b, Vec3.multiplyScalar(v3(), b, -1.5));
            // This results negative.
            assertsResult_negativeSign(a, b, Vec3.multiplyScalar(v3(), b, 1.5));
        }
        
        /**
         * Otherwise, asserts neither two of them are co-linear and neither of them is zero vector.
         * 
         * Let $N$ to be normal of plane decided by $a$ and $b$,
         * where $N$ is at the side so that it has the minimal angle between the input normal.
         * Let $angle$ be the unsigned angle between $a$ and $b$.
         * Around $N$, following the right hand rule, if $a$ can rotate to $b$ in positive $angle$ angle, then the result is $angle$.
         * Otherwise, the result is $-angle$.
         */
        const _SPEC = undefined;
        {
            const a = v3(1, 2, 3);
            const b = v3(7, -1, 0.618);
            const c = v3(-9, -3, -9);

            assertsResult_positiveSign(a, b, c);
            assertsResult_negativeSign(a, b, Vec3.negate(v3(), c));
        }

        function assertsResult_positiveSign(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
            const result = assertsResult_basic(a, b, normal);
            expect(result).toBeGreaterThan(0);
        }

        function assertsResult_negativeSign(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
            const result = assertsResult_basic(a, b, normal);
            expect(result).toBeLessThan(0);
        }

        function assertsResult_zero(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
            const result = assertsResult_basic(a, b, normal);
            expect(result).toStrictEqual(0);
        }

        function assertsResult_basic(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
            const result = Vec3.signedAngle(a, b, normal);
            expect(Math.abs(result)).toBeCloseTo(Vec3.angle(a, b), MATCH_NUM_DIGITS);
            return result;
        }
    });

    test(`toVec2`, () => {
        const vec3 = new Vec3(1, 2, 3);
        const vec2 = vec3.toVec2();
        expect(vec2.x).toBe(1);
        expect(vec2.y).toBe(2);

        // vec3 will not affect vec2.
        vec3.x = 2;
        vec3.y = 3;
        expect(vec2.x).toBe(1);
        expect(vec2.y).toBe(2);
    });

    test('toString', () => {
        const v = new Vec3(100, 100, 1283.3892389);
        expect(v.toString()).toBe('(100, 100, 1283.3892389)');
    });
});