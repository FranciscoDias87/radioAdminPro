import {BusinessError,type Client} from "./domain.ts";
import {normalizeDocument,validCpf,validCnpj} from "./identifiers.ts";
export function personType(client:Client){return client.personType||(normalizeDocument(client.document).length===14?"PJ":"PF");}
export function formatAddress(client:Pick<Client,"address"|"addressFields">){
 const a=client.addressFields;if(!a)return client.address||"";
 const cep=`${a.postalCode.slice(0,5)}-${a.postalCode.slice(5)}`;
 return `${a.street}, ${a.number}${a.complement?`, ${a.complement}`:""}, ${a.neighborhood}, ${a.city}/${a.state}, CEP ${cep}`;
}
export function clientSigner(client:Client){
 return personType(client)==="PJ"?{name:client.contact,document:client.representativeCpf||"",phone:client.representativePhone||client.phone}:{name:client.name,document:client.document,phone:client.phone};
}
export function validateClientIdentity(client:Client){
 const type=personType(client),signer=clientSigner(client);
 if(type==="PF"?!validCpf(client.document):!validCnpj(client.document))throw new BusinessError(type==="PF"?"Informe um CPF válido para o anunciante.":"Informe um CNPJ válido para a empresa.");
 if(!client.addressFields&&(!client.address||client.address.trim().length<8))throw new BusinessError("Informe o endereço completo do anunciante.");
 if(client.contact.trim().length<2)throw new BusinessError("Informe o nome do responsável.");
 if(type==="PJ"&&(!client.representativeCpf||!validCpf(client.representativeCpf)||!client.representativePhone))throw new BusinessError("Informe CPF válido e telefone do representante da empresa.");
 for(const value of [client.phone,signer.phone]){const n=value.replace(/[()\s+\-]/g,"");if(!/^(?:55)?[1-9]\d{9,10}$/.test(n))throw new BusinessError("Informe o WhatsApp com DDD do anunciante e do representante.");}
}
