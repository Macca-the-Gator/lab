#!/usr/bin/env node
// Fast, hermetic regression tests for the public site post-builder.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const script = path.resolve('scripts/enhance-site.mjs');
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'macca-site-'));
const make = async (name, content) => {
  const file = path.join(tmp,name);
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,content);
};
const load = name => fs.readFile(path.join(tmp,name),'utf8');
try {
  await make('index.html','<html><head></head><body><header><nav><a href="/study/">Study</a><a href="/play/">Play</a><a href="/blog/">Blog</a></nav></header><main><a class="partner-banner" href="https://pklavc.com/">Old partner</a></main></body></html>');
  await make('blog/index.html','<html><main><section class="intro"><h1>Blog</h1></section><p>Latest</p></main></html>');
  await make('social/index.html','<html><main><section class="growth-hero"><h1>Social</h1></section></main></html>');
  await make('blog/posts.json',JSON.stringify([{slug:'latest-news',title:'Latest news'}]));
  await make('blog/latest-news/index.html','<html><head><link rel="canonical" href="https://macca-lab.onrender.com/blog/latest-news/"></head><body><main class="layout"><article><p>Story</p><section class="article-related"></section></article><aside></aside></main></body></html>');
  await make('study/index.html','<html><head><meta name="robots" content="noindex, follow"></head><body>Study content remains public at its direct URL.</body></html>');
  const run=()=>execFileSync(process.execPath,[script],{cwd:tmp,encoding:'utf8',timeout:10000});
  run();
  const first={home:await load('index.html'),blog:await load('blog/index.html'),social:await load('social/index.html'),article:await load('blog/latest-news/index.html')};
  assert.doesNotMatch(first.home,/href="\/study\/"/);
  assert.doesNotMatch(first.home,/href="\/play\/"/);
  assert.match(first.home,/macca-redesign-v2\.css/);
  assert.match(first.home,/macca-redesign-v2\.js/);
  assert.match(first.home,/id="macca-network"/);
  assert.match(first.blog,/class="macca-network-callout"/);
  assert.match(first.social,/class="macca-network-callout"/);
  assert.match(first.article,/class="macca-network-related"/);
  assert.match(first.article,/rel="canonical"/);
  assert.match(first.blog,/utm_source=macca/);
  assert.match(first.home,/utm_content=home_blog/);
  assert.match(first.article,/utm_content=article/);
  assert.match(await load('study/index.html'),/noindex, follow/);
  run();
  const second={home:await load('index.html'),blog:await load('blog/index.html'),social:await load('social/index.html'),article:await load('blog/latest-news/index.html')};
  assert.deepEqual(second,first,'Re-running enhancer must not duplicate editorial blocks');
  console.log('Macca post-build UI, private navigation and referral regression checks passed.');
} finally {
  await fs.rm(tmp,{recursive:true,force:true});
}
