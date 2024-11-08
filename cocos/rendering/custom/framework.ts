/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

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

import { BasicPipeline, PipelineBuilder } from './pipeline';
import { Camera } from '../../render-scene/scene/camera';
import { RenderWindow } from '../../render-scene/core/render-window';
import { supportsR32FloatTexture } from '../define';
import { Format } from '../../gfx/base/define';

export { packRGBE } from '../../core/math/color';

//-----------------------------------------------------------------
// Editor preview begin
//-----------------------------------------------------------------
let editorPipelineSettings: object | null = null;
let forceResize = false;

export function setEditorPipelineSettings (
    settings: object | null,
): void {
    editorPipelineSettings = settings;
    forceResize = true;
}

export function getEditorPipelineSettings (): object | null {
    return editorPipelineSettings;
}

//-----------------------------------------------------------------
// Editor preview end
//-----------------------------------------------------------------

export function forceResizeAllWindows (): void {
    forceResize = true;
}

export function defaultWindowResize (ppl: BasicPipeline, window: RenderWindow, width: number, height: number): void {
    ppl.addRenderWindow(window.colorName, Format.BGRA8, width, height, window);
    ppl.addDepthStencil(window.depthStencilName, Format.DEPTH_STENCIL, width, height);
    // CSM
    const id = window.renderWindowId;
    const shadowFormat = supportsR32FloatTexture(ppl.device) ? Format.R32F : Format.RGBA8;
    const shadowSize = ppl.pipelineSceneData.shadows.size;
    ppl.addRenderTarget(`ShadowMap${id}`, shadowFormat, shadowSize.x, shadowSize.y);
    ppl.addDepthStencil(`ShadowDepth${id}`, Format.DEPTH_STENCIL, shadowSize.x, shadowSize.y);
}

const _resizedWindows: RenderWindow[] = [];

export function dispatchResizeEvents (cameras: Camera[], builder: PipelineBuilder, ppl: BasicPipeline): void {
    if (!builder.windowResize) {
        // No game window resize handler defined.
        // Following old prodecure, do nothing
        return;
    }

    // Resize all windows.
    // Notice: A window might be resized multiple times with different cameras.
    // User should avoid resource collision between different cameras.
    for (const camera of cameras) {
        if (!camera.window.isRenderWindowResized() && !forceResize) {
            continue;
        }

        const width = Math.max(Math.floor(camera.window.width), 1);
        const height = Math.max(Math.floor(camera.window.height), 1);

        builder.windowResize(ppl, camera.window, camera, width, height);

        _resizedWindows.push(camera.window);
    }

    // Reset resize flags
    for (const window of _resizedWindows) {
        window.setRenderWindowResizeHandled();
    }

    // Clear resized windows
    _resizedWindows.length = 0;

    // For editor preview
    forceResize = false;
}
