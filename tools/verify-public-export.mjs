import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = 'public-export-manifest.json';
const manifest = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
if (manifest.schema !== 1 || !Array.isArray(manifest.files)) throw new Error('Manifesto inválido.');
const expected = new Map();
for (const file of manifest.files) {
  if (typeof file.path !== 'string' || file.path.startsWith('/') || file.path.includes('..')
    || file.path.includes('\\') || expected.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)
    || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Entrada inválida no manifesto.');
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
  decoder.decode(bytes);
  if (bytes.includes(0)) throw new Error(`Conteúdo binário não permitido: ${path}`);
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
    throw new Error(`Tamanho ou SHA-256 divergente: ${path}`);
  }
  expected.delete(path);
}
if (expected.size) throw new Error(`Arquivos ausentes: ${[...expected.keys()].join(', ')}`);
console.log(`Exportação verificada: ${actual.length - 1} arquivos textuais, inventário exato e hashes correspondentes.`);
