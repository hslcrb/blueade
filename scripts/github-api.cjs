'use strict';
const root='https://api.github.com';
async function request(endpoint,{method='GET',body,accept='application/vnd.github+json'}={}){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw new Error('GITHUB_TOKEN is required');
 const response=await fetch(root+endpoint,{method,headers:{Accept:accept,Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const text=await response.text();
 if(!response.ok)throw new Error(`GitHub API ${response.status} ${endpoint}: ${text.slice(0,800)}`);
 if(accept==='application/vnd.github.v3.diff')return text;
 return text?JSON.parse(text):{};
}
function repo(){const value=process.env.GITHUB_REPOSITORY;if(!/^[\w.-]+\/[\w.-]+$/.test(value||''))throw new Error('Invalid repository');return value;}
module.exports={request,repo};
