import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = 'public-export-manifest.json';
const manifestBytes = await readFile(join(root, manifestPath));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
if (manifest.schema !== 1 || !Array.isArray(manifest.files)) throw new Error('Manifesto inválido.');
const expected = new Map();
for (const file of manifest.files) {
  if (typeof file.path !== 'string' || file.path.startsWith('/') || file.path.includes('..')
    || file.path.includes('\\') || expected.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)
    || !Number.isSafeInteger(file.bytes) || file.bytes < 0
    || !['100644', '100755'].includes(file.mode)) throw new Error('Entrada inválida no manifesto.');
  expected.set(file.path, file);
}
const actual = [];
async function walk(directory) {
  for (const name of await readdir(directory)) {
    if (directory === root && (name === '.git' || name === 'node_modules')) continue;
    const path = join(directory, name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`Symlink não permitido: ${relative(root, path)}`);
    if (stat.isDirectory()) await walk(path);
    else if (stat.isFile()) actual.push(relative(root, path).split('\\').join('/'));
    else throw new Error(`Tipo de arquivo não permitido: ${relative(root, path)}`);
  }
}
await walk(root);
const decoder = new TextDecoder('utf-8', { fatal: true });
const prohibited = /\.(?:gci|sav|ec-save|iso|gcm|rom|wasm|bin|arc|narc|szs|pem|key|sqlite|db|png|jpg|jpeg|webp|gif|ogg|wav|mp3|zip|gz|tar)$/i;
for (const path of actual.sort()) {
  if (path === manifestPath) continue;
  const file = expected.get(path);
  if (!file) throw new Error(`Arquivo não declarado: ${path}`);
  if (prohibited.test(path) || /^(?:client|data|output|node_modules)\//.test(path)
    || /(^|\/)\.env(?:\.|$)/.test(path)) throw new Error(`Arquivo privado não permitido: ${path}`);
  const bytes = await readFile(join(root, path));
  const mode = (await lstat(join(root, path))).mode & 0o111 ? '100755' : '100644';
  if (mode !== file.mode) throw new Error(`Modo divergente: ${path}`);
  decoder.decode(bytes);
  if (bytes.includes(0)) throw new Error(`Conteúdo binário não permitido: ${path}`);
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
    throw new Error(`Tamanho ou SHA-256 divergente: ${path}`);
  }
  expected.delete(path);
}
if (expected.size) throw new Error(`Arquivos ausentes: ${[...expected.keys()].join(', ')}`);
console.log(`Exportação verificada: ${actual.length - 1} arquivos textuais, inventário exato e hashes correspondentes.`);

const args = process.argv.slice(2);
if (args.length) {
  const index = args.length === 1 && args[0] === '--git-index';
  const tree = args.length === 2 && args[0] === '--git-tree';
  if (!index && !tree) throw new Error('Use --git-index ou --git-tree <ref>.');
  const git = values => execFileSync('git', ['-C', root, ...values]);
  const listing = git(index ? ['ls-files', '--stage', '-z'] : ['ls-tree', '-r', '-z', '--full-tree', args[1]]);
  const declared = new Map(manifest.files.map(file => [file.path, file]));
  let foundManifest = false;
  for (const record of listing.toString('utf8').split('\0').filter(Boolean)) {
    const match = record.match(index ? /^(\d+) ([a-f0-9]+) (\d)\t(.+)$/u : /^(\d+) (blob) ([a-f0-9]+)\t(.+)$/u);
    if (!match || index && match[3] !== '0') throw new Error('Entrada Git inválida ou em conflito.');
    const mode = match[1], oid = match[index ? 2 : 3], path = match[4];
    const bytes = git(['cat-file', 'blob', oid]);
    if (path === manifestPath) {
      if (foundManifest || mode !== '100644' || !bytes.equals(manifestBytes)) throw new Error('Manifesto Git divergente.');
      foundManifest = true; continue;
    }
    const file = declared.get(path);
    if (!file || file.mode !== mode || bytes.length !== file.bytes
      || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Blob ou modo Git divergente: ${path}`);
    declared.delete(path);
  }
  if (!foundManifest || declared.size) throw new Error('Inventário Git incompleto.');
  console.log(`${index ? 'Índice' : 'Árvore'} Git verificado: blobs e modos correspondem ao manifesto aprovado.`);
}
