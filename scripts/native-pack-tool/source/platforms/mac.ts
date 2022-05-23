import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as ps from 'path';
import { CocosParams } from '../base/default';
import { cchelper, toolHelper, Paths } from "../utils";
import { MacOSPackTool } from "./mac-os";

export interface IMacParams {
    bundleId: string;
    skipUpdateXcodeProject: boolean;
}

export class MacPackTool extends MacOSPackTool {
    params!: CocosParams<IMacParams>;

    async create(): Promise<boolean> {
        await super.create();
        await this.encrypteScripts();
        await this.generate();
        return true;
    }

    async generate() {
        const nativePrjDir = this.paths.nativePrjDir;

        if (!fs.existsSync(nativePrjDir)) {
            cchelper.makeDirectoryRecursive(nativePrjDir);
        }

        const ver = toolHelper.getXcodeMajorVerion() >= 12 ? "12" : "1";
        const cmakeArgs = ['-S', `${this.paths.platformTemplateDirInPrj}`, '-GXcode', '-T', `buildsystem=${ver}`,
                           `-B${nativePrjDir}`, '-DCMAKE_SYSTEM_NAME=Darwin'];
        this.appendCmakeResDirArgs(cmakeArgs);

        await toolHelper.runCmake(cmakeArgs);

        this.skipUpdateXcodeProject();
        return true;
    }

    async make() {
        const nativePrjDir = this.paths.nativePrjDir;

        const platform = this.isAppleSilicon() ? `-arch arm64` : `-arch x86_64`;
        await toolHelper.runCmake(["--build", `${nativePrjDir}`, "--config", this.params.debug ? 'Debug' : 'Release', "--", "-quiet", platform]);
        return true;
    }

    async run(): Promise<boolean> {
        await this.macRun(this.params.projectName);
        return true;
    }

    private macOpen(app: string) {
        console.log(`open ${app}`);
        const cp = spawn(`open`, [app], {
            shell: true,
            env: process.env,
        });
        cp.stdout.on('data', (data) => {
            console.log(`[open app] ${data}`);
        });
        cp.stderr.on(`data`, (data) => {
            console.error(`[open app error] ${data}`);
        });
        cp.on('close', (code, sig) => {
            console.log(`${app} exit with ${code}, sig: ${sig}`);
        });
    }

    private macRun(projectName?: string) {
        const debugDir = ps.join(
            this.paths.nativePrjDir,
            this.params.debug ? 'Debug' : 'Release');
        if (!fs.existsSync(debugDir)) {
            throw new Error(`[mac run] ${debugDir} is not exist!`);
        }
        let appPath: string;
        if (projectName) {
            appPath = ps.join(debugDir, `${projectName}-desktop.app`);
            if (fs.existsSync(appPath)) {
                this.macOpen(appPath);
                return;
            }
        }

        const appList = fs.readdirSync(debugDir).filter((x) => x.endsWith('.app'));
        if (appList.length === 1) {
            this.macOpen(ps.join(debugDir, appList[0]));
            return;
        }
        throw new Error(`found ${appList.length} apps, failed to open.`);
    }
}
