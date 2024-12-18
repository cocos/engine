import { Pool } from '../../../cocos/core/memop/pool';

class Test {
    public tag: number;
    public destroyed: boolean = false;
    constructor (num: number) {
        this.tag = num;
    }
}

let tagValue = 0;
function createTest () {
    return new Test(tagValue++);
}

let calledTimes = 0;
function destroyTest (obj) {
    calledTimes++;
    obj.destroyed = true;
}

const ARRAY_SIZE = 10;
let pool = new Pool<Test>(createTest, ARRAY_SIZE, destroyTest);

test('alloc', () => {
    for (let i = 0; i < ARRAY_SIZE + 2; ++i) {
        const obj = pool.alloc();
        expect(obj).not.toStrictEqual(undefined);
    }
});

test('free', () => {
    const tmp = createTest();
    pool.free(tmp);
    const newElement = pool.alloc();
    expect(newElement).toStrictEqual(tmp);
});

test('freeArray', () => {
    let tmpArr: Test[] = [];
    const TEST_SIZE = 5;
    for (let i = 0; i < TEST_SIZE; ++i) {
        tmpArr[i] = createTest();
    }
    pool.freeArray(tmpArr);
    for (let i = 0; i < TEST_SIZE; ++i) {
        const tmpObj = pool.alloc();
        expect(tmpArr[TEST_SIZE - i - 1]).toStrictEqual(tmpObj);
    }
});

test('shrink', () => {
    const shrinkThreshold = 30;
    pool = new Pool<Test>(createTest, 10, destroyTest, shrinkThreshold);
    calledTimes = 0;

    // Pool available size is 10, less than 30, so will not free any object.
    pool.tryShrink();
    // @ts-expect-error
    expect(pool._nextAvail).toEqual(9);
    calledTimes = 0;


    // Pool available size is 60 = 2 * shrinkThreshold, will shrink 30 elements. 
    const test: Test[] = [];
    for (let i = 0; i < 50; ++i) {
        test[i] = createTest();
    }
    pool.freeArray(test);
    pool.tryShrink();
    // @ts-expect-error
    expect(pool._nextAvail).toEqual(29);
    calledTimes = 30;

    // Pool available size is 50, but its length is 60, so it will shrink 10 elements.
    calledTimes = 0;
    for (let i = 0; i < 30; ++i) {
        pool.free(createTest());
    }
    for (let i = 0; i < 10; ++i) {
        pool.alloc();
    }
    pool.tryShrink();
    calledTimes = 10;
    // @ts-expect-error
    expect(pool._nextAvail).toEqual(39);

    // No matter shrink how many times, pool size will not less then shrinkThreshold.
    pool.tryShrink();
    pool.tryShrink();
    pool.tryShrink();
    pool.tryShrink();
    // @ts-expect-error
    expect(pool._nextAvail).toEqual(29);
});

test('destroy', () => {
    calledTimes = 0;
    // @ts-expect-error
    const beforeDestroy = pool._nextAvail;
    // @ts-expect-error
    expect(pool._nextAvail).toBeGreaterThan(0);

    pool.destroy();

    expect(calledTimes).toBe(beforeDestroy + 1);
    // @ts-expect-error
    expect(pool._nextAvail).toBe(-1);
    // @ts-expect-error
    expect(pool._freePool.length).toBe(0);
});