#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const YAML = require('yaml');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const required = ['README.md', 'README.zh-CN.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'CHANGELOG.md', 'package-lock.json', 'skills/html-media/SKILL.md', 'skills/html-media/LICENSE', 'skills/html-media/package-lock.json', '.github/workflows/ci.yml'];
for (const file of required) assert(fs.existsSync(path.join(root, file)), `Missing ${file}`);
const skill = read('skills/html-media/SKILL.md');
const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert(match, 'Skill YAML frontmatter missing');
const meta = YAML.parse(match[1]);
assert.equal(meta.name, 'html-media');
assert(typeof meta.description === 'string' && meta.description.length <= 1024, 'Invalid skill description');
assert.equal(meta.license, 'MIT');
assert.equal(read('LICENSE'), read('skills/html-media/LICENSE'), 'Packaged license differs');
const ui = YAML.parse(read('skills/html-media/agents/openai.yaml'));
assert(ui.interface.default_prompt.includes('$html-media'));
assert(ui.interface.short_description.length >= 25 && ui.interface.short_description.length <= 64);
const packageRoot = JSON.parse(read('package.json'));
const packageSkill = JSON.parse(read('skills/html-media/package.json'));
assert.equal(packageRoot.version, packageSkill.version);
assert.equal(packageRoot.devDependencies.playwright, packageSkill.dependencies.playwright);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git', 'outputs', '.test-output'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
let links = 0;
for (const file of walk(root)) {
  if (/\.ya?ml$/.test(file)) {
    const document = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
    assert.equal(document.errors.length, 0, `Invalid YAML: ${file}`);
  }
  if (!file.endsWith('.md')) continue;
  const content = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const link of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = link[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    assert(fs.existsSync(resolved), `Broken local link in ${path.relative(root, file)}: ${target}`);
    links++;
  }
}
for (const file of ['.github/ISSUE_TEMPLATE/bug_report.yml', '.github/ISSUE_TEMPLATE/feature_request.yml', '.github/ISSUE_TEMPLATE/showcase.yml']) {
  const form = YAML.parse(read(file));
  assert(form.name && form.description && Array.isArray(form.body), `Invalid issue form: ${file}`);
  const ids = form.body.filter(item => item.id).map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, `Duplicate issue field id: ${file}`);
}
console.log(`Validated skill metadata, licenses, dependency versions, YAML, issue forms, and ${links} local documentation links.`);
