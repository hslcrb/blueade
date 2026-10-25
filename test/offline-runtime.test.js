'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const {assemble,sha256}=require('../scripts/assemble-win32-from-zip.cjs');
test('Windows runtime assembler fail-closed on missing or corrupted upstream Electron ZIP',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bluade-runtime-'));
 try{
  assert.throws(()=>assemble(path.join(dir,'no-runtime.zip'),path.join(dir,'out')),/없음/);
  const fake=path.join(dir,'fake.zip');fs.writeFileSync(fake,Buffer.from('not an Electron archive'));
  assert.throws(()=>assemble(fake,path.join(dir,'out')),/크기 불일치/);
  assert.equal(fs.existsSync(path.join(dir,'out')),false);
  assert.equal(sha256(fake).length,64);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
