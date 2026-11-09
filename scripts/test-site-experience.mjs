#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = path => fs.readFile(path, 'utf8');
const [home, study, blog, social, sitemap, rawPosts] = await Promise.all([
  read('index.html'), read('study/index.html'), read('blog/index.html'),
  read('social/index.html'), read('sitemap-pages.xml'), read('blog/posts.json')
]);
assert.doesNotMatch(home, /href=["']\/study\/["']/i, 'Study must not be in the home menu');
assert.match(study, /<meta name="robots" content="noindex, follow">/i, 'Study remains accessible but unindexed');
assert.doesNotMatch(sitemap, /\/study\//i, 'Private study navigation should not be listed in the sitemap');
assert.match(home, /id="macca-network"/);
assert.match(blog, /class="macca-network-callout"/);
assert.match(social, /class="macca-network-callout"/);
assert.match(blog, /utm_source=macca/);
const posts = JSON.parse(rawPosts);
assert.ok(Array.isArray(posts) && posts.length, 'Expected blog articles');
const first = posts.find(p => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(p?.slug || '')));
assert.ok(first, 'Expected at least one published article with a slug');
const article = await read('blog/' + first.slug + '/index.html');
assert.match(article, /class="macca-network-related"/);
assert.match(article, /<link rel="canonical"/);
for(const [name, html, marker] of [
  ['home',home,'id="macca-network"'],
  ['blog',blog,'class="macca-network-callout"'],
  ['article',article,'class="macca-network-related"']
]){
  assert.equal(html.split(marker).length - 1, 1, name + ': duplicate referral block');
  assert.match(html, /target="_blank" rel="noopener noreferrer"/, name + ': external links are required to use safe rel');
}
console.log('Macca site experience, SEO and navigation checks passed.');
