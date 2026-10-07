import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export function verifyBackup(backup){
 assert.equal(backup.format,'radioadmin-backup','Formato desconhecido');
 assert.equal(backup.version,1,'Versao desconhecida');
 assert.ok(Array.isArray(backup.records),'Registros ausentes');
 const ids=new Map();
 for(const row of backup.records){
  assert.ok(row.id&&row.kind&&row.data&&typeof row.data==='object','Registro incompleto');
  assert.ok(!ids.has(row.id),'Identificador duplicado');ids.set(row.id,row);
  if(['client','speaker','contract','billing','contractVersion','invite'].includes(row.kind)&&row.data.id!==undefined)assert.equal(row.data.id,row.id,'Identificador de conteudo divergente');
  if(row.kind==='contractVersion'){
   const v=row.data,hash=value=>createHash('sha256').update(value).digest('hex');
   assert.equal(hash(JSON.stringify(v.payload)),v.hash,'Conteudo de versao alterado');
   assert.equal(hash(Buffer.from(v.pdf,'base64')),v.documentHash,'PDF alterado');
   assert.ok(Array.isArray(v.signatures),'Assinaturas ausentes');
   const roles=new Set();
   for(const evidence of v.signatures){
    const {hash:expected,...record}=evidence;assert.equal(hash(JSON.stringify(record)),expected,'Evidencia alterada');
    assert.equal(evidence.versionHash,v.hash,'Assinatura de outra versao');
    assert.equal(evidence.documentHash,v.documentHash,'Assinatura de outro documento');
    assert.ok(['client','speaker'].includes(evidence.role)&&!roles.has(evidence.role),'Papel de assinatura invalido ou duplicado');roles.add(evidence.role);
   }
   if(v.state==='completed'){assert.equal(hash(Buffer.from(v.finalPdf,'base64')),v.finalHash,'PDF final alterado');assert.ok(roles.has('client')&&roles.has('speaker'),'Assinaturas incompletas');}
  }
 }
 for(const row of backup.records){
  if(row.kind==='contract'){assert.equal(ids.get(row.data.clientId)?.kind,'client','Anunciante ausente ou tipo incorreto');if(row.data.speakerId)assert.equal(ids.get(row.data.speakerId)?.kind,'speaker','Locutor ausente ou tipo incorreto');}
  if(['billing','contractVersion','invite'].includes(row.kind))assert.equal(ids.get(row.data.contractId)?.kind,'contract','Contrato ausente ou tipo incorreto');
  if(row.kind==='invite'){
   const version=ids.get(row.data.versionId);assert.equal(version?.kind,'contractVersion','Versao ausente ou tipo incorreto');
   assert.equal(version.data.contractId,row.data.contractId,'Convite associado a outro contrato');
  }
 }
 return {records:ids.size,versions:backup.records.filter(r=>r.kind==='contractVersion').length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{assert.ok(process.argv[2],'Informe o arquivo de backup');const result=verifyBackup(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('Backup verificado:',result.records,'registros,',result.versions,'versoes. Nenhum dado foi importado.');}
 catch{console.error('Backup invalido ou inacessivel. Nenhum dado foi importado.');process.exitCode=1;}
}
