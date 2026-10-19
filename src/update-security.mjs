// Trusted updater-side heuristic gate; never executes candidate code.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');
const rules = [
 ['network', /https?:\/\/|\b(?:fetch|WebSocket|XMLHttpRequest|sendBeacon|request|connect)\s*\(|node:(?:https?|net|tls|dgram)|axios|undici/],
 ['credentials-or-files', /process\s*(?:\.|\[)|\b(?:apiKey|api_key|authorization|credentials|access_token|refresh_token|cookie|password|secret|token)\b|readFile|readdir|createReadStream|homedir|\.ssh|\.config/i],
 ['execution', /\b(?:eval|Function|spawn|exec|execFile|fork|import|require)\s*\(|node:child_process|from\s*['"]|import\s*['"]|atob\s*\(|base64/],
];
export function inspectAddedLines(file, lines) {
 if (!/\.(?:[cm]?[jt]sx?|json|html|sh|ps1|cmd|bat|ya?ml|css)$/i.test(file) && !/(?:Dockerfile|Makefile)$/.test(file)) return [];
 const findings = [];
 for (const line of lines) for (const [rule, pattern] of rules) if (pattern.test(line)) findings.push({file, rule, lineSha256: hash(line)});
 return findings;
}
export async function auditChanges(base, candidate, files) {
 const findings = [], changed = [];
 for (const file of files) {
  const bytes = await fs.readFile(path.join(candidate,file)); let previous = Buffer.alloc(0);
  try { previous = await fs.readFile(path.join(base,file)); } catch(error) { if(error.code !== 'ENOENT') throw error; }
  if(bytes.equals(previous)) continue;
  changed.push({file,sha256:hash(bytes)});
  const before = new Set(previous.toString('utf8').split('\n'));
  findings.push(...inspectAddedLines(file,bytes.toString('utf8').split('\n').filter(line=>!before.has(line))));
  if (/^(?:scripts\/|tests\/)|(?:^|\/)package\.json$/.test(file)) findings.push({file,rule:'build-or-dependency-change',sha256:hash(bytes)});
 }
 return {changed, findings};
}
export function auditDiff(diff) {
 let file='', findings=[];
 for(const line of diff.split('\n')) {
  if(line.startsWith('+++ b/')) file=line.slice(6);
  else if(line.startsWith('+') && !line.startsWith('+++')) findings.push(...inspectAddedLines(file,[line.slice(1)]));
 }
 return findings;
}
export function securityReport(stage,findings,changed=[]) {
 return {schema:1,stage,status:findings.length?'review_required':'no_flags',createdAt:Date.now(),changed,findings,
 limitation:'静态增量启发式检查，不是安全证明或操作系统沙箱；不能排除混淆、间接调用和既有代码风险。报告不记录源码或凭据。敏感变更必须人工复核后集成，不能自动发布。'};
}
