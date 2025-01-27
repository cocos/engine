/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR, DEV, TEST } from 'internal:constants';
import { CCObjectFlags } from '../core/data/object';
import * as js from '../core/utils/js';
import { legacyCC } from '../core/global-exports';
import { error, errorID, getError } from '../core/platform/debug';
import { Component } from './component';

const Destroying = CCObjectFlags.Destroying;
const IS_PREVIEW = !!legacyCC.GAME_VIEW;

export function nodePolyfill (Node): void {
    if ((EDITOR && !IS_PREVIEW) || TEST) {
        Node.prototype._onPreDestroy = function (): boolean {
            const destroyByParent: boolean = this._onPreDestroyBase();
            if (!destroyByParent) {
                // ensure this node can reattach to scene by undo system
                // (simulate some destruct logic to make undo system work correctly)
                this._parent = null;
            }
            return destroyByParent;
        };
    }

    if (EDITOR || TEST) {
        Node.prototype._checkMultipleComp = function (ctor): boolean {
            const existing = this.getComponent(ctor._disallowMultiple);
            if (existing) {
                if (existing.constructor === ctor) {
                    throw Error(getError(3805, js.getClassName(ctor), this._name as string));
                } else {
                    throw Error(getError(3806, js.getClassName(ctor), this._name as string, js.getClassName(existing)));
                }
            }
            return true;
        };
        /**
         * @method _getDependComponent
         * @param {Component} depended
         * @return {Component[]}
         */
        Node.prototype._getDependComponent = function (depended): Component[] {
            const dependant: Component[] = [];
            for (let i = 0; i < this._components.length; i++) {
                const comp: Component = this._components[i];
                if (comp !== depended && comp.isValid && !legacyCC.Object._willDestroy(comp)) {
                    const reqComps = (comp.constructor as typeof Component)._requireComponent;
                    if (reqComps) {
                        if (Array.isArray(reqComps)) {
                            for (let i = 0; i < reqComps.length; i++) {
                                if (depended instanceof reqComps[i]) {
                                    dependant.push(comp);
                                }
                            }
                        } else if (depended instanceof reqComps) {
                            dependant.push(comp);
                        }
                    }
                }
            }
            return dependant;
        };
        /**
         * This api should only used by undo system
         * @method _addComponentAt
         * @param {Component} comp
         * @param {Number} index
         */
        Node.prototype._addComponentAt = function (comp: Component, index: number): void {
            if (this._objFlags & Destroying) {
                return error('isDestroying');
            }
            if (!(comp instanceof legacyCC.Component)) {
                return errorID(3811);
            }
            if (index > this._components.length) {
                return errorID(3812);
            }

            // recheck attributes because script may changed
            const ctor = comp.constructor as any;
            if (ctor._disallowMultiple) {
                if (!this._checkMultipleComp(ctor)) {
                    return undefined;
                }
            }

            // remove dependency and return directly by editor
            // const ReqComp = ctor._requireComponent;
            // if (ReqComp && !this.getComponent(ReqComp)) {
            //     if (index === this._components.length) {
            //         // If comp should be last component, increase the index because required component added
            //         ++index;
            //     }
            //     const depended = this.addComponent(ReqComp);
            //     if (!depended) {
            //         // depend conflicts
            //         return null;
            //     }
            // }

            comp.node = this;
            this._components.splice(index, 0, comp);
            if (EDITOR && !IS_PREVIEW && EditorExtends.Node && EditorExtends.Component) {
                const node = EditorExtends.Node.getNode(this._id as string);
                if (node) {
                    EditorExtends.Component.add(comp._id, comp);
                }
            }
            if (this._activeInHierarchy) {
                legacyCC.director._nodeActivator.activateComp(comp);
            }
            return undefined;
        };

        Node.prototype.onRestore = function (): void {
            // check activity state
            const shouldActiveNow = this._active && !!(this._parent && this._parent._activeInHierarchy);
            if (this._activeInHierarchy !== shouldActiveNow) {
                legacyCC.director._nodeActivator.activateNode(this, shouldActiveNow);
            }
        };
        Node.prototype._onRestoreBase = Node.prototype.onRestore;

        Node.prototype._registerIfAttached = function (register): void {
            if (!this._id) {
                // eslint-disable-next-line no-console
                console.warn(`Node(${this && this.name}}) is invalid or its data is corrupted.`);
                return;
            }
            if (EditorExtends.Node && EditorExtends.Component) {
                if (register) {
                    EditorExtends.Node.add(this._id as string, this);

                    for (let i = 0; i < this._components.length; i++) {
                        const comp = this._components[i];
                        if (!comp || !comp._id) {
                            // eslint-disable-next-line no-console
                            console.warn(`Component attached to node:${this.name} is corrupted`);
                        } else {
                            EditorExtends.Component.add(comp._id as string, comp);
                        }
                    }
                } else {
                    for (let i = 0; i < this._components.length; i++) {
                        const comp = this._components[i];
                        if (!comp || !comp._id) {
                            // eslint-disable-next-line no-console
                            console.warn(`Component attached to node:${this.name} is corrupted`);
                        } else {
                            EditorExtends.Component.remove(comp._id as string);
                        }
                    }

                    EditorExtends.Node.remove(this._id as string);
                }
            }

            const children = this._children;
            for (let i = 0, len = children.length; i < len; ++i) {
                const child = children[i];
                child._registerIfAttached!(register);
            }
        };
    }

    if (DEV) {
        // promote debug info
        js.get(Node.prototype as Record<string, any>, ' INFO ', function (this: any) {
            let path = '';
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            let node: any = this;
            while (node && !(node instanceof legacyCC.Scene)) {
                if (path) {
                    path = `${node.name}/${path}`;
                } else {
                    path = node.name;
                }
                node = node._parent;
            }
            return `${this.name}, path: ${path}`;
        });
    }
}
