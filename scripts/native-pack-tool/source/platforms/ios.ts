import { execSync, spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as ps from 'path';
import * as os from 'os';
import { CocosParams } from '../base/default';
import { cchelper, toolHelper, Paths } from "../utils";
import { MacOSPackTool } from "./mac-os";

export interface IOrientation {
    landscapeLeft: boolean;
    landscapeRight: boolean;
    portrait: boolean;
    upsideDown: boolean;
}

export interface IOSParams {
    orientation: IOrientation;
    bundleId: string;
    skipUpdateXcodeProject: boolean;
    teamid: string;

    iphoneos: boolean;
    simulator?: boolean;
}

export class IOSPackTool extends MacOSPackTool {
    params!: CocosParams<IOSParams>;

    async create() {
        await this.copyCommonTemplate();
        await this.copyPlatformTemplate();
        await this.generateCMakeConfig();
        await this.excuteCocosTemplateTask();

        await this.setOrientation();
        await this.encrypteScripts();
        return true;
    }

    protected async setOrientation() {
        const orientation = this.params.platformParams.orientation;
        const infoPlist = cchelper.join(this.paths.platformTemplateDirInPrj, 'Info.plist');
        if (fs.existsSync(infoPlist)) {
            const orientations: string[] = [];
            if (orientation.landscapeRight) {
                orientations.push('UIInterfaceOrientationLandscapeRight');
            }
            if (orientation.landscapeLeft) {
                orientations.push('UIInterfaceOrientationLandscapeLeft');
            }
            if (orientation.portrait) {
                orientations.push('UIInterfaceOrientationPortrait');
            }
            if (orientation.upsideDown) {
                orientations.push('UIInterfaceOrientationPortraitUpsideDown');
            }
            const replacement: string = `\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n${orientations.map((x) => `\t\t<string>${x}</string>\n`).join('')}\n\t</array>`;
            const newlines: string[] = [];
            const lines = (await fs.readFile(infoPlist, 'utf8')).split('\n');
            let foundKey = 0;
            let foundValues = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('UISupportedInterfaceOrientations') >= 0) {
                    foundKey += 1;
                    i++;
                    while (i < lines.length && lines[i].indexOf('</array>') < 0) {
                        i++;
                    }
                    if (lines[i].indexOf('</array>') >= 0) {
                        foundValues += 1;
                    }
                    newlines.push(replacement);
                } else {
                    newlines.push(lines[i]);
                }
            }
            if (foundKey !== 1 || foundValues !== 1) {
                console.error(`error occurs while setting orientations for iOS`);
            } else {
                await fs.writeFile(infoPlist, newlines.join('\n'));
            }
        }
    }

    async generate() {

        if(!await this.checkIfXcodeInstalled()) {
            console.error(`Please check if Xcode is installed.`);
        }

        if(this.shouldSkipGenerate()) {
            return false;
        }
        const nativePrjDir = this.paths.nativePrjDir;
        if (!fs.existsSync(nativePrjDir)) {
            cchelper.makeDirectoryRecursive(nativePrjDir);
        }

        const ext: string[] = ['-DCMAKE_CXX_COMPILER=clang++', '-DCMAKE_C_COMPILER=clang'];

        this.appendCmakeCommonArgs(ext);

        const ver = toolHelper.getXcodeMajorVerion() >= 12 ? "12" : "1";
        await toolHelper.runCmake(['-S', `"${this.paths.platformTemplateDirInPrj}"`, '-GXcode', `-B"${nativePrjDir}"`, '-T', `buildsystem=${ver}`,
                                    '-DCMAKE_SYSTEM_NAME=iOS'].concat(ext));

        await this.modifyXcodeProject();

        return true;
    }

    async make() {
        const options = this.params.platformParams;
        if (options.iphoneos && !options.teamid) {
            throw new Error("Error: Try to build iphoneos application but no developer team id was given!");
        }
        const nativePrjDir = this.paths.nativePrjDir;

        const projName = this.params.projectName;
        const os = require('os');
        const cpus = os.cpus();
        const model = (cpus && cpus[0] && cpus[0].model) ? cpus[0].model : '';
        // check mac architecture
        // const platform = /Apple/.test(model) ? `-arch arm64` : `-arch x86_64`;
        // get xcode workspace
        const regex = new RegExp(projName + '.xcworkspace$');
        const files = fs.readdirSync(nativePrjDir);
        const xcodeWorkSpace = files.find((file) => regex.test(file));
        if (xcodeWorkSpace) {
            const workspaceCompileParams = `-workspace ${nativePrjDir}/${xcodeWorkSpace} -scheme ALL_BUILD `
                + `-parallelizeTargets -quiet -configuration ${this.params.debug ? 'Debug' : 'Release'} `
                + `-hideShellScriptEnvironment -allowProvisioningUpdates SYMROOT=${nativePrjDir}`;
            if (options.simulator) {
                await toolHelper.runXcodeBuild([`-destination generic/platform='iOS Simulator'`,
                    workspaceCompileParams, `CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`]);
            }
            if (options.iphoneos) {
                await toolHelper.runXcodeBuild([`-destination generic/platform='iOS'`,
                    workspaceCompileParams, `DEVELOPMENT_TEAM=${options.teamid}`]);
            }
        }
        else {
            const projCompileParams = `--build "${nativePrjDir}" --config ${this.params.debug ? 'Debug' : 'Release'} -- -allowProvisioningUpdates -quiet`;
            if (options.iphoneos) {
                await toolHelper.runCmake([projCompileParams, '-sdk', 'iphoneos', `-arch arm64`]);
            }
            if (options.simulator) {
                await toolHelper.runCmake([projCompileParams, '-sdk', 'iphonesimulator', `-arch x86_64`]); //force compile x86_64 app for iPhone simulator on Mac
            }
        }
        return true;
    }

    // ------------------- run ------------------ //
    async run(): Promise<boolean> {
        return await this.runIosSimulator();
        // todo:真机暂时不支持
        // if (this.plugin.enableIosSimulator()) {
        // } else {
        //     return this.runIosDevice();
        // }
    }

    selectSimulatorId(): string {
        const iphones =
            execSync('xcrun xctrace list devices')
                .toString('utf-8')
                .split('\n')
                .filter(
                    (x) => x.startsWith('iPhone') && x.indexOf('Simulator') >= 0);
        const exact = (l: string) => {
            const p = l.split('(')[0].substring(6);
            const m = l.match(/\((\d+\.\d+)\)/);
            if (m) {
                return parseInt(m[1]) + m.index!;
            }
            return parseInt(p) * 100 + l.length;
        };
        const ret = iphones.filter((x) => x.indexOf('Apple Watch') < 0).sort((a, b) => {
            return exact(b) - exact(a);
        })[0];
        const m = ret.match(/\(([A-Z0-9-]+)\)/);
        console.log(`selected simualtor ${ret}`);
        return m![1];
    }

    selectIosDevices(): string[] {
        const lines = execSync(`xcrun simctl list`)
            .toString('utf-8')
            .split('\n');

        const readDevices = (lines: string[], idx: number):
            number => {
            while (idx < lines.length && !lines[idx].match(/== Devices ==/)) {
                idx++;
            }
            return idx < lines.length ? idx : -1;
        };

        const readIOSDevices = (list: string[], idx: number): string[] => {
            const ret: string[] = [];
            while (!list[idx].match(/-- iOS [^ ]* --/)) {
                idx++;
            }
            if (list[idx].indexOf('iOS') < 0) {
                console.error(`can not find iOS section!`);
                return ret;
            }
            idx++;
            while (list[idx].startsWith(' ')) {
                ret.push(list[idx++]);
            }
            return ret.map((x) => x.trim());
        };

        const idx = readDevices(lines, 0);
        if (idx < 0) {
            console.error(`can not find devices section!`);
            return [];
        }

        const list = readIOSDevices(lines, idx);
        const ret = list.filter((x) => x.startsWith('iPhone'));
        return ret;
    }

    readBundleId(): string | null {
        const prjName = this.getExcutableNameOrDefault();
        const cmakeTmpDir =
            fs.readdirSync(ps.join(this.paths.nativePrjDir, 'CMakeFiles'))
                .filter((x) => x.startsWith(prjName))[0];

        const infoPlist = ps.join(
            this.paths.nativePrjDir, 'CMakeFiles', cmakeTmpDir, 'Info.plist');
        if (fs.existsSync(infoPlist)) {
            const lines = fs.readFileSync(infoPlist).toString('utf-8').split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].match(/CFBundleIdentifier/)) {
                    i++;
                    while (!lines[i].match(/<string>/)) {
                        i++;
                    }
                    const m = lines[i].match(/<string>([^<]*)<\/string>/);
                    return m![1];
                }
            }
        } else {
            throw new Error(`Info.plist not found ${infoPlist}`)
        }
        return null;
    }

    queryIosDevice(): string | null {
        const lines = execSync(`xcrun xctrace list devices`)
            .toString('utf-8')
            .split('\n');
        const ret: string[] = [];
        // skip first line
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].indexOf('Simulator') >= 0) {
                continue;
            } else if (lines[i].match(/iPhone|iPad|iPod/)) {
                ret.push(lines[i]);
            }
        }
        if (ret.length > 0) {
            console.log(`select ios device ${ret[0]}`);
            return ret[0].match(/\(([A-Z0-9-]+)\)/)![1];
        }
        return null;
    }

    async runIosDevice(): Promise<boolean> {
        const buildDir = this.paths.nativePrjDir;
        const foundApps = execSync(`find "${buildDir}" -name "*.app"`)
            .toString('utf-8')
            .split('\n')
            .filter((x) => x.trim().length > 0);
        const deviceId = this.queryIosDevice();
        if (!deviceId) {
            console.error(`no connected device found!`);
            return false;
        }
        if (foundApps.length > 0) {
            const cwd = fs.mkdtempSync(ps.join(os.tmpdir(), this.params.projectName));
            await cchelper.runCmd(
               'xcrun', ['xctrace', 'record', '--template', `'App Launch'`, '--device', `'${deviceId}'`, '--launch', '--', `"${foundApps[0]}"`],
               false, cwd);
        }
        return true;
    }

    async runIosSimulator(): Promise<boolean> {
        const simId = this.selectSimulatorId();
        const buildDir = this.paths.nativePrjDir;
        const bundleId = this.readBundleId();
        console.log(` - build dir ${buildDir} - simId ${simId}`);
        console.log(` - bundle id ${bundleId}`);

        const foundApps = execSync(`find "${buildDir}" -name "*.app"`)
            .toString('utf-8')
            .split('\n')
            .filter((x) => x.trim().length > 0);

        if (foundApps.length > 0 && bundleId) {
            await cchelper.runCmd('xcrun', ['simctl', 'boot', simId], true);
            await cchelper.runCmd(
                'open', ['`xcode-select -p`/Applications/Simulator.app'], true);
            await cchelper.runCmd('xcrun', ['simctl', 'boot', simId], true);
            await cchelper.runCmd(
                'xcrun', ['simctl', 'install', simId, `"${foundApps[0].trim()}"`], false);
            await cchelper.runCmd(
                'xcrun', ['simctl', 'launch', simId, `"${bundleId}"`], false);
        } else {
            throw new Error(`[iOS run] App or BundleId is not found!`);
        }
        return false;
    }
}
