import CANNON from 'cannon';
import Vec3 from '../../../core/value-types/vec3';
import { vec3 } from '../../../core/vmath';
import Node from '../../../scene-graph/node';
import { PhysicsMaterial as PhysicsMaterial } from '../../assets/physics/material';

export enum DataFlow {
    PUSHING,
    PULLING,
}

export class RigidBody {
    private _node: Node;

    private _material: PhysicsMaterial | null = null;

    private _cannonBody: CANNON.Body;

    private _onCollidedListener: (event: CANNON.ICollisionEvent) => any;

    private _onWorldPostStepListener: ((event: CANNON.IEvent) => any) | null = null;

    private _shapes: Set<PhysicsShape> = new Set();

    private _dataflow: DataFlow = DataFlow.PUSHING;

    constructor(node: Node) {
        this._node = node;

        const cannonBodyOptions: CANNON.IBodyOptions = {};

        this._cannonBody = new CANNON.Body(cannonBodyOptions);

        this._onCollidedListener = this._onCollided.bind(this);
        this._cannonBody.addEventListener('collide', this._onCollidedListener);
    }

    public destroy() {
        this._cannonBody.removeEventListener('collide', this._onCollidedListener);
    }

    public _onAdded() {
        this._onWorldPostStepListener = this._onWorldPostStep.bind(this);
        this._cannonBody.world.addEventListener('postStep', this._onWorldPostStepListener);
    }

    public _onRemoved() {
        if (this._cannonBody.world && this._onWorldPostStepListener) {
            this._cannonBody.world.removeEventListener('postStep', this._onWorldPostStepListener);
        }
    }

    public _getCannonBody() {
        return this._cannonBody;
    }

    public addShape(shape: PhysicsShape) {
        this._shapes.add(shape);
        this._cannonBody.addShape(shape._getCannonShape());
    }

    public getCenter(shape: PhysicsShape) {
        const iShape = this._cannonBody.shapes.indexOf(shape._getCannonShape());
        if (iShape >= 0) {
            const shapeOffset = this._cannonBody.shapeOffsets[iShape];
            return new Vec3(shapeOffset.x, shapeOffset.y, shapeOffset.z);
        }
        throw new Error(`shape not found.`);
    }

    public setCenter(shape: PhysicsShape, center: Vec3) {
        const iShape = this._cannonBody.shapes.indexOf(shape._getCannonShape());
        if (iShape >= 0) {
            this._cannonBody.shapeOffsets[iShape].set(center.x, center.y, center.z);
        }
    }

    get material() {
        return this._material;
    }

    set material(value) {
        this._material = value;
        if (!this._material) {
            return;
        }

        if (!this._cannonBody.material) {
            this._cannonBody.material = new CANNON.Material(this._material.name);
        }

        this._cannonBody.material.friction = this._material.friction;
        this._cannonBody.material.restitution = this._material.restitution;
    }

    get mass() {
        return this._cannonBody.mass;
    }

    set mass(value) {
        this._cannonBody.mass = value;
        this._cannonBody.updateMassProperties();
        if (this._cannonBody.type !== CANNON.Body.KINEMATIC) {
            this._updateBodyType(value <= 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC);
        }
    }

    get drag() {
        return this._cannonBody.linearDamping;
    }

    set drag(value) {
        this._cannonBody.linearDamping = value;
    }

    get angularDrag() {
        return this._cannonBody.angularDamping;
    }

    set angularDrag(value) {
        this._cannonBody.angularDamping = value;
    }

    get isTrigger() {
        return this._cannonBody.collisionResponse;
    }

    set isTrigger(value) {
        this._cannonBody.collisionResponse = value;
    }

    get dataFlow() {
        return this._dataflow;
    }

    /**
     * Set the collision filter of this body, remember that they are tested bitwise.
     * @param {number} group The group which this body will be put into.
     * @param {number} mask The groups which this body can collide with.
     */
    public setCollisionFilter(group: number, mask: number) {
        this._cannonBody.collisionFilterGroup = group;
        this._cannonBody.collisionFilterMask = mask;
    }

    public setWorldPosition(position: Vec3) {
        this._cannonBody.position.set(position.x, position.y, position.z);
    }

    /**
     * Is this body currently in contact with the specified body?
     * @param {CannonBody} body The body to test against.
     */
    public isInContactWith(body: RigidBody) {
        if (!this._cannonBody.world) {
            return false;
        }

        return this._cannonBody.world.collisionMatrix.get(
            this._cannonBody.id, body._cannonBody.id) > 0;
    }

    /**
     * Push the rigidbody's transform information back to node.
     */
    public push() {
        const p = this._cannonBody.position;
        this._node.setWorldPosition(p.x, p.y, p.z);
        const q = this._cannonBody.quaternion;
        this._node.setWorldRotation(q.x, q.y, q.z, q.w);
    }

    private _onCollided(event: CANNON.ICollisionEvent) {
        // console.log(`Collided: ${event.contact}`);
    }

    private _onWorldPostStep(event: CANNON.IEvent) {
        if (this._dataflow === DataFlow.PULLING) {
            this._pull();
        }
    }

    /**
     * Pull node's transform information into rigidbody.
     */
    private _pull() {
        // @ts-nocheck
        this._node.getWorldPosition(this._cannonBody.position);
        // @ts-nocheck
        this._node.getWorldRotation(this._cannonBody.quaternion);
        const scale = this._node.getWorldScale();
        this._shapes.forEach((shape) => {
            if (!vec3.exactEquals(scale, shape.scale)) {
                shape.scale = scale;
            }
        });
        this._cannonBody.updateBoundingRadius();
    }

    private _updateBodyType(type: number) {
        this._cannonBody.type = type;
        if (type !== CANNON.Body.STATIC) {
            this._dataflow = DataFlow.PUSHING;
        } else {
            this._dataflow = DataFlow.PULLING;
        }
    }
}

export class PhysicsShape {
    private _scale: cc.Vec3 = new cc.Vec3(1.0, 1.0, 1.0);

    constructor(private _cannonShape: CANNON.Shape) {
    }

    public get scale() {
        return this._scale;
    }

    public set scale(value) {
        vec3.copy(this._scale, value);
        this._onShapeParamUpdated();
    }

    public _getCannonShape<T extends CANNON.Shape>() {
        return this._cannonShape as T;
    }

    protected _onShapeParamUpdated() {
    }
}

export class PhysicsBoxShape extends PhysicsShape {
    private _size: cc.Vec3;

    constructor(size: Vec3) {
        super(new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)));

        this._size = new cc.Vec3(size.x, size.y, size.z);
    }

    public get size() {
        return this._size;
    }

    public set size(value) {
        vec3.copy(this._size, value);
        this._onShapeParamUpdated();
    }

    protected _onShapeParamUpdated() {
        const newHalfExtents = new CANNON.Vec3();
        vec3.multiply(newHalfExtents, this._size, this.scale);
        vec3.scale(newHalfExtents, newHalfExtents, 0.5);
        const shape = this._getCannonShape<CANNON.Box>();
        shape.halfExtents = newHalfExtents;
        shape.updateBoundingSphereRadius();
        shape.updateConvexPolyhedronRepresentation();
    }
}

export class PhysicsSphereShape extends PhysicsShape {
    private _radius: number;

    constructor(radius: number) {
        super(new CANNON.Sphere(radius));

        this._radius = radius;
    }

    public get radius() {
        return this._radius;
    }

    public set radius(value) {
        this._radius = value;
        this._onShapeParamUpdated();
    }

    protected _onShapeParamUpdated() {
        const shape = this._getCannonShape<CANNON.Sphere>();
        shape.radius = this._radius * maxComponent(this.scale);
        shape.updateBoundingSphereRadius();
    }
}

function maxComponent(v: { x: number, y: number, z: number }) {
    return Math.max(v.x, Math.max(v.y, v.z));
}
