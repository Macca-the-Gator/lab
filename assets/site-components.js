const AFFILIATE_SESSION_KEY = 'macca:affiliate-session:v1';
const affiliateEventBuffer = new Map();
let affiliateAnalyticsBase = '';
let affiliateScores = {};
let affiliateFlushTimer = null;
let affiliateAnalyticsPromise = null;

function affiliateSessionState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AFFILIATE_SESSION_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAffiliateSessionState(state) {
  try { sessionStorage.setItem(AFFILIATE_SESSION_KEY, JSON.stringify(state)); } catch { /* optional */ }
}

function affiliateKey(ad) {
  return String(ad.theme || ad.headline || ad.label || ad.href || 'ad').slice(0, 120);
}

function scheduleAffiliateFlush() {
  if (affiliateFlushTimer) return;
  affiliateFlushTimer = window.setTimeout(() => {
    affiliateFlushTimer = null;
    flushAffiliateEvents();
  }, 15000);
}

function queueAffiliateAnalytics(ad, kind, placement = '') {
  const event = {
    creative: affiliateKey(ad),
    kind,
    placement: String(placement || '').slice(0, 80),
    context: String(document.body?.dataset?.adContext || '').slice(0, 160),
    path: location.pathname.slice(0, 180),
  };
  const key = JSON.stringify(event);
  affiliateEventBuffer.set(key, (affiliateEventBuffer.get(key) || 0) + 1);
  if (affiliateEventBuffer.size >= 8) flushAffiliateEvents();
  else scheduleAffiliateFlush();
}

function flushAffiliateEvents({beacon = false} = {}) {
  if (!affiliateAnalyticsBase || !affiliateEventBuffer.size) return;
  const events = [...affiliateEventBuffer.entries()].slice(0, 50).map(([key, count]) => ({
    ...JSON.parse(key),
    count,
  }));
  for (const [key] of [...affiliateEventBuffer.entries()].slice(0, 50)) affiliateEventBuffer.delete(key);
  const url = `${affiliateAnalyticsBase}/analytics/affiliate`;
  const body = JSON.stringify({events});
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], {type:'application/json'}));
    return;
  }
  fetch(url, {method:'POST', headers:{'content-type':'application/json'}, body, keepalive:true}).catch(() => {});
}

async function loadAffiliateAnalytics() {
  if (affiliateAnalyticsPromise) return affiliateAnalyticsPromise;
  affiliateAnalyticsPromise = (async () => {
    try {
      const configResponse = await fetch('/skylet/config.json', {cache:'no-store'});
      if (!configResponse.ok) return;
      const config = await configResponse.json();
      affiliateAnalyticsBase = typeof config.apiBase === 'string' ? config.apiBase.replace(/\/$/, '') : '';
      if (!affiliateAnalyticsBase) return;
      const scoreResponse = await fetch(`${affiliateAnalyticsBase}/analytics/affiliate-scores`, {cache:'no-store'});
      if (!scoreResponse.ok) return;
      const payload = await scoreResponse.json();
      affiliateScores = payload?.scores && typeof payload.scores === 'object' ? payload.scores : {};
    } catch {
      affiliateAnalyticsBase = '';
      affiliateScores = {};
    }
  })();
  return affiliateAnalyticsPromise;
}

function recordAffiliateEvent(ad, kind, placement = '') {
  const state = affiliateSessionState();
  const key = affiliateKey(ad);
  const current = state[key] || {impressions:0, clicks:0};
  if (kind === 'impression') current.impressions += 1;
  if (kind === 'click') current.clicks += 1;
  state[key] = current;
  saveAffiliateSessionState(state);
  queueAffiliateAnalytics(ad, kind, placement);
}

function affiliateSessionLift(ad) {
  const current = affiliateSessionState()[affiliateKey(ad)];
  if (!current || current.impressions < 3) return 0;
  const smoothedCtr = (current.clicks + 0.5) / (current.impressions + 5);
  return Math.max(-0.35, Math.min(1.25, (smoothedCtr - 0.08) * 5));
}

function affiliateGlobalLift(ad) {
  const score = affiliateScores[affiliateKey(ad)];
  if (!score || Number(score.impressions || 0) < 100) return 0;
  return Math.max(-0.4, Math.min(1.5, Number(score.lift) || 0));
}

function observeAffiliateImpression(slot, link, ad) {
  if (!('IntersectionObserver' in window)) return;
  if (slot._maccaAdObserver) slot._maccaAdObserver.disconnect();
  if (slot._maccaAdImpressionTimer) window.clearTimeout(slot._maccaAdImpressionTimer);
  const observer = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5);
    if (!visible || link.dataset.impressionRecorded === '1') return;
    slot._maccaAdImpressionTimer = window.setTimeout(() => {
      if (!document.contains(link) || link.dataset.impressionRecorded === '1') return;
      link.dataset.impressionRecorded = '1';
      recordAffiliateEvent(ad, 'impression', slot.dataset.contentUnit || '');
    }, 1000);
  }, {threshold:[0.5]});
  observer.observe(link);
  slot._maccaAdObserver = observer;
}

function mountPklavcPopup() {
  const acceptedKey = 'macca:pklavc-blog-accepted';
  const dismissedKey = 'macca:pklavc-blog-dismissed-at';
  let accepted = false;
  let dismissedRecently = false;
  try {
    accepted = localStorage.getItem(acceptedKey) === '1';
    const dismissedAt = Number(localStorage.getItem(dismissedKey) || 0);
    dismissedRecently = dismissedAt > 0 && Date.now() - dismissedAt < 24 * 60 * 60 * 1000;
    if (dismissedAt && !dismissedRecently) localStorage.removeItem(dismissedKey);
  } catch {
    // Keep the popup usable when browser storage is unavailable.
  }
  if (accepted || dismissedRecently) return;

  let shown = false;
  const showAtScrollDepth = () => {
    if (shown) return;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (window.scrollY / scrollable < 0.35) return;
    shown = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'pklavc-partner-modal-backdrop';
    backdrop.innerHTML = `<section class="pklavc-partner-modal" role="dialog" aria-modal="true" aria-labelledby="pklavc-partner-modal-title" aria-describedby="pklavc-partner-modal-description"><button class="pklavc-partner-modal-close" type="button" aria-label="Close advertisement">&times;</button><div class="pklavc-partner-modal-copy"><p class="eyebrow">FROM OUR PARTNER</p><h2 id="pklavc-partner-modal-title">Curious minds, meet PKLAVC.</h2><p id="pklavc-partner-modal-description">Explore the PKLAVC Blog for technology, engineering, open-source projects, and more.</p><a class="pklavc-partner-modal-link" href="https://pklavc.com/blog" target="_blank" rel="sponsored noopener noreferrer">Visit the PKLAVC Blog <span aria-hidden="true">&#8599;</span></a></div><div class="pklavc-partner-modal-art"><img src="/assets/creatives/visual-16.webp" alt="PKLAVC partner artwork" loading="lazy"></div></section>`;
    document.body.append(backdrop);

    const closeButton = backdrop.querySelector('.pklavc-partner-modal-close');
    const close = wasDismissed => {
      if (wasDismissed) {
        try { localStorage.setItem(dismissedKey, String(Date.now())); } catch { /* storage is optional */ }
      }
      backdrop.remove();
      document.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = event => {
      if (event.key === 'Escape') close(true);
    };
    closeButton.addEventListener('click', () => close(true));
    backdrop.querySelector('.pklavc-partner-modal-link').addEventListener('click', () => {
      try { localStorage.setItem(acceptedKey, '1'); } catch { /* storage is optional */ }
      close(false);
    });
    document.addEventListener('keydown', onKeydown);
    closeButton.focus();
  };

  window.addEventListener('scroll', showAtScrollDepth, {passive: true});
}

let adConfigPromise = null;

async function loadAdConfig() {
  if (!adConfigPromise) {
    adConfigPromise = fetch('/assets/site-data.json', {cache: 'no-store'}).then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }
  return adConfigPromise;
}

async function mountAds(root = document) {
  if (root === document) mountPklavcPopup();
  try {
    const [config] = await Promise.all([loadAdConfig(), loadAffiliateAnalytics()]);
    const placements = [...root.querySelectorAll('[data-content-unit]')]
      .filter(slot => slot.dataset.unitRendered !== '1')
      .map(slot => {
        const name = slot.dataset.contentUnit;
        const source = name === 'side-mix'
          ? [...(config.slots?.['side-owner'] || []), ...(config.slots?.['side-rotating'] || [])]
          : name.startsWith('side-owner')
            ? config.slots?.['side-owner']
            : name.startsWith('side-rotating')
              ? config.slots?.['side-rotating']
              : name.startsWith('dock-item')
                ? config.slots?.['dock-item']
                : name.startsWith('article-unit')
                  ? [...(config.slots?.['article-unit'] || []), ...(config.slots?.['side-rotating'] || [])]
                  : config.slots?.[name];
        return {slot, ads: (source || []).filter(ad => ad.enabled && ad.href && ad.image)};
      })
      .filter(placement => placement.ads.length);
    if (!placements.length) return;

    const render = (slot, ad) => {
        const link = document.createElement('a');
        link.href = ad.href;
        link.target = '_blank';
        link.rel = 'sponsored noopener noreferrer';
        link.className = 'sponsor-card';
        if (ad.theme && /^[a-z0-9-]+$/.test(ad.theme)) {
          link.classList.add(`sponsor-theme-${ad.theme}`);
        }

        const copy = document.createElement('span');
        copy.className = 'sponsor-copy';
        const kicker = document.createElement('span');
        kicker.className = 'sponsor-kicker';
        kicker.textContent = ad.kicker || 'MACCA BLOG PRESENTS';
        const headline = document.createElement('strong');
        headline.textContent = ad.headline || ad.label || 'Advertisement';
        const description = document.createElement('span');
        description.className = 'sponsor-description';
        description.textContent = ad.description || ad.alt || 'Visit pklavc.com';
        copy.append(kicker, headline, description);

        const art = document.createElement('span');
        art.className = 'sponsor-art';
        const image = document.createElement('img');
        image.src = ad.image;
        image.alt = ad.alt || 'Macca partner artwork';
        image.loading = 'lazy';
        art.append(image);
        link.append(copy, art);
        link.addEventListener('click', () => {
          recordAffiliateEvent(ad, 'click', slot.dataset.contentUnit || '');
          flushAffiliateEvents();
        }, {once:true});
        slot.replaceChildren(link);
        slot.dataset.unitRendered = '1';
        observeAffiliateImpression(slot, link, ad);
    };

    const stickyPlacements = placements.filter(({slot}) => slot.dataset.contentUnit.startsWith('dock-item'));
    const regularPlacements = placements.filter(({slot}) => !slot.dataset.contentUnit.startsWith('dock-item'));
    const contextText = String(document.body.dataset.contentContext || '').toLowerCase();

    const affinity = ad => {
      const theme = String(ad.theme || '').toLowerCase();
      const headline = String(ad.headline || ad.label || '').toLowerCase();
      let score = Math.random() * 0.35;
      const gaming = /gta|rockstar|gaming|gameplay|console|ps5|xbox|pc|vehicle|map|graphics|performance/.test(contextText);
      const security = /hack|breach|security|privacy|leak|cyber|shinyhunters/.test(contextText);
      const shopping = /collector|edition|merch|preorder|pre-order|price|product|case|accessor/.test(contextText);
      const mobile = /mobile|phone|android|ios|handheld/.test(contextText);
      if (gaming && /redmagic|nubia|geekbuying|govee|sunsky/.test(theme + ' ' + headline)) score += 4;
      if (security && /hidemyname|turbovpn|vpn/.test(theme + ' ' + headline)) score += 5;
      if (shopping && /aliexpress|alibaba|gshopper|sunsky|icases|geekbuying/.test(theme + ' ' + headline)) score += 4;
      if (mobile && /redmagic|nubia|icases|sunsky/.test(theme + ' ' + headline)) score += 3;
      if (!gaming && !security && !shopping && !mobile) {
        if (/redmagic|geekbuying|aliexpress|gshopper/.test(theme + ' ' + headline)) score += 1;
      }
      score += affiliateSessionLift(ad);
      score += affiliateGlobalLift(ad);
      return score;
    };

    const rankedAds = ads => [...ads].sort((a, b) => affinity(b) - affinity(a));
    const contextualAd = (ads, excluded = new Set()) => {
      const available = ads.filter(ad => !excluded.has(ad.href));
      const pool = rankedAds(available.length ? available : ads).slice(0, Math.min(4, ads.length));
      return pool[Math.floor(Math.random() * Math.max(1, pool.length))] || ads[0];
    };
    const scheduleRotation = (slot, advance) => {
      let visible = false;
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.35);
        }, {threshold:[0.35]});
        observer.observe(slot);
      } else {
        visible = true;
      }
      const tick = () => {
        const delay = 20000 + Math.random() * 10000;
        window.setTimeout(() => {
          if (visible && document.visibilityState === 'visible' && document.contains(slot)) advance();
          if (document.contains(slot)) tick();
        }, delay);
      };
      tick();
    };

    for (const {slot, ads} of regularPlacements) {
      let current = contextualAd(ads);
      let index = ads.indexOf(current);
      render(slot, current);
      if (ads.length > 1) {
        const advance = () => {
          const candidates = ads.filter((_, candidateIndex) => candidateIndex !== index);
          const nextAd = contextualAd(candidates);
          index = ads.indexOf(nextAd);
          render(slot, nextAd);
        };
        scheduleRotation(slot, advance);
      }
    }

    const occupied = new Set();
    for (const placement of stickyPlacements) {
      const uniqueAds = placement.ads.filter(ad => !occupied.has(ad.href));
      placement.currentAd = contextualAd(uniqueAds.length ? uniqueAds : placement.ads);
      occupied.add(placement.currentAd.href);
      render(placement.slot, placement.currentAd);
    }
    for (const placement of stickyPlacements) {
      if (placement.ads.length < 2) continue;
      const advance = () => {
        const usedByOtherBanners = new Set(stickyPlacements
          .filter(other => other !== placement && other.currentAd)
          .map(other => other.currentAd.href));
        let available = placement.ads.filter(ad => !usedByOtherBanners.has(ad.href));
        const alternatives = available.filter(ad => ad.href !== placement.currentAd.href);
        if (alternatives.length) available = alternatives;
        if (!available.length) return;
        placement.currentAd = contextualAd(available, usedByOtherBanners);
        render(placement.slot, placement.currentAd);
      };
      scheduleRotation(placement.slot, advance);
    }
    if (document.querySelector('.fixed-content-dock')) document.body.classList.add('has-fixed-content-dock');
  } catch (error) {
    console.warn('Ad configuration unavailable', error);
  }
}

document.addEventListener('DOMContentLoaded', () => mountAds(document));
document.addEventListener('macca:content-added', event => {
  const root = event.detail?.root;
  if (root && root.querySelectorAll) mountAds(root);
});
window.addEventListener('pagehide', () => flushAffiliateEvents({beacon:true}));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushAffiliateEvents({beacon:true});
});
