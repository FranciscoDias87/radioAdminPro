import {env} from "cloudflare:workers";
import {actorOf,apiError} from "@/lib/api-security";
import {operatorOf} from "@/lib/operators";
export async function GET(request:Request){
 try{
  await operatorOf(request,['admin']);
  if(!env.DB)throw Error("Banco indisponível");
  const result=await env.DB.prepare("SELECT id,kind,data FROM records ORDER BY id").all();
  const records=result.results.map((r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.data)}));
  return Response.json({format:"radioadmin-backup",version:1,exportedAt:new Date().toISOString(),records},{headers:{"Cache-Control":"no-store","Content-Disposition":`attachment; filename="radioadmin-backup-${new Date().toISOString().slice(0,10)}.json"`}});
 }catch(e){return apiError(e);}
}
