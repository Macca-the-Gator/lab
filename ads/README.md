# Site partner placements

The reusable presentation script, styles and placement data live in `assets/site-components.js`, `assets/site-components.css` and `assets/site-data.json`. Artwork is stored in `assets/creatives/` under neutral filenames so static pages and the shared renderer load it from the normal site asset path.

Blog pages expose placements with `data-content-unit` and use the `content-unit`/`sponsor-card` presentation classes. The runtime fills these slots from the configured feed, article, sidebar and dock pools; affiliate links and impression/click accounting remain unchanged.

To add a placement to a page, include an element such as `<div class="content-unit" data-content-unit="side">` and load `/assets/site-components.js` with `/assets/site-components.css`. Pages without a placement remain unchanged.
