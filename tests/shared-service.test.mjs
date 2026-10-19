import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import http from 'node:http';
let fixtureBase;
async function localUpstream(t) {
 const server=http.createServer((req,res)=>{res.setHeader('content-type','text/event-stream');res.end('data: {"choices":[{"index":0,"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));fixtureBase=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
}
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {closeManagedServices} from '../src/graceful-stop.mjs';
import {findSharedService} from '../src/shared-service.mjs';
const fixture=fileURLToPath(new URL('./shared-host-fixture.mjs',import.meta.url));
async function host(t, directory, dataDir, overrides={}, role='primary') {
 const child=spawn(process.execPath,[fixture,directory,dataDir,JSON.stringify(overrides),role],{env:{...process.env,OFM_UPDATE_TESTING:'1',OFM_TEST_UPSTREAM:fixtureBase,OUR_FREE_MODEL_BASE:fixtureBase,OUR_FREE_MODEL_KILO_BASE:fixtureBase},stdio:['pipe','pipe','pipe']});
 let seq=0,resolveReady;const calls=new Map();let stderr='';child.stderr.on('data',x=>stderr+=x);
 const ready=new Promise(resolve=>resolveReady=resolve);
 const exit=new Promise(resolve=>child.once('exit',resolve));
 readline.createInterface({input:child.stdout}).on('line',line=>{const value=JSON.parse(line);if(value.id){const call=calls.get(value.id);calls.delete(value.id);value.error?call.reject(new Error(value.error)):call.resolve(value.value??value.closed);}else resolveReady(value);});
 child.once('exit',()=>{resolveReady({error:stderr||'host exited'});for(const call of calls.values())call.reject(new Error('host exited'));});
 t.after(async()=>{child.stdin.end();child.kill('SIGTERM');await exit;});
 return {child,ready:await ready,exit,call(type,payload){const id=++seq;return new Promise((resolve,reject)=>{calls.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,type,payload})+'\n');});}};
}
test('independent plugin hosts share one authenticated OFM; borrower exit preserves owner, owner exit permits recovery', {timeout:30000}, async t=>{
 await localUpstream(t);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ofm-multi-host-'));const dataDir=path.join(directory,'our-free-model');
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const owner=await host(t,directory,dataDir);assert.ok(owner.ready.ready,JSON.stringify(owner.ready));
 const peer=await host(t,directory,dataDir);assert.ok(peer.ready.ready,JSON.stringify(peer.ready));
 assert.equal(peer.ready.ready.shared,true);assert.equal(peer.ready.ready.pid,owner.ready.ready.pid);
 assert.ok(Array.isArray(await peer.call('models')));
 assert.equal(typeof await peer.call('health'),'object');
 assert.ok((await peer.call('console')).startsWith('http://127.0.0.1:'));
 const state=owner.ready.ready;const settings=JSON.parse(await fs.readFile(state.keyFile,'utf8'));
 assert.equal((await fetch(state.url+'/api/management/magpie/runtime')).status,401);
 const bad=await fetch(state.url+'/api/management/magpie/runtime',{method:'POST',headers:{authorization:'Bearer '+settings.forwardKey,'content-type':'application/json'},body:JSON.stringify({identity:'wrong',type:'models'})});assert.equal(bad.status,409);await bad.body.cancel();
 await peer.call('close');await peer.exit;assert.doesNotThrow(()=>process.kill(state.pid,0));
 const survivor=await host(t,directory,dataDir);assert.equal(survivor.ready.ready.pid,state.pid);
 await owner.call('close');await owner.exit;
 const next=await survivor.call('ensure');assert.notEqual(next.pid,state.pid);assert.ok(!next.shared);
 assert.equal(typeof await survivor.call('health'),'object');
 const mismatch=await host(t,directory,dataDir,{health:{tools:false,concurrency:1}});assert.match(mismatch.ready.error,/版本、源码路径或设置不同/);
 assert.doesNotThrow(()=>process.kill(next.pid,0));
 await survivor.call('close');await survivor.exit;
});
test('shutdown starts model-service cleanup even when a background update never closes',async()=>{
 let serviceClosed=false;
 const result=await closeManagedServices([{close:()=>new Promise(()=>{})},{close(){serviceClosed=true;}}],20);
 assert.equal(result.timedOut,true);assert.equal(serviceClosed,true);
});
test('an unrecognized live service is not reused or stopped',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ofm-foreign-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'service.lock'),JSON.stringify({product:'our-free-model-standalone',pid:process.pid}));
 await fs.writeFile(path.join(dir,'settings.json'),JSON.stringify({standalonePort:18900,forwardKey:'fixture'}));
 await assert.rejects(findSharedService(dir,'expected',{live:()=>true,fetch:async()=>new Response('{}',{status:404})}),/不支持跨宿主复用/);
});


test('simultaneous independent hosts serialize startup and produce one service', {timeout:30000}, async t=>{
 await localUpstream(t);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ofm-concurrent-host-'));const dataDir=path.join(directory,'our-free-model');
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const hosts=await Promise.all([host(t,directory,dataDir),host(t,directory,dataDir)]);
 for(const client of hosts)assert.ok(client.ready.ready,JSON.stringify(client.ready));
 assert.equal(hosts[0].ready.ready.pid,hosts[1].ready.ready.pid);
 const borrowed=hosts.find(x=>x.ready.ready.shared),owner=hosts.find(x=>!x.ready.ready.shared);
 assert.ok(borrowed&&owner);await borrowed.call('close');await borrowed.exit;
 assert.doesNotThrow(()=>process.kill(owner.ready.ready.pid,0));await owner.call('close');await owner.exit;
});

test('MCP auxiliary starts before the main app without creating OFM, borrows later, and never takes over after main exits', {timeout:30000}, async t=>{
 await localUpstream(t);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ofm-mcp-aux-'));const dataDir=path.join(directory,'our-free-model');
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const auxiliary=await host(t,directory,dataDir,{},'auxiliary');
 assert.equal(auxiliary.ready.unavailable,true);assert.equal(auxiliary.ready.code,'OFM_PRIMARY_REQUIRED');
 await assert.rejects(fs.access(dataDir));assert.deepEqual(await fs.readdir(directory),[]);
 const owner=await host(t,directory,dataDir);assert.ok(owner.ready.ready,JSON.stringify(owner.ready));
 const borrowed=await auxiliary.call('ensure');assert.equal(borrowed.shared,true);assert.equal(borrowed.pid,owner.ready.ready.pid);
 assert.ok(Array.isArray(await auxiliary.call('models')));
 await owner.call('close');await owner.exit;
 await assert.rejects(auxiliary.call('ensure'),/不会启动或接管/);
 await assert.rejects(fs.access(path.join(dataDir,'service.lock')));
 const mainAgain=await host(t,directory,dataDir);assert.notEqual(mainAgain.ready.ready.pid,borrowed.pid);
 assert.equal((await auxiliary.call('ensure')).pid,mainAgain.ready.ready.pid);
 await auxiliary.call('close');await auxiliary.exit;
 assert.doesNotThrow(()=>process.kill(mainAgain.ready.ready.pid,0));
 await mainAgain.call('close');await mainAgain.exit;
});
