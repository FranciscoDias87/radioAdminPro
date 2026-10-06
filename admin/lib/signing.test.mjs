import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {mkdir,writeFile} from 'node:fs/promises';
import {sha256,hmac,decryptToken,encryptToken,randomToken} from './signing-crypto.ts';
import {checkInvite,validCpf,phoneNumber} from './signing-domain.ts';
const secret='isolated-test-secret-not-a-production-key';
test('Tokens criptografados, CPF, telefone e expiração',async()=>{
 const token=randomToken();assert.equal(token.length,64);assert.equal(await decryptToken(secret,await encryptToken(secret,token)),token);
 assert.equal(validCpf('529.982.247-25'),true);assert.equal(validCpf('111.111.111-11'),false);assert.equal(validCpf('52998224724'),false);assert.equal(phoneNumber('(11) 99999-1234'),'5511999991234');assert.throws(()=>phoneNumber('123'));
 const c={workflowVersion:1,stage:2,status:'Rascunho'},v={number:1,state:'client'},i={role:'client',expiresAt:new Date(Date.now()+60000).toISOString()};checkInvite(c,v,i);assert.throws(()=>checkInvite(c,v,{...i,revokedAt:'now'}));assert.throws(()=>checkInvite(c,v,{...i,expiresAt:'2000-01-01'}));assert.throws(()=>checkInvite({...c,workflowVersion:2},v,i));assert.throws(()=>checkInvite(c,v,{...i,role:'speaker'}));
});
test('Fluxo completo isolado: perfis, versão, cliente, locutor, OPEC e PDF',async()=>{
 const bundle=await build({entryPoints:['lib/workflow-test-worker.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],define:{'import.meta.env.DEV':'false'},logLevel:'silent'});
 const codes=new Map(),links=[];
 const options={modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'test-database'},bindings:{SIGNING_BRIDGE_SECRET:secret,SIGNING_ORIGIN:'https://signing.example',WHATSAPP_TOKEN:'test-only',WHATSAPP_PHONE_ID:'123',WHATSAPP_API_VERSION:'v25.0',WHATSAPP_SIGN_TEMPLATE:'test_link',WHATSAPP_OTP_TEMPLATE:'test_otp'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'graph.facebook.com');const body=await request.json();if(body.template.name==='test_otp')codes.set(body.to,body.template.components[0].parameters[0].text);else links.push(body);return Response.json({messages:[{id:'isolated-test-message'}]});}};const mf=new Miniflare(options);
 try{
 let db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL)').run();
 async function request(path,body,actor='owner'){const headers={'Content-Type':'application/json'};if(actor){headers['oai-authenticated-user-id']=actor;headers['oai-authenticated-user-email']=actor+'@example.test';}const r=await mf.dispatchFetch('https://admin.example'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
 async function read(id){const row=await db.prepare('SELECT data FROM records WHERE id=?').bind(id).first();return JSON.parse(row.data);}
 async function workflow(action,c,extra={},actor='owner'){return request('/api/workflow',{action,contractId:c.id,expected:JSON.stringify(c),...extra},actor);}
 async function invitation(c,role){const rows=await db.prepare("SELECT data FROM records WHERE kind='invite'").all();const i=rows.results.map(r=>JSON.parse(r.data)).find(i=>i.versionId==='version:'+c.id+':'+c.workflowVersion&&i.role===role&&!i.revokedAt);return {i,token:await decryptToken(secret,i.encryptedToken)};}
 async function bridge(op,token,extra={}){const raw=JSON.stringify({op,token,...extra}),timestamp=String(Date.now()),nonce=crypto.randomUUID();const r=await mf.dispatchFetch('https://admin.example/api/signing-bridge',{method:'POST',headers:{'Content-Type':'application/json','x-radioadmin-timestamp':timestamp,'x-radioadmin-nonce':nonce,'x-radioadmin-signature':await hmac(secret,timestamp+'.'+nonce+'.'+raw)},body:raw});return {status:r.status,body:await r.json()};}
 assert.equal((await request('/api/records',undefined,null)).status,401);
 assert.equal((await request('/api/records')).status,200);
 const client={id:'client-test',name:'Anunciante fictício',document:'12.345.678/0001-90',contact:'Representante de teste',phone:'11999991234',email:''},speaker={id:'speaker-test',name:'Locutor de teste',phone:'11999995678',email:'',active:true},station={id:'station',name:'Emissora de teste',document:'12.345.678/0001-90',dial:'100.1 FM',address:'Endereço de teste',phone:'',email:''};
 for(const [kind,data] of [['client',client],['speaker',speaker],['station',station]])assert.equal((await request('/api/records',{kind,data})).status,200);
 for(const [id,role] of [['opec','opec'],['agent','agent'],['finance','finance']])assert.equal((await request('/api/operators',{id,label:id,role,speakerId:speaker.id,active:true})).status,200);
 let c={id:'contract-test',clientId:client.id,speakerId:speaker.id,title:'Campanha de teste isolado',start:'2026-10-01',end:'2026-10-31',amount:100,spots:10,duration:30,program:'Programa de teste',status:'Rascunho',sector:'Varejo',commissionRate:30,manager:'Agente de teste'};
 assert.equal((await request('/api/records',{kind:'contract',data:c,billing:{count:3,first:'2026-10-06'}},'agent')).status,200);c=await read(c.id);
 assert.equal(c.creatorId,'agent');assert.equal((await workflow('submit',c,{},'agent')).status,200);c=await read(c.id);
 assert.equal((await workflow('approve',c,{confirmed:true},'agent')).status,400);assert.equal((await workflow('submit',c,{},'finance')).status,400);
 assert.equal((await request('/api/actions',{action:'advance',contractId:c.id,expected:JSON.stringify(c)})).status,400);
 assert.equal((await request('/api/records',{kind:'contract',data:{...c,title:'Alterado'},previous:JSON.stringify(c)},'agent')).status,400);
 const confirm={confirmed:true,expectedClient:JSON.stringify(await read(client.id)),expectedSpeaker:JSON.stringify(await read(speaker.id)),expectedStation:JSON.stringify(await read('station'))};
 assert.equal((await workflow('approve',c,confirm,'opec')).status,200);c=await read(c.id);assert.equal(c.stage,2);assert.equal(c.workflowVersion,1);assert.equal(links.length,1);
 assert.equal((await workflow('finalize',c,{},'opec')).status,400);
 const first=await invitation(c,'client');const view=await bridge('view',first.token);assert.equal(view.status,200);assert.equal(view.body.signatures.length,0);
 assert.equal((await request('/api/signing-bridge',{op:'view',token:first.token})).status,403);
 assert.equal((await bridge('otp',first.token)).status,200);assert.equal((await bridge('otp',first.token)).status,400);
 const sign={name:'Representante fictício',document:'52998224725',code:codes.get(first.i.phone),consent:true,versionHash:view.body.versionHash,documentHash:view.body.documentHash,ip:'192.0.2.1',userAgent:'Isolated test'};
 assert.equal((await bridge('sign',first.token,{...sign,documentHash:'wrong'})).status,400);
 const parallel=await Promise.all([bridge('sign',first.token,sign),bridge('sign',first.token,sign)]);assert.equal(parallel.filter(r=>r.status===200).length,1);c=await read(c.id);assert.equal(c.stage,3);assert.equal(links.length,2);
 assert.equal((await bridge('sign',first.token,sign)).status,400);
 assert.equal((await workflow('return',c,{reason:'Corrigir condição comercial'},'opec')).status,200);c=await read(c.id);assert.equal(c.stage,0);const old=await read('version:'+c.id+':1');assert.equal(old.state,'superseded');assert.equal(old.signatures.length,1);assert.equal((await bridge('view',first.token)).status,400);
 assert.equal((await request('/api/records',{kind:'contract',data:{...c,notes:'Condição revisada'},previous:JSON.stringify(c)},'agent')).status,200);c=await read(c.id);
 assert.equal((await workflow('submit',c,{},'agent')).status,200);c=await read(c.id);assert.equal((await workflow('approve',c,confirm,'opec')).status,200);c=await read(c.id);assert.equal(c.workflowVersion,2);
 let active=await invitation(c,'client'),info=await bridge('view',active.token);await bridge('otp',active.token);
 assert.equal((await bridge('sign',active.token,{...sign,code:codes.get(active.i.phone),versionHash:info.body.versionHash,documentHash:info.body.documentHash})).status,200);c=await read(c.id);active=await invitation(c,'speaker');info=await bridge('view',active.token);await bridge('otp',active.token);
 for(let attempt=0;attempt<5;attempt++)assert.equal((await bridge('sign',active.token,{...sign,code:codes.get(active.i.phone)==='000000'?'111111':'000000',versionHash:info.body.versionHash,documentHash:info.body.documentHash})).status,400);
 assert.equal((await bridge('sign',active.token,{...sign,code:codes.get(active.i.phone),versionHash:info.body.versionHash,documentHash:info.body.documentHash})).status,400);
 assert.equal((await workflow('renew',c,{},'opec')).status,200);c=await read(c.id);active=await invitation(c,'speaker');info=await bridge('view',active.token);assert.equal((await bridge('otp',active.token)).status,200);
 assert.equal((await bridge('sign',active.token,{...sign,name:'Locutor fictício',code:codes.get(active.i.phone),versionHash:info.body.versionHash,documentHash:info.body.documentHash})).status,200);c=await read(c.id);assert.equal(c.stage,4);assert.equal((await workflow('finalize',c,{},'finance')).status,400);assert.equal((await workflow('finalize',c,{},'opec')).status,200);c=await read(c.id);assert.equal(c.stage,5);assert.equal(c.status,'Ativo');
 const failed={...sign,name:'Locutor fictício',code:'000000',versionHash:info.body.versionHash,documentHash:info.body.documentHash};
 const final=await read('version:'+c.id+':2');assert.equal(final.signatures.length,2);assert.equal(final.documentHash,info.body.documentHash);assert.equal(await sha256(Uint8Array.from(atob(final.finalPdf),c=>c.charCodeAt(0))),final.finalHash);
 await mkdir('work/qa',{recursive:true});await writeFile('work/qa/contract-signed-test.pdf',Buffer.from(final.finalPdf,'base64'));
 assert.equal((await workflow('finalize',c,{},'opec')).status,400);const oldAgain=await read(old.id);assert.equal(oldAgain.pdf,old.pdf);assert.equal(oldAgain.documentHash,old.documentHash);
 assert.equal((await request('/api/actions',{action:'delivery',contractId:c.id,expected:JSON.stringify(c)},'agent')).status,400);assert.equal((await request('/api/actions',{action:'delivery',contractId:c.id,expected:JSON.stringify(c)},'opec')).status,200);
 const visible=await request('/api/records',undefined,'agent');assert.ok(visible.body.every(r=>['client','speaker','contract','billing','station'].includes(r.kind)));assert.equal((await request('/api/records',undefined,'unknown')).status,400);
 const document=await mf.dispatchFetch('https://admin.example/api/workflow/document?versionId='+encodeURIComponent(final.id)+'&final=1',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});assert.equal(document.status,200);assert.equal(document.headers.get('content-type'),'application/pdf');
 await mf.setOptions({...options,bindings:{SIGNING_BRIDGE_SECRET:secret,SIGNING_ORIGIN:'https://signing.example'}});db=await mf.getD1Database('DB');
 const pending={...c,id:'pending-test',title:'Pending setup',status:'Rascunho',stage:0};assert.equal((await request('/api/records',{kind:'contract',data:pending,billing:{count:1,first:'2026-10-06'}},'agent')).status,200);let pc=await read(pending.id);await workflow('submit',pc,{},'agent');pc=await read(pc.id);assert.equal((await workflow('approve',pc,confirm,'opec')).status,200);pc=await read(pc.id);const pi=await invitation(pc,'client');assert.equal(pi.i.notification,'pending');assert.equal((await bridge('view',pi.token)).body.whatsappConfigured,false);assert.equal((await bridge('otp',pi.token)).status,400);assert.equal((await read('version:'+pc.id+':1')).signatures.length,0);
 }finally{await mf.dispose();}
});
