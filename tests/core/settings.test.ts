import { Settings } from "../../cocos/core";

describe('Settings', () => {
    test('construct', () => {
        const settings = new Settings();
        settings.init();
        expect(settings.querySettings(Settings.Category.ASSETS, 'dsa')).toBeNull();
        expect(settings.querySettings('test', 'd')).toBeNull();
        expect(settings.querySettings(Settings.Category.ANIMATION, 'test')).toBeNull();
    });

    test('base', () => {
        const settings = new Settings();
        // @ts-expect-error access private property
        settings._settings = {
            assets: {
                preloadBundles: [{ bundle: 'asddda' }, { bundle: 'internal' }],
                preloadAssets: ['sdd1ssq', 'hjiepoqd'],
                importBase: '/assets',
                nativeBase: '/assets'
            },
            animation: {
                animationNum: 10,
            },
            testA: {
                length: 10
            },
            testB: { str: 'sss' },
            scripting: {
                jsLists: ['plugin']
            }
        };

        settings.init('', {
            animation: {},
            assets: {
                preloadBundles: [{ bundle: 'resources', version: '2s1xa' }],
                server: 'http://www.cocos.com/',
                importBase: null,
                nativeBase: undefined
            },
            testA: {
                length: 20,
            },
            testB: null,
            testC: { exampleName: 'xxx' }
        });
        const preloadBundles = settings.querySettings(Settings.Category.ASSETS, 'preloadBundles');
        expect(preloadBundles.length).toBe(1);
        expect(preloadBundles[0].bundle).toBe('resources');
        expect(preloadBundles[0].version).toBe('2s1xa');
        expect(settings.querySettings(Settings.Category.ASSETS, 'importBase')).toBeNull();
        expect(settings.querySettings(Settings.Category.ASSETS, 'nativeBase')).toBeUndefined();
        expect(settings.querySettings(Settings.Category.ASSETS, 'server')).toBe('http://www.cocos.com/');
        expect(settings.querySettings(Settings.Category.ASSETS, 'preloadAssets')[0]).toBe('sdd1ssq');
        expect(settings.querySettings('testA', 'length')).toBe(20);
        expect(settings.querySettings(Settings.Category.ANIMATION, 'animationNum')).toBe(10);
        expect(settings.querySettings('testB', 'str')).toBe('sss');
        expect(settings.querySettings('testC', 'exampleName')).toBe('xxx');
        expect(settings.querySettings('scripting', 'jsLists')[0]).toBe('plugin');

        settings.overrideSettings(Settings.Category.ASSETS, 'importBase', undefined);
        expect(settings.querySettings(Settings.Category.ASSETS, 'importBase')).toBeUndefined();
        settings.overrideSettings('MyCustomSettings', 'gameName', 'ninja');
        expect(settings.querySettings('MyCustomSettings', 'gameName')).toBe('ninja');
        settings.overrideSettings(Settings.Category.ASSETS, 'nativeBase', null);
        expect(settings.querySettings(Settings.Category.ASSETS, 'nativeBase')).toBeNull();

        settings.overrideSettings('MyCustomSettings', 'gameName', 'apple');
        expect(settings.querySettings('MyCustomSettings', 'gameName')).toBe('apple');
        settings.overrideSettings('MyCustomSettings', 'testStr', 'base');
        settings.overrideSettings('MyCustomSettings', 'testStr', 'A');
        settings.overrideSettings('MyCustomSettings', 'testStr', 'B');
        expect(settings.querySettings('MyCustomSettings', 'testStr')).toBe('B');
    });
});