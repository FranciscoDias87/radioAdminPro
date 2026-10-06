import {env} from "cloudflare:workers";
import {actorOf} from "./api-security";
import {BusinessError,type Contract} from "./domain";
export type OperatorRole="admin"|"opec"|"agent"|"finance";
export type Operator={id:string;label:string;role:OperatorRole;speakerId:string;active:boolean};
export async function operatorOf(request:Request,roles?:OperatorRole[]):Promise<Operator>{
 const actor=actorOf(request);if(!env.DB)throw Error("Banco indisponível");
 // Bootstrap happens only inside the existing owner-private administration.
 const owner={...actor,role:"admin",speakerId:"",active:true};
 await env.DB.prepare("INSERT OR IGNORE INTO records (id,kind,data) VALUES ('access:owner','access',?)").bind(JSON.stringify(owner)).run();
 const row:any=await env.DB.prepare("SELECT data FROM records WHERE id='access:owner'").first();
 const admin:Operator=JSON.parse(row.data);
 let operator=admin.id===actor.id?{...admin,label:actor.label}:null;
 if(!operator){const grant:any=await env.DB.prepare("SELECT data FROM records WHERE id=? AND kind='access'").bind(`access:${actor.id}`).first();if(grant)operator={...JSON.parse(grant.data),label:actor.label};}
 if(!operator||!operator.active)throw new BusinessError(`Acesso não autorizado. Código do colaborador: ${actor.id}`);
 if(roles&&!roles.includes(operator.role))throw new BusinessError("Seu perfil não permite esta operação.");
 return operator;
}
export function checkContractAccess(operator:Operator,contract:Contract){
 if(operator.role==="agent"&&contract.creatorId!==operator.id)throw new BusinessError("Contrato não disponível para este agente.");
}
