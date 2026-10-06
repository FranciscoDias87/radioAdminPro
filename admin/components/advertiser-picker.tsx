"use client";
import {useId,useRef,useState} from "react";
import {Check,X} from "lucide-react";
import {Command,CommandInput,CommandList,CommandEmpty,CommandItem,CommandGroup} from "@/components/ui/command";
import type {Client} from "@/lib/domain";
import {searchAdvertisers,exactAdvertiser} from "@/lib/advertiser-search";

export function AdvertiserPicker({clients,defaultValue,disabled}:{clients:Client[];defaultValue?:string;disabled:boolean}){
 const id=useId(),input=useRef<HTMLInputElement>(null),initial=clients.find(c=>c.id===defaultValue);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(initial?.document||initial?.name||""),[selected,setSelected]=useState(defaultValue||"");
 const client=clients.find(c=>c.id===selected),results=searchAdvertisers(clients,query);
 function choose(client:Client){setSelected(client.id);setOpen(false);setQuery(client.document||client.name);}
 function search(value:string){setQuery(value);setOpen(true);setSelected(exactAdvertiser(clients,value)?.id||"");}
 function clear(){setQuery("");setSelected("");setOpen(true);input.current?.focus();}
 return <div className="advertiser-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <label htmlFor={id}>Anunciante</label>
  <input type="hidden" name="clientId" value={selected}/>
  <Command shouldFilter={false} className="advertiser-search"><div className="advertiser-search-input"><CommandInput ref={input} id={id} value={query} onValueChange={search} onFocus={()=>!disabled&&setOpen(true)} disabled={disabled||!clients.length} placeholder="Digite CPF, CNPJ ou nome" aria-expanded={open} aria-required="true" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);}else if(e.key==='ArrowDown'&&!disabled)setOpen(true);}}/>{query&&!disabled&&<button type="button" className="icon-btn" title="Limpar busca e anunciante" aria-label="Limpar busca e anunciante" onClick={clear}><X size={17}/></button>}</div>
   <CommandList hidden={!open||disabled} className="advertiser-search-results">{open&&!disabled&&<><CommandEmpty>Nenhum anunciante encontrado na sua carteira.</CommandEmpty><CommandGroup heading={`${results.length} ${results.length===1?'anunciante encontrado':'anunciantes encontrados'}`}>{results.map(c=><CommandItem value={c.id} key={c.id} onMouseDown={e=>e.preventDefault()} onSelect={()=>choose(c)} className="advertiser-picker-item"><span><strong>{c.name}</strong><small>{c.document||"Documento não informado"}</small></span>{selected===c.id&&<Check size={16}/>}</CommandItem>)}</CommandGroup></>}</CommandList>
  </Command>
  <div className="advertiser-selection" role="status" aria-live="polite">{client&&<><Check size={16}/><strong>{client.name}</strong></>}</div>
 </div>;
}
