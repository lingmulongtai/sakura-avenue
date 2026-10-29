const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

function animatedGLB(external = false) {
  const floats = new Float32Array([0,-1,0, 1,-1,0, 0,0,0, 0,1, 0,0,0, 0,1,0]);
  const bin = Buffer.from(floats.buffer);
  const json = {asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[0,0.25,1,1],metallicFactor:0,roughnessFactor:1}}],buffers:[external ? {byteLength:bin.length,uri:'https://example.invalid/buffer.bin'} : {byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:8},{buffer:0,byteOffset:44,byteLength:24}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,-1,0],max:[1,0,0]},{bufferView:1,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]},{bufferView:2,componentType:5126,count:2,type:'VEC3'}],animations:[{name:'Lift',samplers:[{input:1,output:2,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'translation'}}]}]};
  let raw = Buffer.from(JSON.stringify(json));
  const pad = (4 - raw.length % 4) % 4;
  raw = Buffer.concat([raw,Buffer.alloc(pad,0x20)]);
  const out=Buffer.alloc(12+8+raw.length+8+bin.length);
  out.writeUInt32LE(0x46546c67,0); out.writeUInt32LE(2,4); out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(raw.length,12); out.writeUInt32LE(0x4e4f534a,16); raw.copy(out,20);
  const off=20+raw.length; out.writeUInt32LE(bin.length,off); out.writeUInt32LE(0x004e4942,off+4); bin.copy(out,off+8);
  return out;
}
const hash = b => createHash('sha256').update(b).digest('hex');
(async()=>{
  let server;
  let base = process.argv[2];
  if (!base) {
    const root = path.resolve('dist');
    server = http.createServer((req,res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.pdf':'application/pdf'};
      fs.readFile(file, (err,data) => { if (err) { res.writeHead(404).end(); return; } res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(data); });
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    base = `http://127.0.0.1:${server.address().port}/`;
  }
  const browser = await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const context=await browser.newContext({locale:'en-US',viewport:{width:1440,height:1000},acceptDownloads:true});
    const page=await context.newPage(), errors=[], requests=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('request', request=>requests.push(request.url()));
    await page.goto(new URL('models.html',base).href,{waitUntil:'networkidle'});
    await page.locator('#viewport canvas').waitFor({state:'visible'});
    assert.equal(await page.locator('#viewer-error').isHidden(),true);
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    assert.ok((await page.locator('#status').textContent()).includes('concept model'));
    assert.ok(await page.locator('#viewport canvas').evaluate(c=>!!c.getContext('webgl2')));
    const initial=hash(await page.locator('#viewport canvas').screenshot());
    await page.locator('#width').fill('1.4');
    assert.equal(await page.locator('#width-value').textContent(),'1.40×');
    assert.notEqual(hash(await page.locator('#viewport canvas').screenshot()),initial);
    await page.locator('#angle').fill('45');
    assert.equal(await page.locator('#angle-value').textContent(),'45°');
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#width').inputValue(),'1.4');
    assert.equal(await page.locator('#angle').inputValue(),'45');
    await page.locator('#animate').click();
    assert.equal(await page.locator('#animate').getAttribute('aria-pressed'),'true');
    const movement=hash(await page.locator('#viewport canvas').screenshot());
    await page.waitForTimeout(450);
    assert.notEqual(hash(await page.locator('#viewport canvas').screenshot()),movement);
    await page.locator('#animate').click();
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-glb').click()]);
    const exported=await download.path();
    await page.locator('#model-file').setInputFiles({name:'exported.glb',mimeType:'model/gltf-binary',buffer:fs.readFileSync(exported)});
    await page.waitForFunction(()=>document.querySelector('#import-controls').hidden===false);
    assert.equal(await page.locator('#animation-play').isDisabled(),true);
    await page.locator('#model-file').setInputFiles({name:'animated.glb',mimeType:'model/gltf-binary',buffer:animatedGLB()});
    await page.waitForFunction(()=>document.querySelector('#animation-select').options[0]?.text==='Lift');
    const screenshot=await page.locator('#viewport canvas').screenshot();
    const bluePixels=await page.evaluate(async data=>{
      const image=new Image(); image.src='data:image/png;base64,'+data; await image.decode();
      const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
      const context=canvas.getContext('2d'); context.drawImage(image,0,0);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data; let count=0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i+2]>pixels[i]*1.3 && pixels[i+2]>pixels[i+1]*1.2) count++;
      return count;
    },screenshot.toString('base64'));
    assert.ok(bluePixels>300,`Imported model below the origin should be visible; blue pixels: ${bluePixels}`);
    assert.equal(await page.locator('#animation-play').isEnabled(),true);
    await page.locator('#animation-play').click();
    assert.equal(await page.locator('#animation-play').getAttribute('aria-pressed'),'true');
    await page.locator('#animation-play').click();
    assert.equal(await page.locator('#animation-play').getAttribute('aria-pressed'),'false');
    await page.locator('#model-file').setInputFiles({name:'external.glb',mimeType:'model/gltf-binary',buffer:animatedGLB(true)});
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('External resources are not supported'));
    assert.equal(requests.some(url=>url.startsWith('https://example.invalid/')),false);
    await page.locator('#show-concept').click();
    await page.locator('.sitebar .langsw button[data-lang="ja"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'ja');
    assert.ok((await page.locator('#status').textContent()).includes('検討用モデル'));
    assert.deepEqual(errors,[]);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(() => {
      const nav = document.querySelector('.pagelinks').getBoundingClientRect();
      const link = document.querySelector('.pagelinks [aria-current="page"]').getBoundingClientRect();
      return link.left >= nav.left - 1 && link.right <= nav.right + 1;
    }, null, { timeout: 3000 }).catch(async error => { console.log(await page.evaluate(() => {const n=document.querySelector('.pagelinks'); const a=n.querySelector('[aria-current="page"]'); return {nav:n.getBoundingClientRect().toJSON(), link:a.getBoundingClientRect().toJSON(), scrollLeft:n.scrollLeft, scrollWidth:n.scrollWidth, clientWidth:n.clientWidth};})); throw error; });
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(base,{waitUntil:'networkidle'});
    assert.equal(await page.locator('html').getAttribute('lang'),'ja');
    assert.ok(await page.locator('.pagelinks a[href="models.html"]').count());
    const scene=await page.locator('#sceneIx').textContent();
    await page.locator('#bNext').click();
    assert.notEqual(await page.locator('#sceneIx').textContent(),scene);
    const count=Number(await page.locator('#hOut').textContent());
    await page.locator('#hPlus').click();
    assert.equal(Number(await page.locator('#hOut').textContent()),count+1);
    await page.locator('#simEx').click();
    assert.ok((await page.locator('#simMsg').textContent()).trim());
    await page.locator('#qwrap .qb[data-k="safe"]').click();
    assert.equal(await page.locator('#qwrap .qb:disabled').count(),3);
    for (const route of ['strategy.html','calculator.html','glossary.html']) {
      const response=await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      assert.ok(await page.locator('.pagelinks a[href="models.html"]').count());
      if (route==='strategy.html') assert.ok(await page.locator('#mx button').count()>0);
      if (route==='calculator.html') {
        assert.ok(await page.locator('#calcPresets button').count()>0);
        await page.locator('#calcPresets button').last().click();
        assert.ok((await page.locator('#calcResult').textContent()).trim());
      }
      if (route==='glossary.html') {
        const before=await page.locator('#glCount').textContent();
        await page.locator('#glQ').fill('五分咲き');
        assert.notEqual(await page.locator('#glCount').textContent(),before);
      }
    }
    assert.deepEqual(errors,[]);
    await context.close();
    for (const [locale, expected] of [['ja-JP','ja'],['en-US','en'],['fr-FR','en']]) {
      const localeContext=await browser.newContext({locale});
      const localePage=await localeContext.newPage();
      for (const route of ['', 'models.html']) {
        await localePage.goto(new URL(route,base).href,{waitUntil:'domcontentloaded'});
        assert.equal(await localePage.locator('html').getAttribute('lang'),expected,`${route} ${locale}`);
      }
      await localeContext.close();
    }
    const blockedContext=await browser.newContext({locale:'ja-JP'});
    await blockedContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('blocked');}}));
    const blockedPage=await blockedContext.newPage();
    await blockedPage.goto(new URL('models.html',base).href,{waitUntil:'domcontentloaded'});
    assert.equal(await blockedPage.locator('html').getAttribute('lang'),'ja');
    await blockedContext.close();
    console.log('PASS: WebGL render, shape & pose, persistence, motion, GLB export/import, animation, external resource rejection, language, existing pages and interactions, and mobile layout');
  } finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(e=>{console.error(e); process.exitCode=1});
