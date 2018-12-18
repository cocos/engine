
// @ts-check

import { ccclass, property } from '../../../core/data/class-decorator';
import Asset from "../../../assets/CCAsset";

@ccclass('cc.PhysicalMaterial')
export class PhysicalMaterial extends Asset {
    @property
    friction = 0;

    @property
    restitution = 0;
}