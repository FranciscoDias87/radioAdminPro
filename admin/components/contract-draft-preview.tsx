"use client";
import {useState} from "react";
import {Eye} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {contractDraftPreview,type DraftPreviewContext} from "@/lib/contract-draft-preview";
import type {ContractTemplate} from "@/lib/domain";

function PendingText({text}:{text:string}){return <>{text.split(/(\[PENDENTE: [^\]]+\])/g).map((part,index)=>part.startsWith("[PENDENTE:")?<mark key={index}>{part}</mark>:part)}</>;}
export function ContractDraftPreview({template,context}:{template?:Omit<ContractTemplate,"active">;context:DraftPreviewContext}){
 const [preview,setPreview]=useState<ReturnType<typeof contractDraftPreview>|null>(null),[error,setError]=useState("");
 function show(form:HTMLFormElement|null){if(!form||!template)return;try{const fields=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,String(value)]));setPreview(contractDraftPreview(fields,context,template));setError("");}catch(e){setPreview(null);setError(e instanceof Error?e.message:"Não foi possível gerar a prévia.");}}
 return <><button type="button" className="pro-outline" disabled={!template} onClick={e=>show(e.currentTarget.form)}><Eye size={17}/>Visualizar minuta</button>
 <Dialog open={!!preview||!!error} onOpenChange={open=>{if(!open){setPreview(null);setError("");}}}><DialogContent className="pro-dialog draft-preview-dialog"><DialogTitle>Prévia da minuta</DialogTitle><DialogDescription>Rascunho - sem validade de assinatura</DialogDescription>
 {error&&<p role="alert" className="pro-error">{error}</p>}
 {preview&&<><p className="draft-preview-meta">{template?.name} · Revisão {template?.version}</p>{(preview.missing.length>0||preview.notices.length>0)&&<div role="status" className="pro-note">{preview.missing.length>0&&<p>Campos pendentes: {preview.missing.join(", ")}.</p>}{preview.notices.map(n=><p key={n}>{n}</p>)}</div>}
 <article className="draft-preview-text">{preview.text.split(/\r?\n/).map((line,index)=>{const heading=line.match(/^(#{1,3})\s+(.+)$/);if(heading)return <h3 key={index}><PendingText text={heading[2]}/></h3>;return line.trim()?<p key={index}><PendingText text={line.replace(/\*\*(.*?)\*\*/g,"$1")}/></p>:null;})}{preview.notes&&<><h3>Observações</h3><p>{preview.notes}</p></>}<h3>Signatários e confirmação</h3><p>{template?.clientSignatureLabel}: <PendingText text={preview.clientName||"[PENDENTE: Contratante / representante]"}/></p><p>{template?.speakerSignatureLabel}: <PendingText text={preview.speakerName||"[PENDENTE: Locutor]"}/></p><p>{template?.opecSignatureLabel}: a confirmar pela OPEC.</p></article>
 <div className="form-footer"><button type="button" className="pro-outline" onClick={()=>setPreview(null)}>Voltar ao cadastro</button></div></>}
 </DialogContent></Dialog></>;
}
