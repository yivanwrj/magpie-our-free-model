import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {withFileLock} from '../src/installation-state.mjs';
test('completed same-process lease can be reclaimed, unknown or active same-PID leases stay protected',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ofm-lease-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'lock');let old;
 await withFileLock(file,async()=>{old=await fs.readFile(file,'utf8');await assert.rejects(withFileLock(file,async()=>assert.fail('active lease stolen'),1));});
 await fs.writeFile(file,old);let entered=false;await withFileLock(file,async()=>{entered=true;},100);assert.equal(entered,true);
 const unknown=JSON.stringify({pid:process.pid,nonce:'unknown-live-token'});await fs.writeFile(file,unknown);
 await assert.rejects(withFileLock(file,async()=>assert.fail('unknown lease stolen'),1));assert.equal(await fs.readFile(file,'utf8'),unknown);
});
