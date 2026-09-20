import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
 const server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Quick-quiz\//,'');if(!route)route='index.html';const file=path.resolve(root,route);if(!file.startsWith(root+path.sep))throw Error();if(!(await stat(file)).isFile())throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/Quick-quiz/`;
 const browser=await type.launch();
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('heading',{name:'Little escapes. Big discoveries.'}).waitFor();await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const manifest=await page.evaluate(async()=>await(await fetch('manifest.webmanifest')).json());if(manifest.display!=='standalone')throw Error('Missing standalone display');const cached=await page.evaluate(async()=>{const keys=await caches.keys();return(await(await caches.open(keys.find(k=>k.startsWith('daily-venture-')))).keys()).length;});if(cached<20)throw Error('Incomplete offline cache');
 // Cut the actual server connection. This also exercises WebKit, whose browser-level
 // offline emulation can abort navigation before a service worker handles it.
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 await page.reload();await page.getByRole('heading',{name:'Little escapes. Big discoveries.'}).waitFor();await page.getByRole('button',{name:'The arcade',exact:true}).click();if(await page.locator('.v-game-card').count()!==27)throw Error('Missing arcade cards');await page.getByRole('button',{name:'Play Rune Word',exact:true}).click();await page.locator('.lab-screen canvas').waitFor();await page.getByRole('button',{name:'Let’s play →',exact:true}).click();await page.evaluate(()=>window.advanceTime?.(0));await page.keyboard.type('TRAIL');await page.keyboard.press('Enter');await page.evaluate(()=>window.advanceTime?.(1100));for(let i=0;i<4;i++)await page.getByRole('button',{name:'Move right',exact:true}).click();await page.getByRole('heading',{name:'Curiosity, rewarded.'}).waitFor();await page.screenshot({path:`output/rebuild/offline-${name}.png`});if(errors.length)throw Error(errors.join('\n'));console.log(`${name}: ${cached} cached files; server disconnected; offline reload, unvisited game load, and full Rune Word completion passed.`);
 }finally{server.closeAllConnections();server.close();await browser.close();}
}
