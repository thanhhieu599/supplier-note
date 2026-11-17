import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/core.js';
const { validate, rank } = globalThis.SupplierNote;
const data = { version: 1, suppliers: [
 { id: '1', name: 'A', products: [{ sku: 'Q-100P', name: 'Dao' }] },
 { id: '2', name: 'B', products: [{ sku: 'Q-100P', name: 'Dao' }, { sku: 'B2', name: 'Bút' }] }
] };
test('ranks coverage, normalizes and deduplicates selected SKUs', () => {
 assert.deepEqual(rank(data, [{sku:' q-100p '}, {sku:'B2'}, {sku:'Q-100P'}]).map(s => [s.id,s.count,s.total]), [['2',2,2],['1',1,2]]);
});
test('unknown and empty selections produce no false matches', () => {
 assert.deepEqual(rank(data, []), []); assert.deepEqual(rank(data,[{sku:'NO'}]),[]);
});
test('backup roundtrip and sanitizing', () => { assert.deepEqual(validate(JSON.parse(JSON.stringify(data))), data); });
test('rejects corrupt backups and duplicate IDs/SKUs', () => {
 for (const x of [null, {}, {version:2,suppliers:[]}, {version:1,suppliers:[...data.suppliers,data.suppliers[0]]}, {version:1,suppliers:[{id:'1',name:'A',products:[{sku:'a',name:'A'},{sku:' A ',name:'B'}]}]}, {version:1,suppliers:[{id:'javascript:alert(1)',name:'A',products:[]}]}]) assert.throws(()=>validate(x));
});
test('rejects SKUs that collide after the stored 100-character limit',()=>{
 const prefix='x'.repeat(100);
 assert.throws(()=>validate({version:1,suppliers:[{id:'1',name:'A',products:[{sku:prefix+'a',name:'A'},{sku:prefix+'b',name:'B'}]}]}));
});
test('normalization respects Unicode equivalent SKUs',()=>{
 const d={version:1,suppliers:[{id:'1',name:'A',products:[{sku:'ＡＢＣ',name:'A'}]}]};
 assert.equal(rank(d,[{sku:'abc'}])[0].count,1);
});
test('seeded coverage checks across 200 generated catalogs',()=>{
 let seed=413;const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 for(let run=0;run<200;run++){
  const suppliers=Array.from({length:20},(_,i)=>({id:String(i+1),name:'NCC '+i,products:Array.from({length:20},(_,j)=>j).filter(()=>next()%3===0).map(j=>({sku:'SKU-'+j,name:'P'+j}))}));
  const selected=Array.from({length:8},()=>({sku:'SKU-'+next()%25}));
  const result=rank({version:1,suppliers},selected),wanted=new Set(selected.map(p=>p.sku));
  for(const s of result){assert.equal(s.total,wanted.size);assert.equal(s.count,s.products.filter(p=>wanted.has(p.sku)).length);}
  for(let i=1;i<result.length;i++)assert.ok(result[i-1].count>=result[i].count);
 }
});
