#!/usr/bin/env node
// Idempotent post-build presentation updates. Keep this public: the private
// editorial generator must not be required to maintain site navigation/links.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BLOG = 'https://pklavc.com/blog/?utm_source=macca&utm_medium=referral&utm_campaign=editorial_network&utm_content=';
const COMMUNITY = 'https://pklavc.com/connect/?utm_source=macca&utm_medium=referral&utm_campaign=editorial_network&utm_content=';
const external = 'target="_blank" rel="noopener noreferrer"';
const homeNetwork = [
  '<section class="macca-network-section" id="macca-network" aria-labelledby="macca-network-title">',
  '<div class="macca-network-copy"><p class="eyebrow">FROM OUR NETWORK</p>',
  '<h2 id="macca-network-title">Beyond Vice City.</h2>',
  '<p>Explore independent stories on technology, gaming, engineering and software projects from PkLavc.</p>',
  '<div class="macca-network-actions"><a class="macca-network-primary" href="' + BLOG + 'home_blog" ' + external + '>Explore PkLavc Blog <span aria-hidden="true">↗</span></a>',
  '<a class="macca-network-secondary" href="' + COMMUNITY + 'home_community" ' + external + '>Communities and channels</a></div></div>',
  '<img src="/assets/creatives/visual-16.webp" alt="" width="400" height="260" loading="lazy" decoding="async">',
  '</section>'
].join('');

function callout(placement) {
  return '<section class="macca-network-callout" aria-label="More from PkLavc">' +
    '<div><span class="macca-network-kicker">EXPLORE MORE</span>' +
    '<strong>Gaming, technology and software projects</strong>' +
    '<p>Read the Macca stories here, then explore more independent coverage on PkLavc.</p></div>' +
    '<a href="' + BLOG + placement + '" ' + external + '>Explore PkLavc <span aria-hidden="true">↗</span></a></section>';
}

function articleReferral() {
  return '<aside class="macca-network-related" aria-label="More coverage from PkLavc">' +
    '<div><span class="macca-network-kicker">FROM OUR NETWORK</span>' +
    '<h2>More gaming and technology coverage</h2>' +
    '<p>Explore more articles and projects from the PkLavc Blog.</p></div>' +
    '<a href="' + BLOG + 'article" ' + external + '>Visit PkLavc <span aria-hidden="true">↗</span></a></aside>';
}

function enhanceHome(html) {
  html = html.replace(/<a\b[^>]*href=["']\/study\/["'][^>]*>\s*Study\s*<\/a>/gi, '');
  if (html.includes('id="macca-network"')) return html;
  if (html.includes('class="partner-banner"')) {
    return html.replace(/<a class="partner-banner"[\s\S]*?<\/a>/, homeNetwork);
  }
  return html.replace('</main>', homeNetwork + '</main>');
}
function enhanceIndex(html, sectionMarker, placement) {
  if (html.includes('class="macca-network-callout"')) return html;
  const match = html.match(sectionMarker);
  return match ? html.replace(match[0], match[0] + callout(placement)) : html;
}
function enhanceArticle(html) {
  if (html.includes('class="macca-network-related"')) return html;
  if (html.includes('<section class="article-related"')) {
    return html.replace('<section class="article-related"', articleReferral() + '<section class="article-related"');
  }
  // Older article layout fallback; don't alter non-article pages.
  if (html.includes('<main class="layout"><article>') && html.includes('</article><aside>')) {
    return html.replace('</article><aside>', articleReferral() + '</article><aside>');
  }
  return html;
}
async function edit(file, transform) {
  const dest = path.join(ROOT, file);
  let before;
  try { before = await fs.readFile(dest, 'utf8'); }
  catch(error) { if(error.code === 'ENOENT') return false; throw error; }
  const after = transform(before);
  if (after === before) return false;
  await fs.writeFile(dest, after);
  return true;
}
let changedPages = 0, changedArticles = 0;
if (await edit('index.html', enhanceHome)) changedPages++;
if (await edit('blog/index.html', html => enhanceIndex(html, /<section class="intro">[\s\S]*?<\/section>/, 'blog_index'))) changedPages++;
if (await edit('social/index.html', html => enhanceIndex(html, /<section class="growth-hero">[\s\S]*?<\/section>/, 'social'))) changedPages++;
let posts = [];
try { posts = JSON.parse(await fs.readFile(path.join(ROOT, 'blog/posts.json'), 'utf8')); }
catch(error) { if(error.code !== 'ENOENT') throw error; }
for (const post of posts) {
  const slug = String(post?.slug || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue;
  if (await edit(path.join('blog', slug, 'index.html'), enhanceArticle)) changedArticles++;
}
console.log('Macca experience updated: ' + changedPages + ' landing pages and ' + changedArticles + ' articles.');
