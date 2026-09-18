import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const buildDirectory = resolve(projectRoot, 'dist');
const extensionDirectory = resolve(
  projectRoot,
  'test-results',
  'extension-e2e',
  'unpacked',
);
const fixtureOriginPattern = 'http://127.0.0.1/*';

await rm(extensionDirectory, { recursive: true, force: true });
await mkdir(extensionDirectory, { recursive: true });
await cp(buildDirectory, extensionDirectory, { recursive: true });

const manifestPath = resolve(extensionDirectory, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<
  string,
  unknown
>;

manifest.host_permissions = [fixtureOriginPattern];
delete manifest.optional_host_permissions;

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `Prepared the StepScript extension E2E build at ${extensionDirectory}.`,
);

// Keep a second, unmodified manifest to exercise stale-context rejection without
// any pre-granted fixture origin. The successful legacy flow retains its fixture
// grant, because Chromium's native extension consent dialog is not automated.
const optionalExtensionDirectory = resolve(projectRoot, 'test-results', 'extension-e2e', 'optional-unpacked');
await mkdir(optionalExtensionDirectory, { recursive: true });
await cp(buildDirectory, optionalExtensionDirectory, { recursive: true });
