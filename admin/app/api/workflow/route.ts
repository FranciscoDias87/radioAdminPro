import {z} from "zod";
import {apiError,checkOrigin} from "@/lib/api-security";
import {operatorOf} from "@/lib/operators";
import {workflowAction,workflowDb,contractRow} from "@/lib/workflow-store";
import {whatsappReady} from "@/lib/whatsapp-signing";
const input=z.object({action:z.enum(["submit","approve","return","finalize","retry","renew"]),contractId:z.string().min(1),expected:z.string(),reason:z.string().max(1000).optional(),confirmed:z.boolean().optional(),expectedClient:z.string().optional(),expectedSpeaker:z.string().optional(),expectedStation:z.string().optional()});
export async function POST(request:Request){try{checkOrigin(request);return await workflowAction(request,input.parse(await request.json()));}catch(e){return apiError(e);}}
export async function GET(request:Request){try{
 const operator=await operatorOf(request),id=new URL(request.url).searchParams.get("contractId")||"";const current=await contractRow(id,operator);
 const rows=await workflowDb().prepare("SELECT data FROM records WHERE kind='contractVersion' AND json_extract(data,'$.contractId')=? ORDER BY CAST(json_extract(data,'$.number') AS INTEGER) DESC").bind(id).all();
 const invites=await workflowDb().prepare("SELECT data FROM records WHERE kind='invite' AND json_extract(data,'$.contractId')=?").bind(id).all();
 return Response.json({current:current.contract,whatsappConfigured:whatsappReady(),versions:rows.results.map((r:any)=>{const {pdf,finalPdf,...version}=JSON.parse(r.data);return version;}),invites:invites.results.map((r:any)=>{const i=JSON.parse(r.data);return {role:i.role,versionId:i.versionId,expiresAt:i.expiresAt,usedAt:i.usedAt,revokedAt:i.revokedAt,notification:i.notification,messageId:i.messageId,notificationError:i.notificationError};})},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiError(e);}}
