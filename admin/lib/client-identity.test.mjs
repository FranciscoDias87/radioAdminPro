import test from 'node:test';
import assert from 'node:assert/strict';
import {validCpf,validCnpj} from './identifiers.ts';
import {clientSchema,speakerSchema,addressSchema,contractSchema,validateContractEdit} from './domain.ts';
import {validateSpeakerIdentity} from './speaker-identity.ts';
import {clientSigner,personType,validateClientIdentity,formatAddress} from './client-identity.ts';
import {contractPdf} from './contract-pdf.ts';
import {PDFDocument} from 'pdf-lib';
import {initialContractTemplate,renderContractTemplate,validateTemplateVariables} from './contract-template-text.ts';
import {versionPayload} from './signing-domain.ts';
import {makeBilling} from './domain.ts';
import {mkdir,writeFile} from 'node:fs/promises';
import {contractDraftPreview} from './contract-draft-preview.ts';

const company=clientSchema.parse({id:'client',name:'Empresa de teste',personType:'PJ',document:'11.222.333/0001-81',contact:'Representante',representativeCpf:'529.982.247-25',representativePhone:'11999991234',phone:'11988888888',email:'',address:'Rua de teste, 10, Centro, Água Branca - PI'});

test('Locutor: CPF, WhatsApp e endereço estruturado, com leitura legada',()=>{
 const speaker=speakerSchema.parse({id:'speaker',name:' Locutor completo ',document:'529.982.247-25',phone:'(11) 99999-5678',email:'locutor@example.com',active:false,addressFields:{postalCode:'64460-000',street:'Rua de teste',number:'S/N',complement:'',neighborhood:'Centro',city:'Água Branca',state:'PI'}});
 assert.doesNotThrow(()=>validateSpeakerIdentity(speaker));assert.equal(speaker.name,'Locutor completo');assert.equal(speaker.addressFields.postalCode,'64460000');assert.equal(speaker.active,false);
 for(const invalid of [{document:''},{document:'11111111111'},{phone:'123'},{addressFields:undefined}])assert.throws(()=>validateSpeakerIdentity({...speaker,...invalid}));
 assert.equal(speakerSchema.parse({id:'legacy',name:'Locutor antigo'}).stageName,undefined);
 assert.equal(speakerSchema.parse({...speaker,stageName:' Voz da rádio '}).stageName,'Voz da rádio');
 assert.throws(()=>speakerSchema.parse({...speaker,stageName:'x'.repeat(151)}));
 assert.throws(()=>speakerSchema.parse({...speaker,email:'invalido'}));
});
test('Endereço estruturado preserva campos, CEP e texto legado',()=>{
 const fields={postalCode:'64460-000',street:' Rua de teste ',number:'S/N',complement:'Sala 2',neighborhood:'Centro',city:'Água Branca',state:'PI'};
 const addressFields=addressSchema.parse(fields);assert.equal(addressFields.postalCode,'64460000');assert.equal(addressFields.street,'Rua de teste');assert.equal(addressFields.number,'S/N');
 assert.equal(formatAddress({addressFields}),'Rua de teste, S/N, Sala 2, Centro, Água Branca/PI, CEP 64460-000');assert.equal(formatAddress(company),company.address);
 assert.doesNotThrow(()=>validateClientIdentity({...company,address:undefined,addressFields}));
 for(const invalid of [{postalCode:'123'},{state:'XX'},{street:''},{number:''},{neighborhood:''},{city:''}])assert.throws(()=>addressSchema.parse({...fields,...invalid}));
});
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

test('Minuta automática: dados reais, PF/PJ, bloqueios e versão congelada',async()=>{
 const template={id:'template-auto',name:'Minuta comercial',version:1,documentMode:'complete',clauses:initialContractTemplate,clientSignatureLabel:'Contratante',speakerSignatureLabel:'Agente',opecSignatureLabel:'Homologação'};
 const c=contractSchema.parse({id:'act-3',clientId:company.id,title:'Aniversário da Loja',start:'2026-08-22',end:'2026-10-25',amount:3400,spots:120,duration:30,program:'Programa da manhã',status:'Rascunho',sector:'Varejo',manager:'Maria Santos',template});
 const speaker=speakerSchema.parse({id:'speaker',name:'Carlos Oliveira',stageName:'Carlos no ar',phone:'11999995678',active:true});
 const station={id:'station',name:'Emissora de teste',document:'11222333000181',address:'Avenida de teste, 1000, São Paulo/SP',dial:'89.1 FM',phone:'',email:''};
 const billing=makeBilling(c,2,'2026-08-22'),payload=versionPayload(c,company,speaker,station,billing),text=payload.contract.template.clauses;
 assert.ok(text.includes(company.name));assert.ok(text.includes('22 de agosto de 2026'));assert.match(text,/3\.400,00/);assert.ok(text.includes('Carlos Oliveira'));assert.ok(text.includes('120'));assert.ok(text.includes('Parcela 2'));assert.ok(!text.includes('{{'));assert.equal(c.template.clauses,initialContractTemplate);
 assert.equal(payload.contract.template.documentMode,'complete');
 const pf={...company,personType:'PF',name:'Pessoa física',document:'52998224725'};
 assert.equal(renderContractTemplate('{{representante.nome}} / {{representante.cpf}}',{...payload,client:pf}),'Pessoa física / 52998224725');
 assert.equal(renderContractTemplate('{{locutor.apelido}}',payload),'Carlos no ar');
 assert.throws(()=>validateTemplateVariables('{{campo.inexistente}}'));assert.throws(()=>validateTemplateVariables('{{contrato.valor}'));
 assert.throws(()=>renderContractTemplate('{{contrato.gestor}}',{...payload,contract:{...c,manager:''}}));
 assert.equal(renderContractTemplate('{{anunciante.nome}}',{...payload,client:{...company,name:'{{contrato.valor}}'}}),'{{contrato.valor}}');
 const changed=versionPayload(c,{...company,name:'Empresa alterada'},speaker,station,billing);assert.notEqual(changed.contract.template.clauses,text);assert.equal(payload.contract.template.clauses,text);
 const bytes=await contractPdf({payload,number:1,createdAt:'2026-10-07T12:00:00Z',hash:'test-hash'});assert.ok((await PDFDocument.load(bytes)).getPageCount()>=2);
 await mkdir('work/qa',{recursive:true});await writeFile('work/qa/contract-template-auto.pdf',bytes);
});

test('Prévia de rascunho usa formulário atual, representante e parcelas sem salvar',()=>{
 const speaker=speakerSchema.parse({id:'speaker',name:'Locutor de teste',phone:'11999995678'}),station={id:'station',name:'Emissora',document:'11222333000181',address:'Rua de teste, 10',dial:'89.1 FM',phone:'',email:''};
 const template={clauses:initialContractTemplate};
 const fields={clientId:company.id,speakerId:speaker.id,title:'Campanha digitada',sector:'Varejo',manager:'Gestor',start:'2026-10-01',end:'2026-10-31',amount:'100.01',spots:'20',duration:'30',program:'Programa',commissionRate:'30',count:'3',first:'2026-10-10',notes:'Observação digitada'};
 const context={clients:[company],speakers:[speaker],station};
 const draft=contractDraftPreview(fields,context,template);assert.deepEqual(draft.missing,[]);assert.deepEqual(draft.notices,[]);assert.ok(draft.text.includes('Campanha digitada'));assert.ok(draft.text.includes('A definir ao salvar'));assert.ok(draft.text.includes('33,34'));assert.ok(draft.text.includes('33,33'));assert.equal(draft.clientName,company.contact);assert.equal(draft.notes,fields.notes);
 const changed=contractDraftPreview({...fields,title:'Campanha corrigida',amount:'200.01'},context,template);assert.ok(changed.text.includes('Campanha corrigida'));assert.ok(changed.text.includes('200,01'));assert.ok(draft.text.includes('100,01'));assert.equal(fields.title,'Campanha digitada');
 const missing=contractDraftPreview({},context,template);assert.ok(missing.missing.includes('Nome / razão social'));assert.ok(missing.missing.includes('Valor global'));assert.ok(missing.missing.includes('Início da vigência'));assert.ok(missing.text.includes('[PENDENTE:'));assert.ok(!missing.text.includes('NaN'));assert.equal(missing.notices.length,1);
 const invalid=contractDraftPreview({...fields,start:'2026-10-31',end:'2026-10-01',first:'2026-02-30'},context,template);assert.equal(invalid.notices.length,2);
});

test('Prévia de edição mantém vencimentos salvos e corresponde à minuta oficial',()=>{
 const c=contractSchema.parse({id:'contract',clientId:company.id,speakerId:'speaker',title:'Campanha',start:'2026-10-01',end:'2026-10-31',amount:100.01,spots:20,duration:30,program:'Programa',status:'Rascunho',manager:'Gestor'});
 const speaker=speakerSchema.parse({id:'speaker',name:'Locutor de teste',phone:'11999995678'}),station={id:'station',name:'Emissora',document:'11222333000181',address:'Rua de teste, 10',dial:'89.1 FM',phone:'',email:''};
 const billing=makeBilling(c,3,'2026-10-10');billing.invoices[1].due='2026-11-15';
 const fields=Object.fromEntries(Object.entries(c).map(([key,value])=>[key,String(value)])),template={clauses:initialContractTemplate},context={data:c,clients:[company],speakers:[speaker],station,billing};
 const preview=contractDraftPreview(fields,context,template);
 assert.equal(preview.text,renderContractTemplate(initialContractTemplate,versionPayload(c,company,speaker,station,billing)));
 const changed=contractDraftPreview({...fields,amount:'120.01'},context,template);assert.ok(changed.text.includes('15 de novembro de 2026'));assert.ok(changed.text.includes('40,01'));assert.ok(changed.text.includes('40,00'));assert.equal(billing.invoices[0].amountCents,3334);
});
