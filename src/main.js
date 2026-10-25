'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell, nativeTheme} = require('electron');
const path=require('node:path');
const {inspectArchive,inspectInputs,compress,extract,verifyArchive} = require('./zip/archive');
let window;
let currentJob = null;
let lastEvent = 0;
let lastPayload = null;

function publish(payload,force=false){
  if (!window||window.isDestroyed()) return;
  lastPayload = {...lastPayload,...payload};
  if(!force && Date.now()-lastEvent<80) return;
  lastEvent=Date.now(); window.webContents.send('blueade:progress',lastPayload);
}
function requireOurWindow(e){if(!window || e.sender!==window.webContents || !e.sender.getURL().startsWith('file://'))throw new Error('허용되지 않은 요청입니다.');}
function ensureIdle(){if(currentJob) throw new Error('이미 진행 중인 작업이 있습니다. 먼저 완료하거나 취소해주세요.');}
function launchJob(kind,run){
  ensureIdle();
  const controller = new AbortController();
  const started=Date.now();
  const id=`job-${started}`;
  currentJob={id,controller};
  const base={id,kind,status:'running',percent:0,processedBytes:0,totalBytes:0,currentFile:'',fileIndex:0,fileCount:0,outputBytes:0,started};
  let status={...base};
  publish(status,true);
  const push=(update)=>{
    const elapsed=Math.max(.2,(Date.now()-started)/1000);
    status={...status,...update};
    status.speed=Math.round((status.processedBytes||0)/elapsed);
    status.etaSeconds=status.speed>0 && status.totalBytes>0 ? Math.max(0,Math.round((status.totalBytes-status.processedBytes)/status.speed)):null;
    publish(status);
  };
  return Promise.resolve().then(()=>run(push,controller.signal))
    .then(result=>{publish({...status,...result,status:'done',percent:100,finished:Date.now()},true);return result;})
    .catch(err=>{publish({...status,status:err.name==='AbortError'?'cancelled':'error',error:String(err.message||err),finished:Date.now()},true);throw err;})
    .finally(()=>{currentJob=null;});
}
function createWindow(){
  window=new BrowserWindow({width:1390,height:870,minWidth:960,minHeight:650,backgroundColor:'#f5f8fd',title:'Bluade — 압축을 맑게',icon:path.join(__dirname,'../assets/icon.png'),show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  window.setMenuBarVisibility(false);
  window.loadFile(path.join(__dirname,'ui/index.html'));
  window.once('ready-to-show',()=>window.show());
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',e=>e.preventDefault());
}
app.whenReady().then(()=>{
  nativeTheme.themeSource='light';
  createWindow();
  ipcMain.handle('choose:archive',async e=>{requireOurWindow(e);const x=await dialog.showOpenDialog(window,{title:'ZIP 파일 열기',filters:[{name:'ZIP 압축파일',extensions:['zip']}],properties:['openFile']});return x.canceled?null:x.filePaths[0];});
  ipcMain.handle('choose:files',async e=>{requireOurWindow(e);const x=await dialog.showOpenDialog(window,{title:'압축할 파일 선택',properties:['openFile','multiSelections']});return x.canceled?[]:x.filePaths;});
  ipcMain.handle('choose:folder',async e=>{requireOurWindow(e);const x=await dialog.showOpenDialog(window,{title:'폴더 선택',properties:['openDirectory']});return x.canceled?[]:x.filePaths;});
  ipcMain.handle('choose:destination',async e=>{requireOurWindow(e);const x=await dialog.showOpenDialog(window,{title:'압축 해제 폴더 선택',properties:['openDirectory','createDirectory']});return x.canceled?null:x.filePaths[0];});
  ipcMain.handle('choose:save',async e=>{requireOurWindow(e);const x=await dialog.showSaveDialog(window,{title:'새 압축파일 저장',defaultPath:'Bluade.zip',filters:[{name:'ZIP 압축파일',extensions:['zip']} ]});return x.canceled?null:x.filePath;});
  ipcMain.handle('archive:inspect',async(e,f)=>{requireOurWindow(e);return inspectArchive(f);});
  ipcMain.handle('sources:inspect',async(e,f)=>{requireOurWindow(e);const r=await inspectInputs(f);return {entries:r.staged.map(({absolute,name,size,directory})=>({absolute,name,size,directory})),totalBytes:r.total};});
  ipcMain.handle('archive:compress',async(e,opt)=>{requireOurWindow(e);return launchJob('compress',(onProgress,signal)=>compress(opt,onProgress,signal));});
  ipcMain.handle('archive:extract',async(e,opt)=>{requireOurWindow(e);return launchJob('extract',(onProgress,signal)=>extract(opt,onProgress,signal));});
  ipcMain.handle('archive:verify',async(e,f)=>{requireOurWindow(e);return launchJob('verify',(onProgress,signal)=>verifyArchive(f,onProgress,signal));});
  ipcMain.handle('job:cancel',e=>{requireOurWindow(e);if(currentJob){currentJob.controller.abort();return true;}return false;});
  ipcMain.handle('shell:reveal',async(e,location)=>{requireOurWindow(e);const fs=require('node:fs/promises');const f=path.resolve(location);const st=await fs.stat(f);if(st.isDirectory()){return shell.openPath(f);}shell.showItemInFolder(f);return '';});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0) createWindow();});
