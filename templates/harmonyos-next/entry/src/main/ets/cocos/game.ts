/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/
import importMap from './src/<%= importMapUrl%>'
const commonJSModuleMap: Record<string, Function> = {
    '/<%= applicationUrl%>'() { return import('./<%= applicationUrl%>'); },
<% if (chunkBundleUrl) { %>
    '/src/chunks/<%= chunkBundleUrl%>'() { return import('./src/chunks/<%= chunkBundleUrl%>') },
<% }  %> 
<% if (useAotOptimization) {%>
    '/src/<%= systemCCUrl%>' () { return import('./src/<%= systemCCUrl%>'); },
<%} else {%>
<% for (var i = 0; i < ccUrls.length; i++) {%> 
    '/src/cocos-js/<%=ccUrls[i]%>' () { return import('./src/cocos-js/<%=ccUrls[i]%>'); },
<% }} %>
<% for (var j = 0; j < bundleJsList.length; j++) {%> 
    'assets/<%=bundleJsList[j]%>' () { return import('./assets/<%=bundleJsList[j]%>'); },
<% } %>
<% for (var k = 0; k < pluginsJsList.length; k++) {%> 
    '<%=pluginsJsList[k]%>' () { return import('./<%=pluginsJsList[k]%>'); },
<% } %>
    '/src/settings.js' () { return import('./src/settings.js'); },
}
export function loadModule (name: string) {
    const moduleExecutor = commonJSModuleMap[name];
    return moduleExecutor?.();
}
declare const require: any;
declare const System: any;

// fix undefined console.time and console.timeEnd
const startTimeList = {};
// @ts-ignore
console.time = function (tag) {
    // @ts-ignore
    startTimeList[tag] = Date.now();
};
// @ts-ignore
console.timeEnd = function (tag) {
    // @ts-ignore
    console.log(tag + ' ' + (Date.now() - startTimeList[tag]));
    delete startTimeList[tag];
};

// @ts-ignore
//const onTouch = () => new Promise<void>(resolve => jsb.onTouchStart = function () {
//    log('promise onTouch')
//    resolve();
//})

const onTouch = () => new Promise<void>(resolve => resolve())

export function launchEngine (): Promise<void> {
    // @ts-ignore
    window.global = window;
    // @ts-ignore
    window.oh = window.oh || {};
    return import('./oh-adapter/sys-ability-polyfill.js').then(() => {
            // @ts-ignore
            window.oh.loadModule = loadModule;
            return import('./jsb-adapter/web-adapter.js').then(() => {
                return import('./src/<%= systemBundleUrl%>').then(() => {
                    System.warmup({
                        importMap,
                        importMapUrl: './src/<%= importMapUrl%>',
                        defaultHandler: (urlNoSchema: string) => {
                            console.info('urlNoSchema ', urlNoSchema);
                            return loadModule(urlNoSchema);
                        },
                    });
                    return System.import('./<%= applicationUrl%>').then(({ Application }) => {
                        return new Application();
                    }).then((application) => {
                        <% if(useAotOptimization) { %>
                        return import('./src/cocos-js/cc').then(() => {
                        <% } %>
                            return System.import('cc').then((cc) => {
                                return import('./jsb-adapter/engine-adapter.js').then(() => {
                                    cc.macro.CLEANUP_IMAGE_CACHE = false;
                                    return application.init(cc);
                                });
                            }).then(() => {
                                return application.start();
                            });
                        <% if(useAotOptimization) { %>
                        });
                        <% } %>
                    });
                });
            });             
    }).catch((e: any) => {
        console.error('imported failed', e.message, e.stack)
    });
}


