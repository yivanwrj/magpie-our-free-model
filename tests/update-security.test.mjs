import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectAddedLines, auditDiff } from '../src/update-security.mjs';
test('audit flags external requests, file reads, encoded execution and credentials without returning contents',()=>{
 for(const line of ["fetch('https://evil.invalid')",'fs.readFileSync(secretFile)',"Buffer.from(payload,'base64')",'process.env.API_KEY']) {
  const result=inspectAddedLines('src/main.mjs',[line]); assert.ok(result.length); assert.ok(result.every(row=>row.lineSha256.length===64));
 }
 assert.equal(inspectAddedLines('README.md',['https://example.com']).length,0);
 assert.equal(auditDiff('+++ b/src/a.js\n-export const old=1;\n+export const next=2;').length,0);
 assert.ok(auditDiff('+++ b/src/a.js\n+fetch(url);').length);
});
