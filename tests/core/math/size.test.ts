import { Mat4, Vec2, Size, Rect } from "../../../cocos/core";

describe('Test Size', () => {
    test('clone', () => {
        const size = new Size(100, 100);
        const size2 = size.clone();
        expect(size.equals(size2)).toBeTruthy();
    });

    test('set', () => {
        const size = new Size(100, 100);

        const res = new Size(0, 0);
        size.set(res);
        expect(Size.equals(res, size)).toBeTruthy();

        const res2 = new Size(1, 2);
        size.set(1, 2);
        expect(Size.equals(res2, size)).toBeTruthy();
    });

    test('lerp', () => {
        const from = new Size(100, 100);
        const to = new Size(200, 200);

        const res1 = Size.lerp(new Size(), from, to, 0.5);
        const res2 = from.clone();
        const exp = new Size(150, 150);
        res2.lerp(to, 0.5);

        expect(Size.equals(exp, res1)).toBeTruthy(); // static
        expect(Size.equals(exp, res2)).toBeTruthy(); // this
    });

    test('toString', () => {
        const size = new Size(100, 100);
        expect(size.toString()).toBe('(100, 100)');
    });

});