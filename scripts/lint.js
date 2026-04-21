#!/usr/bin/env node
// Minimal zero-dependency lint: syntax-check every JS file we ship or test
// with `node --check`, and validate manifest.json is well-formed JSON.
// Intentionally light — we don't want to pull in ESLint just for this.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'test-results',
  'playwright-report',
  'screenshots',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

let failed = 0;

const jsFiles = walk(ROOT);
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failed++;
    const stderr = err.stderr ? err.stderr.toString() : String(err);
    console.error(`✗ ${path.relative(ROOT, file)}`);
    console.error(stderr);
  }
}

const manifestPath = path.join(ROOT, 'manifest.json');
try {
  JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (err) {
  failed++;
  console.error(`✗ manifest.json: ${err.message}`);
}

if (failed > 0) {
  console.error(`\nLint failed: ${failed} error(s).`);
  process.exit(1);
}

console.log(`Lint OK: ${jsFiles.length} JS files + manifest.json.`);
