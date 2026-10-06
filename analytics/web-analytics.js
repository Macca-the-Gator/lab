(() => {
  async function trackAggregatedGeoVisit() {
    const hostname = location.hostname.toLowerCase();
    const sessionKey = 'macca.geoVisitTracked';
    if (hostname !== 'macca-lab.onrender.com' || navigator.globalPrivacyControl === true || typeof fetch !== 'function') return {tracked:false};
    try {
      if (!sessionStorage || sessionStorage.getItem(sessionKey)) return {tracked:false,reason:'session_already_counted'};
    } catch { return {tracked:false,reason:'session_storage_unavailable'}; }
    try {
      const response = await fetch('https://api.pklavc.com/analytics/visit?site=macca', {method:'POST',mode:'cors',credentials:'omit',keepalive:true});
      if (!response.ok) throw new Error('visit_failed');
      try { sessionStorage.setItem(sessionKey, '1'); } catch {}
      return {tracked:true};
    } catch { return {tracked:false,reason:'request_failed'}; }
  }
  window.MaccaGeoVisitReady = trackAggregatedGeoVisit();
})();

(() => {
  if (document.querySelector('script[data-cf-beacon]')) return;
  fetch('/analytics/web-analytics.json', {cache:'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      const token = typeof config?.token === 'string' ? config.token.trim() : '';
      if (!/^[a-f0-9]{16,64}$/i.test(token)) return;
      const script = document.createElement('script');
      script.defer = true;
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      script.setAttribute('data-cf-beacon', JSON.stringify({token}));
      document.head.append(script);
    })
    .catch(() => {});
})();
