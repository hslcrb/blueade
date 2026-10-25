'use strict';
(() => {
 const api=window.blueade;
 const $=id=>document.getElementById(id);
 const state={mode:'browse',archive:null,entries:[],sourcePaths:[],extractionPath:null,savePath:null,folder:'',selected:new Set(),busy:false,jobs:[],logs:[],lastResult:null};
 const bytes=n=>{if(!Number.isFinite(Number(n)))return '—';let v=Number(n);if(v<1024)return `${v} B`;const units=['KB','MB','GB','TB'];let i=-1;do{v/=1024;i++;}while(v>=1024&&i<units.length-1);return `${v.toFixed(v>=100?0:v>=10?1:2)} ${units[i]}`;};
 const time=d=>{if(!d)return '—';const date=new Date(d);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});};
 const short=s=>String(s||'').split(/[\\/]/).pop();
 const say=(message,problem=false)=>{
   const banner=$('workspace-banner');banner.hidden=false;banner.textContent=message;banner.classList.toggle('error',problem);
   $('global-status').textContent=message;
 };
 const clearSay=()=>{$('workspace-banner').hidden=true;};
 const log=(msg)=>{state.logs.unshift({msg,time:new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})});state.logs.length=Math.min(state.logs.length,40);$('activity-count').textContent=`${state.logs.length} EVENTS`;$('activity-log').replaceChildren(...state.logs.slice(0,6).map(event=>{const d=document.createElement('div');d.className='log-row';const dot=document.createElement('span');dot.className='log-dot';const text=document.createElement('span');text.textContent=`${event.time} · ${event.msg}`;d.append(dot,text);return d;}));};
 const selectMode=mode=>{
  state.mode=mode;state.folder='';state.selected.clear();clearSay();
  document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t.dataset.mode===mode);if(t.dataset.mode===mode)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');});
  ['browse','create','history'].forEach(v=>{const side=$('side-'+v);side?.classList.toggle('active',v===mode);});
  render();
 };
 const currentEntries=()=>state.mode==='history'?state.jobs.map((j,i)=>({name:`${j.kind==='compress'?'압축':j.kind==='extract'?'해제':'검사'} · ${short(j.destination||j.archive||'파일')}`, size:j.totalBytes,directory:false,modified:new Date(j.finished||Date.now()).toISOString(),_job:i})):state.mode==='create'?state.entries:state.archive?.entries||[];
 const filtered=()=>{
  const query=$('search').value.trim().toLocaleLowerCase();
  const all=currentEntries();
  return all.filter(item=>{
   const name=(item.name||'').replace(/\/$/,'');
   const level=state.folder;
   const parent=level?name.startsWith(level+'/')?name.slice(level.length+1):'':name;
   if(!parent)return false;
   if(!query && parent.includes('/'))return false;
   return (!query||name.toLocaleLowerCase().includes(query));
  });
 };
 const folderNames=()=>{
  const all=currentEntries();const set=new Set();
  for(const entry of all){const pieces=entry.name.split('/').filter(Boolean);for(let i=1;i<pieces.length;i++)set.add(pieces.slice(0,i).join('/'));if(entry.directory)set.add(pieces.join('/'));}
  return [...set].sort((a,b)=>a.localeCompare(b,'ko'));
 };
 function renderTree(){const box=$('folder-tree');box.replaceChildren();const folders=folderNames();if(!folders.length){const div=document.createElement('div');div.className='tree-empty';div.textContent='압축파일을 열면 폴더 구조가 표시돼요.';box.append(div);return;}
  const root=document.createElement('button');root.type='button';root.className='tree-node'+(!state.folder?' selected':'');root.textContent='▰  전체 항목';root.onclick=()=>{state.folder='';render();};box.append(root);
  for(const folder of folders){const depth=folder.split('/').length-1;const btn=document.createElement('button');btn.type='button';btn.className='tree-node'+(folder===state.folder?' selected':'');btn.style.paddingLeft=`${12+Math.min(depth,5)*11}px`;btn.title=folder;const icon=document.createElement('span');icon.className='folder-icon';icon.textContent='▰';const text=document.createTextNode(' '+short(folder));btn.append(icon,text);btn.onclick=()=>{state.folder=folder;render();};box.append(btn);}
 }
 function renderBreadcrumbs(){const bar=$('breadcrumbs');bar.replaceChildren();const home=document.createElement('button');home.className='crumb-btn';home.type='button';home.textContent=state.mode==='browse'?(state.archive?short(state.archive.path):'작업 공간'):state.mode==='create'?'새 압축':'작업 기록';home.onclick=()=>{state.folder='';render();};bar.append(home);
 let base='';for(const part of state.folder.split('/').filter(Boolean)){const arrow=document.createElement('span');arrow.className='crumb-arrow';arrow.textContent='›';const b=document.createElement('button');b.type='button';b.className='crumb-btn';base+=(base?'/':'')+part;const final=base;b.textContent=part;b.onclick=()=>{state.folder=final;render();};bar.append(arrow,b);}}
 function render(){
  const all=currentEntries();const visible=filtered();const isCreate=state.mode==='create';
  $('section-kicker').textContent=state.mode==='browse'?'ARCHIVE EXPLORER':isCreate?'COMPRESSION WORKSPACE':'RECENT ACTIVITIES';
  $('explorer-title').textContent=state.mode==='browse'?(state.archive?short(state.archive.path):'내 압축 작업'):isCreate?'새 ZIP 압축 만들기':'최근 작업 기록';
  $('file-summary').textContent=`${all.filter(i=>!i.directory).length}개 항목`;
  $('side-count').textContent=all.filter(i=>!i.directory).length;
  $('empty-state').hidden=all.length>0;
  if(!all.length){$('empty-state').querySelector('h3').textContent=state.mode==='history'?'아직 기록된 작업이 없어요':isCreate?'파일을 추가해 보세요!':'여기서부터 시작해 볼까요?';$('empty-state').querySelector('p').textContent=isCreate?'위쪽의 파일 추가 · 폴더 추가로 시작하세요.':state.mode==='history'?'작업을 진행하면 이곳에서 확인할 수 있어요.':'ZIP 파일을 열거나 파일을 추가하세요.\n드래그 앤 드롭도 지원해요.';}
  renderTree();renderBreadcrumbs();
  const list=$('file-list');list.replaceChildren();for(const item of visible){
   const btn=document.createElement('button');btn.type='button';btn.className='file-row';btn.setAttribute('role','option');btn.setAttribute('aria-selected',state.selected.has(item.name)?'true':'false');btn.title=item.name;
   const n=document.createElement('span');n.className='row-name';const icon=document.createElement('span');icon.className='item-emoji'+(item.directory?' folder':'');icon.textContent=item.directory?'▰':/\.zip$/i.test(item.name)?'▤':'▧';const title=document.createElement('span');title.className='file-name';title.textContent=short(item.name.replace(/\/$/,''));n.append(icon,title);
   const size=document.createElement('span');size.textContent=item.directory?'—':bytes(item.size);
   const type=document.createElement('span');type.textContent=item.directory?'폴더':item._job!==undefined?'작업 기록':short(item.name).split('.').pop().toUpperCase()+' 파일';
   const updated=document.createElement('span');updated.textContent=time(item.modified);
   btn.append(n,size,type,updated);
   btn.onclick=()=>{if(item.directory){state.folder=item.name.replace(/\/$/,'');state.selected.clear();render();}else{if(state.selected.has(item.name))state.selected.delete(item.name);else state.selected.add(item.name);render();}};
   list.append(btn);
  }
  $('selection-info').textContent=state.selected.size?`${state.selected.size}개 항목 선택됨`:'선택한 항목이 없어요';
  $('archive-size').textContent=state.mode==='browse'&&state.archive?`${bytes(state.archive.compressedBytes)} · ${bytes(state.archive.totalBytes)} 압축 전`:isCreate?`${bytes(state.entries.reduce((v,e)=>v+e.size,0))} · ZIP 출력`:'Bluade · 내 PC에서만 처리';
  $('operation-label').textContent=isCreate?'저장할 ZIP 경로':'압축 해제 경로';
  $('target-path').textContent=isCreate?(state.savePath||'압축파일의 저장 위치를 선택하세요.'):(state.extractionPath||'폴더를 선택하지 않았습니다.');
  $('choose-path').textContent=isCreate?'파일 위치 ↗':'폴더 선택 ↗';
  $('compression-level').disabled=!isCreate||state.busy;
  $('start-operation').textContent=isCreate?'새 ZIP 압축 시작 →':'선택 위치에 압축 풀기 →';
  $('start-operation').disabled=state.busy||(isCreate?!state.entries.length:!state.archive)||state.mode==='history';
  $('start-operation').hidden=state.mode==='history';
 }
 function formatTime(seconds){if(!Number.isFinite(seconds))return '—';return seconds<60?`${seconds}초`:`${Math.floor(seconds/60)}분 ${seconds%60}초`;}
 function progress(job){
   const status={running:'진행 중',done:'완료',cancelled:'취소됨',error:'오류'};
   state.busy=job.status==='running';
   $('job-badge').textContent=status[job.status]||'대기 중';$('job-title').textContent=(job.kind==='compress'?'압축':job.kind==='extract'?'압축 해제':'파일 검사')+(job.status==='done'?' 완료':' 진행 상황');
   $('job-description').textContent=job.status==='done'?'모든 작업을 안전하게 마쳤어요.':job.status==='error'?(job.error||'오류가 발생했습니다.'):job.status==='cancelled'?'작업을 중단했습니다.': '작업 상태가 실시간으로 업데이트됩니다.';
   const percent=Math.max(0,Math.min(100,Math.round(job.percent||0)));
   $('job-percent').textContent=`${percent}%`;$('progress-fill').style.width=`${percent}%`;$('progress-track').setAttribute('aria-valuenow',String(percent));
   $('job-current').textContent=job.currentFile?short(job.currentFile):'파일 준비 중';$('job-current').title=job.currentFile||'';
   $('job-processed').textContent=`${bytes(job.processedBytes||0)} / ${bytes(job.totalBytes||0)}`;
   $('job-speed').textContent=job.speed?bytes(job.speed)+'/s':'—';$('job-eta').textContent=formatTime(job.etaSeconds);
   $('job-count').textContent=`${job.fileIndex||((job.status==='done')?job.fileCount:0)||0} / ${job.fileCount||0}`;
   $('cancel-job').disabled=!state.busy;
   $('reveal-output').hidden=!(job.status==='done' && job.destination);
   if(job.status==='done'||job.status==='cancelled'||job.status==='error'){
    if(!state.jobs.some(j=>j.id===job.id))state.jobs.unshift({...job});
    state.jobs.length=Math.min(20,state.jobs.length);
    if(job.status==='done')state.lastResult=job.destination||state.lastResult;
    log(job.status==='done'?`${job.kind==='compress'?'압축':job.kind==='extract'?'해제':'검사'} 완료 · ${job.fileCount||0}개 파일`:job.status==='cancelled'?'작업 취소됨':`작업 실패 · ${job.error||'알 수 없는 오류'}`);
    if(job.status==='error')say(job.error||'작업을 완료하지 못했습니다.',true);
   }
   render();
 }
 async function openArchive(p){
  if(!api){say('데스크톱 앱에서만 실제 파일을 열 수 있어요.',true);return;}
  try{if(!p)p=await api.chooseArchive();if(!p)return;const data=await api.inspectArchive(p);state.archive=data;state.folder='';state.selected.clear();$('search').value='';selectMode('browse');log('ZIP 열기 · '+short(p));say(`${short(p)} 파일을 열었어요.`);}catch(e){say(e.message,true);}
 }
 async function stage(paths){if(!paths?.length)return;
  if(!api){say('데스크톱 앱에서만 파일을 추가할 수 있어요.',true);return;}
  try{const candidates=[...new Set([...state.sourcePaths,...paths])];const data=await api.inspectSources(candidates);state.sourcePaths=candidates;state.entries=data.entries;state.savePath=state.savePath||null;selectMode('create');log(`파일 준비 · ${data.entries.length}개 항목`);say('압축할 파일을 준비했습니다. 저장 위치를 정하면 시작할 수 있어요.');}catch(e){say(e.message,true);}
 }
 async function choosePath(){if(!api){say('데스크톱 앱에서 폴더 선택 기능을 사용할 수 있습니다.',true);return;}
  try{if(state.mode==='create'){const p=await api.chooseSave();if(p)state.savePath=p;}else{const p=await api.chooseDestination();if(p)state.extractionPath=p;}render();}catch(e){say(e.message,true);}}
 async function run(type){if(!api)return;
  if(state.busy){say('작업이 끝난 뒤 다음 작업을 시작할 수 있어요.',true);return;}
  try{
   clearSay();let result;
   if(type==='verify'){if(!state.archive)return say('먼저 ZIP 파일을 열어주세요.',true);log('파일 검사 시작');result=await api.verify(state.archive.path);}
   else if(type==='compress'||state.mode==='create'){
    if(!state.sourcePaths.length)return say('파일이나 폴더를 먼저 추가하세요.',true);
    if(!state.savePath){await choosePath();if(!state.savePath)return;}
    log('ZIP 압축 시작');result=await api.compress({sources:state.sourcePaths,destination:state.savePath,level:Number($('compression-level').value)});
   }else{
    if(!state.archive)return say('먼저 ZIP 파일을 열어주세요.',true);
    if(!state.extractionPath){await choosePath();if(!state.extractionPath)return;}
    log('ZIP 압축 해제 시작');result=await api.extract({archive:state.archive.path,destination:state.extractionPath,selected:[...state.selected]});
   }
   if(result){say('작업을 마쳤어요! 폴더 열기로 결과를 확인할 수 있습니다.');state.lastResult=result.destination||state.lastResult;}
  }catch(e){if(!/취소/.test(e.message))say(e.message,true);}
 }
 function bind(id,fn){$(id).addEventListener('click',fn);}
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
 bind('open-archive',()=>openArchive());bind('empty-open',()=>openArchive());
 bind('add-files',async()=>{if(api)await stage(await api.chooseFiles());else say('데스크톱 앱에서 파일을 추가할 수 있어요.',true);});
 bind('add-folder',async()=>{if(api)await stage(await api.chooseFolder());else say('데스크톱 앱에서 폴더를 추가할 수 있어요.',true);});
 bind('extract-action',()=>{selectMode('browse');run('extract');});
 bind('verify-action',()=>run('verify'));
 bind('choose-path',choosePath);bind('start-operation',()=>run(state.mode==='create'?'compress':'extract'));
 bind('cancel-job',async()=>{if(api)await api.cancel();});
 bind('reveal-output',async()=>{if(api&&state.lastResult){try{await api.reveal(state.lastResult);}catch(e){say(e.message,true);}}});
 bind('side-browse',()=>selectMode('browse'));bind('side-create',()=>selectMode('create'));bind('side-history',()=>selectMode('history'));
 bind('clear-workspace',()=>{if(state.busy)return say('작업을 마친 뒤 초기화할 수 있어요.',true);state.archive=null;state.entries=[];state.sourcePaths=[];state.savePath=null;state.extractionPath=null;state.folder='';state.selected.clear();$('search').value='';selectMode('browse');say('작업 공간을 비웠습니다.');});
 $('search').addEventListener('input',render);
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openArchive();}});
 let dragCounter=0;
 window.addEventListener('dragenter',e=>{e.preventDefault();dragCounter++;$('drop-overlay').hidden=false;});
 window.addEventListener('dragover',e=>e.preventDefault());
 window.addEventListener('dragleave',e=>{e.preventDefault();dragCounter=Math.max(0,dragCounter-1);if(!dragCounter)$('drop-overlay').hidden=true;});
 window.addEventListener('drop',async e=>{
  e.preventDefault();dragCounter=0;$('drop-overlay').hidden=true;
  if(!api?.pathForFile)return;
  const paths=[...e.dataTransfer.files].map(f=>{try{return api.pathForFile(f);}catch{return null;}}).filter(Boolean);
  if(paths.length===1&&/\.zip$/i.test(paths[0]))await openArchive(paths[0]);else await stage(paths);
 });
 if(api){api.onProgress(progress);}else {$('global-status').textContent='디자인 미리보기 · 파일 작업은 Electron에서 사용할 수 있습니다.';}
 render();
})();
