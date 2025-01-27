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
import { Renderer } from '../../misc/renderer';
import type { Node } from '../../scene-graph';

/**
 * @en Instant actions are immediate actions. They don't have a duration like the ActionInterval actions.
 * @zh 即时动作，这种动作立即就会执行，继承自 FiniteTimeAction。
 * @class ActionInstant
 * @extends FiniteTimeAction
 */
export abstract class ActionInstant extends FiniteTimeAction {
    override isDone (): boolean {
        return true;
    }

    override step (_dt: number): void {
        this.update(1);
    }

    override update (_dt: number): void {
        // nothing
    }

    /**
     * returns a reversed action. <br />
     * For example: <br />
     * - The action is x coordinates of 0 move to 100. <br />
     * - The reversed action will be x of 100 move to 0.
     * @returns {Action}
     */
    override reverse (): ActionInstant {
        return this.clone();
    }

    abstract clone (): ActionInstant;

    override isUnknownDuration (): boolean {
        return false;
    }
}

/*
 * Show the node.
 * @class Show
 * @extends ActionInstant
 */
export class Show<T extends Node> extends ActionInstant {
    override update (_dt: number): void {
        const target = this._getWorkerTarget<T>();
        if (!target) return;
        const _renderComps = target.getComponentsInChildren(Renderer);
        for (let i = 0; i < _renderComps.length; ++i) {
            const render = _renderComps[i];
            render.enabled = true;
        }
    }

    override reverse (): Hide<T> {
        return new Hide<T>();
    }

    override clone (): Show<T> {
        const action = new Show<T>();
        action._id = this._id;
        return action;
    }

    override toString (): string {
        return '<Show>';
    }
}

/**
 * @en Show the Node.
 * @zh 立即显示。
 * @method show
 * @return {Show}
 * @example
 * // example
 * var showAction = show();
 */
export function show<T extends Node> (): Show<T> {
    return new Show<T>();
}

/*
 * Hide the node.
 * @class Hide
 * @extends ActionInstant
 */
export class Hide<T extends Node> extends ActionInstant {
    override update (_dt: number): void {
        const target = this._getWorkerTarget<T>();
        if (!target) return;
        const _renderComps = target.getComponentsInChildren(Renderer);
        for (let i = 0; i < _renderComps.length; ++i) {
            const render = _renderComps[i];
            render.enabled = false;
        }
    }

    override reverse (): Show<T> {
        return new Show<T>();
    }

    override clone (): Hide<T> {
        const action = new Hide<T>();
        action._id = this._id;
        return action;
    }

    override toString (): string {
        return '<Hide>';
    }
}

/**
 * @en Hide the node.
 * @zh 立即隐藏。
 * @method hide
 * @return {Hide}
 * @example
 * // example
 * var hideAction = hide();
 */
export function hide<T extends Node> (): Hide<T> {
    return new Hide<T>();
}

/*
 * Toggles the visibility of a node.
 * @class ToggleVisibility
 * @extends ActionInstant
 */
export class ToggleVisibility<T extends Node> extends ActionInstant {
    override update (_dt: number): void {
        const target = this._getWorkerTarget<T>();
        if (!target) return;
        const _renderComps = target.getComponentsInChildren(Renderer);
        for (let i = 0; i < _renderComps.length; ++i) {
            const render = _renderComps[i];
            render.enabled = !render.enabled;
        }
    }

    override reverse (): ToggleVisibility<T> {
        return new ToggleVisibility<T>();
    }

    override clone (): ToggleVisibility<T> {
        const action = new ToggleVisibility<T>();
        action._id = this._id;
        return action;
    }

    override toString (): string {
        return '<ToggleVisibility>';
    }
}

/**
 * @en Toggles the visibility of a node.
 * @zh 显隐状态切换。
 * @method toggleVisibility
 * @return {ToggleVisibility}
 * @example
 * // example
 * var toggleVisibilityAction = toggleVisibility();
 */
export function toggleVisibility<T extends Node> (): ToggleVisibility<T> {
    return new ToggleVisibility<T>();
}

/*
 * Delete self in the next frame.
 * @class RemoveSelf
 * @extends ActionInstant
 * @param {Boolean} [isNeedCleanUp=true]
 *
 * @example
 * // example
 * var removeSelfAction = new RemoveSelf(false);
 */
export class RemoveSelf<T extends Node> extends ActionInstant {
    protected _isNeedCleanUp = true;

    constructor (isNeedCleanUp?: boolean) {
        super();
        if (isNeedCleanUp !== undefined) this.init(isNeedCleanUp);
    }

    override update (_dt: number): void {
        const target = this._getWorkerTarget<T>();
        if (!target) return;
        target.removeFromParent();
        if (this._isNeedCleanUp) {
            target.destroy();
        }
    }

    init (isNeedCleanUp: boolean): boolean {
        this._isNeedCleanUp = isNeedCleanUp;
        return true;
    }

    override reverse (): RemoveSelf<T> {
        return new RemoveSelf<T>(this._isNeedCleanUp);
    }

    override clone (): RemoveSelf<T> {
        const action = new RemoveSelf<T>(this._isNeedCleanUp);
        action._id = this._id;
        return action;
    }

    override toString (): string {
        return '<RemoveSelf>';
    }
}

/**
 * @en Create a RemoveSelf object with a flag indicate whether the target should be cleaned up while removing.
 * @zh 从父节点移除自身。
 * @method removeSelf
 * @param {Boolean} [isNeedCleanUp = true]
 * @return {RemoveSelf}
 *
 * @example
 * // example
 * var removeSelfAction = removeSelf();
 */
export function removeSelf<T extends Node> (isNeedCleanUp: boolean): RemoveSelf<T> {
    return new RemoveSelf<T>(isNeedCleanUp);
}

export type CallFuncCallback<Target, Data> = (target?: Target, data?: Data) => void;

/*
 * Calls a 'callback'.
 * @class CallFunc
 * @extends ActionInstant
 * @param {function} selector
 * @param {object} [selectorTarget=null]
 * @param {*} [data=null] data for function, it accepts all data types.
 * @example
 * // example
 * // CallFunc without data
 * var finish = new CallFunc(this.removeSprite, this);
 *
 * // CallFunc with data
 * var finish = new CallFunc(this.removeFromParentAndCleanup, this,  true);
 */
export class CallFunc<CallbackThis, Target, Data> extends ActionInstant {
    private _callbackThis: CallbackThis | undefined = undefined;
    private _callback: CallFuncCallback<Target, Data> | undefined = undefined;
    private _data: Data | undefined = undefined;

    /*
     * Constructor function, override it to extend the construction behavior, remember to call "super()". <br />
     * Creates a CallFunc action with the callback.
     * @param callback The callback function
     * @param callbackThis The this object for callback
     * @param data The custom data passed to the callback function, it accepts all data types.
     */
    constructor (selector?: CallFuncCallback<Target, Data>, callbackThis?: CallbackThis, data?: Data) {
        super();
        this.initWithFunction(selector, callbackThis, data);
    }

    /*
     * Initializes the action with a function or function and its target
     * @param callback The callback function
     * @param callbackThis The this object for callback
     * @param data The custom data passed to the callback function, it accepts all data types.
     * @return This function always returns true.
     */
    initWithFunction (callback?: CallFuncCallback<Target, Data>, callbackThis?: CallbackThis, data?: Data): boolean {
        if (callback) {
            this._callback = callback;
        }
        if (callbackThis) {
            this._callbackThis = callbackThis;
        }
        if (data !== undefined) {
            this._data = data;
        }
        return true;
    }

    /*
     * execute the function.
     */
    execute (): void {
        if (this._callback) {
            const target = this._getWorkerTarget() as Target;
            this._callback.call(this._callbackThis, target, this._data);
        }
    }

    override update (_dt: number): void {
        this.execute();
    }

    /*
     * Get selectorTarget.
     * @mangle
     */
    getTargetCallback (): CallbackThis | undefined {
        return this._callbackThis;
    }

    /*
     * Set selectorTarget.
     * @mangle
     */
    setTargetCallback (sel: CallbackThis): void {
        if (sel !== this._callbackThis) {
            this._callbackThis = sel;
        }
    }

    override clone (): CallFunc<CallbackThis, Target, Data> {
        const action = new CallFunc<CallbackThis, Target, Data>();
        action._id = this._id;
        if (this._callback) action.initWithFunction(this._callback, this._callbackThis, this._data);
        return action;
    }

    override toString (): string {
        return `<CallFunc>`;
    }
}

/**
 * @en Creates the action with the callback.
 * @zh 执行回调函数。
 * @method callFunc
 * @param {function} selector
 * @param {object} [selectorTarget=null]
 * @param {*} [data=null] - data for function, it accepts all data types.
 * @return {ActionInstant}
 * @example
 * // example
 * // CallFunc without data
 * var finish = callFunc(this.removeSprite, this);
 *
 * // CallFunc with data
 * var finish = callFunc(this.removeFromParentAndCleanup, this._grossini,  true);
 */
export function callFunc<SelectorTarget, Target, Data> (
    selector: CallFuncCallback<Target, Data>,
    selectorTarget?: SelectorTarget,
    data?: Data,
): ActionInstant {
    return new CallFunc(selector, selectorTarget, data);
}
