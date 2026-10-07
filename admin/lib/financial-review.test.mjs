import test from 'node:test';
import assert from 'node:assert/strict';
import {financialReview} from './financial-review.ts';
const base={kind:'receipt',contractId:'c',campaign:'Teste',client:'Cliente',speaker:'Locutor',expected:'{"id":"billing:c"}',amountCents:12345,date:'2026-10-07',method:'Pix',note:'',invoiceId:'i',invoiceNumber:2};
test('Conferencia financeira fixa valor, parcela e versao revisada',()=>{
 const review=financialReview(base);
 assert.equal(review.payload.amountCents,12345);
 assert.equal(review.payload.expected,base.expected);
 assert.equal(review.payload.invoiceId,'i');
 assert.ok(review.lines.find(([label,value])=>label==='Valor'&&value.includes('123,45')));
 assert.ok(review.lines.find(([label,value])=>label==='Parcela'&&value==='2'));
 assert.equal(review.label,'Confirmar recebimento');
 assert.throws(()=>financialReview({...base,amountCents:0}));
 assert.throws(()=>financialReview({...base,amountCents:1.5}));
 assert.throws(()=>financialReview({...base,expected:''}));
 assert.throws(()=>financialReview({...base,invoiceId:undefined}));
});
test('Repasse identifica locutor e estorno preserva referencia original',()=>{
 const review=financialReview({...base,kind:'commission'});
 assert.equal(review.label,'Confirmar repasse');
 assert.equal(review.payload.invoiceId,undefined);
 assert.ok(review.lines.find(([label,value])=>label==='Locutor'&&value==='Locutor'));
 for(const kind of ['reverseReceipt','reverseCommission']){
  const reverse=financialReview({...base,kind,paymentId:'p',note:'Duplicidade corrigida'});
  assert.equal(reverse.payload.paymentId,'p');
  assert.equal(reverse.payload.amountCents,undefined);
  assert.equal(reverse.label,'Confirmar estorno');
  assert.throws(()=>financialReview({...base,kind,paymentId:'p',note:'abc'}));
 }
});
