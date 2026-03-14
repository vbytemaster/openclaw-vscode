#!/usr/bin/env node
/**
 * clean.js — Remove all pending changes for a project.
 *
 * Usage: node clean.js <project-path> [--dry-run]
 *
 * Example: node clean.js bitstore-core
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node clean.js <project-path> [--dry-run]');
  process.exit(1);
}

const projectPath = args[0];
const dryRun = args.includes('--dry-run');
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../..');
let projectDir = path.resolve(workspaceRoot, projectPath);
if (!fs.existsSync(projectDir)) projectDir = path.resolve(projectPath);

const pendingDir = path.join(projectDir, '.openclaw', 'pending-changes');

if (!fs.existsSync(pendingDir)) {
  console.log('No pending-changes directory.');
  process.exit(0);
}

const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No pending changes to clean.');
  process.exit(0);
}

for (const file of files) {
  const fullPath = path.join(pendingDir, file);
  if (dryRun) {
    console.log(`[dry-run] Would delete: ${file}`);
  } else {
    fs.unlinkSync(fullPath);
    console.log(`✗ Deleted: ${file}`);
  }
}

console.log(`\n${dryRun ? 'Would delete' : 'Deleted'} ${files.length} file(s).`);
