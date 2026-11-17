/* Shared validation and ranking; no network calls. */
(function (root) {
  'use strict';
  const clean = (s, max = 250) => typeof s === 'string' ? s.trim().slice(0, max) : '';
  const key = s => clean(s).normalize('NFKC').toLocaleLowerCase('vi');
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.suppliers) || value.suppliers.length > 10000) throw new Error('Tệp sao lưu không hợp lệ.');
    const seen = new Set();
    const suppliers = value.suppliers.map(s => {
      if (!s || typeof s.id !== 'string' || !/^\d+$/.test(s.id) || !clean(s.name) || !Array.isArray(s.products) || s.products.length > 10000 || seen.has(s.id)) throw new Error('Dữ liệu nhà cung cấp không hợp lệ.');
      seen.add(s.id);
      const skus = new Set();
      return { id: s.id, name: clean(s.name), products: s.products.map(p => {
        if (!p || !clean(p.sku, 100) || !clean(p.name) || skus.has(key(p.sku))) throw new Error('Sản phẩm thiếu tên, SKU hoặc trùng SKU.');
        skus.add(key(p.sku));
        return { sku: clean(p.sku, 100), name: clean(p.name) };
      }) };
    });
    return { version: 1, suppliers };
  }
  function rank(data, products) {
    const selected = [...new Set(products.map(p => key(p.sku)).filter(Boolean))];
    if (!selected.length) return [];
    return data.suppliers.map(s => {
      const available = new Set(s.products.map(p => key(p.sku)));
      const matched = selected.filter(sku => available.has(sku));
      return { ...s, count: matched.length, total: selected.length };
    }).filter(s => s.count).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }
  root.SupplierNote = { clean, key, validate, rank };
})(globalThis);
