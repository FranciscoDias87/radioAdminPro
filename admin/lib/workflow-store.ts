import {env} from "cloudflare:workers";
import {BusinessError,contractSchema,clientSchema,speakerSchema,stationSchema,type Contract} from "./domain";
import {auditStatement} from "./api-security";
import {operatorOf,checkContractAccess,type Operator} from "./operators";
import {randomToken,sha256,encryptToken,decryptToken} from "./signing-crypto";
import {versionPayload,phoneNumber,canFinalize,checkVersion,type ContractVersion,type Invite,type SignerRole} from "./signing-domain";
import {contractPdf,finalContractPdf,toBase64} from "./contract-pdf";
import {sendSigningMessage,signingSettings,whatsappReady} from "./whatsapp-signing";
export function workflowDb(){if(!env.DB)throw Error("Banco indisponível");return env.DB;}
export async function stored(id:string,kind?:string){const r:any=await workflowDb().prepare(`SELECT kind,data FROM records WHERE id=?${kind?" AND kind=?":""}`).bind(...(kind?[id,kind]:[id])).first();return r?{raw:r.data as string,data:JSON.parse(r.data)}:null;}
export async function contractRow(id:string,operator?:Operator){const row=await stored(id,"contract");if(!row)throw new BusinessError("Contrato não encontrado.");const c=contractSchema.parse(row.data);if(operator)checkContractAccess(operator,c);return {...row,contract:c};}
export async function newInvite(v:ContractVersion,role:SignerRole):Promise<Invite>{
 const secret=signingSettings().SIGNING_BRIDGE_SECRET;if(!secret)throw new BusinessError("Página de assinatura ainda não conectada.");
 const token=randomToken(),tokenHash=await sha256(token),party=role==="client"?v.payload.client:v.payload.speaker;
 return {id:`invite:${tokenHash}`,tokenHash,encryptedToken:await encryptToken(secret,token),contractId:v.contractId,versionId:v.id,role,phone:phoneNumber(party.phone),name:role==="client"?v.payload.client.contact:party.name,expiresAt:new Date(Date.now()+72*3600000).toISOString(),notification:"pending",attempts:0,sends:0};
}
export async function notifyInvite(id:string){
 const row=await stored(id,"invite");if(!row)return;
 const i:Invite=row.data;if(i.usedAt||i.revokedAt||i.notification==="accepted")return;
 if(new Date(i.expiresAt).getTime()<=Date.now())return;
 if(i.notification==="sending"&&Date.now()-new Date(i.notificationAttemptAt||0).getTime()<60000)return;
 const busy={...i,notification:"sending",notificationAttemptAt:new Date().toISOString()};
 const claimed=await workflowDb().prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(busy),id,row.raw).run();if(!claimed.meta.changes)return;
 try{
  const settings=signingSettings();if(!settings.SIGNING_ORIGIN||!settings.SIGNING_BRIDGE_SECRET)throw new BusinessError("Página de assinatura ainda não conectada.");
  const vrow=await stored(i.versionId,"contractVersion");if(!vrow)throw Error("Versão indisponível");
  const token=await decryptToken(settings.SIGNING_BRIDGE_SECRET,i.encryptedToken);
  const url=`${settings.SIGNING_ORIGIN}/assinar#token=${token}`;
  const messageId=await sendSigningMessage(i.phone,"link",[i.name,vrow.data.payload.station.name,vrow.data.payload.contract.title,url]);
  await workflowDb().prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify({...busy,notification:"accepted",messageId,notificationError:undefined}),id,JSON.stringify(busy)).run();
 }catch(e){
  const message=e instanceof BusinessError?e.message:"Envio não confirmado. Confira a integração antes de tentar novamente.";
  await workflowDb().prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify({...busy,notification:whatsappReady()?"failed":"pending",notificationError:message}),id,JSON.stringify(busy)).run();
 }
}
export async function workflowAction(request:Request,body:{action:string;contractId:string;expected:string;reason?:string;confirmed?:boolean;expectedClient?:string;expectedSpeaker?:string;expectedStation?:string}){
 const operator=await operatorOf(request,body.action==="submit"?["admin","opec","agent"]:["admin","opec"]);
 const row=await contractRow(body.contractId,operator),c=row.contract,db=workflowDb();
 if(row.raw!==body.expected)return Response.json({error:"Contrato alterado. Atualize antes de continuar."},{status:409});
 if(["Cancelado","Encerrado"].includes(c.status))throw new BusinessError("Contrato finalizado não permite esta ação.");
 const date=new Date().toISOString();
 if(body.action==="retry"){
  const invites=await db.prepare("SELECT id,data FROM records WHERE kind='invite' AND json_extract(data,'$.contractId')=? AND json_extract(data,'$.versionId')=?").bind(c.id,`version:${c.id}:${c.workflowVersion}`).all();
  const role=c.stage===2?"client":c.stage===3?"speaker":null;if(!role)throw new BusinessError("Não há signatário aguardando envio.");
  const active=(invites.results as any[]).map(r=>({id:r.id,data:JSON.parse(r.data)})).find(r=>r.data.role===role&&!r.data.revokedAt&&!r.data.usedAt);
  if(!active)throw new BusinessError("Convite indisponível.");
  if(new Date(active.data.expiresAt).getTime()<=Date.now())throw new BusinessError("Link expirado. Use renovar link.");
  await notifyInvite(active.id);return Response.json({ok:true});
 }
 if(body.action==="renew"){
  const role=c.stage===2?"client":c.stage===3?"speaker":null;if(!role)throw new BusinessError("Não há assinatura pendente.");
  const vr=await stored(`version:${c.id}:${c.workflowVersion}`,"contractVersion");if(!vr)throw new BusinessError("Versão indisponível.");
  await checkVersion(vr.data);const i=await newInvite(vr.data,role);
  const next={...c,history:[...c.history,{date,text:"Link individual renovado; convites anteriores revogados",actor:operator.label}]};
  const result=await db.batch([
   db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(next),c.id,row.raw),
   db.prepare("UPDATE records SET data=json_set(data,'$.revokedAt',?) WHERE kind='invite' AND json_extract(data,'$.versionId')=? AND json_extract(data,'$.role')=? AND json_extract(data,'$.usedAt') IS NULL AND (SELECT data FROM records WHERE id=?)=?").bind(date,vr.data.id,role,c.id,JSON.stringify(next)),
   db.prepare("INSERT INTO records (id,kind,data) SELECT ?,'invite',? WHERE (SELECT data FROM records WHERE id=?)=?").bind(i.id,JSON.stringify(i),c.id,JSON.stringify(next)),
   auditStatement(db,operator,"signature.renew",c.id,c,next,true)
  ]);if(!result[0].meta.changes)return Response.json({error:"Contrato alterado."},{status:409});
  await notifyInvite(i.id);return Response.json({ok:true});
 }
 if(body.action==="return"){
  if(c.stage<1||c.stage>=5||!body.reason||body.reason.trim().length<5)throw new BusinessError("Informe o motivo da devolução para um contrato ainda não concluído.");
  const next={...c,stage:0,status:"Rascunho" as const,snapshot:undefined,history:[...c.history,{date,text:`Devolvido para correção: ${body.reason}`,actor:operator.label}]};
  const result=await db.batch([
   db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(next),c.id,row.raw),
   db.prepare("UPDATE records SET data=json_set(data,'$.state','superseded') WHERE id=? AND kind='contractVersion' AND (SELECT data FROM records WHERE id=?)=?").bind(`version:${c.id}:${c.workflowVersion}`,c.id,JSON.stringify(next)),
   db.prepare("UPDATE records SET data=json_set(data,'$.revokedAt',?) WHERE kind='invite' AND json_extract(data,'$.contractId')=? AND json_extract(data,'$.usedAt') IS NULL AND (SELECT data FROM records WHERE id=?)=?").bind(date,c.id,c.id,JSON.stringify(next)),
   db.prepare("INSERT INTO records (id,kind,data) SELECT ?,'audit',? WHERE (SELECT data FROM records WHERE id=?)=?").bind(`audit:${crypto.randomUUID()}`,JSON.stringify({actorId:operator.id,actor:operator.label,action:"contract.return",recordId:c.id,date,before:c,after:next}),c.id,JSON.stringify(next))
  ]);if(!result[0].meta.changes)return Response.json({error:"Contrato alterado."},{status:409});return Response.json({ok:true});
 }
 if(body.action==="approve"){
  if(c.stage!==1||!body.confirmed)throw new BusinessError("Confira o contrato antes de aprovar o envio para assinatura.");
  const client=await stored(c.clientId,"client"),speaker=await stored(c.speakerId,"speaker"),station=await stored("station","station"),billing=await stored(`billing:${c.id}`,"billing");
  if(!client||!speaker||!station||!billing)throw new BusinessError("Complete anunciante, locutor/agente, emissora e parcelas.");
  if(client.raw!==body.expectedClient||speaker.raw!==body.expectedSpeaker||station.raw!==body.expectedStation)throw new BusinessError("Dados cadastrais alterados. Atualize e confira novamente.");
  const number=c.workflowVersion+1;
  const payload=versionPayload(c,clientSchema.parse(client.data),speakerSchema.parse(speaker.data),stationSchema.parse(station.data),billing.data);
  const hash=await sha256(JSON.stringify(payload));
  const pdf=await contractPdf({payload,number,createdAt:date,hash});
  const v:ContractVersion={id:`version:${c.id}:${number}`,contractId:c.id,number,createdAt:date,createdBy:operator.id,payload,hash,documentHash:await sha256(pdf),pdf:toBase64(pdf),signatures:[],state:"client"};
  const invite=await newInvite(v,"client");
  const next={...c,stage:2,workflowVersion:number,snapshot:{client:payload.client,station:payload.station,speakerName:payload.speaker.name,capturedAt:date},history:[...c.history,{date,text:`OPEC aprovou a versão ${number}; assinatura do cliente solicitada`,actor:operator.label}]};
  const result=await db.batch([
   db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=? AND (SELECT data FROM records WHERE id=?)=? AND (SELECT data FROM records WHERE id='station')=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(next),c.id,row.raw,c.clientId,client.raw,c.speakerId,speaker.raw,station.raw,`billing:${c.id}`,billing.raw),
   db.prepare("INSERT INTO records (id,kind,data) SELECT ?,'contractVersion',? WHERE changes()=1").bind(v.id,JSON.stringify(v)),
   db.prepare("INSERT INTO records (id,kind,data) SELECT ?,'invite',? WHERE changes()=1").bind(invite.id,JSON.stringify(invite)),
   auditStatement(db,operator,"contract.approve",c.id,c,{contract:next,versionId:v.id,documentHash:v.documentHash},true)
  ]);if(!result[0].meta.changes)return Response.json({error:"Contrato ou cadastros alterados. Atualize e confira novamente."},{status:409});
  await notifyInvite(invite.id);return Response.json({ok:true});
 }
 if(body.action==="finalize"){
  const vr=await stored(`version:${c.id}:${c.workflowVersion}`,"contractVersion");if(!vr)throw new BusinessError("Contrato não possui versão com assinaturas externas.");
  const v:ContractVersion=vr.data;canFinalize(c,v);await checkVersion(v);
  for(const evidence of v.signatures){const {hash,...record}=evidence;if(await sha256(JSON.stringify(record))!==hash)throw new BusinessError("Falha de integridade em uma evidência de assinatura.");}
  const pdf=await finalContractPdf(v,operator.label,date);
  const final={...v,state:"completed",finalPdf:toBase64(pdf),finalHash:await sha256(pdf),approvedBy:operator.label,approvedAt:date};
  const next={...c,stage:5,status:"Ativo" as const,history:[...c.history,{date,text:`OPEC confirmou a versão ${v.number} após as duas assinaturas; liberado para veiculação`,actor:operator.label}]};
  const result=await db.batch([
   db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(next),c.id,row.raw,v.id,vr.raw),
   db.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(final),v.id,vr.raw,c.id,JSON.stringify(next)),
   auditStatement(db,operator,"contract.finalize",c.id,c,{contract:next,versionId:v.id,finalHash:final.finalHash},true)
  ]);if(!result[0].meta.changes)return Response.json({error:"Contrato alterado. Atualize antes de confirmar."},{status:409});return Response.json({ok:true});
 }
 if(body.action!=="submit"||c.stage!==0||c.status!=="Rascunho")throw new BusinessError("Ação não disponível para esta etapa.");
 if(!c.speakerId)throw new BusinessError("Vincule o locutor/agente responsável antes de enviar para OPEC.");
 const next={...c,stage:1,history:[...c.history,{date,text:"Locutor/agente enviou contrato para conferência OPEC",actor:operator.label}]};
 const result=await db.batch([db.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(next),c.id,row.raw),auditStatement(db,operator,"contract.submit",c.id,c,next,true)]);
 if(!result[0].meta.changes)return Response.json({error:"Contrato alterado."},{status:409});return Response.json({ok:true});
}
