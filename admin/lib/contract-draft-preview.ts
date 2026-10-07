import {makeBilling,type Contract,type Client,type Speaker,type Station,type Billing,type ContractTemplate} from "./domain.ts";
import {renderContractTemplate} from "./contract-template-text.ts";
import {clientSigner} from "./client-identity.ts";
import type {ContractVersion} from "./signing-domain";

export type DraftPreviewContext={data?:Contract;clients:Client[];speakers:Speaker[];station:Station;billing?:Billing};
export function contractDraftPreview(fields:Record<string,string>,context:DraftPreviewContext,template:Pick<ContractTemplate,"clauses">){
 const {data,clients,speakers,station,billing}=context;
 const c={...data,...fields,id:data?.id||"A definir ao salvar",amount:Number(fields.amount),spots:Number(fields.spots),duration:Number(fields.duration),commissionRate:Number(fields.commissionRate)} as Contract;
 const client=clients.find(x=>x.id===fields.clientId)||{id:"",name:"",document:"",contact:"",phone:"",email:"",creatorId:""};
 const speaker=speakers.find(x=>x.id===fields.speakerId)||{id:"",name:"",phone:"",email:"",active:true};
 let installments:ContractVersion["payload"]["installments"]=[];
 const notices:string[]=[],missing:string[]=[];
 try{
  const count=billing?.invoices.length??Number(fields.count),first=billing?.invoices[0]?.due??fields.first;
  if(!Number.isFinite(c.amount)||c.amount<=0)throw Error();
  const revised=makeBilling(c,count,first);
  installments=revised.invoices.map((i,index)=>({number:i.number,due:billing?.invoices[index]?.due||i.due,amountCents:i.amountCents}));
 }catch{notices.push("Complete valor, quantidade de parcelas e primeiro vencimento para conferir o pagamento.");}
 if(fields.start&&fields.end&&fields.end<fields.start)notices.push("O término não pode ser anterior ao início da vigência.");
 const text=renderContractTemplate(template.clauses,{contract:c,client,speaker,station,installments},missing);
 return {text,missing,notices,notes:fields.notes||"",clientName:clientSigner(client).name,speakerName:speaker.name};
}
