import { z } from "zod";

export const sectors = ["Varejo", "Serviços", "Indústria", "Outros"] as const;
export const stages = ["Rascunho", "Conferência OPEC", "Assinatura do cliente", "Assinatura do locutor", "Confirmação final OPEC", "Concluído"] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "Data inválida");
const id = z.string().min(1).max(100);
const short = z.string().max(150);
export const clientSchema = z.object({ id, name: short.min(2), document: z.string().max(50).default(""), contact: short.default(""), email: z.union([z.literal(""), z.string().email()]).default(""), phone: z.string().max(40).default(""), creatorId:z.string().default("") });
export const speakerSchema = z.object({ id, name: short.min(2), email: z.union([z.literal(""), z.string().email()]).default(""), phone: z.string().max(40).default(""), active: z.boolean().default(true) });
export const contractSchema = z.object({
  id, clientId: id, title: short.min(2), start: day, end: day,
  amount: z.number().positive().max(10000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001),
  spots: z.number().int().positive().max(1000000), duration: z.number().int().positive().max(3600),
  program: short.min(1), status: z.enum(["Rascunho", "Ativo", "Encerrado", "Cancelado"]),
  paid: z.boolean().default(false), delivered: z.number().int().nonnegative().default(0),
  sector: z.enum(sectors).default("Outros"), speakerId: z.string().max(100).default(""),
  commissionRate: z.number().min(0).max(100).default(30), manager: short.default(""), notes: z.string().max(4000).default(""),
  stage: z.number().int().min(0).max(5).default(0),
  history: z.array(z.object({ date: z.string(), text: z.string(), actor: z.string().optional() })).default([]),
  cancelReason: z.string().max(1000).default(""),
  creatorId:z.string().default(""),
  workflowVersion:z.number().int().nonnegative().default(0),
  snapshot: z.object({client:clientSchema,station:stationSchemaForSnapshot(),speakerName:short,capturedAt:z.string()}).optional()
}).refine(c => c.end >= c.start && c.delivered <= c.spots, "Período ou inserções inválidos");
export const expenseSchema = z.object({id, title:short.min(2), date:day, amountCents:z.number().int().positive().max(1000000000), category:short.min(1), notes:z.string().max(1000).default("")});
export const stationSchema = z.object({id:z.literal("station"), name:short.min(2), dial:short.default(""), document:short.default(""), address:z.string().max(500).default(""), email:short.default(""), phone:short.default("")});
export type Client = z.infer<typeof clientSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Station = z.infer<typeof stationSchema>;
function stationSchemaForSnapshot(){return z.object({id:z.literal("station"),name:short,dial:short,document:short,address:z.string(),email:short,phone:short});}
export type Payment = {id:string; amountCents:number; date:string; method:string; note:string; recordedAt:string; actor?:string; reversalOf?:string};
export type Invoice = {id:string; number:number; due:string; amountCents:number; payments:Payment[]};
export type Billing = {id:string; contractId:string; invoices:Invoice[]; commissionPayments:Payment[]};
export type Row = {kind:string; data:any};
export const cents = (amount:number) => Math.round(amount * 100);
export const money = (amountCents:number) => (amountCents / 100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export const paidInvoice = (i:Invoice) => i.payments.reduce((s,p)=>s+p.amountCents,0);
export const openInvoice = (i:Invoice) => i.amountCents-paidInvoice(i);
export function installmentDate(first:string, offset:number){
  const [year,month,dayOfMonth] = first.split("-").map(Number);
  const last = new Date(Date.UTC(year,month+offset,0)).getUTCDate();
  const d = new Date(Date.UTC(year,month-1+offset,Math.min(dayOfMonth,last)));
  return d.toISOString().slice(0,10);
}
export function makeBilling(c:Contract,count:number,first:string):Billing {
  const total=cents(c.amount);
  if(!Number.isInteger(count)||count<1||count>60||count>total)throw new BusinessError("Quantidade de parcelas inválida");
  day.parse(first);
  const base=Math.floor(total/count),remainder=total%count;
  return {id:`billing:${c.id}`,contractId:c.id,commissionPayments:[],invoices:Array.from({length:count},(_,index)=>({
    id:`${c.id}:${index+1}`,number:index+1,due:installmentDate(first,index),amountCents:base+(index<remainder?1:0),payments:[]
  }))};
}
export function commission(c:Contract,b?:Billing){
  const received=b?b.invoices.reduce((s,i)=>s+paidInvoice(i),0):c.paid?cents(c.amount):0;
  const planned=c.speakerId?Math.round(cents(c.amount)*c.commissionRate/100):0;
  const released=cents(c.amount)?Math.round(planned*received/cents(c.amount)):0;
  const paid=b?.commissionPayments.reduce((s,p)=>s+p.amountCents,0)||0;
  return {planned,released,paid,available:released-paid,received};
}
export function recordReceipt(b:Billing,invoiceId:string,p:Payment):Billing {
  const invoice=b.invoices.find(i=>i.id===invoiceId);
  if(!invoice)throw new BusinessError("Cobrança não encontrada");
  if(!Number.isInteger(p.amountCents)||p.amountCents<=0||p.amountCents>openInvoice(invoice))throw new BusinessError("Valor maior que o saldo da cobrança");
  return {...b,invoices:b.invoices.map(i=>i.id===invoiceId?{...i,payments:[...i.payments,p]}:i)};
}
export function recordCommission(c:Contract,b:Billing,p:Payment):Billing {
  if(c.stage!==5||!["Ativo","Encerrado"].includes(c.status))throw new BusinessError("Repasse permitido somente após homologação, para contratos ativos ou encerrados. Contratos cancelados exigem acerto administrativo.");
  if(!Number.isInteger(p.amountCents)||p.amountCents<=0||p.amountCents>commission(c,b).available)throw new BusinessError("Valor maior que a comissão disponível");
  return {...b,commissionPayments:[...b.commissionPayments,p]};
}
export class BusinessError extends Error {}
export function validateContractEdit(previous:Contract,next:Contract){
  if(previous.status==="Cancelado"&&next.cancelReason!==previous.cancelReason)throw new BusinessError("Motivo do cancelamento preservado no histórico.");
  if(next.status!==previous.status){
    if(["Cancelado","Encerrado"].includes(previous.status))throw new BusinessError("Contrato finalizado não pode ser reaberto por edição.");
    if(next.status==="Cancelado"){
      if(next.cancelReason.trim().length<5)throw new BusinessError("Informe o motivo do cancelamento.");
    }else if(!(previous.status==="Ativo"&&next.status==="Encerrado"))throw new BusinessError("Ativação somente após concluir a conferência e homologação.");
  }
  const fields=["clientId","title","amount","speakerId","commissionRate","start","end","spots","duration","program","sector","manager","notes"] as const;
  if((previous.stage>=1||["Cancelado","Encerrado"].includes(previous.status))&&fields.some(k=>previous[k]!==next[k]))throw new BusinessError("Condições preservadas enquanto o contrato está em conferência ou assinatura. Solicite devolução à OPEC antes de editar.");
}
export function reversePayment(c:Contract,b:Billing,kind:"receipt"|"commission",paymentId:string,p:Payment):Billing{
  if(p.note.trim().length<5)throw new BusinessError("Informe o motivo do estorno (mínimo de 5 caracteres).");
  const list=kind==="commission"?b.commissionPayments:b.invoices.flatMap(i=>i.payments);
  const original=list.find(x=>x.id===paymentId);
  if(!original||original.amountCents<=0||original.reversalOf)throw new BusinessError("Lançamento não disponível para estorno.");
  if(list.some(x=>x.reversalOf===paymentId))throw new BusinessError("Este lançamento já foi estornado.");
  const reversal={...p,amountCents:-original.amountCents,reversalOf:original.id};
  const next=kind==="commission"?{...b,commissionPayments:[...b.commissionPayments,reversal]}:{...b,invoices:b.invoices.map(i=>i.payments.some(x=>x.id===paymentId)?{...i,payments:[...i.payments,reversal]}:i)};
  if(commission(c,next).available<0)throw new BusinessError("Estorne primeiro o repasse de comissão vinculado a este recebimento.");
  return next;
}
