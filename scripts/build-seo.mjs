#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const SITE=(process.env.SITE_URL||'https://macca-lab.onrender.com').replace(/\/$/,'');
const SKIP=new Set(['.git','node_modules','blog','scripts','.github','coverage','dist','build']);
const HOME_TITLE='Macca Lab | GTA 6 & Rockstar News, Analysis and Projects';
const HOME_DESCRIPTION='Independent GTA 6, GTA Online and Rockstar Games news, analysis and source-backed coverage from Macca Blog, plus Macca Lab projects.';
const ADSENSE_SCRIPT=''; // ads.txt stays ready; AdSense script is disabled until approval.
const GOOGLE_VERIFICATION_META='<meta name="google-site-verification" content="d6Rh9rH8TsBuT5o4NK7mKh25IQXbBOB0qLDCJgXgxBE">';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/Ã¡/g,'á').replace(/Ã©/g,'é').replace(/Ã­/g,'í').replace(/Ã³/g,'ó').replace(/Ãº/g,'ú').replace(/Ã£/g,'ã').replace(/Ãµ/g,'õ').replace(/Ã§/g,'ç').replace(/Ã‰/g,'É').replace(/Ã“/g,'Ó').replace(/Ã€/g,'À').replace(/Ã‚/g,'Â').replace(/Â(?=\s|[·…])/g,'');
const strip=s=>decode(String(s||'').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
async function walk(dir=''){
  const out=[];
  for(const ent of await fs.readdir(path.join(ROOT,dir),{withFileTypes:true})){
    if(ent.name.startsWith('.')||SKIP.has(ent.name))continue;
    const rel=path.posix.join(dir.replaceAll('\\','/'),ent.name);
    if(ent.isDirectory())out.push(...await walk(rel));
    else if(ent.isFile()&&ent.name.toLowerCase()==='index.html')out.push(rel);
  }
  return out;
}
function attr(tag,key){return tag.match(new RegExp(`\\b${key}\\s*=\\s*(["'])(.*?)\\1`,'i'))?.[2]||'';}
function replaceTag(head,replacement,re){let done=false;const next=head.replace(re,()=>{if(done)return '';done=true;return replacement;});return done?next:`${next}\n${replacement}`;}
function titleOf(html,file){if(file==='index.html')return HOME_TITLE;return strip(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1])||strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])||'Macca Lab';}
function descOf(html,title,file){if(file==='index.html')return HOME_DESCRIPTION;const old=html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0];const desc=old?attr(old,'content'):'';if(desc.length>60)return decode(desc);
  const h1=strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const paras=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])).filter(t=>t.length>45);
  const candidate=paras.find(x=>!/^study\s+play\s+macca/i.test(x))||h1||`${title} at Macca Lab.`;
  return candidate.length>165?candidate.slice(0,162).replace(/\s+\S*$/,'')+'…':candidate;
}
function pageSchema(url,title,description,file){
  const home=url===`${SITE}/`,routePath=new URL(url).pathname;
  const language=/lang=["']pt/i.test(file.__html||'')?'pt-BR':'en';
  const organization={'@type':'Organization','@id':`${SITE}/#organization`,'name':'Macca Lab','url':`${SITE}/`,'logo':{'@type':'ImageObject','url':`${SITE}/images/favicon-512x512.png`},'sameAs':['https://www.instagram.com/macca_the_gator_oficial/','https://www.youtube.com/@macca_the_gator_oficial'],'publishingPrinciples':`${SITE}/editorial-policy/`};
  if(home)return {'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':`${SITE}/#website`,'url':`${SITE}/`,'name':'Macca Lab','description':description,'inLanguage':'en','publisher':{'@id':`${SITE}/#organization`}},
    organization
  ]};
  if(routePath==='/about/')return {'@context':'https://schema.org','@graph':[
    {'@type':'AboutPage','@id':`${url}#webpage`,'url':url,'name':title,'description':description,'inLanguage':language,'about':{'@id':`${SITE}/#organization`}},
    organization
  ]};
  if(routePath==='/contact/')return {'@context':'https://schema.org','@type':'ContactPage','@id':`${url}#webpage`,'url':url,'name':title,'description':description,'inLanguage':language,'about':{'@id':`${SITE}/#organization`}};
  const type=/(?:simulador|calculator|interactive-tool)\/$/i.test(routePath)?'SoftwareApplication':'WebPage';
  const data={'@context':'https://schema.org','@type':type,'@id':`${url}#${type.toLowerCase()}`,'url':url,'name':title,'description':description,'inLanguage':language};
  if(type==='SoftwareApplication'){data.applicationCategory='EducationalApplication';data.operatingSystem='Web';}
  return data;
}
function articleHref(post){return `/blog/${encodeURIComponent(post.slug)}/`;}
function storyCard(post){
  const title=decode(post.title||'Macca Blog story');
  const description=decode(post.description||'Read the latest story on Macca Blog.');
  const category=decode(post.category||'Macca Blog');
  const date=String(post.date||'');
  const candidate=String(post.thumbnail||post.image||'');
  const image=/^https:\/\//i.test(candidate)||candidate.startsWith('/')?candidate:'/images/macca-blog-banner.webp';
  const alt=decode(post.thumbnailAlt||post.imageAlt||title);
  return `<article class="story-card"><a class="story-card-link" href="${esc(articleHref(post))}"><img src="${esc(image)}" alt="${esc(alt)}" width="800" height="450" loading="lazy" decoding="async"><span class="story-card-copy"><span class="story-meta"><span>${esc(category)}</span><time datetime="${esc(date)}">${esc(date)}</time></span><h3>${esc(title)}</h3><p>${esc(description)}</p><span class="story-more">Read story <span aria-hidden="true">→</span></span></span></a></article>`;
}
async function buildHome(){
  const file=path.join(ROOT,'index.html');
  let html=await fs.readFile(file,'utf8');
  let posts=[];
  try{posts=JSON.parse(await fs.readFile(path.join(ROOT,'blog','posts.json'),'utf8'));}catch{}
  posts=posts.filter(post=>post&&post.slug).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const latest=posts.slice(0,6);
  const latestMarkup=latest.length?`<div class="story-grid">${latest.map(storyCard).join('')}</div>`:`<p>Stories are being prepared. Visit <a href="/blog/">Macca Blog</a> for the latest coverage.</p>`;
  const topicDefinitions=[
    {label:'GTA 6',test:p=>/^(GTA 6|GTA VI)$/i.test(p.category||''),description:'Reports, updates and community discussion about the next Grand Theft Auto.'},
    {label:'GTA News',test:p=>p.category==='GTA News',description:'Recent stories across the Grand Theft Auto series.'},
    {label:'Rockstar Games',test:p=>p.category==='Rockstar Games',description:'News and reporting about Rockstar Games and its projects.'},
    {label:'GTA Online',test:p=>p.category==='GTA Online',description:'Updates and stories about the online world of GTA.'},
    {label:'Gaming',test:p=>p.category==='Gaming'||p.category==='Gaming News',description:'Related gaming news and community stories.'},
    {label:'Game History',test:p=>p.category==='Game History',description:'Context and history from across the Grand Theft Auto series.'},
  ];
  const topics=topicDefinitions.map(topic=>({topic,post:posts.find(topic.test)})).filter(item=>item.post);
  const topicsMarkup=topics.length?`<div class="topic-grid">${topics.map(({topic,post})=>`<a class="topic-card" href="${esc(articleHref(post))}"><h3>${esc(topic.label)}</h3><p>${esc(topic.description)} <span>Explore a related story &rarr;</span></p></a>`).join('')}</div>`:`<p>Explore all available coverage on <a href="/blog/">Macca Blog</a>.</p>`;
  html=html.replace(/<!-- LATEST_STORIES_START -->[\s\S]*?<!-- LATEST_STORIES_END -->/,`<!-- LATEST_STORIES_START -->${latestMarkup}<!-- LATEST_STORIES_END -->`);
  html=html.replace(/<!-- BLOG_TOPICS_START -->[\s\S]*?<!-- BLOG_TOPICS_END -->/,`<!-- BLOG_TOPICS_START -->${topicsMarkup}<!-- BLOG_TOPICS_END -->`);
  await fs.writeFile(file,html);
}
await buildHome();
const files=await walk(); const urls=[];const directory=[];
for(const file of files){
  let html=await fs.readFile(path.join(ROOT,file),'utf8');
  if(!/<head\b/i.test(html)||!/<\/head>/i.test(html))continue;
  const rel=file==='index.html'?'':file.slice(0,-'index.html'.length);
  const url=new URL(rel,`${SITE}/`).href;
  const routePath=new URL(url).pathname;
  const internalToolRoute=/\/simulador\/(?:app|src)\/$/i.test(routePath);
  const auxiliaryNoindexRoute=/^\/(?:study|play)(?:\/|$)/i.test(routePath);
  const title=titleOf(html,file);const description=descOf(html,title,file);const lang=html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1]||'en';
  const publicEditorialPage=routePath==='/'||/^\/(?:about|contact|privacy|editorial-policy|corrections)\/$/.test(routePath);
  if(publicEditorialPage&&!html.includes('/analytics/web-analytics.js')){
    html=html.replace(/<\/head>/i,'<script defer src="/analytics/web-analytics.js"></script>\n</head>');
    await fs.writeFile(path.join(ROOT,file),html);
  }
  if(!publicEditorialPage){
    if(auxiliaryNoindexRoute){
      let head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
      head=replaceTag(head,'<meta name="robots" content="noindex, follow">',/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i);
      html=html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,m=>m.replace(/>[\s\S]*<\/head>/,`>${head}</head>`));
      await fs.writeFile(path.join(ROOT,file),html);
      continue;
    }
    if(!internalToolRoute){urls.push(url);directory.push({url,title,description,lang});}
    continue;
  }
  const image=`${SITE}/images/macca-blog-banner.jpg`;
  let head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
  if(routePath==='/'){
    head=head.replace(/<meta\b(?=[^>]*\bname=["']google-site-verification["'])[^>]*>/gi,'');
  }
  head=replaceTag(head,`<title>${esc(title)}</title>`,/<title\b[^>]*>[\s\S]*?<\/title>/i);
  head=replaceTag(head,`<meta name="description" content="${esc(description)}">`,/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i);
  head=replaceTag(head,`<meta name="robots" content="${internalToolRoute?'noindex, follow':'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">`,/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i);
  head=replaceTag(head,`<link rel="canonical" href="${esc(url)}">`,/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i);
  head=replaceTag(head,'<link rel="icon" href="/favicon.ico" sizes="any">',/<link\b(?=[^>]*\brel=["']icon["'])[^>]*>/i);
  head=replaceTag(head,'<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">',/<link\b(?=[^>]*\bsizes=["']32x32["'])[^>]*>/i);
  head=replaceTag(head,'<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">',/<link\b(?=[^>]*\bsizes=["']16x16["'])[^>]*>/i);
  head=replaceTag(head,'<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">',/<link\b(?=[^>]*\brel=["']apple-touch-icon["'])[^>]*>/i);
  head=replaceTag(head,'<link rel="manifest" href="/site.webmanifest">',/<link\b(?=[^>]*\brel=["']manifest["'])[^>]*>/i);
  const metas=[['og:type',url.endsWith('/blog/')?'website':'website'],['og:site_name','Macca Lab'],['og:title',title],['og:description',description],['og:url',url],['og:image',image],['og:image:alt',`Macca Lab — ${title}`],['og:locale',lang.toLowerCase().startsWith('pt')?'pt_BR':'en_US'],['twitter:card','summary_large_image'],['twitter:title',title],['twitter:description',description],['twitter:image',image]];
  for(const [key,value] of metas){const attribute=key.startsWith('twitter:')?'name':'property';head=replaceTag(head,`<meta ${attribute}="${key}" content="${esc(value)}">`,new RegExp(`<meta\\b(?=[^>]*\\b(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'])[^>]*>`,'i'));}
  head=replaceTag(head,`<link rel="alternate" type="application/rss+xml" title="Macca Blog RSS" href="${SITE}/blog/feed.xml">`,/<link\b(?=[^>]*\btype=["']application\/rss\+xml["'])[^>]*>/i);
  const schema=pageSchema(url,title,description,Object.assign(new String(file),{__html:html}));
  const ld=`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
  head=head.replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,'').trimEnd();
  if(routePath==='/')head+=`\n${GOOGLE_VERIFICATION_META}`;
  head+=`\n${ld}\n`;
  html=html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,m=>m.replace(/>[\s\S]*<\/head>/,`>${head}</head>`));
  await fs.writeFile(path.join(ROOT,file),html);
  if(!internalToolRoute){urls.push(url);directory.push({url,title,description,lang});}
}
try{const posts=JSON.parse(await fs.readFile(path.join(ROOT,'blog','posts.json'),'utf8'));for(const p of posts)directory.push({url:`${SITE}/blog/${encodeURIComponent(p.slug)}/`,title:decode(p.title),description:decode(p.description),lang:'en'});}catch{}
const xmlEscape=s=>esc(s);
const pages=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u=>`  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(ROOT,'sitemap-pages.xml'),pages);
await fs.writeFile(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>\n  <sitemap><loc>${SITE}/blog/sitemap.xml</loc></sitemap>\n  <sitemap><loc>${SITE}/blog/news-sitemap.xml</loc></sitemap>
  <sitemap><loc>${SITE}/growth-sitemap.xml</loc></sitemap>\n</sitemapindex>\n`);
await fs.writeFile(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const primary=directory.filter(p=>p.url===`${SITE}/`||/^https:\/\/macca-lab\.onrender\.com\/(blog|about|contact|privacy|editorial-policy|corrections|social|gta-6|rockstar-games)\/$/.test(p.url)).sort((a,b)=>a.url.localeCompare(b.url));
const entry=p=>`- [${p.title}](${p.url}): ${p.description}`;
await fs.writeFile(path.join(ROOT,'llms.txt'),`# Macca Lab\n\n> An independent project for experiments and editorial content. Macca Blog publishes sourced coverage of Grand Theft Auto, Rockstar Games and related gaming stories.\n\nMacca Blog links stories to their sources and labels rumors and unresolved reports as unconfirmed.\n\n## Public pages\n\n${primary.map(entry).join('\n')}\n\n## Blog and feeds\n\n- [Macca Blog](${SITE}/blog/): News, sourced reporting and analysis.\n- [RSS feed](${SITE}/blog/feed.xml): Recent blog articles.\n\n## Discovery\n\n- [XML sitemap index](${SITE}/sitemap.xml)\n- [Page sitemap](${SITE}/sitemap-pages.xml)\n- [Blog sitemap](${SITE}/blog/sitemap.xml)
- [Google News sitemap](${SITE}/blog/news-sitemap.xml)
- [Evergreen and social sitemap](${SITE}/growth-sitemap.xml)\n`);
await fs.writeFile(path.join(ROOT,'llms-full.txt'),`# Macca Lab — Public Page Directory\n\n${directory.sort((a,b)=>a.url.localeCompare(b.url)).map(entry).join('\n')}\n`);
await fs.writeFile(path.join(ROOT,'ai.txt'),`# Public content discovery\n\nWebsite: ${SITE}/\nCrawl policy: ${SITE}/robots.txt\nSitemap: ${SITE}/sitemap.xml\nPage directory: ${SITE}/llms.txt\nFull directory: ${SITE}/llms-full.txt\n\nThese optional directories describe public pages. They do not control crawler access or guarantee indexing, ranking, training, or citations.\n`);
await fs.mkdir(path.join(ROOT,'images'),{recursive:true});
await fs.writeFile(path.join(ROOT,'images','site-card.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#301d42"/><stop offset="1" stop-color="#f36cae"/></linearGradient></defs><rect width="1200" height="630" fill="#100d1b"/><circle cx="990" cy="165" r="150" fill="url(#g)"/><path d="M0 510 220 330l150 120 180-235 140 185 170-135 340 240v125H0Z" fill="#21182c"/><text x="80" y="160" fill="#4de0ed" font-family="Arial,sans-serif" font-size="32" letter-spacing="8">MACCA LAB</text><text x="80" y="300" fill="#fff2ec" font-family="Arial,sans-serif" font-size="90" font-weight="700">Projects &amp; stories</text><text x="85" y="370" fill="#e2cce0" font-family="Arial,sans-serif" font-size="32">Macca Blog: GTA, Rockstar and more</text></svg>\n`);
console.log(`SEO metadata, ${urls.length} canonical page URLs, sitemap index and AI directories generated.`);

// Keep navigational changes and editorial recommendations after auto-generated builds.
await import('./enhance-site.mjs');
