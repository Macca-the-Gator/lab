/**
 * Offline editorial guards for Macca's short, independently sourced GTA/Rockstar news.
 * These are intentionally lighter than PkLavc's long-form Tech rules.
 * They do not require additional AI calls, dependencies or paid services.
 */
const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const meaningful = text => String(text || '').trim();

export function articleQualityIssue(draft, {leadTitle = ''} = {}) {
  if (!draft || typeof draft !== 'object') return 'missing article JSON';
  if (draft.skip === true) return null; // A skipped/irrelevant story is not an invalid response.
  if (meaningful(draft.title).length < 15) return 'article title is missing or too short';
  if (!Array.isArray(draft.sections) || draft.sections.length < 2) return 'at least two substantive news sections required';

  let total = 0;
  for (const section of draft.sections) {
    const heading = meaningful(section?.heading);
    if (!heading || /^(?:none|null|undefined|untitled)$/i.test(heading)) {
      return 'each news section needs a descriptive heading';
    }
    if (!Array.isArray(section.paragraphs) || !section.paragraphs.length) {
      return 'news section is missing paragraph text';
    }
    const prose = section.paragraphs.map(meaningful).join(' ');
    const count = words(prose);
    if (count < 25) return 'section "' + heading + '" is too short (' + count + ' words; minimum 25)';
    if (/<\/?(?:p|div|script|section|h[1-6])\b/i.test(prose)) return 'news copy contains raw HTML markup';
    total += count;
  }
  if (total < 100) return 'news article is too short (' + total + ' words; minimum 100)';

  const reported = /\b(?:rumou?rs?|leaks?|alleged|reportedly|reports?|claims?|unconfirmed)\b/i.test(leadTitle);
  if (reported) {
    const prose = draft.sections.flatMap(section => section.paragraphs).join(' ');
    if (!/\b(?:according to|reported by|reports?|rumou?rs?|leaks?|alleged|claims?|unconfirmed|source|journalist|publication)\b/i.test(prose)) {
      return 'reported or leaked news needs explicit source attribution or uncertainty';
    }
    if (/\b(?:rockstar(?:\s+games)?|take[- ]two)\s+(?:has\s+)?(?:confirmed|announced|revealed)\b/i.test(prose)
        && !/\b(?:not|never)\s+(?:been\s+)?confirmed\b/i.test(prose)) {
      return 'a third-party report cannot be written as Rockstar confirmation';
    }
  }
  return null;
}

export function selectCandidate(ranked, forced, skippedLinks = new Set()) {
  const available = ranked.filter(item => !skippedLinks.has(item.link));
  if (forced && !skippedLinks.has(forced.link)) {
    return available.find(item => item.link === forced.link) || forced;
  }
  return available[0] || null;
}

export function retryAnotherCandidate(skippedCount, candidateLimit = 3) {
  return skippedCount < Math.min(5, Math.max(1, candidateLimit));
}
