# PRD: STAB 7S Infokarta

## Overview
Single-page military intelligence map for Swedish Home Guard (Hemvärn) staff.
Displays incoming 7S field reports on an interactive dark map in real-time.

## User Stories

### US-01: View map with report markers
As a staff operator, I want to see all active reports as colored pins on a dark map,
so I can immediately understand the tactical situation geographically.

**Acceptance criteria:**
- Map loads centered on Stockholm with dark CartoDB tiles
- Each report is rendered as a colored dot (12x12px) at the correct lat/lon
- Marker color matches the report's Symbol field (Röd=red, Svart=dark grey, Grön=green, Gul=amber, Vit=light grey, Blå=blue, Kamouflage=olive)
- All 5 initial reports are visible on load
- Mouse wheel zooms the map in/out

### US-02: View report list panel
As a staff operator, I want to see a sorted list of all reports on the right side,
so I can quickly scan the latest intelligence.

**Acceptance criteria:**
- Panel shows on the right side (340px wide)
- Reports sorted newest-first by timestamp
- Each item shows: stund, slag, stallePlain, sagesman, styrka, relative time
- Report count is displayed above the list
- List is scrollable

### US-03: Select a report
As a staff operator, I want to click a report in the list or on the map to see details,
so I can get full intelligence for a specific observation.

**Acceptance criteria:**
- Clicking a list item selects the report
- Clicking a map marker selects the report
- Selected item gets green left-border highlight in the list
- Map pans to center on the selected marker
- Selected marker shows beacon animation (3 pulsing rings)
- SVG dashed arrow appears from list item to map pin
- Info panel appears bottom-left with all 7S fields
- Clicking the same report again deselects it (toggle)
- Closing info panel (X button) deselects

### US-04: Info panel content
As a staff operator, I want to see all 7S fields for the selected report,
so I have complete intelligence information.

**Acceptance criteria:**
- Info panel shows: Stund, Ställe, MGRS, Styrka, Slag, Sysselsättning, Symbol, Sagesman
- Anteckningar (notes) shown if present
- Pending reports show amber warning block "AVVAKTAR BEKRAFTELSE"
- Info panel has colored dot matching report symbol

### US-05: Filter reports
As a staff operator, I want to filter reports by typing in a search box,
so I can find specific reports quickly.

**Acceptance criteria:**
- Filter input in panel header
- Typing filters list in real-time
- Filter matches against: slag, sagesman, stallePlain, stalle, sysselsattning, symbol
- Report count updates to reflect filtered count
- Clearing filter restores all reports

### US-06: Stale intelligence indicators
As a staff operator, I want old reports to be visually dimmed,
so I know which intelligence is current vs outdated.

**Acceptance criteria:**
- Reports older than 4 hours are considered stale
- Stale list items have reduced text opacity (0.45)
- Stale map markers have reduced opacity (0.35)
- R003 (5h old) and R002 (3h old) — R003 is stale, R002 is borderline

### US-07: Panel toggle (clean mode)
As a staff operator, I want to hide the side panel for a full-screen map view,
so I can show the map on a large TV without UI clutter.

**Acceptance criteria:**
- PANEL button in top bar toggles the side panel
- Panel slides out to the right when hidden
- PANEL button shows active state when panel visible
- Arrow redraws after panel toggle (300ms delay)

### US-08: Sound toggle
As a staff operator, I want to toggle audio alerts on/off,
so I can control sound in a quiet ops room.

**Acceptance criteria:**
- LJUD button toggles sound on/off
- Button shows active state when sound on
- When on: clicking a report plays a short blip
- When on: new incoming report plays triple ascending blip

### US-09: Military clock
As a staff operator, I want to see the current military time in the top bar,
so I can correlate reports with real-time.

**Acceptance criteria:**
- Clock displays in DDHHMM Z format (e.g. 060712Z)
- Updates every second

### US-10: Incoming report simulation
As a tester, I want to see a new report arrive automatically,
so I can verify the real-time update flow.

**Acceptance criteria:**
- After 7 seconds, R006 (Lastbil at Hötorget) appears in the list
- New marker appears on map
- Status bar shows "NY RAPPORT: R006 — Lastbil vid Norrmalm, Hötorget"
- New list item flashes green 3 times
- Triple blip plays (if sound on)

### US-11: Pending report
As a staff operator, I want pending/unconfirmed reports to be visually distinct,
so I know which ones need verification before acting on.

**Acceptance criteria:**
- R004 (MC, Kungsholmen) has pending: true
- Amber left-border on list item
- "AVVAKTA" badge next to slag name
- Info panel shows amber "AVVAKTAR BEKRAFTELSE" block

### US-12: Responsive layout
As a mobile user, I want the interface to work on a phone/tablet,
so the map can be used in the field on a smartphone.

**Acceptance criteria:**
- On screens < 600px, panel goes full width
- Info panel goes full width on mobile
- Map still interactive on touch devices
