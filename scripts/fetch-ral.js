const ps = require('path');
const fs = require('fs');
const fsExt = require('fs-extra');
const { exec } = require('child_process');
const del = require('del');
const chalk = require('chalk');

const distDir = join(__dirname, '../bin/adapter/runtime');
const { magenta } = require('chalk');

const prefix = ''.padStart(20, '=');
console.log(magenta(`${prefix} Fetch RAL ${prefix}`));

function forceCopyFileSync (src, dst) {
    const content = fs.readFileSync(src, 'utf8');
    fsExt.outputFileSync(dst, content, { encoding: 'utf8' });
}

function join (...paths) {
    const result = ps.join(...paths);
    return result.replace(/\\/g, '/');
}
function readJsonSync (jsonPath) {
    const json = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(json);
}

const repositoryPath = join(__dirname, 'runtime-web-adapter');
const localCommitFile = join(__dirname, '../platforms/runtime/local-commit.json');
const targetCommitFile = join(__dirname, '../platforms/runtime/target-commit.json');

function matchCommit () {
    console.log('Matching commit...\n');
    const localCommit = readJsonSync(localCommitFile).commit;
    const targetCommit = readJsonSync(targetCommitFile).commit;
    return localCommit === targetCommit;
}

function checkFile () {
    console.log('Checking ral file...\n');

    if (!fs.existsSync(targetCommitFile)) {
        console.error('Cannot access to target commit file.');
        process.exit(1);
    }

    // check local commit file
    if (!fs.existsSync(localCommitFile)) {
        return false;
    }

    // check web adapter
    const webAdapters = ['web-adapter.js', 'web-adapter.min.js'];
    for (const webAdapter of webAdapters) {
        const dst = join(distDir, webAdapter);
        if (!fs.existsSync(dst)) {
            return false;
        }
    }

    // check ral
    const platformNames = ['cocos-play', 'huawei-quick-game', 'link-sure', 'oppo-mini-game', 'qtt', 'vivo-mini-game'];
    const rals = ['ral.js', 'ral.min.js'];
    for (const platformName of platformNames) {
        for (const ral of rals) {
            const dst = join(distDir, platformName, ral);
            if (!fs.existsSync(dst)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * @param {string} cmd
 * @param {string} cwd
 * @returns {Promise<void>}
 */
function runCommand (cmd, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`Running command: '${cmd}' in '${repositoryPath}'\n`);
        const ls = exec(cmd, {
            cwd,
        }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
            }
            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                console.error(stderr);
            }
        });
        ls.on('close', () => {
            resolve(ls.exitCode);
        });

        ls.stderr.on('data', (data) => {
            console.error(data);
        });
    });
}

function copyRal () {
    console.log(`Copy files from '${repositoryPath}' to '${distDir}'\n`);

    // copy web-adapter
    ['web-adapter.js', 'web-adapter.min.js'].forEach((fileName) => {
        const src = join(repositoryPath, 'dist/common', fileName);
        const dst = join(distDir, fileName);
        forceCopyFileSync(src, dst);
    });
    // copy ral
    ['cocos-play', 'huawei-quick-game', 'link-sure', 'oppo-mini-game', 'qtt', 'vivo-mini-game'].forEach((platformName) => {
        ['ral.js', 'ral.min.js'].forEach((fileName) => {
            const src = join(repositoryPath, 'dist/platforms', platformName, fileName);
            const dst = join(distDir, platformName, fileName);
            forceCopyFileSync(src, dst);
        });
    });
}

async function cleanOldRal () {
    console.log('Cleaning old runtime adapter...\n');
    const delPatterns = [];
    // del local commit
    delPatterns.push(localCommitFile);
    // del web adapter
    ['web-adapter.js', 'web-adapter.min.js'].forEach((fileName) => {
        const dst = join(distDir, fileName);
        delPatterns.push(dst);
    });
    // del ral
    ['cocos-play', 'huawei-quick-game', 'link-sure', 'oppo-mini-game', 'qtt', 'vivo-mini-game'].forEach((platformName) => {
        ['ral.js', 'ral.min.js'].forEach((fileName) => {
            const dst = join(distDir, platformName, fileName);
            delPatterns.push(dst);
        });
    });
    await del(delPatterns, { force: true });
}

async function writeLocalCommitFile () {
    console.log('Write local commit file\n');
    const targetCommitJson = fs.readFileSync(targetCommitFile, 'utf8');
    fs.writeFileSync(localCommitFile, targetCommitJson);
}

/**
 * @param {string} dirPath
 * @returns {Promise<void>}
 */
async function removeDir (dirPath) {
    console.log(`Remove ral directory: '${dirPath}'\n`);
    await del(dirPath, { force: true });
}

(async () => {
    try {
        console.time('Fetch RAL');
        if (checkFile() && matchCommit()) {
            console.log('Skip fetching ral!\n');
            console.timeEnd('Fetch RAL');
            process.exit(0);
        }
        await cleanOldRal();
        await removeDir(repositoryPath);
        try {
            const exitCode = await runCommand('git clone git@github.com:yangws/runtime-web-adapter.git', __dirname);
            if (exitCode !== 0) {
                await removeDir(repositoryPath);
                await runCommand('git clone https://github.com/yangws/runtime-web-adapter', __dirname);
            }
        } catch (e) {
            await removeDir(repositoryPath);
            await runCommand('git clone https://github.com/yangws/runtime-web-adapter', __dirname);
        }
        await runCommand('git checkout for-creator-3', repositoryPath);
        await runCommand(`git reset --hard ${readJsonSync(targetCommitFile).commit}`, repositoryPath);
        await runCommand('npm install', repositoryPath);
        await runCommand('gulp', repositoryPath);
        copyRal();
        writeLocalCommitFile();
        await removeDir(repositoryPath);
        console.timeEnd('Fetch RAL');
        process.exit(0);
    } catch (err) {
        console.error(chalk.red('Fetch ral failed'), err);
        process.exit(1);
    }
})();
