import {test,expect,initial,KEY,SHOP} from './fixture.js';

test('multi-SKU search accepts more than 100 characters and keeps editable query',async({app})=>{
 app.store[KEY]=initial(); const page=await app.open('/admin/purchase_orders/create');
 const query=Array.from({length:30},(_,i)=>`SKU-${i}`).concat('Q-100P').join(';');
 await page.getByLabel('SKU sản phẩm',{exact:true}).fill(query);
 await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
 await expect(page.getByText('1/31 sản phẩm',{exact:true})).toBeVisible();
 await expect(page.getByLabel('SKU sản phẩm',{exact:true})).toHaveValue(query);
});
test('SKU removal on Sapo clears old auto suggestions',async({app})=>{
 app.store[KEY]=initial();app.html='<table><tbody><tr data-sku="Q-100P"><td>Dao</td></tr></tbody></table>';
 const page=await app.open('/admin/purchase_orders/create');
 await expect(page.getByText('1/1 sản phẩm',{exact:true})).toBeVisible();
 await page.evaluate(()=>document.querySelector('tbody').replaceChildren());
 await expect(page.getByText('Công ty A',{exact:true})).toHaveCount(0);
});
test('hidden product rows are not selected items',async({app})=>{
 app.store[KEY]=initial();app.html='<table><tbody><tr hidden data-sku="Q-100P"><td>Hidden</td></tr></tbody></table>';
 const page=await app.open('/admin/purchase_orders/create');
 await expect(page.getByText('Công ty A',{exact:true})).toHaveCount(0);
});
test('non-purchase admin pages never scrape arbitrary tables for suggestions',async({app})=>{
 app.store[KEY]=initial();app.html='<table><tbody><tr data-sku="Q-100P"><td>Catalog item</td></tr></tbody></table>';
 const page=await app.open('/admin/products');
 await expect(page.getByText('Công ty A',{exact:true})).toHaveCount(0);
});
test('row data-product-sku is recognized',async({app})=>{
 app.store[KEY]=initial();app.html='<table><tbody><tr data-product-sku="Q-100P"><td>Dao</td></tr></tbody></table>';
 const page=await app.open('/admin/purchase_orders/create');
 await expect(page.getByText('1/1 sản phẩm',{exact:true})).toBeVisible();
});
test('two tabs adding concurrently retain both products',async({app})=>{
 app.store[KEY]=initial(); const a=await app.open(),b=await app.open();app.delay=80;
 await Promise.all([app.add(a,'A-NEW'),app.add(b,'B-NEW')]);
 await expect.poll(()=>app.store[KEY].suppliers[0].products.map(p=>p.sku).sort()).toEqual(['A-NEW','B-NEW','Q-100P']);
 await expect(a.getByText('B-NEW',{exact:true})).toBeVisible();
 await expect(b.getByText('A-NEW',{exact:true})).toBeVisible();
});
test('rename followed immediately by add does not silently drop product',async({app})=>{
 app.store[KEY]=initial(); const page=await app.open();app.delay=100;
 await page.getByLabel('Tên nhà cung cấp',{exact:true}).fill('Tên mới');
 await app.add(page,'ADDED');
 await expect.poll(()=>app.store[KEY].suppliers[0].products.some(p=>p.sku==='ADDED')).toBe(true);
 await expect.poll(()=>app.store[KEY].suppliers[0].name).toBe('Tên mới');
});
test('incoming tab updates preserve unfinished form',async({app})=>{
 app.store[KEY]=initial();const a=await app.open(),b=await app.open();
 await a.getByLabel('SKU',{exact:true}).fill('DRAFT');await a.getByLabel('Tên sản phẩm',{exact:true}).fill('Chưa lưu');
 await app.add(b,'OTHER');await expect.poll(()=>app.store[KEY].suppliers[0].products.length).toBe(2);
 await expect(a.getByLabel('SKU',{exact:true})).toHaveValue('DRAFT');
 await expect(a.getByLabel('Tên sản phẩm',{exact:true})).toHaveValue('Chưa lưu');
});
test('failed writes preserve data and form, then retry succeeds',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();app.failWrites=true;await app.add(page,'RETRY');
 await expect(page.getByRole('status')).toContainText('Không lưu được');
 expect(app.store[KEY]).toEqual(initial());await expect(page.getByLabel('SKU',{exact:true})).toHaveValue('RETRY');
 app.failWrites=false;await page.getByRole('button',{name:'+ Liên kết sản phẩm'}).click();
 await expect.poll(()=>app.store[KEY].suppliers[0].products.length).toBe(2);
});
test('malformed, wrong-shop, duplicate and cancelled imports do not overwrite',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();
 for(const value of ['{',null,{shop:'other',...initial()},{shop:SHOP,version:1,suppliers:[initial().suppliers[0],initial().suppliers[0]]}]){
  await app.import(page,value);await expect(page.getByRole('status')).not.toBeEmpty();expect(app.store[KEY]).toEqual(initial());
 }
 app.confirm=false;await app.import(page,{shop:SHOP,version:1,suppliers:[]});expect(app.store[KEY]).toEqual(initial());
});
test('corrupt stored data can be recovered through a valid backup',async({app})=>{
 app.store[KEY]={version:99,suppliers:[]};
 // open without waiting for a valid data view
 app.failReads=true;const page=await app.open();app.failReads=false;
 await app.import(page,{shop:SHOP,...initial()});
 await expect.poll(()=>app.store[KEY]).toEqual(initial());
 await expect(page.getByText('Dao rọc giấy',{exact:true})).toBeVisible();
});
test('delete confirmation cancellation and shop isolation',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();app.confirm=false;
 await page.getByRole('button',{name:'Bỏ',exact:true}).click();expect(app.store[KEY]).toEqual(initial());
 const other=await app.open('/admin/suppliers/123/histories','other.mysapogo.com');
 await expect(other.getByText('Dao rọc giấy',{exact:true})).toHaveCount(0);
 await app.add(other,'ONLY-OTHER');await expect.poll(()=>app.store['supplier-note:v1:other.mysapogo.com']?.suppliers[0].products.length).toBe(1);
 expect(app.store[KEY]).toEqual(initial());
});
test('loading failure does not overwrite existing data',async({app})=>{
 app.store[KEY]=initial();app.failReads=true;const page=await app.open();
 await expect(page.getByRole('status')).toContainText('Không đọc được');
 expect(app.writes).toBe(0);expect(app.store[KEY]).toEqual(initial());
});
test('SPA switching suppliers and back never mixes their links',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();
 await page.evaluate(()=>history.pushState({},'', '/admin/suppliers/456/histories'));
 await expect(page.getByText('Dao rọc giấy',{exact:true})).toHaveCount(0);
 await app.add(page,'SUPPLIER-456');await expect.poll(()=>app.store[KEY].suppliers.length).toBe(2);
 await page.evaluate(()=>history.pushState({},'', '/admin/suppliers/123/histories'));
 await expect(page.getByText('Dao rọc giấy',{exact:true})).toBeVisible();
 await expect(page.getByText('SUPPLIER-456',{exact:true})).toHaveCount(0);
});
test('mobile and desktop panels fit viewport, Escape closes and restores focus',async({app})=>{
 const page=await app.open();
 for(const size of [{width:320,height:568},{width:390,height:844},{width:1366,height:768}]){
  await page.setViewportSize(size);const rect=await page.locator('#supplier-note-extension').locator('.panel').boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(size.width);expect(rect.y+rect.height).toBeLessThanOrEqual(size.height);
 }
 await page.getByLabel('SKU',{exact:true}).focus();await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Nhà cung cấp',exact:true})).toBeFocused();
 await expect(page.locator('#supplier-note-extension').locator('.panel')).toBeHidden();
});

test('renaming twice including back to original name persists both changes',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();const name=page.getByLabel('Tên nhà cung cấp',{exact:true});
 await name.fill('Tên mới');await name.press('Tab');await expect.poll(()=>app.store[KEY].suppliers[0].name).toBe('Tên mới');
 await name.fill('Công ty A');await name.press('Tab');await expect.poll(()=>app.store[KEY].suppliers[0].name).toBe('Công ty A');
});
test('five concurrent tabs retain every independent link',async({app})=>{
 app.store[KEY]=initial();const pages=await Promise.all(Array.from({length:5},()=>app.open()));app.delay=35;
 await Promise.all(pages.map((p,i)=>app.add(p,`TAB-${i}`)));
 await expect.poll(()=>app.store[KEY].suppliers[0].products.length,{timeout:10000}).toBe(6);
 const view=pages[0];await view.getByRole('button',{name:'Đóng',exact:true}).click();await view.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
 for(let i=0;i<5;i++)await expect(view.getByText(`TAB-${i}`,{exact:true})).toBeVisible();
});
test('same SKU simultaneously added by two tabs creates one link',async({app})=>{
 app.store[KEY]=initial();const a=await app.open(),b=await app.open();app.delay=50;
 await Promise.all([app.add(a,'SAME'),app.add(b,'SAME')]);
 await expect.poll(()=>app.store[KEY].suppliers[0].products.length).toBe(2);
 await expect.poll(()=>app.writes).toBe(1);
 await expect(a.getByText('SAME',{exact:true})).toBeVisible();
 await expect(b.getByText('SAME',{exact:true})).toBeVisible();
});
test('storage refresh does not reset product filter',async({app})=>{
 app.store[KEY]=initial();const a=await app.open(),b=await app.open();
 await a.getByLabel('Lọc sản phẩm',{exact:true}).fill('Q-100P');await app.add(b,'OTHER');
 await expect.poll(()=>app.store[KEY].suppliers[0].products.length).toBe(2);
 await expect(a.getByLabel('Lọc sản phẩm',{exact:true})).toHaveValue('Q-100P');
 await expect(a.getByText('OTHER',{exact:true})).toHaveCount(0);
});
test('empty restore removes links and survives reopen',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();await app.import(page,{shop:SHOP,version:1,suppliers:[]});
 await expect.poll(()=>app.store[KEY].suppliers.length).toBe(0);await expect(page.getByText('Chưa có sản phẩm liên kết.',{exact:true})).toBeVisible();
 const second=await app.open();await expect(second.getByText('Dao rọc giấy',{exact:true})).toHaveCount(0);
});
test('oversized and unsupported version imports leave data intact',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();
 await app.import(page,{shop:SHOP,version:2,suppliers:[]});await expect(page.getByRole('status')).toContainText('không hợp lệ');
 await app.import(page,' '.repeat(5*1024*1024+1));await expect(page.getByRole('status')).toContainText('5 MB');expect(app.store[KEY]).toEqual(initial());
});
test('clipboard denial is handled without mutating Sapo fields',async({app})=>{
 app.store[KEY]=initial();app.html='<input id="sapo-supplier" value="Đã chọn sẵn">';const page=await app.open('/admin/purchase_orders/create');
 await page.getByLabel('SKU sản phẩm',{exact:true}).fill('Q-100P');await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));
 await page.getByRole('button',{name:'Sao chép tên'}).click();await expect(page.getByRole('status')).toContainText('Không sao chép được');await expect(page.locator('#sapo-supplier')).toHaveValue('Đã chọn sẵn');
});
test('visible CSS SKU and multiline product link layouts are detected',async({app})=>{
 app.store[KEY]=initial();const page=await app.open('/admin/purchase_orders/create');
 for(const html of ['<table><tbody><tr><td><span class="product-sku">Q-100P</span></td></tr></tbody></table>','<table><tbody><tr><td><a href="/admin/products/1">Dao<br>Q-100P</a></td></tr></tbody></table>']){
  await page.evaluate(html=>document.querySelector('#app').innerHTML=html,html);await expect(page.getByText('1/1 sản phẩm',{exact:true})).toBeVisible();
  await page.evaluate(()=>document.querySelector('#app').replaceChildren());await expect(page.getByText('1/1 sản phẩm',{exact:true})).toHaveCount(0);
 }
});
test('repeated injection does not create duplicate panels',async({app})=>{
 const page=await app.open();const fs=await import('node:fs/promises');await page.addScriptTag({content:await fs.readFile('extension/content.js','utf8')});
 await expect(page.locator('#supplier-note-extension')).toHaveCount(1);await expect(page.getByRole('button',{name:'+ Liên kết sản phẩm'})).toHaveCount(1);
});

test('immediate SPA navigation blocks an old supplier form from saving to wrong supplier',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();
 await page.getByLabel('SKU',{exact:true}).fill('WRONG');await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Không lưu nhầm');
 await page.evaluate(()=>{
  history.pushState({},'', '/admin/suppliers/456/histories');
  document.querySelector('#supplier-note-extension').shadowRoot.querySelector('form').requestSubmit();
 });
 await expect(page.getByRole('status')).toContainText('Trang đã thay đổi');expect(app.store[KEY]).toEqual(initial());
});
test('finishing a slow save does not erase a new supplier draft',async({app})=>{
 app.store[KEY]=initial();const page=await app.open();app.delay=900;await app.add(page,'SLOW');
 await page.evaluate(()=>history.pushState({},'', '/admin/suppliers/456/histories'));
 await expect(page.getByText('Dao rọc giấy',{exact:true})).toHaveCount(0);
 await page.getByLabel('SKU',{exact:true}).fill('NEXT-DRAFT');await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Nháp mới');
 await expect.poll(()=>app.store[KEY].suppliers[0].products.length).toBe(2);
 await expect(page.getByLabel('SKU',{exact:true})).toHaveValue('NEXT-DRAFT');
});
test('large catalog renders in pages and can filter the last SKU',async({app})=>{
 app.store[KEY]={version:1,suppliers:[{id:'123',name:'NCC lớn',products:Array.from({length:1200},(_,i)=>({sku:`ITEM-${i}`,name:`Sản phẩm ${i}`}))}]};
 const page=await app.open();await expect(page.getByRole('button',{name:'Bỏ',exact:true})).toHaveCount(100);
 await page.getByRole('button',{name:'Xem thêm (1100)'}).click();await expect(page.getByRole('button',{name:'Bỏ',exact:true})).toHaveCount(200);
 await page.getByLabel('Lọc sản phẩm',{exact:true}).fill('ITEM-1199');await expect(page.getByRole('button',{name:'Bỏ',exact:true})).toHaveCount(1);await expect(page.getByText('ITEM-1199',{exact:true})).toBeVisible();
});
test('SKU longer than 100 characters never falsely matches its prefix',async({app})=>{
 const sku='X'.repeat(100);app.store[KEY]={version:1,suppliers:[{id:'123',name:'NCC',products:[{sku,name:'Dài'}]}]};
 app.html=`<table><tbody><tr data-sku="${sku}extra"><td>Different SKU</td></tr></tbody></table>`;
 const page=await app.open('/admin/purchase_orders/create');await expect(page.getByText('1/1 sản phẩm',{exact:true})).toHaveCount(0);
 await page.getByLabel('SKU sản phẩm',{exact:true}).fill(sku+'extra');await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('100 ký tự');await expect(page.getByText('1/1 sản phẩm',{exact:true})).toHaveCount(0);
});
test('modal product search results are not counted as selected products',async({app})=>{
 app.store[KEY]=initial();app.html='<div role="dialog"><table><tbody><tr data-sku="Q-100P"><td>Search result</td></tr></tbody></table></div>';
 const page=await app.open('/admin/purchase_orders/create');await expect(page.getByText('1/1 sản phẩm',{exact:true})).toHaveCount(0);
});

test('multiline query and long SKU stay inside mobile panel',async({app})=>{
 const sku='X'.repeat(100);app.store[KEY]={version:1,suppliers:[{id:'123',name:'NCC',products:[{sku,name:'Dài'}]}]};
 const page=await app.open('/admin/purchase_orders/create');await page.setViewportSize({width:320,height:568});
 await page.getByLabel('SKU sản phẩm',{exact:true}).fill(`${sku}\nUNKNOWN`);await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
 await expect(page.getByText('1/2 sản phẩm',{exact:true})).toBeVisible();
 const sizes=await page.locator('#supplier-note-extension').locator('.body').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
});
test('untrusted supplier and product text cannot inject elements',async({app})=>{
 app.html='<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>';const page=await app.open();
 await app.add(page,'SAFE','<img src=x onerror=alert(1)>');await expect(page.getByText('Đã liên kết sản phẩm.',{exact:true})).toBeVisible();
 await expect(page.locator('#supplier-note-extension').locator('script,img')).toHaveCount(0);expect(app.store[KEY].suppliers[0].products[0].name).toBe('<img src=x onerror=alert(1)>');
});
test('whitespace-only SKU and names never save',async({app})=>{
 const page=await app.open();await app.add(page,'   ','   ');await expect(page.getByRole('status')).toContainText('Nhập tên');expect(app.writes).toBe(0);
});
