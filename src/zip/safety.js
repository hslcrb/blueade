'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const LIMITS = Object.freeze({
  archiveBytes: 1024 * 1024 * 1024,   // ZIP archive <= 1 GiB
  totalBytes: 2 * 1024 * 1024 * 1024, // extracted or staged <= 2 GiB
  entryBytes: 512 * 1024 * 1024,      // one entry <= 512 MiB
  entries: 20000,
  maxDepth: 40
});

function normalizeEntry(name) {
  if (typeof name !== 'string' || !name || /[\x00-\x1f\x7f]/.test(name)) throw new Error('잘못된 압축 항목 이름입니다.');
  const value = name.replace(/\\/g, '/');
  if (/^(?:\/|[a-zA-Z]:|\/\/)/.test(value)) throw new Error(`절대 경로를 차단했습니다: ${name}`);
  if (value.split('/').some(part => part === '..' || part === '.' || /[. ]$/.test(part) || /[:*?"<>|]/.test(part)))
    throw new Error(`안전하지 않은 경로입니다: ${name}`);
  const parts = value.split('/').filter(Boolean);
  if (!parts.length || parts.length > LIMITS.maxDepth) throw new Error('허용하지 않는 경로 깊이입니다.');
  if (parts.some(part => /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)))
    throw new Error(`Windows 예약 이름이 있습니다: ${name}`);
  return parts.join('/');
}

function safeInside(root, relative) {
  const normalized = normalizeEntry(relative);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, ...normalized.split('/'));
  if (!absolute.startsWith(absoluteRoot + path.sep)) throw new Error('대상 폴더 밖으로 압축을 풀 수 없습니다.');
  return absolute;
}

async function assertNoSymlinkParents(root, target) {
  const absoluteRoot = path.resolve(root);
  const rel = path.relative(absoluteRoot, path.dirname(target));
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('폴더 경계 오류입니다.');
  // Never follow an existing symlink in any directory below the extraction root.
  let current = absoluteRoot;
  const segments = rel.split(path.sep).filter(Boolean);
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`안전하지 않은 대상 폴더: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.mkdir(current);
    }
  }
}

function isUnixSymlink(file) {
  const mode = (file.unixPermissions || 0) & 0o170000;
  return mode === 0o120000;
}

function assertArchiveLimits(files) {
  if (files.length > LIMITS.entries) throw new Error('압축 항목 수가 안전 한도를 초과했습니다.');
  let total = 0;
  const seen = new Set();
  for (const file of files) {
    // JSZip can sanitize original unsafe names; reject the original, too.
    const name = normalizeEntry(file.unsafeOriginalName || file.name);
    const key = name.toLocaleLowerCase('en-US');
    if (seen.has(key)) throw new Error(`중복 파일 이름이 있습니다: ${name}`);
    seen.add(key);
    if (isUnixSymlink(file)) throw new Error(`심볼릭 링크는 풀 수 없습니다: ${name}`);
    const size = file._data?.uncompressedSize || 0;
    if (size > LIMITS.entryBytes) throw new Error(`항목 크기 제한을 초과했습니다: ${name}`);
    total += size;
    if (total > LIMITS.totalBytes) throw new Error('총 해제 용량이 2GiB를 초과합니다.');
  }
  return total;
}

module.exports = {LIMITS, normalizeEntry, safeInside, assertNoSymlinkParents, assertArchiveLimits, isUnixSymlink};
