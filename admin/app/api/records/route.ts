import { env } from "cloudflare:workers";
import {z} from "zod";
import {clientSchema,speakerSchema,contractSchema,expenseSchema,stationSchema,makeBilling,validateContractEdit,BusinessError} from "@/lib/domain";
import {actorOf,checkOrigin,apiError,auditStatement} from "@/lib/api-security";
import {operatorOf,checkContractAccess} from "@/lib/operators";
function db(){if(!env.DB)throw Error("Banco indisponível");return env.DB;}
export async function GET(request:Request){try{const actor=await operatorOf(request);const result=await db().prepare("SELECT kind, data FROM records WHERE kind IN ('client','speaker','contract','billing','expense','station') ORDER BY id").all();let rows=result.results.map((r:any)=>({kind:r.kind,data:JSON.parse(r.data)}));if(actor.role==='agent'){const own=rows.filter(r=>r.kind==='contract'&&r.data.creatorId===actor.id);const ids=new Set(own.map(r=>r.data.id)),clients=new Set(own.map(r=>r.data.clientId));rows=rows.filter(r=>r.kind==='contract'?ids.has(r.data.id):r.kind==='billing'?ids.has(r.data.contractId):r.kind==='client'?r.data.creatorId===actor.id||clients.has(r.data.id):r.kind==='speaker'?r.data.id===actor.speakerId:r.kind==='station');}else if(actor.role==='opec')rows=rows.filter(r=>r.kind!=='expense');return Response.json(rows,{headers:{"Cache-Control":"no-store"}});}catch(e){return apiError(e);}}
export async function POST(request:Request){
 try{
  checkOrigin(request);
  const body:any=await request.json();
  const actor=await operatorOf(request,body.kind==='expense'?['admin','finance']:body.kind==='station'||body.kind==='speaker'?['admin']:['admin','opec','agent']);
  const schemas:any={client:clientSchema,speaker:speakerSchema,contract:contractSchema,expense:expenseSchema,station:stationSchema};
  const schema=Object.hasOwn(schemas,body?.kind)?schemas[body.kind]:null;if(!schema)return Response.json({error:"Tipo inválido"},{status:400});
  const data=schema.parse(body.data);
  const existing:any=await db().prepare("SELECT kind,data FROM records WHERE id=?").bind(data.id).first();
  if(existing&&existing.kind!==body.kind)return Response.json({error:"Identificador já utilizado."},{status:409});
  const previous=existing?JSON.parse(existing.data):null;
  if(existing&&body.previous!==existing.data)return Response.json({error:"Este registro foi alterado. Atualize a página e tente novamente."},{status:409});
  if(body.kind==='client'){
   data.creatorId=previous?.creatorId||(!previous?actor.id:'');
   if(actor.role==='agent'&&previous){
    if(previous.creatorId!==actor.id)throw new BusinessError('Solicite à OPEC a alteração deste anunciante.');
    const linked:any=await db().prepare("SELECT id FROM records WHERE kind='contract' AND json_extract(data,'$.clientId')=? AND (COALESCE(json_extract(data,'$.creatorId'),'')<>? OR COALESCE(json_extract(data,'$.stage'),0)>0) LIMIT 1").bind(data.id,actor.id).first();
    if(linked)throw new BusinessError('Anunciante compartilhado ou em conferência. Solicite alteração à OPEC.');
   }
  }
  if(body.kind==="contract"){
   if(previous)checkContractAccess(actor,contractSchema.parse(previous));
   if(actor.role==='agent'&&data.speakerId!==actor.speakerId)throw new BusinessError('O agente deve vincular seu próprio cadastro de locutor.');
   if(actor.role==='agent'&&data.commissionRate!==30)throw new BusinessError('A alteração da comissão padrão exige conferência administrativa.');
   if(previous&&data.status!==previous.status&&actor.role==='agent'&&(previous.stage||0)>0)throw new BusinessError('Solicite à OPEC o cancelamento de contratos já enviados.');
   const found:any=await db().prepare("SELECT data FROM records WHERE id=? AND kind='client'").bind(data.clientId).first();
   if(!found)return Response.json({error:"Anunciante não encontrado."},{status:400});
   if(actor.role==='agent'&&JSON.parse(found.data).creatorId!==actor.id){
    const assigned=await db().prepare("SELECT id FROM records WHERE kind='contract' AND json_extract(data,'$.clientId')=? AND json_extract(data,'$.creatorId')=? LIMIT 1").bind(data.clientId,actor.id).first();
    if(!assigned)throw new BusinessError('Anunciante fora da sua carteira. Solicite o vínculo à OPEC.');
   }
   if(data.speakerId&&!await db().prepare("SELECT id FROM records WHERE id=? AND kind='speaker'").bind(data.speakerId).first())return Response.json({error:"Locutor não encontrado."},{status:400});
   if(previous){
    data.stage=previous.stage||0;data.history=[...(previous.history||[])];data.delivered=previous.delivered||0;data.paid=previous.paid||false;data.snapshot=previous.snapshot;data.creatorId=previous.creatorId||'';data.workflowVersion=previous.workflowVersion||0;
    const prior=contractSchema.parse(previous);
    validateContractEdit(prior,data);contractSchema.parse(data);
    data.history.push({date:new Date().toISOString(),text:data.status!==prior.status?`Situação alterada para ${data.status}${data.status==="Cancelado"?": "+data.cancelReason:""}`:"Dados do contrato atualizados",actor:actor.label});
    const billRow:any=await db().prepare("SELECT data FROM records WHERE id=?").bind(`billing:${data.id}`).first();
    if(billRow&&["amount","clientId","speakerId","commissionRate"].some(k=>data[k]!== (prior as any)[k])){
     const bill=JSON.parse(billRow.data);
     if(bill.invoices.some((i:any)=>i.payments.length)||bill.commissionPayments.length)return Response.json({error:"Após registrar pagamentos, valor, anunciante, locutor e percentual ficam preservados."},{status:400});
     const revised=makeBilling(data,bill.invoices.length,bill.invoices[0].due);
     revised.invoices=revised.invoices.map((i:any,index:number)=>({...i,due:bill.invoices[index].due}));
     const serialized=JSON.stringify(data);
     const result=await db().batch([
      db().prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(serialized,data.id,existing.data,bill.id,billRow.data),
      db().prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(revised),bill.id,billRow.data,data.id,serialized),
      auditStatement(db(),actor,"contract.update",data.id,{contract:previous,billing:bill},{contract:data,billing:revised},true)
     ]);
     if(!result[0].meta.changes)return Response.json({error:"Saldo alterado. Atualize e tente novamente."},{status:409});
     return Response.json({ok:true});
    }
   }else{
    if(data.status!=="Rascunho")throw new BusinessError("Novos contratos devem começar como rascunho.");
    data.stage=0;data.history=[{date:new Date().toISOString(),text:"Contrato cadastrado",actor:actor.label}];data.delivered=0;data.paid=false;data.creatorId=actor.id;data.workflowVersion=0;delete data.snapshot;
    contractSchema.parse(data);
    const config=z.object({count:z.number().int().min(1).max(60),first:z.string()}).parse(body.billing);
    const bill=makeBilling(data,config.count,config.first);
    await db().batch([
     db().prepare("INSERT INTO records (id,kind,data) VALUES (?,'contract',?)").bind(data.id,JSON.stringify(data)),
     db().prepare("INSERT INTO records (id,kind,data) VALUES (?,'billing',?)").bind(bill.id,JSON.stringify(bill)),
     auditStatement(db(),actor,"contract.create",data.id,null,{contract:data,billing:bill})
    ]);
    return Response.json({ok:true});
   }
  }
  if(existing){
   const agentClient=actor.role==='agent'&&body.kind==='client';
   const query="UPDATE records SET data=? WHERE id=? AND data=?"+(agentClient?" AND NOT EXISTS (SELECT 1 FROM records linked WHERE linked.kind='contract' AND json_extract(linked.data,'$.clientId')=? AND (COALESCE(json_extract(linked.data,'$.creatorId'),'')<>? OR COALESCE(json_extract(linked.data,'$.stage'),0)>0))":'');
   const result=await db().batch([db().prepare(query).bind(JSON.stringify(data),data.id,existing.data,...(agentClient?[data.id,actor.id]:[])),auditStatement(db(),actor,`${body.kind}.update`,data.id,previous,data,true)]);if(!result[0].meta.changes)return Response.json({error:"Registro ou vínculo alterado. Atualize e tente novamente."},{status:409});
  }
  else await db().batch([db().prepare("INSERT INTO records (id,kind,data) VALUES (?,?,?)").bind(data.id,body.kind,JSON.stringify(data)),auditStatement(db(),actor,`${body.kind}.create`,data.id,null,data)]);
  return Response.json({ok:true});
 }catch(e){return apiError(e);}
}
