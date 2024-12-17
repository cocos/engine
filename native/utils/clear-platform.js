'use strict';

// @ts-check

const chalk = require('chalk');
const path = require("path");
const fs = require('fs-extra');
const tar = require('tar');
const zlib = require('zlib');
const axios = require('axios');
const ProgressBar = require('progress');
const os = require('os');
const child_process = require('child_process');
const fetch = require('node-fetch');

// usage: npm run clear-platform
let externalDir = process.env.ENGINE_PATH ? path.join(process.env.ENGINE_PATH, "./native/external")  : path.join(__dirname, "../external");
let failed = false;

let macUsefulDirs = ['android', 'cmake', 'emscripten', 'ios', 'ios-m1-simulator', 'mac', 'ohos', 'sources', 'openharmony'];
let winUsefulDirs = ['android', 'cmake', 'emscripten', 'ohos', 'sources', 'win64', 'openharmony'];
let linuxUsefulDirs = ['android', 'cmake', 'emscripten', 'linux', 'ohos', 'sources'];
let allDirs = [];

['log', 'warn', 'error', 'info'].forEach(field => {
    const oldFn = console[field];
    console[field] = function (...args) {
        oldFn.apply(this, [`[clear-platform.js:${field}] `, ...args]);
    };
});


main();

async function main() {
    readDirectory(externalDir, allDirs);
    console.log(chalk.green(`==== current exists 3rd-libs directories ====`));
    console.log(allDirs);
    cleanPlatform(process.platform);
    await minimizeBoost();
}

function readDirectory(path, filesList) {
    let files = fs.readdirSync(path);
    files.forEach((file) => {
        let states = fs.statSync(path + "/" + file);
        if (states.isDirectory() && file.charAt(0) !== '.') {
            filesList.push(file);
        }
    });
}

function cleanPlatform(platform) {
    if (platform === 'darwin') { // macOS
        let macUselessDirs = getArrDiff(allDirs, macUsefulDirs);
        if (macUselessDirs.length > 0) {
            console.log(chalk.magenta(`==== Remove darwin useless 3rd-libs ====`));
            console.log(macUselessDirs);
            for (let i = 0; i < macUselessDirs.length; i++) {
                let clearDirectory = path.join(externalDir, macUselessDirs[i]);
                console.log(`  ${chalk.green('Remove directory: ')} ${clearDirectory}`);
                ensureRemove(clearDirectory);
            }
        } else {
            console.log(chalk.green(`==== No useless 3rd-libs need to remove, skip ====`));
        }
    }
    else if (platform === 'win32') { // windows
        let winUselessDirs = getArrDiff(allDirs, winUsefulDirs);
        if (winUselessDirs.length > 0) {
            console.log(chalk.magenta(`==== Remove win32 useless 3rd-libs ====`));
            console.log(winUselessDirs);
            for (let i = 0; i < winUselessDirs.length; i++) {
                let clearDirectory = path.join(externalDir, winUselessDirs[i]);
                console.log(`  ${chalk.green('Remove directory: ')} ${clearDirectory}`);
                ensureRemove(clearDirectory);
            }
        } else {
            console.log(chalk.green(`==== No useless 3rd-libs need to remove, skip ====`));
        }
    }
    else if (platform === 'linux') { // linux
        let linuxUselessDirs = getArrDiff(allDirs, linuxUsefulDirs);
        if (linuxUselessDirs.length > 0) {
            console.log(chalk.magenta(`==== Remove linux useless 3rd-libs ====`));
            console.log(linuxUselessDirs);
            for (let i = 0; i < linuxUselessDirs.length; i++) {
                let clearDirectory = path.join(externalDir, linuxUselessDirs[i]);
                console.log(`  ${chalk.green('Remove directory: ')} ${clearDirectory}`);
                ensureRemove(clearDirectory);
            }
        } else {
            console.log(chalk.green(`==== No useless 3rd-libs need to remove, skip ====`));
        }
    } else { // others
        console.log(chalk.red(`Platform ${platform} is not supported, skip`));
    }
    // abnormal exit
    if (failed) {
        process.exit(-1);
    }
}

function ensureRemove(clearDirectory) {
    try {
        if (fs.existsSync(clearDirectory)) {
            fs.removeSync(clearDirectory);
            console.log(`  ${chalk.green('Success')}`);
        } else {
            console.log(`  ${chalk.yellow('Directory does not exist: skip')}`);
        }
    } catch (error) {
        failed = true;
        console.log(`  ${chalk.red('Failure')}`);
        console.log(error);
    }
}

function getArrDiff(arr1, arr2) {
    return arr1.concat(arr2).filter(function (v, i, arr) {
        return arr.indexOf(v) === arr.lastIndexOf(v);
    });
}

function execName(fn, winPostFix = '.exe', linuxPosFix = '') {
    return os.platform() === 'win32' ? fn + winPostFix : fn + linuxPosFix;
}

async function runCommand(dir, cmd, ...args) {
    console.log(`Exec ${cmd} with [${args.join(', ')}]`);
    return new Promise((resolve, reject) => {
        const child = child_process.spawn(cmd, args, {
            cwd: dir,
            shell: true,
        });
        child.stdout.on('data', (data) => {
            console.log(data.toString('utf8'));
        });
        child.stderr.on('data', (data) => {
            console.error(data.toString('utf8'));
        });
        child.on('error', (data) => {
            console.log(`Error:`);
            console.error(data.toString('utf8'));
        });
        child.on('close', (code) => {
            if (code == 0) {
                return resolve();
            }
            console.error(`Command ${cmd} exited with code ${code}`)
            reject(new Error(`Command ${cmd} exited with code ${code}`));
        })
    });
}

async function filterFiles(root, tstFn) {
    const all = [];
    const walk = async (dir) => {
        const st = fs.statSync(dir);
        if (st.isDirectory()) {
            const files = await fs.readdir(dir);
            const sub = [];
            for (let f of files) {
                if (f.startsWith('.')) continue;
                const p = path.join(dir, f);
                if (tstFn(p, true)) sub.push(walk(p));
            }
            await Promise.all(sub);
        } else {
            if (tstFn(dir, false)) all.push(dir);
        }
    }
    await walk(root);
    return all;
}

async function batcher(array, batchSize, fn) {
    for (let i = 0, l = array.length; i < l; i += batchSize) {
        await Promise.all(array.slice(i, i + batchSize).map(fn))
    }
}

async function minimizeBoost() {
    const BOOST_VERSION = [1, 78, 0]
    const BOOST_VERSION_DOTTED = BOOST_VERSION.join('.');
    const BOOST_VERSION_UNDERSCORE = BOOST_VERSION.join('_');
    const BOOST_ZIP_FILE = `boost_${BOOST_VERSION_UNDERSCORE}.tar.gz`;
    const EXTERNAL_SOURCE_DIR = path.join(externalDir, 'sources');
    const BOOST_DOWNLOAD = path.join(EXTERNAL_SOURCE_DIR, 'boost-download');
    const BOOST_ORIG_PATH = path.join(EXTERNAL_SOURCE_DIR, 'boost');
    const BOOST_DEST = path.join(EXTERNAL_SOURCE_DIR, 'boost-minimized');
    const BOOST_DECOMPRESSED_PATH = path.join(BOOST_DOWNLOAD, `boost_${BOOST_VERSION_UNDERSCORE}`);
    const BOOST_FILE_PATH = path.join(BOOST_DOWNLOAD, BOOST_ZIP_FILE);
    const BOOST_URL_REMOTE = `https://jaist.dl.sourceforge.net/project/boost/boost/${BOOST_VERSION_DOTTED}/boost_${BOOST_VERSION_UNDERSCORE}.tar.gz`
    const BOOST_URL_LOCAL = `http://ftp.cocos.org/TestBuilds/Editor-3d/tools/boost_${BOOST_VERSION_UNDERSCORE}.tar.gz`

    const BCP_PATH = path.join(BOOST_DECOMPRESSED_PATH, 'dist', 'bin', execName('bcp'));
    const ENGINE_ROOT = path.normalize(path.join(externalDir, '../../'));

    let headersUsedByEngine = [];

    const fnCheckDirectories = async () => {
        if (!await fs.pathExists(BOOST_DOWNLOAD)) {
            await fs.mkdir(BOOST_DOWNLOAD);
        }
        if (!await fs.pathExists(BOOST_DEST)) {
            await fs.mkdir(BOOST_DEST);
        }
    }

    const fnDownloadWithAxios = async (url, dstUrl) => {
        let bar = null;
        const dstFile = fs.createWriteStream(dstUrl);
        return new Promise((resolve, reject) => {
            axios.get(url, { responseType: 'stream' })
                .then((res) => {
                    // console.log(res.headers);
                    const total = res.headers['Content-Length'] || res.headers['content-length'];
                    bar = new ProgressBar('Downloading [:bar] :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 40,
                        total: parseInt(total)
                    });
                    res.data.pipe(dstFile);
                    res.data.on('data', (chunk) => { bar.tick(chunk.length); });
                    res.data.on('end', () => {
                        console.log(` Download Finished`);
                        resolve();
                    });
                }).catch(err => reject(err));
        });
    };

    const fnDownloadWithCurl = async (url, dstUrl) => {
        await runCommand(BOOST_DOWNLOAD, 'curl', url, '-o', `"${dstUrl}"`)
    }

    const rm = async (file) => {
        const st = fs.statSync(file);
        if (st.isDirectory()) {
            const files = (await fs.readdir(file)).filter(x => x !== '.' && x !== '..').map(x => path.join(file, x));
            await Promise.all(files.map(x => rm(x)));
            await fs.rmdir(file)
        } else {
            await fs.unlink(file);
        }
    };

    const fnDownloadBoost = async () => {
        const targetExist = await fs.pathExists(BOOST_FILE_PATH);
        if (!targetExist) {
            let boostURL;
            console.log(`Testing local url: ${BOOST_URL_LOCAL}`);
            try {
                const FETCH_TIMEOUTOUT = 30 * 1000;
                const testLocal = await Promise.race( [fetch(BOOST_URL_LOCAL), new Promise((_, r)=> {
                    setTimeout(()=> r(new Error('Request timed out')), FETCH_TIMEOUTOUT);
                })]);
                if (testLocal.ok) {
                    console.log(`   Use ${BOOST_URL_LOCAL}!`);
                    boostURL = BOOST_URL_LOCAL;
                } else {
                    console.log(`   Failed on error code, use ${BOOST_URL_REMOTE}!`);
                    boostURL = BOOST_URL_REMOTE;
                }
            } catch (e) {
                console.error(e);
                console.log(`   Failed on exception, use ${BOOST_URL_REMOTE}!`);
                boostURL = BOOST_URL_REMOTE;
            }
            console.log(`      downloading ${boostURL}\n  to ${BOOST_FILE_PATH}`);

            await fnDownloadWithAxios(boostURL, BOOST_FILE_PATH);
            // await fnDownloadWithCurl(BOOST_URL, BOOST_FILE_PATH);
        } else {
            console.log(`Skip downloading, file ${BOOST_FILE_PATH} exists.`);
        }
    };

    const fnDecompressBoost = async () => {
        if (await fs.pathExists(BOOST_DECOMPRESSED_PATH)) {
            console.log(` Folder ${BOOST_DECOMPRESSED_PATH} exists, skip decompressing...`);
            return;
        }
        console.log(`Decompressing file ${BOOST_FILE_PATH}`);
        const srcStream = fs.createReadStream(BOOST_FILE_PATH);
        const st = fs.statSync(BOOST_FILE_PATH);
        let bar;
        return new Promise((resolve, reject) => {
            bar = new ProgressBar(' Extracting [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 40,
                total: st.size
            });
            srcStream.on('data', chunk => bar.tick(chunk.length))
                .pipe(zlib.createGunzip())
                .pipe(tar.extract({ cwd: BOOST_DOWNLOAD }))
                .on('entry', (entry) => {
                    // console.log(`  processing ${entry.path}`);
                })
                .on('error', err => {
                    console.error(`  decompressing error!`);
                    reject(err);
                })
                .on('end', () => {
                    console.log(`  decompressing done!`);
                    resolve();
                });
        });
    };

    const fnCompileBoost = async () => {
        if (await fs.pathExists(BCP_PATH)) {
            console.log(` File ${BCP_PATH} already exists, skip compilation`);
            return;
        }
        const bootstrap = path.join(BOOST_DECOMPRESSED_PATH, execName('bootstrap', '.bat', '.sh'));
        const b2 = path.join(BOOST_DECOMPRESSED_PATH, execName('b2'));
        await runCommand(BOOST_DECOMPRESSED_PATH, bootstrap);
        await runCommand(BOOST_DECOMPRESSED_PATH, b2, 'headers');
        await runCommand(BOOST_DECOMPRESSED_PATH, b2, 'tools/bcp');

        if (await fs.pathExists(BCP_PATH)) {
            console.log(` Compile bcp.exe successed!`);
        } else {
            console.error(` Failed to compile bcp.exe, file not found!`)
        }
    };

    const fnCollectBoostHeaders = async () => {
        console.log(` Analyzing source files...`);
        const allSource = await filterFiles(ENGINE_ROOT, (path, isdir) => {
            return isdir ? !/native(\\|\/)+external/.test(path) : ['.h', '.hpp', '.cpp', '.mm'].filter(e => path.endsWith(e)).length > 0;
        });
        console.log(`${allSource.length} files found!`);
        const R = /#include\s+[<"]boost\/([^">]+)/
        const boostHeaders = {};
        await batcher(allSource, 20, async (file) => {
            const data = await fs.readFile(file, 'utf8')
            const includes = data.split(`\n`).filter(x => x.trim().startsWith("#include")).map(x => x.trim()).filter(x => R.test(x));
            includes.forEach(x => {
                const m = x.match(R);
                if (m) {
                    boostHeaders[m[1]] = true;
                }
            })
        })
        headersUsedByEngine = Object.keys(boostHeaders).sort();
        console.log(`  headers: ${headersUsedByEngine.join(', ')}`);
    };

    const fnRunBCP = async () => {
        await runCommand(BOOST_DECOMPRESSED_PATH, BCP_PATH,
            `--boost="${BOOST_DECOMPRESSED_PATH}"`,
            'graph', /* manually add components here */
            ...headersUsedByEngine,
            BOOST_DEST
        );

        if (await fs.pathExists(BOOST_ORIG_PATH)) {
            console.log(`Remove old folder ${BOOST_ORIG_PATH}`);
            await rm(BOOST_ORIG_PATH);
        }
        console.log(`Link to minimized boost folder ${BOOST_DEST}`);
        await fs.rename(path.join(BOOST_DEST, 'boost'), BOOST_ORIG_PATH);
        if (await fs.pathExists(BOOST_DEST)) {
            console.log(`Remove folder ${BOOST_DEST}`);
            await rm(BOOST_DEST);
        }
    };

    const fnCleanUp = async () => {
        if (await fs.pathExists(BOOST_DOWNLOAD)) {
            await rm(BOOST_DOWNLOAD);
        }
    }


    await fnCheckDirectories();
    await fnDownloadBoost();
    await fnDecompressBoost();
    await fnCompileBoost();
    await fnCollectBoostHeaders();
    await fnRunBCP();
    await fnCleanUp(); // skip this step when debugging
}
