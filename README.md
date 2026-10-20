# Alpine Ascents — responsive mountaineering portal

A single-page, responsive mountaineering learning portal built with HTML5, custom CSS, Bootstrap 5, JavaScript, jQuery and a React-powered interactive style explorer. The primary content store is `data/content.json`; `data/content.xml` is an optional XML export, and `data/content.js` is a generated fallback so the page can still render content when opened directly from disk.

## Run the site

**Windows shortcut:** Double-click `start-local-server.bat` to start the local server and open the site in your default browser. Keep the terminal window open while using the site.

**Recommended (local web server)**

1. Extract the `alpine-ascents` folder.
2. Open a terminal in that folder.
3. Run:

   ```bash
   python -m http.server 8000
   ```

4. Visit `http://localhost:8000` in a browser.

The local server enables `fetch()` to read `data/content.json` and gives browser geolocation a localhost context. The site loads Bootstrap, React, jQuery, Leaflet, icon fonts and map tiles from CDNs, so an internet connection is needed for those external resources and the interactive map.

**Direct preview:** You can also open `index.html` directly. The generated `data/content.js` fallback supplies content without JSON fetch, but CDN dependencies and the map still require internet access; browser location permissions vary by browser and context.

## Features

- One-page navigation with smooth scrolling, active states, hover feedback and jQuery fade transitions.
- Responsive layouts for mobile, tablet and desktop.
- Mountaineering history, styles, techniques, sheltering, hazards, records, expedition milestones, gallery resources, latest field notes and general guidelines.
- React style explorer with category filters and search.
- Global club directory with region filtering, search, interactive Leaflet map and OpenStreetMap links.
- Opt-in HTML5 Geolocation: the ticker can show the browser's coordinates and the map can show a session-only location marker. Coordinates are not written to local storage or sent to the site’s JSON content.
- Continuous scrolling ticker with current local date, time and location state.
- Per-browser visit counter using localStorage. This is a local demo counter, not a global visitor count or analytics service.
- Interactive readiness checklist with progress, reset control and reduced-motion support.

## Project structure

```text
alpine-ascents/
├── index.html
├── README.md
├── DESIGN-NOTES.md
├── start-local-server.bat
├── assets/
│   ├── alpine-hero.png
│   ├── alpine-camp.png
│   ├── climbers-ice.png
│   ├── app.js
│   └── styles.css
└── data/
    ├── content.json
    └── content.js
```

## Editing content

Edit `data/content.json` to update records, clubs, styles, stories, field notes, gallery items or checklist content. Regenerate `data/content.js` from the same JSON when updating content if you want the direct-file fallback to stay in sync; `data/content.xml` is a secondary export for XML-oriented workflows. The JSON is loaded by the page when served over HTTP.

## Notes

- The map uses Leaflet and OpenStreetMap, so no Google Maps API key is needed. Locations are representative and should be verified on each organization’s official site.
- The date/time ticker uses the visitor’s browser-local timezone. The location feature is opt-in and displays coordinates because browser geolocation does not automatically provide a place name.
- The visitor count is local to one browser profile and can reset if local storage is cleared. A cross-user global counter requires a backend service.
- Safety content is educational and is not a substitute for hands-on instruction, local forecasts, emergency services, or professional guiding.
- External links and current-development notes are included as references. Check the source pages for updated guidance before making real-world decisions.
