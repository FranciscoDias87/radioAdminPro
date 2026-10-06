import {z} from "zod";
import {BusinessError} from "./domain";
import {auditStatement} from "./api-security";
import {workflowDb,stored,contractRow,newInvite,notifyInvite} from "./workflow-store";
import {sha256,hmac,secureEqual} from "./signing-crypto";
import {checkInvite,checkVersion,addSignature,validCpf,consentText,type Invite,type ContractVersion,type Evidence} from "./signing-domain";
import {sendSigningMessage,signingSettings,whatsappReady} from "./whatsapp-signing";
const input=z.object({op:z.enum(["view","otp","sign","document"]),token:z.string().regex(/^[a-f0-9]{64}$/),name:z.string().trim().min(3).max(150).optional(),document:z.string().max(20).optional(),code:z.string().regex(/^\d{6}$/).optional(),consent:z.boolean().optional(),versionHash:z.string().optional(),documentHash:z.string().optional(),ip:z.string().max(100).default(""),userAgent:z.string().max(1000).default("")});
export async function handleSigningBridge(request:Request){
 const secret=signingSettings().SIGNING_BRIDGE_SECRET;if(!secret)throw new BusinessError("Assinatura ainda não configurada.");
 const timestamp=request.headers.get("x-radioadmin-timestamp")||"",nonce=request.headers.get("x-radioadmin-nonce")||"",signature=request.headers.get("x-radioadmin-signature")||"";
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^[a-f0-9-]{36}$/.test(nonce))return Response.json({error:"Solicitação não autorizada."},{status:403});
 const raw=await request.text();if(raw.length>5000)return Response.json({error:"Solicitação inválida."},{status:400});
 if(!secureEqual(await hmac(secret,`${timestamp}.${nonce}.${raw}`),signature))return Response.json({error:"Solicitação não autorizada."},{status:403});
 const body=input.parse(JSON.parse(raw)),db=workflowDb(),tokenHash=await sha256(body.token);
 const ir=await stored(`invite:${tokenHash}`,"invite");if(!ir)throw new BusinessError("Link indisponível. Solicite orientação à OPEC.");
 const i:Invite=ir.data;
 if(body.op==='otp'||body.op==='sign'){
  await db.prepare("DELETE FROM records WHERE kind='bridgeNonce' AND json_extract(data,'$.expiresAt')<?").bind(new Date().toISOString()).run();
  const replay=await db.prepare("INSERT OR IGNORE INTO records (id,kind,data) VALUES (?,'bridgeNonce',?)").bind(`bridgeNonce:${nonce}`,JSON.stringify({expiresAt:new Date(Date.now()+360000).toISOString()})).run();
  if(!replay.meta.changes)return Response.json({error:"Solicitação já utilizada."},{status:409});
 }
 const cr=await contractRow(i.contractId),c=cr.contract,vr=await stored(i.versionId,"contractVersion");if(!vr)throw new BusinessError("Documento indisponível.");
 const v:ContractVersion=vr.data;checkInvite(c,v,i,Date.now(),body.op==="view"||body.op==="document");await checkVersion(v);
 if(body.op==="view")return Response.json({versionId:v.id,number:v.number,title:v.payload.contract.title,station:v.payload.station.name,signerRole:i.role,signerName:i.name,phoneMasked:`+${i.phone.slice(0,4)}*****${i.phone.slice(-4)}`,expiresAt:i.expiresAt,versionHash:v.hash,documentHash:v.documentHash,used:!!i.usedAt,completed:v.state==="completed",finalHash:v.finalHash,whatsappConfigured:whatsappReady(),consentText,summary:{client:v.payload.client.name,amount:v.payload.contract.amount,start:v.payload.contract.start,end:v.payload.contract.end,spots:v.payload.contract.spots,duration:v.payload.contract.duration,program:v.payload.contract.program},signatures:v.signatures.map(s=>({role:s.role,name:s.name,date:s.date,hash:s.hash}))});
 if(body.op==="document"){
  if(v.state==='completed'&&(!v.finalPdf||await sha256(Uint8Array.from(atob(v.finalPdf),c=>c.charCodeAt(0)))!==v.finalHash))throw new BusinessError('Falha de integridade do PDF concluído.');
  return Response.json({pdf:v.state==="completed"?v.finalPdf:v.pdf,hash:v.state==="completed"?v.finalHash:v.documentHash,filename:`contrato-versao-${v.number}${v.state==="completed"?"-concluido":""}.pdf`});
 }
 if(!whatsappReady())throw new BusinessError("A emissora ainda não conectou o WhatsApp oficial. Nenhuma assinatura foi registrada.");
 if(i.attempts>=5)throw new BusinessError("Limite de tentativas atingido. Solicite um novo link à OPEC.");
 if(body.op==="otp"){
  if(i.sends>=6)throw new BusinessError("Limite de códigos atingido. Solicite um novo link à OPEC.");
  if(i.challengeSentAt&&Date.now()-new Date(i.challengeSentAt).getTime()<60000)throw new BusinessError("Aguarde um minuto antes de pedir outro código.");
  const busy={...i,sends:i.sends+1,challengeSentAt:new Date().toISOString(),challengeHash:undefined,challengeExpiresAt:undefined};
  const claimed=await db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(busy),i.id,ir.raw).run();if(!claimed.meta.changes)throw new BusinessError("Solicitação em andamento. Atualize a página.");
  const random=crypto.getRandomValues(new Uint32Array(1))[0];const code=String(random%1000000).padStart(6,"0");
  try{
   await sendSigningMessage(i.phone,"otp",[code]);
   const next={...busy,challengeHash:await hmac(secret,`${i.tokenHash}.${code}`),challengeExpiresAt:new Date(Date.now()+300000).toISOString()};
   const saved=await db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(next),i.id,JSON.stringify(busy)).run();if(!saved.meta.changes)throw new BusinessError("Código substituído. Solicite novamente após um minuto.");
   return Response.json({ok:true,expiresIn:300});
  }catch(e){await db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify({...busy,challengeSentAt:undefined}),i.id,JSON.stringify(busy)).run();throw e;}
 }
 if(!body.name||!body.document||!validCpf(body.document)||!body.code||!body.consent)throw new BusinessError("Informe seu nome, CPF válido, código e concordância.");
 if(body.versionHash!==v.hash||body.documentHash!==v.documentHash)throw new BusinessError("O documento foi atualizado. Confira novamente antes de assinar.");
 const registeredCpf=i.role==="client"?v.payload.client.document.replace(/\D/g,""):"";
 if(registeredCpf.length===11&&body.document.replace(/\D/g,"")!==registeredCpf)throw new BusinessError("O CPF informado não corresponde à parte contratante.");
 if(!i.challengeHash||!i.challengeExpiresAt||new Date(i.challengeExpiresAt).getTime()<=Date.now())throw new BusinessError("Código expirado. Solicite um novo código.");
 // Reserve the attempt before comparing the code, including concurrent requests.
 const attempted={...i,attempts:i.attempts+1};
 const reserved=await db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(attempted),i.id,ir.raw).run();if(!reserved.meta.changes)throw new BusinessError("Solicitação em andamento. Atualize a página.");
 if(!secureEqual(await hmac(secret,`${i.tokenHash}.${body.code}`),i.challengeHash))throw new BusinessError("Código incorreto.");
 const date=new Date().toISOString();
 const record={id:crypto.randomUUID(),versionHash:v.hash,documentHash:v.documentHash,role:i.role,name:body.name,document:body.document.replace(/\D/g,""),phone:i.phone,date,ip:body.ip,userAgent:body.userAgent,method:"Código individual enviado ao WhatsApp cadastrado; CPF e representação declarados",consent:consentText};
 const e:Evidence={...record,hash:await sha256(JSON.stringify(record))};
 const next=addSignature(c,v,e),used={...attempted,usedAt:date,challengeHash:undefined,challengeExpiresAt:undefined};
 const speakerInvite=i.role==="client"?await newInvite(next.version,"speaker"):null;
 const statements=[
  db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(next.contract),c.id,cr.raw,v.id,vr.raw,i.id,JSON.stringify(attempted)),
  db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(next.version),v.id,vr.raw,c.id,JSON.stringify(next.contract)),
  db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(used),i.id,JSON.stringify(attempted),v.id,JSON.stringify(next.version))
 ];
 if(speakerInvite)statements.push(db.prepare("INSERT INTO records (id,kind,data) SELECT ?,'invite',? WHERE changes()=1").bind(speakerInvite.id,JSON.stringify(speakerInvite)));
 statements.push(auditStatement(db,{id:`signer:${i.id}`,label:e.name},`signature.${i.role}`,c.id,{versionId:v.id,stage:c.stage},{versionId:v.id,stage:next.contract.stage,evidence:e},true));
 const result=await db.batch(statements);if(!result[0].meta.changes)throw new BusinessError("Contrato ou convite alterado. Nenhuma assinatura foi concluída nesta solicitação.");
 if(speakerInvite)await notifyInvite(speakerInvite.id);
 return Response.json({ok:true,signatureHash:e.hash,next:i.role==="client"?"speaker":"opec"});
}
