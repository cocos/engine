declare const ral: any;
export class Pacer {
    private _rafHandle = 0;
    private _onTick: (() => void) | null = null;
    private _targetFrameRate = 60;
    private _isPlaying = false;
    private _updateCallback: () => void;
    constructor () {
        this._updateCallback = () => {
            if (this._onTick) {
                this._onTick();
            }
            this._rafHandle = requestAnimationFrame(this._updateCallback);
        };
    }

    get targetFrameRate (): number {
        return this._targetFrameRate;
    }

    set targetFrameRate (val: number) {
        if (this._targetFrameRate !== val) {
            this._targetFrameRate = val;
            ral.setPreferredFramesPerSecond(this._targetFrameRate);
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
        this._rafHandle = requestAnimationFrame(this._updateCallback);
        this._isPlaying = true;
    }

    stop (): void {
        if (!this._isPlaying) return;
        cancelAnimationFrame(this._rafHandle);
        this._isPlaying = false;
    }
}
