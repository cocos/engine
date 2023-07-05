import { DEBUG } from 'internal:constants';
import { assertIsTrue } from '../../core';
import { VFXArray, BATCH_OPERATION_THRESHOLD, Handle, VFXValue, VFXValueType } from '../vfx-parameter';

const STRIDE = 1;
export class VFXBoolArray extends VFXArray {
    get type () {
        return VFXValueType.BOOL;
    }

    private _data = new Uint8Array(this._size);

    reserve (size: number) {
        if (size <= this._size) return;
        this._size = size;
        const oldData = this._data;
        this._data = new Uint8Array(size);
        this._data.set(oldData);
    }

    moveTo (a: Handle, b: Handle) {
        if (DEBUG) {
            assertIsTrue(a <= this._size && a >= 0);
            assertIsTrue(b <= this._size && b >= 0);
        }
        this._data[b] = this._data[a];
    }

    getBoolAt (handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle <= this._size && handle >= 0);
        }
        return this._data[handle] as unknown as boolean;
    }

    setBoolAt (val: boolean, handle: Handle) {
        if (DEBUG) {
            assertIsTrue(handle <= this._size && handle >= 0);
        }
        this._data[handle] = val ? 1 : 0;
    }

    copyFrom (src: VFXBoolArray, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(toIndex <= this._size && fromIndex >= 0 && fromIndex <= toIndex);
            assertIsTrue(src._size === this._size);
        }
        if ((toIndex - fromIndex) > BATCH_OPERATION_THRESHOLD) {
            const source = (toIndex === this._size && fromIndex === 0) ? src._data : src._data.subarray(fromIndex, toIndex);
            this._data.set(source, fromIndex);
        } else {
            const destData = this._data;
            const srcData = src._data;
            for (let i = fromIndex; i < toIndex; i++) {
                destData[i] = srcData[i];
            }
        }
    }

    copyToTypedArray (dest: Uint8Array, destOffset: number, stride: number, strideOffset: number, fromIndex: Handle, toIndex: Handle) {
        if (DEBUG) {
            assertIsTrue(toIndex <= this._size && fromIndex >= 0 && fromIndex <= toIndex);
            assertIsTrue(stride >= STRIDE && strideOffset >= 0 && strideOffset < stride);
            assertIsTrue(destOffset >= 0);
            assertIsTrue(dest.length >= (toIndex - fromIndex) * stride);
            assertIsTrue(stride >= strideOffset + STRIDE);
        }
        if (stride === STRIDE && strideOffset === 0 && toIndex - fromIndex > BATCH_OPERATION_THRESHOLD) {
            const source = (toIndex === this._size && fromIndex === 0) ? this._data : this._data.subarray(fromIndex, toIndex);
            dest.set(source, destOffset * stride);
            return;
        }
        const data = this._data;
        for (let offset = destOffset * stride + strideOffset, i = fromIndex; i < toIndex; offset += stride, i++) {
            dest[offset] = data[i];
        }
    }

    fill (val: boolean, fromIndex: number, toIndex: number) {
        if (DEBUG) {
            assertIsTrue(toIndex <= this._size && fromIndex >= 0 && fromIndex <= toIndex);
        }
        const valNum = val ? 1 : 0;
        if ((toIndex - fromIndex) > BATCH_OPERATION_THRESHOLD) {
            this._data.fill(valNum, fromIndex, toIndex);
        } else {
            const data = this._data;
            for (let i = fromIndex; i < toIndex; i++) {
                data[i] = valNum;
            }
        }
    }
}

export class VFXBool extends VFXValue {
    get type (): VFXValueType {
        return VFXValueType.BOOL;
    }

    get data (): boolean {
        return this._data;
    }

    set data (val: boolean) {
        this._data = val;
    }

    private _data = false;
}
