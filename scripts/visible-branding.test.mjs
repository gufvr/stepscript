import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');

describe('visible StepScript branding', () => {
  it('uses StepScript in the extension manifest without changing its release contract', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(projectRoot, 'public/manifest.json'), 'utf8'),
    );

    expect(manifest).toMatchObject({
      name: 'StepScript',
      description:
        'Grave fluxos no navegador e transforme-os em testes automatizados.',
      version: '0.5.0',
      minimum_chrome_version: '116',
      action: { default_title: 'Abrir StepScript' },
    });
    expect(manifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'sidePanel',
      'storage',
      'webNavigation',
    ]);
  });

  it('uses StepScript as the document title', () => {
    const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');

    expect(html).toContain('<title>StepScript</title>');
  });

  it('uses StepScript in the concise English README and package name', () => {
    const readme = readFileSync(resolve(projectRoot, 'README.md'), 'utf8');
    const packageScript = readFileSync(
      resolve(projectRoot, 'scripts/package-extension.mjs'),
      'utf8',
    );

    expect(readme).toContain('<h1 align="center">StepScript</h1>');
    expect(readme).toContain('## Core features');
    expect(readme).toContain('## Load the unpacked extension');
    expect(readme).toContain('`stepscript-extension.zip`');
    expect(readme).not.toMatch(/flow[s]nap/i);
    expect(readme).toContain('src="assets/stepscript-logo.png"');
    expect(existsSync(resolve(projectRoot, 'assets/stepscript-logo.png'))).toBe(true);
    expect(packageScript).toContain("'stepscript-extension.zip'");
    expect(packageScript).not.toMatch(/flow[s]nap-extension\.zip/i);
  });

  it('rejects legacy branding outside the explicit line allowlist', () => {
    const allowlistPath = 'scripts/branding-legacy-allowlist.json';
    const allowlist = JSON.parse(
      readFileSync(resolve(projectRoot, allowlistPath), 'utf8'),
    );
    const files = execFileSync(
      'git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { cwd: projectRoot, encoding: 'utf8' },
    ).split('\0').filter(Boolean);
    const textExtensions = new Set([
      '.ts', '.tsx', '.js', '.mjs', '.json', '.html', '.css', '.svg', '.md',
      '.yml', '.yaml', '.txt',
    ]);
    const violations = [];
    const remaining = new Map(allowlist.map(({ path, line, reason }) => {
      expect(reason.trim()).not.toBe('');
      expect(line).toMatch(/flow[s]nap/i);
      expect(files).toContain(path);
      return [`${path}:${line}`, 1];
    }));
    expect(remaining.size).toBe(allowlist.length);

    for (const path of files) {
      if (/flow[s]nap/i.test(path)) violations.push(path);
      if (path === allowlistPath || !textExtensions.has(extname(path))) continue;
      readFileSync(resolve(projectRoot, path), 'utf8').split(/\r?\n/)
        .forEach((line, index) => {
          if (!/flow[s]nap/i.test(line)) return;
          const key = `${path}:${line.trim()}`;
          if (remaining.get(key) === 1) remaining.set(key, 0);
          else violations.push(`${path}:${index + 1}: ${line.trim()}`);
        });
    }
    expect(violations).toEqual([]);
    expect([...remaining].filter(([, count]) => count !== 0)).toEqual([]);
  });
});
