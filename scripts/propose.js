#!/usr/bin/env node
/**
 * propose.js — Create pending-change JSON for review.
 *
 * Usage:
 *   node propose.js <project-path> <action> [options]
 *
 * Actions:
 *   edit   --file <path> --old <text|@file> --new <text|@file> [--desc <text>] [--id <id>]
 *   create --file <path> --content <text|@file> [--desc <text>] [--id <id>]
 *   delete --file <path> [--desc <text>] [--id <id>]
 *
 * Multi-hunk edit (pipe JSON array to stdin):
 *   echo '[{"oldText":"a","newText":"b","description":"fix"}]' | node propose.js <project> edit-multi --file <path> [--desc <text>]
 *
 * --old/@file and --new/@file: if value starts with @, read from that file path.
 *
 * Examples:
 *   node propose.js bitstore-core edit --file libraries/fuse/foo.hpp \
 *     --old 'std::mutex' --new 'fc::mutex' --desc 'Use fiber-aware mutex'
 *
 *   node propose.js bitstore-core create --file libraries/fuse/new.hpp \
 *     --content @/tmp/new-file.hpp --desc 'Add new header'
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node propose.js <project-path> <action> [options]');
  process.exit(1);
}

const projectPath = args[0];
const action = args[1];

function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function resolveValue(val) {
  if (!val) return val;
  if (val.startsWith('@')) {
    const filePath = val.slice(1);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }
  return val;
}

const file = getArg('--file');
const desc = getArg('--desc') || `${action} ${file || 'unknown'}`;
let id = getArg('--id');

if (!file && action !== 'edit-multi') {
  console.error('--file is required');
  process.exit(1);
}

// ── Resolve project dir ─────────────────────────────────────────
// Try workspace-relative first, then absolute
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../..');
let projectDir = path.resolve(workspaceRoot, projectPath);
if (!fs.existsSync(projectDir)) {
  projectDir = path.resolve(projectPath);
}
if (!fs.existsSync(projectDir)) {
  console.error(`Project not found: ${projectPath}`);
  process.exit(1);
}

const pendingDir = path.join(projectDir, '.openclaw', 'pending-changes');
fs.mkdirSync(pendingDir, { recursive: true });

// ── Validate oldText against real file ──────────────────────────
function validateOldText(filePath, oldText) {
  const fullPath = path.join(projectDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`⚠ Target file not found: ${fullPath}`);
    console.error('  Cannot validate oldText. Proceeding anyway (file may exist on host).');
    return true;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  if (!content.includes(oldText)) {
    console.error(`✗ oldText NOT FOUND in ${filePath}`);
    console.error('  The text to replace does not exist in the file.');
    console.error(`  oldText (first 200 chars): ${oldText.slice(0, 200)}`);
    return false;
  }
  return true;
}

// ── Generate ID ─────────────────────────────────────────────────
if (!id) {
  const shortHash = crypto.randomBytes(3).toString('hex');
  const baseName = file ? path.basename(file, path.extname(file)) : 'change';
  id = `${baseName}-${action}-${shortHash}`;
}

// ── Build change object ─────────────────────────────────────────
let change;

switch (action) {
  case 'edit': {
    const oldText = resolveValue(getArg('--old'));
    const newText = resolveValue(getArg('--new'));
    if (!oldText || !newText) {
      console.error('edit requires --old and --new');
      process.exit(1);
    }
    if (!validateOldText(file, oldText)) {
      process.exit(1);
    }
    change = { id, file, description: desc, action: 'edit', oldText, newText, timestamp: Date.now() };
    break;
  }

  case 'edit-multi': {
    // Read edits array from stdin
    let input = '';
    try {
      input = fs.readFileSync(0, 'utf-8');
    } catch (e) {
      console.error('edit-multi requires JSON array on stdin');
      process.exit(1);
    }
    const edits = JSON.parse(input);
    if (!Array.isArray(edits) || edits.length === 0) {
      console.error('stdin must be a non-empty JSON array of {oldText, newText, description}');
      process.exit(1);
    }
    // Validate all oldTexts
    let allValid = true;
    for (const edit of edits) {
      if (!validateOldText(file, edit.oldText)) {
        allValid = false;
      }
    }
    if (!allValid) process.exit(1);
    change = { id, file, description: desc, action: 'edit', edits, timestamp: Date.now() };
    break;
  }

  case 'create': {
    const content = resolveValue(getArg('--content'));
    if (!content) {
      console.error('create requires --content (or --content @file)');
      process.exit(1);
    }
    change = { id, file, description: desc, action: 'create', fullContent: content, timestamp: Date.now() };
    break;
  }

  case 'delete': {
    change = { id, file, description: desc, action: 'delete', timestamp: Date.now() };
    break;
  }

  default:
    console.error(`Unknown action: ${action}`);
    process.exit(1);
}

// ── Write ───────────────────────────────────────────────────────
const outPath = path.join(pendingDir, `${id}.json`);
fs.writeFileSync(outPath, JSON.stringify(change, null, 2) + '\n');
console.log(`✓ ${outPath}`);
console.log(`  action: ${action}, file: ${file}`);
if (change.edits) {
  console.log(`  hunks: ${change.edits.length}`);
}
