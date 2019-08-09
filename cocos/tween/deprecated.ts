/**
 * @hidden
 */

// deprecated
import { Tween, tweenUtil } from './tween';
import { warn } from '../core/platform/CCDebug';

/**
 * @zh
 * 增加一个 tween 缓动，与 creator 2D 中的 cc.tween 功能类似
 * @deprecated
 * tween 已经被废弃，请使用 tweenUtil
 * @param target 缓动目标
 *
 * 注：请勿对 node 矩阵相关数据直接进行缓动，例如传入 this.node.position
 * @example
 * 
 * ```typescript
 * 
 * let position = new math.Vec3();
 * 
 * tweenUtil(position)
 * 
 *    .to(2, new math.Vec3(0, 2, 0), { easing: 'Cubic-InOut' })
 * 
 *    .start();
 * 
 * ```
 */
export function tween (target: Object): Tween {
    warn("'%s' is deprecated, please use '%s' instead.", `tween`, `tweenUtil`);
    warn("下个版本中将会移除 tween 方法，请及时调整为 tweenUtil");
    return tweenUtil(target);
}
cc.tween = tween;