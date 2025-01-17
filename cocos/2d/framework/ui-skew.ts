import { ccclass, disallowMultiple, executeInEditMode, menu, serializable, type } from 'cc.decorator';
import { JSB } from 'internal:constants';
import { Component } from '../../scene-graph/component';
import { cclegacy, IVec2Like, v2, Vec2 } from '../../core';
import { NodeEventType, TransformBit } from '../../scene-graph';
import { TRANSFORM_ON } from '../../scene-graph/node';

const tempVec2 = v2();

@ccclass('cc.UISkew')
@menu('UI/UISkew')
@disallowMultiple
@executeInEditMode
export class UISkew extends Component {
    @serializable
    private _value: Vec2 = v2();

    constructor () {
        super();
    }

    protected override __preload (): void {
        this.node._uiProps.uiSkewComp = this;
        if (JSB) {
            (this.node as any)._hasSkewComp = true;
        }
    }

    protected override onLoad (): void {

    }

    protected override onEnable (): void {
        this.node.on(NodeEventType.TRANSFORM_CHANGED, this._onTransformChanged, this);
    }

    protected override onDisable (): void {
        this.node.off(NodeEventType.TRANSFORM_CHANGED, this._onTransformChanged, this);
    }

    protected override onDestroy (): void {
        if (JSB) {
            (this.node as any)._hasSkewComp = false;
        }
        this.node._uiProps.uiSkewComp = null;
    }

    get x (): number {
        return this._value.x;
    }

    set x (v: number) {
        this._value.x = v;
        if (JSB) {
            (this.node as any)._setSkewX(v);
        }
        this._updateNodeTransformFlags();
    }

    get y (): number {
        return this._value.y;
    }

    set y (v: number) {
        this._value.y = v;
        if (JSB) {
            (this.node as any)._setSkewY(v);
        }
        this._updateNodeTransformFlags();
    }

    /**
     *
     */
    @type(Vec2)
    get skew (): Readonly<Vec2> {
        return this._value;
    }

    set skew (value: Readonly<Vec2>) {
        this.setSkew(value);
    }

    /**
     * @en Set the skew value of the node by Vec2.
     * @param @en value The skew value in Vec2.
     */
    setSkew (value: IVec2Like): void;
    /**
     * @en Set the skew value of the node by x and y.
     * @param x @en The skew on x axis.
     * @param y @en The skew on y axis.
     */
    setSkew (x: number, y: number): void;
    setSkew (xOrVec2: number | IVec2Like, y?: number): void {
        const v = this._value;
        if (typeof xOrVec2 === 'number') {
            tempVec2.set(xOrVec2, y);
        } else {
            Vec2.copy(tempVec2, xOrVec2);
        }
        if (Vec2.equals(v, tempVec2)) return;

        v.set(tempVec2);
        if (JSB) {
            (this.node as any)._setSkew(v);
        }
        this._updateNodeTransformFlags();
    }

    getSkew (): Readonly<Vec2> {
        return this._value;
    }

    private _updateNodeTransformFlags (fireEvent?: boolean): void {
        const node = this.node;
        node.invalidateChildren(TransformBit.SKEW | TransformBit.RS);
        if (fireEvent) {
            node.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SKEW);
        }
    }

    private _onTransformChanged (bit: TransformBit): void {
        if (bit & TransformBit.RS) {
            this._updateNodeTransformFlags(false);
        }
    }
}

cclegacy.UISkew = UISkew;
