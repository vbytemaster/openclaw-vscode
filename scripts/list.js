#!/usr/bin/env node
/**
 * list.js — List pending changes for a project.
 *
 * Usage: node list.js <project-path>
 *
 * Example: node list.js bitstore-core
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node list.js <project-path>');
  process.exit(1);
}

const projectPath = args[0];
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../..');
let projectDir = path.resolve(workspaceRoot, projectPath);
if (!fs.existsSync(projectDir)) projectDir = path.resolve(projectPath);

const pendingDir = path.join(projectDir, '.openclaw', 'pending-changes');

if (!fs.existsSync(pendingDir)) {
  console.log('No pending-changes directory.');
  process.exit(0);
}

const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json')).sort();

if (files.length === 0) {
  console.log('No pending changes.');
  process.exit(0);
}

console.log(`${files.length} pending change(s):\n`);

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(pendingDir, file), 'utf-8'));
    const hunks = data.edits ? data.edits.length : 1;
    const hunkLabel = data.edits ? ` (${hunks} hunks)` : '';
    console.log(`  ${data.id || file}`);
    console.log(`    action: ${data.action}, file: ${data.file}${hunkLabel}`);
    console.log(`    desc: ${data.description || '—'}`);
    console.log();
  } catch (e) {
    console.log(`  ${file} — PARSE ERROR: ${e.message}`);
  }
}
