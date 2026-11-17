import {test as base, expect} from '@playwright/test';
import fs from 'node:fs/promises';
const core = await fs.readFile('extension/core.js','utf8');
const content = await fs.readFile('extension/content.js','utf8');
export const SHOP='demo.mysapogo.com';
export const KEY=`supplier-note:v1:${SHOP}`;
export const initial = () => ({version:1,suppliers:[{id:'123',name:'Công ty A',products:[{sku:'Q-100P',name:'Dao rọc giấy'}]}]});
export const test=base.extend({
 app: async ({context},use,testInfo) => {
  let seed = 71 + testInfo.repeatEachIndex * 113;
  const jitter = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % 17; };
  const app={store:{},delay:0,failReads:false,failWrites:false,errors:[],writes:0,confirm:true,html:'<h1>Công ty A</h1><div id="app"></div>'};
  await context.exposeBinding('mockGet',async (_,key)=>{
   await new Promise(r=>setTimeout(r,app.delay + jitter()));
   if(app.failReads) throw new Error('read unavailable');
   return structuredClone({[key]:app.store[key]});
  });
  await context.exposeBinding('mockSet',async (_,value)=>{
   await new Promise(r=>setTimeout(r,app.delay + jitter()));
   if(app.failWrites) throw new Error('QUOTA_BYTES exceeded');
   const changes={};
   for(const [k,v] of Object.entries(value)) {changes[k]={oldValue:app.store[k],newValue:v};app.store[k]=structuredClone(v);}
   app.writes++;
   // onChanged is asynchronously broadcast to all extension contexts, including writer.
   setTimeout(()=>{for(const page of context.pages()) page.evaluate(changes=>window.__storageEvent?.(changes),changes).catch(()=>{});},0);
  });
  await context.addInitScript(()=>{
   const listeners=[];
   window.__storageEvent=changes=>listeners.forEach(f=>f(changes,'local'));
   window.chrome={storage:{local:{get:k=>window.mockGet(k),set:v=>window.mockSet(v)},onChanged:{addListener:f=>listeners.push(f)}}};
  });
  await context.route('https://**.mysapogo.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<meta charset="utf-8">${app.html}`}));
  app.open=async (path='/admin/suppliers/123/histories',shop=SHOP)=>{
   const page=await context.newPage();page.on('pageerror',e=>app.errors.push(e.message));
   page.on('dialog',d=>app.confirm?d.accept():d.dismiss());
   await page.goto(`https://${shop}${path}`);
   await page.addScriptTag({content:core}); await page.addScriptTag({content});
   await page.getByRole('button',{name:'Nhà cung cấp',exact:true}).click();
   // initial storage read may be deliberately slow
   if(!app.failReads) await expect(page.locator('#supplier-note-extension').locator('#context')).not.toBeEmpty();
   return page;
  };
  app.add=async(page,sku,name='Sản phẩm mới')=>{
   await page.getByLabel('SKU',{exact:true}).fill(sku);
   await page.getByLabel('Tên sản phẩm',{exact:true}).fill(name);
   await page.getByRole('button',{name:'+ Liên kết sản phẩm'}).click();
  };
  app.import=async(page,value)=>{
   await page.getByRole('status').evaluate(node=>{node.textContent='';});
   await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
   await expect(page.getByRole('status')).not.toBeEmpty();
  };
  await use(app);
  expect(app.errors,'uncaught browser errors').toEqual([]);
 }
});
export {expect};
