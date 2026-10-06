import {BusinessError,type Contract,type Client,type Speaker,type Station,type Billing} from "./domain.ts";
import {sha256} from "./signing-crypto.ts";
import {clientSigner,validateClientIdentity} from "./client-identity.ts";
export {validCpf} from "./identifiers.ts";
export type SignerRole="client"|"speaker";
export type Evidence={id:string;hash:string;versionHash:string;documentHash:string;role:SignerRole;name:string;document:string;phone:string;date:string;ip:string;userAgent:string;method:string;consent:string};
export type ContractVersion={id:string;contractId:string;number:number;createdAt:string;createdBy:string;payload:{contract:Contract;client:Client;speaker:Speaker;station:Station;installments:{number:number;due:string;amountCents:number}[]};hash:string;documentHash:string;pdf:string;signatures:Evidence[];state:"client"|"speaker"|"opec"|"completed"|"superseded"|"cancelled";finalPdf?:string;finalHash?:string;approvedBy?:string;approvedAt?:string};
export type Invite={id:string;tokenHash:string;encryptedToken:string;contractId:string;versionId:string;role:SignerRole;phone:string;name:string;expiresAt:string;usedAt?:string;revokedAt?:string;notification:"pending"|"sending"|"accepted"|"failed";messageId?:string;notificationError?:string;notificationAttemptAt?:string;challengeHash?:string;challengeExpiresAt?:string;challengeSentAt?:string;attempts:number;sends:number};
export function phoneNumber(value:string){
 const n=value.replace(/\D/g,"");const phone=n.length===10||n.length===11?"55"+n:n;
 if(!/^55[1-9]\d{9,10}$/.test(phone))throw new BusinessError("Cadastre um WhatsApp brasileiro válido com DDD para os dois signatários.");
 return phone;
}
export const consentText="Li integralmente esta versão do contrato e concordo com suas condições. Confirmo meu aceite eletrônico e, quando aplicável, minha autorização para representar a parte contratante.";
export function checkInvite(c:Contract,v:ContractVersion,i:Invite,now=Date.now(),allowUsed=false){
 if(i.revokedAt||new Date(i.expiresAt).getTime()<=now)throw new BusinessError("Link expirado ou revogado. Solicite um novo link à OPEC.");
 if(i.usedAt&&!allowUsed)throw new BusinessError("Este link já foi utilizado.");
 if(c.workflowVersion!==v.number||c.status==='Cancelado'||(c.status==='Encerrado'&&!(allowUsed&&i.usedAt&&v.state==='completed'))||["superseded","cancelled"].includes(v.state))throw new BusinessError("Esta versão não está disponível para assinatura.");
 if(!i.usedAt&&((i.role==="client"&&(c.stage!==2||v.state!=="client"))||(i.role==="speaker"&&(c.stage!==3||v.state!=="speaker"))))throw new BusinessError("Aguarde a assinatura anterior ou a conferência da OPEC.");
}
export async function checkVersion(v:ContractVersion){
 if(await sha256(JSON.stringify(v.payload))!==v.hash)throw new BusinessError("Falha na integridade da versão. Acione a administração.");
 const pdf=Uint8Array.from(atob(v.pdf),c=>c.charCodeAt(0));
 if(await sha256(pdf)!==v.documentHash)throw new BusinessError("Falha na integridade do documento.");
}
export function addSignature(c:Contract,v:ContractVersion,e:Evidence){
 if(c.workflowVersion!==v.number||['Cancelado','Encerrado'].includes(c.status))throw new BusinessError('Versão indisponível.');
 if(e.versionHash!==v.hash||e.documentHash!==v.documentHash)throw new BusinessError("A assinatura não corresponde ao documento.");
 if(v.signatures.some(s=>s.role===e.role))throw new BusinessError("Signatário já assinou esta versão.");
 const required=v.state==="client"?"client":v.state==="speaker"?"speaker":null;
 if(e.role!==required||(e.role==="client"&&c.stage!==2)||(e.role==="speaker"&&c.stage!==3))throw new BusinessError("Sequência de assinatura inválida.");
 if(e.role==="speaker"&&!v.signatures.some(s=>s.role==="client"))throw new BusinessError("O cliente deve assinar primeiro.");
 return {contract:{...c,stage:e.role==="client"?3:4,history:[...c.history,{date:e.date,text:e.role==="client"?"Cliente assinou a versão do contrato":"Locutor/agente assinou a versão do contrato",actor:e.name}]},version:{...v,state:e.role==="client"?"speaker":"opec",signatures:[...v.signatures,e]} as ContractVersion};
}
export function canFinalize(c:Contract,v:ContractVersion){
 if(c.stage!==4||c.workflowVersion!==v.number||v.state!=="opec"||v.signatures.length!==2||!v.signatures.some(s=>s.role==="client")||!v.signatures.some(s=>s.role==="speaker"))throw new BusinessError("As duas assinaturas da mesma versão são obrigatórias antes da confirmação final.");
}
export function versionPayload(c:Contract,client:Client,speaker:Speaker,station:Station,billing:Billing){
 validateClientIdentity(client);
 phoneNumber(clientSigner(client).phone);phoneNumber(speaker.phone);
 if(!client.document.trim()||!client.contact.trim())throw new BusinessError("Informe documento do anunciante e nome do responsável antes de enviar para assinatura.");
 if(!speaker.active)throw new BusinessError("Locutor/agente inativo.");
 if(!station.document.trim())throw new BusinessError("Complete o CNPJ da emissora antes de enviar para assinatura.");
 return {contract:{...c,history:[],snapshot:undefined},client:{...client},speaker:{...speaker},station:{...station},installments:billing.invoices.map(i=>({number:i.number,due:i.due,amountCents:i.amountCents}))};
}
