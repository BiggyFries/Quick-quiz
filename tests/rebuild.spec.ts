import { expect,test,type Page } from '@playwright/test';
import { GAMES, daySeed } from '../src/venture/catalog';
import { initialClassicLabState } from '../src/lab/classicLabs';
import { DOMINO_SOLUTION, FLOOD_SOLUTION, UNTANGLE_SOLUTION } from '../src/lab/motionLabs';
const snap=async(page:Page)=>{await page.waitForFunction(()=>typeof window.render_game_to_text==='function');return JSON.parse(await page.evaluate(()=>window.render_game_to_text!()));};
async function advance(page:Page,ms:number){await page.evaluate(ms=>window.advanceTime?.(ms),ms);await page.waitForTimeout(20);}
async function ready(page:Page){await page.locator('.lab-screen canvas').waitFor();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await page.getByRole('button',{name:'Let’s play →',exact:true}).click();await advance(page,0);}
async function open(page:Page,id:string|number){await page.goto(`/?lab=${id}`);await ready(page);}
async function point(page:Page,x:number,y:number){const b=await page.locator('.lab-screen > canvas').boundingBox();await page.mouse.click(b!.x+x/390*b!.width,b!.y+y/844*b!.height);}
async function portal(page:Page){await advance(page,1100);for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');await expect(page.locator('.v-result')).toBeVisible();}

test('responsive discovery, all 27 games, filters, favorites, install and saved explorer',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:1000},{width:390,height:844},{width:360,height:640}]){await page.setViewportSize(size);await page.goto('/');await expect(page.getByRole('heading',{name:'Little escapes. Big discoveries.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`output/rebuild/home-${size.width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'The arcade',exact:true}).click();await expect(page.locator('.v-game-card')).toHaveCount(27);
 await page.getByRole('button',{name:'Save Echo Sequence',exact:true}).click();await page.getByRole('button',{name:'Saved games',exact:false}).click();await expect(page.locator('.v-game-card')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:'The arcade',exact:true}).click();await expect(page.getByRole('button',{name:'Unsave Echo Sequence'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'React',exact:true}).click();await expect(page.locator('.v-game-card')).toHaveCount(5);await page.getByRole('button',{name:'All games',exact:true}).click();await page.getByRole('textbox',{name:'Search games'}).fill('not-a-puzzle');await expect(page.getByText('No escapes found, yet.')).toBeVisible();await page.getByRole('button',{name:'Show every game'}).click();await expect(page.locator('.v-game-card')).toHaveCount(27);
 await page.getByRole('button',{name:'Take it with you ↗'}).click();await expect(page.getByRole('dialog')).toContainText('Add to Home Screen');await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:/Customize character/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'output/rebuild/customizer.png'});await page.getByRole('button',{name:'Close dialog'}).click();expect(errors).toEqual([]);
});

test('every rebuilt game opens and its controls fit compact and modern iPhones',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:360,height:640},{width:390,height:844},{width:430,height:932}]){await page.setViewportSize(size);for(const game of GAMES){await open(page,game.id);await expect(page.locator('.lab-screen')).toBeVisible();const state=await snap(page);expect(state.coordinateSystem).toBeTruthy();const box=await page.locator('.phone-stage').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height-35);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const controls=page.locator(Number(game.id)===15?'.word-keyboard':Number(game.id)===16?'.connection-panel':'.lab-controls');await expect(controls).toBeVisible();const cb=await controls.boundingBox();expect(cb!.x).toBeGreaterThanOrEqual(box!.x);expect(cb!.x+cb!.width).toBeLessThanOrEqual(box!.x+box!.width+1);expect(cb!.y+cb!.height).toBeLessThanOrEqual(box!.y+box!.height+1);if(size.width===390)await page.screenshot({path:`output/rebuild/room-${game.id}.png`});}}
 expect(errors).toEqual([]);
});

test('ready and pause stop clocks, undo reverses logic moves, and portal awards persist',async({page})=>{
 await page.goto('/?lab=14');await page.locator('.lab-screen canvas').waitFor();const before=await snap(page);await advance(page,8000);expect((await snap(page)).angle).toBe(before.angle);await ready(page);await advance(page,200);const running=await snap(page);expect(running.angle).toBeGreaterThan(before.angle);await page.getByRole('button',{name:'Pause game'}).click();await advance(page,5000);expect((await snap(page)).angle).toBe(running.angle);await page.keyboard.press('Space');expect((await snap(page)).misses).toBe(0);await page.getByRole('button',{name:'Keep exploring →'}).click();await advance(page,100);expect((await snap(page)).angle).not.toBe(running.angle);
 await open(page,9);const lights=(await snap(page)).lights;await page.getByRole('button',{name:/Lantern rune 1, 1/}).click();expect((await snap(page)).lights).not.toEqual(lights);await page.getByRole('button',{name:'↶ Undo move'}).click();expect((await snap(page)).lights).toEqual(lights);
 await open(page,19);const board=(await snap(page)).board;await page.getByRole('button',{name:'Flood color 2'}).click();await page.getByRole('button',{name:'↶ Undo move'}).click();expect((await snap(page)).board).toEqual(board);expect((await snap(page)).moves).toBe(0);
 await open(page,15);await page.keyboard.type('STONE');await page.keyboard.press('Enter');expect((await snap(page)).guesses).toHaveLength(1);await page.keyboard.type('TRAIL');await page.keyboard.press('Enter');expect((await snap(page)).status).toBe('complete');await portal(page);await expect(page.locator('.v-result')).toContainText('Rune Word');await page.reload();await page.getByRole('button',{name:'My passport',exact:true}).click();await expect(page.locator('.v-stamp-grid .earned')).toHaveCount(1);
});

test('a complete seeded five-room expedition saves each checkpoint and final passport',async({page})=>{
 test.setTimeout(180000);await page.goto('/');const home=await snap(page);const route=home.daily.route as number[];const seed=daySeed(home.daily.date);await page.getByRole('button',{name:'Start today’s adventure'}).click();await page.reload();
 for(let room=0;room<5;room++){
  const id=route[room];await ready(page);const initial=initialClassicLabState(id as any,seed);
  if(id===19){for(const color of FLOOD_SOLUTION)await page.getByRole('button',{name:`Flood color ${color+1}`}).click();}
  if(id===22){for(const pair of DOMINO_SOLUTION)for(const idx of pair)await point(page,195+(idx%4-Math.floor(idx/4))*35,245+(idx%4+Math.floor(idx/4))*16);}
  if(id===9){const lights=(await snap(page)).lights;const rows=Array.from({length:25},(_,i)=>{const row=Array(26).fill(0);for(let j=0;j<25;j++)if(Math.abs(i%5-j%5)+Math.abs(Math.floor(i/5)-Math.floor(j/5))<=1)row[j]=1;row[25]=lights[i]?0:1;return row;});const pivots:number[]=[];let r=0;for(let c=0;c<25;c++){const p=rows.findIndex((v,i)=>i>=r&&v[c]);if(p<0)continue;[rows[p],rows[r]]=[rows[r],rows[p]];for(let i=0;i<25;i++)if(i!==r&&rows[i][c])for(let k=c;k<=25;k++)rows[i][k]^=rows[r][k];pivots[r++]=c;}for(let i=0;i<r;i++)if(rows[i][25])await page.getByRole('button',{name:new RegExp(`Lantern rune ${Math.floor(pivots[i]/5)+1}, ${pivots[i]%5+1}`)}).click();}
  if(id===12&&initial.id===12){for(let round=0;round<3;round++){await advance(page,5000);for(const pad of initial.sequence.slice(0,4+round*2))await page.getByRole('button',{name:new RegExp(`Echo pad ${pad+1},`)}).click();}}
  if(id===13){let s=await snap(page);for(let i=0;i<16;i++)for(let n=0;n<(s.target[i]-s.rotations[i]+4)%4;n++)await page.getByRole('button',{name:new RegExp(`Gear link ${Math.floor(i/4)+1}, ${i%4+1},`)}).click();}
  if(id===18){for(const [x,y] of [[230,261],[195,309],[160,261],[195,213]])await point(page,x,y);}
  if(id===26){for(const pair of UNTANGLE_SOLUTION)for(const index of pair){const angle=-Math.PI/2+index*Math.PI/3;await point(page,195+Math.cos(angle)*123,340+Math.sin(angle)*105);}}
  if(id===14){for(let i=0;i<6;i++){const s=await snap(page);const delta=(s.targetAngle-s.angle+Math.PI*2)%(Math.PI*2);await advance(page,delta/s.speed*1000);await page.getByRole('button',{name:'PULSE',exact:false}).click();}}
  if(id===15&&initial.id===15){await page.keyboard.type(initial.target);await page.keyboard.press('Enter');}
  if(id===16&&initial.id===16){for(const group of initial.groups){for(const word of group.words)await page.getByRole('button',{name:word,exact:true}).click();await page.getByRole('button',{name:'SUBMIT GROUP'}).click();}}
  expect((await snap(page)).status).toBe('complete');await portal(page);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('venture-passport-v2')!).daily)).toMatchObject({[home.daily.date]:room+1});await page.screenshot({path:`output/rebuild/expedition-room-${room+1}-clear.png`});
  if(room<4){await page.getByRole('button',{name:'On to the next room →'}).click();if(room===0)await page.reload();}
 }
 await expect(page.getByRole('heading',{name:'Five rooms. Beautifully done.'})).toBeVisible();await page.goto('/');await expect(page.getByRole('button',{name:'Today’s expedition complete ✓'})).toBeVisible();
});

test('Prism Break supports touch dragging with a visible paddle and ball',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,7);const canvas=page.locator('.lab-screen > canvas');const b=await canvas.boundingBox();await page.mouse.move(b!.x+b!.width*.5,b!.y+b!.height*.6);await page.mouse.down();await page.mouse.move(b!.x+b!.width*.8,b!.y+b!.height*.6,{steps:8});await page.mouse.up();expect((await snap(page)).paddleX).toBeGreaterThan(280);await page.screenshot({path:'output/rebuild/prism-touch-final.png'});await advance(page,400);expect((await snap(page)).elapsedMs).toBeGreaterThan(0);
});
