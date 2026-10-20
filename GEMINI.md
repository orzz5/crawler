# GEMINI.md — Project Documentation & AI Context

## Project Overview

**Endpoint Inspector** (formerly API Grabber) is a developer-focused, full-stack web application designed for automated website crawling and client-side public API discovery. 

When provided with a target URL, the engine crawls internal subpages using a headless Chromium browser instance powered by **Playwright**, attaches event listeners to capture all outgoing HTTP responses triggered during page load and client-side SPA hydration (AJAX, `fetch`, XHR), filters out static assets and telemetry noise, and classifies discovered endpoints as either open public APIs or protected endpoints.

---

## Architecture Breakdown

### 1. Frontend (Client)
- **Framework:** Vite + React 18 + TypeScript.
- **Styling:** Tailwind CSS v3.4 (minimalist GitHub / Linear / Raycast developer aesthetic with monospace typography, crisp status badges, and subtle borders).
- **Communication:** Uses browser-native **Server-Sent Events (SSE)** via `EventSource` to receive real-time streams of:
  - Crawl lifecycle states (`PAGE_START`, `PAGE_COMPLETE`, `SESSION_COMPLETE`, `SESSION_STOPPED`).
  - Intercepted API endpoints (`ENDPOINT_FOUND`).
  - Monospace console output logs (`LOG`).
- **Features:**
  - **Deduplication Toggle:** View unique endpoints across the entire site (grouped by `METHOD + URL`, showing total call counts and subpages where triggered) or view grouped in a tree by scanned subpage.
  - **Inline Payload Viewer:** Collapsible syntax-highlighted JSON/XML response bodies.
  - **Inspection Drawer/Modal:** Full request/response headers, request body, and copyable `cURL` commands.
  - **Multi-Format Export:** Export findings as raw JSON, CSV spreadsheet, or import-ready **Postman Collection v2.1**.

### 2. Backend (Server)
- **Runtime:** Node.js with Express and TypeScript.
- **Role:** Exposes REST endpoints to start/stop crawls, queries session states, streams SSE events, and generates export downloads.
- **Crawl Engine:** Headless Playwright Chromium (`chromium.launch({ headless: true, args: [...] })`).
  - Configured with container flags (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`, `--single-process`) to operate reliably in low-memory Docker/Render container environments.
  - Traverses internal `<a href="...">` links while staying strictly within the same origin/domain.
  - Supports configurable crawl depth (1–5 levels) and page limits (5–50 pages).
  - Handles client-side hydration delays to allow modern SPAs (React, Next.js, Vue) to trigger async data fetches.

### 3. Network Interception & Noise Filtering
The backend response listener inspects all incoming network traffic and filters out:
- **Telemetry & CDN Beacons:** Ignores any request containing `/cdn-cgi/`, `rum`, `analytics`, `telemetry`, `beacon`, `sentry`, `hotjar`, or originating from known tracking hosts.
- **Framework Routing & Hydration:** Ignores Next.js data routes, route manifests, build artifacts, and sourcemaps: `routeInfo.json`, `_next/data/`, `manifest.json`, `asset-manifest.json`, `.map`.
- **Static Assets:** Filters out images, stylesheets, fonts, media, and raw script bundles (`.js`, `.css`, `.png`, `.svg`, `.woff2`, etc.).
- **Target:** Keeps only genuine REST, GraphQL, and JSON/XML data endpoints.

### 4. Authentication Classification
Each captured endpoint is analyzed for credential requirements:
- **Public:** No authentication headers or session cookies detected; returns valid open data.
- **Protected:** Transmits `Authorization: Bearer ...`, `Authorization: Basic ...`, API key headers (`x-api-key`, `token`), session cookies, or receives HTTP `401 Unauthorized` / `403 Forbidden` responses.

---

## File Structure & Key Modules

```text
c:\Users\oropr\Desktop\API Grabber\
├── package.json                   # Workspace scripts to run and install client & server
├── GEMINI.md                      # AI and developer context documentation
├── README.md                      # User-facing guide and feature reference
│
├── server/                        # Express + Playwright backend service
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Express server, REST endpoints, SSE route, and export endpoints
│       ├── types/
│       │   └── index.ts           # Shared TypeScript interfaces (Endpoint, Session, Stats, Config)
│       └── crawler/
│           ├── engine.ts          # Playwright browser lifecycle, crawl queue, and event dispatch
│           ├── detector.ts        # API candidate validation, payload extraction, and auth classifier
│           ├── filter.ts          # Telemetry, CDN beacons, framework routing, and static asset exclusion
│           └── urlUtils.ts        # URL normalization, same-origin validation, domain parsing
│
└── client/                        # React + Vite frontend application
    ├── package.json
    ├── vite.config.ts             # Vite configuration with proxy to http://localhost:3001
    ├── tailwind.config.js         # Minimalist developer palette configuration
    ├── index.html                 # HTML shell with monospace fonts
    └── src/
        ├── index.css              # Custom status badges and minimal dark mode styling
        ├── main.tsx               # React DOM entry point
        ├── types.ts               # Client-side TypeScript interfaces
        ├── App.tsx                # Main application state, SSE listener, and layout
        ├── components/
        │   ├── Header.tsx             # Clean developer header with status indicator
        │   ├── CrawlConfigForm.tsx    # Target URL input, presets, and crawler options
        │   ├── LiveProgress.tsx       # Compact scan progress bar and active URL display
        │   ├── StatsOverview.tsx      # Metrics grid (pages, endpoints, public, protected, duration)
        │   ├── LiveLogViewer.tsx      # Terminal-style monospace stream log viewer
        │   ├── EndpointsView.tsx      # Deduplication vs Subpage toggle, search, and filters
        │   ├── SubpageAccordion.tsx   # Subpage tree view with collapsible endpoints
        │   ├── JsonViewer.tsx         # GitHub-style syntax-highlighted JSON viewer
        │   ├── EndpointDetailModal.tsx # Full request/response inspector, headers, and cURL
        │   └── ExportDropdown.tsx     # JSON, CSV, and Postman v2.1 export dropdown
        └── utils/
            └── exportUtils.ts         # Exporters (JSON, CSV, Postman) and cURL command builder
```

---

## Running & Testing Locally

### 1. Prerequisites
- **Node.js** v18+ (tested on v24)
- **npm** v9+

### 2. Dependency Installation
From the root workspace directory:
```bash
npm run install:all
```
This installs dependencies across the root, `server/`, and `client/`.

### 3. Install Playwright Chromium
```bash
npm run playwright:install
```
*(Or run `cd server && npx playwright install chromium`)*

### 4. Start Development Servers
From the root directory, start both the backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001`
- **Health Check:** `http://localhost:3001/api/health`

Alternatively, run in separate terminals:
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

### 5. Running a Headless Crawl Test via API
To programmatically test the backend crawler:
```bash
# Start a crawl session
curl -X POST http://localhost:3001/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{"startUrl":"https://httpbin.org","maxDepth":1,"maxPages":3}'

# Check session results (replace <sessionId> with returned ID)
curl http://localhost:3001/api/crawl/session/<sessionId>
```
