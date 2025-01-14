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

type BeginContactCallback = (contact: number) => void;
type EndContactCallback = (contact: number) => void;
type PreSolveCallback = (contact: number, oldManifold: number) => void;
type PostSolveCallback = (contact: number, impulse: number) => void;

export class PhysicsContactListener {
    static _BeginContact: BeginContactCallback | null = null;
    static _EndContact: EndContactCallback | null = null;
    static _PreSolve: PreSolveCallback | null = null;
    static _PostSolve: PostSolveCallback | null = null;

    static BeginContact (contact: number): void {
        if (this._BeginContact) {
            this._BeginContact(contact);
        }
    }

    static EndContact (contact: number): void {
        if (this._EndContact) {
            this._EndContact(contact);
        }
    }

    static PreSolve (contact: number, oldManifold: number): void {
        if (this._PreSolve) {
            this._PreSolve(contact, oldManifold);
        }
    }

    static PostSolve (contact: number, impulse: number): void {
        if (this._PostSolve) {
            this._PostSolve(contact, impulse);
        }
    }

    static callback = {
        BeginContact (contact: number): void {
            PhysicsContactListener.BeginContact(contact);
        },
        EndContact (contact: number): void {
            PhysicsContactListener.EndContact(contact);
        },
        PreSolve (contact: number, oldManifold: number): void {
            PhysicsContactListener.PreSolve(contact, oldManifold);
        },
        PostSolve (contact: number, impulse: number): void {
            PhysicsContactListener.PostSolve(contact, impulse);
        },
    };
}
