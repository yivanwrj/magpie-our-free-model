import readline from 'node:readline';
import { getManagedRuntime } from '../src/managed-runtime.mjs';
const [directory, dataDir, overrides = '{}', role = 'primary'] = process.argv.slice(2);
const runtime = getManagedRuntime({directory}, {dataDir,port:0,refresh:false,autoInstallEac:false,autoInstallChannels:false,consoleAccess:'local',health:{tools:false},...JSON.parse(overrides)}, { resolveHostRole: async () => role });
const send = value => process.stdout.write(JSON.stringify(value)+'\n');
try { send({ready:await runtime.ensure()}); } catch(error) {if (role === 'auxiliary') send({unavailable:true,code:error.code}); else {send({error:error.message});process.exit(1);}}
readline.createInterface({input:process.stdin}).on('line',async line=>{
 const cmd=JSON.parse(line);
 try {
  if(cmd.type==='close'){await runtime.close();send({id:cmd.id,closed:true});process.exit(0);}
  else if(cmd.type==='ensure')send({id:cmd.id,value:await runtime.ensure()});
  else send({id:cmd.id,value:await runtime.command(cmd.type,cmd.payload)});
 } catch(error){send({id:cmd.id,error:error.message});}
});
