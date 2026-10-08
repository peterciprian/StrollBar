#!/usr/bin/env node
// Guards the design system: screens must consume sb-* atoms and design tokens instead of
// raw Angular Material controls or hard-coded colours/spacing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const APP_DIR = join(ROOT, 'src', 'app');
const ATOMS_DIR = join(APP_DIR, 'components', 'atoms');

const TEMPLATE_RULES = [
	{ pattern: /\bmat-(flat|raised|stroked|icon)-button\b/, message: 'raw Material button — use <sb-button> / <sb-icon-button>' },
	{ pattern: /<mat-form-field\b/, message: 'raw <mat-form-field> — use <sb-input>/<sb-select>/<sb-textarea>' },
	{ pattern: /\bmat-table\b/, message: 'raw mat-table — use <sb-table>' },
	{ pattern: /<mat-progress-(bar|spinner)\b/, message: 'raw Material progress — use <sb-progress-bar>/<sb-spinner>' }
];

const STYLE_RULES = [
	{ pattern: /#[0-9a-fA-F]{3,8}\b/, message: 'hard-coded colour — use a --sb-color-* token' },
	{ pattern: /!important/, message: '!important — drive Material CSS variables instead' },
	{ pattern: /::ng-deep/, message: '::ng-deep — expose an input on the child atom instead' },
	{ pattern: /@media\s*\(/, message: 'raw media query — use the sb-up()/sb-down() mixins' }
];

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, files);
		else files.push(full);
	}
	return files;
}

const violations = [];

for (const file of walk(APP_DIR)) {
	if (file.startsWith(ATOMS_DIR)) continue;
	const rules = file.endsWith('.html') ? TEMPLATE_RULES : file.endsWith('.scss') ? STYLE_RULES : null;
	if (!rules) continue;

	const lines = readFileSync(file, 'utf8').split(/\r?\n/);
	lines.forEach((line, index) => {
		if (line.includes('design-system-allow')) return;
		for (const rule of rules) {
			if (rule.pattern.test(line)) {
				violations.push(`${relative(ROOT, file).split(sep).join('/')}:${index + 1}  ${rule.message}`);
			}
		}
	});
}

if (violations.length > 0) {
	console.error(`Design system check failed (${violations.length} violation(s)):\n`);
	violations.forEach((entry) => console.error(`  ${entry}`));
	console.error('\nAdd a `design-system-allow` comment on the line to whitelist a deliberate exception.');
	process.exit(1);
}

console.log('Design system check passed.');
