#!/usr/bin/env node
/**
 * CLI for the plone-content-validator. Usage:
 *   plone-content validate [<content-dir>]   — export-shape validation
 *   plone-content check    [<content-dir>]   — graph integrity check
 *   plone-content all      [<content-dir>]   — both (exit non-zero on any error)
 *
 * <content-dir> defaults to cwd/content.
 */
'use strict';

const path = require('path');
const { validate, checkIntegrity, formatReport } = require(
  path.join(__dirname, '..', 'tests-playwright', 'fixtures', 'plone-content-validator.cjs'),
);

function usage() {
  console.error('Usage: plone-content <validate|check|all> [<content-dir>]');
  process.exit(2);
}

const [,, cmd, dirArg] = process.argv;
if (!cmd || !['validate', 'check', 'all'].includes(cmd)) usage();

const contentDir = path.resolve(dirArg || 'content');

let hasErrors = false;
if (cmd === 'validate' || cmd === 'all') {
  const r = validate(contentDir);
  console.log(formatReport('validate', r));
  if (r.errors.length) hasErrors = true;
}
if (cmd === 'check' || cmd === 'all') {
  if (cmd === 'all') console.log('');
  const r = checkIntegrity(contentDir);
  console.log(formatReport('check', r));
  if (r.errors.length) hasErrors = true;
}

process.exit(hasErrors ? 1 : 0);
