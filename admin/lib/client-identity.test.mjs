import test from 'node:test';
import assert from 'node:assert/strict';
import {validCpf,validCnpj} from './identifiers.ts';
import {clientSchema,contractSchema,validateContractEdit} from './domain.ts';
import {clientSigner,personType,validateClientIdentity} from './client-identity.ts';
import {contractPdf} from './contract-pdf.ts';
import {PDFDocument} from 'pdf-lib';

const company=clientSchema.parse({id:'client',name:'Empresa de teste',personType:'PJ',document:'11.222.333/0001-81',contact:'Representante',representativeCpf:'529.982.247-25',representativePhone:'11999991234',phone:'11988888888',email:'',address:'Rua de teste, 10, Centro, Água Branca - PI'});
test('PF e PJ: documentos, representante e endereço obrigatórios',()=>{
 assert.ok(validCpf('52998224725'));assert.ok(!validCpf('CPF52998224725'));assert.ok(validCnpj('11.222.333/0001-81'));assert.ok(validCnpj('12.ABC.345/01DE-35'));assert.ok(!validCnpj('11.222.333/0001-82'));assert.ok(!validCnpj('00.000.000/0000-00'));
 assert.doesNotThrow(()=>validateClientIdentity(company));assert.equal(clientSigner(company).phone,company.representativePhone);assert.equal(clientSigner(company).document,company.representativeCpf);
 for(const invalid of [{representativeCpf:''},{representativePhone:''},{address:''},{document:'52998224725'},{contact:''}])assert.throws(()=>validateClientIdentity({...company,...invalid}));
 const pf={...company,personType:'PF',name:'Pessoa física',document:'52998224725',representativeCpf:'',representativePhone:''};assert.doesNotThrow(()=>validateClientIdentity(pf));assert.equal(clientSigner(pf).name,pf.name);assert.equal(clientSigner(pf).phone,pf.phone);assert.equal(clientSigner(pf).document,pf.document);
 assert.equal(personType({...company,personType:undefined}),'PJ');assert.doesNotThrow(()=>clientSchema.parse({id:'legacy',name:'Cadastro antigo'}));
});
test('Modelo copiado no contrato: bloqueio após envio e PDF multipágina',async()=>{
 const template={id:'template',name:'Modelo de teste',version:1,clauses:Array.from({length:90},(_,i)=>`CLÁUSULA ${i+1} - Condição comercial registrada no modelo com preservação do texto.`).join('\n\n'),clientSignatureLabel:'Contratante',speakerSignatureLabel:'Agente',opecSignatureLabel:'Homologação'};
 const contract=contractSchema.parse({id:'contract',clientId:'client',title:'Teste',start:'2026-10-01',end:'2026-10-31',amount:100,spots:10,duration:30,program:'Programa',status:'Rascunho',template});
 assert.doesNotThrow(()=>validateContractEdit(contract,{...contract,template:{...template,version:2}}));assert.throws(()=>validateContractEdit({...contract,stage:1},{...contract,stage:1,template:{...template,version:2}}));
 const bytes=await contractPdf({number:1,createdAt:'2026-10-06T12:00:00Z',hash:'test-hash',payload:{contract,client:company,speaker:{id:'speaker',name:'Locutor',phone:'11999995678',email:'',active:true},station:{id:'station',name:'Rádio de teste',document:'11222333000181',address:'Endereço',dial:'89.1',phone:'',email:''},installments:[]}});
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>3);assert.equal(pdf.getTitle(),'Contrato Teste - versão 1');
});
