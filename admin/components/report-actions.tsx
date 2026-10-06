"use client";
import {Download,FileText} from 'lucide-react';
export function ReportActions({onCsv,onPdf,busy,disabled=false}:{onCsv:()=>void;onPdf:()=>void;busy:boolean;disabled?:boolean}){
 return <div className="row-actions"><button className="pro-outline" onClick={onCsv} disabled={disabled||busy}><Download size={17}/>CSV</button><button className="pro-outline" onClick={onPdf} disabled={disabled||busy}><FileText size={17}/>{busy?'Gerando PDF...':'PDF'}</button></div>;
}
