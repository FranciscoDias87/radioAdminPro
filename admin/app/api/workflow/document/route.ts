import {apiError} from "@/lib/api-security";
import {operatorOf} from "@/lib/operators";
import {stored,contractRow} from "@/lib/workflow-store";
import {BusinessError} from "@/lib/domain";
import {fromBase64} from "@/lib/contract-pdf";
import {checkVersion} from "@/lib/signing-domain";
import {sha256} from "@/lib/signing-crypto";
export async function GET(request:Request){try{
 const operator=await operatorOf(request),url=new URL(request.url),row=await stored(url.searchParams.get("versionId")||"","contractVersion");if(!row)throw new BusinessError("Versão não encontrada.");
 const v=row.data;await contractRow(v.contractId,operator);await checkVersion(v);
 const final=url.searchParams.get("final")==="1";
 if(final&&(v.state!=="completed"||!v.finalPdf))throw new BusinessError("PDF concluído disponível após a confirmação final da OPEC.");
 const bytes=fromBase64(final?v.finalPdf:v.pdf);
 if(final&&await sha256(bytes)!==v.finalHash)throw new BusinessError("Falha na integridade do documento concluído.");
 return new Response(bytes as BodyInit,{headers:{"Content-Type":"application/pdf","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Disposition":`${url.searchParams.get("inline")==="1"?"inline":"attachment"}; filename="contrato-versao-${v.number}${final?"-concluido":""}.pdf"`}});
 }catch(e){return apiError(e);}}
