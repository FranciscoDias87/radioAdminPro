import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBackup} from './verify-backup.mjs';
import {createHash} from 'node:crypto';
import {rehearseBackup} from './rehearse-backup.mjs';
test('Verificacao de backup rejeita formato, duplicacao e referencias quebradas',()=>{
 const backup={format:'radioadmin-backup',version:1,records:[{id:'a',kind:'client',data:{id:'a'}}]};
 assert.equal(verifyBackup(backup).records,1);
 assert.throws(()=>verifyBackup({...backup,format:'unknown'}));
 assert.throws(()=>verifyBackup({...backup,records:[...backup.records,...backup.records]}));
 assert.throws(()=>verifyBackup({...backup,records:[{id:'c',kind:'contract',data:{clientId:'missing'}}]}));
});
test('Referencias precisam apontar ao tipo correto e ao mesmo contrato',()=>{
 const records=[{id:'a',kind:'expense',data:{id:'a'}},{id:'c',kind:'contract',data:{id:'c',clientId:'a'}}];
 assert.throws(()=>verifyBackup({format:'radioadmin-backup',version:1,records}),/tipo incorreto/);
 assert.throws(()=>verifyBackup({format:'radioadmin-backup',version:1,records:[{id:'a',kind:'client',data:{id:'outro'}}]}),/divergente/);
});
const hash=value=>createHash('sha256').update(value).digest('hex');
function signedBackup(){
 const payload={contract:{id:'c'}},pdf=Buffer.from('Documento ficticio'),finalPdf=Buffer.from('Documento final ficticio');
 const v={id:'v',contractId:'c',state:'completed',payload,hash:hash(JSON.stringify(payload)),pdf:pdf.toString('base64'),documentHash:hash(pdf),finalPdf:finalPdf.toString('base64'),finalHash:hash(finalPdf)};
 v.signatures=['client','speaker'].map(role=>{const record={id:role,role,versionHash:v.hash,documentHash:v.documentHash};return {...record,hash:hash(JSON.stringify(record))}});
 return {format:'radioadmin-backup',version:1,records:[{id:'a',kind:'client',data:{id:'a'}},{id:'c',kind:'contract',data:{id:'c',clientId:'a'}},{id:'v',kind:'contractVersion',data:v}]};
}
test('Evidencias vinculadas a versao e documento, sem papeis duplicados',()=>{
 assert.equal(verifyBackup(signedBackup()).versions,1);
 for(const change of [{role:'client'},{versionHash:'outro'},{documentHash:'outro'}]){
  const b=signedBackup(),v=b.records[2].data;
  const {hash:old,...record}=v.signatures[1],changed={...record,...change};v.signatures[1]={...changed,hash:hash(JSON.stringify(changed))};
  assert.throws(()=>verifyBackup(b));
 }
 const b=signedBackup();b.records.push({id:'c2',kind:'contract',data:{id:'c2',clientId:'a'}},{id:'i',kind:'invite',data:{contractId:'c2',versionId:'v'}});
 assert.throws(()=>verifyBackup(b),/outro contrato/);
});
test('Ensaio importa e relê backup somente em D1 temporario',async()=>{
 assert.deepEqual(await rehearseBackup(signedBackup()),{records:3,versions:1});
 const b=signedBackup();b.records[2].data.pdf=Buffer.from('Alterado').toString('base64');
 await assert.rejects(()=>rehearseBackup(b),/PDF alterado/);
});
