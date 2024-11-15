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

import {
    _decorator,
    assert,
    Component,
    rendering,
} from 'cc';

import { BuiltinPipelineSettings } from './builtin-pipeline-settings';
import { PipelineSettings2 } from './builtin-pipeline';
import { EDITOR } from 'cc/env';

const { ccclass, disallowMultiple, executeInEditMode, menu, requireComponent } = _decorator;

@ccclass('BuiltinPipelinePassBuilder')
@menu('Rendering/BuiltinPipelinePassBuilder')
@requireComponent(BuiltinPipelineSettings)
@disallowMultiple
@executeInEditMode
export class BuiltinPipelinePassBuilder extends Component
    implements rendering.PipelinePassBuilder {
    protected _parent!: BuiltinPipelineSettings;
    protected _settings!: PipelineSettings2;
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 200;
    }
    onEnable(): void {
        this._parent = this.getComponent(BuiltinPipelineSettings)!;
        this._settings = this._parent.getPipelineSettings();

        if (!Object.prototype.hasOwnProperty.call(this._settings, '_passes')) {
            Object.defineProperty(this._settings, '_passes', {
                value: [],
                configurable: false,
                enumerable: false,
                writable: true,
            });
        }

        assert(this._settings._passes !== undefined);
        this._settings._passes.push(this);

        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    onDisable(): void {
        assert(Object.prototype.hasOwnProperty.call(this._settings, '_passes'));
        const passes = this._settings._passes;
        assert(passes !== undefined);
        const idx = passes.indexOf(this);
        assert(idx >= 0);
        passes.splice(idx, 1);
    }
}
