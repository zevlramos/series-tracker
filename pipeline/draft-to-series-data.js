export function draftToSeriesData(draft) {
  return {
    slug: draft.slug,
    name: draft.name,
    entries: draft.entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      medium: entry.medium,
      branch: entry.branch,
      releaseDate: entry.releaseDate ?? null,
      recommendedOrder: entry.recommendedOrder,
      recommendedReason: entry.recommendedReason,
      chronologicalOrder: entry.chronologicalOrder ?? null,
      loreDate: entry.loreDate ?? null,
      summary: entry.summary,
      image: entry.image ?? null,
      imageUrl: entry.imageUrl ?? null,
      status: entry.status,
      sources: entry.sources
    }))
  };
}
