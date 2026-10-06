import {z} from 'zod';
import {operatorOf} from '@/lib/operators';
import {apiError,checkOrigin,auditStatement} from '@/lib/api-security';
import {stored,workflowDb} from '@/lib/workflow-store';
import {BusinessError} from '@/lib/domain';
const input=z.object({id:z.string().min(1).max(200),label:z.string().min(2).max(150),role:z.enum(['admin','opec','agent','finance']),speakerId:z.string().default(''),active:z.boolean(),expected:z.string().optional()});
export async function GET(request:Request){try{await operatorOf(request,['admin']);const rows=await workflowDb().prepare("SELECT id,data FROM records WHERE kind='access'").all();return Response.json(rows.results.map((r:any)=>({recordId:r.id,...JSON.parse(r.data)})),{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
 checkOrigin(request);const actor=await operatorOf(request,['admin']),body=input.parse(await request.json());
 const owner=await stored('access:owner','access');if(body.id==='owner'||body.id===owner?.data.id)throw new BusinessError('O acesso do proprietário não pode ser alterado aqui.');
 if(body.role==='agent'&&!await stored(body.speakerId,'speaker'))throw new BusinessError('Vincule um locutor/agente cadastrado.');
 const id=`access:${body.id}`,previous=await stored(id,'access'),data={id:body.id,label:body.label,role:body.role,speakerId:body.speakerId,active:body.active};
 if(previous&&body.expected!==previous.raw)return Response.json({error:'Perfil alterado. Atualize.'},{status:409});
 const db=workflowDb();
 const result=await db.batch([previous?db.prepare('UPDATE records SET data=? WHERE id=? AND data=?').bind(JSON.stringify(data),id,previous.raw):db.prepare("INSERT INTO records (id,kind,data) VALUES (?,'access',?)").bind(id,JSON.stringify(data)),auditStatement(db,actor,'access.grant',id,previous?.data||null,data,true)]);
 if(!result[0].meta.changes)return Response.json({error:'Perfil alterado.'},{status:409});return Response.json({ok:true});
 }catch(e){return apiError(e);}}
