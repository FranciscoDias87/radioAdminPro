import {env} from "cloudflare:workers";
import {BusinessError} from "./domain";
type Settings={WHATSAPP_TOKEN?:string;WHATSAPP_PHONE_ID?:string;WHATSAPP_API_VERSION?:string;WHATSAPP_SIGN_TEMPLATE?:string;WHATSAPP_OTP_TEMPLATE?:string;WHATSAPP_LANGUAGE?:string;SIGNING_ORIGIN?:string;SIGNING_BRIDGE_SECRET?:string};
export const signingSettings=()=>env as unknown as Settings;
export function whatsappReady(){const s=signingSettings();return !!(s.WHATSAPP_TOKEN&&s.WHATSAPP_PHONE_ID&&s.WHATSAPP_API_VERSION&&s.WHATSAPP_SIGN_TEMPLATE&&s.WHATSAPP_OTP_TEMPLATE);}
export async function sendSigningMessage(phone:string,kind:"link"|"otp",params:string[]){
 const s=signingSettings();
 if(!whatsappReady())throw new BusinessError("WhatsApp oficial ainda não conectado. O envio permanece pendente.");
 if(!/^v\d+\.\d+$/.test(s.WHATSAPP_API_VERSION!)||!/^\d+$/.test(s.WHATSAPP_PHONE_ID!))throw new BusinessError("Configuração do WhatsApp inválida.");
 const components:any[]=[{type:"body",parameters:params.map(text=>({type:"text",text}))}];
 if(kind==="otp")components.push({type:"button",sub_type:"url",index:"0",parameters:[{type:"text",text:params[0]}]});
 const response=await fetch(`https://graph.facebook.com/${s.WHATSAPP_API_VERSION}/${s.WHATSAPP_PHONE_ID}/messages`,{method:"POST",headers:{Authorization:`Bearer ${s.WHATSAPP_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:phone,type:"template",template:{name:kind==="link"?s.WHATSAPP_SIGN_TEMPLATE:s.WHATSAPP_OTP_TEMPLATE,language:{code:s.WHATSAPP_LANGUAGE||"pt_BR"},components}}),signal:AbortSignal.timeout(15000)});
 const result:any=await response.json();
 if(!response.ok||!result.messages?.[0]?.id)throw new BusinessError("O WhatsApp não aceitou o envio. Confira o número, a conta e os modelos aprovados.");
 return result.messages[0].id as string;
}
