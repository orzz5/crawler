import type { CrawlSession, CapturedEndpoint } from '../types';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportAsJson(session: CrawlSession) {
  const host = new URL(session.config.startUrl).hostname.replace(/[^a-z0-9]/gi, '_');
  const filename = `api-discovery_${host}_${new Date().toISOString().slice(0, 10)}.json`;

  const payload = {
    info: {
      generatedBy: 'API Grabber & Discovery Engine',
      target: session.config.startUrl,
      timestamp: new Date().toISOString(),
      stats: session.stats
    },
    endpoints: session.endpoints,
    pagesScanned: session.pages
  };

  downloadFile(JSON.stringify(payload, null, 2), filename, 'application/json');
}

export function exportAsCsv(session: CrawlSession) {
  const host = new URL(session.config.startUrl).hostname.replace(/[^a-z0-9]/gi, '_');
  const filename = `api-discovery_${host}_${new Date().toISOString().slice(0, 10)}.csv`;

  const headers = [
    'ID',
    'Method',
    'Status',
    'URL',
    'Origin',
    'Subpage Discovered',
    'Is Public',
    'Auth Type',
    'Content Type',
    'Response Time (ms)',
    'Response Size (bytes)',
    'Timestamp'
  ];

  const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const rows = session.endpoints.map((ep) => [
    ep.id,
    ep.method,
    ep.status,
    ep.url,
    ep.origin,
    ep.pageUrl,
    ep.authClassification.isPublic ? 'YES' : 'NO',
    ep.authClassification.authType,
    ep.contentType,
    ep.responseTimeMs,
    ep.responseSize,
    ep.timestamp
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportAsPostman(session: CrawlSession) {
  const host = new URL(session.config.startUrl).hostname;
  const filename = `postman_collection_${host.replace(/[^a-z0-9]/gi, '_')}.json`;

  const items = session.endpoints.map((ep) => {
    let urlObj: URL;
    try {
      urlObj = new URL(ep.url);
    } catch {
      urlObj = new URL('http://localhost');
    }

    const queryParams = Array.from(urlObj.searchParams.entries()).map(([k, v]) => ({
      key: k,
      value: v
    }));

    const headers = Object.entries(ep.requestHeaders || {})
      .filter(([k]) => !['cookie', 'host', 'content-length'].includes(k.toLowerCase()))
      .map(([k, v]) => ({
        key: k,
        value: v
      }));

    return {
      name: `[${ep.method}] ${urlObj.pathname}`,
      request: {
        method: ep.method,
        header: headers,
        url: {
          raw: ep.url,
          protocol: urlObj.protocol.replace(':', ''),
          host: urlObj.hostname.split('.'),
          path: urlObj.pathname.split('/').filter(Boolean),
          query: queryParams
        },
        description: `Discovered on subpage: ${ep.pageUrl}\nAuth: ${
          ep.authClassification.isPublic ? 'Public' : ep.authClassification.authType
        }`
      },
      response: []
    };
  });

  const postmanCollection = {
    info: {
      _postman_id: session.id,
      name: `API Discovery - ${host}`,
      description: `Discovered APIs automatically crawled from ${session.config.startUrl}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: items
  };

  downloadFile(JSON.stringify(postmanCollection, null, 2), filename, 'application/json');
}

export function generateCurlCommand(endpoint: CapturedEndpoint): string {
  let cmd = `curl -X ${endpoint.method} "${endpoint.url}"`;

  // Headers
  if (endpoint.requestHeaders) {
    for (const [key, val] of Object.entries(endpoint.requestHeaders)) {
      if (['cookie', 'host', 'content-length', 'connection'].includes(key.toLowerCase())) continue;
      cmd += ` \\\n  -H "${key}: ${val.replace(/"/g, '\\"')}"`;
    }
  }

  // Body
  if (endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    const bodyStr =
      typeof endpoint.requestBody === 'string'
        ? endpoint.requestBody
        : JSON.stringify(endpoint.requestBody);
    cmd += ` \\\n  -d '${bodyStr.replace(/'/g, "\\'")}'`;
  }

  return cmd;
}
