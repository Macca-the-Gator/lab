#!/usr/bin/env node
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = path => fs.readFile(path, 'utf8');

const [
  adsTxt, blog, seo, ads, engagement, instagram, instagramMetrics, queue, socialVideo,
  shorts, ytMetrics, ytWorkflow, igWorkflow, weeklyWorkflow, dailyWorkflow,
  growth, searchConsole, searchWorkflow, searchOptimizeWorkflow, indexNow, indexWorkflow,
  worker, wrangler, webAnalyticsLoader, webAnalyticsWorkflow, covers, growthCss, siteComponentsCss, siteComponentsJs, blogIndex, visitorsPage, visitorMapJs
] = await Promise.all([
  read('ads.txt'),
  read('scripts/blog.mjs'),
  read('scripts/build-seo.mjs'),
  read('assets/site-components.js'),
  read('blog/assets/engagement.js'),
  read('scripts/instagram.mjs'),
  read('scripts/instagram_metrics.mjs'),
  read('scripts/youtube_queue.py'),
  read('scripts/social_video.py'),
  read('src/youtube/shorts.py'),
  read('scripts/youtube_metrics.py'),
  read('.github/workflows/youtube-metrics.yml'),
  read('.github/workflows/instagram-metrics.yml'),
  read('.github/workflows/youtube-weekly.yml'),
  read('.github/workflows/daily-analysis.yml'),
  read('scripts/growth_v2.mjs'),
  read('scripts/search_console.py'),
  read('.github/workflows/search-console.yml'),
  read('.github/workflows/search-optimize.yml'),
  read('scripts/indexnow.mjs'),
  read('.github/workflows/indexnow.yml'),
  read('skylet/worker/src/index.js'),
  read('skylet/worker/wrangler.toml'),
  read('analytics/web-analytics.js'),
  read('.github/workflows/web-analytics.yml'),
  read('scripts/article_covers.py'),
  read('blog/assets/growth.css'),
  read('assets/site-components.css'),
  read('assets/site-components.js'),
  read('blog/index.html'),
  read('visitors/index.html'),
  read('assets/visitor-map.js'),
]);

assert.match(adsTxt, /google\.com, pub-7821352420515145, DIRECT, f08c47fec0942fa0/);
for (const source of [blog, seo]) {
  assert.doesNotMatch(source, /ca-pub-1038995366418919/);
  assert.doesNotMatch(source, /pagead2\.googlesyndication\.com/);
}
assert.match(blog, /ADSENSE_SCRIPT = ''/);
assert.match(seo, /ADSENSE_SCRIPT=''/);

assert.match(blog, /youtubeTitle/);
assert.match(blog, /socialHook/);
assert.match(blog, /instagramCaptionLead/);
assert.match(blog, /seoTitle/);
assert.match(blog, /seoDescription/);
assert.match(blog, /NewsArticle/);
assert.match(blog, /BreadcrumbList/);
assert.match(blog, /VideoObject/);
assert.match(blog, /publishingPrinciples/);
assert.match(blog, /isAccessibleForFree:true/);
assert.match(blog, /slice\(0,64\)/);
assert.match(blog, /BLOG_PAGE_SIZE=24/);
assert.match(blog, /archive-pagination/);
assert.match(blog, /noindex, follow/);
assert.match(blog, /youtube-nocookie\.com/);
assert.match(blog, /news-sitemap\.xml/);
assert.match(blog, /sitemap-image\/1\.1/);
assert.match(blog, /<image:image>/);
assert.match(seo, /blog\/news-sitemap\.xml/);
assert.match(seo, /auxiliaryNoindexRoute/);
assert.match(seo, /study\|play/);
assert.match(blog, /observations\.length<20/);
assert.match(blog, /historicalPerformanceBonus/);
assert.match(blog, /function searchIndexable/);
assert.match(blog, /DAILY_ARTICLE_CAP/);
assert.match(blog, /communityOnly/);
assert.match(blog, /publishedAt:new Date\(\)\.toISOString\(\)/);
assert.match(blog, /redditOnly/);
assert.match(blog, /indexablePosts=posts\.filter\(searchIndexable\)/);
assert.match(blog, /searchConsoleBonus/);
assert.match(blog, /data-content-context/);
assert.match(blog, /\/assets\/ui-runtime\.css/);
assert.match(blog, /\/assets\/ui-runtime\.js/);
assert.match(blog, /data-content-slot="story-inline-/);
assert.match(blog, /data-content-slot="story-end"/);
assert.match(blog, /data-content-slot="story-side"/);
assert.match(blog, /relatedImage/);
assert.doesNotMatch(blog, /href="\/study\/">Study<\/a>/);
assert.doesNotMatch(blog, /href="\/play\/">Play<\/a>/);
assert.match(blog, /findUpdateTarget/);
assert.match(blog, /status:'updated'/);
assert.match(blog, /queueSocialPublication\(updated,\{update:true\}\)/);
assert.match(blog, /openrouter\/free/);
assert.doesNotMatch(blog, /openrouter\/auto/);
assert.match(blog, /optimizeSearchMetadata/);
assert.match(blog, /discoverImage/);
assert.match(blog, /SOCIAL_MIN_SCORE\|\|50/);

assert.match(growth, /slug:'gta-6\/map'/);
assert.match(growth, /slug:'rockstar-games'/);
assert.match(growth, /buildGrowthPages/);
assert.match(growth, /socialScore/);
assert.match(growth, /utm_campaign','macca_social_hub'/);
assert.match(growth, /New from Macca Blog/);
assert.match(growth, /editorial-policy/);
assert.match(growth, /Corrections & Updates/);
assert.match(growth, /href="\/study\/">Study<\/a>/);
assert.match(growth, /href="\/play\/">Play<\/a>/);
assert.match(growthCss, /\.growth-card>a\{[^}]*grid-template-rows:auto minmax\(0,1fr\)[^}]*align-content:start/);
assert.match(growthCss, /\.growth-card img\{[^}]*height:auto[^}]*aspect-ratio:16\/9/);
assert.match(growthCss, /\.social-story-main\{[^}]*align-items:start/);
assert.match(growthCss, /\.social-story-main img\{[^}]*height:auto[^}]*aspect-ratio:16\/9/);
assert.match(siteComponentsCss, /a\[href="\/study\/"\],a\[href="\/play\/"\]\{display:none!important\}/);
assert.match(siteComponentsJs, /document\.querySelectorAll\('a\[href="\/study\/"\],a\[href="\/play\/"\]'\)/);
assert.doesNotMatch(blogIndex, /href="\/study\/"|href="\/play\/"/);

assert.match(covers, /render_discover/);
assert.match(covers, /1280, 720/);
assert.match(covers, /discoverImage/);
assert.match(covers, /needs_refresh/);

assert.match(ads, /contextText/);
assert.doesNotMatch(ads, /pagead2\.googlesyndication\.com/);
assert.match(ads, /affinity = ad/);
assert.match(ads, /contextualAd/);
assert.match(ads, /AFFILIATE_SESSION_KEY/);
assert.match(ads, /sessionStorage/);
assert.match(ads, /recordAffiliateEvent/);
assert.match(ads, /affiliateGlobalLift/);
assert.match(ads, /analytics\/affiliate-scores/);
assert.match(ads, /20000 \+ Math\.random\(\) \* 10000/);
assert.match(ads, /document\.visibilityState === 'visible'/);
assert.match(ads, /article-unit/);
assert.match(ads, /unitRendered/);
assert.match(ads, /macca:content-added/);
assert.match(engagement, /macca:content-added/);

assert.match(worker, /writeAffiliateAnalytics/);
assert.match(worker, /affiliateScores/);
assert.match(worker, /AFFILIATE_ANALYTICS/);
assert.match(worker, /ANALYTICS_SQL/);
assert.match(wrangler, /analytics_engine_datasets/);
assert.match(wrangler, /dataset = "macca_affiliate"/);
assert.match(wrangler, /\[analytics\]/);

assert.match(webAnalyticsLoader, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
assert.match(webAnalyticsLoader, /api\.pklavc\.com\/analytics\/visit\?site=macca/);
assert.match(webAnalyticsLoader, /MaccaGeoVisitReady/);
assert.match(visitorsPage, /<html lang="en">/);
assert.doesNotMatch(visitorsPage, /hreflang|\/pt\/|\/es\//);
assert.match(visitorMapJs, /api\.pklavc\.com\/analytics\/map\?site=macca/);
assert.match(visitorMapJs, /MaccaGeoVisitReady/);
assert.match(webAnalyticsWorkflow, /rum\/site_info/);
assert.match(blog, /analytics\/web-analytics\.js/);

assert.match(searchConsole, /webmasters\.readonly/);
assert.match(searchConsole, /"discover"/);
assert.match(searchConsole, /"googleNews"/);
assert.match(searchConsole, /topicSignals/);
assert.match(searchWorkflow, /SEARCH_CONSOLE_REFRESH_TOKEN/);
assert.match(searchOptimizeWorkflow, /search-optimize/);

assert.match(indexNow, /api\.indexnow\.org\/indexnow/);
assert.match(indexWorkflow, /Notify IndexNow/);


assert.doesNotMatch(shorts, /Rockstar fans, here is the latest story/);
assert.match(shorts, /Full story .*Macca Blog\. Link on profile\./);
assert.match(shorts, /def create_thumbnail/);

assert.match(queue, /def youtube_title/);
assert.match(queue, /def youtube_tags/);
assert.match(queue, /set_thumbnail/);
assert.doesNotMatch(queue, /DAILY_LIMIT/);
assert.match(queue, /socialScore/);
assert.match(queue, /publicationKey/);
assert.match(queue, /utm_source=youtube/);

assert.doesNotMatch(socialVideo, /INSTAGRAM_DAILY_LIMIT/);
assert.doesNotMatch(socialVideo, /YOUTUBE_DAILY_LIMIT/);
assert.match(socialVideo, /_ranked/);

assert.match(instagram, /retaining the item in the Instagram queue for retry/);
assert.doesNotMatch(instagram, /image_url:imageUrl/);
assert.match(instagram, /share_to_feed:'false'/);
assert.doesNotMatch(instagram, /DAILY_LIMIT/);
assert.match(instagram, /content_publishing_limit/);
assert.match(instagram, /quota_usage,config/);
assert.match(instagram, /publicationKey/);
assert.match(instagram, /utm_source=instagram/);
assert.match(instagramMetrics, /record\?\.articleUrl \|\| publicationKey\.split/);

assert.match(ytMetrics, /dimensions="day"/);
assert.match(ytMetrics, /elapsedVideoTimeRatio/);
assert.match(ytMetrics, /audienceWatchRatio/);
assert.match(ytWorkflow, /daily performance and retention/i);
assert.match(igWorkflow, /Collect Instagram Reel metrics/);
assert.match(weeklyWorkflow, /Macca weekly YouTube recap/);
assert.match(dailyWorkflow, /Macca daily deep analysis/);
assert.match(blog, /generateDeepDive/);
assert.match(blog, /contentType:'analysis'/);

console.log('Growth pipeline checks passed.');
