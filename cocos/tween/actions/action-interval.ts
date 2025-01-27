/*
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { FiniteTimeAction } from './action';
import { macro, logID, errorID } from '../../core';
import { ActionInstant } from './action-instant';
import type { Tween, TweenUpdateCallback } from '../tween';

// Extra action for making a Sequence or Spawn when only adding one action to it.
class DummyAction extends FiniteTimeAction {
    override clone (): DummyAction {
        return new DummyAction();
    }

    override reverse (): DummyAction {
        return this.clone();
    }

    override update (time: number): void {
        // empty
    }

    override step (dt: number): void {
        // empty
    }

    override isUnknownDuration (): boolean {
        return false;
    }

    override toString (): string {
        return `DummyAction`;
    }
}

/**
 * @en
 * <p> An interval action is an action that takes place within a certain period of time. <br/>
 * It has an start time, and a finish time. The finish time is the parameter<br/>
 * duration plus the start time.</p>
 *
 * <p>These CCActionInterval actions have some interesting properties, like:<br/>
 * - They can run normally (default)  <br/>
 * - They can run reversed with the reverse method   <br/>
 * - They can run with the time altered with the Accelerate, AccelDeccel and Speed actions. </p>
 *
 * <p>For example, you can simulate a Ping Pong effect running the action normally and<br/>
 * then running it again in Reverse mode. </p>
 * @zh 时间间隔动作，这种动作在已定时间内完成，继承 FiniteTimeAction。
 * @class ActionInterval
 * @extends FiniteTimeAction
 * @param {Number} d duration in seconds
 */
export abstract class ActionInterval extends FiniteTimeAction {
    protected MAX_VALUE = 2;
    protected _elapsed = 0;
    protected _startTime = 0;
    protected _firstTick = false;
    protected _speed = 1;

    constructor (d?: number) {
        super();
        if (d !== undefined && !Number.isNaN(d)) {
            this.initWithDuration(d);
        }
    }

    setStartTime (time: number): void {
        time = time < 0 ? 0 : (time > this._duration ? this._duration : time);
        this._startTime = time;
    }

    /*
     * How many seconds had elapsed since the actions started to run.
     * @return {Number}
     */
    getElapsed (): number {
        return this._elapsed;
    }

    /*
     * Initializes the action.
     * @param {Number} d duration in seconds
     * @return {Boolean}
     */
    initWithDuration (d: number): boolean {
        this._duration = (d === 0) ? macro.FLT_EPSILON : d;
        // prevent division by 0
        // This comparison could be in step:, but it might decrease the performance
        // by 3% in heavy based action games.
        this._elapsed = 0;
        this._firstTick = true;
        return true;
    }

    override isDone (): boolean {
        return this._elapsed >= this._duration && !this.isUnknownDuration();
    }

    /**
     * @mangle
     * @engineInternal
     */
    _cloneDecoration (action: ActionInterval): void {
        action._speed = this._speed;
    }

    abstract clone (): ActionInterval;

    override step (dt: number): void {
        if (this._paused || this._speed === 0) return;
        dt *= this._speed;
        if (this._firstTick) {
            this._elapsed = this._startTime;
        } else this._elapsed += dt;

        // this.update((1 > (this._elapsed / this._duration)) ? this._elapsed / this._duration : 1);
        // this.update(Math.max(0, Math.min(1, this._elapsed / Math.max(this._duration, cc.macro.FLT_EPSILON))));
        let t = this._elapsed / (this._duration > 0.0000001192092896 ? this._duration : 0.0000001192092896);
        t = (t < 1 ? t : 1);
        this.update(t > 0 ? t : 0);

        // NOTE: If the action's duration is unknown, the elapsed time should be kept at the point of the last frame,
        // because ActionUnknownDuration will be executed at each frame until its callback returns true.
        // After ActionUnknownDuration is finished, the isUnknownDuration method will return false
        // and the elapsed time will go as before.
        if (this.isUnknownDuration() && !this._firstTick) {
            if (t < 1) {
                this._elapsed -= dt;
            } else {
                this._elapsed = this._startTime + this._duration;
            }
        }

        if (this._firstTick) {
            this._firstTick = false;
            if (this._startTime > 0) {
                // _startTime only takes effect in the first tick after tween starts. So reset it to 0 after the first tick.
                this._startTime = 0;
            }
        }
    }

    startWithTarget<T> (target: T | null): void {
        super.startWithTarget(target);
        this._elapsed = 0;
        this._firstTick = true;
    }

    abstract reverse (): ActionInterval;

    /**
     * @en
     * Get this action speed.
     * @zh
     * 返回此动作速度
     * @return {Number}
     */
    getSpeed (): number {
        return this._speed;
    }

    /**
     * @en
     * Set this action speed.
     * @zh
     * 设置此动作速度
     * @param {Number} speed
     * @returns {ActionInterval}
     */
    setSpeed (speed: number): void {
        this._speed = speed;
    }

    getDurationScaled (): number {
        return this._duration / this._speed;
    }
}

function sequenceActionWithOneTwo (actionOne: FiniteTimeAction, actionTwo: FiniteTimeAction): Sequence {
    const sequence = new Sequence();
    sequence.initWithTwoActions(actionOne, actionTwo);
    return sequence;
}

/*
 * Runs actions sequentially, one after another.
 */
export class Sequence extends ActionInterval {
    private _actions: FiniteTimeAction[] = [];
    private _split = 0;
    private _last = 0;
    private _reversed = false;

    /**
     * @example
     * import { Sequence } from 'cc';
     *
     * // create sequence with actions
     * const seq = new Sequence(act1, act2);
     *
     * // create sequence with array
     * const seq = new Sequence(actArray);
     */
    constructor (actions?: FiniteTimeAction[]) {
        super();
        if (!actions || actions.length === 0) {
            return;
        }
        if (actions.length === 1) {
            actions.push(new DummyAction());
        }
        const last = actions.length - 1;
        if ((last >= 0) && (actions[last] == null)) logID(1015);

        if (last >= 0) {
            let prev = actions[0];
            let action1: FiniteTimeAction;
            for (let i = 1; i < last; i++) {
                if (actions[i]) {
                    action1 = prev;
                    prev = sequenceActionWithOneTwo(action1, actions[i]);
                }
            }
            this.initWithTwoActions(prev, actions[last]);
        }
    }

    /**
     * Initializes the action
     * @param actionOne the first action to run
     * @param actionTwo the second action to run
     * @return true if the action initializes properly, false otherwise.
     */
    initWithTwoActions (actionOne?: FiniteTimeAction, actionTwo?: FiniteTimeAction): boolean {
        if (!actionOne || !actionTwo) {
            errorID(1025);
            return false;
        }

        const durationOne = actionOne.getDurationScaled();
        const durationTwo = actionTwo.getDurationScaled();
        const d = durationOne + durationTwo;
        this.initWithDuration(d);

        this._actions[0] = actionOne;
        this._actions[1] = actionTwo;
        return true;
    }

    override clone (): Sequence {
        const action = new Sequence();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        action.initWithTwoActions(this._actions[0].clone(), this._actions[1].clone());
        return action;
    }

    override startWithTarget<T> (target: T | null): void {
        super.startWithTarget(target);
        if (this._actions.length === 0) {
            return;
        }
        this._split = this._actions[0].getDurationScaled() / this._duration;
        this._last = -1;
    }

    override stop (): void {
        if (this._actions.length === 0) {
            return;
        }
        // Issue #1305
        if (this._last !== -1) this._actions[this._last].stop();
        super.stop();
    }

    override update (t: number): void {
        const locActions = this._actions;
        if (locActions.length === 0) {
            return;
        }

        let new_t: number = 0;
        let found = 0;
        const locSplit = this._split;
        const locLast = this._last;

        if (t < locSplit) {
            // action[0]
            new_t = (locSplit !== 0) ? t / locSplit : 1;

            if (found === 0 && locLast === 1 && this._reversed) {
                const two = locActions[1];
                // Reverse mode ?
                // XXX: Bug. this case doesn't contemplate when _last==-1, found=0 and in "reverse mode"
                // since it will require a hack to know if an action is on reverse mode or not.
                // "step" should be overriden, and the "reverseMode" value propagated to inner Sequences.
                two.update(0);
                if (two.isUnknownDuration()) return;
                two.stop();
            }
        } else {
            const one = locActions[0];
            // action[1]
            found = 1;
            new_t = (locSplit === 1) ? 1 : (t - locSplit) / (1 - locSplit);

            if (locLast === -1) {
                // action[0] was skipped, execute it.
                one.startWithTarget(this.target);
                one.update(1);
                if (one.isUnknownDuration()) return; // Don't stop `one` or update `two` since `one` is `unknown duration`. So just return here.
                one.stop();
            }
            if (locLast === 0) {
                // switching to action 1. stop action 0.
                one.update(1);
                if (one.isUnknownDuration()) return;
                one.stop();
            }
        }

        const actionFound = locActions[found];
        // Last action found and it is done.
        if (locLast === found && actionFound.isDone()) return;

        // Last action not found
        if (locLast !== found) actionFound.startWithTarget(this.target);

        actionFound.update(new_t > 1 ? new_t % 1 : new_t);
        this._last = found;
    }

    override reverse (): Sequence {
        const action: Sequence = sequenceActionWithOneTwo(this._actions[1].reverse(), this._actions[0].reverse());
        this._cloneDecoration(action);
        action._reversed = true;
        return action;
    }

    /** @mangle */
    updateOwner<T extends object> (owner: Tween<T>): void {
        if (this._actions.length < 2) {
            return;
        }
        const actionOne = this._actions[0];
        const actionTwo = this._actions[1];

        if (!actionTwo._owner) {
            actionTwo._owner = owner;
        }
        if (actionOne instanceof Sequence || actionOne instanceof Spawn) {
            actionOne.updateOwner(owner);
        } else if (!actionOne._owner) { // action's owner should never be changed, so only set owner when it's not set yet.
            actionOne._owner = owner;
        }
    }

    /** @mangle */
    findAction (id: number): FiniteTimeAction | null {
        for (let i = 0, len = this._actions.length; i < len; ++i) {
            let action: FiniteTimeAction | null = this._actions[i];
            if (action.getId() === id) {
                return action;
            }

            if (action instanceof Sequence || action instanceof Spawn) {
                action = action.findAction(id);
                if (action && action.getId() === id) {
                    return action;
                }
            }
        }
        return null;
    }

    override isUnknownDuration (): boolean {
        if (this._actions.length === 0) return false;

        const one = this._actions[0];
        const two = this._actions[1];

        if (this._last < 1) {
            return one.isUnknownDuration();
        }

        return two.isUnknownDuration();
    }

    override toString (): string {
        return `<Sequence>`;
    }
}

/**
 * @en
 * Helper constructor to create an array of sequenceable actions
 * The created action will run actions sequentially, one after another.
 * @zh 顺序执行动作，创建的动作将按顺序依次运行。
 * @method sequence
 * @param {FiniteTimeAction|FiniteTimeAction[]} actionOrActionArray
 * @param {FiniteTimeAction} ...tempArray
 * @return {Sequence}
 * @example
 * import { sequence } from 'cc';
 *
 * // Create sequence with actions
 * const seq = sequence(act1, act2);
 *
 * // Create sequence with array
 * const seq = sequence(actArray);
 */
// todo: It should be use new
export function sequence (actions: FiniteTimeAction[]): Sequence {
    return new Sequence(actions);
}

/*
 * Repeats an action a number of times.
 * To repeat an action forever use the CCRepeatForever action.
 * @class Repeat
 * @extends ActionInterval
 * @param {FiniteTimeAction} action
 * @param {Number} times
 * @example
 * import { Repeat, sequence } from 'cc';
 * const rep = new Repeat(sequence(jump2, jump1), 5);
 */
export class Repeat extends ActionInterval {
    private _times = 0;
    private _total = 0;
    private _nextDt = 0;
    private _actionInstant = false;
    private _innerAction: FiniteTimeAction | null = null;

    constructor (action?: FiniteTimeAction, times?: number) {
        super();
        this.initWithAction(action, times);
    }

    /*
     * @param {FiniteTimeAction} action
     * @param {Number} times
     * @return {Boolean}
     */
    initWithAction (action?: FiniteTimeAction, times?: number): boolean {
        if (!action || times === undefined) {
            return false;
        }
        const duration = action.getDurationScaled() * times;

        if (this.initWithDuration(duration)) {
            this._times = times;
            this._innerAction = action;
            if (action instanceof ActionInstant) {
                this._actionInstant = true;
                this._times -= 1;
            }
            this._total = 0;
            return true;
        }
        return false;
    }

    override clone (): Repeat {
        const action = new Repeat();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        if (this._innerAction) {
            action.initWithAction(this._innerAction.clone(), this._times);
        }
        return action;
    }

    override startWithTarget<T> (target: T | null): void {
        this._total = 0;
        this._nextDt = (this._innerAction ? this._innerAction.getDurationScaled() : 0) / this._duration;
        super.startWithTarget(target);
        if (this._innerAction) this._innerAction.startWithTarget(target);
    }

    override stop (): void {
        if (this._innerAction) this._innerAction.stop();
        super.stop();
    }

    override update (dt: number): void {
        const locInnerAction = this._innerAction;
        const locDuration = this._duration;
        const locTimes = this._times;
        let locNextDt = this._nextDt;
        if (!locInnerAction) {
            return;
        }

        if (dt >= locNextDt) {
            while (dt > locNextDt && this._total < locTimes) {
                locInnerAction.update(1);
                if (locInnerAction.isUnknownDuration()) return;
                this._total++;
                locInnerAction.stop();
                locInnerAction.startWithTarget(this.target);
                locNextDt += locInnerAction.getDurationScaled() / locDuration;
                this._nextDt = locNextDt > 1 ? 1 : locNextDt;
            }

            // fix for issue #1288, incorrect end value of repeat
            if (dt >= 1.0 && this._total < locTimes) {
                // fix for cocos-creator/fireball/issues/4310
                locInnerAction.update(1);
                if (locInnerAction.isUnknownDuration()) return;
                this._total++;
            }

            // don't set a instant action back or update it, it has no use because it has no duration
            if (!this._actionInstant) {
                if (this._total === locTimes) {
                    locInnerAction.stop();
                } else {
                    // issue #390 prevent jerk, use right update
                    locInnerAction.update(dt - (locNextDt - locInnerAction.getDurationScaled() / locDuration));
                }
            }
        } else {
            locInnerAction.update((dt * locTimes) % 1.0);
        }
    }

    override isDone (): boolean {
        return this._total === this._times;
    }

    override reverse (): Repeat {
        const actionArg = this._innerAction ? this._innerAction.reverse() : undefined;
        const action = new Repeat(actionArg, this._times);
        this._cloneDecoration(action);
        return action;
    }

    /*
     * Set inner Action.
     * @param action The inner action.
     * @mangle
     */
    setInnerAction (action: FiniteTimeAction): void {
        if (this._innerAction !== action) {
            this._innerAction = action;
        }
    }

    /*
     * Get inner Action.
     * @return The inner action.
     * @mangle
     */
    getInnerAction (): FiniteTimeAction | null {
        return this._innerAction;
    }

    override isUnknownDuration (): boolean {
        if (this._innerAction) { return this._innerAction.isUnknownDuration(); }
        return false;
    }

    override toString (): string {
        return `<Repeat>`;
    }
}

/**
 * @en Creates a Repeat action. Times is an unsigned integer between 1 and pow(2,30)
 * @zh 重复动作，可以按一定次数重复一个动，如果想永远重复一个动作请使用 repeatForever 动作来完成。
 * @method repeat
 * @param {FiniteTimeAction} action
 * @param {Number} times
 * @return {Action}
 * @example
 * import { repeat, sequence } from 'cc';
 * const rep = repeat(sequence(jump2, jump1), 5);
 */
export function repeat (action: FiniteTimeAction, times: number): Repeat {
    return new Repeat(action, times);
}

/*
 * Repeats an action for ever.  <br/>
 * To repeat the an action for a limited number of times use the Repeat action. <br/>
 * @warning This action can't be Sequenceable because it is not an IntervalAction
 * @class RepeatForever
 * @extends ActionInterval
 * @param {ActionInterval} action
 * @example
 * import { sequence, RepeatForever } from 'cc';
 * const rep = new RepeatForever(sequence(jump2, jump1), 5);
 */
export class RepeatForever extends ActionInterval {
    private _innerAction: ActionInterval | null = null;

    constructor (action?: ActionInterval) {
        super();
        if (action) this.initWithAction(action);
    }

    /*
     * @param {ActionInterval} action
     * @return {Boolean}
     */
    initWithAction (action: ActionInterval): boolean {
        if (!action) {
            errorID(1026);
            return false;
        }

        this._innerAction = action;
        this._duration = Infinity;
        return true;
    }

    override clone (): RepeatForever {
        const action = new RepeatForever();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        if (this._innerAction) {
            action.initWithAction(this._innerAction.clone());
        }
        return action;
    }

    override startWithTarget<T> (target: T | null): void {
        super.startWithTarget(target);
        if (this._innerAction) {
            this._innerAction.startWithTarget(target);
        }
    }

    override stop (): void {
        if (this._innerAction) this._innerAction.stop();
        super.stop();
    }

    override step (dt: number): void {
        if (this._paused || this._speed === 0) return;
        const locInnerAction = this._innerAction;
        if (!locInnerAction) {
            return;
        }
        dt *= this._speed;
        locInnerAction.step(dt);
        if (locInnerAction.isDone()) {
            // var diff = locInnerAction.getElapsed() - locInnerAction.getDurationScaled();
            locInnerAction.startWithTarget(this.target);
            // to prevent jerk. issue #390 ,1247
            // this._innerAction.step(0);
            // this._innerAction.step(diff);
            locInnerAction.step(locInnerAction.getElapsed() - locInnerAction.getDurationScaled());
        }
    }

    override update (_t: number): void {
        logID(1007); // should never come here.
    }

    override isDone (): boolean {
        return false;
    }

    override reverse (): RepeatForever {
        if (this._innerAction) {
            const action = new RepeatForever(this._innerAction.reverse());
            this._cloneDecoration(action);
            return action;
        }
        return this;
    }

    /*
     * Set inner action.
     * @param The inner action
     * @mangle
     */
    setInnerAction (action: ActionInterval | null): void {
        if (this._innerAction !== action) {
            this._innerAction = action;
        }
    }

    /*
     * Get inner action.
     * @return The inner action
     * @mangle
     */
    getInnerAction (): ActionInterval | null {
        return this._innerAction;
    }

    override isUnknownDuration (): boolean {
        if (this._innerAction) { return this._innerAction.isUnknownDuration(); }
        return false;
    }

    override toString (): string {
        return `<RepeatForever>`;
    }
}

/**
 * @en Create a acton which repeat forever, as it runs forever, it can't be added into `sequence` and `spawn`.
 * @zh 永远地重复一个动作，有限次数内重复一个动作请使用 repeat 动作，由于这个动作不会停止，所以不能被添加到 `sequence` 或 `spawn` 中。
 * @method repeatForever
 * @param {FiniteTimeAction} action
 * @return {ActionInterval}
 * @example
 * import { repeatForever, rotateBy } from 'cc';
 * var repeat = repeatForever(rotateBy(1.0, 360));
 */
export function repeatForever (action?: ActionInterval): RepeatForever {
    return new RepeatForever(action);
}

function spawnActionWithOneTwo (action1?: FiniteTimeAction, action2?: FiniteTimeAction): Spawn {
    const spawn = new Spawn();
    spawn.initWithTwoActions(action1, action2);
    return spawn;
}

/*
 * Spawn a new action immediately
 * @class Spawn
 * @extends ActionInterval
 */
export class Spawn extends ActionInterval {
    private _one: FiniteTimeAction | null = null;
    private _two: FiniteTimeAction | null = null;
    private _finished = false;

    constructor (actions?: FiniteTimeAction[]) {
        super();
        if (!actions || actions.length === 0) {
            return;
        }
        if (actions.length === 1) {
            actions.push(new DummyAction());
        }

        const last = actions.length - 1;
        if ((last >= 0) && (actions[last] == null)) logID(1015);

        if (last >= 0) {
            let prev: FiniteTimeAction = actions[0];
            let action1: FiniteTimeAction;
            for (let i = 1; i < last; i++) {
                if (actions[i]) {
                    action1 = prev;
                    prev = spawnActionWithOneTwo(action1, actions[i]);
                }
            }
            this.initWithTwoActions(prev, actions[last]);
        }
    }

    /* Initializes the Spawn action with the 2 actions to spawn
     * @param {FiniteTimeAction} action1 The first action
     * @param {FiniteTimeAction} action2 The second action
     * @return {Boolean} Return true if the initialization succeeds, otherwise return false.
     */
    initWithTwoActions (action1?: FiniteTimeAction, action2?: FiniteTimeAction): boolean {
        if (!action1 || !action2) {
            errorID(1027);
            return false;
        }

        let ret = false;

        const d1 = action1.getDurationScaled();
        const d2 = action2.getDurationScaled();

        if (this.initWithDuration(Math.max(d1, d2))) {
            this._one = action1;
            this._two = action2;

            if (d1 > d2) {
                this._two = sequenceActionWithOneTwo(action2, delayTime(d1 - d2));
            } else if (d1 < d2) {
                this._one = sequenceActionWithOneTwo(action1, delayTime(d2 - d1));
            }

            ret = true;
        }
        return ret;
    }

    override clone (): Spawn {
        const action = new Spawn();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        if (this._one && this._two) {
            action.initWithTwoActions(this._one.clone(), this._two.clone());
        }
        return action;
    }

    override startWithTarget<T> (target: T | null): void {
        super.startWithTarget(target);
        if (this._one) this._one.startWithTarget(target);
        if (this._two) this._two.startWithTarget(target);
    }

    override stop (): void {
        if (this._one) this._one.stop();
        if (this._two) this._two.stop();
        super.stop();
    }

    override update (t: number): void {
        if (this._one) {
            if (!this._finished || this._one.isUnknownDuration()) {
                this._one.update(t);
            }
        }

        if (this._two) {
            if (!this._finished || this._two.isUnknownDuration()) {
                this._two.update(t);
            }
        }

        // FIXME(cjh): Checking whether t is 1 to indicate the spawn finished will cause issues
        // when `timeScale` is a negative value. Currently, there isn't a good way to check that in sub-actions.
        // So we suggest developer to use `Tween.reverse(...)` instead of `timeScale < 0` to implement a `reverse` effect.
        this._finished = t === 1;
    }

    override reverse (): Spawn {
        if (this._one && this._two) {
            const action = spawnActionWithOneTwo(this._one.reverse(), this._two.reverse());
            this._cloneDecoration(action);
            return action;
        }
        return this;
    }

    /**
     * @mangle
     * @engineInternal
     */
    updateOwner<T extends object> (owner: Tween<T>): void {
        if (!this._one || !this._two) {
            return;
        }
        if (!this._two._owner) {
            this._two._owner = owner;
        }
        const one = this._one;
        if (one instanceof Spawn || one instanceof Sequence) {
            one.updateOwner(owner);
        } else if (!one._owner) { // action's owner should never be changed, so only set owner when it's not set yet.
            one._owner = owner;
        }
    }

    /**
     * @mangle
     * @engineInternal
     */
    findAction (id: number): FiniteTimeAction | null {
        const one = this._one;
        const two = this._two;
        let foundAction: FiniteTimeAction | null = null;
        const find = (action: FiniteTimeAction): FiniteTimeAction | null => {
            if (action.getId() === id) return action;
            if (action instanceof Sequence || action instanceof Spawn) {
                const found = action.findAction(id);
                if (found) return found;
            }
            return null;
        };
        if (one) {
            foundAction = find(one);
            if (foundAction) return foundAction;
        }

        if (two) {
            foundAction = find(two);
            if (foundAction) return foundAction;
        }
        return null;
    }

    override isUnknownDuration (): boolean {
        const one = this._one;
        const two = this._two;

        if (one == null || two == null) return false;

        const isOneUnknownTime = one.isUnknownDuration();
        const isTwoUnknownTime = two.isUnknownDuration();

        if (isOneUnknownTime || isTwoUnknownTime) {
            if (isOneUnknownTime && isTwoUnknownTime) return true;
            else if (this._finished) return true;
        }
        return false;
    }

    override toString (): string {
        return `<Spawn>`;
    }
}

/**
 * @en Create a spawn action which runs several actions in parallel.
 * @zh 同步执行动作，同步执行一组动作。
 * @method spawn
 * @param {FiniteTimeAction|FiniteTimeAction[]} actionOrActionArray
 * @param {FiniteTimeAction} ...tempArray
 * @return {Spawn}
 * @example
 * import { spawn, jumpBy, rotateBy, Vec2 } from 'cc';
 * const action = spawn(jumpBy(2, new Vec2(300, 0), 50, 4), rotateBy(2, 720));
 * todo: It should be the direct use new
 */
export function spawn (actions: FiniteTimeAction[]): Spawn {
    return new Spawn(actions);
}

/* Delays the action a certain amount of seconds
 * @class DelayTime
 * @extends ActionInterval
 */
class DelayTime extends ActionInterval {
    override update (_dt: number): void { /* empty */ }

    override reverse (): DelayTime {
        const action = new DelayTime(this._duration);
        this._cloneDecoration(action);
        return action;
    }

    override clone (): DelayTime {
        const action = new DelayTime();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        action.initWithDuration(this._duration);
        return action;
    }

    override isUnknownDuration (): boolean {
        return false;
    }

    override toString (): string {
        return `<DelayTime>`;
    }
}

/**
 * @en Delays the action a certain amount of seconds.
 * @zh 延迟指定的时间量。
 * @method delayTime
 * @param {Number} d duration in seconds
 * @return {ActionInterval}
 * @example
 * import { delayTime } from 'cc';
 * const delay = delayTime(1);
 */
export function delayTime (d: number): ActionInterval {
    return new DelayTime(d);
}

/**
 * <p>
 * Executes an action in reverse order, from time=duration to time=0                                     <br/>
 * @warning Use this action carefully. This action is not sequenceable.                                 <br/>
 * Use it as the default "reversed" method of your own actions, but using it outside the "reversed"      <br/>
 * scope is not recommended.
 * </p>
 * @class ReverseTime
 * @extends ActionInterval
 * @param {FiniteTimeAction} action
 * @example
 * import ReverseTime from 'cc';
 * var reverse = new ReverseTime(this);
 */
export class ReverseTime extends ActionInterval {
    private _other: ActionInterval | null = null;

    constructor (action?: ActionInterval) {
        super();
        if (action) this.initWithAction(action);
    }

    /*
     * @param {ActionInterval} action
     * @return {Boolean}
     */
    initWithAction (action: ActionInterval): boolean {
        if (!action) {
            errorID(1028);
            return false;
        }
        if (action === this._other) {
            errorID(1029);
            return false;
        }

        if (super.initWithDuration(action.getDurationScaled())) {
            // Don't leak if action is reused
            this._other = action;
            return true;
        }
        return false;
    }

    override clone (): ReverseTime {
        const action = new ReverseTime();
        action._id = this._id;
        action._speed = this._speed;
        this._cloneDecoration(action);
        if (this._other) {
            action.initWithAction(this._other.clone());
        }
        return action;
    }

    override startWithTarget<T> (target: T | null): void {
        super.startWithTarget(target);
        if (this._other) this._other.startWithTarget(target);
    }

    override update (dt: number): void {
        if (this._other) this._other.update(1 - dt);
    }

    override reverse (): ActionInterval {
        if (this._other) {
            return this._other.clone();
        }
        return this;
    }

    override stop (): void {
        if (this._other) this._other.stop();
        super.stop();
    }

    override isUnknownDuration (): boolean {
        return false;
    }

    override toString (): string {
        return `<ReverseTime>`;
    }
}

/**
 * @en Executes an action in reverse order, from time=duration to time=0.
 * @zh 反转目标动作的时间轴。
 * @method reverseTime
 * @param {FiniteTimeAction} action
 * @return {ActionInterval}
 * @example
 * import { reverseTime } from 'cc';
 * const reverse = reverseTime(this);
 */
export function reverseTime (action: ActionInterval): ReverseTime {
    return new ReverseTime(action);
}

export class ActionCustomUpdate<T extends object, Args extends any[]> extends ActionInterval {
    private declare _cb: TweenUpdateCallback<T, Args>;
    private declare _args: Args;

    constructor (duration: number, cb: TweenUpdateCallback<T, Args>, args: Args) {
        super(duration);
        this._cb = cb;
        this._args = args;
    }

    override clone (): ActionCustomUpdate<T, Args> {
        return new ActionCustomUpdate(this._duration, this._cb, this._args);
    }

    override update (ratio: number): void {
        this._cb(this.target as T, ratio, ...this._args);
    }

    override reverse (): ActionCustomUpdate<T, Args> {
        return this.clone();
    }

    override isUnknownDuration (): boolean {
        return false;
    }

    override toString (): string {
        return `<ActionCustomUpdate>`;
    }
}
