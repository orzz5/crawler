# API Grabber & Public API Discovery Engine

A modern, full-stack web application that crawls any target domain and its internal subpages, intercepts client-side network traffic via headless Chromium (Playwright), and automatically discovers and classifies all public and protected data endpoints consumed by the web application.

---

## ✨ Features

- **Automated Web Crawler & Subpage Discovery:**
  - Recursive link extraction (`<a href="...">`) up to a configurable depth (1–5 levels).
  - Strict same-origin domain isolation (stays inside the target domain without straying into third-party sites).
  - Configurable maximum page limits (5–50 pages) and per-page timeout handling.
  - Visited URL sets and canonicalization to avoid duplicate scans and infinite loops.

- **Network Interception & Real-Time API Detection:**
  - Powered by headless **Playwright** browser event listeners (`page.on('response', ...)`).
  - Intercepts client-side AJAX, Fetch, and XHR requests dynamically triggered by SPA hydration (React, Vue, Angular, Next.js).
  - Automatic detection of `application/json`, `application/xml`, `application/ld+json`, and GraphQL endpoints.

- **Intelligent Noise Filtering:**
  - Excludes static web assets (`.js`, `.css`, images, fonts, `.map`, media files).
  - Blacklists common tracking, analytics, and telemetry platforms (Google Analytics, GTM, Hotjar, Sentry, Datadog, Mixpanel, Segment, Clarity, etc.).
  - User-configurable custom regex/keyword ignore patterns.

- **Public vs. Protected Classification:**
  - Identifies open public data endpoints (no session tokens or credentials required).
  - Flags protected endpoints requiring Bearer tokens (`Authorization: Bearer ...`), API Keys (`x-api-key`), Basic Auth, or session cookies.
  - Flags HTTP `401 Unauthorized` and `403 Forbidden` responses.

- **Modern Dashboard UI (React + Tailwind CSS v3.4):**
  - Sleek dark-mode aesthetic with glassmorphism and animated status indicators.
  - Real-time Server-Sent Events (SSE) streaming live logs, pages scanned, and captured APIs.
  - **Organized Tree / Accordion View:** Groups discovered endpoints by subpage URL with collapsible inline JSON payload previews.
  - **Flat Feed View:** Search, filter by HTTP method (`GET`, `POST`, `PUT`, `DELETE`), auth type (Public vs Protected), and response status (2xx vs errors).
  - **Deep Inspection Drawer/Modal:** Full request/response headers, body inspector, and one-click copyable **cURL** command.
  - **Export Findings:** Download discovered endpoints as formatted **JSON**, **CSV**, or a ready-to-import **Postman Collection v2.1**!

---

## 🏗️ Architecture & Project Structure

```text
API Grabber/
├── package.json               # Root workspace scripts (concurrent execution)
├── server/                    # Node.js + Express + Playwright Engine
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # REST API, SSE streaming, and export routes
│       ├── types/             # TypeScript shared interfaces
│       └── crawler/
│           ├── engine.ts      # Playwright browser lifecycle & crawling queue
│           ├── detector.ts    # API candidate detection & auth classifier
│           ├── filter.ts      # Static asset & telemetry domain blacklists
│           └── urlUtils.ts    # URL normalization and same-origin validation
└── client/                    # Vite + React + TypeScript + Tailwind CSS
    ├── package.json
    ├── vite.config.ts         # Vite config with API proxy to port 3001
    ├── tailwind.config.js     # Tailwind CSS v3.4 configuration
    └── src/
        ├── App.tsx            # Main application state and SSE event handler
        ├── components/
        │   ├── Header.tsx             # Brand header with status badges
        │   ├── CrawlConfigForm.tsx    # URL input, presets, and advanced settings
        │   ├── LiveProgress.tsx       # Real-time scan progress bar
        │   ├── LiveLogViewer.tsx      # Monospace terminal log feed
        │   ├── StatsOverview.tsx      # KPI cards (scanned, APIs, public, protected)
        │   ├── EndpointsView.tsx      # Tab switcher (Accordion vs Flat list)
        │   ├── SubpageAccordion.tsx   # Subpage tree view with collapsible payloads
        │   ├── JsonViewer.tsx         # Syntax-highlighted JSON viewer
        │   ├── EndpointDetailModal.tsx # Full request/response inspector & cURL
        │   └── ExportDropdown.tsx     # JSON, CSV, and Postman export
        └── utils/
            └── exportUtils.ts         # Exporters and cURL command generator
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+

### 1. Installation

From the project root directory, install all dependencies for root, server, and client:

```bash
npm run install:all
```

Or install individually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Install Playwright Headless Browser Binaries

Install the Chromium headless binary required by Playwright:

```bash
npm run playwright:install
```
*(Or navigate to `server/` and run `npx playwright install chromium`)*

---

## 🏃 Running the Application

### Option A: Run Full-Stack Concurrently (Recommended)

From the root directory:

```bash
npm run dev
```

This launches both the Express crawling backend on `http://localhost:3001` and the Vite React frontend on `http://localhost:5173` simultaneously.

### Option B: Run Services Separately

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
```
*Server starts on `http://localhost:3001`*

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```
*Client starts on `http://localhost:5173`*

Open **`http://localhost:5173`** in your browser.

---

## 📖 Usage Guide

1. **Enter URL or Select Preset:**
   - Type in target URL (e.g., `https://pokeapi.co`, `https://news.ycombinator.com`, or any web application).
   - Or click on one of the quick preset buttons.
2. **Configure Crawler (Optional):**
   - Click the sliders icon on the right of the input to open advanced settings.
   - Adjust Crawl Depth (1 to 5 levels), Max Pages (5 to 50), and SPA Hydration Wait (delay in ms to allow client-side JavaScript to make API calls).
3. **Click "Analyze":**
   - Watch the animated progress bar and live terminal log stream.
   - Discovered endpoints appear live in real-time as subpages are navigated.
4. **Inspect Endpoints:**
   - In **Tree / By Subpage** view, expand any subpage to view its intercepted endpoints.
   - Click **Preview** for an instant collapsible JSON payload view.
   - Click the **Inspect** icon to view request headers, response headers, status codes, and copy the full **cURL** command.
5. **Export Findings:**
   - Click **Export Discovered APIs** at any time to download results as **JSON**, **CSV**, or a **Postman Collection v2.1**.

---

## 📡 REST API & SSE Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and server status |
| `POST` | `/api/crawl/start` | Initiates crawl session with `{ startUrl, maxDepth, maxPages, ... }` |
| `POST` | `/api/crawl/stop/:sessionId` | Gracefully stops an active crawl |
| `GET` | `/api/crawl/session/:sessionId` | Retrieves session snapshot and discovered endpoints |
| `GET` | `/api/crawl/events/:sessionId` | Real-time Server-Sent Events (SSE) event stream |
| `GET` | `/api/crawl/export/:sessionId?format=json\|csv` | Downloads findings file directly |
