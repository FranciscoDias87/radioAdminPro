import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export function verifyBackup(backup){
 assert.equal(backup.format,'radioadmin-backup','Formato desconhecido');
 assert.equal(backup.version,1,'Versao desconhecida');
 assert.ok(Array.isArray(backup.records),'Registros ausentes');
 const ids=new Set();
 for(const row of backup.records){
  assert.ok(row.id&&row.kind&&row.data&&typeof row.data==='object','Registro incompleto');
  assert.ok(!ids.has(row.id),'Identificador duplicado');ids.add(row.id);
  if(row.kind==='contractVersion'){
   const v=row.data,hash=value=>createHash('sha256').update(value).digest('hex');
   assert.equal(hash(JSON.stringify(v.payload)),v.hash,'Conteudo de versao alterado');
   assert.equal(hash(Buffer.from(v.pdf,'base64')),v.documentHash,'PDF alterado');
   for(const evidence of v.signatures){const {hash:expected,...record}=evidence;assert.equal(hash(JSON.stringify(record)),expected,'Evidencia alterada');}
   if(v.state==='completed'){assert.equal(hash(Buffer.from(v.finalPdf,'base64')),v.finalHash,'PDF final alterado');assert.equal(v.signatures.length,2,'Assinaturas incompletas');}
  }
 }
 for(const row of backup.records){
  if(row.kind==='contract'){assert.ok(ids.has(row.data.clientId),'Anunciante ausente');if(row.data.speakerId)assert.ok(ids.has(row.data.speakerId),'Locutor ausente');}
  if(['billing','contractVersion','invite'].includes(row.kind))assert.ok(ids.has(row.data.contractId),'Contrato ausente');
  if(row.kind==='invite')assert.ok(ids.has(row.data.versionId),'Versao ausente');
 }
 return {records:ids.size,versions:backup.records.filter(r=>r.kind==='contractVersion').length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{assert.ok(process.argv[2],'Informe o arquivo de backup');const result=verifyBackup(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('Backup verificado:',result.records,'registros,',result.versions,'versoes. Nenhum dado foi importado.');}
 catch{console.error('Backup invalido ou inacessivel. Nenhum dado foi importado.');process.exitCode=1;}
}
