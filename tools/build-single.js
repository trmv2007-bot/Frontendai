#!/usr/bin/env node
/**
 * Build single-file export — inlines all JS/CSS into one HTML
 * 100% frontend, no server, one file that runs anywhere
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const outFile = path.join(distDir, 'frontendai-os-single.html');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run npm run build first');
  process.exit(1);
}

const indexHtmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf-8');

// Find all script and link tags
const assetRegex = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g;
const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/g;

let match;

// Inline scripts
const scripts = [];
while ((match = assetRegex.exec(html)) !== null) {
  scripts.push(match[1]);
}

for (const src of scripts) {
  if (src.startsWith('http') || src.startsWith('//')) continue;
  const cleanSrc = src.split('?')[0].replace(/^\//, '');
  const filePath = path.join(distDir, cleanSrc);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Escape </script> inside
    const safe = content.replace(/<\/script>/gi, '<\\/script>');
    html = html.replace(
      new RegExp(`<script[^>]+src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*><\\/script>`),
      `<script type="module">\n${safe}\n</script>`
    );
    console.log(`Inlined ${src} (${(content.length/1024).toFixed(1)} kB)`);
  }
}

// Inline CSS
const links = [];
let linkMatch;
while ((linkMatch = linkRegex.exec(html)) !== null) {
  const tag = linkMatch[0];
  if (tag.includes('rel="stylesheet"') || tag.includes("rel='stylesheet'")) {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/);
    if (hrefMatch) links.push({ tag, href: hrefMatch[1] });
  }
}

for (const { tag, href } of links) {
  if (href.startsWith('http') || href.startsWith('//')) continue;
  const cleanHref = href.split('?')[0].replace(/^\//, '');
  const filePath = path.join(distDir, cleanHref);
  if (fs.existsSync(filePath)) {
    const css = fs.readFileSync(filePath, 'utf-8');
    html = html.replace(tag, `<style>\n${css}\n</style>`);
    console.log(`Inlined CSS ${href} (${(css.length/1024).toFixed(1)} kB)`);
  }
}

// Add single-file banner
const banner = `
<!--
  FrontendAI OS — Single File Export
  100% frontend, no backend, private, local.
  Generated: ${new Date().toISOString()}
  Size: ${(html.length/1024/1024).toFixed(2)} MB
  Just open this file in any browser — it works offline!
  Includes: Chat, Voice, Vision, Canvas, Python, Node, Files, OPFS, Swarm, CRDT, Multi-agent, RAG, Plugins, Voice Clone, V2V
  Export your IndexedDB data via Vault > Export if you want to carry memories.
-->
`;

html = html.replace('<head>', `<head>\n${banner}`);

// Add single-file marker script
const markerScript = `
<script>
  window.__FRONTENDAI_SINGLE_FILE__ = true;
  console.log('%c FrontendAI OS — Single File ', 'background:#8b5cf6;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold');
  console.log('100% frontend, no backend. Open this file anywhere, works offline after first load (models cached).');
</script>
`;

html = html.replace('</head>', `${markerScript}\n</head>`);

fs.writeFileSync(outFile, html, 'utf-8');
console.log(`\n✅ Single file built: ${outFile}`);
console.log(`   Size: ${(fs.statSync(outFile).size/1024/1024).toFixed(2)} MB`);
console.log(`   Open it in browser — no server needed!`);
