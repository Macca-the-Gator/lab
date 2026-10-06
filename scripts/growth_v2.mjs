import fs from 'node:fs/promises';
import path from 'node:path';

export const HUBS = [
  {
    slug:'gta-6',
    title:'GTA 6',
    description:'Source-backed GTA 6 coverage, updates, analysis and explainers from Macca Blog.',
    test:post=>/gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi)/i.test(textOf(post)),
  },
  {
    slug:'gta-6/release-date',
    title:'GTA 6 Release Date',
    description:'Latest sourced coverage about the GTA 6 release date, delays, launch timing and availability.',
    test:post=>isGta6(post)&&/release|launch|date|delay|november|may|pre-?order/i.test(textOf(post)),
  },
  {
    slug:'gta-6/characters',
    title:'GTA 6 Characters',
    description:'Coverage about GTA 6 characters, actors and story details, with sources attached to each report.',
    test:post=>isGta6(post)&&/character|lucia|jason|actor|cast|story|protagonist/i.test(textOf(post)),
  },
  {
    slug:'gta-6/map',
    title:'GTA 6 Map',
    description:'GTA 6 map reporting, locations, scale, Vice City, weather and world details collected from sourced stories.',
    test:post=>isGta6(post)&&/map|vice city|location|world|weather|hurricane|storm|key west|scale/i.test(textOf(post)),
  },
  {
    slug:'gta-6/trailers',
    title:'GTA 6 Trailers',
    description:'GTA 6 trailer coverage, official footage, screenshots and marketing updates.',
    test:post=>isGta6(post)&&/trailer|footage|screenshot|marketing|video|teaser/i.test(textOf(post)),
  },
  {
    slug:'gta-6/editions',
    title:'GTA 6 Editions & Collectibles',
    description:'GTA 6 editions, pre-orders, collector items, merchandise and pricing coverage.',
    test:post=>isGta6(post)&&/edition|collector|collectable|collectible|merch|pre-?order|price|case/i.test(textOf(post)),
  },
  {
    slug:'gta-6/online',
    title:'GTA 6 Online',
    description:'Reports and analysis about GTA 6 multiplayer and the future of GTA Online.',
    test:post=>isGta6(post)&&/online|multiplayer|lobb|player/i.test(textOf(post)),
  },
  {
    slug:'gta-online',
    title:'GTA Online',
    description:'GTA Online updates, events and ongoing Rockstar support coverage.',
    test:post=>/gta\s*online/i.test(textOf(post)),
  },
  {
    slug:'rockstar-games',
    title:'Rockstar Games',
    description:'Rockstar Games news, studio updates, legal stories, releases and official announcements.',
    test:post=>/rockstar|take[- ]two/i.test(textOf(post)),
  },
];

function textOf(post){
  return `${post?.title||''} ${post?.description||''} ${post?.category||''} ${(post?.tags||[]).join(' ')}`;
}
function isGta6(post){
  return /gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi)/i.test(textOf(post));
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function absolute(base,value){
  try{return new URL(value,base.endsWith('/')?base:`${base}/`).href;}catch{return `${base}/images/macca-blog-banner.jpg`;}
}
function card(post){
  const image=post.discoverImage||post.socialImage||post.thumbnail||'/images/macca-blog-banner.webp';
  return `<article class="growth-card"><a href="/blog/${encodeURIComponent(post.slug)}/"><img src="${esc(image)}" alt="${esc(post.thumbnailAlt||post.title)}" width="1280" height="720" loading="lazy" decoding="async"><span><small>${esc(post.category||'Macca Blog')} · ${esc(post.date||'')}</small><strong>${esc(post.title)}</strong><p>${esc(post.description||'')}</p></span></a></article>`;
}

export function relatedHubs(post){
  return HUBS.filter(hub=>hub.test(post)).slice(0,4);
}

export function socialScore(post){
  const text=textOf(post).toLowerCase();
  const hook=String(post.socialHook||post.instagramCaptionLead||post.description||'').trim();
  let score=18;
  if(/gta\s*(?:6|vi)|grand theft auto\s*(?:6|vi)/i.test(text)) score+=18;
  if(/rockstar|take[- ]two/i.test(text)) score+=10;
  if(/trailer|release|launch|map|weather|hurricane|online|collector|edition|pre-?order|official|confirmed|announc/i.test(text)) score+=16;
  if(/lawsuit|hack|breach|mod|physics|vehicle|character|actor|merch/i.test(text)) score+=8;
  if(/rumou?r|alleged|unconfirmed|speculation|reddit/i.test(text)) score-=12;
  if(post.featured) score+=8;
  if(hook.length>=45&&hook.length<=220) score+=10;
  if(post.thumbnail||post.socialImage||post.discoverImage) score+=6;
  const sourceText=(post.sources||[]).map(source=>`${source.publisher||''} ${source.title||''} ${source.url||''}`).join(' ').toLowerCase();
  if(/rockstar|take[- ]two|rockstargames\.com/.test(sourceText)) score+=12;
  return Math.max(0,Math.min(100,Math.round(score)));
}

export function searchConsoleBonus(item,feedback){
  const text=textOf(item).toLowerCase();
  let bonus=0;
  for(const signal of feedback?.topicSignals||[]){
    const term=String(signal.term||'').toLowerCase().trim();
    if(term.length<3||!text.includes(term)) continue;
    bonus+=Number(signal.weight)||0;
  }
  return Math.max(-2.5,Math.min(3,bonus));
}

export async function buildGrowthPages({root=process.cwd(),base='https://macca-lab.onrender.com',posts=[]}={}){
  const sorted=[...posts].filter(post=>post?.slug).sort((a,b)=>String(b.updatedAt||b.date||'').localeCompare(String(a.updatedAt||a.date||'')));
  const stylesheet='<link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><link rel="stylesheet" href="/assets/site-components.css"><script defer src="/assets/site-components.js"></script><link rel="stylesheet" href="/skylet/widget.css?v=20260929.1"><script defer src="/analytics/web-analytics.js"></script>';
  const footer='<footer><div class="footer-about"><a href="/blog/">Macca Blog</a><span>Independent coverage, linked to its sources.</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/blog/">Blog</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a><a href="/about/">About</a><a href="/editorial-policy/">Editorial Policy</a><a href="/corrections/">Corrections</a><a href="/privacy/">Privacy Policy</a></nav><p class="footer-disclaimer">Macca Lab is an independent project and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p></footer>';

  for(const hub of HUBS){
    const matching=sorted.filter(hub.test);
    const dir=path.join(root,...hub.slug.split('/'));
    await fs.mkdir(dir,{recursive:true});
    const canonical=`${base}/${hub.slug}/`;
    const lastModified=matching[0]?.updatedAt||matching[0]?.date||'';
    const facts=matching.slice(0,6).map(post=>`<li><a href="/blog/${encodeURIComponent(post.slug)}/">${esc(post.title)}</a><span>${esc(post.description||'')}</span></li>`).join('');
    const relatedNav=HUBS.filter(other=>other.slug!==hub.slug&&matching.some(other.test)).slice(0,6).map(other=>`<a href="/${other.slug}/">${esc(other.title)}</a>`).join('');
    const schema={"@context":"https://schema.org","@graph":[
      {"@type":"CollectionPage","@id":`${canonical}#collectionpage`,"name":hub.title,"description":hub.description,"url":canonical,"isPartOf":{"@type":"WebSite","name":"Macca Lab","url":`${base}/`}},
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Macca Lab","item":`${base}/`},
        {"@type":"ListItem","position":2,"name":hub.title,"item":canonical}
      ]},
      {"@type":"ItemList","name":`${hub.title} stories`,"itemListElement":matching.slice(0,24).map((post,index)=>({"@type":"ListItem","position":index+1,"url":`${base}/blog/${post.slug}/`,"name":post.title}))}
    ]};
    const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(hub.title)} | Macca Blog</title><meta name="description" content="${esc(hub.description)}"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(hub.title)}"><meta property="og:description" content="${esc(hub.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${esc(absolute(base,matching[0]?.discoverImage||matching[0]?.socialImage||'/images/macca-blog-banner.jpg'))}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>${stylesheet}</head><body class="has-fixed-content-dock" data-content-context="${esc(hub.title)}"><header class="top"><a class="brand" href="/blog/">MACCA <b>BLOG</b></a><nav aria-label="Main navigation"><a href="/blog/">Blog</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a></nav></header><main class="growth-page"><nav class="growth-breadcrumb"><a href="/blog/">Macca Blog</a><span>›</span><span>${esc(hub.title)}</span></nav><section class="growth-hero"><p class="eyebrow">EVERGREEN COVERAGE</p><h1>${esc(hub.title)}</h1><p>${esc(hub.description)}</p>${lastModified?`<small>Latest source-backed update: ${esc(String(lastModified).slice(0,10))}</small>`:''}</section>${facts?`<section class="growth-summary"><div class="section-heading"><span>WHAT WE KNOW</span><h2>Latest source-backed developments</h2></div><ul>${facts}</ul></section>`:''}<section><div class="section-heading"><span>READ MORE</span><h2>Latest ${esc(hub.title)} stories</h2></div><div class="growth-grid">${matching.slice(0,24).map(card).join('')||'<p>No matching stories yet.</p>'}</div></section>${relatedNav?`<nav class="growth-related" aria-label="Related topic hubs">${relatedNav}</nav>`:''}</main>${footer}<script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
    await fs.writeFile(path.join(dir,'index.html'),html);
  }

  let youtube=[];
  let instagram={};
  try{youtube=JSON.parse(await fs.readFile(path.join(root,'blog','youtube-published.json'),'utf8'));}catch{}
  try{instagram=JSON.parse(await fs.readFile(path.join(root,'blog','instagram-published.json'),'utf8'));}catch{}
  const youtubeBySlug=new Map((Array.isArray(youtube)?youtube:[]).map(item=>[item.slug,item]));
  const instagramBySlug=new Map(Object.entries(instagram||{}).map(([recordKey,item])=>{
    const articleUrl=String(item?.articleUrl||recordKey.split('::')[0]||'');
    return [articleUrl.split('/').filter(Boolean).pop(),item];
  }));
  const socialDir=path.join(root,'social');
  await fs.mkdir(socialDir,{recursive:true});
  const socialPosts=sorted.slice(0,12);
  const featured=socialPosts[0];
  const socialCards=socialPosts.map(post=>{
    const yt=youtubeBySlug.get(post.slug);
    const ig=instagramBySlug.get(post.slug);
    return `<article class="social-story"><a class="social-story-main" data-social-story href="/blog/${encodeURIComponent(post.slug)}/"><img src="${esc(post.discoverImage||post.socialImage||post.thumbnail||'/images/macca-blog-banner.webp')}" alt="${esc(post.title)}" width="1280" height="720" loading="lazy" decoding="async"><span><small>${esc(post.category||'Macca Blog')} · ${esc(post.date||'')}</small><strong>${esc(post.title)}</strong><p>${esc(post.description||'')}</p></span></a><div class="social-story-links">${yt?.youtubeUrl?`<a href="${esc(yt.youtubeUrl)}" target="_blank" rel="noopener noreferrer">YouTube</a>`:''}${ig?.permalink?`<a href="${esc(ig.permalink)}" target="_blank" rel="noopener noreferrer">Instagram</a>`:''}</div></article>`;
  }).join('');
  const socialHtml=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Latest GTA & Rockstar Stories | Macca</title><meta name="description" content="The latest GTA and Rockstar stories from Macca Blog, plus Macca the Gator on YouTube and Instagram."><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${base}/social/"><meta property="og:title" content="Macca — latest GTA & Rockstar stories"><meta property="og:description" content="Jump from Macca's social channels into the latest source-backed GTA and Rockstar coverage."><meta property="og:image" content="${esc(absolute(base,featured?.discoverImage||featured?.socialImage||'/images/macca-blog-banner.jpg'))}">${stylesheet}</head><body class="has-fixed-content-dock" data-content-context="GTA Rockstar social"><header class="top"><a class="brand" href="/blog/">MACCA <b>BLOG</b></a><nav><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/visitors/">Visitors</a></nav></header><main class="growth-page social-landing"><section class="growth-hero"><p class="eyebrow">FROM SOCIAL TO THE FULL STORY</p><h1>Latest from Macca</h1><p>Open the full sourced story, then keep reading related GTA and Rockstar coverage.</p></section><div class="social-story-list">${socialCards}</div></main>${footer}<script>const q=new URLSearchParams(location.search);const source=q.get('utm_source')||'social';for(const a of document.querySelectorAll('[data-social-story]')){const u=new URL(a.href,location.origin);u.searchParams.set('utm_source',source);u.searchParams.set('utm_medium','social');u.searchParams.set('utm_campaign','macca_social_hub');a.href=u.pathname+u.search;}</script><script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
  await fs.writeFile(path.join(socialDir,'index.html'),socialHtml);

  const rootTitle='Macca Lab | GTA 6 & Rockstar News, Analysis and Projects';
  const rootDescription='Independent GTA 6, GTA Online and Rockstar Games news, analysis and source-backed coverage from Macca Blog, plus Macca Lab projects.';
  const latestRoot=sorted.slice(0,6);
  const rootStoryCards=latestRoot.map(post=>`<a class="landing-story-card" href="/blog/${encodeURIComponent(post.slug)}/"><img src="${esc(post.discoverImage||post.socialImage||post.thumbnail||'/images/macca-blog-banner.webp')}" alt="${esc(post.thumbnailAlt||post.title)}" width="1280" height="720" loading="lazy" decoding="async"><span><small>${esc(post.category||'Macca Blog')} · ${esc(post.date||'')}</small><strong>${esc(post.title)}</strong><p>${esc(post.description||'')}</p></span></a>`).join('');
  const rootTopicCards=HUBS.filter(hub=>['gta-6','gta-6/release-date','gta-6/map','gta-6/characters','gta-online','rockstar-games'].includes(hub.slug)).map(hub=>`<a class="landing-topic-card" href="/${hub.slug}/"><strong>${esc(hub.title)}</strong><span>${esc(hub.description)}</span></a>`).join('');
  const rootSchema={"@context":"https://schema.org","@graph":[
    {"@type":"WebSite","@id":`${base}/#website`,"url":`${base}/`,"name":"Macca Lab","description":rootDescription,"inLanguage":"en","publisher":{"@id":`${base}/#organization`}},
    {"@type":"Organization","@id":`${base}/#organization`,"name":"Macca Lab","url":`${base}/`,"logo":{"@type":"ImageObject","url":`${base}/images/favicon-512x512.png`,"width":512,"height":512},"sameAs":["https://www.instagram.com/macca_the_gator_oficial/","https://www.youtube.com/@macca_the_gator_oficial"],"publishingPrinciples":`${base}/editorial-policy/`},
    {"@type":"ItemList","name":"Latest Macca Blog stories","itemListElement":latestRoot.map((post,index)=>({"@type":"ListItem","position":index+1,"url":`${base}/blog/${post.slug}/`,"name":post.title}))}
  ]};
  const rootHtml=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#100d1b"><title>${esc(rootTitle)}</title><meta name="description" content="${esc(rootDescription)}"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"><link rel="canonical" href="${base}/"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="alternate" type="application/rss+xml" title="Macca Blog RSS" href="${base}/blog/feed.xml"><meta property="og:type" content="website"><meta property="og:site_name" content="Macca Lab"><meta property="og:title" content="${esc(rootTitle)}"><meta property="og:description" content="${esc(rootDescription)}"><meta property="og:url" content="${base}/"><meta property="og:image" content="${esc(absolute(base,latestRoot[0]?.discoverImage||'/images/macca-blog-banner.jpg'))}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(rootTitle)}"><meta name="twitter:description" content="${esc(rootDescription)}"><meta name="twitter:image" content="${esc(absolute(base,latestRoot[0]?.discoverImage||'/images/macca-blog-banner.jpg'))}"><meta name="google-site-verification" content="d6Rh9rH8TsBuT5o4NK7mKh25IQXbBOB0qLDCJgXgxBE"><link rel="preload" as="image" href="/images/macca-blog-banner.webp" fetchpriority="high"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><script type="application/ld+json">${JSON.stringify(rootSchema).replace(/</g,'\\u003c')}</script><script defer src="/analytics/web-analytics.js"></script></head><body><header class="top"><a class="brand" href="/" aria-label="Macca Lab home">MACCA <b>LAB</b></a><nav aria-label="Main navigation"><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/rockstar-games/">Rockstar</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a><a href="/study/">Study</a><a href="/play/">Play</a></nav></header><main class="landing"><section class="landing-hero" aria-labelledby="home-title"><img src="/images/macca-blog-banner.webp" alt="Macca the Gator in a neon-lit Vice City scene" width="1600" height="900" fetchpriority="high"><div class="landing-hero-copy"><p class="eyebrow">GRAND THEFT AUTO, REPORTED</p><h1 id="home-title">Stories behind the streets.</h1><p>Macca Blog is the editorial home of Macca Lab: independent GTA and Rockstar coverage with linked sources, context and clearly labeled uncertainty.</p><div class="landing-actions"><a class="landing-button" href="/blog/">Explore Macca Blog <span aria-hidden="true">→</span></a><a class="landing-button landing-button-secondary" href="/gta-6/">Explore GTA 6</a></div></div></section><section class="landing-latest" aria-labelledby="latest-root-title"><div class="landing-section-heading"><div><p class="eyebrow">LATEST COVERAGE</p><h2 id="latest-root-title">New from Macca Blog</h2></div><a href="/blog/">All stories →</a></div><div class="landing-story-grid">${rootStoryCards}</div></section><section class="landing-topics" aria-labelledby="topics-root-title"><div class="landing-section-heading"><div><p class="eyebrow">EXPLORE</p><h2 id="topics-root-title">Follow the story, not just the headline.</h2></div></div><div class="landing-topic-grid">${rootTopicCards}</div></section><section class="landing-about" aria-labelledby="about-title"><div><p class="eyebrow">THE EDITORIAL HOME</p><h2 id="about-title">Coverage with sources and context.</h2></div><p>Stories link back to the material behind them. Rumors, leaks and unresolved reports are labeled as such, while developing stories can be updated on the same canonical page as stronger information arrives.</p></section><a class="partner-banner" href="https://pklavc.com/" target="_blank" rel="sponsored noopener noreferrer" aria-label="Visit pklavc.com, Macca Lab's partner"><span class="partner-copy"><span class="eyebrow">MACCA LAB PARTNER</span><strong>Explore pklavc.com</strong><span>Technology, engineering, projects and more.</span><span class="partner-cta">Visit partner site <span aria-hidden="true">↗</span></span></span><span class="partner-art"><img src="/assets/creatives/visual-16.webp" alt=""></span></a></main><footer><div class="footer-about"><a href="/">Macca Lab</a><span>Independent GTA and Rockstar coverage.</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/blog/">Macca Blog</a><a href="/gta-6/">GTA 6</a><a href="/rockstar-games/">Rockstar</a><a href="/social/">Social</a><a href="/visitors/">Visitors</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/editorial-policy/">Editorial Policy</a><a href="/corrections/">Corrections</a><a href="/privacy/">Privacy Policy</a><a href="/blog/feed.xml">RSS</a></nav><p class="footer-disclaimer">Macca Lab is an independent project and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p></footer><script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;
  await fs.writeFile(path.join(root,'index.html'),rootHtml);

  const infoStyles='<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/blog/assets/blog.css"><link rel="stylesheet" href="/blog/assets/growth.css"><script defer src="/analytics/web-analytics.js"></script>';
  const infoFooter='<footer><div class="footer-about"><a href="/">Macca Lab</a><span>Independent GTA and Rockstar coverage.</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/editorial-policy/">Editorial Policy</a><a href="/corrections/">Corrections</a><a href="/privacy/">Privacy Policy</a></nav></footer>';
  const infoPage=({slug,title,description,kicker,body})=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Macca Lab</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${base}/${slug}/">${infoStyles}</head><body><header class="top"><a class="brand" href="/">MACCA <b>LAB</b></a><nav><a href="/blog/">Blog</a><a href="/gta-6/">GTA 6</a><a href="/rockstar-games/">Rockstar</a><a href="/visitors/">Visitors</a></nav></header><main class="growth-page policy-page"><section class="growth-hero"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></section><article class="policy-copy">${body}</article></main>${infoFooter}<script defer src="/skylet/widget.js?v=20260929.1"></script></body></html>`;

  const editorialDir=path.join(root,'editorial-policy');
  await fs.mkdir(editorialDir,{recursive:true});
  await fs.writeFile(path.join(editorialDir,'index.html'),infoPage({
    slug:'editorial-policy',
    title:'Editorial Policy',
    description:'How Macca Blog sources, labels, updates and monetizes GTA and Rockstar coverage.',
    kicker:'HOW MACCA BLOG WORKS',
    body:`<h2>Sources first</h2><p>Macca Blog links articles to the reporting, official material or public source behind the story. The publishing workflow is designed to reject unsupported or duplicate items rather than fill missing details.</p><h2>Rumors, leaks and allegations</h2><p>Unconfirmed claims can be covered when there is a specific source worth reporting, but uncertainty must remain explicit. Allegations are attributed and are not presented as established guilt or fact.</p><h2>Automated assistance</h2><p>Automated tools may help research, draft, format, generate metadata and distribute stories. The system constrains article claims to the source material collected for that story and preserves source links with the published article.</p><h2>Developing stories</h2><p>When a material development belongs to an existing story, Macca Blog can update that canonical article instead of publishing a near-duplicate. Updated articles display a modified date and may preserve an internal update history.</p><h2>Advertising and affiliate links</h2><p>Partner promotions and affiliate links are separated from editorial text and use sponsored-link attributes where applicable. Advertising performance does not determine whether a factual claim is included in a story.</p><h2>Independence</h2><p>Macca Lab is an independent fan-led project and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p>`
  }));

  const correctionsDir=path.join(root,'corrections');
  await fs.mkdir(correctionsDir,{recursive:true});
  await fs.writeFile(path.join(correctionsDir,'index.html'),infoPage({
    slug:'corrections',
    title:'Corrections & Updates',
    description:'How Macca Blog handles corrections, clarifications and material updates to published coverage.',
    kicker:'ACCURACY & UPDATES',
    body:`<h2>Corrections</h2><p>If a published story contains a material factual error, the article should be corrected rather than left unchanged. The canonical URL remains stable whenever practical.</p><h2>Clarifications</h2><p>Language can be clarified when a source, allegation, rumor or uncertainty needs more precise attribution. A clarification should not silently turn an unconfirmed claim into a confirmed one.</p><h2>Developing coverage</h2><p>Material new reporting may update an existing article and its <code>dateModified</code> value. Major developments can also be redistributed on Macca social channels as an update while the article keeps its original URL.</p><h2>Request a correction</h2><p>Use the <a href="/contact/">contact page</a> or the official Macca the Gator Instagram account to identify the article and the information that should be reviewed.</p>`
  }));

  const growthUrls=[
    ...HUBS.map(hub=>`${base}/${hub.slug}/`),
    `${base}/social/`,
    `${base}/visitors/`,
  ];
  const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${growthUrls.map(url=>`  <url><loc>${esc(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(root,'growth-sitemap.xml'),sitemap);
}
