import {env} from 'cloudflare:workers';
import {operatorOf} from '@/lib/operators';
import {apiError} from '@/lib/api-security';

export async function GET(request:Request){try{
 await operatorOf(request,['admin','opec','finance']);
 if(!env.DB)throw Error('Banco indisponível');
 const url=new URL(request.url),cursor=url.searchParams.get('cursor')||'';
 const page=await env.DB.prepare(`SELECT id,data FROM records WHERE kind='audit' ${cursor?"AND (json_extract(data,'$.date')||'|'||id)<?":''} ORDER BY json_extract(data,'$.date') DESC,id DESC LIMIT 101`).bind(...(cursor?[cursor]:[])).all();
 const items=page.results.slice(0,100).map((r:any)=>{const a=JSON.parse(r.data);return {id:r.id,date:a.date,actor:a.actor,action:a.action,recordId:a.recordId};});
 const last=items.at(-1);
 return Response.json({items,next:page.results.length>100&&last?`${last.date}|${last.id}`:null},{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e);}}
