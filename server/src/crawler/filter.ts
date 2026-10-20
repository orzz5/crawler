const BLACKLISTED_DOMAINS = [
  // Analytics & Tracking
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'doubleclick.net',
  'googleadservices.com',
  'facebook.net',
  'connect.facebook.net',
  'hotjar.com',
  'hotjar.io',
  'clarity.ms',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'segment.com',
  'heapanalytics.com',
  'pendo.io',
  'kissmetrics.com',
  'crazyegg.com',
  'mouseflow.com',
  
  // Telemetry & Error Logging
  'sentry.io',
  'browser-intake-datadoghq.com',
  'datadoghq.com',
  'nr-data.net',
  'newrelic.com',
  'fullstory.com',
  'logrocket.com',
  'r.lr-ingest.com',
  'bugsnag.com',
  'rollbar.com',
  'raygun.io',
  'trackjs.com',

  // Customer Support & Feedback widgets
  'intercom.io',
  'api-iam.intercom.io',
  'crisp.chat',
  'drift.com',
  'zendesk.com',
  'zopim.com',
  'freshchat.com',

  // CDN Telemetry & Beacons
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
];

// Telemetry, CDN beacons, and tracking keywords
const TELEMETRY_AND_BEACON_PATTERNS = [
  '/cdn-cgi/',
  'rum',
  'analytics',
  'telemetry',
  'beacon',
  'sentry',
  'hotjar',
];

// Framework routing, build hydration, manifest files, and sourcemaps
const FRAMEWORK_ROUTING_PATTERNS = [
  'routeinfo.json',
  '_next/data/',
  'manifest.json',
  'asset-manifest.json',
  '.map',
];

const STATIC_EXTENSIONS = [
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.css', '.scss', '.sass', '.less',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.flac',
  '.map', '.pdf', '.zip'
];

export function isBlacklistedOrStatic(
  url: string,
  resourceType: string,
  contentType: string,
  customPatterns: string[] = []
): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Ignore non-http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    // 1. Check Telemetry & CDN beacon patterns
    for (const pattern of TELEMETRY_AND_BEACON_PATTERNS) {
      if (lowerUrl.includes(pattern)) {
        return true;
      }
    }

    // 2. Check Framework Routing & Hydration patterns
    for (const pattern of FRAMEWORK_ROUTING_PATTERNS) {
      if (lowerUrl.includes(pattern) || pathname.endsWith(pattern)) {
        return true;
      }
    }

    // 3. Check blacklisted telemetry & tracking domains
    for (const domain of BLACKLISTED_DOMAINS) {
      if (hostname.includes(domain)) {
        return true;
      }
    }

    // 4. Check static asset extensions in pathname
    for (const ext of STATIC_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return true;
      }
    }

    // 5. Check resource type: reject obvious static assets
    const ignoredResourceTypes = ['image', 'stylesheet', 'font', 'media', 'manifest', 'other'];
    if (ignoredResourceTypes.includes(resourceType)) {
      return true;
    }

    // 6. Content-Type filtering
    const lowerContentType = contentType.toLowerCase();
    if (
      lowerContentType.startsWith('image/') ||
      lowerContentType.startsWith('font/') ||
      lowerContentType.startsWith('audio/') ||
      lowerContentType.startsWith('video/') ||
      lowerContentType.includes('text/css') ||
      lowerContentType.includes('text/javascript') ||
      lowerContentType.includes('application/javascript')
    ) {
      return true;
    }

    // If it's an HTML page returned for document navigation, it's a page, not an API
    if (resourceType === 'document' && lowerContentType.includes('text/html')) {
      return true;
    }

    // 7. Check user custom ignore patterns
    for (const pattern of customPatterns) {
      if (!pattern) continue;
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          return true;
        }
      } catch {
        if (url.toLowerCase().includes(pattern.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return true;
  }
}
