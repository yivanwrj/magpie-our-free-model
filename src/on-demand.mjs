// Runs inside the authenticated OFM service; never routes to a Magpie provider.
export function freeFallback(row) {
  return !!row && ((!row.channel && !row.providerId && !String(row.id).includes('/') && !String(row.id).startsWith('combo:')) || row.channel === 'kilo');
}
const canRetry = f => [401,403,404,408,429,500,502,503,504].includes(f?.status ?? f?.statusCode)
  || ['REGION_BLOCKED','LANE_LOCKED','INVALID_CREDENTIAL','AUTHORIZATION_REQUIRED','QUOTA_EXHAUSTED','RATE_LIMIT','TRANSPORT','TIMEOUT','SERVER','EMPTY_RESPONSE','NO_PROGRESS'].includes(f?.code);
const fail = (code,status,message) => ({text:'',toolCalls:[],error:message,failure:{code,status,message}});
const answer = c => c.type === 'text-delta' && !!c.text || c.type === 'tool-call-delta' || c.type === 'block-end' && c.block?.type === 'tool-call';
export async function completeOnDemand({request,onChunk=()=>{},complete,catalog,publicRows,preferences,health,recordRoute=()=>{}}) {
  const live = new Set(publicRows.map(r=>r.id)), primary=catalog.find(r=>r.id===request.model);
  if (!primary || !live.has(primary.id)) throw Object.assign(new Error('模型不存在、已停用或已隐藏'),{statusCode:404});
  const manual = request.openAi?.ofm_health_probe === true;
  const fallback = preferences.failoverEnabled && !manual;
  const configured = [...new Set([request.model,...(fallback?preferences.fallbackModels??[]:[])])];
  const preferred=fallback?health.preferred(request.model):undefined;
  const ids=preferred && configured.includes(preferred)?[preferred,...configured.filter(id=>id!==preferred)]:configured;
  const maximum=Math.min(5,Math.max(1,preferences.maxAttempts??3));
  let attempts=0,last,lastHeld=[]; const skipped=[];
  const hasImage=JSON.stringify(request.openAi?.messages??request.messages??[]).includes('image');
  const needsTools=(request.tools??request.openAi?.tools??[]).length>0;
  for(const id of ids) {
    request.signal?.throwIfAborted(); if(attempts>=maximum)break;
    const row=catalog.find(r=>r.id===id); if(!row||!live.has(id))continue;
    if(id!==request.model && (!freeFallback(row) || hasImage&&row.vision!==true || needsTools&&row.tool_call===false || (row.contextWindow??32768)<(primary.contextWindow??32768)))continue;
    const requestedMax=request.maxTokens??request.openAi?.max_tokens;
    if(id!==request.model && requestedMax>(row.maxOutput??Infinity))continue;
    const wait=health.cooldownFor(id,row);
    if(wait){skipped.push(id);last=fail('RATE_LIMIT',429,'模型或免费通道仍在冷却，未发送请求');last.failure.providerRetryAfterMs=wait*1000;continue;}
    attempts++; let held=[],bytes=0,committed=false,answerSeen=false,outcome;
    const emit=c=>{if(answer(c))answerSeen=true;if(committed){onChunk(c);return;}held.push(c);bytes+=JSON.stringify(c).length;if(answer(c)||bytes>65536){committed=true;for(const item of held)onChunk(item);held=[];}};
    try {
      const next={...request,model:id,...request.openAi?{openAi:{...request.openAi,model:id}}:{}};
      if(next.openAi)delete next.openAi.ofm_health_probe;
      if(id!==request.model){delete next.reasoningEffort;if(next.openAi)delete next.openAi.reasoning_effort;}
      outcome=await complete(next,emit);
    } catch(error) {
      if(request.signal?.aborted||error.name==='AbortError')throw error;
      const status=error.status??error.statusCode??502;
      outcome=fail(error.code??([400,404].includes(status)?'CLIENT_ERROR':'TRANSPORT'),status,'模型请求失败');
    }
    const ok=!!outcome&&!outcome.error&&!outcome.failure&&!!(answerSeen||outcome.text?.trim()||outcome.toolCalls?.length);
    if(![400,404].includes(outcome?.failure?.status)) await health.recordResult(id,ok?{ok:true,tools:outcome.toolCalls?.length>0}:{ok:false,failure:outcome?.failure??{code:'EMPTY_RESPONSE',status:502}},row);
    if(ok||committed){if(!committed)for(const item of held)onChunk(item);if(ok&&!manual)health.remember(request.model,id);recordRoute({requested:request.model,served:id,attempts,skipped,ok,at:Date.now()});return outcome;}
    last=outcome??fail('EMPTY_RESPONSE',502,'模型未返回有效回复');lastHeld=held;
    if(!fallback||!canRetry(last.failure))break;
  }
  recordRoute({requested:request.model,served:null,attempts,skipped,ok:false,at:Date.now()});
  // The outcome is authoritative. Do not replay a discarded candidate's finish
  // or reasoning frames after another candidate was skipped during cooldown.
  return last??fail('NO_PROGRESS',503,'当前供应商中没有可用且兼容的备用模型');
}
