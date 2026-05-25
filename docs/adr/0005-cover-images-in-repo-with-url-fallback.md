# Cover images stored in-repo, with URL fallback

An Entry's cover/artwork is a committed, width-capped image in the Series' `assets/` (`image`), with an external `imageUrl` allowed as a fallback when no local file exists yet. Local always wins when present.

Local-first because broken covers make a visual fan site look dead, and over a multi-year project hotlinked fandom/wiki/publisher URLs will rot or get hotlink-blocked. The `imageUrl` fallback exists for the research pipeline: `create-series` can record a cover URL it *finds* immediately, and localizing it (downloading to `assets/`) becomes an optional polish pass rather than a blocker.

Storing low-res cover thumbnails on a public repo copies copyrighted art, but that is standard practice for personal, non-commercial fan catalogs and the risk is negligible. Size is a non-issue at ~600px caps.
