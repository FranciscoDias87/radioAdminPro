import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyReportFilters,matchesReportFilters,reportRangeError} from './report-filters.ts';
const row={search:'João · Promoção de verão',client:'c1',speaker:'s1',sector:'Comércio',status:'Ativo',stage:0,start:'2026-09-01',end:'2026-11-30'};
test('Filtros combinados e busca sem acentos preservam etapa zero',()=>{
 assert.ok(matchesReportFilters(row,{...emptyReportFilters,search:' JOAO ',client:'c1',speaker:'s1',status:'Ativo',stage:'0'}));
 assert.equal(matchesReportFilters(row,{...emptyReportFilters,stage:'1'}),false);
 assert.equal(matchesReportFilters(row,{...emptyReportFilters,client:'c2'}),false);
});
test('Vigência usa sobreposição inclusiva e aceita intervalos abertos',()=>{
 assert.ok(matchesReportFilters(row,{...emptyReportFilters,from:'2026-10-01',to:'2026-10-31'}));
 assert.ok(matchesReportFilters(row,{...emptyReportFilters,from:'2026-11-30'}));
 assert.equal(matchesReportFilters(row,{...emptyReportFilters,from:'2026-12-01'}),false);
 assert.equal(matchesReportFilters(row,{...emptyReportFilters,to:'2026-08-31'}),false);
});
test('Vencimento e lançamentos usam a data exata e filtros específicos',()=>{
 const dated={search:'Pix Cliente',start:'2026-10-10',invoice:'Paga',movement:'Receita',method:'Pix'};
 assert.ok(matchesReportFilters(dated,{...emptyReportFilters,from:'2026-10-10',to:'2026-10-10',invoice:'Paga',movement:'Receita',method:'Pix'}));
 assert.equal(matchesReportFilters(dated,{...emptyReportFilters,to:'2026-10-09'}),false);
 assert.equal(matchesReportFilters(dated,{...emptyReportFilters,movement:'Despesa'}),false);
});
test('Intervalo invertido bloqueia resultados e limpar restaura a seleção',()=>{
 const invalid={...emptyReportFilters,from:'2026-11-01',to:'2026-10-01'};
 assert.ok(reportRangeError(invalid));assert.equal(matchesReportFilters(row,invalid),false);
 assert.ok(matchesReportFilters(row,emptyReportFilters));
});
