"use client";
import {useRef,useState} from "react";
import {FileText,Plus,Pencil,Check,RefreshCw} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from "@/components/ui/table";
import type {Contract,ContractTemplate} from "@/lib/domain";
import {initialContractTemplate,templateVariables} from "@/lib/contract-template-text";

export function ContractTemplates({templates,canEdit,disabled,busy,onSave}:{templates:ContractTemplate[];canEdit:boolean;disabled:boolean;busy:boolean;onSave:(data:ContractTemplate,previous?:string)=>Promise<boolean>}){
 const [editor,setEditor]=useState<{data?:ContractTemplate}|null>(null);
 const [clauses,setClauses]=useState(initialContractTemplate),textArea=useRef<HTMLTextAreaElement>(null);
 function edit(data?:ContractTemplate){setClauses(data?.clauses??initialContractTemplate);setEditor({data});}
 function insertVariable(key:string){const input=textArea.current,start=input?.selectionStart??clauses.length,end=input?.selectionEnd??start,token=`{{${key}}}`;setClauses(clauses.slice(0,start)+token+clauses.slice(end));requestAnimationFrame(()=>{input?.focus();input?.setSelectionRange(start+token.length,start+token.length);});}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));
  const data={...f,id:editor?.data?.id||`template:${crypto.randomUUID()}`,active:f.active==="true",version:editor?.data?.version||1} as ContractTemplate;
  if(await onSave(data,editor?.data?JSON.stringify(editor.data):undefined))setEditor(null);
 }
 return <section>
  <div className="pro-toolbar"><h2>Modelos de contrato</h2>{canEdit&&<button className="pro-primary" disabled={disabled} onClick={()=>edit()}><Plus size={17}/>Novo modelo</button>}</div>
  {templates.length?<Table><TableHeader><TableRow>{["Modelo","Revisão","Situação","Atualizado em",""] .map((h,i)=><TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{templates.map(t=><TableRow key={t.id}><TableCell><strong>{t.name}</strong></TableCell><TableCell>{t.version}</TableCell><TableCell><span className={`pro-badge ${t.active?"teal":"amber"}`}>{t.active?"Ativo":"Inativo"}</span></TableCell><TableCell>{t.updatedAt?new Date(t.updatedAt).toLocaleString("pt-BR"):"Não informado"}</TableCell><TableCell>{canEdit&&<button className="icon-btn" title="Editar modelo" aria-label={`Editar ${t.name}`} disabled={disabled} onClick={()=>edit(t)}><Pencil size={16}/></button>}</TableCell></TableRow>)}</TableBody></Table>:<div className="pro-empty"><FileText size={28}/><p>Nenhum modelo cadastrado</p></div>}
  <Dialog open={!!editor} onOpenChange={open=>{if(!open&&!busy)setEditor(null)}}><DialogContent className="pro-dialog template-dialog"><DialogTitle>{editor?.data?"Editar modelo":"Novo modelo de contrato"}</DialogTitle><DialogDescription>Cláusulas e identificação dos assinantes</DialogDescription>{editor&&<form className="pro-form" onSubmit={submit} key={editor.data?.id||"new"}>
   <label>Nome do modelo<input name="name" defaultValue={editor.data?.name||"Contrato de prestação de serviços publicitários"} required minLength={2} maxLength={150}/></label>
   <label>Composição do documento<Select name="documentMode" defaultValue={editor.data?(editor.data.documentMode||"clauses"):"complete"}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="complete">Minuta completa</SelectItem><SelectItem value="clauses">Cláusulas adicionais ao resumo comercial</SelectItem></SelectContent></Select></label>
   <label>Inserir campo automático<Select value="" onValueChange={insertVariable}><SelectTrigger><SelectValue placeholder="Selecione o dado"/></SelectTrigger><SelectContent>{templateVariables.map(([key,label])=><SelectItem value={key} key={key}>{label}</SelectItem>)}</SelectContent></Select></label>
   <label>Texto da minuta<textarea ref={textArea} className="template-clauses" name="clauses" value={clauses} onChange={e=>setClauses(e.target.value)} required minLength={20} maxLength={30000} rows={12}/></label>
   <fieldset className="template-signers"><legend>Assinantes</legend><label>Cliente / representante<input name="clientSignatureLabel" defaultValue={editor.data?.clientSignatureLabel||"Contratante / representante legal"} required minLength={2} maxLength={150}/></label><label>Locutor / agente<input name="speakerSignatureLabel" defaultValue={editor.data?.speakerSignatureLabel||"Locutor / agente comercial"} required minLength={2} maxLength={150}/></label><label>Confirmação final da emissora<input name="opecSignatureLabel" defaultValue={editor.data?.opecSignatureLabel||"Homologação OPEC / Assistente Administrativo"} required minLength={2} maxLength={150}/></label></fieldset>
   <label>Situação<Select name="active" defaultValue={String(editor.data?.active??true)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="true">Ativo</SelectItem><SelectItem value="false">Inativo</SelectItem></SelectContent></Select></label>
   <div className="form-footer"><button type="button" className="pro-outline" disabled={busy} onClick={()=>setEditor(null)}>Cancelar</button><button className="pro-primary" disabled={busy}><Check size={16}/>{busy?"Salvando...":"Salvar modelo"}</button></div>
  </form>}</DialogContent></Dialog>
 </section>;
}

export function ContractTemplateChoice({data,templates,locked}:{data?:Contract;templates:ContractTemplate[];locked:boolean}){
 const [selection,setSelection]=useState({id:data?.template?.id||"none",version:data?.template?.version||0});
 const current=templates.find(t=>t.id===selection.id),copied=data?.template?.id===selection.id&&data.template.version===selection.version?data.template:current;
 const options=templates.filter(t=>t.active);
 if(copied&&!options.some(t=>t.id===copied.id))options.push({...copied,active:false});
 return <div className="template-choice">
  <label>Modelo de contrato<Select value={selection.id} disabled={locked} onValueChange={id=>setSelection({id,version:templates.find(t=>t.id===id)?.version||0})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem modelo: resumo comercial</SelectItem>{options.map(t=><SelectItem value={t.id} key={t.id}>{t.name} · revisão {t.id===selection.id?selection.version:t.version}</SelectItem>)}</SelectContent></Select></label>
  <input type="hidden" name="templateId" value={selection.id==="none"?"":selection.id}/><input type="hidden" name="templateVersion" value={selection.version}/>
  {copied&&<><div className="template-revision"><span>Revisão vinculada: {selection.version}</span>{!locked&&current?.active&&current.version!==selection.version&&<button type="button" className="pro-outline compact" onClick={()=>setSelection({id:current.id,version:current.version})}><RefreshCw size={15}/>Usar revisão atual</button>}</div><details className="template-preview"><summary>Cláusulas e assinantes</summary><p>{copied.clauses}</p><dl><dt>Cliente / representante</dt><dd>{copied.clientSignatureLabel}</dd><dt>Locutor / agente</dt><dd>{copied.speakerSignatureLabel}</dd><dt>Homologação</dt><dd>{copied.opecSignatureLabel}</dd></dl></details></>}
 </div>;
}
