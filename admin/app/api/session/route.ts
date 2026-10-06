import {actorOf,apiError} from "@/lib/api-security";
import {operatorOf} from "@/lib/operators";
export async function GET(request:Request){try{const actor=actorOf(request);try{return Response.json({authorized:true,...await operatorOf(request)},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({authorized:false,id:actor.id,label:actor.label},{headers:{'Cache-Control':'no-store'}});}}catch(e){return apiError(e);}}
