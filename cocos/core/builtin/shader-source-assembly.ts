import { HTML5, MINIGAME, RUNTIME_BASED, WECHAT, TEST } from 'internal:constants';
import { glsl1 } from './shader-sources/glsl1';
import { glsl3 } from './shader-sources/glsl3';
import { glsl4 } from './shader-sources/glsl4';

type ShaderVersion = 'glsl1' | 'glsl3' | 'glsl4';

type ShaderSource = Record<string, string>[][];

/**
 * The shader sources assembled in this build.
 */
const assembly: Partial<Record<ShaderVersion, ShaderSource>> = (() => {
    if (TEST) {
        return {
            glsl1,
            glsl3,
            glsl4,
        };
    } else if (HTML5 || WECHAT || RUNTIME_BASED) {
        return {
            glsl1,
            glsl3,
            glsl4,
        };
    } else if (MINIGAME) {
        return {
            glsl1,
        };
    } else {
        return {
            glsl1,
            glsl3,
            glsl4,
        };
    }
})();

export default assembly;
