import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAdvertisers,exactAdvertiser} from './advertiser-search.ts';
const clients=[{id:'pf',name:'José Silva',document:'529.982.247-25'},{id:'pj',name:'Empresa Água Branca',document:'11.222.333/0001-81'},{id:'alpha',name:'Comércio Novo',document:'12.ABC.345/01DE-35'}];
test('Busca por documento com ou sem máscara, parcial e nome sem acento',()=>{
 for(const query of ['52998224725','529.982.247-25','529.982'])assert.deepEqual(searchAdvertisers(clients,query).map(c=>c.id),['pf']);
 assert.equal(exactAdvertiser(clients,'11222333000181').id,'pj');assert.equal(exactAdvertiser(clients,'12.abc.345/01de-35').id,'alpha');assert.deepEqual(searchAdvertisers(clients,'agua').map(c=>c.id),['pj']);assert.equal(searchAdvertisers(clients,'Jose')[0].id,'pf');assert.equal(searchAdvertisers(clients,'99999999999').length,0);assert.equal(searchAdvertisers(clients,'').length,3);
});
test('Seleção automática exige documento completo e resultado único na carteira',()=>{
 assert.equal(exactAdvertiser(clients,'529982'),undefined);assert.equal(exactAdvertiser([],clients[0].document),undefined);assert.equal(exactAdvertiser([...clients,{...clients[0],id:'duplicate'}],clients[0].document),undefined);assert.equal(exactAdvertiser(clients,'52998224725').id,'pf');
});
