﻿/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

'use strict';

const gulp = require('gulp');
const fs = require('fs-extra');
const ps = require('path');
const cp = require('child_process');

gulp.task('build-debug-infos', async () => {
    return await Promise.resolve(require('./gulp/tasks/buildDebugInfos')());
});

gulp.task('build-code', gulp.series('build-debug-infos', async () => {
    const cli = require.resolve('@cocos/build-engine/dist/cli');
    const out = ps.join('bin', 'dev');
    await fs.ensureDir(out);
    await fs.emptyDir(out);
    return cp.spawn('node', [
        cli,
        `--engine=${__dirname}`,
        '--sourcemap',
        '--buildmode=universal',
        '--platform=HTML5',
        '--physics=cannon',
        `--out=${out}`,
    ], {
        shell: true,
        stdio: 'inherit',
        cwd: __dirname,
    });
}));

gulp.task('build-code-minified', gulp.series('build-debug-infos', async () => {
    const cli = require.resolve('@cocos/build-engine/dist/cli');
    const out = ps.join('bin', 'dev-minified');
    await fs.ensureDir(out);
    await fs.emptyDir(out);
    return cp.spawn('node', [
        cli,
        `--engine=${__dirname}`,
        '--compress',
        '--sourcemap',
        '--buildmode=universal',
        '--platform=HTML5',
        '--physics=cannon',
        `--out=${out}`,
    ], {
        shell: true,
        stdio: 'inherit',
        cwd: __dirname,
    });
}));

gulp.task('build-declarations', async () => {
    const outDir = ps.join('bin', '.declarations');
    await fs.emptyDir(outDir);
    return require('./scripts/generate-declarations/generate-declarations.js').generate({
        outDir,
    });
});

gulp.task('build', gulp.parallel('build-code-minified', 'build-declarations'));

gulp.task('code-check', () => {
    return cp.spawn('tsc', ['--noEmit'], {
        shell: true,
        stdio: 'inherit',
        cwd: __dirname,
    });
});

gulp.task('unit-tests', () => {
    return cp.spawn(`jest`, [], {
        shell: true,
        stdio: 'inherit',
        cwd: __dirname,
    });
});

gulp.task('test', gulp.series('code-check', 'unit-tests'));

gulp.task('build-api-json', async () => {
    const APIBuilder = require('./gulp/util/api-docs-build');
    return await Promise.resolve(APIBuilder.generateJson());
});

gulp.task('build-3d-api', async () => {
    const APIBuilder = require('./gulp/util/api-docs-build');
    return await Promise.resolve(APIBuilder.generateHTMLWithLocalization());
});