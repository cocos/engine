import { DEBUG } from 'internal:constants';
import { Vec2, assertIsTrue } from '../../core';
import { ArrayParameter, BATCH_OPERATION_THRESHOLD_VEC3, Handle, VFXParameter, VFXParameterType } from '../vfx-parameter';

const tempVec2 = new Vec2();
export class Vec2ArrayParameter extends ArrayParameter {
    get data () {
        return this._data;
    }

    get type () {
        return VFXParameterType.VEC2;
    }

    get stride () {
        return 2;
    }

    private _data = new Float32Array(this.stride * this._capacity);

    static multiplyScalar (out: Vec2ArrayParameter, a: Vec2ArrayParameter, scale: number, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(out._capacity === a._capacity
                && toIndex <= out._capacity && fromIndex >= 0 && fromIndex <= toIndex);
        }
        const aData = a.data;
        const outData = out.data;
        for (let i = fromIndex * a.stride, length = toIndex * a.stride; i < length; i++) {
            outData[i] = aData[i] * scale;
        }
    }

    reserve (capacity: number) {
        if (capacity <= this._capacity) return;
        this._capacity = capacity;
        const oldData = this._data;
        this._data = new Float32Array(this.stride * capacity);
        this._data.set(oldData);
    }

    /**
     * Move data at a to b. the previous data at b will be overwrite.
     * @param a the handle to be moved.
     * @param b the handle to be overwrite.
     */
    move (a: Handle, b: Handle) {
        if (DEBUG) {
            assertIsTrue(a < this._capacity && a >= 0 && b < this._capacity && b >= 0);
        }
        this.setVec2At(this.getVec2At(tempVec2, a), b);
    }

    getVec2At (out: Vec2, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        out.x = data[offset];
        out.y = data[offset + 1];
        return out;
    }

    setVec2At (val: Vec2, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        data[offset] = val.x;
        data[offset + 1] = val.y;
    }

    setUniformFloatAt (val: number, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        data[offset] = val;
        data[offset + 1] = val;
    }

    addVec2At (val: Vec2, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        data[offset] += val.x;
        data[offset + 1] += val.y;
    }

    multiplyVec2At (val: Vec2, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        data[offset] *= val.x;
        data[offset + 1] *= val.y;
    }

    multiplyScalarAt (val: number, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle < this._capacity && handle >= 0);
        }
        const offset = handle * this.stride;
        const data = this._data;
        data[offset] *= val;
        data[offset + 1] *= val;
    }

    copyFrom (src: Vec2ArrayParameter, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(this._capacity === src._capacity && toIndex <= this._capacity && fromIndex >= 0 && fromIndex <= toIndex);
        }
        if ((toIndex - fromIndex) > BATCH_OPERATION_THRESHOLD_VEC3) {
            const source = (fromIndex === 0 && toIndex === this._capacity) ? src._data : src._data.subarray(fromIndex * this.stride, toIndex * this.stride);
            this._data.set(source, fromIndex * this.stride);
        } else {
            const destData = this._data;
            const srcData = src._data;
            for (let i = fromIndex * this.stride, length = toIndex * this.stride; i < length; i++) {
                destData[i] = srcData[i];
            }
        }
    }

    copyToTypedArray (dest: Float32Array, destOffset: number, stride: number, strideOffset: number, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(toIndex <= this._capacity && fromIndex >= 0 && fromIndex <= toIndex);
            assertIsTrue(stride >= this.stride && strideOffset >= 0 && strideOffset < stride);
            assertIsTrue(stride >= strideOffset + this.stride);
            assertIsTrue(destOffset >= 0);
            assertIsTrue(destOffset >= 0 && (destOffset * stride) + (toIndex - fromIndex) * stride <= dest.length);
        }

        if (stride === this.stride && strideOffset === 0 && (toIndex - fromIndex) > BATCH_OPERATION_THRESHOLD_VEC3) {
            const source = (toIndex === this._capacity && fromIndex === 0) ? this._data : this._data.subarray(fromIndex * this.stride, toIndex * this.stride);
            dest.set(source, destOffset * stride);
            return;
        }

        const data = this._data;
        for (let offset = destOffset * stride + strideOffset, sourceOffset = fromIndex * this.stride, length = toIndex * this.stride; sourceOffset < length; offset += stride, sourceOffset += this.stride) {
            dest[offset] = data[sourceOffset];
            dest[offset + 1] = data[sourceOffset + 1];
        }
    }

    fill (val: Vec2, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(toIndex <= this._capacity && fromIndex >= 0 && fromIndex <= toIndex);
        }
        const data = this._data;
        const x = val.x;
        const y = val.y;
        for (let i = fromIndex * this.stride, length = toIndex * this.stride; i < length; i += this.stride) {
            data[i] = x;
            data[i + 1] = y;
        }
    }
}

export class Vec2Parameter extends VFXParameter {
    get type (): VFXParameterType {
        return VFXParameterType.VEC2;
    }

    get data (): Readonly<Vec2> {
        return this._data;
    }

    set data (val: Readonly<Vec2>) {
        Vec2.copy(this._data, val);
    }

    private _data = new Vec2();
}
