import {BusinessError,cents,money} from "./domain.ts";
import {clientSigner,formatAddress,personType} from "./client-identity.ts";
import type {ContractVersion} from "./signing-domain";

export const templateVariables=[
 ["contrato.numero","Número do contrato"],["emissora.nome","Emissora"],["emissora.cnpj","CNPJ da emissora"],["emissora.endereco","Endereço da emissora"],
 ["anunciante.nome","Nome / razão social"],["anunciante.tipo","PF / PJ"],["anunciante.documento","CPF / CNPJ do anunciante"],["anunciante.endereco","Endereço do anunciante"],
 ["representante.nome","Nome do contratante / representante"],["representante.cpf","CPF do contratante / representante"],["representante.telefone","Telefone do contratante / representante"],
 ["contrato.campanha","Campanha"],["contrato.setor","Setor"],["contrato.inicio","Início da vigência"],["contrato.fim","Fim da vigência"],
 ["contrato.insercoes","Total de inserções"],["contrato.duracao","Duração em segundos"],["contrato.programa","Programa"],["contrato.valor","Valor global"],
 ["locutor.nome","Nome completo do locutor"],["locutor.apelido","Nome artístico"],["contrato.gestor","Gestor comercial"],["contrato.parcelas","Parcelas e vencimentos"]
] as const;
const tokenPattern=/\{\{\s*([^{}]+?)\s*\}\}/g;
export function validateTemplateVariables(text:string){
 const known=new Set<string>(templateVariables.map(([key])=>key));
 const unknown=[...text.matchAll(tokenPattern)].map(m=>m[1].trim()).filter(key=>!known.has(key));
 if(unknown.length)throw new BusinessError(`Campo automático desconhecido: ${unknown[0]}.`);
 const remainder=text.replace(tokenPattern,"");
 if(remainder.includes("{{")||remainder.includes("}}"))throw new BusinessError("Campo automático incompleto. Use {{nome.do.campo}}.");
}
export function renderContractTemplate(text:string,p:ContractVersion["payload"],missing?:string[]){
 validateTemplateVariables(text);
 const {contract:c,client,speaker,station,installments}=p,signer=clientSigner(client);
 const date=(value:string)=>{const d=new Date(value+"T12:00:00Z");return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(d):"";};
 const positive=(value:number)=>Number.isFinite(value)&&value>0?String(value):"";
 const values:Record<string,string>={
  "contrato.numero":c.id,"emissora.nome":station.name,"emissora.cnpj":station.document,"emissora.endereco":station.address,
  "anunciante.nome":client.name,"anunciante.tipo":client.name?personType(client):"","anunciante.documento":client.document,"anunciante.endereco":formatAddress(client),
  "representante.nome":signer.name,"representante.cpf":signer.document,"representante.telefone":signer.phone,
  "contrato.campanha":c.title,"contrato.setor":c.sector,"contrato.inicio":date(c.start),"contrato.fim":date(c.end),
  "contrato.insercoes":positive(c.spots),"contrato.duracao":positive(c.duration),"contrato.programa":c.program,"contrato.valor":positive(c.amount)?money(cents(c.amount)):"",
  "locutor.nome":speaker.name,"locutor.apelido":speaker.stageName||speaker.name,"contrato.gestor":c.manager,
  "contrato.parcelas":installments.map(i=>`Parcela ${i.number}: ${money(i.amountCents)}, vencimento em ${date(i.due)}.`).join("\n")
 };
 return text.replace(tokenPattern,(_,key:string)=>{key=key.trim();const value=values[key];if(!value?.trim()){if(missing){const label=templateVariables.find(([k])=>k===key)?.[1]||key;if(!missing.includes(label))missing.push(label);return `[PENDENTE: ${label}]`;}throw new BusinessError(`Complete o cadastro para preencher {{${key}}}.`);}return value;});
}
export const initialContractTemplate=`# Contrato de Prestação de Serviços Publicitários

Instrumento Nº {{contrato.numero}}

## 1. DAS PARTES
CONTRATADA: {{emissora.nome}}, inscrita no CNPJ sob o nº {{emissora.cnpj}}, com sede em {{emissora.endereco}}.
CONTRATANTE: {{anunciante.nome}} ({{anunciante.tipo}}), inscrita no CPF/CNPJ nº {{anunciante.documento}}, com endereço em {{anunciante.endereco}}, atuante no setor de {{contrato.setor}}. Contratante / representante: {{representante.nome}}, CPF nº {{representante.cpf}}, telefone {{representante.telefone}}.

## 2. DO OBJETO
O presente instrumento tem por objeto a veiculação comercial da campanha intitulada "{{contrato.campanha}}", na programação da CONTRATADA.

## 3. DAS CONDIÇÕES E INSERÇÕES
- Período de vigência: {{contrato.inicio}} até {{contrato.fim}}.
- Total de inserções contratado: {{contrato.insercoes}}.
- Duração de cada inserção: {{contrato.duracao}} segundos.
- Programa/faixa: {{contrato.programa}}.
- Locutor(a) designado(a): {{locutor.nome}}.
- Gestão comercial da emissora: {{contrato.gestor}}.

## 4. DO PREÇO E CONDIÇÕES DE PAGAMENTO
Pela prestação dos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor global de {{contrato.valor}}, conforme as parcelas abaixo:
{{contrato.parcelas}}

## 5. DAS DISPOSIÇÕES GERAIS E FORO
As partes elegem o foro da sede da CONTRATADA para dirimir controvérsias decorrentes deste contrato.`;
