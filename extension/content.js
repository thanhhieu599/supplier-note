(() => {
  'use strict';
  if (document.getElementById('supplier-note-extension')) return;
  const { clean, key, validate, rank } = SupplierNote;
  const storageKey = `supplier-note:v1:${location.hostname}`;
  const host = document.createElement('div');
  host.id = 'supplier-note-extension';
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}
    .launcher{position:fixed;right:20px;bottom:76px;z-index:2147483646;border:0;border-radius:24px;background:#0869cf;color:white;padding:12px 18px;box-shadow:0 3px 16px #0003;font:600 14px system-ui}
    .panel{position:fixed;right:20px;top:70px;bottom:24px;width:370px;max-width:calc(100vw - 24px);z-index:2147483647;background:white;border:1px solid #dce3eb;border-radius:14px;box-shadow:0 8px 40px #17324d33;color:#203247;font:14px/1.5 system-ui;display:flex;flex-direction:column;overflow:hidden}
    [hidden]{display:none!important}header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #edf0f4}h2{font-size:16px;margin:0}h3{font-size:14px;margin:0 0 10px}.body{padding:16px;overflow:auto;flex:1}p{margin:0 0 12px}.muted,small{color:#63758a;font-size:12px}button{border:1px solid #d7e0e9;border-radius:7px;padding:8px 11px;background:white;color:#203247}.primary{background:#0869cf;color:white;border-color:#0869cf}.icon{padding:3px 9px;font-size:20px}input,select{width:100%;padding:9px;border:1px solid #ccd7e3;border-radius:7px;background:white;color:#203247}label{display:block;font-size:12px;margin-bottom:10px}label input{margin-top:4px}.row{display:flex;gap:8px;align-items:center}.row>*{min-width:0}.grow{flex:1}.card{padding:12px 0;border-bottom:1px solid #edf0f4}.card strong{display:block;overflow-wrap:anywhere}.card small{display:block;overflow-wrap:anywhere}.danger{color:#b12d35}.section{margin-top:18px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}footer{padding:10px 16px;border-top:1px solid #edf0f4;font-size:12px;color:#63758a}#status{padding:0 16px 12px;color:#21643c;font-size:13px;overflow-wrap:anywhere}.empty{padding:18px 8px;text-align:center;color:#63758a}.badge{display:inline-block;background:#eaf3ff;color:#0869cf;padding:2px 7px;border-radius:4px;font-size:12px;margin-top:4px}details{margin-top:18px}summary{cursor:pointer;color:#63758a}#backup{margin-top:10px}.hint{background:#f3f7fc;padding:10px;border-radius:7px;font-size:12px}.copy{white-space:nowrap}
    @media(max-width:500px){.panel{right:12px;top:12px;bottom:12px}.launcher{right:12px}}
  </style>
  <button class="launcher" aria-label="Nhà cung cấp" aria-expanded="false">Nhà cung cấp</button>
  <section class="panel" hidden aria-label="Supplier Note">
    <header><h2>Nhà cung cấp</h2><button class="icon" aria-label="Đóng">×</button></header>
    <div class="body"><div id="context"></div><div id="main"></div>
      <details><summary>Dữ liệu & sao lưu</summary><div id="backup"><p class="muted">Lưu trên trình duyệt này, riêng cho từng cửa hàng.</p><div class="toolbar"><button id="export">Xuất sao lưu</button><button id="import">Khôi phục</button></div><input id="file" type="file" accept="application/json,.json" hidden></div></details>
    </div><div id="status" role="status" aria-live="polite"></div><footer>Supplier Note · Dữ liệu lưu riêng, không ghi vào Sapo</footer>
  </section>`;
  const $ = s => shadow.querySelector(s);
  let data = { version: 1, suppliers: [] }, ready = false, busy = false, contextId = '', lastPath = '', selection = [], manual = [];
  const panel = $('.panel'), launcher = $('.launcher');
  function message(text, error = false) { $('#status').textContent = text; $('#status').style.color = error ? '#b12d35' : '#21643c'; }
  function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
  function button(text, fn, cls) { const b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function field(label, placeholder, value = '') { const l = el('label', label); const i = el('input'); i.placeholder = placeholder; i.value = value; i.maxLength = label.includes('SKU') ? 100 : 250; l.append(i); return [l, i]; }
  async function save(next) {
    if (!ready || busy) return false;
    busy = true;
    try {
      const baseline = JSON.stringify(data);
      return await navigator.locks.request(storageKey, async () => {
        const current = await chrome.storage.local.get(storageKey);
        const latest = validate(current[storageKey] || { version: 1, suppliers: [] });
        if (JSON.stringify(latest) !== baseline) {
          data = latest;
          render();
          message('Dữ liệu vừa thay đổi ở tab khác. Vui lòng thực hiện lại.', true);
          return false;
        }
        const valid = validate(next);
        await chrome.storage.local.set({ [storageKey]: valid });
        data = valid;
        return true;
      });
    }
    catch { message('Không lưu được. Hãy xuất sao lưu và kiểm tra dung lượng trình duyệt.', true); return false; }
    finally { busy = false; }
  }
  function toggle(open) { panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open)); if (open) { updateContext(true); $('.icon').focus(); } else launcher.focus(); }
  launcher.onclick = () => toggle(panel.hidden);
  $('.icon').onclick = () => toggle(false);
  shadow.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  function supplierName() {
    const h = document.querySelector('h1, h2, [class*="SupplierName"], [class*="supplier-name"]');
    return clean(h?.textContent || '');
  }
  // Read product rows only. Never infer supplier identity from arbitrary page text.
  function readProducts() {
    const rows = document.querySelectorAll('table tbody tr, [role="rowgroup"] [role="row"]');
    const found = [];
    for (const row of rows) {
      const input = row.querySelector('[data-sku], [data-product-sku]');
      let sku = row.getAttribute('data-sku') || input?.getAttribute('data-sku') || input?.getAttribute('data-product-sku');
      const skuNode = row.querySelector('[class*="sku" i], [data-field="sku"]');
      if (!sku) sku = skuNode?.textContent;
      // Sapo layouts often put SKU on a second line in a product link.
      const link = row.querySelector('a[href*="/products/"], a[href*="/variants/"]');
      if (!sku && link) {
        const lines = link.innerText.split('\n').map(x => x.trim()).filter(Boolean);
        if (lines.length === 2) sku = lines[1];
      }
      if (clean(sku, 100)) found.push({ sku: clean(sku, 100), name: clean(link?.textContent || sku) });
    }
    return [...new Map(found.map(p => [key(p.sku), p])).values()];
  }
  function updateContext(force = false) {
    const match = location.pathname.match(/^\/admin\/suppliers\/(\d+)(?:\/|$)/);
    const id = match?.[1] || '';
    const products = id ? [] : readProducts();
    const changed = force || id !== contextId || lastPath !== location.pathname || JSON.stringify(products) !== JSON.stringify(selection);
    if (lastPath !== location.pathname) manual = [];
    contextId = id; lastPath = location.pathname; selection = products;
    const suggestions = ready && !id ? rank(data, selection).length : 0;
    launcher.textContent = suggestions ? `Nhà cung cấp · ${suggestions} gợi ý` : 'Nhà cung cấp';
    if (changed && !panel.hidden && ready) render();
  }
  function render() {
    const context = $('#context'), main = $('#main'); context.replaceChildren(); main.replaceChildren();
    if (contextId) renderSupplier(context, main); else renderSuggestions(context, main);
  }
  function renderSupplier(context, main) {
    const s = data.suppliers.find(s => s.id === contextId);
    context.append(el('p', 'Sản phẩm cung cấp', 'muted'));
    const [nl, ni] = field('Tên nhà cung cấp', 'Nhập tên để hiển thị gợi ý', s?.name || supplierName());
    context.append(nl);
    const form = el('form');
    const [sl, si] = field('SKU', 'Ví dụ: Q-100P'); const [pl, pi] = field('Tên sản phẩm', 'Ví dụ: Dao rọc giấy mini');
    si.required = true; pi.required = true;
    const add = el('button', '+ Liên kết sản phẩm', 'primary'); add.type = 'submit';
    form.append(sl, pl, add); main.append(form);
    form.onsubmit = async e => {
      e.preventDefault();
      if (!clean(ni.value) || !clean(si.value) || !clean(pi.value)) return message('Nhập tên nhà cung cấp, SKU và tên sản phẩm.', true);
      const id = contextId, name = clean(ni.value), sku = clean(si.value, 100), productName = clean(pi.value);
      const existing = data.suppliers.find(x => x.id === id);
      if (existing?.products.some(p => key(p.sku) === key(sku))) return message('SKU đã được liên kết.', true);
      const next = structuredClone(data);
      let supplier = next.suppliers.find(x => x.id === id);
      if (!supplier) { supplier = { id, name, products: [] }; next.suppliers.push(supplier); }
      supplier.name = name; supplier.products.push({ sku, name: productName });
      add.disabled = true;
      if (await save(next)) { render(); message('Đã liên kết sản phẩm.'); }
      add.disabled = false;
    };
    ni.addEventListener('change', async () => {
      if (!s || !clean(ni.value)) return;
      const next = structuredClone(data); next.suppliers.find(x => x.id === s.id).name = clean(ni.value);
      if (await save(next)) message('Đã cập nhật tên.');
    });
    const section = el('div', undefined, 'section'); main.append(section);
    const search = el('input'); search.placeholder = 'Lọc theo tên hoặc SKU'; search.setAttribute('aria-label', 'Lọc sản phẩm'); section.append(search);
    const list = el('div'); section.append(list);
    const show = () => {
      list.replaceChildren();
      const items = (s?.products || []).filter(p => key(`${p.name} ${p.sku}`).includes(key(search.value)));
      if (!items.length) list.append(el('p', s?.products.length ? 'Không có kết quả.' : 'Chưa có sản phẩm liên kết.', 'empty'));
      for (const p of items) {
        const row = el('div', undefined, 'card row'), info = el('div', undefined, 'grow'); info.append(el('strong', p.name), el('small', p.sku));
        row.append(info, button('Bỏ', async () => {
          if (!confirm(`Bỏ liên kết SKU ${p.sku}?`)) return;
          const next = structuredClone(data); const target = next.suppliers.find(x => x.id === s.id); target.products = target.products.filter(x => key(x.sku) !== key(p.sku));
          if (await save(next)) { render(); message('Đã bỏ liên kết.'); }
        }, 'danger')); list.append(row);
      }
    }; search.oninput = show; show();
  }
  function renderSuggestions(context, main) {
    context.append(el('p', 'Gợi ý nhà cung cấp', 'muted'));
    const all = [...new Map([...selection, ...manual].map(p => [key(p.sku), p])).values()];
    context.append(el('p', all.length ? `${all.length} SKU đang tra cứu` : 'Thêm sản phẩm trên phiếu nhập để tra cứu.'));
    const details = el('details'); details.open = !selection.length;
    details.append(el('summary', 'Nhập SKU để tra cứu'));
    const form = el('form', undefined, 'section');
    const [label, input] = field('SKU sản phẩm', 'Mỗi SKU một dòng hoặc ngăn bằng dấu ;');
    const submit = el('button', 'Tra cứu', 'primary'); submit.type = 'submit'; form.append(label, submit);
    form.onsubmit = e => { e.preventDefault(); manual = input.value.split(/[;\n]/).map(sku => ({ sku: clean(sku, 100) })).filter(p => p.sku); render(); };
    details.append(form); context.append(details);
    if (selection.length) main.append(button('Làm mới từ phiếu', () => updateContext(true)));
    if (all.length) {
      main.append(el('p', all.map(p => p.sku).join(' · '), 'hint section'));
      const results = rank(data, all);
      if (!results.length) main.append(el('p', 'Chưa có nhà cung cấp phù hợp. Mở trang nhà cung cấp để liên kết sản phẩm.', 'empty'));
      for (const s of results) {
        const card = el('div', undefined, 'card');
        card.append(el('strong', s.name), el('span', `${s.count}/${s.total} sản phẩm`, 'badge'));
        const actions = el('div', undefined, 'toolbar section');
        actions.append(button('Sao chép tên', async () => { try { await navigator.clipboard.writeText(s.name); message('Đã sao chép. Dán vào ô tìm nhà cung cấp của Sapo.'); } catch { message('Không sao chép được. Bạn có thể chọn và sao chép tên ở trên.', true); } }));
        const a = el('a', 'Xem'); a.href = `/admin/suppliers/${s.id}`; a.target = '_blank'; a.rel = 'noopener noreferrer'; actions.append(a); card.append(actions); main.append(card);
      }
    }
    main.append(el('p', 'Nếu Sapo không hiển thị SKU theo định dạng nhận diện được, hãy nhập SKU ở trên. Chọn nhà cung cấp trong ô của Sapo sau khi tra cứu.', 'muted section'));
  }
  $('#export').onclick = () => {
    if (!ready) return;
    const payload = { ...data, shop: location.hostname, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `supplier-note-${location.hostname}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Đã xuất sao lưu.');
  };
  $('#import').onclick = () => { if (ready) $('#file').click(); };
  $('#file').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Tệp vượt quá 5 MB.');
      const raw = JSON.parse(await file.text());
      if (raw.shop !== location.hostname) throw new Error('Tệp không thuộc cửa hàng này.');
      const next = validate(raw);
      if (!confirm(`Thay thế dữ liệu hiện tại bằng ${next.suppliers.length} nhà cung cấp trong tệp? Hãy xuất sao lưu trước nếu cần.`)) return;
      if (await save(next)) { render(); message('Đã khôi phục dữ liệu.'); }
    } catch (err) { message(err instanceof SyntaxError ? 'Tệp JSON không hợp lệ.' : err.message, true); }
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[storageKey] || busy) return;
    try { data = validate(changes[storageKey].newValue || { version: 1, suppliers: [] }); if (!panel.hidden) render(); } catch { message('Dữ liệu không hợp lệ. Hãy khôi phục bản sao lưu.', true); }
  });
  chrome.storage.local.get(storageKey).then(result => {
    data = validate(result[storageKey] || data); ready = true; updateContext(true);
  }).catch(() => { message('Không đọc được dữ liệu. Hãy tải lại trang; dữ liệu chưa bị ghi đè.', true); });
  // Polling avoids reacting to every mutation in Sapo and in our own panel.
  setInterval(() => updateContext(), 1200);
})();
