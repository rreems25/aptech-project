# Alpine Ascents — design notes

## Visual direction
Editorial alpine field guide: dark evergreen navigation and expedition sections, warm paper backgrounds for reading sections, muted moss accents and a lime highlight for active controls. Oversized typography and spacious cards make the page feel like a modern outdoor journal rather than a dense technical manual.

## Design tokens

- Deep evergreen: `#132a2b`
- Pine panel: `#203c38`
- Moss: `#839c6a`
- Alpine lime: `#c8da91`
- Warm paper: `#fbfaf6`
- Sand: `#e8e3d7`
- Body type: DM Sans
- Display type: Manrope
- Card radius: 14–18px
- Main content width: Bootstrap `container-xl`

## Figma recreation guide

Create a 1440px desktop frame and 390px mobile frame. Establish reusable components for the nav item (default/hover/active), visit badge, primary button, content card, metric card, club row, map panel, field note card, checklist item (unchecked/checked) and scrolling ticker. Use an 8px spacing scale. Desktop grids use 3–4 columns; tablet grids reduce to 2; mobile content cards stack to 1 column. Keep keyboard focus states, readable contrast and reduced-motion variants in the component variants.

## Interactions

- Menu hover and current-section states use moss/lime color and a sliding underline.
- Section anchors scroll smoothly and briefly fade into view.
- Style explorer filters/search update the React-rendered card set.
- Club filters update the directory; clicking a row focuses its map marker.
- Browser geolocation is requested only after a user action.
- Checklist checkboxes update a progress bar and can be reset.
