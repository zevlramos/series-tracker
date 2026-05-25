export function buildEditUrl(repoCoords, seriesSlug) {
  const { owner, repo, branch } = repoCoords;
  const encodedSlug = encodeURIComponent(seriesSlug);
  return `https://github.com/${owner}/${repo}/edit/${branch}/series/${encodedSlug}/data.json`;
}
