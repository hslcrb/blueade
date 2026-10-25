#!/usr/bin/env node
'use strict';
// Bluade offline Electron app.asar packaging. No external build-time dependencies.
// ASAR layout specification: https://github.com/electron/asar#format
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const INCLUDED = ['package.json', 'src', 'assets', 'node_modules'];
const BLOCK_SIZE = 1024 * 1024;
const EXCLUDED = new Set(['.package-lock.json', '.DS_Store', 'Thumbs.db']);
function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function enumerate(location, prefix = '') {
  const stats = fs.lstatSync(location);
  if (stats.isSymbolicLink()) throw new Error(`Refusing symlink: ${location}`);
  if (stats.isFile()) {
    if (EXCLUDED.has(path.basename(location))) return [];
    return [{absolute: location, archivePath: prefix.replaceAll('\\', '/'), size: stats.size}];
  }
  if (!stats.isDirectory()) throw new Error(`Unsupported path: ${location}`);
  const out = [];
  for (const name of fs.readdirSync(location).sort()) {
    if (EXCLUDED.has(name)) continue;
    out.push(...enumerate(path.join(location, name), prefix ? `${prefix}/${name}` : name));
  }
  return out;
}
function writeU32Pickle(n) {
  const result = Buffer.alloc(8);
  result.writeUInt32LE(4, 0); // uint32 payload size
  result.writeUInt32LE(n, 4);
  return result;
}
function writeStringPickle(content) {
  const bytes = Buffer.from(content, 'utf8');
  const pad = (4 - bytes.length % 4) % 4;
  const result = Buffer.alloc(8 + bytes.length + pad);
  result.writeUInt32LE(4 + bytes.length + pad, 0); // payload size
  result.writeUInt32LE(bytes.length, 4); // string byte length
  bytes.copy(result, 8);
  return result;
}
function validateHeaderNode(node, filename, entry) {
  const parts = filename.split('/');
  let cursor = node;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor.files[key]) cursor.files[key] = {files: {}};
    cursor = cursor.files[key];
    if (!cursor.files) throw new Error(`Duplicate archive path: ${filename}`);
  }
  const basename = parts.at(-1);
  if (cursor.files[basename]) throw new Error(`Duplicate archive filename: ${filename}`);
  cursor.files[basename] = entry;
}
function build(output) {
  const files = INCLUDED.flatMap(name => enumerate(path.join(ROOT, name), name));
  assert(files.length > 0, 'No files selected for ASAR');
  const header = {files: {}};
  let offset = 0;
  const bytes = [];
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) throw new Error('Unexpectedly large asset: ' + file.archivePath);
    const content = fs.readFileSync(file.absolute);
    const blocks = [];
    for (let i = 0; i < content.length; i += BLOCK_SIZE) {
      blocks.push(hash(content.subarray(i, i + BLOCK_SIZE)));
    }
    validateHeaderNode(header, file.archivePath, {
      size: content.length,
      offset: String(offset),
      integrity: {algorithm: 'SHA256', hash: hash(content), blockSize: BLOCK_SIZE, blocks}
    });
    bytes.push(content);
    offset += content.length;
  }
  const serialized = writeStringPickle(JSON.stringify(header));
  const prefix = writeU32Pickle(serialized.length);
  const target = path.resolve(output);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  const temp = `${target}.part`;
  try {
    fs.writeFileSync(temp, Buffer.concat([prefix, serialized, ...bytes]));
    fs.renameSync(temp, target);
  } finally { if (fs.existsSync(temp)) fs.rmSync(temp); }
  return {output: target, sha256: hash(fs.readFileSync(target)), files: files.length, bytes: offset, archiveBytes: fs.statSync(target).size};
}
function inspect(archivePath, verify = false) {
  const data = fs.readFileSync(archivePath);
  if (data.length < 16 || data.readUInt32LE(0) !== 4) throw new Error('Invalid ASAR header-size pickle');
  const len = data.readUInt32LE(4);
  if (len > data.length - 8 || len < 8) throw new Error('Invalid ASAR header length');
  const payloadLen = data.readUInt32LE(8);
  const jsonLength = data.readUInt32LE(12);
  if (payloadLen !== len - 4 || jsonLength > len - 8) throw new Error('Invalid ASAR JSON pickle');
  const tree = JSON.parse(data.subarray(16, 16 + jsonLength).toString('utf8'));
  const contentOffset = 8 + len;
  let count = 0;
  function walk(node) {
    for (const item of Object.values(node.files || {})) {
      if (item.files) { walk(item); continue; }
      const offset = Number(item.offset);
      if (!Number.isSafeInteger(offset) || offset < 0 || contentOffset + offset + item.size > data.length) {
        throw new Error('Out-of-range ASAR entry');
      }
      if (verify) {
        const content = data.subarray(contentOffset + offset, contentOffset + offset + item.size);
        if (hash(content) !== item.integrity.hash) throw new Error('ASAR integrity mismatch');
        const blocks=[];
        for(let i=0;i<content.length;i+=item.integrity.blockSize)blocks.push(hash(content.subarray(i,i+item.integrity.blockSize)));
        if (JSON.stringify(blocks)!==JSON.stringify(item.integrity.blocks))throw new Error('ASAR block integrity mismatch');
      }
      count++;
    }
  }
  walk(tree);
  return {count, dataOffset: contentOffset, header: tree};
}
if (require.main === module) {
  const target = process.argv[2] || path.join(ROOT, 'dist', 'app.asar');
  const result = build(target);
  const check = inspect(target, true);
  console.log(JSON.stringify({...result, inspectedEntries:check.count, verified:check.count===result.files}, null, 2));
  if (check.count!==result.files) process.exitCode=1;
}
module.exports = {build, inspect};
