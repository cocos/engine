import { ccclass, property } from '../../cocos/core/data/class-decorator';
import { attr } from '../../cocos/core/data/utils/attribute';
import { Layers } from '../../cocos/scene-graph/layers';

@ccclass('testLayers')
class testLayers{
    @property({ type: Layers.BitMask })
    visibility = 0;

    @property({ type: Layers.Enum })
    visibilityEnum = 0;
}

test('Add/Remove layer', () => {
    Layers.addLayer('abcd',1);
    expect(
        attr(testLayers,'visibility').bitmaskList.findIndex((e) => e.name === 'abcd')
    ).toBeGreaterThanOrEqual(0);
    expect(
        attr(testLayers,'visibilityEnum').enumList.findIndex((e) => e.name === 'abcd')
    ).toBeGreaterThanOrEqual(0);

    Layers.deleteLayer(1);
    expect(
        attr(testLayers,'visibility').bitmaskList.findIndex((e) => e.name === 'abcd')
    ).toBeLessThan(0);
    expect(
        attr(testLayers,'visibilityEnum').enumList.findIndex((e) => e.name === 'abcd')
    ).toBeLessThan(0);
});
