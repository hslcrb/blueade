#!/usr/bin/env node
'use strict';
// Cross-platform Windows portable assembly: uses official pre-built Electron ZIP.
// No Wine, electron-builder or network request is required when the ZIP is supplied.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const ELECTRON_ZIP_NAME = 'electron-v45.0.0-win32-x64.zip';
const EXPECTED_BYTES = 158223852;
const EXPECTED_SHA256 = 'ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47';
function sha256(filepath){const hash=crypto.createHash('sha256');const fd=fs.openSync(filepath,'r');const buffer=Buffer.alloc(1024*1024);try{let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,n));}finally{fs.closeSync(fd)}return hash.digest('hex')}
function assemble(zipPath=path.join(ROOT,'dist',ELECTRON_ZIP_NAME), target=path.join(ROOT,'dist','Bluade-win32-x64')) {
  const asar = path.join(ROOT, 'dist', 'app.asar');
  zipPath = path.resolve(zipPath);target = path.resolve(target);
  if (!fs.existsSync(asar)) throw new Error('app.asar 없음: 먼저 npm run build:asar 실행');
  if (!fs.existsSync(zipPath)) throw new Error(`공식 Electron Windows ZIP 없음: ${zipPath}`);
  const size=fs.statSync(zipPath).size;
  if(size!==EXPECTED_BYTES)throw new Error(`Electron ZIP 파일 크기 불일치 (${size} != ${EXPECTED_BYTES})`);
  const digest=sha256(zipPath);
  if(digest!==EXPECTED_SHA256)throw new Error('Electron ZIP SHA256 불일치: 해시 검증에 실패했습니다.');
  if(fs.existsSync(target)) throw new Error('기존 빌드 덮어쓰기 거부: '+target);
  const list=cp.spawnSync('unzip',['-Z','-1',zipPath],{encoding:'utf8',maxBuffer:4*1024*1024});
  if(list.status!==0)throw new Error('ZIP 목록 검사 실패: '+(list.stderr||''));
  const entries=list.stdout.split(/\r?\n/).filter(Boolean);
  for(const entry of entries){
    const normalized=entry.replaceAll('\\','/');
    if(normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').some(x=>x==='..'))throw new Error('위험한 ZIP 내부 경로: '+entry);
  }
  fs.mkdirSync(target,{recursive:true});
  try {
    const extract=cp.spawnSync('unzip',['-q',zipPath,'-d',target],{encoding:'utf8',maxBuffer:2*1024*1024});
    if(extract.status!==0)throw new Error('공식 Electron Windows 런타임 해제 실패: '+(extract.stderr||''));
    const exe=path.join(target,'electron.exe');
    if(!fs.existsSync(exe))throw new Error('전자 런타임 내 electron.exe 없음');
    fs.mkdirSync(path.join(target,'resources'),{recursive:true});
    fs.copyFileSync(asar,path.join(target,'resources','app.asar'),fs.constants.COPYFILE_EXCL);
    fs.renameSync(exe,path.join(target,'Bluade.exe'));
    fs.writeFileSync(path.join(target,'BLUADE-PORTABLE.txt'),[
      'Bluade 0.1.0 Windows x64 Electron portable preview',
      'Execute Bluade.exe. Keep all adjacent DLLs, resources and locale files.',
      'Official Electron runtime v45.0.0, SHA256 verified before unpacking.',
      'App bundle SHA256: '+sha256(asar),
      'Unsigned: SmartScreen may warn. Windows smoke test is not included.',
    ].join('\r\n')+'\r\n');
    return {executable:path.join(target,'Bluade.exe'),asar: path.join(target,'resources','app.asar'),asarSha256:sha256(asar),electronSha256:digest};
  } catch(err){fs.rmSync(target,{recursive:true,force:true});throw err}
}
if(require.main===module){try {const result=assemble(process.argv[2],process.argv[3]);console.log(JSON.stringify(result,null,2));}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={assemble,sha256};
