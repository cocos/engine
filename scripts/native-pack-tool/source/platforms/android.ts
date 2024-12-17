import * as fs from 'fs-extra';
import * as ps from 'path';
import { CocosParams, NativePackTool } from "../base/default";
import { cchelper, Paths } from "../utils";
import * as URL from 'url';
import { spawn, spawnSync } from 'child_process';
import * as xml2js from 'xml2js';
import { platform } from 'os';

export interface IOrientation {
    landscapeLeft: boolean;
    landscapeRight: boolean;
    portrait: boolean;
    upsideDown: boolean;
}

export interface IAndroidParams {
    packageName: string;
    sdkPath: string;
    ndkPath: string;
    javaHome: string;
    javaPath: string;
    maxAspectRatio: string;
    remoteUrl?: string;
    apiLevel: number;
    appABIs: string[];
    keystorePassword: string;
    keystoreAlias: string;
    keystoreAliasPassword: string;
    keystorePath: string;
    inputSDK: boolean;

    orientation: IOrientation;
    appBundle: boolean;
    resizeableActivity: boolean;
}

const DefaultAPILevel = 27;
export class AndroidPackTool extends NativePackTool {
    params!: CocosParams<IAndroidParams>;

    protected firstTimeBuild: boolean = false;

    protected async copyPlatformTemplate() {
        // 原生工程不重复拷贝 TODO 复用前需要做版本检测
        if (!fs.existsSync(this.paths.nativePrjDir)) {
            // 拷贝 lite 仓库的 templates/android/build 文件到构建输出目录
            await fs.copy(ps.join(this.paths.nativeTemplateDirInCocos, this.params.platform, 'build'), this.paths.nativePrjDir, { overwrite: false });
            this.firstTimeBuild = true;
        } else {
            this.firstTimeBuild = false;
        }
        // 原生工程不重复拷贝 TODO 复用前需要做版本检测
        if (!fs.existsSync(this.paths.platformTemplateDirInPrj)) {
            // 拷贝 lite 仓库的 templates/android/template 文件到构建输出目录
            await fs.copy(ps.join(this.paths.nativeTemplateDirInCocos, this.params.platform, 'template'), this.paths.platformTemplateDirInPrj, { overwrite: false });
            this.writeEngineVersion();
        } else {
            this.validateNativeDir();
        }
    }

    protected validatePlatformDirectory(missing: string[]): void {
        const srcDir = ps.join(this.paths.nativeTemplateDirInCocos, this.params.platform, 'template');
        const dstDir = this.paths.platformTemplateDirInPrj;
        this.validateDirectory(srcDir, dstDir, missing);
    }

    async create() {
        await this.copyCommonTemplate();
        await this.copyPlatformTemplate();
        await this.generateCMakeConfig();
        await this.excuteCocosTemplateTask();

        await this.updateAndroidGradleValues();
        await this.updateManifest();
        await this.encrypteScripts();
        await this.generateAppNameValues();
        return true;
    }

    async make() {
        const options = this.params.platformParams;

        if (options.javaHome) {
            if (process.env.JAVA_HOME !== options.javaHome) {
                process.env.JAVA_HOME = options.javaHome;
                console.log(`Update JAVA_HOME to ${options.javaHome}`);
            }
            if (!process.env.PATH!.startsWith(options.javaHome)) {
                const sep = platform() === 'win32' ? ';' : ':';
                process.env.PATH = ps.join(options.javaHome, 'bin') + sep + process.env.PATH;
                console.log(`Add JAVA_HOME/bin to PATH`);
            }
        }

        const projDir: string = this.paths.nativePrjDir;
        if (!fs.existsSync(projDir)) {
            throw new Error(`dir ${projDir} not exits`);
        }
        let gradle = 'gradlew';
        if (process.platform === 'win32') {
            gradle += '.bat';
        } else {
            gradle = './' + gradle;
        }

        let buildMode = '';
        const outputMode = this.params.debug ? 'Debug' : 'Release';

        // compile android
        buildMode = `${this.projectNameASCII()}:assemble${outputMode}`;

        // pushd
        const originDir = process.cwd();
        try {
            process.chdir(projDir);
            await cchelper.runCmd(gradle, [buildMode], false, projDir);
        } catch (e) {
            throw e;
        } finally {
            // popd
            process.chdir(originDir);
        }


        return await this.copyToDist();
    }

    /**
     * Deprecated, only be compatible with historical packaging tools
     */
    protected async setOrientation() {
        const cfg = this.params.platformParams.orientation;
        const manifestPath = cchelper.join(this.paths.platformTemplateDirInPrj, 'app/AndroidManifest.xml');
        const instantManifestPath = cchelper.join(this.paths.platformTemplateDirInPrj, 'instantapp/AndroidManifest.xml');
        if (fs.existsSync(manifestPath) && fs.existsSync(instantManifestPath)) {
            const pattern = /android:screenOrientation="[^"]*"/;
            let replaceString = 'android:screenOrientation="unspecified"';

            if (cfg.landscapeRight && cfg.landscapeLeft && (cfg.portrait || cfg.upsideDown)) {
                replaceString = 'android:screenOrientation="fullSensor"';
            } else if ((cfg.landscapeRight || cfg.landscapeLeft) && (cfg.portrait || cfg.upsideDown)) {
                replaceString = 'android:screenOrientation="unspecified"';
            } else if (cfg.landscapeRight && !cfg.landscapeLeft) {
                replaceString = 'android:screenOrientation="landscape"';
            } else if (!cfg.landscapeRight && cfg.landscapeLeft) {
                replaceString = 'android:screenOrientation="reverseLandscape"';
            } else if (cfg.landscapeRight && cfg.landscapeLeft) {
                replaceString = 'android:screenOrientation="sensorLandscape"';
            } else if (cfg.portrait && !cfg.upsideDown) {
                replaceString = 'android:screenOrientation="portrait"';
            } else if (!cfg.portrait && cfg.upsideDown) {
                const oriValue = 'reversePortrait';
                replaceString = `android:screenOrientation="${oriValue}"`;
            } else if (cfg.portrait && cfg.upsideDown) {
                const oriValue = 'sensorPortrait';
                replaceString = `android:screenOrientation="${oriValue}"`;
            }

            let content = await fs.readFile(manifestPath, 'utf8');
            content = content.replace(pattern, replaceString);
            let instantContent = await fs.readFile(instantManifestPath, 'utf8');
            instantContent = instantContent.replace(pattern, replaceString);
            await fs.writeFile(manifestPath, content);
            await fs.writeFile(instantManifestPath, instantContent);
        }
    }

    private mapOrientationValue() {
        const orientation = this.params.platformParams.orientation;
        let orientationValue = 'unspecified';

        if (orientation.landscapeRight && orientation.landscapeLeft && (orientation.portrait || orientation.upsideDown)) {
            orientationValue = 'fullSensor';
        } else if ((orientation.landscapeRight || orientation.landscapeLeft) && (orientation.portrait || orientation.upsideDown)) {
            orientationValue = 'unspecified';
        } else if (orientation.landscapeRight && !orientation.landscapeLeft) {
            orientationValue = 'landscape';
        } else if (!orientation.landscapeRight && orientation.landscapeLeft) {
            orientationValue = 'reverseLandscape';
        } else if (orientation.landscapeRight && orientation.landscapeLeft) {
            orientationValue = 'sensorLandscape';
        } else if (orientation.portrait && !orientation.upsideDown) {
            orientationValue = 'portrait';
        } else if (!orientation.portrait && orientation.upsideDown) {
            orientationValue = 'reversePortrait';
        } else if (orientation.portrait && orientation.upsideDown) {
            orientationValue = 'sensorPortrait';
        }
        return orientationValue;
    }

    protected async updateManifest() {

        if (!this.firstTimeBuild) {
            console.log(`AndroidManifest.xml has already been updated!`);
            return;
        }

        const resizeableActivity: boolean = this.params.platformParams.resizeableActivity;
        const manifestPath = cchelper.join(this.paths.platformTemplateDirInPrj, 'app/AndroidManifest.xml');
        const instantManifestPath = cchelper.join(this.paths.platformTemplateDirInPrj, 'instantapp/AndroidManifest.xml');

        const fnParseXml = async (xmlFile: string) => {
            const xmlData = await fs.readFile(xmlFile, 'utf8');
            const data = await xml2js.parseStringPromise(xmlData);
            return {
                data,
                save: async () => {
                    const builder = new xml2js.Builder();
                    const dstXML = builder.buildObject(data);
                    await fs.writeFile(xmlFile, dstXML, 'utf8');
                }
            }
        };
        const fnUpdateOrientation = (data: any) => {
            const attrRef = data.manifest.application[0].activity[0].$;
            attrRef['android:screenOrientation'] = this.mapOrientationValue();
        };
        const fnUpdateResizeableActivity = (data: any) => {
            const activityRef = data.manifest.application[0].$;
            activityRef['android:resizeableActivity'] = resizeableActivity ? 'true' : 'false';
        };
        const fnUpdateMaxAspectRation = (data: any) => {
            if (resizeableActivity) return; // disabled
            const maxAspectRatio: string = this.params.platformParams.maxAspectRatio;
            if (!maxAspectRatio) return; // value not set
            const matchFrac = maxAspectRatio.match(/^(\d+):(\d+)$/);
            let aspectRatioFloatValue;
            try {
                if (matchFrac) {
                    aspectRatioFloatValue = Number.parseInt(matchFrac[1], 10) / Number.parseInt(matchFrac[2], 10);
                } else {
                    aspectRatioFloatValue = Number.parseFloat(maxAspectRatio);
                }
            } catch (e) {
                console.error(e);
                console.error(`Error when parsing '${maxAspectRatio}', fallback maxAspectRatio to default value`);
                aspectRatioFloatValue = 2.4;
            }

            let apiLevel = this.params.platformParams.apiLevel;
            if (apiLevel === undefined) apiLevel = DefaultAPILevel;


            if (apiLevel >= 26) { // Android 8.0
                const activities = data.manifest.application[0].activity;
                for (const activity of activities) {
                    activity.$['android:maxAspectRatio'] = `${aspectRatioFloatValue}`;
                }
            } else {
                const application = data.manifest.application[0];
                //append meta-data
                application['meta-data'].push({
                    $: { 'android:name': 'android.max_aspect', 'android:value': `${aspectRatioFloatValue}` }
                });
            }

        };

        if (fs.existsSync(manifestPath)) {
            const app = await fnParseXml(manifestPath);
            await fnUpdateOrientation(app.data);
            await fnUpdateResizeableActivity(app.data);
            await fnUpdateMaxAspectRation(app.data);
            await app.save();
        }
        if (fs.existsSync(instantManifestPath)) {
            const instant = await fnParseXml(instantManifestPath);
            await fnUpdateOrientation(instant.data);
            await fnUpdateResizeableActivity(instant.data);
            await fnUpdateMaxAspectRation(instant.data);
            await instant.save();
        }
    }

    protected async updateAndroidGradleValues() {
        const options = this.params.platformParams;
        // android-studio gradle.properties
        console.log(`update settings.properties`);
        await cchelper.replaceInFile([
            { reg: '^rootProject\\.name.*', text: `rootProject.name = "${this.params.projectName}"` },
            { reg: ':CocosGame', text: `:${this.params.projectName}` }
        ], ps.join(this.paths.nativePrjDir, 'settings.gradle'));

        console.log(`update gradle.properties`);
        const gradlePropertyPath = cchelper.join(this.paths.nativePrjDir, 'gradle.properties');
        if (fs.existsSync(gradlePropertyPath)) {
            let keystorePath = options.keystorePath;
            if (process.platform === 'win32') {
                keystorePath = cchelper.fixPath(keystorePath);
            }
            let apiLevel = options.apiLevel;
            if (!apiLevel) {
                apiLevel = DefaultAPILevel;
            }
            console.log(`AndroidAPI level ${apiLevel}`);
            let content = fs.readFileSync(gradlePropertyPath, 'utf-8');
            if (keystorePath) {
                content = content.replace(/.*RELEASE_STORE_FILE=.*/, `RELEASE_STORE_FILE=${keystorePath}`);
                content = content.replace(/.*RELEASE_STORE_PASSWORD=.*/, `RELEASE_STORE_PASSWORD=${options.keystorePassword}`);
                content = content.replace(/.*RELEASE_KEY_ALIAS=.*/, `RELEASE_KEY_ALIAS=${options.keystoreAlias}`);
                content = content.replace(/.*RELEASE_KEY_PASSWORD=.*/, `RELEASE_KEY_PASSWORD=${options.keystoreAliasPassword}`);
            } else {
                content = content.replace(/.*RELEASE_STORE_FILE=.*/, `# RELEASE_STORE_FILE=${keystorePath}`);
                content = content.replace(/.*RELEASE_STORE_PASSWORD=.*/, `# RELEASE_STORE_PASSWORD=${options.keystorePassword}`);
                content = content.replace(/.*RELEASE_KEY_ALIAS=.*/, `# RELEASE_KEY_ALIAS=${options.keystoreAlias}`);
                content = content.replace(/.*RELEASE_KEY_PASSWORD=.*/, `# RELEASE_KEY_PASSWORD=${options.keystoreAliasPassword}`);
            }

            const compileSDKVersion = this.parseVersion(content, 'PROP_COMPILE_SDK_VERSION', 27);
            const minimalSDKVersion = this.parseVersion(content, 'PROP_MIN_SDK_VERSION', 21);

            content = content.replace(/PROP_TARGET_SDK_VERSION=.*/, `PROP_TARGET_SDK_VERSION=${apiLevel}`);
            content = content.replace(/PROP_COMPILE_SDK_VERSION=.*/, `PROP_COMPILE_SDK_VERSION=${Math.max(apiLevel, compileSDKVersion, 27)}`);
            content = content.replace(/PROP_MIN_SDK_VERSION=.*/, `PROP_MIN_SDK_VERSION=${Math.min(apiLevel, minimalSDKVersion)}`);
            content = content.replace(/PROP_APP_NAME=.*/, `PROP_APP_NAME=${this.params.projectName}`);
            content = content.replace(/PROP_ENABLE_INPUTSDK=.*/, `PROP_ENABLE_INPUTSDK=${options.inputSDK ? "true" : "false"}`);
            content = content.replace(/PROP_IS_DEBUG=.*/, `PROP_IS_DEBUG=${this.params.debug ? "true" : "false"}`);

            content = content.replace(/RES_PATH=.*/, `RES_PATH=${cchelper.fixPath(this.paths.buildDir)}`);
            content = content.replace(/COCOS_ENGINE_PATH=.*/, `COCOS_ENGINE_PATH=${cchelper.fixPath(Paths.nativeRoot)}`);
            content = content.replace(/APPLICATION_ID=.*/, `APPLICATION_ID=${options.packageName}`);
            content = content.replace(/NATIVE_DIR=.*/, `NATIVE_DIR=${cchelper.fixPath(this.paths.platformTemplateDirInPrj)}`);


            if (process.platform === 'win32') {
                options.ndkPath = options.ndkPath.replace(/\\/g, '\\\\');
            }

            content = content.replace(/PROP_NDK_PATH=.*/, `PROP_NDK_PATH=${options.ndkPath}`);

            const abis = (options.appABIs && options.appABIs.length > 0) ? options.appABIs.join(':') : 'armeabi-v7a';
            // todo:新的template里面有个注释也是这个字段，所以要加个g
            content = content.replace(/PROP_APP_ABI=.*/g, `PROP_APP_ABI=${abis}`);
            fs.writeFileSync(gradlePropertyPath, content);

            // generate local.properties
            content = '';
            content += `sdk.dir=${options.sdkPath}`;
            // windows 需要使用的这样的格式 e\:\\aa\\bb\\cc
            if (process.platform === 'win32') {
                content = content.replace(/\\/g, '\\\\');
                content = content.replace(/:/g, '\\:');
            }

            fs.writeFileSync(cchelper.join(ps.dirname(gradlePropertyPath), 'local.properties'), content, { encoding: 'utf8' });
        } else {
            console.log(`warning: ${gradlePropertyPath} not found!`);
        }
    }

    private async generateAppNameValues() {
        const valuesPath = cchelper.join(this.paths.platformTemplateDirInPrj, 'res/values/strings.xml');
        const matchCnt = fs.readFileSync(valuesPath, 'utf8').toString().split('\n').map(x => x.trim()).filter(x => /name=\"app_name\"/.test(x)).length;
        if (matchCnt == 0) { // should generate
            const content = [
                `<resources>`,
                `    <string name="app_name" translatable="false">${this.params.projectName}</string>`,
                `</resources>`,
            ];
            const dir = ps.join(this.paths.buildDir, 'proj/res/values');
            await fs.ensureDir(dir);
            await fs.writeFileSync(ps.join(dir, `strings.xml`), content.join('\n'), 'utf8');
        }
    }

    /**
     * 到对应目录拷贝文件到工程发布目录
     */
    async copyToDist(): Promise<boolean> {
        const options = this.params.platformParams;

        const suffix = this.params.debug ? 'debug' : 'release';
        const destDir: string = ps.join(this.paths.buildDir, 'publish', suffix);
        fs.ensureDirSync(destDir);
        let apkName = `${this.projectNameASCII()}-${suffix}.apk`;
        let apkPath = ps.join(this.outputsDir(), `apk/${suffix}/${apkName}`);
        if (!fs.existsSync(apkPath)) {
            throw new Error(`apk not found at ${apkPath}`);
        }
        fs.copyFileSync(apkPath, ps.join(destDir, apkName));

        if (options.appBundle) {
            apkName = `${this.params.projectName}-${suffix}.aab`;
            apkPath = ps.join(this.outputsDir(), `bundle/${suffix}/${apkName}`);
            if (!fs.existsSync(apkPath)) {
                throw new Error(`instant apk not found at ${apkPath}`);
            }
            fs.copyFileSync(apkPath, ps.join(destDir, apkName));
        }
        return true;
    }

    // ---------------------------- run ------------------------- //

    async run() {
        if (await this.install()) {
            return await this.startApp();
        }
        return true;
    }

    getAdbPath() {
        return ps.join(
            this.params.platformParams.sdkPath,
            `platform-tools/adb${process.platform === 'win32' ? '.exe' : ''}`);
    }

    getApkPath() {
        const suffix = this.params.debug ? 'debug' : 'release';
        const apkName = `${this.projectNameASCII()}-${suffix}.apk`;
        return ps.join(this.outputsDir(), `apk/${suffix}/${apkName}`);
    }

    private outputsDir() {
        const folderName = this.projectNameASCII();
        const targetDir = ps.join(this.paths.nativePrjDir, 'build', folderName);
        const fallbackDir = ps.join(this.paths.nativePrjDir, 'build', this.params.projectName);
        return ps.join(fs.existsSync(targetDir) ? targetDir : fallbackDir, 'outputs');
    }

    async install(): Promise<boolean> {
        const apkPath = this.getApkPath();
        const adbPath = this.getAdbPath();

        if (!fs.existsSync(apkPath)) {
            throw new Error(`can not find apk at ${apkPath}`);
        }

        if (!fs.existsSync(adbPath)) {
            throw new Error(`can not find adb at ${adbPath}`);
        }

        if (!this.checkConnectedDevices(adbPath)) {
            console.error(`can not find any connected devices, please connect you device or start an Android emulator`);
        }

        if (await this.checkApkInstalled(adbPath)) {
            await cchelper.runCmd(
                adbPath, ['uninstall', this.params.platformParams.packageName], false);
        }

        await cchelper.runCmd(adbPath, ['install', '-r', apkPath], false);
        return true;
    }

    checkConnectedDevices(adbPath: string): boolean {
        const cp = spawnSync(adbPath, ['devices'], { shell: true, env: process.env, cwd: process.cwd() });
        if (cp.stderr && cp.stderr.length > 0) {
            console.log(`[adb devices] stderr: ${cp.stderr.toString('utf8')}`);
        }
        if (cp.error) {
            console.log(`[adb devices] error: ${cp.error}`);
        }
        if (cp.output.length > 1) {
            for (const chunk of cp.output) {
                if (chunk) {
                    const chunkAny: any = chunk;
                    const chuckStr: string = typeof chunk === 'string' ? chunk : (chunkAny.buffer && chunkAny.buffer instanceof ArrayBuffer ? chunkAny.toString() : chunkAny.toString());
                    const lines = chuckStr.split('\n');
                    for (let line of lines) {
                        if (/^[0-9a-zA-Z]+\s+\w+/.test(line)) {
                            return true; // device connected
                        }
                    }
                }
            }
        }
        return false;
    }

    async checkApkInstalled(adbPath: string) {
        const ret: string = await new Promise((resolve, reject) => {
            const cp = spawn(
                adbPath,
                [
                    'shell pm list packages | grep',
                    this.params.platformParams.packageName,
                ],
                {
                    shell: true,
                    env: process.env,
                    cwd: process.cwd(),
                });
            cp.stdout.on(`data`, (chunk) => {
                resolve(chunk.toString());
            });
            cp.stderr.on(`data`, (chunk) => {
                resolve('');
            });
            cp.on('close', (code, signal) => {
                resolve('');
            });
        });
        return ret.includes(this.params.platformParams.packageName);
    }

    async startApp(): Promise<boolean> {
        const adbPath = this.getAdbPath();
        await cchelper.runCmd(
            adbPath,
            [
                'shell', 'am', 'start', '-n',
                `${this.params.platformParams.packageName}/com.cocos.game.AppActivity`,
            ],
            false);
        return true;
    }
}
