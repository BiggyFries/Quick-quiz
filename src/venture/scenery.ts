const PALETTES = [
 ['#dce8cc','#acbf96','#65886a','#eac887'],
 ['#f0e3ce','#c7b393','#8b7967','#f3c26f'],
 ['#dcebf0','#a6c7cf','#567b83','#b4dfec'],
 ['#eae0ef','#bdadc9','#786988','#e2bde9'],
 ['#f0dfd4','#d4b09b','#947463','#ecb290'],
];
function tree(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,color:string){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#34534225';ctx.beginPath();ctx.ellipse(0,8,20,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7b7656';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,-55);ctx.stroke();ctx.fillStyle=color;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-27+i*6,-8-i*19);ctx.lineTo(0,-65-i*16);ctx.lineTo(27-i*6,-8-i*19);ctx.fill();}ctx.restore();}
export function drawScenery(ctx:CanvasRenderingContext2D,id:number,time:number){
 const colors=PALETTES[id%PALETTES.length];const still=document.documentElement.classList.contains('v-reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;const t=still?0:time;
 const sky=ctx.createLinearGradient(0,0,0,844);sky.addColorStop(0,colors[0]);sky.addColorStop(.55,colors[1]);sky.addColorStop(1,colors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,390,844);
 ctx.fillStyle='#fffde451';ctx.beginPath();ctx.arc(302,179,49,0,Math.PI*2);ctx.fill();
 for(let i=0;i<3;i++){ctx.fillStyle=i%2?'#fbffe326':'#fcffec44';ctx.beginPath();ctx.ellipse(65+i*121+Math.sin(t/20000+i)*12,158+(i%2)*49,55,12,0,0,Math.PI*2);ctx.fill();}
 for(let layer=0;layer<3;layer++){ctx.fillStyle=[`${colors[2]}12`,`${colors[2]}20`,`${colors[2]}29`][layer];ctx.beginPath();ctx.moveTo(0,370+layer*95);for(let x=0;x<=410;x+=30)ctx.lineTo(x,310+layer*91+Math.sin(x/80+layer*2+id)*40);ctx.lineTo(390,844);ctx.lineTo(0,844);ctx.closePath();ctx.fill();}
 ctx.save();ctx.strokeStyle='#eff5d963';ctx.lineWidth=1;ctx.setLineDash([3,7]);ctx.beginPath();ctx.ellipse(195,355,175,210,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 tree(ctx,20,260,.6,`${colors[2]}a0`);tree(ctx,377,250,.76,`${colors[2]}99`);tree(ctx,13,562,.7,colors[2]);tree(ctx,377,568,.8,colors[2]);
 ctx.fillStyle='#29462d25';ctx.beginPath();ctx.ellipse(195,537,143,22,0,0,Math.PI*2);ctx.fill();
 for(let i=0;i<13;i++){const x=(i*97+13)%390;const y=167+(i*59)%405+Math.sin(t/1700+i)*6;ctx.fillStyle=i%2?'#fff6c591':`${colors[3]}99`;ctx.beginPath();ctx.ellipse(x,y,2.3,1.4,t/4000+i,0,Math.PI*2);ctx.fill();}
}
