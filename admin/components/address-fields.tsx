"use client";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {brazilStates,type Client} from "@/lib/domain";
export function AddressFields({data}:{data?:Client}){
 const a=data?.addressFields;
 return <fieldset className="template-signers">
  <legend>Endereço do anunciante</legend>
  {!a&&data?.address&&<p className="pro-note">Endereço anterior: {data.address}</p>}
  <div className="pro-form-grid"><label>CEP<input name="postalCode" defaultValue={a?.postalCode} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" pattern="[0-9]{5}-?[0-9]{3}" maxLength={9} required/></label><label>UF<Select name="state" defaultValue={a?.state} required><SelectTrigger aria-label="UF"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{brazilStates.map(state=><SelectItem value={state} key={state}>{state}</SelectItem>)}</SelectContent></Select></label></div>
  <label>Logradouro<input name="street" defaultValue={a?.street} autoComplete="address-line1" placeholder="Rua, avenida, praça..." minLength={2} maxLength={150} required/></label>
  <div className="pro-form-grid"><label>Número<input name="number" defaultValue={a?.number} placeholder="Número ou S/N" maxLength={20} required/></label><label>Complemento<input name="complement" defaultValue={a?.complement} autoComplete="address-line2" maxLength={150}/></label></div>
  <div className="pro-form-grid"><label>Bairro<input name="neighborhood" defaultValue={a?.neighborhood} minLength={2} maxLength={100} required/></label><label>Cidade<input name="city" defaultValue={a?.city} autoComplete="address-level2" minLength={2} maxLength={100} required/></label></div>
 </fieldset>;
}
