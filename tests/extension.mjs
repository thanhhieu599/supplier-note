import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
const extension = path.resolve('extension');
const profile = await fs.mkdtemp('/tmp/supplier-note-profile-');
const context = await chromium.launchPersistentContext(profile, {
 executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, ignoreDefaultArgs:['--disable-extensions'],
 args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
});
context.setDefaultTimeout(10000);
try {
 await context.route('https://live-test.mysapogo.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><h1>Nhà cung cấp thử nghiệm</h1>'}));
 const page=await context.newPage();
 await page.goto('https://live-test.mysapogo.com/admin/suppliers/42/histories');
 await page.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
 await page.getByLabel('SKU',{exact:true}).fill('TEST-01');
 await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Sản phẩm kiểm thử');
 await page.getByRole('button',{name:'+ Liên kết sản phẩm'}).click();
 await page.getByText('Đã liên kết sản phẩm.',{exact:true}).waitFor();
 await page.reload();
 await page.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
 await page.getByText('Sản phẩm kiểm thử',{exact:true}).waitFor();
 const other=await context.newPage();
 await other.goto('https://live-test.mysapogo.com/admin/suppliers/42/histories');
 await other.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
 await other.getByLabel('SKU',{exact:true}).fill('TEST-02');
 await other.getByLabel('Tên sản phẩm',{exact:true}).fill('Sản phẩm hai');
 await other.getByRole('button',{name:'+ Liên kết sản phẩm'}).click();
 await page.getByText('Sản phẩm hai',{exact:true}).waitFor();
 await page.goto('https://live-test.mysapogo.com/admin/purchase_orders/create');
 await page.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
 await page.getByLabel('SKU sản phẩm',{exact:true}).fill('TEST-01;TEST-02');
 await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
 await page.getByText('2/2 sản phẩm',{exact:true}).waitFor();
 assert.equal(await page.getByText('Nhà cung cấp thử nghiệm',{exact:true}).count(),1);
 console.log('PASS: real unpacked MV3 extension, real chrome.storage, reload persistence, cross-tab synchronization, supplier suggestions.');
} finally {await context.close(); await fs.rm(profile,{recursive:true,force:true});}
