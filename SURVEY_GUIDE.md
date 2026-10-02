# Campus Navigator — Field Survey Guide

The app deliberately refuses to invent indoor geometry. This checklist is the fastest way to turn the current navigation experience into true campus-wide turn-by-turn guidance.

## Survey in this order

1. **Main entrances and external doors**
2. **Every corridor junction / decision point**
3. **Stairs and lifts on every floor**
4. **Major landmarks** students can recognise quickly
5. **Facilities** such as toilets, printers/Refill and water points
6. **Room doorways**, linked to the nearest surveyed corridor anchor
7. **Every walkable link** between those anchors

Do not start by placing every room. A connected corridor graph improves navigation far more than hundreds of disconnected room pins.

## For every anchor

Use Map Studio → Anchors and record:

- a short name someone can recognise while walking;
- the correct building and floor;
- the exact point on the floorplan;
- the anchor type;
- the linked room, when the anchor is a room doorway;
- a QR/checkpoint link for useful re-anchoring locations.

Good anchor names are visual: “Student lockers”, “Doors to quad”, “Lift outside FYi”, “Junction by R105”.

## For every link

Use Map Studio → Links and record:

- **From / To**
- a forward instruction that describes what a person should actually do;
- a reverse instruction when the reverse journey needs different wording;
- **Step-free verified** only after physically checking the entire link;
- public vs staff-only access;
- one-way where relevant;
- temporarily closed when a link cannot currently be used;
- approximate walking seconds if measured.

Never tick step-free merely because a link looks flat on the plan.

## Instructions that work well

Prefer landmark-based instructions:

- “Walk past the student lockers and turn left at Refill.”
- “Go through the double doors into the quad.”
- “Take the lift to First Floor; turn right when the doors open.”

Avoid map-centric wording such as “walk north-east” unless there is a very good reason.

## Route acceptance test

For each important journey, test it both directions as:

- Student
- Visitor
- Staff, where staff-only links exist
- Step-free mode

Then deliberately go off-route and confirm a nearby checkpoint. The app should either rebuild through surveyed links or clearly say that no connected surveyed route is available.

## Priority route set

A useful first survey pass should connect:

- Reception / main entrance
- B007 Tech Support
- B014 Exams
- FYi / study areas
- catering
- student support
- nearest toilets
- lifts / step-free circulation
- Sports Hall
- Theatre / Frame

Once these are connected into one graph, the app becomes substantially more useful even before every classroom doorway is surveyed.

## Accuracy rule

If an anchor or link has not been physically checked, leave it unknown. Campus Navigator is designed to show limited guidance instead of manufacturing a precise route.
