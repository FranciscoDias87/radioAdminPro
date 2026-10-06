"use client";
import {useId,useState} from "react";
import {Check,ChevronsUpDown} from "lucide-react";
import {Popover,PopoverTrigger,PopoverContent} from "@/components/ui/popover";
import {Command,CommandInput,CommandList,CommandEmpty,CommandItem,CommandGroup} from "@/components/ui/command";
import type {Client} from "@/lib/domain";
import {searchAdvertisers,exactAdvertiser} from "@/lib/advertiser-search";

export function AdvertiserPicker({clients,defaultValue,disabled}:{clients:Client[];defaultValue?:string;disabled:boolean}){
 const id=useId(),[open,setOpen]=useState(false),[query,setQuery]=useState(""),[selected,setSelected]=useState(defaultValue||"");
 const client=clients.find(c=>c.id===selected),results=searchAdvertisers(clients,query);
 function choose(client:Client){setSelected(client.id);setOpen(false);setQuery("");}
 function search(value:string){setQuery(value);const match=exactAdvertiser(clients,value);if(match)choose(match);}
 return <div className="advertiser-picker">
  <label id={id}>Anunciante</label>
  <input type="hidden" name="clientId" value={selected}/>
  <Popover open={open} onOpenChange={value=>{setOpen(value);if(value)setQuery("");}}><PopoverTrigger asChild><button type="button" className="advertiser-picker-trigger" role="combobox" aria-expanded={open} aria-labelledby={id} aria-required="true" disabled={disabled||!clients.length}><span>{client?<><strong>{client.name}</strong><small>{client.document||"Documento não informado"}</small></>:"Buscar CPF, CNPJ ou nome"}</span><ChevronsUpDown size={16}/></button></PopoverTrigger>
   <PopoverContent align="start" className="advertiser-picker-popover"><Command shouldFilter={false}><CommandInput value={query} onValueChange={search} placeholder="CPF, CNPJ ou nome do anunciante" aria-label="Buscar anunciante por CPF, CNPJ ou nome"/><CommandList><CommandEmpty>Nenhum anunciante encontrado na sua carteira.</CommandEmpty><CommandGroup>{results.map(c=><CommandItem value={c.id} key={c.id} onSelect={()=>choose(c)} className="advertiser-picker-item"><span><strong>{c.name}</strong><small>{c.document||"Documento não informado"}</small></span>{selected===c.id&&<Check size={16}/>}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
  </Popover>
 </div>;
}
