#!/usr/bin/env node
/**
 * Build Chrome Extension — copies dist into extension/dist and zips
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const extDir = path.join(root, 'extension');
const extDistDir = path.join(extDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run npm run build first');
  process.exit(1);
}

// Clean old ext dist
if (fs.existsSync(extDistDir)) {
  fs.rmSync(extDistDir, { recursive: true, force: true });
}
fs.mkdirSync(extDistDir, { recursive: true });

// Copy dist files
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const file of fs.readdirSync(distDir)) {
  if (file === 'frontendai-os-single.html') continue; // skip single file, too big for extension
  copyRecursive(path.join(distDir, file), path.join(extDistDir, file));
}

console.log(`Copied dist/ -> extension/dist/ (${fs.readdirSync(extDistDir).length} items)`);

// Create app.html that loads the extension dist (for sidepanel fallback)
const appHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FrontendAI OS</title>
  <style>html,body{margin:0;height:100%;background:#0a0a0f}</style>
  <script>
    // Redirect to dist/index.html
    location.href = './dist/index.html' + location.search;
  </script>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#8b5cf6;font-family:monospace">Loading FrontendAI OS...</div>
</body>
</html>
`;
fs.writeFileSync(path.join(extDir, 'app.html'), appHtml);

// Try to zip
const zipPath = path.join(root, 'dist', 'frontendai-os-extension.zip');
try {
  // Use Node to create zip via best effort — if zip command exists, use it
  if (fs.existsSync('/usr/bin/zip') || fs.existsSync('/usr/local/bin/zip')) {
    execSync(`cd "${extDir}" && zip -r "${zipPath}" . -x "dist/*.map" "*.DS_Store"`, { stdio: 'inherit' });
    console.log(`\n✅ Extension zipped: ${zipPath} (${(fs.statSync(zipPath).size/1024).toFixed(1)} kB)`);
  } else {
    console.log('\n⚠️ zip not found, skipping zip — extension folder ready at extension/');
    console.log(`   Load unpacked in chrome://extensions -> Load unpacked -> select ${extDir}`);
  }
} catch (e) {
  console.log('\n⚠️ zip failed, but extension folder ready:', extDir);
  console.log(`   Load unpacked in chrome://extensions -> Load unpacked -> select ${extDir}`);
}

console.log(`
✅ Extension built:
   - Unpacked: ${extDir}
   - Packed (if zip succeeded): ${zipPath}

To install:
  1. Open chrome://extensions
  2. Enable Developer mode
  3. Load unpacked -> select extension/ folder
  4. Pin FrontendAI OS, click orb on any page or use Ctrl+Shift+O
  5. Side panel: click extension icon -> Open Side Panel
`);
