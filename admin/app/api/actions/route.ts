import {env} from "cloudflare:workers";
import {z} from "zod";
import {contractSchema,clientSchema,stationSchema,speakerSchema,makeBilling,recordReceipt,recordCommission,reversePayment,stages,today,BusinessError} from "@/lib/domain";
import {actorOf,checkOrigin,apiError,auditStatement} from "@/lib/api-security";
import {operatorOf} from "@/lib/operators";
const input=z.object({action:z.enum(["receipt","commission","advance","delivery","billing","reverseReceipt","reverseCommission"]),contractId:z.string().min(1),invoiceId:z.string().optional(),paymentId:z.string().optional(),amountCents:z.number().int().positive().optional(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),method:z.enum(["Pix","Boleto","Transferência","Dinheiro","Cartão","Outro"]).optional(),note:z.string().max(1000).optional(),expected:z.string(),count:z.number().int().min(1).max(60).optional(),first:z.string().optional()});
export async function POST(request:Request){try{
 checkOrigin(request);
 const body=input.parse(await request.json());
 if(body.action==='advance')throw new BusinessError('Aceites internos desativados. Utilize o fluxo de assinatura individual.');
 const actor=await operatorOf(request,body.action==='delivery'?['admin','opec']:['admin','finance']);if(!env.DB)throw Error("Banco indisponível");
 const row:any=await env.DB.prepare("SELECT data FROM records WHERE id=? AND kind='contract'").bind(body.contractId).first();if(!row)return Response.json({error:"Contrato não encontrado"},{status:404});
 const c=contractSchema.parse(JSON.parse(row.data));
 if(body.action==="delivery"){
  if(row.data!==body.expected)return Response.json({error:"Contrato alterado. Atualize e tente novamente."},{status:409});
  if(c.status!=="Ativo"||c.stage!==5||c.delivered>=c.spots)throw new BusinessError("Sem inserções disponíveis ou contrato não homologado");
  c.delivered++;c.history.push({date:new Date().toISOString(),text:"Uma inserção registrada como veiculada",actor:actor.label});
  contractSchema.parse(c);
  const result=await env.DB.batch([env.DB.prepare("UPDATE records SET data=? WHERE id=? AND data=?").bind(JSON.stringify(c),c.id,row.data),auditStatement(env.DB,actor,body.action,c.id,JSON.parse(row.data),c,true)]);if(!result[0].meta.changes)return Response.json({error:"Contrato alterado. Atualize e tente novamente."},{status:409});
 }else{
  const billingRow:any=await env.DB.prepare("SELECT data FROM records WHERE id=? AND kind='billing'").bind(`billing:${c.id}`).first();
  if(body.action==="billing"){
   if(billingRow)throw new BusinessError("Cobranças já geradas");if(c.status==="Cancelado")throw new BusinessError("Contrato cancelado");if(row.data!==body.expected)return Response.json({error:"Contrato alterado. Atualize e tente novamente."},{status:409});const b=makeBilling(c,body.count||1,body.first||c.start);
   if(c.paid)b.invoices.forEach(i=>i.payments.push({id:crypto.randomUUID(),amountCents:i.amountCents,date:c.start,method:"Outro",note:"Recebimento integral informado na versão anterior",recordedAt:new Date().toISOString()}));
   await env.DB.batch([env.DB.prepare("INSERT INTO records (id,kind,data) VALUES (?,'billing',?)").bind(b.id,JSON.stringify(b)),auditStatement(env.DB,actor,"billing.create",c.id,null,b)]);
  }else{
   if(!billingRow)throw new BusinessError("Gere as cobranças primeiro");if(billingRow.data!==body.expected)return Response.json({error:"Saldo alterado. Atualize e tente novamente."},{status:409});
   const reversal=body.action==="reverseReceipt"||body.action==="reverseCommission";
   if(!body.date||(!reversal&&(!body.amountCents||!body.method)))throw new BusinessError("Preencha os dados do pagamento");const d=new Date(body.date+"T12:00:00Z");if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==body.date||body.date>today())throw new BusinessError("Data inválida ou futura");
   const p={id:crypto.randomUUID(),amountCents:body.amountCents||0,date:body.date,method:body.method||"Outro",note:body.note||"",recordedAt:new Date().toISOString(),actor:actor.label};
   const b=JSON.parse(billingRow.data);
   const updated=reversal?reversePayment(c,b,body.action==="reverseReceipt"?"receipt":"commission",body.paymentId||"",p):body.action==="receipt"?recordReceipt(b,body.invoiceId||"",p):recordCommission(c,b,p);
   const result=await env.DB.batch([env.DB.prepare("UPDATE records SET data=? WHERE id=? AND data=? AND (SELECT data FROM records WHERE id=?)=?").bind(JSON.stringify(updated),b.id,billingRow.data,c.id,row.data),auditStatement(env.DB,actor,body.action,c.id,b,updated,true)]);if(!result[0].meta.changes)return Response.json({error:"Contrato ou saldo alterado. Atualize e tente novamente."},{status:409});
  }
 }
 return Response.json({ok:true});
 }catch(e){return apiError(e);}}
