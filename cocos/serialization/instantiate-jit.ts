/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

// Some helper methods for compile instantiation code

import { TEST } from 'internal:constants';
import { CCClass, isCCClassOrFastDefined, js, CCObjectFlags, isCCObject, cclegacy, flattenCodeArray } from '../core';

const Destroyed = CCObjectFlags.Destroyed;
const PersistentMask = CCObjectFlags.PersistentMask;
const DEFAULT = `${CCClass.Attr.DELIMETER}default`;
const IDENTIFIER_RE = CCClass.IDENTIFIER_RE;

const VAR = 'var ';
const LOCAL_OBJ = 'o';
const LOCAL_TEMP_OBJ = 't';
const LOCAL_ARRAY = 'a';
const LINE_INDEX_OF_NEW_OBJ = 0;

const DEFAULT_MODULE_CACHE = {
    'cc.ClickEvent': false,
    'cc.PrefabInfo': false,
};

const escapeForJS = CCClass.escapeForJS;

// HELPER CLASSES

// ('foo', 'bar')
// -> 'var foo = bar;'
class Declaration {
    public declare varName: any;
    public declare expression: any;

    constructor (varName, expression) {
        this.varName = varName;
        this.expression = expression;
    }

    public toString (): string {
        return `${VAR + this.varName}=${this.expression};`;
    }
}

// ('a =', 'var b = x')
// -> 'var b = a = x';
// ('a =', 'x')
// -> 'a = x';
function mergeDeclaration (statement, expression): any {
    if (expression instanceof Declaration) {
        return new Declaration(expression.varName, statement + expression.expression);
    } else {
        return statement + expression;
    }
}

// ('a', ['var b = x', 'b.foo = bar'])
// -> 'var b = a = x;'
// -> 'b.foo = bar;'
// ('a', 'var b = x')
// -> 'var b = a = x;'
// ('a', 'x')
// -> 'a = x;'
function writeAssignment (codeArray, statement, expression): void {
    if (Array.isArray(expression)) {
        expression[0] = mergeDeclaration(statement, expression[0]);
        codeArray.push(expression);
    } else {
        codeArray.push(`${mergeDeclaration(statement, expression)};`);
    }
}

// ('foo', 'bar')
// -> 'targetExpression.foo = bar'
// ('foo1', 'bar1')
// ('foo2', 'bar2')
// -> 't = targetExpression;'
// -> 't.foo1 = bar1;'
// -> 't.foo2 = bar2;'
class Assignments {
    public static pool: js.Pool<Assignments> = new js.Pool((obj: Assignments) => {
        obj._exps.length = 0;
        obj._targetExp = null;
    }, 1);

    private declare _exps: any[];
    private declare _targetExp: any;

    constructor (targetExpression?: any) {
        this._exps = [];
        this._targetExp = targetExpression;
    }

    setTargetExp (value: any): void {
        this._targetExp = value;
    }

    public append (key, expression): void {
        this._exps.push([key, expression]);
    }
    public writeCode (codeArray): void {
        let targetVar;
        if (this._exps.length > 1) {
            codeArray.push(`${LOCAL_TEMP_OBJ}=${this._targetExp};`);
            targetVar = LOCAL_TEMP_OBJ;
        } else if (this._exps.length === 1) {
            targetVar = this._targetExp;
        } else {
            return;
        }

        for (let i = 0; i < this._exps.length; i++) {
            const pair = this._exps[i];
            writeAssignment(codeArray, `${targetVar + getPropAccessor(pair[0])}=`, pair[1]);
        }
    }
}

// HACK: here we've changed the signature of get method
(Assignments.pool.get as any) = function get (this: js.Pool<Assignments>, targetExpression: any): Assignments {
    const cache: Assignments = this._get() || new Assignments();
    cache.setTargetExp(targetExpression);
    return cache;
};

// HELPER FUNCTIONS

function getPropAccessor (key: any): string {
    return IDENTIFIER_RE.test(key as string) ? (`.${key}`) : (`[${escapeForJS(key)}]`);
}

//

/*
 * Variables:
 * {Object[]} O - objs list
 * {Function[]} F - constructor list
 * {Node} [R] - specify an instantiated prefabRoot that all references to prefabRoot in prefab will redirect to
 * {Object} o - current creating object
 */
class Parser {
    public declare parent: any;
    public objsToClear_iN$t: any[] = []; // used to reset _iN$t variable
    public codeArray: string[] = [];
    // datas for generated code
    public objs: any[] = [];
    public funcs: any[] = [];
    //
    public declare funcModuleCache: any;

    // {String[]} - variable names for circular references,
    //              not really global, just local variables shared between sub functions
    public globalVariables: any[] = [];

    // incremental id for new global variables
    public globalVariableId: number = 0;

    // incremental id for new local variables
    public localVariableId: number = 0;
    public declare result: any;
    /*
    * @method constructor
    * @param {Object} obj - the object to parse
    * @param {Node} [parent]
    */
    constructor (obj, parent) {
        this.parent = parent;

        this.funcModuleCache = js.createMap();
        js.mixin(this.funcModuleCache as Record<string | number, any>, DEFAULT_MODULE_CACHE);

        // generate codeArray
        // if (Array.isArray(obj)) {
        //    this.codeArray.push(this.instantiateArray(obj));
        // }
        // else {
        this.codeArray.push(
            `${VAR + LOCAL_OBJ},${LOCAL_TEMP_OBJ};`,
            'if(R){',
            `${LOCAL_OBJ}=R;`,
            '}else{',
            `${LOCAL_OBJ}=R=new ${this.getFuncModule(obj.constructor, true)}();`,
            '}',
        );
        obj._iN$t = { globalVar: 'R' };
        this.objsToClear_iN$t.push(obj);
        this.enumerateObject(this.codeArray, obj);
        // }

        // generate code
        let globalVariablesDeclaration: string | string[] | undefined;
        if (this.globalVariables.length > 0) {
            globalVariablesDeclaration = `${VAR + this.globalVariables.join(',')};`;
        }
        const code = flattenCodeArray(['return (function(R){',
            globalVariablesDeclaration || [],
            this.codeArray,
            'return o;',
            '})']);

        // generate method and bind with objs
        // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
        this.result = Function('O', 'F', code)(this.objs, this.funcs);

        // if (TEST && !isPhantomJS) {
        //     console.log(code);
        // }

        // cleanup
        for (let i = 0, len = this.objsToClear_iN$t.length; i < len; ++i) {
            this.objsToClear_iN$t[i]._iN$t = null;
        }
        this.objsToClear_iN$t.length = 0;
    }

    public getFuncModule (func, usedInNew?): any {
        const clsName = js.getClassName(func);
        if (clsName) {
            const cache = this.funcModuleCache[clsName];
            if (cache) {
                return cache;
            } else if (cache === undefined) {
                let clsNameIsModule = clsName.indexOf('.') !== -1;
                if (clsNameIsModule) {
                    try {
                        // ensure is module
                        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
                        clsNameIsModule = (func === Function(`return ${clsName}`)());
                        if (clsNameIsModule) {
                            this.funcModuleCache[clsName] = clsName;
                            return clsName;
                        }
                    } catch (e) { /* empty */ }
                }
            }
        }
        let index = this.funcs.indexOf(func);
        if (index < 0) {
            index = this.funcs.length;
            this.funcs.push(func);
        }
        let res = `F[${index}]`;
        if (usedInNew) {
            res = `(${res})`;
        }
        this.funcModuleCache[clsName] = res;
        return res;
    }

    public getObjRef (obj): string {
        let index = this.objs.indexOf(obj);
        if (index < 0) {
            index = this.objs.length;
            this.objs.push(obj);
        }
        return `O[${index}]`;
    }

    public setValueType (codeArray, defaultValue, srcValue, targetExpression): void {
        // HACK: here we've changed the signature of get method.
        const assignments: Assignments = (Assignments.pool.get as any)(targetExpression);
        let fastDefinedProps = defaultValue.constructor.__props__;
        if (!fastDefinedProps) {
            fastDefinedProps = Object.keys(defaultValue as object);
        }
        for (let i = 0; i < fastDefinedProps.length; i++) {
            const propName = fastDefinedProps[i];
            const prop = srcValue[propName];
            if (defaultValue[propName] === prop) {
                continue;
            }
            const expression = this.enumerateField(srcValue, propName, prop);
            assignments.append(propName, expression);
        }
        assignments.writeCode(codeArray);
        Assignments.pool.put(assignments);
    }

    public enumerateCCClass (codeArray, obj, klass): void {
        const props = klass.__values__;
        const attrs = CCClass.Attr.getClassAttrs(klass);
        for (let p = 0; p < props.length; p++) {
            const key = props[p];
            const val = obj[key];
            let defaultValue = attrs[key + DEFAULT];
            if (equalsToDefault(defaultValue, val)) {
                continue;
            }
            if (typeof val === 'object' && val instanceof cclegacy.ValueType) {
                defaultValue = CCClass.getDefault(defaultValue);
                if (defaultValue && defaultValue.constructor === val.constructor) {
                    // fast case
                    const targetExpression = LOCAL_OBJ + getPropAccessor(key);
                    this.setValueType(codeArray, defaultValue, val, targetExpression);
                    continue;
                }
            }
            this.setObjProp(codeArray, obj, key, val);
        }
    }

    public instantiateArray (value): Declaration[] | '[]' {
        if (value.length === 0) {
            return '[]';
        }

        const arrayVar = LOCAL_ARRAY + (++this.localVariableId);
        const declaration = new Declaration(arrayVar, `new Array(${value.length})`);
        const codeArray = [declaration];

        // assign a _iN$t flag to indicate that this object has been parsed.
        value._iN$t = {
            globalVar: '',      // the name of declared global variable used to access this object
            source: codeArray,  // the source code array for this object
        };
        this.objsToClear_iN$t.push(value);

        for (let i = 0; i < value.length; ++i) {
            const statement = `${arrayVar}[${i}]=`;
            const expression = this.enumerateField(value, i, value[i]);
            writeAssignment(codeArray, statement, expression);
        }
        return codeArray;
    }

    public instantiateTypedArray (value): string | Declaration[] {
        const type = value.constructor.name;
        if (value.length === 0) {
            return `new ${type}`;
        }

        const arrayVar = LOCAL_ARRAY + (++this.localVariableId);
        const declaration = new Declaration(arrayVar, `new ${type}(${value.length})`);
        const codeArray = [declaration];

        // assign a _iN$t flag to indicate that this object has been parsed.
        value._iN$t = {
            globalVar: '',      // the name of declared global variable used to access this object
            source: codeArray,  // the source code array for this object
        };
        this.objsToClear_iN$t.push(value);

        for (let i = 0; i < value.length; ++i) {
            if (value[i] !== 0) {
                const statement = `${arrayVar}[${i}]=`;
                writeAssignment(codeArray, statement, value[i]);
            }
        }
        return codeArray;
    }

    public enumerateField (obj, key, value): any {
        if (typeof value === 'object' && value) {
            const _iN$t = value._iN$t;
            if (_iN$t) {
                // parsed
                let globalVar = _iN$t.globalVar;
                if (!globalVar) {
                    // declare a global var
                    globalVar = _iN$t.globalVar = `v${++this.globalVariableId}`;
                    this.globalVariables.push(globalVar);
                    // insert assignment statement to assign to global var
                    const line = _iN$t.source[LINE_INDEX_OF_NEW_OBJ];
                    _iN$t.source[LINE_INDEX_OF_NEW_OBJ] = mergeDeclaration(`${globalVar}=`, line);
                    // if (typeof line ==='string' && line.startsWith(VAR)) {
                    //     // var o=xxx -> var o=global=xxx
                    //     var LEN_OF_VAR_O = 5;
                    //     _iN$t.source[LINE_INDEX_OF_NEW_OBJ] = line.slice(0, LEN_OF_VAR_O) + '=' + globalVar + line.slice(LEN_OF_VAR_O);
                    // }
                }
                return globalVar;
            } else if (ArrayBuffer.isView(value)) {
                return this.instantiateTypedArray(value);
            } else if (Array.isArray(value)) {
                return this.instantiateArray(value);
            } else {
                return this.instantiateObj(value);
            }
        } else if (typeof value === 'function') {
            return this.getFuncModule(value);
        } else if (typeof value === 'string') {
            return escapeForJS(value);
        } else {
            if (key === '_objFlags' && isCCObject(obj)) {
                value &= PersistentMask;
            }
            return value;
        }
    }

    public setObjProp (codeArray, obj, key, value): void {
        const statement = `${LOCAL_OBJ + getPropAccessor(key)}=`;
        const expression = this.enumerateField(obj, key, value);
        writeAssignment(codeArray, statement, expression);
    }

    // codeArray - the source code array for this object
    public enumerateObject (codeArray, obj): void {
        const klass: Constructor<unknown> = obj.constructor;
        if (isCCClassOrFastDefined(klass)) {
            this.enumerateCCClass(codeArray, obj, klass);
        } else {
            // primitive javascript object
            for (const key in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, key)
                    || (key.charCodeAt(0) === 95 && key.charCodeAt(1) === 95   // starts with "__"
                    && key !== '__type__')
                ) {
                    continue;
                }
                const value = obj[key];
                if (typeof value === 'object' && value && value === obj._iN$t) {
                    continue;
                }
                this.setObjProp(codeArray, obj, key, value);
            }
        }
    }

    public instantiateObj (obj): any {
        if (obj instanceof cclegacy.ValueType) {
            return CCClass.getNewValueTypeCode(obj);
        }
        if (obj instanceof cclegacy.Asset) {
            // register to asset list and just return the reference.
            return this.getObjRef(obj);
        }
        if (obj._objFlags & Destroyed) {
            // the same as cc.isValid(obj)
            return null;
        }

        let createCode;
        const ctor: Constructor<unknown> = obj.constructor;
        if (isCCClassOrFastDefined(ctor)) {
            if (this.parent) {
                if (this.parent instanceof cclegacy.Component) {
                    if (obj instanceof cclegacy.Node || obj instanceof cclegacy.Component) {
                        return this.getObjRef(obj);
                    }
                } else if (this.parent instanceof cclegacy.Node) {
                    if (obj instanceof cclegacy.Node) {
                        if (!obj.isChildOf(this.parent)) {
                            // should not clone other nodes if not descendant
                            return this.getObjRef(obj);
                        }
                    } else if (obj instanceof cclegacy.Component) {
                        if (!obj.node?.isChildOf(this.parent)) {
                            // should not clone other component if not descendant
                            return this.getObjRef(obj);
                        }
                    }
                }
            }
            createCode = new Declaration(LOCAL_OBJ, `new ${this.getFuncModule(ctor, true)}()`);
        } else if (ctor === Object) {
            createCode = new Declaration(LOCAL_OBJ, '{}');
        } else if (!ctor) {
            createCode = new Declaration(LOCAL_OBJ, 'Object.create(null)');
        } else {
            // do not clone unknown type
            return this.getObjRef(obj);
        }

        const codeArray = [createCode];

        // assign a _iN$t flag to indicate that this object has been parsed.
        obj._iN$t = {
            globalVar: '',      // the name of declared global variable used to access this object
            source: codeArray,  // the source code array for this object
            // propName: '',     // the propName this object defined in its source code,
            //                  // if defined, use LOCAL_OBJ.propName to access the obj, else just use o
        };
        this.objsToClear_iN$t.push(obj);

        this.enumerateObject(codeArray, obj);
        return ['(function(){',
            codeArray,
            'return o;})();'];
    }
}

export function equalsToDefault (def: any, value: any): boolean {
    if (typeof def === 'function') {
        try {
            def = def();
        } catch (e) {
            return false;
        }
    }
    if (def === value) {
        return true;
    }
    if (def && value
        && typeof def === 'object' && typeof value === 'object'
        && def.constructor === value.constructor
    ) {
        if (def instanceof cclegacy.ValueType) {
            if (def.equals(value)) {
                return true;
            }
        } else if (Array.isArray(def)) {
            return def.length === 0 && value.length === 0;
        } else if (def.constructor === Object) {
            return js.isEmptyObject(def) && js.isEmptyObject(value);
        }
    }
    return false;
}

export function compile (node): any {
    const root = (node instanceof cclegacy.Node) && node;
    const parser = new Parser(node, root);
    return parser.result;
}

if (TEST) {
    cclegacy._Test.IntantiateJit = {
        equalsToDefault,
        compile,
    };
}
