import fs from 'node:fs';
import path from 'node:path';

if (process.platform !== 'darwin') {
  process.exit(0);
}

const rootDir = process.cwd();
const helperPaths = [
  path.join(rootDir, 'node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper'),
  path.join(rootDir, 'node_modules/node-pty/prebuilds/darwin-x64/spawn-helper'),
];

for (const helperPath of helperPaths) {
  if (!fs.existsSync(helperPath)) {
    continue;
  }

  try {
    fs.chmodSync(helperPath, 0o755);
  } catch (error) {
    console.warn(`[fix-node-pty] Failed to chmod ${helperPath}:`, error);
  }
}
