import {BusinessError,type Speaker} from "./domain.ts";
import {validCpf} from "./identifiers.ts";

export function validateSpeakerIdentity(speaker:Speaker){
 if(!speaker.document||!validCpf(speaker.document))throw new BusinessError("Informe um CPF válido para o locutor.");
 if(!speaker.addressFields)throw new BusinessError("Preencha CEP, logradouro, número, bairro, cidade e UF do locutor.");
 const phone=speaker.phone.replace(/[()\s+\-]/g,"");
 if(!/^(?:55)?[1-9]\d{9,10}$/.test(phone))throw new BusinessError("Informe o WhatsApp do locutor com DDD.");
}
