const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {normalizeEntry,safeInside,assertNoSymlinkParents,assertArchiveLimits}=require('../src/zip/safety');
const {compress,extract,inspectArchive,verifyArchive}=require('../src/zip/archive');

test('safe paths and localized names',()=>{
 assert.equal(normalizeEntry('다정한/파일.txt'),'다정한/파일.txt');
 for(const value of ['../oops','a/../../x','/root','C:/Windows/test','folder\\..\\bad','CON.txt','../엉망','a:/b','nested/file. ']) assert.throws(()=>normalizeEntry(value),undefined,value);
 assert.equal(safeInside('/tmp/blueade','safe/a.txt'),path.join('/tmp/blueade','safe/a.txt'));
 assert.throws(()=>safeInside('/tmp/blueade','../escape'));
});
test('case collisions and limit',()=>{
 assert.throws(()=>assertArchiveLimits([{name:'A.txt',_data:{uncompressedSize:1}},{name:'a.TXT',_data:{uncompressedSize:1}}]));
 assert.throws(()=>assertArchiveLimits([{name:'a',_data:{uncompressedSize:9999999999}}]));
});
test('reject pre-existing symlink in extraction parent',async()=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'blueade-symlink-'));
 try{await fs.symlink(os.tmpdir(),path.join(d,'link'));await assert.rejects(()=>assertNoSymlinkParents(d,path.join(d,'link','evil.txt')));}
 finally{await fs.rm(d,{recursive:true,force:true});}
});
test('ZIP roundtrip, Unicode, verification, refusal to overwrite',async()=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'blueade-roundtrip-'));
 try {
  const input=path.join(d,'안녕.txt'), dest=path.join(d,'여름.zip'), output=path.join(d,'out');
  await fs.writeFile(input,'한글은 안전하게 ♡\n');
  const events=[];
  const result=await compress({sources:[input],destination:dest,level:6},e=>events.push(e));
  assert.equal(result.fileCount,1);
  const archive=await inspectArchive(dest);
  assert.equal(archive.entries[0].name,'안녕.txt');
  assert.equal(archive.entries[0].size,Buffer.byteLength('한글은 안전하게 ♡\n'));
  assert.equal((await verifyArchive(dest)).fileCount,1);
  const extracted=await extract({archive:dest,destination:output});
  assert.equal(extracted.fileCount,1);
  assert.equal(await fs.readFile(path.join(output,'안녕.txt'),'utf8'),'한글은 안전하게 ♡\n');
  await assert.rejects(()=>compress({sources:[input],destination:dest}));
  await assert.rejects(()=>extract({archive:dest,destination:output}));
  assert.ok(events.some(e=>e.percent===100));
 } finally {await fs.rm(d,{recursive:true,force:true});}
});
test('abort before creating archive',async()=>{
 const c=new AbortController();c.abort();
 await assert.rejects(()=>compress({sources:['nope'],destination:'/tmp/nope.zip'},null,c.signal),{name:'AbortError'});
});
