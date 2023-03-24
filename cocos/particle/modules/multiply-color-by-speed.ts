import { ccclass, rangeMin, serializable, type } from '../../core/data/decorators';
import { GradientRange } from '../gradient-range';
import { ParticleEmitterParams, ParticleExecContext } from '../particle-base';
import { ModuleExecStage, ParticleModule } from '../particle-module';
import { BuiltinParticleParameter, ParticleDataSet } from '../particle-data-set';
import { ParticleVec3Parameter } from '../particle-parameter';
import { approx, assert, Color, math, pseudoRandom, Vec3, Vec2 } from '../../core';

const tempVelocity = new Vec3();
const tempColor = new Color();
const tempColor2 = new Color();
const tempColor3 = new Color();
const MULTIPLY_COLOR_BY_SPEED_RAND_OFFSET = 27382;

@ccclass('cc.MultiplyColorBySpeed')
@ParticleModule.register('MultiplyColorBySpeed', ModuleExecStage.UPDATE, ['Solve', 'State'])
export class MultiplyColorBySpeedModule extends ParticleModule {
    /**
     * @zh 颜色随速度变化的参数，各个 key 之间线性差值变化。
     */
    @type(GradientRange)
    @serializable
    public color = new GradientRange();

    @type(Vec2)
    @serializable
    @rangeMin(0)
    public speedRange = new Vec2(0, 1);

    private _speedScale = 0;
    private _speedOffset = 0;

    public tick (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        assert(!approx(this.speedRange.x, this.speedRange.y), 'Speed Range X is so closed to Speed Range Y');
        assert(this.color.mode === GradientRange.Mode.Gradient || this.color.mode === GradientRange.Mode.TwoGradients, 'Color mode must be Gradient or TwoGradients');
        context.markRequiredParameter(BuiltinParticleParameter.COLOR);
        if (this.color.mode === GradientRange.Mode.TwoGradients) {
            context.markRequiredParameter(BuiltinParticleParameter.RANDOM_SEED);
        }
        this._speedScale = 1 / Math.abs(this.speedRange.x - this.speedRange.y);
        this._speedOffset = -this.speedRange.x * this._speedScale;
    }

    public execute (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        const { fromIndex, toIndex } = context;
        const hasVelocity = particles.hasParameter(BuiltinParticleParameter.VELOCITY);
        if (!hasVelocity) { return; }
        const scale = this._speedScale;
        const offset = this._speedOffset;
        const { color, velocity } = particles;
        if (this.color.mode === GradientRange.Mode.Gradient) {
            const gradient = this.color.gradient;
            for (let i = fromIndex; i < toIndex; i++) {
                velocity.getVec3At(tempVelocity, i);
                const ratio = math.clamp01(tempVelocity.length() * scale + offset);
                color.multiplyColorAt(gradient.evaluate(tempColor, ratio), i);
            }
        } else if (this.color.mode === GradientRange.Mode.TwoGradients) {
            const { gradientMin, gradientMax } = this.color;
            const randomSeed = particles.randomSeed.data;
            for (let i = fromIndex; i < toIndex; i++) {
                velocity.getVec3At(tempVelocity, i);
                const ratio = math.clamp01(tempVelocity.length() * scale + offset);
                color.multiplyColorAt(Color.lerp(tempColor,
                    gradientMin.evaluate(tempColor2, ratio),
                    gradientMax.evaluate(tempColor3, ratio),
                    pseudoRandom(randomSeed[i] + MULTIPLY_COLOR_BY_SPEED_RAND_OFFSET)), i);
            }
        }
    }
}
