# Campus Map Pro Upgrade — v4

This is a drop-in overhaul for the existing `nicowest-ux/College-Map` GitHub Pages PWA.

## What changed

- Rebuilt the UI around the end-user task: **find → choose start → navigate**.
- Replaced icon-only controls with a clearer mobile app shell, bottom navigation, search sheet, route planner, saved places, My Day, filters, and settings.
- Added responsive desktop and mobile layouts, safe-area support, keyboard access, reduced-motion support, ARIA labels, stronger tap targets and clearer visual hierarchy.
- Replaced browser `alert()` flows with non-blocking status toasts.
- Search now covers rooms, departments, buildings and facilities, with recent destinations.
- Added route deep-links/share support using `?from=W105&to=C112`.
- Added install prompt support, online/offline status and service-worker update handling.
- Improved PWA manifest and cache handling. Cache version is now `campus-map-v4`.
- Saved rooms, My Day, accessibility mode, indoor position and theme persist locally.
- Added a robust route failure state: inaccessible or disconnected routes now tell the user instead of drawing a misleading path.
- Removed the old fake GPS-to-floorplan conversion. Indoor position is set by room or map tap; compass heading can still be used after calibration.
- Split the monolithic HTML into `index.html`, `styles.css`, `data.js` and `app.js` for maintainability.

## Deployment

Keep these existing repository assets exactly as they are:

- `floorplan.png` (must remain lowercase)
- `icon-192.png`
- `icon-512.png`

Replace/add these files from this upgrade package:

- `index.html`
- `styles.css`
- `data.js`
- `app.js`
- `manifest.json`
- `sw.js`

GitHub Pages will serve the new version after the commit reaches `main`. Existing installed PWAs may briefly show the old version until the new service worker activates; the app now displays a refresh notice when an update is ready.

## Important routing note

The user experience and routing engine are now safer, but route accuracy can only be as good as the routing graph. The current repository contains a small graph with eight corridor/lift nodes and maps many rooms onto those nodes. Before calling the app production-ready for the whole campus, expand `CAMPUS_DATA.graph` and `roomToNode` in `data.js` using surveyed corridor junctions, doors, stairwells and lifts.

For step-free routing, only add an accessible edge when the physical route has been verified. The app will intentionally say that no verified step-free route exists rather than invent one.

## Recommended next accuracy upgrade

1. Mark corridor junctions on the floor plan.
2. Add each stair/lift transition as an explicit graph edge.
3. Associate every room with its nearest verified corridor node.
4. Add entrance nodes and accessible entrances.
5. Add temporary closure flags if you later want facilities staff to disable routes.

That data work will improve navigation far more than any further visual redesign.