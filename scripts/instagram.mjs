#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE = (process.env.SITE_URL || 'https://macca-lab.onrender.com').replace(/\/$/, '');
const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v26.0';
const QUEUE_FILE = process.env.INSTAGRAM_QUEUE_FILE || path.join(ROOT, 'blog', 'instagram-queue.json');
const POSTS_FILE = path.join(ROOT, 'blog', 'posts.json');
const PUBLISHED_FILE = path.join(ROOT, 'blog', 'instagram-published.json');
const REEL_MANIFEST_FILE = process.env.INSTAGRAM_REEL_MANIFEST_FILE || path.join(os.tmpdir(), 'macca-reel-manifest.json');
const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const configuredPageId = process.env.INSTAGRAM_PAGE_ID || '';
const configuredInstagramId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const safeJson = async (file, fallback) => { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } };
const saveJson = async (file, value) => { await fs.mkdir(path.dirname(file), {recursive:true}); await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); };

function recentPublishedCount(published) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return Object.values(published || {}).filter(item => {
    if (item?.contentType === 'rockstar-media') return false;
    const stamp = Date.parse(item?.publishedAt || '');
    return Number.isFinite(stamp) && stamp >= cutoff;
  }).length;
}

function latestPublishedAt(published) {
  let latest = 0;
  for (const item of Object.values(published || {})) {
    const stamp = Date.parse(item?.publishedAt || '');
    if (Number.isFinite(stamp) && stamp > latest) latest = stamp;
  }
  return latest;
}

function rankedQueue(queue) {
  return [...queue].sort((a, b) => {
    const score = Number(b?.socialScore || 0) - Number(a?.socialScore || 0);
    if (score) return score;
    return String(b?.queuedAt || '').localeCompare(String(a?.queuedAt || ''));
  });
}

function imageConverter() {
  for (const cmd of ['magick', 'convert']) {
    const result = spawnSync(cmd, ['-version'], {encoding:'utf8'});
    if (!result.error && result.status === 0) return cmd;
  }
  throw new Error('ImageMagick is required. Install it before preparing Instagram images.');
}

function wrapTitle(value, max = 25, maxLines = 3) {
  const words = String(value || 'GTA news').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,:;!?]+$/, '')}…`;
  }
  return lines;
}

async function downloadImage(url, dest) {
  if (!/^https:\/\//i.test(url || '')) return false;
  try {
    const response = await fetch(url, {headers:{'user-agent':'MaccaBlogInstagram/1.0'}, signal:AbortSignal.timeout(20000)});
    if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '')) return false;
    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length || data.length > 15 * 1024 * 1024) return false;
    await fs.writeFile(dest, data);
    return true;
  } catch (error) {
    console.warn(`Article image unavailable; using Macca artwork: ${error.message}`);
    return false;
  }
}

function renderCard(command, input, output, title, artworkGravity = 'center') {
  const args = [input, '-auto-orient', '-resize', '1080x1080^', '-gravity', artworkGravity, '-background', '#190d25', '-extent', '1080x1080', '-flatten',
    '-fill', 'rgba(9,6,18,0.80)', '-draw', 'rectangle 0,570 1080,1080',
    '-fill', '#00f3ff', '-draw', 'roundrectangle 72,630 150,640 5,5',
    '-gravity', 'northwest', '-font', 'DejaVu-Sans-Bold', '-pointsize', '27', '-fill', '#00f3ff', '-annotate', '+72+700', 'MACCA BLOG  •  GTA NEWS',
    '-font', 'DejaVu-Sans-Bold', '-pointsize', '50', '-fill', '#ffffff'];
  const lines = wrapTitle(title);
  lines.forEach((line, index) => args.push('-annotate', `+72+${790 + index * 77}`, line));
  args.push('-font', 'DejaVu-Sans', '-pointsize', '23', '-fill', '#f4e9fa', '-annotate', '+72+1034', 'Read the full story at macca-lab.onrender.com', '-strip', '-quality', '88', '-sampling-factor', '4:2:0', output);
  const result = spawnSync(command, args, {encoding:'utf8', maxBuffer:2*1024*1024});
  if (result.error || result.status !== 0) throw new Error(`Could not compose Instagram artwork: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
}

async function prepare() {
  let queue = await safeJson(QUEUE_FILE, []);
  if (!Array.isArray(queue)) throw new Error('blog/instagram-queue.json must contain a JSON array.');
  if (process.env.INSTAGRAM_RETRY_ONLY_FIRST === 'true') queue = queue.slice(0, 1);
  if (!queue.length) { console.log('No new articles to prepare for Instagram.'); return; }
  const posts = await safeJson(POSTS_FILE, []);
  const pending = [];
  const forceRegenerate = process.env.INSTAGRAM_FORCE_REGENERATE === 'true';
  if (forceRegenerate) pending.push(...queue);
  else for (const item of queue) {
    try { await fs.access(path.join(ROOT, 'blog', item.slug, 'instagram.jpg')); }
    catch { pending.push(item); }
  }
  if (!pending.length) { console.log('All queued Instagram images already exist.'); return; }
  const command = imageConverter();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'macca-instagram-'));
  try {
    for (const {slug} of pending) {
      const post = posts.find(item => item.slug === slug);
      if (!post) throw new Error(`Instagram queue references missing blog article: ${slug}`);
      const localInput = path.join(tempDir, 'article-image');
      const fromArticle = await downloadImage(post.thumbnail || post.inlineImages?.[0]?.url, localInput);
      const input = fromArticle ? localInput : path.join(ROOT, 'images', 'macca-blog-banner.webp');
      const output = path.join(ROOT, 'blog', slug, 'instagram.jpg');
      await fs.mkdir(path.dirname(output), {recursive:true});
      renderCard(command, input, output, post.title, fromArticle ? 'center' : 'east');
      console.log(`Prepared ${output} (${fromArticle ? 'article image' : 'Macca artwork'} + title).`);
    }
  } finally { await fs.rm(tempDir, {recursive:true, force:true}); }
}

async function graphGet(host, resource, fields, version = GRAPH_VERSION) {
  const url = new URL(`https://${host}/${version}/${resource}`);
  if (fields) url.searchParams.set('fields', fields);
  const response = await fetch(url, {headers:{authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(20000)});
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const error = body.error;
    throw new Error(`${error?.message || `Meta Graph API returned HTTP ${response.status}`}${error?.code ? ` (code ${error.code}${error.error_subcode ? `, subcode ${error.error_subcode}` : ''})` : ''}`);
  }
  return body;
}

async function resolveAccount() {
  try {
    const user = await graphGet('graph.instagram.com', 'me', 'user_id,username');
    const id = user.user_id || user.id;
    if (id) return {host:'graph.instagram.com', id, username:user.username || ''};
  } catch (error) { console.log(`Instagram Login token check: ${error.message}`); }
  try {
    const page = await graphGet('graph.facebook.com', 'me', 'id,name,instagram_business_account', 'v26.0');
    const instagramId = page.instagram_business_account?.id;
    if (instagramId) {
      console.log(`Facebook Page resolved: ${page.id || 'unknown'}; Instagram Business Account: ${instagramId}.`);
      return {host:'graph.facebook.com', id:instagramId, username:page.instagram_business_account.username || ''};
    }
    console.log('Facebook Page token resolved, but /me did not return instagram_business_account; trying the linked Pages lookup.');
  } catch (error) { console.log(`Facebook Page token check: ${error.message}`); }
  // Page Access Tokens are not user tokens: Meta's Page lookup flow requires a
  // user token, while publishing endpoints accept the Page token. If the
  // account IDs are already configured, use those directly without requiring
  // additional read permissions or attempting to exchange the token.
  if (configuredInstagramId) {
    console.log(`Using configured Instagram Business Account ${configuredInstagramId}${configuredPageId ? ` for Page ${configuredPageId}` : ''} with the Page Access Token.`);
    return {host:'graph.facebook.com', id:configuredInstagramId, username:''};
  }
  try {
    const pages = await graphGet('graph.facebook.com', 'me/accounts', 'id,name,instagram_business_account{id,username}');
    for (const page of pages.data || []) {
      if (page.instagram_business_account?.id) return {host:'graph.facebook.com', id:page.instagram_business_account.id, username:page.instagram_business_account.username || ''};
    }
  } catch (error) { console.log(`Facebook Login token check: ${error.message}`); }
  throw new Error('Could not resolve a professional Instagram account from INSTAGRAM_ACCESS_TOKEN. Confirm account type, token validity, linked Facebook Page when applicable, and publishing permissions.');
}

async function graphPost(host, resource, params) {
  const response = await fetch(`https://${host}/${GRAPH_VERSION}/${resource}`, {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({...params, access_token:token}), signal:AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const error = body.error;
    throw new Error(`${error?.message || `Meta Graph API returned HTTP ${response.status}`}${error?.code ? ` (code ${error.code}${error.error_subcode ? `, subcode ${error.error_subcode}` : ''})` : ''}`);
  }
  return body;
}


async function trendingAudioConfiguration() {
  const audioToken = process.env.INSTAGRAM_AUDIO_ACCESS_TOKEN || token;
  if (!audioToken) throw new Error('Instagram Audio API token is not configured.');
  let lastError = '';
  for (const audioType of ['music', 'original_sound']) {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/ig_audio`);
    url.searchParams.set('audio_type', audioType);
    url.searchParams.set('access_token', audioToken);
    const response = await fetch(url, {signal:AbortSignal.timeout(20000)});
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const error = body.error || {};
      lastError = `${error.message || `HTTP ${response.status}`}${error.code ? ` (code ${error.code})` : ''}`;
      continue;
    }
    const rows = Array.isArray(body.data) ? body.data : [];
    const selected = rows.find(item => String(item?.audio_id || item?.id || '').trim());
    if (!selected) continue;
    const audioId = String(selected.audio_id || selected.id);
    const title = selected.title || selected.name || '';
    const artist = selected.display_artist || selected.artist || '';
    console.log(`Instagram trending audio selected from Meta: ${[title, artist].filter(Boolean).join(' - ') || audioId} (${audioType}).`);
    return JSON.stringify({
      audio_id: audioId,
      audio_volume: Math.max(0, Math.min(100, Number(process.env.INSTAGRAM_TREND_AUDIO_VOLUME || 100))),
      video_volume: Math.max(0, Math.min(100, Number(process.env.INSTAGRAM_VIDEO_AUDIO_VOLUME || 25)))
    });
  }
  throw new Error(`Instagram Audio API returned no usable trending audio${lastError ? `: ${lastError}` : ''}. Reel retained for retry.`);
}

function caption(post) {
  const hook = String(post.instagramCaptionLead || post.socialHook || post.title || '').replace(/\s+/g, ' ').trim();
  const context = String(post.description || '').replace(/\s+/g, ' ').trim();
  const text = `${post.title || ''} ${(post.tags || []).join(' ')}`.toLowerCase();
  const hashtags = [
    /gta\s*6|gta\s*vi|grand theft auto\s*(?:6|vi)/i.test(text) ? '#GTA6' : '#GTA',
    '#RockstarGames',
    '#MaccaTheGator',
  ];
  const summary = [hook, context && context !== hook ? context : ''].filter(Boolean).join('\n\n').slice(0, 850);
  return `${summary}\n\nFull story → link in bio.\nMacca Blog: ${BASE}/social/?utm_source=instagram&utm_medium=reel&utm_campaign=macca_reel\n\n${[...new Set(hashtags)].join(' ')}`.slice(0, 1400);
}

async function waitForPublicImage(url) {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const response = await fetch(url, {method:'HEAD', redirect:'follow', signal:AbortSignal.timeout(15000)});
      if (response.ok && /^image\/jpeg/i.test(response.headers.get('content-type') || '')) return;
      console.log(`Waiting for deployed Instagram image (${attempt}/30, HTTP ${response.status || 'unknown'}).`);
    } catch { console.log(`Waiting for deployed Instagram image (${attempt}/30).`); }
    await delay(10000);
  }
  throw new Error(`The public JPEG did not become available: ${url}`);
}

async function waitForPublicVideo(url) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const response = await fetch(url, {method:'HEAD', redirect:'follow', signal:AbortSignal.timeout(15000)});
      if (response.ok && /^video\/mp4/i.test(response.headers.get('content-type') || '')) return;
      console.log(`Waiting for temporary Reel video (${attempt}/20, HTTP ${response.status || 'unknown'}).`);
    } catch { console.log(`Waiting for temporary Reel video (${attempt}/20).`); }
    await delay(5000);
  }
  throw new Error(`Temporary Reel MP4 is not publicly reachable as video/mp4: ${url}`);
}

async function waitForContainer(host, containerId) {
  let status = null;
  for (let attempt = 1; attempt <= 30; attempt++) {
    const result = await graphGet(host, containerId, 'status_code,status');
    status = result.status_code;
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Instagram media processing ended with ${status}: ${result.status || 'no further details'}`);
    console.log(`Waiting for Instagram media processing (${attempt}/30, ${status || 'pending'}).`);
    await delay(5000);
  }
  throw new Error(`Instagram media container did not finish processing (last status: ${status || 'unknown'}).`);
}

async function inspectQueue() {
  const queue = await safeJson(QUEUE_FILE, []);
  if (!Array.isArray(queue)) throw new Error('blog/instagram-queue.json must contain a JSON array.');
  let needsArtwork = process.env.INSTAGRAM_FORCE_REGENERATE === 'true' && queue.length > 0;
  const itemsToPublish = process.env.INSTAGRAM_RETRY_ONLY_FIRST === 'true' ? queue.slice(0, 1) : queue;
  for (const {slug} of itemsToPublish) {
    try { await fs.access(path.join(ROOT, 'blog', slug, 'instagram.jpg')); }
    catch { needsArtwork = true; break; }
  }
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `needs_artwork=${needsArtwork ? 'true' : 'false'}\n`);
  console.log(`${queue.length} article(s) pending on Instagram; new artwork ${needsArtwork ? 'is' : 'is not'} required.`);
}

async function publishingQuotaHeadroom(account) {
  try {
    const result = await graphGet(
      account.host,
      `${account.id}/content_publishing_limit`,
      'quota_usage,config'
    );
    const row = Array.isArray(result?.data) ? result.data[0] : null;
    const usage = Number(row?.quota_usage);
    const total = Number(row?.config?.quota_total);
    if (Number.isFinite(usage) && Number.isFinite(total) && total > 0) {
      const headroom = Math.max(0, total - usage);
      console.log(`Instagram API publishing quota: ${usage}/${total} used; ${headroom} remaining in the rolling window.`);
      return headroom;
    }
  } catch (error) {
    console.warn(`Instagram publishing quota could not be read; using the stricter local cap: ${error.message}`);
  }
  return Number.POSITIVE_INFINITY;
}

async function findExisting(host, accountId, storyUrl, published, title) {
  if (published[storyUrl]) return published[storyUrl];
  try {
    const media = await graphGet(host, `${accountId}/media`, 'id,caption,permalink,timestamp');
    return (media.data || []).find(item => item.caption?.includes(storyUrl) || (title && item.caption?.includes(title))) || null;
  } catch (error) {
    console.warn(`Could not check recent Instagram posts before publishing: ${error.message}`);
    return null;
  }
}

async function publish() {
  const queue = await safeJson(QUEUE_FILE, []);
  if (!Array.isArray(queue) || !queue.length) { console.log('No new articles to publish to Instagram.'); return; }
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured in GitHub Actions secrets.');
  const posts = await safeJson(POSTS_FILE, []);
  const published = await safeJson(PUBLISHED_FILE, {});
  const reelManifest = await safeJson(REEL_MANIFEST_FILE, {videos:{}});
  const account = await resolveAccount();
  if (account.username) console.log(`Instagram account resolved: @${account.username} through ${account.host}`);
  const retryOnlyFirst = process.env.INSTAGRAM_RETRY_ONLY_FIRST === 'true';
  const apiHeadroom = await publishingQuotaHeadroom(account);
  if (apiHeadroom <= 0) {
    console.log(`Instagram API publishing quota is exhausted; ${queue.length} queued item(s) retained.`);
    return;
  }
  const ranked = rankedQueue(queue);
  const itemsToPublish = ranked.slice(0, 1);
  for (const queued of itemsToPublish) {
    if ((await publishingQuotaHeadroom(account)) <= 0) {
      console.log('Instagram API publishing quota is exhausted; remaining items stay queued.');
      break;
    }
    const {slug} = queued;
    const publicationKey = queued.publicationKey || slug;
    const forceRepublish = queued.forceRepublish === true;
    const post = posts.find(item => item.slug === slug);
    if (!post) throw new Error(`Instagram queue references missing blog article: ${slug}`);
    const storyUrl = `${BASE}/blog/${encodeURIComponent(slug)}/`;
    // Meta's documented Reels Publishing request currently uses the Facebook
    // Login / Page-token flow. Do not send it through an Instagram Login host.
    const reelUrl = account.host === 'graph.facebook.com' ? (reelManifest.videos?.[slug]?.reelUrl || '') : '';
    if (!reelUrl) {
      console.warn(`Reel video is unavailable for ${slug}; retaining the item in the Instagram queue for retry instead of falling back to an image post.`);
      continue;
    }
    await waitForPublicVideo(reelUrl);
    const existing = forceRepublish ? null : await findExisting(account.host, account.id, storyUrl, published, post.title);
    if (existing) {
      published[storyUrl] = {articleUrl:storyUrl, publicationKey, mediaId:existing.mediaId || existing.id, permalink:existing.permalink || '', publishedAt:existing.publishedAt || existing.timestamp || new Date().toISOString()};
      console.log(`Already present on Instagram; recording ${storyUrl}`);
      await saveJson(PUBLISHED_FILE, published);
      const remaining = queue.filter(item => (item.publicationKey || item.slug) !== publicationKey);
      await saveJson(QUEUE_FILE, remaining);
      queue.splice(0, queue.length, ...remaining);
      continue;
    }
    const audioConfiguration = await trendingAudioConfiguration();
    const container = await graphPost(account.host, `${account.id}/media`, {
      media_type:'REELS',
      video_url:reelUrl,
      caption:caption(post),
      share_to_feed:'false',
      audio_configuration:audioConfiguration
    });
    if (!container.id) throw new Error('Meta did not return a media container ID.');
    await waitForContainer(account.host, container.id);
    const media = await graphPost(account.host, `${account.id}/media_publish`, {creation_id:container.id});
    if (!media.id) throw new Error('Meta did not return a published media ID.');
    let permalink = '';
    try { permalink = (await graphGet(account.host, media.id, 'permalink')).permalink || ''; } catch {}
    const publishedKey = forceRepublish ? `${storyUrl}::${publicationKey}` : storyUrl;
    published[publishedKey] = {articleUrl:storyUrl, publicationKey, mediaId:media.id, permalink, mediaType:'REELS', socialScore:Number(queued.socialScore || 0), publishedAt:new Date().toISOString()};
    await saveJson(PUBLISHED_FILE, published);
    const remaining = queue.filter(item => (item.publicationKey || item.slug) !== publicationKey);
    await saveJson(QUEUE_FILE, remaining);
    queue.splice(0, queue.length, ...remaining);
    console.log(`Published ${slug} to Instagram as Reel (${media.id})${permalink ? `: ${permalink}` : ''}`);
  }
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'inspect') await inspectQueue();
else if (command === 'publish') await publish();
else throw new Error('Usage: node scripts/instagram.mjs <inspect|prepare|publish>');
