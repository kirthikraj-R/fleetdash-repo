# FleetDash

High-throughput, event-driven fleet telemetry dashboard. Tracks a nationwide
fleet in real time, without freezing the UI, flashes an alert the instant a
vehicle breaches a geofenced zone, and ships as a full multi-page console
with sign-in — styled with a soft claymorphism UI (dual-shadow raised/inset
panels instead of hard borders) and a light/dark theme toggle.

## Pages

| Route          | Page        | What's there                                             |
|-----------------|-------------|-------------------------------------------------------------|
| `/login`         | Sign in      | Sign in or register (see below)                              |
| `/`               | Dashboard    | Fleet-wide stats, a live mini-map, recent alerts, top speeds |
| `/map`            | Live Map     | Real-world map (Leaflet, light basemap), vehicle list, alert feed, detail panel |
| `/fleet`          | Fleet        | Searchable/filterable table of every vehicle                 |
| `/alerts`         | Alerts       | Full breach history, broken down by zone kind                |
| `/geofences`      | Geofences    | List zones, create new circular zones, delete zones           |
| `/analytics`      | Analytics    | Live charts — speed trend, active/idle trend, fleet by region, vehicle types, alerts by zone kind |

Clicking any vehicle — on the map, in the Fleet table, or in the Live Map
sidebar — opens its details, including a **Driver** section (name, phone,
license plate, assigned region). On the map specifically, this also appears
as a popup right at the vehicle's location, not just in the side panel.

## Testing & load validation

```bash
cd backend
npm install

# Unit tests — REST API (Supertest), geofence service, ingestion parser
npm test

# Direct ingestion throughput benchmark (worker_threads pool)
npm run loadtest:bench
# -> points/sec, and confirms zero *unintended* data loss

# k6 load test against the REST layer (requires k6 installed separately)
k6 run loadtest/ingest.js
k6 run -e TARGET_RPS=2000 -e DURATION=60s loadtest/ingest.js
```

Last benchmark run: **342,483 points/sec**, 0 unintended drops (only
intentionally malformed test points were rejected, exactly as expected).
See `.github/workflows/ci.yml` for how these run in CI.

## Sign in / Register

There's no real user database — `AuthContext` validates against a small
seed account plus anyone who registers through the UI (both persisted to
`localStorage`; this is a standalone project running in your own browser,
not a Claude.ai artifact, so that's safe here). Swap it for real
`POST /api/auth/login` / `POST /api/auth/register` calls whenever you wire
up real accounts; nothing else in the app needs to change.

The login screen has two tabs — **Sign In** and **Register**. To create a
new account, switch to Register and fill in name/email/password (min. 6
characters). Or use the seed account:

```
manager@infotact.io / fleetdash
```

## Quick start (zero external setup)

The project runs out of the box with **no Mongo or Redis installation
required** — both default to disabled and fall back to in-memory
implementations that mirror the real ones exactly (Bucket Pattern documents /
Pub/Sub bus), plus a built-in synthetic fleet simulator (150 vehicles by
default) so the dashboard is alive immediately.

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
npm install
npm start
# -> http://localhost:4000

# Terminal 2 — frontend
cd frontend
cp .env.example .env
npm install
npm run dev
# -> http://localhost:5173
```

Open **http://localhost:5173** — you'll land on the login screen first. Sign
in with the seed account above (or register a new one), and you'll land on
the Dashboard with ~150 vehicles spread across 10 major Indian cities (Delhi,
Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad, Pune, Ahmedabad, Jaipur,
Lucknow — 15 vehicles each, roughly 20% parked/idle at any time) and one
geofence zone per region already seeded.

Use the **sun/moon toggle** in the sidebar (or top-right corner of the login
screen) to switch between dark and light mode — the choice is remembered
per-browser. The live map itself always keeps its light basemap regardless of
the app theme, since it's real map tiles rather than themed UI chrome.

Click any vehicle (on the map, in the Fleet table, or in the Live Map
sidebar) to open its detail card, which includes a **Driver** section with
the driver's name, a deterministic phone number and license plate, and
their assigned city hub.

## Running with real infrastructure (Docker Compose)

```bash
docker compose up --build
```

This spins up real MongoDB and Redis containers and sets
`MONGO_ENABLED=true` / `REDIS_ENABLED=true` so the backend uses them instead
of the in-memory fallbacks.

## Architecture

```
                 ┌─────────────────────┐
 raw telemetry → │  Ingestion Engine    │  worker_threads pool (Piscina)
 (simulator or   │  parse / validate /  │  offloads CPU work from the
  real device)   │  normalize           │  main event loop
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │  Geospatial Rules     │  Turf.js boundary intersection,
                 │  (geofenceService.js) │  emits ENTER/EXIT on state change
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │  Message Broker       │  Redis Pub/Sub (or in-memory
                 │  (bus.js)             │  EventEmitter fallback)
                 └──────────┬───────────┘
                     ┌──────┴───────┐
                     ▼              ▼
          ┌─────────────────┐  ┌─────────────────────┐
          │  Socket.io       │  │  Database Layer       │
          │  gateway         │  │  MongoDB Bucket        │
          │  (msgpack binary │  │  Pattern — hourly       │
          │  transport)      │  │  arrays per vehicle     │
          └────────┬─────────┘  └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │  React frontend           │
        │  — fleetBuffer.js: raw    │  <- bypasses React state entirely
        │    coordinate stream      │     for the high-frequency path
        │  — MapView.jsx: real map  │
        │    tiles (Leaflet)        │
        │  — zustand: low-frequency │  <- alerts, selection, filters,
        │    UI state                │     stats — normal React re-renders
        └─────────────────────────┘
```

### Why the frontend bypasses React state for telemetry

At 150 vehicles × 4 updates/sec = 600 points/sec, routing every point
through `useState`/`useReducer` would mean thousands of re-renders per
second — the exact DOM-overload problem this project exists to solve.
Instead:

- `src/store/fleetBuffer.js` is a plain module-level `Map`, written to
  directly by the socket handler. It is **not** React state.
- `MapView.jsx` reads from that buffer on its own interval-driven update
  loop and pushes positions straight into Leaflet's layers
  (`marker.setLatLng(...)`), so rendering stays smooth regardless of
  ingestion rate — the map itself uses real-world tiles (via Leaflet + a
  free CartoDB dark basemap), it's not a custom-drawn grid.
- Only low-frequency UI concerns — selected vehicle, alert list, connection
  status, filters, and a stats summary throttled to ~2x/sec — live in the
  `zustand` store and trigger normal React re-renders.

### The Bucket Pattern (MongoDB)

Instead of one document per GPS ping, `TelemetryBucket` groups every point
emitted by a single vehicle within a single UTC hour into one document, with
points appended to a bounded array (see
`backend/src/models/TelemetryBucket.js`). This means far fewer documents,
cheaper writes, and better cache locality for "give me this vehicle's last
hour" queries than one-document-per-ping would produce.

### Message broker delivery guarantees

Plain Redis Pub/Sub (used here) has no delivery guarantees — a disconnected
subscriber loses messages published while it was down. That's an acceptable
trade for live map positions (the next tick supersedes the last one anyway),
which is why the telemetry channel uses `io.volatile.emit`. Geofence alerts
use a normal (non-volatile) emit and would benefit from **Redis Streams**
instead of Pub/Sub in a production deployment where you can't afford to lose
a breach event — Streams give you consumer groups and replay.

## Project structure

```
fleetdash/
├── backend/
│   ├── src/
│   │   ├── server.js              # wires everything together
│   │   ├── config/
│   │   │   ├── index.js            # env-driven config
│   │   │   └── hubs.js             # shared Indian city hub coordinates
│   │   ├── workers/                # worker_threads pool + parser
│   │   ├── services/
│   │   │   ├── bus.js              # Redis Pub/Sub w/ in-memory fallback
│   │   │   ├── geofenceService.js  # Turf.js boundary checks, one zone/region
│   │   │   ├── bucketWriter.js     # Bucket Pattern persistence
│   │   │   └── simulator.js        # synthetic fleet generator (150 vehicles, 10 hubs)
│   │   ├── models/                  # Mongoose schemas
│   │   ├── db/                      # Mongo connection
│   │   └── routes/api.js            # REST endpoints
│   ├── test/                        # Jest + Supertest suite
│   ├── loadtest/                    # k6 + throughput benchmark scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # router setup
│   │   ├── main.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # login/register, persisted session
│   │   │   └── ThemeContext.jsx       # light/dark mode toggle
│   │   ├── layouts/AppLayout.jsx      # sidebar + routed page content
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LiveMapPage.jsx
│   │   │   ├── FleetPage.jsx
│   │   │   ├── AlertsPage.jsx
│   │   │   ├── GeofencesPage.jsx
│   │   │   └── AnalyticsPage.jsx      # live charts (recharts, lazy-loaded)
│   │   ├── store/
│   │   │   ├── fleetBuffer.js       # non-React high-frequency buffer
│   │   │   └── fleetStore.js        # zustand — low-frequency UI state
│   │   ├── hooks/useSocket.js       # Socket.io + msgpack wiring
│   │   ├── lib/
│   │   │   ├── api.js               # REST client for geofence CRUD
│   │   │   └── driverDetails.js     # deterministic phone/plate generation
│   │   └── components/
│   │       ├── MapView.jsx           # real-world map (Leaflet, light basemap) — signature UI
│   │       ├── NavSidebar.jsx        # six-item nav + theme toggle + user/logout
│   │       ├── ThemeToggle.jsx       # sun/moon light-dark switch
│   │       ├── TopBar.jsx
│   │       ├── ProtectedRoute.jsx
│   │       ├── StatsBar.jsx
│   │       ├── VehicleList.jsx
│   │       ├── VehicleDetailPanel.jsx
│   │       ├── AlertsPanel.jsx
│   │       ├── BreachToast.jsx
│   │       └── ZoneLegend.jsx
│   └── package.json
└── docker-compose.yml
```

## REST API

| Method | Path                | Description                          |
|--------|----------------------|---------------------------------------|
| GET    | `/api/health`         | Liveness check                        |
| GET    | `/api/vehicles`        | Current snapshot of all vehicles      |
| GET    | `/api/geofences`       | List all geofence zones               |
| POST   | `/api/geofences`       | Create a zone (`{ name, kind, color, geometry }`, GeoJSON Polygon) |
| DELETE | `/api/geofences/:id`   | Remove a zone                         |

## Socket.io events

| Event                | Direction        | Payload                                   |
|-----------------------|-------------------|---------------------------------------------|
| `fleet:snapshot`       | server → client    | Full current state on connect                |
| `telemetry:batch`      | server → client    | Array of normalized points (high-frequency, volatile) |
| `geofence:zones`       | server → client    | Zone list on connect                          |
| `geofence:event`       | server → client    | `{ type: 'ENTER'|'EXIT', vehicleId, zoneId, zoneName, zoneKind, lat, lng, timestamp }` |

## Design

The UI uses a **claymorphism** design system: soft, dual-toned shadows
(a light "highlight" paired with a soft dark "lowlight," both driven by
theme-aware CSS variables) instead of hard borders, with generously rounded
corners throughout. Panels read as gently raised or pressed-in surfaces —
active nav items, selected list rows, and focused inputs use an inset
version of the same shadow to look "pressed." Typography pairs Space
Grotesk (display) with Inter (UI text) and JetBrains Mono (coordinates,
IDs, timestamps).

Colors, radii, and shadows are all defined once via CSS variables
(`frontend/src/styles/index.css`) and Tailwind tokens
(`frontend/tailwind.config.js` — see `shadow-clay`, `shadow-clay-sm`,
`shadow-clay-xs`, `shadow-clay-inset`), so the light/dark toggle and the
clay effect both apply consistently across every page without per-component
overrides.

The Live Map itself uses a real-world basemap (Leaflet + a free CartoDB
Positron/light tile layer, no API key required) rather than an abstract
custom-drawn grid — vehicle positions and geofence polygons are real
latitude/longitude coordinates plotted on an actual map. The map's own
chrome (tiles, zoom controls, popups) stays on a fixed light styling
regardless of the app-wide theme toggle, since it's real map tiles rather
than themed UI.

## Swapping in a real telemetry source

Replace the call to `FleetSimulator` in `backend/src/server.js` with
whatever's feeding you real data — an MQTT subscription, an HTTP webhook, a
Kafka consumer — and call the same `ingest(rawBatch)` function. Everything
downstream (worker pool → geofence rules → bus → sockets → bucket writer) is
unchanged.
