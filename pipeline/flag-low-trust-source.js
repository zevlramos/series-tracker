const LOW_TRUST_PATTERNS = [
  /\breddit\.com\b/i,
  /\bforums?\b/i,
  /\bgamefaqs\.com\b/i,
  /\bblogspot\b/i,
  /\bwordpress\.com\b/i,
  /\btumblr\.com\b/i,
  /\bquora\.com\b/i,
  /\byahoo\.com\/answers\b/i,
];

export function hasOnlyLowTrustSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return true;
  return sources.every(url => LOW_TRUST_PATTERNS.some(p => p.test(url)));
}
