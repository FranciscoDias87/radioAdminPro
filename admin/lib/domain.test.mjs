import test from "node:test";
import assert from "node:assert/strict";
import {makeBilling,installmentDate,commission,recordReceipt,recordCommission,reversePayment,validateContractEdit,contractSchema} from "./domain.ts";
const contract={id:"c1",amount:100,speakerId:"s1",commissionRate:30,status:'Ativo',stage:5};
const payment=(amountCents)=>({id:"p",amountCents,date:"2026-10-06",method:"Pix",note:"",recordedAt:"2026-10-06T12:00:00Z"});
test("Parcelas preservam exatamente os centavos do contrato",()=>{const b=makeBilling(contract,3,"2026-01-31");assert.deepEqual(b.invoices.map(i=>i.amountCents),[3334,3333,3333]);assert.deepEqual(b.invoices.map(i=>i.due),["2026-01-31","2026-02-28","2026-03-31"]);assert.equal(installmentDate("2028-01-31",1),"2028-02-29")});
test("Pagamento parcial libera comissão proporcional sem exceder o total",()=>{let b=makeBilling(contract,1,"2026-10-06");b=recordReceipt(b,"c1:1",payment(2500));assert.deepEqual(commission(contract,b),{planned:3000,released:750,paid:0,available:750,received:2500});assert.throws(()=>recordReceipt(b,"c1:1",payment(7501)));assert.throws(()=>recordCommission(contract,b,payment(751)));b=recordCommission(contract,b,payment(750));assert.equal(commission(contract,b).available,0);b=recordReceipt(b,"c1:1",payment(7500));assert.equal(commission(contract,b).released,3000);assert.equal(commission(contract,b).available,2250)});
test("Sem vínculo com locutor não há comissão",()=>{assert.equal(commission({...contract,speakerId:""}).planned,0)});
test('Repasse exige homologação e bloqueia contratos cancelados',()=>{
 const b=recordReceipt(makeBilling(contract,1,'2026-10-06'),'c1:1',payment(10000));
 assert.throws(()=>recordCommission({...contract,status:'Rascunho',stage:0},b,payment(3000)));
 assert.throws(()=>recordCommission({...contract,status:'Cancelado'},b,payment(3000)));
 assert.doesNotThrow(()=>recordCommission({...contract,status:'Encerrado'},b,payment(3000)));
});
test("Datas e quantidade de parcelas inválidas são rejeitadas",()=>{assert.throws(()=>makeBilling(contract,0,"2026-10-06"));assert.throws(()=>makeBilling(contract,1,"2026-02-30"))});
test("Estorno preserva o original e rejeita duplicação",()=>{
 let b=recordReceipt(makeBilling(contract,1,"2026-10-06"),"c1:1",payment(2500));
 b=reversePayment(contract,b,"receipt","p",{...payment(0),id:"r1",note:"Lançamento incorreto"});
 assert.equal(b.invoices[0].payments.length,2);assert.equal(b.invoices[0].payments[1].reversalOf,"p");
 assert.equal(commission(contract,b).received,0);assert.equal(commission(contract,b).available,0);
 assert.throws(()=>reversePayment(contract,b,"receipt","p",{...payment(0),note:"Duplicado"}));
});
test("Recebimento com comissão repassada exige estornar o repasse primeiro",()=>{
 let b=recordReceipt(makeBilling(contract,1,"2026-10-06"),"c1:1",{...payment(2500),id:"receipt"});
 b=recordCommission(contract,b,{...payment(750),id:"commission"});
 const r={...payment(0),id:"r1",note:"Correção financeira"};
 assert.throws(()=>reversePayment(contract,b,"receipt","receipt",r));
 b=reversePayment(contract,b,"commission","commission",r);
 b=reversePayment(contract,b,"receipt","receipt",{...r,id:"r2"});
 assert.equal(commission(contract,b).paid,0);assert.equal(commission(contract,b).received,0);
});
test("Ativação por edição e cancelamento sem motivo são bloqueados",()=>{
 const c={...contract,status:"Rascunho",stage:0,cancelReason:""};
 assert.throws(()=>validateContractEdit(c,{...c,status:"Ativo"}));
 assert.throws(()=>validateContractEdit(c,{...c,status:"Cancelado"}));
 assert.doesNotThrow(()=>validateContractEdit(c,{...c,status:"Cancelado",cancelReason:"Pedido do cliente"}));
 assert.throws(()=>validateContractEdit({...c,stage:2},{...c,stage:2,amount:200}));
});
