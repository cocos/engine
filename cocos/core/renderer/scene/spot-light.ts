import { aabb, frustum } from '../../geometry';
import { Mat4, Quat, Vec3 } from '../../math';
import { Light, LightType, nt2lm } from './light';
import { AABBHandle, AABBPool, AABBView, FrustumHandle, FrustumPool, LightPool, LightView, NULL_HANDLE } from '../core/memory-pools';

const _forward = new Vec3(0, 0, -1);
const _qt = new Quat();
const _matView = new Mat4();
const _matProj = new Mat4();
const _matViewProj = new Mat4();
const _matViewProjInv = new Mat4();

export class SpotLight extends Light {
    protected _dir: Vec3 = new Vec3(1.0, -1.0, -1.0);
    protected _size: number = 0.15;
    protected _range: number = 5.0;
    protected _spotAngle: number = Math.cos(Math.PI / 6);
    protected _pos: Vec3;
    protected _aabb: aabb;
    protected _frustum: frustum;
    protected _angle: number = 0;
    protected _needUpdate = false;

    get position () {
        return this._pos;
    }

    set size (size: number) {
        LightPool.set(this._handle, LightView.SIZE, size);
    }

    get size (): number {
        return LightPool.get(this._handle, LightView.SIZE);
    }

    set range (range: number) {
        LightPool.set(this._handle, LightView.RANGE, range);
        this._needUpdate = true;
    }

    get range (): number {
        return LightPool.get(this._handle, LightView.RANGE);
    }

    set luminance (lum: number) {
        LightPool.set(this._handle, LightView.ILLUMINANCE, lum);
    }

    get luminance (): number {
        return LightPool.get(this._handle, LightView.ILLUMINANCE);
    }

    get direction (): Vec3 {
        return this._dir;
    }

    get spotAngle () {
        return LightPool.get(this._handle, LightView.SPOT_ANGLE);
    }

    set spotAngle (val: number) {
        this._angle = val;
        LightPool.set(this._handle, LightView.SPOT_ANGLE, Math.cos(val * 0.5))
        this._needUpdate = true;
    }

    get aabb () {
        return this._aabb;
    }

    get frustum () {
        return this._frustum;
    }

    constructor () {
        super();
        this._type = LightType.SPOT;
        this._aabb = aabb.create();
        this._frustum = frustum.create();
        this._pos = new Vec3();
    }

    public initialize () {
        super.initialize();
        const size = 0.15;
        LightPool.set(this._handle, LightView.SIZE, size);
        LightPool.set(this._handle, LightView.AABB, this.aabb.handle);
        LightPool.set(this._handle, LightView.FRUSTUM, this.frustum.handle);
        LightPool.set(this._handle, LightView.ILLUMINANCE, 1700 / nt2lm(size));
        LightPool.set(this._handle, LightView.RANGE, 5.0);
        LightPool.set(this._handle, LightView.RANGE, Math.cos(Math.PI / 6));
        LightPool.setVec3(this._handle, LightView.DIRECTION, this._dir);
    }

    public update () {
        if (this._node && (this._node.hasChangedFlags || this._needUpdate)) {
            this._node.getWorldPosition(this._pos);
            Vec3.transformQuat(this._dir, _forward, this._node.getWorldRotation(_qt));
            Vec3.normalize(this._dir, this._dir);
            LightPool.setVec3(this._handle, LightView.DIRECTION, this._dir);
            aabb.set(this._aabb, this._pos.x, this._pos.y, this._pos.z, this._range, this._range, this._range);

            // view matrix
            this._node.getWorldRT(_matView);
            Mat4.invert(_matView, _matView);

            Mat4.perspective(_matProj, this._angle, 1, 0.001, this._range);

            // view-projection
            Mat4.multiply(_matViewProj, _matProj, _matView);
            // Mat4.invert(_matViewProjInv, _matViewProj);

            this._frustum.update(_matViewProj, _matViewProjInv);
            this._needUpdate = false;

            LightPool.setVec3(this._handle, LightView.DIRECTION, this._pos);
        }
    }

    public destroy () {
        this.aabb.destroy();
        this.frustum.destroy();
    }
}
