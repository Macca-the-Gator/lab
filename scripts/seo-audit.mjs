#!/usr/bin/env node
// Read-only site SEO report. Does not rewrite editorial text or invent ranking data.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const SITE='https://macca-lab.onrender.com';
const SKIP=new Set(['.git','.github','node_modules','scripts','assets','images','study','play','analytics','skylet','.private-engine','src','ads']);
const issues=[],pages=[],sitemapUrls=new Set();
const text=async file=>fs.readFile(path.join(ROOT,file),'utf8');
const attr=(tag,name)=>tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\\x27]([^"\\x27]+)["\\x27]','i'))?.[1]||'';
function record(type,page,detail){issues.push({type,page,detail:String(detail).slice(0,200)});}
async function walk(dir=''){
  for(const entry of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){
    if(entry.isDirectory()){
      if(!entry.name.startsWith('.')&&!SKIP.has(entry.name))await walk(path.join(dir,entry.name));
    }else if(entry.isFile()&&entry.name==='index.html')pages.push(path.join(dir,entry.name));
  }
}
for(const name of ['sitemap-pages.xml','blog/sitemap.xml','growth-sitemap.xml']){
  try{
    const xml=await text(name);
    for(const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g))sitemapUrls.add(match[1].replace(/&amp;/g,'&'));
  }catch(e){record('sitemap-read',name,e.message);}
}
await walk();
const canonicalSeen=new Map();
for(const file of pages){
  const route=file==='index.html'?'/':'/'+file.replaceAll(path.sep,'/').slice(0,-'index.html'.length);
  const url=SITE+route,html=await text(file);
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const getMeta=name=>attr(metas.find(tag=>attr(tag,'name').toLowerCase()===name)||'','content');
  const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const hidden=/\bnoindex\b/i.test(getMeta('robots'));
  const desc=getMeta('description');
  const canonicals=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0])
    .filter(tag=>attr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical')).map(tag=>attr(tag,'href'));
  if(!title)record('missing-title',route,'No title tag');
  if(!desc)record('missing-description',route,'No meta description');
  if(canonicals.length!==1)record('canonical-count',route,canonicals.length);
  const canonical=canonicals[0]||'';
  if(!hidden&&canonical&&canonical!==url)record('canonical-mismatch',route,canonical);
  if(!hidden&&canonical){
    if(canonicalSeen.has(canonical)&&canonicalSeen.get(canonical)!==route)record('duplicate-canonical',route,canonicalSeen.get(canonical));
    canonicalSeen.set(canonical,route);
  }
  if(!hidden&&route!=='/'&&!sitemapUrls.has(url)&&!sitemapUrls.has(canonical))record('missing-from-sitemap',route,url);
  if(hidden&&sitemapUrls.has(url))record('noindex-in-sitemap',route,url);
  // Avoid false positives for API, media, and external links.
  for(const match of html.matchAll(/<a\b[^>]*\bhref=["'](\/[^"'#?]+)["'][^>]*>/gi)){
    const target=match[1].split(/[?#]/)[0];
    if(target.startsWith('//')||!target.endsWith('/')||/^\/(?:api|assets|store|connect|visitors|study)\//.test(target))continue;
    try{await fs.access(path.join(ROOT,target.slice(1),'index.html'));}
    catch{record('broken-internal-link',route,target);}
  }
}
let opportunities=[];
try{
  const gsc=JSON.parse(await text('blog/search-console.json'));
  opportunities=(gsc.pageOpportunities||[]).filter(x=>x.impressions>=20&&x.position>0).slice(0,12);
}catch{}
const totals={};
for(const item of issues)totals[item.type]=(totals[item.type]||0)+1;
const report={checkedAt:new Date().toISOString(),site:SITE,pagesChecked:pages.length,sitemapCount:sitemapUrls.size,issueCounts:totals,issues,searchOpportunities:opportunities};
const out=process.argv.indexOf('--output');
if(out!==-1){
  if(!process.argv[out+1])throw Error('Expected file after --output');
  const dest=path.resolve(process.argv[out+1]);
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.writeFile(dest,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({pages:pages.length,sitemapUrls:sitemapUrls.size,issueCounts:totals,searchOpportunities:opportunities.length},null,2));
if(process.env.GITHUB_STEP_SUMMARY){
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    '## Macca SEO check\n- Public pages inspected: '+pages.length+
    '\n- URLs in sitemaps: '+sitemapUrls.size+
    '\n- Findings: '+JSON.stringify(totals)+
    '\n- Verified search opportunities: '+opportunities.length+
    '\nNot a Google indexation or ranking report.\n');
}
if(process.argv.includes('--strict')&&issues.some(x=>['canonical-mismatch','canonical-count','noindex-in-sitemap','missing-title'].includes(x.type)))process.exitCode=1;
