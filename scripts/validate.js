#!/usr/bin/env node
/**
 * validate.js — Validate all pending changes for a project.
 *
 * Checks:
 *   1. JSON is valid
 *   2. Required fields exist (id, file, action)
 *   3. For edit actions: oldText exists in target file
 *   4. For edit-multi: all edits[].oldText exist in target file
 *   5. Conflict detection: multiple changes touching same file
 *
 * Usage: node validate.js <project-path>
 *
 * Example: node validate.js bitstore-core
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node validate.js <project-path>');
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
  console.log('No pending changes to validate.');
  process.exit(0);
}

let errors = 0;
let warnings = 0;
const fileMap = new Map(); // file → [change ids]

for (const file of files) {
  const fullPath = path.join(pendingDir, file);
  let data;

  // 1. Parse JSON
  try {
    data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch (e) {
    console.error(`✗ ${file}: Invalid JSON — ${e.message}`);
    errors++;
    continue;
  }

  // 2. Required fields
  if (!data.id) { console.error(`✗ ${file}: Missing 'id'`); errors++; }
  if (!data.file) { console.error(`✗ ${file}: Missing 'file'`); errors++; continue; }
  if (!data.action) { console.error(`✗ ${file}: Missing 'action'`); errors++; continue; }

  // 5. Track files for conflict detection
  if (!fileMap.has(data.file)) fileMap.set(data.file, []);
  fileMap.get(data.file).push(data.id || file);

  // 3/4. Validate oldText
  if (data.action === 'edit') {
    const targetPath = path.join(projectDir, data.file);

    if (!fs.existsSync(targetPath)) {
      console.warn(`⚠ ${data.id}: Target file not found (may exist on host): ${data.file}`);
      warnings++;
      continue;
    }

    const content = fs.readFileSync(targetPath, 'utf-8');

    if (data.edits && Array.isArray(data.edits)) {
      // Multi-hunk
      for (let i = 0; i < data.edits.length; i++) {
        const edit = data.edits[i];
        if (!edit.oldText) {
          console.error(`✗ ${data.id} hunk[${i}]: Missing oldText`);
          errors++;
        } else if (!content.includes(edit.oldText)) {
          console.error(`✗ ${data.id} hunk[${i}]: oldText NOT FOUND in ${data.file}`);
          console.error(`    oldText: "${edit.oldText.slice(0, 100)}..."`);
          errors++;
        } else {
          console.log(`✓ ${data.id} hunk[${i}]: oldText matched`);
        }
      }
    } else if (data.oldText) {
      // Single edit
      if (!content.includes(data.oldText)) {
        console.error(`✗ ${data.id}: oldText NOT FOUND in ${data.file}`);
        console.error(`    oldText: "${data.oldText.slice(0, 100)}..."`);
        errors++;
      } else {
        console.log(`✓ ${data.id}: oldText matched`);
      }
    }
  } else if (data.action === 'create') {
    if (!data.fullContent) {
      console.error(`✗ ${data.id}: create action missing fullContent`);
      errors++;
    } else {
      console.log(`✓ ${data.id}: create (${data.fullContent.length} chars)`);
    }
  } else if (data.action === 'delete') {
    console.log(`✓ ${data.id}: delete ${data.file}`);
  }
}

// 5. Conflict report
console.log();
for (const [file, ids] of fileMap) {
  if (ids.length > 1) {
    console.warn(`⚠ CONFLICT: ${file} is touched by ${ids.length} changes: ${ids.join(', ')}`);
    warnings++;
  }
}

// Summary
console.log(`\n${files.length} change(s), ${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) process.exit(1);
