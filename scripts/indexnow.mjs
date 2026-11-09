#!/usr/bin/env node
import fs from 'node:fs/promises';

const SITE=(process.env.SITE_URL||'https://macca-lab.onrender.com').replace(/\/$/,'');
const KEY=process.env.INDEXNOW_KEY||'3f47a1c26b904d87a5e31f6c8b1290de';
const KEY_LOCATION=`${SITE}/${KEY}.txt`;

let input='';
for await (const chunk of process.stdin) input+=chunk;
const files=input.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);

function urlForFile(file){
  const normalized=file.replaceAll('\\','/');
  if(normalized==='index.html') return `${SITE}/`;
  if(!normalized.endsWith('/index.html')) return '';
  const route=normalized.slice(0,-'index.html'.length);
  if(/^(blog\/[^/]+\/|gta-6(?:\/[^/]+)?\/|gta-online\/|rockstar-games\/|social\/)$/.test(route)) return `${SITE}/${route}`;
  return '';
}

let urls=[...new Set(files.map(urlForFile).filter(Boolean))];
// No content changes means no submissions. Never resend unrelated recent posts.
urls=[...new Set(urls)].slice(0,200);
if(!urls.length){
  console.log('IndexNow: no public content URL changed.');
  process.exit(0);
}

const payload={host:new URL(SITE).host,key:KEY,keyLocation:KEY_LOCATION,urlList:urls};
const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'content-type':'application/json; charset=utf-8'},
  body:JSON.stringify(payload),
  signal:AbortSignal.timeout(20000),
});
if(response.status===200||response.status===202){
  console.log(`IndexNow accepted ${urls.length} URL(s) with HTTP ${response.status}.`);
  process.exit(0);
}
const body=await response.text().catch(()=> '');
console.warn(`IndexNow returned HTTP ${response.status}: ${body.slice(0,300)}`);
process.exit(response.status===429?0:1);
