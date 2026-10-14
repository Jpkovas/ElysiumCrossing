import { backup, DatabaseSync } from 'node:sqlite';
import { constants, openSync, closeSync, fsyncSync, fstatSync, readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync, chmodSync } from 'node:fs';
import { resolve, join, dirname, relative, isAbsolute, basename, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const FORMAT = 'elysium-store-snapshot-v1';
const TABLES = ['saves', 'save_passports', 'save_nes'];
const READERS = ['server/passport.ts', 'server/gci.ts', 'shared/contracts.ts'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
const within = (a, b) => { const r = relative(a, b); return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r)); };

function directory(path) {
  const absolute = resolve(path);
  if (!lstatSync(absolute).isDirectory() || realpathSync(absolute) !== absolute) fail('Diretório inexistente, simbólico ou não canônico.');
  return absolute;
}
function destination(source, path) {
  const absolute = join(directory(dirname(resolve(path))), basename(resolve(path)));
  if (within(source, absolute) || within(absolute, source)) fail('Origem e destino não podem se sobrepor.');
  // mkdir sem recursive/exist_ok é a reserva exclusiva: nunca sobrescreve.
  mkdirSync(absolute, { mode: 0o700 });
  mkdirSync(join(absolute, 'saves'), { mode: 0o700 });
  return absolute;
}
function readRegular(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) fail('O snapshot aceita somente arquivos regulares.');
    return readFileSync(fd);
  } finally { closeSync(fd); }
}
function writeExclusive(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
function syncDirectory(path) {
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function standaloneDatabase(store) {
  for (const suffix of ['-wal', '-shm', '-journal']) {
    if (lstatSync(join(store, `platform.sqlite${suffix}`), { throwIfNoEntry: false })) fail('Snapshot incompleto: SQLite não está independente de WAL/SHM/journal.');
  }
  const bytes = readRegular(join(store, 'platform.sqlite'));
  if (bytes.subarray(0, 16).toString() !== 'SQLite format 3\0' || bytes[18] !== 1 || bytes[19] !== 1) fail('O snapshot exige SQLite autônomo em journal_mode DELETE.');
  return bytes;
}
async function readers(backendDir) {
  const backend = directory(backendDir);
  const pins = READERS.map(path => ({ path, sha256: sha256(readRegular(join(backend, path))) }));
  const { inspectCheckpoint } = await import(pathToFileURL(join(backend, 'server/passport.ts')).href);
  return { inspectCheckpoint, pins };
}
function databaseReferences(db) {
  const checks = db.prepare('PRAGMA integrity_check').all();
  if (checks.length !== 1 || Object.values(checks[0])[0] !== 'ok') fail('integrity_check rejeitou o SQLite.');
  if (db.prepare('PRAGMA foreign_key_check').all().length) fail('foreign_key_check rejeitou o SQLite.');
  const stale = db.prepare('SELECT u.id FROM users u LEFT JOIN saves s ON s.user_id=u.id AND s.revision=u.revision WHERE u.revision>0 AND s.user_id IS NULL').all();
  if (stale.length) fail('Uma revisão atual não tem o save correspondente.');
  const fileTables = db.prepare("SELECT m.name FROM sqlite_schema m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND p.name='filename' ORDER BY m.name").all().map(row => row.name);
  if (JSON.stringify(fileTables) !== JSON.stringify([...TABLES].sort())) fail('As tabelas de blobs diferem do esquema atual; nenhuma conversão será feita.');
  const rows = TABLES.flatMap(table => db.prepare(`SELECT user_id,revision,filename,size,sha256 FROM ${table} ORDER BY user_id,revision`).all().map(row => ({ table, ...row })));
  for (const row of rows) {
    const ext = { saves: 'gci', save_passports: 'passport', save_nes: 'nes' }[row.table];
    if (typeof row.user_id !== 'string' || !/^[\w-]+$/u.test(row.user_id) || !Number.isSafeInteger(row.revision) || row.revision < 1
      || !Number.isSafeInteger(row.size) || row.size <= 0 || !/^[a-f0-9]{64}$/u.test(row.sha256)
      || row.filename !== `${row.user_id}-${row.revision}-${row.sha256}.${ext}`) fail('Referência de blob inválida.');
  }
  if (new Set(rows.map(row => row.filename)).size !== rows.length) fail('Referências de blobs duplicadas.');
  return rows;
}
function checkedBlob(store, row) {
  const bytes = readRegular(join(store, 'saves', row.filename));
  if (bytes.length !== row.size || sha256(bytes) !== row.sha256) fail('Tamanho ou SHA256 de blob divergente.');
  return bytes;
}
function inspectStore(store, inspectCheckpoint, copyTo) {
  directory(join(store, 'saves'));
  const db = new DatabaseSync(join(store, 'platform.sqlite'), { readOnly: true });
  try {
    const rows = databaseReferences(db);
    const related = new Map(rows.filter(row => row.table !== 'saves').map(row => [`${row.table}:${row.user_id}:${row.revision}`, row]));
    for (const row of rows.filter(row => row.table === 'saves')) {
      const component = table => {
        const ref = related.get(`${table}:${row.user_id}:${row.revision}`);
        if (!ref) return null;
        const bytes = checkedBlob(store, ref);
        if (copyTo) writeExclusive(join(copyTo, 'saves', ref.filename), bytes);
        return bytes;
      };
      const town = checkedBlob(store, row), passport = component('save_passports'), nes = component('save_nes');
      inspectCheckpoint({ town, passport, nes });
      if (copyTo) writeExclusive(join(copyTo, 'saves', row.filename), town);
    }
    return rows;
  } finally { db.close(); }
}

/** Source is read-only. SQLite chooses a coherent committed cut; immutable blobs follow that cut. */
export async function snapshotStore(sourceDir, destinationDir, backendDir) {
  const source = directory(sourceDir), reader = await readers(backendDir);
  readRegular(join(source, 'platform.sqlite')); // Refuse absent/non-regular/symlink DB before creating output.
  const target = destination(source, destinationDir);
  const db = new DatabaseSync(join(source, 'platform.sqlite'), { readOnly: true, timeout: 5000 });
  try { await backup(db, join(target, 'platform.sqlite')); } finally { db.close(); }
  chmodSync(join(target, 'platform.sqlite'), 0o600);
  // Only the new copy is changed: produce one independent DB, without copying WAL/SHM.
  const copiedDB = new DatabaseSync(join(target, 'platform.sqlite'));
  try { copiedDB.exec('PRAGMA journal_mode=DELETE;'); } finally { copiedDB.close(); }
  syncDirectory(join(target, 'platform.sqlite'));
  // References MUST come from the backed-up database, never a second query of the live source.
  const referenceDB = new DatabaseSync(join(target, 'platform.sqlite'), { readOnly: true });
  let rows;
  try { rows = databaseReferences(referenceDB); } finally { referenceDB.close(); }
  directory(join(source, 'saves'));
  for (const row of rows) writeExclusive(join(target, 'saves', row.filename), checkedBlob(source, row));
  const verified = inspectStore(target, reader.inspectCheckpoint);
  const bytes = standaloneDatabase(target);
  const manifest = { format: FORMAT, completedAt: new Date().toISOString(), readers: reader.pins,
    database: { bytes: bytes.length, sha256: sha256(bytes) }, references: verified,
    checkpoints: verified.filter(row => row.table === 'saves').length };
  syncDirectory(join(target, 'saves'));
  writeExclusive(join(target, 'snapshot.json'), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  syncDirectory(target);
  syncDirectory(dirname(target));
  return { store: target, checkpoints: manifest.checkpoints, blobs: verified.length, databaseSHA256: manifest.database.sha256 };
}

export async function verifySnapshot(snapshotDir, backendDir) {
  const store = directory(snapshotDir), reader = await readers(backendDir);
  const manifest = JSON.parse(readRegular(join(store, 'snapshot.json')).toString('utf8'));
  if (manifest.format !== FORMAT || JSON.stringify(manifest.readers) !== JSON.stringify(reader.pins)) fail('Formato ou leitores do snapshot diferem; nenhuma migração será feita.');
  const bytes = standaloneDatabase(store);
  if (bytes.length !== manifest.database?.bytes || sha256(bytes) !== manifest.database?.sha256) fail('SHA256 do SQLite divergente.');
  const rows = inspectStore(store, reader.inspectCheckpoint);
  if (JSON.stringify(rows) !== JSON.stringify(manifest.references) || manifest.checkpoints !== rows.filter(row => row.table === 'saves').length) fail('Manifesto não corresponde às referências do SQLite.');
  return { store, checkpoints: manifest.checkpoints, blobs: rows.length, databaseSHA256: manifest.database.sha256 };
}

export async function restoreStore(snapshotDir, destinationDir, backendDir) {
  const verified = await verifySnapshot(snapshotDir, backendDir);
  const reader = await readers(backendDir), target = destination(verified.store, destinationDir);
  writeExclusive(join(target, 'platform.sqlite'), readRegular(join(verified.store, 'platform.sqlite')));
  inspectStore(verified.store, reader.inspectCheckpoint, target);
  syncDirectory(join(target, 'saves'));
  writeExclusive(join(target, 'snapshot.json'), readRegular(join(verified.store, 'snapshot.json')));
  syncDirectory(target);
  syncDirectory(dirname(target));
  return verifySnapshot(target, backendDir);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, i) => [args[i * 2], args[i * 2 + 1]]));
  const expected = command === 'verify' ? ['--source', '--backend'] : ['--source', '--destination', '--backend'];
  if (!['snapshot', 'verify', 'restore'].includes(command) || args.length !== expected.length * 2
    || Object.keys(options).length !== expected.length || expected.some(key => !options[key])) {
    console.error('Uso: node --import tsx store-snapshot.mjs snapshot|restore --source /caminho --destination /novo --backend /backend-fechado\n     node --import tsx store-snapshot.mjs verify --source /snapshot --backend /backend-fechado');
    process.exitCode = 1;
  } else {
    try {
      const result = command === 'verify' ? await verifySnapshot(options['--source'], options['--backend'])
        : await (command === 'snapshot' ? snapshotStore : restoreStore)(options['--source'], options['--destination'], options['--backend']);
      console.log(JSON.stringify({ status: 'VERIFIED', operation: command, ...result }));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
