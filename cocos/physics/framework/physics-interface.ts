/**
 * @category physics
 */

import { IVec3Like } from '../../core/math';
import { ColliderComponent } from './components/collider/collider-component';

/**
 * @en
 * The definition of the triggering event.
 * @zh
 * 触发事件。
 */
export interface ITriggerEvent {
    /**
     * @en
     * The type of trigger event.
     * @zh
     * 触发的事件类型。
     */
    readonly type: TriggerEventType;

    /**
     * @en
     * The collider component instance of the event owner.
     * @zh
     * 触发事件中的自己的碰撞器
     */
    readonly selfCollider: ColliderComponent;

    /**
     * @en
     * Trigger another collider in event.
     * @zh
     * 触发事件中的另一个碰撞器
     */
    readonly otherCollider: ColliderComponent;

    /**
     * @en
     * Gets the lowLevel object, through which all the exposed properties can be accessed.
     * @zh
     * 获取实现对象，通过它可以访问到底层暴露的所有属性。
     */
    readonly impl: any
}

/**
 * @en
 * The value type definition of the trigger event.
 * @zh
 * 触发事件的值类型定义。
 */
export type TriggerEventType = 'onTriggerEnter' | 'onTriggerStay' | 'onTriggerExit';

/**
 * @en
 * Signature definition of the callback function that triggers the event.
 * @zh
 * 触发事件的回调函数签名定义。
 */
export type TriggerCallback = (event?: ITriggerEvent) => void;

/**
 * @en
 * Collision information for collision events.
 * @zh
 * 碰撞事件的碰撞信息。
 */
export interface IContactEquation {
    /**
     * @en
     * Gets the lowLevel object, through which all the exposed properties can be accessed.
     * @zh
     * 获取实现对象，通过它可以访问到底层暴露的所有属性。
     */
    readonly impl: any;

    /**
     * @en
     * Gets whether the rigid body bound to the selfCollider is A.
     * @zh
     * 获取`selfCollider`所绑定的刚体是否为 A 。
     */
    readonly isBodyA: boolean;

    /**
     * @en
     * Gets the contact point relative to the rigid body A in the local coordinate system.
     * @zh
     * 获取本地坐标系中相对于刚体 A 的碰撞点。
     * @param out used to storage the output.
     */
    getLocalPointOnA (out: IVec3Like): void;

    /**
     * @en
     * Gets the contact point relative to the rigid body B in the local coordinate system.
     * @zh
     * 获取本地坐标系中相对于刚体 B 的碰撞点。
     * @param out used to storage the output.
     */
    getLocalPointOnB (out: IVec3Like): void;

    /**
     * @en
     * Gets the contact point relative to the rigid body A in the world coordinate system.
     * @zh
     * 获取世界坐标系中相对于刚体 A 的碰撞点。
     * @param out used to storage the output.
     */
    getWorldPointOnA (out: IVec3Like): void;

    /**
     * @en
     * Gets the contact point relative to the rigid body B in the world coordinate system.
     * @zh
     * 获取世界坐标系中相对于刚体 B 的碰撞点。
     * @param out used to storage the output.
     */
    getWorldPointOnB (out: IVec3Like): void;

    /**
     * @en
     * Gets the contact normal relative to the rigid body B in the local coordinate system.
     * @zh
     * 获取本地坐标系中相对于刚体 B 的碰撞法线。
     * @param out used to storage the output.
     */
    getLocalNormalOnB (out: IVec3Like): void;

    /**
     * @en
     * Gets the contact normal relative to the rigid body B in the world coordinate system.
     * @zh
     * 获取世界坐标系中相对于刚体 B 的碰撞法线。
     * @param out used to storage the output.
     */
    getWorldNormalOnB (out: IVec3Like): void;
}

/**
 * @en
 * The definition of the collision event.
 * @zh
 * 碰撞事件。
 */
export interface ICollisionEvent {
    /**
     * @en
     * The type of collision event.
     * @zh
     * 碰撞的事件类型。
     */
    readonly type: CollisionEventType;

    /**
     * @en
     * The collider component instance of the event owner.
     * @zh
     * 碰撞中的自己的碰撞器。
     */
    readonly selfCollider: ColliderComponent;

    /**
     * @en
     * Another collider in collision.
     * @zh
     * 碰撞中的另一个碰撞器。
     */
    readonly otherCollider: ColliderComponent;

    /**
     * @en
     * Information about all points of impact in a collision event.
     * @zh
     * 碰撞中的所有碰撞点的信息。
     */
    readonly contacts: IContactEquation[];

    /**
     * @en
     * Gets the lowLevel object, through which all the exposed properties can be accessed.
     * @zh
     * 获取实现对象，通过它可以访问到底层暴露的所有属性。
     */
    readonly impl: any;
}

/**
 * @en
 * Value type definitions for collision events.
 * @zh
 * 碰撞事件的值类型定义。 
 */
export type CollisionEventType = 'onCollisionEnter' | 'onCollisionStay' | 'onCollisionExit';

/**
 * @en
 * Callback function signature definition for collision events.
 * @zh
 * 碰撞事件的回调函数签名定义。
 */
export type CollisionCallback = (event?: ICollisionEvent) => void;
