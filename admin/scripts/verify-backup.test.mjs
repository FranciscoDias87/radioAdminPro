import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBackup} from './verify-backup.mjs';
test('Verificacao de backup rejeita formato, duplicacao e referencias quebradas',()=>{
 const backup={format:'radioadmin-backup',version:1,records:[{id:'a',kind:'client',data:{id:'a'}}]};
 assert.equal(verifyBackup(backup).records,1);
 assert.throws(()=>verifyBackup({...backup,format:'unknown'}));
 assert.throws(()=>verifyBackup({...backup,records:[...backup.records,...backup.records]}));
 assert.throws(()=>verifyBackup({...backup,records:[{id:'c',kind:'contract',data:{clientId:'missing'}}]}));
});
