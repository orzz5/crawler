export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    let trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // Handle protocol-relative URLs
    if (trimmed.startsWith('//')) {
      trimmed = 'https:' + trimmed;
    } else if (!/^https?:\/\//i.test(trimmed)) {
      if (baseUrl) {
        trimmed = new URL(trimmed, baseUrl).href;
      } else {
        trimmed = 'https://' + trimmed;
      }
    }

    const parsed = new URL(trimmed, baseUrl);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip hash/fragment
    parsed.hash = '';

    // Remove common tracking query params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    // Normalize trailing slash on path (unless it's just root '/')
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSameOriginOrDomain(targetUrl: string, rootUrl: string): boolean {
  try {
    const targetParsed = new URL(targetUrl);
    const rootParsed = new URL(rootUrl);

    // Normalize hostnames (remove www. for comparison)
    const targetHost = targetParsed.hostname.toLowerCase().replace(/^www\./, '');
    const rootHost = rootParsed.hostname.toLowerCase().replace(/^www\./, '');

    return targetHost === rootHost;
  } catch {
    return false;
  }
}

export function isStaticAssetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    // Check for common non-HTML document file extensions
    const assetExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
      '.css', '.scss', '.less',
      '.js', '.mjs', '.cjs', '.jsx', '.tsx', '.ts',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.flac', '.aac',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', '.exe', '.dmg', '.apk',
      '.map', '.txt', '.xml' // Note: xml files in pages might be sitemaps, not HTML pages
    ];

    return assetExtensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
