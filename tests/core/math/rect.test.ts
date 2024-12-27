import { Mat4, Vec2, Size, Rect } from "../../../cocos/core";

describe('Test Rect', () => {
    test('clone', () => {
        const rect = new Rect(0, 0, 100, 100);
        const rect2 = rect.clone();
        expect(rect.equals(rect2)).toBeTruthy();
    });
    test('set', () => {
        const rect = new Rect(0, 0, 100, 100);

        const res = new Rect(0, 0, 0, 0);
        rect.set(res);
        expect(Rect.equals(res, rect)).toBeTruthy();

        const res2 = new Rect(1, 2, 3, 4);
        rect.set(1, 2, 3, 4);
        expect(Rect.equals(res2, rect)).toBeTruthy();
    });
    test('fromMinMax', () => {
        const min = new Vec2(0, 0);
        const max = new Vec2(100, 100);

        const rect = Rect.fromMinMax(new Rect(), min, max);
        const res = new Rect(0, 0, 100, 100);

        expect(Rect.equals(rect, res)).toBeTruthy(); // static only
    });
    test('lerp', () => {
        const from = new Rect(0, 0, 100, 100);
        const to = new Rect(100, 100, 100, 100);

        const res1 = Rect.lerp(new Rect(), from, to, 0.5);
        const res2 = from.clone();
        const exp = new Rect(50, 50, 100, 100);
        res2.lerp(to, 0.5);

        expect(Rect.equals(exp, res1)).toBeTruthy(); // static
        expect(Rect.equals(exp, res2)).toBeTruthy(); // this
    });
    test('intersection', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const rect2 = new Rect(50, 50, 100, 100);

        const res = Rect.intersection(new Rect(), rect1, rect2);
        const res2 = new Rect(50, 50, 50, 50);

        expect(Rect.equals(res, res2)).toBeTruthy();
    });
    test('union', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const rect2 = new Rect(50, 50, 100, 100);

        const res = Rect.union(new Rect(), rect1, rect2);
        const res2 = new Rect(0, 0, 150, 150);

        expect(Rect.equals(res, res2)).toBeTruthy();
    });
    test('center', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const center = new Vec2(50, 50);

        expect(Vec2.equals(rect1.center, center)).toBeTruthy();
    });
    test('origin', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const res = new Vec2(0, 0);
        const origin = rect1.origin;

        expect(Vec2.equals(res, origin)).toBeTruthy();
    });
    test('size', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const res = new Size(100, 100);
        const size = rect1.size;

        expect(Size.equals(res, size)).toBeTruthy();
    });
    test('toString', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const res = '(0, 0, 100, 100)';

        expect(rect1.toString()).toBe(res);
    });
    test('contains', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const point1 = new Vec2(50, 50);
        const point2 = new Vec2(150, 150);
        const point3 = new Vec2(0, 0);
        const point4 = new Vec2(100, 100);

        expect(rect1.contains(point1)).toBeTruthy();
        expect(rect1.contains(point2)).toBeFalsy();
        expect(rect1.contains(point3)).toBeTruthy();
        expect(rect1.contains(point4)).toBeTruthy();
    });
    test('containsRect', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const rect2 = new Rect(50, 50, 50, 50);
        const rect3 = new Rect(50, 50, 100, 100);
        const rect4 = new Rect(150, 150, 100, 100);

        expect(rect1.containsRect(rect2)).toBeTruthy();
        expect(rect1.containsRect(rect3)).toBeFalsy();
        expect(rect1.containsRect(rect4)).toBeFalsy();
    });
    test('transformMat4', () => {
        const rect1 = new Rect(0, 0, 100, 100);

        const mat4 = Mat4.fromZRotation(new Mat4(), Math.PI / 4);

        const rect2 = rect1.clone();
        rect2.transformMat4(mat4);

        const halfDim = 50 * Math.sqrt(2);
        const dim = halfDim * 2.0;
        const res = new Rect(-halfDim, 0, dim, dim);

        expect(rect2.x).toBeCloseTo(res.x);
        expect(rect2.y).toBeCloseTo(res.y);
        expect(rect2.width).toBeCloseTo(res.width);
        expect(rect2.height).toBeCloseTo(res.height);
    });
    test('transformMat4ToPoints', () => {
        const rect1 = new Rect(0, 0, 100, 100);
        const mat4 = Mat4.fromZRotation(new Mat4(), Math.PI / 4);

        const point1 = new Vec2();
        const point2 = new Vec2();
        const point3 = new Vec2();
        const point4 = new Vec2();

        const halfDim = 50 * Math.sqrt(2);
        const dim = halfDim * 2.0;

        rect1.transformMat4ToPoints(mat4, point1, point2, point3, point4);

        const res1 = new Vec2(0, 0);
        const res2 = new Vec2(-halfDim, halfDim);
        const res3 = new Vec2(0, dim);
        const res4 = new Vec2(halfDim, halfDim);

        expect(Vec2.equals(point1, res1)).toBeTruthy();
        expect(Vec2.equals(point2, res2)).toBeTruthy();
        expect(Vec2.equals(point3, res3)).toBeTruthy();
        expect(Vec2.equals(point4, res4)).toBeTruthy();
    });
});

