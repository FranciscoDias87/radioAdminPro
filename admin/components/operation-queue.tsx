"use client";
import {FileText,Clock,CheckCircle2} from 'lucide-react';
import {stages,type Contract} from '@/lib/domain';
import type {Operator} from '@/lib/operators';
export function OperationQueue({contracts,operator,onOpen}:{contracts:Contract[];operator?:Operator;onOpen:(id:string)=>void}){
 const active=contracts.filter(c=>!['Cancelado','Encerrado'].includes(c.status));
 const groups=[{title:'Conferência OPEC',stage:1,icon:FileText},{title:'Assinaturas pendentes',stage:2,icon:Clock},{title:'Confirmação final',stage:4,icon:CheckCircle2}];
 return <section className="operation-queue" aria-label="Pendências dos contratos"><h2>Pendências dos contratos</h2><div className="queue-grid">{groups.map(g=>{const items=active.filter(c=>g.stage===2?[2,3].includes(c.stage):c.stage===g.stage);return <section key={g.stage}><h3><g.icon size={17}/>{g.title}<span>{items.length}</span></h3>{items.slice(0,3).map(c=><button key={c.id} onClick={()=>onOpen(c.id)}><strong>{c.title}</strong><small>{stages[c.stage]}</small></button>)}{!items.length&&<p>Sem pendências</p>}{items.length>3&&<small>Mais {items.length-3} na carteira</small>}</section>})}</div></section>;
}
