"use client";
import {Download,FileText} from 'lucide-react';
export function ReportActions({onCsv,onPdf,busy}:{onCsv:()=>void;onPdf:()=>void;busy:boolean}){
 return <div className="row-actions"><button className="pro-outline" onClick={onCsv}><Download size={17}/>CSV</button><button className="pro-outline" onClick={onPdf} disabled={busy}><FileText size={17}/>{busy?'Gerando PDF...':'PDF'}</button></div>;
}
