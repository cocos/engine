// eslint-disable-next-line import/no-extraneous-dependencies
// import bulletModule from '@cocos/bullet';

import { EDITOR } from 'internal:constants';

let instantiate: any = null;// bulletModule;
if (EDITOR) {
    instantiate = () => ({});
}
if (globalThis.BULLET2) instantiate = globalThis.BULLET2;

const pageSize = 65536; // 64KiB
const memorySize = pageSize * 250; // 16 MiB
const interactive = {
    getWorldTransform (id: number, physicsTransform) {
        // console.log(id, physicsTransform);
    },
    setWorldTransform (id: number, physicsTransform) {
        const btVec3 = bt.Transform_getOrigin(physicsTransform);
        const x = bt.Vec3_x(btVec3);
        const y = bt.Vec3_y(btVec3);
        const z = bt.Vec3_z(btVec3);
        // console.log(id, x, y, z);
    },
};

// env
const env: any = {};
env.getWorldTransform = interactive.getWorldTransform;
env.setWorldTransform = interactive.setWorldTransform;

// memory
const wasmMemory: any = {};
wasmMemory.buffer = new ArrayBuffer(memorySize);
env.memory = wasmMemory;

export const bt = instantiate(env, wasmMemory) as instanceExt;

globalThis.Bullet = bt;
bt.ptr2obj = {};
bt.getObjByPtr = function getObjByPtr<T> (p: ptr) {
    return bt.ptr2obj[p] as T;
};

type ptr = Bullet.ptr;
interface instanceExt extends Bullet.instance {
    ptr2obj: Record<string, unknown>,
    getObjByPtr<T> (p: ptr): T;
    [x: string]: any;
}
