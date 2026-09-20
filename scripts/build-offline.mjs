import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function list(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=`${dir}/${entry.name}`;if(entry.isDirectory())files.push(...await list(file));else files.push(file);}return files;}
const files=(await list('dist')).filter(f=>!f.endsWith('/sw.js'));
const version=createHash('sha256');for(const file of files)version.update(await readFile(file));
const cache=`daily-venture-v2-${version.digest('hex').slice(0,12)}`;
const relative=files.map(f=>`./${f.slice(5)}`);
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(cache)};
const FILES=${JSON.stringify(relative)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('daily-venture-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request; const url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL('./index.html',self.location.href)))));return;}
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request, { ignoreVary: true }))||fetch(request)));
});
`);
console.log(`Offline ready: ${files.length} files precached (${cache}).`);
