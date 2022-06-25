export class Pacer {
    private _rafHandle = 0;
    private _stHandle = 0;
    private _onTick: (() => void) | null = null;
    private _targetFrameRate = 60;
    private _frameTime = 0;
    private _startTime = 0;
    private _isPlaying = false;
    constructor () {
        window._rAF = window.requestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.oRequestAnimationFrame
        || window.msRequestAnimationFrame
        || this._stTime.bind(this);
        window._cAF = window.cancelAnimationFrame
        || window.cancelRequestAnimationFrame
        || window.msCancelRequestAnimationFrame
        || window.mozCancelRequestAnimationFrame
        || window.oCancelRequestAnimationFrame
        || window.webkitCancelRequestAnimationFrame
        || window.msCancelAnimationFrame
        || window.mozCancelAnimationFrame
        || window.webkitCancelAnimationFrame
        || window.ocancelAnimationFrame
        || this._ctTime.bind(this);
    }

    get targetFrameRate (): number {
        return this._targetFrameRate;
    }

    set targetFrameRate (val: number) {
        if (this._targetFrameRate !== val) {
            this._targetFrameRate = val;
            this._frameTime = 1000 / this._targetFrameRate;
            if (this._isPlaying) {
                this.stop();
                this.start();
            }
        }
    }

    onTick (cb: () => void): void {
        this._onTick = cb;
    }

    start (): void {
        if (this._isPlaying) return;
        if (this._targetFrameRate === 60) {
            const updateCallback = () => {
                if (this._onTick) {
                    this._onTick();
                }
                this._rafHandle = window._rAF(updateCallback);
            };
            this._rafHandle = window._rAF(updateCallback);
        } else {
            const updateCallback = () => {
                this._startTime = performance.now();
                if (this._onTick) {
                    this._onTick();
                }
                this._stHandle = this._stTime(updateCallback);
            };
            this._startTime = performance.now();
            this._stHandle = this._stTime(updateCallback);
        }
        this._isPlaying = true;
    }

    stop (): void {
        if (!this._isPlaying) return;
        window._cAF(this._rafHandle);
        this._ctTime(this._stHandle);
        this._isPlaying = false;
    }

    private _stTime (callback: () => void) {
        const currTime = performance.now();
        const elapseTime = Math.max(0, (currTime - this._startTime));
        const timeToCall = Math.max(0, this._frameTime - elapseTime);
        const id = window.setTimeout(callback, timeToCall);
        return id;
    }

    private _ctTime (id: number | undefined) {
        window.clearTimeout(id);
    }
}
