import { CocosParams, NativePackTool } from "../base/default";
import * as fs from 'fs-extra';
import * as ps from 'path';
import * as os from 'os';
import { cchelper, toolHelper, Paths } from "../utils";
import { cocosConfig } from "../cocosConfig";
import { spawn } from "child_process";

export interface IWindowsParam {
    targetPlatform: 'x64';
}

export class WindowsPackTool extends NativePackTool {
    params: CocosParams<IWindowsParam>;
    constructor(params: CocosParams<IWindowsParam>) {
        super(params);
        this.params = params;
    }

    async create() {
        // 拷贝引擎原生模板到项目的 native 目录下
        await fs.copy(this.paths.commonDirInCocos, this.paths.commonDirInPrj);
        return true;
    }

    async generate() {
        const buildDir = this.paths.buildDir;

        const cmakePath = ps.join(this.paths.platformTemplateDirInPrj, 'CMakeLists.txt');
        if (!fs.existsSync(cmakePath)) {
            throw new Error(`CMakeLists.txt not found in ${cmakePath}`);
        }

        if (!fs.existsSync(buildDir)) {
            cchelper.makeDirectoryRecursive(buildDir);
        }

        let generateArgs: string[] = [];
        if (!fs.existsSync(ps.join(buildDir, 'CMakeCache.txt'))) {
            const g = this.getCmakeGenerator();
            // const g = '';
            if (g) {
                const optlist = cocosConfig.cmake.windows.generators.filter((x) => x.G.toLowerCase() === g.toLowerCase());
                if (optlist.length === 0) {
                    generateArgs.push(`-G"${g}"`);
                } else {
                    generateArgs.push('-A', this.params.platformParams.targetPlatform);
                }
            } else {
                generateArgs = generateArgs.concat(await this.windowsSelectCmakeGeneratorArgs());
            }
            this.appendCmakeResDirArgs(generateArgs);
        }
        await toolHelper.runCmake([`-S"${cchelper.fixPath(this.paths.platformTemplateDirInPrj)}"`, `-B"${cchelper.fixPath(this.paths.buildDir)}"`].concat(generateArgs));
        return true;
    }

    async compile() {
        const buildDir = this.paths.buildDir;
        await toolHelper.runCmake(['--build', `"${cchelper.fixPath(buildDir)}"`, '--config', this.params.debug ? 'Debug' : 'Release', '--', '-verbosity:quiet']);
        return true;
    }

    async windowsSelectCmakeGeneratorArgs(): Promise<string[]> {

        console.log(`selecting visual studio generator ...`);
        const visualstudioGenerators = cocosConfig.cmake.windows.generators;

        const testProjDir = await fs.mkdtemp(ps.join(os.tmpdir(), 'cmakeTest_'));
        const testCmakeListsPath = ps.join(testProjDir, 'CMakeLists.txt');
        const testCppFile = ps.join(testProjDir, 'test.cpp');
        {
            const cmakeContent = `
            cmake_minimum_required(VERSION 3.8)
            set(APP_NAME test-cmake)
            project(\${APP_NAME} CXX)
            add_library(\${APP_NAME} test.cpp)
            `;
            const cppSrc = `
            #include<iostream>
            int main(int argc, char **argv)
            {
                std::cout << "Hello World" << std::endl;
                return 0;
            }
            `;
            await fs.writeFile(testCmakeListsPath, cmakeContent);
            await fs.writeFile(testCppFile, cppSrc);
        }

        const tryRunCmakeWithArguments = (args: string[], workdir: string) => {
            return new Promise<boolean>((resolve, reject) => {
                const cp = spawn(Paths.cmakePath, args, {
                    cwd: workdir,
                    env: process.env,
                    shell: true,
                });
                cp.on('close', (code, sig) => {
                    if (code !== 0) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                });
            });
        };
        const availableGenerators: string[] = [];
        for (const cfg of visualstudioGenerators) {
            const buildDir = ps.join(testProjDir, `build_${cfg.G.replace(/ /g, '_')}`);
            const args: string[] = [`-S"${testProjDir}"`, `-G"${cfg.G}"`, `-B"${buildDir}"`];
            args.push('-A', this.params.platformParams.targetPlatform);
            await fs.mkdir(buildDir);
            if (await tryRunCmakeWithArguments(args, buildDir)) {
                availableGenerators.push(cfg.G);
                break;
            }
            await cchelper.removeDirectoryRecursive(buildDir);
        }
        await cchelper.removeDirectoryRecursive(testProjDir);

        const ret: string[] = [];
        if (availableGenerators.length === 0) {
            return []; // use cmake default option -G
        }
        const opt = visualstudioGenerators.filter((x) => x.G === availableGenerators[0])[0];
        ret.push('-A', this.params.platformParams.targetPlatform);
        console.log(` using ${opt.G}`);
        return ret;
    }

    // TODO 用户传入的 visual studio 版本
    getCmakeGenerator() {
        return '';
    }
}
