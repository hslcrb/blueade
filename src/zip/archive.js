'use strict';

const JSZip = require('jszip');
const fs = require('node:fs/promises');
const {createReadStream, createWriteStream} = require('node:fs');
const path = require('node:path');
const {pipeline} = require('node:stream/promises');
const {Writable} = require('node:stream');
const {randomUUID} = require('node:crypto');
const {LIMITS, normalizeEntry, safeInside, assertNoSymlinkParents, assertArchiveLimits} = require('./safety');

function failIfAborted(signal) {if (signal?.aborted) throw Object.assign(new Error('작업을 취소했습니다.'), {name: 'AbortError'});}
function fileSize(file) {return file._data?.uncompressedSize || 0;}
const CRC_TABLE = Uint32Array.from({length:256}, (_,i) => {
  let v=i;
  for(let j=0;j<8;j++) v=(v&1)?(0xEDB88320^(v>>>1)):(v>>>1);
  return v>>>0;
});
function crc32Update(crc, bytes){
  for(const byte of bytes) crc=CRC_TABLE[(crc^byte)&0xff]^(crc>>>8);
  return crc>>>0;
}
function checkCRC(file, crc){
  const actual=(crc^0xffffffff)>>>0;
  const expected=(file._data?.crc32??0)>>>0;
  if(actual!==expected) throw new Error(`CRC 검사 실패: ${file.name}`);
}

function report(fn, data) {if (fn) fn(data);}
function presentEntry(file) {
  return {name: file.name, directory: file.dir, size: fileSize(file), modified: file.date instanceof Date ? file.date.toISOString() : null};
}
async function loadArchive(filename) {
  const absolute = path.resolve(filename);
  if (path.extname(absolute).toLowerCase() !== '.zip') throw new Error('현재는 ZIP 압축 파일을 지원합니다.');
  const stat = await fs.stat(absolute);
  if (!stat.isFile() || stat.size > LIMITS.archiveBytes) throw new Error('지원하지 않는 파일이거나 1GiB를 초과합니다.');
  const data = await fs.readFile(absolute);
  // Preflight metadata BEFORE decompressing any entry to avoid a CRC zip-bomb.
  const zip = await JSZip.loadAsync(data, {checkCRC32:false, createFolders:false});
  const files = Object.values(zip.files);
  const total = assertArchiveLimits(files);
  return {zip, files, total, compressedBytes:stat.size};
}
async function inspectArchive(filename) {
  const {files, total, compressedBytes} = await loadArchive(filename);
  return {path:path.resolve(filename), entries: files.map(presentEntry).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name,'ko')), totalBytes:total, compressedBytes};
}

async function inspectInputs(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > LIMITS.entries) throw new Error('추가할 파일 또는 폴더가 없습니다.');
  const seen = new Set();
  const staged = [];
  let total = 0;
  async function visit(absolute, relative, depth) {
    if (depth > LIMITS.maxDepth) throw new Error('폴더가 너무 깊습니다.');
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`심볼릭 링크는 압축하지 않습니다: ${relative}`);
    const archiveName = normalizeEntry(relative);
    const key = archiveName.toLowerCase();
    if (seen.has(key)) throw new Error(`이름이 중복됩니다: ${archiveName}`);
    seen.add(key);
    if (stat.isDirectory()) {
      if (staged.length >= LIMITS.entries) throw new Error('항목 수가 20,000개를 초과합니다.');
      staged.push({absolute, name:archiveName + '/', directory:true, size:0});
      const children = await fs.readdir(absolute);
      for (const child of children) await visit(path.join(absolute, child), `${archiveName}/${child}`, depth + 1);
    } else if (stat.isFile()) {
      if (stat.size > LIMITS.entryBytes) throw new Error(`512MiB를 초과하는 파일: ${relative}`);
      total += stat.size;
      if (total > LIMITS.totalBytes) throw new Error('총 파일 용량이 2GiB를 초과합니다.');
      staged.push({absolute, name:archiveName, directory:false, size:stat.size, modified:stat.mtime});
    } else throw new Error(`지원하지 않는 파일 형식: ${relative}`);
    if (staged.length > LIMITS.entries) throw new Error('항목 수가 20,000개를 초과합니다.');
  }
  for (const input of paths) {
    const absolute = path.resolve(input);
    await visit(absolute, path.basename(absolute), 0);
  }
  return {staged, total};
}

async function compress({sources, destination, level=6}, update, signal) {
  failIfAborted(signal);
  const target = path.resolve(destination);
  if (path.extname(target).toLowerCase() !== '.zip') throw new Error('출력 파일 확장자는 .zip이어야 합니다.');
  if (![1,3,6,9].includes(Number(level))) throw new Error('압축 수준이 잘못되었습니다.');
  const {staged, total} = await inspectInputs(sources);
  if (staged.some(s => s.absolute === target)) throw new Error('원본 파일과 출력 파일이 같습니다.');
  // Do not overwrite existing archives, even after a successful build.
  try {await fs.access(target); throw new Error('이미 같은 이름의 파일이 있습니다. 다른 이름을 선택하세요.');}
  catch (e) {if (e.code !== 'ENOENT') throw e;}
  const zip = new JSZip();
  for (const item of staged) {
    if (item.directory) zip.folder(item.name);
    else zip.file(item.name, createReadStream(item.absolute), {date:item.modified, compression:'DEFLATE', createFolders:false});
  }
  const temp = target + '.blueade-part-' + randomUUID();
  let written = 0;
  let lastPercent = 0;
  try {
    const out = createWriteStream(temp,{flags:'wx'});
    const input = zip.generateNodeStream({type:'nodebuffer', streamFiles:true, compression:'DEFLATE', compressionOptions:{level:Number(level)}}, metadata => {
      lastPercent = metadata.percent;
      report(update, {percent:Math.min(99,Math.round(metadata.percent)), processedBytes:Math.round(total * metadata.percent / 100), totalBytes:total, currentFile:metadata.currentFile || '', fileCount:staged.filter(i=>!i.directory).length, outputBytes:written});
    });
    input.on('data', chunk=>{written+=chunk.length;});
    await pipeline(input, out, {signal});
    failIfAborted(signal);
    // Exclusive hard link prevents a late overwrite race (unlike rename()).
    await fs.link(temp,target);
    report(update, {percent:100, processedBytes:total,totalBytes:total,outputBytes:written,fileCount:staged.filter(i=>!i.directory).length});
    return {destination:target, fileCount:staged.filter(i=>!i.directory).length, totalBytes:total, outputBytes:written};
  } finally {await fs.rm(temp,{force:true}).catch(()=>{});}
}

async function extract({archive, destination, selected=[]}, update, signal) {
  failIfAborted(signal);
  const root = path.resolve(destination);
  await fs.mkdir(root,{recursive:true});
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('압축 해제 경로가 안전한 폴더가 아닙니다.');
  const {files} = await loadArchive(archive);
  const selectedSet = Array.isArray(selected) && selected.length ? new Set(selected) : null;
  const chosen = files.filter(f=>!selectedSet || [...selectedSet].some(name=>f.name === name || f.name.startsWith(name.endsWith('/')?name:name+'/')));
  const fileEntries = chosen.filter(f=>!f.dir);
  const totalBytes = fileEntries.reduce((n,f)=>n+fileSize(f),0);
  let processedBytes = 0;
  let index = 0;
  const created = [];
  try {
    for (const file of chosen) {
      failIfAborted(signal);
      const name = normalizeEntry(file.unsafeOriginalName || file.name);
      const target = safeInside(root,name);
      await assertNoSymlinkParents(root,target);
      if (file.dir) {
        try {await fs.mkdir(target);} catch (e) {if (e.code!=='EEXIST') throw e; const s=await fs.lstat(target); if (!s.isDirectory()||s.isSymbolicLink()) throw new Error('기존 경로가 안전하지 않습니다.');}
        continue;
      }
      const temp = target + '.blueade-part-' + randomUUID();
      const readable = file.nodeStream('nodebuffer');
      const writable = createWriteStream(temp,{flags:'wx'});
      let size = 0;
      let crc=0xffffffff;
      try {
        readable.on('data', chunk => {
          size += chunk.length;
          crc=crc32Update(crc,chunk);
          if (size > LIMITS.entryBytes || processedBytes + size > LIMITS.totalBytes) readable.destroy(new Error('항목 용량 제한 초과'));
          const current = processedBytes + size;
          report(update,{percent:totalBytes?Math.min(99,Math.round(current/totalBytes*100)):99,processedBytes:current,totalBytes,currentFile:name,fileIndex:index+1,fileCount:fileEntries.length});
        });
        await pipeline(readable,writable,{signal});
        failIfAborted(signal);
        checkCRC(file,crc);
        // Atomic no-clobber publish. Existing user files are never removed.
        await fs.link(temp,target);
        created.push(target);
        processedBytes += size;
      } finally {await fs.rm(temp,{force:true}).catch(()=>{});}
      index++;
    }
    failIfAborted(signal);
    report(update,{percent:100,processedBytes,totalBytes,fileIndex:index,fileCount:fileEntries.length});
    return {destination:root,fileCount:index,totalBytes,outputBytes:processedBytes};
  } catch (error) {
    // Remove only files created by this run; never delete pre-existing files.
    for (const f of created.reverse()) await fs.rm(f,{force:true}).catch(()=>{});
    throw error;
  }
}

async function verifyArchive(archive, update, signal) {
  failIfAborted(signal);
  const {files,total} = await loadArchive(archive);
  const regular = files.filter(f=>!f.dir);
  let processedBytes = 0;
  let fileIndex = 0;
  for (const file of regular) {
    failIfAborted(signal);
    const stream = file.nodeStream('nodebuffer');
    let crc=0xffffffff;
    stream.on('data', chunk=>{
      crc=crc32Update(crc,chunk);
      if(processedBytes+chunk.length>LIMITS.totalBytes)stream.destroy(new Error('검사 용량 제한 초과'));
      processedBytes+=chunk.length;
      report(update,{percent:total?Math.min(99,Math.round(processedBytes/total*100)):99,processedBytes,totalBytes:total,currentFile:file.name,fileIndex:fileIndex+1,fileCount:regular.length});
    });
    await pipeline(stream,new Writable({write(_chunk,_encoding,callback){if (signal?.aborted) callback(Object.assign(new Error('작업을 취소했습니다.'),{name:'AbortError'})); else callback();}}),{signal});
    checkCRC(file,crc);
    fileIndex++;
  }
  failIfAborted(signal);
  report(update,{percent:100,processedBytes,totalBytes:total,fileIndex,fileCount:regular.length});
  return {fileCount:regular.length,totalBytes:total};
}
module.exports={inspectArchive, inspectInputs, loadArchive,compress,extract,verifyArchive};
