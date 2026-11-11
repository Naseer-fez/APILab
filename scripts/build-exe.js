import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { generateFrontendEmbed } from './generate-frontend-embed.js';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const bundlePath = path.join(distDir, 'bundle.cjs');
const seaPrepBlob = path.join(distDir, 'sea-prep.blob');
const seaConfigFile = path.join(distDir, 'sea-config.json');

// Parse target from CLI arguments
const args = process.argv.slice(2);
let targetArg = 'host';
for (const arg of args) {
    if (arg.startsWith('--target=')) {
        targetArg = arg.split('=')[1].toLowerCase();
    }
}

// Supported target configurations
const TARGET_MAP = {
    win: {
        platform: 'win32',
        outputName: 'apitestlab.exe',
        ext: '.zip',
        isHost: process.platform === 'win32'
    },
    linux: {
        platform: 'linux',
        outputName: 'apitestlab-linux',
        ext: '.tar.gz',
        isHost: process.platform === 'linux'
    },
    macos: {
        platform: 'darwin',
        outputName: 'apitestlab-macos',
        ext: '.tar.gz',
        isHost: process.platform === 'darwin'
    }
};

let targetsToBuild = [];
if (targetArg === 'all') {
    targetsToBuild = ['win', 'linux', 'macos'];
} else if (targetArg === 'host') {
    if (process.platform === 'win32') targetsToBuild = ['win'];
    else if (process.platform === 'linux') targetsToBuild = ['linux'];
    else if (process.platform === 'darwin') targetsToBuild = ['macos'];
    else targetsToBuild = ['win'];
} else if (TARGET_MAP[targetArg]) {
    targetsToBuild = [targetArg];
} else {
    console.error(`[ERROR] Unknown target: "${targetArg}". Valid targets: win, linux, macos, all, host.`);
    process.exit(1);
}

console.log('[INFO] ========================================================');
console.log('[INFO] Standalone Executable Build System');
console.log(`[INFO] Node Version:    ${process.version}`);
console.log(`[INFO] Host Platform:   ${process.platform}-${process.arch}`);
console.log(`[INFO] Build Targets:   ${targetsToBuild.join(', ')}`);
console.log('[INFO] ========================================================');

// 1. Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 2. Locate esbuild binary
function getEsbuildBin() {
    const localEsbuild = process.platform === 'win32'
        ? path.join(projectRoot, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe')
        : path.join(projectRoot, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(localEsbuild)) {
        return localEsbuild;
    }
    return 'npx esbuild';
}

// 3. Locate postject binary
function getPostjectBin() {
    const localPostject = process.platform === 'win32'
        ? path.join(projectRoot, 'node_modules', '.bin', 'postject.cmd')
        : path.join(projectRoot, 'node_modules', '.bin', 'postject');
    if (fs.existsSync(localPostject)) {
        return localPostject;
    }
    return 'npx postject';
}

// 3.5 Generate embedded in-memory frontend assets
generateFrontendEmbed();

// 4. Bundle JavaScript source with esbuild
console.log('[BUILD] Bundling JavaScript sources via esbuild...');
const esbuildBin = getEsbuildBin();
const banner = "const __import_meta_url = require('url').pathToFileURL(__filename).href;";
execSync(`"${esbuildBin}" bin/cli.js --bundle --platform=node --target=node18 --format=cjs "--banner:js=${banner}" --define:import.meta.url=__import_meta_url --outfile="${bundlePath}"`, {
    stdio: 'inherit'
});

// 5. Generate sea-config.json
console.log('[BUILD] Generating SEA configuration...');
const seaConfig = {
    main: bundlePath,
    output: seaPrepBlob,
    disableExperimentalSEAWarning: true
};
fs.writeFileSync(seaConfigFile, JSON.stringify(seaConfig, null, 2));

// 6. Generate SEA prep blob
console.log('[BUILD] Generating SEA preparation blob...');
execSync(`"${process.execPath}" --experimental-sea-config "${seaConfigFile}"`, {
    stdio: 'inherit'
});

// Helper: Download runtime from nodejs.org
async function downloadFile(url, destPath) {
    console.log(`[DOWNLOAD] Fetching runtime from: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

// Helper: Extract node binary from archive
async function extractNodeBinary(archivePath, targetKey, destBinaryPath) {
    console.log(`[EXTRACT] Extracting binary for target: ${targetKey}...`);
    const tempExtractDir = path.join(distDir, `temp-${targetKey}`);
    if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });

    if (archivePath.endsWith('.zip')) {
        const unzipperModule = await import('unzipper');
        const unzipper = unzipperModule.default || unzipperModule;
        const directory = await unzipper.Open.file(archivePath);
        const nodeFile = directory.files.find(f => f.path.endsWith('node.exe'));
        if (!nodeFile) throw new Error('Could not find node.exe inside archive');
        const buffer = await nodeFile.buffer();
        fs.writeFileSync(destBinaryPath, buffer);
    } else if (archivePath.endsWith('.tar.gz')) {
        let extracted = false;
        try {
            execSync(`tar -xzf "${archivePath}" -C "${tempExtractDir}"`, { stdio: 'pipe' });
            extracted = true;
        } catch {
            const tarModule = await import('tar');
            const tarExtract = tarModule.x || tarModule.extract || tarModule.default?.x || tarModule.default?.extract;
            if (tarExtract) {
                await tarExtract({
                    file: archivePath,
                    cwd: tempExtractDir
                });
                extracted = true;
            }
        }

        if (!extracted) {
            throw new Error('Failed to extract .tar.gz archive');
        }

        const findBinary = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const found = findBinary(fullPath);
                    if (found) return found;
                } else if (entry.name === 'node' || entry.name === 'node.exe') {
                    return fullPath;
                }
            }
            return null;
        };

        const extractedBinary = findBinary(tempExtractDir);
        if (!extractedBinary) throw new Error('Could not find node binary inside extracted archive');
        fs.copyFileSync(extractedBinary, destBinaryPath);
    }

    if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
}

// Helper: Inject SEA blob via postject
function injectSeaBlob(binaryPath, targetKey) {
    console.log(`[INJECT] Injecting SEA blob into ${path.basename(binaryPath)}...`);
    const postjectBin = getPostjectBin();
    const machoFlag = targetKey === 'macos' ? ' --macho-segment-name NODE_SEA' : '';
    execSync(`"${postjectBin}" "${binaryPath}" NODE_SEA_BLOB "${seaPrepBlob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2${machoFlag}`, {
        stdio: 'inherit'
    });
}

// 7. Build binaries for selected targets
async function buildTargets() {
    const nodeVersion = process.version;

    for (const targetKey of targetsToBuild) {
        const targetConfig = TARGET_MAP[targetKey];
        const targetOutput = path.join(distDir, targetConfig.outputName);
        console.log(`\n[TARGET] Processing target: ${targetKey.toUpperCase()} (${targetConfig.outputName})`);

        if (targetConfig.isHost) {
            console.log(`[TARGET] Using host Node.js runtime: ${process.execPath}`);
            fs.copyFileSync(process.execPath, targetOutput);
        } else {
            const archiveName = `node-${nodeVersion}-${targetConfig.platform === 'darwin' ? 'darwin' : targetConfig.platform}-x64${targetConfig.ext}`;
            const downloadUrl = `https://nodejs.org/dist/${nodeVersion}/${archiveName}`;
            const localArchivePath = path.join(distDir, archiveName);

            if (!fs.existsSync(localArchivePath)) {
                await downloadFile(downloadUrl, localArchivePath);
            }
            await extractNodeBinary(localArchivePath, targetKey, targetOutput);
            if (fs.existsSync(localArchivePath)) {
                fs.unlinkSync(localArchivePath);
            }
        }

        if (targetKey !== 'win') {
            try {
                fs.chmodSync(targetOutput, 0o755);
            } catch {}
        }

        injectSeaBlob(targetOutput, targetKey);
        console.log(`[TARGET] Binary created: ${targetOutput}`);
    }

    // 8. Deploy frontend static assets (excluding non-production design/mockup folders)
    console.log('\n[DEPLOY] Copying clean frontend static assets to dist/frontend...');
    const frontendSrc = path.join(projectRoot, 'frontend');
    const frontendDist = path.join(distDir, 'frontend');
    if (fs.existsSync(frontendDist)) {
        fs.rmSync(frontendDist, { recursive: true, force: true });
    }
    fs.cpSync(frontendSrc, frontendDist, {
        recursive: true,
        filter: (src) => !src.includes('Mainpage') && !src.includes('website') && !src.includes('assets') && !src.includes('node_modules')
    });

    // 9. Clean up temporary build files
    console.log('[CLEANUP] Removing intermediate build artifacts...');
    if (fs.existsSync(seaPrepBlob)) fs.unlinkSync(seaPrepBlob);
    if (fs.existsSync(seaConfigFile)) fs.unlinkSync(seaConfigFile);

    console.log('\n========================================================');
    console.log('[SUCCESS] Build process completed successfully.');
    console.log('[SUCCESS] Output binaries in directory: ' + distDir);
    for (const targetKey of targetsToBuild) {
        console.log(`[SUCCESS] - ${TARGET_MAP[targetKey].outputName}`);
    }
    console.log('[SUCCESS] Static assets deployed to: ' + frontendDist);
    console.log('========================================================\n');
}

buildTargets().catch(err => {
    console.error(`\n[ERROR] Build failed: ${err.message}`);
    process.exit(1);
});
