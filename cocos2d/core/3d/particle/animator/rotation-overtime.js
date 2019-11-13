import { ccclass, property } from '../../../platform/CCClassDecorator';
import { pseudoRandom } from '../../../value-types';
import CurveRange from './curve-range';

// tslint:disable: max-line-length
const ROTATION_OVERTIME_RAND_OFFSET = 125292;

@ccclass('cc.RotationOvertimeModule')
export default class RotationOvertimeModule {

    /**
     * @zh 是否启用。
     */
    @property
    enable = false;

    @property
    _separateAxes = false;

    /**
     * @zh 是否三个轴分开设定旋转（暂不支持）。
     */
    @property
    get separateAxes () {
        return this._separateAxes;
    }

    set separateAxes (val) {
        if (!val) {
            this._separateAxes = val;
        }
        else {
            console.error('rotation overtime separateAxes is not supported!');
        }
    }

    /**
     * @zh 绕 X 轴设定旋转。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
        radian: true,
    })
    x = new CurveRange();

    /**
     * @zh 绕 Y 轴设定旋转。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
        radian: true,
    })
    y = new CurveRange();

    /**
     * @zh 绕 X 轴设定旋转。
     */
    @property({
        type: CurveRange,
        range: [-1, 1],
        radian: true,
    })
    z = new CurveRange();

    constructor () {

    }

    animate (p, dt) {
        const normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
        if (!this._separateAxes) {
            p.rotation.x += this.z.evaluate(normalizedTime, pseudoRandom(p.randomSeed + ROTATION_OVERTIME_RAND_OFFSET)) * dt;
        }
        else {
            // TODO: separateAxes is temporarily not supported!
            const rotationRand = pseudoRandom(p.randomSeed + ROTATION_OVERTIME_RAND_OFFSET);
            p.rotation.x += this.x.evaluate(normalizedTime, rotationRand) * dt;
            p.rotation.y += this.y.evaluate(normalizedTime, rotationRand) * dt;
            p.rotation.z += this.z.evaluate(normalizedTime, rotationRand) * dt;
        }
    }
}
