'use strict';
const fs=require('node:fs');
const {request,repo}=require('./github-api');
const base=`/repos/${repo()}`;
const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH||'/dev/null','utf8'));
const approvedPermissions=new Set(['admin','maintain','write']);
async function fetchNumbers(){
 if(event.pull_request?.number)return [event.pull_request.number];
 const arr=event.workflow_run?.pull_requests||[];
 if(arr.length)return arr.map(p=>p.number);
 // GitHub can omit associated PRs on pull_request_target-originated workflow runs.
 // In that case try commit-to-PR relationship, without trusting workflow inputs.
 const sha=event.workflow_run?.head_sha;
 if(!/^[a-f0-9]{40}$/.test(sha||''))return [];
 const linked=await request(`${base}/commits/${sha}/pulls`);
 return linked.map(p=>p.number);
}
async function approvedByHuman(pr,headSha){
 const reviews=await request(`${base}/pulls/${pr.number}/reviews?per_page=100`);
 const latest=new Map();
 for(const review of reviews){if(review.user?.login)latest.set(review.user.login,review);}
 for(const [login,review] of latest){
  if(login===pr.user?.login || /\[bot\]$/.test(login))continue;
  if(review.state!=='APPROVED'||review.commit_id!==headSha)continue;
  try{const perms=await request(`${base}/collaborators/${encodeURIComponent(login)}/permission`);if(approvedPermissions.has(perms.permission))return true;}catch{}
 }
 return false;
}
async function maybeMerge(number){
 const pr=await request(`${base}/pulls/${number}`);
 if(pr.state!=='open'||pr.draft||pr.base?.ref!=='main'||pr.mergeable!==true){console.log(`#${number}: not eligible (state/draft/base/conflict)`);return;}
 const labels=new Set((pr.labels||[]).map(l=>l.name));
 if(!labels.has('safe-to-merge')||!labels.has('ai-reviewed')){console.log(`#${number}: waiting for maintainer label + AI label`);return;}
 const sha=pr.head.sha;
 const status=await request(`${base}/commits/${sha}/status`);
 if(!status.statuses.some(s=>s.context==='blueade/ai-review'&&s.state==='success')){console.log(`#${number}: waiting for head-specific AI status`);return;}
 const checks=await request(`${base}/commits/${sha}/check-runs?per_page=100`);
 const success=new Set(checks.check_runs.filter(c=>c.status==='completed'&&c.conclusion==='success').map(c=>c.name));
 if(!success.has('Node tests')||!success.has('Windows build')){console.log(`#${number}: waiting for Node + Windows CI`,[...success]);return;}
 if(!(await approvedByHuman(pr,sha))){console.log(`#${number}: waiting for valid human approval on current HEAD`);return;}
 await request(`${base}/pulls/${number}/merge`,{method:'PUT',body:{sha,merge_method:'merge',commit_title:`chore: PR #${number} 검토 완료 병합`,commit_message:'CI + 헤드 SHA 기반 AI 검토 + 유지관리자 승인 확인 (no-ff)'}});
 console.log(`#${number}: merge commit created`);
}
(async()=>{for(const number of new Set(await fetchNumbers())){try{await maybeMerge(number);}catch(e){console.error(`#${number}`,e.message);process.exitCode=1;}}})().catch(e=>{console.error(e);process.exitCode=1;});
