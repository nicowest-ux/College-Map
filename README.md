# Campus Navigator v6 — Precision Wayfinding, Campus Concierge & 360° Guide

This is the consolidated **v6** build. It includes the next development stage rather than splitting that work into a v6.1 release.

## Product model

Campus Navigator is now built around three jobs:

1. **Navigate** — precise, confidence-labelled indoor wayfinding.
2. **Explore** — the college's real 360° virtual tour for visual orientation.
3. **Ask** — an intent-aware campus concierge that understands what a user needs even when they do not know a room number.

## Navigation experience overhaul

The navigation flow has been rebuilt around **confirm → preview → walk → recover**, rather than immediately showing a generic list of directions.

- Every route now opens a **route preview** showing start, destination, route quality and any safety/coverage warning before guidance begins.
- Live guidance is **one instruction at a time**, with a large action/turn cue, the next instruction preview, visible landmark confirmation, previous-step control and an expandable full route.
- During active guidance the normal app chrome gets out of the way so the map and the current instruction remain the focus.
- Surveyed graph routes are the only routes that draw a route line. Floor-level/general guidance no longer draws a straight line through walls.
- Step-free mode is now strict: **every link must explicitly be marked step-free**. Unknown links are rejected rather than assumed accessible.
- Staff-only, one-way and temporarily closed links are enforced by the routing core.
- The route engine can re-plan from a confirmed off-route checkpoint when a surveyed graph allows it.
- “I’m lost” prioritises nearby route landmarks and can re-anchor from a visible room number.
- “Nearest toilet / printer / water / lift” no longer teleports the user’s location to the facility; it plans from the current confirmed position.
- Phone motion is now used as **heading assistance only**. The app no longer moves the blue position marker by an arbitrary number of map pixels per detected step.
- Active room-to-room routes can be resumed for up to eight hours.
- Deep links support `?from=B007&to=B014`, `?to=B014` and surveyed checkpoint links such as `?cp=B007_DOOR&to=B014`.
- Optional haptic cues and auto-focus of the current route leg are available in navigation settings.
- Search keeps recent room destinations near the top when no query is entered.

### Routing core and validation

`nav-core.js` contains the testable pathfinding rules used by the app. CI checks now cover:

- staff-only route rejection for students;
- strict step-free routing;
- closed-link avoidance;
- one-way enforcement;
- reverse instructions;
- JavaScript syntax for standalone and embedded builds;
- a headless Chrome smoke test that opens a real B007 → B014 route preview.

## Precision wayfinding added to v6

- Correct native floorplan coordinate system: **2560 × 1527**.
- 214 known room records across the campus.
- Verified room-door pins are visually distinct from unverified/floor-only rooms.
- Seed navigation anchors for the known public **B007 Tech Support → B014 Exams** route.
- Structured route steps with turn/action icons, landmark prompts and route confidence.
- Public student route explicitly avoids the direct **staff-only** corridor between the Tech Support and Exams side.
- **I can see this** route confirmation re-anchors the user and advances the guide.
- **I'm lost** recovery flow uses visible landmarks rather than guessing location.
- Full-screen/compact **Live Guide** instruction lens.
- The current route instruction is also shown over the **360° Explore** experience.
- Spoken guidance remains available.
- Step-free preference only uses surveyed links that are explicitly marked step-free.

## Indoor position model

Normal phone GPS is not presented as room-level indoor positioning. v6 combines:

- known-room anchoring;
- exact map-tap calibration;
- landmark/checkpoint confirmation;
- optional phone heading and motion dead-reckoning between anchors;
- confidence decay while dead-reckoning;
- exact re-anchoring at surveyed checkpoints.

### QR / checkpoint positioning

Every surveyed anchor can be represented by a normal URL such as:

`https://.../College-Map/?cp=SURVEY_ABC123`

A QR code containing that URL can be placed beside a corridor junction, lift, entrance, printer, water point or other landmark. Scanning it with the phone's normal camera opens Campus Navigator at that exact surveyed anchor and removes accumulated Follow Me drift. No paid beacon infrastructure is required.

## Precision Map Studio

Map Studio now surveys more than room dots. It supports:

- **Rooms** — tap the exact doorway.
- **Anchors** — entrances, corridor junctions, stairs, lifts, toilets, printers/Refill, water points and visual landmarks.
- **Links** — connect two surveyed anchors with an instruction, access rule and step-free flag.

Surveyed links form a real graph. When a start and destination are connected through that graph, Campus Navigator uses the surveyed graph in preference to generic guidance.

The survey can be exported/imported as `campus-navigator-v6-survey.json`.

## Campus concierge

The assistant understands examples such as:

- “I need IT help”
- “I have an exam”
- “I need somewhere quiet to study”
- “Where can I get food?”
- “I need wheelchair access”
- “Take me to B014”
- “I'm at B007”
- “I'm lost”
- “I can see the student lockers”
- “Where is the nearest printer?”

When a facility has not yet been precisely surveyed, the assistant says so instead of inventing a location.

## Route profiles

The settings screen supports **Student**, **Visitor** and **Staff** route profiles. Survey links can be marked public or staff-only. Student/visitor pathfinding will not use staff-only links.

## 360° visual reference

Virtual tour used by the Explore experience:

https://storage.net-fs.com/hosting/8161072/19/

The 2D source floorplan is labelled **September 2017**, so it is not treated as the only current source of truth. The app deliberately separates:

- verified room/anchor positions;
- floor-located but unverified rooms;
- current destination/service information;
- visual confirmation through the virtual tour.

## Files

- `index.html` — application shell and accessible UI.
- `styles.css` — responsive phone/desktop design.
- `data.js` — rooms, destinations, floor views, seed checkpoints and verified route template.
- `app.js` — image-map engine, concierge, positioning, route graph, recovery and Map Studio.
- `floorplan.png` — source floorplan.
- `manifest.json` — installable PWA metadata.
- `sw.js` — offline app-shell caching.

## Current accuracy boundary

This build contains the full **survey system**, but the college still needs physical surveying for all remaining doors, corridor junctions, lifts, stairs and amenities. v6 refuses to manufacture room-level precision for unsurveyed geometry. The quickest path to a genuinely production-grade system is to walk the building with Map Studio, place anchors and connect them as the real route is observed.
