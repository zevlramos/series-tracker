const LOW_TRUST_HOSTS = [
  'reddit.com',
  'gamefaqs.gamespot.com',
  'gamefaqs.com',
  'blogspot.com',
  'wordpress.com',
  'tumblr.com',
  'quora.com',
  'answers.yahoo.com',
];

function isLowTrust(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return true;
  }
  if (host.includes('forum')) return true;
  return LOW_TRUST_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

export function hasOnlyLowTrustSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return true;
  return sources.every(isLowTrust);
}
