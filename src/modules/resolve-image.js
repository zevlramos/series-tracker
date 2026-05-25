const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">' +
  '<rect width="200" height="280" fill="#2a2a2a"/>' +
  '<text x="100" y="140" text-anchor="middle" fill="#666" font-size="14" font-family="system-ui">No Cover</text>' +
  '</svg>'
);

export function resolveImage(entry) {
  return entry.image || entry.imageUrl || PLACEHOLDER;
}
