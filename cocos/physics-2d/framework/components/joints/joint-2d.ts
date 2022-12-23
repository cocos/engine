import { EDITOR } from 'internal:constants';
import { Vec2, _decorator, cclegacy } from '../../../../core';
import { RigidBody2D } from '../rigid-body-2d';
import { IJoint2D } from '../../../spec/i-physics-joint';
import { EJoint2DType } from '../../physics-types';
import { createJoint } from '../../physics-selector';
import { Component } from '../../../../scene-graph';

const { ccclass, type, property } = _decorator;

@ccclass('cc.Joint2D')
export class Joint2D extends Component {
    /**
     * @en
     * The position of Joint2D in the attached rigid body's local space.
     * @zh
     * 在自身刚体的本地空间中，Joint2D的位置。
     */
    @property
    anchor = new Vec2();

    /**
     * @en
     * The position of Joint2D in the connected rigid body's local space.
     * @zh
     * 在连接刚体的本地空间中，Joint2D的位置。
     */
    @property
    connectedAnchor = new Vec2();

    /**
     * @en
     * whether collision is turned on between two rigid bodies connected by a joint.
     * @zh
     * 关节连接的两刚体之间是否开启碰撞。
     */
    @property
    collideConnected = false;

    /**
     * @en
     * The jointed rigid body, null means link to a static rigid body at the world origin.
     * @zh
     * 关节连接的刚体，为空时表示连接到位于世界原点的静态刚体。
     */
    @type(RigidBody2D)
    connectedBody: RigidBody2D | null = null;

    /**
     * @en
     * the Joint2D attached rigid-body.
     * @zh
     * 关节所绑定的刚体组件。
     */
    _body: RigidBody2D | null = null
    get body () {
        return this._body;
    }

    get impl () {
        return this._joint;
    }

    protected _joint: IJoint2D | null = null;

    /**
     * @en
     * the type of this joint.
     * @zh
     * 此关节的类型。
     */
    TYPE = EJoint2DType.None;

    protected onLoad () {
        if (!EDITOR || cclegacy.GAME_VIEW) {
            this._joint = createJoint(this.TYPE);
            this._joint.initialize(this);

            this._body = this.getComponent(RigidBody2D);
        }
    }

    protected onEnable () {
        if (this._joint && this._joint.onEnable) {
            this._joint.onEnable();
        }
    }

    protected onDisable () {
        if (this._joint && this._joint.onDisable) {
            this._joint.onDisable();
        }
    }

    protected start () {
        if (this._joint && this._joint.start) {
            this._joint.start();
        }
    }

    protected onDestroy () {
        if (this._joint && this._joint.onDestroy) {
            this._joint.onDestroy();
        }
    }
}
