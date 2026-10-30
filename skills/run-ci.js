#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { runSkills } = require('./local-skills');

const root = path.resolve(__dirname, '..');
let urls = [];
const sourceFile = path.join(root, 'social-sources.json');
if (fs.existsSync(sourceFile)) {
  try {
    const config = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    urls = (Array.isArray(config) ? config : (config.sources || [])).map((item) => typeof item === 'string' ? item : item.url).filter(Boolean);
  } catch (error) {
    console.error(`Cannot read social-sources.json: ${error.message}`);
    process.exit(2);
  }
}

const results = runSkills(undefined, { urls });
console.log(JSON.stringify({ execution: 'local-deterministic', token_cost: 0, results }, null, 2));
const failed = results.filter((item) => !item.passed);
if (failed.length) {
  console.error(`Local skills blocked deployment: ${failed.map((item) => item.id).join(', ')}`);
  process.exit(1);
}
console.error(`Local skills passed: ${results.length}/${results.length}. LLM token cost: 0.`);
