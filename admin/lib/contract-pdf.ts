import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {money} from "./domain.ts";
import type {ContractVersion} from "./signing-domain";
import {clientSigner,personType} from "./client-identity.ts";
export const toBase64=(bytes:Uint8Array)=>{let s="";for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);};
export const fromBase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function contractPdf(v:Pick<ContractVersion,"payload"|"number"|"createdAt"|"hash">){
 const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]),y=785;
 const line=(text:string,size=11,strong=false)=>{
  const safe=text.replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g," ");
  const words=safe.split(/\s+/).flatMap(word=>{const parts:string[]=[];let part='';for(const char of word){if((strong?bold:font).widthOfTextAtSize(part+char,size)>475&&part){parts.push(part);part='';}part+=char;}if(part)parts.push(part);return parts;});let current="";
  for(const word of words){const next=current?current+" "+word:word;if((strong?bold:font).widthOfTextAtSize(next,size)>475&&current){draw(current);current=word;}else current=next;}
  if(current)draw(current);y-=5;
  function draw(value:string){if(y<65){page=pdf.addPage([595.28,841.89]);y=785;}page.drawText(value,{x:60,y,size,font:strong?bold:font,color:rgb(.1,.14,.16)});y-=size+6;}
 };
 const {contract:c,client,speaker,station,installments}=v.payload;
 line(station.name,18,true);line(`CNPJ: ${station.document} | ${station.address}`);
 line("CONTRATO DE VEICULAÇÃO PUBLICITÁRIA",14,true);line(`Referência: ${c.id} | Versão: ${v.number}`);line(`Emissão da versão: ${v.createdAt}`);
 line("PARTES E RESPONSÁVEIS",12,true);line(`Anunciante (${personType(client)}): ${client.name} | CPF/CNPJ: ${client.document}`);line(`Endereço do anunciante: ${client.address||"Não informado"}`);line(`WhatsApp: ${client.phone} | E-mail: ${client.email||"Não informado"}`);line(`Responsável pelo anunciante: ${client.contact}`);
 const signer=clientSigner(client);if(personType(client)==="PJ")line(`Representante: ${signer.name} | CPF: ${signer.document} | Telefone: ${signer.phone}`);
 line(`Locutor/agente: ${speaker.name}`);line(`Gestor: ${c.manager}`);
 line("CONDIÇÕES COMERCIAIS",12,true);line(`Campanha: ${c.title}`);line(`Vigência: ${c.start} a ${c.end} | Setor: ${c.sector}`);line(`Programa/faixa: ${c.program}`);line(`Inserções: ${c.spots} | Duração por inserção: ${c.duration} segundos`);line(`Valor contratado: ${money(Math.round(c.amount*100))}`);line(`Comissão do locutor/agente: ${c.commissionRate}% | Liberação proporcional aos recebimentos registrados.`);
 line("PARCELAS",12,true);for(const i of installments)line(`Parcela ${i.number}: ${money(i.amountCents)} | Vencimento: ${i.due}`);
 if(c.template){line(`MODELO: ${c.template.name} | Revisão ${c.template.version}`,12,true);for(const paragraph of c.template.clauses.split(/\r?\n/)){if(paragraph.trim())line(paragraph);else y-=8;}}
 line("CONDIÇÕES E OBSERVAÇÕES",12,true);line(c.notes||"Sem condições adicionais registradas nesta versão.");
 line("SIGNATÁRIOS E CONFIRMAÇÃO",12,true);line(`${c.template?.clientSignatureLabel||"Cliente / representante"}: ${signer.name}`);line(`${c.template?.speakerSignatureLabel||"Locutor / agente"}: ${speaker.name}`);line(`${c.template?.opecSignatureLabel||"Confirmação final OPEC"}: responsável identificado na homologação.`);
 line("ACEITE ELETRÔNICO",12,true);line("O cliente e o locutor/agente devem confirmar esta mesma versão. A confirmação final pela OPEC somente ocorre após ambos os aceites. As evidências serão anexadas ao documento concluído.");
 line(`Hash SHA-256 dos dados da versão: ${v.hash}`,9);line("O hash verifica integridade e não constitui, isoladamente, verificação de identidade ou assinatura certificada ICP-Brasil.",9);
 pdf.setTitle(`Contrato ${c.title} - versão ${v.number}`);pdf.setAuthor(station.name);pdf.setCreationDate(new Date(v.createdAt));pdf.setModificationDate(new Date(v.createdAt));
 return new Uint8Array(await pdf.save({useObjectStreams:false}));
}
export async function finalContractPdf(v:ContractVersion,approver:string,date:string){
 const pdf=await PDFDocument.load(fromBase64(v.pdf));const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]),y=785;
 const line=(text:string,strong=false)=>{const f=strong?bold:font;if(strong&&y<150){page=pdf.addPage([595.28,841.89]);y=785;}const draw=(value:string)=>{if(y<65){page=pdf.addPage([595.28,841.89]);y=785;}page.drawText(value,{x:60,y,size:10,font:f});y-=16;};const words=text.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g,' ').split(/\s+/).flatMap(word=>{const parts:string[]=[];let p='';for(const char of word){if(f.widthOfTextAtSize(p+char,10)>475&&p){parts.push(p);p='';}p+=char;}if(p)parts.push(p);return parts;});let current='';for(const word of words){const value=current?current+' '+word:word;if(f.widthOfTextAtSize(value,10)>475&&current){draw(current);current=word;}else current=value;}if(current)draw(current);y-=5;};
 line("RELATÓRIO DE EVIDÊNCIAS DOS ACEITES ELETRÔNICOS",true);line(`Contrato: ${v.contractId} | Versão: ${v.number}`);line(`Hash do PDF apresentado aos signatários: ${v.documentHash}`);line(`Hash dos dados da versão: ${v.hash}`);
 for(const s of v.signatures){line(s.role==="client"?(v.payload.contract.template?.clientSignatureLabel||"CLIENTE / REPRESENTANTE"):(v.payload.contract.template?.speakerSignatureLabel||"LOCUTOR / AGENTE"),true);line(`Nome declarado: ${s.name}`);line(`CPF declarado: ${s.document}`);line(`WhatsApp verificado: +${s.phone}`);line(`Data e hora (UTC): ${s.date}`);line(`Método: ${s.method}`);line(`Identificador: ${s.id}`);line(`Hash do registro de assinatura: ${s.hash}`);line(`IP encaminhado pela infraestrutura: ${s.ip||"Não disponível"}`);line(`Navegador informado: ${s.userAgent}`);line(`Manifestação de concordância: ${s.consent}`);}
 line(v.payload.contract.template?.opecSignatureLabel||"CONFIRMAÇÃO FINAL OPEC",true);line(`Responsável: ${approver}`);line(`Data e hora (UTC): ${date}`);line("O código confirma acesso ao WhatsApp cadastrado. Nome, CPF e poderes de representação são declarações do signatário; não houve validação documental externa nem certificação ICP-Brasil.");
 pdf.setModificationDate(new Date(date));return new Uint8Array(await pdf.save({useObjectStreams:false}));
}
