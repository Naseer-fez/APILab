import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const frontendDir = path.join(projectRoot, 'frontend');
const outputFile = path.join(projectRoot, 'backend', 'src', 'embedded-frontend.js');

const MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.ico', '.woff', '.woff2']);

function scanDirectory(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'Mainpage' || entry.name === 'website' || entry.name === 'assets' || entry.name === 'node_modules' || entry.name === '.git') {
                continue;
            }
            results.push(...scanDirectory(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
                continue;
            }
            results.push(fullPath);
        }
    }
    return results;
}

export function generateFrontendEmbed() {
    console.log('[EMBED] Scanning frontend directory for static assets...');
    const allFiles = scanDirectory(frontendDir);
    const assetMap = {};

    for (const file of allFiles) {
        const relPath = '/' + path.relative(frontendDir, file).replace(/\\/g, '/');
        const ext = path.extname(file).toLowerCase();
        const mimeType = MIME_MAP[ext] || 'application/octet-stream';
        const isBinary = BINARY_EXTS.has(ext);

        const content = fs.readFileSync(file);
        assetMap[relPath] = {
            type: mimeType,
            isBinary,
            content: isBinary ? content.toString('base64') : content.toString('utf8')
        };
        console.log(`[EMBED] Added: ${relPath} (${mimeType}, ${(content.length / 1024).toFixed(1)} KB)`);
    }

    const code = `// Auto-generated embedded frontend assets. Do not edit directly.
// Generated on ${new Date().toISOString()}
export const embeddedFrontend = ${JSON.stringify(assetMap, null, 2)};
`;

    fs.writeFileSync(outputFile, code, 'utf8');
    const stat = fs.statSync(outputFile);
    console.log(`[EMBED] Generated ${outputFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    return stat.size;
}

if (process.argv[1] && process.argv[1].includes('generate-frontend-embed.js')) {
    generateFrontendEmbed();
}
