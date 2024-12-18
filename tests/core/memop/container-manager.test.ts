import { ScalableContainer, scalableContainerManager } from '../../../cocos/core/memop/scalable-container';

class TestContainer extends ScalableContainer {
    calledTimes = 0;
    tryShrink () {
        this.calledTimes++;
    }
}

test('container', () => {
    // @ts-expect-error
    scalableContainerManager._pools.length = 0;

    const testContainer = new TestContainer();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(1);
    expect(testContainer._poolHandle).toBe(0);

    scalableContainerManager.addContainer(testContainer);
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(1);
    expect(testContainer._poolHandle).toBe(0);

    const testContainer1 = new TestContainer();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(2);
    expect(testContainer1._poolHandle).toBe(1);

    testContainer.destroy();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(1);
    expect(testContainer._poolHandle).toBe(-1);
    expect(testContainer1._poolHandle).toBe(0);

    const testContainer2 = new TestContainer();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(2);
    expect(testContainer2._poolHandle).toBe(1);

    testContainer2.destroy();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(1);
    expect(testContainer2._poolHandle).toBe(-1);
    expect(testContainer1._poolHandle).toBe(0);

    testContainer1.destroy();
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(0);
    expect(testContainer2._poolHandle).toBe(-1);
    expect(testContainer1._poolHandle).toBe(-1);
    expect(testContainer._poolHandle).toBe(-1);

    scalableContainerManager.removeContainer(testContainer1);
    // @ts-expect-error
    expect(scalableContainerManager._pools.length).toBe(0);
});

test('shrink', () => {
    // @ts-expect-error
    scalableContainerManager._pools.length = 0;
    const testContainer = new TestContainer();
    expect(testContainer.calledTimes).toBe(0);

    // default shrink time span is 5
    scalableContainerManager.update(6);
    expect(testContainer.calledTimes).toBe(1);

    const testContainer1 = new TestContainer();
    scalableContainerManager.update(3);
    expect(testContainer.calledTimes).toBe(1);
    expect(testContainer1.calledTimes).toBe(0);

    scalableContainerManager.update(2);
    expect(testContainer.calledTimes).toBe(2);
    expect(testContainer1.calledTimes).toBe(1);

    // set shrink time span
    scalableContainerManager.shrinkTimeSpan = 0.5;
    scalableContainerManager.update(0);
    expect(testContainer.calledTimes).toBe(3);
    expect(testContainer1.calledTimes).toBe(2);
});