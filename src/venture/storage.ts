import type { GameId } from './catalog';
export interface RecordEntry { wins: number; bestMs: number; lastPlayed: string }
export interface Passport { records: Record<string,RecordEntry>; daily: Record<string,number>; favorites: string[]; sound: boolean; reducedMotion: boolean }
const KEY='venture-passport-v2';
const empty = (): Passport=>({records:{},daily:{},favorites:[],sound:true,reducedMotion:false});
export function loadPassport(): Passport { try { const p=JSON.parse(localStorage.getItem(KEY)||'null'); if(!p||typeof p!=='object')return empty(); return {...empty(),...p,records:p.records&&typeof p.records==='object'?p.records:{},daily:p.daily&&typeof p.daily==='object'?p.daily:{},favorites:Array.isArray(p.favorites)?p.favorites:[]}; }catch{return empty();} }
export function savePassport(p:Passport) { try {localStorage.setItem(KEY,JSON.stringify(p));}catch{/* Play remains available when browser storage is full or disabled. */} }
export function recordWin(p:Passport,id:GameId,ms:number,date:string):Passport { const old=p.records[String(id)]; return {...p,records:{...p.records,[String(id)]:{wins:(old?.wins||0)+1,bestMs:old?.bestMs?Math.min(old.bestMs,ms):ms,lastPlayed:date}}}; }
export function prettyTime(ms:number) { const seconds=Math.max(1,Math.round(ms/1000)); return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; }
