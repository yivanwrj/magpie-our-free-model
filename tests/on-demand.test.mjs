import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {completeOnDemand} from '../src/on-demand.mjs';
import {createModelHealth} from '../src/model-health.mjs';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ofm-demand-'));let now=Date.now(),network=0;
 fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({forwardKey:'fixture-secret'}));
 const catalog=[{id:'primary',contextWindow:100},{id:'backup',channel:'kilo',contextWindow:100},{id:'third',channel:'kilo',contextWindow:100},{id:'api/paid/model',channel:'aggregate',contextWindow:100}];
 const service={keyFile:path.join(dir,'settings.json'),url:'http://127.0.0.1:1',ready:Promise.resolve(),runtime:{publicModelRows:()=>catalog,catalog}};
 const make=()=>createModelHealth(service,{}, {now:()=>now,send:async()=>{network++;throw Error('unexpected synthetic request');}});
 const health=make();t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});});
 const defaults={request:{model:'primary',openAi:{messages:[{role:'user',content:'private prompt'}]}},catalog,publicRows:catalog,preferences:{failoverEnabled:true,fallbackModels:['backup','third'],maxAttempts:3},health};
 return {dir,health,make,catalog,defaults,advance:ms=>{now+=ms;},network:()=>network};
}
const success=(emit)=>{emit({type:'text-delta',text:'answer'});emit({type:'finish',reason:{kind:'stop'}});return {text:'answer',toolCalls:[]};};
const failure=(status=403,code='LANE_LOCKED')=>({text:'',toolCalls:[],error:'upstream failure',failure:{status,code,message:'private secret'}});
test('production startup, automatic schedules and implicit batch schedules make zero inference requests',async t=>{
 const f=fixture(t);f.health.start();await f.health.schedule([], {automatic:true});await f.health.schedule();await f.health.schedule(['primary','backup']);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.network(),0);await f.health.close();
});
test('actual turn attempts chosen model once then stops at the first successful OFM fallback and remembers it',async t=>{
 const f=fixture(t),calls=[],chunks=[],routes=[];
 const complete=async(r,emit)=>{calls.push(r.model);return r.model==='primary'?failure():success(emit);};
 const out=await completeOnDemand({...f.defaults,complete,onChunk:c=>chunks.push(c),recordRoute:r=>routes.push(r)});
 assert.equal(out.text,'answer');assert.deepEqual(calls,['primary','backup']);assert.equal(routes[0].served,'backup');assert.equal(chunks.filter(c=>c.type==='text-delta').length,1);
 assert.equal(f.health.snapshot().primary.state,'lane_locked');assert.equal(f.health.snapshot().backup.state,'healthy');assert.equal(f.network(),0);
 await completeOnDemand({...f.defaults,complete});assert.deepEqual(calls,['primary','backup','backup']);
 const restarted=f.make();assert.equal(restarted.preferred('primary'),'backup');assert.ok(restarted.cooldownFor('primary',f.catalog[0])>0);
 assert.doesNotMatch(fs.readFileSync(path.join(f.dir,'model-health.json'),'utf8'),/private|fixture-secret/);await restarted.close();await f.health.close();
});
test('cooldown is shared by OpenCode client-rejection lane and survives restart without re-probing',async t=>{
 const f=fixture(t);await f.health.recordResult('primary',{ok:false,failure:{status:403,code:'LANE_LOCKED'}},f.catalog[0]);
 const another={id:'another',contextWindow:100};f.catalog.push(another);
 const health=f.make(),calls=[];
 await completeOnDemand({...f.defaults,health,request:{model:'another'},complete:async(r,emit)=>{calls.push(r.model);return success(emit);}});
 assert.deepEqual(calls,['backup']);await health.close();await f.health.close();
});
test('fallback cannot escape catalog, use disabled models or use paid/aggregate models',async t=>{
 const f=fixture(t),calls=[];
 const p={failoverEnabled:true,fallbackModels:['other-magpie-provider/model','api/paid/model','third','backup'],maxAttempts:5};
 await completeOnDemand({...f.defaults,preferences:p,publicRows:f.catalog.filter(r=>r.id!=='third'),complete:async(r,emit)=>{calls.push(r.model);return r.model==='primary'?failure(503,'SERVER'):success(emit);}});
 assert.deepEqual(calls,['primary','backup']);await f.health.close();
});
test('streaming text or tool output commits the model; later failure never replays on another model',async t=>{
 for(const chunk of [{type:'text-delta',text:'partial'},{type:'tool-call-delta',index:0,name:'write_file',id:'call'}]){
 const f=fixture(t),calls=[],chunks=[];
 await completeOnDemand({...f.defaults,complete:async(r,emit)=>{calls.push(r.model);emit(chunk);return failure(503,'SERVER');},onChunk:c=>chunks.push(c)});
 assert.deepEqual(calls,['primary']);assert.equal(chunks.length,1);await f.health.close();
 }
});
test('user cancellation, request errors and manual single-model checks never advance',async t=>{
 for(const mode of ['abort','400','manual']){
 const f=fixture(t),calls=[],controller=new AbortController();
 const args={...f.defaults,request:{model:'primary',signal:controller.signal,openAi:{ofm_health_probe:mode==='manual'}},complete:async(r)=>{
 calls.push(r.model);assert.equal(r.openAi?.ofm_health_probe,undefined);
 if(mode==='abort'){controller.abort();throw Object.assign(new Error('cancelled'),{name:'AbortError'});}return failure(mode==='400'?400:503,mode==='400'?'CLIENT_ERROR':'SERVER');}};
 if(mode==='abort')await assert.rejects(completeOnDemand(args));else await completeOnDemand(args);
 assert.deepEqual(calls,['primary']);await f.health.close();
 }
});
test('maximum attempts, vision and context checks restrict fallback without changing the original request',async t=>{
 const f=fixture(t),calls=[];f.catalog[1].contextWindow=50;
 const request={model:'primary',openAi:{model:'primary',messages:[{role:'user',content:'original'}]}};
 await completeOnDemand({...f.defaults,request,preferences:{...f.defaults.preferences,maxAttempts:2},complete:async(r)=>{calls.push(r.model);return failure(503,'SERVER');}});
 assert.deepEqual(calls,['primary','third']);assert.equal(request.model,'primary');assert.equal(request.openAi.model,'primary');await f.health.close();
});

test('account names without a channel marker are not mistaken for anonymous free fallback or lane-wide cooldown',async t=>{
 const f=fixture(t);const account={id:'buddy/model',contextWindow:100};f.catalog.push(account);
 await f.health.recordResult('primary',{ok:false,failure:{status:403,code:'LANE_LOCKED'}},f.catalog[0]);
 assert.equal(f.health.cooldownFor('buddy/model',account),0);
 const calls=[];
 await completeOnDemand({...f.defaults,request:{model:'backup'},preferences:{failoverEnabled:true,fallbackModels:['buddy/model','third'],maxAttempts:3},complete:async(r,emit)=>{calls.push(r.model);return r.model==='backup'?failure(503,'SERVER'):success(emit);}});
 assert.deepEqual(calls,['backup','third']);await f.health.close();
});
test('failed pre-answer reasoning is discarded and old auto-check settings migrate off',async t=>{
 const {updatePreferences}=await import('../src/upstream-update.mjs');
 assert.equal(updatePreferences({checkModels:true}).checkModels,false);
 const f=fixture(t),chunks=[];
 await completeOnDemand({...f.defaults,complete:async(r,emit)=>{if(r.model==='primary'){emit({type:'thinking-delta',text:'discarded thinking'});return failure(503,'SERVER');}return success(emit);},onChunk:c=>chunks.push(c)});
 assert.ok(!JSON.stringify(chunks).includes('discarded'));await f.health.close();
});
