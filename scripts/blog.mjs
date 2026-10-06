#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { HUBS, buildGrowthPages, relatedHubs, socialScore, searchConsoleBonus } from './growth_v2.mjs';

const ROOT = process.cwd();
// Growth pipeline: generated publication state is rebuilt from blog/posts.json.
const BASE = process.env.SITE_URL || 'https://macca-lab.onrender.com';
const BACKFILL = process.argv.includes('--backfill');
const DAILY_ARTICLE_CAP = Math.max(1, Math.min(12, Number(process.env.DAILY_ARTICLE_CAP || 8)));
const FEEDS = [
  'https://news.google.com/rss/search?q=GTA+6+news+rumors+leaks+trailer+release+date+preorder+price+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=GTA+Online+Rockstar+update+event+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=Rockstar+Games+news+lawsuit+studio+hack+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=Take-Two+Interactive+news+lawsuit+game+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=site%3Areddit.com%2Fr%2FGTA+OR+site%3Agtaforums.com+Grand+Theft+Auto+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  // Public X posts are discovered through Google News RSS; this needs no X API credential.
  'https://news.google.com/rss/search?q=site%3Ax.com%2FGTA6Alerts+GTA+OR+Rockstar+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=site%3Ax.com%2FGTAVI_Countdown+GTA+OR+Rockstar+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=site%3Ax.com%2FGTABase+GTA+OR+Rockstar+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=site%3Ax.com%2FRockstarINTEL+GTA+OR+Rockstar+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=site%3Ax.com%2FRockstarGames+GTA+OR+Rockstar+when%3A21d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://flowgames.gg/feed/',
  'https://rockstarintel.com/feed/',
  'https://feeds.feedburner.com/ign/gta',
  'https://www.pcgamer.com/rss/',
  'https://www.gamespot.com/feeds/news/',
  'https://www.eurogamer.net/feed',
  'https://kotaku.com/rss',
  'https://www.videogameschronicle.com/feed/',
  'https://www.rockpapershotgun.com/feed'
];
const DATA_FILE = path.join(ROOT, 'blog', 'posts.json');
const HISTORY_FILE = path.join(ROOT, 'blog', 'history.json');
const MONITOR_STATE_FILE = path.join(ROOT, 'blog', 'monitor-state.json');
const YOUTUBE_METRICS_FILE = path.join(ROOT, 'blog', 'youtube-metrics.json');
const INSTAGRAM_METRICS_FILE = path.join(ROOT, 'blog', 'instagram-metrics.json');
const SEARCH_CONSOLE_FILE = path.join(ROOT, 'blog', 'search-console.json');
const CANDIDATE_FILE = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'macca-blog-candidate.json');
let successfulFeedReads = 0;
let performanceFeedback = {enabled:false, sampleCount:0, tags:{}};
let searchFeedback = {topicSignals:[]};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => (s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64).replace(/-+$/,'') || 'gta-story');
const strip = s => s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const usefulImage = value => { try { const u=new URL(value); return u.protocol==='https:' && !/(^|\.)(googleusercontent\.com|gstatic\.com|google\.com)$/i.test(u.hostname) && !/news\.google\.com$/i.test(u.hostname) ? u.href : ''; } catch { return ''; } };
const affiliateFallbacks = [
  {theme:'aliexpress',href:'https://rzekl.com/c/1e8d114494824bc5aa3116525dc3e8/',image:'/assets/creatives/visual-02.svg',kicker:'ONLINE SHOPPING',headline:'AliExpress',description:'Discover deals and everyday finds.'},
  {theme:'alibaba',href:'https://rzekl.com/c/pm1aev55cl824bc5aa31219aa26f6f/',image:'/assets/creatives/visual-01.svg',kicker:'GLOBAL MARKETPLACE',headline:'Alibaba.com',description:'Discover products and suppliers worldwide.'},
  {theme:'redmagic',href:'https://yyczo.com/c/qmttmvxh1u824bc5aa3156637026d8/',image:'/assets/creatives/visual-17.svg',kicker:'GAMING GEAR',headline:'REDMAGIC',description:'Gaming phones and gear built for play.'},
  {theme:'icases',href:'https://ypetp.com/c/wqd2fqy91h824bc5aa3158f5722f30/',image:'/assets/creatives/visual-10.svg',kicker:'PHONE CASES & ACCESSORIES',headline:'iCases',description:'Cases and accessories for your devices.'},
  {theme:'chicme',href:'https://rzekl.com/c/gf807z8tar824bc5aa31312b8f391a/',image:'/assets/creatives/visual-03.svg',kicker:'FASHION & STYLE',headline:'CHICME',description:'Discover new looks and styles.'},
  {theme:'hidemyname',href:'https://codeaven.com/c/d6ig17yj38824bc5aa31cfba9fca8a/',image:'/assets/creatives/visual-07.svg',kicker:'PRIVACY ONLINE',headline:'hidemy.name VPN',description:'Secure your connection with a VPN.'},
  {theme:'vagamo',href:'https://rthsu.com/c/0lyhuakd0e824bc5aa316ac117ee14/',image:'/assets/creatives/visual-27.svg',kicker:'FIND YOUR STYLE',headline:'Vagamo',description:'Discover the latest collection.'},
  {theme:'ticombo',href:'https://zmgig.com/c/hn23xca4o8824bc5aa31bcf92d8d7a/',image:'/assets/creatives/visual-23.svg',kicker:'GLOBAL EVENT TICKETS',headline:'Ticombo',description:'Find tickets for events around the world.'},
  {theme:'geekbuying',href:'https://bywiola.com/c/78tuvzaw8k824bc5aa310267b86f6e/',image:'/assets/creatives/visual-04.svg',kicker:'TECH & GADGETS',headline:'Geekbuying',description:'Explore gadgets and electronics.'},
  {theme:'notta',href:'https://ypetp.com/c/7gbdp8tygu824bc5aa31f50bb56640/',image:'/assets/creatives/visual-14.svg',kicker:'AI MEETING NOTES',headline:'Notta AI',description:'Turn conversations into searchable notes.'},
  {theme:'square',href:'https://rcpsj.com/c/xmbwxznk57824bc5aa31c1c4731730/',image:'/assets/creatives/visual-20.svg',kicker:'TOOLS FOR BUSINESS',headline:'Square',description:'Payment and point-of-sale tools for business.'},
  {theme:'repjegy',href:'https://zallj.com/c/o5xydq5rnp824bc5aa313fe229b7dc/',image:'/assets/creatives/visual-18.svg',kicker:'FLIGHT SEARCH',headline:'Repjegy.hu',description:'Find flights for your next trip.'},
  {theme:'italojewelry',href:'https://ad.admitad.com/c/l926tcw2sm824bc5aa3187e51e1a66/',image:'/assets/creatives/visual-11.svg',kicker:'JEWELRY COLLECTIONS',headline:'Italo Jewelry',description:'Explore rings, necklaces and more.'},
  {theme:'sunsky',href:'https://dorinebeaumont.com/c/7npkd4cs1i824bc5aa31869a299fda/',image:'/assets/creatives/visual-22.svg',kicker:'ONLINE WHOLESALE',headline:'SUNSKY',description:'Explore electronics and accessories.'},
  {theme:'samsonite',href:'https://xmknb.com/c/cj6zaw6m9p824bc5aa31a68f2598b9/',image:'/assets/creatives/visual-19.svg',kicker:'READY FOR THE JOURNEY',headline:'Samsonite',description:'Discover luggage for your next trip.'},
  {theme:'ttgo',href:'https://dkfrh.com/c/nz4081dh12824bc5aa31d0a9902774/',image:'/assets/creatives/visual-25.svg',kicker:'ELECTRIC BIKES',headline:'TTGO E-bike',description:'Explore electric bikes for city and trail.'},
  {theme:'govee',href:'https://rthsu.com/c/yzzx0gmxy0824bc5aa313791d3d079/',image:'/assets/creatives/visual-05.svg',kicker:'SMART LIGHTING',headline:'Govee',description:'Bring color and smart lighting home.'},
  {theme:'nubia',href:'https://ziejy.com/c/lh3bbik9ly824bc5aa31e62ca5e32f/',image:'/assets/creatives/visual-15.svg',kicker:'SMARTPHONES & TECH',headline:'Nubia',description:'Explore Nubia phones and technology.'},
  {theme:'travelking',href:'https://vxrlm.com/c/dquwu4q32h824bc5aa317eaf385c59/',image:'/assets/creatives/visual-24.svg',kicker:'TRAVEL GETAWAYS',headline:'Travelking',description:'Discover stays and trips in Poland and Hungary.'},
  {theme:'homestyler',href:'https://cafxq.com/c/swlngq9rrz824bc5aa3128a65238d7/',image:'/assets/creatives/visual-08.svg',kicker:'DESIGN YOUR SPACE',headline:'Homestyler',description:'Explore ideas for your next room design.'},
  {theme:'turbovpn',href:'https://grfpr.com/c/exe221unkp824bc5aa31ddf84d4c0b/',image:'/assets/creatives/visual-26.svg',kicker:'VPN CONNECTION',headline:'TurboVPN',description:'Explore VPN apps for your devices.'},
  {theme:'hyperhost',href:'https://rcpsj.com/c/4y24lnxl7f824bc5aa317f67b8171e/',image:'/assets/creatives/visual-09.svg',kicker:'WEB HOSTING',headline:'Hyper Host',description:'Hosting for websites and projects.'},
  {theme:'gshopper',href:'https://bywiola.com/c/nx2yncwth6824bc5aa31d497214fca/',image:'/assets/creatives/visual-06.svg',kicker:'GLOBAL SHOPPING',headline:'Gshopper',description:'Discover products from around the world.'},
  {theme:'stylewe',href:'https://codeaven.com/c/r9ybpohdxo824bc5aa31806f4427c0/',image:'/assets/creatives/visual-21.svg',kicker:'FASHION & STYLE',headline:'Stylewe',description:'Find new looks for your wardrobe.'},
  {theme:'noracora',href:'https://qwpeg.com/c/of8pqgktr2824bc5aa31c8dbeb8f0d/',image:'/assets/creatives/visual-13.svg',kicker:'NEW COLLECTION',headline:'Noracora',description:'Discover styles for everyday wear.'},
  {theme:'justfashionnow',href:'https://rzekl.com/c/kmcoj56juv824bc5aa31608cdf386b/',image:'/assets/creatives/visual-12.svg',kicker:'FASHION FINDS',headline:'Justfashionnow',description:'Explore new fashion and accessories.'}
];
const adMarkup = (slot='feed-unit') => {
  if(slot==='side-owner'||slot==='article-unit') return `<a class="sponsor-card" href="https://pklavc.com/blog" target="_blank" rel="sponsored noopener noreferrer"><span class="sponsor-copy"><span class="sponsor-kicker">MACCA BLOG PRESENTS</span><strong>THE PKLAVC BLOG</strong><span class="sponsor-description">Technology, engineering, open-source projects, and more. Read the blog.</span></span><span class="sponsor-art"><img src="/assets/creatives/visual-16.webp" alt="Macca partner artwork" loading="lazy"></span></a>`;
  const number=Number(slot.match(/(?:side-rotating|dock-item)-(\d+)/)?.[1]||1);
  const ad=affiliateFallbacks[(number-1)%affiliateFallbacks.length];
  return `<a class="sponsor-card sponsor-theme-${ad.theme}" href="${ad.href}" target="_blank" rel="sponsored noopener noreferrer"><span class="sponsor-copy"><span class="sponsor-kicker">${ad.kicker}</span><strong>${ad.headline}</strong><span class="sponsor-description">${ad.description}</span></span><span class="sponsor-art"><img src="${ad.image}" alt="" loading="lazy"></span></a>`;
};
const neutralizeAdMarkup = markup => String(markup)
  .replaceAll('sponsor-card','partner-card')
  .replaceAll('sponsor-copy','partner-copy')
  .replaceAll('sponsor-kicker','partner-kicker')
  .replaceAll('sponsor-description','partner-description')
  .replaceAll('sponsor-art','partner-art')
  .replaceAll('sponsor-theme-','partner-theme-');
const sidebarTopMarkup=()=>`<div class="content-unit" data-content-unit="side-owner" aria-label="PKLAVC advertisement">${adMarkup('side-owner')}</div><div class="content-unit" data-content-unit="side-rotating-1" aria-label="Advertisement">${adMarkup('side-rotating-1')}</div>`;
const sidebarBottomMarkup=()=>[2,3,4].map(n=>`<div class="content-unit" data-content-unit="side-rotating-${n}" aria-label="Advertisement">${adMarkup(`side-rotating-${n}`)}</div>`).join('');
const sidebarStickyMarkup=()=>`<div class="side-content-rail" aria-label="More sponsored offers"><div class="content-unit" data-content-unit="side-rotating-5" aria-label="Advertisement">${adMarkup('side-rotating-5')}</div><div class="content-unit" data-content-unit="side-rotating-6" aria-label="Advertisement">${adMarkup('side-rotating-6')}</div></div>`;
const stickyDockMarkup=()=>`<aside class="fixed-content-dock" aria-label="Sponsored offers"><div class="fixed-content-grid">${[1,2,3].map(n=>`<div class="content-unit fixed-content-item" data-content-unit="dock-item-${n}" aria-label="Advertisement">${adMarkup(`dock-item-${n}`)}</div>`).join('')}</div></aside>`;
const instagramMarkup = () => `<a class="footer-social" href="https://www.instagram.com/macca_the_gator_oficial/" target="_blank" rel="me noopener noreferrer" aria-label="Instagram: Macca the Gator Oficial"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="6" r="1.2" fill="currentColor"/></svg><span>Instagram</span></a>`;
const youtubeMarkup = () => `<a class="footer-social" href="https://www.youtube.com/@macca_the_gator_oficial" target="_blank" rel="me noopener noreferrer" aria-label="YouTube: Macca the Gator Oficial"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg><span>YouTube</span></a>`;
const socialLinksMarkup = () => `${instagramMarkup()}${youtubeMarkup()}`;
const footerMarkup = () => `<footer><div class="footer-about"><a href="/blog/">Macca Blog</a><span>Independent coverage, linked to its sources.</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/blog/">Home</a><a href="/gta-6/">GTA 6</a><a href="/rockstar-games/">Rockstar</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/editorial-policy/">Editorial Policy</a><a href="/corrections/">Corrections</a><a href="/privacy/">Privacy Policy</a><a href="/blog/feed.xml">RSS</a></nav><div class="footer-socials">${socialLinksMarkup()}</div><p class="footer-disclaimer">Macca Lab is an independent project and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p></footer>`;
const ADSENSE_SCRIPT = ''; // Keep ads.txt ready; load AdSense only after Google approves the site.

async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file,'utf8')); } catch { return fallback; } }
async function writeJson(file, data) { await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file, JSON.stringify(data,null,2)+'\n'); }

function searchIndexable(post) {
  const text=`${post?.title||''} ${post?.description||''} ${post?.category||''} ${(post?.tags||[]).join(' ')}`.toLowerCase();
  if(!/(gta|grand theft auto|rockstar|take[- ]two)/i.test(text)) return false;
  const sources=(post?.sources||[]).filter(source=>source&&source.url);
  if(!sources.length) return false;
  const redditOnly=sources.every(source=>/reddit(?:\.com)?/i.test(`${source.publisher||''} ${source.url||''}`));
  return !redditOnly;
}

function normalizeTags(values, title='', description='') {
  const text=`${title} ${description} ${(values||[]).join(' ')}`.toLowerCase();
  const tags=[];
  const add=value=>{ if(value&&!tags.some(existing=>existing.toLowerCase()===value.toLowerCase())) tags.push(value); };
  if(/gta\s*6|gta\s*vi|grand theft auto\s*(?:6|vi)/i.test(text)) add('GTA 6');
  if(/gta\s*online/i.test(text)) add('GTA Online');
  if(/rockstar/i.test(text)) add('Rockstar Games');
  if(/take[- ]two/i.test(text)) add('Take-Two Interactive');
  for(const raw of values||[]) {
    let value=String(raw||'').trim();
    if(!value||value.length>42) continue;
    if(/^(grand theft auto (?:6|vi)|gta vi)$/i.test(value)) value='GTA 6';
    if(/^take[- ]two$/i.test(value)) value='Take-Two Interactive';
    if(/^rockstar$/i.test(value)) value='Rockstar Games';
    add(value);
    if(tags.length>=8) break;
  }
  return tags.length?tags:['GTA'];
}

function normalizeCategory(value, title='', description='') {
  const text=`${value||''} ${title} ${description}`.toLowerCase();
  if(/gta\s*online/.test(text)) return 'GTA Online';
  if(/gta\s*6|gta\s*vi|grand theft auto\s*(?:6|vi)/.test(text)) return 'GTA 6';
  if(/rockstar|take[- ]two/.test(text)) return 'Rockstar Games';
  if(/history|retrospective/.test(text)) return 'Game History';
  return 'GTA News';
}

function latestSample(entry) {
  const values=[...(entry?.samples||[]),...(entry?.snapshots||[])];
  return values.sort((a,b)=>String(b.collectedAt||'').localeCompare(String(a.collectedAt||'')))[0]||null;
}

function performanceScoreFromYoutube(sample) {
  const m=sample?.metrics||{};
  const views=Math.max(0,Number(m.views)||0);
  const engaged=Math.max(0,Number(m.engagedViews)||0);
  const avg=Math.max(0,Number(m.averageViewPercentage)||0);
  if(!views || avg>300 || (sample?.qualityFlags||[]).includes('exclude_from_automatic_learning')) return null;
  const engagedRate=Math.min(1,engaged/views);
  const retention=Math.min(1,avg/120);
  const interaction=Math.min(1,((Number(m.likes)||0)+(Number(m.comments)||0)+(Number(m.shares)||0))/views*20);
  const distribution=Math.min(1,Math.log10(views+1)/3);
  return 0.42*engagedRate+0.36*retention+0.12*interaction+0.10*distribution;
}

function performanceScoreFromInstagram(sample) {
  const m=sample?.metrics||{};
  const views=Math.max(0,Number(m.views)||0);
  const reach=Math.max(0,Number(m.reach)||0);
  if(!views && !reach) return null;
  const denominator=Math.max(views,reach,1);
  const interactions=Math.max(0,Number(m.total_interactions)||((Number(m.likes)||0)+(Number(m.comments)||0)+(Number(m.saved)||0)+(Number(m.shares)||0)));
  const interactionRate=Math.min(1,interactions/denominator*12);
  const reachScore=Math.min(1,Math.log10(reach+1)/3);
  const viewScore=Math.min(1,Math.log10(views+1)/3);
  return 0.55*interactionRate+0.25*reachScore+0.20*viewScore;
}

async function refreshPerformanceFeedback(posts) {
  const bySlug=new Map(posts.map(post=>[post.slug,post]));
  const youtube=await readJson(YOUTUBE_METRICS_FILE,{videos:{}});
  const instagram=await readJson(INSTAGRAM_METRICS_FILE,{media:{}});
  searchFeedback=await readJson(SEARCH_CONSOLE_FILE,{topicSignals:[]});
  const observations=[];

  for(const entry of Object.values(youtube.videos||{})) {
    const score=performanceScoreFromYoutube(latestSample(entry));
    const post=bySlug.get(entry?.slug);
    if(score!=null&&post) observations.push({post,score,platform:'youtube'});
  }
  for(const entry of Object.values(instagram.media||{})) {
    const slug=String(entry?.articleUrl||'').split('/').filter(Boolean).pop()||'';
    const score=performanceScoreFromInstagram(latestSample(entry));
    const post=bySlug.get(slug);
    if(score!=null&&post) observations.push({post,score,platform:'instagram'});
  }

  // Avoid teaching the generator from tiny samples. Until at least 20 usable
  // social observations exist, the historical-performance bonus remains zero.
  if(observations.length<20) {
    performanceFeedback={enabled:false,sampleCount:observations.length,tags:{}};
    return;
  }

  const globalMean=observations.reduce((sum,item)=>sum+item.score,0)/observations.length;
  const buckets=new Map();
  for(const observation of observations) {
    const labels=[observation.post.category,...(observation.post.tags||[])].map(value=>String(value||'').toLowerCase().trim()).filter(value=>value.length>=3);
    for(const label of new Set(labels)) {
      const bucket=buckets.get(label)||[];
      bucket.push(observation.score);
      buckets.set(label,bucket);
    }
  }
  const tags={};
  for(const [label,scores] of buckets) {
    if(scores.length<3) continue;
    const mean=scores.reduce((sum,value)=>sum+value,0)/scores.length;
    tags[label]=Math.max(-1.5,Math.min(1.5,(mean-globalMean)*4));
  }
  performanceFeedback={enabled:true,sampleCount:observations.length,tags};
}

function historicalPerformanceBonus(item) {
  if(!performanceFeedback.enabled) return 0;
  const text=`${item.title||''} ${item.description||''}`.toLowerCase();
  let bonus=0;
  for(const [label,value] of Object.entries(performanceFeedback.tags)) {
    if(label.length>=4&&text.includes(label)) bonus+=value;
  }
  return Math.max(-2.5,Math.min(2.5,bonus));
}

async function readFeed(url) {
  try {
    const res=await fetch(url,{headers:{'user-agent':'GTA-Blog-Research/1.0'},signal:AbortSignal.timeout(12000)});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    successfulFeedReads++;
    const xml=await res.text(), items=[];
    for(const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
      const block=m[0];
      const get=tag=>strip(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,'' )||'');
      const title=get('title');
      const link=get('link') || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || '';
      const description=get('description') || get('summary') || get('content');
      const date=get('pubDate') || get('published') || get('updated');
      const publisher=strip(block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,'')||'') || new URL(url).hostname;
      if(title && /^https?:/.test(link)) items.push({title:title.replace(/\s+-\s+[^-]+$/,''),link,description,date,source:publisher});
    }
    return items;
  } catch(e) { console.warn(`Research source unavailable: ${url}: ${e.message}`); return []; }
}

async function research({days=BACKFILL?21:7}={}) {
  const items=[];
  // Fetch in small batches so hourly monitoring stays quick without flooding sources.
  for(let i=0;i<FEEDS.length;i+=5) items.push(...(await Promise.all(FEEDS.slice(i,i+5).map(readFeed))).flat());
  const cutoff=Date.now()-1000*60*60*24*days;
  return items.filter(x=>{
    const topical=/grand theft auto|\bgta(?:\s*6)?\b|rockstar|take[- ]two/i.test(`${x.title} ${x.description}`);
    const fresh=!x.date || (Date.parse(x.date)>=cutoff && Date.parse(x.date)<=Date.now()+86400000);
    const communityOnly=/^(reddit(?:\.com)?|x\.com|twitter)$/i.test(String(x.source||'').trim());
    return topical && fresh && !communityOnly;
  });
}

async function fetchArticle(item) {
  try {
    const response=await fetch(item.link,{headers:{'user-agent':'Mozilla/5.0 (compatible; MaccaBlogResearch/1.0)'},redirect:'follow',signal:AbortSignal.timeout(15000)});
    if(!response.ok) return item;
    const html=await response.text();
    const meta=(name)=>html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))?.[1] || '';
    const title=strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'') || item.title;
    const description=strip(meta('og:description')||meta('description')||item.description);
    const rawImage=meta('og:image')||meta('og:image:url')||meta('twitter:image')||meta('twitter:image:src');
    let imageUrl='';
    imageUrl=rawImage?usefulImage(new URL(rawImage,response.url).href):'';
    const paragraphs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])).filter(t=>t.length>80).slice(0,9);
    return {...item,title,description,imageUrl,excerpt:paragraphs.join('\n\n').slice(0,6500),publisher:item.source||new URL(response.url).hostname,canonical:response.url};
  } catch(e) { console.warn(`Could not fetch article body for ${item.link}: ${e.message}`); return item; }
}

async function ask(prompt) {
  const errors=[];
  const attempts=[];
  if(process.env.GEMINI_API_KEY) attempts.push(['Gemini',async(p)=>{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:p}]}],generationConfig:{responseMimeType:'application/json',temperature:0.4}})});
    if(!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text;
  }]);
  if(process.env.OPENROUTER_API_KEY) attempts.push(['OpenRouter Free',async(p)=>{
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'content-type':'application/json','HTTP-Referer':BASE,'X-Title':'Macca Blog'},body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content:p}],response_format:{type:'json_object'}})});
    if(!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()).choices?.[0]?.message?.content;
  }]);
  if(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) attempts.push(['Cloudflare Workers AI',async(p)=>{
    const url=`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
    const r=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:p}]})});
    if(!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()).result?.response;
  }]);
  if(!attempts.length) throw new Error('No AI provider credentials configured.');
  for(const [name,call] of attempts) {
    for(let retry=0;retry<2;retry++) try { const out=await call(retry?`${prompt}\n\nFORMAT REMINDER: Return exactly one valid JSON object. Do not write prose or markdown outside it.`:prompt); if(out){parseModel(out);console.log(`Article generated with ${name}${retry?' after format retry':''}`);return out;} throw new Error('Empty response'); } catch(e) { errors.push(`${name}${retry?' retry':''}: ${e.message}`); if(retry===0)console.warn(`${name} returned invalid output; retrying with a strict JSON reminder.`); }
    console.warn(`${name} failed; trying next provider.`);
  }
  throw new Error(`All AI providers failed: ${errors.join('; ')}`);
}

function parseModel(text) {
  const raw=String(text).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  if(/^"?skip"?$/i.test(raw.trim())) return {skip:true,reason:'provider judged the available reporting too thin'};
  const a=raw.indexOf('{'), b=raw.lastIndexOf('}');
  if(a<0||b<a) throw new Error(`Model did not return JSON: ${raw.slice(0,160).replace(/\s+/g,' ')}`);
  return JSON.parse(raw.slice(a,b+1));
}

function articleHtml(p, all, videoRecord=null) {
  const url=`${BASE}/blog/${p.slug}/`;
  const seoTitle=String(p.seoTitle||p.title||'Macca Blog').trim();
  const seoDescription=String(p.seoDescription||p.description||'').trim();
  const imagePath=String(p.discoverImage||p.socialImage||'').startsWith('/') ? String(p.discoverImage||p.socialImage) : '/images/macca-blog-banner.webp';
  const socialImage=String(p.socialImage||'').startsWith('/')
    ? new URL(p.socialImage,`${BASE}/`).href
    : /^https:\/\//i.test(String(p.socialImage||'')) ? String(p.socialImage)
    : /^https:\/\//i.test(String(p.thumbnail||'')) ? String(p.thumbnail)
    : `${BASE}/images/macca-blog-banner.jpg`;
  const discoverImage=String(p.discoverImage||'').startsWith('/') ? new URL(p.discoverImage,`${BASE}/`).href : socialImage;
  const articleType=/history/i.test(String(p.category||'')) ? 'BlogPosting' : 'NewsArticle';
  const adFallback=slot=>neutralizeAdMarkup(adMarkup(slot));
  const related=all.filter(x=>x.slug!==p.slug && (x.category===p.category || (Array.isArray(x.tags) && Array.isArray(p.tags) && x.tags.some(t=>p.tags.includes(t))))).slice(0,4);
  const latest=all.filter(x=>x.slug!==p.slug).slice(0,5);
  const position=all.findIndex(x=>x.slug===p.slug);
  const next=position>=0 && position<all.length-1 ? all[position+1] : null;
  const wordCount=(p.sections||[]).flatMap(section=>section.paragraphs||[]).join(' ').split(/\s+/).filter(Boolean).length;
  const inlineAdCount=wordCount<300?1:wordCount<800?2:3;
  const sectionMarkup=(p.sections||[]).map(s=>`<section><h2>${esc(s.heading)}</h2>${(s.paragraphs||[]).map(x=>`<p>${esc(x)}</p>`).join('')}</section>`);
  const body=sectionMarkup.map((markup,index)=>{
    if(index<sectionMarkup.length-1 && index<inlineAdCount-1) return `${markup}<div class="content-panel" data-content-slot="story-inline-${index+2}" aria-label="Partner content">${adFallback('article-unit')}</div>`;
    return markup;
  }).join('');
  const inlineImages=(p.inlineImages||[]).filter(x=>/^https:\/\//i.test(x.url||'')).map(x=>`<figure class="source-image"><a href="${esc(x.sourceUrl||p.sourceUrl||'#')}" target="_blank" rel="noopener noreferrer"><img src="${esc(x.url)}" alt="${esc(x.alt||'Image accompanying the source report')}" loading="lazy" referrerpolicy="no-referrer"></a>${x.caption?`<figcaption>${esc(x.caption)}</figcaption>`:''}</figure>`).join('');
  const relatedImage=x=>{
    const thumbnail=String(x.thumbnail||'').replace(/&amp;/g,'&').trim();
    if(/^https?:\/\//i.test(thumbnail)||thumbnail.startsWith('/')) return thumbnail;
    return '/images/macca-blog-banner.webp';
  };
  const cards=(items)=>items.length?items.map(x=>`<a class="post-card" href="/blog/${encodeURIComponent(x.slug)}/"><small>${esc(x.category)} · ${esc(x.date)}</small><strong>${esc(x.title)}</strong><span>${esc(x.description)}</span></a>`).join(''):'<p>More stories coming soon.</p>';
  const relatedCards=related.slice(0,3).map(x=>`<a class="related-feature" href="/blog/${encodeURIComponent(x.slug)}/"><img src="${esc(relatedImage(x))}" alt="${esc(x.thumbnailAlt||x.title)}" width="1280" height="720" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/images/macca-blog-banner.webp'"><span><small>${esc(x.category)} · ${esc(x.date)}</small><strong>${esc(x.title)}</strong></span></a>`).join('');
  const nextStory=next?`<aside class="next-story-peek" data-next-story-peek aria-label="Next story"><button type="button" class="next-story-close" aria-label="Dismiss next story suggestion">×</button><span>Next story</span><a href="/blog/${encodeURIComponent(next.slug)}/">${esc(next.title)}</a></aside>`:'';
  const continuousFeed=next?`<section class="continuous-feed" id="continuous-feed" aria-label="Continue reading"><div class="continuous-feed-heading"><span>KEEP READING</span><strong>More from Macca Blog</strong></div><div data-continuous-items></div><div class="continuous-sentinel" data-continuous-sentinel><span>Scroll for the next story</span></div></section>`:'';
  const hubs=relatedHubs(p);
  const topicLinks=hubs.length?`<aside class="article-topic-links"><strong>Explore this topic</strong><nav>${hubs.map(hub=>`<a href="/${hub.slug}/">${esc(hub.title)}</a>`).join('')}</nav></aside>`:'';
  const videoId=String(videoRecord?.youtubeVideoId||'').trim();
  const videoCard=videoId?`<section class="article-video-card" data-youtube-video="${esc(videoId)}"><button type="button"><strong>Watch the short version</strong><span>Load this story on YouTube</span></button></section>`:'';
  const videoSchema=videoId?{"@type":"VideoObject","name":p.youtubeTitle||p.title,"description":p.description,"thumbnailUrl":[socialImage],"uploadDate":videoRecord.publishedAt||p.updatedAt||p.date,"embedUrl":`https://www.youtube.com/embed/${videoId}`,"contentUrl":videoRecord.youtubeUrl||`https://www.youtube.com/watch?v=${videoId}`}:null;
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":articleType,headline:p.title,description:p.description,datePublished:p.date,dateModified:p.updatedAt||p.date,mainEntityOfPage:{"@type":"WebPage","@id":url},image:[discoverImage,socialImage],articleSection:p.category||"GTA & Rockstar",keywords:(p.tags||[]).join(", "),wordCount,isAccessibleForFree:true,author:{"@type":"Organization","name":"Macca Blog Editorial","url":`${BASE}/about/`},publisher:{"@type":"Organization","name":"Macca Blog","url":`${BASE}/blog/`,"logo":{"@type":"ImageObject","url":`${BASE}/images/favicon-512x512.png`,"width":512,"height":512},"publishingPrinciples":`${BASE}/editorial-policy/`}},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Macca Blog","item":`${BASE}/blog/`},
      {"@type":"ListItem","position":2,"name":p.title,"item":url}
    ]},
    ...(videoSchema?[videoSchema]:[])
  ]};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(seoTitle)} | Macca Blog</title><meta name="description" content="${esc(seoDescription)}"><meta name="robots" content="${searchIndexable(p)?'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1':'noindex, follow'}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:image" content="${esc(socialImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(p.thumbnailAlt||p.title)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="Macca Blog"><meta property="og:locale" content="en_US"><meta property="article:published_time" content="${esc(p.date)}"><meta property="article:modified_time" content="${esc(p.updatedAt||p.date)}"><meta property="article:section" content="${esc(p.category||'GTA & Rockstar')}">${(p.tags||[]).slice(0,8).map(tag=>`<meta property="article:tag" content="${esc(tag)}">`).join('')}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${esc(socialImage)}"><meta name="twitter:image:alt" content="${esc(p.thumbnailAlt||p.title)}"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="alternate" type="application/rss+xml" title="Macca Blog RSS" href="${BASE}/blog/feed.xml"><link rel="preload" as="image" href="${esc(imagePath)}" fetchpriority="high"><link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><script defer src="/blog/assets/engagement.js"></script><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="/assets/ui-runtime.css"><script defer src="/assets/ui-runtime.js"></script><link rel="stylesheet" href="/skylet/widget.css?v=20260929.1"><script defer src="/analytics/web-analytics.js"></script></head><body class="has-fixed-content-dock" data-macca-current-slug="${esc(p.slug)}" data-content-context="${esc([p.category,...(p.tags||[])].join(' '))}"><header class="top"><a class="brand" href="/blog/">MACCA <b>BLOG</b></a><nav aria-label="Main navigation"><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a></nav></header><main class="layout"><article><a class="back" href="/blog/">← All stories</a><figure class="article-hero"><img src="${esc(imagePath)}" alt="${esc(p.imageAlt||'Macca the Gator at sunset in Vice City')}" width="1280" height="720" fetchpriority="high" decoding="async" onerror="this.onerror=null;this.src='/images/macca-blog-banner.jpg'"><figcaption class="hero-copy"><p class="eyebrow">${esc(p.category)} · <time datetime="${esc(p.date)}">${esc(p.date)}</time>${p.updatedAt?` · Updated <time datetime="${esc(p.updatedAt)}">${esc(String(p.updatedAt).slice(0,10))}</time>`:''}</p><h1>${esc(p.title)}</h1><p class="hero-dek">${esc(p.description)}</p><p class="article-byline">By <a href="/about/">Macca Blog Editorial</a> · <a href="/editorial-policy/">Editorial standards</a></p><div class="article-share"><button type="button" data-share-story>Share story</button><button type="button" data-copy-story>Copy link</button></div></figcaption></figure><div class="article-body">${body}${inlineImages}<h2>Sources and notes</h2><p>Claims, reports, leaks and rumors are attributed to their original sources. Unconfirmed information is labeled clearly and should not be read as established fact.</p><ul>${(p.sources||[]).map(s=>`<li><a rel="noopener noreferrer" href="${esc(s.url)}">${esc(s.title)}</a> <span>(${esc(s.publisher||new URL(s.url).hostname)})</span></li>`).join('')}</ul></div>${topicLinks}${videoCard}<div class="content-panel" data-content-slot="story-end" aria-label="Partner content">${adFallback('article-unit')}</div><section class="article-related" aria-labelledby="related-stories-title"><div class="section-heading"><span>DISCOVER MORE</span><h2 id="related-stories-title">Related stories</h2></div><div class="related-feature-grid">${relatedCards||'<p class="related-empty">More related coverage is coming soon.</p>'}</div></section>${continuousFeed}</article><aside><section class="side-section"><h2>Latest posts</h2><div class="post-list">${cards(latest)}</div></section><div class="side-content-rail" aria-label="Partner offer"><div class="content-panel" data-content-slot="story-side" aria-label="Partner content">${adFallback('side-rotating-1')}</div></div><section class="side-section"><h2>Related stories</h2><div class="post-list">${cards(related)}</div></section></aside></main>${nextStory}${footerMarkup()}<script>document.addEventListener('click',async function(e){const video=e.target.closest('.article-video-card button');if(video){const box=video.closest('[data-youtube-video]');const id=box?.dataset.youtubeVideo;if(!id)return;const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1';f.title='Macca YouTube video';f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';f.allowFullscreen=true;box.replaceChildren(f);return;}const share=e.target.closest('[data-share-story]');if(share){if(navigator.share){try{await navigator.share({title:document.title.replace(/ \| Macca Blog$/,''),url:location.href});}catch{}}else{try{await navigator.clipboard.writeText(location.href);share.textContent='Link copied';setTimeout(()=>share.textContent='Share story',1800);}catch{}}return;}const copy=e.target.closest('[data-copy-story]');if(copy){try{await navigator.clipboard.writeText(location.href);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy link',1800);}catch{}}});</script><script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
}

async function build() {
  const posts=(await readJson(DATA_FILE,[])).sort((a,b)=>String(b.updatedAt||b.date||'').localeCompare(String(a.updatedAt||a.date||'')));
  await refreshPerformanceFeedback(posts);
  const youtubePublished=await readJson(path.join(ROOT,'blog','youtube-published.json'),[]);
  const youtubeBySlug=new Map((Array.isArray(youtubePublished)?youtubePublished:[]).map(item=>[item.slug,item]));
  for(const p of posts) {
    p.image='/images/macca-blog-banner.jpg'; p.imageAlt='Macca the Gator at sunset in Vice City';
    const inlineImages=Array.isArray(p.inlineImages)?p.inlineImages:[];
    const thumbnail=String(p.thumbnail||'').replace(/&amp;/g,'&');
    if(/^https:\/\//i.test(thumbnail)&&!inlineImages.some(x=>x.url===thumbnail)) {
      inlineImages.unshift({url:thumbnail,alt:p.thumbnailAlt||p.title,caption:'Image accompanying the source report',sourceUrl:p.sourceUrl||p.sources?.[0]?.url||'#'});
      p.inlineImages=inlineImages;
    }
    await fs.mkdir(path.join(ROOT,'blog',p.slug),{recursive:true}); await fs.writeFile(path.join(ROOT,'blog',p.slug,'index.html'),articleHtml(p,posts,youtubeBySlug.get(p.slug)));
  }
  await writeJson(DATA_FILE,posts);
  const card=p=>`<a class="feature" href="/blog/${encodeURIComponent(p.slug)}/"><span class="feature-cover"><img src="${esc(p.discoverImage||p.socialImage||p.thumbnail||'/images/macca-blog-banner.webp')}" alt="${esc(p.thumbnailAlt||p.title)}" width="1280" height="720" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/images/macca-blog-banner.webp'"><span class="cover-label">MACCA BLOG | ${esc(p.category)}</span></span><small>${esc(p.category)} | ${esc(p.date)}</small><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p></a>`;
  const cats=[...new Set(posts.map(p=>p.category))].sort();
  const homeTopicLinks=HUBS.filter(hub=>['gta-6','gta-6/release-date','gta-6/map','gta-6/characters','gta-online','rockstar-games'].includes(hub.slug)).map(hub=>`<a href="/${hub.slug}/">${esc(hub.title)}</a>`).join('');
  const trending=[...posts].sort((a,b)=>topicScore(b)-topicScore(a)||b.date.localeCompare(a.date)).slice(0,4);
  const BLOG_PAGE_SIZE=24;
  const latestPagePosts=posts.slice(0,BLOG_PAGE_SIZE);
  const totalArchivePages=Math.max(1,Math.ceil(posts.length/BLOG_PAGE_SIZE));
  const olderStoriesLink=totalArchivePages>1?'<nav class="archive-pagination" aria-label="Blog archive"><a href="/blog/page/2/">Older stories →</a></nav>':'';
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Macca Blog | GTA 6 & Rockstar News, Updates and Analysis</title><meta name="description" content="Source-backed GTA 6, GTA Online and Rockstar Games news, updates and analysis, with rumors and unconfirmed claims clearly labeled."><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${BASE}/blog/"><meta property="og:type" content="website"><meta property="og:site_name" content="Macca Blog"><meta property="og:title" content="Macca Blog | GTA 6 & Rockstar News, Updates and Analysis"><meta property="og:description" content="Source-backed GTA 6, GTA Online and Rockstar Games news, updates and analysis."><meta property="og:url" content="${BASE}/blog/"><meta property="og:image" content="${BASE}/images/macca-blog-banner.jpg"><meta property="og:locale" content="en_US"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Macca Blog"><meta name="twitter:description" content="Sourced reporting and analysis from across the GTA community."><meta name="twitter:image" content="${BASE}/images/macca-blog-banner.jpg"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="alternate" type="application/rss+xml" title="Macca Blog RSS" href="${BASE}/blog/feed.xml"><link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Blog','name':'Macca Blog','url':`${BASE}/blog/`})}</script><link rel="stylesheet" href="/assets/site-components.css"><script defer src="/assets/site-components.js"></script><link rel="stylesheet" href="/skylet/widget.css?v=20260929.1"><script defer src="/analytics/web-analytics.js"></script></head><body class="has-fixed-content-dock" data-content-context="GTA GTA 6 Rockstar Games gaming"><header class="top"><a class="brand" href="/blog/">MACCA <b>BLOG</b></a><nav aria-label="Main navigation"><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a></nav></header><main class="home"><section class="intro"><p class="eyebrow">GRAND THEFT AUTO, REPORTED</p><h1>GTA 6 & Rockstar news, sourced and explained.</h1><p>News, reporting, updates and analysis from across Grand Theft Auto and Rockstar Games. Every story links back to its sources.</p><nav class="categories" aria-label="Core coverage topics">${homeTopicLinks}</nav></section><div class="content-unit" data-content-unit="feed-unit" aria-label="Advertisement">${adMarkup()}</div><section class="trending-section" aria-labelledby="trending-title"><div class="section-heading"><span>WHAT'S MOVING</span><h2 id="trending-title">Trending coverage</h2></div><div class="trending-grid">${trending.map(card).join('')}</div></section><section><h2>Latest stories</h2><div class="grid">${latestPagePosts.length?latestPagePosts.map(card).join(''):'<p>No stories published yet.</p>'}</div>${olderStoriesLink}</section><section><h2>Featured</h2><div class="grid">${posts.filter(p=>p.featured).map(card).join('')||posts.slice(0,2).map(card).join('')}</div></section></main>${stickyDockMarkup()}${footerMarkup()}<script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
  await fs.writeFile(path.join(ROOT,'blog','index.html'),html);
  const archiveRoot=path.join(ROOT,'blog','page');
  await fs.mkdir(archiveRoot,{recursive:true});
  for(let page=2;page<=totalArchivePages;page++){
    const start=(page-1)*BLOG_PAGE_SIZE;
    const pagePosts=posts.slice(start,start+BLOG_PAGE_SIZE);
    const prev=page===2?'/blog/':`/blog/page/${page-1}/`;
    const next=page<totalArchivePages?`/blog/page/${page+1}/`:'';
    const archiveUrl=`${BASE}/blog/page/${page}/`;
    const archiveHtml=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Macca Blog Archive — Page ${page}</title><meta name="description" content="Older source-backed GTA and Rockstar stories from Macca Blog."><meta name="robots" content="noindex, follow"><link rel="canonical" href="${archiveUrl}"><link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><link rel="stylesheet" href="/assets/site-components.css"><script defer src="/assets/site-components.js"></script><script defer src="/analytics/web-analytics.js"></script></head><body data-content-context="GTA Rockstar archive"><header class="top"><a class="brand" href="/blog/">MACCA <b>BLOG</b></a><nav><a href="/blog/">Latest</a><a href="/gta-6/">GTA 6</a><a href="/rockstar-games/">Rockstar</a><a href="/visitors/">Visitors</a></nav></header><main class="home"><section class="intro"><p class="eyebrow">ARCHIVE</p><h1>Older stories</h1><p>Page ${page} of ${totalArchivePages}. Browse earlier Macca Blog coverage without loading the entire archive at once.</p></section><section><div class="grid">${pagePosts.map(card).join('')}</div><nav class="archive-pagination" aria-label="Blog archive pagination"><a href="${prev}">← Newer stories</a>${next?`<a href="${next}">Older stories →</a>`:''}</nav></section></main>${footerMarkup()}<script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
    const pageDir=path.join(archiveRoot,String(page));
    await fs.mkdir(pageDir,{recursive:true});
    await fs.writeFile(path.join(pageDir,'index.html'),archiveHtml);
  }
  try{
    for(const entry of await fs.readdir(archiveRoot,{withFileTypes:true})){
      if(!entry.isDirectory()||!/^\d+$/.test(entry.name)) continue;
      if(Number(entry.name)>totalArchivePages) await fs.rm(path.join(archiveRoot,entry.name),{recursive:true,force:true});
    }
  }catch{}
  const indexablePosts=posts.filter(searchIndexable);
  const urls=indexablePosts.map(p=>{
    const image=String(p.discoverImage||p.socialImage||'').trim();
    const imageXml=image?`<image:image><image:loc>${esc(new URL(image,`${BASE}/`).href)}</image:loc><image:title>${esc(p.title)}</image:title></image:image>`:'';
    return `  <url><loc>${BASE}/blog/${esc(p.slug)}/</loc><lastmod>${esc(String(p.updatedAt||p.date).slice(0,10))}</lastmod>${imageXml}</url>`;
  }).join('\n');
  await fs.writeFile(path.join(ROOT,'blog','sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  <url><loc>${BASE}/blog/</loc>${posts[0]?.updatedAt||posts[0]?.date?`<lastmod>${esc(String(posts[0].updatedAt||posts[0].date).slice(0,10))}</lastmod>`:''}</url>\n${urls}\n</urlset>\n`);
  const newsCutoff=Date.now()-48*60*60*1000;
  const newsItems=indexablePosts.filter(p=>{
    const timestamp=Date.parse(`${p.date}T23:59:59Z`);
    return Number.isFinite(timestamp)&&timestamp>=newsCutoff;
  }).slice(0,1000).map(p=>`  <url><loc>${BASE}/blog/${esc(p.slug)}/</loc><news:news><news:publication><news:name>Macca Blog</news:name><news:language>en</news:language></news:publication><news:publication_date>${esc(p.date)}</news:publication_date><news:title>${esc(p.title)}</news:title></news:news></url>`).join('\n');
  await fs.writeFile(path.join(ROOT,'blog','news-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${newsItems}\n</urlset>\n`);
  const items=posts.slice(0,30).map(p=>`<item><title>${esc(p.title)}</title><link>${BASE}/blog/${esc(p.slug)}/</link><guid isPermaLink="true">${BASE}/blog/${esc(p.slug)}/</guid><pubDate>${new Date(p.updatedAt||p.date+'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n');
  await fs.writeFile(path.join(ROOT,'blog','feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Macca Blog</title><link>${BASE}/blog/</link><description>Independent Grand Theft Auto coverage</description>${items}</channel></rss>\n`);
  const rootMap=path.join(ROOT,'sitemap.xml');
  let rootXml;
  try { rootXml=await fs.readFile(rootMap,'utf8'); } catch { rootXml=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</sitemapindex>\n`; }
  if(/<urlset\b/i.test(rootXml)) rootXml=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${BASE}/blog/sitemap.xml</loc></sitemap>\n</sitemapindex>\n`;
  else {
    const entries=[...rootXml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<\/sitemap>/gi)].map(m=>m[1]).filter(loc=>loc.startsWith(BASE+'/') && !loc.endsWith('/blog/sitemap.xml'));
    const locs=[...new Set([...entries,`${BASE}/blog/sitemap.xml`,`${BASE}/blog/news-sitemap.xml`,`${BASE}/growth-sitemap.xml`])];
    rootXml=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map(loc=>`  <sitemap><loc>${esc(loc)}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  }
  await fs.writeFile(rootMap,rootXml);
  await buildGrowthPages({root:ROOT,base:BASE,posts});
}

function sourceLinks(posts,history) {
  return new Set([...posts.map(p=>p.sourceUrl),...history.flatMap(h=>[h.sourceUrl,...(h.sourceUrls||[])])].filter(Boolean));
}

const UPDATE_SIGNAL = /\b(confirm(?:ed|s)?|official|announce(?:d|ment)?|delay(?:ed)?|release date|launch date|pre-?order|trailer|den(?:y|ies|ied)|court|lawsuit|arrest(?:ed)?|charged|settle(?:d|ment)?|new details?|reveals?|response|responds?|changes?|update)\b/i;

function findUpdateTarget(item,posts) {
  const text=`${item?.title||''} ${item?.description||''}`;
  if(!UPDATE_SIGNAL.test(text)) return null;
  let best=null;
  for(const post of posts.slice(0,80)) {
    if(post.contentType==='analysis') continue;
    const score=similarity(post.title,item.title);
    if(score<0.36) continue;
    if(!best||score>best.score) best={post,score};
  }
  return best?.post||null;
}

function isNovel(item,posts,history,used=sourceLinks(posts,history)) {
  if(used.has(item.link)) return false;
  const duplicate=posts.some(p=>similarity(p.title,item.title)>0.36);
  return !duplicate || Boolean(findUpdateTarget(item,posts));
}

async function monitor() {
  successfulFeedReads=0;
  const candidates=await research({days:2});
  if(!successfulFeedReads) throw new Error('All research feeds failed; monitor cannot confirm whether there is new coverage.');
  const posts=await readJson(DATA_FILE,[]), history=await readJson(HISTORY_FILE,[]);
  await refreshPerformanceFeedback(posts);
  const state=await readJson(MONITOR_STATE_FILE,{cooldowns:{}}), cooldowns=state.cooldowns||{};
  const now=Date.now(), retryAfter=6*60*60*1000;
  const fresh=candidates.filter(item=>{
    if(!isNovel(item,posts,history)) return false;
    const last=Date.parse(typeof cooldowns[item.link]==='string'?cooldowns[item.link]:cooldowns[item.link]?.attemptedAt||'');
    return !Number.isFinite(last)||now-last>=retryAfter;
  }).sort((a,b)=>topicScore(b)-topicScore(a));
  const candidate=fresh[0]||null;
  const updateTarget=candidate?findUpdateTarget(candidate,posts):null;
  await fs.mkdir(path.dirname(CANDIDATE_FILE),{recursive:true});
  await writeJson(CANDIDATE_FILE,{candidate,updateTargetSlug:updateTarget?.slug||'',detectedAt:new Date().toISOString()});
  if(process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,`should_generate=${candidate?'true':'false'}\n`);
  console.log(candidate?`Found novel GTA/Rockstar item: ${candidate.title} (${candidate.source})`:`No new GTA/Rockstar item in the last 48 hours; no AI call needed.`);
}

async function recordMonitorFailure() {
  const saved=await readJson(CANDIDATE_FILE,null), candidate=saved?.candidate;
  if(!candidate?.link) throw new Error('No monitored candidate was saved for retry cooldown.');
  const state=await readJson(MONITOR_STATE_FILE,{cooldowns:{}}), cooldowns=state.cooldowns||{};
  const cutoff=Date.now()-30*24*60*60*1000;
  for(const [link,value] of Object.entries(cooldowns)) {
    const attemptedAt=Date.parse(typeof value==='string'?value:value?.attemptedAt||'');
    if(!Number.isFinite(attemptedAt)||attemptedAt<cutoff) delete cooldowns[link];
  }
  cooldowns[candidate.link]={attemptedAt:new Date().toISOString(),title:candidate.title};
  await writeJson(MONITOR_STATE_FILE,{cooldowns});
  console.log(`Stored a six-hour AI retry cooldown for ${candidate.title}.`);
}

async function queueSocialPublication(p,{update=false}={}) {
  const revision=String(p.updatedAt||new Date().toISOString()).replace(/[^0-9]/g,'').slice(0,12);
  const publicationKey=update?`${p.slug}-update-${revision}`:p.slug;
  const score=socialScore(p)+(update?8:0);
  const minimum=Math.max(0,Math.min(100,Number(process.env.SOCIAL_MIN_SCORE||50)));
  if(score<minimum) {
    console.log(`Skipping social video queue for ${p.slug}: score ${score}/100 is below the ${minimum} threshold.`);
    return;
  }
  if(process.env.INSTAGRAM_QUEUE_FILE) {
    const queue=await readJson(process.env.INSTAGRAM_QUEUE_FILE,[]);
    if(!queue.some(item=>(item.publicationKey||item.slug)===publicationKey)) {
      queue.push({slug:p.slug,publicationKey,forceRepublish:update,socialScore:score,queuedAt:new Date().toISOString()});
      await writeJson(process.env.INSTAGRAM_QUEUE_FILE,queue);
    }
  }
  if(process.env.YOUTUBE_QUEUE_FILE) {
    try {
      const queue=await readJson(process.env.YOUTUBE_QUEUE_FILE,[]);
      if(!queue.some(item=>(item.publicationKey||item.slug)===publicationKey)) {
        queue.push({
          slug:p.slug,
          publicationKey,
          forceRepublish:update,
          articleUrl:`${BASE}/blog/${encodeURIComponent(p.slug)}/`,
          sourceUrl:p.sourceUrl,
          title:p.title,
          description:p.description,
          youtubeTitle:update?`UPDATE: ${p.youtubeTitle||p.title}`:(p.youtubeTitle||p.title),
          socialHook:update?`Update: ${p.socialHook||p.description||p.title}`:(p.socialHook||p.description||p.title),
          sections:p.sections||[],
          tags:p.tags||[],
          thumbnail:p.thumbnail||'',
          thumbnailAlt:p.thumbnailAlt||'',
          inlineImages:p.inlineImages||[],
          sources:p.sources||[],
          socialScore:score,
          queuedAt:new Date().toISOString()
        });
        await writeJson(process.env.YOUTUBE_QUEUE_FILE,queue);
        console.log(`Queued ${publicationKey} for YouTube Shorts publication.`);
      }
    } catch(error) {
      console.error(`Could not add ${publicationKey} to the YouTube queue; blog publication will continue: ${error.message}`);
    }
  }
}

async function generateDeepDive() {
  const posts=await readJson(DATA_FILE,[]);
  const today=new Date().toISOString().slice(0,10);
  if(posts.some(post=>post.contentType==='analysis' && post.date===today)) {
    console.log('Daily analysis already exists; skipping.');
    return;
  }
  const cutoff=Date.now()-7*24*60*60*1000;
  const recent=posts.filter(post=>{
    const stamp=Date.parse(`${post.date}T12:00:00Z`);
    return Number.isFinite(stamp)&&stamp>=cutoff&&Array.isArray(post.sources)&&post.sources.length;
  }).slice(0,12);
  if(recent.length<3) {
    console.log('Not enough sourced recent coverage for a daily analysis; skipping.');
    return;
  }

  await refreshPerformanceFeedback(posts);
  const selected=[...recent].sort((a,b)=>topicScore(b)-topicScore(a)).slice(0,6);
  const sourceMap=new Map();
  for(const post of selected) {
    for(const source of post.sources||[]) if(source?.url) sourceMap.set(source.url,source);
  }
  const sourceList=[...sourceMap.values()].slice(0,12);
  const prompt=`Write one deeper Macca Blog analysis using ONLY the already-published sourced material below. Do not invent facts or add outside claims. The goal is context, comparison, timeline, or synthesis rather than another quick news rewrite. Clearly distinguish confirmed information from reports, allegations, leaks, rumors, or community speculation. Return JSON only with: title, description, seoTitle (max 64 chars), seoDescription (120-158 chars), category set to "Analysis", tags array, featured true, youtubeTitle (max 78 chars), socialHook (one direct factual sentence), instagramCaptionLead (max 180 chars), sections (3-5 objects with heading and paragraphs), and sources (array chosen only from the supplied source URLs). Use at least 3 distinct source URLs. Keep the analysis useful even if the reader has not read the individual posts.

RECENT MACCA COVERAGE:
${selected.map((post,index)=>`${index+1}. ${post.title}
Date: ${post.date}
Summary: ${post.description}
Category: ${post.category}
Sections: ${(post.sections||[]).map(section=>`${section.heading}: ${(section.paragraphs||[]).join(' ')}`).join(' | ')}
Sources: ${(post.sources||[]).map(source=>`${source.title} — ${source.url}`).join('; ')}`).join('\n\n')}

ALLOWED SOURCE URLS:
${sourceList.map(source=>`- ${source.title} — ${source.url}`).join('\n')}
`;
  const generated=parseModel(await ask(prompt));
  if(generated.skip) {
    console.log(`Daily analysis skipped by provider: ${generated.reason||'no reason'}`);
    return;
  }
  if(!generated.title||!Array.isArray(generated.sections)||generated.sections.length<3) throw new Error('Provider returned incomplete daily analysis JSON.');
  const allowed=new Set(sourceList.map(source=>source.url));
  const cited=(Array.isArray(generated.sources)?generated.sources:[]).filter(source=>allowed.has(source.url));
  if(new Set(cited.map(source=>source.url)).size<3) throw new Error('Daily analysis did not preserve at least three allowed source URLs.');
  const title=String(generated.title).trim();
  let slug=slugify(title);
  if(posts.some(post=>post.slug===slug||similarity(post.title,title)>0.5)) slug=slugify(`${title}-analysis-${today}`);
  const p={
    ...generated,
    title,
    description:String(generated.description||title).trim().slice(0,300),
    seoTitle:String(generated.seoTitle||title).trim().slice(0,64),
    seoDescription:String(generated.seoDescription||generated.description||title).trim().slice(0,158),
    category:'Analysis',
    tags:normalizeTags(Array.isArray(generated.tags)?generated.tags:[],title,generated.description||''),
    featured:true,
    contentType:'analysis',
    youtubeTitle:String(generated.youtubeTitle||title).trim().slice(0,78),
    socialHook:String(generated.socialHook||generated.description||title).trim().slice(0,220),
    instagramCaptionLead:String(generated.instagramCaptionLead||generated.socialHook||title).trim().slice(0,180),
    thumbnail:'',
    thumbnailAlt:title,
    inlineImages:[],
    date:today,
    slug,
    sourceUrl:cited[0]?.url||sourceList[0].url,
    sources:cited
  };
  posts.unshift(p);
  await writeJson(DATA_FILE,posts);
  const history=await readJson(HISTORY_FILE,[]);
  history.unshift({slug:p.slug,title:p.title,sourceUrl:p.sourceUrl,sourceUrls:p.sources.map(source=>source.url),date:p.date,status:'published-analysis',hash:crypto.createHash('sha256').update(`${p.title}|${p.date}`).digest('hex')});
  await writeJson(HISTORY_FILE,history.slice(0,500));
  await queueSocialPublication(p);
  await build();
  console.log(`Published daily analysis ${p.slug}`);
}

async function optimizeSearchMetadata() {
  const feedback=await readJson(SEARCH_CONSOLE_FILE,{pageOpportunities:[]});
  const posts=await readJson(DATA_FILE,[]);
  const bySlug=new Map(posts.map(post=>[post.slug,post]));
  const opportunities=(feedback.pageOpportunities||[])
    .map(item=>{
      let slug='';
      try {
        const url=new URL(item.page);
        const parts=url.pathname.split('/').filter(Boolean);
        if(parts[0]==='blog'&&parts.length>=2) slug=parts[1];
      } catch {}
      return {...item,slug,post:bySlug.get(slug)};
    })
    .filter(item=>item.post&&Number(item.impressions||0)>=40&&(Number(item.ctr||0)<0.03||Number(item.position||99)<=15))
    .sort((a,b)=>Number(b.impressions||0)-Number(a.impressions||0))
    .slice(0,3);

  if(!opportunities.length) {
    console.log('Search metadata optimizer: no qualified Search Console opportunity.');
    return;
  }

  const prompt=`Improve search-result metadata for these existing Macca Blog articles using ONLY the supplied article facts and the real Search Console queries. Do not change factual meaning, invent claims, sensationalize, or imply confirmation that the article does not support. Important GTA/Rockstar search terms should appear naturally near the start. Return one JSON object only: {"updates":[{"slug":"...","seoTitle":"max 64 chars","seoDescription":"120-158 chars"}]}. Do not change article titles or body text.

${opportunities.map((item,index)=>`${index+1}. slug: ${item.slug}
Article title: ${item.post.title}
Current SEO title: ${item.post.seoTitle||item.post.title}
Description: ${item.post.description}
Queries: ${(item.queries||[]).join(' | ')}
Impressions: ${item.impressions}; CTR: ${item.ctr}; Position: ${item.position}`).join('\n\n')}`;
  const generated=parseModel(await ask(prompt));
  const updates=Array.isArray(generated.updates)?generated.updates:[];
  let changed=0;
  const now=new Date().toISOString();
  for(const update of updates) {
    const post=bySlug.get(String(update.slug||''));
    if(!post) continue;
    const seoTitle=String(update.seoTitle||'').trim().slice(0,64);
    const seoDescription=String(update.seoDescription||'').trim().slice(0,158);
    if(!seoTitle||seoTitle.length<15||!seoDescription||seoDescription.length<80) continue;
    if(post.seoTitle===seoTitle&&post.seoDescription===seoDescription) continue;
    post.seoTitle=seoTitle;
    post.seoDescription=seoDescription;
    post.seoUpdatedAt=now;
    post.searchOptimization={
      updatedAt:now,
      impressions:Number(opportunities.find(item=>item.slug===post.slug)?.impressions||0),
      queries:(opportunities.find(item=>item.slug===post.slug)?.queries||[]).slice(0,8)
    };
    changed+=1;
  }
  if(!changed) {
    console.log('Search metadata optimizer returned no safe changes.');
    return;
  }
  await writeJson(DATA_FILE,posts);
  await build();
  console.log(`Search metadata optimizer updated ${changed} article(s).`);
}

async function generate() {
  generate.rejected ||= 0;
  const dryRun=process.argv.includes('--dry-run');
  if(!BACKFILL&&!dryRun) {
    const currentPosts=await readJson(DATA_FILE,[]);
    const today=new Date().toISOString().slice(0,10);
    const todayRegular=currentPosts.filter(post=>post?.date===today&&post.contentType!=='analysis').length;
    if(todayRegular>=DAILY_ARTICLE_CAP) {
      console.log(`Daily editorial cap reached (${todayRegular}/${DAILY_ARTICLE_CAP}); monitoring continues without another article.`);
      return;
    }
  }
  const candidates=await research();
  if(!candidates.length) { console.log('No recent GTA coverage found in configured news feeds; skipping this run.'); return; }
  const posts=await readJson(DATA_FILE,[]), history=await readJson(HISTORY_FILE,[]);
  await refreshPerformanceFeedback(posts);
  const used=sourceLinks(posts,history), saved=await readJson(CANDIDATE_FILE,null), forced=saved?.candidate?.link?saved.candidate:null;
  const ranked=candidates.filter(c=>isNovel(c,posts,history,used)).sort((a,b)=>topicScore(b)-topicScore(a));
  const candidate=forced?(candidates.find(c=>c.link===forced.link)||forced):ranked[0];
  if(!candidate) { console.log('No sufficiently novel topic; skipping this run.'); return; }
  if(!isNovel(candidate,posts,history,used)) { console.log(`Monitored item is no longer novel; skipping: ${candidate.title}`); return; }
  const updateTarget=(saved?.updateTargetSlug&&posts.find(post=>post.slug===saved.updateTargetSlug))||findUpdateTarget(candidate,posts);
  if(dryRun) console.log(`Dry run selected candidate: ${candidate.title} (${candidate.link})`);
  const relatedFeeds=[candidate,...candidates.filter(c=>c.link!==candidate.link&&similarity(c.title,candidate.title)>0.2)].slice(0,5);
  const sourced=await Promise.all(relatedFeeds.map(fetchArticle));
  const mainSource=sourced.find(s=>s.link===candidate.link)||await fetchArticle(candidate);
  if(dryRun) console.log(`Research fetched ${sourced.length} source page(s); primary excerpt: ${(mainSource.excerpt||mainSource.description||'none').length} characters.`);
  const imageSources=sourced.filter(s=>s.imageUrl).map(s=>({url:s.imageUrl,sourceUrl:s.canonical||s.link,title:s.title}));
  const lifecycleContext=updateTarget?`\nEXISTING STORY TO UPDATE (keep this canonical URL and return a complete revised version, not a separate duplicate):\nTitle: ${updateTarget.title}\nURL: ${BASE}/blog/${updateTarget.slug}/\nPublished: ${updateTarget.date}\nCurrent summary: ${updateTarget.description}\nCurrent sources: ${(updateTarget.sources||[]).map(source=>`${source.title} — ${source.url}`).join('; ')}\nOnly revise it if the lead item is a material development of the same story. If it is not the same story, return skip:true.\n`:'';
  const prompt=`Act as an editor validating the lead item before writing. It must be recent, materially about Grand Theft Auto or Rockstar Games, and contain a specific report or announcement. One credible publication report or one Rockstar/Take-Two primary source is enough; a second source is not required. Return JSON with skip:true and a brief reason for irrelevant items, duplicates, stale items, memes, vague posts, or unsupported speculation. Rumors and leaks may be covered when a credible publication reports them, with clear attribution and uncertainty. Treat third-party X posts as tips, not confirmation: prefer linked reporting or a Rockstar/Take-Two primary source in related coverage. Skip an isolated social post that offers no linked report or specific, verifiable information. Do not invent missing details. Describe crime and legal matters only as attributed allegations, never as established guilt; distinguish separate investigations and avoid naming a suspect unless the identity is essential and confirmed by authoritative sources. For accepted items, write a concise English post and attribute each claim to the named publisher, forum, or account. When details are sparse, write a short 150-250 word news brief that says what the source reported and what remains unknown. Cover Rockstar Games and Take-Two news as well as GTA. Return JSON only. For accepted items include title, description, seoTitle (accurate search title, max 64 characters, important GTA/Rockstar terms first, no clickbait), seoDescription (accurate search description, 120-158 characters), category, tags (array), featured (boolean), youtubeTitle (max 78 characters, front-load the concrete GTA/Rockstar fact, no channel branding), socialHook (one direct factual sentence suitable for the first second of a Short/Reel), instagramCaptionLead (one concise factual hook, max 180 characters), sections (array of {heading,paragraphs:[...]}), thumbnail (string), thumbnailAlt (string), inlineImages (array of {url,alt,caption,sourceUrl}), and sources (array of {title,url,publisher}). Use 2-3 sections. Include the source URL as supplied. For thumbnail and inline images, choose only exact URLs from AVAILABLE SOURCE IMAGES. Never invent, alter, or guess an image URL. If none is suitable, set thumbnail to empty and inlineImages to []. Images are hotlinked from the reporting page and will not be copied into the repository. The article hero/banner is always the Macca image.
${lifecycleContext}
LEAD ITEM: ${candidate.title}
Publisher: ${candidate.source}
Date: ${candidate.date}
URL: ${candidate.link}
RSS summary: ${candidate.description}

AVAILABLE SOURCE IMAGES:
${JSON.stringify(imageSources)}

RELATED COVERAGE (use only if actually about the same story):
${sourced.map((s,i)=>`${i+1}. ${s.title}
URL: ${s.canonical||s.link}
Publisher: ${s.publisher}
Published: ${s.date}
Summary: ${s.description}
Article image: ${s.imageUrl||'[none]'}
Article excerpts: ${s.excerpt||'[No body available]'}`).join('\n\n')}
`;
  const generated=parseModel(await ask(prompt));
  if(dryRun) { if(generated.skip) { console.log(`Dry run provider declined topic: ${generated.reason||'no reason supplied'}`); return; } if(!generated.title||!Array.isArray(generated.sections)||generated.sections.length<2) throw new Error('Provider returned incomplete article JSON.'); console.log(`Dry run received valid article JSON (${generated.title}); no files changed.`); return; }
  if(generated.skip) {
    const reason=String(generated.reason||'AI validation found insufficient or unsuitable reporting.').slice(0,500);
    console.log(`AI validation skipped this item: ${reason}`);
    history.unshift({sourceUrl:candidate.link,title:candidate.title,date:new Date().toISOString(),status:'ai-rejected',reason,sourceUrls:relatedFeeds.map(s=>s.link)});
    await writeJson(HISTORY_FILE,history.slice(0,500));
    return;
  }
  if(!generated.title||!Array.isArray(generated.sections)||generated.sections.length<1) throw new Error('Provider returned incomplete article JSON.');
  const title=String(generated.title).trim();
  const allowedSourceUrls=new Set(sourced.flatMap(s=>[s.link,s.canonical]).concat(candidate.link).filter(Boolean));
  const cited=[...(Array.isArray(generated.sources)?generated.sources.filter(s=>allowedSourceUrls.has(s.url)):[]),{title:candidate.title,url:mainSource.canonical||candidate.link,publisher:candidate.source}];
  const allowedImageUrls=new Set(imageSources.map(s=>s.url));
  const inlineImages=(Array.isArray(generated.inlineImages)?generated.inlineImages:[]).filter(x=>allowedImageUrls.has(x.url)&&/^https:\/\//i.test(x.url||'')).slice(0,3).map(x=>({url:x.url,alt:String(x.alt||candidate.title).slice(0,180),caption:String(x.caption||'').slice(0,300),sourceUrl:allowedSourceUrls.has(x.sourceUrl)?x.sourceUrl:(imageSources.find(i=>i.url===x.url)?.sourceUrl||mainSource.canonical||candidate.link)}));
  const selectedThumbnail=allowedImageUrls.has(generated.thumbnail)?generated.thumbnail:(allowedImageUrls.has(mainSource.imageUrl)?mainSource.imageUrl:'');
  const generatedSources=[...new Map(cited.filter(s=>s.url).map(s=>[s.url,s])).values()];
  if(updateTarget) {
    const updatedAt=new Date().toISOString();
    const mergedSources=[...new Map([...(updateTarget.sources||[]),...generatedSources].filter(source=>source?.url).map(source=>[source.url,source])).values()];
    const mergedImages=[...new Map([...(updateTarget.inlineImages||[]),...inlineImages].filter(image=>image?.url).map(image=>[image.url,image])).values()].slice(0,4);
    const updated={
      ...updateTarget,
      ...generated,
      title,
      description:String(generated.description||mainSource.description||candidate.description||title).slice(0,300),
      seoTitle:String(generated.seoTitle||title).trim().slice(0,64),
      seoDescription:String(generated.seoDescription||generated.description||mainSource.description||candidate.description||title).trim().slice(0,158),
      category:normalizeCategory(generated.category,title,generated.description||mainSource.description||candidate.description||''),
      tags:normalizeTags(Array.isArray(generated.tags)?generated.tags:[],title,generated.description||mainSource.description||candidate.description||''),
      youtubeTitle:String(generated.youtubeTitle||title).trim().slice(0,78),
      socialHook:String(generated.socialHook||generated.description||title).trim().slice(0,220),
      instagramCaptionLead:String(generated.instagramCaptionLead||generated.socialHook||title).trim().slice(0,180),
      thumbnail:selectedThumbnail||updateTarget.thumbnail||'',
      thumbnailAlt:String(generated.thumbnailAlt||updateTarget.thumbnailAlt||title).slice(0,180),
      inlineImages:mergedImages,
      date:updateTarget.date,
      updatedAt,
      slug:updateTarget.slug,
      sourceUrl:updateTarget.sourceUrl||mainSource.canonical||candidate.link,
      sources:mergedSources,
      updateHistory:[...(updateTarget.updateHistory||[]),{updatedAt,sourceUrl:mainSource.canonical||candidate.link,previousTitle:updateTarget.title}].slice(-12)
    };
    const index=posts.findIndex(post=>post.slug===updateTarget.slug);
    posts[index]=updated;
    await writeJson(DATA_FILE,posts);
    history.unshift({slug:updated.slug,title:updated.title,sourceUrl:mainSource.canonical||candidate.link,sourceUrls:relatedFeeds.map(source=>source.link),date:updatedAt,status:'updated',hash:crypto.createHash('sha256').update(`${updated.slug}|${updatedAt}|${candidate.link}`).digest('hex')});
    await writeJson(HISTORY_FILE,history.slice(0,500));
    await queueSocialPublication(updated,{update:true});
    await build();
    console.log(`Updated existing story ${updated.slug} with material new reporting.`);
    return;
  }
  const p={...generated,title,description:String(generated.description||mainSource.description||candidate.description||title).slice(0,300),seoTitle:String(generated.seoTitle||title).trim().slice(0,64),seoDescription:String(generated.seoDescription||generated.description||mainSource.description||candidate.description||title).trim().slice(0,158),category:normalizeCategory(generated.category,title,generated.description||mainSource.description||candidate.description||''),tags:normalizeTags(Array.isArray(generated.tags)?generated.tags:[],title,generated.description||mainSource.description||candidate.description||''),youtubeTitle:String(generated.youtubeTitle||title).trim().slice(0,78),socialHook:String(generated.socialHook||generated.description||title).trim().slice(0,220),instagramCaptionLead:String(generated.instagramCaptionLead||generated.socialHook||title).trim().slice(0,180),thumbnail:selectedThumbnail,thumbnailAlt:String(generated.thumbnailAlt||title).slice(0,180),inlineImages,date:new Date().toISOString().slice(0,10),publishedAt:new Date().toISOString(),slug:slugify(title),sourceUrl:mainSource.canonical||candidate.link,sources:generatedSources};
  if(posts.some(x=>x.slug===p.slug||similarity(x.title,p.title)>0.36)) { console.log(`Skipping near-duplicate generated title: ${p.title}`); history.unshift({sourceUrl:candidate.link,title:candidate.title,date:new Date().toISOString(),status:'near-duplicate',sourceUrls:relatedFeeds.map(s=>s.link)}); await writeJson(HISTORY_FILE,history.slice(0,500)); generate.rejected++; if(generate.rejected<3) return generate(); console.log('Reached per-run limit while skipping duplicates.'); return; }
  posts.unshift(p); await writeJson(DATA_FILE,posts); history.unshift({slug:p.slug,title:p.title,sourceUrl:p.sourceUrl,sourceUrls:relatedFeeds.map(s=>s.link),date:p.date,status:'published',hash:crypto.createHash('sha256').update(`${p.title}|${p.sourceUrl}`).digest('hex')}); await writeJson(HISTORY_FILE,history.slice(0,500));
  await queueSocialPublication(p);
  await build(); console.log(`Published ${p.slug}`);
}
function similarity(a,b){const words=x=>new Set(String(x).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2));const x=words(a),y=words(b);if(!x.size||!y.size)return 0;return [...x].filter(v=>y.has(v)).length/new Set([...x,...y]).size;}
function topicScore(item){
  const t=`${item.title||''} ${item.description||''}`.toLowerCase();
  const source=String(item.source||'').toLowerCase();
  let score=0;
  if(/gta\s*6|gta\s*vi|grand theft auto (?:6|vi)|pre-?order|pre-?sale|price|trailer|release date|rockstar/i.test(t)) score+=5;
  if(/map|weather|vehicle|gameplay|character|online|collector|merch|physics|release/i.test(t)) score+=1.25;
  if(/leak|leaked|hack|hacked|breach/i.test(t)) score+=0.5;
  if(/rumou?r|alleged|unconfirmed|speculation/i.test(t)) score-=1.25;
  if(/rockstar|take[- ]two/.test(source)) score+=3;
  else if(/game informer|gamespot|ign|pc gamer|eurogamer|videogameschronicle|rock paper shotgun/.test(source)) score+=1.25;
  else if(/reddit|x\.com|twitter/.test(source)) score-=0.75;
  if(item.date) score+=Math.max(0,3-(Date.now()-Date.parse(item.date))/86400000/10);
  score+=historicalPerformanceBonus(item);
  score+=searchConsoleBonus(item,searchFeedback);
  return score;
}

const cmd=process.argv[2]||'build';
if(cmd==='build') await build();
else if(cmd==='monitor') await monitor();
else if(cmd==='record-monitor-failure') await recordMonitorFailure();
else if(cmd==='generate') {
  const count=Math.max(1,Math.min(BACKFILL?50:5,Number(process.argv.find(x=>x.startsWith('--count='))?.split('=')[1]||1)));
  for(let i=0;i<count;i++) { const before=(await readJson(DATA_FILE,[])).length; generate.rejected=0; await generate(); const after=(await readJson(DATA_FILE,[])).length; if(process.argv.includes('--dry-run')||after===before) break; }
}
else if(cmd==='deep-dive') await generateDeepDive();
else if(cmd==='search-optimize') await optimizeSearchMetadata();
else if(cmd==='discover') { const items=await research(); console.log(JSON.stringify(items.slice(0,BACKFILL?200:40),null,2)); }
else throw new Error(`Unknown command ${cmd}`);
