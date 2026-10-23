/**
 * prepare-electron.js
 *
 * After `next build`, the standalone output at .next/standalone needs
 * the static assets and public folder copied into it. This script
 * handles that, and also copies Prisma engine binaries into the
 * standalone node_modules so the packaged server can find them.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  [skip] Source not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[prepare-electron] Copying static assets into standalone...');

// 1. Copy .next/static → standalone/.next/static
const staticSrc = path.join(ROOT, '.next', 'static');
const staticDest = path.join(STANDALONE, '.next', 'static');
console.log('  Copying .next/static...');
copyDirSync(staticSrc, staticDest);

// 2. Copy public/ → standalone/public/
const publicSrc = path.join(ROOT, 'public');
const publicDest = path.join(STANDALONE, 'public');
console.log('  Copying public/...');
copyDirSync(publicSrc, publicDest);

// 3. Copy Prisma client + engine into standalone node_modules
const prismaClientSrc = path.join(ROOT, 'node_modules', '.prisma');
const prismaClientDest = path.join(STANDALONE, 'node_modules', '.prisma');
console.log('  Copying .prisma engine...');
copyDirSync(prismaClientSrc, prismaClientDest);

const prismaModuleSrc = path.join(ROOT, 'node_modules', '@prisma', 'client');
const prismaModuleDest = path.join(STANDALONE, 'node_modules', '@prisma', 'client');
console.log('  Copying @prisma/client...');
copyDirSync(prismaModuleSrc, prismaModuleDest);

console.log('[prepare-electron] Done! Ready for electron-builder.');

