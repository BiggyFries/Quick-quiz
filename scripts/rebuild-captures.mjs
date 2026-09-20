import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('output/rebuild',{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.setViewportSize({width:1440,height:1100});await page.goto('http://127.0.0.1:5173');await page.screenshot({path:'output/rebuild/home-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/rebuild/home-phone.png',fullPage:true});
for(const id of [9,12,15,19,23,'adventure','block-shift']){await page.goto(`http://127.0.0.1:5173/?lab=${id}`);await page.waitForSelector('.lab-screen canvas');await page.getByRole('button',{name:'Let’s play →',exact:true}).click();await page.evaluate(()=>window.advanceTime?.(0));await page.screenshot({path:`output/rebuild/game-${id}-phone.png`});}
await page.setViewportSize({width:360,height:640});await page.goto('http://127.0.0.1:5173/?lab=15');await page.waitForSelector('.word-keyboard');await page.getByRole('button',{name:'Let’s play →',exact:true}).click();await page.screenshot({path:'output/rebuild/game-15-small.png'});console.log({errors});await browser.close();
