import { BusinessError } from "./domain";
import { z } from "zod";

export function actorOf(request:Request){
  const id=request.headers.get("oai-authenticated-user-id");
  const email=request.headers.get("oai-authenticated-user-email");
  if(id&&email)return {id,label:email};
  if(import.meta.env.DEV)return {id:"local-dev",label:"Desenvolvimento local"};
  throw new BusinessError("Autenticação necessária.");
}
export function checkOrigin(request:Request){
  if(request.headers.get("sec-fetch-site")==="cross-site")throw new BusinessError("Origem da solicitação não autorizada.");
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)throw new BusinessError("Origem da solicitação não autorizada.");
}
export function apiError(error:unknown){
  console.error('radioadmin.request_failed',{type:error instanceof Error?error.name:'UnknownError'});
  if(error instanceof z.ZodError||error instanceof SyntaxError)return Response.json({error:"Confira os campos e datas informados."},{status:400});
  if(error instanceof BusinessError)return Response.json({error:error.message},{status:error.message==="Autenticação necessária."?401:400});
  return Response.json({error:"Não foi possível concluir a operação. Tente novamente."},{status:503});
}
export function auditStatement(db:any,actor:{id:string;label:string},action:string,recordId:string,before:any,after:any,conditional=false){
  const id=`audit:${crypto.randomUUID()}`;
  const data=JSON.stringify({id,actorId:actor.id,actor:actor.label,action,recordId,date:new Date().toISOString(),before,after});
  return db.prepare(`INSERT INTO records (id,kind,data) SELECT ?,'audit',?${conditional?" WHERE changes()=1":""}`).bind(id,data);
}
