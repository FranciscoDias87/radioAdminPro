"use client";
import {useId,useState} from "react";
import {RadioGroup,RadioGroupItem} from "@/components/ui/radio-group";
import type {Client} from "@/lib/domain";
import {personType} from "@/lib/client-identity";
import {AddressFields} from "@/components/address-fields";

export function AdvertiserForm({data}:{data?:Client}){
 const prefix=useId(),[type,setType]=useState<string>(data?personType(data):"PJ");
 return <>
  <fieldset className="identity-kind"><legend>Tipo de anunciante</legend><RadioGroup name="personType" value={type} onValueChange={setType} className="identity-options" aria-label="Tipo de anunciante">{[["PF","Pessoa física"],["PJ","Pessoa jurídica"]].map(([value,label])=><div key={value}><RadioGroupItem value={value} id={`${prefix}-${value}`}/><label htmlFor={`${prefix}-${value}`}>{label}</label></div>)}</RadioGroup></fieldset>
  <label>{type==="PJ"?"Razão social":"Nome completo"}<input name="name" defaultValue={data?.name} maxLength={150} minLength={2} required autoComplete="organization"/></label>
  <label>{type==="PJ"?"CNPJ":"CPF"}<input key={type} name="document" defaultValue={data&&personType(data)===type?data.document:""} maxLength={20} required inputMode={type==="PF"?"numeric":"text"} autoCapitalize="characters"/></label>
  <div className="pro-form-grid"><label>WhatsApp do anunciante<input name="phone" type="tel" defaultValue={data?.phone} maxLength={40} required autoComplete="tel" placeholder="(00) 00000-0000"/></label><label>E-mail<input name="email" type="email" defaultValue={data?.email} maxLength={150} autoComplete="email"/></label></div>
  <label>{type==="PJ"?"Nome completo do representante":"Responsável / contato comercial"}<input name="contact" defaultValue={data?.contact||data?.name} minLength={2} maxLength={150} required autoComplete="name"/></label>
  {type==="PJ"&&<div className="pro-form-grid"><label>CPF do representante<input name="representativeCpf" defaultValue={data?.representativeCpf} inputMode="numeric" maxLength={20} required/></label><label>WhatsApp do representante<input name="representativePhone" type="tel" defaultValue={data?.representativePhone||data?.phone} maxLength={40} required placeholder="(00) 00000-0000"/></label></div>}
  <AddressFields data={data}/>
 </>;
}
