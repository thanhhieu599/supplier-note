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
