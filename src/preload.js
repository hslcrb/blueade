'use strict';
const {contextBridge,ipcRenderer,webUtils}=require('electron');
const invoke=(key,...args)=>ipcRenderer.invoke(key,...args);
contextBridge.exposeInMainWorld('blueade',Object.freeze({
  pathForFile:file=>webUtils.getPathForFile(file),
  chooseArchive:()=>invoke('choose:archive'),
  chooseFiles:()=>invoke('choose:files'),
  chooseFolder:()=>invoke('choose:folder'),
  chooseDestination:()=>invoke('choose:destination'),
  chooseSave:()=>invoke('choose:save'),
  inspectArchive:p=>invoke('archive:inspect',p),
  inspectSources:p=>invoke('sources:inspect',p),
  compress:params=>invoke('archive:compress',params),
  extract:params=>invoke('archive:extract',params),
  verify:p=>invoke('archive:verify',p),
  cancel:()=>invoke('job:cancel'),
  reveal:p=>invoke('shell:reveal',p),
  onProgress:callback=>{
    const fn=(_event,data)=>callback(data);
    ipcRenderer.on('blueade:progress',fn);
    return ()=>ipcRenderer.removeListener('blueade:progress',fn);
  }
}));
