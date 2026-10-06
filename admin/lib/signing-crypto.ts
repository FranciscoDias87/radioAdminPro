const encoder=new TextEncoder();
export const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export async function sha256(value:string|Uint8Array){return hex(await crypto.subtle.digest("SHA-256",typeof value==="string"?encoder.encode(value):value as BufferSource));}
export async function hmac(secret:string,value:string){
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(value)));
}
export function secureEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
export async function encryptToken(secret:string,token:string){
 const raw=await crypto.subtle.digest("SHA-256",encoder.encode(secret));
 const key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt"]);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(token));
 return `${hex(iv.buffer)}.${hex(encrypted)}`;
}
export async function decryptToken(secret:string,value:string){
 const bytes=(s:string)=>Uint8Array.from(s.match(/.{2}/g)||[],x=>parseInt(x,16));
 const [iv,data]=value.split(".");
 const raw=await crypto.subtle.digest("SHA-256",encoder.encode(secret));
 const key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"]);
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes(iv)},key,bytes(data)));
}
