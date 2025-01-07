import { TextureFilter, WrapMode } from '../../cocos/asset/assets/asset-enum';
import { RenderTexture } from '../../cocos/asset/assets/render-texture';
import { Address, SamplerInfo, Filter as GFXFilter } from '../../cocos/gfx/base/define';

describe('render-texture', () => {
    test('sampler', () => {
        const rt = new RenderTexture();
        expect(rt.width).toBe(1);
        expect(rt.height).toBe(1);
        rt.initialize({ width: 256, height: 256 });
        rt.setWrapMode(WrapMode.MIRRORED_REPEAT, WrapMode.CLAMP_TO_EDGE, WrapMode.REPEAT);
        rt.setFilters(TextureFilter.LINEAR, TextureFilter.NEAREST);
        expect(rt.getSamplerInfo()).toStrictEqual(new SamplerInfo(GFXFilter.LINEAR, GFXFilter.POINT, GFXFilter.NONE, Address.MIRROR, Address.CLAMP, Address.WRAP, 0));
        expect(rt.getGFXTexture().width).toBe(256);
        expect(rt.getGFXTexture().height).toBe(256);

        rt.resize(128, 256);
        expect(rt.getGFXTexture().width).toBe(128);

        rt.resize(0, 4096);
        expect(rt.getGFXTexture().width).toBe(1);
        expect(rt.getGFXTexture().height).toBe(2048);
    });

    test('serialize', () => {
        const rt = new RenderTexture();
        const rtData1 = rt._serialize(null);
        expect(rtData1).toStrictEqual({ base: '2,2,0,0,0,0', w: 1, h: 1, n: '' });

        rt.resize(256, 128);
        rt.name = 'test';
        rt.setAnisotropy(16);
        rt.setFilters(TextureFilter.NEAREST, TextureFilter.NEAREST);
        rt.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
        const rtData2 = rt._serialize(null);
        expect(rtData2).toStrictEqual({ base: '1,1,2,2,0,16', w: 256, h: 128, n: 'test' });

        const rt2 = new RenderTexture();
        rt2._deserialize(rtData2, null);
        expect(rt2.getSamplerInfo()).toStrictEqual(rt.getSamplerInfo());
        expect(rt2.getGFXSampler()).toStrictEqual(rt.getGFXSampler());
        expect(rt2.getGFXTexture()).toStrictEqual(rt.getGFXTexture());
    })
});