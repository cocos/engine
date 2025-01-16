/*
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import zlib from '../../../external/compression/zlib.min';
import { BasicPipeline, PipelineBuilder } from './pipeline';
import { WebPipeline } from './web-pipeline';
import { macro } from '../../core/platform/macro';
import { LayoutGraphData, loadLayoutGraphData } from './layout-graph';
import { BinaryInputArchive } from './binary-archive';
import { WebProgramLibrary } from './web-program-library';
import { Device } from '../../gfx';
import { initializeLayoutGraphData, terminateLayoutGraphData, getCustomPassID, getCustomPhaseID, getCustomSubpassID } from './layout-graph-utils';
import { ProgramLibrary } from './private';
import { forceResizeAllWindows } from './framework';

let _pipeline: WebPipeline | null = null;

export const INVALID_ID = 0xFFFFFFFF;
const defaultLayoutGraph = new LayoutGraphData();

const LAYOUT_HEADER_SIZE = 8;

export * from './types';
export * from './pipeline';
export * from './archive';
export * from './framework';

export const enableEffectImport = true;
export const programLib: ProgramLibrary = new WebProgramLibrary(defaultLayoutGraph);

export function createCustomPipeline (): BasicPipeline {
    const layoutGraph = defaultLayoutGraph;

    const ppl = new WebPipeline(layoutGraph);
    const pplName = macro.CUSTOM_PIPELINE_NAME;
    ppl.setCustomPipelineName(pplName);
    (programLib as WebProgramLibrary).pipeline = ppl;
    _pipeline = ppl;
    return ppl;
}

export const customPipelineBuilderMap = new Map<string, PipelineBuilder>();

export function setCustomPipeline (name: string, builder: PipelineBuilder): void {
    customPipelineBuilderMap.set(name, builder);
    forceResizeAllWindows();
}

export function getCustomPipeline (name: string): PipelineBuilder {
    let builder = customPipelineBuilderMap.get(name);
    if (!builder) {
        builder = customPipelineBuilderMap.get('Forward')!;
    }
    return builder;
}

export function init (device: Device, arrayBuffer: ArrayBuffer | null): void {
    if (arrayBuffer && arrayBuffer.byteLength >= LAYOUT_HEADER_SIZE) {
        // On bytedance emulator, arrayBuffer might be Uint8Array
        // Here we use uint8Array to erase the difference.
        const uint8Array = new Uint8Array(arrayBuffer);
        const header = new DataView(uint8Array.buffer, uint8Array.byteOffset, LAYOUT_HEADER_SIZE);
        if (header.getUint32(0) === INVALID_ID) {
            // Data is compressed
            const inflator = new zlib.Inflate(new Uint8Array(uint8Array.buffer, uint8Array.byteOffset + LAYOUT_HEADER_SIZE));
            const decompressed = inflator.decompress() as Uint8Array;
            const readBinaryData = new BinaryInputArchive(decompressed.buffer, decompressed.byteOffset);
            loadLayoutGraphData(readBinaryData, defaultLayoutGraph);
        } else {
            // Data is not compressed
            const readBinaryData = new BinaryInputArchive(uint8Array.buffer, uint8Array.byteOffset);
            loadLayoutGraphData(readBinaryData, defaultLayoutGraph);
        }
    }
    initializeLayoutGraphData(device, defaultLayoutGraph);
}

export function destroy (): void {
    terminateLayoutGraphData(defaultLayoutGraph);
}

export function getPassID (name: string | undefined): number {
    return getCustomPassID(defaultLayoutGraph, name);
}

export function getSubpassID (passID: number, name: string): number {
    return getCustomSubpassID(defaultLayoutGraph, passID, name);
}

export function getPhaseID (passID: number, name: string | number | undefined): number {
    return getCustomPhaseID(defaultLayoutGraph, passID, name);
}

export function completePhaseName (name: string | number | undefined): string {
    if (typeof name === 'number') {
        return name.toString();
    } else if (typeof name === 'string') {
        return name;
    } else {
        return 'default';
    }
}
