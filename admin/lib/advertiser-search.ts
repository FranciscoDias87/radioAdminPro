import type {Client} from "./domain.ts";
import {normalizeDocument} from "./identifiers.ts";
const normalizeName=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
export function searchAdvertisers(clients:Client[],query:string){
 const name=normalizeName(query),document=normalizeDocument(query);
 if(!name)return clients;
 return clients.filter(c=>normalizeName(c.name).includes(name)||(document.length>0&&normalizeDocument(c.document).includes(document)));
}
export function exactAdvertiser(clients:Client[],query:string){
 const document=normalizeDocument(query);
 if(document.length!==11&&document.length!==14)return undefined;
 const matches=clients.filter(c=>normalizeDocument(c.document)===document);
 const longerMatch=clients.some(c=>{const n=normalizeDocument(c.document);return n.length>document.length&&n.startsWith(document);});
 return matches.length===1&&!longerMatch?matches[0]:undefined;
}
