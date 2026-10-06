import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {mkdir,writeFile} from 'node:fs/promises';
import {reportPdf} from './report-pdf.ts';
const base={title:'Contratos comerciais',station:'Rádio de teste',document:'Cadastro fictício',context:'DEMONSTRAÇÃO - DADOS FICTÍCIOS',generatedAt:'2026-10-06T18:00:00Z',headers:['Anunciante','Campanha','Setor','Locutor','Valor','Taxa (%)','Prevista','Etapa / situação','Início','Fim'],rows:[],totals:['Valor dos registros: R$ 0,00'],weights:[1.4,1.5,.8,1.2,1,.7,1,1.3,.8,.8],numeric:[4,5,6]};
test('PDF vazio e válido preserva título e página A4 horizontal',async()=>{const pdf=await PDFDocument.load(await reportPdf(base));assert.equal(pdf.getPageCount(),1);assert.equal(pdf.getTitle(),base.title);assert.ok(pdf.getPage(0).getWidth()>pdf.getPage(0).getHeight());});
test('PDF rejeita colunas inconsistentes',async()=>{await assert.rejects(()=>reportPdf({...base,headers:[]}));await assert.rejects(()=>reportPdf({...base,rows:[['incompleta']]}));});
test('PDF pagina tabelas extensas e quebra nomes longos sem perder registros',async()=>{
 const rows=Array.from({length:75},(_,i)=>[`Anunciante fictício ${i+1}`,i===2?'Campanha '+('NomeSemEspaços'.repeat(25)):'Campanha de divulgação institucional','Varejo','Locutor fictício','R$ 10.000,00','30%','R$ 3.000,00','Assinatura do cliente / Rascunho','01/10/2026','31/10/2026']);
 const bytes=await reportPdf({...base,rows,totals:['75 registros fictícios | Valor: R$ 750.000,00']});const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);assert.ok(pdf.getPageCount()<20);
 await mkdir('work/qa',{recursive:true});await writeFile('work/qa/report-test.pdf',bytes);
});
