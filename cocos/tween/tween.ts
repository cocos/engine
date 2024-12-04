/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { TweenSystem } from './tween-system';
import { warnID } from '../core';
import {
    ActionInterval, sequence, reverseTime, delayTime, spawn, Sequence,
    Spawn, repeat, repeatForever, RepeatForever, ActionCustomUpdate,
} from './actions/action-interval';
import { removeSelf, show, hide, callFunc, CallFuncCallback } from './actions/action-instant';
import { ActionUnknownDuration } from './actions/action-unknown-duration';
import { Action, ActionEnum, FiniteTimeAction } from './actions/action';
import { ITweenOption } from './export-api';
import { IInternalTweenOption, TweenAction } from './tween-action';
import { SetAction } from './set-action';
import { legacyCC } from '../core/global-exports';
import { Node } from '../scene-graph';

// https://medium.com/dailyjs/typescript-create-a-condition-based-subset-types-9d902cea5b8c
type FlagExcludedType<Base, Type> = { [Key in keyof Base]: Base[Key] extends Type ? never : Key };
type AllowedNames<Base, Type> = FlagExcludedType<Base, Type>[keyof Base];
export type TweenCustomProgress = (start: any, end: any, current: any, ratio: number) => any;
export type TweenCustomEasing = ITweenOption['easing'];

type ExtendsReturnResults<T, Base, Result1, Result2> = T extends Base ? Result1 : Result2;
type ExtendsReturnResultOrNever<T, Base, Result> = ExtendsReturnResults<T, Base, Result, never>;

type MaybeUnionStringNumber<T> = ExtendsReturnResults<T, string, string | number, T>;
type StringToNumberOrNever<T> = ExtendsReturnResultOrNever<T, string, string | number>;

export interface ITweenCustomPropertyStartParameter<Value> {
    relative: boolean;
    reversed: boolean;
    start: Value;
    end: Value;
}

export interface ITweenCustomProperty<Value> {
    value: MaybeUnionStringNumber<Value> | (() => MaybeUnionStringNumber<Value>);
    progress?: TweenCustomProgress;
    easing?: TweenCustomEasing;
    convert?: ExtendsReturnResultOrNever<Value, string, (v: string) => number | string>;   // Supported from v3.8.4
    clone?: ExtendsReturnResultOrNever<Value, object, (v: Value) => Value>; // Supported from v3.8.4
    add?: (a: Value, b: Value) => Value; // Supported from v3.8.4
    sub?: (a: Value, b: Value) => Value; // Supported from v3.8.4
    legacyProgress?: ExtendsReturnResultOrNever<Value, object, boolean>;    // Supported from v3.8.4, the default value is true for compatiblity
    toFixed?: ExtendsReturnResultOrNever<Value, string, number>;            // Supported from v3.8.4
    onStart?: (param: ITweenCustomPropertyStartParameter<Value>) => void;
    onStop?: () => void;
    onComplete?: () => void;
}

type KeyPartial<T, K extends keyof T> = { [P in K]?: (T[P] | (() => T[P]) | ITweenCustomProperty<T[P]> | StringToNumberOrNever<T[P]>) };
type OmitType<Base, Type> = KeyPartial<Base, AllowedNames<Base, Type>>;
// eslint-disable-next-line @typescript-eslint/ban-types
type ConstructorType<T> = OmitType<T, Function>;

type TweenWithNodeTargetOrUnknown<T> = T extends Node ? Tween<T> : unknown;

export type TweenUpdateCallback<T extends object, Args extends any[]> = (target: T, ratio: number, ...args: Args) => void;
export type TweenUpdateUntilCallback<T extends object, Args extends any[]> = (target: T, dt: number, ...args: Args) => boolean;

/**
 * @en
 * Tween provide a simple and flexible way to action, It's transplanted from cocos creator。
 * @zh
 * Tween 提供了一个简单灵活的方法来缓动目标，从 creator 移植而来。
 * @class Tween
 * @param [target]
 * @example
 * tween(this.node)
 *   .to(1, {scale: new Vec3(2, 2, 2), position: new Vec3(5, 5, 5)})
 *   .call(() => { console.log('This is a callback'); })
 *   .by(1, {scale: new Vec3(-1, -1, -1), position: new Vec3(-5, -5, -5)}, {easing: 'sineOutIn'})
 *   .start()
 */
export class Tween<T extends object = any> {
    private _actions: FiniteTimeAction[] = [];
    private _finalAction: ActionInterval | null = null;
    private _target: T | null = null;
    private _tag = ActionEnum.TAG_INVALID;
    private _timeScale = 1;

    constructor (target?: T | null) {
        this._target = target === undefined ? null : target;
    }

    /**
     * @en Sets tween tag
     * @zh 设置缓动的标签
     * @method tag
     * @param tag @en The tag set for this tween @zh 为当前缓动设置的标签
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    tag (tag: number): Tween<T> {
        this._tag = tag;
        return this;
    }

    /**
     * @en Set the id for previous action
     * @zh 设置前一个动作的 id
     * @param id @en The internal action id to set @zh 内部动作的 id 标识，
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    id (id: number): Tween<T> {
        if (this._actions.length > 0) {
            this._actions[this._actions.length - 1].setId(id);
        }
        return this;
    }

    /**
     * @en
     * Insert a tween to this sequence.
     * @zh
     * 插入一个 tween 到队列中。
     * @method then
     * @param other @en The rear tween of this tween @zh 当前缓动的后置缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    then<U extends object = any> (other: Tween<U>): Tween<T> {
        const u = other._union(true);
        if (u) {
            u.setSpeed(other._timeScale);
            this._actions.push(u);
        }
        return this;
    }

    /**
     * @en Return a new Tween instance which reverses all actions in the current tween.
     * @zh 返回新的缓动实例，其会翻转当前缓动中的所有动作。
     * @return @en The new tween instance which reverses all actions in the current tween. @zh 新的缓动实例，其会翻转当前缓动中的所有动作。
     * @note @en The returned tween instance is a new instance which is not the current tween instance.
     *       @zh 返回的缓动实例是新的生成的实例，并不是当前缓动实例。
     */
    reverse (): Tween<T>;

    /**
     * @en Reverse an action by ID in the current tween.
     * @zh 翻转当前缓动中特定标识的动作。
     * @param id @en The ID of the internal action in the current tween to reverse. @zh 要翻转的当前缓动中的动作标识。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    reverse (id: number): Tween<T>;

    /**
     * @en Reverse an action by ID in a specific tween
     * @zh 翻转特定缓动中特定标识的动作
     * @param otherTween @en The tween in which to find the action by ID
     *                   @zh 根据标识在关联的缓动中查找动作
     * @param id @en The ID of the action to reverse @zh 要翻转的动画标识
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    reverse<U extends object = any> (otherTween: Tween<U>, id?: number): Tween<T>;

    reverse<U extends object = any> (otherTweenOrId?: Tween<U> | number, id?: number): Tween<T> {
        // Overload 1: reverse()
        if (otherTweenOrId == null && id == null) {
            return this.reverseTween();
        }

        let tweenForFindAction: Tween | undefined;
        let actionId: number | undefined;

        if (otherTweenOrId instanceof Tween) {
            // Overload 3: reverse(otherTween: Tween<U>, id? number)
            tweenForFindAction = otherTweenOrId;
            if (id !== undefined) {
                actionId = id;
            }
        } else if (typeof otherTweenOrId === 'number') {
            // Overload 2: reverse(id: number)
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            tweenForFindAction = this;
            actionId = otherTweenOrId;
        }

        if (tweenForFindAction) {
            const reversedAction = Tween.reverseAction(tweenForFindAction, actionId);
            if (reversedAction) {
                this._actions.push(reversedAction);
            }
        }
        return this;
    }

    private reverseTween (): Tween<T> {
        if (this._actions.length === 0) {
            warnID(16388);
            return this.clone(this._target as T);
        }
        const action = this._union(false); // workerTarget will be updated in the following insertAction
        const r = tween(this._target as T);
        r._timeScale = this._timeScale;
        if (action) r.insertAction(action.reverse());
        return r;
    }

    private static reverseAction (t: Tween, actionId?: number): FiniteTimeAction | null {
        const actions = t._actions;
        if (actions.length === 0) return null;

        let action: FiniteTimeAction | null = null;
        let reversedAction: FiniteTimeAction | null = null;
        if (typeof actionId === 'number') {
            action = t.findAction(actionId, actions);
        } else if (t) {
            action = t._union(false);
        }

        if (action) {
            reversedAction = action.reverse();
            reversedAction._owner = t;
        } else {
            warnID(16391, `${actionId}`);
        }
        return reversedAction;
    }

    private findAction (id: number, actions: FiniteTimeAction[]): FiniteTimeAction | null {
        let action: FiniteTimeAction | null = null;
        for (let i = 0, len = actions.length; i < len; ++i) {
            action = actions[i];
            if (action.getId() === id) return action;
            if (action instanceof Sequence || action instanceof Spawn) {
                action = action.findAction(id);
                if (action) return action;
            }
        }
        return null;
    }

    /**
     * Insert an action to this sequence.
     * @param other @en The rear action of this tween @zh 当前缓动的后置缓动
     */
    private insertAction (other: FiniteTimeAction): Tween<T> {
        const action = other.clone();
        this.updateOwnerForAction(action);
        this._actions.push(action);
        return this;
    }

    private updateOwnerForAction (action: Action | null): void {
        if (!action) return;
        if (action instanceof Sequence || action instanceof Spawn) {
            action.updateOwner(this);
        } else if (!action._owner) {  // action's owner should never be changed, so only set owner when it's not set yet.
            action._owner = this;
        }
    }

    /**
     * @en
     * Sets tween target.
     * @zh
     * 设置 tween 的 target。
     * @method target
     * @param target @en The target of this tween @zh 当前缓动的目标对象
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    target<U extends object = any> (target: U): Tween<U> {
        (this as unknown as Tween<U>)._target = target;
        return this as unknown as Tween<U>;
    }

    /**
     * @en Gets the target of the current tween instance.
     * @zh 获取当前缓动的目标对象。
     * @return @en the target of the current tween instance. @zh 当前缓动的目标对象。
     */
    getTarget (): T | null {
        return this._target;
    }

    /**
     * @en Start tween from a specific time, all actions before the time will be executed and finished immediately.
     * @zh 从指定时间开始执行当前缓动，此时间前的所有缓动将被立马执行完毕。
     * @param time @en The time (unit: seconds) to start to execute the current tween. Default value: 0.
     *             @zh 要执行当前缓动的开始时间，单位为秒。默认值为 0。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    start (time: number = 0): Tween<T> {
        if (!this._target) {
            warnID(16392);
            return this;
        }
        if (this._finalAction) {
            TweenSystem.instance.ActionManager.removeAction(this._finalAction);
        }
        const final = this._unionForStart();
        this._finalAction = final;
        if (final) {
            final.setTag(this._tag);
            final.setSpeed(this._timeScale);
            final.setStartTime(time);
            final.setPaused(false); // If a tween was paused, starting the tween again should clear the 'paused' flag for the final action.
            TweenSystem.instance.ActionManager.addAction(final, this._target, false);
        } else {
            warnID(16393);
        }
        return this;
    }

    /**
     * @en
     * Stop this tween.
     * @zh
     * 停止当前 tween。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    stop (): Tween<T> {
        if (this._finalAction) {
            // ActionManager.removeAction will not stop action, so stop it before removeAction.
            this._finalAction.stop();
            TweenSystem.instance.ActionManager.removeAction(this._finalAction);
            this._finalAction = null;
        }
        return this;
    }

    /**
     * @en Pause the tween instance.
     * @zh 暂停此缓动实例。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    pause (): Tween<T> {
        if (this._finalAction) {
            this._finalAction.setPaused(true);
        } else {
            warnID(16389);
        }
        return this;
    }

    /**
     * @en Resume the tween instance.
     * @zh 恢复此缓动实例。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    resume (): Tween<T> {
        if (this._finalAction) {
            this._finalAction.setPaused(false);
        } else {
            warnID(16390);
        }
        return this;
    }

    /**
     * @en Checking whether the current tween instance is running.
     * @zh 检查当前缓动实例是否在运行。
     */
    get running (): boolean {
        if (this._finalAction) {
            return TweenSystem.instance.ActionManager.isActionRunning(this._finalAction);
        }
        return false;
    }

    /**
     * @en
     * Clone a tween.
     * @zh
     * 克隆当前 tween。
     * @method clone
     * @param target @en The target of clone tween @zh 克隆缓动的目标对象
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    clone (): Tween<T>;
    clone<U extends object = any> (target: U): Tween<U>;
    clone<U extends object = any> (target?: U): Tween<U | T> {
        const action = this._union(false);
        const r = tween<U | T>(target ?? this._target as T);
        r._timeScale = this._timeScale;
        return action ? r.insertAction(action) : r;
    }

    /**
     * @en
     * Integrate to an action by all previous actions or a range from the specific id to the last one.
     * @zh
     * 将之前所有的动作或者从指定标识的动作开始的所有动作整合为一个顺序动作。
     * @method union
     * @param fromId @en The action with the specific ID to start integrating @zh 指定开始整合的动作标识
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    union (fromId?: number): Tween<T> {
        const unionAll = (): void => {
            const action = this._union(false);
            this._actions.length = 0;
            if (action) this._actions.push(action);
        };

        if (fromId === undefined) {
            unionAll();
            return this;
        }

        const actions = this._actions;
        const index = actions.findIndex((action) => action.getId() === fromId);

        const len = actions.length;
        if (len > 1) {
            const actionsToUnion = actions.splice(index);
            if (actionsToUnion.length === 1) {
                actions.push(actionsToUnion[0]);
            } else {
                actions.push(sequence(actionsToUnion));
            }
        }

        return this;
    }

    /**
     * @en
     * Add an action which calculates with absolute value.
     * @zh
     * 添加一个对属性进行绝对值计算的 action。
     * @method to
     * @param duration @en Tween time, in seconds @zh 缓动时间，单位为秒
     * @param props @en List of properties of tween @zh 缓动的属性列表
     * @param opts @en Optional functions of tween @zh 可选的缓动功能
     * @param opts.progress @en Interpolation function @zh 缓动的速度插值函数
     * @param opts.easing @en Tween function or a lambda @zh 缓动的曲线函数或lambda表达式
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    to (duration: number, props: ConstructorType<T>, opts?: ITweenOption<T>): Tween<T> {
        const options = (opts || Object.create(null)) as IInternalTweenOption<T>;
        options.relative = false;
        const action = new TweenAction(duration, props, options);
        this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Add an action which calculates with relative value.
     * @zh
     * 添加一个对属性进行相对值计算的 action。
     * @method by
     * @param duration @en Tween time, in seconds @zh 缓动时间，单位为秒
     * @param props @en List of properties of tween @zh 缓动的属性列表
     * @param opts @en Optional functions of tween @zh 可选的缓动功能
     * @param [opts.progress]
     * @param [opts.easing]
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    by (duration: number, props: ConstructorType<T>, opts?: ITweenOption<T>): Tween<T> {
        const options = (opts || Object.create(null)) as IInternalTweenOption<T>;
        options.relative = true;
        const action = new TweenAction(duration, props, options);
        this._actions.push(action);
        return this;
    }

    /**
     * @en Add a custom action with constant duration.
     * @zh 添加一个固定时长的自定义动作。
     * @param duration @en The tween time in seconds. @zh 缓动时间，单位为秒。
     * @param cb @en The callback of the current action. @zh 动作回调函数。
     * @param args @en The arguments passed to the callback function. @zh 传递给动作回调函数的参数。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    update<Args extends any[]> (duration: number, cb: TweenUpdateCallback<T, Args>, ...args: Args): Tween<T> {
        const action = new ActionCustomUpdate<T, Args>(duration, cb, args);
        this._actions.push(action);
        return this;
    }

    /**
     * @en Add a custom action with unknown duration. If the callback returns true means this action is finished.
     * @zh 添加一个不确定时长的自定义动作。如果回调函数返回 true，表示当前动作结束。
     * @param cb @en The callback of the current action. @zh 动作回调函数。如果回调函数返回 true，表示当前动作结束。
     * @param args @en The arguments passed to the callback function. @zh 传递给动作回调函数的参数。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    updateUntil<Args extends any[]> (cb: TweenUpdateUntilCallback<T, Args>, ...args: Args): Tween<T> {
        const action = new ActionUnknownDuration<T, Args>(cb, args);
        this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Directly set target properties.
     * @zh
     * 直接设置 target 的属性。
     * @method set
     * @param props @en List of properties of tween @zh 缓动的属性列表
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    set (props: ConstructorType<T>): Tween<T> {
        const action = new SetAction(props);
        this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Add a delay action.
     * @zh
     * 添加一个延时 action。
     * @method delay
     * @param duration @en Delay time of this tween @zh 当前缓动的延迟时间
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    delay (duration: number): Tween<T> {
        const action = delayTime(duration);
        this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Add a callback action.
     * @zh
     * 添加一个回调 action。
     * @method call
     * @param callback @en Callback function at the end of this tween @zh 当前缓动结束时的回调函数
     * @param callbackThis @en The this object in callback function @zh 回调函数中的 this 对象
     * @param data @en The Custom data that will be passed to callback @zh 要传递给回调函数的自定义数据
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    call<TCallbackThis, TData> (callback: CallFuncCallback<T, TData>, callbackThis?: TCallbackThis, data?: TData): Tween<T> {
        const action = callFunc(callback, callbackThis, data);
        this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Add a sequence action.
     * @zh
     * 添加一个队列 action。
     * @method sequence
     * @param args @en All tween that make up the sequence @zh 组成队列的所有缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    sequence (...args: Tween<any>[]): Tween<T> {
        const action = Tween._wrappedSequence(args);
        if (action) this._actions.push(action);
        return this;
    }

    /**
     * @en
     * Add a parallel action.
     * @zh
     * 添加一个并行 action。
     * @method parallel
     * @param args @en The tween parallel to this tween @zh 与当前缓动并行的缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    parallel (...args: Tween<any>[]): Tween<T> {
        const action = Tween._wrappedParallel(args);
        if (action) this._actions.push(action);
        return this;
    }

    /**
     * @en Set the factor that's used to scale time in the animation where 1 = normal speed (the default), 0.5 = half speed, 2 = double speed, etc.
     * @zh 设置动画中使用的缩放时间因子，其中 1 表示正常速度（默认值），0.5 表示减速一半，2 表示加速一倍，等等。
     * @param scale @en The scale factor to set. @zh 要设置的缩放因子。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    timeScale (scale: number): Tween<T> {
        this._timeScale = scale;
        if (this._finalAction) {
            this._finalAction.setSpeed(scale);
        }
        return this;
    }

    /**
     * @en Return the scale time factor of the current tween.
     * @zh 返回当前缓动的时间缩放因子。
     * @return @en The scale time factor of the current tween. @zh 当前缓动的时间缩放因子。
     */
    getTimeScale (): number {
        return this._timeScale;
    }

    /**
     * @en Return the duration of the current tween, its value is constant which means it's determinted at tween's design time
     *     and is not affected by the timeScale of the current tween.
     * @zh 返回当前缓动的总时长，此总时长为缓动的设计总时长，不受当前缓动的 timeScale 值影响。
     * @return @en The duration of the current tween, unit is seconds. @zh 当中缓动的总时长，单位为秒。
     * @note @en Return a valid duration value only after tween was started, otherwise, it returns 0.
     *       @zh 只有在缓动开始后才能返回有效值，否则返回 0。
     */
    get duration (): number {
        if (this._finalAction) {
            return this._finalAction.getDuration();
        }
        return 0;
    }

    /**
     * @en
     * Add a repeat action.
     * This action will integrate before actions to a sequence action as their parameters.
     * @zh
     * 添加一个重复 action，这个 action 会将前一个动作作为他的参数。
     * @param repeatTimes @en The repeat times of this tween @zh 重复次数
     * @param embedTween @en Optional, embedded tween of this tween @zh 可选，嵌入缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    repeat (repeatTimes: number, embedTween?: Tween<T>): Tween<T> {
        /** adapter */
        if (repeatTimes === Infinity) {
            return this.repeatForever(embedTween);
        }

        const actions = this._actions;
        let action: FiniteTimeAction | undefined | null;

        if (embedTween instanceof Tween) {
            action = embedTween._union(false);
        } else {
            action = actions.pop();
        }

        if (action) actions.push(repeat(action, repeatTimes));
        return this;
    }

    /**
     * @en
     * Add a repeat forever action.
     * This action will integrate before actions to a sequence action as their parameters.
     * @zh
     * 添加一个永久重复 action，这个 action 会将前一个动作作为他的参数。
     * @method repeatForever
     * @param embedTween @en Optional, embedded tween of this tween @zh 可选，嵌入缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    repeatForever (embedTween?: Tween<T>): Tween<T> {
        const actions = this._actions;
        let action: FiniteTimeAction | undefined | null;

        if (embedTween instanceof Tween) {
            action = embedTween._union(false);
        } else {
            action = actions.pop();
        }

        if (action && actions.length !== 0) {
            actions.push(repeat(action, Number.MAX_SAFE_INTEGER));
        } else if (action instanceof ActionInterval) {
            actions.push(repeatForever(action));
        } else {
            warnID(16394);
        }
        return this;
    }

    /**
     * @en
     * Add a reverse time action.
     * This action will integrate before actions to a sequence action as their parameters.
     * @zh
     * 添加一个倒置时间 action，这个 action 会将前一个动作作为他的参数。
     * @method reverseTime
     * @param embedTween @en Optional, embedded tween of this tween @zh 可选，嵌入缓动
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    reverseTime (embedTween?: Tween<T>): Tween<T> {
        const actions = this._actions;
        let action: Action | undefined | null;

        if (embedTween instanceof Tween) {
            action = embedTween._union(false);
        } else {
            action = actions.pop();
        }

        if (action instanceof ActionInterval) {
            actions.push(reverseTime(action));
        } else {
            warnID(16395);
        }
        return this;
    }

    /**
     * @en
     * Add a hide action, only for node target.
     * @zh
     * 添加一个隐藏 action，只适用于 target 是节点类型的。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    hide (): TweenWithNodeTargetOrUnknown<T> {
        const isNode = this._target instanceof Node;
        if (isNode) {
            const action = hide();
            this._actions.push(action);
        }
        return this as unknown as TweenWithNodeTargetOrUnknown<T>;
    }

    /**
     * @en
     * Add a show action, only for node target.
     * @zh
     * 添加一个显示 action，只适用于 target 是节点类型的。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    show (): TweenWithNodeTargetOrUnknown<T> {
        const isNode = this._target instanceof Node;
        if (isNode) {
            const action = show();
            this._actions.push(action);
        }
        return this as unknown as TweenWithNodeTargetOrUnknown<T>;
    }

    /**
     * @en
     * Add a removeSelf action, only for node target.
     * @zh
     * 添加一个移除自己 action，只适用于 target 是节点类型的。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    removeSelf (): TweenWithNodeTargetOrUnknown<T> {
        const isNode = this._target instanceof Node;
        if (isNode) {
            const action = removeSelf(false);
            this._actions.push(action);
        }
        return this as unknown as TweenWithNodeTargetOrUnknown<T>;
    }

    /**
     * @en
     * Add a destroySelf action, only for node target.
     * @zh
     * 添加一个移除并销毁自己 action，只适用于 target 是节点类型的。
     * @return @en The instance itself for easier chaining. @zh 返回该实例本身，以便于链式调用。
     */
    destroySelf (): TweenWithNodeTargetOrUnknown<T> {
        const isNode = this._target instanceof Node;
        if (isNode) {
            const action = removeSelf(true);
            this._actions.push(action);
        }
        return this as unknown as TweenWithNodeTargetOrUnknown<T>;
    }

    /**
     * @en Get the count of running tween instances those associate with the target.
     * @zh 获取目标对象关联的正在运行的缓动实例的个数。
     * @param target @en The target to check. @zh 要检查的目标对象。
     * @return @en The count of running tween instances those associate with the target.
     *         @zh 目标对象关联的正在运行的缓动实例的个数。
     */
    static getRunningCount<U extends object = any> (target: U): number {
        return TweenSystem.instance.ActionManager.getNumberOfRunningActionsInTarget(target);
    }

    /**
     * @en
     * Stop all tween instances.
     * @zh
     * 停止所有缓动实例
     */
    static stopAll (): void {
        TweenSystem.instance.ActionManager.removeAllActions();
    }
    /**
     * @en
     * Stop all tween instances by tag.
     * @zh
     * 停止指定标签关联的所有缓动实例。
     */
    static stopAllByTag<U extends object = any> (tag: number, target?: U): void {
        TweenSystem.instance.ActionManager.removeAllActionsByTag(tag, target);
    }
    /**
     * @en
     * Stop all tween instances associated with the target object.
     * @zh
     * 停止指定对象的关联的所有缓动实例。
     */
    static stopAllByTarget<U extends object = any> (target?: U): void {
        TweenSystem.instance.ActionManager.removeAllActionsFromTarget(target);
    }

    /**
     * @en Pause all tween instances associated with the target object.
     * @zh 暂停目标对象关联的所有缓动实例。
     * @param target @en The target object whose tweens should be paused. @zh 要暂停缓动的目标对象。
     */
    static pauseAllByTarget<U extends object = any> (target: U): void {
        TweenSystem.instance.ActionManager.pauseTarget(target);
    }

    /**
     * @en Resume all tween instances associated with the target object.
     * @zh 恢复目标对象关联的所有缓动实例。
     * @param target @en The target object whose tweens should be resumed. @zh 要恢复缓动的目标对象。
     */
    static resumeAllByTarget<U extends object = any> (target: U): void {
        TweenSystem.instance.ActionManager.resumeTarget(target);
    }

    private _union (needUpdateOwner: boolean): Sequence | null {
        const actions = this._actions;
        if (actions.length === 0) return null;
        const action = sequence(actions);
        if (needUpdateOwner) {
            this.updateOwnerForAction(action);
        }
        return action;
    }

    private _unionForStart (): ActionInterval | null {
        const actions = this._actions;
        if (actions.length === 0) return null;
        let action: ActionInterval;
        if (actions.length === 1 && actions[0] instanceof RepeatForever) {
            action = actions[0];
        } else {
            action = sequence(actions);
        }

        return action;
    }

    private static readonly _tmpArgs: FiniteTimeAction[] = [];

    private static _tweenToActions<U extends object = any> (args: Tween<U>[]): void {
        const tmpArgs = Tween._tmpArgs;
        tmpArgs.length = 0;
        for (let l = args.length, i = 0; i < l; i++) {
            const t = args[i];
            const action = t._union(true);
            if (action) {
                action.setSpeed(t._timeScale);
                tmpArgs.push(action);
            }
        }
    }

    private static _wrappedSequence<U extends object = any> (args: Tween<U>[]): Sequence | null {
        Tween._tweenToActions(args);
        const ret = sequence(Tween._tmpArgs);
        this._tmpArgs.length = 0;
        return ret;
    }

    private static _wrappedParallel<U extends object = any> (args: Tween<U>[]): Spawn | null {
        Tween._tweenToActions(args);
        const ret = spawn(Tween._tmpArgs);
        this._tmpArgs.length = 0;
        return ret;
    }
}
legacyCC.Tween = Tween;

/**
 * @en
 * tween is a utility function that helps instantiate Tween instances.
 * @zh
 * tween 是一个工具函数，帮助实例化 Tween 实例。
 * @param target @en The target of the result tween @zh 缓动的目标
 * @returns Tween 实例
 * @example
 * tween(this.node)
 *   .to(1, {scale: new Vec3(2, 2, 2), position: new Vec3(5, 5, 5)})
 *   .call(() => { console.log('This is a callback'); })
 *   .by(1, {scale: new Vec3(-1, -1, -1)}, {easing: 'sineOutIn'})
 *   .start()
 */
export function tween<T extends object = any> (target?: T): Tween<T> {
    return new Tween<T>(target);
}
legacyCC.tween = tween;

/**
 * @en
 * tweenUtil is a utility function that helps instantiate Tween instances.
 * @zh
 * tweenUtil 是一个工具函数，帮助实例化 Tween 实例。
 * @deprecated please use `tween` instead.
 */
export function tweenUtil<T extends object = any> (target?: T): Tween<T> {
    warnID(16396);
    return new Tween<T>(target);
}
legacyCC.tweenUtil = tweenUtil;
