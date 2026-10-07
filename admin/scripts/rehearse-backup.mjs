import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {verifyBackup} from './verify-backup.mjs';

// This rehearsal has no production binding, persistence, or outbound network.
export async function rehearseBackup(backup){
 const summary=verifyBackup(backup);
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response(null,{status:404})}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'isolated-restore-rehearsal'},d1Persist:false,outboundService:()=>new Response(null,{status:403})});
 try{
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL)').run();
  for(let index=0;index<backup.records.length;index+=50){
   await db.batch(backup.records.slice(index,index+50).map(row=>db.prepare('INSERT INTO records(id,kind,data) VALUES(?,?,?)').bind(row.id,row.kind,JSON.stringify(row.data))));
  }
  const {results}=await db.prepare('SELECT id,kind,data FROM records ORDER BY id').all();
  const restored={...backup,records:results.map(row=>({...row,data:JSON.parse(row.data)}))};
  assert.deepEqual(restored.records,[...backup.records].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),'Conteudo restaurado divergente');
  verifyBackup(restored);
  return summary;
 }finally{await mf.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  assert.ok(process.argv[2],'Informe o arquivo de backup');
  const result=await rehearseBackup(JSON.parse(await readFile(process.argv[2],'utf8')));
  console.log('Ensaio concluido em banco temporario:',result.records,'registros,',result.versions,'versoes. Producao nao foi acessada.');
 }catch{console.error('Ensaio falhou. Producao nao foi acessada.');process.exitCode=1;}
}
