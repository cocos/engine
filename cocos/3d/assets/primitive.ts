import { ccclass, property } from '../../core/data/class-decorator';
import { Enum } from '../../core/math';
import { createMesh } from '../misc/utils';
import * as primitives from '../primitive';
import { Mesh } from './mesh';

const PrimitiveType = Enum({
    BOX: 0,
    SPHERE: 1,
    CYLINDER: 2,
    CONE: 3,
    CAPSULE: 4,
    TORUS: 5,
    PLANE: 6,
    QUAD: 7,
});

@ccclass('cc.Primitive')
export class Primitive extends Mesh {
    @property(PrimitiveType)
    public type: number = PrimitiveType.BOX;
    @property
    public info: Record<string, number> = {};

    public onLoaded () {
        createMesh(primitives[PrimitiveType[this.type]](this.info), this);
    }
}

cc.Primitive = Primitive;
