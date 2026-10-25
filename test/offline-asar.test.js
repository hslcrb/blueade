'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {build, inspect} = require('../scripts/build-offline-asar.cjs');
test('offline Electron app.asar build verifies every embedded file and is deterministic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blueade-asar-'));
  try {
    const a = build(path.join(dir, 'one.asar'));
    const b = build(path.join(dir, 'two.asar'));
    assert.equal(a.sha256, b.sha256);
    assert.equal(a.files, inspect(a.output, true).count);
    assert.ok(a.files > 20);
    const header = inspect(a.output).header;
    assert.ok(header.files.src.files['main.js']);
    assert.ok(header.files.node_modules.files.jszip);
    assert.ok(header.files.assets.files['icon.ico']);
    // Any edit to the payload must be detectable by SHA256 integrity metadata.
    const corrupted = fs.readFileSync(a.output);
    corrupted[corrupted.length - 1] ^= 0x1;
    fs.writeFileSync(a.output, corrupted);
    assert.throws(() => inspect(a.output, true), /integrity mismatch/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
