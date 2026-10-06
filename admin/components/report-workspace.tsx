"use client";
import {useState} from 'react';
import {FileText,Receipt,Percent,Wallet,RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {ReportActions} from './report-actions';
import {type Contract,type Client,type Speaker,type Billing,type Expense,type Station,commission,paidInvoice,openInvoice,cents,money,today,sectors,stages} from '@/lib/domain';
import {emptyReportFilters,matchesReportFilters,reportRangeError,type ReportFilters,type FilterableReportRow} from '@/lib/report-filters';
import type {ReportData} from '@/lib/report-pdf';

type Kind='contracts'|'billing'|'commission'|'finance';
type Entry={filter:FilterableReportRow; cells:string[]; csv:(string|number)[]; amounts:number[]};
type Props={contracts:Contract[];clients:Client[];speakers:Speaker[];bills:Billing[];expenses:Expense[];station:Station;demo:boolean;canFinance:boolean};
const titles:Record<Kind,string>={contracts:'Contratos comerciais',billing:'Contas a receber',commission:'Comissões dos locutores',finance:'Extrato financeiro'};
const icons={contracts:FileText,billing:Receipt,commission:Percent,finance:Wallet};
const date=(s:string)=>s.split('-').reverse().join('/');
export function ReportWorkspace({contracts,clients,speakers,bills,expenses,station,demo,canFinance}:Props){
 const [kind,setKind]=useState<Kind>('contracts'),[filters,setFilters]=useState<ReportFilters>({...emptyReportFilters}),[busy,setBusy]=useState(false);
 const finance=kind==='finance',invalid=reportRangeError(filters);
 const set=(key:keyof ReportFilters,value:string)=>setFilters(current=>({...current,[key]:value}));
 const clientName=(c:Contract)=>c.snapshot?.client.name||clients.find(x=>x.id===c.clientId)?.name||'Anunciante';
 const speakerName=(id:string)=>speakers.find(x=>x.id===id)?.name||'Sem locutor';
 const billOf=(id:string)=>bills.find(x=>x.contractId===id);
 const base=(c:Contract):FilterableReportRow=>({search:`${clientName(c)} ${c.title} ${c.manager} ${speakerName(c.speakerId)}`,client:c.clientId,speaker:c.speakerId||'none',sector:c.sector,status:c.status,stage:c.stage,start:c.start,end:c.end});
 let headers:string[]=[],entries:Entry[]=[],labels:string[]=[],weights:number[]=[],numeric:number[]=[];
 if(kind==='contracts'){
  headers=['Anunciante','Campanha','Setor','Locutor','Valor','Taxa (%)','Prevista','Etapa / situação','Início','Fim'];weights=[1.4,1.5,.8,1.2,1,.7,1,1.3,.8,.8];numeric=[4,5,6];labels=['Contratado','Comissão prevista'];
  entries=contracts.map(c=>{const planned=commission(c,billOf(c.id)).planned;return {filter:base(c),cells:[clientName(c),c.title,c.sector,speakerName(c.speakerId),money(cents(c.amount)),`${c.commissionRate}%`,money(planned),`${stages[c.stage]} / ${c.status}`,date(c.start),date(c.end)],csv:[clientName(c),c.title,c.sector,speakerName(c.speakerId),c.amount,c.commissionRate,planned/100,`${stages[c.stage]} / ${c.status}`,c.start,c.end],amounts:[cents(c.amount),planned]}});
 }
 if(kind==='billing'){
  headers=['Cliente','Campanha','Parcela','Vencimento','Valor','Recebido','Saldo','Situação'];weights=[1.4,1.5,.7,1,1,1,1,1];numeric=[4,5,6];labels=['Valor','Recebido','Saldo'];
  entries=contracts.flatMap(c=>{const b=billOf(c.id);return (b?.invoices||[]).map(i=>{const paid=paidInvoice(i),open=openInvoice(i),state=open===0?'Paga':i.due<today()?'Vencida':paid>0?'Parcial':'A vencer',status=`${state}${c.status==='Cancelado'?' / contrato cancelado':''}`;return {filter:{...base(c),start:i.due,end:i.due,invoice:state},cells:[clientName(c),c.title,`${i.number}/${b!.invoices.length}`,date(i.due),money(i.amountCents),money(paid),money(open),status],csv:[clientName(c),c.title,`${i.number}/${b!.invoices.length}`,i.due,i.amountCents/100,paid/100,open/100,status],amounts:[i.amountCents,paid,open]}})});
 }
 if(kind==='commission'){
  headers=['Locutor','Campanha','Cliente','Taxa (%)','Prevista','Sobre recebimentos','Paga','Disponível'];weights=[1.2,1.5,1.2,.8,1,1,1,1];numeric=[3,4,5,6,7];labels=['Prevista','Sobre recebimentos','Paga','Disponível'];
  entries=contracts.filter(c=>c.speakerId).map(c=>{const r=commission(c,billOf(c.id)),available=c.stage===5&&['Ativo','Encerrado'].includes(c.status)?r.available:0;return {filter:base(c),cells:[speakerName(c.speakerId),c.title,clientName(c),`${c.commissionRate}%`,money(r.planned),money(r.released),money(r.paid),money(available)],csv:[speakerName(c.speakerId),c.title,clientName(c),c.commissionRate,r.planned/100,r.released/100,r.paid/100,available/100],amounts:[r.planned,r.released,r.paid,available]}});
 }
 if(finance&&(canFinance||demo)){
  headers=['Data','Descrição','Categoria','Método','Tipo','Valor'];weights=[1,2.7,1.5,1,1,1.2];numeric=[5];labels=['Receitas','Despesas','Saldo'];
  const transactions=[...contracts.flatMap(c=>(billOf(c.id)?.invoices||[]).flatMap(i=>i.payments.map(p=>({...p,title:`${clientName(c)} · ${c.title}`,category:'Recebimento',type:'Receita'})))),...contracts.flatMap(c=>(billOf(c.id)?.commissionPayments||[]).map(p=>({...p,title:`Comissão · ${speakerName(c.speakerId)}`,category:c.title,type:'Despesa'}))),...expenses.map(e=>({...e,method:'—',type:'Despesa'}))];
  entries=transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{const income=p.type==='Receita',signed=income?p.amountCents:-p.amountCents;return {filter:{search:`${p.title} ${p.category}`,start:p.date,end:p.date,movement:p.type,method:p.method},cells:[date(p.date),p.title,p.category,p.method,p.type,money(signed)],csv:[p.date,p.title,p.category,p.method,p.type,signed/100],amounts:[income?p.amountCents:0,income?0:p.amountCents,signed]}});
 }
 const selected=entries.filter(r=>matchesReportFilters(r.filter,filters));
 const totals=labels.map((label,i)=>`${label}: ${money(selected.reduce((sum,r)=>sum+r.amounts[i],0))}`);
 const periodLabel=kind==='billing'?'Vencimento':finance?'Data do lançamento':'Vigência dos contratos';
 const options=(values:string[])=>values.map(value=>({value,label:value}));
 const clientOptions=Array.from(new Map(contracts.map(c=>[c.clientId,{value:c.clientId,label:clientName(c)}])).values()).sort((a,b)=>a.label.localeCompare(b.label));
 const methodOptions=options([...new Set(entries.map(r=>r.filter.method).filter((v):v is string=>!!v))].sort());
 const context=[`${periodLabel}: ${filters.from?date(filters.from):'Sem início'} a ${filters.to?date(filters.to):'Sem fim'}`,filters.search&&`Busca: ${filters.search}`,!finance&&filters.client&&`Cliente: ${clientOptions.find(x=>x.value===filters.client)?.label}`,!finance&&filters.speaker&&`Locutor: ${filters.speaker==='none'?'Sem locutor':speakerName(filters.speaker)}`,!finance&&filters.sector&&`Setor: ${filters.sector}`,!finance&&filters.status&&`Contrato: ${filters.status}`,!finance&&filters.stage&&`Etapa: ${stages[Number(filters.stage)]}`,kind==='billing'&&filters.invoice&&`Parcela: ${filters.invoice}`,finance&&filters.movement&&`Tipo: ${filters.movement}`,finance&&filters.method&&`Método: ${filters.method}`].filter(Boolean).join(' | ');
 async function exportPdf(){
  if(busy||invalid||finance&&!canFinance&&!demo)return;setBusy(true);
  try{const data:ReportData={title:titles[kind],station:station.name,document:station.document,generatedAt:new Date().toISOString(),context:`${demo?'DEMONSTRAÇÃO - DADOS FICTÍCIOS':'Carteira autorizada do usuário'} | ${context}`,headers,rows:selected.map(r=>r.cells),weights,numeric,totals:[totals.join(' | '),...(kind==='commission'?['Disponível exige homologação e contrato ativo ou encerrado. Valores acumulados dos contratos na vigência selecionada.']:[])]};const {reportPdf}=await import('@/lib/report-pdf');const bytes=await reportPdf(data),url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'})),link=document.createElement('a');link.href=url;link.download=`radioadmin-${kind}-${today()}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast.success('Relatório PDF gerado');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível gerar o PDF.')}finally{setBusy(false)}
 }
 function exportCsv(){if(invalid||finance&&!canFinance&&!demo)return;const text='\uFEFF'+[headers,...selected.map(r=>r.csv)].map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"').join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`radioadmin-${kind}-${today()}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
 const Icon=icons[kind];
 return <section className="report-workspace"><div className="report-selection"><ReportSelect label="Relatório" value={kind} options={(Object.keys(titles) as Kind[]).filter(k=>k!=='finance'||canFinance||demo).map(value=>({value,label:titles[value]}))} allowAll={false} onChange={value=>{setKind(value as Kind);setFilters({...emptyReportFilters})}}/><button className="pro-outline" onClick={()=>setFilters({...emptyReportFilters})}><RotateCcw size={16}/>Limpar filtros</button></div>
  <div className="report-filter-grid"><label>Busca<input type="search" value={filters.search} onChange={e=>set('search',e.target.value)} placeholder={finance?'Descrição ou categoria':'Cliente, campanha ou locutor'}/></label><label>{periodLabel} · de<input type="date" value={filters.from} max={filters.to||undefined} onChange={e=>set('from',e.target.value)} aria-invalid={!!invalid}/></label><label>{periodLabel} · até<input type="date" value={filters.to} min={filters.from||undefined} onChange={e=>set('to',e.target.value)} aria-invalid={!!invalid}/></label>
  {!finance&&<><ReportSelect label="Anunciante" value={filters.client} options={clientOptions} onChange={v=>set('client',v)}/><ReportSelect label="Locutor" value={filters.speaker} options={[{value:'none',label:'Sem locutor'},...speakers.map(s=>({value:s.id,label:s.name}))]} onChange={v=>set('speaker',v)}/><ReportSelect label="Setor" value={filters.sector} options={options([...sectors])} onChange={v=>set('sector',v)}/><ReportSelect label="Situação do contrato" value={filters.status} options={options(['Rascunho','Ativo','Encerrado','Cancelado'])} onChange={v=>set('status',v)}/><ReportSelect label="Etapa de aprovação" value={filters.stage} options={stages.map((label,i)=>({value:String(i),label}))} onChange={v=>set('stage',v)}/></>}
  {kind==='billing'&&<ReportSelect label="Situação da parcela" value={filters.invoice} options={options(['A vencer','Vencida','Parcial','Paga'])} onChange={v=>set('invoice',v)}/>}{finance&&<><ReportSelect label="Tipo de movimento" value={filters.movement} options={options(['Receita','Despesa'])} onChange={v=>set('movement',v)}/><ReportSelect label="Forma de pagamento" value={filters.method} options={methodOptions} onChange={v=>set('method',v)}/></>}
  </div>{invalid&&<p className="pro-error" role="alert">{invalid}</p>}
  <div className="report-result-heading"><h2><Icon size={20}/>{titles[kind]}</h2><ReportActions busy={busy} disabled={!!invalid} onCsv={exportCsv} onPdf={exportPdf}/></div><p className="report-context">{context}</p><div className="report-result-summary" aria-live="polite"><strong>{selected.length} registro(s)</strong>{totals.map(total=><span key={total}>{total}</span>)}</div>
  <div className="report-preview"><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{selected.slice(0,100).map((row,i)=><tr key={i}>{row.cells.map((cell,j)=><td key={j} className={numeric.includes(j)?'report-number':undefined}>{cell}</td>)}</tr>)}</tbody></table></div>{!selected.length&&<p className="pro-empty">Nenhum registro encontrado para os filtros selecionados.</p>}{selected.length>100&&<p className="report-context">Prévia: 100 de {selected.length} registros. Exportação: todos os registros filtrados.</p>}
 </section>;
}
function ReportSelect({label,value,options,onChange,allowAll=true}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void;allowAll?:boolean}){return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{allowAll&&<option value="">Todos</option>}{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
